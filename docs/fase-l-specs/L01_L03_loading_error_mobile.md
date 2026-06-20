# Fase L — Spec Eksekusi L-01, L-02, L-03

> **Untuk AI/tim eksekutor:** Ikuti format SEBELUM/SESUDAH persis. Kode di bagian SEBELUM
> dicopy langsung dari file pada 2026-06-20. Jika baris SEBELUM tidak ditemukan persis,
> JANGAN tebak — laporkan. Path relatif ke
> `frontend/` = `.../final_bundle/frontend/`. Setelah semua perubahan: `cd frontend; npm run build`.

Catatan hasil audit kode (PENTING, hindari kerja sia-sia):
- Banyak loading/error state SUDAH bagus. Spec ini hanya menambah yang KURANG.
- `StaysPage.tsx`, `InvoicesPage.tsx`, dan `OwnerDashboardPage.tsx` jadi **template referensi** — JANGAN diubah.
- `PublicRoomDetailPage.tsx` tarif table SUDAH pakai `<Table responsive>` → **tidak ada perubahan**.
- `TicketsStaffMode.tsx` action button SUDAH ada `disabled={simpleAction.isPending}` → **tidak ada perubahan**.

---

## L-01 — Loading State Standar

### Ringkasan temuan
| File | Status saat ini | Tindakan |
|---|---|---|
| `App.tsx` `RequireRoles` / `TenantBookingRouteGuard` | `return null` saat loading → layar putih kosong | Ganti `null` jadi `<PageLoadingSkeleton />` |
| `TicketsStaffMode.tsx` action buttons | Sudah `disabled={simpleAction.isPending}` (baris 90-91) | TIDAK ADA PERUBAHAN |
| `InvoicesPage.tsx` button "Terbitkan" / "Batalkan" | Sudah `disabled={issueMutation.isPending}` (baris 523, 526) + modal pakai teks pending (baris 592, 634) + Spinner list (baris 471) | TIDAK ADA PERUBAHAN — ini TEMPLATE BAGUS |
| `StaysPage.tsx` | Spinner + EmptyState + disabled mutation (baris 474-475, 689-690) | TIDAK ADA PERUBAHAN — ini TEMPLATE BAGUS |

### Contoh BAGUS (template referensi loading list — JANGAN diubah)
`frontend/src/pages/stays/StaysPage.tsx` baris 474-475:
```tsx
{query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
{query.isError ? <Alert variant="danger">Gagal mengambil data masa sewa. Silakan coba lagi.</Alert> : null}
```
Pola button dengan loading (StaysPage baris 689-690):
```tsx
<Button size="sm" variant="outline-danger" onClick={() => expireMutation.mutate(item.id)} disabled={expireMutation.isPending}>
  {expireMutation.isPending ? 'Memproses...' : 'Jalankan Kedaluwarsa'}
</Button>
```

---

### Perubahan 1: Loading guard `RequireRoles` — ganti `return null`
**File:** `frontend/src/App.tsx`
**Grep untuk menemukan:** `if (!user) return null;`

`PageLoadingSkeleton` SUDAH di-import di baris 3 — tidak perlu import baru.

**SEBELUM:**
```tsx
function RequireRoles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();
  if (!user) return null;
  // Tunggu stage selesai dimuat sebelum redirect (hindari redirect prematur ke /rooms saat loading)
  if (isStageLoading && user.role === 'TENANT') return null;
  return allowed.includes(user.role as Role) ? <>{children}</> : <Navigate to={getDefaultRoute(user.role, stage)} replace />;
}
```

**SESUDAH:**
```tsx
function RequireRoles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();
  if (!user) return null;
  // L-01: tampilkan skeleton (bukan layar putih) saat stage TENANT masih loading.
  if (isStageLoading && user.role === 'TENANT') return <PageLoadingSkeleton />;
  return allowed.includes(user.role as Role) ? <>{children}</> : <Navigate to={getDefaultRoute(user.role, stage)} replace />;
}
```

**Penjelasan:** Saat `isStageLoading` true untuk TENANT, komponen sebelumnya merender `null` → user melihat layar putih kosong tanpa indikator. Diganti `<PageLoadingSkeleton />` agar ada feedback visual. Baris `if (!user) return null;` TIDAK diubah karena itu kondisi belum-login (di-handle `ProtectedRoute`), bukan loading.

---

### Perubahan 2: Loading guard `TenantBookingRouteGuard` — ganti `return null`
**File:** `frontend/src/App.tsx`
**Grep untuk menemukan:** `function TenantBookingRouteGuard`

