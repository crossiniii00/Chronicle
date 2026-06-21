import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { PositionService, type HiringQuotaHistory } from '@/services/PositionService';
import { DepartmentService, type Department } from '@/services/DepartmentService';
import { ApplicationService } from '@/services/ApplicationService';

import { useToast } from '@/components/common/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Target, 
    Calendar, 
    History, 
    CheckCircle, 
    Loader2, 
    Settings2,
    Users,
    Activity,
    ClipboardList,
    PlusCircle,
    Check,
    X,
    AlertCircle
} from 'lucide-react';
import { useActiveAccountStore, parseAccounts } from '@/store/activeAccountStore';
import { cn, formatDate } from '@/utils/formatters';


interface QuotaRequest {
    id: string;
    department: string;
    requestType: 'ADD' | 'UPDATE' | 'CLOSE' | 'CANCEL';
    quota?: number;
    startDate?: string;
    endDate?: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedBy?: string;
    requestedByName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export function QuotaSettings() {
    const { user } = useAuthStore();
    const { success, error } = useToast();
    const { activeAccount } = useActiveAccountStore();
    const accounts = parseAccounts(user?.department);
    const hasMultipleAccounts = accounts.length > 1;
    const departmentName = (activeAccount && accounts.map(a => a.toUpperCase()).includes(activeAccount.toUpperCase()))
        ? activeAccount
        : (accounts[0] || 'DOORDASH');

    // State
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [departmentInfo, setDepartmentInfo] = useState<Department | null>(null);
    const [internalPos, setInternalPos] = useState<any>(null);
    const [quotaHistory, setQuotaHistory] = useState<HiringQuotaHistory[]>([]);
    const [quotaRequests, setQuotaRequests] = useState<QuotaRequest[]>([]);
    
    // Form fields for request
    const [requestType, setRequestType] = useState<'ADD' | 'UPDATE' | 'CLOSE' | 'CANCEL'>('UPDATE');
    const [hiringQuota, setHiringQuota] = useState<number>(15);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    
    // Stats for reference
    const [hiredCount, setHiredCount] = useState(0);
    const [totalApplicants, setTotalApplicants] = useState(0);
    const [inPipelineCount, setInPipelineCount] = useState(0);



    const loadData = async () => {
        try {
            const [positions, depts, history, requests, apps] = await Promise.all([
                PositionService.getAll(),
                DepartmentService.getAll(),
                PositionService.getQuotaHistory(departmentName),
                PositionService.getQuotaRequests(departmentName),
                ApplicationService.getAll()
            ]);

            // Department Info
            const currentDept = depts.find(d => d.name.toUpperCase() === departmentName.toUpperCase());
            if (currentDept) {
                setDepartmentInfo(currentDept);
            }

            // Quota position discovery
            const pos = positions.find((p: any) => 
                p.department?.trim().toUpperCase() === departmentName.toUpperCase() && 
                p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA')
            );

            setInternalPos(pos || null);
            const isActive = pos && pos.status === 'OPEN';
            if (isActive) {
                // If active quota exists, default type to UPDATE
                if (requestType === 'ADD') setRequestType('UPDATE');
            } else {
                // If no active quota exists (never had, closed, or cancelled), default to ADD
                setRequestType('ADD');
            }

            setQuotaHistory(history);
            setQuotaRequests(requests);

            // Compute current metrics for this department
            const deptApps = apps.filter(a => 
                (a.department || '').split(',').map(s => s.trim().toUpperCase()).includes(departmentName.toUpperCase())
            );
            setTotalApplicants(deptApps.length);
            
            const passed = deptApps.filter(a => {
                const status = a.final_verdict || a.current_status;
                return ['PASSED', 'HIRED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer', 'Accepted Offer'].includes(status);
            });
            setHiredCount(passed.length);

            const pipeline = deptApps.filter(a => {
                const status = a.final_verdict || a.current_status;
                return !['PASSED', 'HIRED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'For Job Offer', 'Accepted Offer', 'FAILED', 'REJECTED', 'DISQUALIFIED', 'Withdrawn', 'Withdrawn by Applicant'].includes(status);
            });
            setInPipelineCount(pipeline.length);



        } catch (err) {
            console.error('Failed to load quota settings data:', err);
            error('Load Failed', 'Failed to retrieve hiring quota configurations.');
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadData();
            setLoading(false);
        };
        void init();
    }, [departmentName]);

    // Update form defaults when internalPos changes or type changes
    useEffect(() => {
        if (internalPos && (requestType === 'UPDATE')) {
            setHiringQuota(internalPos.hiring_quota || 0);
            setStartDate(internalPos.quota_start_date ? internalPos.quota_start_date.split('T')[0] : '');
            setEndDate(internalPos.quota_end_date ? internalPos.quota_end_date.split('T')[0] : '');
        } else if (requestType === 'ADD') {
            setHiringQuota(departmentInfo?.hiring_quota || 15);
            setStartDate('');
            setEndDate('');
        }
    }, [requestType, internalPos, departmentInfo]);

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await PositionService.addQuotaRequest({
                department: departmentName,
                requestType,
                quota: (requestType === 'ADD' || requestType === 'UPDATE') ? hiringQuota : null,
                startDate: (requestType === 'ADD' || requestType === 'UPDATE') ? (startDate || null) : null,
                endDate: (requestType === 'ADD' || requestType === 'UPDATE') ? (endDate || null) : null,
                reason
            });
            
            success('Request Submitted', `Change request to ${requestType} quota has been sent.`);
            setReason('');
            await loadData();
        } catch (err) {
            console.error('Failed to submit quota request:', err);
            error('Submission Failed', 'Failed to submit quota change request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveRequest = async (id: string, nextStatus: 'APPROVED' | 'REJECTED') => {
        setActionLoadingId(id);
        try {
            // If approving an update/close/cancel request, archive the current active quota state to history first
            if (nextStatus === 'APPROVED' && internalPos) {
                const reqToApprove = quotaRequests.find(r => r.id === id);
                if (reqToApprove && (reqToApprove.requestType === 'UPDATE' || reqToApprove.requestType === 'CLOSE' || reqToApprove.requestType === 'CANCEL')) {
                    await PositionService.archiveQuotaHistory({
                        department: departmentName,
                        positionId: internalPos.id,
                        quota: internalPos.hiring_quota || 0,
                        hiredCount: hiredCount,
                        totalApplicants: totalApplicants,
                        inPipeline: inPipelineCount,
                        failedCount: Math.max(0, totalApplicants - hiredCount - inPipelineCount),
                        startDate: internalPos.quota_start_date || null,
                        endDate: internalPos.quota_end_date || null
                    });
                }
            }

            await PositionService.updateQuotaRequestStatus(id, nextStatus);
            success(`Request ${nextStatus}`, `Hiring quota request was successfully ${nextStatus.toLowerCase()}.`);
            await loadData();
        } catch (err) {
            console.error('Failed to resolve request:', err);
            error('Action Failed', 'Failed to process the change request.');
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.3em]">Loading Quota Console...</p>
            </div>
        );
    }

