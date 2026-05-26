import { Alert, Badge, Card, Table } from 'react-bootstrap';
import type { AutoJournalEntry } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  journals: AutoJournalEntry[];
  isLoading?: boolean;
  note?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceLabel(sourceType?: string | null) {
  const labels: Record<string, string> = {
    OPENING_BALANCE: 'Saldo Awal',
    INVOICE: 'Tagihan',
    INVOICE_PAYMENT: 'Pembayaran',
    EXPENSE: 'Pengeluaran',
    WIFI_SALE: 'Voucher WiFi',
    DEPOSIT: 'Deposit',
    ADJUSTMENT: 'Adjustment',
    DEPRECIATION: 'Depresiasi',
    CLOSING_ENTRY: 'Jurnal Closing',
    CLOSING_REVERSAL: 'Jurnal Reversal',
  };
  return labels[String(sourceType ?? '')] ?? sourceType ?? '-';
}

export default function JournalAuditTrailPanel({ journals, isLoading, note }: Props) {
  return (
    <Card className="content-card border-0 accounting-setup-card mb-3" id="journal-audit">
      <Card.Body>
        <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start mb-3">
          <div>
            <div className="section-kicker mb-2">Audit Trail Jurnal</div>
            <h3 className="panel-title mb-1">Jurnal penting terbaru</h3>
            <p className="text-muted mb-0">Ringkasan posting penting: saldo awal, tagihan, pembayaran, pengeluaran, depresiasi, closing, dan reversal. Ini membantu owner melihat perubahan besar tanpa membuka semua line jurnal.</p>
          </div>
          <Badge bg={journals.length ? 'primary' : 'secondary'}>{isLoading ? 'Memuat...' : `${journals.length} jurnal`}</Badge>
        </div>

        {isLoading ? (
          <div className="text-muted">Memuat audit trail jurnal...</div>
        ) : journals.length ? (
          <div className="table-responsive">
            <Table hover size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Jurnal</th>
                  <th>Jenis</th>
                  <th>Nilai</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <tr key={journal.id}>
                    <td>
                      <div className="fw-semibold">{journal.entryNumber}</div>
                      <small className="text-muted">{journal.memo || 'Posting ledger'}</small>
                    </td>
                    <td>
                      <Badge bg="light" text="dark" className="border">{sourceLabel(journal.sourceType)}</Badge>
                      <div className="small text-muted">Ref {journal.sourceId || '-'}</div>
                    </td>
                    <td>
                      <div>{formatRupiah(journal.totalDebitRupiah)}</div>
                      <small className="text-muted">debit/kredit harus sama</small>
                    </td>
                    <td><Badge bg={journal.isBalanced ? 'success' : 'danger'}>{journal.isBalanced ? 'Balanced' : 'Tidak balance'}</Badge></td>
                    <td><small>{formatDateTime(journal.postedAt ?? journal.createdAt)}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Alert variant="light" className="border mb-0">Belum ada jurnal penting terbaru. Ini normal jika belum ada transaksi baru sejak ledger aktif.</Alert>
        )}
        {note ? <small className="text-muted d-block mt-3">{note}</small> : null}
      </Card.Body>
    </Card>
  );
}
