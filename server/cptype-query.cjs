const axios = require('axios');

async function queryCPType() {
    try {
        const res = await axios.post('https://firestore.googleapis.com/v1/projects/cptypefinal/databases/(default)/documents:runQuery', {
            structuredQuery: {
                from: [{ collectionId: 'applicant_results' }],
                limit: 100
            }
        });
        
        const docs = res.data.map(d => d.document).filter(Boolean);
        const matches = docs.filter(doc => {
            const email = doc.fields.applicantEmail?.stringValue || '';
            const name = doc.fields.applicantName?.stringValue || '';
            return name.toLowerCase().includes('meriel') || email.toLowerCase().includes('meriel') ||
                   name.toLowerCase().includes('ngalongalay') || email.toLowerCase().includes('ngalongalay');
        });
        
        if(matches.length > 0) {
            console.log(JSON.stringify(matches, null, 2));
        } else {
            console.log("No match found in the first 100 docs, returning all names to debug:");
            console.log(docs.map(doc => doc.fields.applicantName?.stringValue || doc.fields.applicantEmail?.stringValue));
        }
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
queryCPType();
