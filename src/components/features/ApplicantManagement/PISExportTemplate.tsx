import React, { forwardRef } from 'react';
import type { Application, PersonalInfoSheet } from '@/types/application';

interface PISExportTemplateProps {
    application: Application;
}

// A formal document key-value grid cell component
export const DocCell = ({
    label, value, flex, width, labelWidth = '130px', isLastRow = false, isLastCol = false
}: {
    label: string;
    value?: string | number | boolean | null;
    flex?: string;
    width?: string;
    labelWidth?: string;
    isLastRow?: boolean;
    isLastCol?: boolean;
}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRight: isLastCol ? 'none' : '1px solid #cbd5e1',
        borderBottom: isLastRow ? 'none' : '1px solid #cbd5e1',
        flex: flex || '1',
        width,
        backgroundColor: '#ffffff',
        minHeight: '24px',
        boxSizing: 'border-box'
    }}>
        <div style={{
            width: labelWidth,
            minWidth: labelWidth,
            backgroundColor: '#f1f5f9',
            borderRight: '1px solid #cbd5e1',
            padding: '4px 8px',
            fontSize: '8px',
            fontWeight: '800',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            flexShrink: 0
        }}>
            {label}
        </div>
        <div style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '9.5px',
            fontWeight: '700',
            color: '#0f172a',
            wordBreak: 'break-word',
            display: 'flex',
            alignItems: 'center',
            minHeight: '24px',
            boxSizing: 'border-box'
        }}>
            {value === true ? 'YES' : value === false ? 'NO' : (value !== undefined && value !== null && value !== '' ? String(value) : '-')}
        </div>
    </div>
);

// Backward-compatible export F component
export const F = DocCell;

// Checkbox item (formal document square style)
export const Chk = ({ label, checked }: { label: string; checked: boolean }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '9.5px',
        padding: '4px 6px',
        backgroundColor: checked ? '#f0f9ff' : '#ffffff',
        border: checked ? '1px solid #002D5C' : '1px solid #e2e8f0',
        borderRadius: '3px'
    }}>
        <div style={{
            width: '12px',
            height: '12px',
            border: checked ? '1px solid #002D5C' : '1px solid #94a3b8',
            flexShrink: 0,
            backgroundColor: checked ? '#002D5C' : '#ffffff',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 'bold'
        }}>
            {checked ? '✓' : ''}
        </div>
        <span style={{
            color: checked ? '#0f172a' : '#475569',
            fontWeight: checked ? '700' : '500',
            lineHeight: '1.2'
        }}>
            {label}
        </span>
    </div>
);

