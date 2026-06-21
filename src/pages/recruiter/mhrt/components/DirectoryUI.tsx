import React from 'react';
import { BookOpen, Download, Plus, Search, Filter, Building2, Users, Mail, Copy, Check, Edit3, Trash2 } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import type { DirectoryEntry } from '@/services/MhrtService';

interface DirectoryHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onAdd: () => void;
    count: number;
}

export function DirectoryHeader({ searchTerm, setSearchTerm, onAdd, count }: DirectoryHeaderProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white px-2 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none mb-1 uppercase text-[#002060]">MHRT Directory</h2>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest opacity-80 italic">Global Distribution Lists & POCS</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-sm shadow-sm hover:bg-surface-50 transition-colors">
                        <Download size={14} /> Export Directory
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        <Plus size={14} /> Add New Entry
                    </button>
                </div>
            </div>

            <div className="bg-white border border-surface-200 p-4 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by Account, Team, or Distro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-50 border border-surface-200 text-[11px] py-2.5 pl-10 pr-4 rounded-sm focus:ring-1 focus:ring-[#002060] outline-none font-medium text-left"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-tighter">
                        Showing {count} entries
                    </span>
                </div>
            </div>
        </>
    );
}

interface DirectoryTableProps {
    entries: DirectoryEntry[];
    isLoading: boolean;
    isDragging: boolean;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    copiedId: string | null;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseUp: () => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onCopy: (id: string, text: string) => void;
    onEdit: (entry: DirectoryEntry) => void;
    onDelete: (id: string) => void;
}

export function DirectoryTable({
    entries, isLoading, isDragging, scrollRef, copiedId,
    onMouseDown, onMouseLeave, onMouseUp, onMouseMove,
    onCopy, onEdit, onDelete
}: DirectoryTableProps) {
    return (
        <div className={`bg-white border border-surface-200 rounded-sm shadow-sm transition-all ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}>
            <div
                ref={scrollRef}
                onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} onMouseMove={onMouseMove}
                className="overflow-x-auto relative custom-scrollbar active:cursor-grabbing"
            >
                <table className="w-full border-collapse table-fixed min-w-[1000px]">
                    <thead>
                        <tr className="sticky top-0 z-20 bg-[#002060] text-white">
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10 w-[200px]">Account</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10 w-[150px]">POC Name</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10 w-[250px]">Team / Department</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-wider text-left border-r border-white/10">Distribution Email</th>
                            <th className="p-4 text-center w-[120px] font-black uppercase text-[11px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-4 border-[#002060]/20 border-t-[#002060] rounded-full animate-spin"></div>
                                        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-widest">Hydrating Directory...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : entries.map((item) => (
                            <tr key={item.id} className="hover:bg-surface-50/80 transition-colors group">
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#002060]/5 rounded flex items-center justify-center text-[#002060] border border-[#002060]/10">
                                            <Building2 size={14} />
                                        </div>
                                        <span className="text-[12px] font-black text-surface-900 uppercase tracking-tight">{item.account}</span>
                                    </div>
                                </td>
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="text-[11px] font-bold text-surface-500 uppercase tracking-tighter italic opacity-60">
                                        {item.name}
                                    </div>
                                </td>
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex items-center gap-2">
                                        <Users size={12} className="text-surface-400" />
                                        <span className="text-[12px] font-bold text-surface-700 uppercase tracking-tight">{item.team}</span>
                                    </div>
                                </td>
                                <td className="p-4 border-r border-surface-100 text-left">
                                    <div className="flex items-center justify-between gap-2 group/email">
                                        <a
                                            href={`mailto:${item.distro}`}
                                            className="text-[12px] font-bold text-[#0078d4] hover:underline flex items-center gap-1.5 break-all leading-tight"
                                        >
                                            <Mail size={12} />
                                            {item.distro}
                                        </a>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCopy(item.id, item.distro); }}
                                            className={cn(
                                                "p-1.5 rounded-sm transition-all opacity-0 group-hover:opacity-100",
                                                copiedId === item.id ? "bg-green-50 text-green-600" : "hover:bg-surface-100 text-surface-400"
                                            )}
                                        >
                                            {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-2 text-surface-400 hover:text-[#002060] transition-colors rounded-sm hover:bg-white border border-transparent hover:border-surface-200"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-2 text-surface-400 hover:text-red-500 transition-colors rounded-sm hover:bg-white border border-transparent hover:border-surface-200"
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

interface DirectoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingItem: DirectoryEntry | null;
    formData: Partial<DirectoryEntry>;
    setFormData: (d: Partial<DirectoryEntry>) => void;
    onSave: () => void;
}

export function DirectoryFormModal({ isOpen, onClose, editingItem, formData, setFormData, onSave }: DirectoryFormModalProps) {
    const updateField = (field: keyof DirectoryEntry, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={editingItem ? "Edit Directory Entry" : "Add New Directory Entry"}
            size="md"
        >
            <div className="space-y-6 text-left">
                <div className="space-y-4 text-left">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Account / Feature</label>
                        <input value={formData.account || ''} onChange={e => updateField('account', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. Enercare" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">POC Name (Optional)</label>
                        <input value={formData.name || ''} onChange={e => updateField('name', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. John Doe or N/A" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Team / Department</label>
                        <input value={formData.team || ''} onChange={e => updateField('team', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. Management Team" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider text-left">Distribution Email</label>
                        <input value={formData.distro || ''} onChange={e => updateField('distro', e.target.value)} className="w-full p-2.5 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060] text-left" placeholder="e.g. team@cp-360.com" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-surface-300 text-surface-500 text-[10px] font-bold uppercase rounded-sm hover:text-surface-900 transition-colors">Cancel</button>
                    <button onClick={onSave} className="px-8 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md">
                        {editingItem ? 'Update Entry' : 'Save Entry'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
