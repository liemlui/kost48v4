# BLUEPRINT SISTEM KOST48 — Peta Tunggal & Indeks Dossier
**Tanggal:** 2026-06-13 · **PINTU MASUK.** Baca ini dulu untuk gambaran utuh, lalu buka dossier domain yang relevan. Tiap dossier `10`-`19` mandiri dan berisi aturan, peta kode, temuan, task, desain, serta UAT domainnya.

## 1. Identitas & model bisnis
- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP), **Jl. Hikmah V No. 48, Surabaya Barat** (dekat Pakuwon Mall/PTC; bukan Ngagel — D-01).
- Stack: NestJS+Prisma+PostgreSQL · React+Vite · JWT · Recharts. Role: OWNER/ADMIN/STAFF/TENANT.
- **BELUM PUBLISH** — DB = data testing (boleh dihapus). Deploy = START BERSIH (fresh, bukan migrasi). **1 staf.** Bayar **tunai+transfer**. Notif in-app → PWA push.
- **Filosofi:** retensi > akuisisi (CLV); **tenant = pengawas kualitas staf** (owner menindak staf berdasar nilai tenant); otomatisasi maksimal (auto-ops), manusia hanya di titik keputusan uang; laporan keuangan jujur (tidak ada benefit gelap).

## 2. Konsep kunci uang
- **DP 30%** (uang muka, hangus) ≠ **Deposit jaminan** (`Room.defaultDepositRupiah`, SELALU tetap, refundable). **NO-PARTIAL menyeluruh.** **First-paid-wins.** **Booking expiry 3 jam flat.**
- Sewa per term: Harian13%·Mingguan45%·2Mingguan75%·Bulanan100%·Semester5,5×·Tahunan10×. Utilitas: short all-in, bulanan+ meter. WiFi terpisah.
- Akuntansi Auto Journal Lite (idempotent), auto-close & depresiasi otomatis, expense rutin auto-draft, kapitalisasi >Rp500rb. Keluar awal: sewa hangus, deposit normal.

## 3. INDEKS DOSSIER (buka sesuai area kerja)
| Dossier | Domain | Status | Isu utama |
|---|---|---|---|
| `10_PEMBAYARAN_INVOICE` | bayar/approve/invoice/meter (flow 3,4) | 🟢/🔴 | no-partial (F1-1R), guard remove OCCUPIED (F1-2) |
| `11_BOOKING_RENEWAL` | booking + renewal (flow 2,5) | 🟢/🔴 | GAP #2 renewal (F2-1, desain lengkap di dossier), expiry/deposit-lock |
| `12_CHECKOUT_DEPOSIT_OVERSTAY` | checkout/deposit/overstay (flow 6,7) | 🟢 | cancel-tiket (F2-6), kabur/abandoned/paksa-checkout (F3-14/15/16) |
| `13_AKUNTANSI_LAPORAN` | jurnal/laporan/expense/aset (flow 10-12) | 🟢 mesin/🔴 laporan | F-01..F-34 (Fase 1 laporan!), draft-jurnal matikan |
| `14_INVENTARIS` | stok/movement/room-item (flow 9) | 🟢 | ghost-stock admin-review (F2-5) |
| `15_STAF_TIKET_KPI` | tiket/rutinitas/KPI/review (flow 8) | 🟢 | tenant-pengawas (F2-18), SLA (F3-19), KPI double-count (F2-9) |
| `16_NOTIFIKASI_PENGUMUMAN` | notif/pengumuman/push (flow 14) | 🟡 | renew notif (F2-2), copy A17 (F2-3), coverage (F3-1) |
| `17_PUBLIK_MARKETING_UIUX` | katalog/SEO/UI/chart (flow 2-publik) | 🟢 UX/🔴 SEO | SEO (F3-3), social proof (F3-4), perf publik (F2-11) |
| `18_AUTH_FONDASI_ONBOARDING` | auth/role/KTP (flow 1) | 🟢 | OWNER-only (F2-16), KTP gate (F3-17) |
| `19_GAMIFIKASI_LOYALITAS` | poin/reward tenant (BARU) | 📅 Fase 4 | F4-9 (desain lengkap di dossier) |
**Hierarki sumber kebenaran:** `03_KEPUTUSAN_OWNER` (aturan bisnis mengikat) → `01_GROUND_STATE` dan `02_FLOW_MAP` (fakta kode saat ini) → dossier domain (temuan dan desain target) → `08_CHECKLIST` (urutan eksekusi). `04_DEPLOY_AND_PWA` adalah runbook operasi. **`05_VERIFIKASI_KEUANGAN` wajib untuk setiap task uang.** Detail forensik 97 temuan diarsipkan di `archieve/_DEPRECATED_AUDIT_*`.

