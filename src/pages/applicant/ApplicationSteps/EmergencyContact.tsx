import React from 'react';
import { ArrowLeft, ArrowRight, Upload } from 'lucide-react';

interface EmergencyContactProps {
    form: {
        emergency_contact_name: string;
        emergency_contact_phone: string;
        emergency_contact_relationship: string;
    };
    updateForm: (field: string, value: string) => void;
    resumeFile: File | null;
    setResumeFile: (file: File | null) => void;
    onBack: () => void;
    onNext: () => void;
}

function Field({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const className = 'w-full rounded-sm border border-surface-200 px-4 py-3 text-sm';
    return (
        <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-surface-500">{label}</span>
            <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={className} />
        </label>
    );
}

export function EmergencyContact({ form, updateForm, resumeFile, setResumeFile, onBack, onNext }: EmergencyContactProps) {
    return (
        <div className="min-h-screen bg-surface-50 py-12 px-4">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <button onClick={onBack} className="inline-flex items-center gap-2 text-surface-600 hover:text-surface-900">
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <div className="text-sm text-surface-500">
                            Step 4 of 5: Emergency Contact & Resume
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-sm border border-surface-200 p-8 shadow-sm">
                    <h1 className="mb-6 text-2xl font-bold text-surface-900">Emergency Contact and Resume</h1>
                    
                    <div className="space-y-8">
                        {/* Emergency Contact Section */}
                        <section>
                            <h2 className="text-lg font-bold text-surface-900 mb-4">Emergency Contact</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Contact Name *" value={form.emergency_contact_name} onChange={(value) => updateForm('emergency_contact_name', value)} />
                                <Field label="Contact Phone *" value={form.emergency_contact_phone} onChange={(value) => updateForm('emergency_contact_phone', value)} />
                                <div className="md:col-span-2">
                                    <Field label="Relationship" value={form.emergency_contact_relationship} onChange={(value) => updateForm('emergency_contact_relationship', value)} />
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-surface-500">
                                Please provide someone we can contact in case of emergency
                            </p>
                        </section>

                        {/* Resume Upload Section */}
                        <section>
                            <h2 className="text-lg font-bold text-surface-900 mb-4">Resume Upload</h2>
                            <div className="border-2 border-dashed border-surface-300 rounded-lg p-6">
                                <div className="text-center">
                                    <Upload size={48} className="mx-auto text-surface-400 mb-4" />
                                    <div className="mb-4">
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-sm hover:bg-primary-700">
                                            <span>Choose Resume File</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-sm text-surface-500">
                                        Accepted formats: PDF, DOC, DOCX
                                    </p>
                                    {resumeFile && (
                                        <div className="mt-4 p-3 bg-surface-50 rounded-lg">
                                            <p className="text-sm font-medium text-surface-900">
                                                Selected: {resumeFile.name}
                                            </p>
                                            <p className="text-xs text-surface-500">
                                                Size: {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-6 py-3 border border-surface-300 rounded-sm text-surface-700 hover:bg-surface-50"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <button
                            onClick={onNext}
                            disabled={!resumeFile}
                            className="inline-flex items-center gap-2 rounded-sm bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Next: Typing Test
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
