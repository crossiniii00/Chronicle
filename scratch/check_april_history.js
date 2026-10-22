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
            "SELECT id, applicant_name, department, metadata FROM applications WHERE applicant_name ILIKE '%April%Reglamos%';"
        );
        const a = res.rows[0];
        console.log('--- APRIL ROSE REGLAMOS ACCOUNT & ENDORSEMENT DATA ---');
        console.log('department:', a.department);
        console.log('endorsement_account (in meta):', a.metadata?.endorsement_account);
        console.log('initial_account_assignment (in meta):', a.metadata?.initial_account_assignment);
        console.log('final_account (in meta):', a.metadata?.final_account);
        console.log('custom_lob (in meta):', a.metadata?.custom_lob);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
