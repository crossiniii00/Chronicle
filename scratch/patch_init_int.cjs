const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/components/features/ApplicantManagement/DetailTabs/InitialInterviewTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const hasTakenCheck = `    const hasTakenInterview = Object.keys(applicant.interview_responses || {}).length > 0 || String(applicant.metadata?.initial_interview_result || (applicant.pis as any)?.initial_interview_results || '').trim() !== '';`;

if (!content.includes('const hasTakenInterview')) {
    content = content.replace('const isActuallyQueuedOrInInterview = isInQueue || isInRoom;', 'const isActuallyQueuedOrInInterview = isInQueue || isInRoom;\n' + hasTakenCheck);
}

const target = `                        {['APPLIED', 'TYPING_TEST'].includes(applicant.current_status) ? (
                            <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Stage Pending</p>
                                <p className="text-sm text-surface-500 font-medium">Please complete the Typing Test stage first.</p>
                            </div>
                        ) : (`;

const replacement = `                        {['APPLIED', 'TYPING_TEST'].includes(applicant.current_status) ? (
                            <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Stage Pending</p>
                                <p className="text-sm text-surface-500 font-medium">Please complete the Typing Test stage first.</p>
                            </div>
                        ) : !hasTakenInterview && ['INVITED_FOR_REAPPLICATION', 'PROMOTION', 'LATERAL'].includes(applicant.current_status) ? (
                            <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Initial Interview Not Started</p>
                                <p className="text-sm text-surface-500 font-medium mb-6">The candidate has not yet taken the initial interview.</p>
                                <button
                                    onClick={async () => {
                                        try {
                                            await ApplicationService.updateStatus({
                                                id: applicant.id,
                                                toStatus: 'INITIAL_INTERVIEW',
                                                changedByName: 'Recruiter',
                                                reason: 'Resumed initial interview process'
                                            });
                                            if (handleUpdateApplication) {
                                                await handleUpdateApplication(applicant.id, { current_status: 'INITIAL_INTERVIEW' });
                                            }
                                        } catch(e) { console.error(e); }
                                    }}
                                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm inline-flex items-center justify-center gap-2"
                                >
                                    Continue to Initial Interview
                                </button>
                            </div>
                        ) : (`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
