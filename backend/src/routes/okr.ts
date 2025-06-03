import express from 'express';
import { okrService } from '../services/okr-service.js';
import { githubTracker } from '../agents/github-tracker.js';
import { OKR, OKRChatCommand } from '../types/okr.js';

const router = express.Router();

// Error logging helper
const logError = (operation: string, error: any, context?: any) => {
  console.error(`[OKR-ROUTES-ERROR] ${operation}:`, {
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

const logInfo = (operation: string, data?: any) => {
  console.log(`[OKR-ROUTES-INFO] ${operation}:`, {
    data,
    timestamp: new Date().toISOString()
  });
};

// GET /api/okr/dashboard - Get dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    logInfo('Dashboard data requested', { query: req.query });
    
    const ownerId = req.query.ownerId as string;
    const dashboardData = await okrService.getDashboardData(ownerId);
    
    logInfo('Dashboard data served successfully', {
      okrCount: dashboardData.okrs.length,
      totalProgress: dashboardData.totalProgress,
      alertCount: dashboardData.recentAlerts.length
    });
    
    res.json(dashboardData);
  } catch (error) {
    logError('GET /dashboard', error, { query: req.query });
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/okr/list - Get all OKRs
router.get('/list', async (req, res) => {
  try {
    logInfo('OKR list requested', { query: req.query });
    
    const ownerId = req.query.ownerId as string;
    const okrs = await okrService.getAllOKRs(ownerId);
    
    logInfo('OKR list served successfully', { count: okrs.length });
    res.json(okrs);
  } catch (error) {
    logError('GET /list', error, { query: req.query });
    res.status(500).json({ 
      error: 'Failed to fetch OKRs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/okr/:id - Get specific OKR
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logInfo('Single OKR requested', { id });
    
    const okr = await okrService.getOKR(id);
    
    if (!okr) {
      logInfo('OKR not found', { id });
      res.status(404).json({ error: 'OKR not found' });
      return;
    }
    
    logInfo('Single OKR served successfully', { id, title: okr.title });
    res.json(okr);
  } catch (error) {
    logError('GET /:id', error, { id: req.params.id });
    res.status(500).json({ 
      error: 'Failed to fetch OKR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/okr/create - Create new OKR
router.post('/create', async (req, res) => {
  try {
    logInfo('Creating new OKR', { body: req.body });
    
    const okrData = req.body as Partial<OKR>;
    const okr = await okrService.createOKR(okrData);
    
    logInfo('OKR created successfully', { id: okr.id, title: okr.title });
    res.status(201).json(okr);
  } catch (error) {
    logError('POST /create', error, { body: req.body });
    res.status(500).json({ 
      error: 'Failed to create OKR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/okr/:id/progress - Update OKR progress
router.put('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, source = 'MANUAL', details } = req.body;
    
    logInfo('Updating OKR progress', { id, progress, source });
    
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      logError('PUT /:id/progress', new Error('Invalid progress value'), { id, progress });
      res.status(400).json({ error: 'Progress must be a number between 0 and 100' });
      return;
    }
    
    const progressEntry = await okrService.updateProgress(id, progress, source, details);
    
    logInfo('OKR progress updated successfully', { 
      id, 
      progress, 
      delta: progressEntry.delta 
    });
    
    res.json(progressEntry);
  } catch (error) {
    logError('PUT /:id/progress', error, { id: req.params.id, body: req.body });
    res.status(500).json({ 
      error: 'Failed to update progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/okr/chat-command - Handle natural language OKR commands
router.post('/chat-command', async (req, res) => {
  try {
    const { command, context } = req.body as { command: string; context?: any };
    
    logInfo('Processing chat command', { command, context });
    
    const response = await processOKRChatCommand(command, context);
    
    logInfo('Chat command processed successfully', { command, response: response.substring(0, 100) });
    res.json({ response });
  } catch (error) {
    logError('POST /chat-command', error, { body: req.body });
    res.status(500).json({ 
      error: 'Failed to process chat command',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/okr/sync-github - Manually sync GitHub repository
router.post('/sync-github', async (req, res) => {
  try {
    const { repoName, ownerId } = req.body;
    
    logInfo('Manual GitHub sync requested', { repoName, ownerId });
    
    await githubTracker.syncRepository(repoName, ownerId);
    
    logInfo('GitHub sync completed successfully', { repoName });
    res.json({ message: 'GitHub sync completed successfully' });
  } catch (error) {
    logError('POST /sync-github', error, { body: req.body });
    res.status(500).json({ 
      error: 'Failed to sync GitHub repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/okr/init-demo-data - Initialize with demo data (based on real spreadsheet)
router.post('/init-demo-data', async (req, res) => {
  try {
    logInfo('Initializing demo data');
    
    await initializeRealOKRData();
    
    logInfo('Demo data initialized successfully');
    res.json({ message: 'Demo data initialized successfully' });
  } catch (error) {
    logError('POST /init-demo-data', error);
    res.status(500).json({ 
      error: 'Failed to initialize demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Natural language command processor
async function processOKRChatCommand(command: string, context?: any): Promise<string> {
  try {
    const lowerCommand = command.toLowerCase();
    
    // Simple pattern matching for MVP (can be enhanced with NLP later)
    if (lowerCommand.includes('progress') && lowerCommand.includes('dozy')) {
      const okrs = await okrService.getAllOKRs();
      const dozyOKRs = okrs.filter(okr => okr.title.toLowerCase().includes('dozy'));
      if (dozyOKRs.length > 0) {
        const avgProgress = dozyOKRs.reduce((sum, okr) => sum + okr.progress, 0) / dozyOKRs.length;
        return `DOZY progress: ${Math.round(avgProgress)}% complete. ${dozyOKRs.length} active tasks found.`;
      }
      return "No DOZY OKRs found.";
    }
    
    if (lowerCommand.includes('revenue') || lowerCommand.includes('vms')) {
      const okrs = await okrService.getAllOKRs();
      const revenueOKRs = okrs.filter(okr => 
        okr.title.toLowerCase().includes('vms') || 
        okr.title.toLowerCase().includes('revenue') ||
        okr.title.toLowerCase().includes('bigum')
      );
      
      if (revenueOKRs.length > 0) {
        const totalProgress = revenueOKRs.reduce((sum, okr) => sum + okr.progress, 0) / revenueOKRs.length;
        return `Revenue pipeline: ${Math.round(totalProgress)}% complete. Key items: ${revenueOKRs.map(okr => `${okr.title} (${okr.progress}%)`).join(', ')}`;
      }
      return "No revenue-related OKRs found.";
    }
    
    if (lowerCommand.includes('priority') || lowerCommand.includes('focus')) {
      const dashboardData = await okrService.getDashboardData();
      const topPriorities = dashboardData.okrs.slice(0, 3);
      return `Top priorities: ${topPriorities.map((okr, i) => `${i+1}. ${okr.title} (${okr.progress}%, RICE: ${okr.ricePriority.score})`).join(' ')}`;
    }
    
    if (lowerCommand.includes('status') || lowerCommand.includes('overview')) {
      const dashboardData = await okrService.getDashboardData();
      return `Overall progress: ${dashboardData.totalProgress}%. ${dashboardData.okrs.length} active OKRs. ${dashboardData.recentAlerts.length} alerts require attention.`;
    }
    
    // Default response
    return "I understand you want to work with OKRs. Try asking about 'DOZY progress', 'revenue status', 'top priorities', or 'overall status'.";
  } catch (error) {
    logError('processOKRChatCommand', error, { command, context });
    return "Sorry, I encountered an error processing your request. Please try again.";
  }
}

// Initialize with real OKR data from your spreadsheet
async function initializeRealOKRData(): Promise<void> {
  try {
    logInfo('Initializing real OKR data from spreadsheet');
    
    // DOZY Launch OKRs (O5)
    await okrService.createOKR({
      title: 'Fix small-screen text overflow in watch app',
      description: 'O5: Launch DOZY - Fix display issues on small screen devices',
      progress: 80,
      autoTracked: true,
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-06-09'),
      integrations: {
        github: {
          repo: 'dozy-sleep-tracker',
          progressWeight: 90
        }
      },
      ricePriority: {
        reach: 8,
        impact: 10,
        confidence: 8,
        effort: 5,
        score: 4160,
        lastCalculated: new Date()
      },
      tags: ['dozy', 'mobile', 'ui'],
      ownerId: 'sven',
      targetValue: 100,
      currentValue: 80,
      unit: '%'
    });

    await okrService.createOKR({
      title: 'Generate campaign images & SORA video',
      description: 'O5: Launch DOZY - Create marketing materials for launch',
      progress: 0,
      autoTracked: false,
      priority: 'CRITICAL',
      status: 'NOT_STARTED',
      dueDate: new Date('2025-06-11'),
      ricePriority: {
        reach: 9,
        impact: 10,
        confidence: 7,
        effort: 7,
        score: 4900,
        lastCalculated: new Date()
      },
      tags: ['dozy', 'marketing', 'content'],
      ownerId: 'sven'
    });

    await okrService.createOKR({
      title: 'Rebuild landing page with MagicUI styles',
      description: 'O5: Launch DOZY - Update landing page with new design system',
      progress: 10,
      autoTracked: true,
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-06-12'),
      integrations: {
        github: {
          repo: 'dozy-landing',
          progressWeight: 80
        }
      },
      ricePriority: {
        reach: 8,
        impact: 9,
        confidence: 8,
        effort: 6,
        score: 3780,
        lastCalculated: new Date()
      },
      tags: ['dozy', 'frontend', 'design'],
      ownerId: 'sven'
    });

    // Revenue Foundation OKRs (O1)
    await okrService.createOKR({
      title: 'Issue certificates to VMS participants',
      description: 'O1: Sikre omsætningsfundament - Complete VMS certification process',
      progress: 0,
      autoTracked: true,
      priority: 'CRITICAL',
      status: 'NOT_STARTED', // Delegated in sheet, but keeping consistent
      dueDate: new Date('2025-06-08'),
      integrations: {
        email: {
          keywords: ['VMS', 'certificate', 'participants'],
          progressWeight: 70
        }
      },
      ricePriority: {
        reach: 6,
        impact: 9,
        confidence: 3,
        effort: 10,
        score: 162,
        lastCalculated: new Date()
      },
      tags: ['revenue', 'vms', 'certificates'],
      ownerId: 'ac', // Delegated to AC
      targetValue: 30000,
      currentValue: 0,
      unit: 'DKK'
    });

    await okrService.createOKR({
      title: 'Prepare 11 teaching days at Bigum & Co',
      description: 'O1: Sikre omsætningsfundament - Prepare comprehensive teaching program',
      progress: 50,
      autoTracked: true,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-06-10'),
      integrations: {
        email: {
          keywords: ['Bigum', 'teaching', 'preparation'],
          progressWeight: 60
        },
        calendar: {
          eventTypes: ['Bigum preparation', 'teaching prep'],
          progressWeight: 40
        }
      },
      ricePriority: {
        reach: 5,
        impact: 10,
        confidence: 6,
        effort: 8,
        score: 47,
        lastCalculated: new Date()
      },
      tags: ['revenue', 'bigum', 'teaching'],
      ownerId: 'sven',
      targetValue: 100000,
      currentValue: 50000,
      unit: 'DKK'
    });

    await okrService.createOKR({
      title: 'Send VMS follow-up email w/ proposal',
      description: 'O1: Sikre omsætningsfundament - Follow up on VMS opportunity',
      progress: 0,
      autoTracked: true,
      priority: 'MEDIUM',
      status: 'NOT_STARTED',
      dueDate: new Date('2025-06-05'),
      integrations: {
        email: {
          keywords: ['VMS', 'follow-up', 'proposal'],
          progressWeight: 90
        }
      },
      ricePriority: {
        reach: 7,
        impact: 8,
        confidence: 4,
        effort: 6,
        score: 35,
        lastCalculated: new Date()
      },
      tags: ['revenue', 'vms', 'communication'],
      ownerId: 'sven',
      targetValue: 30000,
      currentValue: 0,
      unit: 'DKK'
    });

    // HARKA POC OKRs (O4)
    await okrService.createOKR({
      title: 'Deploy HARKA site MVP (Coolify)',
      description: 'O4: HARKA POC - Deploy minimum viable product to Coolify platform',
      progress: 30,
      autoTracked: true,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-06-10'),
      integrations: {
        github: {
          repo: 'harka-site',
          progressWeight: 80
        }
      },
      ricePriority: {
        reach: 6,
        impact: 7,
        confidence: 5,
        effort: 8,
        score: 67,
        lastCalculated: new Date()
      },
      tags: ['harka', 'deployment', 'mvp'],
      ownerId: 'sven'
    });

    await okrService.createOKR({
      title: 'Finalize modular fractal logo files',
      description: 'O4: HARKA POC - Complete brand identity assets',
      progress: 70,
      autoTracked: false,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-06-06'),
      ricePriority: {
        reach: 4,
        impact: 6,
        confidence: 8,
        effort: 2,
        score: 24,
        lastCalculated: new Date()
      },
      tags: ['harka', 'branding', 'design'],
      ownerId: 'sven'
    });

    logInfo('Real OKR data initialized successfully with spreadsheet data');
  } catch (error) {
    logError('initializeRealOKRData', error);
    throw error;
  }
}

export default router;