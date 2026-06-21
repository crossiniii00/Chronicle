export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const userRole = req.user.role;

        // super_admin automatically passes all RBAC checks
        if (userRole === 'super_admin') {
            return next();
        }

        // Check for exact match first
        if (roles.includes(userRole)) {
            return next();
        }

        // Allow any recruiter sub-role (recruiter_interviewer, recruiter_s, etc.)
        // when 'recruiter' is in the allowed roles
        if (roles.includes('recruiter') && userRole.startsWith('recruiter_')) {
            return next();
        }

        return res.status(403).json({ message: 'Insufficient permissions.' });
    };
}
