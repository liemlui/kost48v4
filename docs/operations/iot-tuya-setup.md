# IoT — Runbook Setup Tuya KWH

Tanggal: 2026-09-23
Status: runbook (pre-implementation); bukan izin eksekusi
Tujuan: prosedur setup dan verifikasi Tuya KWH — credential, data center, environment, request signing, connectivity spike, mapping device, algoritma polling, quality rules, observability, test matrix, dan gate go/no-go
Rujukan: [iot.md](../domain/iot.md) · [IoT (pointer)](../domain/iot.md) · [operasional.md](../domain/operasional.md) · [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)

> Migrasi dari docs/M15_IOT.md Part C (B8 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks tidak diubah.
> Prosedur ini tidak memberi izin eksekusi: kredensial, cron, dan pilot Tuya tetap memerlukan keputusan/izin owner.

## Part C — Runbook Setup Tuya KWH


> Status: **PRE-IMPLEMENTATION RUNBOOK**
> Tanggal: 2026-07-16
> Master plan: `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md`
> Inventaris perangkat: `M14_IOT_TUYA_DEVICES.md`

#### 1. Tujuan runbook

Runbook ini dipakai untuk membuktikan bahwa backend KOST48 dapat membaca total kWh meter Tuya secara aman dan konsisten. Hasil fase ini adalah konektivitas, mapping Data Point (DP), dan data uji tersanitasi. Belum ada auto-billing atau perintah ON/OFF relay.

#### 2. Prinsip keselamatan

- Integrasi fase awal **read-only**.
- Jangan mengirim command relay dari backend, Postman, atau Tuya API Explorer.
- Jangan pernah menyalin Access Secret, access token, atau `local_key` ke dokumentasi, issue, screenshot, log, atau fixture test.
- Device ID boleh disimpan di database/backend, tetapi tidak perlu dikirim ke frontend publik.
- Gunakan project dan akun Tuya milik KOST48, bukan akun personal developer sementara.
- Uji satu meter lebih dahulu sebelum batch seluruh kamar.

#### 3. Checklist Tuya Developer Platform

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

#### 4. Verifikasi data center

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

#### 5. Environment backend

Gunakan nama environment yang sudah ada agar perubahan awal minimal:

```dotenv
##### Access ID / Client ID
TUYA_ACCESS_KEY=

##### Access Secret / Client Secret
TUYA_SECRET_KEY=

##### Metadata project; opsional bila endpoint yang dipakai tidak membutuhkannya
TUYA_PROJECT_CODE=

##### Harus sesuai data center project
TUYA_API_BASE=https://openapi.tuyaus.com

##### Scheduler internal harus OFF pada Passenger; polling dilakukan cron HTTP.
IOT_TUYA_POLL_ENABLED=false
IOT_TUYA_POLL_MINUTES=10
IOT_TUYA_CRON_TOKEN=<random-panjang>
```

Aturan:

- nilai nyata hanya berada di secret manager atau `.env` server yang gitignored;
- `.env.production.example` hanya berisi placeholder;
- `IOT_TUYA_POLL_ENABLED` hanya mengatur timer internal, bukan seluruh modul/route IoT;
- error startup tidak boleh mencetak nilai credential;
- Access Secret tidak boleh tersedia melalui endpoint settings aplikasi.

#### 6. Request signing yang harus diimplementasikan

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

#### 7. Urutan connectivity spike

Jalankan dengan satu device online, misalnya salah satu meter kamar yang telah diverifikasi di `M14`.

##### Step 1 - Token

```http
GET {TUYA_API_BASE}/v1.0/token?grant_type=1
```

Simpan di memory:

- `access_token`;
- `expire_time`;
- waktu refresh aman, misalnya 60 detik sebelum expiry.

Jangan simpan token ke database atau log aplikasi.

##### Step 2 - Device detail

```http
GET {TUYA_API_BASE}/v1.0/devices/{device_id}
```

Validasi:

- `id` sama dengan device yang diminta;
- `name` sesuai console;
- `online` masuk akal;
- `product_id` dicatat untuk pemilihan adapter;
- jangan menyimpan/menampilkan `local_key` jika field tersebut muncul.

##### Step 3 - Device status

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

##### Step 4 - Instruction/status metadata

Gunakan Debug Device/API metadata untuk menentukan:

- nama DP;
- tipe nilai;
- `scale`;
- unit;
- min/max;
- apakah energy total dapat reset;
- kapan device memperbarui nilai.

Jangan menyimpulkan skala hanya dari besar angka. Contoh nilai `12345` bisa berarti 123.45, 12.345, atau 12345 tergantung metadata produk.

#### 8. Lembar mapping DP

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

#### 9. Device mapping dan commissioning

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

#### 10. Algoritma polling

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

#### 11. Quality rules

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

#### 12. Observability

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

#### 13. Test matrix sebelum pilot

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

#### 14. Go/no-go Tuya pilot

Go bila:

- [ ] endpoint region terbukti;
- [ ] token cache dan signature lulus test;
- [ ] minimal tiga meter dari product variants berbeda berhasil dibaca;
- [ ] DP total kWh dan scale tervalidasi;
- [ ] mapping kamar direview dua orang;
- [ ] tidak ada command permission pada service account atau kode integrasi bersifat read-only;
- [ ] prosedur kill/rollback nyata tersedia: hentikan cron, biarkan timer internal OFF, disable perangkat bila perlu, dan gunakan bundle LKG yang sudah bebas SSE;
- [ ] data polling tidak masuk langsung ke `MeterReading`.

No-go bila salah satu hal berikut terjadi:

- data center masih ambigu;
- total kWh tidak dapat dibedakan dari konsumsi periodik;
- DP berubah antar device dengan product ID sama tanpa adapter yang aman;
- device ID/kamar belum dapat dipastikan;
- service plan Tuya tidak aktif/stabil;
- credential muncul dalam log atau response aplikasi.

#### 15. Referensi resmi

- [Tuya cloud project dan linking account](https://developer.tuya.com/en/docs/iot/Platform_Configuration_smarthome?id=Kamcgamwoevrx)
- [Tuya request structure dan endpoint](https://developer.tuya.com/en/docs/iot/api-request?id=Ka4a8uuo1j4t4)
- [Tuya cloud authorization signing](https://developer.tuya.com/en/docs/iot/new-singnature?id=Kbw0q34cs2e5g)
- [Tuya device management API](https://developer.tuya.com/en/docs/cloud/device-management?id=K9g6rfntdz78a)
- [Tuya data center mapping](https://developer.tuya.com/en/docs/iot/oem-app-data-center-distributed?id=Kafi0ku9l07qb)
- [Tuya Message Service](https://developer.tuya.com/en/docs/iot/manage-messages?id=Ka49p7loog3ze)

---

**Digabung dari docs/operations/iot-handoff.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

# IoT — Handoff Backend & Frontend

Tanggal: 2026-09-23
Status: handoff operasional (fondasi terimplementasi; rollout perangkat dan UAT masih gate)
Tujuan: petunjuk deploy/handoff fondasi Tuya KWH + water flow ESP32 — yang sudah siap, environment, build & aktivasi, API backoffice, kontrak ingest, metric canonical, isolasi billing, dan langkah fase berikutnya
Rujukan: [iot.md](../domain/iot.md) · [iot-tuya-setup.md](iot-tuya-setup.md) · [iot-water-meter-esp32.md](iot-water-meter-esp32.md) · [IoT (pointer)](../domain/iot.md)

> Migrasi dari docs/M15_IOT.md Part E (B8 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks tidak diubah, kecuali § 8 (hasil verifikasi 2026-07-16) yang dipisah sebagai riwayat bertanggal ke [history/changelog/2026-07.md](../arsip/changelog-2026-07.md).

## Part E — Handoff Backend & Frontend


Status: **implemented and verified locally — 2026-07-16**

Dokumen ini adalah petunjuk deploy untuk fondasi Tuya KWH dan ESP32-C3 water flow. Detail hardware dan kalibrasi sensor air tetap di `M15B_ESP32_C3_WATER_METER_SPEC.md`.

#### 1. Yang sudah siap

- Registry generik `IotDevice` untuk Tuya dan KOST48 ESP32.
- Envelope idempoten `IotIngestMessage` dan nilai normalisasi `IotTelemetry`.
- Tuya OpenAPI HMAC-SHA256, token cache, region allowlist, read-only detail/status/specification.
- Normalisasi scale Tuya untuk total kWh, arus, daya, dan tegangan.
- Mapping 13 meter KWH aktif ke kamar A, B, C, D, G, H, I, J, K, L, M, F1, F2.
- Endpoint signed HTTPS untuk water telemetry ESP32.
- AES-256-GCM vault untuk device secret ESP32.
- Dashboard `/iot` untuk OWNER/ADMIN: status online/offline, nilai terakhir, filter, mapping kamar, sync, provisioning.
- Audit log untuk pendaftaran/perubahan perangkat, sync Tuya, dan rotasi secret.
- Tidak ada relay/control command Tuya.
- Telemetry IoT terpisah dari `MeterReading`, invoice, dan jurnal.

#### 2. Environment backend

```dotenv
TUYA_ACCESS_KEY=<Tuya Access ID / Client ID>
TUYA_SECRET_KEY=<Tuya Access Secret / Client Secret>
TUYA_API_BASE=https://openapi.tuyaus.com

##### 32 random bytes base64 atau 64 hex; jangan pernah masuk repository.
IOT_MASTER_KEY=<random-secret>
IOT_STALE_AFTER_MINUTES=30
IOT_TUYA_POLL_ENABLED=false
IOT_TUYA_CRON_TOKEN=<random-panjang>
```

Generate master key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`IOT_MASTER_KEY` harus dibackup ke password manager. Jika key hilang, secret ESP32 yang sudah terenkripsi tidak dapat dipulihkan dan harus dirotasi.

#### 3. Build lokal dan aktivasi bundle cPanel

Build hanya dilakukan di workstation melalui root project:

```bash
npm run make-deploy
```

Di cPanel jangan menjalankan `npm ci`, build, Prisma generate, atau `db push`.
Setelah schema dan 13 kamar produksi tersedia, bootstrap registry secara idempoten:

```bash
node scripts/bootstrap-tuya-kwh.js --sync
```

Unit Tuya lama kamar D sengaja tidak diimpor. Untuk polling production Passenger,
pasang tepat satu cron HTTP per environment:

```cron
*/10 * * * * curl -fsS -X POST -H "X-Iot-Cron-Token: <TOKEN>" https://<domain>/api/iot/tuya/cron >/dev/null 2>&1
```

Jangan membuka Nest application context baru dari npm/CLI setiap 10 menit. Endpoint
HTTP memakai lock PostgreSQL per perangkat sehingga trigger lintas worker tidak
menggandakan request Tuya untuk device yang sama.

#### 4. API backoffice

Semua endpoint berikut membutuhkan JWT OWNER/ADMIN, kecuali rotasi secret yang OWNER-only.

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/iot/overview` | konfigurasi aman, KPI, registry, telemetry terakhir |
| `GET` | `/api/iot/devices` | daftar perangkat/filter provider/type/kamar |
| `POST` | `/api/iot/devices` | daftarkan Tuya/ESP32 |
| `PATCH` | `/api/iot/devices/:id` | mapping kamar, nama, enable/disable |
| `POST` | `/api/iot/tuya/probe` | uji Tuya read-only tanpa menyimpan |
| `POST` | `/api/iot/tuya/sync-all` | polling seluruh Tuya aktif |
| `POST` | `/api/iot/devices/:id/sync` | polling satu Tuya |
| `GET` | `/api/iot/devices/:id/telemetry` | riwayat telemetry |
| `POST` | `/api/iot/devices/:id/rotate-secret` | provision/rotasi ESP32 secret; tampil sekali |

Respons API tidak pernah mengembalikan `credentialCiphertext`, Tuya secret, local key, IP, koordinat, atau UUID internal Tuya.

#### 5. Kontrak ingest ESP32 water flow

Endpoint publik-perangkat:

```http
POST /api/iot/v1/readings
Content-Type: application/json
X-Device-Id: water-kamar-a
X-Timestamp: 1784217600
X-Nonce: <unik-minimal-12-karakter>
X-Signature: <hex-hmac-sha256>
```

Payload minimal:

```json
{
  "observedAt": "2026-07-16T12:00:00.000Z",
  "sequence": 1048,
  "pulseTotal": 81234,
  "volumeTotalLiters": 16246.8,
  "flowRateLpm": 3.4,
  "rssiDbm": -61,
  "firmwareVersion": "water-c3-0.1.0"
}
```

Canonical signature:

```text
bodyHash = lowercase_hex(SHA256(raw_request_body_bytes))
canonical = deviceId + "\n" + timestamp + "\n" + nonce + "\n" + bodyHash
signature = lowercase_hex(HMAC_SHA256(deviceSecret, canonical))
```

Aturan backend:

- timestamp maksimal berbeda 5 menit dari server;
- nonce unik per perangkat dan menjadi idempotency key;
- retry dengan nonce/body sama mengembalikan `duplicate: true`;
- volume yang turun tanpa `counterReset: true` ditandai `SUSPECT`;
- `roomId`, tarif, invoice, dan tenant dari payload ditolak oleh validation whitelist;
- rate limit lokal 180 request/menit/IP; multi-replica production perlu Redis/API gateway.

#### 6. Metric canonical

| Metric | Unit | Sumber |
|---|---|---|
| `electricity.energy_total_kwh` | kWh | Tuya `add_ele` / forward energy |
| `electricity.power_w` | W | Tuya `cur_power` |
| `electricity.voltage_v` | V | Tuya `cur_voltage` |
| `electricity.current_a` | A | Tuya `cur_current` |
| `water.volume_total_m3` | m3 | liter kumulatif ESP32 / 1000 |
| `water.flow_rate_lpm` | L/min | ESP32 |
| `water.pulse_total` | pulse | ESP32 |
| `wifi.rssi_dbm` | dBm | ESP32 |

Datapoint Tuya yang belum dikenal tetap disimpan sebagai `tuya.<code>`. Nilai numerik tanpa `scale` specification ditandai `SUSPECT`, bukan dianggap final.

#### 7. Billing isolation

```text
Tuya / ESP32
    -> IotIngestMessage
    -> IotTelemetry (GOOD / SUSPECT / REJECTED)
    -> review / shadow comparison (fase berikutnya)
    -> MeterReading resmi
    -> invoice draft
```

Implementasi saat ini berhenti di `IotTelemetry`. Tidak ada kode yang membuat `MeterReading`, `InvoiceLine`, invoice, pembayaran, atau jurnal dari ingest/sync IoT.

#### 9. Langkah fase berikutnya

1. Isi dan backup `IOT_MASTER_KEY` di setiap environment.
2. Pasang satu cron Tuya 10 menit di production.
3. Rakit satu prototype ESP32-C3 + D20 dan provision melalui dashboard OWNER.
4. Kalibrasi pulse/liter dengan wadah ukur; simpan faktor kalibrasi per perangkat.
5. Jalankan shadow billing minimal dua siklus tagihan sebelum membuat alur promosi telemetry ke `MeterReading`.
6. Tambahkan alarm kebocoran hanya setelah baseline malam dan pola hunian cukup stabil.
