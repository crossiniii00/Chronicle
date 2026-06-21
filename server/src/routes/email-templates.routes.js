import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { templateUpload } from '../middleware/upload.js';

const templateSchema = z.object({
    name: z.string().min(2),
    subject: z.string().min(2),
    body: z.string().min(10),
    type: z.enum(['REJECTION_INITIAL', 'REJECTION_FINAL', 'INTERVIEW_INVITE', 'INTERVIEW_INVITE_ONLINE', 'OFFER', 'NBI', 'PEME', 'NEO', 'RCBC', 'BGC', 'OTHER']),
    isActive: z.boolean().or(z.string().transform(val => val === 'true')).default(true),
});

export const emailTemplatesRouter = Router();

// Middleware to ensure admin/recruiter access
const canManageTemplates = [requireAuth, requireRole('admin', 'recruiter', 'ops_validator')];

emailTemplatesRouter.get('/', ...canManageTemplates, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT id, name, subject, body, type, is_active as "isActive", attachment_name, attachment_path, created_at, updated_at FROM email_templates ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        // If table doesn't exist, return empty array (local server might not have migrated yet)
        if (error.code === '42P01') {
            return res.json([]);
        }
        next(error);
    }
});

emailTemplatesRouter.post('/', ...canManageTemplates, templateUpload.single('attachment'), async (req, res, next) => {
    try {
        const payload = templateSchema.parse(req.body);
        
        let attachmentName = null;
        let attachmentPath = null;
        if (req.file) {
            attachmentName = req.file.originalname;
            attachmentPath = req.file.path.replace(/\\/g, '/'); // Normalize path
        }

        const result = await query(
            `INSERT INTO email_templates (name, subject, body, type, is_active, attachment_name, attachment_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, subject, body, type, is_active as "isActive", attachment_name, attachment_path`,
            [payload.name, payload.subject, payload.body, payload.type, payload.isActive, attachmentName, attachmentPath]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

emailTemplatesRouter.patch('/:id', ...canManageTemplates, templateUpload.single('attachment'), async (req, res, next) => {
    try {
        const payload = templateSchema.partial().parse(req.body);
        const fields = [];
        const values = [];
        let idx = 1;

        if (payload.name !== undefined) { fields.push(`name = $${idx++}`); values.push(payload.name); }
        if (payload.subject !== undefined) { fields.push(`subject = $${idx++}`); values.push(payload.subject); }
        if (payload.body !== undefined) { fields.push(`body = $${idx++}`); values.push(payload.body); }
        if (payload.type !== undefined) { fields.push(`type = $${idx++}`); values.push(payload.type); }
        if (payload.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(payload.isActive); }

        if (req.file) {
            fields.push(`attachment_name = $${idx++}`); values.push(req.file.originalname);
            fields.push(`attachment_path = $${idx++}`); values.push(req.file.path.replace(/\\/g, '/'));
        }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields provided' });

        values.push(req.params.id);
        const result = await query(
            `UPDATE email_templates SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

emailTemplatesRouter.delete('/:id', ...canManageTemplates, async (req, res, next) => {
    try {
        await query('DELETE FROM email_templates WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// --- SEND EMAIL USING TEMPLATE ---
emailTemplatesRouter.post('/send', ...canManageTemplates, async (req, res, next) => {
    try {
        const { templateType, applicantEmail, applicantName, positionTitle, department, schedule } = req.body;

        if (!templateType || !applicantEmail) {
            return res.status(400).json({ error: 'templateType and applicantEmail are required.' });
        }

        // Find the active template for this type
        const templateRes = await query(
            `SELECT id, name, subject, body, type, attachment_name, attachment_path 
             FROM email_templates 
             WHERE type = $1 AND is_active = true 
             ORDER BY updated_at DESC LIMIT 1`,
            [templateType]
        );

        if (templateRes.rows.length === 0) {
            return res.status(404).json({ error: `No active template found for type: ${templateType}` });
        }

        const template = templateRes.rows[0];

        // Resolve placeholders
        const data = {
            candidate_name: applicantName || '',
            position_title: positionTitle || '',
            department: department || '',
            date: new Date().toLocaleDateString(),
            reason: '',
            schedule: schedule || '',
        };

        let parsedSubject = template.subject;
        let parsedBody = template.body;
        for (const [key, val] of Object.entries(data)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            parsedSubject = parsedSubject.replace(regex, val);
            parsedBody = parsedBody.replace(regex, val);
        }

        // Build attachments array
        const attachments = [];
        if (template.attachment_path) {
            attachments.push({
                filename: template.attachment_name || 'attachment',
                path: template.attachment_path
            });
        }

        // Import email service and send
        const { emailService } = await import('../services/email.service.js');
        const isHtml = parsedBody.includes('<');

        await emailService.sendEmail({
            to: applicantEmail,
            subject: parsedSubject,
            html: isHtml ? parsedBody : undefined,
            text: !isHtml ? parsedBody : undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
        });

        res.json({ success: true, message: `Email sent to ${applicantEmail}` });
    } catch (error) {
        console.error('[Email Send Error]', error);
        next(error);
    }
});

// GET automation settings
emailTemplatesRouter.get('/automation', ...canManageTemplates, async (req, res, next) => {
    try {
        const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'email_automation'");
        const config = configRes.rows[0]?.config_data || {
            WELCOME_USER: true,
            REJECTION_INITIAL: true,
            REJECTION_FINAL: true
        };
        res.json(config);
    } catch (error) {
        next(error);
    }
});

// POST automation settings
emailTemplatesRouter.post('/automation', ...canManageTemplates, async (req, res, next) => {
    try {
        const settings = req.body;
        await query(
            `INSERT INTO report_configs (id, config_data, updated_at) 
             VALUES ('email_automation', $1, NOW())
             ON CONFLICT (id) DO UPDATE SET config_data = $1, updated_at = NOW()`,
            [JSON.stringify(settings)]
        );
        res.json({ success: true, settings });
    } catch (error) {
        next(error);
    }
});

// GET SMTP settings
emailTemplatesRouter.get('/smtp', ...canManageTemplates, async (req, res, next) => {
    try {
        const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'smtp_settings'");
        
        let fromName = 'Recruitment360';
        let fromEmail = 'noreply@company.com';
        const envFrom = process.env.EMAIL_FROM || '';
        const match = envFrom.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
        if (match) {
            fromName = match[1]?.trim() || fromName;
            fromEmail = match[2]?.trim() || fromEmail;
        }

        const systemDefault = {
            host: process.env.SMTP_HOST || '',
            port: process.env.SMTP_PORT || '587',
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
            fromName,
            fromEmail
        };

        const config = configRes.rows[0]?.config_data || systemDefault;
        res.json({
            config,
            systemDefault
        });
    } catch (error) {
        next(error);
    }
});

// POST SMTP settings
emailTemplatesRouter.post('/smtp', ...canManageTemplates, async (req, res, next) => {
    try {
        const settings = req.body;
        await query(
            `INSERT INTO report_configs (id, config_data, updated_at) 
             VALUES ('smtp_settings', $1, NOW())
             ON CONFLICT (id) DO UPDATE SET config_data = $1, updated_at = NOW()`,
            [JSON.stringify(settings)]
        );
        res.json({ success: true, settings });
    } catch (error) {
        next(error);
    }
});

// POST test SMTP connection
emailTemplatesRouter.post('/smtp/test', ...canManageTemplates, async (req, res, next) => {
    try {
        const { host, port, secure, user, pass, fromName, fromEmail, testRecipient } = req.body;

        if (!host || !user || !pass || !testRecipient) {
            return res.status(400).json({ error: 'host, user, pass, and testRecipient are required.' });
        }

        const { default: nodemailer } = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port, 10) || 587,
            secure: secure === true,
            auth: {
                user,
                pass,
            },
        });

        const fromHeader = `"${fromName || 'Recruitment360'}" <${fromEmail || user}>`;

        await transporter.sendMail({
            from: fromHeader,
            to: testRecipient,
            subject: 'SMTP Test Connection',
            text: 'Your SMTP configuration test was successful!',
            html: '<p>Your SMTP configuration test was <strong>successful</strong>!</p>'
        });

        res.json({ success: true, message: `Test email successfully sent to ${testRecipient}` });
    } catch (error) {
        console.error('[SMTP Test Error]', error);
        res.status(500).json({ error: error.message || 'Failed to send test email.' });
    }
});// Trigger reload
