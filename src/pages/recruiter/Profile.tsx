import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import {
    Mail, Phone, Building2, Key, Shield, Clock, Camera, Edit2, User, Users,
    Briefcase, BarChart, TrendingUp, UserMinus, UserCheck, Loader2, MessageSquare,
    Server, AlertCircle, Eye, EyeOff, Sparkles, Zap, Award, Activity, Fingerprint, ShieldCheck, Tag
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { WorkbenchTab } from '@/components/features/Profile/WorkbenchTab';
import { ApplicationService } from '@/services/ApplicationService';
import type { StatusHistoryEntry } from '@/types/application';
import { UserService } from '@/services/UserService';
import { Modal } from '@/components/common/Modal';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';
import { fetchInterviewerStats, type DailyStats } from '@/services/interviewDataService';



export function RecruiterProfile() {

    const { user, refreshProfile } = useAuthStore();
    const { getLabel } = useAccountTypeSettings();

    const { success, error: toastError } = useToast();

    const [isHovering, setIsHovering] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'workbench'>('profile');
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [dateFilter, setDateFilter] = useState('TODAY');
    const [eodDailyStats, setEodDailyStats] = useState<DailyStats[]>([]);
    const [showEodModal, setShowEodModal] = useState(false);
    const [selectedEodStat, setSelectedEodStat] = useState<string | null>(null);

    useEffect(() => {
        if (user?.full_name) {
            fetchInterviewerStats(user.full_name, '2020-01-01', '2030-12-31')
                .then(setEodDailyStats)
                .catch(console.error);
        }
    }, [user?.full_name]);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        department: user?.department || '',
        phone: user?.phone || ''
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: user?.password_plain || '',
        newPassword: '',
        confirmPassword: ''
    });
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
    const [showConfirmUI, setShowConfirmUI] = useState(false);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    useEffect(() => {
        if (isEditModalOpen && user) {
            setEditForm({
                full_name: user.full_name || '',
                email: user.email || '',
                department: user.department || '',
                phone: user.phone || ''
            });
            setPasswordForm({
                currentPassword: user.password_plain || '',
                newPassword: '',
                confirmPassword: ''
            });
            setChangePasswordEnabled(false);
            setShowConfirmUI(false);
        }
    }, [isEditModalOpen, user]);

    const [peers, setPeers] = useState<any[]>([]);
    const [loadingPeers, setLoadingPeers] = useState(true);

    useEffect(() => {
        if (!user) return;


        UserService.getAll()
            .then(users => {
                const filtered = users.filter((u: any) => 
                    u.id !== user.id && (u.role === 'admin' || u.role?.startsWith('recruiter'))
                );
                setPeers(filtered);
            })
            .catch(console.error)
            .finally(() => setLoadingPeers(false));
    }, [user]);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditSubmitting(true);
        try {
            await UserService.updateMe({
                full_name: editForm.full_name,
                email: editForm.email,
                department: editForm.department,
                phone: editForm.phone
            });

            if (changePasswordEnabled) {
                if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                    throw new Error('Please fill in all password fields to update your password.');
                }
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    throw new Error('New passwords do not match.');
                }
                await UserService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            }

            await refreshProfile();
            success('Profile Updated', 'Your settings have been successfully updated.');
            setIsEditModalOpen(false);
            setChangePasswordEnabled(false);
            setShowConfirmUI(false);
            setPasswordForm({ currentPassword: user?.password_plain || '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toastError('Update Failed', err.response?.data?.message || err.message || 'Failed to update profile.');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toastError('Upload Failed', 'Please select an image file under 5MB.');
            return;
        }

        setUploadingAvatar(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64String = reader.result as string;
                    await UserService.updateMe({ avatar_data: base64String });
                    await refreshProfile();
                    success('Profile Picture Updated', 'Your profile picture has been successfully updated.');
                } catch (err) {
                    console.error(err);
                    toastError('Upload Failed', 'Failed to save profile picture.');
                } finally {
                    setUploadingAvatar(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            toastError('Upload Failed', 'Something went wrong while processing your profile picture.');
            setUploadingAvatar(false);
        }
    };

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toastError('Upload Failed', 'Please select an image file under 5MB.');
            return;
        }

        setUploadingCover(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64String = reader.result as string;
                    await UserService.updateMe({ cover_data: base64String });
                    await refreshProfile();
                    success('Cover Photo Updated', 'Your cover photo has been successfully updated.');
                } catch (err) {
                    console.error(err);
                    toastError('Upload Failed', 'Failed to save cover photo.');
                } finally {
                    setUploadingCover(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            toastError('Upload Failed', 'Something went wrong while processing your cover photo.');
            setUploadingCover(false);
        }
    };

    const [applications, setApplications] = useState<any[]>([]);

    useEffect(() => {
        ApplicationService.getAllStatusHistory().then(setHistory);
        ApplicationService.getAll().then(setApplications);
    }, []);

    const stats = useMemo(() => {
        const getManilaYMD = (date: Date | string | number) => {
            try {
                return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
            } catch {
                return '';
            }
        };
        const todayStr = getManilaYMD(new Date());
        const userName = user?.full_name?.toLowerCase() || '';

        console.log('[Profile Stats Debug]', {
            userFullName: user?.full_name,
            userName,
            applicationsLength: applications.length,
            historyLength: history.length,
            dateFilter
        });

        // Date filter helper
        const matchesDate = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            if (dateFilter === 'ALL') return true;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            
            const targetYMD = getManilaYMD(d);
            if (!targetYMD) return false;

            if (dateFilter === 'TODAY') return targetYMD === todayStr;
            if (dateFilter === 'WEEK') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return targetYMD >= getManilaYMD(weekAgo);
            }
            if (dateFilter === 'MONTH') {
                const [y, m] = targetYMD.split('-');
                const [ty, tm] = todayStr.split('-');
                return y === ty && m === tm;
            }
            if (dateFilter.includes('-')) {
                return targetYMD === dateFilter;
            }
            return false;
        };

        const filteredStats = eodDailyStats.filter(day => matchesDate(day.date));

        const tagBreakdown: Record<string, number> = {
            'No Show': 0,
            'Withdrawn': 0,
            'Waitlisted': 0,
            'H2R': 0,
            'Invited': 0
        };

        const tagged = filteredStats.reduce((sum, day) => sum + day.interviews.filter(i => {
            const s = (i.raw_status || '').toUpperCase();
            const isTagged = s.includes('NO_SHOW') || s.includes('NO SHOW') || s.includes('WITHDRAWN') || s.includes('WAITLISTED') || s.includes('H2R') || s.includes('INVITED');
            if (isTagged) {
                if (s.includes('NO_SHOW') || s.includes('NO SHOW')) tagBreakdown['No Show']++;
                else if (s.includes('WITHDRAWN')) tagBreakdown['Withdrawn']++;
                else if (s.includes('WAITLISTED')) tagBreakdown['Waitlisted']++;
                else if (s.includes('H2R')) tagBreakdown['H2R']++;
                else if (s.includes('INVITED')) tagBreakdown['Invited']++;
            }
            return isTagged;
        }).length, 0);

        return {
            interviewed: filteredStats.reduce((sum, day) => sum + day.total_count, 0),
            failed: filteredStats.reduce((sum, day) => sum + day.failed_count, 0),
            endorsedOver: filteredStats.reduce((sum, day) => sum + day.endorsedOver_count, 0),
            endorsedOps: filteredStats.reduce((sum, day) => sum + day.endorsedOps_count, 0),
            endorsed: filteredStats.reduce((sum, day) => sum + day.endorsed_count, 0),
            tagged,
            tagBreakdown
        };
    }, [eodDailyStats, dateFilter, user?.full_name]);



    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 text-left animate-fade-in font-sans">
            {/* Microsoft Teams Style Hero Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-sm transition-all duration-200">
                {/* 1. Cover Photo Banner with Clean Corporate Microsoft Wave/Mesh Gradient */}
                <div 
                    className="h-44 bg-cover bg-center relative overflow-hidden group/cover transition-all duration-300"
                    style={{ 
                        backgroundImage: user?.cover_data ? `url(${user.cover_data})` : 'linear-gradient(90deg, #0078d4 0%, #005a9e 50%, #002050 100%)' 
                    }}
                >
                    <div className="absolute inset-0 bg-black/10" />
                    
                    {/* Cover Photo Upload Button */}
                    <label className="absolute bottom-3 right-4 z-20 px-3 py-1.5 rounded-sm bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white cursor-pointer border border-white/20 shadow-sm flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-97">
                        {uploadingCover ? (
                            <Loader2 size={11} className="animate-spin" />
                        ) : (
                            <Camera size={11} />
                        )}
                        <span>{uploadingCover ? 'Uploading...' : 'Change Cover Banner'}</span>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            disabled={uploadingCover}
                            onChange={handleCoverChange}
                        />
                    </label>
                </div>

                {/* 2. Profile Details Bar (overlapping avatar) */}
                <div className="px-6 pb-5 pt-3 flex flex-col md:flex-row items-center md:items-end gap-5 relative bg-[#faf9f8]">
                    {/* Circle Avatar (Teams Style) */}
                    <div
                        className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-[#0078d4] shadow-md -mt-12 md:-mt-14 relative z-10 flex items-center justify-center text-white font-bold text-3xl uppercase overflow-hidden cursor-pointer select-none bg-cover bg-center transition-transform duration-200 hover:scale-103"
                        style={{
                            backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none'
                        }}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        {isHovering || uploadingAvatar ? (
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-xs transition-all duration-150 cursor-pointer rounded-full">
                                {uploadingAvatar ? (
                                    <Loader2 size={16} className="animate-spin mb-0.5" />
                                ) : (
                                    <Camera size={16} className="mb-0.5" />
                                )}
                                <span className="text-[8px] uppercase tracking-wider font-extrabold text-neutral-300">
                                    {uploadingAvatar ? 'Saving...' : 'Update'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    className="hidden"
                                    disabled={uploadingAvatar}
                                    onChange={handleAvatarChange}
                                />
                            </label>
                        ) : null}
                        {!user?.avatar_data && !uploadingAvatar && user?.full_name.charAt(0)}
                    </div>

                    {/* Profile Information details next to avatar */}
                    <div className="flex-1 text-center md:text-left pb-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-start justify-center gap-2">
                            <h2 className="text-xl font-bold text-[#323130] dark:text-slate-300 tracking-tight whitespace-nowrap">{user?.full_name}</h2>
                            <div className="flex items-center gap-1.5 font-bold text-[#0078d4] uppercase tracking-wider bg-[#eff6fc] dark:bg-slate-800 px-2.5 py-0.5 rounded-sm text-[9px] border border-[#deecf9] shrink-0">
                                <ShieldCheck size={10} className="text-[#0078d4]" />
                                {getLabel(user?.role as any)}
                             </div>
                        </div>
                        <p className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#107c41]" />
                            {user?.department || 'Human Resources'}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="pb-1">
                        <button 
                            onClick={() => {
                                setEditForm({
                                    full_name: user?.full_name || '',
                                    email: user?.email || '',
                                    department: user?.department || '',
                                    phone: user?.phone || ''
                                });
                                setIsEditModalOpen(true);
                             }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 border border-[#8a8886] dark:border-slate-700 rounded-sm font-semibold text-xs transition-colors duration-150 shadow-sm active:scale-97 cursor-pointer"
                        >
                            <Edit2 size={11} className="text-[#605e5c] dark:text-slate-400" />
                            <span>Profile Settings</span>
                        </button>
                    </div>
                </div>

                {/* 3. Integrated Navigation Tabs Bar (Office 365 style Ribbon/Tab) */}
                <div className="border-t border-[#edebe9] dark:border-slate-800 px-6 flex justify-between items-center bg-[#f3f2f1]">
                    <nav className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`py-3 px-1 border-b-2 font-semibold text-[12px] transition-all cursor-pointer ${
                                activeTab === 'profile'
                                    ? 'border-[#0078d4] text-[#0078d4]'
                                    : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300'
                             }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <User size={13} />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('workbench')}
                            className={`py-3 px-1 border-b-2 font-semibold text-[12px] transition-all cursor-pointer ${
                                activeTab === 'workbench'
                                    ? 'border-[#0078d4] text-[#0078d4]'
                                    : 'border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300'
                             }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <Briefcase size={13} />
                                Workbench
                            </div>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar: Intro Cards & Peers */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs p-5 transition-all duration-200">
                            <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider mb-4 border-b border-[#edebe9] dark:border-slate-800 pb-2 flex items-center gap-2">
                                <Shield size={13} className="text-[#0078d4]" />
                                Account Intro
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-1.5 bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400 rounded-sm shrink-0 border border-[#edebe9] dark:border-slate-800">
                                        <Shield size={13} />
                                    </div>
                                    <div>
                                        <span className="text-[#8a8886] block font-semibold text-[9px] uppercase tracking-wider">Role</span>
                                        <span className="font-bold text-[#323130] dark:text-slate-300 uppercase text-[10px] block mt-0.5">
                                            {getLabel(user?.role as any)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-xs">
                                    <div className="p-1.5 bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400 rounded-sm shrink-0 border border-[#edebe9] dark:border-slate-800">
                                        <Clock size={13} />
                                    </div>
                                    <div>
                                        <span className="text-[#8a8886] block font-semibold text-[9px] uppercase tracking-wider">Member Since</span>
                                        <span className="font-bold text-[#323130] dark:text-slate-300 block mt-0.5">{formatDate(user?.created_at || new Date().toISOString())}</span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Professional Overview Items */}
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs p-5 transition-all duration-200 space-y-4">
                            <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider border-b border-[#edebe9] dark:border-slate-800 pb-2 flex items-center gap-2">
                                <Mail size={13} className="text-[#0078d4]" />
                                Contact Details
                            </h3>
                            
                            <div className="space-y-3.5 min-w-0">
                                {[
                                    { label: 'Name', value: user?.full_name, icon: User },
                                    { label: 'Department', value: user?.department || 'Talent Acquisition', icon: Briefcase },
                                    { label: 'Email', value: user?.email, icon: Mail },
                                    { label: 'Phone', value: user?.phone || '—', icon: Phone }
                                ].map((field, idx) => (
                                    <div key={idx} className="flex gap-3 text-xs">
                                        <div className="p-1.5 bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400 rounded-sm shrink-0 border border-[#edebe9] dark:border-slate-800">
                                            <field.icon size={13} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[#8a8886] block font-semibold text-[9px] uppercase tracking-wider">{field.label}</span>
                                            <span className="font-bold text-[#323130] dark:text-slate-300 block truncate mt-0.5">{field.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fellow Peers Card */}
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden text-left">
                            <div className="px-5 py-3.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center gap-2">
                                <Users size={13} className="text-[#0078d4]" />
                                <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">
                                    Fellow Peers ({peers.length})
                                </h3>
                            </div>
                            <div className="p-3 max-h-[300px] overflow-y-auto divide-y divide-[#f3f2f1]">
                                {loadingPeers ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="animate-spin text-slate-400" size={16} />
                                    </div>
                                ) : peers.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-6">No fellow peers found.</p>
                                ) : (
                                    peers.map((peer) => (
                                        <div key={peer.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                            <div 
                                                className="w-8 h-8 rounded-full bg-[#0078d4] border border-[#edebe9] dark:border-slate-800 flex items-center justify-center text-white font-bold text-xs uppercase bg-cover bg-center shrink-0"
                                                style={{ backgroundImage: peer.avatar_data ? `url(${peer.avatar_data})` : 'none' }}
                                            >
                                                {!peer.avatar_data && peer.full_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[#323130] dark:text-slate-300 truncate">{peer.full_name}</p>
                                                <p className="text-[9px] font-semibold text-[#8a8886] uppercase tracking-wider mt-0.5 truncate">
                                                    {peer.role === 'admin' ? 'Administrator' : 'Recruiter'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Main Content Area: Stats and Forum Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Performance Statistics Card */}
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden">
                            <div 
                                className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between cursor-pointer hover:bg-[#f3f2f1] transition-colors"
                                onClick={() => setShowEodModal(true)}
                            >
                                <div className="flex items-center gap-2">
                                    <BarChart size={14} className="text-[#0078d4]" />
                                    <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">My EOD</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date"
                                        value={dateFilter.includes('-') ? dateFilter : ''}
                                        onChange={(e) => {
                                            if (e.target.value) setDateFilter(e.target.value);
                                            else setDateFilter('TODAY');
                                        }}
                                        className="text-[9px] font-bold uppercase tracking-wider border border-[#8a8886] dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 px-2 py-1 text-[#323130] dark:text-slate-300 outline-none hover:border-[#0078d4] focus:border-[#0078d4] transition-colors"
                                    />
                                    <select
                                        value={dateFilter.includes('-') ? 'CUSTOM' : dateFilter}
                                        onChange={(e) => {
                                            if (e.target.value !== 'CUSTOM') setDateFilter(e.target.value);
                                        }}
                                        className="text-[9px] font-bold uppercase tracking-wider border border-[#8a8886] dark:border-slate-700 rounded-sm bg-white dark:bg-slate-900 px-2.5 py-1 text-[#323130] dark:text-slate-300 outline-none hover:border-[#0078d4] focus:border-[#0078d4] cursor-pointer transition-colors duration-150"
                                    >
                                        <option value="TODAY">Today</option>
                                        <option value="WEEK">Last 7 Days</option>
                                        <option value="MONTH">This Month</option>
                                        <option value="ALL">All Time</option>
                                        {dateFilter.includes('-') && <option value="CUSTOM">Custom Date</option>}
                                    </select>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Card 1: Pass */}
                                    <div className="p-4 border border-[#edebe9] dark:border-slate-800 rounded-sm bg-[#faf9f8] hover:border-[#dfefe6] transition-all duration-200 flex flex-col justify-between min-h-[105px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="p-1.5 bg-[#dfefe6] text-[#107c41] rounded-sm">
                                                <UserCheck size={14} />
                                            </div>
                                            <span className="text-[8px] font-bold text-[#107c41] bg-[#dfefe6] px-2 py-0.5 rounded-sm uppercase tracking-wider border border-[#dfefe6]">Pass</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Pass</p>
                                            <h4 className="text-xl font-bold text-[#323130] dark:text-slate-300 mt-0.5 tracking-tight">{stats.endorsedOver + stats.endorsedOps}</h4>
                                        </div>
                                    </div>

                                    {/* Card 2: Fail */}
                                    <div className="p-4 border border-[#edebe9] dark:border-slate-800 rounded-sm bg-[#faf9f8] hover:border-[#fde7e9] transition-all duration-200 flex flex-col justify-between min-h-[105px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="p-1.5 bg-[#fde7e9] text-[#a80000] rounded-sm">
                                                <UserMinus size={14} />
                                            </div>
                                            <span className="text-[8px] font-bold text-[#a80000] bg-[#fde7e9] px-2 py-0.5 rounded-sm uppercase tracking-wider border border-[#fde7e9]">Fail</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Fail</p>
                                            <h4 className="text-xl font-bold text-[#323130] dark:text-slate-300 mt-0.5 tracking-tight">{stats.failed}</h4>
                                        </div>
                                    </div>

                                    {/* Card 3: Tagged */}
                                    <div className="p-4 border border-[#edebe9] dark:border-slate-800 rounded-sm bg-[#faf9f8] hover:border-[#deecf9] transition-all duration-200 flex flex-col justify-between min-h-[105px]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="p-1.5 bg-[#eff6fc] dark:bg-slate-800 text-[#0078d4] rounded-sm">
                                                <Tag size={14} />
                                            </div>
                                            <span className="text-[8px] font-bold text-[#0078d4] bg-[#eff6fc] dark:bg-slate-800 px-2 py-0.5 rounded-sm uppercase tracking-wider border border-[#deecf9]">Tagged</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Tagged</p>
                                            <h4 className="text-xl font-bold text-[#323130] dark:text-slate-300 mt-0.5 tracking-tight">{stats.tagged}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Log Feed */}
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-sm shadow-xs overflow-hidden flex flex-col min-h-[300px]">
                            <div className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-[#0078d4]" />
                                    <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">Recent Log</h3>
                                </div>
                                <span className="px-2.5 py-0.5 bg-[#eff6fc] dark:bg-slate-800 text-[#0078d4] text-[9px] font-bold rounded-sm uppercase tracking-wider border border-[#deecf9]">0 Logs</span>
                            </div>
                            <div className="flex-1 p-5 flex flex-col">
                                <div className="flex-1 border border-dashed border-[#d2d0ce] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-800/50 rounded-sm flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
                                    <MessageSquare size={24} className="text-[#a19f9d] mb-3" />
                                    <h4 className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest mb-1">No Logs Added Yet</h4>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            ) : (
                <WorkbenchTab user={user!} />
            )}
            
            {/* Edit Profile Modal */}
            <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Profile Settings" size="lg">
                <form onSubmit={handleEditSubmit} className="text-left">
                    {/* Profile Summary Header */}
                    <div className="flex items-center gap-5 pb-6 mb-6 border-b border-[#edebe9] dark:border-slate-800">
                        <div
                            className="w-16 h-16 rounded-sm border border-[#edebe9] dark:border-slate-800 bg-gradient-to-tr from-[#005a9e] to-[#106ebe] flex items-center justify-center text-white font-black text-2xl uppercase overflow-hidden shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none' }}
                        >
                            {!user?.avatar_data && user?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-[15px] font-bold text-[#323130] dark:text-slate-300 tracking-tight truncate">{user?.full_name}</h3>
                                <span className="shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#eff6fc] dark:bg-slate-800 text-[#0078d4] border border-[#eff6fc]">
                                    {getLabel(user?.role as any)}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#605e5c] dark:text-slate-400 font-semibold">{user?.email}</p>
                            <p className="text-[10px] text-[#8a8886] font-medium mt-0.5">Account ID: {user?.id?.slice(0, 8).toUpperCase() || '—'} • Last modified: {formatDate(user?.created_at || new Date().toISOString())}</p>
                        </div>
                    </div>

                    {/* Section 1: Personal Information */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Server size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] dark:text-slate-400 uppercase tracking-[0.15em]">Personal Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Department</label>
                                <input
                                    type="text"
                                    value={editForm.department}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="Human Resources"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] dark:bg-slate-800 mb-6" />

                    {/* Section 2: Contact Details */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Mail size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] dark:text-slate-400 uppercase tracking-[0.15em]">Contact Details</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] dark:bg-slate-800 mb-6" />

                    {/* Section 3: Password Settings */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Key size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] dark:text-slate-400 uppercase tracking-[0.15em]">Security & Password</h4>
                        </div>
                        <p className="text-[11px] text-[#8a8886] mb-4">You can view your current password or toggle the option below to update it.</p>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={passwordForm.currentPassword}
                                        readOnly
                                        placeholder="••••••••"
                                        className="w-full pl-4 pr-10 py-2.5 bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 cursor-default select-none focus:outline-none placeholder:text-[#a19f9d]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] dark:text-slate-300 transition-colors focus:outline-none"
                                    >
                                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (changePasswordEnabled) {
                                            setChangePasswordEnabled(false);
                                            setPasswordForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
                                        } else {
                                            setShowConfirmUI(true);
                                        }
                                    }}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border rounded-sm transition-all duration-150 ${
                                        changePasswordEnabled
                                            ? 'bg-[#fdf3f2] hover:bg-[#fbe9e7] border-[#f5c2c2] text-[#a80000]'
                                            : 'bg-white dark:bg-slate-900 hover:bg-[#faf9f8] border-[#d2d0ce] text-[#0078d4]'
                                    }`}
                                >
                                    {changePasswordEnabled ? "Cancel Change" : "Change Password"}
                                </button>
                            </div>

                            {showConfirmUI && (
                                <div className="p-4 bg-[#fde7e9] border border-[#fde7e9] rounded-sm text-left space-y-3 mb-4 transition-all duration-200">
                                    <div className="flex items-start gap-2.5">
                                        <AlertCircle size={16} className="text-[#a80000] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-bold text-[#323130] dark:text-slate-300">Confirm Password Update</p>
                                            <p className="text-[10px] text-[#605e5c] dark:text-slate-400 mt-0.5">Are you sure you want to update your login password? You will need to use your new password next time you log in.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmUI(false)}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#f3f2f1] transition-all"
                                        >
                                            No, Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setChangePasswordEnabled(true);
                                                setShowConfirmUI(false);
                                            }}
                                            className="px-3 py-1.5 bg-[#a80000] text-white border border-[#a80000] text-[9px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#820000] transition-all"
                                        >
                                            Yes, Proceed
                                        </button>
                                    </div>
                                </div>
                            )}

                            {changePasswordEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-2 border-t border-dashed border-[#edebe9] dark:border-slate-800 animate-fadeIn">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] dark:text-slate-300 transition-colors focus:outline-none"
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] dark:text-slate-300 transition-colors focus:outline-none"
                                            >
                                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] dark:bg-slate-800 mb-6" />

                    {/* Notice */}
                    <div className="flex items-start gap-3 p-4 bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 mb-8 rounded-sm">
                        <AlertCircle size={16} className="text-[#0078d4] shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-[#605e5c] dark:text-slate-400 leading-relaxed">
                            <span className="font-bold text-[#323130] dark:text-slate-300">Notice:</span> Profile updates are recorded in the system audit log. Changing your email address may require re-verification.
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-6 border-t border-[#edebe9] dark:border-slate-800">
                        <p className="text-[9px] font-bold text-[#a19f9d] uppercase tracking-widest">
                            Ref: {user?.id?.slice(0, 6).toUpperCase() || '000000'}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setChangePasswordEnabled(false);
                                    setPasswordForm({ currentPassword: user?.password_plain || '', newPassword: '', confirmPassword: '' });
                                }}
                                disabled={editSubmitting}
                                className="px-6 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] dark:bg-slate-800 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editSubmitting}
                                className="flex items-center gap-2 px-8 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[11px] font-black uppercase tracking-widest rounded-sm transition-all disabled:opacity-50 border border-[#0078d4]"
                            >
                                {editSubmitting && <Loader2 size={14} className="animate-spin" />}
                                {editSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
            {/* EOD Details Modal */}
            <Modal open={showEodModal} onClose={() => { setShowEodModal(false); setSelectedEodStat(null); }} title="My EOD Statistics" size="md">
                <div className="p-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 p-4 rounded-sm text-center">
                            <p className="text-[10px] font-bold text-[#8a8886] uppercase tracking-wider mb-1">Amount Interviewed</p>
                            <h4 className="text-2xl font-black text-[#323130] dark:text-slate-300">{stats.interviewed}</h4>
                        </div>
                        <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 p-4 rounded-sm text-center">
                            <p className="text-[10px] font-bold text-[#8a8886] uppercase tracking-wider mb-1">Initial Passed</p>
                            <h4 className="text-2xl font-black text-[#107c41]">{stats.endorsedOver}</h4>
                        </div>
                        <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 p-4 rounded-sm text-center">
                            <p className="text-[10px] font-bold text-[#8a8886] uppercase tracking-wider mb-1">Fail</p>
                            <h4 className="text-2xl font-black text-[#a80000]">{stats.failed}</h4>
                        </div>
                        <div 
                            className={`bg-[#faf9f8] border ${selectedEodStat === 'TAGGED' ? 'border-[#0078d4] ring-1 ring-[#0078d4]' : 'border-[#edebe9] dark:border-slate-800'} p-4 rounded-sm text-center cursor-pointer hover:border-[#0078d4] transition-all`}
                            onClick={() => setSelectedEodStat(selectedEodStat === 'TAGGED' ? null : 'TAGGED')}
                        >
                            <p className="text-[10px] font-bold text-[#8a8886] uppercase tracking-wider mb-1">Tagged</p>
                            <h4 className="text-2xl font-black text-[#0078d4]">{stats.tagged}</h4>
                        </div>
                    </div>

                    {selectedEodStat === 'TAGGED' && (
                        <div className="mt-4 p-4 border border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-sm shadow-sm animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-[10px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-widest mb-3 border-b border-[#edebe9] dark:border-slate-800 pb-2">
                                Tagging Breakdown
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(stats.tagBreakdown).map(([tag, count]) => (
                                    <div key={tag} className="flex flex-col p-2 bg-[#faf9f8] dark:bg-slate-800 border border-[#edebe9] dark:border-slate-700 rounded-sm">
                                        <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider mb-1">{tag}</span>
                                        <span className="text-sm font-black text-[#0078d4]">{count as React.ReactNode}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}




