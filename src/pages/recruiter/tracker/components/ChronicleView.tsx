import React, { useState, useMemo } from 'react';
import { User, Users, ChevronRight, Inbox, Clock, Calendar, Briefcase, Mail, Phone, MapPin, Search, Pencil, Save, Loader2 } from 'lucide-react';
import { cn, formatDate, formatDateTime, getCandidateFullName, getCandidateFirstName, getCandidateLastName, getCandidateMiddleName } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { SHEET_COLUMNS, cleanValue } from '../constants';
import { normalizeOverallStatus } from '../utils/statusMappings';
import type { InterviewQuestion } from '@/types/misc';
import { EditableCell } from './InterviewTableUI';
import { getDefaultOptionsForColKey } from './tableUtils';
import * as helpers from '../utils/tableHelpers';
import { AssessmentSidebarDisplay } from './AssessmentSidebarDisplay';
import { TypingTestResults } from './TypingTestResults';
import { AssessmentsTab } from './AssessmentsTab';
import { ApplicationProcessStatusTab } from './ApplicationProcessStatusTab';
import { ApplicationLogTab } from './ApplicationLogTab';
import { ApplicationTab } from '@/components/features/ApplicantManagement/DetailTabs/ApplicationTab';

interface ChronicleViewProps {
    applications: Application[];
    questions: InterviewQuestion[];
    localChanges: Record<string, Record<string, string>>;
    isEditing?: boolean;
    handleInputChange?: (appId: string, qId: string, value: string) => void;
    setIsEditing?: (val: boolean) => void;
    accounts?: string[];
    activeTab?: string;
    onRefresh?: () => void;
    onSync?: () => void;
    isSyncing?: boolean;
}

const AVATAR_GRADIENTS = [
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-purple-500 to-pink-500',
    'from-cyan-500 to-blue-500',
];

