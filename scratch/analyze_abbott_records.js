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
        // Query applications matching Abbott
        const res = await pool.query(
            `SELECT id, applicant_name, department, current_status, final_verdict, assigned_ops_validator_name, metadata 
             FROM applications 
             WHERE department ILIKE '%abbott%';`
        );

        console.log(`--- TOTAL ABBOTT CANDIDATES IN DB: ${res.rows.length} ---`);

        const concludedList = res.rows.filter(app => {
            const currentUpper = String(app.current_status || '').toUpperCase();
            const overallUpper = String(app.overall_status || '').toUpperCase();
            const verdictUpper = String(app.final_verdict || '').toUpperCase();
            const opsStatusUpper = String(app.metadata?.ops_validator_status || '').toUpperCase();
            const specStatusUpper = String(app.metadata?.final_specific_status || app.metadata?.['Final Specific Status'] || '').toUpperCase();

            const isConcludedStatus = (
                currentUpper.includes('PASSED') || currentUpper.includes('FAILED') || currentUpper.includes('HIRED') || currentUpper.includes('COMPLETED') ||
                overallUpper.includes('PASSED') || overallUpper.includes('FAILED') || overallUpper.includes('HIRED') || overallUpper.includes('COMPLETED') ||
                verdictUpper.includes('PASSED') || verdictUpper.includes('FAILED') || verdictUpper.includes('HIRED') || verdictUpper.includes('COMPLETED') ||
                opsStatusUpper.includes('PASSED') || opsStatusUpper.includes('FAILED') || opsStatusUpper.includes('HIRED') || opsStatusUpper.includes('COMPLETED') ||
                specStatusUpper.includes('PASSED') || specStatusUpper.includes('FAILED') || specStatusUpper.includes('HIRED') || specStatusUpper.includes('COMPLETED')
            );
            return isConcludedStatus;
        });

        console.log(`\n--- OFFICIALLY EVALUATED ABBOTT CANDIDATES ---`);
        res.rows.forEach((c, idx) => {
            const opsStatus = (c.metadata?.ops_validator_status || c.final_verdict || '').toUpperCase();
            if (opsStatus.includes('PASS') || opsStatus.includes('FAIL') || opsStatus.includes('HIRED')) {
                console.log(`\n[Candidate] ${c.applicant_name}`);
                console.log(`  Department: "${c.department}"`);
                console.log(`  Current Status: ${c.current_status}`);
                console.log(`  Final Verdict: ${c.final_verdict}`);
                console.log(`  Ops Val Status: ${c.metadata?.ops_validator_status}`);
                console.log(`  Assigned Ops Val: ${c.assigned_ops_validator_name}`);
            }
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
