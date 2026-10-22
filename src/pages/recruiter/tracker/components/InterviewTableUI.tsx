import React, { useState } from 'react';
import { Maximize2, MessageSquare, History, User } from 'lucide-react';
import { getSpecificStatusesForStep } from '../utils/statusMappings';
import { cn, STATUS_LABELS, STATUS_CSS } from '@/utils/formatters';

import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import type { Application } from '@/types/application';


import { splitReprofileAccounts } from '@/utils/reprofileQueue';
import { cleanColumn1Text } from '../utils/tableHelpers';
import { CellNotePopover } from '@/components/common/CellNotePopover';

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
            "sticky z-20 bg-white dark:bg-slate-900 group-hover:bg-[#f8f9fa] border-b border-r border-surface-200 px-4 shadow-[2px_0_4px_rgba(0,0,0,0.04)] text-left overflow-hidden cursor-pointer",
            !!presence?.hovers?.length && "ring-2 ring-inset ring-brand-red/30 bg-brand-red/5",
            className
        )}
        style={{ left: isSelectMode ? 50 : 0 }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onDoubleClick={() => onViewProfile?.(app)}
        >
        <div className="flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-none bg-[#edebe9] dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase shadow-inner text-left relative shrink-0">
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
                        <p className="text-[11px] font-bold text-surface-900 truncate leading-none uppercase tracking-tight text-left">
                            {app.applicant_name}
                        </p>
                        <MedicalIndicator application={app} size="xs" />
                        <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100">
                            {onViewProfile && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewProfile(app); }}
                                    className="p-1.5 bg-[#f0f2f5] hover:bg-[#e1dfdd] text-[#0078d4] rounded-none shadow-sm border border-surface-200 text-left cursor-pointer"
                                    title="View Full PIS Profile"
                                >
                                    <User size={14} />
                                </button>
                            )}
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
                        {(() => {
                            const d = new Date(app.updated_at || app.applied_at);
                            if (isNaN(d.getTime())) return null;
                            const idleDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
                            if (idleDays > 3) {
                                return <span className="px-1 py-0.5 rounded-sm bg-red-100 text-red-700 text-[8px] font-bold tracking-widest uppercase">IDLE {idleDays}d</span>;
                            } else if (idleDays > 2) {
                                return <span className="px-1 py-0.5 rounded-sm bg-orange-100 text-orange-700 text-[8px] font-bold tracking-widest uppercase">WARN {idleDays}d</span>;
                            }
                            return null;
                        })()}
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
    width?: number | string;
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
    currentStep?: string;
    setIsEditing?: (val: boolean) => void;
    selectionBounds?: { startRow: number, endRow: number, startCol: number, endCol: number } | null;
    copiedBounds?: { startRow: number, endRow: number, startCol: number, endCol: number } | null;
    dragAnchor?: { row: number, col: number, appId: string } | null;
    rowIdx?: number;
    colIdx?: number;
    onCellMouseDown?: (e: React.MouseEvent, rowIdx: number, colIdx: number, appId: string) => void;
    onCellMouseEnter?: (rowIdx: number, colIdx: number) => void;
    onCellMouseUp?: () => void;
    note?: string;
    onNoteChange?: (note: string) => void;
}

export const getStatusOptionStyle = (status: string): React.CSSProperties => {
    const s = (status || '').toUpperCase();
    if (s.includes('NO SHOW') || s.includes('NO-SHOW') || s.includes('NOSHOW')) {
        return { backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 700 };
    }
    if (s.includes('HIRE') || s.includes('ACCEPTED OFFER')) {
        return { backgroundColor: '#107c10', color: '#ffffff', fontWeight: 700 };
    }
    if (s.includes('PASS') || s.includes('PROMOTION')) {
        return { backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 700 };
    }
    if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NOT ELIGIBLE') || s === 'CLOSED') {
        return { backgroundColor: '#fef2f2', color: '#b91c1c', fontWeight: 700 };
    }
    if (s.includes('WITHDRAW') || s.includes('DECLINE') || s.includes('REPROFILE')) {
        return { backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 700 };
    }
    if (s.includes('LATERAL')) {
        return { backgroundColor: '#f0fdf4', color: '#0f766e', fontWeight: 700 };
    }
    if (s.includes('PENDING') || s.includes('SCHEDULE') || s.includes('FOR') || s === 'OPEN') {
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 };
    }
    return { backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 600 };
};

