# PROMPT EKSEKUTOR — Overhaul UI/UX Admin KOST48 (untuk AI Lemah)

> **Instruksi:** Copy-paste prompt satu fase ke chat baru. Jangan kirim semua sekaligus.  
> Setelah satu fase selesai dan diverifikasi, lanjut ke prompt fase berikutnya.  
> **Sumber runbook lengkap:** `docs/RUNBOOK_OVERHAUL_ADMIN_UX.md`

---

## ⚠️ ATURAN UMUM (berlaku untuk SEMUA fase)

1. **JANGAN hapus fitur.** JANGAN ubah aturan bisnis, permission, atau guard keuangan.
2. **JANGAN ubah `schema.prisma`** tanpa approval eksplisit.
3. **JANGAN staging file di luar scope fase.** Sebelum commit, jalankan `git diff --cached --name-only` dan pastikan hanya file yang relevan.
4. **JANGAN commit atau push** kecuali diminta eksplisit di prompt fase.
5. **Label & teks UI pakai Bahasa Indonesia.** Jangan tampilkan enum mentah (`IN_PROGRESS`, `CANCELLED`, dll).
6. **Gunakan komponen yang sudah ada** — jangan buat ulang dari nol kalau sudah ada di codebase.
7. **Setelah setiap perubahan file**, jalankan `cd frontend && npm run build` untuk verifikasi kompilasi.
8. **Jika build gagal**, perbaiki error SEBELUM lanjut ke task berikutnya.
9. **Gunakan `grep` untuk mencari simbol** sebelum mengedit — pastikan tidak ada referensi yang terlewat.
10. **Baca file sebelum mengedit** — jangan mengandalkan asumsi.

---

---

## FASE 1 — Design Foundation: Navigasi, PageHeader, Status, Pola Responsif

### TUGAS 1.1: Reorganisasi Sidebar Admin

**Baca dulu file ini:**
- `frontend/src/config/navigation.ts` — seluruh isi

**Yang harus dilakukan:**

1. **Ubah `adminSections`** dari 1 section "Operasional Kos" (10 item) menjadi 3 section:

```ts
// ❌ SEBELUM (1 section, 10 item flat)
export const adminSections: NavigationSection[] = [
  {
    title: 'Operasional Kos',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', ... },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', ... },
      { to: '/invoices', label: 'Keuangan', icon: '🧾', ... },
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', ... },
      { to: '/surveys', label: 'Survei Penghuni', icon: '⭐', ... },
      { to: '/guest-preferences', label: 'Preferensi Tamu', icon: '🎯', ... },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', ... },
      { to: '/ac-maintenance', label: 'Perawatan AC', icon: '❄️', ... },
      { to: '/announcements', label: 'Pengumuman', icon: '📣', ... },
      { to: '/loyalty', label: 'Loyalitas & Reward', icon: '🎁', ... },
    ],
  },
];

// ✅ SESUDAH (3 section, total 10 item)
export const adminSections: NavigationSection[] = [
  {
    title: 'Huni & Uang',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊', hint: 'Command Center ringkas berisi prioritas paling penting dari semua menu.' },
      { to: '/stays', label: 'Masa Sewa & Penghuni', icon: '🏠', hint: 'Booking, masa sewa aktif, perpanjangan, keluar, dan daftar penghuni.', activePaths: ['/stays', '/tenants', '/renew-requests'] },
      { to: '/invoices', label: 'Keuangan', icon: '🧾', hint: 'Tagihan, review pembayaran, voucher WiFi, pendapatan tambahan, dan pengeluaran.', activePaths: ['/invoices', '/invoice-payments', '/payment-submissions/review', '/wifi-sales', '/ancillary-revenue', '/expenses', '/finance/accounting-setup', '/finance/assets'] },
    ],
  },
  {
    title: 'Operasional',
    links: [
      { to: '/tickets', label: 'Staff & Tiket', icon: '👷', hint: 'Tiket operasional, staff, checklist, laporan lapangan, dan kinerja.', activePaths: ['/tickets', '/staff-routines', '/staff-performance'] },
      { to: '/rooms', label: 'Kamar & Stok', icon: '🏘️', hint: 'Status kamar, barang kamar, stok gudang, mutasi stok, dan catatan meter.', activePaths: ['/rooms', '/inventory', '/room-items', '/inventory-items', '/inventory-movements', '/meter-readings'] },
      { to: '/ac-maintenance', label: 'Perawatan AC', icon: '❄️', hint: 'Pantau pemakaian AC dan jadwalkan cuci AC secara konsisten.' },
    ],
  },
  {
    title: 'Penghuni & Komunikasi',
    links: [
      { to: '/surveys', label: 'Survei Penghuni', icon: '⭐', hint: 'Lihat semua survei kepuasan, rating, komentar, dan ringkasan.' },
      { to: '/guest-preferences', label: 'Preferensi Tamu', icon: '🎯', hint: 'Data preferensi kamar dari wizard publik.' },
      { to: '/announcements', label: 'Pengumuman', icon: '📣', hint: 'Buat dan kelola pengumuman untuk penghuni dan staff.' },
      { to: '/loyalty', label: 'Reward', icon: '🎁', hint: 'Setujui penukaran reward tenant dan lihat katalog.' },
    ],
  },
];
```

