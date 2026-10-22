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
        console.log('--- ANALYZING ALL CANDIDATES FILTERED OUT OF MASTERLIST ---');
        const res = await pool.query("SELECT * FROM applications;");
        const allApps = res.rows;

        const validDropdownStatuses = [
            'APPLIED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC',
            'FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED',
            'CONTRACT_SENT', 'CONTRACT SENT', 'PASSED', 'RESCHEDULED', 
            'HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING',
            'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION',
            'CLIENT_INTERVIEW', 'CLIENT INTERVIEW', 'CLIENT_ASSESSMENT', 'CLIENT ASSESSMENT',
            'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW SCHEDULED', 'INITIAL_INTERVIEW', 'INITIAL INTERVIEW'
        ];

        const passedStatuses = [
            'FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 
            'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING', 
            'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION', 'FOR_PAN', 'FOR PAN', 
            'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT'
        ];

        const failedTerms = ['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE', 'INACTIVE', 'NO SHOW', 'NO_SHOW', 'BACKOUT', 'BACK OUT'];

        const filteredOut = [];
        const included = [];

        for (const a of allApps) {
            const col = a.master_column || '';
            const allCandidateStatuses = [
                a.master_status,
                a.current_status,
                a.pis?.final_specific_status,
                a.pis?.ops_validator_status,
                a.pis?.initial_status,
                a.pis?.assessment_status,
                a.pis?.status,
                a.pis?.overall_status
            ].map(s => String(s || '').trim().toUpperCase());

            const isFailed = allCandidateStatuses.some(s => failedTerms.includes(s) || s === 'FAILED' || s.startsWith('FAILED'));
            const status = a.master_status || a.current_status || 'PENDING';
            const statusUpper = String(status).toUpperCase();
            const currUpper = String(a.current_status || '').toUpperCase();
            const colUpper = (col || '').toUpperCase();

            const isPassed = passedStatuses.includes(statusUpper) || passedStatuses.includes(currUpper);
            const isExplicitlySheet = colUpper === 'SHEET' || colUpper === 'OFFICEFORMS_TABLE';

            let reason = '';

            if (isFailed) {
                reason = `Failed/Rejected status (${currUpper})`;
            } else if (isExplicitlySheet && !isPassed) {
                reason = `Explicitly assigned to SHEET column and not passed`;
            } else if (!a.master_column && !isPassed) {
                reason = `No master_column assigned and status is not Passed (${currUpper})`;
            } else if (!['MASTERLIST', 'PIVOT', 'EMAIL', 'REPORTS', 'SHEET1'].includes(colUpper) && !isPassed) {
                reason = `master_column is "${colUpper}" (not MASTERLIST/PIVOT/EMAIL/REPORTS)`;
            } else if (!validDropdownStatuses.includes(statusUpper) && !validDropdownStatuses.includes(currUpper)) {
                reason = `Status "${currUpper}" is not in valid masterlist dropdown statuses`;
            }

            if (reason) {
                filteredOut.push({
                    id: a.id,
                    name: a.applicant_name,
                    department: a.department,
                    current_status: a.current_status,
                    master_column: a.master_column,
                    reason
                });
            } else {
                included.push(a);
            }
        }

        console.log(`Total applications in DB: ${allApps.length}`);
        console.log(`Included in Masterlist: ${included.length}`);
        console.log(`Filtered out of Masterlist: ${filteredOut.length}\n`);

        console.log('--- SAMPLE FILTERED OUT CANDIDATES (NON-FAILED / POTENTIAL MISSED CANDIDATES) ---');
        const nonFailedFilteredOut = filteredOut.filter(f => !f.reason.startsWith('Failed'));
        console.log(`Non-Failed Filtered Out (${nonFailedFilteredOut.length}):`);
        console.log(JSON.stringify(nonFailedFilteredOut, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
