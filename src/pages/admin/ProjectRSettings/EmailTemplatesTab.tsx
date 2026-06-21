import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/common/useToast';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { cn } from '@/utils/formatters';
import { apiClient } from '@/utils/apiClient';
import MSGReader from '@kenjiuno/msgreader';

import { EmailTemplate, TemplateType } from '@/types';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 18, mass: 0.6 };

const TEMPLATE_TYPES: { value: TemplateType; label: string; color: string }[] = [
    { value: 'REJECTION_INITIAL', label: 'Initial rejection', color: 'text-red-700 bg-red-50 border-red-200' },
    { value: 'REJECTION_FINAL', label: 'Final rejection', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    { value: 'INTERVIEW_INVITE', label: 'Interview invite (on-site)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { value: 'INTERVIEW_INVITE_ONLINE', label: 'Interview invite (online)', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    { value: 'OFFER', label: 'Job offer', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { value: 'NBI', label: 'NBI clearance', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { value: 'PEME', label: 'PEME medical', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    { value: 'NEO', label: 'NEO orientation', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { value: 'RCBC', label: 'RCBC', color: 'text-pink-700 bg-pink-50 border-pink-200' },
    { value: 'BGC', label: 'BGC', color: 'text-teal-700 bg-teal-50 border-teal-200' },
    { value: 'WELCOME_USER', label: 'Account creation', color: 'text-violet-700 bg-violet-50 border-violet-200' },
    { value: 'OTHER', label: 'Miscellaneous', color: 'text-surface-700 bg-surface-50 border-surface-200' },
];

const PLACEHOLDERS = [
    { tag: '{{candidate_name}}', desc: "Applicant's full name" },
    { tag: '{{position_title}}', desc: "Target job title" },
    { tag: '{{department}}', desc: "Account or department" },
    { tag: '{{date}}', desc: "Current date" },
    { tag: '{{schedule}}', desc: "Appointment/PEME schedule" },
    { tag: '{{reason}}', desc: "Rejection or status update reason" },
];

const getTemplateSummary = (body: string) => {
    const plainText = body
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();

    if (!plainText) {
        return body.includes('<')
            ? 'HTML email template. Open the template to preview or edit the full message.'
            : 'No message preview available.';
    }

    return plainText.length > 170 ? `${plainText.slice(0, 170).trim()}...` : plainText;
};

export function EmailTemplatesTab() {
    const { success, error } = useToast();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<EmailTemplate | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [activeType, setActiveType] = useState<TemplateType | 'ALL'>('ALL');
    const [automationSettings, setAutomationSettings] = useState<{
        WELCOME_USER: boolean;
        REJECTION_INITIAL: boolean;
        REJECTION_FINAL: boolean;
    }>({
        WELCOME_USER: true,
        REJECTION_INITIAL: true,
        REJECTION_FINAL: true
    });
    const [activeTab, setActiveTab] = useState<'templates' | 'smtp'>('templates');
    const [smtpForm, setSmtpForm] = useState({
        host: '',
        port: '587',
        secure: false,
        user: '',
        pass: '',
        fromName: 'Recruitment360',
        fromEmail: 'noreply@company.com'
    });
    const [savingSmtp, setSavingSmtp] = useState(false);
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');
    const [systemDefault, setSystemDefault] = useState<any>(null);

    const [form, setForm] = useState({
        name: '',
        subject: '',
        body: '',
        type: 'REJECTION_INITIAL' as TemplateType,
        isActive: true,
        file: null as File | null
    });

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/email-templates');
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load templates:', err);
            setTemplates([]);
            error('Protocol error', 'Failed to retrieve template data.');
        } finally {
            setLoading(false);
        }
    };

    const loadAutomationSettings = async () => {
        try {
            const res = await apiClient.get('/email-templates/automation');
            setAutomationSettings(res.data);
        } catch (err) {
            console.error('Failed to load automation settings:', err);
        }
    };

    const handleToggleAutomation = async (key: 'WELCOME_USER' | 'REJECTION_INITIAL' | 'REJECTION_FINAL') => {
        const updated = {
            ...automationSettings,
            [key]: !automationSettings[key]
        };
        setAutomationSettings(updated);
        try {
            await apiClient.post('/email-templates/automation', updated);
            success('Automation settings updated', 'Trigger setting updated successfully.');
        } catch (err) {
            console.error(err);
            error('Save error', 'Failed to update trigger setting.');
            setAutomationSettings(automationSettings);
        }
    };

    const loadSmtpSettings = async () => {
        try {
            const res = await apiClient.get('/email-templates/smtp');
            if (res.data) {
                if (res.data.config) {
                    setSmtpForm(res.data.config);
                } else {
                    setSmtpForm(res.data);
                }
                if (res.data.systemDefault) {
                    setSystemDefault(res.data.systemDefault);
                }
            }
        } catch (err) {
            console.error('Failed to load SMTP settings:', err);
        }
    };

    const handleSaveSmtp = async () => {
        setSavingSmtp(true);
        try {
            await apiClient.post('/email-templates/smtp', smtpForm);
            success('SMTP Configured', 'SMTP settings updated successfully.');
        } catch (err) {
            console.error(err);
            error('Save error', 'Failed to update SMTP settings.');
        } finally {
            setSavingSmtp(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingSmtp(true);
        try {
            await apiClient.post('/email-templates/smtp/test', {
                ...smtpForm,
                testRecipient
            });
            success('Test email sent', `A test email has been successfully sent to ${testRecipient}`);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || 'Failed to dispatch test message.';
            error('Connection failed', msg);
        } finally {
            setTestingSmtp(false);
        }
    };

    useEffect(() => {
        loadTemplates();
        loadAutomationSettings();
        loadSmtpSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenEdit = (temp: EmailTemplate) => {
        setEditingTemplate(temp);
        setForm({
            name: temp.name,
            subject: temp.subject,
            body: temp.body,
            type: temp.type,
            isActive: temp.isActive,
            file: null
        });
        setModal('edit');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('subject', form.subject);
            formData.append('body', form.body);
            formData.append('type', form.type);
            formData.append('isActive', form.isActive.toString());
            if (form.file) {
                formData.append('attachment', form.file);
            }

            if (modal === 'edit' && editingTemplate) {
                await apiClient.patch(`/email-templates/${editingTemplate.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                success('Synchronized', 'Email template updated successfully.');
            } else {
                await apiClient.post('/email-templates', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                success('Deployed', 'New email template registered.');
            }
            setModal(null);
            loadTemplates();
        } catch (err) {
            console.error('Save error:', err);
            error('Comm error', 'Failed to persist template changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await apiClient.delete(`/email-templates/${confirmDelete.id}`);
            success('Purged', 'Template permanently removed.');
            setConfirmDelete(null);
            loadTemplates();
        } catch (err) {
            console.error('Delete error:', err);
            error('Critical error', 'Failed to remove template data.');
        }
    };

    const handleSetLive = async (temp: EmailTemplate) => {
        try {
            const otherActiveTemplates = templates.filter(t => t.type === temp.type && t.isActive && t.id !== temp.id);

            await apiClient.patch(`/email-templates/${temp.id}`, { isActive: true });

            for (const other of otherActiveTemplates) {
                await apiClient.patch(`/email-templates/${other.id}`, { isActive: false });
            }

            success('Template activated', `"${temp.name}" is now the primary template for ${TEMPLATE_TYPES.find(t => t.value === temp.type)?.label}.`);
            loadTemplates();
        } catch (err) {
            console.error('Activation error:', err);
            error('Activation failed', 'Failed to set template as live.');
        }
    };

    const insertPlaceholder = (tag: string) => {
        setForm(prev => ({ ...prev, body: prev.body + ' ' + tag + ' ' }));
    };

    const handleMsgImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const buffer = event.target?.result as ArrayBuffer;
                const msgReader = new MSGReader(buffer);
                const data = msgReader.getFileData();

                let rawHtml = data.bodyHtml || '';
                if (!rawHtml && data.html) {
                    rawHtml = new TextDecoder('utf-8').decode(data.html as Uint8Array);
                }

                if (rawHtml && data.attachments) {
                    data.attachments.forEach((att: { pidContentId?: string; extension?: string }, idx: number) => {
                        if (att.pidContentId) {
                            const attData = msgReader.getAttachment(idx);
                            if (attData && attData.content) {
                                const ext = (att.extension || '.png').replace('.', '');
                                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
                                const base64 = btoa(
                                    Array.from(new Uint8Array(attData.content))
                                        .map(b => String.fromCharCode(b))
                                        .join('')
                                );
                                rawHtml = rawHtml.replace(
                                    new RegExp(`cid:${att.pidContentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
                                    `data:${mime};base64,${base64}`
                                );
                            }
                        }
                    });
                }

                const bodyContent = rawHtml || data.body || '';

                setForm(prev => ({
                    ...prev,
                    subject: data.subject || prev.subject,
                    body: bodyContent || prev.body
                }));

                success('Import successful', 'Email template imported with full formatting & branding.');
            } catch (err) {
                console.error('Failed to parse MSG:', err);
                error('Import failed', 'Could not parse the selected MSG file.');
            }
        };
        reader.readAsArrayBuffer(file);

        e.target.value = '';
    };

    const isHtmlBody = form.body.includes('<');
    const activeCount = templates.filter(t => t.isActive).length;
    const filteredTemplates = activeType === 'ALL'
        ? templates
        : templates.filter(t => t.type === activeType);
    const visibleTypeFilters = TEMPLATE_TYPES.filter(type => templates.some(temp => temp.type === type.value));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] font-medium text-surface-400 tracking-[-0.005em]">Loading email templates...</p>
            </div>
        );
    }

    return (
        <div className="w-full pb-12">
            {/* Header */}
            <div className="bg-white border-b border-surface-200">
                <div className="relative px-6 pt-5 pb-2 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2.5">
                        <Mail size={17} className="text-[#605e5c] self-center" />
                        <h1
                            className="text-[30px] leading-none text-surface-900 tracking-[-0.02em]"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontStyle: 'italic' }}
                        >
                            Email Templates
                        </h1>
                    </div>
                    <span className="text-[12px] font-medium text-surface-400 tracking-[-0.005em] mt-1.5">
                        Manage automatic email messages, categories, and live status.
                    </span>
                </div>

                {/* Sub-tabs Selector */}
                <div className="flex items-center justify-center gap-6 border-b border-surface-150 px-6 pb-2.5 mb-4 select-none">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={cn(
                            "pb-2 text-[12.5px] font-semibold tracking-tight transition-all border-b-2 px-2 cursor-pointer",
                            activeTab === 'templates'
                                ? "border-[#0078d4] text-[#0078d4]"
                                : "border-transparent text-surface-500 hover:text-surface-900"
                        )}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('smtp')}
                        className={cn(
                            "pb-2 text-[12.5px] font-semibold tracking-tight transition-all border-b-2 px-2 cursor-pointer",
                            activeTab === 'smtp'
                                ? "border-[#0078d4] text-[#0078d4]"
                                : "border-transparent text-surface-500 hover:text-surface-900"
                        )}
                    >
                        SMTP Settings
                    </button>
                </div>

                {activeTab === 'templates' && (
                    <>
                    {/* Stats + Action */}
                    <div className="flex items-center justify-center gap-2 px-6 pb-4">
                    <div className="flex items-center gap-1.5 px-3 h-7 bg-surface-50/70 border border-surface-200 rounded-sm">
                        <span className="text-[9px] font-semibold text-black/45 uppercase tracking-[0.1em]">Templates</span>
                        <span className="text-[13px] font-semibold text-black tabular-nums leading-none">{templates.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 h-7 bg-emerald-50 border border-emerald-200 rounded-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10.5px] font-semibold text-emerald-700 tracking-[-0.005em]">{activeCount} live</span>
                    </div>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING}
                        onClick={() => {
                            setForm({ name: '', subject: '', body: '', type: 'REJECTION_INITIAL', isActive: true, file: null });
                            setEditingTemplate(null);
                            setModal('create');
                        }}
                        className="flex items-center gap-1.5 px-3.5 h-7 bg-black text-white text-[11.5px] font-medium tracking-[-0.005em] hover:bg-black/85 transition-all rounded-sm"
                    >
                        <Plus size={13} strokeWidth={2.25} />
                        New template
                    </motion.button>
                </div>

                {/* Automation Settings Toggles */}
                <div className="px-6 pb-5 flex flex-col items-center justify-center">
                    <div className="bg-surface-50 border border-surface-200 rounded-sm p-4 w-full max-w-[800px] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-left">
                            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Automation Settings</span>
                            <span className="text-[12px] font-medium text-surface-500">Toggle automatic dispatch for specific email triggers.</span>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                            <label className="flex items-center gap-2 text-[12px] font-semibold text-surface-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={automationSettings.WELCOME_USER}
                                    onChange={() => handleToggleAutomation('WELCOME_USER')}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded focus:ring-[#0078d4] cursor-pointer"
                                />
                                <span>Account Creation</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] font-semibold text-surface-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={automationSettings.REJECTION_INITIAL}
                                    onChange={() => handleToggleAutomation('REJECTION_INITIAL')}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded focus:ring-[#0078d4] cursor-pointer"
                                />
                                <span>Initial Rejection</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] font-semibold text-surface-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={automationSettings.REJECTION_FINAL}
                                    onChange={() => handleToggleAutomation('REJECTION_FINAL')}
                                    className="w-4 h-4 text-[#0078d4] border-surface-300 rounded focus:ring-[#0078d4] cursor-pointer"
                                />
                                <span>Final Rejection</span>
                            </label>
                        </div>
                    </div>
                </div>
                </>
                )}
            </div>

            {activeTab === 'templates' && (
                <>
            {/* Filter Row */}
            <div className="flex flex-col gap-3 px-6 pt-5 lg:flex-row lg:items-center lg:justify-between border-b border-surface-200 pb-4">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setActiveType('ALL')}
                        className={cn(
                            "px-3 h-7 text-[11.5px] font-medium tracking-[-0.005em] rounded-sm border transition-all",
                            activeType === 'ALL'
                                ? "bg-black text-white border-black"
                                : "bg-white text-surface-600 border-surface-200 hover:border-surface-400"
                        )}
                    >
                        All ({templates.length})
                    </button>
                    {visibleTypeFilters.map(type => {
                        const count = templates.filter(temp => temp.type === type.value).length;
                        return (
                            <button
                                key={type.value}
                                onClick={() => setActiveType(type.value)}
                                className={cn(
                                    "px-3 h-7 text-[11.5px] font-medium tracking-[-0.005em] rounded-sm border transition-all",
                                    activeType === type.value
                                        ? "bg-[#0078d4] text-white border-[#0078d4]"
                                        : "bg-white text-surface-600 border-surface-200 hover:border-surface-400"
                                )}
                            >
                                {type.label} ({count})
                            </button>
                        );
                    })}
                </div>
                <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em] tabular-nums">
                    Showing {filteredTemplates.length} of {templates.length}
                </p>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 gap-4 px-6 pt-5 2xl:grid-cols-3 xl:grid-cols-2">
                {(Array.isArray(filteredTemplates) ? filteredTemplates : []).map((temp) => (
                    <motion.div
                        key={temp.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white border border-surface-200 p-4 hover:border-[#0078d4] hover:shadow-sm transition-all relative overflow-hidden flex flex-col h-[260px] rounded-sm"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                    <span className={cn(
                                        "px-2.5 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] border rounded-full",
                                        TEMPLATE_TYPES.find(t => t.value === temp.type)?.color
                                    )}>
                                        {TEMPLATE_TYPES.find(t => t.value === temp.type)?.label}
                                    </span>
                                    {temp.isActive ? (
                                        <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 tracking-[-0.005em]">
                                            <CheckCircle2 size={11} /> Live
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10.5px] font-semibold text-surface-400 tracking-[-0.005em]">
                                            <X size={11} /> Standby
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-[14px] font-semibold text-surface-900 tracking-[-0.005em] truncate leading-tight">{temp.name}</h4>
                                <p className="mt-1 text-[11.5px] font-normal text-surface-500 truncate tracking-[-0.005em]">{temp.subject}</p>
                                {temp.attachment_name && (
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-medium text-surface-500 tracking-[-0.005em] bg-surface-50 border border-surface-200 px-2 py-1 w-fit rounded-sm">
                                        <Mail size={10} className="text-surface-400" />
                                        <span className="truncate max-w-[150px]">{temp.attachment_name}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(temp)}
                                    className="p-2 text-surface-400 hover:text-[#0078d4] hover:bg-blue-50 transition-all rounded-sm"
                                    title="Edit template"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(temp)}
                                    className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-sm"
                                    title="Delete template"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 mt-4 mb-3 overflow-hidden relative border-t border-surface-100 pt-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10.5px] font-semibold text-surface-400 tracking-[-0.005em]">Preview</span>
                                {temp.body.includes('<') && (
                                    <span className="text-[10.5px] font-medium text-[#0078d4] bg-blue-50 px-2 py-0.5 rounded-full tracking-[-0.005em]">
                                        HTML hidden
                                    </span>
                                )}
                            </div>
                            <p className="text-[11.5px] leading-relaxed text-surface-500 font-normal tracking-[-0.005em]">
                                {getTemplateSummary(temp.body)}
                            </p>
                            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        </div>

                        <div className="pt-3 border-t border-surface-100 flex items-center justify-between">
                            <span className="text-[10.5px] font-medium text-surface-400 tracking-[-0.005em] tabular-nums">
                                Modified {new Date(temp.updated_at).toLocaleDateString()}
                            </span>

                            <button
                                onClick={() => !temp.isActive && handleSetLive(temp)}
                                disabled={temp.isActive}
                                className={cn(
                                    "px-3 h-7 text-[11px] font-medium tracking-[-0.005em] transition-all rounded-sm flex items-center gap-1.5 border",
                                    temp.isActive
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                                        : "bg-white border-surface-200 text-surface-600 hover:bg-black hover:text-white hover:border-black"
                                )}
                            >
                                <CheckCircle2 size={12} />
                                {temp.isActive ? 'Currently active' : 'Set as active'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="py-24 text-center bg-surface-50 border border-dashed border-surface-200 mx-6 mt-4 rounded-sm">
                    <Mail size={48} className="mx-auto text-surface-200 mb-5" />
                    <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em]">No templates found. Add one to get started.</p>
                </div>
            )}

            {templates.length > 0 && filteredTemplates.length === 0 && (
                <div className="py-20 text-center bg-surface-50 border border-dashed border-surface-200 mx-6 mt-4 rounded-sm">
                    <Mail size={40} className="mx-auto text-surface-200 mb-4" />
                    <p className="text-[12px] font-medium text-surface-500 tracking-[-0.005em]">No templates in this category.</p>
                </div>
            )}
            </>
            )}

            {activeTab === 'smtp' && (
                <div className="max-w-[600px] mx-auto mt-8 bg-white border border-surface-200 rounded-sm p-6 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[18px] font-semibold text-surface-900 tracking-tight flex items-center gap-2">
                            <Mail size={18} className="text-[#0078d4]" />
                            Configure SMTP Server
                        </h2>
                        {systemDefault && (
                            <button
                                onClick={() => {
                                    setSmtpForm(systemDefault);
                                    success('Defaults Loaded', 'Loaded SMTP settings from system environment.');
                                }}
                                className="text-[11px] font-semibold text-[#0078d4] hover:text-[#005a9e] border border-[#0078d4]/20 hover:border-[#0078d4] px-2.5 py-1 transition-all rounded-sm bg-blue-50/50 cursor-pointer"
                            >
                                Load System Defaults (.env)
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">SMTP Host</label>
                                <input
                                    value={smtpForm.host}
                                    onChange={e => setSmtpForm(f => ({ ...f, host: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="e.g. smtp.gmail.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">SMTP Port</label>
                                <input
                                    value={smtpForm.port}
                                    onChange={e => setSmtpForm(f => ({ ...f, port: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="e.g. 587"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-1 select-none">
                            <input
                                type="checkbox"
                                id="smtp-secure"
                                checked={smtpForm.secure}
                                onChange={e => setSmtpForm(f => ({ ...f, secure: e.target.checked }))}
                                className="w-4 h-4 text-[#0078d4] border-surface-300 rounded focus:ring-[#0078d4] cursor-pointer"
                            />
                            <label htmlFor="smtp-secure" className="text-[12px] font-semibold text-surface-700 cursor-pointer">
                                Use SSL/TLS (Secure Connection)
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Username / Email</label>
                                <input
                                    value={smtpForm.user}
                                    onChange={e => setSmtpForm(f => ({ ...f, user: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="your-email@gmail.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Password</label>
                                <input
                                    type="password"
                                    value={smtpForm.pass}
                                    onChange={e => setSmtpForm(f => ({ ...f, pass: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="••••••••••••••••"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Sender Display Name</label>
                                <input
                                    value={smtpForm.fromName}
                                    onChange={e => setSmtpForm(f => ({ ...f, fromName: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="e.g. Recruitment360"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Sender Address (From Email)</label>
                                <input
                                    value={smtpForm.fromEmail}
                                    onChange={e => setSmtpForm(f => ({ ...f, fromEmail: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-sm text-sm focus:bg-white focus:border-[#0078d4] transition-all outline-none"
                                    placeholder="e.g. noreply@company.com"
                                />
                            </div>
                        </div>

                        <hr className="border-surface-150 my-6" />

                        <div className="bg-surface-50 border border-surface-200 rounded-sm p-4 space-y-3">
                            <div className="text-[11.5px] font-bold text-surface-700">Test SMTP Configuration</div>
                            <div className="flex gap-2">
                                <input
                                    value={testRecipient}
                                    onChange={e => setTestRecipient(e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-white border border-surface-200 rounded-sm text-xs focus:border-[#0078d4] outline-none"
                                    placeholder="test-recipient@email.com"
                                />
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testingSmtp || !smtpForm.host || !smtpForm.user || !smtpForm.pass || !testRecipient}
                                    className="px-4 py-1.5 bg-black hover:bg-black/85 disabled:opacity-50 text-white font-medium text-[11px] rounded-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    {testingSmtp ? 'Sending...' : 'Send Test Email'}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleSaveSmtp}
                                disabled={savingSmtp || !smtpForm.host || !smtpForm.user || !smtpForm.pass}
                                className="px-5 h-9 bg-[#0078d4] hover:bg-[#006cbf] disabled:opacity-50 text-white font-medium text-[12px] rounded-sm transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {savingSmtp ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={modal !== null}
                onClose={() => setModal(null)}
                title={modal === 'edit' ? 'Edit template' : 'New template'}
                size="lg"
            >
                <div className="space-y-5">
                    <div className="flex justify-end">
                        <label className="flex items-center gap-2 px-3 h-8 hover:bg-surface-100 text-surface-600 cursor-pointer transition-colors border border-surface-200 bg-white rounded-sm tracking-[-0.005em] text-[12px] font-medium">
                            <Mail size={14} />
                            Import .MSG file
                            <input type="file" accept=".msg" onChange={handleMsgImport} className="hidden" />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Template name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-sm text-sm font-medium focus:bg-white focus:border-[#0078d4] transition-all outline-none tracking-[-0.005em]"
                                placeholder="e.g. PEME medical"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Email category</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value as TemplateType }))}
                                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-sm text-[12.5px] font-medium transition-all outline-none cursor-pointer tracking-[-0.005em]"
                            >
                                {TEMPLATE_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Subject line</label>
                        <input
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-sm text-sm font-medium focus:bg-white focus:border-[#0078d4] transition-all outline-none tracking-[-0.005em]"
                            placeholder="Email subject"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11.5px] font-semibold text-surface-600 tracking-[-0.005em]">Message content</label>
                            {isHtmlBody && (
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(p => !p)}
                                    className="text-[11px] font-medium text-[#0078d4] hover:underline tracking-[-0.005em]"
                                >
                                    {previewMode ? 'Switch to editor' : 'Preview HTML'}
                                </button>
                            )}
                        </div>

                        <div className="p-3 bg-surface-50 border border-surface-200 rounded-sm">
                            <p className="text-[10.5px] font-medium text-surface-500 mb-2 italic tracking-[-0.005em]">Click to insert tag at cursor:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {PLACEHOLDERS.map(p => (
                                    <button
                                        key={p.tag}
                                        onClick={() => insertPlaceholder(p.tag)}
                                        className="px-2 py-1 bg-white border border-surface-200 text-[10.5px] font-medium text-surface-700 hover:border-[#0078d4] hover:text-[#0078d4] transition-all rounded-sm tracking-[-0.005em]"
                                        title={p.desc}
                                    >
                                        {p.tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isHtmlBody && previewMode ? (
                            <div className="w-full border border-surface-200 bg-white rounded-sm overflow-hidden" style={{ height: '300px' }}>
                                <iframe srcDoc={form.body} title="Preview" className="w-full h-full" />
                            </div>
                        ) : (
                            <textarea
                                value={form.body}
                                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                rows={10}
                                className="w-full p-4 bg-white border border-surface-200 rounded-sm text-sm leading-relaxed font-normal focus:border-[#0078d4] transition-all outline-none resize-none font-mono tracking-[-0.005em]"
                                placeholder="Compose your email message..."
                            />
                        )}
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 flex items-start gap-3 rounded-sm">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11.5px] font-medium text-amber-900 leading-relaxed tracking-[-0.005em]">
                            Changes take effect immediately. All upcoming automated emails for this category will use this template.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-surface-100 flex items-center justify-end gap-3">
                        <button
                            onClick={() => setModal(null)}
                            className="px-4 h-8 text-[12px] font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-all rounded-sm border border-surface-200 tracking-[-0.005em]"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !form.name || !form.subject || !form.body}
                            className="px-4 h-8 bg-[#0078d4] text-white font-medium text-[12px] tracking-[-0.005em] transition-all disabled:opacity-50 flex items-center gap-2 rounded-sm hover:bg-[#006cbf]"
                        >
                            {isSaving ? 'Processing...' : (
                                <>
                                    <Save size={13} strokeWidth={2.25} />
                                    {modal === 'edit' ? 'Save changes' : 'Create template'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Delete template?"
                message={`Are you sure you want to permanently delete "${confirmDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}
