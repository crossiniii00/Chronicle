import type { Application } from '@/types/application';

export const SHEET_COLUMNS = [
    "Id", "Start time", "Completion time", "Email", "RECRUITER / INTERVIEWER", "Interview Date",
    "Last Name", "Middle Name", "First Name", "Preferred Name", "Position Applying for?",
    "Summary of Background and Experience", "Previous Salary", "If you don't mind us asking how much is your salary expectations?",
    "Date of Birth", "Age", "Sex", "Civil Status", "Contact Number", "Current Address",
    "Do you have any BPO experience", "Tenure in the BPO Industry", "Highest Educational Background",
    "Strand (if applicable)", "Course and Year Level",
    "What made you interested to apply in the role?",
    "In this role, what do you hope to achieve in the first 6 months?",
    
    // Additional Initial Interview & Assessment Questions
    "How do you handle conflict in a team environment?",
    "Tell us about a time you solved a complex technical problem.",
    "Describe a situation where you faced a significant setback or failure in your career. How did you handle it, and what did you do to stay focused on your long-term goals?",
    "The first 90 days is critical for you to be successful on this role, would there be any prior commitment - personal (like plans to go abroad and/or any medical conditions) that may hinder you from being in full attendance on the said time frame?",
    "Do you have any pending Job Offer with other companies you've applied for?",
    "Are you open to work onsite and what is your mode of transportation?",
    "If you don't mind us asking, may I know your compensation from your most recent company?",

    "Can you share a setback or failure you've experienced?",
    "Do you have any prior commitment that we need to know?",
    "The target training start date for this account/campaign will start on ___________. Would you be available to work with us by then?",
    "Do you have any preferred shifts or work schedule?",
    "Mode of transportation",
    "Do you have any pending job offer?",
    "Role specific questions",
    "Should this candidate be referred for drug testing?",
    "Narrative Assessment of Recruiter",
    
    // Agent Assessment Questions
    "Teamwork: Works effectively with others by demonstrating responsiveness, a positive attitude, and a willingness to collaborate toward shared goals.",
    "Attention to Detail: Ensures precision and consistency by thoroughly reviewing information and documentation.",
    "Customer Focus: Demonstrates strong customer orientation by responding with empathy, patience, and care.",
    "Technical Skills: Demonstrates familiarity with CRM platforms and related systems to analyze, resolve, and document customer concerns effectively.",
    "Sales Propensity: Person's natural tendency and ability to sell or influence others.",
    "Adaptability and Tenacity: Demonstrates resilience and determination when navigating changes, overcoming challenges, and achieving successful outcomes.",
    "Critical Thinking and Problem-Solving: Identifies underlying issues and resolves problems efficiently using data and logical reasoning.",
    
    // Leadership Assessment Questions (QA, Trainer, TL Only)
    "Leadership - Works effectively with others by demonstrating responsiveness, a positive attitude, and a commitment to shared goals.",

    "INITIAL ACCOUNT ASSIGNMENT", "Is this candidate for drug testing", "INITIAL INTERVIEW RESULTS", "CEFR",
    "Personality Test (Enercare; Leadership)", "Critical Thinking Assessment", "Typing Speed (Number Only)", "Typing Accuracy (Percentage)",
    "Ops Validator Email", "Ops Val Status", "Ops Val Notes if Available",
    "Leadership Assessment Status (if applicable)", "Wonderlic Status (if applicable)",
    "Client Interviewer Email", "Client Interview Status (if applicable)",
    "Client Interview Notes if Available", "SSS No.", "Tin No.", "Pag-Ibig No.", "PhilHealth No.", "Final Specific Status", "Current Step", "Overall Status",
    "Hire Date", "Final Account", "Last Processed/Updated By:", "Source",
    
    // Remarks
    "Final Interviewer's Remarks"
];

export const PIVOT_COLUMNS = [
    "Overall Status", "Final Specific Status", "CEFR", "RECRUITER / INTERVIEWER",
    "Last Name", "Middle Name", "First Name",
    "Conditional", "FAILED", "PASSED", "Promotion", "Waitlisted",
    "Withdrawn", "Not Eligible for Rehire", "N/A", "Grand Total"
];

export const VLIST_COLUMNS = [
    "Specific Status", "Overall Status", "Personality Test", "Critical Thinking Assessment", "CEFR",
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
    if (app.pis?.cefr_level) return app.pis.cefr_level;
    
    // Check if assessment_score is a CEFR grade or contains one
    const score = String(app.assessment_score || '').toUpperCase().trim();
    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (cefrLevels.includes(score)) {
        return score;
    }
    const scoreMatch = score.match(/\b(A1|A2|B1|B2|C1|C2)\b/);
    if (scoreMatch) {
        return scoreMatch[1];
    }
    
    // Check metadata.ratings.languageClassification
    const langClass = String(app.metadata?.ratings?.languageClassification || (app.pis as any)?.languageClassification || '').toUpperCase().trim();
    if (langClass) {
        const langMatch = langClass.match(/\b(A1|A2|B1|B2|C1|C2)\b/);
        if (langMatch) {
            return langMatch[1];
        }
        
        // Category fallback mapping
        if (langClass.includes('CATEGORY C') || langClass.includes('CAT C')) return 'B2';
        if (langClass.includes('CATEGORY D') || langClass.includes('CAT D')) return 'C1';
        if (langClass.includes('CATEGORY B') || langClass.includes('CAT B')) return 'B1';
        if (langClass.includes('CATEGORY A') || langClass.includes('CAT A')) return 'A2';
    }
    
    return '';
};
