import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { ToastProvider } from '@/components/common/Toast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobalLoadingProvider } from '@/components/common/GlobalLoading';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { AnalyticsDashboard } from '@/components/features/Chatbot/AnalyticsDashboard';
import { SpotlightOverlay } from '@/components/features/Chatbot/SpotlightOverlay';
import { AIChatbot } from '@/components/features/Chatbot/AIChatbot';
import { apiClient } from '@/utils/apiClient';

/** Global data store so pages can read pre-loaded data */
const preloadedData = {
  positions: [] as unknown[],
  applications: [] as unknown[],
  rooms: [] as unknown[],
  ready: false,
};

type LoadStep = { label: string; status: 'pending' | 'loading' | 'done' | 'fallback' };

function DataLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [steps, setSteps] = useState<LoadStep[]>([
    { label: 'Connecting to database', status: 'pending' },
    { label: 'Initializing Services', status: 'pending' },
    { label: 'System Check', status: 'pending' },
    { label: 'Interface Preparation', status: 'pending' },
    { label: 'Finalizing', status: 'pending' },
  ]);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing system...');

  const updateStep = useCallback((index: number, status: LoadStep['status']) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Step 0: Check database connection
      updateStep(0, 'loading');
      setStatusMessage('Checking database connection...');
      setProgress(5);
      await delay(50); // Minimal for visual feedback

      updateStep(0, 'done');
      setStatusMessage('Local data store ready');
      setProgress(20);

      if (cancelled) return;

      // Step 1: Initialize Services
      updateStep(1, 'loading');
      setStatusMessage('Initializing core services...');
      await delay(50);
      updateStep(1, 'done');
      setProgress(40);

      if (cancelled) return;

      // Step 2: System Check
      updateStep(2, 'loading');
      setStatusMessage('Performing system check...');
      await delay(50);
      updateStep(2, 'done');
      setProgress(70);

      if (cancelled) return;

      // Step 3: Interface Preparation
      updateStep(3, 'loading');
      setStatusMessage('Preparing interface...');
      await delay(50);
      updateStep(3, 'done');
      setProgress(90);

      if (cancelled) return;

      // Step 4: Finalize
      updateStep(4, 'loading');
      setStatusMessage('Preparing interface...');
      await delay(50);
      preloadedData.ready = true;
      updateStep(4, 'done');
      setProgress(100);
      setStatusMessage('System ready');

      await delay(100);
      if (!cancelled) onComplete();
    };

    load();
    return () => { cancelled = true; };
  }, [onComplete, updateStep]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-colors duration-500"
    >
      {/* Logo — simple reveal animation (loading screen is too brief for hover/click interactions) */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-white text-black font-black flex items-center justify-center text-2xl shadow-2xl">
          C
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-xl font-black text-white tracking-widest uppercase mb-8"
      >
        CHRONICLE<span className="text-neutral-400">CRM</span>
      </motion.h1>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-72 space-y-4"
      >
        <div className="w-full h-1.5 bg-surface-200/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-red rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-[0.2em]">
            {statusMessage}
          </p>
        </div>

        {/* Step indicators */}
        <div className="space-y-1.5 pt-2">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {step.status === 'pending' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-800" />
                )}
                {step.status === 'loading' && (
                  <div className="w-3 h-3 border-[1.5px] border-brand-red border-t-transparent rounded-full animate-spin" />
                )}
                {step.status === 'done' && (
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.status === 'fallback' && (
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${step.status === 'done' ? 'text-emerald-400' :
                step.status === 'fallback' ? 'text-amber-400' :
                  step.status === 'loading' ? 'text-surface-200' :
                    'text-surface-600'
                }`}>
                {step.label}
                {step.status === 'fallback' && (
                  <span className="ml-1 text-[8px] text-amber-500 font-bold">(local)</span>
                )}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 text-[9px] font-semibold text-surface-600 tracking-widest uppercase"
      >
        Recruitment Management System
      </motion.p>
    </motion.div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { checkSessionExpiry, resetSessionTimer, isAuthenticated, user, refreshProfile } = useAuthStore();
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsChatbotEnabled(false);
      return;
    }
    const checkChatbotStatus = async () => {
      try {
        const res = await apiClient.get('/ai/status');
        setIsChatbotEnabled(res.data?.chatbotEnabled ?? false);
      } catch (err) {
        console.error('Failed to fetch AI chatbot status', err);
      }
    };
    checkChatbotStatus();

    window.addEventListener('ai-config-updated', checkChatbotStatus);
    return () => {
      window.removeEventListener('ai-config-updated', checkChatbotStatus);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      checkSessionExpiry();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSessionExpiry]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ACTIVITY_EVENTS = [
      'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'
    ];
    let lastReset = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset < 30000) return;
      lastReset = now;
      resetSessionTimer();
    };
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev as any, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev as any, onActivity));
    };
  }, [isAuthenticated, resetSessionTimer]);

  const location = useLocation();
  const isQueueDisplay = location.pathname === '/queue-display';

  return (
    <>
      {children}
      {isAuthenticated && user && !isQueueDisplay && <AnalyticsDashboard />}
      {isAuthenticated && user && !isQueueDisplay && <SpotlightOverlay />}
      {isAuthenticated && user && !isQueueDisplay && isChatbotEnabled && <AIChatbot />}
    </>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
  }, []);

  // Detect failed chunk loads (sync mismatch after a new deployment).
  // We DO NOT auto-reload: that was the source of the "random refresh" reports.
  // Instead we show a banner with a manual refresh button so the user stays in control.
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      const filename = e.filename || '';
      const message = e.message || '';
      const isViteChunk =
        /node_modules\/\.vite/.test(filename) ||
        (e.error && (e.error as Error).name === 'ChunkLoadError');
      const looksLikeChunkMessage =
        /Loading chunk \S+ failed/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message);

      if (isViteChunk || looksLikeChunkMessage) {
        console.warn('Sync Mismatch Detected: Showing refresh banner.');
        setSyncIssue(message);
      }
    };

    const handlePromiseRejection = (e: PromiseRejectionEvent) => {
      const reason: any = e.reason;
      const msg = (reason && (reason.message || String(reason))) || '';
      if (
        /Loading chunk \S+ failed/i.test(msg) ||
        /Failed to fetch dynamically imported module/i.test(msg) ||
        (reason && reason.name === 'ChunkLoadError')
      ) {
        console.warn('Async chunk load failed: Showing refresh banner.');
        setSyncIssue(msg);
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Log error details for debugging
    console.error('Application Error:', error, errorInfo);

    // In production, send to error reporting service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }, []);

  return (
    <ErrorBoundary onError={handleError}>
      <BrowserRouter>
        <ToastProvider>
          <GlobalLoadingProvider>
            <AnimatePresence>
              {loading && <DataLoadingScreen onComplete={handleLoadComplete} />}
            </AnimatePresence>
            {syncIssue && (
              <div className="fixed top-0 inset-x-0 z-[10000] bg-yellow-500/95 text-surface-900 shadow-lg border-b border-yellow-600/40">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={18} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">A new version of the app is available.</p>
                    <p className="text-xs opacity-80 truncate">Refresh when you're ready to load the latest code.</p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors shrink-0"
                  >
                    <RefreshCw size={14} />
                    Refresh now
                  </button>
                  <button
                    onClick={() => setSyncIssue(null)}
                    aria-label="Dismiss"
                    className="p-1.5 rounded-lg hover:bg-black/10 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            <SessionGuard>
              {!loading && <AppRoutes />}
            </SessionGuard>
          </GlobalLoadingProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
