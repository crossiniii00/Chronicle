import { query } from '../db.js';

function toIso(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString();
    return String(v);
}

function toDateOnly(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

async function safeQuery(label, sql, params = []) {
    try {
        const rows = (await query(sql, params)).rows;
        return { ok: true, rows };
    } catch (err) {
        console.warn(`[AITools] ${label} failed:`, err.message);
        return { ok: false, error: err.message, rows: [] };
    }
}

function errResult(message) {
    return { ok: false, error: message };
}

function okResult(data) {
    return { ok: true, data };
}

function humanize(s) {
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const toolDefinitions = [
    {
        name: 'list_accounts',
        description: 'List and search MHRT accounts (clients/companies). Supports filtering by LOB, status, and name search. Returns a compact list with key fields — use get_account_details for full info on a specific account.',
        parameters: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Substring to match against account name (case-insensitive).' },
                lob: { type: 'string', description: 'Filter by line of business.' },
                status: { type: 'string', description: 'Filter by ov_status (e.g. "Active", "Pending", "Inactive").' },
                limit: { type: 'number', description: 'Max results to return (default 20, max 100).' },
            },
        },
    },
    {
        name: 'get_account_details',
        description: 'Get the FULL record for a single MHRT account by name or id, including salary, allowance, job description, voice type, requirements, etc. Use this when the user wants complete info on one specific account.',
        parameters: {
            type: 'object',
            properties: {
                account_name: { type: 'string', description: 'Account name (case-insensitive substring match).' },
                account_id: { type: 'string', description: 'Account UUID (exact match).' },
            },
        },
    },
    {
        name: 'list_open_quotas',
        description: 'List currently OPEN hiring quotas (positions with hiring_quota > 0 and status OPEN). Supports filtering by department and Billed/Non-Billed type. Returns the quota target, current hired count, and date window.',
        parameters: {
            type: 'object',
            properties: {
                department: { type: 'string', description: 'Filter by department name (case-insensitive).' },
                type: { type: 'string', enum: ['Billed', 'Non-Billed'], description: 'Filter by hiring type.' },
            },
        },
    },
    {
        name: 'get_quota_details',
        description: 'Get the full record for a single open hiring quota by id, title, or department.',
        parameters: {
            type: 'object',
            properties: {
                quota_id: { type: 'string', description: 'Position UUID.' },
                title: { type: 'string', description: 'Position title (case-insensitive substring match).' },
                department: { type: 'string', description: 'Department name (case-insensitive).' },
            },
        },
    },
    {
        name: 'get_quota_history',
        description: 'Get closed hiring quota history with success metrics (hired vs target, total applicants, in pipeline, failed, dates). Use this to analyze past quota performance.',
        parameters: {
            type: 'object',
            properties: {
                department: { type: 'string', description: 'Filter by department name (case-insensitive).' },
                limit: { type: 'number', description: 'Max results (default 10, max 50).' },
            },
        },
    },
    {
        name: 'search_applicants',
        description: 'Search and filter applicants across every common field. Returns a compact list of matching applicants. For aggregations and rates (e.g. "passing rate of male college graduates"), use aggregate_applicants instead.',
        parameters: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Substring to match against name, email, or position_title.' },
                status: { type: 'string', description: 'Filter by current_status (e.g. APPLIED, HIRED, REJECTED, FAILED, FINAL_INTERVIEW, etc.).' },
                department: { type: 'string', description: 'Filter by department (substring).' },
                position: { type: 'string', description: 'Filter by position_title (substring).' },
                applied_after: { type: 'string', description: 'ISO date — only applicants applied on or after this date.' },
                applied_before: { type: 'string', description: 'ISO date — only applicants applied on or before this date.' },
                hired_after: { type: 'string', description: 'ISO date — only applicants hired on or after this date.' },
                hired_before: { type: 'string', description: 'ISO date — only applicants hired on or before this date.' },
                gender: { type: 'string', description: 'Filter by gender (exact, e.g. "Male", "Female").' },
                civil_status: { type: 'string', description: 'Filter by civil_status (exact, e.g. "Single", "Married").' },
                religion: { type: 'string', description: 'Filter by religion (substring).' },
                blood_type: { type: 'string', description: 'Filter by blood_type (exact).' },
                citizenship: { type: 'string', description: 'Filter by citizenship (substring).' },
                education_level: { type: 'string', description: 'Alias for highest_education — accepts "College", "Vocational", "High School", etc.' },
                highest_education: { type: 'string', description: 'Filter by highest_education (substring, e.g. "College Graduate", "Senior High School Graduate").' },
                school_name: { type: 'string', description: 'Filter by school_name (substring).' },
                course: { type: 'string', description: 'Filter by course (substring).' },
                degree: { type: 'string', description: 'Filter by degree (substring).' },
                course_strand: { type: 'string', description: 'Filter by course_strand (substring).' },
                graduation_year: { type: 'string', description: 'Filter by graduation_year (exact).' },
                num_children: { type: 'string', description: 'Filter by num_children (exact).' },
                num_siblings: { type: 'string', description: 'Filter by num_siblings (exact).' },
                assigned_recruiter: { type: 'string', description: 'Filter by assigned_recruiter_name (substring).' },
                assigned_ops_validator: { type: 'string', description: 'Filter by assigned_ops_validator_name (substring).' },
                source: { type: 'string', description: 'Filter by source (substring).' },
                hiring_source: { type: 'string', description: 'Filter by hiring_source (substring).' },
                final_verdict: { type: 'string', description: 'Filter by final_verdict (substring).' },
                final_specific_status: { type: 'string', description: 'Filter by pis.final_specific_status (substring, e.g. "OV - Passed", "OV - Failed").' },
                ops_validator_status: { type: 'string', description: 'Filter by pis.ops_validator_status (substring, e.g. "PASSED", "FAILED").' },
                client_interview_status: { type: 'string', description: 'Filter by pis.client_interview_status (substring).' },
                wonderlic_status: { type: 'string', description: 'Filter by pis.wonderlic_status (substring).' },
                leadership_status: { type: 'string', description: 'Filter by pis.leadership_assessment_status (substring).' },
                final_account: { type: 'string', description: 'Filter by pis.final_account (substring).' },
                master_wave: { type: 'string', description: 'Filter by master_wave (substring).' },
                master_hiring_request_id: { type: 'string', description: 'Filter by master_hiring_request_id (substring).' },
                min_typing_wpm: { type: 'number', description: 'Only applicants with typing_test_wpm >= this value. Use for "fast typists", "WPM above 50", etc.' },
                min_typing_accuracy: { type: 'number', description: 'Only applicants with typing_test_accuracy >= this value (0-100).' },
                min_assessment_score: { type: 'number', description: 'Only applicants with assessment_score >= this value (0-100).' },
                max_assessment_score: { type: 'number', description: 'Only applicants with assessment_score <= this value (0-100).' },
                min_personal_rating: { type: 'number', description: 'Only applicants with personal rating >= this value (1-10).' },
                sort_by: { type: 'string', enum: ['applied_at_desc', 'applied_at_asc', 'name_asc', 'name_desc', 'assessment_score_desc', 'assessment_score_asc', 'client_assessment_score_desc', 'client_assessment_score_asc', 'typing_wpm_desc', 'typing_wpm_asc', 'typing_accuracy_desc', 'personal_rating_desc', 'personal_rating_asc'], description: 'How to sort results. Default: applied_at_desc. Use typing_wpm_desc for "fastest typists", assessment_score_desc for "highest scoring", personal_rating_desc for "top rated", etc.' },
                limit: { type: 'number', description: 'For viz "applicant_list": max applicants to show (default 50, max 200).' },
                search: { type: 'string', description: 'For viz "applicant_list": free-text search across name/email/position.' },
            },
        },
    },
    {
        name: 'aggregate_applicants',
        description: 'Aggregate applicants across any combination of filters — returns counts broken down by status AND computed metrics (passing_rate, failure_rate, hired/total, etc.). Use this for analytical questions like "what is the passing rate of male college graduates" or "compare hiring rates across departments". If group_by is supplied, returns per-group breakdown; otherwise returns a single aggregate row.',
        parameters: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Substring to match against name, email, or position_title.' },
                status: { type: 'string', description: 'Filter by current_status.' },
                department: { type: 'string', description: 'Filter by department (substring).' },
                position: { type: 'string', description: 'Filter by position_title (substring).' },
                applied_after: { type: 'string', description: 'ISO date — only applicants applied on or after this date.' },
                applied_before: { type: 'string', description: 'ISO date — only applicants applied on or before this date.' },
                hired_after: { type: 'string', description: 'ISO date — only applicants hired on or after this date.' },
                hired_before: { type: 'string', description: 'ISO date — only applicants hired on or before this date.' },
                gender: { type: 'string', description: 'Filter by gender.' },
                civil_status: { type: 'string', description: 'Filter by civil_status.' },
                religion: { type: 'string', description: 'Filter by religion.' },
                blood_type: { type: 'string', description: 'Filter by blood_type.' },
                citizenship: { type: 'string', description: 'Filter by citizenship.' },
                highest_education: { type: 'string', description: 'Filter by highest_education.' },
                school_name: { type: 'string', description: 'Filter by school_name.' },
                course: { type: 'string', description: 'Filter by course.' },
                degree: { type: 'string', description: 'Filter by degree.' },
                course_strand: { type: 'string', description: 'Filter by course_strand.' },
                graduation_year: { type: 'string', description: 'Filter by graduation_year.' },
                num_children: { type: 'string', description: 'Filter by num_children.' },
                num_siblings: { type: 'string', description: 'Filter by num_siblings.' },
                assigned_recruiter: { type: 'string', description: 'Filter by assigned_recruiter_name.' },
                assigned_ops_validator: { type: 'string', description: 'Filter by assigned_ops_validator_name.' },
                source: { type: 'string', description: 'Filter by source.' },
                hiring_source: { type: 'string', description: 'Filter by hiring_source.' },
                final_verdict: { type: 'string', description: 'Filter by final_verdict.' },
                final_specific_status: { type: 'string', description: 'Filter by pis.final_specific_status.' },
                ops_validator_status: { type: 'string', description: 'Filter by pis.ops_validator_status.' },
                client_interview_status: { type: 'string', description: 'Filter by pis.client_interview_status.' },
                wonderlic_status: { type: 'string', description: 'Filter by pis.wonderlic_status.' },
                leadership_status: { type: 'string', description: 'Filter by pis.leadership_assessment_status.' },
                final_account: { type: 'string', description: 'Filter by pis.final_account.' },
                master_wave: { type: 'string', description: 'Filter by master_wave.' },
                master_hiring_request_id: { type: 'string', description: 'Filter by master_hiring_request_id.' },
                group_by: {
                    type: 'string',
                    enum: [
                        'gender', 'civil_status', 'religion', 'blood_type', 'citizenship',
                        'highest_education', 'school_name', 'course', 'degree',
                        'graduation_year', 'department', 'position_title', 'current_status',
                        'assigned_recruiter_name', 'assigned_ops_validator_name',
                        'source', 'hiring_source', 'final_verdict',
                        'final_specific_status', 'ops_validator_status', 'client_interview_status',
                        'wonderlic_status', 'leadership_assessment_status', 'final_account',
                        'master_wave', 'master_hiring_request_id',
                    ],
                    description: 'Optional field to group the aggregate by. If supplied, returns one row per group. If omitted, returns a single overall aggregate.',
                },
            },
        },
    },
    {
        name: 'get_applicant_details',
        description: 'Get the FULL applicant record by id, name, or email, including personal info, education, family, government IDs, and the full status history.',
        parameters: {
            type: 'object',
            properties: {
                applicant_id: { type: 'string', description: 'Application UUID.' },
                name: { type: 'string', description: 'Applicant name (case-insensitive substring match).' },
                email: { type: 'string', description: 'Applicant email (exact match).' },
            },
        },
    },
    {
        name: 'list_interview_questions',
        description: 'List interview questions from the question bank. Supports filtering by category (e.g. "Initial", "Final") and question type (initial/final/etc).',
        parameters: {
            type: 'object',
            properties: {
                category: { type: 'string', description: 'Filter by category (substring match).' },
                question_type: { type: 'string', description: 'Filter by question_type (e.g. "initial", "final").' },
                active_only: { type: 'boolean', description: 'Only return active questions (default true).' },
                limit: { type: 'number', description: 'Max results (default 50, max 200).' },
            },
        },
    },
    {
        name: 'list_email_templates',
        description: 'List email templates (subject, body, type). Useful for finding templates the team uses for outreach, offers, etc.',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', description: 'Filter by template type.' },
                active_only: { type: 'boolean', description: 'Only return active templates (default true).' },
                limit: { type: 'number', description: 'Max results (default 20).' },
            },
        },
    },
    {
        name: 'list_h2r_records',
        description: 'List MHRT H2R (Human-to-Resource) records. Supports filtering by account, division, line of business, department.',
        parameters: {
            type: 'object',
            properties: {
                account: { type: 'string', description: 'Filter by account name (substring).' },
                division: { type: 'string', description: 'Filter by division.' },
                line_of_business: { type: 'string', description: 'Filter by line of business.' },
                department: { type: 'string', description: 'Filter by department.' },
                limit: { type: 'number', description: 'Max results (default 20, max 100).' },
            },
        },
    },
    {
        name: 'list_directory_entries',
        description: 'List MHRT directory entries (employees on distro lists). Supports filtering by account, team, name, distro.',
        parameters: {
            type: 'object',
            properties: {
                account: { type: 'string', description: 'Filter by account name (substring).' },
                team: { type: 'string', description: 'Filter by team (substring).' },
                search: { type: 'string', description: 'Substring to match against name or distro.' },
                limit: { type: 'number', description: 'Max results (default 20, max 100).' },
            },
        },
    },
    {
        name: 'list_departments',
        description: 'List all departments in the system. Simple list with no parameters.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'list_users',
        description: 'List all users in the system. Returns id, name, email, role, department, active status. Does NOT return password hashes.',
        parameters: {
            type: 'object',
            properties: {
                role: { type: 'string', description: 'Filter by role (e.g. admin, recruiter, ops_validator).' },
                department: { type: 'string', description: 'Filter by department (substring).' },
                active_only: { type: 'boolean', description: 'Only return active users (default true).' },
                limit: { type: 'number', description: 'Max results (default 50).' },
            },
        },
    },
    {
        name: 'get_pipeline_stats',
        description: 'Get aggregate pipeline statistics for applicants — total counts broken down by status, with optional date range. Useful for reporting and trend analysis.',
        parameters: {
            type: 'object',
            properties: {
                applied_after: { type: 'string', description: 'ISO date — only count applicants applied on or after this date.' },
                applied_before: { type: 'string', description: 'ISO date — only count applicants applied on or before this date.' },
                department: { type: 'string', description: 'Filter by department (substring).' },
            },
        },
    },
    {
        name: 'get_recent_audit_events',
        description: 'Get recent audit log entries (user actions, login attempts, AI calls, etc.). Useful for security review or activity tracking.',
        parameters: {
            type: 'object',
            properties: {
                user_email: { type: 'string', description: 'Filter by user email.' },
                action: { type: 'string', description: 'Filter by action name (substring).' },
                limit: { type: 'number', description: 'Max results (default 20, max 100).' },
            },
        },
    },
    {
        name: 'navigate_to',
        description: 'Navigate the user to a specific page in the app. Use this whenever the user says things like "open X", "take me to X", "go to X", "show me X". The path should be one of the valid routes below — match the user\'s role when relevant. Available routes: /recruiter/dashboard, /recruiter/tracker/management, /recruiter/tracker/interview-form, /recruiter/tracker/masterlist, /recruiter/tracker/endorsed, /recruiter/tracker/inactive, /recruiter/tracker/reports, /recruiter/hiring/chr, /recruiter/interview/rooms, /recruiter/interview/queue, /recruiter/interview/scheduling, /recruiter/reports, /recruiter/audit, /recruiter/notifications, /recruiter/profile, /recruiter/applicants, /recruiter/positions, /recruiter/mhrt/salary, /recruiter/mhrt/accounts, /recruiter/mhrt/directory, /recruiter/mhrt/h2r-creation, /recruiter/settings/job-postings, /recruiter/settings/questions, /recruiter/settings/typing-test, /recruiter/settings/accounts, /recruiter/settings/email-templates, /admin/dashboard, /admin/users, /admin/settings/accounts, /admin/settings/questions, /admin/settings/email-templates, /admin/tracker/masterlist, /admin/queue-settings, /admin/employee-tracker, /admin/reports, /admin/audit, /admin/backup, /admin/notifications, /admin/profile, /final-interview/dashboard, /final-interview/history, /final-interview/analysis, /final-interview/schedules, /final-interview/notifications, /final-interview/profile, /jobs, /queue-display. After navigating, the page can show a SPOTLIGHT (a darkening overlay + bouncing arrow + highlighted target) pointing to specific data — pass `target` and `message` to enable it. The `target` is either a CSS selector OR one of these semantic IDs: "masterlist-table" (the candidate registry table), "interview-form-table" (the interview report table), "dashboard-stats" (top stat cards on the recruiter dashboard), "quota-card-{accountId}" (a specific hiring quota card), or a data-ai-spotlight attribute value. If unsure, pass `target:null` and the user lands on the page without a spotlight.',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'The route to navigate to (e.g. "/recruiter/dashboard").' },
                search_params: {
                    type: 'object',
                    description: 'Optional URL search params as a flat string-to-string map, e.g. {"accountId": "abc", "tab": "endorsed"}. Pass empty object if not needed.',
                },
                target: {
                    type: 'string',
                    description: 'OPTIONAL spotlight target — a CSS selector (e.g. "[data-applicant-id=\\"abc\\"]") OR a semantic ID (e.g. "masterlist-table", "dashboard-stats", "quota-card-OONI"). When provided, the page darkens and a bouncing arrow + highlight ring point to the target. Omit or pass null to skip the spotlight.',
                },
                message: {
                    type: 'string',
                    description: 'OPTIONAL short message (1 line) shown in the spotlight callout bubble above the arrow. E.g. "Here are your 2 male candidates 🎯".',
                },
                reason: { type: 'string', description: 'Short human-readable reason for the navigation, shown in the chat UI.' },
            },
            required: ['path', 'reason'],
        },
    },
    {
        name: 'open_analytics_dashboard',
        description: 'Open a pop-up dashboard with a chart/table/KPI/list/funnel showing the analysis the user asked for. Use this whenever the user asks for an analysis to be visualized, charted, plotted, broken down, shown as a dashboard, or as a list of candidates. Pass a title, viz type (bar/pie/line/area/funnel/table/kpi/applicant_list), the same filter object you would pass to aggregate_applicants, an optional group_by, and a metric (passing_rate, hired, failed, in_pipeline, total, count). The dashboard fetches its own data. For funnel questions ("pipeline", "drop-off", "stage by stage", "conversion"), prefer viz:"funnel" — it computes stage counts and conversion rates automatically. For line/area trend questions ("over time", "by month"), use a time-based group_by (master_wave works as a proxy; for true time series the dashboard will bucket by the group_by values).',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Short title for the dashboard (e.g. "Hires by Department").' },
                description: { type: 'string', description: 'One-sentence subtitle shown below the title.' },
                viz: { type: 'string', enum: ['bar', 'pie', 'line', 'area', 'funnel', 'table', 'kpi', 'applicant_list'], description: 'Visualization type. Pick based on the user\'s request: bar for quantities/comparisons, pie for proportions (only 2-6 groups), line/area for trends, table for detailed numbers, kpi for a single big number, applicant_list for a list of candidates, funnel for pipeline stages.' },
                filters: { type: 'object', description: 'Optional filter object — same fields as search_applicants (gender, status, department, position, school_name, applied_after, applied_before, master_wave, etc.). Pass {} for unscoped.' },
                group_by: { type: 'string', description: 'Optional column to group by (gender, current_status, department, position_title, school_name, course, highest_education, master_wave, etc.). Used for bar/pie/line/area to split the chart into multiple series. ALSO used for funnel to render side-by-side funnels per group (e.g. "funnel by gender" → group_by:"gender"). Omit for KPI / applicant_list.' },
                metric: { type: 'string', enum: ['passing_rate', 'hired', 'failed', 'in_pipeline', 'total', 'count'], description: 'What to measure per group: passing_rate (% of HIRED out of total), hired (raw HIRED count), failed (raw REJECTED+FAILED+WITHDRAWN+NOT_ELIGIBLE_FOR_REHIRE count), in_pipeline (count still in process), total (raw count), count (alias of total).' },
                limit: { type: 'number', description: 'For applicant_list — max rows (default 50).' },
                search: { type: 'string', description: 'For applicant_list — optional substring search across name/email/position.' },
                sort_by: { type: 'string', enum: ['applied_at_desc', 'applied_at_asc', 'name_asc', 'name_desc', 'assessment_score_desc', 'assessment_score_asc', 'typing_wpm_desc', 'typing_wpm_asc', 'typing_accuracy_desc', 'personal_rating_desc', 'personal_rating_asc'], description: 'For applicant_list — sort the table by this column. Use typing_wpm_desc for "typing speed results" (fastest first), assessment_score_desc for "highest scoring", personal_rating_desc for "top rated", applied_at_desc for "most recent".' },
                columns: { type: 'array', items: { type: 'string' }, description: 'For applicant_list — which columns to show. Pick from: name, position, status, school, education, course, department, gender, rating, score, wpm, accuracy, applied, hired. Example: ["name", "position", "wpm", "accuracy", "status"] for a typing-speed-focused list. Default if omitted: [name, position, status, school, rating, score, applied].' },
                reason: { type: 'string', description: 'Short human-readable reason shown in the chat UI.' },
            },
            required: ['title', 'viz'],
        },
    },
    {
        name: 'refresh_page',
        description: 'Reload the current page / refresh data on screen. Use when the user says "refresh", "reload", "update the page", "fetch latest data".',
        parameters: {
            type: 'object',
            properties: {
                reason: { type: 'string', description: 'Short human-readable confirmation shown in the chat UI.' },
            },
            required: ['reason'],
        },
    },
    {
        name: 'open_modal',
        description: 'Open a named modal or dialog in the app. Currently supported modals: "set_hiring_target" (opens the Set Hiring Target modal on an account dashboard — pass accountId), "create_applicant" (opens the new applicant form), "create_position" (opens the new position form), "ai_suggest_quota" (opens the AI quota suggestion modal). Use navigate_to first to ensure the right page is loaded, then call this to open a specific modal.',
        parameters: {
            type: 'object',
            properties: {
                modal_id: { type: 'string', description: 'The modal identifier.' },
                params: {
                    type: 'object',
                    description: 'Modal-specific parameters as a flat string-to-string map, e.g. {"accountId": "abc"} for set_hiring_target. Pass empty object if not needed.',
                },
                reason: { type: 'string', description: 'Short human-readable reason shown in the chat UI.' },
            },
            required: ['modal_id', 'reason'],
        },
    },
    {
        name: 'get_top_applicants',
        description: 'Get the top N applicants sorted by a specific criterion. Use this whenever the user asks for the "top", "best", "highest rated", "highest scoring", "lowest scoring", "most recent", "oldest", or "alphabetical" applicants. The "rating" used for "highest rated" comes from `metadata.ratings.personalRating` (1-10) and `assessment_score` (0-100).',
        parameters: {
            type: 'object',
            properties: {
                sort_by: {
                    type: 'string',
                    enum: ['personal_rating_desc', 'personal_rating_asc', 'assessment_score_desc', 'assessment_score_asc', 'most_recent', 'oldest', 'name_asc', 'name_desc'],
                    description: 'How to sort. "personal_rating_desc" is the default for "highest rated".',
                },
                limit: { type: 'number', description: 'How many to return (default 10, max 50).' },
                department: { type: 'string', description: 'Optional department filter.' },
                position: { type: 'string', description: 'Optional position filter.' },
                status: { type: 'string', description: 'Optional status filter (e.g. "FINAL_INTERVIEW", "HIRED").' },
            },
            required: ['sort_by'],
        },
    },
    {
        name: 'get_funnel',
        description: 'Get a recruitment pipeline funnel: counts of applicants at each stage (Applied → Typing Test → Assessment → Initial Interview → Final Interview → Job Offer → Hired) and conversion rates between stages. Use this whenever the user asks for a "funnel", "pipeline breakdown", "conversion", "drop-off", or "stage by stage" view of applicants. Pass optional filters (gender, status, department, position, applied_after, applied_before, master_wave, etc.) to scope the funnel. To break the funnel down by a column (e.g. "funnel by gender", "pipeline by department"), pass `group_by` — the dashboard will render side-by-side funnels, one per group. **HARD RULE:** This tool\'s result is automatically attached to a dashboard pop-up, so the funnel chart WILL appear on the user\'s screen. You do NOT need to also call `open_analytics_dashboard` for funnel questions — that would re-open the same chart. The chart will use the same filters and group_by you pass here.',
        parameters: {
            type: 'object',
            properties: {
                filters: {
                    type: 'object',
                    description: 'Optional filter object — same fields as search_applicants (gender, status, department, position, school_name, applied_after, applied_before, master_wave, etc.). Pass {} for the whole pipeline.',
                },
                group_by: {
                    type: 'string',
                    description: 'Optional column to break the funnel down by (gender, department, position_title, school_name, current_status, master_wave, etc.). When set, the dashboard renders side-by-side funnels, one per group value. Common: "gender" for "funnel by gender", "department" for "funnel by department".',
                },
                reason: {
                    type: 'string',
                    description: 'Short human-readable reason shown in the dashboard header (e.g. "Funnel by gender for the current pipeline").',
                },
            },
        },
    },
    {
        name: 'open_applicant',
        description: 'Open a specific applicant\'s profile in the masterlist (full-screen modal). HARD RULE: Only call this AFTER `search_applicants` (or `get_top_applicants`) has returned a matching candidate with at least 1 row. If 0 results were returned, do NOT call this tool — instead tell the user the candidate was not found and offer to search again with a different spelling or filter. Pass `applicant_id` (UUID, preferred) when you have it, otherwise `name` (substring match).',
        parameters: {
            type: 'object',
            properties: {
                applicant_id: { type: 'string', description: 'The application UUID. Preferred when known.' },
                name: { type: 'string', description: 'Applicant name (substring match). Use this if you don\'t have the id.' },
                reason: { type: 'string', description: 'Short human-readable reason shown in the chat UI.' },
            },
        },
    },
    {
        name: 'highlight_applicant',
        description: 'Highlight (set a persistent color tag on) a specific applicant in the masterlist AND show a brief animated pulse on their row so the user can see it. This is an EDIT — it changes `highlight_color` in the database and the tag will remain until the user clears it via the bulk-action bar. Use this whenever the user says "highlight X", "mark X in red", "flag X for follow-up", "tag X as important", "put a star on X", "color X yellow", "point me to X on the masterlist". Pass `applicant_id` (UUID, preferred) when you have it, otherwise `name` (substring match). HARD RULE: only call this AFTER you have confirmed the candidate exists — call `search_applicants` or `get_top_applicants` first if needed. Available colors: red, yellow, green, blue, orange, purple, pink, teal, brown, clear (use "clear" to remove any existing highlight).',
        parameters: {
            type: 'object',
            properties: {
                applicant_id: { type: 'string', description: 'The application UUID. Preferred when known.' },
                name: { type: 'string', description: 'Applicant name (substring match). Use this if you don\'t have the id.' },
                color: {
                    type: 'string',
                    enum: ['red', 'yellow', 'green', 'blue', 'orange', 'purple', 'pink', 'teal', 'brown', 'clear'],
                    description: 'Highlight color to apply. Red = urgent/flagged, Yellow = review, Green = good, Blue = info, Orange = follow-up, Purple = VIP, Pink = note, Teal = in progress, Brown = archived. Use "clear" to remove highlight.',
                },
                reason: { type: 'string', description: 'Short human-readable reason shown in the chat UI (e.g. "Flagged for missing documents").' },
            },
            required: ['color'],
        },
    },
    {
        name: 'edit_applicant',
        description: 'EDIT ACTION (DANGEROUS — will show a yellow confirmation card to the user before applying). Use this when the user says "edit X\'s status to HIRED", "update X\'s school to Y", "change X\'s position to Y", "set X\'s department to Y", "move X to FOR_JOB_OFFER", "edit X\'s summary to Y". HARD RULE: ALWAYS confirm with the user first if anything is vague — ask "which field?" then "what value?". Don\'t fire this tool speculatively; only after the user has specified both the field AND the new value. TWO-PHASE FLOW: (1) First call: pass `commit: false` (default). The tool returns the current value + proposed new value but does NOT write to the DB. The UI shows a yellow confirmation card. (2) If the user clicks Approve: the system re-calls this tool with `commit: true` to apply the change. (3) If the user clicks Cancel: nothing happens — the DB is unchanged. So the LLM only needs to call this tool ONCE per edit, with `commit: false` (or omit `commit` — default is false). The frontend handles the commit phase on user approval. Allowed fields (use these EXACT names): current_status, applicant_name, email, school_name, highest_education, education_level, course, degree, position_title, position, department, gender, civil_status, religion, blood_type, citizenship, source, hiring_source, ops_validator_status, client_interview_status, final_specific_status, final_verdict, master_wave, master_hiring_request_id, num_children, num_siblings, master_basic_salary, assigned_recruiter, assigned_ops_validator, rejection_reason, notes, interview_notes, client_interview_remarks, final_interview_notes, master_remarks. For `current_status` you MUST use one of the exact enum values (HIRED, REJECTED, FAILED, WITHDRAWN, APPLIED, TYPING_TEST, INITIAL_INTERVIEW, INTERVIEW_IN_PROGRESS, QUEUE_ASSIGNED, ASSESSMENT, FINAL_INTERVIEW, FINAL_INTERVIEW_SCHEDULED, CLIENT_ASSESSMENT, CLIENT_INTERVIEW, FOR_JOB_OFFER, FOR_PAN, SENT_JO_AND_BGC, ENDORSED, ACCEPTED_OFFER, FINAL_VERDICT, PASSED, CONDITIONAL, WAITLISTED, OPEN, PROMOTION, LATERAL_TRANSFER, NOT_ELIGIBLE_FOR_REHIRE) — UPPERCASE. FREE-TEXT INTERVIEW RESPONSES — for per-question answers stored in the `interview_responses` JSONB (e.g. "Summary of Background and Experience", "Final Interviewer\'s Remarks", "What made you interested to apply?"), use `field: "interview_response:<question_uuid>"`. To find the right uuid, first call `list_interview_questions` and match by `question_text` (case-insensitive substring). For "Summary of Background and Experience" the field would look like `field: "interview_response:f6b85476-e85b-4244-ac36-5f66394c96bb"`. The tool will look up the question label and show it in the confirmation card. Pass `applicant_id` (UUID) when known, otherwise `name` (substring).',
        parameters: {
            type: 'object',
            properties: {
                applicant_id: { type: 'string', description: 'The application UUID. Preferred when known.' },
                name: { type: 'string', description: 'Applicant name (substring match).' },
                field: {
                    type: 'string',
                    description: 'The exact field name to edit, OR `interview_response:<question_uuid>` for per-question free-text answers (e.g. "interview_response:f6b85476-e85b-4244-ac36-5f66394c96bb" for "Summary of Background and Experience"). For structured columns use: current_status, applicant_name, email, school_name, highest_education, education_level, course, degree, position_title, position, department, gender, civil_status, religion, blood_type, citizenship, source, hiring_source, ops_validator_status, client_interview_status, final_specific_status, final_verdict, master_wave, master_hiring_request_id, num_children, num_siblings, master_basic_salary, assigned_recruiter, assigned_ops_validator, rejection_reason, notes, interview_notes, client_interview_remarks, final_interview_notes, master_remarks.',
                },
                value: { type: 'string', description: 'The new value to set. For current_status, use one of the exact uppercase enum values. For free-text responses, pass the full new text (no length limit).' },
                reason: { type: 'string', description: 'Why this edit is being made (shown in the chat UI and the confirmation card).' },
                commit: { type: 'boolean', description: 'Set to true to actually write to the database. Default false (preview only — the UI will show a confirmation card and call this tool again with commit:true on user approval).' },
            },
            required: ['field', 'value'],
        },
    },
];

