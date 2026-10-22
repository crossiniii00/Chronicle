import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Edit2, Trash2, Layout, Highlighter, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';

interface BulkActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onDelete: () => void;
    onEmail?: (type: 'NEO' | 'PEME' | 'RCBC') => void;
    activeTab: string;
    onHighlight?: (color: string) => void;
    onTransfer?: (destination: 'NOT_ELIGIBLE' | 'BLACKLIST') => void;
    onMasterlistTransfer?: (destination: 'MASTERLIST' | 'POOL' | 'OFFBOARDING_TRACKER' | 'OFFBOARDING_WINNERS' | 'INACTIVE_APPLICATION') => void;
    onMasterlistTransferDate?: (month: string, year: string) => void;
}

const HIGHLIGHT_COLORS = [
    { name: 'yellow', label: 'Yellow', color: '#facc15' },
    { name: 'green', label: 'Green', color: '#4ade80' },
    { name: 'blue', label: 'Blue', color: '#60a5fa' },
    { name: 'pink', label: 'Pink', color: '#f472b6' },
    { name: 'purple', label: 'Purple', color: '#c084fc' },
    { name: 'orange', label: 'Orange', color: '#fb923c' },
    { name: 'clear', label: 'Clear Highlight', color: 'transparent' },
];

export function BulkActionBar({ selectedCount, onClear, onDelete, onEmail, activeTab, onHighlight, onTransfer, onMasterlistTransfer, onMasterlistTransferDate }: BulkActionBarProps) {
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showTransferMenu, setShowTransferMenu] = React.useState(false);
    const [showMasterTransferMenu, setShowMasterTransferMenu] = React.useState(false);
    const [showDateModal, setShowDateModal] = React.useState(false);
    const [targetMonth, setTargetMonth] = React.useState('January');
    const [targetYear, setTargetYear] = React.useState(new Date().getFullYear().toString());
    const [pendingTransfer, setPendingTransfer] = React.useState<'INACTIVE_APPLICATION' | 'OFFBOARDING_TRACKER' | null>(null);

    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[100] pointer-events-none px-4">
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 100, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 shadow-2xl shadow-slate-900/10 h-12 flex items-center gap-1 pl-2 pr-2 pointer-events-auto rounded-md ring-1 ring-slate-950/5"
                >
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/80 border border-blue-200/70 rounded-sm mr-1">
                        <span className="text-blue-600 font-extrabold text-xs tabular-nums">{selectedCount}</span>
                        <span className="text-[9.5px] font-bold text-blue-900 uppercase tracking-widest">Selected</span>
                    </div>

                    <div className="flex items-center gap-0.5 h-full">
                        <button
                            onClick={() => onEmail?.('RCBC')}
                            className={cn(
                                "h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white transition-all uppercase tracking-wider rounded-sm cursor-pointer",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-blue-500" />
                            RCBC
                        </button>
                        <button
                            onClick={() => onEmail?.('NEO')}
                            className={cn(
                                "h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white transition-all uppercase tracking-wider rounded-sm cursor-pointer",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-emerald-500" />
                            NEO
                        </button>
                        <button
                            onClick={() => onEmail?.('PEME')}
                            className={cn(
                                "h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 hover:text-slate-900 dark:text-white transition-all uppercase tracking-wider rounded-sm cursor-pointer",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-rose-500" />
                            PEME
                        </button>

                        {activeTab === 'EMAIL' && <div className="h-4 w-px bg-slate-200 mx-1" />}

                        <div className="relative h-full flex items-center">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 transition-all uppercase tracking-wider relative rounded-full cursor-pointer"
                            >
                                <Highlighter size={12} className="text-amber-500" />
                                Highlight
                            </button>
                            {showColorPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                                    <div className="absolute bottom-[48px] left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 flex flex-col gap-0.5 z-20 min-w-[150px] rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1 select-none border-b border-slate-100">Select Color</p>
                                        {HIGHLIGHT_COLORS.map((hc) => (
                                            <button
                                                key={hc.name}
                                                onClick={() => {
                                                    onHighlight?.(hc.name);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                            >
                                                {hc.name === 'clear' ? (
                                                    <div className="w-3.5 h-3.5 rounded-sm border border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-800">
                                                        <div className="w-5 h-[1px] bg-red-500 absolute rotate-45" />
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="w-3.5 h-3.5 rounded-sm border border-slate-300 dark:border-slate-700/80 shadow-2xs" 
                                                        style={{ backgroundColor: hc.color }} 
                                                    />
                                                )}
                                                {hc.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {onTransfer && !['MASTERLIST', 'INACTIVE_APPLICATION', 'POOL', 'DAILY_HC_REPORT', 'REPORTS', 'OFFBOARDING_TRACKER', 'OFFBOARDING_WINNERS', 'EMAIL', 'SALARY', 'INACTIVE_APPLICANTS'].includes(activeTab) && (
                            <>
                                <div className="h-4 w-px bg-slate-200 mx-1" />
                                <div className="relative h-full flex items-center">
                                    <button
                                        onClick={() => setShowTransferMenu(!showTransferMenu)}
                                        className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-900 transition-all uppercase tracking-wider relative rounded-full cursor-pointer"
                                    >
                                        <ArrowRightLeft size={12} className="text-blue-500" />
                                        Transfer
                                    </button>
                                    {showTransferMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowTransferMenu(false)} />
                                            <div className="absolute bottom-[48px] left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 flex flex-col gap-0.5 z-20 min-w-[150px] rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1 select-none border-b border-slate-100">Transfer To</p>
                                                <button
                                                    onClick={() => {
                                                        onTransfer?.('NOT_ELIGIBLE');
                                                        setShowTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Not Eligible
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onTransfer?.('BLACKLIST');
                                                        setShowTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Blacklist
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {onMasterlistTransfer && (
                            <>
                                <div className="h-4 w-px bg-slate-200 mx-1" />
                                <div className="relative h-full flex items-center">
                                    <button
                                        onClick={() => setShowMasterTransferMenu(!showMasterTransferMenu)}
                                        className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-900 transition-all uppercase tracking-wider relative rounded-full cursor-pointer"
                                    >
                                        <ArrowRightLeft size={12} className="text-blue-500" />
                                        Transfer
                                    </button>
                                    {showMasterTransferMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowMasterTransferMenu(false)} />
                                            <div className="absolute bottom-[48px] left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 flex flex-col gap-0.5 z-20 min-w-[175px] rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1 select-none border-b border-slate-100">Transfer To</p>
                                                {activeTab !== 'MASTERLIST' && (
                                                    <button
                                                        onClick={() => {
                                                            onMasterlistTransfer?.('MASTERLIST');
                                                            setShowMasterTransferMenu(false);
                                                        }}
                                                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                    >
                                                        Masterlist
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('POOL');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Pool
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPendingTransfer('OFFBOARDING_TRACKER');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Offboarding Tracker
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('OFFBOARDING_WINNERS');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Onboarding winners
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPendingTransfer('INACTIVE_APPLICATION');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                >
                                                    Inactive Application
                                                </button>
                                                {onMasterlistTransferDate && (
                                                    <button
                                                        onClick={() => {
                                                            setShowMasterTransferMenu(false);
                                                            setShowDateModal(true);
                                                        }}
                                                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-xl cursor-pointer"
                                                    >
                                                        Move to Month/Year Tab
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="h-4 w-px bg-slate-200 mx-1" />

                        <button
                            onClick={onDelete}
                            className="h-8 px-3 flex items-center gap-1.5 text-[9.5px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all uppercase tracking-wider rounded-full cursor-pointer"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    </div>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button
                        onClick={onClear}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800/50 transition-all rounded-full cursor-pointer"
                        title="Clear Selection"
                    >
                        <X size={14} />
                    </button>
                </motion.div>
            </div>
            
            <Modal open={showDateModal} onClose={() => setShowDateModal(false)} title="Move to Month/Year Tab" size="sm">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-2">
                            <label className="text-sm font-medium text-surface-700">Month</label>
                            <select
                                value={targetMonth}
                                onChange={(e) => setTargetMonth(e.target.value)}
                                className="w-full rounded-md border-[#D6DCE5] bg-surface-50 text-sm focus:ring-[#0078D4] focus:border-[#0078D4] p-2 border"
                            >
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <label className="text-sm font-medium text-surface-700">Year</label>
                            <select
                                value={targetYear}
                                onChange={(e) => setTargetYear(e.target.value)}
                                className="w-full rounded-md border-[#D6DCE5] bg-surface-50 text-sm focus:ring-[#0078D4] focus:border-[#0078D4] p-2 border"
                            >
                                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => setShowDateModal(false)}
                            className="px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 rounded-md transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onMasterlistTransferDate?.(targetMonth, targetYear);
                                setShowDateModal(false);
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-md transition-colors shadow-sm cursor-pointer"
                        >
                            Confirm Move
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal open={!!pendingTransfer} onClose={() => setPendingTransfer(null)} title="Confirm Transfer" size="sm">
                <div className="p-4 flex flex-col gap-4">
                    <p className="text-sm text-surface-600">
                        {pendingTransfer === 'INACTIVE_APPLICATION' 
                            ? 'Does the candidate have NO EID?' 
                            : 'Does the candidate have an EID?'}
                    </p>
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => setPendingTransfer(null)}
                            className="px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 rounded-md transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (pendingTransfer) {
                                    onMasterlistTransfer?.(pendingTransfer);
                                }
                                setPendingTransfer(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-md transition-colors shadow-sm cursor-pointer"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </Modal>
        </AnimatePresence>
    );
}
