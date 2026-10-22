import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Radio, Play, Power, Trash2, Timer, ClipboardCheck, RefreshCw, Edit2, Image, Upload, Eye, CheckCircle2, XCircle, AlertCircle, Calendar, Building, User, Star, Award, Sparkles, Monitor, UserCheck, ShieldCheck, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import type { InterviewRoom, Application } from '@/types';
import { useAuthStore } from '@/store/authStore';

const PRESET_IMAGES = [
    { name: 'Glass Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Modern Lounge', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80' },
    { name: 'Boardroom', url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Cozy Workspace', url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80' }
];

function LiveTimer({ startTime, endTime }: { startTime: string | null; endTime: string | null }) {
    const [display, setDisplay] = useState('');
    const [isOvertime, setIsOvertime] = useState(false);

    useEffect(() => {
        if (!startTime) {
            setDisplay('');
            setIsOvertime(false);
            return;
        }
        
        const update = () => {
            const start = new Date(startTime).getTime();
            const end = endTime ? new Date(endTime).getTime() : start + 30 * 60 * 1000;
            const now = new Date().getTime();
            
            const remainingSeconds = Math.floor((end - now) / 1000);
            
            if (remainingSeconds < 0) {
                setIsOvertime(true);
                const over = Math.abs(remainingSeconds);
                const m = Math.floor(over / 60);
                const s = over % 60;
                setDisplay(`+${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setIsOvertime(false);
                const m = Math.floor(remainingSeconds / 60);
                const s = remainingSeconds % 60;
                setDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime, endTime]);

    if (!display) return null;

    return (
        <span className={cn(
            "text-[9px] font-black tracking-wider tabular-nums bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-none shadow-sm border flex items-center gap-1 w-fit",
            isOvertime ? "text-rose-600 border-rose-200 animate-pulse" : "text-emerald-600 border-emerald-200"
        )}>
            <Timer size={10} className="shrink-0" />
            {display} {isOvertime ? 'OVER' : 'LEFT'}
        </span>
    );
}

interface RoomCardProps {
    room: InterviewRoom;
    application?: Application;
    onStart: () => void;
    onFree: () => void;
    onToggleActive: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onLogoClick?: () => void;
}

function getSingleOpsValidatorName(application?: Application, currentUser?: any): string {
    if (!application) return 'Not assigned';

    const meta = typeof application.metadata === 'string'
        ? (() => { try { return JSON.parse(application.metadata); } catch { return {}; } })()
        : (application.metadata || {});

    if (meta.active_ops_validator_name) return meta.active_ops_validator_name;
    if (meta.active_ops_validator) return meta.active_ops_validator;
    if (meta.evaluator_name) return meta.evaluator_name;

    const raw = application.assigned_ops_validator_name || meta.assigned_ops_validator_name || (application.pis as any)?.ops_validator_name || '';
    if (!raw || raw.trim() === '') return 'Not assigned';

    const names = raw.split(/[,;&|]+/).map((s: string) => s.trim()).filter(Boolean);
    if (names.length === 0) return 'Not assigned';
    if (names.length === 1) return names[0];

    if (currentUser?.full_name) {
        const uName = currentUser.full_name.trim().toLowerCase();
        const matched = names.find((n: string) => n.toLowerCase() === uName || uName.includes(n.toLowerCase()) || n.toLowerCase().includes(uName));
        if (matched) return matched;
    }

    return names[0];
}

export function RoomCard({ room, application, onStart, onFree, onToggleActive, onEdit, onDelete, onLogoClick }: RoomCardProps) {
    const { user } = useAuthStore();
    const isFinalInterview = (() => {
        if (!application) return false;
        const meta = typeof application.metadata === 'string' ? (() => { try { return JSON.parse(application.metadata); } catch { return {}; } })() : (application.metadata || {});
        if (meta.active_interview_type) {
            return meta.active_interview_type === 'FINAL';
        }
        const statusUpper = String(application.current_status || '').toUpperCase();
        if (statusUpper.includes('FINAL') || statusUpper === 'FINAL_INTERVIEW' || statusUpper === 'FINAL_INTERVIEW_SCHEDULED') return true;
        if (application.assigned_ops_validator_name || meta.assigned_ops_validator_name || meta.ops_validator_email || meta.active_ops_validator_name) return true;
        if (application.current_status === 'INITIAL_INTERVIEW') return false;
        return application.queue_type === 'FINAL';
    })();
    const isRecruiter = user?.role === 'recruiter' || user?.role === 'recruiter_interviewer';
    const sessionReadOnly = isFinalInterview && isRecruiter;
    const singleOpsValidatorName = getSingleOpsValidatorName(application, user);

    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 border border-surface-200 rounded-none transition-all hover:border-primary-300 group relative flex flex-col min-h-[300px] text-left overflow-hidden",
            !room.is_active && "opacity-65 grayscale bg-surface-50"
        )}>
            <div className={cn(
                "h-1.5 w-full shrink-0",
                !room.is_active ? "bg-surface-300" :
                    room.status === 'OCCUPIED' ? "bg-primary-600" :
                        room.status === 'AVAILABLE' ? "bg-emerald-500" : "bg-surface-300"
            )} />

            {/* Room Image */}
            <div 
                className="h-28 w-full overflow-hidden relative bg-surface-50 border-b border-surface-100 shrink-0 cursor-pointer"
                onClick={onLogoClick}
            >
                {room.image_url ? (
                    <img
                        src={room.image_url}
                        alt={room.room_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                        <DoorOpen size={28} className="text-surface-300" />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={cn(
                        "px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-wider border shadow-sm",
                        room.status === 'AVAILABLE' && room.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            room.status === 'OCCUPIED' ? "bg-primary-50 text-primary-700 border-primary-100" :
                                "bg-surface-50 text-surface-600 border-surface-200"
                    )}>
                        {!room.is_active ? 'Disabled' : (room.status === 'OCCUPIED' && isFinalInterview ? 'Ops validator occupied' : room.status)}
                    </span>
                </div>
            </div>

            {/* Room Details Header */}
            <div className="p-4 pb-2 flex items-start justify-between gap-3 text-left shrink-0">
                <div className="min-w-0 text-left">
                    <h3 className="text-sm font-black text-surface-900 group-hover:text-primary-700 transition-colors truncate text-left">
                        {room.room_name || `Room ${room.room_number}`}
                    </h3>
                    <p className="text-[9px] text-surface-400 font-black uppercase tracking-[0.14em] text-left">Room {room.room_number}</p>
                </div>
            </div>

            {/* Session Info / Body */}
            <div className="flex-1 px-4 text-left py-2">
                {room.status === 'OCCUPIED' && room.current_applicant_name ? (
                    <div className="p-3 bg-primary-50/60 border border-primary-100 rounded-none relative overflow-hidden text-left h-full flex flex-col justify-center gap-2">
                        <div className="flex flex-col gap-2 border-b border-primary-100 pb-2 shrink-0">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-[9px] text-primary-600 font-black uppercase tracking-wider flex items-center gap-1 text-left">
                                    <Radio size={10} className="animate-pulse text-left shrink-0" /> In Progress
                                </p>
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider border rounded-none shrink-0",
                                    isFinalInterview
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                    {isFinalInterview ? 'Final Interview' : 'Initial Interview'}
                                </span>
                            </div>
                            <LiveTimer startTime={room.occupied_since || null} endTime={room.occupied_until || null} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-widest text-left leading-none mb-1">Candidate</p>
                            <p className="text-xs font-black text-surface-900 truncate text-left">{room.current_applicant_name}</p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-bold text-surface-400 uppercase tracking-widest text-left leading-none mb-1">
                                {isFinalInterview ? 'Ops Validator' : 'Recruiter'}
                            </p>
                            <p className="text-[10px] font-bold text-surface-700 truncate text-left">
                                {isFinalInterview
                                    ? singleOpsValidatorName
                                    : (application?.assigned_recruiter_name || 'Not assigned')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[50px] flex flex-col justify-center border border-dashed border-surface-200 rounded-none p-3 bg-surface-50/60 text-left">
                        <p className="text-[9px] font-black text-surface-500 uppercase tracking-wider text-left">
                            {room.is_active ? 'Ready for Assignment' : 'Room Offline'}
                        </p>
                        <p className="text-[9px] font-medium text-surface-400 mt-0.5 text-left leading-tight">
                            {room.is_active ? 'No active interview session.' : 'Enable room to receive candidates.'}
                        </p>
                        {room.is_active && room.reservations && room.reservations.filter((res: any) => res.time_slot?.toLowerCase() !== 'immediate').length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-dashed border-surface-200 text-left">
                                <p className="text-[7.5px] font-extrabold text-surface-400 uppercase tracking-wider mb-1">Upcoming Reservations</p>
                                <div className="flex flex-wrap gap-1">
                                    {room.reservations
                                        .filter((res: any) => res.time_slot?.toLowerCase() !== 'immediate')
                                        .map((res: any, idx: number) => (
                                            <span 
                                                key={idx} 
                                                className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 text-[8.5px] font-bold rounded-sm"
                                                title={`Interviewer: ${res.interviewer_name} | Candidate: ${res.applicant_name}`}
                                            >
                                                {res.time_slot}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 pt-2 flex flex-col gap-2 text-left shrink-0">
                {room.status === 'OCCUPIED' && (
                    <button onClick={onStart} className="w-full h-8 px-4 bg-surface-900 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-black transition-all flex items-center justify-center gap-2 text-left border border-black shadow-sm">
                        {sessionReadOnly ? (
                            <>
                                <Eye size={11} /> View Progress
                            </>
                        ) : (
                            <>
                                <Play size={10} fill="currentColor" /> {(() => {
                                    const name = isFinalInterview
                                        ? singleOpsValidatorName
                                        : application?.assigned_recruiter_name;
                                    const inProgress = application?.current_status === 'INTERVIEW_IN_PROGRESS';
                                    return inProgress 
                                        ? (name && name !== 'Not assigned' ? `Reenter ${name}'s Room` : 'Reenter Room')
                                        : (name && name !== 'Not assigned' ? `${name}'s Room` : 'Enter Room');
                                })()}
                            </>
                        )}
                    </button>
                )}
                <div className="flex gap-2 text-left w-full">
                    {room.status === 'OCCUPIED' && !sessionReadOnly && (
                        <>
                            <button onClick={onFree} className="flex-1 h-8 px-2 bg-white dark:bg-slate-900 border border-emerald-600 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-none transition-all text-left">Clear</button>
                            <button onClick={onFree} className="flex-1 h-8 px-2 bg-white dark:bg-slate-900 border border-amber-600 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 rounded-none transition-all text-left" title="Move current session to drafts">Draft</button>
                        </>
                    )}
                    <button
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'}
                        onClick={onToggleActive}
                        className={cn(
                            "flex-1 h-8 px-2 bg-white dark:bg-slate-900 border border-surface-300 text-[9px] font-black uppercase tracking-widest text-surface-600 hover:bg-surface-50 rounded-none transition-all flex items-center justify-center gap-1",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Power size={11} />
                        {room.is_active ? 'OFF' : 'ON'}
                    </button>
                    <button
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'}
                        onClick={onEdit}
                        className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-surface-300 text-surface-600 hover:bg-surface-50 rounded-none transition-all text-left",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )}
                        title="Edit room"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        disabled={sessionReadOnly && room.status === 'OCCUPIED'}
                        onClick={onDelete}
                        className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-none transition-all text-left",
                            sessionReadOnly && room.status === 'OCCUPIED' && "opacity-50 cursor-not-allowed"
                        )}
                        title="Delete room"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface InterviewerSelectorProps {
    value: string;
    onChange: (name: string) => void;
    availableInterviewers?: string[];
    users?: any[];
    departments?: any[];
    applications?: any[];
}

