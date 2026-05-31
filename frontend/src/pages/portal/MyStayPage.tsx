import { type ReactNode, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
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
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getKost48RoomCover } from '../../data/kost48Assets';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  return formatDateTimeWib(value);
}

function formatEndHelper(value?: string | null) {
  const meta = getDeadlineMeta(value, 'Akhir masa sewa');
  if (!meta.hasDate) return 'Belum diisi';
  return meta.relativeLabel;
}

function formatRoomFloorLabel(floor?: string | number | null): string | null {
  if (floor === null || floor === undefined || floor === '') return null;
  const s = String(floor).trim();
  return /^lantai\s/i.test(s) ? s : `Lantai ${s}`;
}

function friendlyItemStatus(status?: string | null): string {
  const s = (status ?? '').toUpperCase().trim();
  if (s === 'GOOD') return 'Baik';
  if (s === 'DAMAGED') return 'Rusak';
  if (s === 'MISSING') return 'Hilang';
  if (s === 'NEEDS_REPAIR' || s === 'MAINTENANCE') return 'Perlu dicek';
  if (!s || /^[A-Z_]+$/.test(s)) return 'Terpasang';
  return status ?? 'Terpasang';
}

function inventoryStatusClass(status?: string | null): string {
  const s = (status ?? '').toUpperCase().trim();
  if (s === 'GOOD') return 'inv-status-good';
  if (s === 'DAMAGED' || s === 'MISSING') return 'inv-status-bad';
  if (s === 'NEEDS_REPAIR' || s === 'MAINTENANCE') return 'inv-status-check';
  return 'inv-status-normal';
}

function getRoomFacilitySummary(stay: Stay) {
  const room = stay.room;
  const floorLabel = formatRoomFloorLabel(room?.floor);
  const roomBits = [room?.name, floorLabel, tenantPricingTermLabel(stay.pricingTerm)]
    .filter(Boolean) as string[];
  return {
    roomInfo: roomBits.length ? roomBits.join(' · ') : 'Detail kamar aktif',
  };
}

function getRoomFacilities(stay: Stay) {
  return (stay.room?.facilities ?? [])
    .filter((f: any) => f.publicVisible !== false)
    .map((f: any) => ({
      id: `facility-${f.id}`,
      name: (f.name ?? '') as string,
    }))
    .filter((f) => f.name.trim() !== '');
}

function getInventoryItems(roomItems: RoomItem[], stayRoomId: number | string | undefined) {
  if (!stayRoomId) return [];
  return roomItems
    .filter((item) => Number(item.roomId) === Number(stayRoomId))
    .map((item) => ({
      id: `room-item-${item.id}`,
      name: (item as any).item?.name ?? `Barang #${item.itemId}`,
      qty: item.qty ?? 1,
      status: item.status ?? '',
    }));
}

function getRoomCoverImage(stay: Stay) {
  const firstImage = stay.room?.images?.[0];
  const resolved = firstImage ? resolveAbsoluteFileUrl(firstImage) : null;
  return resolved ?? getKost48RoomCover(stay.room?.code, stay.room?.name);
}

function getRoomPriceFacts(stay: Stay): { label: string; value: ReactNode }[] {
  const room = stay.room;
  const agreedRent = stay.agreedRentAmountRupiah ?? room?.monthlyRateRupiah ?? 0;
  return [
    { label: 'Sewa disepakati', value: <CurrencyDisplay amount={agreedRent} showZero={false} /> },
    { label: 'Deposit titipan', value: <CurrencyDisplay amount={stay.depositAmountRupiah ?? room?.defaultDepositRupiah} showZero={false} /> },
    { label: 'Listrik / kWh', value: <CurrencyDisplay amount={room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} showZero={false} /> },
    { label: 'Air / m³', value: <CurrencyDisplay amount={room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} showZero={false} /> },
  ];
}

// ── constants ─────────────────────────────────────────────────────────────────

const TENANT_SERVICE_IDEAS = [
  { label: 'WiFi tambahan', helper: 'Untuk kerja, kuliah, atau streaming.' },
  { label: 'Laundry', helper: 'Bantu hemat waktu penghuni.' },
  { label: 'Cleaning kamar', helper: 'Bantuan bersih-bersih berkala.' },
  { label: 'Air galon', helper: 'Pengingat dan layanan isi ulang.' },
  { label: 'Parkir tambahan', helper: 'Untuk kendaraan ekstra.' },
  { label: 'Pindah kamar', helper: 'Minat upgrade atau pindah kamar.' },
];

