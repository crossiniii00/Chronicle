import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, Calendar, Search, Mail, ExternalLink, 
    Clock, User, Building2, Clipboard, Layout,
    Filter, ArrowUpDown, ChevronRight, Loader2
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { useAuthStore } from '@/store/authStore';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { useToast } from '@/components/common/useToast';
import { useAccountTypeSettings } from '@/pages/admin/hooks/useAccountTypeSettings';

export function EndorsedView() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const toast = useToast();
    const { user } = useAuthStore();
    const { getReroutedAccounts } = useAccountTypeSettings();
    const reroutedAccounts = getReroutedAccounts();

    const loadData = async () => {
        setLoading(true);
        try {
            const allApps = await ApplicationService.getAll();
            // Filter for apps specifically endorsed to Recruiter S!
            const filtered = allApps.filter(app => app.endorsed_to_recruiter_s === true);
            setApplications(filtered);
        } catch (error) {
            console.error("Failed to load endorsed applicants:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredList = useMemo(() => {
        return applications.filter(app => 
            app.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
            app.applicant_email.toLowerCase().includes(search.toLowerCase()) ||
            app.department?.toLowerCase().includes(search.toLowerCase())
        );
    }, [applications, search]);

    const handleSchedule = (app: Application) => {
        const subject = encodeURIComponent(`Interview Schedule: ${app.applicant_name} - ${app.department}`);
        const body = encodeURIComponent(`Hi ${app.applicant_name},\n\nWe would like to schedule your Ops Val interview for the ${app.department} account.\n\nPlease let us know your availability.\n\nRegards,\n${user?.full_name || 'Recruitment Team'}`);
        const toEmail = app.applicant_name ? `${app.applicant_name} <${app.applicant_email}>` : app.applicant_email;
        const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(toEmail)}&subject=${subject}&body=${body}`;
        window.open(url, '_blank');
        
        // Update status if needed
        ApplicationService.patch(app.id, { recruiter_s_scheduling_status: 'SCHEDULED' });
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, recruiter_s_scheduling_status: 'SCHEDULED' } : a));
        toast.success('Redirecting to Outlook Web', 'Opening interview schedule template in browser...');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Accessing Secure Channel...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-surface-200">
                <div>
                    <div className="flex items-center gap-2 text-primary-600 text-[10px] font-black uppercase tracking-widest bg-primary-50 px-3 py-1 border border-primary-100 rounded-sm w-fit mb-2">
                        <CheckCircle2 size={12} /> Priority Queue
                    </div>
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight flex items-center gap-3 uppercase">
                        <Clipboard size={24} className="text-primary-600" /> Rerouted Pipeline
                    </h1>
                    <p className="text-[9px] font-bold text-surface-500 uppercase tracking-[0.2em] mt-1">
                        Specialized Routing for {reroutedAccounts.map(a => a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' & ')} Accounts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[300px]">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="SEARCH PRIORITY CHANNEL..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-surface-200 text-[11px] font-bold placeholder-surface-400 focus:border-primary-500 transition-all outline-none uppercase tracking-tight shadow-sm rounded-none"
                        />
                    </div>
                    <button onClick={loadData} className="p-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none hover:bg-surface-50 transition-colors shadow-sm">
                        <Clock size={16} className="text-surface-600" />
                    </button>
                </div>
            </div>

            {filteredList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-surface-200 rounded-none p-20 text-center">
                    <div className="w-16 h-16 bg-surface-50 rounded-none flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-surface-300" />
                    </div>
                    <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest">Queue Empty</h3>
                    <p className="text-[10px] text-surface-500 mt-1 uppercase">No candidates currently routed to this exclusive channel.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredList.map((app) => (
                            <motion.div
                                key={app.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 border border-surface-200 rounded-none shadow-sm hover:shadow-md hover:border-primary-300 transition-all group relative overflow-hidden"
                            >
                                {app.recruiter_s_scheduling_status === 'SCHEDULED' && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 z-10">
                                        Scheduled
                                    </div>
                                )}
                                
                                <div className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-surface-900 uppercase tracking-tight truncate max-w-[180px]">
                                                {app.applicant_name}
                                            </h4>
                                            <p className="text-[10px] text-surface-500 font-bold truncate mt-0.5">
                                                {app.applicant_email}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-primary-50 rounded-none">
                                            <Building2 size={16} className="text-primary-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-surface-400 uppercase tracking-wider">Account</span>
                                            <span className="text-surface-900 uppercase px-2 py-0.5 bg-surface-100 rounded-none">{app.department}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                            <span className="text-surface-400 uppercase tracking-wider">Routed On</span>
                                            <span className="text-surface-700">{new Date(app.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-surface-100 flex gap-2">
                                        <button 
                                            onClick={() => handleSchedule(app)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-sm",
                                                app.recruiter_s_scheduling_status === 'SCHEDULED'
                                                    ? "bg-surface-100 text-surface-500 cursor-default"
                                                    : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-200"
                                            )}
                                        >
                                            <Calendar size={14} /> 
                                            {app.recruiter_s_scheduling_status === 'SCHEDULED' ? 'Scheduled' : 'Schedule in Outlook'}
                                        </button>
                                        <button className="p-2.5 bg-white dark:bg-slate-900 border border-surface-200 rounded-none hover:text-primary-600 hover:border-primary-600 transition-all shadow-sm group-hover:bg-primary-50/50">
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
