import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Save, Settings2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/common/useToast';
import axios from 'axios';

interface CPTypeSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

interface CPTypeSettings {
    wpmGoal: number;
    accuracyGoal: number;
    attemptLimit: number;
    timerDuration: number;
    difficultyScaler: number;
    wpmCalculationMethod: string;
    strictCapitals: boolean;
    strictSpaces: boolean;
    shuffleMode: boolean;
}

const DEFAULT_SETTINGS: CPTypeSettings = {
    wpmGoal: 40,
    accuracyGoal: 90,
    attemptLimit: 3,
    timerDuration: 60,
    difficultyScaler: 1,
    wpmCalculationMethod: '10FASTFINGERS PRESET (GROSS WPM)',
    strictCapitals: true,
    strictSpaces: true,
    shuffleMode: true
};

export function CPTypeSettingsModal({ open, onClose }: CPTypeSettingsModalProps) {
    const { success, error: toastError } = useToast();
    const [settings, setSettings] = useState<CPTypeSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const docUrl = 'https://firestore.googleapis.com/v1/projects/cptypefinal/databases/(default)/documents/infrastructure/global_config';

    useEffect(() => {
        if (!open) return;
        
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const res = await axios.get(docUrl);
                const fields = res.data.fields;
                if (fields) {
                    setSettings({
                        wpmGoal: fields.wpmGoal ? parseInt(fields.wpmGoal.integerValue || '40') : 40,
                        accuracyGoal: fields.accuracyGoal ? parseInt(fields.accuracyGoal.integerValue || '90') : 90,
                        attemptLimit: fields.attemptLimit ? parseInt(fields.attemptLimit.integerValue || '3') : 3,
                        timerDuration: fields.timerDuration ? parseInt(fields.timerDuration.integerValue || '60') : 60,
                        difficultyScaler: fields.difficultyScaler ? parseInt(fields.difficultyScaler.integerValue || '1') : 1,
                        wpmCalculationMethod: fields.wpmCalculationMethod?.stringValue || '10FASTFINGERS PRESET (GROSS WPM)',
                        strictCapitals: fields.strictCapitals?.booleanValue ?? true,
                        strictSpaces: fields.strictSpaces?.booleanValue ?? true,
                        shuffleMode: fields.shuffleMode?.booleanValue ?? true,
                    });
                }
            } catch (err) {
                console.error("Failed to load CPType settings", err);
                toastError("Error", "Could not load remote settings from CPType.");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [open]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                fields: {
                    wpmGoal: { integerValue: settings.wpmGoal },
                    accuracyGoal: { integerValue: settings.accuracyGoal },
                    attemptLimit: { integerValue: settings.attemptLimit },
                    timerDuration: { integerValue: settings.timerDuration },
                    difficultyScaler: { integerValue: settings.difficultyScaler },
                    wpmCalculationMethod: { stringValue: settings.wpmCalculationMethod },
                    strictCapitals: { booleanValue: settings.strictCapitals },
                    strictSpaces: { booleanValue: settings.strictSpaces },
                    shuffleMode: { booleanValue: settings.shuffleMode },
                }
            };
            await axios.patch(docUrl, payload);
            success("Settings Saved", "CPType global configuration updated successfully.");
            onClose();
        } catch (err) {
            console.error("Failed to save CPType settings", err);
            toastError("Save Error", "Could not save remote settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal 
            open={open} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-[#ef3e36]" />
                    <span>CPType Global Configuration</span>
                </div>
            }
            size="lg"
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-[#0078d4]" size={24} />
                    <span className="text-xs text-surface-500 font-medium">Loading remote configuration...</span>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-none flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed font-medium">
                            These settings apply globally to the <strong className="font-bold">cptypefinal</strong> remote webapp. 
                            Changes here will immediately affect all new applicants taking the test externally.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* WPM Goal */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">WPM Target</label>
                            <input 
                                type="number" 
                                value={settings.wpmGoal}
                                onChange={(e) => setSettings({...settings, wpmGoal: parseInt(e.target.value) || 0})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            />
                        </div>

                        {/* Accuracy Goal */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">Accuracy Target (%)</label>
                            <input 
                                type="number" 
                                value={settings.accuracyGoal}
                                onChange={(e) => setSettings({...settings, accuracyGoal: parseInt(e.target.value) || 0})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            />
                        </div>

                        {/* Attempt Limit */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">Attempt Limit</label>
                            <input 
                                type="number" 
                                value={settings.attemptLimit}
                                onChange={(e) => setSettings({...settings, attemptLimit: parseInt(e.target.value) || 0})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            />
                        </div>

                        {/* Timer Duration */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">Timer Duration (Seconds)</label>
                            <input 
                                type="number" 
                                value={settings.timerDuration}
                                onChange={(e) => setSettings({...settings, timerDuration: parseInt(e.target.value) || 0})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            />
                        </div>

                        {/* Difficulty Scaler */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">Difficulty Scaler</label>
                            <input 
                                type="number" 
                                value={settings.difficultyScaler}
                                onChange={(e) => setSettings({...settings, difficultyScaler: parseInt(e.target.value) || 0})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            />
                        </div>

                        {/* WPM Calculation Method */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider block">WPM Calculation</label>
                            <select 
                                value={settings.wpmCalculationMethod}
                                onChange={(e) => setSettings({...settings, wpmCalculationMethod: e.target.value})}
                                className="w-full bg-surface-50 border border-surface-200 px-3 py-2 rounded-none text-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
                            >
                                <option value="TYPERACER PRESET (NET WPM)">TYPERACER PRESET (NET WPM)</option>
                                <option value="MONKEYTYPE PRESET (STRICT WPM)">MONKEYTYPE PRESET (STRICT WPM)</option>
                                <option value="10FASTFINGERS PRESET (GROSS WPM)">10FASTFINGERS PRESET (GROSS WPM)</option>
                                <option value="DATA ENTRY PRESET (LITERAL WORDS)">DATA ENTRY PRESET (LITERAL WORDS)</option>
                                <option value="KEYBR PRESET (DOUBLE ERROR PENALTY)">KEYBR PRESET (DOUBLE ERROR PENALTY)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-surface-200">
                        <h4 className="text-[11px] font-bold text-surface-800 uppercase tracking-wider mb-4">Toggles & Strict Modes</h4>
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.strictCapitals}
                                    onChange={(e) => setSettings({...settings, strictCapitals: e.target.checked})}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded-none focus:ring-[#0078d4]"
                                />
                                <span className="text-sm font-medium text-surface-700">Strict Capitals <span className="text-xs text-surface-400 font-normal ml-1">(Requires correct casing)</span></span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.strictSpaces}
                                    onChange={(e) => setSettings({...settings, strictSpaces: e.target.checked})}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded-none focus:ring-[#0078d4]"
                                />
                                <span className="text-sm font-medium text-surface-700">Strict Spaces <span className="text-xs text-surface-400 font-normal ml-1">(Requires exact spacing)</span></span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.shuffleMode}
                                    onChange={(e) => setSettings({...settings, shuffleMode: e.target.checked})}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded-none focus:ring-[#0078d4]"
                                />
                                <span className="text-sm font-medium text-surface-700">Shuffle Mode <span className="text-xs text-surface-400 font-normal ml-1">(Randomize prompts)</span></span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-surface-200 rounded-none text-xs font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-black hover:bg-surface-800 text-white rounded-none text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
