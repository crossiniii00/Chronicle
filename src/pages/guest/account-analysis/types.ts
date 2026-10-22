import type { Application } from '@/types';

// ── Outcome Classification ──────────────────────────────────────────────────
export type Outcome = 'PASSED' | 'FAILED' | 'PENDING';

export const PASSED_STATUSES = ['HIRED', 'HIRED_PROCESSED', 'PASSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_VERDICT', 'FOR_JOB_OFFER', 'For Job Offer', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC'];
export const FAILED_STATUSES = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE', 'WITHDRAWN', 'CLOSED', 'DISQUALIFIED', 'Withdrawn', 'Withdrawn by Applicant'];

export function classify(status: string | undefined, app?: any): Outcome {
    const statusUpper = String(status || '').toUpperCase();
    const verdictUpper = String(app?.final_verdict || app?.metadata?.final_verdict || '').toUpperCase();
    const opsValUpper = String(app?.metadata?.ops_validator_status || app?.pis?.ops_validator_status || '').toUpperCase();
    const specUpper = String(app?.final_specific_status || app?.pis?.final_specific_status || app?.metadata?.final_specific_status || '').toUpperCase();

    if (verdictUpper === 'FAILED' || opsValUpper === 'FAILED' || specUpper.includes('FAILED') || FAILED_STATUSES.includes(statusUpper)) {
        return 'FAILED';
    }

    if (verdictUpper === 'PASSED' || verdictUpper === 'HIRED' || opsValUpper === 'PASSED' || PASSED_STATUSES.includes(statusUpper)) {
        return 'PASSED';
    }

    return 'PENDING';
}

// ── Date Range ──────────────────────────────────────────────────────────────
export type Range = '7d' | '30d' | '90d' | 'all';

export const RANGE_OPTIONS: { id: Range; label: string; days: number | null }[] = [
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: '90d', label: '90 Days', days: 90 },
    { id: 'all', label: 'Lifetime', days: null }
];

// ── Drilldown ───────────────────────────────────────────────────────────────
export interface DrilldownState {
    title: string;
    stageKey: 'typing' | 'assessment' | 'initial' | 'final' | 'total' | 'pending' | 'applied' | 'hired' | 'remaining';
    filter?: 'PASSED' | 'FAILED' | 'PENDING' | 'ALL';
    dateLabel?: string;
}

// ── Demographic data shape ──────────────────────────────────────────────────
export interface DemographicRow {
    label: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
}

// ── Insight shape ───────────────────────────────────────────────────────────
export interface Insight {
    type: 'positive' | 'warning' | 'neutral';
    text: string;
}

// ── Helper: normalize location from address ─────────────────────────────────
export function getCityFromAddress(address: string | undefined): string {
    if (!address) return 'Unspecified';
    const addr = address.toLowerCase();
    if (addr.includes('cebu')) return 'Cebu City';
    if (addr.includes('mandaue')) return 'Mandaue City';
    if (addr.includes('lapu') || addr.includes('lapu-lapu') || addr.includes('opon')) return 'Lapu-Lapu City';
    if (addr.includes('talisay')) return 'Talisay City';
    if (addr.includes('consolacion')) return 'Consolacion';
    if (addr.includes('liloan')) return 'Liloan';
    if (addr.includes('minglanilla')) return 'Minglanilla';
    if (addr.includes('compostela')) return 'Compostela';
    if (addr.includes('cordova')) return 'Cordova';
    return 'Other locations';
}

// ── Drilldown candidate type (application + stage outcome) ──────────────────
export type DrilldownCandidate = Application & { stageOutcome: Outcome };
