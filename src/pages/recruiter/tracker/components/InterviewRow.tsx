import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, CheckCircle, CheckCircle2, Loader2, X, Briefcase, 
    ChevronRight, Square, CheckSquare, ListTodo, User, History as HistoryIcon 
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { 
    SHEET_COLUMNS, PIVOT_COLUMNS, VLIST_COLUMNS, SUPPORT_HIRING_COLUMNS 
} from '../constants';
import * as helpers from '../utils/tableHelpers';
import { CandidateIdentityCell, EditableCell } from './InterviewTableUI';
import { 
    computeHireEligibility, buildMissingTooltip, getColumnWidth
} from './tableUtils';

const rowMissingCache = new Map<string, boolean>();

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
    userFocus?: Record<string, any>;
    activeUsers: any[];
    onPromoteToHired?: (app: Application) => Promise<void> | void;
    promotingId?: string | null;
    activeHireChecklistAppId?: string | null;
    setActiveHireChecklistAppId: (id: string | null) => void;
    onRowMouseDown: (id: string) => void;
    onRowMouseEnter: (id: string) => void;
    onShowProcedure?: (app: Application) => void;
    isChecklistOpen: boolean;
    onToggleChecklist: (appId: string, open: boolean) => void;
    highlightedColumns: Record<string, string>;
    highlightedCells: Record<string, string>;
    onCellPaint: (e: React.MouseEvent, app: Application, colName: string, colKey: string) => void;
    eligibilitySettings?: { required: string[]; optional: string[] };
    customColumns?: Record<string, string[]>;
    customColumnMeta?: Record<string, Record<string, { options?: string[] }>>;
    setIsEditing?: (val: boolean) => void;
}

