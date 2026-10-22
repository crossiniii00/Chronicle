import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';
import {
    X, Download, FileText, Briefcase, GraduationCap,
    Award, AlertTriangle, User, Phone, Mail, Calendar,
    ChevronDown, ChevronUp, ExternalLink, Loader2,
    CheckCircle2, Target, GavelIcon, ClipboardList, Star,
    MessageSquare, ListChecks, Headphones, Save, Edit3, Check, Settings, Layers, History as HistoryIcon
} from 'lucide-react';
import { cn, getStatusLabel } from '@/utils/formatters';
import type { Application, PersonalInfoSheet } from '@/types/application';
import { QuestionService, InterviewQuestion } from '@/services/QuestionService';
import { TypingTab } from './DetailTabs/TypingTab';
import { ApplicationTab } from './DetailTabs/ApplicationTab';
import { ApplicationHistoryTab } from './DetailTabs/ApplicationHistoryTab';
import { NotesTab } from './DetailTabs/NotesTab';
import { SummaryTab } from './DetailTabs/SummaryTab';
import { extractRemarks } from './utils/evaluationHelpers';
import { ClientInterviewRemarksSection } from './components/ClientInterviewRemarksSection';
import { ValidatorRemarksSection } from './components/ValidatorRemarksSection';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PISExportTemplate } from './PISExportTemplate';
import { CandidateDataExportTemplate } from './CandidateDataExportTemplate';

type PISTab = 'candidate_profile' | 'interview_results' | 'assessment_scores' | 'typing_scores' | 'application_history' | 'notes' | 'summary' | 'application_progress';

interface PISDashboardModalProps {
    open: boolean;
    onClose: () => void;
    applicant: Application;
    localChanges?: Record<string, Partial<Application>>;
    onEdit?: (appId: string, field: keyof Application, value: any) => void;
    isSyncing?: boolean;
    onSync?: () => Promise<void>;
    pisOnly?: boolean;
    guestDeskMode?: boolean;
}

const STATUS_PILL_STYLES: Record<string, string> = {
    HIRED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    PASSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    ACCEPTED_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    'ACCEPTED OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-700 ring-rose-200',
    FAILED: 'bg-rose-100 text-rose-700 ring-rose-200',
    WITHDRAWN: 'bg-surface-100 text-surface-700 ring-surface-200',
    NOT_ELIGIBLE_FOR_REHIRE: 'bg-rose-100 text-rose-700 ring-rose-200',
    FINAL_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    FINAL_INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    CLIENT_INTERVIEW: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    CLIENT_ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
    ASSESSMENT: 'bg-violet-100 text-violet-700 ring-violet-200',
    INITIAL_INTERVIEW: 'bg-sky-100 text-sky-700 ring-sky-200',
    INTERVIEW_IN_PROGRESS: 'bg-sky-100 text-sky-700 ring-sky-200',
    QUEUE_ASSIGNED: 'bg-sky-100 text-sky-700 ring-sky-200',
    TYPING_TEST: 'bg-amber-100 text-amber-700 ring-amber-200',
    APPLIED: 'bg-surface-100 text-surface-700 ring-surface-200',
    FOR_JOB_OFFER: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    'FOR JOB OFFER': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    FOR_PAN: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    SENT_JO_AND_BGC: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    'SENT JO AND BGC': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    ENDORSED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    FINAL_VERDICT: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    CONDITIONAL: 'bg-amber-100 text-amber-700 ring-amber-200',
    WAITLISTED: 'bg-amber-100 text-amber-700 ring-amber-200',
    OPEN: 'bg-surface-100 text-surface-700 ring-surface-200',
    PROMOTION: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    PROMOTED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    LATERAL_TRANSFER: 'bg-sky-100 text-sky-700 ring-sky-200',
    REPROFILED: 'bg-amber-100 text-amber-700 ring-amber-200',
};

function getStatusPill(status: string | undefined) {
    if (!status) return 'bg-surface-100 text-surface-700 ring-surface-200';
    return STATUS_PILL_STYLES[status.toUpperCase()] || 'bg-surface-100 text-surface-700 ring-surface-200';
}

function formatDate(value: string | undefined | null): string {
    if (!value) return '— ';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
        return String(value);
    }
}

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

const AVATAR_GRADIENTS = [
    'from-indigo-500 to-violet-600',
    'from-rose-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-blue-600',
    'from-fuchsia-500 to-purple-600',
];

