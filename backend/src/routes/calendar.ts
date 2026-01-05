/**
 * Calendar API Routes
 * Endpoints for Google Calendar integration.
 */

import express, { Request, Response } from 'express';
import { getCalendarService, CreateEventInput } from '../services/CalendarService';

const router = express.Router();
const calendarService = getCalendarService();

/**
 * GET /api/calendar/events
 * Get upcoming calendar events
 */
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const events = await calendarService.getUpcomingEvents('default', limit);

    res.json({
      success: true,
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Get events error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/events/:id
 * Get a single event by ID
 */
router.get('/events/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await calendarService.getEvent('default', id);

    if (!event) {
      res.status(404).json({
        error: 'Event not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Get event error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch event',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/today
 * Get today's agenda
 */
router.get('/today', async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await calendarService.getTodayAgenda('default');

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Get today error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch today\'s agenda',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/range
 * Get events in a date range
 */
router.get('/range', async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end, limit } = req.query;

    if (!start || !end) {
      res.status(400).json({
        error: 'Missing required parameters',
        message: 'start and end dates are required (ISO format)',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    const maxResults = parseInt(limit as string) || 50;

    const events = await calendarService.getEventsInRange(
      'default',
      startDate,
      endDate,
      maxResults
    );

    res.json({
      success: true,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Get range error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch events in range',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
router.post('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const { summary, description, startDateTime, endDateTime, timeZone, location, attendees } =
      req.body;

    if (!summary || !startDateTime || !endDateTime) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'summary, startDateTime, and endDateTime are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const input: CreateEventInput = {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      location,
      attendees,
    };

    const event = await calendarService.createEvent('default', input);

    res.status(201).json({
      success: true,
      event,
      message: 'Event created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Create event error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/freebusy
 * Get free/busy information
 */
router.get('/freebusy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({
        error: 'Missing required parameters',
        message: 'start and end dates are required (ISO format)',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    const busy = await calendarService.getFreeBusy('default', startDate, endDate);

    res.json({
      success: true,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      busy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar] Get freebusy error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch free/busy info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
