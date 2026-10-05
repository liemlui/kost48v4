# Indeks cakupan audit — pengganti checklist 135 ID

> **Blok baca** · Jenis: **indeks cakupan** · Status: **aktif** · Dipelihara: owner · Untuk siapa: owner + agen yang merencanakan audit
> · Baca kalau: memilih area audit berikutnya, atau mengecek berapa ID yang belum direkonsiliasi. · **Jangan** dibaca kalau: mengerjakan task produk biasa.

**Kenapa berkas ini ada.** Checklist cakupan 135 ID (110 KB, 117 kotak) dulu hidup di folder aktif `docs/audit/` — kotaknya terlihat seperti antrean padahal itu **indeks cakupan**, bukan daftar tugas. Sejak **batch B4 (2026-10-05)** checklist itu diarsipkan ke [arsip/audit-checklist-total.md](../arsip/audit-checklist-total.md) (dibekukan, ber-banner), dan berkas ini menggantikannya sebagai **indeks tipis**: angka per bagian + jalan masuk ke detailnya.

**Aturan berkas ini:** **tanpa kotak `[ ]`** (dijaga gate dokumen, aturan R7). Berkas ini tidak menyimpan pekerjaan — ia hanya menunjukkan di mana harus melihat.

## 1. Cakupan per bagian — potret 8–18 Sep 2026

Angka di bawah adalah **potret** dari checklist yang diarsipkan; ia **tidak diperbarui** di sini. Untuk status per ID, buka arsipnya.

| Bagian | Total ID | Belum direkonsiliasi | Sudah diperiksa |
|---|---:|---:|---:|
| Backend | 52 | 51 | 1 |
| Frontend | 67 | 50 | 17 |
| Database | 1 | 1 | 0 |
| Pengujian | 8 | 8 | 0 |
| Tooling dan konfigurasi | 7 | 7 | 0 |
| **Total** | **135** | **117** | **18** |

## 2. Cara memakai

1. Pilih bagian dari tabel di atas; buka [checklist arsip](../arsip/audit-checklist-total.md) dan baca baris ID yang dituju (tiap baris menautkan peta di `.audit-map/`).
2. Kerjakan auditnya sebagai task tersendiri; catat hasil + tanggal + bukti di [docs/audit/](README.md) sebagai kartu bertanggal.
3. Kalau sebuah ID selesai diperiksa, **jangan** menambah kotak di berkas ini — perbarui potretnya di checklist arsip bila memang perlu, atau tulis statusnya di kartu audit bertanggal.
4. Antrean tugas tetap satu tempat: [docs/ANTREAN.md](../ANTREAN.md) (akan menjadi `docs/ANTREAN.md` pada batch B5). Indeks ini **bukan** antrean.

## 3. Konteks yang berguna

- Cakupan ini berasal dari peta lokal 135 subkelompok (Basis: peta `.audit-map/`), dibuat 8 September 2026 atas permintaan owner.
- Checklist penuh + tabel hasil/checkpoint per ID ada di arsip; ia **dibekukan** dan angkanya adalah potret saat audit 11–18 September 2026 berjalan.
- 5 ID Frontend pada potret itu sudah ditutup lewat audit-audit bertanggal sesudahnya (lihat [docs/AUDIT.md](../AUDIT.md) untuk daftar temuan bertanggal) — perbedaan antara "belum direkonsiliasi" di sini dan status terbaru di sana adalah hal yang wajar: berkas ini tidak menyimpan status.

## 4. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-05 | Dibuat pada batch B4 sebagai pengganti [checklist arsip](../arsip/audit-checklist-total.md) (keputusan Q13/P17). Tanpa kotak; dipelihara owner. |
