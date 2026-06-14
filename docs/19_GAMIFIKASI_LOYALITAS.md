# DOSSIER 19 — GAMIFIKASI & LOYALITAS TENANT
**Domain:** program poin loyalitas tenant + reward (retensi). **Fitur BARU (F4-9) — belum ada di kode.** Ide owner.
**Status:** 🟢 SELESAI (F4-9, 2026-06-15) — schema + poin (4 trigger) + katalog + redemption (jurnal M4) + frontend tenant/admin. Ide perluasan = §2b (backlog F4-13/F4-14).
**Tujuan:** retensi (CLV ↑) + kumpulkan data marketing sukarela ("kayak game biar happy") + onboarding minimal (nama+HP+KTP, sisanya via quest).

---
## 1. Aturan bisnis
- **Poin tidak dapat dipindahtangankan**, hanya tenant ber-stay aktif.
- **Reward DICATAT AKURAT di akuntansi** (M4) — bukan promosi siluman; laporan tetap jujur.
- **Penukaran WAJIB konfirmasi admin/owner** (M3), terutama diskon sewa (dampak pendapatan).
- **Rent-loyalty (D-16): tenant yang perpanjang (renew) tanpa putus kontrak TIDAK mengalami kenaikan harga sewa. Harga hanya bisa naik setelah gagal-bayar atau re-kontrak baru (tenant keluar lalu booking baru).** Ini memperkuat retensi & gamifikasi — tenant loyal dilindungi dari inflasi sewa.

## 2. Sumber poin (M1 — keempat ✅ IMPLEMENTASI SELESAI F4-9 inc.2/inc.4, 2026-06-15)
| Aktivitas | Pemicu | Poin (default, env-override) | Status |
|---|---|---|---|
| Perpanjang kontrak | renewal COMPLETED | +100 | ✅ |
| Bayar tepat waktu | invoice PAID & paidAt ≤ dueDate | +50 | ✅ |
| Lapor masalah & tervalidasi | tiket PORTAL tenant → CLOSED (divalidasi admin) | +30 | ✅ |
| Selesai quest onboarding | semua field profil terisi (kecuali KTP) | +200 sekali | ✅ |

### 2b. Sumber poin TAMBAHAN (ide owner 2026-06-15 — backlog F4-9+, perlu mekanisme baru)
| Ide | Konsep | Catatan kompleksitas |
|---|---|---|
| **Review saat renewal** | Tiap perpanjangan, tenant beri **review/masukan membangun + cerita keluhan** → dapat poin. | Perlu form review terhubung ke event renewal + 1 poin per renewal (idempotent per renewRequestId). Relatif mudah. |
| **Referral teman** | Tenant **mengajak teman** yang akhirnya jadi tenant → dapat poin. | Perlu pelacakan referral (kode/relasi tenant→tenant) + pemicu saat tenant baru aktif. Sedang. |
| **Quest perbaikan sikap** | Tenant A menegur (lapor) keburukan tenant B (**anonim** — B tak tahu siapa pelapor); B mengubah kebiasaan; A **konfirmasi ulang** B sudah membaik → B dapat poin (seperti quest). | KOMPLEKS: butuh alur laporan-antar-tenant anonim + status "perbaikan" + konfirmasi pelapor + privasi (B tak tahu pelapor). Desain hati-hati. |

## 3. Katalog reward (M2 — contoh, owner finalkan)
| Reward | Poin | Tipe | Catatan |
|---|---|---|---|
| Diskon sewa 5% | 500 | Diskon invoice | 1×/periode, admin approve. Akuntansi: jurnal diskon. |
| WiFi premium 1 bulan | 300 | Add-on layanan | |
| Token listrik gratis 50kWh | 200 | Diskon meter | |
| "Kamar Legendaris" badge | 1000 | Status + marketing | Bisa dipajang di katalog publik |
| Merchandise / gimmick fisik | 150 | Fisik | |

## 4. Implementasi (F4-9 — Fase 4)
- **Schema:** `LoyaltyPoint`, `LoyaltyReward`, `Redemption` (sourceType/sourceId idempotent seperti jurnal).
- **Akuntansi (M4):** diskon sewa → jurnal pengurang pendapatan; reward fisik → expense; WiFi → expense.
- **Dashboard tenant:** progress poin + katalog reward + riwayat penukaran.
- **Admin panel:** approve/reject redemption + lihat loyalitas tenant.

## 5. Catatan
- **Rent-loyalty (D-16):** aturan ini memperkuat gamifikasi — tenant loyal yang terus renew TANPA putus kontrak tidak akan mengalami kenaikan harga. Harga hanya naik jika tenant gagal bayar dan harus re-kontrak sebagai booking baru. Cross-ref dossier 03 (D-16), dossier 11 (renewal), dossier 17 (marketing).
- Program gamifikasi tidak boleh mengganggu integritas akuntansi (semua reward terjurnal).
- Poin expired setelah tenant keluar (tidak carry-over ke booking baru).
