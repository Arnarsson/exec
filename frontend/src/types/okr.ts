export interface OKR {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  autoTracked: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  dueDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  integrations: {
    github?: {
      repo: string;
      progressWeight: number; // 0-100
      lastCommitAt?: string;
      commitCount?: number;
    };
    email?: {
      keywords: string[];
      progressWeight: number;
      lastEmailAt?: string;
      emailCount?: number;
    };
    calendar?: {
      eventTypes: string[];
      progressWeight: number;
      hoursScheduled?: number;
      hoursCompleted?: number;
    };
  };
  ricePriority: {
    reach: number; // 1-10
    impact: number; // 1-10
    confidence: number; // 1-10
    effort: number; // 1-10
    score: number; // calculated
    lastCalculated: string;
    factors?: string[]; // reasons for score adjustments
  };
  tags: string[];
  ownerId: string;
}

export interface OKRProgress {
  okrId: string;
  source: 'MANUAL' | 'GITHUB' | 'EMAIL' | 'CALENDAR' | 'AI';
  previousValue: number;
  newValue: number;
  delta: number;
  timestamp: string;
  details?: {
    commitSha?: string;
    emailSubject?: string;
    eventTitle?: string;
    reasoning?: string;
  };
}

export interface OKRAlert {
  id: string;
  okrId: string;
  type: 'BOTTLENECK' | 'DEADLINE_RISK' | 'PRIORITY_SHIFT' | 'ACHIEVEMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  actionRequired: boolean;
  suggestions: string[];
  createdAt: string;
  acknowledged: boolean;
}

export interface OKRInsight {
  id: string;
  okrId: string;
  type: 'PREDICTION' | 'OPTIMIZATION' | 'TREND' | 'RECOMMENDATION';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  data: Record<string, any>;
  createdAt: string;
}

export interface OKRDashboardData {
  okrs: OKR[];
  totalProgress: number;
  priorityDistribution: Record<string, number>;
  recentAlerts: OKRAlert[];
  upcomingDeadlines: Array<{ okr: OKR; daysUntilDue: number }>;
  insights: OKRInsight[];
  activityTimeline: OKRProgress[];
}

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OKRStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

// Helper type for priority colors
export const priorityColors: Record<PriorityLevel, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

// Helper type for status colors
export const statusColors: Record<OKRStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  BLOCKED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800'
};