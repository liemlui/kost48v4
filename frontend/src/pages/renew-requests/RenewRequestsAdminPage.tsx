import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Modal,
  Spinner,
  Table,
} from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import StatusBadge from '../../components/common/StatusBadge';
import { listAdminRenewRequests, approveRenewRequest, rejectRenewRequest } from '../../api/renewRequests';
import type { PaginatedResponse, RenewRequest } from '../../types';

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

  const [rejectTarget, setRejectTarget] = useState<RenewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const query = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['admin-renew-requests', { status: statusFilter || undefined }],
    queryFn: () => listAdminRenewRequests(statusFilter ? { status: statusFilter } : undefined),
    refetchOnWindowFocus: true,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: { plannedCheckOutDate?: string } }) =>
      approveRenewRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] });
      setApproveTarget(null);
      setPlannedCheckOutDate('');
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

  const handleApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate({
      id: approveTarget.id,
      payload: plannedCheckOutDate.trim()
        ? { plannedCheckOutDate: plannedCheckOutDate.trim() }
        : undefined,
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
        title="Permintaan Perpanjangan"
        description="Tinjau dan proses permintaan perpanjangan masa tinggal tenant."
      />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Badge bg="warning" className="px-3 py-2">
          Menunggu: {pendingCount}
        </Badge>
        <Badge bg="success" className="px-3 py-2">
          Disetujui: {approvedCount}
        </Badge>
        <Badge bg="danger" className="px-3 py-2">
          Ditolak: {rejectedCount}
        </Badge>
      </div>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
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
                  <th>Stay</th>
                  <th>Tgl Checkout Diajukan</th>
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
                    <td>Stay #{(rr as any).stayId ?? '-'}</td>
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
                              setPlannedCheckOutDate('');
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
          <Form.Group className="mb-3">
            <Form.Label>Tanggal Checkout Direncanakan (opsional)</Form.Label>
            <Form.Control
              type="date"
              value={plannedCheckOutDate}
              onChange={(e) => setPlannedCheckOutDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              Kosongkan jika tidak ingin mengubah rencana checkout.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setApproveTarget(null);
              setPlannedCheckOutDate('');
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