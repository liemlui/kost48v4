import { Card } from 'react-bootstrap';

// Kebijakan perbaikan GRATIS (permintaan owner: "pelayanan penggantian lampu jika putus secara free").
// Tujuan: dorong penghuni melapor tanpa ragu biaya. Dipakai di halaman Laporan & Panduan tenant.

const FREE_ITEMS: Array<{ icon: string; label: string }> = [
  { icon: '💡', label: 'Ganti lampu putus' },
  { icon: '🚰', label: 'Keran / kran bocor atau seret' },
  { icon: '🚿', label: 'Shower / pancuran rusak' },
  { icon: '💧', label: 'Kebocoran / rembes air' },
  { icon: '🚽', label: 'Flush / kloset bermasalah' },
  { icon: '🔌', label: 'Stop kontak / saklar bermasalah' },
];

export default function FreeRepairPolicyCard({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="border-0 mb-3" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)' }}>
      <Card.Body className={compact ? 'py-2 px-3' : ''}>
        <div className="d-flex align-items-start gap-2">
          <span style={{ fontSize: '1.4rem' }} aria-hidden>🛠️</span>
          <div className="flex-grow-1">
            <div className="fw-semibold">Perbaikan ini <span className="text-success">GRATIS</span> — laporkan saja 🙂</div>
            <div className="text-muted small mb-2">
              Kerusakan wajar pemakaian ditangani tanpa biaya. Jangan ragu melapor agar kamarmu tetap nyaman.
            </div>
            <div className="d-flex flex-wrap gap-2">
              {FREE_ITEMS.map((it) => (
                <span key={it.label} className="badge bg-white text-success border d-inline-flex align-items-center gap-1">
                  <span aria-hidden>{it.icon}</span> {it.label}
                </span>
              ))}
            </div>
            {!compact ? (
              <div className="text-muted mt-2" style={{ fontSize: '0.72rem' }}>
                Catatan: kerusakan karena kelalaian/kerusakan disengaja dapat dikenakan biaya sesuai kondisi.
              </div>
            ) : null}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
