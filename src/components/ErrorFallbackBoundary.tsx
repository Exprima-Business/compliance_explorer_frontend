import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorFallbackBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log error to console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { hasError, message } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div style={{ padding: '1rem', color: 'red' }}>
          <h2>Something went wrong while rendering this section.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
        </div>
      );
    }

    return children;
  }
} 