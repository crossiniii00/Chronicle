import React from 'react';
import { createPortal } from 'react-dom';
import { Mail, Edit2, User, Loader2, Save, X, Calendar, ChevronRight, Send, CheckCircle2, AlertCircle, Clipboard, AlertTriangle, Square, CheckSquare, ListTodo, Sparkles, Briefcase, History, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application, EmailTemplate, Position, TemplateType } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EditableCell } from '@/components/features/ApplicantManagement/EditableCell';
import { MedicalIndicator } from '@/components/common/MedicalIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { MASTERLIST_COLUMNS, QUERY2_COLUMNS, QUERY2_GROUPS, OFFBOARDING_COLUMNS, YC_COLUMNS, PIVOT_COLUMNS, SHEET1_COLUMNS, POOL_COLUMNS, NOT_ELIGIBLE_COLUMNS, EMAIL_COLUMNS } from '../constants';
import { SHEET_COLUMNS } from '../../constants';
import { sendEmailViaBackend } from '@/services/emailService';
import { apiClient } from '@/utils/apiClient';
import { ApplicationService } from '@/services/ApplicationService';
import { ConfirmDialog } from '@/components/common/Modal';
import { ReportConfigService } from '@/services/ReportConfigService';
import { getDefaultOptionsForColKey, evaluateChecklistItem } from '../../components/tableUtils';
import * as helpers from '../../utils/tableHelpers';

import {
    formatConditionDesc,
    rowMissingCache,
    getMasterlistCellValue,
    getTableWidth,
    HIRE_ELIGIBILITY_WIDTH,
    normalizeStatusText,
    REQUIREMENT_COLUMN_MAP,
    REQUIREMENT_COLUMN_HEADERS,
    spotlightCell,
    evaluateCustomRule,
    computeHireEligibility,
    buildMissingTooltip,
    CustomRule
} from './tableHelpers';
import { ColumnChecklistCell } from './ColumnChecklistCell';
import { ApplicationCell } from './ApplicationCell';
import { ApplicationRow } from './ApplicationRow';

export { spotlightCell } from './tableHelpers';

interface MasterlistTableProps {
    activeTab: string;
    activeSubTab: string;
    filteredList: Application[];
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    localChanges: any;
    onEdit: (appId: string, field: keyof Application, value: any) => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    isSelectMode: boolean;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    onShowNotes?: (app: Application, rect: DOMRect) => void;
    onShowHistory?: (app: Application) => void;
    focusPath?: { appId: string, colKey: string } | null;
    setFocusPath?: (path: { appId: string, colKey: string } | null) => void;
    search?: string;
    onViewProfile?: (app: Application) => void;
    bulkPromptType?: 'NEO' | 'PEME' | 'RCBC' | null;
    onClearBulkPrompt?: () => void;
    onPromoteToHired?: (app: Application) => Promise<void> | void;
    promotingId?: string | null;
    setActiveTab?: (tab: string) => void;
}

const EMPTY_CHANGES = {};

const COLUMN_HIGHLIGHT_COLORS = [
    { name: 'Yellow', color: '#fef9c3' },
    { name: 'Blue', color: '#dbeafe' },
    { name: 'Green', color: '#d1fae5' },
    { name: 'Pink', color: '#fce7f3' },
    { name: 'Purple', color: '#f3e8ff' }
];

const getColumnKey = (col: any) => col.subField ? `${col.field}.${col.subField}` : col.field;