async function listAccounts({ search, lob, status, limit = 20 } = {}) {
    const max = Math.min(Number(limit) || 20, 100);
    const conditions = [];
    const params = [];
    let i = 1;
    if (search) { conditions.push(`account ILIKE $${i++}`); params.push(`%${search}%`); }
    if (lob) { conditions.push(`lob ILIKE $${i++}`); params.push(`%${lob}%`); }
    if (status) { conditions.push(`ov_status ILIKE $${i++}`); params.push(`%${status}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_accounts',
        `SELECT id, account, lob, position, campaign_manager, team_manager, ov_status, location, updated_at
         FROM mhrt_accounts ${where}
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult(rows.map(a => ({
        id: a.id, name: a.account, lob: a.lob, position: a.position,
        manager: a.campaign_manager || a.team_manager, status: a.ov_status,
        location: a.location, updatedAt: toIso(a.updated_at),
    })));
}

async function getAccountDetails({ account_name, account_id } = {}) {
    if (!account_name && !account_id) return errResult('account_name or account_id is required');
    const params = [];
    let where = '';
    if (account_id) { where = 'WHERE id = $1'; params.push(account_id); }
    else { where = 'WHERE account ILIKE $1'; params.push(`%${account_name}%`); }
    const { ok, rows, error } = await safeQuery('get_account_details',
        `SELECT * FROM mhrt_accounts ${where} LIMIT 1`, params);
    if (!ok) return errResult(error);
    if (rows.length === 0) return errResult(`No account found for ${account_id ? `id=${account_id}` : `name like "${account_name}"`}`);
    const a = rows[0];
    return okResult({
        id: a.id, account: a.account, lob: a.lob, pseudonym: a.pseudonym, position: a.position,
        campaignManager: a.campaign_manager, teamManager: a.team_manager,
        baseSalary: a.base_salary, allowance: a.allowance,
        accountSpecificTracker: a.account_specific_tracker, assessments: a.assessments,
        jobDescription: a.job_description, rosterLock: a.roster_lock,
        toolTesting: a.tool_testing, hoops: a.hoops, voiceType: a.voice_type,
        direction: a.direction, vertical: a.vertical, education: a.education,
        workExperience: a.work_experience, typingSpeed: a.typing_speed,
        typingAccuracy: a.typing_accuracy, cefr: a.cefr, ase: a.ase,
        ovStatus: a.ov_status, opsValidator: a.ops_validator,
        ovAvailability: a.ov_availability, clientAvailability: a.client_availability,
        location: a.location, operationsDirector: a.operations_director,
        trainer: a.trainer, wfmPoc: a.wfm_poc,
        finalInterviewSchedule: a.final_interview_schedule,
        mustHaves: a.must_haves, niceToHaves: a.nice_to_haves,
        hmo: a.hmo, relocation: a.relocation, demographics: a.demographics,
        backgroundInvestigation: a.background_investigation,
        createdAt: toIso(a.created_at), updatedAt: toIso(a.updated_at),
    });
}

async function listOpenQuotas({ department, type } = {}) {
    const conditions = [
        `requirements IN ('ACCOUNT_INTERNAL_QUOTA_BILLED', 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED')`,
        `COALESCE(hiring_quota, 0) > 0`,
        `UPPER(COALESCE(status, 'OPEN')) = 'OPEN'`,
    ];
    const params = [];
    let i = 1;
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    if (type === 'Billed') conditions.push(`requirements = 'ACCOUNT_INTERNAL_QUOTA_BILLED'`);
    if (type === 'Non-Billed') conditions.push(`requirements = 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED'`);
    const { ok, rows, error } = await safeQuery('list_open_quotas',
        `SELECT id, title, department, hiring_quota, current_hired, quota_start_date, quota_end_date, requirements
         FROM positions WHERE ${conditions.join(' AND ')}
         ORDER BY COALESCE(quota_end_date, quota_start_date, created_at) DESC NULLS LAST
         LIMIT 50`, params);
    if (!ok) return errResult(error);
    return okResult(rows.map(q => ({
        id: q.id, title: q.title, department: q.department || 'Unassigned',
        type: q.requirements === 'ACCOUNT_INTERNAL_QUOTA_BILLED' ? 'Billed' : 'Non-Billed',
        hiringQuota: q.hiring_quota, currentHired: q.current_hired || 0,
        startDate: toDateOnly(q.quota_start_date), endDate: toDateOnly(q.quota_end_date),
    })));
}

async function getQuotaDetails({ quota_id, title, department } = {}) {
    if (!quota_id && !title && !department) return errResult('quota_id, title, or department is required');
    const conditions = [`requirements IN ('ACCOUNT_INTERNAL_QUOTA_BILLED', 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED')`];
    const params = [];
    let i = 1;
    if (quota_id) { conditions.push(`id = $${i++}`); params.push(quota_id); }
    if (title) { conditions.push(`title ILIKE $${i++}`); params.push(`%${title}%`); }
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    const { ok, rows, error } = await safeQuery('get_quota_details',
        `SELECT * FROM positions WHERE ${conditions.join(' AND ')} LIMIT 1`, params);
    if (!ok) return errResult(error);
    if (rows.length === 0) return errResult('No matching quota found');
    const q = rows[0];
    return okResult({
        id: q.id, title: q.title, department: q.department,
        type: q.requirements === 'ACCOUNT_INTERNAL_QUOTA_BILLED' ? 'Billed' : 'Non-Billed',
        hiringQuota: q.hiring_quota, currentHired: q.current_hired || 0,
        startDate: toDateOnly(q.quota_start_date), endDate: toDateOnly(q.quota_end_date),
        status: q.status, description: q.description, location: q.location,
        employmentType: q.employment_type, workArrangement: q.work_arrangement,
        createdAt: toIso(q.created_at),
    });
}

async function getQuotaHistory({ department, limit = 10 } = {}) {
    const max = Math.min(Number(limit) || 10, 50);
    const params = [];
    let i = 1;
    let where = '';
    if (department) { where = `WHERE LOWER(department) = LOWER($${i++})`; params.push(department); }
    const { ok, rows, error } = await safeQuery('get_quota_history',
        `SELECT id, department, position_id, quota, hired_count, total_applicants, in_pipeline, failed_count,
                start_date, end_date, closed_at
         FROM hiring_quota_history ${where}
         ORDER BY closed_at DESC NULLS LAST LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult(rows.map(h => {
        const success = h.quota > 0 ? Math.round((h.hired_count / h.quota) * 100) : 0;
        return {
            id: h.id, department: h.department, quota: h.quota,
            hiredCount: h.hired_count, successRatePct: success,
            totalApplicants: h.total_applicants, inPipeline: h.in_pipeline,
            failedCount: h.failed_count,
            startDate: toDateOnly(h.start_date), endDate: toDateOnly(h.end_date),
            closedAt: toIso(h.closed_at),
        };
    }));
}

const APPLICANT_FILTER_MAP = {
    search: { col: null, type: 'text_or' },
    status: { col: 'current_status', type: 'status' },
    department: { col: 'department', type: 'ilike' },
    position: { col: 'position_title', type: 'ilike' },
    applied_after: { col: 'applied_at', type: 'gte' },
    applied_before: { col: 'applied_at', type: 'lte' },
    hired_after: { col: 'hired_at', type: 'gte' },
    hired_before: { col: 'hired_at', type: 'lte' },
    gender: { col: 'gender', type: 'exact' },
    civil_status: { col: 'civil_status', type: 'exact' },
    religion: { col: 'religion', type: 'ilike' },
    blood_type: { col: 'blood_type', type: 'exact' },
    citizenship: { col: 'citizenship', type: 'ilike' },
    highest_education: { col: 'highest_education', type: 'ilike' },
    school_name: { col: 'school_name', type: 'ilike' },
    course: { col: 'course', type: 'ilike' },
    degree: { col: 'degree', type: 'ilike' },
    course_strand: { col: 'course_strand', type: 'ilike' },
    graduation_year: { col: 'graduation_year', type: 'exact' },
    num_children: { col: 'num_children', type: 'exact' },
    num_siblings: { col: 'num_siblings', type: 'exact' },
    assigned_recruiter: { col: 'assigned_recruiter_name', type: 'ilike' },
    assigned_ops_validator: { col: 'assigned_ops_validator_name', type: 'ilike' },
    source: { col: 'source', type: 'ilike' },
    hiring_source: { col: 'hiring_source', type: 'ilike' },
    final_verdict: { col: 'final_verdict', type: 'ilike' },
    final_specific_status: { col: "metadata->>'final_specific_status'", type: 'ilike' },
    ops_validator_status: { col: "metadata->>'ops_validator_status'", type: 'ilike' },
    client_interview_status: { col: "metadata->>'client_interview_status'", type: 'ilike' },
    wonderlic_status: { col: "metadata->>'wonderlic_status'", type: 'ilike' },
    leadership_status: { col: "metadata->>'leadership_assessment_status'", type: 'ilike' },
    final_account: { col: "metadata->>'final_account'", type: 'ilike' },
    master_wave: { col: 'master_wave', type: 'ilike' },
    master_hiring_request_id: { col: 'master_hiring_request_id', type: 'ilike' },
    min_typing_wpm: { col: 'typing_test_wpm', type: 'gte' },
    min_typing_accuracy: { col: 'typing_test_accuracy', type: 'gte' },
    min_assessment_score: { col: 'assessment_score', type: 'gte' },
    max_assessment_score: { col: 'assessment_score', type: 'lte' },
    min_personal_rating: { col: "metadata->'ratings'->>'personalRating'", type: 'gte' },
};

const GROUP_BY_ALLOWED = new Set([
    'gender', 'civil_status', 'religion', 'blood_type', 'citizenship',
    'highest_education', 'school_name', 'course', 'degree',
    'graduation_year', 'department', 'position_title', 'current_status',
    'assigned_recruiter_name', 'assigned_ops_validator_name',
    'source', 'hiring_source', 'final_verdict',
    'final_specific_status', 'ops_validator_status', 'client_interview_status',
    'wonderlic_status', 'leadership_assessment_status', 'final_account',
    'master_wave', 'master_hiring_request_id',
]);

function buildApplicantWhere(filters = {}) {
    const conditions = [];
    const params = [];
    let i = 1;
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (key === 'group_by' || key === 'limit') continue;
        if (key === 'search') {
            conditions.push(`(applicant_name ILIKE $${i} OR applicant_email ILIKE $${i} OR position_title ILIKE $${i})`);
            params.push(`%${value}%`); i++;
            continue;
        }
        if (key === 'education_level') {
            conditions.push(`COALESCE(highest_education, '') ILIKE $${i++}`);
            params.push(`%${value}%`);
            continue;
        }
        const spec = APPLICANT_FILTER_MAP[key];
        if (!spec) continue;
        const col = spec.col;
        if (spec.type === 'ilike') {
            conditions.push(`COALESCE(${col}, '') ILIKE $${i++}`); params.push(`%${value}%`);
        } else if (spec.type === 'exact') {
            conditions.push(`COALESCE(${col}, '') = $${i++}`); params.push(value);
        } else if (spec.type === 'gte') {
            conditions.push(`${col} >= $${i++}`); params.push(value);
        } else if (spec.type === 'lte') {
            conditions.push(`${col} <= $${i++}`); params.push(value);
        } else if (spec.type === 'status') {
            conditions.push(`UPPER(COALESCE(${col}, '')) = UPPER($${i++})`); params.push(value);
        }
    }
    return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params, nextIndex: i };
}

function calcMetrics(hired, failed, inPipeline, total) {
    if (total === 0) return { passing_rate_pct: 0, failure_rate_pct: 0, in_pipeline_rate_pct: 0 };
    return {
        passing_rate_pct: Math.round((hired / total) * 1000) / 10,
        failure_rate_pct: Math.round((failed / total) * 1000) / 10,
        in_pipeline_rate_pct: Math.round((inPipeline / total) * 1000) / 10,
    };
}

const APPLICANT_SORT_MAP = {
    applied_at_desc: { sql: 'applied_at DESC NULLS LAST' },
    applied_at_asc: { sql: 'applied_at ASC NULLS LAST' },
    name_asc: { sql: 'applicant_name ASC NULLS LAST' },
    name_desc: { sql: 'applicant_name DESC NULLS LAST' },
    assessment_score_desc: { sql: 'assessment_score DESC NULLS LAST' },
    assessment_score_asc: { sql: 'assessment_score ASC NULLS LAST' },
    client_assessment_score_desc: { sql: 'client_assessment_score DESC NULLS LAST' },
    client_assessment_score_asc: { sql: 'client_assessment_score ASC NULLS LAST' },
    typing_wpm_desc: { sql: 'typing_test_wpm DESC NULLS LAST' },
    typing_wpm_asc: { sql: 'typing_test_wpm ASC NULLS LAST' },
    typing_accuracy_desc: { sql: 'typing_test_accuracy DESC NULLS LAST' },
    personal_rating_desc: { sql: '(metadata->\'ratings\'->>\'personalRating\')::numeric DESC NULLS LAST' },
    personal_rating_asc: { sql: '(metadata->\'ratings\'->>\'personalRating\')::numeric ASC NULLS LAST' },
};

async function searchApplicants(args = {}) {
    const { limit = 20, sort_by = 'applied_at_desc' } = args;
    const max = Math.min(Number(limit) || 20, 200);
    const flatArgs = { ...(args.filters || {}), ...args };
    delete flatArgs.filters;
    delete flatArgs.sort_by;
    const { where, params, nextIndex } = buildApplicantWhere(flatArgs);
    const sortSpec = APPLICANT_SORT_MAP[sort_by] || APPLICANT_SORT_MAP.applied_at_desc;
    const { ok, rows, error } = await safeQuery('search_applicants',
        `SELECT id, applicant_name, applicant_email, position_title, department, current_status, applied_at,
                gender, highest_education, school_name, course, degree,
                assessment_score, client_assessment_score, typing_test_wpm, typing_test_accuracy,
                (metadata->'ratings'->>'personalRating')::numeric AS personal_rating,
                hired_at, master_hiring_request_id, master_wave, master_basic_salary
         FROM applications ${where}
         ORDER BY ${sortSpec.sql}
         LIMIT $${nextIndex}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        sortBy: sort_by,
        applicants: rows.map(a => ({
            id: a.id, name: a.applicant_name, email: a.applicant_email,
            position: a.position_title, department: a.department,
            currentStatus: a.current_status, appliedAt: toIso(a.applied_at),
            gender: a.gender, highestEducation: a.highest_education,
            school: a.school_name, course: a.course, degree: a.degree,
            assessmentScore: a.assessment_score, clientAssessmentScore: a.client_assessment_score,
            typingTestWpm: a.typing_test_wpm, typingTestAccuracy: a.typing_test_accuracy,
            personalRating: a.personal_rating,
            hiredAt: toIso(a.hired_at),
            masterHiringRequestId: a.master_hiring_request_id,
            masterWave: a.master_wave, masterBasicSalary: a.master_basic_salary,
        })),
    });
}

async function aggregateApplicants(args = {}) {
    const { group_by } = args;
    if (group_by && !GROUP_BY_ALLOWED.has(group_by)) {
        return errResult(`group_by "${group_by}" is not allowed. Allowed values: ${[...GROUP_BY_ALLOWED].join(', ')}`);
    }
    const flatArgs = { ...(args.filters || {}), ...args };
    delete flatArgs.filters;
    const { where, params, nextIndex } = buildApplicantWhere(flatArgs);

    const countsSql = `
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(current_status, '')) = 'HIRED')::int AS hired,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(current_status, '')) IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'))::int AS failed,
        COUNT(*) FILTER (WHERE UPPER(COALESCE(current_status, '')) IN ('PASSED', 'ACCEPTED_OFFER', 'FOR_JOB_OFFER', 'SENT_JO_AND_BGC', 'FOR_PAN', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'ENDORSED', 'INTERVIEW_IN_PROGRESS', 'FINAL_INTERVIEW_SCHEDULED', 'PROMOTION', 'LATERAL_TRANSFER', 'FINAL_VERDICT', 'FINAL_INTERVIEW', 'INITIAL_INTERVIEW', 'ASSESSMENT', 'TYPING_TEST', 'QUEUE_ASSIGNED', 'APPLIED', 'WAITLISTED', 'CONDITIONAL', 'OPEN'))::int AS in_pipeline
    `;

    if (group_by) {
        const colSpec = group_by === 'education_level'
            ? { col: 'highest_education' }
            : (APPLICANT_FILTER_MAP[group_by] || (group_by === 'department' ? { col: 'department' } : { col: group_by }));
        const col = colSpec.col || group_by;
        const { ok, rows, error } = await safeQuery('aggregate_applicants_grouped',
            `SELECT COALESCE(${col}, '(none)')::text AS group_key, ${countsSql}
             FROM applications ${where}
             GROUP BY ${col}
             ORDER BY total DESC LIMIT 100`, params);
        if (!ok) return errResult(error);
        return okResult({
            groupBy: group_by,
            totalGroups: rows.length,
            groups: rows.map(r => {
                const inPipeline = r.total - r.hired - r.failed;
                return {
                    group: r.group_key,
                    count: r.total,
                    hired: r.hired,
                    failed: r.failed,
                    inPipeline,
                    metrics: calcMetrics(r.hired, r.failed, inPipeline, r.total),
                };
            }),
        });
    } else {
        const { ok, rows, error } = await safeQuery('aggregate_applicants_total',
            `SELECT ${countsSql} FROM applications ${where}`, params);
        if (!ok) return errResult(error);
        const r = rows[0] || { total: 0, hired: 0, failed: 0 };
        const inPipeline = r.total - r.hired - r.failed;
        return okResult({
            filters: Object.fromEntries(Object.entries(args).filter(([k, v]) => v !== undefined && v !== '' && k !== 'limit' && k !== 'group_by')),
            total: r.total,
            hired: r.hired,
            failed: r.failed,
            inPipeline,
            metrics: calcMetrics(r.hired, r.failed, inPipeline, r.total),
        });
    }
}

async function getApplicantDetails({ applicant_id, name, email } = {}) {
    if (!applicant_id && !name && !email) return errResult('applicant_id, name, or email is required');
    const params = [];
    let where = '';
    if (applicant_id) { where = 'WHERE id = $1'; params.push(applicant_id); }
    else if (email) { where = 'WHERE LOWER(applicant_email) = LOWER($1)'; params.push(email); }
    else { where = 'WHERE applicant_name ILIKE $1'; params.push(`%${name}%`); }
    const { ok, rows, error } = await safeQuery('get_applicant_details',
        `SELECT * FROM applications ${where} LIMIT 1`, params);
    if (!ok) return errResult(error);
    if (rows.length === 0) return errResult('No matching applicant found');
    const a = rows[0];
    const history = await safeQuery('status_history',
        `SELECT from_status, to_status, changed_by_name, change_reason, changed_at
         FROM status_history WHERE application_id = $1 ORDER BY changed_at ASC`, [a.id]);
    return okResult({
        id: a.id,
        name: a.applicant_name, email: a.applicant_email, phone: a.applicant_phone,
        position: a.position_title, department: a.department, currentStatus: a.current_status,
        appliedAt: toIso(a.applied_at), updatedAt: toIso(a.updated_at),
        personal: {
            firstName: a.first_name, lastName: a.last_name, middleName: a.middle_name,
            nickname: a.nickname, gender: a.gender, civilStatus: a.civil_status,
            birthDate: a.birth_date, birthPlace: a.birth_place, religion: a.religion,
            bloodType: a.blood_type, height: a.height, weight: a.weight,
            citizenship: a.citizenship,
            sss: a.sss_no, tin: a.tin_no, philhealth: a.philhealth_no, pagibig: a.pagibig_no,
            permanentAddress: a.permanent_address, currentAddress: a.current_address,
        },
        education: {
            level: a.education_level, highest: a.highest_education, school: a.school_name,
            course: a.course, degree: a.degree, strand: a.course_strand,
            graduationYear: a.graduation_year, semesters: a.num_semesters,
        },
        family: {
            father: a.father_name, mother: a.mother_name,
            numChildren: a.num_children, numSiblings: a.num_siblings,
        },
        statusHistory: history.rows.map(h => ({
            fromStatus: h.from_status, toStatus: h.to_status,
            changedBy: h.changed_by_name, reason: h.change_reason,
            changedAt: toIso(h.changed_at),
        })),
    });
}

async function listInterviewQuestions({ category, question_type, active_only = true, limit = 50 } = {}) {
    const max = Math.min(Number(limit) || 50, 200);
    const conditions = [];
    const params = [];
    let i = 1;
    if (category) { conditions.push(`category ILIKE $${i++}`); params.push(`%${category}%`); }
    if (question_type) { conditions.push(`question_type = $${i++}`); params.push(question_type); }
    if (active_only) conditions.push('is_active = true');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_interview_questions',
        `SELECT id, category, instructions, question_text, question_type, answer_type,
                is_active, is_required, question_order, max_rating
         FROM interview_questions ${where}
         ORDER BY category NULLS LAST, question_order ASC, id ASC
         LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        questions: rows.map(q => ({
            id: q.id, category: q.category, instructions: q.instructions,
            questionText: q.question_text, questionType: q.question_type,
            answerType: q.answer_type, isActive: q.is_active, isRequired: q.is_required,
            order: q.question_order, maxRating: q.max_rating,
        })),
    });
}

async function listEmailTemplates({ type, active_only = true, limit = 20 } = {}) {
    const max = Math.min(Number(limit) || 20, 100);
    const conditions = [];
    const params = [];
    let i = 1;
    if (type) { conditions.push(`type ILIKE $${i++}`); params.push(`%${type}%`); }
    if (active_only) conditions.push('is_active = true');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_email_templates',
        `SELECT id, name, subject, body, type, is_active, attachment_name, updated_at
         FROM email_templates ${where}
         ORDER BY updated_at DESC NULLS LAST, name ASC
         LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        templates: rows.map(t => ({
            id: t.id, name: t.name, subject: t.subject, body: t.body,
            type: t.type, isActive: t.is_active, attachmentName: t.attachment_name,
            updatedAt: toIso(t.updated_at),
        })),
    });
}

