import { Outlet, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { cn } from '@/utils/formatters';

export function ProjectRSettings() {
    const location = useLocation();
    const isAccounts = location.pathname.includes('/accounts');

    return (
        <div className={cn("animate-fade-in", isAccounts ? "max-w-none w-full min-h-screen" : "space-y-6 pb-12 max-w-[1400px] mx-auto")}>
            {!isAccounts && <div id="project-r-command-bar" className="flex items-center gap-3" />}

            {/* Content Area */}
            <div className={cn(
                "relative min-h-[600px]",
                isAccounts 
                    ? "bg-transparent border-none p-0 shadow-none" 
                    : "bg-white border border-surface-200 p-6 rounded-sm shadow-sm"
            )}>
                <Outlet />
            </div>
        </div>
    );
}

