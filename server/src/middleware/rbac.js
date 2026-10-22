import { query } from '../db.js';

export function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const userRole = req.user.role;
        const rolesToCheck = [userRole];

        try {
            const configRes = await query("SELECT config_data FROM report_configs WHERE id = 'account_type_settings'");
            if (configRes.rows.length > 0) {
                const configData = configRes.rows[0].config_data || {};
                const roleTypes = configData.roleTypes || {};
                let resolvedType = roleTypes[userRole];
                if (!resolvedType && userRole && (userRole.startsWith('custom_') || userRole.startsWith('custom'))) {
                    resolvedType = 'recruiter';
                }
                if (resolvedType) {
                    rolesToCheck.push(resolvedType);
                }
            }
        } catch (e) {
            console.error('[RBAC] Error resolving custom role type:', e);
        }

        // super_admin automatically passes all RBAC checks
        if (rolesToCheck.includes('super_admin') || rolesToCheck.includes('superadmin')) {
            return next();
        }

        // Check if any of the user's roles/resolved roles matches requested roles
        if (roles.some(role => rolesToCheck.includes(role))) {
            return next();
        }

        // Allow any recruiter sub-role when 'recruiter' is in the allowed roles
        const isRecruiterAllowed = roles.includes('recruiter');
        const hasRecruiterRole = rolesToCheck.some(role => role === 'recruiter' || role.startsWith('recruiter_'));
        if (isRecruiterAllowed && hasRecruiterRole) {
            return next();
        }

        return res.status(403).json({ message: 'Insufficient permissions.' });
    };
}
