/**
 * Sets Firebase Storage CORS configuration using ADC (Application Default Credentials)
 * Run: node scripts/set_cors.mjs
 */

import { GoogleAuth } from 'google-auth-library';
import https from 'https';

const BUCKET = 'projectc-4fea4.firebasestorage.app';

const CORS_CONFIG = [
    {
        origin: [
            'http://localhost:5173',
            'http://localhost:4173',
            'https://projectc-4fea4.web.app',
            'https://projectc-4fea4.firebaseapp.com'
        ],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        responseHeader: ['Content-Type', 'Authorization'],
        maxAgeSeconds: 3600
    }
];

async function main() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/devstorage.full_control']
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
        console.error('Failed to get access token. Make sure you are logged in via `firebase login` or have ADC configured.');
        process.exit(1);
    }

    const body = JSON.stringify({ cors: CORS_CONFIG });

    const options = {
        hostname: 'storage.googleapis.com',
        path: `/storage/v1/b/${encodeURIComponent(BUCKET)}`,
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ CORS configuration applied successfully!');
                    resolve(data);
                } else {
                    console.error(`❌ Error ${res.statusCode}:`, data);
                    reject(new Error(data));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

main().catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
});
