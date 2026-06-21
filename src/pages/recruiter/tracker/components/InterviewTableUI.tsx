import React, { useState } from 'react';
import { Maximize2, Trash, MessageSquare, History, AlertCircle } from 'lucide-react';
import { SPECIFIC_STATUS_OPTIONS } from '../utils/statusMappings';
import { cn, STATUS_LABELS } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import * as helpers from '../utils/tableHelpers';
import { splitReprofileAccounts } from '@/utils/reprofileQueue';

interface CandidateIdentityCellProps {
    app: Application;
    isSelectMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onFocus: () => void;
    onDelete: () => void;
    onShowNotes: (app: Application, rect: DOMRect) => void;
    onShowHistory?: () => void;
    onViewProfile?: (app: Application) => void;
    presence?: {
        hovers: string[];
        edits: string[];
    };
    onHover?: () => void;
    onLeave?: () => void;
    className?: string;
}

export const CandidateIdentityCell = React.memo(({ 
    app, isSelectMode, isSelected, onToggleSelect, onFocus, onDelete, onShowNotes, onShowHistory, onViewProfile, presence, onHover, onLeave, className 
}: CandidateIdentityCellProps) => {
    const noteCount = React.useMemo(() => {
        if (!app.notes) return 0;
        try {
            const parsed = JSON.parse(app.notes);
            return Array.isArray(parsed) ? parsed.length : 1;
        } catch (e) {
            return 1;
        }
    }, [app.notes]);

    return (
        <td className={cn(
            "sticky left-0 z-20 bg-white group-hover:bg-[#f8f9fa] border-r border-[#edebe9] px-4 shadow-[2px_0_4px_rgba(0,0,0,0.04)] text-left overflow-hidden cursor-pointer",
            !!presence?.hovers?.length && "ring-2 ring-inset ring-brand-red/30 bg-brand-red/5",
            className
        )}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onDoubleClick={() => onViewProfile?.(app)}
        >
        <div className="flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-none bg-[#edebe9] flex items-center justify-center text-[11px] font-bold text-[#323130] uppercase shadow-inner text-left relative shrink-0">
                        {app.applicant_name.charAt(0)}
                        {noteCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#d13438] text-white text-[7px] rounded-none flex items-center justify-center border border-white shadow-sm font-black">
                                {noteCount}
                            </div>
                        )}
                    </div>
                
                {/* Presence Indicator for Hover */}
                {presence?.hovers?.length ? (
                    <div className="absolute top-2 right-2 flex -space-x-2">
                        {presence.hovers.slice(0, 3).map((name, i) => (
                            <div key={i} className="w-4 h-4 rounded-none bg-brand-red border-2 border-white flex items-center justify-center text-[6px] text-white font-bold shadow-sm" title={`${name} is viewing`}>
                                {(name || '?').charAt(0)}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="min-w-0 flex-1 group/name text-left">
                    <div className="flex items-center gap-1.5 mr-2 text-left">
                        <p className="text-[11px] font-bold text-surface-900 truncate leading-none uppercase tracking-tight text-left">{app.applicant_name}</p>
                        <MedicalIndicator application={app} size="xs" />
                        <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100">
                            <button
                                onClick={onFocus}
                                className="p-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-none shadow-sm border border-primary-100 text-left"
                                title="Open Fullscreen Editor"
                            >
                                <Maximize2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onShowNotes(app, e.currentTarget.getBoundingClientRect()); }}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-none shadow-sm border border-emerald-100 text-left"
                                title="View Strategic Notes"
                            >
                                <MessageSquare size={14} />
                            </button>
                            {!!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0)) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShowHistory?.(); }}
                                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-none shadow-sm border border-purple-100 text-left"
                                    title="View Reprofile History"
                                >
                                    <History size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-left">
                        <p className="text-[9px] font-bold text-[#a19f9d] uppercase tracking-wider truncate text-left">{app.id.split('-')[0]}</p>
                    </div>
                </div>
            </div>
        </td>
    );
});

