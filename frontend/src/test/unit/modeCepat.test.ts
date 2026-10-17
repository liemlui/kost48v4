import { beforeEach, describe, expect, it } from 'vitest';
import {
  CEPAT_PATH,
  PILIH_MODE_PATH,
  getStoredMode,
  persistModeChoice,
  readLegacyMode,
  resolvePostLoginRoute,
  setStoredMode,
  shouldShowFloatingSwitch,
  switchModeRoute,
} from '../../utils/modeCepat';

beforeEach(() => {
  localStorage.clear();
});

describe('AIDL-02 — preferensi mode per pengguna', () => {
  it('menyimpan pilihan per user.id, bukan satu kunci global', () => {
    setStoredMode(7, 'cepat');
    setStoredMode(8, 'normal');

    expect(getStoredMode(7)).toBe('cepat');
    expect(getStoredMode(8)).toBe('normal');
    expect(getStoredMode(9)).toBeNull();
  });

  it('menolak nilai asing dan localStorage yang diblokir tanpa melempar', () => {
    localStorage.setItem('kost48_mode:7', 'lengkap');
    expect(getStoredMode(7)).toBeNull();
    expect(getStoredMode(null)).toBeNull();
  });

  it('memetakan saklar lama: compact → cepat, full → normal', () => {
    localStorage.setItem('admin-density', 'compact');
    expect(readLegacyMode('ADMIN')).toBe('cepat');

    localStorage.setItem('admin-density', 'full');
    expect(readLegacyMode('ADMIN')).toBe('normal');

    localStorage.setItem('kost48_owner_density', 'compact');
    expect(readLegacyMode('OWNER')).toBe('cepat');

    expect(readLegacyMode('STAFF')).toBeNull();
    expect(readLegacyMode('TENANT')).toBeNull();
  });

  it('pilihan baru disimpan sekaligus menyelaraskan saklar lama role itu', () => {
    persistModeChoice('OWNER', 5, 'cepat');
    expect(getStoredMode(5)).toBe('cepat');
    expect(localStorage.getItem('kost48_owner_density')).toBe('compact');

    persistModeChoice('ADMIN', 6, 'normal');
    expect(getStoredMode(6)).toBe('normal');
    expect(localStorage.getItem('admin-density')).toBe('full');
  });

  it('role tanpa saklar lama tidak mendapat kunci legacy', () => {
    persistModeChoice('STAFF', 9, 'cepat');
    expect(localStorage.getItem('admin-density')).toBeNull();
    expect(localStorage.getItem('kost48_owner_density')).toBeNull();
  });
});

describe('AIDL-02 — percabangan setelah login', () => {
  it('OWNER/ADMIN tanpa preferensi diarahkan ke layar pilih-mode', () => {
    expect(resolvePostLoginRoute({ id: 1, role: 'OWNER' })).toBe(PILIH_MODE_PATH);
    expect(resolvePostLoginRoute({ id: 2, role: 'ADMIN' })).toBe(PILIH_MODE_PATH);
  });

  it('STAFF/TENANT tanpa preferensi langsung ke Mode Cepat', () => {
    expect(resolvePostLoginRoute({ id: 3, role: 'STAFF' })).toBe(CEPAT_PATH);
    expect(resolvePostLoginRoute({ id: 4, role: 'TENANT' })).toBe(CEPAT_PATH);
  });

  it('preferensi tersimpan menang atas saklar lama', () => {
    localStorage.setItem('admin-density', 'compact');
    setStoredMode(2, 'normal');

    expect(resolvePostLoginRoute({ id: 2, role: 'ADMIN' })).toBe('/dashboard');
  });

  it('preferensi Normal memakai rute lama yang sudah ada (halaman Normal tidak berubah)', () => {
    setStoredMode(1, 'normal');
    expect(resolvePostLoginRoute({ id: 1, role: 'OWNER' })).toBe('/owner-dashboard');

    setStoredMode(4, 'normal');
    expect(resolvePostLoginRoute({ id: 4, role: 'TENANT' }, 'occupied')).toBe('/portal/stay');
    expect(resolvePostLoginRoute({ id: 4, role: 'TENANT' }, 'booking')).toBe('/portal/bookings');
    expect(resolvePostLoginRoute({ id: 4, role: 'TENANT' }, 'browsing')).toBe('/rooms');
  });

  it('saklar lama dipakai bila belum ada preferensi baru', () => {
    localStorage.setItem('admin-density', 'full');
    expect(resolvePostLoginRoute({ id: 2, role: 'ADMIN' })).toBe('/dashboard');

    localStorage.setItem('admin-density', 'compact');
    expect(resolvePostLoginRoute({ id: 2, role: 'ADMIN' })).toBe(CEPAT_PATH);
  });

  it('deep link setelah login menang atas percabangan mode', () => {
    expect(resolvePostLoginRoute({ id: 1, role: 'OWNER' }, 'occupied', '/invoices')).toBe('/invoices');
    expect(resolvePostLoginRoute({ id: 3, role: 'STAFF' }, 'occupied', '/tickets')).toBe('/tickets');
  });

  it('tujuan saklar memakai rute Normal yang lama', () => {
    expect(switchModeRoute('cepat', 'TENANT')).toBe(CEPAT_PATH);
    expect(switchModeRoute('normal', 'OWNER')).toBe('/owner-dashboard');
    expect(switchModeRoute('normal', 'ADMIN')).toBe('/dashboard');
    expect(switchModeRoute('normal', 'STAFF')).toBe('/dashboard');
    expect(switchModeRoute('normal', 'TENANT', 'browsing')).toBe('/rooms');
  });
});

describe('AIDL-02 — saklar mengambang hanya di halaman Normal', () => {
  it('tampil di halaman kerja yang sudah login', () => {
    expect(shouldShowFloatingSwitch('/dashboard', true)).toBe(true);
    expect(shouldShowFloatingSwitch('/portal/stay', true)).toBe(true);
    expect(shouldShowFloatingSwitch('/profile', true)).toBe(true);
  });

  it('tidak tampil di login, publik, pilih-mode, dan shell Cepat', () => {
    expect(shouldShowFloatingSwitch('/dashboard', false)).toBe(false);
    expect(shouldShowFloatingSwitch('/login', true)).toBe(false);
    expect(shouldShowFloatingSwitch('/rooms', true)).toBe(false);
    expect(shouldShowFloatingSwitch('/rooms/kamar-a-1/detail', true)).toBe(false);
    expect(shouldShowFloatingSwitch('/booking/12', true)).toBe(false);
    expect(shouldShowFloatingSwitch('/cek', true)).toBe(false);
    expect(shouldShowFloatingSwitch(CEPAT_PATH, true)).toBe(false);
    expect(shouldShowFloatingSwitch(PILIH_MODE_PATH, true)).toBe(false);
  });
});
