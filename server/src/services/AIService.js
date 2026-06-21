import { config } from '../config.js';
import { buildDataContext, formatDataContextForPrompt } from './DataContextService.js';
import { executeTool, getGeminiToolDeclarations } from './AITools.js';

class AIProviderError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = 'AIProviderError';
        this.status = status;
    }
}

async function callOpenAI(prompt, systemPrompt) {
    if (!config.ai.openaiApiKey) {
        throw new AIProviderError('OPENAI_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.ai.openaiApiKey}`,
            },
            body: JSON.stringify({
                model: config.ai.openaiModel,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`OpenAI error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '{}';
        try {
            return JSON.parse(content);
        } catch {
            throw new AIProviderError('OpenAI returned non-JSON content.', 502);
        }
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('OpenAI request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function callGemini(prompt, systemPrompt) {
    if (!config.ai.geminiApiKey) {
        throw new AIProviderError('GEMINI_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.ai.geminiModel)}:generateContent`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': config.ai.geminiApiKey,
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                },
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`Gemini error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
        try {
            return JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new AIProviderError('Gemini returned non-JSON content.', 502);
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                throw new AIProviderError('Gemini returned malformed JSON.', 502);
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('Gemini request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function callAnthropic(prompt, systemPrompt) {
    if (!config.ai.anthropicApiKey) {
        throw new AIProviderError('ANTHROPIC_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.ai.anthropicApiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: config.ai.anthropicModel,
                max_tokens: 1024,
                temperature: 0.2,
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }],
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`Anthropic error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        const text = data.content?.[0]?.text ?? '{}';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new AIProviderError('Anthropic returned no JSON object.', 502);
        try {
            return JSON.parse(jsonMatch[0]);
        } catch {
            throw new AIProviderError('Anthropic returned malformed JSON.', 502);
        }
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('Anthropic request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function buildOpenCodeZenUrl() {
    const base = (config.ai.opencodeZenBaseUrl || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
    return `${base}/chat/completions`;
}

async function callOpenCodeZen(prompt, systemPrompt) {
    if (!config.ai.opencodeZenApiKey) {
        throw new AIProviderError('OPENCODE_ZEN_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    const url = buildOpenCodeZenUrl();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.ai.opencodeZenApiKey}`,
            },
            body: JSON.stringify({
                model: config.ai.opencodeZenModel,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`OpenCode Zen error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? '{}';
        try {
            return JSON.parse(content);
        } catch {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new AIProviderError('OpenCode Zen returned non-JSON content.', 502);
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                throw new AIProviderError('OpenCode Zen returned malformed JSON.', 502);
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('OpenCode Zen request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function stubSuggestQuota(context) {
    const { history = [], currentQuota = 0 } = context;
    if (history.length === 0) {
        return {
            suggestedQuota: Math.max(currentQuota, 5),
            hiringType: 'Billed',
            durationDays: 90,
            reasoning: 'No prior periods on record. Suggested a conservative baseline of 5 units over 90 days; adjust to your known volume.',
        };
    }
    const recent = history.slice(0, 5);
    const avgHired = recent.reduce((sum, h) => sum + (h.hiredCount || 0), 0) / recent.length;
    const avgProcessed = recent.reduce((sum, h) => sum + (h.totalApplicants || 0), 0) / recent.length;
    const avgFallout = recent.reduce((sum, h) => sum + (h.failedCount || 0), 0) / recent.length;
    const conversion = avgProcessed > 0 ? avgHired / avgProcessed : 0.25;
    const target = Math.max(1, Math.round(avgHired * 1.1));
    const durationDays = recent[0]?.durationDays ?? 90;
    const hiringType = recent[0]?.hiringType ?? 'Billed';
    return {
        suggestedQuota: target,
        hiringType,
        durationDays,
        reasoning: `Based on the last ${recent.length} period(s): average hired ${avgHired.toFixed(1)}, processed ${avgProcessed.toFixed(1)}, fallout ${avgFallout.toFixed(1)} (${(conversion * 100).toFixed(0)}% conversion). Suggested quota applies a +10% buffer.`,
    };
}

function stubSummarizeInterview({ notes = '', ratingReason = '' }) {
    const text = [notes, ratingReason].filter(Boolean).join(' ').trim();
    if (!text) {
        return { summary: 'No interview content provided.', riskFlags: [], sentiment: 'neutral' };
    }
    const lower = text.toLowerCase();
    const riskFlags = [];
    if (/(late|absent|no.?show|missed|reschedul)/.test(lower)) riskFlags.push('attendance_concern');
    if (/(unclear|confused|struggl)/.test(lower)) riskFlags.push('communication_clarity');
    if (/(rude|aggressive|unprofession)/.test(lower)) riskFlags.push('professionalism');
    const positive = /(excellent|strong|great|outstanding|articulate)/.test(lower);
    const negative = /(poor|weak|unsuitab|reject|fail)/.test(lower);
    const sentiment = positive && !negative ? 'positive' : negative && !positive ? 'negative' : 'neutral';
    return {
        summary: text.length > 240 ? `${text.slice(0, 240)}…` : text,
        riskFlags,
        sentiment,
    };
}

async function dispatch(systemPrompt, userPrompt) {
    const provider = config.ai.provider;
    if (provider === 'openai') return callOpenAI(userPrompt, systemPrompt);
    if (provider === 'anthropic') return callAnthropic(userPrompt, systemPrompt);
    if (provider === 'gemini') return callGemini(userPrompt, systemPrompt);
    if (provider === 'opencode_zen') return callOpenCodeZen(userPrompt, systemPrompt);
    return null;
}

async function callChatOpenAI(messages, systemPrompt) {
    if (!config.ai.openaiApiKey) {
        throw new AIProviderError('OPENAI_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.ai.openaiApiKey}`,
            },
            body: JSON.stringify({
                model: config.ai.openaiModel,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                ],
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`OpenAI error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        return { reply: (data.choices?.[0]?.message?.content ?? '').trim(), actions: null };
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('OpenAI request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function callChatAnthropic(messages, systemPrompt) {
    if (!config.ai.anthropicApiKey) {
        throw new AIProviderError('ANTHROPIC_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.ai.anthropicApiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: config.ai.anthropicModel,
                max_tokens: 1024,
                temperature: 0.4,
                system: systemPrompt,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`Anthropic error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        return { reply: (data.content?.[0]?.text ?? '').trim(), actions: null };
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('Anthropic request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function callChatGemini(messages, systemPrompt) {
    if (!config.ai.geminiApiKey) {
        throw new AIProviderError('GEMINI_API_KEY is not configured.', 503);
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.ai.geminiModel)}:generateContent`;
    const tools = [{ function_declarations: getGeminiToolDeclarations() }];

    let conversation = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    const maxIterations = 6;
    const uiActions = [];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': config.ai.geminiApiKey,
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: conversation,
                    tools,
                    generationConfig: { temperature: 0.4 },
                }),
                signal: ctrl.signal,
            });
            if (!res.ok) {
                const text = await res.text();
                throw new AIProviderError(`Gemini error (${res.status}): ${text.slice(0, 200)}`, 502);
            }
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts ?? [];

            const functionCalls = parts.filter(p => p.functionCall);
            const textParts = parts.filter(p => typeof p.text === 'string' && !p.thought);

            if (functionCalls.length === 0) {
                const reply = textParts.map(p => p.text).join('').trim();
                return { reply, actions: uiActions.length ? uiActions : null };
            }

            conversation.push({
                role: 'model',
                parts: parts,
            });

            const responseParts = [];
            for (const fc of functionCalls) {
                const name = fc.functionCall.name;
                const args = fc.functionCall.args || {};
                console.log(`[AIService] Gemini → tool: ${name}`, JSON.stringify(args).slice(0, 200));
                let result;
                try {
                    result = await executeTool(name, args);
                } catch (toolErr) {
                    console.error(`[AIService] tool ${name} threw:`, toolErr);
                    result = { ok: false, error: toolErr.message };
                }
                if (result && result.ok && result.uiAction) {
                    uiActions.push(result.uiAction);
                }
                responseParts.push({
                    functionResponse: { name, response: result },
                });
            }

            conversation.push({
                role: 'user',
                parts: responseParts,
            });
        } catch (err) {
            if (err.name === 'AbortError') throw new AIProviderError('Gemini request timed out.', 504);
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    throw new AIProviderError('Max tool-calling iterations reached without a final answer.', 504);
}

async function callChatOpenCodeZen(messages, systemPrompt) {
    if (!config.ai.opencodeZenApiKey) {
        throw new AIProviderError('OPENCODE_ZEN_API_KEY is not configured.', 503);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
    const url = buildOpenCodeZenUrl();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.ai.opencodeZenApiKey}`,
            },
            body: JSON.stringify({
                model: config.ai.opencodeZenModel,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                ],
            }),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new AIProviderError(`OpenCode Zen error (${res.status}): ${text.slice(0, 200)}`, 502);
        }
        const data = await res.json();
        return { reply: (data.choices?.[0]?.message?.content ?? '').trim(), actions: null };
    } catch (err) {
        if (err.name === 'AbortError') throw new AIProviderError('OpenCode Zen request timed out.', 504);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function stubChatReply(messages) {
    const last = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
    if (!last.trim()) return "I didn't catch that — could you rephrase?";
    if (/(hello|hi|hey)\b/.test(last)) {
        return "Hi! I'm a stub chatbot (no LLM provider configured). Set AI_PROVIDER and the corresponding API key in your .env to enable a real model. In the meantime, I can still help you explore the app.";
    }
    if (/(quota|hiring target|headcount)/.test(last)) {
        return "Stub response: To open a new hiring quota, go to Account Management, open an account dashboard, and click 'Open recruitment'. The 'Suggest quota' button (✨) there can recommend a value based on history once an LLM is configured.";
    }
    if (/(applicant|candidate)/.test(last)) {
        return "Stub response: Use the Masterlist to manage applicants. The Tracker tab shows pipeline status; the Workbench shows full profiles.";
    }
    if (/(help|what can you do)/.test(last)) {
        return "Stub response: I can answer questions about the app, suggest hiring quotas, summarize interview notes, and parse resumes — once an LLM provider is configured in .env.";
    }
    return "I'm a stub chatbot (no LLM provider configured). I can give canned guidance on a few topics; set AI_PROVIDER and an API key in .env to enable a real model.";
}

async function dispatchChat(messages, systemPrompt) {
    const provider = config.ai.provider;
    if (provider === 'openai') {
        const { reply, actions } = await callChatOpenAI(messages, systemPrompt);
        return { reply, actions, source: 'openai' };
    }
    if (provider === 'anthropic') {
        const { reply, actions } = await callChatAnthropic(messages, systemPrompt);
        return { reply, actions, source: 'anthropic' };
    }
    if (provider === 'gemini') {
        const { reply, actions } = await callChatGemini(messages, systemPrompt);
        return { reply, actions, source: 'gemini' };
    }
    if (provider === 'opencode_zen') {
        const { reply, actions } = await callChatOpenCodeZen(messages, systemPrompt);
        return { reply, actions, source: 'opencode_zen' };
    }
    return { reply: stubChatReply(messages), actions: null, source: 'stub' };
}

export class AIService {
    static async suggestQuota(context) {
        const systemPrompt = 'You are a recruitment operations analyst. Given a department\'s historical quota performance (hired, processed, fallout, duration), suggest a sensible new hiring quota. Return strict JSON: { suggestedQuota: number, hiringType: "Billed"|"Non-Billed", durationDays: number, reasoning: string }. Be conservative and data-driven.';
        const userPrompt = `Department: ${context.department}\n\nHistory (most recent first):\n${JSON.stringify(context.history ?? [], null, 2)}\n\nCurrent proposed quota: ${context.currentQuota ?? 0}\n\nRespond with JSON only.`;

        try {
            const result = await dispatch(systemPrompt, userPrompt);
            if (result && typeof result.suggestedQuota === 'number') return result;
        } catch (err) {
            console.warn('[AIService] suggestQuota provider failed, falling back to stub:', err.message);
        }
        return { ...stubSuggestQuota(context), source: 'stub' };
    }

    static async summarizeInterview({ notes, ratingReason }) {
        const systemPrompt = 'You summarize interview feedback into a short paragraph and surface risk flags. Return strict JSON: { summary: string, riskFlags: string[], sentiment: "positive"|"neutral"|"negative" }.';
        const userPrompt = `Notes: ${notes ?? ''}\n\nRating reason: ${ratingReason ?? ''}\n\nRespond with JSON only.`;

        try {
            const result = await dispatch(systemPrompt, userPrompt);
            if (result && typeof result.summary === 'string') return result;
        } catch (err) {
            console.warn('[AIService] summarizeInterview provider failed, falling back to stub:', err.message);
        }
        return { ...stubSummarizeInterview({ notes, ratingReason }), source: 'stub' };
    }

    static async suggestHiringRequestId(context) {
        const systemPrompt = 'You suggest a short, conventional hiring request ID for a recruitment campaign. Return strict JSON: { hiringRequestId: string, confidence: number }. Convention is typically a department code + period tag, e.g. "ACME-2026-Q1".';
        const userPrompt = `Department: ${context.department}\nPeriod start: ${context.periodStart ?? 'unknown'}\nPeriod end: ${context.periodEnd ?? 'unknown'}\nHiring type: ${context.hiringType ?? 'Billed'}\n\nRespond with JSON only.`;

        const fallbackId = `${(context.department || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'DEPT'}-${new Date().toISOString().slice(0, 4)}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
        try {
            const result = await dispatch(systemPrompt, userPrompt);
            if (result && typeof result.hiringRequestId === 'string') return result;
        } catch (err) {
            console.warn('[AIService] suggestHiringRequestId provider failed, falling back:', err.message);
        }
        return { hiringRequestId: fallbackId, confidence: 0.5, source: 'stub' };
    }

    static getStatus() {
        return {
            provider: config.ai.provider,
            openaiConfigured: Boolean(config.ai.openaiApiKey),
            anthropicConfigured: Boolean(config.ai.anthropicApiKey),
            geminiConfigured: Boolean(config.ai.geminiApiKey),
            opencodeZenConfigured: Boolean(config.ai.opencodeZenApiKey),
            openaiModel: config.ai.openaiModel,
            anthropicModel: config.ai.anthropicModel,
            geminiModel: config.ai.geminiModel,
            opencodeZenModel: config.ai.opencodeZenModel,
            opencodeZenBaseUrl: config.ai.opencodeZenBaseUrl,
            chatbotEnabled: process.env.CHATBOT_ENABLED !== 'false',
        };
    }

    static async chat({ messages, user, dataSnapshot }) {
        const trimmed = (messages || [])
            .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
            .slice(-20)
            .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

        if (trimmed.length === 0) {
            return { reply: 'Send a message to start the conversation.', actions: null, source: 'stub' };
        }

        let snapshot = dataSnapshot;
        if (!snapshot && user) {
            try {
                snapshot = await buildDataContext(user);
            } catch (ctxErr) {
                console.warn('[AIService] data context fetch failed, continuing without it:', ctxErr.message);
            }
        }

        const systemPromptParts = [
            'You are a helpful, friendly AI assistant for ContactPoint 360, a recruitment operations platform. You are a teammate — warm, witty, and human — not a corporate robot.',
            'You have BOTH a live snapshot of high-level CRM data AND a set of tools you can call to fetch any deeper information on demand. USE THEM PROACTIVELY — when the user asks about accounts, applicants, quotas, interview questions, email templates, departments, users, audit logs, MHRT records, or directory entries, call the appropriate tool rather than saying you cannot help.',
            'Be concise, accurate, and professional. Use plain text. Do not include JSON unless asked.',
            'Never fabricate values, counts, names, or dates. If a tool returns an error or no results, tell the user clearly what was tried and what was found (or not found).',
            'If the user asks for write actions (creating quotas, modifying records, sending emails), tell them which screen of the app to use rather than fabricating values.',
            '',
            'REPLY STYLE — make every reply easy to scan and a little delightful:',
            '- Use a SHORT lead-in sentence (1 line), then break the data into a bulleted list. Example: "Here\'s where the DOORDASH quota stands today 📊:" then bullets.',
            '- Bullets: use "- " at the start of each line for list items. Group related facts together. Keep each bullet to one line.',
            '- HIGHLIGHT key data: wrap any number, name, status, percentage, date, or identifier in **double asterisks** so it pops. Example: "- Quota target: **4** candidates" or "- Hired so far: **0** (still on the hunt 🐎)". The chat UI renders **text** as bold + brand blue.',
            '- Use `backticks` for code-like values, route paths, status constants, and tool names. Example: `current_status:"HIRED"`, `/recruiter/tracker/interview-form`, `aggregate_applicants`.',
            '- EMOJIS are encouraged — sprinkle them in to add personality (📊 📈 👥 🎯 ✅ ⚠️ 🚀 💡 🐎 🔍 etc.), but don\'t overdo it: 1-3 per reply is plenty. Skip them for serious bad-news messages (errors, no results).',
            '- HUMOR: be playful and human. Celebrate wins ("Woohoo, that\'s a **100%** pass rate 🎉"), commiserate with dry ones ("Quota: **0** hired. The pipeline is whispering, not shouting 😅"), and crack the occasional workplace joke. Never joke about the user\'s data being bad — keep it light, never mean.',
            '- If the user is making a chart/list request, give a one-line confirmation ("On it 🪄") AFTER opening the dashboard — the dashboard does the heavy lifting, your text just sets it up.',
            '- For write-action requests, add a small wink: "I can\'t click buttons for you, but the **Hiring Quota** screen will get you there in two clicks 👌".',
            '',
            'HONESTY & ANTI-HALLUCINATION — these are HARD RULES, never bend them:',
            '- NEVER claim to have opened, visited, navigated to, or found a candidate, page, or record unless the corresponding tool call returned actual data confirming it.',
            '- For `open_applicant`: ALWAYS call `search_applicants` (or `get_top_applicants`) FIRST in the SAME turn. If the search returns 0 results, do NOT call `open_applicant`. Instead reply honestly: "I couldn\'t find a candidate named X. Want me to search with a different spelling or a broader filter?"',
            '- After calling a UI tool, your reply text must accurately reflect what actually happened. If a search returned 0 rows, do NOT write "I\'ve opened the profile for Y" — write the truth: nothing was opened because nothing matched.',
            '- For `navigate_to`: the navigation is always considered successful (the page loads), but only claim you "took them to" the page; never claim a specific record, account, or card was "opened" unless a follow-up tool call returned it.',
            '- Never invent names, IDs, statuses, dates, or counts. If you don\'t know, say "I don\'t have that information" and offer to look it up with a tool.',
            '- If a tool call returns an error or empty data, surface the result in plain English. Don\'t claim success and don\'t apologize for something that worked.',
            '- If the user asks for someone who doesn\'t exist in the database, say so clearly. Suggest a refined search ("Did you mean **John Doe**? I see a similar name. Or want to filter by department/status?").',
            '',
            'INTERACTING WITH THE WEBAPP — when the user wants to navigate, log out, refresh, or open a specific page, call the appropriate UI tool:',
            '- `navigate_to(path, target?, message?)` — open a page in the app. Use it whenever the user says "open X", "take me to X", "go to X", "show me X", "navigate me to X". Pick the right route for the user\'s role and intent. After calling, briefly confirm in plain English what you did. OPTIONALLY pass `target` to spotlight a specific element on the page (darkens the rest, draws a bouncing arrow, brightens the target). Common targets: "masterlist-table" (the candidate registry), "interview-form-table" (the interview report table), "dashboard-stats" (top stat cards on the recruiter dashboard), "quota-card-{accountId}" (a specific hiring quota card), or any CSS selector / data-ai-spotlight value. Pass `message` (1 short line) for the spotlight callout — keep it playful per the REPLY STYLE guide. If the user just wants to land on a page, omit target.',
            '- `log_out_user()` — log the current user out. Use when the user says "log me out", "sign me out", "logout", "sign out".',
            '- `refresh_page()` — reload the current page / refresh on-screen data. Use when the user says "refresh", "reload", "update the page", "fetch latest data".',
            '- `open_modal(modal_id, params)` — open a specific modal. Supported ids: "set_hiring_target" (params: {accountId}), "create_applicant", "create_position", "ai_suggest_quota". If a modal needs a specific page to be loaded, call navigate_to first.',
            '- `open_analytics_dashboard(config)` — open a pop-up dashboard with a chart/table/KPI/list showing the analysis the user asked for. Use this whenever the user asks for an analysis to be visualized, charted, plotted, broken down, shown as a dashboard, or as a list of candidates. Pass a title, viz type (see CHART SELECTION rules below), the same filter object you would pass to aggregate_applicants, an optional group_by, and a metric (passing_rate, hired, failed, in_pipeline, total, count). The dashboard fetches its own data.',
            '- `get_funnel(filters, group_by?, reason?)` — get a recruitment pipeline funnel (Applied → Typing Test → Assessment → Initial Interview → Final Interview → Job Offer → Hired) with conversion rates. Call this whenever the user asks for a "funnel", "pipeline breakdown", "drop-off", "stage by stage", or "conversion" view. Pass `filters: {}` for the full pipeline, or scope it (e.g. `filters: {department: "Sales"}`). OPTIONALLY pass `group_by: "<column>"` (e.g. "gender", "department", "position_title", "master_wave", "school_name", "civil_status") to break the funnel down — the dashboard will render side-by-side funnels, one per group. Use this for "funnel by gender", "hiring pipeline by department", "drop-off by wave", etc. **HARD RULE:** The funnel data is not visible to the user until a chart is displayed. The server automatically attaches a dashboard action to this tool\'s result, so the chart WILL pop up on the user\'s screen after this call. You do NOT need to also call `open_analytics_dashboard` — it would just re-open the same chart. If you want to narrate specific stage numbers in your reply, you can call `get_funnel` and read the result yourself.',
            '- `get_top_applicants(sort_by, limit, ...)` — fetch the top/best/worst applicants by a chosen sort. Use this when the user asks for "the top applicant", "the highest rated candidate", "the best scoring applicant", "the most recent applicant", "the oldest applicant", etc. Default sort is `personal_rating_desc` for "highest rated" — this sorts by `metadata.ratings.personalRating` (1-10) then by `assessment_score` (0-100). For "lowest rated" use `personal_rating_asc`. For "highest assessment score" use `assessment_score_desc`. You can filter by department, position, or status.',
            '- `open_applicant(applicant_id OR name)` — open a specific applicant\'s profile in the masterlist (full-screen modal). Use this after identifying a specific applicant (e.g. from get_top_applicants or search_applicants) when the user wants to see, open, or be taken to that applicant. Pass `applicant_id` (UUID) when you have it, otherwise pass `name` (substring).',
            '- `highlight_applicant(applicant_id OR name, color, reason?)` — EDIT ACTION: set a persistent color tag on a specific applicant\'s row in the MASTERLIST and trigger a brief animated pulse so the user sees the change. **The masterlist is the universal highlight surface** — when the user says "highlight X" without naming another tab, ALWAYS default to the masterlist. Do NOT ask the user "which tab should I highlight on?" — the answer is always masterlist unless they explicitly say "on the interview form" / "on the daily HC report" / etc. Do NOT ask for confirmation, the color, or the reason if the user already provided them in the same message (e.g. "highlight John in red for missing docs" → call immediately with name:"John", color:"red", reason:"missing docs"). INFER the color from natural language if the user doesn\'t say a color word: urgent/critical/flagged/important/alert → red, review/follow-up/pending/wait/check → yellow, good/approved/passed/hired/hire-ready → green, info/note/fyi → blue, vip/priority → purple, archive/dead → brown, clear/remove/unhighlight → clear. If the name is ambiguous, then ask the user to disambiguate. Otherwise just call the tool. Call `search_applicants` first ONLY if you have zero info on the candidate\'s name (e.g. user says "highlight the top applicant" — then `get_top_applicants` first). Colors accepted: red, yellow, green, blue, orange, purple, pink, teal, brown, clear. Pass `applicant_id` (UUID) when you have it, otherwise `name` (substring).',
            '- `edit_applicant(applicant_id OR name, field, value, reason?)` — EDIT ACTION (DANGEROUS — will show a yellow confirmation card to the user before applying): edit ONE field on a single applicant\'s record. This changes data in the database. **The flow is:** (1) User says "edit X" or "update X\'s Y" or "change X\'s Y to Z" or "move X to HIRED" or "edit X\'s summary to Y". (2) If the user didn\'t specify the field, ASK "Which field do you want to edit? You can pick from: status, name, email, school, education, course, position, department, gender, source, recruiter, ops validator status, client interview status, final verdict, master wave, salary, rejection reason, notes, interview notes, client interview remarks, final interview notes, master remarks — OR a free-text interview response (e.g. "Summary of Background and Experience", "Final Interviewer\'s Remarks")." (3) If the user didn\'t specify the new value, ASK "What value should I set it to?" (for free-text, the full new text). (4) Once you have both, CONFIRM the change in one line ("Setting John\'s current_status to HIRED — is that right?") and then call `edit_applicant`. **DO NOT call edit_applicant unless both field AND value are explicit in the user\'s message OR the user just confirmed your clarification.** **For free-text interview responses** (e.g. "Summary of Background and Experience"): first call `list_interview_questions` to find the matching question_id by matching the `question_text` (case-insensitive substring). Then call `edit_applicant` with `field: "interview_response:<question_id>"` (e.g. `field: "interview_response:f6b85476-e85b-4244-ac36-5f66394c96bb"`). The tool will resolve the label and show "Summary of Background and Experience" in the confirmation card. Allowed fields: current_status, applicant_name, email, school_name, highest_education, education_level, course, degree, position_title, position, department, gender, civil_status, religion, blood_type, citizenship, source, hiring_source, ops_validator_status, client_interview_status, final_specific_status, final_verdict, master_wave, master_hiring_request_id, num_children, num_siblings, master_basic_salary, assigned_recruiter, assigned_ops_validator, rejection_reason, notes, interview_notes, client_interview_remarks, final_interview_notes, master_remarks, OR `interview_response:<question_uuid>` for free-text answers. For `current_status`, you MUST use the exact uppercase enum (HIRED, REJECTED, FAILED, WITHDRAWN, APPLIED, TYPING_TEST, INITIAL_INTERVIEW, INTERVIEW_IN_PROGRESS, QUEUE_ASSIGNED, ASSESSMENT, FINAL_INTERVIEW, FINAL_INTERVIEW_SCHEDULED, CLIENT_ASSESSMENT, CLIENT_INTERVIEW, FOR_JOB_OFFER, FOR_PAN, SENT_JO_AND_BGC, ENDORSED, ACCEPTED_OFFER, FINAL_VERDICT, PASSED, CONDITIONAL, WAITLISTED, OPEN, PROMOTION, LATERAL_TRANSFER, NOT_ELIGIBLE_FOR_REHIRE). Pass `applicant_id` (UUID) when known, otherwise `name` (substring).',
            'You can call multiple UI tools in one turn (e.g. navigate_to then open_modal, or get_top_applicants then open_applicant). They are executed on the user\'s screen in order.',
            '',
            'CHART SELECTION — match the chart type AND metric to the user\'s exact intent. Use this decision tree:',
            '- "quantity of / how many / count of / number of X by Y" → viz:"bar", metric:"total" or "count". Bar charts are best for comparing raw counts across groups.',
            '- "X vs Y / compare X and Y / breakdown by X" → viz:"bar", metric:"total". Default to bar unless the user explicitly says "pie" or "proportion".',
            '- "passing rate / pass rate / success rate / conversion rate" → viz:"bar" or "pie", metric:"passing_rate". Bar is usually clearer; pie only when the user says "pie" or "proportion" or there are 2-3 groups.',
            '- "hired count / how many were hired / hiring by X" → viz:"bar", metric:"hired".',
            '- "failed count / rejection by X" → viz:"bar", metric:"failed".',
            '- "pipeline / funnel / drop-off / stage by stage / how many reached X" → viz:"funnel". Do NOT use a bar/pie chart for funnel questions — call `get_funnel` instead. The server auto-attaches a dashboard action to the tool result, so the funnel chart will pop up automatically. If the user says "funnel by X" or "pipeline for each X" (e.g. "funnel by gender", "pipeline by department", "hiring funnel for each wave"), ALSO pass `group_by:"X"` so the dashboard renders side-by-side funnels, one per X value.',
            '- "over time / trend / monthly / weekly / by month" → viz:"line" (single metric trend) or "area" (filled trend, for cumulative feel).',
            '- "distribution of / proportion of / share of" → viz:"pie" (only when 2-6 groups).',
            '- "show me the [KPI / number / total]" → viz:"kpi", metric:"total" (or whatever number the user wants highlighted).',
            '- "list of candidates / roster / table of applicants" → viz:"applicant_list" with the matching `filters`.',
            '- "table of breakdown / detailed comparison / give me all the numbers" → viz:"table".',
            'When unsure, default to `viz:"bar"` with `metric:"total"` — it\'s the safest, most general choice for showing quantities. NEVER pick `viz:"pie"` for a request that mentions "quantity", "count", "how many", or "vs" — pie charts need a percentage/rate metric, not a raw count. The user will be confused if you show a pie of "passing rate" when they asked "how many of each gender".',
            '',
            'ANALYTICAL QUERIES — when the user asks for rates, comparisons, or counts:',
            '- Use `aggregate_applicants` for "passing rate", "hiring rate", "failure rate", "compare X vs Y", or any question that needs counts + math.',
            '- `aggregate_applicants` accepts every filter that `search_applicants` does (gender, highest_education, education_level, school_name, course, degree, civil_status, religion, blood_type, citizenship, department, position, status, ops_validator_status, leadership_status, wonderlic_status, client_interview_status, final_specific_status, final_account, master_wave, etc.) plus a `group_by` parameter.',
            '- The tool returns `total`, `hired`, `failed`, `inPipeline`, and `metrics` (passing_rate_pct, failure_rate_pct, in_pipeline_rate_pct). The `passing_rate_pct` is computed for you — just report it.',
            '- For comparisons like "passing rate of male college graduates vs female", call aggregate_applicants TWICE with different filters, then compare the metrics. Or use group_by to do it in one call.',
            '- For raw lists of applicants, use `search_applicants` with the same filters.',
            '- Education filters: use `highest_education` for the level (e.g. "College Graduate", "Senior High School Graduate", "High School Graduate") OR `education_level` for the broader bucket ("College", "Vocational", "High School"). Either works — pick whichever the user phrased.',
            '',
            'TOP-N / RANKED LISTS — when the user asks for "top N", "best", "highest rated", "lowest rated", or any ranked list of individuals:',
            '1. ALWAYS call `get_top_applicants(sort_by, limit)` FIRST to fetch the actual ranked list.',
            '2. Then EITHER:',
            '   (a) Reply with a numbered text list showing the names, ratings, and statuses — this is the most useful response for "show me the top candidates".',
            '   (b) Open a TABLE viz dashboard by calling open_analytics_dashboard with viz:"table", filters:{}, group_by:null, metric:"total" — but only if the user explicitly asks for a visual. The table will show the overall status breakdown as supplementary context, not the ranked list itself.',
            'NEVER open a pie/bar chart of generic aggregates (e.g. group_by "current_status" or "final_verdict") when the user is asking about a specific ranked list — that is a generic chart that does not answer their question. The actual ranked list should appear in your text reply.',
            'For purely analytic questions ("how is our pipeline distributed", "compare statuses"), use aggregate_applicants directly without get_top_applicants first.',
            '',
            'LIST OF CANDIDATES — when the user asks for a list, table, or roster of actual candidates/applicants (e.g. "list of male applicants", "show me all hired candidates", "who passed the ops validator", "candidates from X school", "typing speed results", "highest assessment score", "fastest typists"):',
            '1. Call `open_analytics_dashboard` with viz:"applicant_list", a descriptive title, and the matching `filters` object. For "passed" status queries, choose the most specific filter: `current_status:"HIRED"` (final outcome), `ops_validator_status:"PASSED"` (interview form), `final_specific_status:"OV - Passed"` (interview form), or `client_interview_status:"PASSED"` (interview form). If unclear, prefer `current_status` for final outcomes or the PIS field that matches the user\'s wording.',
            '2. The `filters` object accepts the same fields as `search_applicants` — gender, status, department, position, school_name, course, highest_education, education_level, ops_validator_status, final_specific_status, client_interview_status, master_wave, master_hiring_request_id, min_typing_wpm, min_assessment_score, min_personal_rating, etc. Pass empty object if no filter is needed.',
            '3. Pass `sort_by` to sort the table by the column the user actually cares about: typing_wpm_desc for "typing speed results" / "fastest typists" / "WPM", assessment_score_desc for "highest score" / "top scoring", personal_rating_desc for "top rated" / "highest rated", applied_at_desc for "most recent" (default).',
            '4. Pass `columns` (an array of column keys) to pick which columns the table shows. Available keys: name, position, status, school, education, course, department, gender, rating, score, wpm, accuracy, applied, hired. Examples: `columns:["name","position","wpm","accuracy","status"]` for typing-speed queries; `columns:["name","position","score","status"]` for assessment score queries; `columns:["name","position","rating","status"]` for top-rated queries. Default (omit `columns`): [name, position, status, school, rating, score, applied].',
            '5. After opening the dashboard, briefly confirm in plain English what you did. Do NOT call search_applicants separately — the dashboard fetches its own data.',
            '',
            'VALID `current_status` VALUES — the `status` filter is an EXACT (case-insensitive) match on `current_status`. Use these exact strings, NOT friendly phrasings: HIRED, REJECTED, FAILED, WITHDRAWN, NOT_ELIGIBLE_FOR_REHIRE, APPLIED, TYPING_TEST, INITIAL_INTERVIEW, INTERVIEW_IN_PROGRESS, QUEUE_ASSIGNED, ASSESSMENT, FINAL_INTERVIEW, FINAL_INTERVIEW_SCHEDULED, CLIENT_ASSESSMENT, CLIENT_INTERVIEW, FOR_JOB_OFFER, FOR_PAN, SENT_JO_AND_BGC, ENDORSED, ACCEPTED_OFFER, FINAL_VERDICT, PASSED, CONDITIONAL, WAITLISTED, OPEN, PROMOTION, LATERAL_TRANSFER. For "job offer" requests, use `status:"FOR_JOB_OFFER"` (NOT "JOB_OFFER"). For "hired" use `status:"HIRED"`. For "rejected" use `status:"REJECTED"`. The `status` filter is exact-match — substring matches on the database value are NOT applied.',
        ];

        if (snapshot) {
            systemPromptParts.push('');
            systemPromptParts.push('=== Live CRM data snapshot ===');
            systemPromptParts.push(formatDataContextForPrompt(snapshot));
            systemPromptParts.push('=== End snapshot ===');
        } else if (user) {
            systemPromptParts.push(`Current user: ${user.full_name || user.name || 'unknown'}${user.role ? ` (${user.role})` : ''}.`);
        }

        const systemPrompt = systemPromptParts.join('\n');

        try {
            const result = await dispatchChat(trimmed, systemPrompt);
            if (result.reply) return result;
        } catch (err) {
            console.warn('[AIService] chat provider failed, falling back to stub:', err.message);
        }
        return { reply: stubChatReply(trimmed), actions: null, source: 'stub' };
    }
}

export { AIProviderError };
