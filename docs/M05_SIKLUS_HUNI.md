# KOST48 V5 — Siklus Huni, Renewal, Checkout, Deposit

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah.

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Dokumen lifecycle penghuni dari booking/renewal sampai checkout, deposit, overstay, dan room readiness.

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| Aturan bisnis booking/renewal/checkout/deposit, desain renewal, invarian & UAT, peta kode | [domain/hunian.md](domain/hunian.md) | Normatif; teks tidak diubah |
| Status kamar Fase V | [domain/kontrak.md](domain/kontrak.md#override-fase-v--status-kamar) | Kanonik |
| Kuota utilitas periode sewa | [domain/keuangan.md](domain/keuangan.md#quota-utilitas-berbasis-periode-sewa-lunas) | Kanonik |
| Bukti Audit 360° Flow Huni (Jul 2026) + deep audit 29 Jul 2026 | [audit/audit-360-huni-2026-07.md](audit/audit-360-huni-2026-07.md) | Bukti bertanggal, bukan status aktif |
| Snapshot dossier 11/12, task, temuan, update 2026-06/07 | [history/changelog/2026-06.md](history/changelog/2026-06.md) · [history/changelog/2026-07.md](history/changelog/2026-07.md) | Riwayat tidak diubah |

## Sumber Digabung

- `docs/archieve/2026-06-16_root_docs_pre_M/11_BOOKING_RENEWAL.md` — konten dipertahankan → `domain/hunian.md` + changelog
- `docs/archieve/2026-06-16_root_docs_pre_M/12_CHECKOUT_DEPOSIT_OVERSTAY.md` — konten dipertahankan → `domain/hunian.md` + changelog

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip atau lokasi kanonik di atas.
