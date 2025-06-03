type WebSocketBroadcaster = {
    broadcast: (message: any) => void;
};
export interface AutomationData {
    workflow: string;
    data: any;
    timestamp: string;
}
export declare class AutomationService {
    private wsService;
    constructor(wsService: WebSocketBroadcaster);
    processAutomation(automation: AutomationData): Promise<void>;
    private handleEmailIntelligence;
    private handleCalendarPrep;
    private handleTaskAutomation;
    getAutomationStatus(): Promise<any>;
    private checkN8nConnection;
}
export {};
//# sourceMappingURL=AutomationService.d.ts.map