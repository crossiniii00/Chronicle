const fetch = require('node-fetch');

async function test() {
    const id = '0b0a7940-7f1d-4dfb-aa90-ef4ddb972015'; // from logs
    const res = await fetch(`http://localhost:4000/api/applications/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            // fake token or I can just bypass auth for local test if needed
            // Wait, auth is required.
        },
        body: JSON.stringify({
            department: 'Abbott',
            endorsement_account: 'Abbott',
            pis: {
                final_account: 'Abbott',
                custom_lob: 'Customer Service'
            }
        })
    });
    console.log(res.status);
}
test();
