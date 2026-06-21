import type { Application } from '@/types/application';

export const SHEET_COLUMNS = [
    "Hire Eligibility", "Id", "Start time", "Completion time", "Email", "RECRUITER / INTERVIEWER", "Interview Date",
    "Candidate's Complete Name (First, Middle and Last Name)", "Position Applying for?",
    "Summary of Background and Experience", "If you don't mind us asking how much is your salary expectations?",
    "Date of Birth", "Age", "Gender", "Civil Status", "Contact Number", "Current Address",
    "Do you have any BPO experience", "Tenure in the BPO Industry", "Highest Educational Background",
    "Strand (if applicable)", "Course and Year Level", "Do you have plans in going back to school this year?",
    "Do you have the following requirements or government IDs? (ie. SSS/Philhealth/Pag-ibig/BIR Tin/NBI)",
    "Where did you hear that we are hiring?",
    "I’ve asked you a lot of questions, and now I’d love to hear from you. Do you have any questions about the role, the team, or the company that I can answer",
    "INTERVIEWER", "INITIAL ACCOUNT ASSIGNMENT", "INITIAL INTERVIEW RESULTS", "CEFR",
    "Personality Test (Enercare; Leadership)", "Typing Speed (Number Only)", "Typing Accuracy (Percentage)",
    "Ops Validator Email", "Ops Val Status", "Ops Val Notes if Available",
    "Leadership Assessment Status (if applicable)", "Wonderlic Status (if applicable)",
    "Client Interviewer Email", "Client Interview Status (if applicable)",
    "Client Interview Notes if Available", "Final Specific Status", "Application Status", "Overall Status",
    "Hire Date", "Final Account", "Last Processed/Updated By:", "Column1"
];

export const PIVOT_COLUMNS = [
    "Overall Status", "Final Specific Status", "CEFR", "RECRUITER / INTERVIEWER",
    "Candidate's Complete Name (First, Middle and Last Name)",
    "Conditional", "FAILED", "PASSED", "Promotion", "Waitlisted",
    "Withdrawn", "Not Eligible for Rehire", "N/A", "Grand Total"
];

export const VLIST_COLUMNS = [
    "Specific Status", "Overall Status", "Personality Test", "CEFR",
    "Wonderlic", "Leadership Assessment", "Ops Val Status",
    "Client Interview Status", "Recruiter", "Final Account"
];

export const TL_COLUMNS = [
    "#", "Name", "Position", "Background and Experience",
    "Tenure as TL", "Total BPO Exp", "Salary Expectation",
    "Source", "Status"
];

export const BILINGUALS_COLUMNS = [
    "#", "Candidate's Name", "Position", "Preferred Set-up",
    "Willing to Relocate", "Salary", "Status", "Notes"
];

export const SUPPORT_HIRING_COLUMNS = [
    "#", "Candidate's Name", "Position", "Initial Interview",
    "2nd Level Interview", "Ops Val Interview", "Leadership Assessment",
    "Contact Information", "Email Address", "Interviewer"
];

export interface SHFilters {
    position: string[];
    initial: string[];
    second: string[];
    final: string[];
}

export const cleanValue = (val: string) => {
    if (!val) return val;
    return val.replace(/^\[SELECTED:\s*(.*)\]$/i, '$1');
};

export const calculateCEFR = (app: Application) => {
    const pis = (app.pis || {}) as any;
    
    // Find typing speed from any source
    let wpm = app.typing_test_wpm;
    if (!wpm) {
        const fuzzyWpm = Object.keys(pis).find(k => k.toLowerCase().includes('typing') || k.toLowerCase().includes('wpm'));
        if (fuzzyWpm) {
            const val = String(pis[fuzzyWpm]);
            const match = val.match(/(\d+)/);
            if (match) wpm = parseInt(match[1]);
        }
    }

    if (app.pis?.leadership_score) {
        const score = parseInt(app.pis.leadership_score);
        if (score > 90) return 'C2';
        if (score > 80) return 'C1';
    }

    if (wpm) {
        if (wpm > 55) return 'C2';
        if (wpm > 45) return 'C1';
        if (wpm > 35) return 'B2';
        if (wpm > 25) return 'B1';
        if (wpm > 15) return 'A2';
        return 'A1';
    }

    return app.pis?.languages?.[0]?.proficiency || 'N/A';
};
