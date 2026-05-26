import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import type { AccountingPeriod, ChartOfAccount, OpeningBalanceBatch, OpeningBalanceLinePayload } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function yearMonthFromInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

type EditableLine = OpeningBalanceLinePayload & { key: string; debitText: string; creditText: string };

export default function OpeningBalanceWizard({
  accounts,
  periods,
  batches,
  onCreatePeriod,
  onCreateDraft,
  onPost,
  onVoid,
  canManageOpeningBalance = true,
  isCreatingDraft,
  isPosting,
  isVoiding,
}: {
  accounts: ChartOfAccount[];
  periods: AccountingPeriod[];
  batches: OpeningBalanceBatch[];
  onCreatePeriod: (payload: { year: number; month: number; notes?: string }) => void;
  onCreateDraft: (payload: { accountingPeriodId: number; cutoverDate: string; notes?: string; lines: OpeningBalanceLinePayload[] }) => void;
  onPost: (id: number) => void;
  onVoid: (id: number) => void;
  canManageOpeningBalance?: boolean;
  isCreatingDraft?: boolean;
  isPosting?: boolean;
  isVoiding?: boolean;
}) {
  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);
  const latestOpenPeriod = periods.find((period) => period.status === 'OPEN') ?? periods[0];
  const [periodId, setPeriodId] = useState<number>(latestOpenPeriod?.id ?? 0);
  const [cutoverDate, setCutoverDate] = useState(todayInput());
  const cutoverYearMonth = yearMonthFromInput(cutoverDate);
  const periodForCutover = useMemo(() => {
    if (!cutoverYearMonth) return undefined;
    return periods.find((period) => period.year === cutoverYearMonth.year && period.month === cutoverYearMonth.month);
  }, [periods, cutoverYearMonth?.year, cutoverYearMonth?.month]);
  const [notes, setNotes] = useState('Saldo awal accounting KOST48');
  const [lines, setLines] = useState<EditableLine[]>([
    { key: 'cash', chartOfAccountId: activeAccounts.find((a) => a.code === '1000')?.id ?? activeAccounts[0]?.id ?? 0, description: 'Kas tunai awal', debitText: '0', creditText: '0' },
    { key: 'bank', chartOfAccountId: activeAccounts.find((a) => a.code === '1010')?.id ?? activeAccounts[0]?.id ?? 0, description: 'Bank utama awal', debitText: '0', creditText: '0' },
    { key: 'deposit', chartOfAccountId: activeAccounts.find((a) => a.code === '2000')?.id ?? activeAccounts[0]?.id ?? 0, description: 'Deposit tenant liability awal', debitText: '0', creditText: '0' },
    { key: 'capital', chartOfAccountId: activeAccounts.find((a) => a.code === '3000')?.id ?? activeAccounts[0]?.id ?? 0, description: 'Modal owner awal', debitText: '0', creditText: '0' },
  ]);

  useEffect(() => {
    if (!latestOpenPeriod || periodId) return;
    setPeriodId(latestOpenPeriod.id);
  }, [latestOpenPeriod, periodId]);

  useEffect(() => {
    if (periodForCutover && periodForCutover.id !== periodId) {
      setPeriodId(periodForCutover.id);
    }
  }, [periodForCutover, periodId]);

  useEffect(() => {
    if (!activeAccounts.length) return;
    setLines((current) => current.map((line) => {
      if (line.chartOfAccountId) return line;
      const fallback =
        line.key === 'cash' ? activeAccounts.find((account) => account.code === '1000') :
        line.key === 'bank' ? activeAccounts.find((account) => account.code === '1010') :
        line.key === 'deposit' ? activeAccounts.find((account) => account.code === '2000') :
        line.key === 'capital' ? activeAccounts.find((account) => account.code === '3000') : undefined;
      return { ...line, chartOfAccountId: fallback?.id ?? activeAccounts[0].id };
    }));
  }, [activeAccounts]);

  const selectedPeriodId = periodId || latestOpenPeriod?.id || 0;
  const mappedLines = lines.map((line, index) => ({
    chartOfAccountId: Number(line.chartOfAccountId),
    description: line.description,
    debitRupiah: numberValue(line.debitText),
    creditRupiah: numberValue(line.creditText),
    sortOrder: index,
  }));
  const totalDebit = mappedLines.reduce((sum, line) => sum + (line.debitRupiah ?? 0), 0);
  const totalCredit = mappedLines.reduce((sum, line) => sum + (line.creditRupiah ?? 0), 0);
  const balanced = totalDebit > 0 && totalDebit === totalCredit;
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId);
  const selectedCutoverDate = cutoverDate;
  const postedForSelectedCutover = batches.find((batch) =>
    batch.status === 'POSTED' && (
      (selectedPeriodId && batch.accountingPeriodId === selectedPeriodId) ||
      String(batch.cutoverDate).slice(0, 10) === selectedCutoverDate
    ),
  );
  const draftForSelectedCutover = batches.find((batch) =>
    batch.status === 'DRAFT' && (
      (selectedPeriodId && batch.accountingPeriodId === selectedPeriodId) ||
      String(batch.cutoverDate).slice(0, 10) === selectedCutoverDate
    ),
  );
  const canCreateDraft = Boolean(canManageOpeningBalance && selectedPeriodId && balanced && !postedForSelectedCutover && !draftForSelectedCutover);

  function updateLine(key: string, patch: Partial<EditableLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function addLine() {
    setLines((current) => [...current, { key: String(Date.now()), chartOfAccountId: activeAccounts[0]?.id ?? 0, description: '', debitText: '0', creditText: '0' }]);
  }

  function createCurrentPeriod() {
    if (periodForCutover) {
      setPeriodId(periodForCutover.id);
      return;
    }
    const ym = yearMonthFromInput(cutoverDate);
    if (!ym) return;
    onCreatePeriod({ year: ym.year, month: ym.month, notes: 'Periode cutover accounting.' });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreateDraft) return;
    onCreateDraft({ accountingPeriodId: selectedPeriodId, cutoverDate, notes, lines: mappedLines });
  }

  return (
    <Card className="content-card border-0 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Opening Balance Wizard</div>
        <div className="d-flex justify-content-between gap-3 align-items-start flex-wrap">
          <div>
            <h3 className="panel-title mb-1">Saldo awal dan cutover</h3>
            <p className="text-muted mb-0">Debit dan kredit harus sama sebelum draft bisa diposting menjadi jurnal pembuka.</p>
          </div>
          <Button variant="outline-primary" onClick={createCurrentPeriod} disabled={!canManageOpeningBalance}>
            {periodForCutover ? 'Gunakan Periode Cutover yang Ada' : 'Buat Periode dari Cutover'}
          </Button>
        </div>
        {!canManageOpeningBalance ? (
          <Alert variant="info" className="mt-3 mb-0">
            Mode lihat saja untuk Admin. Owner yang membuat draft, posting, atau membatalkan opening balance agar saldo awal neraca tidak berubah tanpa otorisasi.
          </Alert>
        ) : null}
        {periodForCutover ? (
          <Alert variant="info" className="mt-3 mb-0">
            Periode {periodForCutover.year}-{String(periodForCutover.month).padStart(2, '0')} sudah ada. Wizard akan memakai periode tersebut, jadi tidak perlu membuat periode duplicate.
          </Alert>
        ) : null}
        {postedForSelectedCutover ? (
          <Alert variant="success" className="mt-3 mb-0">
            Sudah ada opening balance POSTED untuk {selectedPeriod ? `${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, '0')}` : 'periode ini'}. Draft baru dikunci agar saldo awal tidak dobel.
          </Alert>
        ) : draftForSelectedCutover ? (
          <Alert variant="warning" className="mt-3 mb-0">
            Ada draft opening balance yang belum dipakai untuk period/cutover ini. Posting draft tersebut atau batalkan draft sebelum membuat draft baru.
          </Alert>
        ) : null}
        <Form onSubmit={submit} className="mt-3">
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Accounting period</Form.Label>
                <Form.Select value={selectedPeriodId} disabled={!canManageOpeningBalance} onChange={(event) => setPeriodId(Number(event.target.value))}>
                  <option value={0}>Pilih periode</option>
                  {periods.map((period) => <option key={period.id} value={period.id}>{period.year}-{String(period.month).padStart(2, '0')} · {period.status}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Cutover date</Form.Label>
                <Form.Control type="date" value={cutoverDate} disabled={!canManageOpeningBalance} onChange={(event) => setCutoverDate(event.target.value)} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Catatan</Form.Label>
                <Form.Control value={notes} disabled={!canManageOpeningBalance} onChange={(event) => setNotes(event.target.value)} />
              </Form.Group>
            </Col>
          </Row>

          <Table responsive className="mt-3 accounting-lines-table">
            <thead><tr><th>COA</th><th>Deskripsi</th><th>Debit</th><th>Kredit</th><th /></tr></thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  <td>
                    <Form.Select value={line.chartOfAccountId} disabled={!canManageOpeningBalance} onChange={(event) => updateLine(line.key, { chartOfAccountId: Number(event.target.value) })}>
                      {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                    </Form.Select>
                  </td>
                  <td><Form.Control value={line.description ?? ''} disabled={!canManageOpeningBalance} onChange={(event) => updateLine(line.key, { description: event.target.value })} /></td>
                  <td><Form.Control type="number" min={0} value={line.debitText} disabled={!canManageOpeningBalance} onChange={(event) => updateLine(line.key, { debitText: event.target.value, creditText: event.target.value !== '0' ? '0' : line.creditText })} /></td>
                  <td><Form.Control type="number" min={0} value={line.creditText} disabled={!canManageOpeningBalance} onChange={(event) => updateLine(line.key, { creditText: event.target.value, debitText: event.target.value !== '0' ? '0' : line.debitText })} /></td>
                  <td><Button variant="link" disabled={!canManageOpeningBalance || lines.length <= 2} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Hapus</Button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th colSpan={2}>Total</th><th>{formatRupiah(totalDebit)}</th><th>{formatRupiah(totalCredit)}</th><th /></tr></tfoot>
          </Table>
          {!canManageOpeningBalance ? (
            <Alert variant="info">Admin dapat melihat status opening balance, tetapi action saldo awal dikunci untuk Owner.</Alert>
          ) : !balanced ? (
            <Alert variant="warning">Opening balance belum bisa diposting: total debit/kredit harus sama dan lebih dari 0.</Alert>
          ) : postedForSelectedCutover ? (
            <Alert variant="info">Opening balance untuk period/cutover ini sudah POSTED. Draft baru tidak perlu dibuat.</Alert>
          ) : draftForSelectedCutover ? (
            <Alert variant="warning">Draft opening balance untuk period/cutover ini sudah ada. Posting atau batalkan draft tersebut sebelum membuat draft baru.</Alert>
          ) : (
            <Alert variant="success">Opening balance balance. Draft bisa dibuat, lalu Owner dapat posting sebagai jurnal pembuka.</Alert>
          )}
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-primary" type="button" onClick={addLine} disabled={!canManageOpeningBalance}>Tambah Line</Button>
            <Button type="submit" disabled={!canCreateDraft || isCreatingDraft}>
              {!canManageOpeningBalance ? 'Khusus Owner' : postedForSelectedCutover ? 'Opening Balance Sudah Posted' : draftForSelectedCutover ? 'Draft Sudah Ada' : 'Buat Draft Opening Balance'}
            </Button>
          </div>
        </Form>

        <Table responsive hover className="mt-4 mb-0 small">
          <thead><tr><th>Batch</th><th>Status</th><th>Cutover</th><th>Total</th><th>Aksi</th></tr></thead>
          <tbody>
            {batches.length ? batches.map((batch) => (
              <tr key={batch.id}>
                <td><strong>{batch.batchNumber}</strong><br /><span className="text-muted">{batch.accountingPeriod ? `${batch.accountingPeriod.year}-${String(batch.accountingPeriod.month).padStart(2, '0')}` : 'Tanpa period'}</span></td>
                <td><span className={`status-soft-pill ${batch.status === 'POSTED' ? 'success' : 'warning'}`}>{batch.status}</span></td>
                <td>{String(batch.cutoverDate).slice(0, 10)}</td>
                <td>{formatRupiah(batch.totalDebitRupiah)} / {formatRupiah(batch.totalCreditRupiah)}</td>
                <td>
                  {batch.status === 'DRAFT' ? (
                    <div className="d-flex gap-2 flex-wrap">
                      <Button size="sm" disabled={!canManageOpeningBalance || isPosting} onClick={() => onPost(batch.id)}>{canManageOpeningBalance ? 'Posting' : 'Khusus Owner'}</Button>
                      <Button size="sm" variant="outline-danger" disabled={!canManageOpeningBalance || isVoiding} onClick={() => onVoid(batch.id)}>Batalkan Draft</Button>
                    </div>
                  ) : batch.status === 'VOID' ? (
                    <span className="text-muted">Dibatalkan</span>
                  ) : (
                    <span className="text-muted">Sudah posted</span>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan={5} className="text-muted">Belum ada opening balance batch.</td></tr>}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
