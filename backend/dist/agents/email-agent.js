"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailAgent = void 0;
const googleapis_1 = require("googleapis");
class EmailAgent {
    gmail;
    stream;
    constructor(credentials, stream) {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.compose',
                'https://www.googleapis.com/auth/gmail.modify'
            ]
        });
        this.gmail = googleapis_1.google.gmail({ version: 'v1', auth });
        this.stream = stream;
    }
    async summarizeEmails(maxResults = 50, query = 'is:unread OR is:important') {
        try {
            this.stream.startStep('summarizing_emails');
            await this.stream.streamToolCall('summarize_emails', {
                maxResults,
                query
            });
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults
            });
            const messageIds = response.data.messages || [];
            const messages = [];
            for (const messageRef of messageIds.slice(0, 20)) {
                try {
                    const messageDetail = await this.gmail.users.messages.get({
                        userId: 'me',
                        id: messageRef.id,
                        format: 'full'
                    });
                    const message = this.parseGmailMessage(messageDetail.data);
                    messages.push(message);
                }
                catch (error) {
                    console.error(`Error fetching message ${messageRef.id}:`, error);
                }
            }
            const summary = this.analyzeEmailSummary(messages);
            await this.stream.streamMessage(`📧 **Email Summary Complete**

**Overview:**
• Total emails analyzed: ${summary.totalEmails}
• Unread messages: ${summary.unreadCount}
• Important messages: ${summary.importantCount}

**Top Categories:**
${summary.categories.slice(0, 3).map(cat => `• ${cat.name}: ${cat.count} emails`).join('\n')}

**Urgent Items:**
${summary.urgentEmails.length > 0
                ? summary.urgentEmails.slice(0, 3).map(email => `• ${email.subject} (from ${email.from})`).join('\n')
                : '• No urgent emails requiring immediate attention'}

${summary.urgentEmails.length > 0 ? '⚠️ **Action Required:** Please review urgent emails marked above.' : '✅ **All Clear:** No urgent emails requiring immediate action.'}`, 'assistant');
            this.stream.finishStep('summarizing_emails');
            return summary;
        }
        catch (error) {
            console.error('Error summarizing emails:', error);
            this.stream.errorRun(`Failed to summarize emails: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async draftResponse(emailId, responseType = 'reply', instructions) {
        try {
            this.stream.startStep('drafting_email_response');
            await this.stream.streamToolCall('draft_response', {
                emailId,
                responseType,
                instructions
            });
            let originalMessage = null;
            if (emailId && responseType !== 'new') {
                const messageDetail = await this.gmail.users.messages.get({
                    userId: 'me',
                    id: emailId,
                    format: 'full'
                });
                originalMessage = this.parseGmailMessage(messageDetail.data);
            }
            const draft = await this.generateEmailDraft(originalMessage, responseType, instructions);
            await this.stream.streamMessage(`✍️ **Email Draft Created**

**Type:** ${responseType.charAt(0).toUpperCase() + responseType.slice(1)}
**To:** ${draft.to.join(', ')}
**Subject:** ${draft.subject}

**Preview:**
${draft.body.substring(0, 200)}${draft.body.length > 200 ? '...' : ''}

Would you like me to send this email or would you prefer to make changes?`, 'assistant');
            this.stream.finishStep('drafting_email_response');
            return draft;
        }
        catch (error) {
            console.error('Error drafting email response:', error);
            this.stream.errorRun(`Failed to draft email response: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async sendEmail(draft) {
        try {
            this.stream.startStep('sending_email');
            await this.stream.streamToolCall('send_email', {
                to: draft.to,
                subject: draft.subject,
                body: draft.body
            });
            const rawMessage = this.createRawMessage(draft);
            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage
                }
            });
            await this.stream.streamMessage(`✅ **Email Sent Successfully**

**Message ID:** ${response.data.id}
**To:** ${draft.to.join(', ')}
**Subject:** ${draft.subject}

Your email has been delivered.`, 'assistant');
            this.stream.finishStep('sending_email');
            return response.data.id;
        }
        catch (error) {
            console.error('Error sending email:', error);
            this.stream.errorRun(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async prioritizeInbox() {
        try {
            this.stream.startStep('prioritizing_inbox');
            await this.stream.streamToolCall('prioritize_inbox', {});
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread',
                maxResults: 50
            });
            const messageIds = response.data.messages || [];
            const messages = [];
            for (const messageRef of messageIds.slice(0, 20)) {
                try {
                    const messageDetail = await this.gmail.users.messages.get({
                        userId: 'me',
                        id: messageRef.id,
                        format: 'full'
                    });
                    const message = this.parseGmailMessage(messageDetail.data);
                    messages.push(message);
                }
                catch (error) {
                    console.error(`Error fetching message ${messageRef.id}:`, error);
                }
            }
            const prioritized = this.prioritizeMessages(messages);
            await this.stream.streamMessage(`🎯 **Inbox Prioritization Complete**

**High Priority (${prioritized.highPriority.length} emails):**
${prioritized.highPriority.slice(0, 3).map(email => `• ${email.subject} (from ${email.from})`).join('\n')}

**Medium Priority (${prioritized.mediumPriority.length} emails):**
${prioritized.mediumPriority.slice(0, 2).map(email => `• ${email.subject} (from ${email.from})`).join('\n')}

**Low Priority:** ${prioritized.lowPriority.length} emails

💡 **Recommendation:** Focus on high-priority emails first. Would you like me to draft responses for any urgent items?`, 'assistant');
            this.stream.finishStep('prioritizing_inbox');
            return prioritized;
        }
        catch (error) {
            console.error('Error prioritizing inbox:', error);
            this.stream.errorRun(`Failed to prioritize inbox: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    parseGmailMessage(gmailMessage) {
        const headers = gmailMessage.payload?.headers || [];
        const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To').split(',').map((email) => email.trim()).filter(Boolean);
        const cc = getHeader('Cc').split(',').map((email) => email.trim()).filter(Boolean);
        let body = '';
        let snippet = gmailMessage.snippet || '';
        if (gmailMessage.payload?.body?.data) {
            body = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
        }
        else if (gmailMessage.payload?.parts) {
            const textPart = gmailMessage.payload.parts.find((part) => part.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
        }
        const attachments = [];
        if (gmailMessage.payload?.parts) {
            for (const part of gmailMessage.payload.parts) {
                if (part.filename && part.body?.attachmentId) {
                    attachments.push({
                        id: part.body.attachmentId,
                        filename: part.filename,
                        mimeType: part.mimeType || 'application/octet-stream',
                        size: part.body.size || 0
                    });
                }
            }
        }
        return {
            id: gmailMessage.id,
            threadId: gmailMessage.threadId,
            subject,
            from,
            to,
            cc: cc.length > 0 ? cc : undefined,
            body: body || snippet,
            snippet,
            timestamp: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
            isRead: !gmailMessage.labelIds?.includes('UNREAD'),
            isImportant: gmailMessage.labelIds?.includes('IMPORTANT') || false,
            labels: gmailMessage.labelIds || [],
            attachments
        };
    }
    analyzeEmailSummary(messages) {
        const totalEmails = messages.length;
        const unreadCount = messages.filter(m => !m.isRead).length;
        const importantCount = messages.filter(m => m.isImportant).length;
        const categories = new Map();
        const senderCounts = new Map();
        messages.forEach(message => {
            const subject = message.subject.toLowerCase();
            const from = message.from.toLowerCase();
            if (subject.includes('meeting') || subject.includes('calendar') || subject.includes('schedule')) {
                categories.set('Meetings', (categories.get('Meetings') || 0) + 1);
            }
            else if (subject.includes('urgent') || subject.includes('asap') || subject.includes('important')) {
                categories.set('Urgent', (categories.get('Urgent') || 0) + 1);
            }
            else if (from.includes('no-reply') || from.includes('noreply') || subject.includes('newsletter')) {
                categories.set('Automated', (categories.get('Automated') || 0) + 1);
            }
            else if (subject.includes('invoice') || subject.includes('payment') || subject.includes('bill')) {
                categories.set('Financial', (categories.get('Financial') || 0) + 1);
            }
            else {
                categories.set('General', (categories.get('General') || 0) + 1);
            }
            const senderEmail = message.from.match(/<(.+)>/)?.[1] || message.from;
            const senderName = message.from.replace(/<.+>/, '').trim();
            const existing = senderCounts.get(senderEmail);
            senderCounts.set(senderEmail, {
                name: existing?.name || senderName,
                count: (existing?.count || 0) + 1
            });
        });
        const urgentEmails = messages.filter(message => {
            const subject = message.subject.toLowerCase();
            const isUrgent = subject.includes('urgent') ||
                subject.includes('asap') ||
                subject.includes('immediate') ||
                message.isImportant;
            return isUrgent && !message.isRead;
        });
        return {
            totalEmails,
            unreadCount,
            importantCount,
            categories: Array.from(categories.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            topSenders: Array.from(senderCounts.entries())
                .map(([email, data]) => ({ email, name: data.name, count: data.count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
            urgentEmails: urgentEmails.slice(0, 5)
        };
    }
    prioritizeMessages(messages) {
        const scored = messages.map(message => {
            let score = 0;
            if (message.isImportant)
                score += 50;
            const subject = message.subject.toLowerCase();
            if (subject.includes('urgent') || subject.includes('asap'))
                score += 40;
            if (subject.includes('important') || subject.includes('critical'))
                score += 30;
            if (subject.includes('meeting') || subject.includes('deadline'))
                score += 20;
            const from = message.from.toLowerCase();
            if (from.includes('ceo') || from.includes('president') || from.includes('director'))
                score += 30;
            if (from.includes('manager') || from.includes('lead'))
                score += 20;
            if (from.includes('no-reply') || from.includes('noreply'))
                score -= 20;
            const hoursAge = (Date.now() - new Date(message.timestamp).getTime()) / (1000 * 60 * 60);
            if (hoursAge < 2)
                score += 15;
            else if (hoursAge < 24)
                score += 10;
            else if (hoursAge > 72)
                score -= 10;
            return { message, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const highPriority = scored.filter(item => item.score >= 40).map(item => item.message);
        const mediumPriority = scored.filter(item => item.score >= 20 && item.score < 40).map(item => item.message);
        const lowPriority = scored.filter(item => item.score < 20).map(item => item.message);
        return { highPriority, mediumPriority, lowPriority };
    }
    async generateEmailDraft(originalMessage, responseType, instructions) {
        const draft = {
            id: `draft_${Date.now()}`,
            to: [],
            subject: '',
            body: ''
        };
        if (responseType === 'reply' && originalMessage) {
            draft.to = [originalMessage.from];
            draft.subject = originalMessage.subject.startsWith('Re:')
                ? originalMessage.subject
                : `Re: ${originalMessage.subject}`;
            draft.replyToId = originalMessage.id;
            draft.body = `Thank you for your email regarding "${originalMessage.subject}".

${instructions || 'I will review this and get back to you soon.'}

Best regards,
[Your name]

---
On ${new Date(originalMessage.timestamp).toLocaleDateString()} at ${new Date(originalMessage.timestamp).toLocaleTimeString()}, ${originalMessage.from} wrote:
> ${originalMessage.snippet}`;
        }
        else if (responseType === 'forward' && originalMessage) {
            draft.subject = originalMessage.subject.startsWith('Fwd:')
                ? originalMessage.subject
                : `Fwd: ${originalMessage.subject}`;
            draft.forwardFromId = originalMessage.id;
            draft.body = `${instructions || 'Please see the forwarded message below.'}

---
From: ${originalMessage.from}
Date: ${new Date(originalMessage.timestamp).toLocaleString()}
Subject: ${originalMessage.subject}

${originalMessage.body}`;
        }
        else {
            draft.subject = instructions ? `Regarding: ${instructions}` : 'New message';
            draft.body = instructions || 'Hello,\n\n\n\nBest regards,\n[Your name]';
        }
        return draft;
    }
    createRawMessage(draft) {
        const messageParts = [];
        messageParts.push(`To: ${draft.to.join(', ')}`);
        if (draft.cc && draft.cc.length > 0) {
            messageParts.push(`Cc: ${draft.cc.join(', ')}`);
        }
        if (draft.bcc && draft.bcc.length > 0) {
            messageParts.push(`Bcc: ${draft.bcc.join(', ')}`);
        }
        messageParts.push(`Subject: ${draft.subject}`);
        messageParts.push('Content-Type: text/plain; charset=utf-8');
        messageParts.push('');
        messageParts.push(draft.body);
        const message = messageParts.join('\r\n');
        return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}
exports.EmailAgent = EmailAgent;
//# sourceMappingURL=email-agent.js.map