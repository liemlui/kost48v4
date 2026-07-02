# CHECKLIST 17 — Owner/Admin: Dashboard + AI (DeepSeek) + Notifikasi + Reminder + Market Analysis

> **Baca `00_INDEX.md` + `docs/M12_AI_OWNER_ADMIN.md` dulu.** Prefiks temuan: **`C17-xx`**. **Role:** OWNER (+ADMIN). **Audit-only.** DB UAT.
> ⚠️ **Butuh akun OWNER test** — seed dulu (INDEX §2a). JB-08 (AI manual-only) adalah fokus utama.

## Prasyarat — seed owner test
```bash
cd backend
# pastikan DATABASE_URL = 5433/kost48_v3_pro (UAT), BUKAN 5432
OWNER_EMAIL=owner.test@kost48.test OWNER_PASSWORD='OwnerTest#2026' OWNER_FULLNAME='Owner Test Audit' node scripts/seed-owner.js
```
- [ ] 0. Owner ter-seed & bisa login (API balas token role OWNER)? Bila gagal → catat & audit bagian owner pakai admin seadanya.

## Ruang lingkup
| Halaman | URL | File FE | Role (dari App.tsx) |
|---|---|---|---|
| Dashboard umum | `/dashboard` | `pages/dashboard/DashboardPage.tsx` (→ `DashboardAdmin`/`DashboardStaff`) | **ADMIN, STAFF** |
| Dashboard owner | `/owner-dashboard` | `pages/dashboard/OwnerDashboardPage.tsx` | **OWNER only** |
| Dashboard admin (khusus) | `/admin-dashboard` | `pages/dashboard/DashboardAdmin.tsx` | **OWNER only** ⚠️ |
| Workspaces admin | (dalam dashboard) | `pages/dashboard/AdminWorkspaces.tsx` | |
| Market analysis | `/market-analysis` | `pages/marketing/MarketAnalysisPage.tsx` (+ `CacClvDashboard`, `DemographicsPanel`) | **OWNER only** |
| Notifikasi | `/notifications` | `pages/notifications/NotificationsPage.tsx` | login |
| Reminder preview | `/reminders` | `pages/reminders/ReminderPreviewPage.tsx` | OWNER/ADMIN |

> ⚠️ **Catatan penting:** `/admin-dashboard` & `/market-analysis` = **OWNER only** (bukan ADMIN). `/dashboard` = ADMIN/STAFF. Jadi ADMIN masuk lewat `/dashboard`, sedangkan `/admin-dashboard` khusus OWNER. Jangan tertukar saat uji guard.

**Backend:** `owner/dashboard`, `admin/dashboard`, `owner-ai` (+drafts), `ai`, `market-analysis` (`deepseek.client.ts`), `me/notifications`, `push`, `admin/reminders/preview` + `mock-send`, `analytics`, `audit-log`. Model: `AiDraft`, `AuditLog`, `AppNotification`, `PushSubscription`, `MarketAnalysis`.

## Langkah audit

### A. Dashboard owner `/owner-dashboard` (rekalkulasi KPI)
- [ ] 1. Login OWNER → `/owner-dashboard`. Screenshot. KPI (okupansi, pendapatan, dll) + chart tampil?
- [ ] 2. **Rekalkulasi:** ambil 1 KPI (mis. okupansi = kamar terisi / 48). Hitung manual dari data, cocokkan. Salah = **C17-xx HIGH**.
- [ ] 3. **JB-18:** tidak ada NaN/Infinity/chart width -1. Periode tanpa data → empty-state.
- [ ] 4. Angka dashboard konsisten dengan laporan keuangan (CHECKLIST_13)? (mis. pendapatan bulan ini sama).

