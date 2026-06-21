export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'SERVED' | 'DELETED';

export interface QueueEntry {
    id: string;
    application_id: string;
    applicant_name: string;
    queue_number: number;
    queue_date: string;
    status: QueueStatus;
    queue_type: 'INITIAL' | 'FINAL';
    assigned_at: string;
    called_at?: string;
    called_by_name?: string;
    completed_at?: string;
    assigned_room_id?: string;
    assigned_room_name?: string;
    assigned_interviewer_id?: string;
    assigned_interviewer_name?: string;
    application_status?: string;
}

export interface QueueCallout {
    id: string;
    application_id: string;
    queue_number: number;
    applicant_name: string;
    room: string;
    timestamp: string;
    queue_type: 'INITIAL' | 'FINAL';
    assigned_interviewer_id?: string;
    assigned_interviewer_name?: string;
}

export interface QueueState {
    waiting: QueueEntry[];
    current_call: QueueCallout | null;
    history: QueueCallout[];
}