**PENTING:** Jangan ubah `activePaths` yang sudah ada — tetap pertahankan. Hanya ubah struktur section + label loyalty jadi "Reward".

2. **Buat fungsi `mapOwnerAdminLabels`** — OWNER di Area Admin melihat label berbeda untuk loyalty:

```ts
// Tambahkan fungsi ini DI BAWAH ownerAdminSections yang sudah ada:

function mapOwnerAdminLabel(link: NavigationLink): NavigationLink {
  if (link.label === 'Reward' && link.to === '/loyalty') {
    return { ...link, label: 'Loyalitas & Reward', hint: 'Katalog reward, kelola poin, dan setujui penukaran tenant.' };
  }
  return link;
}
```

3. **Update `ownerAdminSections`** agar menggunakan `mapOwnerAdminLabel`:

```ts
// ❌ SEBELUM
export const ownerAdminSections: NavigationSection[] = adminSections.map((section) => ({
  ...section,
  links: section.links.map((link) => (link.to === '/dashboard' ? { ...link, to: '/admin-dashboard' } : link)),
}));

// ✅ SESUDAH
export const ownerAdminSections: NavigationSection[] = adminSections.map((section) => ({
  ...section,
  links: section.links.map((link) => {
    const withDashboard = link.to === '/dashboard' ? { ...link, to: '/admin-dashboard' } : link;
    return mapOwnerAdminLabel(withDashboard);
  }),
}));
```

4. **Update komentar di atas `ownerSections`** agar tidak menyebut "Pengumuman di sidebar admin + tombol 📣 di topbar" karena struktur sudah berubah.

**Verifikasi:**
- `cd frontend && npm run build` harus PASS
- Buka file `navigation.ts`, pastikan struktur 3 section terlihat rapi

---

### TUGAS 1.2: Standarisasi PageHeader

**Baca dulu:**
- `frontend/src/components/common/PageHeader.tsx` — cek props yang tersedia
- `frontend/src/pages/stays/StaysPage.tsx` — cek apakah sudah pakai PageHeader
- `frontend/src/pages/invoices/InvoicesPage.tsx` — cek apakah sudah pakai PageHeader
- `frontend/src/pages/tickets/TicketsPage.tsx` — cek apakah sudah pakai PageHeader
- `frontend/src/pages/resources/SimpleCrudPage.tsx` — cek bagaimana halaman CRUD merender header

**Yang harus dilakukan:**

1. **Audit penggunaan PageHeader** — grep `PageHeader` di semua file `frontend/src/pages/`:
   - Catat halaman mana yang SUDAH pakai PageHeader
   - Catat halaman mana yang BELUM

2. **Untuk halaman yang SUDAH pakai PageHeader**, verifikasi props:
   - `title` — judul jelas, Bahasa Indonesia
   - `subtitle` — deskripsi satu kalimat
   - `actions` — maksimal 1-2 tombol CTA, tidak lebih

3. **Untuk halaman yang BELUM pakai PageHeader**, tambahkan:
   - Import `PageHeader` dari `'../../components/common/PageHeader'`
   - Pasang di atas konten halaman
   - Isi title, subtitle, dan actions sesuai konteks halaman

**JANGAN** membuat PageHeader baru — gunakan komponen yang sudah ada.

**Verifikasi:**
- `cd frontend && npm run build` harus PASS

---

### TUGAS 1.3: Audit StatusBadge & Label

**Baca dulu:**
- `frontend/src/components/common/StatusBadge.tsx`
- `frontend/src/utils/statusLabels.ts`

**Yang harus dilakukan:**

1. **Grep semua penggunaan enum mentah** di file frontend:
   ```
   grep -rn "IN_PROGRESS\|CANCELLED\|COMPLETED\|PENDING\|APPROVED\|REJECTED" frontend/src/pages/ --include="*.tsx"
   ```

2. **Perbaiki semua enum mentah yang bocor ke label UI.** Contoh:
   - ❌ `ticket.status` tampil sebagai `"IN_PROGRESS"` → ✅ `"Dikerjakan"`
   - ❌ `invoice.status` tampil sebagai `"CANCELLED"` → ✅ `"Dibatalkan"`
   - ❌ `stay.status` tampil sebagai `"COMPLETED"` → ✅ `"Selesai"`

3. **Jika sudah ada fungsi `getStatusLabel` atau `getBookingStatusLabel`**, pastikan FUNGSI itu dipakai — jangan hardcode label di JSX.

4. **JANGAN ubah logika** — hanya label tampilan.

**Verifikasi:**
- `cd frontend && npm run build` harus PASS

---

### TUGAS 1.4: Breadcrumb Kontekstual

**Baca dulu:**
- `frontend/src/components/layout/AppLayout.tsx` — fungsi `getBreadcrumbParts` dan `toLabel`
- `frontend/src/config/routeTitles.ts` — jika ada

**Yang harus dilakukan:**

