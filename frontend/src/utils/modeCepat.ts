/**
 * Mode Cepat — preferensi dua mode dan percabangan masuk (AIDL-02).
 *
 * Batas yang disengaja:
 * - Fungsi di sini MURNI kecuali tiga akses localStorage (baca/tulis preferensi
 *   + pemetaan saklar lama). Tidak ada permintaan API dan tidak ada AI.
 * - Halaman Normal tidak disentuh: rute lamanya tetap dari `getDefaultRoute`.
 *   Modul ini hanya memutuskan "mendarat di mana setelah login" dan "ke mana
 *   saklar mengarah".
 * - Preferensi disimpan per pengguna (`user.id`), bukan per perangkat saja,
 *   supaya dua akun di browser yang sama tidak saling menimpa.
 */
import { getDefaultRoute, type TenantPortalStage } from '../config/navigation';
import type { AuthUser, UserRole } from '../types';

export type AppMode = 'cepat' | 'normal';

export const CEPAT_PATH = '/cepat';
export const PILIH_MODE_PATH = '/pilih-mode';

const STORAGE_PREFIX = 'kost48_mode:';

/**
 * Saklar lama yang dipetakan (bukan ditambah): nilai `compact` berarti Cepat,
 * `full` berarti Normal. Hanya role yang punya saklar lama yang punya kunci.
 */
const LEGACY_KEY: Partial<Record<UserRole, string>> = {
  OWNER: 'kost48_owner_density',
  ADMIN: 'admin-density',
};

export function modeStorageKey(userId: number | string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function isAppMode(value: unknown): value is AppMode {
  return value === 'cepat' || value === 'normal';
}

export function getStoredMode(userId?: number | string | null): AppMode | null {
  if (userId === null || userId === undefined) return null;
  try {
    const raw = localStorage.getItem(modeStorageKey(userId));
    return isAppMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredMode(userId: number | string, mode: AppMode): void {
  try {
    localStorage.setItem(modeStorageKey(userId), mode);
  } catch {
    /* localStorage bisa penuh/diblokir; pilihan tetap berlaku di sesi ini. */
  }
}

/** Membaca saklar lama milik role ini, bila ada. Tidak menulis apa pun. */
export function readLegacyMode(role?: UserRole | null): AppMode | null {
  if (!role) return null;
  const key = LEGACY_KEY[role];
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'compact') return 'cepat';
    if (raw === 'full') return 'normal';
  } catch {
    return null;
  }
  return null;
}

/** Menulis saklar lama agar halaman Normal tidak menampilkan pilihan yang berbeda. */
export function writeLegacyMode(role: UserRole | undefined | null, mode: AppMode): void {
  if (!role) return;
  const key = LEGACY_KEY[role];
  if (!key) return;
  try {
    localStorage.setItem(key, mode === 'cepat' ? 'compact' : 'full');
  } catch {
    /* idem: kegagalan penyimpanan tidak boleh memblokir perpindahan mode. */
  }
}

export function isModeChoiceRole(role?: UserRole | null): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/** Menyimpan pilihan baru + menyelaraskan saklar lama yang setara. */
export function persistModeChoice(
  role: UserRole | undefined | null,
  userId: number | string | null | undefined,
  mode: AppMode,
): void {
  if (userId !== null && userId !== undefined) setStoredMode(userId, mode);
  writeLegacyMode(role, mode);
}

/**
 * Tujuan setelah login (atau saat sesi sudah aktif membuka /login).
 * Urutan: deep link `from` > preferensi tersimpan > saklar lama > default role.
 *
 * OWNER/ADMIN tanpa preferensi diarahkan ke layar pilih-mode; STAFF/TENANT
 * langsung ke Mode Cepat (CEPAT-PILIH). TENANT yang belum punya masa sewa tetap
 * mendarat di Cepat — halaman itu sendiri yang menawarkan jalan ke katalog.
 */
export function resolvePostLoginRoute(
  user: Pick<AuthUser, 'id' | 'role'>,
  stage: TenantPortalStage = 'occupied',
  from?: string | null,
): string {
  if (from && from !== '/login') return from;

  const stored = getStoredMode(user.id);
  if (stored === 'cepat') return CEPAT_PATH;
  if (stored === 'normal') return getDefaultRoute(user.role, stage);

  if (!isModeChoiceRole(user.role)) return CEPAT_PATH;

  const legacy = readLegacyMode(user.role);
  if (legacy === 'cepat') return CEPAT_PATH;
  if (legacy === 'normal') return getDefaultRoute(user.role, stage);

  return PILIH_MODE_PATH;
}

/** Tujuan tombol saklar. Normal memakai rute lama yang sudah ada. */
export function switchModeRoute(
  mode: AppMode,
  role: UserRole | undefined | null,
  stage: TenantPortalStage = 'occupied',
): string {
  return mode === 'cepat' ? CEPAT_PATH : getDefaultRoute(role ?? undefined, stage);
}

/**
 * Saklar mengambang hanya untuk halaman Normal yang sudah login. Halaman publik,
 * layar pilih-mode, dan shell Cepat tidak menampilkannya (shell punya saklar
 * sendiri di header).
 */
export function shouldShowFloatingSwitch(pathname: string, hasUser: boolean): boolean {
  if (!hasUser) return false;
  if (pathname === CEPAT_PATH || pathname === PILIH_MODE_PATH) return false;
  if (pathname === '/') return false;

  const hiddenPrefixes = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/cek',
    '/panduan',
    '/reviews',
    '/update-kamar',
    '/availability-setup',
    '/okupansi',
    '/rooms',
    '/booking/',
  ];
  return !hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));
}
