import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService, type HiringQuotaHistory } from '@/services/PositionService';
import { UserService } from '@/services/UserService';
import { AIService, type SuggestQuotaResult } from '@/services/AIService';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { CalendarDropdown } from '@/components/common/CalendarDropdown';
import { useToast } from '@/components/common/useToast';
import { Plus, Search, Target, LayoutGrid, List, Building2, Briefcase, Clock, Sparkles, Loader2, Users, FileSpreadsheet, Settings, Edit2, Network, ChevronDown, Trash2, FileText, Filter, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { AdvancedDateFilter, type DateFilterState } from '@/components/common/AdvancedDateFilter';
import { Calendar } from 'lucide-react';

import type { Application, Position } from '@/types';
import { AccountCard, type AccountCardDept } from './components/AccountCard';
import { AccountDashboardModal } from './components/AccountDashboardModal';
import { QuotaHistoryModal } from './components/QuotaHistoryModal';
import { AccountFormModal } from './components/AccountFormModal';
import { LOBDashboardModal } from './components/LOBDashboardModal';



const getFlag = (countryName: string) => {
    const flags: Record<string, string> = {
        'Philippines': '🇵🇭',
        'India': '🇮🇳',
        'USA': '🇺🇸',
        'Colombia': '🇨🇴',
        'Mexico': '🇲🇽',
        'Costa Rica': '🇨🇷',
        'Dominican Republic': '🇩🇴',
        'Jamaica': '🇯🇲',
        'El Salvador': '🇸🇻',
        'Honduras': '🇭🇳',
        'Guatemala': '🇬🇹',
        'Brazil': '🇧🇷',
        'UK': '🇬🇧',
        'South Africa': '🇿🇦',
        'Egypt': '🇪🇬'
    };
    return flags[countryName] ? `${flags[countryName]} ${countryName}` : countryName;
};

const PLACES: Record<string, string[]> = {
    'Philippines': ['Manila', 'Cebu', 'Davao', 'Clark', 'Iloilo', 'Bacolod', 'Baguio'],
    'India': ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad', 'Chennai', 'Delhi', 'Noida', 'Gurugram', 'Kolkata'],
    'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Dallas', 'Atlanta', 'Miami', 'Phoenix', 'Seattle'],
    'Colombia': ['Bogota', 'Medellin', 'Cali', 'Barranquilla'],
    'Mexico': ['Mexico City', 'Monterrey', 'Guadalajara', 'Tijuana'],
    'Costa Rica': ['San Jose', 'Heredia', 'Alajuela'],
    'Dominican Republic': ['Santo Domingo', 'Santiago'],
    'Jamaica': ['Kingston', 'Montego Bay'],
    'El Salvador': ['San Salvador', 'Santa Ana'],
    'Honduras': ['Tegucigalpa', 'San Pedro Sula'],
    'Guatemala': ['Guatemala City', 'Antigua'],
    'Brazil': ['Sao Paulo', 'Rio de Janeiro', 'Curitiba', 'Campinas'],
    'UK': ['London', 'Manchester', 'Birmingham', 'Glasgow'],
    'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
    'Egypt': ['Cairo', 'Alexandria'],
    'Poland': ['Warsaw', 'Krakow', 'Wroclaw'],
    'Romania': ['Bucharest', 'Cluj-Napoca'],
    'Bulgaria': ['Sofia', 'Plovdiv']
};

const STORAGE_PREFIX = 'hiring_quota_';
const CANCELLED_CLASSES_KEY = 'cancelled_classes_history';
const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export interface CancelledClass {
    id: string;
    department: string;
    quota: number;
    hiredCount: number;
    totalApplicants: number;
    inPipeline: number;
    failedCount: number;
    startDate?: string | null;
    endDate?: string | null;
    cancelledAt: string;
}

const toDateInputValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
const todayInputValue = () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getDurationLabel = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 'Set both dates';
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Invalid date range';
    const days = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    return `${days} day${days === 1 ? '' : 's'}`;
};

