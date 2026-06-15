# FINANCE FORENSIK DEEP (V3) — Mesin jurnal SEHAT 10/10 fungsi; lapisan laporan +9 bug baru (F-17..F-25); governance jurnal manual punya dead-end
**Basis:** baca penuh `accounting-posting.service.ts` (1.228 baris), `accounting-reports.service.ts` (1.148), `accounting.service.ts` (620), `accounting-period-close.service.ts` (650), `accounting-readiness.service.ts` (335), helpers (269+83), `finance.service.ts` (494), `reports.service.ts` (513), `invoice-payments.service.ts` (283), `invoices.service.ts` (535), `deposit-ledger.service.ts` (469), `expenses.service.ts` (105), `wifi-sales.service.ts` (81), `default-coa.ts` (52). Temuan V1 F-01..F-16 SEMUA terverifikasi ulang baris-per-baris.

## §A — Chart of Accounts (default-coa.ts:9-52) — 38 AKUN (koreksi V1 yang menulis "17/17")
| Blok | Kode | Akun | PSAK | Catatan forensik |
|---|---|---|---|---|
| Kas | 1000/1010/1020 | Cash/Bank/QRIS Clearing | ✅ | Prefix `'10'` — fakta kunci untuk F-01/F-18 |
| Piutang | 1100 | Accounts Receivable | ✅ | Prefix `'11'` — yang DISALAH-BACA sebagai kas oleh cashflow & rasio |
| Persediaan | 1200 | Inventory | ✅ | Tak pernah diposting (F-16); rasio cari `'14'` (F-18b) |
| Aset tetap | 1500/1590 | Fixed Assets / Accum. Depr (kontra) | ✅ | Kontra: type ASSET + normalBalance CREDIT — BS menangani benar (:375) |
| Kewajiban | 2000/2100/2200/2300 | Deposit Liability/AP/Unearned/Tax | ✅ | 2000 deposit ≠ revenue ✅; 2200 tak terpakai (F-15) |
| Ekuitas | 3000/3100/3200 | Capital/Drawings/Retained | ✅ | 3200 dipakai closing (period-close:9) |
| Revenue | 4000/4100/4110/4200/4300/4400 | Rent/Listrik/Air/WiFi/Ancillary/Penalty | ✅ | Mapping line→kode di posting-helpers:66-73 |
| COGS | 5000-5300 | WiFi/Laundry/Galon/Cleaning cost | ✅ | Belum ada modul yang memposting COGS (INFO) |
| Beban | 6000-6990 (14 akun) | Salary..Other | ✅ | `RENT_BUILDING`→6990 padahal layak akun sendiri (posting-helpers:79, INFO) |

Verdict COA: **PSAK-compliant secara struktur.** Gate readiness `coa.seeded` butuh ≥30 akun (readiness:288) — terpenuhi 38.

## §B — Auto Journal Lite: 10 fungsi posting diverifikasi ulang per baris
| Fungsi | Baris | Jurnal (D/K) | Balance | Idempotent | Skip VOID-source | Temuan |
|---|---|---|---|---|---|---|
| postInvoiceIssuedTx | :263 | D 1100 / K 4xxx per line; DISCOUNT→debit (:330-338) | ✅ guard :1158 | ✅ :1111 + entryNumber @unique | ✅ DRAFT/CANCELLED skip :278 | total≠Σline → unbalanced → skip benign :292+1158 |
| postInvoicePaymentTx | :351 | D Kas per method (helpers:53-64) / K 1100 | ✅ | ✅ | n/a | cashAccountId terisi di line kas :402 (fondasi E-4 benar) |
| postExpenseTx | :420 | D 6xxx (helpers:75) / K Kas default | ✅ | ✅ | n/a | — |
| postWifiSaleTx | :474 | D Kas / K 4200 | ✅ | ✅ | n/a | — |
| postDepositReceivedForStayTx | :529 | D Kas / K 2000 | ✅ | ✅ per stayId | partial→skip :551 (F-06) | by-design anti-underpost |
| postDepositSettlementTx | :602 | D 2000 / K Kas(refund)+K 4400(potongan) | ✅ | ✅ `SETTLEMENT:id` | — | 🔴 **F-24**: tak cek receipt journal ada (lihat §H) |
| postInvoiceCancellationReversalTx | :689 | cermin asli, ADJUSTMENT | ✅ | ✅ | hanya CANCELLED :717 | entryDate=hari posting (praktik benar utk reversal) |
| postPaymentReversalTx | :741 | cermin payment | ✅ | ✅ | — | 🟡 **F-29 DEAD CODE** — 0 pemanggil (lihat §H) |
| postDownPaymentForfeitTx | :781 | D 1100 / K 4400 | ✅ | ✅ `DP_FORFEIT:id` | skip benign bila DP tak terjurnal :808 | entryDate=now (F-13 tetap) |
| postFixedAssetLedgerAlignmentTx | :128 | D 1500 / K 3000 atau 1010 | ✅ | ✅ | — | — |
| postDepreciationRunTx | :204 | D 6700 / K 1590 | ✅ | ✅ + unique run/bln (assets:392,461) | — | double-run terkunci 2 lapis |