interface EditableCellProps {
    value: string;
    isEditing: boolean;
    isActive: boolean;
    onPaint: (e: React.MouseEvent) => void;
    onStartEdit?: () => void;
    onChange: (val: string) => void;
    colKey: string;
    id?: string;
    placeholder?: string;
    isStatus?: boolean;
    isAccount?: boolean;
    accounts?: string[];
    onShowHistory?: () => void;
    onShowProcedure?: () => void;
    width?: number;
    presence?: {
        hovers: string[];
        edits: string[];
    };
    onHover?: () => void;
    onLeave?: () => void;
    onClose?: () => void;
    className?: string;
    style?: React.CSSProperties;
    options?: string[];
    setIsEditing?: (val: boolean) => void;
}

export const EditableCell = React.memo(({ 
    value, isEditing, isActive, onPaint, onStartEdit, onChange, colKey, id,
    placeholder, isStatus, isAccount, accounts, onShowHistory, onShowProcedure, width, presence, onHover, onLeave, className,
    onClose, style, options, setIsEditing
}: EditableCellProps) => {
    // Defensive coercion: ensure value is always a string, never an object/array.
    // This prevents React crashes when cell helpers return raw pis objects (e.g. {language, proficiency}).
    const safeVal = React.useMemo(() => {
        if (value === null || value === undefined) return '';
        let strVal = '';
        if (typeof value === 'string') strVal = value;
        else if (typeof value === 'number' || typeof value === 'boolean') strVal = String(value);
        else if (Array.isArray(value)) strVal = (value as any[]).map((v: any) => (typeof v === 'object' && v !== null ? (v.language ?? JSON.stringify(v)) : String(v))).join(', ');
        else if (typeof value === 'object') {
            const obj = value as any;
            if ('language' in obj) strVal = [obj.language, obj.proficiency].filter(Boolean).join(' · ');
            else strVal = JSON.stringify(value);
        } else {
            strVal = String(value);
        }

        if (colKey === 'pis_initial_account_assignment' || colKey === 'initial_account_assignment') {
            return splitReprofileAccounts(strVal).join(' | ');
        }
        return strVal;
    }, [value, colKey]);

    const [localVal, setLocalVal] = React.useState(safeVal);
    const [isExpanded, setIsExpanded] = useState(false);
    // Once the user has explicitly picked a value in this cell, never let the
    // useEffect overwrite it with stale server data.  The server may return
    // the OLD value (before the user's change was saved) via loadData() /
    // socket polling, and syncing that stale value would revert the user's
    // selection.
    const hasUserSelectedRef = React.useRef(false);

    // When the cell becomes active again (re-opened), reset the flag so the
    // useEffect syncs from the fresh value prop (which now reflects saved
    // server state or pending localChanges).
    React.useEffect(() => {
        if (isActive) {
            hasUserSelectedRef.current = false;
        }
    }, [isActive]);

    React.useEffect(() => {
        if (!isEditing) {
            hasUserSelectedRef.current = false;
            setLocalVal(safeVal);
        }
    }, [isEditing, safeVal]);

    React.useEffect(() => {
        // On initial mount or if the cell was re-created, sync from safeVal.
        // Once the user has made a selection, stop syncing so stale server
        // data from loadData() polling can't revert their choice.
        if (!hasUserSelectedRef.current) {
            setLocalVal(safeVal);
        }
    }, [safeVal]);

    const handleCommit = () => {
        if (localVal !== value) {
            onChange(localVal);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !isStatus) {
            e.preventDefault();
            handleCommit();
            (e.target as HTMLElement).blur();
        }
        if (e.key === 'Escape') {
            setLocalVal(value);
            (e.target as HTMLElement).blur();
        }
    };

    if (!isEditing || !isActive) {
        const isOpsValCol = colKey?.toLowerCase().includes('ops_val') || colKey?.toLowerCase().includes('ops_validator');
        return (
            <td
                id={id}
                className={cn(
                    "border-r border-[#edebe9] p-0 align-top text-left relative overflow-hidden",
                    isEditing && "hover:bg-[#f0f7ff] cursor-cell group/paint",
                    !isEditing && "cursor-pointer",
                    !!presence?.hovers?.length && "bg-amber-50/30",
                    !!presence?.edits?.length && "ring-2 ring-inset ring-amber-400/50 bg-amber-50",
                    className
                )}
                style={{ width, minWidth: width, maxWidth: width, ...style }}
                onClick={isEditing ? (e) => { 
                    e.stopPropagation(); 
                    if (onStartEdit) {
                        onStartEdit();
                    } else {
                        onPaint(e); 
                    }
                } : () => setIsExpanded(!isExpanded)}
                onContextMenu={isEditing ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPaint(e);
                } : undefined}
                onDoubleClick={(e) => {
                    if (!isEditing && setIsEditing) {
                        e.stopPropagation();
                        setIsEditing(true);
                        if (onStartEdit) {
                            onStartEdit();
                        }
                    }
                }}
                title={!isEditing ? (isExpanded ? "Click to collapse" : "Click to view full details") : undefined}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
            >
                <div className={cn(
                    "pl-4 pr-8 py-2 h-full text-left relative transition-all duration-200",
                    !isExpanded ? "max-h-[52px]" : "max-h-none bg-primary-50/10 shadow-[inset_3px_0_0_#0078d4]",
                    !isEditing && "hover:bg-surface-50"
                )}>
                    {isEditing && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover/paint:opacity-100">
                            <div className="w-1.5 h-1.5 rounded-none bg-[#0078d4]" />
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className={cn(
                            "text-[12px] leading-none text-left truncate flex-1 flex items-center gap-1.5",
                            !isExpanded ? "truncate" : "whitespace-normal"
                        )}>
                            {localVal ? (
                                isStatus ? (
                                    <span className={cn(
                                        "badge font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border shadow-sm text-[10px]",
                                        localVal.toUpperCase().includes('HIRE') || localVal.toUpperCase().includes('ACCEPTED OFFER') ? "bg-[#107c10] text-white border-[#107c10]" :
                                        localVal.toUpperCase().includes('PASS') || localVal.toUpperCase().includes('PROMOTION') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        localVal.toUpperCase().includes('FAIL') || localVal.toUpperCase().includes('REJECT') || localVal.toUpperCase().includes('NOT ELIGIBLE') || localVal.toUpperCase() === 'CLOSED' ? "bg-red-50 text-red-700 border-red-200" :
                                        localVal.toUpperCase().includes('WITHDRAW') || localVal.toUpperCase().includes('DECLINE') ? "bg-amber-50 text-amber-700 border-amber-200" :
                                        localVal.toUpperCase().includes('PENDING') || localVal.toUpperCase().includes('SCHEDULE') || localVal.toUpperCase().includes('FOR') || localVal.toUpperCase() === 'OPEN' ? "bg-primary-50 text-primary-700 border-primary-200" :
                                        "bg-surface-50 text-surface-600 border-surface-200"
                                    )}>
                                        {localVal}
                                    </span>
                                ) : (colKey?.toLowerCase().includes('date') || colKey?.toLowerCase().includes('birth')) && !isNaN(Date.parse(localVal)) ? (
                                    <span className="text-surface-700 font-medium text-xs">
                                        {new Date(localVal).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                ) : (
                                    <span className="text-surface-700 font-medium text-xs">{localVal}</span>
                                )
                            ) : (
                                <span className="text-[#a19f9d]">—</span>
                            )}
                            {isOpsValCol && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-sm animate-pulse shrink-0">
                                    <span className="w-1 h-1 rounded-full bg-yellow-500 animate-ping shrink-0" />
                                    Current
                                </span>
                            )}
                        </div>

                        {onShowProcedure && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onShowProcedure();
                                }}
                                className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-100 bg-amber-50/80 border border-amber-200/50 rounded-sm transition-all shrink-0 inline-flex items-center justify-center animate-pulse shadow-sm"
                                title="Click to view candidate progress/procedure"
                            >
                                <AlertCircle size={14} className="stroke-[2.5]" />
                            </button>
                        )}
                    </div>

                    {onShowHistory && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
                            className="absolute right-2 top-1.5 p-1 text-purple-600 hover:text-purple-700 bg-white/95 shadow-sm border border-purple-100 rounded-none opacity-40 hover:opacity-100 z-20 flex items-center justify-center transition-all hover:bg-purple-50"
                            title="View Reprofile History"
                        >
                            <History size={12} />
                        </button>
                    )}

                    {/* Collaborative Cursors */}
                    {presence?.hovers?.length ? (
                        <div className="absolute top-1 right-1 flex -space-x-1.5">
                            {presence.hovers.map((name, i) => (
                                <div key={i} className="w-4 h-4 rounded-none bg-amber-500 border border-white flex items-center justify-center text-[8px] text-white font-bold shadow-sm" title={`${name} is looking`}>
                                    {(name || '?').charAt(0)}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {presence?.edits?.length ? (
                        <div className="absolute bottom-1 right-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-none shadow-sm animate-pulse uppercase tracking-widest">
                            {presence.edits[0]} EDITING
                        </div>
                    ) : null}
                </div>
            </td>
        );
    }

    return (
        <td 
            id={id}
            style={{ width, ...style }}
            className={cn("border-r border-[#edebe9] p-0 overflow-visible text-left ring-2 ring-inset ring-[#0078d4] bg-white z-50", className)}
        >
            {options && options.length > 0 ? (
                <select
                    autoFocus
                    value={localVal}
                    onBlur={handleCommit}
                    onChange={(e) => {
                        const newVal = e.target.value;
                        hasUserSelectedRef.current = true;
                        setLocalVal(newVal);
                        onChange(newVal);
                    }}
                    className="w-full h-full block p-3 text-[12px] font-bold text-surface-900 bg-white outline-none appearance-none cursor-pointer text-left border-none min-h-[50px]"
                >
                    <option value="">---</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : isStatus ? (
                <select
                    autoFocus
                    value={localVal}
                    onChange={(e) => {
                        const newVal = e.target.value;
                        hasUserSelectedRef.current = true;
                        setLocalVal(newVal);
                        onChange(newVal);
                    }}
                    className="w-full h-full block p-3 text-[12px] font-bold text-surface-900 bg-white outline-none appearance-none cursor-pointer text-left border-none min-h-[50px]"
                >
                    {(
                        (colKey === 'pis_overall_status' || colKey === 'overall_status') ? ['OPEN', 'CLOSED', 'HIRED'] : 
                        (colKey === 'current_status' || colKey === 'master_status') ? (() => {
                            const uniqueOptionsMap = new Map<string, string>();
                            for (const [key, label] of Object.entries(STATUS_LABELS)) {
                                const existingKey = uniqueOptionsMap.get(label);
                                if (!existingKey) {
                                    uniqueOptionsMap.set(label, key);
                                } else {
                                    const isNewDbStandard = key.includes('_') && key === key.toUpperCase();
                                    const isExistingDbStandard = existingKey.includes('_') && existingKey === existingKey.toUpperCase();
                                    if (isNewDbStandard && !isExistingDbStandard) {
                                        uniqueOptionsMap.set(label, key);
                                    } else if (key.toUpperCase() === key && existingKey.toUpperCase() !== existingKey) {
                                        uniqueOptionsMap.set(label, key);
                                    }
                                }
                            }
                            return Array.from(uniqueOptionsMap.values());
                        })() :
                        (colKey === 'pis_final_specific_status' || colKey === 'final_specific_status') ? SPECIFIC_STATUS_OPTIONS :
                        [
                            'Hired',
                            'For Job Offer',
                            'Withdrawn',
                            'For PAN',
                            'Applicant Form',
                            'Lateral Transfer',
                            'Sent JO and BGC',
                            'Assessment'
                        ]
                    ).map(status => (
                        <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
                    ))}
                </select>
            ) : isAccount ? (
                <div className="relative w-full h-full min-h-[48px]">
                    <div 
                        className="absolute left-0 top-0 w-full min-w-[280px] max-h-[500px] flex flex-col bg-white overflow-y-auto custom-scrollbar shadow-2xl border border-surface-200 z-[100] outline-none rounded-none"
                        tabIndex={-1}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                handleCommit();
                            }
                        }}
                        ref={(el) => {
                            if (el) el.focus();
                        }}
                    >
                        <div className="flex items-center justify-between p-3 mb-1 sticky top-0 bg-white z-10 border-b border-surface-100 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.05)]">
                            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Select Accounts</span>
                            <div className="flex items-center gap-2">
                                {onShowHistory && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
                                        className="p-1 text-primary-500 hover:text-primary-700 bg-primary-50 rounded-none"
                                        title="View Reprofile History"
                                    >
                                        <History size={12} />
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleCommit(); 
                                        if (onClose) onClose();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-0.5 p-2 pt-1">
                            {accounts?.map(acc => {
                                const isSelected = splitReprofileAccounts(localVal)
                                    .map(s => s.toLowerCase())
                                    .includes(acc.toLowerCase());
                                return (
                                    <label key={acc} className="flex items-start gap-2.5 px-3 py-2 hover:bg-surface-50 cursor-pointer group rounded-none">
                                        <input 
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                const parts = splitReprofileAccounts(localVal);
                                                let newParts;
                                                if (e.target.checked) {
                                                    // Avoid duplicates case-insensitively
                                                    if (!parts.some(p => p.toLowerCase() === acc.toLowerCase())) {
                                                        newParts = [...parts, acc];
                                                    } else {
                                                        newParts = parts;
                                                    }
                                                } else {
                                                    newParts = parts.filter(p => p.toLowerCase() !== acc.toLowerCase());
                                                }
                                                const newVal = newParts.join(' | ');
                                                setLocalVal(newVal);
                                            }}
                                            className="mt-0.5 w-3.5 h-3.5 rounded-none border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                        />
                                        <span className={cn("text-[12px] leading-tight mt-0.5", isSelected ? "text-primary-700 font-bold" : "text-surface-700 font-medium group-hover:text-surface-900")}>
                                            {acc}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : colKey?.toLowerCase().includes('nbi') && colKey?.toLowerCase().includes('status') ? (
                <select
                    autoFocus
                    value={localVal}
                    onBlur={handleCommit}
                    onChange={(e) => {
                        setLocalVal(e.target.value);
                        onChange(e.target.value);
                    }}
                    className="w-full h-full p-4 text-[12px] font-bold text-surface-900 bg-white outline-none appearance-none cursor-pointer text-left"
                >
                    <option value="">---</option>
                    <option value="DONE">DONE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="HIT">HIT</option>
                </select>
            ) : (colKey?.toLowerCase().includes('date') || colKey?.toLowerCase().includes('birth')) ? (
                <input
                    type="date"
                    autoFocus
                    value={localVal}
                    onBlur={handleCommit}
                    onChange={(e) => setLocalVal(e.target.value)}
                    className="w-full h-full p-4 bg-white text-[12px] font-medium text-surface-900 border-2 border-[#0078d4] focus:ring-4 focus:ring-[#0078d4]/10 outline-none"
                />
            ) : (
                <textarea
                    autoFocus
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "w-full h-full p-4 bg-white text-[12px] font-medium text-surface-900 border-2 border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none resize-none shadow-inner",
                        isStatus && "text-center font-bold"
                    )}
                    placeholder={placeholder || `Enter value...`}
                />
            )}
        </td>
    );
});
