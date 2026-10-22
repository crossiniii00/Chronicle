import React from 'react';
import { Application } from '@/types/application';
import { Department } from '@/services/DepartmentService';

export const extractRemarks = (notes: string): string => {
    if (!notes) return '';
    
    const text = notes.trim();
    const lower = text.toLowerCase();

    // 1. Filter out generic pipeline status strings (e.g. "Confirmed Training", "Sent JO and BGC")
    const genericStatuses = [
        'confirmed training', 'confirmed_training',
        'sent jo and bgc', 'sent_jo_and_bgc',
        'for pan', 'for_pan',
        'hired', 'passed', 'failed', 'rejected', 'reprofiled',
        'no show', 'no_show', 'withdrawn', 'pending', 'active'
    ];
    if (genericStatuses.includes(lower)) {
        return '';
    }

    // 2. Filter out Initial Interview Screening Q&A dumps
    const initialScreeningMarkers = [
        'about the company',
        'no plans to pursue studies',
        'comfortable with peme',
        'comfortable with background check',
        'confirms to work on a shifting schedule',
        'have a positive role in the company',
        'no other commitments',
        'no planned events',
        'no plans to go abroad',
        'no medical issues'
    ];
    if (initialScreeningMarkers.some(m => lower.includes(m))) {
        return '';
    }

    const isBackgroundText = (str: string): boolean => {
        if (!str) return false;
        const u = str.toUpperCase();
        return (
            u.includes('YEARS OLD') ||
            u.includes('BACHELOR OF') ||
            u.includes('LEFT THE COMPANY') ||
            u.includes('HIGHEST EDUCATION') ||
            u.includes('COLLEGE GRADUATE') ||
            u.includes('TELEPERFORMANCE') ||
            u.includes('CONCENTRIX') ||
            u.includes('WIPRO') ||
            u.includes('CLAIMS PROCESSING SPECIALIST') ||
            u.includes('HAS ONE DAUGHTER') ||
            u.includes('HAS ONE SON') ||
            /^\s*\d{2}\s*YEARS\s*OLD/i.test(str)
        );
    };

    // 1. If there is an explicit Remarks / Comments section, extract text after it
    const remarksMatch = text.match(/(?:Validator\s+Remarks|Ops\s+Val\s+Remarks|Interviewer\s+Remarks|Remarks|Comments|Feedback):?\s*\n*([\s\S]*)$/i);
    if (remarksMatch && remarksMatch[1].trim()) {
        const extracted = remarksMatch[1].trim();
        // Ensure extracted portion isn't just a questionnaire footer or single word ratings
        if (!/^(YES\.|NO\.|N\/A|\d+\/\d+)$/i.test(extracted)) {
            return extracted;
        }
    }

    // 2. Check if the text is an Initial Interview Rubric or Questionnaire block or Background Summary
    const isRubricOrQuestionnaire = (str: string): boolean => {
        const u = str.toUpperCase();
        return (
            u.includes('INTERVIEWER ASSESSMENT RUBRIC') ||
            u.includes('APPLICANT BACKGROUND & EXP') ||
            u.includes('ACCENT:') ||
            u.includes('PRONUNCIATION:') ||
            u.includes('GRAMMAR & VOCABULARY:') ||
            u.includes('FLUENCY & COMPREHENSION:') ||
            u.includes('RATINGS & CLASSIFICATIONS') ||
            u.includes('BPO EXPERIENCE') ||
            u.includes('HIGHEST EDUCATIONAL BACKGROUND') ||
            u.includes('MODE OF TRANSPORTATION') ||
            u.includes('[CATEGORY ') ||
            u.includes('FILIPINO SOUNDING') ||
            isBackgroundText(str)
        );
    };

    if (isRubricOrQuestionnaire(text)) {
        return '';
    }

    // Strip out questionnaire headers if present
    const cleanedText = text.split(/\n\s*\n\d{4}-\d{2}-\d{2}\s*\n/)[0].trim();

    // Deduplicate any repeated blocks or lines caused by the old concatenation bug
    const lines = cleanedText.split('\n');
    const uniqueLines = [];
    const seen = new Set();
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
            uniqueLines.push(''); // Preserve blank lines for spacing
            continue;
        }
        
        // Remove duplicate timestamps (e.g., '2026-07-22') and completely identical remark lines
        if (!seen.has(trimmed)) {
            seen.add(trimmed);
            uniqueLines.push(line); // push the original line to keep intentional indentations if any
        }
    }
    
    // Join back, collapse 3+ newlines into double newlines, and trim ends
    return uniqueLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const renderAccountLogo = (dep: Department) => {
    if (dep.accountImageData) {
        return <img src={dep.accountImageData} alt={dep.name} className="w-4 h-4 rounded object-cover shrink-0" />;
    }
    if (dep.accountImageUrl) {
        const url = dep.accountImageUrl.startsWith('/') ? `/api${dep.accountImageUrl}` : dep.accountImageUrl;
        return <img src={url} alt={dep.name} className="w-4 h-4 rounded object-cover shrink-0" />;
    }

    const name = (dep.name || '').trim().toLowerCase();

    if (name.includes('nvidia')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#76B900] text-black flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="NVIDIA">
                NV
            </div>
        );
    }
    if (name.includes('amd')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#ED1C24] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="AMD">
                A
            </div>
        );
    }
    if (name.includes('microsoft')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#00A4EF] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="Microsoft">
                MS
            </div>
        );
    }
    if (name.includes('apple')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#000000] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="Apple">
                
            </div>
        );
    }
    if (name.includes('amazon')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#FF9900] text-slate-950 flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="Amazon">
                a
            </div>
        );
    }
    if (name.includes('google')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#4285F4] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none shadow-xs" title="Google">
                G
            </div>
        );
    }

    if (name.includes('abbott')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#008BB0] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="Abbott">
                A
            </div>
        );
    }
    if (name.includes('ambience air')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-cyan-500 to-sky-400 text-white flex items-center justify-center font-black text-[8px] shrink-0 select-none" title="Ambience Air">
                AA
            </div>
        );
    }
    if (name.includes('auto approve')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-[8px] shrink-0 select-none" title="Auto Approve">
                AA
            </div>
        );
    }
    if (name.includes('doordash')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#FF3008] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="DoorDash">
                D
            </div>
        );
    }
    if (name.includes('enercare')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#E35205] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="Enercare">
                E
            </div>
        );
    }
    if (name.includes('abbott')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#4A2E80] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="Abbott">
                E
            </div>
        );
    }
    if (name.includes('flair')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#E1005B] text-white flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="Flair Airlines">
                F
            </div>
        );
    }
    if (name.includes('tennis')) {
        return (
            <div className="w-4 h-4 rounded-sm bg-[#a3e635] text-surface-900 flex items-center justify-center font-black text-[9px] shrink-0 select-none" title="Tennis Channel">
                T
            </div>
        );
    }

    const firstLetter = dep.name.charAt(0).toUpperCase();
    return (
        <div className="w-4 h-4 rounded-sm bg-surface-200 text-surface-600 flex items-center justify-center font-black text-[8px] shrink-0 border border-surface-300 select-none" title={dep.name}>
            {firstLetter}
        </div>
    );
};

