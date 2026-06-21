import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '@/types';
import { apiClient } from '@/utils/apiClient';

export type AccentKey = UserRole;
type ColorKey = AccentKey;

export const DEFAULT_LABELS: Record<UserRole, string> = {
    admin: 'Administrator',
    super_admin: 'Super Admin',
    recruiter_s: 'Recruiter S!',
    recruiter_a: 'Recruiter A!',
    recruiter_jc: 'Recruiter J&C!',
    recruiter_sy: 'Recruiter SY!',
    recruiter_interviewer: 'Recruiter Interviewer',
    ops_validator: 'OPS Validator',
};

export const DEFAULT_DESCRIPTIONS: Record<UserRole, string> = {
    admin: 'Full system access including all modules and user provisioning',
    super_admin: 'Root-level system access with absolute authority',
    recruiter_s: 'Senior recruiter — can endorse and reroute across all accounts',
    recruiter_a: 'Account-tied recruiter — primary candidate owner',
    recruiter_jc: 'J&C account recruiter — specialized account pipeline',
    recruiter_sy: 'SY account recruiter — specialized account pipeline',
    recruiter_interviewer: 'Initial interview stage — screening and form submission',
    ops_validator: 'Final interview and operations validation',
};

export const ROLE_DESCRIPTIONS = DEFAULT_DESCRIPTIONS;

export const ROLE_ACCENTS: Record<UserRole, { bg: string; text: string; dot: string; border: string; chip: string; table: string; ring: string }> = {
    admin: {
        bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500',
        border: 'border-primary-200', chip: 'bg-primary-100 text-primary-700',
        table: 'text-primary-700 bg-primary-50 border-primary-200',
        ring: 'ring-primary-200'
    },
    super_admin: {
        bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500',
        border: 'border-indigo-200', chip: 'bg-indigo-100 text-indigo-700',
        table: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        ring: 'ring-indigo-200'
    },
    recruiter_s: {
        bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500',
        border: 'border-amber-200', chip: 'bg-amber-100 text-amber-700',
        table: 'text-amber-700 bg-amber-50 border-amber-200',
        ring: 'ring-amber-200'
    },
    recruiter_a: {
        bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500',
        border: 'border-blue-200', chip: 'bg-blue-100 text-blue-700',
        table: 'text-blue-700 bg-blue-50 border-blue-200',
        ring: 'ring-blue-200'
    },
    recruiter_jc: {
        bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500',
        border: 'border-rose-200', chip: 'bg-rose-100 text-rose-700',
        table: 'text-rose-700 bg-rose-50 border-rose-200',
        ring: 'ring-rose-200'
    },
    recruiter_sy: {
        bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500',
        border: 'border-indigo-200', chip: 'bg-indigo-100 text-indigo-700',
        table: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        ring: 'ring-indigo-200'
    },
    recruiter_interviewer: {
        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
        border: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-700',
        table: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        ring: 'ring-emerald-200'
    },
    ops_validator: {
        bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500',
        border: 'border-purple-200', chip: 'bg-purple-100 text-purple-700',
        table: 'text-purple-700 bg-purple-50 border-purple-200',
        ring: 'ring-purple-200'
    },
};

export const DEFAULT_COLORS: Record<UserRole, ColorKey> = {
    admin: 'admin',
    super_admin: 'super_admin',
    recruiter_s: 'recruiter_s',
    recruiter_a: 'recruiter_a',
    recruiter_jc: 'recruiter_jc',
    recruiter_sy: 'recruiter_sy',
    recruiter_interviewer: 'recruiter_interviewer',
    ops_validator: 'ops_validator',
};

export const ACCOUNT_TYPE_ORDER: UserRole[] = [
    'admin',
    'super_admin',
    'recruiter_s',
    'recruiter_a',
    'recruiter_jc',
    'recruiter_sy',
    'recruiter_interviewer',
    'ops_validator',
];

export const RECRUITER_ROLES: UserRole[] = [
    'recruiter_s', 'recruiter_a', 'recruiter_jc', 'recruiter_sy', 'recruiter_interviewer',
];

export const STORAGE_KEY = 'cp360:account-type-settings';

export type PermissionsMap = Record<UserRole, Record<string, any>>;

const PERMISSIONABLE_MODULES = [
    { id: 'dashboard' },
    { id: 'forums' },
    { id: 'calendar' },
    { id: 'application_management' },
    { id: 'interview_form' },
    { id: 'masterlist' },
    { id: 'typing_test_tracker' },
    { id: 'chr' },
    { id: 'job_postings' },
    { id: 'account_system' },
    { id: 'interview_rooms' },
    { id: 'queue_console' },
    { id: 'scheduling' },
    { id: 'mhrp_salary' },
    { id: 'mhrp_accounts' },
    { id: 'mhrp_h2r_creation' },
    { id: 'mhrp_directory' },
    { id: 'question_bank' },
    { id: 'typing_test' },
    { id: 'email_templates' },
    { id: 'active_tasks' },
    { id: 'backups' },
    { id: 'users' },
    { id: 'employee_tracker' },
    { id: 'reports' },
    { id: 'audit_logs' },
    { id: 'profile' },
];

