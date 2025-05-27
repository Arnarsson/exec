/**
 * Frontend Types - Matching Backend AG-UI Protocol
 */

// AG-UI Event Types (matching backend)
export interface BaseEvent {
  type: string;
  timestamp?: string;
  rawEvent?: any;
}

export interface RunStartedEvent extends BaseEvent {
  type: 'RunStarted';
  threadId: string;
  runId: string;
}

export interface RunFinishedEvent extends BaseEvent {
  type: 'RunFinished';
  threadId: string;
  runId: string;
}

export interface TextMessageStartEvent extends BaseEvent {
  type: 'TextMessageStart';
  messageId: string;
  role: 'assistant' | 'user' | 'system';
}

export interface TextMessageContentEvent extends BaseEvent {
  type: 'TextMessageContent';
  messageId: string;
  delta: string;
}

export interface ToolCallStartEvent extends BaseEvent {
  type: 'ToolCallStart';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface StateSnapshotEvent extends BaseEvent {
  type: 'StateSnapshot';
  snapshot: any;
}

export type AGUIEvent = 
  | RunStartedEvent
  | RunFinishedEvent 
  | TextMessageStartEvent
  | TextMessageContentEvent
  | ToolCallStartEvent
  | StateSnapshotEvent;

// Executive State Types (matching backend)
export interface ExecutiveProfile {
  name: string;
  email: string;
  timezone: string;
  preferences: {
    workingHours: { start: string; end: string };
    communicationStyle: 'formal' | 'casual' | 'direct' | 'professional';
    priorityLevel: 'high' | 'medium' | 'low';
    autoApprovalLimits: {
      calendar: boolean;
      email: boolean;
      documents: boolean;
    };
  };
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface UrgentItem {
  id: string;
  type: 'meeting' | 'email' | 'task' | 'decision';
  description: string;
  deadline?: string;
}

export interface PendingDecision {
  id: string;
  description: string;
  options: string[];
  deadline?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CalendarAccount {
  id: string;
  type: 'google' | 'outlook' | 'apple';
  email: string;
  connected: boolean;
}

export interface EmailAccount {
  id: string;
  type: 'gmail' | 'outlook' | 'apple';
  email: string;
  connected: boolean;
}

export interface ConnectedTool {
  id: string;
  name: string;
  type: string;
  connected: boolean;
}

export interface ExecutiveState {
  profile: ExecutiveProfile;
  activeContexts: {
    currentProjects: Project[];
    urgentItems: UrgentItem[];
    pendingDecisions: PendingDecision[];
  };
  integrations: {
    calendarAccounts: CalendarAccount[];
    emailAccounts: EmailAccount[];
    connectedTools: ConnectedTool[];
  };
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  conflictingEvents?: string[];
}

// Email Types
export interface EmailSummary {
  totalEmails: number;
  unreadCount: number;
  importantCount: number;
  categories: {
    name: string;
    count: number;
  }[];
}

export interface EmailDraft {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  replyToId?: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ServerStats {
  totalConnections: number;
  activeRuns: number;
  uptime: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    webSocket: string;
    connections: number;
  };
}

// WebSocket Message Types
export interface WSMessage {
  id: string;
  type: 'event' | 'request' | 'response';
  data: AGUIEvent | any;
  timestamp: string;
}

// UI State Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    toolCalls?: string[];
    attachments?: string[];
    priority?: 'high' | 'medium' | 'low';
    category?: 'calendar' | 'email' | 'research' | 'general';
  };
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Form Types
export interface MeetingForm {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendees: string[];
  location?: string;
  description?: string;
  timeZone: string;
}

export interface TaskForm {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  assignees?: string[];
}

export interface EmailForm {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  priority?: 'high' | 'medium' | 'low';
  scheduledSend?: string;
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: 'calendar' | 'email' | 'tasks' | 'metrics' | 'notifications';
  title: string;
  size: 'small' | 'medium' | 'large';
  data: any;
  refreshInterval?: number;
}

// Theme and Preferences
export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    calendar: boolean;
    tasks: boolean;
    system: boolean;
  };
  dashboard: {
    layout: DashboardWidget[];
    compactMode: boolean;
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: string;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string | number;
  subItems?: NavigationItem[];
}
