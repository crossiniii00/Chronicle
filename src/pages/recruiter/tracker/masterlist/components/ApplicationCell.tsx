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
    customOptions
}: any) => {
    const isCellActive = isRowActive && focusPath?.colKey === ((col as any).subField ? `${col.field}.${(col as any).subField}` : col.field);
    const isStickyLeft = false;
    const isHighlight = col.label?.toUpperCase().includes('INITIAL');
    const isRemarks = col.label?.toUpperCase().includes('REMARKS') || col.label?.toUpperCase().includes('REASON');

    return (
        <td
            id={col.field ? `cell-${app.id}-${col.field}${col.subField ? '.' + col.subField : ''}` : undefined}
            className={cn(
                "border-b border-r border-[#edebe9] relative overflow-hidden bg-white group-hover/row:bg-[#f8f9fa]",
                !isCellActive ? "px-3 py-0" : "p-0",
                isStickyLeft && "sticky left-0 z-10 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)]",
                isCellActive && "ring-2 ring-inset ring-primary-600 border-primary-600 z-20 bg-white shadow-premium"
            )}
            style={{
                width: col.width,
                minWidth: col.width,
                maxWidth: col.width,
                contain: 'layout paint',
                backgroundColor: columnHighlight
                    ? columnHighlight
                    : isRemarks ? '#fffafd' : isHighlight ? '#fffef2' : undefined,
                borderLeft: isHighlight ? '1px solid #f3e6a8' : isRemarks ? '1px solid #f0dff2' : undefined,
                borderRight: isHighlight ? '1px solid #f3e6a8' : isRemarks ? '1px solid #f0dff2' : undefined,
            }}
        >
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
                                    onDoubleClick={(e) => {
                                        if (isEditing) {
                                            e.stopPropagation();
                                            (document.activeElement as HTMLElement)?.blur();
                                            setIsEditing?.(false);
                                        }
                                    }}
                                    className="w-full h-full"
                                >
                                    <EditableCell
                                        appId={app.id}
                                        appValues={app}
                                        field={col.field as any}
                                        subField={(col as any).subField}
                                        localChanges={rowLocalChanges}
                                        onEdit={onEdit}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        isActive={isCellActive}
                                        onPaint={() => setFocusPath?.({ appId: app.id, colKey: (col as any).subField ? `${col.field}.${(col as any).subField}` : col.field })}
                                        onShowHistory={((col.field === 'ops_validator_email' || col.field === 'ops_validator_status' || col.field === 'ops_validator_notes' || col.subField === 'ops_validator_email' || col.subField === 'ops_validator_status' || col.subField === 'ops_validator_notes' || (col.field === 'pis' && (col.subField?.includes('ops_val') || col.subField?.includes('ops_validator')))) && onShowHistory) ? () => onShowHistory(app) : undefined}
                                        className={cn(
                                            "!min-h-[36px] !px-0 text-[12px] leading-none font-semibold",
                                            col.field === 'current_status' ? "text-[#d13438]" : "text-[#323130]"
                                        )}
                                        options={customOptions}
                                    />
                                </div>
                            )}
                            {(col.field === 'master_first_name' || col.field === 'applicant_name') && !isEditing && (
                                <div className="flex items-center gap-1">
                                    <MedicalIndicator application={app} size="xs" />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onViewProfile?.(app); }}
                                        className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-[#0078d4] rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9] cursor-pointer"
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
                                        className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-[#107c10] rounded-none hover:bg-[#e1dfdd] shadow-sm shrink-0 border border-[#edebe9] cursor-pointer"
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
                                            className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-purple-600 rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9] cursor-pointer"
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
        prevDisplay === nextDisplay;
});
