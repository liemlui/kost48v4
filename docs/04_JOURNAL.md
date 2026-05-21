# KOST48 V5 — Project Journal
**Versi:** 2026-05-21 V5.15 Intelligent Command Center + Finance Foundation journal sync

## 2026-05-21 — V5.15 Direction Locked

### Konteks

Setelah dua ACT frontend besar untuk V5.14, UI KOST48 sudah jauh lebih dekat ke Command Center:

- dashboard owner/admin/staff sudah memakai assistant/action queue/compact metrics,
- tenant portal sudah menjadi My Stay Guide,
- invoice/stay/renew/ticket/reminder/public room pages sudah mulai memakai pola command center,
- frontend build pada package ACT sukses,
- backend tetap unchanged.

Namun user memberi masukan baru setelah melihat hasil UI:

```text
1. Assistant kesehatan dan priority queue tidak boleh isi hal yang sama.
2. Kalau dashboard sudah punya link ke laporan, sidebar tidak perlu penuh.
3. Graph perlu bisa diubah: donut/bar/line/table.
4. Kondisi kamar sebenarnya bagian dari occupancy core report.
5. Formal ratio finance harus disiapkan dengan balance sheet.
6. Backend bahkan schema database boleh dibuka jika perlu.
7. usePaymentUrgency.ts adalah contoh sempurna rule engine yang terasa AI tanpa biaya.
```

### Sintesis

Masukan ini mengubah fokus dari:

```text
V5.14 — Command Center UI MVP
```

menjadi:

```text
V5.15 — Intelligent Command Center + Finance Foundation
```

Fokus V5.15 bukan menambah lebih banyak kartu, melainkan:

- mengurangi duplikasi,
- membuat assistant benar-benar seperti diagnosis,
- membuat queue benar-benar seperti daftar kerja,
- membuat dashboard menjadi entry point ke reports,
- membuat chart lebih berguna,
- membangun rule intelligence zero-cost,
- menyiapkan backend/finance data foundation untuk balance sheet,
- membuka AI hanya on-demand dan cached.

## 2026-05-21 — Key Insight: usePaymentUrgency Pattern

Audit user menemukan bahwa `usePaymentUrgency.ts` sudah menjadi pola ideal:

```text
rule engine yang terasa AI, tanpa API call, tanpa biaya, deterministic, dan langsung berguna.
```

Pola ini akan direplikasi ke beberapa domain:

- `useBusinessHealthScore`
- `useTenantRiskProfile`
- `useCashflowForecast`
- `useOperationalStressIndex`
- `useMeterAnomalyDetector`
- `SmartCopyEngine`

Keputusan penting:

```text
Math/rule first. AI/LLM later.
```

Jika insight bisa dihitung dengan if/else, date diff, aggregation, scoring, atau threshold, tidak boleh memakai LLM.

## 2026-05-21 — AI Positioning

AI tetap boleh masuk, tetapi hanya Tier 1 dan hanya on-demand.

Allowed AI examples:

- Payment Proof Scanner,
- Reminder Personalizer,
- Business Narrative short summary,
- text classification.

Tidak boleh:

- AI call saat page load,
- AI auto approve,
- AI mutate invoice/stay/room/payment,
- AI hidden background task,
- prompt panjang berisi seluruh database.

Cache wajib. Rate limit wajib. Output harus pendek dan structured.

MVP cache cukup in-memory `Map` di NestJS service. Persistent `ai_cache` table boleh direncanakan setelah itu dengan migration plan.

## 2026-05-21 — Finance Foundation

Formal ratios saat ini masih locked karena app belum memiliki balance sheet-grade data.

Arah baru:

```text
Balance sheet first, formal ratios later.
```

Data yang harus dimodelkan atau dipetakan:

- cash/bank,
- accounts receivable dari open invoices,
- deposit held sebagai liability,
- expenses,
- payables jika tersedia,
- equity/capital,
- assets jika ada model asset.

Formal ratios tidak boleh menampilkan angka palsu.

Rasio yang boleh dibuka setelah data valid:

- Current Ratio,
- Quick Ratio,
- Debt-to-Equity,
- ROCE.

## 2026-05-20 — V5.14 Command Center Direction Locked

### Konteks

Setelah V5.12 full regression PASS dan V5.13 release readiness pack, user memberi feedback kuat bahwa UI depan masih “kurang mengena”. Masalah utama bukan lagi backend correctness, melainkan cara aplikasi menyajikan informasi.

Feedback user:

```text
Semua yang tampil di bagian depan kurang mengena.
Lebih simpel tapi informatif dan sangat mudah dipahami.
Butuh mini assistant bagi admin/staff/tenant/owner.
Tampilkan rekomendasi atau flow bisnis yang tidak berjalan baik.
```

Diskusi desain menghasilkan arah final:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

### Sintesis Proposal

Tiga sumber ide digabung:

1. Proposal besar UX/Product Redesign:
   - role-based UX,
   - Business Assistant rule-based,
   - page-by-page redesign,
   - microcopy,
   - checkout readiness checklist,
   - component system.

2. Proposal Intelligent Command Center:
   - kritik vanity metrics,
   - action-first architecture,
   - resolution path,
   - dashboard sebagai “apa yang salah dan apa yang harus dilakukan”.

3. Proposal Co-pilot Operasional Kos:
   - owner = business health cockpit,
   - admin = action queue commander,
   - staff = operational task board,
   - tenant = my stay guide,
   - MVP priority list.

### Keputusan

V5.14 tidak membuka backend besar atau multi-app. V5.14 menjadi:

```text
Frontend-first Command Center MVP
```

Fokus awal:

- Admin Dashboard Command Center,
- Owner Dashboard Business Health,
- Tenant Portal Home simplification,
- reusable assistant/action components,
- status badge consistency,
- Stay Detail / Checkout readiness direction.

## 2026-05-20 — V5.14-A Docs/Product Direction Sync

This package updated only the 7 active docs:

```text
00_GROUND_STATE.md
01_CONTRACTS.md
02_PLAN.md
CHECKLIST.md
03_DECISIONS_LOG.md
04_JOURNAL.md
CHANGELOG.md
```

No source code changed.

Purpose:

- move active plan from V5.13 release readiness to V5.14 Command Center MVP,
- preserve Stable Modular Monolith as active architecture,
- preserve multi-app as roadmap only,
- define UX/product direction and safe patch phases,
- define assistant/action queue component contracts,
- define verification gates before ACT.

## Historical Notes — V5.13 Release Readiness Pack

V5.13 added release/deploy support scripts and docs only:

- local release check,
- production-safe smoke,
- source-lite ZIP creator,
- docs baseline sync.

No feature code, schema, DB reset, or multi-app work was included.

## Historical Notes — V5.12 Full Regression PASS + Push

User local UAT reported:

- Renew full UAT PASS.
- Checkout guard UAT PASS.
- Payment regression PASS.
- Full regression pack PASS.
- Commit `e93c78a` pushed to `main`.

This established `e93c78a` as stable modular monolith baseline before V5.13 release readiness.

## Historical Notes — V5.8-A Business Guards

V5.8-A business guards remain active:

- renewal invoice is `ISSUED`,
- checkout final blocked by open invoice,
- DRAFT blocks checkout,
- no auto-create final utility invoice in complete.

## Historical Notes — V5.9 Multi-App Lesson

V5.9 multi-app attempt remains rollback lesson:

- do not generate apps yet,
- do not mirror runtime aliases,
- do not split before monolith boundary gates pass.