const getRecruiterInitials = (name: string) => {
    if (!name || name === 'Unassigned') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export function ChronicleView({ applications, questions, localChanges, isEditing, setIsEditing, handleInputChange, accounts, activeTab, onRefresh, onSync, isSyncing }: ChronicleViewProps) {
    const [selectedRecruiter, setSelectedRecruiter] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [recruiterSearch, setRecruiterSearch] = useState('');
    const [candidateSearch, setCandidateSearch] = useState('');
    const [detailSearch, setDetailSearch] = useState('');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [innerTab, setInnerTab] = useState<'personal_info' | 'details' | 'results' | 'process_status' | 'log'>('personal_info');
    const [showPIS, setShowPIS] = useState(false);
    
    const [allRecruiters, setAllRecruiters] = useState<string[]>([]);
    
    React.useEffect(() => {
        import('./tableUtils').then(mod => {
            mod.loadRecruiterOptions().then(recs => {
                if (recs && recs.length > 0) setAllRecruiters(recs);
            });
        });
    }, []);

    // Group applications by recruiter
    const recruiterGroups = useMemo(() => {
        const groups: Record<string, Application[]> = {};
        allRecruiters.forEach(r => {
            if (!groups[r]) groups[r] = [];
        });
        
        applications.forEach(app => {
            const recruiterName = app.assigned_recruiter_name?.trim() || app.interviewer_name?.trim() || 'Unassigned';
            // Fuzzy match the name against allRecruiters to avoid duplicates
            let assignedGroup = recruiterName;
            if (recruiterName !== 'Unassigned') {
                const target = recruiterName.toLowerCase();
                const matched = allRecruiters.find(r => r.toLowerCase() === target || r.toLowerCase().includes(target) || target.includes(r.toLowerCase()));
                if (matched) assignedGroup = matched;
            }
            if (!groups[assignedGroup]) {
                groups[assignedGroup] = [];
            }
            groups[assignedGroup].push(app);
        });

        // Sort groups: Unassigned at bottom, rest alphabetical
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
    }, [applications, allRecruiters]);

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
            const name = getCandidateFullName(app).toLowerCase();
            const email = (app.email || '').toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [candidatesForRecruiter, candidateSearch]);

    const activeCandidate = useMemo(() => {
        if (!selectedCandidateId && filteredCandidates.length > 0) {
            return filteredCandidates[0];
        }
        return filteredCandidates.find(c => c.id === selectedCandidateId) || filteredCandidates[0];
    }, [filteredCandidates, selectedCandidateId]);

    // Format Candidate Data mimicking Excel View
    const getCandidateValue = (col: string, app: Application) => {
        const norm = col.toLowerCase();
        const pis = app.pis || {};
        const meta = app.metadata || {};
        const local = localChanges[app.id] || {};

        // Question Responses
        const q = questions.find(q => q.question_text.toLowerCase() === norm);
        if (q) {
            const responses = app.interview_responses || {};
            const val = local[q.id] || responses[q.id] || responses[q.question_text];
            return val ? cleanValue(String(val)) : '';
        }

        // Direct Mapping
        if (norm === 'hire eligibility') return app.applicant_hire_eligibility_status || '';
        if (norm === 'id') return app.id.slice(0, 5).toUpperCase();
        if (norm === 'email') return app.email || '';
        if (norm === 'start time') return app.started_at ? formatDateTime(app.started_at) : '';
        if (norm === 'completion time') return app.completed_at ? formatDateTime(app.completed_at) : '';
        if (norm === 'recruiter / interviewer') return app.assigned_recruiter_name || app.interviewer_name || '';
        if (norm === 'interview date') return app.metadata?.interview_date ? formatDate(app.metadata.interview_date) : '';
        if (norm === 'last name') return getCandidateLastName(app);
        if (norm === 'first name') return getCandidateFirstName(app);
        if (norm === 'preferred nickname') return (app as any).preferred_nickname || meta.preferred_nickname || pis.preferred_nickname || '';
        if (norm === 'middle name') return getCandidateMiddleName(app);
        if (norm === 'contact number') return app.phone_number || '';
        if (norm === 'current address') return app.home_address || '';
        if (norm === 'sex') return meta.sex || '';
        if (norm === 'civil status') return meta.civil_status || '';
        if (norm === 'age') {
            if (!app.date_of_birth) return '';
            const age = new Date().getFullYear() - new Date(app.date_of_birth).getFullYear();
            return String(age);
        }
        if (norm === 'date of birth') return app.date_of_birth ? formatDate(app.date_of_birth) : '';
        if (norm === 'cefr') return pis.cefr || meta.cefr || '';
        if (norm === 'final specific status') return pis.final_specific_status || '';
        if (norm === 'application status' || norm === 'current step') return app.current_status || '';
        if (norm === 'overall status') return normalizeOverallStatus(pis.overall_status || '');
        if (norm === 'hire date') {
            const d = app.hired_at || (pis as any).hired_at || (pis as any).hire_date || (app as any).master_training_start_date || (pis as any).master_training_start_date || (pis as any).training_start_date || meta.master_training_start_date;
            return d ? formatDate(d) : '';
        }
        if (norm === 'final account') return pis.final_account || app.department || '';

        return helpers.getSheetCellValue(app, col, 0, questions);
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
                                        "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors relative group",
                                        isSelected ? "bg-[#edebe9] dark:bg-slate-800" : "hover:bg-[#f3f2f1]"
                                    )}
                                >
                                    {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078d4]" />
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className={cn(
                                            "text-sm truncate w-full",
                                            isSelected ? "font-semibold text-[#323130] dark:text-slate-300" : "font-normal text-[#605e5c] dark:text-slate-400"
                                        )}>
                                            {name}
                                        </span>
                                        <span className="text-[11px] text-[#605e5c] dark:text-slate-400 mt-0.5">
                                            {apps.length} {apps.length === 1 ? 'candidate' : 'candidates'}
                                        </span>
                                    </div>
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
                            const fullName = getCandidateFullName(app);
                            const status = app.pis?.final_specific_status || app.current_status || 'Open';
                            const dateStr = app.metadata?.interview_date ? formatDate(app.metadata.interview_date) : (app.created_at ? formatDate(app.created_at) : '');

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
                                            {app.email || 'No email provided'}
                                        </div>
                                        {dateStr && (
                                            <span className="text-[10px] text-[#605e5c] dark:text-slate-400 whitespace-nowrap shrink-0">
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

            {/* PANE 3: DETAILS (EXCEL VIEW DATA) */}
            <div className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col h-full">
                {activeCandidate ? (
                    <div className="animate-fade-in flex flex-col">
                        {/* Header Section */}
                        <div className="px-8 pt-8 pb-6 border-b border-[#e1dfdd] bg-[#faf9f8]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[#0078d4] flex items-center justify-center text-white text-xl font-bold uppercase shrink-0 shadow-sm">
                                        {getCandidateFirstName(activeCandidate)?.[0] || ''}{getCandidateLastName(activeCandidate)?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-2xl font-semibold text-[#323130] dark:text-slate-300 mb-1 truncate">
                                            {getCandidateFullName(activeCandidate)}
                                        </h1>
                                        <div className="flex items-center gap-4 text-sm text-[#605e5c] dark:text-slate-400 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <Briefcase size={14} />
                                                <span>{activeCandidate.pis?.final_specific_status || activeCandidate.current_status || 'Open'}</span>
                                            </div>
                                            {activeCandidate.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={14} />
                                                    <span>{activeCandidate.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">

                                </div>
                            </div>
                        </div>

                        {/* Details Form Grid */}
                        <div className="p-8 flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between mb-6 border-b border-[#e1dfdd]">
                                <div className="flex items-center gap-6">
                                    <button
                                        className={cn("text-lg font-semibold pb-2 border-b-2 -mb-[1px] transition-colors", innerTab === 'personal_info' ? 'border-[#0078d4] text-[#323130] dark:text-slate-300' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300')}
                                        onClick={() => setInnerTab('personal_info')}
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
                                <div className="grid grid-cols-2 gap-x-12 gap-y-6 max-w-5xl pb-6">
                                    {SHEET_COLUMNS.map((col, idx) => {
                                        const colKey = helpers.getSheetColumnKey(col, questions);
                                        const appLocalChanges = localChanges[activeCandidate.id] || {};
                                        const val = appLocalChanges[colKey] !== undefined
                                            ? appLocalChanges[colKey]
                                            : getCandidateValue(col, activeCandidate);

                                        // Search filter
                                        if (detailSearch.trim()) {
                                            const q = detailSearch.toLowerCase();
                                            if (!col.toLowerCase().includes(q) && !(val || '').toLowerCase().includes(q)) {
                                                return null;
                                            }
                                        }

                                        const options = getDefaultOptionsForColKey(colKey, col);

                                        const commitValue = (newVal: string) => {
                                            if (!handleInputChange) return;
                                            if (newVal !== val) {
                                                handleInputChange(activeCandidate.id, colKey, newVal);
                                            }
                                        };

                                        const isFieldEditing = editingField === `${activeCandidate.id}:${colKey}`;

                                        return (
                                            <div key={idx} className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">
                                                        {col}
                                                    </label>
                                                </div>
                                                <div
                                                    className={cn(
                                                        "text-sm text-[#323130] dark:text-slate-300 bg-[#faf9f8] rounded-[2px] border transition-colors min-h-[36px] flex items-center relative group cursor-pointer",
                                                        isFieldEditing
                                                            ? "border-[#0078d4] ring-1 ring-[#0078d4] bg-white dark:bg-slate-900"
                                                            : "border-transparent hover:border-[#e1dfdd]"
                                                    )}
                                                    onDoubleClick={() => {
                                                        if (!handleInputChange) return;
                                                        if (isFieldEditing) {
                                                            setEditingField(null);
                                                        } else {
                                                            setEditingField(`${activeCandidate.id}:${colKey}`);
                                                        }
                                                    }}
                                                    title={options.length > 0 ? "Double-click to select" : "Double-click to edit"}
                                                >
                                                    {isFieldEditing && handleInputChange ? (
                                                        options.length > 0 ? (
                                                            <div className="w-full relative flex items-center">
                                                                <input
                                                                    type="text"
                                                                    list={`datalist-${colKey}`}
                                                                    autoFocus
                                                                    defaultValue={val}
                                                                    onBlur={(e) => {
                                                                        commitValue(e.target.value);
                                                                        setEditingField(null);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            (e.target as HTMLInputElement).blur();
                                                                        } else if (e.key === 'Escape') {
                                                                            setEditingField(null);
                                                                        }
                                                                    }}
                                                                    className="w-full px-3 py-2 bg-transparent text-sm outline-none"
                                                                />
                                                                <datalist id={`datalist-${colKey}`}>
                                                                    {options.map(opt => (
                                                                        <option key={opt} value={opt} />
                                                                    ))}
                                                                </datalist>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                defaultValue={val}
                                                                onBlur={(e) => {
                                                                    commitValue(e.target.value);
                                                                    setEditingField(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        (e.target as HTMLInputElement).blur();
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingField(null);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 bg-transparent text-sm outline-none"
                                                                placeholder={`Enter ${col}...`}
                                                            />
                                                        )
                                                    ) : (
                                                        <div
                                                            className="px-3 py-2 whitespace-pre-wrap w-full select-none flex items-center justify-between transition-colors"
                                                        >
                                                            <span>{val || '-'}</span>
                                                            {handleInputChange && (
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                                                    {options.length > 0 && (
                                                                        <svg className="w-3 h-3 text-[#a19f9d] shrink-0" viewBox="0 0 12 12" fill="none">
                                                                            <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : innerTab === 'results' ? (
                                <div className="flex flex-col h-full min-h-0">
                                    <div className="flex gap-12 pb-6">
                                        <div className="flex-1 flex flex-col gap-8 max-w-3xl">
                                            {questions.length === 0 && (
                                                <div className="text-sm text-[#a19f9d]">No interview questions configured.</div>
                                            )}
                                            {questions.map((q) => {
                                                const appLocalChanges = localChanges[activeCandidate.id] || {};
                                                const response = appLocalChanges[q.id] !== undefined
                                                    ? appLocalChanges[q.id]
                                                    : activeCandidate.interview_responses?.[q.id] || '';

                                                const commitValue = (newVal: string) => {
                                                    if (!handleInputChange) return;
                                                    if (newVal !== response) {
                                                        handleInputChange(activeCandidate.id, q.id, newVal);
                                                    }
                                                };

                                                return (
                                                    <div key={q.id} className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <label className="text-sm font-semibold text-[#323130] dark:text-slate-300">{q.question_text}</label>
                                                            {q.question_text.includes("Final Interviewer's Remarks") && activeCandidate.assigned_ops_validator_name && activeCandidate.assigned_ops_validator_name !== 'Unassigned' && (
                                                                <span className="text-[10px] font-bold text-[#0078d4] bg-[#eff6fc] dark:bg-slate-800 border border-[#c7e0f4] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                    Ops Validator: {activeCandidate.assigned_ops_validator_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={cn("text-sm text-[#323130] dark:text-slate-300 bg-[#faf9f8] rounded-[2px] border transition-colors min-h-[80px] p-3 cursor-pointer group relative flex flex-col", editingField === `${activeCandidate.id}:${q.id}` ? "border-[#0078d4] ring-1 ring-[#0078d4] bg-white dark:bg-slate-900" : "border-transparent hover:border-[#e1dfdd]")}
                                                            onDoubleClick={() => {
                                                                if (!handleInputChange) return;
                                                                setEditingField(editingField === `${activeCandidate.id}:${q.id}` ? null : `${activeCandidate.id}:${q.id}`);
                                                            }}
                                                            title="Double-click to edit"
                                                        >
                                                            {editingField === `${activeCandidate.id}:${q.id}` && handleInputChange ? (
                                                                <textarea
                                                                    autoFocus
                                                                    defaultValue={response}
                                                                    onBlur={(e) => {
                                                                        commitValue(e.target.value);
                                                                        setEditingField(null);
                                                                    }}
                                                                    className="w-full h-full bg-transparent resize-y outline-none min-h-[56px]"
                                                                    placeholder="Enter response..."
                                                                />
                                                            ) : (
                                                                <div className="flex-1 flex justify-between items-start">
                                                                    <div className="whitespace-pre-wrap flex-1">{response || '-'}</div>
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
                                            handleInputChange={handleInputChange}
                                            localChanges={localChanges[activeCandidate.id] || {}}
                                        />
                                    </div>
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
                                                if (onRefresh) onRefresh();
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
