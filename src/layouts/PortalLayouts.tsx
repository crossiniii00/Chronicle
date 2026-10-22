import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { useToast } from '@/components/common/useToast';
import {
    LayoutDashboard, UserCheck, Users, FileText, GraduationCap,
    Briefcase, Video, DoorOpen, PieChart, BarChart3, Monitor,
    History as HistoryIcon, User, BookOpen, Building2, Mail, Activity, Database,
    Network, ShieldAlert, CreditCard, ClipboardCheck, UserPlus, Settings,
    CheckCircle2, MessageSquare, Sparkles, Menu, ArrowUpRight, Bell
} from 'lucide-react';
import { Calendar } from 'lucide-react';
import { GlobalHeader } from '@/components/layouts/Header/GlobalHeader';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils/formatters';
import { socketService } from '@/services/socketService';
import { AnimatePresence } from 'framer-motion';
import { WelcomeIntro } from '@/pages/recruiter/components/Dashboard/WelcomeIntro';

import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

function getNext4AMPHTime(): number {
    const now = new Date();
    // Convert current time to UTC+8 (PH) date representation
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const phNow = new Date(utc + (3600000 * 8));
    
    // Set target reset to 4:00 AM PH time today
    const phReset = new Date(phNow);
    phReset.setHours(4, 0, 0, 0);
    
    // If it is already past 4:00 AM PH time, the next reset is 4:00 AM tomorrow
    if (phNow.getTime() >= phReset.getTime()) {
        phReset.setDate(phReset.getDate() + 1);
    }
    
    // Convert the PH time representation back to absolute UTC ms
    return phReset.getTime() - (3600000 * 8);
}

