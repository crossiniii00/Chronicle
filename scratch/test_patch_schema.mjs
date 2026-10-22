import { z } from 'zod';

const statusUpdateSchema = z.object({
    toStatus: z.string(),
    reason: z.string().max(500).optional(),
    patch: z.any().optional(),
});

const payload = {
    toStatus: 'PASSED',
    patch: {
        metadata: { a: 1 },
        interview_responses: { q1: 'answer1' }
    }
};

const parsed = statusUpdateSchema.parse(payload);
console.log('Parsed patch:', parsed.patch);
