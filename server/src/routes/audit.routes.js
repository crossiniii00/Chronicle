import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, requireRole('admin', 'ops_validator', 'recruiter'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.id, a.action, a.resource_type, a.resource_id, a.user_id, 
                    u.full_name as user_name, u.role as user_role, u.avatar_data as user_avatar,
                    a.ip_address, a.user_agent, a.metadata, a.created_at 
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC LIMIT 500`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

auditRouter.get('/recent', requireAuth, async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 6, 20);
        const result = await query(
            `SELECT a.id, a.action, a.resource_type, a.user_id,
                    u.full_name as user_name, u.role as user_role,
                    a.created_at
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC LIMIT $1`,
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

auditRouter.get('/logins', requireAuth, requireRole('admin', 'ops_validator', 'recruiter'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.id, a.action, a.resource_type, a.resource_id, a.user_id, 
                    u.full_name as user_name, u.role as user_role, u.avatar_data as user_avatar,
                    a.ip_address, a.user_agent, a.metadata, a.created_at 
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.action LIKE 'auth.login%'
             ORDER BY a.created_at DESC LIMIT 500`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

auditRouter.post('/bulk-delete', requireAuth, requireRole('admin', 'ops_validator', 'recruiter'), async (req, res, next) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }
    try {
        await query(`DELETE FROM audit_logs WHERE id = ANY($1)`, [ids]);
        res.json({ success: true, count: ids.length });
    } catch (error) {
        next(error);
    }
});
