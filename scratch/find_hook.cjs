const { execSync } = require('child_process');
const fs = require('fs');

const images = execSync('docker images -f dangling=true -q').toString().split('\n').map(i => i.trim()).filter(Boolean);
let found = false;
for (let img of images) {
    try {
        console.log('Checking', img);
        const out = execSync(`docker run --rm ${img} cat /app/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts`, { stdio: 'pipe' }).toString();
        if (out.includes('taggingFilter')) {
            console.log('Found in', img);
            fs.writeFileSync('c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/scratch/recovered_hook.ts', out);
            found = true;
            break;
        }
    } catch (e) {
        // Not a node image or file not found
    }
}
if (!found) console.log('Not found in any image');
