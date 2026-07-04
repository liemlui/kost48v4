// FILE: StayDetailPage.tsx — detail hunian: data penghuni, tagihan, histori
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Form, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { HeroSkeleton } from '../../components/common/SkeletonLoader';
import { AssistantPanel, BlockedReasonCard, ReadinessChecklist, LifecycleTimeline, type AssistantItem, type ReadinessItem, type TimelineStep } from '../../components/command-center';
import TenantProfilePhotoCard from '../../components/tenant/TenantProfilePhotoCard';
import InfoTab from '../../components/stays/InfoTab';
import MeterTab from '../../components/stays/MeterTab';
import FinanceTab from '../../components/stays/FinanceTab';
import CompleteStayModal from '../../components/stays/CompleteStayModal';
import ProcessDepositModal from '../../components/stays/ProcessDepositModal';
import CancelStayModal from '../../components/stays/CancelStayModal';
import RenewStayModal from '../../components/stays/RenewStayModal';
import StayHistoryTimeline from '../../components/stays/StayHistoryTimeline';
import ApproveCheckoutModal from '../../components/checkout-requests/ApproveCheckoutModal';
import RejectCheckoutModal from '../../components/checkout-requests/RejectCheckoutModal';
import { approveCheckoutRequest, listAdminCheckoutRequests, rejectCheckoutRequest } from '../../api/checkoutRequests';
import { useStay } from '../../hooks/useStay';
import { useInvoices } from '../../hooks/useInvoices';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDateTimeWib } from '../../utils/dateTime';
import { buildCheckoutReadinessItems, getCheckoutReadinessSummary } from '../../utils/checkoutReadiness';
import type { CheckoutRequest } from '../../types';


const STAY_DETAIL_TABS = new Set(['info', 'meter', 'finance', 'notes']);

function normalizeStayDetailTab(value: string | null | undefined) {
  return value && STAY_DETAIL_TABS.has(value) ? value : 'info';
}

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateTimeWib(dateValue);
}

