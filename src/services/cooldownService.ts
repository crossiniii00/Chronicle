const COOLDOWN_KEY = 'applicant_cooldowns';
const ATTEMPTS_KEY = 'typing_attempts_log';
const HISTORY_KEY = 'typing_attempts_history';

export interface CooldownEntry {
    name: string;
    expiresAt: string;
}

export interface AttemptLog {
    name: string;
    attempts: number;
    lastAttemptAt: string;
}

export interface AttemptHistoryLog {
    name: string;
    lockedAt: string;
    unlockedAt: string;
    reason: 'expired' | 'manual_lift';
}

export const cooldownService = {
    // Cooldown management
    cleanupExpiredCooldowns: (): void => {
        const cooldowns = cooldownService._getCooldowns();
        const now = new Date();
        let changed = false;

        const active = cooldowns.filter(entry => {
            if (now > new Date(entry.expiresAt)) {
                // Expired, move to history
                cooldownService._addHistoryLog({
                    name: entry.name,
                    lockedAt: new Date(new Date(entry.expiresAt).getTime() - 12 * 60 * 60 * 1000).toISOString(),
                    unlockedAt: entry.expiresAt, // Unlocked exactly when it expired
                    reason: 'expired'
                });
                changed = true;
                return false; // Remove from active
            }
            return true;
        });

        if (changed) {
            localStorage.setItem(COOLDOWN_KEY, JSON.stringify(active));
        }
    },

    isNameOnCooldown: (name: string): boolean => {
        cooldownService.cleanupExpiredCooldowns();
        const cooldowns = cooldownService._getCooldowns();
        const entry = cooldowns.find(c => c.name.toLowerCase() === name.toLowerCase());
        return !!entry;
    },

    addNameToCooldown: (name: string): void => {
        const cooldowns = cooldownService._getCooldowns();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12); // 12 hour cooldown

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

    setAttempts: (name: string, count: number): void => {
        const logs = cooldownService._getAttemptLogs();
        const idx = logs.findIndex(l => l.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) {
            logs[idx] = { name, attempts: count, lastAttemptAt: new Date().toISOString() };
        } else {
            logs.push({ name, attempts: count, lastAttemptAt: new Date().toISOString() });
        }
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(logs));
    },

    // Internals
    _getCooldowns: (): CooldownEntry[] => {
        const raw = localStorage.getItem(COOLDOWN_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    _removeCooldown: (name: string, isManualLift: boolean = false): void => {
        const cooldowns = cooldownService._getCooldowns();
        const entry = cooldowns.find(c => c.name.toLowerCase() === name.toLowerCase());
        
        if (entry && isManualLift) {
            cooldownService._addHistoryLog({
                name: entry.name,
                lockedAt: new Date(new Date(entry.expiresAt).getTime() - 12 * 60 * 60 * 1000).toISOString(),
                unlockedAt: new Date().toISOString(),
                reason: 'manual_lift'
            });
        }

        const filtered = cooldowns.filter(c => c.name.toLowerCase() !== name.toLowerCase());
        localStorage.setItem(COOLDOWN_KEY, JSON.stringify(filtered));
    },

    _getAttemptLogs: (): AttemptLog[] => {
        const raw = localStorage.getItem(ATTEMPTS_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    _getHistoryLogs: (): AttemptHistoryLog[] => {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    _addHistoryLog: (log: AttemptHistoryLog): void => {
        const history = cooldownService._getHistoryLogs();
        history.unshift(log); // Add to beginning
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
};
