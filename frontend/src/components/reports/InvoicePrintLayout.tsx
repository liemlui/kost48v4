import React from 'react';
import { formatDateSafe } from '../../pages/resources/simpleCrudHelpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return num.toLocaleString('id-ID');
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  // Tampilkan 4 digit pertama dan 4 digit terakhir
  if (phone.length <= 6) return phone;
  const visible = Math.min(4, Math.floor(phone.length / 3));
  return phone.slice(0, visible) + '****' + phone.slice(-visible);
}

function maskNIK(nik: string | null | undefined): string {
  if (!nik) return '-';
  // SELALU masking NIK: tampilkan hanya 3 digit terakhir
  if (nik.length <= 3) return '***';
  return '****' + nik.slice(-3);
}

const lineTypeLabels: Record<string, string> = {
  RENT: 'Sewa',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  PENALTY: 'Denda',
  DISCOUNT: 'Diskon',
  WIFI: 'WiFi',
  OTHER: 'Lainnya',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  EWALLET: 'E-Wallet',
  OTHER: 'Lainnya',
};

export interface InvoicePrintData {
  id: number;
  invoiceNumber?: string | null;
  status: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueDate?: string | null;
  totalAmountRupiah?: number | null;
  lines?: Array<{
    lineType?: string;
    description?: string | null;
    qty?: string | number | null;
    unit?: string | null;
    unitPriceRupiah?: number | null;
    lineAmountRupiah?: number | null;
  }>;
  payments?: Array<{
    paymentDate?: string | null;
    amountRupiah?: number | null;
    method?: string | null;
    referenceNo?: string | null;
  }>;
  stay?: {
    tenant?: {
      fullName?: string | null;
      phone?: string | null;
      nik?: string | null;
    } | null;
    room?: {
      code?: string;
      name?: string | null;
    } | null;
  } | null;
}

interface Props {
  data: InvoicePrintData;
}

/**
 * Komponen layout cetak invoice / kwitansi.
 * Hanya ditampilkan saat @media print atau saat div.print-only terlihat.
 */