async function listH2RRecords({ account, division, line_of_business, department, limit = 20 } = {}) {
    const max = Math.min(Number(limit) || 20, 100);
    const conditions = [];
    const params = [];
    let i = 1;
    if (account) { conditions.push(`account ILIKE $${i++}`); params.push(`%${account}%`); }
    if (division) { conditions.push(`division ILIKE $${i++}`); params.push(`%${division}%`); }
    if (line_of_business) { conditions.push(`line_of_business ILIKE $${i++}`); params.push(`%${line_of_business}%`); }
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_h2r_records',
        `SELECT id, account, lob, job_location, division, line_of_business, department,
                reports_to, training, nesting
         FROM mhrt_h2r_records ${where}
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        records: rows.map(r => ({
            id: r.id, account: r.account, lob: r.lob, jobLocation: r.job_location,
            division: r.division, lineOfBusiness: r.line_of_business, department: r.department,
            reportsTo: r.reports_to, training: r.training, nesting: r.nesting,
        })),
    });
}

async function listDirectoryEntries({ account, team, search, limit = 20 } = {}) {
    const max = Math.min(Number(limit) || 20, 100);
    const conditions = [];
    const params = [];
    let i = 1;
    if (account) { conditions.push(`account ILIKE $${i++}`); params.push(`%${account}%`); }
    if (team) { conditions.push(`team ILIKE $${i++}`); params.push(`%${team}%`); }
    if (search) { conditions.push(`(name ILIKE $${i} OR distro ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_directory_entries',
        `SELECT id, account, name, team, distro FROM mhrt_directory ${where}
         ORDER BY account, name LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        entries: rows.map(r => ({
            id: r.id, account: r.account, name: r.name, team: r.team, distro: r.distro,
        })),
    });
}

async function listDepartments() {
    const { ok, rows, error } = await safeQuery('list_departments',
        `SELECT id, name, head, budget_code, created_at FROM departments ORDER BY name`);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        departments: rows.map(d => ({ id: d.id, name: d.name, head: d.head, budgetCode: d.budget_code })),
    });
}

async function listUsers({ role, department, active_only = true, limit = 50 } = {}) {
    const max = Math.min(Number(limit) || 50, 200);
    const conditions = [];
    const params = [];
    let i = 1;
    if (role) { conditions.push(`role = $${i++}`); params.push(role); }
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    if (active_only) conditions.push('is_active = true');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('list_users',
        `SELECT id, full_name, email, role, department, is_active, created_at
         FROM users ${where} ORDER BY full_name LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        users: rows.map(u => ({
            id: u.id, name: u.full_name, email: u.email, role: u.role,
            department: u.department, isActive: u.is_active, createdAt: toIso(u.created_at),
        })),
    });
}

