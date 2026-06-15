# DESAIN GAMIFIKASI / LOYALITAS TENANT (F4-9) — deliverable desain
**Tanggal:** 2026-06-13 · Sumber: ide owner (Bagian 5 K-b) + spesifikasi M1-M4 (`04_KEPUTUSAN_OWNER.md` Bagian 7).
**Tujuan:** retensi (CLV ↑) + pengumpulan data marketing sukarela + pengalaman menyenangkan ("kayak game"). Belum diimplementasi — desain sebelum koding.

## 0. Prinsip
- Poin = mata uang loyalitas tenant, **tidak bisa dipindahtangankan**, hanya untuk tenant ber-stay aktif.
- Reward **DICATAT AKURAT di akuntansi** (M4) — bukan promosi siluman. Laporan tetap jujur.
- Penukaran reward **WAJIB konfirmasi admin/owner** (M3) — terutama diskon sewa (dampak pendapatan).

## 1. Sumber poin (M1 — keempat dipakai)
| Aktivitas | Poin | Pemicu |
|---|---|---|
| Perpanjang kontrak | + (nilai owner-set, mis. 100) tiap perpanjangan | saat renewal COMPLETED |
| Bayar tepat waktu | + (mis. 20) bila pelunasan ≤ jatuh tempo | saat invoice PAID & paidAt ≤ dueDate |
| Streak menghuni | + (mis. 10) tiap bulan berturut + bonus milestone (3/6/12 bln) | job bulanan / saat renewal |
| Quest profil/survei | + (mis. 50) sekali per quest | saat tenant melengkapi data marketing sukarela |

> Nilai poin = **konfigurasi owner** (tabel setelan, bukan hardcode) agar bisa di-tuning tanpa deploy.

## 2. Katalog reward (M2 — semua dipakai)
| Reward | Biaya poin (owner-set) | Pencatatan akuntansi (M4) |
|---|---|---|
| Gratis WiFi periode tertentu | mis. 200 | WiFi diberikan gratis → beban promosi (6300 Marketing) sebesar harga WiFi normal, ATAU WiFi Sale Rp0 + beban promosi pengimbang |
| Gratis pembersihan kamar | mis. 150 | Beban promosi/cleaning (6210) sebesar biaya layanan |
| Diskon sewa | mis. 300 = Rp X | **Line DISCOUNT** di invoice sewa berikutnya (mengurangi revenue 4000) — sudah didukung kode (InvoiceLineType.DISCOUNT) |
| Naik tier kamar / merchandise / lainnya | owner-set | beban promosi / penyesuaian sesuai jenis |

## 3. Flow penukaran (M3 — perlu approve)
```
Tenant lihat katalog reward (poin cukup) → ajukan tukar
        ▼
RewardRedemption PENDING → notif admin/owner
        ▼ (admin/owner setujui)
APPROVED → poin dipotong + reward diterapkan + JURNAL/LINE akuntansi dibuat
        ▼ (atau tolak)
REJECTED → poin tidak dipotong + notif tenant
```
- Diskon sewa: saat APPROVED, tambah line DISCOUNT ke invoice berikutnya (atau buat kredit).
- WiFi/cleaning gratis: saat APPROVED, buat WiFi Sale Rp0 / tiket cleaning + posting beban promosi.

## 4. Schema (additive, owner-approve)
- `TenantPointBalance`: tenantId, balance, updatedAt.
- `TenantPointLedger`: tenantId, type (EARN/REDEEM), amount, reason, sourceType (RENEWAL/PAYMENT/STREAK/QUEST/REDEMPTION), sourceId, createdAt — audit trail poin (pola sama deposit-ledger).
- `RewardCatalog`: kode, nama, pointCost, jenis (WIFI/CLEANING/RENT_DISCOUNT/OTHER), nilaiRupiah, isActive (owner-konfigurasi).
- `RewardRedemption`: tenantId, rewardId, pointSpent, status (PENDING/APPROVED/REJECTED), approvedById, accountingRef, createdAt.
- `PointEarnRule`: aktivitas → poin (konfigurasi owner).

## 5. UI Portal Tenant — "Misi & Poin Saya"
- Saldo poin + progres streak (gamified, "kayak game").
- Daftar **quest aktif** (mis. "Lengkapi profil +50", "Perpanjang bulan ini +100", "Bayar sebelum tanggal 5 +20").
- Katalog reward + tombol tukar (disabled bila poin kurang).
- Riwayat poin (earn/redeem) + status penukaran.

## 6. Invarian
1. Poin tidak pernah negatif; redeem hanya bila balance cukup (lock saat redeem).
2. Setiap perubahan poin punya entri TenantPointLedger (audit).
3. Reward yang berdampak uang (diskon/WiFi/cleaning) SELALU punya jejak akuntansi (M4) — tidak ada benefit "gelap".
4. Penukaran berdampak pendapatan/beban WAJIB approve admin/owner sebelum diterapkan.
5. Poin earn idempotent per sumber (mis. 1 perpanjangan = 1 earn, tidak dobel saat retry).

## 7. Anti-abuse & kebijakan (owner-set)
- Masa berlaku poin: **owner tentukan** (mis. hangus 12 bln tanpa aktivitas, atau tidak hangus). [PERLU KEPUTUSAN]
- Poin hangus saat tenant checkout permanen? [PERLU KEPUTUSAN]
- Batas penukaran per bulan? [opsional]

## 8. Hubungan dengan temuan audit
- Memperkuat **CLV/retensi** (06_MARKETING) — mesin retensi eksplisit.
- Quest = cara mengumpulkan **data marketing sukarela** tanpa memberatkan onboarding (K-a: wajib hanya nama+HP+KTP).
- Pencatatan akurat (M4) selaras prinsip audit: laporan keuangan jujur (jangan ada reward yang menggelembungkan revenue).
- **Fase 4** (setelah sistem inti sehat & publish) — JANGAN dibangun sebelum Fase 1 (uang/laporan benar) selesai.

## 9. Sub-keputusan tersisa (untuk owner, saat implementasi)
1. Nilai poin tiap aktivitas + biaya poin tiap reward (tabel konfigurasi).
2. Masa berlaku poin (hangus atau tidak).
3. Nasib poin saat checkout permanen.
4. Apakah quest survei mengumpulkan data spesifik apa (pekerjaan, kampus, asal, minat) — selaras UU PDP.
