# Fase L — Spec Eksekusi Detail (L-16 s/d L-20)

> Spec ini ditulis untuk dieksekusi tanpa interpretasi. Kode **SEBELUM** dikutip persis dari source (per 2026-06-20). Ikuti before/after apa adanya. Setiap task punya Gate verifikasi di akhir.
>
> Path dasar: `frontend/src/`
> Build check global: `cd frontend; npm run build`

---

## L-16 — AccountingSetupPage: Guided Checklist / Onboarding

### Temuan baca file (`pages/finance/AccountingSetupPage.tsx`, 677 baris)

1. **Jumlah section render (urut dari atas):**
   - Finance AI Analyst (OWNER + AI configured) — `owner-ai-panel`
   - Sub-menu Finance (`admin-area-internal-menu`)
   - `StatusStrip` (10 item kesiapan: COA, Cash/Bank, Periode, Saldo Awal, Auto Journal, Aset, Tutup Periode, Auto-Close, Deposit Ops, Belum Terjurnal)
   - `AccountingCommandCenterLite`
   - `AccountingDataQualityPanel` + `PeriodCloseTimeline`
   - `AccountingReadinessCard` + `BalanceSheetGuardPanel`
   - `AssetReadinessPanel`
   - Card "Auto-Close Bulanan"
   - `AccountingPeriodsPanel`
   - `PeriodClosePanel`
   - `JournalAuditTrailPanel`
   - Card "Posting Operasional" (backfill)
   - Card "Review Deposit Liability" (dry-run)
   - `DepositOperationsPanel`
   - `ProfitLossLitePanel` + `TrialBalancePreview`
   - `CashAccountSetupPanel` + `OpeningBalanceWizard`

2. **`useQuery` count: 21** (baris 97–127). Tidak ada loading state terpusat penuh — hanya `isInitialLoading = readinessQuery.isLoading || accountsQuery.isLoading` (baris 133) yang menampilkan satu Spinner card (baris 437–439).

3. **Urutan logis setup akuntansi** sudah tercermin di `StatusStrip` (baris 441–454): COA → Cash/Bank → Periode → Saldo Awal → Auto Journal → Aset → Tutup Periode.

4. **Anchor "readiness" yang sudah ada:** `StatusStrip` punya `tone: 'success' | 'warning' | 'danger'` per item, dan `focusAccountingSection(sectionId)` (baris 147–151) sudah men-scroll ke section ber-`id`. Anchor id yang tersedia: `balance-sheet`, `asset-readiness`, `period-close`, `profit-loss`, `trial-balance`. **Belum ada** komponen "guided checklist" eksplisit.

5. **Bagian terberat:** halaman ini SUDAH sangat panjang & padat query. **JANGAN refactor besar / decompose buta** (sejalan dengan MEMORY: AccountingSetup termasuk monolit jalur-uang yang jangan dipecah buta).

### Keputusan desain (anti-overengineering)

Tambahkan **satu** komponen ringan `AccountingSetupChecklist` di **atas** `AccountingCommandCenterLite`. Komponen ini **read-only**: ia membaca data query yang SUDAH ada (`accounts`, `cashAccounts`, `periods`, `postedOpeningBalance`, `autoJournalEnabled`) dan menampilkan langkah berurutan dengan status ✓/○ + tombol "Buka" yang memanggil `focusAccountingSection` atau scroll ke wizard. **Tidak menambah query baru. Tidak mengubah logika finance.**

### File yang diubah
- `frontend/src/components/accounting/AccountingSetupChecklist.tsx` — **BARU**, komponen presentasional.
- `frontend/src/pages/finance/AccountingSetupPage.tsx` — import + render 1 baris + tambah `id` pada wizard.

---

### Perubahan 1: Buat komponen checklist baru

**File:** `frontend/src/components/accounting/AccountingSetupChecklist.tsx` (BUAT FILE BARU)

