import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  chartType?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary that wraps chart rendering.
 * Catches React render errors and shows a styled fallback
 * instead of crashing the entire Chart Builder.
 */
class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error(
      '[ChartErrorBoundary] Render error caught:',
      {
        chartType: this.props.chartType,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-recover when chart type or children change
    if (this.state.hasError && prevProps.chartType !== this.props.chartType) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Chart Rendering Error
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-2">
            An error occurred while rendering the{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {this.props.chartType || 'chart'}
            </span>
            . This is usually caused by an incompatible data configuration.
          </p>

          {error && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg max-w-lg w-full text-left">
              <p className="text-[11px] font-mono text-red-600 dark:text-red-400 break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-all"
            >
              <RefreshCw size={14} />
              Retry
            </button>

            {this.props.onReset && (
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <RotateCcw size={14} />
                Reset Config
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
