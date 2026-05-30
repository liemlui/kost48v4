import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import { PeriodVisualizer, type AssistantItem, type MetricChip } from '../../components/command-center';
import { AssistantInsightLine, EntityBadgeFilterBar, StatusStrip } from '../../components/workspace';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import StatusBadge from '../../components/common/StatusBadge';
import { listAdminRenewRequests, approveRenewRequest, rejectRenewRequest } from '../../api/renewRequests';
import { formatRupiah } from '../../utils/formatCurrency';
import { getRenewApprovalSafety, getRenewRequestRiskBadge } from '../../utils/renewApprovalSafety';
import { getRenewTermLabel } from '../../utils/renewTermLabels';
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


function todayDateInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
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
          <div><span>1</span><strong>Review</strong><small>Cek tenant & tanggal.</small></div>
          <div><span>2</span><strong>Catat meter</strong><small>Listrik & air wajib.</small></div>
          <div><span>3</span><strong>Tagihan dibuat</strong><small>Sewa + listrik + air.</small></div>
          <div><span>4</span><strong>Tenant bayar</strong><small>Belum lunas = tetap block.</small></div>
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
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<RenewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectFormError, setRejectFormError] = useState('');

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
      // Keep tenant portal views in sync after admin acts on a renew request.
      queryClient.invalidateQueries({ queryKey: ['portal-renew-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stay'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] });
      setApproveTarget(null);
      setPlannedCheckOutDate('');
      setApproveReviewNotes('');
      setApprovedRentAmount('');
      setElectricityReadingValue('');
      setWaterReadingValue('');
      setMeterReadingAt('');
      setApproveFormError('');
      setApprovalAcknowledged(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { reviewNotes: string } }) => rejectRenewRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portal-renew-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] });
      setRejectTarget(null);
      setReviewNotes('');
      setRejectFormError('');
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
      title: `${pendingCount} renew menunggu meter`,
      message: 'Catat meter dulu. Sistem buat tagihan renew.',
      source: 'Perpanjangan',
      count: pendingCount,

    } : null,
    approvedCount ? {
      id: 'renew-approved',
      severity: 'INFO',
      title: `${approvedCount} renew sudah diproses`,
      message: 'Pastikan tagihan renew dibayar tenant.',
      source: 'Tagihan perpanjangan',
      count: approvedCount,

    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'pending', label: 'Menunggu', value: pendingCount, helper: 'Butuh meter + keputusan', icon: '⏳', status: pendingCount ? 'WARNING' : 'SUCCESS' },
    { id: 'approved', label: 'Disetujui', value: approvedCount, helper: 'Tagihan perpanjangan sudah dibuat', icon: '✅', status: 'SUCCESS' },
    { id: 'rejected', label: 'Ditolak', value: rejectedCount, helper: 'Ada catatan review', icon: '✕', status: rejectedCount ? 'DANGER' : 'SUCCESS' },
    { id: 'total', label: 'Total Request', value: items.length, helper: statusFilter ? 'Sesuai filter aktif' : 'Semua status', icon: '📋', status: 'INFO' },
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

    const safety = getRenewApprovalSafety({
      request: approveTarget,
      plannedCheckOutDate: nextPlannedCheckOutDate,
      approvedRentAmount,
      electricityReadingValue: nextElectricityReading,
      waterReadingValue: nextWaterReading,
      meterReadingAt: nextMeterReadingAt,
    });

    if (safety.blockers.length) {
      setApproveFormError(safety.blockers[0]?.message ?? 'Lengkapi data renew sebelum approve.');
      return;
    }
    if (safety.requiresAcknowledgement && !approvalAcknowledged) {
      setApproveFormError('Centang konfirmasi keputusan dulu.');
      return;
    }

    const payload: ApproveRenewRequestPayload = {
      electricityReadingValue: nextElectricityReading,
      waterReadingValue: nextWaterReading,
      meterReadingAt: nextMeterReadingAt,
    };

    if (nextPlannedCheckOutDate) payload.plannedCheckOutDate = dateInputToUtcIso(nextPlannedCheckOutDate);
    if (Number.isFinite(parsedRentAmount) && parsedRentAmount > 0) payload.agreedRentAmountRupiah = parsedRentAmount;
    if (nextReviewNotes) payload.reviewNotes = nextReviewNotes;

    setApproveFormError('');
    approveMutation.mutate({ id: approveTarget.id, payload });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    const note = reviewNotes.trim();
    if (note.length < 8) {
      setRejectFormError('Alasan minimal 8 karakter.');
      return;
    }
    setRejectFormError('');
    rejectMutation.mutate({ id: rejectTarget.id, payload: { reviewNotes: note } });
  };

  const selectedRent = approvedRentAmount ? Number(approvedRentAmount.replace(/\D/g, '')) : getCurrentRent(approveTarget);
  const approvalSafety = getRenewApprovalSafety({
    request: approveTarget,
    plannedCheckOutDate,
    approvedRentAmount,
    electricityReadingValue,
    waterReadingValue,
    meterReadingAt,
  });
  const canSubmitApprove = approvalSafety.canApprove && (!approvalSafety.requiresAcknowledgement || approvalAcknowledged);
  const rejectNoteValid = reviewNotes.trim().length >= 8;

  return (
    <div className="renew-command-page">
      <PageHeader
        eyebrow="Pusat Perpanjangan"
        title="Permintaan Perpanjangan"
        description="Catat meter, approve, lalu sistem membuat tagihan renew."
      />

      <RenewFlowStrip />
      <AssistantInsightLine
        title="Asisten Renew"
        tone={pendingCount ? 'warning' : approvedCount ? 'info' : 'success'}
        message={assistantItems[0] ? `${assistantItems[0].title}. ${assistantItems[0].message}` : 'Tidak ada renew pending.'}
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
        }))}
      />

      <Card className="content-card border-0 mb-4 command-filter-card compact-filter-only">
        <Card.Body className="py-3">
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">Filter perpanjangan</div>
              <div className="panel-subtitle">Pilih status untuk fokus kerja.</div>
            </div>
            <EntityBadgeFilterBar
              ariaLabel="Filter daftar perpanjangan"
              activeId={statusFilter || 'ALL'}
              onChange={(id) => setStatusFilter(id === 'ALL' ? '' : id)}
              filters={STATUS_OPTIONS.map((opt) => ({
                id: opt.value || 'ALL',
                label: opt.label.replace(' Status', ''),
                count: opt.value === 'PENDING' ? pendingCount : opt.value === 'APPROVED' ? approvedCount : opt.value === 'REJECTED' ? rejectedCount : items.length,
                tone: opt.value === 'PENDING' ? 'warning' : opt.value === 'APPROVED' ? 'success' : opt.value === 'REJECTED' ? 'danger' : 'info',
              }))}
            />
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
            <Table hover responsive className="align-middle mb-0 responsive-data-table">
              <thead>
                <tr>
                  <th>Tenant & Kamar</th>
                  <th>Permintaan</th>
                  <th>Masa Sewa</th>
                  <th>Status</th>
                  <th>Risiko</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rr) => {
                  const riskBadge = getRenewRequestRiskBadge(rr);
                  return (
                  <tr key={rr.id}>
                    <td data-label="Tenant & Kamar">
                      <div className="fw-semibold">{getTenantName(rr)}</div>
                      <div className="small text-muted">{getRoomCode(rr)} · Request #{rr.id}</div>
                    </td>
                    <td data-label="Permintaan">
                      <div className="fw-semibold">{formatDate(rr.requestedCheckOutDate)}</div>
                      <div className="small text-muted">{getRenewTermLabel(rr.requestedTerm)}</div>
                    </td>
                    <td data-label="Masa Sewa">
                      <div className="small text-muted">Akhir sekarang</div>
                      <div className="fw-semibold">{formatDate((rr as any).stay?.plannedCheckOutDate)}</div>
                    </td>
                    <td data-label="Status"><StatusBadge status={rr.status} /></td>
                    <td data-label="Risiko"><span className={`renew-risk-pill ${riskBadge.tone}`}>{riskBadge.label}</span></td>
                    <td data-label="Catatan" className="small text-muted" style={{ maxWidth: 260 }}>
                      {rr.requestNotes ? <div title={rr.requestNotes}>{rr.requestNotes}</div> : 'Tidak ada catatan tenant.'}
                      {(rr as any).reviewNotes ? <div className="mt-1 text-danger"><em>{(rr as any).reviewNotes}</em></div> : null}
                    </td>
                    <td data-label="Aksi">
                      {rr.status === 'PENDING' ? (
                        <div className="d-flex gap-2 flex-wrap">
                          <Button variant="success" size="sm" onClick={() => { setApproveTarget(rr); setPlannedCheckOutDate(rr.requestedCheckOutDate ? rr.requestedCheckOutDate.slice(0, 10) : ''); setApproveReviewNotes(''); setApprovedRentAmount(''); setElectricityReadingValue(''); setWaterReadingValue(''); setMeterReadingAt(todayDateInput()); setApproveFormError(''); setApprovalAcknowledged(false); }}>Catat & Setujui</Button>
                          <Button variant="outline-danger" size="sm" onClick={() => { setRejectTarget(rr); setReviewNotes(''); setRejectFormError(''); }}>Tolak</Button>
                        </div>
                      ) : <span className="text-muted small">Sudah diproses</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!approveTarget} onHide={() => { if (!approveMutation.isPending) { setApproveTarget(null); setApproveFormError(''); setApprovalAcknowledged(false); } }} centered size="xl" dialogClassName="renew-approval-command-modal">
        <Modal.Header closeButton>
          <Modal.Title>Catat & Setujui Perpanjangan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {approveFormError ? <Alert variant="warning" className="small">{approveFormError}</Alert> : null}
          {approveMutation.isError ? <Alert variant="danger" className="small">{(approveMutation.error as any)?.response?.data?.message ?? 'Gagal menyetujui permintaan.'}</Alert> : null}

          <div className="renew-approval-hero mb-3">
            <div>
              <div className="section-kicker">Approval checkpoint</div>
              <h4>{getRoomCode(approveTarget)} · {getTenantName(approveTarget)}</h4>
              <p>Catat meter. Sistem membuat tagihan renew.</p>
            </div>
            <div className="renew-approval-total">
              <span>Sewa renew</span>
              <strong>{formatRupiah(selectedRent || null)}</strong>
              <small>Utility dihitung dari meter.</small>
            </div>
          </div>

          <div className={`renew-safety-card ${approvalSafety.riskTone} mb-3`}>
            <div>
              <span className={`renew-risk-pill ${approvalSafety.riskTone}`}>{approvalSafety.riskLabel}</span>
              <strong>Safety renew</strong>
              <small>{approvalSafety.blockers[0]?.title ?? approvalSafety.warnings[0]?.title ?? 'Data siap diproses.'}</small>
            </div>
            <div className="renew-safety-list">
              {[...approvalSafety.blockers, ...approvalSafety.warnings].slice(0, 3).map((item) => (
                <div key={item.id} className={`renew-safety-item ${item.tone}`}>
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </div>
              ))}
              {!approvalSafety.blockers.length && !approvalSafety.warnings.length ? (
                <div className="renew-safety-item success"><strong>Siap approve</strong><span>Meter, tanggal, dan tagihan renew jelas.</span></div>
              ) : null}
            </div>
          </div>

          <Row className="g-3">
            <Col lg={5}>
              <div className="decision-section-card h-100">
                <div className="section-kicker">1. Tanggal & tarif</div>
                <PeriodVisualizer
                  title="Perbandingan Masa Sewa"
                  subtitle="Pastikan tanggal tidak mundur."
                  points={[
                    { id: 'current', label: 'Akhir masa sewa sekarang', value: formatDate((approveTarget as any)?.stay?.plannedCheckOutDate), status: 'INFO', statusLabel: 'Saat ini' },
                    { id: 'requested', label: 'Diajukan tenant', value: formatDate(approveTarget?.requestedCheckOutDate), status: 'WARNING', statusLabel: 'Request' },
                    { id: 'approved', label: 'Akan disetujui', value: plannedCheckOutDate ? formatDate(plannedCheckOutDate) : formatDate(approveTarget?.requestedCheckOutDate), status: 'SUCCESS', statusLabel: 'Approval' },
                  ]}
                />
                <Form.Group className="mb-3 mt-3">
                  <Form.Label>Tanggal akhir masa sewa baru</Form.Label>
                  <Form.Control type="date" value={plannedCheckOutDate} onChange={(e) => setPlannedCheckOutDate(e.target.value)} />
                  <Form.Text className="text-muted">Kosongkan = ikut request tenant.</Form.Text>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Tarif sewa renew</Form.Label>
                  <Form.Control type="text" inputMode="numeric" placeholder="Kosongkan jika tetap" value={approvedRentAmount} onChange={(e) => setApprovedRentAmount(e.target.value.replace(/\D/g, ''))} />
                  <Form.Text className="text-muted">Tarif saat ini: {formatRupiah(approveTarget?.stay?.agreedRentAmountRupiah ?? null)}.</Form.Text>
                </Form.Group>
              </div>
            </Col>
            <Col lg={7}>
              <div className="decision-section-card">
                <div className="section-kicker">2. Meter checkpoint wajib</div>
                <p className="small text-muted mb-3">Catat meter terbaru. Angka tidak boleh lebih kecil dari catatan lama.</p>
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
                      <Form.Label>Tanggal catat meter</Form.Label>
                      <Form.Control type="date" value={meterReadingAt} onChange={(e) => setMeterReadingAt(e.target.value)} />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="renew-invoice-preview mt-3">
                  <div><span>1</span><strong>Sewa baru</strong><small>{formatRupiah(selectedRent || null)}</small></div>
                  <div><span>2</span><strong>Listrik</strong><small>Dihitung sistem</small></div>
                  <div><span>3</span><strong>Air</strong><small>Dihitung sistem</small></div>
                </div>
              </div>
              {approvalSafety.requiresAcknowledgement ? (
                <div className="decision-section-card mt-3">
                  <div className="section-kicker">3. Konfirmasi singkat</div>
                  <div className="renew-ack-list">
                    {approvalSafety.checklist.map((item) => <div key={item}>✓ {item}</div>)}
                  </div>
                  <Form.Check className="mt-3" type="checkbox" checked={approvalAcknowledged} onChange={(e) => { setApprovalAcknowledged(e.target.checked); if (e.target.checked) setApproveFormError(''); }} label="Saya sudah cek dan siap approve." />
                </div>
              ) : null}
              <div className="decision-section-card mt-3">
                <Form.Group>
                  <Form.Label>Catatan persetujuan</Form.Label>
                  <Form.Control as="textarea" rows={3} value={approveReviewNotes} onChange={(e) => setApproveReviewNotes(e.target.value)} placeholder="Contoh: Meter sudah dicatat." />
                </Form.Group>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => { setApproveTarget(null); setApproveFormError(''); setApprovalAcknowledged(false); }} disabled={approveMutation.isPending}>Batal</Button>
          <Button variant="success" onClick={handleApprove} disabled={approveMutation.isPending || !canSubmitApprove}>{approveMutation.isPending ? <><Spinner animation="border" size="sm" className="me-1" />Menyetujui...</> : approvalSafety.blockers.length ? 'Lengkapi Data Perpanjangan' : 'Approve & Buat Tagihan'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!rejectTarget} onHide={() => { if (!rejectMutation.isPending) { setRejectTarget(null); setReviewNotes(''); setRejectFormError(''); } }} centered>
        <Modal.Header closeButton><Modal.Title>Tolak Perpanjangan</Modal.Title></Modal.Header>
        <Modal.Body>
          {rejectFormError ? <Alert variant="warning" className="small">{rejectFormError}</Alert> : null}
          {rejectMutation.isError ? <Alert variant="danger" className="small">{(rejectMutation.error as any)?.response?.data?.message ?? 'Gagal menolak permintaan.'}</Alert> : null}
          <p className="text-muted small">Tolak renew <strong>#{rejectTarget?.id}</strong> dari <strong>{getTenantName(rejectTarget)}</strong>. Alasan wajib jelas.</p>
          <Form.Group className="mb-3">
            <Form.Label>Alasan Penolakan</Form.Label>
            <Form.Control as="textarea" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Contoh: Tagihan lama belum selesai." />
          </Form.Group>
          <div className="renew-reject-examples">
            <span>Contoh:</span>
            <button type="button" onClick={() => setReviewNotes('Tagihan lama belum selesai.')}>Tagihan lama belum selesai.</button>
            <button type="button" onClick={() => setReviewNotes('Data perpanjangan belum sesuai.')}>Data belum sesuai.</button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setRejectTarget(null); setReviewNotes(''); setRejectFormError(''); }} disabled={rejectMutation.isPending}>Batal</Button>
          <Button variant="danger" onClick={handleReject} disabled={rejectMutation.isPending || !rejectNoteValid}>{rejectMutation.isPending ? <><Spinner animation="border" size="sm" className="me-1" />Menolak...</> : 'Tolak Perpanjangan'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