export function InterviewerSelector({
    value,
    onChange,
    availableInterviewers = [],
    users = [],
    departments = [],
    applications = []
}: InterviewerSelectorProps) {
    const KNOWN = ['NVIDIA', 'AMD', 'MICROSOFT', 'APPLE', 'AMAZON', 'GOOGLE', 'AUTO APPROVE', 'ENERCARE'];

    // 1. Full list of target accounts
    const accountList = React.useMemo(() => {
        const set = new Set<string>(KNOWN);
        departments.forEach(d => { if (d.name) set.add(String(d.name).trim()); });
        applications.forEach(a => {
            const acc = a.department || a.endorsement_account || a.metadata?.target_account || a.pis?.target_account;
            if (acc && typeof acc === 'string') {
                acc.split(',').forEach(s => {
                    const clean = s.trim();
                    if (clean && !['onsite', 'on-site', 'oncall', 'on-call'].includes(clean.toLowerCase())) {
                        set.add(clean);
                    }
                });
            }
        });
        return Array.from(set).sort();
    }, [departments, applications]);

    // 2. Recruiters list (strictly exclude Ops Validators)
    const recruiterList = React.useMemo(() => {
        const set = new Set<string>();
        const opsNames = new Set<string>();

        // Identify all Ops Validator names
        users.forEach(u => {
            const role = String(u.role || '').toLowerCase();
            if (role === 'ops_validator' || role.includes('validator') || role.includes('ops')) {
                if (u.full_name) opsNames.add(u.full_name.trim());
            }
        });
        applications.forEach(a => {
            if (a.assigned_ops_validator_name) opsNames.add(a.assigned_ops_validator_name.trim());
            if (a.metadata?.assigned_ops_validator_name) opsNames.add(a.metadata.assigned_ops_validator_name.trim());
        });

        // Add recruiters from users list
        users.forEach(u => {
            const role = String(u.role || '').toLowerCase();
            if (u.full_name && !opsNames.has(u.full_name.trim()) && role !== 'ops_validator' && !role.includes('validator')) {
                set.add(u.full_name.trim());
            }
        });

        // Add assigned recruiters from applications
        applications.forEach(a => {
            if (a.assigned_recruiter_name && !opsNames.has(a.assigned_recruiter_name.trim())) {
                set.add(a.assigned_recruiter_name.trim());
            }
        });

        // Fallback from availableInterviewers if users array is empty
        availableInterviewers.forEach(n => {
            if (n && !opsNames.has(n.trim())) {
                set.add(n.trim());
            }
        });

        return Array.from(set).sort();
    }, [users, availableInterviewers, applications]);

    // 3. Ops Validators grouped
    const opsValData = React.useMemo(() => {
        const userOps = users.filter(u => {
            const role = String(u.role || '').toLowerCase();
            return u.full_name && (role === 'ops_validator' || role.includes('validator') || role.includes('ops'));
        }).map(u => ({
            name: u.full_name.trim(),
            accounts: (u.department || '').split(',').map((s: string) => s.trim().toUpperCase())
        }));

        const appOps: { name: string; account: string }[] = [];
        applications.forEach(a => {
            const name = a.assigned_ops_validator_name || a.metadata?.assigned_ops_validator_name;
            const acc = a.department || a.endorsement_account || a.metadata?.target_account;
            if (name && acc) {
                appOps.push({ name: name.trim(), account: String(acc).trim().toUpperCase() });
            }
        });

        return { userOps, appOps };
    }, [users, applications]);

    const isOpsVal = React.useMemo(() => {
        if (!value) return false;
        return opsValData.userOps.some(o => o.name === value) ||
               opsValData.appOps.some(a => a.name === value);
    }, [value, opsValData]);

    const [roleType, setRoleType] = useState<'recruiter' | 'ops_val'>(isOpsVal ? 'ops_val' : 'recruiter');
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    // Filter ops validators for chosen account
    const filteredOpsValidators = React.useMemo(() => {
        const set = new Set<string>();
        if (selectedAccount) {
            const targetUpper = selectedAccount.trim().toUpperCase();
            
            // Matches by user department
            opsValData.userOps.forEach(u => {
                if (u.accounts.length === 0 || u.accounts.includes(targetUpper) || u.accounts.includes('ALL')) {
                    set.add(u.name);
                }
            });

            // Matches by candidate application
            opsValData.appOps.forEach(a => {
                if (a.account.includes(targetUpper) || targetUpper.includes(a.account)) {
                    set.add(a.name);
                }
            });
        }

        // If no matches found or no account selected, include all ops validators
        if (set.size === 0) {
            opsValData.userOps.forEach(u => set.add(u.name));
            opsValData.appOps.forEach(a => set.add(a.name));
        }

        return Array.from(set).sort();
    }, [selectedAccount, opsValData]);

    return (
        <div className="space-y-3 text-left">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Assigned Interviewer / Ops Validator</label>
            
            {/* Role Choice */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setRoleType('recruiter');
                        setSelectedAccount('');
                    }}
                    className={cn(
                        "px-3 py-2 border text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        roleType === 'recruiter'
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                    )}
                >
                    <UserCheck size={14} /> Recruiter
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setRoleType('ops_val');
                    }}
                    className={cn(
                        "px-3 py-2 border text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        roleType === 'ops_val'
                            ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                    )}
                >
                    <ShieldCheck size={14} /> Ops Validator
                </button>
            </div>

            {/* Recruiter Selector */}
            {roleType === 'recruiter' && (
                <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Select Recruiter</label>
                    <div className="relative">
                        <select
                            value={value || ''}
                            onChange={e => onChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left shadow-sm appearance-none pr-8 cursor-pointer"
                        >
                            <option value="">-- Select Recruiter --</option>
                            {recruiterList.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Ops Validator Selector */}
            {roleType === 'ops_val' && (
                <div className="space-y-2.5 text-left bg-purple-50/40 p-3 rounded-xl border border-purple-100/80">
                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-bold text-purple-900">Target Account</label>
                        <div className="relative">
                            <select
                                value={selectedAccount}
                                onChange={e => {
                                    setSelectedAccount(e.target.value);
                                    onChange(''); // Reset selection to prompt choosing for this account
                                }}
                                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-left shadow-sm appearance-none pr-8 cursor-pointer text-purple-950"
                            >
                                <option value="">-- Select Target Account --</option>
                                {accountList.map(acc => (
                                    <option key={acc} value={acc}>{acc}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1 text-left">
                        <label className="block text-[10px] font-bold text-purple-900">
                            {selectedAccount ? `Ops Validator for ${selectedAccount}` : 'Ops Validator'}
                        </label>
                        <div className="relative">
                            <select
                                value={value || ''}
                                onChange={e => onChange(e.target.value)}
                                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-left shadow-sm appearance-none pr-8 cursor-pointer text-purple-950"
                            >
                                <option value="">
                                    {selectedAccount ? `-- Select Ops Val for ${selectedAccount} --` : '-- Select Target Account First --'}
                                </option>
                                {filteredOpsValidators.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface AddRoomModalProps {
    open: boolean;
    onClose: () => void;
    onAdd: () => void;
    newRoom: { room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string };
    setNewRoom: React.Dispatch<React.SetStateAction<{ room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string }>>;
    availableInterviewers?: string[];
    users?: any[];
    departments?: any[];
    applications?: any[];
    isSubmitting: boolean;
}

export function AddRoomModal({ open, onClose, onAdd, newRoom, setNewRoom, availableInterviewers = [], users = [], departments = [], applications = [], isSubmitting }: AddRoomModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setNewRoom(r => ({ ...r, image_url: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Modal open={open} onClose={onClose} title="Add New Interview Room" size="sm">
            <div className="relative overflow-hidden pt-2 p-1 text-left">
                <div className={cn("space-y-6 transition-all text-left", isSubmitting && "opacity-50 pointer-events-none")}>
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3 shadow-sm">
                        <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                            <DoorOpen size={16} className="text-indigo-600" />
                        </div>
                        <p className="text-[12px] font-medium text-indigo-900 leading-relaxed pt-0.5">Adding a new room allows recruiters to conduct interviews in this designated space.</p>
                    </div>

                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Number <span className="text-red-500">*</span></label>
                        <input value={newRoom.room_number} onChange={e => setNewRoom(r => ({ ...r, room_number: e.target.value }))} placeholder="e.g. 01" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left shadow-sm" />
                    </div>

                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Name</label>
                        <input value={newRoom.room_name} onChange={e => setNewRoom(r => ({ ...r, room_name: e.target.value }))} placeholder="e.g. Interview Room A" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left shadow-sm" />
                    </div>

                    {/* Interactive Recruiter / Ops Validator Selection */}
                    <InterviewerSelector
                        value={newRoom.assigned_interviewer_name || ''}
                        onChange={name => setNewRoom(r => ({ ...r, assigned_interviewer_name: name }))}
                        availableInterviewers={availableInterviewers}
                        users={users}
                        departments={departments}
                        applications={applications}
                    />

                    {/* Room Type */}
                    <div className="space-y-2 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setNewRoom(r => ({ ...r, room_type: 'onsite' }))}
                                className={cn(
                                    "px-4 py-3 border rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                                    (!newRoom.room_type || newRoom.room_type === 'onsite') 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                )}
                            >
                                <Building size={16} /> Onsite
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewRoom(r => ({ ...r, room_type: 'online' }))}
                                className={cn(
                                    "px-4 py-3 border rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                                    newRoom.room_type === 'online' 
                                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                                )}
                            >
                                <Monitor size={16} /> Online
                            </button>
                        </div>
                    </div>

                    {/* Room Picture Selection / Upload */}
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Picture</label>
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {newRoom.image_url ? (
                                    <img src={newRoom.image_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <DoorOpen size={24} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Upload size={14} /> Upload Custom
                                    </button>
                                    {newRoom.image_url && (
                                        <button
                                            type="button"
                                            onClick={() => setNewRoom(r => ({ ...r, image_url: '' }))}
                                            className="px-3 py-1.5 bg-red-50/50 border border-red-200 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">JPEG, PNG, or base64 data.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 text-left">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[12px] font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-all text-center shadow-sm cursor-pointer">Cancel</button>
                        <button onClick={onAdd} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-[12px] font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent cursor-pointer">
                            {isSubmitting ? <><RefreshCw size={14} className="animate-spin" /> Adding...</> : 'Add Room'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

interface EditRoomModalProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    editRoom: { room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string };
    setEditRoom: React.Dispatch<React.SetStateAction<{ room_number: string; room_name: string; image_url: string; room_type?: string; assigned_interviewer_name?: string }>>;
    availableInterviewers?: string[];
    users?: any[];
    departments?: any[];
    applications?: any[];
    isSubmitting: boolean;
}

export function EditRoomModal({ open, onClose, onSave, editRoom, setEditRoom, availableInterviewers = [], users = [], departments = [], applications = [], isSubmitting }: EditRoomModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setEditRoom(r => ({ ...r, image_url: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Modal open={open} onClose={onClose} title="Edit Interview Room" size="sm">
            <div className="relative overflow-hidden pt-2 p-1 text-left">
                <div className={cn("space-y-6 transition-all text-left", isSubmitting && "opacity-50 pointer-events-none")}>
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Number <span className="text-red-500">*</span></label>
                        <input value={editRoom.room_number} onChange={e => setEditRoom(r => ({ ...r, room_number: e.target.value }))} placeholder="e.g. 01" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left shadow-sm" />
                    </div>
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Name</label>
                        <input value={editRoom.room_name} onChange={e => setEditRoom(r => ({ ...r, room_name: e.target.value }))} placeholder="e.g. Interview Room A" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left shadow-sm" />
                    </div>

                    {/* Interactive Recruiter / Ops Validator Selection */}
                    <InterviewerSelector
                        value={editRoom.assigned_interviewer_name || ''}
                        onChange={name => setEditRoom(r => ({ ...r, assigned_interviewer_name: name }))}
                        availableInterviewers={availableInterviewers}
                        users={users}
                        departments={departments}
                        applications={applications}
                    />

                    {/* Room Picture Selection / Upload */}
                    <div className="space-y-1.5 text-left">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Room Picture</label>
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {editRoom.image_url ? (
                                    <img src={editRoom.image_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <DoorOpen size={24} className="text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Upload size={14} /> Upload Custom
                                    </button>
                                    {editRoom.image_url && (
                                        <button
                                            type="button"
                                            onClick={() => setEditRoom(r => ({ ...r, image_url: '' }))}
                                            className="px-3 py-1.5 bg-red-50/50 border border-red-200 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">JPEG, PNG, or base64 data.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 text-left">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[12px] font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-all text-center shadow-sm cursor-pointer">Cancel</button>
                        <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-[12px] font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent cursor-pointer">
                            {isSubmitting ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

interface ReceiptModalProps {
    receiptData: any;
    onClose: () => void;
}

export function ReceiptModal({ receiptData, onClose }: ReceiptModalProps) {
    if (!receiptData) return null;

    const navigate = useNavigate();
    const { user } = useAuthStore();
    const rating = receiptData.ratings?.personalRating || 0;
    const langClass = receiptData.ratings?.languageClassification;
    const remarks = receiptData.ratings?.remarks;
    const verdict = receiptData.verdict || 'PENDING';
    const endorsement = receiptData.endorsementParams;

    return (
        <Modal open={!!receiptData} onClose={onClose} title="Interview Completed" size="lg">
            <div className="py-2 px-1 text-slate-800 dark:text-slate-200 font-sans max-h-[85vh] overflow-y-auto">
                {/* Receipt Card Container */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-none p-6 shadow-sm relative">
                    {/* Top Decorative Edge */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-primary-500 to-amber-500 rounded-none" />

                    {/* Header */}
                    <div className="text-center space-y-1 pt-2 pb-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border-0">
                            <Sparkles size={10} /> Official Summary
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">Interview Session Summary</h2>
                        <p className="text-[10px] text-slate-400 font-mono">TXN: {Math.random().toString(36).substring(2, 10).toUpperCase()} • {receiptData.completedAt}</p>
                    </div>

                    <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-2" />

                    {/* Redesigned 2-Column Square Layout Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            {/* Candidate Identity */}
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-none shadow-sm h-[100px]">
                                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-xl rounded-none shrink-0 shadow-sm">
                                    {receiptData.applicantName.charAt(0)}
                                </div>
                                <div className="space-y-0.5 text-left min-w-0">
                                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight truncate">{receiptData.applicantName}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {receiptData.applicantId || 'N/A'}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{receiptData.positionTitle} ({receiptData.department || 'N/A'})</p>
                                </div>
                            </div>

                            {/* Room & Metadata */}
                            <div className="grid grid-cols-2 gap-3 text-left">
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-none shadow-sm space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Timer size={12} className="text-emerald-500" /> Duration</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">{receiptData.duration}</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-none shadow-sm space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ClipboardCheck size={12} className="text-primary-500" /> Grading</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">{receiptData.answeredQuestions}/{receiptData.totalQuestions}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            {/* Interview Verdict & Ratings Summary */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Session Evaluation</h4>
                                <div className="bg-white dark:bg-slate-900 rounded-none p-4 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Session Outcome</span>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-none font-black text-[9px] uppercase tracking-wider",
                                            verdict === 'PASSED' ? "bg-emerald-50 text-emerald-700" :
                                                verdict === 'FAILED' ? "bg-rose-50 text-rose-700" :
                                                    "bg-amber-50 text-amber-700"
                                        )}>
                                            {verdict}
                                        </span>
                                    </div>

                                    {rating > 0 && (
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Interpersonal Rating</span>
                                            <div className="flex items-center gap-0.5 text-amber-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={11} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "text-amber-500" : "text-slate-200"} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {langClass && (
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Language Assessment</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">{langClass}</span>
                                        </div>
                                    )}

                                    {remarks && (
                                        <div className="border-t border-slate-100 pt-2.5 space-y-1">
                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider block text-left">Notes & Observations</span>
                                            <p className="text-[11px] text-slate-600 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border-0 leading-relaxed italic text-left">
                                                "{remarks}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Endorsement Details */}
                            {verdict === 'PASSED' && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Endorsement & Next Steps</h4>
                                    <div className="bg-white dark:bg-slate-900 rounded-none p-4 shadow-sm space-y-3 text-left">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Target Account/Department</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-none font-semibold">
                                                {endorsement?.department || receiptData.department || 'N/A'}
                                            </span>
                                        </div>

                                        {endorsement?.assignedOpsValidatorName && (
                                            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Ops Validator</span>
                                                <span className="font-bold text-slate-850 flex items-center gap-1">
                                                    <User size={11} className="text-slate-400" />
                                                    {endorsement.assignedOpsValidatorName}
                                                </span>
                                            </div>
                                        )}

                                        {endorsement?.meetingDate && (
                                            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Ops Val Interview Date</span>
                                                <span className="font-bold text-slate-850 flex items-center gap-1 font-mono text-[11px]">
                                                    <Calendar size={11} className="text-slate-400" />
                                                    {new Date(endorsement.meetingDate).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">Calendar Integration</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider",
                                                endorsement?.withOutlook
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-amber-50 text-amber-700"
                                            )}>
                                                {endorsement?.withOutlook ? '📧 Synced' : '⏳ Pending Sync'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="pt-5 flex gap-3 text-left">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-black uppercase tracking-[0.2em] rounded-none transition-all border border-slate-350 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                        Finish & Close
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
                            const isOpsVal = user?.role === 'ops_validator' || user?.role === 'guest_interviewer';
                            if (isAdmin) {
                                navigate(`/admin/applicants?highlight=${receiptData?.applicantId}`);
                            } else if (isOpsVal) {
                                navigate(`/final-interview/desk?highlight=${receiptData?.applicantId}`);
                            } else {
                                navigate(`/recruiter/applicants?highlight=${receiptData?.applicantId}`);
                            }
                        }}
                        className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-none transition-all border-0 flex items-center justify-center gap-2 shadow-md hover:shadow-black/10 active:scale-[0.99] cursor-pointer"
                    >
                        Finish & Redirect
                    </button>
                </div>
            </div>
        </Modal>
    );
}