**SESUDAH (isi penuh file baru):**
```tsx
import { Card } from 'react-bootstrap';

export type ChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  helper: string;
  targetSectionId?: string;
};

export default function AccountingSetupChecklist({
  steps,
  onFocusSection,
}: {
  steps: ChecklistStep[];
  onFocusSection: (sectionId: string) => void;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const firstTodo = steps.find((s) => !s.done);

  return (
    <Card className="content-card border-0 mb-3 accounting-setup-checklist">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <div className="section-kicker mb-1">Panduan Setup</div>
            <h3 className="h5 mb-0">Langkah menyiapkan pembukuan</h3>
          </div>
          <div className="text-end">
            <div className="fw-semibold">{doneCount}/{steps.length} selesai</div>
            <small className="text-muted">
              {firstTodo ? `Lanjut: ${firstTodo.label}` : 'Semua langkah dasar siap'}
            </small>
          </div>
        </div>
        <ol className="accounting-setup-checklist-list list-unstyled d-grid gap-2 mb-0">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`accounting-setup-checklist-item d-flex align-items-start gap-3 ${step.done ? 'is-done' : 'is-todo'}`}
            >
              <span className="accounting-setup-checklist-mark" aria-hidden="true">
                {step.done ? '✓' : index + 1}
              </span>
              <span className="flex-fill">
                <span className="fw-semibold d-block">{step.label}</span>
                <small className="text-muted">{step.helper}</small>
              </span>
              {step.targetSectionId ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary flex-shrink-0"
                  onClick={() => step.targetSectionId && onFocusSection(step.targetSectionId)}
                >
                  Buka
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </Card.Body>
    </Card>
  );
}
```

**Penjelasan:** Komponen murni presentasional, tidak fetch apa pun. Aman, additive, tidak menyentuh jalur uang.

---

### Perubahan 2: Tambah id pada wizard agar bisa di-scroll

**File:** `frontend/src/pages/finance/AccountingSetupPage.tsx`
**Grep untuk menemukan:** `<Col xl={7}>` (yang membungkus `OpeningBalanceWizard`, baris 658)

**SEBELUM:**
```tsx
        <Col xl={7}>
          <OpeningBalanceWizard
```

**SESUDAH:**
```tsx
        <Col xl={7} id="opening-balance">
          <OpeningBalanceWizard
```

**Penjelasan:** Memberi anchor `opening-balance` untuk tombol "Buka" pada langkah Saldo Awal. (`cash-account` dipakai pada Perubahan 3 — tambahkan id juga di Col cash bila ingin.)

---

### Perubahan 2b: Tambah id pada Col cash account

**File:** `frontend/src/pages/finance/AccountingSetupPage.tsx`
**Grep untuk menemukan:** `<Col xl={5}>` (yang membungkus `CashAccountSetupPanel`, baris 650)

**SEBELUM:**
```tsx
        <Col xl={5}>
          <CashAccountSetupPanel
```

**SESUDAH:**
```tsx
        <Col xl={5} id="cash-account">
          <CashAccountSetupPanel
```

---

### Perubahan 3: Import + render checklist di halaman

**File:** `frontend/src/pages/finance/AccountingSetupPage.tsx`
**Grep untuk menemukan:** `import AccountingCommandCenterLite from '../../components/accounting/AccountingCommandCenterLite';`

**SEBELUM:**
```tsx
import AccountingCommandCenterLite from '../../components/accounting/AccountingCommandCenterLite';
```

**SESUDAH:**
```tsx
import AccountingCommandCenterLite from '../../components/accounting/AccountingCommandCenterLite';
import AccountingSetupChecklist, { type ChecklistStep } from '../../components/accounting/AccountingSetupChecklist';
```

Lalu sisipkan render checklist **tepat sebelum** `<AccountingCommandCenterLite`.

**Grep untuk menemukan:** `      <AccountingCommandCenterLite` (baris 456)

**SEBELUM:**
```tsx
      <AccountingCommandCenterLite
        readiness={readinessQuery.data}
```

**SESUDAH:**
```tsx
      <AccountingSetupChecklist
        onFocusSection={focusAccountingSection}
        steps={[
          { id: 'coa', label: 'Siapkan Bagan Akun (COA)', done: accounts.length >= 30, helper: `${accounts.length} akun aktif. Klik "Siapkan Bagan Akun (COA)" di atas bila kosong.` },
          { id: 'cash', label: 'Tambah Cash/Bank', done: cashAccounts.length > 0, helper: 'Minimal 1 akun kas/bank untuk arus uang.', targetSectionId: 'cash-account' },
          { id: 'period', label: 'Buat Periode Akuntansi', done: periods.length > 0, helper: 'Bulan accounting tempat jurnal dicatat.', targetSectionId: 'opening-balance' },
          { id: 'opening', label: 'Posting Saldo Awal', done: Boolean(postedOpeningBalance), helper: postedOpeningBalance ? 'Saldo awal sudah diposting.' : 'Titik mulai neraca. Buat draft lalu posting.', targetSectionId: 'opening-balance' },
          { id: 'auto-journal', label: 'Aktifkan Auto Journal', done: autoJournalEnabled, helper: autoJournalEnabled ? 'Posting operasional otomatis aktif.' : 'Transaksi operasional belum terjurnal otomatis.' },
        ] satisfies ChecklistStep[]}
      />

      <AccountingCommandCenterLite
        readiness={readinessQuery.data}
```

