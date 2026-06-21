import { query } from './db.js';

export async function ensureDatabaseTables() {
    console.log('[DB-INIT] Starting self-healing sequence...');

    const runSafeQuery = async (label, sql, params = []) => {
        try {
            await query(sql, params, { silent: true });
        } catch (e) {
            // Only log if it's not a duplicate object/column error
            if (e.code !== '42710' && e.code !== '42701') {
                console.error(`[DB-INIT] Failed: ${label}`, e.message);
            }
        }
    };

    // 0. ENUMs
    await runSafeQuery('Create Status Enum', `
        DO $$ BEGIN
            CREATE TYPE application_status AS ENUM ('APPLIED');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    const statusValues = [
        'TYPING_TEST', 'INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW',
        'FINAL_VERDICT', 'PASSED', 'FAILED', 'REJECTED', 'WAITLISTED',
        'CONDITIONAL', 'WITHDRAWN', 'HIRED', 'NOT_ELIGIBLE_FOR_REHIRE',
        'PROMOTION', 'LATERAL_TRANSFER', 'QUEUE_ASSIGNED',
        'INTERVIEW_IN_PROGRESS', 'ENDORSED', 'FINAL_INTERVIEW_SCHEDULED',
        'ACCEPTED_OFFER', 'FOR_JOB_OFFER', 'SENT_JO_AND_BGC', 'FOR_PAN',
        'OPEN', 'CLOSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW',
        'REPROFILED', 'PROMOTED'
    ];

    for (const val of statusValues) {
        await runSafeQuery(`Add Enum Value ${val}`, `
            DO $$ BEGIN
                ALTER TYPE application_status ADD VALUE '${val}';
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
    }

    // --- HELPER: Safe Column Addition ---
    const addColumn = async (table, col, type) => {
        try {
            await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, [], { silent: true });
        } catch (e) {
            if (e.code !== '42701') { // 42701 is duplicate_column
                console.error(`[DB-INIT] Error adding column ${col} to ${table}:`, e.message);
            }
        }
    };

    // --- HELPER: Safe Index Addition ---
    const addIndex = async (table, col) => {
        try {
            const indexName = `idx_${table}_${col.replace(/,/g, '_')}`;
            await query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${col})`);
        } catch (e) {
            // Ignore errors during index creation
        }
    };

    // 1. Users Table
    await runSafeQuery('Create Users Table', `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'recruiter',
            department TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('users', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('users', 'avatar_data', 'TEXT');
    await addColumn('users', 'cover_data', 'TEXT');
    await addColumn('users', 'phone', 'TEXT');
    await addColumn('users', 'password_plain', 'TEXT');
    await addIndex('users', 'email');

    // 1.1 Session Table
    await runSafeQuery('Create Sessions Table', `
        CREATE TABLE IF NOT EXISTS user_sessions (
            sid varchar NOT NULL COLLATE "default",
            sess json NOT NULL,
            expire timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        ) WITH (OIDS=FALSE);
    `);
    await addIndex('user_sessions', 'expire');

    // 1.2 Applications Table
    await runSafeQuery('Create Applications Table', `
        CREATE TABLE IF NOT EXISTS applications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            applicant_name TEXT NOT NULL,
            applicant_email TEXT NOT NULL,
            applicant_phone TEXT,
            position_title TEXT NOT NULL,
            department TEXT,
            current_status TEXT NOT NULL DEFAULT 'APPLIED',
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            first_name TEXT,
            last_name TEXT,
            middle_name TEXT,
            suffix TEXT,
            nickname TEXT,
            gender TEXT,
            civil_status TEXT,
            birth_date TEXT,
            birth_place TEXT,
            religion TEXT,
            blood_type TEXT,
            height TEXT,
            weight TEXT,
            citizenship TEXT,
            sss_no TEXT,
            tin_no TEXT,
            philhealth_no TEXT,
            pagibig_no TEXT,
            permanent_address TEXT,
            current_address TEXT,
            
            education_level TEXT,
            highest_education TEXT,
            school_name TEXT,
            course TEXT,
            degree TEXT,
            course_strand TEXT,
            graduation_year TEXT,
            num_semesters TEXT,
            
            father_name TEXT,
            mother_name TEXT,
            num_children TEXT,
            num_siblings TEXT
        )
    `);
    await addIndex('applications', 'applicant_email');
    await addColumn('applications', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');

    // 2. Notifications Table
    await runSafeQuery('Create Notifications Table', `
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            notification_type TEXT NOT NULL DEFAULT 'system_announcement',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addIndex('notifications', 'user_id');
    await runSafeQuery('Create composite index on notifications', `
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at_desc 
        ON notifications (user_id, created_at DESC)
    `);

    // 2. Queue Table
    await runSafeQuery('Create Queue Table', `
        CREATE TABLE IF NOT EXISTS queue (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            application_id UUID NOT NULL,
            applicant_name TEXT NOT NULL,
            queue_number INTEGER NOT NULL,
            queue_type TEXT NOT NULL DEFAULT 'INITIAL',
            status TEXT NOT NULL DEFAULT 'WAITING',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('queue', 'interviewer_id', 'UUID');
    await addColumn('queue', 'interviewer_name', 'TEXT');
    await addColumn('queue', 'assigned_room_name', 'TEXT');
    await addColumn('queue', 'called_at', 'TIMESTAMPTZ');
    await addColumn('queue', 'completed_at', 'TIMESTAMPTZ');
    await addColumn('queue', 'assigned_interviewer_id', 'UUID');
    await addColumn('queue', 'assigned_interviewer_name', 'TEXT');
    await addColumn('queue', 'notes', 'TEXT');
    await addIndex('queue', 'application_id');
    await addIndex('queue', 'created_at');

    // 3. Interview Rooms Table
    await runSafeQuery('Create Rooms Table', `
        CREATE TABLE IF NOT EXISTS interview_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_number TEXT NOT NULL,
            room_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'AVAILABLE',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            current_application_id UUID,
            current_applicant_name TEXT,
            occupied_since TIMESTAMPTZ,
            image_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('interview_rooms', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('interview_rooms', 'image_url', 'TEXT');
    await addColumn('interview_rooms', 'room_type', "TEXT DEFAULT 'onsite'");
    
    // 3.1 Departments Table
    await runSafeQuery('Create Departments Table', `
        CREATE TABLE IF NOT EXISTS departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            head TEXT,
            budget_code TEXT,
            type TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('departments', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('departments', 'budget_code', 'TEXT');
    await addColumn('departments', 'account_image_url', 'TEXT');
    await addColumn('departments', 'account_image_data', 'TEXT');
    await addColumn('departments', 'type', 'TEXT');
    await addColumn('departments', 'eligibility_settings', 'JSONB DEFAULT \'{"required":["Accepted Offer","1st Day Show up","Final Specific Status"],"optional":["2nd Day Show up"]}\'');
    await runSafeQuery('Create functional index for departments name', `
        CREATE INDEX IF NOT EXISTS idx_departments_lower_name ON departments (LOWER(name))
    `);

    // 4. MHRT Accounts Table
    await runSafeQuery('Create MHRT Accounts Table', `
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
            ov_status TEXT DEFAULT 'Pending',
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
        )
    `);
    await addColumn('mhrt_accounts', 'created_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('mhrt_accounts', 'updated_at', 'TIMESTAMPTZ DEFAULT NOW()');
    await addColumn('mhrt_accounts', 'ov_status', 'TEXT DEFAULT \'Pending\'');
    await addColumn('mhrt_accounts', 'final_interview_schedule', 'TEXT');
    await addColumn('mhrt_accounts', 'background_investigation', 'TEXT');
    await addColumn('mhrt_accounts', 'must_haves', 'TEXT');
    await addColumn('mhrt_accounts', 'nice_to_haves', 'TEXT');
    await addIndex('mhrt_accounts', 'account');

    // 4.1 MHRT Support Tables
    await runSafeQuery('Create H2R Records', `
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
        )
    `);
    await runSafeQuery('Create MHRT Directory', `
        CREATE TABLE IF NOT EXISTS mhrt_directory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account TEXT NOT NULL,
            name TEXT DEFAULT 'N/A',
            team TEXT,
            distro TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await runSafeQuery('Create Division Mappings', `
        CREATE TABLE IF NOT EXISTS mhrt_division_mappings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            division TEXT NOT NULL UNIQUE,
            assigned_roles TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await runSafeQuery('Create Time Off Assignments', `
        CREATE TABLE IF NOT EXISTS mhrt_time_off_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            location_group TEXT NOT NULL UNIQUE,
            assigned_roles TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    // 5. Application Patching
    await runSafeQuery('Patch User Role Type to TEXT', `ALTER TABLE users ALTER COLUMN role TYPE TEXT`);
    await runSafeQuery('Drop Stale User Role Check Constraint', `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await runSafeQuery('Patch App Status Type', `ALTER TABLE applications ALTER COLUMN current_status TYPE TEXT`);
    await runSafeQuery('Drop Stale App Status Check Constraint', `ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check`);
    await runSafeQuery('Patch App Typing WPM Type', `ALTER TABLE applications ALTER COLUMN typing_test_wpm TYPE TEXT`);
    await runSafeQuery('Patch App Accuracy Type', `ALTER TABLE applications ALTER COLUMN typing_test_accuracy TYPE TEXT`);
    await runSafeQuery('Patch App Score Type', `ALTER TABLE applications ALTER COLUMN assessment_score TYPE TEXT`);
    
    await addColumn('applications', 'typing_test_duration_seconds', 'INTEGER');
    await addColumn('applications', 'typing_test_completed_at', 'TIMESTAMPTZ');
    await addColumn('applications', 'skills', 'JSONB');
    await addColumn('applications', 'medical_conditions', 'JSONB');
    await addColumn('applications', 'assigned_interview_room_name', 'TEXT');
    await addColumn('applications', 'assigned_recruiter_name', 'TEXT');
    await addColumn('applications', 'assigned_recruiter_id', 'UUID');
    await addColumn('applications', 'applicant_id', 'TEXT');
    await addColumn('applications', 'resume_path', 'TEXT');
    await addColumn('applications', 'resume_name', 'TEXT');
    await addColumn('applications', 'resume_data', 'TEXT');
    await addColumn('applications', 'assigned_ops_validator_id', 'UUID');
    await addColumn('applications', 'assigned_ops_validator_name', 'TEXT');
    await addColumn('applications', 'photo_data_url', 'TEXT');
    await addColumn('applications', 'endorsement_meeting_date', 'TEXT');
    await addColumn('applications', 'endorsement_meeting_end_date', 'TEXT');
    await addColumn('applications', 'endorsement_meeting_body', 'TEXT');
    await addColumn('applications', 'highest_education', 'TEXT');
    await addColumn('applications', 'degree', 'TEXT');
    await addColumn('applications', 'course', 'TEXT');
    await addColumn('applications', 'course_strand', 'TEXT');
    await addColumn('applications', 'queue_number', 'INTEGER');
    await addColumn('applications', 'queue_type', 'TEXT');
    
    // --- MASTER REGISTRY COLUMNS ---
    await addColumn('applications', 'master_first_name', 'TEXT');
    await addColumn('applications', 'master_last_name', 'TEXT');
    await addColumn('applications', 'master_cp36_email', 'TEXT');
    await addColumn('applications', 'master_training_start_date', 'TEXT');
    await addColumn('applications', 'master_basic_salary', 'TEXT');
    await addColumn('applications', 'master_allowance', 'TEXT');
    await addColumn('applications', 'master_neo_date', 'TEXT');
    await addColumn('applications', 'master_peme_status', 'TEXT');
    await addColumn('applications', 'master_peme_result', 'TEXT');
    await addColumn('applications', 'master_discord_handle', 'TEXT');
    await addColumn('applications', 'master_bgs_status', 'TEXT');
    await addColumn('applications', 'master_email_nbi_status', 'TEXT');
    await addColumn('applications', 'master_nbi_result', 'TEXT');
    await addColumn('applications', 'master_bi_endorsement_date', 'TEXT');
    await addColumn('applications', 'master_bi_result', 'TEXT');
    await addColumn('applications', 'master_rcbc_status', 'TEXT');
    await addColumn('applications', 'master_hiring_request_id', 'TEXT');
    await addColumn('applications', 'master_remarks', 'TEXT');
    await addColumn('applications', 'master_eid', 'TEXT');
    await addColumn('applications', 'master_referee_eid', 'TEXT');
    await addColumn('applications', 'master_win_date', 'TEXT');
    await addColumn('applications', 'master_column', 'TEXT');
    await addColumn('applications', 'master_wave', 'TEXT');
    await addColumn('applications', 'master_h2r_status', 'TEXT');
    await addColumn('applications', 'master_sss_status', 'TEXT');
    await addColumn('applications', 'master_philhealth_status', 'TEXT');
    await addColumn('applications', 'master_pagibig_status', 'TEXT');
    await addColumn('applications', 'master_first_day_show_up', 'TEXT');
    await addColumn('applications', 'master_second_day_show_up', 'TEXT');
    await addColumn('applications', 'hired_at', 'TEXT');
    await addColumn('applications', 'metadata', 'JSONB DEFAULT \'{}\'');
    await addColumn('applications', 'hiring_source', 'TEXT');
    await addColumn('applications', 'source', 'TEXT');

    await addIndex('applications', 'applicant_name');
    await addIndex('applications', 'department');
    await addIndex('applications', 'applied_at');
    await runSafeQuery('Create functional index for applications department', `
        CREATE INDEX IF NOT EXISTS idx_applications_lower_trim_dept ON applications (LOWER(TRIM(department)))
    `);
    await addColumn('applications', 'interview_grading', 'JSONB');
    await addColumn('applications', 'interview_responses', 'JSONB');
    await addColumn('applications', 'interview_room', 'TEXT');
    await addColumn('applications', 'interview_recording_url', 'TEXT');
    await addColumn('applications', 'interview_completed_at', 'TIMESTAMPTZ');
    await addColumn('applications', 'final_interview_notes', 'TEXT');
    await addColumn('applications', 'client_assessment_score', 'NUMERIC');
    await addColumn('applications', 'client_interview_remarks', 'TEXT');
    await addColumn('applications', 'final_verdict', 'TEXT');
    await addColumn('applications', 'rejection_reason', 'TEXT');
    await addColumn('applications', 'notes', 'TEXT');
    await addColumn('applications', 'master_middle_name', 'TEXT');
    await addColumn('applications', 'interview_notes', 'TEXT');
    await addColumn('applications', 'endorsed_to_recruiter_s', 'BOOLEAN DEFAULT FALSE');
    await addColumn('applications', 'recruiter_s_scheduling_status', 'TEXT');
    await addColumn('applications', 'current_status', 'TEXT'); // Ensure it's text if not already
    await addColumn('applications', 'highlight_color', 'TEXT');

    // Relax not-null on position_title to prevent bulk import failures
    await runSafeQuery('Relax position_title', `ALTER TABLE applications ALTER COLUMN position_title DROP NOT NULL`);

    // 6. Core Tables
    await runSafeQuery('Create Audit Logs', `
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id UUID,
            ip_address TEXT,
            user_agent TEXT,
            metadata JSONB DEFAULT '{}',
            success BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addIndex('audit_logs', 'created_at');
    await addIndex('audit_logs', 'user_id');

    await runSafeQuery('Create Positions', `
        CREATE TABLE IF NOT EXISTS positions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            department TEXT,
            description TEXT,
            requirements TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await runSafeQuery('Make Positions Department Nullable', `
        ALTER TABLE positions ALTER COLUMN department DROP NOT NULL;
    `);
    await runSafeQuery('Unbind Existing Job Postings From Departments', `
        UPDATE positions 
        SET department = NULL 
        WHERE requirements IS DISTINCT FROM 'ACCOUNT_INTERNAL_QUOTA' 
          AND title NOT LIKE '[INTERNAL]%';
    `);
    await addColumn('positions', 'requirements', 'TEXT');
    await addColumn('positions', 'hiring_quota', 'INTEGER DEFAULT 1');
    await addColumn('positions', 'current_hired', 'INTEGER DEFAULT 0');
    await addColumn('positions', 'manual_hired', 'INTEGER DEFAULT 0');
    await addColumn('positions', 'quota_start_date', 'DATE');
    await addColumn('positions', 'quota_end_date', 'DATE');
    await addColumn('positions', 'status', 'TEXT DEFAULT \'OPEN\'');
    await addColumn('positions', 'employment_type', 'TEXT DEFAULT \'Full-time\'');
    await addColumn('positions', 'location', 'TEXT');
    await addColumn('positions', 'work_arrangement', 'TEXT');
    await addColumn('positions', 'created_by', 'UUID');
    await addColumn('positions', 'image_url', 'TEXT');
    await addColumn('positions', 'training_start_date', 'DATE');
    await addColumn('positions', 'hiring_quota_id', 'TEXT');

    // Job Categories Table
    await runSafeQuery('Create Job Categories Table', `
        CREATE TABLE IF NOT EXISTS job_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('job_categories', 'description', 'TEXT');
    await addColumn('job_categories', 'sort_order', 'INTEGER DEFAULT 0');

    // Add category_id to positions
    await addColumn('positions', 'category_id', 'UUID');
    await addIndex('positions', 'category_id');

    await runSafeQuery('Create Hiring Quota History', `
        CREATE TABLE IF NOT EXISTS hiring_quota_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            department TEXT NOT NULL,
            position_id UUID,
            quota INTEGER NOT NULL DEFAULT 0,
            hired_count INTEGER NOT NULL DEFAULT 0,
            total_applicants INTEGER NOT NULL DEFAULT 0,
            in_pipeline INTEGER NOT NULL DEFAULT 0,
            failed_count INTEGER NOT NULL DEFAULT 0,
            start_date DATE,
            end_date DATE,
            closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            closed_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addIndex('hiring_quota_history', 'department');
    await addIndex('hiring_quota_history', 'closed_at');
    await addColumn('hiring_quota_history', 'hiring_type', 'TEXT');
    await addColumn('hiring_quota_history', 'manual_hires', 'INTEGER');
    await addColumn('hiring_quota_history', 'training_start_date', 'DATE');
    await addColumn('hiring_quota_history', 'hiring_quota_id', 'TEXT');

    await runSafeQuery('Create Hiring Quota Requests', `
        CREATE TABLE IF NOT EXISTS hiring_quota_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            department TEXT NOT NULL,
            request_type TEXT NOT NULL,
            quota INTEGER,
            start_date DATE,
            end_date DATE,
            reason TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            requested_by UUID,
            requested_by_name TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addIndex('hiring_quota_requests', 'department');
    await addIndex('hiring_quota_requests', 'status');

    await runSafeQuery('Create Email Templates', `
        CREATE TABLE IF NOT EXISTS email_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT NOT NULL,
            attachment_name TEXT,
            attachment_path TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addColumn('email_templates', 'attachment_name', 'TEXT');
    await addColumn('email_templates', 'attachment_path', 'TEXT');

    await runSafeQuery('Create Status History', `
        CREATE TABLE IF NOT EXISTS status_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            application_id UUID NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            changed_by_name TEXT,
            change_reason TEXT,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await addIndex('status_history', 'application_id');
    await addIndex('status_history', 'changed_at');

    await runSafeQuery('Create Questions', `
        CREATE TABLE IF NOT EXISTS interview_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category TEXT,
            instructions TEXT,
            question_text TEXT NOT NULL,
            question_type TEXT NOT NULL DEFAULT 'initial',
            answer_type TEXT NOT NULL DEFAULT 'text',
            is_active BOOLEAN NOT NULL DEFAULT true,
            is_required BOOLEAN NOT NULL DEFAULT true,
            question_order INTEGER NOT NULL DEFAULT 0,
            options JSONB,
            max_rating INTEGER DEFAULT 5,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await addColumn('interview_questions', 'options', 'JSONB');
    await addColumn('interview_questions', 'max_rating', 'INTEGER DEFAULT 5');

    // 7. Report Configs
    await runSafeQuery('Create Report Configs', `
        CREATE TABLE IF NOT EXISTS report_configs (
            id TEXT PRIMARY KEY,
            config_data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await runSafeQuery('Create Forum Posts', `
        CREATE TABLE IF NOT EXISTS forum_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            author_id UUID REFERENCES users(id) ON DELETE SET NULL,
            content TEXT,
            type TEXT NOT NULL DEFAULT 'text',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await addColumn('forum_posts', 'image_data', 'TEXT');
    await addColumn('forum_posts', 'department', 'TEXT');

    await runSafeQuery('Drop NOT NULL on forum_posts.content (if exists)', `
        DO $$
        BEGIN
            ALTER TABLE forum_posts ALTER COLUMN content DROP NOT NULL;
        EXCEPTION
            WHEN others THEN
                NULL;
        END $$;
    `);

    await runSafeQuery('Add parent_id to Forum Posts', `
        ALTER TABLE forum_posts
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE
    `);

    await runSafeQuery('Index Forum Posts parent_id', `
        CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_id ON forum_posts(parent_id)
    `);

    await runSafeQuery('Create Forum Comments', `
        CREATE TABLE IF NOT EXISTS forum_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
            author_id UUID REFERENCES users(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await runSafeQuery('Create Forum Reactions', `
        CREATE TABLE IF NOT EXISTS forum_reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            reaction_type TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE NULLS NOT DISTINCT (post_id, comment_id, user_id)
        )
    `);

    await runSafeQuery('Create Forum Polls', `
        CREATE TABLE IF NOT EXISTS forum_polls (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE UNIQUE,
            question TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await runSafeQuery('Create Forum Poll Options', `
        CREATE TABLE IF NOT EXISTS forum_poll_options (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            poll_id UUID REFERENCES forum_polls(id) ON DELETE CASCADE,
            option_text TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await runSafeQuery('Create Forum Poll Votes', `
        CREATE TABLE IF NOT EXISTS forum_poll_votes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            poll_option_id UUID REFERENCES forum_poll_options(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await addIndex('forum_posts', 'created_at');
    await addIndex('forum_comments', 'post_id');
    await addIndex('forum_reactions', 'post_id');
    await addIndex('forum_reactions', 'comment_id');
    
    // Performance optimization indexes
    await addIndex('applications', 'assigned_ops_validator_id');
    await addIndex('work_experience', 'application_id');
    await addIndex('typing_test_results', 'application_id');
    await addIndex('applications', 'applicant_id');
    await addIndex('applications', 'position_id');
    await addIndex('applications', 'assigned_recruiter_id');
    await addIndex('queue', 'interviewer_id');
    await addIndex('queue', 'assigned_interviewer_id');
    await addIndex('forum_posts', 'author_id');
    await addIndex('forum_comments', 'author_id');
    await addIndex('forum_reactions', 'user_id');
    await addIndex('forum_poll_options', 'poll_id');
    await addIndex('forum_poll_votes', 'poll_option_id');
    await addIndex('forum_poll_votes', 'user_id');
    await addIndex('mhrt_h2r_records', 'account');
    await addIndex('mhrt_directory', 'account');
    await addIndex('hiring_quota_history', 'position_id');
    await addIndex('hiring_quota_requests', 'requested_by');

    // 9. Seed Debug User
    try {
        const { AuthService } = await import('./services/AuthService.js');
        const userRes = await query("SELECT id FROM users WHERE email = 'itsmagiii@gmail.com'");
        if (userRes.rows.length === 0) {
            // Only seed the default debug user if the users table is completely empty.
            // This prevents the account from being re-created if the administrator explicitly deleted it.
            const userCountRes = await query("SELECT COUNT(*) FROM users");
            const userCount = parseInt(userCountRes.rows[0].count, 10);
            if (userCount === 0) {
                console.log('[DB-INIT] Seeding debug user: itsmagiii@gmail.com');
                await AuthService.provisionUser({
                    full_name: 'Maggie itsmagiii',
                    email: 'itsmagiii@gmail.com',
                    password: 'password123',
                    role: 'admin'
                });
                console.log('[DB-INIT] Debug user seeded.');
            }
        }
    } catch (e) {
        console.error('[DB-INIT] Failed to seed debug user:', e.message);
    }

    // 8.5 Clean up stale queue entries from previous days
    await runSafeQuery('Clean stale queue entries', `
        UPDATE queue 
        SET status = 'SKIPPED', completed_at = NOW() 
        WHERE status IN ('WAITING', 'IN_PROGRESS', 'CALLED') 
          AND created_at < CURRENT_DATE::timestamptz
    `);

    // 9. Configure Aggressive Autovacuum for High-Churn Tables
    const highChurnTables = [
        'applications',
        'interview_rooms',
        'user_sessions',
        'queue',
        'status_history',
        'users'
    ];

    for (const table of highChurnTables) {
        await runSafeQuery(`Configure Autovacuum for ${table}`, `
            ALTER TABLE ${table} SET (
                autovacuum_vacuum_threshold = 5,
                autovacuum_analyze_threshold = 5,
                autovacuum_vacuum_scale_factor = 0.05,
                autovacuum_analyze_scale_factor = 0.05
            );
        `);
    }

    console.log('[DB-INIT] Self-healing sequence complete.');
}
