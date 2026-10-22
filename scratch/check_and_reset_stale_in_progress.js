import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'chronicle',
    password: '12345',
    port: 5433,
});

async function main() {
    try {
        // Find applications stuck in INTERVIEW_IN_PROGRESS or metadata.ops_validator_status = IN_PROGRESS
        const appsRes = await pool.query(
            "SELECT id, applicant_name, current_status, department, metadata FROM applications WHERE current_status = 'INTERVIEW_IN_PROGRESS' OR metadata->>'ops_validator_status' ILIKE '%in_progress%' OR metadata->>'ops_validator_status' ILIKE '%in progress%';"
        );

        console.log(`\n--- CANDIDATES WITH IN_PROGRESS STATUS (${appsRes.rows.length}) ---`);
        for (const app of appsRes.rows) {
            console.log(`[Candidate] ${app.applicant_name} (ID: ${app.id})`);
            console.log(`  current_status: ${app.current_status}`);
            console.log(`  metadata.ops_validator_status: ${app.metadata?.ops_validator_status}`);
            console.log(`  metadata.final_specific_status: ${app.metadata?.final_specific_status}`);

            // Reset stale status back to pending/scheduled
            const isFinal = app.metadata?.active_interview_type === 'FINAL' || app.current_status === 'INTERVIEW_IN_PROGRESS';
            const newStatus = isFinal ? 'FINAL_INTERVIEW_SCHEDULED' : 'INITIAL_INTERVIEW';
            const newSpec = isFinal ? 'OV - Pending' : 'Initial Undefined';
            const updatedMeta = {
                ...(app.metadata || {}),
                ops_validator_status: 'Pending',
                final_specific_status: newSpec,
                active_interview_type: null
            };

            await pool.query(
                `UPDATE applications 
                 SET current_status = $1, 
                     metadata = $2, 
                     updated_at = NOW() 
                 WHERE id = $3;`,
                [newStatus, updatedMeta, app.id]
            );

            console.log(`  => RESET STALE STATUS for ${app.applicant_name} to ${newStatus} (${newSpec})`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
