"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubTracker = exports.GitHubTrackerAgent = void 0;
const okr_service_js_1 = require("../services/okr-service.js");
class GitHubTrackerAgent {
    logError(operation, error, context) {
        console.error(`[GITHUB-TRACKER-ERROR] ${operation}:`, {
            error: error.message || error,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }
    logInfo(operation, data) {
        console.log(`[GITHUB-TRACKER-INFO] ${operation}:`, {
            data,
            timestamp: new Date().toISOString()
        });
    }
    async handleWebhook(payload) {
        try {
            this.logInfo('Processing GitHub webhook', {
                action: payload.action,
                repo: payload.repository?.full_name,
                commits: payload.commits?.length || 0
            });
            if (payload.action === 'pushed' && payload.commits && payload.commits.length > 0) {
                await this.handlePushEvent(payload);
            }
            else {
                this.logInfo('Webhook ignored - not a push event or no commits', { action: payload.action });
            }
        }
        catch (error) {
            this.logError('handleWebhook', error, { payload });
            throw error;
        }
    }
    async handlePushEvent(payload) {
        try {
            const repoName = payload.repository.name;
            const fullRepoName = payload.repository.full_name;
            this.logInfo('Processing push event', {
                repo: fullRepoName,
                commitCount: payload.commits?.length,
                pusher: payload.pusher.name
            });
            const allOKRs = await okr_service_js_1.okrService.getAllOKRs();
            const trackingOKRs = allOKRs.filter(okr => okr.integrations.github?.repo === repoName ||
                okr.integrations.github?.repo === fullRepoName);
            if (trackingOKRs.length === 0) {
                this.logInfo('No OKRs tracking this repository', { repo: fullRepoName });
                return;
            }
            this.logInfo('Found OKRs tracking repository', {
                repo: fullRepoName,
                okrCount: trackingOKRs.length,
                okrTitles: trackingOKRs.map(okr => okr.title)
            });
            for (const okr of trackingOKRs) {
                await this.updateOKRFromCommits(okr.id, payload.commits, okr.integrations.github);
            }
        }
        catch (error) {
            this.logError('handlePushEvent', error, { payload });
            throw error;
        }
    }
    async updateOKRFromCommits(okrId, commits, githubConfig) {
        try {
            if (!commits)
                return;
            this.logInfo('Updating OKR from commits', {
                okrId,
                commitCount: commits.length,
                progressWeight: githubConfig.progressWeight
            });
            const okr = await okr_service_js_1.okrService.getOKR(okrId);
            if (!okr) {
                this.logError('updateOKRFromCommits', new Error('OKR not found'), { okrId });
                return;
            }
            const progressAnalysis = this.analyzeCommitsForProgress(commits);
            const progressIncrease = this.calculateProgressIncrease(progressAnalysis, githubConfig);
            const newProgress = Math.min(100, okr.progress + progressIncrease);
            if (progressIncrease > 0) {
                await okr_service_js_1.okrService.updateProgress(okrId, newProgress, 'GITHUB', {
                    commitSha: commits[0].id,
                    commitCount: commits.length,
                    reasoning: `GitHub activity detected: ${commits.length} commits with ${progressAnalysis.significantChanges} significant changes`,
                    commits: commits.map(c => ({
                        sha: c.id,
                        message: c.message,
                        timestamp: c.timestamp,
                        filesChanged: c.added.length + c.modified.length + c.removed.length
                    }))
                });
                this.logInfo('OKR progress updated from GitHub activity', {
                    okrId,
                    oldProgress: okr.progress,
                    newProgress,
                    progressIncrease,
                    commitCount: commits.length
                });
            }
            else {
                this.logInfo('No progress update - commits did not indicate significant progress', {
                    okrId,
                    commitCount: commits.length,
                    analysis: progressAnalysis
                });
            }
            if (okr.integrations.github) {
                okr.integrations.github.lastCommitAt = new Date(commits[0].timestamp);
                okr.integrations.github.commitCount = (okr.integrations.github.commitCount || 0) + commits.length;
            }
        }
        catch (error) {
            this.logError('updateOKRFromCommits', error, { okrId, commitCount: commits?.length });
        }
    }
    analyzeCommitsForProgress(commits) {
        try {
            let significantChanges = 0;
            let featureCommits = 0;
            let bugfixCommits = 0;
            let documentationCommits = 0;
            let totalFilesChanged = 0;
            const progressIndicators = [];
            for (const commit of commits) {
                const message = commit.message.toLowerCase();
                const filesChanged = commit.added.length + commit.modified.length + commit.removed.length;
                totalFilesChanged += filesChanged;
                const codeFiles = [...commit.added, ...commit.modified, ...commit.removed]
                    .filter(file => this.isSignificantFile(file));
                if (codeFiles.length > 0) {
                    significantChanges++;
                }
                if (this.isFeatureCommit(message)) {
                    featureCommits++;
                    progressIndicators.push(`Feature: ${commit.message.split('\n')[0]}`);
                }
                else if (this.isBugfixCommit(message)) {
                    bugfixCommits++;
                    progressIndicators.push(`Bugfix: ${commit.message.split('\n')[0]}`);
                }
                else if (this.isDocumentationCommit(message)) {
                    documentationCommits++;
                }
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
        }
        catch (error) {
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
    calculateProgressIncrease(analysis, githubConfig) {
        try {
            const baseWeight = githubConfig.progressWeight / 100;
            let progressIncrease = 0;
            if (analysis.significantChanges > 0) {
                progressIncrease += 2 * baseWeight;
            }
            progressIncrease += analysis.featureCommits * 3 * baseWeight;
            progressIncrease += analysis.bugfixCommits * 1.5 * baseWeight;
            if (analysis.totalFilesChanged > 10) {
                progressIncrease += 2 * baseWeight;
            }
            if (analysis.progressIndicators.length > 0) {
                progressIncrease += 1 * baseWeight;
            }
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
            return Math.round(progressIncrease * 10) / 10;
        }
        catch (error) {
            this.logError('calculateProgressIncrease', error, { analysis, githubConfig });
            return 0;
        }
    }
    isSignificantFile(filename) {
        const insignificantPatterns = [
            /\.md$/i,
            /\.txt$/i,
            /\.json$/i,
            /\.yml$/i,
            /\.yaml$/i,
            /\.env/i,
            /\.gitignore$/i,
            /\.prettierrc/i,
            /\.eslintrc/i,
            /LICENSE/i,
            /README/i
        ];
        return !insignificantPatterns.some(pattern => pattern.test(filename));
    }
    isFeatureCommit(message) {
        const featureKeywords = [
            'feat:', 'feature:', 'add:', 'implement:', 'new:', 'create:',
            'added', 'implement', 'feature', 'new feature', 'enhancement'
        ];
        return featureKeywords.some(keyword => message.includes(keyword));
    }
    isBugfixCommit(message) {
        const bugfixKeywords = [
            'fix:', 'bug:', 'bugfix:', 'hotfix:', 'patch:',
            'fixed', 'bug', 'issue', 'error', 'problem'
        ];
        return bugfixKeywords.some(keyword => message.includes(keyword));
    }
    isDocumentationCommit(message) {
        const docKeywords = [
            'docs:', 'doc:', 'documentation:', 'readme:',
            'documentation', 'docs', 'comment', 'comments'
        ];
        return docKeywords.some(keyword => message.includes(keyword));
    }
    hasProgressKeywords(message) {
        const progressKeywords = [
            'progress', 'complete', 'done', 'finished', 'ready',
            'milestone', 'achievement', 'deliverable', 'mvp',
            'working', 'functional', 'stable', 'release'
        ];
        return progressKeywords.some(keyword => message.includes(keyword));
    }
    async syncRepository(repoName, ownerId) {
        try {
            this.logInfo('Manually syncing repository', { repoName, ownerId });
            const simulatedPayload = {
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
        }
        catch (error) {
            this.logError('syncRepository', error, { repoName, ownerId });
            throw error;
        }
    }
}
exports.GitHubTrackerAgent = GitHubTrackerAgent;
exports.githubTracker = new GitHubTrackerAgent();
//# sourceMappingURL=github-tracker.js.map