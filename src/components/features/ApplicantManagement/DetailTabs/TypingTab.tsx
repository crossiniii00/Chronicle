import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Keyboard, Gauge, Target, Clock, TrendingUp, Award, Zap, CheckCircle2, Copy, Check, RefreshCw, Settings } from 'lucide-react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { TypingTestTab } from '@/pages/admin/ProjectRSettings/TypingTestTab';
import axios from 'axios';

interface TypingTabProps {
    applicant: Application;
    onQueue: (app: Application, type: 'INITIAL' | 'FINAL') => void;
    handlePromote?: (app: Application, result: 'pass' | 'fail', reason?: string) => void;
    handleUpdateApplication?: (id: string, patch: any) => void;
    isEditing?: boolean;
    setIsEditing?: (isEditing: boolean) => void;
}

export const TypingTab: React.FC<TypingTabProps> = ({ applicant, onQueue, handlePromote, handleUpdateApplication, isEditing, setIsEditing }) => {
    const [localIsEditing, setLocalIsEditing] = useState(false);
    const editing = isEditing !== undefined ? isEditing : localIsEditing;
    const setEditing = setIsEditing !== undefined ? setIsEditing : setLocalIsEditing;
    const [showRejectionPrompt, setShowRejectionPrompt] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Local state for editing to prevent immediate auto-advance
    const [localWpm, setLocalWpm] = useState(applicant.typing_test_wpm?.toString() || '');
    const [localAcc, setLocalAcc] = useState(applicant.typing_test_accuracy?.toString() || '');
    const [localDuration, setLocalDuration] = useState(applicant.typing_test_duration_seconds?.toString() || '');

    const wpm = Number(applicant.typing_test_wpm) || 0;
    const accuracy = Number(applicant.typing_test_accuracy) || 0;
    const duration = applicant.typing_test_duration_seconds || 0;
    const minutes = Math.round(duration / 60);
    const seconds = (duration % 60).toString().padStart(2, '0');

    const displayWpm = wpm;
    const displayAccuracy = accuracy;
    const displayDuration = duration;

    const level = displayWpm >= 60 ? 'Expert' : displayWpm >= 45 ? 'Advanced' : displayWpm >= 30 ? 'Intermediate' : 'Beginner';
    const levelColor = displayWpm >= 60 ? 'text-emerald-500' : displayWpm >= 45 ? 'text-blue-500' : displayWpm >= 30 ? 'text-amber-500' : 'text-red-400';
    const levelBg = displayWpm >= 60 ? 'bg-emerald-500' : displayWpm >= 45 ? 'bg-blue-500' : displayWpm >= 30 ? 'bg-amber-500' : 'bg-red-400';

    React.useEffect(() => {
        if (!editing) return;
    }, [editing]);

    const handleFieldChange = (field: keyof Application, val: number) => {
        if (handleUpdateApplication) {
            handleUpdateApplication(applicant.id, { [field]: val });
        }
    };

    // WPM gauge: % fill (max scale = 80 WPM)
    const wpmPercent = Math.min(100, Math.round((displayWpm / 80) * 100));
    const accPercent = Math.min(100, Math.round(displayAccuracy));

    const analysis = displayWpm >= 60
        ? 'Excellent typing speed, highly suitable for data entry and customer support roles.'
        : displayWpm >= 45
            ? 'Good typing proficiency with solid accuracy. Meets requirements for most operational roles.'
            : displayWpm >= 30
                ? 'Average typing speed. Additional practice recommended before deployment.'
                : 'Below average speed. Requires improvement for operational readiness.';

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSyncCPType = async () => {
        if (!applicant.pis?.email) {
            setSyncMessage({ text: 'Applicant email is required for sync', type: 'error' });
            return;
        }

        setIsSyncing(true);
        setSyncMessage(null);

        try {
            const upperEmail = applicant.pis.email.trim().toUpperCase();
            const url = 'https://firestore.googleapis.com/v1/projects/cptypefinal/databases/(default)/documents:runQuery';
            const query = {
                structuredQuery: {
                    from: [{ collectionId: 'applicant_results' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'applicantEmail' },
                            op: 'EQUAL',
                            value: { stringValue: upperEmail }
                        }
                    }
                }
            };

            const res = await axios.post(url, query);
            const docs = (res.data || [])
                .filter((item: any) => item.document)
                .map((item: any) => item.document);

            if (docs.length === 0) {
                setSyncMessage({ text: 'No typing test results found on CPType server.', type: 'error' });
                setIsSyncing(false);
                return;
            }

            docs.sort((a: any, b: any) => {
                const timeA = new Date(a.fields.createdAt?.timestampValue || a.fields.createdAt?.stringValue || 0).getTime();
                const timeB = new Date(b.fields.createdAt?.timestampValue || b.fields.createdAt?.stringValue || 0).getTime();
                return timeB - timeA;
            });

            const latestDoc = docs[0];
            const fields = latestDoc.fields;
            const fetchedWpm = fields.wpm ? parseInt(fields.wpm.integerValue || fields.wpm.doubleValue || fields.wpm.stringValue || '0', 10) : 0;
            const fetchedAccuracy = fields.accuracy ? parseInt(fields.accuracy.integerValue || fields.accuracy.doubleValue || fields.accuracy.stringValue || '0', 10) : 0;

            if (handleUpdateApplication) {
                handleUpdateApplication(applicant.id, {
                    typing_test_wpm: fetchedWpm,
                    typing_test_accuracy: fetchedAccuracy,
                    typing_test_duration_seconds: 60,
                    typing_test_completed_at: latestDoc.fields.createdAt?.timestampValue || latestDoc.fields.createdAt?.stringValue || new Date().toISOString()
                });
                setSyncMessage({ text: 'Typing test data synced successfully!', type: 'success' });
            } else {
                setSyncMessage({ text: 'Update handler not provided.', type: 'error' });
            }

        } catch (error) {
            console.error('Error syncing CPType:', error);
            setSyncMessage({ text: 'Failed to sync with CPType server.', type: 'error' });
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    if (!applicant.typing_test_wpm && !editing) {
        const name = applicant.applicant_name || '';
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const email = applicant.pis?.email || '';

        const link = `https://cptypefinal.web.app/?name=${encodeURIComponent(name)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&email=${encodeURIComponent(email)}`;
        const handleCopy = () => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <>

                <div className="max-w-2xl mx-auto py-16 text-center space-y-6 relative z-[30]">
                    <div className="flex flex-col items-center relative z-[30]">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-surface-100 mb-5 border border-surface-200">
                            <Keyboard size={28} className="text-surface-300" />
                        </div>
                        <h3 className="text-lg font-bold text-surface-800 tracking-tight mb-2">No Typing Test Data</h3>
                        <p className="text-sm text-surface-400 font-medium max-w-sm mx-auto leading-relaxed">
                            This applicant has not completed the typing assessment yet. Results will appear here once submitted.
                        </p>
                    </div>

                    <div className="max-w-md mx-auto bg-surface-50 border border-surface-200 p-5 text-left rounded-sm space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-surface-450 block font-semibold">CPType Assessment Link</span>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={link}
                                className="flex-1 bg-white dark:bg-slate-900 border border-surface-250 px-3 py-2 text-xs text-surface-755 font-mono rounded-sm outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-4 bg-white dark:bg-slate-900 border border-surface-300 text-surface-650 hover:text-black rounded-sm flex items-center justify-center transition-colors text-xs font-bold gap-1 min-w-[70px]"
                            >
                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>

                        <div className="pt-4 border-t border-surface-200 flex flex-col gap-2">
                            <button
                                onClick={handleSyncCPType}
                                disabled={isSyncing}
                                className="w-full flex items-center justify-center gap-2 bg-[#ef3e36] hover:bg-[#d32f2f] disabled:bg-surface-300 text-white py-2.5 rounded-sm transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                                <span>{isSyncing ? 'Syncing...' : 'Sync from CPType Server'}</span>
                            </button>

                            {handleUpdateApplication && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-surface-300 hover:bg-surface-50 text-surface-700 py-2.5 rounded-sm transition-colors text-xs font-bold uppercase tracking-wider"
                                >
                                    <span>Manually Enter Scores</span>
                                </button>
                            )}

                            {syncMessage && (
                                <p className={cn(
                                    "text-[10px] text-center mt-2 font-bold",
                                    syncMessage.type === 'error' ? "text-red-500" : "text-emerald-600"
                                )}>
                                    {syncMessage.text}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const isNoShow = String(applicant.current_status || '').toLowerCase().includes('no show') ||
        String(applicant.current_status || '').toLowerCase().includes('noshow') ||
        String(applicant.current_status || '').toLowerCase().includes('no_show');

    const handleContinueApplication = async () => {
        try {
            const { ApplicationService } = await import('@/services/ApplicationService');
            await ApplicationService.updateStatus({
                id: applicant.id,
                toStatus: 'TYPING_TEST',
                fromStatus: applicant.current_status,
                changedByName: 'Recruiter',
                reason: 'Continued application from No Show',
                patch: {
                    current_status: 'TYPING_TEST',
                    pis: {
                        ...(applicant.pis || {}),
                        final_specific_status: 'Pending',
                        last_updated_by: 'System (Resume)'
                    },
                    metadata: {
                        ...(applicant.metadata || {}),
                        no_show_category: null,
                        final_specific_status: 'Pending'
                    }
                }
            });
            if (handleUpdateApplication) {
                await handleUpdateApplication(applicant.id, {
                    current_status: 'TYPING_TEST',
                    pis: {
                        ...(applicant.pis || {}),
                        final_specific_status: 'Pending'
                    },
                    metadata: {
                        ...(applicant.metadata || {}),
                        no_show_category: null,
                        final_specific_status: 'Pending'
                    }
                });
            }
        } catch (err) {
            console.error('Failed to continue application from typing tab:', err);
        }
    };

    const pendingRetake = applicant.metadata?.pending_typing_retake;

    const handleAcceptRetake = async () => {
        if (!handleUpdateApplication || !pendingRetake) return;
        try {
            if (pendingRetake.isPassed) {
                const { ApplicationService } = await import('@/services/ApplicationService');
                await ApplicationService.updateStatus({
                    id: applicant.id,
                    toStatus: 'INITIAL_INTERVIEW',
                    fromStatus: applicant.current_status,
                    changedByName: 'Recruiter',
                    reason: 'Accepted passing retake submission',
                    patch: {
                        current_status: 'INITIAL_INTERVIEW',
                        typing_test_wpm: pendingRetake.wpm,
                        typing_test_accuracy: pendingRetake.accuracy,
                        typing_test_duration_seconds: pendingRetake.duration,
                        typing_test_completed_at: pendingRetake.submittedAt,
                        typing_test_passed: true,
                        pis: {
                            ...(applicant.pis || {}),
                            final_specific_status: 'Pending',
                        },
                        metadata: {
                            ...(applicant.metadata || {}),
                            reapplication_passed: true,
                            pending_typing_retake: null
                        }
                    }
                });
                
                // Update local state if needed
                await handleUpdateApplication(applicant.id, {
                    current_status: 'INITIAL_INTERVIEW',
                    typing_test_wpm: pendingRetake.wpm,
                    typing_test_accuracy: pendingRetake.accuracy,
                    typing_test_duration_seconds: pendingRetake.duration,
                    typing_test_completed_at: pendingRetake.submittedAt,
                    typing_test_passed: true,
                    pis: {
                        ...(applicant.pis || {}),
                        final_specific_status: 'Pending',
                    },
                    metadata: {
                        ...(applicant.metadata || {}),
                        reapplication_passed: true,
                        pending_typing_retake: null
                    }
                });
            } else {
                await handleUpdateApplication(applicant.id, {
                    typing_test_wpm: pendingRetake.wpm,
                    typing_test_accuracy: pendingRetake.accuracy,
                    typing_test_duration_seconds: pendingRetake.duration,
                    typing_test_completed_at: pendingRetake.submittedAt,
                    typing_test_passed: false,
                    metadata: {
                        ...(applicant.metadata || {}),
                        reapplication_passed: false,
                        pending_typing_retake: null
                    }
                });
            }
        } catch (err) {
            console.error('Failed to accept retake:', err);
        }
    };

    const handleRejectRetake = async () => {
        if (!handleUpdateApplication || !pendingRetake) return;
        try {
            await handleUpdateApplication(applicant.id, {
                metadata: {
                    ...(applicant.metadata || {}),
                    pending_typing_retake: null
                }
            });
        } catch (err) {
            console.error('Failed to reject retake:', err);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {(() => {
                const revertedData = applicant.metadata?.reverted_stages?.TYPING_TEST;
                if (!revertedData) return null;
                return (
                    <div className="mb-6 relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">Previous Score Available</h4>
                                <p className="text-xs text-amber-700 font-medium mt-0.5">
                                    Candidate was reverted. Previous score: <strong className="text-amber-900">{revertedData.typing_test_wpm} WPM</strong> / <strong className="text-amber-900">{revertedData.typing_test_accuracy}% Acc</strong>.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                if (handleUpdateApplication) {
                                    const { typing_test_wpm, typing_test_accuracy, typing_test_duration_seconds, typing_test_completed_at, typing_speed_num, typing_accuracy_pct } = revertedData;
                                    const newRevertedStages = { ...(applicant.metadata?.reverted_stages || {}) };
                                    delete newRevertedStages.TYPING_TEST;
                                    
                                    await handleUpdateApplication(applicant.id, {
                                        typing_test_wpm,
                                        typing_test_accuracy,
                                        typing_test_duration_seconds,
                                        typing_test_completed_at,
                                        pis: {
                                            ...(applicant.pis || {}),
                                            typing_speed_num,
                                            typing_accuracy_pct
                                        },
                                        metadata: {
                                            ...(applicant.metadata || {}),
                                            reverted_stages: newRevertedStages
                                        }
                                    });
                                }
                            }}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
                        >
                            <RefreshCw size={14} />
                            <span>Undo Reversal</span>
                        </button>
                    </div>
                );
            })()}
            {isNoShow && (
                <div className="mb-6 relative bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 p-6 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                            !
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-red-900 uppercase tracking-wide">Candidate Marked as No Show</h4>
                            <p className="text-xs text-surface-600 font-medium mt-0.5">
                                This candidate is currently marked as No Show. You can continue their application to reactivate them into the pipeline.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleContinueApplication}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
                    >
                        <span>Continue Application</span>
                    </button>
                </div>
            )}
            
            {pendingRetake && (
                <div className="mb-6 relative bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">
                            !
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-blue-900 uppercase tracking-wide">Pending Retake Submitted</h4>
                            <p className="text-xs text-surface-700 font-medium mt-0.5">
                                Candidate submitted a new test: <strong className="text-blue-900">{pendingRetake.wpm} WPM</strong> / <strong className="text-blue-900">{pendingRetake.accuracy}% Acc</strong>.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleRejectRetake}
                            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-red-50 text-red-600 border border-red-200 text-xs font-black uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                            Reject
                        </button>
                        <button
                            onClick={handleAcceptRetake}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            )}
            

            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-none bg-primary-900 border border-primary-800">
                    <Keyboard size={18} className="text-white" />
                </div>
                <div>
                    <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-surface-900 tracking-tight uppercase">Typing Assessment</h3>
                        {handleUpdateApplication && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (editing) {
                                        // Save changes
                                        if (handleUpdateApplication) {
                                            handleUpdateApplication(applicant.id, {
                                                typing_test_wpm: parseInt(localWpm, 10) || 0,
                                                typing_test_accuracy: parseFloat(localAcc) || 0,
                                                typing_test_duration_seconds: parseInt(localDuration, 10) || 0
                                            });
                                        }
                                    }
                                    setEditing(!editing);
                                }}
                                className="text-[10px] font-black uppercase tracking-wider text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-sm border border-primary-200/50 transition-colors"
                            >
                                {editing ? 'Save' : 'Edit'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSyncCPType}
                            disabled={isSyncing}
                            className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-sm border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw size={10} className={cn(isSyncing && "animate-spin")} />
                            {isSyncing ? 'Syncing...' : 'Sync Score'}
                        </button>
                        {editing && (
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="text-[10px] font-black uppercase tracking-wider text-surface-600 bg-surface-50 hover:bg-surface-100 px-2.5 py-1 rounded-sm border border-surface-200 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-surface-400 font-medium mt-0.5">
                        {applicant.typing_test_completed_at
                            ? `Completed ${new Date(applicant.typing_test_completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}`
                            : 'Completion date unavailable'}
                    </p>
                </div>
                <div className="ml-auto">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest text-white",
                        levelBg
                    )}>
                        <Award size={11} />
                        {level}
                    </span>
                </div>
            </div>

            {syncMessage && (
                <div className={cn(
                    "mb-4 p-3 border text-xs font-bold rounded-sm text-center",
                    syncMessage.type === 'error' ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                )}>
                    {syncMessage.text}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* WPM Card */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge size={14} className="text-primary-600" />
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Words per Minute</span>
                    </div>
                    <h1 className="text-4xl font-black text-surface-900 leading-none mb-3">
                        {editing ? (
                            <input
                                type="number"
                                value={localWpm}
                                onChange={(e) => setLocalWpm(e.target.value)}
                                className="w-24 text-center border border-surface-300 rounded"
                            />
                        ) : wpm}
                        <span className="text-sm font-bold text-surface-300 ml-2">WPM</span>
                    </h1>
                    <div className="w-full h-2 bg-surface-100 rounded-none overflow-hidden border border-surface-200">
                        <div
                            className="h-full rounded-none bg-surface-900 transition-all duration-1000"
                            style={{ width: `${wpmPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-surface-300 font-bold">0</span>
                        <span className="text-[9px] text-surface-300 font-bold">80+</span>
                    </div>
                </div>

                {/* Accuracy Card */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Target size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Accuracy Rate</span>
                    </div>
                    <h3 className="text-4xl font-black text-surface-900 leading-none mb-3">
                        {editing ? (
                            <input
                                type="number"
                                value={localAcc}
                                onChange={(e) => setLocalAcc(e.target.value)}
                                className="w-24 text-center border border-surface-300 rounded"
                            />
                        ) : accuracy}
                        <span className="text-sm font-bold text-surface-300 ml-2">%</span>
                    </h3>
                    <div className="w-full h-2 bg-surface-100 rounded-none overflow-hidden border border-surface-200">
                        <div
                            className={cn(
                                "h-full rounded-none transition-all duration-1000",
                                accPercent >= 95 ? "bg-emerald-600" :
                                    accPercent >= 85 ? "bg-blue-600" :
                                        "bg-amber-600"
                            )}
                            style={{ width: `${accPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-surface-300 font-bold">0%</span>
                        <span className="text-[9px] text-surface-300 font-bold">100%</span>
                    </div>
                </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Duration */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-violet-50 border border-violet-100">
                        <Clock size={18} className="text-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-surface-900 leading-none tracking-tight">
                            {editing ? (
                            <input
                                type="number"
                                value={localDuration}
                                onChange={(e) => setLocalDuration(e.target.value)}
                                className="w-24 text-center border border-surface-300 rounded"
                                placeholder="seconds"
                            />
                        ) : (
                            `${minutes}:${seconds}`
                        )}</h3>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Duration</div>
                    </div>
                </div>

                {/* Level */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-amber-50 border border-amber-100">
                        <TrendingUp size={18} className="text-amber-500" />
                    </div>
                    <div>
                        <div className={cn("text-xl font-black leading-none", levelColor)}>{level}</div>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Proficiency</div>
                    </div>
                </div>

                {/* Net Speed */}
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-4 flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-none bg-sky-50 border border-sky-100">
                        <Zap size={18} className="text-sky-500" />
                    </div>
                    <div>
                        <div className="text-xl font-black text-surface-900 leading-none">{Math.round(displayWpm * (displayAccuracy / 100))}</div>
                        <div className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">Net WPM</div>
                    </div>
                </div>
            </div>

            {/* Performance Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none p-5 mb-6">
                <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-none bg-primary-50 mt-0.5 shrink-0 border border-primary-100">
                        <CheckCircle2 size={16} className="text-primary-500" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1.5">Performance Analysis</div>
                        <p className="text-sm text-surface-700 font-medium leading-relaxed">{analysis}</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons or Concluded View */}
            {(() => {
                const currentStatus = applicant.current_status?.toUpperCase() || '';
                const isOngoing = ['APPLIED', 'TYPING_TEST'].includes(currentStatus);
                const isRejectedOrFailed = ['REJECTED', 'FAILED'].includes(currentStatus);
                const isConcluded = !isOngoing || isRejectedOrFailed;

                if (!isConcluded) {
                    return handlePromote ? (
                        <div className="mt-8 pt-8 border-t border-surface-100">
                            {showRejectionPrompt ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 bg-red-50/50 border border-red-100 rounded-sm space-y-4"
                                >
                                    <div>
                                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2">
                                            Rejection Reason
                                        </p>
                                        <textarea
                                            value={rejectionReasonInput}
                                            onChange={e => setRejectionReasonInput(e.target.value)}
                                            placeholder="Provide specific feedback on why the candidate did not pass the typing test..."
                                            className="w-full p-4 bg-white dark:bg-slate-900 border border-red-100 rounded-sm text-xs font-medium text-surface-900 focus:outline-none focus:border-red-500 h-28 resize-none"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                if (rejectionReasonInput.trim()) {
                                                    handlePromote?.(applicant, 'fail', rejectionReasonInput);
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
                                            className="px-6 py-3.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-600 font-bold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handlePromote?.(applicant, 'pass')}
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
                        </div>
                    ) : null;
                }

                // Concluded View — determine if the typing test was the stage that failed
                const failedAtTyping = isRejectedOrFailed && (
                    applicant.failure_details?.from_status === 'TYPING_TEST' ||
                    applicant.failure_details?.from_status === 'APPLIED' ||
                    String(applicant.pis?.final_specific_status || applicant.metadata?.final_specific_status || '').toLowerCase().includes('typing') ||
                    (!applicant.typing_test_wpm && !applicant.typing_test_completed_at)
                );
                const isFailedResult = failedAtTyping;
                const containerBg = isFailedResult ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200';
                const accentColor = isFailedResult ? 'bg-red-500' : 'bg-emerald-500';
                const labelColor = isFailedResult ? 'text-red-500' : 'text-emerald-600';
                const textColor = isFailedResult ? 'text-red-700' : 'text-emerald-800';
                const resultText = isFailedResult ? 'REJECTED' : 'PASSED';

                return (
                    <div className="mt-8 pt-8 border-t border-surface-100">
                        <div className={cn("p-6 border rounded-sm relative overflow-hidden", containerBg)}>
                            <div className={cn("absolute top-0 left-0 w-1 h-full", accentColor)} />
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", labelColor)}>Stage Result</p>
                                    <h4 className={cn("text-lg font-black tracking-tight", textColor)}>
                                        {resultText}
                                    </h4>
                                    {!isFailedResult && wpm > 0 && (
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-[10px] font-bold text-emerald-600/80">
                                                {wpm} WPM
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600/80">
                                                {accuracy}% Accuracy
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-1">Evaluated By</p>
                                    <p className="text-sm font-bold text-surface-700">{applicant.failure_details?.changed_by_name || applicant.assigned_recruiter_name || 'System / Evaluator'}</p>
                                </div>
                            </div>
                            
                            {isFailedResult && applicant.rejection_reason && (
                                <div className="mt-4 pt-4 border-t border-red-200/50">
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Rejection Reason</p>
                                    <p className="text-xs font-medium text-red-900 leading-relaxed">"{applicant.rejection_reason}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {showSettingsModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-surface-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50 shrink-0">
                            <div className="flex items-center gap-2">
                                <Settings size={18} className="text-[#0078d4]" />
                                <h3 className="text-base font-bold text-surface-900">Typing Test Configuration</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSettingsModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-900 hover:bg-surface-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <TypingTestTab />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

