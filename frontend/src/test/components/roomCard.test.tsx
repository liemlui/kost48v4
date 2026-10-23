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
    it('menampilkan label "Kmr <kode>" + nama kamar sebagai subjudul', () => {
      render(
        <MemoryRouter>
          <RoomCard room={room} />
        </MemoryRouter>,
      );
      // S4: label memakai `roomDisplayCode` (satu tempat), data kode tidak berubah.
      expect(screen.getByText('Kmr A-01')).toBeInTheDocument();
      expect(screen.queryByText('A-01')).toBeNull();
      expect(screen.getByText('Kamar A Lantai 1')).toBeInTheDocument();
    });

    it('kode kosong memakai fallback "Kamar <id>", bukan label menggantung', () => {
      render(
        <MemoryRouter>
          <RoomCard room={{ ...room, code: '', name: '' } as PublicRoom} />
        </MemoryRouter>,
      );
      expect(screen.getByText('Kamar 5')).toBeInTheDocument();
      expect(screen.queryByText(/^Kmr\s*$/)).toBeNull();
    });

    it('harga bulanan tampil sebagai satu elemen dominan (tanpa tabel semua term)', () => {
      render(
        <MemoryRouter>
          <RoomCard room={room} />
        </MemoryRouter>,
      );
      expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
      expect(screen.queryByRole('table')).toBeNull();
    });
  });

  describe('chip peluang kosong (satu sumber: utils/vacancyEstimate)', () => {
    const isoOffset = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    it('kamar terisi dengan kontrak berakhir menampilkan "Perkiraan kosong" + peluang', () => {
      const occupied = {
        ...room,
        status: 'OCCUPIED',
        checkInDate: isoOffset(-40),
        plannedCheckOutDate: isoOffset(5),
        remainingDays: 5,
        pricingTerm: 'MONTHLY',
      } as PublicRoom;

      render(
        <MemoryRouter>
          <RoomCard room={occupied} />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Perkiraan kosong \d+\/\d+/)).toBeInTheDocument();
      expect(screen.getByText(/^peluang (tinggi|sedang|rendah)$/)).toBeInTheDocument();
      expect(screen.getByTitle(/bukan janji/)).toBeInTheDocument();
    });

    it('tanpa tanggal kontrak chip tidak dikarang', () => {
      const noDates = { ...room, status: 'OCCUPIED' } as PublicRoom;
      render(
        <MemoryRouter>
          <RoomCard room={noDates} />
        </MemoryRouter>,
      );
      expect(screen.queryByText(/Perkiraan kosong/)).toBeNull();
    });
  });
});
