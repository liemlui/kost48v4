# KOST48 Frontend Patch — 2026-04-27 (Phase 4.3-C1b Frontend Notification Center)

## Tujuan
Menambahkan frontend Notification Center MVP setelah backend AppNotification foundation UAT PASS, tanpa membuka browser push, service worker, SSE/websocket, scheduler, atau real WhatsApp.

## File yang dibuat
- `src/api/notifications.ts`
- `src/hooks/useNotifications.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/pages/notifications/NotificationsPage.tsx`

## File yang diubah
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/config/navigation.ts`
- `src/styles.css`

## Perubahan utama
- Bell notification muncul di header untuk semua authenticated roles.
- Badge unread count muncul bila ada notifikasi belum dibaca.
- Dropdown bell menampilkan notifikasi terbaru dan tombol **Tandai semua dibaca**.
- Route `/notifications` tersedia untuk semua role authenticated.
- Tenant portal mendapat menu sidebar **Notifikasi**.
- OWNER/ADMIN/STAFF tidak mendapat menu sidebar Notifikasi; akses cukup lewat bell/header.
- Halaman notifikasi menampilkan status **Belum dibaca** / **Sudah dibaca**.
- Breadcrumb route `/notifications` diterjemahkan menjadi **Notifikasi**.

## Keputusan UX lanjutan
- Announcement tetap berbeda dari AppNotification.
- Finance-related reminder akan dilanjutkan dengan **Payment Urgency Header Chip** agar kewajiban bayar tetap terlihat sampai selesai.

## Verifikasi
- `npm run build` ✅ PASS
- Visual smoke: bell, dropdown, `/notifications`, tenant sidebar **Notifikasi** ✅ PASS

---

## KOST48 Frontend Patch — 2026-04-21 (V4 Fase 4.1B Frontend Approval Booking)

### Tujuan
Menutup surface frontend untuk approval booking backoffice dan menampilkan status tenant portal yang jujur setelah approval admin, tanpa membuka payment submission atau fase 4.2+.

### File yang dibuat
- `src/components/stays/ApproveBookingModal.tsx`

### File yang diubah
- `src/api/bookings.ts`
- `src/pages/stays/StaysPage.tsx`
- `src/pages/portal/MyBookingsPage.tsx`
- `src/types/index.ts`
- `CHANGELOG.md`

### Perubahan utama

**Backoffice approval queue (4.1.3)**
- Queue approval booking di-embed ke halaman `Stays` melalui mode tampilan **Booking Reserved**
- Menampilkan konteks manusiawi: tenant, kamar, check-in, pricing term, `expiresAt`, dan status approval
- Reserved booking yang sudah punya invoice awal tidak lagi terasa “menunggu approval”

**Form approval booking (4.1.4)**
- Modal approval baru memakai endpoint backend existing `PATCH /admin/bookings/:stayId/approve`
- Field minimum sesuai kontrak aktif:
  - `agreedRentAmountRupiah`
  - `depositAmountRupiah`
  - `initialElectricityKwh`
  - `initialWaterM3`
- Validasi frontend defensif: semua field wajib angka valid dan meter tidak boleh negatif
- Setelah sukses, query stays / invoices / dashboard terkait di-invalidasi

**Tenant portal status setelah approval (4.1.5)**
- `Pemesanan Saya` sekarang menampilkan status jujur:
  - `Menunggu Approval`
  - `Menunggu Pembayaran`
- Status `Menunggu Pembayaran` diperkaya secara konservatif dari keberadaan invoice tenant untuk stay yang sama
- Tenant tidak diarahkan ke payment submission flow dan tidak diberi kesan kamar sudah `OCCUPIED`

### Yang sengaja tidak dibuka
- Backend baru atau perubahan kontrak backend
- Payment submission
- Upload bukti bayar
- Auto activation `RESERVED -> OCCUPIED`
- Fase 4.2+

### Verifikasi
Berhasil dijalankan:
- `npm install --ignore-scripts` ✅
- `npm run build` ✅

Catatan build:
- Vite production build sukses
- Masih ada warning bundle size > 500 kB, tetapi bukan blocker build/runtime untuk batch ini

---

## KOST48 Frontend Patch — 2026-04-21 (Pagination + UAT Readiness)

### Tujuan
Mengganti pola fetch-all-limit-besar dengan server-side pagination yang proper,
dan menutup 2 gap UAT yang memblok pengujian Fase 4.0.

### File yang dibuat
- src/components/common/PaginationControls.tsx

### File yang diubah
- src/pages/resources/SimpleCrudPage.tsx
- src/components/resources/ResourceTable.tsx
- src/pages/stays/StaysPage.tsx
- src/pages/invoices/InvoicesPage.tsx
- src/pages/dashboard/DashboardPage.tsx
- src/pages/stays/StayDetailPage.tsx
- src/api/tenants.ts

### Perubahan utama

**Pagination (server-side)**
- Komponen PaginationControls baru: prev/next + info "Halaman X dari Y · Z data"
- SimpleCrudPage: limit: 500 → page: 1 + limit: 20, search + isActive dikirim ke server
- ResourceTable: search toolbar sekarang muncul untuk semua path, bukan hanya /tenants; pagination controls di bawah tabel
- StaysPage: pagination dengan limit 20 per halaman
- InvoicesPage: pagination dengan limit 20 per halaman

**DashboardPage**
- OwnerDashboard + AdminDashboard: limit invoice/expense naik ke 1000, rooms ke 500, stays aktif ke 200
- OwnerDashboard: truncation warning jika database punya lebih invoice dari yang difetch

**StayDetailPage**
- Booking mandiri (room RESERVED + stay ACTIVE): tampilkan info badge, sembunyikan tombol aksi
- Stay operasional (room OCCUPIED): tidak ada perubahan

**tenants.ts**
- CRLF → LF

### Yang sengaja tidak dibuka
- Fase 4.1+ (approval booking)
- Payment submission
- Perubahan backend

### Verifikasi
Berhasil dijalankan:
- `npm install --ignore-scripts` ✅
- `npm run build` ✅

Catatan build:
- Vite production build sukses
- Masih ada warning bundle size > 500 kB, tetapi bukan blocker build/runtime untuk batch ini

---

# CHANGELOG

## KOST48 Frontend Patch — 2026-04-21 (V4 Fase 4.0 Frontend)

Batch frontend ini menutup sisa surface **V4 Fase 4.0** secara nyata dan tetap aman terhadap kontrak backend booking mandiri yang sudah dipatch sebelumnya. Fokus batch ini bukan UAT penuh, melainkan **patch-first** agar route, page, navigation, dan sinkronisasi API untuk booking mandiri sudah tersedia dan tetap buildable.

Scope yang ditutup pada batch ini:
- **4.0.6** Halaman publik `/rooms`
- **4.0.7** Form booking `/booking/:roomId`
- **4.0.8** Menu + halaman tenant `Pemesanan Saya`
- **4.0.9** Surface read-only booking reserved di backoffice (di-embed lewat filter stays)

Batch ini **tidak** membuka approval booking admin, payment submission, atau fase 4.1+.

---

## Ringkasan Patch

1. **Route `/rooms` sekarang mendukung dua surface tanpa mematahkan route lama**
   - Untuk OWNER / ADMIN / STAFF yang login, `/rooms` tetap membuka workspace backoffice rooms seperti sebelumnya.
   - Untuk guest / tenant, `/rooms` sekarang menjadi katalog kamar publik.
   - Pendekatan ini menjaga route existing tetap hidup tanpa membuat jalur duplikat yang membingungkan.

2. **Halaman publik katalog kamar berhasil ditambahkan**
   - Menampilkan kamar aktif yang tersedia dari endpoint backend `GET /public/rooms`.
   - Mendukung pencarian, filter lantai, dan filter `pricingTerm` secara aman.
   - Card kamar menampilkan kode/nama kamar, lantai, tarif utama yang relevan, daftar term tersedia, dan tombol **Pesan Sekarang**.
   - Jika gambar belum ada, frontend memakai placeholder netral dan jujur.

3. **Form booking tenant berhasil ditambahkan**
   - Route baru `/booking/:roomId` hanya untuk role **TENANT** melalui flow auth yang sudah ada.
   - Form sinkron dengan kontrak backend `POST /tenant/bookings`:
     - `roomId`
     - `checkInDate`
     - `pricingTerm`
     - `plannedCheckOutDate?`
     - `stayPurpose?`
     - `notes?`
   - Ringkasan kamar ditampilkan di samping form agar tenant tidak perlu melihat ID teknis.
   - Success/error state dibuat jujur; setelah sukses, tenant diarahkan ke **Pemesanan Saya**.

4. **Menu + halaman tenant `Pemesanan Saya` berhasil ditambahkan**
   - Menu tenant baru muncul di navigasi portal.
   - Route baru `/portal/bookings` mengambil data dari backend `GET /tenant/bookings/my`.
   - Menampilkan informasi penting seperti kamar, check-in, pricing term, tarif disepakati, dan `expiresAt`.
   - Empty/loading/error state aman dan tenant tidak diminta input ID teknis.

5. **Backoffice booking reserved ditambahkan sebagai filter read-only di Stays**
   - Tidak dibuat menu besar baru.
   - Halaman `Stays` sekarang punya mode tampilan tambahan **Booking Reserved**.
   - Filter ini menampilkan stay `ACTIVE` yang kamarnya berstatus `RESERVED`.
   - Surface dibuat read-only: row reserved tidak diarahkan ke detail operasional agar tidak membuka approval/admin flow terlalu cepat.

6. **Frontend diselaraskan dengan kontrak backend booking mandiri terbaru**
   - Tipe frontend sekarang mengenal `RoomStatus.RESERVED`, `Stay.expiresAt`, `PublicRoom`, `TenantBooking`, dan payload booking baru.
   - Label status/enum ditambah untuk `RESERVED`, `WEBSITE`, dan beberapa nilai `StayPurpose`.

---

## File Utama yang Berubah / Dibuat

### Diubah
- `src/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/config/navigation.ts`
- `src/pages/stays/StaysPage.tsx`
- `src/types/index.ts`
- `src/utils/statusLabels.ts`
- `src/components/common/StatusBadge.tsx`
- `src/styles.css`
- `CHANGELOG.md`

### Dibuat
- `src/api/bookings.ts`
- `src/pages/rooms/PublicRoomsPage.tsx`
- `src/pages/rooms/RoomsRouteEntry.tsx`
- `src/pages/bookings/BookingPage.tsx`
- `src/pages/portal/MyBookingsPage.tsx`

---

## Detail Perubahan

### 1) App Routing & Entry Surface

#### `src/App.tsx`
- Tambah route publik `GET /rooms` via komponen resolver.
- Tambah route tenant-only `/booking/:roomId`.
- Tambah route tenant-only `/portal/bookings`.
- Route backoffice `rooms` lama dipindahkan ke resolver agar `/rooms` bisa tetap kompatibel dengan dua surface berbeda.

#### `src/pages/rooms/RoomsRouteEntry.tsx`
- Komponen resolver baru untuk memutuskan apakah `/rooms` harus menampilkan:
  - backoffice rooms (OWNER / ADMIN / STAFF), atau
  - katalog publik (guest / TENANT).

#### `src/components/layout/AppLayout.tsx`
- `AppLayout` sekarang menerima `children` opsional.
- Tujuannya agar resolver route seperti `/rooms` tetap bisa memakai layout backoffice penuh tanpa harus menggandakan shell layout.

---

### 2) API & Type Contract Booking Mandiri

#### `src/api/bookings.ts`
- Client API baru untuk:
  - `listPublicRooms()` → `GET /public/rooms`
  - `createTenantBooking()` → `POST /tenant/bookings`
  - `listMyTenantBookings()` → `GET /tenant/bookings/my`

#### `src/types/index.ts`
- `Room.status` kini mengenal `RESERVED`.
- `Stay` ditambah field `expiresAt`.
- Tambah type baru:
  - `PublicRoom`
  - `TenantBooking`
  - `CreateTenantBookingPayload`

---

### 3) Halaman Publik `/rooms`

#### `src/pages/rooms/PublicRoomsPage.tsx`
- Halaman katalog kamar publik baru.
- Menampilkan:
  - kode / nama kamar
  - lantai
  - tarif utama (`highlightedRateRupiah`)
  - daftar term tersedia
  - CTA `Pesan Sekarang`
- Filter frontend disambungkan ke query param backend yang aman:
  - `search`
  - `floor`
  - `pricingTerm`
- Jika belum ada foto, frontend memakai placeholder netral.
- Topbar publik juga dibuat jujur terhadap status auth:
  - guest → tombol masuk
  - tenant → tombol ke portal
  - backoffice user tidak melihat halaman ini karena dialihkan resolver ke workspace rooms

---

### 4) Form Booking `/booking/:roomId`

#### `src/pages/bookings/BookingPage.tsx`
- Halaman booking tenant baru.
- Menampilkan ringkasan kamar dan form booking dalam satu layar.
- Field yang dibuat:
  - `checkInDate`
  - `pricingTerm`
  - `plannedCheckOutDate`
  - `stayPurpose`
  - `notes`
- Submit disambungkan ke endpoint backend booking mandiri.
- Setelah sukses:
  - invalidate query katalog publik dan booking tenant
  - redirect ke `/portal/bookings`
- Error backend ditampilkan apa adanya secara aman, tanpa wording palsu.

---

### 5) Tenant Portal — `Pemesanan Saya`

#### `src/config/navigation.ts`
- Tambah menu tenant baru: `/portal/bookings`.

#### `src/pages/portal/MyBookingsPage.tsx`
- Halaman tenant baru untuk daftar booking milik tenant.
- Menampilkan:
  - kamar
  - check-in
  - pricing term
  - tarif disepakati
  - masa berlaku booking (`expiresAt`)
- Badge masa berlaku dibuat jujur:
  - masih berlaku
  - mendekati habis
  - berakhir hari ini
  - masa berlaku lewat
- Empty state memberi CTA kembali ke katalog kamar.

---

### 6) Backoffice Read-Only Booking List

#### `src/pages/stays/StaysPage.tsx`
- Tambah mode tampilan `BOOKINGS`.
- `listStays()` tetap dipakai, tetapi frontend memetakan booking reserved sebagai:
  - stay `ACTIVE`
  - room status `RESERVED`
- `Stay Aktif` operasional sekarang dipisahkan dari `Booking Reserved` agar surface owner/admin lebih jujur.
- Row booking reserved tidak dibuat clickable ke detail operasional, sehingga tetap read-only pada batch ini.

---

### 7) Status & Label Sinkronisasi

#### `src/utils/statusLabels.ts`
- Tambah label untuk:
  - `RESERVED` → `Dipesan`
  - `WEBSITE` → `Website`
  - nilai `StayPurpose` (`WORK`, `STUDY`, dst.)
- Variant badge untuk `RESERVED` disetel ke warning agar mudah dikenali sebagai state transisional.

#### `src/components/common/StatusBadge.tsx`
- Union type badge ditambah `RESERVED`.

---

### 8) Styling Tambahan

#### `src/styles.css`
- Tambah style ringan untuk:
  - katalog publik
  - hero publik
  - placeholder kamar
  - grid ringkasan booking tenant
- Tidak ada dependency UI baru yang ditambahkan.

---

## Sinkronisasi dengan Backend

Frontend batch ini secara eksplisit diselaraskan dengan kontrak backend V4 Fase 4.0 yang sudah tersedia:
- `GET /public/rooms`
- `POST /tenant/bookings`
- `GET /tenant/bookings/my`
- `RoomStatus.RESERVED`
- `Stay.expiresAt`

Yang **tidak** dibuka di frontend batch ini:
- approval booking admin (Fase 4.1)
- payment submission / approval (Fase 4.2)
- notifikasi / scheduler (Fase 4.3)
- flow palsu yang mengasumsikan endpoint backend di luar kontrak aktif

---

## Verifikasi

Berhasil dijalankan:
- `npm install --ignore-scripts`
- `npm run build`

Hasil:
- TypeScript build ✅
- Vite production build ✅
- Route baru berhasil ikut terkompilasi ✅
- Tidak ada dependency baru ✅

Catatan:
- Masih ada warning ukuran bundle > 500 kB dari Vite.
- Ini **warning optimasi**, bukan blocker build/runtime untuk batch patch ini.

---

## Risiko / Catatan Tersisa

1. **Resolver `/rooms` sekarang memegang dua surface**
   - Ini sengaja untuk menjaga route publik dan backoffice tetap hidup tanpa mematahkan route lama.
   - Ke depan, bila arsitektur public marketing tumbuh besar, route publik bisa dipisah lebih eksplisit.

2. **Booking detail publik langsung per room belum punya endpoint detail khusus**
   - Form booking memakai state kamar dari katalog publik, dan fallback fetch katalog besar saat akses langsung.
   - Ini aman untuk batch ini, tetapi detail room publik dedicated endpoint akan lebih ideal bila nanti dibuat backend-nya.

3. **Surface backoffice booking masih read-only**
   - Sesuai scope, approval admin belum dibuka.

4. **Bundle size warning masih ada**
   - Dapat dioptimalkan nanti lewat code splitting bila masuk prioritas berikutnya.

---

## Output Final

Frontend hasil patch ini siap untuk:

```bash
npm install
npm run dev
```

Dan sudah diverifikasi build dengan:

```bash
npm run build
```


---

## KOST48 Frontend Refactor — 2026-04-23 (Kerapian Struktur Source)

### Tujuan
Merapikan source frontend tanpa mengubah arah bisnis aktif, agar file besar lebih mudah dipatch dan dijaga konsistensinya selama UAT 4.0–4.1.

### Batch refactor ini
- `src/config/resources.ts` dipecah menjadi beberapa file domain:
  - `resourceTypes.ts`
  - `resourceCommon.ts`
  - `coreResourceConfigs.ts`
  - `operationsResourceConfigs.ts`
  - `financeResourceConfigs.ts`
- `src/pages/stays/CheckInWizard.tsx` dipecah menjadi:
  - `check-in-wizard/types.ts`
  - `check-in-wizard/constants.ts`
  - `check-in-wizard/sections.tsx`

### Dampak
- File source manual besar menjadi lebih pendek dan lebih mudah dipelihara
- Tidak membuka kontrak backend baru
- Tidak mengubah status resmi gate UAT
- Refactor ini bersifat struktur/kebersihan, bukan klaim bahwa fitur baru fase berikutnya sudah live

### Catatan
- Surface review pembayaran / approval booking sempat mendapat patch UX tambahan selama debugging integrasi, tetapi gate resmi tetap mengacu pada hasil UAT, bukan pada keberadaan patch semata

---

## KOST48 Frontend Decision Update — 2026-04-27 (Announcement Access Guard)

### Tujuan

Membekukan UX rule bahwa pengumuman operasional tenant hanya relevan untuk penghuni aktif, bukan tenant yang masih dalam tahap booking/reserved.

### Keputusan

- `/portal/announcements` akan dijaga berdasarkan tenant stage.
- Tenant non-occupied diarahkan ke `/portal/bookings`.
- Admin/owner/staff behavior tidak berubah.
- Stage-aware announcement audience ditunda sebagai improvement setelah guard minimal stabil.

### Status

Dokumentasi keputusan sudah diperbarui. Implementasi code masuk ke ACT berikutnya: **4.3-G1 Announcement Access Guard**.
