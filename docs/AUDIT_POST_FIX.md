# KOST48 V5 - AUDIT POST-FIX (2026-06-18)

> Rujukan post-fix untuk AI eksekutor. Status eksekusi terbaru tetap di `docs/M10_CHECKLIST_CHANGELOG.md`; file ini hanya merangkum bukti DEEP-01..05 dan hardening terkait.

---

## 1. Ringkasan Perbaikan

| ID | Perbaikan | Status | Verifikasi | Catatan |
|----|-----------|--------|------------|---------|
| DEEP-01 | Index `PasswordResetToken.token` via `@@index([token])` | Selesai | tsc 0, migration `20260618020000` | Redundan karena `@unique` sudah membuat unique index PG, tapi aman. |
| DEEP-02 | `Permissions-Policy: camera=(self)` | Selesai | `backend/src/main.ts` | OCR KTP/Tesseract tetap bisa akses kamera same-origin. |
| DEEP-03 | Header `Strict-Transport-Security` produksi | Selesai | `backend/src/main.ts` | Aktif hanya saat `NODE_ENV=production` / HTTPS. |
| DEEP-04 | Konsolidasi `lockApprovalBookingTx` | Selesai | tsc 0, 55/55 test PASS | Source of truth di `tenant-bookings.queries.ts`. |
| DEEP-05 | Refactor auth lookup ke `findUserByEmailOrPhone` | Selesai | tsc 0, 55/55 test PASS | Login tetap coba varian HP lebih banyak; forgot-password tetap minimal. |
| ENV | `backend/.env.production.example` | Selesai | file tersedia | Template env produksi lengkap untuk go-live. |
| SCRIPT | `backend/scripts/change-owner-password.ts` | Selesai | script diuji | Ganti password OWNER; JWT lama invalid via guard `pwdAt`. |
| TEST | `pretest:unit = npm run build` | Selesai | `backend/package.json` | Unit test selalu memakai `dist` segar. |

---

## 2. Status Dokumen Rujukan

| File | Status | Fungsi untuk AI eksekutor |
|------|--------|---------------------------|
| `docs/M01_MASTER.md` | Rujukan aktif | Blueprint bisnis dan batasan sistem. |
| `docs/M02_KEPUTUSAN_OWNER.md` | Rujukan aktif | Keputusan owner, role, dan UX owner/admin. |
| `docs/M03_FLOW_KONTRAK.md` | Rujukan aktif | Chain-of-custody flow kontrak, invoice, jurnal. |
| `docs/M04_KEUANGAN.md` | Rujukan wajib untuk uang | Invarian, DO-NOT-TOUCH, dan gate unit test finance. |
| `docs/M05_SIKLUS_HUNI.md` | Rujukan aktif | Booking, stay, checkout, tenant, renewal. |
| `docs/M06_OPERASIONAL.md` | Rujukan aktif | Staff, tiket, gudang, meter, operasional. |
| `docs/M07_PUBLIK_GROWTH.md` | Rujukan aktif | Public UI, marketing, layanan tambahan, SEO. |
| `docs/M08_DEPLOY_GO_LIVE.md` | Rujukan wajib go-live | Env produksi, fresh provision, smoke test. |
| `docs/M09_AUDIT.md` | Rujukan historis | Temuan audit forensik dan risiko lama. |
| `docs/M10_CHECKLIST_CHANGELOG.md` | Source of truth | Antrian aktif Fase A-E + changelog ringkas. |

---

## 3. Catatan Risiko

- DEEP-01 menambah index yang redundan, tetapi tidak mengubah perilaku aplikasi.
- DEEP-04 dan DEEP-05 adalah refactor/konsolidasi; perilaku login, forgot-password, dan booking lock tetap sama.
- `.env.production.example` dan `change-owner-password.ts` bersifat utilitas, tidak dipanggil otomatis oleh runtime.
- Satu-satunya blocker publish tetap F1-12, yaitu konfirmasi server/domain/env produksi oleh owner.

---

## 4. Aturan untuk AI Lemah

1. Jangan menjalankan task dari dokumen ini langsung. Mulai dari `docs/M10_CHECKLIST_CHANGELOG.md`.
2. Untuk setiap task, buka M-file rujukan yang disebut di fase M10.
3. Untuk task keuangan, baca `docs/M04_KEUANGAN.md` dan jalankan gate finance.
4. Untuk deploy, baca `docs/M08_DEPLOY_GO_LIVE.md` dan berhenti di langkah yang membutuhkan owner.
5. Jika ada konflik antar dokumen, M10 adalah status eksekusi terbaru; M-file domain adalah spesifikasi detail.

---

## 5. Verdict

Proyek tetap sehat untuk pre-go-live. Hardening DEEP-01..05 sudah selesai, test unit tercatat 55/55 hijau, dan dokumen aktif sudah diarahkan kembali ke M-file + M10 tanpa rujukan audit sementara.
