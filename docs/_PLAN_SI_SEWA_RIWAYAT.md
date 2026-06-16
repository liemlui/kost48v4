# PLAN SI — Integritas Data + Riwayat Sewa + Kejelasan Invoice (2026-06-16)

Seri tugas **SI** (Sewa & Integritas data). Compact, gaya MXX. Terkait dossier `11_BOOKING_RENEWAL`,
`10_PEMBAYARAN_INVOICE`, `01_GROUND_STATE`, keputusan owner `03`.

## Akar masalah (temuan owner 2026-06-16)
- **Seed lama `seed-dev-dummy.js` = raw INSERT Prisma → BYPASS aturan bisnis.** Owner: *"dummy data
  harusnya dimasukkan lewat jalur satu per satu kejadian (push ke backend), jangan by pass ke database,
  kalau asal masukkan ya kacau."* Akibat: state bisa mustahil (mis. perpanjangan dgn deadline yg tak
  nyambung ke akhir kontrak). **Prinsip baru: SEMUA dummy lewat endpoint nyata (event-path), 0 raw insert.**
- **Aturan perpanjangan (sumber: dossier 11):** DP 30% × sewa; DP wajib dibayar **≤ hari-H (=akhir
  kontrak lama, `downPaymentDueDate`)**; pelunasan **≤ H+7 dari tanggal DP** (`settlementDueDate=DP+7`).
  Periode menyambung dari akhir kontrak lama (tanpa gap/overlap). Service sudah benar; **yang kurang =
  UI tak menjelaskan basis tanggalnya** → owner lihat "lunas 16 Juni" terasa ngawang & tak nyambung.
- **Riwayat sewa tak terlihat:** UI tak menampilkan jelas *kapan mulai kos* + *riwayat perpanjang
  (periode N: X→Y)* dan tautannya ke invoice. Owner: *"kurang konek dengan invoice."*
- **Invoice tak jelas peruntukannya:** hanya nomor, bukan "buat bayar apa" (sewa/listrik/air/DP).

## Tugas (urut eksekusi)
- **SI-1 — Seeder event-path (HTTP) + wipe — ✅ SELESAI 2026-06-16:**
  2 skrip baru: `scripts/seed-dev-reset.js` (TRUNCATE semua + fondasi: user owner/admin/staf, COA,
  12 periode 2026 OPEN, kas — DEV-only guard 5433) lalu `scripts/seed-dev-via-api.js` (data bisnis
  via endpoint NYATA: login OWNER → `POST /rooms` ×20 → `POST /tenants` + portal-access → check-in
  `POST /stays` (deposit + meter awal) → **sewa auto-terbit dari check-in**, bayar via `POST
  /invoice-payments` → `POST /meter-readings/cycle`). `seed-dev-dummy.js` lama (raw insert) di-USANG-kan.
  npm: `seed:dev:reset` + `seed:dev:api`. **Terverifikasi:** 20 kamar/16 stay/19 invoice (16 sewa+3 meter,
  **0 dobel-tagih**, 12 PAID/7 ISSUED), 16 deposit HELD, **neraca saldo SEIMBANG**. Kredensial:
  `docs/_AKUN_DUMMY_DEV.md`. CATATAN: perpanjangan TIDAK diseed (direct-renew dimatikan; lihat SI-2/SI-3).
- **SI-2 — Audit + perjelas aturan perpanjangan:** pastikan tak bisa perpanjang **setelah** hari-H lewat
  (EXPIRED_PRIORITY → kamar dibuka); tampilkan eksplisit di UI: basis = akhir kontrak lama, "DP ≤ {hari-H}",
  "pelunasan ≤ {DP+7}", sisa hari. Tidak ada perubahan aturan—hanya transparansi + guard tepi.
- **SI-3 — UI riwayat sewa (timeline) — ✅ SELESAI 2026-06-16:** komponen
  `components/stays/StayHistoryTimeline.tsx` (kronologi vertikal): *Masuk kos {checkInDate} +
  deposit → Periode 1 (awal) {a→b} → Perpanjangan Periode 2 {b→c} …* (periode diturunkan dari
  invoice RENT, urut periodStart) tiap periode ber-badge peruntukan + status (Lunas/Belum/Sebagian)
  + total + **klik ke invoice**; node "Tagihan listrik/air" untuk utilitas; node "Kontrak berjalan
  s/d {plannedCheckOut}". Dipasang di detail stay backoffice (StayDetailPage, href `/invoices/:id`)
  + portal tenant (MyStayPage, href `/portal/invoices/:id`). tsc 0; verified screenshot owner+tenant.
- **SI-4 — Label peruntukan invoice — ✅ SELESAI 2026-06-16:** util `invoicePurposeLabel` +
  `invoicePurposeMeta` (badge ikon+warna) di `utils/invoiceUtility.ts` menurunkan peruntukan
  dari `InvoiceLineType` (RENT→"Sewa", ELECTRICITY→"Listrik", WATER→"Air", gabungan→"Listrik & Air"/
  "Sewa + Listrik", DP via nomor/catatan→"Uang Muka (DP)", WIFI, PENALTY→"Denda"). Badge "Tagihan
  <peruntukan>" tampil di **daftar tenant** (MyInvoicesPage), **daftar backoffice** (InvoicesPage),
  **detail backoffice** (InvoiceDetailPage), dan **detail tenant** (TenantInvoiceDetailPage, via
  `invoiceKindLabel`). Nomor invoice didemosikan jadi subteks. tsc 0; verified screenshot owner.

## Catatan teknis
- Event-path check-in = `POST /api/stays` (dipakai CheckInWizard, lewat `StaysService` → aturan jalan).
- Perpanjangan = flow renew-requests (DP→pelunasan) atau `POST /stays/:id/renew` (admin) sesuai dossier 11.
- Meter mandiri/owner = `POST /api/meter-readings/cycle` (M-2/M-3, sudah ada).
- Invoice peruntukan diturunkan dari baris (`InvoiceLineType`), bukan kolom baru → tanpa migrasi.
