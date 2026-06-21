import type { Application } from '@/types/application';
import { SHEET_COLUMNS } from '../constants';
import * as helpers from '../utils/tableHelpers';

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

export const normalizeStatusText = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/_/g, ' ');
};

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

export const getFieldValue = (app: Application, rowLocalChanges: any, field: string, subField?: string) => {
    const change = rowLocalChanges || {};
    if (subField) {
        if (change[subField] !== undefined) return change[subField];
        const flatKey = `pis_${subField}`;
        if (change[flatKey] !== undefined) return change[flatKey];
        if (change.pis && change.pis[subField] !== undefined) {
            return change.pis[subField];
        }
        if (change[field]?.[subField] !== undefined) {
            return change[field][subField];
        }
    } else {
        if (change[field] !== undefined) {
            return change[field];
        }
    }
    if (subField) {
        return (app as any)[field]?.[subField];
    }
    return (app as any)[field];
};

export const evaluateChecklistItem = (app: Application, rowLocalChanges: any, item: { label: string, key: string, field: string, subField?: string, source: 'masterlist' | 'interview', conditionType?: string, matchValue?: string }) => {
    const value = getFieldValue(app, rowLocalChanges, item.field || 'pis', item.subField);
    const normalizedVal = value !== null && value !== undefined ? String(value).trim() : '';

    const condition = item.conditionType || (item.matchValue ? 'matches' : 'content');

    if (condition === 'matches') {
        return normalizedVal.toLowerCase() === (item.matchValue || '').toLowerCase();
    } else if (condition === 'gt') {
        const numVal = parseFloat(normalizedVal);
        const compVal = parseFloat(item.matchValue || '0');
        return !isNaN(numVal) && !isNaN(compVal) && numVal > compVal;
    } else if (condition === 'lt') {
        const numVal = parseFloat(normalizedVal);
        const compVal = parseFloat(item.matchValue || '0');
        return !isNaN(numVal) && !isNaN(compVal) && numVal < compVal;
    } else if (condition === 'eq') {
        const numVal = parseFloat(normalizedVal);
        const compVal = parseFloat(item.matchValue || '0');
        return !isNaN(numVal) && !isNaN(compVal) && numVal === compVal;
    } else if (condition === 'is_numeric') {
        const cleaned = normalizedVal.replace(/[-\s]/g, '');
        return cleaned !== '' && !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
    } else {
        return normalizedVal !== '' && normalizedVal !== '---' && normalizedVal.toLowerCase() !== 'n/a' && normalizedVal.toLowerCase() !== 'null' && normalizedVal.toLowerCase() !== 'undefined';
    }
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
    eligibilitySettings?: {
        required: string[];
        optional: string[];
        customRules?: CustomRule[];
        standardSettings?: Record<string, string>;
    }
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
        { label: 'Status', source: 'masterlist', met: 
            eligibilitySettings?.standardSettings?.['Status']
                ? normalizeStatusText(effectiveCurrentStatus) === normalizeStatusText(eligibilitySettings.standardSettings['Status'])
                : (
                    normalizeStatusText(effectiveCurrentStatus) === 'accepted offer' || 
                    normalizeStatusText(effectiveCurrentStatus) === 'hired' || 
                    normalizeStatusText(effectivePis.final_specific_status) === 'jo - offered' ||
                    normalizeStatusText(effectivePis.final_specific_status) === 'jo - hired'
                )
        },
        { label: '1st Day Show up', source: 'masterlist', met: 
            eligibilitySettings?.standardSettings?.['1st Day Show up']
                ? normalizeStatusText(effectiveFirstDay) === normalizeStatusText(eligibilitySettings.standardSettings['1st Day Show up'])
                : (normalizeStatusText(effectiveFirstDay) === 'showed' || normalizeStatusText(effectiveFirstDay) === 'present')
        },
        { label: 'Final Specific Status', source: 'interview', met: 
            eligibilitySettings?.standardSettings?.['Final Specific Status']
                ? normalizeStatusText(effectivePis.final_specific_status) === normalizeStatusText(eligibilitySettings.standardSettings['Final Specific Status'])
                : (
                    normalizeStatusText(effectivePis.final_specific_status).includes('ov - passed') || 
                    normalizeStatusText(effectivePis.final_specific_status).includes('client interview - passed') ||
                    normalizeStatusText(effectivePis.final_specific_status).includes('jo - offered') ||
                    normalizeStatusText(effectivePis.final_specific_status).includes('jo - hired') ||
                    normalizeStatusText(effectiveCurrentStatus) === 'accepted offer' ||
                    normalizeStatusText(effectiveCurrentStatus) === 'hired'
                )
        },
        { label: '2nd Day Show up', source: 'masterlist', met: 
            eligibilitySettings?.standardSettings?.['2nd Day Show up']
                ? normalizeStatusText(effectiveSecondDay) === normalizeStatusText(eligibilitySettings.standardSettings['2nd Day Show up'])
                : (normalizeStatusText(effectiveSecondDay) === 'showed' || normalizeStatusText(effectiveSecondDay) === 'present')
        },
        { label: 'PEME Status', source: 'masterlist', met: 
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
        { label: 'BGS Status', source: 'masterlist', met: 
            eligibilitySettings?.standardSettings?.['BGS Status']
                ? normalizeStatusText(effectiveBgs) === normalizeStatusText(eligibilitySettings.standardSettings['BGS Status'])
                : (!!effectiveBgs && (normalizeStatusText(effectiveBgs).includes('pass') || normalizeStatusText(effectiveBgs).includes('clear') || normalizeStatusText(effectiveBgs).includes('complete')))
        },
        { label: 'RCBC Status', source: 'masterlist', met: 
            eligibilitySettings?.standardSettings?.['RCBC Status']
                ? normalizeStatusText(effectiveRcbc) === normalizeStatusText(eligibilitySettings.standardSettings['RCBC Status'])
                : (!!effectiveRcbc && (normalizeStatusText(effectiveRcbc).includes('pass') || normalizeStatusText(effectiveRcbc).includes('clear') || normalizeStatusText(effectiveRcbc).includes('complete')))
        },
        { label: 'NBI Status', source: 'masterlist', met: 
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
            source: rule.source || 'masterlist'
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

export const getColumnWidth = (label: string) => {
    const l = label.toLowerCase();
    if (l === 'id' || l === '#') return 90;
    if (l.includes('hire eligibility')) return 170;
    if ((l.includes('time') || l.includes('date')) && !l.includes('candidate')) return 160;
    if (l.includes('email')) return 240;
    if (l.includes('recruiter') || l.includes('interviewer')) return 240;
    if (l.includes('name')) return 320;
    if (l.includes('position')) return 280;
    if (l.includes('summary') || l.includes('experience')) return 450;
    if (l.includes('salary')) return 200;
    if (l.includes('background')) return 400;
    if (l === 'status') return 160;
    if (l === 'account') return 180;
    return 200; // Default width
};

export const getDefaultOptionsForColKey = (colKey: string, colName: string): string[] => {
    const name = colName.toLowerCase();
    const key = colKey.toLowerCase();
    
    if (key === 'pis_overall_status' || key === 'overall_status' || name === 'overall status') {
        return ['OPEN', 'CLOSED', 'HIRED'];
    }
    if (key === 'current_status' || key === 'master_status' || name === 'application status' || key === 'master_status_col' || name === 'status') {
        return [
            'Applicant Form',
            'Assessment',
            'Sent JO and BGC',
            'For Job Offer',
            'For PAN',
            'Hired',
            'Lateral Transfer',
            'Withdrawn'
        ];
    }
    if (key === 'pis_final_specific_status' || key === 'final_specific_status' || name === 'final specific status') {
        return [
            'Passed Initial Interview',
            'Passed Final Interview',
            'Failed Initial Interview',
            'Failed Final Interview',
            'No Show Initial Interview',
            'No Show Final Interview',
            'Pending Decision',
            'Scheduled for Final Interview'
        ];
    }
    if (key.includes('nbi') || key.includes('bgs_status') || key.includes('bgs') || name.includes('nbi') || name.includes('bgc status')) {
        return ['Done', 'Pending'];
    }
    if (key.includes('peme_status') || name.includes('peme status') || name === 'peme') {
        return ['Endorsed'];
    }
    if (key.includes('peme_result') || name.includes('peme result')) {
        return ['Class A', 'Class B', 'Class C', 'Pending'];
    }
    if (key.includes('sss_status') || key.includes('philhealth_status') || key.includes('pagibig_status') || key.includes('sss_no') || key.includes('philhealth_no') || key.includes('pagibig_no') || name.includes('sss no') || name.includes('philhealth no') || name.includes('pag-ibig no')) {
        return ['Yes / No. to be followed', 'No'];
    }
    if (key.includes('tin_no') || key.includes('tin') || name.includes('tin')) {
        return ['Yes / No. to be followed', 'No'];
    }
    if (key.includes('bi_endorsement') || name.includes('bi status') || name.includes('bi endorsement')) {
        return ['Endorsed', 'NA'];
    }
    if (key.includes('bi_result') || name.includes('bi results')) {
        return ['Positive', 'Negative', 'Closed'];
    }
    if (key.includes('first_day_show_up') || key.includes('second_day_show_up') || name.includes('show up') || name.includes('showed 2nd day')) {
        return ['Showed', 'No-Show', 'Fallout'];
    }
    if (key.includes('hiring_source') || name.includes('source')) {
        return [
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
    }
    if (key === 'initial_interview_results' || name === 'initial interview results' || key.includes('cefr') || name.includes('cefr') || key.includes('ops_val_status') || name.includes('ops val status') || key.includes('client_interview_status') || name.includes('client interview status')) {
        return [
            'Hired',
            'For Job Offer',
            'Withdrawn',
            'For PAN',
            'Applicant Form',
            'Lateral Transfer',
            'Sent JO and BGC',
            'Assessment'
        ];
    }
    return [];
};



