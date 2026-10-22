import dotenv from 'dotenv';
dotenv.config();

import('./server/src/db.js').then(async (db) => {
    try {
        const res = await db.query('SELECT id, applicant_name FROM applications WHERE applicant_name ILIKE $1', ['%Jhon Rhey Estrada%']);
        console.log('Applications:', res.rows);
        
        if (res.rows.length > 0) {
            for (const app of res.rows) {
                const tests = await db.query('SELECT id, words_per_minute, accuracy_percent, completed_at FROM typing_test_results WHERE application_id = $1 ORDER BY completed_at DESC', [app.id]);
                console.log('\nTyping Tests for Application ID ' + app.id + ':');
                console.table(tests.rows);
                console.log('Total typing tests taken:', tests.rows.length);
            }
        } else {
            console.log('No applicant found with that name.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
});
