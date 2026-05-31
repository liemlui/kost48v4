import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import TenantGuidePanel from '../../components/tenant/TenantGuidePanel';
import { getResource, listResource } from '../../api/resources';
import { listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import RenewRequestModal from '../../components/tenant/RenewRequestModal';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, RenewRequest, RoomItem, Stay, Ticket } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { firstUsefulActions } from '../../utils/actionDedup';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getKost48RoomCover } from '../../data/kost48Assets';

function formatDate(value?: string | null) {
  return formatDateTimeWib(value);
}

function formatEndHelper(value?: string | null) {
  const meta = getDeadlineMeta(value, 'Akhir masa sewa');
  if (!meta.hasDate) return 'Belum diisi';
  return meta.relativeLabel;
}

function formatStayDuration(value?: string | null) {
  if (!value) return 'baru mulai';
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return 'baru mulai';
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const months = Math.floor(days / 30);
  const restDays = days % 30;
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const restMonths = months % 12;
    return `${years} tahun${restMonths ? ` ${restMonths} bulan` : ''}`;
  }
  if (months > 0) return `${months} bulan${restDays ? ` ${restDays} hari` : ''}`;
  if (days > 0) return `${days} hari`;
  return 'hari pertama';
}

function getPaymentHealthPercent(invoices: Invoice[], pendingReviewInvoiceIds: Set<number>) {
  if (!invoices.length) return 100;
  const healthy = invoices.filter((invoice) => invoice.status === 'PAID' || pendingReviewInvoiceIds.has(invoice.id)).length;
  return Math.round((healthy / invoices.length) * 100);
}

function getRoomFacilitySummary(stay: Stay) {
  const room = stay.room;
  const facilities = (room?.facilities ?? [])
    .filter((facility) => facility.publicVisible !== false)
    .map((facility) => facility.name)
    .filter(Boolean)
    .slice(0, 3);
  const roomBits = [room?.name, room?.floor ? `Lantai ${room.floor}` : null, tenantPricingTermLabel(stay.pricingTerm)]
    .filter(Boolean) as string[];
  const facilityText = facilities.length ? facilities.join(' · ') : 'Fasilitas mengikuti data kamar';
  return {
    roomInfo: roomBits.length ? roomBits.join(' · ') : 'Detail kamar aktif',
    facilityText,
  };
}

function getRoomCoverImage(stay: Stay) {
  const firstImage = stay.room?.images?.[0];
  const resolved = firstImage ? resolveAbsoluteFileUrl(firstImage) : null;
  return resolved ?? getKost48RoomCover(stay.room?.code, stay.room?.name);
}

function getRoomPriceFacts(stay: Stay) {
  const room = stay.room;
  const agreedRent = stay.agreedRentAmountRupiah ?? room?.monthlyRateRupiah ?? 0;
  return [
    { label: 'Sewa disepakati', value: <CurrencyDisplay amount={agreedRent} showZero={false} /> },
    { label: 'Deposit titipan', value: <CurrencyDisplay amount={stay.depositAmountRupiah ?? room?.defaultDepositRupiah} showZero={false} /> },
    { label: 'Listrik / kWh', value: <CurrencyDisplay amount={room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} showZero={false} /> },
    { label: 'Air / m³', value: <CurrencyDisplay amount={room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} showZero={false} /> },
  ];
}

function getInstalledRoomItems(roomItems: RoomItem[], stay: Stay) {
  const fromItems = roomItems
    .filter((item) => Number(item.roomId) === Number(stay.roomId))
    .map((item) => ({
      id: `room-item-${item.id}`,
      name: item.item?.name ?? `Barang #${item.itemId}`,
      qty: item.qty ?? 1,
      status: item.status ?? 'Terpasang',
      note: item.note,
    }))
    .slice(0, 6);

  if (fromItems.length) return fromItems;

  return (stay.room?.facilities ?? [])
    .filter((facility) => facility.publicVisible !== false)
    .map((facility) => ({
      id: `facility-${facility.id}`,
      name: facility.name,
      qty: facility.quantity ?? 1,
      status: facility.condition ?? 'Terpasang',
      note: facility.note,
    }))
    .slice(0, 6);
}