Inti `postBalancedJournalTx:1110-1216`: cek existing (status≠VOID) → normalisasi line → tolak <2 line / line dua-sisi / debit≠kredit → periode harus ada & OPEN (:1166-1179, governance B8) → create POSTED. **Verdict mesin: SEHAT, semua jalur double-posting tertutup oleh DB.**

## §C — Balance Sheet ledger (accounting-reports.service.ts:347-481)
- Struktur benar: kontra-aset dipisah (:375-377,405-406), currentProfit→ekuitas (:401,410), guard `balanced && trial.isBalanced` (:413-414), closing→Retained via CLOSING_ENTRY (period-close:469-482), disclosure register aset vs ledger (:415, helpers:202-239).
- Persamaan: Aset = currentAssets + (grossFA − akumDep); L+E = liabilities + (equityBase + currentProfit). Difference dihitung eksplisit (:412). ✅ secara logika; UAT seimbang 104.494.250 (V1).
- 🔴 **F-17 BARU** `:1087-1099` + `:29`: `balanceSheetDetail` membandingkan MoM dengan `balanceSheet({year,month})`, tetapi `trialBalance()` HANYA membaca `query.asOf` dan MENGABAIKAN year/month → "previous" = trial balance per HARI INI = identik dengan current → assets/liabilities/equity ChangePercent selalu 0. (P&L detail TIDAK kena karena `resolveProfitLossPeriod` helpers:241-268 sadar year/month.) Fix: turunkan asOf = endDate bulan prev (`new Date(Date.UTC(prevYear, prevMonth, 0))`).

## §D — P&L ledger (:227-343) + tutup buku (period-close)
- P&L: hanya POSTED, exclude CLOSING_ENTRY/CLOSING_REVERSAL (:240), periode dari helper sadar-year/month. ✅
- Closing preview (period-close:408-506): tutup REVENUE debit / EXPENSE-COGS kredit, selisih → 3200; handle rugi (debit 3200) ✅; zero-close diizinkan dgn warning (:377). Re-close pasca reopen pakai versi V2 (:40-47,168) — audit trail utuh. Reopen blokir cascading (:517-520) ✅.
- Readiness close 11 check (:361-373) termasuk unmapped (DRAFT invoice DIKECUALIKAN :589 — benar), depresiasi wajib POSTED+journal (:604-613), asset alignment NEEDS_REVIEW=blokir (:615-618). **Verdict tutup buku: paling matang di seluruh codebase.**
- 🟠 **F-22 BARU** `accounting.controller.ts:207` + period-close `:352,:366`: jurnal manual hanya bisa DIBUAT sebagai DRAFT (`POST journal-entries/draft`); **tidak ada endpoint post/void draft journal**. Draft journal memblokir close (check `draft-journals`) → owner yang iseng bikin draft = tutup buku buntu permanen tanpa intervensi SQL. Fix: tambah endpoint post+void Owner-only, atau blokir pembuatan draft sampai workflow lengkap.
- 🟠 **F-23 BARU** `dto/journal-entry.dto.ts:43-44` + posting `:1111`: DTO draft menerima `sourceType` apa pun (INVOICE, INVOICE_PAYMENT, …) + `sourceId` bebas. Draft (status≠VOID) menekan idempotensi auto-posting → invoice/payment ybs TIDAK PERNAH terjurnal otomatis; dikombinasi F-22 (draft tak bisa di-void) = penekanan permanen + muncul selamanya di unmapped. Fix: paksa `sourceType=MANUAL` & `sourceId=null` di createJournalDraft.

