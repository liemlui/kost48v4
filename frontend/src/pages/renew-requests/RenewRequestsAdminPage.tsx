import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import { PeriodVisualizer, type AssistantItem, type MetricChip } from '../../components/command-center';
import { AssistantInsightLine, StatusStrip } from '../../components/workspace';
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
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateInputToUtcIso(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTenantName(rr?: RenewRequest | null) {
  return (rr as any)?.tenant?.fullName ?? (rr as any)?.stay?.tenant?.fullName ?? `Tenant #${(rr as any)?.tenantId ?? '-'}`;
}

function getRoomCode(rr?: RenewRequest | null) {
  return (rr as any)?.room?.code ?? (rr as any)?.stay?.room?.code ?? `Kamar #${(rr as any)?.stay?.roomId ?? '-'}`;
}

function getCurrentRent(rr?: RenewRequest | null) {
  return asNumber((rr as any)?.stay?.agreedRentAmountRupiah);
}

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
];

function RenewFlowStrip() {
  return (
    <Card className="content-card border-0 mb-4 renew-command-strip">
      <Card.Body>
        <div className="section-kicker mb-2">Rule perpanjangan aktif</div>
        <div className="flow-step-grid">
          <div><span>1</span><strong>Review request</strong><small>Cek tenant, kamar, tanggal akhir masa sewa baru.</small></div>
          <div><span>2</span><strong>Catat meter</strong><small>Meter listrik dan air terbaru wajib diisi sebelum approve.</small></div>
          <div><span>3</span><strong>Tagihan dibuat</strong><small>Invoice berisi sewa + listrik + air dari selisih meter.</small></div>
          <div><span>4</span><strong>Tenant bayar</strong><small>Checkout berikutnya tetap blocked sampai invoice renew lunas.</small></div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function RenewRequestsAdminPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const [approveTarget, setApproveTarget] = useState<RenewRequest | null>(null);
  const [plannedCheckOutDate, setPlannedCheckOutDate] = useState('');
  const [approveReviewNotes, setApproveReviewNotes] = useState('');
  const [approvedRentAmount, setApprovedRentAmount] = useState('');
  const [electricityReadingValue, setElectricityReadingValue] = useState('');
  const [waterReadingValue, setWaterReadingValue] = useState('');
  const [meterReadingAt, setMeterReadingAt] = useState('');
  const [approveFormError, setApproveFormError] = useState('');

  const [rejectTarget, setRejectTarget] = useState<RenewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const query = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: ['admin-renew-requests', { status: statusFilter || undefined }],
    queryFn: () => listAdminRenewRequests(statusFilter ? { status: statusFilter } : undefined),
    refetchOnWindowFocus: true,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ApproveRenewRequestPayload }) => approveRenewRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setApproveTarget(null);
      setPlannedCheckOutDate('');
      setApproveReviewNotes('');
      setApprovedRentAmount('');
      setElectricityReadingValue('');
      setWaterReadingValue('');
      setMeterReadingAt('');
      setApproveFormError('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { reviewNotes: string } }) => rejectRenewRequest(id, payload),
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
      title: `${pendingCount} perpanjangan menunggu meter checkpoint`,
      message: 'Approve renew tidak boleh hanya memperpanjang tanggal. Admin wajib catat meter terbaru agar invoice renew berisi sewa + listrik + air.',
      source: 'Renew',
      count: pendingCount,
      actionLabel: 'Lihat pending',
      onAction: () => setStatusFilter('PENDING'),
    } : null,
    approvedCount ? {
      id: 'renew-approved',
      severity: 'INFO',
      title: `${approvedCount} perpanjangan sudah diproses`,
      message: 'Pastikan invoice perpanjangan dibayar tenant. Checkout berikutnya akan tetap tertahan jika tagihan renew masih open.',
      source: 'Invoice renew',
      count: approvedCount,
      actionLabel: 'Lihat approved',
      onAction: () => setStatusFilter('APPROVED'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'pending', label: 'Menunggu', value: pendingCount, helper: 'Butuh meter + keputusan', icon: '⏳', status: pendingCount ? 'WARNING' : 'SUCCESS', onClick: () => setStatusFilter('PENDING') },
    { id: 'approved', label: 'Disetujui', value: approvedCount, helper: 'Invoice renew sudah dibuat', icon: '✅', status: 'SUCCESS', onClick: () => setStatusFilter('APPROVED') },
    { id: 'rejected', label: 'Ditolak', value: rejectedCount, helper: 'Ada catatan review', icon: '✕', status: rejectedCount ? 'DANGER' : 'SUCCESS', onClick: () => setStatusFilter('REJECTED') },
    { id: 'total', label: 'Total Request', value: items.length, helper: statusFilter ? 'Sesuai filter aktif' : 'Semua status', icon: '📋', status: 'INFO', onClick: () => setStatusFilter('') },
  ];

  const handleApprove = () => {
    if (!approveTarget) return;
    const nextPlannedCheckOutDate = plannedCheckOutDate.trim();
    const nextReviewNotes = approveReviewNotes.trim();
    const normalizedRentAmount = approvedRentAmount.replace(/\D/g, '');
    const parsedRentAmount = normalizedRentAmount ? Number(normalizedRentAmount) : NaN;
    const nextElectricityReading = electricityReadingValue.trim();
    const nextWaterReading = waterReadingValue.trim();
    const nextMeterReadingAt = meterReadingAt.trim();

    if (!nextElectricityReading || !nextWaterReading || !nextMeterReadingAt) {
      setApproveFormError('Catat meter listrik, meter air, dan waktu catat meter sebelum menyetujui perpanjangan.');
      return;
    }
    if (Number(nextElectricityReading) < 0 || Number(nextWaterReading) < 0) {
      setApproveFormError('Angka meter tidak boleh negatif.');
      return;
    }
    if (Number.isNaN(new Date(nextMeterReadingAt).getTime())) {
      setApproveFormError('Waktu catat meter belum valid.');
      return;
    }

    const payload: ApproveRenewRequestPayload = {
      electricityReadingValue: nextElectricityReading,
      waterReadingValue: nextWaterReading,
      meterReadingAt: new Date(nextMeterReadingAt).toISOString(),
    };

    if (nextPlannedCheckOutDate) payload.plannedCheckOutDate = dateInputToUtcIso(nextPlannedCheckOutDate);
    if (Number.isFinite(parsedRentAmount) && parsedRentAmount > 0) payload.agreedRentAmountRupiah = parsedRentAmount;
    if (nextReviewNotes) payload.reviewNotes = nextReviewNotes;

    setApproveFormError('');
    approveMutation.mutate({ id: approveTarget.id, payload });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget.id, payload: { reviewNotes: reviewNotes.trim() || 'Ditolak tanpa alasan.' } });
  };

  const selectedRent = approvedRentAmount ? Number(approvedRentAmount.replace(/\D/g, '')) : getCurrentRent(approveTarget);

  return (
    <div className="renew-command-page">
      <PageHeader
        eyebrow="Renew Command Center"
        title="Permintaan Perpanjangan"
        description="Perpanjangan adalah checkpoint operasional: admin catat meter terbaru, sistem menghitung listrik/air, lalu menerbitkan tagihan masa sewa baru."
      />

      <RenewFlowStrip />
      <AssistantInsightLine
        title="Asisten Renew"
        tone={pendingCount ? 'warning' : approvedCount ? 'info' : 'success'}
        message={assistantItems[0] ? `${assistantItems[0].title}. ${assistantItems[0].message}` : 'Tidak ada perpanjangan yang menunggu. Riwayat tetap bisa dicek dari badge status.'}
        actionLabel={assistantItems[0]?.actionLabel}
        onAction={assistantItems[0]?.onAction}
      />
      <StatusStrip
        items={metrics.map((metric) => ({
          id: metric.id,
          label: metric.label,
          value: metric.value,
          helper: metric.helper,
          tone: metric.status === 'DANGER' ? 'danger' : metric.status === 'WARNING' ? 'warning' : metric.status === 'SUCCESS' ? 'success' : 'info',
          onClick: metric.onClick,
        }))}
      />

      <Card className="content-card border-0 mb-4 command-filter-card compact-filter-only">
        <Card.Body className="py-3">
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">Filter perpanjangan</div>
              <div className="panel-subtitle">Gunakan badge status. Tidak ada card besar atau select tambahan.</div>
            </div>
            <div className="status-tab-bar compact-tabs">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.value || 'ALL'} className={`status-tab${statusFilter === opt.value ? ' active' : ''}`} onClick={() => setStatusFilter(opt.value)}>
                  {opt.label}<span className="tab-badge">{opt.value === 'PENDING' ? pendingCount : opt.value === 'APPROVED' ? approvedCount : opt.value === 'REJECTED' ? rejectedCount : items.length}</span>
                </button>
              ))}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 renew-table-card">
        <Card.Body>
          {query.isLoading ? <TableSkeleton rows={5} cols={6} /> : query.isError ? (
            <Alert variant="danger">Gagal memuat data permintaan perpanjangan. Silakan coba lagi.</Alert>
          ) : items.length === 0 ? (
            <EmptyState icon="📋" title="Belum ada permintaan perpanjangan" description={statusFilter ? `Tidak ada permintaan dengan status ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}.` : 'Belum ada tenant yang mengajukan perpanjangan masa sewa.'} />
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Tenant & Kamar</th>
                  <th>Permintaan</th>
                  <th>Masa Sewa</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rr) => (
                  <tr key={rr.id}>
                    <td>
                      <div className="fw-semibold">{getTenantName(rr)}</div>
                      <div className="small text-muted">{getRoomCode(rr)} · Request #{rr.id}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{formatDate(rr.requestedCheckOutDate)}</div>
                      <div className="small text-muted">Term: {rr.requestedTerm}</div>
                    </td>
                    <td>
                      <div className="small text-muted">Akhir sekarang</div>
                      <div className="fw-semibold">{formatDate((rr as any).stay?.plannedCheckOutDate)}</div>
                    </td>
                    <td><StatusBadge status={rr.status} /></td>
                    <td className="small text-muted" style={{ maxWidth: 260 }}>
                      {rr.requestNotes ? <div title={rr.requestNotes}>{rr.requestNotes}</div> : 'Tidak ada catatan tenant.'}
                      {(rr as any).reviewNotes ? <div className="mt-1 text-danger"><em>{(rr as any).reviewNotes}</em></div> : null}
                    </td>
                    <td>
                      {rr.status === 'PENDING' ? (
                        <div className="d-flex gap-2 flex-wrap">
                          <Button variant="success" size="sm" onClick={() => { setApproveTarget(rr); setPlannedCheckOutDate(rr.requestedCheckOutDate ? rr.requestedCheckOutDate.slice(0, 10) : ''); setApproveReviewNotes(''); setApprovedRentAmount(''); setElectricityReadingValue(''); setWaterReadingValue(''); setMeterReadingAt(new Date().toISOString().slice(0, 16)); setApproveFormError(''); }}>Catat Meter & Setujui</Button>
                          <Button variant="outline-danger" size="sm" onClick={() => { setRejectTarget(rr); setReviewNotes(''); }}>Tolak</Button>
                        </div>
                      ) : <span className="text-muted small">Sudah diproses</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!approveTarget} onHide={() => { if (!approveMutation.isPending) { setApproveTarget(null); setApproveFormError(''); } }} centered size="xl" dialogClassName="renew-approval-command-modal">
        <Modal.Header closeButton>
          <Modal.Title>Setujui Perpanjangan + Catat Meter</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {approveFormError ? <Alert variant="warning" className="small">{approveFormError}</Alert> : null}
          {approveMutation.isError ? <Alert variant="danger" className="small">{(approveMutation.error as any)?.response?.data?.message ?? 'Gagal menyetujui permintaan.'}</Alert> : null}

          <div className="renew-approval-hero mb-3">
            <div>
              <div className="section-kicker">Approval checkpoint</div>
              <h4>{getRoomCode(approveTarget)} · {getTenantName(approveTarget)}</h4>
              <p>Request #{approveTarget?.id} akan menjadi invoice perpanjangan setelah meter listrik dan air terbaru dicatat.</p>
            </div>
            <div className="renew-approval-total">
              <span>Minimal sewa renew</span>
              <strong>{formatRupiah(selectedRent || null)}</strong>
              <small>Belum termasuk listrik/air; backend menghitung dari selisih meter.</small>
            </div>
          </div>

          <Row className="g-3">
            <Col lg={5}>
              <div className="decision-section-card h-100">
                <div className="section-kicker">1. Tanggal & tarif</div>
                <PeriodVisualizer
                  title="Perbandingan Masa Sewa"
                  subtitle="Cek tanggal lama, tanggal yang diajukan tenant, dan tanggal yang akan disetujui."
                  points={[
                    { id: 'current', label: 'Akhir masa sewa sekarang', value: formatDate((approveTarget as any)?.stay?.plannedCheckOutDate), status: 'INFO', statusLabel: 'Saat ini' },
                    { id: 'requested', label: 'Diajukan tenant', value: formatDate(approveTarget?.requestedCheckOutDate), status: 'WARNING', statusLabel: 'Request' },
                    { id: 'approved', label: 'Akan disetujui', value: plannedCheckOutDate ? formatDate(plannedCheckOutDate) : formatDate(approveTarget?.requestedCheckOutDate), status: 'SUCCESS', statusLabel: 'Approval' },
                  ]}
                />
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Tanggal akhir masa sewa baru</Form.Label>
                  <Form.Control type="date" value={plannedCheckOutDate} onChange={(e) => setPlannedCheckOutDate(e.target.value)} />
                  <Form.Text className="text-muted">Kosongkan untuk mengikuti tanggal yang diajukan tenant.</Form.Text>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Tarif sewa renew</Form.Label>
                  <Form.Control type="text" inputMode="numeric" placeholder="Kosongkan jika tetap memakai tarif sebelumnya" value={approvedRentAmount} onChange={(e) => setApprovedRentAmount(e.target.value.replace(/\D/g, ''))} />
                  <Form.Text className="text-muted">Tarif saat ini: {formatRupiah(approveTarget?.stay?.agreedRentAmountRupiah ?? null)}.</Form.Text>
                </Form.Group>
              </div>
            </Col>
            <Col lg={7}>
              <div className="decision-section-card">
                <div className="section-kicker">2. Meter checkpoint wajib</div>
                <p className="small text-muted mb-3">Sistem akan mencari catatan meter sebelumnya, menghitung selisih, lalu menambahkan biaya listrik dan air ke tagihan perpanjangan. Angka meter tidak boleh lebih kecil dari catatan sebelumnya.</p>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Meter listrik terbaru (kWh)</Form.Label>
                      <Form.Control type="text" inputMode="decimal" placeholder="Contoh: 1234.000" value={electricityReadingValue} onChange={(e) => setElectricityReadingValue(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Meter air terbaru (m³)</Form.Label>
                      <Form.Control type="text" inputMode="decimal" placeholder="Contoh: 88.000" value={waterReadingValue} onChange={(e) => setWaterReadingValue(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Waktu catat meter</Form.Label>
                      <Form.Control type="datetime-local" value={meterReadingAt} onChange={(e) => setMeterReadingAt(e.target.value)} />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="renew-invoice-preview mt-3">
                  <div><span>Line 1</span><strong>Sewa masa sewa baru</strong><small>{formatRupiah(selectedRent || null)}</small></div>
                  <div><span>Line 2</span><strong>Listrik dari selisih meter</strong><small>Dihitung backend</small></div>
                  <div><span>Line 3</span><strong>Air dari selisih meter</strong><small>Dihitung backend</small></div>
                </div>
              </div>
              <div className="decision-section-card mt-3">
                <Form.Group>
                  <Form.Label>Catatan persetujuan</Form.Label>
                  <Form.Control as="textarea" rows={3} value={approveReviewNotes} onChange={(e) => setApproveReviewNotes(e.target.value)} placeholder="Contoh: Disetujui, meter sudah dicatat dan tagihan perpanjangan akan diterbitkan." />
                </Form.Group>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => { setApproveTarget(null); setApproveFormError(''); }} disabled={approveMutation.isPending}>Batal</Button>
          <Button variant="success" onClick={handleApprove} disabled={approveMutation.isPending}>{approveMutation.isPending ? <><Spinner animation="border" size="sm" className="me-1" />Menyetujui...</> : 'Setujui & Buat Tagihan Renew'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!rejectTarget} onHide={() => { if (!rejectMutation.isPending) { setRejectTarget(null); setReviewNotes(''); } }} centered>
        <Modal.Header closeButton><Modal.Title>Tolak Perpanjangan</Modal.Title></Modal.Header>
        <Modal.Body>
          {rejectMutation.isError ? <Alert variant="danger" className="small">{(rejectMutation.error as any)?.response?.data?.message ?? 'Gagal menolak permintaan.'}</Alert> : null}
          <p className="text-muted small">Anda akan menolak permintaan perpanjangan <strong>#{rejectTarget?.id}</strong> dari <strong>{getTenantName(rejectTarget)}</strong>.</p>
          <Form.Group className="mb-3">
            <Form.Label>Alasan Penolakan</Form.Label>
            <Form.Control as="textarea" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Tulis alasan penolakan yang jelas untuk admin/tenant..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setRejectTarget(null); setReviewNotes(''); }} disabled={rejectMutation.isPending}>Batal</Button>
          <Button variant="danger" onClick={handleReject} disabled={rejectMutation.isPending}>{rejectMutation.isPending ? <><Spinner animation="border" size="sm" className="me-1" />Menolak...</> : 'Tolak'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