async function getPipelineStats({ applied_after, applied_before, department } = {}) {
    const conditions = [];
    const params = [];
    let i = 1;
    if (applied_after) { conditions.push(`applied_at >= $${i++}`); params.push(applied_after); }
    if (applied_before) { conditions.push(`applied_at <= $${i++}`); params.push(applied_before); }
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('get_pipeline_stats',
        `SELECT current_status, COUNT(*)::int AS count
         FROM applications ${where}
         GROUP BY current_status
         ORDER BY count DESC`, params);
    if (!ok) return errResult(error);
    const byStatus = {};
    let total = 0;
    for (const r of rows) {
        byStatus[r.current_status || 'UNKNOWN'] = r.count;
        total += r.count;
    }
    return okResult({
        total,
        byStatus,
        summary: {
            hired: byStatus['HIRED'] || 0,
            inPipeline: total - (byStatus['HIRED'] || 0) - (byStatus['REJECTED'] || 0) - (byStatus['FAILED'] || 0) - (byStatus['WITHDRAWN'] || 0) - (byStatus['NOT_ELIGIBLE_FOR_REHIRE'] || 0),
            failed: (byStatus['REJECTED'] || 0) + (byStatus['FAILED'] || 0) + (byStatus['WITHDRAWN'] || 0) + (byStatus['NOT_ELIGIBLE_FOR_REHIRE'] || 0),
        },
        filters: { applied_after, applied_before, department },
    });
}

