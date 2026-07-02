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
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Approve DP diverifikasi: kamar→RESERVED, meter/occupied TIDAK ter-promote (JB-03/JB-04) via API.
- [ ] Check-in diverifikasi: guard lunas, meter promote hanya di sini, double-submit.
- [ ] Pesaing (JB-07) & pindah kamar diuji.
- [ ] JB-14 (STAFF/TENANT akses /stays) diuji via UI + curl.
- [ ] Temuan `C10-xx`. Update Progres Global baris 10.