1. **Perbaiki `getBreadcrumbParts`** — saat ini segment angka (seperti `/stays/123`) dirender sebagai "Detail". Ubah agar:
   - Jika URL punya state/context (dari `useLocation().state`), gunakan data itu untuk label breadcrumb
   - Fallback: tetap "Detail" jika tidak ada data

2. **Cara mendapatkan data entitas untuk breadcrumb TANPA API call:**
   - Cek `location.state` — halaman detail bisa mengirim `{ breadcrumbLabel: 'Kamar A / Shinta' }` via `navigate('/stays/123', { state: { breadcrumbLabel: 'Kamar A' } })` atau dari komponen detail yang membaca data dan meng-update context

3. **Untuk sekarang, cukup perbaiki `segmentLabelMap`** — tambahkan mapping untuk segmen yang belum ada:
   ```ts
   const segmentLabelMap: Record<string, string> = {
     // ... existing entries ...
     'tenants': 'Data Penghuni',
     'renew-requests': 'Perpanjangan',
     'staff-routines': 'Rutinitas Staff',
     'staff-performance': 'Kinerja Staff',
     'meter-readings': 'Catatan Meter',
     'ac-maintenance': 'Perawatan AC',
     'check-in': 'Check-in Baru',
     'guest-preferences': 'Preferensi Tamu',
     'surveys': 'Survei',
     'ancillary-revenue': 'Pendapatan Tambahan',
     'loss-refunds': 'Refund',
     'loyalty': 'Loyalitas',
     'settings': 'Pengaturan',
     'market-analysis': 'Analisa Pasar',
   };
   ```

4. **JANGAN melakukan API fetch dari AppLayout** atau `getBreadcrumbParts`. Hanya gunakan mapping statis + data dari URL/location state.

**Verifikasi:**
- `cd frontend && npm run build` harus PASS
- Navigasi ke `/stays/123` → breadcrumb menampilkan "Masa Sewa & Penghuni / Detail" (bukan hanya "/ stays / 123")

---

### GATE FASE 1
Setelah semua tugas selesai:
1. `cd frontend && npm run build` — pastikan PASS
2. `git diff --cached --name-only` — pastikan hanya file yang relevan: `navigation.ts`, `AppLayout.tsx`, file halaman yang disentuh
3. `git diff --cached --check` — pastikan tidak ada whitespace error
4. Commit: `feat: restruktur navigasi & sidebar admin (3 section, label kontekstual)`

---

---

## FASE 2 — Dashboard Admin (Command Center)

### TUGAS 2.1: Sederhanakan Tab "Ringkasan"

**Baca dulu SELURUH file ini:**
- `frontend/src/pages/dashboard/DashboardAdmin.tsx`

**Yang harus dilakukan (hati-hati — file besar ~450 baris):**

1. **HAPUS dari Ringkasan (`activeArea === 'overview'`):**
   - AI Brief section (baris ~413-442, `canUseAdminBriefAi` block)
   - AutoOpsControlPanel (baris ~443, AutoOps di overview)
   - P-01 view mode toggle (SegmentedTabs list/board/calendar) — pindahkan ke dalam expand "Semua Antrean"
   - AdminProcessLine (baris ~444) — ini tetap, tapi hanya di stays-finance

2. **KTP pending signal** — pastikan link menuju `/tenants?ktpStatus=PENDING_REVIEW`:
   ```tsx
   // ❌ SEBELUM
   <button onClick={() => navigate('/tenants')}>Buka antrean KTP</button>
   
   // ✅ SESUDAH
   <button onClick={() => navigate('/tenants?ktpStatus=PENDING_REVIEW')}>Buka antrean KTP</button>
   ```

3. **AutoOps status di Ringkasan** — hanya tampil jika GAGAL atau BUTUH TINDAKAN:
   ```tsx
   // ✅ HANYA tampil jika autoOpsQuery.data gagal
   {activeArea === 'overview' && autoOpsQuery.data?.status === 'ERROR' ? (
     <Alert variant="danger" className="py-2">
       ⚠️ AutoOps mengalami kendala. <a href="#" onClick={() => setActiveArea('ops')}>Cek di Operasional →</a>
     </Alert>
   ) : null}
   ```

4. **Antrean aksi di Ringkasan** — `maxItems={5}`, tanpa view mode toggle:
   ```tsx
   <ActionQueueTable
     items={filteredQueueItems.slice(0, 5)}
     maxItems={5}
     // ... tetap seperti sebelumnya
   />
   ```

**JANGAN hapus:**
- AdminHealthBar
- Survei ringkasan
- AdminCommandHeader
- `dense` toggle

---

### TUGAS 2.2: Tab "Penghuni & Uang" — Tambah Sub-tab

**Dalam DashboardAdmin.tsx**, di dalam `activeArea === 'stays-finance'`:

1. **Tambah sub-tab switcher:**
   ```tsx
   {activeArea === 'stays-finance' ? (
     <SegmentedTabs<'stays' | 'finance'>
       items={[
         { key: 'stays', label: 'Booking & Huni', icon: '🏠' },
         { key: 'finance', label: 'Tagihan & Bayar', icon: '🧾' },
       ]}
       value={staysFinanceSubTab}
       onChange={setStaysFinanceSubTab}
       ariaLabel="Sub-area keuangan"
       size="sm"
     />
   ) : null}
   ```
   - Tambah state `const [staysFinanceSubTab, setStaysFinanceSubTab] = useState<'stays' | 'finance'>('stays');`
   - Render `AdminStaysUnifiedList` hanya jika `staysFinanceSubTab === 'stays'`
   - Render `AdminFinanceWorkspace` hanya jika `staysFinanceSubTab === 'finance'`
   - `AdminProcessLine` tetap di atas kedua sub-tab

2. **Tambah antrean KTP di sub-tab "Booking & Huni":**
   - Pindahkan logika `ktpReviewItems` dari overview ke sini
   - Tampilkan mini tabel dengan kolom: Nama, Kamar, Upload, Aksi ("Periksa" → buka `/tenants?ktpStatus=PENDING_REVIEW`)

---

### TUGAS 2.3: Tab "Operasional" — Tambah Sub-tab + AutoOps

**Dalam DashboardAdmin.tsx**, di dalam `activeArea === 'ops'`:

1. **Tambah sub-tab switcher:**
   ```tsx
   {activeArea === 'ops' ? (
     <SegmentedTabs<'tickets' | 'rooms'>
       items={[
         { key: 'tickets', label: 'Tiket & Staff', icon: '👷' },
         { key: 'rooms', label: 'Kamar & Stok', icon: '🏘️' },
       ]}
       value={opsSubTab}
       onChange={setOpsSubTab}
       ariaLabel="Sub-area operasional"
       size="sm"
     />
   ) : null}
   ```

2. **Pindahkan AutoOpsControlPanel ke sub-tab "Tiket & Staff":**
   - Dari `activeArea === 'overview'` → ke `opsSubTab === 'tickets'`

---

### TUGAS 2.4: AI Brief — OWNER-only di Tab Penghuni & Uang

1. **HAPUS section AI Brief dari overview** (sudah dilakukan di 2.1)

2. **Tambah panel kolapsibel di sub-tab "Tagihan & Bayar":**
   ```tsx
   {staysFinanceSubTab === 'finance' && canUseAdminBriefAi ? (
     <section className="owner-panel mt-3 mb-3">
       <div className="owner-panel-heading p-3" onClick={toggleAiBrief} style={{ cursor: 'pointer' }}>
         <div>
           <span className="owner-section-kicker">🔮 Brief AI (Owner)</span>
           <h2 className="mb-0">Analisa Keuangan</h2>
         </div>
         <span>{aiBriefOpen ? '▲' : '▼'}</span>
       </div>
       {aiBriefOpen ? (
         <div className="owner-panel-body p-3">
           <AiAssistButton<BriefResult> ... />
         </div>
       ) : null}
     </section>
   ) : null}
   ```
   - Tambah state `const [aiBriefOpen, setAiBriefOpen] = useState(false);`

**Verifikasi:**
- `cd frontend && npm run build` harus PASS

---

### GATE FASE 2
1. `cd frontend && npm run build` — PASS
2. `git diff --cached --name-only` — pastikan hanya `DashboardAdmin.tsx` dan file terkait
3. `git diff --cached --check` — whitespace ok
4. Commit: `feat: overhaul dashboard admin — ringkasan, sub-tab, AI owner-only`

---

---

## FASE 3 — Halaman Huni & Uang (Stays + Invoices + Keuangan)

### TUGAS 3.1: StaysPage — Sub-navigation + Perlu Tindakan

**Baca dulu:**
- `frontend/src/pages/stays/StaysPage.tsx` — SELURUH file (sekitar 700+ baris)
- `frontend/src/pages/stays/stayPredicates.ts` — fungsi-fungsi predicate

**Yang harus dilakukan:**

1. **Ganti filter utama dengan sub-navigation tabs** — di ATAS analytics panel:
   ```tsx
   // Sub-navigation — muncul di atas konten halaman
   <div className="admin-sub-nav">
     <NavLink to="/stays?status=BOOKINGS" className={...}>Booking</NavLink>
     <NavLink to="/stays?status=ACTIVE" className={...}>Aktif</NavLink>
     <NavLink to="/stays?status=CHECKOUT" className={...}>Checkout</NavLink>
     <NavLink to="/tenants?ktpStatus=PENDING_REVIEW" className={...}>Data Penghuni</NavLink>
     <NavLink to="/renew-requests" className={...}>Perpanjangan</NavLink>
   </div>
   ```
   - Gunakan `useSearchParams` untuk membaca filter `?status=`
   - Filter yang sudah ada (`ALL`, `BOOKINGS`, `CHECKOUT`, `ACTIVE`) tetap berfungsi
   - "Data Penghuni" dan "Perpanjangan" adalah link ke route lain — pastikan tidak 404

2. **Tambahkan "Perlu Tindakan" section** di atas tabel (hanya jika ada item):
   ```tsx
   {pendingApprovalCount > 0 || pendingCheckoutCount > 0 ? (
     <Alert variant="warning" className="perlu-tindakan-alert">
       <strong>⚠️ Perlu Tindakan:</strong> {pendingApprovalCount} booking perlu disetujui, {pendingCheckoutCount} checkout perlu direview.
     </Alert>
   ) : null}
   ```

