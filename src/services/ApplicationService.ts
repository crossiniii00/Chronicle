import { apiClient } from '@/utils/apiClient';
import type { ApplicationStatus, ApplicationUpdatePatch, PersonalInfoSheet, Application } from '@/types/application';
import type { Position } from '@/types/position';

type SubmitPersonalInfo = Omit<PersonalInfoSheet, 'id' | 'application_id'> & Partial<Pick<PersonalInfoSheet, 'id' | 'application_id'>>;

export interface SubmitApplicationPayload {
    applicant_id: string;
    applicant_name: string;
    applicant_email: string;
    position: Position;
    resume_file?: File;
    resume_name: string;
    typing_test_passed?: boolean;
    pis: SubmitPersonalInfo;
    typing_test?: {
        wpm: number;
        accuracy: number;
        duration: number;
    };
    onProgress?: (progress: number) => void;
}

const DB_NAME = 'ChronicleCacheDB';
const STORE_NAME = 'apps_store';

function openCacheDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported'));
        }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getPersistentAppsCache(): Promise<Application[] | null> {
    try {
        const db = await openCacheDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get('cached_apps');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

async function setPersistentAppsCache(apps: Application[]): Promise<void> {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(apps, 'cached_apps');
    } catch (e) {
        // ignore storage quota / error
    }
}

export class ApplicationService {
    static async submit(payload: SubmitApplicationPayload) {
        const formData = new FormData();
        formData.append('applicantName', payload.applicant_name);
        formData.append('applicantEmail', payload.applicant_email);
        formData.append('positionId', payload.position.id);
        formData.append('positionTitle', payload.position.title);
        formData.append('department', payload.position.department || '');
        formData.append('metadata', JSON.stringify(payload.pis || {}));
        if (payload.pis && payload.pis.hiring_source) {
            formData.append('hiring_source', payload.pis.hiring_source);
        }

        if (typeof payload.typing_test_passed === 'boolean') {
            formData.append('typing_test_passed', payload.typing_test_passed.toString());
        }

        if (payload.typing_test) {
            formData.append('typing_test_wpm', String(payload.typing_test.wpm ?? 0));
            formData.append('typing_test_accuracy', String(payload.typing_test.accuracy ?? 0));
            formData.append('typing_test_duration_seconds', String(payload.typing_test.duration ?? 0));
        }

        if (payload.resume_file) {
            formData.append('resume', payload.resume_file);
            formData.append('resumeName', payload.resume_name);
        }

        try {
            const response = await apiClient.post('/applications/public', formData, {
                onUploadProgress: (progressEvent) => {
                    if (payload.onProgress && progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        payload.onProgress(percentCompleted);
                    }
                },
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            return response.data;
        } catch (error: any) {
            const serverMessage = error.response?.data?.message;
            if (serverMessage) {
                error.message = serverMessage;
            }
            console.error('[Application Submit Error Details]', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    static async createInternal(payload: any) {
        const response = await apiClient.post('/applications/internal', payload);
        return response.data;
    }

    static async syncCandidateData(email: string) {
        const response = await apiClient.get(`/applications/public/by-email/${encodeURIComponent(email)}`);
        return response.data;
    }

    private static _getAllPromise: Promise<any> | null = null;
    private static _cachedAppsList: Application[] | null = null;
    private static _lastFetchTime = 0;
    private static _parsedCache: Map<string, { updated_at: string, data: Application }> = new Map();

    private static normalizeAppAccounts(app: any): any {
        const normalizeStr = (val: any): any => {
            if (Array.isArray(val)) {
                return val.map((v: any) => normalizeStr(v));
            }
            if (typeof val !== 'string' || !val) return val;
            return val.split(/[,|]/).map(part => {
                const t = part.trim().toUpperCase();
                if (t === 'DIA' || t === 'AGENT DIA' || t === 'AGENT-DIA' || t === 'AGENT - DIA') return 'AGENT - DIA';
                if (t === 'BDR' || t === 'AGENT BDR' || t === 'AGENT-BDR' || t === 'AGENT - BDR') return 'AGENT - BDR';
                return part.trim() || part;
            }).join(', ');
        };

        if (app.department) app.department = normalizeStr(app.department);
        if (app.position_title) app.position_title = normalizeStr(app.position_title);
        
        if (app.metadata?.custom_lob) {
            app.metadata.custom_lob = normalizeStr(app.metadata.custom_lob);
        }
        
        if (app.pis) {
            if (app.pis.initial_account_assignment) app.pis.initial_account_assignment = normalizeStr(app.pis.initial_account_assignment);
            if (app.pis.final_account) app.pis.final_account = normalizeStr(app.pis.final_account);
            if (app.pis.custom_lob) app.pis.custom_lob = normalizeStr(app.pis.custom_lob);
        }
        
        return app;
    }

    static clearCache() {
        this._parsedCache.clear();
        this._getAllPromise = null;
        this._cachedAppsList = null;
        this._lastFetchTime = 0;
    }

    static async getAll(forceUpdate = false): Promise<Application[]> {
        if (forceUpdate) {
            this.clearCache();
        }
        // 1. In-memory Cache hit (<0ms)
        if (this._cachedAppsList && (Date.now() - this._lastFetchTime < 300000)) {
            return [...this._cachedAppsList];
        }

        // 2. Persistent IndexedDB Cache hit (<10ms for cold startup)
        if (!this._cachedAppsList && !forceUpdate) {
            const persistentData = await getPersistentAppsCache();
            if (persistentData && persistentData.length > 0) {
                this._cachedAppsList = persistentData;
                this._lastFetchTime = Date.now();
                // Trigger background revalidation asynchronously
                this.revalidateInBackground();
                return [...this._cachedAppsList];
            }
        }

        if (this._getAllPromise) return this._getAllPromise;
        this._getAllPromise = apiClient.get('/applications').then(res => res.data).finally(() => {
            this._getAllPromise = null;
        });
        const data = await this._getAllPromise;
        
        const appsList = (data || []).map((app: any) => {
            const cached = this._parsedCache.get(app.id);
            if (cached && cached.updated_at === app.updated_at) {
                return cached.data;
            }
            
            const parsedMetadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata || '{}') : (app.metadata || {});
            const parsedPis = typeof app.pis === 'string' ? JSON.parse(app.pis || '{}') : (Object.keys(app.pis || {}).length > 0 ? app.pis : (parsedMetadata.pis || {}));
            let parsedApp = {
                ...app,
                metadata: parsedMetadata,
                pis: parsedPis,
                interview_responses: typeof app.interview_responses === 'string' ? JSON.parse(app.interview_responses || '{}') : app.interview_responses
            };
            parsedApp = this.normalizeAppAccounts(parsedApp);
            this._parsedCache.set(app.id, { updated_at: app.updated_at, data: parsedApp });
            return parsedApp;
        });

        this._cachedAppsList = appsList;
        this._lastFetchTime = Date.now();
        setPersistentAppsCache(appsList);
        return [...this._cachedAppsList!];
    }

    private static async revalidateInBackground() {
        try {
            const res = await apiClient.get('/applications');
            const data = res.data || [];
            const appsList = data.map((app: any) => {
                const cached = this._parsedCache.get(app.id);
                if (cached && cached.updated_at === app.updated_at) {
                    return cached.data;
                }
                const parsedMetadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata || '{}') : (app.metadata || {});
                const parsedPis = typeof app.pis === 'string' ? JSON.parse(app.pis || '{}') : (app.pis || parsedMetadata.pis || {});
                let parsedApp = {
                    ...app,
                    metadata: parsedMetadata,
                    pis: parsedPis,
                    interview_responses: typeof app.interview_responses === 'string' ? JSON.parse(app.interview_responses || '{}') : app.interview_responses
                };
                parsedApp = this.normalizeAppAccounts(parsedApp);
                this._parsedCache.set(app.id, { updated_at: app.updated_at, data: parsedApp });
                return parsedApp;
            });
            this._cachedAppsList = appsList;
            this._lastFetchTime = Date.now();
            setPersistentAppsCache(appsList);
        } catch (e) {
            // ignore background revalidate errors
        }
    }

    static injectDelta(appId: string, updatedApp: any) {
        const parsedMetadata = typeof updatedApp.metadata === 'string' ? JSON.parse(updatedApp.metadata || '{}') : (updatedApp.metadata || {});
        let parsedApp = {
            ...updatedApp,
            metadata: parsedMetadata,
            pis: typeof updatedApp.pis === 'string' ? JSON.parse(updatedApp.pis || '{}') : (Object.keys(updatedApp.pis || {}).length > 0 ? updatedApp.pis : (parsedMetadata.pis || {})),
            interview_responses: typeof updatedApp.interview_responses === 'string' ? JSON.parse(updatedApp.interview_responses || '{}') : updatedApp.interview_responses
        };
        parsedApp = this.normalizeAppAccounts(parsedApp);
        this._parsedCache.set(appId, { updated_at: updatedApp.updated_at, data: parsedApp });
        
        if (!this._cachedAppsList) return;
        const idx = this._cachedAppsList.findIndex(a => a.id === appId);
        if (idx >= 0) {
            this._cachedAppsList[idx] = parsedApp;
        } else {
            this._cachedAppsList.unshift(parsedApp);
        }
        setPersistentAppsCache(this._cachedAppsList || []);
    }

    static async getBadgeCounts(permissions: Record<string, any>, resolvedActiveAccount: string): Promise<{ applicationManagementCount: number, interviewDeskCount: number }> {
        const response = await apiClient.post('/applications/counts/badges', { permissions, resolvedActiveAccount });
        return response.data;
    }

    static async getById(id: string): Promise<Application | null> {
        const response = await apiClient.get(`/applications/${id}`);
        const app = response.data;
        if (!app) return null;
        
        const parsedMetadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata || '{}') : (app.metadata || {});
        let parsedApp = {
            ...app,
            metadata: parsedMetadata,
            pis: typeof app.pis === 'string' ? JSON.parse(app.pis || '{}') : (app.pis && Object.keys(app.pis).length > 0 ? app.pis : (parsedMetadata.pis || {})),
            interview_responses: typeof app.interview_responses === 'string' ? JSON.parse(app.interview_responses || '{}') : app.interview_responses
        };
        return this.normalizeAppAccounts(parsedApp);
    }

    static async getByIds(ids: string[]): Promise<Application[]> {
        const response = await apiClient.post('/applications/bulk-get', { ids });
        return response.data.map((app: any) => {
            const parsedMetadata = typeof app.metadata === 'string' ? JSON.parse(app.metadata || '{}') : (app.metadata || {});
            let parsedApp = {
                ...app,
                metadata: parsedMetadata,
                pis: typeof app.pis === 'string' ? JSON.parse(app.pis || '{}') : (Object.keys(app.pis || {}).length > 0 ? app.pis : (parsedMetadata.pis || {})),
                interview_responses: typeof app.interview_responses === 'string' ? JSON.parse(app.interview_responses || '{}') : app.interview_responses
            };
            return this.normalizeAppAccounts(parsedApp);
        });
    }

    static async getPublicById(id: string): Promise<Application> {
        const response = await apiClient.get(`/applications/public/${id}`);
        return response.data;
    }

    static async patchPublicOnCall(id: string, payload: SubmitApplicationPayload) {
        const formData = new FormData();
        formData.append('applicantName', payload.applicant_name);
        formData.append('applicantEmail', payload.applicant_email);
        formData.append('positionId', payload.position.id);
        formData.append('positionTitle', payload.position.title);
        formData.append('department', payload.position.department || '');
        formData.append('metadata', JSON.stringify(payload.pis || {}));
        if (payload.pis && payload.pis.hiring_source) {
            formData.append('hiring_source', payload.pis.hiring_source);
        }

        if (typeof payload.typing_test_passed === 'boolean') {
            formData.append('typing_test_passed', payload.typing_test_passed.toString());
        }

        if (payload.typing_test) {
            formData.append('typing_test_wpm', String(payload.typing_test.wpm ?? 0));
            formData.append('typing_test_accuracy', String(payload.typing_test.accuracy ?? 0));
            formData.append('typing_test_duration_seconds', String(payload.typing_test.duration ?? 0));
        }

        if (payload.resume_file) {
            formData.append('resume', payload.resume_file);
            formData.append('resumeName', payload.resume_name);
        }

        const response = await apiClient.patch(`/applications/public/${id}`, formData, {
            onUploadProgress: (progressEvent) => {
                if (payload.onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    payload.onProgress(percentCompleted);
                }
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    }

    static async updateStatus(payload: {
        id: string;
        fromStatus?: string;
        toStatus: ApplicationStatus;
        changedByName: string;
        reason?: string;
        patch?: ApplicationUpdatePatch;
    }) {
        const response = await apiClient.patch(`/applications/${payload.id}/status`, {
            toStatus: payload.toStatus,
            reason: payload.reason,
            patch: payload.patch
        });
        this._getAllPromise = null;
        return response.data;
    }

    private static patchQueue: Record<string, Promise<any>> = {};
    private static activePatches: Record<string, number> = {};
    private static batchTimers: Record<string, ReturnType<typeof setTimeout>> = {};
    private static batchedPatches: Record<string, any> = {};
    private static batchResolvers: Record<string, Array<{resolve: Function, reject: Function}>> = {};

    static isPatching(id: string): boolean {
        return (this.activePatches[id] || 0) > 0;
    }

    static async patch(id: string, patch: ApplicationUpdatePatch) {
        const patchObj: any = { ...patch };
        const accountVal = patchObj.department || patchObj.endorsement_account;
        if (accountVal && typeof accountVal === 'string') {
            patchObj.department = accountVal;
            patchObj.endorsement_account = accountVal;
            if (!patchObj.pis || typeof patchObj.pis !== 'object') {
                patchObj.pis = {};
            }
            patchObj.pis = {
                ...patchObj.pis,
                final_account: accountVal,
                initial_account_assignment: accountVal
            };
        }

        return new Promise<any>((resolve, reject) => {
            if (!this.batchedPatches[id]) {
                this.batchedPatches[id] = {};
                this.batchResolvers[id] = [];
                // Mark as patching immediately to protect unsent batched edits from incoming socket overwrites
                this.activePatches[id] = (this.activePatches[id] || 0) + 1;
            }

            // Deep merge up to 1 level (sufficient for `pis` and `metadata`)
            for (const key of Object.keys(patchObj)) {
                if (patchObj[key] !== null && typeof patchObj[key] === 'object' && !Array.isArray(patchObj[key])) {
                    this.batchedPatches[id][key] = {
                        ...(this.batchedPatches[id][key] || {}),
                        ...patchObj[key]
                    };
                } else {
                    this.batchedPatches[id][key] = patchObj[key];
                }
            }

            this.batchResolvers[id].push({ resolve, reject });

            if (this.batchTimers[id]) {
                clearTimeout(this.batchTimers[id]);
            }

            this.batchTimers[id] = setTimeout(() => {
                const currentPatch = this.batchedPatches[id];
                const currentResolvers = this.batchResolvers[id];
                
                delete this.batchedPatches[id];
                delete this.batchResolvers[id];
                delete this.batchTimers[id];

                const executePatch = async () => {
                    const response = await apiClient.patch(`/applications/${id}`, currentPatch);
                    if (response.data) {
                        this.injectDelta(id, response.data);
                    }
                    return response.data;
                };

                const prevPromise = this.patchQueue[id] || Promise.resolve();
                const nextPromise = prevPromise.then(executePatch)
                    .then(data => {
                        this.activePatches[id] = Math.max(0, (this.activePatches[id] || 0) - 1);
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('applications:local_update', { detail: { applicationId: id, data } }));
                        }
                        currentResolvers.forEach(r => r.resolve(data));
                    })
                    .catch(err => {
                        this.activePatches[id] = Math.max(0, (this.activePatches[id] || 0) - 1);
                        currentResolvers.forEach(r => r.reject(err));
                    });
                
                this.patchQueue[id] = nextPromise;
            }, 400); // 400ms debounce
        });
    }

    static async updateApplication(id: string, patch: ApplicationUpdatePatch) {
        return this.patch(id, patch);
    }

    static async update(id: string, patch: ApplicationUpdatePatch) {
        return this.patch(id, patch);
    }

    static removeCachedApplication(id: string) {
        this._parsedCache.delete(id);
        if (this._cachedAppsList) {
            this._cachedAppsList = this._cachedAppsList.filter(a => a.id !== id);
            setPersistentAppsCache(this._cachedAppsList);
        }
    }

    static async delete(id: string) {
        await apiClient.delete(`/applications/${id}`);
        this.removeCachedApplication(id);
        this._getAllPromise = null;
    }

    static async submitTypingTest(applicationId: string, result: {
        promptText: string;
        typedText: string;
        durationSeconds: number;
    }) {
        const response = await apiClient.post(`/applications/${applicationId}/typing-test`, result);
        return response.data;
    }

    static async getStatusHistory(applicationId: string) {
        const response = await apiClient.get(`/applications/${applicationId}/status-history`);
        return response.data;
    }

    static async getTypingTestResults(applicationId: string) {
        const response = await apiClient.get(`/applications/${applicationId}/typing-tests`);
        return response.data;
    }

    static async getAllStatusHistory() {
        const response = await apiClient.get('/applications/all/status-history');
        return response.data;
    }

    static async assignQueueNumber(
        applicationId: string,
        applicantName: string,
        applicantUserId: string,
        queueType: 'INITIAL' | 'FINAL' = 'INITIAL',
        interviewerId?: string,
        interviewerName?: string,
        queuePrefix?: string
    ) {
        const response = await apiClient.post(`/applications/${applicationId}/queue`, {
            queueType,
            queuePrefix,
            interviewerId,
            interviewerName
        });
        return response.data;
    }

    static async bulkCreate(records: Partial<Application>[]) {
        const response = await apiClient.post('/applications/bulk', records);
        return response.data;
    }

    static async bulkDelete(ids: string[]) {
        await apiClient.post('/applications/bulk-delete', { ids });
        ids.forEach(id => this.removeCachedApplication(id));
    }

    static async bulkPatch(ids: string[], fields: Partial<Application>) {
        await apiClient.patch('/applications/bulk-patch', { ids, fields });
    }
}
