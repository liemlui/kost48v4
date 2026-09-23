# Audit Lintas Scope — 29 Juli 2026 (Reasonix) — Bukti Bertanggal

> Dipindah apa adanya dari `docs/M01_MASTER.md` § Audit Lintas Scope (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922.
> Status temuan tetap seperti tertulis (29 Jul 2026); bukan status aktif. Antrean dan gate aktif: [STATUS](../STATUS.md). Ringkasan fase: [fase-lama](../arsip/fase-lama.md).

## 🆕 Audit Lintas Scope — 29 Jul 2026 (Reasonix)

> **Tujuan:** mengidentifikasi risiko cross-cutting, inkonsistensi antar scope, peluang shared module extraction, dan efisiensi kode di seluruh 8 domain yang telah di-deep-audit.

---

### A. RISIKO CROSS-SCOPE — Scope Merusak Scope Lain

#### A1. 🔴 CRITICAL — Journal Posting Best-Effort = Silent Data Loss

**Dampak:** Laporan keuangan tidak lengkap. Tidak ada recovery path otomatis.  
**Scope terdampak:** Siklus Huni → Keuangan, Operasional → Keuangan

| Pola | Lokasi | Scope Pemanggil | Dampak ke Scope Keuangan |
|---|---|---|---|
| `postInvoiceIssuedTx().catch(...)` | `tenant-bookings.service.ts:362` | Booking → Keuangan | Invoice issued tanpa jurnal piutang |
| `postInvoiceIssuedTx().catch(...)` | `stays-renewal.service.ts:196,368` | Renewal → Keuangan | 2 titik: DP + settlement |
| `postInvoiceIssuedTx().catch(...)` | `stays.service.ts:449,514,833` | Check-in/Complete → Keuangan | Deposit + sewa awal + denda |
| `postInvoiceIssuedTx().catch(...)` | `room-transfer.service.ts:256` | Transfer → Keuangan | Invoice transfer tanpa jurnal |
| `postWifiSale().catch(...)` | `wifi-sales.service.ts:44` | Operasional → Keuangan | Record WifiSale tanpa jurnal pendapatan (bukan invoice, tapi record penjualan) |
| `postDepositReceivedForStayTx()` try/catch | `payment-submissions.service.ts:904` | Keuangan → Keuangan | Deposit diterima tanpa jurnal liabilitas |
| `recordDepositReceivedTx()` try/catch | `payment-submissions.service.ts:898` | Keuangan → Keuangan | Deposit ledger bolong — PALING KRITIS |

**Root cause:** Module `expenses.service.ts:107` (`confirmExpense`) menggunakan pola BLOCKING yang benar (throw jika gagal), tapi `create()` expense sendiri (line 72) juga best-effort. **Tidak ada 1 modul pun yang 100% blocking** — semua modul punya minimal 1 titik best-effort journal.

**Perbaikan:** AN-03 harus diperluas — bukan hanya 15 call site `postBalancedJournalTx`, tapi **semua 20+ call site journal/invoice posting** harus seragam BLOCKING.

#### A2. 🟠 HIGH — Timezone Inconsistency = Data Salah Lintas Scope

**Dampak:** Laporan keuangan, SLA tiket, dan kalender ketersediaan bisa bergeser 7 jam (UTC vs WIB).  
**Scope terdampak:** Semua scope yang menggunakan `new Date()`.

| File | Pola | Masalah |
|---|---|---|
| `owner-ai.service.ts:126,144,168` | `new Date().setHours(0,0,0,0)` | **Timezone-dependent** — `setHours()` pakai TZ lokal proses Node. Jika `TZ=UTC` → reset jam 7 pagi WIB (bug). Jika `TZ=Asia/Jakarta` → benar. Tidak eksplisit. Plus bug: bucket reset bisa terlambat 1 hari. |
| `staff-performance.service.ts:6,21` | `Date.now() + WIB_OFFSET_MS` | Raw offset — tidak menggunakan shared util |
| `accounting-period-close.service.ts:51` | `previousUtcMonth(now = new Date())` | Tidak dinormalisasi ke WIB |
| ✅ `stays.service.ts:697,726,936` | `startOfJakartaBusinessDay()` | BENAR — contoh rujukan |

**Root cause:** Dua util WIB sudah ada (`date.util.ts:30` + `date-only.ts:22`) tapi tidak dipakai seragam.

#### A3. 🟡 MEDIUM — Audit Log di Luar Transaction = Trail Tidak Atomik

**Dampak:** Audit trail hilang jika proses crash antara tx commit dan audit log write.  
**Pattern benar:** `stays.service.ts` — audit log di DALAM `$transaction` (atomic dengan bisnis write)  
**Pattern salah:** `payment-submissions.service.ts:1071` — audit log di LUAR tx (fire-and-forget)

### B. PENGIRIMAN DATA TIDAK MASUK AKAL

#### B1. PIN Header vs JWT — Dual Auth untuk Operasi Owner

- `public-availability.controller.ts` — PUT setup ketersediaan via `X-Availability-Pin` header
- `owner-ai.controller.ts` — operasi AI owner via JWT + `@Roles(OWNER)`
- Keduanya = operasi owner-level, tapi mekanisme auth BERBEDA

**Risiko:** PIN bocor = attacker bisa ubah ketersediaan publik tanpa JWT. Sementara operasi AI yang lebih sensitif (data keuangan) dilindungi JWT penuh. Hirarki proteksi tidak konsisten.

#### B2. Notifikasi `.catch(() => undefined)` vs `.catch(logger.error)` — Silent vs Logged

| Pattern | Count | Contoh |
|---|---|---|
| `.catch(() => undefined)` | ~8 titik | `peer-report.service.ts:48,73`, `tickets.service.ts:992` |
| `.catch(logger.warn)` | ~12 titik | `auto-ops/sweeps`, `announcements.service.ts` |
| `.catch(logger.error)` | ~5 titik | `auth.service.ts:324`, `announcements.service.ts:120` |

**Tidak ada standar logging level untuk kegagalan notifikasi.**

### C. MODUL BERSAMA — Extraction Candidates

#### C1. 🔴 PRIORITAS — `assertOwnerOrAdmin` (4 DUPLIKAT SEMANTIK)

| File:Line | Pesan Error |
|---|---|
| `inventory-items.service.ts:137` | "Staff hanya boleh melihat data stok..." |
| `inventory-movements.service.ts:107` | "Staff hanya boleh melihat riwayat stok..." |
| `room-items.service.ts:64` | "Staff hanya boleh melihat inventaris kamar..." |
| `rooms.service.ts:558` | "Staff hanya boleh melihat data kamar..." |

**🆕 KOREKSI Codex Sol:** Bukan 4 salinan byte-identik — pesan error BEDA per konteks. Tapi logika role SAMA: `![OWNER,ADMIN].includes(actor.role)`. Duplikasi semantik, tetap layak diekstrak dengan parameter pesan.  
**Usulan:** Extract ke `common/guards/owner-admin.guard.ts` — 1 definisi, 4 pemakaian. Hemat ~30 baris duplikat.

#### C2. 🟠 PRIORITAS — Journal Posting Wrapper

Semua call site `postInvoiceIssuedTx().catch(...)` harus diganti dengan wrapper BLOCKING:
```typescript
// common/utils/journal-posting.util.ts
async function postJournalBlocking(postingFn, ...args) {
  const result = await postingFn(...args);
  if (!result?.posted) throw new ConflictException('Gagal mencatat jurnal — transaksi dibatalkan');
  return result;
}
```
**Hemat:** 9+ blok `.catch()` dihapus, konsistensi terjamin.

#### C3. 🟡 PRIORITAS — `notifySafe()` Fire-and-Forget Utility

Tidak ada wrapper notifikasi terpusat. Setiap modul menulis `.catch()` manual. Usulan:
```typescript
// common/utils/notification.util.ts
function notifySafe(notificationService, params) {
  void notificationService.createOnce(params).catch((err) => {
    Logger.warn(`Notifikasi gagal: ${params.entityType}#${params.entityId}`, err);
  });
}
```
**Hemat:** ~15 blok `.catch()` manual diganti 1 pemanggilan.

#### C4. 🟡 PRIORITAS — Pagination + `$transaction` Boilerplate

Pattern berikut muncul 20+ kali:
```typescript
const { page, limit, skip, take } = buildPagination(query.page, query.limit);
const [items, totalItems] = await this.prisma.$transaction([
  this.prisma.X.findMany({ where, skip, take, orderBy: ... }),
  this.prisma.X.count({ where }),
]);
return { items, meta: buildMeta(page, limit, totalItems) };
```
**Usulan:** `paginatedQuery(prisma, model, where, query)` — 5 baris → 1 baris.

#### C5. 🟢 LOW — Dead Code: `IotRetiredStreamController`

`iot-retired-stream.controller.ts` — 15 baris, selalu return 204. Kompatibilitas PWA lama. Bisa dihapus setelah konfirmasi tidak ada PWA client yang masih connect.

### D. EFISIENSI KODE — Competitive Programming Perspective

#### D1. 🔴 N+1 Query — Notifikasi per Admin dalam Loop

```typescript
// peer-report.service.ts:44-49
const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'OWNER'] } } });
for (const admin of admins) {
  await this.appNotification.createOnce({ recipientUserId: admin.id, ... }).catch(() => undefined);
}
```
**Masalah:** 1 admin = 1 query. 3 admin = 3 query. **Saran:** `createMany` batch insert.

#### D2. 🟠 `process.env` Evaluasi Runtime Berulang

- `auto-ops.constants.ts` — 17 `process.env.X ?? default` dievaluasi setiap import
- `owner-ai.service.ts` — ~25 akses langsung
- `accounting-sweep.service.ts` — 16 akses dengan duplikasi fallback logic

**Masalah:** Tidak ada caching, tidak ada validasi saat startup. Env yang salah baru ketahuan saat runtime.  
**Saran:** `AppConfigService` dengan validasi startup + caching.

#### D3. 🟡 DeepSeek Client — Tanpa Request Deduplication

`deepseek.client.ts` tidak punya deduplication. Dua klik cepat dari owner → 2 request identik ke DeepSeek → 2× biaya API.  
**Saran:** In-memory dedup key (hash input + ttl 30 detik) sebelum kirim request.

#### D4. 🟡 `marketing-public-rooms.service.ts` — 1112 Baris, Tanpa Cache

Katalog kamar publik (endpoint paling sering diakses) tidak punya cache layer. Setiap request = query ulang ke DB. Padahal data kamar jarang berubah.  
**Saran:** In-memory cache TTL 60 detik untuk `getPublicRooms()` dan `getPublicSocialProof()`.

#### D5. 🟢 `owner-ai.service.ts` — 1418 Baris Monolith

Service terbesar di seluruh codebase. Bisa di-split menjadi: `ai-brief.service.ts`, `ai-finance.service.ts`, `ai-payment-review.service.ts`, `ai-ops.service.ts`.

### E. MATRIKS DEPENDENSI CROSS-SCOPE

| Scope Hulu ↓ / Hilir → | Siklus Huni | Keuangan | Operasional | Publik | IoT |
|---|---|---|---|---|---|
| **Siklus Huni** | — | ✅ Invoice + Journal | ✅ Ticket checkout | ✅ Room status | ❌ |
| **Keuangan** | ❌ | — | ❌ | ❌ | ❌ |
| **Operasional** | ❌ | ✅ Wifi journal | — | ❌ | ❌ |
| **Publik** | ❌ | ❌ | ❌ | — | ❌ |
| **IoT** | ❌ | ❌ | ❌ | ❌ | — |

**Observasi:** Scope Keuangan adalah **sink** — semua scope mengirim data ke keuangan (invoice, journal, wifi sale), tapi keuangan tidak mengirim ke scope lain. Ini berarti setiap best-effort di scope hulu = data loss di keuangan. **Keuangan harus jadi scope paling ketat, bukan paling longgar.**

### F. REKOMENDASI PRIORITAS

| # | Rekomendasi | Impact | Effort |
|---|---|---|---|
| **X1** | Seragamkan SEMUA journal posting → BLOCKING (perluas AN-03 ke 20+ call site) | 🔴 Mencegah silent data loss di 7 scope | 3-4 jam |
| **X2** | Extract `assertOwnerOrAdmin` ke shared guard | 🟠 Hapus 4 duplikat, konsisten | 30 menit |
| **X3** | Buat `AppConfigService` — validasi env startup + cache | 🟠 Cegah runtime error, hemat evaluasi | 2 jam |
| **X4** | Fix timezone di `owner-ai.service.ts` — pakai `startOfJakartaBusinessDay` | 🟠 Cegah data AI salah hari | 15 menit |
| **X5** | Buat `notifySafe()` wrapper + batch notifikasi admin | 🟡 Standarisasi, hemat N query | 1 jam |
| **X6** | Buat `paginatedQuery()` utility | 🟡 Hemat boilerplate 20+ modul | 1 jam |
| **X7** | Cache katalog publik (TTL 60s) | 🟡 Perf utama (endpoint terpopuler) | 1 jam |
| **X8** | DeepSeek request deduplication | 🟡 Hemat biaya API | 30 menit |
| **X9** | Split `owner-ai.service.ts` (1418→4 file) | 🟢 Maintainability | 2 jam |
| **X10** | Hapus `IotRetiredStreamController` | 🟢 Dead code removal | 5 menit |

### G. RISK RATING LINTAS SCOPE

| Kategori | Rating | Detail |
|---|---|---|
| Journal consistency | 🔴 **CRITICAL** | 7 scope mengirim data ke keuangan via best-effort |
| Timezone consistency | 🟠 **HIGH** | 3 file pakai UTC, bukan WIB |
| Auth consistency | 🟡 **MEDIUM** | PIN vs JWT untuk operasi owner |
| DRY violations | 🟠 **HIGH** | 4 duplikat assertOwnerOrAdmin, 20+ boilerplate pagination |
| Performance | 🟡 **MEDIUM** | Tanpa cache publik, N+1 notifikasi, env runtime |
| **Overall** | 🟠 **HIGH** — prioritas X1-X4 harus dikerjakan sebelum go-live |
