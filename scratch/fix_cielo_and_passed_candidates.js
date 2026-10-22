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
        console.log('--- 1. RESTORE CIELO RAMIREZ ---');
        const cieloRes = await pool.query(
            "SELECT id, applicant_name, metadata FROM applications WHERE applicant_name ILIKE '%Cielo%';"
        );

        for (const cielo of cieloRes.rows) {
            const updatedMeta = {
                ...(cielo.metadata || {}),
                ops_validator_status: 'Pending',
                final_specific_status: 'OV - Pending',
                active_interview_type: 'FINAL'
            };
            await pool.query(
                `UPDATE applications 
                 SET current_status = 'FINAL_INTERVIEW_SCHEDULED', 
                     assigned_ops_validator_id = '3fa9942d-f039-4232-a88e-59010736693d',
                     assigned_ops_validator_name = 'Johann Bordaño Dela Cerna',
                     metadata = $1, 
                     updated_at = NOW() 
                 WHERE id = $2;`,
                [updatedMeta, cielo.id]
            );
            console.log(`Restored Cielo Ramirez (${cielo.id}) to FINAL_INTERVIEW_SCHEDULED with Johann Bordaño Dela Cerna.`);
        }

        console.log('\n--- 2. RESTORE PASSED CANDIDATES BACK TO FOR JOB OFFER / RECORDS ---');
        const passedCandidatesToRestore = [
            'Jann Audrey Navasquez',
            'Grazel Niña Jabagat',
            'Sarahjen Millorea',
            'Daryl Singson',
            'Nice Cortuna',
            'Wilfredo Palad Jr.',
            'Kristine Joy Tugao',
            'Julius Cesar Dael'
        ];

        for (const name of passedCandidatesToRestore) {
            const res = await pool.query(
                "SELECT id, applicant_name, metadata FROM applications WHERE applicant_name ILIKE $1;",
                [`%${name}%`]
            );
            for (const app of res.rows) {
                const updatedMeta = {
                    ...(app.metadata || {}),
                    ops_validator_status: 'PASSED',
                    final_specific_status: 'OV - Passed',
                    active_interview_type: null
                };
                await pool.query(
                    `UPDATE applications 
                     SET current_status = 'For Job Offer', 
                         final_verdict = 'PASSED', 
                         metadata = $1, 
                         updated_at = NOW() 
                     WHERE id = $2;`,
                    [updatedMeta, app.id]
                );
                console.log(`Restored ${app.applicant_name} (${app.id}) to For Job Offer / Passed.`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