3. **StayAnalyticsPanel** — tambahkan state `const [analyticsOpen, setAnalyticsOpen] = useState(false);` dan bungkus dengan toggle "📊 Lihat Analitik ▼/▲"

**JANGAN ubah logika filter, sort, paginasi, atau mutation. Hanya tambah navigasi + section.**

---

### TUGAS 3.2: InvoicesPage — Sub-navigation + Ringkasan

**Baca dulu:**
- `frontend/src/pages/invoices/InvoicesPage.tsx` — SELURUH file

**Yang harus dilakukan:**

1. **Tambah sub-navigation tabs** di atas konten:
   ```tsx
   <div className="admin-sub-nav">
     <NavLink to="/invoices" className={...}>Tagihan</NavLink>
     <NavLink to="/payment-submissions/review" className={...}>Review Pembayaran</NavLink>
     <NavLink to="/expenses" className={...}>Pengeluaran</NavLink>
     <NavLink to="/wifi-sales" className={...}>WiFi</NavLink>
     <NavLink to="/ancillary-revenue" className={...}>Pendapatan Lain</NavLink>
   </div>
   ```

2. **Tambah ringkasan angka di atas chart** (sebelum `InvoiceAnalyticsPanel`):
   ```tsx
   <Row className="g-2 mb-3">
     <Col xs={6} md={3}>
       <div className="stat-mini-card">
         <div className="stat-mini-label">Total Tagihan</div>
         <div className="stat-mini-value">{fmtCompact(totalRupiah)}</div>
       </div>
     </Col>
     <Col xs={6} md={3}>
       <div className="stat-mini-card text-success">
         <div className="stat-mini-label">Terkumpul</div>
         <div className="stat-mini-value">{fmtCompact(collectionRupiah)}</div>
       </div>
     </Col>
     <Col xs={6} md={3}>
       <div className="stat-mini-card text-danger">
         <div className="stat-mini-label">Overdue</div>
         <div className="stat-mini-value">{fmtCompact(totalOverdue)}</div>
       </div>
     </Col>
     <Col xs={6} md={3}>
       <div className="stat-mini-card">
         <div className="stat-mini-label">Rasio Penagihan</div>
         <div className="stat-mini-value">{collectionRate}%</div>
       </div>
     </Col>
   </Row>
   ```
   - Variabel `totalRupiah`, `collectionRupiah`, `totalOverdue`, `collectionRate` sudah dihitung di `InvoiceAnalyticsPanel` — extract perhitungannya ke level `InvoicesPage` atau buat shared function

**JANGAN ubah tabel, filter, atau mutation yang sudah ada.**

---

### GATE FASE 3
1. `cd frontend && npm run build` — PASS
2. `git diff --cached --name-only` — pastikan hanya StaysPage.tsx, InvoicesPage.tsx, dan file style terkait
3. `git diff --cached --check`
4. Commit: `feat: standarisasi halaman huni & uang + sub-navigation`

---

---

## FASE 4 — Halaman Operasional (Tickets, Staff, Kamar, AC)

### TUGAS 4.1: TicketsPage — Sub-navigation + Prioritas

**Baca dulu:**
- `frontend/src/pages/tickets/TicketsPage.tsx` — SELURUH file

**Yang harus dilakukan:**

1. **Tambah sub-navigation tabs:**
   ```tsx
   <div className="admin-sub-nav">
     <NavLink to="/tickets" className={...}>Tiket</NavLink>
     <NavLink to="/staff-routines" className={...}>Rutinitas Staff</NavLink>
     <NavLink to="/staff-performance" className={...}>Kinerja</NavLink>
   </div>
   ```

2. **Tambah section "Prioritas"** di atas tabel tiket:
   ```tsx
   {unassignedOpenCount > 0 || doneCount > 0 ? (
     <Alert variant="warning" className="perlu-tindakan-alert">
       <strong>⚠️ Prioritas:</strong> {unassignedOpenCount > 0 ? `${unassignedOpenCount} tiket baru belum ditugaskan. ` : ''}{doneCount > 0 ? `${doneCount} tiket selesai menunggu pengecekan admin.` : ''}
     </Alert>
   ) : null}
   ```

3. **TicketAnalyticsPanel** — tambahkan toggle kolapsibel (seperti di Fase 3 untuk StaysAnalytics)

---

### TUGAS 4.2: RoomsPage — Sub-navigation

**Baca dulu:**
- `frontend/src/pages/rooms/` — cari halaman rooms untuk admin (mungkin `StaffRoomsPage.tsx` atau ada di `RoomsRouteEntry.tsx`)

**Yang harus dilakukan:**

1. **Tambah sub-navigation tabs di halaman rooms:**
   ```tsx
   <div className="admin-sub-nav">
     <NavLink to="/rooms" className={...}>Status Kamar</NavLink>
     <NavLink to="/meter-readings" className={...}>Catatan Meter</NavLink>
     <NavLink to="/inventory" className={...}>Inventaris</NavLink>
   </div>
   ```

**JANGAN ubah grid kamar atau filter yang sudah ada.**

