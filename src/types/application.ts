export type ApplicationStatus =
    | 'Accepted Offer'
    | 'For Job Offer'
    | 'Withdrawn'
    | 'For PAN'
    | 'Applicant Form'
    | 'Promoted'
    | 'Lateral Transfer'
    | 'Sent JO and BGC'
    | 'Assessment'
    | 'CLIENT_ASSESSMENT'
    | 'CLIENT_INTERVIEW'
    | 'REPROFILE_FINAL_INTERVIEW'
    | 'RESCHEDULED'
    | 'MARKED_PENDING'
    | string;

export interface WorkExperience {
    company: string;
    position: string;
    duration_from: string;
    duration_to: string;
    description: string;
    exit_reason?: string;
}

export interface Language {
    language: string;
    proficiency: string;
}

export interface Certification {
    name: string;
    issuer: string;
    date: string;
}

export interface PersonalInfoSheet {
    id: string;
    application_id: string;
    full_name: string;
    nick_name?: string;
    birth_date?: string;
    sex?: string;
    civil_status?: string;
    nationality?: string;
    email: string;
    phone?: string;
    current_address?: string;
    permanent_address?: string;
    place_of_birth?: string;
    religion?: string;
    photo_data_url?: string;
    age?: number;
    hiring_source?: string;
    candidate_source?: string;
    sss_no?: string;
    tin_no?: string;
    pagibig_no?: string;
    philhealth_no?: string;
    flexible_schedule?: boolean;
    travel_method?: string;
    highest_education?: string;
    school_name?: string;
    degree?: string;
    graduation_year?: number;
    work_experience: WorkExperience[];
    skills: string[];
    languages: Language[];
    certifications: Certification[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;

    // Family Background
    spouse_name?: string;
    spouse_occupation?: string;
    father_name?: string;
    father_occupation?: string;
    mother_name?: string;
    mother_occupation?: string;
    num_children?: number;
    num_siblings?: number;

    // Education Extended
    school_year_attended?: string;
    is_graduated?: boolean;
    course_strand?: string;
    num_semesters?: number;
    plans_to_pursue_studies?: string;
    plans_to_go_abroad?: string;

    // Medical & Habits
    medical_conditions?: string[];
    medical_history_notes?: string;
    has_medical_conditions?: boolean;
    drinks_alcohol?: boolean;
    smokes?: boolean;
    is_pregnant?: boolean;

    // Custom Tracker Fields
    background_summary?: string;
    tl_tenure?: string;
    bpo_experience_tenure?: string;
    salary_expectation?: string;
    first_name?: string;
    middle_name?: string;
    preferred_nickname?: string;
    last_name?: string;
    course_year?: string;
    preferred_setup?: string;
    willing_to_relocate?: string;
    initial_interview_result?: string;
    second_level_interview_result?: string;
    final_interview_result?: string;

    // New Not Eligible / Registry Fields
    start_time?: string;
    completion_time?: string;
    summary_of_background?: string;
    reason_for_interest?: string;
    goals_6_months?: string;
    handle_setback?: string;
    prior_commitments?: string;
    available_training_start?: string;
    preferred_shifts?: string;
    transportation_mode?: string;
    pending_job_offer?: string;
    role_specific_questions?: string;
    is_enercare?: string;
    rating_reason?: string;
    accent_diction?: string;
    fluency_comprehension?: string;
    sentence_construction?: string;
    pronunciation?: string;
    bpo_experience?: string;
    tenure_bpo?: string;
    plans_back_to_school?: string;
    government_ids?: string;
    hiring_source_detailed?: string;
    candidate_questions?: string;
    initial_account_assignment?: string;
    ov_schedule?: string;
    overall_assessment?: string;
    initial_interview_results?: string;
    interview_type?: string;
    cefr_level?: string;
    cefr?: string;
    personality_test?: string;
    critical_thinking_score?: string;
    typing_speed_num?: string;
    typing_accuracy_pct?: string;
    ops_validator_email?: string;
    ops_validator_status?: string;
    ops_validator_notes?: string;
    ops_validation_remarks?: string;
    leadership_assessment_status?: string;
    leadership_score?: string;
    wonderlic_status?: string;
    wonderlic_score?: string;
    speechx_status?: string;
    speechx_score?: string;
    candidate_type?: string;
    client_interviewer_email?: string;
    client_interview_status?: string;
    client_interview_result?: string;
    client_interview_notes?: string;
    client_assessment_status?: string;
    client_assessment_notes?: string;
    final_specific_status?: string;
    overall_status?: string;
    final_account?: string;
    last_updated_by?: string;
    notes?: string;
    custom_lob?: string;

    // Ops Validator Specific Fields
    ops_validator_attachment_name?: string;
    ops_validator_attachment_data?: string;

    // Team Leader Specific Registry Fields
    tenure_as_tl?: string;
    total_bpo_experience?: string;


    // Finalization
    signature_data_url?: string;
    signature?: string;
    form_submitted_at?: string;

    // Reprofiling
    reprofile_history?: {
        previous_account: string;
        new_account: string;
        changed_at: string;
        changed_by: string;
    }[];
    required_processes?: string[];
    process_order?: string[];
    process_settings?: Record<string, string>;
    date_of_birth?: string;
    dob?: string;
    contact_number?: string;
    email_address?: string;
    specific_status?: string;
    hiring_type?: string;
}

export interface Application {
    id: string;
    hiring_type?: string;
    applicant_id: string;
    process_settings?: Record<string, string>;
    applicant_name: string;
    preferred_nickname?: string;
    applicant_email: string;
    position_id: string;
    position_title: string;
    department: string;
    queue_number?: number;
    queue_type?: 'INITIAL' | 'FINAL';
    current_status: ApplicationStatus;
    source?: string;
    resume_url?: string;
    resume_name?: string;
    resume_data?: string;
    resume_path?: string;
    assigned_recruiter_id?: string;
    assigned_recruiter_name?: string;
    assigned_ops_validator_id?: string;
    assigned_ops_validator_name?: string;
    assigned_interview_room_id?: string;
    assigned_interview_room_name?: string;
    applied_at: string;
    approved_at?: string;
    interview_completed_at?: string;
    hired_at?: string;
    updated_at: string;
    typing_test_wpm?: number;
    typing_test_accuracy?: number;
    typing_test_duration_seconds?: number;
    typing_test_completed_at?: string;
    typing_test_passed?: boolean | string;
    typing_test_attempts?: number;
    assessment_score?: number;
    client_assessment_score?: number;
    client_interview_remarks?: string;
    interview_notes?: string;
    final_interview_notes?: string;
    interview_responses?: Record<string, string>;
    interview_grading?: Record<string, number>;
    endorsement_account?: string;
    endorsed_to_recruiter_s?: boolean;
    overall_status?: string;
    quota_history_id?: string;
    is_hidden?: boolean;

