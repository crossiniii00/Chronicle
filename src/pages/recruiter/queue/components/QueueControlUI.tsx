import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Phone, Loader2, DoorOpen, UserCheck, MapPin, Wifi, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { useLoading } from '@/components/common/useLoading';
import { useAuthStore } from '@/store/authStore';

type RoomTabType = 'onsite' | 'online';

interface QueueEntryLite {
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
}

interface RoomOption {
    id: string;
    room_name: string;
    status?: string;
    is_active?: boolean;
    room_type?: string;
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
        'recruiter_s': 'Senior Recruiter',
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
                    'w-full h-10 px-3 bg-white border rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] focus:outline-none focus:border-[#0078d4] transition-colors flex items-center justify-between gap-2.5',
                    value ? 'border-surface-200' : 'border-[#edebe9]',
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
                            <span className="truncate text-slate-800 flex items-center gap-2 w-full">
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
                <ChevronDown size={14} className={cn("text-slate-500 transition-transform shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-[#edebe9] rounded-sm shadow-lg z-[130] custom-scrollbar"
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
                                        value === r.full_name ? "bg-blue-50/60 text-[#0078d4]" : "text-[#323130] hover:bg-slate-55"
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
}

export function CallPromptModal({
    callPrompt, setCallPrompt, confirmCall, promptData, setPromptData,
    rooms, recruiterOptions, validatorOptions
}: CallPromptModalProps) {
    const { isLoading } = useLoading();
    const isCalling = isLoading;
    const [validationMsg, setValidationMsg] = useState<string | null>(null);
    const { user: currentUser } = useAuthStore();
    const [roomTab, setRoomTab] = useState<RoomTabType>('onsite');

    if (!callPrompt.open) return null;

    const interviewerOptions = callPrompt.type === 'FINAL' ? validatorOptions : recruiterOptions;

    // Split rooms into onsite and online
    const onsiteRooms = rooms.filter(r => r.status === 'AVAILABLE' && r.is_active && r.room_type !== 'online');
    const onlineRooms = rooms.filter(r => r.status === 'AVAILABLE' && r.is_active && r.room_type === 'online');
    const activeRoomList = roomTab === 'onsite' ? onsiteRooms : onlineRooms;

    const isValid = promptData.room && promptData.interviewer;

    const handleConfirm = () => {
        if (!isValid) {
            setValidationMsg('Please specify both room and interviewer before calling.');
            return;
        }
        void confirmCall();
    };

    const handleClose = () => {
        if (isCalling) return;
        setCallPrompt({ open: false });
    };

    const handleTabChange = (tab: RoomTabType) => {
        setRoomTab(tab);
        // Clear room selection when switching tabs to avoid stale selection
        setPromptData(p => ({ ...p, room: '' }));
        setValidationMsg(null);
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
                className="relative w-full max-w-md bg-white border border-[#edebe9] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-visible"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center border border-blue-100">
                            <Phone size={15} className="text-[#0078d4]" />
                        </div>
                        <h2 className="text-[16px] font-semibold text-[#323130] tracking-[-0.005em]">
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
                    {/* Applicant summary */}
                    <div className="px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-sm flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-white border border-surface-200 rounded-sm flex items-center justify-center text-[#0078d4] font-semibold text-[12px] tracking-[-0.005em]">
                            {callPrompt.entry?.applicant_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#323130] tracking-[-0.005em] truncate">
                                {callPrompt.entry?.applicant_name}
                            </p>
                            <p className="text-[11px] font-medium text-surface-500 tracking-[-0.005em] mt-0.5">
                                Queue #{callPrompt.entry?.queue_number} &middot; {callPrompt.type === 'FINAL' ? 'Ops val' : 'Initial'} interview
                            </p>
                        </div>
                    </div>

                    {/* Room tab switcher */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-[#605e5c] tracking-[-0.005em] flex items-center gap-1.5">
                            <DoorOpen size={12} className="text-[#0078d4]" />
                            Interview room
                        </label>

                        {/* Tab bar */}
                        <div className="flex border border-[#edebe9] rounded-sm overflow-hidden bg-surface-50/50 shrink-0">
                            <button
                                type="button"
                                disabled={isCalling}
                                onClick={() => handleTabChange('onsite')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-medium transition-colors relative",
                                    roomTab === 'onsite'
                                        ? "bg-white text-[#0078d4] shadow-sm"
                                        : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
                                )}
                            >
                                <MapPin size={12} />
                                <span>On-site</span>
                                {onsiteRooms.length > 0 && (
                                    <span className={cn(
                                        "min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums",
                                        roomTab === 'onsite' ? "bg-[#0078d4]/10 text-[#0078d4]" : "bg-surface-200 text-surface-500"
                                    )}>
                                        {onsiteRooms.length}
                                    </span>
                                )}
                                {roomTab === 'onsite' && (
                                    <motion.span
                                        layoutId="room-tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0078d4]"
                                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                                    />
                                )}
                            </button>
                            <div className="w-px bg-[#edebe9]" />
                            <button
                                type="button"
                                disabled={isCalling}
                                onClick={() => handleTabChange('online')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11.5px] font-medium transition-colors relative",
                                    roomTab === 'online'
                                        ? "bg-white text-purple-600 shadow-sm"
                                        : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
                                )}
                            >
                                <Wifi size={12} />
                                <span>Online</span>
                                {onlineRooms.length > 0 && (
                                    <span className={cn(
                                        "min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums",
                                        roomTab === 'online' ? "bg-purple-100 text-purple-600" : "bg-surface-200 text-surface-500"
                                    )}>
                                        {onlineRooms.length}
                                    </span>
                                )}
                                {roomTab === 'online' && (
                                    <motion.span
                                        layoutId="room-tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500"
                                        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                                    />
                                )}
                            </button>
                        </div>

                        {/* Room selector */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={roomTab}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.12 }}
                            >
                                {activeRoomList.length === 0 ? (
                                    <div className="w-full h-9 px-3 bg-surface-50 border border-[#edebe9] rounded-sm flex items-center gap-2 text-[12px] text-surface-400 font-medium">
                                        {roomTab === 'onsite' ? (
                                            <><MapPin size={12} className="text-surface-300" /> No on-site rooms available</>
                                        ) : (
                                            <><Wifi size={12} className="text-surface-300" /> No online rooms available</>
                                        )}
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
                                            'w-full h-9 px-3 bg-white border rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] focus:outline-none focus:border-[#0078d4] cursor-pointer transition-colors',
                                            promptData.room ? 'border-surface-200' : 'border-[#edebe9]'
                                        )}
                                    >
                                        <option value="">Select {roomTab === 'online' ? 'online' : 'on-site'} room...</option>
                                        {activeRoomList.map(r => (
                                            <option key={r.id} value={r.room_name}>{r.room_name}</option>
                                        ))}
                                    </select>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Interviewer selector */}
                    <div className="space-y-1.5 relative">
                        <label className="text-[11px] font-medium text-[#605e5c] tracking-[-0.005em] flex items-center gap-1.5">
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
                    </div>

                    {/* Info card */}
                    <div className={cn(
                        "px-3.5 py-2.5 border rounded-sm flex items-start gap-2.5",
                        roomTab === 'online'
                            ? "bg-purple-50 border-purple-200/60"
                            : "bg-blue-50 border-blue-200/60"
                    )}>
                        <Info size={13} className={cn("shrink-0 mt-0.5", roomTab === 'online' ? "text-purple-600" : "text-[#0078d4]")} />
                        <p className={cn("text-[11.5px] font-medium leading-relaxed tracking-[-0.005em]", roomTab === 'online' ? "text-purple-900" : "text-blue-900")}>
                            {roomTab === 'online'
                                ? 'The candidate will be directed to the online interview link visible on the lobby display.'
                                : 'The room assignment will be visible on the lobby display.'}
                        </p>
                    </div>

                    {/* Validation */}
                    {validationMsg && (
                        <div className="px-3.5 py-2 bg-rose-50 border border-rose-200/60 rounded-sm text-[11.5px] font-medium text-rose-700 tracking-[-0.005em]">
                            {validationMsg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-[#edebe9] bg-surface-50/50 flex items-center justify-end gap-2.5">
                    <button
                        disabled={isCalling}
                        onClick={handleClose}
                        className="h-9 px-4 text-[12px] font-medium tracking-[-0.005em] text-[#605e5c] border border-[#edebe9] rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={isCalling}
                        onClick={handleConfirm}
                        className={cn(
                            "h-9 px-5 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
                            roomTab === 'online'
                                ? "bg-purple-600 hover:bg-purple-700"
                                : "bg-[#0078d4] hover:bg-[#005a9e]"
                        )}
                    >
                        {isCalling ? (
                            <>
                                <Loader2 size={13} className="animate-spin" />
                                Calling...
                            </>
                        ) : (
                            <>
                                <Phone size={13} />
                                Call applicant
                            </>
                        )}
                    </button>
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
                <div key={i} className="flex items-center gap-1.5 px-2.5 h-7 bg-white border border-surface-200 rounded-sm">
                    <span className={cn("w-1.5 h-1.5 rounded-full", stat.dot)} />
                    <span className="text-[10.5px] font-semibold text-black/55 tracking-[-0.005em]">{stat.label}</span>
                    <span className="text-[12.5px] font-semibold text-black tabular-nums tracking-[-0.005em]">{stat.value}</span>
                </div>
            ))}
        </div>
    );
}