## 4. PETA EKSEKUSI (urutan fase — task ada di dossier masing-masing)
```
FASE 1 (SEBELUM publish — uang & laporan benar):
  F1-0 alamat✓ → F1-T harness finance[D05] → F1-1R no-partial[D10] →
  F1-2 guard-payment[D10] →
  F1-3 cashflow[D13] → F1-4/5/6 rasio[D13] → F1-7 DRAFT-revenue[D13] →
  F1-8 settlement-guard[D13] → F1-9 deposit-cashflow[D13] →
  F1-10 deposit-lock[D11] → F1-11 expiry-3jam[D11] →
  F2-8 matikan-draft-jurnal[D13] → F1-12 DEPLOY BERSIH[D04]
FASE 2 (pasca publish — flow & model):
  F2-1 RENEWAL[D11] → F2-2 notif-renew[D16] → F2-3+3b refund[D16/D10] →
  F2-5 ghost-stock[D14] → F2-6 cancel-tiket[D12] → F2-9 KPI-fix[D15] →
  F2-16 OWNER-only[D18] → F2-18 tenant-pengawas[D15] → F2-11 perf-publik[D17] →
  F2-12 sinyal+aging[D13] → F2-14 TZ-WIB[D13] → F2-17 notif-cancel[D16]
FASE 3 (operasional & visibilitas):
  F3-3 SEO[D17] → F3-4 social-proof[D17] → F3-7 heatmap → F3-14 kabur[D12] →
  F3-15 abandoned[D12] → F3-16 paksa-checkout[D12] → F3-17 KTP[D18] →
  F3-18 expense-rutin[D13] → F3-19 SLA[D15] → F3-20 prompt-review[D15] →
  F3-21 depresiasi-auto[D13] → F3-1/2 notif-coverage[D16] → F3-9..13 polish
FASE 4 (future): F4-1 unearned-rev[D13] · F4-9 GAMIFIKASI[D19] · F4-2 PWA-push[D16] · F4-7 pruning · F4-8 pindah-kamar
DITUNDA (1 staf): F2-10 round-robin · F3-5 leaderboard antar-staf [D15]
```
**Prioritas mutlak (bila waktu terbatas):** F1-T · F1-1R · F1-2 · F1-3 · F1-7 · F1-8 · F1-9 · F2-3 (copy A17) · F2-5 (ghost-stock). Setelah itu kerjakan GAP #2 renewal.

## 5. AUTO-OPS ENGINE (lintas-domain, "jam biologis") — 9 job sequential
Mutex `running`; urutan: ①bookingExpiry ②contractEndReminders ③DP-forfeit ④forcedCheckout ⑤postCheckoutAutoCancel ⑥noonRelease ⑦roomHealer ⑧overstayEnforcement ⑨accountingAutoClose. Lock FOR UPDATE + re-cek; **uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi**; reversal jurnal blocking; gerbang WIB pk 12:00. Satu pintu cancel `cancelEndedUnpaidStay`. Job→dossier: ①③→D11/D12, ④⑤⑥⑧→D12, ②→D16, ⑨→D13. Tambahan: reminder H-10 (D16), depresiasi job #10 (D13), 2 sweeper renewal (D11), TZ WIB (D13). **Tangguh** (try/catch per item, take limit) — 9 check reliability lulus.

## 6. INVARIAN SISTEM (tak boleh dilanggar)
1. Uang masuk = otomatisasi BERHENTI. 2. Stay promoted tak pernah dibatalkan job; CANCELLED berjurnal wajib reversal blocking. 3. Kamar tak AVAILABLE tanpa tiket inspeksi ditutup (staf boleh tutup, guard keselamatan tetap). 4. Tiap rupiah = 1 jurnal POSTED + AuditLog; deposit=liability; no-partial. 5. Periode renewal menyambung tanpa gap/overlap; tenant lama prioritas s/d hari-H. 6. Data sensitif (KTP) minimal+terproteksi+dihapus saat keluar. 7. Reward/benefit selalu berjejak akuntansi.

