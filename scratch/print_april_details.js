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
        const res = await pool.query(
            "SELECT id, applicant_name, current_status, department, final_verdict, master_column, hiring_source, created_at, updated_at, metadata FROM applications WHERE applicant_name ILIKE '%April%Reglamos%';"
        );
        console.log('--- APRIL ROSE REGLAMOS DETAILS ---');
        for (const app of res.rows) {
            console.log('ID:', app.id);
            console.log('Name:', app.applicant_name);
            console.log('Current Status:', app.current_status);
            console.log('Department:', app.department);
            console.log('Endorsement Account:', app.endorsement_account);
            console.log('Final Verdict:', app.final_verdict);
            console.log('Master Column:', app.master_column);
            console.log('Metadata:', JSON.stringify({
                ops_validator_status: app.metadata?.ops_validator_status,
                final_specific_status: app.metadata?.final_specific_status,
                failed_accounts: app.metadata?.failed_accounts,
                overall_status: app.metadata?.overall_status
            }, null, 2));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
