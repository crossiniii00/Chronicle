import { query } from '../db.js';
import { buildUpdate, buildInsert } from '../utils/db-utils.js';

const VALID_COLUMNS = new Set([
    'id', 'applicant_id', 'applicant_name', 'applicant_email', 'applicant_phone', 'position_id', 'position_title', 'department',
    'applied_at', 'current_status', 'updated_at', 'created_at', 'resume_path', 'resume_name',
    'resume_data', 'typing_test_wpm', 'typing_test_accuracy', 'typing_test_duration_seconds',
    'typing_test_completed_at', 'assessment_score', 'interview_notes', 'final_interview_notes',
    'interview_responses', 'interview_grading', 'interview_room', 'interview_recording_url',
    'interview_completed_at', 'hired_at', 'metadata', 'hiring_source', 'source',
    'client_assessment_score', 'client_interview_remarks', 'endorsed_to_recruiter_s',
    'recruiter_s_scheduling_status', 'final_verdict',
    'master_column', 'master_wave', 'master_eid', 'master_remarks', 'master_hiring_request_id',
    'master_rcbc_status', 'master_referee_eid', 'master_win_date', 'master_bi_result', 'master_bi_results',
    'master_bi_endorsement_date', 'master_nbi_result', 'master_nbi_status', 'master_email_nbi_status',
    'master_bgs_status', 'master_discord_handle', 'master_peme_result', 'master_peme_status',
    'master_neo_date', 'master_allowance', 'master_basic_salary', 'master_training_start_date',
    'master_cp36_email', 'master_last_name', 'master_first_name', 'master_middle_name', 'master_h2r_status',
    'master_sss_status', 'master_philhealth_status', 'master_pagibig_status',
    'master_first_day_show_up', 'master_second_day_show_up',
    'philhealth_no', 'sss_no', 'tin_no', 'pagibig_no',
    'first_name', 'last_name', 'middle_name', 'nickname', 'gender', 'civil_status', 'birth_date',
    'birth_place', 'nationality', 'current_address', 'permanent_address', 'highest_education',
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
    'assigned_interview_room_name', 'queue_number', 'queue_type', 'rejection_reason', 'notes', 'highlight_color'
]);

export class ApplicationRepository {
    static VALID_COLUMNS = VALID_COLUMNS;

    static async findAll(department = null) {
        let sql = `
            SELECT a.*, u.email as assigned_ops_validator_email
            FROM applications a
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
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

        sql += ` ORDER BY a.applied_at ASC, a.id ASC`;

        const result = await query(sql, params);
        return result.rows;
    }

    static async findByEmail(email) {
        const result = await query('SELECT * FROM applications WHERE applicant_email = $1 LIMIT 1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await query(`
            SELECT a.*, u.email as assigned_ops_validator_email
            FROM applications a
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
            WHERE a.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async findWithPosition(id) {
        const result = await query(`
            SELECT a.*, p.title as position_title, p.department, u.email as assigned_ops_validator_email
            FROM applications a
            LEFT JOIN positions p ON a.position_id = p.id
            LEFT JOIN users u ON a.assigned_ops_validator_id = u.id
            WHERE a.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const { text, values } = buildInsert('applications', data);
        const result = await query(text, values);
        return result.rows[0];
    }

    static async update(id, data, changedByName = 'System', changeReason = 'Manual Update', bypassHistory = false) {
        const { pis, ...rest } = data;
        const finalData = {};
        const unknownFields = {};
        Object.keys(rest).forEach(key => {
            if (VALID_COLUMNS.has(key)) {
                finalData[key] = rest[key];
            } else if (key !== 'metadata' && key !== 'updated_at') {
                unknownFields[key] = rest[key];
            }
        });

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


        // Merge all sources: collected unknown fields + explicit pis + explicit metadata
        const totalIncoming = {
            ...unknownFields,
            ...incomingPisObj,
            ...incomingMetadataObj
        };


        // Merge incoming into current
        const mergedMetadata = {
            ...currentMetadata,
            ...totalIncoming
        };


        finalData.metadata = JSON.stringify(mergedMetadata);

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
            [applicationId, fromStatus, toStatus, changedByName, reason]
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
    static async createTypingResult(applicationId, payload, metrics) {
        await query(
            `INSERT INTO typing_test_results (
                application_id, prompt_text, typed_text, duration_seconds, words_per_minute, accuracy_percent
             ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [applicationId, payload.promptText, payload.typedText, payload.durationSeconds, metrics.wordsPerMinute, metrics.accuracyPercent]
        );
    }
}
