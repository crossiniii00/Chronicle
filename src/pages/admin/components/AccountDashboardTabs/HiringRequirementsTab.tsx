import React from 'react';
import { 
    List, ChevronUp, ChevronDown, Save, Settings, 
    Plus, Trash2, Edit2, AlertCircle, Users, SaveAll 
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { AccountDashboardData } from '../AccountDashboardModal';
import { MASTERLIST_COLUMNS, NOT_ELIGIBLE_COLUMNS } from '../../../recruiter/tracker/masterlist/constants';

interface HiringRequirementsTabProps {
    accountDashboardData: AccountDashboardData;
    localSettings: any;
    setLocalSettings: React.Dispatch<React.SetStateAction<any>>;
    STAGE_LABELS: Record<string, { label: string; desc: string }>;
    COLUMN_DROPDOWNS: Record<string, string[]>;
    STANDARD_FIELD_COLUMN_MAP: Record<string, string>;
    CRITERIA_ITEMS: Array<{ name: string; desc: string }>;
    moveStage: (idx: number, dir: 'up' | 'down') => void;
    toggleStageActive: (stageId: string) => void;
    handleSaveSettings: () => Promise<void>;
    savingSettings: boolean;
    isAddingRule: boolean;
    setIsAddingRule: (val: boolean) => void;
    ruleSource: 'masterlist' | 'interview';
    setRuleSource: (val: 'masterlist' | 'interview') => void;
    ruleColumn: string;
    setRuleColumn: (val: string) => void;
    ruleMatchingType: 'content' | 'na' | 'dropdown';
    setRuleMatchingType: (val: 'content' | 'na' | 'dropdown') => void;
    ruleMatchingValue: string;
    setRuleMatchingValue: (val: string) => void;
    ruleType: 'required' | 'optional';
    setRuleType: (val: 'required' | 'optional') => void;
    editingRuleId: string | null;
    setEditingRuleId: (val: string | null) => void;
    editingStandardField: string | null;
    setEditingStandardField: (val: string | null) => void;
    handleCriteriaChange: (fieldName: string, value: 'required' | 'optional' | 'disabled') => void;
    applicantsTab: 'ongoing' | 'hired';
    setApplicantsTab: (val: 'ongoing' | 'hired') => void;
}

export const HiringRequirementsTab: React.FC<HiringRequirementsTabProps> = ({
    accountDashboardData,
    localSettings,
    setLocalSettings,
    STAGE_LABELS,
    COLUMN_DROPDOWNS,
    STANDARD_FIELD_COLUMN_MAP,
    CRITERIA_ITEMS,
    moveStage,
    toggleStageActive,
    handleSaveSettings,
    savingSettings,
    isAddingRule,
    setIsAddingRule,
    ruleSource,
    setRuleSource,
    ruleColumn,
    setRuleColumn,
    ruleMatchingType,
    setRuleMatchingType,
    ruleMatchingValue,
    setRuleMatchingValue,
    ruleType,
    setRuleType,
    editingRuleId,
    setEditingRuleId,
    editingStandardField,
    setEditingStandardField,
    handleCriteriaChange,
    applicantsTab,
    setApplicantsTab
}) => {
    return (
        <div className="space-y-6 text-left">
            <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-left">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <List size={14} className="text-indigo-650" />
                        Application Process Configuration
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Customize active stages and sequences for candidate progression under this account</p>
                </div>

                <div className="p-5 space-y-4">
                    <div className="border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden divide-y divide-slate-100">
                        {(localSettings.processOrder || [
                            'TYPING_TEST',
                            'INITIAL_INTERVIEW',
                            'ACCOUNT_ASSIGNMENT',
                            'ASSESSMENT',
                            'CLIENT_ASSESSMENT',
                            'CLIENT_INTERVIEW'
                        ]).map((stageId: string, idx: number, arr: string[]) => {
                            const stageInfo = STAGE_LABELS[stageId] || { label: stageId, desc: '' };
                            const isActive = (localSettings.requiredProcesses || []).includes(stageId);

                            return (
                                <div key={stageId} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/40 transition-colors">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="flex flex-col gap-1 items-center">
                                            <button
                                                type="button"
                                                onClick={() => moveStage(idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-1 rounded-none hover:bg-slate-150 text-slate-450 hover:text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                                                title="Move stage up"
                                            >
                                                <ChevronUp size={14} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveStage(idx, 'down')}
                                                disabled={idx === arr.length - 1}
                                                className="p-1 rounded-none hover:bg-slate-150 text-slate-450 hover:text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                                                title="Move stage down"
                                            >
                                                <ChevronDown size={14} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-none flex items-center justify-center text-[10.5px] font-extrabold text-slate-650 shrink-0 shadow-2xs">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <h4 className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{stageInfo.label}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{stageInfo.desc}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={() => toggleStageActive(stageId)}
                                                className="w-4.5 h-4.5 rounded-none border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                            />
                                            <span className={cn(
                                                "text-[11px] font-bold uppercase tracking-wider",
                                                isActive ? "text-indigo-600" : "text-slate-400"
                                            )}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-150">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-indigo-555 shrink-0" />
                            <span>Reordering stages dynamically adjusts candidate progress stepper flows.</span>
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="px-4.5 h-8 bg-blue-600 hover:bg-blue-755 text-white text-[11px] font-bold rounded-none flex items-center gap-1.5 transition-colors border border-blue-700 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Save size={13} />
                            {savingSettings ? 'Saving...' : 'Save Process'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Settings size={14} className="text-indigo-500" />
                            Hire Eligibility Settings
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Define milestones required for promotions</p>
                    </div>
                    {!isAddingRule && (() => {
                        const ALL_STANDARD_NAMES = ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'];
                        const deletedStandards = ALL_STANDARD_NAMES.filter(name => !(localSettings.activeStandards || ALL_STANDARD_NAMES).includes(name));
                        return (
                            <div className="flex flex-wrap items-center gap-2">
                                {deletedStandards.length > 0 && (
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            if (!name) return;
                                            setLocalSettings((prev: any) => ({
                                                ...prev,
                                                activeStandards: [...(prev.activeStandards || ALL_STANDARD_NAMES), name],
                                                required: [...prev.required, name]
                                            }));
                                        }}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-none px-3 py-1.5 outline-none cursor-pointer shadow-xs font-sans"
                                    >
                                        <option value="">+ Add Standard Milestone</option>
                                        {deletedStandards.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingRule(true);
                                        setRuleSource('masterlist');
                                        setRuleColumn('');
                                        setRuleMatchingType('content');
                                        setRuleMatchingValue('');
                                        setRuleType('required');
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-none border border-indigo-700 shadow-xs cursor-pointer shrink-0"
                                >
                                    <Plus size={13} strokeWidth={2.5} />
                                    Add Custom Requirement
                                </button>
                            </div>
                        );
                    })()}
                </div>

                <div className="p-5">
                    {isAddingRule && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-4 mb-4 rounded-none space-y-4">
                            <h5 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {editingRuleId ? 'Edit Custom Requirement' : 'New Custom Requirement'}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Source Sheet</label>
                                    <select
                                        value={ruleSource}
                                        onChange={(e) => {
                                            setRuleSource(e.target.value as any);
                                            setRuleColumn('');
                                            setRuleMatchingValue('');
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                    >
                                        <option value="masterlist">Masterlist</option>
                                        <option value="interview">Interview Form</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Column / Field</label>
                                    <select
                                        value={ruleColumn}
                                        onChange={(e) => {
                                            const colKey = e.target.value;
                                            setRuleColumn(colKey);
                                            setRuleMatchingValue('');
                                            if (COLUMN_DROPDOWNS[colKey]) setRuleMatchingType('dropdown');
                                            else setRuleMatchingType('content');
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                    >
                                        <option value="">-- Select Column --</option>
                                        {(() => {
                                            const standardCols = ruleSource === 'masterlist' ? MASTERLIST_COLUMNS : NOT_ELIGIBLE_COLUMNS;

                                            let customColsList: any[] = [];
                                            try {
                                                const saved = localStorage.getItem('masterlist_custom_columns_by_tab');
                                                if (saved) {
                                                    const parsed = JSON.parse(saved);
                                                    const merged: Record<string, any> = {};
                                                    Object.values(parsed).forEach((list: any) => {
                                                        if (Array.isArray(list)) {
                                                            list.forEach(col => {
                                                                const key = col.subField ? `${col.field}.${col.subField}` : col.field;
                                                                merged[key] = col;
                                                            });
                                                        }
                                                    });
                                                    customColsList = Object.values(merged);
                                                }
                                            } catch { }

                                            const allCols = [...standardCols, ...customColsList];

                                            return allCols
                                                .filter(col => col.field && col.field !== 'actions' && col.field !== 'email_actions')
                                                .map((col, idx) => {
                                                    const key = col.subField ? `${col.field}.${col.subField}` : col.field;
                                                    return <option key={key + '-' + idx} value={key}>{col.label}</option>;
                                                });
                                        })()}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Condition</label>
                                    <select
                                        value={ruleMatchingType}
                                        onChange={(e) => {
                                            setRuleMatchingType(e.target.value as any);
                                            setRuleMatchingValue('');
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                    >
                                        {ruleColumn && COLUMN_DROPDOWNS[ruleColumn] ? (
                                            <>
                                                <option value="dropdown">Specific Value</option>
                                                <option value="content">Not Empty</option>
                                                <option value="na">Is N/A / Empty</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="content">Not Empty</option>
                                                <option value="na">Is N/A / Empty</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                {ruleMatchingType === 'dropdown' && ruleColumn ? (
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Matching Value</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={ruleMatchingValue}
                                                onChange={(e) => setRuleMatchingValue(e.target.value)}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                            >
                                                <option value="">-- Select Option --</option>
                                                {COLUMN_DROPDOWNS[ruleColumn]?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text" placeholder="Custom value..."
                                                value={ruleMatchingValue}
                                                onChange={(e) => setRuleMatchingValue(e.target.value)}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-1.5 text-[11.5px] outline-none focus:border-indigo-400"
                                            />
                                        </div>
                                    </div>
                                ) : null}
                                <div className={ruleMatchingType === 'dropdown' && ruleColumn ? "md:col-span-1" : "md:col-span-3"}>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Eligibility Type</label>
                                    <div className="flex gap-6 h-9 items-center">
                                        <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio" name="ruleType" checked={ruleType === 'required'}
                                                onChange={() => setRuleType('required')}
                                                className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            Required
                                        </label>
                                        <label className="flex items-center gap-2 text-[11.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio" name="ruleType" checked={ruleType === 'optional'}
                                                onChange={() => setRuleType('optional')}
                                                className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                            />
                                            Optional
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button" onClick={() => { setIsAddingRule(false); setEditingRuleId(null); }}
                                    className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-none transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!ruleColumn) { alert('Please select a column.'); return; }
                                        if (ruleMatchingType === 'dropdown' && !ruleMatchingValue) { alert('Please select a matching value.'); return; }
                                        const matchedCol = (ruleSource === 'masterlist' ? MASTERLIST_COLUMNS : NOT_ELIGIBLE_COLUMNS).find(c => (c.subField ? `${c.field}.${c.subField}` : c.field) === ruleColumn);
                                        const label = matchedCol ? matchedCol.label : ruleColumn;
                                        const parts = ruleColumn.split('.');
                                        const ruleData = {
                                            source: ruleSource, columnLabel: label, columnField: parts[0],
                                            columnSubField: parts[1], matchingType: ruleMatchingType,
                                            matchingValue: ruleMatchingValue, type: ruleType
                                        };
                                        if (editingRuleId) {
                                            setLocalSettings((prev: any) => ({
                                                ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === editingRuleId ? { ...r, ...ruleData } : r)
                                            }));
                                            setEditingRuleId(null);
                                        } else {
                                            const newRule = { id: Math.random().toString(36).substring(2, 9), ...ruleData };
                                            setLocalSettings((prev: any) => ({ ...prev, customRules: [...(prev.customRules || []), newRule] }));
                                        }
                                        setIsAddingRule(false);
                                    }}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-none transition-colors border border-indigo-700 shadow-xs cursor-pointer"
                                >
                                    {editingRuleId ? 'Save' : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[12px]">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-4 py-3">Criteria Milestone</th>
                                    <th className="px-4 py-3 text-center w-24">Required</th>
                                    <th className="px-4 py-3 text-center w-24">Optional</th>
                                    <th className="px-4 py-3 text-center w-24">Disabled</th>
                                    <th className="px-4 py-3 text-center w-16">Remove</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                                {(() => {
                                    const ALL_STANDARD_NAMES = ['Status', '1st Day Show up', 'Final Specific Status', '2nd Day Show up', 'PEME Status', 'BGS Status', 'RCBC Status', 'NBI Status'];
                                    const visibleStandards = CRITERIA_ITEMS.filter(item => (localSettings.activeStandards || ALL_STANDARD_NAMES).includes(item.name));
                                    return visibleStandards.map((item) => {
                                        const isRequired = localSettings.required.includes(item.name);
                                        const isOptional = localSettings.optional.includes(item.name);
                                        const isDisabled = !isRequired && !isOptional;
                                        return (
                                            <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/30">
                                                <td className="px-4 py-3.5">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300">{item.name}</div>
                                                    {editingStandardField === item.name ? (
                                                        <div className="mt-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-800 rounded-none w-fit">
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Target:</span>
                                                            <select
                                                                value={localSettings.standardSettings?.[item.name] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setLocalSettings(prev => ({
                                                                        ...prev, standardSettings: { ...(prev.standardSettings || {}), [item.name]: val }
                                                                    }));
                                                                }}
                                                                className="bg-white dark:bg-slate-900 border border-slate-350 rounded-none px-2 py-0.5 text-[11px] outline-none focus:border-indigo-400 font-sans"
                                                            >
                                                                <option value="">-- Default Logic --</option>
                                                                {COLUMN_DROPDOWNS[STANDARD_FIELD_COLUMN_MAP[item.name]]?.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                type="button" onClick={() => setEditingStandardField(null)}
                                                                className="text-indigo-650 hover:underline text-[10px] font-bold cursor-pointer"
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                                            <span>{item.desc}</span>
                                                            {COLUMN_DROPDOWNS[STANDARD_FIELD_COLUMN_MAP[item.name]] && (
                                                                <>
                                                                    <span className="text-slate-200">|</span>
                                                                    <button
                                                                        type="button" onClick={() => setEditingStandardField(item.name)}
                                                                        className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                                                                    >
                                                                        <Edit2 size={10} />
                                                                        {localSettings.standardSettings?.[item.name]
                                                                            ? `Target: ${localSettings.standardSettings[item.name]}`
                                                                            : 'Set Target Value'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <input
                                                        type="radio" name={`criteria-${item.name}`} checked={isRequired}
                                                        onChange={() => handleCriteriaChange(item.name, 'required')}
                                                        className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <input
                                                        type="radio" name={`criteria-${item.name}`} checked={isOptional}
                                                        onChange={() => handleCriteriaChange(item.name, 'optional')}
                                                        className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <input
                                                        type="radio" name={`criteria-${item.name}`} checked={isDisabled}
                                                        onChange={() => handleCriteriaChange(item.name, 'disabled')}
                                                        className="w-3.5 h-3.5 text-slate-400 focus:ring-slate-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setLocalSettings(prev => ({
                                                                ...prev,
                                                                required: prev.required.filter(x => x !== item.name),
                                                                optional: prev.optional.filter(x => x !== item.name),
                                                                activeStandards: (prev.activeStandards || ALL_STANDARD_NAMES).filter(x => x !== item.name)
                                                            }));
                                                        }}
                                                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                                {localSettings.customRules?.map((rule: any) => {
                                    const isRequired = rule.type === 'required';
                                    const isOptional = rule.type === 'optional';
                                    const isDisabled = !isRequired && !isOptional;
                                    return (
                                        <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/30">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300">{rule.columnLabel}</div>
                                                    <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 rounded-none">Custom</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                                    <span>
                                                        Source: <span className="capitalize">{rule.source}</span>
                                                        {' | '} Condition: {rule.matchingType === 'content' ? 'Has Content' : rule.matchingType === 'na' ? 'Is Empty' : `Equals "${rule.matchingValue}"`}
                                                    </span>
                                                    <span className="text-slate-200">|</span>
                                                    <button type="button" onClick={() => {
                                                        setEditingRuleId(rule.id);
                                                        setRuleSource(rule.source);
                                                        const colKey = rule.columnSubField ? `${rule.columnField}.${rule.columnSubField}` : rule.columnField;
                                                        setRuleColumn(colKey);
                                                        setRuleMatchingType(rule.matchingType);
                                                        setRuleMatchingValue(rule.matchingValue);
                                                        setRuleType(rule.type);
                                                        setIsAddingRule(true);
                                                    }} className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5 cursor-pointer">
                                                        <Edit2 size={10} /> Edit
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <input type="radio" name={`criteria-custom-${rule.id}`} checked={isRequired} onChange={() => {
                                                    setLocalSettings((prev: any) => ({
                                                        ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === rule.id ? { ...r, type: 'required' } : r)
                                                    }));
                                                }} className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <input type="radio" name={`criteria-custom-${rule.id}`} checked={isOptional} onChange={() => {
                                                    setLocalSettings((prev: any) => ({
                                                        ...prev, customRules: (prev.customRules || []).map((r: any) => r.id === rule.id ? { ...r, type: 'optional' } : r)
                                                    }));
                                                }} className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <input type="radio" name={`criteria-custom-${rule.id}`} checked={isDisabled} onChange={() => {
                                                    setLocalSettings((prev: any) => ({
                                                        ...prev, customRules: (prev.customRules || []).filter((r: any) => r.id !== rule.id)
                                                    }));
                                                }} className="w-3.5 h-3.5 text-slate-400 focus:ring-slate-500 cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button
                                                    type="button" onClick={() => {
                                                        setLocalSettings((prev: any) => ({
                                                            ...prev, customRules: (prev.customRules || []).filter((r: any) => r.id !== rule.id)
                                                        }));
                                                    }}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100">
                        <div className="text-[11px] text-[#605e5c] dark:text-slate-400 font-semibold flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-indigo-550 shrink-0" />
                            <span>Changes immediately update eligibility calculations.</span>
                        </div>
                        <button
                            onClick={handleSaveSettings} disabled={savingSettings}
                            className="px-4 h-8 bg-indigo-600 hover:bg-indigo-705 text-white text-[11px] font-bold rounded-none flex items-center gap-1.5 transition-colors border border-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            <Save size={13} />
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Applicants Table (Ongoing vs Hired) */}
            {(() => {
                const ongoingApplicants = accountDashboardData.filteredApplicants.filter(
                    app => app.current_status?.toUpperCase() !== 'HIRED' &&
                        !['FAILED', 'REJECTED', 'WITHDRAWN', 'FALLOUT', 'INACTIVE'].includes(app.current_status?.toUpperCase() || '')
                );
                const hiredApplicants = accountDashboardData.filteredApplicants.filter(
                    app => app.current_status?.toUpperCase() === 'HIRED'
                );
                const displayApplicants = applicantsTab === 'ongoing' ? ongoingApplicants : hiredApplicants;

                return (
                    <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-100 shadow-sm overflow-hidden text-left">
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/30">
                            <div>
                                <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={14} className="text-indigo-505" />
                                    Candidates Listing
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Track and view candidates under this account</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-0.5 rounded-none border border-slate-200 dark:border-slate-800 w-fit">
                                <button
                                    onClick={() => setApplicantsTab('ongoing')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-all",
                                        applicantsTab === 'ongoing' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                                    )}
                                >
                                    Ongoing ({ongoingApplicants.length})
                                </button>
                                <button
                                    onClick={() => setApplicantsTab('hired')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-none cursor-pointer transition-all",
                                        applicantsTab === 'hired' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                                    )}
                                >
                                    Hired ({hiredApplicants.length})
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {displayApplicants.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 z-10">
                                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="px-5 py-3">Candidate</th>
                                            <th className="px-5 py-3">Position</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3">Applied Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white dark:bg-slate-900">
                                        {displayApplicants.map((app) => (
                                            <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/30 transition-colors text-[12px]">
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-300">{app.applicant_name}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono tracking-tight mt-0.5">ID: {app.id.slice(0, 8)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-slate-655 font-semibold">{app.position_title}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 text-[9px] font-bold rounded-full border inline-block uppercase tracking-wider",
                                                        app.current_status === 'HIRED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                            ['FAILED', 'REJECTED', 'WITHDRAWN'].includes(app.current_status?.toUpperCase() || '') ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                                "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                    )}>
                                                        {app.current_status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">{new Date(app.applied_at).toLocaleDateString()}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-16 text-center">
                                    <Users size={32} className="mx-auto text-slate-300 mb-2.5" />
                                    <p className="text-[11px] font-bold text-slate-400">No {applicantsTab} candidates recorded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
