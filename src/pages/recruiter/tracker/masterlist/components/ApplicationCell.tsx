import React from 'react';
import { Mail, User, Clipboard, History } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { EditableCell } from '@/components/features/ApplicantManagement/EditableCell';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import { ColumnChecklistCell } from './ColumnChecklistCell';
import { getMasterlistCellValue } from './tableHelpers';

export const ApplicationCell = React.memo(({
    app, col, idx, rowIdx, isEditing, setIsEditing, isRowActive, rowLocalChanges, onEdit, isSelected, isSelectMode, showSelectionColumn,
    onViewProfile, onShowNotes, onShowHistory, setSchedPrompt, handleDirectSend, focusPath, setFocusPath, columnHighlight,
    customOptions, optionColors, isSticky, leftOffset, isStickyRight, rightOffset, isLastFrozen,
    selectionBounds, copiedBounds, dragAnchor, onCellMouseDown, onCellMouseEnter, onCellMouseUp, duplicateGovIdsMap
}: any) => {
    const isCellActive = isRowActive && focusPath?.colKey === ((col as any).subField ? `${col.field}.${(col as any).subField}` : col.field);
    const isHighlight = col.label?.toUpperCase().includes('INITIAL');
    const isRemarks = col.label?.toUpperCase().includes('REMARKS') || col.label?.toUpperCase().includes('REASON');

    const inSelection = selectionBounds && rowIdx >= selectionBounds.startRow && rowIdx <= selectionBounds.endRow && idx >= selectionBounds.startCol && idx <= selectionBounds.endCol;
    const isSelectionTop = inSelection && rowIdx === selectionBounds.startRow;
    const isSelectionBottom = inSelection && rowIdx === selectionBounds.endRow;
    const isSelectionLeft = inSelection && idx === selectionBounds.startCol;
    const isSelectionRight = inSelection && idx === selectionBounds.endCol;
    const isAnchorCell = dragAnchor && dragAnchor.row === rowIdx && dragAnchor.col === idx;

    const inCopied = copiedBounds && rowIdx >= copiedBounds.startRow && rowIdx <= copiedBounds.endRow && idx >= copiedBounds.startCol && idx <= copiedBounds.endCol;
    const isCopiedTop = inCopied && rowIdx === copiedBounds.startRow;
    const isCopiedBottom = inCopied && rowIdx === copiedBounds.endRow;
    const isCopiedLeft = inCopied && idx === copiedBounds.startCol;
    const isCopiedRight = inCopied && idx === copiedBounds.endCol;

    const bgShadows = [];
    if (isSelectionTop) bgShadows.push('inset 0 2px 0 0 #217346');
    if (isSelectionBottom) bgShadows.push('inset 0 -2px 0 0 #217346');
    if (isSelectionLeft) bgShadows.push('inset 2px 0 0 0 #217346');
    if (isSelectionRight) bgShadows.push('inset -2px 0 0 0 #217346');

    return (
        <td
            id={col.field ? `cell-${app.id}-${col.field}${col.subField ? '.' + col.subField : ''}` : undefined}
            onMouseDown={(e) => onCellMouseDown?.(e, rowIdx, idx, app.id)}
            onMouseEnter={() => onCellMouseEnter?.(rowIdx, idx)}
            onMouseUp={() => onCellMouseUp?.()}
            className={cn(
                "border-slate-100 overflow-hidden group-hover/row:bg-[#f8f9fa]",
                !isCellActive ? "px-3 py-0" : "p-0",
                isSticky ? "sticky z-[11] frozen-column-glow" : isStickyRight ? "sticky z-[11] frozen-right-column-glow" : "relative",
                isCellActive && "ring-2 ring-inset ring-primary-600 border-primary-600 z-[12] bg-white dark:bg-slate-900 shadow-premium",
                (inSelection && !isAnchorCell) ? "bg-[#e6f2eb] transition-colors" : (columnHighlight ? "" : "bg-white dark:bg-slate-900"),
                !inSelection && "border-b border-r border-slate-100",
                (inSelection && !isSelectionBottom) && "border-b border-[#c0dccb]",
                (inSelection && isSelectionRight) && "border-r border-[#0078d4]",
                (inSelection && !isSelectionRight) && "border-r border-slate-100 border-[#c0dccb]",
                inSelection && (isSticky || isStickyRight) && "z-[13]",
                columnHighlight && "col-highlight-cell"
            )}
            style={{
                width: col.width,
                minWidth: col.width,
                maxWidth: col.width,
                '--col-bg': columnHighlight || undefined,
                backgroundColor: columnHighlight
                    ? columnHighlight
                    : isRemarks ? '#fffafd' : isHighlight ? '#fffef2' : undefined,
                left: isSticky ? leftOffset : undefined,
                right: isStickyRight ? rightOffset : undefined,
                boxShadow: bgShadows.length > 0 ? bgShadows.join(', ') : undefined
            } as any}
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
            <div className={cn("h-full w-full", isSelectMode && "pointer-events-none select-none")}>
                <span className="block truncate">
                    {col.field === 'actions' || col.field === 'email_actions' ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    handleDirectSend(app, 'OFFER');
                                }}
                                className={cn(
                                    "px-2 py-1 text-white text-[8px] font-bold uppercase rounded-none transition-all shadow-sm flex items-center gap-1 cursor-pointer",
                                    (app.master_status && app.master_status.toUpperCase().includes('OFFER SENT')) ? "bg-surface-400 opacity-60" : "bg-[#6B21A8] hover:bg-black"
                                )}
                            >
                                <Mail size={10} /> BGC
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    handleDirectSend(app, 'RCBC');
                                }}
                                className={cn(
                                    "px-2 py-1 text-white text-[8px] font-bold uppercase rounded-none transition-all shadow-sm flex items-center gap-1 cursor-pointer",
                                    (app.master_rcbc_status && app.master_rcbc_status !== '---') ? "bg-surface-400 opacity-60" : "bg-[#0078d4] hover:bg-black"
                                )}
                            >
                                <Mail size={10} /> RCBC
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    handleDirectSend(app, 'NEO');
                                }}
                                className={cn(
                                    "px-2 py-1 text-white text-[8px] font-bold uppercase rounded-none transition-all shadow-sm flex items-center gap-1 cursor-pointer",
                                    (app.master_neo_date && app.master_neo_date !== '---') ? "bg-surface-400 opacity-60" : "bg-[#2E7D32] hover:bg-black"
                                )}
                            >
                                <Mail size={10} /> NEO
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setSchedPrompt({ app, type: 'PEME' });
                                }}
                                className={cn(
                                    "px-2 py-1 text-white text-[8px] font-bold uppercase rounded-none transition-all shadow-sm flex items-center gap-1 cursor-pointer",
                                    (app.master_peme_status && app.master_peme_status !== '---' && !app.master_peme_status.toUpperCase().includes('PENDING')) ? "bg-surface-400 opacity-60" : "bg-[#C62828] hover:bg-black"
                                )}
                            >
                                <Mail size={10} /> PEME
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/pis h-full w-full">
                            {col.type === 'checklist' ? (
                                <ColumnChecklistCell
                                    app={app}
                                    col={col}
                                    rowLocalChanges={rowLocalChanges}
                                />
                            ) : (
                                <div
                                    className="w-full h-full"
                                >
                                    <EditableCell
                                        appId={app.id}
                                        appValues={app}
                                        field={col.field as any}
                                        subField={(col as any).subField}
                                        options={customOptions}
                                        optionColors={optionColors}
                                        localChanges={rowLocalChanges}
                                        onEdit={onEdit}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        isActive={isCellActive}
                                        duplicateGovIdsMap={duplicateGovIdsMap}
                                        onPaint={() => setFocusPath?.({ appId: app.id, colKey: (col as any).subField ? `${col.field}.${(col as any).subField}` : col.field })}
                                        onShowHistory={((col.field === 'ops_validator_email' || col.field === 'ops_validator_status' || col.field === 'ops_validator_notes' || col.subField === 'ops_validator_email' || col.subField === 'ops_validator_status' || col.subField === 'ops_validator_notes' || (col.field === 'pis' && (col.subField?.includes('ops_val') || col.subField?.includes('ops_validator')))) && onShowHistory) ? () => onShowHistory(app) : undefined}
                                        className={cn(
                                            "!min-h-[36px] !px-0 text-[12px] leading-none font-semibold",
                                            col.field === 'current_status' ? "text-[#d13438]" : "text-[#323130] dark:text-slate-300"
                                        )}
                                    />
                                </div>
                            )}
                            {(col.field === 'master_first_name' || col.field === 'applicant_name') && !isEditing && (
                                <div className="flex items-center gap-1">
                                    <MedicalIndicator application={app} size="xs" />
                                    {app.metadata?.reapplication_passed && (
                                        <div 
                                            className="w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse shrink-0 cursor-help"
                                            title="Candidate has submitted a typing test retake"
                                        >
                                            !
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onViewProfile?.(app); }}
                                        className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-[#0078d4] rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9] dark:border-slate-800 cursor-pointer"
                                        title="View Full PIS Profile"
                                    >
                                        <User size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            onShowNotes?.(app, rect);
                                        }}
                                        className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-[#107c10] rounded-none hover:bg-[#e1dfdd] shadow-sm shrink-0 border border-[#edebe9] dark:border-slate-800 cursor-pointer"
                                        title="View Notes"
                                    >
                                        <Clipboard size={12} />
                                    </button>
                                    {!!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0)) && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onShowHistory?.(app);
                                            }}
                                            className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-purple-600 rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9] dark:border-slate-800 cursor-pointer"
                                            title="View Reprofile History"
                                        >
                                            <History size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </span>
            </div>
        </td>
    );
}, (prev, next) => {
    const prevCellActive = prev.isRowActive && prev.focusPath?.colKey === ((prev.col as any).subField ? `${prev.col.field}.${(prev.col as any).subField}` : prev.col.field);
    const nextCellActive = next.isRowActive && next.focusPath?.colKey === ((next.col as any).subField ? `${next.col.field}.${(next.col as any).subField}` : next.col.field);

    const prevDisplay = getMasterlistCellValue(prev.app, prev.col, prev.rowLocalChanges);
    const nextDisplay = getMasterlistCellValue(next.app, next.col, next.rowLocalChanges);

    const prevInBounds = prev.selectionBounds && prev.rowIdx >= prev.selectionBounds.startRow && prev.rowIdx <= prev.selectionBounds.endRow && prev.idx >= prev.selectionBounds.startCol && prev.idx <= prev.selectionBounds.endCol;
    const nextInBounds = next.selectionBounds && next.rowIdx >= next.selectionBounds.startRow && next.rowIdx <= next.selectionBounds.endRow && next.idx >= next.selectionBounds.startCol && next.idx <= next.selectionBounds.endCol;
    const boundsAffectCell = (prev.selectionBounds !== next.selectionBounds) && (prevInBounds || nextInBounds);

    const prevInCopied = prev.copiedBounds && prev.rowIdx >= prev.copiedBounds.startRow && prev.rowIdx <= prev.copiedBounds.endRow && prev.idx >= prev.copiedBounds.startCol && prev.idx <= prev.copiedBounds.endCol;
    const nextInCopied = next.copiedBounds && next.rowIdx >= next.copiedBounds.startRow && next.rowIdx <= next.copiedBounds.endRow && next.idx >= next.copiedBounds.startCol && next.idx <= next.copiedBounds.endCol;
    const copiedBoundsAffectCell = (prev.copiedBounds !== next.copiedBounds) && (prevInCopied || nextInCopied);

    return prev.isEditing === next.isEditing &&
        prev.setIsEditing === next.setIsEditing &&
        prev.isRowActive === next.isRowActive &&
        prevCellActive === nextCellActive &&
        prev.isSelected === next.isSelected &&
        prev.isSelectMode === next.isSelectMode &&
        prev.app === next.app &&
        prev.app.id === next.app.id &&
        prev.columnHighlight === next.columnHighlight &&
        prev.onShowHistory === next.onShowHistory &&
        prev.isSticky === next.isSticky &&
        prev.leftOffset === next.leftOffset &&
        prev.isStickyRight === next.isStickyRight &&
        prev.rightOffset === next.rightOffset &&
        prev.isLastFrozen === next.isLastFrozen &&
        prev.dragAnchor === next.dragAnchor &&
        !boundsAffectCell &&
        !copiedBoundsAffectCell &&
        prevDisplay === nextDisplay;
});
