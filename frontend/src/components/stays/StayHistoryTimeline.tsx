import { useMemo } from 'react';
import { Badge, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import { invoicePurposeMeta } from '../../utils/invoiceUtility';

// SI-3: Riwayat sewa yang jelas: kapan masuk kos, tiap periode
// sewa/perpanjangan, dan tautannya ke invoice.

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

export type StayJourneyStepTone = 'done' | 'active' | 'waiting' | 'idle' | 'blocked';

export type StayJourneyStep = {
  key: string;
  title: string;
  status: string;
  tone: StayJourneyStepTone;
  helper?: string;
};

function fmt(d?: string | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

function depositLabel(paid: number, target: number, status?: string | null): string {
  const paidLabel = target <= 0
    ? 'Tidak ada target'
    : paid >= target
      ? 'Lunas'
      : paid > 0
        ? 'Sebagian'
        : 'Belum disetor';
  return status ? `${paidLabel} - ${status}` : paidLabel;
}

const isRentInvoice = (inv: InvoiceLite) =>
  (inv.lines ?? []).some((l) => String(l.lineType ?? '').toUpperCase() === 'RENT');

export default function StayHistoryTimeline({
  stay,
  invoices,
  invoiceHrefBase = '/invoices',
  clickable = true,
  journeySteps,
}: {
  stay: StayLite;
  invoices: InvoiceLite[];
  invoiceHrefBase?: string;
  clickable?: boolean;
  journeySteps?: StayJourneyStep[];
}) {
  const navigate = useNavigate();
  const { rentPeriods, utilityInvoices, actionableInvoices } = useMemo(() => {
    const rent = invoices.filter(isRentInvoice).slice().sort(
      (a, b) => new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime(),
    );
    const util = invoices.filter((i) => !isRentInvoice(i) && String(i.status).toUpperCase() !== 'CANCELLED').slice().sort(
      (a, b) => new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime(),
    );
    const open = invoices.filter((i) => !['PAID', 'CANCELLED'].includes(String(i.status).toUpperCase()));
    return { rentPeriods: rent, utilityInvoices: util, actionableInvoices: open };
  }, [invoices]);

  const depositAmt = Number(stay.depositAmountRupiah ?? 0);
  const depositPaid = Number(stay.depositPaidAmountRupiah ?? 0);
  const depositPct = depositAmt > 0 ? Math.min(100, Math.round((depositPaid / depositAmt) * 100)) : 0;
  const isActive = String(stay.status ?? '').toUpperCase() === 'ACTIVE';
  const periodCount = Math.max(1, rentPeriods.length);
  const openCount = actionableInvoices.length;

  const defaultSteps: StayJourneyStep[] = [
    { key: 'checkin', title: 'Masuk kamar', status: stay.checkInDate ? 'Selesai' : 'Menunggu', tone: stay.checkInDate ? 'done' : 'idle' },
    { key: 'lease', title: 'Masa sewa', status: isActive ? 'Aktif' : 'Selesai', tone: isActive ? 'active' : 'done' },
    { key: 'billing', title: 'Tagihan', status: openCount ? `${openCount} aktif` : 'Beres', tone: openCount ? 'waiting' : 'done' },
    { key: 'next', title: 'Perpanjang / keluar', status: isActive ? 'Bisa diajukan' : 'Riwayat selesai', tone: isActive ? 'idle' : 'done' },
  ];
  const steps = journeySteps ?? defaultSteps;

  const go = (id: number) => {
    if (clickable) navigate(`${invoiceHrefBase}/${id}`);
  };

  return (
    <Card className="content-card stay-history-card border-0 mb-4">
      <Card.Body>
        <div className="stay-history-head">
          <div>
            <div className="stay-history-kicker">Riwayat Sewa</div>
            <h5>Masuk, periode, tagihan, dan keputusan akhir</h5>
            <p>
              Satu kronologi utuh: mulai kos, masa sewa/perpanjangan, invoice terkait,
              sampai deposit diproses saat keluar final.
            </p>
          </div>
          <div className="stay-history-summary" aria-label="Ringkasan riwayat sewa">
            <span><strong>{periodCount}</strong><small>Periode</small></span>
            <span><strong>{openCount}</strong><small>Tagihan aktif</small></span>
          </div>
        </div>

        <div className="stay-history-step-grid" aria-label="Alur masa sewa">
          {steps.map((step, index) => (
            <div key={step.key} className={`stay-history-step is-${step.tone}`}>
              <span className="stay-history-step-index">{index + 1}</span>
              <strong>{step.title}</strong>
              <span>{step.status}</span>
              {step.helper ? <small>{step.helper}</small> : null}
            </div>
          ))}
        </div>

        <div className="stay-history-flow">
          <div className="stay-history-event is-start">
            <span className="stay-history-dot" aria-hidden />
            <div className="stay-history-event-body">
              <div className="stay-history-event-top">
                <strong>Masuk kos</strong>
                <span>{fmt(stay.checkInDate)}</span>
              </div>
              <p>
                Deposit jaminan <CurrencyDisplay amount={depositAmt} /> ({depositLabel(depositPaid, depositAmt, stay.depositStatus)}).
              </p>
            </div>
          </div>

          {rentPeriods.length === 0 ? (
            <div className="stay-history-event is-muted">
              <span className="stay-history-dot" aria-hidden />
              <div className="stay-history-event-body">
                <div className="stay-history-event-top">
                  <strong>Tagihan sewa</strong>
                  <span>Belum tercatat</span>
                </div>
                <p>Belum ada tagihan sewa tercatat untuk periode ini.</p>
              </div>
            </div>
          ) : rentPeriods.map((inv, idx) => {
            const m = invoicePurposeMeta(inv);
            const st = invStatusBadge(inv.status);
            return (
              <div key={inv.id} className="stay-history-event is-rent">
                <span className="stay-history-dot" aria-hidden />
                <div className="stay-history-event-body">
                  <div className="stay-history-event-top">
                    <strong>{idx === 0 ? 'Periode awal' : `Perpanjangan periode ${idx + 1}`}</strong>
                    <span>{fmt(inv.periodStart)} - {fmt(inv.periodEnd)}</span>
                  </div>
                  <button
                    type="button"
                    className="stay-history-invoice-pill"
                    onClick={() => go(inv.id)}
                    disabled={!clickable}
                  >
                    <Badge bg={m.bg} className="d-inline-flex align-items-center gap-1">
                      <span aria-hidden>{m.icon}</span> Tagihan {m.label}
                    </Badge>
                    <Badge bg={st.bg}>{st.label}</Badge>
                    <span><CurrencyDisplay amount={Number(inv.totalAmountRupiah ?? 0)} /></span>
                    <u>{inv.invoiceNumber || `INV-${inv.id}`}</u>
                  </button>
                </div>
              </div>
            );
          })}

          {utilityInvoices.length > 0 ? (
            <div className="stay-history-event is-utility">
              <span className="stay-history-dot" aria-hidden />
              <div className="stay-history-event-body">
                <div className="stay-history-event-top">
                  <strong>Tagihan listrik/air</strong>
                  <span>{utilityInvoices.length} invoice</span>
                </div>
                <div className="stay-history-utility-list">
                  {utilityInvoices.map((inv) => {
                    const m = invoicePurposeMeta(inv);
                    const st = invStatusBadge(inv.status);
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        className="stay-history-utility-pill"
                        onClick={() => go(inv.id)}
                        disabled={!clickable}
                      >
                        <Badge bg={m.bg} className="d-inline-flex align-items-center gap-1">
                          <span aria-hidden>{m.icon}</span>{m.label}
                        </Badge>
                        <span>{fmt(inv.periodEnd || inv.periodStart)}</span>
                        <Badge bg={st.bg}>{st.label}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className={`stay-history-event ${isActive ? 'is-current' : 'is-muted'}`}>
            <span className="stay-history-dot" aria-hidden />
            <div className="stay-history-event-body">
              <div className="stay-history-event-top">
                <strong>{isActive ? 'Kontrak berjalan' : 'Masa sewa selesai'}</strong>
                <span>s/d {fmt(stay.plannedCheckOutDate)}</span>
              </div>
              <p>
                {isActive
                  ? 'Perpanjangan akan menambah periode baru dari akhir kontrak ini.'
                  : 'Riwayat periode dan tagihan tersimpan di atas.'}
              </p>
            </div>
          </div>
        </div>

        <div className="stay-history-deposit-panel">
          <div>
            <span>Dana titipan deposit</span>
            <strong><CurrencyDisplay amount={depositPaid} showZero /> / <CurrencyDisplay amount={depositAmt} /></strong>
            <small>Diproses saat keluar final setelah semua tagihan selesai.</small>
          </div>
          <div className="stay-history-deposit-meter" aria-label={`Deposit ${depositPct}%`}>
            <div style={{ width: `${depositPct}%` }} />
          </div>
          <Badge bg={depositPaid >= depositAmt && depositAmt > 0 ? 'success' : 'secondary'}>
            {depositLabel(depositPaid, depositAmt, stay.depositStatus)}
          </Badge>
        </div>
      </Card.Body>
    </Card>
  );
}
