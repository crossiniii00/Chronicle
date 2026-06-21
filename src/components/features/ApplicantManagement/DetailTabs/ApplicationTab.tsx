import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, FileText, ChevronDown, MapPin, GraduationCap, Briefcase, Award, Globe, Shield, Activity, ShieldCheck, ExternalLink, Download, Users } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Application, WorkExperience, Language, Certification } from '@/types/application';

interface ApplicationTabProps {
    applicant: Application;
    showPIS: boolean;
    setShowPIS: (show: boolean) => void;
}

export const ApplicationTab: React.FC<ApplicationTabProps> = ({ applicant, showPIS, setShowPIS }) => {
    return (
        <div className="space-y-5">
            {/* Section: Personal Summary Details */}
            <div className="bg-white border border-surface-200 rounded-none overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-primary-500" />
                <div className="px-6 py-4 bg-surface-50/50 border-b border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-none bg-primary-50 border border-primary-100 flex items-center justify-center">
                            <User size={14} className="text-primary-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none mb-0.5">Basic Info</p>
                            <h4 className="text-sm font-bold text-surface-900 leading-none">Personal Details</h4>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-100">
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Civil Status', value: applicant.pis?.civil_status },
                            { label: 'Nickname', value: applicant.pis?.nick_name },
                            { label: 'Phone Number', value: applicant.pis?.phone },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                <p className="text-[13px] font-bold text-surface-800 tracking-tight">
                                    {f.value || <span className="text-surface-300 font-normal italic">Pending...</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 space-y-4 bg-surface-50/20">
                        {[
                            { label: 'Date of Birth', value: applicant.pis?.birth_date && applicant.pis.birth_date.includes('T') 
                                ? new Date(applicant.pis.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) 
                                : applicant.pis?.birth_date },
                            { label: 'Age', value: applicant.pis?.age },
                            { label: 'Gender', value: applicant.pis?.gender },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                <p className="text-[13px] font-bold text-surface-800 tracking-tight">
                                    {f.value || <span className="text-surface-300 font-normal italic">Pending...</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Religion', value: applicant.pis?.religion },
                            { label: 'Nationality', value: applicant.pis?.nationality },
                            { label: 'Email', value: applicant.pis?.email || applicant.applicant_email },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                <p className="text-[13px] font-bold text-surface-800 tracking-tight truncate">
                                    {f.value || <span className="text-surface-300 font-normal italic">Pending...</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-4 border-t border-surface-100 bg-surface-50/30">
                    {[
                        { label: 'SSS NO.', value: applicant.pis?.sss_no },
                        { label: 'BIR TIN', value: applicant.pis?.tin_no },
                        { label: 'PHILHEALTH', value: applicant.pis?.philhealth_no },
                        { label: 'PAG-IBIG', value: applicant.pis?.pagibig_no },
                    ].map((f, i) => (
                        <div key={i} className="px-6 py-4 border-r last:border-0 border-surface-100">
                            <p className="text-[9px] font-black text-surface-400 uppercase tracking-wider mb-0.5">{f.label}</p>
                            <p className="text-[11px] font-bold text-surface-600 truncate">
                                {f.value || <span className="text-surface-300">—</span>}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* View Full PIS */}
            <button
                onClick={() => setShowPIS(!showPIS)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#F5F5F5] border border-[#E1E1E1] rounded-none hover:bg-[#EBF3FC] hover:border-[#0078D4] transition-all group"
            >
                <div className="flex items-center gap-2.5">
                    <FileText size={16} className="text-[#0078D4]" />
                    <div className="text-left">
                        <p className="text-[13px] font-semibold text-[#242424]">View Full PIS</p>
                        <p className="text-[11px] text-[#616161]">Personal Information Sheet — complete submitted data</p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: showPIS ? 180 : 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[#616161] group-hover:text-[#0078D4]"
                >
                    <ChevronDown size={16} />
                </motion.div>
            </button>

            {/* Full PIS Expandable Panel */}
            <AnimatePresence>
                {showPIS && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4 border border-[#E1E1E1] rounded-none p-5 bg-[#FAFAFA]">
                            {/* Addresses */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Addresses</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white grid grid-cols-2 divide-x divide-[#E1E1E1]">
                                    <div className="px-4 py-3">
                                        <p className="text-[11px] text-[#616161] mb-0.5">Current Address</p>
                                        <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.current_address || <span className="text-[#A0A0A0]">—</span>}</p>
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-[11px] text-[#616161] mb-0.5">Permanent Address</p>
                                        <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.permanent_address || <span className="text-[#A0A0A0]">—</span>}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Education */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Education</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white grid grid-cols-5 divide-x divide-[#E1E1E1]">
                                    {[
                                        { label: 'Highest Education', value: applicant.pis?.highest_education },
                                        { label: 'School / University', value: applicant.pis?.school_name },
                                        { label: 'Degree / Course', value: applicant.pis?.course_strand || applicant.pis?.degree },
                                        { label: 'Year Level', value: applicant.pis?.course_year },
                                        { label: 'Inclusive Years', value: applicant.pis?.school_year_attended },
                                    ].map((f, i) => (
                                        <div key={i} className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                            <p className="text-[13px] font-medium text-[#242424] truncate">{f.value || <span className="text-[#A0A0A0]">—</span>}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-0 border border-[#E1E1E1] rounded-none overflow-hidden bg-white grid grid-cols-4 divide-x divide-[#E1E1E1]">
                                    {[
                                        { label: 'Graduation Status', value: applicant.pis?.is_graduated ? 'Graduated' : 'Undergraduate' },
                                        { label: 'Semesters Completed', value: applicant.pis?.num_semesters },
                                        { label: 'Future Studies', value: applicant.pis?.plans_to_pursue_studies },
                                        { label: 'Plans Abroad', value: applicant.pis?.plans_to_go_abroad },
                                    ].map((f, i) => (
                                        <div key={i} className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                            <p className="text-[13px] font-medium text-[#242424] truncate">{f.value || <span className="text-[#A0A0A0]">—</span>}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Work Experience */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Work Experience</p>
                                </div>
                                {applicant.pis?.work_experience && applicant.pis.work_experience.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {applicant.pis.work_experience.map((exp: WorkExperience, i: number) => (
                                            <div key={i} className="bg-white border border-[#E1E1E1] rounded-none px-4 py-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[13px] font-semibold text-[#242424]">{exp.position || 'Untitled Role'}</p>
                                                        <p className="text-[11px] text-[#616161]">{exp.company}</p>
                                                    </div>
                                                    <span className="text-[11px] text-[#A0A0A0] whitespace-nowrap ml-4">
                                                        {exp.duration_from || '—'} → {exp.duration_to || 'Present'}
                                                    </span>
                                                </div>
                                                {exp.description && <p className="text-[11px] text-[#616161] mt-1.5 leading-relaxed">{exp.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-[#E1E1E1] rounded-none px-4 py-3">
                                        <span className="text-[#A0A0A0] text-[13px]">No work experience listed</span>
                                    </div>
                                )}
                            </div>

                            {/* Skills */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Award size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Skills & Competencies</p>
                                </div>
                                <div className="bg-white border border-[#E1E1E1] rounded-none px-4 py-3 flex flex-wrap gap-1.5">
                                    {applicant.pis?.skills && applicant.pis.skills.length > 0 ? (
                                        applicant.pis.skills.map((s: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 bg-[#EBF3FC] text-[#0078D4] rounded-none text-[11px] font-medium border border-[#0078D4]/10">{s}</span>
                                        ))
                                    ) : (
                                        <span className="text-[#A0A0A0] text-[13px]">No skills listed</span>
                                    )}
                                </div>
                            </div>

                            {/* Languages */}
                            {applicant.pis?.languages && applicant.pis.languages.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe size={13} className="text-[#0078D4]" />
                                        <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Languages</p>
                                    </div>
                                    <div className="bg-white border border-[#E1E1E1] rounded-none px-4 py-3 flex flex-wrap gap-2">
                                        {applicant.pis.languages.map((l: Language, i: number) => {
                                            // Defensive normalize: handle both {language, proficiency} and
                                            // accidentally double-nested {language: {language, proficiency}}
                                            const raw = (l.language && typeof l.language === 'object')
                                                ? (l.language as any)
                                                : l;
                                            const langName = typeof raw.language === 'string' ? raw.language : String(raw.language || '');
                                            const langProf = typeof raw.proficiency === 'string' ? raw.proficiency : (raw.proficiency ? String(raw.proficiency) : '');
                                            return (
                                                <span key={i} className="px-2.5 py-1 bg-[#F5F5F5] border border-[#E1E1E1] rounded-none text-[11px] text-[#242424] font-medium">
                                                    {langName}{langProf && <span className="text-[#A0A0A0] ml-1">· {langProf}</span>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {applicant.pis?.certifications && applicant.pis.certifications.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield size={13} className="text-[#0078D4]" />
                                        <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Certifications</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {applicant.pis.certifications.map((c: Certification, i: number) => (
                                            <div key={i} className="bg-white border border-[#E1E1E1] rounded-none px-4 py-2.5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[13px] font-semibold text-[#242424]">{c.name}</p>
                                                    <p className="text-[11px] text-[#616161]">{c.issuer}</p>
                                                </div>
                                                {c.date && <span className="text-[11px] text-[#A0A0A0]">{c.date}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Family Background */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Family Background</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white divide-y divide-[#E1E1E1]">
                                    <div className="grid grid-cols-3 divide-x divide-[#E1E1E1]">
                                        {[
                                            { label: 'Spouse Name', value: applicant.pis?.spouse_name },
                                            { label: 'Spouse Occupation', value: applicant.pis?.spouse_occupation },
                                            { label: 'Children / Siblings', value: `${applicant.pis?.num_children || 0} Children / ${applicant.pis?.num_siblings || 0} Siblings` },
                                        ].map((f, i) => (
                                            <div key={i} className="px-4 py-3">
                                                <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                                <p className="text-[13px] font-medium text-[#242424]">{f.value || <span className="text-[#A0A0A0]">—</span>}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-[#E1E1E1]">
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">Father's Profile</p>
                                            <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.father_name || <span className="text-[#A0A0A0]">—</span>} <span className="text-[#616161] text-[11px] font-normal ml-1">({applicant.pis?.father_occupation || 'N/A'})</span></p>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">Mother's Profile</p>
                                            <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.mother_name || <span className="text-[#A0A0A0]">—</span>} <span className="text-[#616161] text-[11px] font-normal ml-1">({applicant.pis?.mother_occupation || 'N/A'})</span></p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 divide-x divide-[#E1E1E1]">
                                        {[
                                            { label: 'Emergency Contact', value: applicant.pis?.emergency_contact_name },
                                            { label: 'Relationship', value: applicant.pis?.emergency_contact_relationship },
                                            { label: 'Contact Number', value: applicant.pis?.emergency_contact_phone },
                                        ].map((f, i) => (
                                            <div key={i} className="px-4 py-3">
                                                <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                                <p className="text-[13px] font-medium text-[#242424]">{f.value || <span className="text-[#A0A0A0]">—</span>}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Medical Declaration */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Medical Declaration</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white p-5 space-y-5">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Alcohol', val: applicant.pis?.drinks_alcohol },
                                            { label: 'Smoker', val: applicant.pis?.smokes },
                                            { label: 'Pregnant', val: applicant.pis?.is_pregnant },
                                            { label: 'Health Issues', val: applicant.pis?.has_medical_conditions },
                                        ].map((m, i) => (
                                            <div key={i} className={`flex items-center justify-between px-3 py-2 border rounded-none ${m.val ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                                                <span className="text-[11px] font-semibold text-gray-700">{m.label}</span>
                                                <span className={`text-[10px] font-bold uppercase ${m.val ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {m.val ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {applicant.pis?.medical_conditions && applicant.pis.medical_conditions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[11px] font-bold text-[#616161] mr-1">Condition Checklist:</span>
                                            {applicant.pis.medical_conditions.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-none text-[10px] font-medium uppercase tracking-tighter">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-none">
                                        <p className="text-[10px] font-bold text-[#616161] uppercase mb-1">Health Notes / History</p>
                                        <p className="text-[12px] text-gray-700 leading-relaxed">
                                            {applicant.pis?.medical_history_notes || 'No clinical history reported by applicant.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Affidavit & Authorization */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Affidavit & Authorization</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white p-5 space-y-4">
                                    <p className="text-[11px] text-[#616161] leading-relaxed">
                                        By affixing your name and signature below, you hereby declare that all information provided on this form is true and correct and was written voluntarily to the best of your knowledge.
                                    </p>
                                    <p className="text-[11px] text-[#616161] leading-relaxed">
                                        Additionally, you have agreed and given your consent to ContactPoint 360 Philippines Inc., including its authorized personnel, to conduct verification in relation to your application for employment. Furthermore, you understand that any misrepresentation or false information will be taken against your application and may result in disqualification.
                                    </p>
                                    <div className="pt-3 border-t border-[#F0F0F0]">
                                        <p className="text-[10px] text-[#A0A0A0] leading-relaxed font-medium">
                                            In accordance with the Data Privacy Act of 2012, this application form may contain personal and sensitive information. These data are handled in compliance with Data Protection Policy. I hereby authorize the company to verify any information provided.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Digital Attestation */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Digital Attestation</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white p-6 text-center">
                                    <p className="text-[10px] text-[#616161] uppercase tracking-[0.2em] mb-4">
                                        Certified that all information provided is true and correct.
                                    </p>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-24 flex items-center justify-center">
                                            {applicant.pis?.signature_data_url ? (
                                                <img src={applicant.pis.signature_data_url} alt="Signature" className="max-h-20 contrast-125" />
                                            ) : (
                                                <span className="text-[9px] text-[#A0A0A0] uppercase tracking-widest font-black">Record Not Found</span>
                                            )}
                                        </div>
                                        <div className="w-48 h-[1px] bg-[#E1E1E1]" />
                                        <p className="text-[11px] font-bold text-[#242424] uppercase tracking-widest">{applicant.pis?.full_name}</p>
                                        <p className="text-[9px] text-[#616161] uppercase">Verified Digitally on {new Date(applicant.applied_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
