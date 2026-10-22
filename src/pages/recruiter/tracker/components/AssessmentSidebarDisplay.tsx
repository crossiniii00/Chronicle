import React from 'react';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { ListChecks, Briefcase, Pencil } from 'lucide-react';

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

function EditableFieldUI({
    label,
    value,
    isEditing,
    isEditable = true,
    onDoubleClick,
    onCommit,
    onCancel,
    mono = false,
    className = "",
    forceEditing = false
}: {
    label: string;
    value: string;
    isEditing: boolean;
    isEditable?: boolean;
    onDoubleClick: () => void;
    onCommit: (val: string) => void;
    onCancel: () => void;
    mono?: boolean;
    className?: string;
    forceEditing?: boolean;
}) {
    const isActuallyEditing = isEditing || forceEditing;
    const [localVal, setLocalVal] = React.useState(value === '—' ? '' : value);

    React.useEffect(() => {
        setLocalVal(value === '—' ? '' : value);
    }, [value]);

    return (
        <div
            className={cn("flex flex-col py-2 px-3 bg-white dark:bg-slate-900 transition-colors group relative", className, isEditable && !forceEditing && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800')}
            onDoubleClick={isEditable && !forceEditing ? onDoubleClick : undefined}
            title={isEditable && !forceEditing ? "Double-click to edit" : undefined}
        >
            <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            {isActuallyEditing ? (
                <div className="mt-1 -mx-2 -mb-1">
                    <input
                        type="text"
                        autoFocus={!forceEditing}
                        value={localVal}
                        onChange={(e) => setLocalVal(e.target.value)}
                        onBlur={() => onCommit(localVal)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                                setLocalVal(value === '—' ? '' : value);
                                onCancel();
                            }
                        }}
                        className={cn(
                            "w-full px-2 py-1 text-sm outline-none rounded-sm transition-colors",
                            forceEditing
                                ? "bg-primary-50/50 border border-primary-300 ring-0 focus:bg-white dark:bg-slate-900 focus:border-primary-500 shadow-inner text-primary-900"
                                : "bg-white dark:bg-slate-900 border border-[#0078d4] ring-1 ring-[#0078d4]"
                        )}
                        placeholder={`Enter ${label}...`}
                    />
                </div>
            ) : (
                <p className={cn(
                    'text-[12.5px] mt-1 break-words',
                    !value || value === '—' ? 'text-slate-400 italic' : 'text-slate-900 dark:text-white font-semibold',
                    mono && 'font-mono text-[11.5px]'
                )}>
                    {value || '—'}
                </p>
            )}
        </div>
    );
}

export function FieldGrid({
    items,
    cols = 3,
    editingField = null,
    isEditable = true,
    applicantId = '',
    onEditStart,
    onEditCommit,
    onEditCancel,
    forceEditing = false
}: {
    items: { label: string; value?: string | number; fieldId?: string; mono?: boolean }[];
    cols?: 2 | 3 | 4;
    editingField?: string | null;
    isEditable?: boolean;
    applicantId?: string;
    onEditStart?: (fieldId: string) => void;
    onEditCommit?: (fieldId: string, val: string) => void;
    onEditCancel?: () => void;
    forceEditing?: boolean;
}) {
    const colsClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
    return (
        <div className={cn('grid gap-px bg-surface-200 border border-surface-200 rounded-lg overflow-hidden', colsClass)}>
            {items.map((it, i) => (
                <EditableFieldUI
                    key={i}
                    label={it.label}
                    value={String(it.value ?? '—')}
                    isEditing={editingField === `${applicantId}:${it.fieldId || ''}`}
                    isEditable={isEditable}
                    forceEditing={forceEditing}
                    onDoubleClick={() => onEditStart?.(it.fieldId || '')}
                    onCommit={(val) => onEditCommit?.(it.fieldId || '', val)}
                    onCancel={onEditCancel || (() => { })}
                    mono={it.mono}
                    className="border-none rounded-none"
                />
            ))}
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
        slate: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50',
    };
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className={cn('p-2 rounded-md', accentColors[accent])}>
                    <Icon size={16} />
                </div>
                <div>
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{subtitle}</p>}
                </div>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}

