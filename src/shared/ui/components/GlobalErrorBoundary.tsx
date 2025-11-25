// @ts-nocheck
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    copied: boolean;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            copied: false
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null, copied: false };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    componentDidMount() {
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
        window.addEventListener('error', this.handleGlobalError);
    }

    componentWillUnmount() {
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
        window.removeEventListener('error', this.handleGlobalError);
    }

    handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        console.error("GlobalErrorBoundary caught unhandled rejection:", event.reason);
        this.setState({
            hasError: true,
            error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
            errorInfo: { componentStack: 'Unhandled Promise Rejection' }
        });
    };

    handleGlobalError = (event: ErrorEvent) => {
        console.error("GlobalErrorBoundary caught global error:", event.error);
        this.setState({
            hasError: true,
            error: event.error instanceof Error ? event.error : new Error(event.message),
            errorInfo: { componentStack: 'Global Script Error' }
        });
    };

    handleCopyLog = () => {
        const log = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
        navigator.clipboard.writeText(log);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
    };

    handleRestart = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold mb-2">Oops, something went wrong</h1>
                        <p className="text-gray-400 mb-6">
                            The application encountered an unexpected error. We've logged it and you can try to restart.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleRestart}
                                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                <RefreshCw size={20} />
                                Restart Application
                            </button>

                            <button
                                onClick={this.handleCopyLog}
                                className="w-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                {this.state.copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                                {this.state.copied ? 'Copied to Clipboard' : 'Copy Error Log'}
                            </button>
                        </div>

                        {this.state.error && (
                            <div className="mt-8 text-left">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2 tracking-wider">Error Details</p>
                                <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto border border-gray-800">
                                    <code className="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
                                        {this.state.error.toString()}
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
