import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { InterviewQuestionRepository } from '../repositories/InterviewQuestionRepository.js';

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
}).refine(data => data.question_text || data.questionText, {
    message: "Question text is required",
    path: ["question_text"]
});

export const interviewQuestionsRouter = Router();

interviewQuestionsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const questions = await InterviewQuestionRepository.findAllActive();
        res.json(questions);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.post('/', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const payload = questionSchema.parse(req.body);
        const question = await InterviewQuestionRepository.create(payload);
        res.status(201).json(question);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const question = await InterviewQuestionRepository.update(req.params.id, req.body);
        res.json(question);
    } catch (error) {
        next(error);
    }
});

interviewQuestionsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await InterviewQuestionRepository.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
