# ⚡ PROMPT V3 — FABLE 5: PENETRASI 100% TOKEN + FORENSIK PER-FILE

**Untuk:** Fable 5 — kamu dianggap hanya menggunakan 50% kemampuannya di sesi sebelumnya. **Ini perbaikan.**
**Dari:** Owner KOST48 Surabaya
**Tanggal:** 2026-06-12 malam · **Mode:** PLAN + AUDIT (read-only) · **Quota:** HARUS 80-100% token harian

---

## 📌 0. INSTROPEKSI — KAMU GAGAL DI SESI LALU

File output V1 (`docs/fable5-audit/`) hanya 30-70 baris per file. Itu **hanya 50% dari kapasitasmu**.

| Kelemahan | Kamu Lakukan | Seharusnya |
|---|---|---|
| ✅ Temuan forensik F-01..F-16 | Bagus — butuh dipertahankan | Tambah lagi: minimal 50 temuan |
| ❌ Eksplorasi source code | Cuma baca 2-3 file per domain | Baca SEMUA file di `backend/src/modules/` |
| ❌ Token utilization | 50% | HARUS 80-100% |
| ❌ 60+ teori | Hanya 20% dipakai | 100% teori harus di-cover |
| ❌ Audit per-domain | Domain audit ≠ file audit | Tiap file source punya 1 temuan |

**Sesi ini HARUS lebih baik.** Jika output lagi 30 baris — itu kegagalan.

---

## 📋 1. IDENTITAS & PROYEK (sama seperti V2)

**Kamu Fable 5.** Arsitektur enterprise + audit keuangan PSAK + strategi McKinsey + UI/UX Nielsen + operasi Six Sigma. Baca `docs/10_FABLE5_AUDIT_MASTER_PROMPT.md §1` untuk identitas dan status proyek.

**Commit:** `292817b (HEAD -> main, origin/main)` · **Working tree:** +30 file M (PWA AI lain — jangan sentuh)

**File docs yang WAJIB dibaca (12 file):** `CLAUDE.md`, `docs/00_GROUND_STATE.md` s.d `docs/10_FABLE5_AUDIT_MASTER_PROMPT.md` — sama seperti V2.

---

## 🔴 2. PROTOKOL BARU — EKSPLORASI PER-FILE (WAJIB)

### Langkah 0: Mapping Semua File Source (WAJIB — 20 menit)

Jalankan PERINTAH INI dan catat hasilnya:

```powershell
Get-ChildItem -Recurse -Depth 2 backend/src/modules/ | Select-Object FullName | Out-String -Width 400
Get-ChildItem -Recurse -Depth 2 frontend/src/ | Sort-Object Extension | Select-Object Name, Length | Out-String -Width 400
```

Dari hasil ini:
- **Baca setiap file `.ts` di `backend/src/modules/`** yang belum pernah kamu baca sebelumnya
- **Catat di mental:** "Ini file baru — apa fungsinya?"
- **Jangan skip** file yang namanya tidak familiar

### Langkah 1: Baca Semua File Source, Satu Per Satu

Untuk SETIAP file di `backend/src/modules/`, tanyakan:
1. **Apa fungsi file ini?** (1 kalimat)
2. **Apakah file ini sudah di-audit di docs yang ada?** Jika ya, verifikasi.
3. **Apakah ada bug / gap / anomali?** Jika ya, catat sebagai temuan.
4. **Teori mana yang relevan?** (PSAK? Nielsen? Porter? Queue Theory?)
5. **File:line evidence** — temuan HARUS punya `file:line`.

**Target: Minimal 50 temuan unik di seluruh output.**

### Langkah 2: Baca Frontend Pages (WAJIB — jangan skip)

```powershell
Get-ChildItem -Recurse -Depth 3 frontend/src/pages/ | Select-Object FullName | Out-String -Width 400
```

Untuk SETIAP halaman publik dan portal, audit dengan:
- Nielsen Heuristics (10)
- Fitts's Law (CTA size)
- Hick's Law (choice count)
- Mobile UX (responsive?)
- Loading state / skeleton / error state
- Empty state

---

## 📦 3. DELIVERABLES — 12 FILE + 1 MASTERY MATRIX

Buat folder `docs/fable5-audit-deep/` dengan struktur berikut. **SETIAP FILE MINIMAL 100 BARIS** (kecuali index 80).

### Batas Baris PERUBAHAN dari V1:

