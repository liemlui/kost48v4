import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TENANT_RULE_CONTEXT,
  TENANT_RULE_CATEGORIES,
  TENANT_RULES_WIZARD_QUESTIONS,
  buildTenantRulesWizardResult,
  filterTenantRuleCategories,
  type TenantRuleContext,
} from '../../data/tenantRules';

const ctx: TenantRuleContext = {
  ...DEFAULT_TENANT_RULE_CONTEXT,
  roomCode: 'A1',
  roomDepositRupiah: 500000,
};

describe('tenantRules — model konten tunggal (W-TNT-001)', () => {
  it('memuat 8 kategori, masing-masing punya angka bersumber', () => {
    expect(TENANT_RULE_CATEGORIES).toHaveLength(8);
    expect(TENANT_RULE_CATEGORIES.map((c) => c.id)).toEqual([
      'hewan', 'penghuni', 'prabayar', 'pembayaran', 'deposit', 'overstay', 'checkout', 'ktp',
    ]);

    for (const category of TENANT_RULE_CATEGORIES) {
      expect(category.numbers.length).toBeGreaterThan(0);
      for (const number of category.numbers) {
        expect(number.value(ctx).length).toBeGreaterThan(0);
        expect(number.source.length).toBeGreaterThan(0);
      }
      expect(category.sections.length).toBeGreaterThan(0);
    }
  });

  it('deposit kamar dibaca dari konteks, bukan konstanta', () => {
    const deposit = TENANT_RULE_CATEGORIES.find((c) => c.id === 'deposit');
    const roomNumber = deposit?.numbers.find((n) => n.label === 'Deposit kamar');

    expect(roomNumber?.value(ctx)).toContain('500.000');
    expect(roomNumber?.value({ ...ctx, roomDepositRupiah: 750000 })).toContain('750.000');
    expect(roomNumber?.value({ ...ctx, roomDepositRupiah: null })).toContain('mengikuti kamar');
  });

  it('deposit hewan mengikuti konteks pengaturan', () => {
    const hewan = TENANT_RULE_CATEGORIES.find((c) => c.id === 'hewan');
    const petNumber = hewan?.numbers.find((n) => n.label === 'Deposit hewan');
    expect(petNumber?.value({ ...ctx, petDepositRupiah: 150000 })).toContain('150.000');
  });

  it('wizard punya tepat 4 pertanyaan dengan pilihan', () => {
    expect(TENANT_RULES_WIZARD_QUESTIONS).toHaveLength(4);
    for (const question of TENANT_RULES_WIZARD_QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('jalur 1 — calon · tanpa hewan · 1–2 orang · bulanan', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'calon', pet: 'tidak', occupants: '1-2', term: 'MONTHLY' },
      ctx,
    );

    expect(result.summary).toContain('masih calon');
    expect(result.categories).toHaveLength(8);
    expect(result.highlights.join(' ')).toContain('tanpa surcharge');
    expect(result.notes.hewan?.join(' ')).toContain('tidak ada deposit hewan');
    expect(result.notes.prabayar?.join(' ')).toContain('listrik & air dihitung dari meter');
    expect(result.notes.pembayaran?.join(' ')).toContain('DP 30%');
  });

  it('jalur 2 — penghuni · bawa hewan · 3–4 orang · 6 bulan', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'penghuni', pet: 'ya', occupants: '3-4', term: 'SMESTERLY' },
      ctx,
    );

    expect(result.summary).toContain('sudah penghuni');
    expect(result.highlights.join(' ')).toContain('deposit hewan');
    expect(result.notes.hewan?.join(' ')).toContain('Refundable');
    expect(result.notes.penghuni?.join(' ')).toContain('STANDARD');
    expect(result.notes.prabayar?.join(' ')).toContain('5,7');
    expect(result.notes.checkout?.join(' ')).toContain('minimal H+1');
  });

  it('jalur 3 — calon · bawa hewan · 5–6 orang · 1 tahun', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'calon', pet: 'ya', occupants: '5-6', term: 'YEARLY' },
      ctx,
    );

    expect(result.highlights.join(' ')).toContain('LARGE');
    expect(result.notes.penghuni?.join(' ')).toContain('maksimal 4 orang');
    expect(result.notes.prabayar?.join(' ')).toContain('11');
  });

  it('jalur 4 — penghuni · tanpa hewan · 1–2 orang · 2 minggu', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'penghuni', pet: 'tidak', occupants: '1-2', term: 'BIWEEKLY' },
      ctx,
    );

    expect(result.notes.prabayar?.join(' ')).toContain('0,75');
    expect(result.notes.prabayar?.join(' ')).toContain('termasuk');
    expect(result.notes.deposit?.join(' ')).toContain('500.000');
  });

  it('pencarian menemukan kategori lewat kata kunci dan isi', () => {
    expect(filterTenantRuleCategories('hewan', ctx).map((c) => c.id)).toContain('hewan');
    expect(filterTenantRuleCategories('overstay', ctx).map((c) => c.id)).toContain('overstay');
    expect(filterTenantRuleCategories('KTP', ctx).map((c) => c.id)).toContain('ktp');
    expect(filterTenantRuleCategories('tidak-ada-yang-cocok', ctx)).toHaveLength(0);
    expect(filterTenantRuleCategories('', ctx)).toHaveLength(8);
  });
});
