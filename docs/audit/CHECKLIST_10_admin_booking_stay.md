# CHECKLIST 10 — Admin: Approve Booking + Stays + Check-in + Pindah Kamar

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C10-xx`**. **Role:** ADMIN/OWNER. **Audit-only.** DB UAT (5433).
> ⚠️ Inti siklus huni. JB-02, JB-03, JB-04, JB-07 semua relevan.

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Daftar stays | `/stays` | `pages/stays/StaysPage.tsx` | OWNER/ADMIN |
| Wizard check-in | `/stays/check-in` | `pages/stays/CheckInWizard.tsx` (+ `check-in-wizard/*`) | ADMIN/OWNER |
| Detail stay | `/stays/:id` | `pages/stays/StayDetailPage.tsx` | OWNER/ADMIN |

**Backend:** `admin/bookings` (`admin-bookings`), `stays` (`stays.service.ts`, `room-transfer.service.ts`), `auto-ops` (StaySweep). Model: `Stay`, `Room`, `RoomTransfer`, `MeterReading`.

## Konsep wajib (JB)
- **JB-03 (status kamar):** belum bayar=AVAILABLE, DP approved=RESERVED, lunas=RESERVED, check-in=OCCUPIED. RESERVED ≠ lunas.
- **JB-04:** meter awal & OCCUPIED HANYA saat check-in, bukan saat approve pembayaran.
- **JB-07:** approve satu → batalkan pesaing belum-bayar; pesaing sudah-transfer perlu jalur refund.

## Langkah audit

### A. Daftar stays `/stays`
- [ ] 1. Login ADMIN → `/stays`. Screenshot. Daftar stay + status kamar tampil? Filter/status bekerja?
- [ ] 2. **JB-03:** cek label status tiap stay. Bedakan "Reserved-DP" vs "Reserved-Lunas" — dibaca dari data pembayaran (invoice), bukan hanya status kamar. Cari stay yang salah label.
- [ ] 3. **JB-18:** tidak ada "undefined"/"Rp NaN"/"Invalid Date" di kolom.
- [ ] 4. Console + Network bersih? Request diulang berlebihan (N+1 di daftar)?

### B. Approve booking + DP (jalur uang)
- [ ] 5. Cari booking status "menunggu approval DP" (dari CHECKLIST_03). Buka. Bukti transfer DP tampil?
- [ ] 6. Approve DP → **JB-03:** kamar berubah AVAILABLE → **RESERVED** (BUKAN OCCUPIED). Verifikasi status kamar setelah approve.
- [ ] 7. **JB-04 (kritis):** setelah approve DP/pembayaran, cek stay: `initialMetersPromotedAt` HARUS masih null; kamar BUKAN OCCUPIED. Kalau approve langsung set meter/occupied → **C10-xx BLOCKER** (bertentangan Fase V).
  ```bash
  curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/api/stays/<id> | python3 -m json.tool | grep -iE "status|promoted|occup|meter"
  ```
- [ ] 8. **JB-12:** klik Approve 2× cepat → tidak dobel-approve / tidak bikin 2 pembayaran? (Jurnal dobel dicek di CHECKLIST_12.)
- [ ] 9. **JB-07 (pesaing):** pakai 2 booking kamar sama dari CHECKLIST_03. Approve salah satu → pesaing yang belum bayar otomatis dibatalkan? Pesaing yang sudah transfer → muncul di jalur refund "kalah cepat" (`/loss-refunds`)? Catat.
- [ ] 10. Reject booking → status jadi ditolak, kamar tetap AVAILABLE, DP diperlakukan sesuai aturan (hangus/refund manual)?

### C. Check-in wizard `/stays/check-in` (JB-04)
- [ ] 11. Buka wizard. Langkah: pilih tenant → pilih kamar → detail & meter → review konfirm. Semua step jalan (next/back)?
- [ ] 12. **Guard lunas:** coba check-in stay yang **belum lunas** sewa awal → harus ditolak ("wajib invoice sewa awal lunas" — Fase V). Uji.
- [ ] 13. Isi meter awal → konfirmasi check-in → **JB-04:** SEKARANG barulah `initialMetersPromotedAt` terisi & kamar → OCCUPIED. Verifikasi via API (langkah 7 command).
- [ ] 14. Meter awal negatif / kosong → ditolak?
- [ ] 15. **JB-12:** submit konfirmasi check-in 2× → tidak dobel promote?
- [ ] 16. Console/Network bersih di tiap step? Data antar-step tidak hilang saat back?

### D. Detail stay + pindah kamar `/stays/:id`
- [ ] 17. Buka detail stay. Info lengkap: tenant, kamar, tanggal, invoice, deposit, meter, riwayat?
- [ ] 18. **JB-01:** deposit tampil = `Room.defaultDepositRupiah`, refundable; DP terpisah, hangus. Tidak tertukar.
- [ ] 19. Pindah kamar (room transfer): pindahkan ke kamar lain → kamar lama jadi AVAILABLE, kamar baru RESERVED/OCCUPIED sesuai status? `RoomTransfer` tercatat? Deposit/meter ikut benar?
- [ ] 20. Pindah ke kamar yang sudah OCCUPIED → ditolak?
- [ ] 21. **JB-14:** buka `/stays/:id` sebagai STAFF/TENANT → ditolak (route OWNER/ADMIN). Uji + curl endpoint.

### E. Auto-ops (overstay) — via kode
- [ ] 22. **Kode `auto-ops.service.ts` (StaySweep):** overstay (lewat akhir sewa tanpa renew) → forced checkout / penanganan benar? Room healer memperbaiki status kamar nyasar? Baca logika, catat bila mencurigakan. Tidak ada denda (JB-05).

## HASIL TEMUAN

> **Status:** **kode SELESAI**; **live TERTUNDA** — backend jadi tak responsif saat audit (lihat C10-01). Logika inti (JB-03/JB-04/JB-01) diverifikasi via kode & solid.

### ✅ Verifikasi kode — BENAR (kuat)
- **JB-04 meter promote HANYA saat check-in:** check-in butuh **lunas** — stay dengan **DP saja belum boleh check-in** ("tunggu pelunasan", `stays.service.ts:190-196`); hanya kamar AVAILABLE/RESERVED (`:192,299`); `FOR UPDATE` lock (race-safe). `initialMetersPromotedAt` + OCCUPIED di-set di sini, bukan saat approve pembayaran.
- **JB-03 approve pembayaran → RESERVED, bukan OCCUPIED:** konsisten Fase V (approve tak promote occupancy; check-in yang mengubah ke OCCUPIED).
- **Room transfer robust (`room-transfer.service.ts`):** Stay sama dipertahankan, **deposit ikut apa adanya** (JB-01, tak ditagih ulang), harga dikunci (D-16), `FOR UPDATE` lock kamar tujuan (`:49-50`), tujuan tak boleh OCCUPIED/MAINTENANCE/INACTIVE (`:53-54`), tak boleh ada stay aktif lain di tujuan (`:56`), **utilitas kamar lama ditagih** (snapshot meter + invoice + jurnal, `:63`), kamar lama → MAINTENANCE + tiket CHECKOUT_INSPECTION, kamar baru → OCCUPIED, RoomTransfer = audit trail. Transfer hanya utk stay ACTIVE ter-promote (`:42`).
- Guard email tenant unik saat check-in (`:264-281`); KTP-verified gate (configurable, `:162`).

### C10-01 Backend tak responsif saat audit — memperkuat C05-01/C09-01 (self-DoS) — 🟠 catatan MEDIUM
- **Yang terjadi:** setelah sesi navigasi tenant (yang memicu badai retry dari loop `/portal/stay` + 503 `/tenant/bookings/my` & `/announcements/active`), **backend `localhost:3000` berhenti merespons** (fetch → "Failed to fetch"; FE `:5173` tetap 200). Tidak pulih dalam 8+ detik (bukan restart nodemon biasa).
- **Implikasi:** badai request dari bug loop (C05-01) & 503-retry (C09-01) **berpotensi menjatuhkan backend (self-DoS)** — menaikkan urgensi perbaikan bug-bug tersebut. 
- **SARAN:** restart backend (`cd backend && npm run start:dev`); prioritaskan fix loop/503 + batasi retry FE (`retry:false` + backoff, jangan refetchOnMount pada query yang error).

### ✅ LIVE CONFIRMED (batch 3 Jul)
- **`/stays` (admin) render bagus:** Command Center sidebar konsisten; stats **MASA SEWA AKTIF: 3**, **MENUNGGU PERSETUJUAN: 0**, akhir-sewa-dekat 3, pengajuan keluar 0. Console **0 error**. Tombol "Check-in Baru" ada.
- **JB-14 UI:** admin buka `/owner-dashboard` (OWNER-only) → **redirect ke `/dashboard`** (guard `RequireRoles` jalan). ✅
- **Admin dashboard:** 3/13 kamar terisi; AutoOps panel jelas "**hanya reset booking & kamar; pembayaran/perpanjangan/checkout tetap manual**" + "booking maks 3 jam" (JB-06). Overstay → tiket cleanup otomatis (I/F1/M/L) terlihat (StaySweep aktif).
- **✅ JB-03 CONFIRMED live (booking uji):** `POST /api/public/bookings` (kamar G/5) → **201 "Booking berhasil dibuat"**. Status kamar G **SEBELUM=MAINTENANCE, SESUDAH=MAINTENANCE** → **booking TIDAK mengunci/mengubah status kamar** (sesuai `stays.service` "no room UPDATE"). Booking uji auto-hangus 3 jam (JB-06, tak dibayar). Validasi DTO ketat (tolak field asing + email invalid).
- **JB-04 (meter promote di check-in):** stay booking tak muncul di `/stays` list (stay unpromoted/booking), jadi read meter live terhalang shape endpoint — **tetap terverifikasi kode** (booking tak set meter; promote hanya di check-in). Approve DP + check-in end-to-end butuh alur upload-bukti (kompleks) + kamar MAINTENANCE tak bisa check-in langsung.

### C10-02 Data seed OCCUPIED tanpa sewa lunas — kontradiksi rule check-in — 🟢 LOW/INFO (integritas data)
- **Severity:** LOW/INFO · **Kategori:** Integritas data seed / cakupan uji
- **Bukti live (cross-check DEFAULT_DATA):** tenant occupied punya invoice sewa **BELUM lunas** padahal `room.status=OCCUPIED`:
  - **Bayu (I):** OCCUPIED, deposit 300k lunas, tapi **invoice sewa 850.000 paid 0** (ISSUED).
  - **Sari (F2):** OCCUPIED, tapi **deposit paid 0**, DP 0, **invoice sewa 1.750.000 paid 0**.
- **Masalah:** melanggar rule Fase V "**check-in wajib invoice sewa awal lunas**" (`stays.service.ts:190-196`). Artinya **`seed-dev-via-api.js` menyisipkan stay OCCUPIED langsung, mem-bypass guard check-in** → data uji "occupied" **tidak** mencerminkan alur nyata (bisa menyembunyikan bug di alur check-in/pembayaran saat testing).
- **SARAN:** seed lewat alur asli (booking→bayar→check-in) ATAU owner konfirmasi guard produksi tetap menolak check-in tanpa lunas (kode-nya benar; hanya seed yang menerobos). Bukan lubang produksi (guard ada di kode), tapi rapikan seed agar uji valid.

### Live TERTUNDA (butuh backend hidup + data booking pending)
- Approve DP → verifikasi kamar RESERVED + `initialMetersPromotedAt=null` (JB-03/JB-04) via API.
- Check-in wizard (guard lunas, promote di sini), pesaing (JB-07), room transfer live, `/stays/:id`, JB-14 (STAFF/TENANT akses /stays ditolak).
- **Ulangi setelah backend di-restart** (idealnya setelah schema sync C09-01 agar endpoint stay/booking sehat).

## Definition of Done — status
- [x] JB-03/JB-04 (check-in lunas + promote di check-in) diverifikasi kode.
- [x] Room transfer (deposit carried, race-safe, utilitas settled) diverifikasi kode.
- [~] Approve DP / check-in / transfer **live**: tertunda (backend down) — C10-01.
- [x] Temuan `C10-xx`; INDEX baris 10 diupdate (partial).

## Definition of Done
- [ ] Approve DP diverifikasi: kamar→RESERVED, meter/occupied TIDAK ter-promote (JB-03/JB-04) via API.
- [ ] Check-in diverifikasi: guard lunas, meter promote hanya di sini, double-submit.
- [ ] Pesaing (JB-07) & pindah kamar diuji.
- [ ] JB-14 (STAFF/TENANT akses /stays) diuji via UI + curl.
- [ ] Temuan `C10-xx`. Update Progres Global baris 10.
