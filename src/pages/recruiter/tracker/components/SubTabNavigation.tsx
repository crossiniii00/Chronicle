import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';
import { 
    FileSpreadsheet, Layout, UserX, ShieldAlert 
} from 'lucide-react';

interface SubTabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setSelectedAccount: (val: string | null) => void;
    isEditing?: boolean;
}

const DEFAULT_TABS = [
    { id: 'Sheet', label: 'Sheet', icon: FileSpreadsheet },
    { id: 'BLACKLIST', label: 'Blacklist', icon: UserX },
    { id: 'NOT_ELIGIBLE', label: 'Not Eligible', icon: ShieldAlert },
    { id: 'PIVOT', label: 'Pivot', icon: Layout }
];

export function SubTabNavigation({ activeTab, setActiveTab, setSelectedAccount, isEditing = false }: SubTabNavigationProps) {
    const [tabOrder, setTabOrder] = React.useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('registry_custom_tab_order');
            if (saved) {
                const parsed = JSON.parse(saved) as string[];
                // Validate that all default tab ids are present
                const defaultIds = DEFAULT_TABS.map(t => t.id);
                if (defaultIds.every(id => parsed.includes(id))) {
                    return parsed;
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
        <div className="flex items-center justify-center gap-0 bg-white border-b border-surface-200 sticky top-0 z-[55] overflow-x-auto no-scrollbar px-6">
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
                            "px-6 py-3.5 text-[12.5px] font-medium tracking-normal transition-all relative min-w-max flex items-center gap-2.5 group",
                            isActive
                                ? "text-black bg-white"
                                : "text-surface-500 hover:text-surface-900 hover:bg-surface-50"
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
                            isActive ? "text-black" : "text-surface-400 group-hover:text-surface-600"
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
                                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary-600"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
