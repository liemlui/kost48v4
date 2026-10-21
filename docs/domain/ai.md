# AI Owner/Admin — Fase G Approval Copilot

## Daftar isi

- [Bagian utama AI](#d4c-ai-utama)
- [Bagian lanjutan AI](#d4c-ai-lanjutan)
- [Bagian C — IoT: spesifikasi, inventaris, arsitektur](#d4c-iot)


Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan & spesifikasi AI berbayar (DeepSeek) untuk OWNER/ADMIN — pola aman/terlarang, struktur backend/frontend, hemat token, audit trail, fitur G0–G9, UAT (dari M09)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [ANTREAN](../ANTREAN.md) · [AI owner/admin](ai.md) · [keuangan.md](keuangan.md) · [operasional.md](hunian.md#d4c-operasional) · [publik.md](publik.md)

> Migrasi dari docs/M09_AI_OWNER_ADMIN.md (B2 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks tidak diubah.
> Batch B2 memindahkan **seluruh isi M09 apa adanya** ke file ini (satu tujuan per handoff owner). Bagian bertanggal — Update 16 Jul 2026, status Fase G/J/K, dan `## Audit 360° P6 AI Flow (Jul 2026)` — **ikut utuh di sini dan belum dipisah**; pemisahan ke `docs/AUDIT.md`/`docs/arsip/` dilakukan pada tahap konsolidasi audit/arsip atau batch lanjutan sesuai keputusan owner.

<a id="d4c-ai-utama"></a>
## Status Saat Ini

- **Update 16 Jul 2026 — KTP portal/admin:** tenant dapat upload KTP miliknya dari Profil Saya dan upload masuk antrean Admin. OCR tetap lokal, AI hanya rekomendasi, OWNER/ADMIN melakukan keputusan final. Detail teknis dibuka bertahap agar antrean tetap ringkas.

- **Fase G (G0-G9) SELESAI** 19-20 Jun 2026 — modul `backend/src/modules/owner-ai/` (15 file) + `frontend/src/components/ai/*`.
- **Fase J — Hardening SELESAI** 20 Jun 2026 — J0-J4: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP dibukukan di M09. Detail: `docs/arsip/legacy/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.
- **Fase K — Pasca-Audit SELESAI** 20 Jun 2026 — 13 task termasuk:
  - **Circuit breaker DeepSeek** (`deepseek.client.ts`): 5 kegagalan berturut-turut → circuit open 30 detik, auto-recover.
  - **Fallback MarketAnalysis.chat**: API gagal → return `RULE_FALLBACK` dengan pesan, bukan 500 error.
  - **Konfigurasi AI owner-configurable** (R3): model, base URL, daily limit, toggle enable/manual-only/log — semua bisa diatur dari **Owner Settings → tab "AI & Biaya"**. Disimpan di `OperationalSetting` (DB), fallback ke `.env`. API key TETAP di `.env` (keamanan). Detail: `docs/arsip/legacy/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.
- Integrasi DeepSeek: client di `backend/src/modules/market-analysis/deepseek.client.ts`.
- Halaman frontend: `frontend/src/pages/marketing/MarketAnalysisPage.tsx`, settings di `frontend/src/pages/settings/OwnerSettingsPage.tsx`.
- OCR KTP gratis/offline: `frontend/src/utils/ktpOcr.ts`, `frontend/src/pages/bookings/GuestBookingForm.tsx`.
- Audit trail: `AuditLog.meta.ai` untuk jejak keputusan yang memakai AI.

<a id="d4c-ai-lanjutan"></a>
## Keputusan Owner Fase G

1. Semua fitur AI harus aktif hanya saat Owner/Admin menekan tombol eksplisit seperti "Analisa dengan AI", "Buat Draft AI", atau "Bantu Review".
2. Tidak ada AI otomatis dari cron, auto-ops, page load, interval, background job, atau prefetch React Query.
3. AI hanya untuk role OWNER/ADMIN. Tenant dan Staff tidak mendapat tombol AI berbayar.
4. AI boleh membuat draft dan rekomendasi; aksi final tetap tombol manusia.
5. Setiap tombol approval harus menampilkan data sumber, hasil AI, confidence, risiko, dan payload final yang akan dikirim.
6. Fitur uang wajib melewati guard deterministik sistem. AI tidak boleh mengganti rule no-partial, trial balance, deposit liability, period close, atau posting jurnal.
7. Semua hasil yang disetujui manusia harus masuk `AuditLog.meta.ai`.
8. Data sensitif dikirim seminimal mungkin. Untuk KTP, jangan kirim gambar ke DeepSeek; OCR gambar tetap lokal, DeepSeek hanya boleh menormalkan teks OCR bila diperlukan.
9. Default model hemat biaya: `deepseek-v4-flash`. Model berat seperti `deepseek-v4-pro` hanya untuk analisa finance mendalam dan Owner-only.
10. Bila `DEEPSEEK_API_KEY` kosong atau API gagal, fitur harus tetap menampilkan fallback offline/rule-based, bukan error yang memblokir kerja.

## Referensi DeepSeek Terkini

Verifikasi 2026-06-19 dari dokumentasi resmi DeepSeek:

- Base URL OpenAI-compatible: `https://api.deepseek.com`.
- Model yang disarankan: `deepseek-v4-flash` dan `deepseek-v4-pro`.
- Nama lama `deepseek-chat` dan `deepseek-reasoner` dijadwalkan deprecated 2026-07-24 15:59 UTC.
- DeepSeek mendukung JSON output dan context caching otomatis berbasis prefix.
- Context caching aktif otomatis; agar hemat, prefix prompt harus stabil dan data besar ditempatkan dalam urutan yang sama.

Link rujukan:

- `https://api-docs.deepseek.com/`
- `https://api-docs.deepseek.com/quick_start/pricing`
- `https://api-docs.deepseek.com/guides/json_mode`
- `https://api-docs.deepseek.com/guides/kv_cache`

## Prinsip Arsitektur

### Pola Aman

Semua fitur AI memakai pola tiga langkah:

1. **Build snapshot** di backend dari data sistem yang sudah diringkas.
2. **AI draft** hanya setelah tombol manual ditekan.
3. **Human approve** memanggil endpoint domain yang sudah ada, bukan endpoint AI langsung menulis ke DB.

Contoh:

```text
Admin buka pembayaran pending
-> klik "Bantu Review AI"
-> backend kirim snapshot invoice + submission + rule no-partial ke DeepSeek
-> AI mengembalikan draft rekomendasi
-> UI menampilkan rekomendasi + payload final
-> Admin klik "Setujui pembayaran" atau "Tolak"
-> endpoint payment-submissions existing berjalan
-> AuditLog mencatat aiSuggestion bila dipakai
```

### Pola Terlarang

- AI memanggil `approveSubmission()` sendiri.
- AI membuat `InvoicePayment`, `Expense`, `InventoryMovement`, `Ticket`, `Stay`, `JournalEntry`, atau `KTP_VERIFY` tanpa tombol approve manusia.
- AI berjalan otomatis saat dashboard dibuka.
- AI mengirim seluruh tabel mentah ke DeepSeek.
- AI mengirim foto KTP, foto bukti bayar, atau dokumen identitas mentah ke DeepSeek.
- AI membuat angka yang tidak ada di snapshot. Jika data kurang, output harus `missingData`.

## Struktur Backend Disarankan

Fase awal boleh memakai modul `market-analysis`, tetapi untuk Fase G yang lebih luas buat modul baru agar domain AI tidak tercampur marketing:

```text
backend/src/modules/owner-ai/
  owner-ai.module.ts
  owner-ai.controller.ts
  owner-ai.service.ts
  ai-context-builder.service.ts
  ai-snapshot-hash.util.ts
  dto/
    owner-ai.dto.ts
    ai-approval.dto.ts
  prompts/
    finance.prompt.ts
    owner-brief.prompt.ts
    payment-review.prompt.ts
    expense-ocr.prompt.ts
    ktp-ocr.prompt.ts
    ops-inventory.prompt.ts
```

Jika ingin meminimalkan perubahan, `deepseek.client.ts` boleh tetap di `market-analysis` dahulu. Namun task G0 harus membuat client lebih umum dan tetap kompatibel dengan `MarketAnalysisService`.

### Client DeepSeek Target

`deepseekChat()` saat ini hanya mengembalikan string. Target Fase G:

```ts
type DeepseekChatResult = {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
};
```

Parameter tambahan:

```ts
{
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
  json?: boolean;
  thinking?: 'disabled' | 'enabled';
  reasoningEffort?: 'low' | 'medium' | 'high';
}
```

Aturan:

- Default model: `process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'`.
- Model finance mendalam: `process.env.DEEPSEEK_FINANCE_MODEL || 'deepseek-v4-pro'`.
- Jika `json: true`, body request wajib menambah `response_format: { type: 'json_object' }`.
- Prompt harus menyebut kata `json` dan memberi contoh JSON.
- Simpan hanya `content`, `usage`, `model`, `promptHash`, `snapshotHash`; jangan simpan API key.

## Struktur Frontend Disarankan

Komponen reusable:

```text
frontend/src/components/ai/
  AiActionButton.tsx       # tombol manual; tidak auto-run
  AiResultPanel.tsx        # ringkasan hasil, confidence, warning
  AiApprovalDrawer.tsx     # diff data lama vs payload final
  AiCostBadge.tsx          # estimasi token/usage bila tersedia
  AiSourceSnapshot.tsx     # data sumber yang dikirim ke AI
```

Rules:

- `useQuery` untuk status AI boleh jalan otomatis.
- Semua `useMutation` AI harus dipicu klik tombol, bukan `useEffect`.
- Tombol AI harus disabled bila `configured=false`.
- Jika fallback offline, tampilkan badge "Rule fallback".
- Setiap panel hasil harus punya tombol "Gunakan draft", "Abaikan", dan untuk aksi mutasi "Setujui dan Simpan".

## Format Response Standar

Semua endpoint AI Fase G mengembalikan bentuk ini:

```json
{
  "configured": true,
  "mode": "DEEPSEEK",
  "model": "deepseek-v4-flash",
  "snapshotHash": "sha256...",
  "promptHash": "sha256...",
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 500,
    "total_tokens": 1700,
    "prompt_cache_hit_tokens": 800,
    "prompt_cache_miss_tokens": 400
  },
  "result": {},
  "warnings": [],
  "missingData": [],
  "fallback": false
}
```

Jika API gagal:

```json
{
  "configured": true,
  "mode": "RULE_FALLBACK",
  "result": {},
  "warnings": ["AI gagal dihubungi; hasil memakai rule fallback."],
  "fallback": true
}
```

## Hemat Token dan Context Management

### Aturan Snapshot

- Kirim agregat, bukan raw rows.
- Untuk list, batasi `top 10` atau `top 20`.
- Untuk transaksi uang, kirim angka final dan status, bukan semua line jurnal mentah kecuali dibutuhkan.
- Untuk tenant, kirim `tenantId`, `roomCode`, status, umur invoice, dan nominal; jangan kirim email, nomor KTP, foto, atau alamat lengkap.
- Untuk staf, kirim role/status dan metrik kerja; jangan kirim data personal yang tidak relevan.
- Untuk KTP, kirim teks OCR yang sudah dihasilkan lokal dan field yang mau dibandingkan.
- Untuk dokumen panjang, kirim ringkasan rule sistem yang stabil sebagai prefix agar context caching bisa bekerja.

### Urutan Prompt Stabil

Agar context caching DeepSeek efektif:

1. System prompt tetap identik per fitur.
2. JSON schema output tetap identik.
3. Business rules tetap identik.
4. Snapshot data dinamis diletakkan setelah prefix stabil.
5. Pertanyaan user paling akhir.

### Budget Guard

Env yang disarankan:

```env
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_FINANCE_MODEL=deepseek-v4-pro
AI_FEATURES_ENABLED=false
AI_DAILY_REQUEST_LIMIT=50
AI_OWNER_DAILY_REQUEST_LIMIT=30
AI_ADMIN_DAILY_REQUEST_LIMIT=20
AI_MAX_INPUT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1400
AI_FINANCE_MAX_OUTPUT_TOKENS=2200
AI_LOG_USAGE=true
```

Untuk Fase awal, limit in-memory seperti `MarketAnalysisService.rateLimit()` boleh dipakai. Jika nanti multi-process, pindahkan ke DB/Redis.

## Audit Trail

Saat manusia menyetujui draft AI, `AuditLog.meta` harus berisi minimal:

```json
{
  "ai": {
    "feature": "PAYMENT_REVIEW",
    "mode": "DEEPSEEK",
    "model": "deepseek-v4-flash",
    "snapshotHash": "sha256...",
    "promptHash": "sha256...",
    "suggestionId": "optional-client-generated-id",
    "confidence": 0.82,
    "usedByHuman": true,
    "humanDecision": "APPROVED",
    "usage": {
      "prompt_tokens": 1000,
      "completion_tokens": 400,
      "total_tokens": 1400
    }
  }
}
```

Jika manusia mengabaikan hasil AI, tidak wajib membuat AuditLog baru kecuali ada model `AiDraft` persisten.

## Fitur Fase G

### G0 - AI Safety Foundation

**Tujuan:** membuat fondasi AI hemat biaya, manual-only, dan terukur tanpa mengubah perilaku fitur lama.

**Role:** OWNER/ADMIN untuk status; konfigurasi hanya OWNER.

**Anchor kode:**

- `backend/src/modules/market-analysis/deepseek.client.ts`
- `backend/src/modules/market-analysis/market-analysis.service.ts`
- `backend/src/modules/market-analysis/market-analysis.controller.ts`
- `frontend/src/api/marketAnalysis.ts`
- `frontend/src/pages/marketing/MarketAnalysisPage.tsx`
- `backend/.env.production.example`

**Langkah detail:**

1. Update default model dari `deepseek-chat` ke `deepseek-v4-flash`.
2. Tambah env optional `DEEPSEEK_FINANCE_MODEL`.
3. Ubah client agar dapat mengembalikan `content`, `usage`, dan `model`.
4. Tambah opsi `json: true` yang mengirim `response_format`.
5. Pastikan `MarketAnalysisService` tetap bekerja walau client return type berubah.
6. Tambah helper `stableHash(value)` memakai `crypto.createHash('sha256')`.
7. Tambah response metadata `promptHash`, `snapshotHash`, dan `usage`.
8. Tambah status endpoint yang menampilkan `configured`, `defaultModel`, `financeModel`, `manualOnly: true`.
9. Update `.env.production.example` agar tidak lagi menyarankan `deepseek-chat`.
10. Tambah test unit untuk `stableHash` bila helper dibuat file terpisah.

**Gate:**

- `cd backend && npx tsc --noEmit`
- `cd frontend && npm run build`
- Manual smoke: `/market-analysis` masih bisa membuka status dan fallback offline.

### G1 - Owner Executive Brief

**Tujuan:** tombol Owner untuk ringkasan keputusan harian/mingguan.

**Route UI:** `OwnerDashboardPage`.

**Endpoint target:** `POST /owner-ai/brief`.

**Role:** OWNER only.

**Snapshot minimal:**

```json
{
  "period": "2026-06",
  "rooms": { "total": 48, "occupied": 16, "available": 4, "maintenance": 2 },
  "finance": { "overdueCount": 3, "overdueRupiah": 1200000, "cashInMonth": 0, "cashOutMonth": 0 },
  "ops": { "openTickets": 5, "slaBreached": 1, "meterMissing": 4, "stockLow": 2 },
  "readiness": { "score": 75, "ready": false, "topWarnings": [] }
}
```

**JSON output wajib:**

```json
{
  "summary": "string",
  "priorityActions": [
    { "title": "string", "reason": "string", "route": "/string", "severity": "LOW|MEDIUM|HIGH|CRITICAL" }
  ],
  "risks": [
    { "title": "string", "impact": "string", "mitigation": "string" }
  ],
  "numbersToWatch": [
    { "label": "string", "value": "string", "why": "string" }
  ],
  "missingData": []
}
```

**UI detail:**

- Tambah tombol "Buat Brief AI" di status strip Owner.
- Tampilkan hasil di panel bawah status cards.
- Tidak auto-refresh.
- Hasil tidak disimpan kecuali owner klik "Simpan sebagai catatan" (opsional, bisa pakai `MarketAnalysis` kind `OTHER` untuk fase awal).

**Gate:**

- OWNER bisa menekan tombol dan melihat hasil/fallback.
- ADMIN tidak melihat tombol di Owner dashboard.
- `usage` tampil kecil bila tersedia.

### G2 - Finance AI Analyst

**Tujuan:** analisa mendalam finance dari data sistem terkini, tanpa mengubah ledger.

**Route UI:** halaman akuntansi/finance yang sudah memuat trial balance, P&L, cashflow, ratio, readiness.

**Endpoint target:** `POST /owner-ai/finance/analyze`.

**Role:** OWNER only.

**Data sumber:**

- `GET /accounting/trial-balance`
- `GET /accounting/profit-loss`
- `GET /accounting/cashflow`
- `GET /accounting/financial-ratios`
- `GET /accounting/readiness`
- `GET /accounting/deposit-reconciliation`
- `GET /accounting/period-close/readiness`

**Snapshot minimal:**

```json
{
  "period": { "year": 2026, "month": 6 },
  "trialBalance": { "isBalanced": true, "totalDebit": 0, "totalCredit": 0 },
  "profitLoss": { "revenue": 0, "cogs": 0, "expense": 0, "netIncome": 0 },
  "cashflow": { "beginning": 0, "operatingNet": 0, "depositLiabilityNet": 0, "ending": 0 },
  "ratios": { "occupancyRatePercent": 0, "expenseRatio": 0, "currentRatio": 0 },
  "readiness": { "ready": false, "score": 75, "warnings": [] },
  "deposit": { "mismatchCount": 0, "positionRupiah": 0 }
}
```

**JSON output wajib:**

```json
{
  "executiveSummary": "string",
  "healthScore": 0,
  "findings": [
    {
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "area": "REVENUE|CASHFLOW|EXPENSE|DEPOSIT|READINESS|RATIO",
      "finding": "string",
      "evidence": "string",
      "recommendedAction": "string",
      "route": "/string"
    }
  ],
  "ownerQuestions": ["string"],
  "doNotTouch": ["string"],
  "missingData": []
}
```

**Larangan khusus finance:**

- AI tidak boleh menyarankan jurnal manual sebagai solusi pertama.
- AI wajib menyebut jika `trialBalance.isBalanced=false` bahwa laporan formal tidak boleh dipercaya.
- AI tidak boleh mengubah period close.
- AI tidak boleh membuat expense/invoice/payment.

**Gate:**

- `cd backend && npx tsc --noEmit`
- `cd frontend && npm run build`
- Finance gate: `cd backend && node --test "test/**/*.test.js"`
- UAT: AI output tidak muncul bila tombol belum ditekan.

### G3 - Payment Review Assistant

**Tujuan:** membantu Admin/Owner membaca pembayaran pending, tetapi approval tetap manual.

**Route UI:** `PaymentReviewPage`.

**Endpoint target:** `POST /owner-ai/payment-submissions/:id/review-draft`.

**Role:** OWNER/ADMIN.

**Snapshot minimal per submission:**

```json
{
  "submission": {
    "id": 1,
    "amountRupiah": 300000,
    "paidAt": "2026-06-19",
    "paymentMethod": "TRANSFER",
    "status": "PENDING_REVIEW"
  },
  "invoice": {
    "id": 10,
    "status": "ISSUED",
    "totalRupiah": 1000000,
    "paidRupiah": 0,
    "remainingRupiah": 1000000,
    "purposeLabel": "Uang Muka (DP)"
  },
  "stay": {
    "status": "ACTIVE",
    "roomCode": "K-A",
    "promoted": false,
    "downPaymentDueDate": "2026-06-20"
  },
  "deterministicRules": {
    "allowedAmounts": [300000, 1000000],
    "noPartial": true,
    "overpayBlocked": true
  }
}
```

**JSON output wajib:**

```json
{
  "recommendation": "APPROVE|REJECT|ASK_MORE_INFO",
  "confidence": 0.0,
  "reason": "string",
  "riskFlags": ["string"],
  "reviewNoteDraft": "string",
  "requiredHumanChecks": ["Cek nama pengirim di bukti transfer", "Cek mutasi bank"]
}
```

**Wajib:**

- Deterministic no-partial check dilakukan sebelum memanggil AI. Jika nominal tidak sah, AI boleh dilewati dan fallback memberi rekomendasi `REJECT`.
- Jika AI merekomendasikan APPROVE tapi deterministic guard backend menolak, backend tetap menang.
- Approve/reject tetap memakai endpoint existing `payment-submissions`.
- AuditLog saat approve/reject mencatat `meta.ai` jika admin memakai note/rekomendasi AI.

**Gate:**

- Test: nominal parsial tetap tidak bisa approve walau AI rekomendasikan approve.
- UAT: tombol "Bantu Review AI" tidak jalan otomatis di list.

### G4 - Expense Receipt OCR Draft

**Tujuan:** Admin/Owner upload atau scan nota biaya, OCR lokal membaca teks, DeepSeek menormalkan menjadi draft expense. Manusia menyetujui sebelum `Expense` dibuat.

**Route UI:** halaman expenses atau finance.

**Endpoint target:**

- `POST /owner-ai/expenses/receipt-draft` untuk teks OCR.
- Approval final tetap `POST /expenses` existing.

**Role:** OWNER/ADMIN.

**Alur:**

1. Admin pilih foto nota di browser.
2. Frontend menjalankan OCR lokal `tesseract.js` atau mekanisme OCR yang sudah ada.
3. Frontend mengirim teks OCR, bukan gambar, ke endpoint AI.
4. AI mengembalikan draft expense.
5. UI menampilkan form prefilled.
6. Admin koreksi dan klik "Setujui dan Simpan".
7. `POST /expenses` berjalan.
8. AuditLog Expense mencatat `meta.ai`.

**JSON output wajib:**

```json
{
  "expenseDate": "YYYY-MM-DD|null",
  "vendorName": "string|null",
  "amountRupiah": 0,
  "category": "MAINTENANCE|UTILITIES|SUPPLIES|MARKETING|OTHER",
  "type": "OPERATING|CAPITAL|OTHER",
  "description": "string",
  "note": "string",
  "confidence": 0.0,
  "needsReview": ["string"]
}
```

**Guard:**

- Jika amount tidak terbaca, jangan buat angka palsu; set `amountRupiah: 0` dan `needsReview`.
- Jika kategori tidak yakin, pakai `OTHER`.
- Jika amount > Rp100.000 dan item tampak barang tahan lama, tampilkan peringatan kapitalisasi aset (aturan owner 2026-07-08: aset tetap = barang tahan lama ≥ Rp100rb; barang ganti rutin = beban).
- AI tidak boleh posting jurnal; jurnal expense mengikuti service existing.

### G5 - KTP OCR Validator

**Tujuan:** mempercepat verifikasi KTP tanpa mengirim foto identitas ke DeepSeek.

**Role:** OWNER/ADMIN.

**Endpoint target:** `POST /owner-ai/tenants/:id/ktp-ocr-validate`.

**Input:** teks OCR lokal + field tenant yang sudah ada.

```json
{
  "ocrText": "string",
  "tenant": {
    "id": 1,
    "fullName": "string",
    "identityNumber": "optional-last4-or-full-if-needed"
  }
}
```

**JSON output wajib:**

```json
{
  "extracted": {
    "nik": "string|null",
    "name": "string|null",
    "birthPlace": "string|null",
    "birthDate": "YYYY-MM-DD|null"
  },
  "match": {
    "nameMatchesTenant": true,
    "nikMatchesTenant": true,
    "warnings": ["string"]
  },
  "confidence": 0.0,
  "recommendation": "VERIFY|REVIEW_MANUALLY|REJECT"
}
```

**Larangan PDP:**

- Jangan kirim foto KTP ke DeepSeek.
- Jangan simpan alamat lengkap hasil OCR tanpa keputusan owner dan schema khusus.
- Jangan auto-call `verifyKtp`.
- Owner tetap klik tombol `Verifikasi KTP`.

### G6 - Maintenance & Inventory Assistant

**Tujuan:** Admin/Owner mendapat saran dari tiket, laporan staf, inventory, dan room-items.

**Route UI:** tiket, inventory shell, staff field reports.

**Endpoint target:**

- `POST /owner-ai/tickets/:id/action-draft`
- `POST /owner-ai/inventory/reorder-draft`
- `POST /owner-ai/staff-field-reports/:id/review-draft`

**Role:** OWNER/ADMIN.

**Output ticket action draft:**

```json
{
  "summary": "string",
  "recommendedAction": "ASSIGN_STAFF|CREATE_EXPENSE_DRAFT|REQUEST_PHOTO|CLOSE|KEEP_OPEN",
  "priority": "LOW|MEDIUM|HIGH",
  "suggestedNote": "string",
  "riskFlags": ["string"]
}
```

**Output inventory draft:**

```json
{
  "lowStockItems": [
    { "inventoryItemId": 1, "name": "string", "currentQty": 0, "suggestedMinQty": 0, "reason": "string" }
  ],
  "purchaseSuggestions": [
    { "name": "string", "qty": 0, "estimatedBudgetRupiah": 0, "priority": "LOW|MEDIUM|HIGH" }
  ],
  "warnings": []
}
```

**Approval:**

- Untuk tiket: admin memilih aksi di UI, lalu endpoint tiket existing dipanggil.
- Untuk inventory: admin membuat movement/purchase/expense secara eksplisit.
- Untuk field report: admin review tetap lewat `admin-review`.

### G7 - AI Settings, Budget, and Observability

**Tujuan:** Owner tahu biaya dan dapat mematikan fitur AI.

**Fase awal tanpa schema:**

- Semua toggle via env.
- Status ditampilkan read-only di Owner Settings.
- Limit request memakai in-memory bucket per actor seperti `MarketAnalysisService`.

**Env target:**

```env
AI_FEATURES_ENABLED=false
AI_MANUAL_ONLY=true
AI_OWNER_ADMIN_ONLY=true
AI_LOG_USAGE=true
AI_DAILY_REQUEST_LIMIT=50
AI_MAX_INPUT_CHARS=12000
AI_MAX_OUTPUT_TOKENS=1400
```

**UI target:**

- Owner Settings tab "AI & Biaya".
- Tampilkan configured/not configured, model default, finance model, manual-only, daily limit, dan total usage runtime bila ada.
- Tombol test connection hanya OWNER.

**Catatan:** Jika owner ingin toggle editable dari UI dan history usage lintas restart, lanjut G9 schema.

### G8 - AI FAQ/Manual Generator

**Tujuan:** menutup gap audit lama: FAQ/Manual tenant masih manual, belum digenerate dari aturan flow.

**Role:** OWNER only.

**Route UI:** FAQ admin/settings.

**Endpoint target:** `POST /owner-ai/faqs/generate-draft`.

**Data sumber:** ringkasan dari M02/M03/M04/M05/M06/M07 yang dikurasi manual dalam prompt tetap. Jangan membaca file markdown runtime dari server produksi; simpan rule summary di kode prompt.

**Output:**

```json
{
  "items": [
    {
      "category": "Pembayaran",
      "question": "string",
      "answer": "string",
      "sortOrder": 1,
      "sourceRule": "D-02"
    }
  ],
  "warnings": []
}
```

**Approval:** Owner memilih item lalu klik "Simpan FAQ terpilih". Jangan auto overwrite FAQ existing.

### G9 - Optional Schema: Persistent AI Draft Queue [SCHEMA]

**Gunakan hanya bila owner ingin antrian draft tersimpan lintas refresh.** Fase G bisa berjalan tanpa G9.

**Model usulan additive:**

```prisma
enum AiDraftStatus {
  DRAFT
  APPROVED
  REJECTED
  EXPIRED
}

model AiDraft {
  id            Int           @id @default(autoincrement())
  feature       String
  targetType    String?
  targetId      String?
  status        AiDraftStatus @default(DRAFT)
  snapshotHash  String
  promptHash    String
  model         String?
  mode          String
  resultJson    Json
  usageJson     Json?
  createdById   Int?
  reviewedById  Int?
  reviewedAt    DateTime?
  reviewNote    String?
  expiresAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([feature, status])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

**Gate:** butuh approval owner eksplisit untuk schema S-6. Jangan implement G9 diam-diam.

### G10 - Agenda Keputusan (Decision Agenda) — **keputusan arah sudah turun; implementasi belum**

Ditambahkan 25 Sep 2026 mengikuti arah owner (lihat [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri "2026-09-25 — Arah lapisan keputusan AI" dan rancangan di [product/portal-owner-admin.md](../product/product.md#d4d-portal) §10). **Belum diimplementasikan.**

**Tujuan:** OWNER/ADMIN membuka aplikasi dan langsung melihat **3–5 kartu keputusan** yang sudah siap (kondisi, sebab, rekomendasi, dampak, satu tautan tindakan). Data lengkap tetap ada sebagai lapis `Data`, tidak lagi dipromosikan. AI menyusun; manusia memutuskan.

**Kabar baik dari recon 25 Sep 2026:** sebagian besar bahannya sudah ada dan tidak perlu endpoint baru.

| Kebutuhan | Sudah tersedia di |
|---|---|
| Endpoint brief dengan `priorityActions[]` berisi `title`, `reason`, `route`, `severity` | `POST /owner-ai/brief` + prompt di `backend/src/modules/owner-ai/prompts/brief.prompt.ts` |
| Bentuk kartu + renderer + eksekutor tautan | `ActionQueueItem` + `frontend/src/components/command-center/ActionQueueTable.tsx` (`openActionTarget`) |
| Dedupe kartu AI vs kartu rule | `frontend/src/utils/commandCenterDedup.ts` (`ruleId`/`dedupKey`) |
| Papan alur ADMIN bernomor 0–5 | tipe `AdminWorkLane` di `frontend/src/pages/dashboard/dashboardShared.tsx` |
| Skor kesehatan + sinyal keputusan OWNER | `useBusinessHealthScore`, `useOperationalStressIndex`, `extraSignals`/`ownerSignalRoute` |
| Rumah simpanan hasil (G9) | `AiDraft` (`owner-ai/ai-draft.service.ts`, `ai-draft.controller.ts`) |
| Fallback rule-based tiap fitur | `briefFallback`, `financeFallback`, `paymentFallback`, dll. |
| Anti-halusinasi angka | snapshot builder → `stableHash` → prompt JSON → normalisasi allowlist → fallback |

**Bentuk kartu:** `ActionQueueItem` + 5 field (`sebab`, `dampak`, `sourceRefs[]`, `expiresAt`, `fallback`). Kontrak rinci: [product/portal-owner-admin.md](../product/product.md#d4d-portal) §10.2.

**Aturan yang wajib dijaga (tidak boleh dilanggar implementasi):**

1. **Rute dari AI tidak boleh langsung dieksekusi.** `route` adalah string bebas dari LLM; wajib dipetakan lewat allowlist deterministik (pola `ownerSignalRoute`) sebelum `navigate`. Lihat temuan A-1 di [audit recon AI 25 Sep](../arsip/ai-agenda-recon-2026-09-25.md).
2. **AI tidak menulis data.** Pola aman §Pola Aman tetap berlaku; kartu berakhir di tautan, wizard, atau approve manusia.
3. **Angka hanya dari snapshot.** AI tidak boleh membuat angka yang tidak ada di snapshot (`missingData` bila kurang).
4. **Fallback wajib terlihat.** Kartu hasil rule-based ditandai `fallback: true`; halaman tidak boleh menampilkan galat saat AI mati/kuota habis.
5. **Hemat token.** Agenda dihitung per (role, periode) dan disimpan; bukan per pembukaan halaman.

**Benturan aturan — SELESAI, diputuskan owner 25 Sep 2026 (`CEPAT-AI-JADWAL`):**

- §Pola Terlarang di file ini dan item 1 UAT Fase G ("Tombol AI tidak otomatis terpanggil saat halaman dibuka") **tetap berlaku apa adanya**: tidak ada pemanggilan AI pada peristiwa membuka halaman.
- Keputusan owner: agenda dihitung **terjadwal 1× sehari** lalu **disimpan** ke antrean draft; halaman hanya membaca. Tombol "Perbarui agenda" tetap tersedia di luar jadwal. Karena tidak ada pemanggilan AI saat halaman dibuka, kedua aturan di atas tetap terpenuhi.
- Batas yang ikut diputuskan: AI **hanya untuk OWNER** (ADMIN/STAFF/TENANT deterministik); biaya hanya ditampilkan ke OWNER dengan target **≤ Rp 50.000/bulan**; AI mati atau kuota habis → halaman tetap tampil penuh dengan kartu aturan. Rincian: [product/mode-cepat.md](../arsip/mode-cepat.md) §5–§6.
- **Ketergantungan yang belum terbukti:** pemicu terjadwal yang benar-benar berjalan di produksi. Cron AutoOps masih terbuka di [ANTREAN](../ANTREAN.md) §3 dan keberadaan penjadwal internal **UNKNOWN**; verifikasi sebelum `AIDL-04`.

**Gate:**

- Tidak ada `navigate` ke rute yang tidak lolos allowlist.
- Dengan `DEEPSEEK_API_KEY` kosong, provider gagal, atau kuota habis: kartu tetap tampil (fallback) tanpa galat.
- Dua klik berturut tidak memanggil API dua kali (dedup in-flight sudah ada).
- Tidak ada mutasi data dari jalur AI; semua aksi tetap lewat endpoint domain.

## UAT Global Fase G

Semua task G wajib membuktikan:

1. Tombol AI tidak otomatis terpanggil saat halaman dibuka.
2. Tenant dan Staff tidak melihat tombol AI.
3. Admin tidak melihat fitur Owner-only.
4. Tanpa `DEEPSEEK_API_KEY`, UI tetap jalan dengan fallback.
5. Dengan API gagal/timeout, tidak ada mutasi data.
6. Semua mutasi final tetap melalui endpoint domain existing.
7. Semua approval yang memakai AI tercatat di `AuditLog.meta.ai`.
8. Tidak ada foto KTP/bukti bayar mentah dikirim ke DeepSeek.
9. Finance gate tetap hijau untuk task uang.
10. `promptHash`, `snapshotHash`, `model`, dan `usage` muncul di response AI bila tersedia.

## Checklist Eksekutor Lemah

Untuk setiap task G:

1. Baca `CLAUDE.md`.
2. Baca bagian Fase G di berkas ini ([domain/ai.md](ai.md)) saja.
3. Baca file ini bagian global + task yang dikerjakan.
4. Baca domain terkait: M04 untuk uang, M05 untuk booking/KTP/payment, M06 untuk ops/inventory, M07 untuk marketing/FAQ, M08 untuk env, M09 untuk audit.
5. `git status --short`; jangan sentuh file yang sedang dimodifikasi orang lain.
6. Grep anchor kode yang disebut task.
7. Implementasi satu task saja.
8. Jalankan gate.
9. Update M10 status task.
10. Tambah satu baris M11 changelog.

---

## Audit 360° P6 AI Flow (Jul 2026)

**Status:** 🟢 Solid — semua pilar arsitektur AI manual-only terverifikasi. Detail → `docs/arsip/legacy/_previous_cycles/M17_AUDIT_360_P3_P8.md`

✅ **Manual-only** — tidak ada cron/page-load/auto-ops · ✅ **OWNER/ADMIN only** (`@Roles`) · ✅ **Circuit breaker**: 5 gagal → open 30 detik · ✅ **Fallback offline** (MarketAnalysis.chat → `RULE_FALLBACK`) · ✅ **AI configurable** (model, base URL, daily limit dari Owner Settings) · ✅ **Budget guard** (env AI_DAILY_REQUEST_LIMIT, AI_MAX_INPUT_CHARS, AI_MAX_OUTPUT_TOKENS) · ✅ **Snapshot aggregated** (top 10-20, hemat token + PDP) · ✅ **Audit trail** (`AuditLog.meta.ai`: feature, model, promptHash, confidence, humanDecision) · ✅ **No direct mutation** (tidak approve payment, create expense, close ticket, posting journal) · ✅ **KTP OCR lokal** (Tesseract.js offline, teks saja ke DeepSeek)


<a id="d4c-iot"></a>
## Bagian C — IoT: spesifikasi, inventaris, arsitektur

Tanggal: 2026-09-23
Status: aktif (pengembangan ditunda — IOT-LATER)
Tujuan: spesifikasi IoT KOST48 — inventaris perangkat Tuya, arsitektur integrasi, kontrak ingest device, aturan alert, batas telemetry/billing, dan rencana implementasi yang ditunda
Rujukan: [operasional.md](hunian.md#d4c-operasional) · [keuangan.md](keuangan.md) · [harga.md](keuangan.md#d4c-harga) · [IoT](ai.md#d4c-iot) · [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)

> Migrasi dari docs/M15_IOT.md (B8 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; Part A dan Part B dipindah apa adanya, ditambah § Bagian 6 IoT dari `domain/operasional.md` — teks tidak diubah.
> Rencana implementasi (Part B) berstatus **ditunda** sesuai IOT-LATER (keputusan owner 22 Sep, [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)); pemindahan dokumen ini bukan izin implementasi.
> Riwayat bertanggal dipisah ke [history/changelog/2026-07.md](../arsip/changelog-2026-07.md); prosedur ke [operations/iot.md Bagian A](../operations/iot.md#d4b-iot-tuya) dan [operations/iot.md Bagian B](../operations/iot.md#d4b-iot-water); handoff ke [operations/iot.md Bagian A](../operations/iot.md#d4b-iot-tuya).

### Part A — Inventaris Perangkat Tuya


> **Sumber:** Tuya IoT Console — ekspor 2026-07-10  
> **Total perangkat:** 27 (17 Online, 10 Offline)  
> **Terkait:** memory `iot-water-kwh-spec` (ESP32 water flow) · `domain/operasional.md` · `M10_PETA_SCOPE.md`

> **Update implementasi 2026-07-23:** fondasi IoT sudah dibuat dan masuk paket deploy. Telemetry tetap monitoring-only; tidak pernah otomatis menerbitkan tagihan. Status perangkat fisik pada tabel di bawah tetap snapshot Tuya 2026-07-10 dan wajib diverifikasi lagi saat go-live.

---

##### A. Ringkasan

| Kategori | Jumlah | Online | Offline | Produk Tuya |
|---|---|---|---|---|
| **KWH Meter per kamar** | 14* | 11 | 3 | WIFI 智能计量开关 / 保护款 |
| **CCTV BARDI IP Camera** | 5 | 3 | 2 | BARDI IP Camera Static Outdoor |
| **AC / 空调** | 3 | 0 | 3 | 空调 |
| **Smart IR Remote** | 2 | 0 | 2 | 万能遥控器WIFI+BLE / 佼茂T1 |
| **Smart Plug** | 1 | 0 | 1 | Smart plug |
| **Human Presence Sensor** | 1 | 0 | 1 | 000HPS01_5.8G |
| **Smart Lock** | 1 | 1 | 0 | SmartLock |

> \* 13 kamar unik — "KWH Kamar D" (offline) adalah unit lama yang digantikan "KWH Kmr D" (online).

---

##### B. KWH Meter — Per Kamar

**Produk:** WIFI 智能计量开关 (Smart Metering Switch WiFi)  
**Integrasi:** Tuya Cloud API → backend polling cron tiap 10 menit (lihat `iot-water-kwh-spec`)  
**Fungsi:** pantau pembacaan kWh terbaru per kamar; billing listrik bulanan tetap memakai `MeterReading` terverifikasi

| # | Device Name | Device ID | Status | Activated | Kamar |
|---|---|---|---|---|---|
| 1 | KWH Kmr A | `ebb45dcb6878c96529vjfe` | ✅ Online | 2025-12-27 | A |
| 2 | KWH Kmr B | `eb978d316fb9be79a1ed9k` | ✅ Online | 2025-12-27 | B |
| 3 | KWH Kmr C | `ebd46b4d391f079e2b4akm` | ✅ Online | 2025-12-20 | C |
| 4 | KWH Kmr D | `ebcafb5450a35bdaeciyii` | ✅ Online | 2025-12-20 | D |
| 5 | KWH Kmr G | `ebe076481e1e344ce95dkb` | ✅ Online | 2025-12-09 | G |
| 6 | KWH Kmr H | `eb693507851acf697fnmhj` | ✅ Online | 2025-12-09 | H |
| 7 | KWH Kmr i | `ebf39e59e1bb788173rzal` | ✅ Online | 2025-12-09 | I |
| 8 | KWH Kmr J | `eb8bc29c48b31bc433achz` | ✅ Online | 2025-12-09 | J |
| 9 | KWH Kmr K | `eb62ad9276b9da9c93hf8c` | ✅ Online | 2025-12-09 | K |
| 10 | KWH Kamar L | `eb2b7769c20fab47c2v8um` | ✅ Online | 2025-12-09 | L |
| 11 | Kamar M | `eb54cf1ee1dba020d6kfuy` | ✅ Online | 2025-12-09 | M |
| 12 | KWH Kmr F1 | `ebd9f624a02848fc8c8ift` | ⚠️ Offline | 2025-11-28 | F1 |
| 13 | KWH Kmr F2 | `eb7087736aa53084b8uxmd` | ⚠️ Offline | 2026-06-20 | F2 |
| ~ | ~~KWH Kamar D~~ | `ebac057249dcb85a58l0qc` | ❌ Offline | 2025-06-30 | D (lama) |

###### Catatan KWH

- **11 kamar online** (A, B, C, D, G, H, I, J, K, L, M) — siap di-polling via Tuya API
- **F1 & F2 offline** — perlu dicek fisik (mungkin mati daya / rusak), kedua device di lantai F
- **KWH Kamar D** adalah unit lama (2025-06-30) — sudah diganti `KWH Kmr D` (2025-12-20), abaikan saat integrasi
- **Naming inconsistency:** `KWH Kmr K` vs `KWH Kamar L` vs `Kamar M` — bersihkan saat mapping ke database (gunakan Room.code: A/B/C/D/.../M)

---

##### C. CCTV — BARDI IP Camera

**Produk:** BARDI IP Camera Static Outdoor  
**Fungsi:** keamanan 24/7, bisa diintegrasikan ke dashboard owner nanti (live view / snapshot)

| # | Device Name | Device ID | Status | Activated | Posisi |
|---|---|---|---|---|---|
| 1 | CCTV depan Jalan | `eb54211162106e4c5fvkoc` | ✅ Online | 2026-01-13 | Depan jalan (pintu gerbang) |
| 2 | CCTV Depan Hadap Rumah | `eb277da893cc2ddc6eoytp` | ✅ Online | 2026-01-13 | Depan hadap rumah |
| 3 | CCTV Dpn Kamar E | `eb7aa5dc361c36ac6dgfvw` | ✅ Online | 2025-06-30 | Depan kamar E |
| 4 | Kamera Belakang Kmr Mandi | `eb2617383fbef1393d6b7s` | ✅ Online | 2025-12-04 | Belakang kamar mandi |
| 5 | CCTV Belakang Lorong | `eb53d03570c2fe2669aj8i` | ⚠️ Offline | 2025-06-30 | Belakang lorong |

###### Catatan CCTV

- 4 dari 5 kamera online — cakupan depan (jalan, rumah), samping (kamar E), belakang (kamar mandi)
- CCTV Belakang Lorong offline sejak 2025-06-30 — perlu dicek
- **Belum prioritas integrasi** — simpan sebagai referensi untuk fase lanjutan

---

##### D. Perangkat Lain

###### AC / 空调 (3 device — semua offline)

| Device Name | Device ID | Activated | Catatan |
|---|---|---|---|
| Air | `ebaaf37c4b32a834e869cx` | 2025-12-27 | Mungkin AC kamar, offline |
| Air Conditioning 4 | `eb9eda6e21d7229255gnx7` | 2025-12-27 | Mungkin AC kamar, offline |
| Daikin Rumah Sememi | `ebd3001bee98f90304omea` | 2025-12-20 | AC rumah owner, offline |

> Semua AC offline — tidak perlu diintegrasikan. AC kos dikelola manual / via Smart IR.

###### Smart IR Remote (2 device — semua offline)

| Device Name | Device ID | Activated |
|---|---|---|
| Smart IR (万能遥控器WIFI+BLE) | `eb9bbd2f2f913c35a5bswp` | 2025-12-27 |
| Smart IR (佼茂T1 万能遥控器) | `eb32ffe1015cab80dbsohb` | 2025-12-20 |

> Keduanya offline — rencana awal untuk kontrol AC via IR, tapi belum jalan.

###### Lain-lain

| Device Name | Device ID | Produk | Status | Activated |
|---|---|---|---|---|
| Smart plug | `ebea186c0c10b05b840lby` | Smart plug | Offline | 2025-12-07 |
| Human Presence Sensor | `ebbe9e52b394d97029yyja` | 000HPS01_5.8G | Offline | 2025-11-28 |
| Smart_Lock | `57514000d8bfc056e66a` | SmartLock | ✅ Online | 2022-02-26 |

> **Smart Lock** online sejak 2022 — potensi integrasi akses pintu otomatis (fase lanjutan).

---

##### E. Rencana Integrasi — Prioritas

###### Fase 1: KWH Meter (PRIORITAS UTAMA)
- **Target:** 11 KWH meter online (A–M, kecuali F1/F2)
- **Metode:** Tuya Cloud API → polling cron tiap 10 menit → simpan ke `IotTelemetry`; `MeterReading` tetap snapshot billing terpisah.
- **Backend:** `backend/src/modules/iot/` sudah ada: `TuyaClientService`, `IotPollingService`, `IotService`, controller OWNER/ADMIN, dan polling tenant terikat.
- **Endpoint ops:** `POST /api/iot/tuya/cron` dengan `X-Iot-Cron-Token`; endpoint manual `POST /api/iot/tuya/sync-all` untuk OWNER/ADMIN.
- **Mapping room:** Device ID → Room.code via table di atas

###### Fase 2: Water Flow (ESP32-C3 + D20)
- **Target:** 2-3 unit ESP32-C3 dengan sensor D20 per kamar
- **Metode:** ESP32 → signed HTTP POST `/api/iot/v1/readings` (HMAC per device, bukan JWT pengguna)
- **Backend:** modul yang sama (`backend/src/modules/iot/`), `WaterIngestController` + `WaterIngestService` + registry/rotasi secret perangkat
- **Tidak terkait Tuya** — water flow via ESP32 terpisah

###### Fase 3 (nanti): CCTV + Smart Lock
- CCTV: embed snapshot di dashboard owner (Tuya API screenshot)
- Smart Lock: remote unlock / access log (Tuya API)

###### Tidak diintegrasikan
- AC (semua offline) — tidak bisa di-polling
- Smart IR (offline) — tidak berfungsi
- Smart Plug, Human Presence Sensor (offline) — tidak berfungsi

---

##### F. Credentials & Konfigurasi

**Tuya IoT Cloud** — credential disimpan di `backend/.env` (gitignored):

| Env Var | Keterangan |
|---|---|
| `TUYA_ACCESS_KEY` | Access ID / Client ID dari Tuya IoT Console |
| `TUYA_SECRET_KEY` | Access Secret / Client Secret |
| `TUYA_API_BASE` | `https://openapi.tuyaus.com` (US West, default) |

> ✅ Credentials sudah di-set di `backend/.env`. Template ada di `backend/.env.production.example`.

**Implementasi backend tersedia:**
- Prisma: `IotDevice`, `IotIngestMessage`, `IotTelemetry` serta enum provider/quality.
- Tuya: `TuyaClientService` (HMAC-SHA256, token cache, normalisasi) dan `IotPollingService`.
- API: `IotController` untuk overview/device/sync/probe/backfill dan `WaterIngestController` untuk ESP32 signed ingest. Portal tenant mengambil pembaruan secara berkala.
- Cron Tuya memakai `POST /api/iot/tuya/cron` + `X-Iot-Cron-Token`; aktifkan hanya setelah credential dan mapping device diverifikasi.

---

##### G. Cross-Reference

| Topik | Dokumen |
|---|---|
| Spek implementasi IoT | memory `iot-water-kwh-spec` |
| Peta scope role | `M10_PETA_SCOPE.md` § IoT & Monitoring |
| Operasional | `domain/operasional.md` § IoT Monitoring |
| Auto-ops / cron | `domain/operasional.md` § P5 Auto-Ops (audit/audit-operasional-2026-07.md) |
| Default data seed | `operations/default-dev.md` |
| Keamanan JWT device | memory `iot-water-kwh-spec` (beda dari user JWT) |

---

*Dibuat 2026-07-10 dari data Tuya IoT Console.*

---

### Part B — Rencana Implementasi


> Status: **Fondasi backend/firmware sudah diimplementasikan; rollout perangkat, mapping, dan UAT produksi masih diperlukan.**
> Tanggal: 2026-07-16
> Dokumen terkait: `M14_IOT_TUYA_DEVICES.md`, `domain/keuangan.md`, `domain/hunian.md`, `domain/operasional.md`
> Runbook Tuya: `M15A_TUYA_KWH_SETUP_RUNBOOK.md`
> Spesifikasi meter air: `M15B_ESP32_C3_WATER_METER_SPEC.md`

##### 1. Hasil yang ingin dicapai

KOST48 memiliki satu pipeline IoT yang aman untuk:

1. membaca total energi kWh dan status kesehatan smart meter Tuya per kamar;
2. menerima pulse dan volume air dari ESP32-C3 + flow sensor D20;
3. menampilkan konsumsi dan kondisi perangkat kepada owner/admin;
4. mendeteksi perangkat offline, konsumsi tidak wajar, dan dugaan kebocoran;
5. menyiapkan angka kandidat billing tanpa merusak alur `MeterReading` dan invoice yang sudah aktif.

Target awal bukan kontrol jarak jauh. Integrasi Tuya fase pertama bersifat **read-only** dan perangkat air hanya mengirim telemetri. Relay listrik atau katup air tidak boleh dimatikan otomatis oleh sistem pada fase ini.

##### 2. Ground state aplikasi saat ini

| Area | Kondisi saat ini | Implikasi |
|---|---|---|
| Billing meter | Model `MeterReading` sudah aktif untuk `ELECTRICITY` dan `WATER` | Jangan simpan polling 10-menit langsung ke tabel ini |
| Penerbitan invoice | `POST /api/meter-readings/cycle` menghitung selisih, kuota gratis, tarif, lalu menerbitkan invoice | Angka IoT harus melalui tahap kandidat dan konfirmasi dahulu |
| Tarif | `OperationalSetting` memiliki tarif, kuota gratis, dan toggle water metering | Water billing tetap OFF selama pilot |
| Tuya | Inventaris device ID tersedia di `M14_IOT_TUYA_DEVICES.md`; konfigurasi lokal saat ini memakai endpoint US | Region harus dibuktikan dengan live connectivity test, bukan ditebak dari negara |
| Backend IoT | `backend/src/modules/iot/` sudah ada | Registry device, telemetry generik, Tuya polling, signed water ingest, dan pembaruan tenant terikat; rollout env/mapping tetap perlu |
| ESP32 | Firmware dan protokol device tersedia | Gunakan `firmware/esp32-c3-water-meter/` + kontrak di `M15B` sebagai sumber kebenaran |

##### 3. Keputusan arsitektur

###### 3.1 Pisahkan telemetri dari billing

`MeterReading` adalah snapshot bisnis yang dapat memicu tagihan. Telemetri adalah data mesin yang datang sering, bisa duplikat, terlambat, atau salah. Keduanya tidak boleh dicampur.

```mermaid
flowchart LR
  TUYA[Tuya KWH meter] --> TC[Tuya Cloud]
  TC --> POLL[Backend Tuya poller]
  ESP[ESP32-C3 + D20] --> INGEST[Device ingest API]
  POLL --> RAW[(IoT telemetry)]
  INGEST --> RAW
  RAW --> ROLLUP[Hourly/daily rollup]
  RAW --> ALERT[Anomaly and leak rules]
  ROLLUP --> CANDIDATE[Billing candidate]
  CANDIDATE --> REVIEW[Owner/Admin review]
  REVIEW --> METER[(MeterReading)]
  METER --> CYCLE[Existing meter cycle service]
  CYCLE --> INVOICE[(Invoice)]
```

Aturan mutlak:

- polling atau upload device **tidak boleh langsung menerbitkan invoice**;
- payload device tidak boleh menentukan `roomId`; mapping device-ke-kamar dilakukan backend;
- promosi kandidat ke `MeterReading` memakai service domain yang menjaga urutan dan audit trail;
- data dengan kualitas buruk tetap boleh disimpan sebagai telemetri, tetapi tidak layak menjadi kandidat billing.

###### 3.2 Satu model telemetri untuk dua sumber

Gunakan model generik agar Tuya dan ESP32 memiliki pipeline observability yang sama.

Model Prisma yang disarankan:

```prisma
enum IotProvider {
  TUYA
  KOST48_ESP32
}

enum IotDeviceType {
  ELECTRICITY_METER
  WATER_FLOW_METER
}

enum IotReadingQuality {
  GOOD
  SUSPECT
  REJECTED
}

model IotDevice {
  id                     Int       @id @default(autoincrement())
  deviceCode             String    @unique
  provider               IotProvider
  deviceType             IotDeviceType
  roomId                 Int?
  externalDeviceId       String?
  productId              String?
  enabled                Boolean   @default(true)
  lastSeenAt             DateTime?
  lastSuccessfulSyncAt   DateTime?
  firmwareVersion        String?
  configVersion          Int       @default(1)
  metadata               Json?
  credentialCiphertext   String?
  credentialVersion      Int       @default(1)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  room                   Room?     @relation(fields: [roomId], references: [id], onDelete: SetNull)
  ingestMessages         IotIngestMessage[]

  @@unique([provider, externalDeviceId])
  @@index([roomId, deviceType])
}

model IotIngestMessage {
  id                 BigInt       @id @default(autoincrement())
  deviceId           Int
  messageId          String
  observedAt         DateTime
  receivedAt         DateTime     @default(now())
  sequence           BigInt?
  rawPayload         Json?
  diagnostics        Json?

  device             IotDevice    @relation(fields: [deviceId], references: [id], onDelete: Restrict)
  telemetry          IotTelemetry[]

  @@unique([deviceId, messageId])
  @@index([deviceId, observedAt])
}

model IotTelemetry {
  id                 BigInt            @id @default(autoincrement())
  ingestMessageId    BigInt
  metric             String
  valueDecimal       Decimal?          @db.Decimal(18, 6)
  valueText          String?
  unit               String
  observedAt         DateTime
  quality            IotReadingQuality @default(GOOD)
  qualityReason      String?

  ingestMessage      IotIngestMessage   @relation(fields: [ingestMessageId], references: [id], onDelete: Restrict)

  @@unique([ingestMessageId, metric])
  @@index([metric, observedAt])
}
```

Model lanjutan setelah pilot:

- `IotDailyRollup`: min/max/avg/delta per metric per hari;
- `IotAlert`: lifecycle alert `OPEN`, `ACKNOWLEDGED`, `RESOLVED`;
- `IotBillingCandidate`: angka meter yang diusulkan untuk suatu stay dan siklus;
- `IotDeviceCommand`: hanya jika suatu hari kontrol relay/valve benar-benar disetujui.

`IotIngestMessage` menyimpan envelope/raw payload satu kali, sedangkan `IotTelemetry` menyimpan metric terindeks. Jangan membuat `KwhReading` dan `FlowReading` yang menduplikasi struktur sama. Perbedaan domain diwakili oleh `deviceType` dan `metric`. Raw payload Tuya harus disanitasi dari token, `local_key`, lokasi, dan field sensitif sebelum disimpan.

###### 3.3 Nama metric kanonik

| Metric | Unit tersimpan | Sumber | Catatan |
|---|---|---|---|
| `electricity.energy_total_kwh` | `kWh` | Tuya | Angka kumulatif utama kandidat billing |
| `electricity.power_w` | `W` | Tuya | Telemetri, bukan billing |
| `electricity.voltage_v` | `V` | Tuya | Diagnostik |
| `electricity.current_a` | `A` | Tuya | Diagnostik |
| `water.pulse_total` | `pulse` | ESP32 | Kumulatif, tidak boleh reset diam-diam |
| `water.volume_total_l` | `L` | ESP32 | Kumulatif hasil kalibrasi |
| `water.flow_rate_lpm` | `L/min` | ESP32 | Deteksi kebocoran/aliran kontinu |
| `device.rssi_dbm` | `dBm` | keduanya bila tersedia | Kesehatan koneksi |

Nilai finansial tetap memakai `Decimal`, bukan floating point JavaScript.

##### 4. Jalur integrasi Tuya KWH

###### 4.1 Pola akses

1. Backend meminta access token Tuya dan menyimpannya di memory cache sampai mendekati expiry.
2. Poller membaca detail/status hanya untuk device aktif yang sudah dimapping.
3. Adapter per `productId` memetakan Tuya Data Point (DP) ke metric kanonik.
4. Nilai mentah, skala, unit, dan nilai normalisasi disimpan agar hasil dapat diaudit.
5. Gagal pada satu device tidak membatalkan polling device lain.

Endpoint dasar yang perlu diuji:

- `GET /v1.0/token?grant_type=1`
- `GET /v1.0/devices/{device_id}`
- `GET /v1.0/devices/{device_id}/status`

Kode DP seperti `add_ele`, `cur_power`, `cur_voltage`, atau `cur_current` hanya **kandidat umum**. Mapping final harus berasal dari respons aktual dan metadata product masing-masing; jangan hard-code sebelum discovery.

###### 4.2 Region Tuya

Konfigurasi lokal saat dokumen dibuat:

```dotenv
TUYA_API_BASE=https://openapi.tuyaus.com
```

Indonesia dipetakan ke Singapore Data Center untuk app account baru sejak 3 Juni 2025, tetapi account lama dapat tetap berada di data center sebelumnya. Karena itu:

- jangan otomatis mengganti endpoint lokal ke Singapore;
- uji endpoint yang tercatat di cloud project;
- keberhasilan `GET device detail` terhadap minimal satu device adalah bukti region benar;
- `1106 permission deny` harus diperiksa sebagai kemungkinan salah link account, service authorization, device ID, atau endpoint.

Endpoint Singapore saat diperlukan adalah `https://openapi-sg.iotbing.com`.

###### 4.3 Jadwal polling

Rekomendasi awal:

- status energi: setiap 10 menit;
- backoff saat Tuya error/rate limit: 1, 2, 5, 10, maksimal 30 menit dengan jitter;
- status offline: tidak dianggap `0 kWh`; simpan state offline dan pertahankan angka terakhir;
- alert offline: setelah 30 menit untuk meter listrik yang seharusnya selalu menyala;
- polling manual owner/admin tersedia, tetapi diberi cooldown 60 detik;
- setelah stabil, pertimbangkan Tuya Message Service untuk event cepat, sementara polling tetap sebagai rekonsiliasi.

###### 4.4 Proteksi billing

Kandidat kWh layak review hanya jika:

- device terhubung ke kamar yang benar;
- metric berasal dari DP yang tervalidasi;
- angka kumulatif tidak turun dari pembacaan sebelumnya;
- data tidak lebih tua dari batas yang disetujui, rekomendasi 30 menit;
- lonjakan masih dalam batas masuk akal atau telah dikonfirmasi;
- stay kamar aktif dan baseline meter sudah dipromosikan.

##### 5. Jalur integrasi meter air ESP32-C3

###### 5.1 Pola akses

ESP32 mengirim agregat via HTTPS ke backend KOST48. Perangkat tidak perlu masuk ekosistem Tuya.

```text
Sensor D20 -> pulse input -> ESP32 counter -> local cumulative state
           -> HTTPS signed payload -> IoT ingest -> telemetry -> alert/rollup
```

Default pengiriman:

- hitung pulse secara kontinu dengan GPIO edge interrupt yang sangat ringan; ESP32-C3 tidak memiliki peripheral PCNT;
- RMT RX dapat dievaluasi untuk pengukuran bentuk/durasi pulse, tetapi bukan diasumsikan sebagai pengganti drop-in PCNT;
- bila frekuensi pulse aktual terlalu tinggi untuk dihitung andal bersamaan dengan Wi-Fi, gunakan external hardware counter atau ganti ke varian ESP32 yang memiliki PCNT;
- hitung flow rate dalam window 1 detik;
- kirim agregat setiap 60 detik saat ada aliran;
- kirim event segera ketika aliran berhenti;
- heartbeat setiap 5 menit saat tidak ada aliran;
- simpan queue lokal ketika Wi-Fi/API tidak tersedia;
- retry dengan exponential backoff dan `messageId` yang sama agar idempoten.

###### 5.2 Device authentication

Jangan gunakan JWT user OWNER/ADMIN/TENANT di ESP32. Gunakan identitas device terpisah:

```text
X-Device-Id: water-A-01
X-Timestamp: 1784192400
X-Nonce: 2d3d...
X-Signature: hex(HMAC-SHA256(deviceSecret, canonicalRequest))
```

Canonical request versi 1:

```text
POST
/api/iot/v1/readings
<timestamp>
<nonce>
<lowercase sha256 hex of exact raw body>
```

Backend wajib:

- mengambil device berdasarkan `X-Device-Id`;
- mendekripsi secret memakai `IOT_MASTER_KEY`;
- memakai constant-time comparison;
- menolak skew waktu lebih dari 300 detik;
- menolak nonce yang pernah dipakai dalam jendela replay;
- rate-limit per device, bukan hanya per IP;
- tidak pernah menulis secret atau signature penuh ke log.

Provisioning secret dilakukan sekali melalui kabel/serial atau halaman admin lokal yang hanya aktif saat commissioning. Secret tidak dikirim kembali oleh API aplikasi.

##### 6. Kontrak ingest device

Endpoint yang disarankan:

```http
POST /api/iot/v1/readings
Content-Type: application/json
```

Contoh payload:

```json
{
  "schemaVersion": 1,
  "messageId": "water-A-01:8f1c4b:1042",
  "bootId": "8f1c4b",
  "sequence": 1042,
  "observedAt": "2026-07-16T10:30:00+07:00",
  "firmwareVersion": "0.1.0",
  "readings": [
    { "metric": "water.pulse_total", "value": "128994", "unit": "pulse" },
    { "metric": "water.volume_total_l", "value": "2579.880", "unit": "L" },
    { "metric": "water.flow_rate_lpm", "value": "4.210", "unit": "L/min" }
  ],
  "diagnostics": {
    "rssiDbm": -62,
    "uptimeSec": 86420,
    "queueDepth": 0,
    "resetReason": "power_on"
  }
}
```

Contoh respons:

```json
{
  "accepted": true,
  "duplicate": false,
  "serverTime": "2026-07-16T10:30:01+07:00",
  "configVersion": 3,
  "nextUploadSeconds": 60
}
```

Aturan validasi:

- maksimal body 16 KB;
- maksimal 20 readings per request;
- `messageId` wajib unik per device, tetapi request duplikat mengembalikan sukses idempoten;
- `value` dikirim sebagai string desimal;
- nilai kumulatif yang turun diberi `SUSPECT`, kecuali reset meter telah disetujui;
- `observedAt` adalah waktu perangkat, `receivedAt` selalu waktu server;
- `roomId`, tenant, tarif, dan nominal tagihan tidak diterima dari device.

##### 7. Aturan alert awal

Semua rule fase pertama membuat notifikasi/tiket; tidak melakukan pemutusan otomatis.

| Rule | Default awal | Aksi |
|---|---|---|
| Device offline | Tidak ada heartbeat/poll sukses 30 menit | Alert owner/admin |
| Continuous water flow | Flow > 0.3 L/min selama 30 menit | Dugaan keran terbuka/kebocoran |
| Night flow | Flow > 0.3 L/min selama 15 menit pada 23:00-05:00 | Alert dengan prioritas lebih tinggi |
| Empty-room flow | Flow > 0.1 L/min saat tidak ada stay aktif | Alert kritis operasional |
| Counter rollback | Total kumulatif turun | Tandai data `SUSPECT`; blok kandidat billing |
| KWH spike | Delta interval > batas teknis kamar atau > 2x baseline adaptif | Alert, jangan koreksi otomatis |
| Sensor stuck | Flow selalu nol tetapi pola hunian menunjukkan penggunaan, atau pulse tidak berubah 24 jam | Inspeksi perangkat |

Threshold harus owner-settable setelah data pilot tersedia. Nilai di atas adalah default observability, bukan bukti final kebocoran atau kecurangan.

##### 8. Billing dan aspek operasional

###### 8.1 Fase shadow billing

Selama minimal satu siklus penuh:

- `waterMeteringEnabled` tetap `false`;
- angka IoT dibandingkan dengan pembacaan manual;
- selisih dan alasan koreksi dicatat;
- invoice tetap memakai flow manual yang sekarang;
- UI menampilkan label **Estimasi IoT**, bukan angka final tagihan.

Promosi otomatis baru boleh dipertimbangkan jika:

- mapping kamar 100% benar;
- tidak ada counter rollback yang tidak terjelaskan;
- error meter air memenuhi target pilot pada beberapa laju aliran;
- loss data harian di bawah target;
- owner menyetujui SOP koreksi dan sengketa;
- persyaratan tera/metrologi untuk penggunaan komersial sudah dikonfirmasi dengan pihak berwenang/kompeten.

Sensor DIY ESP32 + D20 sebaiknya dianggap alat monitoring sampai kelayakan untuk billing dipastikan. Permendag 24 Tahun 2024 yang berstatus berlaku mengatur UTTP untuk konteks usaha/penentuan pungutan dan mencantumkan meter air dalam daftar tera/tera ulang. Konsultasikan apakah rancangan dan penggunaan aktual KOST48 memenuhi ketentuan tersebut kepada Unit Metrologi Legal setempat; dokumen teknis ini bukan opini hukum.

###### 8.2 Retensi data

Default yang disarankan:

- raw telemetry 10-menit/60-detik: 90 hari;
- hourly rollup: 2 tahun;
- daily rollup dan billing candidate: selama histori stay/invoice dibutuhkan;
- payload yang memuat diagnostik: tanpa data pribadi tenant;
- delete job berjalan bertahap dan teraudit.

##### 9. Tahapan implementasi dan exit gate

###### Fase 0 - Survey dan keputusan owner

- Pastikan topologi pipa: satu jalur air benar-benar hanya melayani satu kamar.
- Catat model lengkap, datasheet, tegangan, tipe output, dan pulse constant sensor D20.
- Tentukan board ESP32-C3 yang dipakai dan GPIO aman.
- Konfirmasi cloud project Tuya, data center, dan masa aktif service plan.
- Putuskan mode awal: **monitoring + shadow billing** (rekomendasi).

Exit gate: tidak ada perangkat yang ambigu kamar atau spesifikasinya.

###### Fase 1 - Tuya connectivity spike

- Implementasi client sign/token cache tanpa database mutation.
- Buktikan endpoint region dengan satu device online.
- Discovery DP untuk setiap `productId` meter.
- Ambil status 11 meter online dan simpan fixture tersanitasi untuk test.
- Dokumentasikan F1/F2 offline tanpa menganggap nilai nol.

Exit gate: total kWh terbaca konsisten dari minimal 3 kamar dan mapping skala tervalidasi.

###### Fase 2 - Fondasi backend IoT

- Migration additive `IotDevice` + `IotTelemetry`.
- Modul `backend/src/modules/iot/`.
- Adapter Tuya, poller, idempotency, quality flags, dan audit log.
- Endpoint read-only owner/admin untuk status dan histori.
- [x] Timer internal default OFF melalui `IOT_TUYA_POLL_ENABLED=false`; modul monitoring tetap tersedia. Tidak ada global `IOT_ENABLED`.

Exit gate: test unit, integration, dan migration lulus; modul dapat dimatikan tanpa mengganggu meter manual.

###### Fase 3 - Pilot polling KWH

- Mapping seluruh device aktif ke `Room.code`.
- Poll setiap 10 menit selama 7 hari.
- Dashboard kesehatan device dan last seen.
- Bandingkan dengan aplikasi Tuya dan pembacaan manual.

Exit gate: tidak ada salah kamar, counter rollback palsu, atau skala unit salah.

###### Fase 4 - Prototype ESP32 bench

- Wiring aman 3.3 V dan enclosure belum dipasang ke jalur kamar.
- GPIO pulse counting, NVS state, Wi-Fi reconnect, HTTPS verify, dan signed payload.
- Kalibrasi volume pada sedikitnya tiga laju aliran.
- Uji mati listrik, reboot, Wi-Fi putus, API down, dan retry duplikat.

Exit gate: cumulative total pulih setelah reboot dan request duplikat tidak menggandakan data.

###### Fase 5 - Pilot satu kamar

- Instalasi oleh teknisi/plumber dengan valve isolasi dan akses servis.
- Jalankan monitoring 7-14 hari tanpa billing.
- Bandingkan volume dengan wadah ukur/meter referensi.
- Tuning alert; ukur false positive.

Exit gate: instalasi tidak bocor, koneksi stabil, error terukur, dan SOP servis tersedia.

###### Fase 6 - Shadow billing satu siklus

- Buat kandidat meter tetapi owner/admin tetap input/konfirmasi.
- Jalankan rekonsiliasi 30 hari.
- Dokumentasikan koreksi, downtime, dan reset.
- Review metrologi dan komunikasi tenant.

Exit gate: owner menandatangani keputusan apakah data boleh menjadi basis tagihan.

###### Fase 7 - Rollout bertahap

- Maksimal 3-5 kamar per batch.
- Pantau 7 hari sebelum batch berikutnya.
- Rotate secret per device setelah commissioning.
- Update inventaris dan diagram jalur pipa.

##### 10. Struktur kode yang direncanakan

```text
backend/src/modules/iot/
  iot.module.ts
  controllers/
    iot-device-ingest.controller.ts
    iot-admin.controller.ts
  guards/
    device-signature.guard.ts
  services/
    iot-device.service.ts
    telemetry-ingest.service.ts
    telemetry-quality.service.ts
    billing-candidate.service.ts
  tuya/
    tuya-client.service.ts
    tuya-signature.service.ts
    tuya-token-cache.service.ts
    tuya-dp-adapter.service.ts
  dto/
    ingest-readings.dto.ts
    iot-query.dto.ts

backend/src/modules/auto-ops/sweeps/
  iot-polling-sweep.service.ts
  iot-alert-sweep.service.ts

frontend/src/api/
  iot.ts

frontend/src/pages/iot/
  IotOverviewPage.tsx
  IotDeviceDetailPage.tsx
```

Polling dapat dijalankan melalui scheduler yang sudah ada, tetapi harus memakai advisory lock berbeda dan jangan membuat kegagalan Tuya menggagalkan sweep uang/booking. Lebih aman menjalankan IoT sweep terisolasi dari `runAll()` utama.

##### 11. Test minimum

Backend:

- signature Tuya memakai known fixture;
- token cache refresh sebelum expiry;
- endpoint/region dapat dikonfigurasi;
- DP scale dan unit normalization;
- satu device gagal tidak membatalkan batch;
- duplicate `messageId` idempoten;
- replay nonce ditolak;
- out-of-order, rollback, future timestamp, dan stale data diberi quality yang benar;
- tenant tidak dapat mengakses device kamar lain;
- telemetri tidak pernah membuat invoice tanpa review service.

Firmware:

- pulse count pada tiga flow rate;
- reboot/power loss tanpa kehilangan cumulative total di atas toleransi;
- Wi-Fi reconnect;
- TLS certificate verification aktif;
- API down dan queue replay;
- secret tidak tercetak ke serial log produksi;
- watchdog pulih dari network hang.

End-to-end:

- Tuya status -> normalized metric -> chart;
- ESP payload -> idempotent telemetry -> alert;
- kandidat -> owner approval -> existing `MeterReading` -> invoice test environment;
- hentikan cron IoT, pastikan `IOT_TUYA_POLL_ENABLED=false`, lalu disable perangkat melalui registry bila integrasi perlu dihentikan; flow meter manual tetap normal.

##### 12. Definition of done

Integrasi dianggap siap produksi hanya jika:

- setiap device memiliki kode fisik, room mapping, foto pemasangan, dan tanggal commissioning;
- secret tidak ada di git, frontend bundle, URL query, atau log;
- health dashboard menunjukkan last seen dan error yang dapat ditindaklanjuti;
- raw telemetry dan billing snapshot terpisah;
- retry idempoten dan counter kumulatif tahan reboot;
- SOP offline, reset, ganti sensor, pindah kamar, dan koreksi tersedia;
- shadow billing satu siklus selesai;
- owner menyetujui kebijakan billing dan aspek metrologi;
- [x] rollback terdokumentasi tanpa flag fiktif: stop cron + timer internal OFF + disable device bila perlu; bundle LKG wajib sudah bebas SSE dan flow manual tetap aktif.

##### 13. Keputusan yang masih diperlukan dari owner

| Keputusan | Rekomendasi awal |
|---|---|
| Tujuan meter air | Monitoring + deteksi bocor dahulu |
| Billing air | OFF sampai shadow billing dan review metrologi selesai |
| Jumlah pilot | 1 kamar yang jalur pipanya paling mudah diisolasi |
| Interval upload ESP32 | 60 detik saat mengalir; heartbeat 5 menit |
| Konfirmasi meter | Owner/admin review dahulu |
| Kontrol relay/valve | Tidak termasuk fase awal |
| Retensi raw data | 90 hari |
| Framework firmware | ESP-IDF stabil direkomendasikan; Arduino dapat dipakai untuk prototype cepat |

##### 14. Referensi resmi

Tuya:

- [Cloud project dan linking device](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx)
- [Request structure dan endpoint data center](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4)
- [Cloud request signing HMAC-SHA256](https://developer.tuya.com/en/docs/iot/new-singnature?id=Kbw0q34cs2e5g)
- [Device management API](https://developer.tuya.com/en/docs/cloud/device-management?id=K9g6rfntdz78a)
- [Mapping app account dan data center](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb)
- [Tuya Message Service](https://developer.tuya.com/en/docs/iot/manage-messages?id=Ka49p7loog3ze)

Espressif:

- [ESP32-C3 getting started](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/get-started/index.html)
- [ESP32-C3 API reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c3/api-reference/index.html)
- [ESP32-C3 RMT receiver](https://docs.espressif.com/projects/esp-idf/en/release-v5.4/esp32c3/api-reference/peripherals/rmt.html)
- [Espressif FAQ: ESP32-C3 tidak mendukung PCNT](https://docs.espressif.com/projects/esp-faq/en/latest/software-framework/peripherals/pcnt.html)
- [ESP HTTP client dan TLS](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c3/api-reference/protocols/esp_http_client.html)
- [Arduino ESP32 Wi-Fi API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html)
- [Arduino ESP32 Preferences/NVS](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/preferences.html)

Metrologi:

- [Permendag 24 Tahun 2024 - Kegiatan Tera dan Tera Ulang Metrologi Legal](https://jdih.kemendag.go.id/peraturan/peraturan-menteri-perdagangan-nomor-24-tahun-2024-tentang-kegiatan-tera-dan-tera-ulang-alat-ukur-alat-timbang-dan-alat-perlengkapan-metrologi-legal-1)

---

### Bagian 6 — IoT Monitoring (KWH Tuya + Water Flow ESP32)

> **Fondasi implementasi selesai (2026-07-23); rollout hardware dan UAT masih gate.** Spek lengkap: `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` + `M14_IOT_TUYA_DEVICES.md`. Telemetry tidak pernah otomatis membuat tagihan.

**Update quota energi:** aturan kanonik quota listrik ada di [keuangan.md](keuangan.md) § Quota Utilitas Berbasis Periode Sewa Lunas — **tidak diulang di sini** (dedup D-01, keputusan owner 23 Sep 2026). Catat meter/renewal tetap jalur bisnis yang menerbitkan invoice, bukan polling Tuya.

#### Hardware Terpasang

| Jenis | Jumlah | Status | Integrasi |
|---|---|---|---|
| **KWH Meter Tuya per kamar** | 13 (snapshot: 11 online) | Tuya Cloud API | Polling cron 10 menit → `IotTelemetry` (bukan `MeterReading` billing) |
| **CCTV BARDI IP Camera** | 5 (4 online) | Tuya Cloud | Fase lanjutan (snapshot dashboard) |
| **Smart Lock** | 1 (online) | Tuya Cloud | Fase lanjutan (remote unlock) |
| **Water Flow D20 + ESP32-C3** | 2-3 unit (rollout hardware) | Signed HTTP POST | `/api/iot/v1/readings` (HMAC per device) |

#### Arsitektur Backend (aktif)

```
ESP32-C3+D20 → signed POST /api/iot/v1/readings → IotIngestMessage + IotTelemetry
Tuya KWH Meter → Tuya Cloud API → IotPollingService (interval/cron 10 menit) → IotTelemetry
Tenant/owner → overview dan history dengan pembaruan berkala; billing tetap memakai MeterReading terpisah
```

- **1 backend** (tidak bikin backend baru — hemat RAM shared hosting)
- **Tanpa MQTT**; Tuya dipoll melalui REST dan portal tenant memakai polling terikat agar worker shared hosting tidak tertahan koneksi panjang.
- **Kredensial ESP32** disimpan terenkripsi per device dan request ditandatangani HMAC; bukan JWT pengguna.
- Endpoint cron Tuya: `POST /api/iot/tuya/cron` dengan header `X-Iot-Cron-Token`.

#### Model Prisma (aktif)

- `IotDevice` — registry ESP32/Tuya, mapping kamar, credential terenkripsi
- `IotIngestMessage` — envelope idempoten/replay-safe per event atau poll
- `IotTelemetry` — metrik dinormalisasi dari water flow maupun Tuya, lengkap kualitas data
- `MeterReading` — tetap satu-satunya snapshot yang dipakai billing

#### Polling dan tindak lanjut

| Sweeper | Trigger | Aksi |
|---|---|---|
| **IotPollingService** | Interval always-on atau cron tiap 10 menit | Polling perangkat Tuya aktif → simpan telemetry |
| **Anomali/kebocoran** | Belum diaktifkan sebagai auto-action | Tetap kandidat observability; perlu threshold, UAT sensor, dan keputusan operasional sebelum alert otomatis |

#### Referensi

| Topik | Dokumen |
|---|---|
| Inventaris device + Device ID | `docs/domain/ai.md` |
| Spek implementasi | memory `iot-water-kwh-spec` |
| Peta scope | `docs/arsip/scope.md` § A6. SYSTEM / IoT |
| Proposal meter pascabayar | `docs/domain/hunian.md` § Bagian 5 (M-1..M-5 ✅) |

