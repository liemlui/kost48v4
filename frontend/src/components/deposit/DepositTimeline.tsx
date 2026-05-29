import { Badge, Card, Table } from 'react-bootstrap';
import EmptyState from '../common/EmptyState';
import type { TenantDepositLedgerEntry } from '../../api/depositLedger';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatDepositLedgerDate, getDepositLedgerDirectionLabel, getDepositLedgerNarrative, getDepositLedgerTone, getDepositLedgerTypeLabel } from './depositLedgerLabels';

type Props = {
  entries?: TenantDepositLedgerEntry[];
  tenantView?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

export default function DepositTimeline({ entries = [], tenantView = false, compact = false, title, subtitle }: Props) {
  const visibleEntries = compact ? entries.slice(0, 5) : entries;

  return (
    <Card className="deposit-timeline-card content-card border-0 h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="section-kicker mb-1">Riwayat Deposit</div>
            <h3 className="h5 mb-1">{title ?? (tenantView ? 'Perjalanan deposit kamu' : 'Timeline deposit')}</h3>
            <p className="text-muted small mb-0">
              {subtitle ?? (tenantView ? 'Setiap perubahan deposit penting akan muncul di sini dengan bahasa sederhana.' : 'Histori event deposit dari pembayaran awal sampai settlement.')}
            </p>
          </div>
          <Badge bg="light" text="dark">{entries.length} event</Badge>
        </div>

        {!entries.length ? (
          <EmptyState
            icon="💙"
            title={tenantView ? 'Belum ada riwayat detail deposit' : 'Belum ada event deposit'}
            description={tenantView ? 'Jika deposit sudah tercatat, statusnya tetap terlihat di ringkasan masa sewa.' : 'Untuk data lama, jalankan review/dry-run backfill sebelum membuat histori.'}
          />
        ) : compact ? (
          <div className="deposit-timeline-list">
            {visibleEntries.map((entry) => (
              <div key={entry.id} className={`deposit-timeline-item ${getDepositLedgerTone(entry)}`}>
                <div className="deposit-timeline-dot" />
                <div className="deposit-timeline-content">
                  <div className="d-flex justify-content-between gap-2">
                    <strong>{getDepositLedgerTypeLabel(entry.type, tenantView)}</strong>
                    <span className="fw-semibold">{formatRupiah(entry.amountRupiah)}</span>
                  </div>
                  <div className="text-muted small">{getDepositLedgerNarrative(entry, tenantView)}</div>
                  <div className="deposit-timeline-meta small">
                    <span>{formatDepositLedgerDate(entry.occurredAt)}</span>
                    <span>Saldo: {formatRupiah(entry.balanceAfterRupiah)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table responsive hover className="deposit-ledger-table mb-0">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Event</th>
                <th>Jumlah</th>
                <th>Saldo Setelah</th>
                {!tenantView ? <th>Sumber / Aktor</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="small text-muted">{formatDepositLedgerDate(entry.occurredAt)}</td>
                  <td>
                    <div className="fw-semibold">{getDepositLedgerTypeLabel(entry.type, tenantView)}</div>
                    <div className="small text-muted">{getDepositLedgerNarrative(entry, tenantView)}</div>
                    {entry.note ? <div className="small text-muted mt-1">Catatan: {entry.note}</div> : null}
                  </td>
                  <td>
                    <div className="fw-semibold">{formatRupiah(entry.amountRupiah)}</div>
                    <div className="small text-muted">{getDepositLedgerDirectionLabel(entry.direction, tenantView)}</div>
                  </td>
                  <td className="fw-semibold">{formatRupiah(entry.balanceAfterRupiah)}</td>
                  {!tenantView ? (
                    <td className="small text-muted">
                      <div>{entry.sourceType ?? '-'}</div>
                      <div>{entry.sourceId ? `#${entry.sourceId}` : ''} {entry.actorName ? `· ${entry.actorName}` : ''}</div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
