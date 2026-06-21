import React from 'react';
import {
    Sliders, RotateCcw, Check, Search, ShieldCheck,
    Layers, Lock, Unlock, Users, Users2, HardHat, Crown, Briefcase,
    Building2, FileText, GraduationCap, Calendar, DoorOpen,
    Monitor, CreditCard, UserPlus, BookOpen, Mail,
    Activity, Database, BarChart3, ShieldAlert,
    Network, User as UserIcon, X, CheckSquare, Square,
    Pencil, Trash2, Archive, ArchiveRestore, Smile,
    ChevronDown, MessageSquare
} from 'lucide-react';
import type { UserRole } from '@/types';
import {
    ROLE_ACCENTS,
    DEFAULT_COLORS
} from '../hooks/useAccountTypeSettings';

export type ColorKey = UserRole;

export const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

export function getModuleColorClass(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('dashboard') || l.includes('overview')) return 'bg-sky-400';
    if (l.includes('tracker') || l.includes('management') || l.includes('users') || l.includes('employee')) return 'bg-emerald-400';
    if (l.includes('hiring') || l.includes('chr') || l.includes('posting') || l.includes('account')) return 'bg-amber-400';
    if (l.includes('mhrt') || l.includes('salary') || l.includes('directory') || l.includes('reference')) return 'bg-rose-400';
    if (l.includes('settings') || l.includes('question') || l.includes('typing') || l.includes('email')) return 'bg-pink-400';
    if (l.includes('interview') || l.includes('queue') || l.includes('scheduling') || l.includes('room') || l.includes('console')) return 'bg-purple-400';
    if (l.includes('active tasks') || l.includes('backups') || l.includes('database')) return 'bg-violet-400';
    if (l.includes('reports') || l.includes('analytics') || l.includes('log') || l.includes('audit')) return 'bg-orange-400';
    return 'bg-blue-400';
}

