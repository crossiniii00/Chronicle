import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { DepartmentRepository } from '../repositories/DepartmentRepository.js';
import { accountImageUpload } from '../middleware/upload.js';
import fs from 'node:fs/promises';
import { getCache, setCache, clearCache } from '../utils/cache.js';

const departmentSchema = z.object({
    name: z.string().min(2),
    head: z.string().optional(),
    budgetCode: z.string().optional(),
    accountImageUrl: z.string().nullable().optional(),
    type: z.string().optional(),
    eligibilitySettings: z.any().optional(),
    subAccounts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional()
    })).optional()
});

export const departmentsRouter = Router();

departmentsRouter.get('/', requireAuth, async (_req, res, next) => {
    try {
        const cached = getCache('departments');
        if (cached) {
            return res.json(cached);
        }

        const departments = await DepartmentRepository.findAll();
        setCache('departments', departments, 60); // Cache for 60 seconds
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
            return res.status(400).json({ error: `Account "${payload.name}" already exists.` });
        }

        const department = await DepartmentRepository.create(payload);
        clearCache('departments');
        res.status(201).json(department);
    } catch (error) {
        console.error("DEPT ERROR", error);
        next(error);
    }
});

departmentsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter_interviewer'), async (req, res, next) => {
    try {
        const payload = departmentSchema.partial().parse(req.body);
        
        if (payload.name) {
            const existing = await DepartmentRepository.findByName(payload.name);
            if (existing && existing.id !== req.params.id) {
                return res.status(400).json({ error: `Account "${payload.name}" already exists.` });
            }
        }

        const result = await DepartmentRepository.update(req.params.id, payload);
        clearCache('departments');
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
        clearCache('departments');
        res.json(result);
    } catch (error) {
        next(error);
    }
});

departmentsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter_interviewer'), async (req, res, next) => {
    try {
        await DepartmentRepository.delete(req.params.id);
        clearCache('departments');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
