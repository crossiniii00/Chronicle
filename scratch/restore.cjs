const fs = require('fs');
const dump = JSON.parse(fs.readFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/scratch/dump.jsonl', 'utf8'));
let code = dump.content || '';
if (!code && dump.output) code = dump.output;
if (!code) {
    const match = JSON.stringify(dump).match(/File content \(.*\):\\n([\\s\\S]+)/);
    if (match) code = match[1];
}
if (!code && dump.args && dump.args.FileContent) code = dump.args.FileContent;
// If the dump is the node output:
if (dump.content && dump.content.includes('const filteredList = useMemo(')) {
     code = dump.content;
} else if (dump.type === 'TOOL_RESPONSE' && dump.content) {
     const match = dump.content.match(/File content[^\n]+\n([\s\S]+)$/);
     if (match) code = match[1];
     else code = dump.content;
}

if (code) {
     fs.writeFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts', code);
     console.log('Restored');
} else {
     console.log('Failed to parse dump');
}