    const hasActiveQuota = !!internalPos && internalPos.status === 'OPEN';
    const wasClosed = !!internalPos && internalPos.status === 'CLOSED';
    const hasNoQuota = !internalPos || internalPos.status !== 'OPEN';

    return (
        <div className="min-h-screen bg-[#f3f2f1] py-12 px-4 sm:px-6 lg:px-8 pb-20">
            <div className="max-w-[1200px] mx-auto space-y-8 text-left">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-200 pb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Settings2 size={16} className="text-[#0078d4]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0078d4]">
                                Change Request Console
                            </span>
                        </div>
                        <h1 
                            className="text-4xl text-surface-900 tracking-tight mt-1"
                            style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontStyle: 'italic' }}
                        >
                            Hiring Quota Settings: {departmentName.toUpperCase()}
                        </h1>
                    </div>
                    {departmentInfo && (departmentInfo.accountImageUrl || departmentInfo.accountImageData) && (
                        <div className="w-16 h-16 rounded-sm border border-surface-200 bg-white p-2 flex items-center justify-center shadow-sm shrink-0">
                            <img 
                                src={departmentInfo.accountImageUrl || departmentInfo.accountImageData || ''} 
                                alt={departmentName} 
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* Quota Overview & Request Form */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Request Form */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* No Active Quota Banner */}
                        {hasNoQuota && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-[#eff6fc] to-white border border-[#0078d4]/20 rounded-sm p-5 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-sm bg-[#0078d4]/10 border border-[#0078d4]/20 flex items-center justify-center shrink-0">
                                        <PlusCircle size={20} className="text-[#0078d4]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-surface-900">
                                            {wasClosed ? 'Previous Quota Cycle Closed' : 'No Active Hiring Quota'}
                                        </h3>
                                        <p className="text-xs text-surface-500 mt-1">
                                            {wasClosed
                                                ? 'The previous hiring quota has been closed. You can request to start a new hiring cycle by submitting an Add Quota request below.'
                                                : 'There is no active hiring quota for this department. Submit an Add Quota request to initialize a new hiring cycle.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        <form onSubmit={handleRequestSubmit} className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-surface-150 pb-4">
                                <div className="flex items-center gap-2">
                                    <ClipboardList size={18} className="text-[#0078d4]" />
                                    <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Submit Change Request</h2>
                                </div>
                                <div className="flex gap-1.5 p-0.5 bg-surface-100 rounded-sm border border-surface-200">
                                    <button
                                        type="button"
                                        onClick={() => setRequestType('ADD')}
                                        className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all", requestType === 'ADD' ? "bg-white text-[#0078d4] shadow-sm border border-surface-200" : "text-surface-500 hover:text-surface-800")}
                                    >
                                        {hasNoQuota ? '+ New Quota' : 'Add Quota'}
                                    </button>
                                    {hasActiveQuota && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setRequestType('UPDATE')}
                                                className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all", requestType === 'UPDATE' ? "bg-white text-[#0078d4] shadow-sm border border-surface-200" : "text-surface-500 hover:text-surface-800")}
                                            >
                                                Update
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRequestType('CLOSE')}
                                                className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all", requestType === 'CLOSE' ? "bg-white text-[#a80000] shadow-sm border border-surface-200" : "text-surface-500 hover:text-surface-800")}
                                            >
                                                Close
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRequestType('CANCEL')}
                                                className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all", requestType === 'CANCEL' ? "bg-white text-[#a80000] shadow-sm border border-surface-200" : "text-surface-500 hover:text-surface-800")}
                                            >
                                                Cancel Active
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Close / Cancel — contextual description */}
                            {(requestType === 'CLOSE' || requestType === 'CANCEL') && (
                                <div className={cn("p-3 rounded-sm border text-xs font-medium", requestType === 'CLOSE' ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-rose-50 border-rose-200 text-rose-800")}>
                                    {requestType === 'CLOSE'
                                        ? 'Closing the quota will mark the current hiring cycle as completed. The position record will be preserved for history. You can start a new quota cycle after this is approved.'
                                        : 'Cancelling will permanently remove the active quota position. This is irreversible. You can start a fresh quota cycle after this is approved.'
                                    }
                                </div>
                            )}

                            <div className="space-y-4">
                                {(requestType === 'ADD' || requestType === 'UPDATE') && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[9px] font-black text-surface-450 uppercase tracking-widest mb-2">Hiring Quota Target</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                required
                                                value={hiringQuota}
                                                onChange={(e) => setHiringQuota(parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-surface-200 text-xs font-semibold focus:border-[#0078d4] focus:ring-0 rounded-sm bg-white"
                                                placeholder="Target hires count"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black text-surface-450 uppercase tracking-widest mb-2">Start Date</label>
                                            <input 
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-surface-200 text-xs font-semibold focus:border-[#0078d4] focus:ring-0 rounded-sm bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black text-surface-450 uppercase tracking-widest mb-2">End Date</label>
                                            <input 
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-surface-200 text-xs font-semibold focus:border-[#0078d4] focus:ring-0 rounded-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[9px] font-black text-surface-450 uppercase tracking-widest mb-2">Justification / Remarks</label>
                                    <textarea 
                                        required
                                        rows={3}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-3 py-2 border border-surface-200 text-xs font-semibold focus:border-[#0078d4] focus:ring-0 rounded-sm bg-white resize-none"
                                        placeholder={requestType === 'CLOSE' ? 'Explain why this quota cycle should be closed...' : requestType === 'CANCEL' ? 'Explain why the active quota should be cancelled...' : 'Explain the rationale for this change request...'}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-surface-150 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 text-white text-[10px] font-black uppercase tracking-widest rounded-sm shadow-sm hover:shadow transition-all disabled:opacity-50",
                                        (requestType === 'CLOSE' || requestType === 'CANCEL') ? "bg-[#a80000] hover:bg-[#8b0000]" : "bg-[#0078d4] hover:bg-[#106ebe]"
                                    )}
                                >
                                    {submitting ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <PlusCircle size={12} />
                                    )}
                                    {requestType === 'ADD' ? 'Request New Quota' : requestType === 'UPDATE' ? 'Request Update' : requestType === 'CLOSE' ? 'Request Close' : 'Request Cancellation'}
                                </button>
                            </div>
                        </form>

                        {/* Active Metrics Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Active Quota Target', value: hasActiveQuota ? internalPos.hiring_quota : (wasClosed ? 'Closed' : 'None'), icon: Target, color: hasActiveQuota ? 'text-[#0078d4]' : 'text-surface-400', bg: hasActiveQuota ? 'bg-[#eff6fc]/35 border-[#0078d4]/10' : 'bg-surface-50 border-surface-200' },
                                { label: 'Approved Hires', value: hiredCount, icon: CheckCircle, color: 'text-[#107c10]', bg: 'bg-[#dff6dd]/15 border-[#107c10]/10' },
                                { label: 'In Pipeline', value: inPipelineCount, icon: Users, color: 'text-[#b15c00]', bg: 'bg-[#fcf4e6]/20 border-[#b15c00]/10' },
                                { label: 'Remaining Slots', value: hasActiveQuota ? Math.max(0, internalPos.hiring_quota - hiredCount) : '—', icon: Activity, color: hasActiveQuota ? 'text-[#a80000]' : 'text-surface-400', bg: hasActiveQuota ? 'bg-[#fde7e9]/15 border-[#a80000]/10' : 'bg-surface-50 border-surface-200' }
                            ].map(({ label, value, icon: Icon, color, bg }) => (
                                <div key={label} className={cn("bg-white p-4 rounded-sm border border-surface-200 shadow-sm flex flex-col justify-between min-h-[100px]", bg)}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-bold text-surface-500 uppercase tracking-wider">{label}</span>
                                        <Icon size={14} className={color} />
                                    </div>
                                    <span className="text-xl font-bold text-surface-900 leading-none">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Side Rules & Active Configuration Card */}
                    <div className="space-y-6">
                        <div className="bg-white border border-surface-200 rounded-sm p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-surface-150 pb-3">
                                <Target size={16} className="text-[#0078d4]" />
                                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Active Quota Scope</h3>
                            </div>
                            {hasActiveQuota ? (
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between border-b border-surface-100 pb-1.5">
                                        <span className="text-surface-450 font-bold">Status:</span>
                                        <span className="font-extrabold text-[#107c10] uppercase text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-sm">ACTIVE</span>
                                    </div>
                                    <div className="flex justify-between border-b border-surface-100 pb-1.5">
                                        <span className="text-surface-450 font-bold">Target Quota:</span>
                                        <span className="font-bold text-surface-900">{internalPos.hiring_quota}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-surface-100 pb-1.5">
                                        <span className="text-surface-450 font-bold">Start Date:</span>
                                        <span className="font-bold text-surface-700">{internalPos.quota_start_date ? formatDate(internalPos.quota_start_date) : 'Not Set'}</span>
                                    </div>
                                    <div className="flex justify-between pb-1">
                                        <span className="text-surface-450 font-bold">End Date:</span>
                                        <span className="font-bold text-surface-700">{internalPos.quota_end_date ? formatDate(internalPos.quota_end_date) : 'Not Set'}</span>
                                    </div>
                                </div>
                            ) : wasClosed ? (
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between border-b border-surface-100 pb-1.5">
                                        <span className="text-surface-450 font-bold">Status:</span>
                                        <span className="font-extrabold text-amber-700 uppercase text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm">CLOSED</span>
                                    </div>
                                    <div className="flex justify-between border-b border-surface-100 pb-1.5">
                                        <span className="text-surface-450 font-bold">Previous Target:</span>
                                        <span className="font-bold text-surface-400 line-through">{internalPos.hiring_quota}</span>
                                    </div>
                                    <p className="text-[10px] text-surface-500 pt-1 italic">Submit an "Add Quota" request to begin a new cycle.</p>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <AlertCircle className="w-6 h-6 text-surface-400 mx-auto mb-1" />
                                    <p className="text-xs font-semibold text-surface-500">No active quota configured.</p>
                                    <p className="text-[10px] text-surface-400 mt-1">Use "+ New Quota" to get started.</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white border border-surface-200 rounded-sm p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 border-b border-surface-150 pb-3">
                                <Activity size={16} className="text-[#0078d4]" />
                                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Request Process Flow</h3>
                            </div>
                            <ol className="text-xs text-surface-600 space-y-2 list-decimal pl-4">
                                <li>Submit a request for quota changes.</li>
                                <li>Requests go into a <strong>PENDING</strong> status.</li>
                                <li>Recruiter or Admin reviews and approves the request.</li>
                                <li>Once <strong>APPROVED</strong>, it updates the live active target configuration immediately.</li>
                            </ol>
                        </div>

                    </div>
                </div>

                {/* Quota Change Requests Log */}
                <div className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-surface-150 pb-4">
                        <History size={18} className="text-[#0078d4]" />
                        <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Quota Change Requests</h2>
                    </div>

                    {quotaRequests.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-surface-200 rounded-sm">
                            <ClipboardList className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                            <p className="text-xs font-medium text-surface-400">No change requests have been submitted yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-surface-200 text-[10px] font-black text-surface-450 uppercase tracking-wider">
                                        <th className="pb-3 font-semibold">Date Submitted</th>
                                        <th className="pb-3 font-semibold">Request Type</th>
                                        <th className="pb-3 font-semibold text-center">Proposed Quota</th>
                                        <th className="pb-3 font-semibold">Active Cycle</th>
                                        <th className="pb-3 font-semibold">Justification</th>
                                        <th className="pb-3 font-semibold">Status</th>
                                        <th className="pb-3 font-semibold text-right">Simulation Panel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-150 text-xs text-surface-700">
                                    {quotaRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-surface-50/50 transition-colors">
                                            <td className="py-4 font-semibold text-surface-900">
                                                {formatDate(req.createdAt || '')}
                                                <span className="block text-[9px] font-medium text-surface-400 mt-0.5">By {req.requestedByName}</span>
                                            </td>
                                            <td className="py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-sm text-[9px] font-bold border uppercase tracking-wider",
                                                    req.requestType === 'ADD' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    req.requestType === 'UPDATE' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                    "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    {req.requestType}
                                                </span>
                                            </td>
                                            <td className="py-4 text-center font-bold text-surface-900">
                                                {req.quota !== null && req.quota !== undefined ? req.quota : '—'}
                                            </td>
                                            <td className="py-4 font-medium text-surface-500">
                                                {req.startDate ? formatDate(req.startDate) : 'N/A'} — {req.endDate ? formatDate(req.endDate) : 'N/A'}
                                            </td>
                                            <td className="py-4 font-medium text-surface-600 max-w-[200px] truncate" title={req.reason}>
                                                {req.reason || '—'}
                                            </td>
                                            <td className="py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest",
                                                    req.status === 'PENDING' ? "bg-surface-100 text-surface-500" :
                                                    req.status === 'APPROVED' ? "bg-emerald-150 text-emerald-800" :
                                                    "bg-rose-150 text-rose-800"
                                                )}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                {req.status === 'PENDING' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={actionLoadingId !== null}
                                                            onClick={() => handleResolveRequest(req.id, 'APPROVED')}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-sm shadow-sm transition-all disabled:opacity-50"
                                                        >
                                                            {actionLoadingId === req.id ? (
                                                                <Loader2 size={10} className="animate-spin" />
                                                            ) : (
                                                                <Check size={10} />
                                                            )}
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={actionLoadingId !== null}
                                                            onClick={() => handleResolveRequest(req.id, 'REJECTED')}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded-sm shadow-sm transition-all disabled:opacity-50"
                                                        >
                                                            {actionLoadingId === req.id ? (
                                                                <Loader2 size={10} className="animate-spin" />
                                                            ) : (
                                                                <X size={10} />
                                                            )}
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-surface-400 italic font-semibold">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* History Log */}
                <div className="bg-white border border-surface-200 rounded-sm p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-surface-150 pb-4">
                        <History size={18} className="text-[#0078d4]" />
                        <h2 className="text-sm font-bold text-surface-950 uppercase tracking-wider">Hiring Quota History</h2>
                    </div>

                    {quotaHistory.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-surface-200 rounded-sm">
                            <History className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                            <p className="text-xs font-medium text-surface-400">No quota update history found for this department.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-surface-200 text-[10px] font-black text-surface-450 uppercase tracking-wider">
                                        <th className="pb-3 font-semibold">Archived Date</th>
                                        <th className="pb-3 font-semibold text-center">Previous Quota</th>
                                        <th className="pb-3 font-semibold text-center">Hires Achieved</th>
                                        <th className="pb-3 font-semibold text-center">Pipeline Count</th>
                                        <th className="pb-3 font-semibold">Active Cycle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-150 text-xs text-surface-700">
                                    {quotaHistory.map((h) => (
                                        <tr key={h.id} className="hover:bg-surface-50/50 transition-colors">
                                            <td className="py-4 font-semibold text-surface-900">
                                                {formatDate(h.closedAt || h.createdAt || '')}
                                            </td>
                                            <td className="py-4 text-center font-bold text-surface-900">
                                                {h.quota}
                                            </td>
                                            <td className="py-4 text-center font-medium">
                                                {h.hiredCount} / {h.totalApplicants} apps
                                            </td>
                                            <td className="py-4 text-center font-medium">
                                                {h.inPipeline}
                                            </td>
                                            <td className="py-4 font-medium text-surface-500">
                                                {h.startDate ? formatDate(h.startDate) : 'N/A'} — {h.endDate ? formatDate(h.endDate) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
