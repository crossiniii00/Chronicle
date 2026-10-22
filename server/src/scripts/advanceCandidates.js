import { pool, query } from '../db.js';

const STATUS_ORDER = {
    'APPLIED': 0,
    'TYPING_TEST': 1,
    'INITIAL_INTERVIEW': 2,
    'INTERVIEW_IN_PROGRESS': 2,
    'QUEUE_ASSIGNED': 2,
    'ACCOUNT_ASSIGNMENT': 3, 
    'ASSESSMENT': 4,     
    'FOR_SCHEDULING': 5, 
    'FINAL_INTERVIEW': 5, 
    'FINAL_INTERVIEW_SCHEDULED': 5,
    'CLIENT_ASSESSMENT': 6,
    'CLIENT_INTERVIEW': 7,
    'FINAL_VERDICT': 8,
    'PASSED': 8,
    'HIRED': 8,
    'FOR_JOB_OFFER': 8,
    'FOR JOB OFFER': 8,
    'REJECTED': -1,
    'FAILED': -1,
    'WITHDRAWN': -1
};

// Returns boolean if stage is complete
function isStageDataComplete(application, stageId) {
    const processSettings = application.process_settings || application.pis?.process_settings || application.metadata?.process_settings || {};
    
    // Check if stage is explicitly marked as PASSED in process settings
    if (stageId === 'typing' && processSettings['TYPING_TEST'] === 'PASSED') return true;
    if (stageId === 'initial' && processSettings['INITIAL_INTERVIEW'] === 'PASSED') return true;
    if (stageId === 'endorsement' && processSettings['ACCOUNT_ASSIGNMENT'] === 'PASSED') return true;
    if (stageId === 'assessment' && processSettings['ASSESSMENT'] === 'PASSED') return true;
    if (stageId === 'scheduling' && processSettings['SCHEDULING'] === 'PASSED') return true;
    if (stageId === 'client_assessment' && processSettings['CLIENT_ASSESSMENT'] === 'PASSED') return true;
    if (stageId === 'client_interview' && processSettings['CLIENT_INTERVIEW'] === 'PASSED') return true;

    // Check if stage is formally skipped
    const skippedStages = application.metadata?.skipped_stages || [];
    if (skippedStages.includes(stageId)) return true;

    switch (stageId) {
        case 'application':
            return true;
            
        case 'typing':
            return application.typing_test_wpm !== null && application.typing_test_wpm !== undefined;
            
        case 'initial':
            return application.interview_responses && Object.keys(application.interview_responses).length > 0;
            
        case 'endorsement': // Account Assignment
            return application.metadata?.endorsement_confirmed === true || 
                   (!!application.department && application.department.trim() !== '');
                   
        case 'assessment': // Proficiency Assessment
            const hasAssessmentScore = application.assessment_score !== null && 
                                       application.assessment_score !== undefined && 
                                       String(application.assessment_score).trim() !== '';
            const metadataObj = typeof application.metadata === 'string' ? JSON.parse(application.metadata || '{}') : (application.metadata || {});
            const pisObj = typeof application.pis === 'string' ? JSON.parse(application.pis || '{}') : (application.pis || {});
            const hasLeadershipScore = (metadataObj?.leadership_score !== null && metadataObj?.leadership_score !== undefined && String(metadataObj?.leadership_score).trim() !== '') || 
                                       (pisObj?.leadership_score !== null && pisObj?.leadership_score !== undefined && String(pisObj?.leadership_score).trim() !== '');
            const speechx = application.speechx_score || pisObj?.speechx_score || metadataObj?.speechx_score || metadataObj?.cefr_level;
            const hasSpeechXScore = speechx !== null && 
                                    speechx !== undefined && 
                                    String(speechx).trim() !== '';
            return hasAssessmentScore || hasLeadershipScore || hasSpeechXScore;
                   
        case 'scheduling': // Account Assignment
            if (String(application.pis?.ops_validator_status).toUpperCase() === 'PASSED') return true;
            if (String(application.metadata?.ops_validator_status).toUpperCase() === 'PASSED') return true;
            return application.endorsement_meeting_date !== null && 
                   application.endorsement_meeting_date !== undefined &&
                   application.assigned_ops_validator_id !== null && 
                   application.assigned_ops_validator_id !== undefined;
                   
        default:
            return true; // Ignore other stages for now
    }
}

async function run() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log(`Starting advance candidates script. Dry run: ${dryRun}`);

    try {
        const { rows: applications } = await query(`
            SELECT * FROM applications 
            WHERE current_status NOT IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED', 'PASSED', 'HIRED', 'FOR_JOB_OFFER', 'FINAL_VERDICT')
        `);

        console.log(`Evaluating ${applications.length} applications...`);

        let advancedCount = 0;

        for (const app of applications) {
            const currentRank = STATUS_ORDER[app.current_status.toUpperCase().trim()] || 0;
            if (currentRank <= 2) continue; // Already at the beginning

            let advanceStatus = null;

            // Forward progression
            if (app.current_status === 'ACCOUNT_ASSIGNMENT' && isStageDataComplete(app, 'endorsement')) {
                advanceStatus = 'ASSESSMENT';
            }
            if ((app.current_status === 'ASSESSMENT' || advanceStatus === 'ASSESSMENT') && isStageDataComplete(app, 'assessment')) {
                advanceStatus = 'FINAL_INTERVIEW';
            }

            if (advanceStatus && advanceStatus !== app.current_status) {
                console.log(`[ADVANCE] ${app.applicant_name} (${app.applicant_email})`);
                console.log(`   Current Status: ${app.current_status}`);
                console.log(`   Advancing To: ${advanceStatus}\n`);
                advancedCount++;

                if (!dryRun) {
                    await query(`
                        UPDATE applications 
                        SET current_status = $1,
                            updated_at = NOW()
                        WHERE id = $2
                    `, [advanceStatus, app.id]);
                }
            }
        }

        console.log(`Total candidates advanced: ${advancedCount}`);
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
