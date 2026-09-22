# KOST48 V5 — Keuangan, Pembayaran, Invoice, Akuntansi

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru.

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Pintu masuk domain keuangan: aturan aktif, harness verifikasi, bukti audit, dan riwayat.

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| Aturan normatif, kebijakan, dan **status invarian** | [domain/keuangan.md](domain/keuangan.md) | Satu-satunya tabel status invarian yang aktif |
| Harness verifikasi keuangan (§1 invarian, DO-NOT-TOUCH, unit test, harness rekonsiliasi, skenario emas, gate per-task) | [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) | Dipindah apa adanya 23 Sep 2026; 5 `[ ]` gate dipertahankan |
| Bukti audit 360° (Jul 2026) + temuan P1-01..P1-09 | [audit/audit-360-uang-2026-07.md](audit/audit-360-uang-2026-07.md) | Bukti bertanggal, bukan status aktif |
| Status verifikasi temuan P1 | [audit/p1-uang-status-2026-09-23.md](audit/p1-uang-status-2026-09-23.md) | Verifikasi **statis** 23 Sep 2026 |
| Snapshot dossier 10 & 13, riwayat | [history/changelog/2026-06.md](history/changelog/2026-06.md) · [history/changelog/2026-07.md](history/changelog/2026-07.md) | Riwayat tidak diubah |

## Sumber Digabung

- `docs/archieve/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md` — konten dipertahankan → `operations/verifikasi-keuangan.md`
- `docs/archieve/2026-06-16_root_docs_pre_M/10_PEMBAYARAN_INVOICE.md` — konten dipertahankan → `domain/keuangan.md` + changelog
- `docs/archieve/2026-06-16_root_docs_pre_M/13_AKUNTANSI_LAPORAN.md` — konten dipertahankan → `domain/keuangan.md` + changelog

## Updates — dipindah
- Riwayat historis: [history/changelog/](history/changelog/)
- Aturan aktif & status invarian: [domain/keuangan.md](domain/keuangan.md)

Status invarian: lihat tabel kanonik di [domain/keuangan.md](domain/keuangan.md#status-audit-invarian-keuangan-per-jul-2026).
