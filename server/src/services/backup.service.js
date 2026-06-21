import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
import { query } from '../db.js';

const backupDir = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

export function getFormalTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function getPgBinaryPath(binaryName) {
    const paths = [
        path.join('C:\\Program Files\\PostgreSQL\\18\\bin', `${binaryName}.exe`),
        path.join('C:\\Program Files\\PostgreSQL\\13\\bin', `${binaryName}.exe`),
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return binaryName; // Fallback to environment PATH
}

function getPgBinDir() {
    const pgDumpPath = getPgBinaryPath('pg_dump');
    return path.dirname(pgDumpPath);
}

function writeActiveBackup(filename) {
    const activePath = path.join(backupDir, 'active_backup.json');
    fs.writeFileSync(activePath, JSON.stringify({
        filename,
        restored_at: new Date().toISOString()
    }, null, 2));
}

function spawnPgProcess(binaryName, args) {
    return new Promise((resolve, reject) => {
        const binaryPath = getPgBinaryPath(binaryName);
        const binDir = getPgBinDir();
        
        console.log(`[Backup] Spawning ${binaryName}:`, binaryPath, args.join(' '));
        
        const env = {
            ...process.env,
            PGPASSWORD: config.postgres.password,
            SystemRoot: process.env.SystemRoot || 'C:\\Windows',
            COMSPEC: process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe',
        };

        const proc = spawn(binaryPath, args, {
            env,
            cwd: binDir,
            windowsHide: true,
            shell: false,
        });

        let stderr = '';
        let stdout = '';

        proc.on('error', (err) => {
            console.error(`[Backup] ${binaryName} spawn error:`, err.message);
            reject(err);
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                const errorMsg = `${binaryName} exited with code ${code}: ${stderr || stdout}`;
                console.error(`[Backup] ${errorMsg}`);
                reject(new Error(errorMsg));
            }
        });
    });
}

export class BackupService {
    static getBackupDir() {
        return backupDir;
    }

    static async createBackup(type = 'full') {
        const timestamp = getFormalTimestamp();
        const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
        const filename = `RecruitMS_Backup_${timestamp}_${formattedType}.sql`;
        const filepath = path.join(backupDir, filename);

        const args = [
            '-h', config.postgres.host,
            '-p', config.postgres.port.toString(),
            '-U', config.postgres.user,
            '-d', config.postgres.database,
            '-f', filepath,
            '--clean',
            '--if-exists'
        ];

        if (type === 'settings') {
            args.push(
                '-t', 'email_templates',
                '-t', 'interview_questions',
                '-t', 'report_configs',
                '-t', 'departments',
                '-t', 'mhrt_accounts',
                '-t', 'mhrt_division_mappings',
                '-t', 'mhrt_time_off_assignments',
                '-t', 'positions'
            );
        } else {
            args.push('-T', 'user_sessions');
        }

        await spawnPgProcess('pg_dump', args);
        return { filename, filepath };
    }

