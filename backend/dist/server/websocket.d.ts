import { WebSocket } from 'ws';
import { WSMessage } from '../types/ag-ui';
export interface ClientConnection {
    id: string;
    ws: WebSocket;
    userId?: string;
    authenticated: boolean;
    lastActivity: Date;
}
export interface WSRequest {
    id: string;
    type: 'message' | 'action' | 'approval' | 'ping';
    data: {
        content?: string;
        action?: string;
        params?: any;
        threadId?: string;
    };
    timestamp: string;
}
export declare class AGUIWebSocketServer {
    private wss;
    private connections;
    private orchestrator;
    private heartbeatInterval;
    constructor(port?: number, credentials?: any);
    private setupWebSocketServer;
    private handleMessage;
    private handleChatMessage;
    private handleActionRequest;
    private handleApprovalResponse;
    private sendMessage;
    private sendError;
    private setupHeartbeat;
    broadcast(message: WSMessage): void;
    sendToClient(clientId: string, message: WSMessage): boolean;
    getStats(): {
        totalConnections: number;
        activeConnections: number;
        authenticatedConnections: number;
    };
    close(): Promise<void>;
}
//# sourceMappingURL=websocket.d.ts.map