**Penjelasan:** Checklist hanya membaca variabel yang SUDAH dideklarasi di komponen (`accounts`, `cashAccounts`, `periods`, `postedOpeningBalance`, `autoJournalEnabled` — lihat baris 129–141). Tidak ada query baru. Threshold COA `>= 30` mengikuti StatusStrip baris 443.

---

### Perubahan 4 (opsional, CSS): styling checklist

**File:** `frontend/src/styles/09-finance.css` (append di akhir file)

**SESUDAH (tambahkan):**
```css
/* L-16 Accounting setup guided checklist */
.accounting-setup-checklist-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%;
  font-weight: 700; font-size: 0.8rem;
  background: #e2e8f0; color: #475569;
}
.accounting-setup-checklist-item.is-done .accounting-setup-checklist-mark {
  background: #16a34a; color: #fff;
}
```

**Penjelasan:** Murni kosmetik. Boleh dilewati jika ingin build dulu.

### Gate verifikasi L-16
- [ ] `cd frontend; npm run build` ✅ (tidak ada TS error; `ChecklistStep` ter-import sebagai type)
- [ ] Buka `/finance/accounting-setup`: checklist tampil di atas Command Center, hitungan X/5 benar.
- [ ] Tombol "Buka" pada langkah Cash/Saldo Awal men-scroll ke section terkait.
- [ ] **TIDAK** ada query/mutation finance yang berubah.

---

## L-17 — Aksesibilitas: aria-label, Focus Outline, aria-pressed

### Temuan baca file

1. **`AppLayout.tsx` → GlobalSearch:** `GlobalSearch` dipakai 2x (baris 449, 471). Di dalam `components/layout/GlobalSearch.tsx` baris 121–129, input **SUDAH** punya `aria-label="Pencarian global"`. ✅ **Tidak perlu diubah.**
2. **`StaffRoomsPage.tsx` card:** card punya `tabIndex={0}` + `role="button"` + `aria-label` (baris 81, 80, 89). **Namun CSS `.staff-room-card` TIDAK punya `:focus` / `:focus-visible`** (cek `05-staff.css` & seluruh `styles/` — `focus-visible` hanya ada untuk `.staff-workspace-tab` di `10-misc.css`). Card keyboard-focusable tapi **tak terlihat saat di-Tab** → perlu focus outline.
3. **`DashboardAdmin.tsx` → AdminContinuityStrip (baris 103–119):** tombol-tombol `admin-lane-chip` adalah **tombol navigasi** (`onClick={() => onNavigate(lane.to)}`), **bukan toggle**. Jadi `aria-pressed` **TIDAK sesuai** (aria-pressed hanya untuk tombol toggle on/off). **Anchor toggle yang nyata** = `owner-view-toggle-btn` di `AppLayout.tsx` (baris 388–399 & 428–441): tombol Kokpit Owner / Area Admin yang punya state `active`. Itu kandidat `aria-pressed` yang benar.
4. **File CSS utama focus:** `styles/01-base.css` (sudah memuat `.skip-to-content` di baris 372–387). Tambahkan rule focus global setelah blok skip-to-content.

### File yang diubah
- `frontend/src/styles/01-base.css` — tambah global `:focus-visible` outline + outline untuk staff room card.
- `frontend/src/components/layout/AppLayout.tsx` — tambah `aria-pressed` pada 2 grup owner-view-toggle (4 tombol).
- (GlobalSearch: TIDAK diubah — sudah benar.)
- (AdminContinuityStrip: TIDAK ditambah aria-pressed — bukan toggle.)

---

### Perubahan 1: Global focus-visible outline

**File:** `frontend/src/styles/01-base.css`
**Grep untuk menemukan:** `.skip-to-content:focus {`

**SEBELUM:**
```css
.skip-to-content:focus {
  top: 16px;
}
```

