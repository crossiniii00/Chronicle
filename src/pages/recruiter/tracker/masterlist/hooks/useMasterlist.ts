import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loadReroutedAccounts } from '@/pages/admin/hooks/useAccountTypeSettings';
import { getMasterlistCellValue } from '../components/tableHelpers';
import { ApplicationService } from '@/services/ApplicationService';
import { DepartmentService } from '@/services/DepartmentService';
import { UserService } from '@/services/UserService';
import { useToast } from '@/components/common/useToast';
import * as XLSX from 'xlsx-js-style';
import { socketService } from '@/services/socketService';
import { useGlobalDataStore } from '@/store/globalDataStore';
import { MONTHS } from '../constants';
import { SPECIFIC_STATUS_TO_OVERALL } from '@/pages/recruiter/tracker/utils/statusMappings';
import { DateFilterState } from '@/components/common/AdvancedDateFilter';
import { Application } from '@/types/application';
import { cleanColumn1Text } from '@/pages/recruiter/tracker/utils/tableHelpers';

const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return '';

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age.toString();
};

const CONCLUDED_STATUSES = [
    'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT',
    'FOR PAN', 'For PAN', 'FOR_PAN', 'PAN_COMPLETED', 'PAN COMPLETED',
    'PAN ISSUED', 'PAN_ISSUED', 'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN_ISSUED;_FOR_SIGNATURE',
    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer',
    'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC'
];

const FAILED_TERMS = ['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE', 'INACTIVE', 'NO SHOW', 'NO_SHOW', 'BACKOUT', 'BACK OUT'];

