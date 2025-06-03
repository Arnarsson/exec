import { GitHubWebhookPayload } from '../types/okr.js';
export declare class GitHubTrackerAgent {
    private logError;
    private logInfo;
    handleWebhook(payload: GitHubWebhookPayload): Promise<void>;
    private handlePushEvent;
    private updateOKRFromCommits;
    private analyzeCommitsForProgress;
    private calculateProgressIncrease;
    private isSignificantFile;
    private isFeatureCommit;
    private isBugfixCommit;
    private isDocumentationCommit;
    private hasProgressKeywords;
    syncRepository(repoName: string, ownerId?: string): Promise<void>;
}
export declare const githubTracker: GitHubTrackerAgent;
//# sourceMappingURL=github-tracker.d.ts.map