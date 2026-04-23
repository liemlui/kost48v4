import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import SearchableSelect from '../../components/common/SearchableSelect';
import { createResource, listResource } from '../../api/resources';
import { formatDateSafe, formatPeriod } from '../resources/simpleCrudHelpers';
import { buildReferenceOptions } from '../resources/resourceRelations';
import { cancelInvoice, issueInvoice } from '../../api/invoices';

function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null;
  try {
    const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getDueSoonBadge(invoice: any): { label: string; status: string } | null {
  if (!['ISSUED', 'PARTIAL'].includes(invoice.status) || !invoice.dueDate) return null;
  const daysLeft = daysFromToday(invoice.dueDate);
  if (daysLeft === null || daysLeft < 0 || daysLeft > 3) return null;
  if (daysLeft === 0) return { label: 'Hari ini', status: 'DANGER' };
  if (daysLeft === 1) return { label: 'Besok', status: 'WARNING' };
  return { label: `H-${daysLeft}`, status: 'INFO' };
}

function isOverdue(invoice: any) {
  return ['ISSUED', 'PARTIAL'].includes(invoice.status) && invoice.dueDate && new Date(invoice.dueDate) < new Date();
}

const initialForm = { stayId: '', invoiceNumber: '', periodStart: '', periodEnd: '', dueDate: '', notes: '' };

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState(initialForm);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const invoicesQuery = useQuery({ queryKey: ['invoices', page], queryFn: () => listResource<any>('/invoices', { page, limit: PAGE_SIZE }) });
  const staysQuery = useQuery({ queryKey: ['stays', 'invoice-form'], queryFn: () => listResource<any>('/stays', { limit: 500 }) });

  const stayOptions = useMemo(() => buildReferenceOptions(staysQuery.data?.items ?? [], '/stays'), [staysQuery.data?.items]);
  const selectedStay = stayOptions.find((option) => String(option.value) === String(formState.stayId)) ?? null;

  const createMutation = useMutation({
    mutationFn: () => createResource('/invoices', {
      stayId: Number(formState.stayId),
      invoiceNumber: formState.invoiceNumber,
      periodStart: formState.periodStart,
      periodEnd: formState.periodEnd,
      dueDate: formState.dueDate || undefined,
      notes: formState.notes || undefined,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCreate(false);
      setFormState(initialForm);
      setError('');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Gagal membuat invoice';
      setError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const issueMutation = useMutation({
    mutationFn: (id: number) => issueInvoice(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelInvoice(id, { cancelReason: 'Dibatalkan dari workspace invoice' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const allItems = invoicesQuery.data?.items || [];
  const meta = invoicesQuery.data?.meta;
  const filteredItems = useMemo(() => {
    return [...allItems]
      .filter((item: any) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (keyword.trim()) {
          const term = keyword.trim().toLowerCase();
          const searchPool = [
            item.invoiceNumber,
            item.stayId,
            item.status,
            item.stay?.tenant?.fullName,
            item.stay?.room?.code,
            item.stay?.room?.name,
          ];
          const matchesKeyword = searchPool.some((value) => String(value || '').toLowerCase().includes(term));
          if (!matchesKeyword) return false;
        }

        const due = item.dueDate ? String(item.dueDate).slice(0, 10) : '';
        if (dateFrom && due && due < dateFrom) return false;
        if (dateTo && due && due > dateTo) return false;

        return true;
      })
      .sort((a: any, b: any) => {
        const overdueA = isOverdue(a) ? 1 : 0;
        const overdueB = isOverdue(b) ? 1 : 0;
        if (overdueA !== overdueB) return overdueB - overdueA;
        const unpaidA = ['ISSUED', 'PARTIAL', 'DRAFT'].includes(a.status) ? 1 : 0;
        const unpaidB = ['ISSUED', 'PARTIAL', 'DRAFT'].includes(b.status) ? 1 : 0;
        if (unpaidA !== unpaidB) return unpaidB - unpaidA;
        return Number(b.id) - Number(a.id);
      });
  }, [allItems, statusFilter, keyword, dateFrom, dateTo]);

  const stats = {
    total: allItems.length,
    draft: allItems.filter((item: any) => item.status === 'DRAFT').length,
    unpaid: allItems.filter((item: any) => ['ISSUED', 'PARTIAL'].includes(item.status)).length,
    paid: allItems.filter((item: any) => item.status === 'PAID').length,
    overdue: allItems.filter((item: any) => isOverdue(item)).length,
    dueSoon: allItems.filter((item: any) => Boolean(getDueSoonBadge(item))).length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Billing workspace"
        title="Invoices"
        description="Kelola draft, penerbitan, status tagihan, dan tindak lanjut pembayaran dengan alur yang lebih sederhana untuk tim operasional."
        actionLabel="Buat Invoice Draft"
        onAction={() => {
          setError('');
          setShowCreate(true);
        }}
      />

      <Row className="g-4 mb-4">
        <Col md={6} xl={3}><StatCard title="Total invoice" value={stats.total} subtitle="Semua data tagihan" icon="🧾" /></Col>
        <Col md={6} xl={3}><StatCard title="Belum lunas" value={stats.unpaid} subtitle="ISSUED + PARTIAL" icon="💳" variant={stats.unpaid > 0 ? 'warning' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Overdue" value={stats.overdue} subtitle="Perlu tindak lanjut" icon="⚠️" variant={stats.overdue > 0 ? 'danger' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Lunas" value={stats.paid} subtitle="Sudah selesai" icon="✅" variant="success" /></Col>
      </Row>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Filter invoice</div>
              <div className="panel-subtitle">Cari berdasarkan nomor invoice, tenant, kamar, atau fokus ke tagihan yang perlu segera diproses.</div>
            </div>
            <div className="summary-strip">
              <div className="summary-chip">
                <span className="summary-chip-label">Draft</span>
                <span className="summary-chip-value">{stats.draft}</span>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">Due soon</span>
                <span className="summary-chip-value">{stats.dueSoon}</span>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">Tampil</span>
                <span className="summary-chip-value">{filteredItems.length}</span>
              </div>
            </div>
          </div>

          <Alert variant="info" className="mt-3 mb-0">
            Flow yang paling sederhana: buat invoice draft → tambahkan line bila perlu → issue invoice → catat pembayaran dari detail invoice. Untuk perhitungan listrik/air otomatis per periode, backend berikutnya idealnya menyiapkan endpoint preview invoice berbasis meter reading.
          </Alert>

          <div className="toolbar-card mt-3">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">Semua Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ISSUED">Diterbitkan</option>
                    <option value="PARTIAL">Sebagian Dibayar</option>
                    <option value="PAID">Lunas</option>
                    <option value="CANCELLED">Dibatalkan</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Pencarian</Form.Label>
                  <Form.Control
                    placeholder="No. invoice, tenant, kamar"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Dari</Form.Label>
                  <Form.Control type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Sampai</Form.Label>
                  <Form.Control type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <div className="table-meta-count">Menampilkan {filteredItems.length} dari {meta?.totalItems ?? allItems.length} invoice</div>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          {invoicesQuery.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {invoicesQuery.isError ? <Alert variant="danger">Gagal mengambil data invoice.</Alert> : null}
          {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredItems.length === 0 ? (
            <EmptyState
              icon="🧾"
              title={allItems.length === 0 ? 'Belum ada data invoice' : 'Tidak ada invoice yang cocok'}
              description={allItems.length === 0 ? 'Buat invoice draft pertama untuk mulai mengelola tagihan.' : 'Coba ubah filter status, kata kunci, atau rentang tanggal.'}
            />
          ) : null}

          {filteredItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Tenant / Kamar</th>
                  <th>Status</th>
                  <th>Periode</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th style={{ width: 270 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const dueSoonBadge = getDueSoonBadge(item);
                  const overdue = isOverdue(item);
                  const tenantName = item.stay?.tenant?.fullName || `Stay #${item.stayId}`;
                  const roomLabel = item.stay?.room ? `${item.stay.room.code}${item.stay.room.name ? ` · ${item.stay.room.name}` : ''}` : '-';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.invoiceNumber || `INV-${item.id}`}</div>
                        <div className="small text-muted">Stay #{item.stayId}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{tenantName}</div>
                        <div className="small text-muted">{roomLabel}</div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                        {overdue ? <div className="small text-danger mt-1">Sudah lewat jatuh tempo</div> : null}
                        {!overdue && dueSoonBadge ? <div className="small text-muted mt-1">{dueSoonBadge.label}</div> : null}
                      </td>
                      <td>{formatPeriod(item.periodStart, item.periodEnd)}</td>
                      <td>
                        <div>{formatDateSafe(item.dueDate)}</div>
                        {dueSoonBadge ? <StatusBadge status={dueSoonBadge.status} customLabel={dueSoonBadge.label} className="mt-1" /> : null}
                      </td>
                      <td><CurrencyDisplay amount={item.totalAmountRupiah} /></td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <Button as={Link as any} to={`/invoices/${item.id}`} size="sm" variant="outline-primary">Buka</Button>
                          {item.status === 'DRAFT' ? (
                            <Button size="sm" variant="outline-success" onClick={() => issueMutation.mutate(item.id)} disabled={issueMutation.isPending}>
                              Issue
                            </Button>
                          ) : null}
                          {['DRAFT', 'ISSUED'].includes(item.status) ? (
                            <Button size="sm" variant="outline-danger" onClick={() => cancelMutation.mutate(item.id)} disabled={cancelMutation.isPending}>
                              Batalkan
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}

          <div className="mt-3">
            <PaginationControls
              currentPage={page}
              totalPages={meta?.totalPages ?? 1}
              totalItems={meta?.totalItems ?? allItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              isLoading={invoicesQuery.isLoading}
            />
          </div>
        </Card.Body>
      </Card>

      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Buat Invoice Draft</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Alert variant="secondary" className="small">
            Gunakan invoice draft manual hanya jika memang perlu di luar flow stay/check-in. Untuk tagihan normal stay, sistem sebaiknya tetap membuat draft otomatis dari backend.
          </Alert>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Stay</Form.Label>
                <SearchableSelect<number>
                  value={selectedStay ? { value: selectedStay.value, label: selectedStay.label } : null}
                  onChange={(option) => setFormState((p) => ({ ...p, stayId: String(option?.value ?? '') }))}
                  loadOptions={async (inputValue) => {
                    const term = inputValue.trim().toLowerCase();
                    const base = stayOptions;
                    if (!term) return base.slice(0, 50).map((item) => ({ value: item.value, label: item.label }));
                    return base
                      .filter((item) => `${item.label} ${item.caption ?? ''}`.toLowerCase().includes(term))
                      .slice(0, 50)
                      .map((item) => ({ value: item.value, label: item.label }));
                  }}
                  defaultOptions={stayOptions.slice(0, 50).map((item) => ({ value: item.value, label: item.label }))}
                  placeholder="Pilih stay yang akan ditagihkan"
                  noOptionsMessage="Stay tidak ditemukan"
                />
                <div className="form-text">{selectedStay?.caption ?? 'Pilih stay aktif atau yang relevan dari daftar.'}</div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nomor Invoice</Form.Label>
                <Form.Control value={formState.invoiceNumber} onChange={(e) => setFormState((p) => ({ ...p, invoiceNumber: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Due Date</Form.Label>
                <Form.Control type="date" value={formState.dueDate} onChange={(e) => setFormState((p) => ({ ...p, dueDate: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Period Start</Form.Label>
                <Form.Control type="date" value={formState.periodStart} onChange={(e) => setFormState((p) => ({ ...p, periodStart: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Period End</Form.Label>
                <Form.Control type="date" value={formState.periodEnd} onChange={(e) => setFormState((p) => ({ ...p, periodEnd: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Notes</Form.Label>
                <Form.Control as="textarea" rows={3} value={formState.notes} onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))} />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formState.stayId || !formState.invoiceNumber || !formState.periodStart || !formState.periodEnd}>
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan Draft'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
