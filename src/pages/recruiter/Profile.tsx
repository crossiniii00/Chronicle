import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import {
    Mail, Phone, Building2, Key, Shield, Clock, Camera, Edit2, User, Users,
    Briefcase, BarChart, TrendingUp, UserMinus, UserCheck, Loader2, MessageSquare,
    Server, AlertCircle, Eye, EyeOff, Sparkles, Zap, Award, Activity, Fingerprint, ShieldCheck
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { WorkbenchTab } from '@/components/features/Profile/WorkbenchTab';
import { ApplicationService } from '@/services/ApplicationService';
import type { StatusHistoryEntry } from '@/types/application';
import { UserService } from '@/services/UserService';
import { forumsService } from '@/services/forumsService';
import { Modal } from '@/components/common/Modal';



export function RecruiterProfile() {

    const { user, refreshProfile } = useAuthStore();

    const { success, error: toastError } = useToast();

    const [isHovering, setIsHovering] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'workbench'>('profile');
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [dateFilter, setDateFilter] = useState('TODAY');

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [forumPostsCount, setForumPostsCount] = useState<number | null>(null);

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

    const [myPosts, setMyPosts] = useState<any[]>([]);
    const [peers, setPeers] = useState<any[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingPeers, setLoadingPeers] = useState(true);

    useEffect(() => {
        if (!user) return;
        forumsService.getPosts()
            .then(posts => {
                const filtered = posts.filter((p: any) => p.author?.id === user.id);
                setMyPosts(filtered);
                setForumPostsCount(filtered.length);
            })
            .catch(console.error)
            .finally(() => setLoadingPosts(false));

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
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const userName = user?.full_name?.toLowerCase() || '';

        // Date filter helper
        const matchesDate = (dateStr: string | undefined) => {
            if (!dateStr) return false;
            if (dateFilter === 'ALL') return true;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            if (dateFilter === 'TODAY') return d.toISOString().split('T')[0] === todayStr;
            if (dateFilter === 'WEEK') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return d >= weekAgo;
            }
            if (dateFilter === 'MONTH') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            return true;
        };

        // === SOURCE 1: Interview Form Applications ===
        // Match by interviewer_name or assigned_recruiter_name
        const myApps = applications.filter(app => {
            const interviewerMatch = (app.interviewer_name || '').toLowerCase() === userName;
            const recruiterMatch = (app.assigned_recruiter_name || '').toLowerCase() === userName;
            if (!interviewerMatch && !recruiterMatch) return false;

            // Date filter: use interview_completed_at only (do not fall back to updated_at/applied_at to avoid lumping imported data on the import date)
            const activityDate = app.interview_completed_at;
            return matchesDate(activityDate);
        });

        const interviewedFromApps = new Set(myApps.filter(app => {
            const status = (app.current_status || '').toUpperCase();
            // Anyone that has gone through the interview process
            return app.interview_completed_at || app.interview_responses ||
                ['INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'PASSED', 
                 'REJECTED', 'FAILED', 'ENDORSED', 'HIRED', 'HIRED_PROCESSED', 'CONDITIONAL',
                 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'WAITLISTED'].includes(status);
        }).map(a => a.id));

        const failedFromApps = myApps.filter(app => {
            const status = (app.current_status || '').toUpperCase();
            return ['REJECTED', 'FAILED'].includes(status);
        }).length;

        const endorsedFromApps = myApps.filter(app => {
            const status = (app.current_status || '').toUpperCase();
            return ['PASSED', 'HIRED', 'HIRED_PROCESSED', 'CONDITIONAL', 'ENDORSED', 
                    'FOR JOB OFFER', 'FOR_JOB_OFFER', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(status);
        }).length;

        // === SOURCE 2: Status History (fallback/supplement) ===
        const filteredHistory = history.filter(h => {
            if (!matchesDate(h.changed_at)) return false;
            return h.changed_by_name === user?.full_name;
        });

        const interviewedFromHistory = new Set(filteredHistory.filter(h =>
            ['INITIAL_INTERVIEW', 'FINAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED'].includes(h.to_status)
        ).map(h => h.application_id));

        const failedFromHistory = filteredHistory.filter(h =>
            ['REJECTED', 'FAILED'].includes(h.to_status)
        ).length;

        const endorsedFromHistory = filteredHistory.filter(h =>
            ['PASSED', 'HIRED', 'CONDITIONAL', 'ENDORSED'].includes(h.to_status)
        ).length;

        // === Merge: Use the higher count from either source ===
        const allInterviewedIds = new Set([...interviewedFromApps, ...interviewedFromHistory]);

        return {
            interviewed: allInterviewedIds.size,
            failed: Math.max(failedFromApps, failedFromHistory),
            endorsed: Math.max(endorsedFromApps, endorsedFromHistory)
        };
    }, [history, applications, dateFilter, user?.full_name]);



    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12 text-left animate-fade-in">
            {/* Modern Premium Hero Header Card */}
            <div className="bg-white border border-slate-250 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300">
                {/* 1. Cover Photo Banner with Indigo-Purple-Pink Mesh Gradient */}
                <div 
                    className="h-56 bg-cover bg-center relative overflow-hidden group/cover transition-all duration-500"
                    style={{ 
                        backgroundImage: user?.cover_data ? `url(${user.cover_data})` : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%)' 
                    }}
                >
                    {/* Animated background decoration */}
                    <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:20px_20px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {/* Sleek Cover Photo Upload Button */}
                    <label className="absolute bottom-4 right-6 z-20 px-3.5 py-2 rounded-lg bg-black/55 hover:bg-black/70 backdrop-blur-md text-white cursor-pointer border border-white/10 shadow-lg flex items-center gap-2 text-xs font-bold transition-all duration-150 active:scale-95">
                        {uploadingCover ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Camera size={12} />
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
                <div className="px-8 pb-6 pt-4 flex flex-col md:flex-row items-center md:items-end gap-6 relative bg-slate-50/50 border-t border-slate-200">
                    {/* Circle Overlapping Avatar with soft shadow and glow */}
                    <div
                        className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-4 border-white bg-gradient-to-tr from-[#4f46e5] to-[#db2777] shadow-[0_4px_12px_rgba(0,0,0,0.1)] -mt-16 md:-mt-20 relative z-10 flex items-center justify-center text-white font-black text-4xl uppercase overflow-hidden cursor-pointer select-none bg-cover bg-center transition-all duration-300 hover:scale-105"
                        style={{
                            backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none'
                        }}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        {isHovering || uploadingAvatar ? (
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-xs transition-all duration-150 cursor-pointer">
                                {uploadingAvatar ? (
                                    <Loader2 size={20} className="animate-spin mb-1" />
                                ) : (
                                    <Camera size={20} className="mb-1" />
                                )}
                                <span className="text-[9px] uppercase tracking-widest font-black text-neutral-200">
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
                        <div className="flex flex-col md:flex-row md:items-center md:justify-start justify-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-tight whitespace-nowrap">{user?.full_name}</h2>
                            <div className="flex items-center gap-1.5 font-bold text-violet-700 uppercase tracking-widest bg-violet-50 px-3 py-1 rounded-full text-[9px] shadow-sm border border-violet-100 shrink-0">
                                <ShieldCheck size={11} className="text-violet-500" />
                                {user?.role === 'admin' ? 'Administrator' :
                                    user?.role === 'recruiter_s' ? 'Recruiter S' :
                                        user?.role === 'recruiter_a' ? 'Recruiter A' :
                                            user?.role === 'recruiter_jc' ? 'Recruiter J&C' :
                                                user?.role === 'recruiter_sy' ? 'Recruiter SY' :
                                                    user?.role === 'recruiter_interviewer' ? 'Recruiter Interviewer' :
                                                        user?.role === 'ops_validator' ? 'OPS Validator' : 'Recruiter'}
                             </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400" />
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
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl font-bold text-xs transition-all duration-200 shadow-[0_4px_15px_rgba(168,85,247,0.15)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.25)] active:scale-95"
                        >
                            <Edit2 size={12} /> Profile Settings
                        </button>
                    </div>
                </div>

                {/* 3. Integrated Navigation Tabs Bar */}
                <div className="border-t border-slate-100 px-8 flex justify-between items-center bg-slate-50/50">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`py-4.5 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${
                                activeTab === 'profile'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                             }`}
                        >
                            <div className="flex items-center gap-2">
                                <User size={14} />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('workbench')}
                            className={`py-4.5 px-1 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${
                                activeTab === 'workbench'
                                    ? 'border-violet-600 text-violet-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                             }`}
                        >
                            <div className="flex items-center gap-2">
                                <Briefcase size={14} />
                                Workbench
                            </div>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Sidebar: Intro Cards & Peers */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-250 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300">
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3 flex items-center gap-2">
                                <Shield size={14} className="text-violet-600" />
                                Account Intro
                            </h3>
                            
                            <div className="space-y-5">
                                <div className="flex items-start gap-3.5 text-xs">
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0 border border-slate-100">
                                        <Shield size={14} />
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Role</span>
                                        <span className="font-extrabold text-slate-800 uppercase text-[10px] block mt-0.5">
                                            {user?.role === 'admin' ? 'Administrator' :
                                                user?.role === 'recruiter_s' ? 'Recruiter S' :
                                                    user?.role === 'recruiter_a' ? 'Recruiter A' :
                                                        user?.role === 'recruiter_jc' ? 'Recruiter J&C' :
                                                            user?.role === 'recruiter_sy' ? 'Recruiter SY' :
                                                                user?.role === 'recruiter_interviewer' ? 'Recruiter Interviewer' :
                                                                    user?.role === 'ops_validator' ? 'OPS Validator' : 'Recruiter'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 text-xs">
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0 border border-slate-100">
                                        <Clock size={14} />
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Member Since</span>
                                        <span className="font-extrabold text-slate-800 block mt-0.5">{formatDate(user?.created_at || new Date().toISOString())}</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 text-xs">
                                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0 border border-slate-100">
                                        <MessageSquare size={14} />
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Forums</span>
                                        <span className="font-extrabold text-slate-800 block mt-0.5">{forumPostsCount !== null ? forumPostsCount : 0} Posts</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Overview Items */}
                        <div className="bg-white border border-slate-250 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 space-y-5">
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                                <Mail size={14} className="text-violet-600" />
                                Contact Details
                            </h3>
                            
                            <div className="space-y-4.5 min-w-0">
                                {[
                                    { label: 'Name', value: user?.full_name, icon: User },
                                    { label: 'Department', value: user?.department || 'Talent Acquisition', icon: Briefcase },
                                    { label: 'Email', value: user?.email, icon: Mail },
                                    { label: 'Phone', value: user?.phone || '—', icon: Phone }
                                ].map((field, idx) => (
                                    <div key={idx} className="flex gap-3.5 text-xs">
                                        <div className="p-2 bg-slate-50 text-slate-505 rounded-lg shrink-0 border border-slate-100">
                                            <field.icon size={14} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">{field.label}</span>
                                            <span className="font-extrabold text-slate-800 block truncate mt-0.5">{field.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fellow Peers Card */}
                        <div className="bg-white border border-slate-250 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden text-left">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <Users size={14} className="text-[#0078d4]" />
                                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    Fellow Peers ({peers.length})
                                </h3>
                            </div>
                            <div className="p-4 max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                                {loadingPeers ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="animate-spin text-slate-400" size={18} />
                                    </div>
                                ) : peers.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-6">No fellow peers found.</p>
                                ) : (
                                    peers.map((peer) => (
                                        <div key={peer.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                            <div 
                                                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#db2777] border border-slate-100 flex items-center justify-center text-white font-black text-sm uppercase bg-cover bg-center shrink-0"
                                                style={{ backgroundImage: peer.avatar_data ? `url(${peer.avatar_data})` : 'none' }}
                                            >
                                                {!peer.avatar_data && peer.full_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-extrabold text-slate-800 truncate">{peer.full_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
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
                        <div className="bg-white border border-slate-250 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden">
                            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BarChart size={15} className="text-violet-600" />
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Performance Statistics</h3>
                                </div>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="text-[9px] font-black uppercase tracking-widest border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-slate-700 outline-none hover:border-violet-600 focus:border-violet-600 cursor-pointer transition-all duration-150"
                                >
                                    <option value="TODAY">Today</option>
                                    <option value="WEEK">Last 7 Days</option>
                                    <option value="MONTH">This Month</option>
                                    <option value="ALL">All Time</option>
                                </select>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {/* Card 1: Interviewed */}
                                    <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/40 hover:border-blue-200/60 shadow-[0_4px_12px_rgba(59,130,246,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group flex flex-col justify-between min-h-[120px]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <TrendingUp size={16} />
                                            </div>
                                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interviewed</p>
                                            <h4 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{stats.interviewed}</h4>
                                        </div>
                                    </div>

                                    {/* Card 2: Failed */}
                                    <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/40 hover:border-red-200/60 shadow-[0_4px_12px_rgba(239,68,68,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group flex flex-col justify-between min-h-[120px]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                                <UserMinus size={16} />
                                            </div>
                                            <span className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold font-black">Failed</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rejected</p>
                                            <h4 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{stats.failed}</h4>
                                        </div>
                                    </div>

                                    {/* Card 3: Endorsed */}
                                    <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/40 hover:border-emerald-200/60 shadow-[0_4px_12px_rgba(16,185,129,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group flex flex-col justify-between min-h-[120px]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                <UserCheck size={16} />
                                            </div>
                                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold font-black">Passed</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Endorsed</p>
                                            <h4 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{stats.endorsed}</h4>
                                        </div>
                                    </div>

                                    {/* Card 4: Forum Posts */}
                                    <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/40 hover:border-purple-200/60 shadow-[0_4px_12px_rgba(139,92,246,0.02)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group flex flex-col justify-between min-h-[120px]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                <MessageSquare size={16} />
                                            </div>
                                            <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold font-black">Forums</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Forum Posts</p>
                                            <h4 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">{forumPostsCount !== null ? forumPostsCount : 0}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* My Forum Posts Feed */}
                        <div className="bg-white border border-slate-250 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden text-left">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-violet-600" />
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                        My Forum Posts
                                    </h3>
                                </div>
                                <span className="text-[10px] font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {myPosts.length} posts
                                </span>
                            </div>
                            <div className="p-6 space-y-6">
                                {loadingPosts ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-violet-600" size={24} />
                                    </div>
                                ) : myPosts.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/40 border border-dashed border-slate-200 rounded-xl">
                                        <MessageSquare className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No posts added yet</p>
                                    </div>
                                ) : (
                                    myPosts.map((post) => (
                                        <div key={post.id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/60 transition-all duration-150">
                                            {/* Post Header */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div 
                                                    className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#db2777] flex items-center justify-center text-white font-black text-sm uppercase bg-cover bg-center shrink-0 border border-slate-100"
                                                    style={{ backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none' }}
                                                >
                                                    {!user?.avatar_data && user?.full_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-slate-800">{user?.full_name}</h4>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formatDate(post.created_at)}</p>
                                                </div>
                                            </div>
                                            {/* Post Content */}
                                            <div className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">
                                                {post.content}
                                            </div>
                                            {/* Image attachments if any */}
                                            {post.image_data && (
                                                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 max-h-[300px]">
                                                    <img src={post.image_data} alt="Post Attachment" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            {/* Post Actions Stats */}
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 pt-3 border-t border-slate-100/60">
                                                <span>{post.reactions?.length || 0} Reactions</span>
                                                <span>•</span>
                                                <span>{post.comments?.length || 0} Comments</span>
                                            </div>
                                        </div>
                                    ))
                                )}
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
                    <div className="flex items-center gap-5 pb-6 mb-6 border-b border-[#edebe9]">
                        <div
                            className="w-16 h-16 rounded-sm border border-[#edebe9] bg-gradient-to-tr from-[#005a9e] to-[#106ebe] flex items-center justify-center text-white font-black text-2xl uppercase overflow-hidden shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none' }}
                        >
                            {!user?.avatar_data && user?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-[15px] font-bold text-[#323130] tracking-tight truncate">{user?.full_name}</h3>
                                <span className="shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#eff6fc] text-[#0078d4] border border-[#eff6fc]">
                                    {user?.role === 'admin' ? 'Administrator' :
                                        user?.role === 'recruiter_s' ? 'Recruiter S' :
                                            user?.role === 'recruiter_a' ? 'Recruiter A' :
                                                user?.role === 'recruiter_jc' ? 'Recruiter J&C' :
                                                    user?.role === 'recruiter_sy' ? 'Recruiter SY' :
                                                        user?.role === 'recruiter_interviewer' ? 'Recruiter Interviewer' :
                                                            user?.role === 'ops_validator' ? 'OPS Validator' : 'Recruiter'}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#605e5c] font-semibold">{user?.email}</p>
                            <p className="text-[10px] text-[#8a8886] font-medium mt-0.5">Account ID: {user?.id?.slice(0, 8).toUpperCase() || '—'} • Last modified: {formatDate(user?.created_at || new Date().toISOString())}</p>
                        </div>
                    </div>

                    {/* Section 1: Personal Information */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Server size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] uppercase tracking-[0.15em]">Personal Information</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Department</label>
                                <input
                                    type="text"
                                    value={editForm.department}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="Human Resources"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] mb-6" />

                    {/* Section 2: Contact Details */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Mail size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] uppercase tracking-[0.15em]">Contact Details</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] mb-6" />

                    {/* Section 3: Password Settings */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Key size={14} className="text-[#0078d4]" />
                            <h4 className="text-[10px] font-black text-[#605e5c] uppercase tracking-[0.15em]">Security & Password</h4>
                        </div>
                        <p className="text-[11px] text-[#8a8886] mb-4">You can view your current password or toggle the option below to update it.</p>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={passwordForm.currentPassword}
                                        readOnly
                                        placeholder="••••••••"
                                        className="w-full pl-4 pr-10 py-2.5 bg-[#f3f2f1] border border-[#edebe9] rounded-sm text-[13px] font-semibold text-[#323130] cursor-default select-none focus:outline-none placeholder:text-[#a19f9d]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] transition-colors focus:outline-none"
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
                                            : 'bg-white hover:bg-[#faf9f8] border-[#d2d0ce] text-[#0078d4]'
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
                                            <p className="text-[11px] font-bold text-[#323130]">Confirm Password Update</p>
                                            <p className="text-[10px] text-[#605e5c] mt-0.5">Are you sure you want to update your login password? You will need to use your new password next time you log in.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmUI(false)}
                                            className="px-3 py-1.5 bg-white border border-[#d2d0ce] text-[#323130] text-[9px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#f3f2f1] transition-all"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-2 border-t border-dashed border-[#edebe9] animate-fadeIn">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] transition-colors focus:outline-none"
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Confirm New Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-sm text-[13px] font-semibold text-[#323130] focus:border-[#0078d4] focus:bg-white focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#323130] transition-colors focus:outline-none"
                                            >
                                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-[#edebe9] mb-6" />

                    {/* Notice */}
                    <div className="flex items-start gap-3 p-4 bg-[#faf9f8] border border-[#edebe9] mb-8 rounded-sm">
                        <AlertCircle size={16} className="text-[#0078d4] shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-[#605e5c] leading-relaxed">
                            <span className="font-bold text-[#323130]">Notice:</span> Profile updates are recorded in the system audit log. Changing your email address may require re-verification.
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-6 border-t border-[#edebe9]">
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
                                className="px-6 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] border border-[#d2d0ce] text-[#323130] text-[11px] font-black uppercase tracking-widest rounded-sm transition-all disabled:opacity-50"
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
        </div>
    );
}



