# Status & Antrean Eksekusi Fase AO (UI/UX Lintas Portal)

> Dipindah apa adanya dari `docs/M14_AUDIT_UI_UX.md` §7–§10 (Tahap 3 batch B4, 23 Sep 2026) pada DOC-GOV-20260922.
> Isi: status task AO, gelombang kerja, aturan anti-konflik, Definition of Done (27 gate `[ ]`), perintah verifikasi, dan handoff. Ini **status kerja aktif**, bukan bukti bertanggal.
> Antrean/gate kanonik tetap [STATUS.md](../STATUS.md); ringkasan fase di [history/fase-ao.md](../history/fase-ao.md); temuan dan bukti di [audit-uiux-lintas-portal-2026-07.md](audit-uiux-lintas-portal-2026-07.md).

## 7. Antrean Eksekusi Kolaboratif

### 7.1 Status task

Status diselaraskan 8 September dari checklist M12 dan riwayat M13. `DONE:riwayat`/`DONE:ledger` mempertahankan hasil terdahulu, bukan bukti runtime September; tidak menjalankan ulang implementasi selesai. `REVIEW` pada pekerjaan parsial hanya mencakup bagian sisanya. Checklist eksekusi tetap satu di M12.

Gunakan status berikut di tabel:

- `OPEN`
- `CLAIMED:<nama-agent>`
- `IN_PROGRESS:<nama-agent>`
- `REVIEW`
- `DONE:<commit>`
- `BLOCKED:<alasan>`

