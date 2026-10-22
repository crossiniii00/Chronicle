import { query } from '../server/src/db.js';

async function inspectDetailed() {
    try {
        const depts = await query('SELECT * FROM departments');
        console.log('--- DEPARTMENTS TABLE ---');
        console.table(depts.rows);

        const mhrtAccs = await query('SELECT * FROM mhrt_accounts LIMIT 15');
        console.log('--- MHRT ACCOUNTS TABLE ---');
        console.table(mhrtAccs.rows);

        const appDepts = await query(`
            SELECT department, COUNT(*) 
            FROM applications 
            GROUP BY department 
            ORDER BY count DESC
        `);
        console.log('--- APPLICATIONS BY DEPARTMENT ---');
        console.table(appDepts.rows);

        const rooms = await query(`
            SELECT id, room_number, room_name, room_type 
            FROM interview_rooms 
            ORDER BY room_number
        `);
        console.log('--- INTERVIEW ROOMS ---');
        console.table(rooms.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
inspectDetailed();
