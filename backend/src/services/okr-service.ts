import { v4 as uuidv4 } from 'uuid';
import { OKR, OKRProgress, OKRAlert, OKRInsight, OKRDashboardData } from '../types/okr.js';

// In-memory storage for MVP (replace with actual DB later)
const okrs: Map<string, OKR> = new Map();
const progressHistory: Map<string, OKRProgress[]> = new Map();
const alerts: Map<string, OKRAlert[]> = new Map();
const insights: Map<string, OKRInsight[]> = new Map();

export class OKRService {
  private logError(operation: string, error: any, context?: any) {
    console.error(`[OKR-SERVICE-ERROR] ${operation}:`, {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private logInfo(operation: string, data?: any) {
    console.log(`[OKR-SERVICE-INFO] ${operation}:`, {
      data,
      timestamp: new Date().toISOString()
    });
  }

  async createOKR(okrData: Partial<OKR>): Promise<OKR> {
    try {
      this.logInfo('Creating new OKR', { title: okrData.title });

      const okr: OKR = {
        id: uuidv4(),
        title: okrData.title || 'Untitled OKR',
        description: okrData.description || '',
        progress: 0,
        autoTracked: okrData.autoTracked || false,
        priority: okrData.priority || 'MEDIUM',
        status: 'NOT_STARTED',
        dueDate: okrData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        createdAt: new Date(),
        updatedAt: new Date(),
        integrations: okrData.integrations || {},
        ricePriority: {
          reach: okrData.ricePriority?.reach || 5,
          impact: okrData.ricePriority?.impact || 5,
          confidence: okrData.ricePriority?.confidence || 5,
          effort: okrData.ricePriority?.effort || 5,
          score: 0,
          lastCalculated: new Date(),
          factors: []
        },
        tags: okrData.tags || [],
        ownerId: okrData.ownerId || 'default-user',
        ...okrData
      };

      // Calculate initial RICE score
      okr.ricePriority = this.calculateRICEScore(okr);

      okrs.set(okr.id, okr);
      progressHistory.set(okr.id, []);
      alerts.set(okr.id, []);
      insights.set(okr.id, []);

      this.logInfo('OKR created successfully', { id: okr.id, title: okr.title });
      return okr;
    } catch (error) {
      this.logError('createOKR', error, okrData);
      throw error;
    }
  }

  async getOKR(id: string): Promise<OKR | null> {
    try {
      const okr = okrs.get(id) || null;
      this.logInfo('Retrieved OKR', { id, found: !!okr });
      return okr;
    } catch (error) {
      this.logError('getOKR', error, { id });
      return null;
    }
  }

  async getAllOKRs(ownerId?: string): Promise<OKR[]> {
    try {
      const allOKRs = Array.from(okrs.values());
      const filtered = ownerId ? allOKRs.filter(okr => okr.ownerId === ownerId) : allOKRs;
      this.logInfo('Retrieved all OKRs', { count: filtered.length, ownerId });
      return filtered;
    } catch (error) {
      this.logError('getAllOKRs', error, { ownerId });
      return [];
    }
  }

  async updateProgress(okrId: string, newProgress: number, source: OKRProgress['source'], details?: any): Promise<OKRProgress> {
    try {
      this.logInfo('Updating OKR progress', { okrId, newProgress, source });

      const okr = okrs.get(okrId);
      if (!okr) {
        throw new Error(`OKR not found: ${okrId}`);
      }

      const previousProgress = okr.progress;
      const delta = newProgress - previousProgress;

      const progressEntry: OKRProgress = {
        okrId,
        source,
        previousValue: previousProgress,
        newValue: newProgress,
        delta,
        timestamp: new Date(),
        details
      };

      // Update OKR
      okr.progress = Math.max(0, Math.min(100, newProgress));
      okr.updatedAt = new Date();
      
      // Update status based on progress
      if (okr.progress === 0) {
        okr.status = 'NOT_STARTED';
      } else if (okr.progress === 100) {
        okr.status = 'COMPLETED';
      } else {
        okr.status = okr.status === 'BLOCKED' ? 'BLOCKED' : 'IN_PROGRESS';
      }

      okrs.set(okrId, okr);

      // Add to progress history
      const history = progressHistory.get(okrId) || [];
      history.push(progressEntry);
      progressHistory.set(okrId, history);

      // Check for alerts
      this.generateProgressAlerts(okr, delta);

      this.logInfo('Progress updated successfully', { 
        okrId, 
        previousProgress, 
        newProgress: okr.progress, 
        delta,
        status: okr.status 
      });

      return progressEntry;
    } catch (error) {
      this.logError('updateProgress', error, { okrId, newProgress, source });
      throw error;
    }
  }

  calculateRICEScore(okr: OKR): OKR['ricePriority'] {
    try {
      const { reach, impact, confidence, effort } = okr.ricePriority;
      
      // Basic RICE calculation: (Reach × Impact × Confidence) / Effort
      let score = (reach * impact * confidence) / effort;
      
      const factors: string[] = [];

      // AI-powered adjustments based on current state
      if (okr.progress < 10 && this.getDaysUntilDue(okr) < 7) {
        score *= 1.5; // Boost urgency for delayed tasks near deadline
        factors.push('Urgency boost: Task behind schedule with near deadline');
      }

      if (okr.autoTracked && okr.integrations.github?.commitCount === 0) {
        score *= 0.8; // Reduce score if no activity detected
        factors.push('Activity penalty: No recent commits detected');
      }

      if (okr.status === 'BLOCKED') {
        score *= 0.6; // Reduce score for blocked items
        factors.push('Blocked status penalty');
      }

      return {
        ...okr.ricePriority,
        score: Math.round(score * 10) / 10,
        lastCalculated: new Date(),
        factors
      };
    } catch (error) {
      this.logError('calculateRICEScore', error, { okrId: okr.id });
      return okr.ricePriority;
    }
  }

  private getDaysUntilDue(okr: OKR): number {
    const now = new Date();
    const dueDate = new Date(okr.dueDate);
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private generateProgressAlerts(okr: OKR, delta: number): void {
    try {
      const existingAlerts = alerts.get(okr.id) || [];
      const daysUntilDue = this.getDaysUntilDue(okr);

      // Achievement alert
      if (okr.progress >= 100) {
        existingAlerts.push({
          id: uuidv4(),
          okrId: okr.id,
          type: 'ACHIEVEMENT',
          severity: 'LOW',
          message: `🎉 OKR "${okr.title}" completed!`,
          actionRequired: false,
          suggestions: ['Celebrate the achievement!', 'Consider setting a new stretch goal'],
          createdAt: new Date(),
          acknowledged: false
        });
      }

      // Deadline risk alert
      if (daysUntilDue <= 7 && okr.progress < 70) {
        existingAlerts.push({
          id: uuidv4(),
          okrId: okr.id,
          type: 'DEADLINE_RISK',
          severity: 'HIGH',
          message: `⚠️ OKR "${okr.title}" at risk - ${daysUntilDue} days left, ${okr.progress}% complete`,
          actionRequired: true,
          suggestions: [
            'Focus additional resources on this OKR',
            'Consider scope reduction or deadline extension',
            'Schedule dedicated time blocks'
          ],
          createdAt: new Date(),
          acknowledged: false
        });
      }

      // Stagnation alert (no progress in auto-tracked items)
      if (okr.autoTracked && delta === 0 && okr.progress > 0 && okr.progress < 100) {
        const lastProgress = progressHistory.get(okr.id)?.slice(-5) || [];
        const noRecentProgress = lastProgress.every(p => p.delta === 0);
        
        if (noRecentProgress && lastProgress.length >= 3) {
          existingAlerts.push({
            id: uuidv4(),
            okrId: okr.id,
            type: 'BOTTLENECK',
            severity: 'MEDIUM',
            message: `🚧 No recent progress detected on "${okr.title}"`,
            actionRequired: true,
            suggestions: [
              'Check for blockers in GitHub/email',
              'Schedule focused work session',
              'Consider breaking down into smaller tasks'
            ],
            createdAt: new Date(),
            acknowledged: false
          });
        }
      }

      alerts.set(okr.id, existingAlerts);
      this.logInfo('Generated progress alerts', { okrId: okr.id, alertCount: existingAlerts.length });
    } catch (error) {
      this.logError('generateProgressAlerts', error, { okrId: okr.id });
    }
  }

  async getDashboardData(ownerId?: string): Promise<OKRDashboardData> {
    try {
      this.logInfo('Generating dashboard data', { ownerId });

      const allOKRs = await this.getAllOKRs(ownerId);
      
      // Recalculate RICE scores for all OKRs
      const updatedOKRs = allOKRs.map(okr => ({
        ...okr,
        ricePriority: this.calculateRICEScore(okr)
      }));

      // Sort by RICE score (highest first)
      updatedOKRs.sort((a, b) => b.ricePriority.score - a.ricePriority.score);

      const totalProgress = updatedOKRs.length > 0 
        ? Math.round(updatedOKRs.reduce((sum, okr) => sum + okr.progress, 0) / updatedOKRs.length)
        : 0;

      const priorityDistribution = updatedOKRs.reduce((dist, okr) => {
        dist[okr.priority] = (dist[okr.priority] || 0) + 1;
        return dist;
      }, {} as Record<string, number>);

      const recentAlerts: OKRAlert[] = [];
      const allInsights: OKRInsight[] = [];
      const activityTimeline: OKRProgress[] = [];

      updatedOKRs.forEach(okr => {
        const okrAlerts = alerts.get(okr.id) || [];
        recentAlerts.push(...okrAlerts.slice(-3)); // Last 3 alerts per OKR

        const okrInsights = insights.get(okr.id) || [];
        allInsights.push(...okrInsights);

        const okrProgress = progressHistory.get(okr.id) || [];
        activityTimeline.push(...okrProgress.slice(-5)); // Last 5 progress updates per OKR
      });

      // Sort by recency
      recentAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      activityTimeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const upcomingDeadlines = updatedOKRs
        .map(okr => ({ okr, daysUntilDue: this.getDaysUntilDue(okr) }))
        .filter(item => item.daysUntilDue > 0 && item.daysUntilDue <= 30)
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      const dashboardData: OKRDashboardData = {
        okrs: updatedOKRs,
        totalProgress,
        priorityDistribution,
        recentAlerts: recentAlerts.slice(0, 10),
        upcomingDeadlines: upcomingDeadlines.slice(0, 5),
        insights: allInsights.slice(0, 10),
        activityTimeline: activityTimeline.slice(0, 20)
      };

      this.logInfo('Dashboard data generated successfully', {
        okrCount: updatedOKRs.length,
        totalProgress,
        alertCount: recentAlerts.length,
        upcomingDeadlineCount: upcomingDeadlines.length
      });

      return dashboardData;
    } catch (error) {
      this.logError('getDashboardData', error, { ownerId });
      throw error;
    }
  }

  async generateInitialData(): Promise<void> {
    try {
      this.logInfo('Generating initial demo OKRs');

      // Create DOZY OKR
      await this.createOKR({
        title: 'Launch DOZY Sleep Tracker',
        description: 'Complete development and launch of the DOZY sleep tracking application',
        progress: 35,
        autoTracked: true,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        integrations: {
          github: {
            repo: 'dozy-sleep-tracker',
            progressWeight: 80
          }
        },
        ricePriority: {
          reach: 8,
          impact: 9,
          confidence: 7,
          effort: 6,
          score: 0,
          lastCalculated: new Date()
        },
        tags: ['product', 'development', 'mobile'],
        ownerId: 'demo-user'
      });

      // Create VMS Revenue OKR
      await this.createOKR({
        title: 'Achieve VMS 30K Revenue',
        description: 'Close VMS contract negotiations and secure 30K revenue target',
        progress: 65,
        autoTracked: true,
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
        integrations: {
          email: {
            keywords: ['VMS', 'Thomas', 'contract', 'revenue'],
            progressWeight: 60
          },
          calendar: {
            eventTypes: ['VMS meeting', 'client call'],
            progressWeight: 40
          }
        },
        ricePriority: {
          reach: 9,
          impact: 10,
          confidence: 8,
          effort: 4,
          score: 0,
          lastCalculated: new Date()
        },
        tags: ['revenue', 'client', 'business'],
        ownerId: 'demo-user'
      });

      // Create HARKA Scaling OKR
      await this.createOKR({
        title: 'Scale HARKA Workshop Operations',
        description: 'Expand HARKA workshop capacity and secure additional contracts',
        progress: 25,
        autoTracked: true,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 6 weeks
        integrations: {
          email: {
            keywords: ['HARKA', 'workshop', 'scaling', 'capacity'],
            progressWeight: 70
          }
        },
        ricePriority: {
          reach: 7,
          impact: 8,
          confidence: 6,
          effort: 7,
          score: 0,
          lastCalculated: new Date()
        },
        tags: ['business', 'scaling', 'operations'],
        ownerId: 'demo-user'
      });

      this.logInfo('Initial demo data created successfully');
    } catch (error) {
      this.logError('generateInitialData', error);
      throw error;
    }
  }
}

export const okrService = new OKRService();