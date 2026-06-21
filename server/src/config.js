import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const rootDir = process.cwd();

export const config = {
    port: Number(process.env.PORT ?? 4000),
    baseUrl: process.env.APP_BASE_URL ?? 'https://recruitms.local',
    sessionSecret: process.env.SESSION_SECRET ?? 'change_me',
    uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR ?? 'uploads/resumes'),
    corsOrigin: process.env.CORS_ORIGIN ?? 'https://recruitms.local',
    postgres: {
        host: process.env.POSTGRES_HOST ?? 'localhost',
        port: Number(process.env.POSTGRES_PORT ?? 5432),
        database: process.env.POSTGRES_DB ?? 'recruitms',
        user: process.env.POSTGRES_USER ?? 'postgres',
        password: process.env.POSTGRES_PASSWORD ?? 'postgres',
        max: Number(process.env.POSTGRES_MAX_POOL ?? 50),
        connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT ?? 5000),
        idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT ?? 10000),
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
    },
    ai: {
        provider: process.env.AI_PROVIDER ?? 'stub',
        openaiApiKey: process.env.OPENAI_API_KEY ?? '',
        openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
        anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest',
        geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '',
        geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
        opencodeZenApiKey: process.env.OPENCODE_ZEN_API_KEY ?? '',
        opencodeZenModel: process.env.OPENCODE_ZEN_MODEL ?? 'minimax-m3-free',
        opencodeZenBaseUrl: process.env.OPENCODE_ZEN_BASE_URL ?? 'https://opencode.ai/zen/v1',
        timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
    }
};
