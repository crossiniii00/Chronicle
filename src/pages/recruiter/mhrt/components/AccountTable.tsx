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
    onInlineSave?: (id: string, field: keyof MHRTAccount, value: any) => void;
}

const MhrtEditableCell = ({
    value,
    field,
    accountId,
    onSave,
    className,
    renderContent,
    options
}: {
    value: string;
    field: keyof MHRTAccount;
    accountId: string;
    onSave?: (id: string, field: keyof MHRTAccount, val: any) => void;
    className?: string;
    renderContent?: (val: string) => React.ReactNode;
    options?: string[];
}) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [localVal, setLocalVal] = React.useState(value || '');

    React.useEffect(() => {
        setLocalVal(value || '');
    }, [value]);

    if (!onSave) {
        return (
            <td className={className}>
                {renderContent ? renderContent(value) : value}
            </td>
        );
    }

    if (isEditing) {
        return (
            <td className={cn(className, "p-0 relative")}>
                {options ? (
                    <select
                        autoFocus
                        value={localVal}
                        onChange={(e) => setLocalVal(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (localVal !== value) onSave(accountId, field, localVal);
                        }}
                        className="w-full h-full p-4 min-h-[46px] outline-none border-2 border-primary-500 bg-white dark:bg-slate-900 text-xs font-semibold"
                    >
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input
                        autoFocus
                        value={localVal}
                        onChange={(e) => setLocalVal(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (localVal !== value) onSave(accountId, field, localVal);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsEditing(false);
                                if (localVal !== value) onSave(accountId, field, localVal);
                            }
                        }}
                        className="w-full h-full p-4 min-h-[46px] outline-none border-2 border-primary-500 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                )}
            </td>
        );
    }

    return (
        <td
            onClick={(e) => {
                if (e.currentTarget.closest('[data-dragging="true"]')) return;
                setIsEditing(true);
            }}
            className={cn(className, "cursor-pointer hover:bg-surface-50 group-hover:bg-surface-50/50 relative")}
            title="Click to edit"
        >
            <div className="absolute inset-0 border border-transparent hover:border-primary-300 pointer-events-none" />
            {renderContent ? renderContent(value) : value}
        </td>
    );
};

