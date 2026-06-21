import { apiClient } from '@/utils/apiClient';
import { Application, EmailTemplate } from '@/types';

export const sendEmailViaBackend = async (
    type: string, 
    app: Application, 
    subject: string, 
    body: string, 
    templates: EmailTemplate[],
    schedule?: string
): Promise<boolean> => {
    try {
        const template = templates.find(t => t.isActive && t.type === type);
        
        // Replace placeholders in subject and body
        const processText = (text: string) => {
            if (!text) return '';
            return text
                .replace(/{{candidate_name}}/g, app.applicant_name)
                .replace(/{{position_title}}/g, app.position_title || '')
                .replace(/{{department}}/g, app.department || '')
                .replace(/{{schedule}}/g, schedule || '')
                .replace(/{{date}}/g, new Date().toLocaleDateString());
        };

        const finalSubject = processText(subject || template?.subject || '');
        const finalBody = processText(body || template?.body || '');

        await apiClient.post('/email-templates/send', {
            to: app.pis?.email || app.applicant_email,
            subject: finalSubject,
            body: finalBody,
            templateId: template?.id,
            applicationId: app.id
        });

        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
};
