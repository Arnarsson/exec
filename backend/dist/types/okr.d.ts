export interface OKR {
    id: string;
    title: string;
    description: string;
    progress: number;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    autoTracked: boolean;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
    integrations: {
        github?: {
            repo: string;
            progressWeight: number;
            lastCommitAt?: Date;
            commitCount?: number;
        };
        email?: {
            keywords: string[];
            progressWeight: number;
            lastEmailAt?: Date;
            emailCount?: number;
        };
        calendar?: {
            eventTypes: string[];
            progressWeight: number;
            hoursScheduled?: number;
            hoursCompleted?: number;
        };
    };
    ricePriority: {
        reach: number;
        impact: number;
        confidence: number;
        effort: number;
        score: number;
        lastCalculated: Date;
        factors?: string[];
    };
    tags: string[];
    ownerId: string;
}
export interface OKRProgress {
    okrId: string;
    source: 'MANUAL' | 'GITHUB' | 'EMAIL' | 'CALENDAR' | 'AI';
    previousValue: number;
    newValue: number;
    delta: number;
    timestamp: Date;
    details?: {
        commitSha?: string;
        emailSubject?: string;
        eventTitle?: string;
        reasoning?: string;
    };
}
export interface OKRAlert {
    id: string;
    okrId: string;
    type: 'BOTTLENECK' | 'DEADLINE_RISK' | 'PRIORITY_SHIFT' | 'ACHIEVEMENT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    actionRequired: boolean;
    suggestions: string[];
    createdAt: Date;
    acknowledged: boolean;
}
export interface OKRInsight {
    id: string;
    okrId: string;
    type: 'PREDICTION' | 'OPTIMIZATION' | 'TREND' | 'RECOMMENDATION';
    title: string;
    description: string;
    confidence: number;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    data: Record<string, any>;
    createdAt: Date;
}
export interface OKRChatCommand {
    command: string;
    intent: 'UPDATE_PROGRESS' | 'GET_STATUS' | 'SET_PRIORITY' | 'SCHEDULE_WORK' | 'GET_INSIGHTS';
    okrId?: string;
    parameters?: Record<string, any>;
    response?: string;
}
export interface GitHubWebhookPayload {
    action: string;
    repository: {
        name: string;
        full_name: string;
    };
    commits?: Array<{
        id: string;
        message: string;
        timestamp: string;
        author: {
            name: string;
            email: string;
        };
        added: string[];
        removed: string[];
        modified: string[];
    }>;
    pusher: {
        name: string;
        email: string;
    };
}
export interface OKRDashboardData {
    okrs: OKR[];
    totalProgress: number;
    priorityDistribution: Record<string, number>;
    recentAlerts: OKRAlert[];
    upcomingDeadlines: Array<{
        okr: OKR;
        daysUntilDue: number;
    }>;
    insights: OKRInsight[];
    activityTimeline: OKRProgress[];
}
//# sourceMappingURL=okr.d.ts.map