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
        console.log('--- CIELO RAMIREZ DB RECORD ---');
        const cieloRes = await pool.query(
            "SELECT id, applicant_name, department, current_status, final_verdict, assigned_ops_validator_name, metadata FROM applications WHERE applicant_name ILIKE '%Cielo%' OR applicant_name ILIKE '%Clelo%';"
        );
        console.log(JSON.stringify(cieloRes.rows, null, 2));

        console.log('\n--- PASSED CANDIDATES ON INTERVIEW DESK SCREENSHOT ---');
        const passedNames = ['Jann Audrey', 'Grazel', 'Sarahjen', 'Daryl Singson', 'Veejean'];
        for (const name of passedNames) {
            const res = await pool.query(
                "SELECT id, applicant_name, department, current_status, final_verdict, assigned_ops_validator_name, endorsement_meeting_date, metadata FROM applications WHERE applicant_name ILIKE $1;",
                [`%${name}%`]
            );
            console.log(`\nCandidate "${name}":`);
            if (res.rows.length > 0) {
                const app = res.rows[0];
                console.log('  current_status:', app.current_status);
                console.log('  final_verdict:', app.final_verdict);
                console.log('  ops_validator_status:', app.metadata?.ops_validator_status);
                console.log('  final_specific_status:', app.metadata?.final_specific_status);
                console.log('  endorsement_meeting_date:', app.endorsement_meeting_date);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
