# Spec Eksekusi Fase L — L08..L11 (Public / Dashboard / Tenant / Reports)

> Spec ultra-detail untuk dieksekusi langkah demi langkah. SEBELUM = copy persis dari file (jangan parafrase). Setiap perubahan punya gate verifikasi.
>
> Path root frontend: `frontend/src`
> Build gate global tiap task: `cd frontend; npm run build` harus hijau.

---

## L-08 — PublicRoomsPage: Filter Mobile + Carousel Touch + Pagination Ellipsis

### Temuan audit (hasil baca file)
- Filter bar = `<div className="rm-filter-bar">` (baris 415). **Tidak ada** toggle show/hide untuk mobile — semua grup chip selalu tampil. Tidak ada class collapse.
- Carousel (`RoomCardImage`, baris 51-108) hanya auto-rotate saat `hovered === true` (baris 66-70). Di perangkat sentuh (mobile) tidak ada hover → carousel diam, dots terlihat tapi tidak berputar.
- Pagination (baris 530-550) me-render **semua** nomor halaman via `Array.from({ length: totalPages }, ...).map(...)` — **belum ada ellipsis**. Untuk katalog 48 kamar / 12 per halaman = max 4 halaman, jadi ellipsis BELUM mendesak, tapi tetap diperbaiki agar tahan jika `ROOMS_PER_PAGE` diturunkan.
- Compare counter ditampilkan di `rm-compare-bar` (baris 561-565): `<strong>{comparedRooms.length} kamar dipilih</strong>`. **Tidak ada teks "x/3"** atau indikator maksimal. Tombol compare per-kartu sudah benar di-disable via prop `compareDisabled` (baris 161) saat `!isCompared && comparedRoomIds.length >= 3` (baris 521).

### File yang diubah
- `frontend/src/pages/rooms/PublicRoomsPage.tsx` — tambah toggle filter mobile, perbaiki carousel untuk touch, ubah counter compare jadi "x/3", tambah ellipsis pagination.

---

### Perubahan 1: Carousel berputar di mobile (bukan hanya saat hover)
**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
**Grep untuk menemukan:** `if (!hovered || resolved.length <= 1) return undefined;`

**SEBELUM:**
```tsx
  useEffect(() => {
    if (!hovered || resolved.length <= 1) return undefined;
    const t = window.setInterval(() => setActiveIndex((i) => (i + 1) % resolved.length), 1200);
    return () => clearInterval(t);
  }, [hovered, resolved.length]);
```

**SESUDAH:**
```tsx
  // L-08: di desktop putar saat hover (1.2s); di perangkat sentuh tidak ada hover,
  // jadi putar otomatis lambat (3.5s) agar foto kedua dst tetap terlihat.
  const isTouch = typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(hover: none)').matches;
  useEffect(() => {
    if (resolved.length <= 1) return undefined;
    if (!hovered && !isTouch) return undefined;
    const intervalMs = hovered ? 1200 : 3500;
    const t = window.setInterval(() => setActiveIndex((i) => (i + 1) % resolved.length), intervalMs);
    return () => clearInterval(t);
  }, [hovered, isTouch, resolved.length]);
```

**Penjelasan:** Tambah deteksi `(hover: none)` (perangkat sentuh). Di mobile carousel kini berputar otomatis pelan (3.5s); di desktop tetap cepat saat hover. `isTouch` di-hitung di body komponen agar bisa masuk dependency array.

---

### Perubahan 2: Counter compare "x/3" eksplisit
**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
**Grep untuk menemukan:** `<strong>{comparedRooms.length} kamar dipilih</strong>`

**SEBELUM:**
```tsx
                  <div>
                    <strong>{comparedRooms.length} kamar dipilih</strong>
                    <span>Lihat perbandingan estimasi awal</span>
                  </div>
```

**SESUDAH:**
```tsx
                  <div>
                    <strong>{comparedRooms.length}/3 kamar dipilih</strong>
                    <span>{comparedRooms.length >= 3 ? 'Maksimal tercapai — lihat perbandingan' : 'Lihat perbandingan estimasi awal'}</span>
                  </div>
```

**Penjelasan:** Pengguna jadi tahu batas maksimal (3) dan kapan sudah penuh. Tombol per-kartu sudah otomatis disabled saat 3 dipilih (logika lama tidak diubah).

---

### Perubahan 3: Toggle filter di mobile (collapse)
**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
**Grep untuk menemukan:** `<div className="rm-filter-bar">`

Tambahkan state toggle. **Grep untuk menemukan anchor state:** `const hasActiveFilter = !!(bathroom || cooling || avail || sort !== "price-asc");`

**SEBELUM (deklarasi state, baris ~381):**
```tsx
  const hasActiveFilter = !!(bathroom || cooling || avail || sort !== "price-asc");
```

