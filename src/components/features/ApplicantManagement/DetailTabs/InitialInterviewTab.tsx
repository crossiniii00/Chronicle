import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Application } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';
import { useRoomStore } from '@/store/roomStore';
import { useQueueStore } from '@/store/queueStore';
import { cn } from '@/utils/formatters';

interface InitialInterviewTabProps {
    applicant: Application;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    handlePromote: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    onRegress: (app: Application) => void;
    setShowEvaluationResults: (show: boolean) => void;
    showRejectionPrompt: boolean;
    setShowRejectionPrompt: (show: boolean) => void;
    rejectionReasonInput: string;
    setRejectionReasonInput: (reason: string) => void;
    showRegressPrompt: boolean;
    setShowRegressPrompt: (show: boolean) => void;
    onDelete?: (app: Application) => void;
}

export const InitialInterviewTab: React.FC<InitialInterviewTabProps> = ({
    applicant, onQueue, handlePromote, onRegress, setShowEvaluationResults,
    showRejectionPrompt, setShowRejectionPrompt, rejectionReasonInput, setRejectionReasonInput,
    showRegressPrompt, setShowRegressPrompt, onDelete
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLaunching, setIsLaunching] = useState(false);
    const { rooms } = useRoomStore();
    const { queue, loadQueue } = useQueueStore();

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const assignedRoom = rooms.find(r => r.current_application_id === applicant.id);
    const isOnlineRoom = assignedRoom?.room_type === 'online';
    const interviewMode = isOnlineRoom ? 'ONLINE' : (applicant.metadata?.interview_mode || 'ON-SITE');

    const queueEntry = queue.find(q => q.application_id === applicant.id && (q.status === 'WAITING' || q.status === 'CALLED'));
    const isInQueue = !!queueEntry;
    const isInRoom = !!assignedRoom;
    const isActuallyQueuedOrInInterview = isInQueue || isInRoom;

    return (
        <div className="max-w-4xl mx-auto py-4">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-surface-900 tracking-tight mb-2 uppercase tracking-wider">Initial Interview</h3>
                <p className="text-sm text-surface-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Preliminary screening, values alignment, and fundamental skills verification.
                </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
                {applicant.current_status === 'INITIAL_INTERVIEW' || (applicant.current_status === 'QUEUE_ASSIGNED' && applicant.queue_type === 'INITIAL') || applicant.current_status === 'INTERVIEW_IN_PROGRESS' || isActuallyQueuedOrInInterview ? (
                    <div className="space-y-4">
                        {applicant.current_status === 'QUEUE_ASSIGNED' || applicant.current_status === 'INTERVIEW_IN_PROGRESS' || isActuallyQueuedOrInInterview ? (
                            <div className="relative bg-white border border-primary-100 rounded-sm p-6 shadow-sm overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-primary-700 font-bold text-[10px] uppercase tracking-wider">
                                        {applicant.current_status === 'INTERVIEW_IN_PROGRESS' || isInRoom || (queueEntry && queueEntry.status === 'CALLED') ? 'Active Interview Session' : 'Currently in Waiting Queue'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {interviewMode && (
                                            <span className={cn(
                                                "px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wide rounded-sm truncate w-fit shrink-0 shadow-sm border",
                                                interviewMode === 'ONLINE'
                                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                                    : "bg-surface-50 text-surface-700 border-surface-200"
                                            )}>
                                                {interviewMode === 'ONLINE' ? '🎥 Online' : '🏢 On-Site'}
                                            </span>
                                        )}
                                        {(applicant.queue_number || queueEntry?.queue_number) && (
                                            <div className="px-3 py-1 bg-primary-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-sm">
                                                Token #{String(applicant.queue_number || queueEntry?.queue_number).padStart(3, '0')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                 <p className="text-[12px] text-surface-700 font-medium leading-relaxed">
                                    {applicant.current_status === 'INTERVIEW_IN_PROGRESS' || isInRoom || (queueEntry && queueEntry.status === 'CALLED')
                                        ? "The candidate is currently engaged in the initial interview process."
                                        : "The candidate has been queued and is awaiting an available interviewer."}
                                </p>
                                {assignedRoom && (
                                    <div className="mt-4 pt-4 border-t border-primary-50/60 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                                                navigate(`${basePath}/interview/rooms`, { 
                                                    state: { autoOpenRoomId: assignedRoom.id } 
                                                });
                                            }}
                                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <span>Go to Room: {assignedRoom.room_name}</span>
                                            <span className="text-[12px]">→</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => onQueue(applicant, 'INITIAL')}
                                    className="w-full py-4 bg-white border border-primary-500 text-primary-600 hover:bg-primary-50 font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm"
                                >
                                    Add to Interview Queue
                                </button>
                                <button
                                    type="button"
                                    disabled={isLaunching}
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsLaunching(true);
                                        try {
                                            // 1. Load rooms and find an available one
                                            await useRoomStore.getState().loadRooms(true);
                                            const rooms = useRoomStore.getState().rooms;
                                            const availableRoom = rooms.find(r => r.status === 'AVAILABLE' && r.is_active);
                                            if (!availableRoom) {
                                                alert('No available interview rooms. Please free up a room first.');
                                                setIsLaunching(false);
                                                return;
                                            }

                                            // 2. Assign applicant to the room
                                            await useRoomStore.getState().updateRoom(availableRoom.id, {
                                                status: 'OCCUPIED',
                                                current_application_id: applicant.id,
                                                current_applicant_name: applicant.applicant_name,
                                                occupied_since: new Date().toISOString()
                                            });

                                            // 3. Update applicant status
                                            await ApplicationService.updateStatus({
                                                id: applicant.id,
                                                toStatus: 'INTERVIEW_IN_PROGRESS' as any,
                                                changedByName: 'Recruiter',
                                                reason: 'Online interview initiated',
                                                patch: {
                                                    metadata: {
                                                        ...(applicant.metadata || {}),
                                                        interview_mode: 'ONLINE',
                                                        active_interview_type: 'INITIAL'
                                                    }
                                                }
                                            });

                                            // 4. Navigate to Interview Rooms — session will auto-open via room state
                                            const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
                                            navigate(`${basePath}/interview/rooms`, { 
                                                state: { autoOpenRoomId: availableRoom.id } 
                                            });
                                        } catch (err) {
                                            console.error('Failed to start online session', err);
                                            setIsLaunching(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-[#242424] border border-[#242424] text-white hover:bg-black font-bold text-[11px] uppercase tracking-wider rounded-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Video size={16} />
                                    {isLaunching ? 'Launching Session...' : 'Conduct Interview Online'}
                                </button>
                            </div>
                        )}

                        {applicant.current_status === 'INITIAL_INTERVIEW' && (
                            <button
                                onClick={() => setShowEvaluationResults(true)}
                                className="w-full py-4 bg-surface-50 border border-surface-200 text-surface-600 hover:bg-surface-100 font-bold text-[10px] uppercase tracking-wider rounded-sm transition-all"
                            >
                                View Detailed Evaluation
                            </button>
                        )}

                        <div className="pt-4 space-y-3">
                            {showRejectionPrompt ? (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 bg-red-50 border border-red-100 rounded-sm space-y-4"
                                >
                                    <div>
                                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">
                                            Rejection Reason
                                        </p>
                                        <textarea
                                            value={rejectionReasonInput}
                                            onChange={e => setRejectionReasonInput(e.target.value)}
                                            placeholder="Provide specific feedback on why the candidate did not pass this stage..."
                                            className="w-full p-4 bg-white border border-red-100 rounded-sm text-xs font-medium text-surface-900 focus:outline-none focus:border-red-500 h-28 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                if (rejectionReasonInput.trim()) {
                                                    handlePromote(applicant, 'fail', rejectionReasonInput);
                                                    setShowRejectionPrompt(false);
                                                    setRejectionReasonInput('');
                                                }
                                            }}
                                            disabled={!rejectionReasonInput.trim()}
                                            className="flex-1 py-3.5 bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-red-700 transition-all disabled:opacity-50"
                                        >
                                            Confirm Rejection
                                        </button>
                                        <button
                                            onClick={() => setShowRejectionPrompt(false)}
                                            className="px-6 py-3.5 bg-white border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handlePromote(applicant, 'pass')}
                                        className="py-4 bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-emerald-700 transition-all shadow-sm"
                                    >
                                        Pass Stage
                                    </button>
                                    <button
                                        onClick={() => setShowRejectionPrompt(true)}
                                        className="py-4 bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-sm hover:bg-red-700 transition-all shadow-sm"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}

                            {/* Regression System */}
                            {!showRejectionPrompt && (
                                <div className="mt-10 pt-8 border-t border-surface-100">
                                    {showRegressPrompt ? (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-6 bg-orange-50 border border-orange-200 rounded-sm space-y-4"
                                        >
                                            <div className="text-orange-700 font-bold text-[10px] uppercase tracking-wider">
                                                Stage Regression Notice
                                            </div>
                                            <p className="text-[12px] text-orange-900 font-medium leading-relaxed">
                                                Are you certain you want to move this candidate back to the previous stage? 
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { onRegress(applicant); setShowRegressPrompt(false); }}
                                                    className="flex-1 py-3 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-orange-700 transition-all shadow-sm"
                                                >
                                                    Move Back
                                                </button>
                                                <button onClick={() => setShowRegressPrompt(false)} className="px-6 py-3 bg-white border border-orange-200 text-orange-600 font-bold text-[10px] uppercase tracking-wider rounded-sm">
                                                    Abort
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <button
                                            onClick={() => setShowRegressPrompt(true)}
                                            className="w-full py-3 text-surface-400 hover:text-orange-600 hover:bg-orange-50/50 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            Return to Previous Stage
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {['APPLIED', 'TYPING_TEST'].includes(applicant.current_status) ? (
                            <div className="p-8 bg-surface-50 border border-surface-200 rounded-sm text-center">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-2">Stage Pending</p>
                                <p className="text-sm text-surface-500 font-medium">Please complete the Typing Test stage first.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 bg-surface-50 border border-surface-100 text-surface-600 rounded-sm text-sm font-medium">
                                    {applicant.current_status === 'REJECTED' ? 'Applicant has been REJECTED at this stage.' : 'Stage completed. Candidate has moved to assessment.'}
                                </div>
                                {applicant.rejection_reason && (
                                    <div className="p-5 bg-white border border-red-200 rounded-sm text-left relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">
                                            Rejection Reason
                                        </p>
                                        <p className="text-xs font-medium text-surface-800 leading-relaxed">"{applicant.rejection_reason}"</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
            
            {onDelete && (
                <div className="mt-20 pt-10 border-t border-surface-100 flex flex-col items-center">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Danger Zone</p>
                    <button
                        onClick={() => onDelete(applicant)}
                        className="px-8 py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-500 font-bold text-[10px] uppercase tracking-[0.15em] transition-all rounded-sm shadow-sm"
                    >
                        Permanently Delete Record
                    </button>
                    <p className="text-[9px] font-medium text-surface-400 mt-3 italic">This action will purge all candidate intelligence dossiers.</p>
                </div>
            )}
        </div>
    );
};
