import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Phone, Loader2, DoorOpen, UserCheck, MapPin, ChevronDown, Zap } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { useLoading } from '@/components/common/useLoading';
import { useAuthStore } from '@/store/authStore';

const generate20MinSlotsStartingFromNow = () => {
    const slots = [];
    const now = new Date();
    let startHour = now.getHours();
    let startMin = now.getMinutes();

    // Round startMin to the next 10-minute boundary
    startMin = Math.ceil(startMin / 10) * 10;
    if (startMin >= 60) {
        startMin = 0;
        startHour = (startHour + 1) % 24;
    }

    // Generate 24 slots (8 hours worth of slots)
    for (let i = 0; i < 24; i++) {
        const endMin = (startMin + 30) % 60;
        const endHour = startMin + 30 >= 60 ? (startHour + 1) % 24 : startHour;

        const formatTime = (h: number, m: number) => {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = m.toString().padStart(2, '0');
            return `${displayH}:${displayM} ${period}`;
        };

        slots.push(`${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`);

        // Add 5 minutes grace time before the next slot
        startMin = (endMin + 5) % 60;
        startHour = endMin + 5 >= 60 ? (endHour + 1) % 24 : endHour;
    }
    return slots;
};

// Parse "3:40 PM" into total minutes from midnight
const parseTimeToMinutes = (str: string): number | null => {
    const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
};

interface QueueEntryLite {
    application_id?: string;
    applicant_name?: string;
    queue_number?: number;
    assigned_interviewer_name?: string;
}

interface CallPromptState {
    open: boolean;
    entry?: QueueEntryLite;
    type?: 'INITIAL' | 'FINAL';
}

interface PromptData {
    room: string;
    interviewer: string;
    callType: 'now' | 'scheduled';
    timeSlot: string;
}

interface RoomOption {
    id: string;
    room_name: string;
    status?: string;
    is_active?: boolean;
    room_type?: string;
    reservations?: { time_slot: string; interviewer_name: string; applicant_name: string }[];
}

interface UserOption {
    id: string;
    full_name: string;
    role: string;
    isBusy?: boolean;
}

interface InterviewerDropdownProps {
    options: UserOption[];
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    currentUser: any;
}

const mapRoleLabel = (role: string): string => {
    const mapping: Record<string, string> = {
        'admin': 'Admin',
        'super_admin': 'Super Admin',

        'recruiter_a': 'Recruiter A',
        'recruiter_jc': 'Recruiter J&C',
        'recruiter_sy': 'Recruiter SY',
        'recruiter_interviewer': 'Recruiter Interviewer',
        'ops_validator': 'Ops Validator',
    };
    return mapping[role.toLowerCase()] || role;
};

