import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { accountImageUpload } from '../middleware/upload.js';
import { getCache, setCache, clearCache } from '../utils/cache.js';

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
    quotaStartDate: z.string().optional().nullable(),
    quota_start_date: z.string().optional().nullable(),
    quotaEndDate: z.string().optional().nullable(),
    quota_end_date: z.string().optional().nullable(),
    trainingStartDate: z.string().optional().nullable(),
    training_start_date: z.string().optional().nullable(),
    hiringQuotaId: z.string().optional(),
    hiring_quota_id: z.string().optional(),
    status: z.string().optional(),
    employmentType: z.string().optional(),
    employment_type: z.string().optional(),
    location: z.string().optional(),
    workArrangement: z.string().optional(),
    work_arrangement: z.string().optional(),
    categoryId: z.string().uuid().optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    openingName: z.string().optional(),
    opening_name: z.string().optional(),
    manualRequirement: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manual_requirement: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manualJobOffers: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manual_job_offers: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manualFallout: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manual_fallout: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manualActiveHires: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manual_active_hires: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manualBalance: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    manual_balance: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    manualDay1ShowUp: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    manual_day_1_show_up: z.union([z.number().int().nonnegative(), z.literal('')]).optional().nullable(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    requestDate: z.string().optional().nullable(),
    request_date: z.string().optional().nullable(),
    approvalDate: z.string().optional().nullable(),
    approval_date: z.string().optional().nullable(),
    isBillable: z.boolean().optional().nullable(),
    is_billable: z.boolean().optional().nullable(),
    requesterName: z.string().optional().nullable(),
    requester_name: z.string().optional().nullable(),
    recruitmentProgress: z.string().optional().nullable(),
    recruitment_progress: z.string().optional().nullable(),
    concatenate: z.string().optional().nullable(),
    internal_external: z.string().optional().nullable(),
    requester: z.string().optional().nullable(),
    salaryMatrixCategory: z.string().optional().nullable(),
    salary_matrix_category: z.string().optional().nullable(),
    classType: z.string().optional().nullable(),
    class_type: z.string().optional().nullable(),
    rosterDate: z.string().optional().nullable(),
    roster_date: z.string().optional().nullable(),
    internal_external: z.string().optional().nullable(),
    requester: z.string().optional().nullable(),
    hiringReqHc: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    hiring_req_hc: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    totalOffersExtended: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    total_offers_extended: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    netHiresInternal: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    net_hires_internal: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    netHiresExternal: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    net_hires_external: z.union([z.number().int(), z.literal('')]).optional().nullable(),
    notes: z.string().optional().nullable(),
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
    openingName: z.string().nullable().optional(),
    opening_name: z.string().nullable().optional(),
    assignedCandidates: z.array(z.string().uuid()).optional(),
    salaryMatrixCategory: z.string().nullable().optional(),
    salary_matrix_category: z.string().nullable().optional(),
    classType: z.string().nullable().optional(),
    class_type: z.string().nullable().optional(),
    rosterDate: z.string().nullable().optional(),
    roster_date: z.string().nullable().optional(),
    hiringReqHc: z.number().int().nullable().optional(),
    hiring_req_hc: z.number().int().nullable().optional(),
    totalOffersExtended: z.number().int().nullable().optional(),
    total_offers_extended: z.number().int().nullable().optional(),
    manualJobOffers: z.number().int().nullable().optional(),
    manual_job_offers: z.number().int().nullable().optional(),
    manualFallout: z.number().int().nullable().optional(),
    manual_fallout: z.number().int().nullable().optional(),
    netHiresInternal: z.number().int().nullable().optional(),
    net_hires_internal: z.number().int().nullable().optional(),
    netHiresExternal: z.number().int().nullable().optional(),
    net_hires_external: z.number().int().nullable().optional(),
    manualBalance: z.number().int().nullable().optional(),
    manual_balance: z.number().int().nullable().optional(),
    joBalance: z.number().int().nullable().optional(),
    jo_balance: z.number().int().nullable().optional(),
    manualDay1ShowUp: z.number().int().nullable().optional(),
    manual_day_1_show_up: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
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

            const startDateStr = start instanceof Date ? start.toISOString().split('T')[0] : (start ? String(start).trim() : '');
            const endDateStr = end instanceof Date ? end.toISOString().split('T')[0] : (end ? String(end).trim() : '');

            if (!startDateStr || !endDateStr) {
                console.warn(`[Auto-Close Quota] Position ${pos.id} has missing start or end date. Skipping stats check.`);
                continue;
            }

            const statsRes = await query(
                `WITH app_dates AS (
                    SELECT 
                        current_status,
                        CASE 
                            WHEN UPPER(current_status) = 'HIRED' 
                                THEN COALESCE(
                                    CASE WHEN hired_at ~ '^\\d{4}-\\d{2}-\\d{2}' THEN hired_at::timestamp ELSE NULL END, 
                                    updated_at, 
                                    interview_completed_at, 
                                    applied_at
                                )
                            WHEN UPPER(current_status) IN ('FAILED', 'REJECTED', 'WITHDRAWN') 
                                THEN COALESCE(updated_at, interview_completed_at, applied_at)
                            ELSE COALESCE(applied_at, updated_at)
                        END as act_date
                    FROM applications
                    WHERE LOWER(department) = LOWER($1)
                )
                SELECT 
                    COUNT(*) as total_applicants,
                    SUM(CASE WHEN UPPER(current_status) = 'HIRED' THEN 1 ELSE 0 END) as hired_count,
                    SUM(CASE WHEN UPPER(current_status) IN ('FAILED', 'REJECTED', 'WITHDRAWN') THEN 1 ELSE 0 END) as failed_count
                FROM app_dates
                WHERE act_date IS NOT NULL 
                  AND act_date >= ($2 || ' 00:00:00')::timestamp
                  AND act_date <= ($3 || ' 23:59:59.999')::timestamp`,
                [dept, startDateStr, endDateStr]
            );

            const statsRow = statsRes.rows[0] || { total_applicants: 0, hired_count: 0, failed_count: 0 };
            const hiredCount = parseInt(statsRow.hired_count || 0, 10);
            const failedCount = parseInt(statsRow.failed_count || 0, 10);
            const totalApplicants = parseInt(statsRow.total_applicants || 0, 10);
            const inPipeline = totalApplicants - hiredCount - failedCount;

            await query('BEGIN');
            
            await query(
                `INSERT INTO hiring_quota_history (
                    department, position_id, quota, hired_count, total_applicants,
                    in_pipeline, failed_count, start_date, end_date
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [dept, pos.id, pos.hiring_quota, hiredCount, totalApplicants, inPipeline, failedCount, startDateStr, endDateStr]
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
        const cached = getCache('positions');
        if (cached) {
            return res.json(cached);
        }

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
                opening_name, opening_name as "openingName",
                manual_requirement, manual_requirement as "manualRequirement",
                manual_job_offers, manual_job_offers as "manualJobOffers",
                manual_fallout, manual_fallout as "manualFallout",
                manual_active_hires, manual_active_hires as "manualActiveHires",
                manual_balance, manual_balance as "manualBalance",
                manual_day_1_show_up, manual_day_1_show_up as "manualDay1ShowUp",
                salary_matrix_category, salary_matrix_category as "salaryMatrixCategory",
                class_type, class_type as "classType",
                roster_date, roster_date as "rosterDate",
                hiring_req_hc, hiring_req_hc as "hiringReqHc",
                total_offers_extended, total_offers_extended as "totalOffersExtended",
                net_hires_internal, net_hires_internal as "netHiresInternal",
                  net_hires_external, net_hires_external as "netHiresExternal",
                  jo_balance, jo_balance as "joBalance",
                  notes,
                  country,
                  city,
                  request_date, request_date as "requestDate",
                  approval_date, approval_date as "approvalDate",
                  is_billable, is_billable as "isBillable",
                  requester_name, requester_name as "requesterName",
                  recruitment_progress, recruitment_progress as "recruitmentProgress",
                  concatenate,
                  status, employment_type, employment_type as "employmentType",
                location, work_arrangement, work_arrangement as "workArrangement",
                image_url, image_url as "imageUrl",
                category_id,
                p.created_at,
                a.auto_total_offers_extended as "autoTotalOffersExtended",
                a.auto_accepted_job_offers as "autoAcceptedJobOffers",
                a.auto_fallout as "autoFallout",
                a.auto_net_hires_internal as "autoNetHiresInternal",
                a.auto_net_hires_external as "autoNetHiresExternal",
                a.auto_day_1_show_up as "autoDay1ShowUp",
                (COALESCE(p.hiring_quota, 0) - COALESCE(a.auto_accepted_job_offers, 0)) as "autoJoBalance",
                (COALESCE(p.hiring_quota, 0) - (COALESCE(a.auto_net_hires_internal, 0) + COALESCE(a.auto_net_hires_external, 0))) as "autoBalance"
             FROM positions p
             LEFT JOIN LATERAL (
                 SELECT 
                     SUM(CASE WHEN UPPER(current_status) IN ('FOR_JOB_OFFER', 'FOR JOB OFFER', 'ACCEPTED OFFER', 'SENT JO AND BGC', 'HIRED', 'ONBOARDING', 'TRAINING_STARTED', 'PROMOTED', 'LATERAL TRANSFER') OR (UPPER(current_status) IN ('FAILED', 'REJECTED', 'WITHDRAWN') AND UPPER(metadata->'failure_details'->>'from_status') IN ('FOR_JOB_OFFER', 'FOR JOB OFFER', 'ACCEPTED OFFER', 'SENT JO AND BGC', 'HIRED', 'ONBOARDING')) THEN 1 ELSE 0 END) as auto_total_offers_extended,
                     SUM(CASE WHEN UPPER(current_status) IN ('ACCEPTED OFFER', 'HIRED', 'ONBOARDING', 'TRAINING_STARTED', 'PROMOTED', 'LATERAL TRANSFER') OR (UPPER(current_status) IN ('FAILED', 'REJECTED', 'WITHDRAWN') AND UPPER(metadata->'failure_details'->>'from_status') IN ('ACCEPTED OFFER', 'HIRED', 'ONBOARDING', 'TRAINING_STARTED')) THEN 1 ELSE 0 END) as auto_accepted_job_offers,
                     SUM(CASE WHEN UPPER(current_status) IN ('FAILED', 'REJECTED', 'WITHDRAWN') AND UPPER(metadata->'failure_details'->>'from_status') IN ('ACCEPTED OFFER', 'HIRED', 'ONBOARDING', 'TRAINING_STARTED', 'FOR_JOB_OFFER', 'FOR JOB OFFER', 'SENT JO AND BGC') THEN 1 ELSE 0 END) as auto_fallout,
                     SUM(CASE WHEN UPPER(current_status) = 'HIRED' AND UPPER(metadata->>'candidate_type') = 'INTERNAL' THEN 1 ELSE 0 END) as auto_net_hires_internal,
                     SUM(CASE WHEN UPPER(current_status) = 'HIRED' AND (metadata->>'candidate_type' IS NULL OR UPPER(metadata->>'candidate_type') = 'EXTERNAL') THEN 1 ELSE 0 END) as auto_net_hires_external,
                     SUM(CASE WHEN UPPER(current_status) IN ('TRAINING_STARTED', 'ONBOARDED') THEN 1 ELSE 0 END) as auto_day_1_show_up
                 FROM applications 
                 WHERE LOWER(department) = LOWER(p.department)
                   AND (p.quota_start_date IS NULL OR COALESCE(updated_at, applied_at) >= p.quota_start_date::timestamp)
                   AND (p.quota_end_date IS NULL OR COALESCE(updated_at, applied_at) <= (p.quota_end_date || ' 23:59:59')::timestamp)
             ) a ON true
             ORDER BY p.created_at DESC`
        );
        setCache('positions', result.rows, 60); // Cache for 60 seconds
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
            `SELECT hqh.id, hqh.department, hqh.position_id as "positionId", hqh.quota,
                hqh.hired_count as "hiredCount", hqh.total_applicants as "totalApplicants",
                hqh.in_pipeline as "inPipeline", hqh.failed_count as "failedCount",
                hqh.start_date as "startDate", hqh.end_date as "endDate",
                hqh.hiring_type as "hiringType", hqh.manual_hires as "manualHires",
                hqh.training_start_date as "trainingStartDate", hqh.hiring_quota_id as "hiringQuotaId",
                hqh.opening_name as "openingName",
                hqh.manual_requirement as "manualRequirement",
                hqh.manual_job_offers as "manualJobOffers",
                hqh.manual_fallout as "manualFallout",
                hqh.manual_active_hires as "manualActiveHires",
                hqh.manual_balance as "manualBalance",
                hqh.manual_day_1_show_up as "manualDay1ShowUp",
                hqh.salary_matrix_category as "salaryMatrixCategory",
                hqh.class_type as "classType",
                hqh.roster_date as "rosterDate",
                hqh.hiring_req_hc as "hiringReqHc",
                hqh.total_offers_extended as "totalOffersExtended",
                hqh.net_hires_internal as "netHiresInternal",
                hqh.net_hires_external as "netHiresExternal",
                hqh.jo_balance as "joBalance",
                hqh.notes as "notes",
                hqh.country as "country",
                hqh.city as "city",
                hqh.request_date as "requestDate",
                hqh.approval_date as "approvalDate",
                hqh.is_billable as "isBillable",
                hqh.requester_name as "requesterName",
                hqh.recruitment_progress as "recruitmentProgress",
                hqh.concatenate as "concatenate",
                hqh.closed_at as "closedAt", hqh.created_at as "createdAt",
                COALESCE(
                    (SELECT array_agg(a.id::text) FROM applications a WHERE a.quota_history_id = hqh.id),
                    ARRAY[]::text[]
                ) as "assignedCandidates"
             FROM hiring_quota_history hqh
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
        const openingName = payload.openingName ?? payload.opening_name ?? '';
        const result = await query(
            `INSERT INTO hiring_quota_history (
                department, position_id, quota, hired_count, total_applicants,
                in_pipeline, failed_count, start_date, end_date, hiring_type,
                manual_hires, training_start_date, hiring_quota_id, opening_name, closed_by,
                salary_matrix_category, class_type, roster_date, hiring_req_hc,
                total_offers_extended, manual_job_offers, manual_fallout, net_hires_internal,
                net_hires_external, manual_balance, jo_balance, manual_day_1_show_up, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
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
                openingName,
                req.user.id,
                payload.salaryMatrixCategory ?? payload.salary_matrix_category ?? null,
                payload.classType ?? payload.class_type ?? null,
                payload.rosterDate ?? payload.roster_date ?? null,
                payload.hiringReqHc ?? payload.hiring_req_hc ?? null,
                payload.totalOffersExtended ?? payload.total_offers_extended ?? null,
                payload.manualJobOffers ?? payload.manual_job_offers ?? null,
                payload.manualFallout ?? payload.manual_fallout ?? null,
                payload.netHiresInternal ?? payload.net_hires_internal ?? null,
                payload.netHiresExternal ?? payload.net_hires_external ?? null,
                payload.manualBalance ?? payload.manual_balance ?? null,
                payload.joBalance ?? payload.jo_balance ?? null,
                payload.manualDay1ShowUp ?? payload.manual_day_1_show_up ?? null,
                payload.notes ?? null
            ]
        );
        const newQuotaHistoryId = result.rows[0].id;
        
        if (payload.assignedCandidates && payload.assignedCandidates.length > 0) {
            await query(`UPDATE applications SET quota_history_id = $1 WHERE id = ANY($2)`, [
                newQuotaHistoryId,
                payload.assignedCandidates
            ]);
        }
        
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
            hiring_quota_id: 'hiring_quota_id',
            openingName: 'opening_name',
            opening_name: 'opening_name',
            manualRequirement: 'manual_requirement',
            manual_requirement: 'manual_requirement',
            manualJobOffers: 'manual_job_offers',
            manual_job_offers: 'manual_job_offers',
            manualFallout: 'manual_fallout',
            manual_fallout: 'manual_fallout',
            manualActiveHires: 'manual_active_hires',
            manual_active_hires: 'manual_active_hires',
            manualBalance: 'manual_balance',
            manual_balance: 'manual_balance',
                          manualDay1ShowUp: 'manual_day_1_show_up',
              manual_day_1_show_up: 'manual_day_1_show_up',
              country: 'country',
              city: 'city',
              requestDate: 'request_date',
              request_date: 'request_date',
              approvalDate: 'approval_date',
              approval_date: 'approval_date',
              isBillable: 'is_billable',
              is_billable: 'is_billable',
              requesterName: 'requester_name',
              requester_name: 'requester_name',
              recruitmentProgress: 'recruitment_progress',
              concatenate: 'concatenate',
              recruitment_progress: 'recruitment_progress',
              concatenate: 'concatenate',
              concatenate: 'concatenate',
            salaryMatrixCategory: 'salary_matrix_category',
            salary_matrix_category: 'salary_matrix_category',
            classType: 'class_type',
            class_type: 'class_type',
            rosterDate: 'roster_date',
            roster_date: 'roster_date',
            hiringReqHc: 'hiring_req_hc',
            hiring_req_hc: 'hiring_req_hc',
            totalOffersExtended: 'total_offers_extended',
            total_offers_extended: 'total_offers_extended',
            netHiresInternal: 'net_hires_internal',
            net_hires_internal: 'net_hires_internal',
            netHiresExternal: 'net_hires_external',
            net_hires_external: 'net_hires_external',
            joBalance: 'jo_balance',
            jo_balance: 'jo_balance',
            notes: 'notes',
            internal_external: 'qualifications',
            requester: 'requester_name',
        };

        Object.entries(payload).forEach(([key, val]) => {
            if (val !== undefined && mapping[key]) {
                assignments.push(`${mapping[key]} = $${idx++}`);
                values.push(val);
            }
        });

        if (assignments.length > 0) {
            values.push(req.params.id);
            const result = await query(
                `UPDATE hiring_quota_history SET ${assignments.join(', ')} WHERE id = $${idx} RETURNING *`,
                values
            );
            if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found' });
        }

        if (payload.assignedCandidates) {
            // First clear assignment for any candidate currently assigned to this quota
            await query(`UPDATE applications SET quota_history_id = NULL WHERE quota_history_id = $1`, [req.params.id]);
            
            // Then assign the selected ones
            if (payload.assignedCandidates.length > 0) {
                await query(`UPDATE applications SET quota_history_id = $1 WHERE id = ANY($2)`, [
                    req.params.id,
                    payload.assignedCandidates
                ]);
            }
        }
        
        const finalRecord = await query(`SELECT * FROM hiring_quota_history WHERE id = $1`, [req.params.id]);
        if (finalRecord.rowCount === 0) return res.status(404).json({ error: 'Record not found' });

        res.json(finalRecord.rows[0]);

    } catch (error) {
        next(error);
    }
});