    // Skill Self-Ratings
    rating_communication?: number;
    rating_empathy?: number;
    rating_problem_solving?: number;

    // Competency Ratings (1-5 or similar)
    comp_critical_thinking?: number;
    comp_attention_to_detail?: number;
    comp_customer_focus?: number;
    comp_technical_skills?: number;
    comp_adaptability?: number;
    comp_teamwork?: number;
    comp_leadership?: number;

    final_verdict?: 'PASSED' | 'REJECTED' | 'WAITLISTED' | 'CONDITIONAL' | 'WITHDRAWN' | 'HIRED';
    initial_verdict?: string;
    assessment_status?: string;
    assessment_results?: any[];
    interviewer_name?: string;
    interview_room?: string;
    scheduled_by?: string;
    pis?: Partial<PersonalInfoSheet>;
    rejection_reason?: string;
    signature_data_url?: string;
    final_specific_status?: string;
    interview_recording_url?: string;
    endorsement_meeting_date?: string;
    endorsement_meeting_end_date?: string;
    endorsement_meeting_body?: string;
    endorsement_sender_email?: string;

    // Masterlist / HR Tracker Fields
    master_wave?: string;
    master_hiring_request_id?: string;
    master_remarks?: string;
    master_eid?: string;
    master_column?: string;
    master_last_name?: string;
    master_middle_name?: string;
    master_first_name?: string;
    master_cp36_email?: string;
    master_training_start_date?: string;
    master_basic_salary?: number;
    master_allowance?: number;
    master_neo_date?: string;
    master_peme_status?: string;
    master_peme_result?: string;
    master_discord_handle?: string;
    master_bgs_status?: string;
    master_email_nbi_status?: string;
    master_nbi_result?: string;
    master_bi_endorsement_date?: string;
    master_bi_result?: string;
    master_referee_eid?: string;
    master_rcbc_status?: string;
    master_h2r_status?: string;
    master_sss_status?: string;
    master_philhealth_status?: string;
    master_pagibig_status?: string;
    tin_no?: string;
    master_training_confirmation?: string;
    master_status?: string;
    master_win_date?: string;
    master_claim_date?: string;
    master_first_day_show_up?: string;
    master_second_day_show_up?: string;
    metadata?: Record<string, any>;
    notes?: string;
    highlight_color?: string;

    failure_details?: {
        changed_at: string;
        changed_by_name: string;
        from_status?: string;
    };

    // Runtime / computed fields used across views
    email?: string;
    is_on_call?: boolean;
    started_at?: string;
    completed_at?: string;
    created_at?: string;
    phone_number?: string;
    home_address?: string;
    date_of_birth?: string;
    applicant_hire_eligibility_status?: string;
    hiring_source?: string;
    recruiter_s_scheduling_status?: string;
    remarks?: string;
    phone?: string;
    leadership_score?: string | number;
}

export interface ApplicationSubmitPayload {
    applicant_id: string;
    applicant_name: string;
    applicant_email: string;
    position_id: string;
    position_title: string;
    department: string;
    current_status: ApplicationStatus;
    resume_url: string;
    resume_name: string;
    pis: PersonalInfoSheet | (Omit<PersonalInfoSheet, 'id' | 'application_id'> & Partial<Pick<PersonalInfoSheet, 'id' | 'application_id'>>);
}

export interface ApplicationUpdatePatch extends Partial<Omit<Application, 'pis'>> {
    updated_at?: string;
    pis?: Partial<PersonalInfoSheet>;
}

export interface StatusHistoryEntry {
    id: string;
    application_id: string;
    from_status?: ApplicationStatus | string;
    to_status: ApplicationStatus;
    changed_by_name: string;
    change_reason?: string;
    changed_at: string;
}

export interface TypingTestSubmission {
    prompt_text: string;
    typed_text: string;
    duration_seconds: number;
}

export interface TypingTestResult extends TypingTestSubmission {
    words_per_minute: number;
    accuracy_percent: number;
    completed_at: string;
}

export type TemplateType = 'REJECTION_INITIAL' | 'REJECTION_FINAL' | 'INTERVIEW_INVITE' | 'INTERVIEW_INVITE_ONLINE' | 'OFFER' | 'NBI' | 'PEME' | 'NEO' | 'RCBC' | 'BGC' | 'WELCOME_USER' | 'OTHER';

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: TemplateType;
    isActive: boolean;
    attachment_name?: string;
    cc_emails?: string | null;
    updated_at: string;
}
