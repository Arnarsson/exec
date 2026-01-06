/**
 * Gmail API Routes
 * Endpoints for Gmail integration.
 */

import express, { Request, Response } from 'express';
import { getGmailService } from '../services/GmailService';

const router = express.Router();
const gmailService = getGmailService();

/**
 * GET /api/gmail/inbox
 * Get inbox messages
 */
router.get('/inbox', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = (req.query.accountId as string) || 'default';
    const limit = parseInt(req.query.limit as string) || 20;
    const messages = await gmailService.getInbox(accountId, limit);

    res.json({
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Get inbox error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch inbox',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/gmail/messages/:id
 * Get a single message with body
 */
router.get('/messages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const accountId = (req.query.accountId as string) || 'default';
    const message = await gmailService.getMessage(accountId, id);

    if (!message) {
      res.status(404).json({
        error: 'Message not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Get message error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch message',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/gmail/unread
 * Get unread message count
 */
router.get('/unread', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = (req.query.accountId as string) || 'default';
    const count = await gmailService.getUnreadCount(accountId);

    res.json({
      success: true,
      count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Get unread count error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch unread count',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/gmail/search
 * Search messages
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit } = req.query;

    if (!q) {
      res.status(400).json({
        error: 'Missing required parameter',
        message: 'Query parameter q is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const accountId = (req.query.accountId as string) || 'default';
    const maxResults = parseInt(limit as string) || 20;
    const messages = await gmailService.searchMessages(accountId, q as string, maxResults);

    res.json({
      success: true,
      query: q,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Search error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to search messages',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/gmail/threads/:id
 * Get a thread with all messages
 */
router.get('/threads/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const accountId = (req.query.accountId as string) || 'default';
    const thread = await gmailService.getThread(accountId, id);

    if (!thread) {
      res.status(404).json({
        error: 'Thread not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      thread,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Get thread error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch thread',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/gmail/labels
 * Get all labels
 */
router.get('/labels', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = (req.query.accountId as string) || 'default';
    const labels = await gmailService.getLabels(accountId);

    res.json({
      success: true,
      labels,
      count: labels.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Gmail] Get labels error:', error);

    if (error instanceof Error && error.message === 'Not authenticated') {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Google account first',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch labels',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
