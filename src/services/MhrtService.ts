import { apiClient } from '@/utils/apiClient';

// --- Types ---

export interface MHRTAccount {
    id: string;
    account: string;
    lob: string;
    pseudonym: string;
    position: string;
    campaignManager: string;
    teamManager: string;
    baseSalary: string;
    allowance: string;
    accountSpecificTracker: string;
    assessments: string;
    jobDescription: string;
    rosterLock: string;
    toolTesting: string;
    hoops: string;
    voiceType: string;
    direction: string;
    vertical: string;
    education: string;
    workExperience: string;
    typingSpeed: string;
    typingAccuracy: string;
    cefr: string;
    ase: string;
    ovStatus: 'Verified' | 'Pending' | 'Flagged';
    opsValidator: string;
    ovAvailability: string;
    clientAvailability: string;
    location: string;
    operationsDirector: string;
    trainer: string;
    wfmPoc: string;
    finalInterviewSchedule: string;
    mustHaves: string;
    niceToHaves: string;
    hmo: string;
    relocation: string;
    demographics: string;
    backgroundInvestigation: string;
}

export interface H2RRecord {
    id: string;
    account: string;
    lob: string;
    jobLocation: string;
    division: string;
    lineOfBusiness: string;
    department: string;
    reportsTo: string;
    training: string;
    nesting: string;
}

export interface DivisionMapping {
    id: string;
    division: string;
    assignedRoles: string;
}

export interface TimeOffMapping {
    id: string;
    locationGroup: string;
    assignedRoles: string;
}

export interface DirectoryEntry {
    id: string;
    account: string;
    name: string;
    team: string;
    distro: string;
}

// --- Service ---

export class MhrtService {
    // 1. Accounts
    static async getAccounts(): Promise<MHRTAccount[]> {
        const response = await apiClient.get('/mhrt/accounts');
        return response.data;
    }
    static async createAccount(data: Partial<MHRTAccount>): Promise<MHRTAccount> {
        const response = await apiClient.post('/mhrt/accounts', data);
        return response.data;
    }
    static async updateAccount(id: string, data: Partial<MHRTAccount>): Promise<MHRTAccount> {
        const response = await apiClient.patch(`/mhrt/accounts/${id}`, data);
        return response.data;
    }
    static async deleteAccount(id: string): Promise<void> {
        await apiClient.delete(`/mhrt/accounts/${id}`);
    }

    // 2. H2R Records
    static async getH2R(): Promise<H2RRecord[]> {
        const response = await apiClient.get('/mhrt/h2r');
        return response.data;
    }
    static async createH2R(data: Partial<H2RRecord>): Promise<H2RRecord> {
        const response = await apiClient.post('/mhrt/h2r', data);
        return response.data;
    }
    static async updateH2R(id: string, data: Partial<H2RRecord>): Promise<H2RRecord> {
        const response = await apiClient.patch(`/mhrt/h2r/${id}`, data);
        return response.data;
    }
    static async deleteH2R(id: string): Promise<void> {
        await apiClient.delete(`/mhrt/h2r/${id}`);
    }

    // 3. Divisions
    static async getDivisions(): Promise<DivisionMapping[]> {
        const response = await apiClient.get('/mhrt/divisions');
        return response.data;
    }
    static async createDivision(data: Partial<DivisionMapping>): Promise<DivisionMapping> {
        const response = await apiClient.post('/mhrt/divisions', data);
        return response.data;
    }
    static async updateDivision(id: string, data: Partial<DivisionMapping>): Promise<DivisionMapping> {
        const response = await apiClient.patch(`/mhrt/divisions/${id}`, data);
        return response.data;
    }
    static async deleteDivision(id: string): Promise<void> {
        await apiClient.delete(`/mhrt/divisions/${id}`);
    }

    // 4. Time Off
    static async getTimeOff(): Promise<TimeOffMapping[]> {
        const response = await apiClient.get('/mhrt/time-off');
        return response.data;
    }
    static async createTimeOff(data: Partial<TimeOffMapping>): Promise<TimeOffMapping> {
        const response = await apiClient.post('/mhrt/time-off', data);
        return response.data;
    }
    static async updateTimeOff(id: string, data: Partial<TimeOffMapping>): Promise<TimeOffMapping> {
        const response = await apiClient.patch(`/mhrt/time-off/${id}`, data);
        return response.data;
    }
    static async deleteTimeOff(id: string): Promise<void> {
        await apiClient.delete(`/mhrt/time-off/${id}`);
    }

    // 5. Directory
    static async getDirectory(): Promise<DirectoryEntry[]> {
        const response = await apiClient.get('/mhrt/directory');
        return response.data;
    }
    static async createDirectory(data: Partial<DirectoryEntry>): Promise<DirectoryEntry> {
        const response = await apiClient.post('/mhrt/directory', data);
        return response.data;
    }
    static async updateDirectory(id: string, data: Partial<DirectoryEntry>): Promise<DirectoryEntry> {
        const response = await apiClient.patch(`/mhrt/directory/${id}`, data);
        return response.data;
    }
    static async deleteDirectory(id: string): Promise<void> {
        await apiClient.delete(`/mhrt/directory/${id}`);
    }
}
