import React, { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Trash2, X } from 'lucide-react';
import { cooldownService, CooldownEntry, AttemptHistoryLog } from '@/services/cooldownService';
import { apiClient } from '@/utils/apiClient';
import { WeekDropdown } from '@/pages/recruiter/components/Dashboard/WeekDropdown';
import { MonthDropdown } from '@/pages/recruiter/components/Dashboard/MonthDropdown';
import { RangeDropdown } from '@/pages/recruiter/components/Dashboard/RangeDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface AttemptRecord {
    id: string;
    applicant_name: string;
    applicant_email: string;
    wpm: number;
    accuracy: number;
    time_taken: number;
    errors: number;
    total_words: number;
    is_passed: boolean;
    attempt_number: number;
    created_at: string;
}

// Mocking chart data points
const generateMockChartData = (wpm: number, accuracy: number) => {
    const data = [];
    let currentWpm = Math.max(0, wpm - 10);
    for (let i = 1; i <= 60; i++) {
        // Random fluctuation around the final WPM
        currentWpm = Math.max(0, Math.min(120, currentWpm + (Math.random() * 10 - 5)));
        if (i > 45) {
            // Converge to final WPM
            currentWpm = currentWpm + (wpm - currentWpm) * 0.1;
        }
        data.push({ second: i, wpm: currentWpm, acc: accuracy - (Math.random() * 5) });
    }
    return data;
};

