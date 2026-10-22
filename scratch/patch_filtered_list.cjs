const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

const startStr = 'const filteredList = useMemo(() => {';
const endStr = '}, [activeTab, ongoing, requests, reprofile, rejected, concluded, searchQuery, statusFilter, accountFilter]);';

const newFilteredList = `const filteredList = useMemo(() => {
        let list = ongoing;
        if (activeTab === 'requests') list = requests;
        if (activeTab === 'reprofile') list = reprofile;
        if (activeTab === 'rejected') list = rejected;
        if (activeTab === 'concluded') list = concluded;

        if (statusFilter !== 'ALL') {
            list = list.filter((a) => {
                if (statusFilter === 'INITIAL_INTERVIEW') return ['INITIAL_INTERVIEW', 'QUEUE_ASSIGNED'].includes(a.current_status);
                if (statusFilter === 'INACTIVE') return ['FAILED', 'REJECTED', 'WITHDRAWN', 'NOT_ELIGIBLE_FOR_REHIRE'].includes(a.current_status);
                return a.current_status === statusFilter;
            });
        }

        if (accountFilter && accountFilter.length > 0) {
            const accounts = accountFilter.map(acc => acc.toLowerCase().trim());
            list = list.filter((a) => {
                const depts = (a.department || '').split(',').map(d => d.trim().toLowerCase());
                return accounts.some(acc => depts.some(d => d.includes(acc)));
            });
        }

        if (lobFilter && lobFilter.length > 0) {
            const lobs = lobFilter.map(l => l.toLowerCase().trim());
            list = list.filter((a) => {
                const depts = (a.department || '').split(',').map(d => d.trim().toLowerCase());
                return lobs.some(lob => depts.some(d => d.includes(lob)));
            });
        }

        if (taggingFilter && taggingFilter.length > 0) {
            const tags = taggingFilter.map(t => t.toLowerCase().trim());
            list = list.filter((a) => {
                const rawStatus = (a.current_status || a.pis?.final_specific_status || '').toLowerCase().trim();
                return tags.some(t => rawStatus.includes(t));
            });
        }

        if (hireTypeFilter && hireTypeFilter.length > 0) {
            const types = hireTypeFilter.map(t => t.toLowerCase().trim());
            list = list.filter((a) => {
                const dept = (a.department || '').toLowerCase();
                return types.some(t => dept.includes(t));
            });
        }

        const q = searchQuery.toLowerCase().trim();
        const queryWords = q.split(/\\s+/).filter(Boolean);
        if (queryWords.length > 0) {
            list = list.filter((a) => {
                const nameLower = a.applicant_name.toLowerCase();
                return queryWords.every(word => nameLower.includes(word));
            });
        }
        
        return list;
    }, [
        activeTab, ongoing, requests, reprofile, rejected, concluded, searchQuery, statusFilter, 
        accountFilter, lobFilter, taggingFilter, hireTypeFilter, recruiterFilter, specialStatusFilter, isIdleFilterActive
    ]);`;

code = code.substring(0, code.indexOf(startStr)) + newFilteredList + code.substring(code.indexOf(endStr) + endStr.length);

fs.writeFileSync(path, code);
