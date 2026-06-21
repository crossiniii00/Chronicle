import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveAccountStore {
    activeAccount: string | null;
    setActiveAccount: (account: string) => void;
}

/**
 * Store to track which account an ops-validator with multi-account assignment
 * is currently viewing. Persisted to localStorage so the selection survives
 * page refreshes and navigations.
 */
export const useActiveAccountStore = create<ActiveAccountStore>()(
    persist(
        (set) => ({
            activeAccount: null,
            setActiveAccount: (account: string) => set({ activeAccount: account }),
        }),
        {
            name: 'rms-active-account',
        }
    )
);

/**
 * Utility: parse the comma-separated department string into an array of trimmed
 * account names. Returns `['ALL']` if the input is falsy.
 */
export function parseAccounts(department: string | undefined | null): string[] {
    if (!department) return [];
    return department.split(',').map(d => d.trim()).filter(Boolean);
}
