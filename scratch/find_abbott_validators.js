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
        console.log('--- ALL USERS (OPS VALIDATORS / RECRUITERS) ---');
        const usersRes = await pool.query(
            "SELECT id, full_name, email, role, department FROM users WHERE role ILIKE '%ops%' OR role ILIKE '%val%' OR role ILIKE '%recruiter_s%' OR department ILIKE '%abbott%';"
        );
        console.log('Filtered users count:', usersRes.rows.length);
        console.log(JSON.stringify(usersRes.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