## §E — Cashflow ledger (:731-915) — validasi F-01 + 3 temuan baru
- ✅ F-01 TERVERIFIKASI: deteksi "akun kas" pakai `startsWith('11')` di :760 (opening) dan :794 (arus) — 11xx = PIUTANG. Operating in = mutasi debit AR (invoice issued), bukan kas. Blok E-4 (:837-862) benar: saldo per CashAccount = opening + Σ(D−K) line ber-cashAccountId.
- ✅ F-05 TERVERIFIKASI: double-count — semua debit/credit "kas" masuk operatingTotal dulu (:798-814), lalu OPENING_BALANCE/FIXED_ASSET ditambahkan LAGI ke financing/investing (:817-832).
- 🟠 **F-19 BARU** `:823-825`: klasifikasi investing cek `sourceType === 'FIXED_ASSET'` — sourceType itu TIDAK PERNAH ADA (alignment aset diposting sebagai `ADJUSTMENT`, sourceId `FIXED_ASSET_ALIGNMENT:*`); DEPRECIATION tak menyentuh kas. Cabang investing = kode mati; pembelian aset reklas-dari-kas akan jatuh ke "operating fallback". Plus dead code `cashCOACodes` (:768-771) yang mem-build Set berisi null.
- 🟠 **F-20 BARU** `:874-875`: `cashBeginning` = opening all-time CashAccount; `cashEnding` = saldo all-time hari ini — sementara operating/investing/financing dihitung untuk SATU BULAN. Identitas `beginning + netCashflow = ending` tidak pernah berlaku kecuali bulan pertama. Fix: beginning = saldo per akhir bulan lalu (query line < periodStart).
- 🟡 `formalStatementReady: cashAccounts.length > 0` (:887) mengklaim siap formal padahal breakdown salah (F-01/F-05/F-19) — label menyesatkan sampai fix.

## §F — Rasio ledger (:917-1021) — validasi F-02/F-03/F-04 + 2 baru
- ✅ F-02 `:978`: `(pnl.totals?.expenseRupiah ?? 0 / totalRevenue)` — `/` mengikat lebih dulu dari `??` → expenseRatio = beban×100. ✅ F-03 `:932-934`: currentLiabilities hanya `'21'` → deposit 2000 (kewajiban terbesar kost) hilang. ✅ F-04 `:979`: `bs.statement?.occupancyRate` tidak pernah ada → 0.
- 🔴 **F-18 BARU** `:961`: `cashAndBank` = prefix `'11'` → cashRatio & quickRatio memakai PIUTANG sebagai kas (kembaran F-01 di file rasio — fix F1-3 V1 tidak menyentuh baris ini!); `:965` inventory = prefix `'14'` padahal COA Inventory = 1200 → inventory selalu 0 (kebetulan benar karena F-16, tapi rumus tetap salah).
- 🟡 **F-34 BARU** `:919-921`: financialRatios meneruskan query ke trialBalance (abaikan year/month, all-time as-of) DAN profitLoss (per periode) → bila dipanggil dgn year/month, pembilang dan penyebut beda basis periode. ROA tanpa anualisasi tetap F-14.

## §G — Laporan operasional (reports/finance) — validasi F-09/F-10/F-11 + 2 baru
- ✅ F-09: `status != CANCELLED` (DRAFT ikut revenue) di reports.service.ts:31,45,309,377,485 + finance.service.ts:66,187,311,316,436. ✅ F-10: cashFlow ops (:247-293) tanpa arus deposit. ✅ F-11: formalRatiosReadiness hardcoded false (finance:226-233) — basi pasca E-4.
- 🟠 **F-21 BARU** `finance.service.ts:93`: `highSignalTickets` filter `category IN ('URGENT','HIGH','EMERGENCY')` — enum TicketCategory aslinya KEBERSIHAN/PERBAIKAN/AUDIT_INVENTARIS/BARANG_PINDAH/PEMERIKSAAN/UMUM/dst (app.enums.ts:12-14). Nilai tak valid → Prisma throw → `.catch(() => 0)` menelan → sinyal "Ticket urgent/high" SELALU 0 dan tidak pernah muncul di businessHealth. Fix: hapus filter atau pakai kategori nyata.
- 🟡 **F-27 BARU** `reports.service.ts:115-135` + `finance.service.ts:73-77`: overdue aging & overdueRupiah memakai `totalAmountRupiah` PENUH untuk invoice PARTIAL — tunggakan overstated sebesar porsi yang sudah dibayar. Fix: total − Σpayments per invoice.
- 🟡 ownerDashboard trend (:426-450): loop sequential 3 query × N bulan (N+1); netProfit campur basis (invoice akrual+DRAFT vs wifi kas, tanpa depresiasi) — bagian dari hierarki F-12.

