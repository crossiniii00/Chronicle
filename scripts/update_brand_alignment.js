import { query } from '../server/src/db.js';

async function updateBranding() {
    try {
        console.log('[BrandUpdate] Aligning legacy records to top-tier tech brands...');

        // 1. Update any legacy positions with old branding
        await query(`
            UPDATE positions 
            SET department = 'NVIDIA', title = 'CUDA Performance Architect' 
            WHERE id = '488957cb-05bb-48b0-9bd9-485084d50f0f'
        `);
        await query(`
            UPDATE positions 
            SET department = 'Amazon', title = 'Prime Solutions Technical Lead' 
            WHERE id = '9d5ef481-00a5-444f-989e-8a6ab081e9ed'
        `);
        await query(`
            UPDATE positions 
            SET department = 'Microsoft', title = 'Azure Systems Reliability Engineer' 
            WHERE id = 'c34c8178-f37f-44d4-a4ef-7d8f62977734'
        `);

        // 2. Update users department strings
        const techAccounts = 'Microsoft,NVIDIA,AMD,Apple,Amazon,Google,Information Technology,Talent Acquisition & HR,Workforce Management,Quality Assurance,Training & Development,Finance & Accounting';
        const resUsers = await query(`
            UPDATE users 
            SET department = $1 
            WHERE department ILIKE '%DoorDash%' OR department ILIKE '%Abbott%' OR department ILIKE '%Auto Approve%'
        `, [techAccounts]);
        console.log(`[BrandUpdate] Updated ${resUsers.rowCount} user department records.`);

        // 3. Clear ghost occupancy from rooms that reference non-existent applications
        const validApps = await query('SELECT id, applicant_name FROM applications WHERE current_status = $1', ['INITIAL_INTERVIEW']);
        const validCandidate = validApps.rows[0];

        if (validCandidate) {
            await query(`
                UPDATE interview_rooms 
                SET current_application_id = $1, current_applicant_name = $2, occupied_since = NOW()
                WHERE room_name = 'MABOLO' OR room_number = '3'
            `, [validCandidate.id, validCandidate.applicant_name]);
            console.log(`[BrandUpdate] Assigned active candidate ${validCandidate.applicant_name} to Room 3 (MABOLO).`);
        }

        const cand2 = validApps.rows[1];
        if (cand2) {
            await query(`
                UPDATE interview_rooms 
                SET current_application_id = $1, current_applicant_name = $2, occupied_since = NOW()
                WHERE room_number = 'Online Room 1'
            `, [cand2.id, cand2.applicant_name]);
            console.log(`[BrandUpdate] Assigned active candidate ${cand2.applicant_name} to Online Room 1.`);
        }

        console.log('[BrandUpdate] Finished cleanly.');
    } catch (err) {
        console.error('[BrandUpdate Error]:', err);
    } finally {
        process.exit(0);
    }
}

updateBranding();
