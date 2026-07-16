# M15C — Handoff Backend & Frontend IoT KOST48

Status: **implemented and verified locally — 2026-07-16**

Dokumen ini adalah petunjuk deploy untuk fondasi Tuya KWH dan ESP32-C3 water flow. Detail hardware dan kalibrasi sensor air tetap di `M15B_ESP32_C3_WATER_METER_SPEC.md`.

## 1. Yang sudah siap

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

## 2. Environment backend

```dotenv
TUYA_ACCESS_KEY=<Tuya Access ID / Client ID>
TUYA_SECRET_KEY=<Tuya Access Secret / Client Secret>
TUYA_API_BASE=https://openapi.tuyaus.com

# 32 random bytes base64 atau 64 hex; jangan pernah masuk repository.
IOT_MASTER_KEY=<random-secret>
IOT_STALE_AFTER_MINUTES=30
```

Generate master key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`IOT_MASTER_KEY` harus dibackup ke password manager. Jika key hilang, secret ESP32 yang sudah terenkripsi tidak dapat dipulihkan dan harus dirotasi.

## 3. Deploy database dan build

Jalankan dari `backend/`:

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run iot:bootstrap-tuya
```

Bootstrap idempoten: aman dijalankan ulang. Unit Tuya lama kamar D sengaja tidak diimpor.

Tarik snapshot semua perangkat:

```bash
npm run iot:sync-tuya
```

Untuk polling production, pasang **satu** cron per environment setiap 10 menit. Jangan menjalankan cron yang sama di setiap replica aplikasi.

```cron
*/10 * * * * cd /path/to/backend && npm run iot:sync-tuya
```

## 4. API backoffice

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

## 5. Kontrak ingest ESP32 water flow

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

## 6. Metric canonical

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

## 7. Billing isolation

```text
Tuya / ESP32
    -> IotIngestMessage
    -> IotTelemetry (GOOD / SUSPECT / REJECTED)
    -> review / shadow comparison (fase berikutnya)
    -> MeterReading resmi
    -> invoice draft
```

Implementasi saat ini berhenti di `IotTelemetry`. Tidak ada kode yang membuat `MeterReading`, `InvoiceLine`, invoice, pembayaran, atau jurnal dari ingest/sync IoT.

## 8. Hasil verifikasi 2026-07-16

- Tuya US OpenAPI: connected.
- Probe device: online, kategori `dlq`, 16 datapoint terbaca.
- Bootstrap: 13/13 meter terdaftar dan seluruh kamar termapping.
- Sync: 13/13 request berhasil; 11 online, F1/F2 offline sesuai inventaris.
- Backend build: lulus.
- Backend unit tests: 37 lulus.
- Frontend production build + PWA verification: lulus.
- Playwright OWNER/ADMIN desktop/mobile: 2 lulus; tidak ada page error, console error, atau HTTP 5xx.

## 9. Langkah fase berikutnya

1. Isi dan backup `IOT_MASTER_KEY` di setiap environment.
2. Pasang satu cron Tuya 10 menit di production.
3. Rakit satu prototype ESP32-C3 + D20 dan provision melalui dashboard OWNER.
4. Kalibrasi pulse/liter dengan wadah ukur; simpan faktor kalibrasi per perangkat.
5. Jalankan shadow billing minimal dua siklus tagihan sebelum membuat alur promosi telemetry ke `MeterReading`.
6. Tambahkan alarm kebocoran hanya setelah baseline malam dan pola hunian cukup stabil.
