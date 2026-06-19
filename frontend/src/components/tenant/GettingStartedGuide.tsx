import { useNavigate } from 'react-router-dom';
import type { TenantPortalStage } from '../../hooks/useTenantPortalStage';

type Step = { icon: string; label: string; desc: string; to?: string };

function getSteps(stage: TenantPortalStage): Step[] {
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

export default function GettingStartedGuide({ stage }: { stage: TenantPortalStage }) {
  const navigate = useNavigate();
  const steps = getSteps(stage);
  if (!steps.length) return null;

  return (
    <section className="getting-started-guide" aria-label="Panduan memulai">
      <div className="getting-started-head">
        <span className="page-eyebrow">Panduan memulai</span>
        <h3>{stage === 'browsing' ? '3 langkah menuju kamar Anda' : 'Status pemesanan Anda'}</h3>
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