export const getEvaluationAttempts = (applicant: Application, candidateApplications: Application[]) => {
    const attempts: Array<{
        account: string;
        status: 'PASSED' | 'FAILED' | 'PENDING';
        validatorName?: string;
        validatorEmail?: string;
        notes?: string;
        date?: string;
    }> = [];

    const history = applicant.pis?.reprofile_history || applicant.metadata?.reprofile_history || [];
    const failedList = applicant.metadata?.failed_accounts || [];
    const failedSet = new Set(failedList.map((f: any) => String(f).trim().toUpperCase()));

    // 1. Process historical attempts
    history.forEach((entry: any) => {
        const acc = entry.previous_account || 'Unassigned';
        if (acc === 'Unassigned' || acc === '---' || !acc) return;

        const isFailed = failedSet.has((acc || '').trim().toUpperCase()) ||
            entry.previous_ops_validator_status?.toUpperCase() === 'FAILED' ||
            entry.status === 'MOVED_TO_REPROFILE';

        attempts.push({
            account: acc,
            status: isFailed ? 'FAILED' : 'PASSED',
            validatorName: entry.previous_ops_validator_name,
            validatorEmail: entry.previous_ops_validator_email,
            notes: entry.previous_ops_validator_notes,
            date: entry.changed_at
        });
    });

    // 2. Process current account attempt
    const currentAcc = applicant.department ? applicant.department.split(',').map(s => s.trim()).filter(Boolean).pop() || '' : '';
    if (currentAcc) {
        if (!attempts.some(a => a.account.toUpperCase() === currentAcc.toUpperCase())) {
            const isReprofileScenario = (applicant.metadata?.is_reprofiled === true || applicant.metadata?.is_reprofiled === 'true') ||
                (failedList.length > 0 && (applicant.department || '').split(',').filter(d => !failedSet.has(d.trim().toUpperCase())).length > 0);
            const isCurrentFailed = failedSet.has(currentAcc.toUpperCase()) ||
                (!isReprofileScenario && ['REJECTED', 'FAILED'].includes(applicant.current_status));
            const isCurrentPassed = ['PASSED', 'HIRED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FOR_JOB_OFFER', 'FOR JOB OFFER'].includes(applicant.current_status) ||
                (!isReprofileScenario && (applicant.pis?.ops_validator_status === 'Passed' || applicant.metadata?.endorsement_confirmed === true));

            attempts.push({
                account: currentAcc,
                status: isCurrentFailed ? 'FAILED' : (isCurrentPassed ? 'PASSED' : 'PENDING'),
                validatorName: applicant.assigned_ops_validator_name,
                validatorEmail: applicant.pis?.ops_validator_email || applicant.metadata?.ops_validator_email,
                notes: applicant.final_interview_notes || applicant.pis?.ops_validator_notes,
                date: applicant.updated_at || applicant.applied_at
            });
        }
    }

    // 3. Add any other failed accounts that are not in attempts
    failedList.forEach((failedAcc: string) => {
        if (!attempts.some(a => a.account.toUpperCase() === (failedAcc || '').trim().toUpperCase())) {
            const matchingApp = candidateApplications.find(a =>
                a.department &&
                a.department.split(',').map(s => s.trim().toUpperCase()).includes((failedAcc || '').trim().toUpperCase()) &&
                ((a.final_verdict as string) === 'FAILED' || a.final_verdict === 'REJECTED' || a.current_status === 'FAILED' || a.current_status === 'REJECTED')
            );

            attempts.push({
                account: (failedAcc || '').trim(),
                status: 'FAILED',
                validatorName: matchingApp?.assigned_ops_validator_name || (matchingApp?.pis as any)?.assigned_ops_validator_name,
                validatorEmail: matchingApp?.pis?.ops_validator_email || matchingApp?.metadata?.ops_validator_email,
                notes: matchingApp?.final_interview_notes || matchingApp?.pis?.ops_validator_notes,
                date: matchingApp?.updated_at || matchingApp?.applied_at || applicant.updated_at
            });
        }
    });

    return attempts;
};

