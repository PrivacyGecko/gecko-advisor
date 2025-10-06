/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { Component, ErrorInfo, ReactNode } from 'react';

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

/**
 * Error Boundary component to catch and handle React errors
 *
 * Features:
 * - Graceful error handling with user-friendly messages
 * - Error reporting and logging
 * - Retry mechanisms for recoverable errors
 * - Accessibility compliant error states
 * - Development vs production error display
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to send to error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Something went wrong
            </h3>

            <p className="text-sm text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
            </p>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                  <div className="font-semibold text-red-600 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  <div className="whitespace-pre-wrap">
                    {this.state.error.stack}
                  </div>
                  {this.state.errorInfo && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <div className="font-semibold mb-1">Component Stack:</div>
                      <div className="whitespace-pre-wrap text-2xs">
                        {this.state.errorInfo.componentStack}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go Home
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Error ID: {Date.now().toString(36)}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error; // This will be caught by ErrorBoundary
    }
  }, [error]);

  return { handleError, clearError };
}

/**
 * Error state component for network and API errors
 */
export interface ErrorStateProps {
  error: Error | string;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  className?: string;
}

export const ErrorState = React.memo(function ErrorState({
  error,
  title = 'Something went wrong',
  description,
  onRetry,
  onGoHome,
  showDetails = false,
  className = ''
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'object' && error.stack ? error.stack : undefined;

  const getErrorType = () => {
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
      return {
        type: 'network',
        title: 'Network Error',
        description: 'Please check your internet connection and try again.',
        icon: '🌐'
      };
    }
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        type: 'notfound',
        title: 'Not Found',
        description: 'The requested resource could not be found.',
        icon: '🔍'
      };
    }
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      return {
        type: 'unauthorized',
        title: 'Unauthorized',
        description: 'You are not authorized to access this resource.',
        icon: '🔒'
      };
    }
    return {
      type: 'generic',
      title: 'Error',
      description: 'An unexpected error occurred. Please try again.',
      icon: '⚠️'
    };
  };

  const errorInfo = getErrorType();

  return (
    <div className={`text-center space-y-4 p-6 ${className}`}>
      <div className="text-4xl" aria-hidden="true">
        {errorInfo.icon}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {title || errorInfo.title}
        </h3>
        <p className="text-gray-600 mt-1">
          {description || errorInfo.description}
        </p>
      </div>

      {showDetails && errorMessage && (
        <details className="text-left max-w-md mx-auto">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-24">
            {errorMessage}
            {process.env.NODE_ENV === 'development' && errorStack && (
              <div className="mt-2 pt-2 border-t border-gray-300 text-2xs">
                {errorStack}
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go Home
          </button>
        )}
      </div>
    </div>
  );
});

export default ErrorBoundary;