const FUNNEL_STAGES = [
    { key: 'applied', label: 'Applied', statuses: null },
    { key: 'typing', label: 'Typing Test', statuses: ['TYPING_TEST', 'ASSESSMENT', 'CLIENT_ASSESSMENT', 'INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'FINAL_VERDICT', 'PASSED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'PROMOTION', 'LATERAL_TRANSFER', 'OPEN'] },
    { key: 'assessment', label: 'Assessment', statuses: ['ASSESSMENT', 'CLIENT_ASSESSMENT', 'INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'FINAL_VERDICT', 'PASSED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'PROMOTION', 'LATERAL_TRANSFER', 'OPEN'] },
    { key: 'initial_interview', label: 'Initial Interview', statuses: ['INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'FINAL_VERDICT', 'PASSED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'PROMOTION', 'LATERAL_TRANSFER'] },
    { key: 'final_interview', label: 'Final / Client Interview', statuses: ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'FINAL_VERDICT', 'PASSED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'PROMOTION', 'LATERAL_TRANSFER'] },
    { key: 'offer', label: 'Job Offer', statuses: ['FOR_JOB_OFFER', 'FOR_PAN', 'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'HIRED', 'PROMOTION', 'LATERAL_TRANSFER'] },
    { key: 'hired', label: 'Hired', statuses: ['HIRED', 'PROMOTION', 'LATERAL_TRANSFER'] },
];

function computeStagesFromCounts(byStatus) {
    const stages = FUNNEL_STAGES.map(stage => {
        if (stage.statuses === null) {
            const count = Object.values(byStatus).reduce((a, b) => a + b, 0);
            return { key: stage.key, label: stage.label, count, conversionFromTopPct: 100, conversionFromPrevPct: 100 };
        }
        const count = stage.statuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0);
        return { key: stage.key, label: stage.label, count, conversionFromTopPct: 0, conversionFromPrevPct: 0 };
    });
    const top = stages[0]?.count || 0;
    for (let i = 0; i < stages.length; i++) {
        stages[i].conversionFromTopPct = top > 0 ? Math.round((stages[i].count / top) * 1000) / 10 : 0;
        stages[i].conversionFromPrevPct = i > 0 && stages[i - 1].count > 0
            ? Math.round((stages[i].count / stages[i - 1].count) * 1000) / 10
            : (i === 0 ? 100 : 0);
    }
    return { stages, topCount: top };
}

async function getFunnelData(args = {}) {
    const { group_by, reason } = args;
    const flatArgs = { ...(args.filters || {}), ...args };
    delete flatArgs.filters;
    delete flatArgs.group_by;
    delete flatArgs.reason;
    const { where, params, nextIndex } = buildApplicantWhere(flatArgs);

    if (group_by && !GROUP_BY_ALLOWED.has(group_by)) {
        return errResult(`group_by "${group_by}" is not allowed. Allowed values: ${[...GROUP_BY_ALLOWED].join(', ')}`);
    }

    let funnelData;
    if (group_by) {
        const colSpec = group_by === 'education_level'
            ? { col: 'highest_education' }
            : (APPLICANT_FILTER_MAP[group_by] || (group_by === 'department' ? { col: 'department' } : { col: group_by }));
        const col = colSpec.col || group_by;
        const { ok, rows, error } = await safeQuery('funnel_by_group',
            `SELECT COALESCE(${col}, '(unknown)')::text AS grp, current_status, COUNT(*)::int AS count
             FROM applications ${where}
             GROUP BY ${col}, current_status
             ORDER BY ${col}`, params);
        if (!ok) return errResult(error);
        const byGroupAndStatus = new Map();
        const groupOrder = [];
        for (const r of rows) {
            const g = r.grp || '(unknown)';
            if (!byGroupAndStatus.has(g)) {
                byGroupAndStatus.set(g, {});
                groupOrder.push(g);
            }
            byGroupAndStatus.get(g)[(r.current_status || 'UNKNOWN').toUpperCase()] = r.count;
        }
        const groups = groupOrder.map(g => {
            const { stages, topCount } = computeStagesFromCounts(byGroupAndStatus.get(g));
            return { key: g, label: g, topCount, stages };
        });
        const totalTop = groups.reduce((s, g) => s + g.topCount, 0);
        funnelData = {
            stages: groups[0]?.stages || [],
            topCount: totalTop,
            filters: flatArgs,
            groupBy: group_by,
            groups,
        };
    } else {
        const { ok, rows, error } = await safeQuery('funnel_counts',
            `SELECT current_status, COUNT(*)::int AS count
             FROM applications ${where}
             GROUP BY current_status`, params);
        if (!ok) return errResult(error);
        const byStatus = {};
        for (const r of rows) {
            byStatus[(r.current_status || 'UNKNOWN').toUpperCase()] = r.count;
        }
        const { stages, topCount } = computeStagesFromCounts(byStatus);
        funnelData = {
            stages,
            topCount,
            filters: flatArgs,
        };
    }

    const filterChips = Object.entries(flatArgs)
        .filter(([k, v]) => v != null && v !== '' && k !== 'limit')
        .map(([k, v]) => `${humanize(k)}: ${v}`)
        .join(', ');
    const groupLabel = group_by ? humanize(group_by) : null;
    const title = groupLabel
        ? `Recruitment Funnel by ${groupLabel}${filterChips ? ` — ${filterChips}` : ''}`
        : `Recruitment Funnel${filterChips ? ` — ${filterChips}` : ''}`;
    const description = groupLabel
        ? `Stage-by-stage pipeline breakdown for each ${groupLabel} group.`
        : `Stage-by-stage pipeline breakdown of all applicants.`;

    return {
        ok: true,
        data: funnelData,
        uiAction: {
            type: 'open_analytics_dashboard',
            config: {
                title,
                description,
                viz: 'funnel',
                filters: flatArgs,
                group_by: group_by || null,
                metric: 'total',
                reason: reason || `Funnel${groupLabel ? ` by ${groupLabel}` : ''} for the recruitment pipeline`,
            },
        },
    };
}

async function getRecentAuditEvents({ user_email, action, limit = 20 } = {}) {
    const max = Math.min(Number(limit) || 20, 100);
    const conditions = [];
    const params = [];
    let i = 1;
    if (action) { conditions.push(`action ILIKE $${i++}`); params.push(`%${action}%`); }
    let join = '';
    if (user_email) {
        join = 'LEFT JOIN users u ON u.id = a.user_id';
        conditions.push(`u.email ILIKE $${i++}`);
        params.push(`%${user_email}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { ok, rows, error } = await safeQuery('get_recent_audit_events',
        `SELECT a.id, a.user_id, a.action, a.resource_type, a.resource_id, a.metadata,
                a.ip_address, a.created_at, u.email AS user_email, u.full_name AS user_name
         FROM audit_logs a ${join} ${where}
         ORDER BY a.created_at DESC NULLS LAST LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        total: rows.length,
        events: rows.map(e => ({
            id: e.id, userEmail: e.user_email, userName: e.user_name,
            action: e.action, resourceType: e.resource_type, resourceId: e.resource_id,
            metadata: e.metadata, ipAddress: e.ip_address, createdAt: toIso(e.created_at),
        })),
    });
}

async function navigateTo({ path, search_params, reason, target, message } = {}) {
    if (!path || typeof path !== 'string') return errResult('path is required');
    const search = search_params && typeof search_params === 'object' ? search_params : null;
    return {
        ok: true,
        uiAction: {
            type: 'navigate',
            path,
            search: search || null,
            target: target || null,
            message: message || null,
            reason: reason || null,
        },
    };
}

async function logOutUser({ reason } = {}) {
    return {
        ok: true,
        uiAction: { type: 'logout', reason: reason || 'Logging you out…' },
    };
}

async function refreshPage({ reason } = {}) {
    return {
        ok: true,
        uiAction: { type: 'refresh', reason: reason || 'Refreshing the page…' },
    };
}

async function openModal({ modal_id, params, reason } = {}) {
    if (!modal_id || typeof modal_id !== 'string') return errResult('modal_id is required');
    return {
        ok: true,
        uiAction: { type: 'open_modal', modalId: modal_id, params: params || null, reason: reason || null },
    };
}

async function openAnalyticsDashboard({ title, description, viz, filters, group_by, metric, reason, limit, search, sort_by, columns } = {}) {
    if (!title || typeof title !== 'string') return errResult('title is required');
    const allowedViz = ['bar', 'pie', 'line', 'area', 'funnel', 'table', 'kpi', 'applicant_list'];
    const safeViz = allowedViz.includes(viz) ? viz : 'bar';
    const allowedMetrics = ['passing_rate', 'hired', 'failed', 'in_pipeline', 'total', 'count'];
    const safeMetric = allowedMetrics.includes(metric) ? metric : 'total';
    const allowedSorts = ['applied_at_desc', 'applied_at_asc', 'name_asc', 'name_desc', 'assessment_score_desc', 'assessment_score_asc', 'client_assessment_score_desc', 'client_assessment_score_asc', 'typing_wpm_desc', 'typing_wpm_asc', 'typing_accuracy_desc', 'personal_rating_desc', 'personal_rating_asc'];
    const safeSort = allowedSorts.includes(sort_by) ? sort_by : null;
    const allowedColumns = ['name', 'position', 'status', 'school', 'education', 'course', 'department', 'gender', 'rating', 'score', 'wpm', 'accuracy', 'applied', 'hired'];
    const safeColumns = Array.isArray(columns) ? columns.filter(c => allowedColumns.includes(c)) : null;
    const max = Math.min(Number(limit) || 50, 200);
    const allowedGroupBy = ['gender', 'current_status', 'department', 'position_title', 'position', 'school_name', 'school', 'course', 'highest_education', 'education_level', 'civil_status', 'religion', 'master_wave', 'master_hiring_request_id', 'hiring_source', 'source'];
    const safeGroupBy = group_by && allowedGroupBy.includes(group_by) ? group_by : null;
    return {
        ok: true,
        uiAction: {
            type: 'open_analytics_dashboard',
            config: {
                title,
                description: description || null,
                viz: safeViz,
                filters: filters || {},
                group_by: safeGroupBy,
                metric: safeMetric,
                reason: reason || null,
                limit: max,
                search: search || null,
                sort_by: safeSort,
                columns: safeColumns,
            },
        },
    };
}

async function getTopApplicants({ sort_by = 'personal_rating_desc', limit = 10, department, position, status } = {}) {
    const max = Math.min(Number(limit) || 10, 50);
    const conditions = [];
    const params = [];
    let i = 1;
    if (department) { conditions.push(`department ILIKE $${i++}`); params.push(`%${department}%`); }
    if (position) { conditions.push(`position_title ILIKE $${i++}`); params.push(`%${position}%`); }
    if (status) { conditions.push(`UPPER(current_status) = UPPER($${i++})`); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy;
    switch (sort_by) {
        case 'personal_rating_asc':  orderBy = `(metadata->'ratings'->>'personalRating')::numeric ASC NULLS LAST, applied_at DESC NULLS LAST`; break;
        case 'assessment_score_desc': orderBy = `assessment_score DESC NULLS LAST, applied_at DESC NULLS LAST`; break;
        case 'assessment_score_asc':  orderBy = `assessment_score ASC NULLS LAST, applied_at DESC NULLS LAST`; break;
        case 'most_recent':           orderBy = `applied_at DESC NULLS LAST`; break;
        case 'oldest':                orderBy = `applied_at ASC NULLS LAST`; break;
        case 'name_asc':              orderBy = `applicant_name ASC NULLS LAST`; break;
        case 'name_desc':             orderBy = `applicant_name DESC NULLS LAST`; break;
        case 'personal_rating_desc':
        default:                       orderBy = `(metadata->'ratings'->>'personalRating')::numeric DESC NULLS LAST, assessment_score DESC NULLS LAST, applied_at DESC NULLS LAST`;
    }

    const { ok, rows, error } = await safeQuery('get_top_applicants',
        `SELECT id, applicant_name, applicant_email, position_title, department, current_status, applied_at,
                assessment_score, typing_test_wpm,
                (metadata->'ratings'->>'personalRating')::numeric AS personal_rating,
                (metadata->'ratings'->>'remarks') AS rating_remarks
         FROM applications ${where}
         ORDER BY ${orderBy}
         LIMIT $${i}`, [...params, max]);
    if (!ok) return errResult(error);
    return okResult({
        sortBy: sort_by,
        total: rows.length,
        applicants: rows.map(a => ({
            id: a.id, name: a.applicant_name, email: a.applicant_email,
            position: a.position_title, department: a.department,
            currentStatus: a.current_status, appliedAt: toIso(a.applied_at),
            assessmentScore: a.assessment_score, typingTestWpm: a.typing_test_wpm,
            personalRating: a.personal_rating, ratingRemarks: a.rating_remarks,
        })),
    });
}

async function openApplicant({ applicant_id, name, reason } = {}) {
    if (!applicant_id && !name) return errResult('applicant_id or name is required');
    return {
        ok: true,
        uiAction: {
            type: 'open_applicant',
            applicantId: applicant_id || null,
            applicantName: name || null,
            reason: reason || null,
        },
    };
}

const EDITABLE_FIELDS = [
    'current_status', 'applicant_name', 'email', 'school_name', 'highest_education', 'education_level',
    'course', 'degree', 'position_title', 'position', 'department', 'gender', 'civil_status', 'religion',
    'blood_type', 'citizenship', 'source', 'hiring_source', 'ops_validator_status', 'client_interview_status',
    'final_specific_status', 'final_verdict', 'master_wave', 'master_hiring_request_id', 'num_children',
    'num_siblings', 'master_basic_salary', 'assigned_recruiter', 'assigned_ops_validator', 'rejection_reason',
    'notes', 'interview_notes', 'client_interview_remarks', 'final_interview_notes', 'master_remarks'
];

const RESPONSE_FIELD_PREFIX = 'interview_response:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_VALUES = [
    'HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE', 'APPLIED', 'TYPING_TEST',
    'INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED', 'ASSESSMENT', 'FINAL_INTERVIEW',
    'FINAL_INTERVIEW_SCHEDULED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR_PAN',
    'SENT_JO_AND_BGC', 'ENDORSED', 'ACCEPTED_OFFER', 'FINAL_VERDICT', 'PASSED', 'CONDITIONAL',
    'WAITLISTED', 'OPEN', 'PROMOTION', 'LATERAL_TRANSFER'
];

async function editApplicant({ applicant_id, name, field, value, reason, commit } = {}) {
    if (!field) return errResult('field is required');
    if (value === undefined || value === null || value === '') return errResult('value is required');
    if (!applicant_id && !name) return errResult('applicant_id or name is required');

    const isResponseField = field.startsWith(RESPONSE_FIELD_PREFIX);
    let questionId = null;
    let questionLabel = null;
    let fieldLabel = field;

    if (isResponseField) {
        questionId = field.slice(RESPONSE_FIELD_PREFIX.length);
        if (!UUID_RE.test(questionId)) {
            return errResult(`Field "${field}" is malformed. Use the format "interview_response:<question_uuid>". Use list_interview_questions to find the right id.`);
        }
        const { ok: qOk, rows: qRows, error: qErr } = await safeQuery('edit_lookup_question',
            `SELECT question_text FROM interview_questions WHERE id = $1 LIMIT 1`,
            [questionId]);
        if (!qOk) return errResult(qErr);
        if (qRows.length === 0) return errResult(`No interview question found with id=${questionId}. Use list_interview_questions to find the right id.`);
        questionLabel = qRows[0].question_text;
        fieldLabel = questionLabel;
    } else if (!EDITABLE_FIELDS.includes(field)) {
        return errResult(`Field "${field}" is not editable. Allowed: ${EDITABLE_FIELDS.join(', ')}`);
    }

    let target = null;
    if (isResponseField) {
        const lookupId = applicant_id
            ? { sql: `SELECT id, applicant_name, interview_responses->>$1 AS old_value FROM applications WHERE id = $2 LIMIT 1`, params: [questionId, applicant_id], ambiguous: false }
            : null;
        const lookupName = !applicant_id
            ? { sql: `SELECT id, applicant_name, interview_responses->>$1 AS old_value FROM applications WHERE applicant_name ILIKE $2 ORDER BY applied_at DESC NULLS LAST LIMIT 5`, params: [questionId, `%${name}%`], ambiguous: true }
            : null;
        const lookup = lookupId || lookupName;
        const { ok, rows, error } = await safeQuery('edit_lookup_response', lookup.sql, lookup.params);
        if (!ok) return errResult(error);
        if (rows.length === 0) return errResult(`No applicant found ${applicant_id ? `with id=${applicant_id}` : `matching name like "${name}"`}`);
        if (lookup.ambiguous && rows.length > 1) {
            return errResult(`Multiple applicants match "${name}" (${rows.length}). Pass a more specific name or the exact applicant_id.`);
        }
        target = rows[0];
    } else if (applicant_id) {
        const { ok, rows, error } = await safeQuery('edit_lookup_id',
            `SELECT id, applicant_name, ${field} AS old_value FROM applications WHERE id = $1 LIMIT 1`,
            [applicant_id]);
        if (!ok) return errResult(error);
        if (rows.length === 0) return errResult(`No applicant found with id=${applicant_id}`);
        target = rows[0];
    } else {
        const { ok, rows, error } = await safeQuery('edit_lookup_name',
            `SELECT id, applicant_name, ${field} AS old_value FROM applications WHERE applicant_name ILIKE $1 ORDER BY applied_at DESC NULLS LAST LIMIT 5`,
            [`%${name}%`]);
        if (!ok) return errResult(error);
        if (rows.length === 0) return errResult(`No applicant found matching name like "${name}"`);
        if (rows.length > 1) {
            return errResult(`Multiple applicants match "${name}" (${rows.length}). Pass a more specific name or the exact applicant_id.`);
        }
        target = rows[0];
    }

    let finalValue = value;
    if (field === 'current_status') {
        finalValue = String(value).toUpperCase().trim();
        if (!STATUS_VALUES.includes(finalValue)) {
            return errResult(`Invalid current_status "${value}". Use one of: ${STATUS_VALUES.join(', ')}`);
        }
    } else if (['num_children', 'num_siblings', 'master_basic_salary'].includes(field)) {
        const num = Number(value);
        if (Number.isNaN(num)) return errResult(`Field "${field}" must be a number, got "${value}"`);
        finalValue = num;
    }

    const shouldCommit = commit === true;

    if (shouldCommit) {
        if (isResponseField) {
            const { ok: updOk, error: updErr } = await safeQuery('edit_update_response',
                `UPDATE applications
                 SET interview_responses = jsonb_set(COALESCE(interview_responses, '{}'::jsonb), $1::text[], to_jsonb($2::text)),
                     updated_at = NOW()
                 WHERE id = $3`,
                [[questionId], String(finalValue), target.id]);
            if (!updOk) return errResult(updErr);
        } else {
            const { ok: updOk, error: updErr } = await safeQuery('edit_update',
                `UPDATE applications SET ${field} = $1, updated_at = NOW() WHERE id = $2`,
                [finalValue, target.id]);
            if (!updOk) return errResult(updErr);
        }
    }

    return {
        ok: true,
        uiAction: {
            type: 'edit_applicant',
            applicantId: target.id,
            applicantName: target.applicant_name,
            field,
            fieldLabel: isResponseField ? fieldLabel : null,
            oldValue: target.old_value,
            newValue: finalValue,
            reason: reason || null,
            committed: shouldCommit,
        },
    };
}

async function highlightApplicant({ applicant_id, name, color, reason } = {}) {
    if (!color) return errResult('color is required');
    const allowed = ['red', 'yellow', 'green', 'blue', 'orange', 'purple', 'pink', 'teal', 'brown', 'clear'];
    if (!allowed.includes(color)) return errResult(`Invalid color "${color}". Use one of: ${allowed.join(', ')}`);
    if (!applicant_id && !name) return errResult('applicant_id or name is required');

    let target = null;
    if (applicant_id) {
        const { ok, rows, error } = await safeQuery('highlight_lookup_id',
            'SELECT id, applicant_name FROM applications WHERE id = $1 LIMIT 1',
            [applicant_id]);
        if (!ok) return errResult(error);
        if (rows.length === 0) return errResult(`No applicant found with id=${applicant_id}`);
        target = rows[0];
    } else {
        const { ok, rows, error } = await safeQuery('highlight_lookup_name',
            'SELECT id, applicant_name FROM applications WHERE applicant_name ILIKE $1 ORDER BY applied_at DESC NULLS LAST LIMIT 5',
            [`%${name}%`]);
        if (!ok) return errResult(error);
        if (rows.length === 0) return errResult(`No applicant found matching name like "${name}"`);
        if (rows.length > 1) {
            return errResult(`Multiple applicants match "${name}" (${rows.length}). Pass a more specific name or the exact applicant_id.`);
        }
        target = rows[0];
    }

    const newColor = color === 'clear' ? null : color;
    const { ok: updOk, error: updErr } = await safeQuery('highlight_update',
        'UPDATE applications SET highlight_color = $1, updated_at = NOW() WHERE id = $2',
        [newColor, target.id]);
    if (!updOk) return errResult(updErr);

    return {
        ok: true,
        uiAction: {
            type: 'highlight_applicant',
            applicantId: target.id,
            applicantName: target.applicant_name,
            color: color,
            reason: reason || null,
        },
    };
}

const handlers = {
    search_applicants: searchApplicants,
    aggregate_applicants: aggregateApplicants,
    list_accounts: listAccounts,
    get_account_details: getAccountDetails,
    list_open_quotas: listOpenQuotas,
    get_quota_details: getQuotaDetails,
    get_quota_history: getQuotaHistory,
    get_applicant_details: getApplicantDetails,
    list_interview_questions: listInterviewQuestions,
    list_email_templates: listEmailTemplates,
    list_h2r_records: listH2RRecords,
    list_directory_entries: listDirectoryEntries,
    list_departments: listDepartments,
    list_users: listUsers,
    get_pipeline_stats: getPipelineStats,
    get_funnel: getFunnelData,
    get_recent_audit_events: getRecentAuditEvents,
    navigate_to: navigateTo,
    log_out_user: logOutUser,
    refresh_page: refreshPage,
    open_modal: openModal,
    open_analytics_dashboard: openAnalyticsDashboard,
    get_top_applicants: getTopApplicants,
    open_applicant: openApplicant,
    highlight_applicant: highlightApplicant,
    edit_applicant: editApplicant,
};

export async function executeTool(name, args) {
    const handler = handlers[name];
    if (!handler) return { ok: false, error: `Unknown tool: ${name}` };
    try {
        return await handler(args || {});
    } catch (err) {
        console.error(`[AITools] ${name} threw:`, err);
        return { ok: false, error: err.message };
    }
}

export function getGeminiToolDeclarations() {
    return toolDefinitions.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    }));
}

export const toolNames = toolDefinitions.map(t => t.name);
