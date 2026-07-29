import { useCallback, useRef, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const REQUIRED_TAPS = 5;
const TAP_WINDOW_MS = 2_500;

/**
 * Jalan pintas tersembunyi untuk pengelola: ketuk area kosong navbar lima
 * kali dalam 2,5 detik. Halaman tujuan tetap meminta PIN Owner.
 */
export function useAvailabilityShortcut() {
  const navigate = useNavigate();
  const tapState = useRef({ count: 0, lastTapAt: 0 });

  return useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as Element | null;

    // Jangan mengubah perilaku link/tombol navigasi yang memang terlihat.
    if (target?.closest('a, button, input, select, textarea, label')) return;

    const now = Date.now();
    const isWithinWindow = now - tapState.current.lastTapAt <= TAP_WINDOW_MS;
    const count = isWithinWindow ? tapState.current.count + 1 : 1;
    tapState.current = { count, lastTapAt: now };

    if (count < REQUIRED_TAPS) return;

    tapState.current = { count: 0, lastTapAt: 0 };
    navigate('/update-kamar');
  }, [navigate]);
}
