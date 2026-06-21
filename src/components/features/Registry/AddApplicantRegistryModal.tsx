import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { useToast } from '@/components/common/useToast';
import { X, User, Mail, Briefcase, Database, Check } from 'lucide-react';
import type { ApplicationStatus } from '@/types/application';

interface AddApplicantRegistryModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultColumn?: string;
}

export const AddApplicantRegistryModal: React.FC<AddApplicantRegistryModalProps> = ({
    open,
    onClose,
    onSuccess,
    defaultColumn
}) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [positions, setPositions] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        position_id: '',
        department: '',
        status: 'Hired' as ApplicationStatus,
        master_wave: '',
        master_hiring_request_id: '',
        master_eid: '',
        master_column: defaultColumn || 'MASTERLIST',
        master_training_start_date: '',
        master_neo_date: '',
        master_cp36_email: '',
        master_discord_handle: '',
        master_basic_salary: '',
        master_allowance: '',
        master_peme_status: 'CLEARED',
        master_peme_result: '',
        master_bgs_status: 'CLEARED',
        master_email_nbi_status: 'RECEIVED',
        master_nbi_result: '',
        master_bi_endorsement_date: '',
        master_bi_result: 'PASSED',
        master_remarks: ''
    });

    React.useEffect(() => {
        if (open) {
            PositionService.getAll().then(setPositions);
        }
    }, [open]);

    const handleSave = async () => {
        // Relaxed validation: Only Name and Position are strictly required for manual addition
        if (!formData.name || !formData.position_id) {
            error('Incomplete Record', 'Candidate Name and Target Position are required.');
            return;
        }

        setLoading(true);
        try {
            const selectedPos = positions.find(p => p.id === formData.position_id);
            
            await ApplicationService.createInternal({
                applicant_name: formData.name,
                applicant_email: formData.email || `manual_${Date.now()}@registry.internal`,
                position_id: formData.position_id,
                position_title: selectedPos?.title || 'Unknown Position',
                department: formData.department || selectedPos?.department || 'Operations',
                current_status: formData.status,
                applied_at: new Date().toISOString(),
                // Masterlist Metadata
                master_wave: formData.master_wave,
                master_hiring_request_id: formData.master_hiring_request_id,
                master_eid: formData.master_eid,
                master_column: formData.master_column,
                master_training_start_date: formData.master_training_start_date,
                master_neo_date: formData.master_neo_date,
                master_cp36_email: formData.master_cp36_email,
                master_discord_handle: formData.master_discord_handle,
                master_basic_salary: formData.master_basic_salary ? Number(formData.master_basic_salary) : 0,
                master_allowance: formData.master_allowance ? Number(formData.master_allowance) : 0,
                master_peme_status: formData.master_peme_status,
                master_peme_result: formData.master_peme_result,
                master_bgs_status: formData.master_bgs_status,
                master_email_nbi_status: formData.master_email_nbi_status,
                master_nbi_result: formData.master_nbi_result,
                master_bi_endorsement_date: formData.master_bi_endorsement_date,
                master_bi_result: formData.master_bi_result,
                master_remarks: formData.master_remarks
            });

            success('Record Inserted', 'Applicant has been manually committed to the Registry.');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to add applicant:', err);
            error('Insertion Failed', 'Could not save the new candidate record.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="MANUAL REGISTRY INSERTION"
            size="2xl"
        >
            <div className="flex flex-col h-[80vh] bg-surface-50 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="space-y-8">
                        {/* SECTION: IDENTITY & CORE */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                            <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                <User size={14} className="text-primary-600" />
                                <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">IDENTITY & CORE DETAILS</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Full Legal Name *</span>
                                    <input 
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="Enter full name"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Personal Email</span>
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        placeholder="email@example.com"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Target Position *</span>
                                    <select 
                                        value={formData.position_id}
                                        onChange={e => setFormData({...formData, position_id: e.target.value})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    >
                                        <option value="">Select a position...</option>
                                        {positions.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Initial Registry Status</span>
                                    <select 
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value as ApplicationStatus})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-primary-600"
                                    >
                                        {[
                                            'Hired',
                                            'For Job Offer',
                                            'Withdrawn',
                                            'For PAN',
                                            'Applicant Form',
                                            'Lateral Transfer',
                                            'Sent JO and BGC',
                                            'Assessment'
                                        ].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>

                        {/* SECTION: OPERATIONAL METADATA */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                            <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                <Database size={14} className="text-primary-600" />
                                <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">OPERATIONAL METADATA</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">WAVE / Batch</span>
                                    <input 
                                        type="text"
                                        value={formData.master_wave}
                                        onChange={e => setFormData({...formData, master_wave: e.target.value})}
                                        placeholder="e.g. WAVE 42"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Hiring Request ID</span>
                                    <input 
                                        type="text"
                                        value={formData.master_hiring_request_id}
                                        onChange={e => setFormData({...formData, master_hiring_request_id: e.target.value})}
                                        placeholder="e.g. CAS-2024"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Employee ID (EID)</span>
                                    <input 
                                        type="text"
                                        value={formData.master_eid}
                                        onChange={e => setFormData({...formData, master_eid: e.target.value})}
                                        placeholder="Internal EID"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Assigned Month</span>
                                    <select 
                                        value={formData.master_column}
                                        onChange={e => setFormData({...formData, master_column: e.target.value})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-primary-600"
                                    >
                                        <option value="">Select Month...</option>
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                                            <option key={month} value={month}>{month}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-5 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Internal Dept</span>
                                    <input 
                                        type="text"
                                        value={formData.department}
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                        placeholder="e.g. Operations"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Training Date</span>
                                    <input 
                                        type="date"
                                        value={formData.master_training_start_date}
                                        onChange={e => setFormData({...formData, master_training_start_date: e.target.value})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">NEO Date</span>
                                    <input 
                                        type="date"
                                        value={formData.master_neo_date}
                                        onChange={e => setFormData({...formData, master_neo_date: e.target.value})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">CP36 Email</span>
                                    <input 
                                        type="text"
                                        value={formData.master_cp36_email}
                                        onChange={e => setFormData({...formData, master_cp36_email: e.target.value})}
                                        placeholder="internal@cp36.it"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none lowercase"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Discord Handle</span>
                                    <input 
                                        type="text"
                                        value={formData.master_discord_handle}
                                        onChange={e => setFormData({...formData, master_discord_handle: e.target.value})}
                                        placeholder="username#0000"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* SECTION: FINANCIALS */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                            <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                <Briefcase size={14} className="text-primary-600" />
                                <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">FINANCIAL DATA</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Basic Monthly Salary</span>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600 font-bold text-[10px]">PHP</span>
                                        <input 
                                            type="number"
                                            value={formData.master_basic_salary}
                                            onChange={e => setFormData({...formData, master_basic_salary: e.target.value})}
                                            placeholder="0.00"
                                            className="w-full pl-12 pr-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-primary-700"
                                        />
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Monthly Allowance</span>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-600 font-bold text-[10px]">PHP</span>
                                        <input 
                                            type="number"
                                            value={formData.master_allowance}
                                            onChange={e => setFormData({...formData, master_allowance: e.target.value})}
                                            placeholder="0.00"
                                            className="w-full pl-12 pr-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-primary-700"
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* SECTION: COMPLIANCE & RESULTS */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                            <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                <Database size={14} className="text-primary-600" />
                                <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">COMPLIANCE & FINAL RESULTS</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">PEME Status</span>
                                    <input 
                                        type="text"
                                        value={formData.master_peme_status}
                                        onChange={e => setFormData({...formData, master_peme_status: e.target.value})}
                                        placeholder="e.g. CLEARED"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">BGS Background</span>
                                    <input 
                                        type="text"
                                        value={formData.master_bgs_status}
                                        onChange={e => setFormData({...formData, master_bgs_status: e.target.value})}
                                        placeholder="e.g. CLEARED"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">NBI Verification</span>
                                    <input 
                                        type="text"
                                        value={formData.master_nbi_result}
                                        onChange={e => setFormData({...formData, master_nbi_result: e.target.value})}
                                        placeholder="e.g. VALID"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                            </div>
                            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">BI Recommendation</span>
                                    <select 
                                        value={formData.master_bi_result}
                                        onChange={e => setFormData({...formData, master_bi_result: e.target.value})}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-emerald-600"
                                    >
                                        <option value="PASSED">Passed</option>
                                        <option value="FAILED">Failed</option>
                                        <option value="CONDITIONAL">Conditional</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Operational Remarks</span>
                                    <input 
                                        type="text"
                                        value={formData.master_remarks}
                                        onChange={e => setFormData({...formData, master_remarks: e.target.value})}
                                        placeholder="internal notes"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white px-8 py-5 border-t border-surface-200 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-medium text-surface-400 uppercase tracking-widest">Manual Insertion Tool V1.2</p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-8 py-2.5 text-[11px] font-bold text-surface-500 uppercase tracking-widest hover:bg-surface-50 rounded-sm transition-all"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={loading}
                            className="px-10 py-2.5 bg-primary-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-primary-700 shadow-premium transition-all flex items-center gap-2"
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <Check size={14} /> Commit to Registry
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
