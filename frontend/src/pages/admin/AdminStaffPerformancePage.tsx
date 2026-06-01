import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StaffAuditModal from '../../components/admin/StaffAuditModal';
import AdminSmartAuditPanel from '../../components/admin/AdminSmartAuditPanel';
import { fetchAdminStaffAuditSuggestions, fetchAdminStaffPerformance, type StaffPerformanceSummary } from '../../api/staffPerformance';

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminStaffPerformancePage() {
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState<StaffPerformanceSummary | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const query = useQuery({ queryKey: ['admin-staff-performance', month], queryFn: () => fetchAdminStaffPerformance(month), staleTime: 60_000 });
  const suggestionsQuery = useQuery({ queryKey: ['admin-staff-audit-suggestions', month], queryFn: () => fetchAdminStaffAuditSuggestions(month), staleTime: 60_000 });
  const items = query.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  useEffect(() => {
    setPage(1);
  }, [month]);

  return (
    <div>
      <PageHeader
        eyebrow="Akuntabilitas Staff"
        title="Kinerja Staff"
        description="Monitoring kinerja staff dari checklist, tugas, meter listrik/air, laporan stok, audit random, dan ulasan penghuni."
        secondaryAction={<Form.Control type="month" value={month} onChange={(event) => setMonth(event.currentTarget.value)} style={{ maxWidth: 190 }} />}
      />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Data kinerja staff belum bisa dimuat.</Alert> : null}

      {query.data ? (
        <div className="staff-admin-summary-grid">
          <Card className="border-0"><Card.Body><span>Total staff</span><strong>{query.data.summary.totalStaff}</strong><small>Staff aktif</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Sangat baik</span><strong>{query.data.summary.veryGood}</strong><small>Kinerja kuat</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Perlu dibantu/diawasi</span><strong>{query.data.summary.needWatch}</strong><small>Butuh follow-up</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Sinyal negatif</span><strong>{query.data.summary.negativeValue}</strong><small>Audit gagal/bukti kurang</small></Card.Body></Card>
        </div>
      ) : null}

      <AdminSmartAuditPanel data={suggestionsQuery.data} isLoading={suggestionsQuery.isLoading} isError={suggestionsQuery.isError} staffItems={items} onAudit={setSelected} />

      <Card className="content-card border-0 my-3">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Daftar Kinerja Staff</div>
              <div className="panel-subtitle">Klik audit untuk mencatat hasil pengecekan mendadak.</div>
            </div>
            <span className="table-meta-count">{items.length} staff</span>
          </div>
          {!items.length && !query.isLoading ? <div className="staff-empty-box mt-3"><strong>Belum ada data staff.</strong><span>Data akan muncul setelah user staff aktif tersedia.</span></div> : null}
          {items.length ? (
            <Table responsive hover className="mt-3 staff-performance-table">
              <thead><tr><th>Staff</th><th>Kategori</th><th>Skor</th><th>Checklist</th><th>Tugas</th><th>Meter</th><th>Rating Penghuni</th><th>Sinyal</th><th>Aksi</th></tr></thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.staff.id}>
                    <td><div className="fw-semibold">{item.staff.fullName}</div><div className="small text-muted">{item.staff.email}</div></td>
                    <td><span className={`staff-audit-badge audit-${item.category.tone}`}>{item.category.label}</span></td>
                    <td><strong>{item.score.final}</strong></td>
                    <td>{item.monthlyKpi.routineDone}</td>
                    <td>{item.monthlyKpi.ticketsDone}</td>
                    <td>{item.monthlyKpi.meterCount}</td>
                    <td>{item.tenantReviews.averageRating ?? '-'} <span className="small text-muted">({item.tenantReviews.count})</span></td>
                    <td>{item.score.negativeValue}</td>
                    <td><Button size="sm" variant="outline-primary" onClick={() => setSelected(item)}>Audit</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          {items.length > PAGE_SIZE ? (
            <div className="mt-3">
              <PaginationControls currentPage={page} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={query.isLoading} />
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <StaffAuditModal show={Boolean(selected)} staff={selected} onHide={() => setSelected(null)} />
    </div>
  );
}
