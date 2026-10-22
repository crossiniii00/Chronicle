import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import Papa from 'papaparse';
import { ApplicationService } from '@/services/ApplicationService';
import type { Application, ApplicationStatus } from '@/types/application';
import { SPECIFIC_STATUS_TO_OVERALL, normalizeStatus } from '../utils/statusMappings';

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

interface ImportProps {
    applications: Application[];
    activeTab: string;
    success: (title: string, message: string) => void;
    error: (title: string, message: string) => void;
    loadData: () => Promise<void>;
    setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useInterviewImport({
    applications,
    activeTab,
    success,
    error,
    loadData,
    setIsSaving
}: ImportProps) {
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const handleImportCSV = async (file: File) => {
        console.log('[Import] Starting file read:', file.name);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                
                const results = Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: 'greedy',
                    transformHeader: (h: string) => h.trim()
                });

                const rawJson = results.data as any[];
                console.log(`[Import] CSV Parsing Complete. Records found:`, rawJson.length);

                if (rawJson.length === 0) {
                    error('Import Error', 'The file appears to be empty.');
                    return;
                }

                const records = rawJson.map((row, index) => {
                    try {
                        const rowKeys = Object.keys(row);
                        const find = (variants: string[]) => {
                            const normalizedVariants = variants.map(v => v.toLowerCase().trim());
                            
                            for (const variant of normalizedVariants) {
                                const exactKey = rowKeys.find(k => k.toLowerCase().trim() === variant);
                                if (exactKey) return row[exactKey];
                            }

                            for (const variant of normalizedVariants) {
                                const fuzzyKey = rowKeys.find(k => {
                                    const nk = k.toLowerCase().trim();
                                    const isIdColumn = nk.includes('id') || nk.includes('no.') || nk.includes('#') || nk === 'no';
                                    const isLongQuestion = nk.length > 35 || nk.includes('?');
                                    
                                    if (variant.length < 20 && isLongQuestion && !variant.includes('?')) {
                                        return false;
                                    }

                                    const genericTerms = ['status', 'name', 'date', 'id', 'account', 'role'];
                                    const isGenericVariant = genericTerms.includes(variant);
                                    
                                    if (isGenericVariant) {
                                        return nk === variant || nk.startsWith(`${variant} `) || nk.endsWith(` ${variant}`);
                                    }

                                    const match = nk.includes(variant);
                                    
                                    if (isIdColumn && !variant.includes('id') && !variant.includes('no') && !variant.includes('#')) {
                                        return false;
                                    }
                                    return match;
                                });
                                if (fuzzyKey) {
                                    const val = row[fuzzyKey];
                                    const isNull = val === null || val === undefined || (typeof val === 'string' && (
                                        val.trim() === '' || 
                                        val.trim() === '---' || 
                                        val.trim().toLowerCase() === 'n/a' || 
                                        val.trim().toLowerCase() === 'none'
                                    ));
                                    return isNull ? null : val;
                                }
                            }
                            
                            return null;
                        };

                        const healDate = (val: any, toIso = true) => {
                            if (!val || val === 'N/A' || String(val).trim() === '') return null;
                            try {
                                let d: Date;
                                if (!isNaN(val) && !isNaN(parseFloat(val)) && Number(val) > 10000) {
                                    const serial = parseFloat(val);
                                    d = new Date(Math.round((serial - 25569) * 86400 * 1000));
                                } else {
                                    d = new Date(val);
                                }
                                
                                if (!isNaN(d.getTime())) {
                                    return toIso ? d.toISOString() : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                                }
                                return null;
                            } catch { return null; }
                        };

                        const formatImportDate = (val: any, fallback: any = null) => {
                            const healed = healDate(val, true);
                            return healed || fallback;
                        };

                        const candidateName = find([
                            'Candidate\'s Complete Name (First, Middle and Last Name)', 
                            'Candidate\'s Complete Name', 
                            'Applicant Name', 'Full Name', 'Candidate Name', 'Candidate', 'Applicant'
                        ]);
                        const genericName = find(['Name']);
                        
                        const applicantName = candidateName || genericName;
                        const email = find(['Email', 'Applicant Email', 'Personal Email Address', 'Email Address', 'Primary Email', 'EmailAddress', 'Mail']);
                        
                        if (!applicantName && !email) return null;

                        const interviewerName = candidateName ? genericName : find(['Interviewer', 'Recruiter', 'Assigned To', 'Owner']);
                        const emailVal = String(email || '');
                        const eid = find(['EID', 'Employee ID', 'ID Number', 'EmployeeNo', 'Staff ID', 'EmpID']);
                        const hrid = find(['Hiring Request ID', 'HRID', 'Request ID', 'Job ID', 'Requisition ID', 'HR ID']);

                        const typing = find(['Typing Test', 'Typing', 'Typing Score', 'WPM', 'Typing Result']);
                        let typingWpm = null;
                        let typingAcc = null;
                        if (typing) {
                            const typingStr = String(typing);
                            const parts = typingStr.split(/[\/\s%]+/);
                            const wpm = parseInt(parts[0]);
                            const acc = parts[1] ? parseInt(parts[1]) : null;
                            typingWpm = isNaN(wpm) ? null : wpm;
                            typingAcc = isNaN(acc as number) ? null : acc;
                        }

                        const rawSpecificStatus = find(['Final Specific Status', 'Specific Status', 'Status Details', 'Interview Status']);
                        const normalizedSpecific = normalizeStatus(rawSpecificStatus);
                        
                        const linkedOverall = normalizedSpecific ? SPECIFIC_STATUS_TO_OVERALL[normalizedSpecific] : null;
                        const manualOverall = find(['Overall Status', 'Status', 'Current Status']);
                        
                        let finalOverall = linkedOverall || (manualOverall ? String(manualOverall).toUpperCase().replace(/ /g, '_') : 'OPEN');
                        if (finalOverall === 'APPLIED') finalOverall = 'OPEN';

                        const existingApp = applications.find(a => (a.applicant_email || '').toLowerCase() === emailVal.toLowerCase());

                        const rowSource = find(['Where did you hear that we are hiring', 'Source', 'Hiring Source', 'Channel', 'Lead Source']);
                        const candidateSource = rowSource || existingApp?.source || 'SHEET_IMPORT';

                        const statusPriority: Record<string, number> = {
                            'HIRED': 100,
                            'ACCEPTED OFFER': 90,
                            'FOR JOB OFFER': 80,
                            'SENT JO AND BGC': 70,
                            'CLIENT_INTERVIEW': 60,
                            'CLIENT_ASSESSMENT': 50,
                            'ASSESSMENT': 40,
                            'OPEN': 10,
                            'CLOSED': 0
                        };

                        const existingStatus = (existingApp?.current_status || '').toUpperCase();
                        let finalStatus = (finalOverall || existingApp?.current_status || 'Applicant Form') as ApplicationStatus;
                        const newStatus = (finalOverall || '').toUpperCase();

                        if (existingApp && statusPriority[existingStatus] > (statusPriority[newStatus] || 0)) {
                            finalStatus = existingApp.current_status as ApplicationStatus;
                        }

                        return {
                            ...existingApp,
                            applicant_name: String(applicantName || (existingApp?.applicant_name) || 'Unknown Candidate'),
                            applicant_email: emailVal,
                            assigned_recruiter_name: interviewerName || existingApp?.assigned_recruiter_name,
                            department: find(['Account', 'ACCOUNT', 'Account Name', 'Final Account', 'Client', 'Department', 'Dept']) || existingApp?.department,
                            position_title: find(['Position', 'Position Title', 'Position Applying For?', 'Role', 'Job Title', 'Job', 'Applying For', 'Target Role', 'Title', 'Role Name']) || existingApp?.position_title || 'SHEET CANDIDATE',
                            current_status: finalStatus,
                            source: candidateSource,
                            master_wave: find(['WAVE', 'Wave', 'Batch', 'Class', 'WaveNo']) || existingApp?.master_wave,
                            master_eid: eid || existingApp?.master_eid,
                            master_first_name: find(['First Name', 'FirstName', 'Given Name']) || existingApp?.master_first_name,
                            master_middle_name: find(['Middle Name', 'MiddleName', 'Middle Initial']) || existingApp?.master_middle_name,
                            master_last_name: find(['Last Name', 'LastName', 'Surname', 'Family Name']) || existingApp?.master_last_name,
                            master_hiring_request_id: hrid || existingApp?.master_hiring_request_id,
                            master_h2r_status: find(['H2R Status', 'H2R']) || existingApp?.master_h2r_status,
                            master_neo_date: find(['NEO Date', 'NEO', 'Orientation Date', 'NEO DATE', 'Orientation']) || existingApp?.master_neo_date,
                            master_peme_status: find(['PEME', 'Medical Status']) || existingApp?.master_peme_status,
                            master_peme_result: find(['PEME Result', 'Medical Result']) || existingApp?.master_peme_result,
                            master_discord_handle: find(['DISCORD', 'Discord Status', 'Discord Handle']) || existingApp?.master_discord_handle,
                            master_bgs_status: find(['BGC STATUS', 'BGC']) || existingApp?.master_bgs_status,
                            master_nbi_result: find(['NBI STATUS', 'NBI']) || existingApp?.master_nbi_result,
                            master_bi_endorsement_date: find(['BI STATUS', 'BI Endorsement']) || existingApp?.master_bi_endorsement_date,
                            master_bi_result: find(['BI RESULTS', 'BI Results', 'BI Result']) || existingApp?.master_bi_result,
                            
                            typing_test_wpm: typingWpm ?? existingApp?.typing_test_wpm,
                            typing_test_accuracy: typingAcc ?? existingApp?.typing_test_accuracy,
                            applied_at: formatImportDate(find(['Start time', 'Applied Date', 'Submission Time', 'Start', 'Entry Time']), existingApp?.applied_at || new Date().toISOString()),
                            updated_at: formatImportDate(find(['Completion time', 'Updated Date', 'Modified Time', 'End', 'Completion']), existingApp?.updated_at || new Date().toISOString()),
                            interview_completed_at: formatImportDate(find(['Interview Date', 'Interviewed On', 'Interview Schedule', 'Schedule'])) || existingApp?.interview_completed_at,
                            hired_at: formatImportDate(find(['Hire Date', 'Hired Date', 'Date Hired', 'Target Start Date', 'Onboarding Date', 'Joining Date', 'Start Date'])) || existingApp?.hired_at,
                            master_column: existingApp?.master_column || 'SHEET',
                            pis: {
                                ...(existingApp?.pis || {}),
                                first_name: find(['First Name', 'FirstName', 'Given Name']) || existingApp?.pis?.first_name,
                                middle_name: find(['Middle Name', 'MiddleName', 'Middle Initial']) || existingApp?.pis?.middle_name,
                                last_name: find(['Last Name', 'LastName', 'Surname', 'Family Name']) || existingApp?.pis?.last_name,
                                birth_date: formatImportDate(find(['DATE OF BIRTH', 'Birth Date', 'Birthday', 'DOB', 'Birthdate'])) || existingApp?.pis?.birth_date,
                                age: parseInt(find(['Age', 'Candidate Age'])) || existingApp?.pis?.age,
                                civil_status: find(['Civil Status', 'Marital Status']) || existingApp?.pis?.civil_status,
                                phone: find(['CONTACT NO.', 'Contact No', 'Contact Number', 'Mobile Number', 'Phone', 'Contact']) || existingApp?.pis?.phone,
                                current_address: find(['Current Address', 'Address', 'Location']) || existingApp?.pis?.current_address,
                                bpo_experience: find(['Do you have any BPO experience', 'BPO Experience', 'BPO Exp']) || existingApp?.pis?.bpo_experience,
                                tenure_bpo: find(['Tenure in the BPO Industry', 'BPO Tenure', 'Tenure']) || existingApp?.pis?.tenure_bpo,
                                highest_education: find(['Highest Educational Background', 'Educational Attainment', 'Education']) || existingApp?.pis?.highest_education,
                                course_year: find(['Course and Year Level', 'Course/Year', 'Course']) || existingApp?.pis?.course_year,
                                plans_back_to_school: find(['plans in going back to school']) || existingApp?.pis?.plans_back_to_school,
                                government_ids: find(['government IDs', 'Gov ID']) || existingApp?.pis?.government_ids,
                                sss_no: find(['SSS', 'SSS No', 'SSS Number']) || existingApp?.pis?.sss_no,
                                tin_no: find(['TIN', 'TIN No', 'TIN Number']) || existingApp?.pis?.tin_no,
                                pagibig_no: find(['Pag-ibig', 'Pagibig', 'HDMF', 'Pag-Ibig No']) || existingApp?.pis?.pagibig_no,
                                philhealth_no: find(['PHIC', 'PhilHealth', 'Philhealth No', 'Philhealth Number']) || existingApp?.pis?.philhealth_no,
                                hiring_source_detailed: find(['Where did you hear that we are hiring', 'Source', 'Hiring Source']) || existingApp?.pis?.hiring_source_detailed,
                                candidate_questions: find(['Do you have any questions about the role']) || existingApp?.pis?.candidate_questions,
                                salary_expectation: find(['salary expectations', 'Salary', 'Salary Expectation']) || existingApp?.pis?.salary_expectation,
                                initial_account_assignment: find(['INITIAL ACCOUNT ASSIGNMENT', 'Account Assignment', 'Initial Account', 'INITITAL ACCOUNT ASSIGNMENT']) || existingApp?.pis?.initial_account_assignment || (existingApp?.pis as any)?.['INITITAL ACCOUNT ASSIGNMENT'],
                                initial_interview_results: find(['INITIAL INTERVIEW RESULTS', 'Initial Interview', 'II Result', 'INITITAL INTERVIEW RESULTS']) || existingApp?.pis?.initial_interview_results || (existingApp?.pis as any)?.['INITITAL INTERVIEW RESULTS'],
                                cefr_level: find(['CEFR']) || existingApp?.pis?.cefr_level,
                                personality_test: find(['Personality Test']) || existingApp?.pis?.personality_test,
                                ops_validator_email: find(['Ops Validator Email']) || existingApp?.pis?.ops_validator_email,
                                ops_validator_status: find(['Ops Val Status']) || existingApp?.pis?.ops_validator_status,
                                ops_validator_notes: find(['Ops Val Notes']) || existingApp?.pis?.ops_validator_notes,
                                leadership_score: find(['Leadership Assessment', 'Leadership Assessment Status (if applicable)']) || existingApp?.pis?.leadership_score,
                                wonderlic_status: find(['Wonderlic Status']) || existingApp?.pis?.wonderlic_status,
                                client_interviewer_email: find(['Client Interviewer Email']) || existingApp?.pis?.client_interviewer_email,
                                client_interview_status: find(['Client Interview Status']) || existingApp?.pis?.client_interview_status,
                                client_interview_notes: find(['Client Interview Notes']) || existingApp?.pis?.client_interview_notes,
                                final_specific_status: normalizedSpecific || rawSpecificStatus || existingApp?.pis?.final_specific_status,
                                overall_status: finalOverall || existingApp?.pis?.overall_status,
                                final_account: find(['Final Account', 'Client', 'Department', 'Dept']) || existingApp?.pis?.final_account,
                                last_updated_by: find(['Last Processed/Updated By']) || existingApp?.pis?.last_updated_by,
                                notes: find(['Remarks', 'Comments', 'Notes']) || existingApp?.pis?.notes
                            },
                            metadata: (() => {
                                const healedMetadata: Record<string, any> = {};
                                Object.entries(row).forEach(([k, v]) => {
                                    const isDateCol = k.toLowerCase().includes('time') || k.toLowerCase().includes('date') || k.toLowerCase().includes('birth') || k.toLowerCase().includes('schedule');
                                    if (isDateCol && v && !isNaN(Number(v)) && Number(v) > 10000) {
                                        healedMetadata[k] = healDate(v, false) || v;
                                    } else {
                                        healedMetadata[k] = v;
                                    }
                                });
                                return healedMetadata;
                            })()
                        };
                    } catch (rowErr) {
                        console.error(`[Import] Error mapping row ${index}:`, rowErr);
                        return null;
                    }
                }).filter(r => r !== null);

