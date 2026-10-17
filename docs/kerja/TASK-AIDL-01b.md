# TASK-AIDL-01b — mesin kartu aturan lintas role: apa yang SUDAH ada, apa yang belum

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja + catatan goal/todos, bukan antrean)** · Status: **aktif — tiga kartu TENANT + verifikasi visual 390/1440 selesai 18 Okt 2026; sisa: tinjauan browser owner** · Untuk siapa: agen yang mengerjakan increment ini + owner yang menilai lingkupnya
> · Baca kalau: mengerjakan atau menilai `AIDL-01b`. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md) §3) atau mencari rancangan kartu lengkap (itu [product/portal-owner-admin.md](../product/portal-owner-admin.md) §10).
`AIDL-01b` adalah increment kedua dari `AIDL-01` ([ANTREAN §3](../ANTREAN.md)); `AIDL-01a` (5 field kontrak) **selesai 11 Okt 2026** — [TASK-AIDL-01a](TASK-AIDL-01a.md). Gate `AIDL-01` di ANTREAN menuntut **dua** hal, dan keduanya harus dibaca terpisah:

> "dengan AI dimatikan atau key kosong, **OWNER/ADMIN/STAFF/TENANT** tetap melihat kartu tanpa galat; tidak ada angka di luar snapshot; **tidak ada kontrak kartu paralel**" — keempat role termasuk TENANT (ditegaskan owner 11 Okt 2026 setelah sempat salah saya tulis "tiga role"). Aturan kartu TENANT **sudah diputuskan owner** (**P11**, 11 Okt 2026: pilihan (a) — tiga kartu inti, dua dibangun lebih dulu; register `KARTU-TENANT-3-INTI`), jadi langkah kartu TENANT kini **boleh dibangun** dan menjadi sisa satu-satunya increment ini.

## Goal & todos

**Goal.** Memastikan tiap role **keempatnya** (OWNER/ADMIN/STAFF/TENANT) melihat **kartu keputusan** dari jalur rule-based saat AI mati, memakai kontrak yang **sudah ada** — tanpa mesin kedua dan tanpa kontrak kedua. Untuk TENANT, aturan yang dipakai: **tiga kartu inti (P11 dijawab owner 11 Okt 2026: pilihan a)**, dibangun mulai dari dua yang datanya sudah ada.

**Temuan recon yang mengubah lingkup (11 Okt 2026, diperiksa di kode — bukan ingatan):** jalur **rule-based sudah menjadi jalur normal hari ini**, dan sudah lintas role:

| Role | Rumah aturannya | Bukti |
|---|---|---|
| OWNER | [useBusinessHealthScore.ts](../../frontend/src/hooks/useBusinessHealthScore.ts) (6 aturan: `invoice-overdue`, `payment-review`, `checkout-final`, `renew-pending`, `room-available`, `business-stable`) + [useOperationalStressIndex.ts](../../frontend/src/hooks/useOperationalStressIndex.ts) | `queueItems: ActionQueueItem[]` |
| ADMIN | [DashboardAdmin.tsx](../../frontend/src/pages/dashboard/DashboardAdmin.tsx) (8 aturan: `ktp-review`, `booking-review-sla`, `payment-review-sla`, `renew-meter-sla`, `checkout-review-sla`, `checkout-final-sla`, `invoice-overdue`, `booking-payment-waiting`) + `opsStress.queueItems` | `queueItems` dibangun dari `dedupeCommandItems([...])` |
| STAFF | `opsStress.queueItems` di [DashboardStaff.tsx](../../frontend/src/pages/dashboard/DashboardStaff.tsx) | `dedupeCommandItems([...opsStress.queueItems])` |
| TENANT | [utils/tenantDecisionQueue.ts](../../frontend/src/utils/tenantDecisionQueue.ts) (2 aturan, 17 Okt 2026: `tenant-invoice-overdue`, `tenant-renew-pending-decision`) | dipasang di `ActiveStayContent.tsx` |

