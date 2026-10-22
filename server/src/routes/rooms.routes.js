import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoomRepository } from '../repositories/RoomRepository.js';
import { z } from 'zod';
import { getCache, setCache, clearCache } from '../utils/cache.js';

const roomSchema = z.object({
    room_number: z.string().min(1),
    room_name: z.string().min(1),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).default('AVAILABLE'),
    is_active: z.boolean().default(true),
    current_application_id: z.string().uuid().nullable().optional(),
    current_applicant_name: z.string().nullable().optional(),
    occupied_since: z.string().nullable().optional(),
    occupied_until: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    room_type: z.enum(['onsite', 'online']).default('onsite').optional(),
});

export const roomsRouter = Router();

roomsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const cached = getCache('rooms');
        if (cached) {
            return res.json(cached);
        }

        const rooms = await RoomRepository.findAll();
        setCache('rooms', rooms, 60); // Cache for 60 seconds
        res.json(rooms);
    } catch (error) {
        next(error);
    }
});

roomsRouter.post('/', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const payload = roomSchema.parse(req.body);
        const room = await RoomRepository.create(payload);
        clearCache('rooms');
        req.app.locals.io?.emit('rooms:updated');
        res.status(201).json(room);
    } catch (error) {
        next(error);
    }
});

roomsRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
    try {
        const room = await RoomRepository.update(req.params.id, { status: req.body.status });
        clearCache('rooms');
        req.app.locals.io?.emit('rooms:updated');
        res.json(room);
    } catch (error) {
        next(error);
    }
});

roomsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const room = await RoomRepository.update(req.params.id, req.body);
        if (!room) return res.status(400).json({ error: 'No fields provided' });
        clearCache('rooms');
        req.app.locals.io?.emit('rooms:updated');
        res.json(room);
    } catch (error) {
        next(error);
    }
});

roomsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const room = await RoomRepository.delete(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        clearCache('rooms');
        req.app.locals.io?.emit('rooms:updated');
        res.json({ success: true, roomNumber: room.room_number });
    } catch (error) {
        next(error);
    }
});
