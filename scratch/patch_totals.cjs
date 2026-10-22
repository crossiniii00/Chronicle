const fs = require('fs');

const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Extract the filter logic from `filteredList` useMemo into a `passesGlobalFilters` helper
const filterLogicStart = code.indexOf(`if (taggingFilter.length > 0 && !taggingFilter.includes('ALL')) {`);
const filterLogicEnd = code.indexOf(`const q = searchQuery.toLowerCase().trim();`);

if (filterLogicStart !== -1 && filterLogicEnd !== -1) {
    let extractedLogic = code.substring(filterLogicStart, filterLogicEnd);

    // Replace `list = list.filter((a) => {` with `if (!(() => {` and `});` with `)()) return false;` ?
    // No, easier way: just map `list = list.filter((a) => { ... })` to `if (condition) return false;`
    // Or even simpler: create a function that takes an applicant `a` and runs all filters sequentially.
    
    let helperFunc = `
    const passesGlobalFilters = useCallback((a: Application) => {
        const dummyList = [a];
        let list = dummyList;

${extractedLogic}

        const q = searchQuery.toLowerCase().trim();
        const queryWords = q.split(/\\s+/).filter(Boolean);
        if (queryWords.length > 0) {
            list = list.filter((a) => {
                const nameLower = a.applicant_name.toLowerCase();
                return queryWords.every(word => nameLower.includes(word));
            });
        }
        
        return list.length > 0;
    }, [statusFilter, specialStatusFilter, taggingFilter, accountFilter, lobFilter, recruiterFilter, normalizeRecruiterName, hireTypeFilter, appliedDateFilter, interviewDateFilter, trainingDateFilter, dateFilter, dateTargetFilter, searchQuery]);

`;

    // 2. Insert helperFunc before `filteredList` useMemo
    code = code.replace('const filteredList = useMemo(() => {', helperFunc + '\n    const filteredList = useMemo(() => {');
    
    // 3. Replace the extracted logic inside `filteredList` with `let list = baseList.filter(passesGlobalFilters);`
    code = code.substring(0, code.indexOf('const filteredList = useMemo(() => {') + helperFunc.length + '    const filteredList = useMemo(() => {\n'.length) +
           '        let list = baseList.filter(passesGlobalFilters);\n' +
           code.substring(code.indexOf('const q = searchQuery.toLowerCase().trim();') + `        const q = searchQuery.toLowerCase().trim();\n        const queryWords = q.split(/\\s+/).filter(Boolean);\n        const filtered = list.filter((a) => {\n            if (queryWords.length === 0) return true;\n            const nameLower = a.applicant_name.toLowerCase();\n            return queryWords.every(word => nameLower.includes(word));\n        });\n`.length).replace('const finalFiltered = isIdleFilterActive', 'const filtered = list;\n        const finalFiltered = isIdleFilterActive');


    // 4. Update the return values for counts
    const replacements = [
        'ongoingCount: ongoing.length',
        'allTabCount: allTabCount', // wait, allTabCount was computed earlier.
        'requestsCount: requests.length',
        'schedulingCount: scheduling.length',
        'rescheduleCount: reschedule.length',
        'reprofileCount: reprofile.length',
        'noshowCount: noshow.length',
        'rejectedCount: rejected.length',
        'markedAsPendingCount: marked_as_pending.length',
        'withdrawnCount: withdrawn.length',
        'waitlistedCount: waitlisted.length',
        'notEligibleCount: not_eligible.length',
        'promotedCount: promoted.length',
        'lateralCount: lateral.length',
        'blacklistedCount: blacklisted.length'
    ];
    
    // Wait, allTabCount was destructured from somewhere else, or calculated as allTabCount = allTabApplications.length.
    
    replacements.forEach(r => {
        const prop = r.split(':')[0];
        const arr = r.split(':')[1].split('.length')[0].trim();
        if (arr !== 'allTabCount') {
            code = code.replace(r, `${prop}: ${arr}.filter(passesGlobalFilters).length`);
        }
    });
    
    // Fix allTabCount
    code = code.replace('allTabCount: allTabCount,', 'allTabCount: allTabApplications.filter(passesGlobalFilters).length,');
    // Fix concludedCount
    code = code.replace('concludedCount: concluded.length,', 'concludedCount: concluded.filter(passesGlobalFilters).length,');

    fs.writeFileSync(path, code, 'utf8');
    console.log('Success!');
} else {
    console.log('Could not find filter logic boundaries');
}
