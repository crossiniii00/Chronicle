import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Sparkles, X, MessageSquare, Loader2, CheckCircle2, ExternalLink, LogOut, RefreshCw, LayoutGrid, BarChart3, User, Volume2, VolumeX, ChevronDown, Mic, MicOff, Ear, EarOff } from 'lucide-react';
import { AIService, type ChatMessage, type UIAction } from '@/services/AIService';
import { apiClient } from '@/utils/apiClient';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/formatters';

const STORAGE_KEY = 'ai_chatbot_history_v1';
const MAX_HISTORY = 40;
const VOICE_KEY = 'ai_chatbot_voice_v1';
const VOICE_PRESET_KEY = 'ai_chatbot_voice_preset_v1';
const ALWAYS_ON_KEY = 'ai_chatbot_always_on_v1';

type VoicePreset = 'jarvis' | 'natasha' | 'auto' | 'elevenlabs';

const VOICE_PRESETS: { key: VoicePreset; label: string; hint: string; provider: 'web' | 'elevenlabs' }[] = [
    { key: 'jarvis', label: 'Jarvis', hint: 'Microsoft Guy — en-GB, deep male (browser)', provider: 'web' },
    { key: 'natasha', label: 'Natasha', hint: 'Microsoft Natasha — en-AU, female (browser)', provider: 'web' },
    { key: 'auto', label: 'Auto', hint: 'Pick the best available (browser)', provider: 'web' },
    { key: 'elevenlabs', label: 'ElevenLabs', hint: 'George — warm British storyteller (cloud)', provider: 'elevenlabs' },
];

function pickJarvisVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;
    const score = (v: SpeechSynthesisVoice) => {
        const name = v.name.toLowerCase();
        const lang = (v.lang || '').toLowerCase();
        let s = 0;
        if (lang === 'en-gb' || lang.startsWith('en-gb')) s += 80;
        else if (lang === 'en-ie' || lang.startsWith('en-ie')) s += 30;
        if (/\bguy\b/.test(name)) s += 200;
        if (/\bryan\b/.test(name)) s += 180;
        if (/\bdavis\b/.test(name)) s += 150;
        if (/\b(james|roger|george|thomas|arthur|oliver|harry|william|charlie)\b/.test(name)) s += 60;
        if (/\b(male|man|boy|guy)\b/.test(name)) s += 40;
        if (/male/.test(name) && /female/.test(name) === false) s += 20;
        if (name.includes('microsoft')) s += 5;
        if (name.includes('natural')) s += 2;
        if (v.default) s += 1;
        return s;
    };
    const ranked = voices.slice().sort((a, b) => score(b) - score(a));
    return ranked[0] && score(ranked[0]) > 0 ? ranked[0] : null;
}

function pickNatashaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;
    const score = (v: SpeechSynthesisVoice) => {
        const name = v.name.toLowerCase();
        const lang = (v.lang || '').toLowerCase();
        let s = 0;
        if (name.includes('natasha') || name.includes('nattalia') || name.includes('natalia')) s += 200;
        if (lang === 'en-au' || lang.startsWith('en-au')) s += 80;
        if (lang === 'en-gb' || lang.startsWith('en-gb')) s += 30;
        if (lang.startsWith('en')) s += 10;
        if (/female|girl|woman|zira|jenny|aria|samantha|karen|moira|tessa|kathryn|libby|mary|serena/i.test(name)) s += 30;
        if (name.includes('microsoft')) s += 5;
        if (name.includes('natural')) s += 2;
        if (v.default) s += 1;
        return s;
    };
    const ranked = voices.slice().sort((a, b) => score(b) - score(a));
    return ranked[0] && score(ranked[0]) > 0 ? ranked[0] : null;
}

function pickAutoVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;
    const score = (v: SpeechSynthesisVoice) => {
        const name = v.name.toLowerCase();
        const lang = (v.lang || '').toLowerCase();
        let s = 0;
        if (name.includes('microsoft')) s += 10;
        if (name.includes('natural')) s += 5;
        if (lang.startsWith('en')) s += 8;
        if (v.default) s += 1;
        return s;
    };
    const ranked = voices.slice().sort((a, b) => score(b) - score(a));
    return ranked[0] || null;
}

function pickVoiceForPreset(preset: VoicePreset, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (preset === 'jarvis') return pickJarvisVoice(voices) || pickNatashaVoice(voices) || pickAutoVoice(voices);
    if (preset === 'natasha') return pickNatashaVoice(voices) || pickJarvisVoice(voices) || pickAutoVoice(voices);
    return pickAutoVoice(voices) || pickJarvisVoice(voices) || pickNatashaVoice(voices);
}

function stripEmojis(text: string): string {
    return text
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .replace(/[\u2600-\u27BF]/g, '')
        .replace(/[\u2300-\u23FF]/g, '')
        .replace(/[\u2B00-\u2BFF]/g, '')
        .replace(/[\u3030\u303D\u3297\u3299]/g, '')
        .replace(/[\uFE0F\uFE0E\u200D]/g, '');
}

function stripMarkdownForSpeech(text: string): string {
    return stripEmojis(text)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^[ \t]*[-*]\s+/gm, '')
        .replace(/^[ \t]*\d+\.\s+/gm, '')
        .replace(/[•●○]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;:!?])/g, '$1')
        .trim();
}

