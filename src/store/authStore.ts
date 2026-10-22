import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';
import { apiClient } from '@/utils/apiClient';

const getAuthErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Login failed.';
};

interface AuthStore {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    sessionExpiry: number | null;

    login: (email: string, password: string) => Promise<{ success: boolean; message: string; remainingAttempts?: number; lockedMinutes?: number }>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    resetSessionTimer: () => void;
    checkSessionExpiry: () => boolean;

    // Global toggle for Recruiter S account filtering
    isAccountFilterEnabled: boolean;
    setIsAccountFilterEnabled: (enabled: boolean) => void;
}

const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            loading: false,
            sessionExpiry: null,
            isAccountFilterEnabled: true,

            login: async (email: string, password: string) => {
                set({ loading: true });
                try {
                    const response = await apiClient.post('/auth/login', {
                        email: email.trim(),
                        password
                    });

                    const { user } = response.data;

                    set({
                        user,
                        isAuthenticated: true,
                        loading: false,
                        sessionExpiry: Date.now() + SESSION_MS,
                    });

                    console.log(`[AuthStore] Login successful for ${user.email}`);
                    return { success: true, message: 'Login successful.' };
                } catch (e: any) {
                    set({ loading: true });
                    const message = e.response?.data?.message || getAuthErrorMessage(e);

                    // Specific handling for locked or missing accounts if the backend returns them
                    return {
                        success: false,
                        message,
                        remainingAttempts: e.response?.data?.remainingAttempts,
                        lockedMinutes: e.response?.data?.lockedMinutes
                    };
                } finally {
                    set({ loading: false });
                }
            },

            logout: () => {
                try {
                    localStorage.removeItem('ai_chatbot_history_v1');
                } catch {
                    // localStorage may be unavailable; non-fatal
                }
                set({ user: null, accessToken: null, isAuthenticated: false, sessionExpiry: null });
            },

            refreshProfile: async () => {
                try {
                    const response = await apiClient.get('/auth/me');
                    if (response.data.user) {
                        set({ user: response.data.user });
                        get().resetSessionTimer();
                    }
                } catch (error) {
                    console.error('[AuthStore] Failed to refresh profile:', error);
                }
            },

            resetSessionTimer: () => {
                if (get().isAuthenticated) {
                    set({ sessionExpiry: Date.now() + SESSION_MS });
                }
            },

            checkSessionExpiry: () => {
                const { sessionExpiry, logout } = get();
                if (sessionExpiry && Date.now() > sessionExpiry) {
                    logout();
                    return true;
                }
                return false;
            },

            setIsAccountFilterEnabled: (enabled: boolean) => {
                set({ isAccountFilterEnabled: enabled });
            },
        }),
        {
            name: 'rms-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                isAuthenticated: state.isAuthenticated,
                sessionExpiry: state.sessionExpiry,
                isAccountFilterEnabled: state.isAccountFilterEnabled,
            }),
        }
    )
);

export const getCurrentUser = () => useAuthStore.getState().user;
export const getRole = (): UserRole | null => useAuthStore.getState().user?.role ?? null;
