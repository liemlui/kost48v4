import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

interface BoundaryState {
  error: Error | null;
}

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PWA] Route failed to render', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isOffline = !navigator.onLine;
    return (
      <main className="min-vh-100 d-flex align-items-center justify-content-center p-3">
        <Alert variant="warning" className="mw-100" style={{ width: 520 }}>
          <Alert.Heading>Halaman belum dapat dimuat</Alert.Heading>
          <p>
            {isOffline
              ? 'Bagian ini belum tersimpan di perangkat. Sambungkan internet lalu coba lagi.'
              : 'Aset aplikasi mungkin baru diperbarui. Muat ulang untuk memakai versi yang konsisten.'}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
            <Button variant="outline-secondary" href="/rooms">
              Kembali ke daftar kamar
            </Button>
          </div>
        </Alert>
      </main>
    );
  }
}

export default function PwaRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <RouteErrorBoundary key={location.pathname}>
      {children}
    </RouteErrorBoundary>
  );
}
