import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { loadReroutedAccounts } from '@/pages/admin/hooks/useAccountTypeSettings';
import { ApplicationService } from '@/services/ApplicationService';
import { useToast } from '@/components/common/useToast';
import type { Application } from '@/types/application';
import * as XLSX from 'xlsx';
import { socketService } from '@/services/socketService';
import { MONTHS } from '../constants';
import { SPECIFIC_STATUS_TO_OVERALL } from '@/pages/recruiter/tracker/utils/statusMappings';

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
    'For Job Offer', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 
    'HIRED', 'HIRED_PROCESSED', 'PASSED', 'FINAL_VERDICT', 
    'FOR PAN', 'For PAN', 'FOR_PAN', 
    'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'Accepted Offer', 
    'SENT JO AND BGC', 'SENT_JO_AND_BGC', 'Sent JO and BGC'
];

export function useMasterlist() {
    const { user } = useAuthStore();
    const { error, success } = useToast();
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [allApplications, setAllApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(
        user?.role === 'recruiter_s' ? 'PRIORITY' : null
    );
    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
    const [selectedDay, setSelectedDay] = useState<string>('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('MASTERLIST');
    const [activeSubTab, setActiveSubTab] = useState<string>('SHEET');

    const [isEditing, setIsEditing] = useState(false);
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

    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [selectedWave, setSelectedWave] = useState<string>('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [emailFilter, setEmailFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
    const [focusPath, setFocusPath] = useState<{ appId: string, colKey: string } | null>(null);
    const isEditingRef = useRef(isEditing);

    useEffect(() => {
        isEditingRef.current = isEditing;
        if (!isEditing) setFocusPath(null);
    }, [isEditing]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const apps = await ApplicationService.getAll();
            const healedApps = apps.map((app: any) => {
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
                        master_first_name: first,
                        master_middle_name: middle,
                        master_last_name: last
                    };
                }
                return app;
            });
            setAllApplications(healedApps);
        } catch (err) {
            console.error('Failed to load masterlist:', err);
            if (!silent) error('Loading Failed', 'Could not load records from the database.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [error]);

    useEffect(() => {
        const lastError = localStorage.getItem('last_import_error');
        if (lastError) {
            error('Previous Import Failed', lastError);
            localStorage.removeItem('last_import_error');
        }
    }, [error]);

    useEffect(() => {
        loadData();
        const socket = socketService.getSocket();

        socket.on('applications:updated', () => {
            // Only refresh if the user is NOT currently editing to avoid work disruption
            if (!isEditingRef.current) {
                console.log('[Socket] Applications updated, refreshing masterlist...');
                loadData(true); 
            } else {
                console.log('[Socket] Applications updated, but deferring refresh until edit mode is exited.');
            }
        });

        return () => {
            socket.off('applications:updated');
        };
    }, [loadData]);


    const [pendingWithdrawal, setPendingWithdrawal] = useState<{ appId: string, previousStatus: string, previousColumn: string } | null>(null);

    const handleEdit = useCallback((appId: string, field: keyof Application, value: any) => {
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
                if (['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(upperVal)) {
                    newChanges.master_column = 'MASTERLIST';
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

                if (value.final_specific_status) {
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
                        if (mappedOverall === 'HIRED' || mappedOverall === 'PASSED' || mappedOverall === 'For Job Offer') {
                            newChanges.master_column = 'MASTERLIST';
                        } else if (isAlreadyConcluded) {
                            newChanges.master_column = 'MASTERLIST';
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
            setIsEditing(false);
            setFocusPath(null);
            return;
        }

        setIsSyncing(true);
        try {
            await Promise.all(
                appsToUpdate.map(id => {
                    const changes = localChanges[id];
                    const app = allApplications.find(a => a.id === id);
                    if (!app) return Promise.resolve();

                    const targetStatus = changes.current_status ?? app.current_status;
                    let autoColumn = changes.master_column ?? app.master_column;

                    if (targetStatus === 'ENDORSED' && !changes.master_column) {
                        autoColumn = 'Sheet';
                    }

                    return ApplicationService.patch(id, {
                        ...changes,
                        master_column: autoColumn
                    });
                })
            );
            success('Records Updated', `Successfully updated ${appsToUpdate.length} candidate records.`);
            await loadData(true);
            setLocalChanges({});
            setIsEditing(false);
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
        setIsEditing(false);
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
                setNotesApp(prev => prev ? { ...prev, notes: updatedNotes } : null);
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
            if (a.metadata?.deleted_from_masterlist) return false;
            
            // Spotlight Override: always include the applicant we are redirecting to
            if (autoSpotlightAppId && a.id === autoSpotlightAppId) {
                return true;
            }

            const col = a.master_column || '';
            const status = a.master_status || a.current_status || 'PENDING';

            if (['MASTERLIST', 'PIVOT', 'EMAIL', 'REPORTS'].includes(activeTab)) {
                const isPassed = ['FOR JOB OFFER', 'FOR_JOB_OFFER', 'PASSED', 'HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'ACCEPTED_OFFER', 'SENT JO AND BGC', 'SENT_JO_AND_BGC'].includes(status.toUpperCase());

                // Respect explicit SHEET assignment — records kept out of Masterlist via import checkbox
                const colUpper = (col || '').toUpperCase();
                const isExplicitlySheet = colUpper === 'SHEET' || colUpper === 'OFFICEFORMS_TABLE';
                if (isExplicitlySheet && !isPassed) return false;

                // If column is undefined/empty, only show if they have reached a "Passed/Hired" milestone
                if (!a.master_column) {
                    return isPassed;
                }

                return colUpper === 'MASTERLIST' || colUpper === 'PIVOT' || colUpper === 'EMAIL' || colUpper === 'REPORTS' || colUpper === 'SHEET1' || isPassed;
            }

            return col === activeTab;
        });
    }, [allApplications, localChanges, activeTab, location.state]);

    const isRecruiterS = user?.role === 'recruiter_s';

    const filteredList = useMemo(() => {
        const state = location.state as any;
        const autoSpotlightAppId = state?.autoSpotlightAppId;

        return activeApplications.filter(a => {
            // Spotlight Override: bypass all filters for the spotlighted applicant
            if (autoSpotlightAppId && a.id === autoSpotlightAppId) {
                return true;
            }

            const matchesAccount = (selectedAccount === 'PRIORITY' || (!selectedAccount && isRecruiterS))
                ? loadReroutedAccounts().some(sa => (a.department || '').toLowerCase().includes(sa))
                : (selectedAccount === 'ALL' || !selectedAccount ? true : a.department === selectedAccount);
            const matchesSearch = !search || (() => {
                const term = search.toLowerCase();
                const terms = term.split('|').map(t => t.trim()).filter(t => t.length >= 2);
                if (terms.length === 0) return true;

                // Column Search Isolation: Check against all known column labels
                const allColLabels = [
                    'wave', 'account', 'position', 'status', 'remarks', 'eid',
                    'last name', 'middle name', 'first name', 'date of birth',
                    'contact', 'email', 'training', 'salary', 'allowance',
                    'exam', 'typing', 'source', 'recruiter', 'neo', 'peme',
                    'phic', 'bgc', 'nbi', 'bi', 'rcbc', 'h2r',
                    'department', 'hiring request id', 'position applying for',
                    'interview date', 'summary of background', 'current status'
                ];

                const isColMatch = terms.some(t => allColLabels.some(c => c.includes(t)));
                if (isColMatch) return true;

                const searchFields = (obj: any, target: string): boolean => {
                    if (!obj) return false;
                    return Object.values(obj).some(val => {
                        if (typeof val === 'string' || typeof val === 'number') {
                            return String(val).toLowerCase().includes(target);
                        }
                        if (typeof val === 'object') {
                            return searchFields(val, target);
                        }
                        return false;
                    });
                };

                return terms.some(t => searchFields(a, t));
            })();

            let matchesMonth = selectedMonth === 'ALL';
            if (selectedMonth !== 'ALL') {
                const trainingDateStr = a.master_training_start_date;
                if (trainingDateStr) {
                    const dateObj = new Date(trainingDateStr);
                    if (!isNaN(dateObj.getTime())) {
                        const monthMatch = MONTHS[dateObj.getMonth()] === selectedMonth;
                        const dayMatch = selectedDay === 'ALL' || dateObj.getDate().toString() === selectedDay;
                        matchesMonth = monthMatch && dayMatch;
                    } else {
                        // Fallback for string-based months
                        const monthMatch = trainingDateStr.toUpperCase().includes(selectedMonth);
                        const dayMatch = selectedDay === 'ALL' || trainingDateStr.includes(` ${selectedDay} `) || trainingDateStr.endsWith(` ${selectedDay}`);
                        matchesMonth = monthMatch && dayMatch;
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
            const matchesStatus = selectedStatus === 'ALL' || String(effectiveStatus).toUpperCase() === selectedStatus.toUpperCase();
            const matchesWave = selectedWave === 'ALL' || String(a.master_wave || '').toUpperCase() === selectedWave.toUpperCase();

            const isBaseMatch = matchesAccount && matchesSearch && matchesMonth && matchesStatus && matchesDateFilter && matchesWave;

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
                return isBaseMatch;
            }

            if (activeTab === 'EMAIL') {
                const isDone = !!(a.master_rcbc_status && a.master_neo_date && a.master_peme_status);
                if (emailFilter === 'PENDING' && isDone) return false;
                if (emailFilter === 'DONE' && !isDone) return false;
                return isBaseMatch;
            }

            if (activeTab === 'INACTIVE_APPLICATION') {
                const isInactive = ['REJECTED', 'WITHDRAWN', 'DECLINED', 'NOT_ELIGIBLE_FOR_REHIRE', 'INACTIVE'].includes(String(a.current_status).toUpperCase());
                return isBaseMatch && isInactive;
            }

            if (activeTab === 'POOL') {
                return isBaseMatch && (a.master_column === 'POOL' || a.current_status === 'POOL' || String(a.current_status).toUpperCase() === 'WAITING');
            }

            if (activeTab === 'YC') {
                return isBaseMatch && (a.master_column === 'YC');
            }


            return isBaseMatch;
        });
    }, [activeApplications, selectedAccount, search, selectedMonth, activeTab, pivotTraining, pivotPosition, pivotStatus, pivotAccount, activeSubTab, selectedStatus, selectedWave, emailFilter, selectedDateFilter, selectedDay, location.state]);

    const accountMetrics = useMemo(() => {
        const groups: Record<string, { count: number; positions: Set<string> }> = {};
        activeApplications.forEach(app => {
            const dept = app.department || 'General';
            if (!groups[dept]) groups[dept] = { count: 0, positions: new Set() };
            groups[dept].count++;
            groups[dept].positions.add(app.position_title);
        });
        return Object.entries(groups).map(([name, data]) => ({
            name,
            count: data.count,
            positionCount: data.positions.size
        })).sort((a, b) => b.count - a.count);
    }, [activeApplications]);

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
        const listToExport = selectedAccount ? filteredList : allApplications;
        if (listToExport.length === 0) return;

        const exportData = listToExport.map(app => ({
            'WAVE': app.master_wave || '',
            'Account': app.department,
            'Hiring Request ID': app.master_hiring_request_id || '',
            'Position': app.position_title,
            'Status': (app.master_status || app.current_status || '').replace(/_/g, ' '),
            'Remarks': app.final_interview_notes || app.master_remarks || '',
            'Eid': app.master_eid || '',
            'Column': app.master_column || '',
            'Last Name': app.master_last_name || '',
            'Middle Name': app.master_middle_name || '',
            'First Name': app.master_first_name || '',
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
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Masterlist');
        XLSX.writeFile(workbook, `RECRUIT360_${selectedAccount ? selectedAccount.toUpperCase() : 'ALL'}_REGISTRY_${new Date().toISOString().split('T')[0]}.xlsx`);
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



    const handleBulkMasterlistTransfer = useCallback(async (destination: 'POOL' | 'OFFBOARDING_TRACKER' | 'OFFBOARDING_WINNERS' | 'INACTIVE_APPLICATION') => {
        if (selectedIds.size === 0) return;
        setIsSyncing(true);
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

    return {
        search, setSearch, allApplications, loading, selectedAccount, setSelectedAccount,
        selectedMonth, setSelectedMonth, selectedDay, setSelectedDay,
        selectedDateFilter, setSelectedDateFilter,
        showAddModal, setShowAddModal,
        activeTab, setActiveTab, activeSubTab, setActiveSubTab,
        isEditing, setIsEditing, localChanges, setLocalChanges,
        isSyncing, isSelectMode, setIsSelectMode,
        isBulkDeleting, bulkDeleteProgress,
        selectedIds, setSelectedIds,
        deletingId, setDeletingId,
        pivotTraining, setPivotTraining, pivotPosition, setPivotPosition,
        pivotStatus, setPivotStatus, pivotAccount, setPivotAccount,
        selectedStatus, setSelectedStatus, selectedWave, setSelectedWave, waveOptions,
        emailFilter, setEmailFilter,
        importPreview, setImportPreview, pendingWithdrawal, setPendingWithdrawal,
        loadData, handleEdit, handleSyncAll, handleCancelEdit, handleBulkDelete, handleDelete,
        filteredList, accountMetrics, pivotOptions, handleExportExcel,
        toggleSelectAll, toggleSelect, handleImportCSV, handleConfirmImport,
        notesApp, setNotesApp, handleSaveNote, anchorRect, setAnchorRect,
        success, error,
        focusPath, setFocusPath, handleBulkHighlight, handleBulkMasterlistTransfer
    };
}