const allTrue = (): Record<string, boolean> =>
    PERMISSIONABLE_MODULES.reduce<Record<string, boolean>>((acc, m) => {
        acc[m.id] = true;
        return acc;
    }, {});

const recruiterBase = (): Record<string, boolean> => {
    const m: Record<string, boolean> = {};
    PERMISSIONABLE_MODULES.forEach(mod => {
        m[mod.id] = ['dashboard', 'forums', 'calendar', 'application_management', 'interview_form', 'masterlist', 'typing_test_tracker', 'chr', 'job_postings', 'account_system', 'interview_rooms', 'queue_console', 'scheduling', 'question_bank', 'typing_test', 'email_templates', 'reports', 'profile'].includes(mod.id);
    });
    return m;
};

const interviewerBase = (): Record<string, boolean> => {
    const m: Record<string, boolean> = {};
    PERMISSIONABLE_MODULES.forEach(mod => {
        m[mod.id] = ['dashboard', 'forums', 'application_management', 'interview_form', 'masterlist', 'interview_rooms', 'scheduling', 'profile'].includes(mod.id);
    });
    return m;
};

const validatorBase = (): Record<string, boolean> => {
    const m: Record<string, boolean> = {};
    PERMISSIONABLE_MODULES.forEach(mod => {
        m[mod.id] = ['dashboard', 'forums', 'interview_form', 'masterlist', 'interview_rooms', 'queue_console', 'scheduling', 'reports', 'profile'].includes(mod.id);
    });
    return m;
};

export const DEFAULT_PERMISSIONS: PermissionsMap = {
    admin: allTrue(),
    super_admin: allTrue(),
    recruiter_s: recruiterBase(),
    recruiter_a: recruiterBase(),
    recruiter_jc: recruiterBase(),
    recruiter_sy: recruiterBase(),
    recruiter_interviewer: interviewerBase(),
    ops_validator: validatorBase(),
};

export interface PersistedSettings {
    permissions: PermissionsMap;
    labels: Record<string, string>;
    descriptions: Record<string, string>;
    colors: Record<string, ColorKey>;
    archived: string[];
    customRoles?: string[];
    roleTypes?: Record<string, string>;
}

export const DEFAULT_ROLE_TYPES: Record<UserRole, string> = {
    admin: 'admin',
    super_admin: 'super_admin',
    recruiter_s: 'recruiter',
    recruiter_a: 'recruiter',
    recruiter_jc: 'recruiter',
    recruiter_sy: 'recruiter',
    recruiter_interviewer: 'recruiter',
    ops_validator: 'ops_validator',
};


export function loadSettings(): PersistedSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {
                permissions: DEFAULT_PERMISSIONS,
                labels: { ...DEFAULT_LABELS },
                descriptions: { ...DEFAULT_DESCRIPTIONS },
                colors: { ...DEFAULT_COLORS },
                archived: [],
                customRoles: [],
            };
        }
        const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
        const customRoles = Array.isArray(parsed.customRoles) ? parsed.customRoles : [];
        const roleTypes = parsed.roleTypes || {};
        const merged: PermissionsMap = { ...DEFAULT_PERMISSIONS };
        
        // Merge standard roles
        (Object.keys(DEFAULT_PERMISSIONS) as UserRole[]).forEach(role => {
            merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(parsed.permissions?.[role] || {}) };
        });

        // Merge custom roles
        customRoles.forEach(role => {
            merged[role] = parsed.permissions?.[role] || {};
        });

        return {
            permissions: merged,
            labels: { ...DEFAULT_LABELS, ...(parsed.labels || {}) },
            descriptions: { ...DEFAULT_DESCRIPTIONS, ...(parsed.descriptions || {}) },
            colors: { ...DEFAULT_COLORS, ...(parsed.colors || {}) },
            archived: Array.isArray(parsed.archived) ? parsed.archived.filter(r => r !== 'admin') : [],
            customRoles,
            roleTypes,
        };
    } catch {
        return {
            permissions: DEFAULT_PERMISSIONS,
            labels: { ...DEFAULT_LABELS },
            descriptions: { ...DEFAULT_DESCRIPTIONS },
            colors: { ...DEFAULT_COLORS },
            archived: [],
            customRoles: [],
            roleTypes: {},
        };
    }
}

