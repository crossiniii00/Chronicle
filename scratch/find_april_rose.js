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
        console.log('--- SEARCHING FOR APRIL ROSE REGLAMOS IN DB ---');
        const res = await pool.query(
            "SELECT * FROM applications WHERE applicant_name ILIKE '%April%' OR applicant_name ILIKE '%Reglamos%';"
        );
        
        console.log(`Found ${res.rows.length} records:`);
        console.log(JSON.stringify(res.rows, null, 2));

        if (res.rows.length === 0) {
            console.log('\n--- SEARCHING ALL TABLES FOR REGLAMOS ---');
            const tablesRes = await pool.query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
            );
            console.log('Tables:', tablesRes.rows.map(r => r.table_name));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