const SUGGESTIONS: { label: string; prompt: string }[] = [
    { label: 'Passing rate by sex', prompt: 'Show me the passing rate by sex as a chart.' },
    { label: 'Open masterlist', prompt: 'Open the masterlist for me.' },
    { label: 'Hiring funnel', prompt: 'Open a dashboard of the hiring funnel broken down by status.' },
    { label: 'Test dashboard popup', prompt: '__test_dashboard__' },
    { label: 'Log me out', prompt: 'Log me out.' },
];

const WELCOME: ChatMessage = {
    role: 'assistant',
    content: "Hey there 👋 I'm your AI sidekick for ContactPoint 360.\n\nI can answer questions about your data, pop open charts and candidate lists, navigate you around the app, or just chat. Try a suggestion below — or ask me anything!",
};

interface PersistedState {
    messages: ChatMessage[];
    open: boolean;
}

const loadPersisted = (): PersistedState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { messages: [WELCOME], open: false };
        const parsed = JSON.parse(raw);
        return {
            messages: Array.isArray(parsed?.messages) && parsed.messages.length > 0 ? parsed.messages.slice(-MAX_HISTORY) : [WELCOME],
            open: Boolean(parsed?.open),
        };
    } catch {
        return { messages: [WELCOME], open: false };
    }
};

