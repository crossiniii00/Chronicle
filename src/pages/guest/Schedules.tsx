import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    ChevronLeft, 
    ChevronRight,
    Search,
    Filter,
    X
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import { cn } from '@/utils/formatters';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { isMatchingAccount } from './dashboardUtils';
import { FullscreenProfileView } from '@/components/features/ApplicantManagement/FullscreenProfileView';
import { socketService } from '@/services/socketService';
import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

type AuditTab = 'hiring' | 'schedule';

interface EventItem {
    id: string;
    applicantName: string;
    date: Date;
    label: string; // "ENDORSED", "INTERVIEW DATE", "HIRED", etc.
    type: 'endorsed' | 'interview' | 'hired';
    application: Application;
}

import type { Application } from '@/types/application';

export function FinalInterviewSchedules() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [auditTab, setAuditTab] = useState<AuditTab>('hiring');
    
    // Calendar Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [focusedApplicant, setFocusedApplicant] = useState<Application | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEventType, setSelectedEventType] = useState<'all' | 'endorsed' | 'interview' | 'hired'>('all');
    const [selectedAccount, setSelectedAccount] = useState<string>('all');

    const { user: authUser } = useAuthStore();
    const { loadRooms } = useRoomStore();
    const { error } = useToast();

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [fetchedApps, fetchedHistory] = await Promise.all([
                ApplicationService.getAll(),
                ApplicationService.getAllStatusHistory(),
                loadRooms(true)
            ]);
            setApplications(fetchedApps);
            setStatusHistory(fetchedHistory);
        } catch (err) {
            error('Registry Sync Error', 'Failed to retrieve endorsed schedules.');
        } finally {
            setIsLoading(false);
        }
    }, [error, loadRooms]);

    useVisibilityPolling(() => void loadData(true), 300000, [loadData]);

    useEffect(() => {
        const socket = socketService.getSocket();
        const handleUpdate = (payload?: any) => {
            if (payload?.data && payload.applicationId) {
                ApplicationService.injectDelta(payload.applicationId, payload.data);
                setApplications(prev => prev.map(a => a.id === payload.applicationId ? { ...a, ...payload.data } : a));
            } else {
                void loadData(true);
            }
        };
        socket.on('applications:updated', handleUpdate);
        return () => { socket.off('applications:updated', handleUpdate); };
    }, [loadData]);

    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(authUser?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const userDept = (activeAccount || accounts[0] || 'ABBOTT').toUpperCase();

    // Group history entries by application
    const historyMap = useMemo(() => {
        const m = new Map<string, any[]>();
        for (const row of statusHistory) {
            const appId = row.application_id;
            if (!m.has(appId)) m.set(appId, []);
            m.get(appId)!.push(row);
        }
        return m;
    }, [statusHistory]);

    // Build Event list from applications and history logs
    const calendarEvents = useMemo<EventItem[]>(() => {
        const events: EventItem[] = [];

        // Filter applications strictly belonging to the resolved active account (e.g. ABBOTT)
        const accountApps = applications.filter(a => {
            return isMatchingAccount(a, userDept);
        });

        for (const app of accountApps) {
            const appHistory = historyMap.get(app.id) || [];
            
            if (auditTab === 'hiring') {
                // 1. ENDORSED date to Final Interview
                const finalEndorsementStep = appHistory.find(h => 
                    ['FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(String(h.to_status || '').toUpperCase())
                );
                if (finalEndorsementStep?.changed_at) {
                    events.push({
                        id: `${app.id}-endorsed`,
                        applicantName: app.applicant_name,
                        date: new Date(finalEndorsementStep.changed_at),
                        label: 'ENDORSED',
                        type: 'endorsed',
                        application: app
                    });
                }

                // 2. INTERVIEW DATE (Only if actually scheduled with an endorsement meeting date)
                if (app.endorsement_meeting_date) {
                    events.push({
                        id: `${app.id}-interview`,
                        applicantName: app.applicant_name,
                        date: new Date(app.endorsement_meeting_date),
                        label: 'INTERVIEW DATE',
                        type: 'interview',
                        application: app
                    });
                }

                // 3. HIRED date
                const hiredStep = appHistory.find(h => ['HIRED', 'HIRED_PROCESSED', 'PASSED', 'CLIENT_ASSESSMENT'].includes(h.to_status.toUpperCase()));
                const hiredDateStr = hiredStep?.changed_at || app.hired_at;
                if (hiredDateStr) {
                    events.push({
                        id: `${app.id}-hired`,
                        applicantName: app.applicant_name,
                        date: new Date(hiredDateStr),
                        label: 'HIRED',
                        type: 'hired',
                        application: app
                    });
                }
            } else {
                // Schedule Audit tab: Just display the specific schedule dates/times
                if (app.endorsement_meeting_date) {
                    const timeStr = new Date(app.endorsement_meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    events.push({
                        id: `${app.id}-schedule`,
                        applicantName: app.applicant_name,
                        date: new Date(app.endorsement_meeting_date),
                        label: `SCHEDULED - ${timeStr}`,
                        type: 'interview',
                        application: app
                    });
                }
            }
        }
        return events;
    }, [applications, historyMap, userDept, auditTab]);

    // Calendar Generation Helpers
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const prevMonthDays = new Date(year, month, 0).getDate();

    const calendarCells = useMemo(() => {
        const cells: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month filler days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            cells.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month filler days (to fill 6 rows = 42 cells)
        const remainingCells = 42 - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            cells.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return cells;
    }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(new Date(year, direction === 'prev' ? month - 1 : month + 1, 1));
    };

    // Collect unique accounts for filtering
    const uniqueAccounts = useMemo(() => {
        const accts = new Set<string>();
        applications.forEach(a => {
            const depts = (a.endorsement_account || a.department || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            depts.forEach(d => accts.add(d));
        });
        return Array.from(accts).sort();
    }, [applications]);

    // Filtered events based on search, type toggles, and account
    const filteredEvents = useMemo(() => {
        return calendarEvents.filter(event => {
            // Event type filter
            if (selectedEventType !== 'all' && event.type !== selectedEventType) return false;
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                if (!event.applicantName.toLowerCase().includes(q) && !event.label.toLowerCase().includes(q)) return false;
            }
            // Account filter
            if (selectedAccount !== 'all') {
                const appDepts = (event.application.endorsement_account || event.application.department || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                if (!appDepts.includes(selectedAccount.toUpperCase())) return false;
            }
            return true;
        });
    }, [calendarEvents, selectedEventType, searchQuery, selectedAccount]);

    const getEventsForDate = (date: Date) => {
        return filteredEvents.filter(event => 
            event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear()
        );
    };



    if (isLoading && applications.length === 0) {
        return (
            <div className="min-h-screen bg-[#f3f2f1] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">Synchronizing Calendar...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full bg-[#f5f6f8] overflow-hidden p-4 gap-4">
            
            {/* --- HEADER (Application Management Style) --- */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm shrink-0">
                <div className="relative px-8 py-8 flex flex-col items-center gap-2">
                    <h1
                        className="text-[32px] leading-none text-surface-900 tracking-[-0.02em]"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                    >
                        {authUser?.role === 'admin' ? 'Global' : userDept} Audit Calendar
                    </h1>
                    <div className="text-[12px] font-medium text-surface-400 tracking-[0.04em] uppercase">
                        {monthName} {year} · {calendarEvents.length} total entries mapped
                    </div>
                </div>

                {/* --- AUDIT TABS --- */}
                <div className="flex justify-center gap-9 overflow-x-auto no-scrollbar px-8 border-t border-surface-200">
                    <button
                        onClick={() => setAuditTab('hiring')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            auditTab === 'hiring' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <span className={cn("transition-colors", auditTab === 'hiring' && "text-surface-900")}>Hiring Trail</span>
                        {auditTab === 'hiring' && (
                            <motion.span
                                layoutId="audit-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>

                    <button
                        onClick={() => setAuditTab('schedule')}
                        className={cn(
                            "group flex items-center gap-2.5 px-1 py-4 text-[14px] font-medium transition-colors whitespace-nowrap relative",
                            auditTab === 'schedule' ? "text-surface-900" : "text-surface-500 hover:text-surface-800"
                        )}
                    >
                        <span className={cn("transition-colors", auditTab === 'schedule' && "text-surface-900")}>Scheduling Trail</span>
                        {auditTab === 'schedule' && (
                            <motion.span
                                layoutId="audit-tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-emerald-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 18, mass: 0.6 }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* --- CALENDAR NAVIGATION CONTROL --- */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-surface-200 rounded-sm shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-surface-900 uppercase tracking-tight">
                        {monthName} {year}
                    </h2>
                    <span className="text-[10px] font-bold text-white bg-surface-900 px-2 py-0.5 rounded-full uppercase">
                        {authUser?.role === 'admin' ? 'Global' : userDept}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1.5 border border-surface-200 rounded-sm hover:bg-surface-50 text-surface-700 transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 border border-surface-200 text-xs font-bold uppercase rounded-sm hover:bg-surface-50 transition-all"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-1.5 border border-surface-200 rounded-sm hover:bg-surface-50 text-surface-700 transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* --- FILTERS BAR --- */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3 border border-surface-200 rounded-sm shadow-sm shrink-0 flex-wrap">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Search applicant name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-surface-200 rounded-sm bg-surface-50/50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-surface-400 text-surface-800 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-surface-200" />

                {/* Event Type Dropdown */}
                <div className="flex items-center gap-1.5">
                    <Filter size={13} className="text-surface-400" />
                    <select
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value as 'all' | 'endorsed' | 'interview' | 'hired')}
                        className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-surface-200 rounded-sm bg-surface-50/50 text-surface-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                    >
                        <option value="all">All Event Types</option>
                        <option value="endorsed">Endorsed</option>
                        <option value="interview">Interview</option>
                        <option value="hired">Hired</option>
                    </select>
                </div>



                {/* Active filter count + clear */}
                {(searchQuery || selectedEventType !== 'all' || selectedAccount !== 'all') && (
                    <>
                        <div className="h-6 w-px bg-surface-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                                {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedEventType('all');
                                    setSelectedAccount('all');
                                }}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* --- GOOGLE CALENDAR GRID LAYOUT --- */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm flex flex-col">
                {/* Day of week headers */}
                <div className="grid grid-cols-7 border-b border-surface-100 bg-surface-50/50 shrink-0 text-center py-2">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="text-[10px] font-black text-surface-400 tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid cells */}
                <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-gray-200 min-h-0">
                    {calendarCells.map((cell, idx) => {
                        const dateEvents = getEventsForDate(cell.date);
                        const isToday = new Date().toDateString() === cell.date.toDateString();

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "p-1.5 flex flex-col gap-1 h-[140px] overflow-hidden relative transition-all duration-200 bg-white dark:bg-slate-900 group hover:bg-surface-50/30 hover:scale-[1.015] hover:shadow-md hover:z-10",
                                    !cell.isCurrentMonth && "bg-surface-50/10 text-surface-300"
                                )}
                            >
                                <div className="flex items-center justify-between shrink-0">
                                    <span
                                        className={cn(
                                            "text-xs font-bold tabular-nums w-5 h-5 rounded-full flex items-center justify-center",
                                            isToday ? "bg-blue-600 text-white" : "text-surface-700",
                                            !cell.isCurrentMonth && "text-surface-300"
                                        )}
                                    >
                                        {cell.date.getDate()}
                                    </span>
                                </div>
                                
                                {/* Event chips */}
                                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-0">
                                    {dateEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                setFocusedApplicant(event.application);
                                            }}
                                            className={cn(
                                                "px-2 py-0.5 rounded-[3px] text-[9.5px] font-bold truncate cursor-pointer shadow-sm border border-transparent select-none transition-all",
                                                event.type === 'endorsed' ? "bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100" :
                                                event.type === 'interview' ? "bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100" :
                                                event.type === 'hired' ? "bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-emerald-100" :
                                                "bg-surface-100 border-surface-200 text-surface-800 hover:bg-surface-200"
                                            )}
                                            title={`${event.applicantName} - ${event.label}`}
                                        >
                                            {event.label}: {event.applicantName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Profile Viewer Overlay */}
            {focusedApplicant && (
                <FullscreenProfileView 
                    open={true}
                    onClose={() => {
                        setFocusedApplicant(null);
                    }}
                    applicant={focusedApplicant}
                    pisOnly={false}
                    guestDeskMode={true}
                />
            )}
        </div>
    );
}
