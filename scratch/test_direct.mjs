const axios = require('axios');
const http = require('http');

async function test() {
    try {
        const payload = {
            toStatus: 'OPEN',
            reason: 'Test Update',
            patch: {
                metadata: { test: '123' },
                interview_responses: {
                    q1: 'TESTING RESPONSE 123'
                }
            }
        };

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/applications/a56653bb-d760-496f-af29-c44bbec6d1cb/status',
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                // bypassing auth by not including token, wait, it requires auth!
                // Let's use the DB query instead to bypass auth!
            }
        });
        
    } catch(e) {
        console.error(e);
    }
}
test();
