import StaffAuditResultBadge from './StaffAuditResultBadge';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';
import { formatClockWib, formatDateOnly } from '../../utils/dateTime';

type Props = {
  performance: StaffPerformanceSummary;
};

function formatDate(value?: string | null) {
  return formatDateOnly(value);
}

function formatPeriod(period?: StaffPerformanceSummary['period']) {
  if (!period) return '-';
  return `${formatDate(period.from)} - ${formatDate(period.to)}`;
}

function netKpi(score?: StaffPerformanceSummary['score']) {
  const explicit = Number((score as any)?.netKpi);
  if (Number.isFinite(explicit)) return explicit;
  return (score?.positiveValue ?? 0) - (score?.negativeValue ?? 0);
}

function scoreFinal(score?: StaffPerformanceSummary['score']) {
  const value = Number(score?.final ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusText(status?: string | null) {
  const value = String(status ?? '').toUpperCase();
  if (value === 'OPEN') return 'Belum mulai';
  if (value === 'IN_PROGRESS') return 'Sedang dikerjakan';
  if (value === 'DONE') return 'Selesai';
  if (value === 'CLOSED') return 'Ditutup admin';
  if (value === 'NEED_HELP') return 'Butuh bantuan';
  return status || 'Tercatat';
}

function buildEvidenceRows(performance: StaffPerformanceSummary) {
  const routines = performance.evidence?.routines ?? [];
  const tickets = performance.evidence?.tickets ?? [];
  const meters = performance.evidence?.meters ?? [];

  return [
    ...routines.map((item: any) => ({
      id: `routine-${item.id}`,
      date: item.completedAt || item.dueDate,
      type: 'Pekerjaan rutin',
      title: item.template?.title || `Checklist #${item.id}`,
      location: item.room?.code ? `Kamar ${item.room.code}` : item.template?.areaType || 'Area umum',
      status: statusText(item.status),
      proof: item.photoUrl ? 'Ada foto' : item.template?.requiresPhoto ? 'Perlu foto' : 'Tidak wajib',
    })),
    ...tickets.map((item: any) => ({
      id: `ticket-${item.id}`,
      date: item.resolvedAt || item.updatedAt || item.createdAt,
      type: 'Tugas lapangan',
      title: item.title || item.ticketNumber,
      location: item.room?.code ? `Kamar ${item.room.code}` : 'Area umum/gudang',
      status: statusText(item.status),
      proof: item.resolutionImageUrl || item.issueImageUrl ? 'Ada foto' : ['DONE', 'CLOSED'].includes(String(item.status).toUpperCase()) ? 'Perlu foto' : 'Belum perlu',
    })),
    ...meters.map((item: any) => ({
      id: `meter-${item.id}`,
      date: item.readingAt || item.createdAt,
      type: item.utilityType === 'WATER' ? 'Catatan meter air' : 'Catatan meter listrik',
      title: `Angka ${item.readingValue}`,
      location: item.room?.code ? `Kamar ${item.room.code}` : 'Kamar',
      status: 'Tercatat',
      proof: 'Data meter tercatat',
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

export default function StaffReportPrintView({ performance }: Props) {
  const kpi = performance.monthlyKpi;
  const score = scoreFinal(performance.score);
  const bonus = netKpi(performance.score);
  const audits = performance.audits ?? [];
  const reviews = performance.tenantReviews?.items ?? [];
  const rows = buildEvidenceRows(performance);
  const proofNeeds = rows.filter((row) => row.proof === 'Perlu foto').length;
  const auditTotal = (kpi.auditPass ?? 0) + (kpi.auditNeedsFix ?? 0) + (kpi.auditFailed ?? 0);
  const printedAt = `${formatDateOnly(new Date())} ${formatClockWib(new Date())}`;

  return (
    <section className="staff-report-print-page" aria-label="Versi cetak laporan kerja staff">
      <header className="staff-print-header">
        <div>
          <span>KOST48 Surabaya</span>
          <h1>Laporan Kinerja Staff</h1>
          <p>Laporan ini dibuat berdasarkan pekerjaan yang tercatat di sistem KOST48.</p>
        </div>
        <div className="staff-print-score-box">
          <strong>{score}/100</strong>
          <span>{performance.category?.label ?? 'Belum ada data'}</span>
        </div>
      </header>

      <div className="staff-print-identity-grid">
        <div><span>Nama staff</span><strong>{performance.staff?.fullName ?? '-'}</strong></div>
        <div><span>Email</span><strong>{performance.staff?.email ?? '-'}</strong></div>
        <div><span>Periode</span><strong>{formatPeriod(performance.period)}</strong></div>
        <div><span>Tanggal cetak</span><strong>{printedAt}</strong></div>
        <div><span>Nilai kerja</span><strong>{bonus >= 0 ? '+' : ''}{bonus}</strong></div>
        <div><span>Catatan perbaikan</span><strong>{performance.score?.negativeValue ?? 0}</strong></div>
      </div>

      <div className="staff-print-section staff-print-summary">
        <h2>Ringkasan Bulanan</h2>
        <p>{performance.assistant?.summary || performance.category?.copy || 'Belum ada ringkasan sistem.'}</p>
        <div className="staff-print-kpi-grid">
          <span><strong>{kpi.routineDone ?? 0}</strong>Pekerjaan rutin</span>
          <span><strong>{kpi.ticketsDone ?? 0}</strong>Tugas lapangan</span>
          <span><strong>{kpi.meterCount ?? 0}</strong>Catatan meter</span>
          <span><strong>{kpi.stockReports ?? 0}</strong>Laporan stok/gudang</span>
          <span><strong>{kpi.roomChecks ?? 0}</strong>Cek kamar</span>
          <span><strong>{kpi.proofCompletionRate ?? 0}%</strong>Bukti foto lengkap</span>
        </div>
      </div>

      <div className="staff-print-section">
        <h2>Hal Yang Perlu Dilengkapi</h2>
        <ul className="staff-print-checklist">
          {proofNeeds > 0 ? <li>{proofNeeds} pekerjaan selesai belum memiliki foto bukti.</li> : null}
          {!performance.tenantReviews?.count ? <li>Belum ada review tenant pada periode ini.</li> : null}
          {!auditTotal ? <li>Belum ada pengecekan pada periode ini.</li> : null}
          {(kpi.meterCount ?? 0) === 0 ? <li>Belum ada catatan meter listrik/air bulan ini.</li> : null}
          {!proofNeeds && performance.tenantReviews?.count && auditTotal && (kpi.meterCount ?? 0) > 0 ? <li>Semua poin utama terlihat lengkap pada periode ini.</li> : null}
        </ul>
      </div>

      <div className="staff-print-section">
        <h2>Bukti Kerja Bulan Ini</h2>
        {rows.length ? (
          <table className="staff-print-table">
            <thead>
              <tr><th>Tanggal</th><th>Jenis</th><th>Pekerjaan</th><th>Lokasi</th><th>Bukti</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.type}</td>
                  <td>{row.title}</td>
                  <td>{row.location}</td>
                  <td>{row.proof}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="staff-print-muted">Belum ada bukti kerja pada periode ini.</p>}
      </div>

      <div className="staff-print-two-col">
        <div className="staff-print-section">
          <h2>Review Tenant</h2>
          {performance.tenantReviews?.count ? (
            <>
              <p>Rata-rata rating: <strong>{performance.tenantReviews.averageRating ?? '-'}/5</strong> dari {performance.tenantReviews.count} review.</p>
              <ul className="staff-print-review-list">
                {reviews.slice(0, 4).map((review: any) => <li key={review.id}>{review.rating}/5 — {review.comment || 'Tanpa komentar'}</li>)}
              </ul>
            </>
          ) : <p className="staff-print-muted">Belum ada review tenant pada periode ini.</p>}
        </div>
        <div className="staff-print-section">
          <h2>Pengecekan Admin/Owner</h2>
          {audits.length ? (
            <div className="staff-print-audit-list">
              {audits.slice(0, 5).map((audit: any) => (
                <div key={audit.id}>
                  <StaffAuditResultBadge result={audit.result} />
                  <span>{audit.notes || 'Tidak ada catatan tambahan.'}</span>
                </div>
              ))}
            </div>
          ) : <p className="staff-print-muted">Belum ada pengecekan pada periode ini.</p>}
        </div>
      </div>

      <div className="staff-print-section staff-print-system-note">
        <h2>Catatan Sistem</h2>
        <p>Laporan ini adalah bukti kerja berdasarkan data aplikasi. Pengecekan lapangan tetap dapat dilakukan berkala agar kondisi nyata sesuai catatan.</p>
      </div>

      <footer className="staff-print-signature-grid">
        <div><span>Staff</span><strong>{performance.staff?.fullName ?? 'Nama Staff'}</strong><em /></div>
        <div><span>Admin / Owner</span><strong>Nama Pemeriksa</strong><em /></div>
      </footer>
    </section>
  );
}
