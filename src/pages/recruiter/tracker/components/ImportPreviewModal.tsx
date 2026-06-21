import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, FileSpreadsheet, Database } from 'lucide-react';

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (moveToMasterlist: boolean) => void;
    data: any[];
    isSaving: boolean;
    activeTab: string;
}

export function ImportPreviewModal({ isOpen, onClose, onConfirm, data, isSaving, activeTab }: ImportPreviewModalProps) {
    const [moveHiredToMasterlist, setMoveHiredToMasterlist] = React.useState(true);
    
    if (!isOpen) return null;

    const sample = data.slice(0, 20); 
    const metadataKeys = data.length > 0 ? Object.keys(data[0].metadata || {}) : [];
    
    const hiredCount = data.filter(row => {
        const status = (row.current_status || '').toUpperCase();
        return ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'].includes(status);
    }).length;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="relative bg-white w-full max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl rounded-sm border border-surface-200"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="text-surface-600" size={20} />
                            <div>
                                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Import Preview</h2>
                                <p className="text-[10px] text-surface-500 font-medium">Reviewing {data.length.toLocaleString()} records for {activeTab}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-surface-200 rounded-full transition-colors text-surface-400">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col p-6">
                        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-sm text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            <AlertCircle size={14} />
                            Please verify the column mappings below before committing to the registry.
                        </div>

                        <div className="flex-1 border border-surface-200 rounded-sm overflow-hidden flex flex-col bg-white">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-fixed min-w-[2000px]">
                                    <thead className="sticky top-0 z-20 bg-surface-50 border-b border-surface-200">
                                        <tr>
                                            <th className="w-12 px-3 py-2 text-[10px] font-bold text-surface-400 uppercase border-r border-surface-100">#</th>
                                            <th className="w-64 px-4 py-2 text-[10px] font-bold text-surface-900 uppercase border-r border-surface-100">Name</th>
                                            <th className="w-64 px-4 py-2 text-[10px] font-bold text-surface-900 uppercase border-r border-surface-100">Email</th>
                                            <th className="w-64 px-4 py-2 text-[10px] font-bold text-surface-900 uppercase border-r border-surface-100">Position</th>
                                            <th className="w-48 px-4 py-2 text-[10px] font-bold text-surface-900 uppercase border-r border-surface-100">Status</th>
                                            {metadataKeys.map(key => (
                                                <th key={key} className="w-60 px-4 py-2 text-[10px] font-medium text-surface-500 uppercase border-r border-surface-100 truncate">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {sample.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-surface-50/50 transition-colors">
                                                <td className="px-3 py-2.5 text-[10px] text-surface-400 border-r border-surface-100">{idx + 1}</td>
                                                <td className="px-4 py-2.5 text-[11px] text-surface-900 font-medium border-r border-surface-100">{row.applicant_name}</td>
                                                <td className="px-4 py-2.5 text-[11px] text-surface-500 border-r border-surface-100">{row.applicant_email}</td>
                                                <td className="px-4 py-2.5 text-[11px] text-surface-700 font-bold border-r border-surface-100">{row.position_title}</td>
                                                <td className="px-4 py-2.5 text-[10px] text-surface-600 border-r border-surface-100 uppercase">{row.current_status}</td>
                                                {metadataKeys.map(key => (
                                                    <td key={key} className="px-4 py-2.5 text-[11px] text-surface-500 border-r border-surface-100 truncate">
                                                        {String(row.metadata[key] || '---')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.length > 20 && (
                                <div className="py-2 bg-surface-50 text-center text-[10px] text-surface-400 font-bold uppercase border-t border-surface-200">
                                    + {data.length - 20} additional rows verified
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-surface-50/50 border-t border-surface-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#107c10] uppercase">
                                    <CheckCircle2 size={14} />
                                    {data.length.toLocaleString()} Records Ready
                                </div>
                                
                                {hiredCount > 0 && (
                                    <div className="flex items-center gap-3 py-1.5 px-3 bg-emerald-50 border border-emerald-100 rounded-sm">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 uppercase">
                                            <Database size={14} />
                                            {hiredCount} Hired Candidates Detected
                                        </div>
                                        <div className="h-4 w-[1px] bg-emerald-200" />
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={moveHiredToMasterlist}
                                                onChange={(e) => setMoveHiredToMasterlist(e.target.checked)}
                                                className="w-3.5 h-3.5 border-emerald-300 rounded-sm text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">
                                                Move to Masterlist?
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white border border-surface-300 text-surface-600 text-[10px] font-bold uppercase hover:bg-surface-50 transition-all rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onConfirm(moveHiredToMasterlist)}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-[#d13438] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#a82a2d] transition-all rounded-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Database size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {isSaving ? 'Processing...' : `Commit ${data.length.toLocaleString()} Records`}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
