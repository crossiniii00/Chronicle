import type { Application } from '@/types';

export interface CustomRule {
    id: string;
    source: 'masterlist' | 'interview';
    columnLabel: string;
    columnField: string;
    columnSubField?: string;
    matchingType: 'dropdown' | 'content' | 'na';
    matchingValue: string;
    type: 'required' | 'optional';
}

export const HIRE_ELIGIBILITY_WIDTH = 170;

export const REQUIREMENT_COLUMN_MAP: Record<string, string> = {
    'Status': 'current_status',
    '1st Day Show up': 'master_first_day_show_up',
    'Final Specific Status': 'pis.final_specific_status',
    '2nd Day Show up': 'master_second_day_show_up',
    'PEME Status': 'master_peme_status',
    'BGS Status': 'master_bgs_status',
    'RCBC Status': 'master_rcbc_status',
    'NBI Status': 'master_nbi_result',
};

export const REQUIREMENT_COLUMN_HEADERS: Record<string, string> = {
    'Status': 'STATUS',
    '1st Day Show up': '1st Day Show up',
    'Final Specific Status': 'Final Specific Status',
    '2nd Day Show up': 'Showed 2nd Day',
    'PEME Status': 'PEME Result',
    'BGS Status': 'BGC Status',
    'RCBC Status': 'RCBC',
    'NBI Status': 'NBI Status',
};

export const formatConditionDesc = (item: any) => {
    const cond = item.conditionType || (item.matchValue ? 'matches' : 'content');
    if (cond === 'matches') return `Matches: ${item.matchValue}`;
    if (cond === 'gt') return `> ${item.matchValue}`;
    if (cond === 'lt') return `< ${item.matchValue}`;
    if (cond === 'eq') return `= ${item.matchValue}`;
    if (cond === 'is_numeric') return 'Is Numeric';
    return 'Has Content';
};

export const rowMissingCache = new Map<string, boolean>();

export function toTitleCase(str: string): string {
    if (!str) return '';
    const trimmed = str.trim();
    if (trimmed === '---' || trimmed === '-') return trimmed;
    return trimmed
        .toLowerCase()
        .split(' ')
        .map(word => {
            return word
                .split('-')
                .map(subWord => subWord.charAt(0).toUpperCase() + subWord.slice(1))
                .join('-');
        })
        .join(' ');
}