**SEBELUM:**
```tsx
function TenantBookingRouteGuard({ children }: { children: ReactNode }) {
  const { stage, isLoading } = useTenantPortalStage();
  if (isLoading) return null;
  if (stage !== 'browsing') return <TenantBookingGate mode="booking-route" />;
  return <>{children}</>;
}
```

**SESUDAH:**
```tsx
function TenantBookingRouteGuard({ children }: { children: ReactNode }) {
  const { stage, isLoading } = useTenantPortalStage();
  // L-01: skeleton saat menentukan stage, hindari flash layar putih sebelum gate/booking.
  if (isLoading) return <PageLoadingSkeleton />;
  if (stage !== 'browsing') return <TenantBookingGate mode="booking-route" />;
  return <>{children}</>;
}
```

**Penjelasan:** Sama seperti Perubahan 1 — `return null` saat loading menyebabkan layar putih. `<PageLoadingSkeleton />` memberi indikator muat.

### Gate verifikasi L-01
- [ ] `cd frontend; npm run build` lulus tanpa error TypeScript.
- [ ] Login sebagai TENANT, buka `/portal/booking/:roomId` → muncul skeleton saat loading, bukan layar putih.
- [ ] Tidak ada import baru yang diperlukan (`PageLoadingSkeleton` sudah ada di baris 3).

---

## L-02 — Error Display Standar

### Ringkasan temuan
| File | Temuan | Tindakan |
|---|---|---|
| `OwnerDashboardPage.tsx` | `'…'` = loading, `'—'` = error (baris 370, 378). Sudah BENAR membedakan. | TIDAK ADA PERUBAHAN — TEMPLATE BAGUS |
| `DashboardAdmin.tsx` | `coreQueriesError` → `Alert variant="danger"` (baris 432); `supportQueriesError` → warning lunak (baris 440, 442). Sudah benar. | TIDAK ADA PERUBAHAN |
| `CashflowPage.tsx` | `cashIn.map` / `cashOut.map` (baris 47-48) TANPA empty state | Tambah empty state |
| `FinancialRatiosPage.tsx` | Badge readiness "Belum"/"Kosong"/"Parsial" (baris 67-71) TANPA CTA | Tambah CTA link ke setup akuntansi |

### Contoh BAGUS (template referensi error vs empty — JANGAN diubah)
`frontend/src/pages/dashboard/OwnerDashboardPage.tsx` baris 370 & 378 — bedakan loading vs error:
```tsx
value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? '—' : `${meter?.due ?? 0}`,
...
value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? '—' : `${readiness?.score ?? 0}%`,
```
`frontend/src/pages/dashboard/DashboardAdmin.tsx` — error inti keras, error pendukung lunak:
```tsx
if (coreQueriesError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;   // baris 432
// baris 442 (support, lunak):
{supportQueriesLoading ? <Alert variant="info" className="admin-support-loading-note">Data pendukung sedang dimuat. Dashboard utama tetap bisa dipakai.</Alert> : null}
```

---

### Perubahan 1: CashflowPage — empty state untuk arus kas operasi
**File:** `frontend/src/pages/reports/CashflowPage.tsx`
**Grep untuk menemukan:** `{data.operating.cashIn.map((item,i)=>`

**SEBELUM:**
```tsx
            <Table size="sm" className="mb-0"><tbody>
              {data.operating.cashIn.map((item,i)=><tr key={i}><td className="text-success">+ {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              {data.operating.cashOut.map((item,i)=><tr key={i}><td className="text-danger">− {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              <tr className="border-top"><td><strong>Kas Bersih Operasi</strong></td><td className="text-end"><strong style={{color:data.operating.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.operating.netRupiah)}</strong></td></tr>
            </tbody></Table></Card.Body></Card></Col>
```

**SESUDAH:**
```tsx
            <Table size="sm" className="mb-0"><tbody>
              {data.operating.cashIn.length===0 && data.operating.cashOut.length===0 ? (
                <tr><td colSpan={2} className="text-center text-muted py-2">Belum ada arus kas operasi pada periode ini.</td></tr>
              ) : null}
              {data.operating.cashIn.map((item,i)=><tr key={i}><td className="text-success">+ {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              {data.operating.cashOut.map((item,i)=><tr key={i}><td className="text-danger">− {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              <tr className="border-top"><td><strong>Kas Bersih Operasi</strong></td><td className="text-end"><strong style={{color:data.operating.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.operating.netRupiah)}</strong></td></tr>
            </tbody></Table></Card.Body></Card></Col>
```

