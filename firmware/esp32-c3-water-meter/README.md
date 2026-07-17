# Firmware Water Meter ESP32-C3

Firmware siap upload berada dalam **satu file saja**:
`esp32-c3-water-meter.ino`. Semua pengaturan pengguna dipusatkan pada blok
`USER CONFIGURATION` di bagian atas file tersebut. Untuk instalasi normal,
edit Bagian 1-3 saja dan jangan mengubah logika setelah `END USER CONFIGURATION`.

Satu ESP32-C3 dapat
menangani 1-4 sensor flow kuningan 3/4 inci. Setiap sensor memiliki GPIO,
kalibrasi, counter, logical device ID, secret, dan retry queue sendiri.

Area konfigurasi sudah dibagi berurutan:

| Bagian | Isi | Kapan diubah |
|---|---|---|
| 1 | Wi-Fi dan URL API | Wajib |
| 2 | Jumlah sensor aktif | Wajib |
| 3 | Nama, GPIO, device ID, secret, kalibrasi | Wajib untuk channel aktif |
| 4 | Interval dan parameter lanjutan | Biasanya biarkan default |
| 5 | TLS Root CA | Hanya jika SSL domain bukan Let's Encrypt |

Spesifikasi awal setiap sensor:

- 477 pulse/liter;
- debit nominal 2-45 L/min;
- persamaan `F = 8.1Q - 3` (`F` Hz, `Q` L/min);
- supply sensor 5 V;
- ESP32-C3 bekerja pada logika 3,3 V.

Ada perbedaan yang wajib dicek saat barang datang: teks pada stiker di foto
tampak menunjukkan rentang sekitar 1-30 L/min, sedangkan spesifikasi listing
yang diberikan adalah 2-45 L/min. Firmware dapat menghitung keduanya, tetapi
jangan menganggap akurasi 45 L/min valid sebelum model pada unit fisik dan hasil
kalibrasinya dikonfirmasi.

## Wiring 1-4 sensor

| Channel | Signal setelah level shifter | Logical device awal |
|---|---|---|
| Sensor 1 | GPIO3 | `water-kamar-a` |
| Sensor 2 | GPIO4 | `water-kamar-b` |
| Sensor 3 | GPIO5 | `water-kamar-c` |
| Sensor 4 | GPIO6 | `water-kamar-d` |

Untuk setiap sensor: merah ke rail 5 V stabil, hitam ke common GND, dan kuning
melewati rangkaian level shifting terpisah sebelum GPIO. GPIO di atas adalah
nilai awal; pastikan semuanya diekspos dan tidak konflik dengan fungsi board
ESP32-C3 yang benar-benar dibeli.

Jangan hubungkan kabel signal 5 V langsung ke GPIO. Pilihan paling aman adalah
modul level shifter atau optocoupler. Jika keluaran sensor sudah dipastikan
push-pull 5 V, divider 10 kOhm dari signal ke GPIO dan 20 kOhm dari GPIO ke GND
memberikan sekitar 3,3 V. Jika keluaran open-collector, gunakan pull-up eksternal
10 kOhm ke 3,3 V. Verifikasi tipe output dengan multimeter/osiloskop atau
datasheet penjual sebelum memilih rangkaian.

Gunakan supply 5 V terisolasi dengan margin yang cukup. Empat sensor memakai
maksimum sekitar 40 mA berdasarkan listing, belum termasuk ESP32-C3. Supply 5 V
1 A memberikan margin prototype yang wajar. Tambahkan decoupling 100 nF dekat
setiap sensor dan 10 uF pada rail. Untuk kabel panjang, gunakan twisted pair
signal-GND dan jauhkan dari kabel AC.

## Cara upload

1. Arduino IDE: install board package `esp32 by Espressif Systems`.
2. Pilih board yang benar; untuk board generik gunakan `ESP32C3 Dev Module`.
3. Buka file `esp32-c3-water-meter.ino` di Arduino IDE.
4. Isi Bagian 1-3 pada blok `USER CONFIGURATION` di bagian atas `.ino`.
5. Set `ACTIVE_FLOW_SENSOR_COUNT` ke 1, 2, 3, atau 4 lalu isi `gpio`,
   `deviceId`, `deviceSecret`, `pulsesPerLiter`, dan `counterEpoch` untuk setiap
   entry `SENSORS` yang aktif.
6. Pastikan root CA sesuai sertifikat domain API. Bawaan sketch adalah ISRG
   Root X1 untuk domain dengan rantai Let's Encrypt.
7. Upload, lalu buka Serial Monitor pada 115200 baud.

Buat satu logical device dan secret di dashboard OWNER `/iot` untuk setiap
sensor, bukan satu device untuk seluruh board. Contoh board dua channel memakai
`water-kamar-a` dan `water-kamar-b`. Secret hanya ditampilkan satu kali. Jangan
commit sketch yang sudah berisi password Wi-Fi atau device secret.

## Mengaktifkan 1, 2, 3, atau 4 sensor

Cari Bagian 2 di bagian atas `esp32-c3-water-meter.ino`:

