/**
 * Email Agent
 * Handles email operations with AG-UI event streaming
 */

import { google } from 'googleapis';
import { AGUIStream } from '@/events/stream';
import { ExecutiveState } from '../types/ag-ui';

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

export class EmailAgent {
  private gmail: any;
  private stream: AGUIStream;

  constructor(credentials: any, stream: AGUIStream) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    });

    this.gmail = google.gmail({ version: 'v1', auth });
    this.stream = stream;
  }

  /**
   * Summarize recent emails
   */
  async summarizeEmails(
    maxResults: number = 50,
    query: string = 'is:unread OR is:important'
  ): Promise<EmailSummary> {
    try {
      this.stream.startStep('summarizing_emails');

      await this.stream.streamToolCall('summarize_emails', {
        maxResults,
        query
      });

      // Get messages list
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const messageIds = response.data.messages || [];
      const messages: EmailMessage[] = [];

      // Fetch message details in batches
      for (const messageRef of messageIds.slice(0, 20)) { // Limit for performance
        try {
          const messageDetail = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageRef.id,
            format: 'full'
          });

          const message = this.parseGmailMessage(messageDetail.data);
          messages.push(message);
        } catch (error) {
          console.error(`Error fetching message ${messageRef.id}:`, error);
        }
      }

      // Analyze messages
      const summary = this.analyzeEmailSummary(messages);

      await this.stream.streamMessage(
        `📧 **Email Summary Complete**

**Overview:**
• Total emails analyzed: ${summary.totalEmails}
• Unread messages: ${summary.unreadCount}
• Important messages: ${summary.importantCount}

**Top Categories:**
${summary.categories.slice(0, 3).map(cat => `• ${cat.name}: ${cat.count} emails`).join('\n')}

**Urgent Items:**
${summary.urgentEmails.length > 0 
  ? summary.urgentEmails.slice(0, 3).map(email => `• ${email.subject} (from ${email.from})`).join('\n')
  : '• No urgent emails requiring immediate attention'
}

${summary.urgentEmails.length > 0 ? '⚠️ **Action Required:** Please review urgent emails marked above.' : '✅ **All Clear:** No urgent emails requiring immediate action.'}`,
        'assistant'
      );

      this.stream.finishStep('summarizing_emails');

      return summary;
    } catch (error) {
      console.error('Error summarizing emails:', error);
      this.stream.errorRun(`Failed to summarize emails: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Draft an email response
   */
  async draftResponse(
    emailId?: string,
    responseType: 'reply' | 'forward' | 'new' = 'reply',
    instructions?: string
  ): Promise<EmailDraft> {
    try {
      this.stream.startStep('drafting_email_response');

      await this.stream.streamToolCall('draft_response', {
        emailId,
        responseType,
        instructions
      });

      let originalMessage: EmailMessage | null = null;

      if (emailId && responseType !== 'new') {
        const messageDetail = await this.gmail.users.messages.get({
          userId: 'me',
          id: emailId,
          format: 'full'
        });
        originalMessage = this.parseGmailMessage(messageDetail.data);
      }

      // Generate draft using AI (simplified for MVP)
      const draft = await this.generateEmailDraft(originalMessage, responseType, instructions);

      await this.stream.streamMessage(
        `✍️ **Email Draft Created**

**Type:** ${responseType.charAt(0).toUpperCase() + responseType.slice(1)}
**To:** ${draft.to.join(', ')}
**Subject:** ${draft.subject}

**Preview:**
${draft.body.substring(0, 200)}${draft.body.length > 200 ? '...' : ''}

Would you like me to send this email or would you prefer to make changes?`,
        'assistant'
      );

      this.stream.finishStep('drafting_email_response');

      return draft;
    } catch (error) {
      console.error('Error drafting email response:', error);
      this.stream.errorRun(`Failed to draft email response: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(draft: EmailDraft): Promise<string> {
    try {
      this.stream.startStep('sending_email');

      await this.stream.streamToolCall('send_email', {
        to: draft.to,
        subject: draft.subject,
        body: draft.body
      });

      // Create raw email message
      const rawMessage = this.createRawMessage(draft);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage
        }
      });

      await this.stream.streamMessage(
        `✅ **Email Sent Successfully**

**Message ID:** ${response.data.id}
**To:** ${draft.to.join(', ')}
**Subject:** ${draft.subject}

Your email has been delivered.`,
        'assistant'
      );

      this.stream.finishStep('sending_email');

      return response.data.id!;
    } catch (error) {
      console.error('Error sending email:', error);
      this.stream.errorRun(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prioritize inbox based on importance
   */
  async prioritizeInbox(): Promise<{
    highPriority: EmailMessage[];
    mediumPriority: EmailMessage[];
    lowPriority: EmailMessage[];
  }> {
    try {
      this.stream.startStep('prioritizing_inbox');

      await this.stream.streamToolCall('prioritize_inbox', {});

      // Get unread messages
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 50
      });

      const messageIds = response.data.messages || [];
      const messages: EmailMessage[] = [];

      // Fetch message details
      for (const messageRef of messageIds.slice(0, 20)) {
        try {
          const messageDetail = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageRef.id,
            format: 'full'
          });

          const message = this.parseGmailMessage(messageDetail.data);
          messages.push(message);
        } catch (error) {
          console.error(`Error fetching message ${messageRef.id}:`, error);
        }
      }

      // Prioritize messages
      const prioritized = this.prioritizeMessages(messages);

      await this.stream.streamMessage(
        `🎯 **Inbox Prioritization Complete**

**High Priority (${prioritized.highPriority.length} emails):**
${prioritized.highPriority.slice(0, 3).map(email => 
  `• ${email.subject} (from ${email.from})`
).join('\n')}

**Medium Priority (${prioritized.mediumPriority.length} emails):**
${prioritized.mediumPriority.slice(0, 2).map(email => 
  `• ${email.subject} (from ${email.from})`
).join('\n')}

**Low Priority:** ${prioritized.lowPriority.length} emails

💡 **Recommendation:** Focus on high-priority emails first. Would you like me to draft responses for any urgent items?`,
        'assistant'
      );

      this.stream.finishStep('prioritizing_inbox');

      return prioritized;
    } catch (error) {
      console.error('Error prioritizing inbox:', error);
      this.stream.errorRun(`Failed to prioritize inbox: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Parse Gmail API message into our EmailMessage format
   */
  private parseGmailMessage(gmailMessage: any): EmailMessage {
    const headers = gmailMessage.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To').split(',').map((email: string) => email.trim()).filter(Boolean);
    const cc = getHeader('Cc').split(',').map((email: string) => email.trim()).filter(Boolean);
    
    let body = '';
    let snippet = gmailMessage.snippet || '';

    // Extract body from payload
    if (gmailMessage.payload?.body?.data) {
      body = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
    } else if (gmailMessage.payload?.parts) {
      // Handle multipart messages
      const textPart = gmailMessage.payload.parts.find((part: any) => part.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Parse attachments
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

  /**
   * Analyze emails and create summary
   */
  private analyzeEmailSummary(messages: EmailMessage[]): EmailSummary {
    const totalEmails = messages.length;
    const unreadCount = messages.filter(m => !m.isRead).length;
    const importantCount = messages.filter(m => m.isImportant).length;

    // Categorize emails
    const categories = new Map<string, number>();
    const senderCounts = new Map<string, { name?: string; count: number }>();

    messages.forEach(message => {
      // Simple categorization based on keywords
      const subject = message.subject.toLowerCase();
      const from = message.from.toLowerCase();

      if (subject.includes('meeting') || subject.includes('calendar') || subject.includes('schedule')) {
        categories.set('Meetings', (categories.get('Meetings') || 0) + 1);
      } else if (subject.includes('urgent') || subject.includes('asap') || subject.includes('important')) {
        categories.set('Urgent', (categories.get('Urgent') || 0) + 1);
      } else if (from.includes('no-reply') || from.includes('noreply') || subject.includes('newsletter')) {
        categories.set('Automated', (categories.get('Automated') || 0) + 1);
      } else if (subject.includes('invoice') || subject.includes('payment') || subject.includes('bill')) {
        categories.set('Financial', (categories.get('Financial') || 0) + 1);
      } else {
        categories.set('General', (categories.get('General') || 0) + 1);
      }

      // Count senders
      const senderEmail = message.from.match(/<(.+)>/)?.[1] || message.from;
      const senderName = message.from.replace(/<.+>/, '').trim();
      const existing = senderCounts.get(senderEmail);
      senderCounts.set(senderEmail, {
        name: existing?.name || senderName,
        count: (existing?.count || 0) + 1
      });
    });

    // Identify urgent emails
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

  /**
   * Prioritize messages based on various factors
   */
  private prioritizeMessages(messages: EmailMessage[]): {
    highPriority: EmailMessage[];
    mediumPriority: EmailMessage[];
    lowPriority: EmailMessage[];
  } {
    const scored = messages.map(message => {
      let score = 0;

      // Important label
      if (message.isImportant) score += 50;

      // Urgent keywords in subject
      const subject = message.subject.toLowerCase();
      if (subject.includes('urgent') || subject.includes('asap')) score += 40;
      if (subject.includes('important') || subject.includes('critical')) score += 30;
      if (subject.includes('meeting') || subject.includes('deadline')) score += 20;

      // Sender analysis
      const from = message.from.toLowerCase();
      if (from.includes('ceo') || from.includes('president') || from.includes('director')) score += 30;
      if (from.includes('manager') || from.includes('lead')) score += 20;
      if (from.includes('no-reply') || from.includes('noreply')) score -= 20;

      // Recency (newer emails get higher priority)
      const hoursAge = (Date.now() - new Date(message.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursAge < 2) score += 15;
      else if (hoursAge < 24) score += 10;
      else if (hoursAge > 72) score -= 10;

      return { message, score };
    });

    // Sort by score and categorize
    scored.sort((a, b) => b.score - a.score);

    const highPriority = scored.filter(item => item.score >= 40).map(item => item.message);
    const mediumPriority = scored.filter(item => item.score >= 20 && item.score < 40).map(item => item.message);
    const lowPriority = scored.filter(item => item.score < 20).map(item => item.message);

    return { highPriority, mediumPriority, lowPriority };
  }

  /**
   * Generate email draft using AI (simplified for MVP)
   */
  private async generateEmailDraft(
    originalMessage: EmailMessage | null,
    responseType: 'reply' | 'forward' | 'new',
    instructions?: string
  ): Promise<EmailDraft> {
    const draft: EmailDraft = {
      id: `draft_${Date.now()}`,
      to: [],
      subject: '',
      body: ''
    };

    if (responseType === 'reply' && originalMessage) {
      // Reply logic
      draft.to = [originalMessage.from];
      draft.subject = originalMessage.subject.startsWith('Re:') 
        ? originalMessage.subject 
        : `Re: ${originalMessage.subject}`;
      draft.replyToId = originalMessage.id;

      // Generate reply body
      draft.body = `Thank you for your email regarding "${originalMessage.subject}".

${instructions || 'I will review this and get back to you soon.'}

Best regards,
[Your name]

---
On ${new Date(originalMessage.timestamp).toLocaleDateString()} at ${new Date(originalMessage.timestamp).toLocaleTimeString()}, ${originalMessage.from} wrote:
> ${originalMessage.snippet}`;

    } else if (responseType === 'forward' && originalMessage) {
      // Forward logic
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

    } else {
      // New email
      draft.subject = instructions ? `Regarding: ${instructions}` : 'New message';
      draft.body = instructions || 'Hello,\n\n\n\nBest regards,\n[Your name]';
    }

    return draft;
  }

  /**
   * Create raw email message for Gmail API
   */
  private createRawMessage(draft: EmailDraft): string {
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
