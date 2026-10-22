import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/common/useToast';
import { Mail, Phone, Building2, Clock, Camera, Edit2, Server, AlertCircle, ShieldAlert, Loader2, Key, Eye, EyeOff, Sparkles, Activity, Fingerprint, Award, ShieldCheck, MessageSquare, Users } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { UserService } from '@/services/UserService';
import { Modal } from '@/components/common/Modal';


export function AdminProfile() {
    const { user, refreshProfile } = useAuthStore();
    const { success, error: toastError } = useToast();
    const [isHovering, setIsHovering] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);

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
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
    const [showConfirmUI, setShowConfirmUI] = useState(false);

    const [peers, setPeers] = useState<any[]>([]);
    const [loadingPeers, setLoadingPeers] = useState(true);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

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
            success('Profile Updated', 'Your identity profile has been successfully updated.');
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in text-left font-sans">
            {/* Microsoft Teams Style Hero Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none shadow-sm transition-all duration-200">
                {/* 1. Cover Banner with Microsoft Corporate Wave Gradient */}
                <div 
                    className="h-44 bg-cover bg-center relative overflow-hidden group/cover transition-all duration-300"
                    style={{ 
                        backgroundImage: user?.cover_data ? `url(${user.cover_data})` : 'linear-gradient(90deg, #0078d4 0%, #005a9e 50%, #002050 100%)' 
                    }}
                >
                    <div className="absolute inset-0 bg-black/10" />

                    {/* Cover Photo Upload Button */}
                    <label className="absolute bottom-3 right-4 z-20 px-3 py-1.5 rounded-none bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white cursor-pointer border border-white/20 shadow-sm flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-97">
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
                            <div className="flex items-center gap-1.5 font-bold text-[#0078d4] uppercase tracking-wider bg-[#eff6fc] dark:bg-slate-800 px-2.5 py-0.5 rounded-none text-[9px] border border-[#deecf9] shrink-0">
                                <ShieldCheck size={10} className="text-[#0078d4]" />
                                Systems Administrator
                            </div>
                        </div>
                        <p className="text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#107c41]" />
                            {user?.department || 'IT Operations'}
                        </p>
                    </div>

                    {/* Action button */}
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
                            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 border border-[#8a8886] dark:border-slate-700 rounded-none font-semibold text-xs transition-colors duration-150 shadow-sm active:scale-97 cursor-pointer"
                        >
                            <Edit2 size={11} className="text-[#605e5c] dark:text-slate-400" />
                            <span>Profile Settings</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Account Details & Fellow Peers */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Account Details Card grid */}
                    <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none overflow-hidden shadow-xs text-left">
                        <div className="px-5 py-3.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center gap-2">
                            <Building2 size={13} className="text-[#0078d4]" />
                            <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">
                                Account Details
                            </h3>
                        </div>
                        <div className="p-5 space-y-3.5">
                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-3.5 space-y-0.5 text-left">
                                <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">Name</span>
                                <p className="text-sm font-bold text-[#323130] dark:text-slate-300">{user?.full_name}</p>
                            </div>
                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-3.5 space-y-0.5 text-left">
                                <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">Department</span>
                                <p className="text-sm font-bold text-[#323130] dark:text-slate-300">{user?.department || 'IT Operations'}</p>
                            </div>
                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-3.5 space-y-0.5 text-left">
                                <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">Email</span>
                                <div className="flex items-center gap-2 text-sm font-bold text-[#323130] dark:text-slate-300">
                                    <Mail size={12} className="text-[#605e5c] dark:text-slate-400 shrink-0" />
                                    <span className="truncate">{user?.email}</span>
                                </div>
                            </div>
                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-3.5 space-y-0.5 text-left">
                                <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">Phone</span>
                                <div className="flex items-center gap-2 text-sm font-bold text-[#323130] dark:text-slate-300">
                                    <Phone size={12} className="text-[#605e5c] dark:text-slate-400 shrink-0" />
                                    <span>{user?.phone || '—'}</span>
                                </div>
                            </div>
                            <div className="bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 rounded-none p-3.5 space-y-0.5 text-left">
                                <span className="text-[9px] font-bold text-[#8a8886] uppercase tracking-wider">Member Since</span>
                                <div className="flex items-center gap-2 text-sm font-bold text-[#323130] dark:text-slate-300">
                                    <Clock size={12} className="text-[#605e5c] dark:text-slate-400 shrink-0" />
                                    <span>{formatDate(user?.created_at || new Date().toISOString())}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fellow Peers Card */}
                    <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none shadow-xs overflow-hidden text-left">
                        <div className="px-5 py-3.5 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center gap-2">
                            <Users size={13} className="text-[#0078d4]" />
                            <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">
                                Fellow Peers ({peers.length})
                            </h3>
                        </div>
                        <div className="p-3 max-h-[380px] overflow-y-auto divide-y divide-[#f3f2f1]">
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

                    {/* Right Column: Recent Log */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Recent Log Feed */}
                        <div className="bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none shadow-xs overflow-hidden flex flex-col min-h-[300px]">
                            <div className="px-5 py-3 border-b border-[#edebe9] dark:border-slate-800 bg-[#faf9f8] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-[#0078d4]" />
                                    <h3 className="text-[11px] font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider">Recent Log</h3>
                                </div>
                                <span className="px-2.5 py-0.5 bg-[#eff6fc] dark:bg-slate-800 text-[#0078d4] text-[9px] font-bold rounded-sm uppercase tracking-wider border border-[#deecf9]">0 Logs</span>
                            </div>
                            <div className="flex-1 p-5 flex flex-col">
                                <div className="flex-1 border border-dashed border-[#d2d0ce] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-800/50 rounded-none flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
                                    <MessageSquare size={24} className="text-[#a19f9d] mb-3" />
                                    <h4 className="text-[11px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-widest mb-1">No Logs Added Yet</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>


            {/* Edit Profile Modal */}
            <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile" size="lg">
                <form onSubmit={handleEditSubmit} className="text-left">
                    {/* Profile Summary Header */}
                    <div className="flex items-center gap-5 pb-6 mb-6 border-b border-[#edebe9] dark:border-slate-800">
                        <div
                            className="w-16 h-16 rounded-none border border-[#edebe9] dark:border-slate-800 bg-gradient-to-tr from-[#1f1f1f] to-[#0078d4] flex items-center justify-center text-white font-black text-2xl uppercase overflow-hidden shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: user?.avatar_data ? `url(${user.avatar_data})` : 'none' }}
                        >
                            {!user?.avatar_data && user?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-[15px] font-bold text-[#323130] dark:text-slate-300 tracking-tight truncate">{user?.full_name}</h3>
                                <span className="shrink-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#fde7e9] text-[#a80000] border border-[#fde7e9]">Root Admin</span>
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
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Department</label>
                                <input
                                    type="text"
                                    value={editForm.department}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="IT Operations"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
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
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-[#605e5c] dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full px-4 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
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
                                        className="w-full pl-4 pr-10 py-2.5 bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 cursor-default select-none focus:outline-none placeholder:text-[#a19f9d]"
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
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border rounded-none transition-all duration-150 ${
                                        changePasswordEnabled
                                            ? 'bg-[#fdf3f2] hover:bg-[#fbe9e7] border-[#f5c2c2] text-[#a80000]'
                                            : 'bg-white dark:bg-slate-900 hover:bg-[#faf9f8] border-[#d2d0ce] text-[#0078d4]'
                                    }`}
                                >
                                    {changePasswordEnabled ? "Cancel Change" : "Change Password"}
                                </button>
                            </div>

                            {showConfirmUI && (
                                <div className="p-4 bg-[#fde7e9] border border-[#fde7e9] rounded-none text-left space-y-3 mb-4 transition-all duration-200">
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
                                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider rounded-none hover:bg-[#f3f2f1] transition-all"
                                        >
                                            No, Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setChangePasswordEnabled(true);
                                                setShowConfirmUI(false);
                                            }}
                                            className="px-3 py-1.5 bg-[#a80000] text-white border border-[#a80000] text-[9px] font-bold uppercase tracking-wider rounded-none hover:bg-[#820000] transition-all"
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
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
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
                                                className="w-full pl-4 pr-10 py-2.5 bg-[#faf9f8] border border-[#d2d0ce] rounded-none text-[13px] font-semibold text-[#323130] dark:text-slate-300 focus:border-[#0078d4] focus:bg-white dark:bg-slate-900 focus:outline-none transition-all placeholder:text-[#a19f9d]"
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
                    <div className="flex items-start gap-3 p-4 bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 mb-8 rounded-none">
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
                                    setShowConfirmUI(false);
                                    setPasswordForm({ currentPassword: user?.password_plain || '', newPassword: '', confirmPassword: '' });
                                }}
                                disabled={editSubmitting}
                                className="px-6 py-2 bg-[#f3f2f1] hover:bg-[#edebe9] dark:bg-slate-800 border border-[#d2d0ce] text-[#323130] dark:text-slate-300 text-[11px] font-black uppercase tracking-widest rounded-none transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editSubmitting}
                                className="flex items-center gap-2 px-8 py-2 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[11px] font-black uppercase tracking-widest rounded-none transition-all disabled:opacity-50 border border-[#0078d4]"
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