export function AIChatbot() {
    const [open, setOpen] = useState<boolean>(() => loadPersisted().open);
    const [messages, setMessages] = useState<ChatMessage[]>(() => loadPersisted().messages);
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pendingActions, setPendingActions] = useState<UIAction[]>([]);
    const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem(VOICE_KEY) === '1'; } catch { return false; }
    });
    const [voicePreset, setVoicePreset] = useState<VoicePreset>(() => {
        try {
            const v = localStorage.getItem(VOICE_PRESET_KEY);
            if (v === 'jarvis' || v === 'natasha' || v === 'auto') return v;
        } catch { /* ignore */ }
        return 'jarvis';
    });
    const [voicePickerOpen, setVoicePickerOpen] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const spokenMessageRef = useRef<string | null>(WELCOME.content);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const spokenMessageContentRef = useRef<string | null>(null);
    const voicePickerRef = useRef<HTMLDivElement>(null);

    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [sending, setSending] = useState(false);
    const sendingRef = useRef(false);
    const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
    const recognitionRef = useRef<any>(null);
    const listeningRef = useRef(false);
    const [alwaysOn, setAlwaysOn] = useState<boolean>(() => {
        try { return localStorage.getItem(ALWAYS_ON_KEY) === '1'; } catch { return false; }
    });
    const alwaysOnRef = useRef(alwaysOn);
    const restartTimerRef = useRef<number | null>(null);
    const inputAreaRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore(state => state.logout);

    useEffect(() => {
        alwaysOnRef.current = alwaysOn;
        try { localStorage.setItem(ALWAYS_ON_KEY, alwaysOn ? '1' : '0'); } catch { /* ignore */ }
    }, [alwaysOn]);

    useEffect(() => {
        try {
            const trimmed = messages.slice(-MAX_HISTORY);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: trimmed, open }));
        } catch {
            // localStorage may be unavailable; non-fatal
        }
    }, [messages, open]);

    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [open, messages, pendingActions]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        const refresh = () => {
            const list = synth.getVoices();
            if (list && list.length > 0) setVoices(list);
        };
        refresh();
        synth.addEventListener?.('voiceschanged', refresh);
        return () => {
            synth.removeEventListener?.('voiceschanged', refresh);
        };
    }, []);

    useEffect(() => {
        if (!open && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [open]);

    useEffect(() => {
        if (!voiceEnabled || !open) return;
        const last = messages[messages.length - 1];
        if (!last || last.role !== 'assistant') return;
        if (spokenMessageRef.current === last.content) return;
        spokenMessageRef.current = last.content;
        const text = stripMarkdownForSpeech(last.content);
        if (!text.trim()) return;

        if (voicePreset === 'elevenlabs') {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            const contentSnapshot = last.content;
            AIService.synthesizeSpeech({ text })
                .then(blob => {
                    if (spokenMessageRef.current !== contentSnapshot) return;
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    currentAudioRef.current = audio;
                    audio.onended = () => {
                        URL.revokeObjectURL(url);
                        if (currentAudioRef.current === audio) currentAudioRef.current = null;
                    };
                    audio.onerror = () => {
                        URL.revokeObjectURL(url);
                        if (currentAudioRef.current === audio) currentAudioRef.current = null;
                        console.error('[AIChatbot] ElevenLabs audio playback error');
                    };
                    void audio.play().catch(err => {
                        console.error('[AIChatbot] ElevenLabs audio play() failed', err);
                    });
                })
                .catch(err => {
                    const msg = err instanceof Error ? err.message : 'TTS failed';
                    console.error('[AIChatbot] ElevenLabs TTS request failed', err);
                    console.warn('[AIChatbot] ElevenLabs unavailable, falling back to web speech:', msg);
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        const synth = window.speechSynthesis;
                        synth.cancel();
                        const utter = new SpeechSynthesisUtterance(text);
                        utter.lang = 'en-GB';
                        synth.speak(utter);
                    }
                });
            return;
        }

        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voice = pickVoiceForPreset(voicePreset, voices);
        if (voice) {
            utter.voice = voice;
            utter.lang = voice.lang || 'en-GB';
        } else {
            utter.lang = voicePreset === 'natasha' ? 'en-AU' : 'en-GB';
        }
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.volume = 1.0;
        synth.speak(utter);
    }, [messages, voiceEnabled, open, voices, voicePreset]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    const toggleVoice = useCallback(() => {
        setVoiceEnabled(prev => {
            const next = !prev;
            try { localStorage.setItem(VOICE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
            if (!next) {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
                if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    currentAudioRef.current = null;
                }
            }
            return next;
        });
    }, []);

    const choosePreset = useCallback((preset: VoicePreset) => {
        setVoicePreset(preset);
        try { localStorage.setItem(VOICE_PRESET_KEY, preset); } catch { /* ignore */ }
        setVoicePickerOpen(false);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        if (voiceEnabled) {
            const last = messages[messages.length - 1];
            if (last && last.role === 'assistant') {
                spokenMessageRef.current = null;
                setMessages(prev => [...prev]);
            }
        }
    }, [voiceEnabled, messages]);

    useEffect(() => {
        if (!voicePickerOpen) return;
        const onDown = (e: MouseEvent) => {
            if (voicePickerRef.current && !voicePickerRef.current.contains(e.target as Node)) {
                setVoicePickerOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setVoicePickerOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [voicePickerOpen]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            setSpeechSupported(false);
            return;
        }
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 1;

        rec.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) final += res[0].transcript;
                else interim += res[0].transcript;
            }
            if (interim) setInterimTranscript(interim);
            if (final) {
                setInterimTranscript('');
                setInput(prev => {
                    const next = prev ? `${prev} ${final}`.trim() : final;
                    return next;
                });
            }
        };
        rec.onerror = (event: any) => {
            console.warn('[AIChatbot] speech error', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setSpeechSupported(false);
            }
            listeningRef.current = false;
            setIsListening(false);
            setInterimTranscript('');
        };
        rec.onend = () => {
            listeningRef.current = false;
            setIsListening(false);
            setInterimTranscript('');
            window.setTimeout(() => {
                setInput(prev => {
                    const text = prev.trim();
                    if (!text || sendingRef.current) return prev;
                    const send = sendMessageRef.current;
                    if (send) window.setTimeout(() => void send(text), 0);
                    return '';
                });
                if (alwaysOnRef.current && recognitionRef.current && !sendingRef.current) {
                    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
                    restartTimerRef.current = window.setTimeout(() => {
                        restartTimerRef.current = null;
                        if (alwaysOnRef.current && recognitionRef.current && !listeningRef.current) {
                            try {
                                recognitionRef.current.start();
                                listeningRef.current = true;
                                setIsListening(true);
                            } catch (e) {
                                console.warn('[AIChatbot] always-on restart failed', e);
                            }
                        }
                    }, 1500);
                }
            }, 120);
        };

        recognitionRef.current = rec;
        return () => {
            try { rec.abort(); } catch { /* ignore */ }
            recognitionRef.current = null;
        };
    }, []);

    const startListening = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return false;
        if (listeningRef.current) return true;
        try {
            rec.start();
            listeningRef.current = true;
            setIsListening(true);
            setError(null);
            if (!open) setOpen(true);
            return true;
        } catch (e) {
            console.warn('[AIChatbot] speech start failed', e);
            return false;
        }
    }, [open]);

    const stopListening = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec || !listeningRef.current) return;
        try { rec.stop(); } catch { /* ignore */ }
        listeningRef.current = false;
        setIsListening(false);
        if (restartTimerRef.current) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    }, []);

    const toggleListen = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) {
            if (!speechSupported) {
                setError('Speech recognition is not available in this browser.');
            }
            return;
        }
        if (listeningRef.current) {
            stopListening();
        } else {
            startListening();
        }
    }, [speechSupported, startListening, stopListening]);

    const toggleAlwaysOn = useCallback(() => {
        setAlwaysOn(prev => {
            const next = !prev;
            if (next) {
                startListening();
            } else {
                stopListening();
            }
            return next;
        });
    }, [startListening, stopListening]);

    useEffect(() => {
        if (!open) {
            stopListening();
        }
    }, [open, stopListening]);

    useEffect(() => {
        if (open && alwaysOn && speechSupported && recognitionRef.current && !listeningRef.current) {
            startListening();
        }
    }, [open, alwaysOn, speechSupported, startListening]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === ',' || e.code === 'Comma')) {
                e.preventDefault();
                toggleListen();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggleListen]);

    useEffect(() => {
        if (!sending && alwaysOn && open && speechSupported && recognitionRef.current && !listeningRef.current) {
            if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = window.setTimeout(() => {
                restartTimerRef.current = null;
                if (alwaysOn && !sendingRef.current && open && recognitionRef.current && !listeningRef.current) {
                    try {
                        recognitionRef.current.start();
                        listeningRef.current = true;
                        setIsListening(true);
                    } catch (e) {
                        console.warn('[AIChatbot] always-on restart after send failed', e);
                    }
                }
            }, 1200);
        }
        return () => {
            if (restartTimerRef.current) {
                window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = null;
            }
        };
    }, [sending, alwaysOn, open, speechSupported]);

    const runActions = useCallback((actions: UIAction[]) => {
        if (!actions || actions.length === 0) return;
        console.log('[AIChatbot] runActions', actions);
        for (const action of actions) {
            try {
                console.log('[AIChatbot] dispatching action', action.type, action);
                if (action.type === 'navigate') {
                    const search = action.search
                        ? '?' + new URLSearchParams(action.search).toString()
                        : '';
                    navigate(`${action.path}${search}`);
                    if (action.target) {
                        window.setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('ai-spotlight', {
                                detail: { target: action.target, message: action.message, durationMs: 6000 },
                            }));
                        }, 500);
                    }
                } else if (action.type === 'logout') {
                    logout();
                    navigate('/login');
                } else if (action.type === 'refresh') {
                    window.location.reload();
                } else if (action.type === 'open_modal') {
                    window.dispatchEvent(new CustomEvent('ai-open-modal', {
                        detail: { modalId: action.modalId, params: action.params },
                    }));
                } else if (action.type === 'open_analytics_dashboard') {
                    window.dispatchEvent(new CustomEvent('ai-open-analytics', {
                        detail: { config: action.config },
                    }));
                } else if (action.type === 'open_applicant') {
                    window.dispatchEvent(new CustomEvent('ai-open-applicant', {
                        detail: { applicantId: action.applicantId, applicantName: action.applicantName },
                    }));
                } else if (action.type === 'highlight_applicant') {
                    const isAdminRoute = location.pathname.startsWith('/admin/');
                    const masterlistPath = isAdminRoute
                        ? '/admin/tracker/masterlist'
                        : '/recruiter/tracker/masterlist';
                    const onMasterlist = location.pathname.includes('/masterlist');
                    if (!onMasterlist) {
                        navigate(masterlistPath);
                    }
                    const delay = onMasterlist ? 200 : 900;
                    window.setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('ai-highlight-applicant', {
                            detail: {
                                applicantId: action.applicantId,
                                applicantName: action.applicantName,
                                color: action.color,
                            },
                        }));
                    }, delay);
                }
            } catch (actErr) {
                console.error('[AIChatbot] action failed', action, actErr);
            }
        }
    }, [navigate, logout, location.pathname]);

    const confirmActions = useCallback((actions: UIAction[]) => {
        if (!actions || actions.length === 0) return;
        const dangerous = actions.some(a => a.type === 'logout' || a.type === 'refresh' || a.type === 'edit_applicant');
        if (dangerous) {
            setPendingActions(actions);
            return;
        }
        runActions(actions);
    }, [runActions]);

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || sendingRef.current) return;
        if (trimmed === '__test_dashboard__') {
            window.dispatchEvent(new CustomEvent('ai-open-analytics', {
                detail: {
                    config: {
                        title: 'Test Dashboard (manual)',
                        description: 'Manual test fired from the suggestion button',
                        viz: 'kpi',
                        filters: {},
                        group_by: null,
                        metric: 'passing_rate',
                        reason: 'Test',
                    },
                },
            }));
            setInput('');
            return;
        }
        setError(null);
        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        const nextMessages = [...messages, userMsg].slice(-MAX_HISTORY);
        setMessages(nextMessages);
        setInput('');
        setSending(true);
        sendingRef.current = true;
        try {
            const history = nextMessages.filter(m => m.role !== 'system');
            const result = await AIService.chat({ messages: history });
            const assistantMsg: ChatMessage = { role: 'assistant', content: result.reply };
            setMessages(prev => [...prev, assistantMsg].slice(-MAX_HISTORY));
            if (result.actions && result.actions.length > 0) {
                confirmActions(result.actions);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error.';
            const apiMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(apiMessage ?? message);
            const fallbackMsg: ChatMessage = {
                role: 'assistant',
                content: "Sorry, I couldn't reach the AI service. Please try again in a moment.",
            };
            setMessages(prev => [...prev, fallbackMsg].slice(-MAX_HISTORY));
        } finally {
            setSending(false);
            sendingRef.current = false;
        }
    }, [messages, confirmActions]);

    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    const handleApproveActions = async () => {
        const edits = pendingActions.filter((a): a is Extract<UIAction, { type: 'edit_applicant' }> => a.type === 'edit_applicant');
        const others = pendingActions.filter(a => a.type !== 'edit_applicant');
        const confirmations: { id: string; who: string; field: string; oldVal: string; newVal: string }[] = [];
        for (const e of edits) {
            try {
                const res = await apiClient.post('/ai/commit-edit', {
                    applicant_id: e.applicantId,
                    field: e.field,
                    value: String(e.newValue),
                    reason: e.reason || null,
                });
                if (res.data?.committed) {
                    console.warn('[AIChatbot] unexpected committed:false on commit-edit response');
                }
                confirmations.push({
                    id: e.applicantId,
                    who: e.applicantName || e.applicantId,
                    field: e.field,
                    oldVal: e.oldValue === null || e.oldValue === undefined || e.oldValue === '' ? '∅ (empty)' : String(e.oldValue),
                    newVal: String(e.newValue),
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to apply edit';
                console.error('[AIChatbot] commit-edit failed', err);
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ Edit failed for ${e.applicantName || e.applicantId} → ${e.field}: ${msg}` }]);
            }
        }
        if (confirmations.length > 0) {
            const summary = confirmations.map(c => `✅ **${c.who}** → \`${c.field}\` changed from \`${c.oldVal}\` to \`${c.newVal}\``).join('\n');
            setMessages(prev => [...prev, { role: 'assistant', content: `Done — applied ${confirmations.length} edit${confirmations.length === 1 ? '' : 's'}:\n\n${summary}` }]);
            window.dispatchEvent(new CustomEvent('ai-data-changed', { detail: { applicantIds: confirmations.map(c => c.id) } }));
        }
        if (others.length > 0) {
            runActions(others);
        }
        setPendingActions([]);
    };

    const handleCancelActions = () => {
        const edits = pendingActions.filter((a): a is Extract<UIAction, { type: 'edit_applicant' }> => a.type === 'edit_applicant');
        if (edits.length > 0) {
            const summary = edits.map(e => `🚫 **${e.applicantName || e.applicantId}** → \`${e.field}\` kept as \`${e.oldValue === null || e.oldValue === undefined || e.oldValue === '' ? '∅ (empty)' : String(e.oldValue)}\``).join('\n');
            setMessages(prev => [...prev, { role: 'assistant', content: `Cancelled ${edits.length} edit${edits.length === 1 ? '' : 's'}. No data was changed.\n\n${summary}` }]);
        }
        setPendingActions([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(input);
        }
    };

    const handleClear = () => {
        setMessages([WELCOME]);
        setError(null);
    };

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="chatbot-panel"
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="fixed bottom-24 right-6 z-[9998] w-[380px] h-[540px] max-h-[calc(100vh-7rem)] max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-[#0f1941] to-[#1e3a8a] text-white">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-md bg-white/10 dark:bg-slate-900/10 border border-white/20 flex items-center justify-center shrink-0">
                                    <Sparkles size={15} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[13px] font-semibold tracking-tight truncate">AI Assistant</h3>
                                    <p className="text-[10px] text-white/70 truncate">Ask anything about the app</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                                <div className="relative" ref={voicePickerRef}>
                                    <div className="flex items-center rounded overflow-hidden">
                                        <button
                                            onClick={toggleVoice}
                                            title={voiceEnabled ? `Voice on (${voicePreset}) — click to mute` : 'Voice off — click to enable'}
                                            aria-label={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                                            className={cn(
                                                "p-1.5 transition-colors",
                                                voiceEnabled
                                                    ? "bg-white/20 dark:bg-slate-900/20 text-white"
                                                    : "text-white/70 hover:bg-white/10 dark:hover:bg-slate-900/10"
                                            )}
                                        >
                                            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                        </button>
                                        <button
                                            onClick={() => setVoicePickerOpen(o => !o)}
                                            title="Choose voice"
                                            aria-label="Choose voice"
                                            className={cn(
                                                "py-1.5 pl-0.5 pr-1.5 transition-colors border-l border-white/15",
                                                voicePickerOpen
                                                    ? "bg-white/20 dark:bg-slate-900/20 text-white"
                                                    : "text-white/70 hover:bg-white/10 dark:hover:bg-slate-900/10"
                                            )}
                                        >
                                            <ChevronDown size={11} />
                                        </button>
                                    </div>
                                    {voicePickerOpen && (
                                        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-[#edebe9] dark:border-slate-800 overflow-hidden z-10">
                                            <div className="px-3 py-2 bg-[#faf9f8] border-b border-[#edebe9] dark:border-slate-800">
                                                <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">AI voice</p>
                                            </div>
                                            <div className="py-1">
                                                {VOICE_PRESETS.map(p => {
                                                    const active = voicePreset === p.key;
                                                    return (
                                                        <button
                                                            key={p.key}
                                                            onClick={() => choosePreset(p.key)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 flex items-start gap-2 transition-colors",
                                                                active ? "bg-[#0078d4]/10" : "hover:bg-surface-50"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold",
                                                                p.key === 'jarvis' && "bg-[#0f1941] text-white",
                                                                p.key === 'natasha' && "bg-pink-100 text-pink-700",
                                                                p.key === 'auto' && "bg-surface-100 text-surface-700",
                                                                p.key === 'elevenlabs' && "bg-gradient-to-br from-amber-400 to-rose-500 text-white"
                                                            )}>
                                                                {p.key === 'jarvis' ? 'J' : p.key === 'natasha' ? 'N' : p.key === 'elevenlabs' ? 'E' : 'A'}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className={cn(
                                                                    "block text-[12px] font-semibold",
                                                                    active ? "text-[#0078d4]" : "text-[#201f1e] dark:text-slate-200"
                                                                )}>
                                                                    {p.label}{active && ' ✓'}
                                                                </span>
                                                                <span className="block text-[10.5px] text-surface-500 leading-snug">{p.hint}</span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                                {speechSupported && (
                                                    <>
                                                        <div className="my-1 mx-2 border-t border-[#edebe9] dark:border-slate-800" />
                                                        <button
                                                            onClick={toggleAlwaysOn}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 flex items-start gap-2 transition-colors",
                                                                alwaysOn ? "bg-violet-50" : "hover:bg-surface-50"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
                                                                alwaysOn ? "bg-violet-500 text-white" : "bg-surface-100 text-surface-600"
                                                            )}>
                                                                {alwaysOn ? <Ear size={14} /> : <EarOff size={14} />}
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className={cn(
                                                                    "block text-[12px] font-semibold",
                                                                    alwaysOn ? "text-violet-700" : "text-[#201f1e] dark:text-slate-200"
                                                                )}>
                                                                    Hands-free mode{alwaysOn && ' ✓'}
                                                                </span>
                                                                <span className="block text-[10.5px] text-surface-500 leading-snug">
                                                                    {alwaysOn
                                                                        ? 'Always listening — auto-send on silence'
                                                                        : 'Auto-send voice commands on silence'}
                                                                </span>
                                                            </span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="px-3 py-1.5 bg-[#faf9f8] border-t border-[#edebe9] dark:border-slate-800">
                                                <p className="text-[9.5px] text-surface-400 leading-snug">
                                                    {voices.length > 0
                                                        ? `${voices.length} voice${voices.length === 1 ? '' : 's'} detected on this device`
                                                        : 'Loading voices…'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleClear}
                                    title="Clear conversation"
                                    className="p-1.5 rounded hover:bg-white/10 dark:hover:bg-slate-900/10 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    title="Close"
                                    className="p-1.5 rounded hover:bg-white/10 dark:hover:bg-slate-900/10 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#faf9f8]">
                            {messages.map((m, i) => (
                                <MessageBubble key={i} message={m} />
                            ))}
                            {sending && (
                                <div className="flex items-center gap-2 text-[11px] text-surface-500">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Thinking…</span>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] px-3 py-2 rounded">
                                    {error}
                                </div>
                            )}
                            {pendingActions.length > 0 && (
                                <ActionConfirmation
                                    actions={pendingActions}
                                    onApprove={handleApproveActions}
                                    onCancel={handleCancelActions}
                                />
                            )}
                            {messages.length <= 1 && !sending && (
                                <div className="pt-2 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Try asking</p>
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s.label}
                                            onClick={() => void sendMessage(s.prompt)}
                                            className="block w-full text-left text-[12px] px-3 py-2 bg-white dark:bg-slate-900 border border-surface-200 hover:border-primary-400 hover:bg-primary-50/50 rounded transition-colors"
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-[#edebe9] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5" ref={inputAreaRef}>
                            {(isListening || alwaysOn) && (
                                <div className={cn(
                                    "mb-2 flex items-center gap-2 px-2 py-1.5 border rounded",
                                    alwaysOn
                                        ? "bg-violet-50 border-violet-200"
                                        : "bg-red-50 border-red-200"
                                )}>
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        <span className={cn(
                                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                            alwaysOn ? "bg-violet-500" : "bg-red-500"
                                        )} />
                                        <span className={cn(
                                            "relative inline-flex rounded-full h-2 w-2",
                                            alwaysOn ? "bg-violet-600" : "bg-red-600"
                                        )} />
                                    </span>
                                    <p className={cn(
                                        "text-[10.5px] leading-snug min-w-0 flex-1 truncate",
                                        alwaysOn ? "text-violet-700" : "text-red-700"
                                    )}>
                                        {isListening && interimTranscript
                                            ? `Listening… "${interimTranscript}"`
                                            : isListening
                                                ? 'Listening…'
                                                : sending
                                                    ? 'Hands-free: AI is responding…'
                                                    : 'Hands-free: ready for next command…'}
                                    </p>
                                    <span className={cn(
                                        "text-[9px] font-mono shrink-0",
                                        alwaysOn ? "text-violet-500/70" : "text-red-500/70"
                                    )}>{isListening ? 'Alt+, to stop' : 'Alt+, to toggle'}</span>
                                </div>
                            )}
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isListening ? 'Speak now…' : 'Ask me anything…'}
                                    rows={1}
                                    disabled={sending}
                                    className="flex-1 resize-none max-h-24 px-3 py-2 text-[13px] border border-[#c8c6c4] dark:border-slate-700 rounded outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] disabled:bg-surface-50 disabled:text-surface-500"
                                />
                                {speechSupported && (
                                    <button
                                        onClick={toggleListen}
                                        disabled={sending}
                                        title={
                                            isListening
                                                ? 'Stop listening (Alt+,)'
                                                : alwaysOn
                                                    ? 'Hands-free: click to pause listening (Alt+,)'
                                                    : 'Start voice input (Alt+,)'
                                        }
                                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                        aria-pressed={isListening || alwaysOn}
                                        className={cn(
                                            "shrink-0 w-9 h-9 flex items-center justify-center rounded transition-colors border",
                                            isListening
                                                ? "bg-red-500 hover:bg-red-600 text-white border-red-600 animate-pulse"
                                                : alwaysOn
                                                    ? "bg-violet-500 hover:bg-violet-600 text-white border-violet-600"
                                                    : "bg-white dark:bg-slate-900 hover:bg-surface-50 text-surface-600 border-[#c8c6c4] dark:border-slate-700"
                                        )}
                                    >
                                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                                    </button>
                                )}
                                <button
                                    onClick={() => void sendMessage(input)}
                                    disabled={sending || !input.trim()}
                                    className="shrink-0 w-9 h-9 flex items-center justify-center bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] disabled:bg-[#c8c6c4] disabled:cursor-not-allowed text-white rounded transition-colors"
                                    title="Send (Enter)"
                                >
                                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                            </div>
                            <p className="mt-1.5 text-[10px] text-surface-400 leading-tight">
                                Press <kbd className="px-1 py-0.5 bg-surface-100 border border-surface-200 rounded text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-surface-100 border border-surface-200 rounded text-[9px]">Shift+Enter</kbd> for new line{speechSupported ? <> · <kbd className="px-1 py-0.5 bg-surface-100 border border-surface-200 rounded text-[9px]">Alt + ,</kbd> to talk{alwaysOn ? ' (hands-free)' : ''}</> : null}.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setOpen(o => !o)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
                className={cn(
                    "fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors",
                    open
                        ? "bg-[#0f1941] hover:bg-[#1e3a8a] ring-2 ring-white"
                        : "bg-white dark:bg-slate-900 hover:bg-surface-50 ring-1 ring-surface-200"
                )}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {open ? (
                        <motion.img
                            key="logo"
                            src="/contactpoint-logo.png?v=2"
                            alt=""
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.18 }}
                            className="w-9 h-9 object-contain"
                        />
                    ) : (
                        <motion.img
                            key="logo-default"
                            src="/contactpoint-logo.png?v=2"
                            alt=""
                            initial={{ opacity: 0, rotate: 90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: -90 }}
                            transition={{ duration: 0.18 }}
                            className="w-9 h-9 object-contain"
                        />
                    )}
                </AnimatePresence>
                {!open && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#0078d4] ring-2 ring-white" />
                )}
            </motion.button>
        </>
    );
}

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="shrink-0 w-6 h-6 rounded-md bg-[#0f1941] flex items-center justify-center mt-0.5">
                    <Sparkles size={12} className="text-white" />
                </div>
            )}
            <div
                className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed break-words",
                    isUser
                        ? "bg-[#0078d4] text-white rounded-br-sm"
                        : "bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 text-[#201f1e] dark:text-slate-200 rounded-bl-sm"
                )}
            >
                {isUser ? message.content : <RichText text={message.content} />}
            </div>
            {isUser && (
                <div className="shrink-0 w-6 h-6 rounded-md bg-[#0078d4] flex items-center justify-center mt-0.5 text-white">
                    <MessageSquare size={11} />
                </div>
            )}
        </div>
    );
}

