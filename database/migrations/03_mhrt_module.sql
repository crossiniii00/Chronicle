-- MHRT Module Migration
-- Includes Master Accounts, H2R Records, Division Mappings, Time Off Assignments, and Directory

-- 1. Master Accounts Configuration (38 Fields)
CREATE TABLE IF NOT EXISTS mhrt_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account TEXT NOT NULL,
    lob TEXT NOT NULL,
    pseudonym TEXT,
    position TEXT,
    campaign_manager TEXT,
    team_manager TEXT,
    base_salary TEXT,
    allowance TEXT,
    account_specific_tracker TEXT,
    assessments TEXT,
    job_description TEXT,
    roster_lock TEXT,
    tool_testing TEXT,
    hoops TEXT,
    voice_type TEXT,
    direction TEXT,
    vertical TEXT,
    education TEXT,
    work_experience TEXT,
    typing_speed TEXT,
    typing_accuracy TEXT,
    cefr TEXT,
    ase TEXT,
    ov_status TEXT DEFAULT 'Pending' CHECK (ov_status IN ('Verified', 'Pending', 'Flagged')),
    ops_validator TEXT,
    ov_availability TEXT,
    client_availability TEXT,
    location TEXT,
    operations_director TEXT,
    trainer TEXT,
    wfm_poc TEXT,
    final_interview_schedule TEXT,
    must_haves TEXT,
    nice_to_haves TEXT,
    hmo TEXT,
    relocation TEXT,
    demographics TEXT,
    background_investigation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. H2R Records Hub
CREATE TABLE IF NOT EXISTS mhrt_h2r_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account TEXT NOT NULL,
    lob TEXT NOT NULL,
    job_location TEXT,
    division TEXT,
    line_of_business TEXT,
    department TEXT,
    reports_to TEXT,
    training TEXT,
    nesting TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. H2R Division Mappings
CREATE TABLE IF NOT EXISTS mhrt_division_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division TEXT NOT NULL UNIQUE,
    assigned_roles TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Assigned Time Off Assignments
CREATE TABLE IF NOT EXISTS mhrt_time_off_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_group TEXT NOT NULL UNIQUE,
    assigned_roles TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MHRT Directory
CREATE TABLE IF NOT EXISTS mhrt_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account TEXT NOT NULL,
    name TEXT DEFAULT 'N/A',
    team TEXT,
    distro TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_mhrt_accounts_name ON mhrt_accounts(account);
CREATE INDEX IF NOT EXISTS idx_mhrt_h2r_account ON mhrt_h2r_records(account);
CREATE INDEX IF NOT EXISTS idx_mhrt_directory_account ON mhrt_directory(account);