export const getMasterlistCellValue = (app: any, col: any, localChanges: any) => {
    const change = localChanges || {};
    let val: any = undefined;

    if (change && Object.keys(change).length > 0) {
        if (col.subField) {
            val = change[col.field]?.[col.subField];
        } else {
            val = change[col.field];
        }
    }

    if (val === undefined) {
        if (col.subField) {
            val = app[col.field]?.[col.subField];
        } else {
            val = app[col.field];
        }
    }

    if (col.field === 'current_status') {
        const changeStatus = change.current_status;
        let currVal = changeStatus !== undefined ? String(changeStatus) : String(app.current_status || '');
        const specStatus = String(change.pis?.final_specific_status || app.pis?.final_specific_status || app.metadata?.final_specific_status || '').toUpperCase();
        const initialResults = String(app.pis?.initial_interview_results || '').toUpperCase();

        if (specStatus.includes('INITIAL INTERVIEW - FAILED') || (specStatus.includes('FAILED') && !specStatus.includes('OV')) || initialResults === 'FAILED') {
            if (currVal === 'INTERVIEW_IN_PROGRESS' || currVal === 'QUEUE_ASSIGNED' || currVal === 'INITIAL_INTERVIEW' || !currVal) {
                return 'FAILED';
            }
        }
        return currVal;
    }

    // Resolve empty name fallbacks at the grid cell value provider level
    if ((col.field === 'master_first_name' || col.field === 'master_last_name') && (!val || !String(val).trim()) && app.applicant_name) {
        const nameStr = String(app.applicant_name).trim();
        if (nameStr) {
            let extractedFirst = '';
            let extractedLast = '';
            if (nameStr.includes(',')) {
                const parts = nameStr.split(',').map((s: string) => s.trim());
                extractedLast = parts[0];
                extractedFirst = parts[1] || '';
            } else {
                const parts = nameStr.split(/\s+/);
                if (parts.length === 1) {
                    extractedFirst = parts[0];
                } else {
                    extractedFirst = parts.slice(0, -1).join(' ');
                    extractedLast = parts[parts.length - 1];
                }
            }
            if (col.field === 'master_first_name') val = extractedFirst;
            if (col.field === 'master_last_name') val = extractedLast;
        }
    }

    if (val === null || val === undefined) return '';
    let strVal = String(val);

    // Gracefully handle JSON objects that were accidentally serialized into fields like highest_education
    if (strVal.trim().startsWith('{') && strVal.trim().endsWith('}')) {
        try {
            const parsed = JSON.parse(strVal);
            if ((col.subField === 'highest_education' || col.field === 'highest_education')) {
                strVal = parsed.educationalAttainment || parsed.education || parsed.highest_education || strVal;
            } else if ((col.subField === 'tenure_bpo' || col.field === 'tenure_bpo')) {
                strVal = parsed.yearsInBpo || parsed.tenure_bpo || strVal;
            } else if ((col.subField === 'course_year' || col.field === 'course_year')) {
                strVal = parsed.course || parsed.course_year || strVal;
            }
        } catch (e) {
            // Ignore parse errors, just use the string
        }
    }

    // Clean up Account/Department column to show only the main Account name without the LOB suffix (e.g. "Auto Approve BDR" -> "Auto Approve")
    if (col.field === 'department') {
        const changeDept = change.department;
        let rawVal = changeDept !== undefined ? String(changeDept) : String(app.department || app.endorsement_account || app.pis?.final_account || '');

        if (rawVal.includes(',')) {
            const failedAccounts = app.metadata?.failed_accounts || [];
            const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
            const remaining = rawVal.split(',').map(s => s.trim()).filter(s => s && !failedSet.has(s.toLowerCase()));

            // If they have multiple accounts, display them all so it doesn't look like a bug when filtered
            rawVal = remaining.length > 0 ? remaining.join(', ') : rawVal;
        }

        const lobsToRemove = ['Technical Support', 'Technical Suppo', 'Agent - Backoffice', 'Agent - Case Manager', 'Case Manager', 'BDR', 'DIA'];
        for (const lob of lobsToRemove) {
            const regex = new RegExp(lob, 'gi');
            if (regex.test(rawVal)) {
                rawVal = rawVal.replace(regex, '').trim();
            }
        }

        return rawVal
            .replace(/Kelly Postman/gi, 'Keller Postman')
            .replace(/Postman/gi, 'Keller Postman')
            .replace(/Keller\s+Keller\s+Postman/gi, 'Keller Postman')
            .replace(/The Savings/gi, 'The Savings Group');
    }

    // Populate LOB column dynamically by extracting the suffix from department (e.g. "Auto Approve BDR" -> "BDR", "Auto Approve DIA" -> "DIA")
    if (col.field === 'pis' && col.subField === 'custom_lob') {
        if (val && val !== '---') return val;
        const changeDept = change.department;
        const deptVal = String(changeDept !== undefined ? changeDept : (app.department || ''));

        const knownLobs = ['Technical Support', 'Technical Suppo', 'Agent - Backoffice', 'Agent - Case Manager', 'Case Manager', 'BDR', 'DIA'];
        for (const lob of knownLobs) {
            if (deptVal.includes(lob)) return lob === 'Technical Suppo' ? 'Technical Support' : lob;
        }

        const deptUpper = deptVal.toUpperCase();
        if (deptUpper.includes('BDR')) return 'BDR';
        if (deptUpper.includes('DIA')) return 'DIA';
        return '';
    }

    if (col.field === 'pis' && col.subField === 'final_specific_status' && strVal === 'OV - Pending') {
        const statusUpper = (localChanges?.current_status || app.current_status || '').toUpperCase();
        if (statusUpper === 'FINAL_INTERVIEW_SCHEDULED' || statusUpper === 'FINAL_INTERVIEW') {
            const initialResult = String(app.pis?.initial_interview_results || '').toUpperCase();
            if (initialResult === 'PASSED') {
                return 'Initial Interview - Passed';
            } else if (app.typing_test_completed_at) {
                return 'Typing Test - Passed';
            }
            return 'Assessment - Passed';
        }
    }

    // Filter out failed accounts for Account/department columns and Final Account column
    // Uses the same logic as the interview form's "Final Account" column
    if ((col.field === 'pis' && col.subField === 'final_account')) {
        const pis = (app.pis || {}) as any;

        const currentStatus = localChanges?.current_status || app.current_status || '';
        const statusUpper = currentStatus.toUpperCase();

        const isHiredOrJO = statusUpper === 'HIRED' ||
            statusUpper.includes('JOB_OFFER') ||
            statusUpper.includes('JOB OFFER') ||
            statusUpper.includes('ACCEPTED') ||
            statusUpper === 'PASSED';

        // Source the account value same as the Sheet Registry "Final Account" column:
        // pis.final_account is the authoritative source (set during interview finalization)
        const hasChange = change && (col.subField
            ? (change[col.field]?.[col.subField] !== undefined)
            : (change[col.field] !== undefined));

        const rawVal = hasChange
            ? strVal
            : ((col.field === 'pis' && col.subField === 'final_account')
                ? strVal
                : (pis?.final_account || app.endorsement_account || strVal || ''));

        if (!rawVal) return '';

        // Filter out failed accounts
        const failedAccounts = app.metadata?.failed_accounts || [];
        const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));

        const remaining = rawVal
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && !failedSet.has(s.toLowerCase()));

        // For hired/JO candidates, return only the first (passed) account
        if (isHiredOrJO && remaining.length > 1) {
            return remaining[0];
        }

        return remaining.join(', ') || rawVal;
    }

    if (col.field === 'drug_test') {
        const resp = app.interview_responses?.['20'] ||
            app.interview_responses?.[20] ||
            Object.entries(app.interview_responses || {}).find(([k, v]) =>
                k.toLowerCase().includes('drug') || k === '20'
            )?.[1];
        return String(resp || '');
    }

    const nameFields = ['master_first_name', 'master_last_name', 'master_middle_name', 'applicant_name', 'first_name', 'last_name', 'middle_name'];
    if (nameFields.includes(col.field) || (col.subField && nameFields.includes(col.subField))) {
        return toTitleCase(strVal);
    }

    if (col.field === 'master_allowance' && strVal && strVal !== '---' && strVal.toUpperCase() !== 'N/A' && strVal !== '0') {
        const cleaned = strVal.replace(/^PHP\s*/i, '').trim();
        if (cleaned) {
            return `PHP ${cleaned}`;
        }
    }

    return strVal;
};

