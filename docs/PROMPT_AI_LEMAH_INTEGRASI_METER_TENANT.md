# Prompt implementasi meter otomatis untuk AI terbatas

Salin seluruh instruksi ini ke AI pelaksana. Jangan beri tugas lain sebelum semua pemeriksaan selesai.

```text
Anda adalah implementer yang teliti. Kerjakan hanya fitur berikut di proyek KOST48. Jangan mengubah alur invoice, MeterReading, firmware, migration database, autentikasi global, atau file yang tidak disebutkan.

TUJUAN
Tampilkan status dan angka meter IoT terbaru untuk kamar tenant aktif di Portal Tenant. Data harus diperbarui setiap 60 detik. Data IoT hanya untuk monitoring; MeterReading yang diverifikasi tetap satu-satunya dasar tagihan.

ATURAN BISNIS WAJIB
1. Jangan membuat MeterReading dari telemetry IoT.
2. Jangan membuat atau mengubah invoice dari telemetry IoT.
3. Tenant hanya boleh melihat telemetry perangkat yang roomId-nya sama dengan kamar stay ACTIVE miliknya.
4. Jangan percaya roomId dari browser. Backend harus mencari stay ACTIVE dari actor.tenantId.
5. Perangkat tanpa mapping/pemasangan bukan berarti rusak.

BACKEND
1. Tambahkan endpoint GET /api/iot/tenant/my-room pada IotController.
2. Endpoint hanya untuk role TENANT dan memakai CurrentUser.
3. Buat method IotService.tenantCurrentRoomUtilities(actor).
4. Cari stay ACTIVE tenant, lalu perangkat IotDevice enabled pada roomId itu untuk ELECTRICITY_METER dan WATER_FLOW_METER.
5. Ambil telemetry terbaru per perangkat. Jangan mengirim secret, credentialCiphertext, deviceCode, atau data tenant lain.
6. Kembalikan electricity dan water dengan status berikut:
   - NO_DEVICE: tidak ada meter terpasang atau belum dipetakan ke kamar.
   - NOT_CONNECTED: perangkat terdaftar tetapi belum pernah mengirim data.
   - OFFLINE: perangkat menyatakan offline.
   - STALE: lastSeenAt lebih lama dari IOT_STALE_AFTER_MINUTES (default 30).
   - NO_FLOW: meter air masih fresh tetapi flow_rate_lpm <= 0.
   - ONLINE: data terakhir berhasil diterima.
7. Kembalikan angka electricity.energy_total_kwh untuk listrik dan water.volume_total_m3 + water.flow_rate_lpm untuk air bila tersedia.
8. Tambahkan billingNotice dengan arti bahwa sensor hanya monitoring dan bukan dasar tagihan.
9. Untuk kWh Tuya, tambahkan polling backend yang aman: interval hanya jika IOT_TUYA_POLL_ENABLED=true dan endpoint cron bertoken untuk shared hosting. Endpoint cron harus memakai header rahasia, bukan token query string, dan tidak boleh bisa dipanggil tenant.

FRONTEND
1. Tambahkan API client getMyRoomUtilityTelemetry ke frontend/src/api/iot.ts beserta type-nya.
2. Di frontend/src/pages/portal/MyStayPage.tsx, query endpoint ini dengan:
   - query key portal-utility-telemetry + stay.roomId
   - refetchInterval 60_000
   - staleTime 20_000
   - refetchOnWindowFocus true
   - retry false
3. Teruskan data ke UtilityInsightCard.
4. Di frontend/src/components/portal/stay/UtilityInsightCard.tsx, tampilkan panel “Status meter otomatis” dengan dua kartu: Meter listrik dan Meter air.
5. Kartu harus menampilkan status, angka meter terkini, dan untuk air juga laju aliran bila ada.
6. Gunakan istilah “Perlu diperiksa”, bukan “Rusak”, untuk OFFLINE/STALE. Jelaskan kemungkinan daya, Wi-Fi, pemasangan, atau sensor.
7. Tampilkan “Diperbarui tiap menit” dan billingNotice.
8. Panel harus tetap muncul meskipun belum ada MeterReading manual. Jangan menghapus fitur pencatatan meter/manual billing yang sudah ada.
9. Tambahkan CSS responsif; dua kartu harus menjadi satu kolom di layar sempit.

OPERASIONAL TUYA
1. ESP32 mengirim air langsung ke backend; tidak perlu polling.
2. Tuya kWh harus dipoll agar angka baru tersedia. Pada server always-on, gunakan IOT_TUYA_POLL_ENABLED=true dan IOT_TUYA_POLL_MINUTES=10.
3. Pada cPanel/Passenger, nonaktifkan interval dan buat Cron Job tiap 5-10 menit yang memanggil endpoint cron bertoken menggunakan header rahasia.

VALIDASI WAJIB
1. Jalankan backend build dari folder backend: npm run build.
2. Jalankan frontend build dari folder frontend: npm run build.
3. Jalankan git diff --check dari root proyek.
4. Laporkan file yang diubah, hasil setiap perintah validasi, dan jelaskan bahwa koneksi fisik ESP32 baru dianggap aktif setelah perangkat didaftarkan, dipetakan ke roomId, diberi secret, dan mengirim telemetry sukses.

Jangan berhenti di rencana. Implementasikan seluruh perubahan lalu validasi.
```
