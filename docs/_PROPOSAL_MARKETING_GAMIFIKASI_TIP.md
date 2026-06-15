# PROPOSAL — Marketing, Gamifikasi Tenant, Tip Staf (vision owner 2026-06-16)

Status: vision owner ditangkap; implementasi BERTAHAP. Terkait dossier `17_PUBLIK_MARKETING_UIUX`,
`19_GAMIFIKASI_LOYALITAS`, `15_STAF_TIKET_KPI`. Lihat juga `_PROPOSAL_METER_LISTRIK_AIR.md`.

## A. Tip Staf (P2P, BUKAN pendapatan kos)

Sudah ada field schema `User.tipGopay/tipOvo/tipDana/tipBank` (F4-14). Tambah: **tipShopee**.
- **Staf input sendiri** ID e-wallet (OVO/GOPAY/ShopeePay/DANA/Bank) di profil/pengaturan staf.
- **Sisi tenant** (setelah tiket selesai & ditindak staf): narasi halus — *"Kalau berkenan menyisihkan
  uang kopi untuk staf, kami tidak memaksa. Ini langsung ke akun pribadi staf."* + tampilkan ID e-wallet staf.
- **Tombol "Terima kasih"** untuk staf saat dapat tip (akui/acknowledge).
- **Narasi owner-facing & staf:** tip = rezeki dari Tuhan, di luar kendali owner; murni urusan
  pribadi tenant↔staf. TIDAK dijurnal/direkap di buku kos (kebijakan F4-14).
- **Tenant yang memberi tip → dapat poin** (lihat C).

## B. Marketing high-level (owner-editable → narasi tenant & web statis)

- **Owner bisa edit** komponen analisa bisnis di Settings: SWOT (Strength/Weakness/Opportunity/Threat)
  + PESTLE. Disimpan sebagai konten (model `BusinessNarrative`/AppSetting).
- Analisa → **narasi otomatis** dipakai di: onboarding tenant baru, web statis depan, katalog.
- **Pembanding kompetitor** (keunggulan KOST48): web app canggih, respon cepat, **book online**,
  CCTV, terdaftar Google Maps, kamar prima, **fleksibilitas hemat listrik (kipas + AC, 30kWh gratis,
  pascabayar tanpa token)**. Banyak kompetitor tak punya web / tak terdaftar maps.
- **Survey cepat ke guest** (belum jadi tenant) di sela waktu — pertanyaan singkat, hasil masuk analisa.
- Sumber referensi: www.kost48surabaya.com.

## C. Gamifikasi Tenant (semua ANONIM di sisi tenant)

- **Poin = ukuran kebaikan, bukan sekadar reward.** Tampilkan narasi itu + ringkasan:
  **total dikumpulkan · sudah ditukar · sisa**.
- **Tip dari tenant → tambah poin** (perbuatan baik).
- **Rank Top 3/Top 5 (anonim):** poin tertinggi tenant. Jika nilai sama → tampilkan >1 (nama + kamar).
  CATATAN owner: minta "nama + kamar" untuk yang masuk top — pastikan konsisten dengan "anonim";
  kemungkinan maksud: tampilkan kamar (A/B/C) tanpa identitas pribadi penuh. **Perlu konfirmasi saat build.**
- **Ranking kebersihan depan kamar** (terbersih & terkotor) per bulan, per kamar (A, B, C, ...) —
  "permainan" interaksi antar kamar, anonim. Butuh sumber data (audit kebersihan depan kamar).

## D. Gudang/Inventaris staf (kejelasan + logika stok min)

- **Filter default tidak jelas** + beda "Aman" vs "Semua barang" kurang jelas → perjelas label +
  tandai filter aktif.
- **Stok minimal otomatis untuk barang fasilitas kamar** (AC/kipas) = **jumlah kamar yang memakai**
  fasilitas itu. (mis. semua kamar punya kipas → min stok kipas = jumlah kamar).
- **Standarisasi: semua kamar punya kipas** (selain AC) → marketing hemat listrik ("pakai kipas saat
  cukup dingin"). Set di data kamar/seed + fasilitas.

## E. Konstanta meter (lengkapi `_PROPOSAL_METER_LISTRIK_AIR.md`)

- **Kuota gratis 30 kWh juga owner-settable** (sudah masuk M-1: `freeElectricityKwhPerMonth`).

## Catatan layout kecil

- `/staff-report`: posisi input bulan + tombol "Simpan/Cetak PDF" rapi di desktop; rapikan di lebar
  menengah (masuk sweep responsif).

## F. Cross-sell saat perpanjangan + kebijakan perbaikan (➜ juga konten marketing)

Saat tenant **perpanjang**, tawarkan add-on (opsional, tidak memaksa):
- **Order WiFi** sekalian.
- **Minta bantuan bersih kamar oleh staf** — *pembersihan ruang DALAM = tanggung jawab tenant*; kalau
  butuh bantuan staf, beri **tip langsung** (tampilkan kisaran "mis. Rp X–Y, bebas"). Bukan tagihan kos.

**Kebijakan perbaikan (free, masuk konten marketing — pro-tenant):**
- **GRATIS** untuk kerusakan wajar: **ganti lampu putus, kran rusak, shower rusak, kebocoran air**, dll.
- Tenant **wajib lapor segera** (lewat Laporan Saya) agar cepat ditangani.
- Narasi marketing: *"Kerusakan wajar (lampu, kran, shower, bocor) kami perbaiki GRATIS & cepat —
  cukup lapor lewat app. Kamar selalu kami jaga prima."*

## Urutan build disarankan
1. Tip staf (A) — schema field hampir lengkap, dampak cepat.
2. Gamifikasi tenant ringkas (C: poin=kebaikan + total/ditukar/sisa) — frontend dari data yang ada.
3. Gudang (D: kejelasan filter + min-stok fasilitas).
4. Rank tenant + kebersihan kamar (C lanjutan) — perlu endpoint + sumber data.
5. Marketing/SWOT/PESTLE engine (B) — paling besar.
