import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Activity, Target, UserCheck, Users, Ban, Percent, TrendingUp, MapPin, User, FileText, CheckCircle2, Calendar, DollarSign, Hash, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, RadialBarChart, RadialBar, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import type { HiringQuotaHistory } from '@/services/PositionService';
import type { Application } from '@/types';

interface QuotaHistoryDashboardModalProps {
    item: HiringQuotaHistory | null;
    onClose: () => void;
    onEdit?: (item: HiringQuotaHistory) => void;
    allApplications?: Application[];
}

export function QuotaHistoryDashboardModal({ item, onClose, onEdit, allApplications = [] }: QuotaHistoryDashboardModalProps) {
    if (!item) return null;

    const attainment = item.quota > 0 ? Math.round((item.hiredCount / item.quota) * 100) : 0;
    const appToHire = item.totalApplicants > 0 ? Math.round((item.hiredCount / item.totalApplicants) * 100) : 0;
    const falloutRate = item.totalApplicants > 0 ? Math.round((item.failedCount / item.totalApplicants) * 100) : 0;
    const pipelineConv = item.totalApplicants > 0 ? Math.round((item.inPipeline / item.totalApplicants) * 100) : 0;

    const seasonApps = allApplications.filter(app => {
        if (!app.department || app.department.trim().toLowerCase() !== item.department.trim().toLowerCase()) return false;
        
        const appLob = app.pis?.custom_lob || app.metadata?.custom_lob || '';
        const openingName = item.openingName;
        
        if (openingName) {
            if (appLob === openingName) return true;
            return false;
        }
        
        if (!item.startDate || !item.endDate) return true;
        const actDate = app.hired_at || app.updated_at || app.interview_completed_at || app.applied_at;
        if (!actDate) return false;
        const dateMs = new Date(actDate).getTime();
        const startMs = new Date(`${item.startDate.split('T')[0]}T00:00:00`).getTime();
        const endMs = new Date(`${item.endDate.split('T')[0]}T23:59:59.999`).getTime();
        return dateMs >= startMs && dateMs <= endMs;
    });

    const hiredCandidates = seasonApps.filter(app => {
        const currentStatus = (app.current_status || '').toUpperCase();
        const finalSpecific = (app.pis?.final_specific_status || '').toUpperCase();
        const overallStatus = (app.pis?.overall_status || '').toUpperCase();
        const remarks = (app.remarks || '').toUpperCase();
        const finalNotes = (app.final_interview_notes || '').toUpperCase();
        const masterStatus = (app.master_status || '').toUpperCase();

        const isHired = currentStatus === 'HIRED' || finalSpecific === 'HIRED' || overallStatus === 'HIRED' || masterStatus === 'HIRED';
        const isConfirmedTraining = currentStatus.includes('CONFIRMED TRAINING') || finalSpecific.includes('CONFIRMED TRAINING') || overallStatus.includes('CONFIRMED TRAINING') || remarks.includes('CONFIRMED TRAINING') || finalNotes.includes('CONFIRMED TRAINING') || masterStatus.includes('CONFIRMED TRAINING');
        
        return isHired || isConfirmedTraining;
    });

    const isReprofiledCandidate = (app: Application) => {
        const hasHistory = (app.pis?.reprofile_history && app.pis.reprofile_history.length > 0) || 
                           (app.metadata?.reprofile_history && app.metadata.reprofile_history.length > 0);
        const hasReprofileFlag = app.metadata?.is_reprofiled === true || 
                                 app.metadata?.is_reprofiled === 'true' || 
                                 (app as any).is_reprofiled === true || 
                                 (app as any).is_reprofiled === 'true';
        const hasFailedAccounts = app.metadata?.failed_accounts && app.metadata.failed_accounts.length > 0;
        return !!(hasHistory || hasReprofileFlag || hasFailedAccounts);
    };

    const totalReprofiled = seasonApps.filter(isReprofiledCandidate).length;
    const passedReprofiled = seasonApps.filter(app => isReprofiledCandidate(app) && (app.current_status || '').toUpperCase() === 'HIRED').length;
    const reprofileRate = seasonApps.length > 0 ? Math.round((totalReprofiled / seasonApps.length) * 100) : 0;
    const reprofilePassRate = totalReprofiled > 0 ? Math.round((passedReprofiled / totalReprofiled) * 100) : 0;

    const formatDisplayDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const seasonLabel = item.startDate || item.endDate
        ? `${item.startDate ? formatDisplayDate(item.startDate) : 'No Start'} – ${item.endDate ? formatDisplayDate(item.endDate) : 'No End'}`
        : 'No dates recorded';

    const renderDetailBadge = (icon: React.ReactNode, label: string, value: string | number | boolean | null | undefined, accentColor: string) => {
        if (value === undefined || value === null || value === '') return null;
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div className={`p-2 rounded-md bg-${accentColor}-50 text-${accentColor}-600`}>
                    {icon}
                </div>
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                    </div>
                </div>
            </div>
        );
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <Modal
            open={!!item}
            onClose={onClose}
            title=""
            size="lg"
            className="max-w-[1000px] w-full"
        >
            <motion.div 
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="text-left font-sans select-none overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
                {/* Premium Gradient Header */}
                <motion.div variants={itemVariants} className="relative overflow-hidden bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#233554] p-8 text-white shadow-lg">
                    <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                        <Activity size={240} />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-bold tracking-widest rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase backdrop-blur-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                {!item.closedAt ? 'Active Campaign' : 'Historical Campaign'}
                            </div>
                            <h2 className="text-3xl font-black text-white mt-4 uppercase tracking-tight drop-shadow-md">
                                {item.department} <span className="text-slate-400 font-medium">|</span> {item.openingName || 'Standard Opening'}
                            </h2>
                            <p className="text-[13px] text-blue-200 font-medium mt-1.5 flex items-center gap-2">
                                <Calendar size={14} className="opacity-70" />
                                {seasonLabel}
                            </p>
                        </div>
                        
                        <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 p-5 rounded-xl text-center shrink-0 flex flex-col justify-center min-w-[140px] shadow-xl">
                            <span className="block text-[10px] font-black text-blue-200 uppercase tracking-widest">Conversion Rate</span>
                            <span className="block text-4xl font-black text-white mt-1 drop-shadow-sm">{attainment}%</span>
                        </div>
                    </div>
                </motion.div>

                <div className="p-6 space-y-6">
                    {/* Campaign Details Grid */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderDetailBadge(<User size={16} />, 'Requester', item.requesterName, 'blue')}
                        {renderDetailBadge(<MapPin size={16} />, 'Location', item.city && item.country ? `${item.city}, ${item.country}` : (item.city || item.country), 'indigo')}
                        {renderDetailBadge(<DollarSign size={16} />, 'Billable', item.isBillable, 'emerald')}
                        {renderDetailBadge(<Hash size={16} />, 'Concatenate', item.concatenate, 'purple')}
                        {renderDetailBadge(<Layers size={16} />, 'Req ID', item.hiringQuotaId, 'slate')}
                        {renderDetailBadge(<FileText size={16} />, 'Job Type', item.hiringType, 'sky')}
                        {renderDetailBadge(<Calendar size={16} />, 'Request Date', formatDisplayDate(item.requestDate), 'amber')}
                        {renderDetailBadge(<CheckCircle2 size={16} />, 'Approval Date', formatDisplayDate(item.approvalDate), 'teal')}
                    </motion.div>

                    {item.notes && (
                        <motion.div variants={itemVariants} className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-4 text-[13px] text-amber-900 shadow-sm">
                            <div className="font-bold uppercase tracking-wider text-[10px] text-amber-700 mb-1.5 flex items-center gap-1.5">
                                <FileText size={12} /> Notes
                            </div>
                            {item.notes}
                        </motion.div>
                    )}

                    {/* KPI Cards Row */}
                    <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Hiring Target', value: item.quota, sub: 'Positions needed', color: 'blue', icon: <Target size={20} /> },
                            { label: 'Hired Candidates', value: item.hiredCount, sub: `${item.manualHires || 0} manual additions`, color: 'emerald', icon: <UserCheck size={20} /> },
                            { label: 'Total Applicants', value: item.totalApplicants, sub: `${item.inPipeline} in progress`, color: 'indigo', icon: <Users size={20} /> },
                            { label: 'Dropped / Failed', value: item.failedCount, sub: 'Total rejections', color: 'rose', icon: <Ban size={20} /> }
                        ].map((card, i) => (
                            <motion.div 
                                key={card.label} 
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                className={`relative overflow-hidden bg-white dark:bg-slate-900 border border-${card.color}-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow`}
                            >
                                <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-${card.color}-50 rounded-full opacity-50`}></div>
                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
                                        <span className={`block text-3xl font-black leading-none text-${card.color}-700`}>{card.value}</span>
                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">{card.sub}</span>
                                    </div>
                                    <div className={`p-2.5 rounded-lg bg-${card.color}-100 text-${card.color}-600 shadow-inner`}>
                                        {card.icon}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Recruitment Metrics Table */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-slate-800 px-5 py-4 border-b border-slate-700">
                            <h3 className="text-[12px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                                <Activity size={16} className="text-blue-400" /> Recruitment Performance Breakdown
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                        {['Req', 'Offers', 'Fallout', 'Hires', 'Balance', 'Progress', 'Day 1', 'Fill Rate', 'Reprofile %', 'Pass %'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-blue-50/30 transition-colors font-bold text-[14px] text-slate-700 dark:text-slate-300">
                                        <td className="px-4 py-5 text-slate-900 dark:text-white">{item.quota}</td>
                                        <td className="px-4 py-5 text-blue-600">{item.hiredCount + item.failedCount}</td>
                                        <td className="px-4 py-5 text-rose-600">{item.failedCount}</td>
                                        <td className="px-4 py-5 text-emerald-600">{item.hiredCount}</td>
                                        <td className="px-4 py-5 text-slate-900 dark:text-white">{Math.max(0, item.quota - item.hiredCount)}</td>
                                        <td className="px-4 py-5 text-indigo-600">{item.recruitmentProgress || `${attainment}%`}</td>
                                        <td className="px-4 py-5 text-slate-700 dark:text-slate-300">{item.hiredCount}</td>
                                        <td className="px-4 py-5 text-emerald-600">{attainment}%</td>
                                        <td className="px-4 py-5 text-blue-600">{reprofileRate}%</td>
                                        <td className="px-4 py-5 text-emerald-600">{reprofilePassRate}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Visual Graphs */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Target size={14} className="text-blue-500" /> REQUIREMENT VS HIRES
                            </span>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={12} data={[{ name: 'Target', value: item.quota, fill: '#f1f5f9' }, { name: 'Hires', value: item.hiredCount, fill: '#10b981' }]} startAngle={180} endAngle={0}>
                                        <RadialBar dataKey="value" cornerRadius={6} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3">
                                <span>Req: <strong className="text-slate-800 dark:text-slate-200">{item.quota}</strong></span>
                                <span>Hired: <strong className="text-emerald-600">{item.hiredCount}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Users size={14} className="text-blue-500" /> OFFERS VS FALLOUT
                            </span>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[{ name: 'Offers', value: item.hiredCount + item.failedCount, fill: '#3b82f6' }, { name: 'Hires', value: item.hiredCount, fill: '#10b981' }, { name: 'Fallout', value: item.failedCount, fill: '#ef4444' }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={16}>
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#10b981" />
                                            <Cell fill="#ef4444" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3">
                                <span>Offers: <strong className="text-blue-600">{item.hiredCount + item.failedCount}</strong></span>
                                <span>Fallout: <strong className="text-rose-600">{item.failedCount}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <Percent size={14} className="text-blue-500" /> OVERALL FILL RATE
                            </span>
                            <div className="h-32 flex flex-col items-center justify-center relative">
                                <span className="absolute text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{attainment}%</span>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={10} data={[{ name: 'Fill Rate', value: attainment, fill: '#10b981' }]} startAngle={90} endAngle={90 - (3.6 * attainment)}>
                                        <RadialBar dataKey="value" cornerRadius={5} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3">
                                <span>Status: <strong className="text-emerald-600">Active</strong></span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <TrendingUp size={14} className="text-blue-500" /> REPROFILE ANALYSIS
                            </span>
                            <div className="h-32">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[{ name: 'Reprofile %', value: reprofileRate, fill: '#6366f1' }, { name: 'Pass %', value: reprofilePassRate, fill: '#10b981' }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={16}>
                                            <Cell fill="#6366f1" />
                                            <Cell fill="#10b981" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3">
                                <span>Reprofiled: <strong className="text-slate-800 dark:text-slate-200">{totalReprofiled}</strong></span>
                                <span>Passed: <strong className="text-emerald-600">{passedReprofiled}</strong></span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hired Candidates List */}
                    {hiredCandidates.length > 0 && (
                        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-emerald-600 px-5 py-4">
                                <h3 className="text-[12px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <UserCheck size={16} className="text-emerald-200" /> Hired Candidates Snapshot
                                </h3>
                            </div>
                            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
                                        <tr className="text-slate-500 dark:text-slate-400">
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Candidate Name</th>
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Email Address</th>
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Hired Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {hiredCandidates.map(app => (
                                            <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors text-[12px] text-slate-700 dark:text-slate-300">
                                                <td className="px-5 py-3 font-bold text-blue-700">{app.applicant_name}</td>
                                                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{app.applicant_email || app.pis?.email || 'N/A'}</td>
                                                <td className="px-5 py-3">
                                                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                                        {app.current_status || 'HIRED'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-500 dark:text-slate-400 font-medium">{formatDisplayDate(app.hired_at || app.updated_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Footer Actions */}
                    <motion.div variants={itemVariants} className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800/60 mt-4">
                        {onEdit && (
                            <button
                                onClick={() => { onEdit(item); onClose(); }}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-[12px] font-bold rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                            >
                                <Activity size={14} /> Edit Campaign
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-[12px] font-bold text-slate-700 dark:text-slate-300 rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer"
                        >
                            Close Dashboard
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </Modal>
    );
}
