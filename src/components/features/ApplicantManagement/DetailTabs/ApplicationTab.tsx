import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, FileText, ChevronDown, MapPin, GraduationCap, Briefcase, Award, Globe, Shield, Activity, ShieldCheck, ExternalLink, Download, Users, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/formatters';
import { Application, WorkExperience, Language, Certification, PersonalInfoSheet } from '@/types/application';
import { ApplicationService } from '@/services/ApplicationService';

interface ApplicationTabProps {
    applicant: Application;
    showPIS: boolean;
    setShowPIS: (show: boolean) => void;
    isEditing?: boolean;
    handleUpdateApplication?: (id: string, patch: any) => void;
}
const EditableField = ({ value, field, placeholder = '', type = 'text', fullWidth = false, isEditing, handlePISChange }: any) => {
    const [localVal, setLocalVal] = React.useState(value || '');
    const [showSaved, setShowSaved] = React.useState(false);

    React.useEffect(() => {
        setLocalVal(value || '');
    }, [value]);

    if (isEditing) {
        return (
            <div className={`relative ${fullWidth ? 'w-full' : 'w-full max-w-[200px] inline-block'}`}>
                <input
                    type={type}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={() => {
                        if (localVal !== value) {
                            handlePISChange(field, localVal);
                            setShowSaved(true);
                            setTimeout(() => setShowSaved(false), 2000);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    placeholder={placeholder}
                    className={`px-2 py-1 pr-7 text-[13px] font-bold text-surface-800 border border-surface-300 rounded focus:border-primary-500 outline-none w-full`}
                />
                {showSaved && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5 shadow-sm border border-emerald-200 z-10 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </span>
                )}
            </div>
        );
    }
    return (
        <p className="text-[13px] font-bold text-surface-800 tracking-tight truncate">
            {value || <span className="text-surface-300 font-normal italic">{placeholder || '—'}</span>}
        </p>
    );
};

export const ApplicationTab = ({ applicant: originalApplicant, isEditing = false, handleUpdateApplication, showPIS, setShowPIS, autoSaveOnType = false }: any) => {
    const initialPis = React.useMemo(() => {
        const rawPis = originalApplicant.pis || {};
        const sig = rawPis.signature_data_url ||
            rawPis.signature ||
            (originalApplicant as any).signature_data_url ||
            (originalApplicant as any).signature ||
            originalApplicant.metadata?.signature_data_url ||
            originalApplicant.metadata?.signature;

        return {
            ...rawPis,
            signature_data_url: sig || rawPis.signature_data_url,
            signature: sig || rawPis.signature,
            work_experience: (rawPis.work_experience && rawPis.work_experience.length > 0) ? rawPis.work_experience : (originalApplicant.metadata?.work_experience || (originalApplicant as any).work_experience || []),
            skills: (rawPis.skills && rawPis.skills.length > 0) ? rawPis.skills : (originalApplicant.metadata?.skills || (originalApplicant as any).skills || []),
        };
    }, [originalApplicant]);

    const [tempPis, setTempPis] = React.useState<any>(initialPis);

    const applicant = React.useMemo(() => ({
        ...originalApplicant,
        signature_data_url: tempPis.signature_data_url || originalApplicant.signature_data_url,
        pis: tempPis
    }), [originalApplicant, tempPis]);

    // Sync state when props change
    React.useEffect(() => {
        if (!isEditing) {
            setTempPis(initialPis);
        }
    }, [initialPis, isEditing]);

    // Background fetch full details (including signature_data_url) if missing from list cache
    React.useEffect(() => {
        if (originalApplicant?.id && !initialPis.signature_data_url) {
            ApplicationService.getById(originalApplicant.id).then(fullApp => {
                if (fullApp) {
                    const fullSig = fullApp.signature_data_url || fullApp.pis?.signature_data_url || fullApp.pis?.signature;
                    if (fullSig || fullApp.pis) {
                        setTempPis((prev: any) => ({
                            ...prev,
                            ...(fullApp.pis || {}),
                            signature_data_url: fullSig || prev.signature_data_url,
                            signature: fullSig || prev.signature,
                            work_experience: (fullApp.pis?.work_experience && fullApp.pis.work_experience.length > 0) ? fullApp.pis.work_experience : prev.work_experience,
                            skills: (fullApp.pis?.skills && fullApp.pis.skills.length > 0) ? fullApp.pis.skills : prev.skills
                        }));
                    }
                }
            }).catch(() => { });
        }
    }, [originalApplicant?.id, initialPis.signature_data_url]);

    // Save on exiting edit mode (only if not autoSaving on type)
    const prevIsEditingRef = React.useRef(isEditing);
    React.useEffect(() => {
        if (prevIsEditingRef.current && !isEditing && !autoSaveOnType) {
            if (handleUpdateApplication) {
                handleUpdateApplication(originalApplicant.id, { pis: tempPis });
            }
        }
        prevIsEditingRef.current = isEditing;
    }, [isEditing, originalApplicant.id, tempPis, handleUpdateApplication, autoSaveOnType]);

    const handlePISChange = React.useCallback((field: keyof PersonalInfoSheet, value: any) => {
        setTempPis((prev: any) => ({ ...prev, [field]: value }));

        if (autoSaveOnType && handleUpdateApplication) {
            handleUpdateApplication(originalApplicant.id, { pis: { [field]: value } });
        }
    }, [originalApplicant.id, handleUpdateApplication, autoSaveOnType]);

    const handleArrayChange = React.useCallback((field: keyof PersonalInfoSheet, index: number, subField: string | null, value: any) => {
        const arr = [...(tempPis[field] as any[] || [])];
        if (!arr[index]) arr[index] = {};
        if (subField) {
            arr[index] = { ...arr[index], [subField]: value };
        } else {
            arr[index] = value;
        }

        setTempPis((prev: any) => ({ ...prev, [field]: arr }));

        if (autoSaveOnType && handleUpdateApplication) {
            handleUpdateApplication(originalApplicant.id, { pis: { [field]: arr } });
        }
    }, [tempPis, originalApplicant.id, handleUpdateApplication, autoSaveOnType]);

    const handleAddArrayItem = React.useCallback((field: keyof PersonalInfoSheet, emptyItem: any) => {
        const arr = [...(tempPis[field] as any[] || []), emptyItem];

        setTempPis((prev: any) => ({ ...prev, [field]: arr }));

        if (autoSaveOnType && handleUpdateApplication) {
            handleUpdateApplication(originalApplicant.id, { pis: { [field]: arr } });
        }
    }, [tempPis, originalApplicant.id, handleUpdateApplication, autoSaveOnType]);

    const handleRemoveArrayItem = React.useCallback((field: keyof PersonalInfoSheet, index: number) => {
        const arr = [...(tempPis[field] as any[] || [])];
        arr.splice(index, 1);

        setTempPis((prev: any) => ({ ...prev, [field]: arr }));

        if (autoSaveOnType && handleUpdateApplication) {
            handleUpdateApplication(originalApplicant.id, { pis: { [field]: arr } });
        }
    }, [tempPis, originalApplicant.id, handleUpdateApplication, autoSaveOnType]);

    return (
        <div className="space-y-5">
            {/* Section: Resume & Documents */}
            {(applicant.resume_name || applicant.resume_data || applicant.resume_path) && (
                <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500" />
                    <div className="px-6 py-4 bg-surface-50/50 border-b border-surface-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-none bg-blue-50 border border-blue-100 flex items-center justify-center">
                                <FileText size={14} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none mb-0.5">Attachments</p>
                                <h4 className="text-sm font-bold text-surface-900 leading-none">Resume / CV</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-4 p-4 border border-surface-200 bg-surface-50 rounded-md">
                            <div className="flex-1 flex items-center gap-3">
                                <FileText size={24} className="text-blue-500" />
                                <div>
                                    <p className="text-sm font-semibold text-surface-900">{applicant.resume_name || "Applicant_Resume.pdf"}</p>
                                    <p className="text-xs text-surface-500">Uploaded during application</p>
                                </div>
                            </div>
                            <a
                                href={applicant.resume_data || `/api/applications/${applicant.id}/resume`}
                                download={applicant.resume_name || "Resume.pdf"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-300 hover:border-blue-400 hover:bg-blue-50 text-surface-700 hover:text-blue-700 transition-colors rounded-md text-xs font-bold uppercase tracking-wider shadow-sm"
                            >
                                <Download size={14} />
                                Download Resume
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* Section: Personal Summary Details */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none overflow-hidden relative">
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
                            { label: 'First Name', value: applicant.pis?.first_name ?? (applicant as any).first_name ?? applicant.metadata?.first_name ?? '', field: 'first_name' },
                            { label: 'Middle Name', value: applicant.pis?.middle_name ?? (applicant as any).middle_name ?? applicant.metadata?.middle_name ?? '', field: 'middle_name' },
                            { label: 'Last Name', value: applicant.pis?.last_name ?? (applicant as any).last_name ?? applicant.metadata?.last_name ?? '', field: 'last_name' },
                            { label: 'Preferred Nickname', value: applicant.pis?.preferred_nickname ?? (applicant as any).preferred_nickname ?? applicant.metadata?.preferred_nickname ?? '', field: 'preferred_nickname' },
                            { label: 'Civil Status', value: applicant.pis?.civil_status ?? (applicant as any).civil_status ?? applicant.metadata?.civil_status ?? '', field: 'civil_status' },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} />
                            </div>
                        ))}
                    </div>
                    <div className="p-6 space-y-4 bg-surface-50/20">
                        {[
                            {
                                label: 'Date of Birth', field: 'birth_date', type: 'date', value: (applicant.pis?.birth_date ?? (applicant as any).birth_date ?? applicant.metadata?.birth_date) && String(applicant.pis?.birth_date ?? (applicant as any).birth_date).includes('T') && !isEditing
                                    ? new Date(applicant.pis?.birth_date ?? (applicant as any).birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
                                    : (applicant.pis?.birth_date ?? (applicant as any).birth_date ?? applicant.metadata?.birth_date ?? '')
                            },
                            { label: 'Age', value: applicant.pis?.age ?? (applicant as any).age ?? applicant.metadata?.age ?? '', field: 'age', type: 'number' },
                            { label: 'Sex', value: applicant.pis?.sex ?? (applicant as any).sex ?? applicant.metadata?.sex ?? '', field: 'sex' },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} type={f.type} />
                            </div>
                        ))}
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Phone Number', value: applicant.pis?.phone ?? (applicant as any).phone ?? (applicant as any).applicant_phone ?? applicant.metadata?.phone ?? '', field: 'phone' },
                            { label: 'Religion', value: applicant.pis?.religion ?? (applicant as any).religion ?? applicant.metadata?.religion ?? '', field: 'religion' },
                            { label: 'Nationality', value: applicant.pis?.nationality ?? (applicant as any).nationality ?? applicant.metadata?.nationality ?? '', field: 'nationality' },
                            { label: 'Email', value: applicant.pis?.email ?? applicant.applicant_email ?? (applicant as any).email ?? '', field: 'email' },
                        ].map((f, i) => (
                            <div key={i}>
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">{f.label}</p>
                                {f.label === 'Email' ? (
                                    <div className="flex flex-col">
                                        <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={applicant.pis?.email ?? applicant.applicant_email} field="email" placeholder="Email" />
                                        {!applicant.pis?.email && !applicant.applicant_email && !isEditing && (
                                            <p className="text-[13px] font-bold text-surface-800 tracking-tight truncate">{applicant.applicant_email}</p>
                                        )}
                                    </div>
                                ) : (
                                    <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} fullWidth />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-4 border-t border-surface-100 bg-surface-50/30">
                    {[
                        { label: 'SSS NO.', value: applicant.pis?.sss_no ?? '', field: 'sss_no' },
                        { label: 'BIR TIN', value: applicant.pis?.tin_no ?? '', field: 'tin_no' },
                        { label: 'PHILHEALTH', value: applicant.pis?.philhealth_no ?? '', field: 'philhealth_no' },
                        { label: 'PAG-IBIG', value: applicant.pis?.pagibig_no ?? '', field: 'pagibig_no' },
                    ].map((f, i, arr) => {
                        const isTextOrPlaceholder = (val: any) => {
                            if (!val) return true;
                            const raw = String(val).trim();
                            if (!raw) return true;
                            const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (!cleaned || cleaned.length < 4) return true;
                            // Any string containing alphabetical letters (e.g. "Yes / To be followed", "TBF", "Pending", "N/A") is text/placeholder, not a numeric ID!
                            if (/[A-Z]/.test(cleaned)) return true;
                            return ['YES', 'NO', 'TOBEFOLLOWED', 'YESTOBEFOLLOWED', 'NA', 'NONE', 'PENDING', 'TBF'].includes(cleaned);
                        };

                        const strVal = String(f.value || '').trim().toUpperCase().replace(/[^0-9]/g, '');
                        const dupItem = !isTextOrPlaceholder(f.value) && strVal && strVal.length >= 5
                            ? arr.find(other =>
                                other.field !== f.field &&
                                !isTextOrPlaceholder(other.value) &&
                                String(other.value || '').trim().toUpperCase().replace(/[^0-9]/g, '') === strVal
                            )
                            : null;

                        return (
                            <div key={i} className={cn("px-6 py-4 border-r last:border-0 border-surface-100 relative transition-colors", dupItem && "bg-amber-50/80")}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-[9px] font-black text-surface-400 uppercase tracking-wider">{f.label}</p>
                                    {dupItem && (
                                        <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-300 rounded cursor-help"
                                            title={`⚠️ Warning: Exact same ID number matches ${dupItem.label} field!`}
                                        >
                                            <AlertTriangle size={10} className="text-amber-600 animate-bounce" />
                                            Duplicate
                                        </span>
                                    )}
                                </div>
                                <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} placeholder="—" />
                            </div>
                        );
                    })}
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
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 grid grid-cols-2 divide-x divide-[#E1E1E1]">
                                    <div className="px-4 py-3">
                                        <p className="text-[11px] text-[#616161] mb-0.5">Current Address</p>
                                        <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={applicant.pis?.current_address ?? (applicant as any).current_address ?? applicant.metadata?.current_address ?? applicant.metadata?.background?.currentAddress ?? ''} field="current_address" placeholder="—" fullWidth />
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-[11px] text-[#616161] mb-0.5">Permanent Address</p>
                                        <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={applicant.pis?.permanent_address ?? (applicant as any).permanent_address ?? applicant.metadata?.permanent_address ?? applicant.metadata?.background?.permanentAddress ?? ''} field="permanent_address" placeholder="—" fullWidth />
                                    </div>
                                </div>
                            </div>

                            {/* Education */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Education</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 grid grid-cols-5 divide-x divide-[#E1E1E1]">
                                    {[
                                        { label: 'Highest Education', value: applicant.pis?.highest_education ?? (applicant as any).highest_education ?? applicant.metadata?.highest_education ?? applicant.metadata?.background?.education ?? '', field: 'highest_education' },
                                        { label: 'School / University', value: applicant.pis?.school_name ?? (applicant as any).school_name ?? applicant.metadata?.school_name ?? applicant.metadata?.background?.schoolName ?? '', field: 'school_name' },
                                        { label: 'Degree / Course', value: applicant.pis?.course_strand ?? applicant.pis?.degree ?? (applicant as any).course_strand ?? (applicant as any).degree ?? applicant.metadata?.course_strand ?? applicant.metadata?.degree ?? applicant.metadata?.background?.shsStrand ?? '', field: 'course_strand' },
                                        { label: 'Year Level', value: applicant.pis?.course_year ?? (applicant as any).course_year ?? applicant.metadata?.course_year ?? '', field: 'course_year' },
                                        { label: 'Inclusive Years', value: applicant.pis?.school_year_attended ?? (applicant as any).school_year_attended ?? applicant.metadata?.school_year_attended ?? '', field: 'school_year_attended' },
                                    ].map((f, i) => (
                                        <div key={i} className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                            <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} placeholder="—" />
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-0 border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 grid grid-cols-4 divide-x divide-[#E1E1E1]">
                                    {[
                                        { label: 'Graduation Status', value: (applicant.pis?.is_graduated || applicant.metadata?.is_graduated || applicant.metadata?.background?.isGraduated) ? 'Graduated' : 'Undergraduate', field: 'is_graduated' },
                                        { label: 'Semesters Completed', value: applicant.pis?.num_semesters ?? (applicant as any).num_semesters ?? applicant.metadata?.num_semesters ?? '', field: 'num_semesters' },
                                        { label: 'Future Studies', value: applicant.pis?.plans_to_pursue_studies ?? (applicant as any).plans_to_pursue_studies ?? applicant.metadata?.plans_to_pursue_studies ?? applicant.metadata?.background?.pursueStudies ?? '', field: 'plans_to_pursue_studies' },
                                        { label: 'Plans Abroad', value: applicant.pis?.plans_to_go_abroad ?? (applicant as any).plans_to_go_abroad ?? applicant.metadata?.plans_to_go_abroad ?? applicant.metadata?.background?.goAbroad ?? '', field: 'plans_to_go_abroad' },
                                    ].map((f, i) => (
                                        <div key={i} className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                            <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} placeholder="—" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Work Experience */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={13} className="text-[#0078D4]" />
                                        <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Work Experience</p>
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => handleAddArrayItem('work_experience', { position: '', company: '', duration_from: '', duration_to: '', description: '' })} className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1">
                                            + Add Work Experience
                                        </button>
                                    )}
                                </div>
                                {(() => {
                                    const workExp = (applicant.pis?.work_experience && applicant.pis.work_experience.length > 0)
                                        ? applicant.pis.work_experience
                                        : (applicant.metadata?.work_experience || (applicant as any).work_experience || []);
                                    return (workExp.length > 0 || isEditing) ? (
                                        <div className="space-y-1.5">
                                            {workExp.map((exp: WorkExperience, i: number) => (
                                                <div key={i} className="bg-white dark:bg-slate-900 border border-[#E1E1E1] rounded-none px-4 py-3 relative group">
                                                    {isEditing && (
                                                        <button onClick={() => handleRemoveArrayItem('work_experience', i)} className="absolute top-2 right-2 text-rose-500 opacity-50 hover:opacity-100 z-10">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 mr-6">
                                                            {isEditing ? (
                                                                <>
                                                                    <input value={exp.position || ''} onChange={e => handleArrayChange('work_experience', i, 'position', e.target.value)} className="text-[13px] font-semibold text-[#242424] bg-white dark:bg-slate-900 border border-surface-300 px-2 py-1 w-full mb-1 outline-none focus:border-[#0078D4]" placeholder="Position" />
                                                                    <input value={exp.company || ''} onChange={e => handleArrayChange('work_experience', i, 'company', e.target.value)} className="text-[11px] text-[#616161] bg-white dark:bg-slate-900 border border-surface-300 px-2 py-1 w-full outline-none focus:border-[#0078D4]" placeholder="Company" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="text-[13px] font-semibold text-[#242424]">{exp.position || 'Untitled Role'}</p>
                                                                    <p className="text-[11px] text-[#616161]">{exp.company}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-[#A0A0A0] whitespace-nowrap ml-4 flex gap-1 items-center">
                                                            {isEditing ? (
                                                                <>
                                                                    <input value={exp.duration_from || ''} onChange={e => handleArrayChange('work_experience', i, 'duration_from', e.target.value)} className="w-16 px-1 py-0.5 border border-surface-300 text-center outline-none focus:border-[#0078D4]" placeholder="From" />
                                                                    →
                                                                    <input value={exp.duration_to || ''} onChange={e => handleArrayChange('work_experience', i, 'duration_to', e.target.value)} className="w-16 px-1 py-0.5 border border-surface-300 text-center outline-none focus:border-[#0078D4]" placeholder="To" />
                                                                </>
                                                            ) : (
                                                                <>{exp.duration_from || '—'} → {exp.duration_to || 'Present'}</>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {isEditing ? (
                                                        <textarea value={exp.description || ''} onChange={e => handleArrayChange('work_experience', i, 'description', e.target.value)} className="text-[11px] text-[#616161] mt-1.5 leading-relaxed bg-white dark:bg-slate-900 border border-surface-300 px-2 py-1 w-full outline-none focus:border-[#0078D4]" placeholder="Description..." rows={2} />
                                                    ) : (
                                                        exp.description && <p className="text-[11px] text-[#616161] mt-1.5 leading-relaxed">{exp.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 border border-[#E1E1E1] rounded-none px-4 py-3">
                                            <span className="text-[#A0A0A0] text-[13px]">No work experience listed</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Skills */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Award size={13} className="text-[#0078D4]" />
                                        <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Skills & Competencies</p>
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => handleAddArrayItem('skills', '')} className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1">
                                            + Add Skill
                                        </button>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-[#E1E1E1] rounded-none px-4 py-3 flex flex-wrap gap-1.5">
                                    {(() => {
                                        const skillsList = (applicant.pis?.skills && applicant.pis.skills.length > 0)
                                            ? applicant.pis.skills
                                            : (applicant.metadata?.skills || (applicant as any).skills || []);
                                        return (skillsList.length > 0 || isEditing) ? (
                                            skillsList.map((s: string, i: number) => (
                                                isEditing ? (
                                                    <div key={i} className="flex items-center border border-surface-300 bg-white dark:bg-slate-900">
                                                        <input value={s} onChange={e => handleArrayChange('skills', i, null, e.target.value)} className="px-2 py-0.5 text-[11px] font-medium outline-none focus:bg-[#EBF3FC]" placeholder="Skill..." />
                                                        <button onClick={() => handleRemoveArrayItem('skills', i)} className="px-1 text-rose-500 hover:bg-rose-50">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span key={i} className="px-2 py-0.5 bg-[#EBF3FC] text-[#0078D4] rounded-none text-[11px] font-medium border border-[#0078D4]/10">{s}</span>
                                                )
                                            ))
                                        ) : (
                                            <span className="text-[#A0A0A0] text-[13px]">No skills listed</span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Languages */}
                            {((applicant.pis?.languages && applicant.pis.languages.length > 0) || isEditing) && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Globe size={13} className="text-[#0078D4]" />
                                            <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Languages</p>
                                        </div>
                                        {isEditing && (
                                            <button onClick={() => handleAddArrayItem('languages', { language: '', proficiency: '' })} className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1">
                                                + Add Language
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 border border-[#E1E1E1] rounded-none px-4 py-3 flex flex-wrap gap-2">
                                        {applicant.pis?.languages?.map((l: Language, i: number) => {
                                            const raw = (l.language && typeof l.language === 'object') ? (l.language as any) : l;
                                            const langName = typeof raw.language === 'string' ? raw.language : String(raw.language || '');
                                            const langProf = typeof raw.proficiency === 'string' ? raw.proficiency : (raw.proficiency ? String(raw.proficiency) : '');

                                            if (isEditing) {
                                                return (
                                                    <div key={i} className="flex items-center border border-surface-300 bg-white dark:bg-slate-900 shadow-sm">
                                                        <input value={langName} onChange={e => handleArrayChange('languages', i, 'language', e.target.value)} className="px-2 py-1 text-[11px] font-medium outline-none w-24 border-r border-surface-200" placeholder="Language" />
                                                        <input value={langProf} onChange={e => handleArrayChange('languages', i, 'proficiency', e.target.value)} className="px-2 py-1 text-[11px] font-medium outline-none w-24" placeholder="Proficiency" />
                                                        <button onClick={() => handleRemoveArrayItem('languages', i)} className="px-2 py-1 text-rose-500 hover:bg-rose-50 border-l border-surface-200">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <span key={i} className="px-2.5 py-1 bg-[#F5F5F5] border border-[#E1E1E1] rounded-none text-[11px] text-[#242424] font-medium">
                                                    {langName}{langProf && <span className="text-[#A0A0A0] ml-1">· {langProf}</span>}
                                                </span>
                                            );
                                        })}
                                        {(!applicant.pis?.languages || applicant.pis.languages.length === 0) && !isEditing && (
                                            <span className="text-[#A0A0A0] text-[13px]">No languages listed</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {((applicant.pis?.certifications && applicant.pis.certifications.length > 0) || isEditing) && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Shield size={13} className="text-[#0078D4]" />
                                            <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Certifications</p>
                                        </div>
                                        {isEditing && (
                                            <button onClick={() => handleAddArrayItem('certifications', { name: '', issuer: '', date: '' })} className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1">
                                                + Add Certification
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {applicant.pis?.certifications?.map((c: Certification, i: number) => (
                                            <div key={i} className="bg-white dark:bg-slate-900 border border-[#E1E1E1] rounded-none px-4 py-2.5 flex items-center justify-between group">
                                                <div className="flex-1 mr-4">
                                                    {isEditing ? (
                                                        <>
                                                            <input value={c.name || ''} onChange={e => handleArrayChange('certifications', i, 'name', e.target.value)} className="text-[13px] font-semibold text-[#242424] bg-white dark:bg-slate-900 border border-surface-300 px-2 py-0.5 w-full mb-1 outline-none focus:border-[#0078D4]" placeholder="Certification Name" />
                                                            <input value={c.issuer || ''} onChange={e => handleArrayChange('certifications', i, 'issuer', e.target.value)} className="text-[11px] text-[#616161] bg-white dark:bg-slate-900 border border-surface-300 px-2 py-0.5 w-full outline-none focus:border-[#0078D4]" placeholder="Issuer" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-[13px] font-semibold text-[#242424]">{c.name}</p>
                                                            <p className="text-[11px] text-[#616161]">{c.issuer}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isEditing ? (
                                                        <input value={c.date || ''} onChange={e => handleArrayChange('certifications', i, 'date', e.target.value)} className="w-20 px-1 py-0.5 border border-surface-300 text-center outline-none focus:border-[#0078D4] text-[11px]" placeholder="Date" />
                                                    ) : (
                                                        c.date && <span className="text-[11px] text-[#A0A0A0]">{c.date}</span>
                                                    )}
                                                    {isEditing && (
                                                        <button onClick={() => handleRemoveArrayItem('certifications', i)} className="text-rose-500 opacity-50 hover:opacity-100">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(!applicant.pis?.certifications || applicant.pis.certifications.length === 0) && !isEditing && (
                                            <span className="text-[#A0A0A0] text-[13px]">No certifications listed</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Family Background */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Users size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Family Background</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 divide-y divide-[#E1E1E1]">
                                    <div className="grid grid-cols-3 divide-x divide-[#E1E1E1]">
                                        {[
                                            { label: 'Spouse Name', field: 'spouse_name', value: applicant.pis?.spouse_name },
                                            { label: 'Spouse Occupation', field: 'spouse_occupation', value: applicant.pis?.spouse_occupation },
                                            { label: 'Children / Siblings', field: 'children_siblings', value: `${applicant.pis?.num_children || 0} Children / ${applicant.pis?.num_siblings || 0} Siblings` },
                                        ].map((f, i) => (
                                            <div key={i} className="px-4 py-3">
                                                <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                                {f.field === 'children_siblings' ? (
                                                    isEditing ? (
                                                        <div className="flex gap-2">
                                                            <input type="number" placeholder="Children" value={applicant.pis?.num_children || ''} onChange={e => handlePISChange('num_children', parseInt(e.target.value) || 0)} className="w-16 px-1 py-0.5 border border-surface-300 text-[12px] outline-none" />
                                                            <input type="number" placeholder="Siblings" value={applicant.pis?.num_siblings || ''} onChange={e => handlePISChange('num_siblings', parseInt(e.target.value) || 0)} className="w-16 px-1 py-0.5 border border-surface-300 text-[12px] outline-none" />
                                                        </div>
                                                    ) : (
                                                        <p className="text-[13px] font-medium text-[#242424]">{f.value}</p>
                                                    )
                                                ) : (
                                                    <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} placeholder="—" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-[#E1E1E1]">
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">Father's Profile</p>
                                            {isEditing ? (
                                                <div className="space-y-1">
                                                    <input value={applicant.pis?.father_name || ''} onChange={e => handlePISChange('father_name', e.target.value)} placeholder="Name" className="w-full px-2 py-1 text-[12px] border border-surface-300 outline-none" />
                                                    <input value={applicant.pis?.father_occupation || ''} onChange={e => handlePISChange('father_occupation', e.target.value)} placeholder="Occupation" className="w-full px-2 py-1 text-[12px] border border-surface-300 outline-none" />
                                                </div>
                                            ) : (
                                                <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.father_name || <span className="text-[#A0A0A0]">—</span>} <span className="text-[#616161] text-[11px] font-normal ml-1">({applicant.pis?.father_occupation || 'N/A'})</span></p>
                                            )}
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-[11px] text-[#616161] mb-0.5">Mother's Profile</p>
                                            {isEditing ? (
                                                <div className="space-y-1">
                                                    <input value={applicant.pis?.mother_name || ''} onChange={e => handlePISChange('mother_name', e.target.value)} placeholder="Name" className="w-full px-2 py-1 text-[12px] border border-surface-300 outline-none" />
                                                    <input value={applicant.pis?.mother_occupation || ''} onChange={e => handlePISChange('mother_occupation', e.target.value)} placeholder="Occupation" className="w-full px-2 py-1 text-[12px] border border-surface-300 outline-none" />
                                                </div>
                                            ) : (
                                                <p className="text-[13px] font-medium text-[#242424]">{applicant.pis?.mother_name || <span className="text-[#A0A0A0]">—</span>} <span className="text-[#616161] text-[11px] font-normal ml-1">({applicant.pis?.mother_occupation || 'N/A'})</span></p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 divide-x divide-[#E1E1E1]">
                                        {[
                                            { label: 'Emergency Contact', field: 'emergency_contact_name', value: applicant.pis?.emergency_contact_name },
                                            { label: 'Relationship', field: 'emergency_contact_relationship', value: applicant.pis?.emergency_contact_relationship },
                                            { label: 'Contact Number', field: 'emergency_contact_phone', value: applicant.pis?.emergency_contact_phone },
                                        ].map((f, i) => (
                                            <div key={i} className="px-4 py-3">
                                                <p className="text-[11px] text-[#616161] mb-0.5">{f.label}</p>
                                                <EditableField isEditing={isEditing} handlePISChange={handlePISChange} value={f.value} field={f.field} placeholder="—" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Medical Declaration */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Activity size={13} className="text-[#0078D4]" />
                                        <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Medical Declaration</p>
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => handleAddArrayItem('medical_conditions', '')} className="text-[11px] font-bold text-[#0078D4] hover:underline flex items-center gap-1">
                                            + Add Medical Condition
                                        </button>
                                    )}
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 p-5 space-y-5">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Alcohol', field: 'drinks_alcohol', val: applicant.pis?.drinks_alcohol },
                                            { label: 'Smoker', field: 'smokes', val: applicant.pis?.smokes },
                                            { label: 'Pregnant', field: 'is_pregnant', val: applicant.pis?.is_pregnant },
                                            { label: 'Health Issues', field: 'has_medical_conditions', val: applicant.pis?.has_medical_conditions },
                                        ].map((m, i) => (
                                            <div key={i} className={`flex items-center justify-between px-3 py-2 border rounded-none ${m.val ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                                                <span className="text-[11px] font-semibold text-gray-700">{m.label}</span>
                                                {isEditing ? (
                                                    <button onClick={() => handlePISChange(m.field as keyof PersonalInfoSheet, !m.val)} className={`text-[10px] font-bold uppercase ${m.val ? 'text-orange-600' : 'text-green-600'}`}>
                                                        {m.val ? 'Yes' : 'No'}
                                                    </button>
                                                ) : (
                                                    <span className={`text-[10px] font-bold uppercase ${m.val ? 'text-orange-600' : 'text-green-600'}`}>
                                                        {m.val ? 'Yes' : 'No'}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {(applicant.pis?.medical_conditions && applicant.pis.medical_conditions.length > 0) || isEditing ? (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[11px] font-bold text-[#616161] mr-1">Condition Checklist:</span>
                                            {(applicant.pis?.medical_conditions as string[] || []).map((c: string, i: number) => (
                                                isEditing ? (
                                                    <div key={i} className="flex items-center border border-surface-300 bg-white dark:bg-slate-900">
                                                        <input value={c} onChange={e => handleArrayChange('medical_conditions', i, null, e.target.value)} className="px-2 py-0.5 text-[11px] font-medium outline-none" placeholder="Condition..." />
                                                        <button onClick={() => handleRemoveArrayItem('medical_conditions', i)} className="px-1 text-rose-500 hover:bg-rose-50">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-none text-[10px] font-medium uppercase tracking-tighter">{c}</span>
                                                )
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-none">
                                        <p className="text-[10px] font-bold text-[#616161] uppercase mb-1">Health Notes / History</p>
                                        {isEditing ? (
                                            <textarea value={applicant.pis?.medical_history_notes || ''} onChange={e => handlePISChange('medical_history_notes', e.target.value)} className="w-full text-[12px] text-gray-700 leading-relaxed border border-surface-300 px-2 py-1 outline-none" rows={3} placeholder="Add clinical history..." />
                                        ) : (
                                            <p className="text-[12px] text-gray-700 leading-relaxed">
                                                {applicant.pis?.medical_history_notes || 'No clinical history reported by applicant.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Affidavit & Authorization */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={13} className="text-[#0078D4]" />
                                    <p className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">Affidavit & Authorization</p>
                                </div>
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 p-5 space-y-4">
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
                                <div className="border border-[#E1E1E1] rounded-none overflow-hidden bg-white dark:bg-slate-900 p-6 text-center">
                                    <p className="text-[10px] text-[#616161] uppercase tracking-[0.2em] mb-4">
                                        Certified that all information provided is true and correct.
                                    </p>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-24 flex items-center justify-center">
                                            {(() => {
                                                const sig = applicant.pis?.signature_data_url ||
                                                    applicant.pis?.signature ||
                                                    (applicant as any).signature_data_url ||
                                                    (applicant as any).signature ||
                                                    applicant.metadata?.signature_data_url ||
                                                    applicant.metadata?.signature;
                                                return sig ? (
                                                    <img src={sig} alt="Signature" className="max-h-20 contrast-125 object-contain" />
                                                ) : (
                                                    <span className="text-[9px] text-[#A0A0A0] uppercase tracking-widest font-black">Record Not Found</span>
                                                );
                                            })()}
                                        </div>
                                        <div className="w-48 h-[1px] bg-[#E1E1E1]" />
                                        <p className="text-[11px] font-bold text-[#242424] uppercase tracking-widest">{applicant.pis?.full_name || applicant.applicant_name}</p>
                                        <p className="text-[9px] text-[#616161] uppercase">Verified Digitally on {applicant.applied_at ? new Date(applicant.applied_at).toLocaleDateString() : 'Submission'}</p>
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
