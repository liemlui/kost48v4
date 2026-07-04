/*
 * BACKFILL FASILITAS + INVENTARIS 13 kamar nyata (event-path, idempoten).
 *
 * Tujuan: melengkapi inventaris kamar agar konsisten dengan kriteria/fasilitas, sehingga
 * panel "cek konsistensi" hijau dan kamar tampil di katalog publik (kamar dengan gap
 * AC/kipas/kasur/lemari otomatis disembunyikan).
 *
 * Semua via endpoint NYATA (sesuai keputusan owner: dummy lewat jalur kejadian, bukan raw insert):
 *   - InventoryItem master (AC ½ PK, Kipas, Kasur, Lemari)  → POST /inventory-items
 *   - Inventaris kamar (RoomItem)                            → POST /inventory-movements (ASSIGN_TO_ROOM)
 *   - Fasilitas tertaut ke item gudang                       → POST/PATCH /rooms/:id/facilities (inventoryItemId)
 *   - Standar AC ½ PK (acWattage=380) semua kamar ber-AC     → PATCH /rooms/:id
 *
 * Idempoten: cek dulu sebelum membuat; aman dijalankan ulang.
 *
 * ⚠️  DB UAT saja (port 5433 kost48_v3_pro). JANGAN jalankan ke produksi (5432).
 * Pakai: node scripts/seed-facilities-inventory.js   (opsional API_BASE=http://localhost:3000/api)
 */
const API = process.env.API_BASE || 'http://localhost:3000/api';
const OWNER = { identifier: 'owner@kost48.com', password: 'Owner#2026' };

let TOKEN = '';
async function api(method, path, body, { optional = false } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const msg = `${method} ${path} → ${res.status} ${JSON.stringify(j?.message ?? j)}`;
    if (optional) { console.warn('   ⚠️  (lewati) ' + msg); return null; }
    throw new Error(msg);
  }
  return j?.data ?? j;
}
const asList = (d) => (Array.isArray(d) ? d : (d?.items ?? d?.rows ?? d?.data ?? d?.results ?? []));
// H11: toISOString() = UTC → bisa salah tanggal di WIB pagi. toLocaleDateString('en-CA') pakai timezone lokal.
const ymd = (d) => d.toLocaleDateString('en-CA');
const num = (v) => Number(v ?? 0);

// Master barang gudang yang dibutuhkan (name harus cocok dgn nameMatchers room-facility-spec).
const MASTERS = [
  { key: 'ac',     name: 'AC ½ PK',          sku: 'AC-05PK', category: 'Elektronik', unit: 'unit' },
  { key: 'kipas',  name: 'Kipas Angin',      sku: 'KIPAS',   category: 'Elektronik', unit: 'unit' },
  { key: 'kasur',  name: 'Kasur Busa Tebal', sku: 'KASUR',   category: 'Perabot',    unit: 'unit' },
  { key: 'lemari', name: 'Lemari Baju',      sku: 'LEMARI',  category: 'Perabot',    unit: 'unit' },
];
// Token pencocokan nama fasilitas lama → key master.
const FACILITY_TOKEN = { ac: ['ac'], kipas: ['kipas', 'fan'], kasur: ['kasur'], lemari: ['lemari', 'almari'] };

const summary = { itemsCreated: 0, stockToppedUp: 0, roomItemsAssigned: 0, facilitiesCreated: 0, facilitiesLinked: 0, acStandardized: 0, roomsDone: 0 };

