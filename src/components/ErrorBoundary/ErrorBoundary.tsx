/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * This must be a class component because error boundaries require
 * the componentDidCatch and getDerivedStateFromError lifecycle methods,
 * which are not available in functional components.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import './ErrorBoundary.css';

/* ==============================================
   Types
   ============================================== */

interface ErrorBoundaryProps {
  /** Child components to render when no error */
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/* ==============================================
   Component
   ============================================== */

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is thrown
   * Called during the "render" phase - no side effects allowed
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error information
   * Called during the "commit" phase - side effects allowed
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info for display
    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  /**
   * Reset error state to allow retry
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the entire page
   */
  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-message">
              An unexpected error occurred. You can try to recover or reload the page.
            </p>

            <div className="error-boundary-actions">
              <button
                type="button"
                className="error-boundary-button error-boundary-button--primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                type="button"
                className="error-boundary-button error-boundary-button--secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && error && (
              <details className="error-boundary-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-boundary-error">
                  <strong>{error.name}:</strong> {error.message}
                </div>
                {errorInfo && (
                  <pre className="error-boundary-stack">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
