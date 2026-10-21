# D4b — ledger konservasi konsolidasi operations (potret 2026-10-21)

> **LEDGER BATCH** · DOCS-GEN2 **D4b** · Status: **beku setelah D4b** · Dasar: keputusan owner **a** (21 Okt 2026, pemetaan D4b)
> · Baca kalau: memverifikasi bahwa 9 berkas operations dipindah tanpa kehilangan isi, dan isi normatifnya tetap hidup di 4 berkas aktif.

**Tujuan.** Operations **12 → 4** (README + `produksi.md` + `default-dev.md` + `iot.md`). Sembilan berkas asal dipindah ke arsip; isi yang masih berlaku disalin **per blok** ke berkas aktif. Teks tidak ditulis ulang; hanya heading digeser satu tingkat, diberi header bagian + anchor, dan daftar isi ditambahkan.

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas dipindah ke arsip | **9** |
| Total byte asal | 188.937 |
| Isi asal identik setelah banner (SHA body) | **9/9** |
| Berkas aktif operations | **4** (README + 3 isi) |

## 2. Berkas yang dipindah

| Berkas (arsip) | Isi ke | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Keterangan |
|---|---|---:|---:|---|---|---|
| [akses-ssh.md](../arsip/akses-ssh.md) | `operations/produksi.md` | 6097 → 6288 | 80 → 81 | `b4ff917465a38d7f858e6ee37b388a6e25b544209ed818a728e90887dad1e48d` | `02322bd036e7bdb341d1875d5978b59f9a93e0ad00db99f07c172b8e14b92fd6` | produksi Bagian A — Akses server |
| [backup-restore.md](../arsip/backup-restore.md) | `operations/produksi.md` | 4727 → 4918 | 57 → 58 | `ac3e2a1b221abda03e6f05bc622f1b462b90a51097158bcfa378f33f08f3af9c` | `36ee8d95c6d7a1187c6e3d682adf16cd45be54e1466ed5cb704e2c086942d8cf` | produksi Bagian B — Backup & restore |
| [data-master.md](../arsip/data-master.md) | `operations/default-dev.md` | 20313 → 20504 | 183 → 184 | `179831e10d44ab9d685c1c04e775b51830faed1d70069fe3967fd96e2590ee8a` | `d24003ff45921654356e6ead753f163c6498e63a34f9115b5261e8212373fcf4` | default-dev Bagian G — Data master |
| [deploy-go-live.md](../arsip/deploy-go-live.md) | — | 35570 → 35761 | 344 → 345 | `3d10d006f13870e26a01ed49d4aac5d8a8d80b80683e64dd90597e0123f8074b` | `b50de43477931f7ad5d96bf1cf2db57fa23fc15d60c9b8264afdf8f8e2a4bdf4` | arsip — historis; digantikan produksi §6 + cPanel |
| [efisiensi-hosting.md](../arsip/efisiensi-hosting.md) | `operations/produksi.md` | 39807 → 39998 | 217 → 218 | `22ef1cf202e17112cd903136621a1fd756b454d9b99376f4abf494faf6a5dccb` | `1a208cadd6d2cbf4f11fda8f8935ddb58caf69326b1289a4d06a16ca4dd0c047` | produksi Bagian E — Kapasitas RAM (§11) |
| [go-live-cpanel.md](../arsip/go-live-cpanel.md) | `operations/produksi.md` | 29528 → 29719 | 316 → 317 | `de7230a7343e808faa19b839d14ff9b8c7e9d24dced8d5f59218033cf20bda0f` | `7aca780ddbbb2fddbee8528027c8a6be82c9e4e5e1be8b5c85a09175037b6596` | produksi Bagian C/D — cPanel + gate KTP |
| [iot-tuya-setup.md](../arsip/iot-tuya-setup.md) | `operations/iot.md` | 21520 → 21711 | 447 → 448 | `f274bea43b680ba8ce35162dd5ebdcfe6345e131daa964184e5ee5541bef70a6` | `b46d1397bb33b09e7e7734468441976713a08d026c0b5205920b80922efd1240` | iot Bagian A — Tuya KWH |
| [iot-water-meter-esp32.md](../arsip/iot-water-meter-esp32.md) | `operations/iot.md` | 21126 → 21317 | 409 → 410 | `75fc9f84b6300d3aaa6b57d57dc3d65de4be0f645bce5c906d81bf76bdd8af5a` | `4bc4d87b98056405edccea25b86eb59acb5c1cd50dde53879a76b35724e1d3c9` | iot Bagian B — Water meter ESP32 |
| [verifikasi-keuangan.md](../arsip/verifikasi-keuangan.md) | `operations/produksi.md` | 10249 → 10440 | 106 → 107 | `6b0c8213b63a2836de4f03473c91ab311def536b92b27554d61289b5d07ec039` | `6ed6feef7fc901ae1f8db1216f4568c360e38ecf43abc14244a5e26c56f354b8` | produksi Bagian F — Verifikasi uang |

## 3. Berkas target

| Berkas aktif | Byte sebelum → sesudah | Baris non-kosong | SHA-256 sesudah |
|---|---:|---:|---|
| `operations/produksi.md` | 37942 → 74301 | 480 → 930 | `9597be3cade7b5022647ae2f3ebb31a33ef5ba6fcb0fde98aa39658431772999` |
| `operations/default-dev.md` | 29192 → 49888 | 218 → 410 | `aecfd4323e7c031380136b90eb95604c1068cfc744b4de778ff744b88f94d8b6` |
| `operations/iot.md` | 0 → 43279 | 0 → 864 | `b7372798d26ae49bae8c79d9b691b1fa6de3866f05eedd3e9d6cad056d990565` |

## 4. Cara memeriksa

1. Untuk 9 berkas arsip: buang satu baris banner + satu baris kosong; SHA-256 sisa isi harus sama dengan kolom **sebelum** (kolom `bodyIdentik` = true).
2. Untuk isi yang disalin: blok sumber ada di berkas aktif dengan heading digeser +1; tidak ada baris isi yang dihapus. Jumlah baris non-kosong target naik karena header bagian/anchor/TOC, bukan karena isi baru.
3. Tautan aktif yang menunjuk 9 berkas lama sudah diarahkan ke berkas aktif + anchor bagian; gate `check-docs` R2/R6 = 0.

**Batas:** `deploy-go-live.md` **tidak** disalin ke berkas aktif — isinya runbook VPS/legacy 2026-06 + 2026-07-23 yang bertentangan dengan shared hosting dan sudah digantikan `produksi.md` §6 + setup cPanel. `efisiensi-hosting.md` hanya §11 yang disalin (aturan kapasitas); audit/rencana EF lainnya tetap di arsip. `go-live-cpanel.md` hanya Appendix B + F.1 yang disalin; status historis/forms tetap di arsip.

## 5. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat: 9 berkas dipindah, 3 target diperluas; 9/9 isi arsip identik setelah banner. |
