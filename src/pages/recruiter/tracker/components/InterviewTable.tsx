import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { usePresence } from '@/hooks/usePresence';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import {
    SHEET_COLUMNS, PIVOT_COLUMNS, VLIST_COLUMNS
} from '../constants';
import * as helpers from '../utils/tableHelpers';
import { InterviewRow } from './InterviewRow';
import { 
    getColumnWidth, 
    getDefaultOptionsForColKey
} from './tableUtils';

const EMPTY_CHANGES = {};

export interface InterviewTableProps {
    activeTab: string;
    filteredList: Application[];
    isEditing: boolean;
    localChanges: Record<string, Record<string, string>>;
    handleInputChange: (appId: string, qId: string, value: string) => void;
    isSelectMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    toggleSelectAll: () => void;
    setDeletingId: (id: string | null) => void;
    setFocusedApplicant: (app: Application) => void;
    setShowFullscreen: (val: boolean) => void;
    activeQuestions: InterviewQuestion[];
    questions: InterviewQuestion[];
    onShowNotes: (app: Application, rect: DOMRect) => void;
    focusPath: { appId: string, colKey: string, colName: string } | null;
    setFocusPath: (path: { appId: string, colKey: string, colName: string } | null) => void;
    search?: string;
    accounts: string[];
    onShowHistory?: (app: Application) => void;
    onViewProfile?: (app: Application) => void;
    activeUsers?: any[];
    userFocus?: Record<string, any>;
    remoteChanges?: Record<string, Record<string, string>>;
    onShowProcedure?: (app: Application) => void;
    onPromoteToHired?: (app: Application) => Promise<void> | void;
    promotingId?: string | null;
    setIsEditing?: (val: boolean) => void;
}

