export type UserRole = 
    | 'recruiter_a' 
    | 'recruiter_jc' 
    | 'recruiter_sy' 
    | 'recruiter_interviewer' 
    | 'ops_validator' 
    | 'admin'
    | 'super_admin'
    | 'recruiter_supervisor'
    | (string & {});

export interface User {
    id: string;
    full_name: string;
    email: string;
    password?: string;
    password_plain?: string;
    phone?: string;
    role: UserRole;
    department?: string;
    sector?: string;
    is_active: boolean;
    created_at: string;
    last_login?: string;
    failed_login_attempts: number;
    account_locked_until?: string;
    email_verified: boolean;
    avatar_data?: string | null;
    cover_data?: string | null;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface AuthState {
    user: User | null;
    tokens: AuthTokens | null;
    isAuthenticated: boolean;
    loading: boolean;
}
