import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wizard jalan pintas di beranda (W-OWN-020).
 * Aksi terpenting dulu; tombol "Lewati, tampilkan semua" mengingat pilihan per user.
 * Tidak menyimpan data pribadi — hanya preferensi tampilan di localStorage.
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

type Props = {
  scope: string;
  title: string;
  subtitle: string;
  actions: QuickStartAction[];
};

export default function QuickStartWizard({ scope, title, subtitle, actions }: Props) {
  const { user } = useAuth();
  const storageKey = `kost48-quickstart:${scope}:${user?.id ?? 'anon'}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });

  const skip = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch { /* mode privat: tetap sembunyikan untuk sesi ini */ }
    setHidden(true);
  };

  const show = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch { /* abaikan */ }
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
  return (
    <QuickStartWizard
      scope="owner"
      title="Mau kerjakan apa hari ini?"
      subtitle="Empat hal yang paling sering dicek owner."
      actions={[
        { key: 'invoices', icon: '💳', label: 'Tagihan', hint: 'Lihat & tindak lanjuti', to: '/invoices' },
        { key: 'occupancy', icon: '🏠', label: 'Ketersediaan', hint: 'Ubah status kamar', to: '/cek' },
        { key: 'checklist', icon: '✅', label: 'Checklist go-live', hint: 'Data yang kurang', to: '/cek' },
        { key: 'report', icon: '📊', label: 'Laporan', hint: 'Kinerja & keuangan', to: '/reports' },
      ]}
    />
  );
}

export function AdminQuickStart() {
  return (
    <QuickStartWizard
      scope="admin"
      title="Mulai dari mana?"
      subtitle="Aksi admin yang paling sering dipakai."
      actions={[
        { key: 'invoices', icon: '💳', label: 'Tagihan', hint: 'Periksa pembayaran', to: '/invoices' },
        { key: 'tickets', icon: '🛠️', label: 'Tiket', hint: 'Keluhan & perbaikan', to: '/tickets' },
        { key: 'checkin', icon: '🔑', label: 'Check-in', hint: 'Penghuni baru', to: '/stays/check-in' },
        { key: 'occupancy', icon: '🏠', label: 'Ketersediaan', hint: 'Status kamar', to: '/cek' },
      ]}
    />
  );
}

export function StaffQuickStart() {
  return (
    <QuickStartWizard
      scope="staff"
      title="Tugas hari ini"
      subtitle="Jalan pintas ke pekerjaan lapangan."
      actions={[
        { key: 'tickets', icon: '🛠️', label: 'Tiket', hint: 'Kerjakan keluhan', to: '/tickets' },
        { key: 'warehouse', icon: '📦', label: 'Gudang', hint: 'Stok & barang', to: '/staff-warehouse' },
        { key: 'report', icon: '🗓️', label: 'Laporan bulanan', hint: 'Isi laporan', to: '/staff-report' },
        { key: 'checklist', icon: '✅', label: 'Checklist', hint: 'Go-live & kamar', to: '/cek' },
      ]}
    />
  );
}