## §H — Deposit end-to-end + integritas lintas-modul (4 temuan baru)
- 🔴 **F-24 BARU** posting `:602-687`: settlement deposit memposting D 2000 berdasar snapshot stay TANPA mengecek jurnal DEPOSIT receipt pernah POSTED. Skenario: deposit partial (receipt diskip per F-06) → checkout → settlement POSTED → akun 2000 bersaldo DEBIT (kewajiban negatif) selamanya. Reconciliation B3.3R (:655) akan menangkap selisih, tapi tanpa penjelasan akar. Fix: skip settlement journal bila receipt belum ada (pola sama anti-piutang-fiktif DP forfeit :808).
- 🟠 **F-25 BARU** posting-helpers `:6-9` (dipakai SEMUA posting): `dateOnly` pakai komponen UTC. Transaksi pukul 00:00–06:59 WIB tercatat bertanggal H-1; di tanggal 1 → jurnal jatuh ke bulan SEBELUMNYA; bila bulan itu CLOSED → skip benign → unmapped. Pasangan backend E-6. Fix: konversi ke tanggal WIB sebelum truncate (pola `jakartaHour` auto-ops).
- 🟡 **F-30 BARU** deposit-ledger `:184`: `sourceId = paymentSubmissionId ?? stayId` — jalur manual check-in (E-3, tanpa submission) memakai stayId; setoran jaminan manual KEDUA pada stay sama terkena dedupe (:123-132) → ledger kurang catat. Fix: sertakan invoicePaymentId di sourceId jalur manual.
- 🟡 **F-29 BARU** (dead code, grep 2026-06-13): `postPaymentReversalTx:741` 0 pemanggil — `invoice-payments.remove/update` kini MEMBLOKIR mutasi payment berjurnal (:197,:245, pendekatan lebih aman) → FLOW_MAP §4 "remove → postPaymentReversalTx" DRIFT. Konsekuensi GAP #3: guard OCCUPIED tetap perlu untuk payment yang jurnalnya GAGAL/skip (masih bisa dihapus saat kamar terisi).

## §I — Governance master data (2 baru)
- 🟡 **F-26 BARU** accounting.service `:119-138`: updateAccount tanpa guard `isSystemDefault` — kode/tipe 1100/2000/4000 dst bisa diubah owner/admin → SEMUA auto-posting skip benign diam-diam (findAccountByCodeTx tak menemukan kode). `createAccount` (:103-117) juga tak menangkap P2002 kode duplikat (500 mentah, bandingkan createCashAccount :178-183 yang rapi). Fix: tolak ubah code/type bila isSystemDefault; tangkap P2002.
- 🟡 **F-31 BARU** reports `:109` vs period-close `:589`: scanner unmapped UI menyertakan invoice DRAFT (`not CANCELLED`), close-readiness mengecualikan DRAFT — dua angka "unmapped" berbeda definisi → owner bingung kenapa data-quality merah tapi close jalan. Samakan filter (`notIn: [DRAFT, CANCELLED]`).
- INFO **F-32**: definisi "mapped" beda — report-helpers `:34-40` hanya POSTED; posting `:1112` status≠VOID (DRAFT dianggap mapped oleh mesin, unmapped oleh scanner). INFO **F-33**: voidOpeningBalance join notes pakai literal `'\\n'` (accounting.service:413). INFO: createPeriod (:272-292) menerima startDate/endDate bebas → periode bisa tumpang-tindih; findFirst desc memilih ambigu. INFO **F-28**: race idempotensi findFirst→create dua proses paralel berujung P2002 yang MELEMPAR (bukan skip) — di jalur blocking (issue) bisa menggagalkan transaksi bisnis; tangkap P2002 → perlakukan sebagai already-posted.

