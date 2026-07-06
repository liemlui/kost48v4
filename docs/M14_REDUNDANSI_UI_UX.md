# KOST48 V5 — M14: Redundansi UI/UX (Admin + Publik)

> **Dibuat:** 2026-07-04 | **Fase:** AM — Redundansi UI/UX | **Task:** 12 | **Estimasi:** 1-2 sesi
>
> **Sumber:** Audit Reasonix — chat "Khusus audit bagian Admin" + laporan redundansi publik + audit halaman Owner.
> **Tujuan:** Menghapus duplikasi navigasi, tombol, fungsi, dan komponen yang membingungkan user
> dan memboroskan token maintenance. **Semua task harus dikerjakan oleh AI lemah**
> — setiap langkah ditulis eksplisit dengan path file, nomor baris, dan kode sebelum/sesudah.

---

## Checklist Eksekusi

| # | ID | Task | Prioritas | File tersentuh | Status |
|---|-----|------|-----------|----------------|--------|
| 1 | AM-01 | Unifikasi WhatsApp URL builder | 🔴 HIGH | 13 file | [ ] |
| 2 | AM-02 | Hapus RoleWorkspaceTabs (duplikat dashboard tabs) | 🔴 HIGH | 2 file | [ ] |
| 3 | AM-03 | Bedakan target "Cek Checkout" vs "Review Booking" | 🟡 MED | 1 file | [ ] |
| 4 | AM-04 | Sembunyikan RoleWorkspaceTabs di non-dashboard | 🟡 MED | 1 file | [ ] |
| 5 | AM-05 | Tambahkan "Pengumuman" ke sidebar admin | 🟡 MED | 1 file | [ ] |
| 6 | AM-06 | RoomCard pakai FacilityList (ganti amenity inline) | 🟢 LOW | 2 file | [ ] |
| 7 | AM-07 | Fix RoomComparePanel spec detection (regex→utility) | 🔴 HIGH | 3 file | [ ] |
| 8 | AM-08 | Buat RoomPriceTable komponen reusable | 🟢 LOW | 4 file | [ ] |
| 9 | AM-09 | Buat RoomSpecChips komponen reusable | 🟢 LOW | 4 file | [ ] |
| 10 | AM-11 | Hapus tombol "Buka laporan" di OwnerDashboard (duplikat sidebar) | 🟡 MED | 1 file | [ ] |
| 11 | AM-12 | Hapus tombol "Lengkapi setup akuntansi" di FinancialRatiosPage | 🟡 MED | 1 file | [ ] |
| 12 | AM-10 | Dokumentasi + changelog | 🟢 LOW | 2 file | [ ] |

---

## AM-01 — Unifikasi WhatsApp URL Builder 🔴 HIGH

### Masalah

Ada **6 fungsi berbeda** + **6 raw inline** yang semua melakukan hal sama:
membangun URL `https://wa.me/{nomor}?text={encodeURIComponent(pesan)}`.
Nomor WA diambil dari env var `VITE_PUBLIC_ADMIN_WHATSAPP` (fallback: `6285648887628`).

### Daftar lengkap instance yang harus diganti

**Fungsi duplikat (6):**

| # | File | Baris | Nama fungsi | Status |
|---|------|-------|-------------|--------|
| 1 | `frontend/src/components/rooms/RoomCard.tsx` | 34 | `buildWhatsAppUrl(room, customMessage?)` | exported |
| 2 | `frontend/src/components/rooms/RoomComparePanel.tsx` | 8 | `buildWaInterestUrl(room)` | local |
| 3 | `frontend/src/pages/bookings/GuestBookingPage.tsx` | 17 | `buildWaAvailabilityUrl(roomCode, isChecking)` | local |
| 4 | `frontend/src/pages/public/publicGuestShared.tsx` | 216 | `buildWhatsAppUrl(message)` | exported |
| 5 | `frontend/src/pages/public/publicGuestShared.tsx` | 220 | `buildRoomWhatsAppUrl(room)` | exported wrapper |
| 6 | `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` | 124 | `buildWhatsAppUrl(room)` | local |

**Raw inline (6):**

| # | File | Baris | Keterangan |
|---|------|-------|------------|
| 7 | `frontend/src/components/command-center/ActionQueueTable.tsx` | 65 | `wa.me/` inline |
| 8 | `frontend/src/components/portal/BookingStatusHelper.tsx` | 143 | `wa.me/` inline |
| 9 | `frontend/src/components/staff/StaffGeneralInventorySection.tsx` | 157 | `wa.me/` inline |
| 10 | `frontend/src/components/staff/StaffUnifiedWorkQueue.tsx` | 407 | `wa.me/` inline |
| 11 | `frontend/src/data/officialKost48Content.ts` | 19 | `wa.me/` inline |
| 12 | `frontend/src/pages/auth/ForgotPasswordPage.tsx` | 28 | `wa.me/` inline |

### Langkah Pengerjaan

#### Step 1 — Buat file utilitas baru

**Buat file:** `frontend/src/utils/whatsapp.ts`