**Penjelasan:** Saat `cashIn` dan `cashOut` keduanya kosong, tabel hanya menampilkan baris "Kas Bersih Operasi = Rp0" tanpa konteks — terlihat seperti error. Baris empty state memberi tahu user bahwa memang belum ada data untuk periode terpilih. Tabel investasi & pendanaan TIDAK diubah karena selalu punya baris tetap (baris 53-54, 58-59).

---

### Perubahan 2: FinancialRatiosPage — CTA pada panel Kesiapan Data
**File:** `frontend/src/pages/reports/FinancialRatiosPage.tsx`
**Grep untuk menemukan:** `📋 Kesiapan Data`

`useNavigate` belum di-import. Tambahkan import.

**SEBELUM (baris 3):**
```tsx
import { useQuery } from '@tanstack/react-query';
```

**SESUDAH (baris 3):**
```tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
```

Lalu deklarasikan hook di dalam komponen.

**SEBELUM (baris 19-22):**
```tsx
export default function FinancialRatiosPage() {
  const [ym,setYm]=useState(currentYearMonth());
  const q=useQuery({queryKey:['accounting','ratios',ym],queryFn:()=>fetchFinancialRatios({year:ym.year,month:ym.month}),staleTime:60_000,retry:1});
  const d=q.data;
```

**SESUDAH (baris 19-23):**
```tsx
export default function FinancialRatiosPage() {
  const navigate=useNavigate();
  const [ym,setYm]=useState(currentYearMonth());
  const q=useQuery({queryKey:['accounting','ratios',ym],queryFn:()=>fetchFinancialRatios({year:ym.year,month:ym.month}),staleTime:60_000,retry:1});
  const d=q.data;
```

Lalu tambahkan CTA di panel Kesiapan Data.

**SEBELUM (baris 65-73):**
```tsx
      <Card className="mb-3"><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>📋 Kesiapan Data</Card.Header><Card.Body>
        <div className="d-flex flex-wrap gap-3">
          <span>Trial Balance: <Badge bg={d.readiness.trialBalanceBalanced?'success':'warning'}>{d.readiness.trialBalanceBalanced?'Balanced':'Belum'}</Badge></span>
          <span>Balance Sheet: <Badge bg={d.readiness.balanceSheetReady?'success':'warning'}>{d.readiness.balanceSheetReady?'Siap':'Parsial'}</Badge></span>
          <span>Kas & Bank: <Badge bg={d.readiness.cashAndBankAvailable?'success':'secondary'}>{d.readiness.cashAndBankAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Kewajiban Lancar: <Badge bg={d.readiness.currentLiabilitiesAvailable?'success':'secondary'}>{d.readiness.currentLiabilitiesAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Ekuitas: <Badge bg={d.readiness.equityAvailable?'success':'secondary'}>{d.readiness.equityAvailable?'Ada':'Kosong'}</Badge></span>
        </div>
      </Card.Body></Card>
```

**SESUDAH (baris 65-77):**
```tsx
      <Card className="mb-3"><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>📋 Kesiapan Data</Card.Header><Card.Body>
        <div className="d-flex flex-wrap gap-3">
          <span>Trial Balance: <Badge bg={d.readiness.trialBalanceBalanced?'success':'warning'}>{d.readiness.trialBalanceBalanced?'Balanced':'Belum'}</Badge></span>
          <span>Balance Sheet: <Badge bg={d.readiness.balanceSheetReady?'success':'warning'}>{d.readiness.balanceSheetReady?'Siap':'Parsial'}</Badge></span>
          <span>Kas & Bank: <Badge bg={d.readiness.cashAndBankAvailable?'success':'secondary'}>{d.readiness.cashAndBankAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Kewajiban Lancar: <Badge bg={d.readiness.currentLiabilitiesAvailable?'success':'secondary'}>{d.readiness.currentLiabilitiesAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Ekuitas: <Badge bg={d.readiness.equityAvailable?'success':'secondary'}>{d.readiness.equityAvailable?'Ada':'Kosong'}</Badge></span>
        </div>
        {!d.formalStatementReady ? (
          <Button variant="outline-primary" size="sm" className="mt-3" onClick={()=>navigate('/finance/accounting-setup')}>
            Lengkapi setup akuntansi
          </Button>
        ) : null}
      </Card.Body></Card>
```

`Button` SUDAH di-import di baris 2? Cek: baris 2 = `import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';` — **`Button` BELUM ada**. Tambahkan.