(async () => {
  console.log('=== BACKFILL Fasilitas + Inventaris (event-path) ===\nAPI:', API);

  const login = await api('POST', '/auth/login', OWNER);
  TOKEN = login?.accessToken ?? login?.token;
  if (!TOKEN) throw new Error('Login owner gagal (token kosong).');
  console.log('✓ Login OWNER');

  // 1) Pastikan master inventory item ada (idempoten by name).
  const existingItems = asList(await api('GET', '/inventory-items?limit=300'));
  const itemByKey = {};
  for (const m of MASTERS) {
    let found = existingItems.find((it) => String(it.name ?? '').toLowerCase() === m.name.toLowerCase());
    if (!found) {
      found = await api('POST', '/inventory-items', {
        sku: m.sku, name: m.name, category: m.category, unit: m.unit,
        qtyOnHand: '100', minQty: '2', status: 'GOOD',
      });
      summary.itemsCreated++;
      console.log(`   + item gudang: ${m.name}`);
    } else if (num(found.qtyOnHand) < 30) {
      // Top-up stok agar cukup untuk assign ke banyak kamar.
      await api('POST', '/inventory-movements', {
        itemId: found.id, movementType: 'IN', qty: '100', movementDate: ymd(new Date()),
        note: 'Top-up stok backfill inventaris kamar',
      }, { optional: true });
      summary.stockToppedUp++;
    }
    itemByKey[m.key] = found;
  }
  console.log(`✓ Master item siap (${summary.itemsCreated} dibuat, ${summary.stockToppedUp} top-up)`);

  // 2) Iterasi semua kamar.
  const rooms = asList(await api('GET', '/rooms?limit=300'));
  console.log(`✓ ${rooms.length} kamar ditemukan`);

  for (const room of rooms) {
    const coolingKey = room.hasAc ? 'ac' : 'kipas';
    const neededKeys = [coolingKey, 'kasur', 'lemari'];

    // 2a) Inventaris kamar (RoomItem) via ASSIGN_TO_ROOM bila belum ada.
    const roomItems = asList(await api('GET', `/room-items?roomId=${room.id}&limit=100`, null, { optional: true }));
    const assignedItemIds = new Set(roomItems.map((ri) => Number(ri.itemId)));
    for (const key of neededKeys) {
      const master = itemByKey[key];
      if (!master) continue;
      if (assignedItemIds.has(Number(master.id))) continue;
      const r = await api('POST', '/inventory-movements', {
        itemId: master.id, movementType: 'ASSIGN_TO_ROOM', qty: '1', roomId: room.id,
        movementDate: ymd(new Date()), note: `Pasang ${master.name} ke kamar ${room.code} (backfill)`,
      }, { optional: true });
      if (r) summary.roomItemsAssigned++;
    }

    // 2b) Fasilitas tertaut ke item gudang (buat bila tak ada, link bila belum tertaut).
    const facilities = asList(await api('GET', `/rooms/${room.id}/facilities`, null, { optional: true }));
    for (const key of neededKeys) {
      const master = itemByKey[key];
      if (!master) continue;
      const tokens = FACILITY_TOKEN[key] ?? [key];
      const match = facilities.find((f) => tokens.some((t) => String(f.name ?? '').toLowerCase().includes(t)));
      if (match) {
        if (match.inventoryItemId == null) {
          const r = await api('PATCH', `/rooms/${room.id}/facilities/${match.id}`, { inventoryItemId: master.id }, { optional: true });
          if (r) summary.facilitiesLinked++;
        }
      } else {
        const r = await api('POST', `/rooms/${room.id}/facilities`, {
          name: master.name, quantity: 1, category: master.category, publicVisible: true, inventoryItemId: master.id,
        }, { optional: true });
        if (r) summary.facilitiesCreated++;
      }
    }

    // 2c) Standarkan AC ½ PK (acWattage=380) untuk kamar ber-AC.
    if (room.hasAc && num(room.acWattage) !== 380) {
      const r = await api('PATCH', `/rooms/${room.id}`, {
        monthlyRateRupiah: num(room.monthlyRateRupiah), // wajib di UpdateRoomDto
        acWattage: 380,
      }, { optional: true });
      if (r) summary.acStandardized++;
    }

    summary.roomsDone++;
  }

  console.log('\n=== RINGKASAN ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n✅ SELESAI. Cek panel "Fasilitas" tiap kamar (admin) → harus hijau, dan kamar tampil di katalog publik.');
  process.exit(0);
})().catch((e) => { console.error('\n❌ Backfill GAGAL:', e?.message ?? e); process.exit(1); });