export default function InvoicePrintLayout({ data }: Props) {
  const isPaid = data.status === 'PAID';
  const isCancelled = data.status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="print-layout">
        <div style={{ textAlign: 'center', padding: '3cm 1cm' }}>
          <h3 style={{ color: '#dc3545' }}>Invoice Dibatalkan</h3>
          <p>Invoice ini telah dibatalkan dan tidak dapat dicetak.</p>
        </div>
      </div>
    );
  }

  const tenantName = data.stay?.tenant?.fullName ?? '-';
  const roomInfo = data.stay?.room
    ? `${data.stay.room.code}${data.stay.room.name ? ` · ${data.stay.room.name}` : ''}`
    : '-';
  const lines = data.lines ?? [];
  const payments = data.payments ?? [];
  const totalInvoice = Number(data.totalAmountRupiah ?? 0);

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amountRupiah ?? 0),
    0,
  );
  const outstanding = Math.max(totalInvoice - totalPaid, 0);

  const printedDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Data privacy
  const phone = maskPhone(data.stay?.tenant?.phone);
  const nik = maskNIK(data.stay?.tenant?.nik);

  return (
    <div className="print-layout" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", padding: '1cm', maxWidth: '800px', margin: '0 auto', color: '#000' }}>
      {/* ========== HEADER ========== */}
      <table style={{ width: '100%', border: 'none', marginBottom: '16pt' }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontSize: '16pt', fontWeight: 700 }}>🏠 KOST48 SURABAYA</h2>
              <div style={{ fontSize: '9pt', color: '#555', marginTop: '2pt' }}>
                Jl. Kedung Tarukan 4C No. 48, Surabaya<br />
                WA: 0812-3456-7890 &nbsp;|&nbsp; kost48surabaya.com
              </div>
            </td>
            <td style={{ border: 'none', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{
                display: 'inline-block',
                border: '2pt solid #333',
                padding: '6pt 12pt',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '1pt' }}>
                  {isPaid ? 'KWITANSI' : 'INVOICE'}
                </div>
                <div style={{ fontSize: '7pt', color: '#555' }}>
                  {isPaid ? 'Tanda Terima Pembayaran' : 'Tagihan'}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ border: '0.5pt solid #ccc', margin: '8pt 0 12pt 0' }} />

      {/* ========== INFO HEADER ========== */}
      <table style={{ width: '100%', border: 'none', marginBottom: '12pt', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', width: '30%', fontWeight: 600 }}>No. Invoice</td>
            <td style={{ border: 'none', width: '70%' }}>: {data.invoiceNumber || `INV-${data.id}`}</td>
          </tr>
          <tr>
            <td style={{ border: 'none', fontWeight: 600 }}>Tanggal Cetak</td>
            <td style={{ border: 'none' }}>: {printedDate}</td>
          </tr>
          <tr>
            <td style={{ border: 'none', fontWeight: 600 }}>Tenant</td>
            <td style={{ border: 'none' }}>: {tenantName}</td>
          </tr>
          <tr>
            <td style={{ border: 'none', fontWeight: 600 }}>Kamar</td>
            <td style={{ border: 'none' }}>: {roomInfo}</td>
          </tr>
          <tr>
            <td style={{ border: 'none', fontWeight: 600 }}>Periode</td>
            <td style={{ border: 'none' }}>: {formatDateSafe(data.periodStart)} – {formatDateSafe(data.periodEnd)}</td>
          </tr>
          <tr>
            <td style={{ border: 'none', fontWeight: 600 }}>Jatuh Tempo</td>
            <td style={{ border: 'none' }}>: {formatDateSafe(data.dueDate)}</td>
          </tr>
        </tbody>
      </table>

      <hr style={{ border: '0.5pt solid #ccc', margin: '8pt 0 12pt 0' }} />

      {/* ========== RINCIAN TAGIHAN ========== */}
      <h4 style={{ fontSize: '11pt', margin: '0 0 6pt 0', fontWeight: 600 }}>RINCIAN TAGIHAN</h4>
      {lines.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#888' }}>Tidak ada rincian tagihan.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '8pt' }}>
          <thead>
            <tr>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'left', background: '#f5f5f5' }}>Tipe</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'left', background: '#f5f5f5' }}>Deskripsi</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'center', background: '#f5f5f5' }}>Qty</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', background: '#f5f5f5' }}>Harga Satuan</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', background: '#f5f5f5' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt' }}>{lineTypeLabels[line.lineType ?? ''] ?? line.lineType ?? '-'}</td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt' }}>{line.description || '-'}</td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'center' }}>
                  {line.qty !== null && line.qty !== undefined ? String(line.qty) : '-'}
                  {line.unit ? ` ${line.unit}` : ''}
                </td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right' }}>
                  Rp {formatRupiah(line.unitPriceRupiah)}
                </td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 500 }}>
                  Rp {formatRupiah(line.lineAmountRupiah)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 600, background: '#fafafa' }}>
                TOTAL
              </td>
              <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 700, background: '#fafafa' }}>
                Rp {formatRupiah(totalInvoice)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* ========== PEMBAYARAN ========== */}
      <h4 style={{ fontSize: '11pt', margin: '12pt 0 6pt 0', fontWeight: 600 }}>PEMBAYARAN</h4>
      {payments.length === 0 ? (
        <p style={{ fontSize: '10pt', color: '#888' }}>Belum ada pembayaran tercatat.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '8pt' }}>
          <thead>
            <tr>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'left', background: '#f5f5f5' }}>Tanggal</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'left', background: '#f5f5f5' }}>Metode</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'left', background: '#f5f5f5' }}>Referensi</th>
              <th style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', background: '#f5f5f5' }}>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, idx) => (
              <tr key={idx}>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt' }}>{formatDateSafe(payment.paymentDate)}</td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt' }}>{paymentMethodLabels[payment.method ?? ''] ?? payment.method ?? '-'}</td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt' }}>{payment.referenceNo || '-'}</td>
                <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 500 }}>
                  Rp {formatRupiah(payment.amountRupiah)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 600, background: '#fafafa' }}>
                Total Dibayar
              </td>
              <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 600, background: '#fafafa' }}>
                Rp {formatRupiah(totalPaid)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 600 }}>
                Sisa
              </td>
              <td style={{ border: '0.5pt solid #ccc', padding: '4pt 6pt', textAlign: 'right', fontWeight: 700 }}>
                Rp {formatRupiah(outstanding)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* ========== LUNAS STAMP ========== */}
      {isPaid ? (
        <div style={{ textAlign: 'center', marginTop: '16pt', marginBottom: '16pt' }}>
          <div className="print-lunas-stamp" style={{
            display: 'inline-block',
            border: '3pt solid #198754',
            color: '#198754',
            fontSize: '18pt',
            fontWeight: 700,
            padding: '8pt 24pt',
            transform: 'rotate(-10deg)',
            opacity: 0.85,
            letterSpacing: '1pt',
          }}>
            ✅ LUNAS
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '12pt', marginBottom: '16pt' }}>
          <div style={{
            display: 'inline-block',
            padding: '6pt 20pt',
            fontSize: '10pt',
            color: '#dc3545',
            fontWeight: 600,
          }}>
            {outstanding > 0 ? `Belum Lunas — Sisa Rp ${formatRupiah(outstanding)}` : ''}
          </div>
        </div>
      )}

      <hr style={{ border: '0.5pt solid #ccc', margin: '8pt 0 12pt 0' }} />

      {/* ========== TANDA TANGAN ========== */}
      <table style={{ width: '100%', border: 'none', marginTop: '24pt', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', width: '50%', textAlign: 'left', verticalAlign: 'bottom' }}>
              <div style={{ marginBottom: '40pt' }}>Tenant,</div>
              <div style={{ fontWeight: 600 }}>{tenantName}</div>
            </td>
            <td style={{ border: 'none', width: '50%', textAlign: 'right', verticalAlign: 'bottom' }}>
              <div style={{ marginBottom: '40pt' }}>Diterima oleh,</div>
              <div style={{ fontWeight: 600 }}>Admin KOST48</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ========== FOOTER PRIVACY ========== */}
      <div style={{ marginTop: '20pt', paddingTop: '8pt', borderTop: '0.5pt solid #eee', fontSize: '7pt', color: '#999', textAlign: 'center' }}>
        Ponsel: {phone} &nbsp;|&nbsp; NIK: {nik}<br />
        KOST48 Surabaya — Dokumen ini dicetak otomatis dari sistem.
      </div>
    </div>
  );
}