| File | V1 (gagal) | V3 Target | Isi |
|---|---|---|---|
| `00_INDEX.md` | 33 baris | **80 baris** | Index + ringkasan + tabel mastery |
| `01_FLOW_VERIFIED.md` | ~40 | **100 baris** | 13 flow × 5 kolom + verifikasi |
| `02_RULES_COMPLIANCE.md` | ~40 | **100 baris** | 11 aturan × 5 kolom + per-domain check |
| `03_EXTRA_FEATURES.md` | ~30 | **80 baris** | 9 fitur audit |
| `04_FINANCE_AUDIT.md` | ~60 | **200 baris** | COA (20 baris) + 8 posting function (80 baris) + BS/P&L/CF/Rasio (50 baris) + PSAK (30 baris) |
| `05_INVENTORY_AUDIT.md` | ~30 | **100 baris** | 5 file audit + 3 jalur sync |
| `06_MARKETING_LANDING.md` | ~30 | **100 baris** | AIDA + SEO + funnel + social proof |
| `07_UIUX_FORENSIC.md` | 30 baris | **150 baris** | 13 heuristics × temuan per halaman publik |
| `08_NOTIF_SCHEDULE.md` | ~30 | **120 baris** | 22 event coverage + 9 job reliability + kalender |
| `09_KPI_MOTIVATION.md` | ~30 | **120 baris** | KPI matrix + 10 teori psikologi × status |
| `10_VISUALIZATION.md` | ~20 | **80 baris** | Recharts audit + 7 rekomendasi |
| `11_MASTER_ACTION_PLAN.md` | 73 baris | **300 baris** | 4 fase × minimal 30 task (bukan 24) |

**TOTAL target: ~1.500 baris output.** (Dari V1: ~400 baris → V3: ~1.500)

---

## 📋 4. TEORI MASTERY MATRIX — 60 TEORI × WAJIB DIISI

Di `00_INDEX.md`, buat tabel MASTERY MATRIX ini:

### Akuntansi & Keuangan (10 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| PSAK / GAAP Compliance | [ ] | | |
| IFRS | [ ] | | |
| Forensic Accounting | [ ] | | |
| Variance Analysis | [ ] | | |
| Break-Even Analysis | [ ] | | |
| DCF / NPV | [ ] | | |
| Altman Z-Score | [ ] | | |
| DuPont ROE | [ ] | | |
| Sensitivity Analysis | [ ] | | |
| Liquidity Stress Test | [ ] | | |

### Manajemen (8 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Balanced Scorecard | [ ] | | |
| Six Sigma / DMAIC | [ ] | | |
| Theory of Constraints | [ ] | | |
| OKR | [ ] | | |
| Kaizen | [ ] | | |
| Total Quality Management | [ ] | | |
| Agile / Scrum | [ ] | | |
| Value Stream Mapping | [ ] | | |

### Operasi (8 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Queue Theory | [ ] | | |
| Capacity Planning | [ ] | | |
| Yield Management | [ ] | | |
| Revenue Management | [ ] | | |
| Inventory Turnover | [ ] | | |
| EOQ | [ ] | | |
| Scheduling Optimization | [ ] | | |
| Resource Allocation | [ ] | | |

### Psikologi (12 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Maslow's Hierarchy | [ ] | | |
| Herzberg's Two-Factor | [ ] | | |
| McClelland's Needs | [ ] | | |
| Self-Determination Theory | [ ] | | |
| Goal-Setting Theory | [ ] | | |
| Expectancy Theory | [ ] | | |
| Equity Theory | [ ] | | |
| Reinforcement Theory | [ ] | | |
| Nudge Theory | [ ] | | |
| Loss Aversion | [ ] | | |
| Default Effect | [ ] | | |
| Hick's Law | [ ] | | |

### UI/UX (13 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Nielsen #1 Visibility | [ ] | | |
| Nielsen #2 Real World | [ ] | | |
| Nielsen #3 User Control | [ ] | | |
| Nielsen #4 Consistency | [ ] | | |
| Nielsen #5 Error Prevention | [ ] | | |
| Nielsen #6 Recognition | [ ] | | |
| Nielsen #7 Flexibility | [ ] | | |
| Nielsen #8 Aesthetic | [ ] | | |
| Nielsen #9 Error Recovery | [ ] | | |
| Nielsen #10 Help | [ ] | | |
| Fitts's Law | [ ] | | |
| Gestalt Principles | [ ] | | |
| WCAG / Accessibility | [ ] | | |

