import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// This will be injected from the main app
let automationService: any;

export function initializeAutomationRoutes(service: any) {
  automationService = service;
}

// n8n webhook endpoint
router.post('/webhook/n8n', async (req: Request, res: Response) => {
  try {
    console.log('📨 n8n webhook received:', req.body);
    
    const automationData = {
      workflow: req.body.workflow,
      data: req.body.data,
      timestamp: req.body.timestamp || new Date().toISOString()
    };
    
    if (automationService) {
      await automationService.processAutomation(automationData);
    }
    
    res.json({ 
      success: true, 
      workflow: automationData.workflow,
      timestamp: automationData.timestamp
    });
  } catch (error) {
    console.error('❌ Automation webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get automation status
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (automationService) {
      const status = await automationService.getAutomationStatus();
      res.json(status);
    } else {
      res.json({ error: 'Automation service not initialized' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

// Manual workflow triggers
router.post('/trigger/:workflow', async (req: Request, res: Response) => {
  const { workflow } = req.params;
  
  try {
    // Use remote n8n instance
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.aigrowthadvisors.cc';
    const response = await fetch(`${n8nUrl}/webhook/${workflow}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    if (response.ok) {
      res.json({ success: true, workflow, n8nUrl });
    } else {
      throw new Error(`n8n webhook failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`❌ Failed to trigger ${workflow}:`, error);
    res.status(500).json({ error: 'Workflow trigger failed' });
  }
});

// Broadcast test endpoint
router.post('/broadcast-test', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'Missing type in request body' });
    }
    if (automationService && automationService.wsService && typeof automationService.wsService.broadcast === 'function') {
      automationService.wsService.broadcast({ type, data });
      return res.json({ success: true, type, data });
    } else {
      return res.status(500).json({ error: 'WebSocket service not available' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Broadcast failed', details: error instanceof Error ? error.message : error });
  }
  // Fallback (should never reach here)
  return res.status(500).json({ error: 'Unknown error in broadcast-test endpoint' });
});

export default router;