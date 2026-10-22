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
        const oldAppId = '2fc1705f-b8a2-42d6-aec7-97ccfba2595b';
        const newAppId = '61d38d76-624e-4326-895e-187729599565';
        
        // Fetch old app
        const result = await pool.query(`SELECT interview_responses, interview_grading, interview_notes, final_interview_notes, metadata FROM applications WHERE id = $1`, [oldAppId]);
        
        const oldApp = result.rows[0];
        
        if (!oldApp) {
            console.log("Old app not found");
            return;
        }

        console.log("Found old data:", JSON.stringify(oldApp, null, 2));
        
        // Update new app
        await pool.query(`
            UPDATE applications 
            SET interview_responses = $1, 
                interview_grading = $2, 
                interview_notes = $3, 
                final_interview_notes = $4
            WHERE id = $5
        `, [
            oldApp.interview_responses, 
            oldApp.interview_grading, 
            oldApp.interview_notes, 
            oldApp.final_interview_notes, 
            newAppId
        ]);
        
        // We also need to copy metadata.ratings and checklist if any
        // Let's fetch new app's metadata first
        const newAppRes = await pool.query(`SELECT metadata FROM applications WHERE id = $1`, [newAppId]);
        let newAppMeta = newAppRes.rows[0].metadata || {};
        
        if (typeof newAppMeta === 'string') {
            try { newAppMeta = JSON.parse(newAppMeta); } catch(e) { newAppMeta = {}; }
        }
        
        let oldAppMeta = oldApp.metadata || {};
        if (typeof oldAppMeta === 'string') {
            try { oldAppMeta = JSON.parse(oldAppMeta); } catch(e) { oldAppMeta = {}; }
        }
        
        if (oldAppMeta.ratings) newAppMeta.ratings = oldAppMeta.ratings;
        if (oldAppMeta.checklist) newAppMeta.checklist = oldAppMeta.checklist;
        
        await pool.query(`UPDATE applications SET metadata = $1 WHERE id = $2`, [newAppMeta, newAppId]);
        
        console.log("Successfully copied interview notes from old application to new application!");
        
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
