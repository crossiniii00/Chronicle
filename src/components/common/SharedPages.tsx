// Shared notification page component reused via role-specific wrappers
import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { timeAgo } from '@/utils/formatters';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';

export function NotificationsPage() {
    const { user } = useAuthStore();
    const { notifications, loadNotifications, markRead, markAllRead, deleteNotification } = useNotificationStore();
    const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

    useEffect(() => { if (user?.id) loadNotifications(user.id); }, [loadNotifications, user?.id]);

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-full bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Stay updated with your latest recruitment activities and alerts.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-[#ef3e36] hover:border-[#ef3e36]/30 transition-all shadow-sm"
                            >
                                <CheckCheck size={16} />
                                Mark all as read
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Tabs / Filter Bar */}
                    <div className="flex items-center gap-6 px-6 border-b border-slate-100 bg-white dark:bg-slate-900">
                        <button
                            onClick={() => setFilter('all')}
                            className={`py-4 text-sm font-semibold relative transition-colors ${filter === 'all' ? 'text-[#ef3e36]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                        >
                            All Notifications
                            {notifications.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-600 rounded-md text-[10px]">
                                    {notifications.length}
                                </span>
                            )}
                            {filter === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ef3e36] rounded-t-full" />}
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`py-4 text-sm font-semibold relative transition-colors ${filter === 'unread' ? 'text-[#ef3e36]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                        >
                            Unread
                            {unreadCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-[#ef3e36]/10 text-[#ef3e36] rounded-md text-[10px]">
                                    {unreadCount}
                                </span>
                            )}
                            {filter === 'unread' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ef3e36] rounded-t-full" />}
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="divide-y divide-slate-100">
                        {filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <Bell size={24} className="text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-semibold">No notifications found</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-[240px]">
                                    {filter === 'unread' ? "You've caught up on all your alerts!" : "When you receive alerts, they will appear here."}
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`group flex items-start gap-4 p-5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/80 ${!n.is_read ? 'bg-[#ef3e36]/[0.02]' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${!n.is_read ? 'bg-white dark:bg-slate-900 border-[#ef3e36]/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                                        <Bell size={18} className={!n.is_read ? 'text-[#ef3e36]' : ''} />
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between gap-4">
                                            <p className={`text-sm font-bold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600'}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>
                                        <p className={`text-sm mt-1 leading-relaxed ${!n.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {n.message}
                                        </p>

                                        {!n.is_read && (
                                            <button
                                                onClick={() => markRead(n.id)}
                                                className="mt-3 text-[11px] font-bold text-[#ef3e36] uppercase tracking-wider hover:underline"
                                            >
                                                Mark as Read
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => deleteNotification(n.id)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all"
                                            title="Delete notification"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Shared profile page component
export function SharedProfilePage({ accentColor = 'from-blue-600 to-violet-600' }) {
    const { user } = useAuthStore();
    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>
            <div className="card mb-6 flex items-center gap-5">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${accentColor} flex items-center justify-center shrink-0`}>
                    <span className="text-3xl font-bold text-white">{user?.full_name.charAt(0)}</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{user?.full_name}</h2>
                    <p className="text-gray-400">{user?.email}</p>
                    <span className="badge status-approved mt-2 capitalize">{user?.role?.replace('_', ' ')}</span>
                </div>
            </div>
            <div className="card">
                <dl className="space-y-3">
                    {[
                        { label: 'Full Name', value: user?.full_name },
                        { label: 'Email', value: user?.email },
                        { label: 'Phone', value: user?.phone || '—' },
                        { label: 'Department', value: user?.department || '—' },
                        { label: 'Role', value: user?.role?.replace('_', ' ') },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm border-b border-white/05 pb-3 last:border-0 last:pb-0">
                            <dt className="text-gray-500">{label}</dt>
                            <dd className="text-gray-200 capitalize">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}
