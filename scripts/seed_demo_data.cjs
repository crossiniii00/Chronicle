const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || 'recruitms',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '11111'
});

async function seed() {
    console.log('[Seed] Starting Demo Portfolio Seeding...');

    // 1. Safety backup check for original applications
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS applications_backup_raw AS 
            SELECT * FROM applications;
        `);
        console.log('[Seed] Ensured applications_backup_raw exists.');
    } catch (e) {
        console.log('[Seed] Note on backup:', e.message);
    }

    // 2. Clear current transactional data
    console.log('[Seed] Clearing pipeline data...');
    await pool.query('DELETE FROM typing_attempts');
    await pool.query('DELETE FROM typing_test_results');
    await pool.query('DELETE FROM queue');
    await pool.query('DELETE FROM interview_queue');
    await pool.query('DELETE FROM status_history');
    await pool.query('DELETE FROM applications');

    // 3. Setup Departments / Client Accounts & Support Roles
    console.log('[Seed] Seeding Client Accounts & Support Roles...');
    await pool.query("DELETE FROM departments WHERE type = 'ACCOUNTS' AND name NOT IN ('NVIDIA', 'AMD', 'Microsoft', 'Apple', 'Amazon', 'Google')");
    // We clear old demo departments and upsert top-tier client accounts
    const clientAccounts = [
        {
            name: 'Microsoft',
            image: '/uploads/account-images/microsoft.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['Azure Cloud Ops', 'Xbox Game Studios', 'Enterprise Support', 'Surface Device Tech']
        },
        {
            name: 'NVIDIA',
            image: '/uploads/account-images/nvidia.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['CUDA AI Infrastructure', 'GeForce Customer Experience', 'Deep Learning Solutions', 'Omniverse Enterprise']
        },
        {
            name: 'AMD',
            image: '/uploads/account-images/amd.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['Radeon Gaming Support', 'EPYC Cloud Infrastructure', 'Ryzen Systems Validation', 'Semi-Custom Solutions']
        },
        {
            name: 'Apple',
            image: '/uploads/account-images/apple.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['iOS Ecosystem Services', 'Hardware Quality Assurance', 'AppleCare VIP Support', 'iCloud Operations']
        },
        {
            name: 'Amazon',
            image: '/uploads/account-images/amazon.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['AWS Cloud Tech Support', 'Prime Logistics Operations', 'Alexa AI Systems', 'Enterprise Solutions']
        },
        {
            name: 'Google',
            image: '/uploads/account-images/google.svg',
            type: 'ACCOUNTS',
            sub_accounts: ['Google Cloud Platform', 'Pixel Technical Support', 'Android Ecosystem Ops', 'Workspace Enterprise']
        }
    ];

    const supportRoles = [
        { name: 'Information Technology', type: 'SUPPORT_ROLES', sub_accounts: ['Network Infrastructure', 'Desktop Support', 'InfoSec'] },
        { name: 'Talent Acquisition & HR', type: 'SUPPORT_ROLES', sub_accounts: ['Sourcing', 'Recruitment Ops', 'People Experience'] },
        { name: 'Workforce Management', type: 'SUPPORT_ROLES', sub_accounts: ['Real-Time Adherence', 'Scheduling', 'Capacity Planning'] },
        { name: 'Quality Assurance', type: 'SUPPORT_ROLES', sub_accounts: ['Call Monitoring', 'Process Compliance', 'Coaching'] },
        { name: 'Training & Development', type: 'SUPPORT_ROLES', sub_accounts: ['New Hire Onboarding', 'Product Upskilling', 'Leadership'] },
        { name: 'Finance & Accounting', type: 'SUPPORT_ROLES', sub_accounts: ['Payroll Operations', 'Billing & Invoicing', 'Auditing'] }
    ];

    const allDepts = [...clientAccounts, ...supportRoles];
    const deptIdMap = {};

    for (const d of allDepts) {
        const existing = await pool.query('SELECT id FROM departments WHERE UPPER(name) = UPPER($1)', [d.name]);
        let deptId;
        if (existing.rows.length > 0) {
            deptId = existing.rows[0].id;
            await pool.query(
                `UPDATE departments 
                 SET account_image_url = $1, type = $2, sub_accounts = $3, updated_at = NOW() 
                 WHERE id = $4`,
                [d.image || null, d.type, JSON.stringify(d.sub_accounts), deptId]
            );
        } else {
            deptId = crypto.randomUUID();
            await pool.query(
                `INSERT INTO departments (id, name, account_image_url, type, sub_accounts, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                [deptId, d.name, d.image || null, d.type, JSON.stringify(d.sub_accounts)]
            );
        }
        deptIdMap[d.name] = deptId;
    }
    console.log(`[Seed] Seeded ${allDepts.length} departments.`);

    // 4. Setup Open Positions
    console.log('[Seed] Seeding Open Positions for Demo Client Accounts...');
    await pool.query("UPDATE positions SET status = 'CLOSED'"); // Close legacy positions

    const demoPositions = [
        // Microsoft
        {
            title: 'Azure Cloud Solutions Specialist',
            dept: 'Microsoft',
            desc: 'Provide tier-2 enterprise architecture and cloud diagnostics for Azure commercial clients.',
            quota: 15,
            img: '/uploads/account-images/microsoft.svg',
            opening: 'Agent - Cloud Support'
        },
        {
            title: 'Xbox Enterprise Support Representative',
            dept: 'Microsoft',
            desc: 'Deliver dedicated customer resolution and subscription support for Xbox ecosystem users.',
            quota: 25,
            img: '/uploads/account-images/microsoft.svg',
            opening: 'Agent - Customer Support'
        },
        // NVIDIA
        {
            title: 'AI Operations & CUDA Support Engineer',
            dept: 'NVIDIA',
            desc: 'Technical consultation and driver/toolkit diagnostics for enterprise deep learning deployments.',
            quota: 12,
            img: '/uploads/account-images/nvidia.svg',
            opening: 'Specialist - AI Compute'
        },
        {
            title: 'GeForce Premium Customer Advocate',
            dept: 'NVIDIA',
            desc: 'Support passionate creators and gamers with hardware configuration, streaming, and GPU troubleshooting.',
            quota: 20,
            img: '/uploads/account-images/nvidia.svg',
            opening: 'Agent - Tech Support'
        },
        // AMD
        {
            title: 'Radeon Systems Technical Associate',
            dept: 'AMD',
            desc: 'Help gaming clients and PC builders diagnose graphics drivers and high-refresh display ecosystems.',
            quota: 18,
            img: '/uploads/account-images/amd.svg',
            opening: 'Agent - Systems Tech'
        },
        {
            title: 'EPYC Server Infrastructure Specialist',
            dept: 'AMD',
            desc: 'Tier-2 diagnostic advocate for enterprise data centers running AMD EPYC server infrastructure.',
            quota: 10,
            img: '/uploads/account-images/amd.svg',
            opening: 'Senior Specialist'
        },
        // Apple
        {
            title: 'AppleCare Senior Technical Advisor',
            dept: 'Apple',
            desc: 'Delight Apple customers with empathetic, world-class resolutions across macOS, iOS, and hardware.',
            quota: 30,
            img: '/uploads/account-images/apple.svg',
            opening: 'Tier 2 Technical Advisor'
        },
        {
            title: 'iOS Ecosystem Quality Specialist',
            dept: 'Apple',
            desc: 'Ensure compliance, security, and exceptional satisfaction for digital services and App Store inquiries.',
            quota: 15,
            img: '/uploads/account-images/apple.svg',
            opening: 'Specialist - Quality'
        },
        // Amazon
        {
            title: 'AWS Cloud Technical Support Engineer',
            dept: 'Amazon',
            desc: 'Collaborate with dev teams across the globe to solve AWS computing, storage, and networking cases.',
            quota: 20,
            img: '/uploads/account-images/amazon.svg',
            opening: 'Cloud Support Engineer'
        },
        {
            title: 'Prime Logistics Operations Lead',
            dept: 'Amazon',
            desc: 'Coordinate regional fulfillment workflows and escalate logistics logistics disruptions in real-time.',
            quota: 25,
            img: '/uploads/account-images/amazon.svg',
            opening: 'Team Lead - Logistics'
        },
        // Google
        {
            title: 'GCP Enterprise Solutions Associate',
            dept: 'Google',
            desc: 'Empower businesses building on Google Cloud Platform with live incident diagnostics and tooling support.',
            quota: 16,
            img: '/uploads/account-images/google.svg',
            opening: 'Cloud Associate'
        },
        {
            title: 'Pixel Hardware Support Specialist',
            dept: 'Google',
            desc: 'Support premium consumer device users with Pixel setup, Tensor camera diagnostics, and warranties.',
            quota: 22,
            img: '/uploads/account-images/google.svg',
            opening: 'Agent - Hardware Support'
        }
    ];

    const positionMap = {};
    for (const p of demoPositions) {
        const posId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO positions (
                id, title, department, description, status, created_at,
                hiring_quota, current_hired, employment_type, location,
                work_arrangement, image_url, opening_name
            ) VALUES ($1, $2, $3, $4, 'OPEN', NOW(), $5, 0, 'Full-time', 'Cebu City', 'Hybrid', $6, $7)`,
            [posId, p.title, p.dept, p.desc, p.quota, p.img, p.opening]
        );
        positionMap[`${p.dept} - ${p.title}`] = { id: posId, title: p.title, dept: p.dept };
    }
    console.log(`[Seed] Seeded ${demoPositions.length} active open positions.`);

    // 5. Upsert Demo Support Users / Logins
    console.log('[Seed] Seeding Demo Role Logins...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const allDeptsStr = allDepts.map(d => d.name).join(',');

    const demoUsers = [
        {
            id: '11111111-1111-4111-a111-111111111111',
            email: 'admin@cp-360.com',
            full_name: 'Alexander Vance',
            role: 'admin',
            department: allDeptsStr,
            phone: '+63 (917) 555-0101'
        },
        {
            id: '22222222-2222-4222-a222-222222222222',
            email: 'recruiter@cp-360.com',
            full_name: 'Elena Rostova',
            role: 'recruiter',
            department: allDeptsStr,
            phone: '+63 (917) 555-0202'
        },
        {
            id: '33333333-3333-4333-a333-333333333333',
            email: 'ops@cp-360.com',
            full_name: 'Marcus Thorne',
            role: 'ops_validator',
            department: allDeptsStr,
            phone: '+63 (917) 555-0303'
        },
        {
            id: '44444444-4444-4444-a444-444444444444',
            email: 'interviewer@cp-360.com',
            full_name: 'Sofia Chen',
            role: 'recruiter_interviewer',
            department: allDeptsStr,
            phone: '+63 (917) 555-0404'
        }
    ];

    for (const u of demoUsers) {
        await pool.query(
            `INSERT INTO users (id, email, password_hash, password_plain, full_name, role, department, phone, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, 'password123', $4, $5, $6, $7, true, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE 
             SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, password_plain = 'password123',
                 full_name = EXCLUDED.full_name, role = EXCLUDED.role, department = EXCLUDED.department,
                 phone = EXCLUDED.phone, is_active = true, updated_at = NOW()`,
            [u.id, u.email, passwordHash, u.full_name, u.role, u.department, u.phone]
        );
    }
    console.log('[Seed] Demo users successfully configured.');

    // 6. Comprehensive Showcase Candidates Dataset (~50 applicants)
    console.log('[Seed] Seeding Realistic Demo Applicants across Pipeline...');

    const candidateTemplates = [
        // APPLIED (6)
        { name: 'Liam Christian Bautista', status: 'APPLIED', dept: 'Microsoft', pos: 'Azure Cloud Solutions Specialist', wpm: null, acc: null, score: null },
        { name: 'Chloe Anne Mendoza', status: 'APPLIED', dept: 'NVIDIA', pos: 'GeForce Premium Customer Advocate', wpm: null, acc: null, score: null },
        { name: 'Gabriel Miguel Santos', status: 'APPLIED', dept: 'AMD', pos: 'Radeon Systems Technical Associate', wpm: null, acc: null, score: null },
        { name: 'Sophia Louise Fernandez', status: 'APPLIED', dept: 'Apple', pos: 'AppleCare Senior Technical Advisor', wpm: null, acc: null, score: null },
        { name: 'Ethan James Villanueva', status: 'APPLIED', dept: 'Amazon', pos: 'AWS Cloud Technical Support Engineer', wpm: null, acc: null, score: null },
        { name: 'Samantha Nicole Reyes', status: 'APPLIED', dept: 'Google', pos: 'Pixel Hardware Support Specialist', wpm: null, acc: null, score: null },

        // TYPING_TEST (5)
        { name: 'Daniel Francis Aquino', status: 'TYPING_TEST', dept: 'Microsoft', pos: 'Xbox Enterprise Support Representative', wpm: 52, acc: 98, score: null },
        { name: 'Isabella Grace Cruz', status: 'TYPING_TEST', dept: 'NVIDIA', pos: 'AI Operations & CUDA Support Engineer', wpm: 64, acc: 99, score: null },
        { name: 'Noah Anthony Del Rosario', status: 'TYPING_TEST', dept: 'AMD', pos: 'EPYC Server Infrastructure Specialist', wpm: 48, acc: 95, score: null },
        { name: 'Mia Cassandra Morales', status: 'TYPING_TEST', dept: 'Apple', pos: 'iOS Ecosystem Quality Specialist', wpm: 58, acc: 97, score: null },
        { name: 'Lucas Benjamin Ocampo', status: 'TYPING_TEST', dept: 'Amazon', pos: 'Prime Logistics Operations Lead', wpm: 45, acc: 94, score: null },

        // INITIAL_INTERVIEW (6)
        { name: 'Hannah Marie Ramos', status: 'INITIAL_INTERVIEW', dept: 'Google', pos: 'GCP Enterprise Solutions Associate', wpm: 60, acc: 98, score: 86 },
        { name: 'Julian Paolo Navarro', status: 'INITIAL_INTERVIEW', dept: 'Microsoft', pos: 'Azure Cloud Solutions Specialist', wpm: 55, acc: 96, score: 84 },
        { name: 'Camille Denise Garcia', status: 'INITIAL_INTERVIEW', dept: 'NVIDIA', pos: 'GeForce Premium Customer Advocate', wpm: 72, acc: 99, score: 92 },
        { name: 'Adrian Kyle Castillo', status: 'INITIAL_INTERVIEW', dept: 'AMD', pos: 'Radeon Systems Technical Associate', wpm: 49, acc: 95, score: 80 },
        { name: 'Alyssa Beatrice Lim', status: 'INITIAL_INTERVIEW', dept: 'Apple', pos: 'AppleCare Senior Technical Advisor', wpm: 66, acc: 98, score: 90 },
        { name: 'Matthew Dominic Tan', status: 'INITIAL_INTERVIEW', dept: 'Amazon', pos: 'AWS Cloud Technical Support Engineer', wpm: 58, acc: 97, score: 88 },

        // ASSESSMENT (5)
        { name: 'Andrea Joy Valencia', status: 'ASSESSMENT', dept: 'Google', pos: 'Pixel Hardware Support Specialist', wpm: 61, acc: 97, score: 91 },
        { name: 'Joshua Ryan Alcantara', status: 'ASSESSMENT', dept: 'Microsoft', pos: 'Xbox Enterprise Support Representative', wpm: 54, acc: 96, score: 85 },
        { name: 'Patricia Camille Flores', status: 'ASSESSMENT', dept: 'NVIDIA', pos: 'AI Operations & CUDA Support Engineer', wpm: 68, acc: 99, score: 94 },
        { name: 'Christian Dave Tolentino', status: 'ASSESSMENT', dept: 'AMD', pos: 'EPYC Server Infrastructure Specialist', wpm: 50, acc: 95, score: 82 },
        { name: 'Erika Mae Salazar', status: 'ASSESSMENT', dept: 'Apple', pos: 'iOS Ecosystem Quality Specialist', wpm: 59, acc: 98, score: 89 },

        // FINAL_INTERVIEW (6)
        { name: 'Sebastian Luke Rivera', status: 'FINAL_INTERVIEW', dept: 'Amazon', pos: 'Prime Logistics Operations Lead', wpm: 53, acc: 96, score: 88 },
        { name: 'Ysabelle Therese Corpuz', status: 'FINAL_INTERVIEW', dept: 'Google', pos: 'GCP Enterprise Solutions Associate', wpm: 65, acc: 99, score: 95 },
        { name: 'Vincent Edward Mercado', status: 'FINAL_INTERVIEW', dept: 'Microsoft', pos: 'Azure Cloud Solutions Specialist', wpm: 62, acc: 98, score: 90 },
        { name: 'Clarisse Angelique De Leon', status: 'FINAL_INTERVIEW', dept: 'NVIDIA', pos: 'GeForce Premium Customer Advocate', wpm: 75, acc: 100, score: 96 },
        { name: 'Patrick Sean Gutierrez', status: 'FINAL_INTERVIEW', dept: 'AMD', pos: 'Radeon Systems Technical Associate', wpm: 57, acc: 97, score: 87 },
        { name: 'Bea Katrina Hernandez', status: 'FINAL_INTERVIEW', dept: 'Apple', pos: 'AppleCare Senior Technical Advisor', wpm: 70, acc: 99, score: 94 },

        // FOR_JOB_OFFER (5)
        { name: 'Mark Andrei Espiritu', status: 'FOR_JOB_OFFER', dept: 'Amazon', pos: 'AWS Cloud Technical Support Engineer', wpm: 63, acc: 98, score: 92 },
        { name: 'Rochelle Ann Pineda', status: 'FOR_JOB_OFFER', dept: 'Google', pos: 'Pixel Hardware Support Specialist', wpm: 58, acc: 97, score: 89 },
        { name: 'Jerome Francis Domingo', status: 'FOR_JOB_OFFER', dept: 'Microsoft', pos: 'Xbox Enterprise Support Representative', wpm: 56, acc: 96, score: 88 },
        { name: 'Katrina Isabel Villar', status: 'FOR_JOB_OFFER', dept: 'NVIDIA', pos: 'AI Operations & CUDA Support Engineer', wpm: 78, acc: 100, score: 97 },
        { name: 'Justin Carl Manalo', status: 'FOR_JOB_OFFER', dept: 'AMD', pos: 'EPYC Server Infrastructure Specialist', wpm: 52, acc: 95, score: 86 },

        // SENT_JO_AND_BGC (5)
        { name: 'Nicole Angela Soriano', status: 'SENT_JO_AND_BGC', dept: 'Apple', pos: 'iOS Ecosystem Quality Specialist', wpm: 67, acc: 99, score: 93 },
        { name: 'Raphael David Roxas', status: 'SENT_JO_AND_BGC', dept: 'Amazon', pos: 'Prime Logistics Operations Lead', wpm: 55, acc: 97, score: 87 },
        { name: 'Dianne Rose Agustin', status: 'SENT_JO_AND_BGC', dept: 'Google', pos: 'GCP Enterprise Solutions Associate', wpm: 71, acc: 99, score: 96 },
        { name: 'Kevin Alexander Pascual', status: 'SENT_JO_AND_BGC', dept: 'Microsoft', pos: 'Azure Cloud Solutions Specialist', wpm: 60, acc: 98, score: 91 },
        { name: 'Monica Louise Santiago', status: 'SENT_JO_AND_BGC', dept: 'NVIDIA', pos: 'GeForce Premium Customer Advocate', wpm: 74, acc: 100, score: 95 },

        // HIRED (6) - complete official endorsement / masterlist metrics
        { name: 'Carlos Miguel Beltran', status: 'HIRED', dept: 'Microsoft', pos: 'Azure Cloud Solutions Specialist', wpm: 68, acc: 99, score: 95, eid: 'CP-9011', wave: 'Wave 42', salary: '42,000' },
        { name: 'Stephanie Grace Lorenzo', status: 'HIRED', dept: 'NVIDIA', pos: 'AI Operations & CUDA Support Engineer', wpm: 82, acc: 100, score: 98, eid: 'CP-9012', wave: 'Wave 42', salary: '58,000' },
        { name: 'John Paul Magbanua', status: 'HIRED', dept: 'AMD', pos: 'EPYC Server Infrastructure Specialist', wpm: 65, acc: 98, score: 93, eid: 'CP-9013', wave: 'Wave 43', salary: '48,000' },
        { name: 'Maricar Joyce Buenaflor', status: 'HIRED', dept: 'Apple', pos: 'AppleCare Senior Technical Advisor', wpm: 76, acc: 99, score: 96, eid: 'CP-9014', wave: 'Wave 43', salary: '38,000' },
        { name: 'Francis Gerald Dizon', status: 'HIRED', dept: 'Amazon', pos: 'AWS Cloud Technical Support Engineer', wpm: 70, acc: 98, score: 94, eid: 'CP-9015', wave: 'Wave 44', salary: '46,000' },
        { name: 'Janelle Christine Co', status: 'HIRED', dept: 'Google', pos: 'GCP Enterprise Solutions Associate', wpm: 79, acc: 100, score: 97, eid: 'CP-9016', wave: 'Wave 44', salary: '52,000' },

        // WAITLISTED (3)
        { name: 'Angelo Miguel Perez', status: 'WAITLISTED', dept: 'Microsoft', pos: 'Xbox Enterprise Support Representative', wpm: 51, acc: 96, score: 83 },
        { name: 'Bernadette Claire Yao', status: 'WAITLISTED', dept: 'Apple', pos: 'iOS Ecosystem Quality Specialist', wpm: 62, acc: 98, score: 88 },
        { name: 'Timothy John Sy', status: 'WAITLISTED', dept: 'Amazon', pos: 'Prime Logistics Operations Lead', wpm: 53, acc: 95, score: 84 },

        // REJECTED (3)
        { name: 'Geoffrey Vance Oliver', status: 'REJECTED', dept: 'NVIDIA', pos: 'AI Operations & CUDA Support Engineer', wpm: 32, acc: 88, score: 62, reason: 'Failed typing benchmark and technical screening' },
        { name: 'Kimberly Joy Estacio', status: 'REJECTED', dept: 'AMD', pos: 'Radeon Systems Technical Associate', wpm: 35, acc: 89, score: 65, reason: 'Unresponsive for final schedule confirmation' },
        { name: 'Raymond Carl Villanueva', status: 'REJECTED', dept: 'Google', pos: 'Pixel Hardware Support Specialist', wpm: 38, acc: 91, score: 68, reason: 'Did not meet technical customer support criteria' }
    ];

    let count = 0;
    const now = new Date();

    for (let i = 0; i < candidateTemplates.length; i++) {
        const c = candidateTemplates[i];
        const appId = crypto.randomUUID();
        const posInfo = positionMap[`${c.dept} - ${c.pos}`] || Object.values(positionMap)[0];
        const emailSafe = c.name.toLowerCase().replace(/\s+/g, '.') + '@demo.applicant.ph';
        const phone = `+63 (9${Math.floor(10 + Math.random() * 89)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`;
        const appliedDate = new Date(now.getTime() - (candidateTemplates.length - i) * 3600 * 1000 * 18);

        const nameParts = c.name.split(' ');
        const firstName = nameParts.slice(0, -1).join(' ');
        const lastName = nameParts[nameParts.length - 1];

        const pisData = {
            personal: {
                firstName,
                lastName,
                middleName: 'M.',
                email: emailSafe,
                phone,
                birthDate: '1998-05-14',
                gender: i % 2 === 0 ? 'Male' : 'Female',
                civilStatus: 'Single',
                nationality: 'Filipino',
                currentAddress: 'Cebu City, Central Visayas, Philippines',
                permanentAddress: 'Cebu City, Central Visayas, Philippines'
            },
            education: {
                highestEducation: 'College Graduate / Level',
                schoolName: 'University of San Carlos',
                degree: 'BS Information Technology',
                isGraduated: true,
                graduationYear: '2021'
            },
            government: {
                sss: `34-${Math.floor(1000000 + Math.random() * 8999999)}-2`,
                tin: `412-${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}-000`,
                philhealth: `12-${Math.floor(100000000 + Math.random() * 899999999)}-1`,
                pagibig: `1210-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`
            },
            emergency: {
                name: `Maria ${lastName}`,
                phone: `+63 (918) 441-${Math.floor(1000 + Math.random() * 8999)}`,
                relationship: 'Mother'
            }
        };

        const cp360Email = c.status === 'HIRED'
            ? `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase()}@cp-360.com`
            : null;

        await pool.query(
            `INSERT INTO applications (
                id, applicant_name, applicant_email, phone, first_name, last_name,
                position_id, position_title, department, current_status,
                typing_test_wpm, typing_test_accuracy, typing_test_completed_at,
                assessment_score, applied_at, created_at, updated_at,
                metadata, highest_education, school_name, degree, is_graduated,
                assigned_recruiter_name, assigned_ops_validator_name,
                master_first_name, master_last_name, master_cp36_email,
                master_eid, master_wave, master_basic_salary, master_peme_result,
                rejection_reason, hiring_source
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13,
                $14, $15, $16, NOW(),
                $17, $18, $19, $20, true,
                'Elena Rostova', 'Marcus Thorne',
                $21, $22, $23,
                $24, $25, $26, $27,
                $28, 'LinkedIn'
            )`,
            [
                appId, c.name, emailSafe, phone, firstName, lastName,
                posInfo.id, posInfo.title, posInfo.dept, c.status,
                c.wpm ? String(c.wpm) : null, c.acc ? String(c.acc) : null, c.wpm ? appliedDate : null,
                c.score ? String(c.score) : null, appliedDate, appliedDate,
                JSON.stringify(pisData), 'College Graduate / Level', 'University of San Carlos', 'BS Information Technology',
                firstName, lastName, cp360Email,
                c.eid || null, c.wave || null, c.salary || null, c.status === 'HIRED' ? 'CLASS A - FIT TO WORK' : null,
                c.reason || null
            ]
        );

        // Audit Trail log in status_history
        await pool.query(
            `INSERT INTO status_history (id, application_id, from_status, to_status, changed_by_name, change_reason, changed_at)
             VALUES ($1, $2, 'APPLIED', $3, 'Elena Rostova', 'Candidate advanced through recruitment milestone', NOW())`,
            [crypto.randomUUID(), appId, c.status]
        );

        // Put a few candidates in live active Queue
        if (c.status === 'INITIAL_INTERVIEW' && i % 2 === 0) {
            await pool.query(
                `INSERT INTO queue (
                    id, application_id, applicant_name, queue_number, queue_type, status,
                    interviewer_name, assigned_room_name, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, 'INITIAL_INTERVIEW', 'WAITING', 'Sofia Chen', 'Interview Room Alpha', NOW(), NOW())`,
                [crypto.randomUUID(), appId, c.name, 100 + i]
            );
        } else if (c.status === 'FINAL_INTERVIEW' && i % 2 === 0) {
            await pool.query(
                `INSERT INTO queue (
                    id, application_id, applicant_name, queue_number, queue_type, status,
                    interviewer_name, assigned_room_name, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, 'FINAL_INTERVIEW', 'CALLING', 'Marcus Thorne', 'Executive Suite 1', NOW(), NOW())`,
                [crypto.randomUUID(), appId, c.name, 200 + i]
            );
        }

        count++;
    }
    console.log(`[Seed] Successfully seeded ${count} showcase applicants across all hiring stages.`);

    console.log('[Seed] Seeding completed flawlessly!');
}

seed()
    .catch(err => {
        console.error('[Seed Error]:', err);
        process.exit(1);
    })
    .finally(() => pool.end());
