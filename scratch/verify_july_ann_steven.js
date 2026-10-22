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
            "SELECT id, applicant_name, department, current_status, assigned_ops_validator_id, assigned_ops_validator_name, endorsement_meeting_date, metadata FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );
        console.log('--- JULY ANN DB RECORD ---');
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
