import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import SearchableSelect from '../../components/common/SearchableSelect';
import { AssistantPanel, ActionQueueTable, CompactMetrics, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import { createResource, listResource } from '../../api/resources';
import { formatDateSafe, formatPeriod } from '../resources/simpleCrudHelpers';
import { buildReferenceOptions } from '../resources/resourceRelations';
import { cancelInvoice, issueInvoice } from '../../api/invoices';
import { useAuth } from '../../context/AuthContext';

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

type StatusTab = 'ALL' | 'DRAFT' | 'BILLING' | 'OVERDUE' | 'PAID' | 'CANCELLED';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageFinance = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState(initialForm);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('BILLING');
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

  useEffect(() => { setPage(1); }, [activeTab, keyword, dateFrom, dateTo]);

  const allItems = invoicesQuery.data?.items || [];
  const meta = invoicesQuery.data?.meta;

  const stats = {
    total: allItems.length,
    draft: allItems.filter((item: any) => item.status === 'DRAFT').length,
    billing: allItems.filter((item: any) => ['ISSUED', 'PARTIAL'].includes(item.status) && !isOverdue(item)).length,
    paid: allItems.filter((item: any) => item.status === 'PAID').length,
    overdue: allItems.filter((item: any) => isOverdue(item)).length,
    dueSoon: allItems.filter((item: any) => Boolean(getDueSoonBadge(item))).length,
    cancelled: allItems.filter((item: any) => item.status === 'CANCELLED').length,
  };

  const filteredItems = useMemo(() => {
    return [...allItems]
      .filter((item: any) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OVERDUE') return isOverdue(item);
        if (activeTab === 'DRAFT' && item.status !== 'DRAFT') return false;
        if (activeTab === 'BILLING' && (!['ISSUED', 'PARTIAL'].includes(item.status) || isOverdue(item))) return false;
        if (activeTab === 'PAID' && item.status !== 'PAID') return false;
        if (activeTab === 'CANCELLED' && item.status !== 'CANCELLED') return false;
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
          if (!searchPool.some((value) => String(value || '').toLowerCase().includes(term))) return false;
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
  }, [allItems, activeTab, keyword, dateFrom, dateTo]);

  const assistantItems: AssistantItem[] = [
    stats.overdue ? {
      id: 'invoice-overdue',
      severity: 'BLOCKER',
      title: `${stats.overdue} tagihan melewati jatuh tempo`,
      message: 'Follow-up tenant atau catat pembayaran sebelum flow checkout ikut terblokir oleh tagihan terbuka.',
      source: 'Invoice',
      count: stats.overdue,
      actionLabel: 'Lihat Overdue',
      onAction: () => setActiveTab('OVERDUE'),
    } : null,
    stats.dueSoon ? {
      id: 'invoice-due-soon',
      severity: 'WARNING',
      title: `${stats.dueSoon} tagihan jatuh tempo dalam 3 hari`,
      message: 'Kirim pengingat atau cek bukti pembayaran agar tidak berubah menjadi overdue.',
      source: 'Reminder',
      count: stats.dueSoon,
      actionLabel: 'Lihat Tagihan Aktif',
      onAction: () => setActiveTab('BILLING'),
    } : null,
    stats.draft ? {
      id: 'invoice-draft',
      severity: 'MEDIUM',
      title: `${stats.draft} draft belum tenant-facing`,
      message: 'Draft tidak akan terlihat sebagai tagihan sampai diterbitkan. Cek rincian sebelum issue.',
      source: 'Finance',
      count: stats.draft,
      actionLabel: 'Lihat Draft',
      onAction: () => setActiveTab('DRAFT'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'billing', label: 'Tagihan aktif', value: stats.billing, helper: stats.dueSoon ? `${stats.dueSoon} jatuh tempo ≤3 hari` : 'ISSUED/PARTIAL belum overdue', icon: '🧾', status: stats.dueSoon ? 'WARNING' : 'INFO', to: undefined, onClick: () => setActiveTab('BILLING') },
    { id: 'overdue', label: 'Overdue', value: stats.overdue, helper: 'Perlu follow-up cepat', icon: '⏰', status: stats.overdue ? 'DANGER' : 'SUCCESS', onClick: () => setActiveTab('OVERDUE') },
    { id: 'draft', label: 'Draft', value: stats.draft, helper: 'Belum tenant-facing', icon: '📝', status: stats.draft ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('DRAFT') },
    { id: 'paid', label: 'Lunas', value: stats.paid, helper: `${stats.cancelled} dibatalkan`, icon: '✅', status: 'SUCCESS', onClick: () => setActiveTab('PAID') },
  ];

  const actionQueueItems: ActionQueueItem[] = filteredItems.slice(0, 8).map((item: any) => {
    const overdue = isOverdue(item);
    const dueSoonBadge = getDueSoonBadge(item);
    const tenantName = item.stay?.tenant?.fullName || `Stay #${item.stayId}`;
    return {
      id: item.id,
      priority: overdue ? 'BLOCKER' : item.status === 'DRAFT' ? 'MEDIUM' : dueSoonBadge ? 'WARNING' : 'INFO',
      type: item.status === 'DRAFT' ? 'Draft Invoice' : 'Tagihan',
      subject: item.invoiceNumber || `INV-${item.id}`,
      issue: overdue
        ? `${tenantName} melewati jatuh tempo ${formatDateSafe(item.dueDate)}.`
        : item.status === 'DRAFT'
          ? 'Belum terlihat oleh tenant. Terbitkan setelah rincian benar.'
          : dueSoonBadge
            ? `${tenantName} jatuh tempo ${dueSoonBadge.label.toLowerCase()}.`
            : `${tenantName} perlu monitoring pembayaran.`,
      age: item.dueDate ? `Due ${formatDateSafe(item.dueDate)}` : undefined,
      recommendedAction: item.status === 'DRAFT' ? 'Review draft' : 'Buka tagihan',
      actionTo: `/invoices/${item.id}`,
    };
  });

  const tabs: { key: StatusTab; label: string; count: number; cls?: string }[] = [
    { key: 'ALL', label: 'Semua', count: stats.total },
    { key: 'DRAFT', label: 'Draft', count: stats.draft },
    { key: 'BILLING', label: 'Perlu Dibayar', count: stats.billing, cls: 'tab-warn' },
    { key: 'OVERDUE', label: 'Overdue', count: stats.overdue, cls: 'tab-danger' },
    { key: 'PAID', label: 'Lunas', count: stats.paid, cls: 'tab-success' },
    { key: 'CANCELLED', label: 'Dibatalkan', count: stats.cancelled },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Finance Command Center"
        title="Tagihan & Invoice"
        description="Prioritaskan tagihan yang macet, jatuh tempo, atau masih draft sebelum mengganggu flow checkout dan cash collection."
        actionLabel={canManageFinance ? 'Buat Draft Tagihan' : undefined}
        onAction={canManageFinance ? () => { setError(''); setShowCreate(true); } : undefined}
      />

      <AssistantPanel
        title="Asisten Finance"
        subtitle="Membaca antrean tagihan dari data invoice yang tersedia sekarang."
        items={assistantItems}
        emptyTitle="Tidak ada blocker tagihan besar"
        emptyMessage="Tidak ada overdue di halaman ini. Tetap cek draft dan jatuh tempo dekat."
      />

      <CompactMetrics metrics={metrics} />

      <ActionQueueTable
        title="Antrean Tagihan"
        subtitle="Urutan tagihan yang paling perlu dicek oleh finance hari ini."
        items={actionQueueItems}
        emptyTitle="Tidak ada antrean tagihan"
        emptyDescription="Belum ada tagihan pada filter ini. Coba tab lain atau buat draft baru."
      />

      <Card className="content-card border-0 mb-3">
        <Card.Body className="py-3">
          <div className="table-meta mb-0">
            <div>
              <div className="panel-title">Filter invoice</div>
              <div className="panel-subtitle">Cari tenant/kamar/nomor tagihan tanpa mencampur kontrol status.</div>
            </div>
            <span className="table-meta-count">{filteredItems.length} dari {meta?.totalItems ?? allItems.length} tagihan</span>
          </div>
          <div className="compact-filter-bar mt-3">
            <Form.Control
              placeholder="🔍  Nomor tagihan, tenant, kamar..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <Form.Control type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} title="Dari tanggal jatuh tempo" />
            <Form.Control type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} title="Sampai tanggal jatuh tempo" />
            {(keyword || dateFrom || dateTo) && (
              <Button variant="outline-secondary" size="sm" onClick={() => { setKeyword(''); setDateFrom(''); setDateTo(''); }}>
                Reset
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">Daftar tagihan</div>
              <div className="panel-subtitle">Gunakan tab status untuk berpindah cepat antar antrean finance.</div>
            </div>
            <div className="status-tab-bar compact-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`status-tab${tab.cls ? ` ${tab.cls}` : ''}${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="tab-badge">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {invoicesQuery.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {invoicesQuery.isError ? <Alert variant="danger">Gagal mengambil data invoice. Silakan coba lagi.</Alert> : null}
          {!invoicesQuery.isLoading && !invoicesQuery.isError && filteredItems.length === 0 ? (
            <EmptyState
              icon="🧾"
              title={allItems.length === 0 ? 'Belum ada data tagihan' : 'Tidak ada tagihan yang cocok'}
              description={allItems.length === 0 ? 'Buat draft tagihan pertama untuk mulai mengelola penagihan.' : 'Coba ubah tab status atau kata kunci pencarian.'}
            />
          ) : null}

          {filteredItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Tagihan</th>
                  <th>Tenant / Kamar</th>
                  <th>Status</th>
                  <th>Periode</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th style={{ width: 220 }}>Aksi</th>
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
                        <div className="small text-muted">Masa sewa #{item.stayId}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{tenantName}</div>
                        <div className="small text-muted">{roomLabel}</div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                        {overdue ? <div className="small text-danger mt-1">Melewati jatuh tempo</div> : null}
                        {!overdue && dueSoonBadge ? <StatusBadge status={dueSoonBadge.status} customLabel={dueSoonBadge.label} className="mt-1" /> : null}
                      </td>
                      <td>{formatPeriod(item.periodStart, item.periodEnd)}</td>
                      <td>{formatDateSafe(item.dueDate)}</td>
                      <td><CurrencyDisplay amount={item.totalAmountRupiah} /></td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <Button as={Link as any} to={`/invoices/${item.id}`} size="sm" variant="outline-primary">Buka</Button>
                          {canManageFinance && item.status === 'DRAFT' ? (
                            <Button size="sm" variant="outline-success" onClick={() => issueMutation.mutate(item.id)} disabled={issueMutation.isPending}>Terbitkan</Button>
                          ) : null}
                          {canManageFinance && ['DRAFT', 'ISSUED'].includes(item.status) ? (
                            <Button size="sm" variant="outline-danger" onClick={() => cancelMutation.mutate(item.id)} disabled={cancelMutation.isPending}>Batalkan</Button>
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

      <Modal show={showCreate && canManageFinance} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Buat Draft Tagihan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}
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
                    return base.filter((item) => `${item.label} ${item.caption ?? ''}`.toLowerCase().includes(term)).slice(0, 50).map((item) => ({ value: item.value, label: item.label }));
                  }}
                  defaultOptions={stayOptions.slice(0, 50).map((item) => ({ value: item.value, label: item.label }))}
                  placeholder="Pilih masa sewa yang akan ditagihkan"
                  noOptionsMessage="Masa sewa tidak ditemukan"
                />
                <div className="form-text">{selectedStay?.caption ?? 'Pilih masa sewa aktif atau yang relevan dari daftar.'}</div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nomor Tagihan</Form.Label>
                <Form.Control value={formState.invoiceNumber} onChange={(e) => setFormState((p) => ({ ...p, invoiceNumber: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Jatuh Tempo</Form.Label>
                <Form.Control type="date" value={formState.dueDate} onChange={(e) => setFormState((p) => ({ ...p, dueDate: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Awal Periode</Form.Label>
                <Form.Control type="date" value={formState.periodStart} onChange={(e) => setFormState((p) => ({ ...p, periodStart: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Akhir Periode</Form.Label>
                <Form.Control type="date" value={formState.periodEnd} onChange={(e) => setFormState((p) => ({ ...p, periodEnd: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Catatan</Form.Label>
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
