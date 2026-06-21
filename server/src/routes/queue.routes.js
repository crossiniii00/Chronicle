import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { QueueRepository } from '../repositories/QueueRepository.js';

export const queueRouter = Router();

queueRouter.get('/today', requireAuth, async (_req, res, next) => {
    try {
        const queue = await QueueRepository.findToday();
        res.json(queue);
    } catch (error) {
        next(error);
    }
});

queueRouter.get('/active', requireAuth, async (req, res, next) => {
    try {
        const queue = await QueueRepository.findActive(req.query.type);
        res.json(queue);
    } catch (error) {
        next(error);
    }
});

queueRouter.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        await QueueRepository.delete(req.params.id);
        req.app.locals.io?.emit('queue:updated');
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

queueRouter.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        const entry = await QueueRepository.update(req.params.id, req.body);
        
        // Emit socket event when a candidate is called
        if (req.body.status === 'CALLED' && entry) {
            console.log('[Queue Route] Emitting queue:called for:', entry.applicant_name, 'Room:', entry.assigned_room_name);
            req.app.locals.io?.emit('queue:called', {
                queue_number: entry.queue_number,
                applicant_name: entry.applicant_name,
                assigned_room_name: entry.assigned_room_name,
                queue_type: entry.queue_type,
                id: entry.id,
                application_id: entry.application_id
            });
        }
        
        req.app.locals.io?.emit('queue:updated', entry);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});
