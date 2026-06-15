# DESAIN OPERASIONAL — Review/Pengawas, Overstay, KTP, Expense Rutin, SLA Tiket
**Tanggal:** 2026-06-13 · Sumber: keputusan N1-N4, O1-O4, P1-P4, Q1-Q4 (`04_KEPUTUSAN_OWNER.md` Bagian 8). Deliverable desain untuk F2-18, F3-14/15/16/17/18/19/20.

---

## A. MODEL TENANT-SEBAGAI-PENGAWAS (review system) — F2-18 + F3-20
**Prinsip:** tenant = mata owner atas kualitas staf. Owner tidak mengawasi langsung; menindak staf berdasar nilai tenant.

### Aturan
- **Kapan menilai (N1 — keduanya):** (a) **per-tiket** — begitu staf tutup tiket keluhan tenant → auto-notif ajakan menilai (kualitas pekerjaan); (b) **bulanan** — survei kepuasan umum.
- **Cakupan (N4):** staf + **fasilitas/kamar** + **respons admin** (lebih luas dari tenant→staff yang ada sekarang).
- **Anti-abuse (N2):** rating **≤2 wajib alasan** (sudah ada) **+ masuk status PENDING_VERIFICATION** — admin/owner tinjau dulu; bila tidak adil, owner **anulir** agar tidak merusak skor staf. Rating ≥3 langsung berdampak.
- **Eskalasi ke owner (N3 — keduanya):** nilai buruk (≤2) → **notif langsung owner** + tetap masuk **rekap bulanan** kinerja staf.