## §J — Analisis lanjutan (status sama V1 §5 — menunggu data produksi)
| Analisis | Status | Blocker |
|---|---|---|
| Break-even occupancy (≈15 kamar/31% pada asumsi beban 25jt, sewa 1,7jt) | Rumus siap | Beban tetap produksi belum ada |
| Unit economics per tier / Treemap profitabilitas | ❌ | Butuh 1 bulan data + pemisahan beban per tier |
| Sensitivity −10/−20% & Liquidity stress 50% | ❌ | Bergantung BEP + cashEnding E-4 pasca F1-3 |
| DuPont ROE / Altman Z / DCF | ❌ | Ekuitas riil = opening balance produksi (F1-8) |

## §K — PSAK/GAAP VERDICT (diperbarui dari V1)
**Compliant bersyarat — syarat BERTAMBAH.** Mesin jurnal: akrual ✅, deposit=liability ✅, kontra-aset ✅, retained earnings ✅, seimbang+idempotent ✅. Syarat: (a) F-01/F-02/F-03/F-18 sebelum laporan dipakai keputusan; (b) F-24+F-06 deposit partial → backfill ber-review owner; (c) F-15 unearned revenue utk sewa multi-bulan (PSAK 72); (d) F-25 tanggal jurnal WIB agar cut-off periode benar (PSAK penyajian); (e) opening balance produksi diposting saat deploy. Keterbandingan antar-periode (F-17) dan klasifikasi arus kas (F-19/F-20) wajib dibereskan sebelum laporan disebut "PSAK penuh".

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
1. SMESTERLY/YEARLY? → **belum/jarang** (D-04) → F-15 ke Fase 4.
2. Eksekutor backfill deposit lama? → **data testing, dihapus semua, deploy fresh** (D-06) → F-24/F-06/F-07 data-fix GUGUR; kode tetap difix (F1-8).
3. Draft jurnal manual dipakai? → **tidak** (D-05) → MATIKAN endpoint (F2-8), bukan perbaiki.

---

## LAMPIRAN — Audit per-file domain finance (format V3 §5)

### backend/src/modules/accounting/constants/default-coa.ts (52 baris — dibaca penuh)
- **Function:** Definisi 38 akun COA default (7 aset, 4 kewajiban, 3 ekuitas, 6 revenue, 4 COGS, 14 beban).
- **Audit:** Struktur PSAK benar (kontra-aset 1590 = ASSET+CREDIT; deposit 2000 = LIABILITY). 1200/2200/5xxx tidak pernah diposting modul mana pun (F-15/F-16 + COGS idle).
- **Theory ref:** PSAK penyajian; klasifikasi akun.
- **PSAK check:** ✅ struktur compliant.

### backend/src/modules/accounting/accounting-posting-helpers.ts (83 baris — dibaca penuh)
- **Function:** Util posting: dateOnly, mapped-source, resolusi periode/akun/kas, mapping revenue & expense code.
- **Audit:** `dateOnly:6-9` pakai komponen UTC → F-25 (jurnal dini-hari WIB tertanggal H-1). `expenseCodeForCategory:79` RENT_BUILDING→6990 (layak akun sendiri, INFO). `findCashAccountForPaymentMethodTx:53-64` mapping method→tipe kas wajar, fallback default.
- **Theory ref:** PSAK cut-off periode.
- **PSAK check:** 🟡 — cut-off tanggal bermasalah di zona WIB (F-25).

### backend/src/modules/accounting/accounting-posting.service.ts (1.228 baris — dibaca penuh)
- **Function:** Mesin Auto Journal Lite — 10 fungsi posting + reversal + backfill + dry-run deposit.
- **Audit:** Inti `postBalancedJournalTx:1110-1216` — semua invariant ditegakkan (≥2 line, satu sisi per line, debit=kredit, periode OPEN, idempotent per sourceType+sourceId non-VOID). Temuan: F-24 (settlement tanpa cek receipt :602), F-13 (forfeit entryDate=now :829), F-08 (entryNumber bentrok VOID :43-48), F-28 (race P2002 melempar :1181), F-29 (postPaymentReversalTx:741 dead code).
- **Theory ref:** Forensic accounting; double-entry; idempotency.
- **PSAK check:** ✅ mesin compliant; 2 catatan cut-off & liability (F-25/F-24).

