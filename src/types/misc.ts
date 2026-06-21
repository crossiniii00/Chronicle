export type NotificationType =
    | 'queue_assigned'
    | 'interview_call'
    | 'status_change'
    | 'recruiter_message'
    | 'final_interview_scheduled'
    | 'hiring_decision'
    | 'missing_documents'
    | 'new_application'
    | 'position_closed'
    | 'request_accepted'
    | 'system_announcement';

export interface Notification {
    id: string;
    user_id: string;
    notification_type: NotificationType;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    read_at?: string;
}

export interface AuditLog {
    id: string;
    user_id?: string;
    user_name?: string;
    user_role?: string;
    user_avatar?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    ip_address?: string;
    details?: Record<string, unknown>;
    success: boolean;
    created_at: string;
}

export interface InterviewQuestion {
    id: string;
    question_type: 'initial' | 'final' | 'technical' | 'behavioral';
    question_text: string;
    answer_type: 'text' | 'rating' | 'multiple_choice' | 'yes_no' | 'date';
    options?: string[];
    max_rating?: number;
    max_length?: number;
    is_required: boolean;
    question_order: number;
    is_active: boolean;
    category?: string;
    instructions?: string;
}

export interface InterviewRoom {
    id: string;
    room_number: string;
    room_name?: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'INACTIVE';
    current_application_id?: string | null;
    current_applicant_name?: string | null;
    occupied_since?: string | null;
    is_active: boolean;
    image_url?: string | null;
    room_type?: 'onsite' | 'online';
}

export interface SystemSetting {
    id: string;
    setting_key: string;
    setting_value: string;
    setting_type: 'string' | 'number' | 'boolean' | 'json';
    description: string;
}
