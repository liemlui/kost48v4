---
name: project-default-data-2026-06-24
description: Sumber kebenaran data seed KOST48 — kredensial, kamar, FAQ 37 item, fasilitas, dummy tenant
metadata:
  type: project
---

`docs/DEFAULT_DATA.md` adalah **satu-satunya sumber kebenaran** untuk semua data seed (kamar, FAQ, fasilitas, kredensial, dummy tenant).

**Fakta kunci:**
- Tenant dummy: `{slug}.tenant@kost48.test` / `Tenant#2026` (format di seed-dev-via-api.js)
- DB mungkin masih berisi seed LAMA format `tenant.kamarX@kost48-dummy.com` / `tenant123` → perlu re-seed dengan `npm run seed:dev:reset` + `npm run seed:dev:api`
- FAQ kanonik: `faqs.service.ts` → `DEFAULT_FAQS` (37 FAQ total: 18 website + 19 operasional); seed via `POST /api/faqs/seed`
- `insert-faqs.js` sudah DIMATIKAN (usang, konten beda, galon salah)
- Galon = **Rp 20.000** (bukan 15.000 yang ada di script lama)

**Why:** Owner minta semua data dummy/real (FAQ, fasilitas, kredensial) diseragamkan di satu MD file agar tidak ada inkonsistensi antar script.

**How to apply:** Saat ada pertanyaan tentang akun, FAQ, kamar, atau seed — arahkan ke `docs/DEFAULT_DATA.md`. Jika ada script lain inkonsisten, MD-file yang benar.

Lihat [[seed-dummy-event-path-2026-06-16]] untuk konteks seed via HTTP event-path.