### B. AI DeepSeek — JB-08 (FOKUS UTAMA)
- [ ] 5. **Tombol AI = manual only.** Cari tombol AI (brief, finance, payment review, ops, inventory). AI TIDAK boleh jalan otomatis saat load halaman. Amati Network saat buka dashboard: adakah panggilan `owner-ai`/`deepseek` tanpa klik? Kalau ada auto-call berbayar → **C17-xx HIGH**.
- [ ] 6. **Role guard:** login ADMIN → tombol AI muncul (OWNER/ADMIN boleh). Login STAFF/TENANT → tombol AI **tidak** muncul & endpoint `owner-ai/*` ditolak. Uji via curl:
  ```bash
  curl -s -X POST -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/owner-ai/... | head -c 200   # harus 403
  ```
- [ ] 7. Klik tombol AI → menghasilkan **draft** (`AiDraft`), BUKAN langsung eksekusi. Draft tersimpan & bisa direview?
- [ ] 8. **Approve draft** → aksi final terjadi + **`AuditLog` dengan `meta.ai`** tercatat. Verifikasi audit log:
  ```bash
  curl -s -H "Authorization: Bearer <OWNER_TOKEN>" "http://localhost:3000/api/... audit ..." | grep -i "ai"
  ```
- [ ] 9. **JB-12:** klik tombol AI 2× cepat → tidak 2 panggilan berbayar / 2 draft dobel?
- [ ] 10. AI error (DeepSeek down / API key salah) → ditangani dengan pesan ramah, bukan crash / bukan biaya hangus tanpa hasil?
- [ ] 11. **Draft finance/payment:** AI hanya merekomendasi; manusia tetap approve. Tidak ada jurnal terbentuk dari AI tanpa approval manusia (JB-09/JB-08 gabungan).

### C. Market analysis `/market-analysis`
- [ ] 12. Buka. Analisa (SWOT/PESTLE/CAC-CLV/demografi) tampil? **JB-08:** analisa AI dipicu manual, bukan auto.
- [ ] 13. CacClvDashboard & DemographicsPanel: angka masuk akal, tidak NaN, pembagian aman.

### D. Notifikasi `/notifications` + Reminder + Push
- [ ] 14. **JB-15:** notifikasi in-app (bukan SMS/email eksternal). Daftar notifikasi milik user login tampil? Mark-as-read jalan?
- [ ] 15. Reminder preview (`/admin/reminders/preview`): pratinjau reminder tampil. **`mock-send`** — pastikan ini MOCK (tidak benar-benar kirim ke luar). Kalau mock-send benar-benar mengirim ke pihak eksternal → catat.
- [ ] 16. Push subscription (`PushSubscription`): PWA push — cek registrasi (detail PWA di CHECKLIST_19). **JB-19:** subscription milik user sendiri.
- [ ] 17. **JB-19:** `/notifications` tidak menampilkan notifikasi milik user lain. Coba curl endpoint dengan token beda.

### E. Keamanan
- [ ] 18. **JB-14:** `/owner-dashboard`, `/admin-dashboard`, `/market-analysis` = OWNER only → login **ADMIN** akses ketiganya harus **DITOLAK** (redirect). `/dashboard` = ADMIN/STAFF → TENANT ditolak. Uji tiap kombinasi UI + curl endpoint (`/api/owner/dashboard`, `/api/market-analysis`).
- [ ] 19. AuditLog tidak bisa diubah/dihapus dari UI (immutability jejak audit).

### F. Kode
- [ ] 20. `owner-ai.service.ts` + `ai-context-builder`: konfirmasi alur draft→approve, guard role, AuditLog meta.ai, idempotent. Tidak ada auto-trigger.
- [ ] 21. `deepseek.client.ts`: API key tidak bocor ke FE/respons; error handling; timeout.

## HASIL TEMUAN
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Owner test ter-seed & login OK (atau kegagalan dicatat).
- [ ] KPI dashboard direkalkulasi & dicocokkan dengan laporan.
- [ ] JB-08 diverifikasi menyeluruh: AI manual-only, role OWNER/ADMIN, draft→approve→AuditLog meta.ai, tidak auto-run, tidak dobel.
- [ ] Notifikasi in-app (JB-15) + privasi (JB-19) dicek; mock-send dipastikan mock.
- [ ] JB-14 dashboard owner/admin diuji.
- [ ] Temuan `C17-xx`. Update Progres Global baris 17.
