// Triggering hot-reload to restart port binding - listen
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { applicationsRouter } from './routes/applications.routes.js';
import { emailTemplatesRouter } from './routes/email-templates.routes.js';
import { typingTestRouter } from './routes/typing-test.routes.js';
import { positionsRouter } from './routes/positions.routes.js';
import { roomsRouter } from './routes/rooms.routes.js';
import { interviewQuestionsRouter } from './routes/interview-questions.routes.js';
import { departmentsRouter } from './routes/departments.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { queueRouter } from './routes/queue.routes.js';
import { mhrtRouter } from './routes/mhrt.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { reportConfigsRouter } from './routes/report-configs.routes.js';
import { backupRouter } from './routes/backup.routes.js';
import forumsRouter from './routes/forums.routes.js';
import { jobCategoriesRouter } from './routes/job-categories.routes.js';
import { createSocketServer } from './socket.js';

const PgSession = connectPgSimple(session);
const app = express();

// In-memory traffic ring buffer for ALLMIND oversight
const TRAFFIC_BUFFER_SIZE = 200;
const trafficLog = [];

app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    const start = Date.now();
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - start;
        const entry = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration,
            ip: req.ip || req.connection?.remoteAddress || 'unknown',
            userId: req.session?.user?.id || null,
            userName: req.session?.user?.full_name || null,
            timestamp: new Date().toISOString(),
        };
        trafficLog.push(entry);
        if (trafficLog.length > TRAFFIC_BUFFER_SIZE) {
            trafficLog.shift();
        }
        originalEnd.apply(this, args);
    };
    next();
});

app.locals.trafficLog = trafficLog;

app.set('trust proxy', 1);

fs.mkdirSync(config.uploadDir, { recursive: true });

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: (origin, callback) => {
        // Allow any origin for local deployment to support both localhost and network IPs
        callback(null, true);
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
    store: new PgSession({
        pool,
        tableName: 'user_sessions',
    }),
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

app.use('/uploads/resumes', express.static(path.resolve(config.uploadDir)));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/health', healthRouter);

// Rate Limiter for API endpoints (Allows 300 requests per IP per minute)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/email-templates', emailTemplatesRouter);
app.use('/api/typing-test', typingTestRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/interview-questions', interviewQuestionsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/mhrt', mhrtRouter);
app.use('/api/ai', aiRouter);
console.log('[Server] Registering /api/report-configs route');
app.use('/api/report-configs', reportConfigsRouter);
app.use('/api/backups', backupRouter);
app.use('/api/forums', forumsRouter);
app.use('/api/job-categories', jobCategoriesRouter);
app.use(errorHandler);

const server = http.createServer(app);
const io = createSocketServer(server);
app.locals.io = io;
io._trafficLog = trafficLog; // Expose to ALLMIND socket events

// Self-healing DB check
import { ensureDatabaseTables } from './db-init.js';
ensureDatabaseTables().then(() => {
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`[FATAL] Port ${config.port} is already in use. Please kill the process using this port and restart.`);
            process.exit(1);
        } else {
            console.error('[FATAL] Server error:', e);
            process.exit(1);
        }
    });

    server.listen(config.port, () => {
        console.log(`[Server] Running on port ${config.port}`);
        // Start automatic backup scheduler
        import('./services/scheduler.service.js').then(({ BackupScheduler }) => {
            BackupScheduler.start();
        }).catch(err => {
            console.error('[Scheduler Error] Failed to start backup scheduler:', err);
        });
    });
}).catch(err => {
    console.error('[FATAL] Failed to initialize database:', err);
    process.exit(1);
});
// Watcher reload trigger 3

