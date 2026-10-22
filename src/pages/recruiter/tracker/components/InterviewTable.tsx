import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Database, FileEdit, ArrowLeft, ArrowRight, Lock, Unlock, EyeOff, Settings, Eraser, Filter, Search, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { usePresence } from '@/hooks/usePresence';
import type { Application } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import {
    SHEET_COLUMNS, PIVOT_COLUMNS, VLIST_COLUMNS
} from '../constants';
import * as helpers from '../utils/tableHelpers';
import { useAuthStore } from '@/store/authStore';
import { InterviewRow } from './InterviewRow';
import { 
    getColumnWidth, 
    getDefaultOptionsForColKey
} from './tableUtils';

const EMPTY_CHANGES = {};

export interface InterviewTableProps {
    activeTab: string;
    showEssentialOnly?: boolean;
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
    activeTab, showEssentialOnly, filteredList, isEditing, localChanges, handleInputChange,
    isSelectMode, selectedIds, toggleSelect, toggleSelectAll, setDeletingId,
    setFocusedApplicant, setShowFullscreen, activeQuestions, questions,
    onShowNotes, focusPath, setFocusPath,
    search = '', accounts, onShowHistory, onViewProfile,
    activeUsers = [], userFocus = {}, remoteChanges = {}, onShowProcedure,
    onPromoteToHired, promotingId, setIsEditing
}: InterviewTableProps) {
    const { user } = useAuthStore();
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

        // Migration: ensure "Preferred Name" is not overriding any column label
        for (const t of Object.keys(all)) {
            for (const k of Object.keys(all[t])) {
                if (all[t][k] === 'Preferred Name' || all[t][k] === 'PREFERRED NAME') {
                    delete all[t][k];
                }
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
    const [frozenColumns, setFrozenColumns] = React.useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('interview_frozen_columns');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [frozenRightColumns, setFrozenRightColumns] = React.useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('interview_frozen_right_columns');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [hiddenColumns, setHiddenColumns] = React.useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('interview_hidden_columns');
            if (saved) {
                const parsed = JSON.parse(saved);
                for (const t of Object.keys(parsed)) {
                    parsed[t] = parsed[t].filter((c: string) => c !== 'Preferred Name');
                }
                return parsed;
            }
            return {};
        } catch { return {}; }
    });

    const [customColumns, setCustomColumns] = React.useState<Record<string, string[]>>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_columns_by_tab');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [customColumnMeta, setCustomColumnMeta] = React.useState<Record<string, Record<string, { options?: string[] }>>>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_column_meta');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [activeMenu, setActiveMenu] = React.useState<{
        type: 'column' | 'cell';
        colName: string;
        colKey: string;
        appId?: string;
        x: number;
        y: number;
    } | null>(null);

    const [columnMenuTab, setColumnMenuTab] = React.useState<'SETTINGS' | 'FILTER'>('SETTINGS');
    const [columnFilterSearch, setColumnFilterSearch] = React.useState('');
    const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
    const [activeSort, setActiveSort] = React.useState<{ colKey: string; dir: 'asc' | 'desc' } | null>(null);

    const [addColumnModal, setAddColumnModal] = React.useState(false);
    const [addColName, setAddColName] = React.useState('');
    const [addColOptions, setAddColOptions] = React.useState<string[]>([]);
    const [addColNewOption, setAddColNewOption] = React.useState('');
    const [editColOptionsModal, setEditColOptionsModal] = React.useState<{ colKey: string; colName: string } | null>(null);

    React.useEffect(() => {
        try {
            localStorage.setItem('interview_frozen_columns', JSON.stringify(frozenColumns));
        } catch {}
    }, [frozenColumns]);

    React.useEffect(() => {
        try {
            localStorage.setItem('interview_hidden_columns', JSON.stringify(hiddenColumns));
        } catch {}
    }, [hiddenColumns]);

    const currentFrozenKeys = React.useMemo(() => {
        return frozenColumns[activeTab] || [];
    }, [frozenColumns, activeTab]);

    // Get effective columns for the current tab
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
        if ((hiddenColumns[tab] || []).length > 0) {
            effective = effective.filter(col => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                return !(hiddenColumns[tab] || []).includes(colKey);
            });
        }
        if (showEssentialOnly) {
            const essentialNames = ["#", "Id", "First Name", "Middle Name", "Last Name", "Date of Birth"];
            effective = effective.filter(c => essentialNames.some(name => c.toLowerCase() === name.toLowerCase()));
        }
        return effective;
    }, [customColumns, hiddenColumns, questions, showEssentialOnly]);

    const columnLeftOffsets = React.useMemo(() => {
        const offsets: Record<string, number> = {};
        let currentOffset = isSelectMode ? 50 : 0;
        const norm = activeTab.toUpperCase();

        if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            const cols = getEffectiveColumns(activeTab);
            cols.forEach((col: string) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                const width = isCustom ? 140 : getColumnWidth(col);
                if (currentFrozenKeys.includes(colKey)) {
                    offsets[colKey] = currentOffset;
                    currentOffset += width;
                }
            });
        }
        return offsets;
    }, [activeTab, currentFrozenKeys, isSelectMode, getEffectiveColumns, questions]);

    const currentFrozenRightKeys = React.useMemo(() => {
        return frozenRightColumns[activeTab] || [];
    }, [activeTab, frozenRightColumns]);

    const columnRightOffsets = React.useMemo(() => {
        const offsets: Record<string, number> = {};
        let currentOffset = 0;
        const norm = activeTab.toUpperCase();

        if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            const cols = getEffectiveColumns(activeTab);
            const reversedCols = [...cols].reverse();
            reversedCols.forEach((col: string) => {
                const isCustom = col.startsWith('custom:');
                const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                const width = isCustom ? 140 : getColumnWidth(col);
                if (currentFrozenRightKeys.includes(colKey)) {
                    offsets[colKey] = currentOffset;
                    currentOffset += width;
                }
            });
        }
        return offsets;
    }, [activeTab, currentFrozenRightKeys, getEffectiveColumns, questions]);

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
                        setCustomColumnNames(prev => {
                            const updated = {
                                ...prev,
                                [activeTab]: {
                                    ...(prev[activeTab] || {}),
                                    [colKey]: newName
                                }
                            };
                            localStorage.setItem('registry_custom_column_names_all', JSON.stringify(updated));
                            return updated;
                        });
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

    const rowHeight = 36;
    const headerHeight = 40;
    const overscan = 20;

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

    const getInterviewCellValue = React.useCallback((targetApp: Application, col: string, appIdx: number) => {
        const norm = activeTab.toUpperCase();
        let val: any = '';
        const isCustom = col.startsWith('custom:');
        const colKey = isCustom ? col : (norm.includes('BILINGUALS') ? helpers.getBilingualsColumnKey(col) : helpers.getSheetColumnKey(col, questions));
        
        if (norm === 'PIVOT') {
            val = helpers.getPivotCellValue(targetApp, col);
        } else if (norm === 'VLIST') {
            val = helpers.getVlistCellValue(targetApp, col);
        } else if (!norm.includes('BILINGUALS') && !norm.includes('TEAM_LEADER') && !norm.includes('SHEET') && !['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            if (col === 'Position') val = (targetApp as any).position;
            else if (col === 'Account') val = (targetApp as any).account;
            else if (col === 'Status') val = targetApp.current_status;
            else if (col === 'Final Remarks') val = targetApp.interview_responses?.['master_remarks'] || targetApp.master_remarks;
            else val = targetApp.interview_responses?.[col] || '';
        } else {
            const localChange = localChanges[targetApp.id]?.[colKey];
            const remoteChange = remoteChanges?.[targetApp.id]?.[colKey];
            if (localChange !== undefined) {
                val = typeof localChange === 'object' ? JSON.stringify(localChange) : String(localChange);
            } else if (remoteChange !== undefined) {
                val = String(remoteChange);
            } else {
                if (norm.includes('BILINGUALS')) {
                    val = isCustom ? ((targetApp.pis as any)?.[colKey.substring(7)] || targetApp.interview_responses?.[colKey] || '') : helpers.getBilingualsCellValue(targetApp, col, appIdx);
                } else if (norm.includes('TEAM_LEADER')) {
                    val = isCustom ? ((targetApp.pis as any)?.[colKey.substring(7)] || targetApp.interview_responses?.[colKey] || '') : helpers.getTeamLeaderCellValue(targetApp, col, appIdx);
                } else {
                    val = isCustom ? ((targetApp.pis as any)?.[colKey.substring(7)] || targetApp.interview_responses?.[colKey] || '') : helpers.getSheetCellValue(targetApp, col, appIdx, questions);
                }
            }
        }
        return String(val || '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ');
    }, [activeTab, localChanges, remoteChanges, questions]);

    const processedList = React.useMemo(() => {
        let list = [...filteredList];

        const filterKeys = Object.keys(activeFilters);
        if (filterKeys.length > 0) {
            list = list.filter((app, idx) => {
                return filterKeys.every(col => {
                    const allowedVals = activeFilters[col];
                    if (!allowedVals || allowedVals.length === 0) return false;
                    const val = getInterviewCellValue(app, col, idx);
                    const finalVal = (val === undefined || val === null || String(val).trim() === '' || String(val) === '---') ? '(Blanks)' : String(val).trim();
                    return allowedVals.includes(finalVal);
                });
            });
        }

        if (activeSort) {
            list.sort((a, b) => {
                const valA = getInterviewCellValue(a, activeSort.colKey, 0);
                const valB = getInterviewCellValue(b, activeSort.colKey, 0);
                
                const strA = String(valA || '').trim().toLowerCase();
                const strB = String(valB || '').trim().toLowerCase();
                
                const numA = parseFloat(strA);
                const numB = parseFloat(strB);
                
                let cmp = 0;
                if (!isNaN(numA) && !isNaN(numB) && strA === String(numA) && strB === String(numB)) {
                    cmp = numA - numB;
                } else {
                    cmp = strA.localeCompare(strB);
                }
                
                return activeSort.dir === 'asc' ? cmp : -cmp;
            });
        }

        return list;
    }, [filteredList, activeFilters, activeSort, getInterviewCellValue]);

    const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        const newStart = Math.max(0, Math.floor((top - headerHeight) / rowHeight) - overscan);
        const newEnd = Math.min(processedList.length, Math.ceil((top + containerHeight) / rowHeight) + overscan);
        
        setVisibleRange(prev => {
            if (prev.start === newStart && prev.end === newEnd) return prev;
            return { start: newStart, end: newEnd };
        });
    }, [containerHeight, processedList.length]);

    // Recalculate visible range when container height or list length changes
    React.useEffect(() => {
        const newStart = Math.max(0, Math.floor(0 / rowHeight) - overscan);
        const newEnd = Math.min(processedList.length, Math.ceil(containerHeight / rowHeight) + overscan);
        setVisibleRange({ start: newStart, end: newEnd });
    }, [containerHeight, processedList.length]);

    const startIndex = visibleRange.start;
    const endIndex = visibleRange.end;
    const visibleList = React.useMemo(() => {
        return processedList.slice(startIndex, endIndex);
    }, [processedList, startIndex, endIndex]);

    const terms = search.toLowerCase().split('|').map(t => t.trim()).filter(t => t.length >= 2);
    const hasSearch = terms.length > 0;

    const isPulsingColumn = (name: string) => {
        return false;
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
                                    "bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider overflow-hidden transition-colors cursor-pointer",
                                    col === "#" && "shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                                    isPulsingColumn(col) && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                                )}>
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <div className="truncate text-center flex-1" title={displayCol}>{displayCol}</div>
                                    {isEditing && col !== "#" && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'left'); }}
                                                disabled={idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id'))}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white dark:bg-slate-900 ml-0.5"
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
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-surface-200 text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
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
                                    "bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider overflow-hidden transition-colors cursor-pointer",
                                    col === "#" && "shadow-[2px_0_4px_rgba(0,0,0,0.05)]",
                                    isPulsingColumn(col) && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                                )}>
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <div className="truncate text-left flex-1" title={displayCol}>{displayCol}</div>
                                    {isEditing && col !== "#" && (
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'left'); }}
                                                disabled={idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id'))}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white dark:bg-slate-900 ml-0.5"
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
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-surface-200 text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
                            style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                        >
                            + Add Column
                        </th>
                    )}
                </>
            );
        }

        // 2. Main Sheet Tables (SHEET, BLACKLIST, NOT_ELIGIBLE, WAITLISTED, etc.)
        if (norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            const columns = getEffectiveColumns(activeTab);
            return (
                <>
                    {columns.map((col, idx) => {
                        const isCustom = col.startsWith('custom:');
                        const colKey = isCustom ? col : helpers.getSheetColumnKey(col, questions);
                        const displayCol = currentTabNames[colKey] || (isCustom ? col.substring(7) : col);

                        const width = isCustom ? 140 : getColumnWidth(col);

                        const isFrozen = currentFrozenKeys.includes(colKey);
                        const isFrozenRight = currentFrozenRightKeys.includes(colKey);
                        const leftOffset = columnLeftOffsets[colKey];
                        const rightOffset = columnRightOffsets[colKey];

                        return (
                            <th
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu({
                                        type: 'column',
                                        colName: displayCol,
                                        colKey,
                                        x: e.clientX,
                                        y: e.clientY
                                    });
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveMenu({
                                        type: 'column',
                                        colName: displayCol,
                                        colKey,
                                        x: e.clientX,
                                        y: e.clientY
                                    });
                                }}
                                style={{
                                    width,
                                    minWidth: width,
                                    maxWidth: width,
                                    position: (isFrozen || isFrozenRight) ? 'sticky' : undefined,
                                    left: isFrozen ? leftOffset : undefined,
                                    right: isFrozenRight ? rightOffset : undefined,
                                    zIndex: (isFrozen || isFrozenRight) ? 115 : undefined,
                                    backgroundColor: currentTabHeaders[colKey] || currentTabColumns[colKey] || ((isFrozen || isFrozenRight) ? '#f3f2f1' : undefined)
                                }}
                                className={cn(
                                    "border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider overflow-hidden transition-colors bg-[#f3f2f1] cursor-pointer",
                                    isFrozen && "shadow-[2px_0_5px_rgba(0,0,0,0.08)] border-r-2 border-r-[#0078d4]",
                                    isFrozenRight && "shadow-[-2px_0_5px_rgba(0,0,0,0.08)] border-l-2 border-l-[#0078d4]",
                                    isPulsingColumn(col) && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
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
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    (idx === 0 || (idx === 1 && (columns[0] === '#' || columns[0] === 'Id')) || (idx === 2 && (columns[0] === 'Id' && (columns[1] === "Candidate's Name" || columns[1] === "Name"))))
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column left"
                                            >
                                                ←
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveColumn(activeTab, idx, 'right'); }}
                                                disabled={idx === columns.length - 1}
                                                className={cn(
                                                    "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white dark:bg-slate-900",
                                                    idx === columns.length - 1
                                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                        : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                                )}
                                                title="Move column right"
                                            >
                                                →
                                            </button>
                                            {isCustom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveColumn(activeTab, col); }}
                                                    className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-all bg-white dark:bg-slate-900 ml-0.5"
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
                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-surface-200 text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center animate-fade-in"
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
                        <th className="sticky left-0 z-[110] w-[280px] bg-white dark:bg-slate-900 border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                            Final Account
                        </th>
                        <th className="w-[220px] relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-center tracking-wider">
                            Status
                        </th>
                        <th className="w-[150px] relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-center tracking-wider">
                            CEFR
                        </th>
                        {PIVOT_COLUMNS.map((col, idx) => (
                            <th key={idx} className="w-[220px] relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-center tracking-wider">
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
                            <th key={idx} className={cn("relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider", isPulsingColumn(col) && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]")}>
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
                        {(!hasSearch || !matchesAnyField || terms.some(t => "preferred".includes(t))) && (
                            <th 
                                style={{ width: 140 }}
                                className="sticky left-[280px] z-[110] bg-[#faf9f8] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider"
                            >
                                Preferred Name
                            </th>
                        )}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "position".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Position') }}
                                className="sticky left-[420px] z-[110] bg-[#faf9f8] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider"
                            >
                                Position
                            </th>
                        )}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "account".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Account') }}
                                className={cn(
                                "bg-[#f3f2f1] border-b border-r border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider",
                                isPulsingColumn("Account") && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                            )}>
                                Account
                            </th>
                        )}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "status".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Status') }}
                                className={cn(
                                "bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-center tracking-wider",
                                isPulsingColumn("Status") && "bg-[#bad8f2] animate-pulse-column shadow-[inset_0_-4px_0_#0078d4]"
                            )}>
                                Status
                            </th>
                        )}
                        {activeQuestions.map(q => {
                            if (hasSearch && matchesAnyField && !terms.some(t => q.question_text.toLowerCase().includes(t))) return null;
                            return (
                                <th key={q.id} className="w-[400px] relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider overflow-hidden">
                                    <div className="truncate" title={q.question_text}>{q.question_text}</div>
                                </th>
                            );
                        }).filter(Boolean)}
                        {(!hasSearch || !matchesAnyField || terms.some(t => "remarks".includes(t))) && (
                            <th 
                                style={{ width: getColumnWidth('Summary') }}
                                className="relative z-[90] bg-[#f3f2f1] border-b border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider"
                            >
                                Final Remarks
                            </th>
                        )}
                    </>
                );
            }
        }
    };

    const [dragSelectionStart, setDragSelectionStart] = React.useState<{row: number, col: number, appId: string} | null>(null);
    const [dragSelectionEnd, setDragSelectionEnd] = React.useState<{row: number, col: number, appId: string} | null>(null);
    const [copiedBounds, setCopiedBounds] = React.useState<{startRow: number, endRow: number, startCol: number, endCol: number} | null>(null);
    const isDragCopyingRef = React.useRef(false);
    const [clipboardToast, setClipboardToast] = React.useState(false);

    const handleCellMouseDown = React.useCallback((e: React.MouseEvent, rowIdx: number, colIdx: number, appId: string) => {
        if (e.button !== 0 || isSelectMode) return;
        
        const target = e.target as HTMLElement;
        const interactiveTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A', 'OPTION'];
        const isInteractive = interactiveTags.includes(target.tagName) || target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select');
        if (isInteractive) return;

        setDragSelectionStart({ row: rowIdx, col: colIdx, appId });
        setDragSelectionEnd({ row: rowIdx, col: colIdx, appId });
        setCopiedBounds(null);
        isDragCopyingRef.current = true;
    }, [isSelectMode]);

    const handleCellMouseEnter = React.useCallback((rowIdx: number, colIdx: number) => {
        if (isDragCopyingRef.current) {
            setDragSelectionEnd(prev => prev ? { ...prev, row: rowIdx, col: colIdx } : null);
        }
    }, []);

    const handleCellMouseUp = React.useCallback(() => {
        isDragCopyingRef.current = false;
    }, []);

    React.useEffect(() => {
        const handleGlobalMouseUp = () => { isDragCopyingRef.current = false; };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const selectionBounds = React.useMemo(() => {
        if (!dragSelectionStart || !dragSelectionEnd) return null;
        return {
            startRow: Math.min(dragSelectionStart.row, dragSelectionEnd.row),
            endRow: Math.max(dragSelectionStart.row, dragSelectionEnd.row),
            startCol: Math.min(dragSelectionStart.col, dragSelectionEnd.col),
            endCol: Math.max(dragSelectionStart.col, dragSelectionEnd.col),
        };
    }, [dragSelectionStart, dragSelectionEnd]);

    const executeCopy = async (startRow: number, endRow: number, startCol: number, endCol: number) => {
        let tsvData = '';
        let htmlData = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv=Content-Type content="text/html; charset=utf-8"></head>
<body>
<!--StartFragment-->
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; font-family: Calibri, sans-serif;">`;
        
        const norm = activeTab.toUpperCase();
        let cols: string[] = [];
        if (norm.includes('BILINGUALS') || norm.includes('TEAM_LEADER') || norm.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(norm)) {
            cols = getEffectiveColumns(activeTab);
        } else if (norm === 'PIVOT') {
            cols = ['Final Account', 'Status', 'CEFR', ...PIVOT_COLUMNS];
        } else if (norm === 'VLIST') {
            cols = [...VLIST_COLUMNS];
        } else {
            cols = ['Position', 'Account', 'Status', ...activeQuestions.map(q => q.question_text), 'Final Remarks'];
        }

        for (let r = startRow; r <= endRow; r++) {
            const appIdx = r;
            const targetApp = processedList[appIdx];
            if (!targetApp) continue;
            const rowData = [];
            htmlData += '<tr>';
            for (let c = startCol; c <= endCol; c++) {
                const col = cols[c];
                if (!col) continue;

                const val = getInterviewCellValue(targetApp, col, appIdx);

                rowData.push(val);
                
                const escapedVal = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                htmlData += `<td style="border: 1px solid #d4d4d4; padding: 4px 8px; white-space: nowrap; mso-border-alt: solid #d4d4d4 .5pt;">${escapedVal}</td>`;
            }
            htmlData += '</tr>';
            tsvData += rowData.join('\t') + '\n';
        }
        htmlData += '</table>\n<!--EndFragment-->\n</body>\n</html>';
        
        if (tsvData) {
            try {
                if (navigator.clipboard && navigator.clipboard.write) {
                    const htmlBlob = new Blob([htmlData], { type: 'text/html' });
                    const textBlob = new Blob([tsvData], { type: 'text/plain' });
                    const item = new ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    });
                    await navigator.clipboard.write([item]);
                } else {
                    throw new Error('Clipboard API not supported');
                }
            } catch (err) {
                console.error('Clipboard API failed, using execCommand', err);
                const handleCopyFallback = (e: Event) => {
                    const clipboardEvent = e as ClipboardEvent;
                    clipboardEvent.clipboardData?.setData('text/html', htmlData);
                    clipboardEvent.clipboardData?.setData('text/plain', tsvData);
                    clipboardEvent.preventDefault();
                };
                document.addEventListener('copy', handleCopyFallback);
                const textarea = document.createElement('textarea');
                textarea.value = ' ';
                textarea.style.position = 'fixed';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                document.removeEventListener('copy', handleCopyFallback);
            }
            setCopiedBounds({ startRow, endRow, startCol, endCol });
            setClipboardToast(true);
            setTimeout(() => setClipboardToast(false), 2000);
        }
    };

    const handleNativeCopy = React.useCallback((e: React.ClipboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        
        if (selectionBounds) {
            e.preventDefault();
            const { startRow, endRow, startCol, endCol } = selectionBounds;
            executeCopy(startRow, endRow, startCol, endCol);
            return;
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const container = document.createElement('div');
        for (let i = 0; i < selection.rangeCount; i++) {
            container.appendChild(selection.getRangeAt(i).cloneContents());
        }

        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            (table as HTMLElement).style.borderCollapse = 'collapse';
            (table as HTMLElement).style.fontFamily = 'Calibri, sans-serif';
        });

        const cells = container.querySelectorAll('th, td');
        cells.forEach(cell => {
            (cell as HTMLElement).style.border = '1px solid #d4d4d4';
            (cell as HTMLElement).style.padding = '4px 8px';
            (cell as HTMLElement).style.whiteSpace = 'nowrap';
        });

        const rows = container.querySelectorAll('tr');
        rows.forEach(row => {
            row.querySelectorAll('td, th').forEach(cell => {
                const text = cell.textContent || '';
                (cell as HTMLElement).textContent = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
            });
        });

        e.preventDefault();
        e.clipboardData.setData('text/html', container.innerHTML);
        e.clipboardData.setData('text/plain', container.innerText);
    }, [selectionBounds, activeTab, processedList, localChanges, remoteChanges, getEffectiveColumns, activeQuestions]);

    React.useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectionBounds) {
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

                e.preventDefault();
                const { startRow, endRow, startCol, endCol } = selectionBounds;
                await executeCopy(startRow, endRow, startCol, endCol);
            }
            
            if (e.key === 'Escape') {
                setDragSelectionStart(null);
                setDragSelectionEnd(null);
                setCopiedBounds(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectionBounds, processedList, localChanges]);

    const calculateTotalWidth = () => {
        const selectModeWidth = isSelectMode ? 50 : 0;
        let baseWidth = 0;
        if (normalizedTab.includes('BILINGUALS')) {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: any) => sum + (col === "#" ? 60 : col === "Notes" ? 400 : 240), 0);
        } else if (normalizedTab.includes('TEAM_LEADER')) {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: any) => sum + ((col === "#" || col.toLowerCase() === "id") ? 60 : col === "Background and Experience" ? 400 : 200), 0);
        } else if (normalizedTab.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(normalizedTab)) {
            const cols = getEffectiveColumns(activeTab);
            baseWidth = cols.reduce((sum: number, col: string) => sum + (col.startsWith('custom:') ? 140 : getColumnWidth(col)), 0);
        } else {
            return '100%';
        }
        
        const addColWidth = (isEditing && (normalizedTab.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(normalizedTab) || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER'))) ? 120 : 0;
        return baseWidth + selectModeWidth + addColWidth;
    };

    const totalWidth = calculateTotalWidth();

    return (
        <div className="flex-1 flex flex-col min-h-0 relative text-left">
            {isEditing && Object.keys(localChanges).length > 0 && (
                <div className="absolute -top-12 right-8 z-[60] text-left">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 py-2 px-4 bg-white dark:bg-slate-900 border border-[#d13438] rounded-none shadow-premium text-left">
                        <div className="w-2 h-2 rounded-none bg-[#d13438] animate-pulse" />
                        <span className="text-[10px] font-bold text-[#d13438] uppercase tracking-wider text-left">Unsaved Changes ({Object.keys(localChanges).length})</span>
                    </motion.div>
                </div>
            )}

            <div
                ref={containerRef}
                onScroll={handleScroll}
                onCopy={handleNativeCopy}
                className={cn("flex-1 overflow-auto border border-surface-200 bg-[#f3f2f1] shadow-inner relative text-left custom-scrollbar", isSelectMode && "select-none")}
            >
                <div style={{
                    width: totalWidth,
                    minWidth: 'max-content',
                }}>
                    <table
                        style={{
                            width: totalWidth
                        }}
                        className={cn("border-collapse text-left", (normalizedTab.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(normalizedTab) || !normalizedTab || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER')) ? "table-fixed" : "w-full table-fixed min-w-max", isSelectMode && "select-none")}
                    >
                        <thead className="sticky top-0 z-[100] bg-[#f3f2f1]">
                            <tr className="h-12 shadow-sm text-left">
                                {isSelectMode && (
                                    <th 
                                        style={{ position: 'sticky', left: 0, zIndex: 120 }}
                                        className="w-[50px] bg-white dark:bg-slate-900 border-r border-[#d2d0ce] border-b-2 border-b-[#d13438] px-3 py-4 text-center shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size > 0 && selectedIds.size === processedList.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded-none border-surface-300 text-[#d13438] focus:ring-[#d13438] cursor-pointer"
                                        />
                                    </th>
                                )}

                                {!(normalizedTab.includes('SHEET') || ['BLACKLIST', 'BLACKLISTED', 'NOT_ELIGIBLE', 'NOT_ELIGIBLE_FOR_REHIRE', 'WAITLISTED', 'WITHDRAWN', 'PROMOTED', 'LATERAL_TRANSFER'].includes(normalizedTab) || normalizedTab.includes('BILINGUALS') || normalizedTab.includes('TEAM_LEADER')) && (
                                    <th className={cn("sticky z-[110] w-[280px] bg-white dark:bg-slate-900 border-b border-r border-surface-200 px-4 py-3 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase text-left tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.05)]", isSelectMode ? "left-[50px]" : "left-0")}>
                                        Candidate Identity
                                    </th>
                                )}

                                {renderHeaderColumns()}
                            </tr>
                        </thead>
                        <tbody className={cn("bg-white dark:bg-slate-900 text-left", isSelectMode && "select-none")} onMouseLeave={() => setIsDragging(false)}>
                            <tr style={{ height: startIndex * rowHeight, contain: 'strict' }} />
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
                                            showEssentialOnly={showEssentialOnly}
                                            hiddenColumns={hiddenColumns}
                                            userFocus={userFocus}
                                            activeUsers={activeUsers}
                                            onPromoteToHired={onPromoteToHired}
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
                                            promotingId={promotingId}
                                            activeHireChecklistAppId={activeHireChecklistAppId}
                                            setActiveHireChecklistAppId={setActiveHireChecklistAppId}
                                            eligibilitySettings={deptObj?.eligibilitySettings}
                                            customColumns={customColumns}
                                            customColumnMeta={customColumnMeta}
                                            frozenKeys={currentFrozenKeys}
                                            frozenRightKeys={currentFrozenRightKeys}
                                            columnLeftOffsets={columnLeftOffsets}
                                            columnRightOffsets={columnRightOffsets}
                                            selectionBounds={selectionBounds}
                                            copiedBounds={copiedBounds}
                                            dragAnchor={dragSelectionStart}
                                            onCellMouseDown={handleCellMouseDown}
                                            onCellMouseEnter={handleCellMouseEnter}
                                            onCellMouseUp={handleCellMouseUp}
                                        />
                                    );
                                })}
                                <tr style={{ height: Math.max(0, (processedList.length - endIndex) * rowHeight), contain: 'strict' }} />
                            </tbody>
                        </table>
                    </div>
                {activeTab === 'PIVOT' && processedList.length > 0 && (
                    <div className="sticky bottom-0 z-40 bg-[#f3f2f1] border-t-2 border-[#0078d4] text-left overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse table-fixed min-w-max text-left">
                            <tfoot className="text-left">
                                <tr className="divide-x divide-[#d2d0ce] text-left">
                                    <td className="w-[280px] px-6 py-4 text-right bg-white dark:bg-slate-900 border-r border-[#d2d0ce]">
                                        <span className="text-[10px] font-black text-[#323130] dark:text-slate-300 uppercase tracking-[0.2em]">Summary Totals</span>
                                    </td>
                                    <td className="w-[220px] px-6 py-4 bg-white/50 dark:bg-slate-900/50" />
                                    <td className="w-[150px] px-6 py-4 bg-white/50 dark:bg-slate-900/50" />
                                    {PIVOT_COLUMNS.map((col, idx) => {
                                        const total = processedList.reduce((sum: number, app: Application) => {
                                            const val = helpers.getPivotCellValue(app, col);
                                            const num = parseInt(val);
                                            return isNaN(num) ? sum : sum + num;
                                        }, 0);
                                        const isNumericCol = ["Conditional", "FAILED", "PASSED", "Promotion", "Waitlisted", "Withdrawn", "Not Eligible for Rehire", "Grand Total"].includes(col);
                                        return (
                                            <td key={idx} className="w-[220px] px-6 py-4 text-center bg-white/50 dark:bg-slate-900/50">
                                                {isNumericCol ? <span className="text-[14px] font-black text-primary-700">{total}</span> : <span className="text-[9px] font-bold text-[#605e5c] dark:text-slate-400">—</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                {processedList.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-20"
                    >
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        >
                            <Database size={64} className="text-[#0078d4] mb-6" />
                        </motion.div>
                        <h3 className="text-xl font-black text-[#323130] dark:text-slate-300 uppercase tracking-widest text-center">No Data Detected</h3>
                        <p className="text-xs font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest mt-4 opacity-70 text-center max-w-sm">
                            Adjust search parameters or synchronize registry to populate this view
                        </p>
                    </motion.div>
                )}
            </div>
            {activeMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setActiveMenu(null)} />
                    <div 
                        className="fixed z-[300] bg-white dark:bg-slate-900 border border-surface-200 shadow-premium p-2 flex flex-col w-56 text-left"
                        style={{ top: activeMenu.y + 5, left: activeMenu.x + 5 }}
                    >
                        <div className="px-2.5 py-1 border-b border-surface-200 text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-0.5 truncate text-left">
                            {activeMenu.type === 'column' ? `Column: ${activeMenu.colName}` : `Cell Options`}
                        </div>
                        {activeMenu.type === 'column' && (
                            <>
                                {/* 2 Tabs Navigation: Settings vs Filter */}
                                <div className="flex w-full mb-1 border-b border-surface-200">
                                    <button
                                        type="button"
                                        onClick={() => setColumnMenuTab('SETTINGS')}
                                        className={cn(
                                            "flex-1 text-[11px] font-bold py-1.5 uppercase transition-colors border-b-2 flex items-center justify-center gap-1",
                                            columnMenuTab === 'SETTINGS'
                                                ? "text-[#0078D4] border-[#0078D4]"
                                                : "text-[#605E5C] border-transparent hover:text-[#201F1E]"
                                        )}
                                    >
                                        <Settings size={13} />
                                        <span>Settings</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setColumnMenuTab('FILTER')}
                                        className={cn(
                                            "flex-1 text-[11px] font-bold py-1.5 uppercase transition-colors border-b-2 flex items-center justify-center gap-1",
                                            columnMenuTab === 'FILTER'
                                                ? "text-[#0078D4] border-[#0078D4]"
                                                : "text-[#605E5C] border-transparent hover:text-[#201F1E]"
                                        )}
                                    >
                                        <Filter size={13} />
                                        <span>Filter</span>
                                        {activeFilters[activeMenu.colKey] && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-0.5" />
                                        )}
                                    </button>
                                </div>
                                {columnMenuTab === 'SETTINGS' ? (
                                    <motion.div
                                        key="settings-tab-content"
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex flex-col gap-0.5"
                                    >
                                        <button
                                            onClick={() => handleRenameColumn(activeMenu.colKey, activeMenu.colName)}
                                            className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50 font-semibold flex items-center gap-2"
                                        >
                                            <FileEdit size={13} className="text-surface-400 shrink-0" />
                                            Rename Column
                                        </button>
                                {(() => {
                                    const cols = getEffectiveColumns(activeTab);
                                    const rawIdx = cols.findIndex(c => {
                                        const isCustom = c.startsWith('custom:');
                                        const k = isCustom ? c : helpers.getSheetColumnKey(c, questions);
                                        return k === activeMenu.colKey;
                                    });
                                    return (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (rawIdx > 0) handleMoveColumn(activeTab, rawIdx, 'left');
                                                    setActiveMenu(null);
                                                }}
                                                disabled={rawIdx <= 0}
                                                className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50 font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ArrowLeft size={13} className="text-surface-400 shrink-0" />
                                                Move Column Left
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (rawIdx < cols.length - 1) handleMoveColumn(activeTab, rawIdx, 'right');
                                                    setActiveMenu(null);
                                                }}
                                                disabled={rawIdx >= cols.length - 1}
                                                className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50 font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ArrowRight size={13} className="text-surface-400 shrink-0" />
                                                Move Column Right
                                            </button>
                                        </>
                                    );
                                })()}
                                <button
                                    onClick={() => {
                                        const colKey = activeMenu.colKey;
                                        setFrozenColumns(prev => {
                                            const currentTabFrozen = prev[activeTab] || [];
                                            const isAlreadyFrozen = currentTabFrozen.includes(colKey);
                                            let nextTabFrozen: string[];
                                            if (isAlreadyFrozen) {
                                                nextTabFrozen = currentTabFrozen.filter(k => k !== colKey);
                                            } else {
                                                nextTabFrozen = [...currentTabFrozen, colKey];
                                            }
                                            return { ...prev, [activeTab]: nextTabFrozen };
                                        });
                                        setActiveMenu(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-indigo-50 hover:text-indigo-700 font-semibold flex items-center gap-2 transition-colors"
                                >
                                    {(frozenColumns[activeTab] || []).includes(activeMenu.colKey) ? (
                                        <>
                                            <Unlock size={13} className="text-orange-500 shrink-0" />
                                            Unfreeze Left
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={13} className="text-indigo-500 shrink-0" />
                                            Freeze to Left
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        const colKey = activeMenu.colKey;
                                        setFrozenRightColumns(prev => {
                                            const currentTabFrozen = prev[activeTab] || [];
                                            const isAlreadyFrozen = currentTabFrozen.includes(colKey);
                                            let nextTabFrozen: string[];
                                            if (isAlreadyFrozen) {
                                                nextTabFrozen = currentTabFrozen.filter(k => k !== colKey);
                                            } else {
                                                nextTabFrozen = [...currentTabFrozen, colKey];
                                            }
                                            return { ...prev, [activeTab]: nextTabFrozen };
                                        });
                                        setActiveMenu(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold flex items-center gap-2 transition-colors"
                                >
                                    {(frozenRightColumns[activeTab] || []).includes(activeMenu.colKey) ? (
                                        <>
                                            <Unlock size={13} className="text-orange-500 shrink-0" />
                                            Unfreeze Right
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={13} className="text-emerald-500 shrink-0" />
                                            Freeze to Right
                                        </>
                                    )}
                                </button>
                                {((frozenColumns[activeTab] || []).length > 0 || (frozenRightColumns[activeTab] || []).length > 0) && (
                                    <button
                                        onClick={() => {
                                            setFrozenColumns(prev => { const next = { ...prev }; delete next[activeTab]; return next; });
                                            setFrozenRightColumns(prev => { const next = { ...prev }; delete next[activeTab]; return next; });
                                            setActiveMenu(null);
                                        }}
                                        className="w-full text-left px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <Unlock size={13} className="text-red-500 shrink-0" />
                                        Unfreeze All Columns
                                    </button>
                                )}
                                {activeMenu.colKey !== '#' && activeMenu.colKey !== 'Id' && (
                                    <button
                                        onClick={() => {
                                            setHiddenColumns(prev => ({
                                                ...prev,
                                                [activeTab]: [...(prev[activeTab] || []), activeMenu.colKey]
                                            }));
                                            setActiveMenu(null);
                                        }}
                                        className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50 font-semibold flex items-center gap-2"
                                    >
                                        <EyeOff size={13} className="text-surface-400 shrink-0" />
                                        Hide Column
                                    </button>
                                )}
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
                                        className="w-full text-left px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50 font-semibold flex items-center gap-2"
                                    >
                                        <Settings size={13} className="text-emerald-500 shrink-0" />
                                        Edit Dropdown Options
                                    </button>
                                )}
                                <hr className="my-0.5 border-surface-200" />
                                <span className="px-2.5 py-0.5 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Header Only</span>
                                <div className="grid grid-cols-5 gap-1.5 p-1.5">
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
                                            className="w-6 h-6 rounded-full border border-[#d2d0ce] hover:scale-110 active:scale-95 transition-all shadow-sm"
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
                                            className="w-6 h-6 rounded-full border border-[#d2d0ce] hover:scale-110 active:scale-95 transition-all shadow-sm"
                                            style={{ backgroundColor: clr.color }}
                                            title={clr.name}
                                        />
                                    ))}
                                </div>
                                {((highlightedHeaders[activeTab]?.[activeMenu.colKey]) || (highlightedColumns[activeTab]?.[activeMenu.colKey])) && (
                                    <button
                                        onClick={() => {
                                            setHighlightedHeaders(prev => {
                                                const next = { ...prev };
                                                if (next[activeTab]) delete next[activeTab][activeMenu.colKey];
                                                return next;
                                            });
                                            setHighlightedColumns(prev => {
                                                const next = { ...prev };
                                                if (next[activeTab]) delete next[activeTab][activeMenu.colKey];
                                                return next;
                                            });
                                            setActiveMenu(null);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-100 font-bold uppercase tracking-wider transition-colors border-t border-surface-100 mt-1 pt-1.5 flex items-center gap-2 justify-center"
                                    >
                                        <Eraser size={14} className="text-surface-400" />
                                        Clear Highlight
                                    </button>
                                )}
                                </motion.div>
                                ) : (
                                    <motion.div
                                        key="filter-tab-content"
                                        initial={{ opacity: 0, x: 4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex flex-col gap-2 p-0.5 text-xs"
                                    >
                                        <div className="flex flex-col gap-0.5 border-b border-surface-200 pb-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSort({ colKey: activeMenu.colKey, dir: 'asc' });
                                                    setActiveMenu(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] hover:text-[#0078D4] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                            >
                                                <ArrowUpAZ size={13} className="text-[#0078D4] shrink-0" />
                                                Sort A to Z
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveSort({ colKey: activeMenu.colKey, dir: 'desc' });
                                                    setActiveMenu(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] hover:text-[#0078D4] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                            >
                                                <ArrowDownAZ size={13} className="text-[#0078D4] shrink-0" />
                                                Sort Z to A
                                            </button>
                                            {activeSort?.colKey === activeMenu.colKey && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveSort(null);
                                                        setActiveMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Eraser size={13} className="text-rose-500 shrink-0" />
                                                    Clear Sort
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative flex items-center">
                                            <Search size={13} className="absolute left-2.5 text-[#605E5C]" />
                                            <input
                                                type="text"
                                                placeholder="Search values..."
                                                value={columnFilterSearch}
                                                onChange={(e) => setColumnFilterSearch(e.target.value)}
                                                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#F3F2F1] hover:bg-[#FAF9F8] border border-[#E1DFDD] rounded-lg outline-none focus:bg-white dark:bg-slate-900 focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 transition-all placeholder:text-[#8A8886]"
                                            />
                                        </div>
                                        {(() => {
                                            const colKey = activeMenu.colKey;
                                            const rawValues = filteredList.map((app, idx) => {
                                                const val = getInterviewCellValue(app, colKey, idx);
                                                if (val === undefined || val === null || String(val).trim() === '' || String(val) === '---') {
                                                    return '(Blanks)';
                                                }
                                                return String(val).trim();
                                            });

                                            const uniqueVals = Array.from(new Set(rawValues)).sort((a, b) => {
                                                if (a === '(Blanks)') return 1;
                                                if (b === '(Blanks)') return -1;
                                                return a.localeCompare(b);
                                            });
                                            const searchVals = uniqueVals.filter(v => v.toLowerCase().includes(columnFilterSearch.toLowerCase()));
                                            const currentSelected = activeFilters[colKey] || uniqueVals;
                                            const allSelected = searchVals.length > 0 && searchVals.every(v => currentSelected.includes(v));

                                            return (
                                                <>
                                                    <div className="max-h-[170px] overflow-y-auto custom-scrollbar border border-[#E1DFDD] rounded-lg p-1 bg-white dark:bg-slate-900 space-y-0.5 shadow-inner">
                                                        <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#F3F2F1] rounded-md cursor-pointer text-xs font-bold text-[#201F1E] transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={allSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setActiveFilters(prev => ({
                                                                            ...prev,
                                                                            [colKey]: uniqueVals
                                                                        }));
                                                                    } else {
                                                                        setActiveFilters(prev => ({
                                                                            ...prev,
                                                                            [colKey]: []
                                                                        }));
                                                                    }
                                                                }}
                                                                className="w-3.5 h-3.5 rounded border-[#C8C6C4] text-[#0078D4] focus:ring-[#0078D4]"
                                                            />
                                                            <span>(Select All)</span>
                                                        </label>
                                                        <hr className="border-surface-200 my-1" />
                                                        {searchVals.map(val => {
                                                            const isChecked = currentSelected.includes(val);
                                                            return (
                                                                <label key={val} className="flex items-center gap-2 px-2.5 py-1 hover:bg-[#F3F2F1] rounded-md cursor-pointer text-xs text-[#201F1E] transition-colors truncate">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            setActiveFilters(prev => {
                                                                                const current = prev[colKey] || uniqueVals;
                                                                                let next;
                                                                                if (e.target.checked) {
                                                                                    next = [...current, val];
                                                                                } else {
                                                                                    next = current.filter(v => v !== val);
                                                                                }
                                                                                return { ...prev, [colKey]: next };
                                                                            });
                                                                        }}
                                                                        className="w-3 h-3 rounded-sm border-[#C8C6C4] text-[#0078D4] focus:ring-[#0078D4]"
                                                                    />
                                                                    <span className="truncate" title={val}>{val}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveFilters(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[colKey];
                                                                    return next;
                                                                });
                                                                setActiveMenu(null);
                                                            }}
                                                            className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-900 border border-[#E1DFDD] hover:bg-[#F3F2F1] text-[#201F1E] rounded-md text-xs font-bold transition-colors"
                                                        >
                                                            Clear Filter
                                                        </button>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </motion.div>
                                )}
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
                                <hr className="my-1 border-surface-200" />
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
                            className="w-full text-center px-3 py-1.5 text-[11px] text-[#8c8c8c] hover:bg-surface-50 font-bold uppercase tracking-wider border-t border-surface-200 mt-1"
                        >
                            Clear Highlight
                        </button>
                    </div>
                </>, document.body
            )}

            {customConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-4 text-left font-sans">
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
                    <div className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-5 text-left font-sans"
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
                                    className="px-3 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] dark:bg-slate-800 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-surface-200">
                            <button
                                onClick={() => setAddColumnModal(false)}
                                className="px-4 py-2 border border-[#d2d0ce] hover:bg-[#f8f9fa] text-[#323130] dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
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
                    <div className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_25px_60px_rgba(0,0,0,0.35)] rounded-lg p-6 w-full max-w-2xl relative flex flex-col gap-5 text-left font-sans max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                            <span className="text-[13px] font-black text-primary-600 uppercase tracking-wider">Edit Dropdown Options: {editColOptionsModal.colName}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{addColOptions.length} Options</span>
                        </div>

                        {/* Dropdown Options */}
                        <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
                            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Dropdown Options <span className="text-surface-300">(leave empty for free text)</span></label>

                            {/* List of current options */}
                            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2 border border-surface-200 p-3 bg-[#faf9f8] rounded-md">
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
                                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-[#d2d0ce] text-xs font-semibold text-surface-800 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 rounded-none outline-none"
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
                                    className="px-3 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] dark:bg-slate-800 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-surface-200">
                            <button
                                onClick={() => setEditColOptionsModal(null)}
                                className="px-4 py-2 border border-[#d2d0ce] hover:bg-[#f8f9fa] text-[#323130] dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
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
            <div className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none p-6 w-full max-w-md relative flex flex-col gap-4 text-left font-sans">
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
