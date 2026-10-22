export const MASTERLIST_COLUMNS = [
    { label: 'WAVE', field: 'master_wave', width: 100 },
    { label: 'Account', field: 'department', width: 160 },
    { label: 'Job Position', field: 'pis', subField: 'custom_lob', width: 140 },
    { label: 'Hiring Request ID', field: 'master_hiring_request_id', width: 160 },
    // { label: 'Position', field: 'position_title', width: 220 },
    { label: 'STATUS', field: 'current_status', width: 160 },
    { label: 'Remarks', field: 'final_interview_notes', width: 300 },
    { label: '1st Day Show up', field: 'master_first_day_show_up', width: 140 },
    { label: 'Last Keep Warm', field: 'master_last_keep_warm', width: 140 },
    { label: 'EID', field: 'master_eid', width: 110 },
    { label: 'Last Name', field: 'master_last_name', width: 160 },
    { label: 'Middle Name', field: 'master_middle_name', width: 130 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'Preferred Name', field: 'preferred_nickname', width: 160 },
    { label: 'Date of Birth', field: 'birth_date', width: 130 },
    { label: 'Contact no.', field: 'phone', width: 140 },
    { label: 'Personal Email Address', field: 'applicant_email', width: 280 },
    { label: 'CP360 Email Address', field: 'master_cp36_email', width: 280 },
    { label: 'TRAINING START DATE', field: 'master_training_start_date', width: 160 },
    { label: 'BASIC SALARY', field: 'master_basic_salary', width: 140 },
    { label: 'ALLOWANCE', field: 'master_allowance', width: 140 },
    { label: 'Exam Score', field: 'assessment_score', width: 110 },
    { label: 'Typing Test', field: 'typing_test_wpm', width: 110 },
    { label: 'SOURCE', field: 'hiring_source', width: 140 },
    { label: 'NAME OF RECRUITER', field: 'assigned_recruiter_name', width: 180 },
    { label: 'NEO Date', field: 'master_neo_date', width: 140 },
    { label: 'PEME', field: 'master_peme_status', width: 140 },
    { label: 'PEME Result', field: 'master_peme_result', width: 140 },

    { label: 'BGC Status', field: 'master_bgs_status', width: 140 },
    { label: 'NBI Status', field: 'master_nbi_result', width: 140 },
    { label: 'NBI Validity', field: 'pis', subField: 'custom_nbi_validity_date', width: 140 },
    { label: 'BI Status', field: 'master_bi_endorsement_date', width: 140 },
    { label: 'BI Results', field: 'master_bi_result', width: 140 },
    {
        label: 'Gov\'t Status', field: 'pis', subField: 'custom_govt_status_checker', width: 140, type: 'checklist', checklistItems: [
            { label: 'SSS No.', key: 'sss', field: 'sss_no', source: 'masterlist', conditionType: 'content' },
            { label: 'PhilHealth No.', key: 'philhealth', field: 'philhealth_no', source: 'masterlist', conditionType: 'content' },
            { label: 'Pag-Ibig No.', key: 'pagibig', field: 'pagibig_no', source: 'masterlist', conditionType: 'content' },
            { label: 'Tin No.', key: 'tin', field: 'tin_no', source: 'masterlist', conditionType: 'content' }
        ]
    },
    { label: 'Gov\'t Remarks', field: 'pis', subField: 'custom_govt__ids_status', width: 140 },

    { label: 'ID Remarks', field: 'master_id_remarks', width: 160 },
    { label: 'SSS No.', field: 'sss_no', width: 140 },
    { label: 'PhilHealth No.', field: 'philhealth_no', width: 140 },
    { label: 'Pag-Ibig No.', field: 'pagibig_no', width: 140 },
    { label: 'Tin No.', field: 'tin_no', width: 140 },

    { label: 'RCBC', field: 'master_rcbc_status', width: 140 },
    { label: 'Drug Test', field: 'drug_test', width: 140 },
    { label: 'H2R Status', field: 'master_h2r_status', width: 140 },

];

export const INACTIVE_APPLICATION_COLUMNS = MASTERLIST_COLUMNS.filter(c => c.field !== 'philhealth_no');

