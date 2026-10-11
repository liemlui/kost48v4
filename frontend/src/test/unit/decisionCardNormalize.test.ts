import { describe, it, expect } from 'vitest';
import {
  normalizeDecisionCard,
  normalizeDecisionCards,
  type DecisionCardItem,
} from '../../utils/decisionCard';

/** Kartu gaya lama: tidak mengisi satu pun dari 5 field keputusan. */
const kartuLama: DecisionCardItem = {
  id: 7,
  subject: 'Tagihan telat',
  issue: 'Belum dibayar',
  recommendedAction: 'Kirim pengingat',
  priority: 'HIGH',
  actionTo: '/invoices',
  dedupKey: 'inv-7',
  entityType: 'invoice',
  entityId: 7,
};

describe('AIDL-01a — normalisasi kartu keputusan', () => {
  describe('field lama tetap valid (tidak ada field yang hilang)', () => {
    it('seluruh field lama dipertahankan apa adanya', () => {
      const meta = normalizeDecisionCard(kartuLama);
      expect(meta.id).toBe(7);
      expect(meta.subject).toBe('Tagihan telat');
      expect(meta.issue).toBe('Belum dibayar');
      expect(meta.recommendedAction).toBe('Kirim pengingat');
      expect(meta.priority).toBe('HIGH');
      expect(meta.actionTo).toBe('/invoices');
      expect(meta.dedupKey).toBe('inv-7');
      expect(meta.entityType).toBe('invoice');
      expect(meta.entityId).toBe(7);
    });

    it('kartu lama tetap sah tanpa galat dan tanpa nilai keputusan', () => {
      const meta = normalizeDecisionCard(kartuLama);
      expect(meta.sourceRefs).toEqual([]);
      expect(meta.sebab).toBeUndefined();
      expect(meta.dampak).toBeUndefined();
      expect(meta.expiresAt).toBeNull();
      expect(meta.hasDecisionContext).toBe(false);
    });

    it('normalizeDecisionCards menjaga urutan dan panjang larik', () => {
      const hasil = normalizeDecisionCards([kartuLama, { id: 2 }, { id: 3 }]);
      expect(hasil).toHaveLength(3);
      expect(hasil.map((h) => h.id)).toEqual([7, 2, 3]);
    });
  });

  describe('sourceRefs & expiresAt tidak disimpan mentah', () => {
    it('sourceRefs kosong/rusak dibuang, yang sah dipertahankan urutannya', () => {
      const meta = normalizeDecisionCard({
        id: 1,
        sourceRefs: [
          { label: ' Ringkasan keuangan ', ref: ' /api/owner/dashboard ' },
          { label: '', ref: '/api/x' },
          { label: 'OK', ref: '   ' },
        ],
      });
      expect(meta.sourceRefs).toEqual([{ label: 'Ringkasan keuangan', ref: '/api/owner/dashboard' }]);
      expect(meta.hasDecisionContext).toBe(true);
    });

    it('sourceRefs hilang / bukan larik → larik kosong, bukan galat', () => {
      expect(normalizeDecisionCard({ id: 1 }).sourceRefs).toEqual([]);
      expect(normalizeDecisionCard({ id: 1, sourceRefs: undefined }).sourceRefs).toEqual([]);
    });

    it('expiresAt lewat ditandai; yang belum lewat tidak ditandai', () => {
      const lampau = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const depan = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      expect(normalizeDecisionCard({ id: 1, expiresAt: lampau }).isExpired).toBe(true);
      expect(normalizeDecisionCard({ id: 1, expiresAt: depan }).isExpired).toBe(false);
    });

    it('expiresAt kosong / tak terbaca → tidak dianggap kedaluwarsa (tidak mengarang fakta)', () => {
      expect(normalizeDecisionCard({ id: 1, expiresAt: null }).isExpired).toBe(false);
      expect(normalizeDecisionCard({ id: 1, expiresAt: '   ' }).expiresAt).toBeNull();
      expect(normalizeDecisionCard({ id: 1, expiresAt: 'bukan-tanggal' }).isExpired).toBe(false);
    });

    it('teks sebab/dampak dirapikan, yang kosong jadi undefined', () => {
      const meta = normalizeDecisionCard({ id: 1, sebab: '  karena X  ', dampak: '   ' });
      expect(meta.sebab).toBe('karena X');
      expect(meta.dampak).toBeUndefined();
    });
  });

  describe('kartu fallback saat AI mati', () => {
    it('tanpa penanda apa pun kartu dianggap jalur rule-based dan tetap tampil', () => {
      const meta = normalizeDecisionCard(kartuLama);
      expect(meta.fallback).toBe(false);
      expect(meta.effectiveFallback).toBe(true);
    });

    it('fallback eksplisit true tetap true', () => {
      expect(normalizeDecisionCard({ id: 1, fallback: true }).effectiveFallback).toBe(true);
    });

    it('fallback eksplisit false (hasil AI) tetap false', () => {
      const meta = normalizeDecisionCard({ id: 1, fallback: false });
      expect(meta.fallback).toBe(false);
      expect(meta.effectiveFallback).toBe(false);
    });

    it('kartu fallback boleh tanpa sebab/dampak/sourceRefs — tidak ada galat', () => {
      expect(() => normalizeDecisionCard({ id: 1, fallback: true })).not.toThrow();
    });
  });
});