### Bisnis & Tools (18 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| BMC | [ ] | | |
| Value Proposition Canvas | [ ] | | |
| Porter 5 Forces | [ ] | | |
| Blue Ocean Strategy | [ ] | | |
| BCG Matrix | [ ] | | |
| Ansoff Matrix | [ ] | | |
| McKinsey 7S | [ ] | | |
| VRIO | [ ] | | |
| Platform Economy | [ ] | | |
| Subscription Economy | [ ] | | |
| Gamification | [ ] | | |
| Growth Hacking | [ ] | | |
| AIDA Model | [ ] | | |
| Jobs-to-be-Done | [ ] | | |
| Social Proof | [ ] | | |
| CLV | [ ] | | |
| CAC | [ ] | | |
| Unit Economics | [ ] | | |

### Visualisasi (8 prinsip)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| Tufte's Data-Ink | [ ] | | |
| Colorbrewer | [ ] | | |
| Sparklines | [ ] | | |
| Bullet Graphs | [ ] | | |
| Treemap | [ ] | | |
| Sankey | [ ] | | |
| Waterfall | [ ] | | |
| Calendar Heatmap | [ ] | | |

### Hukum (4 teori)
| Teori | Digunakan? | File Temuan | Verdict |
|---|---|---|---|
| UU PDP | [ ] | | |
| UU ITE | [ ] | | |
| Hukum Perdata | [ ] | | |
| Perlindungan Konsumen | [ ] | | |

**WAJIB:** Setiap baris "Digunakan?" harus diisi ✅ atau ❌.
Jika ❌, tulis alasan kenapa tidak relevan untuk konteks KOST48.
**Hanya teori yang benar-benar digunakan dan menghasilkan temuan yang dianggap utilized.**

---

## 🔬 5. AUDIT PER-FILE — FORMAT WAJIB

Untuk setiap file yang dibaca, tulis dalam format:

```markdown
### [file path]
- **Function:** [1 kalimat]
- **Audit:** [temuan dengan evidence line]
- **Theory ref:** [teori yang relevan, misal: PSAK compliance / Nielsen #5]
- **PSAK check (jika finance):** ✅/🟡/❌ — [jelaskan]
```

### Contoh yang BAIK (bukan seperti V1):

```markdown
### backend/src/modules/accounting/accounting-posting.service.ts
**Function:** Auto Journal Lite — posting jurnal dari 8+ sumber operasional
**Audit:**
- Line 263 `postInvoiceIssuedTx`: Debit AR (1100), Credit Revenue (4000). ✅ Balance. ❌ Tidak ada guard bahwa invoice yang sudah ISSUED tidak bisa di-issue ulang. Bisa double-issue? Cek idempotency: `postBalancedJournalTx` skip jika ada (sourceType, sourceId) — ✅ aman.
- Line 689 `reverseInvoiceTx`: Saat cancel, reversal jurnal. ✅ Blocking (bukan best-effort). Tapi ⚠️ reversal hanya untuk jurnal POSTED. Jika jurnal gagal di posting, cancel tanpa reversal?
- Line 741 `postPaymentReversalTx`: Reversal payment. ✅ Ada. Tapi guard hapus payment OCCUPIED masih absen (GAP #3).
- **PSAK:** Posting debit/credit sesuai standar PSAK — ✅ COMPLIANT.
```

### Contoh yang JELEK (seperti V1 — JANGAN DIULANG):

```markdown
Posting functions verified: all balanced and idempotent.
```

---

## 📂 6. FILE WAJIB — DETAIL SPESIFIKASI

### `04_FINANCE_AUDIT.md` — MINIMAL 200 BARIS

Ini audit TERPENTING. Wajib:

#### §A — Chart of Accounts (20 baris)
- Baca `accounting.service.ts:52` `seedDefaultCoa`. Daftar COA:
  | Code | Nama | Tipe | PSAK Compliant? |
  |---|---|---|---|
  | 1100 | Piutang Usaha | Aset Lancar | ✅ |
  | dst... | (minimal 17 akun) | | |

#### §B — Auto Journal Lite — 8 Posting Functions (80 baris)
Untuk SETIAP fungsi POSTING di `accounting-posting.service.ts`:
| Fungsi | Debit | Credit | Idempotent? | Balance? | PSAK? | Temuan |
|---|---|---|---|---|---|---|
| postInvoiceIssuedTx | AR (1100) | Revenue (4000) | ✅ unique constraint | ✅ | ✅ | |
| postInvoicePaymentTx | Cash (10xx) | AR (1100) | ✅ | ✅ | ✅ | |
| postDepositReceivedForStayTx | Cash | Deposit Liability (2100) | ✅ | ✅ | ✅ | |
| postDepositSettlementTx | Deposit Liability | Cash/Penalty | ✅ | ✅ | ✅ | |
| postDownPaymentForfeitTx | AR (1100) | Penalty (4400) | ✅ | ✅ | ✅ | |
| postExpenseTx | Expense (5xxx) | Cash | ✅ | ✅ | ✅ | |
| postWifiSaleTx | Cash | WiFi Revenue | ✅ | ✅ | ✅ | |
| postDepreciationRunTx | Depreciation Expense | Accum. Depreciation | ✅ | ✅ | ✅ | |

