import { AGUIStream } from '@/events/stream';
export interface EmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    body: string;
    snippet: string;
    timestamp: string;
    isRead: boolean;
    isImportant: boolean;
    labels: string[];
    attachments: Array<{
        id: string;
        filename: string;
        mimeType: string;
        size: number;
    }>;
}
export interface EmailSummary {
    totalEmails: number;
    unreadCount: number;
    importantCount: number;
    categories: Array<{
        name: string;
        count: number;
    }>;
    topSenders: Array<{
        email: string;
        name?: string;
        count: number;
    }>;
    urgentEmails: EmailMessage[];
}
export interface EmailDraft {
    id: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    replyToId?: string;
    forwardFromId?: string;
    scheduledSend?: string;
}
export declare class EmailAgent {
    private gmail;
    private stream;
    constructor(credentials: any, stream: AGUIStream);
    summarizeEmails(maxResults?: number, query?: string): Promise<EmailSummary>;
    draftResponse(emailId?: string, responseType?: 'reply' | 'forward' | 'new', instructions?: string): Promise<EmailDraft>;
    sendEmail(draft: EmailDraft): Promise<string>;
    prioritizeInbox(): Promise<{
        highPriority: EmailMessage[];
        mediumPriority: EmailMessage[];
        lowPriority: EmailMessage[];
    }>;
    private parseGmailMessage;
    private analyzeEmailSummary;
    private prioritizeMessages;
    private generateEmailDraft;
    private createRawMessage;
}
//# sourceMappingURL=email-agent.d.ts.map