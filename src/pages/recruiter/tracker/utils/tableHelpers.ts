import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { calculateCEFR } from '../constants';

export const formatDate = (dateStr: any, includeTime: boolean = true) => {
    if (!dateStr) return '';
    try {
        let date: Date;
        
        // Handle Excel Serial Numbers
        if (typeof dateStr === 'number' || (!isNaN(dateStr) && !isNaN(parseFloat(dateStr)) && Number(dateStr) > 40000)) {
            const excelSerial = parseFloat(dateStr);
            date = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
        } else {
            // Handle ISO strings or other date strings
            date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) return String(dateStr);
        
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        };

        if (includeTime && String(dateStr).includes('T') && !String(dateStr).endsWith('T00:00:00.000Z')) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = true;
        }

        return date.toLocaleString('en-US', options);
    } catch {
        return String(dateStr);
    }
};

export const calculateAge = (dobStr: any): string => {
    if (!dobStr) return '';
    try {
        let birthDate: Date;
        if (typeof dobStr === 'number' || (!isNaN(dobStr) && !isNaN(parseFloat(dobStr)) && Number(dobStr) > 40000)) {
            const excelSerial = parseFloat(dobStr);
            birthDate = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
        } else {
            birthDate = new Date(dobStr);
        }
        
        if (isNaN(birthDate.getTime())) return '';
        
        const today = new Date();
        let ageNum = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            ageNum--;
        }
        return ageNum.toString();
    } catch {
        return '';
    }
};

const filterPassedAccounts = (app: Application, val: string) => {
    if (!val) return '';
    
    const statusUpper = app.current_status?.toUpperCase() || '';
    const isHiredOrJO = statusUpper === 'HIRED' || 
                        statusUpper.includes('JOB_OFFER') || 
                        statusUpper.includes('JOB OFFER') ||
                        statusUpper.includes('ACCEPTED') ||
                        statusUpper === 'PASSED';

    // Helper to extract the first account if hired/JO
    const processResult = (accountVal: string) => {
        if (!accountVal) return '';
        const parts = accountVal.split(',').map(s => s.trim()).filter(Boolean);
        if (isHiredOrJO && parts.length > 1) {
            return parts[0];
        }
        return accountVal;
    };

    // 1. If final_account exists (e.g. set via interview session finalization), prefer it
    if (app.pis?.final_account) {
        return processResult(app.pis.final_account);
    }
    
    // 2. If endorsement_account exists, prefer it
    if (app.endorsement_account) {
        return processResult(app.endorsement_account);
    }

    // 3. Fall back to filtering the comma-separated list by failed_accounts
    const failedAccounts = app.metadata?.failed_accounts || [];
    const failedSet = new Set(failedAccounts.map((f: any) => String(f).trim().toLowerCase()));
    
    const remaining = val
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !failedSet.has(s.toLowerCase()));

    if (isHiredOrJO && remaining.length > 1) {
        return remaining[0];
    }
    
    return remaining.join(', ');
};


export const getSheetCellValue = (app: Application, column: string, rowIndex: number, questions: InterviewQuestion[]) => {
    const rawVal = getRawSheetCellValue(app, column, rowIndex, questions);
    if (rawVal === null || rawVal === undefined || rawVal === 'null' || rawVal === 'undefined') return '';
    return rawVal;
};

const fuzzyCache = new Map<string, string>();

