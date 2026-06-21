-- Table: email_templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('REJECTION_INITIAL', 'REJECTION_FINAL', 'INTERVIEW_INVITE', 'OFFER', 'OTHER')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed defaults
INSERT INTO email_templates (name, subject, body, type)
VALUES 
('Standard Initial Rejection', 'Application Update: {{position_title}}', 'Hi {{candidate_name}},\n\nThank you for your interest in the {{position_title}} position at ContactPoint. After careful consideration, we will not be moving forward with your application at this time.\n\nReason: {{reason}}\n\nBest regards,\nRecruitment Team', 'REJECTION_INITIAL'),
('Standard Final Rejection', 'Final Verdict: {{position_title}}', 'Hi {{candidate_name}},\n\nThank you for completing the final interview for {{position_title}}. Unfortunately, we have decided to move forward with other candidates.\n\nReason: {{reason}}\n\nWe wish you the best in your job search.', 'REJECTION_FINAL')
ON CONFLICT DO NOTHING;