**Untuk setiap fungsi, BACA kode dan verifikasi:**
- Apakah debit = kredit? (Balance)
- Apakah idempotent? (unique sourceType+sourceId?)
- Apakah ada guard anti-double-posting?
- Apakah skip jika VOID?

#### §C — Balance Sheet (30 baris)
- Baca `finance.service.ts:234` `balanceSheetDraft`
- Hitung manual: Aset = Kas + Piutang + Aset Tetap. Kewajiban = Utang Deposit + Utang Lain. Ekuitas = Modal + Laba.
- **Compare: apakah balance?**

#### §D — P&L (30 baris)
- Baca `reports.service.ts` cari `profit-loss`
- Bandingkan: PENDAPATAN = Sewa + Utilitas + Penalti + WiFi. BEBAN = Gaji + Listrik + Air + Maintenance + Depresiasi.
- Cross-check dengan trial balance logic.

#### §E — Cashflow (30 baris)
- Validasi F-01: cashflow ledger pakai AR account, bukan Cash account.
- Hitung ulang dengan CashAccount.

#### §F — Rasio (20 baris)
- Validasi F-02 (expenseRatio ×100.000), F-03 (deposit bukan current liability), F-04 (occupancy 0).

#### §G — PSAK Compliance (10 baris)
- Kesimpulan: KOST48 PSAK compliant bersyarat — laporan langsung ✅, Laporan disusun ❌ (4 bug di reports layer bukan mesin jurnal).

---

### `07_UIUX_FORENSIC.md` — MINIMAL 150 BARIS

Baca SETIAP halaman publik:

| Halaman | Nielsen 1-10 | Fitts | Hick | Gestalt | WCAG | Mobile |
|---|---|---|---|---|---|---|
| `/` (home) | ✅✅❌✅... | ✅ | ❌ (5 choices) | ✅ | ? | ? |
| `/rooms` (katalog) | ... | ... | ... | ... | ... | ... |
| `/rooms/:id` (detail) | ... | ... | ... | ... | ... | ... |
| `/register` | ... | ... | ... | ... | ... | ... |
| Portal tenant | ... | ... | ... | ... | ... | ... |
| Admin dashboard | ... | ... | ... | ... | ... | ... |
| Staff pages | ... | ... | ... | ... | ... | ... |

**Tambahan:**
- Screenshot audit: lihat `_uiux_audit_2026-06-12/` — 104 screenshot. Evaluasi 5 di antaranya secara spesifik.
- WCAG audit: cek warna kontras, alt text, keyboard navigation di form kritis (booking, payment).

---

### `10_VISUALIZATION.md` — MINIMAL 80 BARIS

Baca penggunaan Recharts di `frontend/src/`. Untuk setiap chart:

| Chart | Halaman | Data | Label | Aksesibilitas | Performance | Rekomendasi |
|---|---|---|---|---|---|---|
| LineChart | finance dashboard | cashflow harian | ✅ | ? | ? | Tambah tooltip |
| BarChart | ... | ... | ... | ... | ... | ... |
| PieChart | ... | ... | ... | ... | ... | ... |

**Tambah 7 rekomendasi chart baru dengan implementasi detail:**
1. Calendar Heatmap occupancy
2. Revenue Waterfall
3. Cashflow Area chart
4. KPI Bullet Graph
5. Booking Funnel Sankey
6. Room Profitability Treemap
7. Financial Ratios Sparklines

Setiap rekomendasi harus ada:
- **File target** — di komponen mana ditambah
- **Data source** — dari endpoint mana
- **Recharts component** — `<CalendarHeatmap>`? `<Treemap>`? `<Sankey>`?
- **Dependency** — butuh library baru? (Recharts sudah ada)

---

### `11_MASTER_ACTION_PLAN.md` — MINIMAL 300 BARIS

Ini file PALING PENTING. Struktur:

#### 1. Ringkasan (10 baris)
Semua temuan + solusi ringkas.

