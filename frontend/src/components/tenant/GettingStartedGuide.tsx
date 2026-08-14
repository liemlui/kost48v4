import { useNavigate, useLocation } from 'react-router-dom';
import type { TenantPortalStage } from '../../hooks/useTenantPortalStage';

type Step = { icon: string; label: string; desc: string; to?: string };

function getSteps(stage: TenantPortalStage, hasStayHistory: boolean): Step[] {
  if (stage === 'browsing' && hasStayHistory) {
    return [
      { icon: '🏠', label: 'Lihat katalog kamar', desc: 'Jelajahi kamar yang tersedia dan ajukan pemesanan baru.', to: '/rooms' },
      { icon: '🧾', label: 'Riwayat tagihan', desc: 'Lihat tagihan lama dan status pembayaran sebelumnya.', to: '/portal/invoices' },
    ];
  }
  if (stage === 'browsing') {
    return [
      { icon: '🛏️', label: 'Pilih kamar', desc: 'Lihat katalog kamar yang tersedia dan pilih yang cocok untuk Anda.', to: '/rooms' },
      { icon: '📝', label: 'Ajukan pemesanan', desc: 'Isi form pemesanan. Admin akan me-review dan menyetujui booking Anda.', to: '' },
      { icon: '💰', label: 'Bayar tagihan awal', desc: 'Setelah disetujui, kirim bukti pembayaran DP 30% untuk konfirmasi.', to: '' },
    ];
  }
  if (stage === 'booking') {
    return [
      { icon: '👀', label: 'Pantau status', desc: 'Admin sedang me-review pemesanan Anda. Cek status di halaman ini secara berkala.', to: '/portal/bookings' },
      { icon: '💳', label: 'Bayar tagihan', desc: 'Setelah disetujui, segera bayar tagihan awal dan kirim bukti pembayaran.', to: '/portal/invoices' },
      { icon: '🔑', label: 'Dapat kunci', desc: 'Setelah pembayaran diverifikasi, kamar siap ditempati. Selamat datang di KOST48!', to: '' },
    ];
  }
  return [];
}

/** Hanya tampil di route utama tenant — jangan dominasi semua halaman. */
const MAIN_TENANT_ROUTES = ['/portal/stay', '/portal/bookings'];

export default function GettingStartedGuide({ stage, hasStayHistory = false }: { stage: TenantPortalStage; hasStayHistory?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const steps = getSteps(stage, hasStayHistory);
  if (!steps.length) return null;

  // AO-04: jangan dominasi setiap route — hanya di halaman panduan utama.
  if (!MAIN_TENANT_ROUTES.includes(location.pathname)) return null;

  const isExTenant = stage === 'browsing' && hasStayHistory;

  return (
    <section className="getting-started-guide" aria-label="Panduan memulai">
      <div className="getting-started-head">
        <span className="page-eyebrow">{isExTenant ? 'Riwayat kamu' : 'Panduan memulai'}</span>
        <h3>{isExTenant ? 'Kamu pernah menghuni KOST48' : stage === 'browsing' ? '3 langkah menuju kamar Anda' : 'Status pemesanan Anda'}</h3>
      </div>
      <div className="getting-started-steps">
        {steps.map((step, i) => (
          <button
            key={i}
            type="button"
            className="getting-started-step"
            disabled={!step.to}
            onClick={() => step.to ? navigate(step.to) : undefined}
          >
            <span className="getting-started-step-num">{i + 1}</span>
            <span className="getting-started-step-icon" aria-hidden="true">{step.icon}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.desc}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
