import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const categorySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    sort_order: z.number().int().optional(),
});

export const jobCategoriesRouter = Router();

// GET all categories
jobCategoriesRouter.get('/', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT id, name, description, sort_order, created_at, updated_at
             FROM job_categories
             ORDER BY sort_order ASC, name ASC`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST create category
jobCategoriesRouter.post('/', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = categorySchema.parse(req.body);
        const result = await query(
            `INSERT INTO job_categories (name, description, sort_order)
             VALUES ($1, $2, $3)
             RETURNING id, name, description, sort_order, created_at, updated_at`,
            [payload.name, payload.description || null, payload.sort_order ?? 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'A category with that name already exists.' });
        }
        next(error);
    }
});

// PATCH update category
jobCategoriesRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = categorySchema.partial().parse(req.body);
        const assignments = [];
        const values = [];
        let idx = 1;

        if (payload.name !== undefined) {
            assignments.push(`name = $${idx++}`);
            values.push(payload.name);
        }
        if (payload.description !== undefined) {
            assignments.push(`description = $${idx++}`);
            values.push(payload.description);
        }
        if (payload.sort_order !== undefined) {
            assignments.push(`sort_order = $${idx++}`);
            values.push(payload.sort_order);
        }

        if (assignments.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        assignments.push(`updated_at = NOW()`);
        values.push(req.params.id);

        const result = await query(
            `UPDATE job_categories SET ${assignments.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'A category with that name already exists.' });
        }
        next(error);
    }
});

// DELETE category — positions revert to Uncategorized (category_id = NULL)
jobCategoriesRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        // Revert all positions in this category to uncategorized
        await query(
            `UPDATE positions SET category_id = NULL WHERE category_id = $1`,
            [req.params.id]
        );

        const result = await query(
            `DELETE FROM job_categories WHERE id = $1`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// PATCH bulk assign positions to a category
jobCategoriesRouter.patch('/:id/positions', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const { position_ids } = req.body;
        if (!Array.isArray(position_ids) || position_ids.length === 0) {
            return res.status(400).json({ error: 'position_ids must be a non-empty array' });
        }

        // Verify category exists
        const catRes = await query('SELECT id FROM job_categories WHERE id = $1', [req.params.id]);
        if (catRes.rowCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Build parameterized IN clause
        const placeholders = position_ids.map((_, i) => `$${i + 2}`).join(', ');
        await query(
            `UPDATE positions SET category_id = $1 WHERE id IN (${placeholders})`,
            [req.params.id, ...position_ids]
        );

        res.json({ updated: position_ids.length });
    } catch (error) {
        next(error);
    }
});
