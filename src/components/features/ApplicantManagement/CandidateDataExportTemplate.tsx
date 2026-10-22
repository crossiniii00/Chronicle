import React, { forwardRef, useState, useEffect } from 'react';
import type { Application, PersonalInfoSheet } from '@/types/application';
import { QuestionService, InterviewQuestion } from '@/services/QuestionService';
import { PISExportContent } from './PISExportTemplate';
import { extractRemarks } from './utils/evaluationHelpers';

interface CandidateDataExportTemplateProps {
    application: Application;
}

// Reusable styling components
const F = ({ label, value, flex, width, noFlex }: any) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '8px', gap: '6px', flex: noFlex ? undefined : (flex || '1'), width }}>
        <span style={{ whiteSpace: 'nowrap', fontSize: '11px', fontWeight: '500', color: '#444', flexShrink: 0, lineHeight: '16px' }}>{label}</span>
        <div style={{ flex: 1, borderBottom: '1px solid #ccc', minHeight: '14px', paddingLeft: '4px', paddingBottom: '2px', fontSize: '11px', fontWeight: '600', color: '#111', lineHeight: '14px' }}>
            {value === true ? 'YES' : value === false ? 'NO' : value ?? ''}
        </div>
    </div>
);

const SectionHeader = ({ title }: { title: string }) => (
    <div style={{ 
        fontWeight: '900', 
        fontSize: '11px',
        backgroundColor: '#002D5C', 
        color: '#ffffff',
        padding: '7px 12px',
        marginBottom: '16px', 
        marginTop: '24px',
        letterSpacing: '0.06em',
        borderRadius: '4px',
        textTransform: 'uppercase',
        borderLeft: '4px solid #C8102E',
        boxShadow: '0 1px 3px rgba(0, 45, 92, 0.12)',
        pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakAfter: 'avoid', breakAfter: 'avoid'
    }}>
        {title}
    </div>
);

// Parse checklist rubric string into structured executive badges, ratings, and clean remarks
const parseChecklistRubric = (rawText: string) => {
    if (!rawText) return { cleanRemarks: '', checkedItems: [], personalRating: null, attitudeRating: null };
    
    const remarksMatch = rawText.match(/(?:Remarks|Comments|Feedback|Notes):?\s*\n*([\s\S]*)$/i);
    let cleanRemarks = remarksMatch ? remarksMatch[1].trim() : '';

    cleanRemarks = cleanRemarks
        .replace(/=========================================\s*\n?/g, '')
        .replace(/INTERVIEWER ASSESSMENT RUBRIC/g, '')
        .replace(/APPLICANT BACKGROUND & EXP/g, '')
        .replace(/RATINGS & CLASSIFICATIONS/g, '')
        .trim();

    const checkedItems: { section: string; value: string }[] = [];
    const lines = rawText.split('\n');
    let currentSection = 'Assessment';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.endsWith(':') && !trimmed.includes('[x]') && !trimmed.includes('=================')) {
            currentSection = trimmed.replace(':', '');
        } else if (trimmed.includes('[x]') || trimmed.includes('[X]')) {
            const itemVal = trimmed.replace(/\[x\]/gi, '').replace(/\[Category \w\]/gi, '').trim();
            if (itemVal) {
                checkedItems.push({ section: currentSection, value: itemVal });
            }
        }
    });

    const ratingMatch = rawText.match(/Personal Rating:?\s*(\d+(?:\/\d+)?)/i);
    const attitudeMatch = rawText.match(/Work Habits\/Attitude:?\s*(\d+(?:\/\d+)?)/i);

    return {
        cleanRemarks,
        checkedItems,
        personalRating: ratingMatch ? ratingMatch[1] : null,
        attitudeRating: attitudeMatch ? attitudeMatch[1] : null,
    };
};