const CustomPromptModal = ({ title, message, defaultValue, onCancel, onConfirm }: {
    title: string;
    message: string;
    defaultValue: string;
    onCancel: () => void;
    onConfirm: (val: string) => void;
}) => {
    const [val, setVal] = React.useState(defaultValue);
    React.useEffect(() => { setVal(defaultValue); }, [defaultValue]);
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
                            if (e.key === 'Enter') onConfirm(val);
                            if (e.key === 'Escape') onCancel();
                        }}
                        className="w-full p-3 bg-[#faf9f8] border border-surface-200 rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-semibold text-xs text-surface-900"
                    />
                </div>
                <div className="flex items-center justify-end gap-3 mt-2">
                    <button onClick={onCancel} className="px-4 py-2 border border-surface-300 hover:bg-[#f8f9fa] text-surface-700 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(val)} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export function MasterlistTable({
    activeTab, activeSubTab, filteredList, isEditing, setIsEditing, localChanges, onEdit, selectedIds,
    setSelectedIds, isSelectMode,
    onToggleSelect, onToggleSelectAll, scrollContainerRef, onShowNotes, onShowHistory, focusPath, setFocusPath,
    search = '', onViewProfile,
    bulkPromptType, onClearBulkPrompt,
    onPromoteToHired, promotingId,
    setActiveTab
}: MasterlistTableProps) {

    const [activeChecklistAppId, setActiveChecklistAppId] = React.useState<string | null>(null);
    const [activeHireChecklistAppId, setActiveHireChecklistAppId] = React.useState<string | null>(null);
    const [emailTemplates, setEmailTemplates] = React.useState<EmailTemplate[]>([]);
    const [lastSelectedIndex, setLastSelectedIndex] = React.useState<number | null>(null);
    const [departmentsList, setDepartmentsList] = React.useState<any[]>(() => {
        try {
            const cached = localStorage.getItem('cached_departments');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [addColumnModal, setAddColumnModal] = React.useState<boolean>(false);
    const [addColName, setAddColName] = React.useState('');
    const [addColOptions, setAddColOptions] = React.useState<string[]>([]);
    const [addColNewOption, setAddColNewOption] = React.useState('');
    const [editColOptionsModal, setEditColOptionsModal] = React.useState<{ colKey: string; colName: string } | null>(null);
    const [colType, setColType] = React.useState<string>('text');
    const [addColChecklistItems, setAddColChecklistItems] = React.useState<any[]>([]);
    const [selectedChecklistColKey, setSelectedChecklistColKey] = React.useState<string>('');
    const [checklistMatchValue, setChecklistMatchValue] = React.useState<string>('');
    const [customColumnMeta, setCustomColumnMeta] = React.useState<Record<string, Record<string, { options?: string[] }>>>({});
    const [customColumns, setCustomColumns] = React.useState<Record<string, any[]>>({});
    const [highlightedColumns, setHighlightedColumns] = React.useState<Record<string, Record<string, string>>>({});
    const [highlightedHeaders, setHighlightedHeaders] = React.useState<Record<string, Record<string, string>>>({});
    const [customColumnNames, setCustomColumnNames] = React.useState<Record<string, Record<string, string>>>({});
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Fetch masterlist custom tracker configuration from DB on mount
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const dbSettings = await ReportConfigService.getById('masterlist_tracker_settings');
                if (dbSettings) {
                    if (dbSettings.customColumnMeta) setCustomColumnMeta(dbSettings.customColumnMeta);
                    if (dbSettings.customColumns) setCustomColumns(dbSettings.customColumns);
                    if (dbSettings.highlightedColumns) setHighlightedColumns(dbSettings.highlightedColumns);
                    if (dbSettings.highlightedHeaders) setHighlightedHeaders(dbSettings.highlightedHeaders);
                    if (dbSettings.customColumnNames) setCustomColumnNames(dbSettings.customColumnNames);
                } else {
                    // Migrate from localStorage to DB if db settings don't exist yet
                    const localMeta = localStorage.getItem('masterlist_custom_column_meta');
                    const localCols = localStorage.getItem('masterlist_custom_columns_by_tab');
                    const localHighCols = localStorage.getItem('masterlist_highlighted_columns_all');
                    const localHighHeads = localStorage.getItem('masterlist_highlighted_headers_all');
                    const localColNames = localStorage.getItem('masterlist_custom_column_names_all');

                    const migrationData: any = {};
                    if (localMeta) {
                        const parsed = JSON.parse(localMeta);
                        setCustomColumnMeta(parsed);
                        migrationData.customColumnMeta = parsed;
                    }
                    if (localCols) {
                        const parsed = JSON.parse(localCols);
                        setCustomColumns(parsed);
                        migrationData.customColumns = parsed;
                    }
                    if (localHighCols) {
                        const parsed = JSON.parse(localHighCols);
                        setHighlightedColumns(parsed);
                        migrationData.highlightedColumns = parsed;
                    }
                    if (localHighHeads) {
                        const parsed = JSON.parse(localHighHeads);
                        setHighlightedHeaders(parsed);
                        migrationData.highlightedHeaders = parsed;
                    }
                    if (localColNames) {
                        const parsed = JSON.parse(localColNames);
                        setCustomColumnNames(parsed);
                        migrationData.customColumnNames = parsed;
                    }

                    if (Object.keys(migrationData).length > 0) {
                        await ReportConfigService.update('masterlist_tracker_settings', migrationData);
                    }
                }
            } catch (err) {
                console.error('[MasterlistTable] Failed to load custom settings from database, relying on localStorage', err);
                // Fallback directly to localStorage
                try {
                    const localMeta = localStorage.getItem('masterlist_custom_column_meta');
                    const localCols = localStorage.getItem('masterlist_custom_columns_by_tab');
                    const localHighCols = localStorage.getItem('masterlist_highlighted_columns_all');
                    const localHighHeads = localStorage.getItem('masterlist_highlighted_headers_all');
                    const localColNames = localStorage.getItem('masterlist_custom_column_names_all');

                    if (localMeta) setCustomColumnMeta(JSON.parse(localMeta));
                    if (localCols) setCustomColumns(JSON.parse(localCols));
                    if (localHighCols) setHighlightedColumns(JSON.parse(localHighCols));
                    if (localHighHeads) setHighlightedHeaders(JSON.parse(localHighHeads));
                    if (localColNames) setCustomColumnNames(JSON.parse(localColNames));
                } catch {}
            } finally {
                setIsLoaded(true);
            }
        };
        loadSettings();
    }, []);

    // Sync settings to DB and localStorage whenever they change
    React.useEffect(() => {
        if (!isLoaded) return;
        
        const saveSettings = async () => {
            try {
                // Save to database
                await ReportConfigService.update('masterlist_tracker_settings', {
                    customColumnMeta,
                    customColumns,
                    highlightedColumns,
                    highlightedHeaders,
                    customColumnNames
                });
                // Sync locally as fallback backup
                localStorage.setItem('masterlist_custom_column_meta', JSON.stringify(customColumnMeta));
                localStorage.setItem('masterlist_custom_columns_by_tab', JSON.stringify(customColumns));
                localStorage.setItem('masterlist_highlighted_columns_all', JSON.stringify(highlightedColumns));
                localStorage.setItem('masterlist_highlighted_headers_all', JSON.stringify(highlightedHeaders));
                localStorage.setItem('masterlist_custom_column_names_all', JSON.stringify(customColumnNames));
            } catch (err) {
                console.error('[MasterlistTable] Failed to save custom settings:', err);
            }
        };

        const timer = setTimeout(saveSettings, 1000);
        return () => clearTimeout(timer);
    }, [customColumnMeta, customColumns, highlightedColumns, highlightedHeaders, customColumnNames, isLoaded]);

    const activeTabKey = React.useMemo(() => {
        if (activeTab === 'SHEET1' && activeSubTab === 'NOT ELIGIBLE') {
            return 'SHEET1_NOT_ELIGIBLE';
        }
        return activeTab;
    }, [activeTab, activeSubTab]);


    const handleMoveColumn = (indexInFiltered: number, direction: 'left' | 'right') => {
        const colA = columns[indexInFiltered];
        const colB = columns[direction === 'left' ? indexInFiltered - 1 : indexInFiltered + 1];
        if (!colA || !colB) return;

        const updated = [...rawColumns];
        const idxA = updated.findIndex(c => getColumnKey(c) === getColumnKey(colA));
        const idxB = updated.findIndex(c => getColumnKey(c) === getColumnKey(colB));
        if (idxA === -1 || idxB === -1) return;

        const temp = updated[idxA];
        updated[idxA] = updated[idxB];
        updated[idxB] = temp;

        const newCustom = {
            ...customColumns,
            [activeTabKey]: updated
        };
        setCustomColumns(newCustom);
    };


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

    const [activeColumnMenu, setActiveColumnMenu] = React.useState<{
        colName: string;
        colKey: string;
        x: number;
        y: number;
    } | null>(null);
    const [renamePrompt, setRenamePrompt] = React.useState<{
        colKey: string;
        colName: string;
    } | null>(null);

    React.useEffect(() => {
        apiClient.get('/email-templates').then(res => {
            if (Array.isArray(res.data)) {
                console.log('[Email Templates] Loaded', res.data.length, 'templates:', res.data.map((t: any) => `${t.type} (${t.name}) active=${t.isActive}`));
                setEmailTemplates(res.data);
            }
        }).catch(err => console.error('Failed to load email templates for binding:', err));
    }, []);

    const replacePlaceholders = React.useCallback((text: string, app: Application, schedule?: string) => {
        return text
            .replace(/{{candidate_name}}/g, app.applicant_name)
            .replace(/{{position_title}}/g, app.position_title)
            .replace(/{{department}}/g, app.department)
            .replace(/{{schedule}}/g, schedule || '')
            .replace(/{{date}}/g, new Date().toLocaleDateString());
    }, []);
    // const [isDragSelecting, setIsDragSelecting] = React.useState(false);
    const isDragSelectingRef = React.useRef(false);
    const [dragSelectAction, setDragSelectAction] = React.useState<'add' | 'remove' | null>(null);
    const [schedPrompt, setSchedPrompt] = React.useState<{ app?: Application, type: string, isBulk?: boolean } | null>(null);
    const [schedValue, setSchedValue] = React.useState('Monday, May 11, 2026, from 10:00 AM to 4:00 PM');
    const [isSendingSched, setIsSendingSched] = React.useState(false);
    const [bulkTemplateType, setBulkTemplateType] = React.useState<string>('');
    const [isCustomSched, setIsCustomSched] = React.useState(false);
    const [bulkConfirm, setBulkConfirm] = React.useState<{ type: string; count: number } | null>(null);

    // Performance Refs
    const scrollRafRef = React.useRef<number | null>(null);
    const dragStartIndexRef = React.useRef<number | null>(null);
    const initialSelectedIdsRef = React.useRef<Set<string>>(new Set());

    // Global mouse listeners are now handled in the scroll-drag useEffect below

    const handleToggleSelect = React.useCallback((e: React.MouseEvent | React.ChangeEvent, index: number, appId: string) => {
        e.stopPropagation();
        const event = e as React.MouseEvent;

        if (event.shiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);

            const newSelected = new Set(selectedIds);
            const isAdding = !selectedIds.has(appId);

            for (let i = start; i <= end; i++) {
                if (i >= 0 && i < filteredList.length) {
                    if (isAdding) newSelected.add(filteredList[i].id);
                    else newSelected.delete(filteredList[i].id);
                }
            }
            setSelectedIds(newSelected);
        } else {
            onToggleSelect(appId);
        }
        setLastSelectedIndex(index);
    }, [lastSelectedIndex, filteredList, selectedIds, setSelectedIds, onToggleSelect]);

    const dragActionRef = React.useRef<'add' | 'remove' | null>(null);

    const handleRowMouseDown = React.useCallback((e: React.MouseEvent, index: number, appId: string) => {
        if (!isSelectMode) return;
        if (e.button !== 0) return; // Only left-click triggers selection

        if (e.shiftKey && lastSelectedIndex !== null) {
            handleToggleSelect(e, index, appId);
            return;
        }

        isDragSelectingRef.current = true;
        const action = selectedIds.has(appId) ? 'remove' : 'add';
        setDragSelectAction(action);
        dragActionRef.current = action;

        // Snapshot of selected IDs before drag started
        const currentSelected = new Set(selectedIds);
        initialSelectedIdsRef.current = currentSelected;
        dragStartIndexRef.current = index;

        // Toggle clicked row immediately
        const newSelected = new Set(currentSelected);
        if (action === 'add') {
            newSelected.add(appId);
        } else {
            newSelected.delete(appId);
        }
        setSelectedIds(newSelected);

        setLastSelectedIndex(index);
    }, [isSelectMode, selectedIds, setSelectedIds, handleToggleSelect, lastSelectedIndex]);

    const handleRowMouseEnter = React.useCallback((index: number, appId: string) => {
        // Selection logic
        if (!isSelectMode || !isDragSelectingRef.current || !dragActionRef.current || dragStartIndexRef.current === null) return;

        const startIndex = dragStartIndexRef.current;
        const start = Math.min(startIndex, index);
        const end = Math.max(startIndex, index);

        // Start from snapshot of selected IDs before drag started
        const newSelected = new Set(initialSelectedIdsRef.current);

        for (let i = start; i <= end; i++) {
            if (i >= 0 && i < filteredList.length) {
                const id = filteredList[i].id;
                if (dragActionRef.current === 'add') {
                    newSelected.add(id);
                } else {
                    newSelected.delete(id);
                }
            }
        }

        setSelectedIds(newSelected);
        setLastSelectedIndex(index);
    }, [filteredList, isSelectMode, setSelectedIds]);

    React.useEffect(() => {
        if (activeTab === 'EMAIL') {
            apiClient.get('/email-templates')
                .then(res => setEmailTemplates(Array.isArray(res.data) ? res.data : []))
                .catch(() => setEmailTemplates([]));
        }
    }, [activeTab]);

    const masterlistChecklistOptions = React.useMemo(() => {
        const allCols = [...MASTERLIST_COLUMNS];
        const saved = customColumns[activeTabKey] || [];
        saved.forEach((c: any) => {
            if (!allCols.some(ac => ac.field === c.field && ac.subField === c.subField)) {
                allCols.push(c);
            }
        });
        return allCols.filter(c => c.field !== 'actions' && c.field !== 'email_actions' && (c as any).type !== 'checklist');
    }, [customColumns, activeTabKey]);

    const availableChecklistColumns = React.useMemo(() => {
        const list: { label: string; key: string; field: string; subField?: string; source: 'masterlist' | 'interview' }[] = [];
        masterlistChecklistOptions.forEach((col: any) => {
            const key = col.subField ? `${col.field}.${col.subField}` : col.field;
            list.push({
                label: col.label,
                key: `ml:${key}`,
                field: col.field,
                subField: col.subField,
                source: 'masterlist'
            });
        });
        SHEET_COLUMNS.forEach((colName) => {
            if (colName === "Hire Eligibility" || colName === "Id" || colName === "Start time" || colName === "Completion time" || colName === "Last Processed/Updated By:") return;
            const colKey = helpers.getSheetColumnKey(colName, []);
            let field = 'pis';
            let subField: string | undefined = undefined;
            if (colKey.startsWith('pis_')) {
                subField = colKey.substring(4);
            } else {
                field = colKey;
            }
            list.push({
                label: colName,
                key: `int:${colKey}`,
                field,
                subField,
                source: 'interview'
            });
        });
        return list;
    }, [masterlistChecklistOptions]);

    const getColumnOptions = (col: any) => {
        const colKey = col.subField ? `${col.field}.${col.subField}` : col.field;
        return customColumnMeta[activeTabKey]?.[colKey]?.options || col.options || getDefaultOptionsForColKey(colKey, col.label);
    };

    const rawColumns = React.useMemo(() => {
        const defaultCols = activeTab === 'QUERY2' ? QUERY2_COLUMNS :
            (activeTab === 'OFFBOARDING_TRACKER' || activeTab === 'OFFBOARDING_WINNERS') ? OFFBOARDING_COLUMNS :
                activeTab === 'YC' ? YC_COLUMNS :
                    activeTab === 'PIVOT' ? PIVOT_COLUMNS :
                        activeTab === 'SHEET1' && activeSubTab === 'NOT ELIGIBLE' ? NOT_ELIGIBLE_COLUMNS :
                            activeTab === 'SHEET1' ? SHEET1_COLUMNS :
                                activeTab === 'POOL' ? POOL_COLUMNS :
                                        activeTab === 'EMAIL' ? EMAIL_COLUMNS :
                                            activeTab === 'CONCLUDED' ? MASTERLIST_COLUMNS :
                                                MASTERLIST_COLUMNS;
        
        const savedCols = customColumns[activeTabKey];
        if (savedCols && savedCols.length > 0) {
            const result: any[] = [];
            savedCols.forEach((savedCol: any) => {
                const matchingDefault = defaultCols.find((d: any) => 
                    d.field === savedCol.field && d.subField === savedCol.subField
                );
                if (matchingDefault) {
                    result.push(matchingDefault);
                } else if (savedCol.field === 'pis' && savedCol.subField && savedCol.subField.startsWith('custom_')) {
                    result.push(savedCol);
                }
            });

            defaultCols.forEach((d: any) => {
                const alreadyIn = result.some(r => r.field === d.field && r.subField === d.subField);
                if (!alreadyIn) {
                    result.push(d);
                }
            });
            return result;
        }

        return defaultCols;
    }, [activeTab, activeSubTab, customColumns, activeTabKey]);

    const columns = React.useMemo(() => {
        if (!search || search.length < 2) return rawColumns;

        const term = search.toLowerCase();
        const terms = term.split('|').map((t: string) => t.trim()).filter((t: string) => t.length >= 2);

        const matchesAnyColumn = rawColumns.some(col =>
            terms.some((t: string) => col.label.toLowerCase().includes(t))
        );

        if (matchesAnyColumn) {
            return rawColumns.filter(col =>
                terms.some((t: string) => col.label.toLowerCase().includes(t)) ||
                col.label.toLowerCase().includes('name') ||
                col.field === 'actions' ||
                col.field === 'email_actions' ||
                col.label.toLowerCase().includes('status')
            );
        }

        return rawColumns;
    }, [rawColumns, search]);


    const showSelectionColumn = isSelectMode || selectedIds.size > 0;
    const tableWidth = React.useMemo(() => getTableWidth(columns, showSelectionColumn) + (isEditing ? 120 : 0), [columns, showSelectionColumn, isEditing]);
    const shouldStretchTable = activeTab === 'EMAIL';

    const dragRef = React.useRef({
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        isDown: false,
        isMoving: false
    });

    const [scrollTop, setScrollTop] = React.useState(0);
    const [containerHeight, setContainerHeight] = React.useState(0);
    const rowHeight = 36;
    const headerHeight = 40;
    const overscan = 10;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isSelectMode || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('th')) return;
        if (!scrollContainerRef.current) return;

        dragRef.current = {
            isDown: true,
            isMoving: false, // Track if we've actually started moving
            startX: e.pageX - scrollContainerRef.current.offsetLeft,
            startY: e.pageY - scrollContainerRef.current.offsetTop,
            scrollLeft: scrollContainerRef.current.scrollLeft,
            scrollTop: scrollContainerRef.current.scrollTop
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.isDown || !scrollContainerRef.current) return;
        // @ts-ignore
        if (dragRef.current.isSelectDrag) return;

        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const y = e.pageY - scrollContainerRef.current.offsetTop;
        const walkX = (x - dragRef.current.startX);
        const walkY = (y - dragRef.current.startY);

        // Threshold check to allow clicks to pass through to cells
        if (!dragRef.current.isMoving) {
            const distance = Math.sqrt(walkX * walkX + walkY * walkY);
            if (distance > 5) {
                dragRef.current.isMoving = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                scrollContainerRef.current.style.cursor = 'grabbing';
                scrollContainerRef.current.classList.add('is-dragging');
                document.body.style.userSelect = 'none';
            } else {
                return;
            }
        }

        const targetLeft = dragRef.current.scrollLeft - (walkX * 1.5);
        const targetTop = dragRef.current.scrollTop - (walkY * 1.5);

        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = targetLeft;
                scrollContainerRef.current.scrollTop = targetTop;
            }
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (dragRef.current.isDown) {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.style.cursor = isSelectMode ? 'crosshair' : 'default';
                scrollContainerRef.current.classList.remove('is-dragging');
                if (dragRef.current.isMoving) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }
            }
            document.body.style.userSelect = 'auto';
            dragRef.current.isDown = false;
            dragRef.current.isMoving = false;
        }

        isDragSelectingRef.current = false;
        setDragSelectAction(null);
        dragStartIndexRef.current = null;
        // @ts-ignore
        dragRef.current.isSelectDrag = false;
        // @ts-ignore
        dragRef.current.startSelectState = null;
    };

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDragSelectingRef.current = false;
            setDragSelectAction(null);
            dragStartIndexRef.current = null;
            if (dragRef.current) {
                dragRef.current.isDown = false;
                dragRef.current.isMoving = false;
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    React.useEffect(() => {
        if (scrollContainerRef.current) {
            setContainerHeight(scrollContainerRef.current.clientHeight);
            const observer = new ResizeObserver(() => {
                if (scrollContainerRef.current) {
                    setContainerHeight(scrollContainerRef.current.clientHeight);
                }
            });
            observer.observe(scrollContainerRef.current);
            return () => observer.disconnect();
        }
    }, [scrollContainerRef]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.shiftKey && scrollContainerRef.current) {
            // Convert vertical scroll to horizontal when Shift is held
            const delta = e.deltaY || e.deltaX;
            scrollContainerRef.current.scrollLeft += delta;
            e.preventDefault();
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = requestAnimationFrame(() => {
            setScrollTop(top);
        });
    };



    React.useEffect(() => {
        if (bulkPromptType && selectedIds.size > 0) {
            if (bulkPromptType === 'PEME') {
                setSchedPrompt({ type: bulkPromptType, isBulk: true });
            } else {
                handleBulkEmail(bulkPromptType);
            }
            onClearBulkPrompt?.();
        }
    }, [bulkPromptType, selectedIds.size]);

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(filteredList.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);
    const visibleList = filteredList.slice(startIndex, endIndex);


    const cleanEmailStr = (raw: string) => {
        if (!raw) return '';
        const match = raw.match(/<([^>]+)>/);
        return match ? match[1].trim() : raw.trim();
    };
    const [clipboardToast, setClipboardToast] = React.useState(false);

    const openEmailClient = React.useCallback((client: 'gmail' | 'outlook', rawEmail: string, subject: string, body: string, applicantName?: string) => {
        const email = cleanEmailStr(rawEmail);
        
        // Convert HTML to readable plain text preserving line breaks
        const plainBody = body
            // Strip entire style/script/head blocks first (content between tags)
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
            // Convert block elements to line breaks
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/td>/gi, '  ')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            // Strip remaining HTML tags
            .replace(/<[^>]+>/g, '')
            // Decode HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n /g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        console.log('[Email Compose] Body length:', plainBody.length, 'chars. Preview:', plainBody.substring(0, 200));

        // Synchronous clipboard copy (more reliable than async Clipboard API)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = plainBody;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch { /* silent */ }

        // Show clipboard toast
        setClipboardToast(true);
        setTimeout(() => setClipboardToast(false), 5000);

        // Open compose URL immediately (same tick as user gesture — prevents popup blocking and param stripping)
        const encodedBody = encodeURIComponent(plainBody);
        const toEmail = applicantName ? `${applicantName} <${email}>` : email;
        
        if (client === 'gmail') {
            // Use mailto: protocol to open in the actual full Gmail inbox interface
            const mailtoLink = `mailto:${toEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodedBody}`;
            console.log('[Email Compose] Opening via mailto:', mailtoLink.length, 'chars');
            
            // mailto: opens in whatever the user's default mail handler is (Gmail if configured)
            // This gives the full inbox experience rather than the stripped-down compose-only page
            window.location.href = mailtoLink.length < 8000 ? mailtoLink : `mailto:${toEmail || ''}?subject=${encodeURIComponent(subject)}`;
        } else {
            const toParam = toEmail ? `to=${encodeURIComponent(toEmail)}&` : '';
            const url = `https://outlook.office.com/mail/deeplink/compose?${toParam}subject=${encodeURIComponent(subject)}&body=${encodedBody}`;
            window.open(url.length < 8000 ? url : url.replace(/&body=[^&]*$/, ''), '_blank');
        }
    }, []);

    const handleDirectSend = React.useCallback(async (app: Application, type: 'RCBC' | 'NBI' | 'NEO' | 'OFFER', client: 'gmail' | 'outlook' = 'outlook') => {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
        
        const templateType = type === 'OFFER' ? 'OFFER' : type;
        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === templateType);
        console.log(`[Email Send] Type=${type}, Templates available=${emailTemplates.length}, Match found=${!!activeTemplate}`, activeTemplate ? `"${activeTemplate.name}"` : 'USING FALLBACK');
        
        let subject = activeTemplate ? replacePlaceholders(activeTemplate.subject, app) : `Email Notification - ${app.applicant_name}`;
        let body = activeTemplate ? replacePlaceholders(activeTemplate.body, app) : `Hi ${app.applicant_name},\n\nPlease find the updates...`;

        if (!activeTemplate) {
            if (type === 'NEO') {
                subject = `NEO Orientation - ${app.applicant_name}`;
                body = `Hi ${app.applicant_name},\n\nWelcome! Your NEO Orientation has been processed.`;
            } else if (type === 'RCBC') {
                subject = `RCBC Enrollment - ${app.applicant_name}`;
                body = `Hi ${app.applicant_name},\n\nPlease complete your RCBC enrollment...`;
            } else if (type === 'NBI') {
                subject = `NBI Status Update - ${app.applicant_name}`;
                body = `Hi ${app.applicant_name},\n\nWe are checking your NBI clearance status...`;
            } else if (type === 'OFFER') {
                subject = `Job Offer - ${app.position_title} | ${app.applicant_name}`;
                body = `Hi ${app.applicant_name},\n\nCongratulations! We are pleased to extend a formal job offer for the ${app.position_title} position.\n\nPlease review the attached details and confirm your acceptance at your earliest convenience.\n\nBest regards,\nContactPoint 360 Recruitment`;
            }
        }

        const email = app.pis?.email || app.applicant_email;
        openEmailClient(client, email, subject, body, app.applicant_name);

        // Persist email status directly to DB so it survives restarts
        const statusPatch: Record<string, string> = {};
        if (type === 'NEO') {
            statusPatch.master_neo_date = `SENT ${dateStr}`;
        } else if (type === 'RCBC') {
            statusPatch.master_rcbc_status = `SENT ${dateStr}`;
        } else if (type === 'NBI') {
            statusPatch.master_email_nbi_status = `SENT ${dateStr}`;
        } else if (type === 'OFFER') {
            statusPatch.master_status = `Offer Sent ${dateStr}`;
        }

        if (Object.keys(statusPatch).length > 0) {
            // Update local state for immediate UI feedback
            Object.entries(statusPatch).forEach(([field, value]) => {
                onEdit(app.id, field as keyof Application, value);
            });
            // Persist to database
            ApplicationService.patch(app.id, statusPatch).catch(err => {
                console.error('[Email Status] Failed to persist status:', err);
            });
        }
    }, [onEdit, emailTemplates, replacePlaceholders, openEmailClient]);

    const handleBulkEmail = React.useCallback(async (overrideType?: 'RCBC' | 'NBI' | 'NEO') => {
        const type = overrideType || schedPrompt?.type;
        if (selectedIds.size === 0 || !type) return;

        const apps = filteredList.filter((a: Application) => selectedIds.has(a.id));
        setBulkConfirm({ type, count: apps.length });
    }, [schedPrompt, selectedIds, filteredList]);

    const confirmBulkEmail = React.useCallback(async (client: 'gmail' | 'outlook') => {
        if (!bulkConfirm) return;
        const { type } = bulkConfirm;
        const apps = filteredList.filter((a: Application) => selectedIds.has(a.id));
        setBulkConfirm(null);

        // Prioritize personal email from PIS, fallback to applicant_email
        const emails = apps.map((a: Application) => {
            const raw = a.pis?.email || a.applicant_email;
            if (!raw) return '';
            const match = raw.match(/<([^>]+)>/);
            return match ? match[1].trim() : raw.trim();
        }).filter(Boolean).join(',');
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === type);
        
        const firstApp = apps[0] || {} as Application;
        let subject = activeTemplate ? replacePlaceholders(activeTemplate.subject, firstApp, schedValue) : `Bulk ${type} Notification`;
        let body = activeTemplate ? replacePlaceholders(activeTemplate.body, firstApp, schedValue) : `Dear Candidates,\n\nPlease find the updates regarding your ${type} requirements.`;

        // Copy body to clipboard to prevent URI length limits in Outlook Web Access
        navigator.clipboard.writeText(body).catch(() => {});

        if (client === 'gmail') {
            const mailtoLink = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(subject)}`;
            window.location.href = mailtoLink;
        } else {
            // Outlook typically prefers semicolon as a separator for multiple emails
            const outlookEmails = emails.replace(/,/g, ';');
            const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?bcc=${encodeURIComponent(outlookEmails)}&subject=${encodeURIComponent(subject)}`;
            window.open(outlookUrl, '_blank');
        }

        // Persist bulk email statuses directly to DB
        for (const app of apps) {
            const statusPatch: Record<string, string> = {};
            if (type === 'NEO') {
                statusPatch.master_neo_date = `SENT ${dateStr}`;
            } else if (type === 'PEME') {
                statusPatch.master_peme_status = `Endorsed ${dateStr}`;
            } else if (type === 'RCBC') {
                statusPatch.master_rcbc_status = `SENT ${dateStr}`;
            } else if (type === 'NBI') {
                statusPatch.master_email_nbi_status = `SENT ${dateStr}`;
            }

            if (Object.keys(statusPatch).length > 0) {
                Object.entries(statusPatch).forEach(([field, value]) => {
                    onEdit(app.id, field as keyof Application, value);
                });
                ApplicationService.patch(app.id, statusPatch).catch(err => {
                    console.error('[Bulk Email Status] Failed to persist status:', err);
                });
            }
        }

        setSchedPrompt(null);
        setSelectedIds(new Set());
    }, [bulkConfirm, filteredList, selectedIds, onEdit, setSelectedIds, emailTemplates, schedValue]);



    return (
        <div
            className="flex-1 min-h-0 w-full bg-white border border-[#edebe9] overflow-hidden flex flex-col antialiased relative group/table"
        >
            {/* ═══ LIST/TABLE VIEW ═══ */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onWheel={handleWheel}
                className="flex-1 overflow-auto relative custom-scrollbar bg-white"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onDragStart={(e) => e.preventDefault()}
                style={{
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div style={{
                    height: Math.max((filteredList.length * rowHeight) + headerHeight, containerHeight),
                    position: 'relative',
                    width: shouldStretchTable ? '100%' : tableWidth,
                    minWidth: tableWidth,
                    display: 'block'
                }}>
                    <table 
                        style={{
                            width: shouldStretchTable ? '100%' : tableWidth,
                            minWidth: tableWidth
                        }}
                        className="text-left border-separate border-spacing-0 table-fixed"
                    >
                        <thead className="sticky top-0 z-[100]" onPointerDown={(e) => e.stopPropagation()}>
                            <tr className="h-10 bg-white border-b border-[#edebe9] shadow-sm">
                                {(isSelectMode || selectedIds.size > 0) && (
                                    <th className="bg-white border-b-2 border-r border-[#edebe9] px-3 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredList.length && filteredList.length > 0}
                                            onChange={onToggleSelectAll}
                                            className="rounded border-surface-400/80 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th
                                    className="px-3 py-3 bg-white border-b-2 border-r border-[#edebe9] text-xs font-bold text-[#323130] uppercase tracking-tight text-center whitespace-nowrap"
                                    style={{
                                        width: HIRE_ELIGIBILITY_WIDTH,
                                        minWidth: HIRE_ELIGIBILITY_WIDTH,
                                        maxWidth: HIRE_ELIGIBILITY_WIDTH
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <Briefcase size={11} className="text-emerald-600" strokeWidth={2.5} />
                                        <span>Hire Eligibility</span>
                                    </div>
                                </th>
                                <th
                                    className="px-3 py-3 bg-white border-b-2 border-r border-[#edebe9] text-xs font-bold text-[#323130] uppercase tracking-tight text-center whitespace-nowrap"
                                    style={{
                                        width: 90,
                                        minWidth: 90,
                                        maxWidth: 90
                                    }}
                                >
                                    ID
                                </th>
                                {columns.map((col, idx) => {
                                    const colKey = getColumnKey(col);
                                    const tabColMap = highlightedColumns[activeTab] || {};
                                    const tabHeaderMap = highlightedHeaders[activeTab] || {};
                                    const tabNameMap = customColumnNames[activeTab] || {};
                                    const colHighlight = tabColMap[colKey];
                                    const headerHighlight = tabHeaderMap[colKey];
                                    const displayLabel = tabNameMap[colKey] || col.label;
                                    const rawIdx = rawColumns.findIndex(r => r.field === col.field && r.subField === col.subField);
                                    return (
                                        <th
                                            key={col.label + idx}
                                            className={cn(
                                                "px-3 py-3 bg-white border-b-2 border-r border-[#edebe9] text-xs font-bold text-[#323130] uppercase tracking-tight whitespace-nowrap overflow-hidden truncate transition-colors hover:bg-[#f8f9fa] relative select-none"
                                            )}
                                            onClick={(e) => {
                                                console.log('[MasterlistTable] Header clicked. isEditing:', isEditing, 'col:', displayLabel);
                                                if (isEditing) {
                                                    e.stopPropagation();
                                                    setActiveColumnMenu({
                                                        colName: displayLabel,
                                                        colKey,
                                                        x: e.clientX,
                                                        y: e.clientY
                                                    });
                                                }
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setActiveColumnMenu({
                                                    colName: displayLabel,
                                                    colKey,
                                                    x: e.clientX,
                                                    y: e.clientY
                                                });
                                            }}
                                            style={{
                                                ...(displayLabel.toUpperCase().includes('INITIAL') ? {
                                                    backgroundColor: '#fffef2',
                                                    color: '#856404',
                                                    borderColor: '#f3e6a8'
                                                } : (displayLabel.toUpperCase().includes('REMARKS') || displayLabel.toUpperCase().includes('REASON')) ? {
                                                    backgroundColor: '#fffafd',
                                                    color: '#6a1b9a',
                                                    borderColor: '#f0dff2'
                                                } : {}),
                                                backgroundColor: headerHighlight
                                                    ? headerHighlight
                                                    : colHighlight
                                                        ? colHighlight
                                                        : undefined,
                                                width: col.width,
                                                minWidth: col.width,
                                                maxWidth: col.width,
                                                cursor: isEditing ? 'pointer' : 'default',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                                <div className="truncate" title={displayLabel}>{displayLabel}</div>
                                                {isEditing && rawIdx !== -1 && (
                                                    <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveColumn(rawIdx, 'left'); }}
                                                            disabled={rawIdx === 0}
                                                            className={cn(
                                                                "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                                rawIdx === 0
                                                                    ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                                    : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                            )}
                                                            title="Move column left"
                                                        >
                                                            ←
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveColumn(rawIdx, 'right'); }}
                                                            disabled={rawIdx === rawColumns.length - 1}
                                                            className={cn(
                                                                "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all bg-white",
                                                                rawIdx === rawColumns.length - 1
                                                                    ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                                    : "text-slate-600 border-slate-300 hover:bg-slate-100 active:scale-90"
                                                            )}
                                                            title="Move column right"
                                                        >
                                                            →
                                                        </button>
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
                                            setColType('text');
                                            setAddColChecklistItems([]);
                                            setSelectedChecklistColKey('');
                                            setChecklistMatchValue('');
                                            setAddColumnModal(true);
                                        }}
                                        className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-[#edebe9] text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
                                        style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                                    >
                                        + Add Column
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ height: startIndex * rowHeight, contain: 'strict' }} />
                            {visibleList.map((app: Application, idx: number) => {
                                const rowLocalChanges = localChanges[app.id] || EMPTY_CHANGES;
                                const appDept = (
                                    rowLocalChanges.department !== undefined 
                                        ? rowLocalChanges.department 
                                        : (app.pis?.final_account || app.endorsement_account || app.department || '')
                                ).trim().toLowerCase();
                                const deptObj = departmentsList.find(d => d.name.trim().toLowerCase() === appDept);
                                return (
                                    <ApplicationRow
                                        key={app.id}
                                        idx={startIndex + idx}
                                        app={app}
                                        columns={columns}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        isRowActive={focusPath?.appId === app.id}
                                        rowLocalChanges={localChanges[app.id] || EMPTY_CHANGES}
                                        onEdit={onEdit}
                                        onToggleSelect={onToggleSelect}
                                        isSelected={selectedIds.has(app.id)}
                                        isSelectMode={isSelectMode}
                                        showSelectionColumn={isSelectMode || selectedIds.size > 0}
                                        onViewProfile={onViewProfile}
                                        onShowNotes={onShowNotes}
                                        setSchedPrompt={setSchedPrompt}
                                        handleDirectSend={handleDirectSend}
                                        onRowMouseDown={handleRowMouseDown}
                                        onRowMouseEnter={handleRowMouseEnter}
                                        templates={emailTemplates}
                                        setFocusPath={setFocusPath}
                                        focusPath={focusPath}
                                        isChecklistOpen={activeChecklistAppId === app.id}
                                        setIsChecklistOpen={(open: boolean) => setActiveChecklistAppId(open ? app.id : null)}
                                        activeHireChecklistAppId={activeHireChecklistAppId}
                                        setActiveHireChecklistAppId={setActiveHireChecklistAppId}
                                        onPromoteToHired={onPromoteToHired}
                                        promotingId={promotingId}
                                        columnHighlights={highlightedColumns[activeTab] || {}}
                                        onShowHistory={onShowHistory}
                                        eligibilitySettings={deptObj?.eligibilitySettings}
                                        setActiveTab={setActiveTab}
                                        customColumnMeta={customColumnMeta}
                                        activeTabKey={activeTabKey}
                                    />
                                );
                            })}
                            <tr style={{ height: Math.max(0, (filteredList.length - endIndex) * rowHeight), contain: 'strict' }} />
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {schedPrompt && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-[#d1d1d1]"
                        >
                            <div className="p-6 border-b border-surface-100 flex items-center justify-between bg-surface-50">
                                <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={16} className="text-primary-600" />
                                    Schedule {schedPrompt.type} {schedPrompt.isBulk ? `(${selectedIds.size} Candidates)` : ''}
                                </h3>
                                <button onClick={() => setSchedPrompt(null)} className="text-surface-400 hover:text-surface-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest block">
                                        Select Schedule
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(() => {
                                            const options = [];
                                            const today = new Date();
                                            for (let i = 0; i < 7; i++) {
                                                const d = new Date();
                                                d.setDate(today.getDate() + i);
                                                if (d.getDay() === 0 || d.getDay() === 6) continue;
                                                const dateStr = d.toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                });
                                                options.push(`${dateStr}, from 10:00 AM to 4:00 PM`);
                                                if (options.length >= 3) break;
                                            }
                                            options.push('CUSTOM');
                                            return options;
                                        })().map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    if (opt === 'CUSTOM') {
                                                        setIsCustomSched(true);
                                                    } else {
                                                        setIsCustomSched(false);
                                                        setSchedValue(opt);
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full px-4 py-3 text-left text-[12px] font-bold rounded-none border transition-all",
                                                    (schedValue === opt && !isCustomSched) || (opt === 'CUSTOM' && isCustomSched)
                                                        ? "bg-primary-50 border-primary-200 text-primary-700 shadow-sm"
                                                        : "bg-white border-[#d1d1d1] text-surface-600 hover:border-surface-400/80"
                                                )}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    {isCustomSched && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-2 pt-2"
                                        >
                                            <textarea
                                                value={schedValue}
                                                onChange={(e) => setSchedValue(e.target.value)}
                                                placeholder="Enter custom schedule details..."
                                                className="w-full px-4 py-3 bg-white border border-primary-200 text-[12px] font-bold text-primary-900 rounded-none focus:ring-2 focus:ring-primary-500/20 outline-none min-h-[100px]"
                                                autoFocus
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                <div className="bg-surface-50 p-4 rounded-none border border-surface-100">
                                    <p className="text-[11px] text-surface-500 leading-relaxed italic">
                                        This will send an automated email with the selected schedule and BCC the recruitment team.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 bg-surface-50 border-t border-surface-100 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setSchedPrompt(null)}
                                    className="px-6 py-2 text-[11px] font-black text-surface-500 uppercase tracking-widest hover:text-surface-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={schedPrompt.isBulk ? () => handleBulkEmail() : async () => {
                                        if (!schedPrompt.app) return;
                                        setIsSendingSched(true);
                                        const type = schedPrompt.type;
                                        const app = schedPrompt.app;
                                        const today = new Date();
                                        const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

                                        let subject = '';
                                        let body = '';

                                        const activeTemplate = emailTemplates.find(t => t.isActive && t.type === type);
                                        
                                        if (activeTemplate) {
                                            subject = replacePlaceholders(activeTemplate.subject, app, schedValue);
                                            body = replacePlaceholders(activeTemplate.body, app, schedValue);
                                        } else {
                                            if (type === 'NEO') {
                                                subject = `NEO Orientation - ${app.applicant_name}`;
                                                body = `Hi ${app.applicant_name}, Welcome! Your NEO schedule is ${schedValue}`;
                                            } else if (type === 'PEME') {
                                                subject = `PEME Endorsement - ${app.applicant_name}`;
                                                body = `Hi ${app.applicant_name}, Your PEME endorsement is ready...`;
                                            } else if (type === 'RCBC') {
                                                subject = `RCBC Enrollment - ${app.applicant_name}`;
                                                body = `Hi ${app.applicant_name}, Please complete your RCBC enrollment...`;
                                            } else if (type === 'NBI') {
                                                subject = `NBI Status Update - ${app.applicant_name}`;
                                                body = `Hi ${app.applicant_name}, We are checking your NBI clearance status...`;
                                            }
                                        }

                                        const email = app.pis?.email || app.applicant_email;
                                        openEmailClient('outlook', email, subject, body, app.applicant_name);

                                        if (type === 'NEO') {
                                            onEdit(app.id, 'master_neo_date', `SENT ${dateStr}`);
                                        } else if (type === 'PEME') {
                                            onEdit(app.id, 'master_peme_status', `Endorsed ${dateStr}`);
                                        } else if (type === 'RCBC') {
                                            onEdit(app.id, 'master_rcbc_status', `SENT ${dateStr}`);
                                        } else if (type === 'NBI') {
                                            onEdit(app.id, 'master_email_nbi_status', `SENT ${dateStr}`);
                                        }
                                        setSchedPrompt(null);
                                        setIsSendingSched(false);
                                    }}
                                    disabled={isSendingSched || !schedValue}
                                    className="px-8 py-2 bg-primary-600 text-white text-[11px] font-black uppercase tracking-widest rounded-none hover:bg-black transition-all shadow-md flex items-center gap-2"
                                >
                                    {isSendingSched ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Send'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {bulkConfirm && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-black/10"
                        >
                            <div className="p-6 border-b border-surface-100 flex items-center justify-between bg-white">
                                <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle size={16} className="text-primary-600" />
                                    Bulk {bulkConfirm.type} Dispatch
                                </h3>
                                <button onClick={() => setBulkConfirm(null)} className="text-surface-400 hover:text-surface-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary-50 flex items-center justify-center rounded-none border border-primary-100">
                                            <Mail className="text-primary-600" size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Confirmation Required</p>
                                            <p className="text-xs font-bold text-surface-900">Send {bulkConfirm.type} notification to {bulkConfirm.count} candidates.</p>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-surface-500 leading-relaxed font-medium">
                                        Choose your preferred email client to review and dispatch these notifications. All candidates will be BCC'd to ensure privacy.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => confirmBulkEmail('gmail')}
                                        className="flex flex-col items-center gap-3 p-4 bg-white border border-surface-200 hover:border-red-500 hover:bg-red-50 transition-all group rounded-none shadow-sm"
                                    >
                                        <div className="w-10 h-10 bg-red-50 flex items-center justify-center rounded-none group-hover:scale-110 transition-transform">
                                            <Mail className="text-red-600" size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Gmail Client</span>
                                    </button>

                                    <button
                                        onClick={() => confirmBulkEmail('outlook')}
                                        className="flex flex-col items-center gap-3 p-4 bg-white border border-surface-200 hover:border-blue-500 hover:bg-blue-50 transition-all group rounded-none shadow-sm"
                                    >
                                        <div className="w-10 h-10 bg-blue-50 flex items-center justify-center rounded-none group-hover:scale-110 transition-transform">
                                            <Mail className="text-blue-600" size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Outlook Client</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center justify-center">
                                <button
                                    onClick={() => setBulkConfirm(null)}
                                    className="text-[10px] font-black text-surface-400 uppercase tracking-widest hover:text-surface-600 transition-colors"
                                >
                                    Dismiss Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Clipboard Toast Notification */}
            <AnimatePresence>
                {clipboardToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 40, x: '-50%' }}
                        className="fixed bottom-8 left-1/2 z-[500] bg-black text-white px-6 py-3 shadow-2xl border border-white/20 flex items-center gap-3"
                    >
                        <Clipboard size={16} className="text-emerald-400 shrink-0" />
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest">Email body copied to clipboard</p>
                            <p className="text-[10px] text-white/60 font-medium mt-0.5">Press <span className="text-emerald-400 font-black">Ctrl + V</span> in the compose window to paste the full template</p>
                        </div>
                        <button onClick={() => setClipboardToast(false)} className="ml-4 text-white/40 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Column Action Menu (right-click on header) */}
            {activeColumnMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setActiveColumnMenu(null)} />
                    <div
                        className="fixed z-[300] bg-white border border-[#edebe9] shadow-premium p-2 flex flex-col w-56 text-left"
                        style={{ top: activeColumnMenu.y + 5, left: activeColumnMenu.x + 5 }}
                    >
                        <div className="px-3 py-1.5 border-b border-[#edebe9] text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1 truncate text-left">
                            Column: {activeColumnMenu.colName}
                        </div>
                        <button
                            onClick={() => {
                                setRenamePrompt({ colKey: activeColumnMenu.colKey, colName: activeColumnMenu.colName });
                                setActiveColumnMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 font-semibold"
                        >
                            Rename Column
                        </button>
                        {activeColumnMenu.colKey !== '#' && activeColumnMenu.colKey !== 'Id' && (
                            <button
                                onClick={() => {
                                    const colObj = columns.find(c => getColumnKey(c) === activeColumnMenu.colKey);
                                    const isChecklist = colObj?.type === 'checklist';
                                    setColType(isChecklist ? 'checklist' : 'text');
                                    if (isChecklist) {
                                        setAddColChecklistItems(colObj.checklistItems || []);
                                        setSelectedChecklistColKey('');
                                        setChecklistMatchValue('');
                                    } else {
                                        const existingOptions = customColumnMeta[activeTabKey]?.[activeColumnMenu.colKey]?.options;
                                        const defaultOptions = colObj?.options || getDefaultOptionsForColKey(activeColumnMenu.colKey, activeColumnMenu.colName);
                                        setAddColOptions(existingOptions || defaultOptions || []);
                                        setAddColNewOption('');
                                    }
                                    setEditColOptionsModal({
                                        colKey: activeColumnMenu.colKey,
                                        colName: activeColumnMenu.colName
                                    });
                                    setActiveColumnMenu(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-surface-700 hover:bg-surface-50 font-semibold"
                            >
                                {columns.find(c => getColumnKey(c) === activeColumnMenu.colKey)?.type === 'checklist' ? 'Edit Checklist Columns' : 'Edit Dropdown Options'}
                            </button>
                        )}
                        <hr className="my-1 border-[#edebe9]" />
                        <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Header Only</span>
                        <div className="grid grid-cols-5 gap-1 p-2">
                            {COLUMN_HIGHLIGHT_COLORS.map(clr => (
                                <button
                                    key={'header-' + clr.name}
                                    onClick={() => {
                                        setHighlightedHeaders(prev => ({
                                            ...prev,
                                            [activeTab]: {
                                                ...(prev[activeTab] || {}),
                                                [activeColumnMenu.colKey]: clr.color
                                            }
                                        }));
                                        setActiveColumnMenu(null);
                                    }}
                                    className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                    style={{ backgroundColor: clr.color }}
                                    title={clr.name}
                                />
                            ))}
                        </div>
                        <span className="px-3 py-1 text-[9px] font-bold text-surface-400 uppercase tracking-wider text-left">Highlight Entire Column</span>
                        <div className="grid grid-cols-5 gap-1 p-2">
                            {COLUMN_HIGHLIGHT_COLORS.map(clr => (
                                <button
                                    key={'col-' + clr.name}
                                    onClick={() => {
                                        setHighlightedColumns(prev => ({
                                            ...prev,
                                            [activeTab]: {
                                                ...(prev[activeTab] || {}),
                                                [activeColumnMenu.colKey]: clr.color
                                            }
                                        }));
                                        setActiveColumnMenu(null);
                                    }}
                                    className="w-6 h-6 rounded-sm border border-[#d2d0ce] hover:scale-105 active:scale-95 transition-all shadow-sm"
                                    style={{ backgroundColor: clr.color }}
                                    title={clr.name}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setHighlightedColumns(prev => {
                                    const next = { ...prev };
                                    if (next[activeTab]) {
                                        const tabData = { ...next[activeTab] };
                                        delete tabData[activeColumnMenu.colKey];
                                        next[activeTab] = tabData;
                                    }
                                    return next;
                                });
                                setHighlightedHeaders(prev => {
                                    const next = { ...prev };
                                    if (next[activeTab]) {
                                        const tabData = { ...next[activeTab] };
                                        delete tabData[activeColumnMenu.colKey];
                                        next[activeTab] = tabData;
                                    }
                                    return next;
                                });
                                setActiveColumnMenu(null);
                            }}
                            className="w-full text-center px-3 py-1.5 text-[11px] text-[#8c8c8c] hover:bg-surface-50 font-bold uppercase tracking-wider border-t border-[#edebe9] mt-1"
                        >
                            Clear Highlight
                        </button>
                    </div>
                </>,
                document.body
            )}

            {renamePrompt && (
                <CustomPromptModal
                    title="Rename Column"
                    message={`Enter new name for "${renamePrompt.colName}" column:`}
                    defaultValue={renamePrompt.colName}
                    onCancel={() => setRenamePrompt(null)}
                    onConfirm={(newName) => {
                        setRenamePrompt(null);
                        if (newName === null || newName.trim() === '' || newName === renamePrompt.colName) return;
                        setCustomColumnNames(prev => ({
                            ...prev,
                            [activeTab]: {
                                ...(prev[activeTab] || {}),
                                [renamePrompt.colKey]: newName
                            }
                        }));
                    }}
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

                        {/* Column Type */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">Column Type</label>
                            <select
                                value={colType}
                                onChange={(e) => {
                                    const nextType = e.target.value;
                                    setColType(nextType);
                                    if (nextType === 'date') {
                                        setAddColOptions([]);
                                    } else if (nextType === 'checklist') {
                                        setAddColOptions(['N/A', 'Pending', 'Submitted']);
                                    } else {
                                        setAddColOptions([]);
                                    }
                                }}
                                className="w-full p-2.5 bg-[#faf9f8] border border-surface-200 rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 font-semibold text-xs text-surface-900 cursor-pointer"
                            >
                                <option value="text">Text / Dropdown</option>
                                <option value="date">Date picker</option>
                                <option value="checklist">Column Checklist</option>
                            </select>
                        </div>

                        {/* Dropdown Options */}
                        {colType === 'text' && (
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
                                        className="flex-1 p-2.5 bg-[#faf9f8] border border-surface-200 rounded-none outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 text-xs text-surface-700"
                                    />
                                    <button
                                        onClick={() => {
                                            if (addColNewOption.trim() && !addColOptions.includes(addColNewOption.trim())) {
                                                setAddColOptions(prev => [...prev, addColNewOption.trim()]);
                                                setAddColNewOption('');
                                            }
                                        }}
                                        className="px-3 py-2 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-surface-700 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Column Checklist Items configuration */}
                        {colType === 'checklist' && (
                            <div className="flex flex-col gap-3 border border-surface-200 p-3 bg-surface-50/50">
                                <label className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">Columns to check</label>
                                
                                {/* List of currently added checklist columns */}
                                {addColChecklistItems.length > 0 && (
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                        {addColChecklistItems.map((item, i) => (
                                            <div key={i} className="flex flex-col gap-1 bg-white border border-surface-200 p-2 text-[10px] font-bold uppercase tracking-wider text-surface-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate">{item.label} <span className="text-[8px] text-surface-400 font-normal">({item.source})</span></span>
                                                    <button
                                                        onClick={() => setAddColChecklistItems(prev => prev.filter((_, j) => j !== i))}
                                                        className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                                                        title="Remove Column"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="flex gap-2 items-center mt-1">
                                                    {/* Select Condition Type */}
                                                    <select
                                                        value={item.conditionType || 'content'}
                                                        onChange={(e) => {
                                                            const newCond = e.target.value;
                                                            setAddColChecklistItems(prev => {
                                                                const next = [...prev];
                                                                next[i] = {
                                                                    ...next[i],
                                                                    conditionType: newCond,
                                                                    matchValue: newCond === 'content' || newCond === 'is_numeric' ? undefined : (next[i].matchValue || '')
                                                                };
                                                                return next;
                                                            });
                                                        }}
                                                        className="flex-1 min-w-0 p-1 bg-[#faf9f8] border border-surface-200 text-[10px] font-semibold outline-none cursor-pointer"
                                                    >
                                                        <option value="content">Has Content</option>
                                                        <option value="matches">Matches Value</option>
                                                        <option value="gt">Greater Than (&gt;)</option>
                                                        <option value="lt">Less Than (&lt;)</option>
                                                        <option value="eq">Equals (=)</option>
                                                        <option value="is_numeric">Is Numeric</option>
                                                    </select>

                                                    {/* Match Value Input (if needed) */}
                                                    {['matches', 'gt', 'lt', 'eq'].includes(item.conditionType || '') && (
                                                        <div className="flex-1 min-w-0">
                                                            {item.conditionType === 'matches' ? (
                                                                (() => {
                                                                    const opts = getColumnOptions(item);
                                                                    if (opts && opts.length > 0) {
                                                                        return (
                                                                            <select
                                                                                value={item.matchValue || ''}
                                                                                onChange={(e) => {
                                                                                    const newVal = e.target.value;
                                                                                    setAddColChecklistItems(prev => {
                                                                                        const next = [...prev];
                                                                                        next[i] = { ...next[i], matchValue: newVal };
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                className="w-full p-1 bg-[#faf9f8] border border-surface-200 text-[10px] font-semibold outline-none cursor-pointer"
                                                                            >
                                                                                <option value="">Select value...</option>
                                                                                {opts.map((opt: string) => (
                                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <input
                                                                                type="text"
                                                                                value={item.matchValue || ''}
                                                                                onChange={(e) => {
                                                                                    const newVal = e.target.value;
                                                                                    setAddColChecklistItems(prev => {
                                                                                        const next = [...prev];
                                                                                        next[i] = { ...next[i], matchValue: newVal };
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                placeholder="Enter value"
                                                                                className="w-full p-1 bg-white border border-surface-200 text-[10px] font-semibold outline-none"
                                                                            />
                                                                        );
                                                                    }
                                                                })()
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={item.matchValue || ''}
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value;
                                                                        setAddColChecklistItems(prev => {
                                                                            const next = [...prev];
                                                                            next[i] = { ...next[i], matchValue: newVal };
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    placeholder="Number"
                                                                    className="w-full p-1 bg-white border border-surface-200 text-[10px] font-semibold outline-none"
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Checklist Item form */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 w-full min-w-0">
                                        <select
                                            value={selectedChecklistColKey}
                                            onChange={(e) => setSelectedChecklistColKey(e.target.value)}
                                            className="flex-1 min-w-0 p-2.5 bg-[#faf9f8] border border-surface-200 text-xs font-semibold text-surface-900 outline-none cursor-pointer"
                                        >
                                            <option value="">Select a column...</option>
                                            <optgroup label="Masterlist Columns">
                                                {availableChecklistColumns.filter(c => c.source === 'masterlist').map(c => (
                                                    <option key={c.key} value={c.key}>{c.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Interview Form Columns">
                                                {availableChecklistColumns.filter(c => c.source === 'interview').map(c => (
                                                    <option key={c.key} value={c.key}>{c.label}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        
                                        <button
                                            onClick={() => {
                                                const match = availableChecklistColumns.find(c => c.key === selectedChecklistColKey);
                                                if (match) {
                                                    const alreadyExists = addColChecklistItems.some(item => item.key === match.key);
                                                    if (!alreadyExists) {
                                                        setAddColChecklistItems(prev => [...prev, {
                                                            ...match,
                                                            conditionType: 'content',
                                                            matchValue: undefined
                                                        }]);
                                                    }
                                                    setSelectedChecklistColKey('');
                                                }
                                            }}
                                            disabled={!selectedChecklistColKey}
                                            className="px-3.5 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-surface-700 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all shrink-0"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-surface-100">
                            <button
                                onClick={() => setAddColumnModal(false)}
                                className="px-4 py-2 border border-surface-300 hover:bg-[#f8f9fa] text-surface-700 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!addColName.trim()) return;
                                    const sanitized = addColName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                                    const isDateCol = colType === 'date';
                                    const isChecklistCol = colType === 'checklist';
                                    const subField = 'custom_' + sanitized + (isDateCol ? '_date' : isChecklistCol ? '_checklist' : '');
                                    const newCol: any = {
                                        label: addColName.trim(),
                                        field: 'pis',
                                        subField,
                                        width: isChecklistCol ? 180 : 140
                                    };
                                    if (isDateCol) {
                                        newCol.type = 'date';
                                    }
                                    if (isChecklistCol) {
                                        newCol.type = 'checklist';
                                        newCol.checklistItems = addColChecklistItems;
                                    } else if (!isDateCol && addColOptions.length > 0) {
                                        newCol.options = addColOptions;
                                    }
                                    setCustomColumns(prev => {
                                        const current = prev[activeTabKey] || [...rawColumns];
                                        const newState = {
                                            ...prev,
                                            [activeTabKey]: [...current, newCol]
                                        };
                                        return newState;
                                    });
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
                            <span className="text-[12px] font-black text-primary-600 uppercase tracking-wider">
                                {colType === 'checklist' ? 'Edit Checklist Columns:' : 'Edit Dropdown Options:'} {editColOptionsModal.colName}
                            </span>
                        </div>

                        {/* Dropdown Options */}
                        {colType === 'text' && (
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
                        )}

                        {/* Checklist Configuration UI */}
                        {colType === 'checklist' && (
                            <div className="flex flex-col gap-3 border border-surface-200 p-3 bg-surface-50/50">
                                <label className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">Columns to check</label>
                                
                                {/* List of currently added checklist columns */}
                                {addColChecklistItems.length > 0 && (
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                        {addColChecklistItems.map((item, i) => (
                                            <div key={i} className="flex flex-col gap-1 bg-white border border-surface-200 p-2 text-[10px] font-bold uppercase tracking-wider text-surface-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate">{item.label} <span className="text-[8px] text-surface-400 font-normal">({item.source})</span></span>
                                                    <button
                                                        onClick={() => setAddColChecklistItems(prev => prev.filter((_, j) => j !== i))}
                                                        className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                                                        title="Remove Column"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="flex gap-2 items-center mt-1">
                                                    {/* Select Condition Type */}
                                                    <select
                                                        value={item.conditionType || 'content'}
                                                        onChange={(e) => {
                                                            const newCond = e.target.value;
                                                            setAddColChecklistItems(prev => {
                                                                const next = [...prev];
                                                                next[i] = {
                                                                    ...next[i],
                                                                    conditionType: newCond,
                                                                    matchValue: newCond === 'content' || newCond === 'is_numeric' ? undefined : (next[i].matchValue || '')
                                                                };
                                                                return next;
                                                            });
                                                        }}
                                                        className="flex-1 min-w-0 p-1 bg-[#faf9f8] border border-surface-200 text-[10px] font-semibold outline-none cursor-pointer"
                                                    >
                                                        <option value="content">Has Content</option>
                                                        <option value="matches">Matches Value</option>
                                                        <option value="gt">Greater Than (&gt;)</option>
                                                        <option value="lt">Less Than (&lt;)</option>
                                                        <option value="eq">Equals (=)</option>
                                                        <option value="is_numeric">Is Numeric</option>
                                                    </select>

                                                    {/* Match Value Input (if needed) */}
                                                    {['matches', 'gt', 'lt', 'eq'].includes(item.conditionType || '') && (
                                                        <div className="flex-1 min-w-0">
                                                            {item.conditionType === 'matches' ? (
                                                                (() => {
                                                                    const opts = getColumnOptions(item);
                                                                    if (opts && opts.length > 0) {
                                                                        return (
                                                                            <select
                                                                                value={item.matchValue || ''}
                                                                                onChange={(e) => {
                                                                                    const newVal = e.target.value;
                                                                                    setAddColChecklistItems(prev => {
                                                                                        const next = [...prev];
                                                                                        next[i] = { ...next[i], matchValue: newVal };
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                className="w-full p-1 bg-[#faf9f8] border border-surface-200 text-[10px] font-semibold outline-none cursor-pointer"
                                                                            >
                                                                                <option value="">Select value...</option>
                                                                                {opts.map((opt: string) => (
                                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <input
                                                                                type="text"
                                                                                value={item.matchValue || ''}
                                                                                onChange={(e) => {
                                                                                    const newVal = e.target.value;
                                                                                    setAddColChecklistItems(prev => {
                                                                                        const next = [...prev];
                                                                                        next[i] = { ...next[i], matchValue: newVal };
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                placeholder="Enter value"
                                                                                className="w-full p-1 bg-white border border-surface-200 text-[10px] font-semibold outline-none"
                                                                            />
                                                                        );
                                                                    }
                                                                })()
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={item.matchValue || ''}
                                                                    onChange={(e) => {
                                                                        const newVal = e.target.value;
                                                                        setAddColChecklistItems(prev => {
                                                                            const next = [...prev];
                                                                            next[i] = { ...next[i], matchValue: newVal };
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    placeholder="Number"
                                                                    className="w-full p-1 bg-white border border-surface-200 text-[10px] font-semibold outline-none"
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Checklist Item form */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 w-full min-w-0">
                                        <select
                                            value={selectedChecklistColKey}
                                            onChange={(e) => setSelectedChecklistColKey(e.target.value)}
                                            className="flex-1 min-w-0 p-2.5 bg-[#faf9f8] border border-surface-200 text-xs font-semibold text-surface-900 outline-none cursor-pointer"
                                        >
                                            <option value="">Select a column...</option>
                                            <optgroup label="Masterlist Columns">
                                                {availableChecklistColumns.filter(c => c.source === 'masterlist').map(c => (
                                                    <option key={c.key} value={c.key}>{c.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Interview Form Columns">
                                                {availableChecklistColumns.filter(c => c.source === 'interview').map(c => (
                                                    <option key={c.key} value={c.key}>{c.label}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        
                                        <button
                                            onClick={() => {
                                                const match = availableChecklistColumns.find(c => c.key === selectedChecklistColKey);
                                                if (match) {
                                                    const alreadyExists = addColChecklistItems.some(item => item.key === match.key);
                                                    if (!alreadyExists) {
                                                        setAddColChecklistItems(prev => [...prev, {
                                                            ...match,
                                                            conditionType: 'content',
                                                            matchValue: undefined
                                                        }]);
                                                    }
                                                    setSelectedChecklistColKey('');
                                                }
                                            }}
                                            disabled={!selectedChecklistColKey}
                                            className="px-3.5 py-2.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-surface-700 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all shrink-0"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    if (colType === 'checklist') {
                                        setCustomColumns(prev => {
                                            const current = prev[activeTabKey] || [];
                                            const updated = current.map((c: any) => {
                                                if (getColumnKey(c) === editColOptionsModal.colKey) {
                                                    return {
                                                        ...c,
                                                        checklistItems: addColChecklistItems
                                                    };
                                                }
                                                return c;
                                            });
                                            const newState = {
                                                ...prev,
                                                [activeTabKey]: updated
                                            };
                                            return newState;
                                        });
                                    } else {
                                        const meta = { ...customColumnMeta };
                                        if (!meta[activeTabKey]) meta[activeTabKey] = {};
                                        meta[activeTabKey][editColOptionsModal.colKey] = {
                                            ...meta[activeTabKey][editColOptionsModal.colKey],
                                            options: addColOptions.length > 0 ? addColOptions : undefined
                                        };
                                        setCustomColumnMeta(meta);
                                    }
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