export const PISExportContent = ({ application, pis, s }: { application: Application, pis: PersonalInfoSheet, s: any }) => {
    const hasCond = (c: string) => {
        const mc = pis.medical_conditions;
        if (Array.isArray(mc)) return mc.includes(c);
        if (typeof mc === 'string') {
            try { const p = JSON.parse(mc); return Array.isArray(p) && p.includes(c); } catch { return false; }
        }
        return false;
    };

    return (
        <div style={{ fontFamily: 'Inter, Arial, sans-serif', fontSize: '10px', color: '#0f172a' }}>
            {/* Header & Logo Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '3px solid #002D5C' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src="/contactpoint-logo.png?v=2" alt="ContactPoint 360" style={{ height: '54px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '22px', fontWeight: '900', lineHeight: '1', color: '#002D5C', letterSpacing: '-0.02em' }}>
                            CONTACT<br />
                            <span style={{ color: '#002D5C' }}>POINT</span>
                            <span style={{ color: '#C8102E', fontWeight: '900' }}>360</span>
                        </span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#002D5C', margin: '0 0 2px 0', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        CANDIDATE PROFILE
                    </h1>
                    <div style={{ fontSize: '9px', color: '#C8102E', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        CONFIDENTIAL DOCUMENT
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>
                        Ref ID: {application.id?.slice(0, 8) || 'N/A'} | Date: {new Date(application.applied_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* ── 1. PERSONAL INFORMATION ── */}
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={s.sectionTitle}>1. PERSONAL INFORMATION</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Full Name" value={pis.full_name || application.applicant_name} flex="1.5" labelWidth="110px" />
                        <DocCell label="Nickname / Alias" value={pis.nick_name || pis.middle_name} flex="1" labelWidth="110px" />
                        <DocCell label="Pref. Nickname" value={pis.preferred_nickname || ''} flex="1" labelWidth="105px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Present Address" value={pis.current_address} flex="1" labelWidth="110px" />
                        <DocCell label="Place of Birth" value={pis.place_of_birth} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Permanent Address" value={pis.permanent_address} flex="1" labelWidth="110px" />
                        <DocCell label="Nationality" value={pis.nationality} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Date of Birth" value={pis.birth_date} flex="1.2" labelWidth="110px" />
                        <DocCell label="Age" value={pis.age} flex="0.7" labelWidth="60px" />
                        <DocCell label="Sex" value={pis.sex} flex="0.7" labelWidth="60px" />
                        <DocCell label="Religion" value={pis.religion} flex="1" labelWidth="80px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Contact Number" value={pis.phone} flex="1" labelWidth="110px" />
                        <DocCell label="Email Address" value={pis.email} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="SSS No." value={pis.sss_no} flex="1" labelWidth="80px" />
                        <DocCell label="BIR TIN No." value={pis.tin_no} flex="1" labelWidth="90px" />
                        <DocCell label="PAG-IBIG No." value={pis.pagibig_no} flex="1" labelWidth="90px" />
                        <DocCell label="Philhealth No." value={pis.philhealth_no} flex="1" labelWidth="100px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Hiring Source" value={pis.hiring_source} flex="1" labelWidth="110px" />
                        <DocCell label="Candidate Source" value={pis.candidate_source} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Flexible Schedule" value={pis.flexible_schedule === true ? 'YES' : pis.flexible_schedule === false ? 'NO' : '-'} flex="1" labelWidth="110px" isLastRow />
                        <DocCell label="Travel Method" value={pis.travel_method} flex="1" labelWidth="110px" isLastRow isLastCol />
                    </div>
                </div>
            </div>

            {/* ── 2. FAMILY BACKGROUND ── */}
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={s.sectionTitle}>2. FAMILY BACKGROUND</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Civil Status" value={pis.civil_status} flex="1" labelWidth="110px" />
                        <DocCell label="No. of Children" value={pis.num_children} flex="1" labelWidth="110px" />
                        <DocCell label="No. of Siblings" value={pis.num_siblings} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Spouse / Partner" value={pis.spouse_name} flex="1" labelWidth="120px" />
                        <DocCell label="Occupation" value={pis.spouse_occupation} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Father's Name" value={pis.father_name} flex="1" labelWidth="120px" />
                        <DocCell label="Occupation" value={pis.father_occupation} flex="1" labelWidth="110px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Mother's Name" value={pis.mother_name} flex="1" labelWidth="120px" />
                        <DocCell label="Occupation" value={pis.mother_occupation} flex="1" labelWidth="110px" isLastCol isLastRow />
                    </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#002D5C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ■ Emergency Contact Details
                    </div>
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', width: '100%' }}>
                            <DocCell label="Contact Person" value={pis.emergency_contact_name} flex="1.5" labelWidth="110px" isLastRow />
                            <DocCell label="Relationship" value={pis.emergency_contact_relationship} flex="1" labelWidth="100px" isLastRow />
                            <DocCell label="Contact Phone" value={pis.emergency_contact_phone} flex="1" labelWidth="110px" isLastRow isLastCol />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 3. EDUCATIONAL BACKGROUND ── */}
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={s.sectionTitle}>3. EDUCATIONAL BACKGROUND</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Highest Education" value={pis.highest_education} flex="1.2" labelWidth="120px" />
                        <DocCell label="School Name" value={pis.school_name} flex="1.5" labelWidth="100px" />
                        <DocCell label="Year Attended" value={pis.school_year_attended} flex="0.8" labelWidth="100px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Degree / Course" value={pis.course_strand} flex="1.2" labelWidth="120px" />
                        <DocCell label="Year Level" value={pis.course_year} flex="1.5" labelWidth="100px" />
                        <DocCell label="Graduated" value={pis.is_graduated} flex="0.8" labelWidth="100px" isLastCol />
                    </div>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Semesters Finished" value={pis.num_semesters} flex="1" labelWidth="120px" isLastRow />
                        <DocCell label="Pursue Studies" value={pis.plans_to_pursue_studies} flex="1" labelWidth="110px" isLastRow />
                        <DocCell label="Go Abroad" value={pis.plans_to_go_abroad} flex="1" labelWidth="100px" isLastRow isLastCol />
                    </div>
                </div>
            </div>

            {/* ── 4. EMPLOYMENT HISTORY ── */}
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={s.sectionTitle}>4. EMPLOYMENT HISTORY</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr>
                                <th style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '7px 10px', fontWeight: '800', backgroundColor: '#f8fafc', textAlign: 'left', color: '#002D5C', textTransform: 'uppercase', fontSize: '8.5px', letterSpacing: '0.04em', width: '28%' }}>EMPLOYER</th>
                                <th style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '7px 10px', fontWeight: '800', backgroundColor: '#f8fafc', textAlign: 'left', color: '#002D5C', textTransform: 'uppercase', fontSize: '8.5px', letterSpacing: '0.04em', width: '25%' }}>POSITION</th>
                                <th style={{ borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', padding: '7px 10px', fontWeight: '800', backgroundColor: '#f8fafc', textAlign: 'left', color: '#002D5C', textTransform: 'uppercase', fontSize: '8.5px', letterSpacing: '0.04em', width: '22%' }}>INCLUSIVE DATES</th>
                                <th style={{ borderBottom: '1px solid #cbd5e1', padding: '7px 10px', fontWeight: '800', backgroundColor: '#f8fafc', textAlign: 'left', color: '#002D5C', textTransform: 'uppercase', fontSize: '8.5px', letterSpacing: '0.04em', width: '25%' }}>REASON FOR LEAVING</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 4 }).map((_, i) => {
                                const exp = (pis.work_experience || [])[i];
                                const isLast = i === 3;
                                return (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                        <td style={{ borderBottom: isLast ? 'none' : '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', padding: '6px 10px', color: '#0f172a', fontWeight: '700' }}>
                                            {exp?.company || '-'}
                                        </td>
                                        <td style={{ borderBottom: isLast ? 'none' : '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', padding: '6px 10px', color: '#334155' }}>{exp?.position || '-'}</td>
                                        <td style={{ borderBottom: isLast ? 'none' : '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1', padding: '6px 10px', color: '#334155' }}>{exp ? `${exp.duration_from || ''} – ${exp.duration_to || ''}` : '-'}</td>
                                        <td style={{ borderBottom: isLast ? 'none' : '1px solid #e2e8f0', padding: '6px 10px', color: '#334155' }}>{exp?.exit_reason || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 5. MEDICAL INFORMATION ── */}
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={s.sectionTitle}>5. MEDICAL INFORMATION</div>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#ffffff', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', width: '100%' }}>
                        <DocCell label="Past Medical Notes" value={
                            Array.isArray(pis.medical_conditions)
                                ? pis.medical_conditions.join(', ')
                                : (typeof pis.medical_conditions === 'string' ? pis.medical_conditions : '')
                        } labelWidth="130px" isLastRow />
                        <DocCell label="Present Medical Notes" value={pis.medical_history_notes || ''} labelWidth="140px" isLastRow isLastCol />
                    </div>
                </div>

                {/* Checkbox grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <Chk label="High Blood Pressure" checked={hasCond('High Blood Pressure')} />
                    <Chk label="Pneumonia" checked={hasCond('Pneumonia')} />
                    <Chk label="Migraine" checked={hasCond('Migraine')} />
                    <Chk label="Drink Alcoholic Beverages?" checked={pis.drinks_alcohol ?? false} />

                    <Chk label="Chest Pain" checked={hasCond('Chest Pain')} />
                    <Chk label="Bronchitis" checked={hasCond('Bronchitis')} />
                    <Chk label="Urinary Tract Infection" checked={hasCond('Urinary Tract Infection')} />
                    <Chk label="Do you smoke?" checked={pis.smokes ?? false} />

                    <Chk label="Stroke" checked={hasCond('Stroke')} />
                    <Chk label="Tuberculosis" checked={hasCond('Tuberculosis')} />
                    <Chk label="Diabetes" checked={hasCond('Diabetes')} />
                    <Chk label="Are you pregnant?" checked={pis.is_pregnant ?? false} />

                    <Chk label="Panic Attack" checked={hasCond('Panic Attack')} />
                    <Chk label="Asthma" checked={hasCond('Asthma')} />
                    <Chk label="Allergies" checked={hasCond('Allergies')} />
                    <div />
                </div>
            </div>

            {/* Declaration & Consent Box */}
            <div style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '18px', borderLeft: '4px solid #002D5C', border: '1px solid #cbd5e1', borderLeftWidth: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Declaration & Consent</h4>
                <p style={{ fontSize: '9px', lineHeight: '1.5', color: '#334155', margin: 0, textAlign: 'justify' }}>
                    By affixing your name and signature below, you hereby declare that all information provided on this form is true and correct and was written voluntarily to the best of your knowledge. Additionally, you have agreed and given your consent to ContactPoint 360 Philippines Inc., including its authorized personnel, to conduct verification in relation to your application for employment. Furthermore, you understand that any misrepresentation or false information will be taken against your application and may result in disqualification.
                </p>
            </div>

            {/* Signature Area */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '80px', padding: '0 20px', marginBottom: '24px', marginTop: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {pis.signature_data_url ? (
                        <img
                            src={pis.signature_data_url}
                            alt="Signature"
                            style={{ height: '48px', maxWidth: '220px', filter: 'contrast(1.4) brightness(0.2)' }}
                        />
                    ) : <div style={{ height: '48px' }} />}
                    <div style={{ width: '220px', borderBottom: '2px solid #0f172a', textAlign: 'center', paddingBottom: '3px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
                            {pis.full_name || application.applicant_name}
                        </span>
                    </div>
                    <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.04em' }}>Applicant Signature</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '160px', textAlign: 'center', fontSize: '11px', fontWeight: '700', paddingBottom: '3px', borderBottom: '2px solid #0f172a', color: '#0f172a' }}>
                        {pis.form_submitted_at
                            ? new Date(pis.form_submitted_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
                            : new Date(application.applied_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </div>
                    <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.04em' }}>Date Signed</span>
                </div>
            </div>

            {/* Disclaimer Footer */}
            <p style={{ fontSize: '7.5px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4', borderTop: '1px solid #e2e8f0', paddingTop: '10px', margin: 0 }}>
                In accordance with the Data Privacy Act of 2012, this application form contains personal and sensitive information handled under ContactPoint 360 Philippines Inc. Data Protection Policy. All gathered information is kept strictly confidential.
            </p>
        </div>
    );
};

export const PISExportTemplate = forwardRef<HTMLDivElement, PISExportTemplateProps>(({ application }, ref) => {
    const pis = application.pis as PersonalInfoSheet;
    if (!pis) return null;

    const s: Record<string, React.CSSProperties> = {
        page: {
            width: '820px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            padding: '40px 48px 48px',
            fontFamily: 'Inter, Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: '#0f172a',
            position: 'relative',
            boxSizing: 'border-box',
            boxShadow: '0 0 10px rgba(0,0,0,0.05)',
        },
        topBar: { position: 'absolute', top: 0, left: 0, width: '100%', height: '10px', display: 'flex' },
        botBar: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '10px', display: 'flex' },
        blue: { flex: 1, backgroundColor: '#002D5C' },
        red: { width: '30%', backgroundColor: '#C8102E' },
        sectionTitle: {
            fontWeight: '900',
            fontSize: '11px',
            backgroundColor: '#002D5C',
            color: '#ffffff',
            padding: '7px 12px',
            marginBottom: '10px',
            marginTop: '0px',
            letterSpacing: '0.06em',
            borderRadius: '4px',
            textTransform: 'uppercase',
            borderLeft: '4px solid #C8102E',
            boxShadow: '0 1px 3px rgba(0, 45, 92, 0.12)',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
        },
    };

    return (
        <div ref={ref} style={s.page}>
            <div style={s.topBar}><div style={s.blue} /><div style={s.red} /></div>
            <PISExportContent application={application} pis={pis} s={s} />
            <div style={s.botBar}><div style={s.blue} /><div style={s.red} /></div>
        </div>
    );
});

PISExportTemplate.displayName = 'PISExportTemplate';