---

### GATE FASE 4
1. `cd frontend && npm run build` — PASS
2. `git diff --cached --name-only`
3. `git diff --cached --check`
4. Commit: `feat: standarisasi halaman operasional + sub-navigation`

---

---

## FASE 5 — CRUD Generik & Komunikasi

### TUGAS 5.1: ConfiguredResourcePage — Context-Aware Header

**Baca dulu:**
- `frontend/src/pages/resources/SimpleCrudPage.tsx` — cara header dirender
- `frontend/src/config/resources.ts` — daftar resource configs

**Yang harus dilakukan:**

1. **Buat mapping resource → header context** di file baru `frontend/src/config/resourceHeaders.ts`:
   ```ts
   export const resourceHeaders: Record<string, { title: string; subtitle: string }> = {
     users: { title: 'Akun Pengguna', subtitle: 'Kelola akun owner, admin, staf, dan penghuni.' },
     tenants: { title: 'Data Penghuni', subtitle: 'Verifikasi KTP, data diri, dan riwayat penghuni.' },
     announcements: { title: 'Pengumuman', subtitle: 'Buat dan kelola pengumuman untuk penghuni.' },
     expenses: { title: 'Pengeluaran', subtitle: 'Catat dan pantau biaya operasional kos.' },
     'wifi-sales': { title: 'Penjualan WiFi', subtitle: 'Kelola pesanan WiFi tenant.' },
     additionalServices: { title: 'Layanan Tambahan', subtitle: 'Atur layanan tambahan yang bisa dipesan tenant.' },
     'invoice-payments': { title: 'Pembayaran Manual', subtitle: 'Catat pembayaran invoice secara manual.' },
     'inventory-items': { title: 'Stok Barang', subtitle: 'Kelola barang di gudang.' },
     'room-items': { title: 'Inventaris Kamar', subtitle: 'Kelola barang yang ada di setiap kamar.' },
     'inventory-movements': { title: 'Mutasi Stok', subtitle: 'Catat barang masuk, keluar, dan pindah kamar.' },
   };
   ```

2. **Integrasikan ke SimpleCrudPage** — di bagian atas halaman, sebelum tabel:
   ```tsx
   import { resourceHeaders } from '../../config/resourceHeaders';
   
   // Di dalam komponen:
   const header = resourceHeaders[config.path];
   {header ? (
     <PageHeader title={header.title} subtitle={header.subtitle} />
   ) : (
     <PageHeader title={config.title} />
   )}
   ```

**JANGAN ubah struktur data, form, atau mutation SimpleCrudPage.**

---

### TUGAS 5.2: LoyaltyAdminPage — Konteks OWNER vs ADMIN

**Baca dulu:**
- `frontend/src/pages/loyalty/LoyaltyAdminPage.tsx` — SELURUH file

**Yang harus dilakukan:**

1. **Cek role user** dengan `useAuth()`

2. **Untuk ADMIN:** tampilkan halaman dengan judul "Penukaran Reward" dan subtitle "Proses permintaan penukaran reward dari tenant."
   - Tab default: "Penukaran" (daftar redemption yang perlu diproses)
   - Tab "Katalog" (read-only — lihat reward yang tersedia)

3. **Untuk OWNER:** tampilkan halaman dengan judul "Loyalitas & Reward" dan subtitle "Atur katalog reward, kelola poin, dan setujui penukaran."
   - Tab: "Katalog" | "Penukaran" | "Kebijakan" (sesuai yang sudah ada)

4. **Implementasi:** bedakan label/title berdasarkan `user.role`, bukan route terpisah.

**Verifikasi:**
- `cd frontend && npm run build` — PASS

---

### GATE FASE 5
1. `cd frontend && npm run build` — PASS
2. `git diff --cached --name-only`
3. `git diff --cached --check`
4. Commit: `feat: CRUD generik context-aware + loyalty konteks role`

---

---

## FASE 6 — Mobile, Accessibility, Empty/Loading/Error States

### TUGAS 6.1: Mobile Bottom Nav untuk Admin

**Baca dulu:**
- `frontend/src/components/layout/MobileBottomNav.tsx` — yang sudah ada untuk tenant

**Yang harus dilakukan:**

1. **Buat komponen baru** `frontend/src/components/layout/AdminMobileBottomNav.tsx`:
   - 5 item: Dashboard (`/dashboard`), Huni (`/stays`), Uang (`/invoices`), Tiket (`/tickets`), Lainnya (buka offcanvas sidebar)
   - HANYA render di viewport < 768px (pakai CSS `d-md-none`)
   - Pakai ikon emoji: 📊 🏠 🧾 👷 📋
   - Gunakan `useLocation()` untuk menentukan item aktif

2. **Integrasikan ke AppLayout.tsx** — di dalam blok `if (isAdmin || (isOwner && ownerViewMode === 'admin'))`:
   ```tsx
   <AdminMobileBottomNav />
   ```
   - Render DI BAWAH `<main>` content, sebelum `</div>` penutup app-shell

**JANGAN duplikasi seluruh sidebar. Ini navigasi cepat 5 item.**

---

