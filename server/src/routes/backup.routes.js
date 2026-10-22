import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { BackupService, getFormalTimestamp } from '../services/backup.service.js';
import { BackupScheduler } from '../services/scheduler.service.js';
import { getIO } from '../socket.js';

export const backupRouter = express.Router();

const backupStorage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, BackupService.getBackupDir());
    },
    filename: (_req, file, callback) => {
        const safeBase = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = getFormalTimestamp();
        callback(null, `RecruitMS_Backup_${timestamp}_Imported_${safeBase}.sql`);
    }
});

const backupUpload = multer({
    storage: backupStorage,
    fileFilter: (_req, file, callback) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.sql') {
            return callback(new Error('Only SQL backup files (.sql) are allowed.'));
        }
        callback(null, true);
    },
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
        files: 1
    }
});

backupRouter.post('/import', backupUpload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.status(200).json({ message: 'Backup imported successfully', filename: req.file.filename });
    } catch (err) {
        next(err);
    }
});

backupRouter.post('/', async (req, res, next) => {
    try {
        const { type } = req.body;
        const result = await BackupService.createBackup(type);
        res.status(201).json({ message: 'Backup created successfully', ...result });
    } catch (err) {
        next(err);
    }
});

backupRouter.get('/', async (req, res, next) => {
    try {
        const history = await BackupService.listBackups();
        res.status(200).json(history);
    } catch (err) {
        next(err);
    }
});

backupRouter.get('/active', async (req, res, next) => {
    try {
        const active = await BackupService.getActiveBackup();
        res.status(200).json(active);
    } catch (err) {
        next(err);
    }
});

backupRouter.get('/settings', async (req, res, next) => {
    try {
        const settings = BackupScheduler.getSettings();
        res.status(200).json(settings);
    } catch (err) {
        next(err);
    }
});

backupRouter.post('/settings', async (req, res, next) => {
    try {
        const settings = req.body;
        BackupScheduler.saveSettings(settings);
        res.status(200).json({ message: 'Backup settings updated successfully', settings });
    } catch (err) {
        next(err);
    }
});

backupRouter.get('/:filename/download', async (req, res, next) => {
    try {
        const { filename } = req.params;
        const backupDir = BackupService.getBackupDir();
        const filepath = path.join(backupDir, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Backup file not found' });
        }
        res.download(filepath, filename);
    } catch (err) {
        next(err);
    }
});

backupRouter.post('/:filename/restore', async (req, res, next) => {
    try {
        const { filename } = req.params;
        await BackupService.restoreBackup(filename, getIO());
        res.status(200).json({ message: 'Database restored successfully' });
    } catch (err) {
        next(err);
    }
});

backupRouter.delete('/:filename', async (req, res, next) => {
    try {
        const { filename } = req.params;
        await BackupService.deleteBackup(filename);
        res.status(200).json({ message: 'Backup deleted successfully' });
    } catch (err) {
        next(err);
    }
});
