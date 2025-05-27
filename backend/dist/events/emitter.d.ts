import { EventEmitter } from 'events';
import { AGUIEvent } from '../types/ag-ui';
export declare class AGUIEventEmitter extends EventEmitter {
    private connections;
    private messageHistory;
    private readonly maxHistorySize;
    constructor();
    addConnection(id: string, ws: any): void;
    removeConnection(id: string): void;
    emitAGUIEvent(event: AGUIEvent): void;
    sendResponse(connectionId: string, data: any): void;
    private broadcast;
    private sendMessage;
    private addToHistory;
    private sendMessageHistory;
    getConnectionCount(): number;
    getConnectionIds(): string[];
}
export declare const aguiEventEmitter: AGUIEventEmitter;
//# sourceMappingURL=emitter.d.ts.map