export function InterviewerDropdown({ options, value, onChange, disabled, currentUser }: InterviewerDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedUser = options.find(o => o.full_name === value);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(p => p.charAt(0))
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full h-10 px-3 bg-white dark:bg-slate-900 border rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors flex items-center justify-between gap-2.5',
                    value ? 'border-surface-200' : 'border-[#edebe9] dark:border-slate-800',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {selectedUser ? (
                        <>
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden">
                                {(selectedUser as any).avatar_data ? (
                                    <img src={(selectedUser as any).avatar_data} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(selectedUser.full_name)
                                )}
                            </div>
                            <span className="truncate text-slate-800 dark:text-slate-200 flex items-center gap-2 w-full">
                                <span className="truncate">
                                    {selectedUser.full_name} ({mapRoleLabel(selectedUser.role)}){currentUser && selectedUser.id === currentUser.id ? ' • You' : ''}
                                </span>
                                {selectedUser.isBusy && (
                                    <span className="shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-none animate-pulse-glow">
                                        Busy
                                    </span>
                                )}
                            </span>
                        </>
                    ) : (
                        <span className="text-surface-400">Select interviewer...</span>
                    )}
                </div>
                <ChevronDown size={14} className={cn("text-slate-500 dark:text-slate-400 transition-transform shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-lg z-[130] custom-scrollbar"
                    >
                        <div className="py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-[12.5px] font-medium text-surface-400 hover:bg-slate-55 transition-colors"
                            >
                                Select interviewer...
                            </button>
                            {options.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(r.full_name);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full px-3 py-2 text-left text-[12.5px] font-medium transition-colors flex items-center gap-2.5",
                                        value === r.full_name ? "bg-blue-50/60 text-[#0078d4]" : "text-[#323130] dark:text-slate-300 hover:bg-slate-55"
                                    )}
                                >
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden">
                                        {(r as any).avatar_data ? (
                                            <img src={(r as any).avatar_data} alt={r.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(r.full_name)
                                        )}
                                    </div>
                                    <span className="truncate flex items-center gap-2 w-full justify-between">
                                        <span className="truncate">
                                            {r.full_name} ({mapRoleLabel(r.role)}){currentUser && r.id === currentUser.id ? ' • You' : ''}
                                        </span>
                                        {r.isBusy && (
                                            <span className="shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-none animate-pulse-glow shadow-sm">
                                                Busy
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface CallPromptModalProps {
    callPrompt: CallPromptState;
    setCallPrompt: (val: CallPromptState) => void;
    confirmCall: () => Promise<void> | void;
    promptData: PromptData;
    setPromptData: (val: PromptData | ((p: PromptData) => PromptData)) => void;
    rooms: RoomOption[];
    recruiterOptions: UserOption[];
    validatorOptions: UserOption[];
    applications?: any[];
}

export function CallPromptModal({
    callPrompt, setCallPrompt, confirmCall, promptData, setPromptData,
    rooms, recruiterOptions, validatorOptions, applications
}: CallPromptModalProps) {
    const { isLoading } = useLoading();
    const isCalling = isLoading;
    const [validationMsg, setValidationMsg] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const { user: currentUser } = useAuthStore();
    const [isCustomTime, setIsCustomTime] = useState(false);
    const [customStart, setCustomStart] = useState('09:00');
    const [customEnd, setCustomEnd] = useState('09:20');

    const formatTimeSlot = (startTime: string, endTime: string): string => {
        if (!startTime || !endTime) return '';
        const toAmPm = (timeStr: string) => {
            const [hoursStr, minutesStr] = timeStr.split(':');
            let hours = parseInt(hoursStr, 10);
            const minutes = minutesStr || '00';
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        };
        return `${toAmPm(startTime)} - ${toAmPm(endTime)}`;
    };

    const getCurrentTimeSlot = useCallback((): string => {
        const now = new Date();
        const startHour = now.getHours();
        const startMin = now.getMinutes();
        
        const endMin = (startMin + 30) % 60;
        const endHour = startMin + 30 >= 60 ? (startHour + 1) % 24 : startHour;
        
        const formatTime = (h: number, m: number) => {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = m.toString().padStart(2, '0');
            return `${displayH}:${displayM} ${period}`;
        };
        return `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`;
    }, []);

    // Get candidate profile to check if online
    const applicantApp = applications?.find(a => a.id === callPrompt.entry?.application_id);
    const isOnlineCandidate = applicantApp?.metadata?.interview_mode === 'ONLINE' || 
                              applicantApp?.interview_mode === 'ONLINE' ||
                              String(applicantApp?.metadata?.show_up || '').toUpperCase() === 'ONLINE' ||
                              String(applicantApp?.metadata?.show_up || '').toUpperCase() === 'ONCALL' ||
                              String(applicantApp?.current_status || '').toUpperCase().includes('ONLINE') ||
                              String(applicantApp?.current_status || '').toUpperCase().includes('ONCALL');

    // Reset custom time state when modal is opened
    useEffect(() => {
        if (callPrompt.open) {
            setIsCustomTime(false);
        }
    }, [callPrompt.open]);

    // Handle custom time slot changes when in scheduled mode
    useEffect(() => {
        if (callPrompt.open && promptData.callType === 'scheduled' && isCustomTime) {
            setPromptData(p => ({ ...p, timeSlot: formatTimeSlot(customStart, customEnd) }));
        }
    }, [customStart, customEnd, isCustomTime, promptData.callType, callPrompt.open, setPromptData]);

    if (!callPrompt.open) return null;

    const interviewerOptions = callPrompt.type === 'FINAL' ? validatorOptions : recruiterOptions;

    // Filter rooms based on candidate show-up type
    const activeRoomList = rooms.filter(r => {
        if (!r.is_active) return false;
        if (isOnlineCandidate) {
            return r.room_type === 'online' || r.room_name?.toLowerCase().includes('online');
        } else {
            return r.room_type !== 'online' && !r.room_name?.toLowerCase().includes('online');
        }
    });

    const isValid = promptData.room && promptData.interviewer && promptData.timeSlot;

    const handleConfirm = () => {
        if (!isValid) {
            setValidationMsg('Please fill in all required fields (Time Slot, Room, and Interviewer).');
            return;
        }
        if (progress !== null || isCalling) return;

        setProgress(0);
        const startTime = Date.now();
        const duration = 150; 

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min(Math.round((elapsed / duration) * 100), 100);
            setProgress(percentage);

            if (percentage >= 100) {
                clearInterval(timer);
                (confirmCall() as any).finally(() => {
                    setProgress(null);
                });
            }
        }, 30);
    };

    const handleClose = () => {
        if (isCalling || progress !== null) return;
        setCallPrompt({ open: false });
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-visible"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9] dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center border border-blue-100">
                            <Phone size={15} className="text-[#0078d4]" />
                        </div>
                        <h2 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                            Call applicant
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isCalling}
                        className="p-1.5 text-surface-500 hover:bg-surface-100 rounded-sm transition-colors disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 text-left">
                    {/* Call Type Switcher / Info */}
                    {isOnlineCandidate ? (
                        <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-sm text-xs font-medium">
                            ℹ️ Candidate is Online/On-Call. Bypassing waiting queue to call directly.
                        </div>
                    ) : (
                        <div className="flex bg-surface-100 p-0.5 rounded-sm shrink-0 border border-surface-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setPromptData(p => ({ ...p, callType: 'now', timeSlot: 'Immediate', room: '' }));
                                    setIsCustomTime(false);
                                    setValidationMsg(null);
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-all",
                                    promptData.callType === 'now' 
                                        ? "bg-[#0078d4] text-white shadow-3xs" 
                                        : "text-surface-500 hover:text-surface-800"
                                )}
                            >
                                Queue Now
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPromptData(p => ({ ...p, callType: 'scheduled', timeSlot: '', room: '' }));
                                    setValidationMsg(null);
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-all",
                                    promptData.callType === 'scheduled' 
                                        ? "bg-[#0078d4] text-white shadow-3xs" 
                                        : "text-surface-500 hover:text-surface-800"
                                )}
                            >
                                Schedule Call
                            </button>
                        </div>
                    )}

                    {/* Applicant summary */}
                    <div className="px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-sm flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm flex items-center justify-center text-[#0078d4] font-semibold text-[12px] tracking-[-0.005em]">
                            {callPrompt.entry?.applicant_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em] truncate">
                                {callPrompt.entry?.applicant_name}
                            </p>
                            <p className="text-[11px] font-medium text-surface-500 tracking-[-0.005em] mt-0.5">
                                Queue #{callPrompt.entry?.queue_number} &middot; {callPrompt.type === 'FINAL' ? 'Ops val' : 'Initial'} interview
                            </p>
                        </div>
                    </div>

                    {/* Time Slot Selector */}
                    {promptData.callType === 'scheduled' && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] flex items-center gap-1.5">
                                <Zap size={12} className="text-[#0078d4]" />
                                Time Slot
                            </label>
                            <select
                                value={isCustomTime ? 'CUSTOM' : promptData.timeSlot}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'CUSTOM') {
                                        setIsCustomTime(true);
                                        setPromptData(p => ({ ...p, timeSlot: '', room: '' }));
                                    } else {
                                        setIsCustomTime(false);
                                        setPromptData(p => ({ ...p, timeSlot: val, room: '' }));
                                    }
                                    setValidationMsg(null);
                                }}
                                disabled={isCalling}
                                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors cursor-pointer"
                            >
                                <option value="">Select time slot...</option>
                                {generate20MinSlotsStartingFromNow().map(slot => (
                                    <option key={slot} value={slot}>{slot}</option>
                                ))}
                                <option value="CUSTOM">Custom Time...</option>
                            </select>
                            {isCustomTime && (
                                <div className="flex items-center gap-3 bg-surface-50 p-3 border border-[#edebe9] dark:border-slate-800 rounded-sm mt-2">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1">Start Time</span>
                                        <input
                                            type="time"
                                            value={customStart}
                                            onChange={(e) => {
                                                setCustomStart(e.target.value);
                                                setPromptData(p => ({ ...p, room: '' }));
                                                setValidationMsg(null);
                                            }}
                                            disabled={isCalling}
                                            className="w-full h-9 px-2 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm text-[12px] font-medium text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors"
                                        />
                                    </div>
                                    <span className="text-slate-400 font-bold self-end mb-1.5">-</span>
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider block mb-1">End Time</span>
                                        <input
                                            type="time"
                                            value={customEnd}
                                            onChange={(e) => {
                                                setCustomEnd(e.target.value);
                                                setPromptData(p => ({ ...p, room: '' }));
                                                setValidationMsg(null);
                                            }}
                                            disabled={isCalling}
                                            className="w-full h-9 px-2 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm text-[12px] font-medium text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Room selector */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] flex items-center gap-1.5">
                            <DoorOpen size={12} className="text-[#0078d4]" />
                            Interview room
                        </label>
                        {!promptData.timeSlot && promptData.callType === 'scheduled' ? (
                            <div className="w-full h-9 px-3 bg-surface-50 border border-[#edebe9] dark:border-slate-800 rounded-sm flex items-center gap-2 text-[12px] text-surface-400 font-medium">
                                <Info size={12} className="text-surface-300" /> Please select a time slot first
                            </div>
                        ) : activeRoomList.length === 0 ? (
                            <div className="w-full h-9 px-3 bg-surface-50 border border-[#edebe9] dark:border-slate-800 rounded-sm flex items-center gap-2 text-[12px] text-surface-400 font-medium">
                                <MapPin size={12} className="text-surface-300" /> {isOnlineCandidate ? 'No virtual rooms available' : 'No on-site rooms available'}
                            </div>
                        ) : (
                            <select
                                disabled={isCalling}
                                value={promptData.room}
                                onChange={e => {
                                    setPromptData(p => ({ ...p, room: e.target.value }));
                                    setValidationMsg(null);
                                }}
                                className={cn(
                                    'w-full h-9 px-3 bg-white dark:bg-slate-900 border rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] cursor-pointer transition-colors',
                                    promptData.room ? 'border-surface-200' : 'border-[#edebe9] dark:border-slate-800'
                                )}
                            >
                                <option value="">{isOnlineCandidate ? 'Select virtual room...' : 'Select on-site room...'}</option>
                                {(() => {
                                    const getOngoingSessionReservation = (room: any) => {
                                        const activeStart = room.occupied_since || room.active_session_start_time;
                                        if (room.status !== 'OCCUPIED' || !activeStart) return null;
                                        try {
                                            const start = new Date(activeStart);
                                            const end = room.occupied_until 
                                                ? new Date(room.occupied_until)
                                                : new Date(start.getTime() + 30 * 60 * 1000);
                                            
                                            const formatTime = (date: Date) => {
                                                let h = date.getHours();
                                                const m = date.getMinutes();
                                                const period = h >= 12 ? 'PM' : 'AM';
                                                h = h % 12 === 0 ? 12 : h % 12;
                                                return `${h}:${m.toString().padStart(2, '0')} ${period}`;
                                            };
                                            
                                            return {
                                                time_slot: `${formatTime(start)} - ${formatTime(end)}`,
                                                applicant_name: 'Ongoing Interview',
                                                applicant_id: room.current_application_id || ''
                                            };
                                        } catch {
                                            return null;
                                        }
                                    };

                                    const isRoomReservedForSlot = (roomObj: any, slot: string): boolean => {
                                        if (!slot) return false;
                                        const [sStart, sEnd] = slot.split(' - ');
                                        const s1 = parseTimeToMinutes(sStart);
                                        let e1 = parseTimeToMinutes(sEnd);
                                        if (s1 === null || e1 === null) return false;
                                        if (e1 < s1) e1 += 1440;

                                        const allRes = [...(roomObj.reservations || [])];
                                        const ongoing = getOngoingSessionReservation(roomObj);
                                        if (ongoing) {
                                            allRes.push(ongoing);
                                        }

                                        for (const res of allRes) {
                                            const parts = res.time_slot.split(' - ');
                                            if (parts.length === 2) {
                                                const s2 = parseTimeToMinutes(parts[0]);
                                                let e2 = parseTimeToMinutes(parts[1]);
                                                if (s2 !== null && e2 !== null) {
                                                    if (e2 < s2) e2 += 1440;
                                                    if (s1 < e2 && s2 < e1) return true;
                                                }
                                            }
                                        }
                                        return false;
                                    };

                                    return activeRoomList.map(r => {
                                        const isOccupiedNow = promptData.callType !== 'scheduled' && r.status === 'OCCUPIED';
                                        const isReservedLater = promptData.callType === 'scheduled' && isRoomReservedForSlot(r, promptData.timeSlot);
                                        const isDisabled = isOccupiedNow || isReservedLater;
                                        const statusLabel = isOccupiedNow ? ' — 🔴 Occupied' : isReservedLater ? ' — 🔴 Reserved' : ' — 🟢 Available';
                                        
                                        return (
                                            <option key={r.id} value={r.room_name} disabled={isDisabled} style={isDisabled ? { color: '#a19f9d' } : undefined}>
                                                {r.room_name}{statusLabel}
                                            </option>
                                        );
                                    });
                                })()}
                            </select>
                        )}
                    </div>

                    {/* Interviewer selector */}
                    <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] flex items-center gap-1.5">
                            <UserCheck size={12} className="text-[#0078d4]" />
                            {callPrompt.type === 'FINAL' ? 'Endorsed OPS validator' : 'Recruiter'}
                        </label>
                        <InterviewerDropdown
                            options={interviewerOptions}
                            value={promptData.interviewer}
                            onChange={(name) => setPromptData(p => ({ ...p, interviewer: name }))}
                            disabled={isCalling}
                            currentUser={currentUser}
                        />
                                  {/* Info card */}
                    <div className="px-3.5 py-2.5 border rounded-sm flex items-start gap-2.5 bg-blue-50 border-blue-200/60">
                        <Info size={13} className="shrink-0 mt-0.5 text-[#0078d4]" />
                        <p className="text-[11.5px] font-medium leading-relaxed tracking-[-0.005em] text-blue-900">
                            The candidate will be directed to the selected room.
                        </p>
                    </div>        </div>

                    {/* Validation */}
                    {validationMsg && (
                        <div className="px-3.5 py-2 bg-rose-50 border border-rose-200/60 rounded-sm text-[11.5px] font-medium text-rose-700 tracking-[-0.005em]">
                            {validationMsg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-[#edebe9] dark:border-slate-800 bg-surface-50/50 flex items-center justify-end gap-2.5">
                    <button
                        disabled={isCalling || progress !== null}
                        onClick={handleClose}
                        className="h-9 px-4 text-[12px] font-medium tracking-[-0.005em] text-[#605e5c] dark:text-slate-400 border border-[#edebe9] dark:border-slate-800 rounded-sm hover:bg-white dark:bg-slate-900 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    {progress !== null ? (
                        <button
                            disabled={true}
                            className="h-9 w-40 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm relative overflow-hidden bg-[#005a9e] cursor-not-allowed flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-[#0078d4] opacity-30" />
                            <div 
                                className="absolute top-0 bottom-0 left-0 bg-[#0078d4] transition-all duration-75"
                                style={{ width: `${progress}%` }}
                            />
                            <span className="relative z-10 font-bold tabular-nums">
                                {isOnlineCandidate ? 'Calling...' : (promptData.callType === 'now' ? 'Queuing...' : 'Scheduling...')} {progress}%
                            </span>
                        </button>
                     ) : (
                        <button
                            disabled={isCalling}
                            onClick={handleConfirm}
                            className="h-9 px-5 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-[#0078d4] hover:bg-[#005a9e]"
                        >
                            {isCalling ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    {isOnlineCandidate ? 'Calling...' : (promptData.callType === 'now' ? 'Queuing...' : 'Scheduling...')}
                                </>
                            ) : (
                                <>
                                    <Phone size={13} />
                                    {isOnlineCandidate ? 'Call applicant' : (promptData.callType === 'now' ? 'Queue applicant' : 'Schedule call')}
                                </>
                            )}
                        </button>
                     )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

// QueueStats unchanged — keep existing component
interface QueueStatsProps {
    initialCount: number;
    finalCount: number;
    servedCount: number;
}

export function QueueStats({ initialCount, finalCount, servedCount }: QueueStatsProps) {
    const totalWaiting = initialCount + finalCount;
    const stats = [
        { label: 'Initial wait', value: initialCount, dot: 'bg-blue-500' },
        { label: 'Ops val wait', value: finalCount, dot: 'bg-rose-500' },
        { label: 'Served today', value: servedCount, dot: 'bg-emerald-500' },
        { label: 'Avg. wait', value: totalWaiting > 0 ? '12 min' : '0 min', dot: 'bg-surface-400' },
    ];

    return (
        <div className="flex items-center gap-2">
            {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 h-7 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm">
                    <span className={cn("w-1.5 h-1.5 rounded-full", stat.dot)} />
                    <span className="text-[10.5px] font-semibold text-black/55 tracking-[-0.005em]">{stat.label}</span>
                    <span className="text-[12.5px] font-semibold text-black tabular-nums tracking-[-0.005em]">{stat.value}</span>
                </div>
            ))}
        </div>
    );
}
