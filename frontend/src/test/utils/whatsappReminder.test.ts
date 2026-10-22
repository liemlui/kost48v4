import { describe, expect, it } from 'vitest';
import {
  buildTenantReminderMessage,
  buildTenantWaUrl,
  normalizeWaPhone,
} from '../../utils/whatsapp';

describe('W-TNT-004 — nomor WA dinormalisasi ke 62…', () => {
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['812 3456 7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizeWaPhone(input)).toBe(expected);
  });
});

describe('W-TNT-004 — tautan wa.me manual', () => {
  it('tanpa nomor → tautan kosong (UI menampilkan arahan isi profil)', () => {
    expect(buildTenantWaUrl('', 'halo')).toBe('');
    expect(buildTenantWaUrl(null, 'halo')).toBe('');
  });

  it('memakai nomor 62… dan pesan ter-encode', () => {
    const url = buildTenantWaUrl('0812 3456 7890', 'Halo & terima kasih');
    expect(url.startsWith('https://wa.me/6281234567890?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Halo & terima kasih'));
    expect(url).not.toContain(' ');
  });
});

describe('W-TNT-004 — isi pesan pengingat', () => {
  it('hanya memuat sapaan, topik, dan batas waktu', () => {
    const pesan = buildTenantReminderMessage({
      tenantName: 'Budi',
      subject: 'INV-2026-0042',
      type: 'Tagihan jatuh tempo',
      deadlineLabel: '22 Okt 2026',
    });
    expect(pesan).toContain('Halo Budi');
    expect(pesan).toContain('INV-2026-0042');
    expect(pesan).toContain('22 Okt 2026');
    expect(pesan.toLowerCase()).not.toMatch(/nik|foto|alamat/);
  });

  it('tanpa nama tetap sopan dan tanpa data pribadi', () => {
    const pesan = buildTenantReminderMessage({ subject: 'Perpanjangan sewa' });
    expect(pesan.startsWith('Halo,')).toBe(true);
    expect(pesan.toLowerCase()).not.toMatch(/nik|foto|alamat/);
  });

  it('panjang dibatasi 320 karakter walau subjek sangat panjang', () => {
    const pesan = buildTenantReminderMessage({ subject: 'x'.repeat(1000) });
    expect(pesan.length).toBeLessThanOrEqual(320);
    expect(pesan.endsWith('...')).toBe(true);
  });
});