function RichText({ text }: { text: string }) {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let bulletBuffer: React.ReactNode[] = [];
    let keyCounter = 0;

    const flushBullets = () => {
        if (bulletBuffer.length > 0) {
            blocks.push(
                <ul key={`ul-${keyCounter++}`} className="my-1 space-y-0.5 pl-1">
                    {bulletBuffer.map((item, i) => (
                        <li key={i} className="flex gap-1.5 text-[12.5px] leading-snug">
                            <span className="text-[#0078d4] shrink-0 select-none">•</span>
                            <span className="min-w-0 flex-1">{item}</span>
                        </li>
                    ))}
                </ul>
            );
            bulletBuffer = [];
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^[-*]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[-*]\s+/, '');
            bulletBuffer.push(<InlineRichText key={`b-${keyCounter++}`} text={content} />);
        } else if (/^\d+\.\s+/.test(trimmed)) {
            flushBullets();
            const content = trimmed.replace(/^\d+\.\s+/, '');
            blocks.push(
                <div key={`ol-${keyCounter++}`} className="flex gap-1.5 my-0.5">
                    <span className="text-[#0078d4] shrink-0 select-none tabular-nums">•</span>
                    <span className="min-w-0 flex-1"><InlineRichText text={content} /></span>
                </div>
            );
        } else if (trimmed === '') {
            flushBullets();
            blocks.push(<div key={`sp-${keyCounter++}`} className="h-1.5" />);
        } else {
            flushBullets();
            blocks.push(<div key={`p-${keyCounter++}`}><InlineRichText text={line} /></div>);
        }
    }
    flushBullets();

    return <div className="rich-text">{blocks}</div>;
}

