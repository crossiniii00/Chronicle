import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, AlertCircle, UserCheck } from 'lucide-react';
import { useLoading } from '@/components/common/useLoading';
import { UserService } from '@/services/UserService';
import type { User } from '@/types/user';

interface QueuePromptModalProps {
    showQueuePrompt: { 
        id: string; 
        name: string; 
        applicantUserId: string; 
        queueType: 'INITIAL' | 'FINAL';
        department?: string;
        opsValidatorId?: string;
    };
    setShowQueuePrompt: (val: any) => void;
    confirmQueue: (assignedInterviewer?: { id: string; name: string }) => void;
}

export function QueuePromptModal({
    showQueuePrompt, setShowQueuePrompt, confirmQueue
}: QueuePromptModalProps) {
    const { isLoading } = useLoading();
    const isQueueing = isLoading;
    const [guests, setGuests] = React.useState<User[]>([]);
    const [selectedGuestId, setSelectedGuestId] = React.useState<string>(showQueuePrompt.opsValidatorId || '');
    const [loadingGuests, setLoadingGuests] = React.useState(false);

    React.useEffect(() => {
        loadInterviewerOptions();
    }, [showQueuePrompt]);

    const loadInterviewerOptions = async () => {
        setLoadingGuests(true);
        try {
            const allUsers = await UserService.getAll();
            let filteredList: User[] = [];
            
            if (showQueuePrompt.queueType === 'FINAL') {
                filteredList = allUsers.filter(u => {
                    if (u.role !== 'ops_validator') return false;
                    if (u.id === showQueuePrompt.opsValidatorId) return true;
                    if (!u.department) return false;
                    const userDepts = u.department.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
                    const targetDept = showQueuePrompt.department?.trim().toLowerCase();
                    return targetDept ? userDepts.includes(targetDept) : false;
                });
            } else {
                // For INITIAL queue, show all Recruiter roles
                filteredList = allUsers.filter(u => 
                    u.role.startsWith('recruiter_')
                );
            }

            // Sort: Assigned or current user first if applicable
            const sorted = [...filteredList].sort((a, b) => {
                if (showQueuePrompt.queueType === 'FINAL' && a.id === showQueuePrompt.opsValidatorId) return -1;
                if (showQueuePrompt.queueType === 'FINAL' && b.id === showQueuePrompt.opsValidatorId) return 1;
                return 0;
            });

            setGuests(sorted);
        } catch (error) {
            console.error('Failed to load interviewer options:', error);
        } finally {
            setLoadingGuests(false);
        }
    };

    const handleConfirm = () => {
        const selected = guests.find(g => g.id === selectedGuestId);
        if (selected) {
            confirmQueue({ id: selected.id, name: selected.full_name });
        } else {
            confirmQueue();
        }
    };

    const isReassigned = showQueuePrompt.queueType === 'FINAL' && 
                        showQueuePrompt.opsValidatorId && 
                        selectedGuestId && 
                        selectedGuestId !== showQueuePrompt.opsValidatorId;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isQueueing && setShowQueuePrompt(null)}
                className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-lg bg-white border border-[#edebe9] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden"
            >
                <div className="p-10 space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="w-14 h-14 bg-[#f3f2f1] rounded-sm flex items-center justify-center mx-auto border border-[#edebe9] mb-2">
                            <Clock3 size={24} className="text-[#0078d4]" />
                        </div>
                        <h2 className="text-xl font-bold text-[#323130] tracking-tight uppercase flex items-center justify-center gap-2">
                            {showQueuePrompt.queueType === 'FINAL' ? 'Add to Final Queue' : 'Add to Initial Queue'}
                        </h2>
                        <p className="text-[#605e5c] font-medium text-[12px] uppercase tracking-wide">
                            Add <span className="text-[#0078d4] font-bold">{showQueuePrompt.name}</span> to the {showQueuePrompt.queueType.toLowerCase()} interview queue?
                        </p>
                    </div>

                    {showQueuePrompt.queueType === 'FINAL' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider flex items-center gap-2">
                                    <UserCheck size={14} className="text-[#0078d4]" /> 
                                    Select OPS Validator
                                </label>
                                <select
                                    disabled={isQueueing || loadingGuests}
                                    value={selectedGuestId}
                                    onChange={(e) => setSelectedGuestId(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f3f2f1] border border-[#edebe9] rounded-sm text-xs focus:outline-none focus:border-[#0078d4] font-bold uppercase tracking-wider outline-none transition-all"
                                >
                                    <option value="">Select Validator...</option>
                                    {guests.map((guest) => (
                                        <option key={guest.id} value={guest.id}>
                                            {guest.full_name} ({guest.department || 'HR'}) {guest.id === showQueuePrompt.opsValidatorId ? '— ENDORSED' : ''}
                                        </option>
                                    ))}
                                </select>
                                {loadingGuests && <p className="text-[9px] text-[#0078d4] font-bold animate-pulse">Loading recipients...</p>}
                            </div>

                            <AnimatePresence>
                                {isReassigned && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-4 bg-orange-50 border border-orange-200 rounded-sm"
                                    >
                                        <div className="flex gap-3">
                                            <AlertCircle size={16} className="text-orange-600 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-orange-900 uppercase leading-none">Reassignment Warning</p>
                                                <p className="text-[9px] text-orange-700 font-medium leading-relaxed">
                                                    This interviewer differs from the initially endorsed OPS Validator.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            disabled={isQueueing}
                            onClick={() => setShowQueuePrompt(null)}
                            className="flex-1 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#605e5c] border border-[#edebe9] rounded-sm hover:bg-[#f3f2f1] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isQueueing || (showQueuePrompt.queueType === 'FINAL' && !selectedGuestId)}
                            onClick={handleConfirm}
                            className="flex-[2] px-6 py-3 bg-[#0078d4] text-white text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm hover:bg-[#005a9e] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {showQueuePrompt.queueType === 'FINAL' ? 'Add to Final Queue' : 'Add to Queue'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
