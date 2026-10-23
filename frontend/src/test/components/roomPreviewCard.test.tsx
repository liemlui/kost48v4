import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoomPreviewCard } from '../../pages/public/publicGuestShared';
import type { PublicRoom } from '../../types';

/**
 * S4 (23 Okt 2026) — `RoomPreviewCard` memakai helper label yang SAMA dengan
 * kartu katalog (`roomDisplayCode`). Yang dibuktikan di sini: render + teks
 * judul; tampilan sesungguhnya di browser tidak diuji di sini.
 */
const room = {
  id: 12,
  code: 'F1',
  name: 'Kamar F1',
  status: 'AVAILABLE',
  publicAvailabilityStatus: 'AVAILABLE',
  category: 'STANDARD',
  roomType: 'STANDARD',
  roomSize: 'STANDARD',
  pricing: { monthlyRateRupiah: 1_700_000 },
  images: [],
} as unknown as PublicRoom;

describe('RoomPreviewCard — label "Kmr X" (S4)', () => {
  it('judul memakai "Kmr <kode>" dan nama kamar tetap terbaca', () => {
    render(
      <MemoryRouter>
        <RoomPreviewCard room={room} />
      </MemoryRouter>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent).toContain('Kmr F1');
    expect(heading.textContent).toContain('Kamar F1');
  });

  it('kode kosong memakai fallback nama kamar, bukan "Kmr" menggantung', () => {
    render(
      <MemoryRouter>
        <RoomPreviewCard room={{ ...room, code: '' } as PublicRoom} />
      </MemoryRouter>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.textContent?.trim()).toBe('Kamar F1');
  });
});
