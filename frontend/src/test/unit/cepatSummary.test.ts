import { describe, expect, it } from 'vitest';
import type { ActionQueueItem } from '../../components/command-center/ActionQueueTable';
import {
  CEPAT_SUMMARY_VERSION,
  buildCepatSummaryText,
  sanitizeCepatSummaryField,
} from '../../utils/cepatSummary';

const FIXED_DATE = new Date('2026-10-17T05:00:00.000Z');

const items: ActionQueueItem[] = [
  {
    id: 'invoice-1',
    priority: 'HIGH',
    type: 'Tagihan',
    subject: 'Tagihan INV-2026-0042',
    issue: 'NIK 3578123456789012 · Jl. Raya No. 1 · nominal Rp 500.000',
    recommendedAction: 'Bayar & kirim bukti',
  },
  {
    id: 'renew-1',
    priority: 'MEDIUM',
    type: 'Perpanjangan',
    subject: 'Perpanjangan menunggu keputusan',
    issue: 'Pengajuan berhenti di titik keputusan.',
    recommendedAction: 'Tentukan: lanjut atau tidak',
  },
];

describe('AIDL-05 — ringkasan Mode Cepat untuk WhatsApp/cetak', () => {
  it('format stabil: versi, tanggal WIB, dan hitungan prioritas', () => {
    const text = buildCepatSummaryText({ role: 'OWNER', items, date: FIXED_DATE });

    expect(text.startsWith(CEPAT_SUMMARY_VERSION)).toBe(true);
    expect(text).toContain('Ringkasan Mode Cepat · OWNER · 17/10/2026 12.00 WIB');
    expect(text).toContain('Total 2 kartu · tinggi 1 · sedang 1 · lainnya 0');
    expect(text).toContain('1. [TINGGI] Tagihan · Tagihan INV-2026-0042 → Bayar & kirim bukti');
    expect(text).toContain('2. [SEDANG] Perpanjangan · Perpanjangan menunggu keputusan → Tentukan: lanjut atau tidak');
  });

  it('tidak mengambil issue bebas (NIK/alamat/nominal tidak bocor)', () => {
    const text = buildCepatSummaryText({ role: 'ADMIN', items, date: FIXED_DATE });

    expect(text).not.toContain('3578123456789012');
    expect(text).not.toContain('Jl. Raya');
    expect(text).not.toContain('Rp 500.000');
  });

  it('NIK 16 digit dan petunjuk alamat di subjek disamarkan', () => {
    expect(sanitizeCepatSummaryField('Penyewa 3578123456789012')).toBe('Penyewa [NIK disamarkan]');
    expect(sanitizeCepatSummaryField('Jl. Raya No. 1')).toBe('[alamat disamarkan]');
    expect(sanitizeCepatSummaryField('Kamar A-1')).toBe('Kamar A-1');
  });

  it('field tambahan di luar whitelist tidak pernah masuk ringkasan', () => {
    const withExtras = [{
      ...items[0],
      nik: '3578123456789012',
      address: 'Jl. Raya No. 1',
      photoUrl: 'https://example.test/ktp.jpg',
    } as unknown as ActionQueueItem];

    const text = buildCepatSummaryText({ role: 'OWNER', items: withExtras, date: FIXED_DATE });
    expect(text).not.toContain('3578123456789012');
    expect(text).not.toContain('Jl. Raya');
    expect(text).not.toContain('ktp.jpg');
  });

  it('panjang teks dibatasi dan diberi penanda potong', () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      ...items[0],
      id: `item-${index}`,
      subject: `Tagihan nomor ${index} dengan subjek yang sengaja panjang`,
    })) as unknown as ActionQueueItem[];

    const text = buildCepatSummaryText({ role: 'OWNER', items: many, date: FIXED_DATE, maxLength: 600 });

    expect(text.length).toBeLessThanOrEqual(600);
    expect(text).toContain('dipotong; buka aplikasi untuk daftar lengkap.');
  });

  it('daftar kosong tetap menghasilkan ringkasan yang sah', () => {
    const text = buildCepatSummaryText({ role: 'ADMIN', items: [], date: FIXED_DATE });
    expect(text).toContain('Total 0 kartu · tinggi 0 · sedang 0 · lainnya 0');
  });
});
