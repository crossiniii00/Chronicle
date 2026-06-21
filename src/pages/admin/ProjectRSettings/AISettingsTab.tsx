import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Smile, Cpu, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/common/useToast';
import { apiClient } from '@/utils/apiClient';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

interface AISettings {
    AI_PROVIDER: 'gemini' | 'openai' | 'stub';
    OPENAI_API_KEY: string;
    OPENAI_MODEL: string;
    GEMINI_API_KEY: string;
    GEMINI_MODEL: string;
    CHATBOT_ENABLED: boolean;
}

export function AISettingsTab() {
    const { success: toastSuccess, error: toastError } = useToast();
    const [settings, setSettings] = useState<AISettings>({
        AI_PROVIDER: 'stub',
        OPENAI_API_KEY: '',
        OPENAI_MODEL: 'gpt-4o-mini',
        GEMINI_API_KEY: '',
        GEMINI_MODEL: 'gemini-1.5-flash',
        CHATBOT_ENABLED: true,
    });
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Visibility toggles for keys
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/ai/config');
            if (res.data) {
                setSettings({
                    AI_PROVIDER: res.data.AI_PROVIDER || 'stub',
                    OPENAI_API_KEY: res.data.OPENAI_API_KEY || '',
                    OPENAI_MODEL: res.data.OPENAI_MODEL || 'gpt-4o-mini',
                    GEMINI_API_KEY: res.data.GEMINI_API_KEY || '',
                    GEMINI_MODEL: res.data.GEMINI_MODEL || 'gemini-1.5-flash',
                    CHATBOT_ENABLED: res.data.CHATBOT_ENABLED !== undefined ? res.data.CHATBOT_ENABLED : true,
                });
            }
        } catch (err) {
            console.error('Failed to load AI settings', err);
            toastError('Error', 'Failed to load AI settings.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await apiClient.post('/ai/config', settings);
            toastSuccess('Success', 'AI configurations updated successfully.');
            setShowSuccessModal(true);
            window.dispatchEvent(new CustomEvent('ai-config-updated'));
        } catch (err) {
            console.error('Failed to save AI config', err);
            toastError('Save Failed', 'Could not update AI settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] font-medium text-surface-400 tracking-[-0.005em]">Loading AI settings...</p>
            </div>
        );
    }

    const isAIEnabled = settings.AI_PROVIDER !== 'stub';

    return (
        <div className="w-full pb-12 relative">
            {/* Header */}
            <div className="bg-white border-b border-surface-200">
                <div className="relative px-6 pt-5 pb-2 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2.5">
                        <Cpu size={17} className="text-[#605e5c] self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            AI Settings &amp; Integration
                        </h1>
                    </div>
                    <span className="text-[12px] font-medium text-surface-400 tracking-[-0.005em] mt-1.5">
                        Manage backend language models, API credentials, and toggle AI features.
                    </span>
                </div>

                {/* Status indicator pill */}
                <div className="flex items-center justify-center gap-2 px-6 pb-4">
                    <div className={`flex items-center gap-1.5 px-3 h-7 border rounded-sm transition-all duration-300 ${
                        isAIEnabled 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-surface-50 border-surface-200 text-surface-500'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isAIEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-surface-400'}`} />
                        <span className="text-[10.5px] font-semibold tracking-[-0.005em]">
                            AI Status: {isAIEnabled ? `Enabled (${settings.AI_PROVIDER.toUpperCase()})` : 'Disabled (Stub fallback)'}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6 pt-6 items-stretch">
                {/* General Settings */}
                <div className="bg-white border border-surface-200 shadow-sm flex flex-col rounded-sm overflow-hidden h-full">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-surface-100 bg-surface-50/50">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center bg-indigo-600 text-white shadow-sm rounded-sm">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h2 className="text-[14px] font-semibold text-surface-900 tracking-[-0.005em]">General Settings</h2>
                                <p className="text-[11.5px] font-normal text-surface-500 tracking-[-0.005em]">Enable/disable AI features and select the active provider.</p>
                            </div>
                        </div>
                        <motion.button
                            type="submit"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm disabled:opacity-50"
                        >
                            <Save size={12} strokeWidth={2.25} />
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </motion.button>
                    </div>

                    <div className="p-5 space-y-6 flex-1 bg-white">
                        {/* Toggle AI Enablement */}
                        <div className="flex items-center justify-between p-4 bg-surface-50/50 border border-surface-200 rounded-sm">
                            <div className="space-y-0.5">
                                <label className="text-[12px] font-semibold text-surface-900 tracking-[-0.005em]">
                                    Enable AI Integrations
                                </label>
                                <p className="text-[11px] text-surface-500 tracking-[-0.005em] max-w-[280px]">
                                    Toggle language model services (quota suggestion, interview summaries, chat).
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAIEnabled}
                                    onChange={(e) => {
                                        setSettings(prev => ({
                                            ...prev,
                                            AI_PROVIDER: e.target.checked ? 'gemini' : 'stub'
                                        }));
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Toggle AI Chatbot */}
                        <div className="flex items-center justify-between p-4 bg-surface-50/50 border border-surface-200 rounded-sm">
                            <div className="space-y-0.5">
                                <label className="text-[12px] font-semibold text-surface-900 tracking-[-0.005em]">
                                    Enable AI Chatbot
                                </label>
                                <p className="text-[11px] text-surface-500 tracking-[-0.005em] max-w-[280px]">
                                    Toggle the floating AI assistant widget visible to users.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.CHATBOT_ENABLED}
                                    onChange={(e) => {
                                        setSettings(prev => ({
                                            ...prev,
                                            CHATBOT_ENABLED: e.target.checked
                                        }));
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Provider Selection */}
                        <div className={`space-y-2 transition-all duration-300 ${!isAIEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-[11px] font-semibold text-surface-600 tracking-[-0.005em] block">
                                Active LLM Provider
                            </label>
                            <select
                                value={settings.AI_PROVIDER === 'stub' ? 'gemini' : settings.AI_PROVIDER}
                                onChange={(e) => {
                                    setSettings(prev => ({
                                        ...prev,
                                        AI_PROVIDER: e.target.value as 'gemini' | 'openai'
                                    }));
                                }}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-sm text-[13px] font-medium text-surface-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="gemini">Google Gemini AI</option>
                                <option value="openai">OpenAI (ChatGPT)</option>
                            </select>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-sm flex gap-3 text-[11.5px] leading-relaxed">
                            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold block mb-0.5">Note on dynamic reload:</span>
                                Changes saved here are directly written to the root <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950 font-medium">.env</code> file. The server re-reads these configurations in real-time, eliminating the need to rebuild or restart the system.
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Credentials */}
                <div className="bg-slate-900 p-5 flex flex-col relative overflow-hidden text-white rounded-sm shadow-lg">
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px]" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ef3e36]/30 rounded-full blur-[80px]" />
                    </div>

                    <div className="flex items-center gap-3 relative z-10 border-b border-white/10 pb-4">
                        <div className="flex h-9 w-9 items-center justify-center bg-white/10 text-indigo-400 rounded-sm">
                            <Cpu size={16} />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-semibold text-white tracking-[-0.005em]">API Credentials</h2>
                            <p className="text-[11.5px] font-normal text-slate-400 tracking-[-0.005em]">Manage API Keys &amp; models for the LLM providers.</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-5 flex-1 relative z-10 text-[12px]">
                        {/* Gemini Key Config */}
                        <div className={`space-y-2 p-3 bg-white/5 border border-white/10 rounded-sm transition-all duration-300 ${isAIEnabled && settings.AI_PROVIDER === 'gemini' ? 'ring-1 ring-indigo-500 bg-white/10' : 'opacity-60'}`}>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Google Gemini Settings</span>
                            
                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-slate-300">GEMINI_API_KEY</label>
                                <div className="relative">
                                    <input
                                        type={showGeminiKey ? 'text' : 'password'}
                                        value={settings.GEMINI_API_KEY}
                                        onChange={(e) => setSettings(prev => ({ ...prev, GEMINI_API_KEY: e.target.value }))}
                                        placeholder="AI.Ab8RN6LS..."
                                        className="w-full bg-black/45 border border-white/10 px-3 py-2 pr-10 rounded-sm font-mono text-[11px] text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showGeminiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-slate-300">GEMINI_MODEL</label>
                                <input
                                    type="text"
                                    value={settings.GEMINI_MODEL}
                                    onChange={(e) => setSettings(prev => ({ ...prev, GEMINI_MODEL: e.target.value }))}
                                    placeholder="gemini-1.5-flash"
                                    className="w-full bg-black/45 border border-white/10 px-3 py-2 rounded-sm font-mono text-[11px] text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* OpenAI Key Config */}
                        <div className={`space-y-2 p-3 bg-white/5 border border-white/10 rounded-sm transition-all duration-300 ${isAIEnabled && settings.AI_PROVIDER === 'openai' ? 'ring-1 ring-indigo-500 bg-white/10' : 'opacity-60'}`}>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">OpenAI Settings</span>
                            
                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-slate-300">OPENAI_API_KEY</label>
                                <div className="relative">
                                    <input
                                        type={showOpenAIKey ? 'text' : 'password'}
                                        value={settings.OPENAI_API_KEY}
                                        onChange={(e) => setSettings(prev => ({ ...prev, OPENAI_API_KEY: e.target.value }))}
                                        placeholder="sk-..."
                                        className="w-full bg-black/45 border border-white/10 px-3 py-2 pr-10 rounded-sm font-mono text-[11px] text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showOpenAIKey ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-medium text-slate-300">OPENAI_MODEL</label>
                                <input
                                    type="text"
                                    value={settings.OPENAI_MODEL}
                                    onChange={(e) => setSettings(prev => ({ ...prev, OPENAI_MODEL: e.target.value }))}
                                    placeholder="gpt-4o-mini"
                                    className="w-full bg-black/45 border border-white/10 px-3 py-2 rounded-sm font-mono text-[11px] text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Success Happy Face Dashboard Overlay Popup */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-[4px] p-4 text-left"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0, transition: SPRING }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-[420px] bg-white border border-surface-200 rounded-sm p-6 shadow-2xl relative text-center flex flex-col items-center justify-center overflow-hidden"
                        >
                            {/* Decorative background flare */}
                            <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-[30px]" />
                            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-[30px]" />
                            
                            <motion.div 
                                initial={{ rotate: -10, scale: 0 }}
                                animate={{ rotate: 0, scale: 1, transition: { ...SPRING, delay: 0.1 } }}
                                className="flex h-16 w-16 items-center justify-center bg-emerald-100 text-emerald-600 rounded-full mb-4 shadow-sm"
                            >
                                <Smile size={36} strokeWidth={2} />
                            </motion.div>

                            <h3 className="text-[18px] font-bold text-surface-900 tracking-tight mb-2">
                                Changes Saved Successfully!
                            </h3>
                            <p className="text-[12.5px] text-surface-500 leading-relaxed max-w-[320px] mb-6">
                                Your AI settings have been committed to the configuration layer. The active backend service has hot-reloaded the credentials.
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full h-9 bg-black text-white text-[12px] font-semibold tracking-[-0.005em] hover:bg-black/85 transition-colors rounded-sm flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <CheckCircle2 size={14} />
                                Dismiss
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