                console.log('[Import] Successfully mapped records:', records.length);
                setPreviewData(records);
                setShowPreview(true);
            } catch (err: any) {
                console.error('[Import] Fatal Error:', err);
                const msg = err.response?.data?.error || err.response?.data?.message || err.message;
                alert(`IMPORT FAILED: ${msg}`);
                error('Import Error', `Data integration sequence failed: ${msg}`);
            }
        };
        reader.onerror = (err) => {
            console.error('[Import] FileReader Error:', err);
            alert('File reading failed. The file might be corrupted.');
        };
        reader.readAsArrayBuffer(file);
    };

    const confirmImport = async (moveToMasterlist: boolean = true) => {
        if (!previewData.length) return;
        setIsSaving(true);
        try {
            const finalRecords = previewData.map(record => {
                const status = (record.current_status || '').toUpperCase();
                const isHiredStatus = ['HIRED', 'HIRED_PROCESSED', 'ACCEPTED OFFER', 'FOR JOB OFFER'].includes(status);
                
                return {
                    ...record,
                    master_column: (isHiredStatus && moveToMasterlist) ? 'MASTERLIST' : 'SHEET'
                };
            });

            const batchSize = 20;
            const totalBatches = Math.ceil(finalRecords.length / batchSize);
            let successCount = 0;
            
            for (let i = 0; i < finalRecords.length; i += batchSize) {
                const chunk = finalRecords.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;
                console.log(`[Import] Syncing batch ${batchNum}/${totalBatches} (${chunk.length} records)...`);
                
                const results = await ApplicationService.bulkCreate(chunk);
                successCount += results.length;
            }
            
            success('Import Complete', `Successfully synchronized ${successCount.toLocaleString()} candidate records to the ${activeTab} registry.`);
            setPreviewData([]);
            setShowPreview(false);
            loadData();
        } catch (err: any) {
            console.error('[Import] Save Error:', err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            error('Persistence Error', `Failed to save records: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        previewData,
        showPreview,
        setShowPreview,
        handleImportCSV,
        confirmImport
    };
}
