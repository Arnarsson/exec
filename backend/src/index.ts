/**
 * Main Server Entry Point
 * Executive Assistant MVP Backend
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AGUIWebSocketServer } from './server/websocket';
import { ExecutiveAssistantOrchestrator } from './agents/orchestrator';
import { AutomationService } from './services/AutomationService';
import automationRoutes, { initializeAutomationRoutes } from './routes/automation';

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;

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

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://n8n.aigrowthadvisors.cc'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'https://n8n.aigrowthadvisors.cc'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      webSocket: wsServer ? 'running' : 'stopped',
      connections: wsServer ? wsServer.getStats().totalConnections : 0
    }
  });
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

// CopilotKit Integration endpoint
app.post('/api/copilot', async (req, res): Promise<void> => {
  try {
    const { messages, tools } = req.body;
    
    console.log('CopilotKit request:', { messages, tools });
    
    // Handle missing or empty messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.json({
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! I\'m your Executive Assistant. How can I help you today?'
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

    // Process the request through our orchestrator
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

    const response = await orchestrator.processRequest(agentRequest);
    
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
    console.error('CopilotKit API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});


// Automation API routes
app.use('/api/automation', automationRoutes);

// n8n Webhook endpoints for calendar integration
app.post('/webhooks/calendar/events', async (req, res) => {
  try {
    const { events, action } = req.body;
    console.log('📅 Calendar webhook received:', { action, eventsCount: events?.length });
    
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
    console.error('Calendar webhook error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// n8n Webhook for email integration
app.post('/webhooks/email/received', async (req, res) => {
  try {
    const { emails, summary } = req.body;
    console.log('📧 Email webhook received:', { emailCount: emails?.length, summary });
    
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
    console.error('Email webhook error:', error);
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
  console.error('API Error:', error);
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
      console.log('🤖 Automation service initialized');
    }
    
    console.log(`🌐 WebSocket server started on port ${WS_PORT}`);
  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error);
  }
}

// Start servers
function startServer() {
  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`🚀 Executive Assistant API server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  // Start WebSocket server
  initializeWebSocketServer();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    
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
    console.log('🔄 SIGINT received, shutting down gracefully...');
    
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
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// Start the application
if (require.main === module) {
  startServer();
}

export { app, wsServer };
