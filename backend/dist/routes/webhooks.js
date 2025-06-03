"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const github_tracker_js_1 = require("../agents/github-tracker.js");
const router = express_1.default.Router();
const logError = (operation, error, context) => {
    console.error(`[WEBHOOKS-ERROR] ${operation}:`, {
        error: error.message || error,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    });
};
const logInfo = (operation, data) => {
    console.log(`[WEBHOOKS-INFO] ${operation}:`, {
        data,
        timestamp: new Date().toISOString()
    });
};
router.post('/github', async (req, res) => {
    try {
        const githubEvent = req.headers['x-github-event'];
        const signature = req.headers['x-hub-signature-256'];
        const delivery = req.headers['x-github-delivery'];
        logInfo('GitHub webhook received', {
            event: githubEvent,
            delivery,
            hasSignature: !!signature,
            bodySize: JSON.stringify(req.body).length
        });
        if (!githubEvent) {
            logError('GitHub webhook missing event header', new Error('Missing x-github-event header'));
            res.status(400).json({ error: 'Missing GitHub event header' });
            return;
        }
        const payload = req.body;
        switch (githubEvent) {
            case 'push':
                logInfo('Processing push event', {
                    repo: payload.repository?.full_name,
                    commits: payload.commits?.length || 0,
                    pusher: payload.pusher?.name
                });
                await github_tracker_js_1.githubTracker.handleWebhook({
                    ...payload,
                    action: 'pushed'
                });
                logInfo('Push event processed successfully', {
                    repo: payload.repository?.full_name,
                    delivery
                });
                break;
            case 'ping':
                logInfo('GitHub ping received', { zen: payload });
                res.json({ message: 'Webhook ping received successfully' });
                return;
            default:
                logInfo('Unhandled GitHub event', { event: githubEvent });
                res.json({ message: `Event ${githubEvent} received but not processed` });
                return;
        }
        res.json({ message: 'Webhook processed successfully' });
    }
    catch (error) {
        logError('POST /github', error, {
            headers: req.headers,
            bodyKeys: Object.keys(req.body || {})
        });
        res.status(500).json({
            error: 'Failed to process GitHub webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/test-github', async (req, res) => {
    try {
        logInfo('Test GitHub webhook triggered');
        const testPayload = {
            action: 'pushed',
            repository: {
                name: req.body.repoName || 'dozy-sleep-tracker',
                full_name: req.body.fullName || 'user/dozy-sleep-tracker'
            },
            commits: [
                {
                    id: 'test-commit-' + Date.now(),
                    message: req.body.commitMessage || 'feat: Add new sleep tracking feature',
                    timestamp: new Date().toISOString(),
                    author: {
                        name: req.body.authorName || 'Test Developer',
                        email: req.body.authorEmail || 'dev@test.com'
                    },
                    added: ['src/new-feature.ts'],
                    modified: ['src/app.ts', 'README.md'],
                    removed: []
                }
            ],
            pusher: {
                name: req.body.pusherName || 'Test Developer',
                email: req.body.pusherEmail || 'dev@test.com'
            }
        };
        await github_tracker_js_1.githubTracker.handleWebhook(testPayload);
        logInfo('Test GitHub webhook processed successfully', {
            repo: testPayload.repository.full_name,
            commitMessage: testPayload.commits[0].message
        });
        res.json({
            message: 'Test webhook processed successfully',
            payload: testPayload
        });
    }
    catch (error) {
        logError('POST /test-github', error, { body: req.body });
        res.status(500).json({
            error: 'Failed to process test webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        logInfo('Webhook status requested');
        const status = {
            github: {
                enabled: true,
                lastProcessed: new Date().toISOString(),
                supportedEvents: ['push', 'ping']
            },
            email: {
                enabled: false,
                lastProcessed: null
            },
            calendar: {
                enabled: false,
                lastProcessed: null
            }
        };
        logInfo('Webhook status served', status);
        res.json(status);
    }
    catch (error) {
        logError('GET /status', error);
        res.status(500).json({
            error: 'Failed to get webhook status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
function validateGitHubSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        logInfo('GitHub webhook secret not configured, skipping validation');
        return next();
    }
    if (!signature) {
        logError('validateGitHubSignature', new Error('Missing signature'));
        return res.status(401).json({ error: 'Missing signature' });
    }
    logInfo('Webhook signature validation skipped (MVP mode)');
    next();
}
exports.default = router;
//# sourceMappingURL=webhooks.js.map