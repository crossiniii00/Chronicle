const fs = require('fs');
const path = require('path');

const filesToProcess = [
    'c:\\Users\\cp360admin\\Downloads\\ChronicleV5\\ChronicleV5\\src\\components\\features\\ApplicantManagement\\PISDashboardModal.tsx',
    'c:\\Users\\cp360admin\\Downloads\\ChronicleV5\\ChronicleV5\\src\\components\\features\\ApplicantManagement\\FullscreenProfileView.tsx'
];

for (const filePath of filesToProcess) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Find the start of the Final Interviewer's Remarks section
    const finalRemarksStart = content.indexOf('<SectionCard icon={MessageSquare} title="Final Interviewer\'s Remarks"');
    if (finalRemarksStart === -1) {
        console.log(`Final Interviewer's Remarks not found in ${filePath}`);
        continue;
    }

    // Find the end of the SectionCard.
    // The section ends right before the Client Interview Remarks or the end of the div.
    let finalRemarksEnd = content.indexOf('</SectionCard>', finalRemarksStart);
    finalRemarksEnd += '</SectionCard>'.length;

    // Check if there's trailing whitespace/newlines
    while (content[finalRemarksEnd] === '\n' || content[finalRemarksEnd] === '\r' || content[finalRemarksEnd] === ' ') {
        finalRemarksEnd++;
    }

    const finalRemarksBlock = content.substring(finalRemarksStart, finalRemarksEnd);

    // Remove the block from its current location
    content = content.substring(0, finalRemarksStart) + content.substring(finalRemarksEnd);

    // Insert it before Operations Validation Remarks
    const opsValidationStart = content.indexOf('{/* === Operations Validation Remarks');
    if (opsValidationStart === -1) {
        console.log(`Operations Validation Remarks not found in ${filePath}`);
        continue;
    }

    const spaces = content.substring(content.lastIndexOf('\n', opsValidationStart) + 1, opsValidationStart);

    content = content.substring(0, opsValidationStart) + 
              finalRemarksBlock + 
              '\n' + spaces + 
              content.substring(opsValidationStart);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully processed ${filePath}`);
}
