// P3-02: Error boundary per fitur — error di satu bagian tidak merusak seluruh app
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Fallback UI kustom. Default: pesan error + tombol muat ulang. */
  fallback?: ReactNode;
  /** Callback saat error terjadi (untuk logging). */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * FeatureErrorBoundary — menangkap error render di dalam children-nya
 * tanpa menjatuhkan seluruh aplikasi. Cocok untuk halaman/luas besar
 * yang punya banyak fitur independen.
 *
 * Contoh:
 * ```tsx
 * <FeatureErrorBoundary>
 *   <TicketsPage />
 * </FeatureErrorBoundary>
 * ```
 */
export default class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log ke console untuk debugging
    console.error('[FeatureErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h5 className="mb-2">Terjadi kesalahan di bagian ini</h5>
          <p className="text-muted small mb-3">
            {this.state.error?.message || 'Kesalahan tidak diketahui.'}
          </p>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={this.handleRetry}
            type="button"
          >
            🔄 Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
