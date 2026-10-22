import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Save, Plus, Trash2, Settings, Play } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { ReportConfigService } from '@/services/ReportConfigService';
import { useToast } from '@/components/common/useToast';

interface QueuePreset {
    id: string;
    name: string;
    chime: 'melodic' | 'ding' | 'bell' | 'none';
    voiceName: string;
    rate: number;
    pitch: number;
    volume: number;
    template: string;
    systemMode?: 'standard' | 'reference' | 'standard_number';
}

interface QueueSettings {
    activePresetId: string;
    presets: QueuePreset[];
}

interface QueueSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

const DEFAULT_PRESET: QueuePreset = {
    id: 'default-preset',
    name: 'Standard Callout',
    chime: 'melodic',
    voiceName: '',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    template: 'Queue number {number}, {name}, please proceed to room {room}',
    systemMode: 'standard'
};

// Sound utility function matching public display
const playPresetChime = (chimeType: 'melodic' | 'ding' | 'bell' | 'none') => {
    if (chimeType === 'none') return;
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        if (chimeType === 'melodic') {
            // E5 Tone
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            osc1.start(now);
            osc1.stop(now + 0.5);
            
            // C5 Tone (after 0.25s)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(523.25, now + 0.25);
            gain2.gain.setValueAtTime(0, now + 0.25);
            gain2.gain.linearRampToValueAtTime(0.15, now + 0.25 + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25 + 0.6);
            osc2.start(now + 0.25);
            osc2.stop(now + 0.25 + 0.6);
        } else if (chimeType === 'ding') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (chimeType === 'bell') {
            // Play a major triad chord G5, B5, D6
            [783.99, 987.77, 1174.66].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.8);
            });
        }
    } catch (e) {
        console.error('[QueueSettings] Play chime failed:', e);
    }
};

