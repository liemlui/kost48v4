import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoomCard, { getCategoryBadgeInfo } from '../../components/rooms/RoomCard';
import { buildAdminWaUrl } from '../../utils/whatsapp';
import type { PublicRoom } from '../../types';

const room = {
  id: 5,
  code: 'A-01',
  name: 'Kamar A Lantai 1',
  status: 'AVAILABLE',
  category: 'STANDARD',
  roomType: 'STANDARD',
  roomSize: 'STANDARD',
  pricing: { monthlyRateRupiah: 1_500_000 },
  images: [],
} as unknown as PublicRoom;

describe('Y-O1 — RoomCard', () => {
  describe('buildAdminWaUrl (pure)', () => {
    it('membuat url wa.me berisi teks (encoded)', () => {
      const url = buildAdminWaUrl(`Halo Admin KOST48, saya tertarik dengan kamar ${room.code || `#${room.id}`}.`);
      expect(url).toMatch(/^https:\/\/wa\.me\//);
      expect(decodeURIComponent(url)).toContain('A-01');
    });
  });

  describe('getCategoryBadgeInfo (pure)', () => {
    it('memetakan kategori ke label', () => {
      expect(getCategoryBadgeInfo({ ...room, category: 'DELUXE' } as PublicRoom)?.label).toBe('Deluxe');
      expect(getCategoryBadgeInfo({ ...room, category: 'ECONOMY' } as PublicRoom)?.label).toBe('Ekonomi');
      expect(getCategoryBadgeInfo({ ...room, category: 'STANDARD' } as PublicRoom)?.label).toBe('Standar');
    });
    it('kategori tak dikenal → null', () => {
      expect(getCategoryBadgeInfo({ ...room, category: 'XYZ' } as PublicRoom)).toBeNull();
    });
  });

  describe('render', () => {
    it('menampilkan kode & nama kamar', () => {
      render(
        <MemoryRouter>
          <RoomCard room={room} />
        </MemoryRouter>,
      );
      expect(screen.getByText('A-01')).toBeInTheDocument();
      expect(screen.getByText('Kamar A Lantai 1')).toBeInTheDocument();
    });
  });
});
