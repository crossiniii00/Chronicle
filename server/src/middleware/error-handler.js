import { ZodError } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

export function errorHandler(error, _req, res, _next) {
    console.error('[Error Handler]', error);

    const logEntry = `[${new Date().toISOString()}] ${_req.method} ${_req.url}\nError: ${error.message}\nStack: ${error.stack}\n\n`;
    try {
        fs.appendFileSync(path.resolve(process.cwd(), 'server_debug_log.txt'), logEntry);
    } catch (err) {
        console.error('Failed to write to debug log:', err);
    }

    if (error instanceof ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: (error.issues || error.errors || []).map(e => ({
                path: e.path.join('.'),
                message: e.message
            }))
        });
    }

    const status = error.statusCode ?? error.status ?? 500;
    const message = error.message ?? 'Unexpected server error.';
    const detail = error.detail ?? error.stack ?? null;
    const hint = error.hint ?? null;
    const code = error.code ?? null;

    res.status(status).json({ message, detail, hint, code });
}