export const replacePlaceholders = (text: string, app: Application, validatorName: string, dateStr: string) => {
    if (!text) return '';
    return text
        .replace(/{{candidate_name}}/gi, app.applicant_name)
        .replace(/{{position_title}}/gi, app.position_title || 'Candidate')
        .replace(/{{department}}/gi, app.department || 'General')
        .replace(/{{validator_name}}/gi, validatorName)
        .replace(/{{date}}/gi, dateStr)
        .replace(/{{schedule}}/gi, dateStr);
};

export const formatBodyText = (text: string) => {
    if (!text) return '';
    let formatted = text.trim();

    // Dynamic sentence separation to organize the single-line layout into premium paragraph breaks
    formatted = formatted
        .replace(/(Hello\s+[^,]+,)/gi, "$1\n\n")
        .replace(/(We would like to invite you[^.]+\.)/gi, "$1\n\n")
        .replace(/(Please be in[^.]+\.)/gi, "$1\n\n")
        .replace(/(We are located on[^.]+\.)/gi, "$1\n\n")
        .replace(/(Bring any Valid ID[^.]+\.)/gi, "$1\n\n")
        .replace(/(Thank you!)/gi, "\n\n$1");

    return formatted.replace(/\n{3,}/g, '\n\n').trim();
};

export const formatDateWithWeekday = (dateVal: string | Date) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';

    const dayName = d.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'Asia/Manila' });
    const dateStr = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });

    return `${dayName}, ${dateStr}, ${timeStr}`;
};