export function AccountTable({
    accounts, isLoading, isDragging, scrollRef,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onEdit, onDelete, onInlineSave
}: AccountTableProps) {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm transition-all ${isDragging ? 'cursor-grabbing select-none shadow-lg' : 'cursor-grab'}`}>
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
                            <th className="sticky right-0 z-30 bg-[#002060] p-4 text-[10px] font-bold uppercase tracking-wider text-center w-[80px] border-l border-white/20 shadow-[-4px_0_15px_rgba(0,0,0,0.1)]">
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
                                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-surface-50 p-4 border-r border-surface-200 bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs ring-1 ring-primary-100 uppercase">
                                            {acc.account.charAt(0)}
                                        </div>
                                        <span className="text-[11px] font-black text-surface-900 uppercase">
                                            {acc.account}
                                        </span>
                                    </div>
                                </td>

                                <MhrtEditableCell field="lob" value={acc.lob} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="pseudonym" value={acc.pseudonym} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200 italic" />
                                <MhrtEditableCell field="position" value={acc.position} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="campaignManager" value={acc.campaignManager} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="teamManager" value={acc.teamManager} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="baseSalary" value={acc.baseSalary} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-[#002060] text-center border border-surface-200 bg-blue-50/30" />
                                <MhrtEditableCell field="allowance" value={acc.allowance} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-[#002060] text-center border border-surface-200 bg-blue-50/10" />
                                <MhrtEditableCell field="accountSpecificTracker" value={acc.accountSpecificTracker} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="assessments" value={acc.assessments} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200 truncate max-w-[150px]" />
                                <td className="p-4 text-center border border-surface-200">
                                    <button className="text-[9px] font-bold text-primary-600 hover:underline uppercase">View PDF</button>
                                </td>
                                <MhrtEditableCell field="rosterLock" value={acc.rosterLock} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="toolTesting" value={acc.toolTesting} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" options={['Completed', 'Pending', 'N/A']} renderContent={(val) => (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap",
                                        val === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-surface-100 text-surface-600"
                                    )}>
                                        {val}
                                    </span>
                                )} />
                                <MhrtEditableCell field="hoops" value={acc.hoops} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="voiceType" value={acc.voiceType} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" options={['Voice', 'Non-Voice', 'Blended', 'Multi']} />
                                <MhrtEditableCell field="direction" value={acc.direction} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" options={['Inbound', 'Outbound', 'Both']} />
                                <MhrtEditableCell field="vertical" value={acc.vertical} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200 uppercase" />
                                <MhrtEditableCell field="education" value={acc.education} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="workExperience" value={acc.workExperience} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-primary-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="typingSpeed" value={acc.typingSpeed} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-surface-900 text-center border border-surface-200" />
                                <MhrtEditableCell field="typingAccuracy" value={acc.typingAccuracy} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-surface-900 text-center border border-surface-200" />
                                <MhrtEditableCell field="cefr" value={acc.cefr} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-vibrant-purple text-center border border-surface-200" />
                                <MhrtEditableCell field="ase" value={acc.ase} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200 uppercase" />
                                <MhrtEditableCell field="ovStatus" value={acc.ovStatus} accountId={acc.id} onSave={onInlineSave} className="p-4 text-center border border-surface-200 bg-surface-50/20" options={['Verified', 'Pending', 'Failed']} renderContent={(val) => (
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-wider",
                                        val === 'Verified' ? "bg-emerald-500 text-white shadow-sm" :
                                            val === 'Pending' ? "bg-vibrant-orange text-white shadow-sm" : "bg-red-500 text-white shadow-sm"
                                    )}>
                                        {val === 'Verified' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {val}
                                    </div>
                                )} />
                                <MhrtEditableCell field="opsValidator" value={acc.opsValidator} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="ovAvailability" value={acc.ovAvailability} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-medium text-surface-500 text-center border border-surface-200 italic" />
                                <MhrtEditableCell field="clientAvailability" value={acc.clientAvailability} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-medium text-surface-500 text-center border border-surface-200 italic" />
                                <MhrtEditableCell field="location" value={acc.location} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-surface-700 text-center border border-surface-200" renderContent={(val) => (
                                    <div className="flex items-center justify-center gap-1">
                                        <MapPin size={10} className="text-red-500" />
                                        {val}
                                    </div>
                                )} />
                                <MhrtEditableCell field="operationsDirector" value={acc.operationsDirector} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-800 text-center border border-surface-200" />
                                <MhrtEditableCell field="trainer" value={acc.trainer} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-800 text-center border border-surface-200" />
                                <MhrtEditableCell field="wfmPoc" value={acc.wfmPoc} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-800 text-center border border-surface-200" />
                                <MhrtEditableCell field="finalInterviewSchedule" value={acc.finalInterviewSchedule} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-bold text-primary-600 text-center border border-surface-200 bg-primary-50/10 uppercase tracking-tighter" />
                                <MhrtEditableCell field="mustHaves" value={acc.mustHaves} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[10px] text-surface-500 text-center border border-surface-200 max-w-[150px] truncate" />
                                <MhrtEditableCell field="niceToHaves" value={acc.niceToHaves} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[10px] text-surface-500 text-center border border-surface-200 max-w-[150px] truncate" />
                                <MhrtEditableCell field="hmo" value={acc.hmo} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="relocation" value={acc.relocation} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="demographics" value={acc.demographics} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />
                                <MhrtEditableCell field="backgroundInvestigation" value={acc.backgroundInvestigation} accountId={acc.id} onSave={onInlineSave} className="p-4 text-[11px] font-semibold text-surface-700 text-center border border-surface-200" />

                                <td className="sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-surface-50 p-4 text-center border-l border-surface-200 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
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
