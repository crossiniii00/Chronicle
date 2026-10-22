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
            "SELECT * FROM applications WHERE applicant_name ILIKE '%April%Reglamos%';"
        );
        const a = res.rows[0];
        console.log('--- ALL STATUS FIELDS FOR APRIL ROSE REGLAMOS ---');
        console.log('master_status:', a.master_status);
        console.log('current_status:', a.current_status);
        console.log('final_verdict:', a.final_verdict);
        console.log('pis:', a.pis);
        console.log('metadata:', JSON.stringify(a.metadata, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
