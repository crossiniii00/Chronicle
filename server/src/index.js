// Triggering hot-reload to bind port
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
import compression from 'compression';
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
import { jobCategoriesRouter } from './routes/job-categories.routes.js';
import { createSocketServer } from './socket.js';
import { statsRouter } from './routes/stats.routes.js';

// Global error handlers to prevent the server from crashing
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down gracefully is recommended, but keeping server alive...', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION! 💥 Keeping server alive...', reason);
});

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
app.use(compression());
app.use(cors({
    origin: (origin, callback) => {
        // Allow any origin for local deployment to support both localhost and network IPs
        callback(null, true);
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

const sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions',
});

sessionStore.on('error', (err) => {
    console.error('[Session Store Error]', err);
});

app.use(session({
    store: sessionStore,
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
    },
}));

app.use('/uploads/resumes', express.static(path.resolve(config.uploadDir)));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/health', healthRouter);

// Rate Limiter for API endpoints (Allows configurable limit and tracks per-user session to avoid office NAT IP blocks)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => {
        return req.session?.user?.id || req.ip || 'unknown';
    },
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
app.use('/api/job-categories', jobCategoriesRouter);
app.use('/api/stats', statsRouter);
app.use(errorHandler);

const server = http.createServer(app);
const io = createSocketServer(server);
app.locals.io = io;
io._trafficLog = trafficLog; // Expose to ALLMIND socket events

// Self-healing DB check
import { ensureDatabaseTables } from './db-init.js';
ensureDatabaseTables().then(() => {
    let retries = 5;
    const startServer = () => {
        server.listen(config.port, '0.0.0.0', () => {
            console.log(`[Server] Running on port ${config.port}`);
            // Start automatic backup scheduler
            import('./services/scheduler.service.js').then(({ BackupScheduler }) => {
                BackupScheduler.start();
            }).catch(err => {
                console.error('[Scheduler Error] Failed to start backup scheduler:', err);
            });
        });
    };

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            if (retries > 0) {
                console.warn(`[Server] Port ${config.port} is busy. Retrying in 1000ms... (${retries} retries remaining)`);
                retries--;
                setTimeout(() => {
                    try {
                        server.close((err) => {
                            if (err) {
                                console.warn('[Server] Error while closing server on retry:', err.message);
                            }
                            startServer();
                        });
                    } catch (closeErr) {
                        startServer();
                    }
                }, 1000);
            } else {
                console.error(`[FATAL] Port ${config.port} is already in use. Max retries reached. Exiting.`);
                process.exit(1);
            }
        } else {
            console.error('[FATAL] Server error:', e);
            process.exit(1);
        }
    });

    startServer();
}).catch(err => {
    console.error('[FATAL] Failed to initialize database:', err);
    process.exit(1);
});

const gracefulShutdown = (signal) => {
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
        console.log('[Server] HTTP/Socket server closed.');
        pool.end(() => {
            console.log('[Server] Database pool connections ended.');
            process.exit(0);
        });
    });

    // Force shutdown after 5 seconds if connection cleanup hangs
    setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out. Force exiting...');
        process.exit(1);
    }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Watcher reload trigger 3