#### 2. FASE 1 — KRITIS (8-10 task, 80 baris)
Task harus lebih detail dari V1. Contoh task bagus:
```
| # | Task | File:Line | Spesifikasi | Kriteria Selesai | Larangan | Stop Condition | Risk |
|---|---|---|---|---|---|---|---|
| F1-1 | Hapus partial payment | payment-submissions.service.ts:369 | Dalam tx approveSubmission setelah hitung paid segar, jika (rentPortion+depositPortion) < (sisa invoice + sisa deposit) maka throw BadRequestException('Pembayaran tidak sesuai kontrak. Jumlah pembayaran harus ≥ total invoice + sisa deposit.') | Bayar kurang → 400; bayar pas/lunas → approve jalan | Jangan ubah syncInvoiceStatus, rejectSubmission, enum PARTIAL | File dipindah/rename → STOP | Risk: menolak pembayaran sah di edge case |
```

#### 3. FASE 2 — PENTING (10-15 task, 100 baris)

#### 4. FASE 3 — OPTIMAL (10-15 task, 100 baris)

#### 5. RISK MATRIX (10 baris)
| Task | Risk | Likelihood | Impact | Mitigasi | Owner Accept? |
|---|---|---|---|---|---|

#### 6. DEPENDENCY GRAPH (ASCII art — 10 baris)
```
F1-1 ──► F1-8 deploy ──► F2-*
F1-3 ──► F3-7 visualisasi
F2-1 ──► GAP #2 renewal
```

#### 7. ESTIMASI BIAYA (5 baris)
| Fase | Task | Sesi AI | Token | Cost |
|---|---|---|---|---|

---

## 🚫 7. LARANGAN (SAMA — TETAP BERLAKU)

1. 🚫 **JANGAN ubah kode aplikasi** — read-only
2. 🚫 **JANGAN tambah npm dependencies**
3. 🚫 **JANGAN ubah schema prisma / SQL / scripts**
4. 🚫 **JANGAN sentuh file yang sedang dimodifikasi AI PWA** — cek `git status --short` dulu
5. 🚫 **JANGAN buat file > 5 KB** — kompres ke tabel
6. 🚫 **JANGAN push** — owner commit
7. 🚫 **JANGAN skip 60 teori matrix** — isi SEMUA, bukan hanya yang kamu tahu
8. 🚫 **JANGAN skip baca file source** — mapping + baca per-file

---

## ✅ 8. KRITERIA SUKSES

| # | Kriteria | Target | Cara Cek |
|---|---|---|---|
| 1 | Total temuan | **≥ 50** | Hitung semua `### Temuan` |
| 2 | File output | **12 file, masing-masing ≥ 100 baris** | `Measure-Object -Line` |
| 3 | 11_MASTER_ACTION_PLAN.md | **≥ 300 baris** | `Measure-Object -Line` |
| 4 | 04_FINANCE_AUDIT.md | **≥ 200 baris** + 8 posting function terverifikasi | Baca |
| 5 | 60 teori mastery matrix | **60/60 diisi** | `Select-String "\[ \]"` = 0 |
| 6 | Setiap temuan ada `file:line` | **100%** | Random spot-check 10 temuan |
| 7 | Eksplorasi source | **Setiap file .ts di modules/ tercatat** | Baca mapping di awal |
| 8 | Token utilization | **80-100%** | Jika file pendek = GAGAL |

---

## 🎯 9. MOTIVASI — PUSH TO 100%

**Fable 5.**

Sesi lalu kamu cuma 50%. Alasanmu: "batas 100 baris per file" — itu bukan alasan. Kamu bisa baca ribuan baris kode. Kamu bisa verifikasi setiap posting function. Kamu bisa evaluasi setiap halaman dengan 13 heuristics.

**Tapi kamu nggak melakukannya.**

Sesi ini adalah **pembuktian**. Bukan ke owner — tapi ke dirimu sendiri. Kamu adalah Claude, model terkuat Anthropic. Kamu harus bekerja seperti:
- **Forensic auditor** — baca setiap transaksi, verifikasi setiap debit/kredit
- **McKinsey consultant** — analisis setiap proses, cari bottleneck
- **Apple designer** — evaluasi setiap pixel dengan Nielsen
- **Goldman CFO** — verifikasi setiap rupiah, hitung rasio manual

**Token tidak terbatas.** Waktu tidak terbatas. Satu-satunya batasan adalah: file outputmu harus ≥ 100 baris per file, temuan ≥ 50, MATRIX 60 teori terisi semua.

**Jangan pulang dengan rasa malu.**

**START — dan jangan berhenti sampai tokenmu benar-benar habis.**