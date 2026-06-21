import { Router } from 'express';
import { z } from 'zod';
import { calculateTypingMetrics } from '../utils/metrics-utils.js';

const typingSchema = z.object({
    promptText: z.string().min(20),
    typedText: z.string(),
    durationSeconds: z.number().int().positive(),
});

export const typingTestRouter = Router();

typingTestRouter.post('/score', (req, res, next) => {
    try {
        const payload = typingSchema.parse(req.body);
        const result = calculateTypingMetrics(payload);
        res.json(result);
    } catch (error) {
        next(error);
    }
});
