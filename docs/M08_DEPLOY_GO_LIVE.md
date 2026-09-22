# KOST48 V5 — Deploy, PWA, Go-Live, Akun Dev

## Arah deploy aktif — 6 September 2026

**Fase EF diprioritaskan; satu proses API sebagai target; Fase MA ditunda.** Dokumen ini runbook, bukan izin menjalankan server/DB. Kelayakan 512 MB dan status deployment belum disahkan. Checklist otoritatif [M12](M12_CHECKLIST_CHANGELOG.md); keputusan [M02](M02_KEPUTUSAN_OWNER.md); spesifikasi/tabel hosting [efisiensi-hosting.md §9](operations/efisiensi-hosting.md#9-pencatatan-hosting-ef-00-dan-ef-02).

- Langkah sekarang: identitas artefak dan pengamatan pasif; pastikan EF-01/03/05 benar-benar masuk artefak sebelum menilai dampaknya. Kode lokal uncommitted bisa ikut paket; SHA saja tidak cukup.
- Audit statis/typecheck lokal selesai bukan deployment/build/UAT server PASS. Fase A dan gate AO yang terbuka tetap harus ditutup dengan bukti.
- Profil combined adalah baseline kode lokal; static split masih rencana EF-04/06 setelah kemampuan host jelas. Build SPA/gambar kamar publik dapat dipertimbangkan; jangan membuka seluruh uploads atau bukti bayar/foto privat sebagai static publik.
- AutoOps target interval OFF; cron token-protected hanya sesuai izin operasional. IoT Tuya on-demand, **tanpa cron Tuya**. Flag AI berbeda dari key DB/env; push bisa memakai konfigurasi DB. Jangan hapus key untuk mencoba mematikan fitur.
- Petunjuk deploy/seed/restart di bagian lama adalah prosedur bersyarat, bukan tugas yang otomatis diizinkan. Ukur identitas server/DB terlebih dahulu; jangan reset/drop UAT/produksi.
- **Lembar kerja go-live cPanel:** [GO_LIVE_CPANEL_CHECKLIST.md](GO_LIVE_CPANEL_CHECKLIST.md) (12 Sep 2026) — status artefak, keputusan owner yang belum diambil, urutan langkah server, smoke test, rollback, dan jebakan. Paket terbaru: `kost48-deploy-bundled.tgz` 42.749.795 byte, SHA-256 `BC9176F2897B6FB444FD9A0156C90944D0D289EF8E66932217B2944DB69EEDFD`, build PWA `B70lrG6Auual`.

> File hasil pemampatan dari dokumen root `docs/`. File sumber lama sudah diarsipkan ke `docs/archieve/2026-06-16_root_docs_pre_M/`.

## Tujuan

Runbook deploy/PWA, checklist go-live, dan appendix akun dummy untuk DB pengembangan.

## Sumber Digabung

- `docs/archieve/2026-06-16_root_docs_pre_M/04_DEPLOY_AND_PWA.md` - konten dipertahankan
- `docs/archieve/2026-06-16_root_docs_pre_M/GO_LIVE_CHECKLIST.md` - konten dipertahankan
- `docs/archieve/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md` - update SI-1 event-path diserap

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, cek file sumber di arsip yang disebut di atas.
- Heading asli dinaikkan levelnya agar tidak bertabrakan dengan struktur M-file.
- Appendix akun dummy hanya untuk DB pengembangan; jangan dipakai untuk produksi.

## Section dipindah ke operations

- Deploy, PWA & Go-Live (Bagian 1, Bagian 2, Appendix A) → [operations/deploy-go-live.md](operations/deploy-go-live.md)
- Akun Dummy DEV (Bagian 3) → [operations/default-dev.md](operations/default-dev.md)
- Deploy cPanel Step-by-Step (Appendix B) → [operations/go-live-cpanel.md](operations/go-live-cpanel.md)
- 4 catatan Update (Jun-Jul 2026) → [history/changelog/2026-09.md](history/changelog/2026-09.md)
