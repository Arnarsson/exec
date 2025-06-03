"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsServer = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const websocket_1 = require("./server/websocket");
const orchestrator_1 = require("./agents/orchestrator");
const AutomationService_1 = require("./services/AutomationService");
const automation_1 = __importStar(require("./routes/automation"));
const okr_js_1 = __importDefault(require("./routes/okr.js"));
const webhooks_js_1 = __importDefault(require("./routes/webhooks.js"));
const okr_service_js_1 = require("./services/okr-service.js");
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;
const logInfo = (operation, data) => {
    console.log(`[SERVER-INFO] ${operation}:`, {
        data,
        timestamp: new Date().toISOString()
    });
};
const logError = (operation, error, context) => {
    console.error(`[SERVER-ERROR] ${operation}:`, {
        error: error.message || error,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    });
};
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com', 'https://n8n.aigrowthadvisors.cc']
        : ['http://localhost:3000', 'http://localhost:5173', 'https://n8n.aigrowthadvisors.cc'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});
app.get('/health', async (req, res) => {
    try {
        const dashboardData = await okr_service_js_1.okrService.getDashboardData();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                webSocket: wsServer ? 'running' : 'stopped',
                connections: wsServer ? wsServer.getStats().totalConnections : 0,
                okrSystem: {
                    enabled: true,
                    okrCount: dashboardData.okrs.length,
                    totalProgress: dashboardData.totalProgress,
                    alertCount: dashboardData.recentAlerts.length
                }
            }
        });
    }
    catch (error) {
        logError('Health check', error);
        res.json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                webSocket: wsServer ? 'running' : 'stopped',
                connections: wsServer ? wsServer.getStats().totalConnections : 0,
                okrSystem: {
                    enabled: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            }
        });
    }
});
app.get('/api/status', (req, res) => {
    const orchestrator = new orchestrator_1.ExecutiveAssistantOrchestrator();
    const state = orchestrator.getExecutiveState();
    res.json({
        executiveState: state,
        serverStats: wsServer ? wsServer.getStats() : null,
        timestamp: new Date().toISOString()
    });
});
app.post('/api/test-events', async (req, res) => {
    try {
        const { eventType, content } = req.body;
        if (!wsServer) {
            res.status(503).json({ error: 'WebSocket server not running' });
            return;
        }
        const orchestrator = new orchestrator_1.ExecutiveAssistantOrchestrator();
        const stream = orchestrator.getStream();
        switch (eventType) {
            case 'message':
                await stream.streamMessage(content || 'Test message from API', 'assistant');
                break;
            case 'tool_call':
                await stream.streamToolCall('test_tool', { content: content || 'Test parameters' });
                break;
            case 'state_update':
                stream.sendStateSnapshot(orchestrator.getExecutiveState());
                break;
            default:
                res.status(400).json({ error: 'Invalid event type' });
                return;
        }
        res.json({
            success: true,
            eventType,
            message: 'Event sent successfully',
            connections: wsServer.getStats().totalConnections
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/api/copilot', async (req, res) => {
    try {
        const { messages, tools } = req.body;
        logInfo('CopilotKit request', { messageCount: messages?.length, tools: tools?.length });
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.json({
                choices: [{
                        message: {
                            role: 'assistant',
                            content: 'Hello! I\'m your Executive Assistant with OKR intelligence. Ask me about your progress, priorities, or say things like "DOZY progress" or "revenue status".'
                        }
                    }]
            });
            return;
        }
        const orchestrator = new orchestrator_1.ExecutiveAssistantOrchestrator();
        const latestMessage = messages[messages.length - 1];
        if (!latestMessage || !latestMessage.content) {
            res.json({
                choices: [{
                        message: {
                            role: 'assistant',
                            content: 'I didn\'t receive a message. Could you please try again?'
                        }
                    }]
            });
            return;
        }
        const messageContent = latestMessage.content.toLowerCase();
        const isOKRQuery = messageContent.includes('okr') ||
            messageContent.includes('progress') ||
            messageContent.includes('dozy') ||
            messageContent.includes('revenue') ||
            messageContent.includes('priority') ||
            messageContent.includes('status');
        let response;
        if (isOKRQuery) {
            try {
                const okrResponse = await fetch('http://localhost:3001/api/okr/chat-command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: latestMessage.content })
                });
                if (okrResponse.ok) {
                    const okrData = await okrResponse.json();
                    response = { content: okrData.response };
                }
                else {
                    throw new Error('OKR service unavailable');
                }
            }
            catch (error) {
                logError('OKR query processing', error);
                const agentRequest = {
                    id: `copilot_${Date.now()}`,
                    type: 'chat',
                    content: latestMessage.content,
                    metadata: {
                        threadId: req.body.threadId || `thread_${Date.now()}`,
                        userId: 'copilot_user',
                        tools: tools
                    }
                };
                response = await orchestrator.processRequest(agentRequest);
            }
        }
        else {
            const agentRequest = {
                id: `copilot_${Date.now()}`,
                type: 'chat',
                content: latestMessage.content,
                metadata: {
                    threadId: req.body.threadId || `thread_${Date.now()}`,
                    userId: 'copilot_user',
                    tools: tools
                }
            };
            response = await orchestrator.processRequest(agentRequest);
        }
        res.json({
            choices: [{
                    message: {
                        role: 'assistant',
                        content: response.content
                    }
                }]
        });
    }
    catch (error) {
        logError('CopilotKit API', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
app.use('/api/okr', okr_js_1.default);
app.use('/api/webhooks', webhooks_js_1.default);
app.use('/api/automation', automation_1.default);
app.post('/webhooks/calendar/events', async (req, res) => {
    try {
        const { events, action } = req.body;
        logInfo('Calendar webhook received', { action, eventsCount: events?.length });
        if (wsServer) {
            wsServer.broadcast({
                id: `calendar_${Date.now()}`,
                type: 'event',
                data: {
                    type: 'CalendarUpdate',
                    action,
                    events,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            });
        }
        res.json({
            success: true,
            message: `Calendar ${action} processed successfully`,
            eventsProcessed: events?.length || 0
        });
    }
    catch (error) {
        logError('Calendar webhook', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.post('/webhooks/email/received', async (req, res) => {
    try {
        const { emails, summary } = req.body;
        logInfo('Email webhook received', { emailCount: emails?.length, summary });
        if (wsServer) {
            wsServer.broadcast({
                id: `email_${Date.now()}`,
                type: 'event',
                data: {
                    type: 'EmailUpdate',
                    emails,
                    summary,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            });
        }
        res.json({
            success: true,
            message: 'Email update processed successfully',
            emailsProcessed: emails?.length || 0
        });
    }
    catch (error) {
        logError('Email webhook', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.get('/api/calendar/agenda', async (req, res) => {
    try {
        res.json({
            agenda: [],
            message: 'Calendar ready for n8n integration via POST /webhooks/calendar/events',
            webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/calendar/events`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.get('/api/email/summary', async (req, res) => {
    try {
        res.json({
            summary: {
                totalEmails: 0,
                unreadCount: 0,
                importantCount: 0
            },
            message: 'Email ready for n8n integration via POST /webhooks/email/received',
            webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/email/received`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.use((error, req, res, next) => {
    logError('API Error', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});
let wsServer = null;
exports.wsServer = wsServer;
let automationService = null;
function initializeWebSocketServer() {
    try {
        const credentials = {
            google: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : null
        };
        exports.wsServer = wsServer = new websocket_1.AGUIWebSocketServer(Number(WS_PORT), credentials);
        if (wsServer) {
            automationService = new AutomationService_1.AutomationService(wsServer);
            (0, automation_1.initializeAutomationRoutes)(automationService);
            logInfo('Automation service initialized');
        }
        logInfo('WebSocket server started', { port: WS_PORT });
    }
    catch (error) {
        logError('WebSocket server start failed', error);
    }
}
async function initializeOKRSystem() {
    try {
        logInfo('Initializing OKR system');
        const existingOKRs = await okr_service_js_1.okrService.getAllOKRs();
        if (existingOKRs.length === 0) {
            logInfo('No existing OKRs found, initializing demo data');
            await okr_service_js_1.okrService.generateInitialData();
            logInfo('OKR demo data initialized successfully');
        }
        else {
            logInfo('Existing OKRs found, skipping initialization', { count: existingOKRs.length });
        }
        const dashboardData = await okr_service_js_1.okrService.getDashboardData();
        logInfo('OKR system ready', {
            okrCount: dashboardData.okrs.length,
            totalProgress: dashboardData.totalProgress,
            alertCount: dashboardData.recentAlerts.length
        });
    }
    catch (error) {
        logError('OKR system initialization failed', error);
    }
}
function startServer() {
    const server = app.listen(PORT, async () => {
        logInfo('Executive Assistant API server started', {
            port: PORT,
            environment: process.env.NODE_ENV || 'development'
        });
        console.log(`🚀 Executive Assistant API server running on port ${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📊 OKR Dashboard API: http://localhost:${PORT}/api/okr/dashboard`);
        await initializeOKRSystem();
    });
    initializeWebSocketServer();
    process.on('SIGTERM', async () => {
        logInfo('SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('✅ HTTP server closed');
        });
        if (wsServer) {
            await wsServer.close();
            console.log('✅ WebSocket server closed');
        }
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        logInfo('SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('✅ HTTP server closed');
        });
        if (wsServer) {
            await wsServer.close();
            console.log('✅ WebSocket server closed');
        }
        process.exit(0);
    });
    process.on('uncaughtException', (error) => {
        logError('Uncaught Exception', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logError('Unhandled Rejection', { reason, promise });
        process.exit(1);
    });
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map