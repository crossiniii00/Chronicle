import React from 'react';
import { ClipboardCheck, Download, Plus, Search, Filter, Building2, Users, DollarSign, Layers } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import type { MHRTAccount } from '@/services/MhrtService';

interface AccountTableHeaderProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onAdd: () => void;
    totalCount: number;
    filteredCount: number;
}

export function AccountTableHeader({ searchTerm, setSearchTerm, onAdd, totalCount, filteredCount }: AccountTableHeaderProps) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-200 bg-white dark:bg-slate-900 px-2 mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#002060]/5 rounded-sm text-[#002060] border border-[#002060]/10">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none mb-1 uppercase text-[#002060]">Minimum Hiring Requirements Tracker (MHRT)</h2>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest opacity-80 italic">Manage Salaries, Accounts, H2R Creation, and Directory Services</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-sm hover:bg-surface-50 transition-all shadow-sm">
                        <Download size={14} /> Export Spreadsheet
                    </button>
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        <Plus size={14} /> Add New Account
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

interface AccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingAccount: MHRTAccount | null;
    formData: Partial<MHRTAccount>;
    setFormData: (d: Partial<MHRTAccount>) => void;
    onSave: () => void;
}

export function AccountFormModal({ isOpen, onClose, editingAccount, formData, setFormData, onSave }: AccountFormModalProps) {
    const updateField = (field: keyof MHRTAccount, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={editingAccount ? "Edit Account MHRT" : "Add New Account MHRT"}
            size="2xl"
        >
            <div className="space-y-8 text-left">
                {/* Section 1: Identity */}
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-surface-100 pb-2">
                        <Building2 size={16} className="text-[#002060]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#002060]">Account Identity</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Account Name', field: 'account' },
                            { label: 'Pseudonym', field: 'pseudonym' },
                            { label: 'Position', field: 'position' },
                            { label: 'Vertical', field: 'vertical' },
                        ].map(f => (
                            <div key={f.field} className="space-y-1">
                                <label className="text-[10px] font-bold text-surface-500 uppercase">{f.label}</label>
                                <input
                                    value={(formData as any)[f.field] || ''}
                                    onChange={e => updateField(f.field as any, e.target.value)}
                                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]"
                                />
                            </div>
                        ))}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase">Direction</label>
                            <select value={formData.direction || ''} onChange={e => updateField('direction', e.target.value)} className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]">
                                <option value="Both">Both</option>
                                <option value="Inbound">Inbound</option>
                                <option value="Outbound">Outbound</option>
                                <option value="Back Office">Back Office</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase">Voice Type</label>
                            <select value={formData.voiceType || ''} onChange={e => updateField('voiceType', e.target.value)} className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]">
                                <option value="Multi">Multi</option>
                                <option value="Voice">Voice</option>
                                <option value="Non-Voice">Non-Voice</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Leadership */}
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-surface-100 pb-2">
                        <Users size={16} className="text-[#002060]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#002060]">Leadership & POCs</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Campaign Manager', field: 'campaignManager' },
                            { label: 'Team Manager', field: 'teamManager' },
                            { label: 'Ops Director', field: 'operationsDirector' },
                            { label: 'Trainer', field: 'trainer' },
                            { label: 'WFM POC', field: 'wfmPoc' },
                            { label: 'Ops Validator', field: 'opsValidator' },
                        ].map(f => (
                            <div key={f.field} className="space-y-1">
                                <label className="text-[10px] font-bold text-surface-500 uppercase">{f.label}</label>
                                <input
                                    value={(formData as any)[f.field] || ''}
                                    onChange={e => updateField(f.field as any, e.target.value)}
                                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Salary & Requirements */}
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-surface-100 pb-2">
                        <DollarSign size={16} className="text-[#002060]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#002060]">Hiring & Salary Specs</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Base Salary', field: 'baseSalary' },
                            { label: 'Allowance', field: 'allowance' },
                            { label: 'Education', field: 'education' },
                            { label: 'Experience', field: 'workExperience' },
                            { label: 'Typing Speed', field: 'typingSpeed' },
                            { label: 'Accuracy', field: 'typingAccuracy' },
                            { label: 'CEFR', field: 'cefr' },
                            { label: 'ASE', field: 'ase' },
                        ].map(f => (
                            <div key={f.field} className="space-y-1">
                                <label className="text-[10px] font-bold text-surface-500 uppercase">{f.label}</label>
                                <input
                                    value={(formData as any)[f.field] || ''}
                                    onChange={e => updateField(f.field as any, e.target.value)}
                                    className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 4: Operational */}
                <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-surface-100 pb-2">
                        <Layers size={16} className="text-[#002060]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#002060]">Operational Logistics</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-surface-500 uppercase">LOB Details</label>
                            <textarea value={formData.lob || ''} onChange={e => updateField('lob', e.target.value)} className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs h-24 outline-none focus:ring-1 focus:ring-[#002060]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-surface-500 uppercase">OV Status</label>
                                <select value={formData.ovStatus || ''} onChange={e => updateField('ovStatus', e.target.value)} className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]">
                                    <option value="Verified">Verified</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Flagged">Flagged</option>
                                </select>
                            </div>
                            {[
                                { label: 'Location', field: 'location' },
                                { label: 'Roster Lock', field: 'rosterLock' },
                                { label: 'Final IV Sched', field: 'finalInterviewSchedule' },
                            ].map(f => (
                                <div key={f.field} className="space-y-1">
                                    <label className="text-[10px] font-bold text-surface-500 uppercase">{f.label}</label>
                                    <input
                                        value={(formData as any)[f.field] || ''}
                                        onChange={e => updateField(f.field as any, e.target.value)}
                                        className="w-full p-2 bg-surface-50 border border-surface-200 rounded text-xs outline-none focus:ring-1 focus:ring-[#002060]"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white dark:bg-slate-900 border border-surface-300 text-surface-500 text-[10px] font-bold uppercase rounded-sm hover:text-surface-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-8 py-2 bg-[#002060] text-white text-[10px] font-bold uppercase rounded-sm hover:bg-[#002060]/90 transition-all shadow-md"
                    >
                        Save Account Configuration
                    </button>
                </div>
            </div>
        </Modal>
    );
}
