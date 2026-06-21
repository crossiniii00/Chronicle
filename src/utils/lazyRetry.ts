import React from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 150;

function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const e = error as { name?: string; message?: string };
    const message = e.message || String(error);
    return (
        e.name === 'ChunkLoadError' ||
        /Loading chunk \S+ failed/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message)
    );
}

async function retryImport<T>(loader: () => Promise<T>, retriesLeft: number): Promise<T> {
    try {
        return await loader();
    } catch (err) {
        if (isChunkLoadError(err) && retriesLeft > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return retryImport(loader, retriesLeft - 1);
        }
        throw err;
    }
}

export function lazyRetry<P = Record<string, unknown>>(
    loader: () => Promise<{ default: React.ComponentType<P> } | React.ComponentType<P>>
) {
    const cached = React.lazy(() => retryImport(loader, MAX_RETRIES) as Promise<{ default: React.ComponentType<P> }>);
    return cached;
}