**SEBELUM (baris 2):**
```tsx
import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
```

**SESUDAH (baris 2):**
```tsx
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
```

**Penjelasan:** Saat data akuntansi belum lengkap (`formalStatementReady` false), badge "Belum"/"Kosong"/"Parsial" memberi tahu masalah tapi tidak menawarkan jalan keluar. CTA mengarahkan user ke `/finance/accounting-setup` (route nyata, lihat `App.tsx` baris 200) untuk memperbaiki.

### Gate verifikasi L-02
- [ ] `cd frontend; npm run build` lulus.
- [ ] Buka `/reports` tab Arus Kas pada bulan tanpa transaksi → muncul "Belum ada arus kas operasi pada periode ini."
- [ ] Buka `/reports` tab Rasio Keuangan saat data belum formal → muncul tombol "Lengkapi setup akuntansi" yang membuka `/finance/accounting-setup`.

---

## L-03 — Mobile Grid: xs Breakpoint

### Ringkasan temuan
| File | Temuan | Tindakan |
|---|---|---|
| `TicketsPage.tsx` | Category grid pakai CSS class `create-ticket-category-grid` (baris 1214), BUKAN Bootstrap `Col`. CSS SUDAH responsif: 3 kolom desktop → 2 kolom di ≤767.98px (`13-charts.css` baris 623-681) | **TIDAK ADA PERUBAHAN** (sudah benar) — opsional polish di Perubahan 1 |
| `StaffRoutinesAdminPage.tsx` | 3 checkbox dalam `Col md={3}` (baris 218) → sempit di tablet/mobile | Ubah jadi `Col xs={12} md={6} lg={3}` |
| `ReminderPreviewPage.tsx` | `maxWidth: 250` inline (baris 253, 271, 289, 307) + `width: 130` (baris 58) | Lihat Perubahan 3 |
| `PublicRoomDetailPage.tsx` | Tarif table SUDAH `<Table responsive>` (baris 313) | TIDAK ADA PERUBAHAN |

---

### Perubahan 1: TicketsPage category grid — SUDAH RESPONSIF (verifikasi saja, OPSIONAL)
**File:** `frontend/src/pages/tickets/TicketsPage.tsx` (markup) + `frontend/src/styles/13-charts.css`
**Grep untuk menemukan:** `create-ticket-category-grid`

**Hasil audit kode (2026-06-20): TIDAK ADA PERUBAHAN WAJIB.**
Markup category grid (baris 1214-1235) memakai `<div className="create-ticket-category-grid">` dengan tombol
`<button className="create-ticket-cat-btn">`, BUKAN `<Row>/<Col>` Bootstrap. Responsivitas dikendalikan CSS,
dan CSS-nya SUDAH benar di `frontend/src/styles/13-charts.css`:

```css
/* baris 623-628 */
.create-ticket-category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 8px;
}
/* baris 673-676 */
@media (max-width: 767.98px) {
  .create-ticket-category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Artinya: 3 kolom di desktop, otomatis turun jadi 2 kolom di tablet/mobile (≤767.98px). Sudah cukup nyaman disentuh.

**Tindakan eksekutor:** Verifikasi visual saja (lihat gate). JANGAN ubah markup TSX maupun CSS kecuali owner
secara eksplisit minta 1 kolom di layar sangat kecil (<400px). Jika owner minta itu, baru tambahkan blok berikut
di `13-charts.css` (OPSIONAL, bukan bagian wajib L-03):

```css
@media (max-width: 399.98px) {
  .create-ticket-category-grid { grid-template-columns: 1fr; }
}
```

**Penjelasan:** Awalnya task ini mengasumsikan grid pakai Bootstrap `Col` tanpa xs. Setelah baca kode, ternyata
ini CSS grid yang sudah punya media query responsif. Jadi tidak ada bug nyata — cukup verifikasi agar tidak kerja sia-sia.

---

### Perubahan 2: StaffRoutinesAdminPage — checkbox crowded di mobile
**File:** `frontend/src/pages/staff-routines/StaffRoutinesAdminPage.tsx`
**Grep untuk menemukan:** `d-flex align-items-end gap-3 flex-wrap`

**SEBELUM (baris 218-222):**
```tsx
              <Col md={3} className="d-flex align-items-end gap-3 flex-wrap">
                <Form.Check checked={form.requiresPhoto} onChange={(event) => setForm((prev) => ({ ...prev, requiresPhoto: event.currentTarget.checked }))} label="Butuh foto" />
                <Form.Check checked={form.requiresNote} onChange={(event) => setForm((prev) => ({ ...prev, requiresNote: event.currentTarget.checked }))} label="Butuh catatan" />
                <Form.Check checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.currentTarget.checked }))} label="Aktif" />
              </Col>