export const getTableWidth = (columns: any[], showSelectionColumn: boolean) =>
    columns.reduce((sum: number, col: any) => sum + (col.width || 150), 0) + (showSelectionColumn ? 40 : 0) + 60 + HIRE_ELIGIBILITY_WIDTH;

export const normalizeStatusText = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/_/g, ' ');
};

export const getFieldValue = (app: Application, rowLocalChanges: any, field: string, subField?: string) => {
    if (rowLocalChanges) {
        if (subField) {
            if (rowLocalChanges.pis && rowLocalChanges.pis[subField] !== undefined) {
                return rowLocalChanges.pis[subField];
            }
            if (rowLocalChanges[field]?.[subField] !== undefined) {
                return rowLocalChanges[field][subField];
            }
        } else {
            if (rowLocalChanges[field] !== undefined) {
                return rowLocalChanges[field];
            }
        }
    }
    if (subField) {
        return (app as any)[field]?.[subField];
    }
    return (app as any)[field];
};

export const spotlightCell = (appId: string, fieldId: string): boolean => {
    const cellId = `cell-${appId}-${fieldId}`;
    const cell = document.getElementById(cellId);
    if (!cell) return false;

    cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483600;
        background: rgba(0,0,0,0.18); backdrop-filter: blur(2px);
        pointer-events: auto; transition: opacity 0.35s ease;
    `;

    const highlight = document.createElement('div');
    highlight.style.cssText = `
        position: fixed;
        z-index: 2147483610;
        border: 2.5px solid #0078d4;
        border-radius: 3px;
        box-shadow: 0 0 0 4px rgba(0,120,212,0.18), 0 0 24px rgba(0,120,212,0.25);
        pointer-events: none;
        animation: spotlight-pulse 0.8s ease-in-out infinite alternate;
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
        position: fixed;
        z-index: 2147483620;
        pointer-events: none;
        animation: spotlight-bounce 0.6s ease-in-out infinite alternate;
    `;
    arrow.innerHTML = `<svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path d="M10 0 L10 18 M4 12 L10 18 L16 12" stroke="#0078d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const updatePosition = () => {
        const rect = cell.getBoundingClientRect();
        highlight.style.left = `${rect.left - 4}px`;
        highlight.style.top = `${rect.top - 4}px`;
        highlight.style.width = `${rect.width + 8}px`;
        highlight.style.height = `${rect.height + 8}px`;

        arrow.style.left = `${rect.left + rect.width / 2 - 10}px`;
        arrow.style.top = `${rect.top - 32}px`;

        backdrop.style.clipPath = `polygon(
            0% 0%, 0% 100%, 
            ${rect.left - 4}px 100%, 
            ${rect.left - 4}px ${rect.top - 4}px, 
            ${rect.right + 4}px ${rect.top - 4}px, 
            ${rect.right + 4}px ${rect.bottom + 4}px, 
            ${rect.left - 4}px ${rect.bottom + 4}px, 
            ${rect.left - 4}px 100%, 
            100% 100%, 100% 0%
        )`;
    };

    updatePosition();

    if (!document.getElementById('spotlight-keyframes')) {
        const style = document.createElement('style');
        style.id = 'spotlight-keyframes';
        style.textContent = `
            @keyframes spotlight-pulse {
                from { box-shadow: 0 0 0 4px rgba(0,120,212,0.18), 0 0 24px rgba(0,120,212,0.25); }
                to   { box-shadow: 0 0 0 6px rgba(0,120,212,0.30), 0 0 32px rgba(0,120,212,0.35); }
            }
            @keyframes spotlight-bounce {
                from { transform: translateY(0); }
                to   { transform: translateY(6px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(backdrop);
    document.body.appendChild(highlight);
    document.body.appendChild(arrow);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    const dismiss = () => {
        backdrop.style.opacity = '0';
        highlight.style.opacity = '0';
        arrow.style.opacity = '0';
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        setTimeout(() => {
            backdrop.remove();
            highlight.remove();
            arrow.remove();
        }, 350);
    };
    backdrop.addEventListener('click', dismiss);

    setTimeout(dismiss, 3000);
    return true;
};

export const evaluateCustomRule = (app: Application, rowLocalChanges: any, rule: CustomRule) => {
    const value = getFieldValue(app, rowLocalChanges, rule.columnField, rule.columnSubField);
    const normalizedVal = value !== null && value !== undefined ? String(value).trim() : '';

    if (rule.matchingType === 'na') {
        return normalizedVal === '' || normalizedVal === '---' || normalizedVal.toLowerCase() === 'n/a';
    } else if (rule.matchingType === 'content') {
        return normalizedVal !== '' && normalizedVal !== '---' && normalizedVal.toLowerCase() !== 'n/a';
    } else {
        if (!rule.matchingValue) return true;
        return normalizeStatusText(normalizedVal) === normalizeStatusText(rule.matchingValue);
    }
};

export const computeHireEligibility = (
    app: Application,
    rowLocalChanges?: any,
    eligibilitySettings?: { required: string[]; optional: string[]; customRules?: CustomRule[]; standardSettings?: Record<string, string> }
) => {
    const effectiveCurrentStatus = (rowLocalChanges?.current_status !== undefined ? rowLocalChanges.current_status : app.current_status) as string;
    const effectivePis = {
        ...(app.pis || {}),
        ...((rowLocalChanges?.pis) || {})
    } as { final_specific_status?: string };
    const effectiveFirstDay = (rowLocalChanges?.master_first_day_show_up !== undefined ? rowLocalChanges.master_first_day_show_up : app.master_first_day_show_up) as string;
    const effectiveSecondDay = (rowLocalChanges?.master_second_day_show_up !== undefined ? rowLocalChanges.master_second_day_show_up : app.master_second_day_show_up) as string;
    const effectivePemeStatus = (rowLocalChanges?.master_peme_status !== undefined ? rowLocalChanges.master_peme_status : app.master_peme_status) as string;
    const effectivePemeResult = (rowLocalChanges?.master_peme_result !== undefined ? rowLocalChanges.master_peme_result : app.master_peme_result) as string;
    const effectiveBgs = (rowLocalChanges?.master_bgs_status !== undefined ? rowLocalChanges.master_bgs_status : app.master_bgs_status) as string;
    const effectiveRcbc = (rowLocalChanges?.master_rcbc_status !== undefined ? rowLocalChanges.master_rcbc_status : app.master_rcbc_status) as string;
    const effectiveNbi = (rowLocalChanges?.master_nbi_result !== undefined ? rowLocalChanges.master_nbi_result : app.master_nbi_result) as string;

    const allChecks = [
        {
            label: 'Status', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['Status']
                    ? normalizeStatusText(effectiveCurrentStatus) === normalizeStatusText(eligibilitySettings.standardSettings['Status'])
                    : (
                        normalizeStatusText(effectiveCurrentStatus) === 'accepted offer' ||
                        normalizeStatusText(effectiveCurrentStatus) === 'hired' ||
                        normalizeStatusText(effectivePis.final_specific_status) === 'jo - offered' ||
                        normalizeStatusText(effectivePis.final_specific_status) === 'jo - hired'
                    )
        },
        {
            label: '1st Day Show up', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['1st Day Show up']
                    ? normalizeStatusText(effectiveFirstDay) === normalizeStatusText(eligibilitySettings.standardSettings['1st Day Show up'])
                    : (normalizeStatusText(effectiveFirstDay) === 'showed' || normalizeStatusText(effectiveFirstDay) === 'present')
        },
        {
            label: 'Final Specific Status', source: 'interview', met:
                eligibilitySettings?.standardSettings?.['Final Specific Status']
                    ? normalizeStatusText(effectivePis.final_specific_status) === normalizeStatusText(eligibilitySettings.standardSettings['Final Specific Status'])
                    : (
                        normalizeStatusText(effectivePis.final_specific_status).includes('ov - passed') ||
                        normalizeStatusText(effectivePis.final_specific_status).includes('client assessment - passed') ||
                        normalizeStatusText(effectivePis.final_specific_status).includes('client interview - passed') ||
                        normalizeStatusText(effectivePis.final_specific_status).includes('jo - offered') ||
                        normalizeStatusText(effectivePis.final_specific_status).includes('jo - hired') ||
                        normalizeStatusText(effectiveCurrentStatus) === 'accepted offer' ||
                        normalizeStatusText(effectiveCurrentStatus) === 'hired'
                    )
        },
        {
            label: '2nd Day Show up', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['2nd Day Show up']
                    ? normalizeStatusText(effectiveSecondDay) === normalizeStatusText(eligibilitySettings.standardSettings['2nd Day Show up'])
                    : (normalizeStatusText(effectiveSecondDay) === 'showed' || normalizeStatusText(effectiveSecondDay) === 'present')
        },
        {
            label: 'PEME Status', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['PEME Status']
                    ? (
                        normalizeStatusText(effectivePemeStatus) === normalizeStatusText(eligibilitySettings.standardSettings['PEME Status']) ||
                        normalizeStatusText(effectivePemeResult) === normalizeStatusText(eligibilitySettings.standardSettings['PEME Status'])
                    )
                    : (
                        (!!effectivePemeStatus && normalizeStatusText(effectivePemeStatus).includes('endorsed')) ||
                        (!!effectivePemeResult && (
                            normalizeStatusText(effectivePemeResult).includes('fit') ||
                            normalizeStatusText(effectivePemeResult).includes('passed') ||
                            normalizeStatusText(effectivePemeResult).includes('clear') ||
                            normalizeStatusText(effectivePemeResult).includes('class')
                        ))
                    )
        },
        {
            label: 'BGS Status', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['BGS Status']
                    ? normalizeStatusText(effectiveBgs) === normalizeStatusText(eligibilitySettings.standardSettings['BGS Status'])
                    : (!!effectiveBgs && (normalizeStatusText(effectiveBgs).includes('pass') || normalizeStatusText(effectiveBgs).includes('clear') || normalizeStatusText(effectiveBgs).includes('complete')))
        },
        {
            label: 'RCBC Status', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['RCBC Status']
                    ? normalizeStatusText(effectiveRcbc) === normalizeStatusText(eligibilitySettings.standardSettings['RCBC Status'])
                    : (!!effectiveRcbc && (normalizeStatusText(effectiveRcbc).includes('pass') || normalizeStatusText(effectiveRcbc).includes('clear') || normalizeStatusText(effectiveRcbc).includes('complete')))
        },
        {
            label: 'NBI Status', source: 'masterlist', met:
                eligibilitySettings?.standardSettings?.['NBI Status']
                    ? normalizeStatusText(effectiveNbi) === normalizeStatusText(eligibilitySettings.standardSettings['NBI Status'])
                    : (!!effectiveNbi && (normalizeStatusText(effectiveNbi).includes('pass') || normalizeStatusText(effectiveNbi).includes('clear') || normalizeStatusText(effectiveNbi).includes('complete')))
        }
    ];

    const requiredLabels = eligibilitySettings?.required ?? ['Status', '1st Day Show up', 'Final Specific Status'];
    const optionalLabels = eligibilitySettings?.optional ?? ['2nd Day Show up'];

    const customRules = eligibilitySettings?.customRules || [];
    const customChecks = customRules.map(rule => {
        return {
            label: rule.columnLabel,
            met: evaluateCustomRule(app, rowLocalChanges, rule),
            source: rule.source || 'masterlist',
            columnField: rule.columnSubField ? `${rule.columnField}.${rule.columnSubField}` : rule.columnField
        };
    });

    const requiredChecks = [
        ...allChecks.filter(c => requiredLabels.includes(c.label)),
        ...customChecks.filter((c, i) => customRules[i].type === 'required')
    ];
    const optionalChecks = [
        ...allChecks.filter(c => optionalLabels.includes(c.label)),
        ...customChecks.filter((c, i) => customRules[i].type === 'optional')
    ];

    const metRequired = requiredChecks.filter(c => c.met).length;
    const totalRequired = requiredChecks.length;
    const metOptional = optionalChecks.filter(c => c.met).length;
    const totalOptional = optionalChecks.length;
    const isEligible = metRequired === totalRequired;

    return {
        isEligible,
        metRequired,
        totalRequired,
        metOptional,
        totalOptional,
        requiredChecks,
        optionalChecks
    };
};

export const buildMissingTooltip = (eligibility: ReturnType<typeof computeHireEligibility>): string => {
    const missing: string[] = [];
    for (const c of eligibility.requiredChecks) {
        if (!c.met) missing.push(c.label);
    }
    if (missing.length === 0) return 'All required criteria met. Click to promote to HIRED.';
    return `Missing: ${missing.join(', ')}`;
};