### TUGAS 6.2: Empty, Loading, Error States

**Yang harus dilakukan:**

1. **Audit setiap halaman list** — cari yang belum punya empty/loading/error state:
   - Empty: tampilkan `<EmptyState icon="..." title="..." description="..." />` 
   - Loading: tampilkan `<TableSkeleton />` atau `<PageLoadingSkeleton />` 
   - Error: tampilkan `<Alert variant="danger">Gagal memuat data. <Button onClick={refetch}>Coba Lagi</Button></Alert>`

2. **File yang perlu dicek:**
   - `StaysPage.tsx` — sudah ada EmptyState? Loading?
   - `InvoicesPage.tsx` — sudah ada EmptyState? Loading?
   - `TicketsPage.tsx` — sudah ada EmptyState + TableSkeleton?
   - `SimpleCrudPage.tsx` — cek handle empty/list/error
   - Semua halaman `ConfiguredResourcePage`
   - `StaffRoutinesAdminPage.tsx`
   - `AdminStaffPerformancePage.tsx`
   - `AdminSurveysPage.tsx`
   - `GuestPreferencesPage.tsx`
   - `MeterReadingsPage.tsx`
   - `AcMaintenancePage.tsx`

3. **Untuk setiap halaman yang BELUM punya state handling:**
   ```tsx
   if (isLoading) return <TableSkeleton rows={5} />;
   if (isError) return <Alert variant="danger">Gagal memuat. <Button size="sm" onClick={() => refetch()}>Coba Lagi</Button></Alert>;
   if (!data || data.length === 0) return <EmptyState icon="📭" title="Belum ada data" description="..." />;
   ```

---

### TUGAS 6.3: Responsive Polishing

**Yang harus dilakukan:**

1. **Cek semua halaman admin di viewport 375px** via browser DevTools — pastikan:
   - Tidak ada horizontal overflow
   - Tabel tidak terpotong (pakai `responsive` prop atau scroll horizontal)
   - Tombol tidak bertumpuk
   - Modal full-width

2. **Perbaiki CSS untuk mobile:**
   - Sub-navigation tabs: scroll horizontal (`overflow-x: auto; flex-wrap: nowrap`)
   - AdminHealthBar: stack vertikal
   - Chart analytics: full width, kecilkan height
   - Filter EntityBadgeFilterBar: scroll horizontal

3. **Touch target minimum 44px** — cek tombol aksi di tabel (approve, reject, detail)

---

### TUGAS 6.4: Accessibility

**Yang harus dilakukan:**

1. **Modal backdrop** — untuk form sensitif (approve booking, reject checkout, bayar invoice):
   - Set `backdrop="static"` pada Modal
   - Jangan tutup saat klik luar

2. ** aria-label untuk tombol ikon** — cek semua tombol tanpa teks:
   ```tsx
   <button aria-label="Setujui booking">✅</button>
   ```

3. **Skip-to-content** — pastikan link `#main-content` berfungsi di semua halaman admin

---

### TUGAS 6.5: Evaluasi Dense Toggle

**Setelah semua halaman di-overhaul:**

1. Buka Dashboard Admin — apakah terlihat cukup ringkas tanpa dense mode?
2. Jika YA → hapus dense toggle (state, localStorage, tombol di AdminCommandHeader)
3. Jika TIDAK → catat alasannya, pertahankan toggle

**Verifikasi:**
- `cd frontend && npm run build` — PASS

---

### GATE FASE 6
1. `cd frontend && npm run build` — PASS
2. `git diff --cached --name-only`
3. `git diff --cached --check`
4. Commit: `feat: mobile nav admin, responsive polish, empty/loading/error, a11y`

---

---

## FASE 7 — Pengujian, Dokumentasi & Commit Final

### TUGAS 7.1: Pengujian Manual

**Yang harus dilakukan:**

1. **Login sebagai `admin@kost48.com` / `admin123`:**
   - Buka `/dashboard` → pastikan 3 tab berfungsi
   - Buka `/stays` → sub-navigation muncul, tabel responsif
   - Buka `/invoices` → sub-navigation muncul, ringkasan angka tampil
   - Buka `/tickets` → sub-navigation muncul
   - Buka `/rooms` → sub-navigation muncul
   - Buka `/loyalty` → lihat label "Reward" di header
   - Buka `/announcements` → header kontekstual tampil
   - Buka `/users` → header kontekstual tampil
   - **Pastikan tidak bisa akses `/owner-dashboard`, `/reports`, `/market-analysis`** (403 expected)
   - Buka Chrome DevTools Console → catat semua error/warning

2. **Login sebagai `owner@kost48.com` / `Owner#2026`:**
   - Buka `/owner-dashboard` → Kokpit Owner normal
   - Toggle ke Area Admin → buka `/admin-dashboard`
   - Buka `/stays`, `/invoices`, `/tickets` → sama seperti admin
   - Buka `/loyalty` → lihat label "Loyalitas & Reward"
   - Buka `/reports` → harus BISA (OWNER punya akses)
   - AI Brief muncul di tab Penghuni & Uang sub-tab Tagihan & Bayar
   - Console → catat error