```typescript
// FILE: whatsapp.ts — pembangun URL WhatsApp terpusat
const ADMIN_WHATSAPP = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');

/** Bangun URL WhatsApp ke admin KOST48 dengan pesan kustom */
export function buildAdminWaUrl(message: string): string {
  return ADMIN_WHATSAPP
    ? `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Bangun URL WhatsApp untuk menanyakan ketersediaan kamar tertentu */
export function buildRoomWaUrl(roomCode: string, customMessage?: string): string {
  const msg = customMessage ?? `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Boleh tanya ketersediaan dan estimasi siap huni?`;
  return buildAdminWaUrl(msg);
}

/** Bangun URL WhatsApp untuk menanyakan ketersediaan (dengan konteks booking) */
export function buildAvailabilityWaUrl(roomCode: string, isChecking = false): string {
  const msg = isChecking
    ? `Halo Admin KOST48, saya ingin mengecek ketersediaan kamar ${roomCode}. Apakah masih bisa dibooking?`
    : `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Kapan kira-kira kamar ini bisa tersedia?`;
  return buildAdminWaUrl(msg);
}
```

#### Step 2 — Ganti di RoomCard.tsx

**File:** `frontend/src/components/rooms/RoomCard.tsx`

**HAPUS** fungsi `buildWhatsAppUrl` di baris 34-44 (seluruh function body).

**TAMBAH** import di paling atas:
```typescript
import { buildAdminWaUrl } from '../../utils/whatsapp';
```

**GANTI** semua pemanggilan `buildWhatsAppUrl(...)` → `buildAdminWaUrl(...)`.
Cari dengan grep `buildWhatsAppUrl` di file ini, ada di sekitar baris 184.
Ganti:
```typescript
const waUrl = buildWhatsAppUrl(room, waMessage);
```
→
```typescript
const waUrl = buildAdminWaUrl(waMessage ?? `Halo Admin KOST48, saya tertarik dengan kamar ${room.code || `#${room.id}`}.`);
```

**HAPUS** export `buildWhatsAppUrl` dari barrel export bila ada (cek `index.ts` di folder rooms).

#### Step 3 — Ganti di RoomComparePanel.tsx

**File:** `frontend/src/components/rooms/RoomComparePanel.tsx`

**HAPUS** fungsi `buildWaInterestUrl` di baris 8-13.

**TAMBAH** import:
```typescript
import { buildAvailabilityWaUrl } from '../../utils/whatsapp';
```

**GANTI** pemanggilan di baris 169:
```typescript
href={buildWaInterestUrl(room)}
```
→
```typescript
href={buildAvailabilityWaUrl(room.code || `Kamar #${room.id}`)}
```

#### Step 4 — Ganti di GuestBookingPage.tsx

**File:** `frontend/src/pages/bookings/GuestBookingPage.tsx`

**HAPUS** fungsi `buildWaAvailabilityUrl` di baris 17-23.

**TAMBAH** import:
```typescript
import { buildAvailabilityWaUrl } from '../../utils/whatsapp';
```

**GANTI** pemanggilan di baris 144:
```typescript
const waUrl = buildWaAvailabilityUrl(roomCode, isChecking);
```
→
```typescript
const waUrl = buildAvailabilityWaUrl(roomCode, isChecking);
```
(Tidak ada perubahan fungsional — hanya ganti source import.)

#### Step 5 — Ganti di publicGuestShared.tsx

**File:** `frontend/src/pages/public/publicGuestShared.tsx`

**HAPUS** fungsi `buildWhatsAppUrl` (baris 216-218) dan `buildRoomWhatsAppUrl` (baris 220-223).

**TAMBAH** import:
```typescript
import { buildAdminWaUrl, buildRoomWaUrl } from '../../utils/whatsapp';
```

**GANTI** semua pemanggilan:
- `buildWhatsAppUrl(...)` → `buildAdminWaUrl(...)` (sekitar baris 390, 514)
- `buildRoomWhatsAppUrl(room)` → `buildRoomWaUrl(room.code || `Kamar #${room.id}`)` (baris 378, dan cek semua pemakaian `buildRoomWhatsAppUrl`)

#### Step 6 — Ganti di PublicRoomDetailPage.tsx

**File:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx`

**HAPUS** fungsi `buildWhatsAppUrl` di baris 124-132.

**TAMBAH** import:
```typescript
import { buildAdminWaUrl, buildRoomWaUrl } from '../../utils/whatsapp';
```

**GANTI** semua pemanggilan `buildWhatsAppUrl(room)`:
- Baris 187 → `buildRoomWaUrl(room.code || `Kamar #${room.id}`)`
- Baris 292, 297, 489, 507 → sama, gunakan `buildRoomWaUrl(...)`
- Baris 304 (href hardcoded `wa.me/6285648887628`) → `buildAdminWaUrl('Halo Admin, ...')`

#### Step 7 — Ganti raw inline di 6 file lainnya

**Pattern umum:** cari `wa.me/` di setiap file, ganti dengan `buildAdminWaUrl(...)`.

| File | Baris | Ganti dengan |
|------|-------|-------------|
| `ActionQueueTable.tsx` | 65 | `buildAdminWaUrl(message)` |
| `BookingStatusHelper.tsx` | 143 | `buildAdminWaUrl(message)` |
| `StaffGeneralInventorySection.tsx` | 157 | `buildAdminWaUrl('Halo Admin, tolong tambahkan daftar barang gudang...')` |
| `StaffUnifiedWorkQueue.tsx` | 407 | `buildAdminWaUrl(\`Halo Admin, saya mau tanya status tugas: ${...}\`)` |
| `officialKost48Content.ts` | 19 | `buildAdminWaUrl(...)` |
| `ForgotPasswordPage.tsx` | 28 | `buildAdminWaUrl(msg)` |

**Cara mencari:** `grep -n "wa.me/" frontend/src/<file>` untuk setiap file di atas.

#### Step 8 — Update test yang terpengaruh

**File:** `frontend/src/test/components/roomCard.test.tsx`

Cek apakah test meng-import `buildWhatsAppUrl` dari RoomCard. Jika ya:
- **HAPUS** import `buildWhatsAppUrl` dari RoomCard
- **TAMBAH** import dari `../../utils/whatsapp`
- **GANTI** pemanggilan fungsi sesuai API baru (`buildAdminWaUrl` / `buildRoomWaUrl`)

#### Step 9 — Update barrel export bila ada

Cek `frontend/src/components/rooms/index.ts` — bila ada re-export `buildWhatsAppUrl`, hapus.

#### Verifikasi AM-01

```bash
# 1. Tidak ada lagi definisi fungsi WA duplikat
grep -rn "function buildWa\|function buildWhatsAppUrl\|function buildRoomWhatsAppUrl\|function buildWaAvailabilityUrl\|function buildWaInterestUrl" frontend/src/
# Harus KOSONG (semua sudah dihapus)

# 2. Tidak ada raw wa.me/ inline (kecuali di utils/whatsapp.ts)
grep -rn "wa.me/" frontend/src/ | grep -v "utils/whatsapp.ts" | grep -v "node_modules"
# Harus KOSONG

# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-02 — Hapus RoleWorkspaceTabs (duplikat dashboard tabs) 🔴 HIGH

### Masalah

Saat admin membuka dashboard, ada **DUA baris tab** bertumpuk:

```
RoleWorkspaceTabs (ATAS, dari AppLayout):    [Penghuni & Uang]  [Operasional]
Dashboard SegmentedTabs (BAWAH, dari halaman):  [Ringkasan]  [Penghuni & Uang]  [Operasional]
                                                        ↑↑↑ DUPLIKAT ↑↑↑
```

- `RoleWorkspaceTabs` hanya punya 2 tab (Ringkasan sudah dihapus per N-04)
- Dashboard `SegmentedTabs` punya 3 tab (lengkap)
- `RoleWorkspaceTabs` tetap tampil di halaman non-dashboard (lihat AM-04)
- Klik tab RoleWorkspaceTabs dari halaman non-dashboard = kembali ke dashboard (membingungkan)

### Keputusan

**HAPUS `RoleWorkspaceTabs` dari `AppLayout.tsx`.**
Dashboard tetap punya `SegmentedTabs` internal sendiri.
Navigasi antar halaman tetap lewat **sidebar** + **breadcrumb** + **Ctrl+K Command Palette**.

### Langkah Pengerjaan

#### Step 1 — Hapus render RoleWorkspaceTabs dari AppLayout

**File:** `frontend/src/components/layout/AppLayout.tsx`

**CARI** baris yang mengandung `RoleWorkspaceTabs` (sekitar baris 545):
```typescript
{isAdmin || isOwner ? <RoleWorkspaceTabs role={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} /> : null}
```

**HAPUS** baris tersebut. Jangan hapus import dulu — kita butuh untuk AM-04.

#### Step 2 — Hapus import RoleWorkspaceTabs (nanti di AM-04)

JANGAN hapus import dulu. AM-04 akan menggunakannya untuk conditional render.

#### Verifikasi AM-02

```bash
# 1. Dashboard admin tidak lagi menampilkan RoleWorkspaceTabs di atasnya
#    (verifikasi manual: buka /dashboard, lihat tidak ada baris tab "Penghuni & Uang | Operasional" di atas header)

# 2. Build frontend lulus
cd frontend && npm run build
```

---

## AM-03 — Bedakan target "Cek Checkout" vs "Review Booking" 🟡 MED

### Masalah

Dua kartu `AdminWorkLane` berbeda mengarah ke **URL yang persis sama**:

```typescript
// DashboardAdmin.tsx — work lane #1
{ id: 'booking-review', ..., action: 'Review Booking', to: '/stays?status=BOOKINGS' }

// DashboardAdmin.tsx — work lane #4
{ id: 'checkout-flow', ..., action: 'Cek Checkout', to: '/stays?status=BOOKINGS' }
```

Klik "Review Booking" dan "Cek Checkout" menghasilkan halaman `/stays?status=BOOKINGS` — user tidak bisa membedakan konteks.

### Langkah Perbaikan

#### Step 1 — Ubah target work lane "checkout-flow"

**File:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`

**CARI** definisi `adminWorkLanes`, temukan item dengan `id: 'checkout-flow'` (sekitar baris 271-280).

**GANTI** `to` dari `/stays?status=BOOKINGS` menjadi filter yang lebih spesifik.

Cek dulu apakah StaysPage mendukung filter `status=CHECKOUT`:
```bash
grep -n "CHECKOUT\|checkout" frontend/src/pages/stays/StaysPage.tsx
```

**Jika StaysPage mendukung filter CHECKOUT:**
```typescript
// Ganti:
to: '/stays?status=BOOKINGS',
// Menjadi:
to: '/stays?status=CHECKOUT',
```

**Jika StaysPage TIDAK mendukung filter CHECKOUT:**
```typescript
// Ganti:
action: 'Cek Checkout', to: '/stays?status=BOOKINGS',
// Menjadi:
action: 'Cek Checkout', to: '/stays?tab=checkout',
```
Lalu pastikan StaysPage membaca query param `tab` dan mengaktifkan tab checkout.

#### Step 2 — Update ActionQueueItem terkait checkout

**File:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`

Cari item queue dengan `ruleId: 'checkout-review-sla'` dan `ruleId: 'checkout-final-sla'`.
Ganti `actionTo` mereka ke target yang sama dengan work lane checkout.

#### Verifikasi AM-03

```bash
# 1. Klik "Cek Checkout" di dashboard → halaman StaysPage dengan filter checkout
#    (bukan halaman bookings yang sama dengan "Review Booking")

# 2. Build frontend lulus
cd frontend && npm run build
```

---

## AM-04 — Sembunyikan RoleWorkspaceTabs di non-dashboard 🟡 MED

> **Catatan:** Task ini hanya relevan jika AM-02 DIBATALKAN (RoleWorkspaceTabs tetap dipertahankan).
> Jika AM-02 dikerjakan (hapus total), **lewati task ini** dan centang `[x] N/A`.

### Masalah

`RoleWorkspaceTabs` dirender di `AppLayout.tsx` untuk SEMUA halaman admin, bukan hanya dashboard.
Saat admin di `/stays`, `/invoices`, `/tickets`, dll., tab "Penghuni & Uang" dan "Operasional" tetap muncul.
Klik tab tersebut = kembali ke `/dashboard?area=...` — perilaku yang membingungkan.

### Langkah Perbaikan

#### Step 1 — Conditional render hanya di dashboard

**File:** `frontend/src/components/layout/AppLayout.tsx`

**CARI** baris:
```typescript
{isAdmin || isOwner ? <RoleWorkspaceTabs role={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} /> : null}
```

**GANTI** dengan:
```typescript
{(isAdmin || isOwner) && (location.pathname === '/dashboard' || location.pathname === '/admin-dashboard') ? (
  <RoleWorkspaceTabs role={user?.role} ownerViewMode={isOwner ? ownerViewMode : undefined} />
) : null}
```

#### Verifikasi AM-04

```bash
# 1. Buka /stays — RoleWorkspaceTabs TIDAK muncul
# 2. Buka /invoices — RoleWorkspaceTabs TIDAK muncul
# 3. Buka /dashboard — RoleWorkspaceTabs MUNCUL (2 tab)
# 4. Build frontend lulus
cd frontend && npm run build
```

---

## AM-05 — Tambahkan "Pengumuman" ke sidebar admin 🟡 MED

### Masalah

Pengumuman (`/announcements`) hanya bisa diakses lewat tombol kecil "📣 Pengumuman" di topbar kanan atas (`AppLayout.tsx`).
Tidak ada di sidebar admin — user harus TAHU letak tombol ini. Terlalu tersembunyi.

Komentar di `navigation.ts:24`:
> "Pengumuman (/announcements) diakses via tombol 📣 di topbar, bukan sidebar."

### Langkah Perbaikan

#### Step 1 — Tambahkan item Pengumuman ke sidebar admin

**File:** `frontend/src/config/navigation.ts`

**CARI** `adminSections`, di dalam array `links`, **TAMBAH** item baru sebelum "Loyalitas & Reward":

```typescript
{ to: '/announcements', label: 'Pengumuman', icon: '📣', hint: 'Buat dan kelola pengumuman untuk penghuni dan staff.' },
```

Letakkan di antara "Perawatan AC" dan "Loyalitas & Reward".

**HASIL akhir `adminSections[0].links`:**
```typescript
links: [
  { to: '/dashboard', label: 'Dashboard', ... },
  { to: '/stays', label: 'Masa Sewa & Penghuni', ... },
  { to: '/invoices', label: 'Keuangan', ... },
  { to: '/tickets', label: 'Staff & Tiket', ... },
  { to: '/surveys', label: 'Survei Penghuni', ... },
  { to: '/guest-preferences', label: 'Preferensi Tamu', ... },
  { to: '/rooms', label: 'Kamar & Stok', ... },
  { to: '/ac-maintenance', label: 'Perawatan AC', ... },
  { to: '/announcements', label: 'Pengumuman', icon: '📣', hint: 'Buat dan kelola pengumuman untuk penghuni dan staff.' },
  { to: '/loyalty', label: 'Loyalitas & Reward', ... },
],
```

#### Step 2 — Topbar "📣 Pengumuman" button TETAP dipertahankan

Tidak perlu dihapus — akses ganda (sidebar + topbar) untuk halaman yang sering dipakai itu wajar.

#### Verifikasi AM-05

```bash
# 1. Sidebar admin sekarang punya 10 item (termasuk Pengumuman)
# 2. Klik "Pengumuman" di sidebar → navigasi ke /announcements
# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-06 — RoomCard pakai FacilityList (ganti amenity inline) 🟢 LOW

### Masalah

`RoomCard.tsx` me-render amenity chips secara inline dengan `<span>` polos:

```tsx
// RoomCard.tsx baris 242-244
{amenities.length > 0 && (
  <div className="rm-card-amenities">
    {amenities.map((a) => <span key={a}>{a}</span>)}
  </div>
)}
```

Sementara `FacilityList` (komponen yang sudah ada) punya: emoji per kategori,
quantity display, kondisi, catatan tooltip, maxItems, dan compact mode.
`RoomComparePanel` SUDAH menggunakan `FacilityList`.

### Langkah Perbaikan

#### Step 1 — Cari tahu sumber data `amenities`

**File:** `frontend/src/components/rooms/RoomCard.tsx`

Di sekitar baris 162:
```typescript
const amenities = getPublicRoomVisibleAmenities(room).slice(0, 3);
```

Ini menghasilkan `string[]` (nama fasilitas saja). FacilityList butuh `RoomFacility[]`.
Periksa apakah `room.facilities` tersedia sebagai alternatif:
```bash
grep -n "room\.facilities" frontend/src/components/rooms/RoomCard.tsx
```

#### Step 2 — Ganti inline amenities dengan FacilityList

**File:** `frontend/src/components/rooms/RoomCard.tsx`

**TAMBAH** import (jika belum ada):
```typescript
import FacilityList from './FacilityList';
```

**GANTI** blok `rm-card-amenities` (baris 242-244):
```tsx
{amenities.length > 0 && (
  <div className="rm-card-amenities">
    {amenities.map((a) => <span key={a}>{a}</span>)}
  </div>
)}
```

**MENJADI:**
```tsx
<FacilityList
  facilities={room.facilities ?? []}
  compact
  maxItems={3}
  emptyMessage=""
/>
```

> **Catatan:** Jika `room.facilities` tidak selalu tersedia, fallback ke array kosong.
> `emptyMessage=""` menyembunyikan teks "Belum ada fasilitas" (sesuai perilaku lama).

#### Step 3 — Hapus CSS rm-card-amenities jika sudah tidak dipakai

Cek apakah `.rm-card-amenities` masih digunakan di file CSS:
```bash
grep -rn "rm-card-amenities" frontend/src/styles/
```
Jika hanya digunakan di RoomCard dan sudah tidak dipakai, hapus dari CSS.

#### Verifikasi AM-06

```bash
# 1. RoomCard menampilkan amenity chips dengan emoji kategori (pakai FacilityList)
# 2. Tidak ada error di console
# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-07 — Fix RoomComparePanel spec detection (regex→utility) 🔴 HIGH

### Masalah

`RoomComparePanel.tsx` mendeteksi spek kamar (KM dalam/luar, AC/kipas, ukuran)
dengan **REGEX pada teks gabungan** — rawan false positive dan bisa menghasilkan
label BERBEDA dari RoomCard untuk kamar yang sama.

```typescript
// RoomComparePanel.tsx baris 42-54 — RENTAN BUG
function getBathroomLabel(room: PublicRoom) {
  return /km\s*dalam|kamar mandi dalam|.../.test(allRoomText(room))
    ? 'Kamar mandi dalam' : 'Kamar mandi luar';
}
function getCoolingLabel(room: PublicRoom) {
  return /\bac\b|air conditioner|.../.test(allRoomText(room)) ? 'AC' : 'Kipas angin';
}
function getSizeLabel(room: PublicRoom) {
  return /besar|large|deluxe|.../.test(allRoomText(room)) ? 'Besar' : 'Standar';
}
```

Sementara RoomCard menggunakan fungsi dari `utils/publicRoomDisplay.ts`:
- `getPublicRoomBathroom(room)` → `'inside' | 'outside'`
- `getPublicRoomCooling(room)` → `'ac' | 'fan'`
- `getPublicRoomBathroomLabel(room)` → `'Kamar mandi dalam' | 'Kamar mandi luar'`

### Langkah Perbaikan

#### Step 1 — Cari shared utility untuk spek kamar

**Jalankan:**
```bash
grep -n "export function getPublicRoom" frontend/src/utils/publicRoomDisplay.ts
```

Catat nama-nama fungsi yang tersedia:
- `getPublicRoomBathroom(room)` — return `'inside' | 'outside'`
- `getPublicRoomCooling(room)` — return `'ac' | 'fan'`
- `getPublicRoomBathroomLabel(room)` — return label bahasa Indonesia
- `getPublicRoomCoolingLabel(room)` — return label bahasa Indonesia

#### Step 2 — Ganti fungsi lokal di RoomComparePanel

**File:** `frontend/src/components/rooms/RoomComparePanel.tsx`

**TAMBAH** import (cek nama eksak fungsi):
```typescript
import {
  getPublicRoomBathroomLabel,
  getPublicRoomCoolingLabel,
  // cek apakah ada getPublicRoomSizeLabel — jika tidak, cari alternatifnya
} from '../../utils/publicRoomDisplay';
```

**HAPUS** fungsi lokal: `getBathroomLabel`, `getCoolingLabel`, `getSizeLabel`, `allRoomText`, `normalizeText`.

**GANTI** di tabel compare:

Untuk "Kamar mandi":
```tsx
// Sebelum:
{rooms.map((room) => <td key={room.id} className="text-center">{getBathroomLabel(room)}</td>)}
// Sesudah:
{rooms.map((room) => <td key={room.id} className="text-center">{getPublicRoomBathroomLabel(room)}</td>)}
```

Untuk "Pendingin":
```tsx
// Sebelum:
{rooms.map((room) => <td key={room.id} className="text-center">{getCoolingLabel(room)}</td>)}
// Sesudah:
{rooms.map((room) => <td key={room.id} className="text-center">{getPublicRoomCoolingLabel(room)}</td>)}
```

Untuk "Ukuran":
```tsx
// Sebelum:
{rooms.map((room) => <td key={room.id} className="text-center">{getSizeLabel(room)}</td>)}
// Sesudah:
{rooms.map((room) => <td key={room.id} className="text-center">
  {room.pricing?.monthlyRateRupiah && room.pricing.monthlyRateRupiah > 2_000_000 ? 'Besar' : 'Standar'}
</td>)}
```
> Jika ada utility shared untuk ukuran, gunakan itu. Jika tidak, gunakan logika sederhana di atas.

#### Step 3 — Cek konsistensi dengan RoomCard

**File:** `frontend/src/components/rooms/RoomCard.tsx`

Pastikan RoomCard juga menggunakan fungsi yang sama dari `publicRoomDisplay.ts`:
```bash
grep -n "getPublicRoomBathroom\|getPublicRoomCooling\|getPublicRoomBathroomLabel\|getPublicRoomCoolingLabel" frontend/src/components/rooms/RoomCard.tsx
```
RoomCard di baris 230-239 menggunakan `getPublicRoomBathroom(room)`, `getPublicRoomBathroomLabel(room)`, dll.

#### Verifikasi AM-07

```bash
# 1. RoomComparePanel menampilkan spek yang SAMA dengan RoomCard untuk kamar yang sama
#    (verifikasi manual: buka halaman bandingkan, bandingkan label KM/pendingin dengan card)

# 2. Tidak ada fungsi regex-based detection tersisa di RoomComparePanel
grep -n "allRoomText\|normalizeText\|getBathroomLabel\|getCoolingLabel\|getSizeLabel" frontend/src/components/rooms/RoomComparePanel.tsx
# Harus KOSONG

# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-08 — Buat RoomPriceTable komponen reusable 🟢 LOW

> **Catatan:** Task ini LOW priority. Hanya kerjakan jika 3 layout tabel harga memang bisa
> disatukan tanpa over-engineering. Jika ternyata terlalu berbeda, lewati dan centang `[x] N/A`.

### Masalah

Tiga tempat me-render tabel harga sewa dengan layout berbeda:

| Tempat | File | Baris | Layout |
|--------|------|-------|--------|
| RoomCard | `RoomCard.tsx` | 247 | `<table className="rm-card-price-table">` — compact vertical |
| PublicRoomDetailPage | `PublicRoomDetailPage.tsx` | 385 | `<Table className="room-detail-rate-table">` — full-width horizontal |
| RoomComparePanel | `RoomComparePanel.tsx` | 91 | `<tr>` per term dalam tabel perbandingan horizontal |

### Langkah Perbaikan (jika dikerjakan)

#### Step 1 — Buat komponen bersama

**Buat file:** `frontend/src/components/rooms/RoomPriceTable.tsx`

```typescript
import { Table } from 'react-bootstrap';
import type { PublicRoom } from '../../types';
import { calculateRentByPricingTerm, PRICING_TERM, TERM_LABELS } from '../../utils/pricing';
import { formatRupiah } from '../../utils/formatCurrency';

interface RoomPriceTableProps {
  room: PublicRoom;
  variant?: 'card' | 'detail' | 'compare';
}

const ALL_TERMS = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SMESTERLY', 'YEARLY'] as const;

export default function RoomPriceTable({ room, variant = 'card' }: RoomPriceTableProps) {
  const monthlyRate = room.pricing?.monthlyRateRupiah ?? 0;

  if (variant === 'compare') {
    // Untuk compare panel: return array of {term, rate} — rendering di parent
    return null; // TODO: implementasi
  }

  const rows = ALL_TERMS.map((term) => ({
    term,
    label: TERM_LABELS[term] ?? term,
    rate: monthlyRate > 0 ? calculateRentByPricingTerm(monthlyRate, term) : 0,
    isMonthly: term === 'MONTHLY',
  }));

  return (
    <Table responsive className={variant === 'detail' ? 'room-detail-rate-table mb-0' : 'rm-card-price-table'}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.term} className={row.isMonthly ? 'rm-price-monthly' : ''}>
            <td>{row.label}</td>
            <td>{row.rate > 0 ? formatRupiah(row.rate) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

> Detail implementasi disesuaikan setelah membaca struktur eksak masing-masing tabel.

#### Verifikasi AM-08

```bash
cd frontend && npm run build
```

---

## AM-09 — Buat RoomSpecChips komponen reusable 🟢 LOW

> **Catatan:** Task ini LOW priority. Spek chip di RoomCard, PublicRoomDetailPage, dan
> RoomComparePanel punya layout yang sangat berbeda (chip horizontal vs grid fitur vs baris tabel).
> Jika over-engineer, lewati dan centang `[x] N/A`.

### Masalah

Tiga tempat menampilkan spek kamar (KM, pendingin, ukuran, tipe) dengan implementasi berbeda:

| Tempat | File | Format |
|--------|------|--------|
| RoomCard | `RoomCard.tsx:230` | `<div className="rm-card-specs">` — 4 chip horizontal |
| PublicRoomDetailPage | `PublicRoomDetailPage.tsx:134` | `<DetailFeatureCard>` — grid 2×2 dengan ikon |
| RoomComparePanel | `RoomComparePanel.tsx:55-62` | Baris tabel (KM, Pendingin, Ukuran) |

### Langkah Perbaikan (jika dikerjakan)

#### Step 1 — Pastikan logic deteksi spek sudah shared

Setelah AM-07, semua tempat menggunakan fungsi yang sama dari `utils/publicRoomDisplay.ts`.
Tidak perlu komponen UI terpisah jika layout memang berbeda.

Cukup pastikan:
- Semua pakai `getPublicRoomBathroomLabel(room)` — bukan regex manual
- Semua pakai `getPublicRoomCoolingLabel(room)` — bukan regex manual
- Logic ukuran konsisten (berdasarkan harga atau data room)

#### Verifikasi AM-09

```bash
# Cek tidak ada regex-based room spec detection di manapun
grep -rn "km\s*dalam|kamar mandi dalam|\bac\b|air conditioner" frontend/src/ | grep -v "utils/publicRoomDisplay.ts" | grep -v "node_modules" | grep -v ".css"
# Harus KOSONG

cd frontend && npm run build
```

---

## AM-11 — Hapus tombol "Buka laporan" di OwnerDashboard (duplikat sidebar) 🟡 MED

### Masalah

`OwnerDashboardPage.tsx` punya tombol permanen "Buka laporan" → `/reports`
yang **duplikat** dengan sidebar owner item "Laporan Bisnis" → `/reports`.

```tsx
// OwnerDashboardPage.tsx baris 280
<Button size="sm" className="owner-report-button" onClick={() => navigate('/reports')}>
  Buka laporan
</Button>
```

Sidebar owner (`navigation.ts`):
```typescript
{ to: '/reports', label: 'Laporan Bisnis', icon: '📊', hint: 'Operasional, laba rugi, arus kas, neraca, dan rasio keuangan.' }
```

User yang duduk di kokpit owner bisa mencapai `/reports` lewat **2 jalur berbeda**
dari layar yang sama (sidebar + tombol dashboard). Tidak ada nilai tambah — sidebar
sudah menyediakan akses yang persis sama.

### Langkah Perbaikan

#### Step 1 — Hapus tombol "Buka laporan"

**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`

**CARI** baris:
```tsx
<Button size="sm" className="owner-report-button" onClick={() => navigate('/reports')}>Buka laporan</Button>
```

**HAPUS** seluruh elemen `<Button>` tersebut. Pastikan tidak merusak layout parent (mungkin ada di dalam `<div>` atau card header — periksa struktur sekitarnya).

#### Step 2 — Cek apakah ada import yang jadi tidak terpakai

Setelah hapus tombol, jalankan build. Jika `Button` dari react-bootstrap atau `navigate` jadi tidak terpakai (karena mungkin hanya dipakai di tombol itu), hapus import yang tidak terpakai.

#### Verifikasi AM-11

```bash
# 1. OwnerDashboardPage tidak lagi menampilkan tombol "Buka laporan"
# 2. Sidebar "Laporan Bisnis" tetap berfungsi sebagai akses utama ke /reports
# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-12 — Hapus tombol "Lengkapi setup akuntansi" di FinancialRatiosPage 🟡 MED

### Masalah

`FinancialRatiosPage.tsx` punya tombol "Lengkapi setup akuntansi" → `/finance/accounting-setup`
yang **duplikat** dengan sidebar owner item "Akuntansi & Aset" → `/finance/accounting-setup`.

```tsx
// FinancialRatiosPage.tsx baris 72
<Button variant="outline-primary" size="sm" className="mt-3" onClick={() => navigate('/finance/accounting-setup')}>
  Lengkapi setup akuntansi
</Button>
```

Tombol ini hanya muncul ketika `!d.formalStatementReady` (akuntansi belum siap).
Tapi sidebar "Akuntansi & Aset" SUDAH menyediakan akses yang persis sama setiap saat.

### Langkah Perbaikan

#### Step 1 — Hapus tombol

**File:** `frontend/src/pages/reports/FinancialRatiosPage.tsx`

**CARI** baris yang mengandung `Lengkapi setup akuntansi` (sekitar baris 72).

**HAPUS** seluruh elemen `<Button>` tersebut.

#### Step 2 — Cek apakah empty state masih informatif

Setelah tombol dihapus, pastikan empty state (jika ada) masih memberitahu user bahwa
setup akuntansi perlu dilengkapi, meskipun tanpa tombol CTA. Sidebar sudah cukup sebagai
jalur akses.

#### Verifikasi AM-12

```bash
# 1. FinancialRatiosPage tidak lagi menampilkan tombol "Lengkapi setup akuntansi"
# 2. Sidebar "Akuntansi & Aset" tetap berfungsi sebagai akses ke /finance/accounting-setup
# 3. Build frontend lulus
cd frontend && npm run build
```

---

## AM-10 — Dokumentasi + Changelog 🟢 LOW

### Langkah Pengerjaan

#### Step 1 — Centang checklist di file ini (M14)

Update tabel di atas: semua task yang selesai → `[x]`.

#### Step 2 — Tambah entri changelog

**File:** `docs/M13_CHANGELOG.md`

Tambahkan di paling atas (sebelum entri terbaru):

```
### 4 Jul 2026
- **AM-01..AM-12** — Redundansi UI/UX: unifikasi 12 WA URL builder → 1 file utils/whatsapp.ts,
  hapus RoleWorkspaceTabs duplikat, bedakan target checkout vs booking di work lane,
  Pengumuman masuk sidebar admin, RoomCard pakai FacilityList,
  fix RoomComparePanel spec detection (regex→shared utility),
  hapus tombol duplikat di OwnerDashboard & FinancialRatiosPage.
  Build frontend ✅
```

#### Step 3 — Update M12 ANTRIAN

**File:** `docs/M12_CHECKLIST_CHANGELOG.md`

Cari bagian `## ANTRIAN EKSEKSUI AKTIF`, tambahkan:

```
> **Fase AM — Redundansi UI/UX** — lihat `docs/M14_REDUNDANSI_UI_UX.md`
```

#### Verifikasi AM-10

```bash
# 1. M14 checklist tercentang
# 2. M13 ada entri changelog baru
# 3. M12 ANTRIAN terupdate
```

---

## Gate Akhir Fase AM

```bash
# Backend typecheck
cd backend && npx tsc --noEmit

# Frontend build
cd frontend && npm run build

# Cek tidak ada definisi fungsi WA duplikat
grep -rn "function buildWa" frontend/src/

# Cek tidak ada raw wa.me/ di luar utils/whatsapp.ts
grep -rn "wa.me/" frontend/src/ | grep -v "utils/whatsapp.ts" | grep -v "node_modules"

# Cek tidak ada regex-based room spec detection
grep -rn "km\s*dalam|\bac\b.*conditioner" frontend/src/ | grep -v "utils/publicRoomDisplay.ts" | grep -v "node_modules"
```

---

## Lampiran: Peta File yang Tersentuh

| File | Task | Operasi |
|------|------|---------|
| `frontend/src/utils/whatsapp.ts` | AM-01 | **BUAT BARU** |
| `frontend/src/components/rooms/RoomCard.tsx` | AM-01, AM-06 | Edit (hapus fungsi WA + ganti amenities) |
| `frontend/src/components/rooms/RoomComparePanel.tsx` | AM-01, AM-07 | Edit (hapus fungsi WA + fix spec detection) |
| `frontend/src/pages/bookings/GuestBookingPage.tsx` | AM-01 | Edit (ganti import WA) |
| `frontend/src/pages/public/publicGuestShared.tsx` | AM-01 | Edit (hapus 2 fungsi WA) |
| `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` | AM-01 | Edit (hapus fungsi WA) |
| `frontend/src/components/command-center/ActionQueueTable.tsx` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/components/portal/BookingStatusHelper.tsx` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/components/staff/StaffGeneralInventorySection.tsx` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/components/staff/StaffUnifiedWorkQueue.tsx` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/data/officialKost48Content.ts` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/pages/auth/ForgotPasswordPage.tsx` | AM-01 | Edit (ganti wa.me inline) |
| `frontend/src/test/components/roomCard.test.tsx` | AM-01 | Edit (update import WA) |
| `frontend/src/components/layout/AppLayout.tsx` | AM-02 | Edit (hapus RoleWorkspaceTabs) |
| `frontend/src/pages/dashboard/DashboardAdmin.tsx` | AM-03 | Edit (ubah target checkout) |
| `frontend/src/config/navigation.ts` | AM-05 | Edit (tambah Pengumuman) |
| `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` | AM-11 | Edit (hapus tombol "Buka laporan") |
| `frontend/src/pages/reports/FinancialRatiosPage.tsx` | AM-12 | Edit (hapus tombol "Lengkapi setup akuntansi") |
| `docs/M13_CHANGELOG.md` | AM-10 | Edit (entri changelog) |
| `docs/M12_CHECKLIST_CHANGELOG.md` | AM-10 | Edit (update antrian) |
