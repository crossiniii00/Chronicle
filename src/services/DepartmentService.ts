import { apiClient } from '@/utils/apiClient';

export const KNOWN_ACCOUNTS = [
    'KELLER POSTMAN', 'AUTO APPROVE', 'DOORDASH', 'TENNIS CHANNEL',
    'THE SAVINGS GROUP', 'ENERCARE', 'WORKX', 'PRIORITY'
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
}

export class DepartmentService {
    static async getAll(): Promise<Department[]> {
        const response = await apiClient.get('/departments');
        return response.data;
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
