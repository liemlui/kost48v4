# Aturan penghuni KOST48 — ringkasan 1 halaman untuk owner

> **Blok baca** · Jenis: **ringkasan keputusan (tanda tangan owner)** · Status: **menunggu tanda tangan — potret 2026-10-21** · Untuk siapa: owner KOST48
> · Baca kalau: memutuskan apakah aturan yang dibaca penghuni sudah benar dan boleh diumumkan. · **Jangan** dibaca kalau: mencari status antrean (itu [ANTREAN](../ANTREAN.md)) atau rincian teknis (itu [TASK-AKTIF](TASK-AKTIF.md#d4f-faq)).

Sumber tunggal konten: `frontend/src/data/tenantRules.ts` — dipakai halaman **Panduan tenant** dan **wizard 4 pertanyaan**. Tidak ada teks aturan yang ditulis ulang di halaman lain; kolom sumber di bawah adalah tempat angka itu berasal.

## 1. Delapan aturan yang dibaca penghuni

| Kategori | Yang dibaca penghuni | Angka yang tampil | Sumber kanonik |
|---|---|---|---|
| 🐾 Hewan | Diizinkan dengan pemberitahuan; deposit terpisah, refundable | Deposit hewan dari Pengaturan (default Rp100.000) | `backend/src/modules/tenant-bookings/booking-charges.helper.ts` · `settings.service.ts` |
| 👥 Jumlah penghuni | Batas gratis per ukuran kamar + surcharge kepala ekstra | STANDARD 2 gratis / 4 maks · LARGE 4 gratis / 6 maks · +20% per kepala · bulat Rp5.000 | `pricing.helper.ts` · [keuangan §8](../domain/keuangan.md#d4c-harga) |
| 📆 Prabayar | Bayar di muka; harga bulanan dikunci; diskon term panjang | 2 minggu 0,75× · 6 bulan 5,7× · 1 tahun 11× · rentang 1–24 bulan · bulat Rp5.000 | `pricing.helper.ts` · keuangan §2/§10 |
| 💳 Pembayaran & DP | DP mengunci kamar; pelunasan sekali bayar; bukti transfer manual | DP 30% tarif periode · pelunasan sisa + deposit · jatuh tempo 24 jam · booking 3 jam | keuangan §7 · `auto-ops.constants.ts` |
| 🔒 Deposit jaminan | Dana titip per kamar (+ hewan), refundable, menutup tagihan terbuka | Nominal dari data kamar (bukan konstanta) + deposit hewan | [keuangan §7](../domain/keuangan.md#d4c-harga) · `stays.service.ts` `processDeposit` |
| ⏰ Overstay | Kamar dilepas di hari-H, checkout paksa H+1 | Pengingat H-10/H-7/H-3/H-1/H-day · kamar 12.00 WIB hari-H · paksa 12.00 WIB H+1 · barang 30 hari | [hunian Dossier 12](../domain/hunian.md#dossier-12--checkout-deposit--overstay-normatif) · `stay-sweep.service.ts` |
| 🚪 Checkout | Ajukan dari portal, lunasi tagihan non-meter, inspeksi, deposit diproses | Ajukan minimal H+1 · batas ≤ tanggal rencana keluar · tagihan meter dipotong dari deposit | hunian Dossier 12 · `checkoutReadiness.ts` |
| 🪪 KTP | Satu foto untuk verifikasi; akses terbatas; dihapus saat checkout | 1 foto · verifikator OWNER/ADMIN · data dihapus otomatis | `tenants.controller.ts` · `stays.service.ts` `cleanupTenantKtpOnCheckout` |

## 2. Yang sengaja **tidak** lagi diklaim

Kalimat ini dihapus dari panduan karena tidak ada jalurnya di kode — mengiklankannya berarti menjanjikan yang tidak bisa ditagih:

- tamu menginap Rp50.000/malam (tarif tamu tidak dihitung sistem),
- denda merokok Rp200.000 (tidak ada mekanisme denda),
- refund 7 hari kerja / janji waktu proses verifikasi,
- QRIS atau e-wallet (pembayaran selalu bukti transfer manual),
- alur WiFi “Tambah Perangkat” (yang benar: halaman **Pesan WiFi**).

## 3. Temuan lama yang ditutup pekan ini

- **F-15** — FAQ seed (kode) diselaraskan ke D-24: STANDARD 2/4 dan LARGE 4/6. Baris FAQ yang **sudah ada di DB produksi tidak berubah oleh kode**; langkah editnya di §4.
- **F-16** — copy publik (`officialKost48Content.ts`, `GuestPreferenceWizard.tsx`) tidak lagi menulis “1–2 orang / maks 2 orang”.
- **F-17** — salinan aturan bertanggal 2026-06-17 di `docs/domain/hunian.md` dibiarkan apa adanya sebagai arsip, dengan banner “bukan aturan kanonik”. Aturan bisnis tidak diubah.

## 4. Satu langkah yang butuh tangan owner (produksi)

Seed FAQ bersifat idempoten **per pertanyaan**: ia menambah yang belum ada dan tidak menimpa yang sudah ada. Jadi baris lama di produksi hanya berubah lewat admin:

1. Masuk sebagai OWNER → menu **FAQ**.
2. Cari pertanyaan **“Satu kamar bisa untuk berapa orang?”**.
3. Ganti jawabannya dengan: *“Kamar STANDARD: 2 orang tanpa biaya tambahan, maksimal 4 orang. Kamar LARGE: 4 orang tanpa biaya tambahan, maksimal 6 orang. Setiap penghuni tambahan di atas batas gratis dikenakan 20% dari tarif sewa periode per kepala (dibulatkan ke atas ke Rp5.000). Penghuni tambahan wajib dikonfirmasi dulu ke pengelola dan dicatatkan di kontrak sewa.”*
4. Simpan, lalu cek tampilannya di halaman FAQ publik dan **Portal → Panduan**.

Tidak ada perubahan DB, deploy, atau uang yang dilakukan agen untuk langkah ini.

## 5. Yang perlu owner putuskan

Cukup satu jawaban: **apakah delapan aturan di §1 boleh menjadi rujukan resmi yang dibaca penghuni?** Bila ya, tanda tangan di bawah; bila ada yang tidak setuju, sebutkan kategorinya agar konten diperbaiki sebelum diumumkan.

| Keputusan | Nama | Tanggal | Catatan |
|---|---|---|---|
| Setuju / revisi (lingkari) |  |  |  |

Batas kejujuran: dokumen ini diturunkan dari konten aplikasi; angka per kamar (deposit) baru terbukti setelah dibaca dari data kamar nyata di produksi. Render 390/1440 px dan isi DB produksi belum diperiksa pada sesi ini.
