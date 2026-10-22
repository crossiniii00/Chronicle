import React, { useState, useRef } from 'react';
import { Download, FileImage, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import type { Application } from '@/types/application';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStatusLabel } from '@/utils/formatters';
import * as XLSX from 'xlsx-js-style';

interface TableExportMenuProps {
    filteredList: Application[];
    activeTab: string;
}

export function TableExportMenu({ filteredList, activeTab }: TableExportMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const hiddenTableRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getContactInfo = (app: Application) => {
        const email = app.pis?.email || app.metadata?.email || '';
        const phone = app.pis?.phone || app.metadata?.phone || '';
        if (email && phone) return `${email} | ${phone}`;
        if (email) return email;
        if (phone) return phone;
        return 'N/A';
    };

    const getHtmlStatusColors = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('hired') || s.includes('passed') || s.includes('accepted')) return { bg: "#dcfce7", text: "#166534" }; // green
        if (s.includes('failed') || s.includes('rejected')) return { bg: "#fee2e2", text: "#991b1b" }; // red
        if (s.includes('withdrawn')) return { bg: "#f1f5f9", text: "#475569" }; // slate
        if (s.includes('queue') || s.includes('wait') || s.includes('pending')) return { bg: "#fef3c7", text: "#92400e" }; // amber
        return { bg: "#f3f4f6", text: "#374151" }; // default gray
    };

    const handleExportExcel = () => {
        setIsExporting(true);
        setTimeout(() => {
            const headers = [
                'Candidate Name', 
                'Email',
                'Phone Number',
                'Special Status', 
                'Assigned', 
                'Initial Recruiter', 
                'Position', 
                'Type', 
                'Typing Speed & Accuracy', 
                'Assessment Score', 
                'Status', 
                'Mode', 
                'Applied Date', 
                'Ops Val Interview', 
                'Training Start Date'
            ];
            
            const rows = filteredList.map(app => [
                app.applicant_name || '',
                app.pis?.email || app.metadata?.email || '-',
                app.pis?.phone || app.metadata?.phone || '-',
                app.pis?.final_specific_status || app.metadata?.final_specific_status || '',
                app.assigned_ops_validator_name || app.assigned_recruiter_name || 'Unassigned',
                app.metadata?.initial_recruiter_name || app.pis?.initial_recruiter_name || '',
                app.position_title || 'Unassigned',
                (app.hiring_type || app.pis?.hire_type || 'EXTERNAL').toUpperCase(),
                [
                    app.typing_test_wpm !== undefined && app.typing_test_wpm !== null ? `${app.typing_test_wpm} wpm` : '',
                    app.typing_test_accuracy !== undefined && app.typing_test_accuracy !== null ? `${app.typing_test_accuracy}% acc` : ''
                ].filter(Boolean).join(' | '),
                app.assessment_score !== undefined && app.assessment_score !== null ? `${app.assessment_score}%` : '',
                getStatusLabel(app.current_status),
                String(app.pis?.interview_mode || app.metadata?.interview_mode || 'ON-SITE').toUpperCase(),
                new Date(app.applied_at || app.created_at || Date.now()).toLocaleDateString(),
                app.metadata?.ops_val_interview_date || app.endorsement_meeting_date || app.pis?.endorsement_meeting_date ? new Date(app.metadata?.ops_val_interview_date || app.endorsement_meeting_date || app.pis?.endorsement_meeting_date).toLocaleDateString() : '',
                app.master_training_start_date || app.metadata?.training_start_date || app.pis?.training_start_date || ''
            ]);
            
            const exportData = [headers, ...rows];
            const worksheet = XLSX.utils.aoa_to_sheet(exportData);
            
            // Set proper column widths to avoid cramped text
            worksheet['!cols'] = [
                { wch: 30 }, // Candidate Name
                { wch: 30 }, // Email
                { wch: 20 }, // Phone Number
                { wch: 25 }, // Special Status
                { wch: 25 }, // Assigned
                { wch: 25 }, // Initial Recruiter
                { wch: 30 }, // Position
                { wch: 15 }, // Type
                { wch: 25 }, // Typing Speed & Accuracy
                { wch: 20 }, // Assessment Score
                { wch: 25 }, // Status
                { wch: 15 }, // Mode
                { wch: 15 }, // Applied Date
                { wch: 20 }, // Ops Val Interview
                { wch: 20 }, // Training Start Date
            ];
            
            const getStatusColors = (status: string) => {
                const s = status.toLowerCase();
                if (s.includes('hired') || s.includes('passed') || s.includes('accepted')) return { bg: "dcfce7", text: "166534" }; // green
                if (s.includes('failed') || s.includes('rejected')) return { bg: "fee2e2", text: "991b1b" }; // red
                if (s.includes('withdrawn')) return { bg: "f1f5f9", text: "475569" }; // slate
                if (s.includes('queue') || s.includes('wait') || s.includes('pending')) return { bg: "fef3c7", text: "92400e" }; // amber
                return { bg: "f3f4f6", text: "374151" }; // default gray
            };

            const getTypeColors = (type: string) => {
                return type.includes('INTERNAL') ? { bg: "e0e7ff", text: "3730a3" } : { bg: "dbeafe", text: "1e40af" };
            };
            
            // Add styling to the header row and cells
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:O1');
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!worksheet[cellRef]) continue;

                    if (R === 0) {
                        // Header styling
                        worksheet[cellRef].s = {
                            font: { bold: true, color: { rgb: "FFFFFF" } },
                            fill: { fgColor: { rgb: "002D5C" } },
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    } else {
                        // Color coding for Type (Column H, index 7) and Status (Column K, index 10)
                        if (C === 7) {
                            const colors = getTypeColors(String(worksheet[cellRef].v || ''));
                            worksheet[cellRef].s = {
                                font: { bold: true, color: { rgb: colors.text } },
                                fill: { fgColor: { rgb: colors.bg } },
                                alignment: { horizontal: "center" }
                            };
                        } else if (C === 10) {
                            const colors = getStatusColors(String(worksheet[cellRef].v || ''));
                            worksheet[cellRef].s = {
                                font: { bold: true, color: { rgb: colors.text } },
                                fill: { fgColor: { rgb: colors.bg } },
                                alignment: { horizontal: "center" }
                            };
                        }
                    }
                }
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
            
            XLSX.writeFile(workbook, `candidates_export_${activeTab}_${new Date().getTime()}.xlsx`);
            
            setIsExporting(false);
            setIsOpen(false);
        }, 100);
    };

    const captureHiddenTable = async (format: 'pdf' | 'img') => {
        if (!hiddenTableRef.current || filteredList.length === 0) return;
        setIsExporting(true);
        setIsOpen(false);
        try {
            hiddenTableRef.current.style.display = 'block';
            
            const canvas = await html2canvas(hiddenTableRef.current, { scale: 1.5, useCORS: true, logging: false });
            hiddenTableRef.current.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');

            if (format === 'img') {
                const link = document.createElement('a');
                link.download = `candidates_export_${activeTab}_${new Date().getTime()}.png`;
                link.href = imgData;
                link.click();
            } else {
                const pdf = new jsPDF({
                    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`candidates_export_${activeTab}_${new Date().getTime()}.pdf`);
            }
        } catch (error) {
            console.error('Export failed:', error);
            if (hiddenTableRef.current) hiddenTableRef.current.style.display = 'none';
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting || filteredList.length === 0}
                className="flex items-center gap-1.5 px-2 py-1 ml-2 bg-surface-100 hover:bg-surface-200 text-surface-600 hover:text-surface-900 text-[9px] font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
            >
                {isExporting ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                Export
                <ChevronDown size={10} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-sm shadow-xl border border-surface-200 z-50 overflow-hidden py-1">
                    <button onClick={() => captureHiddenTable('img')} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-surface-700 hover:bg-surface-50 text-left">
                        <FileImage size={12} className="text-blue-500" /> Image (PNG)
                    </button>
                    <button onClick={() => captureHiddenTable('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-surface-700 hover:bg-surface-50 text-left">
                        <FileText size={12} className="text-red-500" /> Document (PDF)
                    </button>
                    <button onClick={handleExportExcel} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-surface-700 hover:bg-surface-50 text-left">
                        <FileSpreadsheet size={12} className="text-emerald-600" /> Excel (.xlsx)
                    </button>
                </div>
            )}

            {/* Hidden Table for Canvas Capture */}
            <div 
                ref={hiddenTableRef} 
                style={{ 
                    display: 'none', 
                    position: 'absolute', 
                    top: '-9999px', 
                    left: '-9999px', 
                    width: '1800px', 
                    backgroundColor: 'white', 
                    padding: '24px', 
                    fontFamily: 'Inter, Arial, sans-serif',
                    color: '#0f172a'
                }}
            >
                <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '16px', color: '#002D5C', borderBottom: '2px solid #C8102E', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Candidate Export - {activeTab.replace(/_/g, ' ')} ({filteredList.length} Records)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Candidate</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Email</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Phone Number</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Special Status</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Assigned</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Initial Recruiter</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Position</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Type</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Typing Speed & Acc</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Assessment Score</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Mode</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Applied Date</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Ops Val Interview</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#002D5C', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>Training Start Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.slice(0, 500).map((app, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                <td style={{ padding: '8px 10px', fontWeight: '700' }}>{app.applicant_name}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.pis?.email || app.metadata?.email || '-'}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.pis?.phone || app.metadata?.phone || '-'}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.pis?.final_specific_status || app.metadata?.final_specific_status || '-'}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.assigned_ops_validator_name || app.assigned_recruiter_name || '-'}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.metadata?.initial_recruiter_name || app.pis?.initial_recruiter_name || '-'}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.position_title || 'Unassigned'}</td>
                                <td style={{ padding: '8px 10px' }}>
                                    {(() => {
                                        const type = (app.hiring_type || app.pis?.hire_type || 'EXTERNAL').toUpperCase();
                                        const bg = type.includes('INTERNAL') ? '#e0e7ff' : '#dbeafe';
                                        const color = type.includes('INTERNAL') ? '#3730a3' : '#1e40af';
                                        return (
                                            <span style={{ backgroundColor: bg, color, padding: '3px 8px', borderRadius: '3px', fontSize: '9px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                                {type}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>
                                    {[
                                        app.typing_test_wpm !== undefined && app.typing_test_wpm !== null ? `${app.typing_test_wpm} wpm` : '',
                                        app.typing_test_accuracy !== undefined && app.typing_test_accuracy !== null ? `${app.typing_test_accuracy}% acc` : ''
                                    ].filter(Boolean).join(' | ') || '-'}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.assessment_score !== undefined && app.assessment_score !== null ? `${app.assessment_score}%` : '-'}</td>
                                <td style={{ padding: '8px 10px' }}>
                                    {(() => {
                                        const statusLabel = getStatusLabel(app.current_status);
                                        const colors = getHtmlStatusColors(statusLabel);
                                        return (
                                            <span style={{ backgroundColor: colors.bg, color: colors.text, padding: '3px 8px', borderRadius: '3px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                                {statusLabel}
                                            </span>
                                        );
                                    })()}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155', textTransform: 'uppercase', fontSize: '9px', fontWeight: '800' }}>
                                    {String(app.pis?.interview_mode || app.metadata?.interview_mode || 'ON-SITE').toUpperCase()}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{new Date(app.applied_at || app.created_at || Date.now()).toLocaleDateString()}</td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>
                                    {app.metadata?.ops_val_interview_date || app.endorsement_meeting_date || app.pis?.endorsement_meeting_date 
                                        ? new Date(app.metadata?.ops_val_interview_date || app.endorsement_meeting_date || app.pis?.endorsement_meeting_date).toLocaleDateString() 
                                        : '-'}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>{app.master_training_start_date || app.metadata?.training_start_date || app.pis?.training_start_date || '-'}</td>
                            </tr>
                        ))}
                        {filteredList.length > 500 && (
                            <tr>
                                <td colSpan={15} style={{ padding: '16px', textAlign: 'center', fontStyle: 'italic', color: '#64748b', fontWeight: '600' }}>
                                    ... and {filteredList.length - 500} more candidates. Export to EXCEL (.xlsx) to view all records.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
