import { AGUIStream } from '@/events/stream';
export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: Array<{
        email: string;
        name?: string;
        responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    }>;
    location?: string;
    conferenceData?: any;
}
export interface AvailabilitySlot {
    start: string;
    end: string;
    available: boolean;
    conflictingEvents?: string[];
}
export declare class CalendarAgent {
    private calendar;
    private stream;
    constructor(credentials: any, stream: AGUIStream);
    checkAvailability(startTime: string, endTime: string, timeZone?: string, calendarId?: string): Promise<AvailabilitySlot[]>;
    scheduleMeeting(event: Partial<CalendarEvent>, calendarId?: string, requireApproval?: boolean): Promise<CalendarEvent>;
    getTodaysAgenda(calendarId?: string, timeZone?: string): Promise<CalendarEvent[]>;
    findOptimalMeetingTime(attendeeEmails: string[], durationMinutes: number, preferredStartHour?: number, preferredEndHour?: number, daysAhead?: number): Promise<AvailabilitySlot[]>;
    cancelMeeting(eventId: string, calendarId?: string, notifyAttendees?: boolean): Promise<void>;
}
//# sourceMappingURL=calendar-agent.d.ts.map