```cpp
static constexpr size_t ACTIVE_FLOW_SENSOR_COUNT = 1;
```

| Nilai | Channel aktif | GPIO awal | Konfigurasi yang wajib diisi |
|---:|---|---|---|
| `1` | Sensor 1 | GPIO3 | Entry `SENSORS[0]` |
| `2` | Sensor 1-2 | GPIO3, GPIO4 | Entry pertama dan kedua |
| `3` | Sensor 1-3 | GPIO3, GPIO4, GPIO5 | Entry pertama sampai ketiga |
| `4` | Sensor 1-4 | GPIO3, GPIO4, GPIO5, GPIO6 | Semua entry |

Contoh satu sensor:

```cpp
static constexpr size_t ACTIVE_FLOW_SENSOR_COUNT = 1;
```

Contoh empat sensor:

```cpp
static constexpr size_t ACTIVE_FLOW_SENSOR_COUNT = 4;
```

Firmware selalu memakai entry dari atas. Jika nilainya `2`, hanya
`Kamar A` dan `Kamar B` yang diinisialisasi; secret sensor 3-4 boleh tetap
placeholder. Jangan mengisi urutan dengan loncat, misalnya mengaktifkan nilai
`2` tetapi hanya mengisi entry sensor 1 dan sensor 4.

## Mengubah nama sensor/kamar

Nama setiap sensor memiliki variabel tersendiri di Bagian 3A
`esp32-c3-water-meter.ino`. Ganti teks di sebelah kanan saja:

```cpp
static const char NAMA_KAMAR_1[] = "Kamar A";
static const char NAMA_KAMAR_2[] = "Kamar B";
static const char NAMA_KAMAR_3[] = "Dapur";
static const char NAMA_KAMAR_4[] = "Tandon Atas";
```

Tabel teknis di Bagian 3B otomatis memakai variabel tersebut:

```cpp
{NAMA_KAMAR_1, 3, "water-kamar-a", "GANTI_SECRET_SENSOR_1", 477.0, 1},
```

- `NAMA_KAMAR_1` sampai `NAMA_KAMAR_4`: bebas diubah, 1-40 karakter; tampil pada Serial Monitor dan
  diagnostics API.
- `deviceId`: identitas teknis dan harus sama persis dengan `deviceCode` yang
  dibuat pada dashboard `/iot`.
- Nama tampilan dan mapping kamar resmi pada dashboard tetap diatur melalui
  `/iot`; backend tidak mempercayai nama kamar dari firmware sebagai mapping.
- Mengubah `displayName` saja tidak mereset counter. Jangan menaikkan
  `counterEpoch` ketika hanya mengganti nama.

## Perilaku firmware

- setiap channel dihitung melalui interrupt terpisah dengan filter 1 ms;
- volume, flow, sequence, NVS, nonce, dan HMAC terisolasi per channel;
- volume total memakai faktor awal 477 pulse/liter;
- flow sesaat memakai `Q = (F + 3) / 8.1`;
- saat ada aliran, data dikirim setiap 60 detik;
- saat idle, heartbeat dikirim setiap 15 menit (masih di bawah batas stale backend 30 menit);
- event flow berhenti dikirim tanpa menunggu heartbeat;
- total pulse, sequence, dan satu request pending per channel disimpan di NVS;
- request gagal diulang dengan body dan nonce yang sama sehingga idempoten;
- timestamp/signature dibuat ulang ketika retry agar tetap dalam toleransi API;
- TLS certificate diverifikasi dan tidak memakai `setInsecure()`.

## Kalibrasi

Nilai 477 pulse/liter adalah nilai awal. Kalibrasi setiap sensor secara terpisah
dengan wadah ukur minimal 20 liter:

```text
pulsesPerLiterBaru = pulseTerukur / literAktual
```

Ganti `pulsesPerLiter` pada entry `SENSORS` terkait dengan hasil rata-rata
beberapa pengujian pada debit rendah, sedang, dan tinggi. Jangan menaikkan
`counterEpoch` hanya karena nilai kalibrasi berubah. Naikkan hanya untuk channel
yang counternya sengaja dimulai ulang; firmware akan mengirim
`counterReset: true` satu kali untuk logical device tersebut.

## Catatan produksi

Credential pada source cocok untuk prototype dan commissioning. Perangkat final
sebaiknya memakai flash encryption/secure boot ESP32-C3 dan mekanisme
provisioning lokal agar credential tidak tersimpan dalam repository atau binary
yang dibagikan.

## Verifikasi compile

Sketch telah dikompilasi pada 2026-07-16 dengan:

- Arduino CLI 1.5.1;
- `esp32 by Espressif Systems` Core 3.3.10;
- target `esp32:esp32:esp32c3` (`ESP32C3 Dev Module`);
- satu sensor: flash 1.103.957 byte (84%), global RAM 37.256 byte (11%);
- empat sensor: flash 1.111.923 byte (84%), global RAM 37.512 byte (11%);
- kapasitas target: flash 1.310.720 byte dan RAM 327.680 byte.

Compile berhasil. Upload dan bench test pulse tetap harus dilakukan setelah board,
level shifter, dan sensor fisik tersedia.
