import { AGUIStream } from '@/events/stream';
import { ExecutiveState } from '../types/ag-ui';
export interface AgentRequest {
    id: string;
    type: 'chat' | 'calendar' | 'email' | 'research' | 'task';
    content: string;
    metadata?: {
        threadId?: string;
        userId?: string;
        context?: any;
    };
}
export interface AgentResponse {
    id: string;
    type: 'text' | 'action' | 'approval_required' | 'error';
    content: string;
    data?: any;
    followUpActions?: string[];
}
export declare class ExecutiveAssistantOrchestrator {
    private calendarAgent?;
    private emailAgent?;
    private stream;
    private executiveState;
    constructor(credentials?: any);
    processRequest(request: AgentRequest): Promise<AgentResponse>;
    private handleCalendarRequest;
    private handleEmailRequest;
    private handleChatRequest;
    private handleTaskRequest;
    private handleUnknownRequest;
    private classifyIntent;
    private extractMeetingParams;
    private extractTimeParams;
    private extractOptimalTimeParams;
    private extractEmailParams;
    private extractTaskParams;
    private generateContextualResponse;
    private generateStatusUpdate;
    private handleGenericCalendarRequest;
    private handleGenericEmailRequest;
    private updateExecutiveState;
    private getDefaultExecutiveState;
    getExecutiveState(): ExecutiveState;
    updateState(updates: Partial<ExecutiveState>): void;
    getStream(): AGUIStream;
}
//# sourceMappingURL=orchestrator.d.ts.map