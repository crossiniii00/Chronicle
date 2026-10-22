import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '@/components/common/Modal';
import { cn, STATUS_LABELS, STATUS_CSS, getStatusLabel } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SPECIFIC_STATUS_OPTIONS, SPECIFIC_STATUS_TO_OVERALL } from '@/pages/recruiter/tracker/utils/statusMappings';
import { History, ChevronDown, AlertTriangle, Edit2, CheckCircle2, MessageSquare } from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { socketService } from '@/services/socketService';
import { PositionService } from '@/services/PositionService';
import { UserService } from '@/services/UserService';
import { cleanColumn1Text } from '@/pages/recruiter/tracker/utils/tableHelpers';
import { playEditSound } from '@/utils/notificationSound';
import { DepartmentService } from '@/services/DepartmentService';
import { CellNotePopover } from '@/components/common/CellNotePopover';

let cachedRestrictedAccounts: Set<string> | null = null;
let fetchingRestrictedPromise: Promise<Set<string>> | null = null;
export const getRestrictedAccounts = async () => {
    if (cachedRestrictedAccounts) return cachedRestrictedAccounts;
    if (fetchingRestrictedPromise) return fetchingRestrictedPromise;
    fetchingRestrictedPromise = DepartmentService.getAll().then((depts: any) => {
        const restricted = depts.filter((d: any) => d.is_restricted || d.restricted || d.status === 'RESTRICTED');
        cachedRestrictedAccounts = new Set(restricted.map((d: any) => d.name.toLowerCase()));
        return cachedRestrictedAccounts;
    }).catch(() => new Set<string>());
    return fetchingRestrictedPromise;
};

const DROPDOWN_COLOR_PALETTE = [
    'text-blue-700 hover:bg-blue-50 bg-blue-50/20',
    'text-indigo-700 hover:bg-indigo-50 bg-indigo-50/20',
    'text-violet-700 hover:bg-violet-50 bg-violet-50/20',
    'text-purple-700 hover:bg-purple-50 bg-purple-50/20',
    'text-fuchsia-700 hover:bg-fuchsia-50 bg-fuchsia-50/20',
    'text-pink-700 hover:bg-pink-50 bg-pink-50/20',
    'text-rose-700 hover:bg-rose-50 bg-rose-50/20',
    'text-red-700 hover:bg-red-50 bg-red-50/20',
    'text-orange-700 hover:bg-orange-50 bg-orange-50/20',
    'text-amber-700 hover:bg-amber-50 bg-amber-50/20',
    'text-yellow-700 hover:bg-yellow-50 bg-yellow-50/20',
    'text-lime-700 hover:bg-lime-50 bg-lime-50/20',
    'text-green-700 hover:bg-green-50 bg-green-50/20',
    'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/20',
    'text-teal-700 hover:bg-teal-50 bg-teal-50/20',
    'text-cyan-700 hover:bg-cyan-50 bg-cyan-50/20',
    'text-sky-700 hover:bg-sky-50 bg-sky-50/20',
];

const getOptionColorClass = (opt: string) => {
    if (!opt || opt === '---') return "text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] bg-transparent";
    const upper = String(opt).toUpperCase();

    // Explicit known status mappings
    if (upper === 'CONFIRMED TRAINING') return 'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/30';
    if (upper === 'WITHDRAWN') return 'text-rose-700 hover:bg-rose-50 bg-rose-50/30';
    if (upper === 'PAN COMPLETED' || upper === 'PAN APPROVED' || upper === 'PAN FOR APPROVAL') return 'text-teal-700 hover:bg-teal-50 bg-teal-50/30';
    if (upper === 'FOR PAN AND BI') return 'text-orange-700 hover:bg-orange-50 bg-orange-50/30';
    if (upper === 'EXTERNAL') return 'text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 bg-slate-50 dark:bg-slate-800/50';
    if (upper === 'EMAIL SENT') return 'text-blue-700 hover:bg-blue-50 bg-blue-50/30';
    if (upper === 'AWAITING RESPONSE') return 'text-amber-700 hover:bg-amber-50 bg-amber-50/30';

    let hash = 0;
    for (let i = 0; i < upper.length; i++) {
        hash = upper.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DROPDOWN_COLOR_PALETTE.length;
    return DROPDOWN_COLOR_PALETTE[index];
};

// Module-level constant so it's not recreated on every cell render
const HIGHLIGHT_BORDER_MAP: Record<string, string> = {
    '#fef9c3': '#eab308', '#dcfce7': '#22c55e', '#fecdd3': '#f43f5e',
    '#dbeafe': '#3b82f6', '#ede9fe': '#8b5cf6',
    '#fffef2': '#eab308', '#f0fdf4': '#22c55e', '#fff1f2': '#f43f5e',
    '#eff6ff': '#3b82f6', '#f5f3ff': '#8b5cf6',
};

function toTitleCase(str: string): string {
    if (!str) return '';
    const trimmed = str.trim();
    if (trimmed === '---' || trimmed === '-') return trimmed;
    return trimmed
        .toLowerCase()
        .split(' ')
        .map(word => {
            return word
                .split('-')
                .map(subWord => subWord.charAt(0).toUpperCase() + subWord.slice(1))
                .join('-');
        })
        .join(' ');
}

function isPlaceholderOrTextGovId(val: any): boolean {
    if (!val) return true;
    const raw = String(val).trim();
    if (!raw) return true;
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleaned || cleaned.length < 4) return true;
    // Any string containing alphabetical letters (e.g. "Yes / To be followed", "TBF", "Pending", "N/A", "To follow", etc.) is text/placeholder, NOT a numeric ID!
    if (/[A-Z]/.test(cleaned)) return true;
    const commonPlaceholders = [
        'YES', 'NO', 'TOBEFOLLOWED', 'YESTOBEFOLLOWED', 'NOTOBEFOLLOWED',
        'TOFOLLOW', 'TOBEFOLLOW', 'NA', 'NONE', 'PENDING', 'TBF', 'N/A', 'NOTAPPLICABLE'
    ];
    return commonPlaceholders.includes(cleaned);
}

function getGovIdDuplicateWarning(app: any, targetField: string, value: any) {
    if (!value || isPlaceholderOrTextGovId(value)) return null;

    const fieldKey = (targetField || '').toLowerCase();
    const isGovIdCol = ['sss_no', 'philhealth_no', 'pag_ibig_no', 'pagibig_no', 'tin_no', 'sss', 'philhealth', 'pagibig', 'tin'].some(k => fieldKey.includes(k));
    if (!isGovIdCol) return null;

    const strVal = String(value).trim().toUpperCase().replace(/[^0-9]/g, '');
    if (!strVal || strVal.length < 5) return null;

    const pis = app?.pis || {};
    const metadata = app?.metadata || {};

    const rawSss = pis.sss_no || app?.sss_no || metadata.sss_no;
    const rawPhil = pis.philhealth_no || app?.philhealth_no || metadata.philhealth_no;
    const rawPag = pis.pagibig_no || pis.pag_ibig_no || app?.pagibig_no || metadata.pagibig_no;
    const rawTin = pis.tin_no || app?.tin_no || metadata.tin_no || metadata.master_tin_no;

    const idMap: Record<string, string> = {
        'SSS No.': isPlaceholderOrTextGovId(rawSss) ? '' : String(rawSss).replace(/[^0-9]/g, ''),
        'PhilHealth No.': isPlaceholderOrTextGovId(rawPhil) ? '' : String(rawPhil).replace(/[^0-9]/g, ''),
        'Pag-IBIG No.': isPlaceholderOrTextGovId(rawPag) ? '' : String(rawPag).replace(/[^0-9]/g, ''),
        'TIN No.': isPlaceholderOrTextGovId(rawTin) ? '' : String(rawTin).replace(/[^0-9]/g, ''),
    };

    const currentLabel = fieldKey.includes('sss') ? 'SSS No.' :
        fieldKey.includes('philhealth') ? 'PhilHealth No.' :
            fieldKey.includes('pag') ? 'Pag-IBIG No.' : 'TIN No.';

    for (const [otherLabel, otherVal] of Object.entries(idMap)) {
        if (otherLabel !== currentLabel && otherVal && otherVal.length >= 5 && otherVal === strVal) {
            return {
                isDuplicate: true,
                duplicateField: otherLabel,
                message: `⚠️ Duplicate ID Warning: This number (${value}) is identical to the ${otherLabel} field on this applicant!`
            };
        }
    }

    return null;
}

const getCustomColor = (opt: string, optionColors?: Record<string, any>) => {
    if (!optionColors || !opt) return null;
    if (optionColors[opt]) return optionColors[opt];
    const cleanOpt = String(opt).trim().toLowerCase();
    for (const key in optionColors) {
        if (key.trim().toLowerCase() === cleanOpt) {
            return optionColors[key];
        }
    }
    return null;
};

interface EditableCellProps {
    appId: string;
    field: string;
    subField?: string;
    appValues: Application;
    localChanges: Record<string, Partial<Application>>;
    onEdit: (appId: string, field: keyof Application, value: any) => void;
    isEditing: boolean;
    setIsEditing?: (val: boolean) => void;
    isActive: boolean;
    onPaint?: () => void;
    onShowHistory?: () => void;
    className?: string;
    options?: string[];
    optionColors?: Record<string, { bg: string; text: string; border: string }>;
    duplicateGovIdsMap?: Record<string, string[]>;
}