// ── ActiveStayContent ─────────────────────────────────────────────────────────

function ActiveStayContent({ stay }: { stay: Stay }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

  // ── derived data ────────────────────────────────────────────────────────────

  const invoices = invoicesQuery.data?.items ?? [];
  const paymentSubmissions = submissionsQuery.data?.items ?? [];
  const pendingReviewInvoiceIds = useMemo(() => getPendingReviewInvoiceIds(paymentSubmissions), [paymentSubmissions]);
  const openInvoices = useMemo(() => getOpenTenantInvoices(invoices), [invoices]);
  const payableOpenInvoices = useMemo(() => openInvoices.filter((inv) => getInvoiceTotalAmount(inv) > 0), [openInvoices]);
  const zeroAmountOpenInvoices = useMemo(() => openInvoices.filter((inv) => getInvoiceTotalAmount(inv) <= 0), [openInvoices]);
  const payableInvoices = useMemo(() => payableOpenInvoices.filter((inv) => isPayableInvoiceStatus(inv.status)), [payableOpenInvoices]);
  const primaryInvoice = useMemo(() => getPrimaryTenantInvoice(payableOpenInvoices, pendingReviewInvoiceIds), [payableOpenInvoices, pendingReviewInvoiceIds]);
  const primaryZeroAmountInvoice = zeroAmountOpenInvoices.find((inv) => isPayableInvoiceStatus(inv.status) && !pendingReviewInvoiceIds.has(inv.id)) ?? null;
  const overdueInvoice = useMemo(() => payableOpenInvoices.find((inv) => isTenantInvoiceOverdue(inv)) ?? null, [payableOpenInvoices]);
  const reviewCount = openInvoices.filter((inv) => pendingReviewInvoiceIds.has(inv.id)).length;

  const rawRoomItems = roomItemsQuery.data?.items ?? [];
  const renewRequests = renewRequestsQuery.data?.items ?? [];
  const checkoutRequests = checkoutRequestsQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];

  const inventoryItems = useMemo(() => getInventoryItems(rawRoomItems, stay.roomId), [rawRoomItems, stay.roomId]);
  const roomFacilities = useMemo(() => getRoomFacilities(stay), [stay]);
  const roomCoverImage = useMemo(() => getRoomCoverImage(stay), [stay]);
  const roomSummary = useMemo(() => getRoomFacilitySummary(stay), [stay]);
  const priceFacts = useMemo(() => getRoomPriceFacts(stay), [stay]);

  const activeTickets = useMemo(() => tickets.filter((t) => !['CLOSED', 'CANCELLED'].includes((t.status ?? '').toUpperCase())), [tickets]);
  const pendingRenewRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'PENDING');
  const rejectedRequest = renewRequests.find((rr) => rr.stayId === stay.id && rr.status === 'REJECTED');
  const pendingCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'PENDING');
  const approvedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'APPROVED');
  const rejectedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'REJECTED');

  const endDays = getDaysUntilTenantDate(stay.plannedCheckOutDate);
  const endMeta = getDeadlineMeta(stay.plannedCheckOutDate, 'Akhir masa sewa');
  const endHelper = formatEndHelper(stay.plannedCheckOutDate);
  const nearEnd = endDays !== null && endDays >= 0 && endDays <= 10;
  const hasOpenInvoice = openInvoices.length > 0;
  const hasPayableOpenInvoice = payableOpenInvoices.length > 0;
  const hasZeroAmountOpenInvoice = zeroAmountOpenInvoices.length > 0;
  const canRequestRenew = !pendingRenewRequest && !hasOpenInvoice && !approvedCheckoutRequest && !pendingCheckoutRequest;
  const canRequestCheckout = !pendingCheckoutRequest && !approvedCheckoutRequest && !hasOpenInvoice;

  // ── guide state ──────────────────────────────────────────────────────────────

  const guide = (() => {
    if (reviewCount) {
      return {
        tone: 'info' as const,
        title: 'Bukti pembayaran sedang diperiksa',
        message: TENANT_PAYMENT_REVIEW_MESSAGE,
        primaryLabel: 'Lihat Tagihan',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (overdueInvoice) {
      return {
        tone: 'danger' as const,
        title: 'Tagihan terlambat',
        message: 'Bayar dan kirim bukti sekarang.',
        primaryLabel: 'Bayar & Kirim Bukti',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: `/portal/invoices/${overdueInvoice.id}`,
      };
    }
    if (payableInvoices.length) {
      return {
        tone: 'warning' as const,
        title: 'Ada tagihan aktif',
        message: 'Selesaikan tagihan dulu sebelum perpanjang atau ajukan keluar.',
        primaryLabel: 'Bayar & Kirim Bukti',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: primaryInvoice ? `/portal/invoices/${primaryInvoice.id}` : '/portal/invoices',
      };
    }
    if (primaryZeroAmountInvoice) {
      return {
        tone: 'info' as const,
        title: 'Tagihan perlu dicek admin',
        message: `${primaryZeroAmountInvoice.invoiceNumber ?? 'Tagihan'} belum punya nominal. Kamu tidak perlu bayar sampai admin memperbarui nominalnya.`,
        primaryLabel: 'Lihat Detail Tagihan',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: `/portal/invoices/${primaryZeroAmountInvoice.id}`,
      };
    }
    if (pendingRenewRequest) {
      return {
        tone: 'info' as const,
        title: 'Perpanjangan menunggu admin',
        message: endMeta.hasDate ? `Tunggu admin. Akhir masa sewa ${endMeta.absoluteLabel}.` : 'Tunggu admin catat meter.',
        primaryLabel: 'Lihat Tagihan',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: '/portal/invoices',
      };
    }
    if (pendingCheckoutRequest) {
      return {
        tone: 'info' as const,
        title: 'Pengajuan keluar sedang diproses',
        message: 'Tunggu keputusan admin. Tidak perlu ajukan ulang.',
        primaryLabel: 'Lihat Tagihan',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: '/portal/invoices',
      };
    }
    if (nearEnd && canRequestRenew) {
      return {
        tone: 'warning' as const,
        title: 'Masa sewa hampir selesai',
        message: 'Pilih perpanjang atau keluar sebelum akhir masa sewa.',
        primaryLabel: 'Ajukan Perpanjangan',
        onAction: () => setShowRenewModal(true),
        primaryRoute: undefined as string | undefined,
      };
    }
    if (nearEnd) {
      return {
        tone: 'warning' as const,
        title: 'Masa sewa hampir selesai',
        message: 'Selesaikan tagihan terlebih dahulu sebelum mengajukan perpanjangan.',
        primaryLabel: 'Lihat Tagihan',
        onAction: undefined as (() => void) | undefined,
        primaryRoute: '/portal/invoices',
      };
    }
    return {
      tone: 'safe' as const,
      title: 'Masa sewa aman',
      message: 'Tidak ada aksi mendesak hari ini.',
      primaryLabel: 'Lihat Tagihan',
      onAction: undefined as (() => void) | undefined,
      primaryRoute: '/portal/invoices',
    };
  })();

  const blockedText = hasPayableOpenInvoice
    ? 'Ada tagihan aktif. Selesaikan tagihan dulu sebelum ajukan perpanjangan atau keluar.'
    : hasZeroAmountOpenInvoice
      ? 'Ada tagihan tanpa nominal pembayaran. Hubungi admin agar statusnya dicek sebelum ajukan perpanjangan atau keluar.'
      : null;

  const showRenewSecondary = canRequestRenew && !guide.onAction;
  const showCheckoutSecondary = canRequestCheckout;

  // ── helpers for fact-chip tones ─────────────────────────────────────────────

  const billTone = payableOpenInvoices.length
    ? (reviewCount ? 'tone-info' : 'tone-warning')
    : hasZeroAmountOpenInvoice
      ? 'tone-info'
      : 'tone-success';

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Compact dossier card ── */}
      <Card className="tenant-stay-main-card border-0 mb-3">
        <Card.Body>

          {/* Guide / status banner */}
          <div className={`tenant-stay-guide-banner tenant-stay-guide-${guide.tone}`}>
            <div className="tenant-stay-guide-body">
              <strong>{guide.title}</strong>
              <span>{compactText(guide.message, 90)}</span>
            </div>
            <Button
              variant={guide.tone === 'danger' ? 'danger' : 'primary'}
              size="sm"
              onClick={guide.onAction ?? (() => navigate(guide.primaryRoute ?? '/portal/invoices'))}
            >
              {guide.primaryLabel}
            </Button>
          </div>

          {/* ── Compact room header: thumbnail + key info ── */}
          <div className="tenant-room-dossier-header">
            <div className="tenant-room-dossier-thumb-wrap">
              {roomCoverImage ? (
                <img
                  src={roomCoverImage}
                  alt={`Foto kamar ${stay.room?.code ?? stay.roomId}`}
                  className="tenant-room-dossier-thumb"
                />
              ) : (
                <div className="tenant-room-dossier-thumb-empty">K48</div>
              )}
            </div>
            <div className="tenant-room-dossier-info">
              <div className="command-eyebrow">Kamar Saya</div>
              <div className="tenant-room-dossier-title-row">
                <h3 className="tenant-room-dossier-name">Kamar {stay.room?.code ?? stay.roomId}</h3>
                <StatusBadge status={stay.status} tone="tenant" domain="stay" />
              </div>
              <div className="tenant-room-dossier-room-meta">{roomSummary.roomInfo}</div>
              <div className={`tenant-room-dossier-end-date${nearEnd ? ' near-end' : ''}`}>
                <span>Akhir sewa:</span>
                {' '}<strong>{stay.plannedCheckOutDate ? formatDate(stay.plannedCheckOutDate) : 'Belum ditentukan'}</strong>
                {endHelper !== 'Belum diisi' && <em> · {endHelper}</em>}
              </div>
            </div>
          </div>

          {/* ── Mini fact chips: tagihan, laporan, deposit ── */}
          <div className="tenant-stay-facts-strip">
            <button
              type="button"
              className={`tenant-stay-fact-chip ${billTone}`}
              onClick={() => navigate('/portal/invoices')}
              aria-label="Lihat tagihan"
            >
              <span className="fact-label">Tagihan</span>
              <strong>{payableOpenInvoices.length}</strong>
              <small>{reviewCount ? 'Diperiksa' : payableOpenInvoices.length ? 'Perlu dibayar' : 'Beres'}</small>
            </button>
            <button
              type="button"
              className={`tenant-stay-fact-chip${activeTickets.length ? ' tone-info' : ''}`}
              onClick={() => navigate('/portal/tickets')}
              aria-label="Lihat laporan aktif"
            >
              <span className="fact-label">Laporan</span>
              <strong>{activeTickets.length}</strong>
              <small>{activeTickets.length ? 'Aktif' : 'Tidak ada'}</small>
            </button>
            <div className="tenant-stay-fact-chip tone-info" role="status" aria-label="Dana titipan">
              <span className="fact-label">Dana titipan</span>
              <strong><CurrencyDisplay amount={stay.depositAmountRupiah} /></strong>
              <small>Titipan</small>
            </div>
          </div>

          {/* ── Dossier: Info kamar ── */}
          <details className="tenant-dossier-section">
            <summary><span>Info kamar</span></summary>
            <div className="tenant-dossier-body">
              <div className="tenant-dossier-tarif">
                {stay.room?.name ? (
                  <div className="tenant-dossier-tarif-row">
                    <span>Nama kamar</span><strong>{stay.room.name}</strong>
                  </div>
                ) : null}
                {stay.room?.floor ? (
                  <div className="tenant-dossier-tarif-row">
                    <span>Lantai</span><strong>{formatRoomFloorLabel(stay.room.floor)}</strong>
                  </div>
                ) : null}
                <div className="tenant-dossier-tarif-row">
                  <span>Jenis masa sewa</span><strong>{tenantPricingTermLabel(stay.pricingTerm)}</strong>
                </div>
                <div className="tenant-dossier-tarif-row">
                  <span>Akhir masa sewa</span>
                  <strong>{formatDate(stay.plannedCheckOutDate) || 'Belum ditentukan'}</strong>
                </div>
                {stay.notes ? (
                  <div className="tenant-dossier-tarif-row">
                    <span>Catatan</span><strong>{stay.notes}</strong>
                  </div>
                ) : null}
              </div>
            </div>
          </details>

          {/* ── Dossier: Fasilitas ── */}
          <details className="tenant-dossier-section">
            <summary>
              <span>Fasilitas</span>
              {roomFacilities.length > 0 && (
                <span className="tenant-dossier-count">{roomFacilities.length}</span>
              )}
            </summary>
            <div className="tenant-dossier-body">
              {roomFacilities.length > 0 ? (
                <div className="tenant-dossier-facilities">
                  {roomFacilities.map((f) => (
                    <span key={f.id} className="tenant-dossier-facility-chip">{f.name}</span>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">
                  Belum ada fasilitas tercatat. Hubungi pengelola jika data kamar tidak sesuai.
                </p>
              )}
            </div>
          </details>

          {/* ── Dossier: Inventaris kamar ── */}
          <details className="tenant-dossier-section">
            <summary>
              <span>Inventaris kamar</span>
              {inventoryItems.length > 0 && (
                <span className="tenant-dossier-count">{inventoryItems.length} jenis</span>
              )}
            </summary>
            <div className="tenant-dossier-body">
              {roomItemsQuery.isLoading ? (
                <p className="text-muted small mb-0">Memuat data inventaris...</p>
              ) : inventoryItems.length > 0 ? (
                <>
                  <div className="tenant-dossier-inventory-list">
                    {inventoryItems.map((item) => (
                      <div key={item.id} className="tenant-dossier-inventory-row">
                        <strong>{item.name}</strong>
                        <span className="inv-qty">{item.qty} unit</span>
                        <span className={`inv-status ${inventoryStatusClass(item.status)}`}>
                          {friendlyItemStatus(item.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="tenant-installed-items-report mt-2"
                    onClick={() => navigate('/portal/tickets')}
                  >
                    Laporkan masalah →
                  </button>
                </>
              ) : (
                <p className="text-muted small mb-0">
                  Data inventaris belum diisi. Kamu tetap bisa melaporkan barang rusak atau hilang lewat{' '}
                  <button
                    type="button"
                    className="tenant-installed-items-report"
                    onClick={() => navigate('/portal/tickets')}
                  >
                    Laporan Saya
                  </button>.
                </p>
              )}
            </div>
          </details>

          {/* ── Dossier: Tarif & dana titipan ── */}
          <details className="tenant-dossier-section">
            <summary><span>Tarif & dana titipan</span></summary>
            <div className="tenant-dossier-body">
              <div className="tenant-dossier-tarif">
                {priceFacts.map((fact) => (
                  <div key={fact.label} className="tenant-dossier-tarif-row">
                    <span>{fact.label}</span>
                    <strong>{fact.value}</strong>
                  </div>
                ))}
              </div>
              <p className="text-muted small mb-0 mt-2">
                Dana titipan diproses saat keluar final, setelah semua tagihan selesai.
              </p>
            </div>
          </details>

          {blockedText ? <Alert variant="warning" className="tenant-short-alert mt-3 mb-0">{blockedText}</Alert> : null}
        </Card.Body>
      </Card>

      {/* ── Secondary actions ── */}
      {(showRenewSecondary || showCheckoutSecondary) && (
        <div className="tenant-stay-secondary-actions mb-3">
          {showRenewSecondary && (
            <Button variant="outline-primary" size="sm" onClick={() => setShowRenewModal(true)}>
              Ajukan Perpanjangan
            </Button>
          )}
          {showCheckoutSecondary && (
            <Button variant="outline-secondary" size="sm" onClick={() => setShowCheckoutModal(true)}>
              Ajukan Keluar
            </Button>
          )}
        </div>
      )}

      {/* ── State alerts ── */}
      {pendingRenewRequest ? <Alert variant="info" className="tenant-short-alert mb-3">Perpanjangan sedang diproses admin.</Alert> : null}
      {approvedCheckoutRequest ? <Alert variant="info" className="tenant-short-alert mb-3">Tanggal keluar disetujui. Admin akan finalkan setelah tagihan beres.</Alert> : null}
      {rejectedRequest ? <Alert variant="warning" className="tenant-short-alert mb-3">Pengajuan perpanjangan ditolak.</Alert> : null}
      {rejectedCheckoutRequest ? <Alert variant="warning" className="tenant-short-alert mb-3">Pengajuan keluar ditolak.</Alert> : null}

      {/* ── Alur masa sewa — collapsible ── */}
      <details className="tenant-stay-journey mb-3">
        <summary><span>Alur masa sewa</span></summary>
        <div className="tenant-stay-journey-body">
          <div className="tenant-simple-steps">
            <div className="done"><strong>Masuk kamar</strong><span>Selesai</span></div>
            <div className="done"><strong>Masa sewa</strong><span>Aktif</span></div>
            <div className={hasPayableOpenInvoice ? 'waiting' : 'done'}>
              <strong>Tagihan</strong>
              <span>{hasPayableOpenInvoice ? 'Perlu dibayar' : hasZeroAmountOpenInvoice ? 'Dicek admin' : 'Beres'}</span>
            </div>
            <div className={pendingRenewRequest || pendingCheckoutRequest ? 'waiting' : 'idle'}>
              <strong>Perpanjang / keluar</strong>
              <span>{pendingRenewRequest ? 'Perpanjangan diproses' : pendingCheckoutRequest ? 'Keluar diproses' : hasOpenInvoice ? 'Tunggu tagihan beres' : 'Bisa diajukan'}</span>
            </div>
          </div>
          <p className="small text-muted mb-0 mt-3">
            Deposit adalah dana titipan dan diproses saat keluar final, setelah semua tagihan selesai.
          </p>
        </div>
      </details>

      {/* ── Layanan tambahan ── */}
      <Card className="tenant-engagement-card border-0 mb-4">
        <Card.Body>
          <div className="tenant-engagement-head">
            <div>
              <div className="command-eyebrow">Bantu KOST48 jadi lebih nyaman</div>
              <h3>Layanan tambahan yang mungkin kamu butuhkan</h3>
              <p>Minat dan saran dikirim lewat Laporan Saya dan dibaca pengelola.</p>
            </div>
            <Button variant="outline-primary" size="sm" onClick={() => navigate('/portal/tickets')}>
              Kirim via Laporan
            </Button>
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
            Saran dibaca pengelola. Belum tersimpan otomatis sebagai survey; kirim lewat Laporan Saya.
          </div>
        </Card.Body>
      </Card>

      <RenewRequestModal show={showRenewModal} onHide={() => setShowRenewModal(false)} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['portal-renew-requests', stay.id] });
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      }} stay={stay} />
      <CheckoutRequestModal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests', stay.id] });
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
      }} stay={stay} />
    </>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

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
    console.warn('[MyStayPage] stay tenantId mismatch', { stayTenantId: stay.tenantId, currentUserTenantId: tenantId });
  }

  const roomStatusOccupied = stay && stayBelongsToUser
    ? (stay.room?.status ?? '').toUpperCase() === 'OCCUPIED'
    : false;

  return (
    <div>
      {!(stage === 'occupied' && stay && stayBelongsToUser && roomStatusOccupied) ? (
        <PageHeader
          eyebrow="Portal Penghuni"
          title="Panduan Kos Saya"
          description="Kamar, tagihan, laporan, dan aksi penting."
        />
      ) : null}

      {stage !== 'occupied' ? (
        <EmptyState
          icon="🏠"
          title="Kamu belum memiliki masa sewa aktif"
          description="Pilih kamar atau lanjutkan pemesanan yang sedang berjalan."
          action={{
            label: stage === 'booking' ? 'Buka Pemesanan Saya' : 'Lihat Kamar',
            onClick: () => navigate(stage === 'booking' ? '/portal/bookings' : '/rooms'),
          }}
        />
      ) : null}

      {stage === 'occupied' && query.isLoading ? (
        <div className="py-5 text-center"><Spinner animation="border" /></div>
      ) : null}

      {stage === 'occupied' && query.isError ? (() => {
        const err = query.error as any;
        const status = err?.response?.status ?? err?.response?.data?.statusCode;
        if (status === 404) {
          return (
            <EmptyState
              icon="🏠"
              title="Kamu belum memiliki masa sewa aktif"
              description="Kalau sedang booking, buka Pemesanan Saya."
              action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
            />
          );
        }
        return (
          <Alert variant="danger" className="mt-4">
            <div className="fw-semibold">Gagal memuat data masa sewa</div>
            <div className="small mt-1">{getApiErrorMessage(err, 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.')}</div>
          </Alert>
        );
      })() : null}

      {stay && !stayBelongsToUser ? (
        <EmptyState
          icon="🔒"
          title="Kamu belum memiliki masa sewa aktif"
          description="Pilih kamar dari katalog publik untuk mulai booking."
          action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      {stay && stayBelongsToUser && !roomStatusOccupied ? (
        <EmptyState
          icon="📅"
          title="Pemesanan kamu masih diproses"
          description="Selesaikan pembayaran awal dari Pemesanan Saya sebelum masuk ke panduan masa sewa."
          action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
        />
      ) : null}

      {stay && stayBelongsToUser && roomStatusOccupied ? (
        <ActiveStayContent stay={stay} />
      ) : null}
    </div>
  );
}