const getRawSheetCellValue = (app: Application, column: string, rowIndex: number, questions: InterviewQuestion[]) => {
    const pis = (app.pis || {}) as any;

    // Safety: ensure we never return a raw object/array to React as a renderable child
    const safeStr = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        if (Array.isArray(val)) return val.map(v => safeStr(v)).join(', ');
        if (typeof val === 'object') {
            // Handle {language, proficiency} shape specifically
            if ('language' in val) return [val.language, val.proficiency].filter(Boolean).join(' · ');
            return JSON.stringify(val);
        }
        return String(val);
    };

    const fuzzyGet = (target: string) => {
        if (!pis) return '';
        const keys = Object.keys(pis);
        const cacheKey = target + '|' + keys.join(',');
        if (fuzzyCache.has(cacheKey)) {
            const matchedKey = fuzzyCache.get(cacheKey);
            return matchedKey ? (pis as any)[matchedKey] : '';
        }

        const lt = target.toLowerCase().trim();
        if (!lt) return '';

        // 1. Exact or Case-Insensitive Match (Crucial for symbol-only columns like ')' or ',')
        const exactMatch = keys.find(k => k.toLowerCase().trim() === lt);
        if (exactMatch) {
            fuzzyCache.set(cacheKey, exactMatch);
            return (pis as any)[exactMatch];
        }

        const normalizedTarget = lt.replace(/[^a-z0-9]/g, '');
        if (!normalizedTarget) return '';

        // 2. Stripped Match (ignore symbols/spaces)
        const strippedMatch = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget);
        if (strippedMatch) {
            fuzzyCache.set(cacheKey, strippedMatch);
            return (pis as any)[strippedMatch];
        }

        // 3. Keyword/Substring Scanning (with strict safeguards)
        const scanMatch = keys.find(k => {
            const nk = k.toLowerCase();
            const normalizedK = nk.replace(/[^a-z0-9]/g, '');
            if (!normalizedK) return false;

            // Strict Safeguard: Prevent generic email fields and specialized ones from colliding
            const isGenericK = normalizedK === 'email' || normalizedK === 'emailaddress';
            const isGenericT = normalizedTarget === 'email' || normalizedTarget === 'emailaddress';
            
            // 1. Don't let 'Email' (K) match 'Ops Validator Email' (T)
            if (isGenericK && normalizedTarget.includes(normalizedK) && normalizedTarget.length > 10) return false;
            
            // 2. Don't let 'Ops Validator Email' (K) match 'Email' (T)
            if (isGenericT && normalizedK.includes(normalizedTarget) && normalizedK.length > 10) return false;
            
            // Allow TARGET to include KEY only if KEY is specific enough (like 'opsval')
            if (normalizedTarget.includes(normalizedK) && (normalizedK.length >= 6 || normalizedK === normalizedTarget)) return true;
            
            // Allow KEY to include TARGET (e.g., 'Candidate Email Address' matches 'Email')
            if (normalizedK.includes(normalizedTarget)) {
                // Safeguard against short targets (like 'age' or 'id') matching randomly inside other words (like 'languages' or 'pagibig')
                if (normalizedTarget.length <= 3) {
                    const boundaryRegex = new RegExp(`\\b${lt}\\b`, 'i');
                    return boundaryRegex.test(k);
                }
                return true;
            }

            return false;
        });
        if (scanMatch) {
            fuzzyCache.set(cacheKey, scanMatch);
            return (pis as any)[scanMatch];
        }

        // 4. Common Abbreviations/Shorthand (Clinical/Registry Specific)
        const commonShorts: Record<string, string> = {
            'opsvalidator': 'opsval',
            'opsval': 'opsvalidator',
            'clientinterviewer': 'clientinterviewer',
            'interviewer': 'interviewer',
            'validator': 'opsval'
        };

        const shorthandMatch = keys.find(k => {
            const nk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!nk) return false;
            
            let swappedK = nk;
            Object.entries(commonShorts).forEach(([full, short]) => {
                if (nk.includes(full)) swappedK = nk.replace(full, short);
                else if (nk.includes(short)) swappedK = nk.replace(short, full);
            });

            // Swapped match must be significant
            if (swappedK === normalizedTarget) return true;
            if (swappedK.includes(normalizedTarget) && normalizedTarget.length > 5) return true;
            
            return false;
        });
        if (shorthandMatch) {
            fuzzyCache.set(cacheKey, shorthandMatch);
            return (pis as any)[shorthandMatch];
        }

        fuzzyCache.set(cacheKey, '');
        return '';
    };


    switch (column) {
        case "Id": return (rowIndex + 1).toString();
        case "Start time": return formatDate(app.applied_at);
        case "Completion time": return formatDate(app.updated_at);
        case "Email": return app.applicant_email || fuzzyGet("Email") || '';
        case "RECRUITER / INTERVIEWER":
            return app.assigned_recruiter_name || app.interviewer_name || fuzzyGet("RECRUITER / INTERVIEWER") || '';
        case "Name": 
            return app.applicant_name || fuzzyGet("Name") || '';
        case "Candidate's Complete Name (First, Middle and Last Name)":
            return app.applicant_name || fuzzyGet("Candidate's Complete Name") || '';
        case "Interview Date": return formatDate(app.interview_completed_at || fuzzyGet("Interview Date")) || '';
        case "Position Applying for?": return app.position_title || fuzzyGet("Position Applying for") || '';
        case "Summary of Background and Experience": return pis?.summary_of_background || fuzzyGet("Summary of Background and Experience") || '';
        case "If you don't mind us asking how much is your salary expectations?": return pis?.salary_expectation || fuzzyGet("salary expectations") || '';
        case "Date of Birth":
        case "DATE OF BIRTH":
        case "Birth Date":
            return formatDate(pis?.birth_date || fuzzyGet("Date of Birth"), false);
        case "Age": {
            const dob = pis?.birth_date || fuzzyGet("Date of Birth");
            return calculateAge(dob) || pis?.age?.toString() || fuzzyGet("Age") || '';
        }
        case "Gender": return pis?.gender || fuzzyGet("Gender") || '';
        case "Civil Status": return pis?.civil_status || fuzzyGet("Civil Status") || '';
        case "Contact Number":
        case "CONTACT NO.":
            return pis?.phone || fuzzyGet("Contact Number") || fuzzyGet("Phone") || '';

        case "Current Address": return pis?.current_address || fuzzyGet("Current Address") || '';
        case "Do you have any BPO experience": return pis?.bpo_experience || fuzzyGet("BPO experience") || '';
        case "Tenure in the BPO Industry": return pis?.tenure_bpo || fuzzyGet("Tenure in the BPO Industry") || '';
        case "Highest Educational Background": return pis?.highest_education || fuzzyGet("Educational Background") || '';
        case "Strand (if applicable)": {
            const edu = String(pis?.highest_education || fuzzyGet("Educational Background") || '').toLowerCase();
            if (edu.includes('college')) return 'N/A';
            return pis?.shs_strand || app.metadata?.shs_strand || pis?.course_strand || fuzzyGet("Strand") || '';
        }
        case "Course and Year Level": {
            const edu = String(pis?.highest_education || fuzzyGet("Educational Background") || '').toLowerCase();
            if (edu.includes('shs') || edu.includes('senior high')) return 'N/A';
            return pis?.course_year || pis?.degree || pis?.course_strand || fuzzyGet("Course and Year Level") || '';
        }
        case "Do you have plans in going back to school this year?": return pis?.plans_back_to_school || fuzzyGet("plans in going back to school") || '';
        case "Do you have the following requirements or government IDs? (ie. SSS/Philhealth/Pag-ibig/BIR Tin/NBI)": return pis?.government_ids || fuzzyGet("government IDs") || '';
        case "Where did you hear that we are hiring?": return pis?.hiring_source_detailed || fuzzyGet("Where did you hear") || '';
        case "I’ve asked you a lot of questions, and now I’d love to hear from you. Do you have any questions about the role, the team, or the company that I can answer": 
            return pis?.candidate_questions || fuzzyGet("any questions about the role") || '';
        case "INTERVIEWER": return app.interviewer_name || app.assigned_recruiter_name || fuzzyGet("INTERVIEWER") || '';
        case "INITIAL ACCOUNT ASSIGNMENT": {
            const rawVal = pis?.initial_account_assignment || pis?.account_assignment || app.department || pis?.['INITITAL ACCOUNT ASSIGNMENT'] || fuzzyGet("INITIAL ACCOUNT ASSIGNMENT") || fuzzyGet("INITITAL ACCOUNT ASSIGNMENT") || '';
            const hasReprofileHistory = !!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0));
            if (!hasReprofileHistory) {
                return rawVal;
            }
            return filterPassedAccounts(app, rawVal);
        }
        case "INITIAL INTERVIEW RESULTS":
            // Only read from known interview result fields — do NOT fall back to current_status
            // or fuzzyGet, which can match pipeline stage names like FINAL_INTERVIEW
            return pis?.initial_interview_result || pis?.interview_result || pis?.initial_interview_results || pis?.['INITITAL INTERVIEW RESULTS'] || pis?.ii_result || '';
        case "CEFR": return pis?.cefr_level || calculateCEFR(app);
        case "Personality Test (Enercare; Leadership)": return pis?.personality_test || fuzzyGet("Personality Test") || '';
        case "Typing Speed (Number Only)": return app.typing_test_wpm?.toString() || fuzzyGet("Typing Speed") || '';
        case "Typing Accuracy (Percentage)": return app.typing_test_accuracy?.toString() || fuzzyGet("Typing Accuracy") || '';
        case "Ops Validator Email": 
        case "Ops val email":
        case "Ops Val Email":
            return pis?.ops_validator_email || pis?.ops_val_email || fuzzyGet("Ops Validator Email") || '';
        case "Ops Val Status": return pis?.ops_validator_status || pis?.ops_val_status || fuzzyGet("Ops Val Status") || '';
        case "Ops Val Notes if Available": return cleanColumn1Text(pis?.ops_validator_notes || pis?.ops_val_notes || fuzzyGet("Ops Val Notes") || app.final_interview_notes || '');
        case "Leadership Assessment Status (if applicable)": return pis?.leadership_assessment_status || fuzzyGet("Leadership Assessment") || '';
        case "Wonderlic Status (if applicable)": return pis?.wonderlic_status || fuzzyGet("Wonderlic Status") || '';
        case "Client Interviewer Email": 
        case "Client Interview Email":
            return pis?.client_interviewer_email || pis?.client_interview_email || fuzzyGet("Client Interviewer Email") || '';
        case "Client Interview Status (if applicable)": return pis?.client_interview_status || fuzzyGet("Client Interview Status") || '';
        case "Client Interview Notes if Available": return pis?.client_interview_notes || fuzzyGet("Client Interview Notes") || '';
        case "Final Specific Status": return pis?.final_specific_status || fuzzyGet("Final Specific Status") || '';
        case "Application Status": return app.current_status || '';
        case "Overall Status": return pis?.overall_status || app.overall_status || 'OPEN';
        case "Hire Date": return formatDate(app.hired_at || fuzzyGet("Hire Date"), false);
        case "Final Account": {
            const rawVal = pis?.final_account || fuzzyGet("Final Account") || '';
            return filterPassedAccounts(app, rawVal);
        }
        case "Last Processed/Updated By:": return pis?.last_updated_by || app.assigned_recruiter_name || fuzzyGet("Updated By") || '';
        case "Column1": return cleanColumn1Text(pis?.notes || fuzzyGet("Notes") || fuzzyGet("Remarks") || fuzzyGet("Comments") || fuzzyGet("Additional Info") || fuzzyGet("Column1") || '');
        case "H2R Status":
        case "H2R STATUS":
            return app.master_h2r_status || fuzzyGet("H2R") || '';
        case "SSS No.":
            return pis?.sss_no || '';
        case "PhilHealth No.":
            return pis?.philhealth_no || '';
        case "Pag-Ibig No.":
            return pis?.pagibig_no || '';
        case "Tin No.":
            return pis?.tin_no || app.tin_no || '';
        case "PHIC":
            return pis?.philhealth_no || fuzzyGet("PHIC") || '';
        default: {
            const fuzzyVal = fuzzyGet(column);
            if (fuzzyVal !== null && fuzzyVal !== undefined && fuzzyVal !== '') return safeStr(fuzzyVal);

            const q = questions.find(q => q.question_text.trim().toLowerCase() === column.trim().toLowerCase());
            if (q) return app.interview_responses?.[q.id] || '';
            return '';
        }
    }
};

