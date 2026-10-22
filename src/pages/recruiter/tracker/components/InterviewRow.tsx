import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, CheckCircle, CheckCircle2, Loader2, X, Briefcase, 
    ChevronRight, Square, CheckSquare, ListTodo, User, History as HistoryIcon, Clipboard, FileText
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { 
    SHEET_COLUMNS, PIVOT_COLUMNS, VLIST_COLUMNS, SUPPORT_HIRING_COLUMNS 
} from '../constants';
import { PositionService } from '@/services/PositionService';
import { ApplicationService } from '@/services/ApplicationService';
import * as helpers from '../utils/tableHelpers';
import { normalizeOverallStatus } from '../utils/statusMappings';
import { useAuthStore } from '@/store/authStore';
import { CandidateIdentityCell, EditableCell } from './InterviewTableUI';
import { 
    computeHireEligibility, buildMissingTooltip, getColumnWidth
} from './tableUtils';

const rowMissingCache = new Map<string, boolean>();

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

export interface InterviewRowProps {
    app: Application;
    rowIndex: number;
    activeTab: string;
    isEditing: boolean;
    localChanges: Record<string, string>;
    remoteChanges: Record<string, string>;
    handleInputChange: (appId: string, qId: string, value: string) => void;
    isSelectMode: boolean;
    isSelected: boolean;
    toggleSelect: (id: string) => void;
    setDeletingId: (id: string | null) => void;
    setFocusedApplicant: (app: Application) => void;
    setShowFullscreen: (val: boolean) => void;
    activeQuestions: InterviewQuestion[];
    questions: InterviewQuestion[];
    onShowNotes: (app: Application, rect: DOMRect) => void;
    isFocused: boolean;
    focusedColKey: string | null;
    focusedColName: string | null;
    setFocusPath: (path: { appId: string, colKey: string, colName: string } | null) => void;
    search?: string;
    updateActivity: (activity: any) => void;
    accounts?: string[];
    onShowHistory?: (app: Application) => void;
    onViewProfile?: (app: Application) => void;
    onShowProcedure?: (app: Application) => void;
    showEssentialOnly?: boolean;
    hiddenColumns?: Record<string, string[]>;
    userFocus?: Record<string, any>;
    activeUsers: any[];
    onPromoteToHired?: (app: Application, complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT', positionId?: string) => Promise<void> | void;
    promotingId?: string | null;
    activeHireChecklistAppId?: string | null;
    setActiveHireChecklistAppId: (id: string | null) => void;
    onRowMouseDown: (id: string) => void;
    onRowMouseEnter: (id: string) => void;
    isChecklistOpen: boolean;
    onToggleChecklist: (appId: string, open: boolean) => void;
    highlightedColumns: Record<string, string>;
    highlightedCells: Record<string, string>;
    onCellPaint: (e: React.MouseEvent, app: Application, colName: string, colKey: string) => void;
    eligibilitySettings?: { required: string[]; optional: string[] };
    customColumns?: Record<string, string[]>;
    customColumnMeta?: Record<string, Record<string, { options?: string[] }>>;
    setIsEditing?: (val: boolean) => void;
    frozenKeys?: string[];
    frozenRightKeys?: string[];
    columnLeftOffsets?: Record<string, number>;
    columnRightOffsets?: Record<string, number>;
    selectionBounds?: { startRow: number, endRow: number, startCol: number, endCol: number } | null;
    copiedBounds?: { startRow: number, endRow: number, startCol: number, endCol: number } | null;
    dragAnchor?: { row: number, col: number, appId: string } | null;
    onCellMouseDown?: (e: React.MouseEvent, rowIdx: number, colIdx: number, appId: string) => void;
    onCellMouseEnter?: (rowIdx: number, colIdx: number) => void;
    onCellMouseUp?: () => void;
}

export const InterviewRow = React.memo(({
    app, rowIndex, activeTab, isEditing, localChanges, remoteChanges, handleInputChange,
    isSelectMode, isSelected, toggleSelect, setDeletingId,
    setFocusedApplicant, setShowFullscreen, activeQuestions, questions,
    onShowNotes, isFocused, focusedColKey, focusedColName, setFocusPath,
    search = '',
    updateActivity,
    accounts,
    onShowHistory,
    onViewProfile,
    onShowProcedure,
    showEssentialOnly,
    hiddenColumns,
    userFocus = {},
    activeUsers,
    onPromoteToHired,
    promotingId,
    activeHireChecklistAppId,
    setActiveHireChecklistAppId,
    onRowMouseDown,
    onRowMouseEnter,
    isChecklistOpen,
    onToggleChecklist,
    highlightedColumns,
    highlightedCells,
    onCellPaint,
    eligibilitySettings,
    customColumns = {},
    customColumnMeta = {},
    setIsEditing,
    frozenKeys = [],
    frozenRightKeys = [],
    columnLeftOffsets = {},
    columnRightOffsets = {},
    selectionBounds,
    copiedBounds,
    dragAnchor,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp
}: InterviewRowProps) => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const selectionProps = React.useMemo(() => ({
        rowIdx: rowIndex,
        selectionBounds,
        copiedBounds,
        dragAnchor,
        onCellMouseDown,
        onCellMouseEnter,
        onCellMouseUp
    }), [rowIndex, selectionBounds, copiedBounds, dragAnchor, onCellMouseDown, onCellMouseEnter, onCellMouseUp]);
    const warningTriggerRef = React.useRef<HTMLButtonElement | null>(null);
    const [warningPopoverPos, setWarningPopoverPos] = React.useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const [popoverPos, setPopoverPos] = React.useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

    const isHireChecklistOpen = activeHireChecklistAppId === app.id;

    const [openings, setOpenings] = React.useState<any[]>([]);
    const [selectedOpeningId, setSelectedOpeningId] = React.useState<string>('');

    React.useEffect(() => {
        if (!isHireChecklistOpen) return;
        PositionService.getAllOpen().then(list => {
            const rawDepts = app.pis?.final_account || app.endorsement_account || app.department || '';
            const candidateDepts = rawDepts.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
            const matched = list.filter((pos: any) => {
                const posDept = (pos.department || '').trim().toLowerCase();
                if (!posDept) return false;
                return candidateDepts.some(cd => posDept === cd || posDept.includes(cd) || cd.includes(posDept));
            });
            setOpenings(matched);
            if (matched.length > 0) {
                setSelectedOpeningId(matched[0].id);
            } else {
                setSelectedOpeningId('');
            }
        }).catch(err => console.error("Failed to load positions:", err));
    }, [isHireChecklistOpen, app.pis?.final_account, app.endorsement_account, app.department]);

    const closeChecklist = React.useCallback(() => {
        setActiveHireChecklistAppId(null);
        setPopoverPos(null);
    }, [setActiveHireChecklistAppId]);

    React.useEffect(() => {
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

    const updateWarningPopoverPos = React.useCallback(() => {
        const rect = warningTriggerRef.current?.getBoundingClientRect();
        if (rect) {
            const popoverWidth = 288;
            const margin = 8;
            const viewportW = window.innerWidth;
            let left = rect.left + rect.width / 2 - popoverWidth / 2;
            left = Math.max(margin, Math.min(left, viewportW - popoverWidth - margin));
            const estimatedHeight = 288;
            const viewportH = window.innerHeight;
            const placeDown = rect.bottom + estimatedHeight + margin < viewportH;
            const top = placeDown ? rect.bottom + 6 : Math.max(margin, rect.top - estimatedHeight - 6);
            setWarningPopoverPos({ left, top, placement: placeDown ? 'down' : 'up' });
        }
    }, []);

    React.useEffect(() => {
        if (!isChecklistOpen) {
            setWarningPopoverPos(null);
            return;
        }
        updateWarningPopoverPos();
        window.addEventListener('scroll', updateWarningPopoverPos, true);
        window.addEventListener('resize', updateWarningPopoverPos);
        return () => {
            window.removeEventListener('scroll', updateWarningPopoverPos, true);
            window.removeEventListener('resize', updateWarningPopoverPos);
        };
    }, [isChecklistOpen, updateWarningPopoverPos]);

    const getEffectiveColumns = React.useCallback((tab: string): string[] => {
        const norm = tab.toUpperCase();
        let defaultCols: string[];
        if (norm.includes('BILINGUALS')) {
            defaultCols = ["#", "Candidate's Name", "Position", "Preferred Set-up", "Willing to Relocate", "Salary", "Status", "Notes"];
        } else if (norm.includes('TEAM_LEADER')) {
            defaultCols = ["#", "Name", "Position", "Background and Experience", "Tenure as TL", "Total BPO Exp", "Salary Expectation", "Source", "Status"];
        } else if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            defaultCols = [...SHEET_COLUMNS].filter(col => !(['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm) && col === "Hire Eligibility"));
        } else {
            return [];
        }
        let effective = (customColumns[tab] || defaultCols).map(c => {
            if (c.toUpperCase() === 'JOB POSTING') return 'Preferred Name';
            return c;
        });
        // Remove duplicates in case they had both
        effective = Array.from(new Set(effective));

        if (customColumns[tab]) {
            defaultCols.forEach(d => {
                if (!effective.includes(d)) {
                    effective = [...effective, d];
                }
            });

            // Force auto-reorder Job Posting after First Name
            const jobIdx = effective.findIndex(c => c === 'Job Posting');
            if (jobIdx !== -1) {
                const newEff = [...effective];
                const jobCol = newEff.splice(jobIdx, 1)[0];
                const firstIdx = newEff.findIndex(c => c === 'First Name');
                if (firstIdx !== -1) {
                    newEff.splice(firstIdx + 1, 0, jobCol);
                } else {
                    newEff.push(jobCol);
                }
                effective = newEff;
            }
        }
        
        if ((hiddenColumns?.[tab] || []).length > 0) {
            effective = effective.filter(col => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                return !(hiddenColumns![tab] || []).includes(colKey);
            });
        }
        
        if (showEssentialOnly && norm.includes('SHEET')) {
            const ess = ['Id', 'Preferred Name', 'Job Posting', 'Date of Birth', 'Contact Number', 'Email Address', 'Current Address', 'Overall Status', 'Timestamp'];
            effective = effective.filter(e => ess.includes(e));
        } else if (showEssentialOnly) {
            const essentialNames = ["#", "Id", "First Name", "Middle Name", "Last Name", "Date of Birth"];
            effective = effective.filter(c => essentialNames.some(name => c.toLowerCase() === name.toLowerCase()));
        }

        return effective;
    }, [customColumns, showEssentialOnly, hiddenColumns, questions]);

    const getCellHighlightStyle = (colKey: string) => {
        const cellKey = `${app.id}:${colKey}`;
        const color = highlightedCells[cellKey] || highlightedColumns[colKey];
        if (color) {
            return { backgroundColor: color };
        }
        return {};
    };

    const terms = search.toLowerCase().split('|').map(t => t.trim()).filter(t => t.length >= 2);
    const hasSearch = terms.length > 0;
    const rowLocalChanges = localChanges as Record<string, any>;
    const reprofileHistory = app.pis?.reprofile_history || app.metadata?.reprofile_history || [];
    const isReprofiled = Boolean(
        rowLocalChanges.pis_reprofile_history?.length ||
        rowLocalChanges.metadata?.is_reprofiled ||
        rowLocalChanges.is_reprofiled ||
        reprofileHistory.length ||
        app.metadata?.is_reprofiled
    );
    const hasMissingFields = React.useMemo(() => {
        const cacheKey = `${app.id}|${Object.keys(localChanges).length}|${Object.keys(remoteChanges).length}|${activeTab}|${search}`;
        if (rowMissingCache.has(cacheKey)) {
            return rowMissingCache.get(cacheKey)!;
        }

        const compute = () => {
            const norm = activeTab.toUpperCase();
            if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
                const columns = getEffectiveColumns(activeTab);
                const matchesAnyCol = columns.some(c => terms.some(t => c.toLowerCase().includes(t)));
                return columns.some((col) => {
                    if (col === "Id" || col === "Start time" || col === "Completion time" || col === "Last Processed/Updated By:") return false;
                    if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return false;
                    const isCustom = col.startsWith('custom:');
                    const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                    const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getSheetCellValue(app, col, rowIndex, questions));
                    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                    return val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                });
            }
            if (norm.includes('BILINGUALS')) {
                const columns = getEffectiveColumns(activeTab);
                return columns.some((col) => {
                    if (col === "#" || col === "Notes") return false;
                    const isCustom = col.startsWith('custom:');
                    const colKey = isCustom ? col : helpers.getBilingualsColumnKey(col);
                    const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getBilingualsCellValue(app, col, rowIndex));
                    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                    return val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                });
            }
            if (norm.includes('TEAM_LEADER')) {
                const columns = getEffectiveColumns(activeTab);
                return columns.some((col) => {
                    if (col === "#") return false;
                    const isCustom = col.startsWith('custom:');
                    const colKey = isCustom ? col : helpers.getTeamLeaderColumnKey(col);
                    const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getTeamLeaderCellValue(app, col, rowIndex));
                    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                    return val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                });
            }
            return false;
        };

        const result = compute();
        rowMissingCache.set(cacheKey, result);
        return result;
    }, [activeTab, app.id, rowIndex, questions, localChanges, remoteChanges, hasSearch, terms, getEffectiveColumns]);