export const PIVOT_COLUMNS = [
    { label: 'Account', field: 'department', width: 160 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'Preferred Name', field: 'preferred_nickname', width: 160 },
    { label: 'STATUS', field: 'current_status', width: 160 },
    { label: 'PEME', field: 'master_peme_status', width: 160 }
];

export const YC_COLUMNS = [
    { label: 'Account', field: 'department', width: 160 },
    { label: 'STATUS', field: 'current_status', width: 160 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'BI Endorsement', field: 'master_bi_endorsement_date', width: 160 },
    { label: 'Count of First Name', field: 'master_first_name', width: 160 }
];

export const OFFBOARDING_COLUMNS = [
    ...MASTERLIST_COLUMNS,
    { label: 'Reason', field: 'rejection_reason', width: 300 }
];

export const ONBOARDING_WINNERS_COLUMNS = [
    { label: 'Account', field: 'department', width: 160 },
    { label: 'Start Date', field: 'master_training_start_date', width: 160 },
    { label: 'Last Name', field: 'master_last_name', width: 160 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'Preferred Name', field: 'preferred_nickname', width: 160 },
    { label: 'Win Date', field: 'master_win_date', width: 160 },
    { label: 'Status', field: 'current_status', width: 160 },
    { label: 'Claim Date', field: 'master_claim_date', width: 160 }
];

export const QUERY2_COLUMNS = [
    { label: 'Account', field: 'department', width: 160 },
    { label: 'Job Position', field: 'pis', subField: 'custom_lob', width: 140 },
    { label: 'Hiring Request ID', field: 'master_hiring_request_id', width: 160 },
    // { label: 'Position', field: 'position_title', width: 220 },
    { label: 'STATUS', field: 'current_status', width: 160 },
    { label: 'STATUS', field: 'current_status_2', width: 160 },
    { label: 'STATUS', field: 'current_status_3', width: 160 },
    { label: 'Remarks', field: 'final_interview_notes', width: 300 },
    { label: '1st Day Show up', field: 'master_first_day_show_up', width: 140 },
    { label: 'Last Keep Warm', field: 'master_last_keep_warm', width: 140 },
    { label: 'EID', field: 'master_eid', width: 110 },
    { label: 'Last Name', field: 'master_last_name', width: 160 },
    { label: 'Middle Name', field: 'master_middle_name', width: 130 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'Preferred Name', field: 'preferred_nickname', width: 160 },
    { label: 'Date of Birth', field: 'birth_date', width: 130 },
    { label: 'Contact no.', field: 'phone', width: 140 },
    { label: 'Personal Email Address', field: 'applicant_email', width: 280 },
    { label: 'CP360 Email Address', field: 'master_cp36_email', width: 280 },
    { label: 'TRAINING START DATE', field: 'master_training_start_date', width: 160 },
    { label: 'BASIC SALARY', field: 'master_basic_salary', width: 140 },
    { label: 'ALLOWANCE', field: 'master_allowance', width: 140 },
    { label: 'SOURCE', field: 'hiring_source', width: 140 },
    { label: 'NAME OF RECRUITER', field: 'assigned_recruiter_name', width: 180 },
    { label: 'Exam Score', field: 'assessment_score', width: 110 },
    { label: 'NEO Date', field: 'master_neo_date', width: 140 },
    { label: 'PEME', field: 'master_peme_status', width: 140 },
    { label: 'ID Remarks', field: 'master_id_remarks', width: 160 },
    { label: 'EID of Referree', field: 'master_referee_eid', width: 130 },
    { label: 'Name', field: 'applicant_name', width: 220 }
];

export const QUERY2_GROUPS = [
    { label: 'POSITION LOGIC', span: 5, color: '#323130' },
    { label: 'CANDIDATE IDENTITY', span: 8, color: '#d13438' },
    { label: 'COMPENSATION & SOURCE', span: 5, color: '#107c10' },
    { label: 'ONBOARDING & RESULTS', span: 6, color: '#605e5c' }
];