export const getPivotCellValue = (app: Application, column: string) => {
    const pis = app.pis;
    const status = app.current_status;

    switch (column) {
        case "Overall Status": return status;
        case "Final Specific Status": return app.final_verdict || status;
        case "CEFR": return calculateCEFR(app);
        case "Name": return app.applicant_name;
        case "Candidate's Complete Name (First, Middle and Last Name)": return pis?.full_name || app.applicant_name;
        case "Conditional": return status === 'CONDITIONAL' ? '1' : '0';
        case "FAILED": return status === 'FAILED' ? '1' : '0';
        case "PASSED": return status === 'PASSED' ? '1' : '0';
        case "Promotion": return status === 'PROMOTION' ? '1' : '0';
        case "Waitlisted": return status === 'WAITLISTED' ? '1' : '0';
        case "Withdrawn": return status === 'WITHDRAWN' ? '1' : '0';
        case "Not Eligible for Rehire": return status === 'NOT_ELIGIBLE_FOR_REHIRE' ? '1' : '0';
        case "N/A": return '0';
        case "Grand Total": return '1';
        default: return '';
    }
};

export const getVlistCellValue = (app: Application, column: string) => {
    const pis = app.pis;
    switch (column) {
        case "Specific Status": return app.pis?.final_specific_status || '';
        case "Overall Status": return app.current_status;
        case "Personality Test": return "";
        case "CEFR": return calculateCEFR(app);
        case "Wonderlic": return app.assessment_score?.toString() || '';
        case "Leadership Assessment": return pis?.leadership_score || '';
        case "Ops Val Status": return "";
        case "Client Interview Status": return "";
        case "Recruiter": return app.assigned_recruiter_name || '';
        case "Final Account": {
            const rawVal = pis?.final_account || '';
            return filterPassedAccounts(app, rawVal);
        }
        default: return '';
    }
};

