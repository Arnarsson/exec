"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aguiEventEmitter = exports.AGUIEventEmitter = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
class AGUIEventEmitter extends events_1.EventEmitter {
    connections = new Map();
    messageHistory = [];
    maxHistorySize = 1000;
    constructor() {
        super();
        this.setMaxListeners(0);
    }
    addConnection(id, ws) {
        this.connections.set(id, ws);
        console.log(`AG-UI connection added: ${id}`);
        this.sendMessageHistory(id);
        ws.on('close', () => {
            this.removeConnection(id);
        });
        ws.on('error', (error) => {
            console.error(`WebSocket error for connection ${id}:`, error);
            this.removeConnection(id);
        });
    }
    removeConnection(id) {
        this.connections.delete(id);
        console.log(`AG-UI connection removed: ${id}`);
    }
    emitAGUIEvent(event) {
        const message = {
            id: (0, uuid_1.v4)(),
            type: 'event',
            data: event,
            timestamp: new Date().toISOString()
        };
        if (!event.timestamp) {
            event.timestamp = message.timestamp;
        }
        this.addToHistory(message);
        this.broadcast(message);
        this.emit('ag-ui-event', event);
    }
    sendResponse(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.warn(`Connection not found: ${connectionId}`);
            return;
        }
        const message = {
            id: (0, uuid_1.v4)(),
            type: 'response',
            data,
            timestamp: new Date().toISOString()
        };
        this.sendMessage(connection, message);
    }
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.connections.forEach((ws, id) => {
            try {
                if (ws.readyState === 1) {
                    ws.send(messageStr);
                }
                else {
                    this.removeConnection(id);
                }
            }
            catch (error) {
                console.error(`Error broadcasting to connection ${id}:`, error);
                this.removeConnection(id);
            }
        });
    }
    sendMessage(ws, message) {
        try {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(message));
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }
    addToHistory(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
        }
    }
    sendMessageHistory(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return;
        const recentMessages = this.messageHistory.slice(-50);
        recentMessages.forEach(message => {
            this.sendMessage(connection, message);
        });
    }
    getConnectionCount() {
        return this.connections.size;
    }
    getConnectionIds() {
        return Array.from(this.connections.keys());
    }
}
exports.AGUIEventEmitter = AGUIEventEmitter;
exports.aguiEventEmitter = new AGUIEventEmitter();
//# sourceMappingURL=emitter.js.map