const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

const startListStr = 'const filteredList = useMemo(() => {';

const passesGlobalFiltersFn = `
    const passesGlobalFilters = useCallback((a: Application) => {
        if (accountFilter && accountFilter.length > 0) {
            const accounts = accountFilter.map(acc => acc.toLowerCase().trim());
            const depts = (a.department || '').split(',').map(d => d.trim().toLowerCase());
            if (!accounts.some(acc => depts.some(d => d.includes(acc)))) return false;
        }

        if (lobFilter && lobFilter.length > 0) {
            const lobs = lobFilter.map(l => l.toLowerCase().trim());
            const depts = (a.department || '').split(',').map(d => d.trim().toLowerCase());
            if (!lobs.some(lob => depts.some(d => d.includes(lob)))) return false;
        }

        if (taggingFilter && taggingFilter.length > 0) {
            const tags = taggingFilter.map(t => t.toLowerCase().trim());
            const rawStatus = (a.current_status || a.pis?.final_specific_status || '').toLowerCase().trim();
            if (!tags.some(t => rawStatus.includes(t))) return false;
        }

        if (hireTypeFilter && hireTypeFilter.length > 0) {
            const types = hireTypeFilter.map(t => t.toLowerCase().trim());
            const dept = (a.department || '').toLowerCase();
            if (!types.some(t => dept.includes(t))) return false;
        }

        const q = searchQuery.toLowerCase().trim();
        if (q) {
            const queryWords = q.split(/\\s+/).filter(Boolean);
            const nameLower = a.applicant_name.toLowerCase();
            if (!queryWords.every(word => nameLower.includes(word))) return false;
        }

        return true;
    }, [searchQuery, accountFilter, lobFilter, taggingFilter, hireTypeFilter]);

    `;

code = code.substring(0, code.indexOf(startListStr)) + passesGlobalFiltersFn + code.substring(code.indexOf(startListStr));

const countsStart = 'const ongoingCount = ongoing.length;';
const countsEnd = 'const concludedCount = concluded.length;';

const newCounts = `const ongoingCount = useMemo(() => ongoing.filter(passesGlobalFilters).length, [ongoing, passesGlobalFilters]);
    const requestsCount = useMemo(() => requests.filter(passesGlobalFilters).length, [requests, passesGlobalFilters]);
    const reprofileCount = useMemo(() => reprofile.filter(passesGlobalFilters).length, [reprofile, passesGlobalFilters]);
    const rejectedCount = useMemo(() => rejected.filter(passesGlobalFilters).length, [rejected, passesGlobalFilters]);
    const concludedCount = useMemo(() => concluded.filter(passesGlobalFilters).length, [concluded, passesGlobalFilters]);`;

code = code.substring(0, code.indexOf(countsStart)) + newCounts + code.substring(code.indexOf(countsEnd) + countsEnd.length);

fs.writeFileSync(path, code);
