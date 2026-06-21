import React from 'react';
import { Modal } from '@/components/common/Modal';
import {
    X, Download, FileText, Briefcase, GraduationCap,
    Award, AlertTriangle, User, Phone, Mail, Calendar,
    ChevronDown, ChevronUp, ExternalLink, Loader2,
    CheckCircle2, Target, GavelIcon, ClipboardList, Star,
    MessageSquare, ListChecks, Headphones
} from 'lucide-react';
import { cn } from '@/utils/formatters';
import type { Application, PersonalInfoSheet } from '@/types/application';
import { QuestionService, InterviewQuestion } from '@/services/QuestionService';

type ProfileTab = 'application' | 'initial_interview' | 'interview_results' | 'interview_recording' | 'assessment' | 'final_interview' | 'verdict';

interface FullscreenProfileViewProps {
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

function formatStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value: string | undefined | null): string {
    if (!value) return '—';
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

function FieldGrid({ items, cols = 3 }: { items: { label: string; value: React.ReactNode; mono?: boolean }[]; cols?: 2 | 3 | 4 }) {
    const colsClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
    return (
        <div className={cn('grid gap-px bg-surface-200 border border-surface-200 rounded-lg overflow-hidden', colsClass)}>
            {items.map((it, i) => (
                <div key={i} className="bg-white px-4 py-3">
                    <p className="text-[9.5px] font-bold text-surface-400 uppercase tracking-widest">{it.label}</p>
                    <p className={cn(
                        'text-[12.5px] mt-1 break-words',
                        it.value === '—' || it.value === null || it.value === undefined || it.value === ''
                            ? 'text-surface-400 italic'
                            : 'text-surface-900 font-semibold',
                        it.mono && 'font-mono text-[11.5px]'
                    )}>
                        {it.value === null || it.value === undefined || it.value === '' ? '—' : it.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string | undefined | null }) {
    return (
        <div className="bg-white border border-surface-200 rounded-lg px-4 py-3">
            <p className="text-[9.5px] font-bold text-surface-400 uppercase tracking-widest">{label}</p>
            <p className={cn(
                'text-[12.5px] mt-1 break-words',
                !value ? 'text-surface-400 italic' : 'text-surface-900 font-semibold'
            )}>
                {value || '—'}
            </p>
        </div>
    );
}

function SectionCard({ icon: Icon, title, subtitle, accent = 'indigo', children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle?: string;
    accent?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate';
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
        <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-md flex items-center justify-center shrink-0', accentColors[accent])}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-surface-900 leading-tight tracking-tight">{title}</p>
                    {subtitle && <p className="text-[10.5px] text-surface-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function FullPisPanel({ pis }: { pis: Partial<PersonalInfoSheet> }) {
    return (
        <div className="mt-2 bg-white border border-surface-200 rounded-lg p-5 space-y-5 animate-fade-in">
            <div>
                <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Identity</h4>
                <FieldGrid items={[
                    { label: 'Full Name', value: pis.full_name },
                    { label: 'Nickname', value: pis.nick_name },
                    { label: 'Place of Birth', value: pis.place_of_birth },
                    { label: 'Religion', value: pis.religion },
                    { label: 'Current Address', value: pis.current_address },
                    { label: 'Permanent Address', value: pis.permanent_address },
                ]} />
            </div>

            {pis.work_experience && pis.work_experience.length > 0 && (
                <div>
                    <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Work Experience</h4>
                    <div className="space-y-2">
                        {pis.work_experience.map((w, i) => (
                            <div key={i} className="border border-surface-200 rounded-md p-3 bg-surface-50/40">
                                <div className="flex items-baseline justify-between">
                                    <p className="text-[12px] font-bold text-surface-900">{w.position} <span className="text-surface-500 font-normal">at</span> {w.company}</p>
                                    <p className="text-[10px] text-surface-500 font-mono">{w.duration_from} → {w.duration_to}</p>
                                </div>
                                {w.description && <p className="text-[11px] text-surface-600 mt-1 whitespace-pre-wrap">{w.description}</p>}
                                {w.exit_reason && <p className="text-[10px] text-surface-500 italic mt-1">Exit: {w.exit_reason}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(pis.languages?.length || 0) > 0 && (
                <div>
                    <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                        {pis.languages!.map((l, i) => (
                            <span key={i} className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[11px] font-semibold rounded border border-sky-100">
                                {l.language} <span className="text-sky-500 font-normal">· {l.proficiency}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {(pis.certifications?.length || 0) > 0 && (
                <div>
                    <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Certifications</h4>
                    <div className="space-y-2">
                        {pis.certifications!.map((c, i) => (
                            <div key={i} className="flex items-center justify-between border border-surface-200 rounded-md px-3 py-2">
                                <div>
                                    <p className="text-[12px] font-bold text-surface-900">{c.name}</p>
                                    <p className="text-[10px] text-surface-500">{c.issuer} · {c.date}</p>
                                </div>
                                <CheckCircle2 size={14} className="text-emerald-500" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Government IDs</h4>
                <FieldGrid items={[
                    { label: 'SSS', value: pis.sss_no, mono: true },
                    { label: 'TIN', value: pis.tin_no, mono: true },
                    { label: 'PhilHealth', value: pis.philhealth_no, mono: true },
                    { label: 'Pag-IBIG', value: pis.pagibig_no, mono: true },
                ]} />
            </div>

            <div>
                <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest mb-2">Emergency Contact</h4>
                <FieldGrid items={[
                    { label: 'Name', value: pis.emergency_contact_name },
                    { label: 'Phone', value: pis.emergency_contact_phone },
                    { label: 'Relationship', value: pis.emergency_contact_relationship },
                ]} />
            </div>
        </div>
    );
}

function ApplicationTab({ applicant, pis }: { applicant: Application; pis: Partial<PersonalInfoSheet> }) {
    const [showFullPis, setShowFullPis] = React.useState(false);
    const latestWork = pis.work_experience?.[0];
    const skills = pis.skills || [];
    const workExperience = pis.work_experience || [];

    return (
        <div className="p-6 space-y-5">
            {/* PROFILE INTELLIGENCE */}
            <section>
                <div className="flex items-baseline gap-2 mb-3">
                    <User size={13} className="text-indigo-600" />
                    <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Basic Info</h2>
                    <p className="text-[14px] font-bold text-surface-900">Personal Details</p>
                </div>
                <FieldGrid items={[
                    { label: 'Civil Status', value: pis.civil_status },
                    { label: 'Date of Birth', value: pis.birth_date },
                    { label: 'Religion', value: pis.religion },
                    { label: 'Nickname', value: pis.nick_name },
                    { label: 'Age', value: pis.age },
                    { label: 'Nationality', value: pis.nationality },
                    { label: 'Phone Number', value: pis.phone, mono: true },
                    { label: 'Gender', value: pis.gender },
                    { label: 'Email', value: pis.email || applicant.applicant_email, mono: true },
                ]} />
            </section>

            {/* GOVERNMENT IDS */}
            <section>
                <FieldGrid cols={4} items={[
                    { label: 'SSS No.', value: pis.sss_no, mono: true },
                    { label: 'BIR TIN', value: pis.tin_no, mono: true },
                    { label: 'PhilHealth', value: pis.philhealth_no, mono: true },
                    { label: 'Pag-IBIG', value: pis.pagibig_no, mono: true },
                ]} />
            </section>

            {/* VIEW FULL PIS (expandable) */}
            <section className="bg-white border border-surface-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowFullPis(!showFullPis)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                            <FileText size={13} className="text-indigo-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-[12.5px] font-bold text-surface-900">View Full PIS</p>
                            <p className="text-[10.5px] text-surface-500">Personal Information Sheet — complete submitted data</p>
                        </div>
                    </div>
                    {showFullPis ? <ChevronUp size={15} className="text-surface-500" /> : <ChevronDown size={15} className="text-surface-500" />}
                </button>
                {showFullPis && (
                    <div className="px-5 pb-5 border-t border-surface-100 pt-4 bg-surface-50/30">
                        <FullPisPanel pis={pis} />
                    </div>
                )}
            </section>

            {/* ADDRESSES */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Award size={12} className="text-indigo-600" />
                    <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Addresses</h2>
                </div>
                <FieldGrid cols={2} items={[
                    { label: 'Current Address', value: pis.current_address },
                    { label: 'Permanent Address', value: pis.permanent_address },
                ]} />
            </section>

            {/* EDUCATION */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={12} className="text-indigo-600" />
                    <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Education</h2>
                </div>
                <FieldGrid cols={2} items={[
                    { label: 'Highest Education', value: pis.highest_education },
                    { label: 'School / University', value: pis.school_name },
                    { label: 'Degree / Course', value: pis.degree },
                    { label: 'Graduation Year', value: pis.graduation_year?.toString() },
                ]} />
            </section>

            {/* WORK EXPERIENCE */}
            {workExperience.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Briefcase size={12} className="text-indigo-600" />
                        <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Work Experience</h2>
                    </div>
                    <div className="space-y-2">
                        {workExperience.map((w, i) => (
                            <div key={i} className="bg-white border border-surface-200 rounded-md p-3">
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="text-[12px] font-bold text-surface-900">{w.position}</p>
                                    <p className="text-[10px] text-surface-500 font-mono shrink-0">{w.duration_from} → {w.duration_to}</p>
                                </div>
                                <p className="text-[11px] text-surface-600 mt-0.5">{w.company}</p>
                                {w.description && <p className="text-[11px] text-surface-500 mt-1.5 whitespace-pre-wrap leading-relaxed">{w.description}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SKILLS & COMPETENCIES */}
            {skills.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Award size={12} className="text-indigo-600" />
                        <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Skills & Competencies</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {skills.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[11px] font-semibold rounded border border-amber-100">
                                {s}
                            </span>
                        ))}
                    </div>
                </section>
            )}

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

function InterviewResultsTab({ applicant }: { applicant: Application }) {
    const [subTab, setSubTab] = React.useState<'initial' | 'final' | 'recording'>('initial');
    
    const metadata = typeof applicant.metadata === 'string'
        ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })()
        : (applicant.metadata || {});
    const checklist: Record<string, boolean> = (metadata.checklist as Record<string, boolean>) || {};
    const ratings: Record<string, any> = (metadata.ratings as Record<string, any>) || {};
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
            .then(qs => setQuestions(qs.filter(q => q.is_active)))
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
                                className={cn(
                                    'flex items-start gap-2 text-[11px] py-0.5 select-none',
                                    isChecked ? 'text-surface-900 font-bold' : 'text-surface-500'
                                )}
                            >
                                <span className={cn(
                                    'mt-0.5 inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border shrink-0',
                                    isChecked
                                        ? cat === 'c' ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : cat === 'b' ? 'bg-amber-500 border-amber-500 text-white'
                                                : 'bg-rose-500 border-rose-500 text-white'
                                        : 'bg-white border-surface-300'
                                )}>
                                    {isChecked && (
                                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                        </svg>
                                    )}
                                </span>
                                <span>{item}</span>
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
            <div className="bg-white border border-surface-200 p-4 rounded-lg shadow-sm space-y-3">
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

    // Group questions by category for Interview Evaluation display
    const questionsByCategory = React.useMemo(() => {
        const grouped: Record<string, InterviewQuestion[]> = {};
        questions.forEach(q => {
            const cat = q.category || 'General Evaluation';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(q);
        });
        return grouped;
    }, [questions]);

    return (
        <div className="p-6 space-y-6">
            {/* Header metadata strip */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-surface-200 rounded-lg">
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                    {subTab === 'recording' ? (
                        <Headphones size={14} className="text-slate-600" />
                    ) : (
                        <User size={14} className="text-slate-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-surface-900">
                        {subTab === 'initial' ? 'Initial Interview Session' : subTab === 'final' ? 'Final Interview Session' : 'Interview Session Recording & Transcription Logs'}
                    </p>
                    <p className="text-[10px] text-surface-500">
                        {subTab === 'initial' ? (
                            <>
                                {applicant.interview_completed_at ? `Completed ${formatDate(applicant.interview_completed_at)}` : 'Not yet completed'}
                                {applicant.interviewer_name && ` · ${applicant.interviewer_name}`}
                                {applicant.interview_room && ` · ${applicant.interview_room}`}
                            </>
                        ) : subTab === 'final' ? (
                            <>
                                {applicant.endorsement_meeting_date ? `Scheduled ${formatDate(applicant.endorsement_meeting_date)}` : 'Not yet scheduled'}
                                {applicant.assigned_ops_validator_name && ` · ${applicant.assigned_ops_validator_name}`}
                            </>
                        ) : (
                            <>
                                Review raw audio recordings and transcriptions from initial and final interview sessions.
                            </>
                        )}
                    </p>
                </div>
                {subTab === 'initial' && applicant.interview_recording_url && (
                    <a
                        href={applicant.interview_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold bg-rose-50 border border-rose-200 text-rose-700 rounded-md hover:bg-rose-100 transition-colors shrink-0"
                    >
                        <ExternalLink size={10} /> Recording
                    </a>
                )}
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex border-b border-surface-200 gap-4 mb-4">
                <button
                    onClick={() => setSubTab('initial')}
                    className={cn(
                        'pb-2 text-[12px] font-bold transition-all relative uppercase tracking-wider',
                        subTab === 'initial' ? 'text-indigo-600' : 'text-surface-400 hover:text-surface-600'
                    )}
                >
                    Initial Interview
                    {subTab === 'initial' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t" />}
                </button>
                <button
                    onClick={() => setSubTab('final')}
                    className={cn(
                        'pb-2 text-[12px] font-bold transition-all relative uppercase tracking-wider',
                        subTab === 'final' ? 'text-indigo-600' : 'text-surface-400 hover:text-surface-600'
                    )}
                >
                    Final Interview
                    {subTab === 'final' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t" />}
                </button>
                <button
                    onClick={() => setSubTab('recording')}
                    className={cn(
                        'pb-2 text-[12px] font-bold transition-all relative uppercase tracking-wider',
                        subTab === 'recording' ? 'text-indigo-600' : 'text-surface-400 hover:text-surface-600'
                    )}
                >
                    Recording
                    {subTab === 'recording' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t" />}
                </button>
            </div>

            {subTab === 'initial' ? (
                /* Side-by-Side 2-Column Proportional Grid for Initial Interview */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    
                    {/* ── LEFT COLUMN: INTERVIEW EVALUATION ── */}
                    <div className="space-y-6">
                        <SectionCard icon={MessageSquare} title="Interview Evaluation" accent="indigo" subtitle="Questions, answers, and observations">
                            {questionsLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 size={14} className="animate-spin text-surface-400" />
                                    <span className="text-[11px] text-surface-400">Loading questions…</span>
                                </div>
                            ) : questions.length === 0 ? (
                                <p className="text-[12px] text-surface-400 italic">No interview questions configured.</p>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(questionsByCategory).map(([category, qs]) => (
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
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[12px] font-semibold text-surface-800 leading-snug">
                                                                            {q.question_text}
                                                                            {q.is_required && <span className="text-rose-400 ml-1">*</span>}
                                                                        </p>
                                                                        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-wider">
                                                                            {q.answer_type}
                                                                        </span>
                                                                    </div>
                                                                    {score != null && (
                                                                        <span className="shrink-0 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                                                                            Score: {score}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className={cn(
                                                                    'ml-7 px-3 py-2 rounded-md border text-[12px] leading-relaxed',
                                                                    hasAnswer
                                                                        ? 'bg-white border-surface-200 text-surface-900 font-medium'
                                                                        : 'bg-surface-100 border-surface-200 text-surface-400 italic'
                                                                )}>
                                                                    {hasAnswer ? answer : 'No answer recorded'}
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

                    {/* ── RIGHT COLUMN: ASSESSMENT & BACKGROUND ── */}
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
                                    { label: 'Work Habits / Attitude', value: ratings.workHabits },
                                    { label: 'Communication Skills', value: ratings.communicationSkills },
                                    { label: 'Empathy', value: ratings.empathy },
                                    { label: 'Confidence', value: ratings.confidence },
                                    { label: 'Language Classification', value: ratings.languageClassification },
                                    { label: 'Candidate Source', value: background.candidateSource },
                                ]} />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {RUBRIC_CRITERIA.map(section => (
                                    <div key={section.prefix}>{renderRubric(section)}</div>
                                ))}
                            </div>
                        </SectionCard>

                        {/* Background & Experience */}
                        <SectionCard icon={Briefcase} title="Background & Experience" accent="sky" subtitle="Candidate background captured during interview">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="BPO Experience (Chat)" value={background.bpoChat} />
                                <Field label="BPO Experience (Voice)" value={background.bpoVoice} />
                                <Field label="Non-BPO Experience" value={background.nonBpo} />
                                <Field label="Shifting Schedules" value={background.shiftingIssues} />
                                <Field label="Highest Education" value={background.education} />
                                <Field label="SHS Strand" value={background.shsStrand} />
                                <Field label="Plans to Pursue Studies" value={background.pursueStudies} />
                                <Field label="Plans to Go Abroad" value={background.goAbroad} />
                                <Field label="Mode of Transportation" value={background.transportMode} />
                                <Field label="Medical Issues" value={background.medicalIssues} />
                                <Field label="Availability to Start" value={background.startAvailability} />
                                <Field label="Salary Expectations" value={background.salaryExpectation} />
                            </div>
                        </SectionCard>

                        {/* Per-Question Grading */}
                        {hasGrading && (
                            <SectionCard icon={Star} title="Per-Question Grading" accent="violet">
                                <div className="space-y-1">
                                    {gradingEntries.map(([k, v], i) => {
                                        const question = questions.find(q => q.id === k);
                                        return (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-surface-100 last:border-0">
                                                <p className="text-[11.5px] text-surface-600 truncate pr-3">
                                                    {question?.question_text || k}
                                                </p>
                                                <p className="text-[12px] font-bold text-surface-900 shrink-0">{String(v)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>
                        )}
                    </div>

                </div>
            ) : subTab === 'final' ? (
                /* Final Interview Sub-tab: Only displays Interviewer Remarks */
                <div className="max-w-3xl mx-auto space-y-6">
                    <SectionCard icon={MessageSquare} title="Final Interviewer's Remarks" accent="amber">
                        <div className="px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-md">
                            {ratings.remarks ? (
                                <p className="text-[13px] text-surface-800 whitespace-pre-wrap leading-relaxed">{String(ratings.remarks)}</p>
                            ) : (
                                <p className="text-[12.5px] text-surface-400 italic">No final interviewer's remarks recorded yet.</p>
                            )}
                        </div>
                    </SectionCard>
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
            <div className="bg-white border border-surface-200 p-5 rounded-lg shadow-sm space-y-4">
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
                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-surface-200 rounded-lg">
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
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
                <div className="py-12 text-center bg-white border border-surface-200 rounded-lg shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
                        <Headphones size={20} className="text-surface-300" />
                    </div>
                    <p className="text-[12.5px] text-surface-400 italic">No recordings or transcripts available for this applicant.</p>
                </div>
            )}
        </div>
    );
}

function AssessmentTab({ applicant, pis }: { applicant: Application; pis: Partial<PersonalInfoSheet> }) {
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
                <div className="grid grid-cols-2 gap-4">
                    <div className="px-4 py-3 bg-violet-50 border border-violet-100 rounded-md">
                        <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Internal Score</p>
                        <p className="text-[24px] font-extrabold text-violet-900 mt-1">{applicant.assessment_score ?? '—'}<span className="text-[12px] text-violet-400 font-bold ml-1">/ 100</span></p>
                    </div>
                    <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-md">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Client Assessment</p>
                        <p className="text-[24px] font-extrabold text-indigo-900 mt-1">{applicant.client_assessment_score ?? '—'}<span className="text-[12px] text-indigo-400 font-bold ml-1">/ 100</span></p>
                    </div>
                </div>
                {pis.cefr_level && (
                    <div className="mt-4 px-3 py-2 bg-surface-50 border border-surface-200 rounded-md flex items-center justify-between">
                        <p className="text-[10.5px] font-bold text-surface-500 uppercase tracking-widest">CEFR Level</p>
                        <p className="text-[12.5px] font-bold text-surface-900">{pis.cefr_level}</p>
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
                            return (
                                <div key={i} className="px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-md">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="text-[11.5px] font-semibold text-surface-700">{c.label}</p>
                                        <p className="text-[11px] font-bold text-indigo-600">{score}/{max}</p>
                                    </div>
                                    <div className="h-1 bg-surface-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            {applicant.interview_grading && Object.keys(applicant.interview_grading).length > 0 && (
                <SectionCard icon={ClipboardList} title="Rubric Grading" accent="amber">
                    <div className="space-y-1.5">
                        {Object.entries(applicant.interview_grading).map(([k, v], i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-surface-100 last:border-0">
                                <p className="text-[11.5px] text-surface-600 font-mono">{k}</p>
                                <p className="text-[12px] font-bold text-surface-900">{String(v)}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
    );
}

function FinalInterviewTab({ applicant, pis }: { applicant: Application; pis: Partial<PersonalInfoSheet> }) {
    return (
        <div className="p-7 space-y-6">
            <SectionCard icon={User} title="Final Interview Details" accent="slate">
                <FieldGrid items={[
                    { label: 'Ops Validator', value: applicant.assigned_ops_validator_name },
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

            <SectionCard icon={FileText} title="Client Interview Remarks" accent="sky">
                {applicant.client_interview_remarks ? (
                    <div className="text-[12.5px] text-surface-700 whitespace-pre-wrap leading-relaxed">{applicant.client_interview_remarks}</div>
                ) : (
                    <p className="text-[12.5px] text-surface-400 italic">No client interview remarks</p>
                )}
            </SectionCard>
        </div>
    );
}

function VerdictTab({ applicant, pis }: { applicant: Application; pis: Partial<PersonalInfoSheet> }) {
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
                    <p className="text-[24px] font-extrabold text-surface-900 leading-tight tracking-tight mt-0.5">{formatStatusLabel(verdict)}</p>
                    {applicant.hired_at && <p className="text-[10.5px] text-surface-500 mt-1">Hired {formatDate(applicant.hired_at)}</p>}
                </div>
            </div>

            <SectionCard icon={ClipboardList} title="Decision Details" accent="slate">
                <FieldGrid items={[
                    { label: 'Final Verdict', value: applicant.final_verdict ? formatStatusLabel(applicant.final_verdict) : '—' },
                    { label: 'Specific Status', value: pis.final_specific_status },
                    { label: 'Overall Status', value: applicant.overall_status },
                    { label: 'Final Account', value: pis.final_account },
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
                        { label: 'Basic Salary', value: applicant.master_basic_salary ? `₱${applicant.master_basic_salary.toLocaleString()}` : '—' },
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
                                    : "bg-white border-surface-200 hover:border-surface-300 hover:shadow-md"
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
                                        {formatStatusLabel(app.current_status)}
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
                                                                        {formatStatusLabel(t.to_status)}
                                                                    </span>
                                                                    {t.from_status && (
                                                                        <span className="text-surface-400 text-[10px] ml-1.5 font-medium">
                                                                            (from {formatStatusLabel(t.from_status)})
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
                                                                            {" · "}
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

export const FullscreenProfileView: React.FC<FullscreenProfileViewProps> = ({
    open,
    onClose,
    applicant: applicantProp,
    pisOnly = true,
    guestDeskMode = false,
}) => {
    const [topTab, setTopTab] = React.useState<'process' | 'log'>('process');
    const [activeTab, setActiveTab] = React.useState<ProfileTab>('application');
    const [freshApplicant, setFreshApplicant] = React.useState<Application | null>(null);
    const [isFetching, setIsFetching] = React.useState(false);

    // Re-fetch from server every time the modal opens to get latest interview data
    React.useEffect(() => {
        if (!open || !applicantProp?.id) {
            setFreshApplicant(null);
            return;
        }
        setIsFetching(true);
        import('@/services/ApplicationService')
            .then(({ ApplicationService }) => ApplicationService.getById(applicantProp.id))
            .then(data => setFreshApplicant(data))
            .catch(() => setFreshApplicant(null))
            .finally(() => setIsFetching(false));
    }, [open, applicantProp?.id]);

    const applicant = freshApplicant ?? applicantProp;

    if (!applicant) return null;

    const pis = applicant.pis || {};
    const initials = getInitials(applicant.applicant_name);
    const avatarGradient = getAvatarGradient(applicant.applicant_name);
    const inMasterlist = !!(applicant.master_eid || applicant.master_wave || applicant.master_status);
    const statusPill = getStatusPill(applicant.current_status);

    const allTabs: { id: ProfileTab; label: string }[] = [
        { id: 'application', label: 'Application' },
        { id: 'initial_interview', label: 'Initial Interview' },
        { id: 'interview_results', label: 'Interview Results' },
        { id: 'interview_recording', label: 'Interview Recording' },
        { id: 'assessment', label: 'Assessment' },
        { id: 'final_interview', label: 'Final Interview' },
        { id: 'verdict', label: 'Verdict' },
    ];
    
    const visibleTabs = guestDeskMode
        ? allTabs.filter(t => t.id === 'application' || t.id === 'interview_results')
        : pisOnly
            ? allTabs.filter(t => t.id === 'application' || t.id === 'interview_results' || t.id === 'interview_recording')
            : allTabs;

    const handleExportPis = () => {
        try {
            const data = JSON.stringify({ applicant, pis }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(applicant.applicant_name || 'applicant').replace(/\s+/g, '_')}_PIS.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[FullscreenProfileView] Export failed:', e);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title=""
            size="xl"
            className="bg-white"
        >
            <div className="flex flex-col h-full bg-white">
                <header className="px-6 py-4 border-b border-surface-200 flex items-center gap-4 shrink-0">
                    {pis.photo_data_url ? (
                        <img
                            src={pis.photo_data_url}
                            alt={applicant.applicant_name}
                            className="w-12 h-12 object-cover border border-surface-200 rounded-md shrink-0"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold text-xl rounded-md shrink-0">
                            {initials}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[18px] font-bold text-surface-900 truncate">{applicant.applicant_name || 'Unknown Applicant'}</h1>
                            {isFetching && (
                                <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" />
                            )}
                        </div>
                        <p className="text-[11px] text-surface-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <Briefcase size={11} className="text-surface-400 shrink-0" />
                            <span className="truncate">{applicant.department || applicant.position_title || '---'}</span>
                            {applicant.applicant_id && (
                                <>
                                    <span className="text-surface-300">·</span>
                                    <span>ID: {applicant.applicant_id}</span>
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1',
                            statusPill
                        )}>
                            {formatStatusLabel(applicant.current_status)}
                        </span>
                        <button
                            onClick={handleExportPis}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-semibold border border-surface-300 rounded-md hover:bg-surface-50 text-surface-700 transition-colors"
                        >
                            <Download size={12} /> Export PIS
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-surface-100 text-surface-400 hover:text-surface-900 transition-all rounded-md ml-1"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </header>

                {/* Top-Level Navigation Tabs */}
                <div className="px-6 border-b border-surface-200 flex justify-center gap-6 shrink-0 bg-white overflow-x-auto">
                    <button
                        onClick={() => setTopTab('process')}
                        className={cn(
                            'relative px-5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
                            topTab === 'process'
                                ? 'text-indigo-600'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Application Process
                        {topTab === 'process' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-600 rounded-t" />
                        )}
                    </button>
                    <button
                        onClick={() => setTopTab('log')}
                        className={cn(
                            'relative px-5 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
                            topTab === 'log'
                                ? 'text-indigo-600'
                                : 'text-surface-500 hover:text-surface-950'
                        )}
                    >
                        Application Log
                        {topTab === 'log' && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-600 rounded-t" />
                        )}
                    </button>
                </div>

                {topTab === 'process' && (
                    <nav className="px-6 border-b border-surface-200 flex justify-center gap-1 shrink-0 bg-white overflow-x-auto">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'relative px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
                                    activeTab === tab.id
                                        ? 'text-indigo-600'
                                        : 'text-surface-500 hover:text-surface-900'
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-600 rounded-t" />
                                )}
                            </button>
                        ))}
                    </nav>
                )}

                <main className="flex-1 overflow-y-auto bg-surface-50/30">
                    {topTab === 'process' ? (
                        <>
                            {activeTab === 'application' && <ApplicationTab applicant={applicant} pis={pis} />}
                            {activeTab === 'interview_results' && <InterviewResultsTab applicant={applicant} />}
                            {activeTab === 'interview_recording' && <InterviewRecordingTab applicant={applicant} />}
                            {activeTab === 'initial_interview' && <InitialInterviewTab applicant={applicant} />}
                            {activeTab === 'assessment' && <AssessmentTab applicant={applicant} pis={pis} />}
                            {activeTab === 'final_interview' && <FinalInterviewTab applicant={applicant} pis={pis} />}
                            {activeTab === 'verdict' && <VerdictTab applicant={applicant} pis={pis} />}
                        </>
                    ) : (
                        <ApplicationLogTab applicant={applicant} />
                    )}
                </main>

                <footer className="px-6 py-3 border-t border-surface-200 bg-white flex items-center justify-between shrink-0">
                    <p className="text-[9.5px] font-bold text-surface-400 tracking-widest uppercase">RECRUITMS V1.0</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPis}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                        >
                            <Download size={12} /> Export PIS
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider border border-surface-300 rounded-md hover:bg-surface-50 text-surface-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};
