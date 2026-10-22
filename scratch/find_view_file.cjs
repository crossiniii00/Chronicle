const fs = require('fs');

const lines = fs.readFileSync('C:/Users/cp360admin/.gemini/antigravity-ide/brain/9a97bdac-d937-4d1c-b6cc-623a165ca561/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

let targetStepIndex = -1;
let callId = '';

for (let i = lines.length - 1; i >= 0; i--) {
    try {
        const line = lines[i].trim();
        if (!line) continue;
        const parsed = JSON.parse(line);
        if (parsed.type === 'PLANNER_RESPONSE' && parsed.tool_calls) {
             for (let tc of parsed.tool_calls) {
                 if (tc.name === 'view_file' && tc.args.AbsolutePath && tc.args.AbsolutePath.includes('useApplicantManagement.ts')) {
                     console.log('Found view_file at step index:', parsed.step_index);
                     callId = tc.id; // if id is available
                     // Now look forward from i to find the tool response
                     for (let j = i + 1; j < lines.length; j++) {
                         try {
                             const forwardParsed = JSON.parse(lines[j]);
                             if (forwardParsed.type && forwardParsed.type.includes('TOOL_RESPONSE')) { // might be something else
                                 // check if this is the response for view_file
                                 if (JSON.stringify(forwardParsed).includes('filteredList')) {
                                     console.log('Found tool response containing the file text');
                                     fs.writeFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/scratch/recovered_hook.json', JSON.stringify(forwardParsed, null, 2));
                                     process.exit(0);
                                 }
                             }
                         } catch (e) {}
                     }
                 }
             }
        }
    } catch (e) {}
}
