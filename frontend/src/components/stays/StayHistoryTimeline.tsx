import { useMemo, type CSSProperties } from 'react';
import { Badge, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { invoicePurposeMeta } from '../../utils/invoiceUtility';

// SI-3: Riwayat sewa yang JELAS — kapan masuk kos, tiap periode sewa & perpanjangan,
// dan tautannya ke invoice. Menjawab: "tampilan kapan masuk + riwayat perpanjang kurang
// konek dengan invoice" (owner 2026-06-16). Satu Stay = booking→huni→selesai; periode
// diturunkan dari invoice sewa (periodStart/End), invoice listrik/air ditandai terpisah.

type InvoiceLite = {
  id: number;
  invoiceNumber?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  status: string;
  totalAmountRupiah?: number | string | null;
  lines?: Array<{ lineType?: string | null }> | null;
  notes?: string | null;
};

type StayLite = {
  id: number;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  status?: string | null;
  depositAmountRupiah?: number | string | null;
  depositPaidAmountRupiah?: number | string | null;
  depositStatus?: string | null;
};

function fmt(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function invStatusBadge(status: string): { label: string; bg: string } {
  switch (String(status).toUpperCase()) {
    case 'PAID': return { label: 'Lunas', bg: 'success' };
    case 'PARTIAL': return { label: 'Sebagian', bg: 'info' };
    case 'ISSUED': return { label: 'Belum dibayar', bg: 'warning' };
    case 'CANCELLED': return { label: 'Dibatalkan', bg: 'secondary' };
    case 'DRAFT': return { label: 'Draft', bg: 'secondary' };
    default: return { label: status, bg: 'secondary' };
  }
}

const isRentInvoice = (inv: InvoiceLite) =>
  (inv.lines ?? []).some((l) => String(l.lineType ?? '').toUpperCase() === 'RENT');

export default function StayHistoryTimeline({
  stay,
  invoices,
  invoiceHrefBase = '/invoices',
  clickable = true,
}: {
  stay: StayLite;
  invoices: InvoiceLite[];
  invoiceHrefBase?: string;
  clickable?: boolean;
}) {
  const navigate = useNavigate();
  const { rentPeriods, utilityInvoices } = useMemo(() => {
    const rent = invoices.filter(isRentInvoice).slice().sort(
      (a, b) => new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime(),
    );
    const util = invoices.filter((i) => !isRentInvoice(i) && String(i.status).toUpperCase() !== 'CANCELLED').slice().sort(
      (a, b) => new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime(),
    );
    return { rentPeriods: rent, utilityInvoices: util };
  }, [invoices]);

  const depositAmt = Number(stay.depositAmountRupiah ?? 0);
  const depositPaid = Number(stay.depositPaidAmountRupiah ?? 0);
  const go = (id: number) => clickable && navigate(`${invoiceHrefBase}/${id}`);

  const dot = (color: string) => (
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flex: '0 0 auto', marginTop: 4, boxShadow: '0 0 0 3px rgba(0,0,0,0.04)' }} aria-hidden />
  );
  const rowStyle: CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 16, position: 'relative' };
  const lineStyle: CSSProperties = { position: 'absolute', left: 5, top: 14, bottom: -2, width: 2, background: 'var(--bs-border-color, #e5e7eb)' };

  return (
    <Card className="content-card border-0 mb-4">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h5 className="mb-0">📜 Riwayat Sewa</h5>
          <span className="text-muted small">Masuk → tiap periode → tagihannya</span>
        </div>
        <p className="text-muted small mb-3">Kronologi jelas: kapan mulai kos, tiap periode sewa/perpanjangan, dan tautan ke tagihannya.</p>

        <div>
          {/* Masuk kos */}
          <div style={rowStyle}>
            <span style={lineStyle} />
            {dot('#2563eb')}
            <div className="flex-grow-1">
              <div className="fw-semibold">Masuk kos · {fmt(stay.checkInDate)}</div>
              <div className="small text-muted">
                Deposit jaminan <CurrencyDisplay amount={depositAmt} />
                {depositAmt > 0 ? ` (${depositPaid >= depositAmt ? 'lunas' : depositPaid > 0 ? 'sebagian' : 'belum'} · ${stay.depositStatus ?? 'HELD'})` : ''}
              </div>
            </div>
          </div>

          {/* Tiap periode sewa (dari invoice RENT) */}
          {rentPeriods.length === 0 ? (
            <div style={rowStyle}><span style={lineStyle} />{dot('#9ca3af')}
              <div className="small text-muted">Belum ada tagihan sewa tercatat.</div>
            </div>
          ) : rentPeriods.map((inv, idx) => {
            const m = invoicePurposeMeta(inv);
            const st = invStatusBadge(inv.status);
            return (
              <div key={inv.id} style={rowStyle}>
                <span style={lineStyle} />
                {dot(idx === 0 ? '#16a34a' : '#7c3aed')}
                <div className="flex-grow-1">
                  <div className="fw-semibold">
                    {idx === 0 ? 'Periode 1 (awal)' : `Perpanjangan · Periode ${idx + 1}`}
                    {' '}· {fmt(inv.periodStart)} → {fmt(inv.periodEnd)}
                  </div>
                  <div
                    className={`d-flex flex-wrap align-items-center gap-2 mt-1${clickable ? ' cursor-pointer' : ''}`}
                    role={clickable ? 'button' : undefined}
                    onClick={() => go(inv.id)}
                    style={clickable ? { cursor: 'pointer' } : undefined}
                  >
                    <Badge bg={m.bg} className="d-inline-flex align-items-center gap-1"><span aria-hidden>{m.icon}</span> Tagihan {m.label}</Badge>
                    <Badge bg={st.bg}>{st.label}</Badge>
                    <span className="small text-muted"><CurrencyDisplay amount={Number(inv.totalAmountRupiah ?? 0)} /></span>
                    <span className="small text-decoration-underline text-muted">{inv.invoiceNumber || `INV-${inv.id}`}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Tagihan listrik/air (utilitas) */}
          {utilityInvoices.length > 0 ? (
            <div style={rowStyle}>
              <span style={lineStyle} />
              {dot('#f59e0b')}
              <div className="flex-grow-1">
                <div className="fw-semibold">Tagihan listrik/air</div>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {utilityInvoices.map((inv) => {
                    const m = invoicePurposeMeta(inv);
                    const st = invStatusBadge(inv.status);
                    return (
                      <span key={inv.id} role={clickable ? 'button' : undefined} onClick={() => go(inv.id)}
                        style={clickable ? { cursor: 'pointer' } : undefined}
                        className="d-inline-flex align-items-center gap-1 border rounded px-2 py-1 small">
                        <Badge bg={m.bg} className="d-inline-flex align-items-center gap-1"><span aria-hidden>{m.icon}</span>{m.label}</Badge>
                        <span className="text-muted">{fmt(inv.periodEnd || inv.periodStart)}</span>
                        <Badge bg={st.bg}>{st.label}</Badge>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Kontrak berjalan */}
          <div style={{ ...rowStyle, paddingBottom: 0 }}>
            {dot(stay.status === 'ACTIVE' ? '#2563eb' : '#9ca3af')}
            <div className="flex-grow-1">
              <div className="fw-semibold">
                {stay.status === 'ACTIVE' ? 'Kontrak berjalan' : 'Masa sewa selesai'} · s/d {fmt(stay.plannedCheckOutDate)}
              </div>
              <div className="small text-muted">
                {stay.status === 'ACTIVE'
                  ? 'Perpanjangan akan menambah periode baru di atas dari tanggal ini.'
                  : 'Riwayat lengkap di atas.'}
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