const getCellOptions = (field: string, subField?: string, options?: string[]): string[] | null => {
    if (options && options.length > 0) {
        if (field && field.toLowerCase().includes('status') && !field.toLowerCase().includes('overall')) {
            const hasAccepted = options.some(opt => typeof opt === 'string' && opt.toLowerCase() === 'accepted offer');
            if (!hasAccepted) {
                // Insert it after 'For Job Offer' if it exists, otherwise just push
                const joIndex = options.findIndex(opt => typeof opt === 'string' && opt.toLowerCase() === 'for job offer');
                if (joIndex !== -1) {
                    return [...options.slice(0, joIndex + 1), 'Accepted Offer', ...options.slice(joIndex + 1)];
                }
                return [...options, 'Accepted Offer'];
            }
        }
        return options;
    }
    if (field === 'overall_status' || subField === 'overall_status') {
        return ['OPEN', 'CLOSED', 'HIRED'];
    }
    if (field === 'current_status' || field === 'master_status') {
        return ['APPLIED', 'ACCEPTED OFFER', 'SENT JO AND BGC', 'FOR JOB OFFER', 'FOR PAN', 'PAN COMPLETED', 'PAN Issued; for Signature', 'PAN FOR APPROVAL', 'FOR PAN AND BI', 'PASSED', 'HIRED', 'LATERAL TRANSFER', 'WITHDRAWN', 'CLOSED'];
    }
    if (field === 'final_specific_status' || field === 'pis_final_specific_status' || subField === 'final_specific_status') {
        return SPECIFIC_STATUS_OPTIONS;
    }
    if (field === 'master_first_day_show_up' || field === 'master_second_day_show_up') {
        return ['Showed', 'No-Show', 'Fallout', 'NA'];
    }
    if (field === 'master_nbi_result') {
        return ['Done', 'Pending', 'NA'];
    }
    if (field === 'master_peme_status') {
        return ['Endorsed', 'NA'];
    }
    if (field === 'master_peme_result') {
        return ['Class A', 'Class B', 'Class C', 'Pending', 'NA'];
    }
    if (field === 'master_bgs_status') {
        return ['Done', 'Pending', 'NA'];
    }
    if (['master_sss_status', 'master_philhealth_status', 'master_pagibig_status'].includes(field)) {
        return ['N/A', 'Pending', 'Submitted'];
    }
    if (field === 'master_bi_endorsement_date') {
        return ['Endorsed', 'NA'];
    }
    if (field === 'master_bi_result') {
        return ['Positive', 'Negative', 'Closed', 'NA'];
    }
    if (field === 'master_training_confirmation') {
        return ['Confirmed Training', 'Sent Training Details', 'NA'];
    }
    if (field === 'hiring_source' || subField === 'hiring_source_detailed') {
        return [
            'JOBSTREET',
            'JOB ADS',
            'INSTAGRAM',
            'FACEBOOK',
            'EMPLOYEE REFERRALS',
            'WALK-IN',
            'LINKEDIN',
            'INDEED',
            'COMPANY WEBSITE',
            'CAROUSELL',
            'TIKTOK',
            'OFFLINE ADS'
        ];
    }
    if (field === 'master_rcbc_status') {
        return ['Done', 'Pending', 'Submitted', 'NA'];
    }
    if (field === 'drug_test') {
        return ['Cleared', 'Pending', 'Positive', 'Negative', 'NA'];
    }
    if (field === 'master_h2r_status') {
        return ['Done', 'Pending', 'NA'];
    }
    if (field === 'master_last_keep_warm') {
        const today = new Date();
        const opts: string[] = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            opts.push(`${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`);
        }
        return opts;
    }
    return null;
}

