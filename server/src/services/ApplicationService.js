import path from 'node:path';
import fs from 'node:fs';
import { ApplicationRepository } from '../repositories/ApplicationRepository.js';
import { calculateTypingMetrics } from '../utils/metrics-utils.js';
import { emailService } from '../services/email.service.js';
import { writeAuditLog } from '../middleware/audit.js';
import { query, pool } from '../db.js';
import { getIO } from '../socket.js';

function formatCandidateName(name) {
    if (!name || typeof name !== 'string') return name || '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    return trimmed.split(/\s+/).map(word => {
        if (!word) return '';
        return word.split('-').map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('-');
    }).join(' ');
}

function extractDeepPis(metadata) {
    if (!metadata || typeof metadata !== 'object') return {};
    let collected = {};
    let current = metadata;
    let depth = 0;
    
    while (current && typeof current === 'object' && depth < 10) {
        Object.keys(current).forEach(key => {
            if (key !== 'pis' && current[key] !== undefined && current[key] !== null) {
                if (Array.isArray(current[key])) {
                    if (current[key].length > 0 || !collected[key]) {
                        collected[key] = current[key];
                    }
                } else if (!collected[key] || collected[key] === '') {
                    collected[key] = current[key];
                }
            }
        });
        if (current.background && typeof current.background === 'object') {
            Object.keys(current.background).forEach(key => {
                if (current.background[key] !== undefined && current.background[key] !== null) {
                    if (Array.isArray(current.background[key])) {
                        if (current.background[key].length > 0 || !collected[key]) {
                            collected[key] = current.background[key];
                        }
                    } else if (!collected[key] || collected[key] === '') {
                        collected[key] = current.background[key];
                    }
                }
            });
        }
        if (current.pis && typeof current.pis === 'object' && current.pis !== current) {
            current = current.pis;
        } else {
            break;
        }
        depth++;
    }
    return collected;
}

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
    APPLIED: ['TYPING_TEST', 'INITIAL_INTERVIEW', 'REJECTED', 'Withdrawn'],
    TYPING_TEST: ['INITIAL_INTERVIEW', 'REJECTED', 'Withdrawn'],
    INITIAL_INTERVIEW: ['ASSESSMENT', 'REJECTED', 'Withdrawn', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'ENDORSED'],
    QUEUE_ASSIGNED: ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'ASSESSMENT', 'REJECTED', 'Withdrawn', 'FINAL_INTERVIEW'],
    INTERVIEW_IN_PROGRESS: ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'ASSESSMENT', 'REJECTED', 'Withdrawn', 'PASSED', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'],
    ASSESSMENT: ['FINAL_INTERVIEW', 'REJECTED', 'Withdrawn', 'ENDORSED', 'INITIAL_INTERVIEW', 'FOR_SCHEDULING'],
    FOR_SCHEDULING: ['FINAL_INTERVIEW_SCHEDULED', 'REJECTED', 'Withdrawn', 'FINAL_VERDICT', 'ASSESSMENT'],
    ENDORSED: ['FINAL_INTERVIEW', 'REJECTED', 'Withdrawn', 'FINAL_VERDICT', 'ASSESSMENT'],
    FINAL_INTERVIEW: ['FINAL_VERDICT', 'PASSED', 'REJECTED', 'Withdrawn', 'ENDORSED', 'ASSESSMENT', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer'],
    FINAL_INTERVIEW_SCHEDULED: ['FINAL_VERDICT', 'PASSED', 'REJECTED', 'Withdrawn', 'ENDORSED', 'ASSESSMENT', 'INTERVIEW_IN_PROGRESS', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer', 'FOR_SCHEDULING'],
    CLIENT_ASSESSMENT: ['CLIENT_INTERVIEW', 'FINAL_VERDICT', 'REJECTED', 'Withdrawn', 'FINAL_INTERVIEW', 'PASSED', 'For Job Offer'],
    CLIENT_INTERVIEW: ['FINAL_VERDICT', 'REJECTED', 'Withdrawn', 'CLIENT_ASSESSMENT', 'FINAL_INTERVIEW', 'PASSED', 'For Job Offer'],
    FINAL_VERDICT: ['HIRED', 'REJECTED', 'WAITLISTED', 'CONDITIONAL', 'PASSED', 'Withdrawn', 'FINAL_INTERVIEW', 'FAILED', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    PASSED: ['HIRED', 'WAITLISTED', 'CONDITIONAL', 'Withdrawn', 'FINAL_VERDICT', 'INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'For Job Offer'],
    HIRED: ['Withdrawn', 'FINAL_VERDICT', 'Promoted', 'Lateral Transfer', 'INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    REJECTED: ['INITIAL_INTERVIEW', 'APPLIED', 'FINAL_VERDICT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    FAILED: ['INITIAL_INTERVIEW', 'FINAL_VERDICT', 'REJECTED', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    WAITLISTED: ['HIRED', 'REJECTED', 'Withdrawn', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    CONDITIONAL: ['HIRED', 'REJECTED', 'Withdrawn', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    Withdrawn: ['INITIAL_INTERVIEW', 'FINAL_VERDICT', 'CLIENT_INTERVIEW', 'FINAL_INTERVIEW', 'CLIENT_ASSESSMENT'],
    NOT_ELIGIBLE_FOR_REHIRE: ['INITIAL_INTERVIEW'],
    Promoted: ['HIRED', 'Withdrawn'],
    'Lateral Transfer': ['HIRED', 'Withdrawn'],
    CONTRACT_SENT: ['HIRED', 'REJECTED', 'Withdrawn', 'Accepted Offer'],
    'Accepted Offer': ['HIRED', 'REJECTED', 'Withdrawn', 'Sent JO and BGC'],
    'Sent JO and BGC': ['HIRED', 'REJECTED', 'Withdrawn', 'Accepted Offer'],
    'For Job Offer': ['HIRED', 'REJECTED', 'Withdrawn', 'Sent JO and BGC', 'Accepted Offer', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT'],
    'For PAN': ['HIRED', 'REJECTED', 'Withdrawn', 'Sent JO and BGC', 'FINAL_INTERVIEW', 'CLIENT_INTERVIEW', 'CLIENT_ASSESSMENT']
};


export class ApplicationService {
    static assertValidStatusTransition(fromStatus, toStatus) {
        if (!fromStatus || fromStatus === toStatus) return;
        if (['REJECTED', 'WITHDRAWN', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'OPEN', 'CLOSED', 'HIRED', 'REPROFILED', 'PROMOTED', 'LATERAL_TRANSFER', 'LATERAL TRANSFER'].includes(toStatus.toUpperCase())) return;

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

        if (mapped.applicant_name) mapped.applicant_name = formatCandidateName(mapped.applicant_name);
        if (mapped.first_name) mapped.first_name = formatCandidateName(mapped.first_name);
        if (mapped.last_name) mapped.last_name = formatCandidateName(mapped.last_name);
        if (mapped.middle_name) mapped.middle_name = formatCandidateName(mapped.middle_name);
        if (mapped.master_first_name) mapped.master_first_name = formatCandidateName(mapped.master_first_name);
        if (mapped.master_last_name) mapped.master_last_name = formatCandidateName(mapped.master_last_name);
        if (mapped.master_middle_name) mapped.master_middle_name = formatCandidateName(mapped.master_middle_name);

        if (mapped.current_status === 'REJECTED') {
            mapped.current_status = 'FAILED';
        }
        if (mapped.final_verdict === 'REJECTED') {
            mapped.final_verdict = 'FAILED';
        }

        if (app.resume_path) {
            const filename = path.basename(app.resume_path);
            mapped.resume_url = `/uploads/resumes/${filename}`;
            mapped.resume_name = app.resume_name || filename;
        } else if (app.resume_data) {
            // Database Fallback: Serve as Data URI
            mapped.resume_url = app.resume_data;
            mapped.resume_name = app.resume_name || 'resume_from_db.pdf';
        }

        let metadata = {};
        if (app.metadata) {
            try {
                metadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata) : app.metadata;
            } catch {
                metadata = {};
            }
        }

        const deepPis = extractDeepPis(metadata);
        mapped.pis = {
            ...(metadata || {}),
            ...deepPis
        };
        delete mapped.pis.pis;
        
        // --- SPREADSHEET ALIAS MAPPINGS ---
        const p = mapped.pis;
        p.civil_status = p.civil_status || p.pis_civil_status || '';
        p.birth_date = p.birth_date || p.pis_birth_date || '';
        p.religion = p.religion || p.pis_religion || '';
        p.nick_name = p.nick_name || p.middle_name || p.pis_middle_name || '';
        p.preferred_nickname = p.preferred_nickname || p.pis_preferred_nickname || '';
        p.age = p.age || p.pis_age || '';
        p.nationality = p.nationality || p.pis_nationality || '';
        p.phone = p.phone || p.pis_phone || p.contact_number || '';
        p.sex = p.sex || p.gender || p.pis_gender || '';
        p.highest_education = p.highest_education || p.pis_highest_education || '';
        p.school_name = p.school_name || p.pis_school_university || '';
        p.degree = p.degree || p.pis_course_degree || '';
        p.current_address = p.current_address || p.pis_current_address || '';
        p.permanent_address = p.permanent_address || p.pis_permanent_address || '';
        p.sss_no = p.sss_no || p.pis_sss_no || '';
        p.tin_no = p.tin_no || p.pis_tin_no || '';
        p.philhealth_no = p.philhealth_no || p.pis_philhealth_no || '';
        p.pagibig_no = p.pagibig_no || p.pis_pagibig_no || '';
        
        // Force the email property to reflect the true database column to prevent reverting in the UI
        if (mapped.applicant_email) {
            mapped.pis.email = mapped.applicant_email;
            mapped.pis.applicant_email = mapped.applicant_email;
        }

        mapped.metadata = metadata || {};
        if (metadata && typeof metadata === 'object') {
            Object.keys(deepPis).forEach(key => {
                if (mapped[key] === undefined || mapped[key] === null) {
                    mapped[key] = deepPis[key];
                }
            });
        }

        // Explicitly sync photo_data_url and signature_data_url to both root and pis
        const sig = app.signature_data_url || (metadata && (metadata.signature_data_url || metadata.signature)) || (deepPis && (deepPis.signature_data_url || deepPis.signature));
        if (sig) {
            mapped.signature_data_url = sig;
            mapped.pis.signature_data_url = sig;
            mapped.pis.signature = sig;
        }

        if (metadata && metadata.photo_data_url) {
            mapped.photo_data_url = metadata.photo_data_url;
            mapped.pis.photo_data_url = metadata.photo_data_url;
        }

        // Explicitly sync final interview remarks and notes to both root and pis
        const finalNotes = app.final_interview_notes || (metadata && (metadata.ops_validator_notes || metadata.final_interview_notes)) || (deepPis && (deepPis.ops_validator_notes || deepPis.final_interview_notes));
        if (finalNotes !== undefined && finalNotes !== null) {
            mapped.final_interview_notes = finalNotes;
            mapped.pis.final_interview_notes = finalNotes;
            mapped.pis.ops_validator_notes = finalNotes;
        }

        // Always populate mapped.pis from direct database columns for complete PIS profile rendering
        const PIS_COLUMNS = [
            'first_name', 'last_name', 'middle_name', 'nick_name', 'preferred_nickname', 'gender', 'civil_status',
            'birth_date', 'nationality', 'religion', 'current_address', 'permanent_address',
            'phone', 'highest_education', 'school_name', 'degree', 'graduation_year',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'drug_test', 'travel_method',
            'flexible_schedule', 'medical_conditions', 'medical_history_notes', 'drinks_alcohol',
            'smokes', 'is_pregnant', 'skills', 'place_of_birth', 'photo_data_url', 'hiring_source',
            'signature_data_url', 'spouse_name', 'spouse_occupation', 'father_name', 'father_occupation',
            'mother_name', 'mother_occupation', 'num_children', 'num_siblings', 'plans_to_pursue_studies',
            'plans_to_go_abroad', 'has_medical_conditions', 'course_strand', 'num_semesters',
            'is_graduated', 'school_year_attended'
        ];
        PIS_COLUMNS.forEach(col => {
            if (app[col] !== undefined && app[col] !== null && app[col] !== '') {
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

        // Normalize dob -> birth_date and contact_number -> phone for compatibility
        if (mapped.pis) {
            if (!mapped.pis.birth_date && (mapped.pis.dob || mapped.dob)) {
                mapped.pis.birth_date = mapped.pis.dob || mapped.dob;
            }
            if (!mapped.pis.phone && (mapped.pis.contact_number || mapped.contact_number)) {
                mapped.pis.phone = mapped.pis.contact_number || mapped.contact_number;
            }
        }
        if (!mapped.birth_date && (mapped.dob || (mapped.pis && mapped.pis.dob))) {
            mapped.birth_date = mapped.dob || (mapped.pis && mapped.pis.dob);
        }
        if (!mapped.phone && (mapped.contact_number || (mapped.pis && mapped.pis.contact_number))) {
            mapped.phone = mapped.contact_number || (mapped.pis && mapped.pis.contact_number);
        }

        // Fallback: map interview-flow 'background' sub-object to standard PIS fields
        // Some candidates had their data captured in metadata.pis.background instead of standard PIS fields
        if (mapped.pis) {
            const bg = mapped.pis.background || (mapped.metadata && mapped.metadata.pis && mapped.metadata.pis.background) || {};
            const isEmpty = (v) => v === undefined || v === null || v === '' || v === '-';

            // Map full_name -> first_name / last_name if both are empty
            if (isEmpty(mapped.pis.first_name) && isEmpty(mapped.pis.last_name)) {
                const fullName = mapped.pis.full_name || (mapped.metadata && mapped.metadata.pis && mapped.metadata.pis.full_name) || (mapped.metadata && mapped.metadata.full_name) || '';
                if (fullName && fullName.trim()) {
                    const parts = fullName.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        mapped.pis.first_name = parts[0];
                        mapped.pis.last_name = parts.slice(1).join(' ');
                    } else if (parts.length === 1) {
                        mapped.pis.first_name = parts[0];
                    }
                    // Also set applicant_name if missing
                    if (!mapped.applicant_name) {
                        mapped.applicant_name = fullName.trim();
                    }
                }
            }

            // Map background fields to PIS fields as fallbacks
            if (isEmpty(mapped.pis.phone) && bg.contactNumber) {
                mapped.pis.phone = bg.contactNumber;
                if (!mapped.phone) mapped.phone = bg.contactNumber;
            }
            if (isEmpty(mapped.pis.birth_date) && bg.dateOfBirth && bg.dateOfBirth !== '-') {
                mapped.pis.birth_date = bg.dateOfBirth;
                if (!mapped.birth_date) mapped.birth_date = bg.dateOfBirth;
            }
            if (isEmpty(mapped.pis.highest_education) && bg.education) {
                mapped.pis.highest_education = bg.education;
            }
            if (isEmpty(mapped.pis.hiring_source) && bg.candidateSource) {
                mapped.pis.hiring_source = bg.candidateSource;
                if (!mapped.hiring_source) mapped.hiring_source = bg.candidateSource;
            }
            if (isEmpty(mapped.pis.travel_method) && bg.transportMode) {
                mapped.pis.travel_method = bg.transportMode;
            }
            if (isEmpty(mapped.pis.flexible_schedule) && bg.shiftingIssues) {
                mapped.pis.flexible_schedule = bg.shiftingIssues;
            }
            if (isEmpty(mapped.pis.plans_to_pursue_studies) && bg.pursueStudies) {
                mapped.pis.plans_to_pursue_studies = bg.pursueStudies;
            }
            if (isEmpty(mapped.pis.plans_to_go_abroad) && bg.goAbroad) {
                mapped.pis.plans_to_go_abroad = bg.goAbroad;
            }
            if (isEmpty(mapped.pis.has_medical_conditions) && bg.medicalIssues) {
                mapped.pis.has_medical_conditions = bg.medicalIssues !== 'none' ? 'Yes' : 'No';
                if (bg.medicalIssues !== 'none') {
                    mapped.pis.medical_conditions = bg.medicalIssues;
                }
            }
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

        // Fallback: populate master_middle_name from PIS nick_name (which stores the middle name from the PIS form)
        if (!mapped.master_middle_name && mapped.pis) {
            const pisMiddle = mapped.pis.middle_name || mapped.pis.nick_name || mapped.metadata?.nick_name || '';
            if (pisMiddle) {
                mapped.master_middle_name = pisMiddle;
            }
        }

        return mapped;
    }

    static _appCache = new Map();
    static _appPromiseMap = new Map();
    static CACHE_TTL_MS = 300000; // 5 minutes TTL, updated in real-time via delta updates

    static invalidateCache() {
        this._appCache.clear();
        this._appPromiseMap.clear();
    }

    static updateCachedApplication(appId, updatedApp) {
        if (!appId || !updatedApp) return;
        let mapped = updatedApp;
        try {
            if (updatedApp && !mapped.applicant_name && mapped.id) {
                mapped = this.mapApplication(updatedApp);
            }
            delete mapped.photo_data_url;
            delete mapped.signature_data_url;
            delete mapped.signature;
            delete mapped.resume_data;
            if (mapped.resume_url && mapped.resume_url.startsWith('data:')) {
                delete mapped.resume_url;
            }
        } catch (e) {
            // ignore mapping errors
        }

        for (const [key, cacheEntry] of this._appCache.entries()) {
            if (cacheEntry && Array.isArray(cacheEntry.data)) {
                const idx = cacheEntry.data.findIndex(a => a.id === appId);
                if (idx >= 0) {
                    cacheEntry.data[idx] = { ...cacheEntry.data[idx], ...mapped };
                } else {
                    cacheEntry.data.unshift(mapped);
                }
            }
        }
    }

    static removeCachedApplication(appId) {
        if (!appId) return;
        for (const [key, cacheEntry] of this._appCache.entries()) {
            if (cacheEntry && Array.isArray(cacheEntry.data)) {
                cacheEntry.data = cacheEntry.data.filter(a => a.id !== appId);
            }
        }
    }

    static async getAllApplications(user = null) {
        let departmentFilter = null;

        // If user is not an admin/super_admin and has a department assigned, enforce data isolation
        if (user && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'superadmin' && user.department) {
            const userDeptUpper = user.department.trim().toUpperCase();
            if (userDeptUpper !== 'RECRUITER' && userDeptUpper !== 'HR' && userDeptUpper !== 'HUMAN RESOURCES') {
                departmentFilter = user.department;
            }
        }

        const cacheKey = `apps_${departmentFilter || 'ALL'}`;
        const cachedEntry = this._appCache.get(cacheKey);
        const now = Date.now();

        if (cachedEntry && (now - cachedEntry.timestamp < this.CACHE_TTL_MS)) {
            let resultData = cachedEntry.data;
            if (user && user.role === 'recruiter') {
                resultData = resultData.filter(app => !app.is_hidden);
            }
            return resultData;
        }

        if (this._appPromiseMap.has(cacheKey)) {
            return this._appPromiseMap.get(cacheKey);
        }

        const fetchPromise = (async () => {
            const apps = await ApplicationRepository.findAll(departmentFilter);
            const result = apps.map(app => {
                try {
                    const mapped = this.mapApplication(app);
                    // Strip massive base64 payloads from list requests to fix lag
                    delete mapped.photo_data_url;
                    delete mapped.signature_data_url;
                    delete mapped.signature;
                    delete mapped.resume_data;
                    if (mapped.resume_url && mapped.resume_url.startsWith('data:')) {
                        delete mapped.resume_url;
                    }
                    if (mapped.pis) {
                        delete mapped.pis.photo_data_url;
                        delete mapped.pis.signature_data_url;
                        delete mapped.pis.signature;
                    }
                    if (mapped.metadata) {
                        delete mapped.metadata.photo_data_url;
                        delete mapped.metadata.signature_data_url;
                        delete mapped.metadata.signature;
                        if (mapped.metadata.pis) {
                            delete mapped.metadata.pis.photo_data_url;
                            delete mapped.metadata.pis.signature_data_url;
                            delete mapped.metadata.pis.signature;
                        }
                    }
                    return mapped;
                } catch (err) {
                    console.error(`[ApplicationService] Failed to map application ${app?.id}:`, err.message);
                    return { ...app, pis: {}, error: 'Mapping Failed' };
                }
            });

            this._appCache.set(cacheKey, { data: result, timestamp: Date.now() });
            this._appPromiseMap.delete(cacheKey);

            let finalResult = result;
            if (user && user.role === 'recruiter') {
                finalResult = finalResult.filter(app => !app.is_hidden);
            }
            return finalResult;
        })();

        this._appPromiseMap.set(cacheKey, fetchPromise);
        return fetchPromise;
    }

    static async getBadgeCounts(user, body = {}) {
        const { permissions = {}, resolvedActiveAccount = 'DOORDASH' } = body;
        const allApps = await this.getAllApplications(user);
        
        let applicationManagementCount = 0;
        applicationManagementCount = allApps.filter((a) => a.source === 'WEBAPP' && a.current_status === 'APPLIED').length;

        const activeStatuses = ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'ENDORSED', 'ACCOUNT_ASSIGNMENT'];
        const userName = (user?.full_name || '').trim().toLowerCase();
        const userEmail = (user?.email || '').trim().toLowerCase();
        const userId = user?.id;

        const interviewDeskCount = allApps.filter((a) => {
            const status = a.current_status;
            if (!activeStatuses.includes(status) && !(status === 'QUEUE_ASSIGNED' && a.queue_type === 'FINAL')) return false;

            const appDepts = (a.department || '')
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
            const activeUpper = resolvedActiveAccount.toUpperCase();
            const hasMatch = appDepts.some((d) => {
                if (d === activeUpper) return true;
                if (d.startsWith(activeUpper)) return true;
                return false;
            });
            if (!hasMatch) return false;

            const metadata = a.metadata || {};
            const assignedId = a.assigned_ops_validator_id || metadata.assigned_ops_validator_id;
            const assignedName = (a.assigned_ops_validator_name || metadata.assigned_ops_validator_name || '').trim().toLowerCase();
            const assignedEmail = (a.pis?.ops_validator_email || metadata.ops_validator_email || '').trim().toLowerCase();

            if (user?.role === 'admin') return true;
            return (
                assignedId === userId ||
                (assignedName && assignedName === userName) ||
                (assignedEmail && assignedEmail === userEmail)
            );
        }).length;

        return {
            applicationManagementCount,
            interviewDeskCount
        };
    }


    static async getApplicationById(id, user = null) {
        const app = await ApplicationRepository.findById(id);
        if (!app) return null;
        if (user && user.role === 'recruiter' && app.is_hidden) {
            return null; // Deny access to hidden candidates for recruiters
        }
        return this.mapApplication(app);
    }

    static async updateApplicationStatus(id, toStatus, reason, changedByName, user, ip, userAgent, io, patch = {}) {
        if (toStatus === 'REJECTED') {
            toStatus = 'FAILED';
        }
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

            // Log initial recruiter statically for on-call interviews when they are processed by a recruiter
            const positionTitle = (app.position_title || '').toLowerCase();
            const tempMetadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata) : (app.metadata || {});
            const interviewMode = String(tempMetadata.interview_mode || '').toLowerCase();
            const preferredSetup = String((tempMetadata.pis || {}).preferred_setup || tempMetadata.preferred_setup || '').toLowerCase();

            const isOnCall = positionTitle.includes('[on-call]') ||
                positionTitle.includes('[on call]') ||
                interviewMode === 'on-call' ||
                interviewMode === 'online' ||
                preferredSetup === 'on-call' ||
                preferredSetup === 'online';

            if (isOnCall && (!app.assigned_recruiter_name || app.assigned_recruiter_name === '') && user && user.role?.startsWith('recruiter')) {
                updateData.assigned_recruiter_name = user.full_name || changedByName;
                updateData.assigned_recruiter_id = user.id;
            }



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
                    clonedData.current_status = 'FAILED';
                    clonedData.final_verdict = 'FAILED';
                    if (user && (user.role === 'ops_validator' || user.role === 'admin')) {
                        clonedData.assigned_ops_validator_id = user.id;
                        clonedData.assigned_ops_validator_name = user.full_name || changedByName;
                    }

                    const clonedMeta = {
                        ...newMetadata,
                        failed_accounts: [failedAcc],
                        is_reprofiled: false,
                        reprofile_active_account: null,
                        reprofile_accounts: [],
                        reprofile_history: []
                    };
                    if (clonedMeta.pis) {
                        clonedMeta.pis = {
                            ...clonedMeta.pis,
                            overall_status: 'FAILED',
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

            if (toStatus === 'REPROFILE_FINAL_INTERVIEW' || (sanitizedPatch.department && sanitizedPatch.department !== app.department)) {
                newMetadata.ops_validator_status = 'Pending';
                newMetadata.final_interview_result = 'Pending';
                newMetadata.final_specific_status = 'OV - Pending';
                updateData.assigned_ops_validator_id = null;
                updateData.assigned_ops_validator_name = null;
                delete newMetadata.assigned_ops_validator_id;
                delete newMetadata.assigned_ops_validator_name;
                metadataChanged = true;
            }

            if (newMetadata.initial_account_assignment === 'null' || newMetadata.initial_account_assignment === 'undefined') {
                newMetadata.initial_account_assignment = '';
                metadataChanged = true;
            }

            // Sync overall_status for backward compatibility with components looking at pis.overall_status
            // It must ONLY be one of 'OPEN', 'CLOSED', or 'HIRED'.
            let targetOverallStatus = 'OPEN';
            const patchFSS = sanitizedPatch.pis?.final_specific_status
                || sanitizedPatch.metadata?.final_specific_status
                || sanitizedPatch.metadata?.['Final Specific Status']
                || sanitizedPatch.metadata?.['Specific Status']
                || sanitizedPatch.final_specific_status
                || sanitizedPatch.pis_final_specific_status;
            const currentFSS = patchFSS || newMetadata.final_specific_status || '';

            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(toStatus) || currentFSS === 'JO - Hired') {
                targetOverallStatus = 'HIRED';
            } else if (['REJECTED', 'FAILED', 'WITHDRAWN', 'CLOSED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(toStatus)) {
                targetOverallStatus = 'CLOSED';
            }

            if (newMetadata.overall_status !== targetOverallStatus) {
                newMetadata.overall_status = targetOverallStatus;
                metadataChanged = true;
            }

            if (['REJECTED', 'FAILED', 'WITHDRAWN'].includes(toStatus)) {
                const currentFSS = newMetadata.final_specific_status || '';
                const isAlreadyTerminal = /failed|withdraw|declined|no show|noshow/i.test(currentFSS);
                if (!isAlreadyTerminal) {
                    let newFSS = 'OV - Failed';
                    if (toStatus === 'WITHDRAWN') {
                        newFSS = 'OV - Withdrew Application';
                    } else if (fromStatus === 'ASSESSMENT') {
                        newFSS = 'SpeechX - Failed';
                    } else if (fromStatus === 'APPLIED' || fromStatus === 'TYPING_TEST') {
                        newFSS = 'Typing Test - Failed';
                    } else if (fromStatus === 'INITIAL_INTERVIEW' || fromStatus === 'INTERVIEW_IN_PROGRESS') {
                        newFSS = 'Initial Interview - Failed';
                    } else if (fromStatus === 'CLIENT_ASSESSMENT') {
                        newFSS = 'Client Assessment - Failed';
                    } else if (fromStatus === 'CLIENT_INTERVIEW') {
                        newFSS = 'Client Interview - Failed';
                    }

                    newMetadata.final_specific_status = newFSS;
                    newMetadata['Final Specific Status'] = newFSS;
                    newMetadata['Specific Status'] = newFSS;
                    metadataChanged = true;
                    updateData.master_remarks = newFSS;
                }
            }


            if (['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'FOR_SCHEDULING', 'FINAL_INTERVIEW_SCHEDULING'].includes(toStatus)) {
                if (toStatus === 'FINAL_INTERVIEW_SCHEDULED') {
                    newMetadata.final_specific_status = 'OV - Scheduled';
                    newMetadata['Final Specific Status'] = 'OV - Scheduled';
                    newMetadata['Specific Status'] = 'OV - Scheduled';
                    newMetadata.overall_status = 'OPEN';
                    newMetadata.ops_validator_status = 'PENDING';
                    newMetadata.final_interview_result = 'PENDING';
                    if (newMetadata.pis) {
                        newMetadata.pis.ops_validator_status = 'PENDING';
                        newMetadata.pis.final_interview_result = 'PENDING';
                        newMetadata.pis.final_specific_status = 'OV - Scheduled';
                    }
                    updateData.final_verdict = null;
                    metadataChanged = true;
                } else if (toStatus === 'FOR_SCHEDULING' || toStatus === 'FINAL_INTERVIEW_SCHEDULING') {
                    newMetadata.final_specific_status = 'OV - for Scheduling';
                    newMetadata['Final Specific Status'] = 'OV - for Scheduling';
                    newMetadata['Specific Status'] = 'OV - for Scheduling';
                    newMetadata.overall_status = 'OPEN';
                    newMetadata.ops_validator_status = 'PENDING';
                    newMetadata.final_interview_result = 'PENDING';
                    updateData.final_verdict = null;
                    metadataChanged = true;
                }
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
                if (String(incomingFSS).toLowerCase().includes('hired')) {
                    updateData.current_status = 'HIRED';
                    updateData.master_status = 'HIRED';
                    updateData.overall_status = 'HIRED';
                    updateData.master_column = 'MASTERLIST';
                }

            } else if (toStatus === 'HIRED' && !newMetadata.final_specific_status?.toLowerCase()?.includes('hired')) {
                // If transitioning to HIRED but no specific status was provided, default to 'JO - Hired'
                newMetadata.final_specific_status = 'JO - Hired';
                metadataChanged = true;
                updateData.master_remarks = 'JO - Hired';

            } else {
                // Dynamic active stage mapping rules if not already terminal
                const currentFSS = newMetadata.final_specific_status || '';
                const isAlreadyTerminal = /failed|withdraw|declined|no show|noshow/i.test(currentFSS);
                if (!isAlreadyTerminal) {
                    let resolvedFSS = null;
                    if (toStatus === 'ASSESSMENT' && !currentFSS.toLowerCase().includes('wonderlic') && !currentFSS.toLowerCase().includes('speechx') && !currentFSS.toLowerCase().includes('personality') && !currentFSS.toLowerCase().includes('typing')) {
                        resolvedFSS = 'Wonderlic - Pending';
                    } else if (toStatus === 'FINAL_INTERVIEW_SCHEDULED') {
                        resolvedFSS = 'OV - Pending';
                    } else if (toStatus === 'FINAL_INTERVIEW' && !currentFSS.toLowerCase().includes('ops val') && !currentFSS.toLowerCase().includes('ov -')) {
                        resolvedFSS = 'OV - Pending';
                    } else if (['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(toStatus) && !currentFSS.toLowerCase().includes('client')) {
                        resolvedFSS = 'Client Interview - Pending';
                    } else if (['FOR_JOB_OFFER', 'For Job Offer'].includes(toStatus) && !currentFSS.toLowerCase().includes('jo -')) {
                        resolvedFSS = 'JO - Pending';
                    } else if (toStatus === 'INITIAL_INTERVIEW' && !currentFSS.toLowerCase().includes('recruitment interview')) {
                        resolvedFSS = 'Recruitment Interview - Pending';
                    }

                    if (resolvedFSS) {
                        newMetadata.final_specific_status = resolvedFSS;
                        newMetadata['Final Specific Status'] = resolvedFSS;
                        newMetadata['Specific Status'] = resolvedFSS;
                        metadataChanged = true;
                        updateData.master_remarks = resolvedFSS;
                    }
                }
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
                
                if (toStatus === 'FAILED') {
                    const failFrom = sanitizedPatch?.failure_details?.from_status || app.current_status || '';
                    if (failFrom === 'INITIAL_INTERVIEW' || failFrom === 'INTERVIEW_IN_PROGRESS') {
                        updateData.master_column = 'Sheet';
                    }
                }
            } else {
                updateData.final_verdict = null;
            }

            await ApplicationRepository.update(id, updateData, changedByName, reason, true);
            await ApplicationRepository.createStatusHistory(id, fromStatus, toStatus, changedByName, reason);

            // Generate notification for status changes, queue assignments, request acceptances, and cell edits
            let updatedApp = null;
            try {
                updatedApp = await ApplicationRepository.findById(id);
                if (updatedApp) {
                    await this.generateNotification(app, updatedApp, changedByName, io, patch, toStatus, fromStatus, reason);
                }
            } catch (notifErr) {
                console.error('[Notification Generation Error]', notifErr);
            }

            this.handleStatusSideEffects(id, fromStatus, toStatus, reason, user, ip, userAgent, io, updatedApp);
            return updatedApp;
        } catch (err) {
            const logEntry = `[${new Date().toISOString()}] Error updating status for ${id}: ${err.message}\n${err.stack}\n\n`;
            const logPath = path.resolve(process.cwd(), 'server', 'logs', 'backend_error_log.txt');
            fs.appendFileSync(logPath, logEntry);
            throw err;
        }
    }

    static async handleStatusSideEffects(id, fromStatus, toStatus, reason, user, ip, userAgent, io, updatedApp = null) {
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

        if (updatedApp) {
            this.updateCachedApplication(id, this.mapApplication(updatedApp));
        }
        
        io?.emit('applications:updated', { applicationId: id, fromStatus, toStatus, data: updatedApp ? this.mapApplication(updatedApp) : null });
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
            `UPDATE queue SET status = 'COMPLETED', updated_at = NOW() WHERE application_id = $1 AND (status = 'WAITING' OR status = 'IN_PROGRESS' OR status = 'CALLED') RETURNING *`,
            [id]
        );
        result.rows.forEach(entry => io?.emit('queue:updated', entry));
    }

    static async submitTypingTest(id, payload) {
        const metrics = calculateTypingMetrics(payload);
        await ApplicationRepository.createTypingResult(id, payload, metrics);

        const bestResultQuery = await query(
            `SELECT words_per_minute, accuracy_percent, duration_seconds, created_at
             FROM typing_test_results
             WHERE application_id = $1
             ORDER BY words_per_minute DESC, accuracy_percent DESC, created_at DESC
             LIMIT 1`,
            [id]
        );
        const bestResult = bestResultQuery.rows[0] || {
            words_per_minute: metrics.wordsPerMinute,
            accuracy_percent: metrics.accuracyPercent,
            duration_seconds: payload.durationSeconds,
            created_at: new Date()
        };

        await ApplicationRepository.update(id, {
            current_status: 'TYPING_TEST',
            typing_test_wpm: bestResult.words_per_minute,
            typing_test_accuracy: bestResult.accuracy_percent,
            typing_test_duration_seconds: bestResult.duration_seconds,
            typing_test_completed_at: bestResult.created_at
        });

        this.invalidateCache();

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
        fields.master_column = 'MASTERLIST';
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

        const applicantEmail = (payload.applicantEmail || '').toLowerCase();
        const applicantName = (payload.applicantName || '').toLowerCase();
        const normalizedPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);

        // Block duplicate submissions within 30 days if the email matches OR the last 10 digits of the phone number match.
        // We also enforce that the candidate name matches to avoid accidentally blocking family members sharing a phone, though email/phone uniqueness is generally preferred.
        const duplicateCheck = await query(
            `SELECT * FROM applications 
             WHERE (LOWER(applicant_email) = $1 OR RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = $3)
             AND LOWER(applicant_name) = $2
             AND applied_at >= NOW() - INTERVAL '30 days'
             ORDER BY applied_at DESC LIMIT 1`,
            [applicantEmail, applicantName, normalizedPhone]
        );

        if (duplicateCheck.rows.length > 0) {
            console.log('[ApplicationService] Duplicate submission detected, blocking submission');
            const err = new Error('You already have an active application. Please reach out to recruitment for updates, or try again after 30 days.');
            err.status = 409;
            throw err;
        }

        const queuePrefix = 'Q';

        let generatedQueueNumber = null;
        const typingTestPassed = payload.typing_test_passed !== 'false' && payload.typing_test_passed !== false;

        if (typingTestPassed) {
            const queueNumRes = await query(
                `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_num 
                 FROM (
                     SELECT queue_number FROM queue WHERE queue_prefix = $1 AND created_at >= NOW() - INTERVAL '24 hours'
                     UNION
                     SELECT queue_number FROM applications WHERE queue_prefix = $1 AND applied_at >= NOW() - INTERVAL '24 hours'
                 ) as combined`,
                [queuePrefix]
            );
            generatedQueueNumber = queueNumRes.rows[0].next_num;
            metadata.pregenerated_queue_number = generatedQueueNumber;
            metadata.pregenerated_queue_prefix = queuePrefix;
        }

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

        let inheritedTypingTest = null;
        try {
            const historyCheck = await query(
                `SELECT typing_test_wpm, typing_test_accuracy, typing_test_duration_seconds 
                 FROM applications 
                 WHERE LOWER(applicant_email) = $1 AND LOWER(applicant_name) = $2 
                 AND typing_test_wpm IS NOT NULL
                 ORDER BY created_at DESC LIMIT 1`,
                [(payload.applicantEmail || '').toLowerCase(), (payload.applicantName || '').toLowerCase()]
            );
            if (historyCheck.rows.length > 0) {
                inheritedTypingTest = historyCheck.rows[0];
            }
        } catch (e) {
            console.error('[ApplicationService] Failed to inherit typing test data:', e);
        }

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
            preferred_nickname: (payload.preferred_nickname || metadata.preferred_nickname) ?? null,
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
            typing_test_wpm: payload.typing_test_wpm ?? metadata.typing_test_wpm ?? inheritedTypingTest?.typing_test_wpm ?? null,
            typing_test_accuracy: payload.typing_test_accuracy ?? metadata.typing_test_accuracy ?? inheritedTypingTest?.typing_test_accuracy ?? null,
            typing_test_duration_seconds: payload.typing_test_duration_seconds ?? metadata.typing_test_duration_seconds ?? inheritedTypingTest?.typing_test_duration_seconds ?? null,
            typing_test_completed_at: payload.typing_test_wpm ? new Date() : (metadata.typing_test_wpm ? new Date() : (inheritedTypingTest?.typing_test_wpm ? new Date() : null)),
            hiring_source: (payload.hiring_source || metadata.hiring_source) ?? 'WALK-IN',
            source: 'WEBAPP',
            master_column: 'MASTERLIST',
            queue_number: typingTestPassed ? generatedQueueNumber : null,
            queue_prefix: typingTestPassed ? queuePrefix : null,
            queue_type: typingTestPassed ? 'INITIAL' : null
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

    static async updatePublicOnCall(id, payload, file, ip, userAgent) {
        await writeAuditLog({
            action: 'APPLICATION_PUBLIC_UPDATE_ONCALL_SNAPSHOT',
            resourceType: 'application',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { body: payload, id, updater: 'Public On-Call Applicant' }
        });

        const metadata = payload.metadata ? JSON.parse(payload.metadata) : {};

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

        const existing = await ApplicationRepository.findById(id);
        const existingMeta = existing ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {})) : {};

        const updatedProcessSettings = {
            ...(existingMeta.process_settings || {}),
            INITIAL_INTERVIEW: 'PASSED',
            TYPING_TEST: 'PASSED',
            ASSESSMENT: 'PENDING'
        };
        const updatedRequiredProcesses = [
            ...(existingMeta.required_processes || [])
        ];

        const mergedMeta = {
            ...existingMeta,
            ...metadata,
            required_processes: updatedRequiredProcesses,
            process_settings: updatedProcessSettings,
        };

        const fields = {
            applicant_name: payload.applicantName ?? existing?.applicant_name ?? null,
            applicant_email: payload.applicantEmail ?? existing?.applicant_email ?? null,
            position_id: payload.positionId ?? existing?.position_id ?? null,
            position_title: payload.positionTitle ?? existing?.position_title ?? null,
            department: (payload.department === 'null' || payload.department === 'undefined') ? (existing?.department ?? null) : (payload.department ?? existing?.department ?? null),
            resume_path: file?.path ?? existing?.resume_path ?? null,
            resume_name: file?.originalname ?? payload.resumeName ?? existing?.resume_name ?? null,
            resume_data: resumeDataBase64 ?? existing?.resume_data ?? null,
            current_status: 'ASSESSMENT',
            master_column: 'MASTERLIST',
            metadata: JSON.stringify(mergedMeta),
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
            preferred_nickname: (payload.preferred_nickname || metadata.preferred_nickname) ?? null,
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
        };

        const updated = await ApplicationRepository.update(id, fields, 'Public Applicant', 'PIS and Typing Test Complete');

        await query('DELETE FROM work_experience WHERE application_id = $1', [id]);
        const workExp = metadata.work_experience || [];
        if (Array.isArray(workExp)) {
            for (const exp of workExp) {
                await ApplicationRepository.createWorkExperience(id, exp);
            }
        }

        await ApplicationRepository.createStatusHistory(id, existing?.current_status || 'INTERVIEW_IN_PROGRESS', 'ASSESSMENT', payload.applicantName, 'PIS and Typing Test submitted by applicant');

        return this.mapApplication(updated);
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

            ids.forEach(id => this.removeCachedApplication(id));

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
        if (!ids || !ids.length) return [];
        const client = await pool.connect();
        const updatedApps = [];
        try {
            await client.query('BEGIN');
            for (const id of ids) {
                const res = await ApplicationRepository.update(id, fields, user?.full_name || 'System', 'Bulk Patch Update');
                if (res) {
                    const mapped = this.mapApplication(res);
                    this.updateCachedApplication(id, mapped);
                    updatedApps.push(mapped);
                }
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

            return updatedApps;
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
            'philhealth_no', 'sss_no', 'tin_no', 'pagibig_no', 'notes',
            'current_status', 'current_status_2', 'current_status_3', 
            'master_hiring_request_id', 'master_last_keep_warm',
            'master_last_name', 'master_middle_name', 'master_first_name',
            'birth_date', 'phone', 'master_rcbc_status', 'master_h2r_status',
            'master_bi_endorsement_date', 'assessment_score', 'typing_test_wpm', 'final_interview_notes',
            'master_id_remarks', 'drug_test', 'master_claim_date', 'master_referee_eid'
        ];
        
        const dateColumns = new Set(['master_neo_date', 'master_training_start_date', 'hired_at', 'interview_completed_at', 'master_first_day_show_up', 'master_second_day_show_up', 'birth_date', 'master_bi_endorsement_date', 'master_claim_date', 'master_last_keep_warm']);

        const formatVal = (v) => {
            if (v === null || v === undefined || String(v).trim() === '') return 'empty';
            return String(v).replace(/^["']|["']$/g, ''); // Remove surrounding quotes if any
        };

        const formatFieldLabel = (field) => {
            if (field.startsWith('master_')) {
                field = field.substring(7);
            }
            return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        const oldMeta = typeof oldApp.metadata === 'string' ? JSON.parse(oldApp.metadata || '{}') : (oldApp.metadata || {});

        for (const col of columnsToCompare) {
            let oldVal = oldApp[col];
            let newVal = newApp[col];

            // Normalize empty string and null/undefined
            let isOldEmpty = (oldVal === null || oldVal === undefined || String(oldVal).trim() === '' || oldVal === '---');
            const isNewEmpty = (newVal === null || newVal === undefined || String(newVal).trim() === '' || newVal === '---');

            if (isOldEmpty && oldMeta) {
                if (oldMeta[col] !== undefined) oldVal = oldMeta[col];
                else if (oldMeta.pis && oldMeta.pis[col] !== undefined) oldVal = oldMeta.pis[col];
                isOldEmpty = (oldVal === null || oldVal === undefined || String(oldVal).trim() === '' || oldVal === '---');
            }

            if (isOldEmpty && isNewEmpty) continue;

            if (dateColumns.has(col)) {
                if (!isOldEmpty && !isNaN(Date.parse(oldVal))) {
                    oldVal = new Date(oldVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
                }
                if (!isNewEmpty && !isNaN(Date.parse(newVal))) {
                    newVal = new Date(newVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
                }
            }

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
        const newMeta = typeof newApp.metadata === 'string' ? JSON.parse(newApp.metadata || '{}') : (newApp.metadata || {});

        const metaKeys = new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]);
        const excludeKeys = new Set([
            'reprofile_history', 'deleted_from_masterlist', 'deleted_from_sheet', 'photo_data_url', 'signature_data_url',
            'pregenerated_queue_number', 'last_updated_by', 'endorsement_meeting_date',
            'endorsement_meeting_end_date', 'endorsement_meeting_body', 'assigned_ops_validator_id', 'assigned_ops_validator_name',
            'ops_validator_status', 'endorsement_confirmed', 'ops_validator_email', 'ops_validator_notes',
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
    }

    static async generateNotification(oldApp, updatedApp, changedByName, io, patch = {}, toStatus = null, fromStatus = null, reason = '') {
        try {
            if (!updatedApp) return;

            // Suppress notifications for background/autosave updates
            if (patch && (patch.change_reason === 'Autosave' || patch.is_autosave === true || reason === 'Autosave')) {
                return;
            }

            let notifTitle = 'Candidate Update';
            let notifMessage = `${updatedApp.applicant_name} status updated`;
            let notifType = 'status_change';

            const targetStatus = toStatus || updatedApp.current_status;
            const sourceStatus = fromStatus || (oldApp ? oldApp.current_status : null);
            const statusChanged = (toStatus || (oldApp && oldApp.current_status !== updatedApp.current_status)) && sourceStatus !== targetStatus;
            const cellEdits = this.getCellEdits(oldApp, updatedApp);

            const getFriendlyStatus = (status) => {
                if (!status) return 'Applied';
                const friendly = {
                    'APPLIED': 'Applied',
                    'TYPING_TEST': 'Typing Test',
                    'INITIAL_INTERVIEW': 'Initial Interview',
                    'INTERVIEW_IN_PROGRESS': 'Interview in Progress',
                    'QUEUE_ASSIGNED': 'Queued',
                    'ASSESSMENT': 'Technical Assessment',
                    'FINAL_INTERVIEW': 'Final Interview',
                    'FINAL_INTERVIEW_SCHEDULED': 'Final Interview Scheduling',
                    'CLIENT_ASSESSMENT': 'Client Assessment',
                    'CLIENT_INTERVIEW': 'Client Interview',
                    'FINAL_VERDICT': 'Verdict',
                    'PASSED': 'Passed',
                    'FAILED': 'Failed',
                    'CONDITIONAL': 'Conditional',
                    'WAITLISTED': 'Waitlisted',
                    'WITHDRAWN': 'Withdrawn',
                    'HIRED': 'Hired',
                    'REJECTED': 'Rejected',
                    'For Job Offer': 'Job Offer Stage',
                    'FOR_JOB_OFFER': 'Job Offer Stage'
                };
                return friendly[status] || status;
            };

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
                    const queueName = qType === 'FINAL' ? 'Final Interview' : 'Initial Screening';
                    notifMessage = `${updatedApp.applicant_name} was added to the ${queueName} queue as number #${qNum}.`;
                    notifType = 'queue_assigned';
                } else if (targetStatus === 'ASSESSMENT') {
                    const scoreText = updatedApp.assessment_score ? ` with a score of ${updatedApp.assessment_score}` : '';
                    notifTitle = 'Advanced to Assessment';
                    notifMessage = `${changedByName} advanced ${updatedApp.applicant_name} to the Technical Assessment stage${scoreText}.`;
                    notifType = 'status_change';
                } else if (sourceStatus === 'APPLIED' && targetStatus === 'INITIAL_INTERVIEW' && reason?.toLowerCase()?.includes('accept')) {
                    notifTitle = 'Application Accepted';
                    notifMessage = `${changedByName} accepted ${updatedApp.applicant_name}'s application for an Initial Interview.`;
                    notifType = 'request_accepted';
                } else if (isOpsChange) {
                    let verdictLabel = 'Pending';
                    const actualVerdict = updatedApp.final_verdict || patch?.pis?.ops_validator_status || targetStatus;
                    if (actualVerdict === 'PASSED' || actualVerdict === 'HIRED' || ['For Job Offer', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(actualVerdict)) {
                        verdictLabel = 'Passed';
                    } else if (actualVerdict === 'FAILED' || actualVerdict === 'REJECTED' || actualVerdict === 'FAIL') {
                        verdictLabel = 'Failed';
                    }

                    let actorTitle = '';
                    if (changedByName && changedByName !== 'System' && changedByName !== 'Audit Officer') {
                        try {
                            const userRes = await query("SELECT role FROM users WHERE full_name = $1 LIMIT 1", [changedByName]);
                            if (userRes.rows.length > 0) {
                                const role = userRes.rows[0].role;
                                if (role === 'ops_validator') {
                                    actorTitle = ' (Operations Validator)';
                                } else if (role === 'admin' || role === 'super_admin') {
                                    actorTitle = ' (Admin)';
                                } else if (role.startsWith('recruiter')) {
                                    actorTitle = ' (Recruiter)';
                                }
                            }
                        } catch (err) {
                            console.error('[Notification Generation] Failed to fetch user role:', err);
                        }
                    }

                    notifTitle = 'Evaluation Verdict Update';
                    if (verdictLabel === 'Passed') {
                        notifMessage = `${changedByName}${actorTitle} passed ${updatedApp.applicant_name}'s evaluation and endorsed them.`;
                    } else if (verdictLabel === 'Failed') {
                        notifMessage = `${changedByName}${actorTitle} marked ${updatedApp.applicant_name}'s evaluation as unsuccessful.`;
                    } else {
                        notifMessage = `${changedByName}${actorTitle} set ${updatedApp.applicant_name}'s evaluation status to pending.`;
                    }
                    notifType = 'evaluation_verdict';
                } else {
                    notifTitle = 'Candidate Advanced';
                    notifMessage = `${changedByName} moved ${updatedApp.applicant_name} from ${getFriendlyStatus(sourceStatus)} to ${getFriendlyStatus(targetStatus)}.`;
                    notifType = 'status_change';
                }
            } else if (cellEdits.length > 0) {
                const scoreEdit = cellEdits.find(e => e.field === 'Assessment Score');
                if (scoreEdit) {
                    notifTitle = 'Assessment Graded';
                    notifMessage = `${changedByName} graded ${updatedApp.applicant_name}'s Technical Assessment with a score of ${scoreEdit.newVal}.`;
                    notifType = 'cell_edit';
                } else {
                    notifTitle = 'Masterlist Updated';
                    notifType = 'cell_edit';
                    if (cellEdits.length === 1) {
                        const edit = cellEdits[0];
                        notifMessage = `${changedByName} updated ${updatedApp.applicant_name}'s "${edit.field}" to ${edit.newVal === 'empty' ? 'empty' : `"${edit.newVal}"`} in the masterlist.`;
                    } else {
                        notifMessage = `${changedByName} updated multiple fields on ${updatedApp.applicant_name}'s masterlist record: ` +
                            cellEdits.map(e => `"${e.field}" to ${e.newVal === 'empty' ? 'empty' : `"${e.newVal}"`}`).join(', ');
                    }
                }
            } else {
                // Suppress general update notifications to prevent auto-save spam
                return;
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
            const ioInstance = getIO();
            ioInstance?.emit('notification:new', {
                title: notifTitle,
                message: notifMessage,
                notification_type: notifType,
                userIds: Array.from(notifyUserIds)
            });
        } catch (notifErr) {
            console.error('[Notification Generation Error]', notifErr);
        }
    }
}
