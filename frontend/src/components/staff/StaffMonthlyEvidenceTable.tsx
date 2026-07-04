import { useEffect, useMemo, useState } from 'react';
import { Card, Table } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';
import SafeImage from '../common/SafeImage';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';
import { formatDateOnly } from '../../utils/dateTime';

type Props = { performance?: StaffPerformanceSummary | null };
type EvidenceFilter = 'ALL' | 'NEED_PROOF' | 'ROUTINE' | 'TICKET' | 'METER' | 'DONE';

function formatDate(value?: string | null) {
  return formatDateOnly(value);
}

function statusText(status?: string | null) {
  const value = String(status ?? '').toUpperCase();
  if (value === 'OPEN') return 'Belum dikerjakan';
  if (value === 'IN_PROGRESS') return 'Sedang dikerjakan';
  if (value === 'DONE') return 'Selesai';
  if (value === 'CLOSED') return 'Ditutup admin';
  if (value === 'NEED_HELP') return 'Butuh bantuan';
  if (value === 'TERCATAT') return 'Tercatat';
  return status || '-';
}

function statusClass(status?: string | null) {
  return String(status ?? 'secondary').toLowerCase().replace(/_/g, '-');
}

export default function StaffMonthlyEvidenceTable({ performance }: Props) {
  const [filter, setFilter] = useState<EvidenceFilter>('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const routines = performance?.evidence?.routines ?? [];
  const tickets = performance?.evidence?.tickets ?? [];
  const meters = performance?.evidence?.meters ?? [];
  const rows = useMemo(() => [
    ...routines.map((item: any) => ({ id: `routine-${item.id}`, date: item.completedAt || item.dueDate, kind: 'ROUTINE', type: 'Pekerjaan rutin', title: item.template?.title || `Checklist #${item.id}`, location: item.room?.code ? `Kamar ${item.room.code}` : item.template?.areaType || 'Area umum', proof: item.photoUrl, proofRequired: Boolean(item.template?.requiresPhoto), status: item.status })),
    ...tickets.map((item: any) => ({ id: `ticket-${item.id}`, date: item.resolvedAt || item.updatedAt || item.createdAt, kind: 'TICKET', type: 'Tugas lapangan', title: item.title || item.ticketNumber, location: item.room?.code ? `Kamar ${item.room.code}` : 'Area umum/gudang', proof: item.resolutionImageUrl || item.issueImageUrl, proofRequired: ['DONE', 'CLOSED'].includes(String(item.status).toUpperCase()), status: item.status })),
    ...meters.map((item: any) => ({ id: `meter-${item.id}`, date: item.readingAt || item.createdAt, kind: 'METER', type: item.utilityType === 'WATER' ? 'Meter air' : 'Meter listrik', title: `Angka ${item.readingValue}`, location: item.room?.code ? `Kamar ${item.room.code}` : 'Kamar', proof: null, proofRequired: false, status: 'TERCATAT' })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()), [routines, tickets, meters]);

  const needProofCount = rows.filter((row) => row.proofRequired && !row.proof).length;
  const filteredRows = rows.filter((row) => {
    if (filter === 'ALL') return true;
    if (filter === 'NEED_PROOF') return row.proofRequired && !row.proof;
    if (filter === 'DONE') return ['DONE', 'CLOSED', 'TERCATAT'].includes(String(row.status).toUpperCase());
    return row.kind === filter;
  });
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filters: { key: EvidenceFilter; label: string; count: number; tone?: string }[] = [
    { key: 'ALL', label: 'Semua bukti', count: rows.length },
    { key: 'NEED_PROOF', label: 'Belum ada foto', count: needProofCount, tone: needProofCount ? 'danger' : 'success' },
    { key: 'ROUTINE', label: 'Pekerjaan rutin', count: rows.filter((row) => row.kind === 'ROUTINE').length },
    { key: 'TICKET', label: 'Tugas lapangan', count: rows.filter((row) => row.kind === 'TICKET').length },
    { key: 'METER', label: 'Meter', count: rows.filter((row) => row.kind === 'METER').length },
    { key: 'DONE', label: 'Selesai/tercatat', count: rows.filter((row) => ['DONE', 'CLOSED', 'TERCATAT'].includes(String(row.status).toUpperCase())).length, tone: 'success' },
  ];

  return (
    <Card className="content-card border-0">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">Bukti Pekerjaan Bulan Ini</div>
            <div className="panel-subtitle">Filter bukti kerja supaya pekerjaan selesai dan foto pendukung mudah dicek.</div>
          </div>
          <span className="table-meta-count">{filteredRows.length} catatan</span>
        </div>
        <div className="staff-evidence-filter-row">
          {filters.map((item) => (
            <button key={item.key} type="button" className={`staff-filter-chip evidence-${item.tone ?? 'blue'}${filter === item.key ? ' active' : ''}`} onClick={() => setFilter(item.key)}>
              <span>{item.label}</span><strong>{item.count}</strong>
            </button>
          ))}
        </div>
        {!rows.length ? <div className="staff-empty-box mt-3"><strong>Belum ada bukti kerja.</strong><span>Mulai dari checklist atau tugas lapangan hari ini.</span></div> : null}
        {rows.length && !filteredRows.length ? <div className="staff-empty-box mt-3"><strong>Tidak ada catatan pada filter ini.</strong><span>Pilih filter lain untuk melihat bukti kerja.</span></div> : null}
        {filteredRows.length ? (
          <Table responsive hover className="mt-3 staff-evidence-table">
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Pekerjaan</th><th>Lokasi</th><th>Bukti</th><th>Status</th></tr></thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.type}</td>
                  <td><div className="fw-semibold">{row.title}</div></td>
                  <td>{row.location}</td>
                  <td>{row.proof ? <SafeImage src={row.proof} alt="Bukti kerja" className="staff-evidence-thumb" /> : <span className={`staff-proof-state${row.proofRequired ? ' warning' : ''}`}>{row.proofRequired ? 'Perlu foto' : 'Tidak wajib'}</span>}</td>
                  <td><span className={`staff-status-pill status-${statusClass(row.status)}`}>{statusText(row.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        {filteredRows.length > PAGE_SIZE ? (
          <div className="mt-3">
            <PaginationControls currentPage={page} totalPages={totalPages} totalItems={filteredRows.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