**Karena itu `AIDL-01b` BUKAN "membuat mesin kartu"** — mesinnya ada (deterministik, di kode, tanpa AI). Yang benar-benar kurang hanya tiga, dan dua di antaranya tidak boleh dikerjakan pada increment ini:

1. **TENANT belum punya kartu aturan.** Ini **perilaku pengguna baru** → butuh keputusan owner (aturan mana yang layak jadi kartu untuk penghuni), bukan keputusan agen ([AGENTS §4](../../AGENTS.md)).
2. **`fallback` belum ditandai pada kartu yang ada.** Kartu hari ini memang 100% rule-based, tetapi menuliskan `fallback: true` sekarang akan menjadi **metadata bohong** (tidak ada jalur AI yang sedang dilewati). Penandaan itu masuk bersama `AIDL-03/04`, saat AI benar-benar mengisi sebagian kartu.
3. **Peta allowlist rute belum ada sebagai fungsi bersama** — dibutuhkan agar kartu **dari AI** tidak pernah `navigate` ke string bebas dari LLM ([portal-owner-admin §10.2](../product/portal-owner-admin.md) "Batas keamanan"; temuan A-1 di [audit AI 25 Sep](../audit/ai-agenda-recon-2026-09-25.md)). Ini murni teknis dan bisa dikerjakan sekarang.

**Bukti penutup — terisi 18 Okt 2026 (tiga kartu + visual).** Kartu TENANT ketiga `tenant-checkout-in-progress` (pengajuan keluar PENDING/APPROVED) ada di [utils/tenantDecisionQueue.ts](../../frontend/src/utils/tenantDecisionQueue.ts), dipasang di `ActiveStayContent.tsx`, dan `ruleId`-nya terdaftar di `decisionRoutes.ts` · **test**: `tenantDecisionQueue` 9/9 + render jsdom `tenantDecisionCards` 5/5 (tiga kartu tampil bersamaan), seluruh frontend **255/255 di 48 berkas**; backend **157/157**; build frontend **exit 0** (PWA `WhOrP64xH670`, 168 chunk) · **screenshot** (Playwright, API **mock/fixture**, tanpa DB/seed/kredensial): `/portal/stay` 390×844 dan 1440×900, dua pemicu + kartu keluar ([kartu 390](bukti-aidl-01-2026-10-18/portal-stay-triggers-390-cards-clean.png), [kartu 1440](bukti-aidl-01-2026-10-18/portal-stay-triggers-1440-cards-clean.png), [viewport 390](bukti-aidl-01-2026-10-18/portal-stay-triggers-390-viewport.png), [viewport 1440](bukti-aidl-01-2026-10-18/portal-stay-triggers-1440-viewport.png)) dan tanpa pemicu ([390](bukti-aidl-01-2026-10-18/portal-stay-clean-390-viewport.png), [1440](bukti-aidl-01-2026-10-18/portal-stay-clean-1440-viewport.png)); ringkasan/error per gambar ada di folder yang sama · **temuan visual**: (a) saklar `[Cepat|Normal]` semula tampil tanpa gaya di kiri-atas karena CSS hanya dimuat chunk lazy `/cepat` — diperbaiki dengan impor CSS di komponen saklar global; (b) setelah diperbaiki, saklar mengambang tetap bisa menutupi sebagian konten saat discroll (mis. kolom Aksi/kartu metrik) — cacat UX yang perlu diputuskan owner; (c) kartu 390 px bertumpuk (label di atas nilai) dan tinggi ±1.618 px untuk tiga item; (d) screenshot full-page menangkap elemen fixed (nav/saklar) di posisi jahitan, bukan posisi scroll tunggal. **Yang tidak dibuktikan:** tampilan dengan data DB/produksi sungguhan, interaksi klik di browser nyata, dan keputusan owner soal overlap saklar.

