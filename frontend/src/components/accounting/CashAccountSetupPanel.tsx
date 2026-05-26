import { FormEvent, useMemo, useState } from 'react';
import { Button, Card, Form, Table } from 'react-bootstrap';
import type { CashAccount, ChartOfAccount, CashAccountType } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

const cashTypes: CashAccountType[] = ['CASH', 'BANK', 'QRIS', 'EWALLET', 'OTHER'];

export default function CashAccountSetupPanel({
  accounts,
  cashAccounts,
  onSubmit,
  isSubmitting,
}: {
  accounts: ChartOfAccount[];
  cashAccounts: CashAccount[];
  onSubmit: (payload: { name: string; accountType: CashAccountType; chartOfAccountId: number; openingBalanceRupiah: number; currentBalanceRupiah: number; bankName?: string; holderName?: string; isDefault: boolean; isActive: boolean; notes?: string }) => void;
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

  return (
    <Card className="content-card border-0 h-100 accounting-setup-card">
      <Card.Body>
        <div className="section-kicker mb-2">Cash / Bank setup</div>
        <h3 className="panel-title mb-1">Akun kas dan bank</h3>
        <p className="text-muted">Buat minimal satu cash account agar readiness naik dan saldo awal bisa dikaitkan ke COA asset.</p>
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
            <Form.Label>COA Asset</Form.Label>
            <Form.Select value={selectedAccountId} onChange={(event) => setChartOfAccountId(Number(event.target.value))}>
              {assetAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Saldo awal</Form.Label>
            <Form.Control type="number" min={0} value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} />
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
          <thead><tr><th>Akun</th><th>Tipe</th><th>COA</th><th>Saldo</th></tr></thead>
          <tbody>
            {cashAccounts.length ? cashAccounts.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.name}</strong>{item.isDefault ? <span className="status-soft-pill success ms-2">Default</span> : null}</td>
                <td>{item.accountType}</td>
                <td>{item.chartOfAccount?.code} · {item.chartOfAccount?.name}</td>
                <td>{formatRupiah(item.currentBalanceRupiah)}</td>
              </tr>
            )) : <tr><td colSpan={4} className="text-muted">Belum ada cash/bank account.</td></tr>}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
