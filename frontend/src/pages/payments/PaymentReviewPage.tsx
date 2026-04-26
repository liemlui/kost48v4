import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import ReviewPaymentModal from '../../components/payments/ReviewPaymentModal';
import {
  approvePaymentSubmission,
  listPaymentReviewQueue,
  rejectPaymentSubmission,
} from '../../api/paymentSubmissions';
import type { PaymentSubmission } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTargetLabel(item: PaymentSubmission) {
  return item.targetType === 'DEPOSIT' ? 'Deposit' : 'Sewa Awal';
}

export default function PaymentReviewPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'PENDING_REVIEW' | 'REJECTED' | 'APPROVED'>('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PaymentSubmission | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['payment-review-queue', status, search],
    queryFn: () => listPaymentReviewQueue({ status, search: search.trim() || undefined, limit: 100 }),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payment-review-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['stays'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stay'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
      queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: async (submissionId: number) => approvePaymentSubmission(submissionId),
    onSuccess: async () => {
      setSelected(null);
      setActionError(null);
      await refreshRelated();
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message ?? 'Gagal menyetujui bukti pembayaran.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reviewNotes }: { submissionId: number; reviewNotes: string }) =>
      rejectPaymentSubmission(submissionId, reviewNotes),
    onSuccess: async () => {
      setSelected(null);
      setActionError(null);
      await refreshRelated();
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message ?? 'Gagal menolak bukti pembayaran.');
    },
  });

  return (
    <div>
      <PageHeader
        title="Review Pembayaran"
        description={`Satu queue kerja untuk bukti bayar booking tenant. Di sinilah admin memeriksa gambar bukti, lalu memutuskan approve atau reject. ${items.length ? `Saat ini ada ${items.length} submission pada filter aktif.` : ''}`}
      />

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={(e) => setStatus(e.currentTarget.value as any)}>
                  <option value="PENDING_REVIEW">Menunggu Review</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="REJECTED">Ditolak</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-5">
              <Form.Group>
                <Form.Label>Pencarian</Form.Label>
                <Form.Control
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  placeholder="Cari tenant, kamar, invoice, atau nomor referensi"
                />
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Button variant="outline-secondary" className="w-100" onClick={() => query.refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat queue review pembayaran.</Alert> : null}
          {!query.isLoading && !query.isError && !items.length ? (
            <EmptyState
              icon="💸"
              title="Belum ada submission"
              description="Queue review pembayaran akan muncul di sini saat tenant mengirim bukti bayar."
            />
          ) : null}

          {!query.isLoading && !query.isError && items.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Kamar</th>
                  <th>Target</th>
                  <th>Invoice/Konteks</th>
                  <th>Nominal</th>
                  <th>Tanggal Bayar</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.tenant?.fullName ?? '-'}</div>
                      <div className="small text-muted">{item.tenant?.phone ?? '-'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{item.room?.code ?? '-'}</div>
                      <div className="small text-muted">{item.room?.name ?? 'Nama kamar belum tersedia'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{getTargetLabel(item)}</div>
                      <div className="small text-muted">{item.paymentMethod}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">
                        {item.targetType === 'DEPOSIT'
                          ? `Deposit ${item.room?.code ?? ''}`.trim()
                          : (item.invoice?.invoiceNumber ?? `INV-${item.invoiceId}`)}
                      </div>
                      <div className="small text-muted">
                        {item.targetType === 'DEPOSIT'
                          ? `Status deposit: ${item.deposit?.paymentStatus ?? 'UNPAID'}`
                          : `Status invoice: ${item.invoice?.status ?? 'ISSUED'}`}
                      </div>
                    </td>
                    <td><CurrencyDisplay amount={item.amountRupiah} /></td>
                    <td>{formatDate(item.paidAt)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        {item.fileUrl ? (
                          <Button as="a" href={resolveAbsoluteFileUrl(item.fileUrl) ?? '#'} target="_blank" rel="noreferrer" size="sm" variant="outline-secondary">
                            Buka Bukti
                          </Button>
                        ) : null}
                        {item.status === 'PENDING_REVIEW' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelected(item);
                                setModalMode('approve');
                                setActionError(null);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => {
                                setSelected(item);
                                setModalMode('reject');
                                setActionError(null);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card.Body>
      </Card>

      <ReviewPaymentModal
        show={Boolean(selected)}
        mode={modalMode}
        submission={selected}
        busy={approveMutation.isPending || rejectMutation.isPending}
        errorMessage={actionError}
        onHide={() => setSelected(null)}
        onApprove={() => selected && approveMutation.mutate(selected.id)}
        onReject={(reviewNotes) => selected && rejectMutation.mutate({ submissionId: selected.id, reviewNotes })}
      />
    </div>
  );
}
