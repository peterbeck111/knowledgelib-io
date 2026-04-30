// Input:  Any React app that crashes with white screen
// Output: Graceful error UI with retry capability

import { Component, useState, useCallback } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to external service
    if (window.__SENTRY__) {
      window.__SENTRY__.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback?.(this.state.error, this.handleReset) || (
        <div role="alert" style={{ padding: '2rem' }}>
          <h2>Application Error</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button onClick={this.handleReset}>Try Again</button>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage with custom fallback:
function App() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="error-page">
          <h1>Oops! {error.message}</h1>
          <button onClick={reset}>Retry</button>
        </div>
      )}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
