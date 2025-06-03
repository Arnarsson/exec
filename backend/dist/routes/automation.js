"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutomationRoutes = initializeAutomationRoutes;
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
let automationService;
function initializeAutomationRoutes(service) {
    automationService = service;
}
router.post('/webhook/n8n', async (req, res) => {
    try {
        console.log('📨 n8n webhook received:', req.body);
        const automationData = {
            workflow: req.body.workflow,
            data: req.body.data,
            timestamp: req.body.timestamp || new Date().toISOString()
        };
        if (automationService) {
            await automationService.processAutomation(automationData);
        }
        res.json({
            success: true,
            workflow: automationData.workflow,
            timestamp: automationData.timestamp
        });
    }
    catch (error) {
        console.error('❌ Automation webhook error:', error);
        res.status(500).json({
            error: 'Webhook processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        if (automationService) {
            const status = await automationService.getAutomationStatus();
            res.json(status);
        }
        else {
            res.json({ error: 'Automation service not initialized' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get automation status' });
    }
});
router.post('/trigger/:workflow', async (req, res) => {
    const { workflow } = req.params;
    try {
        const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.aigrowthadvisors.cc';
        const response = await fetch(`${n8nUrl}/webhook/${workflow}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        if (response.ok) {
            res.json({ success: true, workflow, n8nUrl });
        }
        else {
            throw new Error(`n8n webhook failed: ${response.statusText}`);
        }
    }
    catch (error) {
        console.error(`❌ Failed to trigger ${workflow}:`, error);
        res.status(500).json({ error: 'Workflow trigger failed' });
    }
});
exports.default = router;
//# sourceMappingURL=automation.js.map