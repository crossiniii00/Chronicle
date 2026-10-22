import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Activity, Mail, Sparkles, Database, Users, Briefcase, Building2, Bell } from 'lucide-react';
import { cn } from '@/utils/formatters';

export function ProjectRSettings() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // We are under /admin/settings or /recruiter/settings
    const basePath = location.pathname.startsWith('/admin') ? '/admin/settings' : '/recruiter/settings';
    const isAdmin = location.pathname.startsWith('/admin');

    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'questions', label: 'Question Bank', icon: BookOpen },
            { id: 'typing-test', label: 'Typing Test', icon: Activity },
            { id: 'typing-monitoring', label: 'Typing Tracker', icon: Activity },
            { id: 'email-templates', label: 'Email Templates', icon: Mail },
            { id: 'ai', label: 'AI Settings', icon: Sparkles },
            // { id: 'notifications', label: 'Notifications', icon: Bell },
        ];

        if (isAdmin) {
            baseTabs.push(
                { id: 'queue-settings', label: 'Active Tasks', icon: Activity },
                { id: 'backup', label: 'Backups', icon: Database },
                { id: 'users', label: 'User Management', icon: Users }
            );
        } else {
             // For recruiter
            baseTabs.push(
                { id: 'users', label: 'User Management', icon: Users }
            );
        }
        return baseTabs;
    }, [isAdmin]);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-surface-50 animate-fade-in w-full max-w-full">
            {/* Left Sidebar */}
            <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-surface-200 flex flex-col h-full overflow-y-auto hidden md:flex z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                <div className="p-4 border-b border-surface-100 flex items-center gap-3 shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-surface-900 tracking-tight text-sm">CRM Settings</h2>
                        <p className="text-[10px] text-surface-500 font-medium uppercase tracking-wider">System Setup</p>
                    </div>
                </div>

                <div className="p-3 space-y-1 overflow-y-auto">
                    {tabs.map(tab => {
                        const isActive = location.pathname.includes(`/${tab.id}`);
                        const isUserManagement = tab.id === 'users';
                        return (
                            <button
                                key={tab.id}
                                onClick={() => navigate(`${basePath}/${tab.id}`)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive 
                                        ? isUserManagement 
                                            ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-500" 
                                            : "bg-blue-50/80 text-blue-700 shadow-sm shadow-blue-100/50" 
                                        : isUserManagement
                                            ? "text-blue-600 hover:bg-blue-50/50 hover:shadow-[0_0_10px_rgba(37,99,235,0.3)] hover:text-blue-700 border border-transparent hover:border-blue-200"
                                            : "text-surface-600 hover:bg-surface-50 hover:text-surface-900",
                                    isUserManagement && !isActive && "shadow-[0_0_8px_rgba(37,99,235,0.2)]"
                                )}
                            >
                                {isUserManagement && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                )}
                                <tab.icon className={cn(
                                    "w-4 h-4 transition-colors relative z-10", 
                                    isActive 
                                        ? isUserManagement ? "text-white" : "text-blue-600" 
                                        : isUserManagement ? "text-blue-500 group-hover:text-blue-600" : "text-surface-400 group-hover:text-surface-600"
                                )} />
                                <span className="relative z-10">{tab.label}</span>
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
