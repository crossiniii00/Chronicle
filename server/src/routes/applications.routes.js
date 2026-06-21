import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { resumeUpload, recordingUpload } from '../middleware/upload.js';
import { ApplicationService } from '../services/ApplicationService.js';
import { ApplicationRepository } from '../repositories/ApplicationRepository.js';
import {
    publicApplicationSchema,
    statusUpdateSchema,
    typingResultSchema
} from '../schemas/application.schema.js';

export const applicationsRouter = Router();

// --- LISTINGS ---

applicationsRouter.get('/', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const apps = await ApplicationService.getAllApplications(req.user);
        res.json(apps);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/all/status-history', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const departmentFilter = (req.user && req.user.role !== 'admin') ? req.user.department : null;
        const history = await ApplicationRepository.getFullStatusHistory(departmentFilter);
        res.json(history);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/:id', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const app = await ApplicationService.getApplicationById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });
        res.json(app);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/:id/status-history', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const history = await ApplicationRepository.getStatusHistoryByApplication(req.params.id);
        res.json(history);
    } catch (error) {
        next(error);
    }
});

// --- CREATION ---

applicationsRouter.post('/internal', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const application = await ApplicationService.createInternal(req.body, req.user, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated');
        res.status(201).json(application);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/public', resumeUpload.single('resume'), async (req, res, next) => {
    try {
        const payload = publicApplicationSchema.parse(req.body);
        const application = await ApplicationService.createPublic(payload, req.file, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated');
        res.status(201).json(application);
    } catch (error) {
        next(error);
    }
});

// --- ACTIONS ---

applicationsRouter.post('/:id/typing-test', requireAuth, async (req, res, next) => {
    try {
        const payload = typingResultSchema.parse(req.body);
        const metrics = await ApplicationService.submitTypingTest(req.params.id, payload);
        res.json(metrics);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/:id/upload-recording', requireAuth, recordingUpload.single('recording'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No recording file provided' });
        }
        const fileUrl = `/uploads/recordings/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/:id/queue', requireAuth, async (req, res, next) => {
    try {
        const { queueType, interviewerId, interviewerName } = req.body;

        const app = await ApplicationRepository.findById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });

        let nextNum = app.queue_number;
        if (!nextNum || (queueType && queueType !== 'INITIAL')) {
            const numRes = await query(
                `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_num 
                 FROM queue 
                 WHERE created_at >= CURRENT_DATE::timestamptz 
                   AND created_at < (CURRENT_DATE::timestamptz + interval '1 day') 
                   AND queue_type = $1`,
                [queueType || 'INITIAL']
            );
            nextNum = numRes.rows[0].next_num;
        }

        const result = await query(
            `INSERT INTO queue (application_id, applicant_name, queue_number, queue_type, interviewer_id, interviewer_name)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [req.params.id, app.applicant_name, nextNum, queueType || 'INITIAL', interviewerId?.trim() || null, interviewerName?.trim() || null]
        );

        const queueEntry = result.rows[0];

        // Ensure application status is updated to QUEUE_ASSIGNED in the DB
        await ApplicationService.updateApplicationStatus(
            req.params.id,
            'QUEUE_ASSIGNED',
            `Candidate queued for ${queueType || 'INITIAL'} interview`,
            req.user.full_name || 'System',
            req.user,
            req.ip,
            req.get('user-agent'),
            req.app.locals.io,
            {
                queue_type: queueType || 'INITIAL',
                queue_number: nextNum
            }
        );

        req.app.locals.io?.emit('queue:updated', queueEntry);

        res.status(201).json(queueEntry);
    } catch (error) {
        next(error);
    }
});

// --- UPDATES ---

applicationsRouter.patch('/:id/status', requireAuth, requireRole('recruiter', 'recruiter_interviewer', 'admin', 'ops_validator'), async (req, res, next) => {
    try {
        const payload = statusUpdateSchema.parse(req.body);
        await ApplicationService.updateApplicationStatus(
            req.params.id,
            payload.toStatus,
            payload.reason,
            req.user.full_name,
            req.user,
            req.ip,
            req.get('user-agent'),
            req.app.locals.io,
            payload.patch
        );
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

applicationsRouter.patch('/bulk-patch', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const { ids, fields } = req.body;
        await ApplicationService.bulkPatch(ids, fields, req.user, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

applicationsRouter.patch('/:id', requireAuth, requireRole('recruiter', 'recruiter_interviewer', 'admin', 'ops_validator'), async (req, res, next) => {
    try {
        const oldApp = await ApplicationRepository.findById(req.params.id);
        const result = await ApplicationRepository.update(
            req.params.id,
            req.body,
            req.user?.full_name || 'System',
            req.body.change_reason || 'Manual Update'
        );
        if (!result) return res.status(400).json({ error: 'No fields provided' });
        const mapped = ApplicationService.mapApplication(result);

        if (oldApp) {
            await ApplicationService.generateNotification(
                oldApp,
                result,
                req.user?.full_name || 'System',
                req.app.locals.io,
                req.body
            );
        }

        console.log(`[PATCH ROUTE] Updated result for id ${req.params.id}:`, mapped.current_status);
        req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id, toStatus: mapped.current_status });
        res.json(mapped);
    } catch (error) {
        console.error(`[PATCH ROUTE] Error:`, error);
        next(error);
    }
});

applicationsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await ApplicationRepository.delete(req.params.id);
        req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id });
        res.status(204).send();
    } catch (error) {
        next(error);
    }

});

applicationsRouter.post('/bulk', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const results = await ApplicationService.bulkCreate(req.body, req.user, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated');
        res.status(201).json(results);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/bulk-delete', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const { ids } = req.body;
        await ApplicationService.bulkDelete(ids, req.user, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