function getAvatarGradient(name: string | undefined | null): string {
    if (!name) return AVATAR_GRADIENTS[0];
    return AVATAR_GRADIENTS[hashString(name) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Mirror the rubric criteria defined in InterviewSession.tsx so we can render
// the saved checklist in a structured, read-only view. Keys are generated with
// the same `${prefix}_${category}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}` rule.
const RUBRIC_CRITERIA: Array<{
    title: string;
    prefix: 'accent' | 'pron' | 'gram' | 'fluency';
    categoryC: string[];
    categoryB: string[];
    categoryA: string[];
}> = [
        {
            title: 'Accent Assessment',
            prefix: 'accent',
            categoryC: ['Close to English Native Speaker', 'Neutral Accent'],
            categoryB: ['Filipino Sounding to Neutral', 'Filipino Sounding'],
            categoryA: ['Filipino Sounding to Regional', 'Painfully Regional'],
        },
        {
            title: 'Pronunciation Assessment',
            prefix: 'pron',
            categoryC: ['Able to produce all vowels and consonants'],
            categoryB: [
                'Mild or Inconsistent /i/ vs /I/ vs /E/',
                'Mild or Inconsistent /u/ vs /U/ vs /o/ vs /aw/',
                '/ae/ vs /a/ vs /uh/ or misuse of /ae/',
                '/d/ or /t/ vs /th/',
                '/p/ vs /f/',
            ],
            categoryA: [
                'Consistent /i/ vs /I/ vs /E/',
                'Consistent /u/ vs /U/ vs /o/',
                'Consistent /ae/ vs /a/ vs /uh/',
                '/b/ vs /v/ consistent',
                '4 or More Sound Challenges',
            ],
        },
        {
            title: 'Grammar & Vocabulary',
            prefix: 'gram',
            categoryC: ['Grammar is Good', 'Good Vocabulary'],
            categoryB: [
                'Subject - Verb Agreement',
                'Tenses (Past Tense vs Present Tense)',
                'Prepositions (in, on, at...etc)',
                'Conjunctions (and, but, for, because...etc)',
                'Noun vs Adjective | verb vs adjective',
                'Articles',
                'Pluralization',
                'Can make complete sentences',
                'Few Challenges in Vocabulary',
            ],
            categoryA: [
                'Too Many lapses / Consistent lapses on Tenses',
                'Can only make Fragments / cannot construct proper sentences',
                '3 More Grammar Lapses',
                'Cannot convey thoughts or limited vocabulary',
            ],
        },
        {
            title: 'Fluency & Comprehension',
            prefix: 'fluency',
            categoryC: [
                'Thought Organization is good',
                'Can answer questions immediately and directly',
                'Answers are clear and concise',
            ],
            categoryB: [
                'Has Dead Air but able to convey thoughts',
                'Has Few Fillers / Fillers are habitual',
                'Answers are related to the question',
            ],
            categoryA: [
                'Habitual Cebuano Fillers',
                'Lots of Fillers while thinking about the answer',
                'Lots of stuttering',
                'Answers are not related to the question / unclear',
                'Stuck on questions',
            ],
        },
    ];

function rubricKey(prefix: string, cat: 'c' | 'b' | 'a', label: string) {
    return `${prefix}_${cat}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

function FieldGrid({ items, cols = 3 }: { items: { label: string; value: React.ReactNode; mono?: boolean; isEditing?: boolean; onChange?: (val: string) => void }[]; cols?: 2 | 3 | 4 }) {
    const colsClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
    return (
        <div className={cn('grid gap-px bg-surface-200 border border-surface-200 rounded-lg overflow-hidden', colsClass)}>
            {items.map((it, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 px-4 py-3">
                    <p className="text-[9.5px] font-bold text-surface-400 uppercase tracking-widest">{it.label}</p>
                    {it.isEditing && it.onChange ? (
                        <input
                            value={String(it.value || '')}
                            onChange={(e) => it.onChange!(e.target.value)}
                            className="w-full mt-1 text-[12.5px] font-semibold text-surface-900 border border-surface-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                        />
                    ) : (
                        <p className={cn(
                            'text-[12.5px] mt-1 break-words',
                            it.value === '—' || it.value === null || it.value === undefined || it.value === ''
                                ? 'text-surface-400 italic'
                                : 'text-surface-900 font-semibold',
                            it.mono && 'font-mono text-[11.5px]'
                        )}>
                            {it.value === null || it.value === undefined || it.value === '' ? '—' : it.value}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

function Field({ label, value, isEditing, onChange }: { label: string; value: string | undefined | null; isEditing?: boolean; onChange?: (val: string) => void }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-lg px-4 py-3">
            <p className="text-[9.5px] font-bold text-surface-400 uppercase tracking-widest">{label}</p>
            {isEditing && onChange ? (
                <input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full mt-1 text-[12.5px] font-semibold text-surface-900 border border-surface-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                />
            ) : (
                <p className={cn(
                    'text-[12.5px] mt-1 break-words',
                    !value ? 'text-surface-400 italic' : 'text-surface-900 font-semibold'
                )}>
                    {value || '—'}
                </p>
            )}
        </div>
    );
}

function SectionCard({ icon: Icon, title, subtitle, accent = 'indigo', action, children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle?: string;
    accent?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate';
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    const accentColors: Record<string, string> = {
        indigo: 'text-indigo-600 bg-indigo-50',
        amber: 'text-amber-600 bg-amber-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        rose: 'text-rose-600 bg-rose-50',
        sky: 'text-sky-600 bg-sky-50',
        violet: 'text-violet-600 bg-violet-50',
        slate: 'text-surface-700 bg-surface-100',
    };
    return (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-9 h-9 rounded-md flex items-center justify-center shrink-0', accentColors[accent])}>
                        <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold text-surface-900 leading-tight tracking-tight">{title}</p>
                        {subtitle && <p className="text-[10.5px] text-surface-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function InitialInterviewTab({ applicant }: { applicant: Application }) {
    return (
        <div className="p-7 space-y-6">
            <SectionCard icon={User} title="Interview Details" accent="slate" subtitle={applicant.interview_completed_at ? `Completed ${formatDate(applicant.interview_completed_at)}` : 'Pending'}>
                <FieldGrid items={[
                    { label: 'Interviewer', value: applicant.interviewer_name },
                    { label: 'Room', value: applicant.interview_room },
                    { label: 'Type', value: applicant.queue_type },
                    { label: 'Date', value: formatDate(applicant.interview_completed_at) },
                ]} />
            </SectionCard>

            <SectionCard icon={FileText} title="Interview Notes" accent="indigo">
                {applicant.interview_notes ? (
                    <div className="text-[12.5px] text-surface-700 whitespace-pre-wrap leading-relaxed">{applicant.interview_notes}</div>
                ) : (
                    <p className="text-[12.5px] text-surface-400 italic">No initial interview notes logged yet</p>
                )}
            </SectionCard>
        </div>
    );
}
function InterviewResultsTab({
    applicant,
    isEditing,
    handleUpdateApplication,
    tempRemarks,
    setTempRemarks,
    setLocalApplicant
}: {
    applicant: Application;
    isEditing?: boolean;
    handleUpdateApplication?: (id: string, patch: any) => void;
    tempRemarks?: string | null;
    setTempRemarks?: React.Dispatch<React.SetStateAction<string | null>>;
    setLocalApplicant?: React.Dispatch<React.SetStateAction<Application | null>>;
}) {
    const [subTab, setSubTab] = React.useState<'initial' | 'final' | 'recording'>('initial');
    const [selectedFinalAccount, setSelectedFinalAccount] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!isEditing && setTempRemarks) {
            setTempRemarks(null);
        }
    }, [isEditing, setTempRemarks]);

    const metadata = typeof applicant.metadata === 'string'
        ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })()
        : (applicant.metadata || {});
    const checklist: Record<string, boolean> = (metadata.checklist as Record<string, boolean>) || (metadata.pis?.checklist as Record<string, boolean>) || {};

    const ratings: Record<string, any> = (metadata.ratings as Record<string, any>) || (metadata.pis?.ratings as Record<string, any>) || {};
    const responses: Record<string, string> = (applicant.interview_responses as Record<string, string>) || {};
    const grading = applicant.interview_grading || {};
    const gradingEntries = Object.entries(grading);

    const getFallbackAnswer = (q: InterviewQuestion): string => {
        const val = responses[q.id] || responses[q.question_text] || '';
        if (val && val !== '---') return val;

        const qText = (q.question_text || '').toLowerCase().trim();
        const pis = applicant.pis || {};
        if (qText.includes('interview date')) return formatDate(applicant.interview_completed_at || applicant.applied_at);
        if (qText.includes("candidate's complete name") || qText.includes("complete name")) return applicant.applicant_name || pis.full_name || '';
        if (qText.includes('position applying for')) return applicant.position_title || pis.initial_account_assignment || '';
        if (qText.includes('summary of background and experience')) return pis.summary_of_background || pis.background_summary || '';
        if (qText.includes('what made you interested to apply')) return pis.reason_for_interest || '';
        if (qText.includes('what do you hope to achieve in the first 6 months')) return pis.goals_6_months || '';
        if (qText.includes('setback or failure')) return pis.handle_setback || '';
        if (qText.includes('prior commitment')) return pis.prior_commitments || '';
        if (qText.includes('target training start date')) return pis.available_training_start || '';
        if (qText.includes('preferred shifts')) return pis.preferred_shifts || '';
        if (qText.includes('mode of transportation')) return pis.transportation_mode || pis.travel_method || '';
        if (qText.includes('pending job offer')) return pis.pending_job_offer || '';
        if (qText.includes('salary expectation')) return pis.salary_expectation || '';
        if (qText.includes('role specific questions')) return pis.role_specific_questions || '';
        if (qText.includes('enercare/ooni') || qText.includes('candidate for enercare')) return pis.is_enercare || '';
        return '';
    };

    const [questions, setQuestions] = React.useState<InterviewQuestion[]>([]);
    const [questionsLoading, setQuestionsLoading] = React.useState(true);

    React.useEffect(() => {
        QuestionService.getAll()
            .then(qs => setQuestions(qs || []))
            .catch(() => setQuestions([]))
            .finally(() => setQuestionsLoading(false));
    }, []);

    const hasChecklist = Object.values(checklist).some(Boolean);
    const hasRatings = ratings && (
        ratings.personalRating != null ||
        ratings.workHabits ||
        ratings.communicationSkills ||
        ratings.empathy ||
        ratings.confidence ||
        ratings.languageClassification ||
        ratings.remarks
    );
    const hasResponses = Object.keys(responses).length > 0;
    const hasGrading = gradingEntries.length > 0;
    const hasAnyData = hasChecklist || hasRatings || hasResponses || hasGrading;

    // Background data from metadata
    const background = {
        bpoChat: metadata.bpo_experience_chat,
        bpoVoice: metadata.bpo_experience_voice,
        nonBpo: metadata.non_bpo_experience,
        shiftingIssues: metadata.issues_shifting_schedules,
        education: metadata.highest_education || applicant.pis?.highest_education,
        shsStrand: metadata.shs_strand,
        pursueStudies: metadata.plans_to_pursue_studies || applicant.pis?.plans_to_pursue_studies,
        goAbroad: metadata.plans_to_go_abroad || applicant.pis?.plans_to_go_abroad,
        transportMode: metadata.mode_of_transportation || applicant.pis?.travel_method,
        medicalIssues: metadata.medical_issues || applicant.pis?.medical_history_notes,
        startAvailability: metadata.availability_to_start,
        salaryExpectation: metadata.salary_expectations,
        candidateSource: metadata.candidate_source,
    };

    const handleRatingChange = (key: string, value: any) => {
        if (!handleUpdateApplication) return;
        const currentRatings = (typeof applicant.metadata === 'string'
            ? (() => { try { return JSON.parse(applicant.metadata).ratings; } catch { return {}; } })()
            : (applicant.metadata?.ratings)) || {};

        handleUpdateApplication(applicant.id, {
            metadata: {
                ...(typeof applicant.metadata === 'string' ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })() : (applicant.metadata || {})),
                ratings: {
                    ...currentRatings,
                    [key]: value
                }
            }
        });
    };

    const handleBackgroundChange = (key: string, value: string) => {
        if (!handleUpdateApplication) return;
        handleUpdateApplication(applicant.id, {
            metadata: {
                ...(typeof applicant.metadata === 'string' ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })() : (applicant.metadata || {})),
                [key]: value
            }
        });
    };

    const handleChecklistChange = (key: string) => {
        if (!handleUpdateApplication) return;
        const currentChecklist = (typeof applicant.metadata === 'string'
            ? (() => { try { return JSON.parse(applicant.metadata).checklist; } catch { return {}; } })()
            : (applicant.metadata?.checklist)) || {};

        handleUpdateApplication(applicant.id, {
            metadata: {
                ...(typeof applicant.metadata === 'string' ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })() : (applicant.metadata || {})),
                checklist: {
                    ...currentChecklist,
                    [key]: !currentChecklist[key]
                }
            }
        });
    };

    const renderCategory = (
        items: string[],
        cat: 'c' | 'b' | 'a',
        prefix: string,
        palette: { label: string; chip: string }
    ) => {
        const checkedCount = items.filter(c => checklist[rubricKey(prefix, cat, c)]).length;
        return (
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className={cn(
                        'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border',
                        palette.chip
                    )}>
                        Category {cat.toUpperCase()}
                    </span>
                    {checkedCount > 0 && (
                        <span className="text-[9px] font-bold text-surface-500">
                            {checkedCount} flagged
                        </span>
                    )}
                </div>
                <div className="space-y-1 pl-1">
                    {items.map(item => {
                        const k = rubricKey(prefix, cat, item);
                        const isChecked = !!checklist[k];
                        return (
                            <div
                                key={item}
                                onClick={() => { if (isEditing) handleChecklistChange(k); }}
                                className={cn(
                                    'flex items-start gap-2 text-[11px] py-0.5 select-none -ml-1 pl-1 rounded-sm transition-colors',
                                    isEditing && 'cursor-pointer hover:bg-surface-50',
                                    isChecked ? 'text-surface-900 font-bold' : 'text-surface-500'
                                )}
                            >
                                <span className={cn(
                                    'mt-0.5 inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border shrink-0',
                                    isChecked
                                        ? cat === 'c' ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : cat === 'b' ? 'bg-amber-500 border-amber-500 text-white'
                                                : 'bg-rose-500 border-rose-500 text-white'
                                        : 'bg-white dark:bg-slate-900 border-surface-300'
                                )}>
                                    {isChecked && (
                                        <Check size={10} strokeWidth={4} />
                                    )}
                                </span>
                                <span className="flex-1 leading-tight">{item}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRubric = (section: typeof RUBRIC_CRITERIA[number]) => {
        const anyChecked = (['c', 'b', 'a'] as const).some(cat => {
            const list = cat === 'c' ? section.categoryC : cat === 'b' ? section.categoryB : section.categoryA;
            return list.some(c => checklist[rubricKey(section.prefix, cat, c)]);
        });
        return (
            <div className="bg-white dark:bg-slate-900 border border-surface-200 p-4 rounded-lg shadow-sm space-y-3">
                <h4 className="text-[10px] font-black text-surface-800 uppercase tracking-widest border-b border-surface-100 pb-2 flex items-center justify-between">
                    <span>{section.title}</span>
                    {!anyChecked && <span className="text-[9px] text-surface-400 font-bold">No flags</span>}
                </h4>
                {renderCategory(section.categoryC, 'c', section.prefix, { label: 'Category C', chip: 'text-emerald-800 bg-emerald-50 border-emerald-100' })}
                <div className="pt-2 border-t border-dashed border-surface-100">
                    {renderCategory(section.categoryB, 'b', section.prefix, { label: 'Category B', chip: 'text-amber-800 bg-amber-50 border-amber-100' })}
                </div>
                <div className="pt-2 border-t border-dashed border-surface-100">
                    {renderCategory(section.categoryA, 'a', section.prefix, { label: 'Category A', chip: 'text-rose-800 bg-rose-50 border-rose-100' })}
                </div>
            </div>
        );
    };

    const personalRating = Number(ratings.personalRating) || 0;

    const applicableQs = React.useMemo(() => {
        const rawVal = applicant.pis?.final_account || applicant.endorsement_account || applicant.department || (applicant as any).account || '';
        const candidateAcc = rawVal.split(',')[0]?.trim() || '';
        const candidateLob = (applicant as any).custom_lob || applicant.metadata?.custom_lob || applicant.pis?.custom_lob || applicant.pis?.hiring_type || (applicant as any).hiring_type || (applicant as any).lob || '';

        return questions.filter(q => {
            // Always show if it was answered or has a response in interview_responses
            if (applicant.interview_responses && (applicant.interview_responses as any)[q.id] && (applicant.interview_responses as any)[q.id] !== '---') {
                return true;
            }
            if (applicant.interview_responses && (applicant.interview_responses as any)[q.question_text] && (applicant.interview_responses as any)[q.question_text] !== '---') {
                return true;
            }
            if (q.is_active === false) return false;
            const filtered = QuestionService.filterForApplication([q], candidateAcc, candidateLob);
            return filtered.length > 0;
        });
    }, [questions, applicant]);

    // Group questions by category for Interview Evaluation display
    const initialQuestionsByCategory = React.useMemo(() => {
        const grouped: Record<string, InterviewQuestion[]> = {};
        applicableQs.filter(q => q.question_type !== 'final').forEach(q => {
            const cat = q.category || 'General Evaluation';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(q);
        });
        return grouped;
    }, [applicableQs]);

    const finalQuestionsByCategory = React.useMemo(() => {
        const grouped: Record<string, InterviewQuestion[]> = {};
        applicableQs.filter(q => q.question_type === 'final').forEach(q => {
            const cat = q.category || 'Final Evaluation';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(q);
        });
        return grouped;
    }, [applicableQs]);

    return (
        <div className="p-6 space-y-6">
            {/* Header metadata strip */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-lg shadow-sm mb-4">
                <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                    {subTab === 'recording' ? (
                        <Headphones size={14} className="text-indigo-600" />
                    ) : (
                        <User size={14} className="text-indigo-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-surface-900 mb-0.5">
                        {subTab === 'initial' ? 'Initial Interview Session' : subTab === 'final' ? 'Final Interview Session' : 'Interview Session Recording & Transcription Logs'}
                    </p>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-surface-500">
                        {subTab === 'initial' ? (
                            <>
                                <span>{applicant.interview_completed_at ? <>Completed <strong className="text-surface-800 font-bold">{formatDate(applicant.interview_completed_at)}</strong></> : 'Not yet completed'}</span>
                                {applicant.interviewer_name && <><span className="text-surface-300">•</span><strong className="text-surface-800 font-bold">{applicant.interviewer_name}</strong></>}
                                {applicant.interview_room && <><span className="text-surface-300">•</span><strong className="text-surface-800 font-bold">{applicant.interview_room}</strong></>}
                            </>
                        ) : subTab === 'final' ? (
                            <>
                                <span>{applicant.endorsement_meeting_date ? <>Scheduled <strong className="text-surface-800 font-bold">{formatDate(applicant.endorsement_meeting_date)}</strong></> : 'Not yet scheduled'}</span>
                                {applicant.assigned_ops_validator_name && <><span className="text-surface-300">•</span><strong className="text-surface-800 font-bold">{applicant.assigned_ops_validator_name}</strong></>}
                            </>
                        ) : (
                            <span>
                                Review raw audio recordings and transcriptions from initial and final interview sessions.
                            </span>
                        )}
                    </div>
                </div>
                {subTab === 'initial' && applicant.interview_recording_url && (
                    <a
                        href={applicant.interview_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 rounded-md hover:bg-rose-100 transition-colors shrink-0 shadow-sm"
                    >
                        <ExternalLink size={12} /> Recording
                    </a>
                )}
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex bg-surface-100/50 p-1 rounded-lg gap-1 mb-6 inline-flex border border-surface-200 shadow-sm">
                <button
                    onClick={() => setSubTab('initial')}
                    className={cn(
                        'px-4 py-1.5 text-[12px] font-bold transition-all rounded-md tracking-wide',
                        subTab === 'initial' ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'
                    )}
                >
                    Initial Interview
                </button>
                <button
                    onClick={() => setSubTab('final')}
                    className={cn(
                        'px-4 py-1.5 text-[12px] font-bold transition-all rounded-md tracking-wide',
                        subTab === 'final' ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'
                    )}
                >
                    Final Interview
                </button>
                <button
                    onClick={() => setSubTab('recording')}
                    className={cn(
                        'px-4 py-1.5 text-[12px] font-bold transition-all rounded-md tracking-wide',
                        subTab === 'recording' ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/50'
                    )}
                >
                    Recording
                </button>
            </div>

            {subTab === 'initial' ? (
                /* Side-by-Side 2-Column Proportional Grid for Initial Interview */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                    {/* ——— LEFT COLUMN: INTERVIEW EVALUATION ——— */}
                    <div className="space-y-6">
                        <SectionCard icon={MessageSquare} title="Interview Evaluation" accent="indigo" subtitle="Questions, answers, and observations">
                            {questionsLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 size={14} className="animate-spin text-surface-400" />
                                    <span className="text-[11px] text-surface-400">Loading questions…</span>
                                </div>
                            ) : Object.keys(initialQuestionsByCategory).length === 0 ? (
                                <p className="text-[12px] text-surface-400 italic">No interview questions configured.</p>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(initialQuestionsByCategory).map(([category, qs]) => (
                                        <div key={category}>
                                            <p className="text-[9.5px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                <span className="inline-block w-3 h-[2px] bg-indigo-400 rounded" />
                                                {category}
                                            </p>
                                            <div className="space-y-3">
                                                {qs
                                                    .filter(q => !q.question_text.includes("Final Interviewer's Remarks"))
                                                    .sort((a, b) => a.question_order - b.question_order)
                                                    .map((q, qi) => {
                                                        const answer = getFallbackAnswer(q);
                                                        const score = grading[q.id];
                                                        const hasAnswer = !!answer && answer !== '---';
                                                        return (
                                                            <div key={q.id} className="bg-surface-50 border border-surface-200 rounded-lg p-3.5">
                                                                <div className="flex items-start gap-2.5 mb-2">
                                                                    <span className="shrink-0 w-5 h-5 rounded bg-indigo-100 text-indigo-600 text-[9px] font-black flex items-center justify-center mt-0.5">
                                                                        {qi + 1}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <p className="text-[12px] font-semibold text-surface-800 leading-snug">
                                                                            {q.question_text}
                                                                            {q.is_required && <span className="text-rose-400 ml-1">*</span>}
                                                                        </p>
                                                                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider block mt-1">
                                                                            {q.answer_type}
                                                                        </span>
                                                                    </div>

                                                                </div>
                                                                <div className={cn(
                                                                    'ml-7 px-3 py-2 rounded-md border text-[12px] leading-relaxed',
                                                                    hasAnswer || isEditing
                                                                        ? 'bg-white dark:bg-slate-900 border-surface-200 text-surface-900 font-medium'
                                                                        : 'bg-surface-100 border-surface-200 text-surface-400 italic'
                                                                )}>
                                                                    {isEditing ? (
                                                                        <textarea
                                                                            value={answer || ''}
                                                                            onChange={(e) => {
                                                                                if (handleUpdateApplication) {
                                                                                    handleUpdateApplication(applicant.id, {
                                                                                        interview_responses: {
                                                                                            ...(applicant.interview_responses as any),
                                                                                            [q.id]: e.target.value
                                                                                        }
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="w-full text-[12px] font-medium text-surface-900 bg-white dark:bg-slate-900 border border-surface-300 rounded px-2 py-1 outline-none focus:border-primary-500"
                                                                            rows={2}
                                                                            placeholder="Enter answer..."
                                                                        />
                                                                    ) : (
                                                                        hasAnswer ? answer : 'No answer recorded'
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    {/* ——— RIGHT COLUMN: ASSESSMENT & BACKGROUND ——— */}
                    <div className="space-y-6">
                        {/* Interviewer's Assessment */}
                        <SectionCard icon={ListChecks} title="Interviewer's Assessment" accent="amber" subtitle="Ratings, rubrics, and background evaluation">
                            <div className="space-y-3 mb-5 pb-5 border-b border-dashed border-surface-200">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-[9.5px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">Personal Rating</p>
                                        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                                style={{ width: `${Math.max(0, Math.min(100, personalRating * 10))}%` }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[24px] font-extrabold text-amber-600 leading-none">
                                        {personalRating || '—'}<span className="text-[11px] text-surface-400 font-bold"> / 10</span>
                                    </p>
                                </div>
                                <FieldGrid cols={2} items={[
                                    { label: 'Work Habits / Attitude', value: ratings.workHabits, isEditing, onChange: (val) => handleRatingChange('workHabits', val) },
                                    { label: 'Communication Skills', value: ratings.communicationSkills, isEditing, onChange: (val) => handleRatingChange('communicationSkills', val) },
                                    { label: 'Empathy', value: ratings.empathy, isEditing, onChange: (val) => handleRatingChange('empathy', val) },
                                    { label: 'Confidence', value: ratings.confidence, isEditing, onChange: (val) => handleRatingChange('confidence', val) },
                                    { label: 'Language Classification', value: ratings.languageClassification, isEditing, onChange: (val) => handleRatingChange('languageClassification', val) },
                                    { label: 'Candidate Source', value: background.candidateSource, isEditing, onChange: (val) => handleBackgroundChange('candidate_source', val) },
                                ]} />
                            </div>

                            <div className="grid grid-grid-1 gap-4">
                                {RUBRIC_CRITERIA.map(section => (
                                    <div key={section.prefix}>{renderRubric(section)}</div>
                                ))}
                            </div>
                        </SectionCard>

                        {/* Background & Experience */}
                        <SectionCard icon={Briefcase} title="Background & Experience" accent="sky" subtitle="Candidate background captured during interview">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="BPO Experience (Chat)" value={background.bpoChat} isEditing={isEditing} onChange={(val) => handleBackgroundChange('bpo_experience_chat', val)} />
                                <Field label="BPO Experience (Voice)" value={background.bpoVoice} isEditing={isEditing} onChange={(val) => handleBackgroundChange('bpo_experience_voice', val)} />
                                <Field label="Non-BPO Experience" value={background.nonBpo} isEditing={isEditing} onChange={(val) => handleBackgroundChange('non_bpo_experience', val)} />
                                <Field label="Shifting Schedules" value={background.shiftingIssues} isEditing={isEditing} onChange={(val) => handleBackgroundChange('issues_shifting_schedules', val)} />
                                <Field label="Highest Education" value={background.education} isEditing={isEditing} onChange={(val) => handleBackgroundChange('highest_education', val)} />
                                <Field label="SHS Strand" value={background.shsStrand} isEditing={isEditing} onChange={(val) => handleBackgroundChange('shs_strand', val)} />
                                <Field label="Plans to Pursue Studies" value={background.pursueStudies} isEditing={isEditing} onChange={(val) => handleBackgroundChange('plans_to_pursue_studies', val)} />
                                <Field label="Plans to Go Abroad" value={background.goAbroad} isEditing={isEditing} onChange={(val) => handleBackgroundChange('plans_to_go_abroad', val)} />
                                <Field label="Mode of Transportation" value={background.transportMode} isEditing={isEditing} onChange={(val) => handleBackgroundChange('mode_of_transportation', val)} />
                                <Field label="Medical Issues" value={background.medicalIssues} isEditing={isEditing} onChange={(val) => handleBackgroundChange('medical_issues', val)} />
                                <Field label="Availability to Start" value={background.startAvailability} isEditing={isEditing} onChange={(val) => handleBackgroundChange('availability_to_start', val)} />
                                <Field label="Salary Expectations" value={background.salaryExpectation} isEditing={isEditing} onChange={(val) => handleBackgroundChange('salary_expectations', val)} />
                            </div>
                        </SectionCard>
                    </div>

                </div>
            ) : subTab === 'final' ? (
                /* Final Interview Sub-tab: Modern Side-by-Side Evaluation Dashboard */
                <div className="max-w-[1600px] mx-auto">
                    {(() => {
                        const reprofileHistory: any[] = applicant.pis?.reprofile_history || (metadata as any)?.reprofile_history || [];
                        const failedAccounts: string[] = [
                            ...((metadata as any)?.failed_accounts || []),
                            ...reprofileHistory.map((h: any) => h.previous_account).filter(Boolean)
                        ];
                        
                        let currentAccount = (metadata as any)?.reprofile_active_account || '';
                        if (!currentAccount || currentAccount.includes(',')) {
                            const rawDepts = (applicant.department || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const nonFailedDepts = rawDepts.filter((d: string) => !failedAccounts.some((fa: string) => fa.toLowerCase() === d.toLowerCase()));
                            currentAccount = nonFailedDepts.length > 0 ? nonFailedDepts[0] : (rawDepts[0] || applicant.department || 'Current Account');
                        }

                        const currentValidatorName = (metadata as any)?.active_ops_validator_name || applicant.assigned_ops_validator_name || (metadata as any)?.ops_validator_name || (applicant.pis as any)?.ops_validator_name || 'Assigned Validator';

                        const getCleanOpsRemarks = (raw: string) => {
                            const cleaned = extractRemarks(raw);
                            if (!cleaned) return '';
                            const lower = cleaned.toLowerCase();

                            const genericStatuses = ['confirmed training', 'confirmed_training', 'sent jo and bgc', 'sent_jo_and_bgc', 'for pan', 'for_pan', 'hired', 'passed', 'failed', 'rejected', 'reprofiled', 'no show', 'no_show', 'withdrawn'];
                            if (genericStatuses.includes(lower)) {
                                return '';
                            }

                            const initialScreeningMarkers = [
                                'about the company',
                                'no plans to pursue studies',
                                'comfortable with peme',
                                'comfortable with background check',
                                'confirms to work on a shifting schedule',
                                'have a positive role in the company',
                                'no other commitments',
                                'no planned events',
                                'no plans to go abroad',
                                'no medical issues'
                            ];

                            if (initialScreeningMarkers.some(marker => lower.includes(marker))) {
                                return '';
                            }

                            return cleaned;
                        };

                        const getOpsValidatorRemarks = (): string => {
                            const directNotes = 
                                (applicant as any).ops_validator_notes ||
                                applicant.pis?.ops_validator_notes ||
                                (applicant.pis as any)?.ops_val_notes ||
                                (metadata as any)?.ops_validator_notes ||
                                (metadata as any)?.ops_validation_remarks ||
                                '';

                            const cleanDirect = getCleanOpsRemarks(directNotes);
                            if (cleanDirect) return cleanDirect;

                            const responses = applicant.interview_responses || {};
                            const responseNotes = 
                                (responses['pis_ops_validator_notes'] ? String(responses['pis_ops_validator_notes']) : '') ||
                                (responses['ops_validator_notes'] ? String(responses['ops_validator_notes']) : '') ||
                                (responses['ops_validation_remarks'] ? String(responses['ops_validation_remarks']) : '') ||
                                '';

                            const cleanResponse = getCleanOpsRemarks(responseNotes);
                            if (cleanResponse) return cleanResponse;

                            if (questions && questions.length > 0) {
                                const valQ = questions.find(q => {
                                    const txt = (q.question_text || '').toLowerCase();
                                    return txt.includes("operations validation") || txt.includes("final interviewer's remarks") || txt.includes("ops val") || txt.includes("validator remarks");
                                });
                                if (valQ && responses[valQ.id]) {
                                    const cleanQ = getCleanOpsRemarks(String(responses[valQ.id]));
                                    if (cleanQ) return cleanQ;
                                }
                            }

                            for (const [key, val] of Object.entries(responses)) {
                                if (val && typeof val === 'string' && val.trim()) {
                                    const kLower = key.toLowerCase();
                                    if (kLower.includes('ops_val') || kLower.includes('validator') || kLower.includes('validation')) {
                                        const cleanK = getCleanOpsRemarks(val);
                                        if (cleanK) return cleanK;
                                    }
                                }
                            }

                            return getCleanOpsRemarks(applicant.final_interview_notes || '');
                        };

                        const currentRemarks = tempRemarks !== null ? tempRemarks : getOpsValidatorRemarks();
                        const currentStatus = String((applicant as any).ops_validator_status || applicant.pis?.ops_validator_status || (metadata as any)?.ops_validator_status || applicant.final_verdict || 'PENDING').toUpperCase();

                        const historicalSessions = reprofileHistory
                            .filter((h: any) => h.previous_account || h.account || h.department)
                            .map((h: any) => ({
                                account: h.previous_account || h.account || h.department || 'Previous Account',
                                validatorName: h.previous_ops_validator_name || h.ops_validator_name || h.assigned_ops_validator_name || 'Previous Validator',
                                remarks: getCleanOpsRemarks(h.previous_ops_validator_notes || h.notes || h.remarks || ''),
                                status: String(h.previous_ops_validator_status || h.status || 'REPROFILED').toUpperCase(),
                                date: h.changed_at ? new Date(h.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (h.date ? new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Previous Session'),
                            }));

                        const allSessions = [
                            {
                                id: 'active',
                                isCurrent: true,
                                account: currentAccount,
                                validatorName: currentValidatorName,
                                remarks: currentRemarks,
                                status: currentStatus,
                                date: 'Active Session',
                                isEditing: isEditing
                            },
                            ...historicalSessions.map((s: any, idx: number) => ({
                                id: `hist-${idx}`,
                                isCurrent: false,
                                account: s.account,
                                validatorName: s.validatorName,
                                remarks: s.remarks,
                                status: s.status,
                                date: s.date,
                                isEditing: false
                            }))
                        ];

                        const activeSessionId = selectedFinalAccount || 'active';
                        const currentDisplaySession = allSessions.find(s => s.id === activeSessionId) || allSessions[0];

                        return (
                            <div className="space-y-6 max-w-5xl mx-auto">
                                {/* Top Navigation for Sessions */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-[11px] font-black uppercase tracking-wider text-surface-500 mr-2">Evaluation Sessions</h3>
                                    {allSessions.map(session => {
                                        const isSelected = activeSessionId === session.id;
                                        return (
                                            <button
                                                key={session.id}
                                                onClick={() => setSelectedFinalAccount(session.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full border text-[11.5px] font-bold transition-all flex items-center gap-2",
                                                    isSelected 
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm" 
                                                        : "bg-white dark:bg-slate-900 border-surface-200 text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                                                )}
                                            >
                                                {session.account}
                                                <span className={cn(
                                                    "px-1.5 py-0.5 text-[9px] font-black uppercase rounded",
                                                    session.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 
                                                    session.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 
                                                    'bg-amber-100 text-amber-700'
                                                )}>
                                                    {session.status}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Document-style Evaluation Area */}
                                <div className="bg-white dark:bg-slate-900 border-2 border-surface-200 rounded-xl shadow-sm overflow-hidden">
                                    {/* Header Banner - formal document style */}
                                    <div className={cn(
                                        "px-8 py-6 border-b-4",
                                        currentDisplaySession.isCurrent ? "bg-indigo-50/30 border-indigo-500" : "bg-surface-50 border-surface-400"
                                    )}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-xl font-black uppercase tracking-tight text-surface-900 mb-1">
                                                    {currentDisplaySession.account} Evaluation
                                                </h2>
                                                <p className="text-[12.5px] text-surface-600 uppercase tracking-widest font-bold flex items-center gap-2">
                                                    <span>Ops Validator: {currentDisplaySession.validatorName}</span>
                                                    {currentDisplaySession.isCurrent && (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Active Session
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mb-1.5">Status</div>
                                                <span className={cn(
                                                    "px-4 py-1.5 text-[13px] font-black uppercase tracking-widest border-2 rounded",
                                                    currentDisplaySession.status === 'PASSED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                                    currentDisplaySession.status === 'FAILED' ? 'border-rose-500 bg-rose-50 text-rose-700' :
                                                    'border-amber-400 bg-amber-50 text-amber-700'
                                                )}>
                                                    {currentDisplaySession.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-10">
                                        {/* Final Questions Breakdown - Only show if Active Session */}
                                        {currentDisplaySession.isCurrent && (
                                            <div>
                                                <h3 className="text-[13px] font-black text-surface-900 uppercase tracking-widest border-b-2 border-surface-100 pb-2 mb-5 flex items-center gap-2">
                                                    <ListChecks className="w-4 h-4 text-surface-400" />
                                                    Question & Answer Breakdown
                                                </h3>
                                                <div className="space-y-4 pl-1">
                                                    {applicableQs
                                                        .filter(q => q.question_type === 'final' && !q.question_text.includes("Operations Validation Remarks") && !q.question_text.includes("Final Interviewer's Remarks"))
                                                        .sort((a, b) => a.question_order - b.question_order)
                                                        .map((q, qi) => {
                                                            const answer = getFallbackAnswer(q);
                                                            const hasAnswer = !!answer && answer !== '---';
                                                            return (
                                                                <div key={q.id} className="border-l-4 border-surface-200 pl-4 py-1">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-[11.5px] font-bold text-surface-400 mt-0.5">{qi + 1}.</span>
                                                                        <div className="flex-1">
                                                                            <p className="text-[12.5px] font-bold text-surface-900 mb-1.5">
                                                                                {q.question_text}
                                                                                {q.is_required && <span className="text-rose-400 ml-1">*</span>}
                                                                            </p>
                                                                            {currentDisplaySession.isEditing ? (
                                                                                <textarea
                                                                                    value={answer || ''}
                                                                                    onChange={(e) => {
                                                                                        if (handleUpdateApplication) {
                                                                                            handleUpdateApplication(applicant.id, {
                                                                                                interview_responses: {
                                                                                                    ...(applicant.interview_responses as any),
                                                                                                    [q.id]: e.target.value
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    className="w-full text-[12px] font-medium text-surface-900 bg-white dark:bg-slate-900 border border-surface-300 rounded px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-900 transition-colors"
                                                                                    rows={2}
                                                                                    placeholder="Enter answer..."
                                                                                />
                                                                            ) : (
                                                                                <p className="text-[12px] text-surface-700 whitespace-pre-wrap leading-relaxed">
                                                                                    {hasAnswer ? answer : <span className="text-surface-400 italic">No answer recorded</span>}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Validator Remarks */}
                                        <div className="mt-4">
                                            <ValidatorRemarksSection
                                                applicant={applicant}
                                                isEditing={currentDisplaySession.isEditing}
                                                remarksRaw={currentDisplaySession.remarks}
                                                account={currentDisplaySession.account}
                                                onUpdate={(val) => {
                                                    if (setTempRemarks) setTempRemarks(val);
                                                    if (setLocalApplicant) {
                                                        setLocalApplicant((prev: any) => prev ? {
                                                            ...prev,
                                                            ops_validator_notes: val,
                                                            pis: {
                                                                ...(prev.pis || {}),
                                                                ops_validator_notes: val
                                                            }
                                                        } : prev);
                                                    }
                                                    if (handleUpdateApplication) {
                                                        handleUpdateApplication(applicant.id, {
                                                            ops_validator_notes: val,
                                                            pis: {
                                                                ops_validator_notes: val
                                                            }
                                                        });
                                                    }
                                                }}
                                            />
                                        </div>

                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <ClientInterviewRemarksSection 
                        applicant={applicant}
                        isEditing={isEditing}
                        remarksRaw={applicant.client_interview_remarks}
                        onUpdate={(val) => {
                            if (setLocalApplicant) {
                                setLocalApplicant((prev: any) => prev ? { ...prev, client_interview_remarks: val } : prev);
                            }
                            if (handleUpdateApplication) {
                                handleUpdateApplication(applicant.id, { client_interview_remarks: val });
                            }
                        }}
                    />
                </div>
            ) : (
                /* Recording Sub-tab */
                <InterviewRecordingTab applicant={applicant} hideHeader />
            )}

            {!hasAnyData && !applicant.interview_recording_url && (
                <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                        <MessageSquare size={20} className="text-surface-300" />
                    </div>
                    <p className="text-[12.5px] text-surface-400 italic">No interview results recorded yet.</p>
                </div>
            )}
        </div>
    );
}

function InterviewRecordingTab({ applicant, hideHeader = false }: { applicant: Application; hideHeader?: boolean }) {
    const metadata = typeof applicant.metadata === 'string'
        ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })()
        : (applicant.metadata || {});

    // Initial Interview Recording & Transcript
    const initialRecording = metadata.initial_recording_url || (!metadata.final_recording_url ? applicant.interview_recording_url : null);
    const initialTranscript = metadata.initial_transcript?.blocks || [];

    // Final Interview Recording & Transcript
    const finalRecording = metadata.final_recording_url || (metadata.final_recording_url ? applicant.interview_recording_url : null);
    const finalTranscript = metadata.final_transcript?.blocks || [];

    const hasAnyRecording = !!initialRecording || !!finalRecording || initialTranscript.length > 0 || finalTranscript.length > 0;

    const renderRecordingSection = (title: string, recordingUrl: string | null, blocks: any[], accent: 'indigo' | 'amber') => {
        return (
            <div className="bg-white dark:bg-slate-900 border border-surface-200 p-5 rounded-lg shadow-sm space-y-4">
                <h4 className="text-[11px] font-black text-surface-800 uppercase tracking-widest border-b border-surface-100 pb-2 flex items-center justify-between">
                    <span>{title}</span>
                </h4>

                {recordingUrl ? (
                    <div className="p-3 bg-surface-50 border border-surface-200 rounded-md flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Audio Playback</p>
                        <audio src={recordingUrl} controls className="w-full h-8" preload="none" />
                    </div>
                ) : (
                    <div className="p-3 bg-surface-50 border border-dashed border-surface-200 rounded-md text-center">
                        <p className="text-xs text-surface-400 italic">No recording file found</p>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Transcript logs</p>
                    {blocks && blocks.length > 0 ? (
                        <div className="bg-surface-50 border border-surface-200 p-4 rounded-md max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar text-left">
                            {blocks.map((block, idx) => (
                                <div key={idx} className="space-y-0.5 text-left">
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider block text-left",
                                        block.speaker === 'Interviewer'
                                            ? accent === 'indigo' ? "text-indigo-600" : "text-amber-600"
                                            : "text-purple-600"
                                    )}>
                                        {block.speaker}:
                                    </span>
                                    <p className="pl-2 border-l-2 border-surface-200 text-surface-600 text-[11.5px] leading-relaxed text-left">
                                        {block.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-surface-50 border border-dashed border-surface-200 p-4 rounded-md text-center">
                            <p className="text-xs text-surface-400 italic">No transcription dialogue logged</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={hideHeader ? "space-y-6" : "p-6 space-y-6"}>
            {!hideHeader && (
                <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-surface-200 rounded-lg">
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center shrink-0">
                        <Headphones size={14} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-surface-900">Interview Session Recording & Transcription Logs</p>
                        <p className="text-[10px] text-surface-500">
                            Review raw audio recordings and transcriptions from initial and final interview sessions.
                        </p>
                    </div>
                </div>
            )}

            {hasAnyRecording ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {renderRecordingSection("Initial Interview Record", initialRecording, initialTranscript, "indigo")}
                    {renderRecordingSection("Final Interview Record", finalRecording, finalTranscript, "amber")}
                </div>
            ) : (
                <div className="py-12 text-center bg-white dark:bg-slate-900 border border-surface-200 rounded-lg shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                        <Headphones size={20} className="text-surface-300" />
                    </div>
                    <p className="text-[12.5px] text-surface-400 italic">No recordings or transcripts available for this applicant.</p>
                </div>
            )}
        </div>
    );
}

function AssessmentTab({ applicant, pis, isEditing, handleUpdateApplication }: { applicant: Application; pis: Partial<PersonalInfoSheet>; isEditing?: boolean; handleUpdateApplication?: (id: string, patch: any) => void }) {
    const competencies = [
        { label: 'Critical Thinking', value: applicant.comp_critical_thinking },
        { label: 'Attention to Detail', value: applicant.comp_attention_to_detail },
        { label: 'Customer Focus', value: applicant.comp_customer_focus },
        { label: 'Technical Skills', value: applicant.comp_technical_skills },
        { label: 'Adaptability', value: applicant.comp_adaptability },
        { label: 'Teamwork', value: applicant.comp_teamwork },
        { label: 'Leadership', value: applicant.comp_leadership },
    ].filter(c => c.value != null);

    return (
        <div className="p-7 space-y-6">
            <SectionCard icon={Target} title="Assessment Scores" accent="violet">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-sm">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">SpeechX Score</p>
                        <div className="text-[22px] font-bold text-surface-900 mt-1 flex items-baseline">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={applicant.assessment_score ?? ''}
                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { assessment_score: e.target.value || null })}
                                    className="w-20 text-left border-b border-surface-300 px-1 outline-none focus:border-primary-500"
                                />
                            ) : (
                                applicant.assessment_score ?? applicant.pis?.speechx_score ?? '—'
                            )}
                            {!isEditing && applicant.assessment_score != null && !isNaN(Number(applicant.assessment_score)) && (
                                <span className="text-[12px] text-surface-400 font-medium ml-1">/ 100</span>
                            )}
                        </div>
                    </div>
                    <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-sm">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Client Assessment</p>
                        <div className="text-[22px] font-bold text-surface-900 mt-1 flex items-baseline">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={applicant.client_assessment_score ?? ''}
                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { client_assessment_score: e.target.value || null })}
                                    className="w-20 text-left border-b border-surface-300 px-1 outline-none focus:border-primary-500"
                                />
                            ) : (
                                applicant.client_assessment_score ?? '—'
                            )}
                            {!isEditing && applicant.client_assessment_score != null && !isNaN(Number(applicant.client_assessment_score)) && (
                                <span className="text-[12px] text-surface-400 font-medium ml-1">/ 100</span>
                            )}
                        </div>
                    </div>
                    <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-sm">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Wonderlic Score</p>
                        <div className="text-[22px] font-bold text-surface-900 mt-1 flex items-baseline">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={pis.wonderlic_score ?? ''}
                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { pis: { wonderlic_score: e.target.value } })}
                                    className="w-20 text-left border-b border-surface-300 px-1 outline-none focus:border-primary-500"
                                />
                            ) : (
                                pis.wonderlic_score ?? '—'
                            )}
                        </div>
                    </div>
                    <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-sm">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Leadership Score</p>
                        <div className="text-[22px] font-bold text-surface-900 mt-1 flex items-baseline">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={applicant.pis?.leadership_score ?? ''}
                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { pis: { leadership_score: e.target.value } })}
                                    className="w-20 text-left border-b border-surface-300 px-1 outline-none focus:border-primary-500"
                                />
                            ) : (
                                applicant.pis?.leadership_score ?? '—'
                            )}
                        </div>
                    </div>
                    <div className="px-5 py-4 bg-white dark:bg-slate-900 border border-surface-200 rounded-md shadow-sm col-span-2 lg:col-span-4">
                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Assessment Taken</p>
                        <div className="text-[16px] font-bold text-surface-900 mt-1 flex items-baseline">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={pis.overall_assessment ?? ''}
                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { pis: { overall_assessment: e.target.value } })}
                                    className="w-full text-left border-b border-surface-300 px-1 py-1 outline-none focus:border-primary-500"
                                    placeholder="e.g. Harver, SVAR, Versant..."
                                />
                            ) : (
                                pis.overall_assessment || <span className="text-surface-400 italic font-normal text-[14px]">Not specified</span>
                            )}
                        </div>
                    </div>
                </div>
                {(pis.cefr_level || isEditing) && (
                    <div className="mt-4 px-3 py-2 bg-surface-50 border border-surface-200 rounded-md flex items-center justify-between">
                        <p className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest">CEFR Level</p>
                        {isEditing ? (
                            <input
                                type="text"
                                value={pis.cefr_level || ''}
                                onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { pis: { cefr_level: e.target.value } })}
                                className="w-24 text-right border border-surface-300 rounded px-1 text-[12.5px] font-bold outline-none focus:border-primary-500"
                                placeholder="B2"
                            />
                        ) : (
                            <p className="text-[12.5px] font-bold text-surface-900">{pis.cefr_level}</p>
                        )}
                    </div>
                )}
            </SectionCard>

            {competencies.length > 0 && (
                <SectionCard icon={Award} title="Competency Ratings" accent="indigo">
                    <div className="grid grid-cols-2 gap-3">
                        {competencies.map((c, i) => {
                            const score = Number(c.value);
                            const max = 5;
                            const pct = (score / max) * 100;
                            const compKey = `comp_${c.label.toLowerCase().replace(/ /g, '_')}`;
                            return (
                                <div key={i} className="px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-md">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-[11.5px] font-semibold text-surface-700">{c.label}</p>
                                        <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={score}
                                                    onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { [compKey]: parseInt(e.target.value, 10) || 0 })}
                                                    className="w-12 text-center border border-indigo-300 rounded px-1 outline-none focus:border-indigo-500"
                                                    min="0"
                                                    max="5"
                                                />
                                            ) : score}
                                            <span className="text-surface-400 font-normal">/ {max}</span>
                                        </p>
                                    </div>
                                    {!isEditing && (
                                        <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            {/* Rubric Grading removed per user request */}
        </div>
    );
}

function FinalInterviewTab({ applicant, pis }: { applicant: Application; pis: Partial<PersonalInfoSheet> }) {
    return (
        <div className="p-7 space-y-6">
            <SectionCard icon={User} title="Final Interview Details" accent="slate">
                <FieldGrid items={[
                    { label: 'Final Interviewer', value: applicant.assigned_ops_validator_name },
                    { label: 'Ops Status', value: pis.ops_validator_status },
                    { label: 'Client Interviewer', value: pis.client_interviewer_email },
                    { label: 'Client Status', value: pis.client_interview_status },
                ]} />
            </SectionCard>

            <SectionCard icon={FileText} title="Final Interview Notes" accent="violet">
                {applicant.final_interview_notes ? (
                    <div className="text-[12.5px] text-surface-700 whitespace-pre-wrap leading-relaxed">{applicant.final_interview_notes}</div>
                ) : (
                    <p className="text-[12.5px] text-surface-400 italic">No final interview notes logged</p>
                )}
            </SectionCard>

            <ClientInterviewRemarksSection 
                applicant={applicant}
                isEditing={false}
                remarksRaw={applicant.client_interview_remarks}
            />
        </div>
    );
}

function VerdictTab({ applicant, pis, isEditing, handleUpdateApplication }: { applicant: Application; pis: Partial<PersonalInfoSheet>; isEditing?: boolean; handleUpdateApplication?: (id: string, patch: any) => void }) {
    const verdict = applicant.final_verdict || applicant.current_status;
    const inMasterlist = !!(applicant.master_eid || applicant.master_wave || applicant.master_status);
    const isPositive = verdict === 'HIRED' || verdict === 'PASSED' || verdict === 'ACCEPTED_OFFER';
    const isNegative = verdict === 'REJECTED' || verdict === 'FAILED' || verdict === 'WITHDRAWN';
    return (
        <div className="p-7 space-y-6">
            <div className={cn(
                'rounded-lg p-6 flex items-center gap-4',
                isPositive ? 'bg-emerald-50 border border-emerald-200'
                    : isNegative ? 'bg-rose-50 border border-rose-200'
                        : 'bg-amber-50 border border-amber-200'
            )}>
                <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shrink-0',
                    isPositive ? 'bg-emerald-100' : isNegative ? 'bg-rose-100' : 'bg-amber-100'
                )}>
                    <GavelIcon size={26} className={
                        isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-amber-600'
                    } />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Current Verdict</p>
                    <p className="text-[24px] font-extrabold text-surface-900 leading-tight tracking-tight mt-0.5">{getStatusLabel(verdict)}</p>
                    {applicant.hired_at && <p className="text-[10.5px] text-surface-500 mt-1">Hired {formatDate(applicant.hired_at)}</p>}
                </div>
            </div>

            <SectionCard icon={ClipboardList} title="Decision Details" accent="slate">
                <FieldGrid items={[
                    {
                        label: 'Final Verdict',
                        value: isEditing ? (
                            <select
                                value={applicant.final_verdict || ''}
                                onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { final_verdict: e.target.value })}
                                className="w-full border border-surface-300 rounded px-1 text-[11px] font-bold outline-none focus:border-slate-500"
                            >
                                <option value="">Select Verdict</option>
                                <option value="HIRED">HIRED</option>
                                <option value="PASSED">PASSED</option>
                                <option value="FAILED">FAILED</option>
                                <option value="REJECTED">REJECTED</option>
                                <option value="WITHDRAWN">WITHDRAWN</option>
                                <option value="KIV">KIV</option>
                                <option value="NO SHOW">NO SHOW</option>
                            </select>
                        ) : (applicant.final_verdict ? getStatusLabel(applicant.final_verdict) : '—')
                    },
                    {
                        label: 'Specific Status',
                        value: isEditing ? (
                            <input
                                type="text"
                                value={pis.final_specific_status || ''}
                                onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { pis: { final_specific_status: e.target.value } })}
                                className="w-full border border-surface-300 rounded px-1 text-[11px] font-bold outline-none focus:border-slate-500"
                            />
                        ) : pis.final_specific_status
                    },
                    {
                        label: 'Overall Status',
                        value: isEditing ? (
                            <input
                                type="text"
                                value={applicant.overall_status || ''}
                                onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { overall_status: e.target.value })}
                                className="w-full border border-surface-300 rounded px-1 text-[11px] font-bold outline-none focus:border-slate-500"
                            />
                        ) : applicant.overall_status
                    },
                    {
                        label: 'Final Account',
                        value: isEditing ? (
                            <input
                                type="text"
                                value={pis.final_account || ''}
                                onChange={(e) => handleUpdateApplication && handleUpdateApplication(applicant.id, { department: e.target.value, endorsement_account: e.target.value, pis: { final_account: e.target.value } })}
                                className="w-full border border-surface-300 rounded px-1 text-[11px] font-bold outline-none focus:border-slate-500"
                            />
                        ) : pis.final_account
                    },
                ]} />
            </SectionCard>

            {applicant.rejection_reason && (
                <SectionCard icon={AlertTriangle} title="Rejection Reason" accent="rose">
                    <div className="text-[12px] text-rose-900 bg-rose-50 border border-rose-200 rounded-md p-3 leading-relaxed">
                        {applicant.rejection_reason}
                    </div>
                </SectionCard>
            )}

            {inMasterlist && (
                <SectionCard icon={CheckCircle2} title="Masterlist Record" accent="emerald">
                    <FieldGrid items={[
                        { label: 'Employee ID', value: applicant.master_eid, mono: true },
                        { label: 'Wave', value: applicant.master_wave },
                        { label: 'Hiring Request', value: applicant.master_hiring_request_id },
                        { label: 'Basic Salary', value: applicant.master_basic_salary ? `₱${applicant.master_basic_salary.toLocaleString()}` : 'Ã¢â‚¬â€ ' },
                    ]} />
                </SectionCard>
            )}
        </div>
    );
}

function ApplicationLogTab({ applicant }: { applicant: Application }) {
    const [loading, setLoading] = React.useState(true);
    const [historyApps, setHistoryApps] = React.useState<any[]>([]);
    const [expandedApps, setExpandedApps] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const { ApplicationService } = await import('@/services/ApplicationService');
                const allApps = await ApplicationService.getAll();

                const matched = allApps.filter((a: any) =>
                    (a.applicant_email && applicant.applicant_email && a.applicant_email.toLowerCase() === applicant.applicant_email.toLowerCase()) ||
                    (applicant.applicant_id && a.applicant_id === applicant.applicant_id) ||
                    (a.applicant_name && applicant.applicant_name && a.applicant_name.toLowerCase() === applicant.applicant_name.toLowerCase())
                );

                matched.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());

                const matchedWithHistory = await Promise.all(
                    matched.map(async (app) => {
                        try {
                            const transitions = await ApplicationService.getStatusHistory(app.id);
                            return { ...app, transitions };
                        } catch {
                            return { ...app, transitions: [] };
                        }
                    })
                );

                if (isMounted) {
                    setHistoryApps(matchedWithHistory);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setLoading(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [applicant]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={20} className="animate-spin text-indigo-600" />
                <p className="text-[12px] text-surface-500 font-medium">Loading application history...</p>
            </div>
        );
    }

    if (historyApps.length === 0) {
        return (
            <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={20} className="text-surface-300" />
                </div>
                <p className="text-[12.5px] text-surface-400 italic">No application records found.</p>
            </div>
        );
    }

    const toggleAppExpand = (appId: string) => {
        setExpandedApps(prev => ({ ...prev, [appId]: !prev[appId] }));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
                <ClipboardList size={14} className="text-indigo-600" />
                <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Application Log</h2>
                <span className="text-[12px] text-surface-500 font-semibold">({historyApps.length} applications logged)</span>
            </div>

            <div className="space-y-6">
                {historyApps.map((app, index) => {
                    const statusUpper = (app.current_status || '').toUpperCase();
                    const isFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(statusUpper);
                    const appliedDate = formatDate(app.applied_at);
                    const isExpanded = !!expandedApps[app.id];

                    return (
                        <div
                            key={app.id}
                            className={cn(
                                "border rounded-lg p-5 shadow-sm transition-all",
                                isFail
                                    ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                                    : "bg-white dark:bg-slate-900 border-surface-200 hover:border-surface-300 hover:shadow-md"
                            )}
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn(
                                            "text-[14px] font-bold tracking-tight",
                                            isFail ? "text-rose-900" : "text-surface-900"
                                        )}>
                                            {app.position_title || 'General Application'}
                                        </h3>
                                        {app.department && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-surface-100 text-surface-600 rounded">
                                                {app.department}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10.5px] text-surface-500 mt-1 flex items-center gap-1.5 font-mono">
                                        Applied: {appliedDate}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1",
                                        isFail
                                            ? "bg-rose-100 text-rose-700 ring-rose-200"
                                            : getStatusPill(app.current_status)
                                    )}>
                                        {getStatusLabel(app.current_status)}
                                    </span>
                                </div>
                            </div>

                            {app.rejection_reason && (
                                <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-100 text-xs text-rose-800 leading-relaxed">
                                    <span className="font-bold block uppercase tracking-wider text-[9px] text-rose-500 mb-1">Rejection Reason:</span>
                                    {app.rejection_reason}
                                </div>
                            )}

                            {app.transitions && app.transitions.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-dashed border-surface-200">
                                    <button
                                        onClick={() => toggleAppExpand(app.id)}
                                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-600 focus:outline-none mb-1"
                                    >
                                        <span>Status History ({app.transitions.length})</span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-650">
                                            {isExpanded ? 'Hide Details' : 'Show Details'}
                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="relative border-l-2 border-surface-200 pl-4 ml-2 mt-4 space-y-4 text-left animate-fade-in">
                                            {app.transitions.map((t: any, ti: number) => {
                                                const isTransFail = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes((t.to_status || '').toUpperCase());
                                                return (
                                                    <div key={t.id || ti} className="relative animate-fade-in">
                                                        <span className={cn(
                                                            "absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white",
                                                            isTransFail ? "bg-rose-500" : "bg-indigo-500"
                                                        )} />
                                                        <div className="text-[11.5px] text-surface-700">
                                                            <div className="flex items-baseline justify-between flex-wrap gap-2">
                                                                <div>
                                                                    Changed to{" "}
                                                                    <span className={cn(
                                                                        "font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                                                                        isTransFail
                                                                            ? "bg-rose-100 text-rose-850 rounded-sm"
                                                                            : "bg-indigo-50 text-indigo-805 rounded-sm"
                                                                    )}>
                                                                        {getStatusLabel(t.to_status)}
                                                                    </span>
                                                                    {t.from_status && (
                                                                        <span className="text-surface-400 text-[10px] ml-1.5 font-medium">
                                                                            (from {getStatusLabel(t.from_status)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-surface-400 font-mono">
                                                                    {new Date(t.changed_at).toLocaleString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {(t.changed_by_name || t.change_reason) && (
                                                                <p className="text-[10.5px] text-surface-500 mt-1 leading-relaxed">
                                                                    {t.changed_by_name && (
                                                                        <>
                                                                            By <span className="font-semibold text-surface-600">{t.changed_by_name}</span>
                                                                        </>
                                                                    )}
                                                                    {t.change_reason && (
                                                                        <>
                                                                            {" Ã‚Â· "}
                                                                            <span className="italic">"{t.change_reason}"</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const PISDashboardModal: React.FC<PISDashboardModalProps> = ({
    open,
    onClose,
    applicant: applicantProp,
    pisOnly = true,
    guestDeskMode = false,
}) => {
    const { user } = useAuthStore();
    const isOpsValidator = user?.role === 'ops_validator';
    const [activeTab, setActiveTab] = React.useState<PISTab>('candidate_profile');
    const [showPIS, setShowPIS] = React.useState(false);
    const [freshApplicant, setFreshApplicant] = React.useState<Application | null>(null);
    const [isFetching, setIsFetching] = React.useState(false);

    // Edit mode state
    const [isEditing, setIsEditing] = React.useState(false);
    const [localApplicant, setLocalApplicant] = React.useState<Application | null>(null);
    const [tempRemarks, setTempRemarks] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);

    // Export state
    const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const pisExportRef = React.useRef<HTMLDivElement>(null);
    const candidateExportRef = React.useRef<HTMLDivElement>(null);
    const exportDropdownRef = React.useRef<HTMLDivElement>(null);

    // Re-fetch from server every time the modal opens to get latest interview data
    React.useEffect(() => {
        if (!open || !applicantProp?.id) {
            setFreshApplicant(null);
            setLocalApplicant(null);
            setIsEditing(false);
            return;
        }
        setIsFetching(true);
        import('@/services/ApplicationService')
            .then(({ ApplicationService }) => ApplicationService.getById(applicantProp.id))
            .then(data => {
                setFreshApplicant(data);
                setLocalApplicant(data);
            })
            .catch(() => {
                setFreshApplicant(null);
                setLocalApplicant(applicantProp);
            })
            .finally(() => setIsFetching(false));
    }, [open, applicantProp?.id]);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (exportMenuOpen && !target.closest('.export-dropdown-container')) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [exportMenuOpen]);

    const applicant = localApplicant ?? freshApplicant ?? applicantProp;

    if (!applicant) return null;

    const pis = applicant.pis || {};
    const initials = getInitials(applicant.applicant_name);
    const avatarGradient = getAvatarGradient(applicant.applicant_name);
    const inMasterlist = !!(applicant.master_eid || applicant.master_wave || applicant.master_status);
    const statusPill = getStatusPill(applicant.current_status);

    const allTabs: { id: PISTab; label: string }[] = [
        { id: 'candidate_profile', label: 'Candidate Profile' },
        { id: 'interview_results', label: 'Interview Results' },
        { id: 'assessment_scores', label: 'Assessment Scores' },
        { id: 'typing_scores', label: 'Typing Scores' },
        { id: 'application_history', label: 'Application History' },
        { id: 'notes', label: 'Notes/Remarks' },
        { id: 'summary', label: 'Summary' },
    ];

    const visibleTabs = allTabs;


    const handleDownloadPDF = async (type: 'pis' | 'candidate') => {
        const targetRef = type === 'pis' ? pisExportRef : candidateExportRef;
        if (!targetRef.current) return;
        setExportMenuOpen(false);
        setIsExporting(true);
        try {
            const canvas = await html2canvas(targetRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const ratio = canvas.height / canvas.width;
            const imgHeight = pdfWidth * ratio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            const prefix = type === 'pis' ? 'PIS' : 'CandidateData';
            pdf.save(`${prefix}-${(applicant.applicant_name || 'applicant').replace(/\s+/g, '_')}-${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('[PISDashboardModal] PDF Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpdateApplication = (id: string, patch: any) => {
        setLocalApplicant(prev => {
            const base = prev || freshApplicant || applicantProp;
            if (!base) return prev;

            const updated = { ...base };
            // Process PIS nested object purely
            if (patch.pis) {
                updated.pis = { ...(base.pis || {}), ...patch.pis };

                // Keep root level database columns in sync with PIS updates
                const PIS_DB_COLUMNS = new Set([
                    'first_name', 'last_name', 'middle_name', 'sex', 'civil_status', 'birth_date',
                    'nationality', 'current_address', 'permanent_address', 'highest_education',
                    'school_name', 'degree', 'graduation_year', 'emergency_contact_name', 'emergency_contact_phone',
                    'emergency_contact_relationship', 'signature_data_url', 'nick_name', 'place_of_birth', 'phone',
                    'flexible_schedule', 'travel_method', 'spouse_name', 'spouse_occupation', 'father_name',
                    'father_occupation', 'mother_name', 'mother_occupation', 'num_children', 'num_siblings',
                    'school_year_attended', 'is_graduated', 'course_strand', 'num_semesters',
                    'plans_to_pursue_studies', 'plans_to_go_abroad', 'has_medical_conditions', 'medical_conditions',
                    'medical_history_notes', 'drinks_alcohol', 'smokes', 'is_pregnant', 'skills',
                    'philhealth_no', 'sss_no', 'tin_no', 'pagibig_no', 'drug_test'
                ]);

                Object.keys(patch.pis).forEach(key => {
                    if (PIS_DB_COLUMNS.has(key)) {
                        (updated as any)[key] = patch.pis[key];
                    }
                    if (key === 'email') {
                        (updated as any).applicant_email = patch.pis[key];
                        (updated as any).email = patch.pis[key];
                    }
                });
            }

            // Create a clean patch without pis
            const { pis, ...restPatch } = patch;

            return { ...updated, ...restPatch };
        });
    };

    const handleSave = async () => {
        if (!localApplicant) return;
        setIsSaving(true);
        try {
            const { ApplicationService } = await import('@/services/ApplicationService');

            const activeRemarks = tempRemarks !== null ? tempRemarks : (localApplicant.final_interview_notes || localApplicant.pis?.ops_validator_notes || '');
            const currentPis = localApplicant.pis || {};
            const updatedPis = {
                ...currentPis,
                ops_validator_notes: activeRemarks,
                final_interview_notes: activeRemarks
            };

            const currentResp = (localApplicant.interview_responses as any) || {};
            const updatedResp = { ...currentResp };
            Object.keys(updatedResp).forEach(k => {
                if (k.includes('remarks') || k.includes('final') || k.includes('validator')) {
                    updatedResp[k] = activeRemarks;
                }
            });

            const patchPayload: any = {
                ...localApplicant,
                final_interview_notes: activeRemarks,
                ops_validator_notes: activeRemarks,
                interview_responses: updatedResp,
                pis: updatedPis
            };

            await ApplicationService.patch(localApplicant.id, patchPayload);
            if (handleUpdateApplication) {
                handleUpdateApplication(localApplicant.id, patchPayload);
            }
            setIsEditing(false);
            setTempRemarks(null);

            // Re-fetch to ensure fresh state
            const updatedData = await ApplicationService.getById(localApplicant.id);
            if (updatedData) {
                setFreshApplicant(updatedData);
                setLocalApplicant(updatedData);
            }

        } catch (error) {
            console.error('Failed to save application changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title=""
            size="7xl"
            className="bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-md"
        >
            <div className="flex flex-col h-[85vh] bg-white dark:bg-slate-900 font-sans antialiased text-[#323130] dark:text-slate-300" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
                {/* Header Section */}
                <div className="px-8 pt-8 pb-6 border-b border-[#e1dfdd] bg-[#faf9f8] shrink-0">
                    <div className="flex items-start gap-4">
                        {pis.photo_data_url ? (
                            <img
                                src={pis.photo_data_url}
                                alt={applicant.applicant_name}
                                className="w-16 h-16 object-cover border border-[#e1dfdd] rounded-full shrink-0 shadow-sm"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-[#3460aa] flex items-center justify-center text-white text-xl font-bold uppercase shrink-0 shadow-sm">
                                {initials}
                            </div>
                        )}
                        <div className="flex-1 min-w-0 mt-1">
                            <h1 className="text-2xl font-semibold text-[#323130] dark:text-slate-300 mb-1 truncate">
                                {applicant.applicant_name || 'Unknown Applicant'}
                                {pis?.preferred_nickname ? ` (Preferred: ${pis.preferred_nickname})` : (applicant.preferred_nickname ? ` (Preferred: ${applicant.preferred_nickname})` : '')}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-[#605e5c] dark:text-slate-400 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <Briefcase size={14} />
                                    <span>{getStatusLabel(applicant.current_status) || 'Open'}</span>
                                </div>
                                {(applicant.applicant_email || applicant.email) && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail size={14} />
                                        <span>{applicant.applicant_email || applicant.email}</span>
                                    </div>
                                )}
                                {(applicant.resume_name || applicant.resume_data || applicant.resume_path) && (
                                    <div className="flex items-center gap-1.5 ml-2 border-l border-surface-300 pl-4">
                                        <a 
                                            href={applicant.resume_data || `/api/applications/${applicant.id}/resume`}
                                            download={applicant.resume_name || "Resume.pdf"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded-md text-[13px] font-medium transition-colors shadow-sm"
                                        >
                                            <FileText size={14} />
                                            Resume
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col p-8">
                    {/* Navigation Tabs */}
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#e1dfdd] shrink-0">
                        <div className="flex items-center gap-6">
                            {visibleTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "text-[15px] font-semibold pb-2 border-b-2 -mb-[1px] transition-colors whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "border-[#0078d4] text-[#323130] dark:text-slate-300"
                                            : "border-transparent text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <main className="flex-1 min-h-0">
                        {activeTab === 'candidate_profile' && <ApplicationTab applicant={applicant} showPIS={showPIS} setShowPIS={setShowPIS} isEditing={isEditing} handleUpdateApplication={handleUpdateApplication} autoSaveOnType={true} />}
                        {activeTab === 'interview_results' && <InterviewResultsTab applicant={applicant} isEditing={isEditing} handleUpdateApplication={handleUpdateApplication} tempRemarks={tempRemarks} setTempRemarks={setTempRemarks} setLocalApplicant={setLocalApplicant} />}
                        {activeTab === 'assessment_scores' && <AssessmentTab applicant={applicant} pis={pis} isEditing={isEditing} handleUpdateApplication={handleUpdateApplication} />}
                        {activeTab === 'typing_scores' && <TypingTab applicant={applicant} onQueue={() => { }} isEditing={isEditing} setIsEditing={setIsEditing} handleUpdateApplication={handleUpdateApplication} />}
                        {(activeTab === 'application_history' || activeTab === 'application_progress') && <ApplicationHistoryTab applicant={applicant} pis={pis} />}
                        {activeTab === 'notes' && <NotesTab applicant={applicant} isEditing={isEditing} handleUpdateApplication={handleUpdateApplication} />}
                        {activeTab === 'summary' && <SummaryTab applicant={applicant} />}
                    </main>
                </div>

                <div className="px-8 py-4 border-t border-[#e1dfdd] bg-[#faf9f8] flex items-center justify-between shrink-0 font-sans antialiased" style={{ fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
                    <div className="flex items-center gap-3">
                        {!guestDeskMode && (
                            isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold bg-[#0078d4] hover:bg-[#106ebe] text-white transition-all rounded-[2px] cursor-pointer"
                                    >
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-surface-200 bg-white text-surface-600 hover:bg-surface-50 transition-all rounded-[2px]"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                !guestDeskMode && !isOpsValidator && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 transition-all rounded-[2px] cursor-pointer shadow-sm"
                                    >
                                        <Edit3 size={14} /> Edit Profile
                                    </button>
                                )
                            )
                        )}
                        {(applicant.resume_name || applicant.resume_data || applicant.resume_path || (applicant.pis as any)?.resume_url || (applicant.metadata as any)?.resume_url) ? (
                            <a
                                href={applicant.resume_data || (applicant.pis as any)?.resume_url || (applicant.metadata as any)?.resume_url || `/api/applications/${applicant.id}/resume`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#0078d4] transition-all rounded-[2px] cursor-pointer shadow-sm"
                                title="View uploaded resume"
                            >
                                <FileText size={14} /> View Resume
                            </a>
                        ) : (
                            <button
                                disabled
                                className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-white dark:bg-slate-900 text-[#a19f9d] rounded-[2px] cursor-not-allowed shadow-sm"
                                title="No resume uploaded"
                            >
                                <FileText size={14} /> No Resume
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative export-dropdown-container" ref={exportDropdownRef}>
                            <button
                                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                                disabled={isExporting}
                                className="flex items-center justify-center gap-1.5 h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-white dark:bg-slate-900 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 transition-all rounded-[2px]"
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {isExporting ? 'Exporting...' : 'Export'}
                                <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {exportMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-1 w-48 bg-white dark:bg-slate-900 border border-[#e1dfdd] shadow-lg rounded-[2px] z-50 overflow-hidden">
                                    <button
                                        onClick={() => handleDownloadPDF('pis')}
                                        className="w-full text-left px-4 py-2 text-sm text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] font-medium transition-colors"
                                    >
                                        PIS Form
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPDF('candidate')}
                                        className="w-full text-left px-4 py-2 text-sm text-[#323130] dark:text-slate-300 hover:bg-[#f3f2f1] hover:text-[#0078d4] font-medium transition-colors border-t border-[#f3f2f1]"
                                    >
                                        Candidate Data
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center h-8 px-4 text-sm font-semibold border border-[#e1dfdd] bg-[#0078d4] hover:bg-[#106ebe] text-white transition-all rounded-[2px]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
            <div className="fixed -left-[9999px] top-0 pointer-events-none">
                <PISExportTemplate ref={pisExportRef} application={applicant} />
                <CandidateDataExportTemplate ref={candidateExportRef} application={applicant} />
            </div>
        </Modal>
    );
};

