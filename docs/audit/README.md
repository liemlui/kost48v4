# Indeks Audit Modul

Peta existing: [audit-map](../audit-map/). Antrean audit: [M12](../M12_CHECKLIST_CHANGELOG.md).
Status dokumen disinkronkan 22 September 2026. "Belum dibuat" berarti dokumen ringkasan modul belum ada — bukan berarti modul belum pernah diaudit; cakupan per unit ada di [M12](../M12_CHECKLIST_CHANGELOG.md) dan CHECKLIST_AUDIT_TOTAL. Keberadaan dokumen tidak berarti audit lengkap atau bukti masih segar; periksa baseline dan cakupannya sebelum dipakai.
Hasil Tahap 2 DOC-GOV-20260922 (migrasi riwayat dokumen; **bukan** audit modul baru): [mapping Tahap 2](../history/DOC-GOV-20260922-mapping.md) dan [M16 pembaruan Tahap 2](audit-dokumentasi-2026-09.md#pembaruan-tahap-2-doc-gov-20260922).

| Modul | Status |
|---|---|
| auth | belum dibuat |
| stays | belum dibuat |
| [frontend-auth](frontend-auth.md) | Diperiksa sebagian, 20 Sep 2026; baseline `d5d04cb`, test login dengan mock; kesegaran terhadap perubahan berikutnya perlu diperiksa |
| frontend-context | Belum ada dokumen modul; cakupan `frontend/src/context` sudah diaudit sebagai **FE-057** (M12, 17 Sep) dan `frontend/src/hooks` sebagai **FE-059**; pemilihan modul berikutnya mengikuti M12 #5 |
| auth-backend | Belum ada dokumen modul; catatan terkait ada pada temuan FE-002 (sesi/pertukaran token) di M12 |
| Uang — temuan P1 Audit 360° (Jul 2026) | [p1-uang-status-2026-09-23](p1-uang-status-2026-09-23.md) — verifikasi **statis** 23 Sep 2026: P1-01/P1-02/P1-03 indikasi diperbaiki; P1-04..P1-09 UNKNOWN |
| Uang — bukti Audit 360° (Jul 2026) | [audit-360-uang-2026-07](audit-360-uang-2026-07.md) — dipindah dari M04 (S2.b4); bukti bertanggal, angka historis tidak diubah |
| Huni — bukti Audit 360° (Jul 2026) + deep audit 29 Jul 2026 | [audit-360-huni-2026-07](audit-360-huni-2026-07.md) — dipindah dari M05 (S2.c); bukti bertanggal |
| Operasional/Inventaris/Notifikasi/IoT — status Audit 360° P3–P8 (P4/P5) + 4 deep audit 29 Jul 2026 | [audit-operasional-2026-07](audit-operasional-2026-07.md) — dipindah dari M06 (B1, 23 Sep 2026); bukti bertanggal |
| UI/UX lintas portal — temuan AO-00..AO-23 (30 Jul 2026) | [audit-uiux-lintas-portal-2026-07](audit-uiux-lintas-portal-2026-07.md) — dipindah dari M14 §1–§6 (B4, 23 Sep 2026); bukti bertanggal |
| UI/UX lintas portal — audit ulang dinamis 12 Sep 2026 | [audit-uiux-ulang-2026-09-12](audit-uiux-ulang-2026-09-12.md) — dipindah dari M14 §0 (B4); laporan lengkap tetap di `docs/AUDIT_UIUX_TOTAL_2026-09-12.md` |
| UI/UX lintas portal — status & antrean eksekusi Fase AO | [status-ao-lintas-portal](status-ao-lintas-portal.md) — dipindah dari M14 §7–§10 (B4); status aktif + DoD 27 gate `[ ]` |
| UI/UX homepage produksi — 15 Sep 2026 (mobile-first) | [audit-homepage-produksi-2026-09-15](audit-homepage-produksi-2026-09-15.md) — dipindah dari M14 (B4); bukti bertanggal + hasil sesudah deploy |
| Tata dokumen — audit dokumentasi & urutan kerja 8 Sep 2026 | [audit-dokumentasi-2026-09](audit-dokumentasi-2026-09.md) — dipindah dari M16 §0 (B4); temuan D-01..D-11 + status Tahap 2 |
| Kode — audit menyeluruh 30 Jul 2026 | [audit-menyeluruh-2026-07](audit-menyeluruh-2026-07.md) — dipindah dari M16 §1–§5 (B4); angka test/build hasil Juli |
