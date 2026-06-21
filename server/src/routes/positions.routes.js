import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { accountImageUpload } from '../middleware/upload.js';

const positionSchema = z.object({
    title: z.string().min(2),
    department: z.string().optional().nullable(),
    description: z.string().optional(),
    qualifications: z.string().optional(),
    hiringQuota: z.number().int().nonnegative().optional(),
    hiring_quota: z.number().int().nonnegative().optional(),
    currentHired: z.number().int().nonnegative().optional(),
    current_hired: z.number().int().nonnegative().optional(),
    manualHired: z.number().int().nonnegative().optional(),
    manual_hired: z.number().int().nonnegative().optional(),
    quotaStartDate: z.string().nullable().optional(),
    quota_start_date: z.string().nullable().optional(),
    quotaEndDate: z.string().nullable().optional(),
    quota_end_date: z.string().nullable().optional(),
    trainingStartDate: z.string().nullable().optional(),
    training_start_date: z.string().nullable().optional(),
    hiringQuotaId: z.string().nullable().optional(),
    hiring_quota_id: z.string().nullable().optional(),
    status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD']).default('OPEN'),
    employmentType: z.string().default('Full-time'),
    employment_type: z.string().optional(),
    location: z.string().optional(),
    workArrangement: z.string().optional(),
    work_arrangement: z.string().optional(),
    category_id: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
});

const quotaHistorySchema = z.object({
    department: z.string().min(1),
    positionId: z.string().uuid().nullable().optional(),
    quota: z.number().int().nonnegative(),
    hiredCount: z.number().int().nonnegative().default(0),
    totalApplicants: z.number().int().nonnegative().default(0),
    inPipeline: z.number().int().nonnegative().default(0),
    failedCount: z.number().int().nonnegative().default(0),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    hiringType: z.string().optional(),
    hiring_type: z.string().optional(),
    manualHires: z.number().int().nonnegative().optional(),
    manual_hires: z.number().int().nonnegative().optional(),
    trainingStartDate: z.string().nullable().optional(),
    training_start_date: z.string().nullable().optional(),
    hiringQuotaId: z.string().nullable().optional(),
    hiring_quota_id: z.string().nullable().optional(),
});

export const positionsRouter = Router();

