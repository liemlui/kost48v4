import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoomCard, { buildWhatsAppUrl, getCategoryBadgeInfo } from '../../components/rooms/RoomCard';
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
  describe('buildWhatsAppUrl (pure)', () => {
    it('membuat url wa.me berisi kode kamar (encoded)', () => {
      const url = buildWhatsAppUrl(room);
      expect(url).toMatch(/^https:\/\/wa\.me\//);
      expect(decodeURIComponent(url)).toContain('A-01');
    });
    it('status MAINTENANCE → pesan menanyakan kesiapan', () => {
      const url = buildWhatsAppUrl({ ...room, status: 'MAINTENANCE' } as PublicRoom);
      expect(decodeURIComponent(url)).toMatch(/dicek|siap ditempati/i);
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
