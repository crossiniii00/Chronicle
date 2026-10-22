import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAuditLog } from '../middleware/audit.js';
import { AuthService } from '../services/AuthService.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { loginSchema, provisionSchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await UserRepository.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userPayload = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            department: user.department || user.sector || null,
            avatar_data: user.avatar_data || null,
            cover_data: user.cover_data || null,
            password_plain: user.password_plain || null
        };
        
        req.session.user = userPayload;
        res.json({ user: userPayload });
    } catch (error) {
        console.error('[AuthRoute Error]', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

authRouter.patch('/me/password', requireAuth, async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'current_password and new_password are required.' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const { default: bcrypt } = await import('bcryptjs');
        const user = await UserRepository.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const matches = await bcrypt.compare(current_password, user.password_hash);
        if (!matches) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await UserRepository.update(req.user.id, { 
            password_hash: newHash,
            password_plain: new_password 
        });

        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        next(error);
    }
});

authRouter.patch('/me', requireAuth, async (req, res, next) => {
    try {
        const { full_name, phone, avatar_data, cover_data, department } = req.body;
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (phone !== undefined) updateData.phone = phone;
        if (avatar_data !== undefined) updateData.avatar_data = avatar_data;
        if (cover_data !== undefined) updateData.cover_data = cover_data;
        if (department !== undefined) updateData.department = department;
        
        const updatedUser = await UserRepository.update(req.user.id, updateData);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userPayload = {
            id: updatedUser.id,
            email: updatedUser.email,
            full_name: updatedUser.full_name,
            role: updatedUser.role,
            department: updatedUser.department || updatedUser.sector || null,
            avatar_data: updatedUser.avatar_data || null,
            cover_data: updatedUser.cover_data || null,
            password_plain: updatedUser.password_plain || null
        };
        
        req.session.user = userPayload;
        res.json({ user: userPayload });
    } catch (error) {
        next(error);
    }
});

authRouter.post('/login', async (req, res, next) => {
    try {
        const payload = loginSchema.parse(req.body);
        console.log(`[AuthRoute] Attempting login for ${payload.email}`);
        const user = await AuthService.login(payload.email, payload.password, req.ip, req.get('user-agent'));
        console.log(`[AuthRoute] Login successful for ${user.email}, saving session...`);

        req.session.user = user;
        req.session.save((err) => {
            if (err) {
                console.error('[AuthRoute] Session save error:', err);
                return next(err);
            }
            console.log(`[AuthRoute] Session saved for ${user.email}`);
            return res.json({ user: req.session.user });
        });
    } catch (error) {
        console.error('[AuthRoute] Login error:', error.message);
        if (error.message === 'Invalid credentials') {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        next(error);
    }
});

authRouter.post('/logout', async (req, res, next) => {
    try {
        const userId = req.session?.user?.id ?? null;
        req.session.destroy((err) => {
            if (err) return next(err);
            if (userId) {
                void writeAuditLog({
                    userId,
                    action: 'auth.logout',
                    resourceType: 'user',
                    resourceId: userId,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
            }
            res.status(204).send();
        });
    } catch (error) {
        next(error);
    }
});

authRouter.get('/users', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (_req, res, next) => {
    try {
        const users = await UserRepository.findAll();
        res.json(users);
    } catch (error) {
        next(error);
    }
});

authRouter.post('/users', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const payload = provisionSchema.parse(req.body);
        const newUser = await AuthService.provisionUser(payload);
        res.status(201).json(newUser);
    } catch (error) {
        next(error);
    }
});

authRouter.patch('/users/:id', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        const user = await AuthService.updateUser(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        next(error);
    }
});

authRouter.delete('/users/:id', requireAuth, requireRole('admin', 'recruiter', 'ops_validator'), async (req, res, next) => {
    try {
        await UserRepository.delete(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});
