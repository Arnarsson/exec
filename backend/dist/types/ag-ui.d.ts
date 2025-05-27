export interface BaseEvent {
    type: string;
    timestamp?: string;
    rawEvent?: any;
}
export interface RunStartedEvent extends BaseEvent {
    type: 'RunStarted';
    threadId: string;
    runId: string;
}
export interface RunFinishedEvent extends BaseEvent {
    type: 'RunFinished';
    threadId: string;
    runId: string;
}
export interface RunErrorEvent extends BaseEvent {
    type: 'RunError';
    message: string;
    code?: string;
}
export interface StepStartedEvent extends BaseEvent {
    type: 'StepStarted';
    stepName: string;
}
export interface StepFinishedEvent extends BaseEvent {
    type: 'StepFinished';
    stepName: string;
}
export interface TextMessageStartEvent extends BaseEvent {
    type: 'TextMessageStart';
    messageId: string;
    role: 'assistant' | 'user' | 'system';
}
export interface TextMessageContentEvent extends BaseEvent {
    type: 'TextMessageContent';
    messageId: string;
    delta: string;
}
export interface TextMessageEndEvent extends BaseEvent {
    type: 'TextMessageEnd';
    messageId: string;
}
export interface ToolCallStartEvent extends BaseEvent {
    type: 'ToolCallStart';
    toolCallId: string;
    toolCallName: string;
    parentMessageId?: string;
}
export interface ToolCallArgsEvent extends BaseEvent {
    type: 'ToolCallArgs';
    toolCallId: string;
    delta: string;
}
export interface ToolCallEndEvent extends BaseEvent {
    type: 'ToolCallEnd';
    toolCallId: string;
}
export interface StateSnapshotEvent extends BaseEvent {
    type: 'StateSnapshot';
    snapshot: any;
}
export interface StateDeltaEvent extends BaseEvent {
    type: 'StateDelta';
    delta: Array<{
        op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
        path: string;
        value?: any;
        from?: string;
    }>;
}
export interface MessagesSnapshotEvent extends BaseEvent {
    type: 'MessagesSnapshot';
    messages: Array<{
        id: string;
        role: 'assistant' | 'user' | 'system';
        content: string;
        timestamp: string;
    }>;
}
export interface RawEvent extends BaseEvent {
    type: 'Raw';
    event: any;
    source?: string;
}
export interface CustomEvent extends BaseEvent {
    type: 'Custom';
    name: string;
    value: any;
}
export type AGUIEvent = RunStartedEvent | RunFinishedEvent | RunErrorEvent | StepStartedEvent | StepFinishedEvent | TextMessageStartEvent | TextMessageContentEvent | TextMessageEndEvent | ToolCallStartEvent | ToolCallArgsEvent | ToolCallEndEvent | StateSnapshotEvent | StateDeltaEvent | MessagesSnapshotEvent | RawEvent | CustomEvent;
export interface ExecutiveState {
    profile: {
        name: string;
        email: string;
        timezone: string;
        preferences: {
            workingHours: {
                start: string;
                end: string;
            };
            communicationStyle: 'formal' | 'casual' | 'direct';
            priorityLevel: 'high' | 'medium' | 'low';
            autoApprovalLimits: {
                calendar: boolean;
                email: boolean;
                documents: boolean;
            };
        };
    };
    activeContexts: {
        currentProjects: Array<{
            id: string;
            name: string;
            status: 'active' | 'pending' | 'completed';
            priority: 'high' | 'medium' | 'low';
        }>;
        urgentItems: Array<{
            id: string;
            type: 'meeting' | 'email' | 'task' | 'decision';
            description: string;
            deadline?: string;
        }>;
        pendingDecisions: Array<{
            id: string;
            description: string;
            options: string[];
            deadline?: string;
            impact: 'high' | 'medium' | 'low';
        }>;
    };
    integrations: {
        calendarAccounts: Array<{
            id: string;
            type: 'google' | 'outlook' | 'apple';
            email: string;
            connected: boolean;
        }>;
        emailAccounts: Array<{
            id: string;
            type: 'gmail' | 'outlook' | 'apple';
            email: string;
            connected: boolean;
        }>;
        connectedTools: Array<{
            id: string;
            name: string;
            type: string;
            connected: boolean;
        }>;
    };
}
export interface CalendarTool {
    name: 'check_availability' | 'schedule_meeting' | 'cancel_meeting' | 'get_agenda';
    description: string;
    parameters: any;
}
export interface EmailTool {
    name: 'summarize_emails' | 'draft_response' | 'send_email' | 'prioritize_inbox';
    description: string;
    parameters: any;
}
export interface ResearchTool {
    name: 'web_search' | 'analyze_document' | 'market_research' | 'company_lookup';
    description: string;
    parameters: any;
}
export type ExecutiveTool = CalendarTool | EmailTool | ResearchTool;
export interface ExecutiveMessage {
    id: string;
    threadId: string;
    role: 'assistant' | 'user' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        toolCalls?: string[];
        attachments?: string[];
        priority?: 'high' | 'medium' | 'low';
        category?: 'calendar' | 'email' | 'research' | 'general';
    };
}
export interface WSMessage {
    id: string;
    type: 'event' | 'request' | 'response';
    data: AGUIEvent | any;
    timestamp: string;
}
//# sourceMappingURL=ag-ui.d.ts.map