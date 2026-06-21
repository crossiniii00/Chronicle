import React, { useState, useEffect } from 'react';
import { cn, STATUS_LABELS, STATUS_CSS } from '@/utils/formatters';
import type { Application } from '@/types/application';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SPECIFIC_STATUS_OPTIONS } from '@/pages/recruiter/tracker/utils/statusMappings';
import { History } from 'lucide-react';

interface EditableCellProps {
    appId: string;
    field: string;
    subField?: string;
    appValues: Application;
    localChanges: Record<string, Partial<Application>>;
    onEdit: (appId: string, field: keyof Application, value: any) => void;
    isEditing: boolean;
    setIsEditing?: (val: boolean) => void;
    isActive: boolean;
    onPaint?: () => void;
    onShowHistory?: () => void;
    className?: string;
    options?: string[];
}

export const EditableCell: React.FC<EditableCellProps> = ({
    appId, field, subField, appValues, localChanges = {}, onEdit, isEditing, setIsEditing, isActive, onPaint, onShowHistory, className, options
}) => {
    // Management of internal focus state for the PAINT experience
    const [isFocused, setIsFocused] = useState(false);

    // Management of local value to prevent massive global re-renders on every keystroke
    const [localVal, setLocalVal] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // Safety check - MUST BE AFTER HOOKS
    const hasAppValues = !!appValues;

    // Determine the raw value from DB
    let baseValue = '';
    if (hasAppValues) {
        try {
            if (subField) {
                baseValue = (appValues as any)?.[field]?.[subField] || '';
            } else {
                baseValue = (appValues as any)?.[field] || '';

                // Fallback for Master Status
                if (field === 'master_status' && (!baseValue || baseValue === 'Open' || baseValue === 'OPEN')) {
                    const specific = (appValues as any).pis_final_specific_status || '';
                    const isPassed = specific.toUpperCase().includes('PASSED') || appValues.current_status?.toUpperCase() === 'PASSED';
                    baseValue = isPassed ? 'For Job Offer' : (appValues.current_status || '');
                }
            }

            // For the Account (department) or Final Account column, resolve using pis.final_account
            // Same logic as the Sheet Registry "Final Account" column
            if (field === 'department' || (field === 'pis' && subField === 'final_account')) {
                const pis = (appValues as any).pis || {};
                const rawVal = (field === 'pis' && subField === 'final_account') 
                    ? baseValue 
                    : (pis.final_account || (appValues as any).endorsement_account || baseValue || '');
                
                if (rawVal) {
                    const failedAccounts = (appValues as any).metadata?.failed_accounts || [];
                    const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                    
                    const remaining = rawVal
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter((s: string) => s && !failedSet.has(s.toLowerCase()));

                    // Resolve effective status: check localChanges for pending status edits
                    const resolvedChanges = (localChanges && typeof localChanges === 'object' && appId in localChanges && typeof (localChanges as any)[appId] === 'object')
                        ? (localChanges as any)[appId]
                        : localChanges;
                    const effectiveStatus = resolvedChanges?.current_status || appValues.current_status || '';
                    const statusUpper = effectiveStatus.toUpperCase();
                    const isHiredOrJO = statusUpper === 'HIRED' || 
                                        statusUpper.includes('JOB_OFFER') || 
                                        statusUpper.includes('JOB OFFER') ||
                                        statusUpper.includes('ACCEPTED') ||
                                        statusUpper === 'PASSED';

                    if (isHiredOrJO && remaining.length > 1) {
                        baseValue = remaining[0];
                    } else {
                        baseValue = remaining.join(', ') || rawVal;
                    }
                }
            }
        } catch (e) {
            baseValue = '';
        }
    }

    // Resolve the changes for this specific application (safely handles global localChanges vs row-local localChanges)
    const rowChanges = (localChanges && typeof localChanges === 'object' && appId in localChanges && typeof (localChanges as any)[appId] === 'object')
        ? (localChanges as any)[appId]
        : localChanges;

    // Determine the current value including local un-synced edits
    let currentValue = baseValue;
    if (rowChanges && Object.keys(rowChanges).length > 0) {
        try {
            if (subField) {
                currentValue = (rowChanges as any)?.[field]?.[subField] ?? baseValue;
            } else {
                currentValue = (rowChanges as any)?.[field] ?? baseValue;
            }
        } catch (e) {
            currentValue = baseValue;
        }
    }

    // Keep local state synced if external value updates (e.g. after sync).
    useEffect(() => {
        setLocalVal(currentValue !== null && currentValue !== undefined ? String(currentValue) : '');
    }, [currentValue]);


    if (!hasAppValues) return <span className={className}>---</span>;

    const handleCommit = () => {
        setIsFocused(false);
        if (localVal === currentValue) return;

        if (subField) {
            const currentChanges = (rowChanges || {}) as any;
            const nested = {
                ...(currentChanges[field] || (appValues as any)[field] || {}),
                [subField]: localVal
            };
            onEdit(appId, field as keyof Application, nested);
        } else {
            onEdit(appId, field as keyof Application, localVal);
        }
    };

    const isEditorActive = isEditing && isActive;

    if (options && options.length > 0 && isEditorActive) {
        return (
            <div className="relative w-full h-full min-h-[36px] flex items-center bg-white border-none">
                <input
                    type="text"
                    autoFocus
                    value={localVal}
                    onChange={(e) => {
                        setLocalVal(e.target.value);
                    }}
                    onBlur={(e) => {
                        // Delay handleCommit slightly so that clicking an option from the select triggers its onChange first
                        setTimeout(handleCommit, 150);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCommit();
                            (e.target as HTMLElement).blur();
                        }
                    }}
                    className="w-full h-full pl-3 pr-8 py-2 text-[11px] font-bold uppercase outline-none rounded-none bg-white border-none text-left"
                    placeholder="Type or select..."
                />
                <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center border-none pointer-events-none bg-transparent">
                    <select
                        tabIndex={-1}
                        value=""
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                setLocalVal(val);
                                if (subField) {
                                    const currentChanges = (rowChanges || {}) as any;
                                    const nested = {
                                        ...(currentChanges[field] || (appValues as any)[field] || {}),
                                        [subField]: val
                                    };
                                    onEdit(appId, field as keyof Application, nested);
                                } else {
                                    onEdit(appId, field as keyof Application, val);
                                }
                            }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto"
                    >
                        <option value="" disabled></option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    {/* Visual dropdown arrow indicator */}
                    <svg className="w-4 h-4 text-surface-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        );
    }

    if ((field?.toLowerCase().includes('date') || subField?.toLowerCase().includes('date')) && isEditorActive) {
        return (
            <input
                type="date"
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => setLocalVal(e.target.value)}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none bg-white !border-none text-center"
            />
        );
    }

    if ((field === 'overall_status' || subField === 'overall_status') && isEditorActive) {
        const activeClass = (STATUS_CSS as any)[localVal] || 'status-applied';
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    const newVal = e.target.value;
                    setLocalVal(newVal);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: newVal
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, newVal);
                    }
                }}
                className={cn(
                    "w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer !border-none",
                    activeClass
                )}
                style={{ textAlign: 'center' }}
            >
                {['OPEN', 'CLOSED', 'HIRED'].map(status => (
                    <option
                        key={status}
                        value={status}
                        className="bg-white text-black font-semibold text-left"
                    >
                        {status}
                    </option>
                ))}
            </select>
        );
    }

    if ((field === 'current_status' || field === 'master_status') && isEditorActive) {
        // Deduplicate and prioritize uppercase-underscore keys
        const uniqueOptionsMap = new Map<string, string>();
        for (const [key, label] of Object.entries(STATUS_LABELS)) {
            const existingKey = uniqueOptionsMap.get(label);
            if (!existingKey) {
                uniqueOptionsMap.set(label, key);
            } else {
                const isNewDbStandard = key.includes('_') && key === key.toUpperCase();
                const isExistingDbStandard = existingKey.includes('_') && existingKey === existingKey.toUpperCase();
                if (isNewDbStandard && !isExistingDbStandard) {
                    uniqueOptionsMap.set(label, key);
                } else if (key.toUpperCase() === key && existingKey.toUpperCase() !== existingKey) {
                    uniqueOptionsMap.set(label, key);
                }
            }
        }

        // Normalize localVal to match one of the keys in uniqueOptionsMap
        const normalizedLocalVal = Array.from(uniqueOptionsMap.values()).find(
            key => key.toUpperCase().replace(/[\s_]+/g, '') === localVal.toUpperCase().replace(/[\s_]+/g, '')
        ) || localVal;

        const activeClass = (STATUS_CSS as any)[normalizedLocalVal] || (STATUS_CSS as any)[localVal] || 'status-applied';

        return (
            <select
                autoFocus
                value={normalizedLocalVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    const newVal = e.target.value;
                    console.log('[STATUS DEBUG] onChange fired', { appId, field, newVal, prevLocalVal: localVal });
                    setLocalVal(newVal);
                    onEdit(appId, field as keyof Application, newVal);
                }}
                className={cn(
                    "w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer !border-none",
                    activeClass
                )}
                style={{ textAlign: 'center' }}
            >
                {Array.from(uniqueOptionsMap.entries()).map(([label, key]) => (
                    <option
                        key={key}
                        value={key}
                        className="bg-white text-black font-semibold text-left"
                    >
                        {label}
                    </option>
                ))}
            </select>
        );
    }

    if ((field === 'final_specific_status' || field === 'pis_final_specific_status' || subField === 'final_specific_status') && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: e.target.value
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, e.target.value);
                    }
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">--- SELECT STATUS ---</option>
                {SPECIFIC_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if ((field === 'master_first_day_show_up' || field === 'master_second_day_show_up') && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none text-center"
            >
                <option value="">---</option>
                <option value="Showed">Showed</option>
                <option value="No-Show">No-Show</option>
                <option value="Fallout">Fallout</option>
            </select>
        );
    }

    if (field === 'master_nbi_result' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
                style={{ textAlign: 'center' }}
            >
                <option value="">---</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
            </select>
        );
    }

    if (field === 'master_peme_status' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                <option value="Endorsed">Endorsed</option>
            </select>
        );
    }

    if (field === 'master_peme_result' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                {['Class A', 'Class B', 'Class C', 'Pending'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
        );
    }

    if (field === 'master_bgs_status' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                <option value="Done">Done</option>
                <option value="Pending">Pending</option>
            </select>
        );
    }

    if (['master_sss_status', 'master_philhealth_status', 'master_pagibig_status'].includes(field) && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
                style={{ textAlign: 'center' }}
            >
                <option value="">---</option>
                <option value="N/A">N/A</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
            </select>
        );
    }

    if (field === 'master_bi_endorsement_date' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                <option value="Endorsed">Endorsed</option>
                <option value="NA">NA</option>
            </select>
        );
    }

    if (field === 'master_last_keep_warm' && isEditorActive) {
        const today = new Date();
        const dateOptions: { value: string; label: string }[] = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const value = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            dateOptions.push({ value, label });
        }
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                {dateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    if (field === 'master_bi_result' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                <option value="Positive">Positive</option>
                <option value="Negative">Negative</option>
                <option value="Closed">Closed</option>
            </select>
        );
    }

    if (field === 'master_training_confirmation' && isEditorActive) {
        return (
            <select
                autoFocus
                value={localVal}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    onEdit(appId, field as keyof Application, e.target.value);
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">---</option>
                <option value="Confirmed Training">Confirmed Training</option>
                <option value="Sent Training Details">Sent Training Details</option>
            </select>
        );
    }

    if ((field === 'hiring_source' || subField === 'hiring_source_detailed') && isEditorActive) {
        const sourceOptions = [
            'JOBSTREET',
            'JOB ADS',
            'INSTAGRAM',
            'FACEBOOK',
            'EMPLOYEE REFERRALS',
            'WALK-IN',
            'LINKEDIN',
            'INDEED',
            'COMPANY WEBSITE',
            'CAROUSELL',
            'TIKTOK',
            'OFFLINE ADS'
        ];
        return (
            <select
                autoFocus
                value={localVal.toUpperCase()}
                onBlur={handleCommit}
                onChange={(e) => {
                    setLocalVal(e.target.value);
                    if (subField) {
                        const currentChanges = (rowChanges || {}) as any;
                        const nested = {
                            ...(currentChanges[field] || (appValues as any)[field] || {}),
                            [subField]: e.target.value
                        };
                        onEdit(appId, field as keyof Application, nested);
                    } else {
                        onEdit(appId, field as keyof Application, e.target.value);
                    }
                }}
                className="w-full h-full px-4 py-2 text-[11px] font-bold uppercase outline-none rounded-none cursor-pointer bg-white !border-none"
            >
                <option value="">--- SELECT SOURCE ---</option>
                {sourceOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (!isEditorActive) {
        const isDate = field.toLowerCase().includes('date') ||
                       field.toLowerCase().includes('birth') ||
                       subField?.toLowerCase().includes('date') ||
                       subField?.toLowerCase().includes('birth') ||
                       field === 'master_last_keep_warm';
        let displayVal: React.ReactNode = localVal || '---';
        let isAnomalous = false;

        if (field === 'department' || (field === 'pis' && subField === 'final_account')) {
            const pis = (appValues as any).pis || {};
            const rawVal = (field === 'pis' && subField === 'final_account') 
                ? baseValue 
                : (pis.final_account || (appValues as any).endorsement_account || baseValue || '');
            // Resolve effective status including any pending local edits
            const effectiveStatus = rowChanges?.current_status || appValues.current_status || '';
            const statusUpper = effectiveStatus.toUpperCase();
            const isFailed = statusUpper === 'REJECTED' || statusUpper === 'FAILED';
            
            if (rawVal) {
                const failedAccounts = (appValues as any).metadata?.failed_accounts || [];
                const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                const accounts = rawVal.split(',').map((s: string) => s.trim()).filter(Boolean);
                
                if (isFailed) {
                    displayVal = (
                        <span className="flex flex-wrap gap-1">
                            {accounts.map((acc: string, idx: number) => {
                                const isAccFailed = failedSet.has(acc.toLowerCase());
                                return (
                                    <span key={idx} className={isAccFailed ? "line-through text-rose-600 font-normal" : "text-emerald-600 font-semibold"}>
                                        {acc}{idx < accounts.length - 1 ? ',' : ''}
                                    </span>
                                );
                            })}
                        </span>
                    );
                } else {
                    const remaining = accounts.filter((acc: string) => !failedSet.has(acc.toLowerCase()));
                    const isHiredOrJO = statusUpper === 'HIRED' || 
                                        statusUpper.includes('JOB_OFFER') || 
                                        statusUpper.includes('JOB OFFER') ||
                                        statusUpper.includes('ACCEPTED') ||
                                        statusUpper === 'PASSED';
                    let activeDisplayed = remaining;
                    if (isHiredOrJO && remaining.length > 1) {
                        activeDisplayed = [remaining[0]];
                    }
                    const displayedAccounts = accounts.filter((acc: string) => {
                        const isAccFailed = failedSet.has(acc.toLowerCase());
                        if (isAccFailed) return true;
                        return activeDisplayed.includes(acc);
                    });
                    displayVal = (
                        <span className="flex flex-wrap gap-1">
                            {displayedAccounts.map((acc: string, idx: number) => {
                                const isAccFailed = failedSet.has(acc.toLowerCase());
                                return (
                                    <span key={idx} className={isAccFailed ? "line-through text-rose-600 font-normal" : "text-emerald-600 font-semibold"}>
                                        {acc}{idx < displayedAccounts.length - 1 ? ',' : ''}
                                    </span>
                                );
                            })}
                        </span>
                    );
                }
            }
        }

        if (field === 'current_status' || field === 'master_status') {
            const schedStatus = appValues.recruiter_s_scheduling_status || appValues.metadata?.recruiter_s_scheduling_status;
            const finalStatus = localVal || currentValue || appValues.current_status;
            if (appValues.applicant_name === 'Johnathan Doe') {
                console.log('Johnathan Doe StatusBadge -> field:', field, 'finalStatus:', finalStatus, 'currentValue:', currentValue, 'baseValue:', baseValue, 'appValues.current_status:', appValues.current_status);
            }
            displayVal = <StatusBadge status={finalStatus as any} schedulingStatus={schedStatus} applicant={appValues} />;
        } else if (isDate && localVal && localVal !== '---') {
            const date = new Date(localVal);
            if (!isNaN(date.getTime())) {
                displayVal = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                if (date.getFullYear() === 2001 || (date.getFullYear() < 1960 && field.includes('date'))) {
                    isAnomalous = true;
                }
            }
        }

        const hasHistory = !!((appValues.pis?.reprofile_history && appValues.pis.reprofile_history.length > 0) || (appValues.metadata?.reprofile_history && appValues.metadata.reprofile_history.length > 0));
        const isOpsValCol = field?.toLowerCase().includes('ops_val') || field?.toLowerCase().includes('ops_validator') || subField?.toLowerCase().includes('ops_val') || subField?.toLowerCase().includes('ops_validator');

        return (
            <div
                onClick={(e) => {
                    if (isEditing && !isActive && onPaint) {
                        e.stopPropagation();
                        onPaint();
                        return;
                    }
                    if (!isEditing) {
                        setIsExpanded(!isExpanded);
                    }
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isEditing && setIsEditing) {
                        setIsEditing(true);
                    }
                    if (onPaint) {
                        onPaint();
                    }
                }}
                className={cn(
                    "w-full h-full min-h-[44px] flex items-center pl-4 pr-8 font-sans rounded-none transition-all duration-200 relative group/history",
                    !isEditing ? "cursor-pointer" : (!isActive ? "cursor-cell hover:bg-primary-50/30" : "cursor-text"),
                    !isExpanded ? "truncate" : "whitespace-normal py-2 break-words bg-primary-50/20 shadow-[inset_3px_0_0_#0078d4]",
                    isAnomalous && "text-[#d13438] font-bold",
                    className
                )}
                title={isAnomalous ? "Warning: Potential Year Anomaly (2001 detected)" : (!isExpanded ? "Click to view full details" : "Click to collapse")}
            >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {displayVal}
                    {isOpsValCol && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-sm animate-pulse shrink-0 ml-1.5">
                            <span className="w-1 h-1 rounded-full bg-yellow-500 animate-ping shrink-0" />
                            Current
                        </span>
                    )}
                </div>
                {onShowHistory && hasHistory && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
                        className="absolute right-2 top-1.5 p-1 text-purple-600 hover:text-purple-700 bg-white/95 shadow-sm border border-purple-100 rounded-none opacity-40 hover:opacity-100 z-20 flex items-center justify-center transition-all hover:bg-purple-50"
                        title="View Reprofile History"
                    >
                        <History size={12} />
                    </button>
                )}
            </div>
        );
    }



    return (
        <textarea
            autoFocus
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleCommit}
            className="w-full h-full p-4 text-[11px] font-medium text-surface-900 !border-none outline-none resize-none rounded-none min-h-[44px]"
            placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
            rows={1}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
            }}
            onFocus={(e) => {
                // Auto-adjust height on focus
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
                // Move cursor to end
                const val = e.target.value;
                e.target.value = '';
                e.target.value = val;
                e.target.value = val;
            }}
        />
    );
};
