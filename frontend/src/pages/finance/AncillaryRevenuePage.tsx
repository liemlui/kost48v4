import { Card, Col, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import StatusBadge from '../../components/common/StatusBadge';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ClickableRow from '../../components/common/ClickableRow';
import { StatusStrip } from '../../components/workspace';
import { fetchAncillaryRevenueStreams } from '../../api/ancillaryRevenue';
import { formatCompactRupiah } from '../../utils/formatCurrency';
import type { AncillaryRevenueStream } from '../../api/ancillaryRevenue';

const financeMenu = [
  { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Invoice sewa, deposit, utility, dan blocker checkout.', to: '/invoices', active: false },
  { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar yang perlu diverifikasi.', to: '/payment-submissions/review', active: false },
  { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: false },
  { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'WiFi aktif; add-on lain masih roadmap.', to: '/ancillary-revenue', active: true },
  { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional kos dan COGS layanan tambahan.', to: '/expenses', active: false },
  { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang sudah tercatat.', to: '/invoice-payments', active: false },
  { id: 'accounting', icon: '📘', label: 'Setup Accounting', helper: 'Cash/bank, opening balance, readiness, dan trial balance.', to: '/finance/accounting-setup', active: false },
];

export default function AncillaryRevenuePage() {
  const navigate = useNavigate();
  useDocumentTitle('Pendapatan Tambahan');
  const { data, isLoading } = useQuery({
    queryKey: ['ancillary-revenue', 'streams'],
    queryFn: fetchAncillaryRevenueStreams,
    staleTime: 30_000,
  });

  const activeStreams: AncillaryRevenueStream[] = data?.activeStreams ?? [];
  const futureStreams: AncillaryRevenueStream[] = data?.futureStreams ?? [];

  return (
    <FeatureErrorBoundary>
      <div>
      <PageHeader
        eyebrow="Finance · Revenue Stream"
        title="Pendapatan Tambahan"
        description="Untuk sekarang, revenue tambahan yang benar-benar aktif adalah Voucher WiFi. Layanan lain disimpan sebagai roadmap agar admin tidak melihat aksi palsu."
        actionLabel="Catat Voucher WiFi"
        onAction={() => navigate('/wifi-sales')}
      />

      <div className="admin-area-internal-menu finance-inline-menu" aria-label="Sub-menu Finance">
        <div className="admin-area-internal-menu-head">
          <span>Menu Finance</span>
          <small>Pilih data finance yang ingin dibuka.</small>
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

      {isLoading ? (
        <div className="p-4"><TableSkeleton rows={3} cols={6} /></div>
      ) : (
        <>
          <StatusStrip
            items={[
              { id: 'ready', label: 'Aktif sekarang', value: activeStreams.length, helper: 'Voucher WiFi sudah bisa dicatat', tone: 'success' },
              { id: 'future', label: 'Belum aktif', value: futureStreams.length, helper: 'Belum dibuka untuk admin', tone: 'info' },
            ]}
          />

          <Row className="g-3">
            <Col lg={8}>
              <Card className="content-card border-0 h-100">
                <Card.Body>
                  <div className="table-meta align-items-start">
                    <div>
                      <div className="panel-title">Revenue stream yang aktif</div>
                      <div className="panel-subtitle">Hanya aksi yang sudah bisa dipakai admin ditampilkan sebagai jalur kerja utama.</div>
                    </div>
                  </div>
                  <Table hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th>Layanan</th>
                        <th>Pembeli</th>
                        <th>Status</th>
                        <th>Bulan Ini</th>
                        <th>Total</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStreams.map((stream) => (
                        <ClickableRow key={stream.id} onClick={() => navigate(stream.route)} label={`Buka detail ${stream.name}`}>
                          <td><strong>{stream.icon} {stream.name}</strong></td>
                          <td>{stream.buyer}</td>
                          <td><StatusBadge status="SUCCESS" customLabel={stream.status} /></td>
                          <td>
                            {stream.stats ? (
                              <span>{stream.stats.thisMonth.count} penjualan · {formatCompactRupiah(stream.stats.thisMonth.revenue)}</span>
                            ) : '—'}
                          </td>
                          <td>
                            {stream.stats ? (
                              <span>{stream.stats.total.count} total · {formatCompactRupiah(stream.stats.total.revenue)}</span>
                            ) : '—'}
                          </td>
                          <td>{stream.note}</td>
                        </ClickableRow>
                      ))}
                    </tbody>
                  </Table>

                  {futureStreams.length > 0 && (
                    <div className="ancillary-roadmap-box mt-3">
                      <div>
                        <strong>Rencana pendapatan tambahan berikutnya</strong>
                        <p className="mb-0 text-muted">Layanan ini direncanakan untuk dikembangkan ke depannya.</p>
                      </div>
                      <div className="ancillary-roadmap-grid">
                        {futureStreams.map((stream) => (
                          <div key={stream.id} className="ancillary-roadmap-item">
                            <span aria-hidden="true">{stream.icon}</span>
                            <div>
                              <strong>{stream.name}</strong>
                              <small>{stream.note}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
    </FeatureErrorBoundary>
  );
}
