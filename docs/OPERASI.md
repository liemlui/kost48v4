# OPERASI — Runbook Operasional KOST48

> **Rumah kanonik runbook operasi** (deploy, produksi, go-live, env, default dev, data master). Berkas ini adalah **titik masuk**: ia menetapkan batas dan menunjuk runbook rinci — **bukan** antrean, dan bukan izin menjalankan deploy.
> Otoritas: prompt owner > [STATUS](STATUS.md) (antrean/gate) > [AGENTS](../AGENTS.md) (izin & verifikasi) > berkas ini. Aturan bisnis: [ATURAN.md](ATURAN.md).
> Rincian runbook ada di `docs/operations/` (§4). Berkas-berkas itu adalah **bagian dari OPERASI ini**.
> Dibuat 23 September 2026 (Fase 2 konsolidasi). Status tahap: [STATUS §8](STATUS.md#8-struktur-dokumen-tujuan-konsolidasi).

## 1. Batas lingkungan (jangan dicampur)

| Lingkungan | Berkas rinci | Aturan pakai |
|---|---|---|
| DEV (akun seed, perintah seed) | [operations/default-dev.md](operations/default-dev.md) | kredensial DEV nyata ada di sana — jangan disalin ke dokumen lain |
| UAT non-personal (aktor/fixture audit) | [operations/default-dev.md](operations/default-dev.md) §1b | fixture non-personal; identitas UAT bukan data penghuni |
| PRODUKSI / go-live | [operations/produksi.md](operations/produksi.md) · [operations/go-live-cpanel.md](operations/go-live-cpanel.md) · [operations/deploy-go-live.md](operations/deploy-go-live.md) | memuat data penghuni (termasuk NIK) **apa adanya**; jangan menyalin ke dokumen/chat lain |
| Referensi master & nilai default | [operations/data-master.md](operations/data-master.md) | nilai default sistem, konstanta, FAQ kanonik, data lapangan |

**Aturan keselamatan dokumen:** jangan pernah menampilkan nilai secret (password, token, API key) atau data pribadi di laporan/keluaran shell. Pindahkan apa adanya bila memang harus dipindah, dan laporkan **lokasinya**, bukan nilainya.

## 2. Batas kewenangan

- Deploy/rilis adalah **task tersendiri**: artefak/SHA, target, izin owner, backup/rollback, dan smoke check mengikuti [operations/deploy-go-live.md](operations/deploy-go-live.md) serta antrean [STATUS §2](STATUS.md).
- DONE lokal, typecheck, atau build **bukan** izin dan bukan bukti deployment; dampak runtime harus diukur terpisah.
- Mesin/DB UAT dan produksi: identitas melalui runbook, bukan asumsi nama/port. Restore DB dan rollback produksi mengikuti runbook operasi.
- Jangan menambah dependency, mengubah hook, atau mematikan guard untuk melewati kegagalan.

## 3. Gate uang & verifikasi terkait

- Task yang menyentuh uang wajib mengikuti gate uang di [STATUS §7](STATUS.md) dan harness [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) (invarian, DO-NOT-TOUCH, gate per-task).
- Verifikasi keuangan bukan bukti runtime; status temuan uang ada di [AUDIT.md](AUDIT.md).

## 4. Runbook rinci (kanonik)

| Kebutuhan | Berkas |
|---|---|
| Deploy, PWA, dan go-live (runbook utama) | [operations/deploy-go-live.md](operations/deploy-go-live.md) |
| Checklist go-live cPanel (langkah per langkah) | [operations/go-live-cpanel.md](operations/go-live-cpanel.md) |
| Formulir isi data go-live (satu formulir kanonik) | [operations/form-go-live.md](operations/go-live-cpanel.md) |
| Produksi & operasional harian shared hosting | [operations/produksi.md](operations/produksi.md) |
| Default & seed DEV (akun dev, perintah seed) | [operations/default-dev.md](operations/default-dev.md) |
| Data master & nilai default (kamar, fasilitas, konstanta, FAQ) | [operations/data-master.md](operations/data-master.md) |
| Efisiensi hosting 512 MB (Fase EF: arah, gate, tabel pengukuran) | [operations/efisiensi-hosting.md](operations/efisiensi-hosting.md) |
| Harness verifikasi keuangan | [operations/verifikasi-keuangan.md](operations/verifikasi-keuangan.md) |
| IoT — runbook setup Tuya KWH | [operations/iot-tuya-setup.md](operations/iot-tuya-setup.md) |
| IoT — spesifikasi & prosedur water meter ESP32-C3 | [operations/iot-water-meter-esp32.md](operations/iot-water-meter-esp32.md) |
| IoT — handoff backend & frontend | [operations/iot-handoff.md](operations/iot-tuya-setup.md) |

## 5. Provenance

- Isi `docs/operations/` berasal dari M08/M11/M19/M20 serta `GO_LIVE_CPANEL_CHECKLIST.md` dan `FORM_ISI_DATA_GO_LIVE.md` (batch S1.b, B3, B9), dipindah **tanpa mengubah langkah**; bukti ada di [mapping §7](arsip/DOC-GOV-20260922-mapping.md).
- Path lama (termasuk dua berkas non-M di atas) **sudah dihapus di Fase 3**; rincian tetap kanonik di `docs/operations/`.
- Berkas ini menjadi rumah kanonik sejak **Fase 2 (23 Sep 2026)**; rincian di `docs/operations/` tetap dipakai apa adanya dan tidak digandakan ke berkas ini.
