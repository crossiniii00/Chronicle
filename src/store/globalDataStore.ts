import { create } from 'zustand';
import { ApplicationService } from '@/services/ApplicationService';
import { PositionService } from '@/services/PositionService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { MhrtService } from '@/services/MhrtService';
import { socketService } from '@/services/socketService';

import type { Application } from '@/types/application';
import type { Position } from '@/types/position';
import type { User } from '@/types/user';

export interface GlobalDataState {
    applications: Application[];
    positions: Position[];
    departments: Department[];
    users: User[];
    mhrtAccounts: any[];
    isInitialized: boolean;
    isLoading: boolean;
    applicationsLastUpdate: number;
    
    initializeData: () => Promise<void>;
    refreshData: () => Promise<void>;
    updateApplicationLocally: (appId: string, updates: Partial<Application>) => void;
    addApplicationLocally: (app: Application) => void;
    setApplications: (updater: Application[] | ((prev: Application[]) => Application[])) => void;
    setupSocketListeners: () => void;
}

export const useGlobalDataStore = create<GlobalDataState>((set, get) => ({
    applications: [],
    positions: [],
    departments: [],
    users: [],
    mhrtAccounts: [],
    isInitialized: false,
    isLoading: false,
    applicationsLastUpdate: Date.now(),

    initializeData: async () => {
        if (get().isInitialized || get().isLoading) return;
        set({ isLoading: true });
        try {
            const [apps, positions, depts, users, mhrt] = await Promise.all([
                ApplicationService.getAll(),
                PositionService.getAll(),
                DepartmentService.getAll(),
                UserService.getAll(),
                MhrtService.getAccounts()
            ]);

            // Deduplicate apps exactly as useApplicantManagement does
            const uniqueMap = new Map<string, Application>();
            (apps as Application[]).forEach(app => {
                const emailKey = (app.applicant_email || (app.pis as any)?.email || '').trim().toLowerCase();
                const nameKey = (app.applicant_name || `${(app as any).first_name || ''} ${(app as any).last_name || ''}`).trim().toLowerCase().replace(/\s+/g, ' ');
                const key = emailKey || nameKey || app.id;

                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, { ...app });
                } else {
                    const existing = uniqueMap.get(key)!;
                    const existingFailed = (existing.metadata?.failed_accounts || []).map((f: any) => String(f).trim().toLowerCase());
                    const appFailed = (app.metadata?.failed_accounts || []).map((f: any) => String(f).trim().toLowerCase());

                    const mergedFailedSet = new Set<string>([
                        ...existingFailed,
                        ...appFailed,
                        ...(existing.current_status === 'FAILED' && existing.department ? [existing.department.trim().toLowerCase()] : []),
                        ...(app.current_status === 'FAILED' && app.department ? [app.department.trim().toLowerCase()] : [])
                    ]);
                    
                    if (existing.current_status === 'FAILED' && app.current_status !== 'FAILED') {
                        existing.current_status = app.current_status;
                        existing.department = app.department;
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    } else if (app.current_status === 'FAILED' && existing.current_status !== 'FAILED') {
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    } else {
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    }
                }
            });

            set({
                applications: Array.from(uniqueMap.values()),
                positions: positions || [],
                departments: depts || [],
                users: users || [],
                mhrtAccounts: mhrt || [],
                isInitialized: true,
                applicationsLastUpdate: Date.now()
            });
        } catch (error) {
            console.error('Failed to initialize global data store:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    refreshData: async () => {
        set({ isLoading: true });
        try {
            const [apps, positions, depts, users, mhrt] = await Promise.all([
                ApplicationService.getAll(),
                PositionService.getAll(),
                DepartmentService.getAll(),
                UserService.getAll(),
                MhrtService.getAccounts()
            ]);

            const uniqueMap = new Map<string, Application>();
            (apps as Application[]).forEach(app => {
                const emailKey = (app.applicant_email || (app.pis as any)?.email || '').trim().toLowerCase();
                const nameKey = (app.applicant_name || `${(app as any).first_name || ''} ${(app as any).last_name || ''}`).trim().toLowerCase().replace(/\s+/g, ' ');
                const key = emailKey || nameKey || app.id;

                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, { ...app });
                } else {
                    const existing = uniqueMap.get(key)!;
                    const existingFailed = (existing.metadata?.failed_accounts || []).map((f: any) => String(f).trim().toLowerCase());
                    const appFailed = (app.metadata?.failed_accounts || []).map((f: any) => String(f).trim().toLowerCase());

                    const mergedFailedSet = new Set<string>([
                        ...existingFailed,
                        ...appFailed,
                        ...(existing.current_status === 'FAILED' && existing.department ? [existing.department.trim().toLowerCase()] : []),
                        ...(app.current_status === 'FAILED' && app.department ? [app.department.trim().toLowerCase()] : [])
                    ]);
                    
                    if (existing.current_status === 'FAILED' && app.current_status !== 'FAILED') {
                        existing.current_status = app.current_status;
                        existing.department = app.department;
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    } else if (app.current_status === 'FAILED' && existing.current_status !== 'FAILED') {
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    } else {
                        existing.metadata = {
                            ...existing.metadata,
                            ...app.metadata,
                            failed_accounts: Array.from(mergedFailedSet)
                        };
                    }
                }
            });

            set({
                applications: Array.from(uniqueMap.values()),
                positions: positions || [],
                departments: depts || [],
                users: users || [],
                mhrtAccounts: mhrt || [],
                applicationsLastUpdate: Date.now()
            });
        } catch (error) {
            console.error('Failed to refresh global data store:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateApplicationLocally: (appId: string, updates: Partial<Application>) => {
        set((state) => ({
            applications: state.applications.map(app => 
                app.id === appId ? { ...app, ...updates } : app
            )
        }));
    },

    addApplicationLocally: (app: Application) => {
        set((state) => ({
            applications: [app, ...state.applications]
        }));
    },

    setApplications: (updater) => {
        set((state) => ({
            applications: typeof updater === 'function' ? updater(state.applications) : updater
        }));
    },

    setupSocketListeners: () => {
        const socket = socketService.getSocket();
        
        // Remove existing listener to prevent duplicates
        socket.off('applications:updated');
        
        let timeoutId: any;
        const pendingUpdates = new Set<string>();
        let wantsFullLoad = false;

        const handleUpdate = () => {
            clearTimeout(timeoutId);
            const jitter = 50; // Use small jitter to batch rapid events
            timeoutId = setTimeout(async () => {
                const ids = Array.from(pendingUpdates);
                pendingUpdates.clear();

                if (wantsFullLoad) {
                    wantsFullLoad = false;
                    console.log('[Global Socket] Applications updated, triggering full refresh...');
                    get().refreshData();
                    return;
                }

                if (ids.length > 0) {
                    try {
                        console.log(`[Global Socket] Batch fetching ${ids.length} updated applications...`);
                        const updatedApps = await ApplicationService.getByIds(ids);
                        get().setApplications(prev => {
                            const copy = [...prev];
                            let changed = false;
                            updatedApps.forEach((app: Application) => {
                                const index = copy.findIndex(a => a.id === app.id);
                                if (index > -1) {
                                    copy[index] = app;
                                    changed = true;
                                } else {
                                    copy.push(app);
                                    changed = true;
                                }
                            });
                            return changed ? copy : prev;
                        });
                        set({ applicationsLastUpdate: Date.now() });
                    } catch (e) {
                        console.error('[Global Socket] Batch update failed, falling back to full load', e);
                        get().refreshData();
                    }
                }
            }, jitter);
        };

        socket.on('applications:updated', (payload?: { applicationId?: string, data?: any, deleted?: boolean }) => {
            if (payload?.deleted && payload.applicationId) {
                console.log(`[Global Socket] Application ${payload.applicationId} deleted.`);
                ApplicationService.removeCachedApplication(payload.applicationId);
                get().setApplications(prev => prev.filter(a => a.id !== payload.applicationId));
                set({ applicationsLastUpdate: Date.now() });
            } else if (payload?.data && payload.applicationId) {
                console.log(`[Global Socket] Application ${payload.applicationId} delta received.`);
                ApplicationService.injectDelta(payload.applicationId, payload.data);
                get().setApplications(prev => {
                    const exists = prev.some(a => a.id === payload.applicationId);
                    if (exists) {
                        return prev.map(a => a.id === payload.applicationId ? { ...a, ...payload.data } : a);
                    } else {
                        return [payload.data, ...prev];
                    }
                });
                set({ applicationsLastUpdate: Date.now() });
            } else if (payload?.applicationId) {
                console.log(`[Global Socket] Application ${payload.applicationId} updated, queuing fetch.`);
                pendingUpdates.add(payload.applicationId);
                handleUpdate();
            } else {
                console.log(`[Global Socket] Global applications update received, queuing full fetch.`);
                wantsFullLoad = true;
                handleUpdate();
            }
        });
    }
}));
