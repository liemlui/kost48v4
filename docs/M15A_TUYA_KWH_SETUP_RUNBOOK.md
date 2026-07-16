# M15A - Runbook Koneksi Tuya KWH Meter

> Status: **PRE-IMPLEMENTATION RUNBOOK**
> Tanggal: 2026-07-16
> Master plan: `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md`
> Inventaris perangkat: `M14_IOT_TUYA_DEVICES.md`

## 1. Tujuan runbook

Runbook ini dipakai untuk membuktikan bahwa backend KOST48 dapat membaca total kWh meter Tuya secara aman dan konsisten. Hasil fase ini adalah konektivitas, mapping Data Point (DP), dan data uji tersanitasi. Belum ada auto-billing atau perintah ON/OFF relay.

## 2. Prinsip keselamatan

- Integrasi fase awal **read-only**.
- Jangan mengirim command relay dari backend, Postman, atau Tuya API Explorer.
- Jangan pernah menyalin Access Secret, access token, atau `local_key` ke dokumentasi, issue, screenshot, log, atau fixture test.
- Device ID boleh disimpan di database/backend, tetapi tidak perlu dikirim ke frontend publik.
- Gunakan project dan akun Tuya milik KOST48, bukan akun personal developer sementara.
- Uji satu meter lebih dahulu sebelum batch seluruh kamar.

## 3. Checklist Tuya Developer Platform

Di Tuya Developer Platform:

- [ ] Cloud project yang benar sudah dipilih.
- [ ] Development Method (`Smart Home` atau `Custom`) tercatat.
- [ ] Data Center project tercatat persis seperti yang tampil di console.
- [ ] Authorization Key memiliki Access ID/Client ID dan Access Secret/Client Secret aktif.
- [ ] Service plan/API yang dibutuhkan masih aktif.
- [ ] Minimal layanan device/basic IoT dan authorization tersedia.
- [ ] Akun aplikasi Tuya/Smart Life yang memiliki perangkat sudah di-link ke project jika memakai Smart Home.
- [ ] `Devices > All Devices` menampilkan meter yang sama dengan inventaris `M14`.
- [ ] Device online dapat dibuka dengan fitur Debug Device.
- [ ] Tidak ada device lama/duplikat yang akan ikut dipolling.

Catat metadata tanpa secret:

```text
Project name        :
Project type        :
Data center         :
App account linked  : yes/no
Service expiry      :
Verified by         :
Verified at         :
```

## 4. Verifikasi data center

Endpoint resmi saat ini:

| Data center | Base URL |
|---|---|
| Western America | `https://openapi.tuyaus.com` |
| Eastern America | `https://openapi-ueaz.tuyaus.com` |
| Central Europe | `https://openapi.tuyaeu.com` |
| Western Europe | `https://openapi-weaz.tuyaeu.com` |
| India | `https://openapi.tuyain.com` |
| Singapore | `https://openapi-sg.iotbing.com` |
| China | `https://openapi.tuyacn.com` |

Kondisi repo saat runbook dibuat:

```dotenv
TUYA_API_BASE=https://openapi.tuyaus.com
```

Indonesia dipetakan ke Singapore untuk app account baru sejak 3 Juni 2025, tetapi akun yang lebih lama dapat tetap berada di Western America. Ikuti data center project dan hasil live test. Jangan mengganti endpoint hanya berdasarkan alamat properti.

Definition of verified region:

1. token berhasil diperoleh;
2. `GET /v1.0/devices/{known_online_device_id}` sukses;
3. respons nama/product ID sesuai device di console;
4. `GET .../status` mengembalikan DP yang masuk akal.

Jika token sukses tetapi device `permission deny`, periksa link akun/project, service authorization, device ID, dan endpoint sebelum mengubah kode signature.

## 5. Environment backend

Gunakan nama environment yang sudah ada agar perubahan awal minimal:

```dotenv
# Access ID / Client ID
TUYA_ACCESS_KEY=

# Access Secret / Client Secret
TUYA_SECRET_KEY=

# Metadata project; opsional bila endpoint yang dipakai tidak membutuhkannya
TUYA_PROJECT_CODE=

# Harus sesuai data center project
TUYA_API_BASE=https://openapi.tuyaus.com

# Feature flag dan jadwal aplikasi KOST48
IOT_ENABLED=false
IOT_TUYA_POLL_ENABLED=false
IOT_TUYA_POLL_MINUTES=10
```

Aturan:

- nilai nyata hanya berada di secret manager atau `.env` server yang gitignored;
- `.env.production.example` hanya berisi placeholder;
- startup production gagal dengan pesan aman bila feature flag ON tetapi credential kosong;
- error startup tidak boleh mencetak nilai credential;
- Access Secret tidak boleh tersedia melalui endpoint settings aplikasi.

## 6. Request signing yang harus diimplementasikan

Tuya Cloud API memakai HMAC-SHA256. Implementasi wajib mengikuti dokumentasi Tuya terbaru karena canonical string token request berbeda dari business request.

Komponen service:

```text
TuyaSignatureService
  - sha256Body(rawBody)
  - buildStringToSign(method, pathWithQuery, bodyHash, signedHeaders)
  - signTokenRequest(clientId, timestamp, nonce, stringToSign)
  - signBusinessRequest(clientId, accessToken, timestamp, nonce, stringToSign)

TuyaTokenCacheService
  - getValidToken()
  - refresh before expiry
  - collapse concurrent refresh into one request
  - clear token after auth failure
```

Header minimum mengikuti API Tuya:

```text
client_id
sign
sign_method: HMAC-SHA256
t: 13-digit Unix timestamp in milliseconds
access_token: required for business API, omitted for token API
nonce: recommended
```

Test wajib:

- known fixture menghasilkan signature identik;
- query parameter disortir/dikanonisasi sesuai spesifikasi;
- body kosong memakai hash SHA-256 body kosong yang benar;
- access token hanya masuk formula business request;
- jam server meleset menghasilkan error operasional yang mudah dikenali;
- concurrent polling tidak meminta banyak token sekaligus.

Prefer official SDK bila kompatibel dan terpelihara. Jika signature dibuat sendiri, fixture sanitasi dari Tuya API Explorer/Postman harus menjadi regression test.

## 7. Urutan connectivity spike

Jalankan dengan satu device online, misalnya salah satu meter kamar yang telah diverifikasi di `M14`.

### Step 1 - Token

```http
GET {TUYA_API_BASE}/v1.0/token?grant_type=1
```

Simpan di memory:

- `access_token`;
- `expire_time`;
- waktu refresh aman, misalnya 60 detik sebelum expiry.

Jangan simpan token ke database atau log aplikasi.

### Step 2 - Device detail

```http
GET {TUYA_API_BASE}/v1.0/devices/{device_id}
```

Validasi:

- `id` sama dengan device yang diminta;
- `name` sesuai console;
- `online` masuk akal;
- `product_id` dicatat untuk pemilihan adapter;
- jangan menyimpan/menampilkan `local_key` jika field tersebut muncul.

### Step 3 - Device status

```http
GET {TUYA_API_BASE}/v1.0/devices/{device_id}/status
```

Simpan fixture tersanitasi per product ID:

```json
{
  "deviceId": "REDACTED_DEVICE_ID",
  "productId": "example-product-id",
  "capturedAt": "2026-07-16T10:00:00+07:00",
  "status": [
    { "code": "example_energy_dp", "value": 12345 },
    { "code": "example_power_dp", "value": 321 }
  ]
}
```

Fixture tidak boleh memuat Access ID, secret, access token, IP publik device, koordinat, UUID, atau local key.

### Step 4 - Instruction/status metadata

Gunakan Debug Device/API metadata untuk menentukan:

- nama DP;
- tipe nilai;
- `scale`;
- unit;
- min/max;
- apakah energy total dapat reset;
- kapan device memperbarui nilai.

Jangan menyimpulkan skala hanya dari besar angka. Contoh nilai `12345` bisa berarti 123.45, 12.345, atau 12345 tergantung metadata produk.

## 8. Lembar mapping DP

Isi satu tabel per `productId`, bukan hanya per nama device.

| Product ID | DP code aktual | Makna | Raw type | Scale | Unit raw | Metric kanonik | Verified |
|---|---|---|---|---:|---|---|---|
| TBD | TBD | Total energi | Integer | TBD | TBD | `electricity.energy_total_kwh` | [ ] |
| TBD | TBD | Daya aktif | Integer | TBD | TBD | `electricity.power_w` | [ ] |
| TBD | TBD | Tegangan | Integer | TBD | TBD | `electricity.voltage_v` | [ ] |
| TBD | TBD | Arus | Integer | TBD | TBD | `electricity.current_a` | [ ] |

Candidate DP yang sering ditemui seperti `add_ele`, `cur_power`, `cur_voltage`, dan `cur_current` bukan kontrak universal. Adapter harus menolak product ID yang belum memiliki mapping tervalidasi.

Contoh konfigurasi adapter yang disarankan:

```json
{
  "productId": "actual-product-id",
  "metrics": {
    "electricity.energy_total_kwh": {
      "dpCode": "actual_dp_code",
      "scale": 2,
      "unit": "kWh",
      "cumulative": true
    }
  }
}
```

Nilai normalisasi:

```text
normalized = rawValue / (10 ^ scale)
```

Formula hanya dipakai jika metadata menyatakan integer berskala. Bila API sudah memberi nilai desimal/structured value, adapter mengikuti tipe aktual.

## 9. Device mapping dan commissioning

Sumber mapping awal ada di `M14`, tetapi database menjadi sumber runtime.

Setiap `IotDevice` harus memiliki:

| Field | Contoh | Wajib |
|---|---|---|
| `deviceCode` | `kwh-room-a-01` | ya |
| `provider` | `TUYA` | ya |
| `deviceType` | `ELECTRICITY_METER` | ya |
| `externalDeviceId` | Tuya device ID | ya |
| `productId` | hasil device detail | ya |
| `roomId` | mapping backend | ya sebelum pilot |
| `metadata.installationLabel` | label fisik panel | ya |
| `metadata.retiredAt` | device lama | bila retired |

