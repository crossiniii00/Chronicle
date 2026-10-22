import React from 'react';
import { createPortal } from 'react-dom';
import { Mail, Loader2, X, Calendar, AlertCircle, Clipboard, EyeOff, Edit3, ArrowLeft, ArrowRight, Settings, Lock, Unlock, Eraser, SlidersHorizontal, Filter, ArrowUpAZ, ArrowDownAZ, Search, Check, Palette, Trash2 } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application, EmailTemplate } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { MASTERLIST_COLUMNS, QUERY2_COLUMNS, OFFBOARDING_COLUMNS, ONBOARDING_WINNERS_COLUMNS, YC_COLUMNS, PIVOT_COLUMNS, POOL_COLUMNS, NOT_ELIGIBLE_COLUMNS, EMAIL_COLUMNS, INACTIVE_APPLICATION_COLUMNS } from '../constants';
import { SHEET_COLUMNS } from '../../constants';
import { apiClient } from '@/utils/apiClient';
import { ApplicationService } from '@/services/ApplicationService';
import { ReportConfigService } from '@/services/ReportConfigService';
import { getDefaultOptionsForColKey } from '../../components/tableUtils';
import * as helpers from '../../utils/tableHelpers';
import { useAuthStore } from '@/store/authStore';

import {
    getTableWidth,
    HIRE_ELIGIBILITY_WIDTH
} from './tableHelpers';
import { ApplicationRow } from './ApplicationRow';

export { spotlightCell } from './tableHelpers';

