import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { ApplicationService } from '@/services/ApplicationService';
import type { User } from '@/types/user';
import {
    Mail, Phone, Building2, Shield, Lock,
    Users, Target, CheckCircle2,
    Star, Calendar, Award, ChevronRight,
    Edit2, CircleDot, X, Loader2, Eye, EyeOff, Save,
    Camera, Upload
} from 'lucide-react';
import { formatDate, cn } from '@/utils/formatters';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

function roleLabel(role: string) {
    const map: Record<string, string> = {
        recruiter_s: 'Lead Recruiter',
        recruiter_a: 'Senior Recruiter',
        recruiter_interviewer: 'Interviewer',
        recruiter_jc: 'Jr. Recruiter',
        recruiter_sy: 'Sr. Recruiter',
        ops_validator: 'Operations Validator',
        admin: 'Admin',
        super_admin: 'Super Admin',
        guest_interviewer: 'Operations Validator',
    };
    return map[role] ?? role.replace(/_/g, ' ');
}

function roleAccent(role: string) {
    if (role.startsWith('recruiter')) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (role === 'ops_validator') return 'bg-violet-50 text-violet-700 border-violet-100';
    if (role.includes('admin')) return 'bg-rose-50 text-rose-700 border-rose-100';
    return 'bg-surface-100 text-surface-600 border-surface-200';
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────
interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSaved: (updated: User) => void;
}

