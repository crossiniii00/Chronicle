export const SPECIFIC_STATUS_TO_OVERALL: Record<string, string> = {
    "JO - Hired": "HIRED",
    "JO - Declined": "CLOSED",
    "JO - Pending": "OPEN",
    "OV - Passed": "For Job Offer",
    "OV - Failed": "OPEN",
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
    "Recruitment Interview - Passed": "OPEN",
    "Recruitment Interview - Failed": "CLOSED",
    "Recruitment Interview - Pending": "OPEN",
    "Recruitment Interview - No Show/Noncompliant": "CLOSED",
    "Recruitment Interview - Withdrew Application": "CLOSED",
    "Ops Val Interview - Passed": "For Job Offer",
    "Ops Val Interview - Failed": "CLOSED",
    "Ops Val Interview - No Show/Noncompliant": "CLOSED",
    "Promotion": "CLOSED",
    "Lateral Transfer": "OPEN",
    "PAN Sent": "OPEN",
    "Application Withdraw": "CLOSED",
    "Not Eligible for Rehire": "CLOSED"
};

export const SPECIFIC_STATUS_OPTIONS = Object.keys(SPECIFIC_STATUS_TO_OVERALL).filter(
    opt => opt !== "Not Eligible for Rehire" && opt !== "Blacklist" && opt !== "Not Eligible"
);

export const normalizeStatus = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (!s) return '';

    // 1. Exact match
    const exact = SPECIFIC_STATUS_OPTIONS.find(opt => opt.toLowerCase() === s.toLowerCase());
    if (exact) return exact;

    // 2. Contains match (e.g. "Passed" -> "II - Passed" or "FI - Passed"?)
    // This is risky, but we can try to find the first one that contains it
    const contains = SPECIFIC_STATUS_OPTIONS.find(opt => opt.toLowerCase().includes(s.toLowerCase()));
    if (contains) return contains;

    // 3. Reversed contains (e.g. "Ops Val Interview - Passed" vs "Passed")
    const revContains = SPECIFIC_STATUS_OPTIONS.find(opt => s.toLowerCase().includes(opt.toLowerCase()));
    if (revContains) return revContains;

    return s; // Fallback to original if no match found
};
