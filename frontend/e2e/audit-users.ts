// frontend/e2e/audit-users.ts
// AO-03 — kredensial audit lintas role (OWNER/ADMIN/STAFF + dua state TENANT).
// SEMUA kredensial dibaca dari environment lokal, TIDAK pernah di-hard-code di
// test atau docs (kriteria AO-03: "Password disimpan di env lokal/secret manager,
// bukan hard-code docs atau test").
//
// Isi env lokal (shell atau frontend/.env.local, dibaca langsung oleh Playwright):
//   E2E_BASE                 — server yang di-crawl (bawaan dev frontend :5173;
//                              untuk server combined production-like pakai E2E_BASE).
//   E2E_OWNER_IDENTIFIER / E2E_OWNER_PASSWORD
//   E2E_ADMIN_IDENTIFIER  / E2E_ADMIN_PASSWORD
//   E2E_STAFF_IDENTIFIER  / E2E_STAFF_PASSWORD
//   E2E_TENANT_ACTIVE_IDENTIFIER / E2E_TENANT_ACTIVE_PASSWORD   (opsional, AO-14)
//   E2E_TENANT_NO_STAY_IDENTIFIER / E2E_TENANT_NO_STAY_PASSWORD (opsional, AO-14)
//
// Penyediaan akun audit di lingkungan UAT non-produksi:
//   node backend/scripts/seed-audit-users.js  (event-path via API, non-destruktif,
//   password dari env AUDIT_*; JAMA N jalankan tanpa izin owner karena ini mutasi DB).
import type { Page } from '@playwright/test';

export type AuditRoleName = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT_ACTIVE' | 'TENANT_NO_STAY';

export const BASE = process.env.E2E_BASE ?? 'http://localhost:5173';

const ENV_FOR: Record<AuditRoleName, { id: string; pw: string }> = {
  OWNER: { id: 'E2E_OWNER_IDENTIFIER', pw: 'E2E_OWNER_PASSWORD' },
  ADMIN: { id: 'E2E_ADMIN_IDENTIFIER', pw: 'E2E_ADMIN_PASSWORD' },
  STAFF: { id: 'E2E_STAFF_IDENTIFIER', pw: 'E2E_STAFF_PASSWORD' },
  TENANT_ACTIVE: { id: 'E2E_TENANT_ACTIVE_IDENTIFIER', pw: 'E2E_TENANT_ACTIVE_PASSWORD' },
  TENANT_NO_STAY: { id: 'E2E_TENANT_NO_STAY_IDENTIFIER', pw: 'E2E_TENANT_NO_STAY_PASSWORD' },
};

export type AuditCredential = { identifier: string; password: string };

/** Kredensial audit dari env lokal; null bila belum diisi (test di-skip dengan pesan jelas). */
export function auditCredentials(role: AuditRoleName): AuditCredential | null {
  const names = ENV_FOR[role];
  const identifier = (process.env[names.id] ?? '').trim();
  const password = process.env[names.pw] ?? '';
  if (!identifier || !password) return null;
  return { identifier, password };
}

/**
 * Rute per role — dijaga sinkron dengan `frontend/src/App.tsx` (RequireRoles)
 * dan `frontend/src/config/navigation.ts`. Crawl hanya mengunjungi rute yang SAH
 * untuk role tersebut; bila guard salah, halaman terlempar ke /login dan menjadi
 * temuan `REDIRECT-LOGIN`.
 */
const SHARED_ADMIN_ROUTES = [
  '/renew-requests', '/users', '/tenants', '/stays', '/stays/check-in', '/invoices',
  '/invoice-payments', '/payment-submissions/review', '/announcements', '/meter-readings',
  '/iot', '/ac-maintenance', '/additional-services', '/service-interests', '/tickets',
  '/staff-routines', '/staff-performance', '/surveys', '/guest-preferences',
  '/inventory/gudang', '/inventory/barang-kamar', '/inventory/mutasi', '/wifi-sales',
  '/ancillary-revenue', '/finance/accounting-setup', '/finance/assets', '/expenses',
  '/reminders', '/settings', '/notifications', '/profile',
];

export const ROLE_ROUTES: Record<'OWNER' | 'ADMIN' | 'STAFF', string[]> = {
  OWNER: ['/owner-dashboard', '/admin-dashboard', '/market-analysis', '/loss-refunds', '/reports', ...SHARED_ADMIN_ROUTES],
  ADMIN: ['/dashboard', ...SHARED_ADMIN_ROUTES],
  STAFF: ['/dashboard', '/tickets', '/rooms', '/staff-warehouse', '/staff-report', '/profile', '/notifications'],
};

export const CRAWL_ROLES: Array<'OWNER' | 'ADMIN' | 'STAFF'> = ['OWNER', 'ADMIN', 'STAFF'];

/** Login nyata via UI (tab Admin/Operasional) lalu tunggu keluar dari /login. */
export async function loginAs(page: Page, creds: AuditCredential): Promise<void> {
  await page.goto(BASE + '/login');
  await page.getByText('Admin / Operasional', { exact: false }).first().click();
  const inputs = page.locator('form input');
  await inputs.first().fill(creds.identifier);
  await page.locator('form input[type="password"]').fill(creds.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}