function LayoutWrapper({ groups }: { groups: any[] }) {
    const { user } = useAuthStore();
    const { initializeData } = useGlobalDataStore();
    const [showWelcome, setShowWelcome] = React.useState(false);
    const { loadNotifications } = useNotificationStore();
    const toast = useToast();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const isTracker = location.pathname.includes('/tracker') || location.pathname.includes('/mhrt') || location.pathname.includes('/hiring/chr') || location.pathname.includes('/settings');
    const isAccounts = location.pathname.includes('/accounts');

    // Initialize global data once when Layout mounts
    useEffect(() => {
        if (user?.id) {
            initializeData();
            const { setupSocketListeners } = useGlobalDataStore.getState();
            setupSocketListeners();
        }
    }, [user?.id, initializeData]);

    // Run user-specific check once auth credentials load
    useEffect(() => {
        if (user?.id) {
            const role = user.role?.toLowerCase();
            const isRecruiterOrAdmin = role === 'recruiter' || role === 'admin' || role === 'super_admin' || role === 'recruiter_interviewer';
            
            if (!isRecruiterOrAdmin) {
                setShowWelcome(false);
                return;
            }

            try {
                const until = localStorage.getItem(`welcome_intro_last_shown_until_${user.id}`);
                if (!until || Date.now() > Number(until)) {
                    setShowWelcome(false); // Hidden for now
                } else {
                    setShowWelcome(false);
                }
            } catch {
                setShowWelcome(false); // Hidden for now
            }
        }
    }, [user?.id]);

    const fetchNotifications = React.useCallback(() => {
        if (user?.id) {
            loadNotifications(user.id);
        }
    }, [loadNotifications, user?.id]);

    useVisibilityPolling(fetchNotifications, 120000, [fetchNotifications]);

    useEffect(() => {
        if (user?.id) {
            const socket = socketService.getSocket();
            const handleNewNotification = (data?: { title: string; message: string; userIds?: string[] }) => {
                if (data?.userIds && Array.isArray(data.userIds)) {
                    if (!data.userIds.includes(user.id)) {
                        return; // Not targeted to this user
                    }
                }
                console.log('[Socket] New notification, reloading notifications...');
                loadNotifications(user.id);
            };
            socket.on('notification:new', handleNewNotification);

            return () => {
                socket.off('notification:new', handleNewNotification);
            };
        }
    }, [loadNotifications, user?.id]);

    // Close mobile drawer automatically when navigating to another view
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-surface-50 font-sans text-left">
            <AnimatePresence>
                {showWelcome && (
                    <WelcomeIntro
                        user={user}
                        onClose={() => {
                            setShowWelcome(false);
                            try {
                                if (user?.id) {
                                    const nextReset = getNext4AMPHTime();
                                    localStorage.setItem(`welcome_intro_last_shown_until_${user.id}`, nextReset.toString());
                                }
                            } catch {}
                        }}
                    />
                )}
            </AnimatePresence>
            <div className="flex flex-1 overflow-hidden text-left relative">
                <Sidebar 
                    groups={groups} 
                    mobileOpen={mobileOpen} 
                    onMobileClose={() => setMobileOpen(false)} 
                />
                <div className="flex-1 flex flex-col overflow-hidden text-left min-w-0">
                    <GlobalHeader onMenuClick={() => setMobileOpen(true)} />

                    <main className={cn(
                        "flex-1 bg-surface-50/50 text-left transition-all duration-300 min-h-0",
                        isTracker ? "p-0 overflow-hidden flex flex-col" : 
                        isAccounts ? "p-0 overflow-auto" : "p-4 sm:p-6 overflow-auto"
                    )}>
                        <div className={cn("w-full text-left", isTracker && "flex-1 flex flex-col min-h-0")}>
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export function RecruiterLayout() {
    const groups = [
        {
            header: 'Quick Access',
            items: [
                {
                    path: '/recruiter/quick-settings', label: 'Quick Settings', icon: Sparkles, glow: true
                }
            ]
        },
        { 
            header: 'Overview', 
            items: [
                {
                    path: '/recruiter/dashboard', label: 'Overview', icon: LayoutDashboard,
                    subItems: [
                        { path: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { path: '/recruiter/calendar', label: 'Calendar', icon: Calendar },
                        { path: '/recruiter/profile', label: 'My Profile', icon: User }
                    ]
                }
            ] 
        },
        {
            header: 'Recruitment',
            items: [
                {
                    path: '/recruiter/tracker', label: 'Applicant Tracker', icon: UserCheck,
                    subItems: [
                        { path: '/recruiter/tracker/management', label: 'Application Management', icon: Users },
                        { path: '/recruiter/tracker/interview-form', label: 'Interview Form', icon: FileText },
                        { path: '/recruiter/tracker/masterlist', label: 'Masterlist', icon: GraduationCap },
                        { path: '/recruiter/tracker/scheduling', label: 'For Ops Val Scheduling', icon: Calendar },
                    ]
                },
                {
                    path: '/recruiter/interview', label: 'Interview Management', icon: Video,
                    subItems: [
                        { path: '/recruiter/interview/rooms', label: 'Interview Rooms', icon: DoorOpen },
                        { path: '/recruiter/interview/queue', label: 'Queue Console', icon: Monitor },
                    ]
                },
                {
                    path: '/recruiter/hiring', label: 'Hiring and Accounts', icon: Building2,
                    subItems: [
                        { path: '/recruiter/hiring/job-postings', label: 'Job Postings', icon: FileText },
                        { path: '/recruiter/hiring/accounts', label: 'Hiring & Accounts Hub', icon: Building2 },
                    ]
                },

            ]
        },
        {
            header: 'Insights',
            items: [
                {
                    path: '/recruiter/reports', label: 'Reports', icon: BarChart3,
                    subItems: [
                        { path: '/recruiter/reports', label: 'Report Dashboard', icon: BarChart3 },
                        { path: '/recruiter/tracker/typing-test-tracker', label: 'Tests Tracker', icon: Activity },
                        { path: '/recruiter/employee-tracker', label: 'Employee Tracker', icon: Network },
                        { path: '/recruiter/audit', label: 'Activity Logs', icon: HistoryIcon },
                    ]
                },
            ]
        },
        {
            dividerTop: true,
            header: 'System & References',
            items: [
                {
                    path: '/recruiter/mhrt', label: 'MHRT', icon: ClipboardCheck
                },
                {
                    path: '/recruiter/settings', label: 'CRM Settings', icon: Settings
                }
            ]
        }
    ];
    return <LayoutWrapper groups={groups} />;
}

export function GuestInterviewerLayout() {
    const { user } = useAuthStore();
    const { activeAccount, setActiveAccount } = useActiveAccountStore();
    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const currentAccount = (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH');

    const groups = [
        {
            header: 'Overview',
            items: [
                { path: '/final-interview/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/final-interview/profile', label: 'Profile', icon: User }
            ]
        },
        {
            header: 'Evaluation',
            items: [
                { path: '/final-interview/desk', label: 'Interview Desk', icon: ClipboardCheck }
            ]
        },
        {
            header: 'Account',
            items: [
                {
                    path: '#',
                    label: currentAccount.toUpperCase(),
                    icon: Building2,
                    subItems: [
                        { path: '/final-interview/analysis', label: 'Account Analysis', icon: PieChart },
                        { path: '/final-interview/schedules', label: 'Calendar', icon: Calendar },
                        { path: '/final-interview/team', label: 'Team', icon: Users }
                    ]
                }
            ]
        }
    ];
    return <LayoutWrapper groups={groups} />;
}

export function AdminLayout() {
    const groups = [
        {
            header: 'Quick Access',
            items: [
                {
                    path: '/admin/quick-settings', label: 'Quick Settings', icon: Sparkles, glow: true
                }
            ]
        },
        { 
            header: 'Main', 
            items: [
                {
                    path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard,
                    subItems: [
                        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { path: '/admin/calendar', label: 'Calendar', icon: Calendar },
                        { path: '/admin/profile', label: 'Profile', icon: User }
                    ]
                }
            ] 
        },
        {
            header: 'Recruitment',
            items: [
                {
                    path: '/admin/tracker', label: 'Applicant Tracker', icon: UserCheck,
                    subItems: [
                        { path: '/admin/tracker/management', label: 'Application Management', icon: Users },
                        { path: '/admin/tracker/interview-form', label: 'Interview Form', icon: FileText },
                        { path: '/admin/tracker/masterlist', label: 'Masterlist', icon: GraduationCap },
                        { path: '/admin/tracker/scheduling', label: 'For Ops Val Scheduling', icon: Calendar },
                    ]
                },
                {
                    path: '/admin/interview', label: 'Interview Management', icon: Video,
                    subItems: [
                        { path: '/admin/interview/rooms', label: 'Interview Rooms', icon: DoorOpen },
                        { path: '/admin/interview/queue', label: 'Queue Console', icon: Monitor },
                    ]
                },
                {
                    path: '/admin/hiring', label: 'Hiring and Accounts', icon: Building2,
                    subItems: [
                        { path: '/admin/hiring/job-postings', label: 'Job Postings', icon: FileText },
                        { path: '/admin/hiring/accounts', label: 'Hiring & Accounts Hub', icon: Building2 },
                    ]
                },

            ]
        },
        {
            header: 'Insights',
            items: [
                {
                    path: '/admin/reports', label: 'Reports', icon: BarChart3,
                    subItems: [
                        { path: '/admin/reports', label: 'Report Dashboard', icon: BarChart3 },
                        { path: '/admin/tracker/typing-test-tracker', label: 'Tests Tracker', icon: Activity },
                        { path: '/admin/employee-tracker', label: 'Employee Tracker', icon: Network },
                        { path: '/admin/audit', label: 'Security Logs', icon: ShieldAlert },
                    ]
                },
            ]
        },
        {
            dividerTop: true,
            header: 'System & References',
            items: [
                {
                    path: '/admin/mhrt', label: 'MHRT', icon: ClipboardCheck
                },
                {
                    path: '/admin/settings', label: 'CRM Settings', icon: Settings
                }
            ]
        }
    ];
    return <LayoutWrapper groups={groups} />;
}
