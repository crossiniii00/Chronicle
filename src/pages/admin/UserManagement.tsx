import React from 'react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import {
    Loader2, Eye, EyeOff, Filter, Building, Camera, User as UserIcon,
    UserCheck, ArrowUpRight, Award, Mail, Building2, TrendingUp,
    Plus, X, Lock, LockOpen
} from 'lucide-react';
import { useUserManagement } from './hooks/useUserManagement';
import type { ManagedUser } from './hooks/useUserManagement';
import { UserManagementHeader, UserTabNavigation, UserFilterBar, UserTable } from './components/UserManagementUI';
import { UserSettingsModal } from './components/UserSettingsModal';
import { useAccountTypeSettings } from './hooks/useAccountTypeSettings';
import type { UserRole, Application } from '@/types';
import { ApplicationService } from '@/services/ApplicationService';
import { motion } from 'framer-motion';
import { cn } from '@/utils/formatters';

interface RecruiterMetadata {
    initial_interview_results?: string;
    initial_interview_result?: string;
    'Initial Interview Result'?: string;
    endorsed_to_recruiter_s?: boolean | string;
    last_updated_by?: string;
    [key: string]: unknown;
}

export function UserManagement() {
    const {
        search, setSearch,
        loading,
        activeTab, setActiveTab,
        roleFilter, setRoleFilter,
        accountFilter, setAccountFilter,
        modal, setModal,
        deleteConfirm, setDeleteConfirm,
        form, setForm,
        showProvisionPw, setShowProvisionPw,
        showProvisionConfirmPw, setShowProvisionConfirmPw,
        showEditPw, setShowEditPw,
        showEditConfirmPw, setShowEditConfirmPw,
        filteredUsers,
        recruiterCount,
        validatorCount,
        adminCount,
        superAdminCount,
        handleCreate,
        handleEdit,
        toggleActive,
        openEditModal,
        handleDelete,
        departments,
        passwordConfirmOpen,
        setPasswordConfirmOpen
    } = useUserManagement();

    const { getLabel, activeRoles } = useAccountTypeSettings();
    const selectableRoles: UserRole[] = activeRoles;

    const [selectedRecruiterForDashboard, setSelectedRecruiterForDashboard] = React.useState<ManagedUser | null>(null);
    const [recruiterApps, setRecruiterApps] = React.useState<Application[]>([]);
    const [loadingRecruiterApps, setLoadingRecruiterApps] = React.useState<boolean>(false);
    const [recruiterDateFilter, setRecruiterDateFilter] = React.useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
    const [showSettings, setShowSettings] = React.useState<boolean>(false);
    const [selectedTempDept, setSelectedTempDept] = React.useState('');
    const [isPasswordUnlocked, setIsPasswordUnlocked] = React.useState(false);
    const [showUnlockConfirm, setShowUnlockConfirm] = React.useState(false);

    React.useEffect(() => {
        if (modal !== 'edit') {
            setIsPasswordUnlocked(false);
        }
    }, [modal]);

    const handleAddDepartment = () => {
        if (!selectedTempDept) return;
        const selectedDepts = form.department
            ? form.department.split(',').map((d: string) => d.trim()).filter(Boolean)
            : [];
        if (!selectedDepts.includes(selectedTempDept)) {
            const updated = [...selectedDepts, selectedTempDept].join(', ');
            setForm(f => ({ ...f, department: updated }));
        }
        setSelectedTempDept('');
    };

    const handleRemoveDepartment = (deptName: string) => {
        const selectedDepts = form.department
            ? form.department.split(',').map((d: string) => d.trim()).filter(Boolean)
            : [];
        const updated = selectedDepts.filter((d: string) => d !== deptName).join(', ');
        setForm(f => ({ ...f, department: updated }));
    };

    React.useEffect(() => {
        if (selectedRecruiterForDashboard) {
            setLoadingRecruiterApps(true);
            ApplicationService.getAll()
                .then(apps => {
                    setRecruiterApps(apps || []);
                })
                .catch(err => {
                    console.error("Failed to load recruiter applications:", err);
                })
                .finally(() => {
                    setLoadingRecruiterApps(false);
                });
        } else {
            setRecruiterApps([]);
        }
    }, [selectedRecruiterForDashboard]);

    const filteredRecruiterApps = React.useMemo(() => {
        if (!selectedRecruiterForDashboard) return [];
        const nameLower = selectedRecruiterForDashboard.full_name.toLowerCase();

        const baseApps = recruiterApps.filter(app => {
            const assigned = app.assigned_recruiter_name?.toLowerCase();
            const interviewer = app.interviewer_name?.toLowerCase();
            const lastUpdated = app.pis?.last_updated_by?.toLowerCase();

            return assigned === nameLower || interviewer === nameLower || lastUpdated === nameLower;
        });

        if (recruiterDateFilter === 'ALL') return baseApps;

        if (recruiterDateFilter === 'TODAY') {
            const todayStr = new Date().toISOString().split('T')[0];
            return baseApps.filter(app => app.applied_at?.startsWith(todayStr));
        }

        if (recruiterDateFilter === 'YESTERDAY') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            return baseApps.filter(app => app.applied_at?.startsWith(yesterdayStr));
        }

        const cutoff = new Date();
        if (recruiterDateFilter === 'WEEK') cutoff.setDate(cutoff.getDate() - 7);
        if (recruiterDateFilter === 'MONTH') cutoff.setMonth(cutoff.getMonth() - 1);

        return baseApps.filter(app => {
            if (!app.applied_at) return false;
            return new Date(app.applied_at) >= cutoff;
        });
    }, [recruiterApps, selectedRecruiterForDashboard, recruiterDateFilter]);

    const recruiterMetrics = React.useMemo(() => {
        const screened = filteredRecruiterApps.filter(a => {
            const p = (a.pis || a.metadata || {}) as RecruiterMetadata;
            const initial = String(p.initial_interview_results || p.initial_interview_result || p['Initial Interview Result'] || '').toUpperCase();
            const status = (a.current_status || '').toUpperCase();

            const explicitlyPassed = initial.includes('PASSED') || initial.includes('PASS');
            const progressedPast = !['APPLIED', 'TYPING_TEST', 'INITIAL_INTERVIEW', 'QUEUE_ASSIGNED', 'INTERVIEW_IN_PROGRESS'].includes(status);

            return explicitlyPassed || progressedPast;
        }).length;

        const endorsed = filteredRecruiterApps.filter(a => {
            const p = (a.pis || a.metadata || {}) as RecruiterMetadata;
            const isExplicitlyEndorsed = a.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === true || p.endorsed_to_recruiter_s === 'true';
            const hasEndorsedStatus = ['ENDORSED', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'For Job Offer', 'FOR_JOB_OFFER', 'ACCEPTED_OFFER', 'ACCEPTED OFFER'].includes(a.current_status);
            return isExplicitlyEndorsed || hasEndorsedStatus;
        }).length;

        const hired = filteredRecruiterApps.filter(a => {
            return a.current_status === 'HIRED' || a.current_status === 'HIRED_PROCESSED';
        }).length;

        const rate = screened > 0 ? Math.round((endorsed / screened) * 100) : 0;

        return {
            screened,
            endorsed,
            hired,
            rate
        };
    }, [filteredRecruiterApps]);

    const renderAssignedAccountField = () => {
        if (form.role.startsWith('recruiter')) return null;

        if (form.role === 'ops_validator') {
            const selectedDepts = form.department
                ? form.department.split(',').map((d: string) => d.trim()).filter(Boolean)
                : [];
            const availableDepts = departments.filter(d => !selectedDepts.includes(d.name));

            return (
                <div className="text-left space-y-2">
                    <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Assigned Accounts</label>
                    <div className="flex gap-2 text-left">
                        <div className="relative flex-1 text-left">
                            <select 
                                value={selectedTempDept} 
                                onChange={e => setSelectedTempDept(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-xs font-semibold text-surface-800 appearance-none cursor-pointer focus:outline-none focus:border-primary-500 shadow-sm text-left"
                            >
                                <option value="">Select Account to Add...</option>
                                {availableDepts.map(dept => (
                                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 text-left">
                                <Building size={14} />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddDepartment}
                            disabled={!selectedTempDept}
                            className="px-3 py-2.5 bg-primary-600 text-white rounded-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center cursor-pointer"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {selectedDepts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedDepts.map((deptName: string) => (
                                <span 
                                    key={deptName} 
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-100 border border-surface-200 text-surface-700 text-[10px] font-bold uppercase rounded-full shadow-sm"
                                >
                                    {deptName}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDepartment(deptName)}
                                        className="text-surface-400 hover:text-red-500 focus:outline-none cursor-pointer"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-surface-400 italic">No accounts assigned (General Pool)</p>
                    )}
                </div>
            );
        }

        return (
            <div className="text-left">
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Assigned Account</label>
                <div className="relative text-left">
                    <select 
                        value={form.department || ''} 
                        onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-xs font-semibold text-surface-800 appearance-none cursor-pointer focus:outline-none focus:border-primary-500 shadow-sm text-left"
                    >
                        <option value="">Unassigned / General Pool</option>
                        {form.department && !departments.some(d => d.name === form.department) && (
                            <option value={form.department}>{form.department}</option>
                        )}
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 text-left">
                        <Building size={14} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="pb-12">
            <UserManagementHeader
                onAdd={() => setModal('create')}
                onSettings={() => setShowSettings(true)}
                totalCount={recruiterCount + validatorCount + adminCount + superAdminCount}
            />

            <UserTabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                recruiterCount={recruiterCount}
                validatorCount={validatorCount}
                adminCount={adminCount}
                superAdminCount={superAdminCount}
            />

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <Loader2 className="w-12 h-12 text-[#0078d4] animate-spin" />
                    <p className="text-[12px] text-surface-400 font-medium tracking-[-0.005em]">Synchronizing identity registry...</p>
                </div>
            ) : (
                <div className="space-y-5 px-6 pt-5">
                    <UserFilterBar
                        search={search}
                        onSearchChange={setSearch}
                        roleFilter={roleFilter}
                        onRoleFilterChange={setRoleFilter}
                        showRoleFilter={activeTab === 'RECRUITERS'}
                        accountFilter={accountFilter}
                        onAccountFilterChange={setAccountFilter}
                        departments={departments}
                        activeTab={activeTab}
                    />

                    <UserTable
                        users={filteredUsers}
                        onToggleActive={toggleActive}
                        onEdit={openEditModal}
                        onDelete={setDeleteConfirm}
                        onViewDashboard={setSelectedRecruiterForDashboard}
                        groupBy={activeTab === 'VALIDATORS' ? 'department' : undefined}
                        departments={departments}
                    />
                </div>
            )}

            {/* Create User Modal */}
            <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Provision new identity" size="md" closeOnOverlayClick={false}>
                <div className="space-y-6 text-left">
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <span className="w-1 h-3 bg-primary-600 rounded-full" />
                            <h3 className="text-[11px] font-semibold text-surface-900 uppercase tracking-wider text-left">Personal information</h3>
                        </div>

                        <div className="flex flex-col items-center justify-center mb-6 pb-4 border-b border-surface-100">
                            <div className="relative group/avatar cursor-pointer w-20 h-20 rounded-full border border-surface-200 shadow-sm flex items-center justify-center bg-surface-50 overflow-hidden transition-all hover:border-[#0078d4]">
                                {form.avatar_data ? (
                                    <img src={form.avatar_data} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl font-black text-surface-400 uppercase">
                                        {form.full_name ? form.full_name.charAt(0) : <UserIcon size={24} />}
                                    </span>
                                )}
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-wider">
                                    <Camera size={14} className="mb-0.5" />
                                    Upload
                                    <input 
                                        type="file" 
                                        accept="image/png,image/jpeg,image/webp" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setForm(f => ({ ...f, avatar_data: reader.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-2">Identity Portrait</p>
                        </div>

                        <div className="text-left">
                            <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Full legal name</label>
                            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                placeholder="e.g. John Doe"
                                className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all placeholder:text-surface-300 shadow-sm text-left" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Primary auth email</label>
                                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="john.doe@company.com"
                                    className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all placeholder:text-surface-300 shadow-sm text-left" />
                            </div>
                            <div className="text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Auth tier role</label>
                                <div className="relative text-left">
                                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                                    className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-xs font-semibold text-surface-800 appearance-none cursor-pointer focus:outline-none focus:border-primary-500 shadow-sm text-left">
                                    {selectableRoles.map(role => (
                                        <option key={role} value={role}>{getLabel(role)}</option>
                                    ))}
                                </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 text-left">
                                        <Filter size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {renderAssignedAccountField()}
                    </div>

                    <div className="space-y-4 pt-2 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left">
                            <span className="w-1 h-3 bg-primary-600 rounded-full text-left" />
                            <h3 className="text-[11px] font-semibold text-surface-900 uppercase tracking-wider text-left">Access credentials</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="relative text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Backend auth password</label>
                                <input
                                    key="provision-password-input"
                                    id="provision-password"
                                    name="provision-password"
                                    type={showProvisionPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all pr-10 shadow-sm text-left"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowProvisionPw(!showProvisionPw)}
                                    className="absolute right-3 top-[34px] text-surface-400 hover:text-primary-600"
                                >
                                    {showProvisionPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Confirm password</label>
                                <input
                                    key="provision-confirm-password-input"
                                    id="provision-confirm-password"
                                    name="provision-confirm-password"
                                    type={showProvisionConfirmPw ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all pr-10 shadow-sm text-left"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowProvisionConfirmPw(!showProvisionConfirmPw)}
                                    className="absolute right-3 top-[34px] text-surface-400 hover:text-primary-600"
                                >
                                    {showProvisionConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-8 border-t border-surface-100">
                        <button onClick={() => setModal(null)} className="px-6 py-2.5 bg-white border border-surface-200 text-surface-600 font-semibold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50 transition-all shadow-sm">Cancel</button>
                        <button onClick={handleCreate} className="px-8 py-2.5 bg-primary-600 text-white font-semibold text-[10px] uppercase tracking-wider rounded-sm hover:bg-primary-700 transition-all shadow-lg active:scale-95">Provision identity</button>
                    </div>
                </div>
            </Modal>

            {/* Edit User Modal */}
            <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Update identity directives" size="md" closeOnOverlayClick={false}>
                <div className="space-y-6 text-left">
                    <div className="space-y-4 text-left">
                        <div className="flex flex-col items-center justify-center mb-6 pb-4 border-b border-surface-100">
                            <div className="relative group/avatar cursor-pointer w-20 h-20 rounded-full border border-surface-200 shadow-sm flex items-center justify-center bg-surface-50 overflow-hidden transition-all hover:border-[#0078d4]">
                                {form.avatar_data ? (
                                    <img src={form.avatar_data} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl font-black text-surface-400 uppercase">
                                        {form.full_name ? form.full_name.charAt(0) : <UserIcon size={24} />}
                                    </span>
                                )}
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-wider">
                                    <Camera size={14} className="mb-0.5" />
                                    Upload
                                    <input 
                                        type="file" 
                                        accept="image/png,image/jpeg,image/webp" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setForm(f => ({ ...f, avatar_data: reader.result as string }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-2">Identity Portrait</p>
                        </div>

                        <div className="text-left">
                            <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Full legal name</label>
                            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all shadow-sm text-left" />
                        </div>
                        <div className="text-left">
                            <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Primary auth email</label>
                            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all shadow-sm text-left" />
                        </div>
                        <div className="text-left">
                            <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Auth tier role</label>
                            <div className="relative text-left">
                                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                                        className="w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-xs font-semibold text-surface-800 appearance-none cursor-pointer focus:outline-none focus:border-primary-500 shadow-sm text-left">
                                        {selectableRoles.map(role => (
                                            <option key={role} value={role}>{getLabel(role)}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 text-left">
                                        <Filter size={12} />
                                    </div>
                                </div>
                            </div>

                        {renderAssignedAccountField()}

                        <div className="flex items-center justify-between pt-4 pb-2 border-t border-surface-100 text-left">
                            <div className="flex items-center gap-2 text-left">
                                <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                                <span className="text-[11px] font-bold text-surface-900 uppercase tracking-wider">Credential Lock</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isPasswordUnlocked) {
                                        setIsPasswordUnlocked(false);
                                        setForm(f => ({
                                            ...f,
                                            password: '',
                                            confirmPassword: ''
                                        }));
                                    } else {
                                        setShowUnlockConfirm(true);
                                    }
                                }}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold uppercase rounded-sm border transition-all cursor-pointer flex items-center gap-1.5",
                                    isPasswordUnlocked 
                                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                                        : "bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100"
                                )}
                            >
                                {isPasswordUnlocked ? <LockOpen size={12} /> : <Lock size={12} />}
                                {isPasswordUnlocked ? "Lock Section" : "Unlock to Edit"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-left">
                            <div className="relative text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Update password (optional)</label>
                                <input
                                    key="edit-password-input"
                                    id="edit-password"
                                    name="edit-password"
                                    type={showEditPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder={isPasswordUnlocked ? "Leave blank to keep current" : "•••••••• (Locked)"}
                                    disabled={!isPasswordUnlocked}
                                    autoComplete="new-password"
                                    className={cn(
                                        "w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all pr-10 shadow-sm text-left",
                                        !isPasswordUnlocked && "bg-surface-50 text-surface-400 border-surface-200/50 cursor-not-allowed select-none"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => isPasswordUnlocked && setShowEditPw(!showEditPw)}
                                    disabled={!isPasswordUnlocked}
                                    className={cn(
                                        "absolute right-3 top-[34px] text-surface-400 hover:text-primary-600",
                                        !isPasswordUnlocked && "cursor-not-allowed text-surface-300"
                                    )}
                                >
                                    {showEditPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative text-left">
                                <label className="block text-xs font-semibold text-surface-600 mb-1.5 text-left">Confirm Identity Lock</label>
                                <input
                                    key="edit-confirm-password-input"
                                    id="edit-confirm-password"
                                    name="edit-confirm-password"
                                    type={showEditConfirmPw ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder={isPasswordUnlocked ? "Confirm new password" : "•••••••• (Locked)"}
                                    disabled={!isPasswordUnlocked}
                                    autoComplete="new-password"
                                    className={cn(
                                        "w-full px-4 py-2.5 bg-white border border-surface-200 rounded-sm text-sm font-normal text-surface-900 focus:outline-none focus:border-primary-500 transition-all pr-10 shadow-sm text-left",
                                        !isPasswordUnlocked && "bg-surface-50 text-surface-400 border-surface-200/50 cursor-not-allowed select-none"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => isPasswordUnlocked && setShowEditConfirmPw(!showEditConfirmPw)}
                                    disabled={!isPasswordUnlocked}
                                    className={cn(
                                        "absolute right-3 top-[34px] text-surface-400 hover:text-primary-600",
                                        !isPasswordUnlocked && "cursor-not-allowed text-surface-300"
                                    )}
                                >
                                    {showEditConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-8 border-t border-surface-100">
                        <button onClick={() => setModal(null)} className="px-6 py-2.5 bg-white border border-surface-200 text-surface-600 font-semibold text-[10px] uppercase tracking-wider rounded-sm hover:bg-surface-50 transition-all shadow-sm">Cancel</button>
                        <button onClick={() => handleEdit()} className="px-8 py-2.5 bg-primary-600 text-white font-semibold text-[10px] uppercase tracking-wider rounded-sm hover:bg-primary-700 transition-all shadow-lg active:scale-95">Update identity</button>
                    </div>
                </div>
            </Modal>

            {/* Account Type Settings Modal */}
            <UserSettingsModal
                open={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {/* Confirm Dialog for Deletion */}
            <ConfirmDialog
                open={!!deleteConfirm}
                title="Account Termination"
                message={`Are you sure you want to permanently terminate the access for "${deleteConfirm?.full_name}"? This action will audit-trail and cannot be retracted.`}
                confirmText="Terminate Access"
                confirmClass="bg-red-600 hover:bg-red-700"
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                onClose={() => setDeleteConfirm(null)}
            />

            {/* Confirm Dialog for Password Change */}
            <ConfirmDialog
                open={passwordConfirmOpen}
                title="Confirm Password Change"
                message={`Warning: You are updating the password for "${form.full_name}". This will change their credentials for logging into the platform. Are you sure you want to proceed?`}
                confirmText="Proceed & Update"
                confirmClass="bg-amber-600 hover:bg-amber-700"
                onConfirm={() => {
                    setPasswordConfirmOpen(false);
                    handleEdit(true);
                }}
                onClose={() => setPasswordConfirmOpen(false)}
            />

            {/* Custom Aesthetic Confirm Dialog for Unlocking Password Section */}
            <Modal
                open={showUnlockConfirm}
                onClose={() => setShowUnlockConfirm(false)}
                title={null}
                size="md"
            >
                <div className="flex flex-col items-center text-center p-6 md:p-8">
                    {/* Header: Company Logo & Label */}
                    <div className="flex flex-col items-center justify-center w-full mb-6 pb-4 border-b border-surface-100">
                        <img src="/contactpoint-full-logo.png" alt="ContactPoint Logo" className="h-8 object-contain mb-2.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded">Security Alert Protocol</span>
                    </div>

                    {/* Warning Graphic */}
                    <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 animate-pulse">
                        <Lock size={22} />
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-surface-900 tracking-tight mb-2">
                        Unlock Password Directives
                    </h3>
                    
                    {/* Subtitle / Warning Message */}
                    <p className="text-xs text-surface-500 max-w-md mb-6 leading-relaxed">
                        Warning: You are requesting to override the login credentials for <span className="font-semibold text-surface-800">{form.full_name}</span>. Changing user passwords manually can disrupt their active session and client access.
                    </p>

                    {/* Action Panel */}
                    <div className="w-full bg-surface-50 border border-surface-200/50 rounded p-4 mb-6 text-left space-y-1.5 max-w-md">
                        <span className="text-[9px] font-black uppercase tracking-wider text-surface-500">Security Checklist</span>
                        <ul className="text-[10px] text-surface-600 space-y-1 list-disc list-inside">
                            <li>Ensure you have explicit approval.</li>
                            <li>The user must log in with their new password.</li>
                            <li>Active sessions on other devices may close.</li>
                        </ul>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2.5 justify-end w-full max-w-md">
                        <button
                            type="button"
                            onClick={() => setShowUnlockConfirm(false)}
                            className="px-5 py-2 bg-white border border-surface-200 text-surface-600 font-bold text-[9px] uppercase tracking-wider rounded-sm hover:bg-surface-50 transition-all cursor-pointer shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowUnlockConfirm(false);
                                setIsPasswordUnlocked(true);
                            }}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-sm transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            Unlock Section
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Recruiter Profile & Performance Dashboard Modal */}
            <Modal
                open={!!selectedRecruiterForDashboard}
                onClose={() => {
                    setSelectedRecruiterForDashboard(null);
                    setRecruiterDateFilter('ALL');
                }}
                title="Recruiter Command Center"
                size="xl"
                closeOnOverlayClick={false}
            >
                {selectedRecruiterForDashboard && (
                    <div className="space-y-8 text-left">
                        {/* ── 1. CINEMATIC BANNER & IDENTITY PROFILE ── */}
                        <div className="relative rounded-lg overflow-hidden border border-surface-200 shadow-sm bg-white pb-6">
                            {/* Banner Gradient */}
                            <div className="h-32 bg-gradient-to-r from-neutral-900 via-neutral-800 to-black relative">
                                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded px-2.5 py-1 text-[10px] font-black uppercase text-white tracking-widest">
                                    {getLabel(selectedRecruiterForDashboard.role as UserRole) || selectedRecruiterForDashboard.role}
                                </div>
                            </div>
                            
                            {/* Overlapping Avatar */}
                            <div className="relative -mt-14 flex flex-col items-center text-center px-6">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-surface-50 flex items-center justify-center overflow-hidden shadow-md">
                                    {selectedRecruiterForDashboard.avatar_data ? (
                                        <img src={selectedRecruiterForDashboard.avatar_data} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-black text-surface-400 uppercase">
                                            {selectedRecruiterForDashboard.full_name.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="text-xl font-bold text-surface-900 mt-3 flex items-center gap-2">
                                    {selectedRecruiterForDashboard.full_name}
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        selectedRecruiterForDashboard.is_active ? "bg-emerald-500" : "bg-red-500"
                                    )} />
                                </h3>
                                
                                <p className="text-xs text-surface-500 mt-1 flex items-center gap-1.5 justify-center">
                                    <Mail size={12} className="text-surface-400" /> {selectedRecruiterForDashboard.email}
                                    {selectedRecruiterForDashboard.department && (
                                        <>
                                            <span className="w-px h-3 bg-surface-200" />
                                            <Building2 size={12} className="text-surface-400" /> {selectedRecruiterForDashboard.department}
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* ── 2. METRICS & ANALYSIS ── */}
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-4">
                                <div>
                                    <h4 className="text-xs font-bold text-surface-900 uppercase tracking-widest">Recruiter Activity Analysis</h4>
                                    <p className="text-[11px] text-surface-400 mt-0.5 uppercase tracking-wide">Real-time candidate pipelines and throughput metrics.</p>
                                </div>
                                
                                {/* Slidable Pill Date Filter */}
                                <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-sm border border-surface-200 w-fit">
                                    {(['ALL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setRecruiterDateFilter(filter)}
                                            className={cn(
                                                "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors duration-200 rounded-sm",
                                                recruiterDateFilter === filter 
                                                    ? "text-white font-black" 
                                                    : "text-surface-500 hover:text-surface-700"
                                            )}
                                        >
                                            {filter}
                                            {recruiterDateFilter === filter && (
                                                <motion.div
                                                    layoutId="recruiterDashboardActiveFilterBg"
                                                    className="absolute inset-0 bg-black shadow-sm rounded-sm z-[-1]"
                                                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loadingRecruiterApps ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                                    <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">Loading recruiter statistics...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Metrics Cards Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Candidates Screened', value: recruiterMetrics.screened, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
                                            { label: 'Candidates Endorsed', value: recruiterMetrics.endorsed, icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50' },
                                            { label: 'Endorsement Rate', value: `${recruiterMetrics.rate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                                            { label: 'Candidates Hired', value: recruiterMetrics.hired, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                        ].map((m) => (
                                            <div key={m.label} className="bg-white border border-surface-200 rounded p-4 flex flex-col justify-between shadow-sm min-h-[110px]">
                                                <div className="flex items-start justify-between">
                                                    <span className="text-[9px] font-black text-surface-500 uppercase tracking-wider leading-tight">{m.label}</span>
                                                    <div className={cn("p-1.5 rounded", m.bg)}>
                                                        <m.icon size={14} className={m.color} />
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-black text-surface-900 mt-2">{m.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Assigned Candidates List */}
                                    <div className="border border-surface-200 rounded overflow-hidden bg-white shadow-sm">
                                        <div className="px-4 py-3 bg-[#fdfdfd] border-b border-surface-200 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-surface-800 uppercase tracking-widest">Recent Placements & Pipeline ({filteredRecruiterApps.length})</span>
                                        </div>
                                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                                            {filteredRecruiterApps.length > 0 ? (
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-[#f9fafb] border-b border-surface-200 z-10">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-[9px] font-bold text-surface-500 uppercase tracking-wider">Candidate</th>
                                                            <th className="px-4 py-2.5 text-[9px] font-bold text-surface-500 uppercase tracking-wider">Position</th>
                                                            <th className="px-4 py-2.5 text-[9px] font-bold text-surface-500 uppercase tracking-wider">Department</th>
                                                            <th className="px-4 py-2.5 text-[9px] font-bold text-surface-500 uppercase tracking-wider">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-surface-100">
                                                        {filteredRecruiterApps.map((app) => (
                                                            <tr key={app.id} className="hover:bg-surface-50/50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-semibold text-surface-800">{app.applicant_name}</span>
                                                                        <span className="text-[9px] text-surface-400 font-mono">
                                                                            {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-[10px] font-medium text-surface-600 uppercase tracking-tight">{app.position_title}</span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="text-[10px] font-semibold text-surface-600 uppercase">{app.department || 'N/A'}</span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={cn(
                                                                        "px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-tight",
                                                                        app.current_status === 'HIRED' || app.current_status === 'HIRED_PROCESSED' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                                                        ['FAILED', 'REJECTED', 'WITHDRAWN'].includes(app.current_status?.toUpperCase()) ? "bg-red-50 text-red-700 border border-red-100" :
                                                                        "bg-blue-50 text-blue-700 border border-blue-100"
                                                                    )}>
                                                                        {app.current_status.replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-12 text-center text-surface-400 text-xs italic">
                                                    No recruitment activity recorded for this period.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