const TENANT_SERVICE_IDEAS = [
  { label: 'WiFi tambahan', helper: 'Untuk kerja, kuliah, atau streaming.' },
  { label: 'Laundry', helper: 'Bantu hemat waktu penghuni.' },
  { label: 'Cleaning kamar', helper: 'Bantuan bersih-bersih berkala.' },
  { label: 'Air galon', helper: 'Pengingat dan layanan isi ulang.' },
  { label: 'Parkir tambahan', helper: 'Untuk kendaraan ekstra.' },
  { label: 'Pindah kamar', helper: 'Minat upgrade atau pindah kamar.' },
];

function StayJourneyCard({ stay, paymentHealthPercent }: { stay: Stay; paymentHealthPercent: number }) {
  const duration = formatStayDuration(stay.checkInDate);
  return (
    <Card className="tenant-journey-card border-0 mb-4">
      <Card.Body>
        <div className="tenant-journey-layout">
          <div>
            <div className="command-eyebrow">Perjalanan Tinggal</div>
            <h3>Terima kasih sudah tinggal di KOST48</h3>
            <p>Kamu sudah bersama kami selama <strong>{duration}</strong>. Cek status kamar dan aksi penting dari satu halaman.</p>
          </div>
          <div className="tenant-payment-ring" style={{ '--p': `${paymentHealthPercent}%` } as CSSProperties}>
            <div><strong>{paymentHealthPercent}%</strong><span>Kesehatan tagihan</span></div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}


function DataField({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '-' || value === '') return null;
  return (
    <div className="tenant-detail-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SimpleMetric({ label, value, helper, to, tone = 'info' }: { label: string; value: ReactNode; helper?: string; to?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={`tenant-simple-metric tone-${tone}`} onClick={to ? () => navigate(to) : undefined} disabled={!to}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </button>
  );
}

function ActiveStayContent({ stay }: { stay: Stay }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const renewRequestsQuery = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['portal-renew-requests', stay.id],
    queryFn: () => listMyRenewRequests(),
    refetchOnWindowFocus: true,
  });

  const invoicesQuery = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['portal-invoices', stay.id],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const submissionsQuery = useQuery({
    queryKey: ['portal-payment-submissions'],
    queryFn: () => listMyPaymentSubmissions(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const checkoutRequestsQuery = useQuery<PaginatedResponse<CheckoutRequest>>({
    queryKey: ['portal-checkout-requests', stay.id],
    queryFn: () => listMyCheckoutRequests(),
    refetchOnWindowFocus: true,
  });

  const ticketsQuery = useQuery<PaginatedResponse<Ticket>>({
    queryKey: ['portal-tickets', stay.id],
    queryFn: () => listResource<Ticket>('/tickets/my'),
    staleTime: 45_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const roomItemsQuery = useQuery<PaginatedResponse<RoomItem>>({
    queryKey: ['portal-room-items', stay.roomId],
    queryFn: () => listResource<RoomItem>('/room-items/my-room'),
    enabled: Boolean(stay.roomId),
    staleTime: 120_000,
    retry: false,
  });

  const invoices = invoicesQuery.data?.items ?? [];
  const paymentSubmissions = submissionsQuery.data?.items ?? [];
  const pendingReviewInvoiceIds = useMemo(() => getPendingReviewInvoiceIds(paymentSubmissions), [paymentSubmissions]);
  const openInvoices = useMemo(() => getOpenTenantInvoices(invoices), [invoices]);
  const payableOpenInvoices = useMemo(() => openInvoices.filter((invoice) => getInvoiceTotalAmount(invoice) > 0), [openInvoices]);
  const zeroAmountOpenInvoices = useMemo(() => openInvoices.filter((invoice) => getInvoiceTotalAmount(invoice) <= 0), [openInvoices]);
  const payableInvoices = useMemo(() => payableOpenInvoices.filter((invoice) => isPayableInvoiceStatus(invoice.status)), [payableOpenInvoices]);
  const primaryInvoice = useMemo(() => getPrimaryTenantInvoice(payableOpenInvoices, pendingReviewInvoiceIds), [payableOpenInvoices, pendingReviewInvoiceIds]);
  const primaryZeroAmountInvoice = zeroAmountOpenInvoices.find((invoice) => isPayableInvoiceStatus(invoice.status) && !pendingReviewInvoiceIds.has(invoice.id)) ?? null;
  const overdueInvoice = useMemo(() => payableOpenInvoices.find((invoice) => isTenantInvoiceOverdue(invoice)) ?? null, [payableOpenInvoices]);
  const reviewCount = openInvoices.filter((invoice) => pendingReviewInvoiceIds.has(invoice.id)).length;

  const renewRequests = renewRequestsQuery.data?.items ?? [];
  const checkoutRequests = checkoutRequestsQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const roomItems = roomItemsQuery.data?.items ?? [];
  const installedRoomItems = getInstalledRoomItems(roomItems, stay);
  const installedItemsPreview = installedRoomItems.slice(0, 4);
  const installedItemsHiddenCount = Math.max(0, installedRoomItems.length - installedItemsPreview.length);
  const roomCoverImage = getRoomCoverImage(stay);
  const activeTickets = tickets.filter((ticket) => !['CLOSED', 'CANCELLED'].includes((ticket.status ?? '').toUpperCase()));
  const pendingRenewRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'PENDING');
  const rejectedRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'REJECTED');
  const pendingCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'PENDING');
  const approvedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'APPROVED');
  const rejectedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'REJECTED');

  const handleRenewSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['portal-renew-requests', stay.id] });
    queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
    queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
  };

  const handleCheckoutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests', stay.id] });
    queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
  };

  const endDays = getDaysUntilTenantDate(stay.plannedCheckOutDate);
  const endMeta = getDeadlineMeta(stay.plannedCheckOutDate, 'Akhir masa sewa');
  const endHelper = formatEndHelper(stay.plannedCheckOutDate);
  const nearEnd = endDays !== null && endDays >= 0 && endDays <= 10;
  const hasOpenInvoice = openInvoices.length > 0;
  const hasPayableOpenInvoice = payableOpenInvoices.length > 0;
  const hasZeroAmountOpenInvoice = zeroAmountOpenInvoices.length > 0;
  const canRequestRenew = !pendingRenewRequest && !hasOpenInvoice && !approvedCheckoutRequest && !pendingCheckoutRequest;
  const canRequestCheckout = !pendingCheckoutRequest && !approvedCheckoutRequest && !hasOpenInvoice;

  const guide = (() => {
    if (reviewCount) {
      return {
        tone: 'info' as const,
        title: 'Bukti pembayaran sedang diperiksa',
        message: TENANT_PAYMENT_REVIEW_MESSAGE,
        primaryLabel: 'Lihat Tagihan',
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (overdueInvoice) {
      return {
        tone: 'danger' as const,
        title: 'Tagihan terlambat',
        message: 'Bayar dan kirim bukti sekarang.',
        primaryLabel: 'Bayar & Kirim Bukti',
        primaryRoute: `/portal/invoices/${overdueInvoice.id}`,
      };
    }
    if (payableInvoices.length) {
      return {
        tone: 'warning' as const,
        title: 'Ada tagihan aktif',
        message: 'Selesaikan tagihan dulu sebelum perpanjang atau ajukan keluar.',
        primaryLabel: 'Bayar & Kirim Bukti',
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (primaryZeroAmountInvoice) {
      return {
        tone: 'info' as const,
        title: 'Tagihan perlu dicek admin',
        message: `${primaryZeroAmountInvoice.invoiceNumber ?? 'Tagihan'} belum punya nominal pembayaran. Kamu tidak perlu bayar sampai admin memperbarui nominalnya.`,
        primaryLabel: 'Lihat Detail Tagihan',
        primaryRoute: `/portal/invoices/${primaryZeroAmountInvoice.id}`,
      };
    }
    if (pendingRenewRequest) {
      return {
        tone: 'info' as const,
        title: 'Perpanjangan menunggu admin',
        message: endMeta.hasDate ? `Tunggu admin. Akhir masa sewa ${endMeta.absoluteLabel}.` : 'Tunggu admin catat meter.',
        primaryLabel: 'Lihat Status',
        primaryRoute: '/portal/stay',
      };
    }
    if (pendingCheckoutRequest) {
      return {
        tone: 'info' as const,
        title: 'Pengajuan keluar sedang diproses',
        message: 'Tunggu keputusan admin. Tidak perlu ajukan ulang.',
        primaryLabel: 'Lihat Status',
        primaryRoute: '/portal/stay',
      };
    }
    if (nearEnd) {
      return {
        tone: 'warning' as const,
        title: 'Masa sewa hampir selesai',
        message: 'Pilih perpanjang atau keluar sebelum akhir masa sewa.',
        primaryLabel: 'Ajukan Perpanjangan',
        primaryRoute: '/portal/stay',
      };
    }
    return {
      tone: 'safe' as const,
      title: 'Masa sewa aman',
      message: 'Tidak ada aksi mendesak hari ini.',
      primaryLabel: 'Lihat Tagihan',
      primaryRoute: '/portal/invoices',
    };
  })();

  const guideActions = firstUsefulActions([
    { label: guide.primaryLabel, onClick: () => navigate(guide.primaryRoute), variant: guide.tone === 'danger' ? 'danger' : 'primary' },
    canRequestRenew ? { label: 'Ajukan Perpanjangan', onClick: () => setShowRenewModal(true), variant: 'outline-primary' } : null,
    canRequestCheckout ? { label: 'Ajukan Keluar', onClick: () => setShowCheckoutModal(true), variant: 'outline-warning' } : null,
  ].filter(Boolean) as { label: string; onClick: () => void; variant: string }[], 2);

  const blockedText = hasPayableOpenInvoice
    ? 'Ada tagihan aktif. Selesaikan tagihan dulu sebelum ajukan perpanjangan atau keluar.'
    : hasZeroAmountOpenInvoice
      ? 'Ada tagihan tanpa nominal pembayaran. Hubungi admin agar statusnya dicek sebelum ajukan perpanjangan atau keluar.'
      : null;
  const paymentHealthPercent = getPaymentHealthPercent(invoices, pendingReviewInvoiceIds);
  const roomSummary = getRoomFacilitySummary(stay);
  const tenantDisplayName = stay.tenant?.fullName || user?.fullName || 'Penghuni KOST48';
  const tenantContact = stay.tenant?.email || stay.tenant?.phone || user?.email || 'Kontak terdaftar';

  return (
    <>
      <TenantGuidePanel
        title={guide.title}
        message={compactText(guide.message, 82)}
        tone={guide.tone}
        actions={guideActions}
      />


      <Card className="tenant-simple-card tenant-room-transparency-card border-0 mb-4">
        <Card.Body>
          <div className="tenant-simple-header">
            <div>
              <div className="command-eyebrow">Kamar Saya</div>
              <h3>Kamar {stay.room?.code ?? stay.roomId}</h3>
              <p>Foto, fasilitas, dan barang kamar yang tercatat.</p>
            </div>
            <div className="tenant-simple-badges">
              <StatusBadge status={stay.status} tone="tenant" domain="stay" />
              {stay.depositStatus ? <StatusBadge status={stay.depositStatus} tone="tenant" domain="deposit" /> : null}
            </div>
          </div>

          <div className="tenant-room-transparency">
            <div className="tenant-room-photo-card">
              {roomCoverImage ? (
                <img src={roomCoverImage} alt={`Foto kamar ${stay.room?.code ?? stay.roomId}`} />
              ) : (
                <div className="tenant-room-photo-empty">
                  <span>K48</span>
                  <strong>Foto kamar</strong>
                  <small>Admin bisa melengkapi foto agar penghuni lebih yakin.</small>
                </div>
              )}
            </div>
            <div className="tenant-room-booking-info">
              <div className="tenant-room-booking-head">
                <div>
                  <span>Info seperti saat booking</span>
                  <strong>{roomSummary.roomInfo}</strong>
                  <small>{roomSummary.facilityText}</small>
                </div>
                <Button variant="outline-primary" size="sm" onClick={() => navigate('/portal/tickets')}>Lapor</Button>
              </div>
              <div className="tenant-room-price-grid">
                {getRoomPriceFacts(stay).map((fact) => (
                  <div key={fact.label}>
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tenant-installed-items-panel">
            <div className="tenant-installed-items-head">
              <div>
                <span>Barang terpasang di kamar</span>
                <strong>{installedRoomItems.length ? `${installedRoomItems.length} jenis barang tercatat` : 'Data barang sedang dilengkapi'}</strong>
              </div>
              <small>Kalau barang rusak, hilang, atau tidak sesuai, laporkan lewat aplikasi agar staff bisa cek.</small>
            </div>
            {installedRoomItems.length ? (
              <div className="tenant-installed-items-list">
                {installedItemsPreview.map((item) => (
                  <div key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.qty ? `${item.qty} unit` : 'Terpasang'} · {getStatusLabel(item.status, item.status, { tone: 'tenant' })}</span>
                  </div>
                ))}
                {installedItemsHiddenCount ? (
                  <button type="button" className="tenant-installed-items-more" onClick={() => navigate('/portal/tickets')}>
                    +{installedItemsHiddenCount} barang lain · laporkan jika ada masalah
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="tenant-installed-items-empty">
                Data inventaris kamar belum tampil. Kamu tetap bisa melaporkan barang rusak/hilang lewat Laporan Saya.
              </div>
            )}
          </div>

          <div className="tenant-simple-grid">
            <SimpleMetric label="Akhir masa sewa" value={formatDate(stay.plannedCheckOutDate)} helper={endHelper} tone={nearEnd ? 'warning' : 'info'} />
            <SimpleMetric label="Tagihan perlu dibayar" value={payableOpenInvoices.length} helper={reviewCount ? 'Bukti sedang diperiksa' : hasZeroAmountOpenInvoice ? 'Ada yang dicek admin' : payableOpenInvoices.length ? 'Perlu dibayar' : 'Tidak ada'} tone={payableOpenInvoices.length ? (reviewCount ? 'info' : 'warning') : hasZeroAmountOpenInvoice ? 'info' : 'success'} to="/portal/invoices" />
            <SimpleMetric label="Laporan aktif" value={activeTickets.length} helper={activeTickets.length ? 'Sedang dipantau' : 'Tidak ada'} tone={activeTickets.length ? 'info' : 'success'} to="/portal/tickets" />
            <SimpleMetric label="Deposit" value={<CurrencyDisplay amount={stay.depositAmountRupiah} />} helper={getStatusLabel(stay.depositStatus, undefined, { tone: 'tenant', domain: 'deposit' })} tone="info" />
          </div>

          {blockedText ? <Alert variant="warning" className="tenant-short-alert mt-3 mb-0">{blockedText}</Alert> : null}
        </Card.Body>
      </Card>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="panel-title mb-2">Status masa sewa</div>
          <div className="tenant-simple-steps">
            <div className="done"><strong>Masuk kamar</strong><span>Selesai</span></div>
            <div className="done"><strong>Masa sewa</strong><span>Aktif</span></div>
            <div className={hasPayableOpenInvoice ? 'waiting' : 'done'}><strong>Tagihan</strong><span>{hasPayableOpenInvoice ? 'Perlu dibayar' : hasZeroAmountOpenInvoice ? 'Dicek admin' : 'Beres'}</span></div>
            <div className={pendingRenewRequest || pendingCheckoutRequest ? 'waiting' : 'idle'}><strong>Perpanjang / keluar</strong><span>{pendingRenewRequest ? 'Perpanjangan diproses' : pendingCheckoutRequest ? 'Ajukan keluar diproses' : hasOpenInvoice ? 'Tunggu tagihan beres' : 'Bisa diajukan'}</span></div>
          </div>
          <p className="small text-muted mb-0 mt-3">Deposit adalah dana titipan dan diproses saat keluar final, setelah semua tagihan selesai.</p>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <details className="tenant-details-disclosure">
            <summary>Detail lainnya</summary>
            <Row className="g-3 mt-2">
              <Col md={6}>
                <DataField label="Nama kamar" value={stay.room?.name} />
                <DataField label="Lantai" value={stay.room?.floor} />
                <DataField label="Jenis masa sewa" value={tenantPricingTermLabel(stay.pricingTerm)} />
              </Col>
              <Col md={6}>
                <DataField label="Tarif listrik / kWh" value={<CurrencyDisplay amount={stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} />} />
                <DataField label="Tarif air / m³" value={<CurrencyDisplay amount={stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} />} />
                <DataField label="Catatan" value={stay.notes} />
              </Col>
            </Row>
          </details>
        </Card.Body>
      </Card>

      {pendingRenewRequest ? <Alert variant="info" className="tenant-short-alert">Perpanjangan sedang diproses admin.</Alert> : null}
      {approvedCheckoutRequest ? <Alert variant="info" className="tenant-short-alert">Tanggal keluar disetujui. Admin akan finalkan setelah tagihan beres.</Alert> : null}
      {rejectedRequest ? <Alert variant="warning" className="tenant-short-alert">Pengajuan perpanjangan ditolak.</Alert> : null}
      {rejectedCheckoutRequest ? <Alert variant="warning" className="tenant-short-alert">Pengajuan keluar ditolak.</Alert> : null}

      <Card className="tenant-engagement-card border-0 mb-4">
        <Card.Body>
          <div className="tenant-engagement-head">
            <div>
              <div className="command-eyebrow">Bantu KOST48 jadi lebih nyaman</div>
              <h3>Layanan tambahan yang mungkin kamu butuhkan</h3>
              <p>Kami ingin tahu kebutuhan penghuni. Untuk sekarang, minat dan saran bisa dikirim lewat Laporan Saya.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/portal/tickets')}>Kirim Saran / Minat</Button>
          </div>
          <div className="tenant-service-interest-grid">
            {TENANT_SERVICE_IDEAS.slice(0, 4).map((service) => (
              <div key={service.label} className="tenant-service-interest-chip">
                <strong>{service.label}</strong>
                <span>{service.helper}</span>
              </div>
            ))}
          </div>
          <details className="tenant-service-extra-details">
            <summary>Lihat ide layanan lain</summary>
            <div className="tenant-service-interest-grid mt-2">
              {TENANT_SERVICE_IDEAS.slice(4).map((service) => (
                <div key={service.label} className="tenant-service-interest-chip">
                  <strong>{service.label}</strong>
                  <span>{service.helper}</span>
                </div>
              ))}
            </div>
          </details>
          <div className="tenant-engagement-note">
            Belum tersimpan otomatis sebagai survey. Kirim lewat Laporan Saya agar pengelola bisa membaca.
          </div>
        </Card.Body>
      </Card>


      <RenewRequestModal show={showRenewModal} onHide={() => setShowRenewModal(false)} onSuccess={handleRenewSuccess} stay={stay} />
      <CheckoutRequestModal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} onSuccess={handleCheckoutSuccess} stay={stay} />
    </>
  );
}

export default function MyStayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const userId = user?.id;
  const tenantId = user?.tenantId;

  const query = useQuery({
    queryKey: ['portal-stay', { userId, tenantId }],
    queryFn: () => getResource<Stay>('/stays/me/current'),
    enabled: Boolean(userId) && stage === 'occupied',
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });

  const stay = query.data;
  const stayBelongsToUser = stay ? stay.tenantId === tenantId : false;

  if (stay && !stayBelongsToUser && import.meta.env.DEV) {
    console.warn('[MyStayPage] Returned stay tenantId mismatch:', { stayTenantId: stay.tenantId, currentUserTenantId: tenantId });
  }

  const roomStatusOccupied = stay && stayBelongsToUser ? (stay.room?.status ?? '').toUpperCase() === 'OCCUPIED' : false;

  return (
    <div>
      {!(stage === 'occupied' && stay && stayBelongsToUser && roomStatusOccupied) ? (
        <PageHeader
          eyebrow="Portal Penghuni"
          title="Panduan Kos Saya"
          description="Kamar, tagihan, laporan, dan aksi penting."
        />
      ) : null}
      {stage !== 'occupied' ? <EmptyState icon="🏠" title="Kamu belum memiliki masa sewa aktif" description="Pilih kamar atau lanjutkan pemesanan yang sedang berjalan." action={{ label: stage === 'booking' ? 'Buka Pemesanan Saya' : 'Lihat Kamar', onClick: () => navigate(stage === 'booking' ? '/portal/bookings' : '/rooms') }} /> : null}
      {stage === 'occupied' && query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {stage === 'occupied' && query.isError ? (() => {
        const err = query.error as any;
        const status = err?.response?.status ?? err?.response?.data?.statusCode;
        if (status === 404) {
          return <EmptyState icon="🏠" title="Kamu belum memiliki masa sewa aktif" description="Kalau sedang booking, buka Pemesanan Saya." action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} />;
        }
        return <Alert variant="danger" className="mt-4"><div className="fw-semibold">Gagal memuat data masa sewa</div><div className="small mt-1">{getApiErrorMessage(err, 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.')}</div></Alert>;
      })() : null}
      {stay && !stayBelongsToUser ? <EmptyState icon="🔒" title="Kamu belum memiliki masa sewa aktif" description="Pilih kamar dari katalog publik untuk mulai booking." action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }} /> : null}
      {stay && stayBelongsToUser && !roomStatusOccupied ? <EmptyState icon="📅" title="Pemesanan kamu masih diproses" description="Selesaikan pembayaran awal dari Pemesanan Saya sebelum masuk ke panduan masa sewa." action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }} /> : null}
      {stay && stayBelongsToUser && roomStatusOccupied ? <ActiveStayContent stay={stay} /> : null}
    </div>
  );
}
