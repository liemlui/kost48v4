import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Breadcrumb, Button, Card, Form, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { HeroSkeleton } from '../../components/common/SkeletonLoader';
import InfoTab from '../../components/stays/InfoTab';
import MeterTab from '../../components/stays/MeterTab';
import FinanceTab from '../../components/stays/FinanceTab';
import CompleteStayModal from '../../components/stays/CompleteStayModal';
import ProcessDepositModal from '../../components/stays/ProcessDepositModal';
import CancelStayModal from '../../components/stays/CancelStayModal';
import RenewStayModal from '../../components/stays/RenewStayModal';
import RejectCheckoutModal from '../../components/checkout-requests/RejectCheckoutModal';
import { approveCheckoutRequest, listAdminCheckoutRequests, rejectCheckoutRequest } from '../../api/checkoutRequests';
import { useStay } from '../../hooks/useStay';
import { useInvoices } from '../../hooks/useInvoices';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { formatRupiah } from '../../utils/formatCurrency';
import type { CheckoutRequest } from '../../types';

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '-';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function hasOverdue(invoices: Array<{ dueDate?: string | null; status: string }>) {
  return invoices.some((invoice) => invoice.dueDate && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && new Date(invoice.dueDate).getTime() < Date.now());
}

function hasUnpaidInvoices(invoices: Array<{ status: string }>) {
  return invoices.some((invoice) => invoice.status === 'ISSUED' || invoice.status === 'PARTIAL');
}

