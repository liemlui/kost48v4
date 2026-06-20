import { useEffect, useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { getVapidPublicKey } from '../../api/push';

/**
 * F4-2 — kartu aktifkan/matikan notifikasi push (PWA) untuk device ini.
 * Tampil hanya bila browser mendukung; di dev tanpa service worker → tetap aman.
 */
export default function PushToggle() {
  const { supported, state, busy, error, enable, disable } = usePushNotifications();
  const [vapidEnabled, setVapidEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supported) return;
    getVapidPublicKey()
      .then(({ enabled }) => setVapidEnabled(enabled))
      .catch(() => setVapidEnabled(false));
  }, [supported]);

  if (!supported) return null;

  if (vapidEnabled === false) {
    return (
      <Alert variant="info" className="d-flex align-items-center gap-2 small mb-4" role="note">
        <span role="img" aria-hidden="true" style={{ fontSize: '1.1rem' }}>🔔</span>
        <span>Notifikasi push belum aktif. Notifikasi dalam aplikasi tetap berjalan normal.</span>
      </Alert>
    );
  }

  return (
    <Alert variant="light" className="border d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
      <div className="d-flex align-items-start gap-2">
        <span role="img" aria-hidden="true" style={{ fontSize: '1.25rem' }}>🔔</span>
        <div>
          <strong>Notifikasi ke perangkat (push)</strong>
          <div className="text-muted small">
            {state === 'enabled'
              ? 'Aktif di perangkat ini — kabar penting (pembayaran, kontrak, tiket) dikirim langsung.'
              : 'Aktifkan agar kabar penting muncul di perangkat ini meski aplikasi tertutup.'}
          </div>
          {state === 'denied' && (
            <div className="text-danger small mt-1">
              Notifikasi diblokir di setelan browser. Izinkan lewat setelan situs untuk mengaktifkan.
            </div>
          )}
          {error && <div className="text-danger small mt-1">{error}</div>}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        {state === 'loading' && <Spinner animation="border" size="sm" />}
        {state === 'disabled' && (
          <Button size="sm" variant="primary" onClick={() => void enable()} disabled={busy}>
            {busy ? 'Mengaktifkan...' : 'Aktifkan'}
          </Button>
        )}
        {state === 'enabled' && (
          <Button size="sm" variant="outline-secondary" onClick={() => void disable()} disabled={busy}>
            {busy ? 'Mematikan...' : 'Matikan'}
          </Button>
        )}
      </div>
    </Alert>
  );
}
