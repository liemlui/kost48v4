'use strict';
/**
 * Unit test: Room status guard — facility spec & gap computation
 * Cakupan: room-facility-spec.ts (getRoomBathroomKind, getRoomSizeLabel,
 *   getRoomMaxOccupants, expectedFacilities, computeFacilityGap)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 * Catatan: room-code.helper.ts sudah di-cover oleh room-code.helper.test.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const RFS = require('../../dist/modules/rooms/room-facility-spec.js');

// ════════════════════════════════════════════════════════════════════════════
// 1. getRoomBathroomKind
// ════════════════════════════════════════════════════════════════════════════

test('RG-T01: getRoomBathroomKind — ECONOMY → outside', () => {
  assert.strictEqual(RFS.getRoomBathroomKind('ECONOMY'), 'outside');
});

test('RG-T02: getRoomBathroomKind — STANDARD → inside', () => {
  assert.strictEqual(RFS.getRoomBathroomKind('STANDARD'), 'inside');
});

test('RG-T03: getRoomBathroomKind — DELUXE → inside', () => {
  assert.strictEqual(RFS.getRoomBathroomKind('DELUXE'), 'inside');
});

test('RG-T04: getRoomBathroomKind — null/undefined/case-insensitive → inside untuk non-ECONOMY', () => {
  assert.strictEqual(RFS.getRoomBathroomKind(null), 'inside');
  assert.strictEqual(RFS.getRoomBathroomKind(undefined), 'inside');
  // lowercase juga dikenali karena toUpperCase()
  assert.strictEqual(RFS.getRoomBathroomKind('economy'), 'outside');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. getRoomSizeLabel
// ════════════════════════════════════════════════════════════════════════════

test('RG-T05: getRoomSizeLabel — LARGE → ukuran besar', () => {
  const label = RFS.getRoomSizeLabel('LARGE');
  assert.ok(label.includes('besar'));
});

test('RG-T06: getRoomSizeLabel — STANDARD/null → ukuran standar', () => {
  const label1 = RFS.getRoomSizeLabel('STANDARD');
  const label2 = RFS.getRoomSizeLabel(null);
  assert.ok(label1.includes('standar'));
  assert.ok(label2.includes('standar'));
});

// ════════════════════════════════════════════════════════════════════════════
// 3. getRoomMaxOccupants
// ════════════════════════════════════════════════════════════════════════════

test('RG-T07: getRoomMaxOccupants — LARGE → 4', () => {
  assert.strictEqual(RFS.getRoomMaxOccupants('LARGE'), 4);
});

test('RG-T08: getRoomMaxOccupants — STANDARD/null → 2', () => {
  assert.strictEqual(RFS.getRoomMaxOccupants('STANDARD'), 2);
  assert.strictEqual(RFS.getRoomMaxOccupants(null), 2);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. expectedFacilities
// ════════════════════════════════════════════════════════════════════════════

test('RG-T09: expectedFacilities — STANDARD dg AC → ada AC, Kipas TIDAK ada', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: true });
  const ac = result.find((f) => f.key === 'ac');
  const kipas = result.find((f) => f.key === 'kipas');
  assert.ok(ac, 'AC harus ada');
  assert.strictEqual(ac.kind, 'INVENTORY_BACKED');
  assert.strictEqual(ac.critical, true);
  assert.strictEqual(kipas, undefined, 'Kipas tidak boleh ada jika hasAc=true');
});

test('RG-T10: expectedFacilities — STANDARD tanpa AC → Kipas, bukan AC, tanpa critical flag', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: false });
  const ac = result.find((f) => f.key === 'ac');
  const kipas = result.find((f) => f.key === 'kipas');
  assert.strictEqual(ac, undefined, 'AC tidak boleh ada jika hasAc=false');
  assert.ok(kipas, 'Kipas harus ada');
  assert.strictEqual(kipas.kind, 'INVENTORY_BACKED');
  assert.strictEqual(kipas.critical, undefined, 'Kipas tidak punya flag critical (default undefined)');
});

test('RG-T11: expectedFacilities — semua kamar punya kasur + lemari', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: true });
  const kasur = result.find((f) => f.key === 'kasur');
  const lemari = result.find((f) => f.key === 'lemari');
  assert.ok(kasur);
  assert.ok(lemari);
  assert.strictEqual(kasur.kind, 'INVENTORY_BACKED');
  assert.strictEqual(lemari.kind, 'INVENTORY_BACKED');
});

test('RG-T12: expectedFacilities — ECONOMY → kamar mandi luar', () => {
  const result = RFS.expectedFacilities({ category: 'ECONOMY', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: false });
  const km = result.find((f) => f.key === 'kamar-mandi');
  assert.ok(km);
  assert.strictEqual(km.kind, 'STRUCTURAL');
  assert.ok(km.label.includes('luar'));
});

test('RG-T13: expectedFacilities — DELUXE → kamar mandi dalam', () => {
  const result = RFS.expectedFacilities({ category: 'DELUXE', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: true });
  const km = result.find((f) => f.key === 'kamar-mandi');
  assert.ok(km.label.includes('dalam'));
});

test('RG-T14: expectedFacilities — MEZZANINE → ada fasilitas mezzanine', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'MEZZANINE', roomSize: 'STANDARD', hasAc: true });
  const mezz = result.find((f) => f.key === 'mezzanine');
  assert.ok(mezz, 'Mezzanine harus ada untuk MEZZANINE type');
  assert.strictEqual(mezz.kind, 'STRUCTURAL');
});

test('RG-T15: expectedFacilities — REGULAR → tidak ada mezzanine', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: true });
  const mezz = result.find((f) => f.key === 'mezzanine');
  assert.strictEqual(mezz, undefined);
});

test('RG-T16: expectedFacilities — LARGE → ukuran besar', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'LARGE', hasAc: true });
  const ukuran = result.find((f) => f.key === 'ukuran');
  assert.ok(ukuran);
  assert.ok(ukuran.label.includes('besar'));
  assert.strictEqual(ukuran.kind, 'STRUCTURAL');
});

test('RG-T17: expectedFacilities — STANDARD roomSize → ukuran standar', () => {
  const result = RFS.expectedFacilities({ category: 'STANDARD', roomType: 'REGULAR', roomSize: 'STANDARD', hasAc: true });
  const ukuran = result.find((f) => f.key === 'ukuran');
  assert.ok(ukuran.label.includes('standar'));
});

// ════════════════════════════════════════════════════════════════════════════
// 5. computeFacilityGap
// ════════════════════════════════════════════════════════════════════════════

test('RG-T18: computeFacilityGap — semua terpenuhi → hasGap=false, acGap=false', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [
      { id: 1, status: 'GOOD', item: { name: 'AC Panasonic ½ PK' } },
      { id: 2, status: 'GOOD', item: { name: 'Kasur Spring Bed' } },
      { id: 3, status: 'GOOD', item: { name: 'Lemari Baju 3 pintu' } },
    ],
  };
  const result = RFS.computeFacilityGap(room);
  assert.strictEqual(result.hasGap, false);
  assert.strictEqual(result.acGap, false);
  const acItem = result.items.find((i) => i.key === 'ac');
  assert.strictEqual(acItem.status, 'OK');
});

test('RG-T19: computeFacilityGap — AC MISSING → acGap=true, hasGap=true', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [
      { id: 2, status: 'GOOD', item: { name: 'Kasur Spring Bed' } },
    ],
    facilities: [],
  };
  const result = RFS.computeFacilityGap(room);
  assert.strictEqual(result.hasGap, true);
  assert.strictEqual(result.acGap, true);
  const acItem = result.items.find((i) => i.key === 'ac');
  assert.strictEqual(acItem.status, 'MISSING');
});

test('RG-T20: computeFacilityGap — AC ada tapi rusak → PRESENT_PROBLEM', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [
      { id: 1, status: 'DAMAGED', item: { name: 'AC Panasonic ½ PK' } },
      { id: 2, status: 'GOOD', item: { name: 'Kasur Spring Bed' } },
      { id: 3, status: 'GOOD', item: { name: 'Lemari Baju 3 pintu' } },
    ],
  };
  const result = RFS.computeFacilityGap(room);
  const acItem = result.items.find((i) => i.key === 'ac');
  assert.strictEqual(acItem.status, 'PRESENT_PROBLEM');
  assert.strictEqual(result.hasGap, false); // tidak MISSING, hanya rusak
  assert.strictEqual(result.acGap, false);
});

test('RG-T21: computeFacilityGap — kamar punya facility link tapi tanpa item → UNLINKED', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [],
    facilities: [{ inventoryItemId: 10 }, { inventoryItemId: 20 }],
  };
  const result = RFS.computeFacilityGap(room);
  const acItem = result.items.find((i) => i.key === 'ac');
  assert.strictEqual(acItem.status, 'UNLINKED');
  assert.strictEqual(result.hasGap, true);
  assert.strictEqual(result.acGap, true);
});

test('RG-T22: computeFacilityGap — tanpa AC → acGap=false meski tak ada kipas (inventaris)', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: false, // tanpa AC → expected punya Kipas
    roomItems: [],
    facilities: [],
  };
  const result = RFS.computeFacilityGap(room);
  // hasGap = true karena kipas MISSING
  assert.strictEqual(result.hasGap, true);
  // acGap hanya true jika hasAc=true DAN AC-nya missing
  assert.strictEqual(result.acGap, false, 'acGap=false karena hasAc=false');
  const kipasItem = result.items.find((i) => i.key === 'kipas');
  assert.strictEqual(kipasItem.status, 'MISSING');
});

test('RG-T23: computeFacilityGap — ECONOMY tanpa AC → tidak punya kipas → gap=true', () => {
  const room = {
    category: 'ECONOMY',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: false,
    roomItems: [],
    facilities: [],
  };
  const result = RFS.computeFacilityGap(room);
  // ECONOMY → kamar mandi luar (STRUCTURAL → OK)
  const km = result.items.find((i) => i.key === 'kamar-mandi');
  assert.strictEqual(km.status, 'OK');
  assert.strictEqual(km.label.includes('luar'), true);
});

test('RG-T24: computeFacilityGap — name matching case-insensitive', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [
      { id: 1, status: 'GOOD', item: { name: 'air conditioner' } }, // "air cond" match
      { id: 2, status: 'GOOD', item: { name: 'spring bed 120cm' } }, // "bed" match
      { id: 3, status: 'GOOD', item: { name: 'almari plastik' } }, // "almari" match
    ],
  };
  const result = RFS.computeFacilityGap(room);
  assert.strictEqual(result.hasGap, false);
  assert.strictEqual(result.acGap, false);
});

test('RG-T25: computeFacilityGap — item tanpa nama → tidak match', () => {
  const room = {
    category: 'STANDARD',
    roomType: 'REGULAR',
    roomSize: 'STANDARD',
    hasAc: true,
    roomItems: [
      { id: 1, status: 'GOOD', item: { name: null } },
    ],
  };
  const result = RFS.computeFacilityGap(room);
  // AC tidak match → MISSING
  const acItem = result.items.find((i) => i.key === 'ac');
  assert.strictEqual(acItem.status, 'MISSING');
});
