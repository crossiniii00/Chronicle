import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Building2, UserPlus, BookOpen } from 'lucide-react';
import { cn } from '@/utils/formatters';

export function MHRTView() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // We are under /admin/mhrt or /recruiter/mhrt
    const basePath = location.pathname.startsWith('/admin') ? '/admin/mhrt' : '/recruiter/mhrt';

    const tabs = useMemo(() => {
        return [
            { id: 'accounts', label: 'Accounts', icon: Building2 },
            { id: 'h2r-creation', label: 'H2R Creation Hub', icon: UserPlus },
            { id: 'directory', label: 'Directory', icon: BookOpen },
        ];
    }, []);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-surface-50 animate-fade-in w-full max-w-full">
            {/* Left Sidebar */}
            <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-surface-200 flex flex-col h-full overflow-y-auto hidden md:flex z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                <div className="p-4 border-b border-surface-100 flex items-center gap-3 shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-surface-900 tracking-tight text-sm">MHRT</h2>
                        <p className="text-[10px] text-surface-500 font-medium uppercase tracking-wider">References</p>
                    </div>
                </div>

                <div className="p-3 space-y-1 overflow-y-auto">
                    {tabs.map(tab => {
                        const isActive = location.pathname.includes(`/${tab.id}`);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(`${basePath}/${tab.id}`)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
                                    isActive 
                                        ? "bg-indigo-50/80 text-indigo-700 shadow-sm shadow-indigo-100/50" 
                                        : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                                )}
                            >
                                <tab.icon className={cn(
                                    "w-4 h-4 transition-colors", 
                                    isActive ? "text-indigo-600" : "text-surface-400 group-hover:text-surface-600"
                                )} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-surface-50 relative w-full">
                <div className="min-h-full mx-auto p-4 md:p-6 w-full max-w-full">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-surface-200 min-h-[600px] w-full max-w-full overflow-x-hidden">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