export const OPTION_COLOR_PRESETS = [
    { id: 'slate', name: 'Gray (Slate)', bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
    { id: 'emerald', name: 'Green (Passed / Hired)', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    { id: 'blue', name: 'Blue (Processed / Sent JO)', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    { id: 'amber', name: 'Amber (For JO / Pending)', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    { id: 'rose', name: 'Red (Failed / Withdrawn)', bg: '#FEF2F2', text: '#BE123C', border: '#FECDD3' },
    { id: 'purple', name: 'Purple (Special / Transfer)', bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' },
    { id: 'cyan', name: 'Cyan (PAN Issued / Signature)', bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
    { id: 'orange', name: 'Orange (Action Required)', bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' }
];

export const getDefaultColorForOption = (optName: string): { bg: string; text: string; border: string } => {
    const s = String(optName || '').toUpperCase();
    if (s.includes('PASS') || s.includes('HIRED') || s.includes('ACCEPTED') || s.includes('SHOWED')) {
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
    }
    if (s.includes('SENT') || s.includes('PROCESSED') || s.includes('SCHEDULED') || s.includes('DONE') || s.includes('EMAIL SENT')) {
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    }
    if (s.includes('FOR') || s.includes('PENDING') || s.includes('REVIEW') || s.includes('AWAITING RESPONSE')) {
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    }
    if (s.includes('FAIL') || s.includes('WITHDRAWN') || s.includes('REJECT') || s.includes('NO-SHOW') || s.includes('NO SHOW')) {
        return { bg: '#FEF2F2', text: '#BE123C', border: '#FECDD3' };
    }
    if (s.includes('PAN') || s.includes('SIGNATURE')) {
        return { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' };
    }
    if (s.includes('PROMOTION') || s.includes('SPECIAL') || s.includes('TRANSFER')) {
        return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
    }
    return { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' };
};

interface MasterlistTableProps {
    activeTab: string;
    activeSubTab: string;
    filteredList: Application[];
    isEditing: boolean;
    setIsEditing: (val: boolean) => void;
    isConfigEditing?: boolean;
    localChanges: any;
    onEdit: (appId: string, field: keyof Application, value: any) => void;
    onMoveRow?: (appId: string, direction: 'up' | 'down') => void;
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    isSelectMode: boolean;
    setIsSelectMode?: (val: boolean) => void;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    onShowNotes?: (app: Application, rect: DOMRect) => void;
    onShowHistory?: (app: Application) => void;
    onManageResume?: (app: Application) => void;
    focusPath?: { appId: string, colKey: string } | null;
    setFocusPath?: (path: { appId: string, colKey: string } | null) => void;
    search?: string;
    onViewProfile?: (app: Application) => void;
    onViewPISDashboard?: (app: Application) => void;
    bulkPromptType?: 'NEO' | 'PEME' | 'RCBC' | null;
    onClearBulkPrompt?: () => void;
    onPromoteToHired?: (app: Application, complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT', positionId?: string) => Promise<void> | void;
    promotingId?: string | null;
    duplicateGovIdsMap?: Record<string, string[]>;
    setActiveTab?: (tab: string) => void;
}

const EMPTY_CHANGES = {};
const EMPTY_HIGHLIGHTS = {};

const COLUMN_HIGHLIGHT_COLORS = [
    { name: 'Yellow', color: '#facc15' },
    { name: 'Blue', color: '#60a5fa' },
    { name: 'Green', color: '#4ade80' },
    { name: 'Pink', color: '#f472b6' },
    { name: 'Purple', color: '#c084fc' },
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
    activeTab, activeSubTab, filteredList, isEditing, setIsEditing, isConfigEditing, localChanges, onEdit, onMoveRow, selectedIds,
    setSelectedIds, isSelectMode, setIsSelectMode,
    onToggleSelect, onToggleSelectAll, scrollContainerRef, onShowNotes, onShowHistory, onManageResume, focusPath, setFocusPath,
    search = '', onViewProfile, onViewPISDashboard,
    bulkPromptType, onClearBulkPrompt,
    onPromoteToHired, promotingId, duplicateGovIdsMap,
    setActiveTab
}: MasterlistTableProps) {
    const { user } = useAuthStore();

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

    const { activeBufferCount, activeConfirmedCount } = React.useMemo(() => {
        let buffer = 0;
        let confirmed = 0;
        for (const app of filteredList) {
            const remarks = String(app.master_remarks || app.pis?.ops_validation_remarks || '').toUpperCase();
            if (remarks.includes('CONFIRMED TRAINING - BUFFER')) {
                buffer++;
            } else if (remarks.includes('CONFIRMED TRAINING')) {
                confirmed++;
            }
        }
        return { activeBufferCount: buffer, activeConfirmedCount: confirmed };
    }, [filteredList]);

    const [addColumnModal, setAddColumnModal] = React.useState<boolean>(false);
    const [addColName, setAddColName] = React.useState('');
    const [addColOptions, setAddColOptions] = React.useState<string[]>([]);
    const [addColNewOption, setAddColNewOption] = React.useState('');
    const [editColOptionsModal, setEditColOptionsModal] = React.useState<{ colKey: string; colName: string } | null>(null);
    const [colType, setColType] = React.useState<string>('text');
    const [addColChecklistItems, setAddColChecklistItems] = React.useState<any[]>([]);
    const [selectedChecklistColKey, setSelectedChecklistColKey] = React.useState<string>('');
    const [customColumnMeta, setCustomColumnMeta] = React.useState<Record<string, Record<string, { options?: string[]; optionColors?: Record<string, { bg: string; text: string; border: string }> }>>>({});
    const [addColOptionColors, setAddColOptionColors] = React.useState<Record<string, { bg: string; text: string; border: string }>>({});
    const [openColorPickerIndex, setOpenColorPickerIndex] = React.useState<number | null>(null);
    const [customColumns, setCustomColumns] = React.useState<Record<string, any[]>>({});
    const [highlightedColumns, setHighlightedColumns] = React.useState<Record<string, Record<string, string>>>({});
    const [highlightedHeaders, setHighlightedHeaders] = React.useState<Record<string, Record<string, string>>>({});
    const [customColumnNames, setCustomColumnNames] = React.useState<Record<string, Record<string, string>>>({});
    const [hiddenColumns, setHiddenColumns] = React.useState<Record<string, string[]>>({});
    const [frozenColumns, setFrozenColumns] = React.useState<Record<string, string[]>>({});
    const [frozenRightColumns, setFrozenRightColumns] = React.useState<Record<string, string[]>>({});
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [showHiddenColsModal, setShowHiddenColsModal] = React.useState(false);
    const [draggedColIndex, setDraggedColIndex] = React.useState<number | null>(null);

    const activeTabKey = React.useMemo(() => {
        if (activeTab === 'SHEET1' && activeSubTab === 'NOT ELIGIBLE') {
            return 'SHEET1_NOT_ELIGIBLE';
        }
        return activeTab;
    }, [activeTab, activeSubTab]);

    // Fetch masterlist custom tracker configuration from DB on mount
    const [tempHiddenCols, setTempHiddenCols] = React.useState<string[] | null>(null);

    React.useEffect(() => {
        if (showHiddenColsModal) {
            setTempHiddenCols(hiddenColumns[activeTabKey] || []);
        } else {
            setTempHiddenCols(null);
        }
    }, [showHiddenColsModal, hiddenColumns, activeTabKey]);

    React.useEffect(() => {
        const handleOpenModal = () => {
            setShowHiddenColsModal(true);
        };
        window.addEventListener('open-hidden-cols-modal', handleOpenModal);
        return () => window.removeEventListener('open-hidden-cols-modal', handleOpenModal);
    }, []);

    React.useEffect(() => {
        window.dispatchEvent(new CustomEvent('hidden-columns-change', {
            detail: (hiddenColumns[activeTabKey] || []).length
        }));
    }, [hiddenColumns, activeTabKey]);

    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const dbSettings = await ReportConfigService.getById('masterlist_tracker_settings');
                if (dbSettings) {
                    if (dbSettings.customColumnMeta) setCustomColumnMeta(dbSettings.customColumnMeta);
                    if (dbSettings.customColumns) {
                        const filteredCustomCols = {} as Record<string, any[]>;
                        for (const sheet in dbSettings.customColumns) {
                            filteredCustomCols[sheet] = dbSettings.customColumns[sheet].filter((c: any) => c.label !== 'POE' && c.label !== 'COE');
                        }
                        setCustomColumns(filteredCustomCols);
                    } else {
                        setCustomColumns({});
                    }
                    if (dbSettings.highlightedColumns) setHighlightedColumns(dbSettings.highlightedColumns);
                    if (dbSettings.highlightedHeaders) setHighlightedHeaders(dbSettings.highlightedHeaders);
                    if (dbSettings.customColumnNames) {
                        const filteredCustomColNames = {} as Record<string, Record<string, string>>;
                        for (const sheet in dbSettings.customColumnNames) {
                            filteredCustomColNames[sheet] = {};
                            for (const [key, val] of Object.entries(dbSettings.customColumnNames[sheet] as Record<string, string>)) {
                                if (val !== 'POE' && val !== 'COE') {
                                    filteredCustomColNames[sheet][key] = val;
                                }
                            }
                        }
                        setCustomColumnNames(filteredCustomColNames);
                    } else {
                        setCustomColumnNames({});
                    }
                    // hiddenColumns is intentionally omitted here; it is loaded exclusively per-user from localStorage
                    if (dbSettings.frozenColumns) {
                        const normalized: Record<string, string[]> = {};
                        Object.entries(dbSettings.frozenColumns).forEach(([k, v]) => {
                            if (Array.isArray(v)) {
                                normalized[k] = v;
                            } else {
                                normalized[k] = [];
                            }
                        });
                        setFrozenColumns(normalized);
                    }
                    if (dbSettings.frozenRightColumns) {
                        const normalized: Record<string, string[]> = {};
                        Object.entries(dbSettings.frozenRightColumns).forEach(([k, v]) => {
                            if (Array.isArray(v)) {
                                normalized[k] = v;
                            } else {
                                normalized[k] = [];
                            }
                        });
                        setFrozenRightColumns(normalized);
                    }
                } else {
                    // Migrate from localStorage to DB if db settings don't exist yet
                    const localMeta = localStorage.getItem('masterlist_custom_column_meta');
                    const localCols = localStorage.getItem('masterlist_custom_columns_by_tab_v2');
                    const localHighCols = localStorage.getItem('masterlist_highlighted_columns_all');
                    const localHighHeads = localStorage.getItem('masterlist_highlighted_headers_all');
                    const localColNames = localStorage.getItem('masterlist_custom_column_names_all');
                    const localHiddenCols = localStorage.getItem(`masterlist_hidden_columns_user_${user?.id || 'guest'}`);
                    const localFrozen = localStorage.getItem('masterlist_frozen_columns_all');

                    const migrationData: any = {};
                    if (localMeta) {
                        const parsed = JSON.parse(localMeta);
                        setCustomColumnMeta(parsed);
                        migrationData.customColumnMeta = parsed;
                    }
                    if (localCols) {
                        const parsed = JSON.parse(localCols);
                        const filteredCustomCols = {} as Record<string, any[]>;
                        for (const sheet in parsed) {
                            filteredCustomCols[sheet] = parsed[sheet].filter((c: any) => c.label !== 'POE' && c.label !== 'COE');
                        }
                        setCustomColumns(filteredCustomCols);
                        migrationData.customColumns = filteredCustomCols;
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
                        const filteredCustomColNames = {} as Record<string, Record<string, string>>;
                        for (const sheet in parsed) {
                            filteredCustomColNames[sheet] = {};
                            for (const [key, val] of Object.entries(parsed[sheet] as Record<string, string>)) {
                                if (val !== 'POE' && val !== 'COE') {
                                    filteredCustomColNames[sheet][key] = val;
                                }
                            }
                        }
                        setCustomColumnNames(filteredCustomColNames);
                        migrationData.customColumnNames = filteredCustomColNames;
                    }
                    if (localHiddenCols) {
                        const parsed = JSON.parse(localHiddenCols);
                        setHiddenColumns(parsed);
                        // Do not migrate hiddenColumns to DB as we want them per-user locally
                    }
                    if (localFrozen) {
                        const parsed = JSON.parse(localFrozen);
                        const normalized: Record<string, string[]> = {};
                        Object.entries(parsed).forEach(([k, v]) => {
                            if (Array.isArray(v)) {
                                normalized[k] = v;
                            } else {
                                normalized[k] = [];
                            }
                        });
                        setFrozenColumns(normalized);
                        migrationData.frozenColumns = normalized;
                    }
                    if (dbSettings && (dbSettings as any).frozenRightColumns) {
                        const normalized: any = {};
                        Object.entries((dbSettings as any).frozenRightColumns).forEach(([k, v]) => {
                            if (Array.isArray(v)) normalized[k] = v;
                        });
                        setFrozenRightColumns(normalized);
                        migrationData.frozenRightColumns = normalized;
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
                    const localCols = localStorage.getItem('masterlist_custom_columns_by_tab_v2');
                    const localHighCols = localStorage.getItem('masterlist_highlighted_columns_all');
                    const localHighHeads = localStorage.getItem('masterlist_highlighted_headers_all');
                    const localColNames = localStorage.getItem('masterlist_custom_column_names_all');
                    const localHiddenCols = localStorage.getItem(`masterlist_hidden_columns_user_${user?.id || 'guest'}`);

                    if (localMeta) setCustomColumnMeta(JSON.parse(localMeta));
                    if (localCols) setCustomColumns(JSON.parse(localCols));
                    if (localHighCols) setHighlightedColumns(JSON.parse(localHighCols));
                    if (localHighHeads) setHighlightedHeaders(JSON.parse(localHighHeads));
                    if (localColNames) setCustomColumnNames(JSON.parse(localColNames));
                    if (localHiddenCols) setHiddenColumns(JSON.parse(localHiddenCols));

                    const localFrozen = localStorage.getItem('masterlist_frozen_columns_all');
                    if (localFrozen) {
                        const parsed = JSON.parse(localFrozen);
                        const normalized: Record<string, string[]> = {};
                        Object.entries(parsed).forEach(([k, v]) => {
                            if (Array.isArray(v)) {
                                normalized[k] = v;
                            } else {
                                normalized[k] = [];
                            }
                        });
                        setFrozenColumns(normalized);
                    }
                    const localFrozenRight = localStorage.getItem('masterlist_frozen_right_columns_all');
                    if (localFrozenRight) {
                        const parsed = JSON.parse(localFrozenRight);
                        const normalized: any = {};
                        Object.entries(parsed).forEach(([k, v]) => {
                            if (Array.isArray(v)) normalized[k] = v;
                        });
                        setFrozenRightColumns(normalized);
                    }
                } catch { }
            } finally {
                setIsLoaded(true);
            }
        };
        loadSettings();
    }, [user?.id]);

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
                    customColumnNames,
                    // hiddenColumns omitted intentionally to prevent global sync across users
                    frozenColumns,
                    frozenRightColumns
                });
                // Sync locally as fallback backup
                localStorage.setItem('masterlist_custom_column_meta', JSON.stringify(customColumnMeta));
                localStorage.setItem('masterlist_custom_columns_by_tab_v2', JSON.stringify(customColumns));
                localStorage.setItem('masterlist_highlighted_columns_all', JSON.stringify(highlightedColumns));
                localStorage.setItem('masterlist_highlighted_headers_all', JSON.stringify(highlightedHeaders));
                localStorage.setItem('masterlist_custom_column_names_all', JSON.stringify(customColumnNames));
                localStorage.setItem(`masterlist_hidden_columns_user_${user?.id || 'guest'}`, JSON.stringify(hiddenColumns));
                localStorage.setItem('masterlist_frozen_columns_all', JSON.stringify(frozenColumns));
                localStorage.setItem('masterlist_frozen_right_columns_all', JSON.stringify(frozenRightColumns));
            } catch (err) {
                console.error('[MasterlistTable] Failed to save custom settings:', err);
            }
        };

        const timer = setTimeout(saveSettings, 1000);
        return () => clearTimeout(timer);
    }, [customColumnMeta, customColumns, highlightedColumns, highlightedHeaders, customColumnNames, hiddenColumns, frozenColumns, frozenRightColumns, isLoaded, user?.id]);


    const handleDragDropColumn = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const colA = columns[fromIndex];
        const colB = columns[toIndex];
        if (!colA || !colB) return;

        const updated = [...rawColumns];
        const rawIdxA = updated.findIndex(c => getColumnKey(c) === getColumnKey(colA));
        const rawIdxB = updated.findIndex(c => getColumnKey(c) === getColumnKey(colB));

        if (rawIdxA === -1 || rawIdxB === -1) return;

        const [movedCol] = updated.splice(rawIdxA, 1);
        const targetIdx = updated.findIndex(c => getColumnKey(c) === getColumnKey(colB));
        const finalInsertIdx = fromIndex < toIndex ? targetIdx + 1 : targetIdx;

        updated.splice(finalInsertIdx, 0, movedCol);

        const newCustom = {
            ...customColumns,
            [activeTabKey]: updated
        };
        setCustomColumns(newCustom);
    };

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
                } catch { }
            }).catch(() => { });
        });
    }, []);

    const [activeColumnMenu, setActiveColumnMenu] = React.useState<{
        colName: string;
        colKey: string;
        x: number;
        y: number;
        tempSelected?: string[];
    } | null>(null);
    const [renamePrompt, setRenamePrompt] = React.useState<{
        colKey: string;
        colName: string;
    } | null>(null);

    const [columnMenuTab, setColumnMenuTab] = React.useState<'SETTINGS' | 'FILTER'>('SETTINGS');
    const [columnFilterSearch, setColumnFilterSearch] = React.useState('');
    const [tempSelectedFilterValues, setTempSelectedFilterValues] = React.useState<string[]>([]);
    const [activeFilters, setActiveFilters] = React.useState<Record<string, string[]>>({});
    const [activeSort, setActiveSort] = React.useState<{ colKey: string; dir: 'asc' | 'desc' } | null>(null);

    // Helper to compute the hire eligibility label for a given app (for filtering/sorting the computed HIRE column)
    // NOTE: Inlined to avoid circular dependency (MasterlistTable re-exports from tableHelpers, so importing from it or tableUtils causes TDZ errors)
    const getHireLabel = React.useCallback((app: Application) => {
        const rowLC = localChanges[app.id] || {};
        const appDept = (
            rowLC.department !== undefined
                ? rowLC.department
                : (app.department || app.endorsement_account || app.pis?.final_account || '')
        ).trim().toLowerCase();
        const dObj = departmentsList.find((d: any) => d.name.trim().toLowerCase() === appDept);
        const eligSettings = dObj?.eligibilitySettings;

        // Inline normalizeStatusText
        const norm = (v: any) => String(v || '').toLowerCase().trim();

        const effectiveStatus = norm(rowLC.current_status !== undefined ? rowLC.current_status : app.current_status);
        const effectiveFSS = norm((rowLC.pis?.final_specific_status !== undefined ? rowLC.pis.final_specific_status : (app.pis as any)?.final_specific_status));
        const effectiveFirstDay = norm(rowLC.master_first_day_show_up !== undefined ? rowLC.master_first_day_show_up : app.master_first_day_show_up);
        const effectiveSecondDay = norm(rowLC.master_second_day_show_up !== undefined ? rowLC.master_second_day_show_up : app.master_second_day_show_up);
        const effectivePemeStatus = norm(rowLC.master_peme_status !== undefined ? rowLC.master_peme_status : app.master_peme_status);
        const effectivePemeResult = norm(rowLC.master_peme_result !== undefined ? rowLC.master_peme_result : app.master_peme_result);
        const effectiveBgs = norm(rowLC.master_bgs_status !== undefined ? rowLC.master_bgs_status : app.master_bgs_status);
        const effectiveRcbc = norm(rowLC.master_rcbc_status !== undefined ? rowLC.master_rcbc_status : app.master_rcbc_status);
        const effectiveNbi = norm(rowLC.master_nbi_result !== undefined ? rowLC.master_nbi_result : app.master_nbi_result);

        const stdCheck = (label: string, std: string | undefined, defaultCheck: boolean) => {
            if (std) return norm(std) === norm(label === 'Status' ? effectiveStatus : label === '1st Day Show up' ? effectiveFirstDay : label === '2nd Day Show up' ? effectiveSecondDay : '');
            return defaultCheck;
        };

        const checks: Record<string, boolean> = {
            'Status': eligSettings?.standardSettings?.['Status']
                ? norm(effectiveStatus) === norm(eligSettings.standardSettings['Status'])
                : (effectiveStatus === 'accepted offer' || effectiveStatus === 'hired' || effectiveFSS === 'jo - offered' || effectiveFSS === 'jo - hired'),
            '1st Day Show up': eligSettings?.standardSettings?.['1st Day Show up']
                ? norm(effectiveFirstDay) === norm(eligSettings.standardSettings['1st Day Show up'])
                : (effectiveFirstDay === 'showed' || effectiveFirstDay === 'present'),
            'Final Specific Status': eligSettings?.standardSettings?.['Final Specific Status']
                ? norm(effectiveFSS) === norm(eligSettings.standardSettings['Final Specific Status'])
                : (effectiveFSS.includes('ov - passed') || effectiveFSS.includes('client assessment - passed') || effectiveFSS.includes('client interview - passed') || effectiveFSS.includes('jo - offered') || effectiveFSS.includes('jo - hired') || effectiveStatus === 'accepted offer' || effectiveStatus === 'hired'),
            '2nd Day Show up': eligSettings?.standardSettings?.['2nd Day Show up']
                ? norm(effectiveSecondDay) === norm(eligSettings.standardSettings['2nd Day Show up'])
                : (effectiveSecondDay === 'showed' || effectiveSecondDay === 'present'),
            'PEME Status': eligSettings?.standardSettings?.['PEME Status']
                ? (norm(effectivePemeStatus) === norm(eligSettings.standardSettings['PEME Status']) || norm(effectivePemeResult) === norm(eligSettings.standardSettings['PEME Status']))
                : ((!!effectivePemeStatus && effectivePemeStatus.includes('endorsed')) || (!!effectivePemeResult && (effectivePemeResult.includes('fit') || effectivePemeResult.includes('passed') || effectivePemeResult.includes('clear') || effectivePemeResult.includes('class')))),
            'BGS Status': eligSettings?.standardSettings?.['BGS Status']
                ? norm(effectiveBgs) === norm(eligSettings.standardSettings['BGS Status'])
                : (!!effectiveBgs && (effectiveBgs.includes('pass') || effectiveBgs.includes('clear') || effectiveBgs.includes('complete'))),
            'RCBC Status': eligSettings?.standardSettings?.['RCBC Status']
                ? norm(effectiveRcbc) === norm(eligSettings.standardSettings['RCBC Status'])
                : (!!effectiveRcbc && (effectiveRcbc.includes('pass') || effectiveRcbc.includes('clear') || effectiveRcbc.includes('complete'))),
            'NBI Status': eligSettings?.standardSettings?.['NBI Status']
                ? norm(effectiveNbi) === norm(eligSettings.standardSettings['NBI Status'])
                : (!!effectiveNbi && (effectiveNbi.includes('pass') || effectiveNbi.includes('clear') || effectiveNbi.includes('complete'))),
        };

        const requiredLabels = eligSettings?.required ?? ['Status', '1st Day Show up', 'Final Specific Status'];
        const metRequired = requiredLabels.filter((l: string) => checks[l]).length;
        const totalRequired = requiredLabels.length;
        const isEligible = metRequired === totalRequired;

        return isEligible ? `✓ ${metRequired}/${totalRequired}` : `✗ ${metRequired}/${totalRequired}`;
    }, [localChanges, departmentsList]);

    const processedList = React.useMemo(() => {
        let list = [...filteredList];

        // Helper: resolve field value from a colKey (supports dot notation like 'pis.final_specific_status')
        const resolveValue = (app: any, colKey: string): string => {
            const dotIdx = colKey.indexOf('.');
            let val: any;
            if (dotIdx > -1) {
                const field = colKey.substring(0, dotIdx);
                const subField = colKey.substring(dotIdx + 1);
                val = app[field]?.[subField];
            } else {
                val = app[colKey];
            }
            return (val === undefined || val === null || String(val).trim() === '' || String(val) === '---')
                ? '(Blanks)'
                : String(val).trim();
        };

        // Apply activeFilters (column checkboxes filter)
        const filterKeys = Object.keys(activeFilters);
        if (filterKeys.length > 0) {
            list = list.filter(app => {
                return filterKeys.every(colKey => {
                    const allowedVals = activeFilters[colKey];
                    if (!allowedVals) return true;

                    // Handle computed HIRE column specially
                    if (colKey === 'hire') {
                        const hireLabel = getHireLabel(app);
                        return allowedVals.includes(hireLabel);
                    }

                    return allowedVals.includes(resolveValue(app, colKey));
                });
            });
        }

        // Apply activeSort (column sorting)
        if (activeSort) {
            const { colKey, dir } = activeSort;

            // Handle computed HIRE column sorting
            if (colKey === 'hire') {
                list.sort((a, b) => {
                    const labelA = getHireLabel(a);
                    const labelB = getHireLabel(b);
                    const cmp = labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
                    return dir === 'asc' ? cmp : -cmp;
                });
            } else {
                list.sort((a, b) => {
                    const strA = resolveValue(a, colKey);
                    const strB = resolveValue(b, colKey);
                    const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
                    return dir === 'asc' ? cmp : -cmp;
                });
            }
        }

        return list;
    }, [filteredList, activeFilters, activeSort, getHireLabel]);

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
    const [schedPrompt, setSchedPrompt] = React.useState<{ app?: Application, type: string, isBulk?: boolean } | null>(null);
    const [schedValue, setSchedValue] = React.useState('Monday, May 11, 2026, from 10:00 AM to 4:00 PM');
    const [isSendingSched, setIsSendingSched] = React.useState(false);
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

            setSelectedIds((prev: Set<string>) => {
                const newSelected = new Set(prev);
                const isAdding = !prev.has(appId);

                for (let i = start; i <= end; i++) {
                    if (i >= 0 && i < processedList.length) {
                        if (isAdding) newSelected.add(processedList[i].id);
                        else newSelected.delete(processedList[i].id);
                    }
                }
                return newSelected;
            });
        } else {
            onToggleSelect(appId);
        }
        setLastSelectedIndex(index);
    }, [lastSelectedIndex, processedList, setSelectedIds, onToggleSelect]);

    const dragActionRef = React.useRef<'add' | 'remove' | null>(null);
    const holdTimerRef = React.useRef<any>(null);

    const clearHoldTimer = React.useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const holdMouseOriginRef = React.useRef<{ x: number; y: number } | null>(null);
    const holdMoveListenerRef = React.useRef<((e: MouseEvent) => void) | null>(null);

    const cleanupHoldMoveListener = React.useCallback(() => {
        if (holdMoveListenerRef.current) {
            document.removeEventListener('mousemove', holdMoveListenerRef.current);
            holdMoveListenerRef.current = null;
        }
        holdMouseOriginRef.current = null;
    }, []);

    const handleRowMouseDown = React.useCallback((e: React.MouseEvent, index: number, appId: string) => {
        if (e.button !== 0) return; // Only left-click triggers selection

        clearHoldTimer();
        cleanupHoldMoveListener();

        if (isSelectMode) {
            if (e.shiftKey && lastSelectedIndex !== null) {
                handleToggleSelect(e, index, appId);
                return;
            }

            isDragSelectingRef.current = true;
            dragStartIndexRef.current = index;
            setLastSelectedIndex(index);

            setSelectedIds((prev: Set<string>) => {
                const action = prev.has(appId) ? 'remove' : 'add';
                dragActionRef.current = action;

                // Snapshot of selected IDs before drag started
                initialSelectedIdsRef.current = new Set(prev);

                // Toggle clicked row immediately
                const newSelected = new Set(prev);
                if (action === 'add') {
                    newSelected.add(appId);
                } else {
                    newSelected.delete(appId);
                }
                return newSelected;
            });
        } else {
            // Hold for 4 seconds to activate multi-select, but cancel if mouse moves (text selection)
            holdMouseOriginRef.current = { x: e.clientX, y: e.clientY };

            holdTimerRef.current = setTimeout(() => {
                cleanupHoldMoveListener();
                if (setIsSelectMode) setIsSelectMode(true);
                isDragSelectingRef.current = true;
                dragStartIndexRef.current = index;
                setLastSelectedIndex(index);
                dragActionRef.current = 'add';

                setSelectedIds((prev: Set<string>) => {
                    const newSelected = new Set(prev);
                    newSelected.add(appId);
                    initialSelectedIdsRef.current = new Set(newSelected);
                    return newSelected;
                });
            }, 3000);

            // Cancel hold timer if mouse moves more than 15px (user is selecting text)
            const moveHandler = (me: MouseEvent) => {
                const origin = holdMouseOriginRef.current;
                if (!origin) return;
                const dx = Math.abs(me.clientX - origin.x);
                const dy = Math.abs(me.clientY - origin.y);
                if (dx > 15 || dy > 15) {
                    clearHoldTimer();
                    cleanupHoldMoveListener();
                }
            };
            holdMoveListenerRef.current = moveHandler;
            document.addEventListener('mousemove', moveHandler);
        }
    }, [isSelectMode, setSelectedIds, setIsSelectMode, handleToggleSelect, lastSelectedIndex, clearHoldTimer, cleanupHoldMoveListener]);

    const handleRowMouseUp = React.useCallback(() => {
        clearHoldTimer();
        cleanupHoldMoveListener();
    }, [clearHoldTimer, cleanupHoldMoveListener]);

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            isDragSelectingRef.current = false;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleRowMouseEnter = React.useCallback((index: number, _appId: string) => {
        // Selection logic
        if (!isSelectMode || !isDragSelectingRef.current || !dragActionRef.current || dragStartIndexRef.current === null) return;

        const startIndex = dragStartIndexRef.current;
        const start = Math.min(startIndex, index);
        const end = Math.max(startIndex, index);

        // Start from snapshot of selected IDs before drag started
        const newSelected = new Set(initialSelectedIdsRef.current);

        for (let i = start; i <= end; i++) {
            if (i >= 0 && i < processedList.length) {
                const id = processedList[i].id;
                if (dragActionRef.current === 'add') {
                    newSelected.add(id);
                } else {
                    newSelected.delete(id);
                }
            }
        }

        setSelectedIds(newSelected);
        setLastSelectedIndex(index);
    }, [processedList, isSelectMode, setSelectedIds]);

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
            if (colName === "Id" || colName === "Start time" || colName === "Completion time" || colName === "Last Processed/Updated By:") return;
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
            activeTab === 'OFFBOARDING_TRACKER' ? OFFBOARDING_COLUMNS :
                activeTab === 'OFFBOARDING_WINNERS' ? ONBOARDING_WINNERS_COLUMNS :
                    activeTab === 'YC' ? YC_COLUMNS :
                        activeTab === 'PIVOT' ? PIVOT_COLUMNS :
                            activeTab === 'SHEET1' && activeSubTab === 'NOT ELIGIBLE' ? NOT_ELIGIBLE_COLUMNS :
                                activeTab === 'SHEET1' ? MASTERLIST_COLUMNS :
                                    activeTab === 'POOL' ? POOL_COLUMNS :
                                        activeTab === 'EMAIL' ? EMAIL_COLUMNS :
                                            activeTab === 'CONCLUDED' ? MASTERLIST_COLUMNS :
                                                activeTab === 'INACTIVE_APPLICATION' ? INACTIVE_APPLICATION_COLUMNS :
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

            // Force auto-reorder preferred_nickname after master_first_name if it's misplaced
            const prefIdx = result.findIndex(r => r.field === 'preferred_nickname');
            if (prefIdx !== -1) {
                const prefCol = result[prefIdx];
                result.splice(prefIdx, 1);
                const firstIdx = result.findIndex(r => r.field === 'master_first_name');
                if (firstIdx !== -1) {
                    result.splice(firstIdx + 1, 0, prefCol);
                } else {
                    result.push(prefCol);
                }
            }
            const INTERVIEW_QUESTIONS = [
                "What made you interested to apply in the role?",
                "In this role, what do you hope to achieve in the first 6 months?",
                "How do you handle conflict in a team environment?",
                "Tell us about a time you solved a complex technical problem.",
                "Describe a situation where you faced a significant setback or failure in your career. How did you handle it, and what did you do to stay focused on your long-term goals?",
                "The first 90 days is critical for you to be successful on this role, would there be any prior commitment - personal (like plans to go abroad and/or any medical conditions) that may hinder you from being in full attendance on the said time frame?",
                "Do you have any pending Job Offer with other companies you've applied for?",
                "Are you open to work onsite and what is your mode of transportation?",
                "If you don't mind us asking, may I know your compensation from your most recent company?",
                "Can you share a setback or failure you've experienced?",
                "Do you have any prior commitment that we need to know?",
                "The target training start date for this account/campaign will start on ___________. Would you be available to work with us by then?",
                "Do you have any preferred shifts or work schedule?",
                "Mode of transportation",
                "Do you have any pending job offer?",
                "Role specific questions",
                "Should this candidate be referred for drug testing?",
                "Narrative Assessment of Recruiter"
            ];

            let finalResult = result;

            // Auto-reorder current_status_2 and current_status_3 immediately after current_status
            const statusIdx = finalResult.findIndex(r => r.field === 'current_status');
            if (statusIdx !== -1) {
                const status2 = finalResult.find(r => r.field === 'current_status_2');
                const status3 = finalResult.find(r => r.field === 'current_status_3');

                const filtered = finalResult.filter(r => r.field !== 'current_status_2' && r.field !== 'current_status_3');
                const newStatusIdx = filtered.findIndex(r => r.field === 'current_status');

                const insertArr: any[] = [];
                if (status2) insertArr.push(status2);
                if (status3) insertArr.push(status3);

                filtered.splice(newStatusIdx + 1, 0, ...insertArr);
                finalResult = filtered;
            }

            // Force auto-reorder interview questions to be grouped in the correct order
            const interviewColsInResult = finalResult.filter(r => INTERVIEW_QUESTIONS.includes(r.label));
            if (interviewColsInResult.length > 1) {
                interviewColsInResult.sort((a, b) => {
                    const idxA = INTERVIEW_QUESTIONS.indexOf(a.label);
                    const idxB = INTERVIEW_QUESTIONS.indexOf(b.label);
                    return idxA - idxB;
                });

                const firstInterviewIdx = finalResult.findIndex(r => INTERVIEW_QUESTIONS.includes(r.label));
                const filteredOut = finalResult.filter(r => !INTERVIEW_QUESTIONS.includes(r.label));
                filteredOut.splice(firstInterviewIdx, 0, ...interviewColsInResult);
                finalResult = filteredOut;
            }

            return finalResult;
        }

        return defaultCols;
    }, [activeTab, activeSubTab, customColumns, activeTabKey]);

    const columns = React.useMemo(() => {
        let visibleCols = rawColumns.filter((col: any) => {
            return !(hiddenColumns[activeTabKey] || []).includes(getColumnKey(col));
        });

        if (!search || search.length < 2) return visibleCols;

        const term = search.toLowerCase();
        const terms = term.split('|').map((t: string) => t.trim()).filter((t: string) => t.length >= 2);

        const matchesAnyColumn = visibleCols.some(col =>
            terms.some((t: string) => col.label.toLowerCase().includes(t))
        );

        if (matchesAnyColumn) {
            return visibleCols.filter(col =>
                terms.some((t: string) => col.label.toLowerCase().includes(t)) ||
                col.label.toLowerCase().includes('name') ||
                col.field === 'actions' ||
                col.field === 'email_actions' ||
                col.label.toLowerCase().includes('status')
            );
        }

        return visibleCols;
    }, [search, rawColumns, hiddenColumns, activeTabKey, user?.full_name]);
    const showSelectionColumn = isSelectMode || selectedIds.size > 0;
    const showHireEligibility = !(hiddenColumns[activeTabKey] || []).includes('hire');

    const frozenKeys = React.useMemo(() => {
        const val = frozenColumns[activeTabKey];
        return Array.isArray(val) ? val : [];
    }, [frozenColumns, activeTabKey]);

    const columnLeftOffsets = React.useMemo(() => {
        const offsets: Record<string, number> = {};
        let currentOffset = 0;

        if (showSelectionColumn && frozenKeys.includes('select')) {
            offsets['select'] = currentOffset;
            currentOffset += 40;
        }
        if (showHireEligibility && frozenKeys.includes('hire')) {
            offsets['hire'] = currentOffset;
            currentOffset += HIRE_ELIGIBILITY_WIDTH;
        }
        if (frozenKeys.includes('id')) {
            offsets['id'] = currentOffset;
            currentOffset += 90;
        }

        columns.forEach((col) => {
            const colKey = getColumnKey(col);
            if (frozenKeys.includes(colKey)) {
                offsets[colKey] = currentOffset;
                currentOffset += (col.width || 150);
            }
        });

        return offsets;
    }, [columns, frozenKeys, showSelectionColumn, showHireEligibility]);

    const frozenRightKeys = React.useMemo(() => {
        const val = frozenRightColumns[activeTabKey];
        return Array.isArray(val) ? val : [];
    }, [frozenRightColumns, activeTabKey]);

    const columnRightOffsets = React.useMemo(() => {
        const offsets: Record<string, number> = {};
        let currentOffset = 0;

        const reversedColumns = [...columns].reverse();
        reversedColumns.forEach((col) => {
            const colKey = getColumnKey(col);
            if (frozenRightKeys.includes(colKey)) {
                offsets[colKey] = currentOffset;
                currentOffset += (col.width || 150);
            }
        });

        return offsets;
    }, [columns, frozenRightKeys]);
    const tableWidth = React.useMemo(() => {
        let width = getTableWidth(columns, showSelectionColumn);
        if (!showHireEligibility) {
            width -= HIRE_ELIGIBILITY_WIDTH;
        }
        // Always add 120 for the "+ Add Column" button since it is now permanently visible
        width += 120;
        return width;
    }, [columns, showSelectionColumn, isEditing, showHireEligibility]);
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

    const handlePointerUp = React.useCallback(() => {
        if (dragRef.current.isDown) {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.style.cursor = isSelectMode ? 'crosshair' : 'default';
                scrollContainerRef.current.classList.remove('is-dragging');
                if (dragRef.current.isMoving) {
                    // e.currentTarget.releasePointerCapture(e.pointerId); // Requires event object which this version doesn't use
                }
            }
            document.body.style.userSelect = 'auto';
            dragRef.current.isDown = false;
            dragRef.current.isMoving = false;
        }

        isDragSelectingRef.current = false;
        dragStartIndexRef.current = null;
    }, [isSelectMode]);

    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            clearHoldTimer();
            isDragSelectingRef.current = false;
            dragStartIndexRef.current = null;
            if (dragRef.current) {
                dragRef.current.isDown = false;
                dragRef.current.isMoving = false;
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [clearHoldTimer]);

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
    const endIndex = Math.min(processedList.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);
    const visibleList = processedList.slice(startIndex, endIndex);

    const [dragSelectionStart, setDragSelectionStart] = React.useState<{ row: number, col: number, appId: string } | null>(null);
    const [dragSelectionEnd, setDragSelectionEnd] = React.useState<{ row: number, col: number, appId: string } | null>(null);
    const [copiedBounds, setCopiedBounds] = React.useState<{ startRow: number, endRow: number, startCol: number, endCol: number } | null>(null);
    const isDragCopyingRef = React.useRef(false);

    const handleCellMouseDown = React.useCallback((e: React.MouseEvent, rowIdx: number, colIdx: number, appId: string) => {
        if (e.button !== 0 || isSelectMode) return;

        const target = e.target as HTMLElement;
        const interactiveTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A', 'OPTION'];
        const isInteractive = interactiveTags.includes(target.tagName) || target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select');

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
        for (let r = startRow; r <= endRow; r++) {
            const app = processedList[r];
            if (!app) continue;
            const rowData = [];
            htmlData += '<tr>';
            for (let c = startCol; c <= endCol; c++) {
                const col = columns[c];
                if (!col) continue;

                let val = '';
                const localChange = localChanges[app.id]?.[col.field];
                const subLocalChange = (col as any).subField ? localChanges[app.id]?.[(col as any).subField] : undefined;

                if (subLocalChange !== undefined) {
                    val = String(subLocalChange);
                } else if (localChange !== undefined) {
                    if (typeof localChange === 'object' && localChange !== null) {
                        val = String(localChange[(col as any).subField]);
                    } else {
                        val = String(localChange);
                    }
                } else {
                    if ((col as any).subField) {
                        val = String((app as any)[col.field]?.[(col as any).subField] || '');
                    } else {
                        let rootVal = (app as any)[col.field];
                        if (rootVal === undefined && app.pis) rootVal = (app.pis as any)[col.field];
                        val = String(rootVal || '');
                    }
                }

                val = val.replace(/\r?\n/g, ' ').replace(/\t/g, ' ');
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
                (cell as HTMLElement).style.border = '1px solid #d4d4d4';
                (cell as HTMLElement).style.padding = '4px 8px';
            });
        });

        let htmlData = container.innerHTML;
        if (!container.querySelector('table') && container.querySelector('tr, td, th')) {
            htmlData = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; font-family: Calibri, sans-serif;">${htmlData}</table>`;
        }

        htmlData = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta http-equiv=Content-Type content="text/html; charset=utf-8"></head>
