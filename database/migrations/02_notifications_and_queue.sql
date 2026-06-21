-- Migration: Add notifications and queue tables
-- These are required by the new NotificationService and QueueService API routes.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'system_announcement',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    queue_number INTEGER NOT NULL,
    queue_type TEXT NOT NULL DEFAULT 'INITIAL',
    status TEXT NOT NULL DEFAULT 'WAITING',
    interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    interviewer_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_created ON queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
