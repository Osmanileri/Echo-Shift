import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that prevents the app from crashing to a white screen.
 * Shows a minimal recovery UI so the player can restart the game.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Best-effort log — avoid importing heavy analytics here
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "#e2e8f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "2rem",
            textAlign: "center",
            zIndex: 99999,
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Signal Lost
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#94a3b8", maxWidth: 320, marginBottom: "1.5rem" }}>
            Something went wrong. Tap below to reconnect.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fff",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Restart
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre
              style={{
                marginTop: "2rem",
                padding: "1rem",
                background: "#1e1b2e",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                color: "#f87171",
                maxWidth: "90vw",
                maxHeight: "30vh",
                overflow: "auto",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
