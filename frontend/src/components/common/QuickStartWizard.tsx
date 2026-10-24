import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getTenantMenuLinks,
  getTenantPrimaryMenuLinks,
  type Role,
  type TenantFeatures,
  type TenantPortalStage,
} from '../../config/navigation';

/**
 * Wizard jalan pintas di beranda (W-OWN-020) + **layar pertama tiap peran** (P37 a / S8).
 *
 * Dua wujud, satu sumber aksi:
 * - `QuickStartWizard` = kartu di dalam halaman (dipakai dashboard owner/admin/staff dan
 *   panduan kos penghuni).
 * - `QuickStartFirstScreen` = layar penuh yang dirender `AppLayout` saat pengguna membuka
 *   rute pendaratannya sendiri (lihat `getQuickStartFirstScreen`).
 *
 * Tidak menyimpan data pribadi — hanya preferensi tampilan di localStorage per pengguna.
 * Larangan §8.8: fitur tidak boleh hilang di balik wizard, jadi layar pertama selalu punya
 * tombol **"Lihat semua menu"** yang terlihat tanpa menggulir.
 */

export type QuickStartAction = {
  key: string;
  icon: string;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type QuickStartDefinition = {
  scope: string;
  title: string;
  subtitle: string;
  actions: QuickStartAction[];
};

// ═══════════════════════════════════════════════════════════
//  Preferensi "lewati" — satu sumber kunci untuk kartu & layar pertama
// ═══════════════════════════════════════════════════════════

export function quickStartStorageKey(scope: string, userId?: number | string | null) {
  return `kost48-quickstart:${scope}:${userId ?? 'anon'}`;
}

export function isQuickStartSkipped(scope: string, userId?: number | string | null): boolean {
  try {
    return localStorage.getItem(quickStartStorageKey(scope, userId)) === '1';
  } catch {
    return false;
  }
}

export function setQuickStartSkipped(scope: string, skipped: boolean, userId?: number | string | null) {
  try {
    const key = quickStartStorageKey(scope, userId);
    if (skipped) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* mode privat: preferensi tidak bertahan, wizard tetap bisa dilewati untuk sesi ini */
  }
}

// ═══════════════════════════════════════════════════════════
//  Tabel aksi per peran — dipakai kartu DAN layar pertama (jangan diduplikasi)
// ═══════════════════════════════════════════════════════════

export const OWNER_QUICK_START: QuickStartDefinition = {
  scope: 'owner',
  title: 'Mau kerjakan apa hari ini?',
  subtitle: 'Empat hal yang paling sering dicek owner.',
  actions: [
    { key: 'invoices', icon: '💳', label: 'Tagihan', hint: 'Lihat & tindak lanjuti', to: '/invoices' },
    { key: 'occupancy', icon: '🏠', label: 'Ketersediaan', hint: 'Ubah status kamar', to: '/cek' },
    { key: 'checklist', icon: '✅', label: 'Checklist go-live', hint: 'Data yang kurang', to: '/cek' },
    { key: 'report', icon: '📊', label: 'Laporan', hint: 'Kinerja & keuangan', to: '/reports' },
  ],
};

export const ADMIN_QUICK_START: QuickStartDefinition = {
  scope: 'admin',
  title: 'Mulai dari mana?',
  subtitle: 'Aksi admin yang paling sering dipakai.',
  actions: [
    { key: 'invoices', icon: '💳', label: 'Tagihan', hint: 'Periksa pembayaran', to: '/invoices' },
    { key: 'tickets', icon: '🛠️', label: 'Tiket', hint: 'Keluhan & perbaikan', to: '/tickets' },
    { key: 'checkin', icon: '🔑', label: 'Check-in', hint: 'Penghuni baru', to: '/stays/check-in' },
    { key: 'occupancy', icon: '🏠', label: 'Ketersediaan', hint: 'Status kamar', to: '/cek' },
  ],
};

export const STAFF_QUICK_START: QuickStartDefinition = {
  scope: 'staff',
  title: 'Tugas hari ini',
  subtitle: 'Jalan pintas ke pekerjaan lapangan.',
  actions: [
    { key: 'tickets', icon: '🛠️', label: 'Tiket', hint: 'Kerjakan keluhan', to: '/tickets' },
    { key: 'warehouse', icon: '📦', label: 'Gudang', hint: 'Stok & barang', to: '/staff-warehouse' },
    { key: 'report', icon: '🗓️', label: 'Laporan bulanan', hint: 'Isi laporan', to: '/staff-report' },
    { key: 'checklist', icon: '✅', label: 'Checklist', hint: 'Go-live & kamar', to: '/cek' },
  ],
};

const TENANT_CANDIDATE_QUICK_START = {
  scope: 'tenant-calon',
  title: 'Mau cari kamar atau lanjutkan pengajuan?',
  subtitle: 'Calon penghuni: pilih kamar, ajukan, lalu lacak pengajuannya.',
};

const TENANT_OCCUPANT_QUICK_START = {
  // Scope 'tenant' = kunci yang sama dengan kartu wizard di halaman panduan kos, jadi
  // "lewati" sekali berlaku untuk keduanya.
  scope: 'tenant',
  title: 'Apa yang mau kamu kerjakan?',
  subtitle: 'Aksi yang paling sering dipakai penghuni.',
};

/** Jumlah aksi maksimum di layar pertama; sisanya tetap ada di "Lihat semua menu". */
const FIRST_SCREEN_MAX_ACTIONS = 4;

/**
 * Definisi layar pertama untuk satu peran. `null` = peran ini tidak memakai layar pertama
 * (mis. peran tak dikenal / tamu tanpa login).
 *
 * TENANT memakai **inventaris menu S6** (`getTenantMenuLinks`) sebagai sumber aksi, sehingga
 * label calon/penghuni tidak pernah ditulis dua kali dan tidak ada tautan yang dilarang guard.
 */
export function getQuickStartFirstScreen(
  role?: Role,
  tenantStage: TenantPortalStage = 'occupied',
  features?: TenantFeatures,
): QuickStartDefinition | null {
  if (role === 'OWNER') return OWNER_QUICK_START;
  if (role === 'ADMIN') return ADMIN_QUICK_START;
  if (role === 'STAFF') return STAFF_QUICK_START;
  if (role !== 'TENANT') return null;

  const isCandidate = tenantStage === 'browsing' || tenantStage === 'booking';
  const base = isCandidate ? TENANT_CANDIDATE_QUICK_START : TENANT_OCCUPANT_QUICK_START;
  return {
    ...base,
    actions: getTenantPrimaryMenuLinks(tenantStage, features)
      .slice(0, FIRST_SCREEN_MAX_ACTIONS)
      .map((link) => ({
        key: link.to,
        icon: link.icon ?? '•',
        label: link.label,
        hint: link.hint,
        to: link.to,
      })),
  };
}

// ═══════════════════════════════════════════════════════════
//  Kartu wizard (di dalam halaman)
// ═══════════════════════════════════════════════════════════

export default function QuickStartWizard({ scope, title, subtitle, actions }: QuickStartDefinition) {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(() => isQuickStartSkipped(scope, user?.id));

  const skip = () => {
    setQuickStartSkipped(scope, true, user?.id);
    setHidden(true);
  };

  const show = () => {
    setQuickStartSkipped(scope, false, user?.id);
    setHidden(false);
  };

  if (hidden) {
    return (
      <button type="button" className="quickstart-restore" onClick={show}>
        Tampilkan jalan pintas
      </button>
    );
  }

  return (
    <Card className="quickstart-card border-0 mb-3">
      <Card.Body>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div className="fw-semibold">{title}</div>
            <div className="small text-muted">{subtitle}</div>
          </div>
          <Button size="sm" variant="link" className="p-0 small" onClick={skip}>
            Lewati, tampilkan semua
          </Button>
        </div>
        <div className="quickstart-grid">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.key} to={action.to} className="quickstart-action">
                <span aria-hidden="true">{action.icon}</span>
                <strong>{action.label}</strong>
                {action.hint ? <small>{action.hint}</small> : null}
              </Link>
            ) : (
              <button key={action.key} type="button" className="quickstart-action" onClick={action.onClick} disabled={action.disabled}>
                <span aria-hidden="true">{action.icon}</span>
                <strong>{action.label}</strong>
                {action.hint ? <small>{action.hint}</small> : null}
              </button>
            ),
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export function OwnerQuickStart() {
  return <QuickStartWizard {...OWNER_QUICK_START} />;
}

export function AdminQuickStart() {
  return <QuickStartWizard {...ADMIN_QUICK_START} />;
}

export function StaffQuickStart() {
  return <QuickStartWizard {...STAFF_QUICK_START} />;
}

// ═══════════════════════════════════════════════════════════
//  Layar pertama (P37 a / S8)
// ═══════════════════════════════════════════════════════════

/**
 * Layar pertama tiap peran. Tombol **"Lihat semua menu"** ada di header (paling atas) supaya
 * terlihat tanpa menggulir di 390 px; memilih aksi juga langsung membuka halaman penuh.
 *
 * Aksi yang menunjuk rute yang sedang dibuka (mis. "Cari kamar" saat sudah di `/rooms`)
 * dirender sebagai tombol yang hanya menyingkap halaman — bukan tautan yang tidak berbuat apa-apa
 * (menghindari jalan buntu: dulu layar pertama akan tampil lagi setelah navigasi ke rute yang sama).
 */
export function QuickStartFirstScreen({
  definition,
  onReveal,
}: {
  definition: QuickStartDefinition;
  onReveal: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <section className="quickstart-first-screen" aria-labelledby="quickstart-first-title">
      <div className="quickstart-first-header">
        <div className="quickstart-first-heading">
          <div className="page-eyebrow">KOST48 Surabaya</div>
          <h1 id="quickstart-first-title">{definition.title}</h1>
          <p className="text-muted small mb-0">{definition.subtitle}</p>
        </div>
        <button type="button" className="btn btn-primary quickstart-first-allmenu" onClick={onReveal}>
          Lihat semua menu
        </button>
      </div>

      <div className="quickstart-grid quickstart-first-grid">
        {definition.actions.map((action) => {
          const sameRoute = Boolean(action.to) && action.to === pathname;
          const body = (
            <>
              <span aria-hidden="true">{action.icon}</span>
              <strong>{action.label}</strong>
              {action.hint ? <small>{action.hint}</small> : null}
            </>
          );

          if (action.to && !sameRoute) {
            return (
              <Link key={action.key} to={action.to} className="quickstart-action" onClick={onReveal}>
                {body}
              </Link>
            );
          }

          return (
            <button
              key={action.key}
              type="button"
              className="quickstart-action"
              disabled={action.disabled}
              onClick={() => {
                action.onClick?.();
                onReveal();
              }}
            >
              {body}
            </button>
          );
        })}
      </div>

      <p className="quickstart-first-note small text-muted mb-0">
        Pilihan “Lihat semua menu” diingat untuk akun ini, jadi lain kali kamu langsung masuk ke
        halaman penuh. Tidak ada fitur yang disembunyikan.
      </p>
    </section>
  );
}