| Task | Prioritas | Status | Ownership file utama | Gate |
|---|---|---|---|---|
| AO-00 Sinkronkan dua migration UAT | P0 | `DONE:riwayat M13 30 Jul` | `backend/prisma/migrations/*` hanya deploy, tanpa edit | Kesegaran ledger target sebelum crawl baru; bukan ulang migration lama |
| AO-01 State terdegradasi katalog publik | P1 | `DONE:riwayat M13 30 Jul` | `PublicRoomsPage.tsx`, komponen availability, `11-public-pages.css` | desktop/mobile + API failure mock |
| AO-02 Perbaiki hook-order loyalitas | P1 | `DONE:riwayat M13 30 Jul` | `MyLoyaltyPage.tsx`, test loyalty | unit test loading→disabled/enabled |
| AO-03 Fixture/kredensial audit lintas role | P1 | `DONE:provisioning 3 role + TENANT no-stay` — TENANT aktif didefer AO-14; kredensial via env non-repo | `frontend/e2e/*`, `backend/scripts/seed-audit-users.js`, env only | 4/5 persona kini (OWNER/ADMIN/STAFF/TENANT-no-stay); TENANT-aktif menunggu fixture non-personal |
| AO-04 Ramping navigasi tenant mobile | P1 | `DONE:riwayat M13 30 Jul` | `TenantWorkspaceTabs.tsx`, `GettingStartedGuide.tsx`, `MobileBottomNav.tsx`, `navigation.ts` | 320–414 px + deep link |
| AO-05 Semantik kontrak overstay | P1 | `DONE:riwayat M13 30 Jul` | `MyStayPage.tsx`, helper/test stay | H-1/H/H+1/overstay |
| AO-06 Label auth/profile | P1 | `DONE:riwayat M13 30 Jul` | auth pages, `ProfilePage.tsx`, `PasswordInput.tsx` | Axe + keyboard |
| AO-07 Profile overflow + disclosure | P2 | `DONE:riwayat M13 30 Jul` | `ProfilePage.tsx`, style profile | 5 viewport mobile |
| AO-08 Kontras lintas surface | P2 | `DONE:riwayat M13 30 Jul` | CSS sesuai route; klaim per file | Axe 0 serious/critical |
| AO-09 Landmark/H1 | P2 | `DONE:riwayat M13 30 Jul` | public shell, auth shell, tenant stay | semantic smoke test |
| AO-10 Manual tenant scanability | P2 | `DONE:riwayat M13 30 Jul` | `MyManualPage.tsx`, style manual | mobile visual + keyboard |
| AO-11 Filter/tap target mobile | P2 | `DONE:riwayat M13 30 Jul` | invoice + shared mobile controls | 44 px + active-visible |
| AO-12 Kontrak API dev | P2 | `DONE:riwayat M13 30 Jul` | `vite.config.ts` atau `.env.development`, docs command | login dev tanpa langkah tersembunyi |
| AO-13 Crawl OWNER/ADMIN/STAFF | P0 gate | `DONE:crawl 8 Sep` — OWNER 36/36, ADMIN 32/32, STAFF 7/7; 0 kritis (hanya warning console `controlId`) | `frontend/e2e/admin-owner-crawl.spec.ts` + `frontend/e2e/staff-crawl.spec.ts` (env `E2E_*`) | 3 role dieksekusi, 0 skip; role/route/konten dan seluruh error diperiksa |
| AO-15 Struktur footer publik | P3 | `DONE:riwayat M13 30 Jul` | `publicGuestShared.tsx`, `11-public-pages.css` | 6 route publik + 320–414 px |
| AO-16 Empty result + persistensi shortlist | P2 | `DONE:riwayat M13 30 Jul` | `PublicRoomsPage.tsx`, test katalog | filtered-zero + detail/back |
| AO-17 Hero/teaser state nol | P1 | `DONE:riwayat M13 30 Jul` | `PublicGuestDashboardPage.tsx`, `11-public-pages.css` | prod-like 0/1/error/loading |
| AO-18 Hierarki homepage/trust | P2 | `REVIEW` — parsial; sisa polish copy/hierarchy | `PublicGuestDashboardPage.tsx`, `publicGuestShared.tsx`, CSS publik | desktop/mobile + truthfulness |
| AO-19 Audit aset/galeri publik | P2 | `REVIEW` — cue selesai; inventaris aset tersisa | data aset, `room-images`, gallery renderer | inventory + touch/keyboard |
| AO-20 Dashboard Owner: exception/actionability | P1 | `REVIEW` — sisa state KPI/label aksi | `OwnerDashboardPage.tsx`, `12-owner.css` | data state + desktop/touch/keyboard |
| AO-21 Sistem visual/terminologi Owner | P2 | `OPEN` | Owner dashboard + AppLayout/nav/title/CSS shell | 1024/1280/1440 + regression role |
| AO-22 Admin dashboard: queue-first action hierarchy | P1 | `DONE:riwayat M13 30 Jul` | `DashboardAdmin.tsx`, queue/alert components, `08-admin.css` | ADMIN desktop + keyboard/data states |
| AO-23 Sistem komponen/shell Area Admin | P2 | `OPEN` | AppLayout/shared CSS + Admin dashboard | ADMIN + OWNER shell regression |
| AO-14 Re-audit final lintas role dan dua state TENANT | P0 gate | `BLOCKED:sisa AO-03/13/18/19/20/21/23+DoD` | QA only | seluruh Definition of Done + gate Baymard relevan; hasil AO-13 saja tidak cukup |

### 7.2 Gelombang kerja

Peta dependensi berikut dipertahankan untuk lingkup yang belum selesai; bukan antrean baru. Status §7.1 dan M12 menang atas rencana gelombang awal. Tidak ada izin implementasi/server/DB otomatis dari peta ini.

**Wave 0 — wajib lebih dulu**

- AO-00 selesai historis; verifikasi read-only kesegaran ledger UAT sebelum crawl baru. Jika ditemukan migration pending baru, tetapkan lingkup/izin tersendiri.
- AO-03 tindak lanjut gap alat dan fixture/kredensial terkontrol.
- AO-12 selesai historis; konsistensi target suite crawl masih perlu ditangani sebagai gap alat 8 Sep.

**Wave 1 — dapat paralel setelah AO-00**