interface AssessmentSidebarDisplayProps {
    applicant: Application;
    editingField?: string | null;
    setEditingField?: (fieldId: string | null) => void;
    handleInputChange?: (appId: string, qId: string, value: string) => void;
    localChanges?: Record<string, string>;
}

export function AssessmentSidebarDisplay({
    applicant,
    editingField,
    setEditingField,
    handleInputChange,
    localChanges = {}
}: AssessmentSidebarDisplayProps) {
    const metadata = typeof applicant.metadata === 'string'
        ? (() => { try { return JSON.parse(applicant.metadata); } catch { return {}; } })()
        : (applicant.metadata || {});

    // Combine base metadata with any local edits
    const checklist: Record<string, boolean> = {
        ...((metadata.checklist as Record<string, boolean>) || {})
    };
    const ratings: Record<string, any> = {
        ...((metadata.ratings as Record<string, any>) || {})
    };

    // Override with local changes
    Object.entries(localChanges).forEach(([k, v]) => {
        if (k.startsWith('metadata_checklist_')) {
            checklist[k.replace('metadata_checklist_', '')] = v === 'true';
        } else if (k.startsWith('metadata_ratings_')) {
            ratings[k.replace('metadata_ratings_', '')] = v;
        }
    });

    const getValue = (key: string, metaKey: string, fallback?: string | null) => {
        if (localChanges[`metadata_${metaKey}`] !== undefined) {
            return localChanges[`metadata_${metaKey}`] || '';
        }
        return metadata[metaKey] || fallback || '';
    };

    const background = {
        bpoChat: getValue('bpoChat', 'bpo_experience_chat'),
        bpoVoice: getValue('bpoVoice', 'bpo_experience_voice'),
        nonBpo: getValue('nonBpo', 'non_bpo_experience'),
        shiftingIssues: getValue('shiftingIssues', 'issues_shifting_schedules'),
        education: getValue('education', 'highest_education', applicant.pis?.highest_education),
        shsStrand: getValue('shsStrand', 'shs_strand'),
        pursueStudies: getValue('pursueStudies', 'plans_to_pursue_studies', applicant.pis?.plans_to_pursue_studies),
        goAbroad: getValue('goAbroad', 'plans_to_go_abroad', applicant.pis?.plans_to_go_abroad),
        transportMode: getValue('transportMode', 'mode_of_transportation', applicant.pis?.travel_method),
        medicalIssues: getValue('medicalIssues', 'medical_issues', applicant.pis?.medical_history_notes),
        startAvailability: getValue('startAvailability', 'availability_to_start'),
        salaryExpectation: getValue('salaryExpectation', 'salary_expectations'),
        candidateSource: getValue('candidateSource', 'candidate_source'),
        dateOfBirth: getValue('dateOfBirth', 'date_of_birth', applicant.pis?.date_of_birth || applicant.pis?.dob),
        contactNumber: getValue('contactNumber', 'contact_number', applicant.pis?.contact_number),
        emailAddress: getValue('emailAddress', 'email_address', applicant.pis?.email_address || applicant.applicant_email),
    };

    const onEditStart = (fieldId: string) => {
        if (setEditingField) setEditingField(`${applicant.id}:${fieldId}`);
    };

    const onEditCommit = (fieldId: string, val: string) => {
        if (handleInputChange) handleInputChange(applicant.id, fieldId, val);
        if (setEditingField) setEditingField(null);
    };

    const onEditCancel = () => {
        if (setEditingField) setEditingField(null);
    };

    const toggleChecklist = (k: string) => {
        const isChecked = !!checklist[k];
        if (handleInputChange) {
            handleInputChange(applicant.id, `metadata_checklist_${k}`, isChecked ? 'false' : 'true');
        }
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
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
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
                                onClick={() => toggleChecklist(k)}
                                className={cn(
                                    'flex items-start gap-2 text-[11px] py-0.5 select-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 -ml-1 pl-1 rounded-sm transition-colors',
                                    isChecked ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'
                                )}
                            >
                                <span className={cn(
                                    'mt-0.5 inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border shrink-0 transition-colors',
                                    isChecked
                                        ? cat === 'c' ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : cat === 'b' ? 'bg-amber-500 border-amber-500 text-white'
                                                : 'bg-rose-500 border-rose-500 text-white'
                                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm space-y-3">
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>{section.title}</span>
                    {!anyChecked && <span className="text-[9px] text-slate-400 font-bold">No flags</span>}
                </h4>
                {renderCategory(section.categoryC, 'c', section.prefix, { label: 'Category C', chip: 'text-emerald-800 bg-emerald-50 border-emerald-100' })}
                <div className="pt-2 border-t border-dashed border-slate-100">
                    {renderCategory(section.categoryB, 'b', section.prefix, { label: 'Category B', chip: 'text-amber-800 bg-amber-50 border-amber-100' })}
                </div>
                <div className="pt-2 border-t border-dashed border-slate-100">
                    {renderCategory(section.categoryA, 'a', section.prefix, { label: 'Category A', chip: 'text-rose-800 bg-rose-50 border-rose-100' })}
                </div>
            </div>
        );
    };

    const personalRating = Number(ratings.personalRating) || 0;
    const isEditingRating = editingField === `${applicant.id}:metadata_ratings_personalRating`;

    return (
        <div className="w-[380px] shrink-0 space-y-6 h-fit">
            {/* Interviewer's Assessment */}
            <SectionCard icon={ListChecks} title="Interviewer's Assessment" accent="amber" subtitle="Ratings, rubrics, and background evaluation">
                <div className="space-y-3 mb-5 pb-5 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <div
                        className={cn(
                            "group flex items-center gap-4 relative p-2 -mx-2 rounded-lg border border-transparent transition-colors",
                            !!handleInputChange ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:border-slate-200 dark:border-slate-800" : ""
                        )}
                        onDoubleClick={() => { if (handleInputChange) onEditStart('metadata_ratings_personalRating'); }}
                        title={!!handleInputChange ? "Double-click to edit rating" : undefined}
                    >
                        <div className="flex-1">
                            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Personal Rating</p>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(0, Math.min(100, personalRating * 10))}%` }}
                                />
                            </div>
                        </div>
                        {isEditingRating ? (
                            <div className="w-16">
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    autoFocus
                                    defaultValue={ratings.personalRating || ''}
                                    onBlur={(e) => onEditCommit('metadata_ratings_personalRating', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                        } else if (e.key === 'Escape') {
                                            onEditCancel();
                                        }
                                    }}
                                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 text-sm outline-none border border-[#0078d4] ring-1 ring-[#0078d4] rounded-sm text-center font-bold"
                                />
                            </div>
                        ) : (
                            <p className="text-[24px] font-extrabold text-amber-600 leading-none">
                                {personalRating || '—'}<span className="text-[11px] text-slate-400 font-bold"> / 10</span>
                            </p>
                        )}
                    </div>
                    <FieldGrid
                        cols={2}
                        isEditable={!!handleInputChange}
                        editingField={editingField || null}
                        applicantId={applicant.id}
                        onEditStart={onEditStart}
                        onEditCommit={onEditCommit}
                        onEditCancel={onEditCancel}
                        items={[
                            { label: 'Work Habits / Attitude', value: ratings.workHabits || '', fieldId: 'metadata_ratings_workHabits' },
                            { label: 'Communication Skills', value: ratings.communicationSkills || '', fieldId: 'metadata_ratings_communicationSkills' },
                            { label: 'Empathy', value: ratings.empathy || '', fieldId: 'metadata_ratings_empathy' },
                            { label: 'Confidence', value: ratings.confidence || '', fieldId: 'metadata_ratings_confidence' },
                            { label: 'Language Classification', value: ratings.languageClassification || '', fieldId: 'metadata_ratings_languageClassification' },
                            { label: 'Candidate Source', value: background.candidateSource || '', fieldId: 'metadata_candidate_source' },
                            { label: 'Date of Birth', value: background.dateOfBirth || '', fieldId: 'metadata_date_of_birth' },
                            { label: 'Contact Number', value: background.contactNumber || '', fieldId: 'metadata_contact_number' },
                            { label: 'Email Address', value: background.emailAddress || '', fieldId: 'metadata_email_address' },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {RUBRIC_CRITERIA.map(section => (
                        <div key={section.prefix}>{renderRubric(section)}</div>
                    ))}
                </div>
            </SectionCard>

            {/* Background & Experience */}
            <SectionCard icon={Briefcase} title="Background & Experience" accent="sky" subtitle="Candidate background captured during interview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <EditableFieldUI label="BPO Experience (Chat)" value={background.bpoChat} isEditing={editingField === `${applicant.id}:metadata_bpo_experience_chat`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_bpo_experience_chat')} onCommit={(val) => onEditCommit('metadata_bpo_experience_chat', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="BPO Experience (Voice)" value={background.bpoVoice} isEditing={editingField === `${applicant.id}:metadata_bpo_experience_voice`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_bpo_experience_voice')} onCommit={(val) => onEditCommit('metadata_bpo_experience_voice', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Non-BPO Experience" value={background.nonBpo} isEditing={editingField === `${applicant.id}:metadata_non_bpo_experience`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_non_bpo_experience')} onCommit={(val) => onEditCommit('metadata_non_bpo_experience', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Shifting Schedules" value={background.shiftingIssues} isEditing={editingField === `${applicant.id}:metadata_issues_shifting_schedules`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_issues_shifting_schedules')} onCommit={(val) => onEditCommit('metadata_issues_shifting_schedules', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Highest Education" value={background.education} isEditing={editingField === `${applicant.id}:metadata_highest_education`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_highest_education')} onCommit={(val) => onEditCommit('metadata_highest_education', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="SHS Strand" value={background.shsStrand} isEditing={editingField === `${applicant.id}:metadata_shs_strand`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_shs_strand')} onCommit={(val) => onEditCommit('metadata_shs_strand', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Plans to Pursue Studies" value={background.pursueStudies} isEditing={editingField === `${applicant.id}:metadata_plans_to_pursue_studies`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_plans_to_pursue_studies')} onCommit={(val) => onEditCommit('metadata_plans_to_pursue_studies', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Plans to Go Abroad" value={background.goAbroad} isEditing={editingField === `${applicant.id}:metadata_plans_to_go_abroad`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_plans_to_go_abroad')} onCommit={(val) => onEditCommit('metadata_plans_to_go_abroad', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Mode of Transportation" value={background.transportMode} isEditing={editingField === `${applicant.id}:metadata_mode_of_transportation`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_mode_of_transportation')} onCommit={(val) => onEditCommit('metadata_mode_of_transportation', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Medical Issues" value={background.medicalIssues} isEditing={editingField === `${applicant.id}:metadata_medical_issues`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_medical_issues')} onCommit={(val) => onEditCommit('metadata_medical_issues', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Availability to Start" value={background.startAvailability} isEditing={editingField === `${applicant.id}:metadata_availability_to_start`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_availability_to_start')} onCommit={(val) => onEditCommit('metadata_availability_to_start', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                    <EditableFieldUI label="Salary Expectations" value={background.salaryExpectation} isEditing={editingField === `${applicant.id}:metadata_salary_expectations`} isEditable={!!handleInputChange} onDoubleClick={() => onEditStart('metadata_salary_expectations')} onCommit={(val) => onEditCommit('metadata_salary_expectations', val)} onCancel={onEditCancel} className="border-slate-200 dark:border-slate-800" />
                </div>
            </SectionCard>
        </div>
    );
}
