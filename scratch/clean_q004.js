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
            "UPDATE queue SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE queue_number = 4 AND status = 'CALLED' RETURNING *;"
        );
        console.log('Updated stale Q004 queue rows:', res.rows.length);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
