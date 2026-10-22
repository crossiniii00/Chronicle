import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService } from '@/services/DepartmentService';
import { useToast } from '@/components/common/useToast';
import { X, User, Mail, Briefcase, Database, Check, Award, Compass, HelpCircle, BookOpen, ChevronDown } from 'lucide-react';
import { AccountAvatar } from '@/pages/admin/components/AccountAvatar';
import type { ApplicationStatus } from '@/types/application';

interface AddApplicantRegistryModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultColumn?: string;
    activeTab?: string;
}

const calculateAge = (dobString: string): string => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const difference = Date.now() - birthDate.getTime();
    if (isNaN(difference)) return '';
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};

export const AddApplicantRegistryModal: React.FC<AddApplicantRegistryModalProps> = ({
    open,
    onClose,
    onSuccess,
    defaultColumn,
    activeTab
}) => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [positions, setPositions] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>(activeTab || 'MASTERLIST');
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

    const accountOptions = React.useMemo(() => {
        const subAccountNames = new Set<string>();
        departments.forEach(d => {
            const subs = d.subAccounts || (d as any).sub_accounts || [];
            subs.forEach((sub: any) => {
                const name = typeof sub === 'string' ? sub : sub.name;
                if (name) subAccountNames.add(name.toLowerCase());
            });
        });

        const set = new Set<string>();
        departments.forEach(d => {
            if (d.type === 'SUPPORT_ROLES') return;
            if (!d.name) return;
            if (subAccountNames.has(d.name.toLowerCase())) return;
            set.add(d.name);
        });

        const standardAccounts = [
            'Abbott',
            'Enercare',
            'DoorDash',
            'DIA',
            'Keller Postman',
            'The Facilities Group',
            'Paessler',
            'OnCourse',
            'The Savings Group',
            'Regency Assurance',
            'TFG',
            'Auto Approve'
        ];
        standardAccounts.forEach(a => set.add(a));

        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [departments]);

    const supportRoleOptions = React.useMemo(() => {
        const set = new Set<string>();
        departments.forEach(d => {
            if (d.type === 'SUPPORT_ROLES' && d.name) {
                set.add(d.name);
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [departments]);

    const [isSupportRoleDropdownOpen, setIsSupportRoleDropdownOpen] = useState(false);

    const handleTabChange = (tabId: string) => {
        setSelectedTab(tabId);
        let initialStatus = 'Hired' as ApplicationStatus;
        let initialColumn = tabId;

        if (tabId === 'INACTIVE_APPLICATION') {
            initialStatus = 'Closed';
        } else if (tabId === 'POOL') {
            initialStatus = 'POOL';
        } else if (tabId === 'OFFBOARDING_TRACKER') {
            initialStatus = 'Withdrawn';
        } else if (tabId === 'OFFBOARDING_WINNERS') {
            initialStatus = 'Hired';
        } else if (tabId === 'MASTERLIST') {
            initialStatus = 'Hired';
            initialColumn = 'January';
        }

        setFormData(prev => ({
            ...prev,
            master_column: initialColumn,
            status: initialStatus
        }));
    };
    
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        position_id: '',
        department: '',
        status: 'Hired' as ApplicationStatus,
        rejection_reason: '',
        // Masterlist Metadata
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
        master_remarks: '',
        // PIS & Demographics
        phone: '',
        birth_date: '',
        sex: '',
        civil_status: '',
        current_address: '',
        // Education & Experience
        highest_education: '',
        course_strand: '',
        bpo_experience: '',
        tenure_bpo: '',
        // Interview Q&A
        summary_of_background: '',
        previous_salary: '',
        salary_expectation: '',
        preferred_shifts: '',
        reason_for_interest: '',
        goals_6_months: '',
        available_training_start: '',
        // Assessments
        cefr_level: '',
        personality_test: '',
        critical_thinking_score: '',
        typing_test_wpm: '',
        typing_test_accuracy: ''
    });

    React.useEffect(() => {
        if (open) {
            PositionService.getAll().then(setPositions);
            DepartmentService.getAll().then(setDepartments);

            let initialStatus = 'Hired' as ApplicationStatus;
            let initialColumn = 'MASTERLIST';
            const tab = activeTab || 'MASTERLIST';
            
            if (tab === 'INACTIVE_APPLICATION') {
                initialStatus = 'Closed';
                initialColumn = 'INACTIVE_APPLICATION';
            } else if (tab === 'POOL') {
                initialStatus = 'POOL';
                initialColumn = 'POOL';
            } else if (tab === 'OFFBOARDING_TRACKER') {
                initialStatus = 'Withdrawn';
                initialColumn = 'OFFBOARDING_TRACKER';
            } else if (tab === 'OFFBOARDING_WINNERS') {
                initialStatus = 'Hired';
                initialColumn = 'OFFBOARDING_WINNERS';
            } else if (tab === 'MASTERLIST') {
                initialStatus = 'Hired';
                initialColumn = defaultColumn || 'January';
            }

            setSelectedTab(tab);
            setFormData({
                firstName: '',
                middleName: '',
                lastName: '',
                email: '',
                position_id: '',
                department: '',
                status: initialStatus,
                rejection_reason: '',
                master_wave: '',
                master_hiring_request_id: '',
                master_eid: '',
                master_column: initialColumn,
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
                master_remarks: '',
                phone: '',
                birth_date: '',
                sex: '',
                civil_status: '',
                current_address: '',
                highest_education: '',
                course_strand: '',
                bpo_experience: '',
                tenure_bpo: '',
                summary_of_background: '',
                previous_salary: '',
                salary_expectation: '',
                preferred_shifts: '',
                reason_for_interest: '',
                goals_6_months: '',
                available_training_start: '',
                cefr_level: '',
                personality_test: '',
                critical_thinking_score: '',
                typing_test_wpm: '',
                typing_test_accuracy: ''
            });
        }
    }, [open, activeTab, defaultColumn]);

    const handleSave = async () => {
        if (!formData.firstName || !formData.lastName || (!formData.department && !formData.position_id)) {
            error('Incomplete Record', 'First Name, Last Name, and Account are required.');
            return;
        }

        setLoading(true);
        try {
            const selectedPos = positions.find(p => p.id === formData.position_id || p.department === formData.department);
            const posId = formData.position_id || selectedPos?.id || positions[0]?.id || '';
            const posTitle = selectedPos?.title || formData.department || 'Customer Service';
            
            // Format name as "Last Name, First Name Middle Name"
            const fullName = `${formData.lastName.trim()}, ${formData.firstName.trim()} ${formData.middleName.trim()}`.replace(/\s+/g, ' ').trim().replace(/,\s*$/, '');

            await ApplicationService.createInternal({
                applicant_name: fullName,
                applicant_email: formData.email || `manual_${Date.now()}@registry.internal`,
                position_id: posId,
                position_title: posTitle,
                department: formData.department || selectedPos?.department || 'Operations',
                current_status: formData.status,
                rejection_reason: formData.rejection_reason,
                applied_at: new Date().toISOString(),
                source: 'MANUAL_ENTRY',
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
                master_remarks: formData.master_remarks,
                // Typing test fields
                typing_test_wpm: formData.typing_test_wpm ? Number(formData.typing_test_wpm) : null,
                typing_test_accuracy: formData.typing_test_accuracy ? Number(formData.typing_test_accuracy) : null,
                // PIS fields
                pis: {
                    phone: formData.phone,
                    birth_date: formData.birth_date,
                    age: formData.birth_date ? Number(calculateAge(formData.birth_date)) : null,
                    sex: formData.sex,
                    civil_status: formData.civil_status,
                    current_address: formData.current_address,
                    highest_education: formData.highest_education,
                    course_strand: formData.course_strand,
                    bpo_experience: formData.bpo_experience,
                    tenure_bpo: formData.tenure_bpo,
                    summary_of_background: formData.summary_of_background,
                    previous_salary: formData.previous_salary,
                    salary_expectation: formData.salary_expectation,
                    preferred_shifts: formData.preferred_shifts,
                    reason_for_interest: formData.reason_for_interest,
                    goals_6_months: formData.goals_6_months,
                    available_training_start: formData.available_training_start,
                    cefr_level: formData.cefr_level,
                    personality_test: formData.personality_test,
                    critical_thinking_score: formData.critical_thinking_score
                }
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
                        {/* SECTION 1: IDENTITY & CORE */}
                        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                            <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                <User size={14} className="text-primary-600" />
                                <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">IDENTITY & CORE DETAILS</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">First Name *</span>
                                    <input 
                                        type="text"
                                        value={formData.firstName}
                                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                                        placeholder="Enter first name"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Middle Name</span>
                                    <input 
                                        type="text"
                                        value={formData.middleName}
                                        onChange={e => setFormData({...formData, middleName: e.target.value})}
                                        placeholder="Enter middle name"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Last Name *</span>
                                    <input 
                                        type="text"
                                        value={formData.lastName}
                                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                                        placeholder="Enter last name"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                            </div>
                            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-5 gap-4">
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
                                <label className="block relative">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Account *</span>
                                    
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium bg-white dark:bg-slate-900 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                {formData.department && !supportRoleOptions.includes(formData.department) ? (
                                                    <>
                                                        <div className="w-5 h-5 flex-shrink-0">
                                                            <AccountAvatar 
                                                                department={departments.find(d => d.name?.toLowerCase() === formData.department.toLowerCase()) || { name: formData.department } as any} 
                                                                size="sm" 
                                                            />
                                                        </div>
                                                        <span className="truncate">{formData.department}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-surface-500">Select an account...</span>
                                                )}
                                            </div>
                                            <ChevronDown size={16} className={`text-surface-400 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isAccountDropdownOpen && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-40" 
                                                    onClick={() => setIsAccountDropdownOpen(false)} 
                                                />
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-surface-200 shadow-lg rounded-sm z-50 max-h-60 overflow-y-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData, 
                                                                department: '',
                                                            });
                                                            setIsAccountDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-surface-500 hover:bg-surface-50 transition-colors"
                                                    >
                                                        Select an account...
                                                    </button>
                                                    {accountOptions.map(acc => (
                                                        <button
                                                            key={acc}
                                                            type="button"
                                                            onClick={() => {
                                                                const matchedPos = positions.find(p => p.department === acc || p.title?.toLowerCase().includes(acc.toLowerCase()));
                                                                setFormData({
                                                                    ...formData, 
                                                                    department: acc,
                                                                    position_id: matchedPos?.id || formData.position_id || (positions[0]?.id || '')
                                                                });
                                                                setIsAccountDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-surface-50 transition-colors flex items-center gap-3"
                                                        >
                                                            <div className="w-5 h-5 flex-shrink-0">
                                                                <AccountAvatar 
                                                                    department={departments.find(d => d.name?.toLowerCase() === acc.toLowerCase()) || { name: acc } as any} 
                                                                    size="sm" 
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-surface-700 truncate">{acc}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </label>
                                <label className="block relative">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Support Role</span>
                                    
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsSupportRoleDropdownOpen(!isSupportRoleDropdownOpen)}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium bg-white dark:bg-slate-900 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                {formData.department && supportRoleOptions.includes(formData.department) ? (
                                                    <span className="truncate text-indigo-600">{formData.department}</span>
                                                ) : (
                                                    <span className="text-surface-500">Select a role...</span>
                                                )}
                                            </div>
                                            <ChevronDown size={16} className={`text-surface-400 transition-transform ${isSupportRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isSupportRoleDropdownOpen && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-40" 
                                                    onClick={() => setIsSupportRoleDropdownOpen(false)} 
                                                />
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-surface-200 shadow-lg rounded-sm z-50 max-h-60 overflow-y-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData, 
                                                                department: '',
                                                            });
                                                            setIsSupportRoleDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-surface-500 hover:bg-surface-50 transition-colors"
                                                    >
                                                        Select a role...
                                                    </button>
                                                    {supportRoleOptions.map(role => (
                                                        <button
                                                            key={role}
                                                            type="button"
                                                            onClick={() => {
                                                                const matchedPos = positions.find(p => p.department === role || p.title?.toLowerCase().includes(role.toLowerCase()));
                                                                setFormData({
                                                                    ...formData, 
                                                                    department: role,
                                                                    position_id: matchedPos?.id || formData.position_id || (positions[0]?.id || '')
                                                                });
                                                                setIsSupportRoleDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-surface-50 transition-colors"
                                                        >
                                                            <span className="text-sm font-medium text-surface-700 truncate">{role}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Masterlist Tab</span>
                                    <select 
                                        value={selectedTab}
                                        onChange={e => handleTabChange(e.target.value)}
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-indigo-600 cursor-pointer"
                                    >
                                        <option value="MASTERLIST">Masterlist</option>
                                        <option value="OFFBOARDING_WINNERS">Onboarding winners</option>
                                        <option value="OFFBOARDING_TRACKER">Offboarding Tracker</option>
                                        <option value="POOL">Pool</option>
                                        <option value="INACTIVE_APPLICATION">Inactive Application</option>
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

                        {/* SECTION 2: PIS DEMOGRAPHICS */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION' || selectedTab === 'POOL') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                    <Compass size={14} className="text-primary-600" />
                                    <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">PIS & DEMOGRAPHICS</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Contact Number</span>
                                        <input 
                                            type="text"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            placeholder="Contact number"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Date of Birth</span>
                                        <input 
                                            type="date"
                                            value={formData.birth_date}
                                            onChange={e => setFormData({...formData, birth_date: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Sex</span>
                                        <select 
                                            value={formData.sex}
                                            onChange={e => setFormData({...formData, sex: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        >
                                            <option value="">Select Sex...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Civil Status</span>
                                        <select 
                                            value={formData.civil_status}
                                            onChange={e => setFormData({...formData, civil_status: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        >
                                            <option value="">Select Civil Status...</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Separated">Separated</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="p-6 pt-0 grid grid-cols-1 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Current Address</span>
                                        <input 
                                            type="text"
                                            value={formData.current_address}
                                            onChange={e => setFormData({...formData, current_address: e.target.value})}
                                            placeholder="Full address details"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* SECTION 3: EDUCATION & BPO EXPERIENCE */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                    <BookOpen size={14} className="text-primary-600" />
                                    <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">EDUCATION & BPO EXPERIENCE</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Highest Educational Background</span>
                                        <input 
                                            type="text"
                                            value={formData.highest_education}
                                            onChange={e => setFormData({...formData, highest_education: e.target.value})}
                                            placeholder="e.g. College Graduate"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Strand / Course / Year Level</span>
                                        <input 
                                            type="text"
                                            value={formData.course_strand}
                                            onChange={e => setFormData({...formData, course_strand: e.target.value})}
                                            placeholder="Strand, Course, or Specialization"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Do you have any BPO experience?</span>
                                        <input 
                                            type="text"
                                            value={formData.bpo_experience}
                                            onChange={e => setFormData({...formData, bpo_experience: e.target.value})}
                                            placeholder="e.g. Yes"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Tenure in the BPO Industry</span>
                                        <input 
                                            type="text"
                                            value={formData.tenure_bpo}
                                            onChange={e => setFormData({...formData, tenure_bpo: e.target.value})}
                                            placeholder="e.g. 2 Years"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* SECTION 4: INTERVIEW Q&A */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                    <HelpCircle size={14} className="text-primary-600" />
                                    <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">INTERVIEW Q&A & EXPECTATIONS</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Previous Salary</span>
                                        <input 
                                            type="text"
                                            value={formData.previous_salary}
                                            onChange={e => setFormData({...formData, previous_salary: e.target.value})}
                                            placeholder="Previous salary details"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Salary Expectation</span>
                                        <input 
                                            type="text"
                                            value={formData.salary_expectation}
                                            onChange={e => setFormData({...formData, salary_expectation: e.target.value})}
                                            placeholder="Expected salary details"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Preferred Shift / Work Schedule</span>
                                        <input 
                                            type="text"
                                            value={formData.preferred_shifts}
                                            onChange={e => setFormData({...formData, preferred_shifts: e.target.value})}
                                            placeholder="e.g. Night Shift / Flexible"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                </div>
                                <div className="p-6 pt-0 grid grid-cols-1 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Summary of Background and Experience</span>
                                        <textarea 
                                            value={formData.summary_of_background}
                                            onChange={e => setFormData({...formData, summary_of_background: e.target.value})}
                                            placeholder="Short summary..."
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none min-h-[70px] resize-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">What made you interested to apply in the role?</span>
                                        <textarea 
                                            value={formData.reason_for_interest}
                                            onChange={e => setFormData({...formData, reason_for_interest: e.target.value})}
                                            placeholder="Applicant's statement..."
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none min-h-[70px] resize-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">what do you hope to achieve in the first 6 months?</span>
                                        <textarea 
                                            value={formData.goals_6_months}
                                            onChange={e => setFormData({...formData, goals_6_months: e.target.value})}
                                            placeholder="Goal details..."
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none min-h-[70px] resize-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Available for target training date?</span>
                                        <input 
                                            type="text"
                                            value={formData.available_training_start}
                                            onChange={e => setFormData({...formData, available_training_start: e.target.value})}
                                            placeholder="Training availability status"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* SECTION 5: OPERATIONAL METADATA */}
                        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
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
                                {selectedTab === 'MASTERLIST' && (
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Assigned Month</span>
                                        <select 
                                            value={formData.master_column}
                                            onChange={e => setFormData({...formData, master_column: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-bold text-primary-600 cursor-pointer"
                                        >
                                            <option value="">Select Month...</option>
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                                                <option key={month} value={month}>{month}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                            </div>
                            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Training Date</span>
                                        <input 
                                            type="date"
                                            value={formData.master_training_start_date}
                                            onChange={e => setFormData({...formData, master_training_start_date: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        />
                                    </label>
                                )}
                                {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">NEO Date</span>
                                        <input 
                                            type="date"
                                            value={formData.master_neo_date}
                                            onChange={e => setFormData({...formData, master_neo_date: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        />
                                    </label>
                                )}
                                {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION' || selectedTab === 'OFFBOARDING_TRACKER' || selectedTab === 'OFFBOARDING_WINNERS') && (
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
                                )}
                                {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
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
                                )}
                            </div>
                        </div>

                        {/* SECTION 6: FINANCIALS */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
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
                        )}

                        {/* SECTION 7: TESTING & ASSESSMENTS */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION' || selectedTab === 'POOL') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                    <Award size={14} className="text-primary-600" />
                                    <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">TESTING & ASSESSMENTS</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">CEFR Level</span>
                                        <select 
                                            value={formData.cefr_level}
                                            onChange={e => setFormData({...formData, cefr_level: e.target.value})}
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none font-medium"
                                        >
                                            <option value="">Select Level...</option>
                                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Personality Test</span>
                                        <input 
                                            type="text"
                                            value={formData.personality_test}
                                            onChange={e => setFormData({...formData, personality_test: e.target.value})}
                                            placeholder="Result score/details"
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        />
                                    </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Critical Thinking</span>
                                    <input 
                                        type="text"
                                        value={formData.critical_thinking_score}
                                        onChange={e => setFormData({...formData, critical_thinking_score: e.target.value})}
                                        placeholder="Assessment score"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Typing WPM</span>
                                    <input 
                                        type="number"
                                        value={formData.typing_test_wpm}
                                        onChange={e => setFormData({...formData, typing_test_wpm: e.target.value})}
                                        placeholder="Speed (WPM)"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Typing Accuracy (%)</span>
                                    <input 
                                        type="number"
                                        value={formData.typing_test_accuracy}
                                        onChange={e => setFormData({...formData, typing_test_accuracy: e.target.value})}
                                        placeholder="Accuracy %"
                                        className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none"
                                        min="0"
                                        max="100"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                        {/* SECTION 8: COMPLIANCE & RESULTS */}
                        {(selectedTab === 'MASTERLIST' || selectedTab === 'INACTIVE_APPLICATION') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
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
                        )}

                        {/* SECTION 8 OFFBOARDING: REASON */}
                        {(selectedTab === 'OFFBOARDING_TRACKER' || selectedTab === 'OFFBOARDING_WINNERS') && (
                            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-sm shadow-sm overflow-hidden">
                                <div className="bg-surface-50/50 px-6 py-3 border-b border-surface-200 flex items-center gap-3">
                                    <Database size={14} className="text-primary-600" />
                                    <h3 className="text-[10px] font-black text-surface-700 uppercase tracking-[0.2em]">OFFBOARDING DETAILS</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 gap-4">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-1.5">Reason for Offboarding *</span>
                                        <textarea 
                                            value={formData.rejection_reason}
                                            onChange={e => setFormData({...formData, rejection_reason: e.target.value})}
                                            placeholder="Enter reason for offboarding..."
                                            className="w-full px-4 py-2 border border-surface-200 rounded-sm text-sm focus:border-primary-500 transition-all outline-none min-h-[80px]"
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 px-8 py-5 border-t border-surface-200 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-medium text-surface-400 uppercase tracking-widest">Manual Insertion Tool V1.5</p>
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-8 py-2.5 text-[11px] font-bold text-surface-500 uppercase tracking-widest hover:bg-surface-50 rounded-sm transition-all cursor-pointer"
                        >
                            Discard
                        </button>
                        <button 
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="px-10 py-2.5 bg-primary-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-primary-700 shadow-premium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
