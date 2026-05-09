import { Component } from 'react';
import type { CSSProperties, ErrorInfo, ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
  onReset: () => void;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

const errorFallbackSurfaceStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: '32px',
  boxSizing: 'border-box',
  background:
    'linear-gradient(180deg, rgba(11, 15, 25, 0.96), rgba(20, 27, 45, 0.96))',
  color: '#f7f9fc',
  fontFamily: '"Guya", system-ui, sans-serif',
};

const errorFallbackCardStyle: CSSProperties = {
  width: 'min(100%, 560px)',
  display: 'grid',
  gap: '16px',
  padding: '24px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  background: 'rgba(8, 12, 20, 0.88)',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
};

const errorActionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
};

const primaryErrorActionStyle: CSSProperties = {
  border: 'none',
  borderRadius: '999px',
  padding: '11px 18px',
  background: '#f4f7ff',
  color: '#09101d',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryErrorActionStyle: CSSProperties = {
  ...primaryErrorActionStyle,
  background: 'transparent',
  color: '#f7f9fc',
  border: '1px solid rgba(255, 255, 255, 0.18)',
};

const errorDetailsStyle: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.06)',
  color: '#c8d3e6',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Reader crashed', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <section style={errorFallbackSurfaceStyle}>
        <div style={errorFallbackCardStyle}>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8fb4ff',
              }}
            >
              Reader error
            </p>
            <h1
              style={{ margin: '10px 0 0', fontSize: '30px', lineHeight: 1.1 }}
            >
              TruyenDrive hit an unexpected error.
            </h1>
          </div>

          <p style={{ margin: 0, color: '#c8d3e6', lineHeight: 1.6 }}>
            The reader UI was unmounted to avoid leaving the page in a broken
            state. You can retry the reader or reload the page.
          </p>

          <div style={errorActionRowStyle}>
            <button
              style={primaryErrorActionStyle}
              type="button"
              onClick={this.handleReset}
            >
              Retry reader
            </button>
            <button
              style={secondaryErrorActionStyle}
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>

          <details>
            <summary style={{ cursor: 'pointer', color: '#dbe6f8' }}>
              Error details
            </summary>
            <pre style={errorDetailsStyle}>{error.stack ?? error.message}</pre>
          </details>
        </div>
      </section>
    );
  }
}
