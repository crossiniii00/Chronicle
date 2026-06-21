import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { writeAuditLog } from '../middleware/audit.js';
import { AIService, AIProviderError } from '../services/AIService.js';
import { executeTool } from '../services/AITools.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const getEnvPath = () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(__dirname, '../../../.env');
};

const readEnvFile = () => {
    try {
        const envPath = getEnvPath();
        if (!fs.existsSync(envPath)) return {};
        const content = fs.readFileSync(envPath, 'utf8');
        const result = {};
        content.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let val = match[2] || '';
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                result[match[1]] = val;
            }
        });
        return result;
    } catch (err) {
        console.error('Error reading .env file:', err);
        return {};
    }
};

const writeEnvFile = (updates) => {
    try {
        const envPath = getEnvPath();
        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf8');
        }
        
        const lines = content.split(/\r?\n/);
        const updatedKeys = new Set();
        
        const newLines = lines.map(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                if (updates.hasOwnProperty(key)) {
                    updatedKeys.add(key);
                    return `${key}=${updates[key]}`;
                }
            }
            return line;
        });
        
        Object.keys(updates).forEach(key => {
            if (!updatedKeys.has(key)) {
                newLines.push(`${key}=${updates[key]}`);
            }
        });
        
        fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing .env file:', err);
        return false;
    }
};

export const aiRouter = Router();

const aiAuth = [requireAuth, requireRole('admin', 'recruiter', 'ops_validator')];

const historyItemSchema = z.object({
    quota: z.number().int().nonnegative().optional(),
    hiredCount: z.number().int().nonnegative().optional(),
    totalApplicants: z.number().int().nonnegative().optional(),
    inPipeline: z.number().int().nonnegative().optional(),
    failedCount: z.number().int().nonnegative().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    durationDays: z.number().int().positive().optional(),
    hiringType: z.enum(['Billed', 'Non-Billed']).optional(),
});

const suggestQuotaSchema = z.object({
    department: z.string().min(1),
    history: z.array(historyItemSchema).default([]),
    currentQuota: z.number().int().nonnegative().optional(),
});

const summarizeSchema = z.object({
    notes: z.string().optional().default(''),
    ratingReason: z.string().optional().default(''),
});

const hridSchema = z.object({
    department: z.string().min(1),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    hiringType: z.enum(['Billed', 'Non-Billed']).optional(),
});

const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(8000),
});

const chatSchema = z.object({
    messages: z.array(chatMessageSchema).max(40),
});

aiRouter.get('/status', ...aiAuth, (_req, res) => {
    res.json(AIService.getStatus());
});

