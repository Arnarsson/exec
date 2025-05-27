/**
 * Executive Assistant Agent Orchestrator
 * Main coordination layer for all executive assistant operations
 */

import { CalendarAgent } from './calendar-agent';
import { EmailAgent } from './email-agent';
import { AGUIStream, createAGUIStream } from '@/events/stream';
import { ExecutiveState } from '../types/ag-ui';

export interface AgentRequest {
  id: string;
  type: 'chat' | 'calendar' | 'email' | 'research' | 'task';
  content: string;
  metadata?: {
    threadId?: string;
    userId?: string;
    context?: any;
  };
}

export interface AgentResponse {
  id: string;
  type: 'text' | 'action' | 'approval_required' | 'error';
  content: string;
  data?: any;
  followUpActions?: string[];
}

export class ExecutiveAssistantOrchestrator {
  private calendarAgent?: CalendarAgent;
  private emailAgent?: EmailAgent;
  private stream: AGUIStream;
  private executiveState: ExecutiveState;

  constructor(credentials?: any) {
    this.stream = createAGUIStream();
    this.executiveState = this.getDefaultExecutiveState();

    // Initialize agents if credentials provided
    if (credentials?.google) {
      this.calendarAgent = new CalendarAgent(credentials.google, this.stream);
      this.emailAgent = new EmailAgent(credentials.google, this.stream);
    }
  }

  /**
   * Process an incoming request
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      // Start new run for this request
      this.stream.startRun();

      // Send initial state snapshot
      this.stream.sendStateSnapshot(this.executiveState);

      // Determine intent and route to appropriate handler
      const intent = this.classifyIntent(request.content);
      
      let response: AgentResponse;

      switch (intent.type) {
        case 'calendar':
          response = await this.handleCalendarRequest(request, intent);
          break;
        case 'email':
          response = await this.handleEmailRequest(request, intent);
          break;
        case 'chat':
          response = await this.handleChatRequest(request, intent);
          break;
        case 'task':
          response = await this.handleTaskRequest(request, intent);
          break;
        default:
          response = await this.handleUnknownRequest(request);
      }

      // Update state if needed
      await this.updateExecutiveState(intent, response);

      // Finish run
      this.stream.finishRun();

      return response;
    } catch (error) {
      console.error('Error processing request:', error);
      this.stream.errorRun(`Failed to process request: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        id: request.id,
        type: 'error',
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Handle calendar-related requests
   */
  private async handleCalendarRequest(request: AgentRequest, intent: any): Promise<AgentResponse> {
    if (!this.calendarAgent) {
      return {
        id: request.id,
        type: 'error',
        content: 'Calendar integration is not configured. Please connect your calendar account.'
      };
    }

    this.stream.startStep('processing_calendar_request');

    try {
      switch (intent.action) {
        case 'check_availability':
          const availability = await this.calendarAgent.checkAvailability(
            intent.params.startTime,
            intent.params.endTime,
            intent.params.timeZone
          );
          
          return {
            id: request.id,
            type: 'text',
            content: `Found ${availability.filter(slot => slot.available).length} available slots.`,
            data: { availability }
          };

        case 'schedule_meeting':
          const scheduledEvent = await this.calendarAgent.scheduleMeeting({
            summary: intent.params.title,
            start: {
              dateTime: intent.params.startTime,
              timeZone: intent.params.timeZone || 'UTC'
            },
            end: {
              dateTime: intent.params.endTime,
              timeZone: intent.params.timeZone || 'UTC'
            },
            attendees: intent.params.attendees || [],
            description: intent.params.description,
            location: intent.params.location
          });

          return {
            id: request.id,
            type: 'action',
            content: `Meeting "${scheduledEvent.summary}" scheduled successfully.`,
            data: { event: scheduledEvent }
          };

        case 'get_agenda':
          const agenda = await this.calendarAgent.getTodaysAgenda();
          
          return {
            id: request.id,
            type: 'text',
            content: `Retrieved agenda with ${agenda.length} events.`,
            data: { agenda }
          };

        case 'find_meeting_time':
          const optimalTimes = await this.calendarAgent.findOptimalMeetingTime(
            intent.params.attendees,
            intent.params.duration,
            intent.params.preferredStartHour,
            intent.params.preferredEndHour
          );

          return {
            id: request.id,
            type: 'text',
            content: `Found ${optimalTimes.length} optimal meeting times.`,
            data: { optimalTimes }
          };

        default:
          return await this.handleGenericCalendarRequest(request);
      }
    } finally {
      this.stream.finishStep('processing_calendar_request');
    }
  }

