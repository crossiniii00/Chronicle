import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';
import { 
    FileSpreadsheet, Layout, UserX, ShieldAlert, Clock, UserMinus, ArrowUpCircle, MoveHorizontal
} from 'lucide-react';

interface SubTabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setSelectedAccount: (val: string | null) => void;
    isEditing?: boolean;
}

const DEFAULT_TABS = [
    { id: 'Sheet', label: 'Sheet', icon: FileSpreadsheet, color: { activeText: 'text-blue-700', activeBg: 'bg-blue-50/50', underline: 'bg-blue-600', iconActive: 'text-blue-600', hoverText: 'group-hover:text-blue-700', hoverBg: 'hover:bg-blue-50/30' } },
    { id: 'WAITLISTED', label: 'Waitlisted', icon: Clock, color: { activeText: 'text-indigo-700', activeBg: 'bg-indigo-50/50', underline: 'bg-indigo-600', iconActive: 'text-indigo-600', hoverText: 'group-hover:text-indigo-700', hoverBg: 'hover:bg-indigo-50/30' } },
    { id: 'BLACKLISTED', label: 'Blacklisted', icon: UserX, color: { activeText: 'text-rose-700', activeBg: 'bg-rose-50/50', underline: 'bg-rose-600', iconActive: 'text-rose-600', hoverText: 'group-hover:text-rose-700', hoverBg: 'hover:bg-rose-50/30' } },
    { id: 'WITHDRAWN', label: 'Withdrawn', icon: UserMinus, color: { activeText: 'text-orange-700', activeBg: 'bg-orange-50/50', underline: 'bg-orange-600', iconActive: 'text-orange-600', hoverText: 'group-hover:text-orange-700', hoverBg: 'hover:bg-orange-50/30' } },
    { id: 'NOT_ELIGIBLE_FOR_REHIRE', label: 'Not Eligible for Rehire', icon: ShieldAlert, color: { activeText: 'text-red-700', activeBg: 'bg-red-50/50', underline: 'bg-red-600', iconActive: 'text-red-600', hoverText: 'group-hover:text-red-700', hoverBg: 'hover:bg-red-50/30' } },
    { id: 'PROMOTED', label: 'Promoted', icon: ArrowUpCircle, color: { activeText: 'text-emerald-700', activeBg: 'bg-emerald-50/50', underline: 'bg-emerald-600', iconActive: 'text-emerald-600', hoverText: 'group-hover:text-emerald-700', hoverBg: 'hover:bg-emerald-50/30' } },
    { id: 'LATERAL_TRANSFER', label: 'Lateral Transfer', icon: MoveHorizontal, color: { activeText: 'text-teal-700', activeBg: 'bg-teal-50/50', underline: 'bg-teal-600', iconActive: 'text-teal-600', hoverText: 'group-hover:text-teal-700', hoverBg: 'hover:bg-teal-50/30' } },
    { id: 'PIVOT', label: 'Pivot', icon: Layout, color: { activeText: 'text-purple-700', activeBg: 'bg-purple-50/50', underline: 'bg-purple-600', iconActive: 'text-purple-600', hoverText: 'group-hover:text-purple-700', hoverBg: 'hover:bg-purple-50/30' } }
];

export function SubTabNavigation({ activeTab, setActiveTab, setSelectedAccount, isEditing = false }: SubTabNavigationProps) {
    const [tabOrder, setTabOrder] = React.useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_tab_order');
            if (saved) {
                const parsed = JSON.parse(saved) as string[];
                const defaultIds = DEFAULT_TABS.map(t => t.id);
                const validParsed = parsed.filter(id => defaultIds.includes(id));
                if (validParsed.length === defaultIds.length) {
                    return validParsed;
                }
            }
        } catch {}
        return DEFAULT_TABS.map(t => t.id);
    });

    const orderedTabs = React.useMemo(() => {
        return tabOrder
            .map(id => DEFAULT_TABS.find(t => t.id === id))
            .filter(Boolean) as typeof DEFAULT_TABS;
    }, [tabOrder]);

    const handleMoveTab = (idx: number, direction: 'left' | 'right', e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= tabOrder.length) return;
        const newOrder = [...tabOrder];
        const temp = newOrder[idx];
        newOrder[idx] = newOrder[swapIdx];
        newOrder[swapIdx] = temp;
        setTabOrder(newOrder);
        try {
            localStorage.setItem('registry_custom_tab_order', JSON.stringify(newOrder));
        } catch {}
    };

    return (
        <div className="flex items-center justify-center gap-0 bg-white dark:bg-slate-900 border-b border-surface-200 sticky top-0 z-[55] overflow-x-auto no-scrollbar px-6">
            {orderedTabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSelectedAccount(null);
                            }}
                            className={cn(
                                "px-6 py-3.5 text-[12.5px] font-medium tracking-normal transition-all relative min-w-max flex items-center gap-2.5 group border-r first:border-l border-surface-200",
                                isActive
                                    ? cn(tab.color.activeText, tab.color.activeBg)
                                    : cn("text-surface-500", tab.color.hoverText, tab.color.hoverBg)
                            )}
                        >
                            {isEditing && idx > 0 && (
                                <span
                                    onClick={(e) => handleMoveTab(idx, 'left', e)}
                                    className={cn(
                                        "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-black cursor-pointer select-none transition-all absolute -left-0.5 top-1/2 -translate-y-1/2 z-10",
                                        "bg-primary-100 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-300"
                                    )}
                                    title="Move left"
                                >
                                    ←
                                </span>
                            )}
                            <Icon size={15} className={cn(
                                "shrink-0 transition-colors",
                                isActive ? tab.color.iconActive : cn("text-surface-400", tab.color.hoverText)
                            )} />
                            <span>{tab.label}</span>
                            {isEditing && idx < orderedTabs.length - 1 && (
                                <span
                                    onClick={(e) => handleMoveTab(idx, 'right', e)}
                                    className={cn(
                                        "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-black cursor-pointer select-none transition-all absolute -right-0.5 top-1/2 -translate-y-1/2 z-10",
                                        "bg-primary-100 text-primary-700 hover:bg-primary-600 hover:text-white border border-primary-300"
                                    )}
                                    title="Move right"
                                >
                                    →
                                </span>
                            )}
                            {isActive && (
                                <motion.div
                                    layoutId="activeSubTabUnderline"
                                    className={cn("absolute bottom-0 left-0 right-0 h-[2.5px]", tab.color.underline)}
                                />
                            )}
                        </button>
                );
            })}
        </div>
    );
}