const RecruiterSelect = ({ localVal, setLocalVal, handleCommit, onEdit, handleSaveImmediately, appId, field }: any) => {
    const [recruiterOptions, setRecruiterOptions] = useState<{ name: string, avatar: string | null }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            let options: { name: string, avatar: string | null }[] = [];
            try {
                const cached = localStorage.getItem('cached_users');
                if (cached) {
                    const users = JSON.parse(cached);
                    options = users
                        .filter((u: any) => {
                            const r = (u.role || '').toLowerCase();
                            return (r.includes('recruiter') || ['admin', 'super_admin'].includes(r)) && u.is_active !== false;
                        })
                        .map((u: any) => ({ name: (u.full_name || '').trim(), avatar: u.avatar_data || null }))
                        .filter((o: any) => o.name)
                        .sort((a: any, b: any) => a.name.localeCompare(b.name));
                    if (isMounted) setRecruiterOptions(options);
                    return; // loaded from cache
                }
            } catch (e) {
                console.error('Failed to parse cached users', e);
            }

            // Fallback to fetching
            try {
                const users = await UserService.getAll();
                try {
                    localStorage.setItem('cached_users', JSON.stringify(users));
                } catch (e) { }
                options = users
                    .filter((u: any) => {
                        const r = (u.role || '').toLowerCase();
                        return (r.includes('recruiter') || ['admin', 'super_admin'].includes(r)) && u.is_active !== false;
                    })
                    .map((u: any) => ({ name: (u.full_name || '').trim(), avatar: u.avatar_data || null }))
                    .filter((o: any) => o.name)
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));
                if (isMounted) setRecruiterOptions(options);
            } catch (err) {
                console.error(err);
            }
        };
        load();
        return () => { isMounted = false; };
    }, []);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={containerRef} className="w-full h-full relative cursor-pointer group" onClick={handleToggle}>
            <div className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase truncate bg-white dark:bg-slate-900 flex items-center justify-between group-hover:bg-surface-50 transition-colors">
                <span>{localVal || '--- SELECT RECRUITER ---'}</span>
                <ChevronDown size={14} className="opacity-50" />
            </div>

            {isOpen && coords && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[2147483000] cursor-default"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            handleCommit();
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: coords.top + 2,
                            left: coords.left,
                            minWidth: Math.max(coords.width, 240),
                            width: coords.width,
                            zIndex: 2147483001
                        }}
                        className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium py-1 max-h-60 overflow-y-auto rounded-none flex flex-col"
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                setLocalVal('');
                                onEdit(appId, field as keyof Application, '');
                                handleSaveImmediately('');
                            }}
                            className="w-full text-left px-3 py-2 text-[10px] font-semibold transition-colors uppercase whitespace-nowrap cursor-pointer border-b border-surface-100 hover:bg-surface-50 flex items-center gap-2 text-surface-500"
                        >
                            --- SELECT RECRUITER ---
                        </button>
                        {recruiterOptions.map(opt => (
                            <button
                                key={opt.name}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    setLocalVal(opt.name);
                                    onEdit(appId, field as keyof Application, opt.name);
                                    handleSaveImmediately(opt.name);
                                }}
                                className="w-full text-left px-3 py-2 text-[10px] font-semibold transition-colors uppercase whitespace-nowrap cursor-pointer border-b border-surface-100 last:border-none hover:bg-surface-50 flex items-center gap-2"
                            >
                                <img
                                    src={opt.avatar || '/contactpoint-logo.png?v=2'}
                                    alt={opt.name}
                                    className={cn("w-6 h-6 rounded-full object-cover shrink-0 border border-surface-200", !opt.avatar && "grayscale opacity-70 p-[2px]")}
                                />
                                <span className="truncate">{opt.name}</span>
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export const EditableCell = React.memo(({
    appId, field, subField, appValues, localChanges = {}, onEdit: parentOnEdit, isEditing, setIsEditing, isActive, onPaint, onShowHistory, className,
    options,
    optionColors,
    duplicateGovIdsMap
}: EditableCellProps) => {
    const [restrictedAccounts, setRestrictedAccounts] = useState<Set<string>>(cachedRestrictedAccounts || new Set());
    useEffect(() => {
        if (!cachedRestrictedAccounts) {
            getRestrictedAccounts().then(setRestrictedAccounts);
        }
    }, []);

    // Management of internal focus state for the PAINT experience
    const [isFocused, setIsFocused] = useState(false);

    // Management of local value to prevent massive global re-renders on every keystroke
    const [localVal, setLocalVal] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    // Gov ID Prompt State
    const [govIdPrompt, setGovIdPrompt] = useState<{ isOpen: boolean; field: string; value: any; appId: string; resolve?: (val: string) => void }>({ isOpen: false, field: '', value: '', appId: '' });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const inputRef = React.useRef<any>(null);
    React.useEffect(() => {
        if (isEditing && isActive) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isEditing, isActive]);


    // Positions fetch
    const [positionOptions, setPositionOptions] = useState<string[]>([]);
    useEffect(() => {
        if (field === 'position_title') {
            PositionService.getAllOpen().then(pos => {
                const uniqueTitles = Array.from(new Set(pos.map(p => p.title).filter(Boolean)));
                setPositionOptions(uniqueTitles);
            }).catch(() => { });
        }
    }, [field]);

    // Context Menu State
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [isCustomEditing, setIsCustomEditing] = useState(false);
    const [noteMenuOpen, setNoteMenuOpen] = useState(false);
    const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
    const [contextMenuCoords, setContextMenuCoords] = useState<{ top: number; left: number; width: number, bottom: number, right: number } | null>(null);
    const [localNote, setLocalNote] = useState('');

    const colKey = subField ? `${field}.${subField}` : field;

    // Note Popover State
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [notePos, setNotePos] = useState<{ left: number; top: number; placement: 'up' | 'down' } | null>(null);
    const cellRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isActive || !isEditing) {
            setIsCustomEditing(false);
            setShowContextMenu(false);
            setNoteMenuOpen(false);
            setHighlightMenuOpen(false);
            setLocalNote('');
            setIsDropdownOpen(false);
        }
    }, [isActive, isEditing]);

    // Auto-clear 'saved' indicator after 2s with proper cleanup
    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const handleSaveMetadata = async (type: 'note' | 'highlight', value: string) => {
        const currentMeta = appValues.metadata || {};
        const metaKey = type === 'note' ? 'cell_notes' : 'cell_highlights';
        const currentData = currentMeta[metaKey] || {};

        const newMeta = {
            ...currentMeta,
            [metaKey]: {
                ...currentData,
                [colKey]: value
            }
        };

        try {
            await ApplicationService.patch(appId, { metadata: newMeta });
            // Server already emits 'applications:updated' on PATCH — no client-side emit needed
        } catch (err) {
            console.error('Failed to save metadata:', err);
        }
    };

    const handleSaveImmediatelyDirectly = async (fld: string, val: any) => {
        let updateObject: any = {};
        if (subField) {
            updateObject = {
                [field]: val
            };
        } else {
            updateObject = {
                [fld]: val
            };
        }

        // Keep account fields synchronized globally across department, endorsement_account, and pis object
        const isAccountField = fld === 'department' || fld === 'endorsement_account' || subField === 'final_account' || subField === 'initial_account_assignment' || (fld === 'pis' && val && typeof val === 'object' && (val.final_account !== undefined || val.initial_account_assignment !== undefined));
        if (isAccountField) {
            const accVal = typeof val === 'object' ? (val.final_account || val.initial_account_assignment || '') : String(val);
            updateObject.department = accVal;
            updateObject.endorsement_account = accVal;
            updateObject.pis = {
                ...(updateObject.pis || {}),
                final_account: accVal,
                initial_account_assignment: accVal
            };
        }

        if (fld === 'current_status' || fld === 'master_status') {
            const upperVal = String(val).toUpperCase();
            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(upperVal)) {
                if (!appValues?.hired_at) {
                    updateObject.hired_at = new Date().toISOString();
                }
            }
            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(upperVal)) {
                updateObject.master_column = 'MASTERLIST';
                updateObject.master_status = val;
            }
            if ([
                'PASSED', 'FAILED', 'REJECTED', 'HIRED', 'HIRED_PROCESSED',
                'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER'
            ].includes(upperVal)) {
                if (!appValues?.interview_completed_at) {
                    updateObject.interview_completed_at = new Date().toISOString();
                }
            }
        }

        if (fld === 'pis' && val && typeof val === 'object' && 'final_specific_status' in val && val.final_specific_status) {
            const specStatus = val.final_specific_status;
            if (specStatus.toLowerCase().includes('hired') && !appValues?.hired_at) {
                updateObject.hired_at = new Date().toISOString();
            }
            const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[specStatus];
            if (mappedOverall) {
                let targetOverall = 'OPEN';
                if (mappedOverall === 'CLOSED' || mappedOverall === 'HIRED' || mappedOverall === 'OPEN') {
                    targetOverall = mappedOverall;
                }
                let nextCurrentStatus = undefined;
                if (mappedOverall === 'HIRED') {
                    nextCurrentStatus = 'HIRED';
                } else if (mappedOverall === 'For Job Offer') {
                    nextCurrentStatus = 'For Job Offer';
                } else if (mappedOverall === 'CLOSED') {
                    if (specStatus.toLowerCase().includes('withdraw') || specStatus.toLowerCase().includes('withdrew') || specStatus.toLowerCase().includes('declined')) {
                        nextCurrentStatus = 'WITHDRAWN';
                    } else if (specStatus.toLowerCase().includes('failed')) {
                        nextCurrentStatus = 'FAILED';
                    }
                }
                if (nextCurrentStatus) {
                    updateObject.current_status = nextCurrentStatus;
                    updateObject.master_status = nextCurrentStatus;
                }
            }
        }

        try {
            setSaveStatus('saving');
            await ApplicationService.patch(appId, updateObject);
            setSaveStatus('saved');

            // Server already emits 'applications:updated' on PATCH — no client-side emit needed
        } catch (err) {
            console.error('Failed to auto-save:', err);
            setSaveStatus('idle');
        }
    };

    const onEdit = (id: string, fld: keyof Application, val: any) => {
        const nameFields = ['master_first_name', 'master_last_name', 'master_middle_name', 'applicant_name', 'first_name', 'last_name', 'middle_name'];
        let finalVal = val;
        if (nameFields.includes(fld as string) || (subField && nameFields.includes(subField))) {
            finalVal = toTitleCase(val);
        }
        parentOnEdit(id, fld, finalVal);
    };

    const handleSaveImmediately = async (val: string) => {
        const nameFields = ['master_first_name', 'master_last_name', 'master_middle_name', 'applicant_name', 'first_name', 'last_name', 'middle_name'];
        let finalVal = val;
        if (nameFields.includes(field) || (subField && nameFields.includes(subField))) {
            finalVal = toTitleCase(val);
        }

        const isGovId = ['sss_no', 'philhealth_no', 'pag_ibig_no', 'pagibig_no', 'tin_no'].includes((subField || field) as string);
        if (isGovId && isEditing) {
            const actualField = subField || field;
            setGovIdPrompt({
                isOpen: true,
                field: actualField as string,
                value: finalVal,
                appId: appId,
                resolve: (decision: string) => {
                    if (decision === 'cancel') {
                        // Keep current cell value but don't save to DB
                        return;
                    }

                    let updateObject: any = {};
                    if (decision === 'both') {
                        updateObject = {
                            [actualField as string]: finalVal,
                            pis: {
                                ...(appValues.pis || {}),
                                [actualField as string]: finalVal
                            }
                        };
                    } else if (decision === 'masterlist') {
                        updateObject = {
                            [actualField as string]: finalVal
                        };
                    }

                    if (subField) {
                        const currentNestedFromLocal = (rowChanges && (rowChanges as any)[field]) || {};
                        const nested = {
                            ...((appValues as any)[field] || {}),
                            ...currentNestedFromLocal,
                            [subField]: finalVal
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, finalVal);
                    }

                    setSaveStatus('saving');
                    ApplicationService.patch(appId, updateObject).then(() => {
                        playEditSound();
                        setSaveStatus('saved');
                    }).catch(err => {
                        console.error('Failed to auto-save:', err);
                        setSaveStatus('idle');
                    });
                }
            });
            return;
        }

        let updateObject: any = {};
        if (subField) {
            updateObject = {
                [field]: {
                    [subField]: finalVal
                }
            };
        } else {
            updateObject = {
                [field]: finalVal
            };
        }

        if (field === 'department' || (field === 'pis' && subField === 'final_account')) {
            updateObject.department = finalVal;
            updateObject.endorsement_account = finalVal;
            updateObject.pis = {
                ...(updateObject.pis || {}),
                final_account: finalVal
            };
        }

        if (field === 'current_status' || field === 'master_status') {
            const upperVal = String(val).toUpperCase();
            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(upperVal)) {
                if (!appValues?.hired_at) {
                    updateObject.hired_at = new Date().toISOString();
                }
            }
            if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(upperVal)) {
                updateObject.master_column = 'MASTERLIST';
                updateObject.master_status = val;
            }
            if ([
                'PASSED', 'FAILED', 'REJECTED', 'HIRED', 'HIRED_PROCESSED',
                'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER'
            ].includes(upperVal)) {
                if (!appValues?.interview_completed_at) {
                    updateObject.interview_completed_at = new Date().toISOString();
                }
            }
        }

        if (field === 'pis' && subField === 'final_specific_status' && val) {
            if (val.toLowerCase().includes('hired') && !appValues?.hired_at) {
                updateObject.hired_at = new Date().toISOString();
            }
            const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[val];
            if (mappedOverall) {
                let targetOverall = 'OPEN';
                if (mappedOverall === 'CLOSED' || mappedOverall === 'HIRED' || mappedOverall === 'OPEN') {
                    targetOverall = mappedOverall;
                }
                let nextCurrentStatus = undefined;
                if (mappedOverall === 'HIRED') {
                    nextCurrentStatus = 'HIRED';
                } else if (mappedOverall === 'For Job Offer') {
                    nextCurrentStatus = 'For Job Offer';
                } else if (mappedOverall === 'CLOSED') {
                    if (val.toLowerCase().includes('withdraw') || val.toLowerCase().includes('withdrew') || val.toLowerCase().includes('declined')) {
                        nextCurrentStatus = 'WITHDRAWN';
                    } else if (val.toLowerCase().includes('failed')) {
                        nextCurrentStatus = 'FAILED';
                    }
                }
                if (nextCurrentStatus) {
                    updateObject.current_status = nextCurrentStatus;
                    updateObject.master_status = nextCurrentStatus;
                }
            }
        }

        if (subField) {
            const currentNestedFromLocal = (rowChanges && (rowChanges as any)[field]) || {};
            const nested = {
                ...((appValues as any)[field] || {}),
                ...currentNestedFromLocal,
                [subField]: val
            };
            onEdit(appId, field as keyof Application, nested);
        } else {
            onEdit(appId, field as keyof Application, val);
        }

        // Do not auto-save intercepted statuses, let the masterlist modals handle them
        const upperVal = String(val).toUpperCase();
        const isIntercepted = upperVal === 'CONFIRMED TRAINING' || upperVal === 'WITHDRAWN' || upperVal === 'CLOSED';
        if (isIntercepted && (field === 'current_status' || field === 'master_status' || subField === 'final_specific_status' || field === 'final_specific_status')) {
            return;
        }

        try {
            setSaveStatus('saving');
            await ApplicationService.patch(appId, updateObject);
            playEditSound();
            setSaveStatus('saved');

            // Server already emits 'applications:updated' on PATCH — no client-side emit needed
        } catch (err) {
            console.error('Failed to auto-save:', err);
            setSaveStatus('idle');
        }
    };

    // Safety check - MUST BE AFTER HOOKS
    const hasAppValues = !!appValues;

    // Determine the raw value from DB
    let baseValue = '';
    if (hasAppValues) {
        try {
            if (subField) {
                baseValue = (appValues as any)?.[field]?.[subField] || '';
            } else {
                let rootVal = (appValues as any)?.[field];
                if (rootVal === undefined && (appValues as any)?.pis) {
                    rootVal = (appValues as any).pis[field];
                }
                baseValue = rootVal || '';

                // Fallback for Master first and last names if they are empty
                if ((field === 'master_first_name' || field === 'master_last_name') && !baseValue && appValues.applicant_name) {
                    const nameStr = String(appValues.applicant_name).trim();
                    if (nameStr) {
                        let extractedFirst = '';
                        let extractedLast = '';
                        if (nameStr.includes(',')) {
                            const parts = nameStr.split(',').map((s: string) => s.trim());
                            extractedLast = parts[0];
                            extractedFirst = parts[1] || '';
                        } else {
                            const parts = nameStr.split(/\s+/);
                            if (parts.length === 1) {
                                extractedFirst = parts[0];
                            } else {
                                extractedFirst = parts.slice(0, -1).join(' ');
                                extractedLast = parts[parts.length - 1];
                            }
                        }
                        if (field === 'master_first_name') baseValue = extractedFirst;
                        if (field === 'master_last_name') baseValue = extractedLast;
                    }
                }

                // Fallback for Master Status
                if (field === 'master_status' && (!baseValue || baseValue === 'Open' || baseValue === 'OPEN')) {
                    const specific = (appValues as any).pis_final_specific_status || '';
                    const isPassed = specific.toUpperCase().includes('PASSED') || appValues.current_status?.toUpperCase() === 'PASSED';
                    baseValue = isPassed ? 'For Job Offer' : (appValues.current_status || '');
                }
            }

            // For the Account (department) or Final Account column, resolve using pis.final_account
            // Same logic as the Sheet Registry "Final Account" column
            if (field === 'department' || (field === 'pis' && subField === 'final_account')) {
                const pis = (appValues as any).pis || {};
                let rawVal = (field === 'pis' && subField === 'final_account')
                    ? baseValue
                    : (pis.final_account || (appValues as any).endorsement_account || baseValue || '');

                if (field === 'department') {
                    const lobsToRemove = ['Agent - Backoffice', 'Agent - Case Manager', 'Case Manager', 'BDR', 'DIA'];
                    for (const lob of lobsToRemove) {
                        const regex = new RegExp(lob, 'gi');
                        if (regex.test(rawVal)) {
                            rawVal = rawVal.replace(regex, '').trim();
                        }
                    }

                    rawVal = rawVal
                        .replace(/Kelly Postman/gi, 'Keller Postman')
                        .replace(/Postman/gi, 'Keller Postman')
                        .replace(/Keller\s+Keller\s+Postman/gi, 'Keller Postman')
                        .replace(/The Savings/gi, 'The Savings Group');
                }

                if (rawVal) {
                    const failedAccounts = (appValues as any).metadata?.failed_accounts || [];
                    const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));

                    const remaining = rawVal
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter((s: string) => s && !failedSet.has(s.toLowerCase()));

                    if (remaining.length > 0) {
                        baseValue = remaining[0];
                    } else {
                        baseValue = rawVal.split(',')[0].trim();
                    }
                }
            }

            // Clean LOB column values inside editable view
            if (field === 'pis' && subField === 'custom_lob') {
                if (!baseValue) {
                    const deptVal = String((appValues as any).department || '').toUpperCase();
                    if (deptVal.includes('BDR')) baseValue = 'BDR';
                    else if (deptVal.includes('DIA')) baseValue = 'DIA';
                }
            }
        } catch (e) {
            baseValue = '';
        }
    }

    // Resolve the changes for this specific application (safely handles global localChanges vs row-local localChanges)
    const rowChanges = (localChanges && typeof localChanges === 'object' && appId in localChanges && typeof (localChanges as any)[appId] === 'object')
        ? (localChanges as any)[appId]
        : localChanges;

    // Determine the current value including local un-synced edits
    let currentValue = baseValue;
    if (rowChanges && Object.keys(rowChanges).length > 0) {
        try {
            if (subField) {
                currentValue = (rowChanges as any)?.[field]?.[subField] ?? baseValue;
            } else {
                currentValue = (rowChanges as any)?.[field] ?? baseValue;
            }
        } catch (e) {
            currentValue = baseValue;
        }
    }

    const isRemarksCol = field === 'final_interview_notes' || field === 'master_remarks' || field === 'ops_validator_notes' || subField === 'ops_validator_notes' || (field && field.toLowerCase().includes('remark'));
    if (isRemarksCol && typeof currentValue === 'string' && currentValue) {
        currentValue = currentValue.replace(/\s*\(Force Pass\)/gi, '').replace(/\s*\(Force Fail\)/gi, '');
        const cleaned = cleanColumn1Text(currentValue);
        const availableOpts = ['Confirmed Training', 'Withdrawn', 'PAN Approved', 'PAN Completed', 'Training Details Sent', 'Final Interview Passed', ...(options || [])]
            .map(opt => typeof opt === 'string' ? opt.replace(/\s*\(Force Pass\)/gi, '').replace(/\s*\(Force Fail\)/gi, '') : opt);
        const isMatchedOption = availableOpts.some(opt => typeof opt === 'string' && opt.toLowerCase().trim() === cleaned.toLowerCase().trim());
        if (isMatchedOption) {
            currentValue = cleaned;
        } else if (cleaned && !cleaned.includes(':') && !cleaned.includes('|') && !cleaned.toLowerCase().includes('issue') && !cleaned.toLowerCase().includes('highest') && !cleaned.toLowerCase().includes('education') && !cleaned.toLowerCase().includes('observation') && !cleaned.toLowerCase().includes('category') && !cleaned.toLowerCase().includes('assessment') && !cleaned.toLowerCase().includes('rubric') && !cleaned.toLowerCase().includes('experience') && !cleaned.toLowerCase().includes('salary')) {
            currentValue = cleaned;
        } else {
            currentValue = '';
        }
    } else if (typeof currentValue === 'string' && (currentValue.includes('===') || currentValue.toLowerCase().includes('personal rating:'))) {
        currentValue = cleanColumn1Text(currentValue);
    }

    // Keep local state synced if external value updates (e.g. after sync).
    useEffect(() => {
        let val = currentValue !== null && currentValue !== undefined ? String(currentValue) : '';

        // Auto-prepend PHP for salary fields when editing
        if (isEditing && isActive && (field === 'master_basic_salary' || field === 'master_allowance')) {
            if (!val || val.trim() === '---' || val.trim() === '-' || val.trim().toLowerCase() === 'n/a') {
                val = 'PHP ';
            } else if (!val.toLowerCase().includes('php')) {
                val = `PHP ${val}`;
            }
        }

        setLocalVal(val);
    }, [currentValue, isEditing, isActive, field]);


    if (!hasAppValues) return <span className={className}>---</span>;

    const handleCommit = () => {
        setIsFocused(false);
        if (localVal === currentValue) return;
        handleSaveImmediately(localVal);
    };

    let cellOptions = getCellOptions(field, subField, options);
    if (field === 'position_title' && positionOptions.length > 0) {
        cellOptions = positionOptions;
    }
    const isEditorActive = isEditing && isActive;

    const govIdModalNode = govIdPrompt.isOpen ? (
        <Modal
            open={govIdPrompt.isOpen}
            onClose={() => {
                if (govIdPrompt.resolve) govIdPrompt.resolve('cancel');
                setGovIdPrompt({ isOpen: false, field: '', value: '', appId: '' });
            }}
            title={
                <div className="flex items-center gap-2 text-surface-900">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="font-bold tracking-tight">Government ID Sync</span>
                </div>
            }
            size="sm"
        >
            <div className="flex flex-col gap-4 p-5 pt-2 text-sm text-surface-600">
                <p className="font-medium text-surface-700 leading-relaxed">
                    Do you also want this change to reflect in the applicant's <span className="font-bold text-primary-600">PIS form</span>?
                </p>
                <div className="flex flex-col gap-2 mt-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (govIdPrompt.resolve) govIdPrompt.resolve('both');
                            setGovIdPrompt({ isOpen: false, field: '', value: '', appId: '' });
                        }}
                        className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <CheckCircle2 size={16} />
                        Update Both Masterlist & PIS
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (govIdPrompt.resolve) govIdPrompt.resolve('masterlist');
                            setGovIdPrompt({ isOpen: false, field: '', value: '', appId: '' });
                        }}
                        className="w-full py-2.5 px-4 bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-md font-semibold transition-all cursor-pointer"
                    >
                        Update Masterlist ONLY
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (govIdPrompt.resolve) govIdPrompt.resolve('cancel');
                            setGovIdPrompt({ isOpen: false, field: '', value: '', appId: '' });
                        }}
                        className="w-full py-2.5 px-4 border-2 border-surface-200 text-surface-600 hover:bg-surface-50 hover:text-surface-900 rounded-md font-semibold transition-all mt-2 cursor-pointer"
                    >
                        Cancel Edit
                    </button>
                </div>
            </div>
        </Modal>
    ) : null;

    const wrapWithSave = (content: React.ReactNode) => (
        <div className="relative w-full h-full flex items-center">
            {content}
            {saveStatus === 'saved' && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-200 z-50 animate-bounce">
                    <CheckCircle2 size={14} className="stroke-[3]" />
                </span>
            )}
            {govIdModalNode}
        </div>
    );

    if (cellOptions && cellOptions.length > 0 && isEditorActive && !isCustomEditing) {
        return wrapWithSave(
            <div className="relative w-full h-full min-h-[36px] flex items-center bg-white dark:bg-slate-900 border-none">
                <input
                    type="text"
                    ref={inputRef}
                    value={localVal}
                    onChange={(e) => {
                        setLocalVal(e.target.value);
                    }}
                    onBlur={(e) => {
                        // Delay handleCommit slightly so that clicking an option from the select triggers its onChange first
                        setTimeout(handleCommit, 150);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCommit();
                            if (setIsEditing) setIsEditing(false);
                            (e.target as HTMLElement).blur();
                        }
                    }}
                    className="w-full h-full pl-3 pr-8 py-2 text-[11px] font-bold uppercase outline-none rounded-none bg-white dark:bg-slate-900 border-none text-left"
                    placeholder="Type or select..."
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const cellEl = e.currentTarget.closest('td') || e.currentTarget.parentElement;
                        if (cellEl) {
                            const rect = cellEl.getBoundingClientRect();
                            setDropdownCoords({
                                top: rect.bottom + window.scrollY,
                                left: rect.left + window.scrollX,
                                width: Math.max(rect.width, 160)
                            });
                        }
                        setIsDropdownOpen(!isDropdownOpen);
                    }}
                    className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center border-none cursor-pointer bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] transition-colors"
                >
                    <ChevronDown size={14} className="text-surface-500 pointer-events-none" />
                </button>
                {isDropdownOpen && dropdownCoords && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[2147483000] cursor-default"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(false);
                            }}
                        />
                        <div
                            ref={(el) => {
                                // Auto-flip: measure dropdown height and flip upward if near viewport bottom
                                if (el) {
                                    const dropdownHeight = el.scrollHeight;
                                    const cellBottom = dropdownCoords.top - window.scrollY + 2;
                                    const viewportHeight = window.innerHeight;
                                    const spaceBelow = viewportHeight - cellBottom;
                                    if (spaceBelow < dropdownHeight && cellBottom > dropdownHeight) {
                                        // Flip upward: position above the cell
                                        const cellTop = dropdownCoords.top - window.scrollY;
                                        // The cell height is roughly the distance from cellTop to cellBottom
                                        // We stored rect.bottom in top, so rect.top ≈ top - rect.height
                                        // Approximate: place bottom of dropdown at the cell top
                                        el.style.top = '';
                                        el.style.bottom = `${viewportHeight - cellTop + dropdownHeight - el.scrollHeight + 2}px`;
                                        el.style.top = `${cellTop - dropdownHeight - 2}px`;
                                    }
                                }
                            }}
                            style={{
                                position: 'fixed',
                                top: (dropdownCoords.top - window.scrollY) + 2,
                                left: dropdownCoords.left,
                                minWidth: Math.max(dropdownCoords.width, 140),
                                width: dropdownCoords.width,
                                zIndex: 2147483001
                            }}
                            className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium py-1 max-h-60 overflow-y-auto rounded-none animate-fade-in"
                        >
                            {['---', ...Array.from(
                                (cellOptions || []).reduce((map, opt) => {
                                    const key = (field === 'current_status' || field === 'master_status' || field === 'overall_status')
                                        ? getStatusLabel(opt as string)
                                        : opt;
                                    if (!map.has(key)) {
                                        map.set(key, opt);
                                    }
                                    return map;
                                }, new Map()).values()
                            )]
                                .map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDropdownOpen(false);
                                            const finalVal = opt === '---' ? '' : opt;
                                            setLocalVal(finalVal);
                                            handleSaveImmediately(finalVal);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-colors uppercase whitespace-nowrap block cursor-pointer flex items-center",
                                            "text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4]"
                                        )}
                                    >
                                        {getCustomColor(opt, optionColors) ? (
                                            <span
                                                className="px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase"
                                                style={{
                                                    backgroundColor: getCustomColor(opt, optionColors).bg,
                                                    color: getCustomColor(opt, optionColors).text,
                                                    borderColor: getCustomColor(opt, optionColors).border
                                                }}
                                            >
                                                {opt}
                                            </span>
                                        ) : (field === 'current_status' || field === 'master_status' || field === 'overall_status') && opt !== '---' ? (
                                            <div className="pointer-events-none scale-90 origin-left -my-1">
                                                <StatusBadge status={opt as any} />
                                            </div>
                                        ) : opt === '---' ? (
                                            opt
                                        ) : (
                                            <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase inline-block border border-transparent", getOptionColorClass(opt))}>
                                                {opt}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            <div className="border-t border-surface-200 my-1" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                    setIsCustomEditing(true);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap block cursor-pointer"
                            >
                                Custom Edit
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                    setContextMenuCoords({
                                        top: dropdownCoords.top,
                                        left: dropdownCoords.left,
                                        bottom: dropdownCoords.top,
                                        right: dropdownCoords.left + dropdownCoords.width,
                                        width: dropdownCoords.width
                                    });
                                    setShowContextMenu(true);
                                    setLocalNote(appValues.metadata?.cell_notes?.[colKey] || '');
                                    setNoteMenuOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap block cursor-pointer"
                            >
                                Add/Edit Note
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                    setContextMenuCoords({
                                        top: dropdownCoords.top,
                                        left: dropdownCoords.left,
                                        bottom: dropdownCoords.top,
                                        right: dropdownCoords.left + dropdownCoords.width,
                                        width: dropdownCoords.width
                                    });
                                    setShowContextMenu(true);
                                    setHighlightMenuOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap flex items-center justify-between cursor-pointer"
                            >
                                Highlight Cell
                                <div className="flex gap-1 ml-2">
                                    {['#fef9c3', '#dcfce7', '#fecdd3', '#dbeafe', '#ede9fe'].map(c => (
                                        <div key={c} className="w-3 h-3 rounded-sm border border-black/10" style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </button>
                            {appValues.metadata?.cell_notes?.[colKey] && (
                                <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 mt-1">
                                    <div className="text-[9px] font-black text-amber-700 uppercase tracking-wider mb-1">View Notes</div>
                                    <div className="text-[10px] text-amber-900 font-medium whitespace-pre-wrap leading-tight">
                                        {appValues.metadata.cell_notes[colKey]}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>,
                    document.body
                )}
            </div>
        );
    }

    if ((field?.toLowerCase().includes('date') || subField?.toLowerCase().includes('date')) && isEditorActive) {
        return wrapWithSave(
            <input
                type="date"
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => setLocalVal(e.target.value)}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none bg-white dark:bg-slate-900 !border-none text-center"
            />
        );
    }

    if ((field === 'overall_status' || subField === 'overall_status') && isEditorActive) {
        const activeClass = (STATUS_CSS as any)[localVal] || 'status-applied';
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    const newVal = e.target.value;
                    setLocalVal(newVal);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: newVal
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, newVal);
                    }
                    handleSaveImmediately(newVal);
                }}
                className={cn(
                    "w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer !border-none",
                    activeClass
                )}
                style={{ textAlign: 'center' }}
            >
                {['OPEN', 'CLOSED', 'HIRED'].map(status => (
                    <option
                        key={status}
                        value={status}
                        className="bg-white dark:bg-slate-900 text-black font-semibold text-left"
                    >
                        {status}
                    </option>
                ))}
            </select>
        );
    }

    if ((field === 'assigned_recruiter_name' || field === 'interviewer_name') && isEditorActive) {
        return wrapWithSave(
            <RecruiterSelect
                localVal={localVal}
                setLocalVal={setLocalVal}
                handleCommit={handleCommit}
                onEdit={onEdit}
                handleSaveImmediately={handleSaveImmediately}
                appId={appId}
                field={field}
            />
        );
    }


    if ((field === 'final_specific_status' || field === 'pis_final_specific_status' || subField === 'final_specific_status') && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: e.target.value
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, e.target.value);
                    }
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">--- SELECT STATUS ---</option>
                {SPECIFIC_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if ((field === 'master_first_day_show_up' || field === 'master_second_day_show_up') && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none text-center"
            >
                <option value="">---</option>
                <option value="Showed">Showed</option>
                <option value="No-Show">No-Show</option>
                <option value="Fallout">Fallout</option>
            </select>
        );
    }

    if (field === 'master_nbi_result' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
                style={{ textAlign: 'center' }}
            >
                <option value="">---</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
            </select>
        );
    }

    if (field === 'master_peme_status' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                <option value="Endorsed">Endorsed</option>
            </select>
        );
    }

    if (field === 'master_peme_result' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                {['Class A', 'Class B', 'Class C', 'Pending'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
        );
    }

    if (field === 'master_bgs_status' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
            </select>
        );
    }

    if (['master_sss_status', 'master_philhealth_status', 'master_pagibig_status'].includes(field) && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
                style={{ textAlign: 'center' }}
            >
                <option value="">---</option>
                <option value="N/A">N/A</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
            </select>
        );
    }

    if (field === 'master_bi_endorsement_date' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                <option value="Endorsed">Endorsed</option>
                <option value="NA">NA</option>
            </select>
        );
    }

    if (field === 'master_last_keep_warm' && isEditorActive) {
        const today = new Date();
        const dateOptions: { value: string; label: string }[] = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const value = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila' });
            dateOptions.push({ value, label });
        }
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                {dateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    if (field === 'master_bi_result' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
                <option value="Closed">Closed</option>
            </select>
        );
    }

    if (field === 'master_training_confirmation' && isEditorActive) {
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">---</option>
                <option value="Confirmed Training" style={{ color: '#047857', fontWeight: 'bold' }}>Confirmed Training</option>
                <option value="Sent Training Details">Sent Training Details</option>
            </select>
        );
    }

    if ((field === 'hiring_source' || subField === 'hiring_source_detailed') && isEditorActive) {
        const sourceOptions = [
            'JOBSTREET',
            'JOB ADS',
            'INSTAGRAM',
            'FACEBOOK',
            'EMPLOYEE REFERRALS',
            'WALK-IN',
            'LINKEDIN',
            'INDEED',
            'COMPANY WEBSITE',
            'CAROUSELL',
            'TIKTOK',
            'OFFLINE ADS'
        ];
        return wrapWithSave(
            <select
                ref={inputRef}
                value={localVal.toUpperCase()}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: e.target.value
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, e.target.value);
                    }
                    handleSaveImmediately(e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white dark:bg-slate-900 !border-none"
            >
                <option value="">--- SELECT SOURCE ---</option>
                {sourceOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (!isEditorActive) {
        const isDate = field.toLowerCase().includes('date') ||
            field.toLowerCase().includes('birth') ||
            subField?.toLowerCase().includes('date') ||
            subField?.toLowerCase().includes('birth') ||
            field === 'master_last_keep_warm';
        let displayVal: React.ReactNode = localVal || '---';

        if ((field === 'final_specific_status' || subField === 'final_specific_status') && localVal === 'OV - Pending') {
            const statusUpper = (rowChanges?.current_status || appValues.current_status || '').toUpperCase();
            if (statusUpper === 'FINAL_INTERVIEW_SCHEDULED' || statusUpper === 'FINAL_INTERVIEW' || statusUpper === 'FINAL INTERVIEW SCHEDULED' || statusUpper === 'FINAL INTERVIEW') {
                const initialResult = String(appValues.pis?.initial_interview_results || '').toUpperCase();
                if (initialResult === 'PASSED') {
                    displayVal = 'Initial Interview - Passed';
                } else if (appValues.typing_test_completed_at) {
                    displayVal = 'Typing Test - Passed';
                } else {
                    displayVal = 'Assessment - Passed';
                }
            }
        }

        const nameFields = ['master_first_name', 'master_last_name', 'master_middle_name', 'applicant_name', 'first_name', 'last_name', 'middle_name'];
        if (nameFields.includes(field) || (subField && nameFields.includes(subField))) {
            if (typeof displayVal === 'string') {
                displayVal = toTitleCase(displayVal);
            }
        }

        if (field === 'remarks' || field === 'master_remarks' || field === 'master_training_confirmation' || field === 'final_interview_notes' || subField === 'final_interview_notes' || subField === 'remarks') {
            const upVal = String(localVal || '').toUpperCase().replace(/_/g, ' ').replace(/;/g, '; ').replace(/\s+/g, ' ').trim();
            if (upVal.includes('CONFIRMED TRAINING')) {
                displayVal = <span className="text-emerald-600 font-black tracking-wider px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-sm">Confirmed Training</span>;
            } else if (upVal.includes('WITHDRAWN')) {
                displayVal = <span className="text-rose-600 font-black tracking-wider px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded-sm">Withdrawn</span>;
            } else if (upVal.includes('PAN') && (upVal.includes('APPROVAL') || upVal.includes('OUT'))) {
                displayVal = <span className="text-sky-700 font-bold tracking-wider px-1.5 py-0.5 bg-sky-50 border border-sky-300 rounded-sm shadow-2xs">PAN Out for Approval</span>;
            } else if (upVal.includes('PAN') && (upVal.includes('SIGNATURE') || upVal.includes('ISSUED'))) {
                displayVal = <span className="text-cyan-800 font-bold tracking-wider px-1.5 py-0.5 bg-cyan-50 border border-cyan-300 rounded-sm shadow-2xs">PAN Issued; For Signature</span>;
            } else if (upVal.includes('PAN COMPLETED') || upVal.includes('PAN APPROVED')) {
                displayVal = <span className="text-teal-800 font-bold tracking-wider px-1.5 py-0.5 bg-teal-50 border border-teal-300 rounded-sm shadow-2xs">PAN Completed</span>;
            } else if (upVal.includes('FOR PAN') || upVal.includes('BI')) {
                displayVal = <span className="text-purple-700 font-bold tracking-wider px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded-sm shadow-2xs">For PAN</span>;
            } else if (upVal.includes('EXTERNAL')) {
                displayVal = <span className="text-slate-600 font-bold tracking-wider px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-sm">External</span>;
            }
        }
        let isAnomalous = false;

        if (field === 'department' || (field === 'pis' && subField === 'final_account')) {
            let rawVal = currentValue || '';
            if (field === 'department') {
                rawVal = rawVal
                    .replace(/Auto Approve BDR/gi, 'Auto Approve')
                    .replace(/Auto Approve DIA/gi, 'Auto Approve')
                    .replace(/AUTO APPROVE BDR/gi, 'Auto Approve')
                    .replace(/AUTO APPROVE DIA/gi, 'Auto Approve');
            }
            // Resolve effective status including any pending local edits
            const effectiveStatus = rowChanges?.current_status || appValues.current_status || '';
            const statusUpper = effectiveStatus.toUpperCase();
            const isFailed = statusUpper === 'REJECTED' || statusUpper === 'FAILED';

            if (rawVal) {
                const failedAccounts = (appValues as any).metadata?.failed_accounts || [];
                const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);

                if (isFailed) {
                    displayVal = (
                        <span className="flex flex-wrap gap-1">
                            {accounts.map((acc: string, idx: number) => {
                                const isAccFailed = failedSet.has(acc.toLowerCase());
                                const isAutoApprove = acc.toLowerCase().includes('auto approve');
                                const isRestricted = restrictedAccounts.has(acc.toLowerCase());
                                const statusClass = isAutoApprove
                                    ? "text-emerald-600 font-semibold"
                                    : isAccFailed
                                        ? "line-through text-rose-600 font-normal"
                                        : isRestricted
                                            ? "text-red-500 font-semibold"
                                            : "text-emerald-600 font-semibold";
                                return (
                                    <span key={idx} className={statusClass}>
                                        {acc}{idx < accounts.length - 1 ? ',' : ''}
                                    </span>
                                );
                            })}
                        </span>
                    );
                } else {
                    const remaining = accounts.filter((acc: string) => !failedSet.has(acc.toLowerCase()));
                    const isHiredOrJO = statusUpper === 'HIRED' ||
                        statusUpper.includes('JOB_OFFER') ||
                        statusUpper.includes('JOB OFFER') ||
                        statusUpper.includes('ACCEPTED') ||
                        statusUpper === 'PASSED';
                    let activeDisplayed = remaining;
                    if (isHiredOrJO && remaining.length > 1) {
                        activeDisplayed = [remaining[0]];
                    }
                    const displayedAccounts = accounts.filter((acc: string) => {
                        const isAccFailed = failedSet.has(acc.toLowerCase());
                        if (isAccFailed) return true;
                        return activeDisplayed.includes(acc);
                    });
                    displayVal = (
                        <span className="flex flex-wrap gap-1">
                            {displayedAccounts.map((acc: string, idx: number) => {
                                const isAccFailed = failedSet.has(acc.toLowerCase());
                                const isAutoApprove = acc.toLowerCase().includes('auto approve');
                                const isRestricted = restrictedAccounts.has(acc.toLowerCase());
                                const statusClass = isAutoApprove
                                    ? "text-emerald-600 font-semibold"
                                    : isAccFailed
                                        ? "line-through text-rose-600 font-normal"
                                        : isRestricted
                                            ? "text-red-500 font-semibold"
                                            : "text-emerald-600 font-semibold";
                                return (
                                    <span key={idx} className={statusClass}>
                                        {acc}{idx < displayedAccounts.length - 1 ? ',' : ''}
                                    </span>
                                );
                            })}
                        </span>
                    );
                }
            }
        }

        if (field === 'current_status' || field === 'master_status') {
            const schedStatus = appValues.recruiter_s_scheduling_status || appValues.metadata?.recruiter_s_scheduling_status;
            const finalStatus = localVal || currentValue || appValues.current_status;

            displayVal = <StatusBadge status={finalStatus as any} schedulingStatus={schedStatus} applicant={appValues} />;
        } else if (isDate && localVal && localVal !== '---') {
            const date = new Date(localVal);
            if (!isNaN(date.getTime())) {
                displayVal = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
                if (date.getFullYear() === 2001 || (date.getFullYear() < 1960 && field.includes('date'))) {
                    isAnomalous = true;
                }
            }
        }

        const hasHistory = !!((appValues.pis?.reprofile_history && appValues.pis.reprofile_history.length > 0) || (appValues.metadata?.reprofile_history && appValues.metadata.reprofile_history.length > 0));
        const isOpsValCol = field?.toLowerCase().includes('ops_val') || field?.toLowerCase().includes('ops_validator') || subField?.toLowerCase().includes('ops_val') || subField?.toLowerCase().includes('ops_validator');

        const cellOptions = getCellOptions(field, subField, options);

        if (typeof displayVal === 'string' && displayVal.includes('Php')) {
            displayVal = displayVal.replace(/Php/g, 'PHP');
        }

        let finalDisplayVal = displayVal;
        if (typeof displayVal === 'string') {
            const colors = getCustomColor(displayVal, optionColors);
            if (colors) {
                finalDisplayVal = (
                    <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase shadow-xs inline-block"
                        style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border
                        }}
                    >
                        {displayVal}
                    </span>
                );
            } else if (cellOptions && displayVal !== '---') {
                const isOption = cellOptions.some(opt => typeof opt === 'string' && opt.toLowerCase() === displayVal.toLowerCase());
                if (isOption) {
                    finalDisplayVal = (
                        <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase inline-block border border-transparent shadow-xs", getOptionColorClass(displayVal))}>
                            {displayVal}
                        </span>
                    );
                }
            }
        }

        return (
            <>
                <div
                    ref={cellRef}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();

                        // 1-click edit feature
                        if (setIsEditing) {
                            setIsEditing(true);
                        }
                        if (onPaint) {
                            onPaint();
                        }

                        // Special case for dropdowns that render a portal outside of edit mode
                        // We still let them open their dropdown if applicable
                        if (cellOptions) {
                            const isGovId = ['sss_no', 'philhealth_no', 'pag_ibig_no', 'pagibig_no', 'tin_no'].includes((subField || field) as string);
                            if (!isGovId) {
                                const cellEl = (e.target as HTMLElement).closest('td') || (e.target as HTMLElement).parentElement;
                                if (cellEl) {
                                    const rect = cellEl.getBoundingClientRect();
                                    setDropdownCoords({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX,
                                        width: rect.width
                                    });
                                }
                                setIsDropdownOpen(!isDropdownOpen);
                            }
                        }
                    }}
                    className={cn(
                        "w-full h-full min-h-[44px] flex items-center pl-4 pr-8 font-sans rounded-none transition-all duration-300 ease-out relative group",
                        (!isActive ? "cursor-cell hover:bg-primary-50/30 hover:scale-110 hover:shadow-xl hover:z-[100] hover:shadow-md" : "cursor-text"),
                        !isExpanded ? "truncate" : "whitespace-normal py-2 break-words bg-primary-50/20 shadow-[inset_3px_0_0_#0078d4]",
                        isAnomalous && "text-[#d13438] font-bold",
                        className
                    )}
                    style={(() => {
                        const dupWarning = getGovIdDuplicateWarning(appValues, (subField || field) as string, displayVal);
                        const hc = appValues.metadata?.cell_highlights?.[colKey];
                        if (!hc) return undefined;
                        return {
                            backgroundColor: hc,
                            boxShadow: `inset 3px 0 0 ${HIGHLIGHT_BORDER_MAP[hc] || '#94a3b8'}`,
                        } as React.CSSProperties;
                    })()}
                    title={(() => {
                        const dupWarning = getGovIdDuplicateWarning(appValues, (subField || field) as string, displayVal);
                        if (dupWarning) return dupWarning.message;
                        if (isAnomalous) return "Warning: Potential Year Anomaly (2001 detected)";
                        return !isExpanded ? "Click to view full details" : "Click to collapse";
                    })()}
                >
                    {(() => {
                        const dupWarning = getGovIdDuplicateWarning(appValues, (subField || field) as string, displayVal);

                        // Check for global duplicates if it's a Gov ID column
                        const isGovIdCol = ['sss_no', 'philhealth_no', 'pag_ibig_no', 'pagibig_no', 'tin_no', 'sss', 'philhealth', 'pagibig', 'tin'].some(k => String(subField || field).toLowerCase().includes(k));
                        const cleanVal = String(displayVal).trim().toUpperCase().replace(/[^0-9]/g, '');
                        let isGlobalDuplicate = false;
                        let isGlobalUnique = false;
                        let duplicateNames: string[] = [];

                        if (isGovIdCol && cleanVal && cleanVal.length >= 5 && duplicateGovIdsMap && !isPlaceholderOrTextGovId(displayVal)) {
                            const names = duplicateGovIdsMap[cleanVal] || [];
                            const myName = String(appValues.applicant_name || '').toLowerCase();
                            // Filter out my own name to see if others share this ID
                            const otherNames = names.filter(n => String(n).toLowerCase() !== myName);

                            if (otherNames.length > 0) {
                                isGlobalDuplicate = true;
                                duplicateNames = Array.from(new Set(otherNames));
                            } else {
                                isGlobalUnique = true;
                            }
                        }

                        return (
                            <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0 w-full relative">
                                <span className={cn("min-w-0", !isExpanded ? "truncate" : "whitespace-normal break-words", (dupWarning || isGlobalDuplicate) && "text-amber-900 font-bold")}>
                                    {finalDisplayVal}
                                </span>
                                {saveStatus === 'saved' && (
                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-200 z-10 animate-bounce">
                                        <CheckCircle2 size={14} className="stroke-[3]" />
                                    </span>
                                )}
                                {dupWarning && !isGlobalDuplicate && (
                                    <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 rounded-xs shadow-2xs shrink-0 ml-auto cursor-help"
                                        title={dupWarning.message}
                                    >
                                        <AlertTriangle size={11} className="text-amber-600 animate-bounce shrink-0" />
                                        Duplicate
                                    </span>
                                )}
                                {isGlobalDuplicate && (
                                    <span
                                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 border border-red-300 text-red-600 shrink-0 ml-auto cursor-help shadow-sm"
                                        title={`⚠️ Duplicate ID! Same as: ${duplicateNames.join(', ')}`}
                                    >
                                        <span className="font-bold text-[10px]">!</span>
                                    </span>
                                )}
                                {isGlobalUnique && (
                                    <span
                                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 shrink-0 ml-auto cursor-help shadow-sm"
                                        title="Unique ID - No duplicates found"
                                    >
                                        <CheckCircle2 size={12} className="stroke-[3]" />
                                    </span>
                                )}
                                {isOpsValCol && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-sm animate-pulse shrink-0 ml-auto">
                                        <span className="w-1 h-1 rounded-full bg-yellow-500 animate-ping shrink-0" />
                                        Current
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!cellRef.current) return;
                            const rect = cellRef.current.getBoundingClientRect();
                            const placeDown = rect.top < 150;
                            setNotePos({
                                left: rect.left + rect.width / 2 - 24,
                                top: placeDown ? rect.bottom + 8 : rect.top - 8,
                                placement: placeDown ? 'down' : 'up'
                            });
                            setIsNoteOpen(true);
                        }}
                        className={cn(
                            "absolute right-1 top-0.5 p-0.5 rounded transition-opacity flex items-center justify-center z-10",
                            appValues.metadata?.cell_notes?.[colKey] ? "opacity-100 text-blue-500 hover:text-blue-600 hover:bg-blue-50" : "opacity-0 group-hover:opacity-60 text-slate-400 hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50"
                        )}
                        title={appValues.metadata?.cell_notes?.[colKey] ? "View/Edit Note" : "Add Note"}
                    >
                        <MessageSquare className={cn("w-3 h-3", appValues.metadata?.cell_notes?.[colKey] && "fill-current")} />
                    </button>

                    {isNoteOpen && (
                        <CellNotePopover
                            isOpen={isNoteOpen}
                            onClose={() => setIsNoteOpen(false)}
                            position={notePos}
                            initialNote={appValues.metadata?.cell_notes?.[colKey] || ''}
                            onSave={(note) => {
                                handleSaveMetadata('note', note);
                            }}
                        />
                    )}

                    {onShowHistory && hasHistory && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
                            className="absolute right-8 top-1.5 p-1 text-purple-600 hover:text-purple-700 bg-white/95 dark:bg-slate-900/95 shadow-sm border border-purple-100 rounded-none opacity-40 hover:opacity-100 z-20 flex items-center justify-center transition-all hover:bg-purple-50"
                            title="View Reprofile History"
                        >
                            <History size={12} />
                        </button>
                    )}
                    {cellOptions && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const cellEl = e.currentTarget.closest('td') || e.currentTarget.parentElement;
                                if (cellEl) {
                                    const rect = cellEl.getBoundingClientRect();
                                    setDropdownCoords({
                                        top: rect.bottom + window.scrollY,
                                        left: rect.left + window.scrollX,
                                        width: rect.width
                                    });
                                }
                                setIsDropdownOpen(!isDropdownOpen);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-[#0078d4] hover:border-[#0078d4] bg-white dark:bg-slate-900 border border-surface-200 rounded-none opacity-0 group-hover:opacity-100 z-30 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                            title="Quick edit option"
                        >
                            <ChevronDown size={11} />
                        </button>
                    )}
                    {!cellOptions && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onPaint) onPaint();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-[#0078d4] hover:border-[#0078d4] bg-white dark:bg-slate-900 border border-surface-200 rounded-none opacity-0 group-hover:opacity-100 z-30 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                            title="Edit cell"
                        >
                            <Edit2 size={11} />
                        </button>
                    )}
                    {isDropdownOpen && cellOptions && dropdownCoords && createPortal(
                        <>
                            <div
                                className="fixed inset-0 z-[2147483000] cursor-default"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(false);
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: dropdownCoords.top + 2,
                                    left: dropdownCoords.left,
                                    minWidth: Math.max(dropdownCoords.width, 140),
                                    width: dropdownCoords.width,
                                    zIndex: 2147483001
                                }}
                                className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium py-1 max-h-60 overflow-y-auto rounded-none"
                            >
                                {(() => {
                                    let finalOpts = cellOptions;
                                    if (isRemarksCol) {
                                        finalOpts = finalOpts.map(opt => typeof opt === 'string' ? opt.replace(/\s*\(Force Pass\)/gi, '').replace(/\s*\(Force Fail\)/gi, '') : opt);
                                        // Remove duplicates that might arise from stripping
                                        finalOpts = Array.from(new Set(finalOpts));
                                    }

                                    return ['---', ...finalOpts].map((opt, idx) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setIsDropdownOpen(false);
                                                const finalVal = opt === '---' ? '' : opt;

                                                // Optimistically update the UI immediately
                                                if (subField) {
                                                    const currentChanges = (rowChanges || {}) as any;
                                                    const nested = {
                                                        ...(currentChanges[field] || (appValues as any)[field] || {}),
                                                        [subField]: finalVal
                                                    };
                                                    parentOnEdit(appId, field as keyof Application, nested);
                                                } else {
                                                    parentOnEdit(appId, field as keyof Application, finalVal);
                                                }

                                                await handleSaveImmediately(finalVal);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-colors uppercase whitespace-nowrap block cursor-pointer border-b border-white/40 last:border-none",
                                                getOptionColorClass(String(opt))
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ));
                                })()}
                                <div className="border-t border-surface-200 my-1" />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen(false);
                                        setIsCustomEditing(true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap block cursor-pointer"
                                >
                                    Custom Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen(false);
                                        setContextMenuCoords({
                                            top: dropdownCoords.top,
                                            left: dropdownCoords.left,
                                            bottom: dropdownCoords.top,
                                            right: dropdownCoords.left + dropdownCoords.width,
                                            width: dropdownCoords.width
                                        });
                                        setShowContextMenu(true);
                                        setLocalNote(appValues.metadata?.cell_notes?.[colKey] || '');
                                        setNoteMenuOpen(true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap block cursor-pointer"
                                >
                                    Add/Edit Note
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen(false);
                                        setContextMenuCoords({
                                            top: dropdownCoords.top,
                                            left: dropdownCoords.left,
                                            bottom: dropdownCoords.top,
                                            right: dropdownCoords.left + dropdownCoords.width,
                                            width: dropdownCoords.width
                                        });
                                        setShowContextMenu(true);
                                        setHighlightMenuOpen(true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] transition-colors uppercase whitespace-nowrap flex items-center justify-between cursor-pointer"
                                >
                                    Highlight Cell
                                    <div className="flex gap-1 ml-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-100 border border-rose-300"></div>
                                        <div className="w-2 h-2 rounded-full bg-blue-100 border border-blue-300"></div>
                                    </div>
                                </button>
                                {appValues.metadata?.cell_notes?.[colKey] && (
                                    <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 mt-1">
                                        <div className="text-[9px] font-black text-amber-700 uppercase tracking-wider mb-1">View Notes</div>
                                        <div className="text-[10px] text-amber-900 font-medium whitespace-pre-wrap leading-tight">
                                            {appValues.metadata.cell_notes[colKey]}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>,
                        document.body
                    )}

                    {/* Cell Note Icon Indicator */}
                    {appValues.metadata?.cell_notes?.[colKey] && (
                        <div
                            className="absolute right-1 top-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10"
                            title={`Note: ${appValues.metadata.cell_notes[colKey]}`}
                        />
                    )}

                    {/* Context Menu / Note / Highlight Popover */}
                    {showContextMenu && contextMenuCoords && createPortal(
                        <>
                            <div
                                className="fixed inset-0 z-[2147483000]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowContextMenu(false);
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: contextMenuCoords.bottom + 4,
                                    left: contextMenuCoords.left,
                                    minWidth: 160,
                                    zIndex: 2147483001
                                }}
                                className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium rounded-sm flex flex-col"
                                onClick={e => e.stopPropagation()}
                            >
                                {!noteMenuOpen && !highlightMenuOpen && (
                                    <>
                                        <button
                                            type="button"
                                            className="text-left px-3 py-2 text-[11px] font-semibold hover:bg-amber-50 text-[#323130] dark:text-slate-300 hover:text-amber-700 transition-colors w-full border-b border-surface-200"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setLocalNote(appValues.metadata?.cell_notes?.[colKey] || '');
                                                setNoteMenuOpen(true);
                                            }}
                                        >
                                            Add/Edit Note
                                        </button>
                                        <button
                                            type="button"
                                            className="text-left px-3 py-2 text-[11px] font-semibold hover:bg-rose-50 text-[#323130] dark:text-slate-300 hover:text-rose-700 transition-colors w-full flex items-center justify-between"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setHighlightMenuOpen(true);
                                            }}
                                        >
                                            Highlight Cell
                                            <div className="flex gap-1">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-100 border border-rose-300"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-300"></div>
                                            </div>
                                        </button>
                                    </>
                                )}
                                {noteMenuOpen && (
                                    <div className="p-2 flex flex-col gap-2 min-w-[200px]">
                                        <div className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Cell Note</div>
                                        <textarea
                                            ref={inputRef}
                                            value={localNote}
                                            onChange={e => setLocalNote(e.target.value)}
                                            className="w-full min-h-[60px] text-[11px] p-2 border border-surface-200 rounded-none resize-none focus:outline-none focus:border-primary-500"
                                            placeholder="Type your note here..."
                                        />
                                        <div className="flex justify-end gap-1">
                                            <button
                                                type="button"
                                                className="px-2 py-1 text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 hover:bg-[#f3f2f1]"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setNoteMenuOpen(false);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="px-2 py-1 text-[10px] font-semibold bg-primary-600 text-white hover:bg-primary-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleSaveMetadata('note', localNote);
                                                    setShowContextMenu(false);
                                                }}
                                            >
                                                Save Note
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {highlightMenuOpen && (
                                    <div className="p-3 flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Highlight Color</div>
                                        <div className="flex flex-col gap-1">
                                            {[
                                                { color: '#fef9c3', border: '#eab308', label: 'Yellow', desc: 'For Review' },
                                                { color: '#dcfce7', border: '#22c55e', label: 'Green', desc: 'Confirmed' },
                                                { color: '#fecdd3', border: '#f43f5e', label: 'Rose', desc: 'Flagged' },
                                                { color: '#dbeafe', border: '#3b82f6', label: 'Blue', desc: 'In Progress' },
                                                { color: '#ede9fe', border: '#8b5cf6', label: 'Purple', desc: 'Special' },
                                            ].map(h => (
                                                <button
                                                    key={h.label}
                                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-[#f3f2f1] transition-colors w-full text-left cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleSaveMetadata('highlight', h.color);
                                                        setShowContextMenu(false);
                                                    }}
                                                >
                                                    <div className="w-5 h-5 rounded-sm border-2 shrink-0" style={{ backgroundColor: h.color, borderColor: h.border }} />
                                                    <div>
                                                        <p className="text-[10px] font-semibold text-[#323130] dark:text-slate-300 leading-tight">{h.label}</p>
                                                        <p className="text-[9px] text-[#a19f9d] leading-tight">{h.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="border-t border-surface-200 pt-1.5 mt-0.5">
                                            <button
                                                className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-[#a19f9d] hover:text-[#d13438] hover:bg-rose-50 transition-colors rounded-sm cursor-pointer uppercase"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleSaveMetadata('highlight', '');
                                                    setShowContextMenu(false);
                                                }}
                                            >
                                                Clear Highlight
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>,
                        document.body
                    )}
                </div>
                {govIdModalNode}
            </>
        );
    }

    return wrapWithSave(
        <textarea
            ref={inputRef}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommit();
                    if (setIsEditing) setIsEditing(false);
                    (e.target as HTMLTextAreaElement).blur();
                }
            }}
            className="w-full h-full p-4 text-[11px] font-medium text-surface-900 !border-none outline-none resize-none rounded-none min-h-[44px]"
            placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
            rows={1}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
            }}
            onFocus={(e) => {
                // Auto-adjust height on focus
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
                // Move cursor to end
                const val = e.target.value;
                e.target.value = '';
                e.target.value = val;
                e.target.value = val;
            }}
        />
    );
});

