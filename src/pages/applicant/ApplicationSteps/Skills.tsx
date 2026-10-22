import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface SkillsProps {
    form: {
        skills: string;
        languages: string;
        certifications: string;
    };
    updateForm: (field: string, value: string) => void;
    onBack: () => void;
    onNext: () => void;
}

function Field({ label, value, onChange, textarea = false }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    textarea?: boolean;
}) {
    const className = 'w-full rounded-sm border border-surface-200 px-4 py-3 text-sm';
    return (
        <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-surface-500">{label}</span>
            {textarea
                ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${className} min-h-24`} placeholder="Enter details here..." />
                : <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={className} placeholder="Enter information here..." />
            }
        </label>
    );
}

export function Skills({ form, updateForm, onBack, onNext }: SkillsProps) {
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
                            Step 3 of 5: Skills & Languages
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white dark:bg-slate-900 rounded-sm border border-surface-200 p-8 shadow-sm">
                    <h1 className="mb-6 text-2xl font-bold text-surface-900">Skills and Languages</h1>
                    
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-surface-900 mb-4">Technical Skills</h2>
                            <Field 
                                label="Skills (comma-separated)" 
                                value={form.skills} 
                                onChange={(value) => updateForm('skills', value)} 
                            />
                            <p className="mt-2 text-sm text-surface-500">
                                List your technical skills separated by commas
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-surface-900 mb-4">Languages</h2>
                            <Field 
                                label="Languages (comma-separated)" 
                                value={form.languages} 
                                onChange={(value) => updateForm('languages', value)} 
                            />
                            <p className="mt-2 text-sm text-surface-500">
                                List languages you can speak, read, or write
                            </p>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-surface-900 mb-4">Certifications</h2>
                            <Field 
                                label="Certifications (comma-separated)" 
                                value={form.certifications} 
                                onChange={(value) => updateForm('certifications', value)} 
                                textarea
                            />
                            <p className="mt-2 text-sm text-surface-500">
                                List any relevant certifications you have obtained
                            </p>
                        </div>
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
                            className="inline-flex items-center gap-2 rounded-sm bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700"
                        >
                            Next: Emergency Contact
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