  /**
   * Handle email-related requests
   */
  private async handleEmailRequest(request: AgentRequest, intent: any): Promise<AgentResponse> {
    if (!this.emailAgent) {
      return {
        id: request.id,
        type: 'error',
        content: 'Email integration is not configured. Please connect your email account.'
      };
    }

    this.stream.startStep('processing_email_request');

    try {
      switch (intent.action) {
        case 'summarize_emails':
          const summary = await this.emailAgent.summarizeEmails(
            intent.params.maxResults,
            intent.params.query
          );
          
          return {
            id: request.id,
            type: 'text',
            content: `Email summary complete with ${summary.totalEmails} emails analyzed.`,
            data: { summary }
          };

        case 'draft_response':
          const draft = await this.emailAgent.draftResponse(
            intent.params.emailId,
            intent.params.responseType,
            intent.params.instructions
          );

          return {
            id: request.id,
            type: 'approval_required',
            content: 'Email draft created and ready for your review.',
            data: { draft },
            followUpActions: ['approve_draft', 'edit_draft', 'cancel_draft']
          };

        case 'prioritize_inbox':
          const prioritized = await this.emailAgent.prioritizeInbox();
          
          return {
            id: request.id,
            type: 'text',
            content: 'Inbox prioritization complete.',
            data: { prioritized }
          };

        case 'send_email':
          if (intent.params.draft) {
            const messageId = await this.emailAgent.sendEmail(intent.params.draft);
            
            return {
              id: request.id,
              type: 'action',
              content: 'Email sent successfully.',
              data: { messageId }
            };
          }
          break;

        default:
          return await this.handleGenericEmailRequest(request);
      }
    } finally {
      this.stream.finishStep('processing_email_request');
    }

    return {
      id: request.id,
      type: 'error',
      content: 'Could not process email request.'
    };
  }

  /**
   * Handle general chat requests
   */
  private async handleChatRequest(request: AgentRequest, intent: any): Promise<AgentResponse> {
    this.stream.startStep('processing_chat_request');

    try {
      // Generate contextual response based on executive state
      const response = await this.generateContextualResponse(request.content);
      
      await this.stream.streamMessage(response, 'assistant');

      return {
        id: request.id,
        type: 'text',
        content: response
      };
    } finally {
      this.stream.finishStep('processing_chat_request');
    }
  }

  /**
   * Handle task management requests
   */
  private async handleTaskRequest(request: AgentRequest, intent: any): Promise<AgentResponse> {
    this.stream.startStep('processing_task_request');

    try {
      switch (intent.action) {
        case 'create_task':
          // Add to executive state
          const newTask = {
            id: `task_${Date.now()}`,
            name: intent.params.title,
            status: 'active' as const,
            priority: intent.params.priority || 'medium' as const
          };

          this.executiveState.activeContexts.currentProjects.push(newTask);
          
          // Send state delta
          this.stream.sendStateDelta([{
            op: 'add',
            path: '/activeContexts/currentProjects/-',
            value: newTask
          }]);

          return {
            id: request.id,
            type: 'action',
            content: `Task "${newTask.name}" created successfully.`,
            data: { task: newTask }
          };

        case 'list_tasks':
          const tasks = this.executiveState.activeContexts.currentProjects;
          
          return {
            id: request.id,
            type: 'text',
            content: `You have ${tasks.length} active projects.`,
            data: { tasks }
          };

        default:
          return {
            id: request.id,
            type: 'text',
            content: 'Task management feature coming soon.'
          };
      }
    } finally {
      this.stream.finishStep('processing_task_request');
    }
  }