export const InterviewRow = React.memo(({
    app, rowIndex, activeTab, isEditing, localChanges, remoteChanges, handleInputChange,
    isSelectMode, isSelected, toggleSelect, setDeletingId,
    setFocusedApplicant, setShowFullscreen, activeQuestions, questions,
    onShowNotes, isFocused, focusedColKey, focusedColName, setFocusPath,
    search = '',
    activeUsers,
    userFocus = {},
    updateActivity,
    accounts,
    onShowHistory,
    onViewProfile,
    onRowMouseDown,
    onRowMouseEnter,
    onShowProcedure,
    isChecklistOpen,
    onToggleChecklist,
    highlightedColumns,
    highlightedCells,
    onCellPaint,
    onPromoteToHired,
    promotingId,
    activeHireChecklistAppId,
    setActiveHireChecklistAppId,
    eligibilitySettings,
    customColumns = {},
    customColumnMeta = {},
    setIsEditing
}: InterviewRowProps) => {
    const navigate = useNavigate();
    const warningTriggerRef = React.useRef<HTMLButtonElement | null>(null);
    const [warningPopoverPos, setWarningPopoverPos] = React.useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

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
        } else if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
            defaultCols = [...SHEET_COLUMNS].filter(col => !((norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') && col === "Hire Eligibility"));
        } else {
            return [];
        }
        return customColumns[tab] || defaultCols;
    }, [customColumns]);

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
            if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
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
        if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
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

    const renderIdCell = (col: string, value: string, colKey: string, idx: number, width: number, left: number) => {
        return (
            <td
                key={`id-cell-${colKey}`}
                className={cn(
                    "border-r border-[#edebe9] p-0 align-middle text-center overflow-hidden",
                    isReprofiled ? "bg-yellow-50" : "bg-white"
                )}
                style={{
                    width,
                    minWidth: width,
                    maxWidth: width,
                }}
            >
                <div className="px-2 py-2 flex items-center justify-center gap-1.5 relative h-full">
                    <AnimatedAvatar
                        gender={app.pis?.gender}
                        photoUrl={app.pis?.photo_data_url}
                        name={app.applicant_name}
                    />
                    <span className="text-surface-700 font-medium text-xs">{value}</span>
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

                    {isChecklistOpen && warningPopoverPos && createPortal(
                        <>
                            {/* Backdrop to close checklist popover */}
                            <div 
                                className="fixed inset-0 z-[2147483000]" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleChecklist(app.id, false);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                            {/* Checklist Popover */}
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
                                className="bg-white border border-[#edebe9] shadow-premium p-3 rounded-none text-left max-h-72 flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#edebe9]">
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

    const renderHireEligibilityCell = (idx: number, left: number) => {
        const eligibility = computeHireEligibility(app, rowLocalChanges, eligibilitySettings);
        const isPromotingThisRow = promotingId === app.id;
        const effectiveCurrentStatus = (rowLocalChanges?.current_status !== undefined ? rowLocalChanges.current_status : app.current_status) as string;
        const isAlreadyHired = effectiveCurrentStatus?.toLowerCase().trim() === 'hired';
        const isHireChecklistOpen = activeHireChecklistAppId === app.id;
        const triggerRef = React.useRef<HTMLButtonElement | null>(null);
        const [popoverPos, setPopoverPos] = React.useState<{ left: number; top: number; placement: 'down' | 'up' } | null>(null);

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

        const getFieldKeyForLabel = (label: string): string => {
            switch (label) {
                case 'Status': return 'current_status';
                case '1st Day Show up': return 'master_first_day_show_up';
                case 'Final Specific Status': return 'pis_final_specific_status';
                case 'PEME Status': return 'master_peme_status';
                case 'BGS Status': return 'master_bgs_status';
                case 'RCBC Status': return 'master_rcbc_status';
                case 'NBI Status': return 'master_nbi_status';
                case '2nd Day Show up': return 'master_second_day_show_up';
                default: return '';
            }
        };

        const handleRequirementClick = (label: string) => {
            const fieldKey = getFieldKeyForLabel(label);
            if (!fieldKey) return;
            
            closeChecklist();
            navigate('../masterlist', {
                state: {
                    autoSpotlightAppId: app.id,
                    autoSpotlightField: fieldKey,
                    autoStatus: app.current_status || app.master_status
                }
            });
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
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
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
                        {eligibility.requiredChecks.map((c, i) => (
                            <div
                                key={`req-${i}`}
                                onClick={() => handleRequirementClick(c.label)}
                                className="flex items-center justify-between gap-2 text-[11.5px] py-1.5 px-1.5 rounded-sm hover:bg-[#f3f2f1] cursor-pointer group/item transition-colors"
                                title={`Click to redirect to Masterlist and edit ${c.label}`}
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
                                        "text-[9.5px] font-bold uppercase tracking-wide tabular-nums shrink-0 opacity-80 group-hover/item:opacity-100 transition-opacity",
                                        c.met ? "text-emerald-600" : "text-rose-500"
                                    )}>
                                        {c.met ? 'Met' : 'Missing'}
                                    </span>
                                    <ChevronRight size={10} className="text-[#a19f9d] group-hover/item:text-[#0078d4] transition-colors" />
                                </div>
                            </div>
                        ))}
                        {eligibility.optionalChecks.length > 0 && (
                            <>
                                <div className="text-[9.5px] font-bold text-[#605e5c] uppercase tracking-wider pt-1">Optional</div>
                                {eligibility.optionalChecks.map((c, i) => (
                                    <div
                                        key={`opt-${i}`}
                                        onClick={() => handleRequirementClick(c.label)}
                                        className="flex items-center justify-between gap-2 text-[11.5px] py-1.5 px-1.5 rounded-sm hover:bg-[#f3f2f1] cursor-pointer group/item transition-colors"
                                        title={`Click to redirect to Masterlist and edit ${c.label}`}
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
                                                "text-[9.5px] font-bold uppercase tracking-wide tabular-nums shrink-0 opacity-80 group-hover/item:opacity-100 transition-opacity",
                                                c.met ? "text-emerald-600" : "text-[#a19f9d]"
                                            )}>
                                                {c.met ? 'Met' : 'Pending'}
                                            </span>
                                            <ChevronRight size={10} className="text-[#a19f9d] group-hover/item:text-[#0078d4] transition-colors" />
                                        </div>
                                    </div>
                                ))}
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
                                    className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wide rounded-sm transition-colors"
                                >
                                    Set Hired
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={closeChecklist}
                                className="h-6 px-2 bg-white border border-[#c8c6c4] text-[#323130] hover:bg-[#f3f2f1] text-[10px] font-bold uppercase tracking-wide rounded-sm transition-colors"
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
                    "border-r border-[#edebe9] p-0 align-middle text-center overflow-hidden",
                    isReprofiled ? "bg-yellow-50" : "bg-white"
                )}
                style={{
                    width: 170,
                    minWidth: 170,
                    maxWidth: 170,
                }}
            >
                <div
                    className="px-2 py-1.5 flex items-center justify-center gap-1.5 h-full animate-fade-in"
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
                                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm",
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

    const isColumnEditable = (tab: string, column: string) => {
        if (!isEditing) return false;
        const normalizedTab = tab.toUpperCase();
        if (normalizedTab.includes('SHEET')) {
            const immutableFields = ["Id", "Start time", "Completion time"];
            return !immutableFields.includes(column);
        }
        if (normalizedTab === 'PIVOT') {
            const editable = ["Overall Status", "Final Specific Status", "CEFR"];
            return editable.includes(column);
        }
        if (normalizedTab === 'VLIST') {
            const editable = ["Specific Status", "Overall Status", "Personality Test", "CEFR", "Wonderlic", "Leadership Assessment", "Ops Val Status", "Client Interview Status", "Final Account"];
            return editable.includes(column);
        }
        return column !== "#";
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

        // Merge with the new userFocus state from useInterviewReports
        Object.values(userFocus).forEach((focus: any) => {
            if (focus.appId === app.id && focus.field === colKey && focus.fullName) {
                if (!edits.includes(focus.fullName)) {
                    edits.push(focus.fullName);
                }
            }
        });

        return { hovers, edits };
    };

    const handleCellHover = (colKey: string) => {
        updateActivity({ type: 'hover', targetId: `${app.id}:${colKey}` });
    };

    const handleCellLeave = () => {
        updateActivity(null);
    };

    const renderCells = () => {
        const norm = activeTab.toUpperCase();
        let cells: any[] = [];
        if (norm.includes('BILINGUALS')) {
            const columns = getEffectiveColumns(activeTab);

            cells = columns.map((col, idx) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getBilingualsColumnKey(col);
                
                // Get value from customColumnMeta if custom dropdown, else get from app
                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getBilingualsCellValue(app, col, rowIndex);
                }

                if (col === "#") {
                    return renderIdCell(col, value, colKey, idx, 90, 0);
                }

                return (
                    <EditableCell
                        key={idx}
                        width={col === "#" ? 60 : col === "Notes" ? 400 : 240}
                        className={cn(
                            col === "#" ? "text-center sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]" : "text-left",
                            !localChanges[colKey] && !!remoteChanges[colKey] && "italic text-primary-600 bg-primary-50/5"
                        )}
                        style={{
                            position: col === "#" ? 'sticky' : undefined,
                            left: col === "#" ? (isSelectMode ? 50 : 0) : undefined,
                            backgroundColor: col === "#" ? 'white' : undefined,
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
                    />
                );
            });
        } else if (norm.includes('TEAM_LEADER')) {
            const columns = getEffectiveColumns(activeTab);

            cells = columns.map((col, idx) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getTeamLeaderColumnKey(col);
                
                // Get value from customColumnMeta if custom dropdown, else get from app
                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getTeamLeaderCellValue(app, col, rowIndex);
                }

                if (col === "#") {
                    return renderIdCell(col, value, colKey, idx, getColumnWidth(col), 0);
                }

                return (
                    <EditableCell
                        key={idx}
                        width={getColumnWidth(col)}
                        className={cn(
                            col === "#" ? "text-center sticky z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]" : "text-left",
                            !localChanges[colKey] && !!remoteChanges[colKey] && "italic text-primary-600 bg-primary-50/5"
                        )}
                        style={{
                            position: col === "#" ? 'sticky' : undefined,
                            left: col === "#" ? (isSelectMode ? 50 : 0) : undefined,
                            backgroundColor: col === "#" ? 'white' : undefined,
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
                    />
                );
            });
        } else if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
            const matchesAnyCol = SHEET_COLUMNS.some(c => terms.some(t => c.toLowerCase().includes(t)));
            const columns = getEffectiveColumns(activeTab);
            cells = columns.map((col, idx) => {
                if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                const isNameCol = col.toLowerCase().includes("candidate's complete name");

                const isMetaCustom = customColumnMeta[activeTab]?.[colKey];
                const customOpts = isMetaCustom?.options;

                let value = '';
                if (isCustom) {
                    value = (app.pis as any)?.[colKey.substring(7)] || app.interview_responses?.[colKey] || '';
                } else {
                    value = helpers.getSheetCellValue(app, col, rowIndex, questions);
                }

                if (col === "Id") {
                    return renderIdCell(col, value, colKey, idx, getColumnWidth(col), 0);
                }

                if (col === "Hire Eligibility") {
                    const cell = renderHireEligibilityCell(idx, 0);
                    if (norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
                        return null;
                    }
                    return cell ? React.cloneElement(cell, { key: `hire-eligibility-${idx}` }) : null;
                }
                if (isNameCol && !isEditing && onViewProfile) {
                    const nameVal = localChanges[colKey] ?? remoteChanges[colKey] ?? value;
                    const hasHistory = !!((app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0));
                    return (
                        <td 
                            key={`name-cell-${idx}`} 
                            style={{ 
                                width: getColumnWidth(col), 
                                minWidth: getColumnWidth(col),
                                maxWidth: getColumnWidth(col),
                            }} 
                            className={cn(
                                "border-r border-[#edebe9] p-0 align-top text-left overflow-hidden cursor-pointer", 
                                isReprofiled ? "bg-yellow-50" : "bg-white"
                            )}
                            onDoubleClick={() => onViewProfile(app)}
                        >
                            <div className="px-4 py-2 flex items-center gap-2 group/pis min-w-0 w-full">
                                <span className="text-[12px] text-surface-700 font-medium truncate flex-1 min-w-0">{nameVal || <span className="text-[#a19f9d]">—</span>}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewProfile(app); }}
                                    className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-[#0078d4] rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9]"
                                    title="View Full PIS Profile"
                                    >
                                    <User size={12} />
                                </button>
                                {hasHistory && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onShowHistory?.(app); }}
                                        className="opacity-30 hover:opacity-100 p-1 bg-[#f0f2f5] text-purple-600 rounded-none hover:bg-[#e1dfdd] transition-all shadow-sm shrink-0 border border-[#edebe9]"
                                        title="View Reprofile History"
                                    >
                                        <HistoryIcon size={12} />
                                    </button>
                                )}
                            </div>
                        </td>
                    );
                }

                return (
                    <EditableCell
                        key={idx}
                        id={`cell-${app.id}-${colKey}`}
                        width={isCustom ? 140 : getColumnWidth(col)}
                        value={localChanges[colKey] ?? remoteChanges[colKey] ?? value}
                        isEditing={isEditing && isColumnEditable(activeTab, col)}
                        setIsEditing={setIsEditing}
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
                        onShowProcedure={colKey === 'pis_final_specific_status' && onShowProcedure ? () => onShowProcedure(app) : undefined}
                        onClose={() => setFocusPath(null)}
                        className={isReprofiled ? "bg-yellow-50" : "bg-white"}
                        style={getCellHighlightStyle(colKey)}
                    />
                );
            }).filter(Boolean);
        } else {
            switch (norm) {
                case 'PIVOT': {
                    const matchesAnyCol = PIVOT_COLUMNS.some(c => terms.some(t => c.toLowerCase().includes(t)));
                    cells = PIVOT_COLUMNS.map((col, idx) => {
                        if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                        const colKey = helpers.getPivotColumnKey(col);
                        return (
                            <EditableCell
                                key={idx}
                                value={localChanges[colKey] ?? remoteChanges[colKey] ?? helpers.getPivotCellValue(app, col)}
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
                                onShowProcedure={colKey === 'pis_final_specific_status' && onShowProcedure ? () => onShowProcedure(app) : undefined}
                            />
                        );
                    }).filter(Boolean);
                    break;
                }
                case 'VLIST': {
                    const matchesAnyCol = VLIST_COLUMNS.some(c => terms.some(t => c.toLowerCase().includes(t)));
                    cells = VLIST_COLUMNS.map((col, idx) => {
                        if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                        const colKey = helpers.getVlistColumnKey(col);
                        const isStatus = colKey === 'current_status' || colKey === 'ops_val_status' || colKey === 'client_interview_status' || colKey === 'pis_final_specific_status' || colKey === 'pis_overall_status' || colKey === 'overall_status';
                        return (
                            <EditableCell
                                key={idx}
                                value={localChanges[colKey] ?? remoteChanges[colKey] ?? helpers.getVlistCellValue(app, col)}
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
                                onShowProcedure={colKey === 'pis_final_specific_status' && onShowProcedure ? () => onShowProcedure(app) : undefined}
                            />
                        );
                    }).filter(Boolean);
                    break;
                }
                case 'SUPPORT_HIRING': {
                    const matchesAnyCol = SUPPORT_HIRING_COLUMNS.some(c => terms.some(t => c.toLowerCase().includes(t)));
                    cells = SUPPORT_HIRING_COLUMNS.map((col, idx) => {
                        if (hasSearch && matchesAnyCol && !terms.some(t => col.toLowerCase().includes(t)) && !col.toLowerCase().includes('name')) return null;
                        const colKey = helpers.getSupportHiringColumnKey(col);
                        const value = helpers.getSupportHiringCellValue(app, col, rowIndex);

                        if (col === "#") {
                            return renderIdCell(col, value, colKey, idx, getColumnWidth(col), 0);
                        }

                        return (
                            <EditableCell
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
                        ...activeQuestions.map(q => {
                            if (hasSearch && matchesAnyField && !terms.some(t => q.question_text.toLowerCase().includes(t))) return null;
                            const value = localChanges[q.id] ?? remoteChanges[q.id] ?? app.interview_responses?.[q.id] ?? '';
                            return (
                                <EditableCell
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
                                />
                            );
                        }).filter(Boolean),
                        ...[(!hasSearch || !matchesAnyField || terms.some(t => "remarks".includes(t))) && (
                            <EditableCell
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
                            />
                        )].filter(Boolean)
                    ];
                }
            }
        }

        const isCustomizableTab = norm.includes('SHEET') ||
            norm === 'BLACKLIST' ||
            norm === 'NOT_ELIGIBLE' ||
            norm.includes('TEAM_LEADER') ||
            norm.includes('BILINGUALS');

        if (isEditing && isCustomizableTab) {
            cells.push(
                <td 
                    key="add-column-placeholder"
                    className="bg-emerald-50/10 border-r border-[#edebe9]"
                    style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                />
            );
        }

        return cells;
    };

    const normalizedTabUpper = activeTab.toUpperCase();
    const isSpecialTab = (
        normalizedTabUpper.includes('SHEET') ||
        normalizedTabUpper === 'BLACKLIST' ||
        normalizedTabUpper === 'NOT_ELIGIBLE' ||
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(rowIndex * 0.01, 0.2) }}
            onMouseDown={() => onRowMouseDown(app.id)}
            onMouseEnter={() => onRowMouseEnter(app.id)}
            className={cn(
                "border-b border-[#edebe9] text-left group/row",
                isReprofiled ? "bg-yellow-50 hover:bg-yellow-100/70" : "bg-white hover:bg-[#f8f9fa]",
                isSelectMode && "select-none",
                app.highlight_color && app.highlight_color !== '---' && app.highlight_color !== 'clear' && `row-highlight-${app.highlight_color}`
            )}
        >
            {isSelectMode && (
                <td 
                    style={{ position: 'sticky', left: 0, zIndex: 20 }}
                    className={cn(
                        "border-r border-[#edebe9] px-3 text-center w-[50px] min-w-[50px] max-w-[50px] sticky shadow-[2px_0_4px_rgba(0,0,0,0.02)]",
                        isReprofiled ? "bg-yellow-50" : "bg-white"
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

            {!(activeTab.toUpperCase().trim().includes('SHEET') || activeTab.toUpperCase().trim() === 'BLACKLIST' || activeTab.toUpperCase().trim() === 'NOT_ELIGIBLE' || activeTab.toUpperCase().trim().includes('BILINGUALS') || activeTab.toUpperCase().trim().includes('TEAM_LEADER')) && (
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
                        isReprofiled ? "bg-yellow-50 group-hover/row:bg-yellow-100/70" : "bg-white group-hover:bg-[#f8f9fa]",
                        "group-hover/row:shadow-[4px_0_12px_rgba(0,0,0,0.05)]"
                    )}
                />
            )}

            {!(activeTab.toUpperCase().trim().includes('SHEET') ||
                activeTab.toUpperCase().trim() === 'BLACKLIST' ||
                activeTab.toUpperCase().trim() === 'NOT_ELIGIBLE' ||
                activeTab.toUpperCase().trim().includes('PIVOT') ||
                activeTab.toUpperCase().trim().includes('VLIST') ||
                activeTab.toUpperCase().trim().includes('TEAM_LEADER') ||
                activeTab.toUpperCase().trim().includes('BILINGUALS') ||
                activeTab.toUpperCase().trim().includes('SUPPORT_HIRING')) && (
                    <>
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "position".includes(t))) && (
                            <EditableCell
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
                                className="sticky left-[280px] z-20 bg-white"
                            />
                        )}
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "account".includes(t))) && (
                            <EditableCell
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
                            />
                        )}
                        {(!hasSearchActive || !termMatchesAnyDefault || terms.some(t => "status".includes(t))) && (
                            <EditableCell
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
                            />
                        )}
                    </>
                )}

            {renderCells()}
        </motion.tr>
    );
});
