# CHECKLIST 18 — Admin: Users + Tenants + Rooms + Announcements + Settings + Profile

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C18-xx`**. **Role:** ADMIN/OWNER. **Audit-only.** DB UAT.
> Banyak halaman ini pakai CRUD generik `ConfiguredResourcePage` — rawan guard FE-only (JB-14).

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Users | `/users` | `ConfiguredResourcePage resource="users"` | OWNER/ADMIN |
| Tenants | `/tenants` | `ConfiguredResourcePage resource="tenants"` | OWNER/ADMIN |
| Detail kamar (admin) | `/rooms/:id` | `pages/rooms/RoomDetailPage.tsx` | OWNER/ADMIN/STAFF |
| Pengumuman (admin) | `/announcements` | `ConfiguredResourcePage resource="announcements"` | OWNER/ADMIN |
| Settings owner | `/settings` | `pages/settings/OwnerSettingsPage.tsx` | (cek role) |
| Profil | `/profile` | `pages/profile/ProfilePage.tsx` | semua login |

**Backend:** `users`, `tenants` (+`tenant-profile`), `rooms`, `announcements`, `settings` (`OperationalSetting`), `marketing/facility-images`, `marketing-assets`. Model: `User`, `Tenant`, `Room`, `RoomFacility`, `Announcement`, `OperationalSetting`.

## Langkah audit

### A. Users `/users` (JEBAKAN keamanan tinggi)
- [ ] 1. Login ADMIN → `/users`. Daftar user + role tampil. **JB-19 (kritis):** payload TIDAK boleh berisi `passwordHash`. Cek Network. Kalau ada → **C18-xx BLOCKER**.
- [ ] 2. Buat user baru → tersimpan? Password di-hash (bukan plaintext di DB)? Email duplikat ditolak?
- [ ] 3. **Ubah role user:** admin bisa menaikkan user jadi OWNER? Harusnya dibatasi. Cek guard (privilege escalation = BLOCKER).
- [ ] 4. Nonaktifkan user → user tsb tak bisa login? Uji.
- [ ] 5. **JB-14 (curl):** `GET/POST /api/users` dengan token TENANT → 403? Bila TENANT bisa buat user / lihat daftar user → BLOCKER.
  ```bash
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/users | head -c 200
  ```
- [ ] 6. **JB-12:** buat user 2× cepat → tidak dobel (email unik enforce di DB).

### B. Tenants `/tenants`
- [ ] 7. Daftar tenant tampil. Data lengkap? **JB-19:** tidak bocor password / data sensitif berlebih (KTP terlindungi?).
- [ ] 8. Foto profil tenant (`tenant-profile`): upload/tampil benar? URL foto aman (tidak bisa akses foto tenant lain tanpa izin)?
- [ ] 9. Edit tenant → tersimpan? Hapus tenant dengan stay aktif → ditolak (integritas relasi)?

### C. Rooms admin `/rooms/:id`
- [ ] 10. Login ADMIN → detail kamar. Edit harga sewa, `defaultDepositRupiah`, fasilitas → tersimpan?
- [ ] 11. **JB-01:** ubah `defaultDepositRupiah` → deposit untuk stay BARU pakai nilai baru; deposit stay LAMA tetap (deposit selalu tetap per kontrak). Verifikasi tidak retroaktif mengubah deposit tenant existing.
- [ ] 12. Harga negatif / 0 → ditolak? Upload foto kamar (facility-images) → tersimpan & tampil di publik (CHECKLIST_02)?
- [ ] 13. **JB-14:** STAFF buka `/rooms/:id` (route izinkan STAFF) — bisa lihat tapi bisa edit harga? Harusnya edit harga khusus ADMIN/OWNER. Cek granularitas guard.

### D. Announcements admin `/announcements`
- [ ] 14. Buat pengumuman → publish → muncul di portal tenant (CHECKLIST_08, JB-20)? Ini menutup loop "pengumuman kosong".
- [ ] 15. Pengumuman draft (belum publish) → TIDAK muncul di tenant. Kategori (info/urgent/maintenance) benar?
- [ ] 16. **XSS:** isi pengumuman `<script>` → ter-escape saat tampil di tenant?

### E. Settings `/settings` (OperationalSetting — sumber banyak angka)
- [ ] 17. Buka. Setting operasional tampil: harga WiFi (Rp50.000), tarif listrik (Rp2.500/kWh?), listrik gratis (30 kWh?), biaya penghuni tambahan (20%?), deposit hewan (Rp100.000?). Cocokkan dengan aturan M02.
- [ ] 18. **JEBAKAN konsistensi:** ubah tarif listrik di settings → invoice/meter baru pakai tarif baru (CHECKLIST_11). Nilai hardcoded di tempat lain yang TIDAK ikut berubah = bug konsistensi. Cari duplikasi nilai.
- [ ] 19. Setting nilai negatif/kosong → ditolak?
- [ ] 20. **JB-14:** siapa boleh ubah settings? (OWNER only? cek). ADMIN/STAFF akses → sesuai aturan?

### F. Profil `/profile` (semua role)
- [ ] 21. Tiap role buka `/profile` → data sendiri tampil & bisa edit (nama, foto, password)?
- [ ] 22. Ganti password: password lama salah → ditolak? Password baru lemah → ditolak?
- [ ] 23. **JB-19:** `/profile` hanya data sendiri; tak bisa lihat/edit profil user lain via param.

## HASIL TEMUAN
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Users: payload tanpa passwordHash (JB-19), guard escalation role, JB-14 via curl — **wajib**.
- [ ] Rooms: edit deposit tidak retroaktif ke stay lama (JB-01); guard edit harga.
- [ ] Announcements publish→muncul di tenant (JB-20) + XSS.
- [ ] Settings dicocokkan dengan M02; konsistensi nilai (tarif listrik dll) diuji.
- [ ] Profile: ganti password + privasi diri sendiri.
- [ ] Temuan `C18-xx`. Update Progres Global baris 18.
