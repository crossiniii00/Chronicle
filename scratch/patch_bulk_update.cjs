const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

const target = 'const handleBulkUpdate = async (tag: string) => {};';
const replacement = `const handleBulkUpdate = useCallback(async (updates: any) => {
        if (!selectedIds.size) return;
        try {
            const ids = Array.from(selectedIds);
            await ApplicationService.bulkPatch(ids, updates);
            useToast.getState().showToast('success', \`Successfully updated \${ids.length} candidates.\`);
            setSelectedIds(new Set());
            // trigger refresh if possible
            if (refresh) refresh();
        } catch (error) {
            console.error('Error updating candidates:', error);
            useToast.getState().showToast('error', 'Failed to update candidates.');
        }
    }, [selectedIds]);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(path, code);
    console.log('Replaced handleBulkUpdate');
} else {
    console.log('Target not found for handleBulkUpdate replacement');
}
