import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Building2, LayoutGrid, CalendarClock, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/formatters';

export function H2RCreationView() {
    const location = useLocation();
    
    // Determine which tab is active based on path
    const getActiveTab = () => {
        if (location.pathname.endsWith('/accounts')) return 'accounts';
        if (location.pathname.endsWith('/division')) return 'division';
        if (location.pathname.endsWith('/time-off')) return 'time-off';
        return 'accounts';
    };

    const activeTab = getActiveTab();

    const tabs = [
        { 
            id: 'accounts', 
            label: 'Accounts', 
            path: 'accounts',
            icon: Building2,
            description: 'Master Account Records'
        },
        { 
            id: 'division', 
            label: 'H2R Division', 
            path: 'division',
            icon: LayoutGrid,
            description: 'Division & Role Mapping'
        },
        { 
            id: 'time-off', 
            label: 'Assigned Time Off', 
            path: 'time-off',
            icon: CalendarClock,
            description: 'Location Role Groups'
        },
    ];

    return (
        <div className="flex flex-col gap-6 animate-fade-in translate-y-[-8px]">
            {/* H2R Creation Hub Header & Tabs */}
            <div className="bg-white dark:bg-slate-900 border-b border-surface-200 -mx-10 px-10 pt-6 pb-0 shadow-sm relative z-10">
                <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                            <span>MHRT</span>
                            <ChevronRight size={10} />
                            <span className="text-[#0078d4]">H2R Creation Hub</span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="flex gap-1">
                            {tabs.map((tab) => {
                                const TabIcon = tab.icon;
                                const isActive = activeTab === tab.id;
                                
                                return (
                                    <Link
                                        key={tab.id}
                                        to={tab.path}
                                        className={cn(
                                            "group relative flex items-center gap-2.5 px-6 py-4 transition-all duration-300",
                                            isActive 
                                                ? "text-[#0078d4]" 
                                                : "text-surface-500 hover:text-surface-900"
                                        )}
                                    >
                                        <TabIcon size={18} className={cn(
                                            "transition-transform duration-300",
                                            isActive ? "scale-110" : "group-hover:scale-105"
                                        )} />
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold uppercase tracking-tight leading-none mb-1">
                                                {tab.label}
                                            </span>
                                            <span className={cn(
                                                "text-[9px] font-medium uppercase tracking-tighter opacity-60",
                                                isActive ? "text-[#0078d4]" : ""
                                            )}>
                                                {tab.description}
                                            </span>
                                        </div>
                                        
                                        {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0078d4] rounded-t-full shadow-[0_-2px_10px_rgba(0,120,212,0.3)]" />
                                        )}
                                        {!isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-surface-200 transition-colors" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Content Area */}
            <div className="relative">
                <Outlet />
            </div>
        </div>
    );
}
