import { describe, it, expect } from 'vitest';
import {
  DECISION_CARD_ROUTES,
  DECISION_CARD_RULES,
  isDecisionRouteAllowed,
  resolveDecisionRoute,
  isDecisionRuleKnown,
} from '../../utils/decisionRoutes';

describe('AIDL-01b — allowlist rute kartu keputusan', () => {
  describe('rute yang dikenal diteruskan apa adanya', () => {
    it('rute kartu yang dipakai hari ini lolos', () => {
      for (const rute of DECISION_CARD_ROUTES) {
        expect(resolveDecisionRoute(rute)).toBe(rute);
      }
    });

    it('query yang dipakai kartu dipertahankan', () => {
      expect(resolveDecisionRoute('/stays?status=BOOKINGS')).toBe('/stays?status=BOOKINGS');
      expect(resolveDecisionRoute('/tenants?ktpStatus=PENDING_REVIEW')).toBe('/tenants?ktpStatus=PENDING_REVIEW');
      expect(resolveDecisionRoute('/reports?tab=formal')).toBe('/reports?tab=formal');
    });

    it('spasi di tepi dimaafkan, tanpa mengubah rute', () => {
      expect(resolveDecisionRoute('  /invoices  ')).toBe('/invoices');
    });
  });

  describe('rute dari luar kode DITOLAK (inti keamanannya)', () => {
    it('rute asing ditolak, bukan diteruskan', () => {
      expect(resolveDecisionRoute('/halaman-yang-tidak-ada')).toBeUndefined();
      expect(resolveDecisionRoute('/admin/secret')).toBeUndefined();
      expect(isDecisionRouteAllowed('/halaman-yang-tidak-ada')).toBe(false);
    });

    it('skema berbahaya ditolak', () => {
      expect(resolveDecisionRoute('javascript:alert(1)')).toBeUndefined();
      expect(resolveDecisionRoute('http://jahat.example/x')).toBeUndefined();
      expect(resolveDecisionRoute('//jahat.example/x')).toBeUndefined();
    });

    it('upaya keluar jalur & backslash ditolak', () => {
      expect(resolveDecisionRoute('/invoices/../../etc/passwd')).toBeUndefined();
      expect(resolveDecisionRoute('\\invoices')).toBeUndefined();
    });

    it('rute relatif tanpa garis miring awal ditolak', () => {
      expect(resolveDecisionRoute('invoices')).toBeUndefined();
      expect(resolveDecisionRoute('')).toBeUndefined();
      expect(resolveDecisionRoute(undefined)).toBeUndefined();
      expect(resolveDecisionRoute(null)).toBeUndefined();
    });

    it('query aneh ditolak walau path-nya dikenal', () => {
      expect(resolveDecisionRoute('/invoices?x=<script>')).toBeUndefined();
      expect(resolveDecisionRoute('/invoices?a=b c')).toBeUndefined();
    });
  });

  describe('ruleId', () => {
    it('aturan yang hidup di kode dikenal', () => {
      for (const ruleId of DECISION_CARD_RULES) {
        expect(isDecisionRuleKnown(ruleId)).toBe(true);
      }
    });

    it('aturan yang tidak dikenal / kosong dianggap tidak dikenal', () => {
      expect(isDecisionRuleKnown('aturan-karangan-ai')).toBe(false);
      expect(isDecisionRuleKnown('')).toBe(false);
      expect(isDecisionRuleKnown(undefined)).toBe(false);
    });
  });

  describe('daftar allowlist tidak boleh menyusut tanpa sadar', () => {
    it('kedua daftar tidak kosong dan tidak memuat duplikat', () => {
      expect(DECISION_CARD_ROUTES.length).toBeGreaterThan(0);
      expect(DECISION_CARD_RULES.length).toBeGreaterThan(0);
      expect(new Set(DECISION_CARD_ROUTES).size).toBe(DECISION_CARD_ROUTES.length);
      expect(new Set(DECISION_CARD_RULES).size).toBe(DECISION_CARD_RULES.length);
    });

    it('setiap rute allowlist bentuknya benar (diawali / tanpa spasi)', () => {
      for (const rute of DECISION_CARD_ROUTES) {
        expect(rute.startsWith('/')).toBe(true);
        expect(/\s/.test(rute)).toBe(false);
      }
    });
  });
});