    static async listBackups() {
        if (!fs.existsSync(backupDir)) return [];
        const files = fs.readdirSync(backupDir);
        const history = files
            .filter(f => (f.startsWith('backup_') || f.startsWith('RecruitMS_Backup_')) && f.endsWith('.sql'))
            .map(filename => {
                const filepath = path.join(backupDir, filename);
                const stats = fs.statSync(filepath);
                
                // Determine backup type in a robust way that supports both legacy and new formats
                let type = 'manual';
                const lowerName = filename.toLowerCase();
                if (lowerName.includes('_settings')) {
                    type = 'settings';
                } else if (lowerName.includes('_incremental')) {
                    type = 'incremental';
                } else if (lowerName.includes('_full')) {
                    type = 'full';
                } else if (lowerName.includes('_imported')) {
                    type = 'imported';
                }
                
                return {
                    id: filename,
                    filename,
                    size: stats.size,
                    created_at: stats.birthtime.toISOString(),
                    type,
                    status: 'success'
                };
            });
        return history.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    static async restoreBackup(filename) {
        const filepath = path.join(backupDir, filename);
        if (!fs.existsSync(filepath)) {
            throw new Error('Backup file does not exist');
        }

        // Determine which tables to clean based on the backup type to avoid wiping unrelated data
        const isSettingsOnly = filename.includes('_settings');
        let tablesToClean = [];

        if (isSettingsOnly) {
            tablesToClean = [
                'email_templates', 
                'interview_questions', 
                'report_configs', 
                'departments',
                'mhrt_accounts',
                'mhrt_division_mappings',
                'mhrt_time_off_assignments',
                'positions'
            ];
        } else {
            const tablesRes = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
            tablesToClean = tablesRes.rows
                .map(r => r.table_name)
                .filter(t => t !== 'user_sessions'); // Retain session table to prevent logging out during restore
        }

        if (tablesToClean.length > 0) {
            // Verify that the tables actually exist in the database before truncating
            const existCheck = await query(
                `SELECT table_name FROM information_schema.tables 
                 WHERE table_schema='public' AND table_name = ANY($1)`,
                [tablesToClean]
            );
            const existingTables = existCheck.rows.map(r => r.table_name);
            if (existingTables.length > 0) {
                const truncateQuery = `TRUNCATE TABLE ${existingTables.map(t => `"${t}"`).join(', ')} CASCADE`;
                await query(truncateQuery);
            }
        }

        // Detect binary pg_dump format (PGDMP magic). Plain text dumps start with '--' or 'SET'.
        const fd = fs.openSync(filepath, 'r');
        const headerBuf = Buffer.alloc(6);
        fs.readSync(fd, headerBuf, 0, 6, 0);
        fs.closeSync(fd);
        const isBinaryDump = headerBuf.toString('ascii', 0, 5) === 'PGDMP';

        if (isBinaryDump) {
            const args = [
                '-h', config.postgres.host,
                '-p', config.postgres.port.toString(),
                '-U', config.postgres.user,
                '-d', config.postgres.database,
                '--clean',
                '--if-exists',
                '--no-owner',
                '--no-privileges',
                filepath
            ];
            await spawnPgProcess('pg_restore', args);
        } else {
            const args = [
                '-h', config.postgres.host,
                '-p', config.postgres.port.toString(),
                '-U', config.postgres.user,
                '-d', config.postgres.database,
                '-v', 'ON_ERROR_STOP=1',
                '-f', filepath
            ];
            await spawnPgProcess('psql', args);
        }
        
        writeActiveBackup(filename);

        // Run self-healing schema sequence to ensure newly added columns/indexes exist in the restored database
        try {
            console.log('[Backup] Running post-restore database self-healing check...');
            const { ensureDatabaseTables } = await import('../db-init.js');
            await ensureDatabaseTables();
            console.log('[Backup] Post-restore self-healing database check completed successfully.');
        } catch (dbInitErr) {
            console.error('[Backup] Post-restore self-healing database check failed:', dbInitErr);
        }
    }

    static async getActiveBackup() {
        const activePath = path.join(backupDir, 'active_backup.json');
        if (fs.existsSync(activePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(activePath, 'utf8'));
                // Verify the backup file still exists
                const filepath = path.join(backupDir, data.filename);
                if (fs.existsSync(filepath)) {
                    const stats = fs.statSync(filepath);
                    return {
                        ...data,
                        size: stats.size,
                        exists: true
                    };
                } else {
                    // Clean up if file was deleted externally
                    fs.unlinkSync(activePath);
                }
            } catch (err) {
                console.error('[BackupService] Failed to read active backup info:', err);
            }
        }
        return null;
    }

    static async deleteBackup(filename) {
        const filepath = path.join(backupDir, filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
        const activePath = path.join(backupDir, 'active_backup.json');
        if (fs.existsSync(activePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(activePath, 'utf8'));
                if (data.filename === filename) {
                    fs.unlinkSync(activePath);
                }
            } catch (err) {
                console.error('[BackupService] Failed to clean active backup on delete:', err);
            }
        }
    }
}