  /**
   * Handle unknown requests
   */
  private async handleUnknownRequest(request: AgentRequest): Promise<AgentResponse> {
    await this.stream.streamMessage(
      "I'm not sure how to help with that request. I can assist you with:\n\n" +
      "📅 **Calendar**: Schedule meetings, check availability, get agenda\n" +
      "📧 **Email**: Summarize inbox, draft responses, prioritize messages\n" +
      "💬 **Chat**: Answer questions and have conversations\n" +
      "📋 **Tasks**: Create and manage your projects\n\n" +
      "What would you like me to help you with?",
      'assistant'
    );

    return {
      id: request.id,
      type: 'text',
      content: 'I can help with calendar, email, chat, and task management. What would you like to do?'
    };
  }

  /**
   * Classify user intent
   */
  private classifyIntent(content: string): any {
    const lowerContent = content.toLowerCase();

    // Calendar intents
    if (lowerContent.includes('schedule') || lowerContent.includes('meeting') || lowerContent.includes('calendar')) {
      if (lowerContent.includes('schedule') && lowerContent.includes('meeting')) {
        return {
          type: 'calendar',
          action: 'schedule_meeting',
          params: this.extractMeetingParams(content)
        };
      }
      if (lowerContent.includes('availability') || lowerContent.includes('free time')) {
        return {
          type: 'calendar',
          action: 'check_availability',
          params: this.extractTimeParams(content)
        };
      }
      if (lowerContent.includes('agenda') || lowerContent.includes('today')) {
        return {
          type: 'calendar',
          action: 'get_agenda',
          params: {}
        };
      }
      if (lowerContent.includes('find time') || lowerContent.includes('best time')) {
        return {
          type: 'calendar',
          action: 'find_meeting_time',
          params: this.extractOptimalTimeParams(content)
        };
      }
    }

    // Email intents
    if (lowerContent.includes('email') || lowerContent.includes('inbox') || lowerContent.includes('message')) {
      if (lowerContent.includes('summarize') || lowerContent.includes('summary')) {
        return {
          type: 'email',
          action: 'summarize_emails',
          params: { maxResults: 50, query: 'is:unread OR is:important' }
        };
      }
      if (lowerContent.includes('draft') || lowerContent.includes('reply') || lowerContent.includes('respond')) {
        return {
          type: 'email',
          action: 'draft_response',
          params: this.extractEmailParams(content)
        };
      }
      if (lowerContent.includes('prioritize') || lowerContent.includes('important')) {
        return {
          type: 'email',
          action: 'prioritize_inbox',
          params: {}
        };
      }
    }

    // Task intents
    if (lowerContent.includes('task') || lowerContent.includes('project') || lowerContent.includes('todo')) {
      if (lowerContent.includes('create') || lowerContent.includes('add') || lowerContent.includes('new')) {
        return {
          type: 'task',
          action: 'create_task',
          params: this.extractTaskParams(content)
        };
      }
      if (lowerContent.includes('list') || lowerContent.includes('show')) {
        return {
          type: 'task',
          action: 'list_tasks',
          params: {}
        };
      }
    }

    // Default to chat
    return {
      type: 'chat',
      action: 'respond',
      params: { content }
    };
  }

  // Helper methods for parameter extraction
  private extractMeetingParams(content: string): any {
    // Simple parameter extraction - would be more sophisticated in production
    return {
      title: 'Meeting',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 hour
      timeZone: 'UTC',
      attendees: [],
      description: content
    };
  }

  private extractTimeParams(content: string): any {
    return {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
      timeZone: 'UTC'
    };
  }

  private extractOptimalTimeParams(content: string): any {
    return {
      attendees: [],
      duration: 60,
      preferredStartHour: 9,
      preferredEndHour: 17
    };
  }

  private extractEmailParams(content: string): any {
    return {
      emailId: 'sample_email_id',
      responseType: 'reply',
      instructions: content
    };
  }

  private extractTaskParams(content: string): any {
    return {
      title: content.replace(/create|add|new|task|project/gi, '').trim() || 'New Task',
      priority: 'medium'
    };
  }

