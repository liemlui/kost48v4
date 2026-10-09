# Recon Infrastruktur AI untuk Lapisan Agenda Keputusan

- Status: **recon statis selesai dengan temuan** — 2 temuan bernilai tinggi (A-1, A-2), 3 sedang, 3 rendah, 2 info
- Tanggal: 25 September 2026
- Baseline: HEAD `951f0c95`, working tree bersih saat recon dimulai
- Jenis: **pembacaan kode statis** oleh subagent read-only; **tidak ada** test, build, server, DB, atau pemanggilan provider yang dijalankan
- Pemicu: arah owner 25 Sep 2026 — "manfaatkan API AI untuk menyederhanakan data; keputusan dan rekomendasi cukup diklik ke lokasi tautan yang direkomendasikan AI" ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md))
- Rancangan terkait: [product/portal-owner-admin.md](../product/portal-owner-admin.md) §10–§11 · aturan: [domain/ai.md](../domain/ai.md) §G10

## Metode

Menelusuri jalur AI end-to-end: modul backend (`modules/ai`, `modules/owner-ai`, `modules/market-analysis`), client provider, kuota/cache/circuit breaker, gate approval manusia, pemakaian di frontend, serta mesin rekomendasi non-AI yang sudah beredar (`ActionQueueItem`, `AssistantItem`, `AdminWorkLane`, `useOperationalStressIndex`, `useBusinessHealthScore`). Tidak ada berkas yang diubah.

## Kabar baik: bahan utamanya sudah ada

| Kebutuhan lapisan agenda | Sudah tersedia di |
|---|---|
| Endpoint brief + `priorityActions[]` berisi `route` | `POST /owner-ai/brief`; `owner-ai/prompts/brief.prompt.ts:17` |
| Bentuk kartu + renderer + eksekutor tautan | `ActionQueueItem` + `command-center/ActionQueueTable.tsx:9-31`, `openActionTarget()` `:56-60` |
| Dedupe kartu AI vs kartu rule | `utils/commandCenterDedup.ts:7-20` (`ruleId`/`dedupKey`) |
| Papan alur ADMIN 0–5 dengan `action` + `to` | `AdminWorkLane` (`pages/dashboard/dashboardShared.tsx:42-53`) |
| Skor kesehatan + sinyal keputusan OWNER | `useBusinessHealthScore`, `useOperationalStressIndex`, `extraSignals` + `ownerSignalRoute` |
| Rumah simpanan hasil (G9) | `AiDraft` — `owner-ai/ai-draft.service.ts`, `ai-draft.controller.ts` |
| Anti-halusinasi angka | snapshot builder deterministik → `stableHash` → prompt JSON → normalisasi allowlist → fallback per fitur |
| Gate manusia | `AiDraft` DRAFT→APPLIED/REJECTED/EXPIRED; bukti sekali-pakai `KtpAiApprovalService.consume` |

Konsekuensi: **lapisan agenda tidak memerlukan endpoint, prompt, atau schema baru untuk mulai bekerja.**

## Temuan

