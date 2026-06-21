export const formatActionName = (action: string): string => {
    const mapping: Record<string, string> = {
        'AUTH.LOGIN': 'Login',
        'AUTH_LOGIN': 'Login',
        'AUTH.LOGOUT': 'Logout',
        'AUTH_LOGOUT': 'Logout',
        'APPLICATION.STATUS.UPDATE': 'Status Update',
        'APPLICATION_STATUS_UPDATE': 'Status Update',
        'APPLICATION.DOCUMENT.UPLOAD': 'Document Upload',
        'APPLICATION_DOCUMENT_UPLOAD': 'Document Upload',
        'INTERVIEW_ROOM.JOIN': 'Room Joined',
        'INTERVIEW_ROOM_JOIN': 'Room Joined',
        'INTERVIEW_ROOM.LEAVE': 'Room Left',
        'INTERVIEW_ROOM_LEAVE': 'Room Left',
        'SYSTEM.CONFIG.CHANGE': 'System Settings Changed',
        'SYSTEM_CONFIG_CHANGE': 'System Settings Changed'
    };
    
    const cleanAction = (action || '').toUpperCase();
    if (mapping[cleanAction]) return mapping[cleanAction];
    
    return (action || '')
        .replace(/[._]/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const formatUserRole = (role?: string): string => {
    if (!role) return 'System';
    const cleanRole = role.toLowerCase();
    if (cleanRole === 'user') return 'Recruiter';
    if (cleanRole === 'admin') return 'Admin';
    if (cleanRole === 'ops_validator') return 'Ops Validator';
    if (cleanRole.startsWith('recruiter_')) {
        return cleanRole
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
};