function readSettings(): {
    permissions: PermissionsMap;
    labels: Record<UserRole, string>;
    descriptions: Record<UserRole, string>;
    colors: Record<UserRole, ColorKey>;
    archived: Set<UserRole>;
    customRoles: string[];
    roleTypes: Record<string, string>;
} {
    const s = loadSettings();
    return {
        permissions: s.permissions,
        labels: s.labels as Record<UserRole, string>,
        descriptions: s.descriptions as Record<UserRole, string>,
        colors: s.colors as Record<UserRole, ColorKey>,
        archived: new Set(s.archived as UserRole[]),
        customRoles: s.customRoles || [],
        roleTypes: s.roleTypes || {},
    };
}

export const DEFAULT_REROUTED_ACCOUNTS = ['keller postman', 'auto approve'];

/**
 * Standalone helper to read the rerouted accounts list from persisted settings.
 * Safe to call outside React components (e.g. inside useCallback, useMemo).
 */
export function loadReroutedAccounts(): string[] {
    const s = loadSettings();
    const rsPerms = s.permissions?.recruiter_s;
    if (!rsPerms?.allow_rerouting) return [...DEFAULT_REROUTED_ACCOUNTS];
    const list = rsPerms.rerouted_accounts;
    if (Array.isArray(list) && list.length > 0) return list.map((a: string) => a.toLowerCase());
    return [...DEFAULT_REROUTED_ACCOUNTS];
}

export interface AccountTypeSettings {
    permissions: PermissionsMap;
    labels: Record<UserRole, string>;
    descriptions: Record<UserRole, string>;
    colors: Record<UserRole, ColorKey>;
    archived: Set<UserRole>;
    customRoles: string[];
    roleTypes: Record<string, string>;
    activeRoles: UserRole[];
    archivedList: UserRole[];
    getLabel: (role: UserRole) => string;
    getDescription: (role: UserRole) => string;
    getAccent: (role: UserRole) => typeof ROLE_ACCENTS[UserRole];
    getColorKey: (role: UserRole) => ColorKey;
    getRoleType: (role: UserRole) => string;
    isArchived: (role: UserRole) => boolean;
    hasPermission: (role: UserRole, moduleId: string) => boolean;
    hasPermissionForPath: (role: UserRole, path: string) => boolean;
    getReroutedAccounts: () => string[];
    refresh: () => void;
}

let hasFetched = false;

