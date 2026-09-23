# M15 — IoT KOST48 (Spesifikasi Lengkap)

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

<a id="part-a--inventaris-perangkat-tuya"></a>
<a id="part-b--rencana-implementasi"></a>
<a id="part-c--runbook-setup-tuya-kwh"></a>
<a id="part-d--spesifikasi-esp32-c3-water-meter"></a>
<a id="part-e--handoff-backend--frontend"></a>

> **Sumber:** Tuya IoT Console ekspor 2026-07-10 · ESP32-C3 firmware  
> **Total perangkat:** 27 Tuya (17 Online, 10 Offline) + 2-3 ESP32-C3  
> **Status implementasi:** foundation done (2026-07-23), telemetry monitoring-only, no auto-billing  
> **Terkait:** memory `iot-water-kwh-spec` · `domain/operasional.md` · `M10_PETA_SCOPE.md`

> **Update 2026-07-30 — Arah IoT baru (on-demand, tanpa cron):** kWh meter Tuya dibaca **on-demand** lewat `POST /api/iot/tenant/refresh` / `GET /api/iot/tenant/my-room` (angka kumulatif `add_ele`), bukan polling cron. Tidak ada cron `iot/tuya/cron` dan `IOT_TUYA_POLL_ENABLED=false`. Selisih pemakaian = total kumulatif sekarang − titik acuan (`MeterReading`) terakhir. Kedepan, ESP32 water-flow & polling akan dipindah ke Raspberry Pi (terpisah dari app ini); app ini cukup membaca data dari Pi saat sudah siap.

## Daftar Isi
- **[Part A — Inventaris Perangkat Tuya](#part-a--inventaris-perangkat-tuya)** — 27 device, KWH meter 13 kamar, CCTV, AC, Smart Lock
- **[Part B — Rencana Implementasi](#part-b--rencana-implementasi)** — arsitektur, Prisma model, cron, API, frontend
- **[Part C — Runbook Setup Tuya KWH](#part-c--runbook-setup-tuya-kwh)** — credential, polling, mapping device, troubleshooting
- **[Part D — Spesifikasi ESP32-C3 Water Meter](#part-d--spesifikasi-esp32-c3-water-meter)** — firmware, wiring D20, ingest API, provisioning
- **[Part E — Handoff Backend & Frontend](#part-e--handoff-backend--frontend)** — deploy checklist, verifikasi, yang sudah siap

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| Part A — Inventaris Perangkat Tuya dan Part B — Rencana Implementasi (arsitektur, jalur integrasi, kontrak ingest, aturan alert, billing/operasional, tahapan, DoD) | [domain/iot.md](domain/iot.md) | Teks tidak diubah; pengembangan IoT ditunda (IOT-LATER) |
| Aturan & spesifikasi telemetry IoT asal `domain/operasional.md` § Bagian 6 (konsolidasi B8) | [domain/iot.md](domain/iot.md) | Teks tidak diubah |
| Part C — Runbook setup Tuya KWH | [operations/iot-tuya-setup.md](operations/iot-tuya-setup.md) | Prosedur; bukan izin eksekusi |
| Part D — Spesifikasi & prosedur water meter ESP32-C3 | [operations/iot-water-meter-esp32.md](operations/iot-water-meter-esp32.md) | Spesifikasi prototype |
| Part E — Handoff backend & frontend | [operations/iot-handoff.md](operations/iot-handoff.md) | Checklist operasional |
| Update implementasi 2026-07-23 dan hasil verifikasi 2026-07-16 | [history/changelog/2026-07.md](history/changelog/2026-07.md) | Riwayat bertanggal |

## Catatan Pemakaian

- Jadikan file ini pintu masuk tematik; bila butuh detail mentah, buka lokasi kanonik di tabel atas.
- Heading asli (`## Part A` … `## Part E`) dipertahankan di file tujuan; file ini hanya pintu masuk agar tautan lama tetap resolve.
- `IOT-LATER` (keputusan owner 22 Sep): pengembangan IoT **ditunda**, bukan dihapus. Pencatatan meter untuk tagihan tetap berjalan dan telemetry tidak pernah otomatis menerbitkan tagihan.
