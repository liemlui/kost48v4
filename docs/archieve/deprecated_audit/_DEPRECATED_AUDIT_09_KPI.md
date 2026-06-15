# KPI & MOTIVASI DEEP (V3) — Formula diverifikasi per baris; K-1..K-5 (V1) terkonfirmasi + K-6/K-7 baru; 10 teori psikologi dipetakan ke kode aktual

> ### 🔴 UPDATE 2026-06-13 (keputusan owner — `04_KEPUTUSAN_OWNER.md` Bagian 3)
> - **Hanya 1 staf operasional** → **K-4 (beban timpang) jadi non-isu**; round-robin (F2-10) & leaderboard antar-staf (F3-5) **DITUNDA** sampai staf bertambah.
> - **K-3 (reinforcement loop) TERJAWAB:** model **tenant-sebagai-pengawas** — staf tutup tiket sendiri, **tenant menilai kinerja staf**, nilai itu indikator ke owner; owner menindak staf berdasar review. Review tenant→staf = mekanisme konsekuensi resmi. Perkuat (auto-prompt review F3-20).
> - **K-1/K-2 tetap berlaku** (staf tunggal perlu lihat skor + rumus; reward bonus D-13 berlaku).
> - Audit kerja admin = insidental (saat ada masalah) — bukan sumber skor utama; rutinitas+tiket+review tenant yang utama.
**Basis baca:** `staff-performance.service.ts` (:1-300 inti formula), `tickets.service.ts` (:353-760 lifecycle+guard), `room-items.service.ts` (:239-250 event KPI), `staff-routines.service.ts` (V1 + spot-check), `tenant-staff-reviews.service.ts` (V1).

## Formula skor — verifikasi baris demi baris (`staff-performance.service.ts`)
| Komponen | Bobot | Baris | Verified |
|---|---|---|---|
| Rutinitas DONE | +1/item | :223 `routineDone.length` | ✅ |
| Tiket DONE/CLOSED | +3/item | :223 `ticketsDone.length * 3` | ✅ |
| Catat meter | +2/item | :223 `meters.length * 2` | ✅ |
| Laporan stok (tiket kategori *STOK*) | +2/item | :223 `stockReports.length * 2` | ✅ catatan: stockReports difilter dari TIKET (:210), bukan field report — laporan barang via `room-items.updateStatusFromField` masuk lewat `staffPerformanceEvent` +1/+2 (:246) yang TIDAK dijumlahkan ke skor (events hanya evidence :274) |
| Audit PASS / NEEDS_FIX / FAILED / NOT_DONE | +3 / −3 / −10 / −15 | :27-33 `auditDelta` + :223-224 | ✅ |
| Review tenant (≥3 review) avg≥4.5 / avg<3 / per ≤2⭐ | +5 / −6 / −2 | :223-224 | ✅ |
| Bukti foto hilang (rutin/tiket) | −2/item | :224 | ✅ |
| Skor = clamp(100 + net, 0..100) | — | :226-227 | ✅ K-1 |

## TEMUAN (K-1..K-5 verified, K-6..K-8 BARU)
| # | Sev | Evidence | Issue | Theory ref |
|---|---|---|---|---|
| K-1 | 🟡 verified | `:226-227` clamp; `netKpi` di response `:248` | Staf 40 poin positif = skor 100 = staf pas-pasan → diferensiasi puncak hilang; pakai netKpi utk leaderboard | Expectancy Theory (effort→reward putus) |
| K-2 | 🟡 verified | Tidak ada endpoint/copy formula utk staf | Skor "kotak hitam" bagi staf | Equity Theory |
| K-3 | 🟡 verified | Tidak ada konsekuensi otomatis dari skor | Murni informasi; perilaku tak berubah | Reinforcement Theory |
| K-4 | 🟡 verified | `auto-ops.service.ts:610-614, 773-777` + `stays.service.ts:615-619` | Auto-assign tiket = staf id TERKECIL (3 lokasi identik `orderBy id asc`) → beban & poin +3/tiket menumpuk ke 1 orang | Equity rusak oleh assignment |
| K-5 | 🟡 verified | `monthRange:9-21` pakai `setHours` lokal server | Batas bulan KPI = TZ server (mitigasi: server WIB); W-05 tetap antre | — |
| K-6 | 🟠 BARU | `:174-184` window tiket = OR(resolvedAt, updatedAt, createdAt dlm bulan) lalu `ticketsDone` = filter status DONE/CLOSED (:209) | Tiket resolved bulan lalu yang DI-CLOSE bulan ini ter-include via `updatedAt` → **+3 poin dihitung DUA BULAN** (bulan resolve & bulan close). Juga: tiket assigned yang baru dibuat (OPEN) bulan ini masuk list evidence meski belum dikerjakan | Fix: dasar hitung ticketsDone = `resolvedAt` dlm bulan saja |
| K-7 | 🟡 BARU | `tickets.service.ts:444,479` start; `:500` markDone | Staf boleh `start` tiket UNASSIGNED lalu auto-claim (:479 `assignedToId: actor.id`) — bagus utk autonomy (SDT) TAPI tanpa notifikasi/visibilitas admin; dikombinasi K-4, staf rajin bisa "panen" tiket open utk poin sementara yang malas menunggu assign | Self-Determination ✓ tapi perlu guardrail kuota |
| K-8 | INFO BARU | `tickets.service.ts:651-659` | Notif tutup tiket BARANG_PINDAH dikirim ke `actor.id` = admin yang menutup SENDIRI — penerima salah; regex parse hanya utk copy notif (risiko V1 "rapuh" turun jadi kosmetik) | Kirim ke staf assignee/pelapor |

