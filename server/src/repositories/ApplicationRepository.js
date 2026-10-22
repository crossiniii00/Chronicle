import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

export function normalizeStatus(status) {
    if (!status || typeof status !== 'string') return status;
    const trimmed = status.trim();
    const upper = trimmed.toUpperCase().replace(/\s+/g, '_');

    const mapping = {
        'PASSED': 'PASSED',
        'FAILED': 'FAILED',
        'REJECTED': 'REJECTED',
        'REJECCTED': 'REJECTED',
        'REJECTTED': 'REJECTED',
        'APPLIED': 'APPLIED',
        'TYPING_TEST': 'TYPING_TEST',
        'TYPINGTEST': 'TYPING_TEST',
        'INITIAL_INTERVIEW': 'INITIAL_INTERVIEW',
        'INITIALINTERVIEW': 'INITIAL_INTERVIEW',
        'INTERVIEW_IN_PROGRESS': 'INTERVIEW_IN_PROGRESS',
        'INTERVIEWINPROGRESS': 'INTERVIEW_IN_PROGRESS',
        'QUEUE_ASSIGNED': 'QUEUE_ASSIGNED',
        'QUEUEASSIGNED': 'QUEUE_ASSIGNED',
        'ASSESSMENT': 'ASSESSMENT',
        'FINAL_INTERVIEW': 'FINAL_INTERVIEW',
        'FINAL_iNTERVIEWW': 'FINAL_INTERVIEW',
        'FINAL_INTERVIEWW': 'FINAL_INTERVIEW',
        'FINALINTERVIEW': 'FINAL_INTERVIEW',
        'FINALINTERVIEWW': 'FINAL_INTERVIEW',
        'FINAL_INTERVIEW_SCHEDULED': 'FINAL_INTERVIEW_SCHEDULED',
        'FINALINTERVIEWSCHEDULED': 'FINAL_INTERVIEW_SCHEDULED',
        'CLIENT_ASSESSMENT': 'CLIENT_ASSESSMENT',
        'CLIENTASSESSMENT': 'CLIENT_ASSESSMENT',
        'CLIENT_INTERVIEW': 'CLIENT_INTERVIEW',
        'CLIENTINTERVIEW': 'CLIENT_INTERVIEW',
        'FOR_JOB_OFFER': 'For Job Offer',
        'FORJOBOFFER': 'For Job Offer',
        'FOR_PAN': 'For PAN',
        'FORPAN': 'For PAN',
        'SENT_JO_AND_BGC': 'Sent JO and BGC',
        'SENTJOANDBGC': 'Sent JO and BGC',
        'ENDORSED': 'ENDORSED',
        'ACCEPTED_OFFER': 'Accepted Offer',
        'ACCEPTEDOFFER': 'Accepted Offer',
        'WITHDRAWN': 'Withdrawn',
        'FINAL_VERDICT': 'FINAL_VERDICT',
        'FINALVERDICT': 'FINAL_VERDICT',
        'HIRED': 'HIRED',
        'PROMOTION': 'Promoted',
        'PROMOTED': 'Promoted',
        'LATERAL': 'Lateral Transfer',
        'LATERAL_TRANSFER': 'Lateral Transfer',
        'LATERALTRANSFER': 'Lateral Transfer',
        'NOT_ELIGIBLE_FOR_REHIRE': 'NOT_ELIGIBLE_FOR_REHIRE',
        'NOTELIGIBLEFORREHIRE': 'NOT_ELIGIBLE_FOR_REHIRE',
        'OPEN': 'OPEN',
        'CLOSED': 'CLOSED'
    };

    if (mapping[upper]) return mapping[upper];

    return upper;
}