export function InterviewTable({
    activeTab, filteredList, isEditing, localChanges, handleInputChange,
    isSelectMode, selectedIds, toggleSelect, toggleSelectAll, setDeletingId,
    setFocusedApplicant, setShowFullscreen, activeQuestions, questions,
    onShowNotes, focusPath, setFocusPath,
    search = '', accounts, onShowHistory, onViewProfile,
    activeUsers = [], userFocus = {}, remoteChanges = {}, onShowProcedure,
    onPromoteToHired, promotingId, setIsEditing
}: InterviewTableProps) {
    const { activeUsers: registryPresence, updateActivity } = usePresence(`Registry: ${activeTab}`);
    const normalizedTab = activeTab.toUpperCase();
    const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 40 });
    const [containerHeight, setContainerHeight] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const [departmentsList, setDepartmentsList] = React.useState<any[]>(() => {
        try {
            const cached = localStorage.getItem('cached_departments');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    React.useEffect(() => {
        import('@/services/DepartmentService').then(({ DepartmentService }) => {
            DepartmentService.getAll().then(depts => {
                setDepartmentsList(depts);
                try {
                    localStorage.setItem('cached_departments', JSON.stringify(depts));
                } catch {}
            }).catch(() => {});
        });
    }, []);

    const [highlightedColumns, setHighlightedColumns] = React.useState<Record<string, Record<string, string>>>(() => {
        const all: Record<string, Record<string, string>> = {};
        try {
            const savedAll = localStorage.getItem(`registry_highlighted_columns_all`);
            if (savedAll) {
                Object.assign(all, JSON.parse(savedAll));
            }
        } catch {}
        const tabs = ['SHEET', 'BILINGUALS', 'TEAM_LEADER', 'PIVOT', 'VLIST', 'SUPPORT_HIRING', 'SUPPORT HIRING'];
        for (const t of tabs) {
            if (!all[t]) {
                try {
                    const saved = localStorage.getItem(`registry_highlighted_columns:${t}`);
                    if (saved) {
                        all[t] = JSON.parse(saved);
                    }
                } catch {}
            }
        }
        return all;
    });

    const [highlightedHeaders, setHighlightedHeaders] = React.useState<Record<string, Record<string, string>>>(() => {
        const all: Record<string, Record<string, string>> = {};
        try {
            const savedAll = localStorage.getItem(`registry_highlighted_headers_all`);
            if (savedAll) {
                Object.assign(all, JSON.parse(savedAll));
            }
        } catch {}
        const tabs = ['SHEET', 'BILINGUALS', 'TEAM_LEADER', 'PIVOT', 'VLIST', 'SUPPORT_HIRING', 'SUPPORT HIRING'];
        for (const t of tabs) {
            if (!all[t]) {
                try {
                    const saved = localStorage.getItem(`registry_highlighted_headers:${t}`);
                    if (saved) {
                        all[t] = JSON.parse(saved);
                    }
                } catch {}
            }
        }
        return all;
    });

    const [highlightedCells, setHighlightedCells] = React.useState<Record<string, Record<string, string>>>(() => {
        const all: Record<string, Record<string, string>> = {};
        try {
            const savedAll = localStorage.getItem(`registry_highlighted_cells_all`);
            if (savedAll) {
                Object.assign(all, JSON.parse(savedAll));
            }
        } catch {}
        const tabs = ['SHEET', 'BILINGUALS', 'TEAM_LEADER', 'PIVOT', 'VLIST', 'SUPPORT_HIRING', 'SUPPORT HIRING'];
        for (const t of tabs) {
            if (!all[t]) {
                try {
                    const saved = localStorage.getItem(`registry_highlighted_cells:${t}`);
                    if (saved) {
                        all[t] = JSON.parse(saved);
                    }
                } catch {}
            }
        }
        return all;
    });

    const [customColumnNames, setCustomColumnNames] = React.useState<Record<string, Record<string, string>>>(() => {
        const all: Record<string, Record<string, string>> = {};
        try {
            const savedAll = localStorage.getItem(`registry_custom_column_names_all`);
            if (savedAll) {
                Object.assign(all, JSON.parse(savedAll));
            }
        } catch {}
        const tabs = ['SHEET', 'BILINGUALS', 'TEAM_LEADER', 'PIVOT', 'VLIST', 'SUPPORT_HIRING', 'SUPPORT HIRING'];
        for (const t of tabs) {
            if (!all[t]) {
                try {
                    const saved = localStorage.getItem(`registry_custom_column_names:${t}`);
                    if (saved) {
                        all[t] = JSON.parse(saved);
                    }
                } catch {}
            }
        }
        return all;
    });

    React.useEffect(() => {
        localStorage.setItem(`registry_highlighted_columns_all`, JSON.stringify(highlightedColumns));
    }, [highlightedColumns]);

    React.useEffect(() => {
        localStorage.setItem(`registry_highlighted_headers_all`, JSON.stringify(highlightedHeaders));
    }, [highlightedHeaders]);

    React.useEffect(() => {
        localStorage.setItem(`registry_highlighted_cells_all`, JSON.stringify(highlightedCells));
    }, [highlightedCells]);

    React.useEffect(() => {
        localStorage.setItem(`registry_custom_column_names_all`, JSON.stringify(customColumnNames));
    }, [customColumnNames]);

    const [customConfirm, setCustomConfirm] = React.useState<{
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);
    const [customPrompt, setCustomPrompt] = React.useState<{
        title: string;
        message: string;
        defaultValue: string;
        onConfirm: (val: string) => void;
    } | null>(null);
    const [activeMenu, setActiveMenu] = React.useState<{
        type: 'column' | 'cell';
        colName: string;
        colKey: string;
        appId?: string;
        x: number;
        y: number;
    } | null>(null);

    // Custom column order per tab (persisted to localStorage)
    const [customColumns, setCustomColumns] = React.useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_columns_by_tab');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    // Custom column metadata (dropdown options for custom columns)
    const [customColumnMeta, setCustomColumnMeta] = React.useState<Record<string, Record<string, { options?: string[] }>>>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_column_meta');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [addColumnModal, setAddColumnModal] = React.useState(false);
    const [addColName, setAddColName] = React.useState('');
    const [addColOptions, setAddColOptions] = React.useState<string[]>([]);
    const [addColNewOption, setAddColNewOption] = React.useState('');
    const [editColOptionsModal, setEditColOptionsModal] = React.useState<{ colKey: string; colName: string } | null>(null);

    // Get effective columns for the current tab
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

    const handleMoveColumn = React.useCallback((tab: string, idx: number, direction: 'left' | 'right') => {
        const cols = getEffectiveColumns(tab);
        const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= cols.length) return;

        // Don't allow moving the first column (usually #/Id)
        const firstCol = cols[0];
        if ((firstCol === '#' || firstCol === 'Id' || firstCol === 'Hire Eligibility') && (idx === 0 || swapIdx === 0)) return;
        const updated = [...cols];
        const temp = updated[idx];
        updated[idx] = updated[swapIdx];
        updated[swapIdx] = temp;
        const newCustom = { ...customColumns, [tab]: updated };
        setCustomColumns(newCustom);
        try {
            localStorage.setItem('registry_custom_columns_by_tab', JSON.stringify(newCustom));
        } catch {}
    }, [customColumns, getEffectiveColumns]);

    const handleAddColumn = React.useCallback((tab: string, colName: string, options: string[]) => {
        const cols = getEffectiveColumns(tab);
        const customColId = `custom:${colName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
        const newCols = [...cols, customColId];
        const newCustom = { ...customColumns, [tab]: newCols };
        setCustomColumns(newCustom);
        try {
            localStorage.setItem('registry_custom_columns_by_tab', JSON.stringify(newCustom));
        } catch {}
        // Store metadata (display name + options)
        if (options.length > 0 || colName.trim()) {
            const meta = { ...customColumnMeta };
            if (!meta[tab]) meta[tab] = {};
            meta[tab][customColId] = { options: options.length > 0 ? options : undefined };
            setCustomColumnMeta(meta);
            try {
                localStorage.setItem('registry_custom_column_meta', JSON.stringify(meta));
            } catch {}
        }
        // Also save the display name in customColumnNames
        setCustomColumnNames(prev => {
            const updated = {
                ...prev,
                [tab]: { ...(prev[tab] || {}), [customColId]: colName.trim() }
            };
            localStorage.setItem('registry_custom_column_names_all', JSON.stringify(updated));
            return updated;
        });
    }, [customColumns, customColumnMeta, getEffectiveColumns]);

    const handleRemoveColumn = React.useCallback((tab: string, colId: string) => {
        const cols = getEffectiveColumns(tab);
        const newCols = cols.filter(c => c !== colId);
        const newCustom = { ...customColumns, [tab]: newCols };
        setCustomColumns(newCustom);
        try {
            localStorage.setItem('registry_custom_columns_by_tab', JSON.stringify(newCustom));
        } catch {}
        
        // Clean up metadata
        const meta = { ...customColumnMeta };
        if (meta[tab] && meta[tab][colId]) {
            delete meta[tab][colId];
            setCustomColumnMeta(meta);
            try {
                localStorage.setItem('registry_custom_column_meta', JSON.stringify(meta));
            } catch {}
        }

        // Clean up custom column name
        setCustomColumnNames(prev => {
            const updated = { ...prev };
            if (updated[tab]) {
                const tabNames = { ...updated[tab] };
                delete tabNames[colId];
                updated[tab] = tabNames;
            }
            localStorage.setItem('registry_custom_column_names_all', JSON.stringify(updated));
            return updated;
        });
    }, [customColumns, customColumnMeta, getEffectiveColumns]);

    const handleCellPaint = React.useCallback((e: React.MouseEvent, app: Application, colName: string, colKey: string) => {
        setActiveMenu({
            type: 'cell',
            colName,
            colKey,
            appId: app.id,
            x: e.clientX,
            y: e.clientY
        });
    }, []);

    const handleRenameColumn = (colKey: string, colName: string) => {
        if (!isEditing) return;
        setCustomConfirm({
            title: "Strict Warning",
            message: `Renaming the column "${colName}" will update the header visual title. Proceed?`,
            onConfirm: () => {
                setCustomConfirm(null);
                setCustomPrompt({
                    title: "Rename Column",
                    message: `Enter new name for "${colName}" column:`,
                    defaultValue: colName,
                    onConfirm: (newName) => {
                        setCustomPrompt(null);
                        if (newName === null || newName.trim() === '') return;
                        setCustomColumnNames(prev => ({
                            ...prev,
                            [activeTab]: {
                                ...(prev[activeTab] || {}),
                                [colKey]: newName
                            }
                        }));
                        setActiveMenu(null);
                    }
                });
            }
        });
    };

    const handleEditSingleCell = (appId: string, colKey: string, colName: string) => {
        setActiveMenu(null);
        if (colName.toUpperCase().includes('DATE') || colName.toUpperCase().includes('INTERVIEW')) {
            setCustomConfirm({
                title: "Strict Warning",
                message: `You are modifying the "${colName}". Changing this candidate schedule might trigger status regressions, candidate notification changes, or pipeline mismatches. Are you sure you want to proceed?`,
                onConfirm: () => {
                    setCustomConfirm(null);
                    setFocusPath({ appId, colKey, colName });
                }
            });
        } else {
            setFocusPath({ appId, colKey, colName });
        }
    };

    const [isDragging, setIsDragging] = React.useState(false);
    const [dragMode, setDragMode] = React.useState<'select' | 'deselect'>('select');
    const [activeChecklistAppId, setActiveChecklistAppId] = React.useState<string | null>(null);
    const [activeHireChecklistAppId, setActiveHireChecklistAppId] = React.useState<string | null>(null);

    const handleToggleChecklist = React.useCallback((appId: string, open: boolean) => {
        setActiveChecklistAppId(open ? appId : null);
    }, []);

    const handleRowMouseDown = React.useCallback((id: string) => {
        if (!isSelectMode) return;
        setIsDragging(true);
        const willSelect = !selectedIds.has(id);
        setDragMode(willSelect ? 'select' : 'deselect');
        toggleSelect(id);
    }, [isSelectMode, selectedIds, toggleSelect]);

    const handleRowMouseEnter = React.useCallback((id: string) => {
        if (!isSelectMode || !isDragging) return;
        if (dragMode === 'select' && !selectedIds.has(id)) {
            toggleSelect(id);
        } else if (dragMode === 'deselect' && selectedIds.has(id)) {
            toggleSelect(id);
        }
    }, [isSelectMode, isDragging, dragMode, selectedIds, toggleSelect]);

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const rowHeight = 52;
    const headerHeight = 48;
    const overscan = 5;

    React.useEffect(() => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight);
            const observer = new ResizeObserver(() => {
                if (containerRef.current) {
                    setContainerHeight(containerRef.current.clientHeight);
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        const newStart = Math.max(0, Math.floor((top - headerHeight) / rowHeight) - overscan);
        const newEnd = Math.min(filteredList.length, Math.ceil((top + containerHeight) / rowHeight) + overscan);
        
        setVisibleRange(prev => {
            if (prev.start === newStart && prev.end === newEnd) return prev;
            return { start: newStart, end: newEnd };
        });
    }, [containerHeight, filteredList.length]);

    // Recalculate visible range when container height or list length changes
    React.useEffect(() => {
        const newStart = Math.max(0, Math.floor(0 / rowHeight) - overscan);
        const newEnd = Math.min(filteredList.length, Math.ceil(containerHeight / rowHeight) + overscan);
        setVisibleRange({ start: newStart, end: newEnd });
    }, [containerHeight, filteredList.length]);

    const startIndex = visibleRange.start;
    const endIndex = visibleRange.end;
    const visibleList = React.useMemo(() => {
        return filteredList.slice(startIndex, endIndex);
    }, [filteredList, startIndex, endIndex]);

    const terms = search.toLowerCase().split('|').map(t => t.trim()).filter(t => t.length >= 2);
    const hasSearch = terms.length > 0;

    const isPulsingColumn = (name: string) => {
        const n = name.toUpperCase();
        return n.includes('FINAL ACCOUNT') || n.includes('FINAL SPECIFIC STATUS') || n.includes('OVERALL STATUS') || n.includes('SPECIFIC STATUS') || n === 'ACCOUNT' || n === 'STATUS';
    };

    const renderHeaderColumns = () => {
        const norm = activeTab.toUpperCase();
        const currentTabNames = customColumnNames[activeTab] || {};
        const currentTabHeaders = highlightedHeaders[activeTab] || {};
        const currentTabColumns = highlightedColumns[activeTab] || {};

        // 1. Specialized Registries (Bilinguals & TL)
        if (norm.includes('BILINGUALS')) {
            const columns = getEffectiveColumns(activeTab);
            return (
                <>
                    {columns.map((col, idx) => {
                        const colKey = col.startsWith('custom:') ? col : helpers.getBilingualsColumnKey(col);
                        const displayCol = currentTabNames[colKey] || (col.startsWith('custom:') ? col.substring(7) : col);
                        const isCustom = col.startsWith('custom:');
                        return (
                            <th key={idx} 
                                onClick={(e) => {
                                    if (isEditing && col !== "#") {
                                        e.stopPropagation();
                                        setActiveMenu({
                                            type: 'column',
                                            colName: displayCol,
                                            colKey,
                                            x: e.clientX,
                                            y: e.clientY
                                        });
                                    }
                                }}
                                style={{ 
                                    width: col === "#" ? 60 : col === "Notes" ? 400 : 240,
                                    position: col === "#" ? 'sticky' : undefined,
                                    left: col === "#" ? (isSelectMode ? 50 : 0) : undefined,
                                    zIndex: col === "#" ? 110 : undefined,
                                    backgroundColor: currentTabHeaders[colKey] || currentTabColumns[colKey] || undefined
                                }}
                                className={cn(
                                    "bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider overflow-hidden transition-colors cursor-pointer",
                                    col === "#" && "shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                                    isPulsingColumn(col) && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                                )}>
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <div className="truncate text-center flex-1" title={displayCol}>{displayCol}</div>
                                    {isEditing && col !== "#" && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'left'); }}
                                                disabled={idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id'))}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white ml-0.5"
                                                    title="Remove column"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </th>
                        );
                    })}
                    {isEditing && (
                        <th
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAddColName('');
                                setAddColOptions([]);
                                setAddColNewOption('');
                                setAddColumnModal(true);
                            }}
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-[#edebe9] text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
                            style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                        >
                            + Add Column
                        </th>
                    )}
                </>
            );
        }

        if (norm.includes('TEAM_LEADER')) {
            const columns = getEffectiveColumns(activeTab);
            return (
                <>
                    {columns.map((col, idx) => {
                        const colKey = col.startsWith('custom:') ? col : helpers.getTeamLeaderColumnKey(col);
                        const displayCol = currentTabNames[colKey] || (col.startsWith('custom:') ? col.substring(7) : col);
                        const isCustom = col.startsWith('custom:');
                        return (
                            <th key={idx} 
                                onClick={(e) => {
                                    if (isEditing && col !== "#") {
                                        e.stopPropagation();
                                        setActiveMenu({
                                            type: 'column',
                                            colName: displayCol,
                                            colKey,
                                            x: e.clientX,
                                            y: e.clientY
                                        });
                                    }
                                }}
                                style={{ 
                                    width: (col === "#" || col.toLowerCase() === "id") ? 60 : col === "Background and Experience" ? 400 : 200,
                                    position: col === "#" ? 'sticky' : undefined,
                                    left: col === "#" ? (isSelectMode ? 50 : 0) : undefined,
                                    zIndex: col === "#" ? 110 : undefined,
                                    backgroundColor: currentTabHeaders[colKey] || currentTabColumns[colKey] || undefined
                                }}
                                className={cn(
                                    "bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider overflow-hidden transition-colors cursor-pointer",
                                    col === "#" && "shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                                    isPulsingColumn(col) && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                                )}>
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <div className="truncate text-left flex-1" title={displayCol}>{displayCol}</div>
                                    {isEditing && col !== "#" && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'left'); }}
                                                disabled={idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id'))}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white ml-0.5"
                                                    title="Remove column"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </th>
                        );
                    })}
                    {isEditing && (
                        <th
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAddColName('');
                                setAddColOptions([]);
                                setAddColNewOption('');
                                setAddColumnModal(true);
                            }}
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-[#edebe9] text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
                            style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                        >
                            + Add Column
                        </th>
                    )}
                </>
            );
        }

        // 2. Main Sheet Tables (SHEET, BLACKLIST, NOT_ELIGIBLE)
        if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
            const columns = getEffectiveColumns(activeTab);
            return (
                <>
                    {columns.map((col, idx) => {
                        const isCustom = col.startsWith('custom:');
                        const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                        const displayCol = currentTabNames[colKey] || (isCustom ? col.substring(7) : col);

                        const width = isCustom ? 140 : getColumnWidth(col);

                        return (
                            <th
                                key={idx}
                                onClick={(e) => {
                                    if (isEditing) {
                                        e.stopPropagation();
                                        setActiveMenu({
                                            type: 'column',
                                            colName: displayCol,
                                            colKey,
                                            x: e.clientX,
                                            y: e.clientY
                                        });
                                    }
                                }}
                                style={{
                                    width,
                                    minWidth: width,
                                    maxWidth: width,
                                    backgroundColor: currentTabHeaders[colKey] || currentTabColumns[colKey] || undefined
                                }}
                                className={cn(
                                    "border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider overflow-hidden transition-colors bg-[#f3f2f1] cursor-pointer",
                                    isPulsingColumn(col) && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                                )}
                            >
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <div className="truncate text-center flex-1" title={displayCol}>{displayCol}</div>
                                    {isEditing && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'left'); }}
                                                disabled={idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')) || (idx === 2 && (columns[0] === 'Id' && (columns[1] === "Candidate's Name" || columns[1] === "Name")))}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')) || (idx === 2 && (columns[0] === 'Id' && (columns[1] === "Candidate's Name" || columns[1] === "Name"))))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white ml-0.5"
                                                    title="Remove column"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </th>
                        );
                    })}
                    {isEditing && (
                        <th
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setAddColName('');
                                setAddColOptions([]);
                                setAddColNewOption('');
                                setAddColumnModal(true);
                            }}
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-[#edebe9] text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center animate-fade-in"
                            style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                        >
                            + Add Column
                        </th>
                    )}
                </>
            );
        }

        // 3. Fallback registries (PIVOT, VLIST, etc.)
        switch (norm) {
            case 'PIVOT': {
                return (
                    <>
                        <th className="sticky left-0 z-[110] w-[280px] bg-white border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                            Final Account
                        </th>
                        <th className="w-[220px] bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-center tracking-wider">
                            Status
                        </th>
                        <th className="w-[150px] bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-center tracking-wider">
                            CEFR
                        </th>
                        {PIVOT_COLUMNS.map((col, idx) => (
                            <th key={idx} className="w-[220px] bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-center tracking-wider">
                                {col}
                            </th>
                        ))}
                    </>
                );
            }
            case 'VLIST': {
                return (
                    <>
                        {VLIST_COLUMNS.map((col, idx) => (
                            <th key={idx} className={cn("bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider", isPulsingColumn(col) && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]")}>
                                {col}
                            </th>
                        ))}
                    </>
                );
            }
            default: {
                const matchesQuestion = activeQuestions.some(q => terms.some(t => q.question_text.toLowerCase().includes(t)));
                const matchesPos = terms.some(t => "position".includes(t));
                const matchesAcc = terms.some(t => "account".includes(t));
                const matchesStat = terms.some(t => "status".includes(t));
                const matchesRemarks = terms.some(t => "remarks".includes(t));
                const matchesAnyField = matchesQuestion || matchesPos || matchesAcc || matchesStat || matchesRemarks;

                return (
                    <>
                        {(!hasSearch || !matchesAnyField || terms.some(t => "position".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Position') }}
                                className="sticky left-[280px] z-[110] bg-[#faf9f8] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider"
                            >
                                Position
                            </th>
                        )}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "account".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Account') }}
                                className={cn(
                                "bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider",
                                isPulsingColumn("Account") && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                            )}>
                                Account
                            </th>
                        )}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "status".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Status') }}
                                className={cn(
                                "bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-center tracking-wider",
                                isPulsingColumn("Status") && "bg-primary-50/50 animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                            )}>
                                Status
                            </th>
                        )}
                        {activeQuestions.map(q => {
                            if (hasSearch && matchesAnyField && !terms.some(t => q.question_text.toLowerCase().includes(t))) return null;
                            return (
                                <th key={q.id} className="w-[400px] bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider overflow-hidden">
                                    <div className="truncate" title={q.question_text}>{q.question_text}</div>
                                </th>
                            );
                        }).filter(Boolean)}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "remarks".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Summary') }}
                                className="bg-[#f3f2f1] border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider"
                            >
                                Final Remarks
                            </th>
                        )}
                    </>
                );
            }
        }
    };

    const calculateTotalWidth = () => {
        const selectModeWidth = isSelectMode ? 50 : 0;
        let baseWidth = 0;
        if (normalizedTab.includes('BILINGUALS')) {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: any) => sum + (col === "#" ? 60 : col === "Notes" ? 400 : 240), 0);
        } else if (normalizedTab.includes('TEAM_LEADER')) {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: any) => sum + ((col === "#" || col.toLowerCase() === "id") ? 60 : col === "Background and Experience" ? 400 : 200), 0);
        } else if (normalizedTab.includes('SHEET') || normalizedTab === 'BLACKLIST' || normalizedTab === 'NOT_ELIGIBLE') {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: string) => sum + (col.startsWith('custom:') ? 140 : getColumnWidth(col)), 0);
        } else {
            return '100%';
        }
        
        const addColWidth = (isEditing && (normalizedTab.includes('SHEET') || normalizedTab === 'BLACKLIST' || normalizedTab === 'NOT_ELIGIBLE' || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER'))) ? 120 : 0;
        return baseWidth + selectModeWidth + addColWidth;
    };

    const totalWidth = calculateTotalWidth();

    return (
        <div className="flex-1 flex flex-col min-h-0 relative text-left">
            {isEditing && Object.keys(localChanges).length > 0 && (
                <div className="absolute -top-12 right-8 z-[60] text-left">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 py-2 px-4 bg-white border border-[#d13438] rounded-none shadow-premium text-left">
                        <div className="w-2 h-2 rounded-none bg-[#d13438] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#d13438] uppercase tracking-wider text-left">Unsaved Changes ({Object.keys(localChanges).length})</span>
                    </motion.div>
                </div>
            )}

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto border border-[#edebe9] bg-[#f3f2f1] shadow-inner relative text-left custom-scrollbar"
            >
                <div style={{
                    height: (filteredList.length * rowHeight) + headerHeight,
                    width: totalWidth,
                    minWidth: 'max-content',
                    position: 'relative'
                }}>
                    <div className="sticky top-0 z-[100] bg-[#f3f2f1]">
                        <table
                            style={{
                                width: totalWidth
                            }}
                            className={cn("border-collapse text-left", (normalizedTab.includes('SHEET') || normalizedTab === 'BLACKLIST' || normalizedTab === 'NOT_ELIGIBLE' || !normalizedTab || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER')) ? "table-fixed" : "w-full table-fixed min-w-max")}
                        >
                            <thead>
                                <tr className="h-12 shadow-sm text-left">
                                    {isSelectMode && (
                                        <th 
                                            style={{ position: 'sticky', left: 0, zIndex: 120 }}
                                            className="w-[50px] bg-white border-r border-[#d2d0ce] border-b-2 border-b-[#d13438] px-3 py-4 text-center shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size > 0 && selectedIds.size === filteredList.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded-none border-surface-300 text-[#d13438] focus:ring-[#d13438] cursor-pointer"
                                            />
                                        </th>
                                    )}

                                    {!(normalizedTab.includes('SHEET') || normalizedTab === 'BLACKLIST' || normalizedTab === 'NOT_ELIGIBLE' || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER')) && (
                                        <th className={cn("sticky z-[110] w-[280px] bg-white border-r border-[#d2d0ce] border-b-2 border-b-[#0078d4] px-4 py-3 text-xs font-bold text-[#323130] uppercase text-left tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.05)]", isSelectMode ? "left-[50px]" : "left-0")}>
                                            Candidate Identity
                                        </th>
                                    )}

                                    {renderHeaderColumns()}
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div style={{ position: 'absolute', top: headerHeight + (startIndex * rowHeight), left: 0, right: 0, minWidth: 'max-content' }}>
                        <table
                            style={{
                                width: totalWidth
                            }}
                            className={cn("border-collapse text-left", (normalizedTab.includes('SHEET') || normalizedTab === 'BLACKLIST' || normalizedTab === 'NOT_ELIGIBLE' || !normalizedTab || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER')) ? "table-fixed" : "w-full table-fixed min-w-max")}
                        >
                            <tbody className="bg-white text-left">
                                {visibleList.map((app, index) => {
                                    const realIndex = startIndex + index;
                                    const rowLocalChanges = localChanges[app.id] || EMPTY_CHANGES;
                                    const appDept = (
                                        rowLocalChanges.department !== undefined 
                                            ? rowLocalChanges.department 
                                            : (app.pis?.final_account || app.endorsement_account || app.department || '')
                                    ).trim().toLowerCase();
                                    const deptObj = departmentsList.find(d => d.name.trim().toLowerCase() === appDept);
                                    return (
                                        <InterviewRow
                                            key={app.id}
                                            app={app}
                                            rowIndex={realIndex}
                                            activeTab={activeTab}
                                            isEditing={isEditing}
                                            localChanges={localChanges[app.id] || EMPTY_CHANGES}
                                            remoteChanges={remoteChanges[app.id] || EMPTY_CHANGES}
                                            handleInputChange={handleInputChange}
                                            isSelectMode={isSelectMode}
                                            isSelected={selectedIds.has(app.id)}
                                            toggleSelect={toggleSelect}
                                            setDeletingId={setDeletingId}
                                            setFocusedApplicant={setFocusedApplicant}
                                            setShowFullscreen={setShowFullscreen}
                                            activeQuestions={activeQuestions}
                                            questions={questions}
                                            onShowNotes={onShowNotes}
                                            isFocused={focusPath?.appId === app.id}
                                            focusedColKey={focusPath?.appId === app.id ? focusPath.colKey : null}
                                            focusedColName={focusPath?.appId === app.id ? focusPath.colName : null}
                                            setFocusPath={setFocusPath}
                                            search={search}
                                            activeUsers={activeUsers}
                                            userFocus={userFocus}
                                            updateActivity={updateActivity}
                                            accounts={accounts}
                                            onShowHistory={onShowHistory}
                                            onViewProfile={onViewProfile}
                                            setIsEditing={setIsEditing}
                                            onRowMouseDown={handleRowMouseDown}
                                            onRowMouseEnter={handleRowMouseEnter}
                                            onShowProcedure={onShowProcedure}
                                            isChecklistOpen={activeChecklistAppId === app.id}
                                            onToggleChecklist={handleToggleChecklist}
                                            highlightedColumns={highlightedColumns[activeTab] || EMPTY_CHANGES}
                                            highlightedCells={highlightedCells[activeTab] || EMPTY_CHANGES}
                                            onCellPaint={handleCellPaint}
                                            onPromoteToHired={onPromoteToHired}
                                            promotingId={promotingId}
                                            activeHireChecklistAppId={activeHireChecklistAppId}
                                            setActiveHireChecklistAppId={setActiveHireChecklistAppId}
                                            eligibilitySettings={deptObj?.eligibilitySettings}
                                            customColumns={customColumns}
                                            customColumnMeta={customColumnMeta}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {activeTab === 'PIVOT' && filteredList.length > 0 && (
                    <div className="sticky bottom-0 z-40 bg-[#f3f2f1] border-t-2 border-[#0078d4] text-left overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse table-fixed min-w-max text-left">
                            <tfoot className="text-left">
                                <tr className="divide-x divide-[#d2d0ce] text-left">
                                    <td className="w-[280px] px-6 py-4 text-right bg-white border-r border-[#d2d0ce]">
                                        <span className="text-[10px] font-black text-[#323130] uppercase tracking-[0.2em]">Summary Totals</span>
                                    </td>
                                    <td className="w-[220px] px-6 py-4 bg-white/50" />
                                    <td className="w-[150px] px-6 py-4 bg-white/50" />
                                    {PIVOT_COLUMNS.map((col, idx) => {
                                        const total = filteredList.reduce((sum: number, app: Application) => {
                                            const val = helpers.getPivotCellValue(app, col);
                                            const num = parseInt(val);
                                            return isNaN(num) ? sum : sum + num;
                                        }, 0);
                                        const isNumericCol = ["Conditional", "FAILED", "PASSED", "Promotion", "Waitlisted", "Withdrawn", "Not Eligible for Rehire", "Grand Total"].includes(col);
                                        return (
                                            <td key={idx} className="w-[220px] px-6 py-4 text-center bg-white/50">
                                                {isNumericCol ? <span className="text-[14px] font-black text-primary-700">{total}</span> : <span className="text-[9px] font-bold text-[#605e5c]">—</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                {filteredList.length === 0 && (
                    <div className="absolute inset-0 bg-[#f3f2f1] flex flex-col items-center justify-center p-8 text-left z-50">
                        <Database size={64} className="text-[#d2d0ce] mb-6 text-left" />
                        <h3 className="text-lg font-bold text-[#323130] uppercase tracking-wider text-left">No Data Detected</h3>
                        <p className="text-[11px] font-bold text-[#605e5c] uppercase tracking-wider mt-3 opacity-60 text-left">Adjust search parameters or synchronize registry</p>
                    </div>
                )}
            </div>
            {activeMenu && (
                <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setActiveMenu(null)} />
                    <div 
                        className="fixed z-[300] bg-white border border-[#edebe9] shadow-premium p-2 flex flex-col w-56 text-left"
                        style={{ top: activeMenu.y + 5, left: activeMenu.x + 5 }}
                    >
                        <div className="px-3 py-1.5 border-b border-[#edebe9] text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1 truncate text-left">
                            {activeMenu.type === 'column' ? `Column: ${activeMenu.colName}` : `Cell Options`}
                        </div>
                        {activeMenu.type === 'column' && (
                            <>
                                <button
                                    onClick={() => handleRenameColumn(activeMenu.colKey, activeMenu.colName)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 font-semibold"
                                >
                                    Rename Column
                                </button>
                                {activeMenu.colKey !== '#' && activeMenu.colKey !== 'Id' && (
                                    <button
                                        onClick={() => {
                                            const existingOptions = customColumnMeta[activeTab]?.[activeMenu.colKey]?.options;
                                            const defaultOptions = getDefaultOptionsForColKey(activeMenu.colKey, activeMenu.colName);
                                            setAddColOptions(existingOptions || defaultOptions);
                                            setAddColNewOption('');
                                            setEditColOptionsModal({
                                                colKey: activeMenu.colKey,
                                                colName: activeMenu.colName
                                            });
                                            setActiveMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 font-semibold"
                                    >
                                        Edit Dropdown Options
                                    </button>
                                )}
                                <hr className="my-1 border-[#edebe9]" />
                                <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Header Only</span>
                                <div className="grid grid-cols-5 gap-1 p-2">
                                    {[
                                        { name: 'Yellow', color: '#fef9c3' },
                                        { name: 'Blue', color: '#dbeafe' },
                                        { name: 'Green', color: '#d1fae5' },
                                        { name: 'Pink', color: '#fce7f3' },
                                        { name: 'Purple', color: '#f3e8ff' }
                                    ].map(clr => (
                                        <button
                                            key={clr.name}
                                            onClick={() => {
                                                setHighlightedHeaders(prev => ({
                                                    ...prev,
                                                    [activeTab]: {
                                                        ...(prev[activeTab] || {}),
                                                        [activeMenu.colKey]: clr.color
                                                    }
                                                }));
                                                setActiveMenu(null);
                                            }}
                                            className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                            style={{ backgroundColor: clr.color }}
                                            title={clr.name}
                                        />
                                    ))}
                                </div>
                                <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Entire Column</span>
                                <div className="grid grid-cols-5 gap-1 p-2">
                                    {[
                                        { name: 'Yellow', color: '#fef9c3' },
                                        { name: 'Blue', color: '#dbeafe' },
                                        { name: 'Green', color: '#d1fae5' },
                                        { name: 'Pink', color: '#fce7f3' },
                                        { name: 'Purple', color: '#f3e8ff' }
                                    ].map(clr => (
                                        <button
                                            key={clr.name}
                                            onClick={() => {
                                                setHighlightedColumns(prev => ({
                                                    ...prev,
                                                    [activeTab]: {
                                                        ...(prev[activeTab] || {}),
                                                        [activeMenu.colKey]: clr.color
                                                    }
                                                }));
                                                setActiveMenu(null);
                                            }}
                                            className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                            style={{ backgroundColor: clr.color }}
                                            title={clr.name}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        {activeMenu.type === 'cell' && (
                            <>
                                <button
                                    onClick={() => handleEditSingleCell(activeMenu.appId!, activeMenu.colKey, activeMenu.colName)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 font-semibold"
                                >
                                    Edit Cell
                                </button>
                                <hr className="my-1 border-[#edebe9]" />
                                <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Cell Only</span>
                                <div className="grid grid-cols-5 gap-1 p-2">
                                    {[
                                        { name: 'Yellow', color: '#fef9c3' },
                                        { name: 'Blue', color: '#dbeafe' },
                                        { name: 'Green', color: '#d1fae5' },
                                        { name: 'Pink', color: '#fce7f3' },
                                        { name: 'Purple', color: '#f3e8ff' }
                                    ].map(clr => (
                                        <button
                                            key={clr.name}
                                            onClick={() => {
                                                const cellKey = `${activeMenu.appId}:${activeMenu.colKey}`;
                                                setHighlightedCells(prev => ({
                                                    ...prev,
                                                    [activeTab]: {
                                                        ...(prev[activeTab] || {}),
                                                        [cellKey]: clr.color
                                                    }
                                                }));
                                                setActiveMenu(null);
                                            }}
                                            className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                            style={{ backgroundColor: clr.color }}
                                            title={clr.name}
                                        />
                                    ))}
                                </div>
                                <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Entire Column</span>
                                <div className="grid grid-cols-5 gap-1 p-2">
                                    {[
                                        { name: 'Yellow', color: '#fef9c3' },
                                        { name: 'Blue', color: '#dbeafe' },
                                        { name: 'Green', color: '#d1fae5' },
                                        { name: 'Pink', color: '#fce7f3' },
                                        { name: 'Purple', color: '#f3e8ff' }
                                    ].map(clr => (
                                        <button
                                            key={clr.name}
                                            onClick={() => {
                                                setHighlightedColumns(prev => ({
                                                    ...prev,
                                                    [activeTab]: {
                                                        ...(prev[activeTab] || {}),
                                                        [activeMenu.colKey]: clr.color
                                                    }
                                                }));
                                                setActiveMenu(null);
                                            }}
                                            className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                            style={{ backgroundColor: clr.color }}
                                            title={clr.name}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => {
                                if (activeMenu.type === 'column') {
                                    setHighlightedColumns(prev => {
                                        const next = { ...prev };
                                        if (next[activeTab]) {
                                            const tabData = { ...next[activeTab] };
                                            delete tabData[activeMenu.colKey];
                                            next[activeTab] = tabData;
                                        }
                                        return next;
                                    });
                                    setHighlightedHeaders(prev => {
                                        const next = { ...prev };
                                        if (next[activeTab]) {
                                            const tabData = { ...next[activeTab] };
                                            delete tabData[activeMenu.colKey];
                                            next[activeTab] = tabData;
                                        }
                                        return next;
                                    });
                                } else {
                                    setHighlightedCells(prev => {
                                        const next = { ...prev };
                                        if (next[activeTab]) {
                                            const tabData = { ...next[activeTab] };
                                            delete tabData[`${activeMenu.appId}:${activeMenu.colKey}`];
                                            next[activeTab] = tabData;
                                        }
                                        return next;
                                    });
                                }
                                setActiveMenu(null);
                            }}
                            className="w-full text-center px-3 py-1.5 text-[11px] text-[#8c8c8c] hover:bg-surface-50 font-bold uppercase tracking-wider border-t border-[#edebe9] mt-1"
                        >
                            Clear Highlight
                        </button>
                    </div>
                </>
            )}

            {customConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-4 text-left font-sans">
                        <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                            <span className="text-[12px] font-black text-[#d13438] uppercase tracking-wider">{customConfirm.title}</span>
                        </div>
                        <p className="text-xs text-surface-650 font-semibold leading-relaxed tracking-wide">
                            {customConfirm.message}
                        </p>
                        <div className="flex items-center justify-end gap-3 mt-2">
                            <button
                                onClick={() => setCustomConfirm(null)}
                                className="px-4 py-2 border border-surface-300 hover:bg-[#f8f9fa] text-surface-700 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={customConfirm.onConfirm}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-750 text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {customPrompt && (
                <PromptModal
                    title={customPrompt.title}
                    message={customPrompt.message}
                    defaultValue={customPrompt.defaultValue}
                    onCancel={() => setCustomPrompt(null)}
                    onConfirm={customPrompt.onConfirm}
                />
            )}

            {/* Add Column Modal */}
            {addColumnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={() => setAddColumnModal(false)}>
                    <div className="bg-white border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-5 text-left font-sans"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                            <span className="text-[12px] font-black text-primary-600 uppercase tracking-wider">Add New Column</span>
                        </div>

                        {/* Column Name */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Column Name</label>
                            <input
                                type="text"
                                autoFocus
                                value={addColName}
                                onChange={(e) => setAddColName(e.target.value)}
                                placeholder="e.g. Interview Result"
                                className="w-full p-3 bg-[#faf9f8] border border-surface-200 rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-semibold text-xs text-surface-900"
                            />
                        </div>

                        {/* Dropdown Options */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Dropdown Options <span className="text-surface-300">(optional — leave empty for free text)</span></label>

                            {/* List of added options */}
                            {addColOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1">
                                    {addColOptions.map((opt, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 border border-primary-200 text-[10px] font-bold text-primary-700 uppercase tracking-wider">
                                            {opt}
                                            <button
                                                onClick={() => setAddColOptions(prev => prev.filter((_, j) => j !== i))}
                                                className="ml-0.5 text-primary-400 hover:text-red-500 font-black text-[10px] leading-none"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Add option input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={addColNewOption}
                                    onChange={(e) => setAddColNewOption(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && addColNewOption.trim()) {
                                            e.preventDefault();
                                            if (!addColOptions.includes(addColNewOption.trim())) {
                                                setAddColOptions(prev => [...prev, addColNewOption.trim()]);
                                            }
                                            setAddColNewOption('');
                                        }
                                    }}
                                    placeholder="Type an option and press Enter"
                                    className="flex-1 p-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 text-xs text-surface-700"
                                />
                                <button
                                    onClick={() => {
                                        if (addColNewOption.trim() && !addColOptions.includes(addColNewOption.trim())) {
                                            setAddColOptions(prev => [...prev, addColNewOption.trim()]);
                                            setAddColNewOption('');
                                        }
                                    }}
                                    className="px-3 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] border border-[#d2d0ce] text-[#323130] font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-[#edebe9]">
                            <button
                                onClick={() => setAddColumnModal(false)}
                                className="px-4 py-2 border border-[#d2d0ce] hover:bg-[#f8f9fa] text-[#323130] font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!addColName.trim()) return;
                                    handleAddColumn(activeTab, addColName, addColOptions);
                                    setAddColumnModal(false);
                                }}
                                disabled={!addColName.trim()}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-750 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95"
                            >
                                Add Column
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Column Options Modal */}
            {editColOptionsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={() => setEditColOptionsModal(null)}>
                    <div className="bg-white border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-5 text-left font-sans"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                            <span className="text-[12px] font-black text-primary-600 uppercase tracking-wider">Edit Dropdown Options: {editColOptionsModal.colName}</span>
                        </div>

                        {/* Dropdown Options */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Dropdown Options <span className="text-surface-300">(leave empty for free text)</span></label>

                            {/* List of current options */}
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 border border-[#edebe9] p-2 bg-[#faf9f8]">
                                {addColOptions.length === 0 ? (
                                    <span className="text-[10px] text-surface-400 italic">No dropdown options defined. Free text only.</span>
                               ) : (
                                    addColOptions.map((opt, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setAddColOptions(prev => {
                                                        const next = [...prev];
                                                        next[i] = newVal;
                                                        return next;
                                                    });
                                                }}
                                                className="flex-1 p-2 bg-white border border-[#d2d0ce] text-xs font-semibold text-surface-800 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 rounded-none outline-none"
                                            />
                                            <button
                                                onClick={() => setAddColOptions(prev => prev.filter((_, j) => j !== i))}
                                                className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                                title="Delete option"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add option input */}
                            <div className="flex gap-2 mt-1">
                                <input
                                    type="text"
                                    value={addColNewOption}
                                    onChange={(e) => setAddColNewOption(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && addColNewOption.trim()) {
                                            e.preventDefault();
                                            if (!addColOptions.includes(addColNewOption.trim())) {
                                                setAddColOptions(prev => [...prev, addColNewOption.trim()]);
                                            }
                                            setAddColNewOption('');
                                        }
                                    }}
                                    placeholder="Type an option and press Enter"
                                    className="flex-1 p-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 text-xs text-surface-700"
                                />
                                <button
                                    onClick={() => {
                                        if (addColNewOption.trim() && !addColOptions.includes(addColNewOption.trim())) {
                                            setAddColOptions(prev => [...prev, addColNewOption.trim()]);
                                            setAddColNewOption('');
                                        }
                                    }}
                                    className="px-3 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] border border-[#d2d0ce] text-[#323130] font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-[#edebe9]">
                            <button
                                onClick={() => setEditColOptionsModal(null)}
                                className="px-4 py-2 border border-[#d2d0ce] hover:bg-[#f8f9fa] text-[#323130] font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const meta = { ...customColumnMeta };
                                    if (!meta[activeTab]) meta[activeTab] = {};
                                    meta[activeTab][editColOptionsModal.colKey] = {
                                        ...meta[activeTab][editColOptionsModal.colKey],
                                        options: addColOptions.length > 0 ? addColOptions : undefined
                                    };
                                    setCustomColumnMeta(meta);
                                    try {
                                        localStorage.setItem('registry_custom_column_meta', JSON.stringify(meta));
                                    } catch {}
                                    setEditColOptionsModal(null);
                                }}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-750 text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PromptModal({ title, message, defaultValue, onCancel, onConfirm }: {
    title: string;
    message: string;
    defaultValue: string;
    onCancel: () => void;
    onConfirm: (val: string) => void;
}) {
    const [val, setVal] = React.useState(defaultValue);
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-4 text-left font-sans">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
                    <span className="text-[12px] font-black text-primary-600 uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">{message}</label>
                    <input
                        type="text"
                        autoFocus
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onConfirm(val);
                            }
                            if (e.key === 'Escape') {
                                onCancel();
                            }
                        }}
                        className="w-full p-3 bg-[#faf9f8] border border-surface-200 rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-semibold text-xs text-surface-900"
                    />
                </div>
                <div className="flex items-center justify-end gap-3 mt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-surface-300 hover:bg-[#f8f9fa] text-surface-700 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(val)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-750 text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
