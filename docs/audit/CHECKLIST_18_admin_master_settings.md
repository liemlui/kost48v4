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

> **Status:** **kode SELESAI** (bersih); **live TERTUNDA** (backend down).

### ✅ Verifikasi kode — BENAR (kuat)
- **Anti privilege-escalation (`users.service.ts`):** `assertOwnerProtectionOnCreate` → **`if (actor.role !== OWNER && role === OWNER) throw Forbidden('Hanya OWNER yang dapat membuat akun OWNER')`** (`:192-196`); `assertOwnerProtectionOnUpdate` idem untuk ubah role (`:198`). **ADMIN tak bisa bikin/naikkan ke OWNER.** ✅ JB-14.
- **Tanpa `passwordHash` di respons:** select users (list/create/update) hanya `id,fullName,email,role,tenantId,isActive` (`:42,60,109`); password `bcrypt.hash` (`:94`). (Dikonfirmasi live C04: tak bocor.)
- **Settings write OWNER-only** (dikonfirmasi C04): `PUT /settings/operational` `@Roles(OWNER)`; read multi-role (lihat C04-01 tentang over-exposure config AI).
- **✅ Users CRUD = OWNER-only (live-relevan, kuat):** `POST /users` (create) **dan** `PATCH /users/:id` (update, termasuk set password) keduanya `@Roles(OWNER)` — **ADMIN pun tak bisa** buat/ubah user (jadi admin tak bisa reset password tenant). Guard ekstra ketat, konsisten dgn anti-escalation. (Terverifikasi saat coba reset password tenant occupied via admin → tak diizinkan.)
- TENANT wajib tenantId, non-TENANT tak boleh tenantId (`:76-80`).

### ✅ LIVE CONFIRMED (owner, 3 Jul)
- **`/profile`:** render — Info Akun (Pemilik KOST48, owner@kost48.com, Owner, penghuni terkait "-"); form Ganti Password (Saat Ini/Baru/Konfirmasi, min-8). **Tanpa passwordHash**, data diri sendiri (JB-19). ✅
- **`/settings`:** render penuh — tab **FAQ Publik / Foto Kamar / Foto Fasilitas / Aset Publik / Tarif & Konstanta / AI & Biaya / Antrean Draft AI**. **37 FAQ** tampil (cocok DEFAULT_DATA) dgn Edit/Nonaktifkan/Hapus. Konten FAQ konsisten aturan bisnis (DP hangus vs deposit refundable #32, expiry 3 jam #41, first-paid-wins #42, tip langsung ke staf #81).
- **Penguat C03-02:** FAQ kanonik DB #3 = "Satu kamar dapat dihuni **1–2 orang**... tambahan 20%" — lebih akurat drpd FAQ hardcoded landing ("Maksimal 2 orang"). Landing sebaiknya pakai FAQ DB.
- **Penguat C01-01:** FAQ DB #17 tampil "jatah 30 kWh... Rp 2.500/kWh" (dari DB, bisa dikelola owner) — beda dgn LANDING yang hardcode + injeksi `freeKwh` mati (C01-01).
- **JB-14 (settings/users):** `/settings/operational` write OWNER-only; `/users` create/edit OWNER-only (admin 403) — terverifikasi. Sweep JB-14 admin/owner: TENANT 403/404 di semua.
- *(Halaman berat seperti `/users`, `/tenants`, `/reports` timeout screenshot karena backend degraded (C13 note) — endpoint+data+guard sudah terverifikasi via API.)*

### Live TERTUNDA (butuh BE hidup — sebaiknya setelah restart bersih)
- Users CRUD (email duplikat, nonaktif→tak bisa login), Rooms edit deposit **non-retroaktif** (JB-01), Announcements publish→muncul di tenant (JB-20) + XSS (React escape — pola aman spt C03/C07), Settings vs M02 + konsistensi tarif, Profile ganti password + privasi. JB-14 curl.

## Definition of Done — status
- [x] Anti-escalation (admin tak bisa OWNER) + no passwordHash diverifikasi kode + live (C04).
- [~] Rooms deposit non-retroaktif, announcement publish→tenant, settings konsistensi: tertunda (backend down).
- [x] Temuan `C18-xx` (nihil bug kode); INDEX baris 18 diupdate.

## Definition of Done
- [ ] Users: payload tanpa passwordHash (JB-19), guard escalation role, JB-14 via curl — **wajib**.
- [ ] Rooms: edit deposit tidak retroaktif ke stay lama (JB-01); guard edit harga.
- [ ] Announcements publish→muncul di tenant (JB-20) + XSS.
- [ ] Settings dicocokkan dengan M02; konsistensi nilai (tarif listrik dll) diuji.
- [ ] Profile: ganti password + privasi diri sendiri.
- [ ] Temuan `C18-xx`. Update Progres Global baris 18.