export const CandidateDataExportTemplate = forwardRef<HTMLDivElement, CandidateDataExportTemplateProps>(({ application }, ref) => {
    const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});

    useEffect(() => {
        QuestionService.getAll().then(qs => {
            if (qs) {
                const qMap: Record<string, string> = {};
                qs.forEach(q => { qMap[q.id] = q.question_text; });
                setQuestionsMap(qMap);
            }
        }).catch(console.error);
    }, []);

    const pis = (application.pis || {}) as PersonalInfoSheet;
    const metadata = application.metadata || {};
    const responses = (application.interview_responses as Record<string, string>) || {};
    const assessments = (application.assessment_results as any[]) || [];
    const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;

    const s: Record<string, React.CSSProperties> = {
        page: {
            width: '850px',
            minHeight: '1100px',
            backgroundColor: '#ffffff',
            padding: '40px 60px 80px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            color: '#222',
            position: 'relative',
            boxSizing: 'border-box',
        },
        topBar: { position: 'absolute', top: 0, left: 0, width: '100%', height: '24px', display: 'flex' },
        botBar: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '24px', display: 'flex' },
        blue: { flex: 1, backgroundColor: '#002D5C' },
        red: { width: '30%', backgroundColor: '#C8102E' },
        logo: { height: '60px' },
        headerGroup: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', marginTop: '10px' },
        brandName: { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '24px', fontWeight: '900', lineHeight: '1', color: '#002D5C', letterSpacing: '-0.01em' },
        brandSub: { fontSize: '24px', color: '#C8102E', fontWeight: '900' },
        documentTitle: { fontSize: '18px', fontWeight: '800', color: '#333', textAlign: 'right', marginTop: '8px', textTransform: 'uppercase' },
        row: { display: 'flex', gap: '24px', marginBottom: '8px', alignItems: 'flex-end' },
        qaBox: { backgroundColor: '#f8f9fa', borderLeft: '4px solid #002D5C', padding: '12px', marginBottom: '12px', borderRadius: '0 4px 4px 0' },
        qText: { fontSize: '11px', fontWeight: '700', color: '#333', marginBottom: '6px' },
        aText: { fontSize: '11px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.4' },
        badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white' }
    };

    const getStatusColor = (status: string) => {
        const s = String(status || '').toUpperCase();
        if (s.includes('PASS') || s.includes('HIRE') || s.includes('ACCEPT')) return '#10b981';
        if (s.includes('FAIL') || s.includes('REJECT') || s.includes('NO SHOW')) return '#ef4444';
        return '#3b82f6';
    };

    return (
        <div ref={ref} style={s.page}>
            <div style={s.topBar}><div style={s.blue} /><div style={s.red} /></div>

            <div style={{ transform: 'scale(1)', marginBottom: '40px' }}>
                <PISExportContent application={application} pis={pis} s={s} />
            </div>

            {/* 2. INITIAL INTERVIEW */}
            <SectionHeader title="2. Initial Interview Results" />
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Initial Verdict:</span>
                    <span style={{ ...s.badge, backgroundColor: getStatusColor(application.initial_verdict || (application as any).current_status), padding: '4px 12px', fontSize: '10.5px', textTransform: 'uppercase' }}>
                        {application.initial_verdict || (application as any).current_status || 'PENDING'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interviewer:</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>{application.interviewer_name || metadata.interviewer_name || application.assigned_recruiter_name || 'N/A'}</span>
                </div>
            </div>
            
            <div style={{ marginTop: '16px', fontWeight: '900', fontSize: '10px', marginBottom: '12px', color: '#002D5C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '4px', height: '12px', backgroundColor: '#C8102E', display: 'inline-block', borderRadius: '1px' }}></span>
                Interview Q&A Responses
            </div>
            {Object.keys(responses).length > 0 ? (
                Object.entries(responses)
                    .filter(([qId]) => qId !== 'checklist')
                    .map(([qId, ans], idx) => {
                        const questionNote = (metadata.question_notes || {})[qId];
                        const displayQ = questionsMap[qId] || qId;
                        return (
                            <div key={idx} style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                marginBottom: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                overflow: 'hidden'
                            }}>
                                {/* Question Bar */}
                                <div style={{
                                    backgroundColor: '#f1f5f9',
                                    borderBottom: '1px solid #cbd5e1',
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px'
                                }}>
                                    <span style={{
                                        backgroundColor: '#002D5C',
                                        color: '#ffffff',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        padding: '2.5px 7px',
                                        borderRadius: '3px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        flexShrink: 0
                                    }}>
                                        Q{idx + 1}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        color: '#0f172a',
                                        lineHeight: '1.45',
                                        flex: 1
                                    }}>
                                        {displayQ}
                                    </span>
                                </div>

                                {/* Answer Area */}
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: '#f8fafc',
                                    borderLeft: '4px solid #002D5C'
                                }}>
                                    <div style={{
                                        fontSize: '8.5px',
                                        fontWeight: '900',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginBottom: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span style={{ color: '#002D5C', fontSize: '10px' }}>■</span> CANDIDATE RESPONSE
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        lineHeight: '1.55',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {ans || '-'}
                                    </div>
                                    {questionNote && (
                                        <div style={{
                                            marginTop: '8px',
                                            paddingTop: '6px',
                                            borderTop: '1px dashed #cbd5e1',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            fontStyle: 'italic',
                                            color: '#475569'
                                        }}>
                                            Note: {questionNote}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
            ) : (
                <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '11px', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    No recorded interview responses.
                </div>
            )}

            {responses['checklist'] && (() => {
                const rawText = responses['checklist'];
                const parsed = parseChecklistRubric(rawText);

                return (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{
                            fontWeight: '900', 
                            fontSize: '10px', 
                            color: '#002D5C', 
                            marginBottom: '12px',
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{ width: '4px', height: '12px', backgroundColor: '#C8102E', display: 'inline-block', borderRadius: '1px' }}></span>
                            Interviewer Assessment Rubric & Feedback
                        </div>
                        
                        {/* Rating Badges Header */}
                        {(parsed.personalRating || parsed.attitudeRating) && (
                            <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                                {parsed.personalRating && (
                                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#166534', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>Personal Rating: </span>
                                        <span style={{ color: '#15803d', fontWeight: '900', fontSize: '12px' }}>{parsed.personalRating}</span>
                                    </div>
                                )}
                                {parsed.attitudeRating && (
                                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#1e40af', fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>Work Habits / Attitude: </span>
                                        <span style={{ color: '#1d4ed8', fontWeight: '900', fontSize: '12px' }}>{parsed.attitudeRating}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Checked Rubric Items Structured Grid */}
                        {parsed.checkedItems.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                {parsed.checkedItems.map((item, idx) => (
                                    <div key={idx} style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '4px',
                                        padding: '6px 10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                    }}>
                                        <span style={{ color: '#002D5C', fontWeight: '900', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {item.section}
                                        </span>
                                        <span style={{ color: '#1e293b', fontWeight: '700', fontSize: '10.5px', lineHeight: '1.3' }}>
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Clean Handwritten Remarks */}
                        {parsed.cleanRemarks ? (
                            <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', borderLeft: '4px solid #002D5C', fontSize: '11px', color: '#0f172a', lineHeight: '1.55' }}>
                                <div style={{ fontSize: '8.5px', fontWeight: '900', color: '#002D5C', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.06em' }}>
                                    ■ INTERVIEWER REMARKS
                                </div>
                                {parsed.cleanRemarks}
                            </div>
                        ) : null}
                    </div>
                );
            })()}


            {/* 3. PROFICIENCY ASSESSMENT */}
            <SectionHeader title="3. Proficiency & Assessment Results" />
            
            {/* TYPING TEST STAT GRID */}
            <div style={{ marginTop: '12px', fontWeight: '900', fontSize: '10px', marginBottom: '8px', color: '#002D5C', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '4px', height: '12px', backgroundColor: '#C8102E', display: 'inline-block', borderRadius: '1px' }}></span>
                Typing Test Performance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Speed (WPM)</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#002D5C', marginTop: '2px' }}>{application.typing_test_wpm || latestAssessment?.wpm || 'N/A'}</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Accuracy</div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#166534', marginTop: '2px' }}>
                        {application.typing_test_accuracy ? `${application.typing_test_accuracy}%` : latestAssessment?.accuracy ? `${latestAssessment.accuracy}%` : 'N/A'}
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#334155', marginTop: '2px' }}>{application.typing_test_duration_seconds ? `${application.typing_test_duration_seconds}s` : 'N/A'}</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '3px', textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date Taken</div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', marginTop: '4px' }}>
                        {application.typing_test_completed_at ? new Date(application.typing_test_completed_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                    </div>
                </div>
            </div>

            {/* LANGUAGE ASSESSMENT */}
            {(() => {
                const getAssessmentTypeLabel = (type?: string) => {
                    if (!type) return 'Speech X (CEFR)';
                    const t = type.toLowerCase();
                    if (t.includes('speech')) return 'Speech X (CEFR)';
                    if (t.includes('leadership')) return 'Leadership Assessment';
                    if (t.includes('personality')) return 'Personality Map';
                    if (t.includes('critical')) return 'Critical Thinking Assessment';
                    if (t.includes('berlitz')) return 'Berlitz English Assessment';
                    if (t.includes('versant')) return 'Versant English Assessment';
                    if (t.includes('efset') || t.includes('ef set')) return 'EF SET Assessment';
                    if (t.includes('harver')) return 'Harver Assessment';
                    return type;
                };

                const rawAssessmentType = 
                    metadata?.last_assessment_type ||
                    (application as any)?.assessment_type ||
                    (application as any)?.assessment_name ||
                    latestAssessment?.assessment_type ||
                    latestAssessment?.type ||
                    latestAssessment?.provider ||
                    metadata?.assessment_type ||
                    metadata?.assessment_name ||
                    (pis as any)?.assessment_type ||
                    '';

                const resolvedAssessmentType = getAssessmentTypeLabel(rawAssessmentType);

                return (
                    <>
                        <SectionHeader title="3. Language & Assessment Scores" />
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '2px', border: '1px solid #94a3b8', alignItems: 'center', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assessment Type:</span>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: '#002D5C', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '2px' }}>
                                    {resolvedAssessmentType}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</span>
                                <span style={{ ...s.badge, backgroundColor: getStatusColor(application.assessment_status || (application.assessment_score ? 'PASSED' : 'NOT TAKEN')), padding: '3px 10px', fontSize: '10px', textTransform: 'uppercase', borderRadius: '2px' }}>
                                    {application.assessment_status || (application.assessment_score ? 'COMPLETED' : 'NOT TAKEN')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <span style={{ fontSize: '9px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Score / CEFR:</span>
                                <span style={{ fontSize: '12px', fontWeight: '900', color: '#002D5C', backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', padding: '3px 10px', borderRadius: '2px' }}>
                                    {pis.cefr_level || pis.cefr || application.assessment_score || 'C1 Advanced'}
                                </span>
                            </div>
                        </div>
                    </>
                );
            })()}
            {latestAssessment && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '2px', border: '1px solid #94a3b8', marginBottom: '16px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grammar</span>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{latestAssessment.grammarScore || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Listening</span>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{latestAssessment.listeningScore || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '6px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spoken</span>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{latestAssessment.spokenScore || 'N/A'}</div>
                    </div>
                    <div style={{ padding: '6px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reading</span>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{latestAssessment.readingScore || 'N/A'}</div>
                    </div>
                </div>
            )}


            {/* 4. OPERATIONS VALIDATOR EVALUATIONS */}
            <SectionHeader title="4. Operations Validator & Account Evaluations" />
            {(() => {
                const reprofileHistory: any[] = pis?.reprofile_history || metadata?.reprofile_history || [];
                const historicalSessions = reprofileHistory
                    .filter((h: any) => h.previous_account || h.account || h.department)
                    .map((h: any, idx: number) => ({
                        id: `hist-${idx}`,
                        account: h.previous_account || h.account || h.department || 'Previous Account',
                        validatorName: h.previous_ops_validator_name || h.ops_validator_name || 'Previous Validator',
                        status: String(h.previous_ops_validator_status || h.status || 'REPROFILED').toUpperCase(),
                        remarks: extractRemarks(h.previous_ops_validator_notes || h.notes || h.remarks || ''),
                        date: h.changed_at ? new Date(h.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Previous Session',
                        isCurrent: false
                    }));

                const activeValidator = application.assigned_ops_validator_name || metadata.ops_validator_name || metadata.active_ops_validator_name || (pis as any)?.ops_validator_name || 'Assigned Validator';
                const activeStatus = String(pis?.ops_validator_status || metadata.ops_validator_status || metadata.final_interview_result || 'PASSED').toUpperCase();
                
                const activeRemarks = (() => {
                    const opsRemarks = 
                        pis?.ops_validator_notes?.trim() ||
                        pis?.ops_validation_remarks?.trim() ||
                        (pis as any)?.ops_val_notes?.trim() ||
                        metadata?.ops_validator_notes?.trim() ||
                        metadata?.ops_validation_remarks?.trim() ||
                        (application as any)?.ops_validator_notes?.trim() ||
                        (responses?.['pis_ops_validator_notes'] ? String(responses['pis_ops_validator_notes']).trim() : '') ||
                        (responses?.['ops_validator_notes'] ? String(responses['ops_validator_notes']).trim() : '') ||
                        '';
                    return extractRemarks(opsRemarks) || 'No active validation remarks recorded.';
                })();

                const currentAccountName = application.department || (pis as any)?.final_account || metadata.final_account || 'Current Target Account';

                const allSessionsToRender = [
                    {
                        id: 'current',
                        account: currentAccountName,
                        validatorName: activeValidator,
                        status: activeStatus,
                        remarks: activeRemarks,
                        date: 'Active Account Session',
                        isCurrent: true
                    },
                    ...historicalSessions
                ];

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                        {allSessionsToRender.map((session) => (
                            <div key={session.id} style={{ backgroundColor: session.isCurrent ? '#ffffff' : '#f8fafc', border: session.isCurrent ? '1px solid #94a3b8' : '1px solid #e2e8f0', borderRadius: '2px', padding: '12px 14px', borderLeft: session.isCurrent ? '4px solid #002D5C' : '4px solid #94a3b8', boxShadow: session.isCurrent ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#002D5C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {session.account} {session.isCurrent ? '(ACTIVE TARGET ACCOUNT)' : '(PREVIOUS REPROFILED EVALUATION)'}
                                    </div>
                                    <span style={{ ...s.badge, backgroundColor: getStatusColor(session.status), padding: '3px 8px', fontSize: '9px', textTransform: 'uppercase', borderRadius: '2px' }}>
                                        {session.status}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '10px' }}>
                                    <div>
                                        <span style={{ fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluator: </span>
                                        <span style={{ fontWeight: '900', color: '#0f172a' }}>{session.validatorName}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session: </span>
                                        <span style={{ fontWeight: '800', color: '#475569' }}>{session.date}</span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                        Validator Remarks
                                    </div>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '2px', border: '1px solid #cbd5e1' }}>
                                        {session.remarks || 'No remarks recorded for this evaluation session.'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}


            {/* 5. APPLICATION HISTORY & AUDIT LOGS */}
            {(() => {
                const historyEvents: Array<{
                    id: string;
                    category: string;
                    title: string;
                    account?: string;
                    status: string;
                    statusType: 'success' | 'warning' | 'danger' | 'info' | 'slate';
                    date: string;
                    actorName?: string;
                    notes?: string;
                }> = [];

                const appMeta = metadata || {};
                const appPis = pis || {};

                // 1. Reprofile History
                const reprofileList = appMeta.reprofile_history || (appPis as any).reprofile_history || (appPis as any).reprofile_accounts || [];
                const failedAccountsList: string[] = Array.from(new Set([
                    ...(appMeta.failed_accounts || []),
                    ...((appPis as any).failed_accounts || []),
                    ...((application as any).failed_accounts || [])
                ].filter(Boolean)));

                const currentFinalAccount = application.department || (appPis as any).final_account || appMeta.final_account || '';

                if (Array.isArray(reprofileList) && reprofileList.length > 0) {
                    reprofileList.forEach((entry: any, index: number) => {
                        const acc = entry.previous_account || entry.account || 'Previous Account';
                        const statusStr = String(entry.previous_ops_validator_status || entry.status || 'REPROFILED').toUpperCase();
                        const isPassed = statusStr.includes('PASS');
                        const isFailed = statusStr.includes('FAIL');

                        historyEvents.push({
                            id: `reprofile-${index}`,
                            category: 'REPROFILE',
                            title: `Reprofiled from ${acc}`,
                            account: acc,
                            status: isPassed ? 'Reprofiled (Passed)' : isFailed ? 'Reprofiled (Failed)' : 'Reprofiled',
                            statusType: isPassed ? 'info' : isFailed ? 'warning' : 'slate',
                            date: entry.changed_at || entry.date || application.updated_at,
                            actorName: entry.previous_ops_validator_name || application.assigned_ops_validator_name || 'Ops Validator',
                            notes: entry.previous_ops_validator_notes || entry.notes || `Candidate was reprofiled from ${acc} to ${currentFinalAccount || 'new account'}.`
                        });
                    });
                } else if (failedAccountsList.length > 0) {
                    failedAccountsList.forEach((acc, index) => {
                        historyEvents.push({
                            id: `reprofile-failed-${index}`,
                            category: 'REPROFILE',
                            title: `Reprofiled from ${acc}`,
                            account: acc,
                            status: 'Reprofiled (Failed)',
                            statusType: 'warning',
                            date: application.updated_at,
                            actorName: application.assigned_ops_validator_name || 'Ops Validator',
                            notes: (appPis as any).ops_validator_notes || application.final_interview_notes || `Evaluated for ${acc} (Did not pass). Reprofiled to ${currentFinalAccount || 'new account'}.`
                        });
                    });
                }

                // 2. Initial Screening & Application Submission Event
                historyEvents.push({
                    id: 'app-submitted',
                    category: 'APPLICATION',
                    title: 'Application Created & Initial Screening',
                    status: 'Application Submitted',
                    statusType: 'info',
                    date: application.created_at || (application as any).applied_date || application.applied_at || application.updated_at,
                    actorName: application.assigned_recruiter_name || 'Recruitment Team',
                    notes: `Candidate applied for position: ${application.position_title || 'CSR'} (${application.department || 'General Pool'}).`
                });

                // 3. Blacklist Event (if applicable)
                const isBlacklisted = (application as any).is_blacklisted || application.current_status === 'NOT_ELIGIBLE_FOR_REHIRE' || appMeta.is_blacklisted || (appPis as any).is_blacklisted;
                if (isBlacklisted) {
                    historyEvents.push({
                        id: 'blacklist-event',
                        category: 'BLACKLIST',
                        title: 'Blacklist Record Added',
                        status: 'Ineligible for Rehire',
                        statusType: 'danger',
                        date: appMeta.blacklisted_at || application.updated_at,
                        actorName: appMeta.blacklisted_by || 'HR Compliance',
                        notes: appMeta.blacklist_reason || (appPis as any).blacklist_reason || 'Flagged as Ineligible for Rehire in system.'
                    });
                }

                // 4. No Show Event (if applicable)
                const isNoShow = ['NO_SHOW', 'NO SHOW'].includes(application.current_status || '');
                if (isNoShow) {
                    historyEvents.push({
                        id: 'noshow-event',
                        category: 'NO_SHOW',
                        title: 'No Show Event Recorded',
                        status: 'No Show',
                        statusType: 'warning',
                        date: application.updated_at,
                        actorName: application.assigned_ops_validator_name || 'Ops Validator',
                        notes: (appPis as any).ops_validator_notes || application.final_interview_notes || 'Candidate did not attend scheduled evaluation session.'
                    });
                }

                // Sort descending by date
                historyEvents.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

                const getStatusStyle = (type: string) => {
                    switch (type) {
                        case 'success': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
                        case 'danger': return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
                        case 'warning': return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
                        case 'info': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
                        default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                    }
                };

                return (
                    <div style={{ marginTop: '16px', pageBreakInside: 'avoid' }}>
                        <SectionHeader title="5. Application History & Timeline Logs" />
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #94a3b8', borderRadius: '2px', padding: '16px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {historyEvents.map((evt) => {
                                    const st = getStatusStyle(evt.statusType);
                                    const formattedDate = evt.date ? new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
                                    return (
                                        <div key={evt.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ width: '130px', flexShrink: 0 }}>
                                                <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{formattedDate}</div>
                                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{evt.actorName || 'System'}</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#002D5C' }}>{evt.title}</span>
                                                    <span style={{ fontSize: '9px', fontWeight: '900', color: st.text, backgroundColor: st.bg, border: `1px solid ${st.border}`, padding: '2px 6px', borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                        {evt.status}
                                                    </span>
                                                </div>
                                                {evt.notes && (
                                                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#334155', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '2px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                                                        {evt.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 6. CLIENT ASSESSMENT (IF EXISTS) */}
            {(metadata.client_assessment_status || metadata.client_assessment_score) && (
                <>
                    <SectionHeader title="6. Client Assessment" />
                    <div style={s.row}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontWeight: 'bold' }}>Status:</span>
                            <span style={{ ...s.badge, backgroundColor: getStatusColor(metadata.client_assessment_status) }}>
                                {metadata.client_assessment_status || 'N/A'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontWeight: 'bold' }}>Score / Details:</span>
                            <span>{metadata.client_assessment_score || metadata.client_assessment_remarks || 'N/A'}</span>
                        </div>
                    </div>
                </>
            )}


            {/* 6. CLIENT INTERVIEW (IF EXISTS) */}
            {(metadata.client_interview_status || metadata.client_interview_remarks) && (
                <>
                    <SectionHeader title="6. Client Interview" />
                    <div style={s.row}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontWeight: 'bold' }}>Status:</span>
                            <span style={{ ...s.badge, backgroundColor: getStatusColor(metadata.client_interview_status) }}>
                                {metadata.client_interview_status || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Client Remarks:</div>
                        <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px', minHeight: '40px', fontSize: '11px', lineHeight: '1.5' }}>
                            {metadata.client_interview_remarks || 'No remarks provided.'}
                        </div>
                    </div>
                </>
            )}

            {/* END OF DOCUMENT */}
            <div style={{ marginTop: '40px', textAlign: 'center', color: '#999', fontSize: '10px', fontStyle: 'italic', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                *** END OF CANDIDATE DATA REPORT ***
            </div>

            <div style={s.botBar}><div style={s.blue} /><div style={s.red} /></div>
        </div>
    );
});

CandidateDataExportTemplate.displayName = 'CandidateDataExportTemplate';
