import fs from 'node:fs';
import path from 'node:path';
import { BackupService } from './backup.service.js';

const backupDir = BackupService.getBackupDir();
const settingsFile = path.resolve(backupDir, 'schedule_settings.json');

export class BackupScheduler {
    static getSettings() {
        if (fs.existsSync(settingsFile)) {
            try {
                const raw = fs.readFileSync(settingsFile, 'utf8');
                return JSON.parse(raw);
            } catch (e) {
                console.error('[BackupScheduler] Failed to read settings:', e);
            }
        }
        return {
            enabled: true,
            frequency: 'daily',
            time: '02:00',
            keepLast: 30,
            compress: true,
            lastRun: null
        };
    }

    static saveSettings(settings) {
        const dir = path.dirname(settingsFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        // Reset check interval immediately to register new settings
        this.start();
    }

    static intervalId = null;

    static start() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        console.log('[BackupScheduler] Starting background scheduler check...');
        // Run check once on startup, then every 60 seconds
        this.check();
        this.intervalId = setInterval(() => this.check(), 60000);
    }

    static async check() {
        const settings = this.getSettings();
        if (!settings.enabled) return;

        const now = new Date();
        const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (currentHourMin !== settings.time) {
            return; // Not the scheduled time
        }

        // Check if already run in the last hour to prevent double trigger in the same minute
        if (settings.lastRun) {
            const lastRunDate = new Date(settings.lastRun);
            const diffMs = now - lastRunDate;
            if (diffMs < 60 * 60 * 1000) {
                return; // Already run recently
            }
        }

        // Check frequency constraints
        if (settings.frequency === 'weekly') {
            // Run on Sundays (day 0)
            if (now.getDay() !== 0) return;
        } else if (settings.frequency === 'monthly') {
            // Run on 1st of the month
            if (now.getDate() !== 1) return;
        }

        console.log(`[BackupScheduler] Triggering automatic backup. Frequency: ${settings.frequency}, Time: ${settings.time}`);
        try {
            const backup = await BackupService.createBackup('full');
            console.log('[BackupScheduler] Automatic backup completed:', backup.filename);

            // Clean up old backups based on keepLast
            const history = await BackupService.listBackups();
            const fullBackups = history.filter(b => b.type === 'full');
            if (fullBackups.length > settings.keepLast) {
                const toDelete = fullBackups.slice(settings.keepLast);
                for (const b of toDelete) {
                    console.log('[BackupScheduler] Pruning old backup:', b.filename);
                    await BackupService.deleteBackup(b.filename);
                }
            }

            settings.lastRun = now.toISOString();
            this.saveSettings(settings);
        } catch (err) {
            console.error('[BackupScheduler] Automatic backup failed:', err);
        }
    }
}
