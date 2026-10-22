import React from 'react';
import { motion } from 'framer-motion';
import { Building, Mic, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface AddCandidateSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (type: 'onsite' | 'oncall') => void;
}

export function AddCandidateSelectorModal({ open, onClose, onSelect }: AddCandidateSelectorModalProps) {
    return (
        <Modal open={open} onClose={onClose} title="Select Candidate Type" size="sm">
            <div className="p-4 flex flex-col gap-3">
                <motion.button
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelect('onsite')}
                    className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-lg hover:border-[#0078D4] hover:shadow-sm transition-all group text-left"
                >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-[#0078D4]/10 flex items-center justify-center text-[#0078D4] group-hover:bg-[#0078D4] group-hover:text-white transition-colors">
                        <Building size={18} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-[14px] text-surface-900 leading-tight">On-site Candidate</h3>
                        <p className="text-[12px] text-surface-500 mt-0.5">Add a candidate for an in-office position.</p>
                    </div>
                    <div className="text-surface-300 group-hover:text-[#0078D4] transition-colors">
                        <ArrowRight size={16} />
                    </div>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelect('oncall')}
                    className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-lg hover:border-[#107C10] hover:shadow-sm transition-all group text-left"
                >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-[#107C10]/10 flex items-center justify-center text-[#107C10] group-hover:bg-[#107C10] group-hover:text-white transition-colors">
                        <Mic size={18} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-[14px] text-surface-900 leading-tight">On-call Candidate</h3>
                        <p className="text-[12px] text-surface-500 mt-0.5">Add a candidate for a remote/on-call role.</p>
                    </div>
                    <div className="text-surface-300 group-hover:text-[#107C10] transition-colors">
                        <ArrowRight size={16} />
                    </div>
                </motion.button>
            </div>
        </Modal>
    );
}