## Pemetaan 10 teori psikologi → kondisi kode aktual → langkah termurah
| Teori | Status di kode | Evidence | Langkah termurah |
|---|---|---|---|
| Maslow (safety/physiological) | Di luar app (gaji/kontrak) | — | Absensi sederhana = KPI kehadiran (Fase 3; belum ada field) |
| Herzberg Two-Factor | Hygiene ✓ (tools jelas), Motivator ✗ (tanpa recognition) | skor ada, reward loop tidak | "Staff of the Month" dari netKpi (rekap otomatis tgl 1 ke owner) |
| McClelland (nAch) | Sebagian — skor & kategori label (:35-41) | categoryFromScore 5 jenjang | Badge derivatif: Problem Solver (10 tiket/bln), Tenant Favorite (5×5⭐) — hitung on-render, TANPA schema baru |
| Self-Determination (autonomy) | ✓ sebagian — staf bisa claim tiket OPEN (K-7) | tickets:479 | Formalkan: tampilkan "tiket tersedia utk diambil" di queue staf |
| Goal-Setting | ✓ via routine template (admin set target harian) | staff-routines templates | Target bulanan eksplisit per staf di template |
| Expectancy | 🟡 putus di clamp 100 (K-1) | :227 | Leaderboard pakai netKpi |
| Equity | ✗ formula tersembunyi (K-2) + assignment timpang (K-4) | 3× orderBy id asc | Round-robin (W-04/F2-9) + kartu rumus skor |
| Reinforcement | ✗ (K-3) | — | Reward bulanan manual owner berbasis rekap |
| Nudge | ✓ guard satu-kerja-aktif memaksa fokus (tickets:448-472; routines assertNoActiveWork) | verified | Sort antrian staf by umur+prioritas |
| Loss Aversion | ✓ tepat sasaran ke TENANT (DP hangus, reminder H-x); ke staf hanya minus audit — cukup, jangan ditambah | auditDelta −15 max | — (sengaja tidak dipakai lebih jauh ke staf) |

## KPI yang BELUM ada (gap matrix)
| KPI | Data sudah ada? | Cara |
|---|---|---|
| Waktu resolusi tiket rata-rata | ✅ `resolvedAt − createdAt` | agregat per staf per bulan; display-only dulu (F3-6) |
| Kehadiran/absensi | ❌ tidak ada model | butuh keputusan owner (schema baru) |
| First-response time tiket | 🟡 (start = IN_PROGRESS timestamp via updatedAt, tak presisi) | perlu kolom startedAt bila serius |
| Kerjasama tim / inisiatif | ❌ subjektif | masuk via StaffWorkAudit notes (sudah bisa) |

## Gamification design (tanpa schema baru kecuali disebut)
1. **Leaderboard netKpi** (bukan skor clamp) bulanan + all-time — endpoint agregat read-only di staff-performance; tampil utk semua staf (Equity + Social Comparison).
2. **Badge on-the-fly** saat render laporan bulanan: Problem Solver (≥10 tiket DONE), Super Cleaner (≥20 rutinitas), Tenant Favorite (≥5 review 5⭐), Zero-Minus Streak (negativeValue=0). Tanpa tabel baru.
3. **Reward loop:** rekap otomatis tanggal 1 ke owner (notif in-app berisi top-3 netKpi) → owner putuskan bonus MANUAL (Herzberg motivator; jangan otomatisasi uang).
4. **Kartu "Cara skor dihitung"** statis di `StaffMonthlyReportPage.tsx` dari tabel formula di atas (K-2, 1 sesi kecil).
5. PRASYARAT keadilan: K-4 round-robin dan K-6 fix double-count HARUS lebih dulu — leaderboard di atas data timpang = demotivasi (Equity backfire).

