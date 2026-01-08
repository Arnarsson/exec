/**
 * Memory API Proxy Routes
 * Proxies requests from frontend to Memory API service
 */

import express from 'express';
import { getMemoryService } from '../services/MemoryService';

const router = express.Router();
const memoryService = getMemoryService();

// Health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await memoryService.healthCheck();
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'memory-api',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await memoryService.getStats();
    if (stats) {
      res.json(stats);
    } else {
      res.status(503).json({
        error: 'Memory service unavailable'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Search endpoint
router.post('/search', async (req, res) => {
  try {
    const { query, limit } = req.body;
    const results = await memoryService.search(query, limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Search with GET (for simple queries)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;
    const results = await memoryService.search(query, limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Proactive suggestions
router.post('/suggestions', async (req, res) => {
  try {
    const { context, mentioned_entities, recent_accessed } = req.body;
    const suggestions = await memoryService.getProactiveSuggestions(
      context,
      mentioned_entities,
      recent_accessed
    );
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
