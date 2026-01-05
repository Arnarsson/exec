/**
 * Gmail Service
 * Google Gmail API wrapper for the Executive Assistant.
 */

import { google, gmail_v1 } from 'googleapis';
import { getGoogleAuthService } from './GoogleAuthService';

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labels: string[];
  isUnread: boolean;
  body?: string;
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages: GmailMessage[];
}

export class GmailService {
  private googleAuth = getGoogleAuthService();

  /**
   * Get a Gmail client for the user
   */
  private async getGmail(userId: string = 'default'): Promise<gmail_v1.Gmail> {
    const auth = await this.googleAuth.getAuthenticatedClient(userId);
    return google.gmail({ version: 'v1', auth });
  }

  /**
   * Extract header value from message headers
   */
  private getHeader(
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    name: string
  ): string {
    const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  /**
   * Format a Gmail message to our interface
   */
  private formatMessage(message: gmail_v1.Schema$Message): GmailMessage {
    const headers = message.payload?.headers;

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      snippet: message.snippet || '',
      subject: this.getHeader(headers, 'Subject'),
      from: this.getHeader(headers, 'From'),
      to: this.getHeader(headers, 'To'),
      date: this.getHeader(headers, 'Date'),
      labels: message.labelIds || [],
      isUnread: message.labelIds?.includes('UNREAD') || false,
    };
  }

  /**
   * Decode base64url encoded body
   */
  private decodeBody(data: string | undefined | null): string {
    if (!data) return '';
    try {
      return Buffer.from(data, 'base64url').toString('utf8');
    } catch {
      return '';
    }
  }

  /**
   * Extract text body from message parts
   */
  private extractTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';

    // Direct body
    if (payload.body?.data) {
      return this.decodeBody(payload.body.data);
    }

    // Check parts for text/plain or text/html
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBody(part.body.data);
        }
      }
      // Fallback to HTML if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBody(part.body.data);
        }
      }
      // Recurse into nested parts
      for (const part of payload.parts) {
        const nested = this.extractTextBody(part);
        if (nested) return nested;
      }
    }

    return '';
  }

  /**
   * Get inbox messages
   */
  async getInbox(userId: string = 'default', maxResults: number = 20): Promise<GmailMessage[]> {
    const gmail = await this.getGmail(userId);

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults,
    });

    const messages = response.data.messages || [];
    const detailed: GmailMessage[] = [];

    // Fetch details for each message (batch of 10)
    for (const msg of messages.slice(0, Math.min(maxResults, 20))) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date'],
      });

      detailed.push(this.formatMessage(detail.data));
    }

    return detailed;
  }

  /**
   * Get a single message with body
   */
  async getMessage(userId: string = 'default', messageId: string): Promise<GmailMessage | null> {
    const gmail = await this.getGmail(userId);

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = this.formatMessage(response.data);
      message.body = this.extractTextBody(response.data.payload);

      return message;
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string = 'default'): Promise<number> {
    const gmail = await this.getGmail(userId);

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX', 'UNREAD'],
      maxResults: 1,
    });

    // Use resultSizeEstimate for count
    return response.data.resultSizeEstimate || 0;
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string = 'default',
    query: string,
    maxResults: number = 20
  ): Promise<GmailMessage[]> {
    const gmail = await this.getGmail(userId);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];
    const detailed: GmailMessage[] = [];

    for (const msg of messages.slice(0, Math.min(maxResults, 20))) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date'],
      });

      detailed.push(this.formatMessage(detail.data));
    }

    return detailed;
  }

  /**
   * Get a thread with all messages
   */
  async getThread(userId: string = 'default', threadId: string): Promise<GmailThread | null> {
    const gmail = await this.getGmail(userId);

    try {
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const thread = response.data;

      return {
        id: thread.id || '',
        snippet: thread.snippet || '',
        historyId: thread.historyId || '',
        messages: (thread.messages || []).map((m) => {
          const msg = this.formatMessage(m);
          msg.body = this.extractTextBody(m.payload);
          return msg;
        }),
      };
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get labels
   */
  async getLabels(userId: string = 'default'): Promise<Array<{ id: string; name: string }>> {
    const gmail = await this.getGmail(userId);

    const response = await gmail.users.labels.list({
      userId: 'me',
    });

    return (response.data.labels || []).map((l) => ({
      id: l.id || '',
      name: l.name || '',
    }));
  }
}

// Singleton instance
let gmailService: GmailService | null = null;

export function getGmailService(): GmailService {
  if (!gmailService) {
    gmailService = new GmailService();
  }
  return gmailService;
}

export default GmailService;
