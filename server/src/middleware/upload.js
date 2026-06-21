import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';

fs.mkdirSync(config.uploadDir, { recursive: true });
const templateUploadDir = path.join(config.uploadDir, 'templates');
fs.mkdirSync(templateUploadDir, { recursive: true });
const accountImageUploadDir = path.resolve(process.cwd(), 'uploads', 'account-images');
fs.mkdirSync(accountImageUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, config.uploadDir),
    filename: (_req, file, callback) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        callback(null, `${Date.now()}-${safeName}`);
    },
});

function resumeFilter(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
        return callback(new Error('Only PDF, DOC, and DOCX resumes are allowed.'));
    }

    return callback(null, true);
}

export const resumeUpload = multer({
    storage,
    fileFilter: resumeFilter,
    limits: {
        fileSize: 3 * 1024 * 1024, // 3MB
        files: 1,
    },
});

const templateStorage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, templateUploadDir),
    filename: (_req, file, callback) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        callback(null, `${Date.now()}-${safeName}`);
    },
});

export const templateUpload = multer({
    storage: templateStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
    },
});

const accountImageStorage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, accountImageUploadDir),
    filename: (_req, file, callback) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        callback(null, `${Date.now()}-${safeName}`);
    },
});

function accountImageFilter(_req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    if (!file.mimetype.startsWith('image/') || !allowedExtensions.includes(ext)) {
        return callback(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
    }

    return callback(null, true);
}

export const accountImageUpload = multer({
    storage: accountImageStorage,
    fileFilter: accountImageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
    },
});

const recordingUploadDir = path.resolve(process.cwd(), 'uploads', 'recordings');
fs.mkdirSync(recordingUploadDir, { recursive: true });

const recordingStorage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, recordingUploadDir),
    filename: (_req, file, callback) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        callback(null, `${Date.now()}-${safeName}`);
    },
});

export const recordingUpload = multer({
    storage: recordingStorage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1,
    },
});

