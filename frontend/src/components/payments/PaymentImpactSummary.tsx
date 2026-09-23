// FILE: PaymentImpactSummary.tsx — ringkasan dampak approve (IMPACT-01).
// Hanya MENAMPILKAN angka dari backend (payment-impact.helper); tidak menghitung ulang.
import CurrencyDisplay from '../common/CurrencyDisplay';
import { formatDateTimeWib } from '../../utils/dateTime';
import type {
  PaymentImpactPreview,
  PaymentImpactRealized,
  PaymentImpactState,
} from '../../types';

type Props = {
  impact: PaymentImpactPreview | PaymentImpactRealized;
  showReferences?: boolean;
};

function StatusPair({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{before || '—'}</td>
      <td className="fw-semibold">{after || '—'}</td>
    </tr>
  );
}

function MoneyPair({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td><CurrencyDisplay amount={before} /></td>
      <td className="fw-semibold"><CurrencyDisplay amount={after} /></td>
    </tr>
  );
}

function expiresLabel(state: PaymentImpactState) {
  return state.expiresAt ? formatDateTimeWib(state.expiresAt) : 'Tanpa batas';
}

export default function PaymentImpactSummary({ impact, showReferences = false }: Props) {
  const realized = 'references' in impact ? (impact as PaymentImpactRealized) : null;

  return (
    <div className="payment-impact-summary">
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="small text-muted">Porsi pembayaran</div>
          <ul className="list-unstyled small mb-0">
            <li>Masuk tagihan sewa: <strong><CurrencyDisplay amount={impact.allocation.rentPortionRupiah} /></strong></li>
            <li>Masuk deposit titipan: <strong><CurrencyDisplay amount={impact.allocation.depositPortionRupiah} /></strong></li>
            {impact.allocation.excessRupiah > 0 ? (
              <li className="text-danger">Kelebihan nominal: <CurrencyDisplay amount={impact.allocation.excessRupiah} /></li>
            ) : null}
          </ul>
        </div>
        <div className="col-lg-6">
          <div className="small text-muted">Pengaruh kas / piutang / deposit</div>
          <ul className="list-unstyled small mb-0">
            <li>Kas masuk (jurnal): <strong><CurrencyDisplay amount={impact.accounting.jurnalKasMasukRupiah} /></strong></li>
            <li>Piutang 1100 turun: <strong><CurrencyDisplay amount={impact.accounting.piutangTurunRupiah} /></strong></li>
            <li>Deposit 2000 naik: <strong><CurrencyDisplay amount={impact.accounting.depositLiabilityNaikRupiah} /></strong></li>
            <li className="text-muted">Uang diterima: <CurrencyDisplay amount={impact.accounting.uangDiterimaRupiah} /></li>
          </ul>
        </div>
      </div>

      <table className="table table-sm mb-0 mt-3 align-middle">
        <thead>
          <tr>
            <th>Aspek</th>
            <th>Sebelum</th>
            <th>{showReferences ? 'Sesudah (nyata)' : 'Sesudah'}</th>
          </tr>
        </thead>
        <tbody>
          <StatusPair label="Status invoice" before={impact.before.invoiceStatus} after={impact.after.invoiceStatus} />
          <MoneyPair
            label="Invoice dibayar"
            before={impact.before.invoicePaidAmountRupiah}
            after={impact.after.invoicePaidAmountRupiah}
          />
          <MoneyPair
            label="Sisa invoice"
            before={impact.before.invoiceRemainingAmountRupiah}
            after={impact.after.invoiceRemainingAmountRupiah}
          />
          <StatusPair label="Status kamar" before={impact.before.roomStatus} after={impact.after.roomStatus} />
          <StatusPair label="Status hunian" before={impact.before.stayStatus} after={impact.after.stayStatus} />
          <MoneyPair
            label="Deposit dibayar"
            before={impact.before.depositPaidAmountRupiah}
            after={impact.after.depositPaidAmountRupiah}
          />
          <StatusPair
            label="Status deposit"
            before={impact.before.depositPaymentStatus}
            after={impact.after.depositPaymentStatus}
          />
          <MoneyPair
            label="DP dibayar"
            before={impact.before.downPaymentPaidRupiah}
            after={impact.after.downPaymentPaidRupiah}
          />
          <tr>
            <td>Batas booking</td>
            <td>{expiresLabel(impact.before)}</td>
            <td className="fw-semibold">{expiresLabel(impact.after)}</td>
          </tr>
        </tbody>
      </table>

      {impact.notes.length ? (
        <ul className="small text-muted mt-2 mb-0">
          {impact.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {showReferences && realized ? (
        <div className="small mt-3">
          <div className="text-muted">Rujukan transaksi</div>
          <ul className="list-unstyled mb-0">
            <li>
              InvoicePayment:{' '}
              <strong>{realized.references.invoicePaymentId ?? '—'}</strong>
            </li>
            <li>
              Jurnal pembayaran: <strong>{realized.references.journalInvoicePayment?.entryNumber ?? 'belum terbentuk'}</strong>
            </li>
            <li>
              Jurnal deposit: <strong>{realized.references.journalDeposit?.entryNumber ?? 'belum terbentuk'}</strong>
            </li>
            <li>
              Ledger deposit: <strong>{realized.references.depositLedgerEntryId ?? '—'}</strong>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

