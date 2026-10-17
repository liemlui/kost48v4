import { Button } from 'react-bootstrap';
import type { ActionQueueItem } from '../command-center/ActionQueueTable';
import type { UserRole } from '../../types';
import { buildCepatSummaryText } from '../../utils/cepatSummary';
import { buildAdminWaUrl } from '../../utils/whatsapp';

/**
 * Aksi ringkasan Mode Cepat: kirim WhatsApp + cetak (OWNER/ADMIN saja).
 * Teks dibuat deterministik dari kartu yang sedang tampil; tidak memanggil AI.
 */
export default function CepatSummaryActions({ items, role }: { items: ActionQueueItem[]; role: UserRole }) {
  if (role !== 'OWNER' && role !== 'ADMIN') return null;

  const summary = buildCepatSummaryText({ role, items });
  const waUrl = buildAdminWaUrl(summary);

  return (
    <section className="cepat-summary-actions" aria-label="Kirim ringkasan Mode Cepat">
      <div className="cepat-summary-actions-row">
        <a
          className="btn btn-outline-success btn-sm"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Buka WhatsApp dengan teks ringkasan yang sudah disiapkan"
        >
          Kirim ringkasan via WhatsApp
        </a>
        <Button type="button" variant="outline-secondary" size="sm" onClick={() => window.print()}>
          Cetak ringkasan
        </Button>
      </div>
      <p className="cepat-summary-note">
        Tanpa NIK, foto identitas, atau alamat. Teks dibatasi {summary.length} karakter.
      </p>

      <div className="print-only cepat-print-summary">
        <h1>Ringkasan Mode Cepat</h1>
        <pre>{summary}</pre>
      </div>
    </section>
  );
}
