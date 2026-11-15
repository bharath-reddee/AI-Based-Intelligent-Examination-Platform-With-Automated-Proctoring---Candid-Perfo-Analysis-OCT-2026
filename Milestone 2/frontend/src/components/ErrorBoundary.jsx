import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F5F7FC]">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E2E8F0] text-center space-y-5 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#202B40] tracking-tight">Something went wrong</h2>
              <p className="text-xs text-[#718096] leading-relaxed">
                An unexpected interface error occurred. You can reload this view or return safely to your dashboard.
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-[#F5F7FC] border border-[#E2E8F0] text-[11px] text-[#D95C65] font-mono text-left break-words max-h-32 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