**SESUDAH:**
```tsx
  const hasActiveFilter = !!(bathroom || cooling || avail || sort !== "price-asc");
  // L-08: di mobile filter bisa disembunyikan agar tidak makan layar.
  const [filtersOpen, setFiltersOpen] = useState(false);
```

Lalu ubah pembungkus filter bar.

**SEBELUM (baris 414-415):**
```tsx
            {/* ── Filter bar ── */}
            <div className="rm-filter-bar">
```

**SESUDAH:**
```tsx
            {/* ── Filter bar ── */}
            {/* L-08: tombol toggle hanya tampil di mobile (CSS d-lg-none) */}
            <button
              type="button"
              className="rm-filter-toggle d-lg-none"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? '✕ Tutup filter' : '☰ Filter & urutkan'}
              {hasActiveFilter ? <span className="rm-filter-toggle-dot" aria-hidden="true" /> : null}
            </button>
            <div className={`rm-filter-bar${filtersOpen ? ' is-open' : ''}`}>
```

**Penjelasan:** Pada layar besar (`d-lg-none` menyembunyikan tombol) filter bar tampil normal. Pada mobile tombol toggle muncul; class `is-open` mengontrol visibilitas. **WAJIB ditambah CSS** (lihat Perubahan 4).

---

### Perubahan 4: CSS pendukung toggle filter mobile
**File:** cari file CSS yang memuat class `rm-filter-bar`.
**Grep untuk menemukan:** `.rm-filter-bar` (jalankan: `grep -rn "rm-filter-bar" frontend/src --include=*.css`)

Tambahkan di file CSS yang sama dengan `.rm-filter-bar`:

```css
/* L-08: toggle filter mobile */
.rm-filter-toggle {
  width: 100%;
  border: 1px solid var(--bs-border-color, #dee2e6);
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.rm-filter-toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
}
@media (max-width: 991.98px) {
  .rm-filter-bar { display: none; }
  .rm-filter-bar.is-open { display: flex; }
}
```

**Penjelasan:** Di breakpoint < 992px (Bootstrap `lg`), filter bar tersembunyi sampai `is-open`. Di >= 992px aturan media query tidak berlaku → filter bar selalu tampil seperti semula. **PENTING:** jika `.rm-filter-bar` sudah punya `display: flex` di luar media query, biarkan — media query menimpanya hanya di mobile.

---

### Perubahan 5: Ellipsis pada pagination (opsional bila totalPages bisa > 5)
**File:** `frontend/src/pages/rooms/PublicRoomsPage.tsx`
**Grep untuk menemukan:** `{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (`

**SEBELUM:**
```tsx
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === safePage ? "primary" : "outline-secondary"}
                    aria-current={p === safePage ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
```

**SESUDAH:**
```tsx
                {(() => {
                  // L-08: tampilkan hal.1, hal.terakhir, dan ±1 di sekitar halaman aktif; sisanya "…".
                  const pages: (number | 'gap')[] = [];
                  for (let p = 1; p <= totalPages; p++) {
                    if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) {
                      pages.push(p);
                    } else if (pages[pages.length - 1] !== 'gap') {
                      pages.push('gap');
                    }
                  }
                  return pages.map((p, idx) =>
                    p === 'gap' ? (
                      <span key={`gap-${idx}`} className="rm-pagination-ellipsis" aria-hidden="true">…</span>
                    ) : (
                      <Button
                        key={p}
                        size="sm"
                        variant={p === safePage ? "primary" : "outline-secondary"}
                        aria-current={p === safePage ? "page" : undefined}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ),
                  );
                })()}
```

**Penjelasan:** Mencegah deretan tombol meledak jika `ROOMS_PER_PAGE` diturunkan / jumlah kamar bertambah. Untuk 4 halaman saat ini hasilnya identik (tak ada gap). `rm-pagination-ellipsis` boleh diberi `padding: 0 4px; color: #94a3b8;` di CSS (opsional).

---

### Catatan: PaginationControls.tsx
**`frontend/src/components/common/PaginationControls.tsx` TIDAK dipakai oleh PublicRoomsPage** (PublicRoomsPage punya pagination inline sendiri). Komponen ini hanya menampilkan "Halaman X dari Y" + tombol prev/next, tanpa nomor halaman, jadi **tidak relevan untuk ellipsis**. Jika audit menyebut "tambah ellipsis di PaginationControls" → **Tidak ditemukan masalah — skip**, karena komponen ini memang tidak merender daftar nomor halaman (desain by-prev/next). Tidak perlu diubah.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅
- [ ] Mobile (lebar < 992px): tombol "☰ Filter & urutkan" muncul, klik membuka/menutup filter.
- [ ] Desktop (>= 992px): tombol toggle hilang, filter bar selalu tampil.
- [ ] Di emulator mobile: foto kamar dengan >1 gambar berputar otomatis pelan.
- [ ] Compare 3 kamar → bar bawah menampilkan "3/3 kamar dipilih" + teks "Maksimal tercapai".

