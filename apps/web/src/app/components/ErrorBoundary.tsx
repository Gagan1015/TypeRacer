import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[#3a3d42]/60 bg-[#2c2e33]/70 p-8 text-center shadow-xl">
            {/* Icon */}
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#ca4754]/30 bg-[#ca4754]/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-[#ca4754]"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className="font-display text-xl font-semibold text-[#d1d0c5]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[#646669]">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {this.state.error ? (
              <div className="mt-4 rounded-lg bg-[#1e2228] px-4 py-3">
                <p className="break-all font-mono text-xs text-[#ca4754]/80">
                  {this.state.error.message}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[#e2b714]/15 px-6 py-2.5 text-sm font-medium text-[#e2b714] transition-colors hover:bg-[#e2b714]/25"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.history.back();
                }}
                className="rounded-xl border border-[#3a3d42] px-6 py-2.5 text-sm text-[#9ba3af] transition-colors hover:border-[#646669] hover:text-[#d1d0c5]"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
