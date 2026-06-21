import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Users, Clock, CheckCircle, AlertCircle, List, ChevronLeft, BarChart2, Search, Filter, Loader2, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { fetchInterviewerStats, generateCalendarDays, type DailyStats, type InterviewRecord } from '@/services/interviewDataService';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { socketService } from '@/services/socketService';
import type { User } from '@/types/user';

export function WorkbenchTab({ user }: { user: User }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'graph'>('calendar');
    const [allInterviews, setAllInterviews] = useState<InterviewRecord[]>([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);
    const [showDayModal, setShowDayModal] = useState(false);
    
    // Global Filter State
    const [selectedFilterDate, setSelectedFilterDate] = useState<string>('');
    const [listAccountFilter, setListAccountFilter] = useState('ALL');
    
    // UI State
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    
    // Ledger Modal Filtering
    const [modalSearch, setModalSearch] = useState('');
    const [modalAccountFilter, setModalAccountFilter] = useState('ALL');

    const loadInterviewerStats = useCallback(async () => {
        if (!user?.full_name) return;
        
        try {
            const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const stats = await fetchInterviewerStats(user.full_name, startDate, endDate);
            setDailyStats(stats);
        } catch (error) {
            console.error('Failed to load interviewer stats:', error);
        }
    }, [user?.full_name, currentMonth]);

    const loadAllInterviews = useCallback(async () => {
        if (!user?.full_name) return;
        
        setLoadingInterviews(true);
        try {
            const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
            
            const stats = await fetchInterviewerStats(user.full_name, startDate, endDate);
            const interviews = stats.flatMap((day: DailyStats) => day.interviews);
            setAllInterviews(interviews.sort((a: InterviewRecord, b: InterviewRecord) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Failed to load all interviews:', error);
        } finally {
            setLoadingInterviews(false);
        }
    }, [user?.full_name, currentMonth]);

    useEffect(() => {
        if (user?.full_name) {
            loadInterviewerStats();
            if (viewMode === 'list') {
                loadAllInterviews();
            }

            const socket = socketService.getSocket();
            socket.on('applications:updated', () => {
                console.log('[Socket] Applications updated, refreshing workbench...');
                loadInterviewerStats();
                if (viewMode === 'list') loadAllInterviews();
            });
            
            const interval = setInterval(() => {
                loadInterviewerStats();
                if (viewMode === 'list') loadAllInterviews();
            }, 60000); // Fallback polling
            
            return () => {
                socket.off('applications:updated');
                clearInterval(interval);
            };
        }
    }, [user?.full_name, currentMonth, viewMode, loadInterviewerStats, loadAllInterviews]);

    // Handle Month/Filter Reset
    const handleMonthChange = (dateString: string) => {
        const [year, month] = dateString.split('-').map(Number);
        setCurrentMonth(new Date(year, month, 1));
        setSelectedFilterDate(''); // Reset day filter when month changes
    };

    const handleDateSelect = async (date: string) => {
        setSelectedDate(new Date(date));
        const dayStats = dailyStats.find((stat: DailyStats) => stat.date === date);
        setSelectedDayStats(dayStats || null);
        setModalSearch('');
        setModalAccountFilter('ALL');
        setShowDayModal(true);
    };

    const calendarDays = generateCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
    const getStatsForDate = (date: string) => filteredDailyStats.find((stat: DailyStats) => stat.date === date);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const filteredDailyStats = useMemo(() => {
        return dailyStats.map(day => {
            const interviews = day.interviews.filter(i => {
                const matchesAccount = listAccountFilter === 'ALL' || i.department === listAccountFilter;
                return matchesAccount;
            });
            return {
                ...day,
                interviews,
                total_count: interviews.length,
                endorsed_count: interviews.filter(i => ['ENDORSED', 'PASSED'].includes(i.status)).length,
                failed_count: interviews.filter(i => i.status === 'FAILED').length
            };
        });
    }, [dailyStats, listAccountFilter]);

    const totalStats = useMemo(() => ({
        total: filteredDailyStats.reduce((sum: number, day: DailyStats) => sum + day.total_count, 0),
        endorsed: filteredDailyStats.reduce((sum: number, day: DailyStats) => sum + day.endorsed_count, 0),
        failed: filteredDailyStats.reduce((sum: number, day: DailyStats) => sum + day.failed_count, 0),
    }), [filteredDailyStats]);

    const formatSafeTime = (dateStr?: string) => {
        if (!dateStr) return 'Pending Slot';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Pending Slot';
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const accountDistribution = useMemo(() => {
        if (!selectedDayStats) return {};
        const distribution: Record<string, number> = {};
        selectedDayStats.interviews.forEach(i => {
            const acc = i.department || 'Unassigned';
            distribution[acc] = (distribution[acc] || 0) + 1;
        });
        return distribution;
    }, [selectedDayStats]);

    const availableAccountsList = useMemo(() => {
        const set = new Set<string>();
        allInterviews.forEach(i => set.add(i.department || 'Unassigned'));
        return Array.from(set).sort();
    }, [allInterviews]);

    const filteredModalLogs = useMemo(() => {
        if (!selectedDayStats) return [];
        return selectedDayStats.interviews.filter(i => {
            const matchesSearch = !modalSearch || 
                i.applicant_name.toLowerCase().includes(modalSearch.toLowerCase()) || 
                i.position_title.toLowerCase().includes(modalSearch.toLowerCase());
            const matchesAccount = modalAccountFilter === 'ALL' || i.department === modalAccountFilter;
            return matchesSearch && matchesAccount;
        });
    }, [selectedDayStats, modalSearch, modalAccountFilter]);

    const filteredInterviews = useMemo(() => {
        return allInterviews.filter((i: InterviewRecord) => {
            const matchesDate = !selectedFilterDate || i.created_at.startsWith(selectedFilterDate);
            const matchesAccount = listAccountFilter === 'ALL' || i.department === listAccountFilter;
            return matchesDate && matchesAccount;
        });
    }, [allInterviews, selectedFilterDate, listAccountFilter]);

    // Generate accurate Month/Year options for dropdown
    const getMonthOptions = () => {
        const options: { value: string; label: string }[] = [];
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 1; year <= currentYear + 1; year++) {
            for (let month = 0; month < 12; month++) {
                options.push({ value: `${year}-${month}`, label: `${monthNames[month]} ${year}` });
            }
        }
        return options;
    };

    // Refactored Date Options: Only show unique dates that HAVE data
    const getDateOptions = () => {
        const options: { value: string; label: string }[] = [{ value: '', label: 'ALL INTERVIEWS THIS MONTH' }];
        const uniqueDates = new Set<string>();
        
        filteredDailyStats
            .filter(s => s.total_count > 0)
            .sort((a, b) => b.date.localeCompare(a.date))
            .forEach(day => {
                if (!uniqueDates.has(day.date)) {
                    uniqueDates.add(day.date);
                    const d = new Date(day.date);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    options.push({ value: day.date, label: `${dayName}, ${formatDate(day.date)}` });
                }
            });
        return options;
    };

    const monthOptions = getMonthOptions();
    const dateOptions = getDateOptions();

    return (
        <div className="space-y-6">
            {/* Minimalist Header with View Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-surface-900 tracking-tight">Interview Workbench</h3>
                    <p className="text-sm text-surface-500 mt-1">Registry of daily interview quota and performance logs</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-surface-100/80 rounded-lg p-1 border border-surface-200">
                        <button onClick={() => setViewMode('calendar')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all", viewMode === 'calendar' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-900")}>
                            <Calendar size={14} /> Calendar
                        </button>
                        <button onClick={() => setViewMode('list')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-900")}>
                            <List size={14} /> List
                        </button>
                        <button onClick={() => setViewMode('graph')} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-widest transition-all", viewMode === 'graph' ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-900")}>
                            <BarChart2 size={14} /> Graph
                        </button>
                    </div>
                </div>
            </div>

            {/* Performance Snapshot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Endorsed', val: totalStats.endorsed, color: 'text-[#5c2d91]', bg: 'bg-[#5c2d91]/10', border: 'border-[#5c2d91]/20', icon: Users },
                    { label: 'Failed', val: totalStats.failed, color: 'text-[#d83b01]', bg: 'bg-[#d83b01]/10', border: 'border-[#d83b01]/20', icon: AlertCircle },
                    { label: 'Applicants Screened', val: totalStats.total, color: 'text-[#0078d4]', bg: 'bg-[#0078d4]/10', border: 'border-[#0078d4]/20', icon: Search },
                ].map(({ label, val, color, bg, border, icon: Icon }) => (
                    <div key={label} className={cn("border rounded-[2px] p-5 relative overflow-hidden group transition-all hover:bg-white", bg, border)}>
                        <div className="absolute top-0 right-0 p-3 opacity-[0.05] group-hover:scale-110 transition-transform"><Icon size={48} /></div>
                        <p className="text-[9px] font-black text-[#605e5c] uppercase tracking-[0.2em] mb-3">{label}</p>
                        <p className={cn("text-4xl font-black tracking-tighter leading-none", color)}>{val}</p>
                    </div>
                ))}
            </div>

            {/* Unified Filter Bar */}
            <div className="bg-white border-y border-surface-200 px-6 py-4 -mx-6 sm:mx-0 sm:rounded-lg sm:border shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-100 rounded-sm text-surface-500"><CalendarDays size={18} /></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Period Selection</span>
                                <select 
                                    value={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
                                    onChange={(e) => handleMonthChange(e.target.value)}
                                    className="text-xs font-black text-surface-800 uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0 cursor-pointer min-w-[120px]"
                                >
                                    {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-surface-200 hidden lg:block" />

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-100 rounded-sm text-surface-500"><Filter size={18} /></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Day Specifics</span>
                                <select 
                                    value={selectedFilterDate} 
                                    onChange={(e) => {
                                        setSelectedFilterDate(e.target.value);
                                        if (viewMode !== 'list') setViewMode('list');
                                    }}
                                    className="text-xs font-black text-surface-800 uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0 cursor-pointer min-w-[160px]"
                                >
                                    {dateOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                                </select>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-surface-200 hidden lg:block" />

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-100 rounded-sm text-surface-500"><Users size={18} /></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-surface-400 uppercase tracking-widest leading-none mb-1">Account Filter</span>
                                <select 
                                    value={listAccountFilter} 
                                    onChange={(e) => setListAccountFilter(e.target.value)}
                                    className="text-xs font-black text-surface-800 uppercase tracking-tight bg-transparent border-none focus:ring-0 p-0 cursor-pointer min-w-[140px]"
                                >
                                    <option value="ALL">ALL ACCOUNTS</option>
                                    {availableAccountsList.map(acc => (<option key={acc} value={acc}>{acc}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-surface-500 border-t lg:border-t-0 pt-4 lg:pt-0 border-surface-100">
                        <span className="hidden sm:inline">Active Registry:</span>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-surface-100 rounded-sm text-surface-900">{filteredInterviews.length} Sessions</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Content Area */}
            {viewMode === 'calendar' && (
                <div className="bg-white border border-surface-200 rounded-lg overflow-hidden animate-fade-in shadow-sm">
                    <div className="grid grid-cols-7 gap-px bg-surface-200">
                        {weekDays.map(day => (<div key={day} className="bg-surface-50 p-3 text-center"><span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{day}</span></div>))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-surface-200">
                        {calendarDays.map((day, index) => {
                            const stats = getStatsForDate(day.fullDate);
                            const isToday = new Date().toDateString() === new Date(day.fullDate).toDateString();
                            return (
                                <button key={`${day.fullDate}-${index}`} onClick={() => handleDateSelect(day.fullDate)} onMouseEnter={(e) => { setHoveredDate(day.fullDate); setTooltipPosition({ x: e.clientX, y: e.clientY }); }} onMouseLeave={() => setHoveredDate(null)}
                                    className={cn("bg-white p-3 min-h-[100px] text-left relative hover:bg-surface-50 transition-all", !day.isCurrentMonth && "opacity-30", isToday && "bg-surface-50")}>
                                    <div className={cn("text-[10px] font-black mb-2 px-1.5 py-0.5 inline-block rounded-sm", isToday ? "bg-primary-600 text-white" : "text-[#323130]")}>{day.date}</div>
                                    {stats && stats.total_count > 0 && (
                                        <div className="space-y-1.5">
                                            {[{ count: stats.endorsed_count, color: 'bg-[#5c2d91]' }, { count: stats.failed_count, color: 'bg-[#d83b01]' }, { count: stats.total_count, color: 'bg-[#0078d4]' }].map((m, i) => m.count > 0 && (
                                                <div key={i} className="flex items-center gap-1.5"><div className={cn("w-1 h-3 rounded-[0.5px]", m.color)} /><span className="text-[9px] font-bold text-[#605e5c]">{m.count}</span></div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {viewMode === 'list' && (
                <div className="bg-white border border-surface-200 rounded-lg overflow-hidden animate-fade-in shadow-sm">
                    <div className="divide-y divide-surface-100">
                        {loadingInterviews ? (
                            <div className="p-20 text-center flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-surface-400">Retrieving Logs...</p>
                            </div>
                        ) : filteredInterviews.length === 0 ? (
                            <div className="p-20 text-center flex flex-col items-center justify-center">
                                <Users size={40} className="text-surface-100 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest text-surface-300">No logs found for selection</p>
                            </div>
                        ) : (
                            filteredInterviews.map((interview) => (
                                <div key={interview.id} className="p-5 hover:bg-surface-50 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className={cn("w-1 h-8 rounded-[1px]", interview.status === 'PASSED' ? 'bg-[#107c10]' : interview.status === 'ENDORSED' ? 'bg-[#5c2d91]' : interview.status === 'FAILED' ? 'bg-[#d83b01]' : 'bg-[#0078d4]')} />
                                            <div>
                                                <p className="text-xs font-black text-surface-900 uppercase tracking-tight group-hover:text-primary-600 transition-colors">{interview.applicant_name}</p>
                                                <p className="text-[10px] font-black text-primary-600/80 mt-1 uppercase tracking-widest">{interview.department} • {interview.room_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className={cn("px-3 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest border", interview.status === 'PASSED' ? 'bg-[#107c10]/10 text-[#107c10] border-[#107c10]/20' : interview.status === 'ENDORSED' ? 'bg-[#5c2d91]/10 text-[#5c2d91] border-[#5c2d91]/20' : interview.status === 'FAILED' ? 'bg-[#d83b01]/10 text-[#d83b01] border-[#d83b01]/20' : 'bg-[#0078d4]/10 text-[#0078d4] border-[#0078d4]/20')}>{interview.status}</span>
                                            <span className="text-[10px] font-black text-surface-400 uppercase tracking-tighter min-w-[80px] text-right">{formatDate(interview.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'graph' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-white border border-surface-200 rounded-sm p-8 shadow-sm min-h-[450px] relative">
                        <div className="flex items-center justify-between mb-10 pb-4 border-b border-surface-100">
                            <h4 className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Monthly Screening Trend</h4>
                            <div className="flex items-center gap-4 text-[9px] font-black uppercase text-surface-400">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#0078d4]" /> SCREENED</div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#5c2d91]" /> ENDORSED</div>
                            </div>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredDailyStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <defs><linearGradient id="trendPassed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#107c10" stopOpacity={0.15}/><stop offset="95%" stopColor="#107c10" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2f1" />
                                    <XAxis dataKey="date" tickFormatter={(str) => new Date(str).getDate().toString()} tick={{ fontSize: 9, fill: '#a19f9d', fontWeight: 800 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: '#a19f9d', fontWeight: 800 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={({ active, payload, label }) => active && payload && payload.length ? (
                                        <div className="bg-[#323130] text-white p-4 rounded-sm shadow-2xl border border-[#323130] min-w-[160px]">
                                            <p className="text-[10px] font-black mb-3 uppercase tracking-widest text-[#a19f9d] border-b border-[#605e5c] pb-2">{formatDate(String(label || ''))}</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center"><span className="text-[8px] font-black uppercase text-[#a19f9d]">Screened</span><span className="font-black text-[#0078d4] text-sm">{payload[0].value}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-[8px] font-black uppercase text-[#a19f9d]">Endorsed</span><span className="font-black text-[#5c2d91] text-sm">{payload[1]?.value || 0}</span></div>
                                            </div>
                                        </div>
                                    ) : null} />
                                    <Area type="monotone" dataKey="total_count" stroke="#0078d4" strokeWidth={3} fill="transparent" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="endorsed_count" stroke="#5c2d91" strokeWidth={3} fill="url(#trendPassed)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white border border-surface-200 rounded-sm p-8 shadow-sm min-h-[450px] relative">
                        <div className="flex items-center justify-between mb-10 pb-4 border-b border-surface-100"><h4 className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Efficiency Distribution</h4><span className="px-3 py-1 bg-surface-50 text-[9px] font-black uppercase border border-surface-200 rounded-sm">Current Month</span></div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{ name: 'Endorsed', val: totalStats.endorsed, color: '#5c2d91' }, { name: 'Failed', val: totalStats.failed, color: '#d83b01' }, { name: 'Screened', val: totalStats.total, color: '#0078d4' }]} barSize={40} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2f1" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#323130', fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a19f9d', fontWeight: 800 }} />
                                    <Tooltip cursor={{ fill: '#f3f2f1', opacity: 0.5 }} content={({ active, payload }) => active && payload && payload.length ? (
                                        <div className="bg-[#323130] text-white p-4 rounded-sm shadow-2xl min-w-[120px]">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[#a19f9d] mb-1">{payload[0].name}</p>
                                            <p className="text-xl font-black" style={{ color: payload[0].payload.color }}>{payload[0].value}</p>
                                        </div>
                                    ) : null} />
                                    <Bar dataKey="val" radius={[1, 1, 0, 0]} isAnimationActive={false}>{[ { color: '#5c2d91' }, { color: '#d83b01' }, { color: '#0078d4' } ].map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 pt-6 border-t border-surface-100 flex justify-between items-center"><span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Endorsement Rate</span><span className="text-[#5c2d91] bg-[#5c2d91]/10 px-4 py-1.5 rounded-sm font-black text-xs border border-[#5c2d91]/20 tracking-tighter">{totalStats.total > 0 ? Math.round((totalStats.endorsed / totalStats.total) * 100) : 0}% OVERALL</span></div>
                    </div>
                </div>
            )}

            {hoveredDate && (() => {
                const stats = getStatsForDate(hoveredDate);
                const date = new Date(hoveredDate);
                return (
                    <div className="fixed z-50 bg-[#323130] text-white p-4 rounded-sm shadow-2xl border border-[#323130] pointer-events-none animate-fade-in" style={{ left: `${tooltipPosition.x + 15}px`, top: `${tooltipPosition.y - 15}px`, transform: 'translateY(-100%)' }}>
                        <div className="text-[10px] font-black uppercase tracking-widest border-b border-[#605e5c] pb-2 mb-3">{date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        {stats ? (<div className="space-y-2">
                            {[{ label: 'Endorsed', count: stats.endorsed_count, color: 'text-[#5c2d91]' }, { label: 'Failed', count: stats.failed_count, color: 'text-[#d83b01]' }, { label: 'Screened', count: stats.total_count, color: 'text-[#0078d4]' }].map(cat => cat.count > 0 && (<div key={cat.label} className="flex justify-between items-center min-w-[140px]"><span className="text-[8px] font-black uppercase text-[#a19f9d] tracking-widest">{cat.label}</span><span className={cn("font-black text-sm ml-4", cat.color)}>{cat.count}</span></div>))}
                        </div>) : <p className="text-[8px] font-bold text-[#a19f9d] uppercase italic">No data</p>}
                    </div>
                );
            })()}

            <Modal open={showDayModal} onClose={() => setShowDayModal(false)} title={`Ledger Entry: ${formatDate(selectedDayStats?.date || '')}`} size="lg">
                {selectedDayStats && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-3 gap-3">
                            {[{ label: 'Endorsed', count: selectedDayStats.endorsed_count, color: 'text-[#5c2d91]', bg: 'bg-[#5c2d91]/5' }, { label: 'Failed', count: selectedDayStats.failed_count, color: 'text-[#d83b01]', bg: 'bg-[#d83b01]/5' }, { label: 'Applicants Screened', count: selectedDayStats.total_count, color: 'text-[#0078d4]', bg: 'bg-[#0078d4]/5' }].map(m => (
                                <div key={m.label} className={cn("p-4 border border-[#edebe9] rounded-sm text-center", m.bg)}><p className="text-[8px] font-black text-[#a19f9d] uppercase tracking-widest mb-1">{m.label}</p><p className={cn("text-xl font-black", m.color)}>{m.count}</p></div>
                            ))}
                        </div>
                        <div className="p-6 bg-surface-50 border border-surface-200 rounded-sm">
                            <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] mb-4">Account Distribution</h4>
                            <div className="flex flex-wrap gap-6">
                                {Object.entries(accountDistribution).map(([name, count]) => (
                                    <div key={name} className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary-600" /><div className="flex items-baseline gap-2"><span className="text-[10px] font-black text-surface-800 uppercase tracking-widest">{name}</span><span className="text-sm font-black text-primary-600">{count}</span></div></div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-surface-100 pb-4">
                                <h4 className="text-[10px] font-black text-surface-900 uppercase tracking-widest">Interview logs</h4>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Search..." value={modalSearch} onChange={e => setModalSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-surface-200 rounded-sm text-xs font-bold focus:border-primary-600 focus:outline-none" /></div>
                                    <div className="relative w-full sm:w-48"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><select value={modalAccountFilter} onChange={e => setModalAccountFilter(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-surface-200 rounded-sm text-[10px] font-black uppercase tracking-widest focus:border-primary-600 focus:outline-none appearance-none cursor-pointer"><option value="ALL">All accounts</option>{Object.keys(accountDistribution).map(acc => (<option key={acc} value={acc}>{acc}</option>))}</select></div>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {filteredModalLogs.map(interview => (
                                    <div key={interview.id} className="flex items-center justify-between p-4 border border-surface-100 rounded-sm hover:bg-surface-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-1 h-6 rounded-sm", interview.status === 'PASSED' ? 'bg-[#107c10]' : interview.status === 'ENDORSED' ? 'bg-[#5c2d91]' : interview.status === 'FAILED' ? 'bg-[#d83b01]' : 'bg-[#0078d4]')} />
                                            <div>
                                                <p className="text-[11px] font-black text-surface-900 uppercase group-hover:text-primary-600 transition-colors">{interview.applicant_name}</p>
                                                <p className="text-[10px] font-black text-primary-600/70 uppercase tracking-widest">{interview.department}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4"><span className={cn("px-2 py-0.5 text-[8px] font-black uppercase border rounded-sm", interview.status === 'PASSED' ? 'bg-[#107c10]/10 text-[#107c10] border-[#107c10]/20' : interview.status === 'ENDORSED' ? 'bg-[#5c2d91]/10 text-[#5c2d91] border-[#5c2d91]/20' : interview.status === 'FAILED' ? 'bg-[#d83b01]/10 text-[#d83b01] border-[#d83b01]/20' : 'bg-[#0078d4]/10 text-[#0078d4] border-[#0078d4]/20')}>{interview.status}</span><p className="text-[9px] font-black text-surface-400 uppercase">{formatSafeTime(interview.created_at)}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
