"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGUIWebSocketServer = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const orchestrator_1 = require("@/agents/orchestrator");
const emitter_1 = require("@/events/emitter");
class AGUIWebSocketServer {
    wss;
    connections = new Map();
    orchestrator;
    heartbeatInterval;
    constructor(port = 8080, credentials) {
        this.wss = new ws_1.WebSocketServer({
            port,
            perMessageDeflate: false,
            maxPayload: 1024 * 1024
        });
        this.orchestrator = new orchestrator_1.ExecutiveAssistantOrchestrator(credentials);
        this.setupWebSocketServer();
        this.setupHeartbeat();
        console.log(`🚀 AG-UI WebSocket server started on port ${port}`);
    }
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = (0, uuid_1.v4)();
            const connection = {
                id: clientId,
                ws,
                authenticated: false,
                lastActivity: new Date()
            };
            this.connections.set(clientId, connection);
            emitter_1.aguiEventEmitter.addConnection(clientId, ws);
            console.log(`🔗 Client connected: ${clientId} (${req.socket.remoteAddress})`);
            this.sendMessage(connection, {
                id: (0, uuid_1.v4)(),
                type: 'event',
                data: {
                    type: 'Custom',
                    name: 'connection_established',
                    value: {
                        clientId,
                        timestamp: new Date().toISOString(),
                        version: '1.0.0',
                        capabilities: [
                            'streaming_chat',
                            'calendar_integration',
                            'email_management',
                            'task_management',
                            'real_time_events'
                        ]
                    }
                },
                timestamp: new Date().toISOString()
            });
            ws.on('message', async (data) => {
                try {
                    await this.handleMessage(connection, data);
                }
                catch (error) {
                    console.error(`Error handling message from ${clientId}:`, error);
                    this.sendError(connection, 'Invalid message format', error instanceof Error ? error.message : String(error));
                }
            });
            ws.on('close', (code, reason) => {
                console.log(`🔌 Client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString()})`);
                this.connections.delete(clientId);
                emitter_1.aguiEventEmitter.removeConnection(clientId);
            });
            ws.on('error', (error) => {
                console.error(`❌ WebSocket error for ${clientId}:`, error);
                this.connections.delete(clientId);
                emitter_1.aguiEventEmitter.removeConnection(clientId);
            });
            ws.on('pong', () => {
                connection.lastActivity = new Date();
            });
        });
        this.wss.on('error', (error) => {
            console.error('❌ WebSocket server error:', error);
        });
    }
    async handleMessage(connection, data) {
        const message = JSON.parse(data.toString());
        connection.lastActivity = new Date();
        console.log(`📨 Message from ${connection.id}:`, message.type, message.data?.action || message.data?.content?.substring(0, 50));
        switch (message.type) {
            case 'message':
                await this.handleChatMessage(connection, message);
                break;
            case 'action':
                await this.handleActionRequest(connection, message);
                break;
            case 'approval':
                await this.handleApprovalResponse(connection, message);
                break;
            case 'ping':
                this.sendMessage(connection, {
                    id: (0, uuid_1.v4)(),
                    type: 'response',
                    data: { type: 'pong', timestamp: new Date().toISOString() },
                    timestamp: new Date().toISOString()
                });
                break;
            default:
                this.sendError(connection, 'Unknown message type', `Unsupported message type: ${message.type}`);
        }
    }
    async handleChatMessage(connection, message) {
        if (!message.data.content) {
            this.sendError(connection, 'Missing content', 'Chat message must include content');
            return;
        }
        const agentRequest = {
            id: message.id,
            type: 'chat',
            content: message.data.content,
            metadata: {
                threadId: message.data.threadId,
                userId: connection.userId,
                clientId: connection.id
            }
        };
        try {
            const response = await this.orchestrator.processRequest(agentRequest);
            this.sendMessage(connection, {
                id: (0, uuid_1.v4)(),
                type: 'response',
                data: {
                    requestId: message.id,
                    status: 'completed',
                    response
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.sendError(connection, 'Processing failed', error instanceof Error ? error.message : String(error), message.id);
        }
    }
    async handleActionRequest(connection, message) {
        if (!message.data.action) {
            this.sendError(connection, 'Missing action', 'Action request must include action type');
            return;
        }
        let requestType = 'chat';
        let content = `${message.data.action}`;
        if (message.data.action.includes('calendar') || message.data.action.includes('meeting') || message.data.action.includes('schedule')) {
            requestType = 'calendar';
        }
        else if (message.data.action.includes('email') || message.data.action.includes('inbox')) {
            requestType = 'email';
        }
        else if (message.data.action.includes('task') || message.data.action.includes('project')) {
            requestType = 'task';
        }
        if (message.data.params) {
            content += ` ${JSON.stringify(message.data.params)}`;
        }
        const agentRequest = {
            id: message.id,
            type: requestType,
            content,
            metadata: {
                threadId: message.data.threadId,
                userId: connection.userId,
                clientId: connection.id,
                action: message.data.action,
                params: message.data.params
            }
        };
        try {
            const response = await this.orchestrator.processRequest(agentRequest);
            this.sendMessage(connection, {
                id: (0, uuid_1.v4)(),
                type: 'response',
                data: {
                    requestId: message.id,
                    status: 'completed',
                    response
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.sendError(connection, 'Action failed', error instanceof Error ? error.message : String(error), message.id);
        }
    }
    async handleApprovalResponse(connection, message) {
        const data = message.data;
        const { approved, actionId, comments } = data;
        if (approved) {
            console.log(`✅ Action ${actionId} approved by ${connection.id}`);
            this.sendMessage(connection, {
                id: (0, uuid_1.v4)(),
                type: 'response',
                data: {
                    requestId: message.id,
                    status: 'approved',
                    actionId,
                    message: 'Action has been approved and executed'
                },
                timestamp: new Date().toISOString()
            });
        }
        else {
            console.log(`❌ Action ${actionId} rejected by ${connection.id}`);
            this.sendMessage(connection, {
                id: (0, uuid_1.v4)(),
                type: 'response',
                data: {
                    requestId: message.id,
                    status: 'rejected',
                    actionId,
                    message: 'Action has been rejected',
                    comments
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    sendMessage(connection, message) {
        if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
            try {
                connection.ws.send(JSON.stringify(message));
            }
            catch (error) {
                console.error(`Error sending message to ${connection.id}:`, error);
                this.connections.delete(connection.id);
            }
        }
    }
    sendError(connection, error, details, requestId) {
        this.sendMessage(connection, {
            id: (0, uuid_1.v4)(),
            type: 'response',
            data: {
                requestId,
                status: 'error',
                error,
                details
            },
            timestamp: new Date().toISOString()
        });
    }
    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            const timeout = 30000;
            this.connections.forEach((connection, id) => {
                const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
                if (timeSinceLastActivity > timeout) {
                    if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
                        connection.ws.ping();
                    }
                    else {
                        console.log(`🧹 Removing dead connection: ${id}`);
                        this.connections.delete(id);
                        emitter_1.aguiEventEmitter.removeConnection(id);
                    }
                }
            });
        }, 15000);
    }
    broadcast(message) {
        this.connections.forEach(connection => {
            this.sendMessage(connection, message);
        });
    }
    sendToClient(clientId, message) {
        const connection = this.connections.get(clientId);
        if (connection) {
            this.sendMessage(connection, message);
            return true;
        }
        return false;
    }
    getStats() {
        const total = this.connections.size;
        const authenticated = Array.from(this.connections.values()).filter(c => c.authenticated).length;
        return {
            totalConnections: total,
            activeConnections: total,
            authenticatedConnections: authenticated
        };
    }
    close() {
        return new Promise((resolve) => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            this.wss.close(() => {
                console.log('🔌 AG-UI WebSocket server closed');
                resolve();
            });
        });
    }
}
exports.AGUIWebSocketServer = AGUIWebSocketServer;
//# sourceMappingURL=websocket.js.map