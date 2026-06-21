import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, Square, Loader2, Briefcase, ChevronRight } from 'lucide-react';
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

function AnimatedAvatar({ gender, photoUrl, name }: { gender?: string; photoUrl?: string; name: string }) {
    const normalizedGender = (gender || '').toLowerCase().trim();
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
    onViewProfile, onShowNotes, onShowHistory, setSchedPrompt, onRowMouseDown, onRowMouseEnter, idx, handleDirectSend, focusPath, setFocusPath,
    isChecklistOpen, onPromoteToHired, promotingId, activeHireChecklistAppId, setActiveHireChecklistAppId,
    columnHighlights, eligibilitySettings, setActiveTab, customColumnMeta, activeTabKey
    }: any) => {
        const handleSetSchedPrompt = useCallback((params: any) => setSchedPrompt(params), [setSchedPrompt]);

        const renderIdCell = (value: number) => {
            return (
                <td
                    className={cn(
                        "border-b border-r border-[#edebe9] p-0 align-middle text-center bg-white group-hover/row:bg-[#f8f9fa]"
                    )}
                    style={{
                        width: 90,
                        minWidth: 90,
                        maxWidth: 90
                    }}
                >
                    <div className="px-2 py-2 flex items-center justify-center gap-1.5 relative h-full">
                        <AnimatedAvatar
                            gender={app.pis?.gender}
                            photoUrl={app.pis?.photo_data_url}
                            name={app.applicant_name}
                        />
                        <span className="text-surface-700 font-medium text-xs">{value}</span>
                    </div>
                </td>
            );
        };

    const renderHireEligibilityCell = () => {
        const eligibility = computeHireEligibility(app, rowLocalChanges, eligibilitySettings);
        const isPromotingThisRow = promotingId === app.id;
        const effectiveCurrentStatus = (rowLocalChanges?.current_status !== undefined ? rowLocalChanges.current_status : app.current_status) as string;
        const isAlreadyHired = normalizeStatusText(effectiveCurrentStatus) === 'hired';
        const isHireChecklistOpen = activeHireChecklistAppId === app.id;
        const triggerRef = useRef<HTMLButtonElement | null>(null);
        const [popoverPos, setPopoverPos] = useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

        const openChecklist = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isAlreadyHired || isPromotingThisRow) return;
            if (eligibility.isEligible) {
                if (onPromoteToHired) onPromoteToHired(app);
                return;
            }
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

        const closeChecklist = useCallback(() => {
            setActiveHireChecklistAppId(null);
            setPopoverPos(null);
        }, [setActiveHireChecklistAppId]);

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
                    className="bg-white border border-[#edebe9] rounded-sm shadow-premium"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 border-b border-[#edebe9] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-emerald-600" strokeWidth={2.5} />
                            <span className="text-[11px] font-bold text-[#323130] uppercase tracking-tight">Hire Eligibility</span>
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
                        <div className="text-[9.5px] font-bold text-[#605e5c] uppercase tracking-wider">Required</div>
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
                                            c.met ? "text-[#323130]" : "text-rose-700 font-medium group-hover/item:text-rose-950 transition-colors"
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
                                <div className="text-[9.5px] font-bold text-[#605e5c] uppercase tracking-wider pt-1">Optional</div>
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
                                                    c.met ? "text-[#323130]" : "text-[#605e5c] group-hover/item:text-surface-800 transition-colors"
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
                    <div className="px-3 py-2 border-t border-[#edebe9] bg-[#faf9f8] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#605e5c]">
                            {isAlreadyHired
                                ? 'Already hired'
                                : eligibility.isEligible
                                    ? 'All required criteria met'
                                    : `${eligibility.totalRequired - eligibility.metRequired} required missing`}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {eligibility.isEligible && !isAlreadyHired && !isPromotingThisRow && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeChecklist();
                                        if (onPromoteToHired) onPromoteToHired(app);
                                    }}
                                    className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wide rounded-sm transition-colors cursor-pointer"
                                >
                                    Set Hired
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={closeChecklist}
                                className="h-6 px-2 bg-white border border-[#c8c6c4] text-[#323130] hover:bg-[#f3f2f1] text-[10px] font-bold uppercase tracking-wide rounded-sm transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </motion.div>
            </>,
            document.body
        ) : null;

        return (
            <td
                className={cn(
                    "border-b border-r border-[#edebe9] p-0 align-middle text-center bg-white group-hover/row:bg-[#f8f9fa]"
                )}
                style={{
                    width: HIRE_ELIGIBILITY_WIDTH,
                    minWidth: HIRE_ELIGIBILITY_WIDTH,
                    maxWidth: HIRE_ELIGIBILITY_WIDTH
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
                                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-tight cursor-pointer hover:bg-emerald-100"
                            >
                                <CheckCircle2 size={13} className="text-emerald-600" strokeWidth={2.5} />
                                <span>Hired</span>
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
                                <span>{isPromotingThisRow ? 'Hiring…' : 'Set to Hired'}</span>
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
            onMouseEnter={() => onRowMouseEnter(idx, app.id)}
            data-ai-spotlight={`candidate-${app.id}`}
            className={cn(
                "group/row h-9 bg-white hover:bg-[#f8f9fa]",
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
                    className="border-b border-r border-[#edebe9] px-3 py-0 w-10 bg-white group-hover/row:bg-[#f8f9fa]"
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
            {renderHireEligibilityCell()}
            {renderIdCell(idx + 1)}
            {columns.map((col: any, cIdx: number) => {
                const colKey = getColumnKey(col);
                const columnHighlight = columnHighlights ? columnHighlights[colKey] : undefined;
                const customOptions = customColumnMeta[activeTabKey]?.[colKey]?.options || col.options;
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
                    />
                );
            })}
            {isEditing && (
                <td
                    className="border-b border-r border-[#edebe9] bg-[#f8f9fa] w-[120px] min-w-[120px] max-w-[120px]"
                />
            )}
        </tr>
    );
}, (prev, next) => {
    return prev.app === next.app &&
        prev.isEditing === next.isEditing &&
        prev.setIsEditing === next.setIsEditing &&
        prev.isRowActive === next.isRowActive &&
        prev.isSelected === next.isSelected &&
        prev.isSelectMode === next.isSelectMode &&
        prev.rowLocalChanges === next.rowLocalChanges &&
        prev.focusPath === next.focusPath &&
        prev.isChecklistOpen === next.isChecklistOpen &&
        prev.columns === next.columns &&
        prev.onPromoteToHired === next.onPromoteToHired &&
        prev.promotingId === next.promotingId &&
        prev.activeHireChecklistAppId === next.activeHireChecklistAppId &&
        prev.setActiveHireChecklistAppId === next.setActiveHireChecklistAppId &&
        prev.columnHighlights === next.columnHighlights &&
        prev.onShowHistory === next.onShowHistory &&
        prev.customColumnMeta === next.customColumnMeta &&
        JSON.stringify(prev.eligibilitySettings) === JSON.stringify(next.eligibilitySettings);
});
