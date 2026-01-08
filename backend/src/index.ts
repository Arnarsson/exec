/**
 * Main Server Entry Point
 * Executive Assistant MVP Backend with OKR 10X Enhancement
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AGUIWebSocketServer } from './server/websocket';
import { ExecutiveAssistantOrchestrator } from './agents/orchestrator';
import { AutomationService } from './services/AutomationService';
import automationRoutes, { initializeAutomationRoutes } from './routes/automation';
import okrRoutes from './routes/okr.js';
import webhookRoutes from './routes/webhooks.js';
import authRoutes from './routes/auth';
import calendarRoutes from './routes/calendar';
import gmailRoutes from './routes/gmail';
import memoryRoutes from './routes/memory';
import { okrService } from './services/okr-service.js';

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;

// Enhanced logging for OKR system
const logInfo = (operation: string, data?: any) => {
  console.log(`[SERVER-INFO] ${operation}:`, {
    data,
    timestamp: new Date().toISOString()
  });
};

const logError = (operation: string, error: any, context?: any) => {
  console.error(`[SERVER-ERROR] ${operation}:`, {
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration with environment-based origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (enhanced with OKR status)
app.get('/health', async (req, res) => {
  try {
    const dashboardData = await okrService.getDashboardData();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        webSocket: wsServer ? 'running' : 'stopped',
        connections: wsServer ? wsServer.getStats().totalConnections : 0,
        okrSystem: {
          enabled: true,
          okrCount: dashboardData.okrs.length,
          totalProgress: dashboardData.totalProgress,
          alertCount: dashboardData.recentAlerts.length
        }
      }
    });
  } catch (error) {
    logError('Health check', error);
    res.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        webSocket: wsServer ? 'running' : 'stopped',
        connections: wsServer ? wsServer.getStats().totalConnections : 0,
        okrSystem: {
          enabled: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    });
  }
});

// API endpoints
app.get('/api/status', (req, res) => {
  const orchestrator = new ExecutiveAssistantOrchestrator();
  const state = orchestrator.getExecutiveState();
  
  res.json({
    executiveState: state,
    serverStats: wsServer ? wsServer.getStats() : null,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for AG-UI events
app.post('/api/test-events', async (req, res): Promise<void> => {
  try {
    const { eventType, content } = req.body;
    
    if (!wsServer) {
      res.status(503).json({ error: 'WebSocket server not running' });
      return;
    }

    // Create test orchestrator
    const orchestrator = new ExecutiveAssistantOrchestrator();
    const stream = orchestrator.getStream();

    // Trigger different test events
    switch (eventType) {
      case 'message':
        await stream.streamMessage(content || 'Test message from API', 'assistant');
        break;
      
      case 'tool_call':
        await stream.streamToolCall('test_tool', { content: content || 'Test parameters' });
        break;
      
      case 'state_update':
        stream.sendStateSnapshot(orchestrator.getExecutiveState());
        break;
      
      default:
        res.status(400).json({ error: 'Invalid event type' });
        return;
    }

    res.json({ 
      success: true, 
      eventType, 
      message: 'Event sent successfully',
      connections: wsServer.getStats().totalConnections
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Enhanced CopilotKit Integration with OKR commands
app.post('/api/copilot', async (req, res): Promise<void> => {
  try {
    const { messages, tools } = req.body;
    
    logInfo('CopilotKit request', { messageCount: messages?.length, tools: tools?.length });
    
    // Handle missing or empty messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.json({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! I\'m your Executive Assistant with OKR intelligence. Ask me about your progress, priorities, or say things like "DOZY progress" or "revenue status".'
          }
        }]
      });
      return;
    }
    
    // Create orchestrator for handling the request
    const orchestrator = new ExecutiveAssistantOrchestrator();
    
    // Get the latest message from the conversation
    const latestMessage = messages[messages.length - 1];
    
    if (!latestMessage || !latestMessage.content) {
      res.json({
        choices: [{
          message: {
            role: 'assistant',
            content: 'I didn\'t receive a message. Could you please try again?'
          }
        }]
      });
      return;
    }

    // Check if this is an OKR-related query
    const messageContent = latestMessage.content.toLowerCase();
    const isOKRQuery = messageContent.includes('okr') || 
                      messageContent.includes('progress') || 
                      messageContent.includes('dozy') || 
                      messageContent.includes('revenue') || 
                      messageContent.includes('priority') || 
                      messageContent.includes('status');

    let response;
    
    if (isOKRQuery) {
      // Handle OKR queries directly
      try {
        const okrResponse = await fetch('http://localhost:3001/api/okr/chat-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: latestMessage.content })
        });
        
        if (okrResponse.ok) {
          const okrData = await okrResponse.json() as { response: string };
          response = { content: okrData.response };
        } else {
          throw new Error('OKR service unavailable');
        }
      } catch (error) {
        logError('OKR query processing', error);
        // Fallback to regular orchestrator
        const agentRequest = {
          id: `copilot_${Date.now()}`,
          type: 'chat' as const,
          content: latestMessage.content,
          metadata: {
            threadId: req.body.threadId || `thread_${Date.now()}`,
            userId: 'copilot_user',
            tools: tools
          }
        };
        response = await orchestrator.processRequest(agentRequest);
      }
    } else {
      // Process regular requests through orchestrator
      const agentRequest = {
        id: `copilot_${Date.now()}`,
        type: 'chat' as const,
        content: latestMessage.content,
        metadata: {
          threadId: req.body.threadId || `thread_${Date.now()}`,
          userId: 'copilot_user',
          tools: tools
        }
      };
      response = await orchestrator.processRequest(agentRequest);
    }
    
    // Return response in CopilotKit format
    res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: response.content
        }
      }]
    });
  } catch (error) {
    logError('CopilotKit API', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Authentication routes
app.use('/auth', authRoutes);

// Google Calendar and Gmail API routes
app.use('/api/calendar', calendarRoutes);
app.use('/api/gmail', gmailRoutes);

// Memory API routes (proxy to Memory service)
app.use('/api/memory', memoryRoutes);

// OKR API routes
app.use('/api/okr', okrRoutes);

// Webhook routes (including GitHub)
app.use('/api/webhooks', webhookRoutes);

// Automation API routes
app.use('/api/automation', automationRoutes);

// n8n Webhook endpoints for calendar integration
app.post('/webhooks/calendar/events', async (req, res) => {
  try {
    const { events, action } = req.body;
    logInfo('Calendar webhook received', { action, eventsCount: events?.length });
    
    // Store calendar events (you can add database persistence here)
    if (wsServer) {
      // Broadcast calendar update to connected clients
      wsServer.broadcast({
        id: `calendar_${Date.now()}`,
        type: 'event',
        data: {
          type: 'CalendarUpdate',
          action,
          events,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: `Calendar ${action} processed successfully`,
      eventsProcessed: events?.length || 0 
    });
  } catch (error) {
    logError('Calendar webhook', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// n8n Webhook for email integration
app.post('/webhooks/email/received', async (req, res) => {
  try {
    const { emails, summary } = req.body;
    logInfo('Email webhook received', { emailCount: emails?.length, summary });
    
    // Broadcast email update to connected clients
    if (wsServer) {
      wsServer.broadcast({
        id: `email_${Date.now()}`,
        type: 'event',
        data: {
          type: 'EmailUpdate',
          emails,
          summary,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Email update processed successfully',
      emailsProcessed: emails?.length || 0 
    });
  } catch (error) {
    logError('Email webhook', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get current calendar agenda (now supports n8n data)
app.get('/api/calendar/agenda', async (req, res) => {
  try {
    // In production, you'd query your database here
    // For now, return placeholder that n8n can populate
    res.json({
      agenda: [],
      message: 'Calendar ready for n8n integration via POST /webhooks/calendar/events',
      webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/calendar/events`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Email integration endpoints (now supports n8n data)
app.get('/api/email/summary', async (req, res) => {
  try {
    // In production, you'd query your database here
    res.json({
      summary: {
        totalEmails: 0,
        unreadCount: 0,
        importantCount: 0
      },
      message: 'Email ready for n8n integration via POST /webhooks/email/received',
      webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/email/received`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('API Error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Initialize WebSocket server and automation service
let wsServer: AGUIWebSocketServer | null = null;
let automationService: AutomationService | null = null;

function initializeWebSocketServer() {
  try {
    // Get credentials from environment
    const credentials = {
      google: process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : null
    };

    wsServer = new AGUIWebSocketServer(Number(WS_PORT), credentials);
    
    // Initialize automation service with WebSocket service
    if (wsServer) {
      automationService = new AutomationService(wsServer);
      initializeAutomationRoutes(automationService);
      logInfo('Automation service initialized');
    }
    
    logInfo('WebSocket server started', { port: WS_PORT });
  } catch (error) {
    logError('WebSocket server start failed', error);
  }
}

// Initialize OKR demo data
async function initializeOKRSystem() {
  try {
    logInfo('Initializing OKR system');
    
    // Check if we already have data
    const existingOKRs = await okrService.getAllOKRs();
    
    if (existingOKRs.length === 0) {
      logInfo('No existing OKRs found, initializing demo data');
      await okrService.generateInitialData();
      logInfo('OKR demo data initialized successfully');
    } else {
      logInfo('Existing OKRs found, skipping initialization', { count: existingOKRs.length });
    }
    
    // Log current system status
    const dashboardData = await okrService.getDashboardData();
    logInfo('OKR system ready', {
      okrCount: dashboardData.okrs.length,
      totalProgress: dashboardData.totalProgress,
      alertCount: dashboardData.recentAlerts.length
    });
    
  } catch (error) {
    logError('OKR system initialization failed', error);
  }
}

// Start servers
function startServer() {
  // Start HTTP server
  const server = app.listen(PORT, async () => {
    logInfo('Executive Assistant API server started', { 
      port: PORT, 
      environment: process.env.NODE_ENV || 'development' 
    });
    console.log(`🚀 Executive Assistant API server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 OKR Dashboard API: http://localhost:${PORT}/api/okr/dashboard`);
    
    // Initialize OKR system after server starts
    await initializeOKRSystem();
  });

  // Start WebSocket server
  initializeWebSocketServer();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logInfo('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    if (wsServer) {
      await wsServer.close();
      console.log('✅ WebSocket server closed');
    }

    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logInfo('SIGINT received, shutting down gracefully');
    
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    if (wsServer) {
      await wsServer.close();
      console.log('✅ WebSocket server closed');
    }

    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection', { reason, promise });
    process.exit(1);
  });
}

// Start the application
if (require.main === module) {
  startServer();
}

export { app, wsServer };
