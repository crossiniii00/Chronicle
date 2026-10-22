const fs = require('fs');

const a = {
    id: "e73e3625-86a5-4f2f-b7ef-6d0455e9bd3f",
    applicant_name: "Rey Mark Dimpas",
    current_status: "For Job Offer",
    department: "OnCourse",
    master_column: "MASTERLIST",
    metadata: {
        deleted_from_masterlist: false,
        failed_accounts: ["TPV"],
        final_specific_status: "OV - Failed",
        ops_validator_status: "FAILED"
    },
    pis: {
        ops_validator_status: "FAILED"
    },
    applied_at: "2026-08-04T11:33:14.937Z"
};

const activeTab = "MASTERLIST";

// 1st filter
const allCandidateStatuses = [
    a.master_status,
    a.current_status,
    a.pis?.final_specific_status,
    a.pis?.ops_validator_status,
    (a.pis)?.initial_status,
    (a.pis)?.assessment_status,
    (a.pis)?.status,
    a.pis?.overall_status
].map(s => String(s || '').trim().toUpperCase());

const failedTerms = ['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE', 'INACTIVE', 'NO SHOW', 'NO_SHOW', 'BACKOUT', 'BACK OUT'];
const isFailed = allCandidateStatuses.some(s => failedTerms.includes(s) || s === 'FAILED' || s.startsWith('FAILED'));
const status = a.master_status || a.current_status || 'PENDING';

const passedStatuses = ['FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING', 'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT', 'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN ISSUED', 'FOR SIGNATURE', 'PAN_ISSUED', 'POOL', 'POOLED', 'FOR POOL', 'FOR_POOL', 'ACTIVE POOL', 'ACTIVE_POOL', 'POOLING', 'WAITING', 'WAITLISTED'];
const statusUpper = status.toUpperCase();
const currUpper = (a.current_status || '').toUpperCase();

const isPassed = passedStatuses.includes(statusUpper) || 
                 passedStatuses.includes(currUpper) || 
                 statusUpper.includes('PAN') || 
                 currUpper.includes('PAN') ||
                 statusUpper.includes('SIGNATURE') ||
                 currUpper.includes('SIGNATURE') ||
                 statusUpper.includes('POOL') ||
                 currUpper.includes('POOL') ||
                 statusUpper.includes('WAITING') ||
                 currUpper.includes('WAITING') ||
                 statusUpper.includes('WAITLIST') ||
                 currUpper.includes('WAITLIST') ||
                 Boolean(a.master_column === 'MASTERLIST') ||
                 Boolean(a.master_column === 'POOL');

console.log("isPassed:", isPassed);
console.log("isFailed:", isFailed);

if (isFailed && !isPassed) {
    console.log("Failed in first filter: isFailed && !isPassed");
} else {
    console.log("Passed first filter!");
}

// 2nd filter
const effectiveStatus = a.master_status || a.current_status || '';
let matchesStatus = !['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED'].includes(String(effectiveStatus).toUpperCase());

console.log("matchesStatus:", matchesStatus);
console.log("effectiveStatus:", effectiveStatus);

const validDropdownStatuses = [
    'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC',
    'FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED',
    'CONTRACT_SENT', 'CONTRACT SENT', 'PASSED', 'RESCHEDULED',
    'HIRED', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING',
    'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION',
    'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN ISSUED', 'FOR SIGNATURE', 'PAN_ISSUED',
    'POOL', 'POOLED', 'FOR POOL', 'FOR_POOL', 'ACTIVE POOL', 'ACTIVE_POOL', 'POOLING', 'WAITING', 'WAITLISTED'
];
const isStatusValid = validDropdownStatuses.includes(statusUpper) ||
                      validDropdownStatuses.includes(currUpper) ||
                      statusUpper.includes('PAN') ||
                      currUpper.includes('PAN') ||
                      statusUpper.includes('SIGNATURE') ||
                      currUpper.includes('SIGNATURE') ||
                      statusUpper.includes('POOL') ||
                      currUpper.includes('POOL') ||
                      statusUpper.includes('WAITING') ||
                      currUpper.includes('WAITING') ||
                      statusUpper.includes('WAITLIST') ||
                      currUpper.includes('WAITLIST') ||
                      Boolean(a.master_status) ||
                      Boolean(a.master_column === 'MASTERLIST') ||
                      Boolean(a.master_column === 'POOL');

console.log("isStatusValid:", isStatusValid);
