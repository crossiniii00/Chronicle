import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Check, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/utils/formatters';

interface ImportPreviewModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: any[];
    loading: boolean;
}

export function ImportPreviewModal({ open, onClose, onConfirm, data, loading }: ImportPreviewModalProps) {
    return (
        <Modal open={open} onClose={onClose} title="Import Registry Preview" size="2xl">
            <div className="space-y-6">
                <div className="flex items-center gap-4 bg-primary-50 border border-primary-100 p-4 rounded-none text-left">
                    <div className="w-10 h-10 rounded-none bg-primary-600 flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-surface-900 uppercase tracking-tight">Ready to Synchronize</h4>
                        <p className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">
                            Found {data.length} valid candidate records for import 
                            {data.length > 100 && <span className="text-primary-400 ml-1">(Showing first 100 for preview)</span>}
                        </p>
                    </div>
                </div>

                <div className="border border-surface-200 rounded-none overflow-hidden text-left">
                    <div className="max-h-[400px] overflow-auto custom-scrollbar">
                        <table className="w-full text-[10px] font-bold uppercase tracking-tight border-collapse">
                            <thead className="bg-surface-50 border-b border-surface-200 sticky top-0 z-20">
                                <tr className="divide-x divide-surface-100">
                                    {data.length > 0 && Object.keys(data[0]).map((key, kIdx) => (
                                        <th 
                                            key={key} 
                                            className={cn(
                                                "px-3 py-2 text-surface-400 font-bold whitespace-nowrap",
                                                kIdx === 0 && "sticky left-0 bg-surface-50 z-30"
                                            )}
                                        >
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100 bg-white">
                                {data.slice(0, 100).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-surface-50 transition-colors divide-x divide-surface-100">
                                        {Object.keys(row).map((key, kIdx) => (
                                            <td 
                                                key={`${idx}-${key}`} 
                                                className={cn(
                                                    "px-3 py-2 text-surface-700 whitespace-nowrap border-r border-surface-100",
                                                    kIdx === 0 && "sticky left-0 bg-white group-hover:bg-surface-50 z-10 font-bold text-surface-900",
                                                    key.toLowerCase().includes('email') && "lowercase tracking-normal text-surface-500 font-medium"
                                                )}
                                                style={{ minWidth: key.toLowerCase().includes('date') || key.toLowerCase().includes('email') ? '200px' : '120px' }}
                                            >
                                                {row[key]?.toString() || ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-3 rounded-none flex items-start gap-3 text-left">
                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                        Important: Ensure all data is accurate before proceeding. This will create new records in the registry. 
                        Records with missing names or emails have been automatically excluded.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-surface-500 hover:text-surface-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-8 py-2.5 bg-primary-600 text-white rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : <><Check size={14} /> Confirm Import</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
