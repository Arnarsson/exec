import { ExecutiveState } from '../types/ag-ui';
export declare class AGUIStream {
    private threadId;
    private runId;
    constructor(threadId?: string);
    startRun(): void;
    finishRun(): void;
    errorRun(message: string, code?: string): void;
    startStep(stepName: string): void;
    finishStep(stepName: string): void;
    streamMessage(content: string, role?: 'assistant' | 'user' | 'system', chunkSize?: number): Promise<string>;
    streamToolCall(toolName: string, args: any, parentMessageId?: string, chunkSize?: number): Promise<string>;
    sendStateSnapshot(state: ExecutiveState): void;
    sendStateDelta(operations: Array<{
        op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
        path: string;
        value?: any;
        from?: string;
    }>): void;
    sendMessagesSnapshot(messages: Array<{
        id: string;
        role: 'assistant' | 'user' | 'system';
        content: string;
        timestamp: string;
    }>): void;
    getIds(): {
        threadId: string;
        runId: string;
    };
    newRun(): void;
}
export declare function createAGUIStream(threadId?: string): AGUIStream;
//# sourceMappingURL=stream.d.ts.map