3. **Mobile test (375px) di Chrome DevTools:**
   - Dashboard — tidak overflow
   - Stays — tidak overflow
   - Invoices — tidak overflow
   - Tickets — tidak overflow
   - Mobile bottom nav muncul

---

### TUGAS 7.2: Build Final

```bash
cd backend && npx tsc --noEmit   # HANYA jika ada perubahan backend
cd frontend && npm run build     # WAJIB PASS
cd frontend && npm run dev       # Jalankan, pastikan tidak crash
```

---

### TUGAS 7.3: Update Dokumentasi

**File yang WAJIB diperbarui:**

1. `docs/UI_UX_OWNER_ADMIN.md`:
   - Update anchor implementasi (file path yang berubah)
   - Tambah section tentang sub-navigation pattern
   - Tambah section tentang mobile bottom nav admin

2. `docs/M00_CODEMAP.md`:
   - Update hanya jika ada perubahan struktur file signifikan (file baru/rename)

3. `docs/M12_CHECKLIST_CHANGELOG.md`:
   - Tambah section "Fase Overhaul Admin UX" dengan checklist semua fase

4. `docs/M13_CHANGELOG.md`:
   - Prepend entri: `2026-07-16 — Overhaul UI/UX Portal Admin — 7 fase, navigasi 3 section, dashboard ringkas, sub-navigation, mobile nav, a11y`

---

### TUGAS 7.4: Commit Atomik & Push

**Urutan commit (jalankan satu per satu):**

```bash
# Commit 1: Navigasi
git add frontend/src/config/navigation.ts
git add frontend/src/components/layout/AppLayout.tsx
git diff --cached --name-only
git diff --cached --check
git commit -m "feat: restruktur navigasi & sidebar admin (3 section, label kontekstual)"

# Commit 2: Dashboard
git add frontend/src/pages/dashboard/DashboardAdmin.tsx
git add frontend/src/pages/dashboard/AdminWorkspaces.tsx
git diff --cached --name-only && git diff --cached --check
git commit -m "feat: overhaul dashboard admin — ringkasan, sub-tab, AI owner-only"

# Commit 3: Huni & Uang
git add frontend/src/pages/stays/StaysPage.tsx
git add frontend/src/pages/invoices/InvoicesPage.tsx
git diff --cached --name-only && git diff --cached --check
git commit -m "feat: standarisasi halaman huni & uang + sub-navigation"

# Commit 4: Operasional
git add frontend/src/pages/tickets/TicketsPage.tsx
git add frontend/src/pages/rooms/
git diff --cached --name-only && git diff --cached --check
git commit -m "feat: standarisasi halaman operasional + sub-navigation"

# Commit 5: CRUD & Komunikasi
git add frontend/src/config/resourceHeaders.ts
git add frontend/src/pages/resources/SimpleCrudPage.tsx
git add frontend/src/pages/loyalty/LoyaltyAdminPage.tsx
git diff --cached --name-only && git diff --cached --check
git commit -m "feat: CRUD generik context-aware + loyalty konteks role"

# Commit 6: Mobile & A11y
git add frontend/src/components/layout/AdminMobileBottomNav.tsx
git add frontend/src/components/layout/AppLayout.tsx
git add frontend/src/pages/
git diff --cached --name-only && git diff --cached --check
git commit -m "feat: mobile nav admin, responsive polish, empty/loading/error, a11y"

# Commit 7: Docs
git add docs/
git diff --cached --name-only && git diff --cached --check
git commit -m "docs: update dokumentasi pasca overhaul admin UX"

# Push semua
git push origin main
```

---

### LAPORAN AKHIR

Setelah semua selesai, isi dan laporkan:

```
✅ RINGKASAN: Overhaul UI/UX Portal Admin KOST48 selesai — 7 fase, 7 commit.
   Navigasi: 1 section → 3 section (Huni & Uang, Operasional, Penghuni & Komunikasi).
   Dashboard: 3 tab dengan sub-tab, AI Brief OWNER-only, KTP signal, AutoOps di Operasional.
   Semua halaman: sub-navigation + ringkasan + tabel responsif.

HALAMAN BERUBAH: navigation.ts, AppLayout.tsx, DashboardAdmin.tsx, StaysPage.tsx,
   InvoicesPage.tsx, TicketsPage.tsx, rooms pages, SimpleCrudPage.tsx, LoyaltyAdminPage.tsx,
   + AdminMobileBottomNav.tsx (baru), resourceHeaders.ts (baru)

FITUR DIPERTAHANKAN: Semua guard keuangan, permission OWNER/ADMIN, AutoOps, 
   AdminHealthBar, ActionQueueTable, chart analytics, CRUD generik, filter/paginasi.

BUILD: BE npx tsc --noEmit ✅ / FE npm run build ✅

DOKUMENTASI: UI_UX_OWNER_ADMIN.md, M00_CODEMAP.md, M12_CHECKLIST_CHANGELOG.md, M13_CHANGELOG.md

COMMIT: [7 hash]

PUSH: origin/main ✅

DENSE TOGGLE: [dipertahankan/dihapus — jelaskan kenapa]

RISIKO: [sebutkan jika ada]
```