### Perubahan kode
- Longgarkan `tickets.close`: STAF boleh tutup tiket (termasuk CHECKOUT_INSPECTION → kamar siap, guard keselamatan tetap) — F2-18.
- Trigger auto-prompt review saat tiket tenant ditutup (F3-20): notif + `TenantStaffReviewPrompt`.
- `StaffReview.status` tambah `PENDING_VERIFICATION` → skor staf hanya kena setelah owner verifikasi (untuk ≤2). Owner bisa VOID review tidak adil.
- Perluas objek review: tambah kategori (STAFF / FACILITY / ADMIN) pada StaffReview atau model review baru.
- Notif owner saat review ≤2; panel rekap bulanan kinerja staf (dashboard owner K-d #4).

### Implikasi
- Menjawab **K-3** (reinforcement loop): review tenant terverifikasi = konsekuensi resmi.
- Melindungi staf (1 orang) dari nilai tidak adil → keadilan (Equity).

---

## B. OVERSTAY, TENANT KABUR, BARANG DITINGGAL — F3-14/15/16
### Tenant kabur (F3-14)
- **Pemicu (O1):** tenant **menunggak X hari DAN tidak bisa dihubungi** → admin boleh tandai "kabur" (X = konfigurasi owner, mis. 7 hari). Wajib catatan alasan + AuditLog.
- **Aksi:** stay → COMPLETED/CANCELLED dini + settlement deposit (potong tunggakan) + kamar MAINTENANCE + tiket inspeksi + barang masuk pelacakan abandoned.

### Forced checkout overstay nunggak (F3-16)
- Admin **boleh paksa checkout** meski nunggak (B4) → checkout + **potong sisa tagihan dari deposit**.
- **Deposit tidak cukup (O3):** sisa kekurangan **jadi PIUTANG** tenant (AR 1100) — bukan write-off. Jurnal: deposit (2000) menutup sebagian, sisa tagihan tetap AR atas tenant. Owner bisa putuskan kejar/hapus nanti.
- **Notif overstay (O4):** tenant (peringatan keras "akan di-checkout paksa") + admin/owner alert.

### Barang ditinggal (F3-15)
- Pasca forced checkout: catat `belongingsDeadline = checkout + 30 hari` (B3).
- Lewat 30 hari → status **ABANDONED** + notif owner. **Tindakan fisik (lelang/buang/sumbang) manual** (O2) — sistem tidak mengeksekusi.

---

## C. VERIFIKASI KTP & ONBOARDING — F3-17
- **Kapan (P1):** upload KTP **saat check-in / sebelum aktivasi kamar**. Booking & DP boleh jalan dulu (tidak menghambat minat awal).
- **Gate (P2):** kamar **TIDAK menjadi OCCUPIED** sampai KTP **diverifikasi admin**. Pelunasan boleh masuk, aktivasi tertahan tanpa KTP verified.
- **Penyimpanan (P3):** file KTP **terproteksi Bearer-scoped** (pola bukti bayar: `private, no-store`, magic-byte, rename CSPRNG), **hanya admin/owner**, **dihapus saat tenant checkout permanen**. Patuh UU PDP.
- **Data (P4):** **cukup FOTO KTP** — admin verifikasi visual. TIDAK menyimpan NIK/alamat (minimal data, paling aman UU PDP).
- Onboarding wajib: **nama + HP + KTP** (K-a); data lain via quest gamifikasi (F4-9).

---

## D. EXPENSE RUTIN AUTO-GENERATE — F3-18
- **Kategori (Q1):** Gaji (SALARY), Listrik (ELECTRICITY), Air (WATER), Internet (INTERNET), Sewa gedung (RENT_BUILDING), **iuran kampung/pajak/retribusi (TAX 6400)**, dan lainnya. Semua sudah ada di enum ExpenseCategory.
- **Bentuk (Q2):** tiap awal bulan sistem buat **DRAFT** (nominal = bulan lalu untuk yang tetap, atau kosong untuk variabel) → admin **konfirmasi/isi** sebelum tercatat & terjurnal. TIDAK auto-POSTED (hindari angka salah masuk buku).
- Job baru (auto-ops / scheduler bulanan) membuat draft; jurnal hanya saat admin konfirmasi (pakai `postExpense` yang ada).

---

## E. SLA TIKET + ESKALASI — F3-19
- **Tenggat (Q3):** Darurat **24 jam** · Perbaikan **3 hari** · Biasa **7 hari**. Tenggat berbasis kategori (pemetaan kategori→tingkat di konfigurasi).
- **Eskalasi (Q4 — bertingkat):** lewat tenggat → **notif staf**; lewat lebih lama → **alert admin**; berikutnya → **alert owner**. Tekanan bertahap (konsisten model: owner ujung tindak).
- Implementasi: field `dueAt` per tiket (dihitung dari kategori saat create) + job pengecek SLA (auto-ops) yang kirim notif bertingkat + tandai tiket "TERLAMBAT" (merah) di UI.

---

## Ringkasan task & schema additive
| Task | Schema/field baru | Catatan |
|---|---|---|
| F2-18 review model | `StaffReview.status` += PENDING_VERIFICATION; kategori review (STAFF/FACILITY/ADMIN) | longgarkan ticket close ke staf |
| F3-20 prompt review | — (pakai notif + komponen FE ada) | trigger saat tiket tenant tutup |
| F3-14 tenant kabur | `Stay.fledMarkedAt`, reason; konfig X hari | admin action + audit |
| F3-15 barang abandoned | `Stay.belongingsDeadline`, status ABANDONED | 30 hari, tindakan fisik manual |
| F3-16 paksa checkout nunggak | jurnal AR sisa (piutang) | deposit kurang → piutang |
| F3-17 KTP | `Tenant.ktpFileKey`, `ktpVerifiedAt`, `ktpVerifiedById` | foto saja, gate aktivasi, hapus saat keluar |
| F3-18 expense rutin | konfig daftar expense rutin + nominal terakhir | draft bulanan, konfirmasi admin |
| F3-19 SLA tiket | `Ticket.dueAt` + tingkat SLA per kategori | job eskalasi bertingkat |

**Prasyarat umum:** Fase 1 (uang/laporan benar) selesai dulu. Schema additive perlu owner-approve. Semua selaras keputusan owner 2026-06-13.