---

## L-09 — OwnerDashboard: Error Badge + Loading Konsisten

### Temuan audit (hasil baca file)
Pola `isLoading ? '…' : isError ? '—'` **HANYA** ada pada 2 kartu status:
- Baris 370 (kartu `meter-due`): `value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? '—' : ` + `${meter?.due ?? 0}`
- Baris 378 (kartu `readiness`): `value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? '—' : ` + `${readiness?.score ?? 0}%`

Dua kartu lain **tidak konsisten**:
- Kartu `occupancy` (baris 351-358): `value: ` + `${occupancy}%` — langsung dari `data.kpi.occupancyRatePercent`. Tidak ada state error sendiri (bergantung query `dashboard` yang sudah dijaga di level atas, baris 447-452). **OK secara fungsional** karena seluruh blok `statusCards` hanya dirender saat `data` ada (baris 470, dibungkus `data ?`). Jadi occupancy & arrears tidak butuh `'—'` — mereka tak akan dirender tanpa data.
- Kartu `arrears` (baris 360-366): sama, dari `data.signals`.

**Kesimpulan L-09 poin 1-2:** Loading/error occupancy & arrears konsisten *secara desain* (dijaga di level induk). Yang perlu diselaraskan adalah **simbol** `—`/`…`: keduanya muncul tanpa konteks (pengguna tak tahu artinya "gagal"). Perbaikan: ganti `'—'` menjadi badge/teks "Gagal" yang lebih jelas.

Poin lain:
- **Quick-action buttons (baris 580):** `<div className="d-flex gap-2 flex-wrap mb-3">` — **sudah ada `flex-wrap`**. **Tidak ditemukan masalah — skip** untuk flex-wrap.
- **AI panel (baris 546-573 & 594-649):** kondisi `canUseOwnerAi` (= `ownerAiStatusQuery.data?.configured === true`, baris 339). Saat false menampilkan `<Alert variant="secondary">AI belum dikonfigurasi.</Alert>` **tanpa link ke settings**. Perbaikan: tambah link ke halaman setting AI.

### File yang diubah
- `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` — perjelas indikator error kartu status (badge "Gagal"), tambah link settings di alert "AI belum dikonfigurasi".

---

### Perubahan 1: Helper indikator error kartu status yang jelas
**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`
**Grep untuk menemukan:** `type StatusCard = { key: string; label: string; value: string; helper: string; route: string; tone: string };`

Tambah komponen helper kecil tepat sebelum `OwnerStatusStrip`.

**SEBELUM:**
```tsx
type StatusCard = { key: string; label: string; value: string; helper: string; route: string; tone: string };