function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
    const { success, error } = useToast();
    const [tab, setTab] = useState<'profile' | 'password'>('profile');

    // Profile form
    const [name, setName] = useState(user.full_name);
    const [phone, setPhone] = useState(user.phone || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password form
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [savingPw, setSavingPw] = useState(false);
    const [pwError, setPwError] = useState('');

    const handleSaveProfile = async () => {
        if (!name.trim()) return;
        setSavingProfile(true);
        try {
            const updated = await UserService.updateMe({ full_name: name.trim(), phone: phone.trim() || undefined });
            success('Profile updated', 'Your details have been saved.');
            onSaved(updated);
            onClose();
        } catch {
            error('Save failed', 'Could not update your profile. Try again.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        setPwError('');
        if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return; }
        if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
        if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }

        setSavingPw(true);
        try {
            await UserService.changePassword(currentPw, newPw);
            success('Password changed', 'Your password has been updated.');
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Could not change password. Try again.';
            setPwError(msg);
        } finally {
            setSavingPw(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={SPRING}
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-150 rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2.5">
                        <Edit2 size={16} className="text-slate-400" />
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">Edit Profile</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800/50 text-slate-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-slate-100 bg-white dark:bg-slate-900">
                    {(['profile', 'password'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                'flex-1 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors relative',
                                tab === t ? 'text-[#0f6cbd]' : 'text-slate-450 hover:text-slate-700 dark:text-slate-300'
                            )}
                        >
                            {t === 'profile' ? 'My Details' : 'Change Password'}
                            {tab === t && (
                                <motion.span
                                    layoutId="edit-tab-line"
                                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0f6cbd]"
                                    transition={SPRING}
                                />
                            )}
                        </button>
                    ))}
                </div>

                <div className="px-7 py-6 bg-white dark:bg-slate-900">
                    <AnimatePresence mode="wait">
                        {tab === 'profile' ? (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 6 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-5"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Full Name</label>
                                        <input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13.5px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0f6cbd] transition-colors bg-slate-50 dark:bg-slate-800/50"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Phone</label>
                                        <input
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13.5px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0f6cbd] transition-colors bg-slate-50 dark:bg-slate-800/50"
                                            placeholder="e.g. +63 912 345 6789"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Email</label>
                                    <div className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-lg flex items-center text-[13.5px] text-slate-400 font-medium">
                                        {user.email}
                                    </div>
                                    <p className="text-[10px] text-slate-450">Email cannot be changed. Contact your admin.</p>
                                </div>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile || !name.trim()}
                                    className="w-full h-10 bg-slate-900 text-white text-[13px] font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    Save Changes
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, x: 6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-5"
                            >
                                {/* Current password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? 'text' : 'password'}
                                            value={currentPw}
                                            onChange={e => setCurrentPw(e.target.value)}
                                            className="w-full h-10 px-3.5 pr-11 border border-slate-200 dark:border-slate-800 rounded-lg text-[13.5px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0f6cbd] transition-colors bg-slate-50 dark:bg-slate-800/50"
                                            placeholder="Enter your current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* New password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            value={newPw}
                                            onChange={e => setNewPw(e.target.value)}
                                            className="w-full h-10 px-3.5 pr-11 border border-slate-200 dark:border-slate-800 rounded-lg text-[13.5px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0f6cbd] transition-colors bg-slate-50 dark:bg-slate-800/50"
                                            placeholder="At least 6 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPw}
                                        onChange={e => setConfirmPw(e.target.value)}
                                        className="w-full h-10 px-3.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[13.5px] font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0f6cbd] transition-colors bg-slate-50 dark:bg-slate-800/50"
                                        placeholder="Type your new password again"
                                    />
                                </div>

                                {pwError && (
                                    <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[12px] font-semibold text-rose-700">
                                        {pwError}
                                    </div>
                                )}

                                <button
                                    onClick={handleChangePassword}
                                    disabled={savingPw}
                                    className="w-full h-10 bg-slate-900 text-white text-[13px] font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {savingPw ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                                    Change Password
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function GuestProfile() {
    const { user: authUser, refreshProfile } = useAuthStore();
    const [user, setUser] = useState(authUser);

    const [department, setDepartment] = useState<Department | null>(null);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [stats, setStats] = useState({ total: 0, hired: 0, pending: 0, inProgress: 0 });
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const { success, error } = useToast();

    useEffect(() => {
        if (refreshProfile) void refreshProfile();
    }, [refreshProfile]);

    // Sync local user state when auth store updates
    useEffect(() => { setUser(authUser); }, [authUser]);

    useEffect(() => {
        async function load() {
            if (!authUser) return;
            try {
                const [depts, apps, users] = await Promise.all([
                    DepartmentService.getAll(),
                    ApplicationService.getAll(),
                    UserService.getAll(),
                ]);
                const userDept = (authUser.department || '').toUpperCase().trim();
                const matched = userDept ? depts.find(d => d.name.toUpperCase() === userDept) ?? null : null;
                setDepartment(matched);

                const linked = userDept 
                    ? users.filter(u =>
                        (u.department || '').split(',').map(s => s.trim().toUpperCase()).includes(userDept) && 
                        u.id !== authUser.id &&
                        !u.role.startsWith('recruiter')
                    )
                    : [];
                setTeamMembers(linked);

                const deptApps = apps.filter(a =>
                    (a.department || '').split(',').map(s => s.trim().toUpperCase()).includes(userDept)
                );
                setStats({
                    total: deptApps.length,
                    hired: deptApps.filter(a => a.current_status === 'HIRED').length,
                    pending: deptApps.filter(a => a.current_status === 'APPLIED').length,
                    inProgress: deptApps.filter(a =>
                        ['INITIAL_INTERVIEW', 'ASSESSMENT', 'FINAL_INTERVIEW'].includes(a.current_status)
                    ).length,
                });
            } catch (err) {
                console.error('Profile load error:', err);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [authUser]);

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 1.5 * 1024 * 1024) {
            error('File too large', 'Please select an image smaller than 1.5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                await UserService.updateMe({ cover_data: base64 });
                success('Cover updated', 'Your profile cover photo has been changed.');
                setUser(prev => prev ? { ...prev, cover_data: base64 } : null);
                if (refreshProfile) void refreshProfile();
            } catch (err) {
                error('Upload failed', 'Could not save cover photo.');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1.5 * 1024 * 1024) {
            error('File too large', 'Please select an image smaller than 1.5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                await UserService.updateMe({ avatar_data: base64 });
                success('Avatar updated', 'Your profile picture has been updated.');
                setUser(prev => prev ? { ...prev, avatar_data: base64 } : null);
                if (refreshProfile) void refreshProfile();
            } catch (err) {
                error('Upload failed', 'Could not save profile picture.');
            }
        };
        reader.readAsDataURL(file);
    };

    const userInitials = (user?.full_name || '?')
        .split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    const deptName = user?.department || 'General';
    const quota = department?.hiring_quota ?? 0;
    const attainmentPct = quota > 0 ? Math.min(100, Math.round((stats.hired / quota) * 100)) : 0;

    if (!user) return null;

    return (
        <>
            <div className="w-full max-w-[1100px] mx-auto space-y-5 animate-fade-in pb-10 text-left">

                {/* MICROSOFT FLUENT PROFILE CONTAINER */}
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm overflow-hidden relative"
                >
                    {/* Cover Photo Area - Fluent Slate/Blue Corporate Style */}
                    <div className="h-44 md:h-56 w-full relative overflow-hidden group/cover bg-gradient-to-r from-[#005a9e] via-[#0078d4] to-[#106ebe] select-none">
                        {user.cover_data ? (
                            <img src={user.cover_data} alt="Profile Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.1)_100%)]" />
                        )}
                        
                        {/* Cover Image Upload Trigger - Microsoft Style Flat Button */}
                        <label className="absolute right-4 bottom-4 px-3 py-1.5 rounded-sm bg-black/60 hover:bg-black/85 text-white text-[11px] font-semibold uppercase tracking-wider border border-white/20 transition-all cursor-pointer flex items-center gap-2 shadow-sm select-none">
                            <Camera size={13} />
                            <span>Change Cover</span>
                            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                        </label>
                    </div>

                    {/* Profile Banner Details & Square Avatar Overlap */}
                    <div className="px-6 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                        {/* Left overlap info */}
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-5 -mt-14 md:-mt-16">
                            {/* Square Avatar container with inline uploader (Microsoft Teams / M365 style) */}
                            <div className="relative group/avatar">
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-lg border-[3px] border-white bg-slate-50 dark:bg-slate-800 shadow-md overflow-hidden flex items-center justify-center relative z-10">
                                    {user.avatar_data ? (
                                        <img src={user.avatar_data} alt={user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#f3f2f1] flex items-center justify-center">
                                            <span className="text-3xl font-bold text-[#605e5c] dark:text-slate-400">{userInitials}</span>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 rounded-lg bg-black/60 z-20 flex flex-col items-center justify-center gap-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150 cursor-pointer text-white select-none">
                                    <Camera size={16} />
                                    <span className="text-[9px] font-semibold uppercase tracking-wider">Update Photo</span>
                                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                                </label>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#107c10] border-2 border-white flex items-center justify-center z-30 shadow-sm">
                                    <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
                                </div>
                            </div>

                            <div className="text-center md:text-left mb-1">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#0078d4] bg-[#eff6fc] dark:bg-slate-800 border border-[#eff6fc] px-2 py-0.5 rounded-sm select-none">
                                        {roleLabel(user.role)}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#107c10] bg-[#dff6dd] border border-[#dff6dd] px-2 py-0.5 rounded-sm flex items-center gap-1 select-none">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#107c10]" />
                                        Active
                                    </span>
                                </div>
                                <h1
                                    className="text-2xl text-[#323130] dark:text-slate-300 tracking-tight font-bold"
                                    style={{ fontFamily: 'Segoe UI, -apple-system, sans-serif' }}
                                >
                                    {user.full_name}
                                </h1>
                                <p className="text-xs text-[#605e5c] dark:text-slate-400 font-semibold tracking-wide mt-0.5">{deptName}</p>
                            </div>
                        </div>

                        {/* Right quick actions */}
                        <div className="flex items-center gap-3 shrink-0 select-none mb-1">
                            <button
                                onClick={() => setEditOpen(true)}
                                className="px-4 py-2 border border-[#a19f9d] hover:border-[#323130] bg-white dark:bg-slate-900 text-[#323130] dark:text-slate-300 text-[11px] font-semibold rounded-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:bg-[#f3f2f1]"
                            >
                                <Edit2 size={12} className="text-[#605e5c] dark:text-slate-400" />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>

                    {/* Stat row - Flat, Proportional grid */}
                    <div className="border-t border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] grid grid-cols-4 divide-x divide-[#edebe9] select-none text-center">
                        {[
                            { label: 'Applicants', value: stats.total, color: 'text-[#323130] dark:text-slate-300' },
                            { label: 'Hired', value: stats.hired, color: 'text-[#107c10]' },
                            { label: 'Interviewing', value: stats.inProgress, color: 'text-[#0078d4]' },
                            { label: 'Waiting', value: stats.pending, color: 'text-[#b15c00]' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex flex-col items-center py-3.5 gap-0.5">
                                <span className={cn('text-xl font-bold tabular-nums leading-none tracking-tight', color)}>
                                    {loading ? '—' : value}
                                </span>
                                <span className="text-[9px] font-semibold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">{label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* BODY Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 items-start text-left">

                    {/* LEFT SIDEBAR: Department Summary & Targets */}
                    <div className="space-y-5">
                        {/* Department Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden"
                        >
                            <div className="px-4 py-2.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center gap-2">
                                <Building2 size={13} className="text-[#0078d4]" />
                                <h3 className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">
                                    Department
                                </h3>
                            </div>
                            <div className="p-4 flex flex-col items-center gap-3">
                                <div className="shrink-0 w-14 h-14 rounded-sm border border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden p-1.5">
                                    {(department?.accountImageData || department?.accountImageUrl) ? (
                                        <img
                                            src={department.accountImageData || department.accountImageUrl || ''}
                                            alt={deptName}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Building2 size={24} className="text-[#a19f9d]" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <h4 className="text-xs font-bold text-[#323130] dark:text-slate-300">{deptName}</h4>
                                    <p className="text-[9px] text-[#8a8886] font-semibold uppercase tracking-wider mt-0.5">Internal Registry</p>
                                </div>

                                <div className="w-full border-t border-[#edebe9] dark:border-slate-800 pt-2 space-y-1">
                                    {[
                                        { label: 'Lead/Head', value: department?.head || 'Unassigned', icon: <Star size={11} className="text-[#b15c00]" /> },
                                        { label: 'Budget Code', value: department?.budgetCode || 'n/a', icon: <Award size={11} className="text-[#0078d4]" />, mono: true },
                                    ].map(({ label, value, icon, mono }) => (
                                        <div key={label} className="flex items-center justify-between py-1 border-b border-[#f3f2f1] last:border-0">
                                            <span className="text-[10px] text-[#605e5c] dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                                                {icon} {label}
                                            </span>
                                            <span className={cn("text-[10px] font-semibold text-[#323130] dark:text-slate-300", mono && "font-mono font-bold")}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Quota Target Card */}
                        {quota > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: 0.08 }}
                                className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden"
                            >
                                <div className="px-4 py-2.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center gap-2">
                                    <Target size={13} className="text-[#0078d4]" />
                                    <h3 className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">
                                        Hiring Target
                                    </h3>
                                </div>
                                <div className="p-4 space-y-2.5">
                                    <div className="flex items-end justify-between">
                                        <span className="text-2xl font-bold leading-none text-[#323130] dark:text-slate-300 tabular-nums tracking-tight">
                                            {attainmentPct}<span className="text-sm text-[#8a8886] font-semibold">%</span>
                                        </span>
                                        <span className="text-[9px] font-semibold text-[#605e5c] dark:text-slate-400 mb-0.5">
                                            {stats.hired} / {quota} Hires
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-[#f3f2f1] rounded-none overflow-hidden p-[1px] border border-[#edebe9] dark:border-slate-800">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${attainmentPct}%` }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                            className={cn(
                                                'h-full rounded-none',
                                                attainmentPct >= 75 ? 'bg-[#107c10]' :
                                                attainmentPct >= 40 ? 'bg-[#b15c00]' : 'bg-[#0078d4]'
                                            )}
                                        />
                                    </div>
                                    <p className="text-[9px] text-[#605e5c] dark:text-slate-400 font-semibold uppercase tracking-wider">
                                        {quota - stats.hired > 0
                                            ? `${quota - stats.hired} slots remaining`
                                            : 'Quota Target Attained'}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR: Personal Details & Team Members */}
                    <div className="space-y-5 min-w-0">

                        {/* Your Details */}
                        <motion.div
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                            className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden"
                        >
                            <div className="px-4 py-2.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between">
                                <h3 className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield size={13} className="text-[#0078d4]" />
                                    Account Details
                                </h3>
                                <button
                                    onClick={() => setEditOpen(true)}
                                    className="text-[10px] font-semibold text-[#0078d4] hover:underline flex items-center gap-1 transition-colors"
                                >
                                    <Edit2 size={10} /> Edit Details
                                </button>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {[
                                    { label: 'Full Name', value: user.full_name, icon: <Shield size={12} className="text-[#605e5c] dark:text-slate-400" /> },
                                    { label: 'Role Designation', value: roleLabel(user.role), icon: <Award size={12} className="text-[#0078d4]" /> },
                                    { label: 'Email Address', value: user.email, icon: <Mail size={12} className="text-[#605e5c] dark:text-slate-400" /> },
                                    { label: 'Contact Phone', value: user.phone || '—', icon: <Phone size={12} className="text-[#605e5c] dark:text-slate-400" /> },
                                    { label: 'Manager / Supervisor', value: department?.head || 'Unassigned', icon: <Users size={12} className="text-[#605e5c] dark:text-slate-400" /> },
                                    { label: 'Date Joined', value: formatDate(user.created_at || new Date().toISOString()), icon: <Calendar size={12} className="text-[#605e5c] dark:text-slate-400" /> },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="space-y-1">
                                        <label className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">{label}</label>
                                        <div className="flex items-center gap-2 h-9 px-3 bg-white dark:bg-slate-900 border border-[#d2d0ce] rounded-sm focus-within:border-[#0078d4] transition-colors">
                                            {icon}
                                            <span className="text-xs font-semibold text-[#323130] dark:text-slate-300 truncate">{value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Team Members List */}
                        <motion.div
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0.08 }}
                            className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden"
                        >
                            <div className="px-4 py-2.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between">
                                <h3 className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={13} className="text-[#0078d4]" />
                                    Team Members
                                </h3>
                                <span className="text-[10px] font-semibold text-[#605e5c] dark:text-slate-400 bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 px-2 py-0.5 rounded-sm select-none tabular-nums">
                                    {teamMembers.length} Active
                                </span>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="w-4 h-4 border-2 border-[#edebe9] dark:border-slate-800 border-t-[#0078d4] rounded-full animate-spin" />
                                </div>
                            ) : teamMembers.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <div className="w-8 h-8 rounded-sm bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 flex items-center justify-center text-[#a19f9d]">
                                        <Users size={16} />
                                    </div>
                                    <p className="text-[10px] font-semibold text-[#8a8886] uppercase tracking-wider">No other team members found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#f3f2f1]">
                                    {teamMembers.map((member, i) => {
                                        const initials = member.full_name
                                            .split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                                        return (
                                            <motion.div
                                                key={member.id}
                                                initial={{ opacity: 0, y: 2 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15, delay: i * 0.02 }}
                                                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[#faf9f8] transition-colors"
                                            >
                                                <div className="relative shrink-0 select-none">
                                                    {member.avatar_data ? (
                                                        <img src={member.avatar_data} alt={member.full_name} className="w-8 h-8 rounded-sm object-cover border border-[#edebe9] dark:border-slate-800" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-sm bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-[#605e5c] dark:text-slate-400">{initials}</span>
                                                        </div>
                                                    )}
                                                    {member.is_active && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#107c10] border border-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-[#323130] dark:text-slate-300 leading-tight truncate">{member.full_name}</p>
                                                    <p className="text-[10px] font-medium text-[#8a8886] truncate mt-0.5">{member.email}</p>
                                                </div>
                                                <span className={cn(
                                                    'shrink-0 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border select-none',
                                                    roleAccent(member.role).replace('bg-blue-50 text-blue-700 border-blue-100', 'bg-[#eff6fc] dark:bg-slate-800 text-[#0078d4] border-[#eff6fc]')
                                                                           .replace('bg-violet-50 text-violet-700 border-violet-100', 'bg-[#f3f2f1] text-[#5c2d91] border-[#f3f2f1]')
                                                                           .replace('bg-rose-50 text-rose-700 border-rose-100', 'bg-[#fde7e9] text-[#a80000] border-[#fde7e9]')
                                                )}>
                                                    {roleLabel(member.role)}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Edit Profile + Change Password Modal */}
            <AnimatePresence>
                {editOpen && (
                    <EditProfileModal
                        user={user}
                        onClose={() => setEditOpen(false)}
                        onSaved={(updated) => setUser(prev => prev ? { ...prev, ...updated } : updated)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
