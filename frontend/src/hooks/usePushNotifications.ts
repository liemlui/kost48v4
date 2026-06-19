import { useCallback, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribePush, unsubscribePush } from '../api/push';

export type PushState = 'unsupported' | 'denied' | 'disabled' | 'enabled' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * F4-2 — kelola langganan Web Push device ini.
 * Memerlukan service worker terdaftar (hanya di build PROD via PwaStatus) dan
 * dukungan PushManager/Notification. Di dev / tanpa SW → state 'disabled'/'unsupported'.
 */
export function usePushNotifications() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [state, setState] = useState<PushState>(supported ? 'loading' : 'unsupported');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supported) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setState('disabled');
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'enabled' : 'disabled');
    } catch {
      setState('disabled');
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'disabled');
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setError('Service worker belum aktif. Muat ulang halaman lalu coba lagi.');
        setState('disabled');
        return;
      }
      const { publicKey, enabled } = await getVapidPublicKey();
      if (!enabled || !publicKey) {
        setError('Notifikasi push belum dikonfigurasi di server.');
        setState('disabled');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await subscribePush({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
        userAgent: navigator.userAgent,
      });
      setState('enabled');
    } catch {
      setError('Gagal mengaktifkan notifikasi. Coba lagi.');
      void refresh();
    } finally {
      setBusy(false);
    }
  }, [supported, refresh]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint).catch((err) => { console.error('[PWA] unsubscribe failed', err); });
        await sub.unsubscribe().catch((err) => { console.error('[PWA] sub.unsubscribe failed', err); });
      }
      setState('disabled');
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, state, busy, error, enable, disable };
}
