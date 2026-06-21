import React from 'react';
import { CalendarClock, Download, Plus, Search, Filter, MapPin, Users, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { TimeOffMapping } from '@/services/MhrtService';

interface TimeOffHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onAdd: () => void;
}

export function TimeOffHeader({ searchTerm, setSearchTerm, onAdd }: TimeOffHeaderProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white px-2 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                        <CalendarClock size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none mb-1 uppercase text-[#002060]">Assigned Time Off</h2>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest opacity-80 italic">Time Off Groups & Role Assignments</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-sm hover:bg-surface-50 transition-all shadow-sm">
                        <Download size={14} /> Export Table
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        <Plus size={14} /> Add New Assignment
                    </button>
                </div>
            </div>

            <div className="bg-white border border-surface-200 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Location or Role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 text-[11px] placeholder:text-surface-400 py-2.5 pl-10 pr-4 rounded-sm focus:ring-1 focus:ring-[#002060] outline-none transition-all font-medium text-left"
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

interface TimeOffTableProps {
    mappings: TimeOffMapping[];
    isLoading: boolean;
    isDragging: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onEdit: (m: TimeOffMapping) => void;
    onDelete: (id: string) => void;
}

export function TimeOffTable({
    mappings, isLoading, isDragging, scrollRef,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onEdit, onDelete
}: TimeOffTableProps) {
    return (
        <div className={`bg-white border border-surface-200 rounded-sm shadow-sm transition-all ${isDragging ? 'cursor-grabbing select-none shadow-lg' : 'cursor-grab'}`}>
            <div
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className="overflow-x-auto relative custom-scrollbar active:cursor-grabbing"
            >
                <table className="w-full border-collapse table-fixed min-w-[800px]">
                    <thead>
                        <tr className="sticky top-0 z-20 bg-[#002060] text-white">
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10 w-[420px]">
                                Location Group
                            </th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10">
                                Assigned Roles / Positions
                            </th>
                            <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center w-[80px]">
                                <MoreHorizontal size={14} className="mx-auto" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-[#002060]/20 border-t-[#002060] rounded-full animate-spin"></div>
                                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Hydrating Time-Off Grid...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : mappings.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-50/80 transition-colors group">
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#002060]/5 rounded flex items-center justify-center text-[#002060] shadow-inner border border-[#002060]/10">
                                            <MapPin size={14} />
                                        </div>
                                        <span className="text-[12px] font-black text-surface-900 uppercase tracking-tight">{item.locationGroup}</span>
                                    </div>
                                </td>
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex flex-wrap gap-2 text-left">
                                        {item.assignedRoles.split(', ').map((role) => (
                                            <div key={role} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-surface-200 rounded-sm shadow-sm">
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
                                            className="p-2 text-surface-400 hover:text-[#002060] transition-colors rounded-sm hover:bg-white shadow-sm border border-transparent hover:border-surface-200"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-2 text-surface-400 hover:text-red-500 transition-colors rounded-sm hover:bg-white shadow-sm border border-transparent hover:border-surface-200"
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

            <div className="bg-surface-50 border-t border-surface-200 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest text-left">
                    Reference Grid: Time Off Assignments
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[9px] font-black text-surface-500 uppercase tracking-widest">Systems Latency: 24ms</span>
                </div>
            </div>
        </div>
    );
}

interface TimeOffFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingMapping: TimeOffMapping | null;
    formData: Partial<TimeOffMapping>;
    setFormData: (d: Partial<TimeOffMapping>) => void;
    onSave: () => void;
}

export function TimeOffFormModal({ isOpen, onClose, editingMapping, formData, setFormData, onSave }: TimeOffFormModalProps) {
    const updateField = (field: keyof TimeOffMapping, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={editingMapping ? "Edit Time Off Assignment" : "Add Time Off Assignment"}
            size="md"
        >
            <div className="space-y-6 text-left">
                <div className="space-y-4 text-left">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Location Group</label>
                        <input value={formData.locationGroup || ''} onChange={e => updateField('locationGroup', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. PHILIPPINES CEBU NEW" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Assigned Roles (Comma separated)</label>
                        <textarea value={formData.assignedRoles || ''} onChange={e => updateField('assignedRoles', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs h-32 outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. Agents, TL, Trainers" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-surface-300 text-surface-500 text-[10px] font-bold uppercase rounded-sm hover:text-surface-900 transition-colors">Cancel</button>
                    <button onClick={onSave} className="px-8 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md">
                        {editingMapping ? 'Update Assignment' : 'Save Assignment'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