## RECOMMENDATIONS (ordered)
1. K-6: ganti dasar ticketsDone ke `resolvedAt` dalam bulan (1 baris where) — integritas KPI sebelum leaderboard.
2. K-4/W-04: round-robin assignee (beban tiket OPEN/IN_PROGRESS tersedikit) di 3 lokasi.
3. K-2: kartu rumus skor di UI staf.
4. Leaderboard netKpi + rekap owner tgl 1.
5. K-8: penerima notif BARANG_PINDAH → assignee, bukan actor.

## OPEN QUESTIONS → ✅ TERJAWAB 2026-06-13 (`04_KEPUTUSAN_OWNER.md`)
- Reward finansial bulanan? → **YA, bonus manual owner** (D-13) → leaderboard netKpi BOLEH TERBUKA antar-staf (F3-5); rekap top-performer otomatis tgl 1.
- K-7 claim tiket bebas? → **boleh + auto-assign round-robin adil** (D-12) → F2-10; tampilkan "tiket tersedia diambil" di queue staf.

---

## LAMPIRAN A — Audit per-file domain staf/KPI (format V3 §5)

### backend/src/modules/staff-performance/staff-performance.service.ts (22.5KB — dibaca :1-300 inti + struktur)
- **Function:** Agregasi KPI bulanan per staf (6 sumber data paralel :168-205), audit kerja admin, saran audit ber-riskScore.
- **Audit:** formula transparan di kode (:223-227) tapi tidak di UI (K-2); window tiket OR-3-tanggal → K-6 double-count; monthRange TZ server (K-5); events KPI dari field-report TIDAK masuk skor (hanya evidence) — dokumentasikan agar staf tidak bingung poin laporan barang; createAudit menulis StaffWorkAudit + event ganda (:117-159) konsisten.
- **Theory ref:** Expectancy, Equity, Goal-Setting.
- **Verdict:** ✅ desain; 🟠 1 bug hitung (K-6).

### backend/src/modules/tickets/tickets.service.ts (28.3KB — dibaca :350-760 lifecycle)
- **Function:** Lifecycle tiket backoffice/portal/otomatis: assign→start→done→close/cancel + gate kamar.
- **Audit:** M-26/M-27 guard verified (:409-411, :500-502); satu-kerja-aktif utk staf (:448-472) = nudge fokus; staf boleh claim tiket unassigned (:444,:479 → K-7); close: catatan final ≥8 (:545-549), status final barang wajib (:562-569), field report ikut CLOSED (:635-641), gate kamar membedakan promoted vs booking (:662-709) — logika allowBookingWhileCleaning matang; BARANG_PINDAH regex hanya utk notif + salah penerima (K-8 :644-659); cancel hanya dari OPEN (:738-747).
- **Theory ref:** State machine; SDT autonomy.
- **Verdict:** ✅ kuat; 2 catatan (K-7 kebijakan, K-8 kosmetik).

### backend/src/modules/staff-routines/staff-routines.service.ts (18.3KB — verifikasi V1 dipertahankan)
- **Function:** Template rutinitas (admin) → checklist harian staf → KPI.
- **Audit:** guard `assertNoActiveWork` lintas tiket+rutinitas (dipanggil juga dari tickets.start :457-460) — konsisten dua arah; tidak ada temuan baru pada pass ini.
- **Verdict:** ✅.

### backend/src/modules/tenant-staff-reviews/tenant-staff-reviews.service.ts (4.7KB — V1)
- **Function:** Review tenant→staf ber-gate eligibilitas.
- **Audit:** anti-duplikat P2002; ≤2⭐ wajib komplain + notif admin; ≥4⭐ pujian. Bobot review hanya aktif bila ≥3 review/bulan (:223-224 performance) — anti small-sample bias ✅ (desain bagus yang layak dipertahankan).
- **Verdict:** ✅.

## LAMPIRAN B — Simulasi formula (sanity check angka, basis bobot terverifikasi)
| Profil staf bulan X | Komponen | Hitung | netKpi | Skor tampil |
|---|---|---|---|---|
| Rajin lengkap | 20 rutinitas + 8 tiket + 10 meter + 2 stok + 2 audit PASS, 0 minus | 20+24+20+4+6 | +74 | 100 (clamp; diferensiasi hilang → K-1) |
| Standar | 12 rutinitas + 3 tiket + 4 meter, 1 foto kurang | 12+9+8 − 2 | +27 | 100 (clamp juga!) |
| Bermasalah | 5 rutinitas + 1 tiket; audit FAILED + NOT_DONE; avg rating 2.5 (4 review, 2×≤2⭐) | 5+3 − (10+15+6+4) | −27 | 73 |
- Kesimpulan simulasi: clamp membuat "rajin" dan "standar" identik (100 vs 100) padahal netKpi 74 vs 27 — bukti kuantitatif K-1; staf bermasalah tetap terlihat "Cukup" (73 ≥ 60) — pertimbangkan ambang kategori diturunkan ATAU tampilkan netKpi berdampingan.

