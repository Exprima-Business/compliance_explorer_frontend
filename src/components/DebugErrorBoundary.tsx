import React from 'react';
import { DEBUG_LOG } from '../config/debug';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class DebugErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (DEBUG_LOG) {
      // eslint-disable-next-line no-console
      console.error('[ReactErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (error && DEBUG_LOG) {
      return (
        <div style={{ color: 'red', padding: 16 }}>
          <h2>Runtime error</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
        </div>
      );
    }

    return children;
  }
} 