export function QueueSettingsModal({ open, onClose }: QueueSettingsModalProps) {
    const { success, error } = useToast();
    const [settings, setSettings] = useState<QueueSettings>({
        activePresetId: 'default-preset',
        presets: [{ ...DEFAULT_PRESET }]
    });
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('default-preset');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const loadVoices = () => {
                setVoices(window.speechSynthesis.getVoices());
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Fetch settings from server
        ReportConfigService.getById('queue-settings')
            .then((res) => {
                let parsed = res;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch (e) {
                        console.error('[QueueSettingsModal] Failed to parse stringified config_data:', e);
                    }
                }
                if (parsed && Array.isArray(parsed.presets) && parsed.activePresetId) {
                    setSettings({
                        activePresetId: parsed.activePresetId,
                        presets: parsed.presets
                    });
                    setSelectedPresetId(parsed.activePresetId);
                }
            })
            .catch((err) => {
                console.error('[QueueSettingsModal] Fetch settings failed:', err);
            });
    }, [open]);

    if (!open) return null;

    const currentPreset = settings.presets.find(p => p.id === selectedPresetId) || settings.presets[0];

    const updatePresetField = (field: keyof QueuePreset, value: any) => {
        setSettings(prev => ({
            ...prev,
            presets: prev.presets.map(p => p.id === selectedPresetId ? { ...p, [field]: value } : p)
        }));
    };

    const handleCreatePreset = () => {
        const name = prompt('Enter name for the new preset:');
        if (!name?.trim()) return;

        const newId = `preset-${Date.now()}`;
        const newPreset: QueuePreset = {
            ...DEFAULT_PRESET,
            id: newId,
            name: name.trim()
        };

        setSettings(prev => ({
            ...prev,
            presets: [...prev.presets, newPreset]
        }));
        setSelectedPresetId(newId);
    };

    const handleDeletePreset = (idToDelete: string) => {
        if (settings.presets.length <= 1) {
            error('Action Denied', 'At least one preset must remain.');
            return;
        }
        if (!confirm('Are you sure you want to delete this preset?')) return;

        const filtered = settings.presets.filter(p => p.id !== idToDelete);
        const nextActiveId = settings.activePresetId === idToDelete ? filtered[0].id : settings.activePresetId;

        setSettings({
            activePresetId: nextActiveId,
            presets: filtered
        });
        setSelectedPresetId(filtered[0].id);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await ReportConfigService.update('queue-settings', settings);
            success('Settings Saved', 'Queue control audio presets updated successfully.');
            onClose();
        } catch (err: unknown) {
            error('Save Failed', err instanceof Error ? err.message : 'Unable to save queue settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleTestChime = () => {
        playPresetChime(currentPreset.chime);
    };

    const handleTestVoice = () => {
        if (!window.speechSynthesis) {
            error('Not Supported', 'Speech synthesis is not supported on this browser.');
            return;
        }

        if (currentPreset.voiceName === 'none') {
            error('Muted', 'Pronunciation voice is currently disabled/muted.');
            return;
        }

        window.speechSynthesis.cancel();
        
        const nameToTest = currentPreset.systemMode === 'standard_number' ? '' : 'Johnny Silverhand';
        let text = currentPreset.template
            .replace('{number}', 'Q-085')
            .replace('{name}', nameToTest)
            .replace('{room}', 'Escario Street');

        if (currentPreset.systemMode === 'standard_number') {
            text = text
                .replace(/,\s*,/g, ',')
                .replace(/,\s*please/gi, ', please')
                .replace(/\s+/g, ' ')
                .trim();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = currentPreset.rate;
        utterance.pitch = currentPreset.pitch;
        utterance.volume = currentPreset.volume;

        if (currentPreset.voiceName) {
            const foundVoice = voices.find(v => v.name === currentPreset.voiceName);
            if (foundVoice) utterance.voice = foundVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.3)] rounded-sm overflow-visible flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#edebe9] dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-purple-50 rounded-sm flex items-center justify-center border border-purple-100">
                            <Settings size={15} className="text-purple-600" />
                        </div>
                        <h2 className="text-[15px] font-semibold text-[#323130] dark:text-slate-300 tracking-[-0.005em]">
                            Queue Lobby Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-surface-500 hover:bg-surface-100 rounded-sm transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-left flex-1">
                    {/* Queue System Mode */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#605e5c] dark:text-slate-400">
                            Queue System Mode
                        </label>
                        <select
                            value={currentPreset.systemMode || 'standard'}
                            onChange={(e) => updatePresetField('systemMode', e.target.value)}
                            className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-[#0078d4]"
                        >
                            <option value="standard">Standard Sequential Queue (Queue No. & Candidate Name)</option>
                            <option value="standard_number">Standard Sequential Queue (Queue No. Only)</option>
                        </select>
                        <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                            {currentPreset.systemMode === 'standard_number' 
                                ? "Uses standard sequence numbers (e.g. Q-001) without displaying candidate names."
                                : "Uses standard sequence numbers (e.g. Q-001) and displays candidate names."
                            }
                        </p>
                    </div>

                    {/* Sound chime */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#605e5c] dark:text-slate-400">
                            Sound Chime Style
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={currentPreset.chime}
                                onChange={(e) => updatePresetField('chime', e.target.value)}
                                className="flex-1 h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-[#0078d4]"
                            >
                                <option value="melodic">Standard Melodic Chime (Double-tone)</option>
                                <option value="ding">High-Pitch Bell Ding (Single-tone)</option>
                                <option value="bell">Triad Bell Chime (Triple-tone)</option>
                                <option value="none">No Sound (Silent)</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleTestChime}
                                className="h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 hover:border-black/40 text-slate-800 dark:text-slate-200 rounded-sm flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <Volume2 size={13} /> Test
                            </button>
                        </div>
                    </div>

                    {/* Voice Announcement Toggle */}
                    <div className="flex items-center justify-between p-3 bg-purple-50/50 border border-purple-200/40 rounded-sm">
                        <div className="space-y-0.5 text-left">
                            <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-950">
                                Voice Announcement (Text-to-Speech)
                            </h4>
                            <p className="text-[9.5px] text-purple-700 font-bold uppercase tracking-wider">
                                Speak queue announcements over the lobby speakers.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={currentPreset.voiceName !== 'none'}
                                onChange={(e) => updatePresetField('voiceName', e.target.checked ? '' : 'none')}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 dark:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <div className={cn("space-y-4 transition-all duration-200", currentPreset.voiceName === 'none' && "opacity-45 pointer-events-none select-none")}>
                        {/* Pronunciation voice selection */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#605e5c] dark:text-slate-400">
                                Pronunciation Voice
                            </label>
                            <select
                                value={currentPreset.voiceName === 'none' ? '' : currentPreset.voiceName}
                                onChange={(e) => updatePresetField('voiceName', e.target.value)}
                                disabled={currentPreset.voiceName === 'none'}
                                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-[#0078d4]"
                            >
                                <option value="">Browser default voice</option>
                                {voices.map((v, i) => (
                                    <option key={i} value={v.name}>
                                        {v.name} ({v.lang})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Pronunciation speech text template */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#605e5c] dark:text-slate-400">
                                    Pronunciation Announcement Template
                                </label>
                                <button
                                    type="button"
                                    disabled={currentPreset.voiceName === 'none'}
                                    onClick={handleTestVoice}
                                    className="px-2 py-0.5 border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-sm flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                >
                                    <Play size={10} /> Preview Speech
                                </button>
                            </div>
                            <input
                                type="text"
                                value={currentPreset.template}
                                onChange={(e) => updatePresetField('template', e.target.value)}
                                disabled={currentPreset.voiceName === 'none'}
                                className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-sm text-[12.5px] font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-[#0078d4]"
                                placeholder="e.g. Queue number {number}, {name}, please proceed to room {room}"
                            />
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                Placeholders: <span className="text-purple-600 font-black">{`{number}`}</span>, <span className="text-purple-600 font-black">{`{name}`}</span>, <span className="text-purple-600 font-black">{`{room}`}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-[#edebe9] dark:border-slate-800 bg-surface-50/50 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="h-9 px-4 text-[12px] font-medium tracking-[-0.005em] text-[#605e5c] dark:text-slate-400 border border-[#edebe9] dark:border-slate-800 rounded-sm hover:bg-white dark:bg-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-medium tracking-[-0.005em] rounded-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                        <Save size={13} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}
