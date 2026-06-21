import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { query } from '../db.js';

class EmailService {
    constructor() {
        this.transporter = null;
    }

    async getTransporter() {
        try {
            const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'smtp_settings'");
            const dbConfig = configRes.rows[0]?.config_data;

            if (dbConfig && dbConfig.host) {
                return nodemailer.createTransport({
                    host: dbConfig.host,
                    port: parseInt(dbConfig.port, 10) || 587,
                    secure: dbConfig.secure === true,
                    auth: {
                        user: dbConfig.user,
                        pass: dbConfig.pass,
                    },
                });
            }
        } catch (e) {
            console.error('[EmailService] Failed to load DB SMTP config:', e.message);
        }

        if (config.smtp && config.smtp.host) {
            return nodemailer.createTransport({
                host: config.smtp.host,
                port: config.smtp.port,
                secure: config.smtp.secure,
                auth: {
                    user: config.smtp.user,
                    pass: config.smtp.pass,
                },
            });
        }

        return null;
    }

    async sendEmail({ to, subject, html, text, attachments }) {
        const transporter = await this.getTransporter();
        if (!transporter) {
            console.log('--- MOCK EMAIL START ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Body:', html || text);
            console.log('--- MOCK EMAIL END ---');
            return { messageId: 'mock-id' };
        }

        let fromName = 'Recruitment360';
        let fromEmail = 'noreply@company.com';

        try {
            const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'smtp_settings'");
            const dbConfig = configRes.rows[0]?.config_data;
            if (dbConfig) {
                fromName = dbConfig.fromName || fromName;
                fromEmail = dbConfig.fromEmail || dbConfig.user || fromEmail;
            } else if (config.smtp) {
                fromName = config.smtp.fromName || fromName;
                fromEmail = config.smtp.fromEmail || fromEmail;
            }
        } catch (e) {
            // ignore
        }

        const fromHeader = `"${fromName}" <${fromEmail}>`;

        try {
            const info = await transporter.sendMail({
                from: fromHeader,
                to,
                subject,
                text,
                html,
                attachments,
            });
            console.log(`[EmailService] Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            throw error;
        }
    }

    /**
     * Parse template with dynamic data
     * @param {string} content 
     * @param {Object} data 
     * @returns {string}
     */
    parseTemplate(content, data) {
        let parsed = content;
        Object.entries(data).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            parsed = parsed.replace(regex, value || '');
        });
        return parsed;
    }

    async sendAutomatedEmail(applicant, template, customData = {}) {
        const data = {
            candidate_name: applicant.applicant_name,
            position_title: applicant.position_title,
            department: applicant.department,
            date: new Date().toLocaleDateString(),
            ...customData
        };

        const parsedSubject = this.parseTemplate(template.subject, data);
        const parsedBody = this.parseTemplate(template.body, data);

        return this.sendEmail({
            to: applicant.applicant_email,
            subject: parsedSubject,
            html: parsedBody.includes('<') ? parsedBody : undefined,
            text: !parsedBody.includes('<') ? parsedBody : undefined,
            attachments: template.attachment_path ? [
                {
                    filename: template.attachment_name || 'attachment',
                    path: template.attachment_path
                }
            ] : undefined
        });
    }
}

export const emailService = new EmailService();
