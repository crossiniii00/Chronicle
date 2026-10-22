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
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-[0.18em] rounded-none">
                    <BadgeCheck size={12} />
                    Service Online
                </span>
            </div>

            {/* Display URL and Controls */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Queue Display URL</h3>
                    <p className="text-xs text-surface-500 mt-0.5 font-medium">Use this URL on an external screen or monitor for candidate queuing.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={queueDisplayUrl}
                        readOnly
                        className="px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-none text-xs font-mono text-surface-700 w-64 focus:outline-none"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(queueDisplayUrl);
                            success('Copied!', 'URL copied to clipboard');
                        }}
                        className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 border border-surface-200 rounded-none transition-all"
                        title="Copy Link"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={() => window.open(queueDisplayUrl, '_blank')}
                        className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 border border-surface-200 rounded-none transition-all"
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Configuration Tabs Form */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                    {/* Tab Selectors */}
                    <div className="flex border-b border-surface-200 bg-surface-50">
                        <button
                            onClick={() => setActiveTab('counter')}
                            className={`flex-1 py-3.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'counter'
                                    ? 'border-primary-600 text-primary-600 bg-white dark:bg-slate-900'
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
                                    ? 'border-primary-600 text-primary-600 bg-white dark:bg-slate-900'
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
                                    ? 'border-primary-600 text-primary-600 bg-white dark:bg-slate-900'
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
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="e.g. Q-"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Next Starting Number</label>
                                        <input
                                            type="number"
                                            value={currentNumber}
                                            onChange={(e) => setCurrentNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Auto-Reset Counter</label>
                                        <select
                                            value={autoReset}
                                            onChange={(e) => setAutoReset(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900"
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
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Buffer Time Between Calls</label>
                                        <select
                                            value={bufferTime}
                                            onChange={(e) => setBufferTime(Number(e.target.value))}
                                            className="w-full md:w-1/2 px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900"
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
                                        <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Announcement Chime Tone</label>
                                        <select
                                            value={audioTone}
                                            onChange={(e) => setAudioTone(e.target.value)}
                                            disabled={!soundEnabled}
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900 disabled:opacity-55"
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
                                            className="w-full appearance-none pl-3 pr-8 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900"
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

                                <div className="p-4 bg-surface-50 border border-surface-200 rounded-none flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-surface-800">Test Voice Engine</span>
                                        <span className="text-[11px] text-surface-400 block mt-0.5">Listen to a sample queue announcement using the current settings.</span>
                                    </div>
                                    <button
                                        onClick={playTestAudio}
                                        className="h-8 px-4 inline-flex items-center gap-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 text-xs font-bold uppercase tracking-wider rounded-none transition-all"
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
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900"
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
                                            className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1.5">Ticker Display Banner Message</label>
                                    <textarea
                                        value={bannerMessage}
                                        onChange={(e) => setBannerMessage(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
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
                                            <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-surface-600 mb-1.5">Target Wait Threshold (Minutes)</label>
                                        <input
                                            type="number"
                                            value={targetWaitTime}
                                            onChange={(e) => setTargetWaitTime(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full md:w-1/2 px-3 py-1.5 border border-surface-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                        >
                            <RefreshCw size={12} className="animate-spin-hover" />
                            Update Settings
                        </button>
                    </div>
                </div>

                {/* Right Preview Panel */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-surface-100">
                            <Sparkles size={16} className="text-amber-500 animate-pulse" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700">Display Layout Preview</h4>
                        </div>

                        {/* Simulated Monitor Display */}
                        <div className="border border-surface-300 rounded-none overflow-hidden bg-surface-50 shadow-inner flex flex-col h-52 text-[10px]">
                            {/* Simulator header */}
                            <div className="bg-white dark:bg-slate-900 border-b border-surface-200 py-1.5 px-3 flex items-center justify-between">
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
                            <div className="bg-white dark:bg-slate-900 border-t border-surface-200 py-1 px-3 flex items-center justify-between text-[9px] text-surface-500">
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

                    <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm p-5 space-y-4">
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
            success('Backup created', `${backupType.charAt(0).toUpperCase() + backupType.slice(1)} backup saved successfully.`);
            if (res?.filename) {
                BackupService.downloadBackup(res.filename);
            }
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Backup failed', e.response?.data?.message || e.message || 'Failed to create backup.');
        } finally {
            setLoading(false);
        }
    };

    const restoreBackup = async () => {
        if (!selectedBackup) return;
        setLoading(true);
        try {
            await BackupService.restoreBackup(selectedBackup.filename);
            success('Restore completed', 'Database restored successfully.');
            setRestoreModal(false);
            setSelectedBackup(null);
            await fetchHistory();
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Restore failed', e.response?.data?.message || e.message || 'Failed to restore.');
        } finally {
            setLoading(false);
        }
    };

    const deleteBackup = async (backup: BackupHistoryEntry) => {
        try {
            await BackupService.deleteBackup(backup.filename);
            await fetchHistory();
            success('Deleted', 'Backup removed.');
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Delete failed', e.response?.data?.message || e.message || 'Failed to delete.');
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
            success('Imported', 'Backup file uploaded.');
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            error('Import failed', e.response?.data?.message || e.message || 'Failed to upload.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const backupTypeLabels: Record<string, { label: string; desc: string }> = {
        full: { label: 'Full', desc: 'All tables and data' },
        incremental: { label: 'Incremental', desc: 'Data only, keeps configs' },
        settings: { label: 'Settings', desc: 'Config tables only' }
    };

    return (
        <div className="text-left bg-white dark:bg-slate-900 min-h-screen font-sans text-neutral-800">
            {/* Header */}
            <div className="border-b border-neutral-200">
                <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <ArchiveRestore size={20} className="text-blue-600" />
                        <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Backup & Restore</h1>
                    </div>
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-medium cursor-pointer transition-colors rounded">
                        <Upload size={14} />
                        Import
                        <input type="file" accept=".sql" onChange={handleImport} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
                {/* Active Backup */}
                <div className="border border-neutral-200 rounded bg-white dark:bg-slate-900">
                    <div className="px-4 py-3 flex items-center justify-between">
                        {activeBackup ? (
                            <div className="flex items-center gap-3 min-w-0">
                                <Database size={16} className="text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-800 truncate">{activeBackup.filename}</p>
                                    <p className="text-[11px] text-neutral-500">
                                        Restored {formatDate(activeBackup.restored_at)} · {formatSize(activeBackup.size)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-500" />
                                <span className="text-sm text-neutral-600">No active restore point</span>
                            </div>
                        )}
                        {activeBackup && (
                            <button onClick={() => BackupService.downloadBackup(activeBackup.filename)} className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors" title="Download active backup">
                                <Download size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Create Backup */}
                <div className="border border-neutral-200 rounded bg-white dark:bg-slate-900">
                    <div className="px-4 py-3 border-b border-neutral-100">
                        <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Create Backup</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-2">
                            {Object.entries(backupTypeLabels).map(([key, { label, desc }]) => (
                                <button
                                    key={key}
                                    onClick={() => setBackupType(key as 'full' | 'incremental' | 'settings')}
                                    className={`flex-1 px-3 py-2.5 border rounded text-left transition-all ${
                                        backupType === key
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-neutral-200 hover:border-neutral-300'
                                    }`}
                                >
                                    <span className={`block text-xs font-semibold ${backupType === key ? 'text-blue-700' : 'text-neutral-700'}`}>{label}</span>
                                    <span className="block text-[10px] text-neutral-500 mt-0.5">{desc}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={createBackup}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded disabled:bg-neutral-300 transition-colors"
                        >
                            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            {loading ? 'Processing...' : 'Run Backup'}
                        </button>
                    </div>
                </div>

                {/* Scheduler */}
                {scheduleSettings && (
                    <div className="border border-neutral-200 rounded bg-white dark:bg-slate-900">
                        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Auto-Backup</h3>
                            <input
                                type="checkbox"
                                checked={scheduleSettings.enabled}
                                onChange={(e) => setScheduleSettings({ ...scheduleSettings, enabled: e.target.checked })}
                                className="rounded border-neutral-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                            />
                        </div>
                        {scheduleSettings.enabled && (
                            <div className="p-4 flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-500">Every</span>
                                    <select
                                        value={scheduleSettings.frequency}
                                        onChange={(e) => setScheduleSettings({ ...scheduleSettings, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                                        className="border border-neutral-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs rounded outline-none focus:border-blue-500"
                                    >
                                        <option value="daily">Day</option>
                                        <option value="weekly">Week (Sunday)</option>
                                        <option value="monthly">Month (1st)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-500">at</span>
                                    <input
                                        type="time"
                                        value={scheduleSettings.time}
                                        onChange={(e) => setScheduleSettings({ ...scheduleSettings, time: e.target.value })}
                                        className="border border-neutral-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs rounded outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-500">Keep last</span>
                                    <input
                                        type="number" min={1} max={100}
                                        value={scheduleSettings.keepLast}
                                        onChange={(e) => setScheduleSettings({ ...scheduleSettings, keepLast: parseInt(e.target.value) || 3 })}
                                        className="w-14 border border-neutral-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs rounded outline-none focus:border-blue-500 text-center font-mono"
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        setLoading(true);
                                        try { await BackupService.saveSettings(scheduleSettings); success('Saved', 'Scheduler updated.'); }
                                        catch { error('Failed', 'Could not save scheduler settings.'); }
                                        finally { setLoading(false); }
                                    }}
                                    disabled={loading}
                                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium border border-neutral-200 rounded transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Backup History */}
                <div className="border border-neutral-200 rounded bg-white dark:bg-slate-900">
                    <div className="px-4 py-3 border-b border-neutral-100">
                        <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                            Backup History ({backupHistory.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
                                    <th className="px-4 py-2.5">Filename</th>
                                    <th className="px-4 py-2.5">Type</th>
                                    <th className="px-4 py-2.5">Size</th>
                                    <th className="px-4 py-2.5">Date</th>
                                    <th className="px-4 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {backupHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-xs text-neutral-400">No backups yet.</td>
                                    </tr>
                                ) : (
                                    backupHistory.map(b => (
                                        <tr key={b.id} className="hover:bg-neutral-50/50">
                                            <td className="px-4 py-2.5 text-xs font-medium text-neutral-700 max-w-[300px] truncate">{b.filename}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                    b.type === 'full' ? 'bg-blue-50 text-blue-700' :
                                                    b.type === 'incremental' ? 'bg-amber-50 text-amber-700' :
                                                    b.type === 'settings' ? 'bg-purple-50 text-purple-700' :
                                                    'bg-neutral-50 text-neutral-600'
                                                }`}>
                                                    {b.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-neutral-600">{formatSize(b.size)}</td>
                                            <td className="px-4 py-2.5 text-xs text-neutral-500">{formatDate(b.created_at)}</td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button onClick={() => { setSelectedBackup({ id: b.id, filename: b.filename }); setRestoreModal(true); }} className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors rounded" title="Restore">
                                                        <Upload size={13} />
                                                    </button>
                                                    <button onClick={() => BackupService.downloadBackup(b.filename)} className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded" title="Download">
                                                        <Download size={13} />
                                                    </button>
                                                    <button onClick={() => setRestoreConfirm(b)} className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors rounded" title="Delete">
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

            {/* Restore Modal */}
            <Modal open={restoreModal} onClose={() => setRestoreModal(false)} title="Restore Database" size="md">
                {selectedBackup && (
                    <div className="space-y-4 p-2">
                        <div className="bg-red-50 border border-red-200 p-3 rounded flex gap-3">
                            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-semibold text-red-800">This will replace your current database</h4>
                                <p className="text-[11px] text-red-700 mt-1">All current data will be overwritten with the backup contents. This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="border border-neutral-200 bg-neutral-50 p-3 rounded text-xs space-y-1">
                            <div className="flex justify-between"><span className="text-neutral-500">File</span><span className="font-medium text-neutral-800 truncate max-w-[250px]">{selectedBackup.filename}</span></div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRestoreModal(false)} className="px-4 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-xs font-medium text-neutral-600 rounded transition-colors">Cancel</button>
                            <button onClick={restoreBackup} disabled={loading} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded disabled:bg-neutral-300 transition-colors">
                                {loading ? 'Restoring...' : 'Restore'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!restoreConfirm}
                title="Delete Backup"
                message={`Permanently delete "${restoreConfirm?.filename}"?`}
                onConfirm={() => { if (restoreConfirm) deleteBackup(restoreConfirm); }}
                onClose={() => setRestoreConfirm(null)}
            />
        </div>
    );
}

export function AdminNotifications() {
    return <div className="p-8"><h1 className="text-3xl font-bold text-white mb-4">Admin Notifications</h1><div className="text-gray-400">(Shared component — see below)</div></div>;
}
