import React, { useState, useEffect } from 'react';
import { Bell, BellOff, VolumeX, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/common/useToast';
import { cn } from '@/utils/formatters';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function NotificationSettingsTab() {
    const { success: toastSuccess } = useToast();
    
    // Default to false if not set in local storage
    const [muteSounds, setMuteSounds] = useState(false);
    const [disableNotifications, setDisableNotifications] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        const isMuted = localStorage.getItem('chronicle_notifications_muted') === 'true';
        const isDisabled = localStorage.getItem('chronicle_notifications_disabled') === 'true';
        setMuteSounds(isMuted);
        setDisableNotifications(isDisabled);
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            localStorage.setItem('chronicle_notifications_muted', String(muteSounds));
            localStorage.setItem('chronicle_notifications_disabled', String(disableNotifications));
            setIsSaving(false);
            setShowSuccessModal(true);
            toastSuccess('Success', 'Notification settings saved successfully.');
        }, 600);
    };

    return (
        <div className="animate-fade-in pb-12 w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-none bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Bell size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-surface-900">Notification Settings</h2>
                    <p className="text-sm text-surface-500">Manage your personal preferences for alerts and sounds.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm overflow-hidden divide-y divide-surface-100">
                {/* Setting: Disable Notifications */}
                <div className="p-6 sm:p-8 flex items-start sm:items-center justify-between gap-6 hover:bg-surface-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-none flex items-center justify-center shrink-0 transition-colors", disableNotifications ? "bg-red-100 text-red-600" : "bg-surface-100 text-surface-600")}>
                            {disableNotifications ? <BellOff size={18} /> : <Bell size={18} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                                Disable In-App Notifications
                                {disableNotifications && <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Disabled</span>}
                            </h3>
                            <p className="text-sm text-surface-500 mt-1 max-w-xl">
                                Turn off all incoming in-app notifications and popups. You will no longer receive real-time alerts.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            const newValue = !disableNotifications;
                            setDisableNotifications(newValue);
                            localStorage.setItem('chronicle_notifications_disabled', String(newValue));
                            toastSuccess('Settings Updated', 'Notification preferences saved automatically.');
                        }}
                        className={cn(
                            "relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2",
                            disableNotifications ? "bg-red-500 focus:ring-red-500" : "bg-surface-200 focus:ring-surface-400"
                        )}
                    >
                        <motion.div
                            layout
                            transition={SPRING}
                            className={cn(
                                "w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow-sm absolute top-0.5",
                                disableNotifications ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                            )}
                        />
                    </button>
                </div>

                {/* Setting: Mute Sounds */}
                <div className="p-6 sm:p-8 flex items-start sm:items-center justify-between gap-6 hover:bg-surface-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-none flex items-center justify-center shrink-0 transition-colors", muteSounds ? "bg-amber-100 text-amber-600" : "bg-surface-100 text-surface-600")}>
                            <VolumeX size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                                Mute Notification Sounds
                                {muteSounds && <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Muted</span>}
                            </h3>
                            <p className="text-sm text-surface-500 mt-1 max-w-xl">
                                Disable the chime sound that plays when a new notification arrives.
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => {
                            const newValue = !muteSounds;
                            setMuteSounds(newValue);
                            localStorage.setItem('chronicle_notifications_muted', String(newValue));
                            toastSuccess('Settings Updated', 'Audio preferences saved automatically.');
                        }}
                        className={cn(
                            "relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2",
                            muteSounds ? "bg-amber-500 focus:ring-amber-500" : "bg-surface-200 focus:ring-surface-400"
                        )}
                    >
                        <motion.div
                            layout
                            transition={SPRING}
                            className={cn(
                                "w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow-sm absolute top-0.5",
                                muteSounds ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-slate-900 rounded-none shadow-xl w-full max-w-sm p-6 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-surface-900 mb-2">Settings Saved</h3>
                            <p className="text-surface-500 text-sm mb-6">
                                Your personal notification preferences have been updated successfully!
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-900 font-bold rounded-none transition-colors focus:outline-none"
                            >
                                Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
