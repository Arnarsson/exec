"use strict";
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
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;
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
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            webSocket: wsServer ? 'running' : 'stopped',
            connections: wsServer ? wsServer.getStats().totalConnections : 0
        }
    });
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
        console.log('CopilotKit request:', { messages, tools });
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.json({
                choices: [{
                        message: {
                            role: 'assistant',
                            content: 'Hello! I\'m your Executive Assistant. How can I help you today?'
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
        const response = await orchestrator.processRequest(agentRequest);
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
        console.error('CopilotKit API Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
app.get('/api/calendar/agenda', async (req, res) => {
    try {
        res.json({
            agenda: [],
            message: 'Calendar integration coming soon',
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
            message: 'Email integration coming soon',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
app.use((error, req, res, next) => {
    console.error('API Error:', error);
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
function initializeWebSocketServer() {
    try {
        const credentials = {
            google: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : null
        };
        exports.wsServer = wsServer = new websocket_1.AGUIWebSocketServer(Number(WS_PORT), credentials);
        console.log(`🌐 WebSocket server started on port ${WS_PORT}`);
    }
    catch (error) {
        console.error('❌ Failed to start WebSocket server:', error);
    }
}
function startServer() {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Executive Assistant API server running on port ${PORT}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
    initializeWebSocketServer();
    process.on('SIGTERM', async () => {
        console.log('🔄 SIGTERM received, shutting down gracefully...');
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
        console.log('🔄 SIGINT received, shutting down gracefully...');
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
        console.error('❌ Uncaught Exception:', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map