import React from 'react';
import { MoreHorizontal, Edit3, Trash2, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { MHRTAccount } from '@/services/MhrtService';
import { COLUMN_HEADERS } from '../constants/accountConstants';

interface AccountTableProps {
    accounts: MHRTAccount[];
    isLoading: boolean;
    isDragging: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onEdit: (acc: MHRTAccount) => void;
    onDelete: (id: string) => void;
}

export function AccountTable({
    accounts, isLoading, isDragging, scrollRef,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onEdit, onDelete
}: AccountTableProps) {
    return (
        <div className={`bg-white border border-surface-200 rounded-sm shadow-sm transition-all ${isDragging ? 'cursor-grabbing select-none shadow-lg' : 'cursor-grab'}`}>
            <div
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className="overflow-x-auto overflow-y-visible relative custom-scrollbar active:cursor-grabbing"
            >
                <table className="w-full border-collapse table-fixed min-w-[5000px]">
                    <thead>
                        <tr className="sticky top-0 z-20 bg-[#002060] text-white">
                            <th className="sticky left-0 z-30 bg-[#002060] p-4 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-[200px]">
                                Account
                            </th>
                            {COLUMN_HEADERS.slice(1).map((header) => (
                                <th key={header} className="p-4 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-[150px]">
                                    {header}
                                </th>
                            ))}
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center w-[60px]">
                                <MoreHorizontal size={14} className="mx-auto" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={40} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-[#002060]/20 border-t-[#002060] rounded-full animate-spin"></div>
                                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Hydrating Master Grid...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : accounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-surface-50/80 transition-colors group">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-surface-50 p-4 border-r border-surface-200 bg-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs ring-1 ring-primary-100 uppercase">
                                            {acc.account.charAt(0)}
                                        </div>
                                        <span className="text-[11px] font-black text-surface-900 uppercase">
                                            {acc.account}
                                        </span>
                                    </div>
                                </td>

                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.lob}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100 italic">{acc.pseudonym}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.position}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.campaignManager}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.teamManager}</td>
                                <td className="p-4 text-[11px] font-bold text-[#002060] text-center border-r border-surface-100 bg-blue-50/30">{acc.baseSalary}</td>
                                <td className="p-4 text-[11px] font-bold text-[#002060] text-center border-r border-surface-100 bg-blue-50/10">{acc.allowance}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.accountSpecificTracker}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100 truncate max-w-[150px]">{acc.assessments}</td>
                                <td className="p-4 text-center border-r border-surface-100">
                                    <button className="text-[9px] font-bold text-primary-600 hover:underline uppercase">View PDF</button>
                                </td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.rosterLock}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap",
                                        acc.toolTesting === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-surface-100 text-surface-600"
                                    )}>
                                        {acc.toolTesting}
                                    </span>
                                </td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.hoops}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.voiceType}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.direction}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100 uppercase">{acc.vertical}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.education}</td>
                                <td className="p-4 text-[11px] font-semibold text-primary-700 text-center border-r border-surface-100">{acc.workExperience}</td>
                                <td className="p-4 text-[11px] font-bold text-surface-900 text-center border-r border-surface-100">{acc.typingSpeed}</td>
                                <td className="p-4 text-[11px] font-bold text-surface-900 text-center border-r border-surface-100">{acc.typingAccuracy}</td>
                                <td className="p-4 text-[11px] font-bold text-vibrant-purple text-center border-r border-surface-100">{acc.cefr}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100 uppercase">{acc.ase}</td>
                                <td className="p-4 text-center border-r border-surface-100 bg-surface-50/20">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-wider",
                                        acc.ovStatus === 'Verified' ? "bg-emerald-500 text-white shadow-sm" :
                                            acc.ovStatus === 'Pending' ? "bg-vibrant-orange text-white shadow-sm" : "bg-red-500 text-white shadow-sm"
                                    )}>
                                        {acc.ovStatus === 'Verified' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {acc.ovStatus}
                                    </div>
                                </td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.opsValidator}</td>
                                <td className="p-4 text-[11px] font-medium text-surface-500 text-center border-r border-surface-100 italic">{acc.ovAvailability}</td>
                                <td className="p-4 text-[11px] font-medium text-surface-500 text-center border-r border-surface-100 italic">{acc.clientAvailability}</td>
                                <td className="p-4 text-[11px] font-bold text-surface-700 text-center border-r border-surface-100">
                                    <div className="flex items-center justify-center gap-1">
                                        <MapPin size={10} className="text-red-500" />
                                        {acc.location}
                                    </div>
                                </td>
                                <td className="p-4 text-[11px] font-semibold text-surface-800 text-center border-r border-surface-100">{acc.operationsDirector}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-800 text-center border-r border-surface-100">{acc.trainer}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-800 text-center border-r border-surface-100">{acc.wfmPoc}</td>
                                <td className="p-4 text-[11px] font-bold text-primary-600 text-center border-r border-surface-100 bg-primary-50/10 uppercase tracking-tighter">{acc.finalInterviewSchedule}</td>
                                <td className="p-4 text-[10px] text-surface-500 text-center border-r border-surface-100 max-w-[150px] truncate">{acc.mustHaves}</td>
                                <td className="p-4 text-[10px] text-surface-500 text-center border-r border-surface-100 max-w-[150px] truncate">{acc.niceToHaves}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.hmo}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.relocation}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.demographics}</td>
                                <td className="p-4 text-[11px] font-semibold text-surface-700 text-center border-r border-surface-100">{acc.backgroundInvestigation}</td>

                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(acc)}
                                            className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-sm transition-all shadow-sm border border-surface-100"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(acc.id)}
                                            className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-all shadow-sm border border-surface-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-surface-50 border-t border-surface-200 p-4 flex items-center justify-between">
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest text-left">
                    Displaying {accounts.length} active configurations
                </p>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">Systems Updated Live</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
