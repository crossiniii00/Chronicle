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
        const res = await pool.query(
            "SELECT * FROM applications WHERE applicant_name ILIKE '%July Ann%';"
        );
        const app = res.rows[0];
        console.log('--- JULY ANN FULL RECORD ---');
        console.log('ID:', app.id);
        console.log('applicant_name:', app.applicant_name);
        console.log('department:', app.department);
        console.log('position_title:', app.position_title);
        console.log('current_status:', app.current_status);
        console.log('assigned_recruiter_name:', app.assigned_recruiter_name);
        console.log('assigned_ops_validator_name:', app.assigned_ops_validator_name);
        console.log('recruiter_s_scheduling_status:', app.recruiter_s_scheduling_status);
        console.log('endorsement_meeting_date:', app.endorsement_meeting_date);
        console.log('endorsement_meeting_end_date:', app.endorsement_meeting_end_date);
        
        console.log('\n--- METADATA SCHEDULING & ACCOUNTS ---');
        console.log('metadata.endorsement_meeting_body:', app.metadata?.endorsement_meeting_body);
        console.log('metadata.initial_account_assignment:', app.metadata?.initial_account_assignment);
        console.log('metadata.failed_accounts:', app.metadata?.failed_accounts);
        console.log('metadata.active_ops_validator_name:', app.metadata?.active_ops_validator_name);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
