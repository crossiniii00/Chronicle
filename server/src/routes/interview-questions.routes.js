import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { InterviewQuestionRepository } from '../repositories/InterviewQuestionRepository.js';
import { getCache, setCache, clearCache } from '../utils/cache.js';

// Support both snake_case (frontend) and camelCase
const questionSchema = z.object({
    category: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    questionText: z.string().optional(),
    question_text: z.string().optional(),
    questionType: z.enum(['initial', 'final', 'technical', 'behavioral']).optional(),
    question_type: z.enum(['initial', 'final', 'technical', 'behavioral']).optional(),
    answerType: z.string().optional(),
    answer_type: z.string().optional(),
    isRequired: z.boolean().optional(),
    is_required: z.boolean().optional(),
    questionOrder: z.number().int().optional(),
    question_order: z.number().int().optional(),
    allowNotes: z.boolean().optional(),
    allow_notes: z.boolean().optional(),
    account: z.string().optional().nullable(),
    lob: z.string().optional().nullable(),
}).refine(data => data.question_text || data.questionText, {
    message: "Question text is required",
    path: ["question_text"]
});

export const interviewQuestionsRouter = Router();

interviewQuestionsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const cached = getCache('questions');
        if (cached) {
            return res.json(cached);
        }

        const questions = await InterviewQuestionRepository.findAllActive();
        setCache('questions', questions, 60); // Cache for 60 seconds
        res.json(questions);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.post('/', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const payload = questionSchema.parse(req.body);
        const question = await InterviewQuestionRepository.create(payload);
        clearCache('questions');
        res.status(201).json(question);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const question = await InterviewQuestionRepository.update(req.params.id, req.body);
        clearCache('questions');
        res.json(question);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await InterviewQuestionRepository.delete(req.params.id);
        clearCache('questions');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