    const columnsChecklist = React.useMemo(() => {
        if (!isChecklistOpen) return [];
        const norm = activeTab.toUpperCase();
        if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            const columns = getEffectiveColumns(activeTab);
            const matchesAnyCol = columns.some(c => terms.some(t => c.toLowerCase().includes(t)));
            return columns.map((col) => {
                if (col === "Id") return null;
                if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getSheetCellValue(app, col, rowIndex, questions));
                const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                const isMissing = val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                return {
                    name: isCustom ? col.substring(7) : col,
                    key: colKey,
                    isMissing,
                };
            }).filter(Boolean) as { name: string; key: string; isMissing: boolean }[];
        }
        if (norm.includes('BILINGUALS')) {
            const columns = getEffectiveColumns(activeTab);
            return columns.map((col) => {
                if (col === "#") return null;
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getBilingualsColumnKey(col);
                const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getBilingualsCellValue(app, col, rowIndex));
                const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                const isMissing = val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                return {
                    name: isCustom ? col.substring(7) : col,
                    key: colKey,
                    isMissing,
                };
            }).filter(Boolean) as { name: string; key: string; isMissing: boolean }[];
        }
        if (norm.includes('TEAM_LEADER')) {
            const columns = getEffectiveColumns(activeTab);
            return columns.map((col) => {
                if (col === "#") return null;
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getTeamLeaderColumnKey(col);
                const rawVal = localChanges[colKey] ?? remoteChanges[colKey] ?? (isCustom ? ((app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '') : helpers.getTeamLeaderCellValue(app, col, rowIndex));
                const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                const isMissing = val === '' || val === null || val === undefined || val === '---' || val === 'null' || val === 'undefined';
                return {
                    name: isCustom ? col.substring(7) : col,
                    key: colKey,
                    isMissing,
                };
            }).filter(Boolean) as { name: string; key: string; isMissing: boolean }[];
        }
        return [];
    }, [activeTab, app, rowIndex, questions, localChanges, remoteChanges, hasSearch, terms, isChecklistOpen, getEffectiveColumns]);

    const renderIdCell = (colName: string, value: string, colKey: string, idx: number, width: number, left: number, isFrozen: boolean) => {
        const hasHistory = !!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0));
        
        const effectiveIsFrozen = colName === "#" ? true : isFrozen;
        const effectiveLeft = colName === "#" 
            ? (frozenKeys.includes(colKey) ? left : (isSelectMode ? 50 : 0)) 
            : left;

        return (
            <td
                key={`id-cell-${colKey}`}
                className={cn(
                    "transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900", "border-b border-r border-surface-200 p-0 align-middle text-center overflow-hidden",
                    isReprofiled ? "bg-yellow-50" : "bg-white dark:bg-slate-900",
                    effectiveIsFrozen && "sticky z-20 frozen-column-glow bg-white dark:bg-slate-900"
                )}
                style={{
                    width,
                    minWidth: width,
                    maxWidth: width,
                    left: effectiveIsFrozen ? effectiveLeft : undefined,
                }}
            >
                <div className="px-2 py-2 flex items-center justify-between gap-1.5 relative h-full">
                    <div className="flex items-center gap-1.5 pl-1">
                        <span className="text-surface-700 font-semibold text-xs">{value}</span>
                        <button
                            ref={warningTriggerRef}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleChecklist(app.id, !isChecklistOpen);
                            }}
                            className={cn(
                                "p-0.5 rounded-sm transition-colors shrink-0 flex items-center justify-center",
                                hasMissingFields ? "hover:bg-purple-100" : "hover:bg-emerald-100"
                            )}
                            title={hasMissingFields ? "Incomplete" : "Complete"}
                        >
                            {hasMissingFields ? (
                                <AlertTriangle size={13} className="text-purple-600 stroke-[2.5]" />
                            ) : (
                                <CheckCircle size={13} className="text-emerald-600 stroke-[2.5]" />
                            )}
                        </button>
                    </div>

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
                                onShowNotes(app, rect);
                            }}
                            className="h-5 w-5 bg-[#F0FDF4] text-[#16A34A] rounded hover:bg-[#DCFCE7] border border-[#16A34A]/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                            title="View Notes"
                        >
                            <Clipboard size={10} className="font-black" />
                        </button>
                        {hasHistory ? (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onShowHistory?.(app); }}
                                className="h-5 w-5 bg-[#FAF5FF] text-[#9333EA] rounded hover:bg-[#F3E8FF] border border-[#9333EA]/30 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                                title="View Reprofile History"
                            >
                                <HistoryIcon size={10} className="font-black" />
                            </button>
                        ) : (
                            <div className="w-5 h-5 shrink-0" />
                        )}
                    </div>

                    {isChecklistOpen && warningPopoverPos && createPortal(
                        <>
                            <div 
                                className="fixed inset-0 z-[2147483000]" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleChecklist(app.id, false);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.92, y: warningPopoverPos.placement === 'down' ? -4 : 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: warningPopoverPos.placement === 'down' ? -4 : 4 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.6 }}
                                style={{
                                    position: 'fixed',
                                    left: warningPopoverPos.left,
                                    top: warningPopoverPos.top,
                                    zIndex: 2147483647,
                                    width: 288
                                }}
                                className="bg-white dark:bg-slate-900 border border-surface-200 shadow-premium p-3 rounded-none text-left max-h-72 flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-200">
                                    <span className="text-[10px] font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1">
                                        <ListTodo size={12} className="text-primary-600" /> Columns Checklist
                                    </span>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleChecklist(app.id, false);
                                        }}
                                        className="text-surface-400 hover:text-surface-600 p-0.5"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 custom-scrollbar space-y-1.5 pr-1">
                                    {columnsChecklist.map((item) => (
                                        <div 
                                            key={item.key} 
                                            className="flex items-start gap-2 text-[11px] py-0.5 group/item cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFocusPath({ appId: app.id, colKey: item.key, colName: item.name });
                                                onToggleChecklist(app.id, false);
                                            }}
                                        >
                                            {item.isMissing ? (
                                                <Square size={13} className="text-purple-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <CheckSquare size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                            )}
                                            <span className={cn(
                                                "leading-tight transition-colors",
                                                item.isMissing ? "text-purple-700 font-medium group-hover/item:text-purple-800" : "text-surface-600 group-hover/item:text-surface-800"
                                            )}>
                                                {item.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </>,
                        document.body
                    )}
                </div>
            </td>
        );
    };

    const isColumnEditable = (tab: string, column: string) => {
        if (!isEditing) return false;
        const immutableFields = ["Id", "Start time", "Completion time", "#"];
        return !immutableFields.includes(column);
    };

    const getCellPresence = (colKey: string) => {
        const hovers = (activeUsers || [])
            .filter((u: any) => u.activity?.type === 'hover' && u.activity?.targetId === `${app.id}:${colKey}`)
            .map((u: any) => u.full_name)
            .filter(Boolean);

        const edits = (activeUsers || [])
            .filter((u: any) => (u.activity?.type === 'focus' || u.activity?.type === 'edit') && u.activity?.targetId === `${app.id}:${colKey}`)
            .map((u: any) => u.full_name)
            .filter(Boolean);

        Object.values(userFocus).forEach((focus: any) => {
            if (focus.appId === app.id && focus.field === colKey && focus.fullName) {
                if (!edits.includes(focus.fullName)) {
                    edits.push(focus.fullName);
                }
            }
        });

        return { hovers, edits };
    };

    const handleCellHover = (colKey: string) => {};

    const handleCellLeave = () => {};

    const renderCells = () => {
        const norm = activeTab.toUpperCase();
        let cells: any[] = [];
        if (norm.includes('BILINGUALS')) {
            const columns = getEffectiveColumns(activeTab);

            cells = columns.map((col, idx) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getBilingualsColumnKey(col);
                
                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getBilingualsCellValue(app, col, rowIndex);
                }

                const isFrozen = frozenKeys.includes(colKey);
                const isFrozenRight = frozenRightKeys.includes(colKey);

                if (col === "#") {
                    return renderIdCell(col, value, colKey, idx, 90, columnLeftOffsets[colKey] || 0, isFrozen);
                }

                return (
                    <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                        key={idx}
                        width={isCustom ? 140 : 240}
                        id={`cell-${app.id}-${colKey}`}
                        className={cn(
                            "text-left",
                            !localChanges[colKey] && !!remoteChanges[colKey] && "italic text-primary-600 bg-primary-50/5",
                            isFrozen && "sticky z-20 frozen-column-glow bg-white dark:bg-slate-900",
                            isFrozenRight && "sticky z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900"
                        )}
                        style={{
                            left: isFrozen ? columnLeftOffsets[colKey] : undefined,
                            right: isFrozenRight ? columnRightOffsets[colKey] : undefined,
                            ...getCellHighlightStyle(colKey)
                        } as any}
                        value={localChanges[colKey] ?? remoteChanges[colKey] ?? value}
                        isEditing={isEditing}
                        options={customOpts}
                        isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                        onPaint={(e) => onCellPaint(e, app, col, colKey)}
                        onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                        onChange={(val) => {
                            handleInputChange(app.id, colKey, val);
                            updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                        }}
                        onHover={() => handleCellHover(colKey)}
                        onLeave={handleCellLeave}
                        presence={getCellPresence(colKey)}
                        colKey={colKey}
                        isStatus={colKey === 'current_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status'}
                        colIdx={idx}
                        {...selectionProps}
                    />
                );
            });
        } else if (norm.includes('TEAM_LEADER')) {
            const columns = getEffectiveColumns(activeTab);

            cells = columns.map((col, idx) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getTeamLeaderColumnKey(col);
                
                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getTeamLeaderCellValue(app, col, rowIndex);
                }

                const isFrozen = frozenKeys.includes(colKey);
                const isFrozenRight = frozenRightKeys.includes(colKey);

                if (col === "#") {
                    return renderIdCell(col, value, colKey, idx, getColumnWidth(col), columnLeftOffsets[colKey] || 0, isFrozen);
                }

                return (
                    <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                        key={idx}
                        width={getColumnWidth(col)}
                        id={`cell-${app.id}-${colKey}`}
                        className={cn(
                            "text-left",
                            !localChanges[colKey] && !!remoteChanges[colKey] && "italic text-primary-600 bg-primary-50/5",
                            isFrozen && "sticky z-20 frozen-column-glow bg-white dark:bg-slate-900",
                            isFrozenRight && "sticky z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900"
                        )}
                        style={{
                            left: isFrozen ? columnLeftOffsets[colKey] : undefined,
                            right: isFrozenRight ? columnRightOffsets[colKey] : undefined,
                            ...getCellHighlightStyle(colKey)
                        } as any}
                        value={localChanges[colKey] ?? remoteChanges[colKey] ?? value}
                        isEditing={isEditing}
                        options={customOpts}
                        isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                        onPaint={(e) => onCellPaint(e, app, col, colKey)}
                        onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                        onChange={(val) => {
                            handleInputChange(app.id, colKey, val);
                            updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                        }}
                        onHover={() => handleCellHover(colKey)}
                        onLeave={handleCellLeave}
                        presence={getCellPresence(colKey)}
                        colKey={colKey}
                        isStatus={colKey === 'current_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status'}
                        isAccount={colKey === 'master_wave'}
                        accounts={colKey === 'master_wave' ? accounts : undefined}
                        colIdx={idx}
                        {...selectionProps}
                    />
                );
            });
        } else if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            const columns = getEffectiveColumns(activeTab);
            const matchesAnyCol = columns.some(c => terms?.some(t => c.toLowerCase().includes(t)));
            
            cells = columns.map((col, idx) => {
                if (hasSearch && matchesAnyCol && !terms?.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                const isNameCol = col.toLowerCase().includes("name");

                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getSheetCellValue(app, col, rowIndex, questions);
                }

                const isFrozen = frozenKeys.includes(colKey);
                const isFrozenRight = frozenRightKeys.includes(colKey);

                if (col === "Id") {
                    return renderIdCell(col, value, colKey, idx, getColumnWidth(col), columnLeftOffsets[colKey] || 0, isFrozen);
                }


                if (isNameCol) {
                    const nameVal = localChanges[colKey] ?? remoteChanges[colKey] ?? value;
                    return (
                        <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                            key={`name-cell-${idx}`}
                            value={nameVal}
                            isEditing={true}
                            isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                            onPaint={(e) => onCellPaint(e, app, col, colKey)}
                            onStartEdit={() => setFocusPath?.({ appId: app.id, colKey, colName: col })}
                            style={{
                                left: isFrozen ? columnLeftOffsets[colKey] : undefined,
                                right: isFrozenRight ? columnRightOffsets[colKey] : undefined,
                                ...getCellHighlightStyle(colKey)
                            } as any}
                            onChange={(val) => {
                                handleInputChange(app.id, colKey, val);
                                updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                            }}
                            onHover={() => handleCellHover(colKey)}
                            onLeave={handleCellLeave}
                            presence={getCellPresence(colKey)}
                            colKey={colKey}
                            placeholder={`Enter ${col}...`}
                            width={getColumnWidth(col)}
                            className={cn(
                                isReprofiled ? "bg-yellow-50" : "bg-white dark:bg-slate-900",
                                isFrozen && "sticky z-20 frozen-column-glow bg-white dark:bg-slate-900",
                                isFrozenRight && "sticky z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900"
                            )}
                            colIdx={idx}
                            {...selectionProps}
                        />
                    );
                }

                return (
                    <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                        key={idx}
                        id={`cell-${app.id}-${colKey}`}
                        width={isCustom ? 140 : getColumnWidth(col)}
                        value={localChanges[colKey] ?? remoteChanges[colKey] ?? value}
                        isEditing={isEditing && isColumnEditable(activeTab, col)}
                        options={customOpts}
                        isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                        onPaint={(e) => onCellPaint(e, app, col, colKey)}
                        onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                        onChange={(val) => {
                            handleInputChange(app.id, colKey, val);
                            updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                        }}
                        onHover={() => handleCellHover(colKey)}
                        onLeave={handleCellLeave}
                        presence={getCellPresence(colKey)}
                        colKey={colKey}
                        isStatus={colKey === 'current_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status'}
                        isAccount={colKey === 'pis_initial_account_assignment' || colKey === 'master_wave' || colKey === 'pis_final_account'}
                        accounts={(colKey === 'pis_initial_account_assignment' || colKey === 'master_wave' || colKey === 'pis_final_account') ? accounts : undefined}
                        onShowHistory={((colKey === 'pis_initial_account_assignment' || colKey === 'pis_ops_validator_email' || colKey === 'pis_ops_validator_status' || colKey === 'pis_ops_validator_notes' || colKey === 'ops_validator_email' || colKey === 'ops_validator_status' || colKey === 'ops_validator_notes' || colKey.includes('ops_val')) && onShowHistory && !!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0))) ? () => onShowHistory(app) : undefined}
                        onClose={() => setFocusPath(null)}
                        className={cn(
                            isReprofiled ? "bg-yellow-50" : "bg-white dark:bg-slate-900",
                            isFrozen && "sticky z-20 frozen-column-glow bg-white dark:bg-slate-900",
                            isFrozenRight && "sticky z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] bg-white dark:bg-slate-900"
                        )}
                        style={{
                            left: isFrozen ? columnLeftOffsets[colKey] : undefined,
                            right: isFrozenRight ? columnRightOffsets[colKey] : undefined,
                            ...getCellHighlightStyle(colKey)
                        } as any}
                        colIdx={idx}
                        {...selectionProps}
                    />
                );
            }).filter(Boolean);
        } else {
            switch (norm) {
                case 'PIVOT': {
                    cells = PIVOT_COLUMNS.map((col, idx) => {
                        const colKey = helpers.getPivotColumnKey(col);
                        let val = localChanges[colKey] ?? remoteChanges[colKey] ?? helpers.getPivotCellValue(app, col);
                        if (colKey === 'pis_overall_status' || colKey === 'overall_status') {
                            val = normalizeOverallStatus(val);
                        }

                        return (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                key={idx}
                                value={val}
                                isEditing={isEditing && isColumnEditable(activeTab, col)}
                                isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                                onPaint={(e) => onCellPaint(e, app, col, colKey)}
                                onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                                style={getCellHighlightStyle(colKey)}
                                onChange={(val) => {
                                    handleInputChange(app.id, colKey, val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                                }}
                                onHover={() => handleCellHover(colKey)}
                                onLeave={handleCellLeave}
                                presence={getCellPresence(colKey)}
                                colKey={colKey}
                                isStatus={colKey === 'current_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status'}
                                colIdx={idx}
                                {...selectionProps}
                            />
                        );
                    }).filter(Boolean);
                    break;
                }
                case 'VLIST': {
                    cells = VLIST_COLUMNS.map((col, idx) => {
                        const colKey = helpers.getVlistColumnKey(col);
                        const isStatus = colKey === 'current_status' || colKey === 'ops_val_status' || colKey === 'client_interview_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status';
                        
                        let val = localChanges[colKey] ?? remoteChanges[colKey] ?? helpers.getVlistCellValue(app, col);
                        if (colKey === 'pis_overall_status' || colKey === 'overall_status') {
                            val = normalizeOverallStatus(val);
                        }

                        return (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                key={idx}
                                value={val}
                                isEditing={isEditing && isColumnEditable(activeTab, col)}
                                isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                                onPaint={(e) => onCellPaint(e, app, col, colKey)}
                                onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                                style={getCellHighlightStyle(colKey)}
                                onChange={(val) => {
                                    handleInputChange(app.id, colKey, val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                                }}
                                onHover={() => handleCellHover(colKey)}
                                onLeave={handleCellLeave}
                                presence={getCellPresence(colKey)}
                                colKey={colKey}
                                isStatus={isStatus}
                                isAccount={colKey === 'master_wave'}
                                accounts={colKey === 'master_wave' ? accounts : undefined}
                                colIdx={idx}
                                {...selectionProps}
                            />
                        );
                    }).filter(Boolean);
                    break;
                }
                case 'SUPPORT_HIRING': {
                    cells = SUPPORT_HIRING_COLUMNS.map((col, idx) => {
                        const colKey = helpers.getSupportHiringColumnKey(col);
                        const value = helpers.getSupportHiringCellValue(app, col, rowIndex);

                        if (col === "#") {
                            return renderIdCell(col, value, colKey, idx, getColumnWidth(col), 0, false);
                        }

                        return (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                key={idx}
                                value={localChanges[colKey] ?? remoteChanges[colKey] ?? value}
                                isEditing={isEditing && isColumnEditable(activeTab, col)}
                                isActive={isFocused && focusedColKey === colKey && focusedColName === col}
                                onPaint={(e) => onCellPaint(e, app, col, colKey)}
                                onStartEdit={() => setFocusPath({ appId: app.id, colKey, colName: col })}
                                style={getCellHighlightStyle(colKey)}
                                onChange={(val) => {
                                    handleInputChange(app.id, colKey, val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:${colKey}` });
                                }}
                                onHover={() => handleCellHover(colKey)}
                                onLeave={handleCellLeave}
                                presence={getCellPresence(colKey)}
                                colKey={colKey}
                                isStatus={colKey === 'current_status'}
                                colIdx={idx}
                                {...selectionProps}
                            />
                        );
                    }).filter(Boolean);
                    break;
                }
                default: {
                    const matchesQuestion = activeQuestions.some(q => terms.some(t => q.question_text.toLowerCase().includes(t)));
                    const matchesPos = terms.some(t => "position".includes(t));
                    const matchesAcc = terms.some(t => "account".includes(t));
                    const matchesStat = terms.some(t => "status".includes(t));
                    const matchesRemarks = terms.some(t => "remarks".includes(t));
                    const matchesAnyField = matchesQuestion || matchesPos || matchesAcc || matchesStat || matchesRemarks;

                    cells = [
                        ...activeQuestions.map((q, qIdx) => {
                            if (hasSearch && matchesAnyField && !terms.some(t => q.question_text.toLowerCase().includes(t))) return null;
                            const value = localChanges[q.id] ?? remoteChanges[q.id] ?? app.interview_responses?.[q.id] ?? '';
                            return (
                                <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                    key={q.id}
                                    value={value}
                                    isEditing={isEditing}
                                    isActive={isFocused && focusedColKey === q.id && focusedColName === q.question_text}
                                    onPaint={(e) => onCellPaint(e, app, q.question_text, q.id)}
                                    onStartEdit={() => setFocusPath({ appId: app.id, colKey: q.id, colName: q.question_text })}
                                    style={getCellHighlightStyle(q.id)}
                                    onChange={(val) => {
                                        handleInputChange(app.id, q.id, val);
                                        updateActivity({ type: 'edit', targetId: `${app.id}:${q.id}` });
                                    }}
                                    onHover={() => handleCellHover(q.id)}
                                    onLeave={handleCellLeave}
                                    presence={getCellPresence(q.id)}
                                    colKey={q.id}
                                    placeholder="Log response text..."
                                    colIdx={qIdx}
                                    {...selectionProps}
                                />
                            );
                        }).filter(Boolean),
                        ...[(!hasSearch || !matchesAnyField || terms.some(t => "remarks".includes(t))) && (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                key="final_interview_notes"
                                value={localChanges.final_interview_notes ?? remoteChanges.final_interview_notes ?? app.final_interview_notes ?? ''}
                                isEditing={isEditing}
                                isActive={isFocused && focusedColKey === 'final_interview_notes' && focusedColName === 'Remarks'}
                                onPaint={(e) => onCellPaint(e, app, 'Remarks', 'final_interview_notes')}
                                onStartEdit={() => setFocusPath({ appId: app.id, colKey: 'final_interview_notes', colName: 'Remarks' })}
                                style={getCellHighlightStyle('final_interview_notes')}
                                onChange={(val) => {
                                    handleInputChange(app.id, 'final_interview_notes', val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:final_interview_notes` });
                                }}
                                onHover={() => handleCellHover('final_interview_notes')}
                                onLeave={handleCellLeave}
                                presence={getCellPresence('final_interview_notes')}
                                colKey="final_interview_notes"
                                placeholder="Enter final remarks..."
                                width={400}
                                colIdx={activeQuestions.length}
                                {...selectionProps}
                            />
                        )].filter(Boolean)
                    ];
                }
            }
        }

        const isCustomizableTab = norm.includes('SHEET') ||
            ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm) ||
            norm.includes('TEAM_LEADER') ||
            norm.includes('BILINGUALS');

        if (isEditing && isCustomizableTab) {
            cells.push(
                <td 
                    key="add-column-placeholder"
                    className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 bg-emerald-50/10 border-r border-surface-200"
                    style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                />
            );
        }

        return cells;
    };

    const normalizedTabUpper = activeTab.toUpperCase();
    const isSpecialTab = (
        normalizedTabUpper.includes('SHEET') ||
        ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(normalizedTabUpper) ||
        normalizedTabUpper === 'PIVOT' ||
        normalizedTabUpper === 'VLIST' ||
        normalizedTabUpper.includes('TEAM_LEADER') ||
        normalizedTabUpper.includes('BILINGUALS') ||
        normalizedTabUpper === 'SUPPORT_HIRING'
    );
    const hasSearchActive = terms.length > 0;
    const matchesDefaultFields = hasSearchActive && !isSpecialTab;

    const termMatchesAnyDefault = matchesDefaultFields && (
        terms.some(t => "position".includes(t)) ||
        terms.some(t => "account".includes(t)) ||
        terms.some(t => "status".includes(t)) ||
        terms.some(t => "remarks".includes(t)) ||
        activeQuestions.some(q => terms.some(t => q.question_text.toLowerCase().includes(t)))
    );

    return (
        <motion.tr
            data-ai-spotlight={`candidate-${app.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(rowIndex * 0.01, 0.2) }}
            onMouseDown={(e) => {
                if (isSelectMode) e.preventDefault();
                onRowMouseDown(app.id);
            }}
            onMouseEnter={() => onRowMouseEnter(app.id)}
            className={cn(
                "border-b border-surface-200 text-left group/row h-[36px] min-h-[36px] max-h-[36px]",
                isReprofiled ? "bg-yellow-50 hover:bg-yellow-100/70" : "bg-white dark:bg-slate-900 hover:bg-[#f8f9fa]",
                isSelectMode && "select-none",
                app.highlight_color && app.highlight_color !== '---' && app.highlight_color !== 'clear' && `row-highlight-${app.highlight_color}`
            )}
        >
            {isSelectMode && (
                <td 
                    style={{ position: 'sticky', left: 0, zIndex: 20 }}
                    className={cn(
                        "transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900", "border-b border-r border-surface-200 px-3 text-center w-[50px] min-w-[50px] max-w-[50px] sticky shadow-[2px_0_4px_rgba(0,0,0,0.02)]",
                        isReprofiled ? "bg-yellow-50" : "bg-white dark:bg-slate-900"
                    )}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 rounded-none border-surface-300 text-[#d13438] focus:ring-[#d13438] cursor-pointer pointer-events-none"
                    />
                </td>
            )}

            {!(activeTab.toUpperCase().trim().includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(activeTab.toUpperCase().trim()) || activeTab.toUpperCase().trim().includes('BILINGUALS') || activeTab.toUpperCase().trim().includes('TEAM_LEADER')) && (
                <CandidateIdentityCell
                    app={app}
                    isSelectMode={isSelectMode}
                    isSelected={isSelected}
                    onToggleSelect={() => toggleSelect(app.id)}
                    onFocus={() => { setFocusedApplicant(app); setShowFullscreen(true); }}
                    onDelete={() => setDeletingId(app.id)}
                    onShowNotes={(app, rect) => onShowNotes(app, rect)}
                    onShowHistory={() => onShowHistory?.(app)}
                    onViewProfile={onViewProfile}
                    presence={getCellPresence('identity')}
                    onHover={() => handleCellHover('identity')}
                    onLeave={handleCellLeave}
                    className={cn(
                        "z-30 transition-shadow",
                        isSelectMode ? "left-[50px]" : "left-0",
                        isReprofiled ? "bg-yellow-50 group-hover/row:bg-yellow-100/70" : "bg-white dark:bg-slate-900 group-hover:bg-[#f8f9fa]",
                        "group-hover/row:shadow-[4px_0_12px_rgba(0,0,0,0.05)]"
                    )}
                />
            )}

            {!(activeTab.toUpperCase().trim().includes('SHEET') ||
                ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(activeTab.toUpperCase().trim()) ||
                activeTab.toUpperCase().trim().includes('PIVOT') ||
                activeTab.toUpperCase().trim().includes('VLIST') ||
                activeTab.toUpperCase().trim().includes('TEAM_LEADER') ||
                activeTab.toUpperCase().trim().includes('BILINGUALS') ||
                activeTab.toUpperCase().trim().includes('SUPPORT_HIRING')) && (
                    <>
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "posting".includes(t) || "job".includes(t))) && (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                value={localChanges.preferred_nickname ?? remoteChanges.preferred_nickname ?? app.preferred_nickname ?? app.pis?.preferred_nickname ?? ''}
                                isEditing={isEditing}
                                isActive={isFocused && focusedColKey === 'preferred_nickname' && focusedColName === 'Job Posting'}
                                onPaint={() => {
                                    setFocusPath({ appId: app.id, colKey: 'preferred_nickname', colName: 'Job Posting' });
                                    updateActivity({ type: 'focus', targetId: `${app.id}:preferred_nickname:Job Posting` });
                                }}
                                onChange={(val) => {
                                    handleInputChange(app.id, 'preferred_nickname', val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:preferred_nickname` });
                                }}
                                onHover={() => handleCellHover('preferred_nickname')}
                                onLeave={handleCellLeave}
                                presence={getCellPresence('preferred_nickname')}
                                colKey="preferred_nickname"
                                placeholder="Preferred Name..."
                                width={140}
                                className="sticky left-[280px] z-20 bg-white dark:bg-slate-900"
                                colIdx={0}
                                {...selectionProps}
                            />
                        )}
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "position".includes(t))) && (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                value={localChanges.position_title ?? remoteChanges.position_title ?? app.position_title ?? ''}
                                isEditing={isEditing}
                                isActive={isFocused && focusedColKey === 'position_title' && focusedColName === 'Position'}
                                onPaint={() => {
                                    setFocusPath({ appId: app.id, colKey: 'position_title', colName: 'Position' });
                                    updateActivity({ type: 'focus', targetId: `${app.id}:position_title:Position` });
                                }}
                                onChange={(val) => {
                                    handleInputChange(app.id, 'position_title', val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:position_title` });
                                }}
                                onHover={() => handleCellHover('position_title')}
                                onLeave={handleCellLeave}
                                presence={getCellPresence('position_title')}
                                colKey="position_title"
                                placeholder="Position..."
                                width={getColumnWidth('Position')}
                                className="sticky left-[420px] z-20 bg-white dark:bg-slate-900"
                                colIdx={1}
                                {...selectionProps}
                            />
                        )}
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "account".includes(t))) && (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                value={localChanges.department ?? remoteChanges.department ?? app.department ?? ''}
                                isEditing={isEditing}
                                isActive={isFocused && focusedColKey === 'department' && focusedColName === 'Account'}
                                onPaint={() => {
                                    setFocusPath({ appId: app.id, colKey: 'department', colName: 'Account' });
                                    updateActivity({ type: 'focus', targetId: `${app.id}:department:Account` });
                                }}
                                onChange={(val) => {
                                    handleInputChange(app.id, 'department', val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:department` });
                                }}
                                onHover={() => handleCellHover('department')}
                                onLeave={handleCellLeave}
                                presence={getCellPresence('department')}
                                colKey="department"
                                placeholder="Account..."
                                width={getColumnWidth('Account')}
                                colIdx={1}
                                {...selectionProps}
                            />
                        )}
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "status".includes(t))) && (
                            <EditableCell setIsEditing={setIsEditing} currentStep={app.current_status || ''}
                                value={localChanges.current_status ?? remoteChanges.current_status ?? app.current_status ?? ''}
                                isEditing={isEditing}
                                isActive={isFocused && focusedColKey === 'current_status' && focusedColName === 'Status'}
                                onPaint={() => {
                                    setFocusPath({ appId: app.id, colKey: 'current_status', colName: 'Status' });
                                    updateActivity({ type: 'focus', targetId: `${app.id}:current_status:Status` });
                                }}
                                onChange={(val) => {
                                    handleInputChange(app.id, 'current_status', val);
                                    updateActivity({ type: 'edit', targetId: `${app.id}:current_status` });
                                }}
                                onHover={() => handleCellHover('current_status')}
                                onLeave={handleCellLeave}
                                presence={getCellPresence('current_status')}
                                colKey="current_status"
                                isStatus={true}
                                width={getColumnWidth('Status')}
                                colIdx={2}
                                {...selectionProps}
                            />
                        )}
                    </>
                )}

            {renderCells()}
        </motion.tr>
    );
}, (prev, next) => {
    return prev.app === next.app &&
        prev.rowIndex === next.rowIndex &&
        prev.activeTab === next.activeTab &&
        prev.isEditing === next.isEditing &&
        prev.isSelectMode === next.isSelectMode &&
        prev.isSelected === next.isSelected &&
        prev.isFocused === next.isFocused &&
        prev.focusedColKey === next.focusedColKey &&
        prev.focusedColName === next.focusedColName &&
        prev.search === next.search &&
        prev.promotingId === next.promotingId &&
        prev.activeHireChecklistAppId === next.activeHireChecklistAppId &&
        prev.localChanges === next.localChanges &&
        prev.remoteChanges === next.remoteChanges &&
        prev.columnLeftOffsets === next.columnLeftOffsets &&
        prev.showEssentialOnly === next.showEssentialOnly &&
        JSON.stringify(prev.frozenKeys) === JSON.stringify(next.frozenKeys) &&
        JSON.stringify(prev.userFocus) === JSON.stringify(next.userFocus) &&
        JSON.stringify(prev.activeUsers) === JSON.stringify(next.activeUsers);
});