### backend/src/modules/accounting/accounting-reports.service.ts (1.148 baris — dibaca penuh)
- **Function:** Laporan ledger: trial balance, P&L (+detail), balance sheet (+detail), cashflow, rasio, unmapped scanner, deposit position/reconciliation, reversal watch, asset readiness.
- **Audit:** TB+BS+P&L struktur benar. Cashflow: F-01 (:760,:794 prefix '11'=piutang), F-05 (double-count), F-19 (investing mati :823), F-20 (beginning/ending campur basis :874). Rasio: F-02 (:978 presedensi), F-03 (:932), F-04 (:979), F-18 (:961 kas='11', :965 inventory='14'). Detail: F-17 (BS MoM selalu 0% :1087-1099), F-34 (campur basis periode). Scanner: F-31 (DRAFT ikut unmapped :109).
- **Theory ref:** PSAK arus kas (klasifikasi operasi/investasi/pendanaan); rasio likuiditas.
- **PSAK check:** ❌ lapisan laporan — 9 pelanggaran penyajian sampai F1-3..F1-6+F2-7 selesai.

### backend/src/modules/accounting/accounting.service.ts (620 baris — dibaca penuh)
- **Function:** Master data: seed COA, CRUD akun & cash account, periode, opening balance draft/post/void, draft jurnal manual.
- **Audit:** Opening balance ketat (balance wajib, 1 POSTED per cutover, period OPEN, journal OPENING_BALANCE :422-525 ✅). Temuan: F-26 (updateAccount tanpa guard isSystemDefault :119; createAccount P2002 mentah :103), F-22 (draft tanpa post/void), F-33 (literal '\\n' :413), periode boleh tanggal bebas (:272).
- **Theory ref:** Internal control — segregation & change management master data.
- **PSAK check:** 🟡 — kontrol perubahan COA lemah.

### backend/src/modules/accounting/accounting-period-close.service.ts (650 baris — dibaca penuh)
- **Function:** Tutup buku: readiness 11-check, preview closing, post (manual+auto bulanan), reopen ber-reversal versioned.
- **Audit:** Logika closing REVENUE/COGS/EXPENSE → 3200 benar termasuk rugi (:441-482); blokir cascading reopen (:517-520); zero-close diizinkan dgn warning; unmapped close-readiness MENGECUALIKAN DRAFT (:589, beda dgn scanner = F-31); deposit unmapped hanya warning (F-07 by-design berisiko).
- **Theory ref:** PSAK siklus akuntansi; retained earnings.
- **PSAK check:** ✅ — file paling matang di codebase.

### backend/src/modules/accounting/accounting-readiness.service.ts (335 baris — dibaca penuh)
- **Function:** Gate kesiapan global (schema, delegate Prisma, 8 gate COA/kas/periode/opening/journal).
- **Audit:** Defensive (tidak pernah 500, selalu ready=false + nextActions). Gate `coa.seeded` ≥30 akun (:288). Tidak ada temuan negatif.
- **Theory ref:** Fail-safe design.
- **PSAK check:** ✅ n/a (infrastruktur).

### backend/src/modules/accounting/accounting-report-helpers.ts (269 baris — dibaca penuh)
- **Function:** Helper laporan: format jurnal, mapped ids, breakdown & rekonsiliasi deposit B3.3R, disclosure aset, resolusi periode P&L.
- **Audit:** `resolveProfitLossPeriod:241-268` sadar year/month (sebab P&L detail selamat dari nasib F-17). `mappedSourceIds:34-40` filter POSTED ≠ definisi mesin (≠VOID) → F-32. Rekonsiliasi deposit memisahkan opening/auto/adjustment dgn guidance anti-double-backfill — desain bagus.
- **Theory ref:** Reconciliation control.
- **PSAK check:** ✅ dengan 1 inkonsistensi definisi (F-32).

### backend/src/modules/finance/finance.service.ts (494 baris — dibaca penuh)
- **Function:** Dashboard operasional: businessHealth, occupancySummary, balanceSheetDraft, ownerDashboard (+trend).
- **Audit:** F-09 (5 lokasi DRAFT-as-revenue), F-11 (readiness hardcoded false :226), F-21 (highSignalTickets kategori invalid + .catch(()=>0) :93), F-27 (overdue pakai nilai penuh :73-77), trend loop N+1 (:426-450), E-5 deposit HELD benar (:94-99).
- **Theory ref:** Balanced scorecard operasional; approximation labeling.
- **PSAK check:** 🟡 — jujur berlabel draft/approx, tapi 4 angka salah.

