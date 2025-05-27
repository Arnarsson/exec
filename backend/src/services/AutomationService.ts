// Using AGUIWebSocketServer instead of WebSocketService for broadcasting
type WebSocketBroadcaster = {
  broadcast: (message: any) => void;
};

export interface AutomationData {
  workflow: string;
  data: any;
  timestamp: string;
}

export class AutomationService {
  private wsService: WebSocketBroadcaster;

  constructor(wsService: WebSocketBroadcaster) {
    this.wsService = wsService;
  }

  async processAutomation(automation: AutomationData): Promise<void> {
    console.log(`🤖 Processing automation: ${automation.workflow}`);
    
    try {
      switch (automation.workflow) {
        case 'email-intelligence':
          await this.handleEmailIntelligence(automation.data);
          break;
        case 'calendar-prep':
          await this.handleCalendarPrep(automation.data);
          break;
        case 'task-automation':
          await this.handleTaskAutomation(automation.data);
          break;
        default:
          console.log(`❓ Unknown workflow: ${automation.workflow}`);
      }

      // Send success notification via WebSocket
      this.wsService.broadcast({
        type: 'automation_success',
        workflow: automation.workflow,
        timestamp: new Date().toISOString(),
        data: automation.data
      });

    } catch (error) {
      console.error(`❌ Automation failed: ${automation.workflow}`, error);
      
      this.wsService.broadcast({
        type: 'automation_error',
        workflow: automation.workflow,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleEmailIntelligence(data: any): Promise<void> {
    console.log('🧠 Processing email intelligence:', data);
    
    // Create tasks from action items
    if (data.action_items && data.action_items.length > 0) {
      for (const actionItem of data.action_items) {
        console.log(`📋 Creating task: ${actionItem}`);
        // Here you would integrate with your task system
      }
    }
    
    // Update dashboard metrics
    this.wsService.broadcast({
      type: 'email_processed',
      data: {
        sender: data.sender,
        subject: data.subject,
        priority: data.priority,
        action_items_count: data.action_items?.length || 0,
        sentiment: data.sentiment
      }
    });
  }

  private async handleCalendarPrep(data: any): Promise<void> {
    console.log('📅 Processing calendar preparation:', data);
    
    if (data.meeting_preparations) {
      for (const prep of data.meeting_preparations) {
        console.log(`📝 Meeting prep for: ${prep.title}`);
        // Create preparation tasks
        for (const task of prep.prep_tasks || []) {
          console.log(`📋 Prep task: ${task}`);
        }
      }
    }
    
    this.wsService.broadcast({
      type: 'meeting_prepared',
      data: {
        meetings_count: data.meeting_preparations?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async handleTaskAutomation(data: any): Promise<void> {
    console.log('✅ Processing task automation:', data);
    
    if (data.optimized_tasks) {
      for (const task of data.optimized_tasks) {
        console.log(`📋 Optimized task: ${task.title} (Priority: ${task.priority})`);
      }
    }
    
    this.wsService.broadcast({
      type: 'tasks_automated',
      data: {
        tasks_processed: data.optimized_tasks?.length || 0,
        priority_adjustments: data.priority_adjustments?.length || 0
      }
    });
  }

  async getAutomationStatus(): Promise<any> {
    return {
      n8n_connected: await this.checkN8nConnection(),
      active_workflows: [
        'email-intelligence',
        'calendar-prep',
        'task-automation'
      ],
      last_execution: new Date().toISOString(),
      metrics: {
        emails_processed_today: 0,
        tasks_created_today: 0,
        meetings_prepared_today: 0,
        automations_successful: 0,
        automations_failed: 0
      }
    };
  }

  private async checkN8nConnection(): Promise<boolean> {
    try {
      // Check remote n8n instance
      const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.aigrowthadvisors.cc';
      const response = await fetch(`${n8nUrl}/healthz`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}