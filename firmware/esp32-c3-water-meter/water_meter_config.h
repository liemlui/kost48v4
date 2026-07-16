#pragma once

#include <Arduino.h>

/*
 * ============================================================================
 *                  KOST48 WATER METER - USER CONFIGURATION
 * ============================================================================
 * Edit file ini saja untuk menyiapkan perangkat. File .ino berisi logika dan
 * tidak perlu diubah untuk instalasi normal.
 *
 * Urutan pengisian:
 *   1. Isi Wi-Fi dan URL API.
 *   2. Pilih jumlah sensor aktif: 1, 2, 3, atau 4.
 *   3. Isi nama, GPIO, device ID, secret, dan kalibrasi setiap sensor aktif.
 *   4. Biarkan Advanced Settings dan TLS kecuali memang perlu disesuaikan.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. WI-FI DAN API - WAJIB DIISI
// ----------------------------------------------------------------------------

static const char WIFI_SSID[] = "GANTI_NAMA_WIFI";
static const char WIFI_PASSWORD[] = "GANTI_PASSWORD_WIFI";

// Wajib HTTPS dan harus berakhir dengan /api/iot/v1/readings.
static const char API_URL[] =
    "https://app.kost48surabaya.com/api/iot/v1/readings";

// ----------------------------------------------------------------------------
// 2. JUMLAH SENSOR AKTIF - PILIH 1, 2, 3, ATAU 4
// ----------------------------------------------------------------------------

// 1 = hanya baris Kamar A
// 2 = Kamar A + Kamar B
// 3 = Kamar A + Kamar B + Kamar C
// 4 = semua baris sensor
static constexpr size_t ACTIVE_FLOW_SENSOR_COUNT = 1;

// ----------------------------------------------------------------------------
// 3. KONFIGURASI SETIAP SENSOR
// ----------------------------------------------------------------------------

struct SensorConfig {
  const char *displayName;   // Nama bebas 1-40 karakter: Kamar A, Dapur, Tandon
  uint8_t gpio;              // GPIO signal setelah level shifter 3,3 V
  const char *deviceId;      // Harus sama dengan deviceCode pada dashboard /iot
  const char *deviceSecret;  // Secret dari dashboard; tampil satu kali
  double pulsesPerLiter;     // Nilai awal sensor: 477.0; kalibrasi per sensor
  uint32_t counterEpoch;     // Normalnya 1; naikkan hanya saat counter di-reset
};

// Format:
// { "Nama", GPIO, "device-id", "device-secret", pulse/liter, counter-epoch }
//
// Hanya baris pertama sebanyak ACTIVE_FLOW_SENSOR_COUNT yang digunakan.
// Baris yang tidak aktif boleh tetap memakai secret placeholder.
static const SensorConfig SENSORS[] = {
    {"Kamar A", 3, "water-kamar-a", "GANTI_SECRET_SENSOR_1", 477.0, 1},
    {"Kamar B", 4, "water-kamar-b", "GANTI_SECRET_SENSOR_2", 477.0, 1},
    {"Kamar C", 5, "water-kamar-c", "GANTI_SECRET_SENSOR_3", 477.0, 1},
    {"Kamar D", 6, "water-kamar-d", "GANTI_SECRET_SENSOR_4", 477.0, 1},
};

static constexpr size_t MAX_SENSOR_COUNT =
    sizeof(SENSORS) / sizeof(SENSORS[0]);
static constexpr size_t SENSOR_COUNT = ACTIVE_FLOW_SENSOR_COUNT;
static_assert(SENSOR_COUNT >= 1 && SENSOR_COUNT <= MAX_SENSOR_COUNT,
              "ACTIVE_FLOW_SENSOR_COUNT harus 1 sampai 4");

// ----------------------------------------------------------------------------
// 4. ADVANCED SETTINGS - BIASANYA TIDAK PERLU DIUBAH
// ----------------------------------------------------------------------------

// Listing sensor: F = 8.1Q - 3; F dalam Hz dan Q dalam L/min.
static constexpr double FLOW_HZ_PER_LPM = 8.1;
static constexpr double FLOW_HZ_OFFSET = -3.0;

// Filter pulse dan interval pengukuran.
static constexpr uint32_t MIN_PULSE_INTERVAL_US = 1000;  // filter noise 1 ms
static constexpr uint32_t FLOW_WINDOW_MS = 5000;         // hitung flow tiap 5 dtk

// Kebijakan upload dan penyimpanan.
static constexpr uint32_t ACTIVE_UPLOAD_MS = 60000;      // flow aktif: 1 menit
static constexpr uint32_t IDLE_HEARTBEAT_MS = 300000;    // idle: 5 menit
static constexpr uint32_t COUNTER_SAVE_MS = 60000;       // checkpoint: 1 menit
static constexpr uint32_t UPLOAD_RETRY_MS = 30000;       // retry: 30 detik
static constexpr uint32_t FIRST_SAMPLE_DELAY_MS = 15000; // upload awal: 15 detik

// Batas waktu koneksi API.
static constexpr uint32_t HTTP_CONNECT_TIMEOUT_MS = 10000;
static constexpr uint32_t HTTP_RESPONSE_TIMEOUT_MS = 15000;

// Naikkan versi ketika logika firmware berubah, bukan ketika hanya ganti nama.
static const char FIRMWARE_VERSION[] = "water-c3-multi-1.2.0";

// ----------------------------------------------------------------------------
// 5. TLS ROOT CA - GANTI HANYA JIKA DOMAIN TIDAK MEMAKAI LET'S ENCRYPT
// ----------------------------------------------------------------------------

// Root CA ISRG Root X1. Jangan memakai setInsecure() pada production.
static const char TLS_ROOT_CA[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)CERT";

// ============================================================================
//                       END USER CONFIGURATION
// ============================================================================