function InlineRichText({ text }: { text: string }) {
    const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith('**')) {
            const inner = token.slice(2, -2);
            parts.push(
                <strong
                    key={key++}
                    className="font-bold text-[#0078d4] bg-[#0078d4]/[0.08] px-0.5 rounded-sm"
                >
                    {inner}
                </strong>
            );
        } else if (token.startsWith('`')) {
            const inner = token.slice(1, -1);
            parts.push(
                <code
                    key={key++}
                    className="px-1 py-px bg-surface-100 text-[#0f1941] rounded text-[11.5px] font-mono"
                >
                    {inner}
                </code>
            );
        } else if (token.startsWith('*')) {
            const inner = token.slice(1, -1);
            parts.push(<em key={key++} className="italic text-surface-600">{inner}</em>);
        }
        lastIndex = pattern.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return <>{parts}</>;
}

function actionLabel(action: UIAction): { icon: React.ReactNode; label: string; color: string } {
    if (action.type === 'navigate') {
        return { icon: <ExternalLink size={12} />, label: `Navigate to ${action.path}`, color: 'text-blue-600' };
    }
    if (action.type === 'logout') {
        return { icon: <LogOut size={12} />, label: 'Log you out', color: 'text-red-600' };
    }
    if (action.type === 'refresh') {
        return { icon: <RefreshCw size={12} />, label: 'Refresh the page', color: 'text-emerald-600' };
    }
    if (action.type === 'open_modal') {
        return { icon: <LayoutGrid size={12} />, label: `Open ${action.modalId} modal`, color: 'text-violet-600' };
    }
    if (action.type === 'open_analytics_dashboard') {
        return { icon: <BarChart3 size={12} />, label: `Open analytics: ${action.config.title}`, color: 'text-amber-600' };
    }
    if (action.type === 'open_applicant') {
        const who = action.applicantName || action.applicantId || 'applicant';
        return { icon: <User size={12} />, label: `Open applicant: ${who}`, color: 'text-sky-600' };
    }
    if (action.type === 'highlight_applicant') {
        const who = action.applicantName || action.applicantId;
        return { icon: <Sparkles size={12} />, label: `Highlight ${who} (${action.color})`, color: 'text-amber-600' };
    }
    if (action.type === 'edit_applicant') {
        const who = action.applicantName || action.applicantId;
        const fieldName = action.fieldLabel || action.field;
        const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;
        const oldStr = action.oldValue === null || action.oldValue === undefined || action.oldValue === '' ? '∅' : truncate(String(action.oldValue), 50);
        const newStr = truncate(String(action.newValue), 50);
        return { icon: <ExternalLink size={12} />, label: `Edit ${who} — ${fieldName}: ${oldStr} → ${newStr}`, color: 'text-rose-600' };
    }
    return { icon: <CheckCircle2 size={12} />, label: 'Action', color: 'text-surface-600' };
}

