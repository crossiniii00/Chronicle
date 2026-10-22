import React from 'react';
import { LayoutGrid, Download, Plus, Search, Filter, Building2, Users, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { DivisionMapping } from '@/services/MhrtService';

interface DivisionHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onAdd: () => void;
}

export function DivisionHeader({ searchTerm, setSearchTerm, onAdd }: DivisionHeaderProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white dark:bg-slate-900 px-2 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none mb-1 uppercase text-[#002060]">H2R Division Hub</h2>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest opacity-80 italic">Role Mapping & Division Assignments</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-sm shadow-sm">
                        <Download size={14} /> Export Table
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        <Plus size={14} /> Add Division Mapping
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-surface-200 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md text-left">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Division or Role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 text-[11px] py-2.5 pl-10 pr-4 rounded-sm focus:ring-1 focus:ring-[#002060] outline-none font-medium text-left"
                    />
                </div>
            </div>
        </>
    );
}

interface DivisionTableProps {
    mappings: DivisionMapping[];
    isLoading: boolean;
    isDragging: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onEdit: (m: DivisionMapping) => void;
    onDelete: (id: string) => void;
}

export function DivisionTable({
    mappings, isLoading, isDragging, scrollRef,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onEdit, onDelete
}: DivisionTableProps) {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm transition-all ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}>
            <div
                ref={scrollRef}
                onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} onMouseMove={onMouseMove}
                className="overflow-x-auto relative custom-scrollbar active:cursor-grabbing"
            >
                <table className="w-full border-collapse table-fixed min-w-[800px]">
                    <thead>
                        <tr className="sticky top-0 z-20 bg-[#002060] text-white">
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10 w-[300px]">Division / Department</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10">Assigned Roles / Positions</th>
                            <th className="p-4 text-center w-[80px]"><MoreHorizontal size={14} className="mx-auto" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="p-20 text-center text-left">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-[#002060]/20 border-t-[#002060] rounded-full animate-spin"></div>
                                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest text-left">Hydrating Division Hub...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : mappings.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-50/80 transition-colors group">
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#002060]/5 rounded flex items-center justify-center text-[#002060] border border-[#002060]/10"><Building2 size={14} /></div>
                                        <span className="text-[12px] font-black text-surface-900 uppercase tracking-tight">{item.division}</span>
                                    </div>
                                </td>
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex flex-wrap gap-2 text-left">
                                        {item.assignedRoles.split(', ').map((role, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm">
                                                <Users size={12} className="text-[#002060]/60" />
                                                <span className="text-[11px] font-bold text-surface-700 uppercase tracking-tighter">{role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-2 text-surface-400 hover:text-[#002060] transition-colors rounded-sm hover:bg-white dark:bg-slate-900 border border-transparent hover:border-surface-200"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-2 text-surface-400 hover:text-red-500 transition-colors rounded-sm hover:bg-white dark:bg-slate-900 border border-transparent hover:border-surface-200"
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
        </div>
    );
}

interface DivisionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingMapping: DivisionMapping | null;
    formData: Partial<DivisionMapping>;
    setFormData: (d: Partial<DivisionMapping>) => void;
    onSave: () => void;
}

export function DivisionFormModal({ isOpen, onClose, editingMapping, formData, setFormData, onSave }: DivisionFormModalProps) {
    const updateField = (field: keyof DivisionMapping, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={editingMapping ? "Edit Division Mapping" : "Add Division Mapping"}
            size="md"
        >
            <div className="space-y-6 text-left">
                <div className="space-y-4 text-left">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Division Name</label>
                        <input value={formData.division || ''} onChange={e => updateField('division', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. Operations Support" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Assigned Roles (Comma separated)</label>
                        <textarea value={formData.assignedRoles || ''} onChange={e => updateField('assignedRoles', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs h-32 outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. TL, TM, OM" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
                    <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-slate-900 border border-surface-300 text-surface-500 text-[10px] font-bold uppercase rounded-sm hover:text-surface-900 transition-colors">Cancel</button>
                    <button onClick={onSave} className="px-8 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md">
                        {editingMapping ? 'Update Mapping' : 'Save Mapping'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
