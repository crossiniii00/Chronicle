import React from 'react';
import { Modal } from '@/components/common/Modal';
import { X } from 'lucide-react';

interface AccountFormModalProps {
    modal: boolean;
    setModal: (open: boolean) => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    form: { name: string; head: string; budget_code: string; type: string };
    setForm: React.Dispatch<React.SetStateAction<{ name: string; head: string; budget_code: string; type: string }>>;
    handleAddAccount: () => Promise<void>;
    submitting: boolean;
}

export function AccountFormModal({
    modal, setModal, editingId, setEditingId, form, setForm, handleAddAccount, submitting
}: AccountFormModalProps) {
    return (
        <Modal open={modal} onClose={() => { setModal(false); setEditingId(null); }} title="" size="md">
            <div className="flex flex-col bg-slate-50/30 text-left overflow-hidden rounded-b-none font-sans p-8 space-y-6 select-none relative">
                {/* Floating Close Button */}
                <button
                    onClick={() => {
                        setModal(false);
                        setEditingId(null);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer z-50"
                >
                    <X size={18} />
                </button>

                {/* Modal Title */}
                <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {editingId ? "Update Account Details" : "Create New Account"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure account designation, category, and owner details.</p>
                </div>

                <div className="space-y-5">
                    <div className="text-left">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">Account Designation</label>
                        <input 
                            value={form.name} 
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Healthcare Operations" 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all text-left" 
                        />
                    </div>
                    
                    <div className="text-left">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">Account Category</label>
                        <select 
                            value={form.type} 
                            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all text-left cursor-pointer"
                        >
                            <option value="ACCOUNTS">Client Account (Accounts)</option>
                            <option value="SUPPORT_ROLES">Admin Support Role</option>
                        </select>
                    </div>

                    <div className="text-left">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">Account Head</label>
                        <input 
                            value={form.head} 
                            onChange={e => setForm(f => ({ ...f, head: e.target.value }))}
                            placeholder="Director Name" 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50 outline-none transition-all text-left" 
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6 text-left">
                    <button 
                        onClick={() => { setModal(false); setEditingId(null); }} 
                        className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => void handleAddAccount()} 
                        disabled={submitting}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all border border-indigo-700 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        {editingId ? "Save Changes" : "Create Account"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