```

**SESUDAH:**
```tsx
              <Col xs={12} md={6} lg={3} className="d-flex align-items-end gap-3 flex-wrap">
                <Form.Check checked={form.requiresPhoto} onChange={(event) => setForm((prev) => ({ ...prev, requiresPhoto: event.currentTarget.checked }))} label="Butuh foto" />
                <Form.Check checked={form.requiresNote} onChange={(event) => setForm((prev) => ({ ...prev, requiresNote: event.currentTarget.checked }))} label="Butuh catatan" />
                <Form.Check checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.currentTarget.checked }))} label="Aktif" />
              </Col>
```

**Penjelasan:** `Col md={3}` (25% lebar) memaksa 3 checkbox berdesakan di kolom sempit pada tablet. `xs={12}` membuat blok checkbox memakai full-width di mobile, `md={6}` setengah di tablet, `lg={3}` tetap rapi di desktop besar.

**Opsional (jika ingin konsisten):** Field "Urutan" di atasnya juga `Col md={3}` (baris 212). Boleh diubah jadi `Col xs={6} md={3}` agar selaras, tapi BUKAN bagian wajib task ini.

---

### Perubahan 3: ReminderPreviewPage — kolom Pratinjau Pesan terlalu sempit di mobile
**File:** `frontend/src/pages/reminders/ReminderPreviewPage.tsx`
**Grep untuk menemukan:** `maxWidth: 250, whiteSpace: 'pre-wrap'`

Inline style `maxWidth: 250` muncul di 4 tempat (baris 253, 271, 289, 307) pada `<td>` kolom Pratinjau Pesan. Tabel sudah `responsive` (baris 49), jadi bisa scroll horizontal — tetapi `maxWidth: 250` fixed membuat preview terpotong sempit di semua viewport. Ganti dengan `minWidth` agar pesan tetap terbaca dan tabel scroll natural.

**SEBELUM (muncul 4x — gunakan `replace_all`):**
```tsx
                      <td style={{ maxWidth: 250, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
```

**SESUDAH (4x):**
```tsx
                      <td style={{ minWidth: 200, maxWidth: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.messagePreview}</td>
```

**Penjelasan:** `maxWidth: 250` saja membuat sel pesan menyempit tanpa lantai minimum, sehingga di layout sempit teks bisa jadi kolom super tipis. `minWidth: 200` menjamin lebar baca minimum (memicu scroll horizontal pada tabel responsive di mobile), `maxWidth: 320` mencegah sel terlalu lebar di desktop. Karena keempat baris identik, pakai Edit dengan `replace_all: true`.

**CATATAN header kolom Aksi:** `<th style={{ width: 130 }}>Aksi</th>` (baris 58) boleh dibiarkan — itu lebar wajar untuk tombol "Simulasi Kirim". TIDAK perlu diubah.

### Gate verifikasi L-03
- [ ] `cd frontend; npm run build` lulus.
- [ ] DevTools responsive 375px: buka modal "Buat Tiket Pekerjaan" → grid kategori 2 kolom, tombol mudah disentuh (SUDAH benar dari CSS — hanya verifikasi, tanpa edit).
- [ ] DevTools 375px: `/staff-routines` form → 3 checkbox tidak berdesakan (turun ke bawah / full width).
- [ ] DevTools 375px: `/reminders` → tabel kandidat scroll horizontal, kolom Pratinjau Pesan tetap terbaca (tidak jadi kolom super tipis).
- [ ] `/rooms/:id/detail` tarif table tetap normal (tidak ada perubahan — verifikasi tidak rusak).

---

## Penutup
- Total file yang DIUBAH (5): `App.tsx`, `CashflowPage.tsx`, `FinancialRatiosPage.tsx`, `StaffRoutinesAdminPage.tsx`, `ReminderPreviewPage.tsx`.
- File yang DIBACA sebagai referensi & TIDAK diubah: `StaysPage.tsx`, `InvoicesPage.tsx`, `OwnerDashboardPage.tsx`, `DashboardAdmin.tsx`, `TicketsStaffMode.tsx`, `PublicRoomDetailPage.tsx`, `TicketsPage.tsx` (markup), `13-charts.css` (CSS kategori tiket sudah responsif).
- Setelah semua: `cd frontend; npm run build` harus lulus tanpa error.