const VALID_COLUMNS = new Set([
    'id', 'applicant_id', 'applicant_name', 'applicant_email', 'position_id', 'position_title', 'department',
    'applied_at', 'current_status', 'current_status_2', 'current_status_3', 'updated_at', 'created_at', 'resume_path', 'resume_name',
    'resume_data', 'typing_test_wpm', 'typing_test_accuracy', 'typing_test_duration_seconds',
    'typing_test_completed_at', 'assessment_score', 'interview_notes', 'final_interview_notes',
    'interview_responses', 'interview_grading', 'interview_room', 'interview_recording_url',
    'interview_completed_at', 'hired_at', 'metadata', 'hiring_source', 'source',
    'client_assessment_score', 'client_interview_remarks',
    'final_verdict',
    'master_column', 'master_wave', 'master_eid', 'master_remarks', 'master_hiring_request_id',
    'master_rcbc_status', 'master_referee_eid', 'master_win_date', 'master_claim_date', 'master_bi_result', 'master_bi_results',
    'master_bi_endorsement_date', 'master_nbi_result', 'master_nbi_status', 'master_email_nbi_status',
    'master_bgs_status', 'master_discord_handle', 'master_peme_result', 'master_peme_status',
    'master_neo_date', 'master_allowance', 'master_basic_salary', 'master_training_start_date',
    'master_cp36_email', 'master_last_name', 'master_first_name', 'master_middle_name', 'master_h2r_status',
    'master_id_remarks',
    'master_sss_status', 'master_philhealth_status', 'master_pagibig_status',
    'master_first_day_show_up', 'master_second_day_show_up', 'master_last_keep_warm',
    'philhealth_no', 'sss_no', 'tin_no', 'pagibig_no', 'drug_test',
    'first_name', 'last_name', 'middle_name', 'preferred_nickname', 'gender', 'civil_status', 'birth_date',
    'nationality', 'current_address', 'permanent_address', 'highest_education',
    'school_name', 'degree', 'graduation_year', 'emergency_contact_name', 'emergency_contact_phone',
    'emergency_contact_relationship', 'signature_data_url', 'nick_name', 'place_of_birth', 'phone',
    'flexible_schedule', 'travel_method', 'spouse_name', 'spouse_occupation', 'father_name',
    'father_occupation', 'mother_name', 'mother_occupation', 'num_children', 'num_siblings',
    'school_year_attended', 'is_graduated', 'course_strand', 'num_semesters',
    'plans_to_pursue_studies', 'plans_to_go_abroad', 'has_medical_conditions', 'medical_conditions',
    'medical_history_notes', 'drinks_alcohol', 'smokes', 'is_pregnant', 'skills',
    'endorsement_meeting_date',
    'endorsement_meeting_end_date', 'endorsement_meeting_body', 'assigned_recruiter_id',
    'assigned_recruiter_name', 'assigned_ops_validator_id', 'assigned_ops_validator_name',
    'assigned_interview_room_name', 'queue_number', 'queue_type', 'queue_prefix', 'rejection_reason', 'notes', 'highlight_color',
    'quota_history_id', 'is_hidden'
]);

export class ApplicationRepository {
    static VALID_COLUMNS = VALID_COLUMNS;

