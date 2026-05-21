import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import { AssistantPanel, CompactMetrics, PeriodVisualizer, type AssistantItem, type MetricChip } from '../../components/command-center';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import StatusBadge from '../../components/common/StatusBadge';
import { listAdminRenewRequests, approveRenewRequest, rejectRenewRequest } from '../../api/renewRequests';
import { formatRupiah } from '../../utils/formatCurrency';
import type { ApproveRenewRequestPayload, PaginatedResponse, RenewRequest } from '../../types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
];

function getStatusBadgeVariant(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'CANCELLED':
      return 'secondary';
    default:
      return 'light';
  }
}

export default function RenewRequestsAdminPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const [approveTarget, setApproveTarget] = useState<RenewRequest | null>(null);
  const [plannedCheckOutDate, setPlannedCheckOutDate] = useState('');
  const [approveReviewNotes, setApproveReviewNotes] = useState('');
  const [approvedRentAmount, setApprovedRentAmount] = useState('');

  const [rejectTarget, setRejectTarget] = useState<RenewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const query = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['admin-renew-requests', { status: statusFilter || undefined }],
    queryFn: () => listAdminRenewRequests(statusFilter ? { status: statusFilter } : undefined),
    refetchOnWindowFocus: true,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ApproveRenewRequestPayload }) =>
      approveRenewRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] });
      setApproveTarget(null);
      setPlannedCheckOutDate('');
      setApproveReviewNotes('');
      setApprovedRentAmount('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { reviewNotes: string } }) =>
      rejectRenewRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] });
      setRejectTarget(null);
      setReviewNotes('');
    },
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const pendingCount = items.filter((r) => r.status === 'PENDING').length;
  const approvedCount = items.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = items.filter((r) => r.status === 'REJECTED').length;

  const assistantItems: AssistantItem[] = [
    pendingCount ? {
      id: 'renew-pending',
      severity: 'HIGH',
      title: `${pendingCount} permintaan perpanjangan menunggu keputusan`,
      message: 'Setiap approval akan memperpanjang masa sewa dan menerbitkan tagihan renewal sebagai ISSUED.',
      source: 'Renew',
      count: pendingCount,
      actionLabel: 'Lihat pending',
      onAction: () => setStatusFilter('PENDING'),
    } : null,
    approvedCount ? {
      id: 'renew-approved',
      severity: 'INFO',
      title: `${approvedCount} perpanjangan sudah disetujui`,
      message: 'Cek tagihan renewal jika tenant belum membayar setelah masa sewa diperpanjang.',
      source: 'Lifecycle',
      count: approvedCount,
      actionLabel: 'Lihat approved',
      onAction: () => setStatusFilter('APPROVED'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'pending', label: 'Menunggu', value: pendingCount, helper: 'Butuh approve/reject', icon: '⏳', status: pendingCount ? 'WARNING' : 'SUCCESS', onClick: () => setStatusFilter('PENDING') },
    { id: 'approved', label: 'Disetujui', value: approvedCount, helper: 'Masa sewa sudah diperpanjang', icon: '✅', status: 'SUCCESS', onClick: () => setStatusFilter('APPROVED') },
    { id: 'rejected', label: 'Ditolak', value: rejectedCount, helper: 'Dengan catatan review', icon: '✕', status: rejectedCount ? 'DANGER' : 'SUCCESS', onClick: () => setStatusFilter('REJECTED') },
    { id: 'total', label: 'Total Request', value: items.length, helper: statusFilter ? 'Sesuai filter aktif' : 'Semua status', icon: '📋', status: 'INFO', onClick: () => setStatusFilter('') },
  ];

  const handleApprove = () => {
    if (!approveTarget) return;
    const payload: ApproveRenewRequestPayload = {};
    const nextPlannedCheckOutDate = plannedCheckOutDate.trim();
    const nextReviewNotes = approveReviewNotes.trim();
    const normalizedRentAmount = approvedRentAmount.replace(/\D/g, '');
    const parsedRentAmount = normalizedRentAmount ? Number(normalizedRentAmount) : NaN;
    if (nextPlannedCheckOutDate) payload.plannedCheckOutDate = nextPlannedCheckOutDate;
    if (Number.isFinite(parsedRentAmount) && parsedRentAmount > 0) {
      payload.agreedRentAmountRupiah = parsedRentAmount;
    }
    if (nextReviewNotes) payload.reviewNotes = nextReviewNotes;

    approveMutation.mutate({
      id: approveTarget.id,
      payload: Object.keys(payload).length > 0 ? payload : undefined,
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate({
      id: rejectTarget.id,
      payload: { reviewNotes: reviewNotes.trim() || 'Ditolak tanpa alasan.' },
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Renew Command Center"
        title="Permintaan Perpanjangan"
        description="Tinjau pengajuan perpanjangan dengan dampak bisnis yang jelas: approval memperpanjang masa sewa dan menerbitkan tagihan renewal."
      />

      <AssistantPanel
        title="Asisten Renew"
        subtitle="Membantu admin memutuskan request perpanjangan tanpa lupa dampak invoice renewal."
        items={assistantItems}
        emptyTitle="Tidak ada perpanjangan yang menunggu"
        emptyMessage="Tidak ada request pending pada filter ini. Cek tab approved/rejected untuk riwayat."
      />
      <CompactMetrics metrics={metrics} />

      <Card className="content-card border-0 mb-4 command-filter-card">
        <Card.Body>
          <div className="status-tab-bar compact-tabs mb-3">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value || 'ALL'} className={`status-tab${statusFilter === opt.value ? ' active' : ''}`} onClick={() => setStatusFilter(opt.value)}>
                {opt.label}<span className="tab-badge">{opt.value === 'PENDING' ? pendingCount : opt.value === 'APPROVED' ? approvedCount : opt.value === 'REJECTED' ? rejectedCount : items.length}</span>
              </button>
            ))}
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <Form.Select
              style={{ maxWidth: 240 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : query.isError ? (
            <Alert variant="danger">
              Gagal memuat data permintaan perpanjangan. Silakan coba lagi.
            </Alert>
          ) : items.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Belum ada permintaan perpanjangan"
              description={
                statusFilter
                  ? `Tidak ada permintaan dengan status "${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}".`
                  : 'Belum ada tenant yang mengajukan perpanjangan masa tinggal.'
              }
            />
          ) : (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tenant</th>
                  <th>Kamar</th>
                  <th>Masa Sewa</th>
                  <th>Tanggal Renew/Keluar Diajukan</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rr) => (
                  <tr key={rr.id}>
                    <td className="text-muted small">#{rr.id}</td>
                    <td>
                      {(rr as any).tenant?.fullName ?? `Tenant #${(rr as any).tenantId ?? '-'}`}
                    </td>
                    <td>{(rr as any).room?.code ?? (rr as any).stay?.room?.code ?? (rr as any).roomId ?? '-'}</td>
                    <td>Masa sewa #{(rr as any).stayId ?? '-'}</td>
                    <td>{formatDate(rr.requestedCheckOutDate)}</td>
                    <td>
                      <StatusBadge status={rr.status} />
                    </td>
                    <td className="text-muted small" style={{ maxWidth: 200 }}>
                      {rr.requestNotes ? (
                        <div className="text-truncate" title={rr.requestNotes}>
                          {rr.requestNotes}
                        </div>
                      ) : '-'}
                      {(rr as any).reviewNotes ? (
                        <div className="text-truncate mt-1 text-danger" title={(rr as any).reviewNotes}>
                          <em>Alasan tolak: {(rr as any).reviewNotes}</em>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {rr.status === 'PENDING' ? (
                        <div className="d-flex gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setApproveTarget(rr);
                              setPlannedCheckOutDate(rr.requestedCheckOutDate ? rr.requestedCheckOutDate.slice(0, 10) : '');
                              setApproveReviewNotes('');
                              setApprovedRentAmount('');
                            }}
                          >
                            Setujui
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setRejectTarget(rr);
                              setReviewNotes('');
                            }}
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Approve Modal */}
      <Modal
        show={!!approveTarget}
        onHide={() => {
          if (!approveMutation.isPending) {
            setApproveTarget(null);
            setPlannedCheckOutDate('');
            setApproveReviewNotes('');
            setApprovedRentAmount('');
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Setujui Perpanjangan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {approveMutation.isError ? (
            <Alert variant="danger" className="small">
              {(approveMutation.error as any)?.response?.data?.message ?? 'Gagal menyetujui permintaan.'}
            </Alert>
          ) : null}
          <p className="text-muted small">
            Anda akan menyetujui permintaan perpanjangan{' '}
            <strong>#{approveTarget?.id}</strong> dari{' '}
            <strong>{(approveTarget as any)?.tenant?.fullName ?? `Tenant #${(approveTarget as any)?.tenantId}`}</strong>.
          </p>
          <Alert variant="warning" className="small">
            Approval akan memperpanjang masa sewa dan menerbitkan tagihan renewal sebagai <strong>ISSUED</strong>. Ini bukan sekadar mencatat permintaan.
          </Alert>
          <PeriodVisualizer
            title="Perbandingan Masa Sewa"
            subtitle="Cek tanggal lama, tanggal yang diajukan tenant, dan tanggal yang akan disetujui."
            points={[
              { id: 'current', label: 'Akhir masa sewa sekarang', value: formatDate((approveTarget as any)?.stay?.plannedCheckOutDate), status: 'INFO', statusLabel: 'Saat ini' },
              { id: 'requested', label: 'Diajukan tenant', value: formatDate(approveTarget?.requestedCheckOutDate), status: 'WARNING', statusLabel: 'Request' },
              { id: 'approved', label: 'Akan disetujui', value: plannedCheckOutDate ? formatDate(plannedCheckOutDate) : formatDate(approveTarget?.requestedCheckOutDate), status: 'SUCCESS', statusLabel: 'Approval' },
            ]}
          />
          <Form.Group className="mb-3">
            <Form.Label>Tanggal Renew / Keluar Baru (opsional)</Form.Label>
            <Form.Control
              type="date"
              value={plannedCheckOutDate}
              onChange={(e) => setPlannedCheckOutDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              Kosongkan untuk mengikuti tanggal yang diajukan / periode sewa otomatis dari sistem.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Override Tarif Sewa (opsional)</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              placeholder="Kosongkan jika tetap memakai tarif sebelumnya"
              value={approvedRentAmount}
              onChange={(e) => setApprovedRentAmount(e.target.value.replace(/\D/g, ''))}
            />
            <Form.Text className="text-muted">
              Tarif saat ini: {formatRupiah(approveTarget?.stay?.agreedRentAmountRupiah ?? null)}. Isi hanya jika harga renewal berubah.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Catatan Persetujuan (opsional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={approveReviewNotes}
              onChange={(e) => setApproveReviewNotes(e.target.value)}
              placeholder="Contoh: Disetujui, tagihan renewal akan diterbitkan."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setApproveTarget(null);
              setPlannedCheckOutDate('');
              setApproveReviewNotes('');
              setApprovedRentAmount('');
            }}
            disabled={approveMutation.isPending}
          >
            Batal
          </Button>
          <Button
            variant="success"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Menyetujui...
              </>
            ) : (
              'Setujui'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal
        show={!!rejectTarget}
        onHide={() => {
          if (!rejectMutation.isPending) {
            setRejectTarget(null);
            setReviewNotes('');
          }
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Tolak Perpanjangan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {rejectMutation.isError ? (
            <Alert variant="danger" className="small">
              {(rejectMutation.error as any)?.response?.data?.message ?? 'Gagal menolak permintaan.'}
            </Alert>
          ) : null}
          <p className="text-muted small">
            Anda akan menolak permintaan perpanjangan{' '}
            <strong>#{rejectTarget?.id}</strong> dari{' '}
            <strong>{(rejectTarget as any)?.tenant?.fullName ?? `Tenant #${(rejectTarget as any)?.tenantId}`}</strong>.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Alasan Penolakan</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Tulis alasan penolakan..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setRejectTarget(null);
              setReviewNotes('');
            }}
            disabled={rejectMutation.isPending}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Menolak...
              </>
            ) : (
              'Tolak'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}