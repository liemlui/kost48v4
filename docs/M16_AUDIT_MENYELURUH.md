# M16 — Audit Menyeluruh KOST48 V5

> **Rujukan arah aktif (8 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini menyimpan spesifikasi domain dan bukti bertanggal. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

Dokumen ini berisi dua lapisan audit yang tidak boleh dicampur:

1. **§0 — Audit dokumentasi & urutan kerja (8 September 2026).** Tata letak seri M, tautan, angka schema, dan antrean aktif. Verifikasi = pembacaan file aktif + schema/kode path, tanpa build/UAT.
2. **§1–§5 — Audit kode statis (30 Juli 2026, Reasonix).** 46 modul backend + frontend + cross-cutting. Tidak diulang pada sesi 8 Sep.

**Sumber keputusan:** `M02_KEPUTUSAN_OWNER.md` tetap lebih tinggi daripada dokumen ini.

---

<a id="0-audit-dokumentasi-dan-urutan-kerja--8-september-2026"></a>

## 0. Audit dokumentasi dan urutan kerja — 8 September 2026

### Pembaruan 22 September 2026 — audit arahan AI

Pembaruan ini terpisah dari bukti audit 8 Sep di bawah. Scope: governance, antrean, indeks audit dan petunjuk wrapper; tanpa audit ulang aplikasi/runtime.

| ID | Temuan | Status tindak lanjut |
|---|---|---|
| DOC-22-01 | Ringkasan AI_MASTER masih Stage 1, log mencatat Stage 5 selesai | Ringkasan/checkpoint diperbaiki; log lama diberi konteks historis |
| DOC-22-02 | QUICKREF menyebut wrapper belum dibuat; indeks audit menyebut frontend-auth belum ada | Disinkronkan dengan file/script dan audit yang tersedia; batas mode build/audit dinyatakan |
| DOC-22-03 | Antrean mencampur penanggung jawab/kesiapan; audit modul kedua belum terdefinisi | Prasyarat dan bukti penutupan diperjelas; penetapan modul/scope masih terbuka, bukan audit selesai |
| DOC-22-04 | M12 1.013 baris/166.098 byte sebelum edit; status aktif bercampur laporan historis | TERLAKSANA (Tahap 2): riwayat M12/M13 dan log AI_MASTER dipindah ke `docs/history/`; M12 aktif 137 baris, M13 147 baris. Lihat pembaruan Tahap 2 di bawah |
| DOC-22-05 | Prosedur awal M12 menduplikasi AGENTS dan mewajibkan orientasi umum | Rujukan AGENTS dan pembacaan sesuai task diterapkan; gate uang tetap |

Bukti perubahan: [M13 22 Sep](M13_CHANGELOG.md#2026-09-22-docs--koreksi-arahan-ai-dan-rancangan-penataan-menyeluruh). [Rancangan XL](plans/DOC-GOV-20260922.md) belum menjadi aturan aktif. Verifikasi dibatasi pada isi/diff/tautan; kontrol teknis keselamatan lintas-tool belum diuji.

<a id="pembaruan-tahap-2-doc-gov-20260922"></a>

### Pembaruan Tahap 2 - migrasi riwayat & penataan dokumen (DOC-GOV-20260922)

Status penerapan Tahap 2, **bukan** audit ulang aplikasi: tidak ada test/build/UAT/runtime yang dijalankan dan tidak ada file source aplikasi yang disentuh.

| Sub | Hasil | Bukti |
|---|---|---|
| S0 | 1 blank line EOF pada mapping dihapus | `git diff HEAD~1 HEAD --check` exit 0 |
| S2 | M12 1.017 -> 137 baris aktif; riwayat ke `docs/history/fase-ao.md`, `fase-ef.md`, `fase-lama.md`, `changelog/2026-09.md`; 6 anchor hidup | union M12+riwayat `[ ]`=23 `[x]`=101 gate=6; 163 tautan -> 0 rusak |
| S3 | M13 1.504 -> 147 baris (10 entri terbaru + indeks bulan); 53 entri September, 8 Agustus, 40 Juli + Release 23 Jul dipindah | jumlah heading sebelum/sesudah cocok; anchor `#2026-09-22-docs--koreksi-...` resolve |
| S4 | AI_MASTER 113 -> 77 baris (<=80); 9 checkbox §3 pindah ke AI_QUICKREF; roadmap + log historis ke `docs/history/governance-log.md` | 9 checkbox terbukti identik; total `[ ]` proyek tetap 40; 231 tautan -> 0 rusak |
| S5 | `docs/README.md` dan `docs/audit/README.md` menunjuk seluruh file riwayat baru | 0 tautan rusak |
| S6 | review akhir read-only (tanpa edit kecuali mapping §7) | [mapping §7](history/DOC-GOV-20260922-mapping.md) |

Bukti per sub-langkah, angka, dan penyimpangan yang dicatat ada di [mapping Tahap 2](history/DOC-GOV-20260922-mapping.md). Migrasi memindahkan isi tanpa mengubahnya; M12/M13 tetap pintu masuk antrean dan riwayat terbaru, sedangkan fase lama dan log governance ada di `docs/history/`.

**Lingkup:** seri aktif `docs/M00`–`M19` + `FORM_ISI_DATA_GO_LIVE.md` + `CLAUDE.md`/`AGENTS.md`. Arsip `docs/archieve/*` tidak dibaca ulang. **Bukan** audit runtime host, crawl UAT, atau regresi 46 modul.

**Fingerprint:** HEAD lokal `74068aa`; versi aplikasi lokal `1.3.0` / Portal Ringkas / `APP_BUILD_DATE` 2026-08-20. Host dilaporkan `v1.2.0` (M19) — SHA artefak server UNKNOWN.

**Empat status sesi ini:** implementasi aplikasi tidak diubah; verifikasi = audit docs + hitungan schema; deployment UNKNOWN; dampak runtime tidak diukur.

### 0.1 Fakta kode yang dicek ulang

| Item | Nilai 8 Sep | Catatan docs sebelumnya |
|---|---|---|
| Modul Nest `*.module.ts` di `backend/src/modules` | **46** | Sesuai klaim M00/M01/M16 Juli |
| Model Prisma `^model ` di `schema.prisma` | **62** termasuk `PublicRoomAvailability` | M00 indeks menyebut 61 dan tidak mencantumkan `PublicRoomAvailability`; M01 bilang 62 tetapi daftar tanpa model itu |
| Enum Prisma | **74** | Sesuai M00 |
| Versi FE kanonik | `frontend/src/config/version.ts` = 1.3.0 | Host 1.2.0 ≠ source lokal |

### 0.2 Urutan baca yang sah (setelah dirapikan)

Kerjakan dari atas ke bawah; jangan mulai dari ledger fase B–AL.

1. `CLAUDE.md` / `AGENTS.md` — batas izin dan larangan.
2. [M02](M02_KEPUTUSAN_OWNER.md) — keputusan owner.
3. [M12 § Antrean prioritas](M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif) — satu urutan kerja.
4. Domain: [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk EF; [M14](M14_AUDIT_UI_UX.md) untuk AO; [M08](M08_DEPLOY_GO_LIVE.md) untuk Fase A.
5. [M00](M00_CODEMAP.md) sebelum grep; [M01](M01_MASTER.md) untuk ground state.
6. [M13](M13_CHANGELOG.md) hanya untuk riwayat bertanggal, bukan antrean.

### 0.3 Temuan (dokumentasi / urutan kerja)

| ID | Severity | Temuan | Tindak lanjut sesi ini |
|---|---|---|---|
| D-01 | P1 | M12 punya dua “pintu” kerja: tabel antrean 8 Sep di atas, lalu protokol kedua + `## ANTRIAN EKSEKUSI AKTIF` tanpa `id="antrian-eksekusi-aktif"`. Banner M00–M18 menunjuk `#antrian-eksekusi-aktif` yang **tidak ada**. | Dual anchor dipasang; protokol digabung; ledger tetap di bawah dengan label riwayat |
| D-02 | P1 | Blok “Update 2026-09-08 … 07-23” di puncak M12 menduplikasi M13 dan menunda antrean. | Isi sesi dipindah ke pointer M13; M12 depan = protokol → antrean → status aktif → peta |
| D-03 | P2 | Peta rujukan M12 berhenti di M00/M09/M13; M14–M19 dan formulir go-live tidak masuk indeks kerja | Peta dilengkapi M00–M19 + FORM |
| D-04 | P2 | Status ringkas M12: Fase Y “152/153 hampir tuntas” vs M01 “153/153 selesai”; Fase Z masih “19 task terverifikasi”; Fase AL tidak ada di tabel status | Tabel status aktif dipisah dari ledger historis; Y/Z/AL dikoreksi sebagai riwayat |
| D-05 | P2 | M00: 61 vs 62 model; `PublicRoomAvailability` absen; baris “rangkuman … M13 dan M13”; tanggal banner 6 Sep | Indeks model + banner dikoreksi |
| D-06 | P2 | M01 §1 (Juli) masih menempatkan temuan X1 journal best-effort sebagai CRITICAL terbuka, padahal AN/AL/M16 Juli sudah menutup journal blocking | Banner historis ditambahkan di § tersebut; bukan menghapus bukti Juli |
| D-07 | P2 | M16 §1/§4/§5: “siap produksi” + sisa AO-17..23 sebagai terbuka. AO-17 dan AO-22 sudah `[x]` di M12; AO-18/19/20 parsial | Putusan Juli dikualifikasi; §4 diselaraskan ke M12 8 Sep |
| D-08 | P2 | M14 adalah dua dokumen menempel: audit AO 30 Jul (~1000 baris) lalu lampiran portal 2 Jul tanpa daftar isi | Daftar isi + penanda lampiran ditambahkan |
| D-09 | P3 | M01 §7 menampilkan password seed DEV di dokumen master | Diganti pointer ke M11 (nilai tetap di M11 sebagai default DEV) |
| D-10 | INFO | `IotRetiredStreamController` masih ada (rekomendasi X10 Juli). Fase MA ditunda → bukan izin hapus/ekstraksi | Dicatat; tidak dikerjakan |
| D-11 | INFO | Working tree: docs M01/M08/M11–M14/M19 sudah dirty sebelum sesi ini; `kost48-deploy-bundled/` untracked. Tidak di-reset | Dipertahankan |

### 0.4 Yang sudah rapi dan tidak diulang

- Arah EF / satu API / MA ditunda konsisten di M02, M12 antrean, M19, CLAUDE/AGENTS.
- Gate AO-03 alat (8 Sep) dan EF-00/02 UNKNOWN sudah tercatat M12/M13/M14/M19.
- Audit kode Juli (§1–§5 di bawah) dan I-01/`610395c` tidak dibuka ulang.
- Password yang pernah di `GO_LIVE_DATA_ISI.md` sudah diarsipkan; rotasi OWNER produksi tetap kewajiban owner (M13 7 Sep).

### 0.5 Antrean kerja setelah rapikan (bukan izin baru)

Sama dengan [M12 antrean prioritas](M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif): EF-00/02 BLOCKED data host → AO alat/crawl setelah izin → EF-07/08 uji terarah → EF-04/06 rencana → AL hanya rekonsiliasi bukti Z-19/H15 → Fase A owner.

---

## 1. Ringkasan Eksekutif (audit kode 30 Juli 2026)

> Snapshot bertanggal. Angka test/build di tabel adalah hasil Juli, bukan sesi 8 September. Klaim “siap produksi” di bawah = **kesiapan kode inti pada hari audit**, bukan sign-off host/UAT/Fase A.

| Area | Hasil | Keputusan |
|---|---|---|
| Build & typecheck | 🟢 backend `tsc --noEmit` clean · frontend `npm run build` 162 chunks + PWA verified | Lulus (30 Jul) |
| Unit test backend | 🟢 74/74 pass (6 suite) | Lulus (30 Jul) |
| Unit test frontend | 🟢 135/135 pass (31 file) | Lulus (30 Jul) |
| Keamanan (authz/secrets/SQLi) | 🟢 solid — default-deny global, no secret hardcode, raw query terparameterisasi | Sehat |
| Atomisitas keuangan | 🟢 best-effort journal sudah BLOCKING (AN-03), WiFi sale + deposit ledger atomik | Sehat |
| Race condition | 🟡 1 minor (I-01) — sudah diperbaiki | Sehat |
| Frontend | 🟢 tidak ada anti-pattern hooks-order tersisa (AO-02 fixed) | Sehat |

### Putusan (30 Juli, dikualifikasi 8 Sep)

Codebase **matang dari sisi kode inti pada audit Juli**. Pra-go-live tetap: infrastruktur (Fase A), identitas host (EF-00/02), crawl/sign-off AO (AO-03/13/14 dan sisa parsial AO-18/19/20 + AO-21/23). AO-17 dan AO-22 sudah ditutup di checklist M12; jangan mengulang.

---

## 2. Cakupan & Metode

- **Baseline:** `tsc --noEmit` (backend), `npm run build` (frontend + stamp PWA), `npm run test:unit` (backend), `npx vitest run` (frontend).
- **Keamanan:** pemetaan guard global, audit `@Public()`, rate limit, verifikasi HMAC IoT, upload file, raw query/SQLi, hardcoded secrets.
- **Keuangan & atomisitas:** audit `.catch()` best-effort (33 titik), pattern journal posting, financial lock.
- **Race & transaksi:** lock `FOR UPDATE`, validasi di dalam/di luar `$transaction`.
- **Frontend:** urutan hooks, error handling, a11y.
- **Verifikasi nyata:** tiap kesimpulan ditelusuri ke file/simbol kode, bukan klaim dokumen.

Tingkat kepastian: `CODE` (dikonfirmasi dari implementasi), `VERIFY` (dijalankan via command build/test).

---

## 3. Temuan

### 3.1 Keamanan — 🟢 solid

| # | Area | Bukti | Status |
|---|---|---|---|
| S-01 | Default-deny global | `app.module.ts` memakai `APP_GUARD` `JwtAuthGuard` + `RolesGuard`; semua endpoint butuh JWT kecuali `@Public()` | ✅ |
| S-02 | `@Public()` hanya endpoint disengaja | login/refresh/logout/reset, katalog publik, FAQ, IoT ingest, booking publik, cron token | ✅ |
| S-03 | Rate limit | auth 15 menit `failClosed`, refresh/logout 20/mnt, cron + availability PIN ketat | ✅ |
| S-04 | IoT device ingest | water-ingest pakai HMAC signature + rawBody + nonce; cron pakai `timingSafeEqual` token header | ✅ |
| S-05 | Upload file | `ParseFilePipe` + `FileTypeValidator` (jpg/png/webp) + `MaxFileSizeValidator` (2–3 MB) | ✅ |
| S-06 | SQL injection | seluruh `$queryRaw`/`$queryRawUnsafe` terparameterisasi atau escaped (`accounting-schema.guard` escape `""`); tidak ada interpolasi user input mentah | ✅ |
| S-07 | Hardcoded secrets | 0 ditemukan di `backend/src` & `frontend/src` | ✅ |
| S-08 | Production guard | `JWT_SECRET` ≥32 char + `CORS_ORIGIN` wajib, app menolak start bila lemah | ✅ |
| S-09 | Security headers | CSP, HSTS (prod), `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` | ✅ |

### 3.2 Keuangan & atomisitas — 🟢 sudah diperbaiki

- **AN-03 terverifikasi:** seluruh `.catch()` pada posting journal sudah dihapus → BLOCKING (throw, rollback tx). Contoh nyata `wifi-sales.service.ts` memakai `postWifiSaleTx(tx, …)` di dalam `$transaction`.
- **Deposit ledger blocking** (`payment-submissions.service.ts`): deposit diterima wajib tercatat di ledger, tanpa recovery path.
- **Financial lock WiFi sale** (`assertWifiSaleJournalAllowsChange`): data terjurnal tidak boleh diubah/dihapus senyap.
- **33 titik `.catch()` tersisa** = pattern side-effect/notification yang BENAR untuk best-effort (notifikasi, cleanup KTP, advisory unlock, deepseek text). Tidak ada yang menyangkut integritas finansial.

### 3.3 Race & transaksi — 🟡 1 minor (sudah fix)

| ID | Temuan | Severity | Status |
|---|---|---|---|
| I-01 | `validateMovement` (inventory-movements) membaca `qtyOnHand` di luar `$transaction` — TOCTOU pada pesan error saja | LOW | ✅ diperbaiki commit `610395c` — validasi dipindah ke dalam tx memakai baris yang sudah `FOR UPDATE` |
| O-02 | `assertNoActiveWork` (staff-routines) dulunya di luar tx | LOW | ✅ sudah fix — kini dipanggil di dalam `$transaction` dengan `tx` sebagai client |

Catatan: invariant `stok tidak boleh negatif` selalu dijaga `ensureInventoryQtySyncedTx` di dalam tx, sehingga I-01 tidak pernah menjadi bug integritas data — hanya pesan error yang bisa basi.

### 3.4 Frontend — 🟢 sehat

- AO-02 (urutan hooks `MyLoyaltyPage`) sudah diperbaiki di commit `567e9f2`.
- Tidak ada anti-pattern top-level `return` sebelum hooks tersisa; semua early-return yang dicek berada di dalam callback/handler.
- Error handling via TanStack Query konsisten.

---

## 4. Bukan Defect (terdokumentasi terpisah)

- **Fase A (Pra-Go-Live):** blocked owner — server/domain/env; identitas DB produksi tidak diasumsikan dari UAT.
- **Fase EF:** EF-00/02 menunggu data host; EF-01/03/05 implementasi lokal; kelayakan 512 MB belum PASS. Detail: `docs/M19_EFISIENSI_HOSTING_512MB.md`.
- **Fase AO sisa (selaras M12 8 Sep):** AO-03 (alat/fixture lalu provisioning), AO-13 (crawl tiga role), AO-14 (sign-off), AO-18/19/20 **parsial**, AO-21, AO-23. AO-17 dan AO-22 sudah selesai. Detail: `docs/M14_AUDIT_UI_UX.md`.
- **AL / Z-19:** H1–H15 dilaporkan selesai 7 Jul; verifikasi manual Owner untuk Z-19 belum punya bukti spesifik.

---

## 5. Kesimpulan

- **Risk rating kode (30 Jul): 🟢 LOW** — 0 HIGH, 0 MEDIUM terbuka, 1 LOW (sudah fix).
- **Kesiapan rilis (8 Sep):** kode inti Juli ≠ bukti host, ≠ crawl UAT, ≠ rotasi kredensial OWNER. Jangan mengutip §1 sebagai sign-off produksi.
