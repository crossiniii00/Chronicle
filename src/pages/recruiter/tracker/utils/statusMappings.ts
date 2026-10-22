export const SPECIFIC_STATUS_TO_OVERALL: Record<string, string> = {
    "JO - Hired": "HIRED",
    "JO - Declined": "CLOSED",
    "JO - Pending": "OPEN",
    "OV - Passed": "For Job Offer",
    "OV - Failed": "CLOSED",
    "OV - Failed; for reprofiling": "OPEN",
    "OV - Pending": "OPEN",
    "OV - Pending feedback": "OPEN",
    "OV - No Show/Noncompliant": "CLOSED",
    "OV - Reschedule": "OPEN",
    "OV - Withdrew Application": "CLOSED",
    "Client Interview - Passed": "For Job Offer",
    "Client Interview - Failed": "CLOSED",
    "Client Interview - Failed; for reprofiling": "OPEN",
    "Client Interview - Pending feedback": "OPEN",
    "Client Interview - Pending": "OPEN",
    "Client Interview - No Show/Noncompliant": "CLOSED",
    "Client Interview - Reschedule": "OPEN",
    "Client Interview - Withdrew Application": "CLOSED",
    "Client Assessment - Passed": "For Job Offer",
    "Client Assessment - Failed": "CLOSED",
    "Client Assessment - Failed; for reprofiling": "OPEN",
    "Client Assessment - Pending feedback": "OPEN",
    "Client Assessment - Pending": "OPEN",
    "Client Assessment - No Show/Noncompliant": "CLOSED",
    "Client Assessment - Reschedule": "OPEN",
    "Client Assessment - Withdrew Application": "CLOSED",
    "Wonderlic - Passed": "OPEN",
    "Wonderlic - Failed": "CLOSED",
    "Wonderlic - Failed; for reprofiling": "OPEN",
    "Wonderlic - Pending": "OPEN",
    "Wonderlic - Pending feedback": "OPEN",
    "Wonderlic - No show/Non-compliant": "CLOSED",
    "Wonderlic - Withdrew Application": "CLOSED",
    "SpeechX - Passed": "OPEN",
    "SpeechX - Failed": "CLOSED",
    "SpeechX - Pending": "OPEN",
    "SpeechX - No Show/Noncompliant": "CLOSED",
    "SpeechX - Withdrew Application": "CLOSED",
    "Personality Test - Passed": "OPEN",
    "Personality Test - Failed": "CLOSED",
    "Personality Test - Pending": "OPEN",
    "Personality Test - No Show/Noncompliant": "CLOSED",
    "Personality Test - Withdrew Application": "CLOSED",
    "Typing Test - Passed": "OPEN",
    "Typing Test - Failed": "CLOSED",
    "Typing Test - Pending": "OPEN",
    "Typing Test - No Show/Noncompliant": "CLOSED",
    "Typing Test - Withdrew Application": "CLOSED",
    "Initial Interview - Passed": "OPEN",
    "Initial Interview - Failed": "CLOSED",
    "Initial Interview - Pending": "OPEN",
    "Initial Interview - No Show/Noncompliant": "CLOSED",
    "Initial Interview - Withdrew Application": "CLOSED",
    "Recruitment Interview - Passed": "OPEN",
    "Recruitment Interview - Failed": "CLOSED",
    "Recruitment Interview - Pending": "OPEN",
    "Recruitment Interview - No Show/Noncompliant": "CLOSED",
    "Recruitment Interview - Withdrew Application": "CLOSED",
    "Ops Val Interview - Passed": "For Job Offer",
    "Ops Val Interview - Failed": "CLOSED",
    "Ops Val Interview - No Show/Noncompliant": "CLOSED",
    "OV - Scheduled": "OPEN",
    "OV - for Scheduling": "OPEN",
    "For Reprofiling": "OPEN",
    "Promotion": "CLOSED",
    "Lateral Transfer": "OPEN",
    "PAN Sent": "OPEN",
    "Application Withdraw": "CLOSED",
    "Not Eligible for Rehire": "CLOSED"
};

export const SPECIFIC_STATUS_OPTIONS = Object.keys(SPECIFIC_STATUS_TO_OVERALL).filter(
    opt => opt !== "Not Eligible for Rehire" &&
        opt !== "Blacklist" &&
        opt !== "Not Eligible" &&
        !opt.startsWith("Recruitment Interview")
);

export const getSpecificStatusesForStep = (currentStep?: string, currentValue?: string): string[] => {
    let options = SPECIFIC_STATUS_OPTIONS;
    if (currentValue && !options.includes(currentValue)) {
        options = [currentValue, ...options];
    }
    return options;
};


export const normalizeStatus = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (!s) return '';

    // Merge Recruitment Interview into Initial Interview
    if (s.toLowerCase().startsWith('recruitment interview')) {
        const merged = s.replace(/recruitment interview/i, 'Initial Interview');
        const exactMerged = SPECIFIC_STATUS_OPTIONS.find(opt => opt.toLowerCase() === merged.toLowerCase());
        if (exactMerged) return exactMerged;
    }

    // 1. Exact match
    const exact = SPECIFIC_STATUS_OPTIONS.find(opt => opt.toLowerCase() === s.toLowerCase());
    if (exact) return exact;

    // 2. Contains match
    const contains = SPECIFIC_STATUS_OPTIONS.find(opt => opt.toLowerCase().includes(s.toLowerCase()));
    if (contains) return contains;

    // 3. Reversed contains
    const revContains = SPECIFIC_STATUS_OPTIONS.find(opt => s.toLowerCase().includes(opt.toLowerCase()));
    if (revContains) return revContains;

    return s; // Fallback to original if no match found
};

export const normalizeOverallStatus = (val: any, specStatus?: string): string => {
    if (specStatus) {
        const mapped = SPECIFIC_STATUS_TO_OVERALL[specStatus];
        if (mapped) return normalizeOverallStatus(mapped);

        const lowerSpec = specStatus.toLowerCase();
        if (lowerSpec.includes('failed') || lowerSpec.includes('rejected') || lowerSpec.includes('withdrew') || lowerSpec.includes('withdraw') || lowerSpec.includes('no show') || lowerSpec.includes('noncompliant')) {
            return 'CLOSED';
        }
    }

    if (!val) return 'OPEN';
    const s = String(val).trim().toUpperCase();
    if (!s) return 'OPEN';

    // Merge FAILED into CLOSED
    if (s === 'FAILED' || s === 'REJECTED' || s === 'WITHDRAWN' || s === 'WITHDREW' || s === 'CLOSE' || s === 'CLOSED') {
        return 'CLOSED';
    }

    // Merge PASSED into OPEN
    if (s === 'PASSED' || s === 'FOR JOB OFFER' || s === 'FOR_JOB_OFFER' || s === 'PENDING' || s === 'OPEN') {
        return 'OPEN';
    }

    if (s.includes('HIRED') || s === 'ACCEPTED_OFFER' || s === 'ACCEPTED OFFER') {
        return 'HIRED';
    }

    return 'OPEN';
};

