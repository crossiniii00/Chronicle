import React, { useState, useEffect } from 'react';
import { ApplicationService } from '@/services/ApplicationService';
import type { Application } from '@/types';
import { 
    Search, 
    Building2, 
    Filter, 
    ChevronDown, 
    LayoutGrid, 
    List,
    UserCircle2,
    ClipboardList,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/formatters';
import { GuestApplicantTable } from '@/components/features/ApplicantManagement/GuestApplicantTable';
import { useAuthStore } from '@/store/authStore';

export function InterviewRegistryHistory() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'PASSED' | 'FAILED' | 'PENDING'>('PASSED');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const { user: authUser } = useAuthStore();

    useEffect(() => {
        async function loadApplications() {
            try {
                const data = await ApplicationService.getAll();
                setApplications(data);
            } catch (error) {
                console.error("Failed to fetch applications:", error);
            } finally {
                setLoading(false);
            }
        }
        loadApplications();
    }, []);
    
    const isAssignedToCurrentValidator = (app: Application) => {
        if (authUser?.role === 'admin') return true;

        const metadata = app.metadata || {};
        const assignedId = app.assigned_ops_validator_id || metadata.assigned_ops_validator_id;
        const assignedName = (app.assigned_ops_validator_name || metadata.assigned_ops_validator_name || '').trim().toLowerCase();
        const assignedEmail = (app.pis?.ops_validator_email || metadata.ops_validator_email || '').trim().toLowerCase();
        const userName = (authUser?.full_name || '').trim().toLowerCase();
        const userEmail = (authUser?.email || '').trim().toLowerCase();

        return Boolean(
            assignedId === authUser?.id ||
            (assignedName && assignedName === userName) ||
            (assignedEmail && assignedEmail === userEmail)
        );
    };

    const isFailedForValidatorAccount = (app: Application) => {
        return app.metadata?.failed_accounts?.some(
            (f: string) => authUser?.department?.split(',').map((s: any) => s.trim().toLowerCase()).includes(f.trim().toLowerCase())
        );
    };

    const validatorEndorsements = applications.filter(a =>
        isAssignedToCurrentValidator(a) || isFailedForValidatorAccount(a)
    );

    const filteredByStatus = validatorEndorsements.filter(a => {
        const failed = isFailedForValidatorAccount(a);
        const isConcludedFailed = ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status);
        if (statusFilter === 'PASSED') return ['HIRED', 'PASSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_VERDICT'].includes(a.current_status);
        if (statusFilter === 'FAILED') return isConcludedFailed;
        if (statusFilter === 'PENDING') return ['FINAL_INTERVIEW_SCHEDULED', 'ENDORSED', 'FINAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED'].includes(a.current_status) && !failed;
        return false;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const filtered = filteredByStatus.filter(app => 
        app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.position_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.3em]">Syncing Records...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'PASSED', label: 'For Job Offer', count: validatorEndorsements.filter(a => ['HIRED', 'PASSED', 'CLIENT_ASSESSMENT', 'CLIENT_INTERVIEW', 'FINAL_VERDICT'].includes(a.current_status)).length },
        { id: 'FAILED', label: 'Failed', count: validatorEndorsements.filter(a => ['REJECTED', 'FAILED', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status) || isFailedForValidatorAccount(a)).length },
        { id: 'PENDING', label: 'Pending', count: validatorEndorsements.filter(a => ['FINAL_INTERVIEW_SCHEDULED', 'ENDORSED', 'FINAL_INTERVIEW', 'INTERVIEW_IN_PROGRESS', 'QUEUE_ASSIGNED'].includes(a.current_status) && !isFailedForValidatorAccount(a)).length },
    ];

    return (
        <div className="min-h-screen bg-[#f3f2f1] py-12 px-4 sm:px-6 lg:px-8 pb-20">
            <div className="max-w-[1400px] mx-auto">
                {/* --- HEADER --- */}
                <div className="mb-10 text-center flex flex-col items-center gap-1">
                    <h1
                        className="text-4xl text-surface-900 tracking-tight"
                        style={{ fontFamily: 'var(--font-family-display)', fontWeight: 600, fontStyle: 'italic' }}
                    >
                        Evaluation History
                    </h1>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-surface-400">
                        {filtered.length} Archived Decisions
                    </span>
                </div>

                {/* --- TAB SWITCHER --- */}
                <div className="flex items-center gap-8 border-b border-surface-200 mb-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={cn(
                                "pb-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
                                statusFilter === tab.id ? "text-primary-600" : "text-surface-400 hover:text-surface-600"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-sm text-[9px] font-bold",
                                statusFilter === tab.id ? "bg-primary-100 text-primary-700" : "bg-surface-100 text-surface-500"
                            )}>
                                {tab.count}
                            </span>
                            {statusFilter === tab.id && (
                                <motion.div layoutId="history-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                            )}
                        </button>
                    ))}
                </div>

                {/* --- FILTERS & CONTROLS --- */}
                <div className="flex flex-col xl:flex-row gap-4 mb-8">
                    <div className="flex-1 relative group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-[#0078d4] transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search historical records, applicants, or roles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-surface-200 text-sm font-medium focus:border-[#0078d4] focus:ring-0 transition-all rounded-sm shadow-sm placeholder:text-surface-400"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-black uppercase tracking-widest text-surface-900 rounded-sm shadow-sm hover:bg-surface-50 transition-all">
                            <Building2 size={16} className="text-surface-400" />
                            All Accounts
                            <ChevronDown size={14} className="text-surface-300" />
                        </button>
                        <button className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-900 border border-surface-200 text-[10px] font-black uppercase tracking-widest text-surface-900 rounded-sm shadow-sm hover:bg-surface-50 transition-all">
                            <Filter size={16} className="text-surface-400" />
                            All Records
                            <ChevronDown size={14} className="text-surface-300" />
                        </button>

                        <div className="w-[1px] h-8 bg-surface-200 mx-2 hidden sm:block" />

                        <div className="flex bg-white dark:bg-slate-900 border border-surface-200 p-1 rounded-sm shadow-sm">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-sm transition-all",
                                    viewMode === 'grid' ? "bg-surface-50 text-[#0078d4]" : "text-surface-400 hover:text-surface-600"
                                )}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-sm transition-all",
                                    viewMode === 'list' ? "bg-surface-50 text-[#0078d4]" : "text-surface-400 hover:text-surface-600"
                                )}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- TABLE CONTENT --- */}
                <GuestApplicantTable 
                    applicants={filtered}
                    viewMode="history"
                    emptyMessage={
                        statusFilter === 'PASSED' ? "No passed candidates found in your evaluation logs." :
                        statusFilter === 'FAILED' ? "No failed candidates found in your evaluation logs." :
                        "No pending evaluations detected in the registry."
                    }
                    renderActions={(app) => (
                        <button className="p-2 text-surface-400 hover:text-primary-600 hover:bg-surface-50 rounded-sm transition-all" title="View Documentation">
                            <UserCircle2 size={18} />
                        </button>
                    )}
                />
                
                {/* --- FOOTER CONTENT --- */}
                <footer className="mt-12 text-center">
                    <p className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] opacity-40">
                        &copy; {new Date().getFullYear()} Recruitment360 Intelligence Registry
                    </p>
                </footer>
            </div>
        </div>
    );
}