async function autoCloseExpiredQuotas() {
    try {
        const expiredRes = await query(
            `SELECT id, department, hiring_quota, quota_start_date, quota_end_date 
             FROM positions 
             WHERE status = 'OPEN' 
               AND (requirements = 'ACCOUNT_INTERNAL_QUOTA' OR requirements = 'ACCOUNT_INTERNAL_QUOTA_BILLED' OR requirements = 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED')
               AND quota_end_date IS NOT NULL 
               AND quota_end_date < CURRENT_DATE`
        );

        for (const pos of expiredRes.rows) {
            const dept = pos.department;
            const start = pos.quota_start_date;
            const end = pos.quota_end_date;

            const appsRes = await query(
                `SELECT current_status, hired_at, updated_at, interview_completed_at, applied_at
                 FROM applications
                 WHERE LOWER(department) = LOWER($1)`,
                [dept]
            );

            const isDateInsideSeason = (val, startDateStr, endDateStr) => {
                if (!startDateStr || !endDateStr) return true;
                if (!val) return false;
                const date = new Date(val);
                const startDate = new Date(`${startDateStr}T00:00:00`);
                const endDate = new Date(`${endDateStr}T23:59:59.999`);
                return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
            };

            const getSeasonActivityDate = (app) => {
                const status = (app.current_status || '').toUpperCase();
                if (status === 'HIRED') {
                    return app.hired_at || app.updated_at || app.interview_completed_at || app.applied_at;
                }
                if (['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status)) {
                    return app.updated_at || app.interview_completed_at || app.applied_at;
                }
                return app.applied_at || app.updated_at;
            };

            const seasonApps = appsRes.rows.filter(app => {
                const actDate = getSeasonActivityDate(app);
                return isDateInsideSeason(actDate, start, end);
            });

            const hiredCount = seasonApps.filter(app => (app.current_status || '').toUpperCase() === 'HIRED').length;
            const failedCount = seasonApps.filter(app => ['FAILED', 'REJECTED', 'WITHDRAWN'].includes((app.current_status || '').toUpperCase())).length;
            const totalApplicants = seasonApps.length;
            const inPipeline = totalApplicants - hiredCount - failedCount;

            await query('BEGIN');
            
            await query(
                `INSERT INTO hiring_quota_history (
                    department, position_id, quota, hired_count, total_applicants,
                    in_pipeline, failed_count, start_date, end_date
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [dept, pos.id, pos.hiring_quota, hiredCount, totalApplicants, inPipeline, failedCount, start, end]
            );

            await query(
                `UPDATE positions 
                 SET hiring_quota = 0, status = 'CLOSED', requirements = '', quota_start_date = NULL, quota_end_date = NULL
                 WHERE id = $1`,
                [pos.id]
            );

            await query('COMMIT');
            console.log(`[Auto-Close Quota] Successfully archived and closed quota for department: ${dept}`);
        }
    } catch (err) {
        console.error('[Auto-Close Quota] Error:', err);
    }
}

positionsRouter.get('/', async (req, res, next) => {
    try {
        await autoCloseExpiredQuotas();
        const result = await query(
            `SELECT id, title, department, description, requirements as qualifications,
                hiring_quota, hiring_quota as "hiringQuota",
                current_hired, current_hired as "currentHired",
                manual_hired, manual_hired as "manualHired",
                quota_start_date, quota_start_date as "quotaStartDate",
                quota_end_date, quota_end_date as "quotaEndDate",
                training_start_date, training_start_date as "trainingStartDate",
                hiring_quota_id, hiring_quota_id as "hiringQuotaId",
                status, employment_type, employment_type as "employmentType",
                location, work_arrangement, work_arrangement as "workArrangement",
                image_url, image_url as "imageUrl",
                category_id,
                created_at
             FROM positions ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

positionsRouter.get('/quota-history', requireAuth, async (req, res, next) => {
    try {
        await autoCloseExpiredQuotas();
        const department = String(req.query.department || '').trim();
        const values = department ? [department] : [];
        const result = await query(
            `SELECT id, department, position_id as "positionId", quota,
                hired_count as "hiredCount", total_applicants as "totalApplicants",
                in_pipeline as "inPipeline", failed_count as "failedCount",
                start_date as "startDate", end_date as "endDate",
                hiring_type as "hiringType", manual_hires as "manualHires",
                training_start_date as "trainingStartDate", hiring_quota_id as "hiringQuotaId",
                closed_at as "closedAt", created_at as "createdAt"
             FROM hiring_quota_history
             ${department ? 'WHERE LOWER(department) = LOWER($1)' : ''}
             ORDER BY closed_at DESC`,
            values
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

positionsRouter.post('/quota-history', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = quotaHistorySchema.parse(req.body);
        const hiringType = payload.hiringType ?? payload.hiring_type ?? 'Billed';
        const manualHires = payload.manualHires ?? payload.manual_hires ?? 0;
        const trainingStartDate = payload.trainingStartDate ?? payload.training_start_date ?? null;
        const hiringQuotaId = payload.hiringQuotaId ?? payload.hiring_quota_id ?? '';
        const result = await query(
            `INSERT INTO hiring_quota_history (
                department, position_id, quota, hired_count, total_applicants,
                in_pipeline, failed_count, start_date, end_date, hiring_type,
                manual_hires, training_start_date, hiring_quota_id, closed_by
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING id`,
            [
                payload.department,
                payload.positionId || null,
                payload.quota,
                payload.hiredCount,
                payload.totalApplicants,
                payload.inPipeline,
                payload.failedCount,
                payload.startDate || null,
                payload.endDate || null,
                hiringType,
                manualHires,
                trainingStartDate,
                hiringQuotaId,
                req.user.id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.delete('/quota-history/:id', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        await query('DELETE FROM hiring_quota_history WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

positionsRouter.patch('/quota-history/:id', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = quotaHistorySchema.partial().parse(req.body);
        const assignments = [];
        const values = [];
        let idx = 1;

        const mapping = {
            department: 'department',
            positionId: 'position_id',
            quota: 'quota',
            hiredCount: 'hired_count',
            hired_count: 'hired_count',
            totalApplicants: 'total_applicants',
            total_applicants: 'total_applicants',
            inPipeline: 'in_pipeline',
            in_pipeline: 'in_pipeline',
            failedCount: 'failed_count',
            failed_count: 'failed_count',
            startDate: 'start_date',
            endDate: 'end_date',
            hiringType: 'hiring_type',
            hiring_type: 'hiring_type',
            manualHires: 'manual_hires',
            manual_hires: 'manual_hires',
            trainingStartDate: 'training_start_date',
            training_start_date: 'training_start_date',
            hiringQuotaId: 'hiring_quota_id',
            hiring_quota_id: 'hiring_quota_id'
        };

        Object.entries(payload).forEach(([key, val]) => {
            if (val !== undefined && mapping[key]) {
                assignments.push(`${mapping[key]} = $${idx++}`);
                values.push(val);
            }
        });

        if (assignments.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(req.params.id);
        const result = await query(
            `UPDATE hiring_quota_history SET ${assignments.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.post('/', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = positionSchema.parse(req.body);
        const hiringQuota = payload.hiringQuota ?? payload.hiring_quota ?? 1;
        const manualHired = payload.manualHired ?? payload.manual_hired ?? 0;
        const employmentType = payload.employmentType ?? payload.employment_type ?? 'Full-time';
        const workArrangement = payload.workArrangement ?? payload.work_arrangement ?? '';
        const quotaStartDate = payload.quotaStartDate ?? payload.quota_start_date ?? null;
        const quotaEndDate = payload.quotaEndDate ?? payload.quota_end_date ?? null;
        const trainingStartDate = payload.trainingStartDate ?? payload.training_start_date ?? null;
        const hiringQuotaId = payload.hiringQuotaId ?? payload.hiring_quota_id ?? '';
        const categoryId = payload.category_id ?? payload.categoryId ?? null;
        const result = await query(
            `INSERT INTO positions (
                title, department, description, requirements, hiring_quota, manual_hired, quota_start_date, quota_end_date, training_start_date, hiring_quota_id, status, employment_type, location, work_arrangement, created_by, category_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             RETURNING id`,
            [
                payload.title,
                payload.department || null,
                payload.description || '',
                payload.qualifications || '',
                hiringQuota,
                manualHired,
                quotaStartDate,
                quotaEndDate,
                trainingStartDate,
                hiringQuotaId,
                payload.status,
                employmentType,
                payload.location || '',
                workArrangement,
                req.user.id,
                categoryId
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.patch('/:id', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = positionSchema.partial().parse(req.body);
        const assignments = new Map();
        const values = [];

        const mapping = {
            title: 'title',
            department: 'department',
            description: 'description',
            qualifications: 'requirements',
            hiringQuota: 'hiring_quota',
            hiring_quota: 'hiring_quota',
            currentHired: 'current_hired',
            current_hired: 'current_hired',
            manualHired: 'manual_hired',
            manual_hired: 'manual_hired',
            quotaStartDate: 'quota_start_date',
            quota_start_date: 'quota_start_date',
            quotaEndDate: 'quota_end_date',
            quota_end_date: 'quota_end_date',
            trainingStartDate: 'training_start_date',
            training_start_date: 'training_start_date',
            hiringQuotaId: 'hiring_quota_id',
            hiring_quota_id: 'hiring_quota_id',
            status: 'status',
            employmentType: 'employment_type',
            employment_type: 'employment_type',
            location: 'location',
            workArrangement: 'work_arrangement',
            work_arrangement: 'work_arrangement',
            category_id: 'category_id',
            categoryId: 'category_id'
        };

        Object.entries(payload).forEach(([key, val]) => {
            if (val !== undefined) {
                assignments.set(mapping[key], val);
            }
        });

        if (assignments.size === 0) return res.status(400).json({ error: 'No fields provided' });

        const fields = [];
        let idx = 1;
        assignments.forEach((val, column) => {
            fields.push(`${column} = $${idx++}`);
            values.push(val);
        });
        values.push(req.params.id);
        const result = await query(
            `UPDATE positions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await query('DELETE FROM positions WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

positionsRouter.post('/:id/image', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer'), accountImageUpload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }

        const accountImageUrl = `/uploads/account-images/${req.file.filename}`;

        const result = await query(
            `UPDATE positions SET image_url = $1 WHERE id = $2 RETURNING *`,
            [accountImageUrl, req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Position not found' });
        }

        res.json({ imageUrl: accountImageUrl, position: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

positionsRouter.get('/quota-requests', requireAuth, async (req, res, next) => {
    try {
        const department = req.query.department;
        const queryStr = department 
            ? 'SELECT id, department, request_type as "requestType", quota, start_date as "startDate", end_date as "endDate", reason, status, requested_by as "requestedBy", requested_by_name as "requestedByName", created_at as "createdAt", updated_at as "updatedAt" FROM hiring_quota_requests WHERE LOWER(department) = LOWER($1) ORDER BY created_at DESC'
            : 'SELECT id, department, request_type as "requestType", quota, start_date as "startDate", end_date as "endDate", reason, status, requested_by as "requestedBy", requested_by_name as "requestedByName", created_at as "createdAt", updated_at as "updatedAt" FROM hiring_quota_requests ORDER BY created_at DESC';
        const params = department ? [department] : [];
        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

positionsRouter.post('/quota-requests', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const { department, requestType, quota, startDate, endDate, reason } = req.body;
        const result = await query(
            `INSERT INTO hiring_quota_requests (
                department, request_type, quota, start_date, end_date, reason, status, requested_by, requested_by_name
             ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8) RETURNING id`,
            [
                department,
                requestType,
                quota !== undefined ? Number(quota) : null,
                startDate || null,
                endDate || null,
                reason || '',
                req.user.id,
                req.user.full_name || 'Ops Validator'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.patch('/quota-requests/:id', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const { status } = req.body;
        const requestId = req.params.id;

        const reqResult = await query('SELECT * FROM hiring_quota_requests WHERE id = $1', [requestId]);
        if (reqResult.rowCount === 0) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const quotaReq = reqResult.rows[0];

        const updateResult = await query(
            'UPDATE hiring_quota_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, requestId]
        );

        if (status === 'APPROVED') {
            const { department, request_type, quota, start_date, end_date } = quotaReq;
            
            const posResult = await query(
                `SELECT id, hiring_quota, quota_start_date, quota_end_date FROM positions 
                 WHERE LOWER(department) = LOWER($1) AND requirements = 'ACCOUNT_INTERNAL_QUOTA'`,
                [department]
            );
            const internalPos = posResult.rows[0];

            if (request_type === 'ADD') {
                if (internalPos) {
                    await query(
                        `UPDATE positions SET hiring_quota = $1, quota_start_date = $2, quota_end_date = $3, status = 'OPEN' WHERE id = $4`,
                        [quota, start_date, end_date, internalPos.id]
                    );
                } else {
                    await query(
                        `INSERT INTO positions (title, department, requirements, hiring_quota, quota_start_date, quota_end_date, status, employment_type)
                         VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', 'Full-time')`,
                        [`[INTERNAL] ${department} Quota`, department, 'ACCOUNT_INTERNAL_QUOTA', quota, start_date, end_date]
                    );
                }
            } else if (request_type === 'UPDATE') {
                if (internalPos) {
                    await query(
                        `UPDATE positions SET hiring_quota = $1, quota_start_date = $2, quota_end_date = $3, status = 'OPEN' WHERE id = $4`,
                        [quota, start_date, end_date, internalPos.id]
                    );
                } else {
                    await query(
                        `INSERT INTO positions (title, department, requirements, hiring_quota, quota_start_date, quota_end_date, status, employment_type)
                         VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', 'Full-time')`,
                        [`[INTERNAL] ${department} Quota`, department, 'ACCOUNT_INTERNAL_QUOTA', quota, start_date, end_date]
                    );
                }
            } else if (request_type === 'CLOSE') {
                if (internalPos) {
                    await query(`UPDATE positions SET status = 'CLOSED' WHERE id = $1`, [internalPos.id]);
                }
            } else if (request_type === 'CANCEL') {
                if (internalPos) {
                    await query(`DELETE FROM positions WHERE id = $1`, [internalPos.id]);
                }
            }
        }

        res.json(updateResult.rows[0]);
    } catch (error) {
        next(error);
    }
});
