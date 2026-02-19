import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected app error',
    };
  }

  componentDidCatch(error: Error) {
    // Keep console visibility for debugging in production sessions.
    // eslint-disable-next-line no-console
    console.error('RootErrorBoundary caught:', error);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('ptc_trip_plan_v1');
      localStorage.removeItem('ptc_trip_plan_v2');
      localStorage.removeItem('ptc_trip_plan_v3');
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ maxWidth: 760, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
          <h1>App recovered from an error</h1>
          <p>
            The UI hit an unexpected state and was stopped to avoid a blank/broken session.
          </p>
          <p>
            <strong>Details:</strong> {this.state.message}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={this.handleReset}>
              Reset cached state and reload
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
