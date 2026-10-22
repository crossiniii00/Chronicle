const fs = require('fs');
const path = require('path');

const lines = fs.readFileSync('C:/Users/cp360admin/.gemini/antigravity-ide/brain/9a97bdac-d937-4d1c-b6cc-623a165ca561/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
    try {
        const line = lines[i].trim();
        if (!line) continue;
        const parsed = JSON.parse(line);
        if (parsed.type === 'PLANNER_RESPONSE') {
             // check if it has a tool call for view_file useApplicantManagement.ts
        }
        if (parsed.type === 'TOOL_RESPONSE' && parsed.content && parsed.content.includes('handleBulkUpdate') && parsed.content.includes('useApplicantManagement')) {
             console.log('Found TOOL_RESPONSE at line ' + i);
             fs.writeFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/scratch/dump.txt', parsed.content);
             break;
        }
    } catch (e) {}
}