<body>
<!--StartFragment-->
${htmlData}
<!--EndFragment-->
</body>
</html>`;

        e.clipboardData.setData('text/html', htmlData);
        e.clipboardData.setData('text/plain', selection.toString());
        e.preventDefault();
    }, [selectionBounds, processedList, columns, localChanges]);

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
    }, [selectionBounds, processedList, columns, localChanges]);


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
        navigator.clipboard.writeText(body).catch(() => { });

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
        <div className="flex-1 min-h-0 w-full flex flex-col antialiased relative group/table select-none">
            <div className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 overflow-hidden flex flex-col relative">
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    onWheel={handleWheel}
                    className="flex-1 overflow-auto relative custom-scrollbar bg-white dark:bg-slate-900"
                    style={{
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    <div style={{
                        height: Math.max((processedList.length * rowHeight) + headerHeight, containerHeight),
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
                            onCopy={handleNativeCopy}
                        >
                            <thead className="sticky top-0 z-[100]" onPointerDown={(e) => e.stopPropagation()}>
                                <tr className="h-10 bg-white dark:bg-slate-900 border-b border-[#edebe9] dark:border-slate-800 shadow-sm">
                                    {(isSelectMode || selectedIds.size > 0) && (
                                        <th
                                            className={cn(
                                                "bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 px-3 py-3 w-10 relative select-none cursor-pointer",
                                                frozenKeys.includes('select') && "sticky left-0 z-[110] frozen-column-glow"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setActiveColumnMenu({
                                                    colName: 'Select',
                                                    colKey: 'select',
                                                    x: rect.left,
                                                    y: rect.bottom
                                                });
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setActiveColumnMenu({
                                                    colName: 'Select',
                                                    colKey: 'select',
                                                    x: rect.left,
                                                    y: rect.bottom
                                                });
                                            }}
                                            style={{
                                                left: frozenKeys.includes('select') ? columnLeftOffsets['select'] : undefined,

                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === processedList.length && processedList.length > 0}
                                                onChange={(e) => {
                                                    if (selectedIds.size === processedList.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(processedList.map(a => a.id)));
                                                    }
                                                }}
                                                className="rounded border-surface-400/80 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                                            />
                                        </th>
                                    )}

                                    {showHireEligibility && (
                                        <th
                                            className={cn(
                                                "bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 px-2 py-3 relative select-none cursor-pointer",
                                                frozenKeys.includes('hire') && "sticky z-[110] frozen-column-glow"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setActiveColumnMenu({
                                                    colName: 'Hire Eligibility',
                                                    colKey: 'hire',
                                                    x: rect.left,
                                                    y: rect.bottom
                                                });
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setActiveColumnMenu({
                                                    colName: 'Hire Eligibility',
                                                    colKey: 'hire',
                                                    x: rect.left,
                                                    y: rect.bottom
                                                });
                                            }}
                                            style={{
                                                width: HIRE_ELIGIBILITY_WIDTH,
                                                minWidth: HIRE_ELIGIBILITY_WIDTH,
                                                maxWidth: HIRE_ELIGIBILITY_WIDTH,
                                                left: frozenKeys.includes('hire') ? columnLeftOffsets['hire'] : undefined,

                                            }}
                                        >
                                            <div className="flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Hire</span>
                                            </div>
                                        </th>
                                    )}

                                    <th
                                        className={cn(
                                            "px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase tracking-tight text-center whitespace-nowrap relative select-none cursor-pointer",
                                            frozenKeys.includes('id') && "sticky z-[110] frozen-column-glow"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setActiveColumnMenu({
                                                colName: 'ID',
                                                colKey: 'id',
                                                x: rect.left,
                                                y: rect.bottom
                                            });
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setActiveColumnMenu({
                                                colName: 'ID',
                                                colKey: 'id',
                                                x: rect.left,
                                                y: rect.bottom
                                            });
                                        }}
                                        style={{
                                            width: 135,
                                            minWidth: 135,
                                            maxWidth: 135,
                                            left: frozenKeys.includes('id') ? columnLeftOffsets['id'] : undefined,
                                        }}
                                    >
                                        ID
                                    </th>
                                    <th
                                        className={cn(
                                            "px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase tracking-tight whitespace-nowrap relative select-none"
                                        )}
                                        style={{
                                            width: 110,
                                            minWidth: 110,
                                            maxWidth: 110
                                        }}
                                    >
                                        DATE ADDED
                                    </th>
                                    <th
                                        className={cn(
                                            "px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase tracking-tight whitespace-nowrap relative select-none"
                                        )}
                                        style={{
                                            width: 155,
                                            minWidth: 155,
                                            maxWidth: 155
                                        }}
                                    >
                                        LAST STATUS CHANGE
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
                                        const isFrozen = frozenKeys.includes(colKey);
                                        const isFrozenRight = frozenRightKeys.includes(colKey);
                                        return (
                                            <th
                                                key={col.label + idx}
                                                className={cn(
                                                    "px-3 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-[#323130] dark:text-slate-300 uppercase tracking-tight whitespace-nowrap overflow-hidden truncate transition-colors hover:bg-[#f8f9fa] relative select-none",
                                                    isFrozen && "sticky z-[110] frozen-column-glow",
                                                    isFrozenRight && "sticky z-[110] frozen-right-column-glow"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveColumnMenu({
                                                        colName: displayLabel,
                                                        colKey,
                                                        x: rect.left,
                                                        y: rect.bottom
                                                    });
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveColumnMenu({
                                                        colName: displayLabel,
                                                        colKey,
                                                        x: rect.left,
                                                        y: rect.bottom
                                                    });
                                                }}
                                                draggable={isConfigEditing}
                                                onDragStart={(e) => {
                                                    if (!isConfigEditing) return;
                                                    setDraggedColIndex(idx);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    e.dataTransfer.setData('text/plain', idx.toString());
                                                }}
                                                onDragOver={(e) => {
                                                    if (!isConfigEditing) return;
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDrop={(e) => {
                                                    if (!isConfigEditing || draggedColIndex === null) return;
                                                    e.preventDefault();
                                                    handleDragDropColumn(draggedColIndex, idx);
                                                    setDraggedColIndex(null);
                                                }}
                                                onDragEnd={() => setDraggedColIndex(null)}
                                                style={{
                                                    ...(displayLabel.toUpperCase().includes('INITIAL') ? {
                                                        backgroundColor: '#fffef2',
                                                        color: '#856404'
                                                    } : (displayLabel.toUpperCase().includes('REMARKS') || displayLabel.toUpperCase().includes('REASON')) ? {
                                                        backgroundColor: '#fffafd',
                                                        color: '#6a1b9a'
                                                    } : {}),
                                                    backgroundColor: headerHighlight
                                                        ? headerHighlight
                                                        : colHighlight
                                                            ? colHighlight
                                                            : undefined,
                                                    width: col.width,
                                                    minWidth: col.width,
                                                    maxWidth: col.width,
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    left: isFrozen ? columnLeftOffsets[colKey] : undefined,
                                                    right: isFrozenRight ? columnRightOffsets[colKey] : undefined,
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                                    {isConfigEditing && (
                                                        <ArrowLeft
                                                            size={13}
                                                            className="shrink-0 text-[#a19f9d] hover:text-[#201F1E] cursor-pointer transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleMoveColumn(idx, 'left'); }}
                                                        />
                                                    )}
                                                    <div className="truncate text-center w-full" title={displayLabel}>{displayLabel}</div>
                                                    {isConfigEditing && (
                                                        <ArrowRight
                                                            size={13}
                                                            className="shrink-0 text-[#a19f9d] hover:text-[#201F1E] cursor-pointer transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleMoveColumn(idx, 'right'); }}
                                                        />
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                    {/* Conditionally show Add Column */}
                                    {isConfigEditing && (
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
                                                setAddColumnModal(true);
                                            }}
                                            className="px-3 py-3 bg-emerald-50 border-b-2 border-r border-[#edebe9] dark:border-slate-800 text-xs font-bold text-emerald-700 uppercase tracking-tight whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors text-center"
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
                                            : (app.department || app.endorsement_account || app.pis?.final_account || '')
                                    ).trim().toLowerCase();
                                    const deptObj = departmentsList.find(d => d.name.trim().toLowerCase() === appDept);

                                    const isBuffer = (a: Application) => String(a.master_remarks || a.pis?.ops_validation_remarks || '').toUpperCase().includes('CONFIRMED TRAINING - BUFFER');
                                    const currentIsBuffer = isBuffer(app);
                                    const prevApp = processedList[startIndex + idx - 1];
                                    const prevIsBuffer = prevApp ? isBuffer(prevApp) : false;
                                    const showBufferDivider = currentIsBuffer && !prevIsBuffer;

                                    return (
                                        <React.Fragment key={`frag-${app.id}`}>
                                            {showBufferDivider && (
                                                <tr className="bg-red-50/50">
                                                    <td colSpan={100} className="px-3 py-2 text-left text-[11px] font-black tracking-wider uppercase border-b-2 border-t-2 border-red-300 shadow-sm relative z-[10]">
                                                        <span className="text-emerald-700 mr-4">--- ACTIVE CONFIRMED TRAINING: {activeConfirmedCount}</span>
                                                        <span className="text-red-700">| CONFIRMED TRAINING BUFFER: {activeBufferCount} ---</span>
                                                    </td>
                                                </tr>
                                            )}
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
                                                onViewPISDashboard={onViewPISDashboard}
                                                onShowNotes={onShowNotes}
                                                onManageResume={onManageResume}
                                                onMoveRow={onMoveRow}
                                                setSchedPrompt={setSchedPrompt}
                                                handleDirectSend={handleDirectSend}
                                                onRowMouseDown={handleRowMouseDown}
                                                onRowMouseUp={handleRowMouseUp}
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
                                                columnHighlights={highlightedColumns[activeTab] || EMPTY_HIGHLIGHTS}
                                                onShowHistory={onShowHistory}
                                                eligibilitySettings={deptObj?.eligibilitySettings}
                                                setActiveTab={setActiveTab}
                                                customColumnMeta={customColumnMeta}
                                                activeTabKey={activeTabKey}
                                                showHireEligibility={showHireEligibility}
                                                frozenKeys={frozenKeys}
                                                columnLeftOffsets={columnLeftOffsets}
                                                frozenRightKeys={frozenRightKeys}
                                                columnRightOffsets={columnRightOffsets}
                                                duplicateGovIdsMap={duplicateGovIdsMap}
                                                selectionBounds={selectionBounds}
                                                copiedBounds={copiedBounds}
                                                dragAnchor={dragSelectionStart}
                                                onCellMouseDown={handleCellMouseDown}
                                                onCellMouseEnter={handleCellMouseEnter}
                                                onCellMouseUp={handleCellMouseUp}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                <tr style={{ height: Math.max(0, (processedList.length - endIndex) * rowHeight), contain: 'strict' }} />
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
                                className="bg-white dark:bg-slate-900 rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-[#d1d1d1]"
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
                                                            : "bg-white dark:bg-slate-900 border-[#d1d1d1] text-surface-600 hover:border-surface-400/80"
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
                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-primary-200 text-[12px] font-bold text-primary-900 rounded-none focus:ring-2 focus:ring-primary-500/20 outline-none min-h-[100px]"
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
                                className="bg-white dark:bg-slate-900 rounded-none shadow-2xl w-full max-w-md overflow-hidden border border-black/10"
                            >
                                <div className="p-6 border-b border-surface-100 flex items-center justify-between bg-white dark:bg-slate-900">
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
                                            className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-surface-200 hover:border-red-500 hover:bg-red-50 transition-all group rounded-none shadow-sm"
                                        >
                                            <div className="w-10 h-10 bg-red-50 flex items-center justify-center rounded-none group-hover:scale-110 transition-transform">
                                                <Mail className="text-red-600" size={20} />
                                            </div>
                                            <span className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Gmail Client</span>
                                        </button>

                                        <button
                                            onClick={() => confirmBulkEmail('outlook')}
                                            className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-surface-200 hover:border-blue-500 hover:bg-blue-50 transition-all group rounded-none shadow-sm"
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
                </AnimatePresence>            {/* Column Action Menu (right-click on header) */}
                {createPortal(
                    <AnimatePresence>
                        {activeColumnMenu && (
                            <div key="active-column-menu-wrapper">
                                <motion.div
                                    key="active-column-menu-backdrop"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[200]"
                                    onClick={() => setActiveColumnMenu(null)}
                                />
                                <motion.div
                                    key="active-column-menu-card"
                                    initial={{ opacity: 0, scale: 0.94, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                    className="fixed z-[300] bg-white dark:bg-slate-900 border border-[#E1DFDD] shadow-[0_12px_32px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.08)] rounded-xl p-2 flex flex-col w-[270px] text-left overflow-hidden text-[#201F1E]"
                                    style={{
                                        top: activeColumnMenu.y + 4,
                                        left: Math.max(12, Math.min(activeColumnMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280))
                                    }}
                                >
                                    {/* 2 Tabs Navigation: Settings vs Filter */}
                                    <div className="flex items-center p-1 bg-[#F3F2F1] rounded-lg mb-2 shrink-0 gap-1 border border-[#EDEBE9]">
                                        <button
                                            type="button"
                                            onClick={() => setColumnMenuTab('SETTINGS')}
                                            className={cn(
                                                "flex-1 py-1.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all cursor-pointer",
                                                columnMenuTab === 'SETTINGS'
                                                    ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-sm font-bold"
                                                    : "text-[#605E5C] hover:text-[#201F1E] hover:bg-white/50 dark:hover:bg-slate-900/50"
                                            )}
                                        >
                                            <SlidersHorizontal size={13} />
                                            <span>Settings</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setColumnMenuTab('FILTER')}
                                            className={cn(
                                                "flex-1 py-1.5 px-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all cursor-pointer relative",
                                                columnMenuTab === 'FILTER'
                                                    ? "bg-white dark:bg-slate-900 text-[#0078D4] shadow-sm font-bold"
                                                    : "text-[#605E5C] hover:text-[#201F1E] hover:bg-white/50 dark:hover:bg-slate-900/50"
                                            )}
                                        >
                                            <Filter size={13} />
                                            <span>Filter</span>
                                            {activeFilters[activeColumnMenu.colKey] && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#0078D4] absolute top-1.5 right-2" />
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
                                            <div className="px-2.5 py-1 border-b border-[#EDEBE9] text-[10px] font-extrabold text-[#8A8886] uppercase tracking-wider mb-0.5 truncate text-left">
                                                Column: {activeColumnMenu.colName}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setRenamePrompt({ colKey: activeColumnMenu.colKey, colName: activeColumnMenu.colName });
                                                    setActiveColumnMenu(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] hover:text-[#0078D4] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Edit3 size={13} className="text-[#0078D4] shrink-0" />
                                                Rename Column
                                            </button>
                                            {isConfigEditing && activeColumnMenu.colKey !== 'select' && activeColumnMenu.colKey !== 'hire' && activeColumnMenu.colKey !== 'id' && (() => {
                                                const idxInFiltered = columns.findIndex(c => getColumnKey(c) === activeColumnMenu.colKey);
                                                if (idxInFiltered === -1) return null;
                                                return (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                handleMoveColumn(idxInFiltered, 'left');
                                                                setActiveColumnMenu(null);
                                                            }}
                                                            disabled={idxInFiltered === 0}
                                                            className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                                                        >
                                                            <ArrowLeft size={13} className="text-[#605E5C] group-hover:text-[#201F1E] shrink-0" />
                                                            Move Column Left
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleMoveColumn(idxInFiltered, 'right');
                                                                setActiveColumnMenu(null);
                                                            }}
                                                            disabled={idxInFiltered === columns.length - 1}
                                                            className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
                                                        >
                                                            <ArrowRight size={13} className="text-[#605E5C] group-hover:text-[#201F1E] shrink-0" />
                                                            Move Column Right
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                            <button
                                                onClick={() => {
                                                    const colKey = activeColumnMenu.colKey;
                                                    setFrozenColumns(prev => {
                                                        const currentTabFrozen = prev[activeTabKey] || [];
                                                        const isAlreadyFrozen = currentTabFrozen.includes(colKey);
                                                        let nextTabFrozen: string[];
                                                        if (isAlreadyFrozen) {
                                                            nextTabFrozen = currentTabFrozen.filter(k => k !== colKey);
                                                        } else {
                                                            nextTabFrozen = [...currentTabFrozen, colKey];
                                                        }
                                                        return {
                                                            ...prev,
                                                            [activeTabKey]: nextTabFrozen
                                                        };
                                                    });
                                                    setActiveColumnMenu(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                            >
                                                {frozenKeys.includes(activeColumnMenu.colKey) ? (
                                                    <>
                                                        <Unlock size={13} className="text-amber-600 shrink-0" />
                                                        Unfreeze Left
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={13} className="text-indigo-600 shrink-0" />
                                                        Freeze to Left
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const colKey = activeColumnMenu.colKey;
                                                    setFrozenRightColumns(prev => {
                                                        const currentTabFrozen = prev[activeTabKey] || [];
                                                        const isAlreadyFrozen = currentTabFrozen.includes(colKey);
                                                        let nextTabFrozen: string[];
                                                        if (isAlreadyFrozen) {
                                                            nextTabFrozen = currentTabFrozen.filter(k => k !== colKey);
                                                        } else {
                                                            nextTabFrozen = [...currentTabFrozen, colKey];
                                                        }
                                                        return {
                                                            ...prev,
                                                            [activeTabKey]: nextTabFrozen
                                                        };
                                                    });
                                                    setActiveColumnMenu(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                            >
                                                {frozenRightKeys.includes(activeColumnMenu.colKey) ? (
                                                    <>
                                                        <Unlock size={13} className="text-amber-600 shrink-0" />
                                                        Unfreeze Right
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={13} className="text-emerald-600 shrink-0" />
                                                        Freeze to Right
                                                    </>
                                                )}
                                            </button>
                                            {(frozenKeys.length > 0 || frozenRightKeys.length > 0) && (
                                                <button
                                                    onClick={() => {
                                                        setFrozenColumns(prev => {
                                                            const next = { ...prev };
                                                            delete next[activeTabKey];
                                                            return next;
                                                        });
                                                        setFrozenRightColumns(prev => {
                                                            const next = { ...prev };
                                                            delete next[activeTabKey];
                                                            return next;
                                                        });
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Unlock size={13} className="text-rose-500 shrink-0" />
                                                    Unfreeze All Columns
                                                </button>
                                            )}
                                            {activeColumnMenu.colKey !== '#' && activeColumnMenu.colKey !== 'Id' && (
                                                <button
                                                    onClick={() => {
                                                        setHiddenColumns(prev => ({
                                                            ...prev,
                                                            [activeTabKey]: [...(prev[activeTabKey] || []), activeColumnMenu.colKey]
                                                        }));
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <EyeOff size={13} className="text-[#605E5C] shrink-0" />
                                                    Hide Column
                                                </button>
                                            )}
                                            {activeColumnMenu.colKey !== '#' && activeColumnMenu.colKey !== 'Id' && (
                                                <button
                                                    onClick={() => {
                                                        const colObj = columns.find(c => getColumnKey(c) === activeColumnMenu.colKey);
                                                        const isChecklist = colObj?.type === 'checklist';
                                                        setColType(isChecklist ? 'checklist' : 'text');
                                                        if (isChecklist) {
                                                            setAddColChecklistItems(colObj.checklistItems || []);
                                                            setSelectedChecklistColKey('');
                                                        } else {
                                                            const existingOptions = customColumnMeta[activeTabKey]?.[activeColumnMenu.colKey]?.options;
                                                            const defaultOptions = colObj?.options || getDefaultOptionsForColKey(activeColumnMenu.colKey, activeColumnMenu.colName);
                                                            const existingColors = customColumnMeta[activeTabKey]?.[activeColumnMenu.colKey]?.optionColors || {};
                                                            setAddColOptions(existingOptions || defaultOptions || []);
                                                            setAddColOptionColors(existingColors);
                                                            setOpenColorPickerIndex(null);
                                                            setAddColNewOption('');
                                                        }
                                                        setEditColOptionsModal({
                                                            colKey: activeColumnMenu.colKey,
                                                            colName: activeColumnMenu.colName
                                                        });
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Settings size={13} className="text-[#0078D4] shrink-0" />
                                                    {columns.find(c => getColumnKey(c) === activeColumnMenu.colKey)?.type === 'checklist' ? 'Edit Checklist Columns' : 'Edit Dropdown Options'}
                                                </button>
                                            )}
                                            {activeColumnMenu.colKey !== '#' && activeColumnMenu.colKey !== 'Id' && !rawColumns.some((c: any) => getColumnKey(c) === activeColumnMenu.colKey) && (
                                                <button
                                                    onClick={() => {
                                                        const colKey = activeColumnMenu.colKey;
                                                        const confirmDelete = window.confirm(`Are you sure you want to permanently delete the column "${activeColumnMenu.colName}"?`);
                                                        if (!confirmDelete) return;

                                                        setCustomColumns(prev => {
                                                            const tabCols = prev[activeTabKey] || columns;
                                                            const updated = tabCols.filter((c: any) => getColumnKey(c) !== colKey);
                                                            return {
                                                                ...prev,
                                                                [activeTabKey]: updated
                                                            };
                                                        });
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <Trash2 size={13} className="text-rose-500 shrink-0" />
                                                    Delete Column
                                                </button>
                                            )}
                                            <hr className="my-1 border-[#EDEBE9]" />
                                            <span className="px-2.5 py-0.5 text-[9px] font-extrabold text-[#8A8886] uppercase tracking-wider text-left">Highlight Header Only</span>
                                            <div className="grid grid-cols-5 gap-1.5 px-2.5 py-1">
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
                                                        className="w-5 h-5 rounded-full border border-[#D2D0CE] hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                                                        style={{ backgroundColor: clr.color }}
                                                        title={clr.name}
                                                    />
                                                ))}
                                            </div>
                                            <span className="px-2.5 py-0.5 text-[9px] font-extrabold text-[#8A8886] uppercase tracking-wider text-left mt-0.5">Highlight Entire Column</span>
                                            <div className="grid grid-cols-5 gap-1.5 px-2.5 py-1">
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
                                                        className="w-5 h-5 rounded-full border border-[#D2D0CE] hover:scale-110 active:scale-95 transition-all shadow-sm cursor-pointer"
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
                                                className="w-full text-left px-2.5 py-1.5 text-xs text-[#605E5C] hover:bg-[#F3F2F1] rounded-md font-semibold flex items-center gap-2 transition-all mt-0.5 cursor-pointer"
                                            >
                                                <Eraser size={13} className="text-[#8A8886] shrink-0" />
                                                Clear Highlight
                                            </button>
                                        </motion.div>
                                    ) : (
                                        /* Column Filter Tab (Excel-style) */
                                        <motion.div
                                            key="filter-tab-content"
                                            initial={{ opacity: 0, x: 4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.12 }}
                                            className="flex flex-col gap-2 p-0.5 text-xs"
                                        >
                                            {/* Sort Options */}
                                            <div className="flex flex-col gap-0.5 border-b border-[#EDEBE9] pb-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveSort({ colKey: activeColumnMenu.colKey, dir: 'asc' });
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] hover:text-[#0078D4] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <ArrowUpAZ size={13} className="text-[#0078D4] shrink-0" />
                                                    Sort A to Z
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveSort({ colKey: activeColumnMenu.colKey, dir: 'desc' });
                                                        setActiveColumnMenu(null);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#201F1E] hover:bg-[#F3F2F1] hover:text-[#0078D4] rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                >
                                                    <ArrowDownAZ size={13} className="text-[#0078D4] shrink-0" />
                                                    Sort Z to A
                                                </button>
                                                {activeSort?.colKey === activeColumnMenu.colKey && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveSort(null);
                                                            setActiveColumnMenu(null);
                                                        }}
                                                        className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                                    >
                                                        <Eraser size={13} className="text-rose-500 shrink-0" />
                                                        Clear Sort
                                                    </button>
                                                )}
                                            </div>

                                            {/* Filter Search Box */}
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

                                            {/* Values Checkbox List */}
                                            {(() => {
                                                const colKey = activeColumnMenu.colKey;
                                                const colObj = columns.find((c: any) => {
                                                    const k = c.subField ? `${c.field}.${c.subField}` : c.field;
                                                    return k === colKey || c.field === colKey;
                                                }) || { field: colKey };

                                                const definedOptions = colObj.options || customColumnMeta[activeTabKey]?.[colKey]?.options || getDefaultOptionsForColKey(colKey, activeColumnMenu.colName) || [];

                                                const rawValues = colKey === 'hire'
                                                    ? filteredList.map(app => getHireLabel(app))
                                                    : filteredList.map(app => {
                                                        let val: any = undefined;
                                                        if (colObj.subField) {
                                                            val = (app as any)[colObj.field]?.[colObj.subField];
                                                        } else {
                                                            val = (app as any)[colObj.field];
                                                        }
                                                        if (val === undefined || val === null || String(val).trim() === '' || String(val) === '---') {
                                                            return '(Blanks)';
                                                        }
                                                        return String(val).trim();
                                                    });

                                                const uniqueVals = Array.from(new Set([...(colKey === 'hire' ? [] : definedOptions), ...rawValues])).sort((a, b) => {
                                                    if (a === '(Blanks)') return 1;
                                                    if (b === '(Blanks)') return -1;
                                                    return a.localeCompare(b);
                                                });
                                                const filteredVals = uniqueVals.filter(v => v.toLowerCase().includes(columnFilterSearch.toLowerCase()));
                                                // Local state for the filter menu
                                                const isFilterMenuOpen = activeColumnMenu?.colKey === colKey;

                                                // Initialize temp selected values from activeFilters when menu opens
                                                const currentSelected = isFilterMenuOpen && activeColumnMenu?.tempSelected
                                                    ? activeColumnMenu.tempSelected
                                                    : (activeFilters[colKey] || uniqueVals);

                                                const allSelected = filteredVals.length > 0 && filteredVals.every(v => currentSelected.includes(v));

                                                return (
                                                    <div className="flex flex-col flex-1 min-h-0 mt-2">
                                                        {/* Filter Options List */}
                                                        <div className="flex-1 overflow-y-auto p-1 border border-[#EDEBE9] rounded-lg space-y-0.5 custom-scrollbar min-h-[120px] max-h-[170px]">
                                                            <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#F3F2F1] rounded-md cursor-pointer text-xs text-[#201F1E] font-medium transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allSelected}
                                                                    onChange={(e) => {
                                                                        const next = e.target.checked ? uniqueVals : [];
                                                                        setActiveColumnMenu(prev => prev ? { ...prev, tempSelected: next } : prev);
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded border-[#C8C6C4] text-[#0078D4] focus:ring-[#0078D4]"
                                                                />
                                                                <span>(Select All)</span>
                                                            </label>
                                                            <hr className="border-[#EDEBE9] my-1" />
                                                            {filteredVals.map(val => {
                                                                const isChecked = currentSelected.includes(val);
                                                                return (
                                                                    <label key={val} className="flex items-center gap-2 px-2.5 py-1 hover:bg-[#F3F2F1] rounded-md cursor-pointer text-xs text-[#201F1E] transition-colors truncate">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={(e) => {
                                                                                const next = e.target.checked
                                                                                    ? [...currentSelected, val]
                                                                                    : currentSelected.filter(v => v !== val);
                                                                                setActiveColumnMenu(prev => prev ? { ...prev, tempSelected: next } : prev);
                                                                            }}
                                                                            className="w-3.5 h-3.5 rounded border-[#C8C6C4] text-[#0078D4] focus:ring-[#0078D4]"
                                                                        />
                                                                        <span className="truncate font-medium" title={val}>{val}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Filter Action Buttons */}
                                                        <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveFilters(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[colKey];
                                                                        return next;
                                                                    });
                                                                    setActiveColumnMenu(null);
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-semibold text-[#605E5C] hover:text-[#201F1E] hover:bg-[#EDEBE9] rounded-md transition-all cursor-pointer"
                                                            >
                                                                Clear
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (activeColumnMenu?.tempSelected) {
                                                                        setActiveFilters(prev => {
                                                                            const next = { ...prev };
                                                                            if (activeColumnMenu.tempSelected!.length >= uniqueVals.length) {
                                                                                delete next[colKey];
                                                                            } else {
                                                                                next[colKey] = activeColumnMenu.tempSelected!;
                                                                            }
                                                                            return next;
                                                                        });
                                                                    }
                                                                    setActiveColumnMenu(null);
                                                                }}
                                                                className="px-4 py-1.5 text-xs font-bold text-white bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] active:scale-[0.98] rounded-md transition-all shadow-sm cursor-pointer"
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
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
                                                        Ã—
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
                                                <div key={i} className="flex flex-col gap-1 bg-white dark:bg-slate-900 border border-surface-200 p-2 text-[10px] font-bold uppercase tracking-wider text-surface-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">{item.label} <span className="text-[8px] text-surface-400 font-normal">({item.source})</span></span>
                                                        <button
                                                            onClick={() => setAddColChecklistItems(prev => prev.filter((_, j) => j !== i))}
                                                            className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                                                            title="Remove Column"
                                                        >
                                                            Ã—
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
                                                                                    className="w-full p-1 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-semibold outline-none"
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
                                                                        className="w-full p-1 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-semibold outline-none"
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
                        <div className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_25px_60px_rgba(0,0,0,0.35)] rounded-lg p-6 w-full max-w-3xl relative flex flex-col gap-5 text-left font-sans max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                                <span className="text-[13px] font-black text-primary-600 uppercase tracking-wider">
                                    {colType === 'checklist' ? 'Edit Checklist Columns:' : 'Edit Dropdown Options:'} {editColOptionsModal.colName}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                    {addColOptions.length} Options
                                </span>
                            </div>

                            {/* Dropdown Options */}
                            {colType === 'text' && (
                                <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
                                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Dropdown Options <span className="text-surface-300">(leave empty for free text)</span></label>

                                    {/* List of current options */}
                                    <div className="flex flex-col gap-2.5 max-h-[52vh] overflow-y-auto pr-2 border border-[#edebe9] dark:border-slate-800 p-3 bg-[#faf9f8] rounded-md">
                                        {addColOptions.length === 0 ? (
                                            <span className="text-[10px] text-surface-400 italic">No dropdown options defined. Free text only.</span>
                                        ) : (
                                            addColOptions.map((opt, i) => {
                                                const curColor = addColOptionColors[opt] || getDefaultColorForOption(opt);
                                                const isPickerOpen = openColorPickerIndex === i;
                                                return (
                                                    <div key={i} className="flex flex-col gap-2 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 p-3 rounded-md shadow-xs">
                                                        <div className="flex gap-3 items-center">
                                                            {/* Formatted Badge Preview */}
                                                            <div className="shrink-0 flex items-center min-w-[130px]">
                                                                <span
                                                                    className="px-3 py-1 text-[10px] font-bold rounded-sm border uppercase truncate transition-all shadow-xs text-center w-full"
                                                                    style={{
                                                                        backgroundColor: curColor.bg,
                                                                        color: curColor.text,
                                                                        borderColor: curColor.border
                                                                    }}
                                                                >
                                                                    {opt || 'Option'}
                                                                </span>
                                                            </div>

                                                            {/* Editable Option Text Input */}
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
                                                                    if (addColOptionColors[opt]) {
                                                                        const c = addColOptionColors[opt];
                                                                        setAddColOptionColors(prev => {
                                                                            const next = { ...prev };
                                                                            delete next[opt];
                                                                            next[newVal] = c;
                                                                            return next;
                                                                        });
                                                                    }
                                                                }}
                                                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-[#d2d0ce] text-xs font-semibold text-surface-800 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 rounded-none outline-none"
                                                            />

                                                            {/* Color Picker Toggle Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenColorPickerIndex(isPickerOpen ? null : i)}
                                                                className={cn(
                                                                    "px-3 py-2 border font-bold text-[10px] uppercase tracking-wider rounded-none transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                                                                    isPickerOpen ? "bg-primary-50 text-primary-700 border-primary-300 shadow-sm" : "bg-[#f3f2f1] hover:bg-[#edebe9] dark:bg-slate-800 text-[#323130] dark:text-slate-300 border-[#d2d0ce]"
                                                                )}
                                                                title="Change option color"
                                                            >
                                                                <div className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: curColor.bg }} />
                                                                <Palette size={12} className="text-primary-600" />
                                                                <span>Color</span>
                                                            </button>

                                                            {/* Delete Option Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAddColOptions(prev => prev.filter((_, j) => j !== i));
                                                                    setAddColOptionColors(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[opt];
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-[10px] uppercase tracking-wider rounded-none transition-all cursor-pointer shrink-0"
                                                                title="Delete option"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>

                                                        {/* Color Preset Palette Picker */}
                                                        {isPickerOpen && (
                                                            <div className="mt-2 pt-2 border-t border-neutral-200/80 bg-[#faf9f8] p-3 rounded-md flex flex-col gap-2 animate-fade-in">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9.5px] font-extrabold text-surface-500 uppercase tracking-wider">Select Preset Color Badge</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenColorPickerIndex(null)}
                                                                        className="text-[9.5px] font-bold text-surface-400 hover:text-surface-700"
                                                                    >
                                                                        Close
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-6 gap-2">
                                                                    {OPTION_COLOR_PRESETS.map(preset => {
                                                                        const isSelected = curColor.bg === preset.bg && curColor.text === preset.text;
                                                                        return (
                                                                            <button
                                                                                key={preset.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setAddColOptionColors(prev => ({
                                                                                        ...prev,
                                                                                        [opt]: { bg: preset.bg, text: preset.text, border: preset.border }
                                                                                    }));
                                                                                }}
                                                                                className={cn(
                                                                                    "px-1.5 py-1 text-[9.5px] font-bold rounded-sm border uppercase text-center transition-all cursor-pointer flex items-center justify-between gap-1",
                                                                                    isSelected ? "ring-2 ring-primary-600 shadow-md font-extrabold" : "hover:opacity-90"
                                                                                )}
                                                                                style={{
                                                                                    backgroundColor: preset.bg,
                                                                                    color: preset.text,
                                                                                    borderColor: preset.border
                                                                                }}
                                                                            >
                                                                                <span className="truncate">{preset.name.split(' ')[0]}</span>
                                                                                {isSelected && <Check size={10} className="shrink-0" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Custom Color Input Controls */}
                                                                <div className="flex gap-3 items-center mt-1 pt-1.5 border-t border-neutral-200/60 text-[9.5px]">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-bold text-surface-500 uppercase">BG:</span>
                                                                        <input
                                                                            type="color"
                                                                            value={curColor.bg}
                                                                            onChange={(e) => {
                                                                                const newBg = e.target.value;
                                                                                setAddColOptionColors(prev => ({
                                                                                    ...prev,
                                                                                    [opt]: { ...curColor, bg: newBg }
                                                                                }));
                                                                            }}
                                                                            className="w-5 h-5 p-0 border border-neutral-300 rounded cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-bold text-surface-500 uppercase">Text:</span>
                                                                        <input
                                                                            type="color"
                                                                            value={curColor.text}
                                                                            onChange={(e) => {
                                                                                const newText = e.target.value;
                                                                                setAddColOptionColors(prev => ({
                                                                                    ...prev,
                                                                                    [opt]: { ...curColor, text: newText }
                                                                                }));
                                                                            }}
                                                                            className="w-5 h-5 p-0 border border-neutral-300 rounded cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAddColOptionColors(prev => {
                                                                                const next = { ...prev };
                                                                                delete next[opt];
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="ml-auto text-[9px] text-surface-500 hover:text-primary-700 underline font-semibold cursor-pointer"
                                                                    >
                                                                        Reset Color
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
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
                            )}

                            {/* Checklist Configuration UI */}
                            {colType === 'checklist' && (
                                <div className="flex flex-col gap-3 border border-surface-200 p-3 bg-surface-50/50">
                                    <label className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">Columns to check</label>

                                    {/* List of currently added checklist columns */}
                                    {addColChecklistItems.length > 0 && (
                                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                            {addColChecklistItems.map((item, i) => (
                                                <div key={i} className="flex flex-col gap-1 bg-white dark:bg-slate-900 border border-surface-200 p-2 text-[10px] font-bold uppercase tracking-wider text-surface-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">{item.label} <span className="text-[8px] text-surface-400 font-normal">({item.source})</span></span>
                                                        <button
                                                            onClick={() => setAddColChecklistItems(prev => prev.filter((_, j) => j !== i))}
                                                            className="text-red-500 hover:text-red-700 font-bold text-sm px-1"
                                                            title="Remove Column"
                                                        >
                                                            Ã—
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
                                                                                    className="w-full p-1 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-semibold outline-none"
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
                                                                        className="w-full p-1 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-semibold outline-none"
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
                            <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-[#edebe9] dark:border-slate-800">
                                <button
                                    onClick={() => setEditColOptionsModal(null)}
                                    className="px-4 py-2 border border-[#d2d0ce] hover:bg-[#f8f9fa] text-[#323130] dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] rounded-none shadow-sm transition-all"
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
                                                options: addColOptions.length > 0 ? addColOptions : undefined,
                                                optionColors: Object.keys(addColOptionColors).length > 0 ? addColOptionColors : undefined
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

                {/* View Hidden Columns Modal */}
                <AnimatePresence>
                    {showHiddenColsModal && (
                        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 border-2 border-surface-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-none w-full max-w-4xl flex flex-col max-h-[80vh]"
                            >
                                <div className="p-4 border-b border-surface-100 flex items-center justify-between shrink-0">
                                    <span className="text-[12px] font-black text-primary-600 uppercase tracking-wider flex items-center gap-2">
                                        <EyeOff size={16} />
                                        Manage Column Visibility
                                    </span>
                                    <button onClick={() => setShowHiddenColsModal(false)} className="text-surface-400 hover:text-surface-600">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="flex-1 flex overflow-hidden min-h-0">
                                    {/* Left Pane: Visible Columns */}
                                    <div className="flex-1 flex flex-col border-r border-surface-100 bg-white dark:bg-slate-900">
                                        <div className="p-4 border-b border-surface-50 shrink-0">
                                            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Visible Columns</p>
                                        </div>
                                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-1">
                                                {rawColumns.filter((col: any) => !(tempHiddenCols || []).includes(getColumnKey(col))).map((col: any) => {
                                                    const key = getColumnKey(col);
                                                    const tabNameMap = customColumnNames[activeTab] || {};
                                                    const displayLabel = tabNameMap[key] || col.label;

                                                    return (
                                                        <label key={key} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 border border-surface-200 hover:border-primary-300 cursor-pointer transition-colors group">
                                                            <input
                                                                type="checkbox"
                                                                checked={true}
                                                                onChange={() => {
                                                                    setTempHiddenCols(prev => [...(prev || []), key]);
                                                                }}
                                                                className="w-4 h-4 rounded-none border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                            />
                                                            <span className="text-xs font-semibold select-none text-surface-900">
                                                                {displayLabel}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                                {!(tempHiddenCols || []).includes('hire') && (
                                                    <label key="hire" className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 border border-surface-200 hover:border-primary-300 cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            checked={true}
                                                            onChange={() => {
                                                                setTempHiddenCols(prev => [...(prev || []), 'hire']);
                                                            }}
                                                            className="w-4 h-4 rounded-none border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                        />
                                                        <span className="text-xs font-semibold select-none text-surface-900">
                                                            Hire Eligibility
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Pane: Hidden Columns */}
                                    <div className="flex-1 flex flex-col bg-surface-50/50">
                                        <div className="p-4 border-b border-surface-50 shrink-0">
                                            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Hidden Columns</p>
                                        </div>
                                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-1">
                                                {rawColumns.filter((col: any) => (tempHiddenCols || []).includes(getColumnKey(col))).map((col: any) => {
                                                    const key = getColumnKey(col);
                                                    const tabNameMap = customColumnNames[activeTab] || {};
                                                    const displayLabel = tabNameMap[key] || col.label;

                                                    return (
                                                        <label key={key} className="flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-900/50 border border-surface-200 hover:border-primary-300 cursor-pointer transition-colors group opacity-75">
                                                            <input
                                                                type="checkbox"
                                                                checked={false}
                                                                onChange={() => {
                                                                    setTempHiddenCols(prev => (prev || []).filter(k => k !== key));
                                                                }}
                                                                className="w-4 h-4 rounded-none border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                            />
                                                            <span className="text-xs font-semibold select-none text-surface-500 line-through">
                                                                {displayLabel}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                                {(tempHiddenCols || []).includes('hire') && (
                                                    <label key="hire" className="flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-900/50 border border-surface-200 hover:border-primary-300 cursor-pointer transition-colors group opacity-75">
                                                        <input
                                                            type="checkbox"
                                                            checked={false}
                                                            onChange={() => {
                                                                setTempHiddenCols(prev => (prev || []).filter(k => k !== 'hire'));
                                                            }}
                                                            className="w-4 h-4 rounded-none border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                        />
                                                        <span className="text-xs font-semibold select-none text-surface-500 line-through">
                                                            Hire Eligibility
                                                        </span>
                                                    </label>
                                                )}
                                                {(tempHiddenCols || []).length === 0 && (
                                                    <div className="p-4 text-center text-xs text-surface-400 font-medium">
                                                        No hidden columns
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-white dark:bg-slate-900 shrink-0">
                                    <button
                                        onClick={() => {
                                            setTempHiddenCols([]);
                                        }}
                                        className="px-4 py-2 text-surface-600 hover:text-surface-900 font-bold uppercase tracking-wider text-[10px]"
                                    >
                                        Show All
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (tempHiddenCols) {
                                                setHiddenColumns(prev => ({ ...prev, [activeTabKey]: tempHiddenCols }));
                                            }
                                            setShowHiddenColsModal(false);
                                        }}
                                        className="px-6 py-2 bg-primary-600 hover:bg-primary-750 text-white font-bold uppercase tracking-wider text-[10px] rounded-none shadow-md transition-all active:scale-95"
                                    >
                                        Done
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

