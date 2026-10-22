import React, { useMemo, useState } from 'react';
import {
    Building2, Users, Briefcase, Calendar, X, Clock,
    XCircle, Activity, Check, X as XIcon,
    BarChart3, UserCheck, AlertCircle, FileDown, Loader2, UserX, ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn, formatDateTime, timeAgo } from '@/utils/formatters';
import { AdvancedDateFilter } from '@/components/common/AdvancedDateFilter';
import type { DateFilterState } from '@/components/common/AdvancedDateFilter';
import type { EmployeeStats } from '../hooks/useEmployeeTracker';

export function TrackerHeader() {
    return (
        <div className="bg-gradient-to-r from-[#0078d4]/[0.03] via-white to-[#8764b8]/[0.03] border-b border-[#e1dfdd]">
            <div className="px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none bg-[#0078d4] flex items-center justify-center shadow-sm">
                        <Activity size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-[20px] leading-none text-[#323130] dark:text-slate-300 font-bold tracking-[-0.02em]">
                            Employee Activity Hub
                        </h1>
                        <p className="text-[11px] text-[#605e5c] dark:text-slate-400 font-medium mt-1 tracking-[-0.005em]">
                            Staff performance monitoring & workforce analytics
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium text-[#605e5c] dark:text-slate-400 bg-white dark:bg-slate-900 border border-[#e1dfdd] px-3 py-1.5 rounded-none shadow-sm">
                    <Clock size={11} className="text-[#a19f9d]" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </div>
    );
}


interface EmployeeDetailModalProps {
    selectedUser: EmployeeStats | null;
    setSelectedUser: (s: EmployeeStats | null) => void;
    modalTab: 'applicants' | 'endorsed' | 'failed' | 'logs';
    setModalTab: (t: 'applicants' | 'endorsed' | 'failed' | 'logs') => void;
    modalStatFilter: 'ALL' | 'TOTAL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'NO_SHOW' | 'PENDING' | 'PASSED' | 'FAILED';
    setModalStatFilter: (f: 'ALL' | 'TOTAL' | 'SCREENED' | 'ENDORSED' | 'DROPPED' | 'NO_SHOW' | 'PENDING' | 'PASSED' | 'FAILED') => void;
    updateApplicantStatus?: (appId: string, toStatus: string) => void;
    dateFilter: DateFilterState;
    setDateFilter: (d: DateFilterState) => void;
}

export function EmployeeDetailModal({
    selectedUser, setSelectedUser, modalTab, setModalTab,
    modalStatFilter, setModalStatFilter, updateApplicantStatus,
    dateFilter, setDateFilter
}: EmployeeDetailModalProps) {
    const [accountFilter, setAccountFilter] = useState<string>('ALL');

    const uniqueAccounts = useMemo(() => {
        if (!selectedUser) return [];
        const depts = new Set(selectedUser.detailedApplicants.map(a => a.department).filter(Boolean));
        return Array.from(depts).sort();
    }, [selectedUser]);

    // Compute filtered applicants based on modal-local filters
    const filteredApplicants = useMemo(() => {
        if (!selectedUser) return [];

        return selectedUser.detailedApplicants.filter(app => {
            // Note: date filtering is already applied by the parent to selectedUser.detailedApplicants.
            // We just need to apply the accountFilter.
            if (accountFilter !== 'ALL' && app.department !== accountFilter) return false;
            return true;
        });
    }, [selectedUser, accountFilter]);

    // Derive accurate counts from filtered data
    const filteredCounts = useMemo(() => {
        const all = filteredApplicants;
        const isOpsUser = selectedUser?.user.role === 'ops_validator';
        const interviewedCount = all.filter(a => a.status !== 'ENDORSED_OPS').length;
        const endorsedCount = all.filter(a => a.status === 'PASSED').length;
        const endorsedOverCount = all.filter(a => a.status === 'ENDORSED_OVER').length;
        const endorsedOpsCount = all.filter(a => a.status === 'ENDORSED_OPS').length;
        const failedCount = all.filter(a => a.status === 'FAILED' || a.status === 'DROPPED').length;
        const noShowCount = all.filter(a => a.status === 'NO_SHOW').length;
        const totalEndorsed = isOpsUser ? endorsedCount : (endorsedOverCount + endorsedOpsCount);
        const endorsementYield = interviewedCount > 0 ? Math.round((totalEndorsed / interviewedCount) * 100) : 0;

        return { interviewedCount, endorsedCount, endorsedOverCount, endorsedOpsCount, failedCount, noShowCount, endorsementYield };
    }, [filteredApplicants, selectedUser]);

    const [isExporting, setIsExporting] = useState(false);

    const handleExportPDF = async () => {
        if (!selectedUser || isExporting) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth(); // 210
            const pageHeight = doc.internal.pageSize.getHeight(); // 297
            let currentY = 0;

            // Separate candidates into 3 explicit categories: Passed, Dropped, and Pending/In-Progress
            const passedApplicants = filteredApplicants.filter(a => 
                a.status === 'ENDORSED' || a.status === 'ENDORSED_OVER' || a.status === 'ENDORSED_OPS' || a.status === 'PASSED'
            );

            const droppedApplicants = filteredApplicants.filter(a => 
                a.status === 'DROPPED' || a.status === 'FAILED'
            );

            const pendingApplicants = filteredApplicants.filter(a => 
                a.status !== 'ENDORSED' && a.status !== 'ENDORSED_OVER' && a.status !== 'ENDORSED_OPS' && 
                a.status !== 'PASSED' && a.status !== 'DROPPED' && a.status !== 'FAILED'
            );

            const totalPassed = passedApplicants.length;
            const totalDropped = droppedApplicants.length;
            const totalPending = pendingApplicants.length;
            const totalEvaluated = filteredApplicants.length; // 188 total screened

            const passRate = totalEvaluated > 0 ? ((totalPassed / totalEvaluated) * 100).toFixed(1) : '0.0';
            const dropRate = totalEvaluated > 0 ? ((totalDropped / totalEvaluated) * 100).toFixed(1) : '0.0';
            const pendingRate = totalEvaluated > 0 ? ((totalPending / totalEvaluated) * 100).toFixed(1) : '0.0';

            const drawHeader = (pageNum: number) => {
                doc.setFillColor(12, 36, 97); // #0c2461
                doc.rect(0, 0, pageWidth, 16, 'F');

                doc.setFillColor(200, 16, 46); // #C8102E
                doc.rect(0, 16, pageWidth, 1.5, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('CHRONICLE RECRUITMENT MANAGEMENT SYSTEM', 14, 10.5);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text('RECRUITER PERFORMANCE & EVALUATION REPORT', pageWidth - 14, 10.5, { align: 'right' });
            };

            const drawFooter = (pageNum: number, totalPages: number) => {
                doc.setDrawColor(237, 235, 233);
                doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(140, 140, 140);
                doc.text(`Confidential — Generated on ${new Date().toLocaleString('en-US')}`, 14, pageHeight - 7);
                doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
            };

            drawHeader(1);
            currentY = 25;

            // Staff Info Section
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(32, 31, 30);
            doc.text(selectedUser.user.full_name, 14, currentY);

            currentY += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(12, 36, 97);
            doc.text(`ROLE: ${selectedUser.user.role.replace('_', ' ').toUpperCase()}   |   SECTOR: ${(selectedUser.user.sector || 'RECRUITMENT').toUpperCase()}`, 14, currentY);

            currentY += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(96, 94, 92);
            const filterPeriodLabel = dateFilter.type === 'ALL'
                ? 'All Time'
                : dateFilter.start && dateFilter.end
                    ? `${dateFilter.start} to ${dateFilter.end}`
                    : dateFilter.type;
            doc.text(`Filter Period: ${filterPeriodLabel}   |   Account Unit: ${accountFilter === 'ALL' ? 'All Units' : accountFilter}`, 14, currentY);

            currentY += 7;

            // KPI Summary Cards Box
            doc.setFillColor(250, 249, 248);
            doc.setDrawColor(237, 235, 233);
            doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'FD');

            const cardWidth = (pageWidth - 28) / 4;

            // Card 1: Total Screened
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(96, 94, 92);
            doc.text('TOTAL SCREENED', 14 + 5, currentY + 6);
            doc.setFontSize(13);
            doc.setTextColor(32, 31, 30);
            doc.text(String(totalEvaluated), 14 + 5, currentY + 15);

            // Card 2: Passed Candidates
            doc.setFontSize(7);
            doc.setTextColor(96, 94, 92);
            doc.text('PASSED CANDIDATES', 14 + cardWidth + 5, currentY + 6);
            doc.setFontSize(13);
            doc.setTextColor(16, 185, 129); // emerald
            doc.text(String(totalPassed), 14 + cardWidth + 5, currentY + 15);

            // Card 3: Dropped / Failed Candidates
            doc.setFontSize(7);
            doc.setTextColor(96, 94, 92);
            doc.text('DROPPED / FAILED', 14 + cardWidth * 2 + 5, currentY + 6);
            doc.setFontSize(13);
            doc.setTextColor(225, 29, 72); // rose
            doc.text(String(totalDropped), 14 + cardWidth * 2 + 5, currentY + 15);

            // Card 4: Pass Rate %
            doc.setFontSize(7);
            doc.setTextColor(96, 94, 92);
            doc.text('ENDORSEMENT YIELD', 14 + cardWidth * 3 + 5, currentY + 6);
            doc.setFontSize(13);
            doc.setTextColor(12, 36, 97); // navy
            doc.text(`${passRate}%`, 14 + cardWidth * 3 + 5, currentY + 15);

            currentY += 26;

            // Passed vs Failed Breakdown Table Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(12, 36, 97);
            doc.text('1. EVALUATION OUTCOME BREAKDOWN', 14, currentY);

            currentY += 4;

            // Draw Breakdown Table
            const breakdownData = [
                { label: 'PASSED CANDIDATES (Initial / Ops Passed)', count: totalPassed, pct: `${passRate}%`, color: [16, 185, 129] },
                { label: 'DROPPED / FAILED CANDIDATES', count: totalDropped, pct: `${dropRate}%`, color: [225, 29, 72] },
                { label: 'PENDING / IN-PROGRESS SCREENING', count: totalPending, pct: `${pendingRate}%`, color: [59, 130, 246] }
            ];

            // Table Header
            doc.setFillColor(243, 242, 241);
            doc.rect(14, currentY, pageWidth - 28, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(50, 49, 48);
            doc.text('OUTCOME CATEGORY', 18, currentY + 4);
            doc.text('CANDIDATE COUNT', 120, currentY + 4);
            doc.text('PERCENTAGE SHARE', pageWidth - 18, currentY + 4, { align: 'right' });

            currentY += 6;

            breakdownData.forEach((row, i) => {
                doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 248);
                doc.rect(14, currentY, pageWidth - 28, 6, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(row.color[0], row.color[1], row.color[2]);
                doc.text(row.label, 18, currentY + 4);

                doc.setFont('helvetica', 'bold');
                doc.text(String(row.count), 120, currentY + 4);
                doc.text(row.pct, pageWidth - 18, currentY + 4, { align: 'right' });

                currentY += 6;
            });

            // Total Summary Line
            doc.setFillColor(237, 235, 233);
            doc.rect(14, currentY, pageWidth - 28, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(32, 31, 30);
            doc.text('TOTAL SCREENED CANDIDATES', 18, currentY + 4);
            doc.text(String(totalEvaluated), 120, currentY + 4);
            doc.text('100.0%', pageWidth - 18, currentY + 4, { align: 'right' });

            currentY += 12;

            const colX = {
                num: 14,
                name: 24,
                status: 75,
                dept: 115,
                pos: 158,
                date: 185
            };

            const drawRosterTableHeader = (y: number, type: 'PASSED' | 'DROPPED' | 'PENDING') => {
                if (type === 'PASSED') {
                    doc.setFillColor(16, 185, 129); // emerald
                } else if (type === 'DROPPED') {
                    doc.setFillColor(225, 29, 72); // rose
                } else {
                    doc.setFillColor(59, 130, 246); // blue
                }
                doc.rect(14, y, pageWidth - 28, 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text('#', colX.num + 2, y + 4.2);
                doc.text('APPLICANT NAME', colX.name, y + 4.2);
                doc.text('VERDICT / STATUS', colX.status, y + 4.2);
                doc.text('DEPARTMENT / PROGRAM', colX.dept, y + 4.2);
                doc.text('ASSIGNED POSITION', colX.pos, y + 4.2);
                doc.text('DATE', colX.date, y + 4.2);
            };

            let totalPages = 1;

            // ════════════ SECTION 2A: PASSED CANDIDATES ════════════
            if (currentY > pageHeight - 35) {
                doc.addPage();
                totalPages++;
                drawHeader(totalPages);
                currentY = 24;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(16, 185, 129);
            doc.text(`2A. PASSED CANDIDATES ROSTER (TOTAL: ${totalPassed})`, 14, currentY);

            currentY += 4;
            drawRosterTableHeader(currentY, 'PASSED');
            currentY += 6;

            passedApplicants.forEach((app, idx) => {
                if (currentY > pageHeight - 20) {
                    doc.addPage();
                    totalPages++;
                    drawHeader(totalPages);
                    currentY = 24;
                    drawRosterTableHeader(currentY, 'PASSED');
                    currentY += 6;
                }

                doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 248);
                doc.rect(14, currentY, pageWidth - 28, 5.5, 'F');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(120, 120, 120);
                doc.text(String(idx + 1), colX.num + 2, currentY + 3.8);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(32, 31, 30);
                doc.text(app.name.length > 25 ? app.name.slice(0, 25) + '...' : app.name, colX.name, currentY + 3.8);

                const statusText = app.status === 'ENDORSED_OVER' ? 'INITIAL PASSED' : app.status === 'ENDORSED_OPS' ? 'ENDORSED (OPS)' : app.status;
                doc.setTextColor(16, 185, 129);
                doc.text(statusText.length > 18 ? statusText.slice(0, 18) + '...' : statusText, colX.status, currentY + 3.8);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(96, 94, 92);
                const deptStr = app.department || 'N/A';
                doc.text(deptStr.length > 20 ? deptStr.slice(0, 20) + '...' : deptStr, colX.dept, currentY + 3.8);

                const posStr = app.jobTitle || 'N/A';
                doc.text(posStr.length > 14 ? posStr.slice(0, 14) + '...' : posStr, colX.pos, currentY + 3.8);

                const dateStr = app.lastActionAt ? new Date(app.lastActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                doc.text(dateStr, colX.date, currentY + 3.8);

                currentY += 5.5;
            });

            currentY += 10;

            // ════════════ SECTION 2B: DROPPED / FAILED CANDIDATES ════════════
            if (currentY > pageHeight - 35) {
                doc.addPage();
                totalPages++;
                drawHeader(totalPages);
                currentY = 24;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(225, 29, 72);
            doc.text(`2B. DROPPED / FAILED CANDIDATES ROSTER (TOTAL: ${totalDropped})`, 14, currentY);

            currentY += 4;
            drawRosterTableHeader(currentY, 'DROPPED');
            currentY += 6;

            droppedApplicants.forEach((app, idx) => {
                if (currentY > pageHeight - 20) {
                    doc.addPage();
                    totalPages++;
                    drawHeader(totalPages);
                    currentY = 24;
                    drawRosterTableHeader(currentY, 'DROPPED');
                    currentY += 6;
                }

                doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 248);
                doc.rect(14, currentY, pageWidth - 28, 5.5, 'F');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(120, 120, 120);
                doc.text(String(idx + 1), colX.num + 2, currentY + 3.8);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(32, 31, 30);
                doc.text(app.name.length > 25 ? app.name.slice(0, 25) + '...' : app.name, colX.name, currentY + 3.8);

                doc.setTextColor(225, 29, 72);
                doc.text(app.status.length > 18 ? app.status.slice(0, 18) + '...' : app.status, colX.status, currentY + 3.8);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(96, 94, 92);
                const deptStr = app.department || 'N/A';
                doc.text(deptStr.length > 20 ? deptStr.slice(0, 20) + '...' : deptStr, colX.dept, currentY + 3.8);

                const posStr = app.jobTitle || 'N/A';
                doc.text(posStr.length > 14 ? posStr.slice(0, 14) + '...' : posStr, colX.pos, currentY + 3.8);

                const dateStr = app.lastActionAt ? new Date(app.lastActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                doc.text(dateStr, colX.date, currentY + 3.8);

                currentY += 5.5;
            });

            // ════════════ SECTION 2C: PENDING / IN-PROGRESS CANDIDATES ════════════
            if (pendingApplicants.length > 0) {
                currentY += 10;

                if (currentY > pageHeight - 35) {
                    doc.addPage();
                    totalPages++;
                    drawHeader(totalPages);
                    currentY = 24;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(59, 130, 246);
                doc.text(`2C. PENDING / IN-PROGRESS SCREENING ROSTER (TOTAL: ${totalPending})`, 14, currentY);

                currentY += 4;
                drawRosterTableHeader(currentY, 'PENDING');
                currentY += 6;

                pendingApplicants.forEach((app, idx) => {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        totalPages++;
                        drawHeader(totalPages);
                        currentY = 24;
                        drawRosterTableHeader(currentY, 'PENDING');
                        currentY += 6;
                    }

                    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 249, idx % 2 === 0 ? 255 : 248);
                    doc.rect(14, currentY, pageWidth - 28, 5.5, 'F');

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(120, 120, 120);
                    doc.text(String(idx + 1), colX.num + 2, currentY + 3.8);

                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(32, 31, 30);
                    doc.text(app.name.length > 25 ? app.name.slice(0, 25) + '...' : app.name, colX.name, currentY + 3.8);

                    doc.setTextColor(59, 130, 246);
                    doc.text(app.status.length > 18 ? app.status.slice(0, 18) + '...' : app.status, colX.status, currentY + 3.8);

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(96, 94, 92);
                    const deptStr = app.department || 'N/A';
                    doc.text(deptStr.length > 20 ? deptStr.slice(0, 20) + '...' : deptStr, colX.dept, currentY + 3.8);

                    const posStr = app.jobTitle || 'N/A';
                    doc.text(posStr.length > 14 ? posStr.slice(0, 14) + '...' : posStr, colX.pos, currentY + 3.8);

                    const dateStr = app.lastActionAt ? new Date(app.lastActionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                    doc.text(dateStr, colX.date, currentY + 3.8);

                    currentY += 5.5;
                });
            }

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                drawFooter(i, totalPages);
            }

            const safeFileName = selectedUser.user.full_name.replace(/[^a-zA-Z0-9]/g, '_');
            doc.save(`Recruiter_Evaluation_Report_${safeFileName}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('Failed to export PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    if (!selectedUser) return null;

    const isOps = selectedUser.user.role === 'ops_validator';

    const coverGradient = isOps
        ? "bg-gradient-to-r from-blue-500 to-cyan-500"
        : "bg-gradient-to-r from-indigo-500 to-purple-600";

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 lg:p-8 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface-50 w-full max-w-6xl h-[90vh] rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-black/5 text-left">
                
                {/* Header Container */}
                <div className="bg-white dark:bg-slate-900 px-8 py-6 shrink-0 relative flex flex-col gap-6 border-b border-[#edebe9] dark:border-slate-800">
                    <div className="flex items-start justify-between">
                        {/* Profile Info */}
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-[#f3f2f1] border border-[#edebe9] dark:border-slate-800 flex items-center justify-center font-semibold text-xl text-[#323130] dark:text-slate-300 overflow-hidden shrink-0">
                                {selectedUser.user.avatar_data ? (
                                    <img src={selectedUser.user.avatar_data} alt={selectedUser.user.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    selectedUser.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                )}
                            </div>
                            <div>
                                <h2 className="text-[22px] font-semibold text-[#201f1e] dark:text-slate-200 tracking-[-0.01em] leading-tight capitalize">
                                    {selectedUser.user.full_name}
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] uppercase rounded-none bg-[#0c2461]/5 text-[#0c2461] border border-[#0c2461]/10">
                                        <Users size={11} /> {selectedUser.user.role.replace('_', ' ')}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-medium tracking-[-0.005em] uppercase rounded-none bg-[#faf9f8] text-[#605e5c] dark:text-slate-400 border border-[#edebe9] dark:border-slate-800">
                                        {selectedUser.user.sector}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 relative z-[60]">
                            <AdvancedDateFilter 
                                value={dateFilter} 
                                onChange={setDateFilter}
                                variant="horizontal"
                            />
                            <div className="relative">
                                <select
                                    value={accountFilter}
                                    onChange={(e) => setAccountFilter(e.target.value)}
                                    className="appearance-none bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:bg-[#faf9f8] text-[#323130] dark:text-slate-300 rounded-none h-[36px] pl-3 pr-9 text-[12.5px] font-medium tracking-[-0.005em] cursor-pointer focus:outline-none focus:border-[#0c2461] transition-all w-[180px]"
                                >
                                    <option value="ALL">All units</option>
                                    {uniqueAccounts.map(acc => (
                                        <option key={acc} value={acc}>{acc}</option>
                                    ))}
                                </select>
                                <Building2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a19f9d] pointer-events-none" />
                            </div>
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="h-[36px] px-3.5 flex items-center gap-2 bg-[#0c2461] hover:bg-[#081a46] active:scale-[0.98] text-white rounded-none transition-all shadow-sm text-[12px] font-semibold tracking-[-0.005em] cursor-pointer disabled:opacity-50"
                                title="Export PDF Performance & Candidate Report"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileDown size={14} />
                                        <span>Export PDF</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-[36px] h-[36px] flex items-center justify-center bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 hover:bg-[#f3f2f1] text-[#323130] dark:text-slate-300 rounded-none transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 flex flex-col min-h-0">

                    {/* Performance Cards Banner */}
                    <div className={cn(
                        "px-6 pt-6 grid gap-3",
                        isOps ? "grid-cols-4" : "grid-cols-5"
                    )}>
                        {(isOps ? [
                            { id: 'TOTAL', label: 'Queue pending', value: filteredCounts.interviewedCount, icon: Clock, color: 'text-[#323130] dark:text-slate-300', activeRing: 'ring-[#323130]' },
                            { id: 'PASSED', label: 'Passed action', value: filteredCounts.endorsedCount, icon: UserCheck, color: 'text-emerald-700', activeRing: 'ring-emerald-600' },
                            { id: 'FAILED', label: 'Failed action', value: filteredCounts.failedCount, icon: AlertCircle, color: 'text-rose-700', activeRing: 'ring-rose-600' },
                            { id: 'ALL', label: 'Endorsement yield', value: `${filteredCounts.endorsementYield}%`, icon: BarChart3, color: 'text-[#0c2461]', activeRing: 'ring-transparent' }
                        ] : [
                            { id: 'TOTAL', label: 'Total screened', value: filteredCounts.interviewedCount, icon: Clock, color: 'text-[#323130] dark:text-slate-300', activeRing: 'ring-[#323130]' },
                            { id: 'ENDORSED_OVER', label: 'Init. Passed', value: filteredCounts.endorsedOverCount, icon: UserCheck, color: 'text-teal-700', activeRing: 'ring-teal-600' },
                            { id: 'ENDORSED_OPS', label: 'End. (Ops)', value: filteredCounts.endorsedOpsCount, icon: UserCheck, color: 'text-indigo-700', activeRing: 'ring-indigo-600' },
                            { id: 'DROPPED', label: 'Failed', value: filteredCounts.failedCount, icon: AlertCircle, color: 'text-rose-700', activeRing: 'ring-rose-600' },
                            { id: 'NO_SHOW', label: 'No Show', value: filteredCounts.noShowCount, icon: UserX, color: 'text-amber-700', activeRing: 'ring-amber-600' },
                            { id: 'ALL', label: 'Endorsement yield', value: `${filteredCounts.endorsementYield}%`, icon: BarChart3, color: 'text-[#0c2461]', activeRing: 'ring-transparent' }
                        ]).map((s, i) => (
                            <button
                                key={i}
                                onClick={() => s.id !== 'ALL' && setModalStatFilter(modalStatFilter === s.id ? 'ALL' : (s.id as any))}
                                className={cn(
                                    'px-4 py-3.5 bg-white dark:bg-slate-900 rounded-none flex flex-col justify-between transition-all duration-200 h-[84px] relative text-left outline-none',
                                    s.id === 'ALL' ? 'border border-[#edebe9] dark:border-slate-800 bg-[#faf9f8]' : 'border border-[#edebe9] dark:border-slate-800 hover:bg-[#faf9f8] cursor-pointer shadow-sm',
                                    modalStatFilter === s.id && s.id !== 'ALL' && `ring-1 ${s.activeRing} border-transparent shadow-sm bg-white dark:bg-slate-900`
                                )}
                            >
                                <p className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">{s.label}</p>
                                <div className="flex items-end justify-between mt-auto">
                                    <h4 className={cn('text-[24px] font-semibold leading-none tracking-tight tabular-nums truncate', s.color)}>
                                        {s.value}
                                    </h4>
                                    <s.icon size={16} className={cn('opacity-40 shrink-0 mb-0.5', s.color)} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Section Selector Tabs */}
                    <div className="px-6 pt-8 space-y-6 flex-1 flex flex-col min-h-0 text-left">
                        <div className="flex items-center justify-between border-b border-[#edebe9] dark:border-slate-800 px-2">
                            <div className="flex gap-8">
                                {([
                                    { id: 'applicants', label: isOps ? 'All pending' : 'All interviewed', icon: Users, count: filteredCounts.interviewedCount },
                                    { id: 'endorsed', label: isOps ? 'Passed candidates' : 'Passed Candidates in Initial', icon: UserCheck, count: isOps ? filteredCounts.endorsedCount : (filteredCounts.endorsedOverCount + filteredCounts.endorsedOpsCount) },
                                    { id: 'failed', label: 'Failed', icon: XCircle, count: filteredCounts.failedCount + filteredCounts.noShowCount },
                                    { id: 'logs', label: 'Live system log', icon: Activity, count: undefined }
                                ] as const).map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setModalTab(t.id);
                                            if (t.id === 'endorsed') setModalStatFilter('ALL');
                                            else if (t.id === 'failed') setModalStatFilter(isOps ? 'FAILED' : 'DROPPED');
                                            else if (t.id === 'applicants') setModalStatFilter('ALL');
                                        }}
                                        className={cn(
                                            'pb-3 text-[12.5px] font-semibold tracking-[-0.005em] flex items-center gap-1.5 transition-all relative duration-200 outline-none',
                                            modalTab === t.id ? 'text-[#0c2461]' : 'text-[#605e5c] dark:text-slate-400 hover:text-[#323130] dark:text-slate-300'
                                        )}
                                    >
                                        <t.icon size={14} className={modalTab === t.id ? "text-[#0c2461]" : "text-[#a19f9d]"} />
                                        <span>{t.label}</span>
                                        {t.count !== undefined && (
                                            <span className={cn(
                                                "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none",
                                                modalTab === t.id ? "bg-[#0c2461] text-white" : "bg-[#f3f2f1] text-[#605e5c] dark:text-slate-400"
                                            )}>
                                                {t.count}
                                            </span>
                                        )}
                                        {modalTab === t.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0c2461] rounded-none-t-sm" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Content Container */}
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-6">
                            {(modalTab === 'applicants' || modalTab === 'endorsed' || modalTab === 'failed') ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="bg-white dark:bg-slate-900 overflow-hidden flex-1 overflow-y-auto custom-scrollbar border-x border-[#edebe9] dark:border-slate-800">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20">
                                                <tr className="bg-[#faf9f8] border-y border-[#edebe9] dark:border-slate-800">
                                                    <th className="pl-6 pr-2 py-3.5 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] w-[50px]">#</th>
                                                    <th className="px-4 py-3.5 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">Applicant name</th>
                                                    <th className="px-4 py-3.5 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">Department / program</th>
                                                    <th className="px-4 py-3.5 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">Assigned position</th>
                                                    <th className="px-6 py-3.5 text-[11px] font-semibold text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] text-right">Actions / timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#f3f2f1]">
                                                {filteredApplicants
                                                    .filter(app => {
                                                        if (modalTab === 'endorsed') {
                                                            return isOps ? app.status === 'PASSED' : ['ENDORSED', 'ENDORSED_OVER', 'ENDORSED_OPS'].includes(app.status);
                                                        }
                                                        if (modalTab === 'failed') return isOps ? app.status === 'FAILED' : (app.status === 'DROPPED' || app.status === 'NO_SHOW');
                                                        return modalStatFilter === 'ALL' || modalStatFilter === 'TOTAL' || app.status === modalStatFilter;
                                                    })
                                                    .map((app, index) => (
                                                        <tr 
                                                            key={app.id} 
                                                            onClick={() => window.open(`/recruiter/applicant-management/${app.id}`, '_blank')}
                                                            className="hover:bg-[#faf9f8] transition-colors cursor-pointer group"
                                                        >
                                                            <td className="pl-6 pr-2 py-4">
                                                                <span className="text-[12px] font-semibold text-[#a19f9d] tabular-nums">{index + 1}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <p className="text-[13px] font-semibold text-[#201f1e] dark:text-slate-200 group-hover:text-[#0c2461] transition-colors duration-200 tracking-[-0.005em]">{app.name}</p>
                                                                <div className="flex gap-1.5 mt-1.5">
                                                                    <span className={cn(
                                                                        'px-2 py-0.5 text-[10px] font-medium border rounded-none-[4px] tracking-[-0.005em]',
                                                                        (app.status === 'ENDORSED' || app.status === 'ENDORSED_OVER' || app.status === 'ENDORSED_OPS' || app.status === 'PASSED') ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                                                            (app.status === 'DROPPED' || app.status === 'FAILED') ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                                                                                (app.status === 'H2R INACTIVE' || app.status === 'H2R_INACTIVE') ? 'bg-zinc-100 text-zinc-700 border-zinc-300' :
                                                                                    'bg-blue-50 text-blue-700 border-blue-200/60'
                                                                    )}>
                                                                        {app.status === 'ENDORSED_OVER' ? 'INITIAL PASSED' : app.status === 'ENDORSED_OPS' ? 'ENDORSED (OPS)' : app.status === 'SCREENED' ? 'SCREENED' : app.status}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 text-[#605e5c] dark:text-slate-400 text-[11px] font-medium tracking-[-0.005em] rounded-none-[4px] border border-[#edebe9] dark:border-slate-800">
                                                                    <Building2 size={11} className="text-[#a19f9d]" />
                                                                    {app.department}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Briefcase size={14} className="text-[#a19f9d]" />
                                                                    <span className="text-[12.5px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em]">{app.jobTitle}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {isOps && app.status === 'PENDING' ? (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateApplicantStatus?.(app.id, 'PASSED');
                                                                            }}
                                                                            className="px-3 h-[30px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11.5px] font-medium tracking-[-0.005em] rounded-none active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                                                                        >
                                                                            <Check size={12} /> Pass
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateApplicantStatus?.(app.id, 'FAILED');
                                                                            }}
                                                                            className="px-3 h-[30px] bg-rose-600 hover:bg-rose-700 text-white text-[11.5px] font-medium tracking-[-0.005em] rounded-none active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                                                                        >
                                                                            <XIcon size={12} /> Fail
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[12.5px] font-semibold text-[#201f1e] dark:text-slate-200 tracking-[-0.005em] tabular-nums">{formatDateTime(app.lastActionAt).split(',')[0]}</p>
                                                                        <p className="text-[11px] font-medium text-[#605e5c] dark:text-slate-400 tracking-[-0.005em] tabular-nums">{new Date(app.lastActionAt).getFullYear()}</p>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-[#edebe9] dark:border-slate-800 rounded-none p-6 overflow-y-auto custom-scrollbar">
                                    <div className="space-y-0 border-l-2 border-[#f3f2f1] ml-3">
                                        {selectedUser.recentActivity
                                            .filter(log => {
                                                if (dateFilter.type !== 'ALL' && dateFilter.start && dateFilter.end) {
                                                    const logDate = new Date(log.changed_at);
                                                    if (isNaN(logDate.getTime())) return false;

                                                    const [startY, startM, startD] = dateFilter.start.split('-').map(Number);
                                                    const [endY, endM, endD] = dateFilter.end.split('-').map(Number);

                                                    const startDate = new Date(startY, startM - 1, startD, 0, 0, 0, 0);
                                                    const endDate = new Date(endY, endM - 1, endD, 23, 59, 59, 999);

                                                    if (logDate < startDate || logDate > endDate) {
                                                        return false;
                                                    }
                                                }
                                                return true;
                                            })
                                            .map((log, idx) => (
                                                <div key={log.id} className="relative pl-8 pb-8 last:pb-2 group">
                                                    <div className={cn(
                                                        'absolute left-[-7px] top-1.5 w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 transition-transform group-hover:scale-125 duration-200',
                                                        idx === 0 ? 'border-[#0c2461] bg-[#0c2461]/10 ring-4 ring-[#0c2461]/20' : 'border-[#d2d0ce]'
                                                    )} />
                                                    <p className={cn(
                                                        'text-[13.5px] font-semibold leading-none tracking-[-0.005em]',
                                                        idx === 0 ? 'text-[#0c2461]' : 'text-[#201f1e] dark:text-slate-200'
                                                    )}>
                                                        {log.to_status.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[12px] text-[#605e5c] dark:text-slate-400 font-normal mt-1.5 tracking-[-0.005em]">
                                                        Action initiated by <span className="font-semibold text-[#201f1e] dark:text-slate-200">{log.changed_by_name}</span>
                                                        {log.change_reason && <span className="block mt-2 bg-[#faf9f8] border border-[#edebe9] dark:border-slate-800 p-2.5 rounded-none italic text-[11.5px] text-[#605e5c] dark:text-slate-400">&ldquo;{log.change_reason}&rdquo;</span>}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mt-3">
                                                        <p className="text-[11px] font-semibold text-[#0c2461] tracking-[-0.005em] flex items-center gap-1.5 bg-[#0c2461]/5 px-2 py-0.5 rounded-none border border-[#0c2461]/10">
                                                            <Calendar size={11} /> {new Date(log.changed_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-emerald-600 tracking-[-0.005em] flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-100">
                                                            <Clock size={11} /> {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <span className="text-[11px] font-normal text-[#a19f9d] tracking-[-0.005em] italic">
                                                            ({timeAgo(log.changed_at)})
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