| ID | Severity | Temuan | Bukti | Dampak |
|---|---|---|---|---|
| **A-1** | TINGGI | `route` dari AI adalah **string bebas dan tidak divalidasi** terhadap router sebelum `navigate` | `brief.prompt.ts:17`, `finance.prompt.ts:19`; eksekusi `ActionQueueTable.tsx:56-60` | Rute halusinasi/berbahaya bisa dieksekusi; wajib allowlist deterministik sebelum dipakai |
| **A-2** | TINGGI (nilai) | `priorityActions[].route` **sudah dikirim AI tetapi dibuang UI** — dirender `<ul><li>` teks tanpa tautan | `DashboardAdmin.tsx:582-591`; `OwnerDashboardPage.tsx:630-643` | Token sudah dibayar, manfaat "tinggal klik" hilang; perbaikan termurah di seluruh rencana |
| **A-3** | SEDANG | Keluaran AI tidak memuat `entityId`/`actionTo`/`type`/`ruleId`/`dedupKey` | `owner-ai.helpers.ts:350-403` (allowlist normalisasi) | Sulit digabung ke `ActionQueueItem`/`AdminWorkLane`; belum bisa deep-link ke entitas konkret |
| **A-4** | SEDANG | Komponen **mati**: `AiApprovalDrawer.tsx` dan `AiSourceSnapshot.tsx` tidak di-import di mana pun | grep import = 0 | Janji approval & "dari mana angkanya" belum terpasang padahal komponennya sudah dibuat |
| **A-5** | SEDANG (drift) | `AuditLog.meta.ai` **tidak pernah ditulis** kode mana pun, padahal dibaca `getUsageOverview` | `owner-ai.service.ts:342-363`; kewajiban di `domain/ai.md` §Audit Trail | `GET /owner-ai/usage` selalu kosong; audit trail AI yang dijanjikan dokumen tidak ada |
| **A-6** | RENDAH | `usage` token tidak dipersistensi (in-memory, hanya badge), tanpa estimasi rupiah; kuota harian per `actor:feature` dan **reset saat proses restart** | `deepseek.client.ts:135-147`; `owner-ai.service.ts:123-151` | Biaya AI tidak dapat diaudit lintas sesi/deploy |
| **A-7** | RENDAH | Tiga rezim limit/cache berbeda: `modules/ai` (12/60 detik), `market-analysis` (20/menit), `owner-ai` (kuota harian). Modul `modules/ai` **seluruhnya rule-based** dan `AI_PROVIDER_KEY` tidak pernah dipakai memanggil provider | `ai/ai.service.ts:25-39,52`; `market-analysis.service.ts:22-31`; `owner-ai.service.ts:123-141` | Tidak ada satu kebijakan biaya; modul `ai` bukan fondasi AI dan bisa menyesatkan pembaca berikutnya |
| **A-8** | RENDAH | `AiAssistButton` menahan hasil di `useState` lokal | `components/ai/AiAssistButton.tsx:14-42` | Refresh menghapus hasil AI; tidak masuk antrean kecuali pengguna menekan "Simpan sebagai draft" |
| **A-9** | INFO | `POST /ai/payment-proof/analyze` dinamai "analisa bukti" tetapi hanya membandingkan dua angka DTO — tanpa OCR/vision | `ai/ai.service.ts:78-111` | Jangan dianggap fondasi analisis bukti; jangan dibangun di atasnya |
| **A-10** | INFO | `useMeterAnomalyDetector` sudah memuat `recommendedAction` + `severity` tetapi hook-nya belum di-import di frontend | hook vs pemakaian = 0 | Sinyal meter siap dipakai kartu rule-based |

## Konsekuensi untuk rencana

1. **`AIDL-01` (A-2 + A-1) hampir gratis** dan langsung menghidupkan pengalaman "tinggal klik": tampilkan `route` yang sudah dikirim sebagai tombol, di belakang allowlist rute.
2. **`AIDL-03` (kartu rule-based) tidak menunggu AI** dan tidak menunggu keputusan aturan apa pun.
3. **`AIDL-04` tidak butuh schema baru** — rumah simpanan sudah ada (`AiDraft`); yang perlu keputusan owner hanya boleh/tidaknya agenda dihitung terjadwal (benturan §Pola Terlarang + UAT Fase G item 1).
4. **A-5 wajib ditutup lebih dulu** sebelum `GET /owner-ai/usage` dipakai sebagai dasar klaim biaya/audit apa pun — saat ini angka itu tidak punya isi.

## Batas

Ini **bukan** verifikasi runtime: tidak ada build, test, server, DB, atau panggilan provider. Temuan dapat berubah bila source berubah. A-1 dan A-2 belum diverifikasi di browser; keduanya masih perlu bukti runtime pada task implementasinya.

## Tindak lanjut

- Temuan A-1…A-10 masuk backlog lewat antrean [ANTREAN](../ANTREAN.md) (`AIDL-01`…`AIDL-05`); A-5 dan A-7 dicatat sebagai kandidat task higiene AI tersendiri dan **belum** dijadikan task pada perubahan ini.
- Tidak ada source, schema, DB, server, atau deployment yang diubah oleh recon ini.
