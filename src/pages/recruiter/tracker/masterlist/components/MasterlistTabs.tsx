import React from 'react';
import { cn } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import {
    GraduationCap, UserX, Users, Calendar,
    BarChart3, Layout, LogOut, Mail, Trophy, Settings
} from 'lucide-react';

interface MasterlistTabsProps {
    activeTab: string;
    setActiveTab: (val: string) => void;
    activeSubTab: string;
    setActiveSubTab: (val: string) => void;
    isEditing?: boolean;
    setIsEditing?: (val: boolean) => void;
    isConfigEditing?: boolean;
    setIsConfigEditing?: (val: boolean) => void;
}

export function MasterlistTabs({ activeTab, setActiveTab, isEditing, setIsEditing, isConfigEditing, setIsConfigEditing }: MasterlistTabsProps) {
    const { user } = useAuthStore();
    const isRecruiterS = user?.role === 'recruiter_s';
    const isTabsEditing = isConfigEditing || false;

    const defaultTabs = isRecruiterS
        ? [
            { id: 'MASTERLIST', label: 'Masterlist', icon: GraduationCap },
            { id: 'INACTIVE_APPLICATION', label: 'Inactive Application', icon: UserX },
            { id: 'POOL', label: 'Pool', icon: Users }
        ]
        : [
            { id: 'MASTERLIST', label: 'Masterlist', icon: GraduationCap },
            { id: 'INACTIVE_APPLICATION', label: 'Inactive Application', icon: UserX },
            { id: 'POOL', label: 'Pool', icon: Users },
            { id: 'PIVOT', label: 'Pivot', icon: Layout },
            { id: 'OFFBOARDING_TRACKER', label: 'Offboarding Tracker', icon: LogOut },
            { id: 'OFFBOARDING_WINNERS', label: 'Onboarding winners', icon: Trophy }
        ];

    const [tabsList, setTabsList] = React.useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('masterlist_tabs_order');
            if (saved) {
                const order = JSON.parse(saved) as string[];
                // Map the saved IDs back to objects, filtering out any missing ones
                const ordered = order
                    .map(id => defaultTabs.find(t => t.id === id))
                    .filter(Boolean) as any[];
                // Add any default tabs that weren't in the saved order
                defaultTabs.forEach(t => {
                    if (!ordered.some(o => o.id === t.id)) {
                        ordered.push(t);
                    }
                });
                return ordered;
            }
        } catch (e) {
            console.error('Failed to parse saved tabs order:', e);
        }
        return defaultTabs;
    });

    // Update list if default list changes (e.g. user roles load late)
    React.useEffect(() => {
        setTabsList(prev => {
            const next = [...prev];
            // Remove tabs that are no longer defaults
            const filtered = next.filter(t => defaultTabs.some(d => d.id === t.id));
            // Add new defaults
            defaultTabs.forEach(t => {
                if (!filtered.some(f => f.id === t.id)) {
                    filtered.push(t);
                }
            });
            return filtered;
        });
    }, [isRecruiterS]);

    const handleMoveTab = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIndex = direction === 'left' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= tabsList.length) return;

        const newTabsList = [...tabsList];
        const temp = newTabsList[index];
        newTabsList[index] = newTabsList[nextIndex];
        newTabsList[nextIndex] = temp;

        setTabsList(newTabsList);
        try {
            localStorage.setItem('masterlist_tabs_order', JSON.stringify(newTabsList.map(t => t.id)));
        } catch (err) {
            console.error('Failed to save tabs order:', err);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border-b border-surface-200 sticky top-0 z-[60]">
            <div className="flex items-center justify-center gap-0 overflow-x-auto no-scrollbar px-6 border-b border-surface-100">
                {tabsList.map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-6 py-3.5 text-[12.5px] font-medium tracking-normal transition-all relative min-w-max flex items-center gap-2.5 group",
                                isActive
                                    ? "text-black bg-white dark:bg-slate-900"
                                    : "text-surface-500 hover:text-surface-900 hover:bg-surface-50"
                            )}
                        >
                            {isTabsEditing && (
                                <div className="flex items-center gap-1 mr-1 shrink-0">
                                    <span
                                        onClick={(e) => handleMoveTab(idx, 'left', e)}
                                        className={cn(
                                            "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all",
                                            idx === 0
                                                ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                        )}
                                        title="Move tab left"
                                    >
                                        ←
                                    </span>
                                    <span
                                        onClick={(e) => handleMoveTab(idx, 'right', e)}
                                        className={cn(
                                            "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border font-bold transition-all",
                                            idx === tabsList.length - 1
                                                ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                                : "text-slate-600 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800/50 active:scale-90"
                                        )}
                                        title="Move tab right"
                                    >
                                        →
                                    </span>
                                </div>
                            )}
                            <Icon size={15} className={cn(
                                "shrink-0 transition-colors",
                                isActive ? "text-black" : "text-surface-400 group-hover:text-surface-600"
                            )} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
                <button
                    onClick={() => {
                        if (setIsConfigEditing) setIsConfigEditing(!isConfigEditing);
                    }}
                    className={cn(
                        "ml-4 px-3 py-1.5 rounded-sm flex items-center justify-center transition-all",
                        isTabsEditing ? "bg-black text-white" : "text-surface-400 hover:bg-surface-100 hover:text-black"
                    )}
                    title={isTabsEditing ? "Done editing tabs" : "Edit tabs order"}
                >
                    <Settings size={14} />
                </button>
            </div>
        </div>
    );
}
