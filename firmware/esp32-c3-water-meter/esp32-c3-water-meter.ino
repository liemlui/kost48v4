/*
 * KOST48 ESP32-C3 Multi Water Meter
 * Sensor : 1-4 flow sensor kuningan 3/4", 477 pulse/liter per channel
 * API    : POST /api/iot/v1/readings dengan HMAC-SHA256
 *
 * Satu board menangani maksimum empat sensor. Setiap sensor tetap didaftarkan
 * sebagai logical device KOST48_ESP32 tersendiri pada dashboard /iot. Dengan
 * begitu mapping kamar, secret, counter, retry, dan histori tetap terisolasi.
 *
 * Target Arduino IDE:
 *   Board package : esp32 by Espressif Systems
 *   Board         : ESP32C3 Dev Module (atau board ESP32-C3 yang sesuai)
 *   Dependency    : tidak ada library pihak ketiga
 *
 * Cukup salin dan upload SATU file .ino ini. Semua pengaturan pengguna berada
 * pada blok "USER CONFIGURATION" di bagian atas file.
 * Jangan menyebarkan sketch yang sudah berisi Wi-Fi/device secret.
 */

#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include "esp_system.h"
#include "mbedtls/md.h"

/*
 * ============================================================================
 *                  KOST48 WATER METER - USER CONFIGURATION
 * ============================================================================
 * EDIT BAGIAN INI SAJA untuk menyiapkan perangkat. Logika firmware berada
 * setelah tanda "END USER CONFIGURATION" dan tidak perlu diubah.
 *
 * Urutan pengisian:
 *   1. Isi Wi-Fi dan URL API.
 *   2. Pilih jumlah sensor aktif: 1, 2, 3, atau 4.
 *   3. Isi nama, GPIO, device ID, secret, dan kalibrasi sensor yang aktif.
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
    "https://kost48surabaya.com/api/iot/v1/readings";

// ----------------------------------------------------------------------------
// 2. JUMLAH SENSOR AKTIF - PILIH 1, 2, 3, ATAU 4
// ----------------------------------------------------------------------------

// 1 = hanya Sensor 1
// 2 = Sensor 1 + Sensor 2
// 3 = Sensor 1 + Sensor 2 + Sensor 3
// 4 = semua baris sensor
static constexpr size_t ACTIVE_FLOW_SENSOR_COUNT = 1;

// ----------------------------------------------------------------------------
// 3. KONFIGURASI SETIAP SENSOR
// ----------------------------------------------------------------------------

// 3A. NAMA SENSOR/KAMAR - BEBAS DIGANTI
// Nama ini tampil pada Serial Monitor dan diagnostics firmware.
// Contoh lain: "Kamar 101", "Dapur", "Tandon Atas", atau "Kamar Mandi A".
static const char NAMA_KAMAR_1[] = "Kamar A";
static const char NAMA_KAMAR_2[] = "Kamar B";
static const char NAMA_KAMAR_3[] = "Kamar C";
static const char NAMA_KAMAR_4[] = "Kamar D";

// 3B. DETAIL TEKNIS SETIAP SENSOR

struct SensorConfig {
  const char *displayName;   // Nama bebas 1-40 karakter: Kamar A, Dapur, Tandon
  uint8_t gpio;              // GPIO signal setelah level shifter 3,3 V
  const char *deviceId;      // Harus sama dengan deviceCode pada dashboard /iot
  const char *deviceSecret;  // Secret dari dashboard; tampil satu kali
  double pulsesPerLiter;     // Nilai awal sensor: 477.0; kalibrasi per sensor
  uint32_t counterEpoch;     // Normalnya 1; naikkan hanya saat counter di-reset
};

// Format:
// { NAMA_KAMAR, GPIO, "device-id", "device-secret", pulse/liter, counter-epoch }
//
// Hanya baris pertama sebanyak ACTIVE_FLOW_SENSOR_COUNT yang digunakan.
// Baris yang tidak aktif boleh tetap memakai secret placeholder.
static const SensorConfig SENSORS[] = {
    {NAMA_KAMAR_1, 3, "water-kamar-a", "GANTI_SECRET_SENSOR_1", 477.0, 1},
    {NAMA_KAMAR_2, 4, "water-kamar-b", "GANTI_SECRET_SENSOR_2", 477.0, 1},
    {NAMA_KAMAR_3, 5, "water-kamar-c", "GANTI_SECRET_SENSOR_3", 477.0, 1},
    {NAMA_KAMAR_4, 6, "water-kamar-d", "GANTI_SECRET_SENSOR_4", 477.0, 1},
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
static constexpr uint32_t IDLE_HEARTBEAT_MS = 900000;    // idle: 15 menit
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
//              JANGAN UBAH KODE DI BAWAH GARIS INI
// ============================================================================

// -----------------------------------------------------------------------------
// STATE PER CHANNEL, NVS, DAN RETRY
// -----------------------------------------------------------------------------

struct SensorState {
  volatile uint64_t pulseTotal = 0;
  volatile uint32_t lastAcceptedPulseUs = 0;

  uint64_t lastPersistedPulse = 0;
  uint64_t lastFlowPulseSnapshot = 0;
  uint32_t sequenceNumber = 0;
  double latestFlowRateLpm = 0.0;
  bool flowActive = false;
  bool flowStopEventDue = false;
  bool counterResetPending = false;

  String pendingBody;
  String pendingNonce;

  uint32_t lastFlowWindowAt = 0;
  uint32_t lastCounterSaveAt = 0;
  uint32_t lastSampleCreatedAt = 0;
  uint32_t nextUploadRetryAt = 0;
  bool firstSampleCreated = false;
};

Preferences preferences;
portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;
SensorState sensorStates[MAX_SENSOR_COUNT];

uint32_t nextWifiAttemptAt = 0;
uint32_t wifiBackoffMs = 5000;
bool ntpConfigured = false;

void ARDUINO_ISR_ATTR onFlowPulse(void *argument) {
  SensorState *state = static_cast<SensorState *>(argument);
  const uint32_t nowUs = micros();

  portENTER_CRITICAL_ISR(&pulseMux);
  const uint32_t elapsedUs = nowUs - state->lastAcceptedPulseUs;
  if (state->lastAcceptedPulseUs == 0 ||
      elapsedUs >= MIN_PULSE_INTERVAL_US) {
    state->pulseTotal++;
    state->lastAcceptedPulseUs = nowUs;
  }
  portEXIT_CRITICAL_ISR(&pulseMux);
}

uint64_t pulseSnapshot(size_t index) {
  portENTER_CRITICAL(&pulseMux);
  const uint64_t result = sensorStates[index].pulseTotal;
  portEXIT_CRITICAL(&pulseMux);
  return result;
}

void setPulseTotal(size_t index, uint64_t value) {
  portENTER_CRITICAL(&pulseMux);
  sensorStates[index].pulseTotal = value;
  portEXIT_CRITICAL(&pulseMux);
}

String uint64String(uint64_t value) {
  char output[24];
  snprintf(output, sizeof(output), "%llu",
           static_cast<unsigned long long>(value));
  return String(output);
}

bool elapsed(uint32_t now, uint32_t since, uint32_t interval) {
  return static_cast<uint32_t>(now - since) >= interval;
}

bool reached(uint32_t now, uint32_t target) {
  return static_cast<int32_t>(now - target) >= 0;
}

const char *channelKey(char *output, size_t outputSize, const char *prefix,
                       size_t index) {
  snprintf(output, outputSize, "%s%u", prefix,
           static_cast<unsigned int>(index));
  return output;
}

// -----------------------------------------------------------------------------
// HASH DAN HMAC: HARUS IDENTIK DENGAN BACKEND
// -----------------------------------------------------------------------------

String bytesToLowerHex(const unsigned char *bytes, size_t length) {
  static const char HEX_CHARS[] = "0123456789abcdef";
  String result;
  result.reserve(length * 2);

  for (size_t index = 0; index < length; index++) {
    result += HEX_CHARS[(bytes[index] >> 4) & 0x0F];
    result += HEX_CHARS[bytes[index] & 0x0F];
  }
  return result;
}

String sha256Hex(const String &value) {
  unsigned char digest[32];
  const mbedtls_md_info_t *info =
      mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (info == nullptr) return String();

  const int result = mbedtls_md(
      info, reinterpret_cast<const unsigned char *>(value.c_str()),
      value.length(), digest);
  if (result != 0) return String();
  return bytesToLowerHex(digest, sizeof(digest));
}

String hmacSha256Hex(const String &key, const String &value) {
  unsigned char digest[32];
  const mbedtls_md_info_t *info =
      mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (info == nullptr) return String();

  const int result = mbedtls_md_hmac(
      info, reinterpret_cast<const unsigned char *>(key.c_str()), key.length(),
      reinterpret_cast<const unsigned char *>(value.c_str()), value.length(),
      digest);
  if (result != 0) return String();
  return bytesToLowerHex(digest, sizeof(digest));
}

// -----------------------------------------------------------------------------
// WAKTU DAN WIFI
// -----------------------------------------------------------------------------

bool clockIsValid() {
  // 2024-01-01 UTC. Header API ditolak bila meleset lebih dari 5 menit.
  return time(nullptr) >= 1704067200;
}

String iso8601Now() {
  time_t now = time(nullptr);
  struct tm utcTime;
  gmtime_r(&now, &utcTime);

  char output[32];
  strftime(output, sizeof(output), "%Y-%m-%dT%H:%M:%S.000Z", &utcTime);
  return String(output);
}

void configureNtpOnce() {
  if (ntpConfigured || WiFi.status() != WL_CONNECTED) return;
  configTime(0, 0, "pool.ntp.org", "time.cloudflare.com", "time.google.com");
  ntpConfigured = true;
  Serial.println("[TIME] SNTP dikonfigurasi; menunggu waktu valid...");
}

void startWifiAttempt(uint32_t now) {
  Serial.printf("[WIFI] Menghubungkan ke %s\n", WIFI_SSID);
  WiFi.disconnect(false, false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const uint32_t jitter = esp_random() % 2000;
  nextWifiAttemptAt = now + wifiBackoffMs + jitter;
  wifiBackoffMs = wifiBackoffMs >= 150000 ? 300000 : wifiBackoffMs * 2;
}

void maintainWifi(uint32_t now) {
  static wl_status_t previousStatus = WL_NO_SHIELD;
  const wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    if (previousStatus != WL_CONNECTED) {
      Serial.printf("[WIFI] Tersambung; IP=%s RSSI=%d dBm\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
      wifiBackoffMs = 5000;
      configureNtpOnce();
    }
  } else if (reached(now, nextWifiAttemptAt)) {
    startWifiAttempt(now);
  }

  previousStatus = status;
}

// -----------------------------------------------------------------------------
// NVS: COUNTER DAN SATU PESAN PENDING PER CHANNEL
// -----------------------------------------------------------------------------

bool persistPulseCounter(size_t index, bool force = false) {
  SensorState &state = sensorStates[index];
  const uint64_t current = pulseSnapshot(index);
  if (!force && current == state.lastPersistedPulse) return true;

  char key[8];
  if (preferences.putULong64(channelKey(key, sizeof(key), "p", index),
                             current) == 0) {
    Serial.printf("[NVS][%s] Gagal menyimpan pulse total\n",
                  SENSORS[index].displayName);
    return false;
  }

  state.lastPersistedPulse = current;
  return true;
}

void resetChannelStorage(size_t index) {
  char key[8];
  preferences.remove(channelKey(key, sizeof(key), "pb", index));
  preferences.remove(channelKey(key, sizeof(key), "pn", index));
  preferences.putUInt(channelKey(key, sizeof(key), "ep", index),
                      SENSORS[index].counterEpoch);
  preferences.putULong64(channelKey(key, sizeof(key), "p", index), 0);
  preferences.putUInt(channelKey(key, sizeof(key), "sq", index), 0);
  preferences.putBool(channelKey(key, sizeof(key), "rp", index), true);
}

bool initializePersistentState() {
  if (!preferences.begin("watermulti", false)) {
    Serial.println("[FATAL] NVS Preferences tidak dapat dibuka");
    return false;
  }

  for (size_t index = 0; index < SENSOR_COUNT; index++) {
    SensorState &state = sensorStates[index];
    char key[8];
    const uint32_t storedEpoch = preferences.getUInt(
        channelKey(key, sizeof(key), "ep", index), 0);

    if (storedEpoch != SENSORS[index].counterEpoch) {
      Serial.printf("[NVS][%s] Counter epoch %u -> %u; counter baru\n",
                    SENSORS[index].displayName, storedEpoch,
                    SENSORS[index].counterEpoch);
      resetChannelStorage(index);
    }

    const uint64_t restoredPulses = preferences.getULong64(
        channelKey(key, sizeof(key), "p", index), 0);
    setPulseTotal(index, restoredPulses);
    state.lastPersistedPulse = restoredPulses;
    state.lastFlowPulseSnapshot = restoredPulses;
    state.sequenceNumber = preferences.getUInt(
        channelKey(key, sizeof(key), "sq", index), 0);
    state.counterResetPending = preferences.getBool(
        channelKey(key, sizeof(key), "rp", index), false);
    state.pendingBody = preferences.getString(
        channelKey(key, sizeof(key), "pb", index), "");
    state.pendingNonce = preferences.getString(
        channelKey(key, sizeof(key), "pn", index), "");

    if ((state.pendingBody.length() == 0) !=
        (state.pendingNonce.length() == 0)) {
      Serial.printf("[NVS][%s] Pending tidak lengkap; dibuang\n",
                    SENSORS[index].displayName);
      state.pendingBody = "";
      state.pendingNonce = "";
      preferences.remove(channelKey(key, sizeof(key), "pb", index));
      preferences.remove(channelKey(key, sizeof(key), "pn", index));
    }

    Serial.printf("[NVS][%s] Pulse=%s seq=%u pending=%s\n",
                  SENSORS[index].displayName,
                  uint64String(restoredPulses).c_str(),
                  state.sequenceNumber,
                  state.pendingBody.length() == 0 ? "tidak" : "ya");
  }
  return true;
}

bool savePendingMessage(size_t index, const String &body,
                        const String &nonce) {
  SensorState &state = sensorStates[index];
  char key[8];
  if (preferences.putString(channelKey(key, sizeof(key), "pb", index), body) ==
      0)
    return false;
  if (preferences.putString(channelKey(key, sizeof(key), "pn", index), nonce) ==
      0)
    return false;
  state.pendingBody = body;
  state.pendingNonce = nonce;
  return true;
}

void clearPendingMessage(size_t index) {
  SensorState &state = sensorStates[index];
  char key[8];
  state.pendingBody = "";
  state.pendingNonce = "";
  preferences.remove(channelKey(key, sizeof(key), "pb", index));
  preferences.remove(channelKey(key, sizeof(key), "pn", index));

  if (state.counterResetPending) {
    state.counterResetPending = false;
    preferences.putBool(channelKey(key, sizeof(key), "rp", index), false);
  }
}

// -----------------------------------------------------------------------------
// FLOW DAN PAYLOAD PER CHANNEL
// -----------------------------------------------------------------------------

void updateFlowRate(size_t index, uint32_t now) {
  SensorState &state = sensorStates[index];
  if (!elapsed(now, state.lastFlowWindowAt, FLOW_WINDOW_MS)) return;

  const uint32_t windowMs = now - state.lastFlowWindowAt;
  const uint64_t currentPulses = pulseSnapshot(index);
  const uint64_t deltaPulses = currentPulses - state.lastFlowPulseSnapshot;
  const bool wasActive = state.flowActive;

  if (deltaPulses == 0 || windowMs == 0) {
    state.latestFlowRateLpm = 0.0;
    state.flowActive = false;
  } else {
    const double frequencyHz =
        (static_cast<double>(deltaPulses) * 1000.0) / windowMs;
    state.latestFlowRateLpm =
        (frequencyHz - FLOW_HZ_OFFSET) / FLOW_HZ_PER_LPM;
    if (state.latestFlowRateLpm < 0.0) state.latestFlowRateLpm = 0.0;
    state.flowActive = true;
  }

  if (wasActive && !state.flowActive) state.flowStopEventDue = true;

  state.lastFlowPulseSnapshot = currentPulses;
  state.lastFlowWindowAt = now;

  Serial.printf("[FLOW][%s] delta=%s flow=%.3f L/min total=%.3f L\n",
                SENSORS[index].displayName,
                uint64String(deltaPulses).c_str(),
                state.latestFlowRateLpm,
                static_cast<double>(currentPulses) /
                    SENSORS[index].pulsesPerLiter);
}

String createNonce(size_t index, uint32_t sequence) {
  char randomPart[9];
  snprintf(randomPart, sizeof(randomPart), "%08lx",
           static_cast<unsigned long>(esp_random()));
  return String(SENSORS[index].deviceId) + "-" + String(sequence) + "-" +
         randomPart;
}

String jsonEscape(const char *value) {
  String result;
  if (value == nullptr) return result;
  result.reserve(strlen(value) + 8);

  for (const char *cursor = value; *cursor != '\0'; cursor++) {
    switch (*cursor) {
      case '"': result += "\\\""; break;
      case '\\': result += "\\\\"; break;
      case '\n': result += "\\n"; break;
      case '\r': result += "\\r"; break;
      case '\t': result += "\\t"; break;
      default:
        if (static_cast<uint8_t>(*cursor) >= 0x20) result += *cursor;
        break;
    }
  }
  return result;
}

String buildPayload(size_t index, uint64_t pulses, uint32_t sequence) {
  const SensorConfig &config = SENSORS[index];
  const SensorState &state = sensorStates[index];
  const double totalLiters =
      static_cast<double>(pulses) / config.pulsesPerLiter;

  String body;
  body.reserve(390);
  body += "{\"observedAt\":\"";
  body += iso8601Now();
  body += "\",\"sequence\":";
  body += String(sequence);
  body += ",\"pulseTotal\":";
  body += uint64String(pulses);
  body += ",\"volumeTotalLiters\":";
  body += String(totalLiters, 6);
  body += ",\"flowRateLpm\":";
  body += String(state.latestFlowRateLpm, 6);
  body += ",\"rssiDbm\":";
  body += String(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -120);
  body += ",\"firmwareVersion\":\"";
  body += FIRMWARE_VERSION;
  body += "\"";

  if (state.counterResetPending) body += ",\"counterReset\":true";

  body += ",\"diagnostics\":{";
  body += "\"uptimeSec\":";
  body += String(millis() / 1000UL);
  body += ",\"sensorName\":\"";
  body += jsonEscape(config.displayName);
  body += "\",\"gpio\":";
  body += String(config.gpio);
  body += ",\"pulsesPerLiter\":";
  body += String(config.pulsesPerLiter, 3);
  body += ",\"counterEpoch\":";
  body += String(config.counterEpoch);
  body += "}}";
  return body;
}

bool createPendingSample(size_t index, uint32_t now) {
  SensorState &state = sensorStates[index];
  if (!clockIsValid()) {
    Serial.printf("[TIME][%s] Belum valid; sample ditunda\n",
                  SENSORS[index].displayName);
    return false;
  }

  // Jangan menulis ulang counter yang sama; NVS tetap diperbarui jika ada pulse.
  if (!persistPulseCounter(index)) return false;

  state.sequenceNumber++;
  char key[8];
  if (preferences.putUInt(channelKey(key, sizeof(key), "sq", index),
                          state.sequenceNumber) == 0) {
    Serial.printf("[NVS][%s] Gagal menyimpan sequence\n",
                  SENSORS[index].displayName);
    return false;
  }

  const uint64_t pulses = pulseSnapshot(index);
  const String body = buildPayload(index, pulses, state.sequenceNumber);
  const String nonce = createNonce(index, state.sequenceNumber);

  if (!savePendingMessage(index, body, nonce)) {
    Serial.printf("[NVS][%s] Gagal menyimpan pending message\n",
                  SENSORS[index].displayName);
    return false;
  }

  state.flowStopEventDue = false;
  state.lastSampleCreatedAt = now;
  state.firstSampleCreated = true;
  state.nextUploadRetryAt = now;
  return true;
}

// -----------------------------------------------------------------------------
// HTTPS UPLOAD PER LOGICAL DEVICE
// -----------------------------------------------------------------------------

bool uploadPendingMessage(size_t index) {
  SensorState &state = sensorStates[index];
  const SensorConfig &config = SENSORS[index];
  if (state.pendingBody.length() == 0 || state.pendingNonce.length() == 0)
    return true;
  if (WiFi.status() != WL_CONNECTED || !clockIsValid()) return false;

  const String timestamp = String(static_cast<unsigned long>(time(nullptr)));
  const String bodyHash = sha256Hex(state.pendingBody);
  if (bodyHash.length() != 64) {
    Serial.printf("[CRYPTO][%s] SHA-256 gagal\n", config.displayName);
    return false;
  }

  const String canonical = String(config.deviceId) + "\n" + timestamp + "\n" +
                           state.pendingNonce + "\n" + bodyHash;
  const String signature = hmacSha256Hex(config.deviceSecret, canonical);
  if (signature.length() != 64) {
    Serial.printf("[CRYPTO][%s] HMAC-SHA256 gagal\n", config.displayName);
    return false;
  }

  WiFiClientSecure tlsClient;
  tlsClient.setCACert(TLS_ROOT_CA);
  tlsClient.setHandshakeTimeout(15);

  HTTPClient http;
  http.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
  http.setTimeout(HTTP_RESPONSE_TIMEOUT_MS);

  if (!http.begin(tlsClient, API_URL)) {
    Serial.printf("[HTTP][%s] Gagal membuka HTTPS\n", config.displayName);
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", config.deviceId);
  http.addHeader("X-Timestamp", timestamp);
  http.addHeader("X-Nonce", state.pendingNonce);
  http.addHeader("X-Signature", signature);

  Serial.printf("[HTTP][%s] POST device=%s sequence=%u\n", config.displayName,
                config.deviceId, state.sequenceNumber);
  const int statusCode = http.POST(state.pendingBody);
  const String responseBody = statusCode > 0 ? http.getString() : String();
  http.end();

  if (statusCode >= 200 && statusCode < 300) {
    Serial.printf("[HTTP][%s] Diterima (%d): %s\n", config.displayName,
                  statusCode,
                  responseBody.c_str());
    clearPendingMessage(index);
    return true;
  }

  Serial.printf("[HTTP][%s] Gagal (%d): %s\n", config.displayName, statusCode,
                responseBody.c_str());
  return false;
}

// -----------------------------------------------------------------------------
// VALIDASI, SETUP, LOOP
// -----------------------------------------------------------------------------

bool deviceIdLooksValid(const char *value) {
  if (value == nullptr) return false;
  const size_t length = strlen(value);
  if (length == 0 || length > 80) return false;

  for (size_t index = 0; index < length; index++) {
    const char character = value[index];
    const bool allowed =
        (character >= 'a' && character <= 'z') ||
        (character >= 'A' && character <= 'Z') ||
        (character >= '0' && character <= '9') || character == '.' ||
        character == '_' || character == '-';
    if (!allowed) return false;
  }
  return true;
}

bool configurationLooksValid() {
  bool valid = true;

  if (String(WIFI_SSID).startsWith("GANTI_")) {
    Serial.println("[CONFIG] WIFI_SSID belum diganti");
    valid = false;
  }
  if (String(WIFI_PASSWORD).startsWith("GANTI_")) {
    Serial.println("[CONFIG] WIFI_PASSWORD belum diganti");
    valid = false;
  }
  if (!String(API_URL).startsWith("https://") ||
      !String(API_URL).endsWith("/api/iot/v1/readings")) {
    Serial.println(
        "[CONFIG] API_URL wajib HTTPS dan berakhir /api/iot/v1/readings");
    valid = false;
  }

  for (size_t index = 0; index < SENSOR_COUNT; index++) {
    const SensorConfig &config = SENSORS[index];
    if (config.displayName == nullptr || strlen(config.displayName) == 0 ||
        strlen(config.displayName) > 40) {
      Serial.printf("[CONFIG] Nama sensor %u wajib 1-40 karakter\n",
                    static_cast<unsigned int>(index + 1));
      valid = false;
    }
    if (String(config.deviceId).startsWith("GANTI_") ||
        !deviceIdLooksValid(config.deviceId)) {
      Serial.printf("[CONFIG][%s] DEVICE_ID belum valid\n",
                    config.displayName);
      valid = false;
    }
    if (config.deviceSecret == nullptr ||
        String(config.deviceSecret).startsWith("GANTI_") ||
        strlen(config.deviceSecret) < 32) {
      Serial.printf("[CONFIG][%s] DEVICE_SECRET belum diganti\n",
                    config.displayName);
      valid = false;
    }
    if (config.pulsesPerLiter <= 0.0) {
      Serial.printf("[CONFIG][%s] pulsesPerLiter harus positif\n",
                    config.displayName);
      valid = false;
    }
    for (size_t other = index + 1; other < SENSOR_COUNT; other++) {
      if (config.gpio == SENSORS[other].gpio) {
        Serial.printf("[CONFIG] GPIO %u dipakai lebih dari satu channel\n",
                      config.gpio);
        valid = false;
      }
      if (String(config.deviceId) == SENSORS[other].deviceId) {
        Serial.printf("[CONFIG] DEVICE_ID %s duplikat\n", config.deviceId);
        valid = false;
      }
    }
  }
  return valid;
}

void setup() {
  Serial.begin(115200);
  delay(1200);
  Serial.println();
  Serial.println("=== KOST48 ESP32-C3 MULTI WATER METER ===");

  if (!configurationLooksValid()) {
    Serial.println("[FATAL] Lengkapi konfigurasi lalu upload ulang firmware");
    while (true) delay(1000);
  }

  if (!initializePersistentState()) {
    while (true) delay(1000);
  }

  const uint32_t now = millis();
  for (size_t index = 0; index < SENSOR_COUNT; index++) {
    SensorState &state = sensorStates[index];
    pinMode(SENSORS[index].gpio, INPUT_PULLUP);
    attachInterruptArg(digitalPinToInterrupt(SENSORS[index].gpio), onFlowPulse,
                       &state, RISING);

    state.lastFlowWindowAt = now;
    state.lastCounterSaveAt = now;
    state.lastSampleCreatedAt = now;
    state.nextUploadRetryAt = now;

    Serial.printf("[SENSOR][%s] GPIO=%u device=%s %.1f pulse/L\n",
                  SENSORS[index].displayName, SENSORS[index].gpio,
                  SENSORS[index].deviceId, SENSORS[index].pulsesPerLiter);
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  nextWifiAttemptAt = now;

  Serial.printf("[READY] %u channel aktif\n",
                static_cast<unsigned int>(SENSOR_COUNT));
}

void loop() {
  const uint32_t now = millis();

  maintainWifi(now);
  configureNtpOnce();

  for (size_t index = 0; index < SENSOR_COUNT; index++) {
    SensorState &state = sensorStates[index];
    updateFlowRate(index, now);

    if (elapsed(now, state.lastCounterSaveAt, COUNTER_SAVE_MS)) {
      persistPulseCounter(index);
      state.lastCounterSaveAt = now;
    }

    if (state.pendingBody.length() != 0) {
      if (reached(now, state.nextUploadRetryAt)) {
        uploadPendingMessage(index);
        state.nextUploadRetryAt = millis() + UPLOAD_RETRY_MS;
      }
      continue;
    }

    const uint32_t interval =
        state.flowActive ? ACTIVE_UPLOAD_MS : IDLE_HEARTBEAT_MS;
    const bool firstDue =
        !state.firstSampleCreated &&
        elapsed(now, state.lastSampleCreatedAt, FIRST_SAMPLE_DELAY_MS);
    const bool periodicDue =
        state.firstSampleCreated &&
        elapsed(now, state.lastSampleCreatedAt, interval);

    if (firstDue || periodicDue || state.flowStopEventDue) {
      createPendingSample(index, now);
    }
  }

  delay(10);
}
