# Evaluasi Arsitektur Jangka Panjang — KOST48 V5

> **Status:** Read-only · **Tujuan:** Dokumentasi keputusan arsitektur untuk referensi owner/developer.
> **Dibuat:** 2026-06-19 · **Konteks:** Fase E — Polish & Teknis (E3e).

---

## 1. Refresh Token JWT

| Aspek | Detail |
|-------|--------|
| **Prioritas** | MEDIUM |
| **Estimasi** | 1-2 sesi |
| **Kondisi saat ini** | Access JWT tanpa refresh token. Token expired → user harus login ulang. Masa berlaku token cukup panjang (±24 jam) untuk mengurangi friksi. |
| **Risiko** | Token bocor → akses abadi sampai manual revoke. Tidak ada mekanisme rotate/blacklist di sisi server. |
| **Rekomendasi** | Implementasi access/refresh token pair: access 15 menit + refresh 7 hari dengan rotation (refresh lama di-invalidasi saat refresh baru dikeluarkan). Backend perlu endpoint `POST /auth/refresh` (terima refresh token → return new access + refresh pair). Frontend interceptor otomatis retry 401 dengan refresh. **Lakukan sebelum publish ke publik** untuk keamanan produksi. |
| **Catatan** | Library `@nestjs/jwt` sudah terpasang; implementasi refresh token cukup dengan tambahan tabel `RefreshToken` di Prisma (expiresAt + revokedAt) atau JWT terpisah dengan `jti` untuk blacklisting. |

## 2. Nonce-based CSP (Content Security Policy)

| Aspek | Detail |
|-------|--------|
| **Prioritas** | LOW |
| **Estimasi** | 1 sesi |
| **Kondisi saat ini** | Tidak ada header CSP di response. Aplikasi SPA rentan XSS jika ada injeksi script via input pengguna. |
| **Rekomendasi** | Pasang middleware Express/NestJS yang menambahkan header `Content-Security-Policy` dengan nonce untuk setiap request. Nonce di-generate per-request dan disisipkan di tag `<script>` HTML. Untuk SPA Vite, integrasi bisa via `html-webpack-plugin` template injection + middleware nonce. |
| **Catatan** | Bisa ditunda pasca go-live. Prioritas lebih rendah karena belum publik; attack surface kecil. |

## 3. WA/Email Urgent Alert

| Aspek | Detail |
|-------|--------|
| **Prioritas** | LOW |
| **Estimasi** | 2-3 sesi |
| **Kondisi saat ini** | Notifikasi hanya in-app (AppNotification model). Belum ada integrasi WhatsApp/email untuk notif urgent (pembayaran bermasalah, tiket SLA kritis, dll). |
| **Rekomendasi** | Utamakan PWA Web Push (sudah ada `PushService` + VAPID). WA/Email opsional untuk notif yang benar-benar urgent (escalation L2, forced checkout gagal). Integrasi WA via API WhatsApp Business atau gateway pihak ketiga. **Jangan kerjakan sebelum PWA push stabil dan dipakai tenant.** |
| **Catatan** | Untuk 48 kamar dengan 1 staf, PWA push sudah mencukupi. WA/email adalah nice-to-have. |

## 4. Event Bus / Message Queue

| Aspek | Detail |
|-------|--------|
| **Prioritas** | VERY LOW |
| **Estimasi** | N/A (overengineering) |
| **Kondisi saat ini** | AutoOps berjalan sequential dalam proses yang sama. Side effect (notifikasi, audit log) dilakukan inline dalam service. |
| **Rekomendasi** | **TIDAK PERLU.** Untuk skala 48 kamar dengan operasi sequential yang sudah teraudit (A4), message queue hanya menambah kompleksitas tanpa manfaat berarti. Operasi saat ini sudah idempotent dan di-protect oleh `FOR UPDATE` locking. Jika di masa depan sistem tumbuh ke ratusan kamar + banyak staf, baru evaluasi RabbitMQ / BullMQ untuk job queue. |
| **Catatan** | Arsitektur monolitik NestJS dengan auto-ops interval sudah cukup untuk skala ini. Investasi di readability code (seperti refactor split E3a) lebih berharga daripada infra queue. |

---

## Ringkasan Prioritas

| # | Item | Prioritas | Kapan |
|---|------|-----------|-------|
| 1 | Refresh token JWT | MEDIUM | **Sebelum publish publik** |
| 2 | Nonce-based CSP | LOW | Bisa setelah go-live |
| 3 | WA/Email alert | LOW | Setelah PWA push stabil |
| 4 | Event bus / MQ | VERY LOW | Tidak perlu saat ini |

Keputusan: **Fokus ke refresh token JWT sebagai prioritas tertinggi.** Sisanya bisa ditunda tanpa dampak ke go-live.