| # | Langkah | Status |
|---:|---|---|
| 1 | Recon: rumah aturan tiap role + apa yang benar-benar kurang | **selesai** |
| 2 | Keputusan owner: apakah TENANT dapat kartu aturan, dan aturan mana | **dapat kartu** (ditegaskan owner 11 Okt 2026) · **aturan**: tiga kartu inti, dua lebih dulu (**P11 dijawab**) |
| 3 | Fungsi allowlist rute bersama untuk kartu (khusus jalur AI) | **selesai** |
| 4 | Penandaan `fallback` sungguhan saat AI masuk (`AIDL-03/04`) | belum — sengaja ditunda |
| 5 | Build frontend + test | **selesai** — angka & tanggalnya di baris Bukti penutup (potret 18 Okt 2026) |

## 1. Tujuan & definisi selesai

**Tujuan.** Gate `AIDL-01` terpenuhi **tanpa** membuat mesin atau kontrak kedua: kartu rule-based tetap tampil untuk setiap role yang sudah punya produsen, dan setiap rute kartu — termasuk yang kelak datang dari AI — hanya boleh menuju rute yang dikenali kode.

**Definisi selesai (dapat diperiksa).**

1. Tidak ada tipe kartu kedua dan tidak ada produsen `queueItems` kedua untuk role yang sudah punya (dibuktikan dengan mencari `ActionQueueItem` dan `queueItems`).
2. Fungsi pemetaan rute ada di **satu** tempat, dengan daftar rute yang dikenali, dan **menolak** rute di luar daftar itu (tidak diam-diam meneruskan string).
3. Ada test yang membuktikan penolakan itu, termasuk contoh rute yang datang dari luar (string bebas).
4. Build frontend lulus dan jumlah test tidak turun.
5. Keputusan TENANT (kalau jadi dikerjakan) tercatat di [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) lebih dulu.

## 2. Kondisi awal + cara mengukur ulang

Diverifikasi 11 Okt 2026 di kode:

| Fakta | Bukti |
|---|---|
| Kontrak kartu tunggal | `export type ActionQueueItem` di [ActionQueueTable.tsx](../../frontend/src/components/command-center/ActionQueueTable.tsx) (5 field keputusan sudah masuk pada `AIDL-01a`) |
| Normalisasi kartu tunggal | [utils/decisionCard.ts](../../frontend/src/utils/decisionCard.ts) |
| Produsen `queueItems` per role | tabel di atas (OWNER 2 sumber, ADMIN 2 sumber, STAFF 1 sumber, TENANT 0) |
| Dedupe kartu | [utils/commandCenterDedup.ts](../../frontend/src/utils/commandCenterDedup.ts) |

**Cara mengukur ulang:** `git grep -n "queueItems" frontend/src` (harus cocok dengan tabel di atas) · `git grep -n "export type ActionQueueItem" frontend/src` (harus **satu**) · `npm run build` (cwd `frontend`).

## 3. Langkah (dari risiko terendah)

1. **Allowlist rute sebagai fungsi murni** + test: rute dikenal diteruskan, rute asing → `undefined` (bukan string mentah).
2. **Jangan** menyentuh kartu yang sudah tampil: menambah `sourceRefs`/`sebab` ke produsen lama adalah perubahan perilaku tampilan dan **tidak** diminta gate ini.
3. **TENANT** — **dapat kartu (ditegaskan owner 11 Okt 2026)**, dan **aturannya sudah diputuskan owner** (**P11** 11 Okt 2026: pilihan (a) — tiga kartu inti, dua dibangun lebih dulu; `KARTU-TENANT-3-INTI`). Langkah ini **boleh dibangun**; kodenya **belum ada**.
   Catatan teknis yang sudah terverifikasi (`git grep` di `frontend/src`): `queueItems`/`ActionQueueTable` hari ini hanya dipakai di [StaysPage](../../frontend/src/pages/stays/StaysPage.tsx), [DashboardStaff](../../frontend/src/pages/dashboard/DashboardStaff.tsx), [DashboardAdmin](../../frontend/src/pages/dashboard/DashboardAdmin.tsx), dan [AdminWorkspaces](../../frontend/src/pages/dashboard/AdminWorkspaces.tsx) — **tidak satu pun di portal penghuni** (mis. `MyStayPage.tsx`). Jadi kartu TENANT menjadi **konsumen pertama di area penghuni**, bukan perubahan pada layar yang sudah memakai kartu.