- Agent Public Catalog: AO-01 + bagian public AO-08/AO-09, lalu AO-16.
- Agent Public Homepage: AO-17 → AO-18 → AO-15 secara serial karena berbagi `PublicGuestDashboardPage`/CSS publik.
- Agent Asset: AO-19 dapat mulai dari inventory, tetapi koordinasikan perubahan renderer/CSS dengan Agent Public Homepage.
- Agent Owner Dashboard: AO-20 dapat dimulai tanpa mengubah AppLayout; fokus `OwnerDashboardPage.tsx` + `12-owner.css`.
- Agent Admin Dashboard: AO-22 dapat dimulai pada `DashboardAdmin.tsx` + komponen queue/alert; jangan mengubah AppLayout.
- Agent Tenant Shell: AO-04; jangan menyentuh `MyStayPage`/`ProfilePage`.
- Agent Tenant Logic: AO-02 + AO-05; jangan menyentuh shell/CSS global.
- Agent A11y Form: AO-06 + AO-07; jangan menyentuh navigation.

**Wave 2 — integrasi**

- AO-10 dan AO-11 setelah shell mobile stabil.
- AO-16 setelah AO-01 selesai/review karena sama-sama menyentuh `PublicRoomsPage.tsx`.
- AO-17, AO-18, dan AO-15 harus serial; jangan dikerjakan paralel pada `11-public-pages.css`.
- AO-19 menunggu owner hanya jika sumber foto pengganti memang dibutuhkan; inventory dan audit interaction cue dapat dikerjakan lebih dulu.
- AO-21 setelah AO-20 direview; koordinasikan dulu bila AppLayout, navigation, route title, atau CSS shell akan disentuh.
- AO-23 setelah AO-22 direview; serial dengan AO-21 bila menyentuh AppLayout, `02-layout.css`, atau `03-components.css`.
- AO-13 crawl role.
- AO-14 audit final dan penutupan checklist.

### 7.3 Aturan anti-konflik antar-AI

1. Klaim task di tabel sebelum edit.
2. Satu task = satu commit berbahasa Indonesia bila commit diminta owner; docs-only tidak otomatis mengizinkan commit.
3. Jangan menyentuh file milik task lain yang `CLAIMED`/`IN_PROGRESS`.
4. Jika membutuhkan file shared yang sudah diklaim, kirim catatan dependency; jangan edit paralel.
5. Jangan menyalin klaim audit lama tanpa reproduksi.
6. Jangan menambah dependency npm tanpa approval owner.
7. Jangan menjalankan migration, reseed, reset password, atau `db push` tanpa otorisasi.
8. Setelah task: sinkronkan status M14/M12 dan tambah entri M13 sesuai bukti, terlepas dari apakah commit diminta.
9. Simpan screenshot hanya jika tidak memuat PII tenant.
10. Jangan menyentuh file untracked milik agent lain (`A`, `AUDIT_L`, `AUDIT_LAPOR`, `.claude/`).

---

## 8. Definition of Done Fase AO

- [ ] Database UAT up to date; tidak ada pending migration.
- [ ] Endpoint katalog, notifikasi, dan pengumuman bebas 5xx.
- [ ] Katalog tidak lagi menampilkan `0 kamar` bersamaan dengan kalender 14 kamar.
- [ ] Loyalitas enabled/disabled tidak memicu React ErrorBoundary.
- [ ] Crawl OWNER, ADMIN, STAFF, TENANT, dan PUBLIC selesai.
- [ ] Kredensial/target proses benar; tiga crawl operasional benar-benar dieksekusi (0 skip), role/route/konten benar, dan dua state TENANT dibuktikan pada UAT nyata. Seluruh temuan error ditriage, bukan hanya filter assertion kritis.
- [ ] 0 blank page, 0 page crash, 0 unexpected redirect-login.
- [ ] 0 Axe serious/critical pada route audit.
- [ ] 0 overflow halaman pada 320–1440 px; scroller lokal harus punya affordance.
- [ ] Semua form memiliki label programmatik dan error association.
- [ ] Tepat satu main dan satu H1 bermakna per route/shell.
- [ ] Navigasi tenant mobile tidak diduplikasi sebagai dua menu primer.
- [ ] Status kontrak lewat tanggal memiliki copy + CTA yang tidak kontradiktif.
- [ ] Footer publik dikelompokkan secara semantik dan tetap mudah dipindai pada enam route publik utama.
- [ ] Gate Baymard yang relevan terverifikasi: harga/biaya awal, status kamar, filter/back-state, galeri, ulasan, dan CTA booking.
- [ ] Empty result membedakan filter-nol, data benar-benar kosong, dan request error; shortlist perbandingan bertahan selama sesi detail/back.
- [ ] Homepage `bookable=0` tidak memakai sinyal hijau/CTA palsu, tetap menangkap minat, dan tidak menyisakan teaser grid kosong.
- [ ] Hierarki homepage ringkas, trust claim faktual, review empty-state jujur, serta CTA/FAQ/contact mudah dipindai.
- [ ] Aset publik terinventarisasi dan cue galeri dapat ditemukan pada touch/keyboard.
- [ ] Dashboard Owner mengubah exception menjadi CTA yang benar, membedakan state data KPI, dan toolbar lokal dapat dipindai pada desktop/touch/keyboard.
- [ ] Komponen Owner memakai sistem visual/terminologi yang konsisten tanpa regresi AppLayout atau role lain.
- [ ] Dashboard Area Admin menampilkan exception dan antrean aksi yang berurutan sebelum metrik dekoratif, dengan CTA/label status yang benar.
- [ ] Shell/komponen Area Admin konsisten dan regresi Owner tervalidasi bila shared header/sidebar berubah.
- [ ] `npm run build` frontend lulus.
- [ ] `npx vitest run` lulus.
- [ ] Backend `npx tsc --noEmit` lulus jika ada perubahan backend/deploy.
- [ ] Screenshot before/after bebas PII dilampirkan pada commit/review.