function formatEditDetail(action: Extract<UIAction, { type: 'edit_applicant' }>): React.ReactNode {
    const who = action.applicantName || action.applicantId;
    const fieldName = action.fieldLabel || action.field;
    const oldVal = action.oldValue === null || action.oldValue === undefined || action.oldValue === '' ? '∅ (empty)' : String(action.oldValue);
    const newVal = String(action.newValue);
    const isLong = oldVal.length > 80 || newVal.length > 80;
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11.5px] text-amber-900 font-semibold">
                <ExternalLink size={12} className="shrink-0 text-rose-600" />
                <span>Edit {who} — <span className="font-mono">{fieldName}</span></span>
            </div>
            <div className="ml-5 text-[10.5px] text-amber-800 space-y-0.5">
                {isLong ? (
                    <div className="space-y-1">
                        <div>
                            <div className="text-[9.5px] uppercase tracking-wide text-amber-600 mb-0.5">was</div>
                            <pre className="bg-amber-100/60 px-1.5 py-1 rounded line-through whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono text-[10px]">{oldVal}</pre>
                        </div>
                        <div>
                            <div className="text-[9.5px] uppercase tracking-wide text-emerald-700 mb-0.5">now</div>
                            <pre className="bg-emerald-100/70 text-emerald-900 px-1.5 py-1 rounded font-semibold whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono text-[10px]">{newVal}</pre>
                        </div>
                    </div>
                ) : (
                    <div className="font-mono space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-12 text-amber-600">was</span>
                            <span className="bg-amber-100/60 px-1.5 py-px rounded line-through">{oldVal}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-12 text-emerald-700">now</span>
                            <span className="bg-emerald-100/70 text-emerald-900 px-1.5 py-px rounded font-semibold">{newVal}</span>
                        </div>
                    </div>
                )}
            </div>
            {action.reason && (
                <div className="ml-5 text-[10px] text-amber-700 italic">Reason: {action.reason}</div>
            )}
        </div>
    );
}

function ActionConfirmation({ actions, onApprove, onCancel }: {
    actions: UIAction[];
    onApprove: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
                <div className="shrink-0 w-6 h-6 rounded-md bg-amber-200 flex items-center justify-center mt-0.5">
                    <Sparkles size={12} className="text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-amber-900">The AI wants to perform these actions:</p>
                    <ul className="mt-1.5 space-y-1.5">
                        {actions.map((a, i) => {
                            const isEdit = a.type === 'edit_applicant';
                            const reason = a.type === 'open_analytics_dashboard' ? a.config.reason : a.reason;
                            if (isEdit) {
                                return <li key={i}>{formatEditDetail(a)}</li>;
                            }
                            const meta = actionLabel(a);
                            return (
                                <li key={i} className="flex items-center gap-1.5 text-[11.5px] text-amber-900">
                                    <span className={cn('shrink-0', meta.color)}>{meta.icon}</span>
                                    <span className="truncate">{reason || meta.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            <div className="flex items-center gap-2 pl-8">
                <button
                    onClick={onApprove}
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                >
                    Approve
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-amber-300 hover:bg-amber-100 text-amber-900 rounded transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
