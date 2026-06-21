import React from 'react';
import { TypingTestComponent } from '@/components/features/TypingTest/TypingTestComponent';
import { PersonalInfo } from './ApplicationSteps/PersonalInfo';
import { Education } from './ApplicationSteps/Education';
import { Skills } from './ApplicationSteps/Skills';
import { FamilyBackground } from './ApplicationSteps/FamilyBackground';
import { MedicalInfo } from './ApplicationSteps/MedicalInfo';
import { WorkExperienceStep } from './ApplicationSteps/WorkExperienceStep';
import { SignatureStep } from './ApplicationSteps/SignatureStep';
import { SourceStep } from './ApplicationSteps/SourceStep';
import { EmergencyContact } from './ApplicationSteps/EmergencyContact';
import { useApplicationFlow } from './hooks/useApplicationFlow';
import { SuccessView, TypingIntro, ReviewView, VoidedView } from './components/ApplicationFlowUI';

export function ApplicationFlow() {
    const {
        form, updateForm, workExperience, setWorkExperience,
        currentStep, setCurrentStep, handleNext, handleBack,
        selectedPosition, resumeFile, setResumeFile,
        photoDataUrl, setPhotoDataUrl,
        submitting, submitted, typingTestResult, uploadProgress, submittedQueueNumber,
        handleTypingTestComplete, handleTypingTestCancel, submitApplication, navigate,
        fillDemoData
    } = useApplicationFlow();

    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [currentStep, submitted]);

    if (submitted) return <SuccessView typingTestResult={typingTestResult} queueNumber={submittedQueueNumber} onBack={() => navigate('/jobs')} />;

    switch (currentStep) {
        case 1: return <PersonalInfo form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} selectedPosition={selectedPosition} resumeFile={resumeFile} setResumeFile={setResumeFile} photoDataUrl={photoDataUrl} setPhotoDataUrl={setPhotoDataUrl} onDemoFill={fillDemoData} />;
        case 2: return <FamilyBackground form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} />;
        case 3: return <Education form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} />;
        case 4: return <WorkExperienceStep workExperience={workExperience} setWorkExperience={setWorkExperience} onBack={handleBack} onNext={handleNext} />;
        case 5: return <MedicalInfo form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} />;
        case 6: return <SourceStep form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} />;
        case 7: return <SignatureStep form={form} updateForm={updateForm} onBack={handleBack} onNext={handleNext} />;
        case 8: return <TypingIntro onBack={handleBack} onStart={() => setCurrentStep(9)} />;
        case 9: return (
            <div 
                className="min-h-screen w-full relative text-white pt-36 pb-16 px-4 overflow-x-hidden brand-gradient flex flex-col items-center justify-start"
                style={{ 
                    fontFamily: "'Mulish', 'Segoe UI', 'Inter', sans-serif"
                }}
            >
                {/* Cinematic Background Glow Elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#ef3e36]/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '6s' }} />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#622B89]/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDuration: '8s' }} />
                </div>

                {/* Premium Transparent Header */}
                <header className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-6 md:px-10 py-5 bg-black/20 backdrop-blur-xl border-b border-white/10 text-white">
                    <div className="flex items-center gap-4 cursor-pointer group">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20">
                            <img src="/contactpoint-logo.png?v=2" alt="CP360" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h1 className="text-white font-black text-[15px] tracking-[0.1em] uppercase leading-none">
                                ContactPoint<span className="text-[#ef3e36]">360</span>
                            </h1>
                            <span className="text-white/60 font-black text-[9px] tracking-[0.3em] uppercase mt-1">
                                Talent Acquisition
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <button 
                            onClick={handleTypingTestCancel} 
                            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            <span>← Back to Application</span>
                        </button>
                        <div className="h-4 w-[1px] bg-white/20" />
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#ef3e36] bg-[#ef3e36]/10 px-3.5 py-2 border border-[#ef3e36]/20 rounded-full">
                            Typing Test
                        </div>
                    </div>
                </header>

                <div className="w-full max-w-2xl relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-14rem)]">
                    <TypingTestComponent applicantName={form.full_name} applicantEmail={form.email} onComplete={handleTypingTestComplete} onCancel={handleTypingTestCancel} />
                </div>
            </div>
        );
        case 10: return <ReviewView typingTestResult={typingTestResult} submitting={submitting} uploadProgress={uploadProgress} onSubmit={submitApplication} onEdit={() => setCurrentStep(1)} />;
        case 11: return <VoidedView fullName={form.full_name} onBack={() => navigate('/jobs')} />;
        default: return null;
    }
}