export const getTlCellValue = (app: Application, column: string, rowIndex: number) => {
    const pis = app.pis;
    switch (column) {
        case "#": return (rowIndex + 1).toString();
        case "Name": return app.applicant_name;
        case "Position": return app.position_title;
        case "Background and Experience": return pis?.background_summary || '';
        case "Tenure as TL": return pis?.tl_tenure || '';
        case "Total BPO Exp": return pis?.bpo_experience_tenure || '';
        case "Salary Expectation": return pis?.salary_expectation || '';
        case "Source": return pis?.hiring_source || '';
        case "Status": return app.current_status;
        default: return '';
    }
};

export const getBilingualsCellValue = (app: Application, column: string, rowIndex: number) => {
    const pis = app.pis;
    const colTrim = column.trim();
    switch (colTrim) {
        case "#": return (rowIndex + 1).toString();
        case "Candidate's Name": return app.applicant_name;
        case "Position": return app.position_title;
        case "Preferred Set-up": return pis?.preferred_setup || '';
        case "Willing to Relocate": return pis?.willing_to_relocate || '';
        case "Salary": return pis?.salary_expectation || '';
        case "Status": return app.current_status;
        case "Notes": return app.final_interview_notes || '';
        default: return '';
    }
};

export const getTeamLeaderCellValue = (app: Application, column: string, rowIndex: number) => {
    const pis = app.pis;
    const colTrim = column.trim();
    switch (colTrim) {
        case "#": return (rowIndex + 1).toString();
        case "Name": return app.applicant_name;
        case "Position": return app.position_title;
        case "Background and Experience": return pis?.summary_of_background || '';
        case "Tenure as TL": return pis?.tenure_as_tl || '';
        case "Total BPO Exp": return pis?.total_bpo_experience || '';
        case "Salary Expectation": return pis?.salary_expectation || '';
        case "Source": return app.source || '';
        case "Status": return app.current_status;
        default: return '';
    }
};

