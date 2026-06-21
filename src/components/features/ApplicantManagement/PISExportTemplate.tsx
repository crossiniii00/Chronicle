import React, { forwardRef } from 'react';
import type { Application, PersonalInfoSheet } from '@/types/application';

interface PISExportTemplateProps {
    application: Application;
}

export const PISExportTemplate = forwardRef<HTMLDivElement, PISExportTemplateProps>(({ application }, ref) => {
    const pis = application.pis as PersonalInfoSheet;
    if (!pis) return null;

    const s: Record<string, React.CSSProperties> = {
        page: {
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            padding: '60px 56px 80px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: '#111',
            position: 'relative',
            boxSizing: 'border-box',
        },
        topBar: { position: 'absolute', top: 0, left: 0, width: '100%', height: '26px', display: 'flex' },
        botBar: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '26px', display: 'flex' },
        blue: { flex: 1, backgroundColor: '#002D5C' },
        red: { width: '30%', backgroundColor: '#C8102E' },
        logo: { height: '56px', marginTop: '4px' },
        brandName: {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '22px',
            fontWeight: '900',
            lineHeight: '1',
            color: '#002D5C',
            letterSpacing: '-0.01em',
        },
        brandSub: { fontSize: '22px', color: '#C8102E', fontWeight: '900' },
        sectionTitle: {
            fontWeight: '900', fontSize: '11px',
            textDecoration: 'underline', textUnderlineOffset: '3px',
            marginBottom: '8px', marginTop: '16px',
            letterSpacing: '0.03em',
        },
        // A line with a label on left and underline fill
        fieldRow: { display: 'flex', alignItems: 'flex-end', marginBottom: '6px', gap: '4px', width: '100%' },
        lbl: { whiteSpace: 'nowrap', fontSize: '10px', fontWeight: '400', flexShrink: 0, lineHeight: '16px' },
        ul: { flex: 1, borderBottom: '1px solid #333', minHeight: '14px', paddingLeft: '4px', paddingBottom: '1px', fontSize: '10px', lineHeight: '14px' },
        // two-col split — alignItems: flex-end keeps baselines level
        half: { display: 'flex', gap: '20px', marginBottom: '6px', alignItems: 'flex-end' },
        // three-col
        third: { display: 'flex', gap: '12px', marginBottom: '6px', alignItems: 'flex-end' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '4px' },
        th: { border: '1px solid #555', padding: '3px 6px', fontWeight: '700', backgroundColor: '#f0f0f0', textAlign: 'left' },
        td: { border: '1px solid #555', padding: '4px 6px', height: '22px' },
    };

    const val = (v: string | number | boolean | undefined | null) => {
        if (v === true) return 'YES';
        if (v === false) return 'NO';
        return v ?? '';
    };

    // A field: "Label: ________value________"
    const F = ({
        label, value, flex, width, noFlex
    }: {
        label: string; value?: string | number | boolean | null;
        flex?: string; width?: string; noFlex?: boolean
    }) => (
        <div style={{ ...s.fieldRow, flex: noFlex ? undefined : (flex || '1'), width, marginBottom: 0 }}>
            <span style={s.lbl}>{label}</span>
            <div style={{ ...s.ul }}>{String(val(value))}</div>
        </div>
    );

    // Checkbox item (underscore prefix style from the template)
    const Chk = ({ label, checked }: { label: string; checked: boolean }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px', fontSize: '9.5px' }}>
            <div style={{
                width: '10px', height: '10px', border: '1px solid #333', flexShrink: 0,
                backgroundColor: checked ? '#111' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '8px', fontWeight: '900',
            }}>
                {checked ? '✓' : ''}
            </div>
            <span>{label}</span>
        </div>
    );

    const hasCond = (c: string) => !!(pis.medical_conditions?.includes(c));

    return (
        <div ref={ref} style={s.page}>
            {/* Top bar */}
            <div style={s.topBar}><div style={s.blue} /><div style={s.red} /></div>

            {/* Logo + Brand Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', marginTop: '4px' }}>
                <img src="/contactpoint-logo.png?v=2" alt="ContactPoint 360" style={s.logo} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={s.brandName}>
                        CONTACT<br />
                        <span style={{ color: '#002D5C' }}>POINT</span>
                        <span style={s.brandSub}>360</span>
                    </span>
                </div>
            </div>

            {/* ── PERSONAL INFORMATION ── */}
            <div style={s.sectionTitle}>PERSONAL INFORMATION</div>

            {/* Name row with sub‑labels */}
            <div style={{ ...s.fieldRow, marginBottom: '2px' }}>
                <span style={s.lbl}>Name:</span>
                <div style={{ flex: 1, display: 'flex', gap: '0' }}>
                    <div style={{ ...s.ul, flex: 1 }}>{pis.full_name}</div>
                </div>
                <span style={{ ...s.lbl, marginLeft: '10px' }}>Nick Name:</span>
                <div style={{ ...s.ul, width: '120px', flex: 'none' }}>{pis.nick_name}</div>
            </div>
            <div style={{ display: 'flex', gap: '60px', marginBottom: '6px', paddingLeft: '36px', fontSize: '8.5px', color: '#555' }}>
                <span style={{ flex: 1, textAlign: 'center' }}>LAST NAME</span>
                <span style={{ flex: 1, textAlign: 'center' }}>FIRST NAME</span>
                <span style={{ flex: 1, textAlign: 'center' }}>MIDDLE NAME</span>
            </div>

            <div style={s.half}>
                <F label="Present Address:" value={pis.current_address} />
                <F label="Place of Birth:" value={pis.place_of_birth} flex="0 0 180px" />
            </div>
            <div style={s.half}>
                <F label="Permanent Address:" value={pis.permanent_address} />
                <F label="Nationality:" value={pis.nationality} flex="0 0 180px" />
            </div>
            <div style={{ ...s.half, flexWrap: 'wrap' }}>
                <F label="Date of Birth: MM/DD/YYYY" value={pis.birth_date} flex="0 0 200px" />
                <F label="Age:" value={pis.age} flex="0 0 80px" />
                <F label="Religion:" value={pis.religion} />
                <F label="Gender:" value={pis.gender} flex="0 0 120px" />
            </div>
            <div style={s.half}>
                <F label="SSS No.:" value={pis.sss_no} />
                <F label="Contact Number:" value={pis.phone} />
            </div>
            <div style={s.half}>
                <F label="BIR TIN No.:" value={pis.tin_no} />
                <F label="Email Address:" value={pis.email} />
            </div>
            <div style={s.half}>
                <F label="PAG-IBIG No.:" value={pis.pagibig_no} />
                <F label="Where did you know we are hiring:" value={pis.hiring_source} />
            </div>
            <div style={s.half}>
                <F label="Philhealth No.:" value={pis.philhealth_no} />
                <F label="Candidate Source:" value={pis.candidate_source} />
            </div>
            <div style={{ ...s.fieldRow, marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={s.lbl}>Are you okay working with a flexible schedule?&nbsp;</span>
                <span style={{ fontWeight: '700', marginRight: '8px', fontSize: '10px' }}>
                    {pis.flexible_schedule === true ? 'YES' : pis.flexible_schedule === false ? 'NO' : 'YES / NO'}
                </span>
                <span style={s.lbl}>How do you travel from your house to IT Park?&nbsp;</span>
                <div style={{ ...s.ul, flex: '1', minWidth: '80px' }}>{pis.travel_method}</div>
            </div>

            {/* ── FAMILY BACKGROUND ── */}
            <div style={s.sectionTitle}>FAMILY BACKGROUND</div>
            <div style={s.third}>
                <F label="Civil Status: Single / Married / Others:" value={pis.civil_status} />
                <F label="No. of Children:" value={pis.num_children} flex="0 0 150px" />
                <F label="No. of Siblings:" value={pis.num_siblings} flex="0 0 130px" />
            </div>
            <div style={s.half}>
                <F label="Name of Spouse / Partner:" value={pis.spouse_name} />
                <F label="Occupation:" value={pis.spouse_occupation} flex="0 0 180px" />
            </div>
            <div style={s.half}>
                <F label="Father's Name:" value={pis.father_name} />
                <F label="Occupation:" value={pis.father_occupation} flex="0 0 180px" />
            </div>
            <div style={s.half}>
                <F label="Mother's Name:" value={pis.mother_name} />
                <F label="Occupation:" value={pis.mother_occupation} flex="0 0 180px" />
            </div>
            <div style={s.third}>
                <F label="Emergency Contact Person:" value={pis.emergency_contact_name} />
                <F label="Relationship:" value={pis.emergency_contact_relationship} flex="0 0 160px" />
                <F label="Contact Number:" value={pis.emergency_contact_phone} flex="0 0 150px" />
            </div>

            {/* ── HIGHEST EDUCATIONAL BACKGROUND ── */}
            <div style={s.sectionTitle}>HIGHEST EDUCATIONAL BACKGROUND</div>
            <div style={s.third}>
                <F label="Highest Education Attained:" value={pis.highest_education} />
                <F label="School:" value={pis.school_name} />
                <F label="School Year Attended:" value={pis.school_year_attended} flex="0 0 140px" />
            </div>
            <div style={s.third}>
                <F label="Degree / Course:" value={pis.course_strand} />
                <F label="Year Level:" value={pis.course_year} />
                <F label="Graduated: YES / NO" value={pis.is_graduated} flex="0 0 100px" />
            </div>
            <div style={s.third}>
                <F label="Number of Semesters Finished:" value={pis.num_semesters} />
                <F label="Plans to Pursue Studies:" value={pis.plans_to_pursue_studies} />
                <F label="Plans to go Abroad:" value={pis.plans_to_go_abroad} />
            </div>

            {/* ── EMPLOYMENT HISTORY ── */}
            <div style={s.sectionTitle}>EMPLOYMENT HISTORY</div>
            <table style={s.table}>
                <thead>
                    <tr>
                        <th style={{ ...s.th, width: '25%' }}>EMPLOYER</th>
                        <th style={{ ...s.th, width: '25%' }}>POSITION</th>
                        <th style={{ ...s.th, width: '25%' }}>INCLUSIVE DATES</th>
                        <th style={{ ...s.th, width: '25%' }}>REASON FOR LEAVING</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 5 }).map((_, i) => {
                        const exp = (pis.work_experience || [])[i];
                        return (
                            <tr key={i}>
                                <td style={s.td}>{exp?.company || ''}</td>
                                <td style={s.td}>{exp?.position || ''}</td>
                                <td style={s.td}>{exp ? `${exp.duration_from || ''} – ${exp.duration_to || ''}` : ''}</td>
                                <td style={s.td}>{exp?.exit_reason || ''}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ── MEDICAL INFORMATION ── */}
            <div style={s.sectionTitle}>MEDICAL INFORMATION</div>
            <p style={{ fontSize: '9.5px', marginBottom: '6px', color: '#222' }}>
                Please answer the following questions and declare any medical history or conditions. Kindly put <strong>✓</strong> for YES and <strong>✗</strong> NO.
            </p>
            <div style={{ ...s.fieldRow, marginBottom: '10px' }}>
                <span style={s.lbl}>Do you have any medical conditions? Past:</span>
                <div style={{ ...s.ul, maxWidth: '160px' }}>{pis.medical_conditions?.join(', ') || ''}</div>
                <span style={{ ...s.lbl, marginLeft: '10px' }}>Present:</span>
                <div style={{ ...s.ul }}>{pis.medical_history_notes || ''}</div>
            </div>

            {/* Checkbox grid — 4 columns matching original */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 8px', marginBottom: '12px' }}>
                <Chk label="High Blood Pressure" checked={hasCond('High Blood Pressure')} />
                <Chk label="Pneumonia" checked={hasCond('Pneumonia')} />
                <Chk label="Migraine" checked={hasCond('Migraine')} />
                <Chk label="Do you drink alcoholic beverages?" checked={pis.drinks_alcohol ?? false} />

                <Chk label="Chest Pain" checked={hasCond('Chest Pain')} />
                <Chk label="Bronchitis" checked={hasCond('Bronchitis')} />
                <Chk label="Urinary Tract Infection (UTI)" checked={hasCond('Urinary Tract Infection')} />
                <Chk label="Do you smoke?" checked={pis.smokes ?? false} />

                <Chk label="Stoke" checked={hasCond('Stroke')} />
                <Chk label="Tuberculosis" checked={hasCond('Tuberculosis')} />
                <Chk label="Diabetes Type _________" checked={hasCond('Diabetes')} />
                <Chk label="Are you pregnant?" checked={pis.is_pregnant ?? false} />

                <Chk label="Panic Attack" checked={hasCond('Panic Attack')} />
                <Chk label="Asthma" checked={hasCond('Asthma')} />
                <Chk label="Allergies" checked={hasCond('Allergies')} />
                <div />
            </div>

            {/* Legal paragraph */}
            <p style={{ fontSize: '9px', lineHeight: '1.6', color: '#333', marginBottom: '20px' }}>
                By affixing your name and signature below, you hereby declare that all information provided on this form is true and correct and was written voluntarily to the best of your knowledge. Additionally, you have agreed and given your consent to ContactPoint 360 Philippines Inc., including its authorized personnel, to conduct verification in relation to your application for employment. Furthermore, you understand that any misrepresentation or false information will be taken against your application and may result in disqualification.
            </p>

            {/* Signature area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 40px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    {pis.signature_data_url ? (
                        <img
                            src={pis.signature_data_url}
                            alt="Signature"
                            style={{ height: '44px', maxWidth: '200px', marginBottom: '2px', filter: 'contrast(1.4) brightness(0.3)' }}
                        />
                    ) : <div style={{ height: '44px' }} />}
                    <div style={{ width: '240px', borderBottom: '1px solid #333', textAlign: 'center', paddingBottom: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {pis.full_name || application.applicant_name}
                        </span>
                    </div>
                    <span style={{ fontSize: '8.5px', fontWeight: '700', textTransform: 'uppercase', marginTop: '3px' }}>Signature Over Printed Name</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '180px', textAlign: 'center', fontSize: '10px', fontWeight: '700', paddingBottom: '4px', borderBottom: '1px solid #333' }}>
                        {pis.form_submitted_at
                            ? new Date(pis.form_submitted_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : new Date(application.applied_at).toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span style={{ fontSize: '8.5px', fontWeight: '700', textTransform: 'uppercase', marginTop: '3px' }}>Date and Time</span>
                </div>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: '7.5px', color: '#999', textAlign: 'center', lineHeight: '1.5', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                In accordance with the Data Privacy Act of 2012, this application form may contain personal and sensitive information. These data are handled in compliance with ContactPoint360 PH Inc. Data Protection Policy, and only authorized personnel are allowed to access the information. All the gathered information is kept for as long as it is required. Strictly confidential.
            </p>

            {/* Bottom bar */}
            <div style={s.botBar}><div style={s.blue} /><div style={s.red} /></div>
        </div>
    );
});

PISExportTemplate.displayName = 'PISExportTemplate';
