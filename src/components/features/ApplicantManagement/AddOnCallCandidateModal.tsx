import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import { UserService } from '@/services/UserService';
import type { Position, User } from '@/types';
import { useRoomStore } from '@/store/roomStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Copy, Check, Video, ArrowRight, UserCircle, ChevronDown, Phone, X, DoorOpen, Info, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { formatCandidateName } from '@/utils/formatters';

interface AddOnCallCandidateModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    const className = 'w-full h-9 rounded-sm border border-surface-200 px-3 text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:outline-none transition-colors outline-none bg-white dark:bg-slate-900 placeholder-surface-400';
    return (
        <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">{label}</span>
            <input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={className} />
        </label>
    );
}

function SearchablePositionSelect({ positions, value, onChange }: { positions: Position[], value: string, onChange: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const selected = positions.find(p => p.id === value);
        if (selected) {
            setSearch(selected.department ? `${selected.title} - ${selected.department}` : selected.title);
        } else {
            setSearch('');
        }
    }, [value, positions]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
                const selected = positions.find(p => p.id === value);
                if (selected) setSearch(selected.department ? `${selected.title} - ${selected.department}` : selected.title);
                else setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, positions]);

    const filtered = positions.filter(p => 
        (`${p.title} ${p.department || ''}`).toLowerCase().includes(search.toLowerCase())
    ).reduce((acc, current) => {
        const isDuplicate = acc.some(item => item.title === current.title && item.department === current.department);
        if (!isDuplicate) {
            acc.push(current);
        }
        return acc;
    }, [] as Position[]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                value={search}
                onChange={e => {
                    setSearch(e.target.value);
                    setOpen(true);
                    if (e.target.value === '') onChange('');
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search target positions..."
                className="w-full h-9 rounded-sm border border-surface-200 px-3 text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:outline-none transition-colors outline-none bg-white dark:bg-slate-900 placeholder-surface-400"
            />
            {open && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-surface-200 bg-white dark:bg-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.1)] custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-surface-400">No positions found</div>
                    ) : (
                        filtered.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    onChange(p.id);
                                    setSearch(p.department ? `${p.title} - ${p.department}` : p.title);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-surface-50 focus:bg-surface-50 focus:outline-none border-b border-surface-100 last:border-0"
                            >
                                {p.title} {p.department && <span className="text-surface-400 text-xs">- {p.department}</span>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function SearchableRecruiterSelect({ recruiters, value, onChange }: { recruiters: User[], value: string, onChange: (id: string) => void }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const getInitials = (name: string) => {
        const parts = name.split(' ').filter(Boolean);
        return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    };

    const getAccountType = (role: string) => {
        switch (role) {
            case 'recruiter_a': return 'Alorica Account';
            case 'recruiter_jc': return 'JPMorgan Chase';
            case 'recruiter_sy': return 'Synchrony Account';
            case 'recruiter_interviewer': return 'Initial Interviewer';
            case 'ops_validator': return 'Final Interviewer';
            case 'recruiter_supervisor': return 'Recruiter Supervisor';
            case 'super_admin': return 'Super Admin';
            case 'admin': return 'Admin';
        }
        if (role.startsWith('recruiter_')) {
            const type = role.replace('recruiter_', '').toUpperCase();
            return `Account ${type}`;
        }
        return role;
    };

    useEffect(() => {
        const selected = recruiters.find(r => r.id === value);
        if (selected) {
            setSearch('');
        } else {
            setSearch('');
        }
    }, [value, recruiters]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, recruiters]);

    const filtered = recruiters.filter(r => 
        (r.full_name + ' ' + getAccountType(r.role)).toLowerCase().includes(search.toLowerCase())
    );

    const selectedRecruiter = recruiters.find(r => r.id === value);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className="w-full h-9 flex items-center justify-between rounded-sm border border-surface-200 px-3 focus-within:border-[#0078d4] transition-colors outline-none bg-white dark:bg-slate-900 cursor-pointer"
                onClick={() => setOpen(true)}
            >
                {selectedRecruiter && !open ? (
                    <div className="flex items-center gap-2.5">
                        {selectedRecruiter.avatar_data ? (
                            <img src={selectedRecruiter.avatar_data} alt={selectedRecruiter.full_name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-[#0078d4] text-white flex items-center justify-center text-[9px] font-bold tracking-wider shrink-0">
                                {getInitials(selectedRecruiter.full_name)}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-surface-900 leading-none">{selectedRecruiter.full_name}</span>
                            <span className="text-[10px] text-surface-500 font-medium">{getAccountType(selectedRecruiter.role)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full">
                        <UserCircle size={20} className="text-surface-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setOpen(true);
                            }}
                            placeholder={selectedRecruiter ? selectedRecruiter.full_name : "Select Recruiter..."}
                            className="w-full text-sm outline-none bg-transparent placeholder-surface-400"
                            autoFocus={open}
                            autoComplete="off"
                            spellCheck="false"
                        />
                    </div>
                )}
                <ChevronDown size={14} className="text-surface-400 ml-2 shrink-0" />
            </div>

            {open && (
                <div className="absolute z-50 mb-1 bottom-full max-h-60 w-full overflow-auto rounded-sm border border-surface-200 bg-white dark:bg-slate-900 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-surface-400">No recruiters found</div>
                    ) : (
                        filtered.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(r.id);
                                    setSearch('');
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-3 text-left px-3 py-2 hover:bg-[#f3f2f1] focus:bg-[#f3f2f1] focus:outline-none transition-colors group border-b border-surface-100 last:border-0"
                            >
                                {r.avatar_data ? (
                                    <img src={r.avatar_data} alt={r.full_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-surface-200 text-surface-600 group-hover:bg-[#0078d4] group-hover:text-white flex items-center justify-center text-[10px] font-bold tracking-wider transition-colors shrink-0">
                                        {getInitials(r.full_name)}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-surface-900 leading-tight">{r.full_name}</span>
                                    <span className="text-[10px] text-surface-500 font-medium leading-tight">{getAccountType(r.role)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export function AddOnCallCandidateModal({ open, onClose, onSuccess }: AddOnCallCandidateModalProps) {
    const { success, error } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [positions, setPositions] = useState<Position[]>([]);
    const [selectedPositionId, setSelectedPositionId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [recruiters, setRecruiters] = useState<User[]>([]);
    const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');

    
    // Result screen state after creation
    const [createdCandidate, setCreatedCandidate] = useState<{ id: string; name: string; link: string } | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        contact_no: '',
        email: '',
        hiring_type: 'External',
    });

    useEffect(() => {
        if (open) {
            PositionService.getAllOpen().then((items) => {
                setPositions(items.filter(p => !p.title.includes('[INTERNAL]') && !p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA')));
            });
            UserService.getAll().then((users) => {
                setRecruiters(users.filter(u => u.role.startsWith('recruiter_') || u.role.startsWith('admin') || u.role === 'super_admin'));
            });
            useRoomStore.getState().loadRooms(true);
            setSelectedRoomId('');
            setSelectedRecruiterId('');
            setForm({ first_name: '', middle_name: '', last_name: '', date_of_birth: '', contact_no: '', email: '', hiring_type: 'External' });
            setSelectedPositionId('');
            setCreatedCandidate(null);
        }
    }, [open]);

    const submit = async () => {
        const selectedPosition = positions.find((p) => p.id === selectedPositionId);
        
        if (!form.email.trim()) {
            error('Missing Info', 'Email is required.');
            return;
        }

        setSubmitting(true);
        try {
            const processOrder = [
                'INITIAL_INTERVIEW',
                'ACCOUNT_ASSIGNMENT',
                'TYPING_TEST',
                'ASSESSMENT',
                'CLIENT_ASSESSMENT',
                'CLIENT_INTERVIEW'
            ];

            const processSettings = {
                INITIAL_INTERVIEW: 'PENDING',
                TYPING_TEST: 'PENDING',
                ASSESSMENT: 'PENDING',
                ACCOUNT_ASSIGNMENT: 'PENDING',
                CLIENT_ASSESSMENT: 'SKIPPED',
                CLIENT_INTERVIEW: 'SKIPPED'
            };

            const targetSpecificStatus = 'Initial Interview - Pending';

            const formattedFirstName = formatCandidateName(form.first_name) || 'Anonymous';
            const formattedMiddleName = formatCandidateName(form.middle_name);
            const formattedLastName = formatCandidateName(form.last_name) || 'Candidate';
            const middleInitial = formattedMiddleName ? `${formattedMiddleName} ` : '';
            const fullName = `${formattedFirstName} ${middleInitial}${formattedLastName}`.trim();

            const updatedPis: any = {
                full_name: fullName,
                first_name: formattedFirstName,
                middle_name: formattedMiddleName,
                last_name: formattedLastName,
                dob: form.date_of_birth,
                contact_number: form.contact_no.trim(),
                email: form.email.trim().toLowerCase(),
                hiring_type: form.hiring_type,
                candidate_type: form.hiring_type.toUpperCase(),
                required_processes: Object.keys(processSettings).filter(k => processSettings[k as keyof typeof processSettings] !== 'SKIPPED'),
                process_settings: processSettings,
                process_order: processOrder,
                final_specific_status: targetSpecificStatus,
                interview_type: 'INITIAL'
            };

            const updatedMetadata: any = {
                required_processes: Object.keys(processSettings).filter(k => processSettings[k as keyof typeof processSettings] !== 'SKIPPED'),
                process_settings: processSettings,
                process_order: processOrder,
                interview_mode: 'ONLINE',
                active_interview_type: 'INITIAL',
                candidate_type: form.hiring_type.toUpperCase()
            };

            const emailKey = form.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const applicantId = `oncall-${emailKey}-${Date.now()}`;

            const createdApp = await ApplicationService.submit({
                applicant_id: applicantId,
                applicant_name: fullName,
                applicant_email: form.email.trim().toLowerCase(),
                position: selectedPosition ? {
                    ...selectedPosition,
                    title: selectedPosition.title.includes('[ON-CALL]') 
                        ? selectedPosition.title 
                        : `[ON-CALL] ${selectedPosition.title}`
                } : {
                    id: 'unassigned-position',
                    title: '[ON-CALL] Unassigned',
                    department: 'Unassigned'
                } as any,
                resume_name: 'On-Call Entry (Form Pending)',
                pis: updatedPis,
            });

            if (createdApp && createdApp.id) {
                const selectedRecruiter = recruiters.find(r => r.id === selectedRecruiterId);
                const patchData: any = {
                    current_status: 'INTERVIEW_IN_PROGRESS',
                    pis: updatedPis,
                    metadata: updatedMetadata
                };
                if (selectedRecruiter) {
                    patchData.assigned_recruiter_id = selectedRecruiter.id;
                    patchData.assigned_recruiter_name = selectedRecruiter.full_name;
                }
                await ApplicationService.patch(createdApp.id, patchData);

                // Assign applicant to the selected room
                if (selectedRoomId) {
                    await useRoomStore.getState().updateRoom(selectedRoomId, {
                        status: 'OCCUPIED',
                        current_application_id: createdApp.id,
                        current_applicant_name: createdApp.applicant_name,
                        occupied_since: new Date().toISOString()
                    });
                }

                const link = `${window.location.origin}/apply?app_id=${createdApp.id}`;
                setCreatedCandidate({
                    id: createdApp.id,
                    name: createdApp.applicant_name,
                    link
                });

                success('On-Call Candidate Created', 'Candidate generated and interview session assigned.');
            }
        } catch (submissionError: unknown) {
            error('Creation Failed', submissionError instanceof Error ? submissionError.message : 'Unable to create candidate.');
        } finally {
            setSubmitting(false);
        }
    };



    const enterRoom = () => {
        onSuccess();
        const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/recruiter';
        if (selectedRoomId) {
            navigate(`${basePath}/interview/rooms`, { 
                state: { autoOpenRoomId: selectedRoomId } 
            });
        } else {
            navigate(`${basePath}/interview/rooms`);
        }
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-surface-900/20 to-black/25 backdrop-blur-[3px] transition-opacity" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-surface-200 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-visible flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-sm flex items-center justify-center border border-blue-100">
                            <Phone size={15} className="text-[#0078d4]" />
                        </div>
                        <h2 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                            On Call / Online
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1.5 text-surface-500 hover:bg-surface-100 rounded-sm transition-colors disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 text-left overflow-y-auto custom-scrollbar shrink-1">
                    {!createdCandidate ? (
                        <>

                            <label className="block space-y-1.5 relative">
                                <span className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">Target Position</span>
                                <SearchablePositionSelect 
                                    positions={positions} 
                                    value={selectedPositionId} 
                                    onChange={setSelectedPositionId} 
                                />
                            </label>

                            <div className="flex gap-4">
                                <div className="flex-1"><Field label="First Name" value={form.first_name} onChange={(val) => setForm(f => ({ ...f, first_name: val }))} placeholder="e.g. John" /></div>
                                <div className="flex-1"><Field label="Middle Name" value={form.middle_name} onChange={(val) => setForm(f => ({ ...f, middle_name: val }))} placeholder="e.g. A" /></div>
                                <div className="flex-1"><Field label="Last Name" value={form.last_name} onChange={(val) => setForm(f => ({ ...f, last_name: val }))} placeholder="e.g. Doe" /></div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1"><Field label="Date of Birth" type="date" value={form.date_of_birth} onChange={(val) => setForm(f => ({ ...f, date_of_birth: val }))} /></div>
                                <div className="flex-1"><Field label="Contact No." value={form.contact_no} onChange={(val) => setForm(f => ({ ...f, contact_no: val }))} placeholder="e.g. 09123456789" /></div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1"><Field label="Candidate Email *" type="email" value={form.email} onChange={(val) => setForm(f => ({ ...f, email: val }))} placeholder="e.g. john@example.com" /></div>
                                <div className="flex-1">
                                    <label className="block space-y-1.5 text-left relative">
                                        <span className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">Hiring Type</span>
                                        <select
                                            value={form.hiring_type}
                                            onChange={(e) => setForm(f => ({ ...f, hiring_type: e.target.value }))}
                                            className="w-full h-9 px-3 bg-[#f0f8ff] border-2 border-[#0078d4] rounded-sm text-[12.5px] font-bold tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none transition-all cursor-pointer shadow-[0_0_12px_rgba(0,120,212,0.4)] ring-4 ring-[#0078d4]/20 animate-pulse-slow relative z-10"
                                        >
                                            <option value="External">External</option>
                                            <option value="Internal">Internal</option>
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block space-y-1.5 text-left relative">
                                    <span className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] flex items-center gap-1.5">
                                        <DoorOpen size={12} className="text-[#0078d4]" />
                                        Interview room
                                    </span>
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => setSelectedRoomId(e.target.value)}
                                        className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[12.5px] font-medium tracking-[-0.005em] text-[#323130] dark:text-slate-300 focus:outline-none focus:border-[#0078d4] transition-colors cursor-pointer"
                                    >
                                        <option value="">Select virtual room...</option>
                                        {useRoomStore.getState().rooms
                                            .filter(r => r.is_active && r.room_type === 'online')
                                            .map(r => (
                                                <option key={r.id} value={r.id} disabled={r.status === 'OCCUPIED'} style={r.status === 'OCCUPIED' ? { color: '#a19f9d' } : undefined}>
                                                    {r.room_name} {r.status === 'OCCUPIED' ? '— 🔴 Occupied' : '— 🟢 Available'}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </label>

                                <label className="block space-y-1.5 text-left relative">
                                    <span className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] flex items-center gap-1.5">
                                        <UserCircle size={12} className="text-[#0078d4]" />
                                        Assign Recruiter
                                    </span>
                                    <SearchableRecruiterSelect 
                                        recruiters={recruiters}
                                        value={selectedRecruiterId}
                                        onChange={setSelectedRecruiterId}
                                    />
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-6 text-center py-6">
                            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <Check size={24} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-[16px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">On-Call Interview Configured!</h3>
                                <p className="text-[13px] text-surface-500 font-medium">Candidate <strong>{createdCandidate.name}</strong> has been registered.{selectedRoomId ? ' They are queued in your chosen room.' : ''}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-surface-200 bg-surface-50/50 flex items-center justify-end gap-2.5 shrink-0">
                    {!createdCandidate ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="h-9 px-4 text-[12px] font-medium tracking-[-0.005em] text-[#605e5c] dark:text-slate-400 border border-surface-200 rounded-sm hover:bg-white dark:bg-slate-900 transition-colors disabled:opacity-50 bg-white dark:bg-slate-900 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submit}
                                disabled={submitting}
                                className="h-9 px-5 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 bg-[#0078d4] hover:bg-[#005a9e]"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Phone size={13} />
                                        Register On-Call
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-9 px-4 text-[12px] font-medium tracking-[-0.005em] text-[#605e5c] dark:text-slate-400 border border-surface-200 rounded-sm hover:bg-white dark:bg-slate-900 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                            >
                                Done
                            </button>
                            <button
                                type="button"
                                onClick={enterRoom}
                                className="h-9 px-5 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm transition-all active:scale-95 bg-[#0078d4] hover:bg-[#005a9e] flex items-center gap-1.5"
                            >
                                <Video size={13} />
                                {selectedRoomId ? 'Enter Room & Start Interview' : 'Go to Interview Rooms'}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

