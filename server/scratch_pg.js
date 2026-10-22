import pg from 'pg';

const pool = new pg.Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'chronicle',
    user: 'postgres',
    password: '12345'
});

async function run() {
    try {
        const result = await pool.query(`
            SELECT id, created_at, source, hiring_source, applicant_email, phone, first_name, last_name, applicant_name
            FROM applications 
            WHERE first_name ILIKE '%Jovanni%' AND last_name ILIKE '%Bastian%'
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
