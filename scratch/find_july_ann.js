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
            "SELECT id, applicant_name, department, current_status, recruiter_s_scheduling_status, endorsement_meeting_date, endorsement_meeting_end_date, assigned_ops_validator_name, metadata FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );
        console.log('July Ann applications count:', res.rows.length);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
