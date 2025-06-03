import express from 'express';
import { githubTracker } from '../agents/github-tracker.js';
import { GitHubWebhookPayload } from '../types/okr.js';

const router = express.Router();

// Error logging helper
const logError = (operation: string, error: any, context?: any) => {
  console.error(`[WEBHOOKS-ERROR] ${operation}:`, {
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

const logInfo = (operation: string, data?: any) => {
  console.log(`[WEBHOOKS-INFO] ${operation}:`, {
    data,
    timestamp: new Date().toISOString()
  });
};

// POST /api/webhooks/github - GitHub webhook handler
router.post('/github', async (req, res) => {
  try {
    const githubEvent = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    const delivery = req.headers['x-github-delivery'] as string;
    
    logInfo('GitHub webhook received', {
      event: githubEvent,
      delivery,
      hasSignature: !!signature,
      bodySize: JSON.stringify(req.body).length
    });

    // Basic validation
    if (!githubEvent) {
      logError('GitHub webhook missing event header', new Error('Missing x-github-event header'));
      res.status(400).json({ error: 'Missing GitHub event header' });
      return;
    }

    // For MVP, we'll skip signature validation (add in production)
    // In production, verify webhook signature using GitHub secret
    
    const payload = req.body as GitHubWebhookPayload;
    
    // Handle different GitHub events
    switch (githubEvent) {
      case 'push':
        logInfo('Processing push event', {
          repo: payload.repository?.full_name,
          commits: payload.commits?.length || 0,
          pusher: payload.pusher?.name
        });
        
        await githubTracker.handleWebhook({
          ...payload,
          action: 'pushed'
        });
        
        logInfo('Push event processed successfully', {
          repo: payload.repository?.full_name,
          delivery
        });
        break;
        
      case 'ping':
        logInfo('GitHub ping received', { zen: payload });
        res.json({ message: 'Webhook ping received successfully' });
        return;
        
      default:
        logInfo('Unhandled GitHub event', { event: githubEvent });
        res.json({ message: `Event ${githubEvent} received but not processed` });
        return;
    }
    
    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logError('POST /github', error, {
      headers: req.headers,
      bodyKeys: Object.keys(req.body || {})
    });
    
    res.status(500).json({ 
      error: 'Failed to process GitHub webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/webhooks/test-github - Test GitHub webhook (for development)
router.post('/test-github', async (req, res) => {
  try {
    logInfo('Test GitHub webhook triggered');
    
    const testPayload: GitHubWebhookPayload = {
      action: 'pushed',
      repository: {
        name: req.body.repoName || 'dozy-sleep-tracker',
        full_name: req.body.fullName || 'user/dozy-sleep-tracker'
      },
      commits: [
        {
          id: 'test-commit-' + Date.now(),
          message: req.body.commitMessage || 'feat: Add new sleep tracking feature',
          timestamp: new Date().toISOString(),
          author: {
            name: req.body.authorName || 'Test Developer',
            email: req.body.authorEmail || 'dev@test.com'
          },
          added: ['src/new-feature.ts'],
          modified: ['src/app.ts', 'README.md'],
          removed: []
        }
      ],
      pusher: {
        name: req.body.pusherName || 'Test Developer',
        email: req.body.pusherEmail || 'dev@test.com'
      }
    };
    
    await githubTracker.handleWebhook(testPayload);
    
    logInfo('Test GitHub webhook processed successfully', {
      repo: testPayload.repository.full_name,
      commitMessage: testPayload.commits![0].message
    });
    
    res.json({ 
      message: 'Test webhook processed successfully',
      payload: testPayload
    });
  } catch (error) {
    logError('POST /test-github', error, { body: req.body });
    
    res.status(500).json({ 
      error: 'Failed to process test webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/webhooks/status - Webhook system status
router.get('/status', async (req, res) => {
  try {
    logInfo('Webhook status requested');
    
    const status = {
      github: {
        enabled: true,
        lastProcessed: new Date().toISOString(),
        supportedEvents: ['push', 'ping']
      },
      email: {
        enabled: false, // TODO: Implement email webhooks
        lastProcessed: null
      },
      calendar: {
        enabled: false, // TODO: Implement calendar webhooks
        lastProcessed: null
      }
    };
    
    logInfo('Webhook status served', status);
    res.json(status);
  } catch (error) {
    logError('GET /status', error);
    res.status(500).json({ 
      error: 'Failed to get webhook status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Middleware to validate webhook signatures (for production)
function validateGitHubSignature(req: express.Request, res: express.Response, next: express.NextFunction) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!secret) {
    logInfo('GitHub webhook secret not configured, skipping validation');
    return next();
  }
  
  if (!signature) {
    logError('validateGitHubSignature', new Error('Missing signature'));
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  // TODO: Implement actual signature validation using crypto
  // For MVP, we skip this validation
  logInfo('Webhook signature validation skipped (MVP mode)');
  next();
}

export default router;