**SESUDAH:**
```css
.skip-to-content:focus {
  top: 16px;
}

/* L-17 a11y: outline keyboard-focus konsisten untuk elemen interaktif */
a:focus-visible,
button:focus-visible,
[role="button"]:focus-visible,
.btn:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 6px;
}
/* Kartu kamar staf yang keyboard-focusable (tabIndex=0) */
.staff-room-card:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

**Penjelasan:** Menutup gap a11y — semua elemen interaktif (termasuk `.staff-room-card` yang sebelumnya tak punya focus style) kini terlihat saat navigasi keyboard. Menggunakan `:focus-visible` agar tidak mengganggu pengguna mouse.

---

### Perubahan 2: aria-pressed pada owner-view-toggle (mobile)

**File:** `frontend/src/components/layout/AppLayout.tsx`
**Grep untuk menemukan:** `className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}` (kemunculan PERTAMA, mobile, baris 388)

**SEBELUM:**
```tsx
                  <button
                    type="button"
                    className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('owner')}
                  >
                    <span aria-hidden="true">📈</span> Kokpit Owner
                  </button>
                  <button
                    type="button"
                    className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('admin')}
                  >
                    <span aria-hidden="true">🔧</span> Area Admin
                  </button>
```

**SESUDAH:**
```tsx
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'owner'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('owner')}
                  >
                    <span aria-hidden="true">📈</span> Kokpit Owner
                  </button>
                  <button
                    type="button"
                    aria-pressed={ownerViewMode === 'admin'}
                    className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => changeOwnerViewMode('admin')}
                  >
                    <span aria-hidden="true">🔧</span> Area Admin
                  </button>
```

---

### Perubahan 3: aria-pressed pada owner-view-toggle (desktop)

**File:** `frontend/src/components/layout/AppLayout.tsx`
**Grep untuk menemukan:** kemunculan KEDUA dari blok yang sama (desktop, baris 428–441, di dalam `owner-view-toggle-wrap d-none d-xl-flex`).

**SEBELUM:**
```tsx
                    <button
                      type="button"
                      className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('owner')}
                    >
                      <span aria-hidden="true">📈</span> Kokpit Owner
                    </button>
                    <button
                      type="button"
                      className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('admin')}
                    >
                      <span aria-hidden="true">🔧</span> Area Admin
                    </button>
