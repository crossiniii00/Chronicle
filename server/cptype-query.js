const axios = require('axios');

async function queryCPType() {
    try {
        const res = await axios.post('https://firestore.googleapis.com/v1/projects/cptypefinal/databases/(default)/documents:runQuery', {
            structuredQuery: {
                from: [{ collectionId: 'results' }],
                limit: 100
            }
        });
        
        const docs = res.data.map(d => d.document).filter(Boolean);
        const matches = docs.filter(doc => {
            const name = doc.fields.name?.stringValue || '';
            const email = doc.fields.email?.stringValue || '';
            return name.toLowerCase().includes('meriel') || email.toLowerCase().includes('meriel') ||
                   name.toLowerCase().includes('ngalongalay') || email.toLowerCase().includes('ngalongalay');
        });
        
        console.log(JSON.stringify(matches, null, 2));
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
queryCPType();
