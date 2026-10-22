import { query } from '../server/src/db.js';

async function inspect() {
    try {
        const accountsRes = await query(`
            SELECT DISTINCT department, COUNT(*) as count 
            FROM applications 
            GROUP BY department 
            ORDER BY count DESC
        `);
        console.log('--- APPLICATIONS BY DEPARTMENT ---');
        console.table(accountsRes.rows);

        const roomsRes = await query(`
            SELECT id, room_number, room_name, room_type, image_url 
            FROM interview_rooms 
            ORDER BY room_number
        `);
        console.log('--- INTERVIEW ROOMS ---');
        console.table(roomsRes.rows);

        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('--- PUBLIC TABLES ---');
        console.log(tables.rows.map(t => t.table_name).join(', '));

    } catch (err) {
        console.error('Error during inspection:', err);
    } finally {
        process.exit(0);
    }
}

inspect();
