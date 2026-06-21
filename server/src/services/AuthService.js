import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository.js';
import { writeAuditLog } from '../middleware/audit.js';
import { query } from '../db.js';
import { emailService } from './email.service.js';

export class AuthService {
    static async login(email, password, ip, userAgent) {
        try {
            const user = await UserRepository.findByEmail(email);
            if (!user || !user.is_active) {
                console.warn(`[Auth] User not found or inactive: ${email}`);
                throw new Error('Invalid credentials');
            }

            const matches = await bcrypt.compare(password, user.password_hash);
            if (!matches) {
                console.warn(`[Auth] Failed login attempt for ${email}: Incorrect password`);
                throw new Error('Invalid credentials');
            }

            if (!user.password_plain || user.password_plain !== password) {
                await UserRepository.update(user.id, { password_plain: password });
                user.password_plain = password;
            }

            await writeAuditLog({
                userId: user.id,
                action: 'auth.login',
                resourceType: 'user',
                resourceId: user.id,
                ipAddress: ip,
                userAgent: userAgent,
            });

            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                avatar_data: user.avatar_data || null,
                cover_data: user.cover_data || null,
                password_plain: user.password_plain || null
            };
        } catch (error) {
            console.error('[AuthService.login Error]', error);
            throw error;
        }
    }

    static async provisionUser(payload) {
        try {
            const passwordHash = await bcrypt.hash(payload.password, 10);
            
            const newUser = await UserRepository.create({
                full_name: payload.full_name,
                email: payload.email,
                role: payload.role,
                password_hash: passwordHash,
                password_plain: payload.password,
                department: payload.department || null,
                avatar_data: payload.avatar_data || null
            });

            console.log(`[AuthService] Identity provisioned for ${payload.email} (${payload.role})`);

            // Trigger Welcome Email (Fire and forget)
            this.sendWelcomeEmail(newUser).catch(err => {
                console.error('[AuthService] Welcome Email Error:', err.message);
            });

            return newUser;
        } catch (error) {
            console.error('[AuthService] Provisioning Error:', error);
            throw error;
        }
    }

    static async sendWelcomeEmail(user) {
        const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'email_automation'");
        const automationSettings = configRes.rows[0]?.config_data || {
            WELCOME_USER: true,
            REJECTION_INITIAL: true,
            REJECTION_FINAL: true
        };

        if (automationSettings.WELCOME_USER === false) {
            console.log(`[AuthService] Automated welcome email is toggled OFF. Skipping.`);
            return;
        }

        const templateRes = await query('SELECT * FROM email_templates WHERE type = \'WELCOME_USER\' AND is_active = true');
        if (templateRes.rows[0]) {
            await emailService.sendAutomatedEmail({ 
                applicant_name: user.full_name, 
                applicant_email: user.email 
            }, templateRes.rows[0], {
                full_name: user.full_name,
                email: user.email,
                role_label: user.role.replace(/_/g, ' ').toUpperCase()
            });
        }
    }

    static async updateUser(id, data) {
        const updateData = { ...data };
        if (data.password) {
            updateData.password_hash = await bcrypt.hash(data.password, 10);
            updateData.password_plain = data.password;
            delete updateData.password;
        }
        return await UserRepository.update(id, updateData);
    }
}
