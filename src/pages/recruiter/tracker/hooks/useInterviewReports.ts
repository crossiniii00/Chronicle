import { useState, useEffect, useCallback, useRef } from 'react';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService } from '@/services/DepartmentService';
import { QuestionService } from '@/services/QuestionService';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import type { Application, ApplicationStatus } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/authStore';
import { buildReprofileQueue, getReprofileQueue } from '@/utils/reprofileQueue';
import { loadReroutedAccounts } from '@/pages/admin/hooks/useAccountTypeSettings';
import { cleanValue } from '../constants';
import { SPECIFIC_STATUS_TO_OVERALL } from '../utils/statusMappings';

// Import sub-hooks
import { useInterviewCollaborative } from './useInterviewCollaborative';
import { useInterviewFilters } from './useInterviewFilters';
import { useInterviewReprofile } from './useInterviewReprofile';
import { useInterviewImport } from './useInterviewImport';
import { useInterviewNotes } from './useInterviewNotes';

const parseFullName = (name: string) => {
    if (!name) return { first: '', middle: '', last: '' };
    const cleanName = name.trim();
    
    // Handle "First Name (Middle Name) Last Name" format
    const parenMatch = cleanName.match(/^(.*?)\s*\((.*?)\)\s*(.*)$/);
    if (parenMatch) {
        return {
            first: parenMatch[1].trim(),
            middle: parenMatch[2].trim(),
            last: parenMatch[3].trim()
        };
    }

    // Fallback: Split by spaces
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
    if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
    
    return {
        first: parts[0],
        middle: parts.slice(1, -1).join(' '),
        last: parts[parts.length - 1]
    };
};

const cleanAccountValue = (val: any): string => {
    if (!val) return '';
    const s = String(val).trim();
    if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
    return s.split(/[|,]/)
        .map(p => p.trim())
        .filter(p => p && p.toLowerCase() !== 'null' && p.toLowerCase() !== 'undefined')
        .join(' | ');
};

const adjustReprofileData = (app: Application, newDept: string, patch: any) => {
    if (app.metadata?.is_reprofiled || (app.metadata?.reprofile_accounts && app.metadata.reprofile_accounts.length > 0)) {
        let currentQueue = getReprofileQueue(app).map(item => item.account);
        if (!currentQueue.some(acc => acc.toLowerCase() === newDept.toLowerCase())) {
            currentQueue = [...currentQueue, newDept];
        }
        patch.metadata = {
            ...(patch.metadata || app.metadata || {}),
            initial_account_assignment: newDept,
            reprofile_active_account: newDept,
            reprofile_accounts: buildReprofileQueue(currentQueue, newDept)
        };
        patch.pis = {
            ...(patch.pis || app.pis || {}),
            initial_account_assignment: newDept
        } as any;
        delete (patch.pis as any).reprofile_accounts;
        delete (patch.pis as any).reprofile_active_account;
        delete (patch.pis as any).reprofile_history;
        delete (patch.pis as any).is_reprofiled;
    }
};

