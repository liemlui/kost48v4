import { FormEvent, useMemo, useState } from 'react';
import { Button, Card, Form, Modal, Table } from 'react-bootstrap';
import type { CashAccount, ChartOfAccount, CashAccountType, UpdateCashAccountPayload } from '../../api/accounting';
import CurrencyInput from '../common/CurrencyInput';
import { formatRupiah } from '../../utils/formatCurrency';

const cashTypes: CashAccountType[] = ['CASH', 'BANK', 'QRIS', 'EWALLET', 'OTHER'];

export default function CashAccountSetupPanel({
  accounts,
  cashAccounts,
  onSubmit,
  onUpdate,
  isSubmitting,
}: {
  accounts: ChartOfAccount[];
  cashAccounts: CashAccount[];
  onSubmit: (payload: { name: string; accountType: CashAccountType; chartOfAccountId: number; openingBalanceRupiah: number; currentBalanceRupiah: number; bankName?: string; holderName?: string; isDefault: boolean; isActive: boolean; notes?: string }) => void;
  onUpdate?: (cashAccountId: number, payload: UpdateCashAccountPayload) => void;
  isSubmitting?: boolean;
}) {
  const assetAccounts = useMemo(() => accounts.filter((account) => account.type === 'ASSET' && account.isActive), [accounts]);
  const defaultAsset = assetAccounts.find((account) => account.code === '1010') ?? assetAccounts[0];
  const [name, setName] = useState('Bank Utama KOST48');
  const [accountType, setAccountType] = useState<CashAccountType>('BANK');
  const [chartOfAccountId, setChartOfAccountId] = useState<number>(defaultAsset?.id ?? 0);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [editing, setEditing] = useState<CashAccount | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    accountType: 'BANK' as CashAccountType,
    chartOfAccountId: defaultAsset?.id ?? 0,
    currentBalanceRupiah: '0',
    bankName: '',
    holderName: '',
    isDefault: false,
    isActive: true,
  });

  const selectedAccountId = chartOfAccountId || defaultAsset?.id || 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedAccountId || !name.trim()) return;
    const amount = Math.max(0, Number(openingBalance || 0));
    onSubmit({
      name: name.trim(),
      accountType,
      chartOfAccountId: selectedAccountId,
      openingBalanceRupiah: amount,
      currentBalanceRupiah: amount,
      bankName: bankName.trim() || undefined,
      holderName: holderName.trim() || undefined,
      isDefault: cashAccounts.length === 0,
      isActive: true,
      notes: 'Dibuat dari halaman Laporan Keuangan.',
    });
  }

  function openEdit(item: CashAccount) {
    setEditing(item);
    setEditForm({
      name: item.name,
      accountType: item.accountType,
      chartOfAccountId: item.chartOfAccountId,
      currentBalanceRupiah: String(item.currentBalanceRupiah ?? 0),
      bankName: item.bankName ?? '',
      holderName: item.holderName ?? '',
      isDefault: item.isDefault,
      isActive: item.isActive,
    });
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !onUpdate) return;
    onUpdate(editing.id, {
      name: editForm.name.trim(),
      accountType: editForm.accountType,
      chartOfAccountId: editForm.chartOfAccountId,
      currentBalanceRupiah: Number(editForm.currentBalanceRupiah || 0),
      bankName: editForm.bankName.trim() || undefined,
      holderName: editForm.holderName.trim() || undefined,
      isDefault: editForm.isDefault,
      isActive: editForm.isActive,
    });
    setEditing(null);
  }

  return (
    <Card className="content-card border-0 h-100 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Cash / Bank setup</div>
        <h3 className="panel-title mb-1">Akun kas dan bank</h3>
        <p className="text-muted">Buat minimal satu akun kas/bank agar readiness naik dan saldo awal bisa dikaitkan ke akun aset di Bagan Akun (COA).</p>
        <Form onSubmit={submit} className="accounting-mini-form">
          <Form.Group>
            <Form.Label>Nama akun</Form.Label>
            <Form.Control value={name} onChange={(event) => setName(event.target.value)} placeholder="Bank Utama KOST48" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Tipe</Form.Label>
            <Form.Select value={accountType} onChange={(event) => setAccountType(event.target.value as CashAccountType)}>
              {cashTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Akun Aset (di Bagan Akun)</Form.Label>
            <Form.Select value={selectedAccountId} onChange={(event) => setChartOfAccountId(Number(event.target.value))}>
              {assetAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Saldo awal</Form.Label>
            <CurrencyInput value={openingBalance === '' ? undefined : Number(openingBalance)} onChange={(v) => setOpeningBalance(v == null ? '' : String(v))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Nama bank</Form.Label>
            <Form.Control value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="BCA / Mandiri / Tunai" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Atas nama</Form.Label>
            <Form.Control value={holderName} onChange={(event) => setHolderName(event.target.value)} placeholder="Nama pemilik rekening" />
          </Form.Group>
          <Button type="submit" disabled={isSubmitting || !selectedAccountId || !name.trim()}>Simpan Cash Account</Button>
        </Form>

        <Table responsive hover className="mt-3 mb-0 small">
          <thead><tr><th>Akun</th><th>Tipe</th><th>Akun (COA)</th><th>Saldo</th><th></th></tr></thead>
          <tbody>
            {cashAccounts.length ? cashAccounts.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.name}</strong>{item.isDefault ? <span className="status-soft-pill success ms-2">Default</span> : null}</td>
                <td>{item.accountType}</td>
                <td>{item.chartOfAccount?.code} · {item.chartOfAccount?.name}</td>
                <td>{formatRupiah(item.currentBalanceRupiah)}</td>
                <td className="text-end">{onUpdate ? <Button size="sm" variant="outline-primary" onClick={() => openEdit(item)}>Edit</Button> : null}</td>
              </tr>
            )) : <tr><td colSpan={5} className="text-muted">Belum ada cash/bank account.</td></tr>}
          </tbody>
        </Table>
      </Card.Body>

      <Modal show={Boolean(editing)} onHide={() => setEditing(null)} centered>
        <Form onSubmit={submitEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Cash Account</Modal.Title>
          </Modal.Header>
          <Modal.Body className="d-grid gap-3">
            <Form.Group>
              <Form.Label>Nama akun</Form.Label>
              <Form.Control value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Tipe</Form.Label>
              <Form.Select value={editForm.accountType} onChange={(event) => setEditForm((prev) => ({ ...prev, accountType: event.target.value as CashAccountType }))}>
                {cashTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Akun Aset (COA)</Form.Label>
              <Form.Select value={editForm.chartOfAccountId} onChange={(event) => setEditForm((prev) => ({ ...prev, chartOfAccountId: Number(event.target.value) }))}>
                {assetAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Saldo sekarang</Form.Label>
              <CurrencyInput value={Number(editForm.currentBalanceRupiah || 0)} onChange={(value) => setEditForm((prev) => ({ ...prev, currentBalanceRupiah: String(value ?? 0) }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Nama bank</Form.Label>
              <Form.Control value={editForm.bankName} onChange={(event) => setEditForm((prev) => ({ ...prev, bankName: event.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Atas nama</Form.Label>
              <Form.Control value={editForm.holderName} onChange={(event) => setEditForm((prev) => ({ ...prev, holderName: event.target.value }))} />
            </Form.Group>
            <div className="d-flex gap-3">
              <Form.Check type="switch" label="Default" checked={editForm.isDefault} onChange={(event) => setEditForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              <Form.Check type="switch" label="Aktif" checked={editForm.isActive} onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light" onClick={() => setEditing(null)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting || !editForm.name.trim() || !editForm.chartOfAccountId}>Simpan Perubahan</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
}