positionsRouter.post('/', requireAuth, requireRole('admin', 'recruiter', 'recruiter_interviewer', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = positionSchema.parse(req.body);
        const title = payload.title;
        const department = payload.department;
        const description = payload.description || '';
        const requirements = payload.qualifications || '';
        const hiringQuota = parseInt(payload.hiringQuota ?? payload.hiring_quota ?? 0, 10);
        const manualHired = parseInt(payload.manualHired ?? payload.manual_hired ?? 0, 10);
        
        let quotaStartDate = payload.quotaStartDate ?? payload.quota_start_date ?? null;
        if (quotaStartDate === '') quotaStartDate = null;
        
        let quotaEndDate = payload.quotaEndDate ?? payload.quota_end_date ?? null;
        if (quotaEndDate === '') quotaEndDate = null;
        
        let trainingStartDate = payload.trainingStartDate ?? payload.training_start_date ?? null;
        if (trainingStartDate === '') trainingStartDate = null;

        const hiringQuotaId = payload.hiringQuotaId ?? payload.hiring_quota_id ?? '';
        const openingName = payload.openingName ?? payload.opening_name ?? '';
        const categoryId = payload.categoryId ?? payload.category_id ?? null;
        const employmentType = payload.employmentType ?? payload.employment_type ?? 'Full-time';
        const workArrangement = payload.workArrangement ?? payload.work_arrangement ?? '';
        
        const manualRequirement = payload.manualRequirement ?? payload.manual_requirement ?? null;
        const manualJobOffers = payload.manualJobOffers ?? payload.manual_job_offers ?? null;
        const manualFallout = payload.manualFallout ?? payload.manual_fallout ?? null;
        const manualActiveHires = payload.manualActiveHires ?? payload.manual_active_hires ?? null;
                const manualBalance = payload.manualBalance ?? payload.manual_balance ?? null;
        const manualDay1ShowUp = payload.manualDay1ShowUp ?? payload.manual_day_1_show_up ?? null;

        let requestDate = payload.requestDate ?? payload.request_date ?? null;
        if (requestDate === '') requestDate = null;

        let approvalDate = payload.approvalDate ?? payload.approval_date ?? null;
        if (approvalDate === '') approvalDate = null;

        const country = payload.country ?? null;
        const city = payload.city ?? null;
        const isBillable = payload.isBillable ?? payload.is_billable ?? false;
        const requesterName = payload.requesterName ?? payload.requester_name ?? null;
        const recruitmentProgress = payload.recruitmentProgress ?? payload.recruitment_progress ?? null;
        const concatenate = payload.concatenate ?? null;

        const result = await query(
            `INSERT INTO positions (
                title, department, description, requirements, hiring_quota, manual_hired, quota_start_date, quota_end_date, training_start_date, hiring_quota_id, status, employment_type, location, work_arrangement, opening_name, created_by, category_id, manual_requirement, manual_job_offers, manual_fallout, manual_active_hires, manual_balance, manual_day_1_show_up, country, city, request_date, approval_date, is_billable, requester_name, recruitment_progress, concatenate
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
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
                openingName,
                req.user.id,
                categoryId,
                manualRequirement,
                manualJobOffers,
                manualFallout,
                manualActiveHires,
                manualBalance,
                manualDay1ShowUp,
                country,
                city,
                requestDate,
                approvalDate,
                isBillable,
                requesterName,
                recruitmentProgress,
                concatenate
            ]
        );
        clearCache('positions');
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
            categoryId: 'category_id',
            openingName: 'opening_name',
            opening_name: 'opening_name',
            manualRequirement: 'manual_requirement',
            manual_requirement: 'manual_requirement',
            manualJobOffers: 'manual_job_offers',
            manual_job_offers: 'manual_job_offers',
            manualFallout: 'manual_fallout',
            manual_fallout: 'manual_fallout',
            manualActiveHires: 'manual_active_hires',
            manual_active_hires: 'manual_active_hires',
            manualBalance: 'manual_balance',
            manual_balance: 'manual_balance',
                          manualDay1ShowUp: 'manual_day_1_show_up',
              manual_day_1_show_up: 'manual_day_1_show_up',
              country: 'country',
              city: 'city',
              requestDate: 'request_date',
              request_date: 'request_date',
              approvalDate: 'approval_date',
              approval_date: 'approval_date',
              isBillable: 'is_billable',
              is_billable: 'is_billable',
              requesterName: 'requester_name',
              requester_name: 'requester_name',
              recruitmentProgress: 'recruitment_progress',
              recruitment_progress: 'recruitment_progress',
              concatenate: 'concatenate',
              salaryMatrixCategory: 'salary_matrix_category',
              salary_matrix_category: 'salary_matrix_category',
              classType: 'class_type',
              class_type: 'class_type',
              rosterDate: 'roster_date',
              roster_date: 'roster_date',
              hiringReqHc: 'hiring_req_hc',
              hiring_req_hc: 'hiring_req_hc',
              totalOffersExtended: 'total_offers_extended',
              total_offers_extended: 'total_offers_extended',
              netHiresInternal: 'net_hires_internal',
              net_hires_internal: 'net_hires_internal',
              netHiresExternal: 'net_hires_external',
              net_hires_external: 'net_hires_external',
              joBalance: 'jo_balance',
              jo_balance: 'jo_balance',
              notes: 'notes',
            internal_external: 'hiring_type',
            requester: 'requester_name',
        };

        Object.entries(payload).forEach(([key, val]) => {
            if (val !== undefined) {
                if (val === '' && ['quota_start_date', 'quota_end_date', 'training_start_date'].includes(mapping[key])) {
                    val = null;
                }
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
        clearCache('positions');
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

positionsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await query('DELETE FROM positions WHERE id = $1', [req.params.id]);
        clearCache('positions');
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

        clearCache('positions');
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

        clearCache('positions');
        res.json(updateResult.rows[0]);
    } catch (error) {
        next(error);
    }
});