export const POOL_COLUMNS = [
    { label: 'WAVE', field: 'master_wave', width: 100 },
    { label: 'Account', field: 'department', width: 160 },
    { label: 'Status', field: 'current_status', width: 160 },
    // { label: 'Position', field: 'position_title', width: 220 },
    { label: 'Last Name', field: 'master_last_name', width: 160 },
    { label: 'Middle Name', field: 'master_middle_name', width: 130 },
    { label: 'First Name', field: 'master_first_name', width: 160 },
    { label: 'Preferred Name', field: 'preferred_nickname', width: 160 },
    { label: 'Date of Birth', field: 'pis', subField: 'birth_date', width: 130 },
    { label: 'Contact no.', field: 'pis', subField: 'phone', width: 140 },
    { label: 'Personal Email Address', field: 'pis', subField: 'email', width: 280 },
    { label: 'PEME', field: 'master_peme_status', width: 140 },
    { label: 'SOURCE', field: 'hiring_source', width: 140 },
    { label: 'NAME OF RECRUITER', field: 'assigned_recruiter_name', width: 180 },
    { label: 'Exam Score', field: 'assessment_score', width: 110 }
];


export const NOT_ELIGIBLE_COLUMNS = [
    { label: 'Id', field: 'id', width: 100 },
    { label: 'Start time', field: 'pis', subField: 'start_time', width: 140 },
    { label: 'Completion time', field: 'pis', subField: 'completion_time', width: 140 },
    { label: 'Email', field: 'applicant_email', width: 280 },
    { label: 'Name', field: 'applicant_name', width: 220 },
    { label: 'Interview Date', field: 'interview_completed_at', width: 140 },
    { label: 'Candidate\'s Complete Name', field: 'applicant_name', width: 250 },
    // { label: 'Position Applying for?', field: 'position_title', width: 220 },
    { label: 'Summary of Background', field: 'pis', subField: 'summary_of_background', width: 300 },
    { label: 'Interest in Role', field: 'pis', subField: 'reason_for_interest', width: 300 },
    { label: 'Goals 6 Months', field: 'pis', subField: 'goals_6_months', width: 300 },
    { label: 'Setback Handling', field: 'pis', subField: 'handle_setback', width: 300 },
    { label: 'Prior Commitments', field: 'pis', subField: 'prior_commitments', width: 300 },
    { label: 'Available Training Date', field: 'pis', subField: 'available_training_start', width: 160 },
    { label: 'Preferred Shifts', field: 'pis', subField: 'preferred_shifts', width: 160 },
    { label: 'Onsite/Transport', field: 'pis', subField: 'transportation_mode', width: 160 },
    { label: 'Pending Job Offer?', field: 'pis', subField: 'pending_job_offer', width: 140 },
    { label: 'Salary Expectations', field: 'pis', subField: 'salary_expectation', width: 160 },
    { label: 'Role Specific Questions', field: 'pis', subField: 'role_specific_questions', width: 300 },
    { label: 'Is Enercare?', field: 'pis', subField: 'is_enercare', width: 110 },
    { label: 'Critical Thinking', field: 'comp_critical_thinking', width: 140 },
    { label: 'Attention to Detail', field: 'comp_attention_to_detail', width: 140 },
    { label: 'Customer Focus', field: 'comp_customer_focus', width: 140 },
    { label: 'Technical Skills', field: 'comp_technical_skills', width: 140 },
    { label: 'Adaptability', field: 'comp_adaptability', width: 140 },
    { label: 'Teamwork', field: 'comp_teamwork', width: 140 },
    { label: 'Leadership', field: 'comp_leadership', width: 140 },
    { label: 'NARRATIVE ASSESSMENT', field: 'interview_notes', width: 400 },
    { label: 'Communication Rating', field: 'rating_communication', width: 140 },
    { label: 'Empathy Rating', field: 'rating_empathy', width: 140 },
    { label: 'Problem Solving Rating', field: 'rating_problem_solving', width: 140 },
    { label: 'Reason for Rating', field: 'pis', subField: 'rating_reason', width: 300 },
    { label: 'ACCENT AND DICTION', field: 'pis', subField: 'accent_diction', width: 160 },
    { label: 'FLUENCY', field: 'pis', subField: 'fluency_comprehension', width: 160 },
    { label: 'SENTENCE CONSTRUCTION', field: 'pis', subField: 'sentence_construction', width: 160 },
    { label: 'PRONUNCIATION', field: 'pis', subField: 'pronunciation', width: 160 },
    { label: 'Date of Birth', field: 'pis', subField: 'birth_date', width: 130 },
    { label: 'Age', field: 'pis', subField: 'age', width: 80 },
    { label: 'Sex', field: 'pis', subField: 'sex', width: 100 },
    { label: 'Civil Status', field: 'pis', subField: 'civil_status', width: 120 },
    { label: 'Contact Number', field: 'pis', subField: 'phone', width: 140 },
    { label: 'Email Address', field: 'applicant_email', width: 280 },
    { label: 'Current Address', field: 'pis', subField: 'current_address', width: 250 },
    { label: 'BPO Experience', field: 'pis', subField: 'bpo_experience', width: 140 },
    { label: 'Tenure BPO', field: 'pis', subField: 'tenure_bpo', width: 140 },
    { label: 'Highest Education', field: 'pis', subField: 'highest_education', width: 160 },
    { label: 'Course and Year', field: 'pis', subField: 'course_year', width: 160 },
    { label: 'Plans back to school?', field: 'pis', subField: 'plans_back_to_school', width: 160 },
    { label: 'Government IDs', field: 'pis', subField: 'government_ids', width: 250 },
    { label: 'Hiring Source', field: 'pis', subField: 'hiring_source_detailed', width: 200 },
    { label: 'Candidate Questions', field: 'pis', subField: 'candidate_questions', width: 300 },
    { label: 'INTERVIEWER', field: 'interviewer_name', width: 160 },
    { label: 'INITIAL ACCOUNT', field: 'pis', subField: 'initial_account_assignment', width: 160 },
    { label: 'OV SCHEDULE', field: 'pis', subField: 'ov_schedule', width: 140 },
    { label: 'OVERALL ASSESSMENT', field: 'pis', subField: 'overall_assessment', width: 300 },
    { label: 'INITIAL RESULTS', field: 'pis', subField: 'initial_interview_results', width: 160 },
    { label: 'Type of Interview', field: 'pis', subField: 'interview_type', width: 140 },
    { label: 'CEFR', field: 'pis', subField: 'cefr_level', width: 80 },
    { label: 'Personality Test', field: 'pis', subField: 'personality_test', width: 160 },
    { label: 'Typing Speed', field: 'pis', subField: 'typing_speed_num', width: 110 },
    { label: 'Typing Accuracy', field: 'pis', subField: 'typing_accuracy_pct', width: 110 },
    { label: 'Ops Validator Email', field: 'pis', subField: 'ops_validator_email', width: 250 },
    { label: 'Ops Val Status', field: 'pis', subField: 'ops_validator_status', width: 140 },
    { label: 'Ops Val Notes', field: 'pis', subField: 'ops_validator_notes', width: 300 },
    { label: 'Leadership Status', field: 'pis', subField: 'leadership_score', width: 140 },
    { label: 'Wonderlic Status', field: 'pis', subField: 'wonderlic_status', width: 140 },
    { label: 'Client Interviewer Email', field: 'pis', subField: 'client_interviewer_email', width: 250 },
    { label: 'Client Interview Status', field: 'pis', subField: 'client_interview_status', width: 140 },
    { label: 'Client Interview Notes', field: 'pis', subField: 'client_interview_notes', width: 300 },
    { label: 'Final Specific Status', field: 'pis', subField: 'final_specific_status', width: 140 },
    { label: 'Current Step', field: 'current_status', width: 140 },
    { label: 'Overall Status', field: 'pis', subField: 'overall_status', width: 140 },
    { label: 'Hire Date', field: 'hired_at', width: 130 },
    { label: 'Final Account', field: 'pis', subField: 'final_account', width: 160 },
    { label: 'Updated By', field: 'pis', subField: 'last_updated_by', width: 160 },
    { label: 'Notes', field: 'pis', subField: 'notes', width: 300 }
];

export const EMAIL_COLUMNS = [
    { label: 'Candidate Name', field: 'applicant_name', width: 320 },
    { label: 'BGC Status', field: 'master_bgs_status', width: 190 },
    { label: 'RCBC Status', field: 'master_rcbc_status', width: 190 },
    { label: 'NEO Status', field: 'master_neo_date', width: 190 },
    { label: 'PEME', field: 'master_peme_status', width: 190 },
    { label: 'ACTIONS', field: 'email_actions', width: 340 }
];

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
