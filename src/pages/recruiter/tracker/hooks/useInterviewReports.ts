import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService } from '@/services/DepartmentService';
import { QuestionService } from '@/services/QuestionService';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import type { Application, ApplicationStatus } from '@/types/application';
import type { InterviewQuestion } from '@/types/misc';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/authStore';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { buildReprofileQueue, getReprofileQueue } from '@/utils/reprofileQueue';
import { loadReroutedAccounts } from '@/pages/admin/hooks/useAccountTypeSettings';
import { getPreviousStage } from '@/utils/applicantDataValidation';
import { cleanValue } from '../constants';
import * as helpers from '../utils/tableHelpers';
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
    const { error, success, info } = useToast();

    const { applications, setApplications, isInitialized } = useGlobalDataStore();
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
            const [qData, depts, allUsers] = await Promise.all([
                QuestionService.getAll(),
                DepartmentService.getAll(),
                UserService.getAll()
            ]);
            setQuestions(qData);
            setAllDepartments((depts || []).filter((d: any) => d.type !== 'SUPPORT_ROLES'));
            setValidators(allUsers.filter((u: any) => u.role === 'ops_validator' && u.is_active !== false));
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

    // Initialization
    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }
    }, [loadData, isInitialized]);

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
            const newChanges = {
                ...currentAppChanges,
                [qId]: value
            };

            if (qId === 'department' || qId === 'pis_initial_account_assignment') {
                const currentApp = applications.find(a => a.id === appId);
                const currentAccount = (
                    cleanAccountValue(currentApp?.pis?.initial_account_assignment) ||
                    cleanAccountValue(currentApp?.metadata?.initial_account_assignment) ||
                    cleanAccountValue(currentApp?.department)
                );
                const newAccount = cleanAccountValue(value);
                if (currentAccount.toLowerCase() !== newAccount.toLowerCase() && !!newAccount) {
                    const currentPis = (currentApp?.pis || {}) as any;
                    const existingChangesPis = (newChanges['pis'] || {}) as any;
                    newChanges['pis'] = {
                        ...currentPis,
                        ...existingChangesPis,
                        custom_lob: "UNSPECIFIED JOB POSITION"
                    };
                    newChanges['pis_custom_lob'] = "UNSPECIFIED JOB POSITION";
                    newChanges['position_title'] = "UNSPECIFIED JOB POSITION";
                    
                    socket.emit('applications:typing', {
                        appId,
                        field: 'pis_custom_lob',
                        value: 'UNSPECIFIED JOB POSITION',
                        userId: user?.id
                    });
                    socket.emit('applications:typing', {
                        appId,
                        field: 'position_title',
                        value: 'UNSPECIFIED JOB POSITION',
                        userId: user?.id
                    });
                }
            }

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
            // Server already emits 'applications:updated' on PATCH — no client-side emit needed
            return updated;
        } catch (err) {
            console.error('Failed to update candidate record:', err);
            error('Sync Error', 'Failed to save application updates.');
            throw err;
        }
    }, [applications, focusedApplicant, success, error]);

    const handleRegress = useCallback(async (app: Application) => {
        let prevStatus: string | null = getPreviousStage(app);

        if (!prevStatus) {
            error('Cannot Regress', 'No previous stage found for this status.');
            return;
        }

        try {
            const patch: any = {
                overall_status: 'OPEN'
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
            if (updated) {
                setApplications(prev => prev.map(a => a.id === app.id ? updated : a));
                if (focusedApplicant?.id === app.id) {
                    setFocusedApplicant(updated);
                }
            }
            success('Regressed', `Applicant moved back to ${prevStatus.replace(/_/g, ' ')}`);
            // Server already emits 'applications:updated' — no client-side emit needed
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
                                if (val.toLowerCase().includes('withdraw') || val.toLowerCase().includes('withdrew') || val.toLowerCase().includes('declined')) {
                                    nextCurrentStatus = 'WITHDRAWN';
                                } else if (val.toLowerCase().includes('failed')) {
                                    nextCurrentStatus = 'FAILED';
                                } else {
                                    nextCurrentStatus = 'FAILED';
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
                        const isInterviewPassed = ['CLIENT INTERVIEW - PASSED', 'CLIENT ASSESSMENT - PASSED', 'OV - PASSED', 'OPS VAL INTERVIEW - PASSED'].includes(upperSpecific);
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

                        if (['REJECTED', 'FAILED', 'WITHDRAWN', 'CLOSED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(upperVal)) {
                            mergedResponses['overall_status'] = 'CLOSED';
                            mergedResponses['pis_overall_status'] = 'CLOSED';

                            const currentFSS = mergedResponses['final_specific_status'] || mergedResponses['pis_final_specific_status'] || mergedResponses['pis']?.final_specific_status || app.pis?.final_specific_status || '';
                            const isAlreadyTerminal = /failed|withdraw|declined|no show|noshow/i.test(currentFSS);
                            if (!isAlreadyTerminal) {
                                let newFSS = 'OV - Failed';
                                if (upperVal === 'WITHDRAWN') {
                                    newFSS = 'OV - Withdrew Application';
                                }

                                mergedResponses['final_specific_status'] = newFSS;
                                mergedResponses['pis_final_specific_status'] = newFSS;
                                mergedResponses['master_remarks'] = newFSS;
                                const currentPis = mergedResponses['pis'] || app.pis || {};
                                mergedResponses['pis'] = {
                                    ...currentPis,
                                    final_specific_status: newFSS
                                };
                            }
                        } else {
                            const currentFSS = mergedResponses['final_specific_status'] || mergedResponses['pis_final_specific_status'] || mergedResponses['pis']?.final_specific_status || app.pis?.final_specific_status || '';
                            const isAlreadyTerminal = /failed|withdraw|declined|no show|noshow/i.test(currentFSS);
                            if (!isAlreadyTerminal) {
                                let resolvedFSS = null;
                                if (upperVal === 'ASSESSMENT' && !currentFSS.toLowerCase().includes('wonderlic') && !currentFSS.toLowerCase().includes('speechx') && !currentFSS.toLowerCase().includes('personality') && !currentFSS.toLowerCase().includes('typing')) {
                                    resolvedFSS = 'Wonderlic - Pending';
                                } else if (upperVal === 'FINAL_INTERVIEW_SCHEDULED') {
                                    resolvedFSS = 'OV - Scheduled';
                                } else if (upperVal === 'FINAL_INTERVIEW_SCHEDULING' || upperVal === 'FOR_SCHEDULING') {
                                    resolvedFSS = 'OV - for Scheduling';
                                } else if (['CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW'].includes(upperVal) && !currentFSS.toLowerCase().includes('client')) {
                                    resolvedFSS = 'Client Interview - Pending';
                                } else if (['FOR_JOB_OFFER', 'For Job Offer'].includes(upperVal) && !currentFSS.toLowerCase().includes('jo -')) {
                                    resolvedFSS = 'JO - Pending';
                                } else if (upperVal === 'INITIAL_INTERVIEW' && !currentFSS.toLowerCase().includes('initial interview')) {
                                    resolvedFSS = 'Initial Interview - Pending';
                                }

                                if (resolvedFSS) {
                                    mergedResponses['final_specific_status'] = resolvedFSS;
                                    mergedResponses['pis_final_specific_status'] = resolvedFSS;
                                    mergedResponses['master_remarks'] = resolvedFSS;
                                    const currentPis = mergedResponses['pis'] || app.pis || {};
                                    mergedResponses['pis'] = {
                                        ...currentPis,
                                        final_specific_status: resolvedFSS
                                    };
                                }
                            }
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
                    const metadataUpdates: Record<string, any> = {};

                    let parsedMetadata: any = {};
                    if (typeof app.metadata === 'string') {
                        try { parsedMetadata = JSON.parse(app.metadata); } catch (e) { }
                    } else if (typeof app.metadata === 'object' && app.metadata !== null) {
                        parsedMetadata = { ...app.metadata };
                    }

                    Object.entries(otherChanges).forEach(([key, val]) => {
                        if (questions.some(q => q.id === key)) {
                            questionResponses[key] = val;
                        } else if (key.startsWith('pis_')) {
                            const fieldName = key.replace('pis_', '');
                            pisUpdates[fieldName] = val;
                        } else if (key.startsWith('metadata_')) {
                            const fieldName = key.replace('metadata_', '');
                            if (fieldName.startsWith('ratings_')) {
                                const ratingKey = fieldName.replace('ratings_', '');
                                metadataUpdates.ratings = { ...(parsedMetadata.ratings || {}), ...(metadataUpdates.ratings || {}), [ratingKey]: val };
                            } else if (fieldName.startsWith('checklist_')) {
                                const checkKey = fieldName.replace('checklist_', '');
                                metadataUpdates.checklist = { ...(parsedMetadata.checklist || {}), ...(metadataUpdates.checklist || {}), [checkKey]: val };
                            } else {
                                metadataUpdates[fieldName] = val;
                            }
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


                    const newFirst = mergedResponses['first_name'] ?? (app as any).first_name ?? '';
                    const newMiddle = mergedResponses['middle_name'] ?? (app as any).middle_name ?? '';
                    const newLast = mergedResponses['last_name'] ?? (app as any).last_name ?? '';
                    let computedName = app.applicant_name;
                    if (mergedResponses['first_name'] !== undefined || mergedResponses['middle_name'] !== undefined || mergedResponses['last_name'] !== undefined) {
                        computedName = `${newFirst} ${newMiddle} ${newLast}`.replace(/\s+/g, ' ').trim();
                    }

                    let finalMetadata: any = undefined;
                    if (Object.keys(metadataUpdates).length > 0 || explicitFinalSpecificStatus) {
                        finalMetadata = {
                            ...parsedMetadata,
                            ...metadataUpdates,
                        };
                        if (explicitFinalSpecificStatus) {
                            finalMetadata.final_specific_status = explicitFinalSpecificStatus;
                            finalMetadata['Final Specific Status'] = explicitFinalSpecificStatus;
                            finalMetadata['Specific Status'] = explicitFinalSpecificStatus;
                        }
                    }

                    const patch: any = {
                        ...directFields,
                        interview_responses: updatedResponses,
                        final_interview_notes: final_interview_notes !== undefined ? final_interview_notes : app.final_interview_notes,
                        hired_at: hired_at !== undefined ? hired_at : app.hired_at,
                        interview_completed_at: interview_completed_at !== undefined ? interview_completed_at : app.interview_completed_at,
                        master_wave: master_wave !== undefined ? master_wave : app.master_wave,
                        applicant_email: applicant_email !== undefined ? applicant_email : app.applicant_email,
                        applicant_name: applicant_name !== undefined ? applicant_name : (computedName !== undefined ? computedName : app.applicant_name),
                        position_title: position_title !== undefined ? position_title : app.position_title,
                        department: newDept,
                        interviewer_name: interviewer_name !== undefined ? interviewer_name : app.interviewer_name,
                        assigned_recruiter_name: interviewer_name !== undefined ? interviewer_name : app.assigned_recruiter_name,
                        typing_test_wpm: typing_test_wpm ? (parseInt(typing_test_wpm) || 0) : app.typing_test_wpm,
                        typing_test_accuracy: typing_test_accuracy ? (parseFloat(typing_test_accuracy) || 0) : app.typing_test_accuracy,
                        master_column: mergedResponses.master_column !== undefined ? mergedResponses.master_column : (app.master_column ?? 'Sheet'),
                        metadata: finalMetadata,
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

                    if (current_status && current_status !== app.current_status) {
                        return ApplicationService.updateStatus({
                            id: appId,
                            fromStatus: app.current_status,
                            toStatus: current_status as ApplicationStatus,
                            changedByName: 'Recruiter (Master Grid)',
                            patch
                        });
                    } else {
                        // If status hasn't changed, just patch the data so we don't spam the status_history table
                        return ApplicationService.patch(appId, patch);
                    }
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
            // Server already emits 'applications:updated' on each PATCH — no client-side emit needed

            // Wait for fresh data before clearing local changes to prevent UI flickering
            await loadData();

            localChangesRef.current = {};
            setLocalChanges({});
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = useCallback(() => {
        localChangesRef.current = {};
        setLocalChanges({});
        setIsEditing(false);
    }, []);

    // Auto-save local changes after 1 second of inactivity
    useEffect(() => {
        const changes = localChangesRef.current;
        if (Object.keys(changes).length > 0) {
            const timeoutId = setTimeout(() => {
                handleSyncAll();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [localChanges]);

    const handleDelete = async (id: string) => {
        try {
            const confirmDelete = window.confirm('Are you sure you want to PERMANENTLY erase this record from the database? This cannot be undone.');
            if (!confirmDelete) return;

            await ApplicationService.bulkDelete([id]);
            success('Record Erased', 'The candidate has been permanently removed from the database.');
            // Server already emits 'applications:updated' on delete — no client-side emit needed
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
            // Server already emits 'applications:updated' — no client-side emit needed
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
            // Server already emits 'applications:updated' on delete — no client-side emit needed
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

    const handleBulkMasterlistTransfer = useCallback(async (destination: 'MASTERLIST' | 'POOL' | 'OFFBOARDING_TRACKER' | 'OFFBOARDING_WINNERS' | 'INACTIVE_APPLICATION') => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        try {
            const ids = Array.from(selectedIds);
            const patchData: any = {
                master_column: destination
            };

            if (destination === 'POOL') {
                patchData.current_status = 'Waiting';
            } else if (destination === 'OFFBOARDING_TRACKER') {
                patchData.current_status = 'Withdrawn';
            } else if (destination === 'INACTIVE_APPLICATION') {
                patchData.current_status = 'Inactive';
            }

            await ApplicationService.bulkPatch(ids, patchData);

            success('Transfer Complete', `Successfully transferred ${selectedIds.size} records to ${destination.replace(/_/g, ' ')}.`);
            loadData();
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Failed to bulk transfer', err);
            error('Transfer Failed', 'Failed to transfer selected records.');
        } finally {
            setIsSaving(false);
        }
    }, [selectedIds, success, error, loadData]);

    const handleBulkTransferDate = useCallback(async (month: string, year: string) => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        try {
            const ids = Array.from(selectedIds);
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthIndex = monthNames.findIndex(m => m.toUpperCase() === month.toUpperCase());
            
            if (monthIndex === -1 || !year) {
                error('Invalid Date', 'Could not parse the selected month and year.');
                setIsSaving(false);
                return;
            }
            
            const newDate = new Date(parseInt(year), monthIndex, 1, 12, 0, 0); // Noon UTC to avoid timezone edge cases
            const applied_at = newDate.toISOString();

            await ApplicationService.bulkPatch(ids, { applied_at });

            success('Transfer Complete', `Successfully moved ${ids.length} records to ${month} ${year}.`);
            loadData();
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Failed to transfer date', err);
            error('Transfer Failed', 'Failed to move records. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, [selectedIds, success, error, loadData]);

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
        if (filters.filteredList.length === 0) return;

        // Load custom columns and column names configured by the user
        const savedCols = localStorage.getItem('recruiter_tracker_custom_columns');
        const customColumns = savedCols ? JSON.parse(savedCols) : {};
        const savedNames = localStorage.getItem('recruiter_tracker_custom_column_names');
        const customColumnNames = savedNames ? JSON.parse(savedNames) : {};
        const tabNames = customColumnNames[filters.activeTab] || {};

        const norm = filters.activeTab.toUpperCase();

        const getColumnsForExport = (): string[] => {
            if (customColumns[filters.activeTab]) {
                return customColumns[filters.activeTab];
            }
            if (norm.includes('BILINGUALS')) {
                return ["#", "Candidate's Name", "Position", "Preferred Set-up", "Willing to Relocate", "Salary", "Status", "Notes"];
            }
            if (norm.includes('TEAM_LEADER')) {
                return ["#", "Name", "Position", "Background and Experience", "Tenure as TL", "Total BPO Exp", "Salary Expectation", "Source", "Status"];
            }
            if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
                const SHEET_COLUMNS = [
                    "Id", "Start time", "Completion time", "Email", "RECRUITER / INTERVIEWER", "Interview Date",
                    "Last Name", "Middle Name", "First Name", "Position Applying for?",
                    "Summary of Background and Experience", "Previous Salary", "If you don't mind us asking how much is your salary expectations?",
                    "Date of Birth", "Age", "Sex", "Civil Status", "Contact Number", "Current Address",
                    "Do you have any BPO experience", "Tenure in the BPO Industry", "Highest Educational Background",
                    "Strand (if applicable)", "Course and Year Level",
                    "What made you interested to apply in the role?",
                    "In this role, what do you hope to achieve in the first 6 months?",
                    "Can you share a setback or failure you've experienced?",
                    "Do you have any prior commitment that we need to know?",
                    "The target training start date for this account/campaign will start on ___________. Would you be available to work with us by then?",
                    "Do you have any preferred shifts or work schedule?",
                    "Mode of transportation",
                    "Do you have any pending job offer?",
                    "Are you a candidate for enercare/ooni?",
                    "Role specific questions",
                    "INTERVIEWER", "INITIAL ACCOUNT ASSIGNMENT", "Is this candidate for drug testing", "INITIAL INTERVIEW RESULTS", "CEFR",
                    "Personality Test (Enercare; Leadership)", "Critical Thinking Assessment", "Typing Speed (Number Only)", "Typing Accuracy (Percentage)",
                    "Ops Validator Email", "Ops Val Status", "Ops Val Notes if Available",
                    "Leadership Assessment Status (if applicable)", "Wonderlic Status (if applicable)",
                    "Client Interviewer Email", "Client Interview Status (if applicable)",
                    "Client Interview Notes if Available", "Final Specific Status", "Current Step", "Overall Status",
                    "Hire Date", "Final Account", "Last Processed/Updated By:", "Source"
                ];
                return SHEET_COLUMNS;
            }
            return ["Id", "Applicant Name", "Position", "Department", "Status"];
        };

        const activeCols = getColumnsForExport();

        const getCellValue = (app: Application, col: string, rowIndex: number): string => {
            if (col.startsWith('custom:')) {
                const colKey = col.substring(7);
                return (app.pis as any)?.[colKey] || app.interview_responses?.[col] || '';
            }
            if (norm.includes('BILINGUALS')) {
                return helpers.getBilingualsCellValue(app, col, rowIndex);
            }
            if (norm.includes('TEAM_LEADER')) {
                return helpers.getTeamLeaderCellValue(app, col, rowIndex);
            }
            if (norm.includes('SHEET') || norm === 'BLACKLIST' || norm === 'NOT_ELIGIBLE') {
                return helpers.getSheetCellValue(app, col, rowIndex, questions);
            }
            if (norm === 'PIVOT') {
                return helpers.getPivotCellValue(app, col);
            }
            return String((app as any)[col] || (app.pis as any)?.[col] || '');
        };

        const exportData = filters.filteredList.map((app, rowIndex) => {
            const row: any = {};
            activeCols.forEach(col => {
                const headerName = tabNames[col] || col;
                row[headerName] = cleanValue(getCellValue(app, col, rowIndex) || '---');
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Apply styles to headers and Status column
        if (exportData.length > 0) {
            const headerKeys = Object.keys(exportData[0] || {});
            
            // Style header row
            for (let C = 0; C < headerKeys.length; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
                const cell = worksheet[cellRef];
                if (cell) {
                    cell.s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "4B5563" } } // gray-600
                    };
                }
            }

            let statusColIndex = headerKeys.indexOf('Status');
            if (statusColIndex === -1) statusColIndex = headerKeys.indexOf('Overall Status');
            if (statusColIndex !== -1) {
                for (let R = 1; R <= exportData.length; ++R) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: statusColIndex });
                    const cell = worksheet[cellRef];
                    if (cell && cell.v) {
                        const statusStr = String(cell.v).toUpperCase().trim();
                        let bg = "EFF6FF"; // default blue-50
                        let fg = "1D4ED8"; // default blue-700
                        
                        if (['HIRED', 'ACCEPTED OFFER', 'PROMOTED', 'LATERAL TRANSFER'].includes(statusStr)) {
                            bg = "10B981"; fg = "FFFFFF"; // emerald
                        } else if (['PASSED', 'FOR JOB OFFER'].includes(statusStr)) {
                            bg = "FFEDD5"; fg = "EA580C"; // orange
                        } else if (['WITHDRAWN', 'FAILED', 'REJECTED', 'CLOSED'].includes(statusStr)) {
                            bg = "FCE7F3"; fg = "DB2777"; // pink
                        } else if (['PAN COMPLETED', 'PAN DONE'].includes(statusStr)) {
                            bg = "CCFBF1"; fg = "115E59"; // teal
                        } else if (['PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE'].includes(statusStr)) {
                            bg = "CFFAFE"; fg = "155E75"; // cyan
                        } else if (['PAN OUT FOR APPROVAL', 'PAN FOR APPROVAL'].includes(statusStr)) {
                            bg = "E0F2FE"; fg = "0369A1"; // sky
                        } else if (['FOR PAN', 'FOR PAN AND BI', 'INITIAL INTERVIEW', 'WAITING', 'POOL', 'WAITING (POOLED)'].includes(statusStr)) {
                            bg = "F3E8FF"; fg = "7E22CE"; // purple
                        } else if (['SENT JO AND BGC', 'QUEUE ASSIGNED'].includes(statusStr)) {
                            bg = "EFF6FF"; fg = "1D4ED8"; // blue
                        } else if (['INTERVIEW IN PROGRESS'].includes(statusStr)) {
                            bg = "3B82F6"; fg = "FFFFFF"; // blue-500
                        } else if (['ENDORSED'].includes(statusStr)) {
                            bg = "CFFAFE"; fg = "0E7490"; // cyan
                        } else if (['FOR SCHEDULING', 'FINAL INTERVIEW', 'FINAL INTERVIEW SCHEDULED', 'MARKED PENDING'].includes(statusStr)) {
                            bg = "FEF3C7"; fg = "B45309"; // amber
                        }

                        cell.s = {
                            fill: { fgColor: { rgb: bg } },
                            font: { color: { rgb: fg }, bold: true },
                            alignment: { vertical: "center", horizontal: "center" }
                        };
                    }
                }
            }
        }

        // Auto-fit column widths for better readability
        if (exportData.length > 0) {
            const colWidths = Object.keys(exportData[0] || {}).map((key) => {
                let maxLen = key.length;
                exportData.forEach((row: any) => {
                    const valStr = String(row[key] || '');
                    if (valStr.length > maxLen) {
                        maxLen = valStr.length;
                    }
                });
                return { wch: Math.min(maxLen + 2, 60) }; // Cap width at 60 chars
            });
            worksheet['!cols'] = colWidths;

            // Add autofilter to the header row
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, filters.activeTab);
        XLSX.writeFile(workbook, `${filters.activeTab.toUpperCase()}_REGISTRY_${filters.selectedAccount ? filters.selectedAccount.toUpperCase() : 'ALL'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        success('Exported', `${filters.activeTab} Registry has been saved as Excel.`);
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
            const statusUpdate = destination === 'NOT_ELIGIBLE' ? 'NOT_ELIGIBLE_FOR_REHIRE' : 'FAILED';
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
        dateRange: filters.dateRange,
        setDateRange: filters.setDateRange,
        dateAddedFilter: filters.dateAddedFilter,
        setDateAddedFilter: filters.setDateAddedFilter,
        interviewConcludedFilter: filters.interviewConcludedFilter,
        setInterviewConcludedFilter: filters.setInterviewConcludedFilter,
        selectedStatus: filters.selectedStatus,
        setSelectedStatus: filters.setSelectedStatus,
        selectedEducation: filters.selectedEducation,
        setSelectedEducation: filters.setSelectedEducation,
        educationOptions: filters.educationOptions,
        selectedGender: filters.selectedGender,
        setSelectedGender: filters.setSelectedGender,
        genderOptions: filters.genderOptions,
        selectedInitialAccountFilter: filters.selectedInitialAccountFilter,
        setSelectedInitialAccountFilter: filters.setSelectedInitialAccountFilter,
        initialAccountOptions: filters.initialAccountOptions,
        selectedFinalAccountFilter: filters.selectedFinalAccountFilter,
        setSelectedFinalAccountFilter: filters.setSelectedFinalAccountFilter,
        finalAccountOptions: filters.finalAccountOptions,
        selectedHireType: filters.selectedHireType,
        setSelectedHireType: filters.setSelectedHireType,
        activePassedMonth: filters.activePassedMonth,
        setActivePassedMonth: filters.setActivePassedMonth,
        availablePassedMonths: filters.availablePassedMonths,
        selectedYear: filters.selectedYear,
        setSelectedYear: filters.setSelectedYear,
        availableYears: filters.availableYears,
        isExclusiveMode: filters.isExclusiveMode,
        setIsExclusiveMode: filters.setIsExclusiveMode,
        isOfficialEndorsement: filters.isOfficialEndorsement,
        setIsOfficialEndorsement: filters.setIsOfficialEndorsement,
        selectedOverallStatusFilter: filters.selectedOverallStatusFilter,
        setSelectedOverallStatusFilter: filters.setSelectedOverallStatusFilter,
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
        handleBulkTransfer,
        handleBulkMasterlistTransfer,
        handleBulkTransferDate
    };
}