function getDepositLabel(depositStatus: string | null | undefined) {
  if (!depositStatus) return 'Status Deposit Tidak Diketahui';
  switch (depositStatus) {
    case 'HELD': return 'Ditahan';
    case 'REFUNDED': return 'Dikembalikan';
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
  const initialTab = searchParams.get('tab') || 'info';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<CheckoutRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState('');

  const { data: stay, isLoading, isError, updateMutation } = useStay(id);
  const invoicesQuery = useInvoices(id, true);
  const metersQuery = useMeterReadings(stay?.roomId, activeTab === 'meter');
  const invoices = invoicesQuery.data?.items ?? [];
  const overdue = useMemo(() => hasOverdue(invoices), [invoices]);
  const hasUnpaid = useMemo(() => hasUnpaidInvoices(invoices), [invoices]);
  const depositLabel = getDepositLabel(stay?.depositStatus);

  const checkoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'stay', Number(id)],
    queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
    enabled: Boolean(id),
  });

  const pendingCheckoutRequest = useMemo(() => {
    if (!checkoutRequestsQuery.data?.items) return null;
    return checkoutRequestsQuery.data.items.find((r) => r.stayId === Number(id)) ?? null;
  }, [checkoutRequestsQuery.data, id]);

  const approveCrMutation = useMutation({
    mutationFn: async (crId: number) => approveCheckoutRequest(crId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
    },
  });

  const rejectCrMutation = useMutation({
    mutationFn: async ({ id: crId, reviewNotes }: { id: number; reviewNotes: string }) =>
      rejectCheckoutRequest(crId, { reviewNotes }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
      setRejectTarget(null);
    },
  });

  useEffect(() => {
    setNotes(stay?.notes ?? '');
  }, [stay?.id, stay?.notes]);

  const handleTabSelect = (key: string | null) => {
    const nextKey = key || 'info';
    setActiveTab(nextKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextKey);
    setSearchParams(nextParams);
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

  return (
    <div>
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/stays' }}>Stays</Breadcrumb.Item>
        <Breadcrumb.Item active>{stay.tenant?.fullName ?? `Stay #${stay.id}`}</Breadcrumb.Item>
      </Breadcrumb>

      <PageHeader
        eyebrow="Stay detail"
        title={stay.tenant?.fullName ?? `Stay #${stay.id}`}
        description={`Kamar ${stay.room?.code ?? stay.roomId} · Status ${stay.status} · Deposit ${stay.depositStatus ?? 'HELD'}`}
      />

      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
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
                  <Button onClick={() => setShowCompleteModal(true)}>Checkout</Button>
                  <Button variant="outline-success" onClick={() => setShowRenewModal(true)}>Perpanjang Stay</Button>
                  <Button variant="outline-danger" onClick={() => setShowCancelModal(true)}>Batalkan</Button>
                </>
              ) : null}
              {['COMPLETED', 'CANCELLED'].includes(stay.status) ? (
                <Button variant="outline-primary" onClick={() => setShowDepositModal(true)}>Proses Deposit</Button>
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
              <div className="metric-tile-label">Checkout plan</div>
              <div className="metric-tile-value">{formatDateSafe(stay.plannedCheckOutDate)}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Invoice terbuka</div>
              <div className="metric-tile-value">{stay.openInvoiceCount ?? invoices.filter((item) => !['PAID', 'CANCELLED'].includes(item.status)).length}</div>
            </div>
          </div>

          {hasUnpaid ? (
            <Alert variant="warning" className="mb-3">
              <strong>Ada invoice yang belum dibayar.</strong>
              <div className="small mt-1">Periksa tab Keuangan untuk melihat tagihan dengan status Diterbitkan atau Sebagian Dibayar.</div>
            </Alert>
          ) : null}

          {overdue ? (
            <Alert variant="warning" className="mb-0">
              Ada invoice overdue untuk stay ini. Cek tab Keuangan untuk tindak lanjut pembayaran atau negosiasi tenant.
            </Alert>
          ) : null}

          {pendingCheckoutRequest ? (
            <Alert variant="warning" className="mt-3 mb-0 d-flex justify-content-between align-items-center">
              <div>
                <strong>🔔 Permintaan Checkout Lebih Awal</strong>
                <div className="small mt-1">
                  Diajukan {formatDateSafe(pendingCheckoutRequest.createdAt)} ·{' '}
                  Rencana checkout {formatDateSafe(pendingCheckoutRequest.requestedCheckOutDate)}{' '}
                  · Alasan: {pendingCheckoutRequest.checkoutReason || pendingCheckoutRequest.requestNotes || '-'}
                </div>
              </div>
              <div className="d-flex gap-2 flex-shrink-0 ms-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => approveCrMutation.mutate(pendingCheckoutRequest.id)}
                  disabled={approveCrMutation.isPending}
                >
                  {approveCrMutation.isPending ? '...' : 'Setujui'}
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
        </Card.Body>
      </Card>

      <Tabs activeKey={activeTab} onSelect={handleTabSelect} className="mb-3">
        <Tab eventKey="info" title="Informasi">
          <div className="pt-3"><InfoTab stay={stay} /></div>
        </Tab>
        <Tab eventKey="meter" title="Meteran">
          <div className="pt-3"><MeterTab stay={stay} readings={metersQuery.data} isLoading={metersQuery.isLoading} isError={metersQuery.isError} /></div>
        </Tab>
        <Tab eventKey="finance" title={<span>Keuangan {overdue ? <Badge bg="danger">!</Badge> : null}</span>}>
          <div className="pt-3"><FinanceTab stay={stay} enabled={activeTab === 'finance'} /></div>
        </Tab>
        <Tab eventKey="notes" title="Catatan">
          <div className="pt-3">
            <Card className="content-card border-0">
              <Card.Body>
                {notesError ? <Alert variant="danger">{notesError}</Alert> : null}
                <Form.Group className="mb-3">
                  <Form.Label>Catatan Stay</Form.Label>
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

      <CompleteStayModal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} onSuccess={() => navigate('/stays?status=ALL')} stay={stay} invoices={invoices} />
      <ProcessDepositModal show={showDepositModal} onHide={() => setShowDepositModal(false)} stay={stay} />
      <CancelStayModal show={showCancelModal} onHide={() => setShowCancelModal(false)} stay={stay} invoices={invoices} />
      <RenewStayModal show={showRenewModal} onHide={() => setShowRenewModal(false)} stay={stay} onSuccess={() => {}} />
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