export const getSupportHiringCellValue = (app: Application, column: string, rowIndex: number) => {
    const pis = app.pis;
    switch (column) {
        case "#": return (rowIndex + 1).toString();
        case "Candidate's Name": return app.applicant_name;
        case "Position": return app.position_title;
        case "Initial Interview": return pis?.initial_interview_result || '';
        case "2nd Level Interview": return pis?.second_level_interview_result || '';
        case "Ops Val Interview": return pis?.final_interview_result || '';
        case "Leadership Assessment": return pis?.leadership_score || '';
        case "Contact Information": return pis?.phone || '';
        case "Email Address": return app.applicant_email;
        case "Interviewer": return app.interviewer_name || app.assigned_recruiter_name || '';
        default: return '';
    }
};

export const getSheetColumnKey = (column: string, questions: InterviewQuestion[]) => {
    const q = questions.find(q => q.question_text.trim().toLowerCase() === column.trim().toLowerCase());
    if (q) return q.id;
    const mapping: Record<string, string> = {
        "Email": "applicant_email",
        "Name": "applicant_name",
        "Interview Date": "interview_completed_at",
        "Candidate's Complete Name (First, Middle and Last Name)": "pis_full_name",
        "Position Applying for?": "position_title",
        "Summary of Background and Experience": "pis_summary_of_background",
        "If you don't mind us asking how much is your salary expectations?": "pis_salary_expectation",
        "Date of Birth": "pis_birth_date",
        "Age": "pis_age",
        "Gender": "pis_gender",
        ")": "pis_bracket_artifact",
        "Civil Status": "pis_civil_status",
        "Contact Number": "pis_phone",
        ",": "pis_comma_artifact",
        "Current Address": "pis_current_address",
        "Do you have any BPO experience": "pis_bpo_experience",
        "Tenure in the BPO Industry": "pis_tenure_bpo",
        "Highest Educational Background": "pis_highest_education",
        "Strand (if applicable)": "pis_course_strand",
        "Course and Year Level": "pis_course_year",
        "Do you have plans in going back to school this year?": "pis_plans_back_to_school",
        "Do you have the following requirements or government IDs? (ie. SSS/Philhealth/Pag-ibig/BIR Tin/NBI)": "pis_government_ids",
        "Where did you hear that we are hiring?": "pis_hiring_source_detailed",
        "I’ve asked you a lot of questions, and now I’d love to hear from you. Do you have any questions about the role, the team, or the company that I can answer": "pis_candidate_questions",
        "INTERVIEWER": "interviewer_name",
        "INITIAL ACCOUNT ASSIGNMENT": "pis_initial_account_assignment",
        "INITIAL INTERVIEW RESULTS": "pis_initial_interview_results",
        "CEFR": "pis_cefr_level",
        "Personality Test (Enercare; Leadership)": "pis_personality_test",
        "Typing Speed (Number Only)": "typing_test_wpm",
        "Typing Accuracy (Percentage)": "typing_test_accuracy",
        "Ops Validator Email": "pis_ops_validator_email",
        "Ops Val Status": "pis_ops_validator_status",
        "Ops Val Notes if Available": "pis_ops_validator_notes",
        "Leadership Assessment Status (if applicable)": "pis_leadership_assessment_status",
        "Wonderlic Status (if applicable)": "pis_wonderlic_status",
        "Client Interviewer Email": "pis_client_interviewer_email",
        "Client Interview Status (if applicable)": "pis_client_interview_status",
        "Client Interview Notes if Available": "pis_client_interview_notes",
        "Final Specific Status": "pis_final_specific_status",
        "Application Status": "current_status",
        "Overall Status": "pis_overall_status",
        "Hire Date": "hired_at",
        "Final Account": "pis_final_account",
        "Last Processed/Updated By:": "pis_last_updated_by",
        "Column1": "pis_notes",
        "H2R Status": "master_h2r_status",
        "H2R STATUS": "master_h2r_status",
        "SSS No.": "pis_sss_no",
        "PhilHealth No.": "pis_philhealth_no",
        "Pag-Ibig No.": "pis_pagibig_no",
        "Tin No.": "pis_tin_no",
        "PHIC": "pis_philhealth_no"
    };
    return mapping[column] || column;
};

