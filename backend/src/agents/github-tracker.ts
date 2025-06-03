import { GitHubWebhookPayload } from '../types/okr.js';
import { okrService } from '../services/okr-service.js';

export class GitHubTrackerAgent {
  private logError(operation: string, error: any, context?: any) {
    console.error(`[GITHUB-TRACKER-ERROR] ${operation}:`, {
      error: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private logInfo(operation: string, data?: any) {
    console.log(`[GITHUB-TRACKER-INFO] ${operation}:`, {
      data,
      timestamp: new Date().toISOString()
    });
  }

  async handleWebhook(payload: GitHubWebhookPayload): Promise<void> {
    try {
      this.logInfo('Processing GitHub webhook', {
        action: payload.action,
        repo: payload.repository?.full_name,
        commits: payload.commits?.length || 0
      });

      if (payload.action === 'pushed' && payload.commits && payload.commits.length > 0) {
        await this.handlePushEvent(payload);
      } else {
        this.logInfo('Webhook ignored - not a push event or no commits', { action: payload.action });
      }
    } catch (error) {
      this.logError('handleWebhook', error, { payload });
      throw error;
    }
  }

  private async handlePushEvent(payload: GitHubWebhookPayload): Promise<void> {
    try {
      const repoName = payload.repository.name;
      const fullRepoName = payload.repository.full_name;
      
      this.logInfo('Processing push event', {
        repo: fullRepoName,
        commitCount: payload.commits?.length,
        pusher: payload.pusher.name
      });

      // Find OKRs that are tracking this repository
      const allOKRs = await okrService.getAllOKRs();
      const trackingOKRs = allOKRs.filter(okr => 
        okr.integrations.github?.repo === repoName || 
        okr.integrations.github?.repo === fullRepoName
      );

      if (trackingOKRs.length === 0) {
        this.logInfo('No OKRs tracking this repository', { repo: fullRepoName });
        return;
      }

      this.logInfo('Found OKRs tracking repository', {
        repo: fullRepoName,
        okrCount: trackingOKRs.length,
        okrTitles: trackingOKRs.map(okr => okr.title)
      });

      // Process each tracking OKR
      for (const okr of trackingOKRs) {
        await this.updateOKRFromCommits(okr.id, payload.commits!, okr.integrations.github!);
      }

    } catch (error) {
      this.logError('handlePushEvent', error, { payload });
      throw error;
    }
  }

  private async updateOKRFromCommits(
    okrId: string, 
    commits: GitHubWebhookPayload['commits'], 
    githubConfig: NonNullable<import('../types/okr.js').OKR['integrations']['github']>
  ): Promise<void> {
    try {
      if (!commits) return;

      this.logInfo('Updating OKR from commits', {
        okrId,
        commitCount: commits.length,
        progressWeight: githubConfig.progressWeight
      });

      const okr = await okrService.getOKR(okrId);
      if (!okr) {
        this.logError('updateOKRFromCommits', new Error('OKR not found'), { okrId });
        return;
      }

      // Analyze commits for progress indicators
      const progressAnalysis = this.analyzeCommitsForProgress(commits);
      
      // Calculate progress increase based on commit activity and configuration
      const progressIncrease = this.calculateProgressIncrease(progressAnalysis, githubConfig);
      
      // Update OKR progress
      const newProgress = Math.min(100, okr.progress + progressIncrease);
      
      if (progressIncrease > 0) {
        await okrService.updateProgress(
          okrId,
          newProgress,
          'GITHUB',
          {
            commitSha: commits[0].id,
            commitCount: commits.length,
            reasoning: `GitHub activity detected: ${commits.length} commits with ${progressAnalysis.significantChanges} significant changes`,
            commits: commits.map(c => ({
              sha: c.id,
              message: c.message,
              timestamp: c.timestamp,
              filesChanged: c.added.length + c.modified.length + c.removed.length
            }))
          }
        );

        this.logInfo('OKR progress updated from GitHub activity', {
          okrId,
          oldProgress: okr.progress,
          newProgress,
          progressIncrease,
          commitCount: commits.length
        });
      } else {
        this.logInfo('No progress update - commits did not indicate significant progress', {
          okrId,
          commitCount: commits.length,
          analysis: progressAnalysis
        });
      }

      // Update GitHub integration metadata
      if (okr.integrations.github) {
        okr.integrations.github.lastCommitAt = new Date(commits[0].timestamp);
        okr.integrations.github.commitCount = (okr.integrations.github.commitCount || 0) + commits.length;
      }

    } catch (error) {
      this.logError('updateOKRFromCommits', error, { okrId, commitCount: commits?.length });
    }
  }

  private analyzeCommitsForProgress(commits: NonNullable<GitHubWebhookPayload['commits']>): {
    significantChanges: number;
    featureCommits: number;
    bugfixCommits: number;
    documentationCommits: number;
    totalFilesChanged: number;
    progressIndicators: string[];
  } {
    try {
      let significantChanges = 0;
      let featureCommits = 0;
      let bugfixCommits = 0;
      let documentationCommits = 0;
      let totalFilesChanged = 0;
      const progressIndicators: string[] = [];

      for (const commit of commits) {
        const message = commit.message.toLowerCase();
        const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;
        totalFilesChanged += filesChanged;

        // Count significant changes (more than just config/docs)
        const codeFiles = [...commit.added, ...commit.modified, ...commit.removed]
          .filter(file => this.isSignificantFile(file));
        
        if (codeFiles.length > 0) {
          significantChanges++;
        }

        // Categorize commits by type
        if (this.isFeatureCommit(message)) {
          featureCommits++;
          progressIndicators.push(`Feature: ${commit.message.split('\n')[0]}`);
        } else if (this.isBugfixCommit(message)) {
          bugfixCommits++;
          progressIndicators.push(`Bugfix: ${commit.message.split('\n')[0]}`);
        } else if (this.isDocumentationCommit(message)) {
          documentationCommits++;
        }

        // Special progress keywords
        if (this.hasProgressKeywords(message)) {
          progressIndicators.push(`Progress: ${commit.message.split('\n')[0]}`);
        }
      }

      return {
        significantChanges,
        featureCommits,
        bugfixCommits,
        documentationCommits,
        totalFilesChanged,
        progressIndicators
      };
    } catch (error) {
      this.logError('analyzeCommitsForProgress', error, { commitCount: commits.length });
      return {
        significantChanges: 0,
        featureCommits: 0,
        bugfixCommits: 0,
        documentationCommits: 0,
        totalFilesChanged: 0,
        progressIndicators: []
      };
    }
  }

  private calculateProgressIncrease(
    analysis: ReturnType<typeof this.analyzeCommitsForProgress>,
    githubConfig: NonNullable<import('../types/okr.js').OKR['integrations']['github']>
  ): number {
    try {
      const baseWeight = githubConfig.progressWeight / 100; // Convert to 0-1
      let progressIncrease = 0;

      // Base progress for any significant activity
      if (analysis.significantChanges > 0) {
        progressIncrease += 2 * baseWeight; // 2% base for activity
      }

      // Additional progress for feature work (higher value)
      progressIncrease += analysis.featureCommits * 3 * baseWeight; // 3% per feature commit

      // Additional progress for bug fixes (medium value)
      progressIncrease += analysis.bugfixCommits * 1.5 * baseWeight; // 1.5% per bugfix

      // Bonus for lots of files changed (indicates major work)
      if (analysis.totalFilesChanged > 10) {
        progressIncrease += 2 * baseWeight; // 2% bonus for large changes
      }

      // Bonus for progress keywords in commit messages
      if (analysis.progressIndicators.length > 0) {
        progressIncrease += 1 * baseWeight; // 1% bonus for explicit progress indicators
      }

      // Cap at reasonable daily progress (don't allow >10% from single push)
      progressIncrease = Math.min(progressIncrease, 10);

      this.logInfo('Calculated progress increase', {
        analysis,
        baseWeight,
        progressIncrease,
        reasoning: {
          baseActivity: analysis.significantChanges > 0 ? 2 * baseWeight : 0,
          featureWork: analysis.featureCommits * 3 * baseWeight,
          bugfixWork: analysis.bugfixCommits * 1.5 * baseWeight,
          largeChangesBonus: analysis.totalFilesChanged > 10 ? 2 * baseWeight : 0,
          progressKeywordsBonus: analysis.progressIndicators.length > 0 ? 1 * baseWeight : 0
        }
      });

      return Math.round(progressIncrease * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      this.logError('calculateProgressIncrease', error, { analysis, githubConfig });
      return 0;
    }
  }

  private isSignificantFile(filename: string): boolean {
    const insignificantPatterns = [
      /\.md$/i,           // Markdown files
      /\.txt$/i,          // Text files
      /\.json$/i,         // Config files (package.json, etc.)
      /\.yml$/i,          // YAML configs
      /\.yaml$/i,         // YAML configs
      /\.env/i,           // Environment files
      /\.gitignore$/i,    // Git ignore
      /\.prettierrc/i,    // Prettier config
      /\.eslintrc/i,      // ESLint config
      /LICENSE/i,         // License files
      /README/i           // README files
    ];

    return !insignificantPatterns.some(pattern => pattern.test(filename));
  }

  private isFeatureCommit(message: string): boolean {
    const featureKeywords = [
      'feat:', 'feature:', 'add:', 'implement:', 'new:', 'create:',
      'added', 'implement', 'feature', 'new feature', 'enhancement'
    ];
    return featureKeywords.some(keyword => message.includes(keyword));
  }

  private isBugfixCommit(message: string): boolean {
    const bugfixKeywords = [
      'fix:', 'bug:', 'bugfix:', 'hotfix:', 'patch:',
      'fixed', 'bug', 'issue', 'error', 'problem'
    ];
    return bugfixKeywords.some(keyword => message.includes(keyword));
  }

  private isDocumentationCommit(message: string): boolean {
    const docKeywords = [
      'docs:', 'doc:', 'documentation:', 'readme:',
      'documentation', 'docs', 'comment', 'comments'
    ];
    return docKeywords.some(keyword => message.includes(keyword));
  }

  private hasProgressKeywords(message: string): boolean {
    const progressKeywords = [
      'progress', 'complete', 'done', 'finished', 'ready',
      'milestone', 'achievement', 'deliverable', 'mvp',
      'working', 'functional', 'stable', 'release'
    ];
    return progressKeywords.some(keyword => message.includes(keyword));
  }

  // Method to manually trigger sync for a repository (useful for testing)
  async syncRepository(repoName: string, ownerId?: string): Promise<void> {
    try {
      this.logInfo('Manually syncing repository', { repoName, ownerId });

      // This would typically call GitHub API to get recent commits
      // For now, we'll simulate activity
      const simulatedPayload: GitHubWebhookPayload = {
        action: 'pushed',
        repository: {
          name: repoName,
          full_name: `owner/${repoName}`
        },
        commits: [
          {
            id: 'simulated-commit-id',
            message: 'feat: Add sleep tracking functionality',
            timestamp: new Date().toISOString(),
            author: {
              name: 'Developer',
              email: 'dev@example.com'
            },
            added: ['src/sleep-tracker.ts'],
            modified: ['src/app.ts'],
            removed: []
          }
        ],
        pusher: {
          name: 'Developer',
          email: 'dev@example.com'
        }
      };

      await this.handleWebhook(simulatedPayload);
      this.logInfo('Repository sync completed', { repoName });
    } catch (error) {
      this.logError('syncRepository', error, { repoName, ownerId });
      throw error;
    }
  }
}

export const githubTracker = new GitHubTrackerAgent();