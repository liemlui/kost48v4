# ATURAN — Aturan Domain KOST48

> **Rumah kanonik aturan domain** (uang, huni, operasional, harga, publik, AI/IoT). Berkas ini adalah **titik masuk**: ia menetapkan batas dan menunjuk berkas rinci — **bukan** tempat menulis aturan baru dan bukan antrean.
> Otoritas: prompt owner > [STATUS](STATUS.md) (antrean/gate) > [AGENTS](../AGENTS.md) (aturan kerja) > berkas ini. Keputusan bisnis: [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
> Rincian aturan ada di `docs/domain/` (§2). Berkas-berkas itu adalah **bagian dari ATURAN ini**, bukan dokumen terpisah yang boleh kedaluwarsa sendiri.
> Dibuat 23 September 2026 (Fase 2 konsolidasi). Status tahap: [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi) + [mapping migrasi](arsip/DOC-GOV-20260922-mapping.md).

## 1. Cara pakai

1. Baca **hanya** topik yang relevan dengan task (§2); jangan memuat seluruh `domain/` sebagai orientasi.
2. Aturan uang, DP/deposit, harga, dan status hunian **tidak boleh diubah** tanpa keputusan owner di [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md) — memindahkan atau merapikan teks tidak mengubah aturan.
3. Bila aturan yang sama muncul di dua tempat: laporkan ke [laporan duplikat](history/laporan-duplikat.md). Dedup **pengulangan non-aturan** boleh; isi aturan uang/harga/huni tetap milik owner.
4. Perubahan aturan hanya sah bila ada keputusan owner; sesudahnya perbarui berkas rinci dan catat bukti di [M13](M13_CHANGELOG.md) atau changelog bulanan di `docs/history/changelog/`.

## 2. Topik dan berkas rinci (kanonik)

| Topik | Berkas kanonik | Cakupan |
|---|---|---|
| Flow dan kontrak lintas domain | [domain/flow.md](domain/flow.md) · [domain/kontrak.md](domain/kontrak.md) | peta flow, business rules, override Fase V, kontrak producer ke consumer |
| Keuangan, jurnal, tagihan | [domain/keuangan.md](domain/keuangan.md) | kebijakan & invarian pembayaran/invoice/akuntansi, quota utilitas, otomasi bulanan, kapitalisasi aset |
| Siklus huni, deposit, checkout | [domain/hunian.md](domain/hunian.md) | booking & renewal, checkout, deposit, overstay, catatan AI & riwayat sewa |
| Harga kamar | [domain/harga.md](domain/harga.md) | tarif bulanan, multiplier, pembulatan, term, DP & deposit, surcharge, rent-lock |
| Operasional harian | [domain/operasional.md](domain/operasional.md) | aturan tenant & staf, inventaris, tiket/KPI, notifikasi, auth/KTP, Auto-Ops |
| Publik dan pertumbuhan | [domain/publik.md](domain/publik.md) | marketing, UI/UX publik, gamifikasi & loyalitas, FAQ |
| AI owner/admin | [domain/ai.md](domain/ai.md) | Fase G approval copilot, arsitektur, format respons, audit trail, hemat token |
| IoT (pengembangan ditunda; pencatatan meter tetap) | [domain/iot.md](domain/iot.md) | inventaris perangkat Tuya, arsitektur ingest, aturan alert & billing meter |
| Aturan bisnis & keputusan lintas topik | [KEPUTUSAN-OWNER.md](KEPUTUSAN-OWNER.md) | register keputusan owner + status berlaku/digantikan |

Berkas rinci juga memuat **bukti audit bertanggal** dari era M (mis. `## Audit 360° P6`). Bukti itu riwayat, bukan aturan aktif; status audit ada di [AUDIT.md](AUDIT.md).

## 3. Batas berkas ini

- Antrean, gate, invariant, dan blocker: [STATUS](STATUS.md) — jangan diduplikasi di sini.
- Runbook deploy, produksi, go-live, env, data master: [OPERASI.md](OPERASI.md).
- Status audit dan temuan bertanggal: [AUDIT.md](AUDIT.md).
- Keputusan bisnis owner (nominal, DP/deposit, harga, utang-piutang, gate uang/huni): [KEPUTUSAN-OWNER](KEPUTUSAN-OWNER.md).
- Riwayat dan changelog berjalan: [history/](history/); bukti bulk kanonik: [arsip/](arsip/README.md); `docs/archieve/` hanya legacy yang dipertahankan atas keputusan owner.
- Verifikasi uang (harness, DO-NOT-TOUCH, gate per-task): [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) + gate uang di [STATUS §7](STATUS.md).

## 4. Provenance

- Isi `docs/domain/` berasal dari M03–M07/M09/M15/M18 melalui batch B1–B3, B5, dan B8, dipindah **tanpa mengubah aturan**; bukti perpindahan ada di [mapping §7](arsip/DOC-GOV-20260922-mapping.md).
- Path M lama **sudah dihapus di Fase 3** (23 Sep 2026); rincian tetap kanonik di berkas §2 dan tidak digandakan ke berkas ini.
- Berkas ini menjadi rumah kanonik sejak **Fase 2 (23 Sep 2026)**; rincian di `docs/domain/` tetap dipakai apa adanya dan tidak digandakan ke berkas ini.
