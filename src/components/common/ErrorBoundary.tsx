import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

function isChunkError(err?: Error): boolean {
    if (!err) return false;
    const msg = err.message || '';
    return (
        err.name === 'ChunkLoadError' ||
        /Loading chunk \S+ failed/i.test(msg) ||
        /Failed to fetch dynamically imported module/i.test(msg)
    );
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });

        // Log to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // In production, you could send this to an error reporting service
        if (import.meta.env.PROD) {
            // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    handleRefresh = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const chunkError = isChunkError(this.state.error);

            return (
                <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-surface-900 mb-4">
                            {chunkError ? 'A new version is available' : 'Something went wrong'}
                        </h1>

                        <p className="text-surface-600 mb-6 leading-relaxed">
                            {chunkError
                                ? 'This page needs the latest version of the app. Refresh to continue — your work is safe.'
                                : 'We encountered an unexpected error. This has been logged and our team will look into it.'}
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm font-semibold text-surface-700 mb-2">
                                    Error Details (Development Only)
                                </summary>
                                <div className="bg-surface-100 rounded-lg p-3 text-xs font-mono text-surface-800 overflow-auto max-h-32">
                                    <div className="mb-2">
                                        <strong>Error:</strong> {this.state.error.message}
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Component Stack:</strong>
                                            <pre className="whitespace-pre-wrap mt-1">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            {chunkError ? (
                                <button
                                    onClick={this.handleRefresh}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                                >
                                    <RefreshCw size={16} />
                                    Refresh now
                                </button>
                            ) : (
                                <button
                                    onClick={this.handleRetry}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                                >
                                    <RefreshCw size={16} />
                                    Try Again
                                </button>
                            )}

                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-200 text-surface-700 rounded-xl hover:bg-surface-300 transition-colors font-semibold"
                            >
                                <Home size={16} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<T extends object>(
    Component: React.ComponentType<T>,
    fallback?: ReactNode,
    onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
    return function WrappedComponent(props: T) {
        return (
            <ErrorBoundary fallback={fallback} onError={onError}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