// SVG Chart component
const PerformanceChart = ({ wpm, accuracy }: { wpm: number; accuracy: number }) => {
    const data = useMemo(() => generateMockChartData(wpm, accuracy), [wpm, accuracy]);
    const maxWpm = Math.max(120, wpm + 20);
    const height = 150;
    const width = 400;

    const points = data.map((d, i) => {
        const x = (i / 60) * width;
        const y = height - (d.wpm / maxWpm) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative w-full h-[180px] bg-[#1a1714] rounded-lg p-4 font-mono">
            <div className="absolute top-2 left-4 text-[9px] font-bold text-surface-500 tracking-widest uppercase">Words Per Minute</div>
            <div className="absolute top-2 right-4 text-[9px] font-bold text-surface-500 tracking-widest uppercase">Errors</div>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(ratio => (
                    <line key={ratio} x1="0" y1={height * ratio} x2={width} y2={height * ratio} stroke="#333" strokeDasharray="2 2" strokeWidth="1" />
                ))}
                {/* WPM Line */}
                <polyline
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="2"
                    points={points}
                />
                {/* Error markers (mocked) */}
                {data.filter((_, i) => i % 5 === 0 && Math.random() > 0.5).map((d, i) => (
                    <text key={i} x={(d.second / 60) * width} y={height - 5} fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">x</text>
                ))}
            </svg>
        </div>
    );
};

export function TypingMonitoringTab() {
    const [activeTab, setActiveTab] = useState<'new' | 'logs'>('new');
    const [allAttempts, setAllAttempts] = useState<AttemptRecord[]>([]);
    const [cooldowns, setCooldowns] = useState<CooldownEntry[]>([]);
    const [search, setSearch] = useState('');
    const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

    // Date Filter State
    const [dateFilter, setDateFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'RANGE' | 'ALL'>('ALL');
    const [dateSub, setDateSub] = useState<{
        weekIndex?: number;
        year?: number;
        month?: number;
        day?: number;
        startDate?: string;
        endDate?: string;
    }>({});
    const [openDropdown, setOpenDropdown] = useState<'WEEK' | 'MONTH' | 'RANGE' | null>(null);
    const filterCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const now = new Date();
    const weeksInMonth = useMemo(() => {
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const weeks = [];
        let currentWeekStart = new Date(firstDay);
        const dayOfWeek = currentWeekStart.getDay();
        const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        currentWeekStart = new Date(currentWeekStart.setDate(diff));

        let weekIndex = 0;
        while (currentWeekStart <= lastDay) {
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
            weeks.push({
                label: `Week ${weekIndex + 1} · ${currentWeekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${currentWeekEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
                weekIndex,
                startStr: currentWeekStart.toISOString().split('T')[0],
                endStr: currentWeekEnd.toISOString().split('T')[0]
            });
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekIndex++;
        }
        return weeks;
    }, [now]);

    const handleFilterChange = (filter: 'TODAY' | 'WEEK' | 'MONTH' | 'RANGE' | 'ALL') => {
        setDateFilter(filter);
        if (filter !== 'RANGE') {
            setDateSub({});
        }
        setOpenDropdown(null);
    };

    const cancelFilterClose = () => {
        if (filterCloseTimer.current) {
            clearTimeout(filterCloseTimer.current);
            filterCloseTimer.current = null;
        }
    };

    const scheduleFilterClose = () => {
        cancelFilterClose();
        filterCloseTimer.current = setTimeout(() => setOpenDropdown(null), 150);
    };

    useEffect(() => () => cancelFilterClose(), []);

    const loadData = async () => {
        try {
            const res = await apiClient.get('/typing-test/logs');
            if (res.data) {
                if (res.data.allAttempts) setAllAttempts(res.data.allAttempts);
            }
        } catch (e) {
            console.error('Failed to load typing test logs', e);
        }
        
        cooldownService.cleanupExpiredCooldowns();
        setCooldowns(cooldownService._getCooldowns() || []);
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Group all attempts by applicant email (or name as fallback)
    const groupedAttempts = useMemo(() => {
        const groups: Record<string, AttemptRecord[]> = {};
        for (const attempt of allAttempts) {
            // Prefer email for unique grouping, fallback to name, then 'Unknown'
            const identifier = attempt.applicant_email?.trim() || attempt.applicant_name?.trim() || 'Unknown';
            if (!groups[identifier]) groups[identifier] = [];
            groups[identifier].push(attempt);
        }
        // Sort each group by created_at desc
        for (const identifier of Object.keys(groups)) {
            groups[identifier].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return groups;
    }, [allAttempts]);

    // Filter by search
    const { newIdentifiers, logIdentifiers } = useMemo(() => {
        const identifiers = Object.keys(groupedAttempts);
        let filtered = identifiers;
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            filtered = identifiers.filter(id => {
                const attempts = groupedAttempts[id];
                const nameMatch = attempts[0]?.applicant_name?.toLowerCase().includes(q);
                const emailMatch = attempts[0]?.applicant_email?.toLowerCase().includes(q);
                return id.toLowerCase().includes(q) || nameMatch || emailMatch;
            });
        }
        
        const now = new Date().getTime();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        
        const newIds: string[] = [];
        const logIds: string[] = [];
        
        filtered.forEach(id => {
            const attempts = groupedAttempts[id];
            const mostRecentAttempt = attempts[0];
            const attemptTime = new Date(mostRecentAttempt.created_at).getTime();
            
            // Apply Date Filter logic
            let passesFilter = true;
            if (dateFilter !== 'ALL') {
                const dateObj = new Date(mostRecentAttempt.created_at);
                const toManilaDateString = (d: Date) => {
                    const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
                    return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
                };
                
                if (dateFilter === 'TODAY') {
                    passesFilter = toManilaDateString(dateObj) === toManilaDateString(new Date());
                } else if (dateFilter === 'WEEK' && dateSub.weekIndex != null) {
                    const week = weeksInMonth[dateSub.weekIndex];
                    if (week) {
                        const ds = toManilaDateString(dateObj);
                        passesFilter = ds >= week.startStr && ds <= week.endStr;
                    }
                } else if (dateFilter === 'MONTH' && dateSub.year != null && dateSub.month != null) {
                    const local = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
                    passesFilter = local.getFullYear() === dateSub.year && local.getMonth() === dateSub.month;
                    if (passesFilter && dateSub.day != null) {
                        passesFilter = local.getDate() === dateSub.day;
                    }
                } else if (dateFilter === 'RANGE' && dateSub.startDate && dateSub.endDate) {
                    const ds = toManilaDateString(dateObj);
                    passesFilter = ds >= dateSub.startDate && ds <= dateSub.endDate;
                }
            }

            if (passesFilter) {
                if (now - attemptTime <= TWELVE_HOURS) {
                    newIds.push(id);
                } else {
                    logIds.push(id);
                }
            }
        });
        
        return { newIdentifiers: newIds, logIdentifiers: logIds };
    }, [groupedAttempts, search, dateFilter, dateSub, weeksInMonth]);

    const activeNames = activeTab === 'new' ? newIdentifiers : logIdentifiers;
    
    // Timer component for the cooldown
    const CooldownTimer = ({ expiresAt }: { expiresAt: string }) => {
        const [timeLeft, setTimeLeft] = useState('');
        
        useEffect(() => {
            const updateTimer = () => {
                const diff = new Date(expiresAt).getTime() - new Date().getTime();
                if (diff <= 0) {
                    setTimeLeft('00:00:00');
                    return;
                }
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }, [expiresAt]);

        return <span className="text-[10px] font-bold text-[#b6afff] bg-[#e1deff] px-2 py-0.5 rounded flex items-center gap-1"><Clock size={10} /> {timeLeft} LEFT</span>;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        const month = d.toLocaleString('en-US', { month: 'long' });
        const day = d.getDate();
        const year = d.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    // Modal data
    const modalAttempts = selectedApplicant ? groupedAttempts[selectedApplicant] || [] : [];
    const bestAttemptGlobal = modalAttempts.reduce((best, curr) => curr.wpm > best.wpm ? curr : best, modalAttempts[0]);
    const modalSelectedAttempt = modalAttempts.find(a => a.id === selectedAttemptId) || bestAttemptGlobal;

    const handleDeleteUser = async (name: string) => {
        try {
            await apiClient.post('/typing-test/clear', { applicantName: name });
            setSelectedApplicant(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="min-h-screen bg-[#faf9f8] p-8 font-sans">
            <div className="max-w-[1400px] mx-auto">
                
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[#323130] dark:text-slate-300 mb-1">Applicant Results</h1>
                        <h2 className="text-[12px] font-medium text-[#605e5c] dark:text-slate-400">Highest score per applicant with all attempts preserved</h2>
                    </div>
                    <div className="text-right">
                        <div className="text-[12px] font-medium text-[#605e5c] dark:text-slate-400 mb-1">Total Records</div>
                        <div className="text-2xl font-bold text-[#323130] dark:text-slate-300">{Object.keys(groupedAttempts).length}</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white dark:bg-slate-900 border-y border-[#e1dfdd] flex items-center justify-between mb-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="flex">
                        <button 
                            onClick={() => setActiveTab('new')}
                            className={`px-6 py-3 text-[13px] font-semibold transition-all rounded-none border-b-2 ${activeTab === 'new' ? 'border-[#0078d4] text-[#0078d4]' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:bg-[#faf9f8]'}`}
                        >
                            New ({newIdentifiers.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('logs')}
                            className={`px-6 py-3 text-[13px] font-semibold transition-all rounded-none border-b-2 ${activeTab === 'logs' ? 'border-[#0078d4] text-[#0078d4]' : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:bg-[#faf9f8]'}`}
                        >
                            Logs ({logIdentifiers.length})
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mr-3">
                        {/* Date Filter */}
                        <div
                            className="flex bg-black/80 dark:bg-black/40 backdrop-blur-sm p-1 rounded-none border border-black/10 dark:border-white/10 relative z-30 shadow-inner"
                            onMouseLeave={scheduleFilterClose}
                        >
                            {(['TODAY', 'WEEK', 'MONTH', 'RANGE', 'ALL'] as const).map((filter) => {
                                const hasDropdown = filter === 'WEEK' || filter === 'MONTH' || filter === 'RANGE';
                                const isOpen = openDropdown === filter;
                                const isActive = dateFilter === filter;
                                const subLabel =
                                    filter === 'WEEK' && dateSub.weekIndex != null && dateSub.weekIndex >= 0
                                        ? `W${dateSub.weekIndex + 1}`
                                        : filter === 'MONTH' && dateSub.month != null
                                        ? `${new Date(2020, dateSub.month, 1).toLocaleDateString([], { month: 'short' }).toUpperCase()}${dateSub.day != null ? ` ${dateSub.day}` : ''}`
                                        : filter === 'RANGE' && dateSub.startDate && dateSub.endDate
                                        ? `${dateSub.startDate.slice(5)} - ${dateSub.endDate.slice(5)}`
                                        : null;

                                return (
                                    <div key={filter} className="relative">
                                        <motion.button
                                            whileTap={{ scale: 0.92 }}
                                            transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                                            onClick={() => {
                                                if (hasDropdown) {
                                                    if (!isActive && filter !== 'RANGE') setDateFilter(filter);
                                                    setOpenDropdown(isOpen ? null : filter);
                                                } else {
                                                    handleFilterChange(filter);
                                                }
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors duration-150 rounded-none flex items-center gap-1 active:scale-95",
                                                isActive ? "text-white" : "text-white/60 hover:text-white"
                                            )}
                                        >
                                            {filter}
                                            {subLabel && (
                                                <span className={cn(
                                                    "ml-0.5 px-1.5 py-0.5 rounded-none text-[8px] font-bold",
                                                    isActive ? "bg-white/20 text-white" : "bg-white/10 text-white"
                                                )}>
                                                    {subLabel}
                                                </span>
                                            )}
                                            {hasDropdown && (
                                                <ChevronDown size={9} className={cn("transition-transform", isOpen && "rotate-180")} />
                                            )}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="trackerActiveFilterBg"
                                                    className="absolute inset-0 bg-[#0078d4] shadow-sm rounded-none z-[-1]"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.7 }}
                                                />
                                            )}
                                        </motion.button>

                                        <AnimatePresence>
                                            {filter === 'WEEK' && isOpen && (
                                                <WeekDropdown
                                                    key="week-dropdown"
                                                    weeks={weeksInMonth}
                                                    selected={dateSub.weekIndex}
                                                    onSelect={(idx) => {
                                                        setDateSub({ weekIndex: idx });
                                                        setDateFilter('WEEK');
                                                        setOpenDropdown(null);
                                                    }}
                                                    onMouseEnter={cancelFilterClose}
                                                />
                                            )}
                                            {filter === 'MONTH' && isOpen && (
                                                <MonthDropdown
                                                    key="month-dropdown"
                                                    year={dateSub.year ?? now.getFullYear()}
                                                    month={dateSub.month ?? now.getMonth()}
                                                    day={dateSub.day}
                                                    onPickMonth={(y, m) => {
                                                        setDateSub({ year: y, month: m, day: undefined });
                                                        setDateFilter('MONTH');
                                                    }}
                                                    onPickDay={(d) => {
                                                        setDateSub(prev => ({ ...prev, day: d }));
                                                        setDateFilter('MONTH');
                                                        setOpenDropdown(null);
                                                    }}
                                                    onClose={() => setOpenDropdown(null)}
                                                    onMouseEnter={cancelFilterClose}
                                                />
                                            )}
                                            {filter === 'RANGE' && isOpen && (
                                                <RangeDropdown
                                                    key="range-dropdown"
                                                    startDate={dateSub.startDate}
                                                    endDate={dateSub.endDate}
                                                    onApply={(s, e) => {
                                                        setDateSub({ startDate: s, endDate: e });
                                                        setDateFilter('RANGE');
                                                        setOpenDropdown(null);
                                                    }}
                                                    onClose={() => setOpenDropdown(null)}
                                                    onMouseEnter={cancelFilterClose}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="relative w-[250px] h-[34px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c] dark:text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name or email..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-full bg-[#faf9f8] border border-[#e1dfdd] text-[12px] font-medium text-[#323130] dark:text-slate-300 placeholder-[#a19f9d] pl-9 pr-4 outline-none rounded-none focus:bg-white dark:bg-slate-900 focus:border-[#0078d4] transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeNames.map(name => {
                        const attempts = groupedAttempts[name];
                        const bestAttempt = attempts.reduce((best, curr) => curr.wpm > best.wpm ? curr : best, attempts[0]);
                        const isPassed = bestAttempt.is_passed;
                        const cooldown = cooldowns.find(c => c.name.toLowerCase() === name.toLowerCase());

                        return (
                            <div 
                                key={name} 
                                onClick={() => { setSelectedApplicant(name); setSelectedAttemptId(bestAttempt.id); }}
                                className="bg-white dark:bg-slate-900 hover:bg-[#faf9f8] cursor-pointer transition-all duration-200 border border-[#e1dfdd] rounded-none p-5 relative group shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase">Applicant</span>
                                        {activeTab === 'new' && (
                                            <span className="bg-[#e1dfdd] text-[#323130] dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-none">NEW</span>
                                        )}
                                    </div>
                                    {cooldown && <CooldownTimer expiresAt={cooldown.expiresAt} />}
                                    {!cooldown && <div className="w-4 h-4" />}
                                </div>

                                <div className="mb-5">
                                    <h3 className="text-[15px] font-bold text-[#323130] dark:text-slate-300 truncate">{attempts[0].applicant_name || 'Unknown'}</h3>
                                    <p className="text-[12px] font-medium text-[#605e5c] dark:text-slate-400 truncate">{attempts[0].applicant_email || 'No email provided'}</p>
                                    <p className="text-[10px] font-medium text-[#a19f9d] mt-1">{formatDate(attempts[0].created_at)}</p>
                                </div>

                                <div className="flex items-end justify-between mb-5">
                                    <div>
                                        <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-1 uppercase">Best WPM</div>
                                        <div className="text-2xl font-bold text-[#323130] dark:text-slate-300 leading-none">{bestAttempt.wpm}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-1 uppercase">Accuracy</div>
                                        <div className="text-2xl font-bold text-[#323130] dark:text-slate-300 leading-none">{bestAttempt.accuracy}<span className="text-[14px] text-[#605e5c] dark:text-slate-400">%</span></div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-1 uppercase">Attempts</div>
                                        <div className="text-xl font-bold text-[#323130] dark:text-slate-300 leading-none">{attempts.length}<span className="text-[12px] text-[#605e5c] dark:text-slate-400">/3</span></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-[#e1dfdd]">
                                    <div className={`text-[11px] font-bold uppercase ${isPassed ? 'text-[#107c10]' : 'text-[#d13438]'}`}>
                                        {isPassed ? 'Qualified' : 'Not Qualified'}
                                    </div>
                                    <div className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400">
                                        Attempt {bestAttempt.attempt_number}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedApplicant && modalSelectedAttempt && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8" onClick={() => setSelectedApplicant(null)}>
                    <div className="bg-[#faf9f8] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 bg-white dark:bg-slate-900 border-b border-[#e1dfdd] flex items-start justify-between">
                            <div>
                                <h3 className="text-[12px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mb-1">Attempt Infrastructure & Performance Analytics</h3>
                                <h2 className="text-2xl font-bold text-[#323130] dark:text-slate-300">{modalAttempts[0]?.applicant_name || 'Unknown'}</h2>
                                <p className="text-[13px] font-medium text-[#605e5c] dark:text-slate-400">{modalAttempts[0]?.applicant_email || 'No email provided'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDeleteUser(selectedApplicant)} className="w-9 h-9 flex items-center justify-center border border-[#e1dfdd] bg-[#faf9f8] hover:bg-white dark:bg-slate-900 text-[#d13438] transition-colors cursor-pointer rounded-none">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={() => setSelectedApplicant(null)} className="w-9 h-9 flex items-center justify-center border border-[#e1dfdd] bg-[#faf9f8] hover:bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 transition-colors cursor-pointer rounded-none">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Left Sidebar */}
                            <div className="w-72 bg-[#faf9f8] border-r border-[#e1dfdd] flex flex-col">
                                <div className="p-6 bg-white dark:bg-slate-900 border-b border-[#e1dfdd]">
                                    <div className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mb-4">Applicant Records Summary</div>
                                    <div className="flex gap-8">
                                        <div>
                                            <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-1 uppercase">Best WPM</div>
                                            <div className="text-2xl font-bold text-[#323130] dark:text-slate-300 leading-none">{bestAttemptGlobal?.wpm || 0}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-1 uppercase">Best Acc</div>
                                            <div className="text-2xl font-bold text-[#323130] dark:text-slate-300 leading-none">{bestAttemptGlobal?.accuracy || 0}<span className="text-[14px] text-[#605e5c] dark:text-slate-400">%</span></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 pb-2 text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">
                                    Attempts History ({modalAttempts.length})
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {modalAttempts.map((attempt) => (
                                        <div 
                                            key={attempt.id}
                                            onClick={() => setSelectedAttemptId(attempt.id)}
                                            className={`p-4 cursor-pointer transition-all rounded-none border ${
                                                selectedAttemptId === attempt.id 
                                                    ? 'bg-white dark:bg-slate-900 border-[#e1dfdd] border-l-4 border-l-[#0078d4] shadow-sm' 
                                                    : 'bg-[#faf9f8] border-transparent hover:bg-white dark:bg-slate-900 hover:border-[#e1dfdd]'
                                            }`}
                                        >
                                            <div className="font-bold text-[#323130] dark:text-slate-300 text-[13px] mb-2 uppercase">Attempt {attempt.attempt_number}</div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <div className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 mb-0.5 uppercase">WPM / ACC</div>
                                                    <div className="font-bold text-[#323130] dark:text-slate-300 text-[14px]">
                                                        {attempt.wpm} <span className="text-[#605e5c] dark:text-slate-400 font-medium">/ {attempt.accuracy}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-medium text-[#605e5c] dark:text-slate-400">
                                                    {formatDate(attempt.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Analytics View */}
                            <div className="flex-1 bg-white dark:bg-slate-900 p-8 overflow-y-auto">
                                <div className="flex items-center justify-between bg-[#faf9f8] border border-[#e1dfdd] p-4 mb-6 rounded-none">
                                    <div>
                                        <div className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider mb-1">Prompt Details</div>
                                        <div className="text-[16px] font-bold text-[#323130] dark:text-slate-300">D3</div>
                                    </div>
                                    <div className={`px-4 py-2 text-[11px] font-bold uppercase rounded-none border ${
                                        modalSelectedAttempt?.is_passed ? 'bg-[#dff6dd] text-[#107c10] border-[#107c10]' : 'bg-[#fde7e9] text-[#d13438] border-[#d13438]'
                                    }`}>
                                        {modalSelectedAttempt?.is_passed ? 'Qualified' : 'Not Qualified'}
                                    </div>
                                </div>

                                {/* Mock Monkeytype Dashboard, but matching light fluent palette */}
                                <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-none p-8 font-mono relative">
                                    <div className="flex gap-12 mb-8">
                                        <div className="w-24">
                                            <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">WPM</div>
                                            <div className="text-5xl font-bold text-[#0078d4] leading-none">{modalSelectedAttempt?.wpm || 0}</div>
                                        </div>
                                        
                                        <div className="flex-1 relative h-32 mt-4 border-l border-b border-[#e1dfdd] pl-4 pb-4">
                                            <div className="absolute top-0 right-0 text-[9px] text-[#a19f9d] uppercase">Errors</div>
                                            <div className="absolute -top-4 left-4 text-[9px] text-[#a19f9d] uppercase">Words per minute</div>
                                            {/* Mock chart SVG */}
                                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                                                {/* Grid lines */}
                                                <line x1="0" y1="10" x2="100" y2="10" stroke="#e1dfdd" strokeWidth="0.2" strokeDasharray="1,1" />
                                                <line x1="0" y1="20" x2="100" y2="20" stroke="#e1dfdd" strokeWidth="0.2" strokeDasharray="1,1" />
                                                <line x1="0" y1="30" x2="100" y2="30" stroke="#e1dfdd" strokeWidth="0.2" strokeDasharray="1,1" />
                                                {/* Line graph */}
                                                <path 
                                                    d="M0,25 Q10,28 20,30 T40,28 T60,25 T80,20 L100,15" 
                                                    fill="none" 
                                                    stroke="#0078d4" 
                                                    strokeWidth="1.5" 
                                                />
                                                {/* Mock error points */}
                                                {Array.from({ length: modalSelectedAttempt?.errors || 0 }).map((_, i) => (
                                                    <circle key={i} cx={10 + i * (90/Math.max(1, modalSelectedAttempt?.errors || 1))} cy={25 + Math.random()*5} r="1" fill="#d13438" />
                                                ))}
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="w-24 mb-10">
                                        <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">ACC</div>
                                        <div className="text-4xl font-bold text-[#0078d4] leading-none">{modalSelectedAttempt?.accuracy || 0}<span className="text-2xl text-[#605e5c] dark:text-slate-400">%</span></div>
                                    </div>

                                    <div className="w-32 mb-12">
                                        <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">TEST TYPE</div>
                                        <div className="text-[13px] font-bold text-[#0078d4]">TIME 60S</div>
                                        <div className="text-[12px] text-[#605e5c] dark:text-slate-400">INTERMEDIATE</div>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-[#e1dfdd] pt-6">
                                        <div>
                                            <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">RAW</div>
                                            <div className="text-2xl font-bold text-[#323130] dark:text-slate-300">{Math.round((modalSelectedAttempt?.wpm || 0) * 1.15)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">CHARACTERS</div>
                                            <div className="text-2xl font-bold text-[#0078d4]">
                                                {Math.round((modalSelectedAttempt?.wpm || 0) * 5)}<span className="text-[#605e5c] dark:text-slate-400 px-1">/</span>
                                                <span className="text-[#323130] dark:text-slate-300">{modalSelectedAttempt?.errors || 0}</span><span className="text-[#605e5c] dark:text-slate-400 px-1">/</span>
                                                <span className="text-[#323130] dark:text-slate-300">0</span><span className="text-[#605e5c] dark:text-slate-400 px-1">/</span>
                                                <span className="text-[#323130] dark:text-slate-300">0</span>
                                            </div>
                                            <div className="text-[9px] text-[#a19f9d] uppercase tracking-wider mt-1">CORR/INC/EXTRA/MISS</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] text-[#605e5c] dark:text-slate-400 mb-1">CONSISTENCY</div>
                                            <div className="text-2xl font-bold text-[#323130] dark:text-slate-300">{Math.max(60, (modalSelectedAttempt?.accuracy || 0) - (modalSelectedAttempt?.errors || 0))}<span className="text-lg text-[#605e5c] dark:text-slate-400">%</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
