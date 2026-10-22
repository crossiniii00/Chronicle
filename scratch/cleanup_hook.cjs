const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. Fix toast.getState() -> toast.success / toast.error
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('useToast.getState().showToast')) {
        lines[i] = lines[i].replace(/useToast\.getState\(\)\.showToast\('success',\s*(.*)\);/, 'toast.success("Success", $1);');
        lines[i] = lines[i].replace(/useToast\.getState\(\)\.showToast\('error',\s*(.*)\);/, 'toast.error("Error", $1);');
    }
}

// 2. Move handleBulkUpdate below selectedIds
// It starts with 'const handleBulkUpdate = useCallback(async (updates: any) => {'
// and ends with '    }, [selectedIds]);'
let startIndex = -1;
let endIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleBulkUpdate = useCallback(async (updates: any) => {')) {
        startIndex = i;
    }
    if (startIndex !== -1 && i > startIndex && lines[i].includes('}, [selectedIds]);')) {
        endIndex = i;
        break;
    }
}

if (startIndex !== -1 && endIndex !== -1) {
    const handleBulkUpdateLines = lines.splice(startIndex, endIndex - startIndex + 1);
    
    // Find 'return {' and insert right before it
    const returnIndex = lines.findIndex(l => l.includes('return {'));
    if (returnIndex !== -1) {
        lines.splice(returnIndex, 0, ...handleBulkUpdateLines);
    }
}

// 3. Remove duplicate 'handleBulkUpdate' in the return block
let foundHandleBulkUpdateInReturn = false;
const returnIndex2 = lines.findIndex(l => l.includes('return {'));
for (let i = returnIndex2 + 1; i < lines.length; i++) {
    if (lines[i].includes('handleBulkUpdate')) {
        if (!foundHandleBulkUpdateInReturn) {
            foundHandleBulkUpdateInReturn = true;
            // First time we see it, we keep it, but we need to ensure it's not listed twice on the SAME line!
            // E.g., 'handleUpdateApplication, confirmDelete, handleBulkDelete, handleBulkUpdate, handleBulkUpdate,'
            const parts = lines[i].split(',').map(s => s.trim());
            const uniqueParts = [...new Set(parts)].filter(Boolean);
            lines[i] = '        ' + uniqueParts.join(', ') + ',';
        } else {
            // Remove it from subsequent lines
            lines[i] = lines[i].replace(/handleBulkUpdate,?/g, '');
        }
    }
    if (lines[i].includes('}')) break;
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Cleanup complete');