/** OWN-STATUS-CARDS: kartu status kokpit owner — okupansi, tunggakan, meter due, go-live readiness. */
function OwnerStatusStrip({ cards, onNavigate }: { cards: StatusCard[]; onNavigate: (route: string) => void }) {
```

**SESUDAH:**
```tsx
type StatusCard = { key: string; label: string; value: string; helper: string; route: string; tone: string };

// L-09: penanda baku saat sumber data kartu gagal dimuat (lebih jelas dari "—").
const CARD_ERROR_VALUE = 'Gagal';

/** OWN-STATUS-CARDS: kartu status kokpit owner — okupansi, tunggakan, meter due, go-live readiness. */
function OwnerStatusStrip({ cards, onNavigate }: { cards: StatusCard[]; onNavigate: (route: string) => void }) {
```

**Penjelasan:** Konstanta dipakai konsisten di kartu meter-due & readiness, menggantikan simbol `—` yang ambigu.

---

### Perubahan 2: Kartu meter-due — value error jadi "Gagal", tone "risk"
**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`
**Grep untuk menemukan:** `value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? '—' : `

**SEBELUM:**
```tsx
      {
        key: 'meter-due',
        label: 'Meter belum dicatat',
        value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? '—' : `${meter?.due ?? 0}`,
        helper: meter ? `${meter.recorded}/${meter.occupied} kamar tercatat` : 'Catat siklus meter bulan ini',
        route: '/meter-readings',
        tone: (meter?.due ?? 0) > 0 ? 'watch' : 'good',
      },
```

**SESUDAH:**
```tsx
      {
        key: 'meter-due',
        label: 'Meter belum dicatat',
        value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? CARD_ERROR_VALUE : `${meter?.due ?? 0}`,
        helper: meterDueQuery.isError ? 'Gagal memuat — coba muat ulang' : meter ? `${meter.recorded}/${meter.occupied} kamar tercatat` : 'Catat siklus meter bulan ini',
        route: '/meter-readings',
        tone: meterDueQuery.isError ? 'risk' : (meter?.due ?? 0) > 0 ? 'watch' : 'good',
      },
```

**Penjelasan:** Saat query gagal, kartu menunjukkan "Gagal" + helper jelas + tone merah (risk), bukan "—" hijau yang menyesatkan.

---

### Perubahan 3: Kartu readiness — value error jadi "Gagal", tone "risk"
**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`
**Grep untuk menemukan:** `value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? '—' : `

**SEBELUM:**
```tsx
      {
        key: 'readiness',
        label: 'Kesiapan Go-Live',
        value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? '—' : `${readiness?.score ?? 0}%`,
        helper: readiness ? (readiness.ready ? 'Akuntansi siap' : `${readiness.missing.length} gate tersisa`) : 'Kesiapan akuntansi',
        route: '/finance/accounting-setup',
        tone: readiness?.ready ? 'good' : (readiness?.score ?? 0) >= 60 ? 'watch' : 'risk',
      },
```

**SESUDAH:**
```tsx
      {
        key: 'readiness',
        label: 'Kesiapan Go-Live',
        value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? CARD_ERROR_VALUE : `${readiness?.score ?? 0}%`,
        helper: readinessQuery.isError ? 'Gagal memuat — coba muat ulang' : readiness ? (readiness.ready ? 'Akuntansi siap' : `${readiness.missing.length} gate tersisa`) : 'Kesiapan akuntansi',
        route: '/finance/accounting-setup',
        tone: readinessQuery.isError ? 'risk' : readiness?.ready ? 'good' : (readiness?.score ?? 0) >= 60 ? 'watch' : 'risk',
      },
```

**Penjelasan:** Konsisten dengan kartu meter-due.

---

### Perubahan 4: Link ke setting AI pada alert "AI belum dikonfigurasi" (2 lokasi)
**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`
**Grep untuk menemukan:** `<Alert variant="secondary" className="mb-0 small">AI belum dikonfigurasi.</Alert>`

Ada **2 kemunculan identik** (baris 572 di panel "Analisis AI", baris 648 di panel "Ringkasan Bisnis AI"). Ganti **keduanya** (gunakan replace_all jika alat mendukung, atau ubah satu per satu — teks identik).

**SEBELUM (x2):**
```tsx
                    <Alert variant="secondary" className="mb-0 small">AI belum dikonfigurasi.</Alert>
```

**SESUDAH (x2):**
```tsx
                    <Alert variant="secondary" className="mb-0 small">
                      AI belum dikonfigurasi.{' '}
                      <Alert.Link onClick={() => navigate('/settings/ai')} style={{ cursor: 'pointer' }}>
                        Atur AI
                      </Alert.Link>
                    </Alert>
```

**Penjelasan:** Owner langsung bisa menuju setting AI. **PENTING — verifikasi route dulu:** jalankan `grep -rn "settings/ai\|ai-settings\|owner-ai\|/settings" frontend/src/App.tsx` untuk memastikan path benar. Jika route AI settings berbeda (mis. `/owner/ai-settings`), ganti string `'/settings/ai'` sesuai route nyata. `navigate` sudah tersedia di scope (baris 301).

> Jika ternyata TIDAK ada halaman setting AI di router, batalkan Perubahan 4 dan catat "skip — tidak ada route settings AI". Jangan membuat link mati.

---

### Quick-action layout (poin 4 audit)
**Grep untuk menemukan:** `<div className="d-flex gap-2 flex-wrap mb-3">`
Baris 580 sudah memiliki `flex-wrap`. **Tidak ditemukan masalah — skip.** Layout tombol sudah membungkus di layar sempit.

### Status card lain (occupancy & arrears)
Kartu occupancy (baris 351-358) dan arrears (baris 360-366) **tidak butuh** indikator error sendiri karena seluruh `OwnerStatusStrip` hanya dirender di dalam `{data ? (...) : null}` (baris 454 & 470) dan dashboard error sudah ditangani Alert global (baris 447-452). **Tidak ada perubahan** pada keduanya.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅
- [ ] Matikan backend / blok endpoint meter & readiness → kartu menampilkan "Gagal" merah + helper "Gagal memuat — coba muat ulang" (bukan "—" hijau).
- [ ] Set AI tidak terkonfigurasi → alert "AI belum dikonfigurasi. Atur AI" dengan link yang mengarah ke route settings AI yang valid.
- [ ] Quick-action di mobile membungkus rapi (flex-wrap).

---

## L-10 — Tenant Portal: Image Lightbox (Tiket) + WifiOrder

### Temuan audit (hasil baca file)
**MyTicketsPage.tsx:**
- Foto tiket dirender via `<SafeImage>` (bukan `<img>` langsung), **2 tempat di daftar**:
  - Foto masalah `issueImageUrl` (baris 216-226): `style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}`
  - Foto penyelesaian `resolutionImageUrl` (baris 227-237): style sama.
  - Preview di modal (baris 280-290): juga SafeImage 120x80.
- **Tidak ada `onClick`** pada SafeImage / pembungkusnya → tidak bisa diperbesar (no lightbox). `SafeImage` sendiri (komponen `frontend/src/components/common/SafeImage.tsx`) **tidak menerima prop onClick** — perlu dibungkus elemen klik-able, atau ditambah prop. Foto 120x80 terlalu kecil untuk melihat detail kerusakan.

**WifiOrderPage.tsx:**
- "Sudah dipesan" = `<Badge bg="success-subtle" ...>` (baris 60), tanpa tombol di sekitarnya (badge menggantikan tombol "Pesan Sekarang"). Konsisten.
- Step indicator (1-2-3) = `<div className="tenant-wifi-steps mb-2">` (baris 90-94) dengan `<span><strong>1</strong> ...`. Class `tenant-wifi-steps` **sudah ada** (asumsi CSS tersedia).
- Nomor WhatsApp **hardcoded di 2 tempat**:
  - Baris 7: `const WHATSAPP_NUMBER = '6285648887628';`
  - Baris 96 (teks tampil): `<strong>Kontak WhatsApp:</strong> 0856-4888-7628`

### File yang diubah
- `frontend/src/components/common/SafeImage.tsx` — tambah dukungan prop `onClick` (opsional, agar reusable untuk lightbox).
- `frontend/src/pages/portal/MyTicketsPage.tsx` — bungkus foto tiket agar bisa diklik → buka lightbox (Modal).
- `frontend/src/pages/portal/WifiOrderPage.tsx` — jadikan nomor WhatsApp tampil konsisten dari satu sumber (hilangkan hardcode ganda).

---

### Perubahan 1: SafeImage menerima onClick opsional
**File:** `frontend/src/components/common/SafeImage.tsx`
**Grep untuk menemukan:** `resolveUrl?: boolean;`

**SEBELUM:**
```tsx
type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  style?: CSSProperties;
  fallbackTitle?: string;
  fallbackDescription?: string;
  resolveUrl?: boolean;
};
```

**SESUDAH:**
```tsx
type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  style?: CSSProperties;
  fallbackTitle?: string;
  fallbackDescription?: string;
  resolveUrl?: boolean;
  onClick?: () => void; // L-10: izinkan klik (mis. buka lightbox)
};
```

**Grep untuk menemukan:** `  resolveUrl = true,\n}: SafeImageProps) {`

**SEBELUM:**
```tsx
  fallbackDescription = 'Gambar tidak bisa dimuat. Informasi tetap bisa dibaca dari detail di halaman ini.',
  resolveUrl = true,
}: SafeImageProps) {
```

**SESUDAH:**
```tsx
  fallbackDescription = 'Gambar tidak bisa dimuat. Informasi tetap bisa dibaca dari detail di halaman ini.',
  resolveUrl = true,
  onClick,
}: SafeImageProps) {
```

**Grep untuk menemukan:** `      loading="lazy"\n      onError={() => setFailed(true)}`

**SEBELUM:**
```tsx
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
```

**SESUDAH:**
```tsx
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={onClick ? { cursor: 'zoom-in', ...style } : style}
      loading="lazy"
      onClick={onClick}
      onError={() => setFailed(true)}
    />
  );
```

**Penjelasan:** Prop `onClick` opsional; jika ada, kursor jadi `zoom-in` dan gambar bisa diklik. Komponen lain yang tak mengirim onClick tidak terpengaruh.

---

### Perubahan 2: Lightbox state + Modal di MyTicketsPage
**File:** `frontend/src/pages/portal/MyTicketsPage.tsx`
**Grep untuk menemukan:** `const [imagePreview, setImagePreview] = useState<string | null>(null);`

**SEBELUM:**
```tsx
  const [imagePreview, setImagePreview] = useState<string | null>(null);
```

**SESUDAH:**
```tsx
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // L-10: lightbox foto tiket — simpan url + alt foto yang diklik.
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
```

---

### Perubahan 3: Klik foto masalah → buka lightbox
**File:** `frontend/src/pages/portal/MyTicketsPage.tsx`
**Grep untuk menemukan:** `alt="Bukti laporan"`

**SEBELUM:**
```tsx
              {ticket.issueImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.issueImageUrl}
                    alt="Bukti laporan"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto laporan tidak bisa dimuat"
                    fallbackDescription="Detail laporan tetap tersedia di teks."
                  />
                </div>
              ) : null}
```

**SESUDAH:**
```tsx
              {ticket.issueImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.issueImageUrl}
                    alt="Bukti laporan"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto laporan tidak bisa dimuat"
                    fallbackDescription="Detail laporan tetap tersedia di teks."
                    onClick={() => setLightbox({ src: ticket.issueImageUrl!, alt: 'Bukti laporan' })}
                  />
                </div>
              ) : null}
```

---

### Perubahan 4: Klik foto penyelesaian → buka lightbox
**File:** `frontend/src/pages/portal/MyTicketsPage.tsx`
**Grep untuk menemukan:** `alt="Bukti selesai"`

**SEBELUM:**
```tsx
              {ticket.resolutionImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.resolutionImageUrl}
                    alt="Bukti selesai"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto penyelesaian tidak bisa dimuat"
                    fallbackDescription="Status laporan tetap bisa dibaca."
                  />
                </div>
              ) : null}
```

**SESUDAH:**
```tsx
              {ticket.resolutionImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.resolutionImageUrl}
                    alt="Bukti selesai"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto penyelesaian tidak bisa dimuat"
                    fallbackDescription="Status laporan tetap bisa dibaca."
                    onClick={() => setLightbox({ src: ticket.resolutionImageUrl!, alt: 'Bukti selesai' })}
                  />
                </div>
              ) : null}
```

---

### Perubahan 5: Modal lightbox di akhir komponen
**File:** `frontend/src/pages/portal/MyTicketsPage.tsx`
**Grep untuk menemukan:** `      </Modal>\n    </div>\n  );\n}` (Modal "Buat Laporan Baru" lalu penutup div).

Tepatnya sisipkan SEBELUM `</div>` penutup terakhir, setelah `</Modal>` yang menutup modal "Buat Laporan Baru" (baris 299).

**SEBELUM:**
```tsx
      </Modal>
    </div>
  );
}
```

**SESUDAH:**
```tsx
      </Modal>

      {/* L-10: Lightbox foto tiket */}
      <Modal show={!!lightbox} onHide={() => setLightbox(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h6 mb-0">{lightbox?.alt ?? 'Foto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0 bg-dark">
          {lightbox ? (
            <SafeImage
              src={lightbox.src}
              alt={lightbox.alt}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              fallbackTitle="Foto tidak bisa dimuat"
              fallbackDescription="Coba lagi nanti."
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
}
```

**Penjelasan:** Klik thumbnail 120x80 membuka modal besar (max 80vh). `Modal` & `SafeImage` sudah di-import di file ini (baris 3 & 7).

---

### Perubahan 6: WhatsApp tampil konsisten dari satu sumber
**File:** `frontend/src/pages/portal/WifiOrderPage.tsx`
**Grep untuk menemukan:** `const WHATSAPP_NUMBER = '6285648887628';`

**SEBELUM:**
```tsx
const WHATSAPP_NUMBER = '6285648887628';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
```

**SESUDAH:**
```tsx
const WHATSAPP_NUMBER = '6285648887628';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
// L-10: format tampilan lokal dari satu sumber agar tidak hardcode ganda.
// 6285648887628 -> 0856-4888-7628
const WHATSAPP_DISPLAY = '0' + WHATSAPP_NUMBER.slice(2).replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
```

**Grep untuk menemukan:** `<strong>Kontak WhatsApp:</strong> 0856-4888-7628`

**SEBELUM:**
```tsx
              <div className="alert alert-info small mb-2">
                <strong>Kontak WhatsApp:</strong> 0856-4888-7628
              </div>
```

**SESUDAH:**
```tsx
              <div className="alert alert-info small mb-2">
                <strong>Kontak WhatsApp:</strong> {WHATSAPP_DISPLAY}
              </div>
```

**Penjelasan:** Nomor tampil dihitung dari `WHATSAPP_NUMBER` → kalau nomor diubah, teks ikut otomatis. Tidak ada lagi 2 nomor terpisah yang bisa desinkron. **Verifikasi:** pastikan hasil `WHATSAPP_DISPLAY` = `0856-4888-7628` (regex membagi 856 / 4888 / 7628 → "0856-4888-7628"). Jika format berbeda di nomor lain, regex tetap aman (fallback menampilkan apa adanya hanya jika tak match — dalam kasus tak match, `.replace` mengembalikan string utuh).

### Step indicator & "Sudah dipesan"
- Step indicator `tenant-wifi-steps` (baris 90-94) sudah memakai class CSS yang ada → **Tidak ditemukan masalah — skip** kecuali audit minta restyle. (Jika ingin diperjelas, ini murni CSS, di luar scope spec ini.)
- "Sudah dipesan" sebagai `Badge` (baris 60) sudah benar — menggantikan tombol saat pending. **Tidak diubah.**

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅
- [ ] Buat tiket dengan foto → di daftar, klik thumbnail → modal besar terbuka, foto contain max 80vh, tombol close berfungsi.
- [ ] Kursor pada thumbnail = zoom-in.
- [ ] Halaman Pesan WiFi → teks "Kontak WhatsApp: 0856-4888-7628" tetap benar; tombol WhatsApp tetap ke `wa.me/6285648887628`.

---

## L-11 — ReportsPage: Period Selector + Formal Tab Skeleton + KPI Legend

### Temuan audit (hasil baca file)
- **Period selector** (Tahun/Bulan): di `<section className="report-hero ...">` → `<div className="report-hero-controls">` (baris 106) berisi 2 `<div className="report-period-card">` (baris 107-118) + `ExportAllCsvButton`. Posisi: **header (hero)**, kanan atas. Sudah responsif via class hero. **Fungsional OK.**
- **Tab "Laporan Formal"**: trigger lewat `<ReportTabs ... onChange={changeTab} />` (baris 220). `changeTab` (baris 46-53) set state + URL param. Konten: `{activeTab === 'formal' && <UnlockedFormalReports />}` (baris 297). `UnlockedFormalReports` me-render `BalanceSheetPage`/`ProfitLossPage`/dst **langsung tanpa skeleton/spinner di level wrapper** (baris 30-33). Saat pertama dibuka, jika sub-page fetch data, **tidak ada placeholder di wrapper** → bisa terlihat kosong sejenak. Skeleton (jika ada) bergantung pada masing-masing sub-page.
- **KPI cards** (`ReportKpiCard`, reportShared baris 156-163): render `<div className="report-kpi-card report-kpi-${tone}">` dengan label/value/detail. **Tidak ada legend warna** yang menjelaskan arti tone (blue/cyan/green/orange/red). Sementara chart Owner punya legend (`owner-chart-legend`), KPI report tidak.

### File yang diubah
- `frontend/src/pages/reports/UnlockedFormalReports.tsx` — tambah Suspense-like fallback / minimal skeleton saat sub-tab dimuat pertama kali (lazy-safe).
- `frontend/src/pages/reports/reportShared.tsx` — (opsional) tambah legend warna kecil di bawah grid KPI, atau biarkan jika audit hanya minta konsistensi tooltip.

---

### Perubahan 1: Skeleton ringan di UnlockedFormalReports saat pertama dibuka
**File:** `frontend/src/pages/reports/UnlockedFormalReports.tsx`

Masalah: sub-page (`BalanceSheetPage` dst) di-import statis dan dirender langsung; jika mereka punya loading internal, OK. Untuk menjamin ada feedback saat tab dibuka pertama (sebelum sub-page mount selesai), bungkus body dengan skeleton fallback memakai `Suspense` + `React.lazy`.

**Grep untuk menemukan:** `import BalanceSheetPage from './BalanceSheetPage';`

**SEBELUM:**
```tsx
import React, { useState } from 'react';
import { Card, Nav } from 'react-bootstrap';
import BalanceSheetPage from './BalanceSheetPage';
import ProfitLossPage from './ProfitLossPage';
import CashflowPage from './CashflowPage';
import FinancialRatiosPage from './FinancialRatiosPage';
```

**SESUDAH:**
```tsx
import React, { Suspense, lazy, useState } from 'react';
import { Card, Nav } from 'react-bootstrap';
import { TableSkeleton } from '../../components/common/SkeletonLoader';

const BalanceSheetPage = lazy(() => import('./BalanceSheetPage'));
const ProfitLossPage = lazy(() => import('./ProfitLossPage'));
const CashflowPage = lazy(() => import('./CashflowPage'));
const FinancialRatiosPage = lazy(() => import('./FinancialRatiosPage'));
```

**Grep untuk menemukan:** `<Card.Body className="p-0">`

**SEBELUM:**
```tsx
      <Card.Body className="p-0">
        {active === 'balance-sheet' && <BalanceSheetPage />}
        {active === 'profit-loss' && <ProfitLossPage />}
        {active === 'cashflow' && <CashflowPage />}
        {active === 'ratios' && <FinancialRatiosPage />}
      </Card.Body>
```

**SESUDAH:**
```tsx
      <Card.Body className="p-0">
        <Suspense fallback={<div className="p-3"><TableSkeleton rows={6} cols={3} /></div>}>
          {active === 'balance-sheet' && <BalanceSheetPage />}
          {active === 'profit-loss' && <ProfitLossPage />}
          {active === 'cashflow' && <CashflowPage />}
          {active === 'ratios' && <FinancialRatiosPage />}
        </Suspense>
      </Card.Body>
```

**Penjelasan:** Lazy + Suspense memberi skeleton tabel saat chunk sub-page dimuat pertama kali (juga memecah bundle = lebih cepat load awal ReportsPage). `TableSkeleton` sudah dipakai di proyek (lihat `ReportsPage.tsx` baris 27). **Verifikasi default export:** pastikan `BalanceSheetPage`/`ProfitLossPage`/`CashflowPage`/`FinancialRatiosPage` memakai `export default` (lazy import butuh default export). Grep: `grep -n "export default" frontend/src/pages/reports/BalanceSheetPage.tsx` dst.

---

### Perubahan 2 (opsional): Legend warna di bawah KPI grid ReportsPage
**File:** `frontend/src/pages/reports/ReportsPage.tsx`
**Grep untuk menemukan:** `<ReportKpiCard label="Okupansi" value={`${occupancy.data!.occupancyRatePercent}%`}`

Tambah legend kecil setelah penutup `</section>` grid KPI (setelah baris 174).

**SEBELUM:**
```tsx
            <ReportKpiCard label="Okupansi" value={`${occupancy.data!.occupancyRatePercent}%`} detail={`${occupancy.data!.occupiedRooms}/${occupancy.data!.totalOperableRooms} kamar terisi`} tone="cyan" />
          </section>
```

**SESUDAH:**
```tsx
            <ReportKpiCard label="Okupansi" value={`${occupancy.data!.occupancyRatePercent}%`} detail={`${occupancy.data!.occupiedRooms}/${occupancy.data!.totalOperableRooms} kamar terisi`} tone="cyan" />
          </section>

          {/* L-11: legend arti warna KPI */}
          <div className="report-kpi-legend small text-muted d-flex flex-wrap gap-3 mb-3">
            <span><i className="report-legend-dot report-kpi-green" /> Sehat / positif</span>
            <span><i className="report-legend-dot report-kpi-orange" /> Perlu perhatian</span>
            <span><i className="report-legend-dot report-kpi-red" /> Risiko / negatif</span>
            <span><i className="report-legend-dot report-kpi-blue" /> Informasi netral</span>
          </div>
```

**CSS pendukung** (tambah di file CSS yang memuat `.report-kpi-card`; grep: `grep -rn "report-kpi-card" frontend/src --include=*.css`):
```css
/* L-11: dot legend KPI */
.report-legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
/* Warna mengikuti tema kartu KPI; sesuaikan jika variabel warna proyek berbeda */
.report-legend-dot.report-kpi-green { background: #16a34a; }
.report-legend-dot.report-kpi-orange { background: #f97316; }
.report-legend-dot.report-kpi-red { background: #dc2626; }
.report-legend-dot.report-kpi-blue { background: #2563eb; }
```

**Penjelasan:** Memberi kunci warna agar owner paham tone kartu. **Catatan:** warna di CSS di atas adalah perkiraan dari palet proyek (lihat OwnerDashboard chart colors). **Verifikasi:** buka CSS `.report-kpi-blue` dll yang sudah ada untuk menyamakan hex; jika sudah ada variabel, pakai variabel itu agar legend selalu sinkron dengan kartu.

> Jika owner/PO menilai legend tak perlu (KPI sudah jelas dari label), Perubahan 2 boleh dilewati — sifatnya enhancement, bukan bug.

### Period selector & tab trigger
- Period selector sudah di posisi tepat (hero kanan-atas) dan fungsional. **Tidak ditemukan masalah struktural — skip** kecuali audit minta pindah posisi.
- Tab Formal trigger sudah benar (ReportTabs → changeTab → render UnlockedFormalReports). Yang kurang hanya skeleton awal → ditangani Perubahan 1.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅ (perhatikan lazy chunk terbentuk tanpa error)
- [ ] Buka tab "Laporan Formal" pertama kali → tampil skeleton tabel sejenak sebelum sub-page muncul.
- [ ] Ganti sub-tab Neraca/Laba Rugi/Arus Kas/Rasio → tetap berfungsi, tidak blank.
- [ ] (Jika Perubahan 2 dipakai) Legend warna muncul di bawah KPI dengan 4 dot berwarna sesuai kartu.

---

## Ringkasan false-alarm / skip
| Item audit | Status |
|---|---|
| L-08 ellipsis di `PaginationControls.tsx` | Skip — komponen itu tidak dipakai PublicRoomsPage & memang tidak merender nomor halaman |
| L-09 quick-action `flex-wrap` | Skip — sudah `flex-wrap` (baris 580) |
| L-09 occupancy/arrears butuh `'—'` error | Skip — dijaga di level induk `{data ? ...}`, tak dirender tanpa data |
| L-10 step indicator WiFi belum ada CSS | Skip — class `tenant-wifi-steps` sudah dipakai |
| L-10 "Sudah dipesan" perlu tombol | Skip — Badge sudah benar menggantikan tombol saat pending |
| L-11 period selector salah posisi | Skip — sudah di hero, fungsional |
| L-11 legend KPI | Opsional (enhancement), bukan bug |
