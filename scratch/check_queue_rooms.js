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
        const queueRes = await pool.query(
            "SELECT * FROM queue WHERE status = 'CALLED' OR queue_number = 4;"
        );
        console.log('--- QUEUE ENTRIES (CALLED or Q004) ---');
        console.log(JSON.stringify(queueRes.rows, null, 2));

        const roomsRes = await pool.query(
            "SELECT * FROM rooms;"
        );
        console.log('--- ROOMS ---');
        console.log(JSON.stringify(roomsRes.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
