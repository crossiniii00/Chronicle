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
            "SELECT id, applicant_name, assigned_ops_validator_id, assigned_ops_validator_name, metadata FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );
        const app = res.rows[0];
        console.log('Applicant Name:', app.applicant_name);
        console.log('assigned_ops_validator_id:', app.assigned_ops_validator_id);
        console.log('assigned_ops_validator_name:', app.assigned_ops_validator_name);
        console.log('metadata.assigned_ops_validator_name:', app.metadata?.assigned_ops_validator_name);
        console.log('metadata.assigned_ops_validator_ids:', app.metadata?.assigned_ops_validator_ids);
        console.log('metadata.ops_validator_email:', app.metadata?.ops_validator_email);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