export function useAccountTypeSettings(): AccountTypeSettings {
    const [state, setState] = useState(() => readSettings());

    const refresh = useCallback(() => {
        setState(readSettings());
    }, []);

    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key === STORAGE_KEY) refresh();
        }
        function onCustom() {
            refresh();
        }
        window.addEventListener('storage', onStorage);
        window.addEventListener('cp360:account-type-settings-updated', onCustom);

        if (!hasFetched) {
            hasFetched = true;
            apiClient.get('/report-configs/account_type_settings')
                .then(res => {
                    if (res.data && res.data.config_data && Object.keys(res.data.config_data).length > 0) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.config_data));
                        refresh();
                    }
                })
                .catch(err => {
                    hasFetched = false;
                    console.error('[AccountTypeSettings] Error loading from DB, using cache:', err);
                });
        }

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('cp360:account-type-settings-updated', onCustom);
        };
    }, [refresh]);

    const getLabel = useCallback(
        (role: UserRole) => state.labels[role] || DEFAULT_LABELS[role as UserRole] || String(role),
        [state.labels]
    );
    const getDescription = useCallback(
        (role: UserRole) => state.descriptions[role] || DEFAULT_DESCRIPTIONS[role as UserRole] || '',
        [state.descriptions]
    );
    const getColorKey = useCallback(
        (role: UserRole) => state.colors[role] || DEFAULT_COLORS[role as UserRole] || 'admin',
        [state.colors]
    );
    const getAccent = useCallback(
        (role: UserRole) => ROLE_ACCENTS[getColorKey(role)] || ROLE_ACCENTS.admin,
        [getColorKey]
    );
    const getRoleType = useCallback(
        (role: UserRole) => state.roleTypes[role] || DEFAULT_ROLE_TYPES[role as UserRole] || 'recruiter',
        [state.roleTypes]
    );
    const isArchived = useCallback(
        (role: UserRole) => state.archived.has(role),
        [state.archived]
    );

    const hasPermission = useCallback(
        (role: UserRole, moduleId: string) => {
            const rolePerms = state.permissions[role];
            if (!rolePerms) return true;
            return rolePerms[moduleId] !== false;
        },
        [state.permissions]
    );

    const hasPermissionForPath = useCallback(
        (role: UserRole, path: string) => {
            const cleanPath = path.toLowerCase().trim();
            
            // Always allow auth and base routes
            if (cleanPath === '' || cleanPath === '/' || cleanPath === '/login' || cleanPath.startsWith('/profile') || cleanPath.endsWith('/profile')) {
                return true;
            }
            
            const rolePerms = state.permissions[role];
            if (!rolePerms) return true;
            
            if (cleanPath.includes('/forums')) {
                if (role === 'ops_validator' || role === 'guest_interviewer') return true;
                return rolePerms['forums'] !== false;
            }

            if (cleanPath.includes('/calendar')) {
                return rolePerms['calendar'] !== false;
            }
            
            // Mapping paths to module permission IDs
            if (cleanPath.endsWith('/dashboard')) {
                return rolePerms['dashboard'] !== false;
            }
            if (cleanPath.includes('/tracker/management') || cleanPath.includes('/applicants')) {
                return rolePerms['application_management'] !== false;
            }
            if (cleanPath.includes('/tracker/interview-form')) {
                return rolePerms['interview_form'] !== false;
            }
            if (cleanPath.includes('/tracker/masterlist')) {
                return rolePerms['masterlist'] !== false;
            }
            if (cleanPath.includes('/tracker/typing-test-tracker')) {
                return rolePerms['typing_test_tracker'] !== false;
            }
            if (cleanPath.includes('/hiring/chr')) {
                return rolePerms['chr'] !== false;
            }
            if (cleanPath.includes('/settings/job-postings') || cleanPath.includes('/positions')) {
                return rolePerms['job_postings'] !== false;
            }
            if (cleanPath.includes('/settings/accounts') || cleanPath.includes('/departments')) {
                return rolePerms['account_system'] !== false;
            }
            if (cleanPath.includes('/queue-settings')) {
                return rolePerms['active_tasks'] !== false;
            }
            if (cleanPath.includes('/interview/rooms') || cleanPath.includes('/rooms')) {
                return rolePerms['interview_rooms'] !== false;
            }
            if (cleanPath.includes('/interview/queue') || cleanPath.includes('/queue')) {
                return rolePerms['queue_console'] !== false;
            }
            if (cleanPath.includes('/interview/scheduling') || cleanPath.includes('/tracker/scheduling')) {
                return rolePerms['scheduling'] !== false;
            }
            if (cleanPath.includes('/mhrt/salary')) {
                return rolePerms['mhrp_salary'] !== false;
            }
            if (cleanPath.includes('/mhrt/accounts')) {
                return rolePerms['mhrp_accounts'] !== false;
            }
            if (cleanPath.includes('/mhrt/h2r-creation')) {
                return rolePerms['mhrp_h2r_creation'] !== false;
            }
            if (cleanPath.includes('/mhrt/directory')) {
                return rolePerms['mhrp_directory'] !== false;
            }
            if (cleanPath.includes('/settings/questions')) {
                return rolePerms['question_bank'] !== false;
            }
            if (cleanPath.includes('/settings/typing-test')) {
                return rolePerms['typing_test'] !== false;
            }
            if (cleanPath.includes('/settings/email-templates')) {
                return rolePerms['email_templates'] !== false;
            }
            if (cleanPath.includes('/backup')) {
                return rolePerms['backups'] !== false;
            }
            if (cleanPath.includes('/users')) {
                return rolePerms['users'] !== false;
            }
            if (cleanPath.includes('/employee-tracker')) {
                return rolePerms['employee_tracker'] !== false;
            }
            if (cleanPath.endsWith('/reports')) {
                return rolePerms['reports'] !== false;
            }
            if (cleanPath.endsWith('/audit')) {
                return rolePerms['audit_logs'] !== false;
            }

            return true;
        },
        [state.permissions]
    );

    const combinedRoles = [...ACCOUNT_TYPE_ORDER, ...state.customRoles];
    const activeRoles = combinedRoles.filter(r => !state.archived.has(r));
    const archivedList = combinedRoles.filter(r => state.archived.has(r));

    const getReroutedAccounts = useCallback((): string[] => {
        const rsPerms = state.permissions?.recruiter_s;
        if (!rsPerms?.allow_rerouting) return [...DEFAULT_REROUTED_ACCOUNTS];
        const list = rsPerms.rerouted_accounts;
        if (Array.isArray(list) && list.length > 0) return list.map((a: string) => a.toLowerCase());
        return [...DEFAULT_REROUTED_ACCOUNTS];
    }, [state.permissions]);

    return {
        permissions: state.permissions,
        labels: state.labels,
        descriptions: state.descriptions,
        colors: state.colors,
        archived: state.archived,
        customRoles: state.customRoles,
        roleTypes: state.roleTypes,
        activeRoles,
        archivedList,
        getLabel,
        getDescription,
        getAccent,
        getColorKey,
        getRoleType,
        isArchived,
        hasPermission,
        hasPermissionForPath,
        getReroutedAccounts,
        refresh,
    };
}

export function notifyAccountTypeSettingsChanged(): void {
    window.dispatchEvent(new CustomEvent('cp360:account-type-settings-updated'));
}
