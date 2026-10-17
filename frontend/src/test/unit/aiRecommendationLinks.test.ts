import { describe, expect, it } from 'vitest';
import { toSafeAiPriorityActions } from '../../utils/aiRecommendationLinks';

describe('AIDL-03 — rekomendasi AI tidak pernah membawa rute mentah', () => {
  it('rute yang dikenal diubah menjadi safeRoute', () => {
    const [item] = toSafeAiPriorityActions([
      { title: 'Tagihan jatuh tempo', reason: 'Ada 4 tagihan lewat tenggat.', severity: 'HIGH', route: '/invoices?status=PAID' },
    ]);

    expect(item.safeRoute).toBe('/invoices?status=PAID');
    expect(item).not.toHaveProperty('route');
  });

  it('rute detail yang cocok pola :id lolos', () => {
    const items = toSafeAiPriorityActions([
      { title: 'Tagihan', reason: 'Satu tagihan.', severity: 'HIGH', route: '/invoices/12' },
      { title: 'Kamar', reason: 'Satu kamar.', severity: 'MEDIUM', route: '/rooms/kamar-a-1' },
    ]);

    expect(items.map((item) => item.safeRoute)).toEqual(['/invoices/12', '/rooms/kamar-a-1']);
  });

  it('rute asing, berbahaya, dan kosong menjadi undefined', () => {
    const items = toSafeAiPriorityActions([
      { title: 'Asing', reason: '', severity: 'HIGH', route: '/halaman-yang-tidak-ada' },
      { title: 'Skrip', reason: '', severity: 'CRITICAL', route: 'javascript:alert(1)' },
      { title: 'Protokol', reason: '', severity: 'HIGH', route: '//jahat.example/x' },
      { title: 'Kosong', reason: '', severity: 'LOW' },
    ]);

    expect(items.map((item) => item.safeRoute)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('daftar kosong/null aman', () => {
    expect(toSafeAiPriorityActions(undefined)).toEqual([]);
    expect(toSafeAiPriorityActions(null)).toEqual([]);
  });
});
