import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutGrid, List, FileSpreadsheet, Download,
    Filter, TrendingUp, Users, Target, CheckCircle2,
    Calendar, Building2, Layers, Edit3, Plus, Trash,
    Check, X, Save, ChevronRight, Activity, ClipboardList,
    Loader2, AlertCircle, Info
} from 'lucide-react';
import { ApplicationService } from '@/services/ApplicationService';
import { Application } from '@/types/application';
import { cn } from '@/utils/formatters';
import { ReportConfigService } from '@/services/ReportConfigService';
import { DepartmentService, Department } from '@/services/DepartmentService';
import { PositionService } from '@/services/PositionService';
import type { Position } from '@/types/position';

interface HCSection {
    title: string;
    rows: HCDataRow[];
}

interface HCDataRow {
    program: string;
    rosterDate: string;
    trainingDate: string;
    required: number;
    totalJobOffers?: number;
    acceptedJo: number;
    forOpsVs?: number;
    forJo: number;
    forCi?: number;
    doneCi?: number;
}

interface PipelineData {
    program: string;
    apps: number;
    passedInitial: number;
    passedAssessment: number;
    passedOpsInterview: number;
    endorsedToClient: number;
    passedClientHired: number;
    hcRequired: number;
    remarks: string;
}

export function DailyHCReportView({ applications: propApps }: { applications?: Application[] }) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Section Data State (Configurable parts like dates)
    const [section1, setSection1] = useState<HCDataRow[]>([]);
    const [section2, setSection2] = useState<HCDataRow[]>([]);
    const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const [apps, deps, pos, configs] = await Promise.all([
                propApps ? Promise.resolve(propApps) : ApplicationService.getAll(),
                DepartmentService.getAll(),
                PositionService.getAll(),
                ReportConfigService.getById('daily_hc_report')
            ]);

            setApplications(apps as Application[]);
            setDepartments(deps);

            // Extract configs if they exist
            const configData = configs || {};
            const savedSection1 = configData.section1 as HCDataRow[] || [];
            const savedSection2 = configData.section2 as HCDataRow[] || [];
            const savedPipeline = configData.pipelineData as PipelineData[] || [];

            // SYNC DEPARTMENTS WITH ROWS
            // We use Departments as the Source of Truth, but we also discover accounts from Applications
            const appAccounts = Array.from(new Set(apps.map(a => (a.department || 'General Pool').trim().toUpperCase())));
            const deptNames = deps.map(d => d.name.trim().toUpperCase());
            
            // Combine them to ensure all accounts are represented
            const allAccountNames = Array.from(new Set([...deptNames, ...appAccounts]));
            
            // Get positions for quota discovery
            const positions = Array.isArray(pos) ? pos : (pos as any)?.data || [];

            const newSection1: HCDataRow[] = [];
            const newSection2: HCDataRow[] = [];
            const newPipeline: PipelineData[] = [];

            allAccountNames.forEach(accName => {
                const targetName = accName.trim().toUpperCase();
                const dep = deps.find(d => d.name.trim().toUpperCase() === targetName);
                
                // ROBUST QUOTA DISCOVERY (Matches HiringReportsView)
                const internalPos = positions.find((p: any) => p.department?.trim().toUpperCase() === targetName && p.qualifications?.startsWith('ACCOUNT_INTERNAL_QUOTA'));
                const databaseQuota = internalPos ? Number(internalPos.hiring_quota) : 0;
                const deptQuota = dep?.hiring_quota || 0;
                
                const isSpecialty = targetName.includes('KELLER POSTMAN') || targetName.includes('NURSE');
                const existingS1 = savedSection1.find(s => s.program.trim().toUpperCase() === targetName);
                const existingS2 = savedSection2.find(s => s.program.trim().toUpperCase() === targetName);
                const existingPipe = savedPipeline.find(p => p.program.trim().toUpperCase() === targetName);

                const finalQuota = databaseQuota || deptQuota || existingS1?.required || existingS2?.required || 0;

                if (isSpecialty) {
                    newSection2.push({
                        program: accName,
                        rosterDate: existingS2?.rosterDate || 'TBD',
                        trainingDate: existingS2?.trainingDate || 'TBD',
                        required: finalQuota,
                        acceptedJo: 0,
                        forJo: 0,
                        forCi: 0,
                        doneCi: 0
                    });
                } else {
                    newSection1.push({
                        program: accName,
                        rosterDate: existingS1?.rosterDate || 'TBD',
                        trainingDate: existingS1?.trainingDate || 'TBD',
                        required: finalQuota,
                        acceptedJo: 0,
                        forJo: 0
                    });
                }

                newPipeline.push({
                    program: accName,
                    apps: 0,
                    passedInitial: 0,
                    passedAssessment: 0,
                    passedOpsInterview: 0,
                    endorsedToClient: 0,
                    passedClientHired: 0,
                    hcRequired: finalQuota,
                    remarks: existingPipe?.remarks || ''
                });
            });

            setSection1(newSection1);
            setSection2(newSection2);
            setPipelineData(newPipeline);

        } catch (error) {
            console.error("Failed to load HC report data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [propApps]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await ReportConfigService.update('daily_hc_report', {
                section1,
                section2,
                pipelineData
            });
            setIsEditing(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const statusMetrics = useMemo(() => {
        const counts = {
            'Hired': 0,
            'Sent JO and BGC': 0,
            'For Job Offer': 0,
            'Wave': 0,
            'Declined Offer': 0,
            'Withdrew': 0,
            'Lateral Transfer': 0,
            'Promotion': 0,
            'Class Cancelled': 0,
            'Class On Hold': 0,
            'No Show': 0
        };

        applications.forEach(app => {
            const status = (app.current_status || '').toUpperCase().replace(/_/g, ' ');
            if (['HIRED', 'HIRED PROCESSED', 'PASSED'].includes(status)) counts['Hired']++;
            if (['SENT JO AND BGC', 'CONTRACT SENT', 'JO SENT'].includes(status)) counts['Sent JO and BGC']++;
            if (['PASSED INITIAL', 'FOR JOB OFFER', 'FOR JO'].includes(status)) counts['For Job Offer']++;
            if (['DECLINED OFFER', 'REJECTED', 'FAILED', 'NOT ELIGIBLE'].includes(status)) counts['Declined Offer']++;
            if (['WITHDRAWN', 'WITHDREW'].includes(status)) counts['Withdrew']++;
            if (status === 'PROMOTION') counts['Promotion']++;
            if (status === 'LATERAL TRANSFER') counts['Lateral Transfer']++;
        });

        return counts;
    }, [applications]);

    // Automation Layer: Overlay live data on top of configured rows
    const liveSection1 = useMemo(() => {
        return section1.map(row => {
            const programApps = applications.filter(a => (a.department || '').trim().toUpperCase() === row.program.trim().toUpperCase());
            const acceptedJo = programApps.filter(a => ['HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER', 'PASSED'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const forJo = programApps.filter(a => ['FOR JOB OFFER', 'FOR JO', 'PASSED INITIAL'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            
            return {
                ...row,
                acceptedJo,
                forJo
            };
        });
    }, [section1, applications]);

    const liveSection2 = useMemo(() => {
        return section2.map(row => {
            const programApps = applications.filter(a => (a.department || '').trim().toUpperCase() === row.program.trim().toUpperCase());
            const forJo = programApps.filter(a => ['FOR JOB OFFER', 'FOR JO', 'PASSED INITIAL'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const doneCi = programApps.filter(a => ['HIRED', 'HIRED PROCESSED', 'ACCEPTED OFFER', 'PASSED'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const forCi = programApps.filter(a => (a.current_status || '').toUpperCase().replace(/_/g, ' ') === 'CLIENT INTERVIEW').length;
            const forOpsVs = programApps.filter(a => (a.current_status || '').toUpperCase().replace(/_/g, ' ') === 'FINAL INTERVIEW').length;

            return {
                ...row,
                forJo,
                doneCi,
                forCi,
                forOpsVs
            };
        });
    }, [section2, applications]);

    const livePipelineData = useMemo(() => {
        return pipelineData.map(row => {
            const programApps = applications.filter(a => (a.department || '').trim().toUpperCase() === row.program.trim().toUpperCase());
            const passedInitial = programApps.filter(a => !['APPLIED', 'TYPING TEST', 'REJECTED', 'NOT ELIGIBLE'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const passedAssess = programApps.filter(a => ['FINAL INTERVIEW', 'CLIENT ASSESSMENT', 'CLIENT INTERVIEW', 'PASSED', 'HIRED'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const passedOps = programApps.filter(a => ['CLIENT ASSESSMENT', 'CLIENT INTERVIEW', 'PASSED', 'HIRED'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const endorsed = programApps.filter(a => ['CLIENT INTERVIEW', 'PASSED', 'HIRED'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;
            const passed = programApps.filter(a => ['HIRED', 'HIRED PROCESSED', 'PASSED', 'ACCEPTED OFFER'].includes((a.current_status || '').toUpperCase().replace(/_/g, ' '))).length;

            return {
                ...row,
                apps: programApps.length,
                passedInitial,
                passedAssessment: passedAssess,
                passedOpsInterview: passedOps,
                endorsedToClient: endorsed,
                passedClientHired: passed
            };
        });
    }, [pipelineData, applications]);

    const handleRowChange = (section: 1 | 2 | 3, idx: number, field: string, value: any) => {
        if (section === 1) {
            const next = [...section1];
            next[idx] = { ...next[idx], [field]: value };
            setSection1(next);
        } else if (section === 2) {
            const next = [...section2];
            next[idx] = { ...next[idx], [field]: value };
            setSection2(next);
        } else if (section === 3) {
            const next = [...pipelineData];
            next[idx] = { ...next[idx], [field]: value };
            setPipelineData(next);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#002060] animate-spin mb-4" />
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Generating Live HC Matrix...</p>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-2 bg-[#f3f2f1] min-h-screen font-sans">
            {/* Sidebar Status Monitor */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">
                <div className="bg-white border border-[#edebe9] shadow-sm rounded-none overflow-hidden">
                    <div className="bg-[#002060] text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} /> Status Monitor
                    </div>
                    <div className="p-2 space-y-1">
                        {Object.entries(statusMetrics).map(([label, count]) => (
                            <div key={label} className="flex items-center justify-between p-2 hover:bg-[#f8f9fa] rounded-none transition-colors border-b border-[#f3f2f1] last:border-0">
                                <span className="text-[10px] font-bold text-[#323130] uppercase tracking-tight">{label}</span>
                                <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-none min-w-[24px] text-center",
                                    count > 0 ? "bg-[#d13438] text-white shadow-sm" : "bg-[#edebe9] text-[#a19f9d]"
                                )}>
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={isSaving}
                    className={cn(
                        "w-full py-4 text-[10px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 rounded-none shadow-lg",
                        isEditing ? "bg-[#107c10] text-white hover:bg-[#0e690e]" : "bg-[#323130] text-white hover:bg-black",
                        isSaving && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Save size={16} /> : <Edit3 size={16} />)}
                    {isSaving ? 'SYNCING...' : (isEditing ? 'COMMIT CHANGES' : 'MODIFY HC DATA')}
                </button>

                <div className="p-4 bg-white border border-[#edebe9] rounded-none">
                    <p className="text-[9px] font-bold text-surface-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Info size={12} /> Data Source
                    </p>
                    <p className="text-[10px] text-surface-600 leading-relaxed font-medium">
                        This report is powered by the <strong>Live Registry</strong> and <strong>Account Quotas</strong>. 
                        Requirements are synced with the Account System.
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-8 overflow-x-auto pb-20">
                {/* Section 1: Main Program Roster */}
                <div className="bg-white border border-[#edebe9] shadow-xl rounded-sm min-w-[1000px] overflow-hidden">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr] bg-[#002060] text-white text-[10px] font-black uppercase tracking-widest border-b border-white/20">
                        <div className="p-4 border-r border-white/10 flex items-center gap-2"><Building2 size={14}/> Program</div>
                        <div className="p-4 border-r border-white/10 text-center flex items-center justify-center gap-2"><Calendar size={14}/> Roster</div>
                        <div className="p-4 border-r border-white/10 text-center flex items-center justify-center gap-2"><Calendar size={14}/> Training</div>
                        <div className="p-4 border-r border-white/10 text-center">Required</div>
                        <div className="p-4 border-r border-white/10 text-center">Accepted JO</div>
                        <div className="p-4 border-r border-white/10 text-center bg-[#cfe2f3]/20">Fill Rate %</div>
                        <div className="p-4 border-r border-white/10 text-center">For OPS Vs</div>
                        <div className="p-4 text-center">For JO</div>
                    </div>
                    <div className="divide-y divide-[#f3f2f1]">
                        {liveSection1.map((row, idx) => {
                            const fillRate = (row.acceptedJo / (row.required || 1)) * 100;
                            return (
                                <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr] text-[10px] font-bold text-[#323130] hover:bg-[#faf9f8] transition-colors">
                                    <div className="p-4 border-r border-[#f3f2f1] font-black text-[#002060]">{row.program}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center">
                                        {isEditing ? (
                                            <input 
                                                className="w-full bg-white border border-[#edebe9] px-2 py-1 text-center font-bold outline-none focus:border-[#002060]"
                                                value={row.rosterDate} 
                                                onChange={e => handleRowChange(1, idx, 'rosterDate', e.target.value)}
                                            />
                                        ) : row.rosterDate}
                                    </div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center">
                                        {isEditing ? (
                                            <input 
                                                className="w-full bg-white border border-[#edebe9] px-2 py-1 text-center font-bold outline-none focus:border-[#002060]"
                                                value={row.trainingDate} 
                                                onChange={e => handleRowChange(1, idx, 'trainingDate', e.target.value)}
                                            />
                                        ) : row.trainingDate}
                                    </div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center font-black">{row.required}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center font-black">{row.acceptedJo}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center bg-[#cfe2f3]/40 text-blue-800 font-black">{fillRate.toFixed(2)}%</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center">{row.forOpsVs || 0}</div>
                                    <div className="p-4 text-center">{row.forJo}</div>
                                </div>
                            );
                        })}
                        {/* Summary Row */}
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr] bg-[#002060] text-white text-[11px] font-black uppercase tracking-widest border-t-2 border-[#002060]">
                            <div className="p-4 border-r border-white/10 col-span-3 text-right pr-8">Section Total Metrics</div>
                            <div className="p-4 border-r border-white/10 text-center">{liveSection1.reduce((acc, curr) => acc + curr.required, 0)}</div>
                            <div className="p-4 border-r border-white/10 text-center">{liveSection1.reduce((acc, curr) => acc + curr.acceptedJo, 0)}</div>
                            <div className="p-4 border-r border-white/10 text-center bg-white/10">
                                {(liveSection1.reduce((acc, curr) => acc + curr.acceptedJo, 0) / (liveSection1.reduce((acc, curr) => acc + curr.required, 0) || 1) * 100).toFixed(2)}%
                            </div>
                            <div className="p-4 border-r border-white/10 text-center">{liveSection1.reduce((acc, curr) => acc + (curr.forOpsVs || 0), 0)}</div>
                            <div className="p-4 text-center">{liveSection1.reduce((acc, curr) => acc + curr.forJo, 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Specialty / Clinical */}
                <div className="bg-white border border-[#edebe9] shadow-xl rounded-sm min-w-[1000px] overflow-hidden">
                    <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr] bg-[#323130] text-white text-[10px] font-black uppercase tracking-widest border-b border-white/20">
                        <div className="p-4 border-r border-white/10 flex items-center gap-2"><Target size={14}/> Specialty Program</div>
                        <div className="p-4 border-r border-white/10 text-center">Roster</div>
                        <div className="p-4 border-r border-white/10 text-center">Training</div>
                        <div className="p-4 border-r border-white/10 text-center">Required</div>
                        <div className="p-4 border-r border-white/10 text-center">For JO</div>
                        <div className="p-4 border-r border-white/10 text-center bg-[#cfe2f3]/20">Fill Rate %</div>
                        <div className="p-4 border-r border-white/10 text-center">For OPS Vs</div>
                        <div className="p-4 border-r border-white/10 text-center">For CI</div>
                        <div className="p-4 text-center">Done CI</div>
                    </div>
                    <div className="divide-y divide-[#f3f2f1]">
                        {liveSection2.map((row, idx) => {
                            const fillRate = ((row.doneCi || 0) / (row.required || 1)) * 100;
                            return (
                                <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr] text-[10px] font-bold text-[#323130] hover:bg-[#faf9f8] transition-colors">
                                    <div className="p-4 border-r border-[#f3f2f1] font-black">{row.program}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center text-[#605e5c]">
                                        {isEditing ? (
                                            <input 
                                                className="w-full bg-white border border-[#edebe9] px-2 py-1 text-center font-bold outline-none focus:border-[#323130]"
                                                value={row.rosterDate} 
                                                onChange={e => handleRowChange(2, idx, 'rosterDate', e.target.value)}
                                            />
                                        ) : row.rosterDate}
                                    </div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center text-[#605e5c]">
                                        {isEditing ? (
                                            <input 
                                                className="w-full bg-white border border-[#edebe9] px-2 py-1 text-center font-bold outline-none focus:border-[#323130]"
                                                value={row.trainingDate} 
                                                onChange={e => handleRowChange(2, idx, 'trainingDate', e.target.value)}
                                            />
                                        ) : row.trainingDate}
                                    </div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center font-black">{row.required}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center font-black">{row.forJo}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center bg-[#cfe2f3]/40 text-blue-800 font-black">{fillRate.toFixed(2)}%</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center">{row.forOpsVs || 0}</div>
                                    <div className="p-4 border-r border-[#f3f2f1] text-center">{row.forCi}</div>
                                    <div className="p-4 text-center font-black text-[#107c10] bg-[#107c10]/5">{row.doneCi}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 3: Pipeline Analytics */}
                <div className="bg-white border border-[#edebe9] shadow-xl rounded-sm min-w-[1200px] overflow-hidden">
                    <div className="bg-[#d13438] text-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <ClipboardList size={16} /> Pipeline Analytics & Recruitment Intelligence
                    </div>
                    <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr_2fr] bg-[#f8f9fa] text-[#605e5c] text-[9px] font-black uppercase border-b border-[#edebe9] tracking-widest">
                        <div className="p-4 border-r border-[#edebe9]">Program</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Total Apps</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Passed Initial</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Passed Assess.</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Passed Ops</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Endorsed</div>
                        <div className="p-4 border-r border-[#edebe9] text-center text-[#d13438] bg-[#d13438]/5">Passed</div>
                        <div className="p-4 border-r border-[#edebe9] text-center">Required</div>
                        <div className="p-4">Remarks & Intelligence Dossier</div>
                    </div>
                    <div className="divide-y divide-[#f3f2f1]">
                        {livePipelineData.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1fr_1fr_0.8fr_2fr] text-[10px] font-bold text-[#323130] hover:bg-[#fffcf5] transition-colors group">
                                <div className="p-4 border-r border-[#f3f2f1] text-[#002060] font-black uppercase truncate">{row.program}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white">{row.apps}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white">{row.passedInitial}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white">{row.passedAssessment}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white">{row.passedOpsInterview}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white">{row.endorsedToClient}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center font-black text-[#d13438] bg-[#d13438]/5 group-hover:bg-[#d13438]/10">{row.passedClientHired}</div>
                                <div className="p-4 border-r border-[#f3f2f1] text-center group-hover:bg-white font-black">{row.hcRequired}</div>
                                <div className="p-4 text-[#605e5c] italic group-hover:bg-white">
                                    {isEditing ? (
                                        <input 
                                            className="w-full bg-white border border-[#edebe9] px-2 py-1 font-medium outline-none focus:border-[#d13438]"
                                            value={row.remarks} 
                                            onChange={e => handleRowChange(3, idx, 'remarks', e.target.value)}
                                            placeholder="Enter operational remarks..."
                                        />
                                    ) : (row.remarks || 'No active operational notes.')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
