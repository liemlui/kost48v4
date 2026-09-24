# Indeks Audit Modul

Peta existing: [audit-map](../audit-map/). Antrean audit: [STATUS](../STATUS.md).
Status dokumen disinkronkan 22 September 2026. "Belum dibuat" berarti dokumen ringkasan modul belum ada — bukan berarti modul belum pernah diaudit; cakupan per unit ada di [STATUS](../STATUS.md) dan [CHECKLIST_AUDIT_TOTAL](audit-checklist-total.md). Keberadaan dokumen tidak berarti audit lengkap atau bukti masih segar; periksa baseline dan cakupannya sebelum dipakai.
Hasil Tahap 2 DOC-GOV-20260922 (migrasi riwayat dokumen; **bukan** audit modul baru): [mapping Tahap 2](../arsip/DOC-GOV-20260922-mapping.md) dan [M16 pembaruan Tahap 2](audit-2026-09.md#pembaruan-tahap-2-doc-gov-20260922). Sebagian berkas audit digabung/dipindah ke arsip pada DOCS-CLEANUP-1 (24 Sep 2026); label di tabel ini memakai nama kanonik yang berlaku sekarang.

| Modul | Status |
|---|---|
| auth | belum dibuat |
| stays | belum dibuat |
| [auth-frontend (modul pertama)](audit-modul-2026.md) | Diperiksa sebagian, 20 Sep 2026; baseline `d5d04cb`, uji login dengan mock; kesegaran terhadap perubahan berikutnya perlu diperiksa |
| frontend-context | Belum ada dokumen modul; cakupan `frontend/src/context` sudah diaudit sebagai **FE-057** (M12, 17 Sep) dan `frontend/src/hooks` sebagai **FE-059**; pemilihan modul berikutnya mengikuti M12 #5 |
| [auth-backend / BE-002](backend-auth-2026-09-24.md) | Audit ulang statis selesai 24 Sep 2026: T1/T2 tetap tertutup; race reset-token T6 dan logout–refresh T7 masih terbuka; runtime/UAT belum dibuktikan |
| [Dashboard Owner / Z-19](owner-dashboard-z19-2026-09-25.md) | Audit statis 25 Sep 2026: 2 TINGGI, 1 SEDANG, 1 RENDAH; gate visual/runtime tetap terbuka |
| Uang + huni — bukti Audit 360° (Jul 2026), deep audit 29 Jul 2026, dan status temuan P1 (verifikasi statis 23 Sep 2026) | [audit-uang-huni-2026-07](audit-uang-huni-2026-07.md) — gabungan 3 berkas (DOCS-CLEANUP-1, 24 Sep 2026); P1-01/P1-02/P1-03 indikasi diperbaiki, P1-04..P1-09 UNKNOWN; angka historis tidak diubah |
| Operasional/Inventaris/Notifikasi/IoT — status Audit 360° P3–P8 (P4/P5) + 4 deep audit 29 Jul 2026 | [audit-operasional-2026-07](audit-operasional-2026-07.md) — dipindah dari M06 (B1, 23 Sep 2026); bukti bertanggal |
| UI/UX lintas portal — temuan AO-00..AO-23 (30 Jul 2026) | [audit-uiux-lintas-portal-2026-07](../arsip/audit-uiux-lintas-portal-2026-07.md) — dipindah dari M14 §1–§6 (B4, 23 Sep 2026); bukti bertanggal |
| UI/UX lintas portal — audit ulang dinamis 12 Sep 2026 | [audit-2026-09](audit-2026-09.md) — dipindah dari M14 §0 (B4), lalu digabung (DOCS-CLEANUP-1); laporan lengkap kini di [arsip/audit-uiux-total-2026-09-12.md](../arsip/audit-uiux-total-2026-09-12.md) |
| UI/UX lintas portal — status & antrean eksekusi Fase AO | [status-ao-lintas-portal](status-ao-lintas-portal.md) — dipindah dari M14 §7–§10 (B4); status aktif + DoD 27 gate `[ ]` |
| Tata dokumen + homepage produksi 15 Sep 2026 + audit UI/UX ulang 12 Sep 2026 | [audit-2026-09](audit-2026-09.md) — gabungan 3 berkas (DOCS-CLEANUP-1); temuan D-01..D-11, status Tahap 2, bukti bertanggal + hasil sesudah deploy |
| Kode — audit menyeluruh 30 Jul 2026 + modul frontend-auth (20 Sep 2026) | [audit-modul-2026](audit-modul-2026.md) — gabungan M16 §1–§5 (B4) + audit modul pertama (DOCS-CLEANUP-1); angka uji/build hasil Juli |
| Lintas scope — Audit Lintas Scope Reasonix 29 Jul 2026 | [audit-lintas-scope-2026-07-29](audit-lintas-scope-2026-07-29.md) — dipindah dari M01 § Audit Lintas Scope (B5, 23 Sep 2026); bukti bertanggal, temuan 1 CRITICAL + 2 HIGH + 10 rekomendasi |
| Cakupan audit total - checklist 135 ID (52 BE + 67 FE + 1 DB + 8 QA + 7 TL) | [audit-checklist-total](audit-checklist-total.md) - dipindah dari `docs/CHECKLIST_AUDIT_TOTAL.md` (B6, 23 Sep 2026); indeks cakupan + tabel hasil/checkpoint, arti centang tidak diubah |
| UI/UX total - laporan lengkap audit 12 Sep 2026 (arsip) | [arsip/audit-uiux-total-2026-09-12](../arsip/audit-uiux-total-2026-09-12.md) - dipindah dari `docs/AUDIT_UIUX_TOTAL_2026-09-12.md` (B6, 23 Sep 2026) lalu ke arsip (DOCS-CLEANUP-1); bukti bertanggal, temuan T-01..T-09 |
| Tata dokumen & dokumentasi kode - audit kekuatan dokumentasi 24 Sep 2026 | [audit-kekuatan-dokumentasi-2026-09-24](audit-kekuatan-dokumentasi-2026-09-24.md) - audit **read-only**: peta struktur docs, verdict per dimensi, koreksi angka audit eksternal; 26 temuan tautan pra-eksisting (0 baru), 19/46 modul backend tanpa JSDoc, dekorator respons OpenAPI = 0 |
