import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, Square, Loader2, Briefcase, ChevronRight, AlertTriangle, User, Clipboard, History, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ApplicationCell } from './ApplicationCell';
import {
    computeHireEligibility,
    buildMissingTooltip,
    spotlightCell,
    normalizeStatusText,
    REQUIREMENT_COLUMN_MAP,
    HIRE_ELIGIBILITY_WIDTH
} from './tableHelpers';
import { PositionService } from '@/services/PositionService';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import { getDefaultOptionsForColKey } from '../../components/tableUtils';
import { formatDate } from '../../utils/tableHelpers';

function AnimatedAvatar({ sex, photoUrl, name }: { sex?: string; photoUrl?: string; name: string }) {
    const normalizedGender = (sex || '').toLowerCase().trim();
    const isFemale = normalizedGender === 'female' || normalizedGender === 'f';
    const avatarUrl = photoUrl || (isFemale ? '/default-avatar-female.png?v=3' : '/default-avatar-male.png?v=3');

    return (
        <div className="w-5 h-5 border border-surface-200 bg-surface-50 shrink-0 overflow-hidden rounded-none">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        </div>
    );
}


const getColumnKey = (col: any) => col.subField ? `${col.field}.${col.subField}` : col.field;

export const ApplicationRow = React.memo(({
    app, columns, isEditing, setIsEditing, rowLocalChanges, onEdit, isRowActive, onToggleSelect, isSelected, isSelectMode, showSelectionColumn,
    onViewProfile, onViewPISDashboard, onShowNotes, onManageResume, onShowHistory, setSchedPrompt, onRowMouseDown, onRowMouseUp, onRowMouseEnter, idx, handleDirectSend, focusPath, setFocusPath,
    isChecklistOpen, onPromoteToHired, promotingId, activeHireChecklistAppId, setActiveHireChecklistAppId,
    columnHighlights, eligibilitySettings, setActiveTab, customColumnMeta, activeTabKey, showHireEligibility, onMoveRow,
    frozenKeys = [], columnLeftOffsets = {}, frozenRightKeys = [], columnRightOffsets = {},
    selectionBounds, copiedBounds, dragAnchor, duplicateGovIdsMap, onCellMouseDown, onCellMouseEnter, onCellMouseUp
    }: any) => {
        const handleSetSchedPrompt = useCallback((params: any) => setSchedPrompt(params), [setSchedPrompt]);

        const triggerRef = useRef<HTMLButtonElement | null>(null);
        const [popoverPos, setPopoverPos] = useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

        const isHireChecklistOpen = activeHireChecklistAppId === app.id;

        const [openings, setOpenings] = useState<any[]>([]);
        const [selectedOpeningId, setSelectedOpeningId] = useState<string>('');

        useEffect(() => {
            if (!isHireChecklistOpen) return;
            PositionService.getAllOpen().then(list => {
                const rawDepts = app.department || app.endorsement_account || app.pis?.final_account || '';
                const candidateDepts = rawDepts.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
                const matched = list.filter((pos: any) => {
                    const posDept = (pos.department || '').trim().toLowerCase();
                    if (!posDept) return false;
                    return candidateDepts.some((cd: string) => posDept === cd || posDept.includes(cd) || cd.includes(posDept));
                });
                setOpenings(matched);
                if (matched.length > 0) {
                    setSelectedOpeningId(matched[0].id);
                } else {
                    setSelectedOpeningId('');
                }
            }).catch(err => console.error("Failed to load positions:", err));
        }, [isHireChecklistOpen, app.department, app.endorsement_account, app.pis?.final_account]);

        useEffect(() => {
            if (!isHireChecklistOpen) return;
            const updatePos = () => {
                const rect = triggerRef.current?.getBoundingClientRect();
                if (rect && popoverPos) {
                    const popoverWidth = 280;
                    const margin = 8;
                    const viewportW = window.innerWidth;
                    let left = rect.left + rect.width / 2 - popoverWidth / 2;
                    left = Math.max(margin, Math.min(left, viewportW - popoverWidth - margin));
                    const estimatedHeight = 260;
                    const viewportH = window.innerHeight;
                    const placeDown = rect.bottom + estimatedHeight + margin < viewportH;
                    const top = placeDown ? rect.bottom + 6 : Math.max(margin, rect.top - estimatedHeight - 6);
                    setPopoverPos({ left, top, placement: placeDown ? 'down' : 'up' });
                }
            };
            window.addEventListener('scroll', updatePos, true);
            window.addEventListener('resize', updatePos);
            return () => {
                window.removeEventListener('scroll', updatePos, true);
                window.removeEventListener('resize', updatePos);
            };
        }, [isHireChecklistOpen, popoverPos]);

        const closeChecklist = useCallback(() => {
            setActiveHireChecklistAppId(null);
            setPopoverPos(null);
        }, [setActiveHireChecklistAppId]);

        const renderIdCell = (value: number) => {
            const isFrozen = frozenKeys.includes('id');
            return (
                <td
                    className="px-1 py-1 border-b border-slate-100 border-r border-slate-100 text-xs font-semibold text-[#323130] dark:text-slate-300 overflow-hidden whitespace-nowrap bg-white dark:bg-slate-900 relative group/row-actions"
                    style={{
                        width: 135,
                        minWidth: 135,
                        maxWidth: 135,
                        left: isFrozen ? columnLeftOffsets['id'] : undefined,
                    }}
                >
                    <div className="px-1 py-1 flex items-center justify-start gap-1 relative h-full">
                        <div className="flex flex-col items-center justify-center text-surface-200 hover:text-surface-700 transition-colors w-3 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onMoveRow?.(app.id, 'up'); }}
                                className="hover:text-[#0078D4] focus:outline-none p-0 h-3 flex items-center justify-center"
                                title="Move Row Up"
                            >
                                <ChevronUp size={12} strokeWidth={3} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onMoveRow?.(app.id, 'down'); }}
                                className="hover:text-[#0078D4] focus:outline-none p-0 h-3 flex items-center justify-center"
                                title="Move Row Down"
                            >
                                <ChevronDown size={12} strokeWidth={3} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(app.id); }}
                            className="w-5 text-surface-700 font-bold text-xs text-center shrink-0 hover:text-[#0078D4] hover:underline cursor-pointer focus:outline-none"
                            title="Highlight row"
                        >
                            {value}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onViewProfile?.(app); }}
                                className="h-5 px-1 bg-[#EFF6FF] text-[#0078D4] font-black text-[9px] rounded hover:bg-[#E0EEFE] border border-[#0078D4]/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                                title="View Full PIS Profile"
                            >
                                PIS
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    onShowNotes?.(app, rect);
                                }}
                                className="h-5 w-5 bg-[#F0FDF4] text-[#16A34A] rounded hover:bg-[#DCFCE7] border border-[#16A34A]/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                                title="View Notes"
                            >
                                <Clipboard size={10} className="font-black" />
                            </button>
                            {onManageResume && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onManageResume(app);
                                    }}
                                    className="h-5 w-5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-600/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                                    title="Manage Resume"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="font-black"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                </button>
                            )}
                            {!!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0)) ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowHistory?.(app);
                                    }}
                                    className="h-5 w-5 bg-[#FAF5FF] text-[#9333EA] rounded hover:bg-[#F3E8FF] border border-[#9333EA]/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                                    title="View Reprofile History"
                                >
                                    <History size={10} className="font-black" />
                                </button>
                            ) : (
                                <div className="w-5 h-5 shrink-0" />
                            )}
                        </div>
                    </div>
                </td>
            );
        };

    const renderHireEligibilityCell = () => {
        const eligibility = computeHireEligibility(app, rowLocalChanges, eligibilitySettings);
        const isPromotingThisRow = promotingId === app.id;
        const effectiveCurrentStatus = (rowLocalChanges?.current_status !== undefined ? rowLocalChanges.current_status : app.current_status) as string;
        const isAlreadyHired = normalizeStatusText(effectiveCurrentStatus) === 'hired';

        const openChecklist = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isAlreadyHired || isPromotingThisRow) return;
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) {
                const popoverWidth = 280;
                const margin = 8;
                const viewportW = window.innerWidth;
                let left = rect.left + rect.width / 2 - popoverWidth / 2;
                left = Math.max(margin, Math.min(left, viewportW - popoverWidth - margin));
                const estimatedHeight = 260;
                const viewportH = window.innerHeight;
                const placeDown = rect.bottom + estimatedHeight + margin < viewportH;
                const top = placeDown ? rect.bottom + 6 : Math.max(margin, rect.top - estimatedHeight - 6);
                setPopoverPos({ left, top, placement: placeDown ? 'down' : 'up' });
            }
            setActiveHireChecklistAppId(isHireChecklistOpen ? null : app.id);
        };

        const handleToggleCheck = (label: string, met: boolean) => {
            if (label === 'Status') {
                onEdit(app.id, 'current_status', met ? 'OPEN' : 'ACCEPTED OFFER');
            } else if (label === '1st Day Show up') {
                onEdit(app.id, 'master_first_day_show_up', met ? '---' : 'Showed');
            } else if (label === 'Final Specific Status') {
                const currentChanges = (rowLocalChanges || {}) as any;
                const nested = {
                    ...(currentChanges['pis'] || app['pis'] || {}),
                    final_specific_status: met ? '---' : 'OV - Passed'
                };
                onEdit(app.id, 'pis', nested);
            } else if (label === '2nd Day Show up') {
                onEdit(app.id, 'master_second_day_show_up', met ? '---' : 'Showed');
            }
        };

        const popoverNode = isHireChecklistOpen && popoverPos ? createPortal(
            <>
                <div
                    className="fixed inset-0 z-[2147483000]"
                    onClick={closeChecklist}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: popoverPos.placement === 'down' ? -4 : 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: popoverPos.placement === 'down' ? -4 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.6 }}
                    style={{
                        position: 'fixed',
                        left: popoverPos.left,
                        top: popoverPos.top,
                        zIndex: 2147483647,
                        width: 310
                    }}
                    className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-premium"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 border-b border-[#edebe9] dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-emerald-600" strokeWidth={2.5} />
                            <span className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-tight">Hire Eligibility</span>
                        </div>
                        <span className={cn(
                            "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-sm",
                            eligibility.isEligible
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                        )}>
                            {eligibility.metRequired}/{eligibility.totalRequired}
                            {eligibility.metOptional ? <span className="text-emerald-600">+1</span> : <span className="text-rose-500">+0</span>}
                        </span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                        <div className="text-[9.5px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Required</div>
                        {eligibility.requiredChecks.map((c, i) => {
                            const colField = REQUIREMENT_COLUMN_MAP[c.label] || (c as any).columnField;
                            return (
                                <div
                                    key={`req-${i}`}
                                    onClick={() => {
                                        if (colField) {
                                            closeChecklist();
                                            const success = spotlightCell(app.id, colField);
                                            if (!success && setActiveTab) {
                                                setActiveTab('MASTERLIST');
                                                setTimeout(() => {
                                                    spotlightCell(app.id, colField);
                                                }, 350);
                                            }
                                        } else {
                                            handleToggleCheck(c.label, c.met);
                                        }
                                    }}
                                    className="flex items-center justify-between gap-2 text-[11.5px] py-1.5 px-1.5 rounded-sm hover:bg-[#f3f2f1] cursor-pointer group/item transition-colors"
                                    title={colField ? `Click to locate ${c.label} column` : `Click to force toggle ${c.label}`}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {c.met ? (
                                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0 group-hover/item:scale-110 transition-transform" strokeWidth={2.5} />
                                        ) : (
                                            <X size={12} className="text-rose-500 shrink-0 group-hover/item:scale-110 transition-transform" strokeWidth={3} />
                                        )}
                                        <span className={cn(
                                            "truncate",
                                            c.met ? "text-[#323130] dark:text-slate-300" : "text-rose-700 font-medium group-hover/item:text-rose-950 transition-colors"
                                        )}>{c.label}</span>
                                        {(c as any).source === 'interview' ? (
                                            <span className="text-[8px] font-bold text-purple-600 bg-purple-50/70 border border-purple-100 px-1 py-0.2 rounded-sm shrink-0 uppercase tracking-tight scale-90 select-none">
                                                Interview Form
                                            </span>
                                        ) : (
                                            <span className="text-[8px] font-bold text-blue-600 bg-blue-50/70 border border-blue-100 px-1 py-0.2 rounded-sm shrink-0 uppercase tracking-tight scale-90 select-none">
                                                Masterlist
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn(
                                            "text-[9.5px] font-bold uppercase tracking-wide tabular-nums opacity-80 group-hover/item:opacity-100 transition-opacity",
                                            c.met ? "text-emerald-600" : "text-rose-500"
                                        )}>
                                            {c.met ? 'Met' : 'Missing'}
                                        </span>
                                        {colField && (
                                            <ChevronRight size={10} className="text-[#a19f9d] group-hover/item:text-[#0078d4] transition-colors" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {eligibility.optionalChecks.length > 0 && (
                            <>
                                <div className="text-[9.5px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider pt-1">Optional</div>
                                {eligibility.optionalChecks.map((c, i) => {
                                    const colField = REQUIREMENT_COLUMN_MAP[c.label] || (c as any).columnField;
                                    return (
                                        <div
                                            key={`opt-${i}`}
                                            onClick={() => {
                                                if (colField) {
                                                    closeChecklist();
                                                    const success = spotlightCell(app.id, colField);
                                                    if (!success && setActiveTab) {
                                                        setActiveTab('MASTERLIST');
                                                        setTimeout(() => {
                                                            spotlightCell(app.id, colField);
                                                        }, 350);
                                                    }
                                                } else {
                                                    handleToggleCheck(c.label, c.met);
                                                }
                                            }}
                                            className="flex items-center justify-between gap-2 text-[11.5px] py-1.5 px-1.5 rounded-sm hover:bg-[#f3f2f1] cursor-pointer group/item transition-colors"
                                            title={colField ? `Click to locate ${c.label} column` : `Click to force toggle ${c.label}`}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {c.met ? (
                                                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0 group-hover/item:scale-110 transition-transform" strokeWidth={2.5} />
                                                ) : (
                                                    <Square size={12} className="text-[#a19f9d] shrink-0 group-hover/item:scale-110 transition-transform" strokeWidth={2.5} />
                                                )}
                                                <span className={cn(
                                                    "truncate",
                                                    c.met ? "text-[#323130] dark:text-slate-300" : "text-[#605e5c] dark:text-slate-400 group-hover/item:text-surface-800 transition-colors"
                                                )}>{c.label}</span>
                                                {(c as any).source === 'interview' ? (
                                                    <span className="text-[8px] font-bold text-purple-600 bg-purple-50/70 border border-purple-100 px-1 py-0.2 rounded-sm shrink-0 uppercase tracking-tight scale-90 select-none">
                                                        Interview Form
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-bold text-blue-600 bg-blue-50/70 border border-blue-100 px-1 py-0.2 rounded-sm shrink-0 uppercase tracking-tight scale-90 select-none">
                                                        Masterlist
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={cn(
                                                    "text-[9.5px] font-bold uppercase tracking-wide tabular-nums opacity-80 group-hover/item:opacity-100 transition-opacity",
                                                    c.met ? "text-emerald-600" : "text-[#a19f9d]"
                                                )}>
                                                    {c.met ? 'Met' : 'Pending'}
                                                </span>
                                                {colField && (
                                                    <ChevronRight size={10} className="text-[#a19f9d] group-hover/item:text-[#0078d4] transition-colors" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    <div className="px-3 py-2 border-t border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[#605e5c] dark:text-slate-400">
                                {isAlreadyHired
                                    ? 'Already hired'
                                    : eligibility.isEligible
                                        ? 'All required criteria met'
                                        : `${eligibility.totalRequired - eligibility.metRequired} required missing`}
                            </span>
                            <button
                                type="button"
                                onClick={closeChecklist}
                                className="h-6 px-2 bg-white dark:bg-slate-900 border border-[#c8c6c4] dark:border-slate-700 text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] text-[10px] font-bold uppercase tracking-wide rounded-sm transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </motion.div>
            </>,
            document.body
        ) : null;

        const isFrozen = frozenKeys.includes('hire');
        return (
            <td
                className={cn(
                    "border-b border-slate-100 border-r border-slate-100 p-0 align-middle text-center bg-white dark:bg-slate-900 group-hover/row:bg-[#f8f9fa] hover:scale-110 hover:shadow-xl hover:z-[100] hover:shadow-lg relative transition-all duration-300 ease-out",
                    isFrozen && "sticky z-10 bg-white dark:bg-slate-900"
                )}
                style={{
                    width: HIRE_ELIGIBILITY_WIDTH,
                    minWidth: HIRE_ELIGIBILITY_WIDTH,
                    maxWidth: HIRE_ELIGIBILITY_WIDTH,
                    left: isFrozen ? columnLeftOffsets['hire'] : undefined,
                    
                }}
            >
                <div
                    className="px-2 py-1.5 flex items-center justify-center gap-1.5 h-full"
                    title={eligibility.isEligible ? 'All required criteria met. Click to promote to HIRED.' : buildMissingTooltip(eligibility)}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {isAlreadyHired ? (
                            <motion.button
                                ref={triggerRef as any}
                                type="button"
                                onClick={openChecklist}
                                key="already-hired"
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-[11px] font-semibold tracking-tight cursor-pointer",
                                    app.metadata?.compliance_status === 'NON_COMPLIANT'
                                        ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                                        : "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                )}
                            >
                                {app.metadata?.compliance_status === 'NON_COMPLIANT' ? (
                                    <AlertTriangle size={13} className="text-amber-600" strokeWidth={2.5} />
                                ) : (
                                    <CheckCircle2 size={13} className="text-emerald-600" strokeWidth={2.5} />
                                )}
                                <span>{app.metadata?.compliance_status === 'NON_COMPLIANT' ? 'Hired (NC)' : 'Hired'}</span>
                            </motion.button>
                        ) : eligibility.isEligible ? (
                            <motion.button
                                ref={triggerRef as any}
                                key="eligible-action"
                                type="button"
                                onClick={openChecklist}
                                disabled={isPromotingThisRow}
                                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.96 }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm cursor-pointer",
                                    "bg-emerald-50 border border-emerald-300 text-emerald-700",
                                    "hover:bg-emerald-100 hover:border-emerald-400",
                                    "text-[11px] font-semibold tracking-tight",
                                    "transition-colors",
                                    isPromotingThisRow && "opacity-60 cursor-wait"
                                )}
                            >
                                {isPromotingThisRow ? (
                                    <Loader2 size={12} className="animate-spin" strokeWidth={2.5} />
                                ) : (
                                    <motion.span
                                        key="check"
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 600, damping: 16, mass: 0.5, delay: 0.05 }}
                                        className="inline-flex"
                                    >
                                        <CheckCircle2 size={13} className="text-emerald-600" strokeWidth={2.5} />
                                    </motion.span>
                                )}
                                <span>{isPromotingThisRow ? 'Hiring…' : `${eligibility.metRequired}/${eligibility.totalRequired}`}</span>
                            </motion.button>
                        ) : (
                            <motion.button
                                ref={triggerRef as any}
                                type="button"
                                onClick={openChecklist}
                                key="not-eligible"
                                initial={{ opacity: 0, scale: 0.6, rotate: 15 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.6, rotate: -15 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.96 }}
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold tracking-tight cursor-pointer hover:bg-rose-100"
                            >
                                <motion.span
                                    key="x"
                                    initial={{ scale: 0, rotate: 90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 16, mass: 0.5 }}
                                    className="inline-flex"
                                >
                                    <X size={13} className="text-rose-600" strokeWidth={3} />
                                </motion.span>
                                <span className="tabular-nums">{eligibility.metRequired}/{eligibility.totalRequired}</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
                {popoverNode}
            </td>
        );
    };

    return (
        <tr
            onMouseDown={(e) => {
                if (isSelectMode) e.preventDefault();
                onRowMouseDown(e, idx, app.id);
            }}
            onMouseUp={() => onRowMouseUp?.()}
            onMouseLeave={() => onRowMouseUp?.()}
            onMouseEnter={() => onRowMouseEnter(idx, app.id)}
            data-ai-spotlight={`candidate-${app.id}`}
            className={cn(
                "group/row h-9 bg-white dark:bg-slate-900 hover:bg-[#f8f9fa]",
                isSelectMode && "select-none",
                isSelected && "bg-[#fffbea]",
                app.highlight_color && app.highlight_color !== '---' && app.highlight_color !== 'clear' && `row-highlight-${app.highlight_color}`
            )}
            style={{
                minHeight: 36
            } as any}
        >
            {showSelectionColumn && (
                <td
                    className={cn(
                        "border-b border-slate-100 border-r border-slate-100 px-3 py-0 w-10 bg-white dark:bg-slate-900 group-hover/row:bg-[#f8f9fa] hover:scale-110 hover:shadow-xl hover:z-[100] hover:shadow-lg relative transition-all duration-300 ease-out",
                        frozenKeys.includes('select') && "sticky left-0 z-10 bg-white dark:bg-slate-900"
                    )}
                    style={{
                        left: frozenKeys.includes('select') ? columnLeftOffsets['select'] : undefined,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className={cn(
                            "rounded-none border-surface-400/80 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer pointer-events-none",
                            !isSelected && "opacity-20 group-hover/row:opacity-100"
                        )}
                    />
                </td>
            )}
            {showHireEligibility && renderHireEligibilityCell()}
            {renderIdCell(idx + 1)}
            <td
                className="border-b border-slate-100 border-r border-slate-100 px-3 py-1.5 align-middle text-center bg-white dark:bg-slate-900 group-hover/row:bg-[#f8f9fa] hover:scale-110 hover:shadow-xl hover:z-[100] hover:shadow-lg relative transition-all duration-300 ease-out whitespace-nowrap overflow-hidden text-ellipsis text-[11px] font-medium text-surface-600"
                style={{
                    width: 110,
                    minWidth: 110,
                    maxWidth: 110
                }}
                title={(app.interview_completed_at || app.applied_at) ? formatDate((app.interview_completed_at || app.applied_at)!, false) : ''}
            >
                {(app.interview_completed_at || app.applied_at) ? formatDate((app.interview_completed_at || app.applied_at)!, false) : '---'}
            </td>
            <td
                className="border-b border-slate-100 border-r border-slate-100 px-3 py-1.5 align-middle text-center bg-white dark:bg-slate-900 group-hover/row:bg-[#f8f9fa] hover:scale-110 hover:shadow-xl hover:z-[100] hover:shadow-lg relative transition-all duration-300 ease-out whitespace-nowrap overflow-hidden text-ellipsis text-[11px] font-medium text-surface-600"
                style={{
                    width: 155,
                    minWidth: 155,
                    maxWidth: 155
                }}
                title={app.updated_at ? formatDate(app.updated_at, false) : ''}
            >
                {app.updated_at ? formatDate(app.updated_at, false) : '---'}
            </td>
            {columns.map((col: any, cIdx: number) => {
                const colKey = getColumnKey(col);
                const columnHighlight = columnHighlights ? columnHighlights[colKey] : undefined;
                let customOptions = customColumnMeta[activeTabKey]?.[colKey]?.options || col.options || getDefaultOptionsForColKey(colKey, col.label);
                let optionColors = customColumnMeta[activeTabKey]?.[colKey]?.optionColors;
                
                if (colKey === 'pis.custom_lob' || col.label.toLowerCase() === 'lob') {
                    try {
                        const deptsStr = localStorage.getItem('cached_departments');
                        if (deptsStr) {
                            const allDepts = JSON.parse(deptsStr);
                            const currentDept = rowLocalChanges?.department !== undefined 
                                ? rowLocalChanges.department 
                                : (app.department || app.endorsement_account || app.pis?.final_account || '');
                            const applicantDepts = currentDept.split(',').map((d: string) => {
                                let val = d.trim();
                                if (val.toUpperCase().includes('AGENT - ')) val = val.substring(0, val.toUpperCase().indexOf('AGENT - ')).trim();
                                return val.toLowerCase();
                            });
                            const matchedDepts = allDepts.filter((d: any) => applicantDepts.includes((d.name || '').trim().toLowerCase()));
                            const dynamicLobs = new Set<string>();
                            matchedDepts.forEach((d: any) => {
                                let subAccs = d.subAccounts || d.sub_accounts;
                                if (typeof subAccs === 'string') {
                                    try { subAccs = JSON.parse(subAccs); } catch {}
                                }
                                if (Array.isArray(subAccs)) {
                                    subAccs.forEach((sa: any) => {
                                        if (sa.name) {
                                            let name = sa.name.trim();
                                            if (name.toUpperCase() === 'BDR' || name.toUpperCase() === 'AGENT BDR') name = 'AGENT - BDR';
                                            if (name.toUpperCase() === 'DIA' || name.toUpperCase() === 'AGENT DIA') name = 'AGENT - DIA';
                                            dynamicLobs.add(name);
                                        }
                                    });
                                }
                            });
                            if (dynamicLobs.size > 0) {
                                customOptions = Array.from(dynamicLobs);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse cached departments for LOBs', e);
                    }
                }
                const isFrozen = frozenKeys.includes(colKey);
                const isFrozenRight = frozenRightKeys?.includes(colKey);
                return (
                    <ApplicationCell
                        key={col.field + (col as any).subField + cIdx}
                        app={app}
                        col={col}
                        idx={cIdx}
                        rowIdx={idx}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        isRowActive={isRowActive}
                        rowLocalChanges={rowLocalChanges}
                        onEdit={onEdit}
                        isSelected={isSelected}
                        isSelectMode={isSelectMode}
                        showSelectionColumn={showSelectionColumn}
                        onViewProfile={onViewProfile}
                        onShowNotes={onShowNotes}
                        onShowHistory={onShowHistory}
                        setSchedPrompt={handleSetSchedPrompt}
                        handleDirectSend={handleDirectSend}
                        focusPath={focusPath}
                        setFocusPath={setFocusPath}
                        columnHighlight={columnHighlight}
                        customOptions={customOptions}
                        optionColors={optionColors}
                        isSticky={isFrozen}
                        leftOffset={isFrozen ? columnLeftOffsets[colKey] : undefined}
                        isLastFrozen={isFrozen}
                        isStickyRight={isFrozenRight}
                        rightOffset={isFrozenRight ? columnRightOffsets?.[colKey] : undefined}
                        selectionBounds={selectionBounds}
                        copiedBounds={copiedBounds}
                        dragAnchor={dragAnchor}
                        duplicateGovIdsMap={duplicateGovIdsMap}
                        onCellMouseDown={onCellMouseDown}
                        onCellMouseEnter={onCellMouseEnter}
                        onCellMouseUp={onCellMouseUp}
                    />
                );
            })}
        </tr>
    );
}, (prev, next) => {
    const wasInBounds = prev.selectionBounds && prev.idx >= prev.selectionBounds.startRow && prev.idx <= prev.selectionBounds.endRow;
    const isInBounds = next.selectionBounds && next.idx >= next.selectionBounds.startRow && next.idx <= next.selectionBounds.endRow;
    const boundsAffectRow = (prev.selectionBounds !== next.selectionBounds) && (wasInBounds || isInBounds);

    return prev.idx === next.idx && /* force HMR */
        prev.app === next.app &&
        prev.isEditing === next.isEditing &&
        prev.isRowActive === next.isRowActive &&
        prev.isSelected === next.isSelected &&
        prev.isSelectMode === next.isSelectMode &&
        prev.rowLocalChanges === next.rowLocalChanges &&
        (prev.focusPath === next.focusPath || (!prev.isRowActive && !next.isRowActive)) &&
        prev.isChecklistOpen === next.isChecklistOpen &&
        prev.columns === next.columns &&
        prev.promotingId === next.promotingId &&
        prev.activeHireChecklistAppId === next.activeHireChecklistAppId &&
        prev.columnHighlights === next.columnHighlights &&
        prev.customColumnMeta === next.customColumnMeta &&
        prev.showHireEligibility === next.showHireEligibility &&
        prev.columnLeftOffsets === next.columnLeftOffsets &&
        prev.columnRightOffsets === next.columnRightOffsets &&
        JSON.stringify(prev.frozenKeys) === JSON.stringify(next.frozenKeys) &&
        JSON.stringify(prev.frozenRightKeys) === JSON.stringify(next.frozenRightKeys) &&
        !boundsAffectRow &&
        JSON.stringify(prev.eligibilitySettings) === JSON.stringify(next.eligibilitySettings);
});


