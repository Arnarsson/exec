/**
 * Calendar Service
 * Google Calendar API wrapper for the Executive Assistant.
 */

import { google, calendar_v3 } from 'googleapis';
import { getGoogleAuthService } from './GoogleAuthService';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  location?: string;
  attendees?: string[];
}

export class CalendarService {
  private googleAuth = getGoogleAuthService();

  /**
   * Get a Calendar client for the user
   */
  private async getCalendar(userId: string = 'default'): Promise<calendar_v3.Calendar> {
    const auth = await this.googleAuth.getAuthenticatedClient(userId);
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Format a Google Calendar event to our interface
   */
  private formatEvent(event: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: event.id || '',
      summary: event.summary || '(No title)',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      htmlLink: event.htmlLink || undefined,
      status: event.status || undefined,
      created: event.created || undefined,
      updated: event.updated || undefined,
    };
  }

  /**
   * Get upcoming calendar events
   */
  async getUpcomingEvents(
    userId: string = 'default',
    maxResults: number = 10
  ): Promise<CalendarEvent[]> {
    const calendar = await this.getCalendar(userId);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return events.map((e) => this.formatEvent(e));
  }

  /**
   * Get a single event by ID
   */
  async getEvent(userId: string = 'default', eventId: string): Promise<CalendarEvent | null> {
    const calendar = await this.getCalendar(userId);

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      return this.formatEvent(response.data);
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get today's agenda
   */
  async getTodayAgenda(userId: string = 'default'): Promise<CalendarEvent[]> {
    const calendar = await this.getCalendar(userId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return events.map((e) => this.formatEvent(e));
  }

  /**
   * Get events for a specific date range
   */
  async getEventsInRange(
    userId: string = 'default',
    startDate: Date,
    endDate: Date,
    maxResults: number = 50
  ): Promise<CalendarEvent[]> {
    const calendar = await this.getCalendar(userId);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return events.map((e) => this.formatEvent(e));
  }

  /**
   * Create a new calendar event
   */
  async createEvent(userId: string = 'default', input: CreateEventInput): Promise<CalendarEvent> {
    const calendar = await this.getCalendar(userId);

    const event: calendar_v3.Schema$Event = {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: {
        dateTime: input.startDateTime,
        timeZone: input.timeZone || 'UTC',
      },
      end: {
        dateTime: input.endDateTime,
        timeZone: input.timeZone || 'UTC',
      },
      attendees: input.attendees?.map((email) => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return this.formatEvent(response.data);
  }

  /**
   * Get free/busy information
   */
  async getFreeBusy(
    userId: string = 'default',
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: string; end: string }>> {
    const calendar = await this.getCalendar(userId);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars?.primary?.busy || [];
    return busy.map((b) => ({
      start: b.start || '',
      end: b.end || '',
    }));
  }
}

// Singleton instance
let calendarService: CalendarService | null = null;

export function getCalendarService(): CalendarService {
  if (!calendarService) {
    calendarService = new CalendarService();
  }
  return calendarService;
}

export default CalendarService;
