import pg from 'pg';
const { Pool } = pg;

async function testPassword(password) {
    const pool = new Pool({
        host: '127.0.0.1',
        port: 5432,
        database: 'recruitms',
        user: 'postgres',
        password: password,
        connectionTimeoutMillis: 2000,
    });
    try {
        const res = await pool.query('SELECT id, applicant_name FROM applications WHERE applicant_name ILIKE $1', ['%Jhon Rhey Estrada%']);
        console.log(`\nSUCCESS with password: "${password}"`);
        console.log('Applications:', res.rows);
        if (res.rows.length > 0) {
            for (const app of res.rows) {
                const tests = await pool.query('SELECT id, words_per_minute, accuracy_percent, completed_at FROM typing_test_results WHERE application_id = $1 ORDER BY completed_at DESC', [app.id]);
                console.log('\nTyping Tests for Application ID ' + app.id + ':');
                console.table(tests.rows);
                console.log('Total typing tests taken:', tests.rows.length);
            }
        }
        process.exit(0);
    } catch (e) {
        // console.error(`Failed with password: "${password}"`);
    } finally {
        await pool.end();
    }
}

async function main() {
    const passwords = ['11111', 'postgres', 'admin', 'root', '', 'password'];
    for (const pwd of passwords) {
        await testPassword(pwd);
    }
    console.log("None of the passwords worked.");
    process.exit(1);
}

main();
