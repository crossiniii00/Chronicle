import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Required for cookie-based sessions
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
        if (error.response?.status === 401) {
            const { isAuthenticated, logout } = useAuthStore.getState();
            if (isAuthenticated) {
                logout();
                if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                    window.location.assign('/login');
                }
            }
        }
        return Promise.reject(error);
    }
);