export function useMasterlist() {
    const { user } = useAuthStore();
    const { error, success } = useToast();
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [validDepartments, setValidDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<string[]>(['ALL']);
    const [startDateFilter, setStartDateFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [dateAddedFilter, setDateAddedFilter] = useState<DateFilterState>({ type: 'ALL', start: null, end: null });
    const [selectedDay, setSelectedDay] = useState<string>('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('MASTERLIST');
    const [activeSubTab, setActiveSubTab] = useState<string>('MASTERLIST');
    const [isOfficialEndorsement, setIsOfficialEndorsement] = useState(false);

    const [isEditing, setIsEditing] = useState(true);
    const [isConfigEditing, setIsConfigEditing] = useState(false);
    const [isExclusiveMode, setIsExclusiveMode] = useState(false);
    const [localChanges, setLocalChanges] = useState<Record<string, Partial<Application>>>({});
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [notesApp, setNotesApp] = useState<Application | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const [pivotTraining, setPivotTraining] = useState<string>('ALL');
    const [pivotPosition, setPivotPosition] = useState<string>('ALL');
    const [pivotStatus, setPivotStatus] = useState<string>('ALL');
    const [pivotAccount, setPivotAccount] = useState<string>('ALL');
    const [importPreview, setImportPreview] = useState<any[] | null>(null);

    const [selectedStatus, setSelectedStatus] = useState<string[]>(['ALL']);
    const [selectedWave, setSelectedWave] = useState<string>('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [activePassedMonth, setActivePassedMonth] = useState<string>('ALL');
    const [selectedYear, setSelectedYear] = useState<string>('ALL');
    const [selectedHireType, setSelectedHireType] = useState<string>('ALL');
    const [emailFilter, setEmailFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
    const [focusPath, setFocusPath] = useState<{ appId: string, colKey: string } | null>(null);
    const { applications: globalApps, isInitialized } = useGlobalDataStore();
    const isEditingRef = useRef(isEditing);

    useEffect(() => {
        isEditingRef.current = isEditing;
        if (!isEditing) setFocusPath(null);
    }, [isEditing]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [depts, users] = await Promise.all([
                DepartmentService.getAll(),
                UserService.getAll()
            ]);

            const validDeptNames = depts.map((d: any) => d.name);
            setValidDepartments(validDeptNames);
            try {
                localStorage.setItem('cached_users', JSON.stringify(users));
            } catch (e) {
                console.warn('Could not cache users in localStorage due to quota limits:', e);
            }

            const healedApps = globalApps.map((app: any) => {
                let finalDept = String(app.pis?.final_account || app.endorsement_account || app.department || '');
                if (finalDept.includes(',')) {
                    const failedAccounts = app.metadata?.failed_accounts || [];
                    const failedSet = new Set(failedAccounts.map((f: string) => f.trim().toLowerCase()));
                    const remaining = finalDept.split(',').map((s: string) => s.trim()).filter((s: string) => s && !failedSet.has(s.toLowerCase()));
                    finalDept = remaining.length > 0 ? remaining[0] : finalDept.split(',')[0].trim();
                }

                let cleanDept = 'Support & Leadership / Others';
                if (validDeptNames.includes(finalDept)) {
                    cleanDept = finalDept;
                } else {
                    const found = validDeptNames.find((vd: string) => finalDept.toLowerCase().includes(vd.toLowerCase()));
                    if (found) cleanDept = found;
                }

                if (!app.master_first_name && !app.master_last_name && app.applicant_name) {
                    const parts = app.applicant_name.trim().split(/\s+/);
                    let first = '';
                    let middle = '';
                    let last = '';
                    if (parts.length === 1) {
                        first = parts[0];
                    } else if (parts.length === 2) {
                        first = parts[0];
                        last = parts[1];
                    } else if (parts.length >= 3) {
                        first = parts[0];
                        last = parts[parts.length - 1];
                        middle = parts.slice(1, parts.length - 1).join(' ');
                    }
                    return {
                        ...app,
                        department: cleanDept,
                        master_first_name: first,
                        master_middle_name: middle,
                        master_last_name: last
                    };
                }
                return {
                    ...app,
                    department: cleanDept
                };
            });
            setAllApplications(healedApps);
        } catch (err: any) {
            console.error('Failed to load masterlist:', err);
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || String(err);
            if (!silent) error('Loading Failed', `Could not load records from the database: ${msg}`);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [globalApps, error]);

    useEffect(() => {
        if (isInitialized && globalApps.length > 0) {
            loadData(true);
        }
    }, [isInitialized, globalApps, loadData]);

    const availablePassedMonths = useMemo(() => {
        return ['December', 'November', 'October', 'September', 'August', 'July', 'June', 'May', 'April', 'March', 'February', 'January'];
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allApplications.forEach(a => {
            const dateStr = a.master_training_start_date || a.applied_at;
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    years.add(String(d.getFullYear()));
                }
            }
        });
        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [allApplications]);

    useEffect(() => {
        const lastError = localStorage.getItem('last_import_error');
        if (lastError) {
            error('Previous Import Failed', lastError);
            localStorage.removeItem('last_import_error');
        }
    }, [error]);

    useEffect(() => {
        if (!isInitialized) {
            loadData();
        }

        const handleLocalUpdate = (e: Event) => {
            const payload = (e as CustomEvent).detail;
            if (payload?.data && payload.applicationId) {
                setAllApplications(prev => {
                    const exists = prev.some(a => a.id === payload.applicationId);
                    if (exists) {
                        return prev.map(a => a.id === payload.applicationId ? { ...a, ...payload.data } : a);
                    } else {
                        return [payload.data, ...prev];
                    }
                });
            }
        };
        window.addEventListener('applications:local_update', handleLocalUpdate);

        return () => {
            window.removeEventListener('applications:local_update', handleLocalUpdate);
        };
    }, [loadData, isInitialized]);


    const [pendingWithdrawal, setPendingWithdrawal] = useState<{ appId: string, previousStatus: string, previousColumn: string, field?: string } | null>(null);
    const [pendingAccountTransfer, setPendingAccountTransfer] = useState<{ app: Application; field: string; targetAccount: string } | null>(null);

    const handleEdit = useCallback((appId: string, field: keyof Application, value: any, transferOptions?: {
        opsValidatorId?: string | null;
        opsValidatorName?: string | null;
        opsRemarks?: string | null;
        hiringRequestId?: string | null;
        positionId?: string | null;
        positionTitle?: string | null;
        jobPosition?: string | null;
    }) => {
        if (field === 'current_status' && value === 'WITHDRAWN') {
            const app = allApplications.find(a => a.id === appId);
            if (app) {
                setPendingWithdrawal({
                    appId,
                    previousStatus: app.current_status || 'APPLIED',
                    previousColumn: app.master_column || 'MASTERLIST'
                });
                return;
            }
        }

        // Intercept Account changes to pop up AccountTransferModal if options not provided
        if ((field === 'department' || field === 'endorsement_account') && !transferOptions) {
            const app = allApplications.find(a => a.id === appId);
            if (app) {
                const accVal = String(value || '');
                const prevAccount = app?.department || app?.endorsement_account || app?.pis?.final_account || '';
                if (accVal && prevAccount && accVal.toLowerCase().trim() !== prevAccount.toLowerCase().trim()) {
                    setPendingAccountTransfer({ app, field: String(field), targetAccount: accVal });
                    return;
                }
            }
        }

        setLocalChanges(prev => {
            const currentAppChanges = prev[appId] || {};
            const newChanges: Partial<Application> = { ...currentAppChanges, [field]: value };

            const updater = user?.full_name || 'System (Registry)';
            const app = allApplications.find(a => a.id === appId);

            if (field === 'current_status' || field === 'master_status') {
                const upperVal = String(value).toUpperCase();
                if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER'].includes(upperVal)) {
                    if (!newChanges.hired_at && !app?.hired_at) {
                        newChanges.hired_at = new Date().toISOString();
                    }
                }
                const currentCol = (app?.master_column || '').toUpperCase();
                const isSpecializedCol = ['OFFBOARDING_WINNERS', 'ONBOARDING_WINNERS', 'OFFBOARDING_TRACKER', 'INACTIVE_APPLICATION'].includes(currentCol);

                if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(upperVal)) {
                    if (!isSpecializedCol) {
                        newChanges.master_column = 'MASTERLIST';
                    }
                    newChanges.master_status = value;
                }
            }

            // Automate interview date on status change
            if (field === 'current_status' && [
                'PASSED', 'FAILED', 'REJECTED', 'HIRED', 'HIRED_PROCESSED',
                'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER'
            ].includes(String(value).toUpperCase())) {
                if (!newChanges.interview_completed_at && !app?.interview_completed_at) {
                    newChanges.interview_completed_at = new Date().toISOString();
                }
            }

            // Keep account fields synchronized globally & perform cascading transfer
            if (field === 'department' || field === 'endorsement_account') {
                const accVal = String(value || '');
                const prevAccount = app?.department || app?.endorsement_account || app?.pis?.final_account || '';

                newChanges.department = accVal;
                newChanges.endorsement_account = accVal;
                newChanges.pis = {
                    ...(app?.pis || {}),
                    final_account: accVal,
                    ...(transferOptions && transferOptions.jobPosition !== undefined ? { custom_lob: transferOptions.jobPosition } : {})
                } as any;

                // If account changed to a different account, perform cascading transfer:
                if (accVal && prevAccount && accVal.toLowerCase().trim() !== prevAccount.toLowerCase().trim()) {
                    // 1. Ops Validator assignment
                    if (transferOptions && transferOptions.opsValidatorId !== undefined) {
                        newChanges.assigned_ops_validator_id = transferOptions.opsValidatorId as any;
                        newChanges.assigned_ops_validator_name = transferOptions.opsValidatorName as any;
                    } else {
                        newChanges.assigned_ops_validator_id = null as any;
                        newChanges.assigned_ops_validator_name = null as any;
                    }

                    // 2. Hiring Request ID
                    if (transferOptions && transferOptions.hiringRequestId !== undefined) {
                        newChanges.master_hiring_request_id = transferOptions.hiringRequestId as any;
                    } else {
                        newChanges.master_hiring_request_id = null as any;
                    }

                    if (transferOptions && transferOptions.positionTitle !== undefined) {
                        newChanges.position_title = transferOptions.positionTitle as any;
                    }
                    if (transferOptions && transferOptions.positionId !== undefined) {
                        newChanges.position_id = transferOptions.positionId as any;
                    }

                    // 3. Archive previous Ops Validation remarks into candidate notes before updating
                    const prevRemarks = app?.master_remarks || app?.pis?.ops_validation_remarks || '';
                    if (prevRemarks && prevRemarks !== '---' && !prevRemarks.includes('Transferred')) {
                        const transferNote = `[Account Transfer ${new Date().toLocaleDateString()}] Transferred from "${prevAccount}" to "${accVal}". Previous Remarks: "${prevRemarks}"`;
                        newChanges.notes = app?.notes ? `${app.notes}\n${transferNote}` : transferNote;
                    }

                    const targetRemarks = transferOptions?.opsRemarks || 'Pending Ops Validation';
                    newChanges.master_remarks = targetRemarks;
                }

                const targetRemarks = transferOptions?.opsRemarks || 'Pending Ops Validation';
                const currentPis = (app?.pis || {});
                newChanges.pis = {
                    ...currentPis,
                    ...(newChanges.pis || {}),
                    final_account: accVal,
                    initial_account_assignment: accVal,
                    ...(accVal && prevAccount && accVal.toLowerCase().trim() !== prevAccount.toLowerCase().trim() ? { ops_validation_remarks: targetRemarks } : {})
                } as any;
            }
            if (field === 'master_first_name' || field === 'master_last_name' || field === 'master_middle_name') {
                const currentPis = app?.pis || {};
                const newChangesPis = (newChanges.pis as any) || {};

                const newFirstName = field === 'master_first_name' ? value : (newChanges.master_first_name ?? app?.master_first_name ?? app?.pis?.first_name ?? '');
                const newLastName = field === 'master_last_name' ? value : (newChanges.master_last_name ?? app?.master_last_name ?? app?.pis?.last_name ?? '');
                const newMiddleName = field === 'master_middle_name' ? value : (newChanges.master_middle_name ?? app?.master_middle_name ?? app?.pis?.middle_name ?? '');

                newChanges.pis = {
                    ...currentPis,
                    ...newChangesPis,
                    first_name: newFirstName,
                    last_name: newLastName,
                    middle_name: newMiddleName,
                } as any;

                if (newLastName || newFirstName) {
                    newChanges.applicant_name = `${newLastName ? newLastName + ',' : ''} ${newFirstName} ${newMiddleName}`.trim();
                }
            }



            if (field === 'pis' && value && typeof value === 'object' && 'birth_date' in value) {
                const age = calculateAge(value.birth_date);
                if (age) {
                    newChanges.pis = {
                        ...value,
                        age: parseInt(age)
                    };
                }
            }

            if (field === 'pis' && value && typeof value === 'object') {
                newChanges.pis = {
                    ...value,
                    last_updated_by: updater
                } as any;

                if (value.final_specific_status && String(value.final_specific_status).toLowerCase().includes('hired')) {
                    if (!newChanges.hired_at && !app?.hired_at) {
                        newChanges.hired_at = new Date().toISOString();
                    }
                }

                if (value.final_specific_status && value.final_specific_status !== app?.pis?.final_specific_status) {
                    const specStatus = value.final_specific_status;
                    const mappedOverall = SPECIFIC_STATUS_TO_OVERALL[specStatus];
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
                            if (specStatus.toLowerCase().includes('withdraw') || specStatus.toLowerCase().includes('declined')) {
                                nextCurrentStatus = 'WITHDRAWN';
                            } else if (specStatus.toLowerCase().includes('failed')) {
                                nextCurrentStatus = 'FAILED';
                            } else {
                                nextCurrentStatus = 'REJECTED';
                            }
                        }

                        const isAlreadyConcluded = app?.master_column === 'MASTERLIST' ||
                            CONCLUDED_STATUSES.includes(app?.current_status || '');

                        if (nextCurrentStatus) {
                            if (!isAlreadyConcluded || CONCLUDED_STATUSES.includes(nextCurrentStatus)) {
                                newChanges.current_status = nextCurrentStatus as any;
                                newChanges.master_status = nextCurrentStatus;
                            }
                        } else if (!isAlreadyConcluded) {
                            newChanges.master_status = mappedOverall;
                        }

                        newChanges.overall_status = targetOverall;
                        newChanges.master_remarks = specStatus;

                        const appObj = allApplications.find(a => a.id === appId);
                        const hasEid = Boolean(String(appObj?.master_eid || (appObj as any)?.eid || appObj?.metadata?.eid || (appObj?.pis as any)?.eid || '').trim());

                        const existingCol = (appObj?.master_column || app?.master_column || '').toUpperCase();
                        const isSpecCol = ['OFFBOARDING_WINNERS', 'ONBOARDING_WINNERS', 'OFFBOARDING_TRACKER', 'INACTIVE_APPLICATION'].includes(existingCol);

                        if (nextCurrentStatus === 'WITHDRAWN' || String(specStatus || '').toLowerCase().includes('withdraw')) {
                            newChanges.master_column = hasEid ? 'OFFBOARDING_TRACKER' : 'INACTIVE_APPLICATION';
                        } else if (nextCurrentStatus === 'INACTIVE' || String(specStatus || '').toLowerCase().includes('inactive')) {
                            newChanges.master_column = 'INACTIVE_APPLICATION';
                        } else if (!isSpecCol) {
                            if (mappedOverall === 'HIRED' || mappedOverall === 'PASSED' || mappedOverall === 'For Job Offer') {
                                newChanges.master_column = 'MASTERLIST';
                            } else if (isAlreadyConcluded) {
                                newChanges.master_column = 'MASTERLIST';
                            }
                        }
                    }
                }

                // Automate interview date on interview activity in PIS object
                const hasInterviewActivity = value.initial_interview_results || value.final_specific_status ||
                    value.ops_validator_status || value.client_interview_status;
                if (hasInterviewActivity) {
                    if (!newChanges.interview_completed_at && !app?.interview_completed_at) {
                        newChanges.interview_completed_at = new Date().toISOString();
                    }
                }
            }

            if (['master_first_name', 'master_middle_name', 'master_last_name'].includes(field as string)) {
                const app = allApplications.find(a => a.id === appId);
                const first = field === 'master_first_name' ? value : (newChanges.master_first_name || app?.master_first_name || '');
                const middle = field === 'master_middle_name' ? value : (newChanges.master_middle_name || app?.master_middle_name || '');
                const last = field === 'master_last_name' ? value : (newChanges.master_last_name || app?.master_last_name || '');

                const middleStr = middle ? ` (${middle})` : '';
                newChanges.applicant_name = `${first}${middleStr} ${last}`.trim();

                newChanges.pis = {
                    ...(newChanges.pis || {}),
                    first_name: first,
                    middle_name: middle,
                    last_name: last
                } as any;
            }

            return {
                ...prev,
                [appId]: newChanges
            };
        });
    }, [allApplications, user?.full_name, isEditing]);

    const handleSyncAll = useCallback(async () => {
        const appsToUpdate = Object.keys(localChanges);
        if (appsToUpdate.length === 0) {
            setFocusPath(null);
            return;
        }

        setIsSyncing(true);
        try {
            // Build the full patch list
            const patches: { id: string; data: any }[] = [];
            for (const id of appsToUpdate) {
                const changes = localChanges[id];
                const app = allApplications.find(a => a.id === id);
                if (!app) continue;

                const targetStatus = changes.current_status ?? app.current_status;
                let autoColumn = changes.master_column ?? app.master_column;

                if (targetStatus === 'ENDORSED' && !changes.master_column) {
                    autoColumn = 'Sheet';
                }

                patches.push({ id, data: { ...changes, master_column: autoColumn } });
            }

            // Send in sequential chunks of 10 to avoid hammering the server
            const CHUNK_SIZE = 10;
            for (let i = 0; i < patches.length; i += CHUNK_SIZE) {
                const chunk = patches.slice(i, i + CHUNK_SIZE);
                await Promise.all(chunk.map(p => ApplicationService.patch(p.id, p.data)));
            }

            success('Records Updated', `Successfully updated ${appsToUpdate.length} candidate records.`);
            await loadData(true);
            setLocalChanges({});
            setFocusPath(null);
        } catch (err) {
            console.error('Sync failed:', err);
            error('Update Error', 'Failed to save changes to the list.');
        } finally {
            setIsSyncing(false);
        }
    }, [localChanges, allApplications, success, error, loadData]);

    const handleCancelEdit = useCallback(() => {
        setLocalChanges({});
        setFocusPath(null);
    }, []);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        setDeletingId(null);
        try {
            const ids = Array.from(selectedIds);
            setBulkDeleteProgress(0);

            const chunkSize = 50;
            for (let i = 0; i < ids.length; i += chunkSize) {
                const chunk = ids.slice(i, i + chunkSize);
                await ApplicationService.bulkPatch(chunk, { metadata: { deleted_from_masterlist: true } });
                const processed = Math.min(i + chunkSize, ids.length);
                setBulkDeleteProgress(Math.round((processed / ids.length) * 100));
            }

            success('Masterlist Updated', `${selectedIds.size} records have been hidden from the Masterlist. They remain active in the Interview Form.`);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            loadData(true);
        } catch (e) {
            console.error('Failed batch hide:', e);
            error('Error', 'Failed to hide records from Masterlist.');
        } finally {
            setIsBulkDeleting(false);
        }
    }, [selectedIds, success, error, loadData, setDeletingId]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            const confirmDelete = window.confirm('Are you sure you want to remove this record from the Masterlist? (It will still be available in the Interview Form)');
            if (!confirmDelete) return;

            await ApplicationService.patch(id, { metadata: { deleted_from_masterlist: true } });

            success('Removed from Masterlist', 'The candidate has been hidden from this view but remains in the database.');
            loadData(true);
        } catch (err) {
            console.error(err);
            error('Error', 'Failed to remove record from Masterlist.');
        } finally {
            setDeletingId(null);
        }
    }, [success, error, loadData, setDeletingId]);


    const handleSaveNote = useCallback(async (appId: string, noteText: string, author: string) => {
        const app = allApplications.find(a => a.id === appId);
        if (!app) return;

        let notesArray: any[] = [];
        try {
            notesArray = JSON.parse(app.notes || '[]');
        } catch {
            notesArray = app.notes ? [{ id: 'legacy', text: app.notes, author: 'System', createdAt: app.updated_at }] : [];
        }

        let updatedNotes;
        if (author === 'DELETE_TRIGGER_SYNC') {
            updatedNotes = JSON.stringify(notesArray.filter(n => n.id !== noteText));
        } else {
            const newNote = {
                id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                text: noteText,
                author,
                createdAt: new Date().toISOString()
            };
            updatedNotes = JSON.stringify([...notesArray, newNote]);
        }

        try {
            await ApplicationService.patch(appId, { notes: updatedNotes });
            setAllApplications(prev => prev.map(a => a.id === appId ? { ...a, notes: updatedNotes } : a));
            if (notesApp?.id === appId) {
                setNotesApp((prev: Application | null) => prev ? { ...prev, notes: updatedNotes } : null);
            }
            if (author === 'DELETE_TRIGGER_SYNC') {
                success('Note Deleted', 'Comment has been removed from the candidate profile.');
            } else {
                success('Note Saved', 'Comment has been added to the candidate profile.');
            }
        } catch {
            error('Error', 'Failed to update notes.');
        }
    }, [allApplications, notesApp?.id, success, error]);

    const activeApplications = useMemo(() => {
        // Merge local changes into allApplications for immediate UI feedback
        const mergedApps = allApplications.map(app => ({
            ...app,
            ...(localChanges[app.id] || {})
        }));

        const uniqueApps = Array.from(new Map(mergedApps.map(app => [app.id, app])).values());

        const state = location.state as any;
        const autoSpotlightAppId = state?.autoSpotlightAppId;

        // Dual Visibility: Show MASTERLIST records + any successful sheet records in Masterview
        return uniqueApps.filter(a => {
            const isSpecializedTab = ['OFFBOARDING_WINNERS', 'ONBOARDING_WINNERS', 'OFFBOARDING_TRACKER', 'INACTIVE_APPLICATION'].includes(activeTab);
            if (a.metadata?.deleted_from_masterlist && !isSpecializedTab) return false;

            // Spotlight Override: always include the applicant we are redirecting to
            if (autoSpotlightAppId && a.id === autoSpotlightAppId) {
                return true;
            }

            const col = a.master_column || '';
            const allCandidateStatuses = [
                a.master_status,
                a.current_status,
                a.pis?.final_specific_status,
                a.pis?.ops_validator_status,
                (a.pis as any)?.initial_status,
                (a.pis as any)?.assessment_status,
                (a.pis as any)?.status,
                a.pis?.overall_status
            ].map(s => String(s || '').trim().toUpperCase());

            const failedTerms = FAILED_TERMS;
            const isFailed = allCandidateStatuses.some(s => failedTerms.includes(s) || s === 'FAILED' || s.startsWith('FAILED'));
            const status = a.master_status || a.current_status || 'PENDING';

            if (['MASTERLIST', 'PIVOT', 'EMAIL', 'REPORTS'].includes(activeTab)) {
                const passedStatuses = ['FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING', 'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED', 'CONTRACT_SENT', 'CONTRACT SENT', 'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN ISSUED', 'FOR SIGNATURE', 'PAN_ISSUED', 'POOL', 'POOLED', 'FOR POOL', 'FOR_POOL', 'ACTIVE POOL', 'ACTIVE_POOL', 'POOLING', 'WAITING', 'WAITLISTED'];
                const statusUpper = status.toUpperCase();
                const currUpper = (a.current_status || '').toUpperCase();

                const isPassed = passedStatuses.includes(statusUpper) ||
                    passedStatuses.includes(currUpper) ||
                    statusUpper.includes('PAN') ||
                    currUpper.includes('PAN') ||
                    statusUpper.includes('SIGNATURE') ||
                    currUpper.includes('SIGNATURE') ||
                    statusUpper.includes('POOL') ||
                    currUpper.includes('POOL') ||
                    statusUpper.includes('WAITING') ||
                    currUpper.includes('WAITING') ||
                    statusUpper.includes('WAITLIST') ||
                    currUpper.includes('WAITLIST') ||
                    Boolean(a.master_column === 'MASTERLIST') ||
                    Boolean(a.master_column === 'POOL');

                // Hide failed/rejected candidates UNLESS they've already reached a passed milestone
                // (e.g. failed OV for one account but reprofiled and passed for another)
                if (isFailed && !isPassed) return false;

                // Auto-hide if the candidate's resolved current status is terminal
                const resolvedStatus = String(a.current_status || a.master_status || a.pis?.overall_status || (a.pis as any)?.status || 'PENDING').trim().toUpperCase();
                const terminalStatuses = ['FAILED', 'INACTIVE', 'WITHDRAWN', 'NO SHOW', 'NO_SHOW', 'FALLOUT', 'FALL_OUT', 'AWOL', 'RESIGNED', 'TERMINATED'];
                const isCurrentlyTerminal = terminalStatuses.includes(resolvedStatus) || resolvedStatus.startsWith('FAILED');
                if (isCurrentlyTerminal) {
                    return false;
                }

                // Exclude in-progress active interview pipeline statuses from Masterlist unless candidate has passed
                const inProgressStatuses = [
                    'INITIAL_INTERVIEW', 'INITIAL INTERVIEW',
                    'NO_SHOW', 'NO SHOW',
                    'CLIENT_INTERVIEW', 'CLIENT INTERVIEW',
                    'OPS_VAL_SCHEDULED', 'OPS VAL SCHEDULED',
                    'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW SCHEDULED',
                    'FOR_OPS_VAL_SCHEDULING', 'FOR OPS VAL SCHEDULING',
                    'FINAL_INTERVIEW', 'FINAL INTERVIEW',
                    'FOR REPROFILING', 'FOR_REPROFILING',
                    'REPROFILE OPS VAL INTERVIEW', 'REPROFILE_OPS_VAL_INTERVIEW'
                ];
                const statUpper = String(status || '').toUpperCase();
                const isPooledOrWaiting = a.master_column === 'POOL' ||
                    currUpper.includes('WAITING') ||
                    currUpper.includes('POOL') ||
                    statUpper.includes('WAITING') ||
                    statUpper.includes('POOL');
                if (isPooledOrWaiting) {
                    return false; // Candidate is in pool, do not show in masterlist
                }

                if (inProgressStatuses.includes(currUpper) || inProgressStatuses.includes(statUpper)) {
                    return false;
                }

                // Respect explicit SHEET assignment — records kept out of Masterlist via import checkbox
                const colUpper = (col || '').toUpperCase();
                const isExplicitlySheet = colUpper === 'SHEET' || colUpper === 'OFFICEFORMS_TABLE';
                if (isExplicitlySheet && !isPassed) return false;

                // If column is undefined/empty, only show if they have reached a "Passed/Hired" milestone
                if (!a.master_column) {
                    return isPassed;
                }

                return colUpper === 'MASTERLIST' || colUpper === 'PIVOT' || colUpper === 'EMAIL' || colUpper === 'REPORTS' || colUpper === 'SHEET1' || colUpper === 'POOL' || isPassed;
            }

            if (activeTab === 'OFFBOARDING_TRACKER' || activeTab === 'INACTIVE_APPLICATION') {
                const colUpper = (col || '').toUpperCase();
                const resolvedStatus = String(a.current_status || a.master_status || a.pis?.overall_status || (a.pis as any)?.status || '').trim().toUpperCase();
                const hasEid = Boolean(String(a.master_eid || (a as any).eid || a.metadata?.eid || (a.pis as any)?.eid || '').trim());

                const isExplicitlyInactive = colUpper === 'INACTIVE_APPLICATION' || colUpper === 'INACTIVE APPLICATION' || colUpper === 'INACTIVE';
                const isExplicitlyOffboarding = colUpper === 'OFFBOARDING_TRACKER' || colUpper === 'OFFBOARDING TRACKER' || colUpper === 'OFFBOARDING';
                const isWithdrawn = resolvedStatus === 'WITHDRAWN';
                const isDroppedOut = isExplicitlyInactive || isExplicitlyOffboarding || isWithdrawn;

                if (!isDroppedOut) return false;

                if (activeTab === 'OFFBOARDING_TRACKER') {
                    return hasEid;
                } else {
                    return !hasEid;
                }
            }

            if (activeTab === 'OFFBOARDING_WINNERS' || activeTab === 'ONBOARDING_WINNERS') {
                const colUpper = (col || '').toUpperCase();
                return colUpper === 'OFFBOARDING_WINNERS' ||
                    colUpper === 'ONBOARDING_WINNERS' ||
                    colUpper === 'OFFBOARDING WINNERS' ||
                    colUpper === 'ONBOARDING WINNERS';
            }

            if (activeTab === 'POOL') {
                const isPool = col === 'POOL' || status.toUpperCase() === 'POOL' || status.toUpperCase() === 'WAITING';
                return isPool && !isFailed;
            }

            const colNorm = (col || '').toUpperCase().replace(/\s+/g, '_');
            const tabNorm = (activeTab || '').toUpperCase().replace(/\s+/g, '_');
            return colNorm === tabNorm || col === activeTab;
        });
    }, [allApplications, localChanges, activeTab, location.state]);


    const filteredList = useMemo(() => {
        const state = location.state as any;
        const autoSpotlightAppId = state?.autoSpotlightAppId;

        return activeApplications.filter(a => {
            // Spotlight Override: bypass all filters for the spotlighted applicant
            if (autoSpotlightAppId && a.id === autoSpotlightAppId) {
                return true;
            }

            const isHiddenRecord = a.is_hidden === true || (a.is_hidden as any) === 1 || String(a.is_hidden).toLowerCase() === 'true' || String(a.is_hidden) === '1' || a.metadata?.deleted_from_masterlist === true || String(a.metadata?.deleted_from_masterlist).toLowerCase() === 'true';

            if (user?.role !== 'admin' && user?.role !== 'superadmin' && isHiddenRecord) return false;
            if (isExclusiveMode && !isHiddenRecord) return false;

            const accountToMatch = a.department || '';
            const matchesAccount = !selectedAccount || selectedAccount.length === 0 || selectedAccount.includes('ALL')
                ? true
                : (() => {
                    const candidateDepts = accountToMatch.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
                    return selectedAccount.some(acc => {
                        const accLower = acc.toLowerCase().trim();
                        return candidateDepts.some(d => d === accLower);
                    });
                })();
            const matchesSearch = !search || (() => {
                const rawTerm = search.toLowerCase().trim();
                if (!rawTerm) return true;

                const buildCandidateSearchText = (app: any): string => {
                    const pis = app.pis || {};
                    const meta = app.metadata || {};
                    const parts = [
                        app.applicant_name,
                        app.first_name,
                        app.middle_name,
                        app.last_name,
                        app.master_first_name,
                        app.master_middle_name,
                        app.master_last_name,
                        pis.first_name,
                        pis.middle_name,
                        pis.last_name,
                        app.applicant_email,
                        app.email,
                        app.personal_email,
                        pis.email,
                        app.master_eid,
                        app.eid,
                        app.phone,
                        app.contact_no,
                        pis.contact_no
                    ];
                    return parts.filter(Boolean).join(' ').toLowerCase();
                };

                const candidateText = buildCandidateSearchText(a);
                const pipeTerms = rawTerm.split('|').map(t => t.trim()).filter(Boolean);

                return pipeTerms.some(pipeTerm => {
                    if (candidateText.includes(pipeTerm)) return true;
                    const spaceTokens = pipeTerm.split(/\s+/).filter(t => t.length > 0);
                    if (spaceTokens.length > 1) {
                        return spaceTokens.every(token => candidateText.includes(token));
                    }
                    return false;
                });
            })();

            let matchesYear = true;
            if (selectedYear !== 'ALL') {
                const targetDateStr = a.master_training_start_date || a.applied_at;
                if (targetDateStr) {
                    const d = new Date(targetDateStr);
                    if (!isNaN(d.getTime())) {
                        matchesYear = String(d.getFullYear()) === selectedYear;
                    } else {
                        matchesYear = false;
                    }
                } else {
                    matchesYear = false;
                }
            }

            let matchesPassedMonth = true;
            if (activePassedMonth !== 'ALL') {
                const targetDateStr = a.master_training_start_date;
                if (targetDateStr) {
                    const d = new Date(targetDateStr);
                    if (!isNaN(d.getTime())) {
                        const monthName = d.toLocaleString('default', { month: 'long' });
                        matchesPassedMonth = monthName === activePassedMonth;
                    } else {
                        matchesPassedMonth = false;
                    }
                } else {
                    const ovPassed = String((a as any).ops_validator_status || (a.pis as any)?.ops_validator_status || (a.metadata as any)?.ops_validator_status).toUpperCase().includes('PASS');
                    const clientPassed = String((a as any).client_interview_status || (a.pis as any)?.client_interview_status || (a.metadata as any)?.client_assessment_status).toUpperCase().includes('PASS');

                    if (ovPassed || clientPassed) {
                        const dateStr = a.applied_at;
                        if (dateStr) {
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                const monthName = d.toLocaleString('default', { month: 'long' });
                                matchesPassedMonth = monthName === activePassedMonth;
                            } else {
                                matchesPassedMonth = false;
                            }
                        } else {
                            matchesPassedMonth = false;
                        }
                    } else {
                        matchesPassedMonth = false;
                    }
                }
            }

            let matchesStartDate = true;
            if (startDateFilter.type !== 'ALL') {
                const trainingDateStr = a.master_training_start_date;
                if (!trainingDateStr) {
                    matchesStartDate = false;
                } else {
                    const dateObj = new Date(trainingDateStr);
                    if (isNaN(dateObj.getTime())) {
                        matchesStartDate = false;
                    } else {
                        const now = new Date();
                        if (startDateFilter.type === 'TODAY') {
                            matchesStartDate = dateObj.toDateString() === now.toDateString();
                        } else if (startDateFilter.type === 'WEEK') {
                            const startOfWeek = new Date(now);
                            const day = startOfWeek.getDay();
                            if (day !== 1) startOfWeek.setHours(-24 * (day === 0 ? 6 : day - 1));
                            startOfWeek.setHours(0, 0, 0, 0);
                            const endOfWeek = new Date(startOfWeek);
                            endOfWeek.setDate(startOfWeek.getDate() + 6);
                            endOfWeek.setHours(23, 59, 59, 999);
                            matchesStartDate = dateObj >= startOfWeek && dateObj <= endOfWeek;
                        } else if (startDateFilter.type === 'MONTH' || startDateFilter.type === 'CUSTOM') {
                            const start = startDateFilter.start ? new Date(startDateFilter.start) : null;
                            const end = startDateFilter.end ? new Date(startDateFilter.end) : null;
                            if (end) end.setHours(23, 59, 59, 999);

                            if (start && end) {
                                matchesStartDate = dateObj >= start && dateObj <= end;
                            } else if (start) {
                                matchesStartDate = dateObj >= start;
                            } else if (end) {
                                matchesStartDate = dateObj <= end;
                            } else if (startDateFilter.type === 'MONTH') {
                                matchesStartDate = dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
                            }
                        }
                    }
                }
            }

            let matchesDateAdded = true;
            if (dateAddedFilter.type !== 'ALL') {
                const addedDateStr = a.created_at;
                if (!addedDateStr) {
                    matchesDateAdded = false;
                } else {
                    const dateObj = new Date(addedDateStr);
                    if (isNaN(dateObj.getTime())) {
                        matchesDateAdded = false;
                    } else {
                        const now = new Date();
                        if (dateAddedFilter.type === 'TODAY') {
                            matchesDateAdded = dateObj.toDateString() === now.toDateString();
                        } else if (dateAddedFilter.type === 'WEEK') {
                            const startOfWeek = new Date(now);
                            const day = startOfWeek.getDay();
                            if (day !== 1) startOfWeek.setHours(-24 * (day === 0 ? 6 : day - 1));
                            startOfWeek.setHours(0, 0, 0, 0);
                            const endOfWeek = new Date(startOfWeek);
                            endOfWeek.setDate(startOfWeek.getDate() + 6);
                            endOfWeek.setHours(23, 59, 59, 999);
                            matchesDateAdded = dateObj >= startOfWeek && dateObj <= endOfWeek;
                        } else if (dateAddedFilter.type === 'MONTH' || dateAddedFilter.type === 'CUSTOM') {
                            const start = dateAddedFilter.start ? new Date(dateAddedFilter.start) : null;
                            const end = dateAddedFilter.end ? new Date(dateAddedFilter.end) : null;

                            // Ensure the end date spans the entire day (up to 23:59:59.999) to include all records on that day
                            if (end) end.setHours(23, 59, 59, 999);

                            if (start && end) {
                                matchesDateAdded = dateObj >= start && dateObj <= end;
                            } else if (start) {
                                matchesDateAdded = dateObj >= start;
                            } else if (end) {
                                matchesDateAdded = dateObj <= end;
                            } else if (dateAddedFilter.type === 'MONTH') {
                                matchesDateAdded = dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
                            }
                        }
                    }
                }
            }

            // Improved Date Activity Filter (Today, Week, Month)
            let matchesDateFilter = true;
            if (selectedDateFilter !== 'ALL') {
                const now = new Date();

                const parseSafe = (val: any) => {
                    if (!val) return null;
                    if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? null : d;
                };

                const activityDate = parseSafe(a.updated_at || a.applied_at);

                if (activityDate) {
                    if (selectedDateFilter === 'TODAY') {
                        matchesDateFilter = activityDate.toDateString() === now.toDateString();
                    } else if (selectedDateFilter === 'WEEK') {
                        // Current Calendar Week (starting Monday)
                        const startOfWeek = new Date(now);
                        const day = startOfWeek.getDay() || 7; // Get current day number, convert Sunday (0) to 7
                        if (day !== 1) startOfWeek.setHours(-24 * (day - 1)); // Back to Monday
                        startOfWeek.setHours(0, 0, 0, 0);
                        matchesDateFilter = activityDate >= startOfWeek;
                    } else if (selectedDateFilter === 'MONTH') {
                        matchesDateFilter = activityDate.getMonth() === now.getMonth() && activityDate.getFullYear() === now.getFullYear();
                    }
                } else {
                    matchesDateFilter = false;
                }
            }

            const effectiveStatus = a.master_status || a.current_status || '';
            let matchesStatus = false;
            const isSpecializedTab = ['INACTIVE_APPLICATION', 'OFFBOARDING_TRACKER', 'OFFBOARDING_WINNERS', 'ONBOARDING_WINNERS', 'POOL'].includes(activeTab);

            if (!selectedStatus || selectedStatus.length === 0 || selectedStatus.includes('ALL')) {
                matchesStatus = isSpecializedTab
                    ? true
                    : !['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED'].includes(String(effectiveStatus).toUpperCase().trim());
            } else {
                matchesStatus = selectedStatus.some(status => {
                    const s = status.toUpperCase().trim();
                    const effectiveUpper = String(effectiveStatus).toUpperCase().trim();
                    if (s === 'RESCHEDULED_INITIAL') {
                        return effectiveUpper === 'RESCHEDULED' && ((a.pis as any)?.initial_interview_schedule || String(a.position_title).toLowerCase().includes('initial'));
                    } else if (s === 'RESCHEDULED_ASSESSMENT') {
                        return effectiveUpper === 'RESCHEDULED' && ((a.pis as any)?.assessment_schedule || String(a.position_title).toLowerCase().includes('assessment'));
                    } else if (s === 'REJECTED') {
                        return ['REJECTED', 'FAILED'].includes(effectiveUpper);
                    } else if (s === 'ACCEPTED_OFFER' || s === 'ACCEPTED OFFER') {
                        return ['ACCEPTED OFFER', 'ACCEPTED_OFFER', 'HIRED', 'HIRED_PROCESSED', 'PROMOTED', 'PROMOTION', 'LATERAL TRANSFER', 'LATERAL_TRANSFER'].includes(effectiveUpper);
                    } else if (s === 'FOR_JOB_OFFER' || s === 'FOR JOB OFFER') {
                        return ['FOR JOB OFFER', 'FOR_JOB_OFFER'].includes(effectiveUpper);
                    } else if (s === 'SENT_JO_AND_BGC' || s === 'SENT JO AND BGC') {
                        return ['SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(effectiveUpper);
                    } else if (s === 'FOR_PAN' || s === 'FOR PAN') {
                        return ['FOR PAN', 'FOR_PAN'].includes(effectiveUpper);
                    } else {
                        return effectiveUpper === s;
                    }
                });
            }
            const matchesWave = selectedWave === 'ALL' || String(a.master_wave || '').toUpperCase() === selectedWave.toUpperCase();
            const type = a.metadata?.candidate_type || a.pis?.candidate_type || 'EXTERNAL';
            const matchesHireType = selectedHireType === 'ALL' || type.toUpperCase() === selectedHireType.toUpperCase();

            let matchesOfficialEndorsement = true;
            if (isOfficialEndorsement) {
                const hasEID = !!a.master_eid || !!(a.pis as any)?.employee_id;
                const hasEmail = !!a.master_cp36_email || !!(a.pis as any)?.cp360_email || !!(a.pis as any)?.cp360_email;
                const pemeResult = String(a.master_peme_result || (a.pis as any)?.peme_result || '').toUpperCase();
                const hasPEME = pemeResult.includes('CLASS A') || pemeResult.includes('CLASS B');
                if (!hasEID || !hasEmail || !hasPEME) {
                    matchesOfficialEndorsement = false;
                }
            }

            const isBaseMatch = matchesAccount && matchesSearch && matchesStatus && matchesWave && matchesStartDate && matchesDateAdded && matchesPassedMonth && matchesDateFilter && matchesYear && matchesHireType && matchesOfficialEndorsement;

            if (activeTab === 'PIVOT') {
                const matchesTraining = pivotTraining === 'ALL' || a.master_training_start_date === pivotTraining;
                const matchesPos = pivotPosition === 'ALL' || a.position_title === pivotPosition;
                const matchesStat = pivotStatus === 'ALL' || String(a.current_status || '').toUpperCase() === pivotStatus.toUpperCase();
                const matchesAcc = pivotAccount === 'ALL' || a.department === pivotAccount;
                return isBaseMatch && matchesTraining && matchesPos && matchesStat && matchesAcc;
            }

            if (activeTab === 'MASTERLIST' || activeTab === 'SHEET1') {
                if (activeSubTab === 'NOT ELIGIBLE') {
                    return isBaseMatch && a.current_status === 'NOT_ELIGIBLE_FOR_REHIRE';
                }

                const statusUpper = String(effectiveStatus).toUpperCase();
                const currUpper = String(a.current_status || '').toUpperCase();
                const validDropdownStatuses = [
                    'ACCEPTED_OFFER', 'ACCEPTED OFFER', 'SENT_JO_AND_BGC', 'SENT JO AND BGC',
                    'FOR_JOB_OFFER', 'FOR JOB OFFER', 'FOR_PAN', 'FOR PAN', 'PAN_COMPLETED', 'PAN COMPLETED',
                    'CONTRACT_SENT', 'CONTRACT SENT', 'PASSED', 'RESCHEDULED',
                    'HIRED', 'CONFIRMED TRAINING', 'CONFIRMED_TRAINING',
                    'LATERAL TRANSFER', 'LATERAL_TRANSFER', 'PROMOTED', 'PROMOTION',
                    'PAN ISSUED; FOR SIGNATURE', 'PAN ISSUED FOR SIGNATURE', 'PAN ISSUED', 'FOR SIGNATURE', 'PAN_ISSUED',
                    'POOL', 'POOLED', 'FOR POOL', 'FOR_POOL', 'ACTIVE POOL', 'ACTIVE_POOL', 'POOLING', 'WAITING', 'WAITLISTED'
                ];
                const isStatusValid = validDropdownStatuses.includes(statusUpper) ||
                    validDropdownStatuses.includes(currUpper) ||
                    statusUpper.includes('PAN') ||
                    currUpper.includes('PAN') ||
                    statusUpper.includes('SIGNATURE') ||
                    currUpper.includes('SIGNATURE') ||
                    statusUpper.includes('POOL') ||
                    currUpper.includes('POOL') ||
                    statusUpper.includes('WAITING') ||
                    currUpper.includes('WAITING') ||
                    statusUpper.includes('WAITLIST') ||
                    currUpper.includes('WAITLIST') ||
                    Boolean(a.master_status) ||
                    Boolean(a.master_column === 'MASTERLIST') ||
                    Boolean(a.master_column === 'POOL');

                const inProgressStatuses = [
                    'INITIAL_INTERVIEW', 'INITIAL INTERVIEW',
                    'NO_SHOW', 'NO SHOW',
                    'CLIENT_INTERVIEW', 'CLIENT INTERVIEW',
                    'OPS_VAL_SCHEDULED', 'OPS VAL SCHEDULED',
                    'FINAL_INTERVIEW_SCHEDULED', 'FINAL INTERVIEW SCHEDULED',
                    'FOR_OPS_VAL_SCHEDULING', 'FOR OPS VAL SCHEDULING',
                    'FINAL_INTERVIEW', 'FINAL INTERVIEW',
                    'FOR REPROFILING', 'FOR_REPROFILING',
                    'REPROFILE OPS VAL INTERVIEW', 'REPROFILE_OPS_VAL_INTERVIEW'
                ];
                const isPooledOrWaiting = a.master_column === 'POOL' ||
                    currUpper.includes('WAITING') ||
                    currUpper.includes('POOL') ||
                    statusUpper.includes('WAITING') ||
                    statusUpper.includes('POOL');
                if (!isPooledOrWaiting && (inProgressStatuses.includes(currUpper) || inProgressStatuses.includes(statusUpper))) {
                    return false;
                }

                if (!isStatusValid) {
                    return false;
                }

                return isBaseMatch;
            }

            if (activeTab === 'EMAIL') {
                const isDone = !!(a.master_rcbc_status && a.master_neo_date && a.master_peme_status);
                if (emailFilter === 'PENDING' && isDone) return false;
                if (emailFilter === 'DONE' && !isDone) return false;
                return isBaseMatch;
            }

            if (activeTab === 'INACTIVE_APPLICATION') {
                const isInactive = ['FAILED', 'REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE', 'INACTIVE', 'NO SHOW', 'NO_SHOW', 'BACKOUT', 'BACK OUT'].includes(String(a.current_status || '').toUpperCase()) ||
                    String(a.master_column || '').toUpperCase() === 'INACTIVE_APPLICATION';
                return isBaseMatch && isInactive;
            }

            if (activeTab === 'POOL') {
                return isBaseMatch && (a.master_column === 'POOL' || a.current_status === 'POOL' || String(a.current_status).toUpperCase() === 'WAITING');
            }

            if (activeTab === 'YC') {
                return isBaseMatch && (a.master_column === 'YC');
            }


            return isBaseMatch;
        }).sort((a, b) => {
            const isBuffer = (app: Application) => {
                const remarks = String(app.master_remarks || app.pis?.ops_validation_remarks || '').toUpperCase();
                return remarks.includes('CONFIRMED TRAINING - BUFFER');
            };
            const aIsBuffer = isBuffer(a);
            const bIsBuffer = isBuffer(b);

            if (aIsBuffer && !bIsBuffer) return 1;
            if (!aIsBuffer && bIsBuffer) return -1;

            // Primary sort by explicit sort order or Date Added (Ascending)
            const getRank = (app: Application) => app.metadata?.master_sort_order ?? new Date(app.applied_at || app.created_at || 0).getTime();
            const rankA = getRank(a);
            const rankB = getRank(b);

            if (rankA < rankB) return -1;
            if (rankA > rankB) return 1;

            // Secondary sort by account
            const rawA = a.pis?.final_account || a.endorsement_account || a.department || '';
            const rawB = b.pis?.final_account || b.endorsement_account || b.department || '';
            const accA = String(rawA).toLowerCase().trim();
            const accB = String(rawB).toLowerCase().trim();

            if (accA < accB) return -1;
            if (accA > accB) return 1;

            // Tertiary sort by name
            const nameA = String(a.applicant_name || '').toLowerCase().trim();
            const nameB = String(b.applicant_name || '').toLowerCase().trim();
            return nameA.localeCompare(nameB);
        });
    }, [activeApplications, selectedAccount, search, startDateFilter, dateAddedFilter, activePassedMonth, activeTab, pivotTraining, pivotPosition, pivotStatus, pivotAccount, activeSubTab, selectedStatus, selectedWave, emailFilter, selectedDateFilter, selectedDay, selectedYear, location.state, selectedHireType, isOfficialEndorsement, isExclusiveMode]);

    const officialEndorsementCount = useMemo(() => {
        if (isOfficialEndorsement) {
            return filteredList.length;
        }
        return filteredList.filter(a => {
            const hasEID = !!a.master_eid || !!(a.pis as any)?.employee_id;
            const hasEmail = !!a.master_cp36_email || !!(a.pis as any)?.cp360_email || !!(a.pis as any)?.cp360_email;
            const pemeResult = String(a.master_peme_result || (a.pis as any)?.peme_result || '').toUpperCase();
            const hasPEME = pemeResult.includes('CLASS A') || pemeResult.includes('CLASS B');
            return hasEID && hasEmail && hasPEME;
        }).length;
    }, [filteredList, isOfficialEndorsement]);


    const handleMoveRow = useCallback(async (appId: string, direction: 'up' | 'down') => {
        const currentIndex = filteredList.findIndex(a => a.id === appId);
        if (currentIndex < 0) return;
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (swapIndex < 0 || swapIndex >= filteredList.length) return;

        const currentApp = filteredList[currentIndex];
        const swapApp = filteredList[swapIndex];

        const getRank = (app: Application) => app.metadata?.master_sort_order ?? new Date(app.applied_at || app.created_at || 0).getTime();

        const rankSwap = getRank(swapApp);

        // Find the boundary app on the other side of the swapApp
        const boundaryIndex = direction === 'up' ? swapIndex - 1 : swapIndex + 1;
        const boundaryApp = filteredList[boundaryIndex];

        const rankBoundary = boundaryApp ? getRank(boundaryApp) : (direction === 'up' ? rankSwap - 1000000 : rankSwap + 1000000);

        let newRank = (rankSwap + rankBoundary) / 2;

        if (rankSwap === rankBoundary) {
            newRank = direction === 'up' ? rankSwap - 1 : rankSwap + 1;
        }

        setLocalChanges(prev => {
            return {
                ...prev,
                [currentApp.id]: {
                    ...prev[currentApp.id],
                    metadata: { ...(currentApp.metadata || {}), master_sort_order: newRank }
                }
            };
        });

        try {
            await ApplicationService.patch(currentApp.id, { metadata: { ...(currentApp.metadata || {}), master_sort_order: newRank } });
        } catch (e) {
            console.error(e);
        }
    }, [filteredList]);

    const accountMetrics = useMemo(() => {
        const groups: Record<string, { count: number; positions: Set<string> }> = {};

        // Let's seed with valid departments
        validDepartments.forEach(dept => {
            groups[dept] = { count: 0, positions: new Set() };
        });

        activeApplications.forEach(app => {
            const rawDept = app.department || 'Support & Leadership / Others';
            if (!groups[rawDept]) groups[rawDept] = { count: 0, positions: new Set() };
            groups[rawDept].count++;
            groups[rawDept].positions.add(app.position_title);
        });

        return Object.entries(groups)
            .filter(([name, data]) => data.count > 0 || validDepartments.includes(name)) // Only show ones with data or explicit valid depts
            .map(([name, data]) => ({
                name,
                count: data.count,
                positionCount: data.positions.size
            })).sort((a, b) => b.count - a.count);
    }, [activeApplications, validDepartments]);

    const pivotOptions = useMemo(() => {
        return {
            training: Array.from(new Set(allApplications.map(a => a.master_training_start_date).filter((t): t is string => !!t))).sort(),
            positions: Array.from(new Set(allApplications.map(a => a.position_title).filter(Boolean))).sort(),
            statuses: Array.from(new Set(allApplications.map(a => a.current_status).filter(Boolean))).sort(),
            accounts: Array.from(new Set(allApplications.map(a => a.department).filter(Boolean))).sort()
        };
    }, [allApplications]);

    const waveOptions = useMemo(() => {
        return Array.from(new Set(allApplications.map(a => a.master_wave).filter((w): w is string => !!w))).sort((a, b) => {
            const aNum = parseInt(String(a).replace(/\D/g, '')) || 0;
            const bNum = parseInt(String(b).replace(/\D/g, '')) || 0;
            return aNum - bNum;
        });
    }, [allApplications]);

    const handleExportExcel = useCallback(() => {
        const listToExport = filteredList;
        if (listToExport.length === 0) return;

        const exportData = listToExport.map(app => {
            let trueAccount = app.department || app.endorsement_account || app.pis?.final_account || '';
            if (trueAccount.includes(',')) {
                const failedSet = new Set((app.metadata?.failed_accounts || []).map((f: string) => f.trim().toLowerCase()));
                const parts = trueAccount.split(',').map((s: string) => s.trim()).filter((s: string) => s && !failedSet.has(s.toLowerCase()));

                // If a specific account filter is active, prefer that account from the list
                if (selectedAccount && selectedAccount.length > 0 && !selectedAccount.includes('ALL')) {
                    const matchedPart = parts.find(p =>
                        selectedAccount.some(acc => p.toLowerCase() === acc.toLowerCase())
                    );
                    trueAccount = matchedPart || (parts.length > 0 ? parts[parts.length - 1] : trueAccount.split(',').pop()?.trim() || trueAccount);
                } else {
                    trueAccount = parts.length > 0 ? parts[parts.length - 1] : trueAccount.split(',').pop()?.trim() || trueAccount;
                }
            }

            const lobsToRemove = ['Technical Support', 'Technical Suppo', 'Agent - Backoffice', 'Agent - Case Manager', 'Case Manager', 'BDR', 'DIA'];
            for (const lob of lobsToRemove) {
                const regex = new RegExp(lob, 'gi');
                if (regex.test(trueAccount)) {
                    trueAccount = trueAccount.replace(regex, '').trim();
                }
            }

            return {
                'WAVE': app.master_wave || '',
                'Account': trueAccount,
                'LOB': (() => {
                    const deptVal = String(app.department || '');
                    const knownLobs = ['Technical Support', 'Technical Suppo', 'Agent - Backoffice', 'Agent - Case Manager', 'Case Manager', 'BDR', 'DIA'];
                    for (const lob of knownLobs) {
                        if (deptVal.includes(lob)) return lob === 'Technical Suppo' ? 'Technical Support' : lob;
                    }
                    const deptUpper = deptVal.toUpperCase();
                    if (deptUpper.includes('BDR')) return 'BDR';
                    if (deptUpper.includes('DIA')) return 'DIA';
                    return app.pis?.custom_lob || '';
                })(),
                'Hiring Request ID': app.master_hiring_request_id || '',
                'Position': app.position_title,
                'Status': (app.current_status || app.master_status || '').replace(/_/g, ' '),
                'Remarks': (() => {
                    let raw = app.final_interview_notes || app.master_remarks || '';
                    if (raw) raw = raw.replace(/\s*\(Force Pass\)/gi, '').replace(/\s*\(Force Fail\)/gi, '');
                    return cleanColumn1Text(raw);
                })(),
                'Previous Salary': (app.pis as any)?.previous_compensation || (app.pis as any)?.previous_salary || app.metadata?.previous_salary || app.interview_responses?.['be3d7992-f21f-4551-b270-d80503b3a89b'] || '',
                "If you don't mind us asking how much is your salary expectations?": app.pis?.salary_expectation || app.metadata?.salary_expectations || app.metadata?.salary_expectation || app.interview_responses?.['5c379862-667c-4d5f-abcc-41eb693e811a'] || app.interview_responses?.['737ef5db-461b-4b76-a3de-a3b574f3b163'] || '',
                'Eid': app.master_eid || '',
                'Column': app.master_column || '',
                'Last Name': app.master_last_name || '',
                'Middle Name': app.master_middle_name || '',
                'First Name': app.master_first_name || '',
                'Preferred Nickname': app.preferred_nickname || app.pis?.preferred_nickname || '',
                'Date of Birth': (() => {
                    const d = app.pis?.birth_date;
                    if (!d || d === '---') return '';
                    const dateObj = new Date(d);
                    return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                })(),
                'Contact No.': app.pis?.phone || '',
                'Personal Email Address': app.applicant_email,
                'CP360 Email Address': app.master_cp36_email || '',
                'TRAINING START DATE': (() => {
                    const d = app.master_training_start_date;
                    if (!d || d === '---') return '';
                    const dateObj = new Date(d);
                    if (isNaN(dateObj.getTime())) return d;

                    // Heal 2001 anomaly during export for consistency
                    if (dateObj.getFullYear() === 2001) {
                        dateObj.setFullYear(new Date().getFullYear());
                    }

                    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                })(),
                'BASIC SALARY': app.master_basic_salary || '',
                'ALLOWANCE': app.master_allowance || '',
                'Exam Score': app.assessment_score || '',
                'Typing Test': app.typing_test_wpm ? `${app.typing_test_wpm} WPM / ${app.typing_test_accuracy}%` : '',
                'SOURCE': app.hiring_source || app.pis?.hiring_source || '',
                'NAME OF RECRUITER': app.assigned_recruiter_name || 'System',
                'NEO Date': app.master_neo_date || '',
                'PEME': app.master_peme_status || '',
                'PEME Result': app.master_peme_result || '',
                'PHIC': app.pis?.philhealth_no || '',

                'BGS Status': app.master_bgs_status || '',
                'Email NBI': app.master_email_nbi_status || '',
                'NBI Result': app.master_nbi_result || '',
                'BI Endorsement': app.master_bi_endorsement_date || '',
                'BI Result': app.master_bi_result || '',
                'SSS No.': app.pis?.sss_no || '',
                'PhilHealth No.': app.pis?.philhealth_no || '',
                'Pag-Ibig No.': app.pis?.pagibig_no || '',
                'Tin No.': app.pis?.tin_no || app.tin_no || ''
            };
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

            const statusColIndex = headerKeys.indexOf('Status');
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
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Masterlist');
        const accStr = selectedAccount && !selectedAccount.includes('ALL') && selectedAccount.length > 0
            ? (selectedAccount.length === 1 ? selectedAccount[0].toUpperCase() : 'MULTI_ACCOUNT')
            : 'ALL';
        XLSX.writeFile(workbook, `RECRUIT360_${accStr}_REGISTRY_${new Date().toISOString().split('T')[0]}.xlsx`);
        success('Exported', 'Registry has been saved as Excel.');
    }, [selectedAccount, filteredList, allApplications, success]);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredList.map(a => a.id)));
        }
    }, [selectedIds.size, filteredList]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleImportCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to 2D array first to find the REAL header row
                const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                // Find the header row index (the first row that contains 'name' or 'account' or 'status')
                const headerRowIndex = rawRows.findIndex(row =>
                    Array.isArray(row) && row.some(cell => {
                        const s = cell?.toString().toLowerCase() || '';
                        return s.includes('name') || s.includes('account') || s.includes('status') || s.includes('wave');
                    })
                );

                if (headerRowIndex === -1) {
                    error('Header Error', 'Could not find the header row. Please ensure your Excel has headers like "Name" or "Account".');
                    return;
                }

                const headers = rawRows[headerRowIndex].map(h => h?.toString().trim() || '');
                if (headers.length === 0) {
                    error('Header Error', 'The header row appears to be empty.');
                    return;
                }

                const rawDataRows = rawRows.slice(headerRowIndex + 1);
                const validJson: any[] = [];
                let consecutiveEmpty = 0;

                for (const row of rawDataRows) {
                    if (!Array.isArray(row)) continue;

                    // Check if the row is a separator row (e.g., filled with ########## or ----------)
                    // We only discard if the WHOLE row is nothing but symbols
                    const isSeparator = row.every(val => {
                        const s = String(val || '').trim();
                        if (!s) return true;
                        return s.length > 5 && (/^#+$/.test(s) || /^-+$/.test(s) || /^=+$/.test(s) || /^\*+$/.test(s));
                    });

                    if (isSeparator) {
                        consecutiveEmpty = 0;
                        continue;
                    }

                    const hasValues = row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
                    if (!hasValues) {
                        consecutiveEmpty++;
                        if (consecutiveEmpty > 10) break;
                        continue;
                    }
                    consecutiveEmpty = 0;
                    const obj: any = {};
                    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
                    const valCount = Object.values(obj).filter(v => v !== null && v !== undefined && v.toString().trim() !== '').length;
                    if (valCount >= 3) validJson.push(obj);
                }

                if (validJson.length === 0) {
                    error('No Data', 'No valid candidate records found in the file.');
                    return;
                }

                const allHeaders = new Set<string>();
                validJson.forEach(row => Object.keys(row).forEach(k => {
                    if (k) allHeaders.add(k);
                }));

                const normalizedJson = validJson.map(row => {
                    const normalized: any = {};
                    Array.from(allHeaders).forEach(h => {
                        let val = row[h];

                        const dateTerms = ['date', 'birth', 'applied', 'updated', ' at', 'time', 'entry', 'start'];
                        const isDateColumn = dateTerms.some(term => h.toLowerCase().includes(term));
                        if (isDateColumn && val) {
                            let dateObj: Date | null = null;

                            if (val instanceof Date) {
                                dateObj = val;
                            } else if (typeof val === 'number') {
                                dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
                            } else if (typeof val === 'string' && val.trim() !== '') {
                                dateObj = new Date(val);
                                // Fallback: if '27-Apr' style without year
                                if (isNaN(dateObj.getTime()) && val.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
                                    dateObj = new Date(`${val}-${new Date().getFullYear()}`);
                                }
                            }

                            if (dateObj && !isNaN(dateObj.getTime())) {
                                // Heal 2001 anomaly (Excel's default for missing year in some locales)
                                if (dateObj.getFullYear() === 2001 && !h.toLowerCase().includes('birth')) {
                                    dateObj.setFullYear(new Date().getFullYear());
                                }
                                val = dateObj.toISOString();
                            } else {
                                val = null;
                            }
                        }

                        normalized[h] = (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) ? null : val;
                    });
                    return normalized;
                });

                setImportPreview(normalizedJson);
            } catch (err) {
                console.error('Failed to parse CSV:', err);
                error('Parse Error', 'Failed to read the file contents.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const mapRawToApplication = (json: any[]) => {
        return json.map(row => {
            const rowKeys = Object.keys(row);
            const find = (variants: string[]) => {
                const normalizedVariants = variants.map(v => v.toLowerCase().trim());

                // 1. Strict Match - Prioritize the order of variants
                for (const variant of normalizedVariants) {
                    const exactKey = rowKeys.find(k => k.toLowerCase().trim() === variant);
                    if (exactKey) return row[exactKey];
                }

                // 2. Fuzzy Match - Still prioritize the order of variants
                for (const variant of normalizedVariants) {
                    const fuzzyKey = rowKeys.find(k => {
                        const nk = k.toLowerCase().trim();
                        const isIdColumn = nk.includes('id') || nk.includes('no.') || nk.includes('#') || nk === 'no';

                        let match = nk.includes(variant) || variant.includes(nk);

                        // STRICTURE: Generic 'Name' column should NOT match specific First/Last/Middle requirements
                        if (nk === 'name' && (variant.includes('first') || variant.includes('last') || variant.includes('middle'))) {
                            match = false;
                        }

                        // STRICTURE: Prevent generic email fields and specialized ones from colliding
                        const normalizedK = nk.replace(/[^a-z0-9]/g, '');
                        const normalizedV = variant.replace(/[^a-z0-9]/g, '');
                        const isGenericK = normalizedK === 'email' || normalizedK === 'emailaddress';
                        const isGenericV = normalizedV === 'email' || normalizedV === 'emailaddress';

                        // 1. Don't let 'Email' (K) match 'Ops Validator Email' (V)
                        if (isGenericK && normalizedV.includes(normalizedK) && normalizedV.length > 10) match = false;

                        // 2. Don't let 'Ops Validator Email' (K) match 'Email' (V)
                        if (isGenericV && normalizedK.includes(normalizedV) && normalizedK.length > 10) match = false;

                        // STRICTURE: If we are looking for a DATE or START, don't let it match a column that is purely STATUS
                        if (match && (variant.includes('date') || variant.includes('start')) && nk.includes('status')) {
                            match = false;
                        }

                        if (isIdColumn && !variant.includes('id') && !variant.includes('no') && !variant.includes('#')) {
                            match = false;
                        }
                        return match;
                    });
                    if (fuzzyKey) return row[fuzzyKey];
                }

                return null;
            };

            let firstName = find(['First Name', 'Given Name', 'FName', 'FirstName', 'GivenName', 'Candidate First Name', 'Applicant First Name', 'First_Name']);
            let lastName = find(['Last Name', 'Surname', 'LName', 'LastName', 'SurName', 'Candidate Last Name', 'Applicant Last Name', 'Last_Name', 'Family Name']);
            let middleName = find(['Middle Name', 'MName', 'MiddleName', 'M.I', 'MI']);

            // Narrow down full name variants to avoid accidental status matches
            let fullName = find(['Applicant Name', 'Full Name', 'Candidate Name', 'Employee Name', 'Name of Candidate', 'Name']);

            // Inverse Logic: If we only have a full name but are missing components, attempt decomposition
            if (fullName && (!firstName || !lastName)) {
                const nameStr = String(fullName);
                // Try to split "Last, First Middle" or "First Middle Last"
                if (nameStr.includes(',')) {
                    const parts = nameStr.split(',').map((s: string) => s.trim());
                    if (!lastName) lastName = parts[0];
                    if (!firstName) {
                        const firstMiddle = parts[1]?.split(' ');
                        firstName = firstMiddle?.[0] || '';
                        if (!middleName && firstMiddle && firstMiddle.length > 1) {
                            middleName = firstMiddle.slice(1).join(' ');
                        }
                    }
                } else {
                    const parts = nameStr.split(' ').map((s: string) => s.trim()).filter((p: string) => p.length > 0);
                    if (parts.length >= 2) {
                        // Assumption: First part is First Name, Last part is Last Name, everything else is Middle
                        if (!firstName) firstName = parts[0];
                        if (!lastName) lastName = parts[parts.length - 1];
                        if (!middleName && parts.length > 2) {
                            middleName = parts.slice(1, -1).join(' ');
                        }
                    }
                }
            }

            // Intelligent Name Construction:
            // If we have separate name components, they are often more reliable than a single "Name" column 
            if (firstName || lastName) {
                const constructed = `${lastName || ''}${lastName && firstName ? ', ' : ''}${firstName || ''}${middleName ? ` ${middleName}` : ''}`.trim();

                // If we don't have a full name, or the constructed name is more detailed, use the constructed one.
                if (!fullName || (fullName.length < constructed.length && constructed.length > 0)) {
                    fullName = constructed;
                }
            }

            const email = find(['Email', 'Applicant Email', 'Personal Email Address', 'Email Address', 'Primary Email', 'EmailAddress']);
            const eid = find(['EID', 'Employee ID', 'ID Number', 'EmployeeNo', 'Staff ID']);
            const hrid = find(['Hiring Request ID', 'HRID', 'Request ID', 'Job ID', 'Requisition ID']);

            const typing = find(['Typing Test', 'Typing', 'Typing Score', 'WPM']);
            let typingWpm = null;
            let typingAcc = null;
            if (typing) {
                const parts = typing.toString().split(new RegExp('[\\/\\s%]+'));
                const wpm = parseInt(parts[0]);
                const acc = parts[1] ? parseInt(parts[1]) : null;
                typingWpm = isNaN(wpm) ? null : wpm;
                typingAcc = isNaN(acc as number) ? null : acc;
            }

            const result: any = {
                applicant_name: fullName || '',
                applicant_email: email || '',
                department: find(['Account', 'Final Account', 'Client', 'Department', 'Dept']),
                position_title: find(['Position', 'Position Title', 'Position Applying For?', 'Role', 'Job Title', 'Job']),
                current_status: (find(['STATUS', 'Application Status', 'Step', 'State']) || 'Applicant Form').toString(),
                source: 'SHEET_IMPORT',
                hiring_source: find(['SOURCE', 'Hiring Source', 'Referral Source']) || '',
                birth_date: find(['Date of Birth', 'DOB', 'Birth Date', 'Birthdate']) || '',
                phone: find(['Contact no.', 'Contact Number', 'Phone', 'Mobile', 'Contact No', 'Contact']) || '',

                master_wave: find(['WAVE', 'Batch', 'Class', 'WaveNo']),
                master_hiring_request_id: hrid,
                master_remarks: find(['Remarks', 'Notes', 'Comments', 'Feedback']),
                master_eid: eid,
                master_last_name: lastName,
                master_first_name: firstName,
                master_middle_name: middleName,
                master_cp36_email: find(['CP360 Email Address', 'CP36 Email Address', 'CP36 Email', 'Company Email']),
                applied_at: find(['Applied At', 'Date Applied', 'Entry Time', 'Start time']) || new Date().toISOString(),
                updated_at: find(['Updated At', 'Modified At', 'Completion time']) || new Date().toISOString(),
                master_training_start_date: find(['TRAINING START DATE', 'Confirmed training', 'Start Date', 'Training Start']),
                master_basic_salary: find(['BASIC SALARY', 'Basic Salary', 'Salary', 'Base Pay']),
                master_allowance: find(['ALLOWANCE', 'Allowance', 'Other Pay']),
                master_neo_date: find(['NEO Date', 'NEO', 'Orientation Date']),
                master_peme_status: find(['PEME', 'Medical Status']),
                master_peme_result: find(['PEME Result', 'Medical Result']),

                master_bgs_status: find(['BGC Status', 'BGS', 'Background Status', 'BGS Status', 'Background Check']),
                master_email_nbi_status: find(['Email NBI', 'NBI Email', 'NBI Email Status']),
                master_nbi_result: find(['NBI Status', 'NBI Result', 'NBI Verification', 'NBI']),
                master_bi_endorsement_date: find(['BI Endorsement', 'BI Date', 'BI Endorsement Date', 'BI Indorsement']),
                master_bi_result: find(['BI Results', 'BI Result', 'BI Status', 'BI Resultm']),
                master_rcbc_status: find(['RCBC', 'RCBC Status', 'Bank Status', 'Bank Account']),
                master_h2r_status: find(['H2R Status', 'H2R', 'Hire to Retire Status']),
                master_sss_status: find(['SSS Status', 'SSS']),
                master_philhealth_status: find(['PhilHealth Status', 'PHIC Status', 'Philhealth Status']),
                master_pagibig_status: find(['Pag-Ibig Status', 'Pagibig Status', 'Pag-IBIG Status']),
                tin_no: find(['Tin No.', 'TIN No.', 'TIN', 'Tin Number', 'TIN Number']),
                master_training_confirmation: find(['Training Confirmation', 'Training Status', 'Confirmation']),
                master_win_date: find(['WIN Date', 'WIN', 'Win ID Date']),
                master_column: find(['Column', 'Section']) || activeTab,

                assessment_score: find(['Exam Score', 'Assessment Score', 'Exam', 'Score']),
                typing_test_wpm: typingWpm ?? null,
                typing_test_accuracy: typingAcc ?? null,

                philhealth_no: find(['PHIC', 'PhilHealth', 'PhilHealth No.']),

                // Bundle every single column from the Excel row into metadata as a backup
                metadata: { ...row },

                assigned_recruiter_name: find(['NAME OF RECRUITER', 'Recruiter', 'Recruiter Name', 'Assigned To', 'Owner']),
                master_referee_eid: find(['EID of Referree', 'Referree EID', 'Referee', 'Referral EID'])
            };

            // High-Performance Metadata Mapping (as Object)
            const age = calculateAge(result.birth_date);
            const updater = user?.full_name || 'System (Import)';

            const metadata = {
                ...row,
                imported_at: new Date().toISOString(),
                birth_date: result.birth_date,
                age: age ? parseInt(age) : null,
                phone: result.phone,
                hiring_source: result.hiring_source,
                philhealth_no: result.philhealth_no,
                full_name: result.applicant_name,
                email: result.applicant_email,
                ops_validator_email: find(['Ops Validator Email', 'Validator Email', 'Ops Val Email']),
                client_interviewer_email: find(['Client Interviewer Email', 'Interviewer Email']),
                last_updated_by: updater
            };

            result.metadata = metadata; // Send as object for JSONB
            return result;
        });
    };

    const handleConfirmImport = useCallback(async () => {
        if (!importPreview) return;
        setIsSyncing(true);
        localStorage.removeItem('last_import_error');

        try {
            const mappedPayload = mapRawToApplication(importPreview);

            const batchSize = 500;
            for (let i = 0; i < mappedPayload.length; i += batchSize) {
                const chunk = mappedPayload.slice(i, i + batchSize);
                await ApplicationService.bulkCreate(chunk);
            }

            success('Import Successful', `Successfully synchronized ${mappedPayload.length} records.`);
            setImportPreview(null);
            loadData();
        } catch (err: any) {
            console.error('Import failed:', err);
            const msg = err?.response?.data?.message || err?.message || 'Unknown synchronization error.';
            localStorage.setItem('last_import_error', msg);
            error('Import Failed', msg);
        } finally {
            setIsSyncing(false);
        }
    }, [importPreview, success, error, loadData]);

    const handleBulkHighlight = useCallback(async (color: string) => {
        if (selectedIds.size === 0) return;
        setIsSyncing(true);
        try {
            const ids = Array.from(selectedIds);
            const targetColor = color === 'clear' ? '---' : color;
            await ApplicationService.bulkPatch(ids, { highlight_color: targetColor });
            success('Selection Highlighted', `Applied highlight to ${selectedIds.size} records.`);
            setAllApplications(prev => prev.map(app =>
                selectedIds.has(app.id) ? { ...app, highlight_color: targetColor } : app
            ));
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Highlight failed:', err);
            error('Error', 'Failed to highlight records.');
        } finally {
            setIsSyncing(false);
        }
    }, [selectedIds, success, error]);



    const handleBulkMasterlistTransfer = useCallback(async (destination: 'MASTERLIST' | 'POOL' | 'OFFBOARDING_TRACKER' | 'OFFBOARDING_WINNERS' | 'INACTIVE_APPLICATION') => {
        if (selectedIds.size === 0) return;
        setIsSyncing(true);
        try {
            const ids = Array.from(selectedIds);
            const patchData: any = {
                master_column: destination
            };

            if (destination === 'POOL') {
                patchData.current_status = 'Waiting (Pooled)';
            } else if (destination === 'MASTERLIST') {
                patchData.current_status = 'Accepted Offer'; // Typical status for returning to masterlist
            } else if (destination === 'OFFBOARDING_TRACKER') {
                patchData.current_status = 'Withdrawn';
            } else if (destination === 'INACTIVE_APPLICATION') {
                patchData.current_status = 'Inactive';
            }

            await ApplicationService.bulkPatch(ids, patchData);

            success('Transfer Complete', `Successfully transferred ${selectedIds.size} records.`);
            loadData(true);
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Masterlist transfer failed:', err);
            error('Transfer Error', 'Failed to transfer candidates.');
        } finally {
            setIsSyncing(false);
        }
    }, [selectedIds, success, error, loadData]);

    const handleBulkTransferDate = useCallback(async (month: string, year: string) => {
        if (selectedIds.size === 0) return;
        setIsSyncing(true);
        try {
            const ids = Array.from(selectedIds);

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            // Convert to uppercase for case-insensitive matching if necessary, though UI usually provides exact string
            const monthIndex = monthNames.findIndex(m => m.toUpperCase() === month.toUpperCase());

            if (monthIndex === -1 || !year) {
                error('Invalid Date', 'Could not parse the selected month and year.');
                setIsSyncing(false);
                return;
            }

            const newDate = new Date(parseInt(year), monthIndex, 1, 12, 0, 0); // Noon UTC to avoid timezone edge cases
            const applied_at = newDate.toISOString();

            await ApplicationService.bulkPatch(ids, { applied_at });

            success('Transfer Complete', `Successfully moved ${ids.length} records to ${month} ${year}.`);
            loadData(true);
            setSelectedIds(new Set());
            setIsSelectMode(false);
        } catch (err) {
            console.error('Failed to transfer date', err);
            error('Transfer Failed', 'Failed to move records. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    }, [selectedIds, success, error, loadData]);

    const confirmAccountTransfer = useCallback(async (transferData: {
        targetAccount: string;
        opsValidatorId?: string | null;
        opsValidatorName?: string | null;
        opsRemarks?: string | null;
        hiringRequestId?: string | null;
        positionId?: string | null;
        positionTitle?: string | null;
        jobPosition?: string | null;
    }) => {
        if (!pendingAccountTransfer) return;
        const { app } = pendingAccountTransfer;

        setIsSyncing(true);
        try {
            const accVal = transferData.targetAccount;
            const prevAccount = app?.department || app?.endorsement_account || app?.pis?.final_account || '';
            const targetRemarks = transferData.opsRemarks || 'Pending Ops Validation';

            const newChanges: any = {
                department: accVal,
                endorsement_account: accVal,
                assigned_ops_validator_id: transferData.opsValidatorId || null,
                assigned_ops_validator_name: transferData.opsValidatorName || null,
                master_hiring_request_id: transferData.hiringRequestId || null,
                position_title: transferData.positionTitle || null,
                position_id: transferData.positionId || null,
                master_remarks: targetRemarks,
                pis: {
                    ...(app.pis || {}),
                    final_account: accVal,
                    initial_account_assignment: accVal,
                    ops_validation_remarks: targetRemarks,
                    ...(transferData.jobPosition ? { custom_lob: transferData.jobPosition } : {})
                }
            };

            const prevRemarks = app?.master_remarks || app?.pis?.ops_validation_remarks || '';
            if (prevRemarks && prevRemarks !== '---' && !prevRemarks.includes('Transferred')) {
                const transferNote = `[Account Transfer ${new Date().toLocaleDateString()}] Transferred from "${prevAccount}" to "${accVal}". Previous Remarks: "${prevRemarks}"`;
                newChanges.notes = app?.notes ? `${app.notes}\n${transferNote}` : transferNote;
            }

            await ApplicationService.patch(app.id, newChanges);

            // Wait for fresh data before clearing local changes to prevent UI flickering
            await loadData(true);

            // Clear from localChanges so UI doesn't have a green border
            setLocalChanges(prev => {
                const next = { ...prev };
                delete next[app.id];
                return next;
            });

            success('Account Transferred', `Candidate successfully transferred to ${accVal}.`);
        } catch (err) {
            console.error('Account Transfer Failed', err);
            error('Transfer Error', 'Failed to transfer account.');
        } finally {
            setIsSyncing(false);
            setPendingAccountTransfer(null);
        }
    }, [pendingAccountTransfer, success, error, loadData]);

    const cancelAccountTransfer = useCallback(() => {
        setPendingAccountTransfer(null);
    }, []);

    const duplicateGovIdsMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        const addToMap = (id: any, name: string) => {
            if (!id) return;
            const cleanId = String(id).trim().toUpperCase().replace(/[^0-9]/g, '');
            if (cleanId.length < 5) return;
            if (!map[cleanId]) map[cleanId] = [];
            map[cleanId].push(name);
        };

        allApplications.forEach(app => {
            const name = app.applicant_name || 'Unknown Candidate';
            const _app = app as any;
            const _pis = app.pis as any;
            addToMap(_pis?.sss_no || _app.sss_no || _app.metadata?.sss_no, name);
            addToMap(_pis?.philhealth_no || _app.philhealth_no || _app.metadata?.philhealth_no, name);
            addToMap(_pis?.pagibig_no || _pis?.pag_ibig_no || _app.pagibig_no || _app.metadata?.pagibig_no, name);
            addToMap(_pis?.tin_no || _app.tin_no || _app.metadata?.tin_no || _app.metadata?.master_tin_no, name);
        });

        return map;
    }, [allApplications]);

    return {
        search, setSearch, allApplications, loading, selectedAccount, setSelectedAccount,
        startDateFilter, setStartDateFilter, dateAddedFilter, setDateAddedFilter, selectedDay, setSelectedDay,
        activePassedMonth, setActivePassedMonth, availablePassedMonths,
        selectedYear, setSelectedYear, availableYears,
        selectedDateFilter, setSelectedDateFilter,
        showAddModal, setShowAddModal,
        activeTab, setActiveTab, activeSubTab, setActiveSubTab,
        isOfficialEndorsement, setIsOfficialEndorsement, officialEndorsementCount, duplicateGovIdsMap,
        isEditing, setIsEditing, isConfigEditing, setIsConfigEditing, localChanges, setLocalChanges,
        isExclusiveMode, setIsExclusiveMode,
        isSyncing, isSelectMode, setIsSelectMode,
        isBulkDeleting, bulkDeleteProgress,
        selectedIds, setSelectedIds,
        deletingId, setDeletingId,
        pivotTraining, setPivotTraining, pivotPosition, setPivotPosition,
        pivotStatus, setPivotStatus, pivotAccount, setPivotAccount,
        selectedStatus, setSelectedStatus, selectedWave, setSelectedWave, waveOptions,
        emailFilter, setEmailFilter,
        selectedHireType, setSelectedHireType,
        importPreview, setImportPreview, pendingWithdrawal, setPendingWithdrawal,
        pendingAccountTransfer, setPendingAccountTransfer, confirmAccountTransfer, cancelAccountTransfer,
        loadData, handleEdit, handleMoveRow, handleSyncAll, handleCancelEdit, handleBulkDelete, handleDelete,
        filteredList, accountMetrics, pivotOptions, handleExportExcel,
        toggleSelectAll, toggleSelect, handleImportCSV, handleConfirmImport,
        notesApp, setNotesApp, handleSaveNote, anchorRect, setAnchorRect,
        success, error,
        focusPath, setFocusPath, handleBulkHighlight, handleBulkMasterlistTransfer, handleBulkTransferDate
    };
}