  private async generateContextualResponse(content: string): Promise<string> {
    // Simple contextual response generation
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
    const lowerContent = content.toLowerCase();

    if (greetings.some(greeting => lowerContent.includes(greeting))) {
      const urgentCount = this.executiveState.activeContexts.urgentItems.length;
      const projectCount = this.executiveState.activeContexts.currentProjects.length;
      
      return `Hello! I'm your Executive Assistant. Here's your quick status:

📊 **Today's Overview**
• ${urgentCount} urgent items requiring attention
• ${projectCount} active projects
• Ready to help with calendar, email, and task management

What would you like me to help you with today?`;
    }

    if (lowerContent.includes('status') || lowerContent.includes('update')) {
      return this.generateStatusUpdate();
    }

    return "I'm here to help you with your executive tasks. I can manage your calendar, handle emails, and help with project coordination. What would you like me to do?";
  }

  private generateStatusUpdate(): string {
    const urgent = this.executiveState.activeContexts.urgentItems.length;
    const projects = this.executiveState.activeContexts.currentProjects.length;
    const decisions = this.executiveState.activeContexts.pendingDecisions.length;

    return `📊 **Executive Status Update**

🔴 **Urgent Items**: ${urgent}
📋 **Active Projects**: ${projects}
❓ **Pending Decisions**: ${decisions}

📅 **Connected Accounts**
• Calendar: ${this.executiveState.integrations.calendarAccounts.filter(a => a.connected).length} account(s)
• Email: ${this.executiveState.integrations.emailAccounts.filter(a => a.connected).length} account(s)

Everything is running smoothly. How can I assist you?`;
  }

  private async handleGenericCalendarRequest(request: AgentRequest): Promise<AgentResponse> {
    await this.stream.streamMessage(
      "I can help you with calendar management. Try asking me to:\n\n" +
      "• 'Check my availability tomorrow'\n" +
      "• 'Schedule a meeting with [person] next week'\n" +
      "• 'Show me today's agenda'\n" +
      "• 'Find the best time for a meeting with [attendees]'",
      'assistant'
    );

    return {
      id: request.id,
      type: 'text',
      content: 'I can help with calendar management. What would you like me to do?'
    };
  }

  private async handleGenericEmailRequest(request: AgentRequest): Promise<AgentResponse> {
    await this.stream.streamMessage(
      "I can help you manage your email. Try asking me to:\n\n" +
      "• 'Summarize my inbox'\n" +
      "• 'Draft a reply to [email]'\n" +
      "• 'Prioritize my emails'\n" +
      "• 'Send an email to [recipient]'",
      'assistant'
    );

    return {
      id: request.id,
      type: 'text',
      content: 'I can help with email management. What would you like me to do?'
    };
  }

  private async updateExecutiveState(intent: any, response: AgentResponse): Promise<void> {
    // Update state based on completed actions
    if (response.type === 'action' && response.data) {
      // Send state delta for successful actions
      this.stream.sendStateDelta([{
        op: 'add',
        path: '/lastAction',
        value: {
          timestamp: new Date().toISOString(),
          type: intent.type,
          action: intent.action,
          success: true
        }
      }]);
    }
  }

  private getDefaultExecutiveState(): ExecutiveState {
    return {
      profile: {
        name: 'Executive User',
        email: 'executive@company.com',
        timezone: 'UTC',
        preferences: {
          workingHours: { start: '09:00', end: '17:00' },
          communicationStyle: 'formal',
          priorityLevel: 'high',
          autoApprovalLimits: {
            calendar: false,
            email: false,
            documents: false
          }
        }
      },
      activeContexts: {
        currentProjects: [],
        urgentItems: [],
        pendingDecisions: []
      },
      integrations: {
        calendarAccounts: [],
        emailAccounts: [],
        connectedTools: []
      }
    };
  }

  /**
   * Get current executive state
   */
  getExecutiveState(): ExecutiveState {
    return this.executiveState;
  }

  /**
   * Update executive state
   */
  updateState(updates: Partial<ExecutiveState>): void {
    this.executiveState = { ...this.executiveState, ...updates };
    this.stream.sendStateSnapshot(this.executiveState);
  }

  /**
   * Get AG-UI stream for external use
   */
  getStream(): AGUIStream {
    return this.stream;
  }
}
