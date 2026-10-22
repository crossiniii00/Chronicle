import { apiClient } from '@/utils/apiClient';

export const KNOWN_ACCOUNTS = [
    'NVIDIA', 'AMD', 'MICROSOFT', 'APPLE', 'AMAZON', 'GOOGLE',
    'AUTO APPROVE', 'ENERCARE'
];

export interface Department {
    id: string;
    name: string;
    head?: string;
    budgetCode?: string;
    accountImageUrl?: string | null;
    accountImageData?: string | null;
    hiring_quota?: number;
    created_at: string;
    type?: string;
    eligibilitySettings?: {
        required: string[];
        optional: string[];
        standardSettings?: Record<string, string>;
        activeStandards?: string[];
        processOrder?: string[];
        requiredProcesses?: string[];
        customRules?: {
            id: string;
            source: 'masterlist' | 'interview';
            columnLabel: string;
            columnField: string;
            columnSubField?: string;
            matchingType: 'dropdown' | 'content' | 'na';
            matchingValue: string;
            type: 'required' | 'optional';
        }[];
    };
    subAccounts?: {
        id: string;
        name: string;
        description?: string;
    }[];
}

export class DepartmentService {
    static async getAll(): Promise<Department[]> {
        const response = await apiClient.get('/departments');
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
        
        return response.data.map((dept: any) => {
            if (dept.name) dept.name = normalizeStr(dept.name);
            let subAccs = typeof dept.subAccounts === 'string' ? JSON.parse(dept.subAccounts || '[]') : dept.subAccounts;
            if (!subAccs) subAccs = typeof dept.sub_accounts === 'string' ? JSON.parse(dept.sub_accounts || '[]') : dept.sub_accounts;
            
            if (Array.isArray(subAccs)) {
                const uniqueNames = new Set();
                subAccs = subAccs.reduce((acc: any[], sa: any) => {
                    const normalizedName = normalizeStr(sa.name);
                    if (!uniqueNames.has(normalizedName)) {
                        uniqueNames.add(normalizedName);
                        acc.push({ ...sa, name: normalizedName });
                    }
                    return acc;
                }, []);
                dept.subAccounts = subAccs;
                dept.sub_accounts = subAccs;
            }
            return dept;
        });
    }

    static async add(data: Partial<Department>): Promise<Department> {
        const response = await apiClient.post('/departments', data);
        return response.data;
    }

    static async update(id: string, patch: Partial<Department>): Promise<Department> {
        const response = await apiClient.patch(`/departments/${id}`, patch);
        return response.data;
    }

    static async uploadImage(id: string, image: File): Promise<Department> {
        const formData = new FormData();
        formData.append('image', image);
        const response = await apiClient.post(`/departments/${id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }

    static async delete(id: string): Promise<void> {
        await apiClient.delete(`/departments/${id}`);
    }
}
