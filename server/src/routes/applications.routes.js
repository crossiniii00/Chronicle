import { Router } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
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

// --- PUBLIC ---

applicationsRouter.get('/public/by-email/:email', async (req, res, next) => {
    try {
        const { email } = req.params;
        const app = await ApplicationRepository.findByEmail(email);
        
        if (!app) {
            return res.status(404).json({ error: 'No application found with this email' });
        }
        
        const tests = await ApplicationRepository.getTypingTestResultsByApplication(app.id);
        const bestTest = tests && tests.length > 0 
            ? tests.reduce((prev, current) => (prev.words_per_minute > current.words_per_minute) ? prev : current)
            : null;
            
        res.json({
            application: app,
            typing_test_result: bestTest ? {
                wpm: bestTest.words_per_minute,
                accuracy: bestTest.accuracy_percent,
                timeTaken: 60,
                errors: 0,
                totalWords: 0
            } : null
        });
    } catch (error) {
        next(error);
    }
});

// --- LISTINGS ---

applicationsRouter.get('/', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const apps = await ApplicationService.getAllApplications(req.user);
        res.json(apps);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/counts/badges', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const counts = await ApplicationService.getBadgeCounts(req.user, req.body);
        res.json(counts);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/all/status-history', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        let departmentFilter = null;
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'superadmin' && req.user.department) {
            const userDeptUpper = req.user.department.trim().toUpperCase();
            if (userDeptUpper !== 'RECRUITER' && userDeptUpper !== 'HR' && userDeptUpper !== 'HUMAN RESOURCES') {
                departmentFilter = req.user.department;
            }
        }
        const history = await ApplicationRepository.getFullStatusHistory(departmentFilter);
        res.json(history);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/bulk-get', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ids array is required' });
        const apps = await Promise.all(ids.map(id => ApplicationService.getApplicationById(id, req.user)));
        res.json(apps.filter(a => a));
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/:id', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const app = await ApplicationService.getApplicationById(req.params.id, req.user);
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

applicationsRouter.get('/:id/typing-tests', requireAuth, requireRole('recruiter', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const tests = await ApplicationRepository.getTypingTestResultsByApplication(req.params.id);
        res.json(tests);
    } catch (error) {
        next(error);
    }
});

// --- CREATION ---

applicationsRouter.post('/internal', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const application = await ApplicationService.createInternal(req.body, req.user, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated', { applicationId: application.id, data: application });
        res.status(201).json(application);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/public', resumeUpload.single('resume'), async (req, res, next) => {
    try {
        const payload = publicApplicationSchema.parse(req.body);
        const application = await ApplicationService.createPublic(payload, req.file, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated', { applicationId: application.id, data: application });
        res.status(201).json(application);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.get('/public/:id', async (req, res, next) => {
    try {
        const app = await ApplicationService.getApplicationById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });
        res.json(app);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.patch('/public/:id', resumeUpload.single('resume'), async (req, res, next) => {
    try {
        const payload = publicApplicationSchema.parse(req.body);
        const application = await ApplicationService.updatePublicOnCall(req.params.id, payload, req.file, req.ip, req.get('user-agent'));
        req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id, toStatus: application.current_status, data: application });
        res.json(application);
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/refresh-candidates', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await execPromise('node src/scripts/refreshCandidates.js');
        req.app.locals.io?.emit('applications:updated');
        res.json({ success: true });
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
        const { queueType, queuePrefix, interviewerId, interviewerName } = req.body;

        const app = await ApplicationRepository.findById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });

        let nextNum = app.queue_number;
        const prefix = queuePrefix || 'Q';
        
        if (!nextNum || (queueType && queueType !== 'INITIAL') || app.queue_prefix !== prefix) {
            const numRes = await query(
                `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_num 
                 FROM queue 
                 WHERE created_at >= NOW() - INTERVAL '24 hours'
                   AND queue_type = $1 AND queue_prefix = $2`,
                [queueType || 'INITIAL', prefix]
            );
            nextNum = numRes.rows[0].next_num;
        }

        const result = await query(
            `INSERT INTO queue (application_id, applicant_name, queue_number, queue_prefix, queue_type, interviewer_id, interviewer_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.params.id, app.applicant_name, nextNum, prefix, queueType || 'INITIAL', interviewerId?.trim() || null, interviewerName?.trim() || null]
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
                queue_number: nextNum,
                queue_prefix: prefix
            }
        );

        req.app.locals.io?.emit('queue:updated', queueEntry);

        res.status(201).json(queueEntry);
    } catch (error) {
        next(error);
    }
});

// --- UPDATES ---

applicationsRouter.patch('/:id/status', requireAuth, requireRole('recruiter', 'recruiter_interviewer', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        const payload = statusUpdateSchema.parse(req.body);
        console.log('PATCH PAYLOAD KEYS:', Object.keys(payload.patch || {}));
        if (payload.patch?.interview_responses) {
            console.log('INTERVIEW_RESPONSES IS PRESENT');
        } else {
            console.log('INTERVIEW_RESPONSES IS ABSENT');
        }
        console.log('PATCH PAYLOAD:', JSON.stringify(payload.patch, null, 2));
        const updatedApp = await ApplicationService.updateApplicationStatus(
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
        req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id, data: updatedApp ? ApplicationService.mapApplication(updatedApp) : null });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

applicationsRouter.patch('/bulk-patch', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const { ids, fields } = req.body;
        const updatedApps = await ApplicationService.bulkPatch(ids, fields, req.user, req.ip, req.get('user-agent'));
        if (updatedApps && updatedApps.length) {
            updatedApps.forEach(app => {
                req.app.locals.io?.emit('applications:updated', { applicationId: app.id, data: app });
            });
        } else {
            req.app.locals.io?.emit('applications:updated');
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

applicationsRouter.patch('/:id', requireAuth, requireRole('recruiter', 'recruiter_interviewer', 'admin', 'ops_validator', 'guest_interviewer'), async (req, res, next) => {
    try {
        console.log('PATCH /:id', req.params.id, JSON.stringify(req.body, null, 2));
        const oldApp = await ApplicationRepository.findById(req.params.id);
        const result = await ApplicationRepository.update(
            req.params.id,
            req.body,
            req.user?.full_name || 'System',
            req.body.change_reason || 'Manual Update'
        );
        if (!result) return res.status(400).json({ error: 'No fields provided' });
        const mapped = ApplicationService.mapApplication(result);

        ApplicationService.updateCachedApplication(req.params.id, mapped);

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
        
        if (req.body.change_reason !== 'Autosave' && req.body.is_autosave !== true) {
            req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id, toStatus: mapped.current_status, data: mapped });
        }
        
        res.json(mapped);
    } catch (error) {
        console.error(`[PATCH ROUTE] Error:`, error);
        next(error);
    }
});

applicationsRouter.delete('/:id', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        await ApplicationRepository.delete(req.params.id);
        ApplicationService.removeCachedApplication(req.params.id);
        req.app.locals.io?.emit('applications:updated', { applicationId: req.params.id, deleted: true });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

applicationsRouter.post('/bulk', requireAuth, requireRole('admin', 'recruiter'), async (req, res, next) => {
    try {
        const results = await ApplicationService.bulkCreate(req.body, req.user, req.ip, req.get('user-agent'));
        ApplicationService.invalidateCache();
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
        if (ids && ids.length) {
            ids.forEach(id => {
                req.app.locals.io?.emit('applications:updated', { applicationId: id, deleted: true });
            });
        } else {
            req.app.locals.io?.emit('applications:updated');
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

