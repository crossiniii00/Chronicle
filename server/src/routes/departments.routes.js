import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { DepartmentRepository } from '../repositories/DepartmentRepository.js';
import { accountImageUpload } from '../middleware/upload.js';
import fs from 'node:fs/promises';

const departmentSchema = z.object({
    name: z.string().min(2),
    head: z.string().optional(),
    budgetCode: z.string().optional(),
    accountImageUrl: z.string().nullable().optional(),
    type: z.string().optional(),
    eligibilitySettings: z.any().optional()
});

export const departmentsRouter = Router();

departmentsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const departments = await DepartmentRepository.findAll();
        res.json(departments);
    } catch (error) {
        next(error);
    }
});

departmentsRouter.post('/', requireAuth, requireRole('admin', 'recruiter_interviewer'), async (req, res, next) => {
    try {
        const payload = departmentSchema.parse(req.body);
        
        // Check for duplicates
        const existing = await DepartmentRepository.findByName(payload.name);
        if (existing) {
            return res.status(400).json({ message: `Account "${payload.name}" already exists.` });
        }

        const department = await DepartmentRepository.create(payload);
        res.status(201).json(department);
    } catch (error) {
        next(error);
    }
});

departmentsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter_interviewer'), async (req, res, next) => {
    try {
        const payload = departmentSchema.partial().parse(req.body);
        const result = await DepartmentRepository.update(req.params.id, payload);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

departmentsRouter.post('/:id/image', requireAuth, requireRole('admin', 'recruiter_interviewer'), accountImageUpload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }


        const accountImageUrl = `/uploads/account-images/${req.file.filename}`;
        
        // Database fallback: Store as Base64
        const fileBuffer = await fs.readFile(req.file.path);
        const accountImageData = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
        
        const result = await DepartmentRepository.update(req.params.id, { 
            accountImageUrl,
            accountImageData 
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

departmentsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter_interviewer'), async (req, res, next) => {
    try {
        await DepartmentRepository.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
