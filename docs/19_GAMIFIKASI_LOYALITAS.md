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

### 2b. Sumber poin TAMBAHAN (ide owner 2026-06-15 — SEMUA ✅ SELESAI)
| Ide | Konsep | Status |
|---|---|---|
| **Review saat renewal** (+30) | Tiap perpanjangan, tenant beri review/masukan → poin. | ✅ F4-13a (idempotent `RENEWAL_REVIEW:id`). |
| **Referral teman** (+150) | Tenant punya `referralCode`; teman pakai saat booking → referrer dapat poin saat teman jadi tenant aktif. | ✅ F4-13 referral (S-4: `TenantReferral`, sweeper `runReferralRewards`). |
| **Quest perbaikan sikap** (+40) | A lapor B (**anonim**); admin moderasi; B diberi tahu tanpa identitas A; B perbaiki; **A atau admin** konfirmasi → B dapat poin. | ✅ F4-13c (S-4: `PeerBehaviorReport`, privasi pelapor dijaga). |
| **Reward → tugas staf** | Reward SERVICE_ADDON yang menukar poin jadi perintah staf (bersihkan area umum/dapur/kamar mandi luar). | ✅ F4-13b (`LoyaltyReward.fulfillmentTaskCategory` → auto-create tiket). |

## 3. Katalog reward (M2 — contoh, owner finalkan)
| Reward | Poin | Tipe | Catatan |
|---|---|---|---|
| Diskon sewa 5% | 500 | Diskon invoice | 1×/periode, admin approve. Akuntansi: jurnal diskon. |
| WiFi premium 1 bulan | 300 | Add-on layanan | |
| Token listrik gratis 50kWh | 200 | Diskon meter | |
| "Kamar Legendaris" badge | 1000 | Status + marketing | Bisa dipajang di katalog publik |
| Merchandise / gimmick fisik | 150 | Fisik | |

> **Preferensi owner (2026-06-15):** utamakan reward **layanan in-house** (pembersihan kamar, **cat ulang kamar**, voucher WiFi) daripada diskon sewa — lebih hemat. **Nilai poin:** 1 poin ≈ Rp (env `LOYALTY_POINT_RUPIAH_VALUE`, default Rp100); admin form menyarankan biaya poin dari nilai rupiah reward (F4-9 selesai).
> **Reward "special request" → tugas staf (backlog F4-13b):** reward yang menukar poin jadi **perintah kerja staf** — mis. bersihkan **kamar mandi luar, area umum, dapur umum**. Saat FULFILLED → auto-create tiket tugas staf (+ jurnal reward M4).

## 4. Implementasi (F4-9 — Fase 4)
- **Schema:** `LoyaltyPoint`, `LoyaltyReward`, `Redemption` (sourceType/sourceId idempotent seperti jurnal).
- **Akuntansi (M4) — SELARAS KODE (L-3, 2026-06-15):** `postRewardFulfillmentTx` mengklasifikasi per `LoyaltyRewardType`: **RENT_DISCOUNT → DR 4000 (kontra-pendapatan sewa)**, **METER_DISCOUNT → DR 4100 (kontra-pendapatan listrik)**, **SERVICE_ADDON/PHYSICAL → DR 6300 (beban marketing)**; semua CR 2100 (utang reward). BADGE/nilai 0 = tak menjurnal. Fallback aman ke 6300 bila COA pendapatan tak ada. (Sebelumnya semua reward → 6300; kini diskon sewa/listrik benar sebagai pengurang pendapatan. UAT: jurnal seimbang per tipe.)
- **Dashboard tenant:** progress poin + katalog reward + riwayat penukaran.
- **Admin panel:** approve/reject redemption + lihat loyalitas tenant.

## 5. Catatan
- **Rent-loyalty (D-16):** aturan ini memperkuat gamifikasi — tenant loyal yang terus renew TANPA putus kontrak tidak akan mengalami kenaikan harga. Harga hanya naik jika tenant gagal bayar dan harus re-kontrak sebagai booking baru. Cross-ref dossier 03 (D-16), dossier 11 (renewal), dossier 17 (marketing).
- Program gamifikasi tidak boleh mengganggu integritas akuntansi (semua reward terjurnal).
- Poin expired setelah tenant keluar (tidak carry-over ke booking baru).
