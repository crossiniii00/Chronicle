import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import {
    LayoutDashboard, UserCheck, Users, FileText, GraduationCap,
    Briefcase, Video, DoorOpen, PieChart, BarChart3, Monitor,
    History as HistoryIcon, User, BookOpen, Building2, Mail, Activity, Database,
    Network, ShieldAlert, CreditCard, ClipboardCheck, UserPlus, Settings,
    CheckCircle2, MessageSquare, Sparkles, Menu
} from 'lucide-react';
import { Calendar } from 'lucide-react';
import { GlobalHeader } from '@/components/layouts/Header/GlobalHeader';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils/formatters';
import { socketService } from '@/services/socketService';

import { useVisibilityPolling } from '@/hooks/useVisibilityPolling';

function LayoutWrapper({ groups }: { groups: any[] }) {
    const { user } = useAuthStore();
    const { loadNotifications } = useNotificationStore();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const isTracker = location.pathname.includes('/tracker') || location.pathname.includes('/mhrt') || location.pathname.includes('/hiring/chr');
    const isAccounts = location.pathname.includes('/accounts');

    const fetchNotifications = React.useCallback(() => {
        if (user?.id) {
            loadNotifications(user.id);
        }
    }, [loadNotifications, user?.id]);

    useVisibilityPolling(fetchNotifications, 120000, [fetchNotifications]);

    useEffect(() => {
        if (user?.id) {
            const socket = socketService.getSocket();
            const handleNewNotification = () => {
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
            header: 'Overview', 
            items: [
                { path: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/recruiter/forums', label: 'Forums', icon: MessageSquare }
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
                        { path: '/recruiter/tracker/typing-test-tracker', label: 'Tests Tracker', icon: Activity },
                        { path: '/recruiter/tracker/scheduling', label: 'Scheduling', icon: Calendar },
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
                        { path: '/recruiter/settings/job-postings', label: 'Job Postings', icon: Briefcase },
                        { path: '/recruiter/settings/accounts', label: 'Account System', icon: Building2 },
                    ]
                },
            ]
        },
        {
            header: 'References',
            items: [
                {
                    path: '/recruiter/mhrt', label: 'MHRT', icon: ClipboardCheck,
                    subItems: [
                        { path: '/recruiter/mhrt/salary', label: 'Salary', icon: CreditCard },
                        { path: '/recruiter/mhrt/accounts', label: 'Accounts', icon: Building2 },
                        { path: '/recruiter/mhrt/h2r-creation', label: 'H2R Creation Hub', icon: UserPlus },
                        { path: '/recruiter/mhrt/directory', label: 'Directory', icon: BookOpen },
                    ]
                },
            ]
        },
        {
            header: 'System',
            items: [
                {
                    path: '/recruiter/intelligence', label: 'Analytics', icon: PieChart,
                    subItems: [
                        { path: '/recruiter/reports', label: 'Reports', icon: BarChart3 },
                        { path: '/recruiter/audit', label: 'Activity Logs', icon: HistoryIcon },
                    ]
                },
            ]
        },
        {
            header: 'System Setup',
            items: [
                {
                    path: '/recruiter/settings', label: 'Project R Settings', icon: Settings,
                    subItems: [
                        { path: '/recruiter/settings/questions', label: 'Question Bank', icon: BookOpen },
                        { path: '/recruiter/settings/typing-test', label: 'Typing Test', icon: Activity },
                        { path: '/recruiter/settings/email-templates', label: 'Email Templates', icon: Mail },
                        { path: '/recruiter/settings/ai', label: 'AI Settings', icon: Sparkles },
                    ]
                },
            ]
        },
        { header: 'Account', items: [{ path: '/recruiter/profile', label: 'My Profile', icon: User }] }
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
                { path: '/final-interview/forums', label: 'Forums', icon: MessageSquare }
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
                        { path: '/final-interview/analysis', label: 'Analysis', icon: PieChart },
                        { path: '/final-interview/schedules', label: 'Calendar', icon: Calendar },
                        { path: '/final-interview/team', label: 'Team', icon: Users }
                    ]
                },
                { path: '/final-interview/profile', label: 'Profile', icon: User }
            ]
        }
    ];
    return <LayoutWrapper groups={groups} />;
}

export function AdminLayout() {
    const groups = [
        { 
            header: 'Main', 
            items: [
                { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
                { path: '/admin/forums', label: 'Forums', icon: MessageSquare },
                { path: '/admin/calendar', label: 'Calendar', icon: Calendar }
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
                        { path: '/admin/tracker/typing-test-tracker', label: 'Tests Tracker', icon: Activity },
                        { path: '/admin/tracker/scheduling', label: 'Scheduling', icon: Calendar },
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
                        { path: '/admin/settings/job-postings', label: 'Job Postings', icon: Briefcase },
                        { path: '/admin/settings/accounts', label: 'Account System', icon: Building2 },
                    ]
                },
            ]
        },
        {
            header: 'References',
            items: [
                {
                    path: '/admin/mhrt', label: 'MHRT', icon: ClipboardCheck,
                    subItems: [
                        { path: '/admin/mhrt/salary', label: 'Salary', icon: CreditCard },
                        { path: '/admin/mhrt/accounts', label: 'Accounts', icon: Building2 },
                        { path: '/admin/mhrt/h2r-creation', label: 'H2R Creation Hub', icon: UserPlus },
                        { path: '/admin/mhrt/directory', label: 'Directory', icon: BookOpen },
                    ]
                },
            ]
        },
        {
            header: 'System Setup',
            items: [
                {
                    path: '/admin/settings', label: 'Project R Settings', icon: Settings,
                    subItems: [
                        { path: '/admin/settings/questions', label: 'Question Bank', icon: BookOpen },
                        { path: '/admin/settings/typing-test', label: 'Typing Test', icon: Activity },
                        { path: '/admin/settings/email-templates', label: 'Email Templates', icon: Mail },
                        { path: '/admin/settings/ai', label: 'AI Settings', icon: Sparkles },
                        { path: '/admin/queue-settings', label: 'Active Tasks', icon: Activity },
                        { path: '/admin/backup', label: 'Backups', icon: Database },
                        { path: '/admin/users', label: 'Users', icon: Users }
                    ]
                },
                { path: '/admin/employee-tracker', label: 'Employee Tracker', icon: Network }
            ]
        },
        {
            header: 'Insights',
            items: [
                { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
                { path: '/admin/audit', label: 'Security Logs', icon: ShieldAlert },
            ]
        },
        { header: 'Identity', items: [{ path: '/admin/profile', label: 'Profile', icon: User }] }
    ];
    return <LayoutWrapper groups={groups} />;
}