aiRouter.post('/suggest-quota', ...aiAuth, async (req, res, next) => {
    try {
        const payload = suggestQuotaSchema.parse(req.body);
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_SUGGEST_QUOTA',
            resourceType: 'ai',
            metadata: { department: payload.department, historyLen: payload.history.length },
        });
        const result = await AIService.suggestQuota(payload);
        res.json(result);
    } catch (err) {
        if (err instanceof AIProviderError) return res.status(err.status).json({ error: err.message });
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

aiRouter.post('/summarize-interview', ...aiAuth, async (req, res, next) => {
    try {
        const payload = summarizeSchema.parse(req.body);
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_SUMMARIZE_INTERVIEW',
            resourceType: 'ai',
            metadata: { notesLen: payload.notes.length },
        });
        const result = await AIService.summarizeInterview(payload);
        res.json(result);
    } catch (err) {
        if (err instanceof AIProviderError) return res.status(err.status).json({ error: err.message });
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

aiRouter.post('/suggest-hiring-request-id', ...aiAuth, async (req, res, next) => {
    try {
        const payload = hridSchema.parse(req.body);
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_SUGGEST_HRID',
            resourceType: 'ai',
            metadata: { department: payload.department },
        });
        const result = await AIService.suggestHiringRequestId(payload);
        res.json(result);
    } catch (err) {
        if (err instanceof AIProviderError) return res.status(err.status).json({ error: err.message });
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

aiRouter.post('/chat', ...aiAuth, async (req, res, next) => {
    try {
        const payload = chatSchema.parse(req.body);
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_CHAT',
            resourceType: 'ai',
            metadata: { messageCount: payload.messages.length },
        });
        const result = await AIService.chat({
            messages: payload.messages,
            user: req.user,
        });
        res.json(result);
    } catch (err) {
        if (err instanceof AIProviderError) return res.status(err.status).json({ error: err.message });
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const aggregateSchema = z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    applied_after: z.string().optional(),
    applied_before: z.string().optional(),
    hired_after: z.string().optional(),
    hired_before: z.string().optional(),
    gender: z.string().optional(),
    civil_status: z.string().optional(),
    religion: z.string().optional(),
    blood_type: z.string().optional(),
    citizenship: z.string().optional(),
    education_level: z.string().optional(),
    highest_education: z.string().optional(),
    school_name: z.string().optional(),
    course: z.string().optional(),
    degree: z.string().optional(),
    course_strand: z.string().optional(),
    graduation_year: z.string().optional(),
    num_children: z.string().optional(),
    num_siblings: z.string().optional(),
    assigned_recruiter: z.string().optional(),
    assigned_ops_validator: z.string().optional(),
    source: z.string().optional(),
    hiring_source: z.string().optional(),
    final_verdict: z.string().optional(),
    final_specific_status: z.string().optional(),
    ops_validator_status: z.string().optional(),
    client_interview_status: z.string().optional(),
    wonderlic_status: z.string().optional(),
    leadership_status: z.string().optional(),
    final_account: z.string().optional(),
    master_wave: z.string().optional(),
    master_hiring_request_id: z.string().optional(),
    min_typing_wpm: z.number().optional(),
    min_typing_accuracy: z.number().optional(),
    min_assessment_score: z.number().optional(),
    max_assessment_score: z.number().optional(),
    min_personal_rating: z.number().optional(),
    sort_by: z.string().optional(),
    group_by: z.string().optional(),
    limit: z.number().int().positive().max(200).optional(),
});

aiRouter.post('/aggregate-applicants', ...aiAuth, async (req, res, next) => {
    try {
        const payload = aggregateSchema.parse(req.body);
        const result = await executeTool('aggregate_applicants', payload);
        if (!result.ok) return res.status(400).json({ error: result.error });
        res.json(result.data);
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const searchSchema = aggregateSchema.passthrough();

aiRouter.post('/search-applicants', ...aiAuth, async (req, res, next) => {
    try {
        const payload = searchSchema.parse(req.body);
        const flat = { ...(payload.filters || {}), ...payload };
        delete flat.filters;
        const result = await executeTool('search_applicants', flat);
        if (!result.ok) return res.status(400).json({ error: result.error });
        res.json(result.data);
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const funnelSchema = z.object({
    filters: z.record(z.string(), z.any()).optional(),
}).passthrough();

aiRouter.post('/funnel-applicants', ...aiAuth, async (req, res, next) => {
    try {
        const payload = funnelSchema.parse(req.body);
        const result = await executeTool('get_funnel', payload);
        if (!result.ok) return res.status(400).json({ error: result.error });
        res.json(result.data);
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const commitEditSchema = z.object({
    applicant_id: z.string().min(1),
    field: z.string().min(1),
    value: z.string().min(1),
    reason: z.string().nullable().optional(),
});

aiRouter.post('/commit-edit', ...aiAuth, async (req, res, next) => {
    try {
        const payload = commitEditSchema.parse(req.body);
        const result = await executeTool('edit_applicant', {
            applicant_id: payload.applicant_id,
            field: payload.field,
            value: payload.value,
            reason: payload.reason || null,
            commit: true,
        });
        if (!result.ok) return res.status(400).json({ error: result.error });
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_EDIT_APPLICANT_COMMIT',
            resourceType: 'applicant',
            resourceId: payload.applicant_id,
            metadata: { field: payload.field, value: payload.value, reason: payload.reason || null },
        });
        res.json(result.data?.uiAction || { ok: true });
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const ttsSchema = z.object({
    text: z.string().min(1).max(5000),
    voice_id: z.string().optional(),
    model_id: z.string().optional(),
    stability: z.number().min(0).max(1).optional(),
    similarity_boost: z.number().min(0).max(1).optional(),
});

aiRouter.post('/tts', ...aiAuth, async (req, res, next) => {
    try {
        const { text, voice_id, model_id, stability, similarity_boost } = ttsSchema.parse(req.body);
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey || apiKey === 'YOUR_ELEVENLABS_KEY_HERE' || apiKey === 'replace_with_your_elevenlabs_key') {
            return res.status(503).json({ error: 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to server .env and restart.' });
        }
        const voiceId = voice_id || process.env.ELEVENLABS_VOICE_ID || 'flHkNRp1BlvT73UL6gyz';
        const model = model_id || process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1';

        const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: model,
                voice_settings: {
                    stability: stability ?? 0.5,
                    similarity_boost: similarity_boost ?? 0.75,
                },
            }),
        });

        if (!upstream.ok) {
            const errText = await upstream.text().catch(() => '');
            console.error('[TTS] ElevenLabs error', upstream.status, errText.slice(0, 300));
            return res.status(upstream.status).json({
                error: 'ElevenLabs TTS failed',
                details: errText.slice(0, 500),
            });
        }

        const arrayBuf = await upstream.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuf);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'no-store',
        });
        await writeAuditLog({
            userId: req.user?.id,
            action: 'AI_TTS',
            resourceType: 'ai',
            metadata: { voiceId, model, charCount: text.length, byteCount: audioBuffer.length },
        });
        res.send(audioBuffer);
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});

const adminAuth = [requireAuth, requireRole('admin')];

const aiConfigSchema = z.object({
    AI_PROVIDER: z.enum(['gemini', 'openai', 'stub']),
    OPENAI_API_KEY: z.string().optional().default(''),
    OPENAI_MODEL: z.string().optional().default(''),
    GEMINI_API_KEY: z.string().optional().default(''),
    GEMINI_MODEL: z.string().optional().default(''),
    CHATBOT_ENABLED: z.boolean().optional().default(true),
});

aiRouter.get('/config', ...adminAuth, (req, res) => {
    const envVars = readEnvFile();
    res.json({
        AI_PROVIDER: envVars.AI_PROVIDER || config.ai.provider || 'stub',
        OPENAI_API_KEY: envVars.OPENAI_API_KEY || config.ai.openaiApiKey || '',
        OPENAI_MODEL: envVars.OPENAI_MODEL || config.ai.openaiModel || 'gpt-4o-mini',
        GEMINI_API_KEY: envVars.GEMINI_API_KEY || config.ai.geminiApiKey || '',
        GEMINI_MODEL: envVars.GEMINI_MODEL || config.ai.geminiModel || 'gemini-1.5-flash',
        CHATBOT_ENABLED: envVars.CHATBOT_ENABLED !== undefined ? envVars.CHATBOT_ENABLED === 'true' : true,
    });
});

aiRouter.post('/config', ...adminAuth, async (req, res, next) => {
    try {
        const payload = aiConfigSchema.parse(req.body);
        const updates = {
            ...payload,
            CHATBOT_ENABLED: String(payload.CHATBOT_ENABLED ?? true)
        };
        const success = writeEnvFile(updates);
        if (!success) {
            return res.status(500).json({ error: 'Failed to write configurations to .env file.' });
        }
        
        // Dynamic reload in memory
        Object.keys(updates).forEach(key => {
            process.env[key] = updates[key];
        });
        config.ai.provider = payload.AI_PROVIDER;
        config.ai.openaiApiKey = payload.OPENAI_API_KEY;
        config.ai.openaiModel = payload.OPENAI_MODEL;
        config.ai.geminiApiKey = payload.GEMINI_API_KEY;
        config.ai.geminiModel = payload.GEMINI_MODEL;
        
        await writeAuditLog({
            userId: req.user?.id,
            action: 'UPDATE_AI_CONFIG',
            resourceType: 'ai',
            metadata: { provider: payload.AI_PROVIDER },
        });
        
        res.json({ ok: true, message: 'AI configuration updated and reloaded successfully.' });
    } catch (err) {
        if (err?.issues) return res.status(400).json({ error: 'Invalid payload', details: err.issues });
        next(err);
    }
});
