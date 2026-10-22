import { query } from '../db.js';

async function run() {
    try {
        console.log("Updating FINAL_INTERVIEW_SCHEDULED to 'OV - Scheduled'...");
        await query(`
            UPDATE applications
            SET 
                metadata = jsonb_set(
                    jsonb_set(
                        jsonb_set(metadata, '{final_specific_status}', '"OV - Scheduled"'),
                        '{"Final Specific Status"}', '"OV - Scheduled"'
                    ),
                    '{"Specific Status"}', '"OV - Scheduled"'
                ),
                master_remarks = 'OV - Scheduled'
            WHERE current_status = 'FINAL_INTERVIEW_SCHEDULED'
        `);
        console.log("Updated FINAL_INTERVIEW_SCHEDULED.");

        console.log("Updating FOR_SCHEDULING to 'OV - for Scheduling'...");
        await query(`
            UPDATE applications
            SET 
                metadata = jsonb_set(
                    jsonb_set(
                        jsonb_set(metadata, '{final_specific_status}', '"OV - for Scheduling"'),
                        '{"Final Specific Status"}', '"OV - for Scheduling"'
                    ),
                    '{"Specific Status"}', '"OV - for Scheduling"'
                ),
                master_remarks = 'OV - for Scheduling'
            WHERE current_status IN ('FOR_SCHEDULING', 'FINAL_INTERVIEW_SCHEDULING')
        `);
        console.log("Updated FOR_SCHEDULING.");
        
        console.log("Done");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