### backend/src/modules/reports/reports.service.ts (513 baris — dibaca penuh)
- **Function:** 8 laporan operasional (monthly-income, aging, deposit-liability, expense, cashflow, P&L, rasio, occupancy).
- **Audit:** Metadata "OPERATIONAL_APPROXIMATION" konsisten ✅. F-09 (:31,:45,:309,:377,:485), F-27 (aging nilai penuh :115-135), F-10 (cashflow tanpa arus deposit :247-293), M-35 okupansi promoted-only benar (:439).
- **Theory ref:** Approximation vs formal reporting (F-12 hierarchy).
- **PSAK check:** 🟡 by-design approximation.

### backend/src/modules/invoice-payments/invoice-payments.service.ts (283 baris — dibaca penuh)
- **Function:** Pembayaran invoice manual: create/update/remove + syncInvoiceStatus.
- **Audit:** create blokir DRAFT/CANCELLED/booking-RESERVED (A1 :142-150); lock FOR UPDATE + anti-overpay dlm tx; update/remove diblokir bila berjurnal (:197,:245) → GAP #3 separuh termitigasi (B-04), payment tanpa jurnal tetap bisa dihapus saat OCCUPIED; posting payment dlm tx (skip benign, bukan catch-all) ✅.
- **Theory ref:** Maker-checker; immutability transaksi berjurnal.
- **PSAK check:** ✅ dengan 1 lubang guard (F1-2).

### backend/src/modules/invoices/invoices.service.ts (535 baris — dibaca penuh)
- **Function:** CRUD invoice + line (DRAFT-only), issue, cancel ber-reversal.
- **Audit:** issue/createWithLinesAndIssue → posting BLOCKING via resolveInvoiceAccountingMetadata (:106-141, setup-skip ditoleransi, invariant-skip melempar) — kebijakan TERBAIK; cancel lock+re-cek (A14 :489-527) + reversal wajib sukses (:520-527) ✅; recalc total paham DISCOUNT (M-08 :423-442).
- **Theory ref:** Revenue recognition gate; reversal integrity.
- **PSAK check:** ✅; F-15 (multi-bulan langsung 4000) tetap PR fase 4.

### backend/src/modules/deposit-ledger/deposit-ledger.service.ts (469 baris — dibaca penuh)
- **Function:** Ledger jaminan per-stay (received/settlement idempotent), summary, reconciliationLite, backfill dry-run.
- **Audit:** Idempotensi per (stay,type,sourceType,sourceId) ✅; F-30 (sourceId fallback stayId menelan setoran manual ke-2 :184); balanceAfter dari snapshot stay (urutan pemanggil menentukan akurasi, INFO); reconciliationLite = alat audit terbaik modul ini.
- **Theory ref:** Subledger reconciliation.
- **PSAK check:** ✅ operasional; jurnal formalnya di posting service.

### backend/src/modules/expenses/expenses.service.ts (105) + wifi-sales.service.ts (81) — dibaca penuh
- **Function:** CRUD beban & penjualan WiFi + jurnal otomatis.
- **Audit:** create posting best-effort `.catch(()=>undefined)` (tertangkap unmapped scanner) — kebijakan beda dgn invoice issue (B-09 keluarga); M-33 guard verified: ubah/hapus finansial berjurnal → 409 (:81-92 / :69-80) ✅.
- **Theory ref:** Immutability + audit trail.
- **PSAK check:** ✅.

### backend/src/modules/assets/assets.service.ts (33.7KB — targeted)
- **Function:** Register aset, ledger alignment (preview/post), depresiasi bulanan.
- **Audit:** Depresiasi double-run terkunci 2 lapis (unique periodYear_periodMonth :392,:461 + re-check tx); alignment state machine NEEDS_REVIEW→ALIGNED/DISCLOSURE_ONLY (:99-222); guard sudah-aligned (:563).
- **Theory ref:** PSAK 16 aset tetap; depresiasi.
- **PSAK check:** ✅.

