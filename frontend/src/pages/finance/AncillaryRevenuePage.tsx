import { Card, Col, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { StatusStrip } from '../../components/workspace';

const revenueStreams = [
  { id: 'wifi', icon: '📶', name: 'Voucher WiFi', buyer: 'Tenant / tamu', status: 'Sudah ada backend', route: '/wifi-sales', note: 'Gunakan WifiSale yang sudah tersedia sebagai quick win.' },
  { id: 'laundry', icon: '🧺', name: 'Laundry', buyer: 'Tenant', status: 'Future AncillarySale', route: '', note: 'Idealnya input berat, vendor cost, dan status jemput/antar.' },
  { id: 'gallon', icon: '💧', name: 'Air Galon', buyer: 'Tenant', status: 'Future AncillarySale + stok', route: '', note: 'Butuh stok galon isi/kosong dan status antar.' },
  { id: 'cleaning', icon: '🧹', name: 'Jasa Bersih Kamar', buyer: 'Tenant', status: 'Future order + assign staff', route: '', note: 'Butuh jadwal, staff, dan status selesai.' },
  { id: 'parking', icon: '🅿️', name: 'Parkir Tambahan', buyer: 'Tenant', status: 'Future recurring sale', route: '', note: 'Butuh plat nomor, slot, periode, dan approval admin.' },
  { id: 'guest', icon: '🛌', name: 'Extra Guest', buyer: 'Tenant', status: 'Future approval', route: '', note: 'Butuh tanggal, jumlah orang, dan aturan jam/tamu.' },
  { id: 'key', icon: '🔑', name: 'Penggantian Kunci/Kartu', buyer: 'Tenant', status: 'Future admin-only', route: '', note: 'Terkait keamanan, kartu lama harus dinonaktifkan.' },
  { id: 'linen', icon: '🧺', name: 'Sewa Linen / Handuk', buyer: 'Tenant', status: 'Future stockable service', route: '', note: 'Butuh stok, durasi sewa, dan biaya hilang/rusak.' },
  { id: 'snack', icon: '🥤', name: 'Snack / Minuman', buyer: 'Tenant / staff', status: 'Future stock sale', route: '', note: 'Butuh stok, expiry, dan pencatatan kas kecil.' },
];

const financeMenu = [
  { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Invoice sewa, deposit, utility, dan blocker checkout.', to: '/invoices', active: false },
  { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar yang perlu diverifikasi.', to: '/payment-submissions/review', active: false },
  { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: false },
  { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'Laundry, galon, cleaning, parkir, dan add-on lain.', to: '/ancillary-revenue', active: true },
  { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional kos dan COGS layanan tambahan.', to: '/expenses', active: false },
  { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang sudah tercatat.', to: '/invoice-payments', active: false },
];

export default function AncillaryRevenuePage() {
  const navigate = useNavigate();
  const readyCount = revenueStreams.filter((item) => item.route).length;
  const futureCount = revenueStreams.length - readyCount;

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Revenue Stream"
        title="Pendapatan Tambahan"
        description="Peta layanan tambahan kos: WiFi sudah bisa dicatat sekarang, sementara laundry, galon, cleaning, parkir, dan add-on lain disiapkan untuk model AncillaryProduct + AncillarySale."
        actionLabel="Catat Voucher WiFi"
        onAction={() => navigate('/wifi-sales')}
      />

      <div className="admin-area-internal-menu finance-inline-menu" aria-label="Sub-menu Finance">
        <div className="admin-area-internal-menu-head">
          <span>Menu Finance</span>
          <small>Tagihan, review pembayaran, voucher WiFi, pendapatan tambahan, pengeluaran, dan riwayat tetap satu area.</small>
        </div>
        <div className="admin-area-internal-menu-scroll">
          {financeMenu.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`admin-area-internal-chip info ${item.active ? 'is-active' : ''}`.trim()}
              onClick={() => navigate(item.to)}
              title={item.helper}
            >
              <span className="admin-area-internal-chip-main">
                <span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span>
                <span className="admin-area-internal-label">{item.label}</span>
              </span>
              <small>{item.helper}</small>
            </button>
          ))}
        </div>
      </div>

      <StatusStrip
        items={[
          { id: 'ready', label: 'Bisa dipakai sekarang', value: readyCount, helper: 'Voucher WiFi sudah tersedia di backend', tone: 'success' },
          { id: 'future', label: 'Future add-on', value: futureCount, helper: 'Butuh AncillaryProduct + AncillarySale', tone: 'info' },
          { id: 'model', label: 'Model jangka menengah', value: 'Generic', helper: 'Satu tabel produk + satu tabel penjualan', tone: 'warning' },
        ]}
      />

      <Row className="g-3">
        <Col lg={8}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta align-items-start">
                <div>
                  <div className="panel-title">Katalog revenue stream kos</div>
                  <div className="panel-subtitle">Klik layanan yang sudah aktif. Layanan future disiapkan sebagai PRD backend, bukan dipaksa ke schema lama.</div>
                </div>
              </div>
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Layanan</th>
                    <th>Pembeli</th>
                    <th>Status implementasi</th>
                    <th>Catatan operasional</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueStreams.map((stream) => (
                    <tr key={stream.id} className={stream.route ? 'clickable-row' : undefined} onClick={() => stream.route ? navigate(stream.route) : undefined}>
                      <td><strong>{stream.icon} {stream.name}</strong></td>
                      <td>{stream.buyer}</td>
                      <td><span className={`status-soft-pill ${stream.route ? 'success' : 'info'}`}>{stream.status}</span></td>
                      <td>{stream.note}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="panel-title mb-2">Model data yang disarankan</div>
              <p className="text-muted mb-3">Jangan buat tabel terpisah untuk setiap layanan. Gunakan model generik setelah WiFi quick win stabil.</p>
              <div className="ancillary-model-box">
                <strong>AncillaryProduct</strong>
                <span>name, category, price, unit, hasStock, isActive</span>
              </div>
              <div className="ancillary-model-box">
                <strong>AncillarySale</strong>
                <span>productId, tenantId, qty, unitPrice, totalPrice, status, orderSource</span>
              </div>
              <div className="small text-muted mt-3">
                Short-term: pakai WifiSale yang sudah ada. Medium-term: migrasi bertahap ke AncillaryProduct + AncillarySale tanpa menghapus histori WiFi.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
