const COOLDOWN_KEY = 'applicant_cooldowns';
const ATTEMPTS_KEY = 'typing_attempts_log';

export interface CooldownEntry {
    name: string;
    expiresAt: string;
}

export interface AttemptLog {
    name: string;
    attempts: number;
    lastAttemptAt: string;
}

export const cooldownService = {
    // Cooldown management
    isNameOnCooldown: (name: string): boolean => {
        const cooldowns = cooldownService._getCooldowns();
        const entry = cooldowns.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (!entry) return false;

        const isExpired = new Date() > new Date(entry.expiresAt);
        if (isExpired) {
            cooldownService._removeCooldown(name);
            return false;
        }
        return true;
    },

    addNameToCooldown: (name: string): void => {
        const cooldowns = cooldownService._getCooldowns();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // 24 hour cooldown

        const filtered = cooldowns.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        filtered.push({ name, expiresAt: expiresAt.toISOString() });
        
        localStorage.setItem(COOLDOWN_KEY, JSON.stringify(filtered));
        // Also clear attempts when banned so they start fresh after cooldown
        cooldownService.clearAttempts(name);
    },

    getRemainingCooldown: (name: string): string => {
        const cooldowns = cooldownService._getCooldowns();
        const entry = cooldowns.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (!entry) return '';

        const diff = new Date(entry.expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return '';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    },

    // Attempt tracking
    getAttempts: (name: string): number => {
        const logs = cooldownService._getAttemptLogs();
        const log = logs.find(l => l.name.toLowerCase() === name.toLowerCase());
        return log ? log.attempts : 0;
    },

    incrementAttempt: (name: string): number => {
        const logs = cooldownService._getAttemptLogs();
        const idx = logs.findIndex(l => l.name.toLowerCase() === name.toLowerCase());
        
        let attempts = 1;
        if (idx !== -1) {
            attempts = logs[idx].attempts + 1;
            logs[idx] = { name, attempts, lastAttemptAt: new Date().toISOString() };
        } else {
            logs.push({ name, attempts, lastAttemptAt: new Date().toISOString() });
        }

        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(logs));
        return attempts;
    },

    clearAttempts: (name: string): void => {
        const logs = cooldownService._getAttemptLogs();
        const filtered = logs.filter(l => l.name.toLowerCase() !== name.toLowerCase());
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(filtered));
    },

    // Internals
    _getCooldowns: (): CooldownEntry[] => {
        const raw = localStorage.getItem(COOLDOWN_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    _removeCooldown: (name: string): void => {
        const cooldowns = cooldownService._getCooldowns();
        const filtered = cooldowns.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        localStorage.setItem(COOLDOWN_KEY, JSON.stringify(filtered));
    },

    _getAttemptLogs: (): AttemptLog[] => {
        const raw = localStorage.getItem(ATTEMPTS_KEY);
        return raw ? JSON.parse(raw) : [];
    }
};
