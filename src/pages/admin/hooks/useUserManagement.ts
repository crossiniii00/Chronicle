import { useState, useEffect, useCallback } from 'react';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import type { User, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { useAccountTypeSettings } from './useAccountTypeSettings';

export type ManagedUser = User & {
    status?: string;
    password_changed_at?: string;
    force_password_change?: boolean;
};



export function useUserManagement() {
    const { user: currentUser } = useAuthStore();
    const { success, error: toastError } = useToast();
    const { getLabel, getRoleType } = useAccountTypeSettings();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
    const [activeTab, setActiveTab] = useState<'RECRUITERS' | 'VALIDATORS' | 'ADMINS' | 'SUPER_ADMINS'>('RECRUITERS');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [accountFilter, setAccountFilter] = useState<string>('ALL');
    const [modal, setModal] = useState<'create' | 'edit' | 'password' | null>(null);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<ManagedUser | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState({ 
        full_name: '', 
        email: '', 
        phone: '', 
        role: 'recruiter_interviewer' as UserRole, 
        department: '',
        password: '', 
        confirmPassword: '',
        avatar_data: null as string | null
    });
    
    const [showProvisionPw, setShowProvisionPw] = useState(false);
    const [showProvisionConfirmPw, setShowProvisionConfirmPw] = useState(false);
    const [showEditPw, setShowEditPw] = useState(false);
    const [showEditConfirmPw, setShowEditConfirmPw] = useState(false);
    const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const [userData, deptData] = await Promise.all([
                UserService.getAll(),
                DepartmentService.getAll()
            ]);
            setAllUsers(userData);
            setDepartments(deptData);
        } catch {
            toastError('Sync Failure', 'Could not retrieve user or department directory.');
        } finally {
            setLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        setRoleFilter('ALL');
        setAccountFilter('ALL');
    }, [activeTab]);

    useEffect(() => {
        if (modal === 'create' || modal === null) {
            setForm({
                full_name: '',
                email: '',
                phone: '',
                role: 'recruiter_interviewer' as UserRole,
                department: '',
                password: '',
                confirmPassword: '',
                avatar_data: null
            });
            if (modal === 'create') {
                setSelectedUser(null);
            }
        }
    }, [modal]);

    const filteredUsers = allUsers.filter(u => {
        const roleType = getRoleType(u.role);
        const matchesTab = 
            activeTab === 'RECRUITERS' ? roleType === 'recruiter' : 
            activeTab === 'VALIDATORS' ? roleType === 'ops_validator' :
            activeTab === 'ADMINS' ? roleType === 'admin' :
            roleType === 'super_admin';
        const matchesSearch = !search || 
            u.full_name.toLowerCase().includes(search.toLowerCase()) || 
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.department || '').toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchesAccount = accountFilter === 'ALL' || (
            accountFilter === 'UNASSIGNED'
                ? !u.department || u.department.trim() === ''
                : (u.department || '').split(',').map(d => d.trim().toUpperCase()).includes(accountFilter.toUpperCase())
        );
        
        return matchesTab && matchesSearch && matchesRole && matchesAccount;
    });

    const recruiterCount = allUsers.filter(u => getRoleType(u.role) === 'recruiter').length;
    const validatorCount = allUsers.filter(u => getRoleType(u.role) === 'ops_validator').length;
    const adminCount = allUsers.filter(u => getRoleType(u.role) === 'admin').length;
    const superAdminCount = allUsers.filter(u => getRoleType(u.role) === 'super_admin').length;

    const handleCreate = async () => {
        if (!form.full_name || !form.email || !form.password) { 
            toastError('Validation Error', 'All identity fields are required.');
            return; 
        }

        if (form.password.length < 8) {
            toastError('Security Error', 'Authorization password must be at least 8 characters.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            toastError('Security Error', 'Authorization passwords do not match.');
            return;
        }

        try {
            const userData = {
                full_name: form.full_name,
                email: form.email,
                role: form.role,
                department: form.department || undefined,
                password: form.password,
                avatar_data: form.avatar_data || undefined
            };

            await UserService.add(userData);
            setModal(null);
            setForm({ full_name: '', email: '', phone: '', role: 'recruiter_interviewer', department: '', password: '', confirmPassword: '', avatar_data: null });
            success('Identity Provisioned', `${form.full_name} has been added as ${getLabel(form.role)}. Access is live.`);
            await loadUsers();
        } catch (err: any) {
            toastError('Provisioning Failed', err.response?.data?.message || 'Could not authorize new identity.');
        }
    };

    const handleEdit = async (force = false) => {
        if (!selectedUser || !form.full_name || !form.email) { return; }
        
        const isPasswordChanged = form.password !== ((selectedUser as any).password_plain || '');
        
        if (isPasswordChanged) {
            if (form.password.length < 6) {
                toastError('Validation Error', 'Password must be at least 6 characters long.');
                return;
            }
            if (form.password !== form.confirmPassword) {
                toastError('Validation Error', 'Passwords do not match.');
                return;
            }
        }
        
        if (isPasswordChanged && !force) {
            setPasswordConfirmOpen(true);
            return;
        }

        try {
            const updateData: any = {
                full_name: form.full_name,
                email: form.email,
                role: form.role,
                department: form.department || null,
                avatar_data: form.avatar_data
            };

            if (isPasswordChanged) {
                updateData.password = form.password;
            }

            await UserService.update(selectedUser.id, updateData);
            setModal(null);
            setSelectedUser(null);
            setForm({ full_name: '', email: '', phone: '', role: 'recruiter_interviewer', department: '', password: '', confirmPassword: '', avatar_data: null });
            success('User Updated', `${form.full_name}'s information has been updated.`);
            await loadUsers();
        } catch (err: any) {
            toastError('Update Failed', err.response?.data?.message || 'Could not update user information.');
        }
    };

    const toggleActive = async (userId: string, current: boolean) => {
        try {
            await UserService.update(userId, { is_active: !current });
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u));
            success('Updated', 'User status changed.');
        } catch {
            toastError('Update Failure', 'Could not modify user status.');
        }
    };

    const openEditModal = (user: ManagedUser) => {
        setSelectedUser(user);
        setForm({
            full_name: user.full_name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            department: user.department || '',
            password: (user as any).password_plain || '',
            confirmPassword: (user as any).password_plain || '',
            avatar_data: user.avatar_data || null
        });
        setModal('edit');
    };

    const handleDelete = async (user: ManagedUser) => {
        try {
            await UserService.delete(user.id);
            setAllUsers(prev => prev.filter(u => u.id !== user.id));
            setDeleteConfirm(null);
            success('Account Terminated', `${user.full_name}'s access has been purged from the registry.`);
        } catch {
            toastError('Deletion Failed', 'Protocol error preventing identity termination.');
        }
    };

    return {
        currentUser,
        getLabel,
        search, setSearch,
        loading,
        activeTab, setActiveTab,
        roleFilter, setRoleFilter,
        accountFilter, setAccountFilter,
        modal, setModal,
        selectedUser,
        deleteConfirm, setDeleteConfirm,
        departments,
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
        passwordConfirmOpen,
        setPasswordConfirmOpen
    };
}
