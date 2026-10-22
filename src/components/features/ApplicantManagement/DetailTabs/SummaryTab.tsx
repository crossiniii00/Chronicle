import React, { useState, useEffect } from 'react';
import { Loader2, Bot, FileText, AlertTriangle } from 'lucide-react';
import type { Application } from '@/types/application';
import { AIService } from '@/services/AIService';
import { getStatusLabel } from '@/utils/formatters';

interface SummaryTabProps {
    applicant: Application;
}

export function SummaryTab({ applicant }: SummaryTabProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiUsed, setIsAiUsed] = useState(false);

    useEffect(() => {
        if (!applicant) return;
        generateSummary();
    }, [applicant.id]);

    const generateFallbackSummary = () => {
        setIsAiUsed(false);
        const pis = applicant.pis || {};
        const meta = applicant.metadata || {};
        
        const experienceStr = (pis.work_experience || []).length > 0 
            ? `${pis.work_experience!.length} prior work experiences listed (Latest: ${pis.work_experience![0]?.company || 'Unknown'})` 
            : 'No prior work experience listed';
            
        const typingStr = applicant.typing_test_wpm 
            ? `${applicant.typing_test_wpm} WPM / ${applicant.typing_test_accuracy || 0}% Accuracy` 
            : 'No typing test completed';
            
        const assessmentStr = applicant.assessment_score 
            ? `Score: ${applicant.assessment_score}` 
            : 'No assessment completed';

        const initialVerdict = meta.initial_interview_verdict || pis.initial_interview_result || pis.initial_specific_status || 'Pending / No Data';
        const opsValVerdict = meta.ops_val_verdict || pis.final_verdict || pis.final_specific_status || meta.final_specific_status || 'Pending / No Data';
        // Initial Interview Notes / Responses
        const initialNotes = applicant.interview_notes || meta.initial_interviewer_remarks || 'None';
        
        // Ops Val Remarks logic (simplified from PISDashboardModal)
        const getOpsValidatorRemarks = () => {
            const directNotes = meta.pis_ops_validator_notes || meta.ops_validator_notes || meta.ops_validation_remarks || '';
            if (directNotes) return directNotes;
            const responses = applicant.interview_responses || {};
            const responseNotes = String(responses['pis_ops_validator_notes'] || responses['ops_validator_notes'] || responses['ops_validation_remarks'] || '');
            if (responseNotes) return responseNotes;
            return applicant.final_interview_notes || meta.final_interviewer_remarks || 'None';
        };
        const opsValRemarks = getOpsValidatorRemarks();
        const opsValidator = applicant.assigned_ops_validator_name || 'Unassigned';

        // Extract key responses for programmatic view
        const responses = applicant.interview_responses || {};
        const responseKeys = Object.keys(responses).filter(k => 
            responses[k] && 
            responses[k] !== '---' && 
            !k.toLowerCase().includes('ops_val') && 
            !k.toLowerCase().includes('validator')
        );
        const responseBullets = responseKeys.length > 0 
            ? responseKeys.slice(0, 5).map(k => `  - **${k.length > 30 ? k.substring(0,30)+'...' : k}:** ${String(responses[k]).substring(0, 50)}...`).join('\n')
            : '  - No specific Q&A recorded';

        const fallback = `
**Candidate Overview:**
- **Name:** ${applicant.applicant_name}
- **Applied For:** ${applicant.position_title || 'Unassigned'}
- **Current Status:** ${getStatusLabel(applicant.current_status)}

**Key Metrics & Background:**
- **Experience:** ${experienceStr}
- **Typing Performance:** ${typingStr}
- **Assessment:** ${assessmentStr}
- **Education:** ${pis.highest_education || 'Not specified'}

**Interview Results:**
- **Initial Interview:** ${initialVerdict}
  - Remarks: ${initialNotes}
${responseBullets}
- **Ops Val (Final) Interview:** ${opsValVerdict}
  - Validator: ${opsValidator}
  - Remarks: ${opsValRemarks}

**Contact Details:**
- **Email:** ${pis.email || meta.email || 'N/A'}
- **Phone:** ${pis.phone || meta.phone || 'N/A'}
        `.trim();

        setSummary(fallback);
    };

    const generateSummary = async () => {
        setIsLoading(true);
        try {
            // Check if AI is available
            const status = await AIService.getStatus().catch(() => null);
            if (!status || (!status.openaiConfigured && !status.anthropicConfigured && !status.geminiConfigured)) {
                generateFallbackSummary();
                setIsLoading(false);
                return;
            }

            const meta = applicant.metadata || {};
            const pis = applicant.pis || {};
            
            const getOpsValidatorRemarks = () => {
                const directNotes = meta.pis_ops_validator_notes || meta.ops_validator_notes || meta.ops_validation_remarks || '';
                if (directNotes) return directNotes;
                const responses = applicant.interview_responses || {};
                const responseNotes = String(responses['pis_ops_validator_notes'] || responses['ops_validator_notes'] || responses['ops_validation_remarks'] || '');
                if (responseNotes) return responseNotes;
                return applicant.final_interview_notes || meta.final_interviewer_remarks || '';
            };

            // Prepare minimal data for AI to save tokens
            const minData = {
                name: applicant.applicant_name,
                position: applicant.position_title,
                status: applicant.current_status,
                contact: { email: applicant.pis?.email, phone: applicant.pis?.phone },
                experience: applicant.pis?.work_experience?.map(e => ({ company: e.company, role: e.position, duration: `${e.duration_from} to ${e.duration_to}` })),
                education: applicant.pis?.highest_education,
                typing: applicant.typing_test_wpm ? { wpm: applicant.typing_test_wpm, acc: applicant.typing_test_accuracy } : null,
                assessment: applicant.assessment_score,
                interviews: {
                    initial: { 
                        verdict: meta.initial_interview_verdict || pis.initial_interview_result, 
                        remarks: applicant.interview_notes || meta.initial_interviewer_remarks,
                        qa_responses: applicant.interview_responses,
                        grading: applicant.interview_grading
                    },
                    opsVal: { 
                        verdict: meta.ops_val_verdict || pis.final_verdict, 
                        assigned: applicant.assigned_ops_validator_name, 
                        remarks: getOpsValidatorRemarks() 
                    }
                },
                notes: applicant.metadata?.remarks || applicant.metadata?.notes,
            };

            const response = await AIService.chat({
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert HR summarizer. Summarize the provided candidate JSON data into a concise, highly readable format (use bullet points and bold text) for a busy recruiter to skim in 10 seconds. Make sure to analyze the interview Q&A responses, grading, and remarks to provide a strong summary of their initial and final interview performance. Do not add any filler text, just give the summary.'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(minData)
                    }
                ]
            });

            if (response && response.reply) {
                setSummary(response.reply);
                setIsAiUsed(true);
            } else {
                generateFallbackSummary();
            }

        } catch (err) {
            console.error('Failed to generate AI summary:', err);
            generateFallbackSummary();
        } finally {
            setIsLoading(false);
        }
    };

    // basic markdown-to-html for bold and bullets
    const renderSummary = (text: string) => {
        const parts = text.split('\n');
        return parts.map((line, i) => {
            let processed = line;
            // Handle bold **text**
            processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            if (processed.trim().startsWith('- ')) {
                return (
                    <li key={i} className="ml-4 mb-2 text-[13px] text-surface-600 dark:text-surface-300" dangerouslySetInnerHTML={{ __html: processed.replace(/^- /, '') }} />
                );
            }
            if (processed.trim() === '') {
                return <div key={i} className="h-4" />;
            }
            return (
                <p key={i} className="mb-2 text-[13px] text-surface-700 dark:text-surface-200" dangerouslySetInnerHTML={{ __html: processed }} />
            );
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[13px] font-black text-surface-900 dark:text-white uppercase tracking-[0.05em] flex items-center gap-2">
                        Candidate Summary
                    </h3>
                    <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mt-1">
                        {isAiUsed ? 'AI-Generated Overview' : 'Programmatic Overview'}
                    </p>
                </div>
                {isAiUsed ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">
                        <Bot size={14} /> AI Powered
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded text-[10px] font-bold uppercase tracking-wider">
                        <FileText size={14} /> Rule Based
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-surface-700 rounded p-6 shadow-sm min-h-[300px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-surface-400 pt-16">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Generating Summary...</p>
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        {summary ? (
                            <ul className="list-disc pl-2 m-0 marker:text-surface-400">
                                {renderSummary(summary)}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-surface-400 pt-16">
                                <AlertTriangle className="mb-4" size={32} />
                                <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Failed to generate summary</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="mt-4 flex justify-end">
                 <button 
                    onClick={generateSummary}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-[11px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                >
                    <Loader2 size={14} className={isLoading ? 'animate-spin' : 'hidden'} />
                    Regenerate Summary
                </button>
            </div>
        </div>
    );
}
