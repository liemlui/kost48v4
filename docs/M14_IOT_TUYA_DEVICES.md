# M14 — INVENTARIS PERANGKAT TUYA IOT KOST48

> **Sumber:** Tuya IoT Console — ekspor 2026-07-10  
> **Total perangkat:** 27 (17 Online, 10 Offline)  
> **Terkait:** memory `iot-water-kwh-spec` (ESP32 water flow) · `M06_OPERASIONAL.md` · `M10_PETA_SCOPE.md`

---

## A. Ringkasan

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

## B. KWH Meter — Per Kamar

**Produk:** WIFI 智能计量开关 (Smart Metering Switch WiFi)  
**Integrasi:** Tuya Cloud API → backend polling cron tiap 10 menit (lihat `iot-water-kwh-spec`)  
**Fungsi:** baca kWh real-time per kamar untuk billing listrik bulanan

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

### Catatan KWH

- **11 kamar online** (A, B, C, D, G, H, I, J, K, L, M) — siap di-polling via Tuya API
- **F1 & F2 offline** — perlu dicek fisik (mungkin mati daya / rusak), kedua device di lantai F
- **KWH Kamar D** adalah unit lama (2025-06-30) — sudah diganti `KWH Kmr D` (2025-12-20), abaikan saat integrasi
- **Naming inconsistency:** `KWH Kmr K` vs `KWH Kamar L` vs `Kamar M` — bersihkan saat mapping ke database (gunakan Room.code: A/B/C/D/.../M)

---

## C. CCTV — BARDI IP Camera

**Produk:** BARDI IP Camera Static Outdoor  
**Fungsi:** keamanan 24/7, bisa diintegrasikan ke dashboard owner nanti (live view / snapshot)

| # | Device Name | Device ID | Status | Activated | Posisi |
|---|---|---|---|---|---|
| 1 | CCTV depan Jalan | `eb54211162106e4c5fvkoc` | ✅ Online | 2026-01-13 | Depan jalan (pintu gerbang) |
| 2 | CCTV Depan Hadap Rumah | `eb277da893cc2ddc6eoytp` | ✅ Online | 2026-01-13 | Depan hadap rumah |
| 3 | CCTV Dpn Kamar E | `eb7aa5dc361c36ac6dgfvw` | ✅ Online | 2025-06-30 | Depan kamar E |
| 4 | Kamera Belakang Kmr Mandi | `eb2617383fbef1393d6b7s` | ✅ Online | 2025-12-04 | Belakang kamar mandi |
| 5 | CCTV Belakang Lorong | `eb53d03570c2fe2669aj8i` | ⚠️ Offline | 2025-06-30 | Belakang lorong |

### Catatan CCTV

- 4 dari 5 kamera online — cakupan depan (jalan, rumah), samping (kamar E), belakang (kamar mandi)
- CCTV Belakang Lorong offline sejak 2025-06-30 — perlu dicek
- **Belum prioritas integrasi** — simpan sebagai referensi untuk fase lanjutan

---

## D. Perangkat Lain

### AC / 空调 (3 device — semua offline)

| Device Name | Device ID | Activated | Catatan |
|---|---|---|---|
| Air | `ebaaf37c4b32a834e869cx` | 2025-12-27 | Mungkin AC kamar, offline |
| Air Conditioning 4 | `eb9eda6e21d7229255gnx7` | 2025-12-27 | Mungkin AC kamar, offline |
| Daikin Rumah Sememi | `ebd3001bee98f90304omea` | 2025-12-20 | AC rumah owner, offline |

> Semua AC offline — tidak perlu diintegrasikan. AC kos dikelola manual / via Smart IR.

### Smart IR Remote (2 device — semua offline)

| Device Name | Device ID | Activated |
|---|---|---|
| Smart IR (万能遥控器WIFI+BLE) | `eb9bbd2f2f913c35a5bswp` | 2025-12-27 |
| Smart IR (佼茂T1 万能遥控器) | `eb32ffe1015cab80dbsohb` | 2025-12-20 |

> Keduanya offline — rencana awal untuk kontrol AC via IR, tapi belum jalan.

### Lain-lain

| Device Name | Device ID | Produk | Status | Activated |
|---|---|---|---|---|
| Smart plug | `ebea186c0c10b05b840lby` | Smart plug | Offline | 2025-12-07 |
| Human Presence Sensor | `ebbe9e52b394d97029yyja` | 000HPS01_5.8G | Offline | 2025-11-28 |
| Smart_Lock | `57514000d8bfc056e66a` | SmartLock | ✅ Online | 2022-02-26 |

> **Smart Lock** online sejak 2022 — potensi integrasi akses pintu otomatis (fase lanjutan).

---

## E. Rencana Integrasi — Prioritas

### Fase 1: KWH Meter (PRIORITAS UTAMA)
- **Target:** 11 KWH meter online (A–M, kecuali F1/F2)
- **Metode:** Tuya Cloud API → polling cron tiap 10 menit → simpan ke `KwhReading`
- **Backend:** `backend/src/modules/iot/` (belum dibuat — lihat memory `iot-water-kwh-spec`)
- **Mapping room:** Device ID → Room.code via table di atas

### Fase 2: Water Flow (ESP32-C3 + D20)
- **Target:** 2-3 unit ESP32-C3 dengan sensor D20 per kamar
- **Metode:** ESP32 → HTTP POST `/api/iot/flow` (JWT device token)
- **Backend:** modul yang sama (`backend/src/modules/iot/`)
- **Tidak terkait Tuya** — water flow via ESP32 terpisah

### Fase 3 (nanti): CCTV + Smart Lock
- CCTV: embed snapshot di dashboard owner (Tuya API screenshot)
- Smart Lock: remote unlock / access log (Tuya API)

### Tidak diintegrasikan
- AC (semua offline) — tidak bisa di-polling
- Smart IR (offline) — tidak berfungsi
- Smart Plug, Human Presence Sensor (offline) — tidak berfungsi

---

## F. Credentials & Konfigurasi

**Tuya IoT Cloud** — credential disimpan di `backend/.env` (gitignored):

| Env Var | Keterangan |
|---|---|
| `TUYA_ACCESS_KEY` | Access ID / Client ID dari Tuya IoT Console |
| `TUYA_SECRET_KEY` | Access Secret / Client Secret |
| `TUYA_PROJECT_CODE` | Project Code dari Tuya IoT Console |
| `TUYA_API_BASE` | `https://openapi.tuyaus.com` (US West, default) |

> ✅ Credentials sudah di-set di `backend/.env`. Template ada di `backend/.env.production.example`.

**Kebutuhan backend (belum dibuat):**
- `IotDevice` model + `KwhReading` model (Prisma)
- `TuyaClientService` — HMAC-SHA256 sign, token cache, polling
- `IotController` — POST endpoint ESP32 + GET readings
- Cron: `KwhPollingSweep` (10 menit) + `LeakDetectionSweep` (water flow)

---

## G. Cross-Reference

| Topik | Dokumen |
|---|---|
| Spek implementasi IoT | memory `iot-water-kwh-spec` |
| Peta scope role | `M10_PETA_SCOPE.md` § IoT & Monitoring |
| Operasional | `M06_OPERASIONAL.md` § IoT Monitoring |
| Auto-ops / cron | `M06_OPERASIONAL.md` § Auto-Ops |
| Default data seed | `M11_DEFAULT_DATA.md` |
| Keamanan JWT device | memory `iot-water-kwh-spec` (beda dari user JWT) |

---

*Dibuat 2026-07-10 dari data Tuya IoT Console.*
