/**
 * WebSocket Server for AG-UI Protocol
 * Handles real-time communication between frontend and agents
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ExecutiveAssistantOrchestrator } from '@/agents/orchestrator';
import { aguiEventEmitter } from '@/events/emitter';
import { WSMessage } from '../types/ag-ui';

export interface ClientConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  authenticated: boolean;
  lastActivity: Date;
}

export interface WSRequest {
  id: string;
  type: 'message' | 'action' | 'approval' | 'ping';
  data: {
    content?: string;
    action?: string;
    params?: any;
    threadId?: string;
  };
  timestamp: string;
}

export class AGUIWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, ClientConnection> = new Map();
  private orchestrator: ExecutiveAssistantOrchestrator;
  private heartbeatInterval!: NodeJS.Timeout;

  constructor(port: number = 8080, credentials?: any) {
    this.wss = new WebSocketServer({ 
      port,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 // 1MB max message size
    });

    this.orchestrator = new ExecutiveAssistantOrchestrator(credentials);

    this.setupWebSocketServer();
    this.setupHeartbeat();

    console.log(`🚀 AG-UI WebSocket server started on port ${port}`);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = uuidv4();
      const connection: ClientConnection = {
        id: clientId,
        ws,
        authenticated: false, // TODO: Implement authentication
        lastActivity: new Date()
      };

      this.connections.set(clientId, connection);
      
      // Register with AG-UI event emitter
      aguiEventEmitter.addConnection(clientId, ws);

      console.log(`🔗 Client connected: ${clientId} (${req.socket.remoteAddress})`);
      
      // Send welcome message
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'event',
        data: {
          type: 'Custom',
          name: 'connection_established',
          value: {
            clientId,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            capabilities: [
              'streaming_chat',
              'calendar_integration',
              'email_management',
              'task_management',
              'real_time_events'
            ]
          }
        },
        timestamp: new Date().toISOString()
      });

      // Setup message handling
      ws.on('message', async (data: Buffer) => {
        try {
          await this.handleMessage(connection, data);
        } catch (error) {
          console.error(`Error handling message from ${clientId}:`, error);
          this.sendError(connection, 'Invalid message format', error instanceof Error ? error.message : String(error));
        }
      });

      // Handle connection close
      ws.on('close', (code: number, reason: Buffer) => {
        console.log(`🔌 Client disconnected: ${clientId} (code: ${code}, reason: ${reason.toString()})`);
        this.connections.delete(clientId);
        aguiEventEmitter.removeConnection(clientId);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
        this.connections.delete(clientId);
        aguiEventEmitter.removeConnection(clientId);
      });

      // Handle pong (heartbeat response)
      ws.on('pong', () => {
        connection.lastActivity = new Date();
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private async handleMessage(connection: ClientConnection, data: Buffer): Promise<void> {
    const rawMessage = JSON.parse(data.toString());
    connection.lastActivity = new Date();

    console.log(`📨 Message from ${connection.id}:`, rawMessage.type, rawMessage.content?.substring(0, 50) || rawMessage.data?.content?.substring(0, 50));

    // Handle new AG-UI chat message format
    if (rawMessage.type === 'ChatMessage') {
      await this.handleAGUIChatMessage(connection, rawMessage);
      return;
    }

    // Handle legacy format
    const message = rawMessage as WSRequest;
    switch (message.type) {
      case 'message':
        await this.handleChatMessage(connection, message);
        break;
      
      case 'action':
        await this.handleActionRequest(connection, message);
        break;
      
      case 'approval':
        await this.handleApprovalResponse(connection, message);
        break;
      
      case 'ping':
        this.sendMessage(connection, {
          id: uuidv4(),
          type: 'response',
          data: { type: 'pong', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
      
      default:
        this.sendError(connection, 'Unknown message type', `Unsupported message type: ${message.type}`);
    }
  }

  private async handleAGUIChatMessage(connection: ClientConnection, message: any): Promise<void> {
    if (!message.content) {
      this.sendError(connection, 'Missing content', 'Chat message must include content');
      return;
    }

    console.log(`💬 AG-UI Chat Message: "${message.content}"`);

    // Send TextMessageStart event
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'event',
      data: {
        type: 'TextMessageStart',
        messageId: `response_${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Simulate streaming response based on message content
    const responseContent = this.generateExecutiveResponse(message.content);
    
    // Stream response content
    await this.streamResponse(connection, `response_${Date.now()}`, responseContent);

    // Check if this should trigger tool calls
    if (this.shouldUseTool(message.content)) {
      await this.simulateToolCall(connection, message.content);
    }
  }

  private generateExecutiveResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
      return "I'll check your calendar and help you with scheduling. Looking at your agenda for today...";
    }
    
    if (lowerMessage.includes('email') || lowerMessage.includes('inbox')) {
      return "Let me analyze your inbox and provide a summary of important emails that require your attention.";
    }
    
    if (lowerMessage.includes('task') || lowerMessage.includes('project')) {
      return "I'll help you manage your tasks and projects. Let me review your current priorities...";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('financial')) {
      return "I'll pull up the latest financial data and budget reports for your review.";
    }
    
    if (lowerMessage.includes('research') || lowerMessage.includes('analyze')) {
      return "I'll conduct research and analysis on that topic. Let me gather the latest information...";
    }
    
    return `I understand you're asking about: "${userMessage}". As your executive assistant, I'll help you with this request. Let me process this information...`;
  }

  private shouldUseTool(message: string): boolean {
    const toolKeywords = ['calendar', 'email', 'schedule', 'meeting', 'task', 'budget', 'research', 'analyze'];
    return toolKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private async simulateToolCall(connection: ClientConnection, message: string): Promise<void> {
    const lowerMessage = message.toLowerCase();
    let toolName = 'general_assistant';
    
    if (lowerMessage.includes('calendar') || lowerMessage.includes('schedule')) {
      toolName = 'calendar_manager';
    } else if (lowerMessage.includes('email')) {
      toolName = 'email_summarizer';
    } else if (lowerMessage.includes('task')) {
      toolName = 'task_manager';
    } else if (lowerMessage.includes('research')) {
      toolName = 'research_agent';
    }

    const toolCallId = `tool_${Date.now()}`;

    // Send ToolCallStart
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'event',
      data: {
        type: 'ToolCallStart',
        toolCallId,
        toolCallName: toolName,
        parentMessageId: `response_${Date.now()}`,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Simulate tool execution delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Send ToolCallEnd
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'event',
      data: {
        type: 'ToolCallEnd',
        toolCallId,
        toolCallName: toolName,
        result: `Tool ${toolName} completed successfully`,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Send final response with tool results
    const toolResponseMessage = `\n\n✅ I've completed the ${toolName} operation. Here are the results:\n\n${this.generateToolResults(toolName, message)}`;
    await this.streamResponse(connection, `response_${Date.now() + 1}`, toolResponseMessage);
  }

  private generateToolResults(toolName: string, originalMessage: string): string {
    switch (toolName) {
      case 'calendar_manager':
        return `📅 **Calendar Summary:**
• Today: 3 meetings scheduled (Board Review at 10 AM, Product Planning at 2 PM, Investor Call at 4:30 PM)
• Tomorrow: 2 meetings (Team Standup at 9 AM, Budget Review at 3 PM)
• This week: 12 total meetings, 4 high-priority
• Available slots today: 11:30 AM - 12:30 PM, 3:30 PM - 4:00 PM`;

      case 'email_summarizer':
        return `📧 **Email Intelligence:**
• 23 unread emails (8 marked important)
• 2 urgent emails requiring immediate attention
• Top senders: Legal Team (3), VP Engineering (2), Board Assistant (2)
• Key topics: Contract review (urgent), Q4 planning, budget approvals`;

      case 'task_manager':
        return `📋 **Task & Project Status:**
• 3 high-priority tasks due this week
• Q4 Product Roadmap: 75% complete (on track)
• Series B Fundraising: 90% complete (ahead of schedule)
• Enterprise Sales: 45% complete (at risk - needs attention)`;

      case 'research_agent':
        return `🔍 **Research Results:**
• Analyzed latest industry trends and market data
• Key insights: Market growth 15% YoY, competitor analysis updated
• 3 new opportunities identified for strategic consideration
• Full report available in your dashboard`;

      default:
        return `✨ **Assistant Analysis:**
• Processed your request: "${originalMessage}"
• Action items identified and prioritized
• Recommendations ready for your review`;
    }
  }

  private async streamResponse(connection: ClientConnection, messageId: string, content: string): Promise<void> {
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const delta = i === 0 ? words[i] : ' ' + words[i];
      
      // Send TextMessageContent
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'event',
        data: {
          type: 'TextMessageContent',
          messageId,
          delta,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      // Simulate realistic typing speed
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // Send TextMessageEnd
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'event',
      data: {
        type: 'TextMessageEnd',
        messageId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  private async handleChatMessage(connection: ClientConnection, message: WSRequest): Promise<void> {
    if (!message.data.content) {
      this.sendError(connection, 'Missing content', 'Chat message must include content');
      return;
    }

    const agentRequest = {
      id: message.id,
      type: 'chat' as const,
      content: message.data.content,
      metadata: {
        threadId: message.data.threadId,
        userId: connection.userId,
        clientId: connection.id
      }
    };

    try {
      const response = await this.orchestrator.processRequest(agentRequest);
      
      // Send response confirmation
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'response',
        data: {
          requestId: message.id,
          status: 'completed',
          response
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendError(connection, 'Processing failed', error instanceof Error ? error.message : String(error), message.id);
    }
  }

  private async handleActionRequest(connection: ClientConnection, message: WSRequest): Promise<void> {
    if (!message.data.action) {
      this.sendError(connection, 'Missing action', 'Action request must include action type');
      return;
    }

    let requestType: 'calendar' | 'email' | 'task' | 'chat' = 'chat';
    let content = `${message.data.action}`;

    // Determine request type based on action
    if (message.data.action.includes('calendar') || message.data.action.includes('meeting') || message.data.action.includes('schedule')) {
      requestType = 'calendar';
    } else if (message.data.action.includes('email') || message.data.action.includes('inbox')) {
      requestType = 'email';
    } else if (message.data.action.includes('task') || message.data.action.includes('project')) {
      requestType = 'task';
    }

    // Include parameters in content if provided
    if (message.data.params) {
      content += ` ${JSON.stringify(message.data.params)}`;
    }

    const agentRequest = {
      id: message.id,
      type: requestType,
      content,
      metadata: {
        threadId: message.data.threadId,
        userId: connection.userId,
        clientId: connection.id,
        action: message.data.action,
        params: message.data.params
      }
    };

    try {
      const response = await this.orchestrator.processRequest(agentRequest);
      
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'response',
        data: {
          requestId: message.id,
          status: 'completed',
          response
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendError(connection, 'Action failed', error instanceof Error ? error.message : String(error), message.id);
    }
  }

  private async handleApprovalResponse(connection: ClientConnection, message: WSRequest): Promise<void> {
    // Handle approval/rejection of pending actions
    const data = message.data as { approved: boolean; actionId: string; comments?: string };
    const { approved, actionId, comments } = data;

    if (approved) {
      console.log(`✅ Action ${actionId} approved by ${connection.id}`);
      
      // TODO: Execute approved action
      // This would typically involve calling the appropriate agent method
      
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'response',
        data: {
          requestId: message.id,
          status: 'approved',
          actionId,
          message: 'Action has been approved and executed'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`❌ Action ${actionId} rejected by ${connection.id}`);
      
      this.sendMessage(connection, {
        id: uuidv4(),
        type: 'response',
        data: {
          requestId: message.id,
          status: 'rejected',
          actionId,
          message: 'Action has been rejected',
          comments
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  private sendMessage(connection: ClientConnection, message: WSMessage): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to ${connection.id}:`, error);
        this.connections.delete(connection.id);
      }
    }
  }

  private sendError(connection: ClientConnection, error: string, details?: string, requestId?: string): void {
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'response',
      data: {
        requestId,
        status: 'error',
        error,
        details
      },
      timestamp: new Date().toISOString()
    });
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30000; // 30 seconds

      this.connections.forEach((connection, id) => {
        const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
        
        if (timeSinceLastActivity > timeout) {
          if (connection.ws.readyState === WebSocket.OPEN) {
            // Send ping
            connection.ws.ping();
          } else {
            // Remove dead connection
            console.log(`🧹 Removing dead connection: ${id}`);
            this.connections.delete(id);
            aguiEventEmitter.removeConnection(id);
          }
        }
      });
    }, 15000); // Check every 15 seconds
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage): void {
    this.connections.forEach(connection => {
      this.sendMessage(connection, message);
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WSMessage): boolean {
    const connection = this.connections.get(clientId);
    if (connection) {
      this.sendMessage(connection, message);
      return true;
    }
    return false;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    authenticatedConnections: number;
  } {
    const total = this.connections.size;
    const authenticated = Array.from(this.connections.values()).filter(c => c.authenticated).length;
    
    return {
      totalConnections: total,
      activeConnections: total,
      authenticatedConnections: authenticated
    };
  }

  /**
   * Close server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      this.wss.close(() => {
        console.log('🔌 AG-UI WebSocket server closed');
        resolve();
      });
    });
  }
}
