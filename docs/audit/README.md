# Indeks Audit Modul

Peta existing: [audit-map](../audit-map/). Antrean audit: [M12](../M12_CHECKLIST_CHANGELOG.md).
Status dokumen disinkronkan 22 September 2026. "Belum dibuat" berarti dokumen ringkasan modul belum ada — bukan berarti modul belum pernah diaudit; cakupan per unit ada di [M12](../M12_CHECKLIST_CHANGELOG.md) dan CHECKLIST_AUDIT_TOTAL. Keberadaan dokumen tidak berarti audit lengkap atau bukti masih segar; periksa baseline dan cakupannya sebelum dipakai.
Hasil Tahap 2 DOC-GOV-20260922 (migrasi riwayat dokumen; **bukan** audit modul baru): [mapping Tahap 2](../history/DOC-GOV-20260922-mapping.md) dan [M16 pembaruan Tahap 2](../M16_AUDIT_MENYELURUH.md#pembaruan-tahap-2-doc-gov-20260922).

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
