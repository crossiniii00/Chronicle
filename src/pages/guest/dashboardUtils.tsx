import React, { useState, useEffect } from 'react';
import type { Application } from '@/types/application';

export function isMatchingAccount(app: Application, targetAccount: string) {
    if (!targetAccount) return false;
    
    let activeUpper = targetAccount.trim().toUpperCase();
    if (activeUpper === 'ABBOTT' || activeUpper === 'ABBOT') activeUpper = 'ABBOT';
    
    const metadata = app.metadata || {};
    const pis = (app as any).pis || {};

    const reprofileActive = String(metadata.reprofile_active_account || pis.reprofile_active_account || '').trim().toUpperCase();
    if (reprofileActive) {
        let cleanReprofile = reprofileActive;
        if (cleanReprofile === 'ABBOTT' || cleanReprofile === 'ABBOT') cleanReprofile = 'ABBOT';
        return cleanReprofile.includes(activeUpper) || activeUpper.includes(cleanReprofile);
    }

    // Check account_schedules if it exists and has keys. If a candidate was scheduled, they should ONLY appear in the scheduled account(s).
    const accountSchedules = metadata.account_schedules || {};
    const scheduledAccountKeys = Object.keys(accountSchedules).map(k => k.trim().toUpperCase());
    
    // Check if the candidate is considered "Scheduled"
    const meetingDate = (app.endorsement_meeting_date || metadata.endorsement_meeting_date || pis?.endorsement_meeting_date || '').trim();
    const isScheduled = Boolean(meetingDate && meetingDate !== '—' && meetingDate !== 'Pending' && meetingDate !== '');
    
    if (scheduledAccountKeys.length > 0) {
        // Find if the active account is among the scheduled accounts
        const isScheduledToActive = scheduledAccountKeys.some(k => {
            let cleanK = k;
            if (cleanK === 'ABBOTT' || cleanK === 'ABBOT') cleanK = 'ABBOT';
            return cleanK === activeUpper || cleanK.includes(activeUpper) || activeUpper.includes(cleanK);
        });
        
        // If they are scheduled, but NOT to this account, they should not appear here!
        if (!isScheduledToActive) {
            return false;
        }
    }

    const candidateAccount = String(
        pis.final_account || metadata.final_account ||
        app.endorsement_account || (app as any).account ||
        app.department || metadata.account || metadata.department || ''
    );
    if (!candidateAccount) return false;
    
    const candidateDepts = candidateAccount.split(',').map(s => {
        let d = s.trim().toUpperCase();
        if (d === 'ABBOTT' || d === 'ABBOT') d = 'ABBOT';
        return d;
    }).filter(Boolean);

    return candidateDepts.some(d => d === activeUpper || d.includes(activeUpper) || activeUpper.includes(d));
}

export function checkValidatorAssignment(app: Application, authUser: any) {
    if (!authUser) return false;
    if (authUser.role === 'admin' || authUser.role === 'super_admin') return true;
    
    // Ops Validators work from a shared pool, so for their active account, all candidates are considered theirs.
    // Filtering by the active account is done before calling this function.
    if (authUser.role === 'ops_validator' || (authUser.role && (authUser.role.startsWith('custom') || authUser.role.startsWith('custom_')))) {
        return true;
    }

    const assignedId = String(app.assigned_ops_validator_id || '').trim();
    const assignedName = String(app.assigned_ops_validator_name || '').trim().toLowerCase();
    const validatorEmail = String(app.pis?.ops_validator_email || '').trim().toLowerCase();

    const userEmail = String(authUser.email || '').trim().toLowerCase();
    const userName = String(authUser.full_name || '').trim().toLowerCase();
    const userId = String(authUser.id || authUser.uuid || '').trim();

    const matchesId = userId && assignedId === userId;
    const matchesEmail = userEmail && validatorEmail === userEmail;
    const matchesName = userName && assignedName === userName;

    return !!(matchesId || matchesEmail || matchesName);
}

export function AnimatedNumber({ value }: { value: number | string }) {
    const isPercent = typeof value === 'string' && value.endsWith('%');
    const numericVal = typeof value === 'number' ? value : parseInt(value) || 0;
    const [displayVal, setDisplayVal] = useState(0);

    useEffect(() => {
        const start = 0;
        const end = numericVal;
        if (start === end) {
            setDisplayVal(end);
            return;
        }
        const duration = 0.5; // seconds
        const startTime = performance.now();
        
        let animationFrameId: number;
        const update = (now: number) => {
            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const ease = progress * (2 - progress); // easeOutQuad
            const current = Math.round(start + (end - start) * ease);
            setDisplayVal(current);
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(update);
            }
        };
        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [numericVal]);

    return <span>{displayVal}{isPercent ? '%' : ''}</span>;
}
