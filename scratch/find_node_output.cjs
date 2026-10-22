const fs = require('fs');

const lines = fs.readFileSync('C:/Users/cp360admin/.gemini/antigravity-ide/brain/9a97bdac-d937-4d1c-b6cc-623a165ca561/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
    try {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.includes('const filteredList = useMemo') && line.includes('taggingFilter') && line.includes('"type":"TOOL_RESPONSE"')) {
            console.log('Found it at line', i);
            fs.writeFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/scratch/dump.jsonl', line);
            process.exit(0);
        }
    } catch (e) {}
}
