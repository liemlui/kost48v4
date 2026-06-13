# DOSSIER 18 — AUTH, FONDASI & ONBOARDING (KTP)
**Domain:** auth/identitas, manajemen user/tenant, guard & rate-limit, role OWNER-only, onboarding + verifikasi KTP, fondasi lintas-modul. **Flow 1 + fondasi.**
**Status:** 🟢 KUAT (enumeration-safe, suspend putus sesi, E-1 guard global). Tambahan keputusan: OWNER-only 4 area + KTP gate aktivasi.
**File inti:** `auth.service.ts` (12.6KB), `users.service.ts`, `tenants.service.ts` (20.1KB), `common/*` (guards, rate-limit, file-signature), `jwt.strategy.ts`.

---
## 1. Aturan bisnis
- **E-1 APP_GUARD global default-deny TERPASANG** (sejak V5.12.2) — controller baru otomatis 401 kecuali `@Public`. (Koreksi: kontrak lama "tidak ada guard global" BASI.)
- **Role: OWNER/ADMIN/STAFF/TENANT.** **OWNER-only (D3):** (a) tutup/buka periode akuntansi, (b) hapus/nonaktif user & staf, (c) ubah setelan kamar & harga, (d) proses deposit & refund settlement — ADMIN tidak boleh.
- **forgotPassword enumeration-safe** (respons identik); token reset di-hash SHA-256; suspend memutus sesi seketika (jwt.strategy validasi DB/request).
- **Rate limit:** global 300/menit/IP, auth 10/15menit/IP (in-memory; multi-instance perlu store bersama).
- **Onboarding minimal: nama + HP + KTP** (K-a); data lain via quest gamifikasi (dossier 19).
- **KTP (E1/P1-P4):** upload **saat check-in / sebelum aktivasi**; tanpa KTP verified → **blokir aktivasi kamar** (tak jadi OCCUPIED); simpan **terproteksi Bearer-scoped, admin/owner-only, hapus saat tenant keluar** (UU PDP); **cukup FOTO** (verifikasi visual, tidak simpan NIK).
- File security (sudah ada, pola dipakai KTP): magic-byte, rename CSPRNG, anti path-traversal, `private, no-store`.

## 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Login/me/forgot/reset/change | `auth.service.ts:28/75/96/152/218` |
| Guard global + @Public | `common/guards/*`, `app.module.ts` (E-1) |
| Rate limit | `common/middleware/rate-limit.middleware.ts` |
| User/tenant CRUD + portal access | `users.service.ts`, `tenants.service.ts:47/60/73` |
| File proof terproteksi (pola utk KTP) | `payment-submissions` proof endpoint + `common/utils/file-signature.util.ts` |

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| D3 OWNER-only | 🟠 P2 (BARU) | Banyak aksi sensitif kini OWNER+ADMIN; owner mau OWNER-only (4 area). | seluruh controller @Roles | **F2-16** audit @Roles + perketat |
| E1 KTP | 🟠 P2 (BARU) | Belum ada verifikasi identitas → risiko keamanan kos pria. | onboarding/stays.create | **F3-17** field KTP foto + gate aktivasi + hapus saat keluar |
| X-01 | 🟡 P3 | Util keselamatan tersebar (releaseRoom/generateTicketNumber/syncRoomItem 2-3 salinan). | lintas-modul | konsolidasi (ikut F2-5 dossier 14) |
| X-02 | 🟡 P3 | 76 nama foto kamar hardcoded di service. | marketing service | **F3-11** (dossier 17) |
| X-03 | 🟡 P3 | **Audit trail helpers terduplikasi** — `generateTicketNumber`, `releaseRoom`, `syncRoomItem` memiliki 2-3 salinan identik di berbagai service (tickets, stays, inventory). Satu source of truth rusak → semua jalur berbeda behavior. Cross-ref I-02 (ghost-stock via admin review). | lintas-modul: `tickets.service.ts`, `stays.service.ts`, `inventory-movements.service.ts`, `staff-field-reports.service.ts` | **F2-5**: konsolidasi ke shared helper (extract ke `common/utils/`) + gunakan satu implementasi untuk semua jalur |
| Auth | ✅ | enumeration-safe + suspend putus sesi + token hash = fondasi kuat. | `auth.service.ts` | pertahankan |
| Refresh token | INFO sadar-risiko | Tidak ada refresh token (expiry 24 jam). JWT di localStorage (PWA risk). | — | tunda (E-8 area) |
| Rate limit | INFO | In-memory per-proses; multi-replica perlu Redis. | middleware | tunda sampai skala |

## 4. Task
- **F2-16 · FASE 2:** audit menyeluruh `@Roles` semua controller; perketat ke OWNER-only utk 4 area D3 (tutup/buka periode, user/staf mgmt, setelan kamar & harga, deposit/refund). Tolak ADMIN.
- **F2-5 · FASE 2:** konsolidasi helpers terduplikasi ke `common/utils/` — `generateTicketNumber`, `releaseRoom`, `syncRoomItem`. (X-01, X-03, cross-ref dossier 14 I-02)
- **F3-17 · FASE 3 (BARU):** KTP — field `Tenant.ktpFileKey`+`ktpVerifiedAt`+`ktpVerifiedById`; endpoint upload terproteksi (pola bukti bayar); gate aktivasi kamar (tak OCCUPIED tanpa verified); hapus file saat checkout permanen. Foto saja (tidak baca NIK). UU PDP.

## 5. Invarian & verifikasi
- **Invarian:** controller tanpa `@Public` = wajib auth (default-deny); suspend = sesi putus seketika; token reset sekali pakai + berbatas waktu + disimpan sebagai hash; data sensitif (KTP) minimal + terproteksi + dihapus saat keluar.
- **UAT:** (1) controller baru tanpa @Public → 401; (2) suspend tenant → request berikutnya 401; (3) ADMIN coba tutup periode/ubah harga → 403 (pasca F2-16); (4) aktivasi kamar tanpa KTP verified → blocked (pasca F3-17); (5) forgot-password user tak-ada vs ada → respons identik.
- **Lintas-dossier:** OWNER-only deposit → dossier 12/13; KTP gate aktivasi → dossier 11 (booking); helper konsolidasi → dossier 14.