```

**SESUDAH:**
```tsx
                    <button
                      type="button"
                      aria-pressed={ownerViewMode === 'owner'}
                      className={`owner-view-toggle-btn ${ownerViewMode === 'owner' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('owner')}
                    >
                      <span aria-hidden="true">📈</span> Kokpit Owner
                    </button>
                    <button
                      type="button"
                      aria-pressed={ownerViewMode === 'admin'}
                      className={`owner-view-toggle-btn ${ownerViewMode === 'admin' ? 'active' : ''}`}
                      onClick={() => changeOwnerViewMode('admin')}
                    >
                      <span aria-hidden="true">🔧</span> Area Admin
                    </button>
```

> CATATAN PENTING: ada DUA blok hampir identik (mobile indentasi 18 spasi, desktop 20 spasi). Edit keduanya. Karena `Edit` butuh string unik, gunakan indentasi sebagai pembeda, atau edit per-tombol satu per satu.

**Penjelasan:** Owner-view-toggle adalah pasangan tombol toggle on/off bermode. `aria-pressed` memberi tahu screen reader mode mana yang aktif. AdminContinuityStrip & admin-health-chip TIDAK diberi aria-pressed karena murni navigasi.

### Gate verifikasi L-17
- [ ] `cd frontend; npm run build` ✅
- [ ] Tab keyboard di `/dashboard` admin: kartu/tombol menampilkan outline biru.
- [ ] Tab ke kartu di `/rooms` (StaffRoomsPage staff): outline 3px terlihat.
- [ ] Inspect tombol "Kokpit Owner"/"Area Admin": atribut `aria-pressed="true"/"false"` sesuai mode.
- [ ] GlobalSearch input tetap punya `aria-label="Pencarian global"` (tidak hilang).

---

## L-18 — Empty State Standar

### Temuan baca file

1. **`components/common/EmptyState.tsx`:** props = `{ icon?: string; title: string; description?: string; action?: { label; onClick; variant? } }`. Render `.empty-state` dengan icon, title, description, dan tombol opsional. Cara pakai: `<EmptyState icon="..." title="..." description="..." action={{ label, onClick }} />`.
2. **`InvoicesPage.tsx`:** SUDAH pakai `EmptyState` dengan benar (baris 473–479). Section analytics (`InvoiceAnalyticsPanel`) di-hide saat kosong via `{allItems.length > 0 && <InvoiceAnalyticsPanel .../>}` (baris 442) dan internal `if (stats.total === 0) return null;` (baris 57). ✅ **Tidak perlu diubah.**
3. **`CashflowPage.tsx`:** render list cash in/out (baris 47–48) di dalam `{data && <>...}`. **TIDAK ada EmptyState** — saat `data.operating.cashIn` & `cashOut` kosong, tabel hanya menampilkan baris total tanpa pesan; saat `q.isError` ada Alert, tapi saat data kosong/belum ada periode tidak ada pesan ramah. **Perlu EmptyState ringan.**
4. **Contoh penggunaan EmptyState yang bagus (referensi):** `InvoicesPage.tsx` baris 473–479 — judul kondisional (data kosong vs filter tak cocok) + description.

### File yang diubah
- `frontend/src/pages/reports/CashflowPage.tsx` — tambah EmptyState saat operasi kas kosong.
- (`InvoicesPage.tsx` & `EmptyState.tsx`: TIDAK diubah.)

---

### Perubahan 1: Import EmptyState di CashflowPage

**File:** `frontend/src/pages/reports/CashflowPage.tsx`
**Grep untuk menemukan:** `import { fetchCashflowStatement, type CashflowStatement } from '../../api/accounting';`

**SEBELUM:**
```tsx
import { fetchCashflowStatement, type CashflowStatement } from '../../api/accounting';
```

**SESUDAH:**
```tsx
import { fetchCashflowStatement, type CashflowStatement } from '../../api/accounting';
import EmptyState from '../../components/common/EmptyState';
```

> CATATAN: `CashflowStatement` saat ini di-import sebagai type tapi tampaknya tidak terpakai. Jangan hapus (di luar scope). Hanya tambah baris import EmptyState.

---

### Perubahan 2: Tampilkan EmptyState saat operasi kas kosong

**File:** `frontend/src/pages/reports/CashflowPage.tsx`
**Grep untuk menemukan:** `<Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>💰 Arus Kas Operasi</Card.Header><Card.Body>`

**SEBELUM:**
```tsx
          <Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>💰 Arus Kas Operasi</Card.Header><Card.Body>
            <Table size="sm" className="mb-0"><tbody>
              {data.operating.cashIn.map((item,i)=><tr key={i}><td className="text-success">+ {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              {data.operating.cashOut.map((item,i)=><tr key={i}><td className="text-danger">− {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              <tr className="border-top"><td><strong>Kas Bersih Operasi</strong></td><td className="text-end"><strong style={{color:data.operating.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.operating.netRupiah)}</strong></td></tr>
            </tbody></Table></Card.Body></Card></Col>
```

**SESUDAH:**
```tsx
          <Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>💰 Arus Kas Operasi</Card.Header><Card.Body>
            {data.operating.cashIn.length === 0 && data.operating.cashOut.length === 0 ? (
              <EmptyState icon="💰" title="Belum ada arus kas operasi" description="Belum ada transaksi kas masuk/keluar operasional pada periode ini." />
            ) : (
            <Table size="sm" className="mb-0"><tbody>
              {data.operating.cashIn.map((item,i)=><tr key={i}><td className="text-success">+ {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              {data.operating.cashOut.map((item,i)=><tr key={i}><td className="text-danger">− {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              <tr className="border-top"><td><strong>Kas Bersih Operasi</strong></td><td className="text-end"><strong style={{color:data.operating.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.operating.netRupiah)}</strong></td></tr>
            </tbody></Table>
            )}
          </Card.Body></Card></Col>
```

**Penjelasan:** Saat tidak ada transaksi kas operasi, tampilkan pesan ramah, bukan tabel kosong yang membingungkan. Section investasi & pendanaan dibiarkan (selalu 1 baris ringkasan, tidak perlu empty state).

### Gate verifikasi L-18
- [ ] `cd frontend; npm run build` ✅
- [ ] Buka `/reports/cashflow` (CashflowPage) untuk periode tanpa transaksi: muncul EmptyState "Belum ada arus kas operasi".
- [ ] Periode dengan transaksi: tabel tetap tampil seperti semula.

---

## L-19 — AssetRegisterPage + LoyaltyAdminPage + MarketAnalysisPage

### Temuan baca file

1. **`AssetRegisterPage.tsx` form tambah aset:** **inline** (bukan modal) di `<Col xl={5}>` (baris 272–299). Field: nama, kategori, basis kapitalisasi, tanggal perolehan, mulai depresiasi, cost, residu, umur manfaat, akumulasi awal, switch depresiasi, tautan inventaris, catatan (~12 field). Struktur `Col` rapat: beberapa `Row className="g-2"` dengan `Col sm={6}` berpasangan.
2. **`AssetRegisterPage.tsx` badge status alignment** (baris 261): `<Badge bg={alignmentBadge(status)} ...>{alignmentStatusLabels[status] ?? status}</Badge>`. **TIDAK ada `title` tooltip** — singkatan status (mis. "Perlu review") tidak menjelaskan makna. Perlu `title`.
3. **`LoyaltyAdminPage.tsx` save button** (baris 201): teks `'Simpan'` saat idle, `'Menyimpan...'` saat pending. Teks idle terlalu generik untuk modal Reward.
4. **`MarketAnalysisPage.tsx` message bubble** (baris 177–179): SUDAH membedakan user vs AI lewat warna DAN label teks `{m.role === 'user' ? 'Kamu' : 'Analis AI'}` (baris 179). ✅ **Tidak perlu label tambahan** — sudah ada. (Hanya boleh tambah a11y kecil bila diinginkan; lihat catatan.)

### File yang diubah
- `frontend/src/pages/finance/AssetRegisterPage.tsx` — tambah `title` pada badge alignment.
- `frontend/src/pages/loyalty/LoyaltyAdminPage.tsx` — perjelas teks save button.
- (`MarketAnalysisPage.tsx`: TIDAK diubah — bubble sudah berlabel.)

---

### Perubahan 1: Tooltip pada badge alignment (AssetRegisterPage)

**File:** `frontend/src/pages/finance/AssetRegisterPage.tsx`
**Grep untuk menemukan:** `<td><Badge bg={alignmentBadge(status)} text={alignmentBadge(status) === 'warning' || alignmentBadge(status) === 'light' ? 'dark' : undefined}>{alignmentStatusLabels[status] ?? status}</Badge></td>`

**SEBELUM:**
```tsx
                        <td><Badge bg={alignmentBadge(status)} text={alignmentBadge(status) === 'warning' || alignmentBadge(status) === 'light' ? 'dark' : undefined}>{alignmentStatusLabels[status] ?? status}</Badge></td>
```

**SESUDAH:**
```tsx
                        <td><Badge bg={alignmentBadge(status)} text={alignmentBadge(status) === 'warning' || alignmentBadge(status) === 'light' ? 'dark' : undefined} title={ALIGNMENT_STATUS_TOOLTIP[status] ?? 'Status alignment aset terhadap ledger Fixed Assets.'}>{alignmentStatusLabels[status] ?? status}</Badge></td>
```

Lalu tambahkan map tooltip. **Grep untuk menemukan:** `function alignmentBadge(status?: string) {`

**SEBELUM:**
```tsx
function alignmentBadge(status?: string) {
```

**SESUDAH:**
```tsx
const ALIGNMENT_STATUS_TOOLTIP: Record<string, string> = {
  NOT_REQUIRED: 'Tidak perlu alignment — nilai aset tidak perlu disamakan dengan ledger.',
  NEEDS_REVIEW: 'Perlu ditinjau owner sebelum membuat adjustment journal.',
  PREVIEWED: 'Sudah dibuat preview journal, belum diposting.',
  ALIGNED: 'Register aset sudah sama dengan ledger Fixed Assets.',
  DISCLOSURE_ONLY: 'Hanya dicatat sebagai disclosure, tidak membentuk journal.',
  VOIDED: 'Alignment dibatalkan.',
};

function alignmentBadge(status?: string) {
```

**Penjelasan:** Memberi makna pada singkatan status saat hover, sejalan pola `title` yang sudah dipakai di tempat lain (mis. financeMenu `title={item.helper}`).

---

### Perubahan 2: Perjelas teks save button (LoyaltyAdminPage)

**File:** `frontend/src/pages/loyalty/LoyaltyAdminPage.tsx`
**Grep untuk menemukan:** `{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>`

**SEBELUM:**
```tsx
          <Button variant="primary" disabled={saveMutation.isPending || !form.name.trim()} onClick={() => saveMutation.mutate({ id: editId, input: form })}>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
```

**SESUDAH:**
```tsx
          <Button variant="primary" disabled={saveMutation.isPending || !form.name.trim()} onClick={() => saveMutation.mutate({ id: editId, input: form })}>{saveMutation.isPending ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Reward'}</Button>
```

**Penjelasan:** Teks tombol kini menjelaskan konteks (tambah vs edit reward), bukan "Simpan" generik. `editId` sudah tersedia di scope (dipakai di `saveMutation.mutate({ id: editId, ... })`).

> Verifikasi tipe `editId`: jika `editId` bertipe `number | null`, ekspresi `editId ? ...` aman (null/0 → "Tambah Reward"). Tidak perlu perubahan lain.

### Gate verifikasi L-19
- [ ] `cd frontend; npm run build` ✅
- [ ] `/finance/assets`: hover badge alignment → tooltip muncul (contoh "Perlu ditinjau owner...").
- [ ] `/loyalty` (admin) buka modal Reward: tombol "Tambah Reward" (baru) / "Simpan Perubahan" (edit).
- [ ] `/marketing/...` (MarketAnalysis) tetap menampilkan label "Kamu"/"Analis AI" pada bubble.

---

## L-20 — Minor Fixes (ProfilePage, OwnerSettingsPage, FAQ)

### Temuan baca file

1. **`ProfilePage.tsx` field tip e-wallet:** **5 field** (baris 300–305): `tipGopay`, `tipOvo`, `tipDana`, `tipShopeepay`, `tipBank`. Tiap field SUDAH punya `placeholder` (mis. `'Nomor GoPay / tautan'`). **TIDAK ada `Form.Text`** penjelas per field. Penjelasan umum ada di paragraf atas (baris 292–296). Cukup baik; perbaikan minimal: TIDAK wajib. (Lihat keputusan.)
2. **`ProfilePage.tsx` error handling password:** `handlePwSubmit` (baris 169–181) set `pwError` lokal untuk validasi; `pwMutation.onError` (baris 136–139) pakai `getApiErrorMessage(err, 'Gagal mengubah password.')`. Ditampilkan via `{pwError ? <Alert variant="danger">{pwError}</Alert> : null}` (baris 247). ✅ Error API sudah ditampilkan rapi.
3. **`OwnerSettingsPage.tsx` error upload foto fasilitas** (baris 59): `setError(\`Gagal upload ${slug}: ...\`)` — **memakai SLUG mentah** (mis. "ac-kipas") bukan label ("AC / kipas"). Pesan kurang ramah. Map label tersedia: `FACILITY_SLUGS`.
4. **`OwnerSettingsPage.tsx` modal FAQ field Question** (baris 430–437): `Form.Control` untuk question **TIDAK ada `autoFocus`**. Saat modal "Tambah FAQ" dibuka, kursor tidak otomatis ke field pertama.

### Keputusan
- ProfilePage tip: **opsional**, tambah `Form.Text` ringkas (lihat Perubahan 1, boleh dilewati).
- ProfilePage password error: **TIDAK diubah** (sudah benar).
- OwnerSettings upload error slug: **WAJIB** ganti slug → label.
- OwnerSettings FAQ autoFocus: **WAJIB** tambah `autoFocus`.

---

### Perubahan 1 (opsional): Form.Text pada blok tip e-wallet

**File:** `frontend/src/pages/profile/ProfilePage.tsx`
**Grep untuk menemukan:** `maxLength={f.key === 'tipBank' ? 200 : 120}`

**SEBELUM:**
```tsx
                    <Form.Control
                      value={tipForm[f.key]}
                      onChange={(e) => {
                        setTipForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                        if (tipSuccess) setTipSuccess('');
                        if (tipError) setTipError('');
                      }}
                      placeholder={f.placeholder}
                      maxLength={f.key === 'tipBank' ? 200 : 120}
                    />
```

**SESUDAH:**
```tsx
                    <Form.Control
                      value={tipForm[f.key]}
                      onChange={(e) => {
                        setTipForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                        if (tipSuccess) setTipSuccess('');
                        if (tipError) setTipError('');
                      }}
                      placeholder={f.placeholder}
                      maxLength={f.key === 'tipBank' ? 200 : 120}
                    />
                    <Form.Text muted>Kosongkan jika tidak dipakai.</Form.Text>
```

**Penjelasan:** Menegaskan tiap field opsional. Boleh dilewati tanpa memengaruhi gate.

---

### Perubahan 2 (WAJIB): Error upload foto fasilitas pakai label, bukan slug

**File:** `frontend/src/pages/settings/OwnerSettingsPage.tsx`
**Grep untuk menemukan:** `setError(\`Gagal upload ${slug}: ${err instanceof Error ? err.message : 'Unknown error'}\`);`

**SEBELUM:**
```tsx
    } catch (err) {
      setError(`Gagal upload ${slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
```

**SESUDAH:**
```tsx
    } catch (err) {
      const label = FACILITY_SLUGS.find((f) => f.slug === slug)?.label ?? slug;
      setError(`Gagal upload foto "${label}": ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`);
    } finally {
```

**Penjelasan:** Pesan error menyebut nama fasilitas yang dikenal user ("AC / kipas") bukan slug teknis ("ac-kipas"). `FACILITY_SLUGS` sudah ada di scope file yang sama (baris 18–32). Pola lookup label-by-slug sudah dipakai di `handleDelete` (baris 66).

---

### Perubahan 3 (WAJIB): autoFocus pada field Question di modal FAQ

**File:** `frontend/src/pages/settings/OwnerSettingsPage.tsx`
**Grep untuk menemukan:** `placeholder="Contoh: Berapa kisaran tarif kamar?"`

**SEBELUM:**
```tsx
            <Form.Control
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              placeholder="Contoh: Berapa kisaran tarif kamar?"
            />
```

**SESUDAH:**
```tsx
            <Form.Control
              autoFocus
              value={form.question}
              onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
              placeholder="Contoh: Berapa kisaran tarif kamar?"
            />
```

**Penjelasan:** Saat modal Tambah/Edit FAQ dibuka (`show={showForm}`), kursor langsung ke field Pertanyaan. React-Bootstrap `Modal` memindahkan fokus ke konten saat tampil; `autoFocus` pada control pertama bekerja konsisten karena modal di-mount ulang saat dibuka.

### Gate verifikasi L-20
- [ ] `cd frontend; npm run build` ✅
- [ ] `/settings?tab=facility-photos`: paksa gagal upload (mis. file >2MB) → pesan menyebut label fasilitas, bukan slug.
- [ ] `/settings?tab=faq` → "+ Tambah FAQ": kursor otomatis di field Pertanyaan.
- [ ] `/profile` (staff): blok Info Tip tetap tampil; (jika Perubahan 1 diterapkan) ada teks "Kosongkan jika tidak dipakai."
- [ ] Password change error tetap muncul sebagai Alert merah (tidak berubah).

---

## Ringkasan dampak per file

| File | Task | Sifat |
|---|---|---|
| `components/accounting/AccountingSetupChecklist.tsx` (BARU) | L-16 | additive |
| `pages/finance/AccountingSetupPage.tsx` | L-16 | additive (import + 1 render + 2 id) |
| `styles/09-finance.css` | L-16 | kosmetik (opsional) |
| `styles/01-base.css` | L-17 | additive (focus a11y) |
| `components/layout/AppLayout.tsx` | L-17 | additive (aria-pressed x4) |
| `pages/reports/CashflowPage.tsx` | L-18 | additive (EmptyState) |
| `pages/finance/AssetRegisterPage.tsx` | L-19 | additive (title tooltip) |
| `pages/loyalty/LoyaltyAdminPage.tsx` | L-19 | teks tombol |
| `pages/profile/ProfilePage.tsx` | L-20 | kosmetik (opsional) |
| `pages/settings/OwnerSettingsPage.tsx` | L-20 | error label + autoFocus |

**Tidak diubah (sudah benar — jangan utak-atik):**
- `components/common/EmptyState.tsx`
- `components/layout/GlobalSearch.tsx` (sudah `aria-label`)
- `pages/invoices/InvoicesPage.tsx` (sudah EmptyState + hide analytics kosong)
- `pages/marketing/MarketAnalysisPage.tsx` (bubble sudah berlabel "Kamu"/"Analis AI")
- AdminContinuityStrip di `DashboardAdmin.tsx` (tombol navigasi, bukan toggle → tanpa aria-pressed)
