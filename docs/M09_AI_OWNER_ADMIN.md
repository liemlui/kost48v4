# KOST48 V5 - Fase G AI Owner/Admin Approval Copilot

> Dossier baru untuk semua fitur DeepSeek/AI berbayar. Fokus: Owner dan Admin saja, selalu manual lewat tombol, hemat token, dan semua output yang mengubah data wajib menunggu persetujuan manusia.

## Tujuan

Fase G menjadikan AI sebagai pembantu keputusan Owner/Admin, bukan autopilot. AI boleh membaca snapshot data yang sudah diringkas, menyusun analisa, mengisi draft, memberi rekomendasi, dan menyiapkan payload. AI tidak boleh langsung menyetujui pembayaran, membuat jurnal, mengubah stok, memverifikasi KTP, menutup tiket, atau mengubah status kamar tanpa tombol persetujuan Owner/Admin.

## Status Saat Ini

- **Fase G (G0-G9) SELESAI** 19-20 Jun 2026 — modul `backend/src/modules/owner-ai/` (15 file) + `frontend/src/components/ai/*`.
- **Fase J — Hardening SELESAI** 20 Jun 2026 — J0-J4: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP dibukukan di M09. Detail: `docs/M15_FASE_J_HARDENING_AI.md`.
- **Fase K — Pasca-Audit SELESAI** 20 Jun 2026 — 13 task termasuk:
  - **Circuit breaker DeepSeek** (`deepseek.client.ts`): 5 kegagalan berturut-turut → circuit open 30 detik, auto-recover.
  - **Fallback MarketAnalysis.chat**: API gagal → return `RULE_FALLBACK` dengan pesan, bukan 500 error.
  - **Konfigurasi AI owner-configurable** (R3): model, base URL, daily limit, toggle enable/manual-only/log — semua bisa diatur dari **Owner Settings → tab "AI & Biaya"**. Disimpan di `OperationalSetting` (DB), fallback ke `.env`. API key TETAP di `.env` (keamanan). Detail: `docs/M16_PASCA_AUDIT_PLAN.md`.
- Integrasi DeepSeek: client di `backend/src/modules/market-analysis/deepseek.client.ts`.
- Halaman frontend: `frontend/src/pages/marketing/MarketAnalysisPage.tsx`, settings di `frontend/src/pages/settings/OwnerSettingsPage.tsx`.
- OCR KTP gratis/offline: `frontend/src/utils/ktpOcr.ts`, `frontend/src/pages/bookings/GuestBookingForm.tsx`.
- Audit trail: `AuditLog.meta.ai` untuk jejak keputusan yang memakai AI.

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
- Jika amount > Rp500.000, tampilkan peringatan kapitalisasi aset sesuai aturan aset.
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
2. Baca `docs/M12_CHECKLIST_CHANGELOG.md` bagian Fase G saja.
3. Baca file ini bagian global + task yang dikerjakan.
4. Baca domain terkait: M04 untuk uang, M05 untuk booking/KTP/payment, M06 untuk ops/inventory, M07 untuk marketing/FAQ, M08 untuk env, M09 untuk audit.
5. `git status --short`; jangan sentuh file yang sedang dimodifikasi orang lain.
6. Grep anchor kode yang disebut task.
7. Implementasi satu task saja.
8. Jalankan gate.
9. Update M10 status task.
10. Tambah satu baris M11 changelog.

