import { useEffect, useRef, useCallback } from 'react';

/**
 * A smart polling hook that:
 * 1. Fires the callback immediately on mount
 * 2. Polls at `intervalMs` only when the browser tab is visible
 * 3. Pauses polling when the tab is hidden (saving server load)
 * 4. Fires an immediate refresh when the tab becomes visible again
 * 5. Cleans up on unmount
 *
 * Usage:
 *   useVisibilityPolling(loadData, 60000, [dependency1, dependency2]);
 */
export function useVisibilityPolling(
    callback: () => void,
    intervalMs: number,
    deps: readonly unknown[] = []
) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref fresh without restarting the interval
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const startPolling = useCallback(() => {
        if (intervalRef.current) return; // Already running
        intervalRef.current = setInterval(() => {
            callbackRef.current();
        }, intervalMs);
    }, [intervalMs]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        // Fire immediately on mount
        callbackRef.current();

        // Start polling if tab is visible
        if (!document.hidden) {
            startPolling();
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // Tab became visible — fire immediately, then resume polling
                callbackRef.current();
                startPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [startPolling, stopPolling]);
}
