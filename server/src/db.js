import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool(config.postgres);

pool.on('error', (err) => {
    console.error('[Postgres Pool Error]', err);
});

export async function query(text, params = [], options = {}) {
    const maxRetries = options.retries !== undefined ? options.retries : 3;
    let delay = options.initialDelay || 500; // ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await pool.query(text, params);
        } catch (error) {
            const isConnectionError = 
                error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'EPIPE' ||
                error.code === 'ECONNRESET' ||
                error.code === '57P01' || // admin_shutdown
                error.code === '57P02' || // crash_shutdown
                error.code === '57P03' || // cannot_connect_now
                error.message?.includes('Connection terminated') ||
                error.message?.includes('client has already been released') ||
                error.message?.includes('Pool was destroyed');

            if (isConnectionError && attempt < maxRetries) {
                console.warn(`[DB Query Retry] Attempt ${attempt}/${maxRetries} failed due to connection error: ${error.message || error}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // exponential backoff
                continue;
            }

            if (!options.silent) {
                console.error('[DB Query Error]', { text, error: error.message || error, code: error.code });
            }
            throw error;
        }
    }
}
