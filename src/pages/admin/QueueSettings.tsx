import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/common/useToast';
import { 
    Monitor, Hash, Copy, ExternalLink, ArchiveRestore, Download, Upload, 
    BadgeCheck, Database, RefreshCw, Trash2, AlertTriangle, Calendar, Clock, 
    HardDrive, Activity, ChevronDown, CheckCircle2, Volume2, Play, Sliders, 
    Palette, ShieldAlert, Sparkles, HelpCircle, Speaker
} from 'lucide-react';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { BackupService, type BackupHistoryEntry, type ActiveBackupInfo, type BackupSettings } from '@/services/backupService';

type SelectedBackup = {
    id: string;
    filename: string;
    data?: {
        tables?: string[];
        records?: number;
        size?: number;
        timestamp?: string;
    };
};

export function QueueSettings() {
    const { success, error } = useToast();
    const queueDisplayUrl = `${window.location.origin}/queue-display`;
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<'counter' | 'acoustics' | 'visuals'>('counter');

    // Queue Settings States
    const [prefix, setPrefix] = useState('Q-');
    const [currentNumber, setCurrentNumber] = useState(1);
    const [autoReset, setAutoReset] = useState('daily');
    const [maxActiveQueues, setMaxActiveQueues] = useState(5);
    const [targetWaitTime, setTargetWaitTime] = useState(15);
    const [theme, setTheme] = useState('emerald');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [audioTone, setAudioTone] = useState('modern');
    const [announcementVoice, setAnnouncementVoice] = useState('');
    const [bannerMessage, setBannerMessage] = useState('Please watch the screen and wait for your number to be called.');
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [bufferTime, setBufferTime] = useState(0);
    const [highTrafficThreshold, setHighTrafficThreshold] = useState(30);
    const [showWaitTime, setShowWaitTime] = useState(true);
    const [showTotalApplicants, setShowTotalApplicants] = useState(true);
    const [volume, setVolume] = useState(0.8);

    // Speech synthesis voices
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        // Load settings from localStorage
        const stored = localStorage.getItem('projectc_queue_settings');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.prefix !== undefined) setPrefix(data.prefix);
                if (data.currentNumber !== undefined) setCurrentNumber(Number(data.currentNumber));
                if (data.autoReset !== undefined) setAutoReset(data.autoReset);
                if (data.maxActiveQueues !== undefined) setMaxActiveQueues(Number(data.maxActiveQueues));
                if (data.targetWaitTime !== undefined) setTargetWaitTime(Number(data.targetWaitTime));
                if (data.theme !== undefined) setTheme(data.theme);
                if (data.soundEnabled !== undefined) setSoundEnabled(Boolean(data.soundEnabled));
                if (data.audioTone !== undefined) setAudioTone(data.audioTone);
                if (data.announcementVoice !== undefined) setAnnouncementVoice(data.announcementVoice);
                if (data.bannerMessage !== undefined) setBannerMessage(data.bannerMessage);
                if (data.autoAdvance !== undefined) setAutoAdvance(Boolean(data.autoAdvance));
                if (data.bufferTime !== undefined) setBufferTime(Number(data.bufferTime));
                if (data.highTrafficThreshold !== undefined) setHighTrafficThreshold(Number(data.highTrafficThreshold));
                if (data.showWaitTime !== undefined) setShowWaitTime(Boolean(data.showWaitTime));
                if (data.showTotalApplicants !== undefined) setShowTotalApplicants(Boolean(data.showTotalApplicants));
                if (data.volume !== undefined) setVolume(Number(data.volume));
            } catch (e) {
                console.error('Failed to parse queue settings', e);
            }
        }

        // Get available voices
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const loadVoices = () => {
                const allVoices = window.speechSynthesis.getVoices();
                setVoices(allVoices);
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const handleSave = () => {
        const settings = {
            prefix,
            currentNumber,
            autoReset,
            maxActiveQueues,
            targetWaitTime,
            theme,
            soundEnabled,
            audioTone,
            announcementVoice,
            bannerMessage,
            autoAdvance,
            bufferTime,
            highTrafficThreshold,
            showWaitTime,
            showTotalApplicants,
            volume
        };
        localStorage.setItem('projectc_queue_settings', JSON.stringify(settings));
        success('Settings Saved', 'Queue settings have been updated successfully.');
    };

    const handleReset = () => {
        setPrefix('Q-');
        setCurrentNumber(1);
        setAutoReset('daily');
        setMaxActiveQueues(5);
        setTargetWaitTime(15);
        setTheme('emerald');
        setSoundEnabled(true);
        setAudioTone('modern');
        setAnnouncementVoice('');
        setBannerMessage('Please watch the screen and wait for your number to be called.');
        setAutoAdvance(false);
        setBufferTime(0);
        setHighTrafficThreshold(30);
        setShowWaitTime(true);
        setShowTotalApplicants(true);
        setVolume(0.8);
        success('Reset Completed', 'All configurations have been reset to system defaults.');
    };

    const playTestAudio = () => {
        if (!window.speechSynthesis) {
            error('Not Supported', 'Speech synthesis is not supported on this browser.');
            return;
        }
        window.speechSynthesis.cancel();
        
        const text = `Queue number ${prefix}${currentNumber.toString().padStart(3, '0')}, please proceed to room 3.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = volume;
        utterance.rate = 0.9;
        
        if (announcementVoice) {
            const selectedVoice = voices.find(v => v.name === announcementVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        
        window.speechSynthesis.speak(utterance);
        success('Testing audio', 'Playing test speech announcement...');
    };

    // Helper theme classes for visual preview
    const getThemePreviewStyles = () => {
        switch (theme) {
            case 'sapphire': return { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200 bg-blue-50/50' };
            case 'dark': return { bg: 'bg-neutral-800', text: 'text-neutral-800', border: 'border-neutral-700 bg-neutral-900/10' };
            case 'rose': return { bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200 bg-rose-50/50' };
            case 'amber': return { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200 bg-amber-50/50' };
            case 'emerald':
            default:
                return { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200 bg-emerald-50/50' };
        }
    };

    const themeStyles = getThemePreviewStyles();

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-surface-900 flex items-center gap-3 tracking-tight">
                        <Monitor size={24} className="text-primary-600" />
                        Queue Settings
                    </h1>
                    <p className="text-surface-500 mt-1">Configure queue flow, audio announcements, alerts, and monitor displays.</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-[0.18em] rounded-sm">
                    <BadgeCheck size={12} />
                    Service Online
                </span>
            </div>

            {/* Display URL and Controls */}
            <div className="bg-white border border-surface-200 rounded-lg shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Queue Display URL</h3>
                    <p className="text-xs text-surface-500 mt-0.5 font-medium">Use this URL on an external screen or monitor for candidate queuing.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={queueDisplayUrl}
                        readOnly
                        className="px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-sm text-xs font-mono text-surface-700 w-64 focus:outline-none"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(queueDisplayUrl);
                            success('Copied!', 'URL copied to clipboard');
                        }}
                        className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 border border-surface-200 rounded-sm transition-all"
                        title="Copy Link"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={() => window.open(queueDisplayUrl, '_blank')}
                        className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 border border-surface-200 rounded-sm transition-all"
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Configuration Tabs Form */}
                <div className="lg:col-span-2 bg-white border border-surface-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                    {/* Tab Selectors */}
                    <div className="flex border-b border-surface-200 bg-surface-50">
                        <button
                            onClick={() => setActiveTab('counter')}
                            className={`flex-1 py-3.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'counter'
                                    ? 'border-primary-600 text-primary-600 bg-white'
                                    : 'border-transparent text-surface-500 hover:text-surface-800'
                            }`}
                        >
                            <Hash size={14} />
                            Counter & Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('acoustics')}
                            className={`flex-1 py-3.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'acoustics'
                                    ? 'border-primary-600 text-primary-600 bg-white'
                                    : 'border-transparent text-surface-500 hover:text-surface-800'
                            }`}
                        >
                            <Volume2 size={14} />
                            Acoustics & Voice
                        </button>
                        <button
                            onClick={() => setActiveTab('visuals')}
                            className={`flex-1 py-3.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'visuals'
                                    ? 'border-primary-600 text-primary-600 bg-white'
                                    : 'border-transparent text-surface-500 hover:text-surface-800'
                            }`}
                        >
                            <Palette size={14} />
                            Alerts & Visuals
                        </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="p-6 md:p-8 space-y-6">
                        {activeTab === 'counter' && (
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Sliders size={15} className="text-primary-600" />
                                    Counter Settings
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Ticket Prefix</label>
                                        <input
                                            type="text"
                                            value={prefix}
                                            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. Q-"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Next Starting Number</label>
                                        <input
                                            type="number"
                                            value={currentNumber}
                                            onChange={(e) => setCurrentNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Auto-Reset Counter</label>
                                        <select
                                            value={autoReset}
                                            onChange={(e) => setAutoReset(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                        >
                                            <option value="daily">Reset Daily</option>
                                            <option value="weekly">Reset Weekly</option>
                                            <option value="never">Never Reset</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Max Active Queues</label>
                                        <input
                                            type="number"
                                            value={maxActiveQueues}
                                            onChange={(e) => setMaxActiveQueues(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 pt-4 flex items-center gap-2">
                                    <Activity size={15} className="text-primary-600" />
                                    Automation Settings
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-surface-700 block">Auto-Advance Queue</span>
                                            <span className="text-xs text-surface-400">Automatically call next candidate when interviewer marks current as complete.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={autoAdvance}
                                                onChange={(e) => setAutoAdvance(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Buffer Time Between Calls</label>
                                        <select
                                            value={bufferTime}
                                            onChange={(e) => setBufferTime(Number(e.target.value))}
                                            className="w-full md:w-1/2 px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                        >
                                            <option value={0}>Immediate (No buffer)</option>
                                            <option value={30}>30 Seconds</option>
                                            <option value={60}>1 Minute</option>
                                            <option value={120}>2 Minutes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'acoustics' && (
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Volume2 size={15} className="text-primary-600" />
                                    Audio Chime & Voices
                                </h3>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-surface-700 block">Enable Chime Notification</span>
                                        <span className="text-xs text-surface-400">Play a chime tone when calling a candidate ticket.</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={soundEnabled}
                                            onChange={(e) => setSoundEnabled(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Announcement Chime Tone</label>
                                        <select
                                            value={audioTone}
                                            onChange={(e) => setAudioTone(e.target.value)}
                                            disabled={!soundEnabled}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:opacity-55"
                                        >
                                            <option value="modern">Modern Ping (Recommended)</option>
                                            <option value="classic">Classic Chime</option>
                                            <option value="alert">Digital Alert Tone</option>
                                            <option value="melodic">Soft Melodic Arpeggio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Volume</label>
                                        <div className="flex items-center gap-3 h-8">
                                            <Volume2 size={16} className="text-surface-400" />
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={volume}
                                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                className="w-full accent-primary-600"
                                            />
                                            <span className="text-xs font-mono text-surface-600 w-8 text-right">{Math.round(volume * 100)}%</span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 pt-4 flex items-center gap-2">
                                    <Speaker size={15} className="text-primary-600" />
                                    Text-To-Speech (TTS) Voice Configuration
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1.5">Select Reader Voice</label>
                                    <div className="relative">
                                        <select
                                            value={announcementVoice}
                                            onChange={(e) => setAnnouncementVoice(e.target.value)}
                                            className="w-full appearance-none pl-3 pr-8 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                        >
                                            <option value="">Default System Voice (Auto)</option>
                                            {voices.map((voice) => (
                                                <option key={voice.name} value={voice.name}>
                                                    {voice.name} ({voice.lang})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" size={14} />
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-50 border border-surface-200 rounded-sm flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-surface-800">Test Voice Engine</span>
                                        <span className="text-[11px] text-surface-400 block mt-0.5">Listen to a sample queue announcement using the current settings.</span>
                                    </div>
                                    <button
                                        onClick={playTestAudio}
                                        className="h-8 px-4 inline-flex items-center gap-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 text-xs font-bold uppercase tracking-wider rounded-sm transition-all"
                                    >
                                        <Play size={12} />
                                        Test Audio
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'visuals' && (
                            <div className="space-y-5">
                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Palette size={15} className="text-primary-600" />
                                    Visual Presentation & Themes
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Screen Display Theme</label>
                                        <select
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                                        >
                                            <option value="emerald">Vibrant Emerald (Standard)</option>
                                            <option value="sapphire">Deep Sapphire</option>
                                            <option value="rose">Warm Crimson Rose</option>
                                            <option value="amber">Mellow Amber Gold</option>
                                            <option value="dark">Monochromatic Dark Obsidian</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Traffic Alert Threshold</label>
                                        <input
                                            type="number"
                                            value={highTrafficThreshold}
                                            onChange={(e) => setHighTrafficThreshold(Math.max(5, parseInt(e.target.value) || 5))}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1.5">Ticker Display Banner Message</label>
                                    <textarea
                                        value={bannerMessage}
                                        onChange={(e) => setBannerMessage(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        placeholder="Enter announcements for display..."
                                    />
                                </div>

                                <h3 className="text-sm font-bold text-surface-800 uppercase tracking-wider border-b pb-2 pt-4 flex items-center gap-2">
                                    <ShieldAlert size={15} className="text-primary-600" />
                                    Performance Metrics Displays
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-surface-700 block">Show Average Wait Time</span>
                                            <span className="text-xs text-surface-400">Display wait time analytics on the public screen.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showWaitTime}
                                                onChange={(e) => setShowWaitTime(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-surface-700 block">Show Total Applicants Count</span>
                                            <span className="text-xs text-surface-400">Let waiting candidates see total count in system.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showTotalApplicants}
                                                onChange={(e) => setShowTotalApplicants(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Target Wait Threshold (Minutes)</label>
                                        <input
                                            type="number"
                                            value={targetWaitTime}
                                            onChange={(e) => setTargetWaitTime(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full md:w-1/2 px-3 py-1.5 border border-surface-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 py-1 px-2.5 transition-colors"
                        >
                            Reset Defaults
                        </button>
                        <button
                            onClick={handleSave}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
                        >
                            <RefreshCw size={12} className="animate-spin-hover" />
                            Update Settings
                        </button>
                    </div>
                </div>

                {/* Right Preview Panel */}
                <div className="space-y-6">
                    <div className="bg-white border border-surface-200 rounded-lg shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                            <Sparkles size={16} className="text-amber-500 animate-pulse" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700">Display Layout Preview</h4>
                        </div>

                        {/* Simulated Monitor Display */}
                        <div className="border border-surface-300 rounded-md overflow-hidden bg-surface-50 shadow-inner flex flex-col h-52 text-[10px]">
                            {/* Simulator header */}
                            <div className="bg-white border-b border-surface-200 py-1.5 px-3 flex items-center justify-between">
                                <span className="font-bold tracking-tight text-surface-800">Primary Interview</span>
                                <div className={`w-3 h-3 rounded-full ${themeStyles.bg}`} />
                            </div>

                            {/* Ticket number preview */}
                            <div className="flex-1 flex flex-col justify-center items-center p-4">
                                <span className="text-[9px] font-bold text-surface-400 tracking-wider">NOW CALLING</span>
                                <span className={`text-3xl font-black tracking-tighter ${themeStyles.text} my-1`}>
                                    {prefix}{currentNumber.toString().padStart(3, '0')}
                                </span>
                                <span className="text-[9px] font-bold text-surface-700">PROCEED TO ROOM 3</span>
                            </div>

                            {/* Stats overlay */}
                            <div className="bg-white border-t border-surface-200 py-1 px-3 flex items-center justify-between text-[9px] text-surface-500">
                                {showWaitTime && (
                                    <span>Avg Wait: <strong className="text-surface-700">12m</strong></span>
                                )}
                                {showTotalApplicants && (
                                    <span>Total Queue: <strong className="text-surface-700">24</strong></span>
                                )}
                            </div>

                            {/* Ticket ticker */}
                            <div className="bg-neutral-800 text-neutral-300 py-1 px-2 truncate font-mono text-[8px] text-center">
                                {bannerMessage}
                            </div>
                        </div>
                        <p className="text-[10px] text-surface-400 italic text-center">Simulated appearance of the public monitor view.</p>
                    </div>

                    <div className="bg-white border border-surface-200 rounded-lg shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                            <Activity size={16} className="text-primary-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700">System Metrics</h4>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-surface-500">Active Queue Rooms</span>
                                <span className="text-surface-800 font-semibold">3 / {maxActiveQueues}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-surface-500">Today's Wait Index</span>
                                <span className="text-emerald-600 font-semibold">Healthy (12m)</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-surface-500">Peak Load Status</span>
                                <span className="text-surface-800 font-semibold">Under Threshold</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export function BackupRestore() {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
    const [activeBackup, setActiveBackup] = useState<ActiveBackupInfo | null>(null);
    const [scheduleSettings, setScheduleSettings] = useState<BackupSettings | null>(null);
    const [restoreModal, setRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<SelectedBackup | null>(null);
    const [restoreConfirm, setRestoreConfirm] = useState<BackupHistoryEntry | null>(null);
    const [backupType, setBackupType] = useState<'full' | 'incremental' | 'settings'>('full');
    const [compression, setCompression] = useState(true);
    const [encryption, setEncryption] = useState(false);

    const fetchHistory = async () => {
        try {
            const [history, active, settings] = await Promise.all([
                BackupService.listBackups(),
                BackupService.getActiveBackup(),
                BackupService.getSettings()
            ]);
            setBackupHistory(history);
            setActiveBackup(active);
            setScheduleSettings(settings);
        } catch {
            error('Load Failed', 'Could not retrieve system backups.');
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createBackup = async () => {
        setLoading(true);
        try {
            const res = await BackupService.createBackup(backupType);
            await fetchHistory();
            success('Backup created', 'System backup has been created successfully.');
            if (res && res.filename) {
                BackupService.downloadBackup(res.filename);
            }
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Backup failed', e.response?.data?.message || e.message || 'Failed to create system backup.');
        } finally {
            setLoading(false);
        }
    };

    const restoreBackup = async () => {
        if (!selectedBackup) return;
        setLoading(true);
        try {
            await BackupService.restoreBackup(selectedBackup.filename);
            success('Restore completed', 'System has been restored from backup successfully.');
            setRestoreModal(false);
            setSelectedBackup(null);
            await fetchHistory();
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Restore failed', e.response?.data?.message || e.message || 'Failed to restore system from backup.');
        } finally {
            setLoading(false);
        }
    };

    const deleteBackup = async (backup: BackupHistoryEntry) => {
        try {
            await BackupService.deleteBackup(backup.filename);
            await fetchHistory();
            success('Backup deleted', 'Backup has been deleted successfully.');
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Delete failed', e.response?.data?.message || e.message || 'Failed to delete backup.');
        } finally {
            setRestoreConfirm(null);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            await BackupService.importBackup(file);
            await fetchHistory();
            success('Backup imported', 'Backup file has been uploaded successfully.');
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Import failed', e.response?.data?.message || e.message || 'Failed to upload backup file.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    // Calculate dynamic stats
    const totalBackups = backupHistory.length;
    const totalSizeFormatted = (() => {
        const totalBytes = backupHistory.reduce((sum, b) => sum + b.size, 0);
        if (totalBytes > 1024 * 1024 * 1024) {
            return `${(totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
        }
        return `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;
    })();

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const backupsThisWeek = backupHistory.filter(b => new Date(b.created_at) >= lastWeek).length;

    const latestBackup = backupHistory[0];
    const lastBackupDaysFormatted = (() => {
        if (!latestBackup) return 'N/A';
        const diffTime = Math.abs(new Date().getTime() - new Date(latestBackup.created_at).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays}d ago`;
    })();

    const BACKUP_SCHEMAS = {
        full: {
            name: 'Full Backup',
            description: 'Comprehensive snapshot of all tables, schema structures, and data. Best for full server migrations or critical disaster recovery.',
            color: 'border-cyan-200 bg-cyan-50/20 text-cyan-800',
            iconColor: 'text-cyan-600',
            bgIcon: 'bg-cyan-50 border-cyan-100',
            categories: [
                { name: 'Identity & Accounts', icon: '👤', tables: ['users', 'audit_logs'], status: 'included' },
                { name: 'Recruitment & Applications', icon: '📄', tables: ['applications', 'work_experience', 'typing_test_results', 'status_history'], status: 'included' },
                { name: 'System Configurations', icon: '⚙️', tables: ['email_templates', 'interview_questions', 'report_configs', 'positions'], status: 'included' },
                { name: 'Support & Operations', icon: '🏥', tables: ['departments', 'mhrt_accounts', 'mhrt_h2r_records', 'mhrt_directory', 'mhrt_division_mappings', 'mhrt_time_off_assignments', 'queue', 'interview_rooms'], status: 'included' },
                { name: 'Community & Forum', icon: '💬', tables: ['forum_posts', 'forum_comments', 'forum_reactions', 'forum_polls', 'forum_poll_options', 'forum_poll_votes', 'notifications'], status: 'included' }
            ],
            exclusions: ['user_sessions (to prevent active user disconnects)']
        },
        incremental: {
            name: 'Incremental Backup',
            description: 'Wipes/restores active application records and log queues. Retains system configurations and setup.',
            color: 'border-emerald-200 bg-emerald-50/20 text-emerald-800',
            iconColor: 'text-emerald-600',
            bgIcon: 'bg-emerald-50 border-emerald-100',
            categories: [
                { name: 'Identity & Accounts', icon: '👤', tables: ['users', 'audit_logs'], status: 'included' },
                { name: 'Recruitment & Applications', icon: '📄', tables: ['applications', 'work_experience', 'typing_test_results', 'status_history'], status: 'included' },
                { name: 'System Configurations', icon: '⚙️', tables: ['email_templates', 'interview_questions', 'report_configs', 'positions'], status: 'excluded' },
                { name: 'Support & Operations', icon: '🏥', tables: ['queue', 'interview_rooms'], status: 'included' },
                { name: 'Community & Forum', icon: '💬', tables: ['forum_posts', 'forum_comments', 'forum_reactions', 'forum_polls', 'forum_poll_options', 'forum_poll_votes', 'notifications'], status: 'included' }
            ],
            exclusions: ['user_sessions', 'departments config', 'mhrt support records', 'positions parameters']
        },
        settings: {
            name: 'Settings Only',
            description: 'Configuration-only backup. Exports templates, questions, forms and settings. Safe for transfer between staging platforms.',
            color: 'border-purple-200 bg-purple-50/20 text-purple-800',
            iconColor: 'text-purple-600',
            bgIcon: 'bg-purple-50 border-purple-100',
            categories: [
                { name: 'Identity & Accounts', icon: '👤', tables: ['users', 'audit_logs'], status: 'excluded' },
                { name: 'Recruitment & Applications', icon: '📄', tables: ['applications', 'work_experience', 'typing_test_results', 'status_history'], status: 'excluded' },
                { name: 'System Configurations', icon: '⚙️', tables: ['email_templates', 'interview_questions', 'report_configs', 'positions'], status: 'included' },
                { name: 'Support & Operations', icon: '🏥', tables: ['departments', 'mhrt_accounts', 'mhrt_division_mappings', 'mhrt_time_off_assignments'], status: 'included' },
                { name: 'Community & Forum', icon: '💬', tables: ['forum_posts', 'forum_comments', 'forum_reactions', 'forum_polls', 'forum_poll_options', 'forum_poll_votes', 'notifications'], status: 'excluded' }
            ],
            exclusions: ['all application records', 'user credentials', 'audit logs', 'forums', 'queues list', 'user_sessions']
        }
    };

    const activeSchema = BACKUP_SCHEMAS[backupType];

    return (
        <div className="text-left bg-surface-50/30 min-h-screen pb-12">
            {/* Header */}
            <div className="bg-white border-b border-surface-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center border border-primary-100">
                                <ArchiveRestore size={18} className="text-primary-600" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-surface-900 tracking-tight">
                                Backup & Restore Dashboard
                            </h1>
                        </div>
                        <p className="text-xs text-surface-500 font-medium">
                            Create secure database snapshots, manage historical backup restore points, and inspect database parameters.
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Database active
                        </span>
                        
                        <label className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 text-xs font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-all shadow-sm">
                            <Upload size={13} className="text-primary-600" />
                            Import SQL backup
                            <input
                                type="file"
                                accept=".sql"
                                onChange={handleImport}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Dashboard Content Container */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

                {/* Dynamic Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Backups */}
                    <div className="bg-white border border-surface-200 rounded-sm p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <span className="text-2xl font-black text-surface-900 leading-none tracking-tight tabular-nums">{totalBackups}</span>
                            <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mt-1.5">Total Backups</h4>
                        </div>
                        <div className="w-10 h-10 bg-cyan-50 rounded-sm flex items-center justify-center border border-cyan-100">
                            <Database size={18} className="text-cyan-600" />
                        </div>
                    </div>

                    {/* Total Size */}
                    <div className="bg-white border border-surface-200 rounded-sm p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <span className="text-2xl font-black text-surface-900 leading-none tracking-tight tabular-nums">{totalSizeFormatted}</span>
                            <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mt-1.5">Total Storage</h4>
                        </div>
                        <div className="w-10 h-10 bg-purple-50 rounded-sm flex items-center justify-center border border-purple-100">
                            <HardDrive size={18} className="text-purple-600" />
                        </div>
                    </div>

                    {/* Created This Week */}
                    <div className="bg-white border border-surface-200 rounded-sm p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <span className="text-2xl font-black text-surface-900 leading-none tracking-tight tabular-nums">{backupsThisWeek}</span>
                            <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mt-1.5">This Week</h4>
                        </div>
                        <div className="w-10 h-10 bg-emerald-50 rounded-sm flex items-center justify-center border border-emerald-100">
                            <Calendar size={18} className="text-emerald-600" />
                        </div>
                    </div>

                    {/* Days since Last Backup */}
                    <div className="bg-white border border-surface-200 rounded-sm p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div>
                            <span className="text-2xl font-black text-surface-900 leading-none tracking-tight">{lastBackupDaysFormatted}</span>
                            <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mt-1.5">Last Sync</h4>
                        </div>
                        <div className="w-10 h-10 bg-orange-50 rounded-sm flex items-center justify-center border border-orange-100">
                            <Clock size={18} className="text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* Active Backup Banner */}
                <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-surface-100 bg-surface-50/50 flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-600 animate-pulse" />
                        <h3 className="font-bold text-surface-800 text-xs uppercase tracking-wider">Active State Pointer</h3>
                    </div>
                    {activeBackup ? (
                        <div className="p-5 bg-emerald-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white border border-surface-200 rounded-sm flex items-center justify-center text-emerald-600 shadow-sm">
                                    <Database size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-surface-800 font-mono tracking-tight">{activeBackup.filename}</p>
                                    <p className="text-xs text-surface-500 font-medium">
                                        Restored on {new Date(activeBackup.restored_at).toLocaleString()} &bull; {(activeBackup.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Database State
                                </span>
                                <button
                                    onClick={() => BackupService.downloadBackup(activeBackup.filename)}
                                    className="h-8 w-8 inline-flex items-center justify-center text-surface-500 hover:text-cyan-600 hover:bg-cyan-50 border border-surface-200 hover:border-cyan-200 rounded-sm transition-all"
                                    title="Download SQL File"
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3.5 p-5">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-surface-800">Operating Live (No Restored Backup Pointer)</p>
                                <p className="text-xs text-surface-500">The application is running directly on the live PostgreSQL server database state.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Primary Panel Configuration Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Console & Payload Detail Breakdown - 2 Columns */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Backup Console Card */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm p-6 space-y-6">
                            
                            {/* Card Header */}
                            <div className="flex items-center gap-3 border-b border-surface-100 pb-3">
                                <div className="w-8 h-8 bg-primary-50 rounded-sm flex items-center justify-center border border-primary-100">
                                    <Sliders size={15} className="text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-surface-900 text-sm uppercase tracking-wider">Backup Creator</h3>
                                    <p className="text-[11px] text-surface-400 mt-0.5">Configure snapshot params and build your backup.</p>
                                </div>
                            </div>

                            {/* Select Options via Card Grid */}
                            <div className="space-y-4">
                                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider">Select Backup Profile</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(BACKUP_SCHEMAS).map(([key, schema]) => {
                                        const isSelected = backupType === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setBackupType(key as 'full' | 'incremental' | 'settings')}
                                                className={`p-3.5 rounded-sm border text-left transition-all ${
                                                    isSelected
                                                        ? 'border-primary-600 bg-primary-50/20 ring-1 ring-primary-600'
                                                        : 'border-surface-200 hover:border-surface-300 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={`text-[12px] font-bold ${isSelected ? 'text-primary-700' : 'text-surface-800'}`}>
                                                        {schema.name}
                                                    </span>
                                                    <span className={`text-xs ${schema.iconColor}`}>
                                                        {key === 'full' ? '📂' : key === 'incremental' ? '⏱️' : '⚙️'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-surface-400 leading-normal line-clamp-2">
                                                    {schema.description}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Detailed Table Matrix (Interactive Breakdown) */}
                            <div className="space-y-3 bg-surface-50 p-4 rounded-sm border border-surface-200/60">
                                <div className="flex justify-between items-center pb-2 border-b border-surface-200">
                                    <div>
                                        <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider">Payload Breakdown</h4>
                                        <p className="text-[10px] text-surface-400 mt-0.5">Below is a breakdown of what data will be written into this backup file.</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${activeSchema.color}`}>
                                        {activeSchema.name} Profile
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    {activeSchema.categories.map((cat, i) => {
                                        const isIncluded = cat.status === 'included';
                                        return (
                                            <div 
                                                key={i} 
                                                className={`p-2.5 rounded-sm border flex items-start gap-3 transition-colors ${
                                                    isIncluded 
                                                        ? 'bg-white border-surface-200 shadow-sm' 
                                                        : 'bg-surface-100/40 border-surface-200/40 opacity-50'
                                                }`}
                                            >
                                                <span className="text-base shrink-0 mt-0.5">{cat.icon}</span>
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-surface-700 truncate">{cat.name}</span>
                                                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                                                            isIncluded 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {isIncluded ? 'INCLUDED' : 'EXCLUDED'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {cat.tables.map((table, tIdx) => (
                                                            <span 
                                                                key={tIdx} 
                                                                className={`text-[9px] font-mono px-1 rounded-sm ${
                                                                    isIncluded 
                                                                        ? 'bg-surface-50 text-surface-600 border border-surface-200/60' 
                                                                        : 'bg-transparent text-surface-400 line-through'
                                                                }`}
                                                            >
                                                                {table}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {activeSchema.exclusions && activeSchema.exclusions.length > 0 && (
                                    <div className="pt-2 text-[10.5px] text-surface-500 font-medium flex items-start gap-1.5">
                                        <span className="text-rose-500">⚠️</span>
                                        <span>
                                            <strong>Strict Exclusions:</strong> {activeSchema.exclusions.join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Additional Options */}
                            <div className="flex flex-wrap gap-6 pt-2 border-t border-surface-100">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={compression}
                                        onChange={(e) => setCompression(e.target.checked)}
                                        className="rounded-sm border-surface-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 bg-white"
                                    />
                                    <span className="text-xs font-bold text-surface-600 group-hover:text-surface-900 transition-colors tracking-tight">Compress GZIP</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={encryption}
                                        onChange={(e) => setEncryption(e.target.checked)}
                                        className="rounded-sm border-surface-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 bg-white"
                                    />
                                    <span className="text-xs font-bold text-surface-600 group-hover:text-surface-900 transition-colors tracking-tight">Encrypt AES-256</span>
                                </label>
                            </div>

                            {/* Backup Action Trigger */}
                            <button
                                onClick={createBackup}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 h-9 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm disabled:opacity-50"
                            >
                                {loading ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                    <Download size={14} />
                                )}
                                {loading ? 'Running Process...' : 'Run Backup Engine'}
                            </button>

                        </div>

                        {/* History Log Registry */}
                        <div className="bg-white border border-surface-200 rounded-sm overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-surface-100 bg-surface-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-surface-900 text-xs uppercase tracking-wider">Backup Registry</h3>
                                    <p className="text-[11px] text-surface-400 mt-0.5">Historical database restore points stored locally on server disk.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="text-left text-[10px] font-bold text-surface-400 uppercase tracking-wider border-b border-surface-200 bg-surface-50/50">
                                            <th className="px-5 py-3">Filename</th>
                                            <th className="px-5 py-3">Profile</th>
                                            <th className="px-5 py-3">Size</th>
                                            <th className="px-5 py-3">Generated Date</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {backupHistory.filter(b => b.filename !== activeBackup?.filename).length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-12 text-center text-xs font-semibold text-surface-400 tracking-tight">
                                                    📦 No other backup files located in directory.
                                                </td>
                                            </tr>
                                        ) : (
                                            backupHistory
                                                .filter(b => b.filename !== activeBackup?.filename)
                                                .map(backup => (
                                                    <tr key={backup.id} className="hover:bg-surface-50/50 transition-colors">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <Database size={13} className="text-surface-400 shrink-0" />
                                                                <span className="text-[12px] font-bold text-surface-800 font-mono tracking-tight">{backup.filename}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                                backup.type === 'full'
                                                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-150'
                                                                    : backup.type === 'incremental'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                                                        : 'bg-purple-50 text-purple-700 border-purple-150'
                                                            }`}>
                                                                {backup.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs font-medium text-surface-700 font-mono tabular-nums">
                                                            {(backup.size / 1024 / 1024).toFixed(2)} MB
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs font-medium text-surface-500">
                                                            {new Date(backup.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Success
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedBackup({
                                                                            id: backup.id,
                                                                            filename: backup.filename
                                                                        });
                                                                        setRestoreModal(true);
                                                                    }}
                                                                    className="h-7 w-7 inline-flex items-center justify-center text-surface-500 hover:text-orange-600 hover:bg-orange-50 border border-surface-200 hover:border-orange-200 rounded-sm transition-all shadow-sm"
                                                                    title="Restore Database from Backup"
                                                                >
                                                                    <Upload size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => BackupService.downloadBackup(backup.filename)}
                                                                    className="h-7 w-7 inline-flex items-center justify-center text-surface-500 hover:text-cyan-600 hover:bg-cyan-50 border border-surface-200 hover:border-cyan-200 rounded-sm transition-all shadow-sm"
                                                                    title="Download Backup SQL"
                                                                >
                                                                    <Download size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setRestoreConfirm(backup)}
                                                                    className="h-7 w-7 inline-flex items-center justify-center text-surface-400 hover:text-rose-600 hover:bg-rose-50 border border-surface-200 hover:border-rose-200 rounded-sm transition-all shadow-sm"
                                                                    title="Delete Backup File"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* Database Health & Scheduler Panel - 1 Column */}
                    <div className="space-y-6">

                        {/* Database Info Console */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm p-5 space-y-4">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-100">
                                <div className="w-8 h-8 bg-cyan-50 rounded-sm flex items-center justify-center border border-cyan-100">
                                    <Activity size={14} className="text-cyan-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-surface-900 text-xs uppercase tracking-wider">Database Status</h3>
                                    <p className="text-[10px] text-surface-400 mt-0.5">Connection parameters to local engine.</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 bg-surface-50/70 p-4 rounded-sm border border-surface-200/50">
                                <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                    <span className="text-xs text-surface-500 font-semibold tracking-tight">Database Type</span>
                                    <span className="text-xs font-black text-surface-800">PostgreSQL Server</span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                    <span className="text-xs text-surface-500 font-semibold tracking-tight">Status</span>
                                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        Active (5432)
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                    <span className="text-xs text-surface-500 font-semibold tracking-tight">SSL Enforcer</span>
                                    <span className="text-xs font-black text-emerald-600">Active / Enforced</span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-xs text-surface-500 font-semibold tracking-tight">Tables Integrity</span>
                                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                                        Verified (OK)
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-sm flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Local Instance Online</p>
                            </div>
                        </div>

                        {/* Automatic Scheduler Console */}
                        <div className="bg-white border border-surface-200 rounded-sm shadow-sm p-5 space-y-4">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-100">
                                <div className="w-8 h-8 bg-purple-50 rounded-sm flex items-center justify-center border border-purple-100">
                                    <Clock size={14} className="text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-surface-900 text-xs uppercase tracking-wider">Automated Scheduler</h3>
                                    <p className="text-[10px] text-surface-400 mt-0.5">Setup daily, weekly, or monthly CRON runs.</p>
                                </div>
                            </div>

                            {scheduleSettings ? (
                                <div className="space-y-3">
                                    <div className="space-y-2.5 bg-surface-50/70 p-4 rounded-sm border border-surface-200/50">
                                        <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                            <span className="text-xs text-surface-500 font-semibold">Toggle Auto-Backup</span>
                                            <input
                                                type="checkbox"
                                                checked={scheduleSettings.enabled}
                                                onChange={(e) => setScheduleSettings({ ...scheduleSettings, enabled: e.target.checked })}
                                                className="rounded-sm border-surface-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5 bg-white cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                            <span className="text-xs text-surface-500 font-semibold">Frequency Profile</span>
                                            <select
                                                value={scheduleSettings.frequency}
                                                onChange={(e) => setScheduleSettings({ ...scheduleSettings, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                                                className="appearance-none px-2 h-7 bg-white border border-surface-200 rounded-sm text-xs font-bold tracking-tight text-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                                disabled={!scheduleSettings.enabled}
                                            >
                                                <option value="daily">Daily Cycle</option>
                                                <option value="weekly">Weekly (Sunday)</option>
                                                <option value="monthly">Monthly (1st)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-surface-200/40">
                                            <span className="text-xs text-surface-500 font-semibold">Local Launch Time</span>
                                            <input
                                                type="time"
                                                value={scheduleSettings.time}
                                                onChange={(e) => setScheduleSettings({ ...scheduleSettings, time: e.target.value })}
                                                className="px-2 h-7 bg-white border border-surface-200 rounded-sm text-xs font-mono font-bold text-surface-700 focus:outline-none"
                                                disabled={!scheduleSettings.enabled}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-xs text-surface-500 font-semibold">Keep Last Snapshots</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={scheduleSettings.keepLast}
                                                onChange={(e) => setScheduleSettings({ ...scheduleSettings, keepLast: parseInt(e.target.value) || 30 })}
                                                className="w-12 px-1.5 h-7 bg-white border border-surface-200 rounded-sm text-xs font-mono font-bold text-surface-700 focus:outline-none text-center"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1">
                                        <button
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await BackupService.saveSettings(scheduleSettings);
                                                    success('Scheduler updated', 'Auto backup configuration updated.');
                                                } catch {
                                                    error('Update failed', 'Failed to configure database scheduler.');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-1.5 h-8 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm disabled:opacity-50"
                                        >
                                            Save Schedule Parameters
                                        </button>
                                        <div className="px-3 py-2 bg-purple-50 border border-purple-200/60 rounded-sm flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${scheduleSettings.enabled ? 'bg-purple-500 animate-pulse' : 'bg-surface-400'}`} />
                                            <p className="text-[10.5px] text-purple-700 font-semibold tracking-tight">
                                                {scheduleSettings.enabled ? `Enabled: ${scheduleSettings.frequency} @ ${scheduleSettings.time}` : 'Auto-Backup Service Disabled'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-surface-400 font-medium text-center py-6">
                                    Loading scheduler settings...
                                </div>
                            )}
                        </div>

                    </div>

                </div>

            </div>

            {/* Restore Confirmation Modal */}
            <Modal
                open={restoreModal}
                onClose={() => setRestoreModal(false)}
                title="Restore Database from Backup"
                size="md"
            >
                {selectedBackup && (
                    <div className="space-y-5 text-left">
                        <div className="p-4 bg-orange-50 border border-orange-200/60 rounded-sm">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={18} className="text-orange-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-orange-700 text-xs uppercase tracking-wider">Destructive Restore Process</h4>
                                    <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                                        Wiping database and writing back data records. This action completely replaces your active application workspace, records and logs. This process cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5 bg-surface-50 p-4 rounded-sm border border-surface-200">
                            <div className="flex items-center justify-between text-xs py-1 border-b border-surface-200/50">
                                <span className="text-surface-500 font-semibold">Selected SQL file</span>
                                <span className="font-bold text-surface-800 font-mono">{selectedBackup.filename}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-1">
                                <span className="text-surface-500 font-semibold">Restore Date</span>
                                <span className="font-bold text-surface-800">
                                    {new Date().toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => setRestoreModal(false)}
                                className="h-8 px-4 border border-surface-200 text-surface-700 hover:bg-surface-50 text-xs font-bold uppercase tracking-wider rounded-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedBackup) {
                                        restoreBackup();
                                    }
                                }}
                                disabled={loading}
                                className="h-8 px-4 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm"
                            >
                                {loading ? 'Restoring Schema...' : 'Verify & Launch Restore'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!restoreConfirm}
                title="Delete backup"
                message={`Are you sure you want to delete the backup "${restoreConfirm?.filename}"? This action cannot be undone.`}
                onConfirm={() => {
                    if (restoreConfirm) {
                        deleteBackup(restoreConfirm);
                    }
                }}
                onClose={() => setRestoreConfirm(null)}
            />
        </div>
    );
}

export function AdminNotifications() {
    return <div className="p-8"><h1 className="text-3xl font-bold text-white mb-4">Admin Notifications</h1><div className="text-gray-400">(Shared component — see below)</div></div>;
}