export function useInterviewReports() {
    const { user } = useAuthStore();
    const { error, success } = useToast();
    
    const [applications, setApplications] = useState<Application[]>([]);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);
    const [validators, setValidators] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Bulk Management State
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);

    // Batch changes state: applicationId -> questionId -> response
    const [localChanges, setLocalChanges] = useState<Record<string, Record<string, any>>>({});
    // Mirroring ref that stays synchronously up-to-date even when React hasn't
    // flushed the state update yet. handleSyncAll reads from this ref to avoid
    // the race where the user's edit hasn't been flushed by React when the Save
    // button onClick fires.
    const localChangesRef = useRef<Record<string, Record<string, any>>>({});
    // Keep ref in sync with state for any direct setLocalChanges calls
    // that don't go through the handleInputChange callback.
    useEffect(() => { localChangesRef.current = localChanges; }, [localChanges]);

    // Fullscreen View state
    const [focusedApplicant, setFocusedApplicant] = useState<Application | null>(null);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const [focusPath, setFocusPath] = useState<{ appId: string; colKey: string; colName: string } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [apps, qData, depts, allUsers] = await Promise.all([
                ApplicationService.getAll(),
                QuestionService.getAll(),
                DepartmentService.getAll(),
                UserService.getAll()
            ]);
            setApplications(apps);
            setQuestions(qData);
            setAllDepartments(depts || []);
            setValidators(allUsers.filter((u: any) => u.role === 'ops_validator'));
        } catch (err) {
            console.error('Failed to load reports:', err);
            error('Protocol Error', 'Failed to retrieve aftermath payload.');
        } finally {
            setLoading(false);
        }
    }, [error]);

    // Compose Sub-hooks
    const filters = useInterviewFilters({
        applications,
        questions,
        allDepartments,
        localChanges
    });

    const collab = useInterviewCollaborative({
        user,
        activeTab: filters.activeTab
    });

    const reprofile = useInterviewReprofile({
        user,
        setApplications,
        setLocalChanges,
        success,
        error,
        loadData
    });

    const importer = useInterviewImport({
        applications,
        activeTab: filters.activeTab,
        success,
        error,
        loadData,
        setIsSaving
    });

    const notes = useInterviewNotes({
        applications,
        setApplications,
        success,
        error
    });

    // Real-time synchronization
    useEffect(() => {
        loadData();
        const socket = socketService.getSocket();
        
        socket.on('applications:updated', () => {
            console.log('[Socket] Applications updated, refreshing tracker...');
            loadData();
        });

        const interval = setInterval(loadData, 60000); // Fallback polling
        
        return () => {
            socket.off('applications:updated');
            clearInterval(interval);
        };
    }, [loadData]);

    useEffect(() => {
        if (!isEditing) setFocusPath(null);
    }, [isEditing]);

    const handleInputChange = useCallback((appId: string, qId: string, value: string) => {
        if (qId === 'pis_initial_account_assignment') {
            const app = applications.find(a => a.id === appId);
            const previousAccount = (
                cleanAccountValue(app?.pis?.initial_account_assignment) || 
                cleanAccountValue(app?.metadata?.initial_account_assignment) || 
                cleanAccountValue(app?.department)
            );
            const newAccount = cleanAccountValue(value);
            const isMeaningfulNewAccount = !!newAccount && !['PENDING', 'N/A', '---'].includes(newAccount.toUpperCase());
            const didChangeAccount = !!app && isMeaningfulNewAccount && previousAccount.toLowerCase() !== newAccount.toLowerCase();

            if (app && didChangeAccount) {
                reprofile.setPendingReprofile({ app, previousAccount, newAccount });
            }
        }

        // Broadcast change live
        const socket = socketService.getSocket();
        socket.emit('presence:focus', {
            userId: user?.id,
            fullName: user?.full_name,
            appId,
            field: qId
        });

        socket.emit('applications:typing', {
            appId,
            field: qId,
            value,
            userId: user?.id
        });

        if (qId === 'final_interview_notes') {
            socket.emit('applications:typing', {
                appId,
                field: 'pis_ops_validator_notes',
                value,
                userId: user?.id
            });
        } else if (qId === 'pis_ops_validator_notes' || qId === 'ops_validator_notes') {
            socket.emit('applications:typing', {
                appId,
                field: 'final_interview_notes',
                value,
                userId: user?.id
            });
        }

        setLocalChanges(prev => {
            const currentAppChanges = prev[appId] || {};
            let newChanges = { 
                ...currentAppChanges, 
                [qId]: value 
            };

            // Synchronize final_interview_notes (Remarks) and pis_ops_validator_notes (Ops Val Notes)
            if (qId === 'final_interview_notes') {
                newChanges['pis_ops_validator_notes'] = value;
                const currentApp = applications.find(a => a.id === appId);
                const currentPis = (currentApp?.pis || {}) as any;
                const existingChangesPis = (newChanges['pis'] || {}) as any;
                newChanges['pis'] = {
                    ...currentPis,
                    ...existingChangesPis,
                    ops_validator_notes: value
                };
            } else if (qId === 'pis_ops_validator_notes' || qId === 'ops_validator_notes') {
                newChanges['final_interview_notes'] = value;
                const currentApp = applications.find(a => a.id === appId);
                const currentPis = (currentApp?.pis || {}) as any;
                const existingChangesPis = (newChanges['pis'] || {}) as any;
                newChanges['pis'] = {
                    ...currentPis,
                    ...existingChangesPis,
                    ops_validator_notes: value
                };
            }

            // Automate interview date on interview activity
            const isInterviewField = [
                'pis_initial_interview_results', 'initial_interview_results',
                'pis_final_specific_status', 'final_specific_status',
                'pis_ops_validator_status', 'ops_validator_status',
                'pis_client_interview_status', 'client_interview_status'
            ].includes(qId);

            const isInterviewStatus = qId === 'current_status' && [
                'PASSED', 'FAILED', 'REJECTED', 'HIRED', 'HIRED_PROCESSED',
                'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER'
            ].includes(String(value).toUpperCase());

            if (isInterviewField || isInterviewStatus) {
                const currentApp = applications.find(a => a.id === appId);
                if (!newChanges['interview_completed_at'] && !currentApp?.interview_completed_at) {
                    const isoDate = new Date().toISOString();
                    newChanges['interview_completed_at'] = isoDate;
                    socket.emit('applications:typing', {
                        appId,
                        field: 'interview_completed_at',
                        value: isoDate,
                        userId: user?.id
                    });
                }
            }

            // Linkage logic for Final Specific Status -> Overall Status
            // (Deferred to handleSyncAll so updates don't apply until the user clicks Save)
            const specificStatusField = ['pis_final_specific_status', 'final_specific_status', 'pis_client_interview_status', 'client_interview_status', 'pis_ops_validator_status', 'ops_validator_status'].includes(qId);
            if (specificStatusField) {
                newChanges[qId] = value;
            }

            const newState = {
                ...prev,
                [appId]: newChanges
            };
            localChangesRef.current = newState;
            return newState;
        });
    }, [applications, user, reprofile]);

    const handleUpdateApplication = useCallback(async (id: string, patch: Partial<Application>) => {
        try {
            const app = applications.find(a => a.id === id);
            
            if (patch.department && app) {
                adjustReprofileData(app, patch.department, patch);
            }

            const updated = await ApplicationService.patch(id, patch);
            setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
            if (focusedApplicant?.id === id) {
                setFocusedApplicant(prev => prev ? { ...prev, ...updated } : null);
            }
            setLocalChanges(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            success('System Registry', 'Candidate record updated successfully.');
            return updated;
        } catch (err) {
            console.error('Failed to update candidate record:', err);
            error('Sync Error', 'Failed to save application updates.');
            throw err;
        }
    }, [applications, focusedApplicant, success, error]);

    const handleRegress = useCallback(async (app: Application) => {
        const dept = (app.department || '').toUpperCase();
        const metadata = app.metadata || {};
        const isExplicitlyEndorsed = !!app.endorsed_to_recruiter_s || metadata.endorsed_to_recruiter_s === true || metadata.endorsed_to_recruiter_s === 'true';
        const isSpecialized = isExplicitlyEndorsed || loadReroutedAccounts().some(sa => dept.toLowerCase().includes(sa));

        let prevStatus: string | null = null;

        if (app.current_status === 'TYPING_TEST') {
            prevStatus = 'APPLIED';
        } else if (app.current_status === 'INITIAL_INTERVIEW') {
            prevStatus = 'TYPING_TEST';
        } else if (app.current_status === 'QUEUE_ASSIGNED' || app.current_status === 'INTERVIEW_IN_PROGRESS') {
            prevStatus = 'INITIAL_INTERVIEW';
        } else if (app.current_status === 'ASSESSMENT') {
            prevStatus = 'INITIAL_INTERVIEW';
        } else if (app.current_status === 'FINAL_INTERVIEW') {
            prevStatus = 'ASSESSMENT';
        } else if (app.current_status === 'CLIENT_ASSESSMENT') {
            prevStatus = 'FINAL_INTERVIEW';
        } else if (app.current_status === 'CLIENT_INTERVIEW') {
            prevStatus = isSpecialized ? 'CLIENT_ASSESSMENT' : 'FINAL_INTERVIEW';
        } else if (['FINAL_VERDICT', 'PASSED', 'FAILED', 'CONDITIONAL', 'WAITLISTED', 'HIRED', 'REJECTED', 'For Job Offer', 'FOR_JOB_OFFER', 'HIRED_PROCESSED', 'FOR PAN', 'OPEN', 'PENDING'].includes(app.current_status)) {
            if (isSpecialized) {
                prevStatus = 'CLIENT_INTERVIEW';
            } else if (['TENNIS CHANNEL', 'THE SAVINGS GROUP', 'ENERCARE'].includes(dept)) {
                prevStatus = 'CLIENT_INTERVIEW';
            } else {
                prevStatus = 'FINAL_INTERVIEW';
            }
        } else if (app.current_status === 'WITHDRAWN') {
            prevStatus = 'INITIAL_INTERVIEW';
        } else {
            // Fallback for any unrecognized status
            prevStatus = 'FINAL_INTERVIEW';
        }

        if (!prevStatus) {
            error('Cannot Regress', 'No previous stage found for this status.');
            return;
        }

        try {
            const patch: any = {
                overall_status: 'OPEN',
                final_specific_status: prevStatus === 'FINAL_INTERVIEW' ? 'OV - Pending' : undefined
            };

            await ApplicationService.updateStatus({
                id: app.id,
                fromStatus: app.current_status,
                toStatus: prevStatus as ApplicationStatus,
                changedByName: user?.full_name || 'System (Regression)',
                reason: 'Undo Decision Protocol',
                patch
            });

            const updated = await ApplicationService.getById(app.id);
            setApplications(prev => prev.map(a => a.id === app.id ? updated : a));
            if (focusedApplicant?.id === app.id) {
                setFocusedApplicant(updated);
            }
            success('Regressed', `Applicant moved back to ${prevStatus.replace(/_/g, ' ')}`);
        } catch (err) {
            console.error('Regression failed:', err);
            error('Error', 'Failed to regress applicant stage.');
        }
    }, [user, success, error, focusedApplicant]);

    const handleSyncAll = async () => {
        const changes = localChangesRef.current;
        const updateCount = Object.keys(changes).length;
        if (updateCount === 0) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        const graduatedIds: string[] = [];
        try {
            const CHUNK_SIZE = 10;
            const entries = Object.entries(changes);
            const total = entries.length;

            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = entries.slice(i, i + CHUNK_SIZE);
                const chunkPromises = chunk.map(([appId, responses]) => {
                    const app = applications.find(a => a.id === appId);
                    if (!app) return Promise.resolve();

                    const mergedResponses = { ...responses };

                    // 1. Linkage logic for Final Specific Status -> Overall Status
                    const specStatusKeys = ['pis_final_specific_status', 'final_specific_status', 'pis_client_interview_status', 'client_interview_status', 'pis_ops_validator_status', 'ops_validator_status'];
                    const editedSpecKey = specStatusKeys.find(k => responses[k] !== undefined);
                    
                    if (editedSpecKey) {
                        const val = responses[editedSpecKey];
                        const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[val];
                        if (mappedOverall) {
                            let targetOverall = 'OPEN';
                            if (mappedOverall === 'CLOSED' || mappedOverall === 'HIRED' || mappedOverall === 'OPEN') {
                                targetOverall = mappedOverall;
                            } else if (mappedOverall === 'For Job Offer') {
                                targetOverall = 'OPEN';
                            }

                            let nextCurrentStatus = undefined;
                            if (mappedOverall === 'HIRED') {
                                nextCurrentStatus = 'HIRED';
                            } else if (mappedOverall === 'For Job Offer') {
                                nextCurrentStatus = 'For Job Offer';
                            } else if (mappedOverall === 'CLOSED') {
                                if (val.toLowerCase().includes('withdraw') || val.toLowerCase().includes('declined')) {
                                    nextCurrentStatus = 'WITHDRAWN';
                                } else if (val.toLowerCase().includes('failed')) {
                                    nextCurrentStatus = 'FAILED';
                                } else {
                                    nextCurrentStatus = 'REJECTED';
                                }
                            }

                            if (nextCurrentStatus) {
                                mergedResponses['current_status'] = nextCurrentStatus;
                                mergedResponses['master_status'] = nextCurrentStatus;
                            } else {
                                mergedResponses['master_status'] = mappedOverall;
                            }

                            mergedResponses['pis_overall_status'] = targetOverall;
                            mergedResponses['overall_status'] = targetOverall;
                            mergedResponses['master_remarks'] = val;
                        }

                        if (val && String(val).toLowerCase().includes('hired')) {
                            if (!mergedResponses['hired_at'] && !app.hired_at) {
                                mergedResponses['hired_at'] = new Date().toISOString();
                            }
                        }

                        // Explicit Masterlist Promotion for Interview Success
                        const upperSpecific = val.toUpperCase();
                        const isInterviewPassed = ['CLIENT INTERVIEW - PASSED', 'OV - PASSED', 'OPS VAL INTERVIEW - PASSED'].includes(upperSpecific);
                        if (isInterviewPassed) {
                            mergedResponses['master_column'] = 'MASTERLIST';
                            mergedResponses['master_status'] = 'For Job Offer';
                            mergedResponses['master_remarks'] = val;

                            const fullName = app.applicant_name || '';
                            const parsed = parseFullName(fullName);
                            mergedResponses['master_first_name'] = parsed.first;
                            mergedResponses['master_middle_name'] = parsed.middle;
                            mergedResponses['master_last_name'] = parsed.last;

                            const currentPis = app.pis || {};
                            const existingChangesPis = mergedResponses['pis'] || {};
                            mergedResponses['pis'] = {
                                ...currentPis,
                                ...existingChangesPis,
                                final_specific_status: val,
                                first_name: parsed.first,
                                middle_name: parsed.middle,
                                last_name: parsed.last
                            };
                        }
                    }

                    // 2. AUTO-PROMOTION: If status changes to Hired/Accepted, automatically graduate to Masterlist
                    const checkStatus = mergedResponses['current_status'] || app.current_status;
                    if (checkStatus) {
                        const upperVal = String(checkStatus).toUpperCase();

                        if (['ENDORSED', 'FINAL_INTERVIEW', 'FINAL_INTERVIEW_SCHEDULED'].includes(upperVal)) {
                            const currentInitial = mergedResponses['pis_initial_account_assignment'] || app.pis?.initial_account_assignment || '';
                            const targetDept = mergedResponses['department'] || app.department || '';
                            if (targetDept) {
                                const existingAccounts = currentInitial.split('|').map((a: string) => a.trim().toLowerCase()).filter(Boolean);
                                if (!existingAccounts.includes(targetDept.toLowerCase())) {
                                    const newInitial = currentInitial ? `${currentInitial} | ${targetDept}` : targetDept;
                                    mergedResponses['pis_initial_account_assignment'] = newInitial;
                                    const currentPis = mergedResponses['pis'] || app.pis || {};
                                    mergedResponses['pis'] = {
                                        ...currentPis,
                                        initial_account_assignment: newInitial
                                    };
                                }
                            }
                        }

                        const isHired = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'DISCORD WINNER', 'DISCORD'].includes(upperVal);
                        if (isHired) {
                            mergedResponses['master_column'] = 'MASTERLIST';

                            const specificStatus = mergedResponses['final_specific_status'] || mergedResponses['pis_final_specific_status'] || mergedResponses['pis']?.final_specific_status || app.pis?.final_specific_status;
                            mergedResponses['master_remarks'] = specificStatus || checkStatus;

                            const isActuallyHiredStatus = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(upperVal);
                            if (isActuallyHiredStatus && !mergedResponses['hired_at'] && !app.hired_at) {
                                mergedResponses['hired_at'] = new Date().toISOString();
                            }

                            const fullName = app.applicant_name || '';
                            const parsed = parseFullName(fullName);
                            mergedResponses['master_first_name'] = parsed.first;
                            mergedResponses['master_middle_name'] = parsed.middle;
                            mergedResponses['master_last_name'] = parsed.last;

                            const currentPis = app.pis || {};
                            const existingChangesPis = mergedResponses['pis'] || {};
                            mergedResponses['pis'] = {
                                ...currentPis,
                                ...existingChangesPis,
                                final_specific_status: specificStatus || checkStatus,
                                first_name: parsed.first,
                                middle_name: parsed.middle,
                                last_name: parsed.last
                            };
                        }
                    }

                    if (mergedResponses.master_column === 'MASTERLIST' && app.master_column !== 'MASTERLIST') {
                        graduatedIds.push(appId);
                    }

                    const {
                        current_status,
                        final_interview_notes,
                        hired_at,
                        interview_completed_at,
                        master_wave,
                        applicant_email,
                        applicant_name,
                        position_title,
                        department,
                        interviewer_name,
                        typing_test_wpm,
                        typing_test_accuracy,
                        final_specific_status,
                        pis_final_specific_status,
                        ...otherChanges
                    } = mergedResponses;



                    const questionResponses: Record<string, string> = {};
                    const directFields: Record<string, any> = {};
                    const pisUpdates: Record<string, any> = {};

                    Object.entries(otherChanges).forEach(([key, val]) => {
                        if (questions.some(q => q.id === key)) {
                            questionResponses[key] = val;
                        } else if (key.startsWith('pis_')) {
                            const fieldName = key.replace('pis_', '');
                            pisUpdates[fieldName] = val;
                        } else {
                            directFields[key] = val;
                        }
                    });

                    const updatedResponses = {
                        ...(app.interview_responses || {}),
                        ...questionResponses
                    };
                    const explicitFinalSpecificStatus = pis_final_specific_status ?? final_specific_status;

                    const newDept = department ?? pisUpdates.reprofile_active_account ?? pisUpdates.initial_account_assignment ?? app.department;
                    const isDeptChanging = newDept && newDept.toLowerCase() !== (app.department || '').toLowerCase();

                    const patch: any = {
                        ...directFields,
                        interview_responses: updatedResponses,
                        final_interview_notes: final_interview_notes ?? app.final_interview_notes,
                        hired_at: hired_at ?? app.hired_at,
                        interview_completed_at: interview_completed_at ?? app.interview_completed_at,
                        master_wave: master_wave ?? app.master_wave,
                        applicant_email: applicant_email ?? app.applicant_email,
                        applicant_name: applicant_name ?? app.applicant_name,
                        position_title: position_title ?? app.position_title,
                        department: newDept,
                        interviewer_name: interviewer_name ?? app.interviewer_name,
                        typing_test_wpm: typing_test_wpm ? (parseInt(typing_test_wpm) || 0) : app.typing_test_wpm,
                        typing_test_accuracy: typing_test_accuracy ? (parseFloat(typing_test_accuracy) || 0) : app.typing_test_accuracy,
                        master_column: mergedResponses.master_column ?? app.master_column ?? 'Sheet',
                        metadata: explicitFinalSpecificStatus
                            ? {
                                ...(app.metadata || {}),
                                final_specific_status: explicitFinalSpecificStatus,
                                'Final Specific Status': explicitFinalSpecificStatus,
                                'Specific Status': explicitFinalSpecificStatus
                            }
                            : undefined,
                        pis: {
                            ...(app.pis || {}),
                            ...(mergedResponses.pis || {}),
                            ...pisUpdates,
                            ...(directFields.pis || {}),
                            final_specific_status: explicitFinalSpecificStatus ?? mergedResponses.pis?.final_specific_status ?? app.pis?.final_specific_status
                        }
                    };

                    if (isDeptChanging && app) {
                        adjustReprofileData(app, newDept, patch);
                    }

                    return ApplicationService.updateStatus({
                        id: appId,
                        fromStatus: app.current_status,
                        toStatus: (current_status ?? app.current_status) as ApplicationStatus,
                        changedByName: 'Recruiter (Master Grid)',
                        patch
                    });
                });

                await Promise.all(chunkPromises);
            }

            if (graduatedIds.length > 0) {
                if (graduatedIds.length === 1) {
                    const app = applications.find(a => a.id === graduatedIds[0]);
                    success('Candidate Graduated', `${app?.applicant_name} has been promoted to the Masterlist.`);
                } else {
                    success('Candidates Graduated', `${graduatedIds.length} candidates have been promoted to the Masterlist.`);
                }
            }

            success('Synchronized', `Successfully committed batch changes for ${updateCount} records.`);
            localChangesRef.current = {};
            setLocalChanges({});
            setIsEditing(false);
            loadData();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = useCallback(() => {
        localChangesRef.current = {};
        setLocalChanges({});
        setIsEditing(false);
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const confirmDelete = window.confirm('Are you sure you want to PERMANENTLY erase this record from the database? This cannot be undone.');
            if (!confirmDelete) return;

            await ApplicationService.bulkDelete([id]);
            success('Record Erased', 'The candidate has been permanently removed from the database.');
            loadData();
        } catch (err) {
            console.error('Failed to remove record:', err);
            error('Protocol Error', 'Data removal sequence failed.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleClearOverallStatus = useCallback(async () => {
        const confirmClear = window.confirm(`This will reset Overall Status to 'OPEN' and clear Specific Status for all ${filters.filteredList.length} filtered records. This action will be saved immediately. Continue?`);
        if (!confirmClear) return;

        setIsSaving(true);
        try {
            const CHUNK_SIZE = 10;
            const total = filters.filteredList.length;
            
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                const chunk = filters.filteredList.slice(i, i + CHUNK_SIZE);
                const chunkPromises = chunk.map(app => {
                    const patch: any = {
                        current_status: 'OPEN',
                        pis: {
                            ...(app.pis || {})
                        }
                    };

                    return ApplicationService.updateStatus({
                        id: app.id,
                        fromStatus: app.current_status,
                        toStatus: 'OPEN',
                        changedByName: 'Recruiter (Bulk Clear)',
                        patch
                    });
                });

                await Promise.all(chunkPromises);
            }

            success('Bulk Clear Complete', `Reset ${total} records to OPEN.`);
            loadData();
        } catch (e) {
            console.error('Failed bulk clear:', e);
            error('Protocol Error', 'Failed to clear statuses. One or more records could not be updated.');
        } finally {
            setIsSaving(false);
        }
    }, [filters.filteredList, success, error, loadData]);

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        try {
            const ids = Array.from(selectedIds);
            const total = ids.length;
            setBulkDeleteProgress(0);
            
            await ApplicationService.bulkDelete(ids);
            setBulkDeleteProgress(100);

            success('Data Purge Complete', `${total} records have been permanently erased from the database.`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            loadData();
        } catch (e) {
            console.error('Failed batch removal:', e);
            error('Protocol Error', 'Data removal sequence failed.');
        } finally {
            setIsBulkDeleting(false);
            setDeletingId(null);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filters.filteredList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filters.filteredList.map(a => a.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleExportExcel = () => {
        const XLSX_lib = require('xlsx');
        if (filters.filteredList.length === 0) return;

        const exportData = filters.filteredList.map(app => {
            const responses = app.interview_responses || {};
            const row: any = {
                'Applicant Name': app.applicant_name,
                'Position': app.position_title,
                'Department': app.department,
                'Current Status': app.current_status,
                'Assessment Score': app.assessment_score || 0,
            };

            filters.activeQuestions.forEach(q => {
                row[q.question_text] = cleanValue(responses[q.id] || '---');
            });

            return row;
        });

        const worksheet = XLSX_lib.utils.json_to_sheet(exportData);
        const workbook = XLSX_lib.utils.book_new();
        XLSX_lib.utils.book_append_sheet(workbook, worksheet, 'Interview Matrix');
        XLSX_lib.writeFile(workbook, `INTERVIEW_MATRIX_${filters.selectedAccount ? filters.selectedAccount.toUpperCase() : 'ALL'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        success('Exported', 'Interview Matrix has been saved as Excel.');
    };

    const handleBulkHighlight = useCallback(async (color: string) => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        try {
            const ids = Array.from(selectedIds);
            const targetColor = color === 'clear' ? '---' : color;
            await ApplicationService.bulkPatch(ids, { highlight_color: targetColor });
            success('Selection Highlighted', `Applied highlight to ${selectedIds.size} records.`);
            setApplications(prev => prev.map(app => 
                selectedIds.has(app.id) ? { ...app, highlight_color: targetColor } : app
            ));
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Highlight failed:', err);
            error('Error', 'Failed to highlight records.');
        } finally {
            setIsSaving(false);
        }
    }, [selectedIds, success, error]);

    const handleBulkTransfer = useCallback(async (destination: 'NOT_ELIGIBLE' | 'BLACKLIST') => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        try {
            const ids = Array.from(selectedIds);
            const statusUpdate = destination === 'NOT_ELIGIBLE' ? 'NOT_ELIGIBLE_FOR_REHIRE' : 'REJECTED';
            const specificStatusUpdate = destination === 'NOT_ELIGIBLE' ? 'Not Eligible for Rehire' : 'Blacklist';

            await ApplicationService.bulkPatch(ids, {
                current_status: statusUpdate as any,
                pis: {
                    final_specific_status: specificStatusUpdate
                } as any
            });

            success('Transfer Complete', `Successfully transferred ${selectedIds.size} records.`);
            loadData();
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Transfer failed:', err);
            error('Transfer Error', 'Failed to transfer candidates.');
        } finally {
            setIsSaving(false);
        }
    }, [selectedIds, success, error, loadData]);

    return {
        // State and dispatch from filters
        search: filters.search,
        setSearch: filters.setSearch,
        selectedAccount: filters.selectedAccount,
        setSelectedAccount: filters.setSelectedAccount,
        activeTab: filters.activeTab,
        setActiveTab: filters.setActiveTab,
        showOnlyIncomplete: filters.showOnlyIncomplete,
        setShowOnlyIncomplete: filters.setShowOnlyIncomplete,
        shFilters: filters.shFilters,
        setShFilters: filters.setShFilters,
        selectedMonth: filters.selectedMonth,
        setSelectedMonth: filters.setSelectedMonth,
        selectedDay: filters.selectedDay,
        setSelectedDay: filters.setSelectedDay,
        selectedStatus: filters.selectedStatus,
        setSelectedStatus: filters.setSelectedStatus,
        selectedEducation: filters.selectedEducation,
        setSelectedEducation: filters.setSelectedEducation,
        educationOptions: filters.educationOptions,
        selectedGender: filters.selectedGender,
        setSelectedGender: filters.setSelectedGender,
        genderOptions: filters.genderOptions,
        activeQuestions: filters.activeQuestions,
        filteredList: filters.filteredList,
        accountMetrics: filters.accountMetrics,

        // Collab state
        activeUsers: collab.activeUsers,
        userFocus: collab.userFocus,
        remoteChanges: collab.remoteChanges,

        // Reprofile state/handlers
        pendingReprofile: reprofile.pendingReprofile,
        confirmReprofile: reprofile.confirmReprofile,
        cancelReprofile: reprofile.cancelReprofile,

        // Import state/handlers
        previewData: importer.previewData,
        showPreview: importer.showPreview,
        setShowPreview: importer.setShowPreview,
        handleImportCSV: importer.handleImportCSV,
        confirmImport: importer.confirmImport,

        // Notes state/handlers
        notesApp: notes.notesApp,
        setNotesApp: notes.setNotesApp,
        anchorRect: notes.anchorRect,
        setAnchorRect: notes.setAnchorRect,
        handleSaveNote: notes.handleSaveNote,

        // Main hook's own state/handlers
        loading,
        isEditing,
        setIsEditing,
        isSaving,
        isSelectMode,
        setIsSelectMode,
        isBulkDeleting,
        bulkDeleteProgress,
        selectedIds,
        setSelectedIds,
        focusedApplicant,
        setFocusedApplicant,
        showFullscreen,
        setShowFullscreen,
        deletingId,
        setDeletingId,
        focusPath,
        setFocusPath,
        applications,
        questions,
        allDepartments,
        validators,
        localChanges,
        totalApplicationsCount: applications.length,
        loadData,
        handleInputChange,
        handleSyncAll,
        handleCancelEdit,
        handleDelete,
        handleClearOverallStatus,
        handleBulkDelete,
        toggleSelectAll,
        toggleSelect,
        handleExportExcel,
        handleBulkHighlight,
        handleUpdateApplication,
        handleRegress,
        handleBulkTransfer
    };
}
