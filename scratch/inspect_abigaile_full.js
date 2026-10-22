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
            "SELECT * FROM applications WHERE id = '656f7f31-eb7a-4156-a5f8-6ad582788e35';"
        );
        console.log('--- ABIGAILE ITURALDE RECORD ---');
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
