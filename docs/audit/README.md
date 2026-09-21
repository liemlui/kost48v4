# Indeks Audit Modul

Peta existing: [audit-map](../audit-map/). Antrean audit: [M12](../M12_CHECKLIST_CHANGELOG.md).
Status dokumen disinkronkan 22 September 2026. "Belum dibuat" berarti dokumen ringkasan modul belum ada — bukan berarti modul belum pernah diaudit; cakupan per unit ada di [M12](../M12_CHECKLIST_CHANGELOG.md) dan CHECKLIST_AUDIT_TOTAL. Keberadaan dokumen tidak berarti audit lengkap atau bukti masih segar; periksa baseline dan cakupannya sebelum dipakai.

| Modul | Status |
|---|---|
| auth | belum dibuat |
| stays | belum dibuat |
| [frontend-auth](frontend-auth.md) | Diperiksa sebagian, 20 Sep 2026; baseline `d5d04cb`, test login dengan mock; kesegaran terhadap perubahan berikutnya perlu diperiksa |
| frontend-context | Belum ada dokumen modul; cakupan `frontend/src/context` sudah diaudit sebagai **FE-057** (M12, 17 Sep) dan `frontend/src/hooks` sebagai **FE-059**; pemilihan modul berikutnya mengikuti M12 #5 |
| auth-backend | Belum ada dokumen modul; catatan terkait ada pada temuan FE-002 (sesi/pertukaran token) di M12 |
