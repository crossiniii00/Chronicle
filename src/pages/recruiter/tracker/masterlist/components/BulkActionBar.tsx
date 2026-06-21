import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Edit2, Trash2, Layout, Highlighter, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface BulkActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onDelete: () => void;
    onEmail?: (type: 'NEO' | 'PEME' | 'RCBC') => void;
    activeTab: string;
    onHighlight?: (color: string) => void;
    onTransfer?: (destination: 'NOT_ELIGIBLE' | 'BLACKLIST') => void;
    onMasterlistTransfer?: (destination: 'POOL' | 'OFFBOARDING_TRACKER' | 'OFFBOARDING_WINNERS' | 'INACTIVE_APPLICATION') => void;
}

const HIGHLIGHT_COLORS = [
    { name: 'yellow', label: 'Yellow', color: '#fef08a' },
    { name: 'green', label: 'Green', color: '#bbf7d0' },
    { name: 'blue', label: 'Blue', color: '#bfdbfe' },
    { name: 'pink', label: 'Pink', color: '#fbcfe8' },
    { name: 'purple', label: 'Purple', color: '#e9d5ff' },
    { name: 'orange', label: 'Orange', color: '#fed7aa' },
    { name: 'clear', label: 'Clear Highlight', color: 'transparent' },
];

export function BulkActionBar({ selectedCount, onClear, onDelete, onEmail, activeTab, onHighlight, onTransfer, onMasterlistTransfer }: BulkActionBarProps) {
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showTransferMenu, setShowTransferMenu] = React.useState(false);
    const [showMasterTransferMenu, setShowMasterTransferMenu] = React.useState(false);

    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[100] pointer-events-none px-4">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="bg-[#0b1329]/95 backdrop-blur-md border border-[#1e293b] shadow-2xl h-12 flex items-center gap-1 pl-1.5 pr-1.5 pointer-events-auto rounded-full animate-fade-in"
                >
                    <div className="flex items-center gap-3 px-4 h-full border-r border-[#1e293b] mr-1.5">
                        <span className="text-blue-400 font-extrabold text-sm">{selectedCount}</span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Selected</span>
                    </div>

                    <div className="flex items-center gap-1 h-full">
                        <button
                            onClick={() => onEmail?.('RCBC')}
                            className={cn(
                                "h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider rounded-full",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-blue-400" />
                            RCBC
                        </button>
                        <button
                            onClick={() => onEmail?.('NEO')}
                            className={cn(
                                "h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider rounded-full",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-emerald-400" />
                            NEO
                        </button>
                        <button
                            onClick={() => onEmail?.('PEME')}
                            className={cn(
                                "h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider rounded-full",
                                activeTab !== 'EMAIL' && "hidden"
                            )}
                        >
                            <Mail size={12} className="text-rose-400" />
                            PEME
                        </button>

                        {activeTab === 'EMAIL' && <div className="h-6 w-px bg-[#1e293b] mx-1" />}

                        <div className="relative h-full flex items-center">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider relative rounded-full"
                            >
                                <Highlighter size={12} className="text-yellow-400" />
                                Highlight
                            </button>
                            {showColorPicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                                    <div className="absolute bottom-[48px] left-0 bg-[#0b1329]/95 backdrop-blur-md border border-[#1e293b] shadow-2xl p-1.5 flex flex-col gap-1 z-20 min-w-[140px] rounded-xl">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 select-none border-b border-[#1e293b]">Select Color</p>
                                        {HIGHLIGHT_COLORS.map((hc) => (
                                            <button
                                                key={hc.name}
                                                onClick={() => {
                                                    onHighlight?.(hc.name);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                            >
                                                {hc.name === 'clear' ? (
                                                    <div className="w-3.5 h-3.5 rounded-sm border border-white/20 flex items-center justify-center relative overflow-hidden bg-white/5">
                                                        <div className="w-5 h-[1px] bg-red-500 absolute rotate-45" />
                                                    </div>
                                                ) : (
                                                    <div 
                                                        className="w-3.5 h-3.5 rounded-sm border border-white/10" 
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
                                <div className="h-6 w-px bg-[#1e293b] mx-1" />
                                <div className="relative h-full flex items-center">
                                    <button
                                        onClick={() => setShowTransferMenu(!showTransferMenu)}
                                        className="h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider relative rounded-full"
                                    >
                                        <ArrowRightLeft size={12} className="text-blue-400" />
                                        Transfer
                                    </button>
                                    {showTransferMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowTransferMenu(false)} />
                                            <div className="absolute bottom-[48px] left-0 bg-[#0b1329]/95 backdrop-blur-md border border-[#1e293b] shadow-2xl p-1.5 flex flex-col gap-1 z-20 min-w-[140px] rounded-xl">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 select-none border-b border-[#1e293b]">Transfer To</p>
                                                <button
                                                    onClick={() => {
                                                        onTransfer?.('NOT_ELIGIBLE');
                                                        setShowTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                                >
                                                    Not Eligible
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onTransfer?.('BLACKLIST');
                                                        setShowTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
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
                                <div className="h-6 w-px bg-[#1e293b] mx-1" />
                                <div className="relative h-full flex items-center">
                                    <button
                                        onClick={() => setShowMasterTransferMenu(!showMasterTransferMenu)}
                                        className="h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider relative rounded-full"
                                    >
                                        <ArrowRightLeft size={12} className="text-blue-400" />
                                        Transfer
                                    </button>
                                    {showMasterTransferMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowMasterTransferMenu(false)} />
                                            <div className="absolute bottom-[48px] left-0 bg-[#0b1329]/95 backdrop-blur-md border border-[#1e293b] shadow-2xl p-1.5 flex flex-col gap-1 z-20 min-w-[160px] rounded-xl">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 select-none border-b border-[#1e293b]">Transfer To</p>
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('POOL');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                                >
                                                    Pool
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('OFFBOARDING_TRACKER');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                                >
                                                    Offboarding Tracker
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('OFFBOARDING_WINNERS');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                                >
                                                    Onboarding winners
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onMasterlistTransfer?.('INACTIVE_APPLICATION');
                                                        setShowMasterTransferMenu(false);
                                                    }}
                                                    className="w-full text-left px-2 py-1.5 hover:bg-white/10 text-white font-bold text-[9.5px] uppercase tracking-wider transition-colors flex items-center gap-2 rounded-lg"
                                                >
                                                    Inactive Application
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        <button
                            onClick={onDelete}
                            className="h-9 px-4 flex items-center gap-2 text-[9px] font-bold text-white hover:bg-red-500/20 hover:text-red-400 transition-all uppercase tracking-wider rounded-full"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    </div>

                    <div className="w-px h-6 bg-[#1e293b] mx-2" />

                    <button
                        onClick={onClear}
                        className="w-10 h-10 flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition-all rounded-full"
                        title="Clear Selection"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