4. **`fallback`** — tunggu `AIDL-03/04`; menandainya sekarang = metadata bohong.
5. Tutup increment dengan build + test + commit, lalu perbarui baris ANTREAN bila perlu.

## 4. Jebakan nyata yang sudah terukur

- **Mesin kedua.** Godaan terbesar di sini adalah "membuat rule engine sendiri yang rapi". Mesin itu **sudah ada** di dua hook + satu halaman; menambah yang baru akan melanggar gate "tidak ada kontrak paralel" dan membuat dua sumber kebenaran kartu.
- **Rute dari LLM.** Temuan A-1: UI belum memvalidasi `route` sebelum `navigate`. Setiap rute yang berasal dari AI **wajib** lewat allowlist; jangan pernah `navigate(item.actionTo)` untuk kartu yang bisa berasal dari AI.
- **Metadata `fallback` yang bohong.** Menandai kartu rule-based sebagai `fallback: true` sebelum ada jalur AI berarti melaporkan sesuatu yang tidak terjadi — persis jenis klaim yang dilarang [batas-kejujuran](../history/batas-kejujuran.md).
- **Kartu ganda.** Produsen yang berbeda dapat menghasilkan kartu untuk entitas yang sama; dedupe memakai `dedupKey`/`ruleId`/`entityType`/`entityId` ([commandCenterDedup.ts](../../frontend/src/utils/commandCenterDedup.ts)) — jangan menambah produsen tanpa memastikan kuncinya unik.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Muncul keinginan menulis `rules/*.ts` baru | mesin lama terasa "tidak rapi" | berhenti — baca tabel §Goal; perluas aturan di rumah yang sudah ada |
| Test rute asing lulus padahal seharusnya ditolak | fungsi meneruskan string saat tidak dikenali | ubah default jadi `undefined`, lalu ulangi test |
| Owner ingin TENANT segera punya kartu | permintaan wajar, tapi menyentuh perilaku pengguna | catat sebagai keputusan owner dulu, jangan implementasi langsung |

## 6. Catatan penyimpangan

- **11 Okt 2026 — lingkup `AIDL-01b` menyempit dari rencana awal.** Rencana di [TASK-AIDL-01a](TASK-AIDL-01a.md) menyebut `AIDL-01b` sebagai "mesin kartu aturan lintas role + fallback". Setelah recon, mesinnya **terbukti sudah ada** untuk OWNER/ADMIN/STAFF; yang kurang hanya penandaan `fallback` (menunggu AI), allowlist rute, dan kartu TENANT (butuh keputusan owner). Penyimpangan ini **dicatat di sini pada sesi yang sama** sesuai aturan kontrak tugas — bukan diubah diam-diam.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-11 | Dibuat. Recon terverifikasi: 16 aturan rule-based sudah hidup lintas OWNER/ADMIN/STAFF; TENANT belum punya. Lingkup diusulkan menyempit ke allowlist rute (teknis) + keputusan owner untuk TENANT. Belum ada kode ditulis untuk increment ini. |
| 2026-10-11 | **P11 dijawab owner: (a)** — tiga kartu inti TENANT, dua dibangun lebih dulu. Sisa increment kini **satu**: kartu TENANT (allowlist rute + 24 test sudah selesai). Kode kartu TENANT **belum ditulis**; risiko kalimat tagihan terbaca "menagih" wajib ditinjau sebelum rilis. |
| 2026-10-17 | **Dua kartu TENANT dibangun.** `utils/tenantDecisionQueue.ts` (murni, tanpa API baru) + test 6 + dipasang di `ActiveStayContent.tsx`; `ruleId` terdaftar di `utils/decisionRoutes.ts`. Test frontend **201/201 di 39 berkas** (termasuk 3 test render jsdom), build **exit 0** (PWA `BCKEesTsxQ_x`). Sisa: kartu ketiga + verifikasi visual browser. **18 Okt 2026:** kartu ketiga `tenant-checkout-in-progress` dibangun + screenshot 390/1440 (mock API) — lihat baris Bukti penutup; sisa tinjauan owner. |