Commissioning dua-orang untuk mencegah salah kamar:

1. teknisi berdiri di panel/kamar target;
2. operator membuka device pada Tuya console;
3. cocokkan label dan perubahan daya yang aman;
4. catat foto label/serial secara internal;
5. reviewer kedua menyetujui mapping;
6. device lama ditandai disabled/retired, tidak dihapus dari histori.

## 10. Algoritma polling

```text
acquire IoT-specific advisory lock
load enabled TUYA electricity meters
get one valid Tuya access token

for each device with bounded concurrency:
  fetch device status
  resolve adapter by productId
  normalize known metrics
  validate cumulative energy monotonicity
  insert idempotent telemetry
  update lastSeenAt / lastSuccessfulSyncAt
  record per-device error without aborting batch

release lock
publish summarized health result
```

Rekomendasi:

- concurrency awal 2-3 request;
- timeout 8-10 detik per request;
- satu retry hanya untuk network/5xx, lalu backoff di batch berikutnya;
- 4xx auth memicu satu token refresh terkoordinasi;
- jangan retry `permission deny` berulang cepat;
- masukkan jitter agar semua instance tidak polling pada detik yang sama;
- unique key telemetri harus membuat rerun batch aman.

## 11. Quality rules

| Kondisi | Quality | Tindakan |
|---|---|---|
| DP dikenal, skala valid, angka monotonic | `GOOD` | Simpan dan boleh ikut rollup |
| Device offline/stale | tidak membuat reading nol | Update health state |
| Product ID belum dimapping | `REJECTED` | Alert konfigurasi |
| Energy total turun | `SUSPECT` | Blok billing candidate |
| Nilai di luar metadata min/max | `REJECTED` | Simpan alasan dan raw tersanitasi |
| Timestamp respons lebih lama dari batas | `SUSPECT` | Jangan jadikan kandidat |
| DP penting hilang | `SUSPECT` | Alert jika berulang |

Reset atau penggantian meter harus menjadi event operasional eksplisit dengan baseline baru, foto, actor, waktu, dan alasan. Jangan mengoreksi counter otomatis dengan menambah offset tersembunyi.

## 12. Observability

Log terstruktur tanpa secret:

```json
{
  "event": "tuya_poll_device",
  "deviceCode": "kwh-room-a-01",
  "provider": "TUYA",
  "success": true,
  "durationMs": 342,
  "metricsAccepted": 4,
  "metricsSuspect": 0
}
```

Metrics minimum:

- batch success/failure count;
- per-device last successful sync;
- Tuya latency p50/p95;
- token refresh failure;
- unknown DP/product count;
- counter rollback count;
- duplicate telemetry count;
- consecutive offline duration.

Alert secret-safe harus menyebut `deviceCode` dan kamar, bukan Access ID/token.

## 13. Test matrix sebelum pilot

| Skenario | Expected result |
|---|---|
| Credential benar, region benar | token dan status sukses |
| Region salah | error jelas, tidak mencoba semua region otomatis |
| Secret salah | auth gagal tanpa secret di log |
| Device tidak ter-link | permission error ditandai configuration issue |
| Device offline | health offline, tidak membuat nilai 0 |
| Device lama D dinonaktifkan | tidak ikut polling |
| F1/F2 offline | batch meter lain tetap sukses |
| Unknown product/DP | data diblok dari normalization |
| Duplicate poll | tidak ada row ganda |
| Token expiry | refresh sekali dan polling lanjut |
| Tuya timeout | retry terbatas dan batch berikutnya backoff |
| Counter turun | quality `SUSPECT`, tidak masuk kandidat billing |

## 14. Go/no-go Tuya pilot

Go bila:

- [ ] endpoint region terbukti;
- [ ] token cache dan signature lulus test;
- [ ] minimal tiga meter dari product variants berbeda berhasil dibaca;
- [ ] DP total kWh dan scale tervalidasi;
- [ ] mapping kamar direview dua orang;
- [ ] tidak ada command permission pada service account atau kode integrasi bersifat read-only;
- [ ] feature flag dan rollback tersedia;
- [ ] data polling tidak masuk langsung ke `MeterReading`.

No-go bila salah satu hal berikut terjadi:

- data center masih ambigu;
- total kWh tidak dapat dibedakan dari konsumsi periodik;
- DP berubah antar device dengan product ID sama tanpa adapter yang aman;
- device ID/kamar belum dapat dipastikan;
- service plan Tuya tidak aktif/stabil;
- credential muncul dalam log atau response aplikasi.

## 15. Referensi resmi

- [Tuya cloud project dan linking account](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx)
- [Tuya request structure dan endpoint](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4)
- [Tuya cloud authorization signing](https://developer.tuya.com/en/docs/iot/new-singnature?id=Kbw0q34cs2e5g)
- [Tuya device management API](https://developer.tuya.com/en/docs/cloud/device-management?id=K9g6rfntdz78a)
- [Tuya data center mapping](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb)
- [Tuya Message Service](https://developer.tuya.com/en/docs/iot/manage-messages?id=Ka49p7loog3ze)
