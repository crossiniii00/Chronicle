/**
 * Sets Firebase Storage CORS configuration using the stored Firebase CLI access token.
 * Run: node scripts/set_cors_token.mjs
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Firebase storage bucket — try without the .firebasestorage.app suffix
// GCS API expects the bucket name without authority
const BUCKET = 'projectc-4fea4.appspot.com'; // Legacy Firebase Storage bucket name

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

// Read access token from Firebase CLI configstore
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const token = config?.tokens?.access_token;

if (!token) {
    console.error('No access token found in Firebase CLI config.');
    process.exit(1);
}

async function patchCors(accessToken) {
    const body = JSON.stringify({ cors: CORS_CONFIG });
    const encodedBucket = encodeURIComponent(BUCKET);

    const options = {
        hostname: 'storage.googleapis.com',
        path: `/storage/v1/b/${encodedBucket}?fields=cors`,
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
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
                    console.log('Response:', data);
                    resolve(data);
                } else {
                    console.error(`❌ Error ${res.statusCode}:`, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

patchCors(token).catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
});