export const getPivotColumnKey = (column: string) => {
    if (column === "Overall Status") return "current_status";
    if (column === "Final Specific Status") return "pis_final_specific_status";
    if (column === "CEFR") return "cefr_level";
    return column;
};

export const getVlistColumnKey = (column: string) => {
    const mapping: Record<string, string> = {
        "Specific Status": "pis_final_specific_status",
        "Overall Status": "current_status",
        "Personality Test": "personality_test_score",
        "CEFR": "cefr_level",
        "Wonderlic": "wonderlic_score",
        "Leadership Assessment": "leadership_score",
        "Ops Val Status": "ops_val_status",
        "Client Interview Status": "client_interview_status",
        "Final Account": "master_wave"
    };
    return mapping[column] || column;
};

export const getTlColumnKey = (column: string) => {
    const mapping: Record<string, string> = {
        "Name": "applicant_name",
        "Position": "position_title",
        "Background and Experience": "pis_background_summary",
        "Tenure as TL": "pis_tl_tenure",
        "Total BPO Exp": "pis_bpo_experience_tenure",
        "Salary Expectation": "pis_salary_expectation",
        "Source": "pis_hiring_source",
        "Status": "current_status"
    };
    return mapping[column] || column;
};

export const getBilingualsColumnKey = (column: string) => {
    const mapping: Record<string, string> = {
        "Candidate's Name": "applicant_name",
        "Position": "position_title",
        "Preferred Set-up": "pis_preferred_setup",
        "Willing to Relocate": "pis_willing_to_relocate",
        "Salary": "pis_salary_expectation",
        "Status": "current_status",
        "Notes": "final_interview_notes"
    };
    return mapping[column.trim()] || column.trim();
};

