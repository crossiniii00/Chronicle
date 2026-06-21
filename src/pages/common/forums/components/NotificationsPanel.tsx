import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Trash2, Check, CheckSquare } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/formatters';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
    const { user } = useAuthStore();
    const { notifications, loadNotifications, markRead, markAllRead, deleteNotification, unreadCount } = useNotificationStore();

    useEffect(() => {
        if (isOpen && user?.id) {
            loadNotifications(user.id);
        }
    }, [isOpen, user?.id]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-transparent z-[50] cursor-pointer"
                    />
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: -20, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                        className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-[#edebe9] text-[#323130] shadow-2xl z-[60] flex flex-col rounded-lg max-h-[500px] overflow-hidden"
                        style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
                    >
                        {/* Header */}
                        <div className="flex-none px-5 py-4 border-b border-[#edebe9] flex items-center justify-between bg-white shadow-sm z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-1 h-5 bg-[#0f6cbd] rounded-full shrink-0" />
                                <h2 className="text-[15px] font-semibold text-[#323130] tracking-tight flex items-center gap-1.5">
                                    <Bell size={16} className="text-[#0f6cbd]" />
                                    <span>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="bg-[#a80000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full select-none ml-1">
                                            {unreadCount}
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllRead()}
                                        className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#0f6cbd] hover:text-[#0e5c9f] transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                        title="Mark all as read"
                                    >
                                        <CheckSquare size={13} />
                                        <span>Read All</span>
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded hover:bg-[#f3f2f1] text-[#605e5c] hover:text-[#323130] transition-colors"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 bg-[#faf9f8] space-y-2.5">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                                    <div className="w-14 h-14 rounded-full bg-[#f3f2f1] flex items-center justify-center border border-[#edebe9] mb-3 text-[#605e5c]">
                                        <Bell size={24} />
                                    </div>
                                    <h3 className="font-semibold text-[#323130] text-sm mb-1">No notifications yet</h3>
                                    <p className="text-xs text-[#605e5c] max-w-[220px] leading-relaxed">
                                        We'll let you know when there's an update.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "border rounded-[6px] p-3.5 transition-all duration-150 relative group bg-white shadow-sm",
                                                notif.is_read
                                                    ? "border-[#edebe9] opacity-75"
                                                    : "border-[#0f6cbd]/30 bg-blue-50/5"
                                            )}
                                        >
                                            {/* Unread indicator dot */}
                                            {!notif.is_read && (
                                                <div className="absolute top-3.5 right-3 w-2 h-2 bg-[#0f6cbd] rounded-full" />
                                            )}

                                            <h4 className={cn(
                                                "text-xs pr-6",
                                                notif.is_read ? "font-semibold text-[#323130]" : "font-bold text-[#0f6cbd]"
                                            )}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-xs text-[#323130] mt-1 font-normal leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f3f2f1]">
                                                <span className="text-[10px] text-[#605e5c] font-semibold">
                                                    {formatTime(notif.created_at)}
                                                </span>
                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!notif.is_read && (
                                                        <button
                                                            onClick={() => markRead(notif.id)}
                                                            className="p-1 rounded text-[#0f6cbd] hover:bg-[#edf6fd] transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <Check size={13} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notif.id)}
                                                        className="p-1 rounded text-[#a80000] hover:bg-[#fde7e9] transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
