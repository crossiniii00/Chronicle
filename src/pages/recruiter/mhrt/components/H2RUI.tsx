import React from 'react';
import { UserPlus, Download, Plus, Search, Filter, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { H2RRecord } from '@/services/MhrtService';
import { COLUMN_HEADERS } from '../constants/h2rConstants';

interface H2RTableHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onAdd: () => void;
    onExport?: () => void;
}

export function H2RTableHeader({ searchTerm, setSearchTerm, onAdd, onExport }: H2RTableHeaderProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white dark:bg-slate-900 px-2 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none mb-1 uppercase text-[#002060]">H2R Creation Hub</h2>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest opacity-80 italic">Initialize and Track Hire-to-Recruit Requests</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onExport} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-sm hover:bg-surface-50 transition-all shadow-sm">
                        <Download size={14} /> Export List
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        <Plus size={14} /> Create New H2R
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-surface-200 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Account, LOB, or Location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 text-[11px] placeholder:text-surface-400 py-2.5 pl-10 pr-4 rounded-sm focus:ring-1 focus:ring-[#002060] outline-none transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2.5 text-surface-400 hover:text-[#002060] hover:bg-surface-50 rounded-sm transition-all border border-surface-200">
                        <Filter size={16} />
                    </button>
                </div>
            </div>
        </>
    );
}

interface H2RTableProps {
    records: H2RRecord[];
    isLoading: boolean;
    isDragging: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onEdit: (rec: H2RRecord) => void;
    onDelete: (id: string) => void;
}

export function H2RTable({
    records, isLoading, isDragging, scrollRef,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onEdit, onDelete
}: H2RTableProps) {
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
                <table className="w-full border-collapse table-fixed min-w-[1800px]">
                    <thead>
                        <tr className="sticky top-0 z-20 bg-[#002060] text-white">
                            <th className="sticky left-0 z-30 bg-[#002060] p-4 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-[220px]">
                                Account
                            </th>
                            {COLUMN_HEADERS.slice(1).map((header) => (
                                <th key={header} className="p-4 text-[10px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-[180px]">
                                    {header}
                                </th>
                            ))}
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center w-[80px]">
                                <MoreHorizontal size={14} className="mx-auto" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={13} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-[#002060]/20 border-t-[#002060] rounded-full animate-spin"></div>
                                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Hydrating Creation Hub...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : records.map((record) => (
                            <tr key={record.id} className="hover:bg-surface-50/80 transition-colors group">
                                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-3 border-r border-surface-100 group-hover:bg-surface-50 transition-colors text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-[#002060]/5 rounded flex items-center justify-center text-[#002060] font-black text-[10px] shadow-inner border border-[#002060]/10 uppercase">
                                            {record.account[0]}
                                        </div>
                                        <span className="text-[11px] font-black text-surface-900 uppercase tracking-tight">{record.account}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-[10px] text-surface-600 font-bold text-center border-r border-surface-100 whitespace-pre-wrap">{record.lob}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100">{record.jobLocation}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100 uppercase">{record.division}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100 uppercase">{record.lineOfBusiness}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100 uppercase">{record.department}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-black text-center border-r border-surface-100 text-[#0078d4] uppercase">{record.reportsTo}</td>
                                <td className="p-3 border-r border-surface-100">
                                    <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase text-center mx-auto w-fit">
                                        {record.training}
                                    </div>
                                </td>
                                <td className="p-3 border-r border-surface-100">
                                    <div className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase text-center mx-auto w-fit">
                                        {record.nesting}
                                    </div>
                                </td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100">{record.startDate || 'N/A'}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-bold text-center border-r border-surface-100">{record.headcount || 'N/A'}</td>
                                <td className="p-3 text-[10px] text-surface-600 font-medium text-center border-r border-surface-100 uppercase">{record.reqId || 'N/A'}</td>
                                <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(record)}
                                            className="p-1.5 text-surface-400 hover:text-[#002060] transition-colors rounded-sm hover:bg-white dark:bg-slate-900 shadow-sm border border-transparent hover:border-surface-200"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(record.id)}
                                            className="p-1.5 text-surface-400 hover:text-red-500 transition-colors rounded-sm hover:bg-white dark:bg-slate-900 shadow-sm border border-transparent hover:border-surface-200"
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

            <div className="bg-surface-50 border-t border-surface-200 px-4 py-2 flex items-center justify-between">
                <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest text-left">
                    Displaying {records.length} H2R Requests
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Systems Updated Live</span>
                </div>
            </div>
        </div>
    );
}

interface H2RFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingRecord: H2RRecord | null;
    formData: Partial<H2RRecord>;
    setFormData: (d: Partial<H2RRecord>) => void;
    onSave: () => void;
}

export function H2RFormModal({ isOpen, onClose, editingRecord, formData, setFormData, onSave }: H2RFormModalProps) {
    const updateField = (field: keyof H2RRecord, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={editingRecord ? "Edit H2R Request" : "Create New H2R Request"}
            size="lg"
        >
            <div className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Account Name</label>
                        <input value={formData.account || ''} onChange={e => updateField('account', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" placeholder="e.g. Keller Postman" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Position / LOB</label>
                        <input value={formData.lob || ''} onChange={e => updateField('lob', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" placeholder="e.g. Multi Agent" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Job Location</label>
                        <input value={formData.jobLocation || ''} onChange={e => updateField('jobLocation', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Division</label>
                        <select value={formData.division || ''} onChange={e => updateField('division', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]">
                            <option value="Operations Direct">Operations Direct</option>
                            <option value="Operations Support">Operations Support</option>
                            <option value="Operations Services">Operations Services</option>
                            <option value="Shared Services">Shared Services</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Line of Business</label>
                        <input value={formData.lineOfBusiness || ''} onChange={e => updateField('lineOfBusiness', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Department</label>
                        <input value={formData.department || ''} onChange={e => updateField('department', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Reports To (POC)</label>
                        <input value={formData.reportsTo || ''} onChange={e => updateField('reportsTo', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Training</label>
                            <input value={formData.training || ''} onChange={e => updateField('training', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Nesting</label>
                            <input value={formData.nesting || ''} onChange={e => updateField('nesting', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 md:col-span-2 mt-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Start Date</label>
                            <input type="date" value={formData.startDate || ''} onChange={e => updateField('startDate', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Headcount</label>
                            <input type="number" min="1" value={formData.headcount || ''} onChange={e => updateField('headcount', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Req. ID</label>
                            <input value={formData.reqId || ''} onChange={e => updateField('reqId', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]" placeholder="Optional" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
                    <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-slate-900 border border-surface-300 text-surface-500 text-[10px] font-bold uppercase rounded-sm hover:text-surface-900 transition-colors">Cancel</button>
                    <button onClick={onSave} className="px-8 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md">
                        {editingRecord ? 'Update H2R Request' : 'Create H2R Request'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