## Tabel verifikasi ulang temuan V1 (F-01..F-16) — status per 2026-06-13
| V1 | Status | Catatan V3 |
|---|---|---|
| F-01 | ✅ terverifikasi, masih ada | + kembaran F-18 di file rasio yang LOLOS dari rencana fix V1 |
| F-02 | ✅ masih ada | :978 persis seperti dilaporkan |
| F-03 | ✅ masih ada | usul perluasan prefix 20-23 (bukan cuma 20/21) |
| F-04 | ✅ masih ada | — |
| F-05 | ✅ masih ada | digabung F1-3 dgn F-19/F-20 |
| F-06 | ✅ masih ada | by-design; interaksi baru dgn F-24 |
| F-07 | ✅ masih ada | deposit tetap warning-only di close readiness |
| F-08 | ✅ masih ada | + F-28 race P2002 sekeluarga |
| F-09 | ✅ masih ada | 10 lokasi dikonfirmasi satu per satu |
| F-10 | ✅ masih ada | — |
| F-11 | ✅ masih ada | — |
| F-12 | ✅ masih ada | + F-31 dua definisi unmapped memperparah |
| F-13 | ✅ masih ada | :829 |
| F-14 | ✅ masih ada (INFO) | — |
| F-15 | ✅ masih ada | tetap blocker PSAK penuh |
| F-16 | ✅ masih ada (INFO) | COA 1200 idle |

## Glosarium sourceType jurnal (peta lengkap utk auditor berikutnya)
| sourceType | sourceId format | Pembuat | Reversal |
|---|---|---|---|
| INVOICE | invoiceId | issue/createWithLinesAndIssue/approveSubmission/stays.create/renew | ADJUSTMENT `INVOICE_REVERSAL:<id>` (blocking di semua jalur cancel) |
| INVOICE_PAYMENT | invoicePaymentId | invoice-payments.create/update, approveSubmission | tidak pernah (mutasi payment berjurnal DIBLOKIR; F-29 dead code) |
| EXPENSE | expenseId | expenses.create (best-effort) | tidak ada (delete berjurnal diblokir M-33) |
| WIFI_SALE | wifiSaleId | wifi-sales.create (best-effort) | idem |
| DEPOSIT | stayId / `SETTLEMENT:<stayId>` | approveSubmission & stays.create (received); processDeposit & cancelEndedUnpaidStay (settlement) | tidak ada — koreksi via owner-review (F2-4) |
| ADJUSTMENT | `INVOICE_REVERSAL:` / `DP_FORFEIT:` / `FIXED_ASSET_ALIGNMENT:` | masing-masing jalur | n/a (sudah merupakan koreksi) |
| DEPRECIATION | depreciationRunId | assets.runDepreciation | belum ada jalur void run |
| OPENING_BALANCE | batchId | postOpeningBalance | void = rencana terpisah (ditolak di kode :407) |
| CLOSING_ENTRY / CLOSING_REVERSAL | `PERIOD_CLOSE:YYYY-MM[:Vn]` / `PERIOD_REOPEN:YYYY-MM:Vn` | period-close post/reopen | reopen = reversal resmi |
| MANUAL | bebas (HARUS dipaksa null — F-23) | createJournalDraft | F2-8 |

## Definisi selesai keuangan "hijau penuh" (kondisi akhir yang dikejar seluruh rencana)
1. Trial balance seimbang DAN semua laporan turunan (BS/PL/CF/rasio/MoM) konsisten satu sumber ledger.
2. unmapped-operational = 0 dgn definisi seragam (scanner == close-readiness).
3. Rekonsiliasi deposit 3 lapis (snapshot stay == TenantDepositLedger == akun 2000) mismatch 0.
4. Setiap rupiah masuk/keluar punya tepat 1 jurnal POSTED non-VOID + jejak AuditLog + (bila relevan) entri subledger.
5. Tutup buku bulanan jalan otomatis tanpa blocker selama ≥3 bulan berturut-turut.

## Prosedur verifikasi manual pasca-F1-3 (cross-check cashflow, dijalankan 1×)
1. Pilih 1 bulan UAT dgn ≥5 pembayaran + ≥2 expense + 1 deposit.
2. Hitung manual: operating-in = Σ amount jurnal INVOICE_PAYMENT + WIFI_SALE + DEPOSIT(received) bulan itu (query journalLine ber-cashAccountId, debit>0).
3. Hitung manual: operating-out = Σ EXPENSE + DEPOSIT(refund) (credit>0 pada line kas).
4. Bandingkan dgn endpoint cashflow — ketiga angka HARUS identik ke rupiah.
5. Verifikasi identitas: cashBeginning (=saldo per akhir bulan lalu) + netCashflow = cashEnding = Σ saldo CashAccount per akhir bulan.
6. Ulangi utk bulan dgn OPENING_BALANCE — pastikan tidak masuk arus operasi.
7. Dokumentasikan hasil di CHANGELOG sebagai bukti UAT F1-3 (tabel angka manual vs endpoint).