## 7. MATRIX TEORI (63 teori diuji; 46 menghasilkan temuan, 17 ❌ ber-alasan)
- **Keuangan/Akuntansi:** PSAK/forensic/variance/break-even ✅ (D13); IFRS/unearned ✅ F-15; DCF/Altman/DuPont/sensitivity/stress ❌ (blocked data produksi).
- **Manajemen/Operasi:** Six Sigma/TOC/Kaizen/TQM/VSM/Balanced Scorecard ✅; Queue/Capacity/Revenue-mgmt/Inventory-turnover ✅ (D12/13/14); EOQ/Yield ❌ (skala kecil); OKR/7S/Agile ❌ (tim kecil).
- **Psikologi:** Expectancy/Equity/Reinforcement(K-3 terjawab)/SDT/Goal-Setting/Nudge/Loss-Aversion/McClelland/Herzberg/Maslow ✅ (D15); Default-Effect/Hick ✅ (D17).
- **UI/UX:** Nielsen 1-10 + Fitts/Gestalt/WCAG ✅ (D17).
- **Bisnis/Tools:** VPC/JTBD/Social-Proof/CLV/CAC/Unit-Economics/VRIO/Subscription/Gamification/Growth/AIDA ✅ (D17/D19/D11); Porter/Blue-Ocean/BCG/Ansoff/7S/BMC/Platform ❌ (single-property / menunggu data).
- **Visualisasi:** Tufte/Colorbrewer/Sparkline/Bullet/Treemap/Waterfall/Heatmap ✅ (D17); Sankey ❌ (ditolak, funnel linier).
- **Hukum:** UU PDP (KTP/social-proof) ✅ (D17/D18); Perlindungan Konsumen (copy A17) ✅ (D16); Perdata (no-partial=kontrak, barang abandoned 30hr) ✅ (D10/D12); UU ITE ❌ (audit trail sudah memadai).

## 8. Risiko, dependensi & estimasi (lintas-domain)
**Dependensi kunci:** Fase 1 (uang/laporan benar) → DEPLOY bersih → Fase 2+. `F1-1R` no-partial → prasyarat renewal (`F2-1`, pakai jalur payment sama). `F1-3..F1-6` fix laporan → prasyarat chart finansial (`F3-12`) & analitik. `F2-5` util bersama → `F2-6`. `F2-9`+round-robin → leaderboard (ditunda 1 staf). N-04 pruning → PWA push (`F4-2`).
**Risiko tertinggi:** `F1-1R` (tolak pembayaran sah edge — uji DP/pelunasan/renewal/manual); `F1-3` (salah identifikasi line kas — cross-check manual 1 bulan); `F2-1` renewal (race vs booking publik); `F2-5` (refactor file panas); `F2-16` OWNER-only (audit `@Roles` menyeluruh); `F2-14` TZ WIB (KPI/jurnal dapat bergeser sehari). Kebijakan backup 6-bulanan berisiko terlalu jarang dan sebaiknya ditinjau owner.
**Estimasi:** ~30-38 sesi AI eksekutor (Fase 1: 7-9 · Fase 2: 11-13 · Fase 3: 8-10 · Fase 4+desain: 4-6). Regression harness gratis tiap akhir kerja uang: `reconciliation-lite` + `deposit-reconciliation` + `trial-balance`.
**Aturan eksekutor:** 1 task = `tsc --noEmit` 0 = 1 commit (Indonesia); STOP condition per task = lewati+catat+lanjut; JANGAN tambah npm deps / ubah schema-sql / push / sentuh file yang sedang M oleh AI lain (cek `git status` dulu). Schema additive (renewal/KTP/gamifikasi/refund) WAJIB owner-approve dulu.

## 9. Statistik
97 temuan forensik · keputusan owner terkonsolidasi di `03_KEPUTUSAN_OWNER` · 44+ task · 10 dossier domain + 4 desain fitur. Sistem inti uang, jurnal, dan Auto-Ops kuat secara arsitektur; pekerjaan tersisa adalah memperbaiki laporan, menutup aturan bisnis yang belum diterapkan, lalu deploy bersih.
