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
        const franchezcaId = 'ae909255-ac6d-424f-896c-7b1f23ef658e';
        const freddieId = 'e1db0939-5499-4a8d-b8c7-fc9782c9e171';
        const origName = 'Franchezca Anne Marie Gutierrez, Freddie Porillo Gutierrez';
        const origEmail = 'franchezca.gutierrez@cp-360.com';
        const origDept = 'AUTO APPROVE DIA, DoorDash, Abbott';

        const getRes = await pool.query(
            "SELECT * FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );

        if (getRes.rows.length === 0) return;
        const app = getRes.rows[0];

        // Revert metadata and fields
        const revertedMetadata = {
            ...(app.metadata || {}),
            department: origDept,
            ops_validator_email: origEmail,
            assigned_ops_validator_name: origName,
            assigned_ops_validator_id: franchezcaId,
            assigned_ops_validator_ids: [franchezcaId, freddieId],
            initial_account_assignment: origDept
        };

        await pool.query(
            `UPDATE applications 
             SET department = $1, 
                 assigned_ops_validator_id = $2, 
                 assigned_ops_validator_name = $3, 
                 metadata = $4, 
                 updated_at = NOW() 
             WHERE id = $5;`,
            [origDept, franchezcaId, origName, revertedMetadata, app.id]
        );

        console.log('--- REVERTED JULY ANN RECORD TO ORIGINAL RECRUITER STATE ---');
        console.log('Department:', origDept);
        console.log('Assigned Ops Val:', origName);

        console.log('\n--- EVALUATION & INTERVIEW HISTORY INSPECTION ---');
        console.log('current_status:', app.current_status);
        console.log('ops_validator_status:', app.metadata?.ops_validator_status);
        console.log('final_specific_status:', app.metadata?.final_specific_status || app.metadata?.['Final Specific Status']);
        console.log('failed_accounts:', app.metadata?.failed_accounts);
        console.log('interview_grading:', app.interview_grading);
        console.log('notes / remarks:', app.notes || app.metadata?.question_notes || app.metadata?.ratings);

        // Check if there are evaluation history records or queue records
        const queueRes = await pool.query("SELECT * FROM queue WHERE application_id = $1;", [app.id]);
        console.log('\n--- QUEUE RECORDS FOR JULY ANN ---');
        console.log(JSON.stringify(queueRes.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
