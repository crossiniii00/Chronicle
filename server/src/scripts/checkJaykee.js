import { pool, query } from '../db.js';

async function run() {
    try {
        const { rows } = await query(`SELECT applicant_name, current_status, final_verdict, metadata FROM applications WHERE applicant_name ILIKE '%JAYKEE PEDROZA%'`);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
