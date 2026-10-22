import type { Application } from '@/types/application';

/**
 * Checks if a candidate actually has the required data for a specific pipeline stage.
 * Used by progress steppers to ensure stages aren't marked as "Completed"
 * simply because the candidate's status was pushed ahead.
 */
export const isStageDataComplete = (application: Application, stageId: string): boolean => {
    const processSettings = application.process_settings || application.pis?.process_settings || application.metadata?.process_settings || {};
    
    // Check if stage is explicitly marked as PASSED in process settings
    if (stageId === 'typing' && processSettings['TYPING_TEST'] === 'PASSED') return true;
    if (stageId === 'initial' && processSettings['INITIAL_INTERVIEW'] === 'PASSED') return true;
    if (stageId === 'endorsement' && processSettings['ACCOUNT_ASSIGNMENT'] === 'PASSED') return true;
    if (stageId === 'assessment' && processSettings['ASSESSMENT'] === 'PASSED') return true;
    if (stageId === 'scheduling' && processSettings['SCHEDULING'] === 'PASSED') return true;
    if (stageId === 'client_assessment' && processSettings['CLIENT_ASSESSMENT'] === 'PASSED') return true;
    if (stageId === 'client_interview' && processSettings['CLIENT_INTERVIEW'] === 'PASSED') return true;

    switch (stageId) {
        case 'application':
            return true; // Profile is always considered initialized
            
        case 'typing':
            return application.typing_test_wpm !== undefined && application.typing_test_wpm !== null && application.typing_test_wpm > 0;
            
        case 'initial':
            return Object.keys(application.interview_responses || {}).length > 0;
            
        case 'endorsement':
            return application.metadata?.endorsement_confirmed === true || 
                   (!!application.department && application.department.trim() !== '');
                   
        case 'assessment':
            const hasAssessmentScore = application.assessment_score !== undefined && 
                                       application.assessment_score !== null && 
                                       String(application.assessment_score).trim() !== '';
            const hasLeadershipScore = application.pis?.leadership_score !== undefined && 
                                       application.pis?.leadership_score !== null && 
                                       String(application.pis?.leadership_score).trim() !== '';
            return hasAssessmentScore || hasLeadershipScore;
            
        case 'assessment_ii':
            return application.metadata?.assessment_ii_score !== undefined && 
                   application.metadata?.assessment_ii_score !== null;
                   
        case 'scheduling':
            const ovStatus = String(application.pis?.ops_validator_status || application.metadata?.ops_validator_status || (application as any).ops_validator_status || '').toUpperCase();
            const fiResult = String(application.pis?.final_interview_result || application.metadata?.final_interview_result || (application as any).final_interview_result || '').toUpperCase();
            const fVerdict = String(application.final_verdict || (application.pis as any)?.final_verdict || '').toUpperCase();
            const specStatus = String(application.pis?.final_specific_status || application.metadata?.final_specific_status || '').toLowerCase();
            
            // Check if there is an active pending reprofile queue account
            const reprofileQueue = application.metadata?.reprofile_accounts || (application.pis as any)?.reprofile_accounts || [];
            const hasPendingReprofile = Array.isArray(reprofileQueue) && reprofileQueue.some((a: any) => a.status === 'PENDING' || a.status === 'ACTIVE' || a.status === 'WAITING' || a.status === 'REPROFILE');

            if (hasPendingReprofile || ovStatus === 'PENDING' || ovStatus === 'RECEIVED' || application.current_status === 'FINAL_INTERVIEW_SCHEDULED' || application.current_status === 'REPROFILE_FINAL_INTERVIEW') {
                return false;
            }

            if (ovStatus === 'PASSED' || fiResult === 'PASSED' || (fVerdict === 'PASSED' && !hasPendingReprofile) || specStatus.includes('ov - pass') || specStatus.includes('ops validator pass')) {
                return true;
            }
            
            return false;
                   
        case 'client_assessment':
            return application.client_assessment_score !== undefined && 
                   application.client_assessment_score !== null;
                   
        case 'client_interview':
            return application.client_interview_remarks !== undefined && 
                   application.client_interview_remarks !== null && 
                   String(application.client_interview_remarks).trim() !== '';
                   
        case 'verdict':
            return false; // Verdict is the final stage, it is never "passed" as a prior step
            
        default:
            return false;
    }
};
export const getPreviousStage = (app: any): string | null => {
    const cur = app.current_status;
    const processSettings = app.process_settings || app.pis?.process_settings || app.metadata?.process_settings || {};
    
    if (cur === 'ASSESSMENT') return 'FINAL_INTERVIEW';
    if (cur === 'FINAL_INTERVIEW' || cur === 'FINAL_INTERVIEW_SCHEDULED' || cur === 'FOR_SCHEDULING') {
        const isExplicitlyAtFirst = processSettings['ACCOUNT_ASSIGNMENT'] === 'PENDING';
        if (isExplicitlyAtFirst) return 'INITIAL_INTERVIEW';
        return 'ASSESSMENT';
    }
    if (cur === 'CLIENT_ASSESSMENT') return 'FINAL_INTERVIEW';
    if (cur === 'CLIENT_INTERVIEW') {
        if (processSettings['CLIENT_ASSESSMENT'] === 'PENDING') return 'CLIENT_ASSESSMENT';
        return 'FINAL_INTERVIEW';
    }
    return 'INITIAL_INTERVIEW';
};
