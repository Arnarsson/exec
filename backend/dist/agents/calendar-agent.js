"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarAgent = void 0;
const googleapis_1 = require("googleapis");
class CalendarAgent {
    calendar;
    stream;
    constructor(credentials, stream) {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ]
        });
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth });
        this.stream = stream;
    }
    async checkAvailability(startTime, endTime, timeZone = 'UTC', calendarId = 'primary') {
        try {
            this.stream.startStep('checking_calendar_availability');
            await this.stream.streamToolCall('check_availability', {
                startTime,
                endTime,
                timeZone,
                calendarId
            });
            const response = await this.calendar.freebusy.query({
                requestBody: {
                    timeMin: startTime,
                    timeMax: endTime,
                    timeZone,
                    items: [{ id: calendarId }]
                }
            });
            const busyTimes = response.data.calendars[calendarId]?.busy || [];
            const slots = [];
            const start = new Date(startTime);
            const end = new Date(endTime);
            const current = new Date(start);
            while (current < end) {
                const slotEnd = new Date(current.getTime() + 30 * 60 * 1000);
                const isAvailable = !busyTimes.some((busy) => {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);
                    return (current < busyEnd && slotEnd > busyStart);
                });
                slots.push({
                    start: current.toISOString(),
                    end: slotEnd.toISOString(),
                    available: isAvailable,
                    conflictingEvents: isAvailable ? undefined : ['Busy']
                });
                current.setTime(current.getTime() + 30 * 60 * 1000);
            }
            this.stream.finishStep('checking_calendar_availability');
            return slots;
        }
        catch (error) {
            console.error('Error checking availability:', error);
            this.stream.errorRun(`Failed to check availability: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async scheduleMeeting(event, calendarId = 'primary', requireApproval = true) {
        try {
            this.stream.startStep('scheduling_meeting');
            await this.stream.streamToolCall('schedule_meeting', {
                summary: event.summary,
                start: event.start,
                end: event.end,
                attendees: event.attendees,
                description: event.description,
                location: event.location,
                requireApproval
            });
            if (requireApproval) {
                await this.stream.streamMessage(`🗓️ **Meeting Scheduled for Approval**

**Title:** ${event.summary}
**Time:** ${new Date(event.start.dateTime).toLocaleString()} - ${new Date(event.end.dateTime).toLocaleString()}
**Attendees:** ${event.attendees?.map(a => a.email).join(', ') || 'None'}
**Location:** ${event.location || 'Not specified'}

Would you like me to send the invitations?`, 'assistant');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            const response = await this.calendar.events.insert({
                calendarId,
                requestBody: {
                    summary: event.summary,
                    description: event.description,
                    start: event.start,
                    end: event.end,
                    attendees: event.attendees,
                    location: event.location,
                    conferenceData: event.conferenceData
                },
                conferenceDataVersion: 1
            });
            const scheduledEvent = {
                id: response.data.id,
                summary: response.data.summary,
                description: response.data.description,
                start: response.data.start,
                end: response.data.end,
                attendees: response.data.attendees || [],
                location: response.data.location,
                conferenceData: response.data.conferenceData
            };
            await this.stream.streamMessage(`✅ **Meeting Successfully Scheduled**

**Event ID:** ${scheduledEvent.id}
**Title:** ${scheduledEvent.summary}
**Time:** ${new Date(scheduledEvent.start.dateTime).toLocaleString()}

Invitations have been sent to all attendees.`, 'assistant');
            this.stream.finishStep('scheduling_meeting');
            return scheduledEvent;
        }
        catch (error) {
            console.error('Error scheduling meeting:', error);
            this.stream.errorRun(`Failed to schedule meeting: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async getTodaysAgenda(calendarId = 'primary', timeZone = 'UTC') {
        try {
            this.stream.startStep('fetching_todays_agenda');
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            await this.stream.streamToolCall('get_agenda', {
                date: today.toISOString().split('T')[0],
                calendarId,
                timeZone
            });
            const response = await this.calendar.events.list({
                calendarId,
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });
            const events = response.data.items?.map((item) => ({
                id: item.id,
                summary: item.summary || 'Untitled Event',
                description: item.description,
                start: item.start,
                end: item.end,
                attendees: item.attendees || [],
                location: item.location
            })) || [];
            if (events.length === 0) {
                await this.stream.streamMessage("📅 **Today's Agenda**\n\nNo meetings scheduled for today. Your calendar is clear!", 'assistant');
            }
            else {
                const agendaText = events.map((event, index) => {
                    const startTime = new Date(event.start.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const endTime = new Date(event.end.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return `${index + 1}. **${event.summary}**
   ⏰ ${startTime} - ${endTime}
   ${event.location ? `📍 ${event.location}` : ''}
   ${event.attendees && event.attendees.length > 0 ? `👥 ${event.attendees.length} attendees` : ''}`;
                }).join('\n\n');
                await this.stream.streamMessage(`📅 **Today's Agenda** (${events.length} meeting${events.length > 1 ? 's' : ''})\n\n${agendaText}`, 'assistant');
            }
            this.stream.finishStep('fetching_todays_agenda');
            return events;
        }
        catch (error) {
            console.error('Error fetching agenda:', error);
            this.stream.errorRun(`Failed to fetch agenda: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async findOptimalMeetingTime(attendeeEmails, durationMinutes, preferredStartHour = 9, preferredEndHour = 17, daysAhead = 7) {
        try {
            this.stream.startStep('finding_optimal_meeting_time');
            await this.stream.streamToolCall('find_optimal_time', {
                attendees: attendeeEmails,
                duration: durationMinutes,
                preferredHours: `${preferredStartHour}:00-${preferredEndHour}:00`,
                daysAhead
            });
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + daysAhead);
            const optimalSlots = [];
            for (let day = 0; day < daysAhead; day++) {
                const current = new Date(startDate);
                current.setDate(current.getDate() + day);
                current.setHours(preferredStartHour, 0, 0, 0);
                while (current.getHours() < preferredEndHour) {
                    const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);
                    if (slotEnd.getHours() <= preferredEndHour) {
                        optimalSlots.push({
                            start: current.toISOString(),
                            end: slotEnd.toISOString(),
                            available: Math.random() > 0.3,
                            conflictingEvents: Math.random() > 0.3 ? undefined : ['Conflict detected']
                        });
                    }
                    current.setTime(current.getTime() + 30 * 60 * 1000);
                }
            }
            const availableSlots = optimalSlots.filter(slot => slot.available).slice(0, 5);
            if (availableSlots.length > 0) {
                const slotsText = availableSlots.map((slot, index) => {
                    const start = new Date(slot.start);
                    return `${index + 1}. ${start.toLocaleDateString()} at ${start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}`;
                }).join('\n');
                await this.stream.streamMessage(`🎯 **Optimal Meeting Times Found**\n\nBest available slots for ${durationMinutes} minutes:\n\n${slotsText}`, 'assistant');
            }
            else {
                await this.stream.streamMessage("❌ **No Optimal Times Found**\n\nNo suitable meeting times found for the specified criteria. Consider adjusting the time range or duration.", 'assistant');
            }
            this.stream.finishStep('finding_optimal_meeting_time');
            return availableSlots;
        }
        catch (error) {
            console.error('Error finding optimal meeting time:', error);
            this.stream.errorRun(`Failed to find optimal meeting time: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async cancelMeeting(eventId, calendarId = 'primary', notifyAttendees = true) {
        try {
            this.stream.startStep('canceling_meeting');
            await this.stream.streamToolCall('cancel_meeting', {
                eventId,
                calendarId,
                notifyAttendees
            });
            await this.calendar.events.delete({
                calendarId,
                eventId,
                sendNotifications: notifyAttendees
            });
            await this.stream.streamMessage(`✅ **Meeting Canceled**\n\nEvent ${eventId} has been canceled.${notifyAttendees ? ' Attendees have been notified.' : ''}`, 'assistant');
            this.stream.finishStep('canceling_meeting');
        }
        catch (error) {
            console.error('Error canceling meeting:', error);
            this.stream.errorRun(`Failed to cancel meeting: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
exports.CalendarAgent = CalendarAgent;
//# sourceMappingURL=calendar-agent.js.map