function hasOverdue(invoices: Array<{ dueDate?: string | null; status: string }>) {
  return invoices.some((invoice) => {
    if (!invoice.dueDate || invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false;
    const d = new Date(invoice.dueDate);
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  });
}

function hasUnpaidInvoices(invoices: Array<{ status: string }>) {
  return invoices.some((invoice) => invoice.status === 'ISSUED' || invoice.status === 'PARTIAL');
}

function getDepositLabel(
  depositStatus: string | null | undefined,
  deductionRupiah?: number | null,
  refundedRupiah?: number | null,
) {
  if (!depositStatus) return 'Status Deposit Tidak Diketahui';
  const hasDeductionAndRefund = Number(deductionRupiah ?? 0) > 0 && Number(refundedRupiah ?? 0) > 0;
  switch (depositStatus) {
    case 'HELD': return 'Ditahan';
    case 'REFUNDED': return hasDeductionAndRefund ? 'Sebagian dikembalikan & sebagian dipotong' : 'Dikembalikan';
    case 'FORFEITED': return 'Hangus';
    case 'PARTIALLY_REFUNDED': return 'Sebagian Dikembalikan';
    default: return depositStatus;
  }
}

export default function StayDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => normalizeStayDetailTab(searchParams.get('tab')));
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState<CheckoutRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CheckoutRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');
  const [approveCheckoutError, setApproveCheckoutError] = useState('');
  const tabsSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToTabsSection = useCallback(() => {
    window.setTimeout(() => {
      tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  const { data: stay, isLoading, isError, updateMutation } = useStay(id);
  const invoicesQuery = useInvoices(id, true);
  const metersQuery = useMeterReadings(stay?.roomId, Boolean(stay?.roomId));
  const invoices = invoicesQuery.data?.items ?? [];
  const overdue = useMemo(() => hasOverdue(invoices), [invoices]);
  const hasUnpaid = useMemo(() => hasUnpaidInvoices(invoices), [invoices]);
  const openInvoiceCount = useMemo(() => stay?.openInvoiceCount ?? invoices.filter((item) => !['PAID', 'CANCELLED'].includes(item.status)).length, [stay?.openInvoiceCount, invoices]);
  const depositLabel = getDepositLabel(stay?.depositStatus, stay?.depositDeductionRupiah, stay?.depositRefundedRupiah);
  const meterCount = metersQuery.data?.length ?? 0;
  const latestMeterReadingAt = useMemo(() => {
    const readings = metersQuery.data ?? [];
    if (!readings.length) return null;
    return readings.reduce<string | null>((latest, reading) => {
      if (!latest) return reading.readingAt;
      const a = new Date(reading.readingAt).getTime();
      const b = new Date(latest).getTime();
      if (isNaN(a) || isNaN(b)) return latest;
      return a > b ? reading.readingAt : latest;
    }, null);
  }, [metersQuery.data]);

  const stayId = Number(id);
  const hasValidStayId = Number.isInteger(stayId) && stayId > 0;

  const checkoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'stay', stayId, 'PENDING'],
    queryFn: () => listAdminCheckoutRequests({ status: 'PENDING', stayId }),
    enabled: hasValidStayId,
  });

  const approvedCheckoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'stay', stayId, 'APPROVED'],
    queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED', stayId }),
    enabled: hasValidStayId,
  });

  const pendingCheckoutRequest = useMemo(() => {
    if (!checkoutRequestsQuery.data?.items) return null;
    return checkoutRequestsQuery.data.items[0] ?? null;
  }, [checkoutRequestsQuery.data]);

  const approvedCheckoutRequest = useMemo(() => {
    if (!approvedCheckoutRequestsQuery.data?.items) return null;
    return approvedCheckoutRequestsQuery.data.items[0] ?? null;
  }, [approvedCheckoutRequestsQuery.data]);

  const approveCrMutation = useMutation({
    mutationFn: async ({ id: crId, reviewNotes }: { id: number; reviewNotes?: string }) => approveCheckoutRequest(crId, { reviewNotes }),
    onSuccess: async () => {
      setApproveCheckoutError('');
      setApproveTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['stay', id] }),
        queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-stay'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
      ]);
    },
    onError: (error: any) => {
      setApproveCheckoutError(getApiErrorMessage(error, 'Gagal menyetujui permintaan checkout. Silakan coba lagi.'));
    },
  });

  const rejectCrMutation = useMutation({
    mutationFn: async ({ id: crId, reviewNotes }: { id: number; reviewNotes: string }) =>
      rejectCheckoutRequest(crId, { reviewNotes }),
    onSuccess: async () => {
      setApproveCheckoutError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['stay', id] }),
        queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests'] }),
      ]);
      setRejectTarget(null);
    },
  });

  useEffect(() => {
    setNotes(stay?.notes ?? '');
  }, [stay?.id, stay?.notes]);

  useEffect(() => {
    const nextTab = normalizeStayDetailTab(searchParams.get('tab'));
    setActiveTab((currentTab) => currentTab === nextTab ? currentTab : nextTab);
  }, [searchParams]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const normalizedTabFromUrl = normalizeStayDetailTab(tabFromUrl);
    if (stay?.id && tabFromUrl && normalizedTabFromUrl !== 'info') {
      scrollToTabsSection();
    }
  }, [searchParams, scrollToTabsSection, stay?.id]);

  const selectTab = useCallback((key: string | null, options?: { scroll?: boolean }) => {
    const nextKey = normalizeStayDetailTab(key);
    setActiveTab(nextKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextKey);
    setSearchParams(nextParams);
    if (options?.scroll) {
      scrollToTabsSection();
    }
  }, [searchParams, setSearchParams, scrollToTabsSection]);

  const handleTabSelect = (key: string | null) => {
    selectTab(key, { scroll: true });
  };

  const handleSaveNotes = async () => {
    if (!stay) return;
    setNotesError('');
    try {
      await updateMutation.mutateAsync({ notes });
    } catch (err: any) {
      setNotesError(err?.response?.data?.message || 'Gagal menyimpan catatan');
    }
  };

  if (isLoading) return <HeroSkeleton />;
  if (isError || !stay) return <Alert variant="danger">Gagal mengambil detail stay.</Alert>;

  const assistantItems: AssistantItem[] = [
    ...(approvedCheckoutRequest ? [{ id: 'approved-checkout', severity: 'HIGH' as const, title: 'Keluar sudah disetujui, belum final', message: openInvoiceCount > 0 ? 'Tagihan aktif masih memblokir.' : 'Tagihan clear. Cek kamar lalu finalkan keluar.', source: 'Kesiapan keluar', actionLabel: openInvoiceCount > 0 ? 'Buka Keuangan' : 'Finalkan Keluar', onAction: () => openInvoiceCount > 0 ? selectTab('finance', { scroll: true }) : setShowCompleteModal(true) }] : []),
    ...(pendingCheckoutRequest ? [{ id: 'pending-checkout', severity: 'MEDIUM' as const, title: 'Penghuni mengajukan keluar', message: 'Persetujuan belum melepas kamar.', source: 'Pengajuan keluar' }] : []),
    ...(openInvoiceCount > 0 ? [{ id: 'open-invoice', severity: 'BLOCKER' as const, title: 'Tagihan aktif memblokir final keluar', message: `${openInvoiceCount} tagihan aktif. Tagihan belum terbit juga memblokir.`, source: 'Guard keuangan', actionLabel: 'Buka Tab Keuangan', onAction: () => selectTab('finance', { scroll: true }) }] : []),
    ...(!meterCount ? [{ id: 'meter-missing', severity: 'WARNING' as const, title: 'Belum ada catatan meter untuk kamar ini', message: 'Pastikan catatan meter tersedia.', source: 'Meter' }] : []),
    ...(stay.depositStatus === 'HELD' && ['COMPLETED', 'CANCELLED'].includes(stay.status) ? [{ id: 'deposit-held', severity: 'HIGH' as const, title: 'Deposit masih ditahan', message: 'Proses refund/potongan deposit.', source: 'Deposit', actionLabel: 'Proses Deposit', onAction: () => setShowDepositModal(true) }] : []),
  ];

  const readinessItems: ReadinessItem[] = buildCheckoutReadinessItems({
    stay,
    invoices,
    hasApprovedCheckoutRequest: Boolean(approvedCheckoutRequest),
    hasPendingCheckoutRequest: Boolean(pendingCheckoutRequest),
    meterCount,
    latestMeterReadingAt,
  });
  const checkoutReadinessSummary = getCheckoutReadinessSummary(invoices, Boolean(approvedCheckoutRequest));

  const timelineSteps: TimelineStep[] = [
    { id: 'checkin', label: 'Check-in', description: formatDateSafe(stay.checkInDate), status: 'done' },
    { id: 'active', label: 'Masa sewa aktif', description: `Akhir masa sewa: ${formatDateSafe(stay.plannedCheckOutDate)}`, status: stay.status === 'ACTIVE' ? 'active' : 'done' },
    { id: 'checkout-request', label: 'Ajukan keluar', description: approvedCheckoutRequest ? 'Request disetujui.' : pendingCheckoutRequest ? 'Menunggu review.' : 'Belum ada request aktif.', status: approvedCheckoutRequest ? 'done' : pendingCheckoutRequest ? 'active' : 'pending' },
    { id: 'final', label: 'Final keluar', description: openInvoiceCount > 0 ? 'Terblokir tagihan aktif.' : 'Bisa diproses jika cek kamar, meter akhir, dan deposit sudah siap.', status: openInvoiceCount > 0 ? 'blocked' : approvedCheckoutRequest ? 'active' : 'pending' },
  ];

  return (
    <div>
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/stays' }}>Masa Sewa</Breadcrumb.Item>
        <Breadcrumb.Item active>{stay.tenant?.fullName ?? `Masa sewa #${stay.id}`}</Breadcrumb.Item>
      </Breadcrumb>

      <PageHeader
        eyebrow="Detail Masa Sewa"
        title={stay.tenant?.fullName ?? `Masa Sewa #${stay.id}`}
        description={`Kamar ${stay.room?.code ?? stay.roomId} · Status ${stay.status} · Deposit ${stay.depositStatus ?? 'HELD'}`}
      />

      {stay.tenant?.id ? (
        <TenantProfilePhotoCard tenantId={stay.tenant.id} fullName={stay.tenant.fullName} />
      ) : null}

      <AssistantPanel title="Asisten Checkout & Masa Sewa" subtitle="Blocker utama masa sewa ini." items={assistantItems} emptyTitle="Tidak ada blocker besar" emptyMessage="Tidak ada blocker utama." />

      {openInvoiceCount > 0 && approvedCheckoutRequest ? (
        <BlockedReasonCard
          title="Checkout final terblokir tagihan"
          reason="Final keluar ditolak jika tagihan masih aktif."
          actionLabel="Buka Tab Keuangan"
          actionTo={`/stays/${stay.id}?tab=finance`}
        />
      ) : null}

      <ReadinessChecklist title="Safety Belt Checkout" subtitle="Cek tagihan, meter, kamar, deposit." items={readinessItems} />
      <LifecycleTimeline title="Alur Masa Sewa" subtitle="Alur dari masuk sampai keluar selesai." steps={timelineSteps} />
      <StayHistoryTimeline stay={stay} invoices={invoices} invoiceHrefBase="/invoices" />

      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
          <Alert variant={checkoutReadinessSummary.tone} className="mb-3">
            <strong>{checkoutReadinessSummary.title}</strong>
            <div className="small mt-1">{checkoutReadinessSummary.message}</div>
          </Alert>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <StatusBadge status={stay.status} />
              <StatusBadge status="SECONDARY" customLabel={depositLabel} />
              {overdue ? <StatusBadge status="OVERDUE" /> : null}
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
              {stay.status === 'ACTIVE' && stay.room?.status === 'RESERVED' ? (
                <Alert variant="info" className="d-flex align-items-center gap-2 mb-0 py-2">
                  <span>🕐</span>
                  <div>
                    <strong>Booking Mandiri</strong> — Kamar berstatus <strong>Dipesan</strong>.
                    Aksi operasional tersedia setelah admin melakukan approval.
                  </div>
                </Alert>
              ) : null}
              {stay.status === 'ACTIVE' && stay.room?.status !== 'RESERVED' ? (
                <>
                  <Button onClick={() => setShowCompleteModal(true)} disabled={openInvoiceCount > 0} title={openInvoiceCount > 0 ? 'Selesaikan tagihan aktif dulu sebelum finalkan keluar' : undefined}>Finalkan Checkout</Button>
                  <Button variant="outline-success" onClick={() => setShowRenewModal(true)} disabled={showRenewModal}>Perpanjang Masa Sewa</Button>
                  <Button variant="outline-danger" onClick={() => setShowCancelModal(true)} disabled={showCancelModal}>Batalkan</Button>
                </>
              ) : null}
              {['COMPLETED', 'CANCELLED'].includes(stay.status) && stay.depositStatus === 'HELD' ? (
                <Button variant="outline-primary" onClick={() => setShowDepositModal(true)}>Proses Deposit</Button>
              ) : null}
              {['COMPLETED', 'CANCELLED'].includes(stay.status) && stay.depositStatus !== 'HELD' ? (
                <span className="text-muted small">Deposit: {depositLabel}</span>
              ) : null}
              <span className="app-caption text-end stay-hero-caption">Check-in {formatDateSafe(stay.checkInDate)} · Room {stay.room?.code ?? stay.roomId}</span>
            </div>
          </div>

          <div className="metric-grid mb-3">
            <div className="metric-tile">
              <div className="metric-tile-label">Sewa disepakati</div>
              <div className="metric-tile-value">{formatRupiah(stay.agreedRentAmountRupiah ?? 0)}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Deposit</div>
              <div className="metric-tile-value">{formatRupiah(stay.depositAmountRupiah ?? 0)}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Akhir Masa Sewa</div>
              <div className="metric-tile-value">{formatDateSafe(stay.plannedCheckOutDate)}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Tagihan aktif</div>
              <div className="metric-tile-value">{openInvoiceCount}</div>
            </div>
          </div>

          {hasUnpaid ? (
            <Alert variant="warning" className="mb-3">
              <strong>Ada tagihan yang belum dibayar.</strong>
              <div className="small mt-1">Cek tab Keuangan.</div>
            </Alert>
          ) : null}

          {overdue ? (
            <Alert variant="warning" className="mb-3">
              Tagihan overdue. Cek Keuangan.
            </Alert>
          ) : null}

          <Alert variant="info" className="mb-3">
            <strong>Aturan perpanjangan:</strong> perpanjangan wajib catat meter.
          </Alert>

          {pendingCheckoutRequest ? (
            <Alert variant="warning" className="mt-3 mb-0 d-flex justify-content-between align-items-center">
              <div>
                <strong>🔔 Pengajuan Rencana Keluar Kamar</strong>
                <div className="small mt-1">
                  Diajukan {formatDateSafe(pendingCheckoutRequest.createdAt)} ·{' '}
                  Rencana keluar {formatDateSafe(pendingCheckoutRequest.requestedCheckOutDate)}{' '}
                  · Alasan: {pendingCheckoutRequest.checkoutReason || pendingCheckoutRequest.requestNotes || '-'}
                </div>
                <div className="small mt-1 text-muted">
                  Persetujuan keluar belum menyelesaikan masa sewa. Tagihan aktif tetap memblokir pelepasan kamar.
                </div>
              </div>
              <div className="d-flex gap-2 flex-shrink-0 ms-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setApproveTarget(pendingCheckoutRequest)}
                  disabled={approveCrMutation.isPending}
                >
                  Review
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => setRejectTarget(pendingCheckoutRequest)}
                  disabled={rejectCrMutation.isPending}
                >
                  Tolak
                </Button>
              </div>
            </Alert>
          ) : null}

          {approveCheckoutError ? (
            <Alert variant="danger" className="mt-2 mb-0">
              {approveCheckoutError}
            </Alert>
          ) : null}

          {approvedCheckoutRequest ? (
            <Alert variant="info" className="mt-3 mb-0 d-flex justify-content-between align-items-center">
              <div>
                <strong>✅ Rencana Keluar Kamar — Rencana Disetujui</strong>
                <div className="small mt-1">
                  Disetujui {formatDateSafe(approvedCheckoutRequest.reviewedAt)} ·{' '}
                  Rencana keluar {formatDateSafe(approvedCheckoutRequest.requestedCheckOutDate)}{' '}
                  · Alasan: {approvedCheckoutRequest.checkoutReason || approvedCheckoutRequest.requestNotes || '-'}
                </div>
                <div className="small mt-1 text-muted">
                  Disetujui, tapi kamar belum dilepas. Final keluar tetap terpisah.
                </div>
              </div>
              <div className="d-flex gap-2 flex-shrink-0 ms-3">
                <StatusBadge status="APPROVED" customLabel="Rencana Disetujui" />
                {hasUnpaid ? (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => selectTab('finance', { scroll: true })}
                  >
                    Kelola Tagihan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowCompleteModal(true)}
                    disabled={openInvoiceCount > 0}
                    title={openInvoiceCount > 0 ? 'Selesaikan tagihan aktif dulu sebelum finalkan keluar' : undefined}
                  >
                    Finalkan Checkout
                  </Button>
                )}
              </div>
            </Alert>
          ) : null}
        </Card.Body>
      </Card>

      <div ref={tabsSectionRef} className="stay-detail-tabs-section">
        <Tabs activeKey={activeTab} onSelect={handleTabSelect} className="mb-3">
        <Tab eventKey="info" title="Informasi">
          <div className="pt-3"><InfoTab stay={stay} /></div>
        </Tab>
        <Tab eventKey="meter" title="Meteran">
          <div className="pt-3"><MeterTab stay={stay} readings={metersQuery.data} isLoading={metersQuery.isLoading} isError={metersQuery.isError} /></div>
        </Tab>
        <Tab eventKey="finance" title={<span className="d-inline-flex align-items-center gap-2">Keuangan {overdue ? <Badge bg="danger">!</Badge> : null}</span>}>
          <div className="pt-3"><FinanceTab stay={stay} enabled={activeTab === 'finance'} /></div>
        </Tab>
        <Tab eventKey="notes" title="Catatan">
          <div className="pt-3">
            <Card className="content-card border-0">
              <Card.Body>
                {notesError ? <Alert variant="danger">{notesError}</Alert> : null}
                <Form.Group className="mb-3">
                  <Form.Label>Catatan Masa Sewa</Form.Label>
                  <Form.Control as="textarea" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
                <Button onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </Card.Body>
            </Card>
          </div>
        </Tab>
        </Tabs>
      </div>

      <CompleteStayModal
        show={showCompleteModal}
        onHide={() => setShowCompleteModal(false)}
        onSuccess={() => navigate('/stays?status=ALL')}
        stay={stay}
        invoices={invoices}
        approvedCheckOutDate={approvedCheckoutRequest?.requestedCheckOutDate ?? null}
        hasApprovedCheckoutRequest={Boolean(approvedCheckoutRequest)}
        hasPendingCheckoutRequest={Boolean(pendingCheckoutRequest)}
        meterCount={meterCount}
        latestMeterReadingAt={latestMeterReadingAt}
      />
      <ProcessDepositModal show={showDepositModal} onHide={() => setShowDepositModal(false)} stay={stay} invoices={invoices} />
      <CancelStayModal show={showCancelModal} onHide={() => setShowCancelModal(false)} stay={stay} invoices={invoices} />
      <RenewStayModal show={showRenewModal} onHide={() => setShowRenewModal(false)} stay={stay} onSuccess={() => {}} />
      <ApproveCheckoutModal
        show={Boolean(approveTarget)}
        checkoutRequest={approveTarget}
        onHide={() => setApproveTarget(null)}
        onSubmit={(reviewNotes) => {
          approveCrMutation.mutate({ id: approveTarget!.id, reviewNotes });
        }}
        isSubmitting={approveCrMutation.isPending}
        openInvoiceCount={openInvoiceCount}
      />
      <RejectCheckoutModal
        show={Boolean(rejectTarget)}
        onHide={() => setRejectTarget(null)}
        onSubmit={(reviewNotes) => {
          rejectCrMutation.mutate({ id: rejectTarget!.id, reviewNotes });
        }}
        isSubmitting={rejectCrMutation.isPending}
      />
    </div>
  );
}
