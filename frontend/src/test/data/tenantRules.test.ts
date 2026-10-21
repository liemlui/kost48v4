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
  rentRupiah: 1000000,
  roomSize: 'STANDARD',
  occupantCount: 2,
};

describe('tenantRules — konten aturan (W-TNT-001)', () => {
  it('memuat 8 kategori dengan angka bersumber dan bahasa ringkas', () => {
    expect(TENANT_RULE_CATEGORIES).toHaveLength(8);
    expect(TENANT_RULE_CATEGORIES.map((c) => c.id)).toEqual([
      'hewan', 'penghuni', 'prabayar', 'pembayaran', 'deposit', 'overstay', 'checkout', 'ktp',
    ]);

    for (const category of TENANT_RULE_CATEGORIES) {
      expect(category.numbers.length).toBeGreaterThan(0);
      expect(category.numbers.length).toBeLessThanOrEqual(2);
      for (const number of category.numbers) {
        expect(number.value(ctx).length).toBeGreaterThan(0);
        expect(number.source.length).toBeGreaterThan(0);
      }
      for (const section of category.sections) {
        for (const line of section.lines) {
          expect(line.length).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it('contoh hitung memakai tarif & kamar tenant, bukan angka umum', () => {
    const penghuni = TENANT_RULE_CATEGORIES.find((c) => c.id === 'penghuni');
    expect(penghuni?.examples?.(ctx).join(' ')).toMatch(/Kamar A1/);
    expect(penghuni?.examples?.({ ...ctx, occupantCount: 3 }).join(' ')).toMatch(/200\.000/);

    const pembayaran = TENANT_RULE_CATEGORIES.find((c) => c.id === 'pembayaran');
    expect(pembayaran?.examples?.(ctx).join(' ')).toMatch(/300\.000/);

    const prabayar = TENANT_RULE_CATEGORIES.find((c) => c.id === 'prabayar');
    expect(prabayar?.examples?.(ctx).join(' ')).toMatch(/5\.700\.000/);
  });

  it('deposit dibaca dari konteks, bukan konstanta', () => {
    const deposit = TENANT_RULE_CATEGORIES.find((c) => c.id === 'deposit');
    const roomNumber = deposit?.numbers.find((n) => n.label === 'Deposit kamar');

    expect(roomNumber?.value(ctx)).toContain('500.000');
    expect(roomNumber?.value({ ...ctx, roomDepositRupiah: 750000 })).toContain('750.000');
    expect(roomNumber?.value({ ...ctx, roomDepositRupiah: null })).toContain('mengikuti kamar pilihanmu');
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
    expect(result.highlights.join(' ')).toContain('300.000');
    expect(result.notes.hewan?.join(' ')).toContain('Tanpa hewan');
    expect(result.notes.prabayar?.join(' ')).toContain('Bulanan');
    expect(result.notes.pembayaran?.join(' ')).toContain('DP kamu');
  });

  it('jalur 2 — penghuni · bawa hewan · 3–4 orang · 6 bulan', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'penghuni', pet: 'ya', occupants: '3-4', term: 'SMESTERLY' },
      ctx,
    );

    expect(result.summary).toContain('sudah penghuni');
    expect(result.highlights.join(' ')).toContain('Deposit hewan');
    expect(result.notes.hewan?.join(' ')).toContain('Kembali penuh');
    expect(result.notes.penghuni?.join(' ')).toContain('orang tambahan');
    expect(result.notes.prabayar?.join(' ')).toContain('5.700.000');
    expect(result.notes.checkout?.join(' ')).toContain('H+1');
  });

  it('jalur 3 — calon · bawa hewan · 5–6 orang · 1 tahun', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'calon', pet: 'ya', occupants: '5-6', term: 'YEARLY' },
      ctx,
    );

    expect(result.notes.penghuni?.join(' ')).toMatch(/orang tambahan/);
    expect(result.notes.prabayar?.join(' ')).toContain('11.000.000');
  });

  it('jalur 4 — penghuni · tanpa hewan · 1–2 orang · 2 minggu', () => {
    const result = buildTenantRulesWizardResult(
      { stage: 'penghuni', pet: 'tidak', occupants: '1-2', term: 'BIWEEKLY' },
      ctx,
    );

    expect(result.notes.prabayar?.join(' ')).toContain('sudah termasuk');
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
