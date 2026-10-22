import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { getIO } from '../socket.js';

export const notificationsRouter = Router();

const notificationSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.string(), // Allow all types from frontend
});

notificationsRouter.get('/:userId', requireAuth, async (req, res, next) => {
    try {
        if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const limit = parseInt(req.query.limit) || 100;
        const result = await query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [req.params.userId, limit]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

notificationsRouter.patch('/:id/read', requireAuth, async (req, res, next) => {
    try {
        await query(
            `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1`,
            [req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

notificationsRouter.patch('/user/:userId/read-all', requireAuth, async (req, res, next) => {
    try {
        if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await query(
            `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1`,
            [req.params.userId]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

notificationsRouter.post('/delete-bulk', requireAuth, async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid notification IDs' });
        }
        await query(`DELETE FROM notifications WHERE id = ANY($1)`, [ids]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

notificationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        await query(`DELETE FROM notifications WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

notificationsRouter.post('/', requireAuth, async (req, res, next) => {
    try {
        const payload = notificationSchema.parse(req.body);
        const result = await query(
            `INSERT INTO notifications (user_id, title, message, notification_type) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [payload.userId, payload.title, payload.message, payload.type]
        );
        
        // Emit socket event
        const io = getIO();
        if (io) {
            io.emit('notification:new', {
                title: payload.title,
                message: payload.message,
                notification_type: payload.type,
                userIds: [payload.userId]
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});
