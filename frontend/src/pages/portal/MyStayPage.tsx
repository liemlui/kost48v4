import { type ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import { getResource, listResource } from '../../api/resources';
import { decideRenewRequest, listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import { getProfileCompleteness } from '../../api/tenants';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { fetchPublicConfig } from '../../api/settings';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import RenewRequestModal from '../../components/tenant/RenewRequestModal';
import MeterCycleModal from '../../components/stays/MeterCycleModal';
import StayHistoryTimeline, { type StayJourneyStep } from '../../components/stays/StayHistoryTimeline';
import SatisfactionSurveyCard from '../../components/tenant/SatisfactionSurveyCard';
import LeaseProgressHero from '../../components/portal/stay/LeaseProgressHero';
import UtilityInsightCard from '../../components/portal/stay/UtilityInsightCard';
import StayQuickActions from '../../components/portal/stay/StayQuickActions';
import StayAnnouncementBanner from '../../components/portal/stay/StayAnnouncementBanner';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, MeterReading, RenewRequest, RoomItem, Stay, Ticket } from '../../types';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import {
  PROFILE_FIELD_LABELS, formatDate, toDateKey, getMeterWindow, getLatestUtilityReading, formatRoomFloorLabel,
  friendlyItemStatus, inventoryStatusClass, getRoomFacilitySummary, getRoomFacilities, getInventoryItems, getRoomCoverImage, getRoomPriceFacts,
} from './myStayShared';
import { acCapacityLabel, roomBathroomLabel, roomSizeLabel, roomMaxOccupants } from '../../utils/roomFacilitySpec';
import { formatAcHoursEstimate } from '../../utils/acUsageEstimate';

// ── ActiveStayContent ─────────────────────────────────────────────────────────

function ActiveStayContent({ stay }: { stay: Stay }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showMeter, setShowMeter] = useState(false);

  // R-16: "Info kamar" dan "Fasilitas" terbuka by default; preferensi disimpan di sessionStorage.
  const SESSION_KEY = 'kost48_accordion_open';
  const [openAccordionKeys, setOpenAccordionKeys] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved) as string[];
    } catch { /* ignore */ }
    return ['info', 'fasilitas']; // default buka dua panel teratas
  });
  const handleAccordionChange = useCallback((keys: string | string[] | null | undefined) => {
    const next = Array.isArray(keys) ? keys : keys ? [keys] : [];
    setOpenAccordionKeys(next);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const renewRequestsQuery = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['portal-renew-requests', stay.id],
    queryFn: () => listMyRenewRequests(),
    refetchOnWindowFocus: true,
  });

  // Kuota listrik gratis (untuk estimasi jam AC/hari). Settable owner.
  const publicConfigQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 300_000,
  });
  const freeKwh = publicConfigQuery.data?.freeElectricityKwhPerMonth ?? 30;

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

  const decideRenewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'YA' | 'TIDAK' }) =>
      decideRenewRequest(id, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-renew-requests', stay.id] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices', stay.id] });
      queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
    },
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

  const meterWindow = useMemo(() => getMeterWindow(stay.plannedCheckOutDate), [stay.plannedCheckOutDate]);
  const meterReadingsQuery = useQuery<MeterReading[]>({
    queryKey: ['portal-meter-readings', stay.roomId, meterWindow.startKey, meterWindow.endKey],
    queryFn: () => getMeterReadingsByRoom(stay.roomId, {
      from: meterWindow.startKey,
      to: meterWindow.endKey,
      limit: 50,
    }),
    enabled: Boolean(stay.roomId),
    staleTime: 60_000,
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
  const monthMeterReadings = meterReadingsQuery.data ?? [];
  const electricityReadingThisMonth = useMemo(
    () => getLatestUtilityReading(monthMeterReadings, 'ELECTRICITY'),
    [monthMeterReadings],
  );
  const waterReadingThisMonth = useMemo(
    () => getLatestUtilityReading(monthMeterReadings, 'WATER'),
    [monthMeterReadings],
  );

  const activeTickets = useMemo(() => tickets.filter((t) => !['CLOSED', 'CANCELLED'].includes((t.status ?? '').toUpperCase())), [tickets]);

  // Indikator "update baru": dot merah jika ada tiket yang berubah sejak terakhir tenant lihat halaman ini
  const LAST_STAY_VIEW_KEY = 'kost48_last_stay_view';
  const hasNewTicketUpdates = useMemo(() => {
    try {
      const lastView = sessionStorage.getItem(LAST_STAY_VIEW_KEY);
      if (!lastView) return activeTickets.length > 0; // pertama kali lihat = semua dianggap baru
      const lastViewMs = Number(lastView);
      if (Number.isNaN(lastViewMs)) return false;
      return activeTickets.some((t) => {
        const updated = new Date(t.updatedAt ?? t.createdAt ?? 0).getTime();
        return updated > lastViewMs;
      });
    } catch { return false; }
  }, [activeTickets]);
  useEffect(() => {
    try { sessionStorage.setItem(LAST_STAY_VIEW_KEY, String(Date.now())); } catch { /* ignore */ }
  }, []);

  const activeRenewStatuses = ['PENDING', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED'];
  const pendingRenewRequest = renewRequests.find((rr) => rr.stayId === stay.id && activeRenewStatuses.includes(rr.status));
  const pendingDecisionRequest = pendingRenewRequest?.status === 'PENDING_DECISION' ? pendingRenewRequest : null;
  const rejectedRequest = renewRequests.find((rr) =>
    rr.stayId === stay.id && ['REJECTED', 'REJECTED_BY_TENANT', 'EXPIRED_PRIORITY', 'FORFEITED'].includes(rr.status),
  );
  const pendingCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'PENDING');
  const approvedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'APPROVED');
  const rejectedCheckoutRequest = checkoutRequests.find((cr) => cr.stayId === stay.id && cr.status === 'REJECTED');

  const endDays = getDaysUntilTenantDate(stay.plannedCheckOutDate);
  const nearEnd = endDays !== null && endDays >= 0 && endDays <= 10;
  const meterRecordedThisMonth = Boolean(electricityReadingThisMonth);
  const meterScheduleVariant = meterReadingsQuery.isError
    ? 'secondary'
    : meterRecordedThisMonth
      ? 'success'
      : nearEnd
        ? 'warning'
        : 'info';
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
      const renewMessage = pendingRenewRequest.status === 'PENDING_DECISION'
        ? 'Tentukan apakah kamu lanjut memperpanjang.'
        : pendingRenewRequest.status === 'AWAITING_DP'
          ? 'Bayar invoice DP penuh sebelum hari-H.'
          : pendingRenewRequest.settlementInvoiceId
            ? 'Pelunasan sedang menunggu verifikasi/finalisasi admin.'
            : 'DP sudah aman. Tunggu admin mencatat meter dan menerbitkan pelunasan.';
      return {
        tone: 'info' as const,
        title: 'Proses perpanjangan aktif',
        message: renewMessage,
        primaryLabel: pendingDecisionRequest ? 'Ya, Lanjut Perpanjangan' : 'Lihat Tagihan',
        onAction: pendingDecisionRequest
          ? () => decideRenewMutation.mutate({ id: pendingDecisionRequest.id, decision: 'YA' })
          : undefined as (() => void) | undefined,
        primaryRoute: pendingDecisionRequest ? undefined : '/portal/invoices',
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

  // Tombol perpanjangan SELALU tampil di halaman; nonaktif (dengan alasan) bila belum bisa diajukan.
  const renewDisabledReason = canRequestRenew
    ? undefined
    : (blockedText
      ?? (pendingRenewRequest
        ? 'Perpanjangan sedang diproses.'
        : (pendingCheckoutRequest || approvedCheckoutRequest)
          ? 'Sedang ada pengajuan keluar aktif.'
          : 'Belum bisa diajukan saat ini.'));

  // ── helpers for fact-chip tones ─────────────────────────────────────────────

  const billTone = payableOpenInvoices.length
    ? (reviewCount ? 'tone-info' : 'tone-warning')
    : hasZeroAmountOpenInvoice
      ? 'tone-info'
      : 'tone-success';

  const stayJourneySteps: StayJourneyStep[] = [
    {
      key: 'checkin',
      title: 'Masuk kamar',
      status: 'Selesai',
      tone: 'done',
      helper: formatDate(stay.checkInDate),
    },
    {
      key: 'lease',
      title: 'Masa sewa',
      status: 'Aktif',
      tone: nearEnd ? 'waiting' : 'active',
      helper: `s/d ${formatDate(stay.plannedCheckOutDate) || 'belum ditentukan'}`,
    },
    {
      key: 'billing',
      title: 'Tagihan',
      status: hasPayableOpenInvoice ? 'Perlu dibayar' : hasZeroAmountOpenInvoice ? 'Dicek admin' : 'Beres',
      tone: hasPayableOpenInvoice ? 'waiting' : hasZeroAmountOpenInvoice ? 'idle' : 'done',
      helper: hasOpenInvoice ? `${openInvoices.length} invoice aktif` : 'Tidak ada tagihan aktif',
    },
    {
      key: 'next',
      title: 'Perpanjang / keluar',
      status: pendingRenewRequest ? 'Perpanjangan diproses' : pendingCheckoutRequest ? 'Keluar diproses' : hasOpenInvoice ? 'Tunggu tagihan beres' : 'Bisa diajukan',
      tone: pendingRenewRequest || pendingCheckoutRequest || hasOpenInvoice ? 'waiting' : 'idle',
      helper: 'Aksi berikutnya mengikuti status tagihan',
    },
  ];

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Topbar PaymentUrgencyChip is the main assistant. Body stays compact. */}
      {nearEnd && !hasOpenInvoice ? (
        <Alert variant="warning" className="tenant-short-alert mb-3">
          Masa sewa hampir selesai. Ajukan perpanjangan atau keluar sebelum akhir masa sewa.
        </Alert>
      ) : null}

      {/* ── Hero: progres masa sewa + fact chips ── */}
      <Card className="tenant-stay-hero border-0 mb-3">
        <Card.Body>
          <LeaseProgressHero stay={stay} />
          {/* ── Mini fact chips: tagihan, laporan, deposit ── */}
          <div className="tenant-stay-facts-strip mt-3">
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
              className={`tenant-stay-fact-chip${hasNewTicketUpdates ? ' tone-warning' : activeTickets.length ? ' tone-info' : ''}`}
              onClick={() => navigate('/portal/tickets')}
              aria-label="Lihat laporan aktif"
            >
              <span className="fact-label">
                Laporan
                {hasNewTicketUpdates ? <span className="fact-dot" aria-label="Ada pembaruan baru" /> : null}
              </span>
              <strong>{activeTickets.length}</strong>
              <small>{hasNewTicketUpdates ? 'Ada update' : activeTickets.length ? 'Aktif' : 'Tidak ada'}</small>
            </button>
            <div className="tenant-stay-fact-chip tone-info" role="status" aria-label="Dana titipan">
              <span className="fact-label">Dana titipan</span>
              <strong>
                <CurrencyDisplay amount={stay.depositPaidAmountRupiah ?? 0} showZero />
                <span className="text-muted"> / <CurrencyDisplay amount={stay.depositAmountRupiah} /></span>
              </strong>
              <small>{Number(stay.depositPaidAmountRupiah ?? 0) > 0 ? 'Titipan' : 'Belum disetor'}</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ── Quick actions hub ── */}
      <StayQuickActions
        canRecordMeter={meterWindow.windowOpen}
        onCatatMeter={() => setShowMeter(true)}
        canRenew={canRequestRenew}
        renewDisabledReason={renewDisabledReason}
        onRenew={() => setShowRenewModal(true)}
        canCheckout={canRequestCheckout}
        onCheckout={() => setShowCheckoutModal(true)}
      />

      {/* ── Pengumuman terbaru ── */}
      <StayAnnouncementBanner />

      {/* ── Dashboard grid 2 kolom ── */}
      <div className="tenant-stay-dashboard-grid">
        <div className="tenant-stay-col-left">
          {/* ── Konsumsi listrik & air + estimasi ── */}
          <UtilityInsightCard
            stay={stay}
            readings={monthMeterReadings}
            isLoading={meterReadingsQuery.isLoading}
            isError={meterReadingsQuery.isError}
            canRecord={meterWindow.windowOpen}
            onCatatMeter={() => setShowMeter(true)}
          />

          {/* ── Compact dossier card ── */}
          <Card className="tenant-stay-main-card border-0">
            <Card.Body>

          {/* ── Compact room header: thumbnail + key info ── */}
          <div className="tenant-room-dossier-header">
            <div className="tenant-room-dossier-thumb-wrap">
              <SafeImage
                src={roomCoverImage}
                alt={`Foto kamar ${stay.room?.code ?? stay.roomId}`}
                className="tenant-room-dossier-thumb"
                placeholderClassName="tenant-room-dossier-thumb-empty"
                fallbackTitle="Foto kamar belum tersedia"
                fallbackDescription="Detail kamar tetap dapat dicek di bawah."
                resolveUrl={false}
              />
            </div>
            <div className="tenant-room-dossier-info">
              <div className="tenant-room-dossier-title-row">
                <h3 className="tenant-room-dossier-name">Kamar {stay.room?.code ?? stay.roomId}</h3>
                {/* Audit U-03: fase booking (kamar RESERVED) jangan tampil "Masa Sewa Aktif" —
                    kamar belum terkunci sebelum pembayaran disetujui (first-paid-wins). */}
                {stay.room?.status === 'RESERVED' ? (
                  <span className="badge text-bg-warning">Menunggu Pembayaran — kamar belum terkunci</span>
                ) : (
                  <StatusBadge status={stay.status} tone="tenant" domain="stay" />
                )}
              </div>
              <div className="tenant-room-dossier-room-meta">{roomSummary.roomInfo}</div>
            </div>
          </div>

          <Alert variant={meterScheduleVariant} className="tenant-short-alert mt-3 mb-0">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-semibold">
                  {meterReadingsQuery.isLoading
                    ? 'Mengecek meter...'
                    : meterReadingsQuery.isError
                      ? 'Status meter tidak tersedia'
                      : meterRecordedThisMonth
                        ? 'Meter bulan ini sudah dicatat ✓'
                        : 'Meter bulan ini belum dicatat'}
                </div>
                <div className="small">
                  {meterWindow.windowOpen
                    ? <>Jendela aktif: <strong>{formatDate(meterWindow.windowStartKey)}</strong> – <strong>{formatDate(meterWindow.windowEndKey)}</strong>.</>
                    : <>Buka pada <strong>{formatDate(meterWindow.windowStartKey)}</strong> · H-10 sebelum akhir sewa.</>
                  }
                </div>
                {electricityReadingThisMonth ? (
                  <div className="small text-muted">
                    Listrik: <strong>{String(electricityReadingThisMonth.readingValue)} kWh</strong> · {formatDate(electricityReadingThisMonth.readingAt)}
                    {waterReadingThisMonth ? ` · air ${String(waterReadingThisMonth.readingValue)} m³` : ''}
                  </div>
                ) : null}
              </div>
              <Button
                variant={meterRecordedThisMonth ? 'outline-success' : nearEnd ? 'warning' : 'outline-primary'}
                size="sm"
                disabled={!meterWindow.windowOpen}
                onClick={() => setShowMeter(true)}
                title={!meterWindow.windowOpen ? `Dibuka H-10 sebelum akhir sewa (${formatDate(meterWindow.windowStartKey)})` : undefined}
              >
                {meterRecordedThisMonth ? 'Catat Ulang' : 'Catat Meter'}
              </Button>
            </div>
          </Alert>

          {/* ── Detail kamar — accordion (R-16: "Info kamar" & "Fasilitas" buka by default; preferensi sessionStorage) */}
          <Accordion flush alwaysOpen activeKey={openAccordionKeys} onSelect={handleAccordionChange} className="tenant-dossier-accordion">
            <Accordion.Item eventKey="info">
              <Accordion.Header><span className="me-2">🏠</span> Info kamar</Accordion.Header>
              <Accordion.Body>
                <div className="tenant-dossier-tarif">
                  {stay.room?.floor ? (
                    <div className="tenant-dossier-tarif-row">
                      <span>Lantai</span><strong>{formatRoomFloorLabel(stay.room.floor)}</strong>
                    </div>
                  ) : null}
                  {stay.room ? (
                    <>
                      <div className="tenant-dossier-tarif-row">
                        <span>Kamar mandi</span><strong>{roomBathroomLabel(stay.room)}</strong>
                      </div>
                      <div className="tenant-dossier-tarif-row">
                        <span>Ukuran kamar</span>
                        <strong>{roomSizeLabel(stay.room)} · maks {roomMaxOccupants(stay.room)} orang</strong>
                      </div>
                      {stay.room.hasAc ? (
                        <div className="tenant-dossier-tarif-row">
                          <span>Pendingin</span><strong>AC {acCapacityLabel(stay.room)}</strong>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  <div className="tenant-dossier-tarif-row">
                    <span>Jenis masa sewa</span><strong>{tenantPricingTermLabel(stay.pricingTerm)}</strong>
                  </div>
                  <div className="tenant-dossier-tarif-row">
                    <span>Akhir masa sewa</span>
                    <strong>{formatDate(stay.plannedCheckOutDate) || 'Belum ditentukan'}</strong>
                  </div>
                  {stay.room?.hasAc ? (
                    <div className="tenant-dossier-tarif-row">
                      <span>Cuci AC terakhir</span>
                      <strong>
                        {stay.room.acLastCleanedAt ? formatDate(stay.room.acLastCleanedAt) : 'Belum tercatat'}
                        {stay.room.acLastCleanedAt && stay.room.acCleanIntervalDays ? (
                          <em className="text-muted">
                            {' '}· berikutnya ~{formatDate(new Date(new Date(stay.room.acLastCleanedAt).getTime() + stay.room.acCleanIntervalDays * 86400000).toISOString())}
                          </em>
                        ) : null}
                      </strong>
                    </div>
                  ) : null}
                  {stay.notes ? (
                    <div className="tenant-dossier-tarif-row">
                      <span>Catatan</span><strong>{stay.notes}</strong>
                    </div>
                  ) : null}
                </div>
                {stay.room?.hasAc ? (
                  <p className="text-muted small mb-0 mt-2" style={{ fontSize: '0.75rem' }}>
                    💡 Kuota gratis {formatAcHoursEstimate(freeKwh)}. Perkiraan; kuota mencakup seluruh listrik kamar.
                  </p>
                ) : null}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="fasilitas">
              <Accordion.Header>
                <span className="me-2">✨</span> Fasilitas
                {roomFacilities.length > 0 && (
                  <span className="tenant-dossier-count ms-2">{roomFacilities.length}</span>
                )}
              </Accordion.Header>
              <Accordion.Body>
                {roomFacilities.length > 0 ? (
                  <div className="tenant-dossier-facilities">
                    {roomFacilities.map((f) => (
                      <span
                        key={f.id}
                        className={`tenant-dossier-facility-chip${f.kind === 'STRUCTURAL' ? ' is-structural' : ''}`}
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">
                    Belum ada fasilitas tercatat. Hubungi pengelola jika data kamar tidak sesuai.
                  </p>
                )}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="inventaris">
              <Accordion.Header>
                <span className="me-2">📦</span> Inventaris kamar
                {inventoryItems.length > 0 && (
                  <span className="tenant-dossier-count ms-2">{inventoryItems.length} jenis</span>
                )}
              </Accordion.Header>
              <Accordion.Body>
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
                    Belum ada data. Laporkan barang rusak/hilang lewat{' '}
                    <button
                      type="button"
                      className="tenant-installed-items-report"
                      onClick={() => navigate('/portal/tickets')}
                    >
                      Lapor Masalah
                    </button>.
                  </p>
                )}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="tarif">
              <Accordion.Header><span className="me-2">💰</span> Tarif & dana titipan</Accordion.Header>
              <Accordion.Body>
                <div className="tenant-dossier-tarif-tiles">
                  {priceFacts.map((fact, i) => (
                    <div key={fact.label} className={`tenant-dossier-tarif-tile${i === 0 ? ' tile-primary' : ''}`}>
                      <span>{fact.label}</span>
                      <strong>{fact.value}</strong>
                    </div>
                  ))}
                </div>
                {/* Progres dana titipan: disetor vs target */}
                {(() => {
                  const target = Number(stay.depositAmountRupiah ?? 0);
                  const paid = Number(stay.depositPaidAmountRupiah ?? 0);
                  const pct = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 0;
                  return (
                    <div className="tenant-deposit-progress">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Dana titipan disetor</span>
                        <strong><CurrencyDisplay amount={paid} showZero /> / <CurrencyDisplay amount={target} /></strong>
                      </div>
                      <div className="tenant-deposit-bar"><div className="tenant-deposit-bar-fill" style={{ width: `${pct}%` }} /></div>
                      <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.75rem' }}>
                        Diproses saat keluar final setelah semua tagihan selesai.
                      </p>
                    </div>
                  );
                })()}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          {blockedText ? <Alert variant="warning" className="tenant-short-alert mt-3 mb-0">{blockedText}</Alert> : null}
        </Card.Body>
          </Card>

          {/* M-3 H-10: banner pengingat catat meter saat mendekati akhir kontrak/perpanjangan */}
          {nearEnd && !meterRecordedThisMonth && (
            <Alert variant="warning" className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0">
              <div>
                <strong>⚡ Waktunya catat meter!</strong>
                <div className="small mt-1">
                  Kontrak berakhir dalam <strong>{endDays === 0 ? 'hari ini' : `${endDays} hari`}</strong>.
                  Catat angka meter listrik (dan air jika aktif) sekarang agar tagihan akhir periode dapat dihitung tepat.
                </div>
              </div>
              <Button variant="warning" size="sm" onClick={() => setShowMeter(true)}>
                Catat Meter Sekarang
              </Button>
            </Alert>
          )}
        </div>{/* tenant-stay-col-left */}

        <div className="tenant-stay-col-right">
      {/* Survei kepuasan penghuni */}
      <SatisfactionSurveyCard />

      {/* SI-3: riwayat sewa (masuk → tiap periode → tagihannya) */}
      <StayHistoryTimeline
        stay={stay}
        invoices={invoices}
        invoiceHrefBase="/portal/invoices"
        journeySteps={stayJourneySteps}
      />

      {/* ── State alerts ── */}
      {pendingDecisionRequest ? (
        <Alert variant="info" className="tenant-short-alert mb-3">
          <div className="fw-semibold mb-1">Konfirmasi perpanjangan</div>
          <div className="small mb-2">Pilih YA untuk menerbitkan invoice DP 30%, atau TIDAK jika kamu akan keluar sesuai jadwal.</div>
          <div className="small text-muted mb-2">
            Aturan: <strong>DP 30%</strong> dibayar paling lambat <strong>{formatDate(stay.plannedCheckOutDate)}</strong> (akhir kontrak / hari-H),
            lalu <strong>pelunasan</strong> paling lambat <strong>7 hari setelah DP</strong> (H+7). Periode baru menyambung dari akhir kontrak.
          </div>
          {decideRenewMutation.isError ? (
            <div className="text-danger small mb-2">
              {getApiErrorMessage(decideRenewMutation.error, 'Gagal menyimpan keputusan perpanjangan.')}
            </div>
          ) : null}
          <div className="d-flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="primary"
              disabled={decideRenewMutation.isPending}
              onClick={() => decideRenewMutation.mutate({ id: pendingDecisionRequest.id, decision: 'YA' })}
            >
              Ya, lanjut dan bayar DP
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={decideRenewMutation.isPending}
              onClick={() => decideRenewMutation.mutate({ id: pendingDecisionRequest.id, decision: 'TIDAK' })}
            >
              Tidak memperpanjang
            </Button>
          </div>
        </Alert>
      ) : pendingRenewRequest ? (
        <Alert variant="info" className="tenant-short-alert mb-3">
          <StatusBadge status={pendingRenewRequest.status} domain="renew" className="me-2" />
          {pendingRenewRequest.status === 'AWAITING_DP' ? (
            <>
              Bayar <strong>DP perpanjangan</strong> penuh paling lambat{' '}
              <strong>{formatDate(pendingRenewRequest.downPaymentDueDate ?? stay.plannedCheckOutDate)}</strong>{' '}
              <em>(batas = akhir kontrak / hari-H)</em>. Lewat tanggal ini, prioritas kamarmu hangus dan kamar dibuka untuk umum.
            </>
          ) : pendingRenewRequest.settlementInvoiceId ? (
            <>
              Invoice <strong>pelunasan</strong> sudah terbit. Lunasi penuh paling lambat{' '}
              <strong>{formatDate(pendingRenewRequest.settlementDueDate)}</strong>{' '}
              <em>(= 7 hari sejak DP dibayar / H+7)</em>, agar admin dapat memfinalkan perpanjangan.
            </>
          ) : (
            <>
              DP sudah aman{pendingRenewRequest.downPaymentPaidAt ? ` (dibayar ${formatDate(pendingRenewRequest.downPaymentPaidAt)})` : ''}.
              Admin akan mencatat meter & menerbitkan invoice pelunasan; batas lunas{' '}
              <strong>{pendingRenewRequest.settlementDueDate ? formatDate(pendingRenewRequest.settlementDueDate) : '7 hari sejak DP (H+7)'}</strong>.
            </>
          )}
        </Alert>
      ) : null}
      {approvedCheckoutRequest ? <Alert variant="info" className="tenant-short-alert mb-3">Tanggal keluar disetujui. Admin akan finalkan setelah tagihan beres.</Alert> : null}
      {rejectedRequest ? <Alert variant="warning" className="tenant-short-alert mb-3">Pengajuan perpanjangan ditolak.</Alert> : null}
      {rejectedCheckoutRequest ? <Alert variant="warning" className="tenant-short-alert mb-3">Pengajuan keluar ditolak.</Alert> : null}

        </div>{/* tenant-stay-col-right */}
      </div>{/* tenant-stay-dashboard-grid */}

      <RenewRequestModal show={showRenewModal} onHide={() => setShowRenewModal(false)} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['portal-renew-requests', stay.id] });
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      }} stay={stay} />
      <CheckoutRequestModal show={showCheckoutModal} onHide={() => setShowCheckoutModal(false)} onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests', stay.id] });
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
      }} stay={stay} />
      <MeterCycleModal show={showMeter} onHide={() => setShowMeter(false)} stay={stay} onDone={() => {
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['portal-meter-readings', stay.roomId] });
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
      }} />
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

  // TEN-PROFILE-NOTIF: nudge "Lengkapi Profil" bila data onboarding belum lengkap.
  const completenessQuery = useQuery({
    queryKey: ['portal-profile-completeness', tenantId],
    queryFn: getProfileCompleteness,
    enabled: Boolean(tenantId),
    staleTime: 60_000,
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

      {completenessQuery.data && !completenessQuery.data.isComplete ? (
        <Alert variant="warning" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <strong>📋 Lengkapi profil ({completenessQuery.data.completionPercent}%)</strong>
            <div className="small mb-0">
              {completenessQuery.data.missingFields.length} data belum diisi:{' '}
              {completenessQuery.data.missingFields.map((f) => PROFILE_FIELD_LABELS[f] ?? f).join(', ')}.
            </div>
          </div>
          <Button variant="warning" size="sm" onClick={() => navigate('/profile')}>Lengkapi Sekarang</Button>
        </Alert>
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