export interface ModulePermission {
    id: string;
    label: string;
    description: string;
    group: 'Overview' | 'Recruitment' | 'Hiring & Accounts' | 'Interview Management' | 'References' | 'Project R' | 'System' | 'Insights' | 'Identity';
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

export const PERMISSIONABLE_MODULES: ModulePermission[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Overview metrics and recent activity', group: 'Overview', icon: Layers },
    { id: 'forums', label: 'Forums', description: 'Interactive discussions and forums', group: 'Overview', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', description: 'Global event and interview calendar', group: 'Overview', icon: Calendar },
    { id: 'application_management', label: 'Application Management', description: 'Review and route incoming applications', group: 'Recruitment', icon: Users },
    { id: 'interview_form', label: 'Interview Form', description: 'Submit and edit initial interview forms', group: 'Recruitment', icon: FileText },
    { id: 'masterlist', label: 'Masterlist', description: 'Candidate pipeline registry', group: 'Recruitment', icon: GraduationCap },
    { id: 'typing_test_tracker', label: 'Tests Tracker', description: 'Real-time candidate typing tests and exam assessment tracker analytics', group: 'Recruitment', icon: Activity },
    { id: 'chr', label: 'CHR', description: 'Cebu hiring report', group: 'Hiring & Accounts', icon: FileText },
    { id: 'job_postings', label: 'Job Postings', description: 'Manage open positions', group: 'Hiring & Accounts', icon: Briefcase },
    { id: 'account_system', label: 'Account System', description: 'Manage client accounts and assignments', group: 'Hiring & Accounts', icon: Building2 },
    { id: 'interview_rooms', label: 'Interview Rooms', description: 'Active session rooms', group: 'Interview Management', icon: DoorOpen },
    { id: 'queue_console', label: 'Queue Console', description: 'Live applicant queue', group: 'Interview Management', icon: Monitor },
    { id: 'scheduling', label: 'Scheduling', description: 'Schedule interview appointments', group: 'Interview Management', icon: Calendar },
    { id: 'mhrp_salary', label: 'MHRT · Salary', description: 'Salary and payroll reference', group: 'References', icon: CreditCard },
    { id: 'mhrp_accounts', label: 'MHRT · Accounts', description: 'MHRT account directory', group: 'References', icon: Building2 },
    { id: 'mhrp_h2r_creation', label: 'MHRT · H2R Creation Hub', description: 'Hire-to-retire creation workflow', group: 'References', icon: UserPlus },
    { id: 'mhrp_directory', label: 'MHRT · Directory', description: 'Employee directory', group: 'References', icon: BookOpen },
    { id: 'question_bank', label: 'Question Bank', description: 'Interview question library', group: 'Project R', icon: BookOpen },
    { id: 'typing_test', label: 'Typing Test', description: 'Typing test configuration', group: 'Project R', icon: Activity },
    { id: 'email_templates', label: 'Email Templates', description: 'Notification and email templates', group: 'Project R', icon: Mail },
    { id: 'active_tasks', label: 'Active Tasks', description: 'Background queue settings', group: 'System', icon: Activity },
    { id: 'backups', label: 'Backups', description: 'Database backup and restore', group: 'System', icon: Database },
    { id: 'users', label: 'Users', description: 'User management and provisioning', group: 'System', icon: Users },
    { id: 'employee_tracker', label: 'Employee Tracker', description: 'Employee activity hub', group: 'System', icon: Network },
    { id: 'reports', label: 'Reports', description: 'Analytics and performance reports', group: 'Insights', icon: BarChart3 },
    { id: 'audit_logs', label: 'Audit Trail', description: 'Security and activity logs', group: 'Insights', icon: ShieldAlert },
    { id: 'profile', label: 'Profile', description: 'Personal profile and preferences', group: 'Identity', icon: UserIcon },
];

export const CATEGORIES = [
    { id: 'All', label: 'All Modules', icon: Sliders },
    { id: 'Overview', label: 'Overview', icon: Layers },
    { id: 'Recruitment', label: 'Recruitment', icon: Users },
    { id: 'Hiring & Accounts', label: 'Hiring & Accounts', icon: Building2 },
    { id: 'Interview Management', label: 'Interview Management', icon: Monitor },
    { id: 'References', label: 'References', icon: BookOpen },
    { id: 'Project R', label: 'Project R', icon: FileText },
    { id: 'System', label: 'System', icon: Activity },
    { id: 'Insights', label: 'Insights', icon: BarChart3 },
    { id: 'Identity', label: 'Identity', icon: UserIcon },
];

export const COLOR_OPTIONS: Array<{ key: ColorKey; label: string; swatch: string }> = [
    { key: 'admin', label: 'Primary', swatch: 'bg-primary-500' },
    { key: 'super_admin', label: 'Indigo', swatch: 'bg-indigo-500' },
    { key: 'recruiter_s', label: 'Amber', swatch: 'bg-amber-500' },
    { key: 'recruiter_a', label: 'Blue', swatch: 'bg-blue-500' },
    { key: 'recruiter_jc', label: 'Rose', swatch: 'bg-rose-500' },
    { key: 'recruiter_sy', label: 'Slate', swatch: 'bg-slate-500' },
    { key: 'recruiter_interviewer', label: 'Emerald', swatch: 'bg-emerald-500' },
    { key: 'ops_validator', label: 'Purple', swatch: 'bg-purple-500' },
];

export function getEffectiveAccent(role: UserRole, override?: ColorKey): typeof ROLE_ACCENTS[UserRole] {
    const key = override ?? DEFAULT_COLORS[role] ?? 'admin';
    return ROLE_ACCENTS[key] ?? ROLE_ACCENTS.admin;
}

export const ROLE_ICON: Record<UserRole, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
    admin: Crown,
    super_admin: ShieldCheck,
    recruiter_s: ShieldCheck,
    recruiter_a: Briefcase,
    recruiter_jc: Building2,
    recruiter_sy: Building2,
    recruiter_interviewer: Users2,
    ops_validator: HardHat,
};
