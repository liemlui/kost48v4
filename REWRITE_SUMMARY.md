# Kost48 Role-Based Restructure Bundle

Bundle ini berisi rewrite besar yang difokuskan ke fondasi role-based restructure sesuai docs sync terbaru.

## Yang diubah di frontend
- Navigasi dipisah per role: Owner / Admin / Staff / Tenant.
- Dashboard dipisah per role dengan fokus surface yang berbeda.
- Duplicate CTA check-in di dashboard dihapus.
- `RenewStayModal` dibuat defensive terhadap invalid/null date agar tidak menjatuhkan halaman.
- Halaman ticket backoffice diubah menjadi progress-management surface, bukan create surface.
- Akses route frontend dipersempit per role.
- Terminologi tenant + portal access dirapikan di area resource config.

## Yang diubah di backend
- `POST /tickets` dibatasi untuk role TENANT agar selaras dengan ticket tenant-only flow.
- Ticket create dari tenant sekarang auto-infer `stayId` dan `roomId` dari current active stay jika ada.
- Data tenant diperkaya dengan `portalUserSummary` agar tenant + portal access lebih menyatu.

## Catatan penting
- Ini adalah rewrite bundle tahap besar awal, bukan jaminan bahwa seluruh roadmap vNext sudah 100% selesai.
- Fokus batch ini adalah fondasi role-based surface + bug P0 renew modal + arah ticket tenant-only.