const isDateInsideSeason = (value: string | undefined | null, start?: string | null, end?: string | null) => {
    if (!start || !end) return true;
    if (!value) return false;

    const date = new Date(value);
    const startDate = new Date(`${toDateInputValue(start)}T00:00:00`);
    const endDate = new Date(`${toDateInputValue(end)}T23:59:59.999`);

    if (Number.isNaN(date.getTime()) || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;
    return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
};

const getSeasonActivityDate = (app: Application) => {
    const status = (app.current_status || '').toUpperCase();
    if (status === 'HIRED' || app.final_verdict === 'HIRED') {
        return app.hired_at || app.updated_at || app.interview_completed_at || app.applied_at;
    }
    if (['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status)) {
        return app.updated_at || app.interview_completed_at || app.applied_at;
    }
    return app.applied_at || app.updated_at;
};

const getSeasonHiredDate = (app: Application, start?: string | null, end?: string | null) => {
    if (!start || !end) return getSeasonActivityDate(app);
    return app.hired_at || null;
};

const isAfterQuotaCutoff = (value: string | undefined | null, cutoff?: string | null) => {
    if (!cutoff) return true;
    if (!value) return false;

    const date = new Date(value);
    const cutoffDate = new Date(cutoff);

    if (Number.isNaN(date.getTime()) || Number.isNaN(cutoffDate.getTime())) return true;
    return date.getTime() > cutoffDate.getTime();
};

type QuotaHistoryMetric = 'quota' | 'hired' | 'processed' | 'fallout';

const EditableCell = ({ value, onSave, type = "number", options = [] }: { value: string | number | null | undefined, onSave: (val: string | number | null) => void | Promise<void>, type?: "number" | "text" | "select", options?: { value: string, label: string }[] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value == null ? '' : value.toString());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setTempValue(value == null ? '' : value.toString());
    }, [value]);

    useEffect(() => {
        if (saveStatus === 'saved') {
            const timer = setTimeout(() => setSaveStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const handleSave = async () => {
        setIsEditing(false);
        if (tempValue === "") {
            if (value !== null) {
                setSaveStatus('saving');
                await Promise.resolve(onSave(null));
                setSaveStatus('saved');
            }
        } else if (tempValue !== value?.toString()) {
            setSaveStatus('saving');
            await Promise.resolve(onSave(type === "number" ? Number(tempValue) : tempValue));
            setSaveStatus('saved');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setTempValue(value == null ? '' : value.toString());
            setIsEditing(false);
        }
    };

    return isEditing ? (
        <input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-white dark:bg-slate-900 border border-primary-500 rounded-none px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
            autoFocus
        />
    ) : (
        <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full min-h-[24px] group flex items-center justify-center relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
        >
            <span className={value === null ? "text-slate-300" : ""}>{value === null ? "-" : value}</span>
            {saveStatus === 'saving' && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            {saveStatus === 'saved' && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
            )}
            {saveStatus === 'idle' && (
                <button
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary-600 transition-opacity p-1 rounded-none pointer-events-none"
                    title="Edit"
                >
                    <Edit2 size={12} />
                </button>
            )}
        </div>
    );
};


const SearchableSelect = ({ options, value, onChange, placeholder, renderOption }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, renderOption?: (val: string) => React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 flex items-center justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? 'text-[#201f1e] dark:text-slate-200 dark:text-slate-200 text-[13px] font-semibold flex items-center gap-2' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[13px] font-semibold flex items-center gap-2'}>
                    {value ? (renderOption ? renderOption(value) : value) : placeholder}
                </span>
                <ChevronDown size={16} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
            </div>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 shadow-lg max-h-60 flex flex-col">
                    <div className="sticky top-0 bg-white dark:bg-slate-900 p-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <input
                            type="text"
                            className="w-full h-8 px-2 border border-slate-300 dark:border-slate-700 dark:border-slate-700 text-[12px] outline-none focus:border-[#0078d4]"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-[12px] text-slate-500 dark:text-slate-400 dark:text-slate-400 text-center">No results found</div>
                        ) : (
                            filtered.map(o => (
                                <div
                                    key={o}
                                    className="px-4 py-2.5 hover:bg-[#eff6fc] dark:bg-slate-800 hover:text-[#0078d4] cursor-pointer text-[13px] text-[#201f1e] dark:text-slate-200 dark:text-slate-200 transition-colors"
                                    onClick={() => { onChange(o); setIsOpen(false); setSearch(''); }}
                                >
                                    {o}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export function AccountManagement({ hideHeader = false }: { hideHeader?: boolean }) {
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [allPositions, setAllPositions] = useState<Position[]>([]);
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [quotaHistory, setQuotaHistory] = useState<HiringQuotaHistory[]>([]);
    const [search, setSearch] = useState('');
    const [localQuotas, setLocalQuotas] = useState<Record<string, number>>({});
    const [cancelledClasses, setCancelledClasses] = useState<CancelledClass[]>([]);

    useEffect(() => {
        const stored: Record<string, number> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                const deptName = key.replace(STORAGE_PREFIX, '');
                stored[deptName] = parseInt(localStorage.getItem(key) || '0');
            }
        }
        setLocalQuotas(stored);

        try {
            const storedCancelled = localStorage.getItem(CANCELLED_CLASSES_KEY);
            if (storedCancelled) {
                setCancelledClasses(JSON.parse(storedCancelled));
            }
        } catch (e) {
            console.error('Failed to load cancelled classes history:', e);
        }
    }, []);

    const [modal, setModal] = useState<boolean>(false);
    const [dashboardModal, setDashboardModal] = useState<boolean>(false);
    const [quotaModal, setQuotaModal] = useState<boolean>(false);
    const [delConfirm, setDelConfirm] = useState<Department | null>(null);
    const [closeConfirm, setCloseConfirm] = useState<boolean>(false);
    const [cancelConfirm, setCancelConfirm] = useState<boolean>(false);

    const [form, setForm] = useState({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
    const [quotaForm, setQuotaForm] = useState<number>(0);
    const [quotaManualHired, setQuotaManualHired] = useState<number>(0);
    const [quotaManualJobOffers, setQuotaManualJobOffers] = useState<number | ''>('');
    const [quotaManualFallout, setQuotaManualFallout] = useState<number | ''>('');
    const [quotaManualBalance, setQuotaManualBalance] = useState<number | ''>('');
    const [quotaManualDay1ShowUp, setQuotaManualDay1ShowUp] = useState<number | ''>('');
    const [quotaStartDate, setQuotaStartDate] = useState<string>('');
    const [quotaEndDate, setQuotaEndDate] = useState<string>('');
    const [quotaHiringType, setQuotaHiringType] = useState<string>('Internal/External');
    const [quotaTrainingStartDate, setQuotaTrainingStartDate] = useState<string>('');
    const [quotaHiringQuotaId, setQuotaHiringQuotaId] = useState<string>('');
    const [quotaOpeningName, setQuotaOpeningName] = useState<string>('');
    const [quotaSalaryMatrixCategory, setQuotaSalaryMatrixCategory] = useState<string>('');
    const [quotaClassType, setQuotaClassType] = useState<string>('');
    const [quotaRosterDate, setQuotaRosterDate] = useState<string>('');
    const [quotaHiringReqHc, setQuotaHiringReqHc] = useState<number | ''>('');
    const [quotaTotalOffersExtended, setQuotaTotalOffersExtended] = useState<number | ''>('');
    const [quotaNetHiresInternal, setQuotaNetHiresInternal] = useState<number | ''>('');
    const [quotaNetHiresExternal, setQuotaNetHiresExternal] = useState<number | ''>('');
    const [quotaJoBalance, setQuotaJoBalance] = useState<number | ''>('');
    const [quotaNotes, setQuotaNotes] = useState<string>('');
    const [opsValidators, setOpsValidators] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        UserService.getAll().then(users => {
            setOpsValidators(users.filter(u => u.role === 'ops_validator').map(u => ({ id: u.id, name: u.full_name })));
        }).catch(console.error);
    }, []);

    const [quotaCountry, setQuotaCountry] = useState<string>('');
    const [quotaCity, setQuotaCity] = useState<string>('');
    const [quotaRequestDate, setQuotaRequestDate] = useState<string>('');
    const [quotaApprovalDate, setQuotaApprovalDate] = useState<string>('');
    const [quotaIsBillable, setQuotaIsBillable] = useState<boolean | null>(null);
    const [quotaRequesterName, setQuotaRequesterName] = useState<string>('');
    const [quotaRecruitmentProgress, setQuotaRecruitmentProgress] = useState<string>('');
    const [quotaConcatenate, setQuotaConcatenate] = useState<string>('');
    const [aiSuggesting, setAiSuggesting] = useState<boolean>(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestQuotaResult | null>(null);
    const [hiringTypeFilter, setHiringTypeFilter] = useState<'ALL' | 'BILLED' | 'NON_BILLED' | 'NO_QUOTA'>('ALL');
    const [selectedAccount, setSelectedAccount] = useState<Department | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('acc-view-type') as 'grid' | 'list') || 'grid';
    });
    const [activePipelineFilter, setActivePipelineFilter] = useState<string | null>(null);
    const [dashboardTab, setDashboardTab] = useState<'overview' | 'history' | 'cancelled' | 'hiring_requirements' | 'sub_accounts' | 'unassigned'>('overview');
    const [quotaHistoryDrilldown, setQuotaHistoryDrilldown] = useState<{ item: HiringQuotaHistory; metric: QuotaHistoryMetric } | null>(null);
    const [activeAccountTab, setActiveAccountTab] = useState<'ALL' | 'BILLED' | 'NON_BILLED'>('ALL');
    const [activeMainTab, setActiveMainTab] = useState<'ACCOUNTS' | 'SUPPORT_ROLES' | 'LOBS'>('ACCOUNTS');
    const [lobStartDateFilter, setLobStartDateFilter] = useState<string>('');
    const [selectedLOBCard, setSelectedLOBCard] = useState<{ lobName: string; parentDeptName: string } | null>(null);
    const [viewFormat, setViewFormat] = useState<'webapp' | 'excel'>('webapp');
    const [excelFilterStart, setExcelFilterStart] = useState<string>('');
    const [excelFilterEnd, setExcelFilterEnd] = useState<string>('');
    const [weekStartDateFilter, setWeekStartDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [trainingStartDateFilter, setTrainingStartDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });

    const [excelViewMode, setExcelViewMode] = useState<'week' | 'account' | 'eod'>('account');
    const [slicerFilters, setSlicerFilters] = useState<Record<string, string[]>>({});
    const [selectedExcelRows, setSelectedExcelRows] = useState<{ id: string, isHistory: boolean }[]>([]);

    useEffect(() => {
        localStorage.setItem('acc-view-type', viewMode);
    }, [viewMode]);


    const handleExportExcel = () => {
        if (!excelData.filteredRows || excelData.filteredRows.length === 0) {
            toastError('Export Failed', 'No data to export.');
            return;
        }

        const headers = [
            'Month', 'Week Start', 'Start Date', 'Training Start Date', 'Client', 'LOB', 'Internal/External',
            'Hiring Request ID', 'HC Req', 'Job Offers', 'Fallout', 'Active Hires', 'Balance', 'Day 1 Show Up',
            'Salary Matrix Category', 'Class Type', 'Roster Date', 'Hiring Req HC', 'Total Offers Extended',
            'Net Hires Internal', 'Net Hires External', 'JO Balance', 'Notes', 'Requester', 'Recruitment Progress'
        ];

        const csvRows = [headers.join(',')];

        excelData.filteredRows.forEach(row => {
            const values = [
                row.month || '',
                row.weekStart || '',
                row.startDate || '',
                row.trainingStartDate || '',
                row.client || '',
                row.lob || '',
                row.internalExternal || '',
                row.hiringRequestId || '',
                row.requirement || 0,
                row.jobOffers || 0,
                row.fallout || 0,
                row.activeHires || 0,
                row.balance || 0,
                row.day1ShowUp || 0,
                row.salaryMatrixCategory || '',
                row.classType || '',
                row.rosterDate || '',
                row.hiringReqHc || 0,
                row.totalOffersExtended || 0,
                row.netHiresInternal || 0,
                row.netHiresExternal || 0,
                row.joBalance || 0,
                row.notes || '',
                row.requester || '',
                row.recruitmentProgress || ''
            ];
            csvRows.push(values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Account_Data_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCellSave = async (positionId: string, isHistory: boolean, field: string, value: number | string | null) => {
        // Optimistically update the UI to prevent flickering/reverting while the network request is inflight
        const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const camelField = toCamelCase(field);

        if (isHistory) {
            setQuotaHistory(prev => prev.map(q => String(q.id) === positionId ? { ...q, [camelField]: value } : q));
        } else {
            setAllPositions(prev => prev.map(p => String(p.id) === positionId ? { ...p, [camelField]: value } : p));
        }

        try {
            if (isHistory) {
                await PositionService.updateQuotaHistory(positionId, { [field]: value });
            } else {
                await PositionService.update(positionId, { [field]: value });
            }
            success('Saved', 'Cell updated successfully');
        } catch (e) {
            toastError('Update Failed', 'Failed to save cell data.');
            void loadData(); // Revert back to server data on failure
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null);
    const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log("handleFileUpload fired! File:", file?.name);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            console.log("reader.onload fired!");
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Find the header row by converting to an array of arrays first
                const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
                let headerRowIndex = 0;

                for (let i = 0; i < Math.min(20, rawData.length); i++) {
                    const row = rawData[i];
                    if (!row || !Array.isArray(row)) continue;

                    const rowString = row.join(' ').toLowerCase();
                    if (rowString.includes('client') && rowString.includes('lob')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                // Parse the actual data starting from the discovered header row
                const data = XLSX.utils.sheet_to_json(ws, { raw: false, range: headerRowIndex });
                console.log(`Parsed ${data.length} rows starting from row ${headerRowIndex + 1}.`);
                console.log(`Parsed ${data.length} rows from Excel sheet.`);
                if (data.length > 0) {
                    console.log("First row keys (Headers found):", Object.keys(data[0] as object));
                    console.log("First row raw data:", data[0]);
                }

                const parsedRows = data.map((row: any, index: number) => {
                    const normalizedRow: Record<string, any> = {};
                    for (const key in row) {
                        // Normalize the key and strip any trailing numbers added by sheet_to_json (e.g. "_1", "_2")
                        let normalizedKey = key.toString().trim().toLowerCase();
                        normalizedKey = normalizedKey.replace(/_\d+$/, '').trim();

                        // Only map the FIRST instance of any column to ignore the right-hand table
                        if (!(normalizedKey in normalizedRow)) {
                            normalizedRow[normalizedKey] = row[key];
                        }
                    }

                    const rawClient = normalizedRow['client'];
                    const rawLob = normalizedRow['lob'];

                    const client = (rawClient || 'N/A').toString().trim() || 'N/A';
                    const lob = (rawLob || 'N/A').toString().trim() || 'N/A';

                    const isInternal = (normalizedRow['internal/external'] || '').toString().toLowerCase().includes('internal');
                    const rawReqId = normalizedRow['hiring request id'];
                    const reqId = rawReqId !== undefined && rawReqId !== null ? String(rawReqId) : '';
                    const weekStartRaw = normalizedRow['week start'];
                    const weekStart = weekStartRaw ? weekStartRaw.toString() : '';

                    const parseNum = (val: any) => {
                        if (val === undefined || val === null || val === '' || val === 'N/A') return null;
                        const num = Number(val);
                        return isNaN(num) ? null : num;
                    };

                    const req = parseNum(normalizedRow['requirement'] ?? normalizedRow['hc req'] ?? normalizedRow['req']);
                    const offers = parseNum(normalizedRow['job offers']);
                    const fallout = parseNum(normalizedRow['fallout'] ?? normalizedRow['sum of fallout'] ?? normalizedRow['um of fallou']);
                    const activeHires = parseNum(normalizedRow['active hires']);
                    const balance = parseNum(normalizedRow['balance']);
                    const showUp = parseNum(normalizedRow['day 1 show up']);

                    return {
                        id: index.toString(),
                        client,
                        lob,
                        isInternal,
                        reqId,
                        weekStart,
                        req,
                        offers,
                        fallout,
                        activeHires,
                        balance,
                        showUp,
                        isSelected: true
                    };
                }).filter((row: any) => {
                    const c = row.client.toLowerCase();
                    const l = row.lob.toLowerCase();
                    // Filter out rows where client or LOB contains "total"
                    if (c.includes('total') || l.includes('total')) return false;
                    // Filter out rows that are entirely empty or missing critical LOB/Client data
                    if (row.client === 'N/A' && row.lob === 'N/A') return false;
                    return true;
                });

                console.log("Setting import preview data with", parsedRows.length, "rows.");
                setImportPreviewData(parsedRows);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                console.error("Error parsing Excel file", err);
                toastError('Import Failed', 'Could not read the Excel file.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const executeImport = async () => {
        if (!importPreviewData) return;
        const selected = importPreviewData.filter(r => r.isSelected);
        setImportProgress({ current: 0, total: selected.length });

        let createdCount = 0;
        for (let i = 0; i < selected.length; i++) {
            const row = selected[i];

            try {
                const depts = await DepartmentService.getAll();
                let dept = depts.find(d => d.name.toLowerCase() === row.client.toLowerCase());
                if (!dept) {
                    try {
                        dept = await DepartmentService.add({ name: row.client });
                    } catch (e) {
                        const retryDepts = await DepartmentService.getAll();
                        dept = retryDepts.find(d => d.name.toLowerCase() === row.client.toLowerCase());
                        if (!dept) continue;
                    }
                }

                // Auto-sync LOB into Department's subAccounts if missing
                if (dept && row.lob) {
                    const lobExists = currentSubAccounts.some(sub => {
                        const name = typeof sub === 'string' ? sub : (sub?.name || '');
                        return name.toLowerCase() === row.lob.toLowerCase();
                    });

                    if (!lobExists) {
                        const newSubAccount = {
                            id: Math.random().toString(36).substring(2, 9),
                            name: row.lob,
                            description: 'Imported LOB'
                        };
                        dept.subAccounts = [...currentSubAccounts, newSubAccount];
                        await DepartmentService.update(dept.id, { subAccounts: dept.subAccounts });
                    }
                }

                await PositionService.add({
                    department: dept.name,
                    title: row.lob,
                    opening_name: row.lob,
                    hiring_quota: row.req !== null ? row.req : 0,
                    status: 'OPEN',
                    hiring_type: 'Billed',
                    quota_start_date: row.weekStart || null,
                    hiring_quota_id: row.reqId,
                    manual_hired: row.activeHires !== null ? row.activeHires : 0,
                    manual_active_hires: row.activeHires !== null ? row.activeHires : null,
                    manual_requirement: row.req !== null ? row.req : null,
                    manual_job_offers: row.offers,
                    manual_fallout: row.fallout,
                    manual_balance: row.balance,
                    manual_day_1_show_up: row.showUp
                });
                createdCount++;
            } catch (e) {
                console.error("Failed to import row", row, e);
            }

            setImportProgress({ current: i + 1, total: selected.length });
        }

        setImportProgress(null);
        setImportPreviewData(null);
        alert(`Successfully imported ${createdCount} LOBs from Excel!`);
        window.location.reload();
    };


    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [depts, pos, apps, history] = await Promise.all([
                DepartmentService.getAll(),
                PositionService.getAll(),
                ApplicationService.getAll(),
                PositionService.getQuotaHistory()
            ]);
            setDepartments(depts);
            setAllPositions(pos);
            setAllApplications(apps);
            setQuotaHistory(history);
        } catch {
            toastError('Load Failed', 'Could not retrieve system data.');
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const accountDashboardData = useMemo(() => {
        if (!selectedAccount) return null;
        const targetDeptName = selectedAccount.name.trim().toLowerCase();

        // Find ALL active positions (openings) for this department
        const activeInternalPositions = allPositions.filter(p => p.department?.trim()?.toLowerCase() === targetDeptName && p.status === 'OPEN');

        const accountApps = allApplications.filter(a => {
            const appDept = (a.department || '').trim().toLowerCase();
            const finalAcc = (a.pis?.final_account || '').trim().toLowerCase();
            const initAcc = (a.pis?.initial_account_assignment || '').trim().toLowerCase();
            const endorseAcc = (a.endorsement_account || '').trim().toLowerCase();
            const depts = appDept.split(',').map(s => s.trim()).filter(Boolean);
            return depts.includes(targetDeptName) || finalAcc === targetDeptName || initAcc === targetDeptName || endorseAcc === targetDeptName;
        });

        const accountHistory = quotaHistory.filter(item => item.department.trim().toLowerCase() === targetDeptName);
        const latestClosedAt = accountHistory[0]?.closedAt || null;
        const falloutStatuses = ['FAILED', 'REJECTED', 'WITHDRAWN'];

        // Map each active internal position as an individual opening
        const openings = activeInternalPositions.map(p => {
            const quota = Number(p.hiring_quota) || 0;
            const manualHired = Number(p.manual_hired || p.manualHired || 0);
            const start = p.quota_start_date || p.quotaStartDate || null;
            const end = p.quota_end_date || p.quotaEndDate || null;
            const openingName = p.opening_name || p.title.replace('[INTERNAL] ', '').replace(' Quota', '') || 'Unnamed Opening';

            const seasonApps = accountApps.filter(a => {
                const appLob = a.pis?.custom_lob || '';
                if (openingName && openingName !== 'Unnamed Opening') {
                    if (appLob !== openingName) return false; // Does not belong to this LOB
                    // Explicitly assigned to this LOB, but we must also check if it falls within the quota's date range
                    return isDateInsideSeason(getSeasonActivityDate(a), start, end);
                }
                // If it's a generic opening, fallback to season date logic
                return isDateInsideSeason(getSeasonActivityDate(a), start, end);
            });

            const realHiredCount = seasonApps.filter(a => {
                const currentStatus = (a.current_status || '').toUpperCase();
                const finalSpecific = (a.pis?.final_specific_status || '').toUpperCase();
                const overallStatus = (a.pis?.overall_status || '').toUpperCase();
                const remarks = (a.remarks || '').toUpperCase();
                const finalNotes = (a.final_interview_notes || '').toUpperCase();
                const masterStatus = (a.master_status || '').toUpperCase();

                const isHired = currentStatus === 'HIRED' || finalSpecific === 'HIRED' || overallStatus === 'HIRED' || masterStatus === 'HIRED';
                const isConfirmedTraining = currentStatus.includes('CONFIRMED TRAINING') || finalSpecific.includes('CONFIRMED TRAINING') || overallStatus.includes('CONFIRMED TRAINING') || remarks.includes('CONFIRMED TRAINING') || finalNotes.includes('CONFIRMED TRAINING') || masterStatus.includes('CONFIRMED TRAINING');

                return isHired || isConfirmedTraining;
            }).length;

            const hired = manualHired; // Automated assignments disabled per request

            const inPipeline = seasonApps.filter(a => {
                const currentStatus = (a.current_status || '').toUpperCase();
                const isHiredOrConfirmed = currentStatus === 'HIRED' || currentStatus.includes('CONFIRMED TRAINING');
                return !isHiredOrConfirmed && !falloutStatuses.includes(currentStatus);
            }).length;

            const failedCount = seasonApps.filter(a => falloutStatuses.includes((a.current_status || '').toUpperCase())).length;

            return {
                id: p.id,
                name: openingName,
                quota,
                hired,
                manualHired,
                inPipeline,
                failedCount,
                totalApplicants: seasonApps.length,
                remaining: Math.max(0, quota - hired),
                progress: quota > 0 ? (hired / quota) * 100 : 0,
                hiringType: (p.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') as 'Billed' | 'Non-Billed',
                quotaStart: start,
                quotaEnd: end,
                trainingStartDate: p.training_start_date || p.trainingStartDate || null,
                hiringQuotaId: p.hiring_quota_id || p.hiringQuotaId || '',
                durationLabel: getDurationLabel(toDateInputValue(start), toDateInputValue(end)),
                country: p.country || null,
                city: p.city || null,
                notes: p.notes || null,
                requesterName: p.requester_name || p.requesterName || null,
                recruitmentProgress: p.recruitment_progress || p.recruitmentProgress || null,
                concatenate: p.concatenate || null,
            };
        });

        // Compute aggregated values
        const totalQuota = openings.reduce((acc, curr) => acc + curr.quota, 0);
        const totalHired = openings.reduce((acc, curr) => acc + curr.hired, 0);
        const manualHired = openings.reduce((acc, curr) => acc + curr.manualHired, 0);
        const inPipeline = openings.reduce((acc, curr) => acc + curr.inPipeline, 0);
        const failedCount = openings.reduce((acc, curr) => acc + curr.failedCount, 0);
        const totalApplicants = openings.reduce((acc, curr) => acc + curr.totalApplicants, 0);

        const primaryOpening = openings[0];

        const filteredApplicants = activePipelineFilter ? accountApps.filter(a => {
            const status = a.current_status || 'PENDING';
            if (activePipelineFilter === 'Applied') return true;
            if (activePipelineFilter === 'Hired') {
                return status === 'HIRED' &&
                    isAfterQuotaCutoff(getSeasonHiredDate(a, primaryOpening?.quotaStart, primaryOpening?.quotaEnd), latestClosedAt);
            }
            if (activePipelineFilter === 'Fallout') return ['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status.toUpperCase());
            if (activePipelineFilter === 'In Pipeline') return status !== 'HIRED' && !['FAILED', 'REJECTED', 'WITHDRAWN'].includes(status.toUpperCase());
            return true;
        }) : accountApps;

        return {
            totalQuota,
            totalHired,
            manualHired,
            inPipeline,
            failedCount,
            totalApplicants,
            remaining: Math.max(0, totalQuota - totalHired),
            progress: totalQuota > 0 ? (totalHired / totalQuota) * 100 : 0,
            internalPosId: primaryOpening?.id,
            hiringType: primaryOpening?.hiringType,
            qualifications: primaryOpening ? (primaryOpening.hiringType === 'Non-Billed' ? 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' : 'ACCOUNT_INTERNAL_QUOTA_BILLED') : null,
            quotaStart: primaryOpening?.quotaStart,
            quotaEnd: primaryOpening?.quotaEnd,
            trainingStartDate: primaryOpening?.trainingStartDate,
            hiringQuotaId: primaryOpening?.hiringQuotaId,
            durationLabel: primaryOpening?.durationLabel || 'No active openings',
            history: accountHistory,
            isActive: openings.length > 0,
            filteredApplicants,
            openings
        };
    }, [selectedAccount, allPositions, allApplications, localQuotas, activePipelineFilter, quotaHistory]);

    const resetQuotaForm = useCallback(() => {
        setQuotaForm(0);
        setQuotaManualHired(0);
        setQuotaManualJobOffers('');
        setQuotaManualFallout('');
        setQuotaManualBalance('');
        setQuotaManualDay1ShowUp('');
        setQuotaStartDate('');
        setQuotaEndDate('');
        setQuotaHiringType('Billed');
        setQuotaTrainingStartDate('');
        setQuotaHiringQuotaId('');
        setQuotaOpeningName('');
        setQuotaSalaryMatrixCategory('');
        setQuotaClassType('');
        setQuotaRosterDate('');
        setQuotaHiringReqHc('');
        setQuotaTotalOffersExtended('');
        setQuotaNetHiresInternal('');
        setQuotaNetHiresExternal('');
        setQuotaJoBalance('');
        setQuotaNotes('');
        setEditingPositionId(null);
        setAiSuggestion(null);
    }, []);

    const handleSuggestQuota = async () => {
        if (!selectedAccount) return;
        setAiSuggesting(true);
        setAiSuggestion(null);
        try {
            const targetDeptName = selectedAccount.name.trim().toLowerCase();
            const historyPayload = quotaHistory
                .filter(item => item.department.trim().toLowerCase() === targetDeptName)
                .slice(0, 5)
                .map(item => {
                    const start = item.startDate ? new Date(item.startDate) : null;
                    const end = item.endDate ? new Date(item.endDate) : null;
                    const durationDays = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) : undefined;
                    return {
                        quota: item.quota,
                        hiredCount: item.hiredCount,
                        totalApplicants: item.totalApplicants,
                        inPipeline: item.inPipeline,
                        failedCount: item.failedCount,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        durationDays,
                    };
                });
            const result = await AIService.suggestQuota({
                department: selectedAccount.name,
                history: historyPayload,
                currentQuota: accountDashboardData?.totalQuota ?? 0,
            });
            setAiSuggestion(result);
            setQuotaForm(result.suggestedQuota);
            setQuotaHiringType(result.hiringType);
            if (result.durationDays && result.durationDays > 0) {
                const start = new Date(quotaStartDate || todayInputValue());
                const end = new Date(start);
                end.setDate(end.getDate() + result.durationDays);
                setQuotaEndDate(end.toISOString().slice(0, 10));
            }
            success('AI Suggestion Ready', `Suggested ${result.suggestedQuota} units (${result.hiringType}).`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error.';
            const apiMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toastError('AI Suggestion Failed', apiMessage ?? message);
        } finally {
            setAiSuggesting(false);
        }
    };

    const handleUpdateQuota = async (newVal?: number, isCancel: boolean = false) => {
        if (!selectedAccount || !accountDashboardData) return;
        setSubmitting(true);
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        const finalValue = newVal !== undefined ? newVal : quotaForm;
        const targetPosId = editingPositionId;
        const targetOpening = accountDashboardData.openings.find(o => o.id === targetPosId);
        const isClosingQuota = finalValue === 0 && targetOpening && !isCancel;

        try {
            if (isClosingQuota && targetOpening) {
                await PositionService.archiveQuotaHistory({
                    department: selectedAccount.name,
                    positionId: targetPosId || null,
                    quota: targetOpening.quota,
                    hiredCount: targetOpening.hired,
                    totalApplicants: targetOpening.totalApplicants,
                    inPipeline: targetOpening.inPipeline,
                    failedCount: targetOpening.failedCount,
                    startDate: toDateInputValue(targetOpening.quotaStart) || null,
                    endDate: toDateInputValue(targetOpening.quotaEnd) || null,
                    hiringType: targetOpening.hiringType || 'Billed',
                    manualHires: targetOpening.manualHired,
                    trainingStartDate: toDateInputValue(targetOpening.trainingStartDate) || null,
                    hiringQuotaId: targetOpening.hiringQuotaId || '',
                    openingName: targetOpening.name
                });
            }

            if (isCancel && targetOpening) {
                const newCancelledClass: CancelledClass = {
                    id: Math.random().toString(36).substring(2, 9),
                    department: selectedAccount.name,
                    quota: targetOpening.quota,
                    hiredCount: targetOpening.hired,
                    totalApplicants: targetOpening.totalApplicants,
                    inPipeline: targetOpening.inPipeline,
                    failedCount: targetOpening.failedCount,
                    startDate: toDateInputValue(targetOpening.quotaStart) || null,
                    endDate: toDateInputValue(targetOpening.quotaEnd) || null,
                    cancelledAt: new Date().toISOString()
                };

                const updatedCancelled = [newCancelledClass, ...cancelledClasses];
                setCancelledClasses(updatedCancelled);
                localStorage.setItem(CANCELLED_CLASSES_KEY, JSON.stringify(updatedCancelled));
            }

            if (targetPosId) {
                if (finalValue === 0) {
                    // Archive and mark CLOSED
                    await PositionService.update(targetPosId, {
                        status: 'CLOSED',
                        closed_date: new Date().toISOString().slice(0, 10)
                    });
                } else {
                    await PositionService.update(targetPosId, {
                        hiring_quota: finalValue,
                        manual_hired: quotaManualHired,
                        quota_start_date: finalValue > 0 ? quotaStartDate : null,
                        quota_end_date: finalValue > 0 ? quotaEndDate : null,
                        training_start_date: finalValue > 0 ? quotaTrainingStartDate : null,
                        hiring_quota_id: finalValue > 0 ? quotaHiringQuotaId : '',
                        opening_name: finalValue > 0 ? quotaOpeningName : '',
                        manual_job_offers: quotaManualJobOffers !== '' ? Number(quotaManualJobOffers) : null,
                        manual_fallout: quotaManualFallout !== '' ? Number(quotaManualFallout) : null,
                        manual_balance: quotaManualBalance !== '' ? Number(quotaManualBalance) : null,
                        manual_day_1_show_up: quotaManualDay1ShowUp !== '' ? Number(quotaManualDay1ShowUp) : null,
                        salary_matrix_category: quotaSalaryMatrixCategory || null,
                        class_type: quotaClassType || null,
                        roster_date: quotaRosterDate || null,
                        hiring_req_hc: quotaHiringReqHc !== '' ? Number(quotaHiringReqHc) : null,
                        total_offers_extended: quotaTotalOffersExtended !== '' ? Number(quotaTotalOffersExtended) : null,
                        net_hires_internal: quotaNetHiresInternal !== '' ? Number(quotaNetHiresInternal) : null,
                        net_hires_external: quotaNetHiresExternal !== '' ? Number(quotaNetHiresExternal) : null,
                        jo_balance: quotaJoBalance !== '' ? Number(quotaJoBalance) : null,
                        notes: quotaNotes || null,
                        country: quotaCountry || null,
                        city: quotaCity || null,
                        requester_name: quotaRequesterName || null,
                        recruitment_progress: quotaRecruitmentProgress || null,
                        concatenate: quotaConcatenate || null,
                        request_date: quotaRequestDate || null,
                        approval_date: quotaApprovalDate || null,
                        is_billable: quotaIsBillable,
                        qualifications: finalValue > 0
                            ? (quotaHiringType === 'Internal' ? 'ACCOUNT_INTERNAL_QUOTA_INTERNAL' : quotaHiringType === 'External' ? 'ACCOUNT_INTERNAL_QUOTA_EXTERNAL' : 'ACCOUNT_INTERNAL_QUOTA_INTERNAL_EXTERNAL')
                            : ''
                    });
                }
            } else {
                await PositionService.add({
                    title: `[INTERNAL] ${selectedAccount.name} Quota`,
                    department: selectedAccount.name,
                    hiring_quota: finalValue,
                    manual_hired: quotaManualHired,
                    quota_start_date: finalValue > 0 ? quotaStartDate : null,
                    quota_end_date: finalValue > 0 ? quotaEndDate : null,
                    training_start_date: finalValue > 0 ? quotaTrainingStartDate : null,
                    hiring_quota_id: finalValue > 0 ? quotaHiringQuotaId : '',
                    opening_name: quotaOpeningName || '',
                    manual_job_offers: quotaManualJobOffers !== '' ? Number(quotaManualJobOffers) : null,
                    manual_fallout: quotaManualFallout !== '' ? Number(quotaManualFallout) : null,
                    manual_balance: quotaManualBalance !== '' ? Number(quotaManualBalance) : null,
                    manual_day_1_show_up: quotaManualDay1ShowUp !== '' ? Number(quotaManualDay1ShowUp) : null,
                    country: quotaCountry || null,
                    city: quotaCity || null,
                    request_date: quotaRequestDate || null,
                    approval_date: quotaApprovalDate || null,
                    is_billable: quotaIsBillable,
                    requester_name: quotaRequesterName || null,
                    recruitment_progress: quotaRecruitmentProgress || null,
                    concatenate: quotaConcatenate || null,
                    salary_matrix_category: quotaSalaryMatrixCategory || null,
                    class_type: quotaClassType || null,
                    roster_date: quotaRosterDate || null,
                    hiring_req_hc: quotaHiringReqHc !== '' ? Number(quotaHiringReqHc) : null,
                    total_offers_extended: quotaTotalOffersExtended !== '' ? Number(quotaTotalOffersExtended) : null,
                    net_hires_internal: quotaNetHiresInternal !== '' ? Number(quotaNetHiresInternal) : null,
                    net_hires_external: quotaNetHiresExternal !== '' ? Number(quotaNetHiresExternal) : null,
                    jo_balance: quotaJoBalance !== '' ? Number(quotaJoBalance) : null,
                    notes: quotaNotes || null,
                    qualifications: quotaHiringType === 'Internal' ? 'ACCOUNT_INTERNAL_QUOTA_INTERNAL' : quotaHiringType === 'External' ? 'ACCOUNT_INTERNAL_QUOTA_EXTERNAL' : 'ACCOUNT_INTERNAL_QUOTA_INTERNAL_EXTERNAL',
                    status: 'OPEN',
                    description: `Internal tracking for ${selectedAccount.name}`,
                    location: 'System', work_arrangement: 'Onsite', employment_type: 'Full-time'
                });
            }
            localStorage.setItem(`${STORAGE_PREFIX}${targetDeptName}`, finalValue.toString());
            setLocalQuotas(prev => ({ ...prev, [targetDeptName]: finalValue }));

            if (finalValue === 0) {
                if (isCancel) {
                    success('LOB Closed', `Hiring campaign for ${selectedAccount.name} was successfully cancelled.`);
                } else {
                    success('Hiring Closed', `Headcount target for ${selectedAccount.name} has been reset.`);
                }
            } else {
                if (targetPosId) {
                    success('LOB Updated', `Details for ${quotaOpeningName || selectedAccount.name} have been updated.`);
                } else {
                    success('LOB Status Updated', `Quota for ${selectedAccount.name} set to ${finalValue}.`);
                }
            }

            setQuotaModal(false);
            setCloseConfirm(false);
            setCancelConfirm(false);
            resetQuotaForm();
            await loadData();
        } catch {
            localStorage.setItem(`${STORAGE_PREFIX}${targetDeptName}`, finalValue.toString());
            setLocalQuotas(prev => ({ ...prev, [targetDeptName]: finalValue }));
            toastError('Database Sync Warning', 'Quota saved locally but server sync failed.');
            setQuotaModal(false);
            setCloseConfirm(false);
            setCancelConfirm(false);
            resetQuotaForm();
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddAccount = async () => {
        if (!form.name.trim()) return;
        setSubmitting(true);
        try {
            const payload = { name: form.name, head: form.head, budgetCode: form.budget_code, type: form.type };
            if (editingId) {
                await DepartmentService.update(editingId, payload);
                success('Account Updated', `Changes for ${form.name} saved.`);
            } else {
                await DepartmentService.add(payload);
                success('Account Created', `${form.name} department added.`);
            }
            setModal(false);
            setEditingId(null);
            setForm({ name: '', head: '', budget_code: '', type: 'ACCOUNTS' });
            await loadData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'System error during save.';
            const apiMessage = (err as { response?: { data?: { error?: string, message?: string } } })?.response?.data?.error ||
                (err as { response?: { data?: { error?: string, message?: string } } })?.response?.data?.message;
            toastError(editingId ? 'Update Failed' : 'Create Failed', apiMessage ?? message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (dept: Department) => {
        setEditingId(dept.id);
        setForm({ name: dept.name, head: dept.head || '', budget_code: dept.budgetCode || '', type: dept.type || 'ACCOUNTS' });
        setModal(true);
    };

    const handleAccountImageUpload = async (dept: Department, file?: File | null) => {
        if (!file) return;
        setSubmitting(true);
        try {
            const updated = await DepartmentService.uploadImage(dept.id, file);
            setDepartments(prev => prev.map(item => item.id === updated.id ? updated : item));
            setSelectedAccount(prev => prev?.id === updated.id ? updated : prev);
            success('Account Picture Updated', `${updated.name} now has a dashboard image.`);
        } catch {
            toastError('Upload Failed', 'Please use a JPG, PNG, WEBP, or GIF image under 5MB.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!delConfirm) return;
        try {
            await DepartmentService.delete(delConfirm.id);
            localStorage.removeItem(`${STORAGE_PREFIX}${delConfirm.name.trim().toLowerCase()}`);
            success('Account Removed', `${delConfirm.name} deleted.`);
            await loadData();
        } catch {
            toastError('Delete Failed', 'Action prohibited.');
        } finally {
            setDelConfirm(null);
        }
    };


    const handleBulkDelete = async () => {
        if (!selectedExcelRows.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedExcelRows.length} item(s)?`)) return;

        setSubmitting(true);
        try {
            for (const item of selectedExcelRows) {
                if (item.isHistory) {
                    await PositionService.deleteQuotaHistory(item.id);
                } else {
                    await PositionService.delete(item.id);
                }
            }
            success('Bulk Delete', `Deleted ${selectedExcelRows.length} item(s) successfully.`);
            setSelectedExcelRows([]);
            await loadData();
        } catch (err: unknown) {
            toastError('Bulk Delete Failed', 'One or more items could not be deleted.');
        } finally {
            setSubmitting(false);
        }
    };


    const handleDeleteCancelledClass = useCallback((id: string) => {
        const updated = cancelledClasses.filter(c => c.id !== id);
        setCancelledClasses(updated);
        localStorage.setItem(CANCELLED_CLASSES_KEY, JSON.stringify(updated));
    }, [cancelledClasses]);

    const isSupportDept = useCallback((dept: Department) => {
        if (dept.type) return dept.type === 'SUPPORT_ROLES';
        const lower = dept.name.toLowerCase().trim();
        return ['admin', 'hr', 'support', 'recruitment', 'it', 'support and leadership', 'workforce', 'revenue & invoicing', 'quality assurance', 'training & development', 'engagement & social media', 'human resources', 'it department', 'facilities', 'security', 'safety', 'client engagement & asset control', 'process optimization'].includes(lower) || lower.includes('support');
    }, []);

    const lobCards = useMemo(() => {
        let list: AccountCardDept[] = [];
        const baseDepts = (departments || []).filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING');

        baseDepts.forEach(dept => {
            const targetName = dept.name.trim().toLowerCase();
            const deptQuotaPositions = allPositions.filter(p =>
                p.department?.trim()?.toLowerCase() === targetName &&
                (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]')) &&
                p.status === 'OPEN'
            );

            // Track which LOB names are already covered by positions
            const coveredLobNames = new Set<string>();

            // Group positions by LOB name to aggregate quotas and hires
            const lobGroups = new Map<string, { quota: number, hired: number, start: string | null, end: string | null, type: 'Billed' | 'Non-Billed', name: string }>();

            deptQuotaPositions.forEach(p => {
                const quota = Number(p.hiring_quota) || 0;
                const manualHired = Number(p.manual_hired || p.manualHired || 0);
                const start = p.quota_start_date || p.quotaStartDate || null;
                const end = p.quota_end_date || p.quotaEndDate || null;
                const hiringType = (p.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') as 'Billed' | 'Non-Billed';

                const targetDeptName = targetName;

                let activeHires = manualHired;
                if (start && end) {
                    const seasonApps = allApplications.filter(app =>
                        (app.department || '').trim().toLowerCase() === targetDeptName &&
                        isDateInsideSeason(getSeasonActivityDate(app), start, end)
                    );
                    activeHires += seasonApps.filter(a => ['HIRED', 'PASSED'].includes(a.current_status)).length;
                }

                const lobName = p.opening_name || p.title.replace('[INTERNAL]', '').trim();
                const lobKey = lobName.trim().toLowerCase();

                if (lobGroups.has(lobKey)) {
                    const existing = lobGroups.get(lobKey)!;
                    existing.quota += quota;
                    existing.hired += activeHires;
                } else {
                    lobGroups.set(lobKey, {
                        quota,
                        hired: activeHires,
                        start,
                        end,
                        type: hiringType,
                        name: lobName
                    });
                }
            });

            lobGroups.forEach((group, lobKey) => {
                coveredLobNames.add(lobKey);

                list.push({
                    ...dept,
                    name: `${dept.name} - ${group.name}`,
                    hiredCount: group.hired,
                    quota: group.quota,
                    progress: group.quota > 0 ? (group.hired / group.quota) * 100 : 0,
                    hiringType: group.type,
                    quotaStart: group.start,
                    quotaEnd: group.end,
                    activeOpeningCount: 1,
                    _lobName: group.name,
                    _parentDeptName: dept.name
                } as any);
            });

            // Also include LOBs from subAccounts that don't have a matching opening
            if (dept.subAccounts && dept.subAccounts.length > 0) {
                dept.subAccounts.forEach(sub => {
                    const subName = (typeof sub === 'string' ? sub : (sub?.name || '')).trim();
                    if (!subName) return;
                    if (!coveredLobNames.has(subName.toLowerCase())) {
                        list.push({
                            ...dept,
                            name: `${dept.name} - ${subName}`,
                            hiredCount: 0,
                            quota: 0,
                            progress: 0,
                            activeOpeningCount: 0,
                            _lobName: subName,
                            _parentDeptName: dept.name
                        } as any);
                    }
                });
            }
        });

        // Filter by search text
        list = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

        // Filter by Start Date
        if (lobStartDateFilter) {
            list = list.filter(d => d.quotaStart && d.quotaStart.startsWith(lobStartDateFilter));
        }

        return list.sort((a, b) => b.progress - a.progress);
    }, [departments, allPositions, allApplications, search, lobStartDateFilter, isSupportDept]);

    const sortedAndFiltered = useMemo(() => {
        let list = (departments || []);
        if (activeMainTab === 'ACCOUNTS') {
            list = list.filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING');
        } else {
            list = list.filter(d => isSupportDept(d));
        }



        list = list.filter(d =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (d.head?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (d.budgetCode?.toLowerCase() || '').includes(search.toLowerCase())
        );

        const mapped = list.map(dept => {
            const targetName = dept.name.trim().toLowerCase();
            let deptQuotaPositions = allPositions.filter(p => p.department?.trim()?.toLowerCase() === targetName && p.status === 'OPEN');
            const realQuotas = deptQuotaPositions.filter(p => !(p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]')));
            if (realQuotas.length > 0) {
                deptQuotaPositions = realQuotas;
            } else {
                deptQuotaPositions = deptQuotaPositions.filter(p => (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]')));
            }
            const latestClosedAt = quotaHistory.find(item => item.department.trim().toLowerCase() === targetName)?.closedAt || null;

            let totalQuota = 0;
            let totalHired = 0;
            let primaryHiringType: 'Billed' | 'Non-Billed' | undefined = undefined;
            let primaryStart: string | null = null;
            let primaryEnd: string | null = null;

            deptQuotaPositions.forEach(p => {
                const quota = Number(p.hiring_quota) || 0;
                const manualHired = Number(p.manual_hired || p.manualHired || 0);
                const start = p.quota_start_date || p.quotaStartDate || null;
                const end = p.quota_end_date || p.quotaEndDate || null;

                if (!primaryHiringType) {
                    primaryHiringType = (p.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') as 'Billed' | 'Non-Billed';
                    primaryStart = start;
                    primaryEnd = end;
                }

                let hired = manualHired; // Automated assignments disabled per request

                totalQuota += quota;
                totalHired += hired;
            });

            const progress = totalQuota > 0 ? (totalHired / totalQuota) * 100 : 0;
            return {
                ...dept,
                hiredCount: totalHired,
                quota: totalQuota,
                progress,
                hiringType: primaryHiringType,
                quotaStart: primaryStart,
                quotaEnd: primaryEnd,
                activeOpeningCount: deptQuotaPositions.length
            };
        });

        const filtered = mapped.filter(item => {
            if (hiringTypeFilter === 'ALL') return true;
            if (hiringTypeFilter === 'BILLED') return item.quota > 0 && item.hiringType === 'Billed';
            if (hiringTypeFilter === 'NON_BILLED') return item.quota > 0 && item.hiringType === 'Non-Billed';
            if (hiringTypeFilter === 'NO_QUOTA') return item.quota === 0;
            return true;
        });

        return filtered.sort((a, b) => b.progress - a.progress);
    }, [departments, search, allApplications, allPositions, hiringTypeFilter, quotaHistory, activeMainTab, isSupportDept]);

    const accountStats = useMemo(() => {
        let list = (departments || []);
        if (activeMainTab === 'ACCOUNTS') {
            list = list.filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING');
        } else {
            list = list.filter(d => isSupportDept(d));
        }



        const mapped = list.map(dept => {
            const targetName = dept.name.trim().toLowerCase();
            const deptQuotaPos = allPositions.find(p =>
                p.department?.trim()?.toLowerCase() === targetName &&
                (p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA') || p.title.includes('[INTERNAL]'))
            );
            const quota = deptQuotaPos ? Number(deptQuotaPos.hiring_quota) : 0;
            const hiringType = quota > 0 ? (deptQuotaPos?.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'Non-Billed' : 'Billed') : undefined;
            return { hiringType, quota };
        });
        return {
            total: mapped.length,
            billed: mapped.filter(i => i.hiringType === 'Billed').length,
            nonBilled: mapped.filter(i => i.hiringType === 'Non-Billed').length
        };
    }, [departments, allPositions, activeMainTab, isSupportDept]);

    const quotaHistoryDrilldownApps = useMemo(() => {
        if (!quotaHistoryDrilldown || !selectedAccount) return [];
        const targetDeptName = selectedAccount.name.trim().toLowerCase();
        const falloutStatuses = ['FAILED', 'REJECTED', 'WITHDRAWN'];
        const seasonApps = allApplications.filter(app =>
            (app.department || '').trim().toLowerCase() === targetDeptName &&
            isDateInsideSeason(getSeasonActivityDate(app), quotaHistoryDrilldown.item.startDate, quotaHistoryDrilldown.item.endDate)
        );

        if (quotaHistoryDrilldown.metric === 'hired') return seasonApps.filter(app => app.current_status === 'HIRED');
        if (quotaHistoryDrilldown.metric === 'fallout') return seasonApps.filter(app => falloutStatuses.includes((app.current_status || '').toUpperCase()));
        if (quotaHistoryDrilldown.metric === 'processed') return seasonApps;
        return [];
    }, [allApplications, quotaHistoryDrilldown, selectedAccount]);

    const quotaHistoryMetricLabels: Record<QuotaHistoryMetric, string> = {
        quota: 'Quota',
        hired: 'Hired',
        processed: 'Processed',
        fallout: 'Fallout'
    };

    // Country flag helper using country code mapping
    const getCountryFlag = (countryName: string | null | undefined): string => {
        if (!countryName) return '';
        const flagMap: Record<string, string> = {
            'philippines': '🇵🇭', 'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸',
            'canada': '🇨🇦', 'australia': '🇦🇺', 'united kingdom': '🇬🇧', 'uk': '🇬🇧',
            'india': '🇮🇳', 'japan': '🇯🇵', 'singapore': '🇸🇬', 'germany': '🇩🇪',
            'france': '🇫🇷', 'china': '🇨🇳', 'brazil': '🇧🇷', 'mexico': '🇲🇽',
            'south korea': '🇰🇷', 'korea': '🇰🇷', 'italy': '🇮🇹', 'spain': '🇪🇸',
            'netherlands': '🇳🇱', 'sweden': '🇸🇪', 'norway': '🇳🇴', 'denmark': '🇩🇰',
            'finland': '🇫🇮', 'ireland': '🇮🇪', 'new zealand': '🇳🇿', 'switzerland': '🇨🇭',
            'belgium': '🇧🇪', 'austria': '🇦🇹', 'portugal': '🇵🇹', 'poland': '🇵🇱',
            'czech republic': '🇨🇿', 'hungary': '🇭🇺', 'romania': '🇷🇴', 'greece': '🇬🇷',
            'turkey': '🇹🇷', 'russia': '🇷🇺', 'ukraine': '🇺🇦', 'israel': '🇮🇱',
            'south africa': '🇿🇦', 'egypt': '🇪🇬', 'nigeria': '🇳🇬', 'kenya': '🇰🇪',
            'uae': '🇦🇪', 'united arab emirates': '🇦🇪', 'saudi arabia': '🇸🇦',
            'malaysia': '🇲🇾', 'thailand': '🇹🇭', 'vietnam': '🇻🇳', 'indonesia': '🇮🇩',
            'taiwan': '🇹🇼', 'hong kong': '🇭🇰', 'pakistan': '🇵🇰', 'bangladesh': '🇧🇩',
            'colombia': '🇨🇴', 'argentina': '🇦🇷', 'chile': '🇨🇱', 'peru': '🇵🇪',
            'costa rica': '🇨🇷', 'panama': '🇵🇦', 'dominican republic': '🇩🇴',
        };
        return flagMap[countryName.toLowerCase().trim()] || '🏳️';
    };

    const excelData = useMemo(() => {
        interface ExcelRow {
            month: string;
            weekStart: string;
            startDate: string;
            trainingStartDate: string;
            client: string;
            clientImageUrl?: string | null;
            clientImageData?: string | null;
            lob: string;
            internalExternal: string;
            hiringRequestId: string;
            requirement: number;
            jobOffers: number;
            fallout: number;
            activeHires: number;
            balance: number;
            day1ShowUp: number;
            manualJobOffers: number | null;
            manualFallout: number | null;
            manualActiveHires: number | null;
            manualBalance: number | null;
            manualDay1ShowUp: number | null;
            salaryMatrixCategory: string | null;
            classType: string | null;
            rosterDate: string | null;
            hiringReqHc: number | null;
            totalOffersExtended: number | null;
            netHiresInternal: number | null;
            netHiresExternal: number | null;
            joBalance: number | null;
            notes: string | null;
            requester: string | null;
            recruitmentProgress: string | null;
            concatenate: string | null;
            country: string | null;
            city: string | null;
            positionId: string;
            isHistory: boolean;
        }

        const rows: ExcelRow[] = [];
        console.log("excelData starting mapping. sortedAndFiltered:", sortedAndFiltered.map(d => d.name), "positions:", allPositions.length);

        // Loop over ALL valid departments regardless of activeMainTab to merge Support Hiring and Account
        const allDepts = (departments || []).filter(d => d.name.toUpperCase() !== 'PENDING');
        allDepts.forEach(dept => {
            const targetName = dept.name.trim().toLowerCase();

            // 1. Gather active openings
            const deptQuotaPositions = allPositions.filter(p =>
                p.department?.trim()?.toLowerCase() === targetName &&
                p.status === 'OPEN'
            );

            // 2. Gather closed campaigns history
            const closedCampaigns = quotaHistory.filter(h => h.department.trim().toLowerCase() === targetName);

            // Skip account if it has no active openings AND no closed campaigns
            if (deptQuotaPositions.length === 0 && closedCampaigns.length === 0) {
                return;
            }

            deptQuotaPositions.forEach(p => {
                const start = p.quota_start_date || p.quotaStartDate || '2026-06-01';
                const quota = Number(p.hiring_quota) || 0;

                const lobName = p.opening_name || p.title.replace('[INTERNAL]', '').replace(' Quota', '').trim();
                const lobUpper = lobName.toUpperCase();
                console.log(`[DEBUG] Processing position: ${p.title} for dept: ${targetName}, lobUpper: ${lobUpper}, opening_name: ${p.opening_name}`);

                // Calculate hires under this active opening
                const hiredCount = allApplications.filter(a => {
                    const appDept = (a.department || '').trim().toLowerCase();
                    const matchesDept = appDept.split(',').map(s => s.trim()).includes(targetName);
                    const appPos = (a.position_title || '').trim().toLowerCase();
                    const matchesPosition = appPos === lobName.toLowerCase();
                    return matchesDept && matchesPosition && a.current_status === 'HIRED';
                }).length;

                const failedCount = allApplications.filter(a => {
                    const appDept = (a.department || '').trim().toLowerCase();
                    const matchesDept = appDept.split(',').map(s => s.trim()).includes(targetName);
                    const appPos = (a.position_title || '').trim().toLowerCase();
                    const matchesPosition = appPos === lobName.toLowerCase();
                    return matchesDept && matchesPosition && ['FAILED', 'REJECTED', 'WITHDRAWN'].includes((a.current_status || '').toUpperCase());
                }).length;

                if (lobUpper === 'GENERAL AGENT' || lobUpper.includes('QUOTA') || lobUpper === dept.name.toUpperCase() || !p.opening_name) {
                    console.log(`[DEBUG] Skipping position: ${p.title} - Failed condition: lobUpper=${lobUpper}, dept.name.toUpperCase()=${dept.name.toUpperCase()}, !p.opening_name=${!p.opening_name}`);
                    return;
                }

                // Skip if date range does not match
                const startMs = new Date(start).getTime();
                if (excelFilterStart && excelFilterStart.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const filterStartMs = new Date(`${excelFilterStart}T00:00:00`).getTime();
                    if (!isNaN(filterStartMs) && !isNaN(startMs) && startMs < filterStartMs) return;
                }
                if (excelFilterEnd && excelFilterEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const filterEndMs = new Date(`${excelFilterEnd}T23:59:59`).getTime();
                    if (!isNaN(filterEndMs) && !isNaN(startMs) && startMs > filterEndMs) return;
                }

                // Month calculation
                const dateObj = new Date(start);
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' }) || 'June';

                // Week start Monday calculation
                const day = dateObj.getDay();
                const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(dateObj.setDate(diff));
                const weekStartStr = `${monday.getMonth() + 1}/${monday.getDate()}/${monday.getFullYear()}`;

                const formattedStart = `${new Date(start).getMonth() + 1}/${new Date(start).getDate()}/${new Date(start).getFullYear()}`;

                const trainingStart = p.training_start_date || p.trainingStartDate || '';
                const formattedTrainingStart = trainingStart ? `${new Date(trainingStart).getMonth() + 1}/${new Date(trainingStart).getDate()}/${new Date(trainingStart).getFullYear()}` : 'N/A';

                rows.push({
                    month: monthName,
                    weekStart: weekStartStr,
                    startDate: formattedStart,
                    trainingStartDate: formattedTrainingStart,
                    client: dept.name,
                    clientImageUrl: dept.accountImageUrl || null,
                    clientImageData: dept.accountImageData || null,
                    lob: lobName,
                    internalExternal: p.qualifications === 'ACCOUNT_INTERNAL_QUOTA_NON_BILLED' ? 'External' : 'Internal',
                    hiringRequestId: p.hiringQuotaId || (p.id && String(p.id).includes('-') ? String(p.id).split('-')[0] : String(p.id)),
                    requirement: quota,
                    jobOffers: hiredCount + failedCount,
                    fallout: failedCount,
                    activeHires: hiredCount,
                    balance: Math.max(0, quota - hiredCount),
                    day1ShowUp: hiredCount,
                    manualJobOffers: p.manualJobOffers ?? p.autoAcceptedJobOffers ?? null,
                    manualFallout: p.manualFallout ?? p.autoFallout ?? null,
                    manualActiveHires: p.manualActiveHires ?? null,
                    manualBalance: p.manualBalance ?? p.autoBalance ?? null,
                    manualDay1ShowUp: p.manualDay1ShowUp ?? p.autoDay1ShowUp ?? null,
                    salaryMatrixCategory: p.salaryMatrixCategory ?? null,
                    classType: p.classType ?? null,
                    rosterDate: p.rosterDate ?? null,
                    hiringReqHc: p.hiringReqHc ?? null,
                    totalOffersExtended: p.totalOffersExtended ?? p.autoTotalOffersExtended ?? null,
                    netHiresInternal: p.netHiresInternal ?? p.autoNetHiresInternal ?? null,
                    netHiresExternal: p.netHiresExternal ?? p.autoNetHiresExternal ?? null,
                    joBalance: p.joBalance ?? p.autoJoBalance ?? null,
                    notes: p.notes || null,
                    requester: p.requesterName || null,
                    recruitmentProgress: p.recruitmentProgress || null,
                    concatenate: p.concatenate || null,
                    country: p.country || null,
                    city: p.city || null,
                    positionId: p.id,
                    isHistory: false
                });
            });

            closedCampaigns.forEach(h => {
                const lobName = h.openingName || '';
                const lobUpper = lobName.toUpperCase();
                if (lobUpper === 'GENERAL AGENT' || lobUpper.includes('QUOTA') || lobUpper === dept.name.toUpperCase() || !h.openingName) {
                    return;
                }

                const start = h.startDate || '2026-06-01';

                // Skip if date range does not match
                const startMs = new Date(start).getTime();
                if (excelFilterStart && excelFilterStart.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const filterStartMs = new Date(`${excelFilterStart}T00:00:00`).getTime();
                    if (!isNaN(filterStartMs) && !isNaN(startMs) && startMs < filterStartMs) return;
                }
                if (excelFilterEnd && excelFilterEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const filterEndMs = new Date(`${excelFilterEnd}T23:59:59`).getTime();
                    if (!isNaN(filterEndMs) && !isNaN(startMs) && startMs > filterEndMs) return;
                }

                const dateObj = new Date(start);
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' }) || 'June';

                const day = dateObj.getDay();
                const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(dateObj.setDate(diff));
                const weekStartStr = `${monday.getMonth() + 1}/${monday.getDate()}/${monday.getFullYear()}`;

                const formattedStart = `${new Date(start).getMonth() + 1}/${new Date(start).getDate()}/${new Date(start).getFullYear()}`;

                const trainingStart = h.trainingStartDate || '';
                const formattedTrainingStart = trainingStart ? `${new Date(trainingStart).getMonth() + 1}/${new Date(trainingStart).getDate()}/${new Date(trainingStart).getFullYear()}` : 'N/A';

                rows.push({
                    month: monthName,
                    weekStart: weekStartStr,
                    startDate: formattedStart,
                    trainingStartDate: formattedTrainingStart,
                    client: dept.name,
                    clientImageUrl: dept.accountImageUrl || null,
                    clientImageData: dept.accountImageData || null,
                    lob: lobName,
                    internalExternal: h.hiringType === 'Non-Billed' ? 'External' : 'Internal',
                    hiringRequestId: h.hiringQuotaId || (h.id && String(h.id).includes('-') ? String(h.id).split('-')[0] : String(h.id)),
                    requirement: h.quota,
                    jobOffers: h.hiredCount + h.failedCount,
                    fallout: h.failedCount,
                    activeHires: h.hiredCount,
                    balance: Math.max(0, h.quota - h.hiredCount),
                    day1ShowUp: h.hiredCount,
                    manualJobOffers: h.manualJobOffers || null,
                    manualFallout: h.manualFallout || null,
                    manualActiveHires: h.manualActiveHires || null,
                    manualBalance: h.manualBalance || null,
                    manualDay1ShowUp: h.manualDay1ShowUp || null,
                    salaryMatrixCategory: null, // History schema not updated yet, will be null for now
                    classType: null,
                    rosterDate: null,
                    hiringReqHc: null,
                    totalOffersExtended: null,
                    netHiresInternal: null,
                    netHiresExternal: null,
                    joBalance: null,
                    notes: h.notes || null,
                    requester: h.requesterName || null,
                    recruitmentProgress: h.recruitmentProgress || null,
                    concatenate: h.concatenate || null,
                    country: h.country || null,
                    city: h.city || null,
                    positionId: h.id,
                    isHistory: true
                });
            });
        });

        // Compute slicer unique values (before filtering)
        const slicerKeys: (keyof ExcelRow)[] = ['month', 'client', 'lob', 'internalExternal', 'requirement', 'jobOffers', 'balance'];
        const slicerOptions: Record<string, string[]> = {};
        slicerKeys.forEach(k => {
            const vals = Array.from(new Set(rows.map(r => String(r[k] ?? '')))).filter(Boolean).sort();
            slicerOptions[k] = vals;
        });

        // Filter rows based on slicer selection
        const filteredRows = rows.filter(r => {
            for (const [k, activeVals] of Object.entries(slicerFilters)) {
                if (activeVals.length > 0) {
                    if (!activeVals.includes(String(r[k as keyof ExcelRow] ?? ''))) {
                        return false;
                    }
                }
            }
            return true;
        });

        // Group filtered rows by week start
        const groups: Record<string, ExcelRow[]> = {};
        filteredRows.forEach(r => {
            if (!groups[r.weekStart]) {
                groups[r.weekStart] = [];
            }
            groups[r.weekStart].push(r);
        });

        // Sort week starts chronologically
        const sortedWeeks = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        // Group filtered rows by client
        const clientGroups: Record<string, ExcelRow[]> = {};
        filteredRows.forEach(r => {
            if (!clientGroups[r.client]) {
                clientGroups[r.client] = [];
            }
            clientGroups[r.client].push(r);
        });
        const sortedClients = Object.keys(clientGroups).sort((a, b) => a.localeCompare(b));

        // Sort items chronologically within groups
        Object.values(groups).forEach(arr => arr.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        Object.values(clientGroups).forEach(arr => arr.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

        return {
            groups,
            sortedWeeks,
            clientGroups,
            sortedClients,
            allRows: rows,
            filteredRows,
            slicerOptions
        };
    }, [departments, sortedAndFiltered, allPositions, allApplications, quotaHistory, excelFilterStart, excelFilterEnd, slicerFilters, weekStartDateFilter, trainingStartDateFilter]);

    const renderExcelColumnFilter = (key: string, label: string, options: string[]) => (
        <select
            value={(slicerFilters[key] || [])[0] || ''}
            onChange={(e) => {
                const val = e.target.value;
                setSlicerFilters(prev => ({
                    ...prev,
                    [key]: val ? [val] : []
                }));
            }}
            className="border border-slate-300 dark:border-slate-700 dark:border-slate-700 rounded text-xs px-2 py-1 outline-none text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 min-w-[120px] font-medium"
        >
            <option value="">{label}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );

    const getFillRateColor = (rate: number) => {
        if (rate >= 100) return 'text-emerald-600 font-extrabold';
        if (rate >= 50) return 'text-amber-500 font-extrabold';
        return 'text-rose-600 font-extrabold';
    };

    const getBalanceColor = (bal: number) => {
        if (bal > 0) return 'text-emerald-600 font-bold';
        if (bal < 0) return 'text-rose-600 font-bold';
        return 'font-medium';
    };

    const EditableCell = ({ value, type = 'text', options = [], onSave, className = '' }: any) => {
        const [isEditing, setIsEditing] = useState(false);
        const [val, setVal] = useState(value ?? '');

        useEffect(() => { setVal(value ?? ''); }, [value]);

        const handleBlur = (newVal?: any) => {
            setIsEditing(false);
            const finalVal = newVal !== undefined ? newVal : val;
            if (finalVal !== (value ?? '')) {
                onSave(type === 'number' ? (finalVal === '' ? null : Number(finalVal)) : finalVal);
            }
        };

        if (isEditing) {
            if (type === 'select') {
                return (
                    <select
                        className={`w-full bg-blue-50 border border-blue-400 outline-none text-black px-1 py-0.5 min-w-[60px] cursor-pointer ${className}`}
                        value={val}
                        onChange={e => {
                            setVal(e.target.value);
                            handleBlur(e.target.value);
                        }}
                        onBlur={() => handleBlur()}
                        autoFocus
                    >
                        <option value="">Select...</option>
                        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            }
            return (
                <input
                    type={type}
                    className={`w-full bg-blue-50 border border-blue-400 outline-none text-black px-1 py-0.5 min-w-[60px] ${className}`}
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onBlur={() => handleBlur()}
                    onKeyDown={e => e.key === 'Enter' && handleBlur()}
                    autoFocus
                />
            );
        }

        return (
            <div
                className={`cursor-pointer min-h-[20px] hover:bg-yellow-50 hover:ring-1 hover:ring-yellow-400 px-1 py-0.5 rounded transition-colors ${className}`}
                onClick={() => setIsEditing(true)}
                title="Click to edit"
            >
                {value ?? '-'}
            </div>
        );
    };

    const renderExcelData = (title: string, mode: 'week' | 'account') => {
        const data = excelData.filteredRows;
        let grandTotalReq = 0, grandTotalOffers = 0, grandTotalBalance = 0, grandTotalFallout = 0, grandTotalActiveHires = 0, grandTotalDay1ShowUp = 0;

        return (
            <div className="bg-white dark:bg-slate-900 border-x border-b border-slate-300 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#294365] text-white text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap w-10 text-center"><input type="checkbox" className="rounded-sm" /></th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">COUNTRY</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">CITY</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">MONTH</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">WEEK START</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">START DATE</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">TRAINING START DATE</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">CLIENT</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">LOB</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap">INTERNAL/EXTERNAL</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right">HC REQ</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">JOB OFFERS</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">FALLOUT</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">ACTIVE HIRES</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">JO BALANCE</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">DAY 1 SHOW UP</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap text-right bg-blue-900/30">FILL RATE %</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">SALARY MATRIX</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">CLASS TYPE</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">ROSTER DATE</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30 text-right">HIRING REQ HC</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30 text-right">TOTAL OFFERS EXTENDED</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30 text-right">NET HIRES INTERNAL</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30 text-right">NET HIRES EXTERNAL</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">NOTES</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">REQUESTER</th>
                                <th className="px-3 py-3 border-r border-[#3a567a] whitespace-nowrap bg-blue-900/30">RECRUITMENT PROGRESS</th>
                                <th className="px-3 py-3 whitespace-nowrap bg-blue-900/30">CONCATENATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length > 0 ? (() => {
                                const rows: React.ReactElement[] = [];
                                const monthGroups: Record<string, typeof data> = {};
                                data.forEach(r => { if (!monthGroups[r.month]) monthGroups[r.month] = []; monthGroups[r.month].push(r); });

                                Object.entries(monthGroups).forEach(([month, monthData]) => {
                                    let monthReq = 0, monthOffers = 0, monthFallout = 0, monthActiveHires = 0, monthBal = 0, monthDay1ShowUp = 0;
                                    const weekGroups: Record<string, typeof data> = {};
                                    monthData.forEach(r => { if (!weekGroups[r.weekStart]) weekGroups[r.weekStart] = []; weekGroups[r.weekStart].push(r); });

                                    Object.entries(weekGroups).forEach(([weekStart, weekData]) => {
                                        let weekReq = 0, weekOffers = 0, weekFallout = 0, weekActiveHires = 0, weekBal = 0, weekDay1ShowUp = 0;

                                        weekData.forEach((row, i) => {
                                            const jo = Number(row.manualJobOffers ?? row.jobOffers) || 0;
                                            const fallout = Number(row.manualFallout ?? row.fallout) || 0;
                                            const activeHires = Number(row.manualActiveHires ?? row.activeHires) || 0;
                                            const balance = Number(row.manualBalance ?? row.balance) || 0;
                                            const day1ShowUp = Number(row.manualDay1ShowUp ?? row.day1ShowUp) || 0;

                                            weekReq += Number(row.requirement) || 0;
                                            weekOffers += jo;
                                            weekFallout += fallout;
                                            weekActiveHires += activeHires;
                                            weekBal += balance;
                                            weekDay1ShowUp += day1ShowUp;

                                            rows.push(
                                                <tr key={`${row.positionId}-${month}-${weekStart}-${i}`} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 group">
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-center"><input type="checkbox" className="rounded-sm border-slate-300 dark:border-slate-700 dark:border-slate-700" /></td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                        <EditableCell type="select" options={Object.keys(PLACES)} value={row.country} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'country', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                        <EditableCell type="select" options={row.country && PLACES[row.country] ? PLACES[row.country] : []} value={row.city} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'city', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-semibold">{row.month}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-semibold">{row.weekStart}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800">{row.startDate}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800">{row.trainingStartDate}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 flex items-center gap-2">
                                                        {row.clientImageUrl ? <img src={row.clientImageUrl} alt="" className="w-4 h-4 rounded-full object-cover" /> : null}
                                                        {row.client}
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{row.lob}</span>
                                                            {row.isHistory && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider not-italic shadow-sm">Concluded</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                        <EditableCell type="select" options={['Internal', 'External', 'Internal/External']} value={row.internalExternal} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'internal_external', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium text-right">{row.requirement}</td>

                                                    {/* Editable Columns */}
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent">
                                                        <EditableCell type="number" value={jo} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'manual_job_offers', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent">
                                                        <EditableCell type="number" value={fallout} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'manual_fallout', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent">
                                                        <EditableCell type="number" value={activeHires} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'manual_active_hires', v)} />
                                                    </td>
                                                    <td className={cn("px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent", getBalanceColor(balance))}>
                                                        <EditableCell type="number" value={balance} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'manual_balance', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent">
                                                        <EditableCell type="number" value={day1ShowUp} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'manual_day_1_show_up', v)} />
                                                    </td>

                                                    <td className={cn("px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/10 min-w-[70px]", row.requirement > 0 ? getFillRateColor(Math.round((activeHires / row.requirement) * 100)) : '')}>
                                                        {row.requirement > 0 ? Math.round((activeHires / row.requirement) * 100) + '%' : '-'}
                                                    </td>

                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                        <EditableCell value={row.salaryMatrixCategory} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'salary_matrix_category', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[100px]">
                                                        <EditableCell type="select" options={['Growth', 'Attrition']} value={row.classType} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'class_type', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[100px]">
                                                        <EditableCell type="date" value={row.rosterDate} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'roster_date', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent min-w-[60px]">
                                                        <EditableCell type="number" value={row.hiringReqHc} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'hiring_req_hc', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent min-w-[60px]">
                                                        <EditableCell type="number" value={row.totalOffersExtended} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'total_offers_extended', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent min-w-[60px]">
                                                        <EditableCell type="number" value={row.netHiresInternal} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'net_hires_internal', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 text-right bg-blue-50/30 group-hover:bg-transparent min-w-[60px]">
                                                        <EditableCell type="number" value={row.netHiresExternal} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'net_hires_external', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[150px]">
                                                        <EditableCell value={row.notes} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'notes', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                        <EditableCell value={row.requester} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'requester', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-800 bg-blue-50/30 group-hover:bg-transparent min-w-[150px]">
                                                        <EditableCell value={row.recruitmentProgress} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'recruitment_progress', v)} />
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 bg-blue-50/30 group-hover:bg-transparent min-w-[150px]">
                                                        <EditableCell value={row.concatenate} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'concatenate', v)} />
                                                    </td>
                                                </tr>
                                            );
                                        });

                                        monthReq += weekReq; monthOffers += weekOffers; monthFallout += weekFallout; monthActiveHires += weekActiveHires; monthBal += weekBal; monthDay1ShowUp += weekDay1ShowUp;

                                        rows.push(
                                            <tr key={`week-total-${month}-${weekStart}`} className="bg-sky-100 border-b-2 border-sky-300 text-[11px] font-bold text-sky-900">
                                                <td colSpan={4} className="border-r border-sky-300"></td>
                                                <td colSpan={6} className="px-3 py-2.5 border-r border-sky-300 text-center font-extrabold text-sky-800">{weekStart} Total</td>
                                                <td className="px-3 py-2.5 border-r border-sky-300 text-right">{weekReq}</td>
                                                <td className="px-3 py-2.5 border-r border-sky-300 text-right">{weekOffers}</td>
                                                <td className="px-3 py-2.5 border-r border-sky-300 text-right">{weekFallout}</td>
                                                <td className="px-3 py-2.5 border-r border-sky-300 text-right">{weekActiveHires}</td>
                                                <td className={cn("px-3 py-2.5 border-r border-sky-300 text-right", getBalanceColor(weekBal))}>{weekBal}</td>
                                                <td className="px-3 py-2.5 border-r border-sky-300 text-right">{weekDay1ShowUp}</td>
                                                <td className={cn("px-3 py-2.5 border-r border-sky-300 text-right", weekReq > 0 ? getFillRateColor(Math.round((weekActiveHires / weekReq) * 100)) : 'text-sky-900')}>{weekReq > 0 ? Math.round((weekActiveHires / weekReq) * 100) + '%' : '-'}</td>
                                                {Array.from({ length: 11 }).map((_, idx) => <td key={idx} className="border-r border-sky-300"></td>)}
                                            </tr>
                                        );
                                    });

                                    grandTotalReq += monthReq; grandTotalOffers += monthOffers; grandTotalFallout += monthFallout; grandTotalActiveHires += monthActiveHires; grandTotalBalance += monthBal; grandTotalDay1ShowUp += monthDay1ShowUp;

                                    rows.push(
                                        <tr key={`month-total-${month}`} className="bg-violet-100 border-b-2 border-violet-300 text-[11px] font-bold text-violet-900">
                                            <td colSpan={3} className="border-r border-violet-300"></td>
                                            <td className="px-3 py-3 border-r border-violet-300 font-extrabold text-violet-800">{month}</td>
                                            <td colSpan={6} className="px-3 py-3 border-r border-violet-300 text-center font-extrabold text-violet-800">{month} Total</td>
                                            <td className="px-3 py-3 border-r border-violet-300 text-right">{monthReq}</td>
                                            <td className="px-3 py-3 border-r border-violet-300 text-right">{monthOffers}</td>
                                            <td className="px-3 py-3 border-r border-violet-300 text-right">{monthFallout}</td>
                                            <td className="px-3 py-3 border-r border-violet-300 text-right">{monthActiveHires}</td>
                                            <td className={cn("px-3 py-3 border-r border-violet-300 text-right", getBalanceColor(monthBal))}>{monthBal}</td>
                                            <td className="px-3 py-3 border-r border-violet-300 text-right">{monthDay1ShowUp}</td>
                                            <td className={cn("px-3 py-3 border-r border-violet-300 text-right", monthReq > 0 ? getFillRateColor(Math.round((monthActiveHires / monthReq) * 100)) : 'text-violet-900')}>{monthReq > 0 ? Math.round((monthActiveHires / monthReq) * 100) + '%' : '-'}</td>
                                            {Array.from({ length: 11 }).map((_, idx) => <td key={idx} className="border-r border-violet-300"></td>)}
                                        </tr>
                                    );
                                });

                                rows.push(
                                    <tr key="grand-total" className="bg-[#1b3356] text-white text-[12px] font-bold tracking-wider border-t-2 border-[#3a567a]">
                                        <td colSpan={3} className="border-r border-[#3a567a]"></td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a]">Grand Total</td>
                                        <td colSpan={6} className="px-3 py-3.5 border-r border-[#3a567a] text-center">Grand Total</td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a] text-right">{grandTotalReq}</td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a] text-right">{grandTotalOffers}</td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a] text-right">{grandTotalFallout}</td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a] text-right">{grandTotalActiveHires}</td>
                                        <td className={cn("px-3 py-3.5 border-r border-[#3a567a] text-right", getBalanceColor(grandTotalBalance))}>{grandTotalBalance}</td>
                                        <td className="px-3 py-3.5 border-r border-[#3a567a] text-right">{grandTotalDay1ShowUp}</td>
                                        <td className={cn("px-3 py-3.5 border-r border-[#3a567a] text-right bg-[#1b3356]", grandTotalReq > 0 ? getFillRateColor(Math.round((grandTotalActiveHires / grandTotalReq) * 100)).replace('text-', 'text-').replace('text-emerald-600', 'text-emerald-400').replace('text-amber-500', 'text-amber-400').replace('text-rose-600', 'text-rose-400') : 'text-white')}>{grandTotalReq > 0 ? Math.round((grandTotalActiveHires / grandTotalReq) * 100) + '%' : '-'}</td>
                                        {Array.from({ length: 11 }).map((_, idx) => <td key={idx} className="border-r border-[#3a567a]"></td>)}
                                    </tr>
                                );
                                return rows;
                            })() : (
                                <tr><td colSpan={28} className="px-6 py-12 text-center text-slate-400 font-medium italic">No records found matching the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderEodReport = () => {
        const data = excelData.filteredRows;
        return (
            <div className="w-full bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max border-collapse border border-slate-300 dark:border-slate-700 dark:border-slate-700">
                        <thead className="bg-[#1e3a5f]">
                            <tr>
                                <th colSpan={14} className="text-white text-center py-2 text-sm font-bold uppercase tracking-wider">EOD REPORT</th>
                            </tr>
                            <tr className="bg-[#233f63] text-white text-[10px] font-bold uppercase tracking-wider">
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-left">START DATE</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-left">CLIENT</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-left">LOB</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-left">Internal/External</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-left">HIRING REQUEST ID</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">REQUIREMENT</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">Sum of TOTAL OFFERS EXTENDED</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">Sum of TOTAL JOB OFFERS (ACCEPTED)</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">FALLOUT</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">ACTIVE HIRES</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">BALANCE</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">ACTIVE HIRES VS REQUIRED</th>
                                <th className="px-3 py-2 border-r border-[#3a567a] whitespace-nowrap text-right">DAY 1 SHOW UP</th>
                                <th className="px-3 py-2 whitespace-nowrap text-right">OVERALL FILL RATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length > 0 ? (() => {
                                const rows: React.ReactElement[] = [];

                                const weekGroups: Record<string, typeof data> = {};
                                data.forEach(r => {
                                    if (!weekGroups[r.weekStart]) weekGroups[r.weekStart] = [];
                                    weekGroups[r.weekStart].push(r);
                                });

                                const sortedWeekEntries = Object.entries(weekGroups).sort(([a], [b]) => {
                                    const da = new Date(a).getTime(), db = new Date(b).getTime();
                                    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
                                });

                                let gReq = 0, gOffersExt = 0, gJobOffers = 0, gFallout = 0, gActive = 0, gBal = 0, gDay1 = 0;

                                sortedWeekEntries.forEach(([weekStart, weekData]) => {
                                    let wReq = 0, wOffersExt = 0, wJobOffers = 0, wFallout = 0, wActive = 0, wBal = 0, wDay1 = 0;

                                    weekData.forEach((row, i) => {
                                        const req = Number(row.requirement) || 0;
                                        const offersExt = Number(row.totalOffersExtended) || 0;
                                        const jo = Number(row.manualJobOffers ?? row.jobOffers) || 0;
                                        const fallout = Number(row.manualFallout ?? row.fallout) || 0;
                                        const activeHires = Number(row.manualActiveHires ?? row.activeHires) || 0;
                                        const balance = Number(row.manualBalance ?? row.balance) || 0;
                                        const day1 = Number(row.manualDay1ShowUp ?? row.day1ShowUp) || 0;

                                        wReq += req;
                                        wOffersExt += offersExt;
                                        wJobOffers += jo;
                                        wFallout += fallout;
                                        wActive += activeHires;
                                        wBal += balance;
                                        wDay1 += day1;

                                        const activeVsReq = req > 0 ? Math.round((activeHires / req) * 100) + '%' : '0%';
                                        const overallFillRate = req > 0 ? Math.round((day1 / req) * 100) + '%' : '0%';

                                        rows.push(
                                            <tr key={`eod-${row.positionId}-${i}`} className={cn(
                                                "border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 transition-colors",
                                                i % 2 === 0 ? "bg-[#f2f8fc]" : "bg-white dark:bg-slate-900",
                                                row.isHistory ? "italic text-slate-500 dark:text-slate-400 dark:text-slate-400" : ""
                                            )}>
                                                <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-left">{row.startDate}</td>
                                                <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-left font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        {row.clientImageUrl ? <img src={row.clientImageUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" /> : null}
                                                        {row.client}
                                                    </div>
                                                </td>
                                                <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-left">{row.lob}</td>
                                                <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-left bg-blue-50/30 group-hover:bg-transparent min-w-[120px]">
                                                    <EditableCell type="select" options={['Internal', 'External', 'Internal/External']} value={row.internalExternal} onSave={(v: any) => handleCellSave(row.positionId, row.isHistory, 'internal_external', v)} />
                                                </td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-left">{row.hiringRequestId}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{req}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{offersExt}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{jo}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{fallout}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{activeHires}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{balance}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-semibold">{activeVsReq}</td>
                                                <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right">{day1}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold">{overallFillRate}</td>
                                            </tr>
                                        );
                                    });

                                    gReq += wReq;
                                    gOffersExt += wOffersExt;
                                    gJobOffers += wJobOffers;
                                    gFallout += wFallout;
                                    gActive += wActive;
                                    gBal += wBal;
                                    gDay1 += wDay1;

                                    const wActiveVsReq = wReq > 0 ? Math.round((wActive / wReq) * 100) + '%' : '0%';
                                    const wOverallFill = wReq > 0 ? Math.round((wDay1 / wReq) * 100) + '%' : '0%';

                                    rows.push(
                                        <tr key={`eod-week-subtotal-${weekStart}`} className="bg-indigo-100 border-b-2 border-indigo-300 text-[11px] font-bold text-indigo-900">
                                            <td colSpan={4} className="border-r border-indigo-300 px-3 py-2 text-right font-bold text-indigo-700">{weekStart} Total</td>
                                            <td className="border-r border-indigo-300"></td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wReq}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wOffersExt}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wJobOffers}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wFallout}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wActive}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wBal}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right font-extrabold text-emerald-700">{wActiveVsReq}</td>
                                            <td className="px-3 py-2 border-r border-indigo-300 text-right">{wDay1}</td>
                                            <td className="px-3 py-2 text-right font-extrabold text-emerald-700">{wOverallFill}</td>
                                        </tr>
                                    );
                                });

                                const gActiveVsReq = gReq > 0 ? Math.round((gActive / gReq) * 100) + '%' : '0%';
                                const gOverallFill = gReq > 0 ? Math.round((gDay1 / gReq) * 100) + '%' : '0%';

                                rows.push(
                                    <tr key="eod-grand-total" className="bg-[#1e3a5f] border-t-2 border-[#3a567a] text-[12px] font-bold text-white tracking-wide">
                                        <td colSpan={4} className="border-r border-[#3a567a] px-3 py-3 text-right font-extrabold text-blue-200">Grand Total</td>
                                        <td className="border-r border-[#3a567a]"></td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gReq}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gOffersExt}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gJobOffers}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gFallout}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gActive}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gBal}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right font-extrabold text-emerald-400">{gActiveVsReq}</td>
                                        <td className="px-3 py-3 border-r border-[#3a567a] text-right">{gDay1}</td>
                                        <td className="px-3 py-3 text-right font-extrabold text-emerald-400">{gOverallFill}</td>
                                    </tr>
                                );

                                return rows;
                            })() : (
                                <tr><td colSpan={14} className="px-6 py-12 text-center text-slate-400 font-medium italic">No records found matching the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    const renderWeekView = () => renderExcelData('WEEK VIEW DATASHEET', 'week');
    const renderAccountView = () => renderExcelData('MONTH VIEW DATASHEET', 'account');

    return (
        <div className="space-y-6 text-left w-full bg-neutral-100 dark:bg-neutral-950 p-6 md:p-8 min-h-screen border-l border-neutral-200 dark:border-neutral-800">
            {/* Account Management Executive Header */}
            {!hideHeader ? (
                <div className="bg-black text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-neutral-800">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">Account Registry</h1>
                                <span className="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-full tracking-wide">
                                    {accountStats.total} ACCOUNTS
                                </span>
                            </div>
                            <p className="text-sm text-neutral-400 font-medium mt-1">
                                Manage recruitment quotas, department allocations, and analyze target performance metrics.
                            </p>
                        </div>

                        {/* Top Controls Container */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Format Switcher Pill */}
                            <div className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl flex items-center shadow-inner">
                                <button
                                    onClick={() => setViewFormat('webapp')}
                                    className={cn(
                                        "px-3.5 py-2 text-xs font-bold tracking-wide rounded-lg transition-all flex items-center gap-2 cursor-pointer border-0 outline-none",
                                        viewFormat === 'webapp'
                                            ? "bg-white text-black shadow-md"
                                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                >
                                    <Building2 size={15} />
                                    <span>Web App</span>
                                </button>
                                <button
                                    onClick={() => setViewFormat('excel')}
                                    className={cn(
                                        "px-3.5 py-2 text-xs font-bold tracking-wide rounded-lg transition-all flex items-center gap-2 cursor-pointer border-0 outline-none",
                                        viewFormat === 'excel'
                                            ? "bg-white text-black shadow-md"
                                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                >
                                    <FileSpreadsheet size={15} />
                                    <span>Excel View</span>
                                </button>
                            </div>

                            {/* Search Input Field */}
                            <div className="relative shrink-0 flex items-center group">
                                <Search size={16} strokeWidth={2.2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-white transition-colors pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search accounts..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-[200px] sm:w-[240px] focus:w-[270px] pl-10 pr-4 h-11 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-medium text-white placeholder:text-neutral-400 focus:border-white focus:ring-2 focus:ring-white/20 outline-none transition-all shadow-inner"
                                />
                            </div>

                            {/* Register New Account Button */}
                            <motion.button
                                whileHover={{ scale: 1.02, translateY: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setEditingId(null); setForm({ name: '', head: '', budget_code: '', type: activeMainTab }); setModal(true); }}
                                className="flex items-center gap-2 px-5 h-11 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl shadow-lg transition-all text-xs tracking-wide cursor-pointer shrink-0 border-0"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                <span>Register New Account</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Account Registry</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Manage account pipelines and quotas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/50 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-800/80">
                            <button
                                onClick={() => setViewFormat('webapp')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0",
                                    viewFormat === 'webapp' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                                )}
                            >
                                Web App
                            </button>
                            <button
                                onClick={() => setViewFormat('excel')}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0",
                                    viewFormat === 'excel' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                                )}
                            >
                                Excel View
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setEditingId(null); setForm({ name: '', head: '', budget_code: '', type: activeMainTab }); setModal(true); }}
                            className="flex items-center gap-1.5 px-4 h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all border-0 cursor-pointer"
                        >
                            <Plus size={15} /> Register New Account
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Navigation Tabs & Granular Filters Bar */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Main Tabs (Accounts / Support Role / Job Positions) */}
                {viewFormat === 'webapp' && (
                    <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto">
                        <button
                            onClick={() => { setActiveMainTab('ACCOUNTS'); setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-0 outline-none",
                                activeMainTab === 'ACCOUNTS'
                                    ? "bg-black text-white shadow-sm font-extrabold"
                                    : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                        >
                            <Building2 size={15} />
                            <span>Accounts</span>
                            <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full",
                                activeMainTab === 'ACCOUNTS' ? "bg-white text-black" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                            )}>
                                {(departments || []).filter(d => !isSupportDept(d) && d.name.toUpperCase() !== 'PENDING').length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setActiveMainTab('SUPPORT_ROLES'); setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-0 outline-none",
                                activeMainTab === 'SUPPORT_ROLES'
                                    ? "bg-black text-white shadow-sm font-extrabold"
                                    : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                        >
                            <Users size={15} />
                            <span>Support Hiring Roles</span>
                            <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full",
                                activeMainTab === 'SUPPORT_ROLES' ? "bg-white text-black" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                            )}>
                                {(departments || []).filter(d => isSupportDept(d)).length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setActiveMainTab('LOBS'); setActiveAccountTab('ALL'); setHiringTypeFilter('ALL'); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-0 outline-none",
                                activeMainTab === 'LOBS'
                                    ? "bg-black text-white shadow-sm font-extrabold"
                                    : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            )}
                        >
                            <Network size={15} />
                            <span>Job Positions</span>
                        </button>
                    </div>
                )}

            </div>



            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none text-left">
                    <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-medium text-[#605e5c] dark:text-slate-400 dark:text-slate-400">Loading Pipeline...</p>
                </div>
            ) : viewFormat === 'webapp' ? (
                <div className={cn(
                    viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4"
                        : "flex flex-col border border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-[#edebe9]"
                )}>
                    {(activeMainTab === 'LOBS' ? lobCards : sortedAndFiltered).map((dept) => (
                        <AccountCard
                            key={`${dept.id}-${dept.name}`}
                            dept={dept as AccountCardDept}
                            viewMode={viewMode}
                            onSelect={(d) => {
                                if (activeMainTab === 'LOBS' && (d as any)._lobName) {
                                    const parentDept = departments.find(dept => dept.name === (d as any)._parentDeptName);
                                    if (parentDept) setSelectedAccount(parentDept);
                                    setSelectedLOBCard({ lobName: (d as any)._lobName, parentDeptName: (d as any)._parentDeptName });
                                } else {
                                    setSelectedAccount(d);
                                    setDashboardModal(true);
                                }
                            }}
                            onEdit={handleEditClick}
                            onDelete={(d) => setDelConfirm(d)}
                        />
                    ))}
                </div>
            ) : (
                /* EXCEL Format Sheet View */
                <div className="bg-[#f4f7f9] dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-none shadow-xs overflow-hidden">
                    <div className="bg-black border-b border-neutral-800 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                <FileSpreadsheet size={13} className="text-white" /> {excelViewMode === 'eod' ? 'EOD REPORT DATASHEET' : excelViewMode === 'week' ? 'WEEK VIEW DATASHEET' : 'GENERAL VIEW DATASHEET'}
                            </span>
                            <div className="flex items-center bg-neutral-900 rounded-none p-0.5 border border-neutral-800">
                                <button
                                    onClick={() => setExcelViewMode('account')}
                                    className={cn(
                                        "px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-none transition-colors",
                                        excelViewMode === 'account' ? "bg-white text-black font-extrabold" : "text-neutral-400 hover:text-white"
                                    )}
                                >
                                    General View
                                </button>
                                <button
                                    onClick={() => setExcelViewMode('week')}
                                    className={cn(
                                        "px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-none transition-colors",
                                        excelViewMode === 'week' ? "bg-white text-black font-extrabold" : "text-neutral-400 hover:text-white"
                                    )}
                                >
                                    Week View
                                </button>
                                <button
                                    onClick={() => setExcelViewMode('eod')}
                                    className={cn(
                                        "px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-none transition-colors",
                                        excelViewMode === 'eod' ? "bg-white text-black font-extrabold" : "text-neutral-400 hover:text-white"
                                    )}
                                >
                                    EOD Report
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    // Trigger add quota for first client or reset for dialog
                                    if (sortedAndFiltered.length > 0) {
                                        setSelectedAccount(sortedAndFiltered[0]);
                                        setEditingPositionId(null);
                                        setQuotaForm(0);
                                        setQuotaManualHired(0);
                                        setQuotaStartDate('');
                                        setQuotaEndDate('');
                                        setQuotaHiringType('Internal/External');
                                        setQuotaTrainingStartDate('');
                                        setQuotaHiringQuotaId('');
                                        setQuotaOpeningName('');
                                        setQuotaManualJobOffers('');
                                        setQuotaManualFallout('');
                                        setQuotaManualBalance('');
                                        setQuotaManualDay1ShowUp('');
                                        setQuotaModal(true);
                                    }
                                }}
                                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-none text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={12} /> ADD QUOTA
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx, .xls, .csv"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                onClick={(e) => {
                                    console.log("Input element clicked!");
                                    (e.target as HTMLInputElement).value = '';
                                }}
                            />
                            <button
                                onClick={() => {
                                    console.log("Import Excel Data button clicked!");
                                    fileInputRef.current?.click();
                                }}
                                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-none text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={12} /> IMPORT EXCEL DATA
                            </button>

                            {selectedExcelRows.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-none text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 size={12} /> BULK DELETE ({selectedExcelRows.length})
                                </button>
                            )}

                            <span className="text-[10px] text-blue-200 font-bold ml-2">TOTAL CAMPAIGNS: {excelData.filteredRows.length}</span>
                        </div>
                    </div>

                    {/* Slicers Section */}
                    <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 dark:border-slate-700 p-3 overflow-visible w-full max-w-full">
                        <div className="flex flex-wrap items-start gap-3 w-full">
                            {Object.entries(excelData.slicerOptions).map(([slicerKey, options]) => {
                                const labels: Record<string, string> = {
                                    month: 'Month', weekStart: 'Week Start', client: 'Client', lob: 'LOB',
                                    internalExternal: 'Internal/External', requirement: 'HC REQ', jobOffers: 'Job Offers', balance: 'JO Balance'
                                };
                                const title = labels[slicerKey] || slicerKey;
                                const activeSelections = slicerFilters[slicerKey] || [];

                                return (
                                    <details key={slicerKey} className="relative inline-block group w-36 shrink-0">
                                        <summary className="flex items-center justify-between px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 dark:border-slate-700 rounded-none text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer list-none shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 active:scale-95 transition-all">
                                            <span className="truncate">{title} {activeSelections.length > 0 && `(${activeSelections.length})`}</span>
                                            <ChevronDown size={12} className="text-slate-400 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="dropdown-menu absolute z-50 left-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 dark:border-slate-700 rounded-none shadow-lg flex flex-col max-h-64 origin-top">
                                            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                                                <span className="text-[10px] font-bold text-slate-600">Select options</span>
                                                {activeSelections.length > 0 && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); setSlicerFilters(prev => ({ ...prev, [slicerKey]: [] })); }}
                                                        className="text-red-500 hover:text-red-700 text-[9px] uppercase font-bold"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            <div className="overflow-y-auto flex flex-col p-1 gap-[1px] custom-scrollbar">
                                                {options.map(opt => {
                                                    const isSelected = activeSelections.includes(opt);
                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2 py-1.5 text-[10.5px] font-medium rounded-none cursor-pointer transition-all active:scale-[0.98]",
                                                                isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                            )}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    setSlicerFilters(prev => {
                                                                        const curr = prev[slicerKey] || [];
                                                                        return {
                                                                            ...prev,
                                                                            [slicerKey]: isSelected ? curr.filter(x => x !== opt) : [...curr, opt]
                                                                        };
                                                                    });
                                                                }}
                                                                className="w-3 h-3 rounded-none border-slate-300 dark:border-slate-700 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="truncate">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    </div>
                    {excelViewMode === 'eod' ? renderEodReport() : excelViewMode === 'week' ? renderWeekView() : renderAccountView()}
                </div>
            )}

            {/* Quota Modal */}
            <Modal
                open={quotaModal}
                onClose={() => { setQuotaModal(false); resetQuotaForm(); }}
                title={selectedAccount ? `Manage Recruitment Quota — ${selectedAccount.name}` : 'Manage Recruitment Quota'}
                size="7xl"
            >
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-8">
                            {/* Section: Opening Details */}
                            <div className="space-y-4">
                                <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Opening Details</h5>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Opening Name / LOB</label>
                                        <select
                                            value={quotaOpeningName}
                                            onChange={e => setQuotaOpeningName(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                        >
                                            <option value="">Select LOB</option>
                                            {selectedAccount?.subAccounts?.map(lob => (
                                                <option key={lob.id} value={lob.name}>{lob.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Salary Matrix Cat</label>
                                        <input
                                            type="text" value={quotaSalaryMatrixCategory}
                                            onChange={e => setQuotaSalaryMatrixCategory(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Class Type</label>
                                        <select
                                            value={quotaClassType}
                                            onChange={e => setQuotaClassType(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                        >
                                            <option value="">Select Class Type</option>
                                            <option value="Growth">Growth</option>
                                            <option value="Attrition">Attrition</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Requester</label>
                                        <input
                                            type="text" value={quotaRequesterName}
                                            onChange={e => setQuotaRequesterName(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-8">
                            {/* Section: Quota Definition */}
                            <div className="space-y-4">
                                <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Quota Definition</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Requirement</label>
                                        <input
                                            type="number" min="0" value={quotaForm}
                                            onChange={e => setQuotaForm(parseInt(e.target.value) || 0)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[15px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Hiring Req HC (inc. Buffers)</label>
                                        <input
                                            type="number" min="0" value={quotaHiringReqHc}
                                            onChange={e => setQuotaHiringReqHc(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Internal/External</label>
                                        <select
                                            value={quotaHiringType}
                                            onChange={e => setQuotaHiringType(e.target.value)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none cursor-pointer"
                                        >
                                            <option value="Internal">Internal</option>
                                            <option value="External">External</option>
                                            <option value="Internal/External">Internal/External</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Active Hires</label>
                                        <input
                                            type="number" min="0" value={quotaManualHired}
                                            onChange={e => setQuotaManualHired(parseInt(e.target.value) || 0)}
                                            className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Timeline & Tracking */}
                            <div className="space-y-4 mt-2">
                                <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Timeline & Tracking</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Training Start Date</label>
                                        <div className="h-11">
                                            <CalendarDropdown
                                                value={quotaTrainingStartDate}
                                                onChange={setQuotaTrainingStartDate}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Roster Date</label>
                                        <div className="h-11">
                                            <CalendarDropdown
                                                value={quotaRosterDate}
                                                onChange={setQuotaRosterDate}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Hiring Request ID</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={quotaHiringQuotaId}
                                                onChange={e => setQuotaHiringQuotaId(e.target.value)}
                                                className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                                placeholder="e.g. Q-101"
                                            />
                                            <button
                                                onClick={() => setQuotaHiringQuotaId(prev => prev ? prev + ', ' : '')}
                                                title="Add another ID"
                                                className="h-11 w-11 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 text-[#605e5c] dark:text-slate-400 dark:text-slate-400 hover:bg-[#f3f2f1] transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* FULL WIDTH: Manual Overrides */}
                    <div className="space-y-4 mt-8 border-t border-[#edebe9] dark:border-slate-800 pt-6">
                        <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2">Manual Overrides (Optional)</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Total Offers Extended</label>
                                <input
                                    type="number" value={quotaTotalOffersExtended}
                                    onChange={e => setQuotaTotalOffersExtended(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Total Accepted Job Offers</label>
                                <input
                                    type="number" value={quotaManualJobOffers}
                                    onChange={e => setQuotaManualJobOffers(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Fallout</label>
                                <input
                                    type="number" value={quotaManualFallout}
                                    onChange={e => setQuotaManualFallout(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Net Hires Internal</label>
                                <input
                                    type="number" value={quotaNetHiresInternal}
                                    onChange={e => setQuotaNetHiresInternal(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Net Hires External</label>
                                <input
                                    type="number" value={quotaNetHiresExternal}
                                    onChange={e => setQuotaNetHiresExternal(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Balance (Net Hires)</label>
                                <input
                                    type="number" value={quotaManualBalance}
                                    onChange={e => setQuotaManualBalance(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">JO Balance</label>
                                <input
                                    type="number" value={quotaJoBalance}
                                    onChange={e => setQuotaJoBalance(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Day 1 Show Up</label>
                                <input
                                    type="number" value={quotaManualDay1ShowUp}
                                    onChange={e => setQuotaManualDay1ShowUp(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-11 px-4 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full mt-4">
                            <label className="block text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-2">Notes</label>
                            <textarea
                                value={quotaNotes}
                                onChange={e => setQuotaNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-[#8a8886] dark:border-slate-700 dark:border-slate-700 rounded-none text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 dark:text-slate-200 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none resize-none"
                                placeholder="Add any additional notes here..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#edebe9] dark:border-slate-800 text-left">
                        <button
                            onClick={() => { setQuotaModal(false); resetQuotaForm(); }}
                            className="h-10 px-6 bg-white dark:bg-slate-900 border border-[#c8c6c4] dark:border-slate-700 dark:border-slate-700 text-[13px] font-semibold text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] active:bg-[#edebe9] dark:bg-slate-800 rounded-none transition-all text-center"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => handleUpdateQuota()}
                            disabled={submitting || quotaForm <= 0 || (Boolean(quotaStartDate) && Boolean(quotaEndDate) && new Date(quotaEndDate) < new Date(quotaStartDate))}
                            className="h-10 min-w-44 px-6 bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-[13px] font-semibold rounded-none shadow-none transition-all text-center disabled:bg-[#c8c6c4] disabled:text-white disabled:cursor-not-allowed"
                        >
                            {accountDashboardData?.isActive ? 'Commit Changes' : 'Initialize Recruitment'}
                        </button>
                    </div>
                </div>
            </Modal>

            <AccountDashboardModal
                dashboardModal={dashboardModal}
                setDashboardModal={setDashboardModal}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                accountDashboardData={accountDashboardData}
                dashboardTab={dashboardTab}
                setDashboardTab={setDashboardTab}
                activePipelineFilter={activePipelineFilter}
                setActivePipelineFilter={setActivePipelineFilter}
                setQuotaHistoryDrilldown={setQuotaHistoryDrilldown}
                handleAccountImageUpload={handleAccountImageUpload}
                submitting={submitting}
                setQuotaForm={setQuotaForm}
                setQuotaManualHired={setQuotaManualHired}
                setQuotaStartDate={setQuotaStartDate}
                setQuotaEndDate={setQuotaEndDate}
                setQuotaHiringType={setQuotaHiringType}
                setQuotaTrainingStartDate={setQuotaTrainingStartDate}
                setQuotaHiringQuotaId={setQuotaHiringQuotaId}
                setQuotaCountry={setQuotaCountry}
                setQuotaCity={setQuotaCity}
                setQuotaRequesterName={setQuotaRequesterName}
                setQuotaRecruitmentProgress={setQuotaRecruitmentProgress}
                setQuotaConcatenate={setQuotaConcatenate}
                setQuotaModal={setQuotaModal}
                setCloseConfirm={setCloseConfirm}
                setCancelConfirm={setCancelConfirm}
                setQuotaOpeningName={setQuotaOpeningName}
                setEditingPositionId={setEditingPositionId}
                handleUpdateQuota={handleUpdateQuota}
                cancelledClasses={cancelledClasses}
                onDeleteCancelled={handleDeleteCancelledClass}
                todayInputValue={todayInputValue}
                toDateInputValue={toDateInputValue}
                getDurationLabel={getDurationLabel}
                loadData={loadData}
                allApplications={allApplications}
            />

            <LOBDashboardModal
                lob={selectedLOBCard ? { id: selectedLOBCard.lobName, name: selectedLOBCard.lobName } : null}
                onClose={() => setSelectedLOBCard(null)}
                accountDashboardData={accountDashboardData}
                allApplications={allApplications}
                departmentName={selectedLOBCard?.parentDeptName}
            />

            <QuotaHistoryModal
                quotaHistoryDrilldown={quotaHistoryDrilldown}
                setQuotaHistoryDrilldown={setQuotaHistoryDrilldown}
                quotaHistoryMetricLabels={quotaHistoryMetricLabels}
                getDurationLabel={getDurationLabel}
                toDateInputValue={toDateInputValue}
                quotaHistoryDrilldownApps={quotaHistoryDrilldownApps}
                getSeasonActivityDate={getSeasonActivityDate}
            />

            <AccountFormModal
                modal={modal}
                setModal={setModal}
                editingId={editingId}
                setEditingId={setEditingId}
                form={form}
                setForm={setForm}
                handleAddAccount={handleAddAccount}
                submitting={submitting}
            />

            <ConfirmDialog
                open={!!delConfirm}
                onClose={() => setDelConfirm(null)}
                onConfirm={handleDelete}
                title="Decommission Account"
                message={`Are you sure you want to permanently decommission "${delConfirm?.name}"? All associated internal analysis data will be lost.`}
            />

            <ConfirmDialog
                open={closeConfirm}
                onClose={() => setCloseConfirm(false)}
                onConfirm={() => handleUpdateQuota(0)}
                title="Cease Recruitment"
                message={`This action will save the current quota season for ${selectedAccount?.name} into Hiring Quota History and reset the active target to zero. Proceed?`}
            />

            <ConfirmDialog
                open={cancelConfirm}
                onClose={() => setCancelConfirm(false)}
                onConfirm={() => handleUpdateQuota(0, true)}
                title="Abort Recruitment Campaign"
                message={`Are you sure you want to cancel recruitment for ${selectedAccount?.name}? This will reset the active quota and start/end dates to zero/null WITHOUT archiving the season to history. This is ideal if the campaign was opened in error or aborted.`}
            />

            {/* Import Preview Modal */}
            <Modal
                open={!!importPreviewData}
                onClose={() => setImportPreviewData(null)}
                title="Preview Import Data"
                size="7xl"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-600">
                        Review the parsed data before importing. You can remove rows you don't want to import.
                    </p>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-none overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11.5px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                            <thead>
                                <tr className="bg-[#2c4c72] text-white text-[10px] font-bold uppercase tracking-wider border-b border-slate-400/40 text-center">
                                    <th rowSpan={2} className="px-3 py-2 text-left font-bold border-r border-slate-400/40">Action</th>
                                    <th rowSpan={2} className="px-3 py-2 text-left font-bold border-r border-slate-400/40">Week Start</th>
                                    <th rowSpan={2} className="px-3 py-2 text-left font-bold border-r border-slate-400/40">Client</th>
                                    <th rowSpan={2} className="px-3 py-2 text-left font-bold border-r border-slate-400/40">LOB</th>
                                    <th rowSpan={2} className="px-3 py-2 text-left font-bold border-r border-slate-400/40">Internal/External</th>
                                    <th colSpan={7} className="px-3 py-1 font-bold border-b border-slate-400/40 text-center">Week View</th>
                                </tr>
                                <tr className="bg-[#2c4c72] text-white text-[10px] font-bold uppercase tracking-wider text-center">
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-left">Hiring Request ID</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Requirement</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Job Offers</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Fallout</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Active Hires</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Balance</th>
                                    <th className="px-3 py-1 font-bold border-r border-slate-400/40 text-center">Day 1 Show Up</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {importPreviewData?.filter(r => r.isSelected)
                                    .sort((a, b) => a.client.localeCompare(b.client))
                                    .map((row, idx, arr) => {
                                        const showHeader = idx === 0 || row.client !== arr[idx - 1].client;
                                        return (
                                            <React.Fragment key={row.id}>
                                                {showHeader && (
                                                    <tr>
                                                        <td colSpan={12} className="bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 text-left text-[11px] uppercase tracking-wider border-y border-slate-300 dark:border-slate-700 dark:border-slate-700">
                                                            {row.client}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className="hover:bg-blue-50/50 transition-colors text-center group">
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-left border-r border-slate-100 align-middle">
                                                        <button
                                                            onClick={() => {
                                                                setImportPreviewData(prev =>
                                                                    prev ? prev.map(r => r.id === row.id ? { ...r, isSelected: false } : r) : null
                                                                );
                                                            }}
                                                            className="text-red-400 hover:text-red-600 transition-colors flex flex-col items-center justify-center gap-1 group-hover:scale-105"
                                                        >
                                                            <List size={14} className="rotate-45" />
                                                            <span className="text-[9px] uppercase font-bold">Remove</span>
                                                        </button>
                                                    </td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-100 align-middle">{row.weekStart}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-left font-bold border-r border-slate-100 align-middle">{row.client}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-left border-r border-slate-100 align-middle font-semibold">{row.lob}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-left text-slate-500 dark:text-slate-400 dark:text-slate-400 border-r border-slate-100 align-middle">{row.isInternal ? 'Internal' : 'External'}</td>

                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-left border-r border-slate-100 align-middle font-mono text-[10.5px]">{row.reqId}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 border-r border-slate-100 align-middle text-center">{row.req ?? 0}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-blue-600 font-bold border-r border-slate-100 align-middle">{row.offers ?? 0}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-red-500 font-bold border-r border-slate-100 align-middle">{row.fallout ?? 0}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 text-green-600 font-bold border-r border-slate-100 align-middle">{row.activeHires ?? 0}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 font-bold border-r border-slate-100 align-middle">{row.balance ?? 0}</td>
                                                    <td className="transition-all hover:scale-110 hover:shadow-xl hover:z-[100] relative duration-300 ease-out hover:bg-white dark:bg-slate-900 px-3 py-2 font-bold border-r border-slate-100 align-middle">{row.showUp ?? 0}</td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                {(!importPreviewData || importPreviewData.filter(r => r.isSelected).length === 0) && (
                                    <tr>
                                        <td colSpan={12} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                            No rows selected for import.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
                        <button
                            onClick={() => setImportPreviewData(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:bg-slate-700 rounded-none transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeImport}
                            disabled={!importPreviewData?.length}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-none transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <FileSpreadsheet size={16} /> Confirm & Import {importPreviewData?.length} Rows
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Import Progress Modal */}
            <Modal
                open={!!importProgress}
                onClose={() => { }} // Prevent closing while processing
                title="Importing Data"
                size="md"
            >
                <div className="flex flex-col gap-6 py-4">
                    <div className="text-center">
                        <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Processing Your Excel Data</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Please wait while we set up your clients and quotas.</p>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/50 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%` }}
                        />
                    </div>

                    <div className="text-center font-mono text-sm text-slate-600">
                        {importProgress?.current} / {importProgress?.total} Rows Processed
                    </div>
                </div>
            </Modal>
        </div>
    );
}









