import React, { useState, useMemo, useEffect } from 'react';
import { User, Users, Inbox, Search, Briefcase, Mail, Calendar, Pencil, Save, Loader2 } from 'lucide-react';
import { QuestionService } from '@/services/QuestionService';
import type { InterviewQuestion } from '@/types/misc';
import { AssessmentSidebarDisplay } from '../../components/AssessmentSidebarDisplay';
import { ApplicationProcessStatusTab } from '../../components/ApplicationProcessStatusTab';
import { ApplicationLogTab } from '../../components/ApplicationLogTab';
import { ApplicationTab } from '@/components/features/ApplicantManagement/DetailTabs/ApplicationTab';
import { cn, formatDate } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { MASTERLIST_COLUMNS } from '../constants';
import { getMasterlistCellValue } from './tableHelpers';
import { getDefaultOptionsForColKey } from '../../components/tableUtils';

interface MasterlistChronicleViewProps {
    applications: Application[];
    localChanges: Record<string, Record<string, any>>;
    isEditing?: boolean;
    setIsEditing?: (val: boolean) => void;
    handleEdit?: (appId: string, field: string, value: any) => void;
    onSync?: () => void;
    isSyncing?: boolean;
    onManageResume?: (app: Application) => void;
}

export function MasterlistChronicleView({ applications, localChanges, isEditing, setIsEditing, handleEdit, onSync, isSyncing, onManageResume }: MasterlistChronicleViewProps) {
    const [selectedRecruiter, setSelectedRecruiter] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [recruiterSearch, setRecruiterSearch] = useState('');
    const [candidateSearch, setCandidateSearch] = useState('');
    const [detailSearch, setDetailSearch] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [innerTab, setInnerTab] = useState<'personal_info' | 'details' | 'results' | 'process_status' | 'log'>('personal_info');
    const [showPIS, setShowPIS] = useState(false);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);

    useEffect(() => {
        QuestionService.getAll().then(setQuestions).catch(console.error);
    }, []);
    // Group applications by recruiter
    const recruiterGroups = useMemo(() => {
        const groups: Record<string, Application[]> = {};
        applications.forEach(app => {
            const recruiterName = (app as any).assigned_recruiter_name?.trim() || (app as any).interviewer_name?.trim() || 'Unassigned';
            if (!groups[recruiterName]) {
                groups[recruiterName] = [];
            }
            groups[recruiterName].push(app);
        });

        return Object.entries(groups).sort(([a], [b]) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
    }, [applications]);

    const activeRecruiterName = selectedRecruiter || (recruiterGroups.length > 0 ? recruiterGroups[0][0] : null);

    const candidatesForRecruiter = useMemo(() => {
        if (!activeRecruiterName) return [];
        const group = recruiterGroups.find(([name]) => name === activeRecruiterName);
        return group ? group[1] : [];
    }, [activeRecruiterName, recruiterGroups]);

    const filteredRecruiterGroups = useMemo(() => {
        if (!recruiterSearch.trim()) return recruiterGroups;
        const q = recruiterSearch.toLowerCase();
        return recruiterGroups.filter(([name]) => name.toLowerCase().includes(q));
    }, [recruiterGroups, recruiterSearch]);

    const filteredCandidates = useMemo(() => {
        if (!candidateSearch.trim()) return candidatesForRecruiter;
        const q = candidateSearch.toLowerCase();
        return candidatesForRecruiter.filter(app => {
            const fn = (app as any).master_first_name || (app as any).first_name || '';
            const ln = (app as any).master_last_name || (app as any).last_name || '';
            const name = `${fn} ${ln}`.toLowerCase();
            const email = ((app as any).applicant_email || (app as any).email || '').toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [candidatesForRecruiter, candidateSearch]);

    const activeCandidate = useMemo(() => {
        if (!selectedCandidateId && filteredCandidates.length > 0) {
            return filteredCandidates[0];
        }
        return filteredCandidates.find(c => c.id === selectedCandidateId) || filteredCandidates[0];
    }, [filteredCandidates, selectedCandidateId]);

    const getCandidateName = (app: Application) => {
        const fn = (app as any).master_first_name || (app as any).first_name || '';
        const ln = (app as any).master_last_name || (app as any).last_name || '';
        return `${fn} ${ln}`.trim() || (app as any).applicant_name || 'Unknown Candidate';
    };

    const getCandidateDate = (app: Application) => {
        const meta = app.metadata || {};
        if ((meta as any).interview_date) return formatDate((meta as any).interview_date);
        if ((app as any).master_neo_date) return formatDate((app as any).master_neo_date);
        if ((app as any).created_at) return formatDate((app as any).created_at);
        return '';
    };

    return (
        <div className="flex-1 flex bg-white dark:bg-slate-900 min-h-0 w-full font-sans antialiased text-[#323130] dark:text-slate-300" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>

            {/* PANE 1: RECRUITERS */}
            <div className="w-64 flex-shrink-0 border-r border-[#e1dfdd] bg-[#faf9f8] flex flex-col h-full">
                <div className="h-12 px-4 flex items-center border-b border-[#e1dfdd] shrink-0">
                    <span className="text-sm font-semibold text-[#323130] dark:text-slate-300 flex items-center gap-2">
                        <Users size={16} className="text-[#0078d4]" />
                        Recruiters
                    </span>
                </div>
                <div className="px-3 py-2 border-b border-[#e1dfdd] shrink-0 bg-[#faf9f8]">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a19f9d]" />
                        <input
                            type="text"
                            placeholder="Search recruiters..."
                            value={recruiterSearch}
                            onChange={(e) => setRecruiterSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-[2px] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {filteredRecruiterGroups.length === 0 ? (
                        <div className="text-center text-xs text-[#605e5c] dark:text-slate-400 py-4">No recruiters found</div>
                    ) : (
                        filteredRecruiterGroups.map(([name, apps]) => {
                            const isSelected = name === activeRecruiterName;
                            return (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setSelectedRecruiter(name);
                                        setSelectedCandidateId(null);
                                    }}
                                    className={cn(
                                        "w-full text-left px-4 py-2 flex flex-col items-start transition-colors relative group",
                                        isSelected ? "bg-[#edebe9] dark:bg-slate-800" : "hover:bg-[#f3f2f1]"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4]" />
                                    )}
                                    <span className={cn(
                                        "text-sm truncate w-full",
                                        isSelected ? "font-semibold text-[#323130] dark:text-slate-300" : "font-normal text-[#605e5c] dark:text-slate-400"
                                    )}>
                                        {name}
                                    </span>
                                    <span className="text-[11px] text-[#605e5c] dark:text-slate-400 mt-0.5">
                                        {apps.length} {apps.length === 1 ? 'candidate' : 'candidates'}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PANE 2: CANDIDATES */}
            <div className="w-72 flex-shrink-0 border-r border-[#e1dfdd] bg-white dark:bg-slate-900 flex flex-col h-full shadow-[1px_0_4px_rgba(0,0,0,0.02)] z-10">
                <div className="h-12 px-4 flex items-center border-b border-[#e1dfdd] shrink-0 justify-between">
                    <span className="text-sm font-semibold text-[#323130] dark:text-slate-300">
                        Candidates
                    </span>
                    <span className="text-xs text-[#605e5c] dark:text-slate-400 font-medium bg-[#f3f2f1] px-2 py-0.5 rounded-full">
                        {filteredCandidates.length}
                    </span>
                </div>
                <div className="px-3 py-2 border-b border-[#e1dfdd] shrink-0 bg-white dark:bg-slate-900">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a19f9d]" />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            value={candidateSearch}
                            onChange={(e) => setCandidateSearch(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-sm bg-[#f3f2f1] border-transparent rounded-[2px] focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredCandidates.length === 0 ? (
                        <div className="p-8 text-center text-[#605e5c] dark:text-slate-400 text-sm flex flex-col items-center">
                            <Inbox size={32} className="text-[#c8c6c4] mb-3" />
                            <p>No candidates found.</p>
                        </div>
                    ) : (
                        filteredCandidates.map((app) => {
                            const isSelected = activeCandidate?.id === app.id;
                            const fullName = getCandidateName(app);
                            const status = app.current_status || 'Open';
                            const dateStr = getCandidateDate(app);

                            return (
                                <button
                                    key={app.id}
                                    onClick={() => setSelectedCandidateId(app.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 border-b border-[#f3f2f1] transition-colors relative",
                                        isSelected ? "bg-[#e1dfdd]/40" : "hover:bg-[#f3f2f1]"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <span className={cn(
                                            "text-sm truncate flex-1",
                                            isSelected ? "font-semibold text-[#323130] dark:text-slate-300" : "font-medium text-[#323130] dark:text-slate-300"
                                        )}>
                                            {fullName}
                                        </span>
                                    </div>
                                    <div className="text-xs text-[#0078d4] font-medium truncate mb-1">
                                        {status}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                        <div className="text-[11px] text-[#605e5c] dark:text-slate-400 truncate">
                                            {(app as any).applicant_email || app.email || 'No email provided'}
                                        </div>
                                        {dateStr && (
                                            <span className="text-[10px] text-[#605e5c] dark:text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                                                <Calendar size={10} />
                                                {dateStr}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PANE 3: DETAILS */}
            <div className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col h-full">
                {activeCandidate ? (
                    <div className="animate-fade-in flex flex-col">
                        {/* Header Section */}
                        <div className="px-8 pt-8 pb-6 border-b border-[#e1dfdd] bg-[#faf9f8]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[#0078d4] flex items-center justify-center text-white text-xl font-bold uppercase shrink-0 shadow-sm">
                                        {((app: any) => {
                                            const fn = app.master_first_name || app.first_name || '';
                                            const ln = app.master_last_name || app.last_name || '';
                                            return `${fn?.[0] || ''}${ln?.[0] || '?'}`;
                                        })(activeCandidate)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-2xl font-semibold text-[#323130] dark:text-slate-300 mb-1 truncate">
                                            {getCandidateName(activeCandidate)}
                                        </h1>
                                        <div className="flex items-center gap-4 text-sm text-[#605e5c] dark:text-slate-400 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase size={14} />
                                                <span>{activeCandidate.current_status || 'Open'}</span>
                                            </div>
                                            {((activeCandidate as any).applicant_email || (activeCandidate as any).email) && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={14} />
                                                    <span>{(activeCandidate as any).applicant_email || (activeCandidate as any).email || 'No email provided'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {onManageResume && (
                                        <button
                                            onClick={() => onManageResume(activeCandidate)}
                                            className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-blue-600/30 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all rounded-[2px]"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                            Manage Resume
                                        </button>
                                    )}
                                    {innerTab === 'personal_info' && setIsEditing && (
                                        isEditing ? (
                                            <button
                                                onClick={() => {
                                                    if (onSync) onSync();
                                                }}
                                                disabled={isSyncing}
                                                className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold bg-[#0078d4] hover:bg-[#106ebe] text-white transition-all rounded-[2px]"
                                            >
                                                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                {isSyncing ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 transition-all rounded-[2px]"
                                            >
                                                <Pencil size={14} /> Edit Profile
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Form Grid */}
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#e1dfdd]">
                                <div className="flex items-center gap-6">
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'personal_info' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => {
                                            setInnerTab('personal_info');
                                        }}
                                    >
                                        Personal Information
                                    </button>
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'details' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => {
                                            setInnerTab('details');
                                            if (setIsEditing) setIsEditing(false);
                                        }}
                                    >
                                        Application Details
                                    </button>
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'results' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => {
                                            setInnerTab('results');
                                            if (setIsEditing) setIsEditing(false);
                                        }}
                                    >
                                        Interview Results
                                    </button>
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'process_status' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => {
                                            setInnerTab('process_status');
                                            if (setIsEditing) setIsEditing(false);
                                        }}
                                    >
                                        Application Process
                                    </button>
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'log' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => {
                                            setInnerTab('log');
                                            if (setIsEditing) setIsEditing(false);
                                        }}
                                    >
                                        Application Log
                                    </button>
                                </div>
                                {innerTab === 'details' && (
                                    <div className="relative w-64 pb-2">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-[8px] text-[#a19f9d]" />
                                        <input
                                            type="text"
                                            placeholder="Search fields..."
                                            value={detailSearch}
                                            onChange={(e) => setDetailSearch(e.target.value)}
                                            className="w-full h-8 pl-8 pr-3 text-sm bg-white dark:bg-slate-900 border border-[#e1dfdd] rounded-[2px] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            {innerTab === 'details' ? (
                                <div className="grid grid-cols-2 gap-x-12 gap-y-6 max-w-5xl">
                                    {MASTERLIST_COLUMNS.map((col, idx) => {
                                        const appLocalChanges = localChanges[activeCandidate.id] || {};
                                        const val = getMasterlistCellValue(activeCandidate, col, appLocalChanges);

                                        // Search filter
                                        if (detailSearch.trim()) {
                                            const q = detailSearch.toLowerCase();
                                            if (!col.label.toLowerCase().includes(q) && !String(val || '').toLowerCase().includes(q)) {
                                                return null;
                                            }
                                        }

                                        const fieldKey = col.subField ? `${col.field}.${col.subField}` : col.field;
                                        const isFieldEditing = editingField === `${activeCandidate.id}:${fieldKey}`;
                                        const dropdownOptions = getDefaultOptionsForColKey(fieldKey, col.label);
                                        const hasDropdown = dropdownOptions.length > 0;

                                        const commitValue = (newVal: string) => {
                                            if (!handleEdit) return;
                                            if (newVal !== val) {
                                                if (col.subField) {
                                                    handleEdit(activeCandidate.id, col.field, {
                                                        ...((activeCandidate as any)[col.field] || {}),
                                                        ...(appLocalChanges[col.field] || {}),
                                                        [col.subField]: newVal
                                                    });
                                                } else {
                                                    handleEdit(activeCandidate.id, col.field, newVal);
                                                }
                                            }
                                            setEditingField(null);
                                        };

                                        return (
                                            <div key={idx} className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">
                                                    {col.label}
                                                </label>
                                                <div
                                                    className={cn(
                                                        "text-sm text-[#323130] dark:text-slate-300 bg-[#faf9f8] rounded-[2px] border transition-colors min-h-[36px] flex items-center cursor-pointer",
                                                        isFieldEditing
                                                            ? "border-[#0078d4] ring-1 ring-[#0078d4] bg-white dark:bg-slate-900"
                                                            : "border-transparent hover:border-[#e1dfdd]"
                                                    )}
                                                    onDoubleClick={() => {
                                                        if (!handleEdit) return;
                                                        if (isFieldEditing) {
                                                            setEditingField(null);
                                                        } else {
                                                            setEditingField(`${activeCandidate.id}:${fieldKey}`);
                                                        }
                                                    }}
                                                    title={hasDropdown ? "Double-click to select" : "Double-click to edit"}
                                                >
                                                    {isFieldEditing && handleEdit ? (
                                                        hasDropdown ? (
                                                            <select
                                                                autoFocus
                                                                defaultValue={val}
                                                                onChange={(e) => commitValue(e.target.value)}
                                                                onBlur={() => setEditingField(null)}
                                                                className="w-full px-2 py-2 bg-transparent text-sm outline-none cursor-pointer appearance-none"
                                                            >
                                                                <option value="">{`-- Select ${col.label} --`}</option>
                                                                {!dropdownOptions.includes(val) && val && (
                                                                    <option value={val}>{val}</option>
                                                                )}
                                                                {dropdownOptions.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                defaultValue={val}
                                                                onBlur={(e) => commitValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        (e.target as HTMLInputElement).blur();
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingField(null);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 bg-transparent text-sm outline-none"
                                                                placeholder={`Enter ${col.label}...`}
                                                            />
                                                        )
                                                    ) : (
                                                        <div className="px-3 py-2 whitespace-pre-wrap w-full select-none flex items-center justify-between">
                                                            <span>{val || '-'}</span>
                                                            {hasDropdown && (
                                                                <svg className="w-3 h-3 text-[#a19f9d] shrink-0 ml-2" viewBox="0 0 12 12" fill="none">
                                                                    <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : innerTab === 'results' ? (
                                <div className="flex gap-12 pb-12">
                                    <div className="flex-1 flex flex-col gap-8 max-w-3xl">
                                        {questions.length === 0 && (
                                            <div className="text-sm text-[#a19f9d]">No interview questions configured.</div>
                                        )}
                                        {questions.map((q) => {
                                            const appLocalChanges = localChanges[activeCandidate.id] || {};
                                            const response = (activeCandidate as any).interview_responses?.[q.id] || '';
                                            const isFieldEditing = editingField === `${activeCandidate.id}:${q.id}`;

                                            const commitValue = (newVal: string) => {
                                                if (!handleEdit) return;
                                                if (newVal !== response) {
                                                    handleEdit(activeCandidate.id, 'interview_responses', {
                                                        ...((activeCandidate as any).interview_responses || {}),
                                                        [q.id]: newVal
                                                    });
                                                }
                                                setEditingField(null);
                                            };

                                            return (
                                                <div key={q.id} className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <label className="text-sm font-semibold text-[#323130] dark:text-slate-300">{q.question_text}</label>
                                                        {q.question_text.includes("Final Interviewer's Remarks") && (activeCandidate as any).assigned_ops_validator_name && (activeCandidate as any).assigned_ops_validator_name !== 'Unassigned' && (
                                                            <span className="text-[10px] font-bold text-[#0078d4] bg-[#eff6fc] dark:bg-slate-800 border border-[#c7e0f4] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                Ops Validator: {(activeCandidate as any).assigned_ops_validator_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={cn("text-sm text-[#323130] dark:text-slate-300 bg-[#faf9f8] rounded-[2px] border transition-colors min-h-[80px] p-3 cursor-pointer group relative flex flex-col", isFieldEditing ? "border-[#0078d4] ring-1 ring-[#0078d4] bg-white dark:bg-slate-900" : "border-transparent hover:border-[#e1dfdd]")}
                                                        onDoubleClick={() => {
                                                            if (!handleEdit) return;
                                                            setEditingField(isFieldEditing ? null : `${activeCandidate.id}:${q.id}`);
                                                        }}
                                                        title="Double-click to edit"
                                                    >
                                                        {isFieldEditing && handleEdit ? (
                                                            <textarea
                                                                autoFocus
                                                                defaultValue={response}
                                                                onBlur={(e) => commitValue(e.target.value)}
                                                                className="w-full h-full bg-transparent outline-none resize-none min-h-[80px]"
                                                                placeholder="Enter answer..."
                                                            />
                                                        ) : (
                                                            <div className="flex-1 flex justify-between items-start">
                                                                <div className="whitespace-pre-wrap flex-1">{response || '-'}</div>
                                                                {!isFieldEditing && <Pencil size={14} className="text-[#a19f9d] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2 mt-1" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <AssessmentSidebarDisplay
                                        applicant={activeCandidate}
                                        editingField={editingField}
                                        setEditingField={setEditingField}
                                        handleInputChange={(id, field, val) => {
                                            if (handleEdit) handleEdit(id, field, val);
                                        }}
                                        localChanges={localChanges[activeCandidate.id] || {}}
                                    />
                                </div>
                            ) : innerTab === 'process_status' ? (
                                <ApplicationProcessStatusTab application={activeCandidate} />
                            ) : innerTab === 'personal_info' ? (
                                <div className="p-8">
                                    <ApplicationTab
                                        applicant={activeCandidate}
                                        showPIS={showPIS}
                                        setShowPIS={setShowPIS}
                                        isEditing={isEditing}
                                        handleUpdateApplication={async (id: string, patch: any) => {
                                            try {
                                                const { ApplicationService } = await import('@/services/ApplicationService');
                                                await ApplicationService.patch(id, patch);
                                                if (onSync) onSync();
                                            } catch (e) {
                                                console.error('Failed to update applicant:', e);
                                            }
                                        }}
                                    />
                                </div>
                            ) : innerTab === 'log' ? (
                                <ApplicationLogTab applicant={activeCandidate} />
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#605e5c] dark:text-slate-400">
                        <User size={48} className="text-[#c8c6c4] mb-4" />
                        <h2 className="text-lg font-semibold text-[#323130] dark:text-slate-300 mb-2">No Candidate Selected</h2>
                        <p className="text-sm">Select a recruiter and a candidate to view their complete details.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
