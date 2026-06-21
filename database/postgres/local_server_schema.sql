CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('applicant', 'recruiter', 'admin', 'guest_interviewer');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM (
            'APPLIED',
            'TYPING_TEST',
            'INITIAL_INTERVIEW',
            'QUEUE_ASSIGNED',
            'INTERVIEW_IN_PROGRESS',
            'ASSESSMENT',
            'ENDORSED',
            'FINAL_INTERVIEW',
            'FINAL_VERDICT',
            'HIRED',
            'REJECTED',
            'FAILED',
            'WAITLISTED',
            'CONDITIONAL',
            'WITHDRAWN',
            'NOT_ELIGIBLE_FOR_REHIRE',
            'PROMOTION',
            'LATERAL_TRANSFER'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role app_role NOT NULL,
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    position_title TEXT NOT NULL,
    department TEXT NOT NULL,
    current_status application_status NOT NULL DEFAULT 'APPLIED',
    final_verdict application_status,
    resume_path TEXT,
    phone TEXT,
    birth_date TEXT,
    gender TEXT,
    civil_status TEXT,
    nationality TEXT,
    current_address TEXT,
    permanent_address TEXT,
    highest_education TEXT,
    school_name TEXT,
    degree TEXT,
    graduation_year INTEGER,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    signature_data_url TEXT,
    nick_name TEXT,
    place_of_birth TEXT,
    sss_no TEXT,
    tin_no TEXT,
    pagibig_no TEXT,
    philhealth_no TEXT,
    flexible_schedule BOOLEAN,
    travel_method TEXT,
    spouse_name TEXT,
    spouse_occupation TEXT,
    father_name TEXT,
    father_occupation TEXT,
    mother_name TEXT,
    mother_occupation TEXT,
    num_children INTEGER,
    num_siblings INTEGER,
    school_year_attended TEXT,
    is_graduated BOOLEAN,
    course_strand TEXT,
    num_semesters INTEGER,
    plans_to_pursue_studies TEXT,
    plans_to_go_abroad TEXT,
    has_medical_conditions BOOLEAN,
    medical_conditions JSONB,
    medical_history_notes TEXT,
    drinks_alcohol BOOLEAN,
    smokes BOOLEAN,
    is_pregnant BOOLEAN,
    skills JSONB,
    assigned_recruiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    typing_test_wpm NUMERIC(6,2),
    typing_test_accuracy NUMERIC(5,2),
    typing_test_duration_seconds INTEGER,
    typing_test_completed_at TIMESTAMPTZ,
    assessment_score NUMERIC(5,2),
    interview_notes TEXT,
    final_interview_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relational professional history
CREATE TABLE IF NOT EXISTS work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company TEXT,
    position TEXT,
    duration_from TEXT,
    duration_to TEXT,
    description TEXT,
    exit_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_exp_app_id ON work_experience(application_id);

CREATE TABLE IF NOT EXISTS typing_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    typed_text TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    words_per_minute NUMERIC(6,2) NOT NULL,
    accuracy_percent NUMERIC(5,2) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status application_status,
    to_status application_status NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name TEXT NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(current_status);
CREATE INDEX IF NOT EXISTS idx_applications_position ON applications(position_id);
CREATE INDEX IF NOT EXISTS idx_status_history_application ON status_history(application_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);