## LAMPIRAN C — Kontrak data leaderboard (spesifikasi F3-5 utk AI eksekutor)
- Endpoint: `GET /api/staff-performance/leaderboard?month=YYYY-MM` (OWNER/ADMIN; varian staf: tanpa email rekan).
- Response per item: `{ staffId, fullName, netKpi, score, ticketsDone, routineDone, avgRating, rank }` — urut netKpi desc, tie-break ticketsDone.
- PRASYARAT data benar: K-6 fix (resolvedAt-only) + K-4 round-robin sudah jalan ≥2 minggu sebelum leaderboard diumumkan ke staf (hindari kesan tidak adil pada data lama).
- Privasi: rating per-tenant tidak pernah tampil ke sesama staf (hanya agregat).

## LAMPIRAN D — Katalog lengkap sumber poin (rujukan tunggal utk kartu rumus F3-5)
| Sumber | Event/kondisi | Poin | Masuk skor? | Catatan |
|---|---|---|---|---|
| StaffRoutineCompletion DONE | per item | +1 | ✅ | requiresPhoto tanpa foto → −2 |
| Ticket DONE/CLOSED (assigned) | per item | +3 | ✅ | dasar tanggal = K-6 fix |
| Ticket tanpa resolutionImage | per item | −2 | ✅ | bukti = budaya |
| MeterReading recordedBy | per item | +2 | ✅ | — |
| Tiket kategori *STOK* | per item | +2 | ✅ | dobel dgn +3 tiket? TIDAK — stockReports subset tickets, +2 TAMBAHAN di atas +3 (sadari saat menulis kartu rumus) |
| StaffWorkAudit PASS/NEEDS_FIX/FAILED/NOT_DONE | per audit | +3/−3/−10/−15 | ✅ | admin-driven |
| Review tenant (syarat ≥3/bln) | avg≥4.5 / avg<3 / per ≤2⭐ | +5/−6/−2 | ✅ | anti small-sample |
| StaffPerformanceEvent STOCK_REPORTED | laporan barang via room-items | +1 (+2 foto) | ❌ evidence-only | komunikasi ke staf penting (ekspektasi poin) |
| RoutineCompletion NEED_HELP | per item | 0 | ❌ | masuk insight asisten saja |

## LAMPIRAN E — Anti-gaming review (kontrol yang SUDAH ada vs perlu ditambah)
| Vektor gaming | Kontrol sekarang | Cukup? |
|---|---|---|
| Staf "panen" tiket mudah (K-7 claim bebas) | tidak ada kuota | 🟡 tambah visibilitas admin (F3-1 notif assign membantu) |
| Tutup tiket tanpa kerja nyata | wajib resolutionNote + foto −2 + audit admin sampling | ✅ berlapis |
| Rutinitas dicentang massal | requiresPhoto per template + audit | ✅ |
| Review tenant dipengaruhi staf | review hanya dari tenant ber-stay aktif + anti-duplikat + ≥3 utk berdampak | ✅ |
| Meter asal catat utk poin | guard kronologis monoton meter-readings | ✅ tidak bisa mundur |
- Kesimpulan: desain anti-gaming MATANG; satu-satunya celah nyata = distribusi assignment (K-4), bukan kecurangan individu.

## Definisi selesai KPI "hijau penuh"
1. K-6 fix: 1 tiket = 1 bulan poin (uji lintas-bulan lulus).
2. Round-robin aktif: deviasi jumlah tiket antar staf aktif < 30% per bulan.
3. Rumus skor terlihat oleh staf di halaman laporannya sendiri.
4. Leaderboard netKpi tampil dan dipakai owner utk rekap bulanan tgl 1.
5. Kebijakan K-7 (claim bebas) diputuskan dan didokumentasikan di copy UI staf.
6. Tidak ada komponen poin "tersembunyi" — Lampiran D = satu-satunya sumber kebenaran yang dirender ke kartu rumus.

## Catatan penutup domain
Formula KPI KOST48 jauh lebih matang dari yang umum ditemui di operasi sekecil ini: berbobot, multi-sumber, anti-small-sample, dan anti-gaming berlapis. Yang menahannya bukan rumus, melainkan tiga hal manusiawi — keadilan distribusi (K-4), transparansi (K-2), dan loop konsekuensi (K-3). Ketiganya bisa ditutup tanpa schema baru (kecuali badge opsional). Urutan wajib: perbaiki keadilan & integritas hitung (K-4 round-robin + K-6 double-count) SEBELUM membuka leaderboard — menampilkan peringkat di atas data timpang adalah cara tercepat mematahkan motivasi yang justru ingin dibangun.
