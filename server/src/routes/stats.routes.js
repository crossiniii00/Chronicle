import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

statsRouter.get('/dashboard', requireAuth, async (req, res, next) => {
    try {
        const { dateFilter = 'ALL', start, end } = req.query;
        
        // 1. Fetch only necessary columns from applications
        const { rows: applications } = await query(`
            SELECT 
                id, 
                applied_at, 
                created_at, 
                current_status, 
                department, 
                assigned_recruiter_name, 
                metadata->>'interviewer_name' as interviewer_name,
                metadata->>'candidate_type' as meta_candidate_type,
                metadata->'pis'->>'candidate_type' as pis_candidate_type,
                metadata->>'hiring_type' as meta_hiring_type,
                metadata->>'failed_accounts' as failed_accounts,
                metadata->>'scheduled_time' as meta_scheduled_time
            FROM applications
        `);

        // 2. Fetch necessary columns from users
        const { rows: users } = await query(`
            SELECT id, full_name, role, is_active, created_at, avatar_data
            FROM users
        `);

        // 3. Fetch necessary columns from positions
        const { rows: positions } = await query(`
            SELECT id, status, created_at
            FROM positions
        `);

        // 4. Fetch latest 8 audits
        const { rows: audits } = await query(`
            SELECT * FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 8
        `);
        
        // 5. Fetch departments
        const { rows: departments } = await query(`SELECT * FROM departments`);

        // 6. Perform JS logic
        const pad = (n) => String(n).padStart(2, '0');
        const toDateStr = (d) => {
            if (!d) return '';
            if (d instanceof Date) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            return String(d).substring(0, 10);
        };
        
        const ref = new Date();
        const refYesterday = new Date();
        refYesterday.setDate(refYesterday.getDate() - 1);

        let currentStart = '';
        let currentEnd = '';
        let prevStart = '';
        let prevEnd = '';

        if (dateFilter === 'TODAY') {
            const todayStr = toDateStr(ref);
            currentStart = todayStr;
            currentEnd = todayStr;
            const yestStr = toDateStr(refYesterday);
            prevStart = yestStr;
            prevEnd = yestStr;
        } else if (dateFilter === 'WEEK') {
            if (start && end) {
                currentStart = start;
                currentEnd = end;
                const ps = new Date(currentStart);
                ps.setDate(ps.getDate() - 7);
                const pe = new Date(currentEnd);
                pe.setDate(pe.getDate() - 7);
                prevStart = toDateStr(ps);
                prevEnd = toDateStr(pe);
            }
        } else if (dateFilter === 'MONTH') {
            if (start && end) {
                currentStart = start;
                currentEnd = end;
                const [yrStr, moStr] = currentStart.split('-');
                let yr = parseInt(yrStr);
                let mo = parseInt(moStr) - 1; 
                const prevYr = mo === 0 ? yr - 1 : yr;
                const prevMo = mo === 0 ? 11 : mo - 1;
                const prevDaysInMo = new Date(prevYr, prevMo + 1, 0).getDate();
                prevStart = `${prevYr}-${pad(prevMo + 1)}-01`;
                prevEnd = `${prevYr}-${pad(prevMo + 1)}-${pad(prevDaysInMo)}`;
            }
        } else if (dateFilter === 'CUSTOM') {
            if (start && end) {
                currentStart = start;
                currentEnd = end;
                const msDiff = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
                const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24)) + 1;
                const ps = new Date(currentStart);
                ps.setDate(ps.getDate() - daysDiff);
                const pe = new Date(currentEnd);
                pe.setDate(pe.getDate() - daysDiff);
                prevStart = toDateStr(ps);
                prevEnd = toDateStr(pe);
            }
        }

        const filterFn = (dateVal) => {
            if (!dateVal) return false;
            if (dateFilter === 'ALL') return true;
            const d = toDateStr(dateVal);
            return d >= currentStart && d <= currentEnd;
        };

        const prevFilterFn = (dateVal) => {
            if (!dateVal || dateFilter === 'ALL') return false;
            const d = toDateStr(dateVal);
            return d >= prevStart && d <= prevEnd;
        };

        const apps = applications.filter(a => filterFn(a.applied_at));
        const prevApps = applications.filter(a => prevFilterFn(a.applied_at));

        const activeUsersCount = users.filter(u => u.is_active).length;
        
        const activeApplicantsCount = apps.filter(a => 
            !['HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'ACCEPTED_OFFER', 'CLOSED'].includes(a.current_status || '')
        ).length;
        const prevActiveApplicantsCount = prevApps.filter(a => 
            !['HIRED', 'REJECTED', 'FAILED', 'WITHDRAWN', 'ACCEPTED_OFFER', 'CLOSED'].includes(a.current_status || '')
        ).length;

        const totalApplications = apps.length;
        const prevTotalApplications = prevApps.length;

        const activePositions = positions.filter(p => p.status === 'OPEN').length;

        const pendingApplications = apps.filter(a => a.current_status === 'APPLIED' || a.current_status === 'INITIAL_INTERVIEW').length;
        const prevPendingApplications = prevApps.filter(a => a.current_status === 'APPLIED' || a.current_status === 'INITIAL_INTERVIEW').length;

        const hiredStatuses = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'JO - HIRED'];
        const hired = apps.filter(a => hiredStatuses.includes((a.current_status || '').toUpperCase())).length;
        const prevHired = prevApps.filter(a => hiredStatuses.includes((a.current_status || '').toUpperCase())).length;

        const getTrend = (curr, prev) => {
            if (dateFilter === 'ALL') return null;
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const conversionPct = totalApplications > 0 ? Math.round((hired / totalApplications) * 100) : 0;
        const prevConversionPct = prevTotalApplications > 0 ? Math.round((prevHired / prevTotalApplications) * 100) : 0;

        const trends = {
            activeApplicants: getTrend(activeApplicantsCount, prevActiveApplicantsCount),
            applications: getTrend(totalApplications, prevTotalApplications),
            positions: getTrend(positions.length, positions.length), 
            pending: getTrend(pendingApplications, prevPendingApplications),
            hired: getTrend(hired, prevHired),
            conversion: getTrend(conversionPct, prevConversionPct)
        };

        const statusDataCounts = {};
        apps.forEach(app => {
            const status = app.current_status || 'APPLIED';
            statusDataCounts[status] = (statusDataCounts[status] || 0) + 1;
        });
        const statusData = Object.entries(statusDataCounts)
            .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
            .sort((a, b) => b.value - a.value);

        const roleCounts = {};
        users.forEach(u => {
            const key = (u.role || 'unknown');
            roleCounts[key] = (roleCounts[key] || 0) + 1;
        });
        const roleDataRaw = Object.entries(roleCounts)
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const recruitersList = users.filter(u => u.role?.startsWith('recruiter') || u.role === 'admin' || u.role === 'super_admin');
        const activeRecruiters = recruitersList.map((u, i) => {
            const recruiterApps = applications.filter(app =>
                app.assigned_recruiter_name?.toLowerCase() === u.full_name?.toLowerCase() ||
                app.interviewer_name?.toLowerCase() === u.full_name?.toLowerCase()
            );
            const rHires = recruiterApps.filter(app => app.current_status === 'HIRED').length;
            const userNameLower = u.full_name?.toLowerCase() || '';
            const isCoordinator = ['namier', 'sandy', 'ana marie', 'althea'].some(name => userNameLower.includes(name));
            const screened = isCoordinator ? 0 : recruiterApps.filter(app =>
                !['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS', 'PENDING'].includes(app.current_status || '')
            ).length;
            const accolades = ['Top Endorser', 'Efficiency Lead', 'Candidate Champion', 'Spotlight Champion'];
            return {
                id: u.id,
                full_name: u.full_name,
                role: u.role,
                avatar_data: u.avatar_data,
                hires: rHires,
                screened: screened,
                active: screened,
                accolade: accolades[i % accolades.length],
                palette: 'amber'
            };
        });

        const activeAccounts = departments.map((dept) => {
            const deptApps = applications.filter(app => app.department?.toLowerCase() === dept.name?.toLowerCase());
            const hiredCount = deptApps.filter(app => app.current_status === 'HIRED').length;
            const active = deptApps.filter(app => !['HIRED', 'FAILED', 'REJECTED'].includes(app.current_status)).length;
            const scheduled = deptApps.filter(app => app.current_status === 'FINAL_INTERVIEW_SCHEDULED').length;
            const forScheduling = deptApps.filter(app =>
                (app.current_status === 'ENDORSED' || app.current_status === 'FINAL_INTERVIEW') &&
                !(app.meta_scheduled_time || app.pis_scheduled_time)
            ).length;
            return {
                id: dept.id,
                name: dept.name,
                head: dept.head || 'No lead assigned',
                budgetCode: dept.budgetCode || 'N/A',
                accountImageUrl: dept.accountImageUrl || dept.accountImageData || null,
                hiring_quota: parseInt(dept.hiring_quota) || 0,
                hired: hiredCount,
                active: active,
                scheduled: scheduled,
                forScheduling: forScheduling
            };
        });

        const todayStr = toDateStr(ref);
        const appliedTodayApps = applications.filter(a => toDateStr(a.applied_at) === todayStr);
        const internalAppliedToday = appliedTodayApps.filter(a => {
            const type = (a.meta_candidate_type || a.pis_candidate_type || a.meta_hiring_type || '').toUpperCase();
            return type.includes('INTERNAL') || type.includes('INT') || type === 'BILLED';
        }).length;
        const externalAppliedToday = appliedTodayApps.length - internalAppliedToday;

        const internalCandidatesCount = apps.filter(a => {
            const type = (a.meta_candidate_type || a.pis_candidate_type || a.meta_hiring_type || '').toUpperCase();
            return type.includes('INTERNAL') || type.includes('INT') || type === 'BILLED';
        }).length;
        const externalCandidatesCount = apps.length - internalCandidatesCount;

        res.json({
            metrics: {
                activeUsersCount,
                activeApplicantsCount,
                totalApplications,
                activePositions,
                pendingApplications,
                hired,
                conversionPct,
                internalAppliedToday,
                externalAppliedToday,
                internalCandidatesCount,
                externalCandidatesCount
            },
            trends,
            recentAudits: audits,
            statusData,
            roleDataRaw,
            activeRecruiters: activeRecruiters.length > 0 ? activeRecruiters : null,
            activeAccounts: activeAccounts.length > 0 ? activeAccounts : null
        });

    } catch (error) {
        console.error("Dashboard stats error:", error);
        next(error);
    }
});