    static async findAll(department = null) {
        const columnsToSelect = Array.from(VALID_COLUMNS)
            .filter(col => col !== 'resume_data' && col !== 'signature_data_url')
            .map(col => `a."${col}"`)
            .join(', ');

        let sql = `
            SELECT ${columnsToSelect}, u.email as assigned_ops_validator_email,
                   COALESCE(ttr.attempts, 0) as typing_test_attempts,
                   COALESCE(q_int.assigned_interviewer_name, sh_int.changed_by_name) as interviewer_name,
                   sched_by.changed_by_name as scheduled_by,
                   fail_details.details as failure_details
            FROM applications a
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
            LEFT JOIN (
                SELECT application_id, COUNT(*)::int as attempts
                FROM typing_test_results
                GROUP BY application_id
            ) ttr ON ttr.application_id = a.id
            LEFT JOIN (
                SELECT DISTINCT ON (application_id) application_id, assigned_interviewer_name
                FROM queue
                WHERE queue_type = 'INITIAL' AND assigned_interviewer_name IS NOT NULL
                ORDER BY application_id, created_at DESC
            ) q_int ON q_int.application_id = a.id
            LEFT JOIN (
                SELECT DISTINCT ON (sh.application_id) sh.application_id, sh.changed_by_name
                FROM status_history sh
                JOIN users usr ON sh.changed_by_name = usr.full_name
                WHERE sh.from_status = 'INITIAL_INTERVIEW'
                ORDER BY sh.application_id, sh.changed_at DESC
            ) sh_int ON sh_int.application_id = a.id AND sh_int.changed_by_name != a.applicant_name
            LEFT JOIN (
                SELECT DISTINCT ON (application_id) application_id, changed_by_name
                FROM status_history
                WHERE to_status = 'FINAL_INTERVIEW_SCHEDULED'
                ORDER BY application_id, changed_at DESC
            ) sched_by ON sched_by.application_id = a.id
            LEFT JOIN (
                SELECT DISTINCT ON (application_id) application_id, 
                    json_build_object(
                        'changed_at', changed_at,
                        'changed_by_name', changed_by_name,
                        'from_status', from_status
                    ) as details
                FROM status_history
                WHERE to_status IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE')
                ORDER BY application_id, changed_at DESC
            ) fail_details ON fail_details.application_id = a.id
        `;
        const params = [];

        if (department) {
            const depts = department.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
            if (depts.length > 0) {
                sql += ` WHERE EXISTS (
                    SELECT 1 
                    FROM unnest(string_to_array(LOWER(a.department), ',')) AS dept
                    WHERE EXISTS (
                        SELECT 1 FROM unnest($1::text[]) AS user_dept
                        WHERE TRIM(dept) = user_dept OR TRIM(dept) LIKE (user_dept || '%') OR user_dept LIKE (TRIM(dept) || '%')
                    )
                )`;
                params.push(depts);
            }
        }

        sql += ` ORDER BY a.applied_at DESC, a.id DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    static async findByEmail(email) {
        const result = await query('SELECT * FROM applications WHERE applicant_email = $1 ORDER BY id DESC LIMIT 1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await query(`
            SELECT a.*, u.email as assigned_ops_validator_email,
                   (
                       SELECT COALESCE(
                           (SELECT q.assigned_interviewer_name 
                            FROM queue q 
                            WHERE q.application_id = a.id AND q.queue_type = 'INITIAL' 
                              AND q.assigned_interviewer_name IS NOT NULL
                            ORDER BY q.created_at DESC LIMIT 1),
                           (SELECT sh.changed_by_name
                            FROM status_history sh
                            JOIN users usr ON sh.changed_by_name = usr.full_name
                            WHERE sh.application_id = a.id 
                              AND sh.from_status = 'INITIAL_INTERVIEW'
                              AND sh.changed_by_name != a.applicant_name
                            ORDER BY sh.changed_at DESC LIMIT 1)
                       )
                   ) as interviewer_name,
                   (
                       SELECT sh.changed_by_name
                       FROM status_history sh
                       WHERE sh.application_id = a.id 
                         AND sh.to_status = 'FINAL_INTERVIEW_SCHEDULED'
                       ORDER BY sh.changed_at DESC
                       LIMIT 1
                   ) as scheduled_by,
                   (SELECT COUNT(*)::int FROM typing_test_results ttr WHERE ttr.application_id = a.id) as typing_test_attempts
            FROM applications a
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
            WHERE a.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findWithPosition(id) {
        const result = await query(`
            SELECT a.*, p.title as position_title, p.department, u.email as assigned_ops_validator_email,
                      (
                          SELECT COALESCE(
                              (SELECT q.assigned_interviewer_name 
                               FROM queue q 
                               WHERE q.application_id = a.id AND q.queue_type = 'INITIAL' 
                                 AND q.assigned_interviewer_name IS NOT NULL
                               ORDER BY q.created_at DESC LIMIT 1),
                              (SELECT sh.changed_by_name
                               FROM status_history sh
                               JOIN users usr ON sh.changed_by_name = usr.full_name
                               WHERE sh.application_id = a.id 
                                 AND sh.from_status = 'INITIAL_INTERVIEW'
                                 AND sh.changed_by_name != a.applicant_name
                               ORDER BY sh.changed_at DESC LIMIT 1)
                          )
                      ) as interviewer_name,
                   (
                       SELECT sh.changed_by_name
                       FROM status_history sh
                       WHERE sh.application_id = a.id 
                         AND sh.to_status = 'FINAL_INTERVIEW_SCHEDULED'
                       ORDER BY sh.changed_at DESC
                       LIMIT 1
                   ) as scheduled_by,
                   (SELECT COUNT(*)::int FROM typing_test_results ttr WHERE ttr.application_id = a.id) as typing_test_attempts
            FROM applications a
            LEFT JOIN positions p ON a.position_id = p.id
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
            WHERE a.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const createData = { ...data };
        if (createData.current_status) {
            createData.current_status = normalizeStatus(createData.current_status);
        }

        const finalData = {};
        const extraMetadata = {};
        Object.keys(createData).forEach(key => {
            if (VALID_COLUMNS.has(key)) {
                let val = createData[key];
                if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                    val = JSON.stringify(val);
                }
                finalData[key] = val;
            } else {
                extraMetadata[key] = createData[key];
            }
        });

        let incomingMetadata = {};
        if (createData.metadata) {
            if (typeof createData.metadata === 'string') {
                try {
                    incomingMetadata = JSON.parse(createData.metadata);
                } catch (e) {
                    incomingMetadata = {};
                }
            } else if (typeof createData.metadata === 'object') {
                incomingMetadata = createData.metadata;
            }
        }

        finalData.metadata = {
            ...incomingMetadata,
            ...extraMetadata
        };

        const { text, values } = buildInsert('applications', finalData);
        const result = await query(text, values);
        return result.rows[0];
    }

    static async update(id, data, changedByName = 'System', changeReason = 'Manual Update', bypassHistory = false) {
        if (data.failure_details && data.failure_details.from_status) {
            await query(
                `UPDATE status_history 
                 SET from_status = $1 
                 WHERE id = (
                     SELECT id 
                     FROM status_history 
                     WHERE application_id = $2 
                       AND to_status IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE')
                     ORDER BY changed_at DESC 
                     LIMIT 1
                 )`,
                [normalizeStatus(data.failure_details.from_status), id]
            );
        }
        const { pis, ...rest } = data;
        if ('current_status' in rest) {
            if (!rest.current_status || String(rest.current_status).trim() === '') {
                delete rest.current_status;
            } else {
                rest.current_status = normalizeStatus(rest.current_status);
            }
        }
        const finalData = {};
        const unknownFields = {};
        const booleanCols = new Set(['flexible_schedule', 'is_graduated', 'has_medical_conditions', 'drinks_alcohol', 'smokes', 'is_pregnant', 'endorsed_to_recruiter_s', 'deleted_from_masterlist']);
        const PROTECTED_COLUMNS = new Set(['current_status', 'id', 'created_at', 'updated_at', 'applied_at', 'applicant_id', 'hired_at', 'interview_completed_at']);
        const coerceVal = (key, val) => {
            if (val === null || val === undefined || val === '') {
                return null;
            }
            if (booleanCols.has(key)) {
                if (typeof val === 'string') {
                    const v = val.trim().toLowerCase();
                    if (v === 'yes' || v === 'true' || v === '1' || v === 'flexible') return true;
                    if (v === 'no' || v === 'false' || v === '0' || v === 'fixed') return false;
                }
                return Boolean(val);
            }
            if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                return JSON.stringify(val);
            }
            return val;
        };

        Object.keys(rest).forEach(key => {
            if (VALID_COLUMNS.has(key)) {
                finalData[key] = coerceVal(key, rest[key]);
            } else if (key !== 'metadata' && key !== 'updated_at') {
                unknownFields[key] = rest[key];
            }
        });

        if (rest.position_title) {
            const posResult = await query('SELECT id FROM positions WHERE LOWER(title) = LOWER($1) LIMIT 1', [rest.position_title]);
            if (posResult.rows.length > 0) {
                finalData.position_id = posResult.rows[0].id;
            }
        }

        // Fetch existing to handle metadata merging
        const existing = await this.findById(id);
        if (!existing) return null;

        const fromStatus = existing.current_status;
        const toStatus = finalData.current_status || rest.current_status;

        const currentMetadata = existing.metadata ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata) : {};

        // Convert strings to objects if necessary
        let incomingMetadataObj = {};
        if (typeof data.metadata === 'string') {
            try { incomingMetadataObj = JSON.parse(data.metadata); } catch { incomingMetadataObj = {}; }
        } else if (data.metadata && typeof data.metadata === 'object') {
            incomingMetadataObj = data.metadata;
        }

        let incomingPisObj = {};
        if (typeof pis === 'string') {
            try { incomingPisObj = JSON.parse(pis); } catch { incomingPisObj = {}; }
        } else if (pis && typeof pis === 'object') {
            incomingPisObj = pis;
        }

        if (incomingPisObj.email !== undefined) {
            incomingPisObj.applicant_email = incomingPisObj.email;
            delete incomingPisObj.email;
        }


        // Extract any unknown fields that are prefixed with 'pis_' and put them into incomingPisObj
        Object.keys(unknownFields).forEach(key => {
            if (key.startsWith('pis_')) {
                const pisKey = key.replace('pis_', '');
                incomingPisObj[pisKey] = unknownFields[key];
                delete unknownFields[key];
            }
        });

        // Extract valid columns from incomingPisObj to update DB columns directly
        Object.keys(incomingPisObj).forEach(key => {
            if (VALID_COLUMNS.has(key) && !PROTECTED_COLUMNS.has(key)) {
                // If it was already explicitly defined in the root payload (rest), don't overwrite it
                if (rest[key] === undefined) {
                    finalData[key] = coerceVal(key, incomingPisObj[key]);
                }
            }
        });

        // Merge all sources: collected unknown fields + explicit pis + explicit metadata
        const totalIncoming = {
            ...unknownFields,
            ...incomingMetadataObj
        };

        // Parse existing.pis to merge with incoming changes
        let existingPisObj = {};
        if (existing.pis) {
            if (typeof existing.pis === 'string') {
                try { existingPisObj = JSON.parse(existing.pis); } catch { existingPisObj = {}; }
            } else if (typeof existing.pis === 'object') {
                existingPisObj = existing.pis;
            }
        }

        // Ensure pis is properly maintained by combining existing DB pis, any trapped metadata pis, and incoming updates
        const mergedPis = { ...existingPisObj, ...(currentMetadata.pis || {}), ...incomingPisObj };

        // email is aliased to applicant_email, prevent it from getting trapped in pis
        if (mergedPis.email !== undefined) {
            delete mergedPis.email;
        }

        // Gov ID fields that should be allowed to live in both root columns AND pis metadata
        // when explicitly sent via the pis object (i.e. user chose "Both Masterlist & PIS")
        const GOV_ID_FIELDS = new Set(['sss_no', 'tin_no', 'philhealth_no', 'pagibig_no']);
        const explicitPisGovIds = new Set();
        GOV_ID_FIELDS.forEach(f => { if (incomingPisObj[f] !== undefined) explicitPisGovIds.add(f); });

        // Promote top-level DB columns out of pis to prevent them from getting trapped
        Object.keys(mergedPis).forEach(key => {
            if (VALID_COLUMNS.has(key)) {
                totalIncoming[key] = mergedPis[key];
                // Keep gov IDs in pis if user explicitly sent them via pis ("Both" option)
                if (!explicitPisGovIds.has(key)) {
                    delete mergedPis[key];
                }
            }
        });

        totalIncoming.pis = mergedPis;

        // Extract valid columns from totalIncoming so they update the actual DB columns
        // instead of getting trapped in the metadata JSON and overwritten on read.
        Object.keys(totalIncoming).forEach(key => {
            if (VALID_COLUMNS.has(key) && !PROTECTED_COLUMNS.has(key)) {
                // Only apply if it wasn't explicitly provided in the root payload
                if (rest[key] === undefined) {
                    finalData[key] = coerceVal(key, totalIncoming[key]);
                }
                // Remove from totalIncoming to avoid duplicating data in the metadata JSON column
                delete totalIncoming[key];
            } else if (VALID_COLUMNS.has(key) && PROTECTED_COLUMNS.has(key)) {
                // Ensure protected columns don't get trapped in metadata either, just delete them
                delete totalIncoming[key];
            }
        });


        // Merge incoming into current
        const mergedMetadata = {
            ...currentMetadata,
            ...totalIncoming
        };

        // Clean up any trapped VALID_COLUMNS in mergedMetadata to prevent duplication and rollbacks on read
        Object.keys(mergedMetadata).forEach(key => {
            if (VALID_COLUMNS.has(key) && key !== 'metadata' && !PROTECTED_COLUMNS.has(key)) {
                delete mergedMetadata[key];
            } else if (VALID_COLUMNS.has(key) && PROTECTED_COLUMNS.has(key)) {
                delete mergedMetadata[key];
            }
        });
        if (mergedMetadata.pis) {
            Object.keys(mergedMetadata.pis).forEach(key => {
                if (VALID_COLUMNS.has(key) && key !== 'metadata') {
                    // Preserve gov IDs that were explicitly sent via pis ("Both" option)
                    if (!explicitPisGovIds.has(key)) {
                        delete mergedMetadata.pis[key];
                    }
                } else {
                    // If the user explicitly provided a new value at the root, 
                    // remove the stale value from PIS so the root takes precedence.
                    if (totalIncoming[key] !== undefined) {
                        delete mergedMetadata.pis[key];
                    }
                    // Otherwise, if a non-DB column exists in PIS, ensure it is not duplicated 
                    // at the root of metadata to prevent `extractDeepPis` from masking 
                    // the updated PIS value with a stale root value.
                    else if (mergedMetadata[key] !== undefined) {
                        delete mergedMetadata[key];
                    }
                }
            });
        }


        // Global name sync
        const nameChanged = ['first_name', 'last_name', 'middle_name', 'master_first_name', 'master_last_name', 'master_middle_name', 'applicant_name'].some(k => finalData[k] !== undefined || totalIncoming[k] !== undefined);
        if (nameChanged) {
            const getNewVal = (mainKey, masterKey) => {
                if (rest[mainKey] !== undefined) return rest[mainKey];
                if (rest[masterKey] !== undefined) return rest[masterKey];
                if (finalData[mainKey] !== undefined) return finalData[mainKey];
                if (finalData[masterKey] !== undefined) return finalData[masterKey];
                if (existing[mainKey] !== undefined) return existing[mainKey];
                return existing[masterKey] || '';
            };

            const fName = getNewVal('first_name', 'master_first_name');
            const mName = getNewVal('middle_name', 'master_middle_name');
            const lName = getNewVal('last_name', 'master_last_name');

            finalData.first_name = fName;
            finalData.master_first_name = fName;
            finalData.middle_name = mName;
            finalData.master_middle_name = mName;
            finalData.last_name = lName;
            finalData.master_last_name = lName;

            const full = [fName, mName, lName].filter(Boolean).join(' ');
            finalData.applicant_name = full;

            mergedMetadata.pis = mergedMetadata.pis || {};
            mergedMetadata.pis.first_name = fName;
            mergedMetadata.pis.middle_name = mName;
            mergedMetadata.pis.last_name = lName;
            mergedMetadata.pis.full_name = full;
        }

        if (toStatus) {
            const upperStatus = toStatus.toUpperCase().replace(/_/g, ' ');
            if (['FOR JOB OFFER', 'HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER', 'SENT JO AND BGC', 'PASSED', 'POOL'].includes(upperStatus)) {
                mergedMetadata.deleted_from_masterlist = false;
            }
        }

        finalData.metadata = JSON.stringify(mergedMetadata);

        if (totalIncoming.work_experience && Array.isArray(totalIncoming.work_experience)) {
            await query('DELETE FROM work_experience WHERE application_id = $1', [id]);
            for (const exp of totalIncoming.work_experience) {
                await this.createWorkExperience(id, exp);
            }
        }

        const build = buildUpdate('applications', finalData, id);
        if (!build) return null;
        await query(build.text, build.values);

        // History Logging logic
        if (!bypassHistory && toStatus && toStatus !== fromStatus) {
            await this.createStatusHistory(id, fromStatus, toStatus, changedByName, changeReason);
        }

        // Reprofiling detection
        const existingReprofileHistory = currentMetadata?.reprofile_history || [];
        const incomingReprofileHistory = mergedMetadata?.reprofile_history || [];
        const isReprofiledTransition = (mergedMetadata?.is_reprofiled === true && !currentMetadata?.is_reprofiled) ||
            (incomingReprofileHistory.length > existingReprofileHistory.length);
        if (isReprofiledTransition) {
            const entry = incomingReprofileHistory[incomingReprofileHistory.length - 1];
            const author = entry?.changed_by || changedByName;
            const reason = entry?.previous_account ? `Reprofiled from ${entry.previous_account} to ${entry.new_account}` : 'Candidate reprofiled';
            await this.createStatusHistory(id, fromStatus, 'REPROFILED', author, reason);
        }

        return this.findById(id);
    }

    static async delete(id) {
        await query('DELETE FROM applications WHERE id = $1', [id]);
    }

    // Status History
    static async getFullStatusHistory(department = null) {
        let sql = `
            SELECT 
                sh.*, 
                a.applicant_name, 
                a.position_title,
                a.department,
                (a.metadata->>'assigned_interview_room_name') as room_name
            FROM status_history sh
            JOIN applications a ON sh.application_id = a.id
        `;
        const params = [];

        if (department) {
            const depts = department.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
            if (depts.length > 0) {
                sql += ` WHERE EXISTS (
                    SELECT 1 
                    FROM unnest(string_to_array(LOWER(a.department), ',')) AS dept
                    WHERE TRIM(dept) = ANY($1)
                )`;
                params.push(depts);
            }
        }

        sql += ` ORDER BY sh.changed_at DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    static async getStatusHistoryByApplication(applicationId) {
        const result = await query(
            `SELECT * FROM status_history WHERE application_id = $1 ORDER BY changed_at DESC`,
            [applicationId]
        );
        return result.rows;
    }

    static async createStatusHistory(applicationId, fromStatus, toStatus, changedByName, reason) {
        await query(
            `INSERT INTO status_history (application_id, from_status, to_status, changed_by_name, change_reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [applicationId, normalizeStatus(fromStatus), normalizeStatus(toStatus), changedByName, reason]
        );
    }

    // Work Experience
    static async createWorkExperience(applicationId, exp) {
        await query(
            `INSERT INTO work_experience (application_id, company, position, duration_from, duration_to, description, exit_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [applicationId, exp.company, exp.position, exp.duration_from, exp.duration_to, exp.description, exp.exit_reason]
        );
    }

    // Typing Test
    static async saveTypingTestResult(applicationId, payload, metrics) {
        return query(
            `INSERT INTO typing_test_results (
                application_id, prompt_text, typed_text, words_per_minute, accuracy_percent
             ) VALUES ($1, $2, $3, $4, $5)`,
            [applicationId, payload.promptText, payload.typedText, metrics.wordsPerMinute, metrics.accuracyPercent]
        );
    }

    static async getTypingTestResultsByApplication(applicationId) {
        const { rows } = await query(
            `SELECT id, application_id, prompt_text, typed_text, words_per_minute, accuracy_percent, completed_at
             FROM typing_test_results 
             WHERE application_id = $1 
             ORDER BY completed_at DESC`,
            [applicationId]
        );
        return rows;
    }
}