---

## 9. Perintah Verifikasi

Perintah berikut adalah rencana untuk lingkup pengujian yang telah diizinkan; tidak dijalankan dalam audit dokumentasi 8 Sep. Sebelum provisioning/crawl, selesaikan prasyarat audit alat pada AO-03, verifikasi target API/DB UAT, dan cakup mutasi akun/portal/sesi login dalam izin. `AUDIT_CONFIRM=1` bukan pemeriksaan lingkungan.

```powershell
# Status migration — read-only
cd backend
npx prisma migrate status

# Gate frontend
cd ../frontend
npm run build
npx vitest run

# Dev frontend harus terhubung ke API tanpa langkah tersembunyi setelah AO-12
npm run dev -- --host 127.0.0.1 --port 5174

# Crawl existing OWNER/ADMIN/STAFF setelah fixture UAT tersedia (AO-03)
# Isi dulu environment PROSES dari shell/secret manager (nilai TIDAK di docs):
# Playwright saat ini tidak otomatis memuat frontend/.env.local.
#   E2E_BASE / E2E_OWNER_IDENTIFIER / E2E_OWNER_PASSWORD
#   E2E_ADMIN_IDENTIFIER / E2E_ADMIN_PASSWORD
#   E2E_STAFF_IDENTIFIER / E2E_STAFF_PASSWORD
# Penyediaan akun audit UAT: dari backend, npm run seed:audit-users
# Hanya setelah gap alat/fixture ditangani dan izin mutasi terkait tersedia.
$env:E2E_BASE='http://127.0.0.1:5174'
# Dua spec berikut memakai E2E_BASE; smoke/a11y dengan URL relatif masih
# memakai baseURL config :5173. Selaraskan target sebelum audit gabungan.
npx playwright test e2e/admin-owner-crawl.spec.ts e2e/staff-crawl.spec.ts --workers=1
```

Kredensial audit tidak boleh ditulis ke dokumen ini. Gunakan environment proses atau secret manager. Catat target efektif, role/state, viewport, jumlah executed/skipped, seluruh temuan, serta batas bukti. Exit 0, `--list`, atau screenshot halaman berisi teks belum membuktikan gate AO lulus.

---

## 10. Handoff untuk Agent Berikutnya

Mulai dari urutan berikut:

1. Baca M14 bagian AO-00 dan cek `npx prisma migrate status`.
2. Jika migration masih pending, jangan melakukan audit visual final.
3. Klaim satu task `OPEN` yang file ownership-nya tidak bertabrakan.
4. Reproduksi temuan sebelum edit.
5. Implementasi + test + screenshot bebas PII.
6. Commit task, lalu update M14/M12/M13.

Audit dinyatakan selesai hanya saat Definition of Done terpenuhi, bukan saat semua halaman terlihat “bagus” pada satu screenshot.