export const getTeamLeaderColumnKey = (column: string) => {
    const mapping: Record<string, string> = {
        "Name": "applicant_name",
        "Position": "position_title",
        "Background and Experience": "pis_summary_of_background",
        "Tenure as TL": "pis_tenure_as_tl",
        "Total BPO Exp": "pis_total_bpo_experience",
        "Salary Expectation": "pis_salary_expectation",
        "Source": "source",
        "Status": "current_status"
    };
    return mapping[column.trim()] || column.trim();
};

export const getSupportHiringColumnKey = (column: string) => {
    const mapping: Record<string, string> = {
        "Candidate's Name": "applicant_name",
        "Position": "position_title",
        "Initial Interview": "pis_initial_interview_result",
        "2nd Level Interview": "pis_second_level_interview_result",
        "Ops Val Interview": "pis_final_interview_result",
        "Leadership Assessment": "pis_leadership_score",
        "Contact Information": "pis_phone",
        "Email Address": "applicant_email",
        "Interviewer": "interviewer_name"
    };
    return mapping[column] || column;
};

export function cleanColumn1Text(val: string): string {
    if (!val) return '';
    if (val.includes('INTERVIEWER ASSESSMENT RUBRIC') || val.includes('RATINGS & CLASSIFICATIONS')) {
        const lines = val.split('\n');
        const ratingsStartIdx = lines.findIndex(line => line.includes('RATINGS & CLASSIFICATIONS'));
        if (ratingsStartIdx !== -1) {
            const relevantLines = lines.slice(ratingsStartIdx + 1)
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('===') && !l.includes('CLASSIFICATIONS'));
            
            const cleaned = relevantLines.filter(l => 
                l.toLowerCase() !== 'remarks:' && 
                !l.toLowerCase().includes('personal rating:')
            );
            if (cleaned.length > 0) {
                return cleaned.join(' | ');
            }
            return '';
        }
    }
    return val;
}
