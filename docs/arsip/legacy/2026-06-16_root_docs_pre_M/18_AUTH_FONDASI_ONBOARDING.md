# DOSSIER 18 — AUTH, FONDASI & ONBOARDING (KTP)
**Domain:** auth/identitas, manajemen user/tenant, guard & rate-limit, role OWNER-only, onboarding + verifikasi KTP, fondasi lintas-modul. **Flow 1 + fondasi.**
**Status:** 🟢 KUAT (enumeration-safe, suspend putus sesi, E-1 guard global). Tambahan keputusan: OWNER-only 4 area + KTP gate aktivasi.
**File inti:** `auth.service.ts` (12.6KB), `users.service.ts`, `tenants.service.ts` (20.1KB), `common/*` (guards, rate-limit, file-signature), `jwt.strategy.ts`.

---
## 1. Aturan bisnis
- **E-1 APP_GUARD global default-deny TERPASANG** (sejak V5.12.2) — controller baru otomatis 401 kecuali `@Public`. (Koreksi: kontrak lama "tidak ada guard global" BASI.)
- **Role: OWNER/ADMIN/STAFF/TENANT.** **OWNER-only (D-17):** (a) tutup/buka periode akuntansi, (b) hapus/nonaktif user & staf, (c) ubah setelan kamar & harga, (d) proses deposit & refund settlement — ADMIN tidak boleh.
- **forgotPassword enumeration-safe** (respons identik); token reset di-hash SHA-256; suspend memutus sesi seketika (jwt.strategy validasi DB/request).
- **Rate limit:** global 300/menit/IP, auth 10/15menit/IP (in-memory; multi-instance perlu store bersama).
- **Onboarding minimal: nama + HP + KTP**; data lain dapat dilengkapi lewat quest gamifikasi.
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
> 🔄 **SINKRON KODE (2026-06-15, audit menyeluruh):** **X-01/X-03/F2-5 SUDAH SELESAI** — helper keselamatan (qty inventaris, ticket-number, room-release) dikonsolidasi ke `common/utils/` (mis. `room-booking.util`, `staff-assignment.util`, `ticket-number.util`); jalur admin-review pakai util sama (ghost-stock tertutup). **Catatan go-live (L-4):** gate aktivasi KTP default OFF → WAJIB `KTP_ACTIVATION_GATE_ENABLED=true` di produksi (`04_DEPLOY`).
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| D-17 OWNER-only | ✅ SELESAI (2026-06-14) | 4 area kini OWNER-only (ADMIN→403): periode, user/staf (+role/isActive), setelan kamar & harga, deposit/refund. UAT lulus. | `users`/`rooms`/`stays`/`accounting` controller @Roles | **F2-16 ✅** |
| E1 KTP | ✅ RESOLVED (F3-17, 2026-06-14) | Foto KTP terproteksi (OWNER/ADMIN-only), verifikasi OWNER, gate aktivasi env-gated, hapus PDP saat checkout. Foto saja (NIK teks `identityNumber` terpisah). | `tenants.controller/service`, `stays.service` | **F3-17 selesai** |
| X-01 | 🟡 P3 | Util keselamatan tersebar (releaseRoom/generateTicketNumber/syncRoomItem 2-3 salinan). | lintas-modul | konsolidasi (ikut F2-5 dossier 14) |
| X-02 | 🟡 P3 | 76 nama foto kamar hardcoded di service. | marketing service | **F3-11** (dossier 17) |
| X-03 | 🟡 P3 | **Audit trail helpers terduplikasi** — `generateTicketNumber`, `releaseRoom`, `syncRoomItem` memiliki 2-3 salinan identik di berbagai service (tickets, stays, inventory). Satu source of truth rusak → semua jalur berbeda behavior. Cross-ref I-02 (ghost-stock via admin review). | lintas-modul: `tickets.service.ts`, `stays.service.ts`, `inventory-movements.service.ts`, `staff-field-reports.service.ts` | **F2-5**: konsolidasi ke shared helper (extract ke `common/utils/`) + gunakan satu implementasi untuk semua jalur |
| Auth | ✅ | enumeration-safe + suspend putus sesi + token hash = fondasi kuat. | `auth.service.ts` | pertahankan |
| Refresh token | INFO sadar-risiko | Tidak ada refresh token (expiry 24 jam). JWT di localStorage (PWA risk). | — | tunda (E-8 area) |
| Rate limit | INFO | In-memory per-proses; multi-replica perlu Redis. | middleware | tunda sampai skala |

## 4. Task
- **F2-16 · FASE 2 ✅ SELESAI (2026-06-14):** perketat OWNER-only 4 area D-17 (ADMIN→403): periode (sudah OWNER); `users` create/update (cegah nonaktif + eskalasi role); `rooms` create/update/fasilitas/upload-image; `stays :id/deposit/process`. UAT: ADMIN 403, OWNER lolos. Scoping: `tenants portal-access/status` dibiarkan OWNER+ADMIN (moderasi tenant).
- **F2-5 · FASE 2:** konsolidasi helpers terduplikasi ke `common/utils/` — `generateTicketNumber`, `releaseRoom`, `syncRoomItem`. (X-01, X-03, cross-ref dossier 14 I-02)
- **F3-17 · FASE 3 (SELESAI 2026-06-14, schema approved):** `Tenant.ktpImage*`+`ktpVerifiedAt`+`ktpVerifiedById`+`ktpDeletedAt`. `POST /tenants/:id/ktp/upload` (OWNER/ADMIN, MIME-sig, folder `uploads/ktp-images`); `POST :id/ktp/verify` (OWNER); `GET :id/ktp/image` **OWNER/ADMIN-only** (no-store/nosniff/Vary); gate aktivasi `stays.create` via env `KTP_ACTIVATION_GATE_ENABLED` (default OFF); hapus PDP otomatis saat checkout (no other active stay) + manual `DELETE :id/ktp`. Foto saja (NIK teks terpisah). tsc 0 · unit 26/26.

## 5. Invarian & verifikasi
- **Invarian:** controller tanpa `@Public` = wajib auth (default-deny); suspend = sesi putus seketika; token reset sekali pakai + berbatas waktu + disimpan sebagai hash; data sensitif (KTP) minimal + terproteksi + dihapus saat keluar.
- **UAT:** (1) controller baru tanpa @Public → 401; (2) suspend tenant → request berikutnya 401; (3) ADMIN coba tutup periode/ubah harga → 403 (pasca F2-16); (4) aktivasi kamar tanpa KTP verified → blocked (pasca F3-17); (5) forgot-password user tak-ada vs ada → respons identik.
- **Lintas-dossier:** OWNER-only deposit → dossier 12/13; KTP gate aktivasi → dossier 11 (booking); helper konsolidasi → dossier 14.