export const EditableCell = React.memo(({ 
    value, isEditing, isActive, onPaint, onStartEdit, onChange, colKey, id,
    placeholder, isStatus, isAccount, accounts, onShowHistory, width, presence, onHover, onLeave, className,
    onClose, style, options, setIsEditing, currentStep,
    selectionBounds, copiedBounds, dragAnchor, rowIdx, colIdx, onCellMouseDown, onCellMouseEnter, onCellMouseUp,
    note, onNoteChange
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
        if (colKey === 'final_interview_notes' || colKey === 'ops_validator_notes' || colKey === 'pis_ops_validator_notes' || colKey === 'master_remarks' || (colKey && (colKey.includes('remarks') || colKey.includes('notes'))) || strVal.includes('===') || strVal.toLowerCase().includes('personal rating:')) {
            return cleanColumn1Text(strVal);
        }
        return strVal;
    }, [value, colKey]);

    const [localVal, setLocalVal] = React.useState(safeVal);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Note Popover State
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [notePos, setNotePos] = useState<{ left: number; top: number; placement: 'up' | 'down' } | null>(null);
    const cellRef = React.useRef<HTMLTableCellElement>(null);
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

    const [recruiterOptions, setRecruiterOptions] = React.useState<string[]>([]);
    const [restrictedRecruiters, setRestrictedRecruiters] = React.useState<Set<string>>(new Set());
    React.useEffect(() => {
        const normKey = (colKey || '').toUpperCase();
        if (normKey === 'INTERVIEWER_NAME' || normKey === 'ASSIGNED_RECRUITER_NAME' || normKey === 'RECRUITER' || normKey === 'RECRUITER / INTERVIEWER' || normKey.includes('RECRUITER') || normKey.includes('INTERVIEWER')) {
            import('../utils/tableHelpers').then(h => {
                // Actually tableUtils is in the same dir as InterviewTableUI
            });
            import('./tableUtils').then(module => {
                module.loadRecruiterOptions().then(cached => {
                    if (cached && cached.length > 0) {
                        setRecruiterOptions(cached);
                        setRestrictedRecruiters(module.restrictedRecruiters || new Set());
                    } else {
                        // Fallback to local storage if API failed
                        try {
                            const local = localStorage.getItem('cached_users');
                            if (local) {
                                const users = JSON.parse(local);
                                const opts = users.filter((u: any) => u.role?.toLowerCase().includes('recruiter') || u.role === 'admin' || u.role === 'super_admin')
                                    .map((u: any) => u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim())
                                    .filter(Boolean);
                                setRecruiterOptions(Array.from(new Set(opts)).sort() as string[]);
                            }
                        } catch (e) {}
                    }
                }).catch(() => {
                        try {
                            const local = localStorage.getItem('cached_users');
                            if (local) {
                                const users = JSON.parse(local);
                                const opts = users.filter((u: any) => u.role?.toLowerCase().includes('recruiter') || u.role === 'admin' || u.role === 'super_admin')
                                    .map((u: any) => u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim())
                                    .filter(Boolean);
                                setRecruiterOptions(Array.from(new Set(opts)).sort() as string[]);
                            }
                        } catch (e) {}
                });
            });
        }
    }, [colKey]);

    const effectiveOptions = options && options.length > 0 ? options : recruiterOptions.length > 0 ? recruiterOptions : undefined;

    const handleCommit = () => {
        if (setIsEditing) setIsEditing(false);
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

    const inSelection = selectionBounds && rowIdx !== undefined && colIdx !== undefined && rowIdx >= selectionBounds.startRow && rowIdx <= selectionBounds.endRow && colIdx >= selectionBounds.startCol && colIdx <= selectionBounds.endCol;
    const isSelectionTop = inSelection && rowIdx === selectionBounds.startRow;
    const isSelectionBottom = inSelection && rowIdx === selectionBounds.endRow;
    const isSelectionLeft = inSelection && colIdx === selectionBounds.startCol;
    const isSelectionRight = inSelection && colIdx === selectionBounds.endCol;
    const isAnchorCell = dragAnchor && dragAnchor.row === rowIdx && dragAnchor.col === colIdx;

    const inCopied = copiedBounds && rowIdx !== undefined && colIdx !== undefined && rowIdx >= copiedBounds.startRow && rowIdx <= copiedBounds.endRow && colIdx >= copiedBounds.startCol && colIdx <= copiedBounds.endCol;
    const isCopiedTop = inCopied && rowIdx === copiedBounds.startRow;
    const isCopiedBottom = inCopied && rowIdx === copiedBounds.endRow;
    const isCopiedLeft = inCopied && colIdx === copiedBounds.startCol;
    const isCopiedRight = inCopied && colIdx === copiedBounds.endCol;

    const bgShadows = [];
    if (isSelectionTop) bgShadows.push('inset 0 2px 0 0 #217346');
    if (isSelectionBottom) bgShadows.push('inset 0 -2px 0 0 #217346');
    if (isSelectionLeft) bgShadows.push('inset 2px 0 0 0 #217346');
    if (isSelectionRight) bgShadows.push('inset -2px 0 0 0 #217346');

    if (!isEditing || !isActive) {
        const isOpsValCol = colKey?.toLowerCase().includes('ops_val') || colKey?.toLowerCase().includes('ops_validator');
        return (
            <td
                ref={cellRef}
                id={id}
                onMouseDown={(e) => { if (rowIdx !== undefined && colIdx !== undefined) onCellMouseDown?.(e, rowIdx, colIdx, (id || '').split('-')[1]); }}
                onMouseEnter={() => { onHover?.(); if (rowIdx !== undefined && colIdx !== undefined) onCellMouseEnter?.(rowIdx, colIdx); }}
                onMouseUp={() => onCellMouseUp?.()}
                onMouseLeave={onLeave}
                className={cn(
                    "relative overflow-hidden group-hover/row:bg-[#f8f9fa]",
                    !isActive ? "px-3 py-0" : "p-0",
                    isEditing && "hover:bg-[#f0f7ff] cursor-cell group/paint",
                    !isEditing && "cursor-pointer",
                    !!presence?.edits?.length && "ring-2 ring-inset ring-amber-400/50 bg-amber-50",
                    (inSelection && !isAnchorCell) ? "bg-[#e6f2eb] transition-colors" : "bg-white dark:bg-slate-900",
                    !inSelection && "border-b border-surface-200",
                    (inSelection && !isSelectionBottom) && "border-b border-[#c0dccb]",
                    (inSelection && !isSelectionRight) && "border-r border-[#c0dccb]",
                    className
                )}
                style={{ 
                    width, minWidth: width, maxWidth: width, ...style,
                    boxShadow: bgShadows.length > 0 ? bgShadows.join(', ') : undefined
                }}
                onClick={(e) => { 
                    if (isEditing) {
                        e.stopPropagation(); 
                        if (onStartEdit) {
                            onStartEdit();
                        } else {
                            onPaint(e); 
                        }
                    } else {
                        if (setIsEditing) {
                            e.stopPropagation();
                            setIsEditing(true);
                            if (onStartEdit) onStartEdit();
                        } else {
                            setIsExpanded(!isExpanded);
                        }
                    }
                }}
                onContextMenu={isEditing ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPaint(e);
                } : undefined}
                title={!isEditing ? (isExpanded ? "Click to collapse" : "Click to view full details") : undefined}
            >
                {inCopied && (
                    <div 
                        className="absolute inset-0 pointer-events-none z-[20] copied-ants-overlay"
                        style={{
                            background: [
                                isCopiedTop ? 'linear-gradient(90deg, #217346 50%, transparent 50%) repeat-x top left / 8px 2px' : '',
                                isCopiedBottom ? 'linear-gradient(90deg, #217346 50%, transparent 50%) repeat-x bottom left / 8px 2px' : '',
                                isCopiedLeft ? 'linear-gradient(180deg, #217346 50%, transparent 50%) repeat-y top left / 2px 8px' : '',
                                isCopiedRight ? 'linear-gradient(180deg, #217346 50%, transparent 50%) repeat-y top right / 2px 8px' : ''
                            ].filter(Boolean).join(', ')
                        }}
                    />
                )}
                <div className={cn(
                    "w-full h-full flex items-center text-left relative transition-all duration-200 group/cell",
                    !isExpanded ? "max-h-[36px]" : "max-h-none bg-primary-50/10 shadow-[inset_3px_0_0_#0078d4]",
                    !isEditing && "hover:bg-surface-50"
                )}>
                    {isEditing && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover/paint:opacity-100">
                            <div className="w-1.5 h-1.5 rounded-none bg-[#0078d4]" />
                        </div>
                    )}
                    {!isEditing && setIsEditing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                                if (onStartEdit) onStartEdit();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 text-slate-400 hover:text-[#0078d4] transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 z-10"
                            title="Edit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                    )}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className={cn(
                            "text-[12px] leading-none text-left truncate flex-1 flex items-center gap-1.5",
                            !isExpanded ? "truncate" : "whitespace-normal"
                        )}>
                            {localVal ? (
                                isStatus ? (
                                    (() => {
                                        const rawUpper = localVal.toUpperCase();
                                        let displayVal = localVal;
                                        if (rawUpper === 'REJECTED') displayVal = 'FAILED';
                                        if (rawUpper === 'FINAL INTERVIEW' || rawUpper === 'FINAL INTERVIEWER' || rawUpper === 'FINAL_INTERVIEW' || rawUpper === 'FINAL INTERVIEW SCHEDULED' || rawUpper === 'FINAL_INTERVIEW_SCHEDULED') {
                                            displayVal = 'FOR FINAL INTERVIEW SCHEDULING';
                                        }
                                        const displayUpper = displayVal.toUpperCase();
                                        
                                        return (
                                            <span className={cn(
                                                "badge font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border shadow-sm text-[10px]",
                                                displayUpper.includes('NO SHOW') || displayUpper.includes('NO-SHOW') || displayUpper.includes('NOSHOW') ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                displayUpper.includes('HIRE') || displayUpper.includes('ACCEPTED OFFER') ? "bg-[#107c10] text-white border-[#107c10]" :
                                                displayUpper.includes('PASS') || displayUpper.includes('PROMOTION') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                displayUpper.includes('FAIL') || displayUpper.includes('REJECT') || displayUpper.includes('NOT ELIGIBLE') || displayUpper === 'CLOSED' ? "bg-red-50 text-red-700 border-red-200" :
                                                displayUpper.includes('WITHDRAW') || displayUpper.includes('DECLINE') ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                displayUpper.includes('PENDING') || displayUpper.includes('SCHEDULE') || displayUpper.includes('FOR ') || displayUpper === 'OPEN' ? "bg-primary-50 text-primary-700 border-primary-200" :
                                                "bg-surface-50 text-surface-600 border-surface-200"
                                            )}>
                                                {displayVal}
                                            </span>
                                        );
                                    })()
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
                    </div>

                    {(note || onNoteChange) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!cellRef.current) return;
                                const rect = cellRef.current.getBoundingClientRect();
                                const placeDown = rect.top < 150;
                                setNotePos({
                                    left: rect.left + rect.width / 2 - 24, // Position arrow near the cell center
                                    top: placeDown ? rect.bottom + 8 : rect.top - 8,
                                    placement: placeDown ? 'down' : 'up'
                                });
                                setIsNoteOpen(true);
                            }}
                            className={cn(
                                "absolute right-0.5 top-0.5 p-0.5 rounded transition-opacity flex items-center justify-center z-10",
                                note ? "opacity-100 text-blue-500 hover:text-blue-600 hover:bg-blue-50" : "opacity-0 group-hover/cell:opacity-60 text-slate-400 hover:opacity-100 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50"
                            )}
                            title={note ? "View/Edit Note" : "Add Note"}
                        >
                            <MessageSquare className={cn("w-3 h-3", note && "fill-current")} />
                        </button>
                    )}

                    {isNoteOpen && onNoteChange && (
                        <CellNotePopover
                            isOpen={isNoteOpen}
                            onClose={() => setIsNoteOpen(false)}
                            position={notePos}
                            initialNote={note || ''}
                            onSave={onNoteChange}
                        />
                    )}

                    {onShowHistory && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
                            className="absolute right-2 top-1.5 p-1 text-purple-600 hover:text-purple-700 bg-white/95 dark:bg-slate-900/95 shadow-sm border border-purple-100 rounded-none opacity-40 hover:opacity-100 z-20 flex items-center justify-center transition-all hover:bg-purple-50"
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
            ref={cellRef}
            id={id}
            onMouseDown={(e) => { if (rowIdx !== undefined && colIdx !== undefined) onCellMouseDown?.(e, rowIdx, colIdx, (id || '').split('-')[1]); }}
            onMouseEnter={() => { onHover?.(); if (rowIdx !== undefined && colIdx !== undefined) onCellMouseEnter?.(rowIdx, colIdx); }}
            onMouseUp={() => onCellMouseUp?.()}
            style={{ width, ...style, boxShadow: bgShadows.length > 0 ? bgShadows.join(', ') : undefined }}
            className={cn("border-r border-surface-200 p-0 overflow-visible text-left ring-2 ring-inset ring-[#0078d4] bg-white dark:bg-slate-900 z-50", className)}
        >
            {inCopied && (
                <div 
                    className="absolute inset-0 pointer-events-none z-[20] copied-ants-overlay"
                    style={{
                        background: [
                            isCopiedTop ? 'linear-gradient(90deg, #217346 50%, transparent 50%) repeat-x top left / 8px 2px' : '',
                            isCopiedBottom ? 'linear-gradient(90deg, #217346 50%, transparent 50%) repeat-x bottom left / 8px 2px' : '',
                            isCopiedLeft ? 'linear-gradient(180deg, #217346 50%, transparent 50%) repeat-y top left / 2px 8px' : '',
                            isCopiedRight ? 'linear-gradient(180deg, #217346 50%, transparent 50%) repeat-y top right / 2px 8px' : ''
                        ].filter(Boolean).join(', ')
                    }}
                />
            )}
            {effectiveOptions && effectiveOptions.length > 0 ? (
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
                    className="w-full h-full block px-2 py-1 text-[11px] font-bold text-surface-900 bg-white dark:bg-slate-900 outline-none appearance-none cursor-pointer text-left border-none min-h-[34px]"
                >
                    <option value="">---</option>
                    {effectiveOptions.map(opt => (
                        <option key={opt} value={opt} className={restrictedRecruiters.has(opt) ? "text-red-600 font-bold" : ""}>
                            {opt}
                        </option>
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
                    className={cn(
                        "w-full h-full block px-2 py-1 text-[11px] font-bold outline-none appearance-none cursor-pointer text-left border-none min-h-[34px]",
                        (STATUS_CSS as any)[localVal] || (STATUS_CSS as any)[String(localVal).toUpperCase()] || ''
                    )}
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
                        (colKey === 'pis_final_specific_status' || colKey === 'final_specific_status') ? getSpecificStatusesForStep(currentStep, localVal) :
                        [
                            'Hired',
                            'For Job Offer',
                            'Withdrawn',
                            'For PAN',
                            'Applicant Form',
                            'Lateral Transfer',
                            'Sent JO and BGC',
                            'Assessment',
                            'Accepted Offer'
                        ]
                      ).map(status => {
                          const isOverall = colKey === 'pis_overall_status' || colKey === 'overall_status';
                          const displayLabel = isOverall ? status : (STATUS_LABELS[status] || status);
                          const activeClass = (STATUS_CSS as any)[status] || (STATUS_CSS as any)[status.toUpperCase()] || '';
                          return (
                              <option 
                                  key={status} 
                                  value={status}
                                  className={cn("font-semibold px-2", activeClass || 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900')}
                              >
                                  {displayLabel}
                              </option>
                          );
                      })}
                </select>
            ) : isAccount ? (
                <div className="relative w-full h-full min-h-[48px]">
                    <div 
                        className="absolute left-0 top-0 w-full min-w-[280px] max-h-[500px] flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar shadow-2xl border border-surface-200 z-[100] outline-none rounded-none"
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
                        <div className="flex items-center justify-between p-3 mb-1 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-surface-100 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.05)]">
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
                    className="w-full h-full px-2 py-1 text-[11px] font-bold text-surface-900 bg-white dark:bg-slate-900 outline-none appearance-none cursor-pointer text-left"
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
                    onDoubleClick={handleCommit}
                    className="w-full h-full px-2 py-1 bg-white dark:bg-slate-900 text-[11px] font-medium text-surface-900 border-2 border-[#0078d4] focus:ring-4 focus:ring-[#0078d4]/10 outline-none"
                />
            ) : (
                <textarea
                    ref={(el) => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${Math.max(el.scrollHeight + 4, 38)}px`;
                        }
                    }}
                    autoFocus
                    value={localVal}
                    onChange={(e) => {
                        setLocalVal(e.target.value);
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight + 4, 38)}px`;
                    }}
                    onFocus={(e) => {
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight + 4, 38)}px`;
                    }}
                    onBlur={handleCommit}
                    onKeyDown={handleKeyDown}
                    onDoubleClick={handleCommit}
                    className={cn(
                        "w-full px-2 py-1 bg-white dark:bg-slate-900 text-[11px] font-medium text-surface-900 border-2 border-amber-400 focus:ring-4 focus:ring-amber-400/10 outline-none resize-none shadow-inner overflow-hidden min-h-[38px]",
                        isStatus && "text-center font-bold"
                    )}
                    placeholder={placeholder || `Enter value...`}
                />
            )}
        </td>
    );
});
