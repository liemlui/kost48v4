// S8 (P37 a) — wizard sebagai layar pertama tiap peran.
//
// Yang dibuktikan test ini:
// 1. Definisi layar pertama tersedia untuk 4 peran dan aksinya diambil dari SATU sumber
//    (tabel peran / inventaris menu tenant S6), bukan daftar salinan.
// 2. "Lihat semua menu" selalu dirender, bisa diakses keyboard, dan menyingkap halaman penuh.
// 3. Pilihan "lewati" disimpan per pengguna sehingga tetap berlaku setelah muat ulang.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  QuickStartFirstScreen,
  getQuickStartFirstScreen,
  isQuickStartSkipped,
  quickStartStorageKey,
  setQuickStartSkipped,
} from '../../components/common/QuickStartWizard';
import {
  getTenantMenuLinks,
  getTenantPrimaryMenuLinks,
  tenantStageAllowsRoute,
  type TenantPortalStage,
} from '../../config/navigation';

beforeEach(() => {
  localStorage.clear();
});

describe('S8 — getQuickStartFirstScreen (definisi layar pertama)', () => {
  it('OWNER, ADMIN, dan STAFF memakai tabel aksi peran yang sama dengan kartu wizard', () => {
    const owner = getQuickStartFirstScreen('OWNER');
    const admin = getQuickStartFirstScreen('ADMIN');
    const staff = getQuickStartFirstScreen('STAFF');

    expect(owner?.scope).toBe('owner');
    expect(owner?.actions.map((action) => action.to)).toContain('/invoices');
    expect(admin?.scope).toBe('admin');
    expect(admin?.actions.map((action) => action.to)).toContain('/stays/check-in');
    expect(staff?.scope).toBe('staff');
    expect(staff?.actions.map((action) => action.to)).toContain('/staff-warehouse');
    for (const definition of [owner, admin, staff]) {
      expect(definition?.actions.length).toBe(4);
      expect(definition?.title).toBeTruthy();
      expect(definition?.subtitle).toBeTruthy();
    }
  });

  it('TENANT tahap calon memakai inventaris menu S6 (cari kamar, pengajuan, panduan)', () => {
    const browsing = getQuickStartFirstScreen('TENANT', 'browsing');
    expect(browsing?.scope).toBe('tenant-calon');
    expect(browsing?.actions.map((action) => action.label)).toEqual(
      getTenantPrimaryMenuLinks('browsing').map((link) => link.label),
    );
    expect(browsing?.actions.map((action) => action.label)).toEqual(
      expect.arrayContaining(['Cari kamar', 'Pengajuan saya']),
    );

    const booking = getQuickStartFirstScreen('TENANT', 'booking');
    expect(booking?.actions[0].label).toBe('Pengajuan saya');
  });

  it('TENANT tahap penghuni memakai label kepemilikan/tagihan dan scope yang sama dengan kartu', () => {
    const occupied = getQuickStartFirstScreen('TENANT', 'occupied');
    expect(occupied?.scope).toBe('tenant');
    const labels = occupied?.actions.map((action) => action.label) ?? [];
    expect(labels).toContain('Kamar saya');
    expect(labels).toContain('Tagihan');
    expect(labels.length).toBeLessThanOrEqual(4);
  });

  it('setiap aksi tenant diizinkan guard tahapnya (menu tidak pernah lebih luas dari guard)', () => {
    const stages: TenantPortalStage[] = ['browsing', 'booking', 'occupied'];
    for (const stage of stages) {
      const definition = getQuickStartFirstScreen('TENANT', stage);
      for (const action of definition?.actions ?? []) {
        expect(action.to).toBeTruthy();
        expect(tenantStageAllowsRoute(stage, action.to as string)).toBe(true);
      }
    }
  });

  it('peran tak dikenal tidak memakai layar pertama', () => {
    expect(getQuickStartFirstScreen(undefined)).toBeNull();
    expect(getQuickStartFirstScreen('GUEST')).toBeNull();
  });
});

describe('S8 — "lewati" diingat per pengguna', () => {
  it('menyimpan dan menghapus preferensi lewat satu kunci bersama', () => {
    expect(isQuickStartSkipped('owner', 7)).toBe(false);

    setQuickStartSkipped('owner', true, 7);
    expect(isQuickStartSkipped('owner', 7)).toBe(true);
    expect(localStorage.getItem(quickStartStorageKey('owner', 7))).toBe('1');

    // Pengguna lain tidak terpengaruh.
    expect(isQuickStartSkipped('owner', 8)).toBe(false);

    setQuickStartSkipped('owner', false, 7);
    expect(isQuickStartSkipped('owner', 7)).toBe(false);
  });
});

describe('S8 — QuickStartFirstScreen (render)', () => {
  it('menampilkan judul, aksi, dan tombol "Lihat semua menu" yang bisa dipanggil', () => {
    const onReveal = vi.fn();
    const definition = getQuickStartFirstScreen('ADMIN');
    if (!definition) throw new Error('definisi ADMIN harus ada');

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <QuickStartFirstScreen definition={definition} onReveal={onReveal} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Mulai dari mana/i })).toBeInTheDocument();
    for (const action of definition.actions) {
      expect(screen.getByText(action.label)).toBeInTheDocument();
    }

    const allMenu = screen.getByRole('button', { name: /Lihat semua menu/i });
    fireEvent.click(allMenu);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('aksi yang menunjuk rute yang sedang dibuka menjadi tombol penyingkap, bukan tautan buntu', () => {
    const onReveal = vi.fn();
    const definition = getQuickStartFirstScreen('TENANT', 'browsing');
    if (!definition) throw new Error('definisi TENANT harus ada');
    const currentRoute = definition.actions[0].to as string;

    render(
      <MemoryRouter initialEntries={[currentRoute]}>
        <QuickStartFirstScreen definition={definition} onReveal={onReveal} />
      </MemoryRouter>,
    );

    const sameRouteAction = screen.getByRole('button', { name: new RegExp(definition.actions[0].label, 'i') });
    fireEvent.click(sameRouteAction);
    expect(onReveal).toHaveBeenCalledTimes(1);

    // Aksi lain tetap tautan sungguhan (bisa dibuka di tab baru / dinavigasi keyboard).
    const otherAction = definition.actions[1];
    const link = screen.getByRole('link', { name: new RegExp(otherAction.label, 'i') });
    expect(link).toHaveAttribute('href', otherAction.to);
  });
});
