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
        const names = [
            'Steven Oblena',
            'Johann Bordaño',
            'Claer Agan Rubio',
            'Rhea Marie',
            'Rocelyn',
            'Vizsyll',
            'Gizel'
        ];

        console.log('--- DB RECORD CHECK FOR TEAM PERFORMANCE NAMES ---');
        const res = await pool.query(
            "SELECT id, full_name, email, role, department FROM users WHERE full_name ILIKE '%Bacuh%' OR full_name ILIKE '%Berlandia%' OR full_name ILIKE '%Marie%' OR full_name ILIKE '%Cay%';"
        );
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
