import path from 'node:path';
import fs from 'node:fs';
import { ApplicationRepository } from '../repositories/ApplicationRepository.js';
import { calculateTypingMetrics } from '../utils/metrics-utils.js';
import { emailService } from '../services/email.service.js';
import { writeAuditLog } from '../middleware/audit.js';
import { query, pool } from '../db.js';

// Self-contained query builders to prevent import resolution errors during bulk operations
const buildUpdate = (table, fields, id) => {
    const keys = Object.keys(fields).filter(key => fields[key] !== undefined && key !== 'updated_at');
    if (keys.length === 0 && !fields.updated_at) return null;
    const sets = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    const values = keys.map(key => fields[key]);
    values.push(id);
    const setClause = sets ? `${sets}, updated_at = NOW()` : `updated_at = NOW()`;
    return {
        text: `UPDATE ${table} SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
    };
};

const buildInsert = (table, fields) => {
    const keys = Object.keys(fields).filter(key => fields[key] !== undefined);
    if (keys.length === 0) return null;
    const columns = keys.map(key => `"${key}"`).join(', ');
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const values = keys.map(key => fields[key]);
    return {
        text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    };
};

const ALLOWED_TRANSITIONS = {
    APPLIED: ['TYPING_TEST', 'INITIAL_INTERVIEW', 'REJECTED', 'WITHDRAWN'],
    TYPING_TEST: ['INITIAL_INTERVIEW', 'REJECTED', 'WITHDRAWN'],
    INITIAL_INTERVIEW: ['ASSESSMENT', 'REJECTED', 'WITHDRAWN', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'ENDORSED'],
    QUEUE_ASSIGNED: ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'ASSESSMENT', 'REJECTED', 'WITHDRAWN', 'FINAL_INTERVIEW'],
    INTERVIEW_IN_PROGRESS: ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'ASSESSMENT', 'REJECTED', 'WITHDRAWN', 'PASSED', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'],
    ASSESSMENT: ['FINAL_INTERVIEW', 'REJECTED', 'WITHDRAWN', 'ENDORSED', 'INITIAL_INTERVIEW'],
    ENDORSED: ['FINAL_INTERVIEW', 'REJECTED', 'WITHDRAWN', 'FINAL_VERDICT', 'ASSESSMENT'],
    FINAL_INTERVIEW: ['FINAL_VERDICT', 'PASSED', 'REJECTED', 'WITHDRAWN', 'ENDORSED', 'ASSESSMENT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER'],
    FINAL_INTERVIEW_SCHEDULED: ['FINAL_VERDICT', 'PASSED', 'REJECTED', 'WITHDRAWN', 'ENDORSED', 'ASSESSMENT', 'INTERVIEW_IN_PROGRESS', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER'],
    CLIENT_ASSESSMENT: ['CLIENT_INTERVIEW', 'FINAL_VERDICT', 'REJECTED', 'WITHDRAWN', 'FINAL_INTERVIEW', 'PASSED', 'FOR_JOB_OFFER'],
    CLIENT_INTERVIEW: ['FINAL_VERDICT', 'REJECTED', 'WITHDRAWN', 'CLIENT_ASSESSMENT', 'FINAL_INTERVIEW', 'PASSED', 'FOR_JOB_OFFER'],
    FINAL_VERDICT: ['HIRED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL', 'PASSED', 'WITHDRAWN', 'FINAL_INTERVIEW', 'FAILED', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    PASSED: ['HIRED', 'WAITLISTED', 'CONDITIONAL', 'WITHDRAWN', 'FINAL_VERDICT', 'INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER'],
    HIRED: ['WITHDRAWN', 'FINAL_VERDICT', 'PROMOTION', 'LATERAL_TRANSFER', 'INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    REJECTED: ['INITIAL_INTERVIEW', 'APPLIED', 'FINAL_VERDICT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    FAILED: ['INITIAL_INTERVIEW', 'FINAL_VERDICT', 'REJECTED', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    WAITLISTED: ['HIRED', 'REJECTED', 'WITHDRAWN', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    CONDITIONAL: ['HIRED', 'REJECTED', 'WITHDRAWN', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    WITHDRAWN: ['INITIAL_INTERVIEW', 'FINAL_VERDICT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    NOT_ELIGIBLE_FOR_REHIRE: ['INITIAL_INTERVIEW'],
    PROMOTION: ['HIRED', 'WITHDRAWN'],
    LATERAL_TRANSFER: ['HIRED', 'WITHDRAWN'],
    CONTRACT_SENT: ['HIRED', 'REJECTED', 'WITHDRAWN', 'ACCEPTED_OFFER'],
    ACCEPTED_OFFER: ['HIRED', 'REJECTED', 'WITHDRAWN', 'SENT_JO_AND_BGC'],
    SENT_JO_AND_BGC: ['HIRED', 'REJECTED', 'WITHDRAWN', 'ACCEPTED_OFFER'],
    FOR_JOB_OFFER: ['HIRED', 'REJECTED', 'WITHDRAWN', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    'For Job Offer': ['HIRED', 'REJECTED', 'WITHDRAWN', 'SENT_JO_AND_BGC', 'ACCEPTED_OFFER', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    FOR_PAN: ['HIRED', 'REJECTED', 'WITHDRAWN', 'SENT_JO_AND_BGC', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT']
};


export class ApplicationService {
    static assertValidStatusTransition(fromStatus, toStatus) {
        if (!fromStatus || fromStatus === toStatus) return;
        if (['REJECTED', 'WITHDRAWN', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'OPEN', 'CLOSED', 'HIRED', 'REPROFILED', 'PROMOTED'].includes(toStatus.toUpperCase())) return;

        const validTargets = ALLOWED_TRANSITIONS[fromStatus] ?? [];
        if (!validTargets.includes(toStatus)) {
            // Temporarily disabled restriction to allow all transitions
            // throw new Error(`Invalid workflow transition from ${fromStatus} to ${toStatus}.`);
            console.warn(`[WARNING] Bypassed invalid workflow transition from ${fromStatus} to ${toStatus}.`);
        }
    }

    static mapApplication(app) {
        if (!app) return null;
        const mapped = { ...app };

        if (app.resume_path) {
            const filename = path.basename(app.resume_path);
            mapped.resume_url = `/uploads/resumes/${filename}`;
            mapped.resume_name = app.resume_name || filename;
        } else if (app.resume_data) {
            // Database Fallback: Serve as Data URI
            mapped.resume_url = app.resume_data;
            mapped.resume_name = app.resume_name || 'resume_from_db.pdf';
        }

        if (app.metadata) {
            try {
                const metadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata) : app.metadata;
                if (metadata && typeof metadata === 'object') {
                    if (metadata.initial_account_assignment === 'null' || metadata.initial_account_assignment === 'undefined') {
                        metadata.initial_account_assignment = '';
                    }
                }
                mapped.pis = metadata;
                mapped.metadata = metadata;
                // Spread metadata into root for Masterlist visibility
                if (metadata && typeof metadata === 'object') {
                    Object.keys(metadata).forEach(key => {
                        if (mapped[key] === undefined || mapped[key] === null) {
                            mapped[key] = metadata[key];
                        }
                    });
                }
                
                // Explicitly sync photo_data_url to both root and pis if found in metadata
                if (metadata.photo_data_url) {
                    mapped.photo_data_url = metadata.photo_data_url;
                    mapped.pis.photo_data_url = metadata.photo_data_url;
                }
            } catch {
                mapped.pis = {};
            }
        } else {
            mapped.pis = {};
        }

        // Ensure core columns are reflected in pis for frontend compatibility
        const coreColumns = [
            'highest_education', 'school_name', 'degree', 'graduation_year', 
            'course_strand', 'num_semesters', 'is_graduated', 'school_year_attended',
            'first_name', 'last_name', 'middle_name', 'nickname', 'gender', 
            'civil_status', 'birth_date', 'birth_place', 'nationality',
            'current_address', 'permanent_address', 'phone', 'photo_data_url',
            'hiring_source'
        ];

        coreColumns.forEach(col => {
            if (app[col] !== undefined && app[col] !== null) {
                mapped.pis[col] = app[col];
            }
        });

        // Ensure cross-sync between root and pis photo_data_url
        if (mapped.pis && !mapped.pis.photo_data_url && mapped.photo_data_url) {
            mapped.pis.photo_data_url = mapped.photo_data_url;
        }
        if (mapped.pis && mapped.pis.photo_data_url && !mapped.photo_data_url) {
            mapped.photo_data_url = mapped.pis.photo_data_url;
        }

        const safeArr = (val) => {
            if (!val) return [];
            try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return []; }
        };
        mapped.skills = safeArr(app.skills);
        mapped.medical_conditions = safeArr(app.medical_conditions);

        if (mapped.pis) {
            mapped.pis.skills = mapped.skills;
            mapped.pis.medical_conditions = mapped.medical_conditions;
            
            // Sync validator email if it exists
            if (app.assigned_ops_validator_email && !mapped.pis.ops_validator_email) {
                mapped.pis.ops_validator_email = app.assigned_ops_validator_email;
            }

            // Sync validator status default to Pending if endorsed/final interview
            if (!mapped.pis.ops_validator_status && ['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(app.current_status)) {
                mapped.pis.ops_validator_status = 'Pending';
            }

            // Sync initial account assignment from department
            if ((!mapped.pis.initial_account_assignment || mapped.pis.initial_account_assignment === 'null' || mapped.pis.initial_account_assignment === 'undefined') && app.department) {
                mapped.pis.initial_account_assignment = app.department;
            }

            // Fallback: if metadata lost final_specific_status, recover from master_remarks
            // master_remarks is a top-level DB column and always persists reliably
            if (!mapped.pis.final_specific_status && mapped.master_remarks) {
                mapped.pis.final_specific_status = mapped.master_remarks;
                mapped.metadata.final_specific_status = mapped.master_remarks;
            }
        }

        return mapped;
    }

    static async getAllApplications(user = null) {
        let departmentFilter = null;

        // If user is not an admin, not recruiter_s, and has a department assigned, enforce data isolation
        if (user && user.role !== 'admin' && user.role !== 'recruiter_s' && user.department) {
            departmentFilter = user.department;
        }

        const apps = await ApplicationRepository.findAll(departmentFilter);
        return apps.map(app => {
            try {
                return this.mapApplication(app);
            } catch (err) {
                console.error(`[ApplicationService] Failed to map application ${app?.id}:`, err.message);
                return { ...app, pis: {}, error: 'Mapping Failed' };
            }
        });
    }

    static async getApplicationById(id) {
        const app = await ApplicationRepository.findById(id);
        return this.mapApplication(app);
    }

    static async updateApplicationStatus(id, toStatus, reason, changedByName, user, ip, userAgent, io, patch = {}) {
        // Keep 'For Job Offer' as-is — no normalization to FOR_JOB_OFFER

        // Sanitize incoming patch to ensure UUIDs are not empty strings
        const sanitizeUUID = (val) => (val === "" ? null : val);
        const sanitizedPatch = { ...patch };
        
        // List of common UUID fields in metadata/patch
        const uuidFields = ['assigned_ops_validator_id', 'assigned_interview_room_id', 'applicant_id'];
        uuidFields.forEach(field => {
            if (sanitizedPatch[field] !== undefined) {
                sanitizedPatch[field] = sanitizeUUID(sanitizedPatch[field]);
            }
        });

        try {
            const app = await ApplicationRepository.findById(id);
            if (!app) throw new Error('Application not found');

            const fromStatus = app.current_status;
            this.assertValidStatusTransition(fromStatus, toStatus);

            const updateData = {
                ...sanitizedPatch,
                current_status: toStatus,
                updated_at: new Date()
            };

            // Automated tracker updates for SHEET tab and legacy compatibility
            const metadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata) : (app.metadata || {});
            
            const newMetadata = { 
                ...metadata,
                ...(sanitizedPatch.pis || {}),
                ...(sanitizedPatch.metadata || {})
            };
            let metadataChanged = !!sanitizedPatch.metadata || !!sanitizedPatch.pis;

            // Split / Cloning logic: if a candidate fails one account but has others remaining
            const oldFailed = metadata.failed_accounts || [];
            const newFailed = newMetadata.failed_accounts || [];
            const newlyFailed = newFailed.filter(x => !oldFailed.includes(x));

            if (newlyFailed.length > 0 && toStatus === 'FINAL_INTERVIEW') {
                for (const failedAcc of newlyFailed) {
                    const clonedData = {};
                    
                    // Copy all valid columns from the existing record
                    Object.keys(app).forEach(key => {
                        if (ApplicationRepository.VALID_COLUMNS.has(key) && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                            const val = app[key];
                            if (val !== null && val !== undefined && typeof val === 'object') {
                                clonedData[key] = JSON.stringify(val);
                            } else {
                                clonedData[key] = val;
                            }
                        }
                    });
                    
                    // Assign failed department and REJECTED status
                    clonedData.department = failedAcc;
                    clonedData.current_status = 'REJECTED';
                    clonedData.final_verdict = 'REJECTED';
                    if (user && (user.role === 'ops_validator' || user.role === 'admin')) {
                        clonedData.assigned_ops_validator_id = user.id;
                        clonedData.assigned_ops_validator_name = user.full_name || changedByName;
                    }
                    
                    const clonedMeta = {
                        ...newMetadata,
                        failed_accounts: [failedAcc]
                    };
                    if (clonedMeta.pis) {
                        clonedMeta.pis = {
                            ...clonedMeta.pis,
                            overall_status: 'REJECTED',
                            final_specific_status: 'OV - Failed',
                            final_interview_result: 'FAILED'
                        };
                    }
                    clonedData.metadata = JSON.stringify(clonedMeta);
                    
                    console.log(`[Cloning] Creating failed copy of candidate ${app.applicant_name} for account ${failedAcc}...`);
                    await ApplicationRepository.create(clonedData);
                }
                
                // For the original application, remove the failed accounts from its department
                const oldDept = app.department || '';
                const depts = oldDept.split(',').map(s => s.trim()).filter(Boolean);
                const remainingDepts = depts.filter(d => !newlyFailed.some(nf => nf.trim().toLowerCase() === d.toLowerCase()));
                
                updateData.department = remainingDepts.join(', ');
                
                // Keep failed accounts in the active record's metadata for history tracking
                metadataChanged = true;
            }

            if (newMetadata.initial_account_assignment === 'null' || newMetadata.initial_account_assignment === 'undefined') {
                newMetadata.initial_account_assignment = '';
                metadataChanged = true;
            }

            // Sync overall_status for backward compatibility with components looking at pis.overall_status
            // It must ONLY be one of 'OPEN', 'CLOSED', or 'HIRED'.
            let targetOverallStatus = 'OPEN';
            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(toStatus)) {
                targetOverallStatus = 'HIRED';
            } else if (['REJECTED', 'FAILED', 'WITHDRAWN', 'CLOSED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(toStatus)) {
                targetOverallStatus = 'CLOSED';
            }

            if (newMetadata.overall_status !== targetOverallStatus) {
                newMetadata.overall_status = targetOverallStatus;
                metadataChanged = true;
            }

            if (['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(toStatus)) {
                const currentInitial = newMetadata.initial_account_assignment || '';
                const currentDept = app.department || '';
                if (currentDept) {
                    const existingAccounts = currentInitial.split('|').map(a => a.trim().toLowerCase()).filter(Boolean);
                    if (!existingAccounts.includes(currentDept.toLowerCase())) {
                        const newInitial = currentInitial ? `${currentInitial} | ${currentDept}` : currentDept;
                        newMetadata.initial_account_assignment = newInitial;
                        metadataChanged = true;
                    }
                }
            }

            if (toStatus === 'CLIENT_ASSESSMENT' || (toStatus === 'PASSED' && fromStatus === 'FINAL_INTERVIEW')) {
                newMetadata.ops_validator_status = 'Passed';
                metadataChanged = true;
            } else if (toStatus === 'REJECTED' && fromStatus === 'FINAL_INTERVIEW') {
                newMetadata.ops_validator_status = 'Failed';
                metadataChanged = true;
            }

            if ((toStatus === 'PASSED' || toStatus === 'FOR_JOB_OFFER') && fromStatus === 'CLIENT_INTERVIEW') {
                newMetadata.client_interview_status = 'Passed';
                metadataChanged = true;
            } else if (toStatus === 'REJECTED' && fromStatus === 'CLIENT_INTERVIEW') {
                newMetadata.client_interview_status = 'Failed';
                metadataChanged = true;
            }

            // EXPLICIT ENFORCEMENT: Ensure final_specific_status from the patch is preserved
            // The frontend sends patch.pis.final_specific_status when the user changes it in the grid.
            // This value must be explicitly written to metadata to prevent stale data from overriding it.
            const incomingFSS = sanitizedPatch.pis?.final_specific_status 
                             || sanitizedPatch.metadata?.final_specific_status
                             || sanitizedPatch.metadata?.['Final Specific Status']
                             || sanitizedPatch.metadata?.['Specific Status']
                             || sanitizedPatch.final_specific_status
                             || sanitizedPatch.pis_final_specific_status;
            if (incomingFSS) {
                newMetadata.final_specific_status = incomingFSS;
                newMetadata['Final Specific Status'] = incomingFSS;
                newMetadata['Specific Status'] = incomingFSS;
                metadataChanged = true;
                // Also sync to master_remarks for consistency
                if (!updateData.master_remarks || updateData.master_remarks === metadata.final_specific_status) {
                    updateData.master_remarks = incomingFSS;
                }

            } else if (toStatus === 'HIRED' && !newMetadata.final_specific_status?.toLowerCase()?.includes('hired')) {
                // If transitioning to HIRED but no specific status was provided, default to 'JO - Hired'
                newMetadata.final_specific_status = 'JO - Hired';
                metadataChanged = true;
                updateData.master_remarks = 'JO - Hired';

            }

            if (metadataChanged) {
                updateData.metadata = newMetadata;
            }
            
            // Ensure the pis in updateData also reflects the enforced final_specific_status
            if (incomingFSS && updateData.pis) {
                updateData.pis = { ...updateData.pis, final_specific_status: incomingFSS };
            }
            if (incomingFSS && updateData.metadata) {
                updateData.metadata = {
                    ...updateData.metadata,
                    final_specific_status: incomingFSS,
                    'Final Specific Status': incomingFSS,
                    'Specific Status': incomingFSS
                };
            }


            if (['HIRED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL', 'WITHDRAWN', 'FAILED'].includes(toStatus)) {
                updateData.final_verdict = toStatus;
            } else {
                updateData.final_verdict = null;
            }

            await ApplicationRepository.update(id, updateData, changedByName, reason, true);
            await ApplicationRepository.createStatusHistory(id, fromStatus, toStatus, changedByName, reason);

            // Generate notification for status changes, queue assignments, request acceptances, and cell edits
            try {
                const updatedApp = await ApplicationRepository.findById(id);
                if (updatedApp) {
                    await this.generateNotification(app, updatedApp, changedByName, io, patch, toStatus, fromStatus, reason);
                }
            } catch (notifErr) {
                console.error('[Notification Generation Error]', notifErr);
            }

            this.handleStatusSideEffects(id, fromStatus, toStatus, reason, user, ip, userAgent, io);
            return true;
        } catch (err) {
            const logEntry = `[${new Date().toISOString()}] Error updating status for ${id}: ${err.message}\n${err.stack}\n\n`;
            const logPath = path.resolve(process.cwd(), 'server', 'logs', 'backend_error_log.txt');
            fs.appendFileSync(logPath, logEntry);
            throw err;
        }
    }

    static async handleStatusSideEffects(id, fromStatus, toStatus, reason, user, ip, userAgent, io) {
        writeAuditLog({
            userId: user?.id,
            action: 'application.status.update',
            resourceType: 'application',
            resourceId: id,
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { fromStatus, toStatus },
        }).catch(err => console.error('[Audit Error]', err));

        if (['REJECTED', 'FAILED'].includes(toStatus)) {
            this.triggerRejectionEmail(id, fromStatus, toStatus, reason).catch(err => console.error('[Email Error]', err));
        }

        const terminalStatuses = ['REJECTED', 'WITHDRAWN', 'HIRED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'PASSED', 'ASSESSMENT', 'ENDORSED'];
        if (terminalStatuses.includes(toStatus)) {
            this.syncQueueOnTerminalStatus(id, io).catch(err => console.error('[Queue Sync Error]', err));
        }

        io?.emit('applications:updated', { applicationId: id, fromStatus, toStatus });
        io?.emit('queue:updated');
    }

    static async triggerRejectionEmail(id, fromStatus, toStatus, reason) {
        const applicant = await ApplicationRepository.findWithPosition(id);
        if (!applicant) return;

        if (!applicant.applicant_email) {
            console.warn(`[ApplicationService] Cannot send rejection email for ${id}: No applicant_email found.`);
            return;
        }

        const isInitialStage = ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(fromStatus);
        const typeMatcher = isInitialStage ? 'REJECTION_INITIAL' : 'REJECTION_FINAL';

        // Check if automation is enabled
        const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'email_automation'");
        const automationSettings = configRes.rows[0]?.config_data || {
            WELCOME_USER: true,
            REJECTION_INITIAL: true,
            REJECTION_FINAL: true
        };

        if (automationSettings[typeMatcher] === false) {
            console.log(`[ApplicationService] Automated ${typeMatcher} email is toggled OFF. Skipping.`);
            return;
        }

        // Explicitly query for the correct type, falling back only if intentional
        const templateRes = await query(
            'SELECT * FROM email_templates WHERE type = $1 AND is_active = true LIMIT 1',
            [typeMatcher]
        );

        let template = templateRes.rows[0];
        if (!template && !isInitialStage) {
            // Final stage fallback
            const fallbackRes = await query(
                'SELECT * FROM email_templates WHERE type = \'REJECTION_FINAL\' AND is_active = true LIMIT 1'
            );
            template = fallbackRes.rows[0];
        }

        if (template) {
            console.log(`[ApplicationService] Triggering ${template.type} email to ${applicant.applicant_email}`);
            const result = await emailService.sendAutomatedEmail(applicant, template, {
                reason: reason || '---'
            });

            const logEntry = {
                timestamp: new Date().toISOString(),
                event: 'EMAIL_SENT',
                application_id: id,
                to: applicant.applicant_email,
                type: template.type,
                messageId: result.messageId
            };
            const logPath = path.resolve(process.cwd(), 'server', 'logs', 'email_trigger_log.json');
            fs.appendFileSync(logPath, JSON.stringify(logEntry, null, 2) + ',\n');
        } else {
            console.warn(`[ApplicationService] No active ${typeMatcher} template found for application ${id}`);
        }
    }

    static async syncQueueOnTerminalStatus(id, io) {
        const result = await query(
            `UPDATE queue SET status = 'COMPLETED', updated_at = NOW() WHERE application_id = $1 AND (status = 'WAITING' OR status = 'IN_PROGRESS') RETURNING *`,
            [id]
        );
        result.rows.forEach(entry => io?.emit('queue:updated', entry));
    }

    static async submitTypingTest(id, payload) {
        const metrics = calculateTypingMetrics(payload);
        await ApplicationRepository.createTypingResult(id, payload, metrics);

        await ApplicationRepository.update(id, {
            current_status: 'TYPING_TEST',
            typing_test_wpm: metrics.wordsPerMinute,
            typing_test_accuracy: metrics.accuracyPercent,
            typing_test_duration_seconds: payload.durationSeconds,
            typing_test_completed_at: new Date()
        });

        return metrics;
    }

    static async createInternal(data, user, ip, userAgent) {
        await writeAuditLog({
            userId: user?.id,
            action: 'APPLICATION_INTERNAL_CREATE_SNAPSHOT',
            resourceType: 'application',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { body: data, createdBy: user?.full_name }
        });

        const { work_experience, ...fields } = data;
        if (fields.medical_conditions && typeof fields.medical_conditions === 'object') fields.medical_conditions = JSON.stringify(fields.medical_conditions);
        if (fields.skills && typeof fields.skills === 'object') fields.skills = JSON.stringify(fields.skills);

        const application = await ApplicationRepository.create(fields);
        if (work_experience && Array.isArray(work_experience)) {
            for (const exp of work_experience) await ApplicationRepository.createWorkExperience(application.id, exp);
        }

        await ApplicationRepository.createStatusHistory(application.id, null, application.current_status, user?.full_name, 'Manual Internal Registry Insertion');
        return this.mapApplication(application);
    }

    static async createPublic(payload, file, ip, userAgent) {
        await writeAuditLog({
            action: 'APPLICATION_PUBLIC_SUBMIT_SNAPSHOT',
            resourceType: 'application',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { body: payload, submitter: 'Public Applicant' }
        });

        const metadata = payload.metadata ? JSON.parse(payload.metadata) : {};

        const queueNumRes = await query(
            `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_num 
             FROM (
                 SELECT queue_number FROM queue WHERE created_at >= CURRENT_DATE::timestamptz
                 UNION
                 SELECT queue_number FROM applications WHERE applied_at >= CURRENT_DATE::timestamptz
             ) as combined`
        );
        const generatedQueueNumber = queueNumRes.rows[0].next_num;
        metadata.pregenerated_queue_number = generatedQueueNumber;

        let resumeDataBase64 = null;
        if (file && fs.existsSync(file.path)) {
            try {
                const buffer = fs.readFileSync(file.path);
                const base64 = buffer.toString('base64');
                const mimeType = file.mimetype || 'application/pdf';
                resumeDataBase64 = `data:${mimeType};base64,${base64}`;
            } catch (err) {
                console.error('[ApplicationService] Failed to read resume for DB fallback:', err);
            }
        }

        const safeParseJSON = (val, defaultVal = []) => {
            if (!val || (typeof val === 'string' && val.trim() === '')) return defaultVal;
            try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return defaultVal; }
        };

        const fields = {
            applicant_name: payload.applicantName ?? null,
            applicant_email: payload.applicantEmail ?? null,
            position_id: payload.positionId ?? null,
            position_title: payload.positionTitle ?? null,
            department: (payload.department === 'null' || payload.department === 'undefined') ? null : (payload.department ?? null),
            resume_path: file?.path ?? null,
            resume_name: file?.originalname ?? payload.resumeName ?? null,
            resume_data: resumeDataBase64,
            current_status: 'APPLIED',
            metadata: JSON.stringify(metadata ?? {}),
            phone: (payload.phone || metadata.phone) ?? null,
            birth_date: (payload.birth_date || metadata.birth_date) ?? null,
            gender: (payload.gender || metadata.gender) ?? null,
            civil_status: (payload.civil_status || metadata.civil_status) ?? null,
            nationality: (payload.nationality || metadata.nationality) ?? null,
            current_address: (payload.current_address || metadata.current_address) ?? null,
            permanent_address: (payload.permanent_address || metadata.permanent_address) ?? null,
            highest_education: (payload.highest_education || metadata.highest_education) ?? null,
            school_name: (payload.school_name || metadata.school_name) ?? null,
            degree: (payload.degree || metadata.degree) ?? null,
            graduation_year: (payload.graduation_year || metadata.graduation_year) ?? null,
            emergency_contact_name: (payload.emergency_contact_name || metadata.emergency_contact_name) ?? null,
            emergency_contact_phone: (payload.emergency_contact_phone || metadata.emergency_contact_phone) ?? null,
            emergency_contact_relationship: (payload.emergency_contact_relationship || metadata.emergency_contact_relationship) ?? null,
            signature_data_url: (payload.signature_data_url || metadata.signature_data_url) ?? null,
            nick_name: (payload.nick_name || metadata.nick_name) ?? null,
            place_of_birth: (payload.place_of_birth || metadata.place_of_birth) ?? null,
            sss_no: (payload.sss_no || metadata.sss_no) ?? null,
            tin_no: (payload.tin_no || metadata.tin_no) ?? null,
            pagibig_no: (payload.pagibig_no || metadata.pagibig_no) ?? null,
            philhealth_no: (payload.philhealth_no || metadata.philhealth_no) ?? null,
            flexible_schedule: (payload.flexible_schedule ?? metadata.flexible_schedule) ?? null,
            travel_method: (payload.travel_method || metadata.travel_method) ?? null,
            spouse_name: (payload.spouse_name || metadata.spouse_name) ?? null,
            spouse_occupation: (payload.spouse_occupation || metadata.spouse_occupation) ?? null,
            father_name: (payload.father_name || metadata.father_name) ?? null,
            father_occupation: (payload.father_occupation || metadata.father_occupation) ?? null,
            mother_name: (payload.mother_name || metadata.mother_name) ?? null,
            mother_occupation: (payload.mother_occupation || metadata.mother_occupation) ?? null,
            num_children: (payload.num_children || metadata.num_children) ?? null,
            num_siblings: (payload.num_siblings || metadata.num_siblings) ?? null,
            school_year_attended: (payload.school_year_attended || metadata.school_year_attended) ?? null,
            is_graduated: (payload.is_graduated ?? metadata.is_graduated) ?? null,
            course_strand: (payload.course_strand || metadata.course_strand) ?? null,
            num_semesters: (payload.num_semesters || metadata.num_semesters) ?? null,
            plans_to_pursue_studies: (payload.plans_to_pursue_studies || metadata.plans_to_pursue_studies) ?? null,
            plans_to_go_abroad: (payload.plans_to_go_abroad || metadata.plans_to_go_abroad) ?? null,
            has_medical_conditions: (payload.has_medical_conditions ?? metadata.has_medical_conditions) ?? null,
            medical_conditions: JSON.stringify(safeParseJSON(payload.medical_conditions || metadata.medical_conditions, [])),
            medical_history_notes: (payload.medical_history_notes || metadata.medical_history_notes) ?? null,
            drinks_alcohol: (payload.drinks_alcohol ?? metadata.drinks_alcohol) ?? null,
            smokes: (payload.smokes ?? metadata.smokes) ?? null,
            is_pregnant: (payload.is_pregnant ?? metadata.is_pregnant) ?? null,
            skills: JSON.stringify(safeParseJSON(payload.skills || metadata.skills, [])),
            photo_data_url: (payload.photo_data_url || metadata.photo_data_url) ?? null,
            typing_test_wpm: payload.typing_test_wpm ?? metadata.typing_test_wpm ?? null,
            typing_test_accuracy: payload.typing_test_accuracy ?? metadata.typing_test_accuracy ?? null,
            typing_test_duration_seconds: payload.typing_test_duration_seconds ?? metadata.typing_test_duration_seconds ?? null,
            typing_test_completed_at: new Date(),
            hiring_source: (payload.hiring_source || metadata.hiring_source) ?? 'WALK-IN',
            source: 'WEBAPP',
            queue_number: generatedQueueNumber,
            queue_type: 'INITIAL'
        };

        console.log('[ApplicationService] Generated Queue Number for public submit:', generatedQueueNumber);
        const application = await ApplicationRepository.create(fields);
        console.log('[ApplicationService] Created Application object in DB:', application);
        const workExp = metadata.work_experience || [];
        if (Array.isArray(workExp)) {
            for (const exp of workExp) await ApplicationRepository.createWorkExperience(application.id, exp);
        }
        await ApplicationRepository.createStatusHistory(application.id, null, 'APPLIED', payload.applicantName, 'Initial application submission');
        const mapped = this.mapApplication(application);
        console.log('[ApplicationService] Mapped application returned to frontend:', mapped);
        return mapped;
    }

    static async bulkCreate(records, user = null, ip = null, userAgent = null) {
        const results = [];
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                try {
                    // Start SAVEPOINT immediately to protect the transaction from ANY processing errors
                    await client.query(`SAVEPOINT sp_${i}`);

                    const tableData = {};
                    Object.keys(record).forEach(key => {
                        if (ApplicationRepository.VALID_COLUMNS.has(key)) {
                            tableData[key] = record[key] === "" ? null : record[key];
                        }
                    });
                    
                    // Force visibility for imported records
                    const currentMeta = typeof tableData.metadata === 'string' ? JSON.parse(tableData.metadata) : (tableData.metadata || {});
                    currentMeta.deleted_from_sheet = false;
                    currentMeta.deleted_from_masterlist = false;
                    tableData.metadata = JSON.stringify(currentMeta);

                    // ULTRA-PERMISSIVE DEFAULTS: Ensure database accepts row even if data is missing
                    tableData.applicant_name = tableData.applicant_name || 'N/A';
                    tableData.current_status = tableData.current_status || 'OPEN';
                    tableData.applied_at = tableData.applied_at || new Date().toISOString();
                    tableData.updated_at = tableData.updated_at || new Date().toISOString();
                    tableData.source = tableData.source || 'SHEET_IMPORT';

                    // FORCE NEW RECORD: Treat every row as a unique entry to prevent recruiter email collision
                    let app;
                    const isNew = true;

                    if (isNew) {
                        const { text, values } = buildInsert('applications', tableData);
                        const res = await client.query(text, values);
                        app = res.rows[0];
                    }

                    if (app) results.push(this.mapApplication(app));
                    await client.query(`RELEASE SAVEPOINT sp_${i}`);
                } catch (rowErr) {
                    await client.query(`ROLLBACK TO SAVEPOINT sp_${i}`);
                    const errorDetails = `Row ${i} Error: ${rowErr.message}\nData: ${JSON.stringify(record)}\n---\n`;
                    fs.appendFileSync('scratch/import_errors.log', errorDetails);
                    console.error(`Row import error [${i}]:`, rowErr.message);
                }
            }
            await client.query('COMMIT');
            return results;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async bulkDelete(ids, user, ip, userAgent) {
        if (!ids || !ids.length) return;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete status history first
            await client.query('DELETE FROM status_history WHERE application_id = ANY($1)', [ids]);

            // Delete from queue if they exist
            await client.query('DELETE FROM queue WHERE application_id = ANY($1)', [ids]);

            // Delete applications
            await client.query('DELETE FROM applications WHERE id = ANY($1)', [ids]);

            await client.query('COMMIT');

            writeAuditLog({
                userId: user?.id,
                action: 'APPLICATION_BULK_DELETE',
                resourceType: 'application',
                ipAddress: ip,
                userAgent: userAgent,
                metadata: { count: ids.length, deletedBy: user?.full_name }
            }).catch(console.error);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[ApplicationService] Bulk delete failed:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    static async bulkPatch(ids, fields, user, ip, userAgent) {
        if (!ids || !ids.length) return;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const id of ids) {
                await ApplicationRepository.update(id, fields, user?.full_name || 'System', 'Bulk Patch Update');
            }
            await client.query('COMMIT');

            writeAuditLog({
                userId: user?.id,
                action: 'APPLICATION_BULK_PATCH',
                resourceType: 'application',
                ipAddress: ip,
                userAgent: userAgent,
                metadata: { count: ids.length, fields, updatedBy: user?.full_name }
            }).catch(console.error);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[ApplicationService] Bulk patch failed:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    static getCellEdits(oldApp, newApp) {
        const diffs = [];
        const columnsToCompare = [
            'applicant_name', 'applicant_email', 'applicant_phone', 'position_title', 'department',
            'master_wave', 'master_remarks', 'master_eid', 'master_cp36_email',
            'master_basic_salary', 'master_allowance', 'master_peme_status', 'master_peme_result',
            'master_bgs_status', 'master_email_nbi_status', 'master_nbi_result', 'master_bi_result',
            'hiring_source', 'assigned_recruiter_name', 'master_neo_date', 'master_training_start_date',
            'hired_at', 'interview_completed_at', 'master_first_day_show_up', 'master_second_day_show_up',
            'philhealth_no', 'sss_no', 'tin_no', 'pagibig_no', 'notes'
        ];

        const formatVal = (v) => {
            if (v === null || v === undefined || String(v).trim() === '') return 'empty';
            return `'${v}'`;
        };

        const formatFieldLabel = (field) => {
            if (field.startsWith('master_')) {
                field = field.substring(7);
            }
            return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        for (const col of columnsToCompare) {
            let oldVal = oldApp[col];
            let newVal = newApp[col];
            
            // Normalize empty string and null/undefined
            const isOldEmpty = (oldVal === null || oldVal === undefined || String(oldVal).trim() === '' || oldVal === '---');
            const isNewEmpty = (newVal === null || newVal === undefined || String(newVal).trim() === '' || newVal === '---');

            if (isOldEmpty && isNewEmpty) continue;

            if (col === 'department') {
                const oldNorm = String(oldVal || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).sort().join(',');
                const newNorm = String(newVal || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).sort().join(',');
                if (oldNorm === newNorm) continue;
            }

            if (String(oldVal) !== String(newVal)) {
                diffs.push({
                    field: formatFieldLabel(col),
                    oldVal: isOldEmpty ? 'empty' : formatVal(oldVal),
                    newVal: isNewEmpty ? 'empty' : formatVal(newVal)
                });
            }
        }

        // Compare metadata/pis properties
        const oldMeta = typeof oldApp.metadata === 'string' ? JSON.parse(oldApp.metadata || '{}') : (oldApp.metadata || {});
        const newMeta = typeof newApp.metadata === 'string' ? JSON.parse(newApp.metadata || '{}') : (newApp.metadata || {});

        const metaKeys = new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]);
        const excludeKeys = new Set([
            'reprofile_history', 'deleted_from_masterlist', 'deleted_from_sheet', 'photo_data_url', 'signature_data_url',
            'pregenerated_queue_number', 'last_updated_by', 'recruiter_s_scheduling_status', 'endorsement_meeting_date',
            'endorsement_meeting_end_date', 'endorsement_meeting_body', 'assigned_ops_validator_id', 'assigned_ops_validator_name',
            'ops_validator_status', 'endorsement_confirmed', 'endorsed_to_recruiter_s', 'ops_validator_email', 'ops_validator_notes',
            'client_interview_status', 'client_interviewer_email', 'client_interview_notes', 'final_specific_status',
            'final_interview_result', 'initial_interview_results', 'interview_completed_at', 'interview_type', 'overall_status',
            'interview_mode', 'interview_room', 'assigned_interview_room_name', 'interview_room_name'
        ]);

        for (const key of metaKeys) {
            if (excludeKeys.has(key)) continue;
            if (columnsToCompare.includes(key) || columnsToCompare.includes(`master_${key}`)) continue;

            let oldVal = oldMeta[key];
            let newVal = newMeta[key];

            if (typeof oldVal === 'object' || typeof newVal === 'object') continue;

            const isOldEmpty = (oldVal === null || oldVal === undefined || String(oldVal).trim() === '' || oldVal === '---');
            const isNewEmpty = (newVal === null || newVal === undefined || String(newVal).trim() === '' || newVal === '---');

            if (isOldEmpty && isNewEmpty) continue;

            if (String(oldVal) !== String(newVal)) {
                diffs.push({
                    field: formatFieldLabel(key),
                    oldVal: isOldEmpty ? 'empty' : formatVal(oldVal),
                    newVal: isNewEmpty ? 'empty' : formatVal(newVal)
                });
            }
        }

        return diffs;
    }    static async generateNotification(oldApp, updatedApp, changedByName, io, patch = {}, toStatus = null, fromStatus = null, reason = '') {
        try {
            if (!updatedApp) return;
            
            let notifTitle = 'Candidate Update';
            let notifMessage = `${updatedApp.applicant_name} status updated`;
            let notifType = 'status_change';

            const statusChanged = toStatus || (oldApp && oldApp.current_status !== updatedApp.current_status);
            const targetStatus = toStatus || updatedApp.current_status;
            const sourceStatus = fromStatus || (oldApp ? oldApp.current_status : null);
            const cellEdits = this.getCellEdits(oldApp, updatedApp);

            if (statusChanged) {
                // Suppress notifications for transitions between FINAL_INTERVIEW_SCHEDULED and FINAL_INTERVIEW
                if ((sourceStatus === 'FINAL_INTERVIEW_SCHEDULED' && targetStatus === 'FINAL_INTERVIEW') ||
                    (sourceStatus === 'FINAL_INTERVIEW' && targetStatus === 'FINAL_INTERVIEW_SCHEDULED')) {
                    return;
                }

                // Standard status update messages
                const isOpsChange = targetStatus === 'PASSED' || targetStatus === 'FAILED' || targetStatus === 'PENDING' ||
                                    patch?.ops_validator_status === 'Pending' || 
                                    patch?.metadata?.ops_validator_status === 'Pending' ||
                                    patch?.pis?.ops_validator_status === 'PASSED' ||
                                    patch?.pis?.ops_validator_status === 'FAILED' ||
                                    ['For Job Offer', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(targetStatus) ||
                                    updatedApp.final_verdict === 'PASSED' ||
                                    updatedApp.final_verdict === 'REJECTED';

                if (targetStatus === 'QUEUE_ASSIGNED') {
                    notifTitle = 'Candidate Queued';
                    const qType = patch.queue_type || 'INITIAL';
                    const qNum = patch.queue_number || 'N/A';
                    notifMessage = `${updatedApp.applicant_name} has been assigned to the ${qType} queue (Queue #${qNum})`;
                    notifType = 'queue_assigned';
                } else if (sourceStatus === 'APPLIED' && targetStatus === 'INITIAL_INTERVIEW' && reason?.toLowerCase()?.includes('accept')) {
                    notifTitle = 'Application Accepted';
                    notifMessage = `${updatedApp.applicant_name}'s application has been accepted for Initial Interview by ${changedByName}`;
                    notifType = 'request_accepted';
                } else if (patch?.metadata?.recruiter_s_scheduling_status === 'RECEIVED') {
                    notifTitle = 'Application Accepted';
                    notifMessage = `${updatedApp.applicant_name}'s specialized queue request has been accepted by ${changedByName}`;
                    notifType = 'request_accepted';
                } else if (isOpsChange) {
                    let verdictLabel = 'PENDING';
                    const actualVerdict = updatedApp.final_verdict || patch?.pis?.ops_validator_status || targetStatus;
                    if (actualVerdict === 'PASSED' || actualVerdict === 'HIRED' || ['For Job Offer', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(actualVerdict)) {
                        verdictLabel = 'PASSED';
                    } else if (actualVerdict === 'FAILED' || actualVerdict === 'REJECTED' || actualVerdict === 'FAIL') {
                        verdictLabel = 'FAILED';
                    }

                    let actorTitle = '';
                    if (changedByName && changedByName !== 'System' && changedByName !== 'Audit Officer') {
                        try {
                            const userRes = await query("SELECT role FROM users WHERE full_name = $1 LIMIT 1", [changedByName]);
                            if (userRes.rows.length > 0) {
                                const role = userRes.rows[0].role;
                                if (role === 'ops_validator') {
                                    actorTitle = 'Operations Validator ';
                                } else if (role === 'admin' || role === 'super_admin') {
                                    actorTitle = 'Admin ';
                                } else if (role.startsWith('recruiter')) {
                                    actorTitle = 'Recruiter ';
                                } else {
                                    actorTitle = role.charAt(0).toUpperCase() + role.slice(1) + ' ';
                                }
                            }
                        } catch (err) {
                            console.error('[Notification Generation] Failed to fetch user role:', err);
                        }
                    }

                    notifTitle = 'Evaluation Verdict Update';
                    notifMessage = `Endorsed candidate ${updatedApp.applicant_name} has been marked as ${verdictLabel} by ${actorTitle}${changedByName}`;
                    notifType = 'evaluation_verdict';
                } else {
                    notifTitle = 'Candidate Progressed';
                    notifMessage = `${updatedApp.applicant_name} moved from ${sourceStatus || 'APPLIED'} to ${targetStatus} by ${changedByName}`;
                    notifType = 'status_change';
                }
            } else if (cellEdits.length > 0) {
                notifTitle = 'Cell Edited';
                notifType = 'cell_edit';
                if (cellEdits.length === 1) {
                    const edit = cellEdits[0];
                    notifMessage = `${updatedApp.applicant_name}'s ${edit.field} changed from ${edit.oldVal} to ${edit.newVal} by ${changedByName}`;
                } else {
                    notifMessage = `${updatedApp.applicant_name}'s fields were updated by ${changedByName}: ` +
                        cellEdits.map(e => `${e.field} (${e.oldVal} ➔ ${e.newVal})`).join(', ');
                }
            } else {
                // Fallback / general update
                notifTitle = 'Candidate Updated';
                notifMessage = `${updatedApp.applicant_name}'s record was updated by ${changedByName}`;
                notifType = 'general_update';
            }


            // Notification routing logic
            const notifyUserIds = new Set();
            
            // 1. All active admins and recruiters share all notifications
            const adminRecruiterRes = await query(`
                SELECT id FROM users 
                WHERE (role = 'admin' OR role = 'super_admin' OR role LIKE 'recruiter%') 
                  AND is_active = true
            `);
            (adminRecruiterRes.rows || []).forEach(u => notifyUserIds.add(u.id));

            // 2. Active ops validators only see notifications within their department (account) 
            //    unless the recruiter explicitly endorsed/assigned the candidate to them
            const opsValRes = await query(`
                SELECT id, department FROM users 
                WHERE role = 'ops_validator' AND is_active = true
            `);
            const opsValidators = opsValRes.rows || [];
            for (const ov of opsValidators) {
                const isAssigned = updatedApp.assigned_ops_validator_id === ov.id;
                const isSameDept = updatedApp.department && ov.department && 
                                   updatedApp.department.toLowerCase() === ov.department.toLowerCase();
                
                if (isSameDept || isAssigned) {
                    notifyUserIds.add(ov.id);
                }
            }

            // 3. If queue assignment, also notify the interviewer
            if (toStatus === 'QUEUE_ASSIGNED' && patch.interviewer_id) {
                notifyUserIds.add(patch.interviewer_id);
            }

            // Insert notifications for all users in a single bulk query
            if (notifyUserIds.size > 0) {
                await query(
                    `INSERT INTO notifications (user_id, title, message, notification_type)
                     SELECT unnest($1::uuid[]), $2, $3, $4`,
                    [Array.from(notifyUserIds), notifTitle, notifMessage, notifType]
                );
            }

            // Emit socket event to notify clients immediately
            io?.emit('notification:new', {
                title: notifTitle,
                message: notifMessage,
                notification_type: notifType
            });
        } catch (notifErr) {
            console.error('[Notification Generation Error]', notifErr);
        }
    }
}
