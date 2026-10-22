import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { ReportConfigService } from '../services/ReportConfigService.js';

export const reportConfigsRouter = Router();

reportConfigsRouter.get('/public/:id', async (req, res, next) => {
    try {
        const allowedPublicConfigs = ['typing_test_settings'];
        if (!allowedPublicConfigs.includes(req.params.id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const config = await ReportConfigService.getConfig(req.params.id);
        res.json(config);
    } catch (error) {
        next(error);
    }
});

reportConfigsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const configs = await ReportConfigService.getAllConfigs();
        res.json(configs);
    } catch (error) {
        next(error);
    }
});

reportConfigsRouter.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const config = await ReportConfigService.getConfig(req.params.id);
        res.json(config);
    } catch (error) {
        next(error);
    }
});

reportConfigsRouter.post('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        console.log(`[ReportConfigRoute] POST request received for id: ${req.params.id}`);
        console.log(`[ReportConfigRoute] Body:`, JSON.stringify(req.body));
        const config = await ReportConfigService.updateConfig(req.params.id, req.body);
        console.log(`[ReportConfigRoute] Upserted config successfully`);
        
        if (req.params.id === 'queue-settings') {
            console.log('[ReportConfigRoute] Emitting queue-settings:updated for active display synchronization');
            let dataToEmit = config.config_data;
            if (typeof dataToEmit === 'string') {
                try {
                    dataToEmit = JSON.parse(dataToEmit);
                } catch (e) {
                    console.error('[ReportConfigRoute] Failed to parse config_data string:', e);
                }
            }
            req.app.locals.io?.emit('queue-settings:updated', dataToEmit);
        }

        res.json(config);
    } catch (error) {
        console.error(`[ReportConfigRoute] Error updating config:`, error);
        next(error);
    }
});
