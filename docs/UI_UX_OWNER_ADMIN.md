# Standar UI/UX Owner dan Admin

**Keputusan owner 16 Juli 2026:** antarmuka harus lengkap dan detail tanpa membuat pengguna pusing. Prinsipnya: **ringkas saat dilihat, lengkap saat dibuka**.

## Pembagian peran

- **Kokpit Owner** berisi kesehatan bisnis, risiko, tren, dan keputusan strategis.
- **Area Admin** berisi antrean pekerjaan operasional harian dan tindakan lanjutan.
- OWNER berpindah melalui toggle **Kokpit Owner / Area Admin** (`/owner-dashboard` dan `/admin-dashboard`).
- Mode Area Admin tidak menurunkan role OWNER; hanya mengganti konteks tampilan.
- ADMIN tidak melihat fitur keputusan strategis khusus OWNER.

## Hirarki setiap layar

1. **Ringkasan:** kondisi saat ini dalam satu pandangan.
2. **Perlu tindakan:** pekerjaan yang benar-benar membutuhkan keputusan.
3. **Detail:** data lengkap setelah pengguna membuka item.
4. **Riwayat/audit:** paling bawah, dalam tab, atau panel kolapsibel.

## Aturan wajib

- Satu layar mempunyai satu tujuan utama.
- Maksimal satu atau dua tombol utama; tindakan jarang dipakai menjadi aksi sekunder.
- Kemampuan tidak boleh dihapus hanya untuk membuat layar terlihat sederhana.
- Gunakan progressive disclosure; jangan tampilkan semua field sekaligus.
- Jangan mengulang metrik atau antrean yang sama di beberapa kartu.
- Peringatan hanya tampil bila ada tindakan nyata.
- Gunakan bahasa operasional, bukan enum atau istilah backend.
- NIK dimasking; foto KTP hanya untuk OWNER/ADMIN dan tenant pemilik data.
- Mobile mempertahankan prioritas dan tindakan utama yang sama.

## Pola daftar dan detail

Daftar cukup menampilkan identitas, konteks, status, alasan membutuhkan perhatian, dan satu tombol **Periksa**. Detail lengkap, AI, catatan, audit, dan tindakan final tampil setelah item dibuka.

Contoh KTP:

- Daftar: nama, kamar, status, waktu upload, rekomendasi singkat, tombol **Periksa**.
- Detail: foto, OCR, kecocokan NIK/nama, rekomendasi AI, catatan, approve atau minta upload ulang.
- OCR mentah dan metadata teknis berada di bagian **Detail teknis**.
- AI hanya memberi rekomendasi; keputusan final selalu OWNER/ADMIN.

## Checklist review

- [ ] Kondisi halaman dapat dipahami dalam 5 detik.
- [ ] Tindakan berikutnya terlihat tanpa membaca seluruh halaman.
- [ ] Detail lengkap dapat ditemukan maksimal dua interaksi.
- [ ] Tidak ada informasi atau tombol duplikat.
- [ ] Empty, loading, error, success, dan mobile state tersedia.
- [ ] OWNER dapat kembali ke Kokpit Owner tanpa kehilangan kewenangan.

## Anchor implementasi

- Toggle/navigasi: `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/config/navigation.ts`.
- Dashboard Admin: `frontend/src/pages/dashboard/DashboardAdmin.tsx`.
- Detail tenant/KTP: `frontend/src/components/resources/ResourceFormModal.tsx`, `frontend/src/components/ai/KtpOcrValidateCard.tsx`.
- Portal upload KTP: `frontend/src/pages/profile/ProfilePage.tsx`.
