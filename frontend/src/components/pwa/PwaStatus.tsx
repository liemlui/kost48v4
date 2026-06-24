import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';

const PWA_UPDATED_KEY = 'kost48_pwa_just_updated';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISSED_KEY = 'kost48_pwa_install_dismissed';
const CURRENT_BUILD_ID = document
  .querySelector<HTMLMetaElement>('meta[name="kost48-build"]')
  ?.content;

function shortBuildId(buildId: string | undefined) {
  return buildId?.slice(0, 8);
}

export default function PwaStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [nextBuildId, setNextBuildId] = useState<string>();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem(INSTALL_DISMISSED_KEY) === '1',
  );
  const reloadingRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Tampilkan toast "App diperbaharui" setelah SW reload selesai.
  useEffect(() => {
    const flag = sessionStorage.getItem(PWA_UPDATED_KEY);
    if (flag === '1') {
      sessionStorage.removeItem(PWA_UPDATED_KEY);
      toast('✓ App diperbaharui ke versi terbaru.', 'success');
    }
  }, [toast]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;

    let active = true;
    let updateTimer: number | undefined;

    const announceUpdate = () => {
      setUpdateAvailable(true);
      void fetch('/version.json', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : null)
        .then((version: { buildId?: string } | null) => {
          if (active && version?.buildId) setNextBuildId(version.buildId);
        })
        .catch(() => undefined);
    };

    const watchRegistration = (nextRegistration: ServiceWorkerRegistration) => {
      if (!active) return;
      registrationRef.current = nextRegistration;
      setRegistration(nextRegistration);
      if (nextRegistration.waiting && navigator.serviceWorker.controller) {
        announceUpdate();
      }

      nextRegistration.addEventListener('updatefound', () => {
        const installing = nextRegistration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed'
            && navigator.serviceWorker.controller
          ) {
            announceUpdate();
          }
        });
      });
    };

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });
        watchRegistration(nextRegistration);
        updateTimer = window.setInterval(() => {
          void nextRegistration.update();
        }, 60 * 60 * 1000);
      } catch (error) {
        console.warn('[PWA] Service worker registration failed', error);
      }
    };

    const handleControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void registrationRef.current?.update();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      active = false;
      if (updateTimer) window.clearInterval(updateTimer);
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const applyUpdate = () => {
    sessionStorage.setItem(PWA_UPDATED_KEY, '1');
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      void registration?.update();
      window.location.reload();
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setInstallDismissed(true);
  };

  // Tunda prompt "Pasang aplikasi" sampai user login — jangan ganggu/menimpa
  // halaman publik & login (review UI/UX). Alert offline/update tetap di semua halaman.
  const showInstall = Boolean(installPrompt) && !installDismissed && Boolean(user);

  if (!isOffline && !updateAvailable && !showInstall) {
    return null;
  }

  return (
    <div className="pwa-status-stack" aria-live="polite">
      {isOffline ? (
        <Alert variant="warning" className="pwa-status-card mb-0">
          <strong>Mode offline.</strong>
          <span> Data terbaru dan transaksi memerlukan koneksi internet.</span>
        </Alert>
      ) : null}

      {updateAvailable ? (
        <Alert variant="info" className="pwa-status-card mb-0">
          <div>
            <strong>Versi baru tersedia.</strong>
            <span> Muat ulang untuk memakai pembaruan terbaru.</span>
            {CURRENT_BUILD_ID && nextBuildId && CURRENT_BUILD_ID !== nextBuildId ? (
              <small className="d-block text-muted">
                Build {shortBuildId(CURRENT_BUILD_ID)} ke {shortBuildId(nextBuildId)}
              </small>
            ) : null}
          </div>
          <Button size="sm" variant="primary" onClick={applyUpdate}>
            Perbarui
          </Button>
        </Alert>
      ) : null}

      {showInstall ? (
        <Alert variant="light" className="pwa-status-card pwa-install-card mb-0">
          <div>
            <strong>Pasang KOST48 di perangkat.</strong>
            <span> Akses lebih cepat dari layar utama.</span>
          </div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={dismissInstall}>
              Nanti
            </Button>
            <Button size="sm" variant="primary" onClick={() => void installApp()}>
              Pasang
            </Button>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
