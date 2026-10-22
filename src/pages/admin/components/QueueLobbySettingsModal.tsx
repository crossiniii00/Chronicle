import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/useToast';
import { Settings, Play } from 'lucide-react';

interface QueueLobbySettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export const QueueLobbySettingsModal: React.FC<QueueLobbySettingsModalProps> = ({ open, onClose }) => {
    const { success, error } = useToast();

    const [queueSystemMode, setQueueSystemMode] = useState('Standard Sequential Queue (Queue No. & Candidate Name)');
    const [audioTone, setAudioTone] = useState('Triad Bell Chime (Triple-tone)');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [announcementVoice, setAnnouncementVoice] = useState('');
    const [announcementTemplate, setAnnouncementTemplate] = useState('Queue number {number}, {name}, please proceed to room {room}');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (open) {
            // Load settings from localStorage
            const stored = localStorage.getItem('projectc_queue_settings');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.queueSystemMode !== undefined) setQueueSystemMode(data.queueSystemMode);
                    if (data.audioTone !== undefined) setAudioTone(data.audioTone);
                    if (data.soundEnabled !== undefined) setSoundEnabled(Boolean(data.soundEnabled));
                    if (data.announcementVoice !== undefined) setAnnouncementVoice(data.announcementVoice);
                    if (data.announcementTemplate !== undefined) setAnnouncementTemplate(data.announcementTemplate);
                } catch (e) {
                    console.error('Failed to parse queue settings', e);
                }
            }

            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const loadVoices = () => {
                    const allVoices = window.speechSynthesis.getVoices();
                    setVoices(allVoices);
                };
                loadVoices();
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, [open]);

    const handleSave = () => {
        const stored = localStorage.getItem('projectc_queue_settings');
        let currentSettings = {};
        if (stored) {
            try { currentSettings = JSON.parse(stored); } catch (e) {}
        }

        const newSettings = {
            ...currentSettings,
            queueSystemMode,
            audioTone,
            soundEnabled,
            announcementVoice,
            announcementTemplate
        };
        localStorage.setItem('projectc_queue_settings', JSON.stringify(newSettings));
        success('Settings Saved', 'Queue Lobby settings updated successfully.');
        onClose();
    };

    const playTestAudio = () => {
        if (!window.speechSynthesis) {
            error('Not Supported', 'Speech synthesis is not supported on this browser.');
            return;
        }
        window.speechSynthesis.cancel();
        
        let text = announcementTemplate
            .replace('{number}', 'Q-001')
            .replace('{name}', 'John Doe')
            .replace('{room}', '3');
        
        if (text.trim() === '') {
            text = 'Queue number Q-001, John Doe, please proceed to room 3.';
        }
            
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = 0.8;
        utterance.rate = 0.9;
        
        if (announcementVoice) {
            const selectedVoice = voices.find(v => v.name === announcementVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
        success('Testing audio', 'Playing test speech announcement...');
    };

    return (
        <Modal open={open} onClose={onClose} title="Queue Lobby Settings" size="md">
            <div className="p-6 space-y-6 bg-white dark:bg-slate-900 font-sans text-left">
                
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Queue System Mode</label>
                    <select
                        value={queueSystemMode}
                        onChange={(e) => setQueueSystemMode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-900"
                    >
                        <option value="Standard Sequential Queue (Queue No. & Candidate Name)">Standard Sequential Queue (Queue No. & Candidate Name)</option>
                        <option value="Anonymous Sequential Queue (Queue No. Only)">Anonymous Sequential Queue (Queue No. Only)</option>
                    </select>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Uses standard sequence numbers (e.g. Q-001) and displays candidate names.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sound Chime Style</label>
                    <div className="flex gap-2">
                        <select
                            value={audioTone}
                            onChange={(e) => setAudioTone(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-900"
                        >
                            <option value="Triad Bell Chime (Triple-tone)">Triad Bell Chime (Triple-tone)</option>
                            <option value="modern">Modern Ping</option>
                            <option value="classic">Classic Chime</option>
                        </select>
                        <button 
                            onClick={() => {
                                success('Test Tone', 'Playing test chime...');
                            }}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors uppercase tracking-wider"
                        >
                            <Play size={12} />
                            Test
                        </button>
                    </div>
                </div>

                <div className="p-4 border border-purple-100 bg-purple-50/30 rounded-sm flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-black text-purple-900 uppercase tracking-widest">Voice Announcement (Text-To-Speech)</div>
                        <div className="text-[9px] font-bold text-[#a855f7] uppercase tracking-wider mt-0.5">Speak queue announcements over the lobby speakers.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(e) => setSoundEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-slate-300 dark:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a855f7]"></div>
                    </label>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pronunciation Voice</label>
                    <select
                        value={announcementVoice}
                        onChange={(e) => setAnnouncementVoice(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-900"
                        disabled={!soundEnabled}
                    >
                        <option value="">Browser default voice</option>
                        {voices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pronunciation Announcement Template</label>
                        <button 
                            onClick={playTestAudio}
                            disabled={!soundEnabled}
                            className="px-2 py-1 border border-purple-200 bg-purple-50 rounded-sm text-[9px] font-bold text-[#a855f7] flex items-center gap-1 hover:bg-purple-100 transition-colors uppercase tracking-wider disabled:opacity-50"
                        >
                            <Play size={10} />
                            Preview Speech
                        </button>
                    </div>
                    <input
                        type="text"
                        value={announcementTemplate}
                        onChange={(e) => setAnnouncementTemplate(e.target.value)}
                        disabled={!soundEnabled}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-sm text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-50 dark:bg-slate-800 disabled:text-slate-400"
                    />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Placeholders: <span className="text-[#a855f7]">{'{NUMBER}'}</span>, <span className="text-[#a855f7]">{'{NAME}'}</span>, <span className="text-[#a855f7]">{'{ROOM}'}</span>
                    </p>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3 rounded-b-lg">
                <button
                    onClick={onClose}
                    className="px-6 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 text-[13px] font-medium rounded-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-[#a855f7] text-white text-[13px] font-medium rounded-sm flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <Settings size={14} />
                    Save Settings
                </button>
            </div>
        </Modal>
    );
};
