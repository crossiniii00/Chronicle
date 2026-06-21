import React, { useState, useEffect } from 'react';
import { Activity, Save, Type, Target, Settings2, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/common/useToast';
import { apiClient } from '@/utils/apiClient';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

interface TypingTestSettings {
    minWpm: number;
    minAccuracy: number;
    duration: number;
    difficultyLevel: 'easy' | 'normal' | 'hard';
    allowBackspace: boolean;
    showLiveStats: boolean;
    prompts: string[];
    maxAttempts: number;
}

export function TypingTestTab() {
    const { success, error: toastError } = useToast();
    const [settings, setSettings] = useState<TypingTestSettings>({
        minWpm: 40,
        minAccuracy: 95,
        duration: 60,
        difficultyLevel: 'normal',
        allowBackspace: true,
        showLiveStats: true,
        prompts: [
            "The quick brown fox jumps over the lazy dog. This pangram sentence contains every letter of the alphabet at least once, making it perfect for testing typing speed and accuracy.",
            "In today's digital world, typing skills are essential for productivity. Fast and accurate typing can significantly improve your efficiency in various professional tasks.",
            "Technology continues to evolve rapidly, bringing new innovations that transform how we work and communicate. Staying updated with these changes is crucial for success.",
            "Effective communication is the cornerstone of successful business relationships. Clear and concise messaging helps prevent misunderstandings and promotes collaboration."
        ],
        maxAttempts: 3
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/report-configs/typing_test_settings');
            if (res.data && res.data.config_data) {
                const data = res.data.config_data;
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    prompts: data.prompts && data.prompts.length > 0 ? data.prompts : prev.prompts
                }));
            }
        } catch {
            console.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSave = async (newSettings: TypingTestSettings) => {
        setIsSaving(true);
        try {
            await apiClient.post('/report-configs/typing_test_settings', newSettings);
            setSettings(newSettings);
            success('Saved', 'Settings updated successfully.');
        } catch {
            toastError('Error', 'Could not save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] font-medium text-surface-400 tracking-[-0.005em]">Loading typing test settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full pb-12">
            {/* Header */}
            <div className="bg-white border-b border-surface-200">
                <div className="relative px-6 pt-5 pb-2 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2.5">
                        <Keyboard size={17} className="text-[#605e5c] self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Typing Test Configuration
                        </h1>
                    </div>
                    <span className="text-[12px] font-medium text-surface-400 tracking-[-0.005em] mt-1.5">
                        Set passing requirements and manage test texts.
                    </span>
                </div>

                {/* Stat Pills */}
                <div className="flex items-center justify-center gap-2 px-6 pb-4">
                    <div className="flex items-center gap-1.5 px-3 h-7 bg-surface-50/70 border border-surface-200 rounded-sm">
                        <span className="text-[9px] font-semibold text-black/45 uppercase tracking-[0.1em]">Min speed</span>
                        <span className="text-[13px] font-semibold text-black tabular-nums leading-none">{settings.minWpm}</span>
                        <span className="text-[9px] font-medium text-black/45 leading-none">WPM</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 h-7 bg-surface-50/70 border border-surface-200 rounded-sm">
                        <span className="text-[9px] font-semibold text-black/45 uppercase tracking-[0.1em]">Min accuracy</span>
                        <span className="text-[13px] font-semibold text-black tabular-nums leading-none">{settings.minAccuracy}</span>
                        <span className="text-[9px] font-medium text-black/45 leading-none">%</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 h-7 bg-emerald-50 border border-emerald-200 rounded-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10.5px] font-semibold text-emerald-700 tracking-[-0.005em]">Firestore connected</span>
                    </div>
                </div>
            </div>

            {/* Configuration Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 px-6 pt-6 items-stretch">
                {/* Target Scores */}
                <div className="bg-white border border-surface-200 shadow-sm flex flex-col rounded-sm overflow-hidden h-full">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-surface-100 bg-surface-50/50">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center bg-[#0078d4] text-white shadow-sm rounded-sm">
                                <Target size={16} />
                            </div>
                            <div>
                                <h2 className="text-[14px] font-semibold text-surface-900 tracking-[-0.005em]">Target scores</h2>
                                <p className="text-[11.5px] font-normal text-surface-500 tracking-[-0.005em]">Minimum requirements to pass the typing assessment.</p>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={SPRING}
                            onClick={() => handleSave(settings)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm disabled:opacity-50 disabled:hover:bg-black"
                        >
                            <Save size={12} strokeWidth={2.25} />
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </motion.button>
                    </div>

                    <div className="p-5 space-y-5 flex-1 bg-white">
                        <div className="space-y-2">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-surface-600 tracking-[-0.005em]">
                                <Activity size={12} className="text-[#0078d4]" /> Min. WPM (words per minute)
                            </label>
                            <input
                                type="number"
                                value={settings.minWpm}
                                onChange={e => setSettings(s => ({ ...s, minWpm: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-surface-50 border border-surface-200 px-4 py-3 rounded-sm text-[22px] font-semibold text-surface-900 focus:bg-white focus:border-[#0078d4] outline-none transition-all tracking-[-0.02em] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[11px] font-normal text-surface-400 tracking-[-0.005em]">Recommended speed is 40 WPM or higher.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-surface-600 tracking-[-0.005em]">
                                <Target size={12} className="text-[#0078d4]" /> Minimum accuracy (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={settings.minAccuracy}
                                    onChange={e => setSettings(s => ({ ...s, minAccuracy: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-surface-50 border border-surface-200 px-4 py-3 rounded-sm text-[22px] font-semibold text-surface-900 focus:bg-white focus:border-[#0078d4] outline-none transition-all tracking-[-0.02em] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-surface-400">%</span>
                            </div>
                            <p className="text-[11px] font-normal text-surface-400 tracking-[-0.005em]">Recommended accuracy is 90% or higher.</p>
                        </div>
                    </div>
                </div>

                {/* CPType Integration */}
                <div className="bg-slate-900 p-5 flex flex-col relative overflow-hidden text-white rounded-sm shadow-lg">
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[80px]" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ef3e36]/30 rounded-full blur-[80px]" />
                    </div>

                    <div className="flex items-center gap-3 relative z-10 border-b border-white/10 pb-4">
                        <div className="flex h-9 w-9 items-center justify-center bg-white/10 text-blue-400 rounded-sm">
                            <Settings2 size={16} />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-semibold text-white tracking-[-0.005em]">CPType integration</h2>
                            <p className="text-[11.5px] font-normal text-slate-400 tracking-[-0.005em]">External webapp configuration</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-4 flex-1 relative z-10 text-[12px]">
                        <div className="space-y-1.5">
                            <label className="text-[10.5px] font-semibold text-slate-400 tracking-[-0.005em] block">Target webapp URL</label>
                            <code className="block bg-black/45 border border-white/10 p-2.5 rounded-sm font-mono text-[11px] text-blue-300 break-all select-all tracking-[-0.005em]">
                                https://cptypefinal.web.app/
                            </code>
                        </div>

                        <div className="space-y-2.5 text-slate-300 leading-relaxed">
                            <p className="text-[10.5px] font-semibold text-white tracking-[-0.005em]">Real-time data flow</p>
                            <ul className="space-y-2 list-disc list-inside text-slate-300 pl-1 text-[12px]">
                                <li>
                                    <strong className="text-white font-semibold">Firestore polling:</strong> The applicant portal listens directly to the <code className="bg-white/5 px-1 py-0.5 rounded-sm font-mono text-white text-[10.5px]">applicant_results</code> collection in real-time.
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">Email identification:</strong> Candidates are uniquely identified using their exact email address passed in the URL.
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">URL sync parameters:</strong>
                                    <pre className="mt-1 bg-black/35 p-2 rounded-sm text-[10.5px] font-mono text-slate-300 whitespace-pre-wrap break-all border border-white/5 tracking-[-0.005em]">
                                        ?name=[Full+Name]&amp;email=[Email]
                                    </pre>
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">Attempts enforced:</strong> 3-attempt limit is validated on initialization via Firestore count.
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10.5px] font-semibold tracking-[-0.005em] text-emerald-400">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Firestore connected
                        </div>
                        <span className="text-slate-500 font-medium">v2.1.0-secure</span>
                    </div>
                </div>
            </div>

            {/* Integration Guide Section */}
            <div className="bg-white border border-surface-200 shadow-sm mx-6 mt-6 rounded-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100 bg-surface-50/50">
                    <div className="flex h-9 w-9 items-center justify-center bg-slate-900 text-white rounded-sm">
                        <Type size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold text-surface-900 tracking-[-0.005em]">CPType external setup &amp; administration guide</h2>
                        <p className="text-[11.5px] font-normal text-surface-500 tracking-[-0.005em]">Overview of the integration workflow and target repository configuration.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-5">
                    {[
                        {
                            step: 1,
                            title: 'Candidate redirection',
                            body: 'When an applicant starts their typing assessment, the recruitment portal launches a full-screen window pointing to the external CPType app with metadata pre-loaded in the URL query string.',
                        },
                        {
                            step: 2,
                            title: 'Secure verification',
                            body: 'The candidate takes the typing test on the secure domain. On completion, the test result is saved to the shared Firestore under the applicant\u2019s email key.',
                        },
                        {
                            step: 3,
                            title: 'Real-time sync',
                            body: 'The applicant portal receives the score immediately via the active listener and updates the recruitment status card automatically, allowing instant validation.',
                        },
                    ].map(card => (
                        <div key={card.step} className="space-y-2 border border-surface-200 p-4 rounded-sm bg-surface-50/40">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-blue-50 text-[#0078d4] flex items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums">{card.step}</span>
                                <span className="text-[12.5px] font-semibold text-surface-900 tracking-[-0.005em]">{card.title}</span>
                            </div>
                            <p className="text-[12px] text-surface-600 leading-relaxed tracking-[-0.005em]">
                                {card.body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
