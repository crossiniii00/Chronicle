import { query } from '../db.js';

const QUOTA_DISCRIMINATORS = [
    'ACCOUNT_INTERNAL_QUOTA_BILLED',
    'ACCOUNT_INTERNAL_QUOTA_NON_BILLED',
];

const TERMINAL_APPLICANT_STATUSES = [
    'HIRED',
    'REJECTED',
    'FAILED',
    'WITHDRAWN',
    'NOT_ELIGIBLE_FOR_REHIRE',
    'CLOSED',
];

async function safeQuery(label, sql, params = []) {
    try {
        const result = await query(sql, params);
        return result.rows;
    } catch (err) {
        console.warn(`[DataContext] ${label} failed:`, err.message);
        return [];
    }
}

function toIso(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString();
    return String(v);
}

function toDateOnly(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

async function buildUserContext(user) {
    if (!user) return { name: 'unknown', role: 'unknown' };
    return {
        id: user.id,
        name: user.full_name || user.name || 'unknown',
        email: user.email || null,
        role: user.role || 'unknown',
        department: user.department || user.sector || null,
    };
}

async function buildAccountsSummary() {
    const totals = await safeQuery(
        'accounts totals',
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(ov_status, 'Pending')) IN ('active', 'live', 'onboarded'))::int AS active
         FROM mhrt_accounts`
    );
    const total = totals[0]?.total ?? 0;
    const active = totals[0]?.active ?? 0;

    const recent = await safeQuery(
        'accounts recent',
        `SELECT account, lob, pseudonym, position, campaign_manager, team_manager, ov_status, updated_at
         FROM mhrt_accounts
         ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 10`
    );

    return {
        total,
        active,
        recent: recent.map(a => ({
            name: a.account,
            lob: a.lob,
            position: a.position,
            manager: a.campaign_manager || a.team_manager,
            status: a.ov_status || 'Unknown',
            updatedAt: toIso(a.updated_at),
        })),
    };
}

async function buildOpenQuotasSummary() {
    const placeholders = QUOTA_DISCRIMINATORS.map((_, i) => `$${i + 1}`).join(', ');
    const list = await safeQuery(
        'open quotas list',
        `SELECT id, title, department, hiring_quota, current_hired,
                quota_start_date, quota_end_date, status, requirements
         FROM positions
         WHERE requirements IN (${placeholders})
           AND COALESCE(hiring_quota, 0) > 0
           AND UPPER(COALESCE(status, 'OPEN')) = 'OPEN'
         ORDER BY COALESCE(quota_end_date, quota_start_date, created_at) DESC NULLS LAST
         LIMIT 10`,
        QUOTA_DISCRIMINATORS
    );

    const byDepartment = list.reduce((acc, q) => {
        const dept = (q.department || 'Unassigned').trim() || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    return {
        open: list.length,
        byDepartment,
        list: list.map(q => ({
            id: q.id,
            department: q.department || 'Unassigned',
            title: q.title,
            hiringQuota: q.hiring_quota,
            currentHired: q.current_hired || 0,
            startDate: toDateOnly(q.quota_start_date),
            endDate: toDateOnly(q.quota_end_date),
            type: q.requirements === 'ACCOUNT_INTERNAL_QUOTA_BILLED' ? 'Billed' : 'Non-Billed',
        })),
    };
}

async function buildQuotaHistorySummary() {
    const recent = await safeQuery(
        'quota history recent',
        `SELECT id, department, quota, hired_count, total_applicants, in_pipeline, failed_count,
                start_date, end_date, closed_at
         FROM hiring_quota_history
         ORDER BY closed_at DESC NULLS LAST
         LIMIT 5`
    );

    return {
        total: recent.length,
        recent: recent.map(h => ({
            department: h.department,
            quota: h.quota,
            hiredCount: h.hired_count,
            totalApplicants: h.total_applicants,
            inPipeline: h.in_pipeline,
            failedCount: h.failed_count,
            startDate: toDateOnly(h.start_date),
            endDate: toDateOnly(h.end_date),
            closedAt: toIso(h.closed_at),
        })),
    };
}

async function buildApplicantSummary() {
    const totals = await safeQuery(
        'applicant totals',
        `SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE UPPER(COALESCE(current_status, '')) = 'HIRED')::int AS hired,
            COUNT(*) FILTER (WHERE UPPER(COALESCE(current_status, '')) IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'))::int AS terminal_failed,
            COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL '30 days')::int AS last30_total,
            COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL '30 days' AND UPPER(COALESCE(current_status, '')) = 'HIRED')::int AS last30_hired,
            COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL '30 days' AND UPPER(COALESCE(current_status, '')) IN ('REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'))::int AS last30_failed,
            COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL '30 days' AND UPPER(COALESCE(current_status, '')) NOT IN ('HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE', 'CLOSED'))::int AS last30_in_pipeline
         FROM applications`
    );
    const t = totals[0] || {};

    const recent = await safeQuery(
        'applicants recent',
        `SELECT id, applicant_name, applicant_email, position_title, department, current_status, applied_at
         FROM applications
         ORDER BY applied_at DESC NULLS LAST
         LIMIT 10`
    );

    return {
        total: t.total ?? 0,
        hired: t.hired ?? 0,
        terminalFailed: t.terminal_failed ?? 0,
        last30Days: {
            total: t.last30_total ?? 0,
            hired: t.last30_hired ?? 0,
            inPipeline: t.last30_in_pipeline ?? 0,
            failed: t.last30_failed ?? 0,
        },
        recent: recent.map(a => ({
            name: a.applicant_name,
            email: a.applicant_email,
            position: a.position_title,
            department: a.department,
            currentStatus: a.current_status,
            appliedAt: toIso(a.applied_at),
        })),
    };
}

export async function buildDataContext(user) {
    const [userCtx, accounts, quotas, history, applicants] = await Promise.all([
        Promise.resolve(buildUserContext(user)),
        buildAccountsSummary(),
        buildOpenQuotasSummary(),
        buildQuotaHistorySummary(),
        buildApplicantSummary(),
    ]);

    return {
        user: userCtx,
        fetchedAt: new Date().toISOString(),
        accounts,
        hiringQuotas: quotas,
        quotaHistory: history,
        applicants,
    };
}

export function formatDataContextForPrompt(snapshot) {
    const lines = [];
    lines.push(`Now: ${snapshot.fetchedAt}`);
    lines.push(`User: ${snapshot.user.name} (${snapshot.user.role}${snapshot.user.department ? `, ${snapshot.user.department}` : ''})`);

    lines.push('');
    lines.push(`Accounts (${snapshot.accounts.total} total, ${snapshot.accounts.active} active):`);
    if (snapshot.accounts.recent.length === 0) {
        lines.push('  (none)');
    } else {
        for (const a of snapshot.accounts.recent) {
            lines.push(`  - ${a.name} | ${a.lob || '—'} | ${a.position || '—'} | status=${a.status} | manager=${a.manager || '—'}`);
        }
    }

    lines.push('');
    lines.push(`Open hiring quotas (${snapshot.hiringQuotas.open}):`);
    if (snapshot.hiringQuotas.list.length === 0) {
        lines.push('  (none)');
    } else {
        for (const q of snapshot.hiringQuotas.list) {
            lines.push(`  - [${q.type}] ${q.department} — "${q.title}": target ${q.hiringQuota}, hired so far ${q.currentHired}, window ${q.startDate || '—'} → ${q.endDate || '—'}`);
        }
        const deptSummary = Object.entries(snapshot.hiringQuotas.byDepartment)
            .map(([d, n]) => `${d}: ${n}`).join(', ');
        if (deptSummary) lines.push(`  By department: ${deptSummary}`);
    }

    lines.push('');
    lines.push(`Closed quota history (last ${snapshot.quotaHistory.total}):`);
    if (snapshot.quotaHistory.recent.length === 0) {
        lines.push('  (none)');
    } else {
        for (const h of snapshot.quotaHistory.recent) {
            const successRate = h.quota > 0 ? Math.round((h.hiredCount / h.quota) * 100) : 0;
            lines.push(`  - ${h.department}: target ${h.quota}, hired ${h.hiredCount} (${successRate}%), processed ${h.totalApplicants}, pipeline ${h.inPipeline}, failed ${h.failedCount}, closed ${h.closedAt?.slice(0, 10) || '—'}`);
        }
    }

    lines.push('');
    lines.push(`Applicants — all-time: ${snapshot.applicants.total} total, ${snapshot.applicants.hired} hired, ${snapshot.applicants.terminalFailed} failed/rejected.`);
    lines.push(`Applicants — last 30 days: ${snapshot.applicants.last30Days.total} new, ${snapshot.applicants.last30Days.hired} hired, ${snapshot.applicants.last30Days.inPipeline} in pipeline, ${snapshot.applicants.last30Days.failed} failed.`);
    if (snapshot.applicants.recent.length > 0) {
        lines.push('Recent applicants:');
        for (const a of snapshot.applicants.recent) {
            lines.push(`  - ${a.name} | ${a.position || '—'} | ${a.department || '—'} | status=${a.currentStatus || '—'} | applied ${a.appliedAt?.slice(0, 10) || '—'}`);
        }
    }

    return lines.join('\n');
}
