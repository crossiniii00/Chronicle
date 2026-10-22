import { query } from '../server/src/db.js';

async function removeLegacyAccounts() {
    try {
        console.log('[Purge] Removing legacy accounts (DoorDash, etc.) from departments...');

        const allowedAccounts = ['NVIDIA', 'AMD', 'Microsoft', 'Apple', 'Amazon', 'Google'];

        // 1. Reassign or remove positions tied to legacy departments
        await query(`
            UPDATE positions 
            SET department = 'NVIDIA' 
            WHERE department IN (
                SELECT name FROM departments 
                WHERE type = 'ACCOUNTS' AND name NOT IN ('NVIDIA', 'AMD', 'Microsoft', 'Apple', 'Amazon', 'Google')
            )
        `);

        // 2. Clear user departments that contain legacy account names
        const standardTechDepts = 'Microsoft,NVIDIA,AMD,Apple,Amazon,Google,Information Technology,Talent Acquisition & HR,Workforce Management,Quality Assurance,Training & Development,Finance & Accounting';
        await query(`
            UPDATE users 
            SET department = $1 
            WHERE department ILIKE '%DoorDash%' 
               OR department ILIKE '%Keller Postman%' 
               OR department ILIKE '%Abbott%' 
               OR department ILIKE '%Auto Approve%' 
               OR department ILIKE '%Enercare%'
               OR department ILIKE '%Gridmatic%'
               OR department ILIKE '%The Savings Group%'
               OR department ILIKE '%Ambience Air%'
        `, [standardTechDepts]);

        // 3. Delete non-tech accounts from departments table
        const deleteRes = await query(`
            DELETE FROM departments 
            WHERE type = 'ACCOUNTS' 
              AND name NOT IN ('NVIDIA', 'AMD', 'Microsoft', 'Apple', 'Amazon', 'Google')
        `);
        console.log(`[Purge] Successfully deleted ${deleteRes.rowCount} legacy accounts from departments table.`);

        // 4. Verify remaining accounts
        const remaining = await query(`
            SELECT id, name, type, account_image_url 
            FROM departments 
            WHERE type = 'ACCOUNTS' 
            ORDER BY name
        `);
        console.log('--- REMAINING ACCOUNTS IN REGISTRY ---');
        console.table(remaining.rows);

    } catch (err) {
        console.error('[Purge Error]:', err);
    } finally {
        process.exit(0);
    }
}

removeLegacyAccounts();
