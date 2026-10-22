import { query } from '../db.js';

async function fixIndexes() {
    console.log('Adding performance indices to live database...');
    try {
        await query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_app_type_created 
            ON queue(application_id, queue_type, created_at DESC)
        `);
        console.log('✅ Created idx_queue_app_type_created');

        await query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_hist_app_from_changed 
            ON status_history(application_id, from_status, changed_at DESC)
        `);
        console.log('✅ Created idx_status_hist_app_from_changed');

        console.log('All performance indices applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to add indices:', err);
        process.exit(1);
    }
}

fixIndexes();
