# Fase L — Spec Eksekusi L-12 s/d L-15

> Spec ini ditulis untuk dikerjakan langkah demi langkah. Kode **SEBELUM** disalin
> persis dari file (baris nyata). Jangan menebak — cari string yang ditandai
> "Grep untuk menemukan" lalu ganti tepat seperti blok SEBELUM/SESUDAH.
>
> Path dasar semua file: `frontend/src/...`
>
> **Catatan penting hasil audit:** beberapa "masalah" ternyata sudah benar di
> kode. Itu ditandai dengan **TEMUAN: sudah benar** dan tidak perlu diubah.

---

## L-12 — Enum → Label Indonesia

### Ringkasan temuan
| Berkas | Status enum | Tindakan |
|---|---|---|
| `LoyaltyAdminPage.tsx` — Tipe Reward | **Enum mentah** (`RENT_DISCOUNT`, dll) dirender langsung di `<option>` dan kolom tabel | **PERLU diperbaiki** (Perubahan 1 & 2) |
| `LoyaltyAdminPage.tsx` — tombol simpan | Sudah dinamis (`Menyimpan...` / `Simpan`) + judul modal dinamis | **sudah benar** |
| `ServiceInterestsPage.tsx` — status + tab | Sudah punya `STATUS_META` & `TABS` label Indonesia | **sudah benar** (pola rujukan) |
| `FinancialRatiosPage.tsx` — badge label | Warna ditentukan `colorMap` global; parameter `scheme` pada `labelBadge` **tidak terpakai** (dead arg) | **PERLU dirapikan** (Perubahan 3, opsional-aman) |

### File yang diubah
- `pages/loyalty/LoyaltyAdminPage.tsx` — beri label Indonesia untuk Tipe Reward (option + kolom tabel).
- `pages/reports/FinancialRatiosPage.tsx` — hapus argumen `scheme` yang menyesatkan pada `labelBadge` (opsional, hanya kerapian).

---

### Perubahan 1: Tambah peta label Tipe Reward (LoyaltyAdminPage)
**File:** `pages/loyalty/LoyaltyAdminPage.tsx`
**Grep untuk menemukan:** `const REWARD_TYPES = [`

**SEBELUM:**
```tsx
const REWARD_TYPES = ['RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL'];
const STATUS_VARIANT: Record<string, string> = { PENDING: 'warning', APPROVED: 'info', FULFILLED: 'success', REJECTED: 'danger', CANCELLED: 'secondary' };
```

**SESUDAH:**
```tsx
const REWARD_TYPES = ['RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL'];
const REWARD_TYPE_LABEL: Record<string, string> = {
  RENT_DISCOUNT: 'Diskon Sewa',
  SERVICE_ADDON: 'Layanan Tambahan',
  METER_DISCOUNT: 'Diskon Meter (Listrik/Air)',
  BADGE: 'Lencana',
  PHYSICAL: 'Barang Fisik',
};
const STATUS_VARIANT: Record<string, string> = { PENDING: 'warning', APPROVED: 'info', FULFILLED: 'success', REJECTED: 'danger', CANCELLED: 'secondary' };
```

**Penjelasan:** Mengikuti pola yang sudah dipakai di `ServiceInterestsPage.tsx`
(`STATUS_META`) dan `StaffRoutinesAdminPage.tsx` (`areaLabel`/`frequencyLabel`):
peta `Record<string,string>` di level modul. Belum berdampak sampai dipakai di
Perubahan 2.

---

### Perubahan 2: Pakai label Indonesia di option & kolom tabel (LoyaltyAdminPage)
**File:** `pages/loyalty/LoyaltyAdminPage.tsx`

**2a. Kolom "Tipe" pada tabel katalog reward**
**Grep untuk menemukan:** `<td><small>{r.type}</small></td>`

**SEBELUM:**
```tsx
                  <td><small>{r.type}</small></td>
```

**SESUDAH:**
```tsx
                  <td><small>{REWARD_TYPE_LABEL[r.type] ?? r.type}</small></td>
```

**2b. Dropdown Tipe di dalam modal form**
**Grep untuk menemukan:** `{REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}`

**SEBELUM:**
```tsx
          <Form.Group className="mb-3"><Form.Label>Tipe</Form.Label><Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Form.Select></Form.Group>
```

**SESUDAH:**
```tsx
          <Form.Group className="mb-3"><Form.Label>Tipe</Form.Label><Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{REWARD_TYPES.map((t) => <option key={t} value={t}>{REWARD_TYPE_LABEL[t] ?? t}</option>)}</Form.Select></Form.Group>
```

**Penjelasan:** `value` tetap enum mentah (dikirim ke API tidak berubah), hanya
teks yang dilihat user jadi Bahasa Indonesia. Fallback `?? r.type` / `?? t`
menjaga aman bila backend menambah tipe baru yang belum ada di peta.

---

### Perubahan 3 (opsional, kerapian): rapikan `labelBadge` (FinancialRatiosPage)
**File:** `pages/reports/FinancialRatiosPage.tsx`
**Grep untuk menemukan:** `function labelBadge(label:string,scheme:`

**TEMUAN FAKTUAL:** Warna badge SUDAH konsisten dan benar untuk semua section,
karena ditentukan oleh `colorMap` **berdasarkan teks label aktual** (`BAIK`,
`CUKUP`, `RENDAH`, `TINGGI`, `EFISIEN`, `BOROS`). Contoh: di Solvabilitas, badge
"RENDAH" tetap hijau (`success`) karena `colorMap['RENDAH']` bukan dilihat dari
argumen `scheme`.

Argumen `scheme` yang dioper di tiap pemanggilan (mis. `{BAIK:'RENDAH',CUKUP:'CUKUP',RENDAH:'TINGGI'}`)
**tidak pernah dibaca** di dalam fungsi — ini "dead argument" yang menyesatkan
pembaca (seolah mapping berbeda per section, padahal tidak). Perbaikan hanya
membuang argumen mati ini agar tidak ada salah paham di masa depan.

**SEBELUM:**
```tsx
function labelBadge(label:string,scheme:{BAIK:string,CUKUP:string,EFISIEN?:string,RENDAH?:string,BOROS?:string,TINGGI?:string}) {
  const colorMap:Record<string,string>={BAIK:'success',CUKUP:'warning',EFISIEN:'success',RENDAH:'secondary',BOROS:'danger',TINGGI:'danger'};
  return <Badge bg={colorMap[label]||'secondary'}>{label}</Badge>;
}
```

**SESUDAH:**
```tsx
function labelBadge(label:string) {
  const colorMap:Record<string,string>={BAIK:'success',CUKUP:'warning',EFISIEN:'success',RENDAH:'secondary',BOROS:'danger',TINGGI:'danger'};
  return <Badge bg={colorMap[label]||'secondary'}>{label}</Badge>;
}
```

Lalu ubah keempat pemanggilan (hapus argumen kedua):
**Grep untuk menemukan:** `labelBadge(d.`

**SEBELUM (4 baris, satu per section):**
```tsx
<td>{labelBadge(d.liquidity.label,{BAIK:'BAIK',CUKUP:'CUKUP',RENDAH:'RENDAH'})}</td>
<td>{labelBadge(d.profitability.label,{BAIK:'BAIK',CUKUP:'CUKUP',RENDAH:'RENDAH'})}</td>
<td>{labelBadge(d.solvency.label,{BAIK:'RENDAH',CUKUP:'CUKUP',RENDAH:'TINGGI'})}</td>
<td>{labelBadge(d.efficiency.label,{BAIK:'EFISIEN',CUKUP:'CUKUP',EFISIEN:'BOROS'})}</td>
```

**SESUDAH:**
```tsx
<td>{labelBadge(d.liquidity.label)}</td>
<td>{labelBadge(d.profitability.label)}</td>
<td>{labelBadge(d.solvency.label)}</td>
<td>{labelBadge(d.efficiency.label)}</td>
```

**Penjelasan:** Tidak mengubah tampilan sama sekali (warna & teks identik),
hanya menghapus argumen mati. Jika tim AI lemah ragu, **boleh dilewati** — ini
murni kerapian, bukan bug fungsional.

### Gate verifikasi L-12
- [ ] `cd frontend; npm run build` ✅
- [ ] Buka Loyalitas & Reward → modal "+ Reward" → dropdown Tipe menampilkan "Diskon Sewa", "Layanan Tambahan", "Diskon Meter (Listrik/Air)", "Lencana", "Barang Fisik".
- [ ] Kolom "Tipe" di tabel Katalog Reward menampilkan teks Indonesia, bukan `PHYSICAL`.
- [ ] Halaman Rasio Keuangan: warna badge tidak berubah (RENDAH di Solvabilitas tetap hijau-netral, dst).

---

## L-13 — Staff/Admin Button Loading + Success Feedback

### Ringkasan temuan
| Lokasi | Loading state | Tindakan |
|---|---|---|
| `TicketsStaffMode.tsx` — tombol "Mulai Kerjakan" / "Kirim Bukti" | `disabled={simpleAction.isPending}` ada, **tapi teks tidak berubah** saat loading | **PERLU** (Perubahan 1) |
| `AdminWorkspaces.tsx` — `closeTicketMutation` | onSuccess sudah tutup modal + invalidate 4 query; tombol modal sudah `Menutup...` | **sudah benar** |
| `StaffRoutinesAdminPage.tsx` — template nonaktif | Tombol "Nonaktifkan" hanya muncul saat aktif; **tidak ada tombol "Aktifkan kembali"** untuk template `isActive === false` | **PERLU** (Perubahan 2) |
| `PaymentReviewPage.tsx` — label "Catatan hasil pekerjaan" | **Tidak ada label tersebut** di file ini (catatan review ada di `ReviewPaymentModal`) | **sudah benar / N/A** (lihat catatan) |

### File yang diubah
- `pages/tickets/TicketsStaffMode.tsx` — teks tombol berubah saat aksi berjalan.
- `pages/staff-routines/StaffRoutinesAdminPage.tsx` — tombol "Aktifkan" untuk template nonaktif + loading state.

---

### Perubahan 1: Teks tombol staf saat loading (TicketsStaffMode)
**File:** `pages/tickets/TicketsStaffMode.tsx`
**Grep untuk menemukan:** `Mulai Kerjakan</Button>`

**TEMUAN FAKTUAL:** Tombol sudah `disabled={simpleAction.isPending}` jadi tidak
bisa diklik dua kali. Yang kurang hanya **umpan balik visual teks**. Karena
`simpleAction` dipakai bersama beberapa tombol, agar tombol yang benar saja yang
berubah teksnya, gunakan kombinasi `isPending` + cek apakah tombol ini yang
sedang dikirim. Namun `simpleAction` di file ini tidak menyimpan id target,
sehingga pendekatan paling aman & sederhana adalah cukup menampilkan
"Memproses..." pada tombol yang diklik selama `isPending`.

**SEBELUM:**
```tsx
                    {item.status === 'OPEN' ? <Button size="sm" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>Mulai Kerjakan</Button> : null}
                    {item.status === 'IN_PROGRESS' ? <Button size="sm" variant="success" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>Kirim Bukti</Button> : null}
```

**SESUDAH:**
```tsx
                    {item.status === 'OPEN' ? <Button size="sm" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>{simpleAction.isPending ? 'Memproses...' : 'Mulai Kerjakan'}</Button> : null}
                    {item.status === 'IN_PROGRESS' ? <Button size="sm" variant="success" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>Kirim Bukti</Button> : null}
```

**Penjelasan:** Hanya "Mulai Kerjakan" yang memanggil `simpleAction.mutate`
langsung; "Kirim Bukti" hanya membuka modal (`setDoneTicket`) sehingga tidak
perlu teks loading. Saat ada banyak tiket OPEN, semua tombol "Mulai Kerjakan"
akan ikut tampil "Memproses..." selama satu mutasi berjalan — ini dapat
diterima karena seluruhnya juga ter-`disabled` (mencegah klik ganda).

> Catatan untuk peningkatan lanjutan (opsional, JANGAN dikerjakan kalau ragu):
> jika ingin hanya satu tombol berubah, perlu menyimpan id tiket yang sedang
> diproses (`simpleAction.variables?.path`). Itu mengubah API komponen induk,
> jadi di luar lingkup spec ini.

---

### Perubahan 2: Tombol "Aktifkan" untuk template nonaktif (StaffRoutinesAdminPage)
**File:** `pages/staff-routines/StaffRoutinesAdminPage.tsx`

**TEMUAN FAKTUAL:** Saat ini, template dengan `isActive === false` hanya bisa
diedit via tombol "Edit" (lalu centang "Aktif" + Simpan). Tidak ada jalan cepat
satu klik untuk mengaktifkan kembali. Selain itu tombol "Nonaktifkan" belum
menampilkan loading.

**2a. Tambah `reactivateMutation` di dekat `deactivateMutation`**
**Grep untuk menemukan:** `const deactivateMutation = useMutation({`

**SEBELUM:**
```tsx
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deleteStaffRoutineTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] });
    },
  });
```

**SESUDAH:**
```tsx
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deleteStaffRoutineTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (item: StaffRoutineTemplate) => updateStaffRoutineTemplate(item.id, { ...toPayload({ ...initialForm,
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      frequency: item.frequency,
      areaType: item.areaType ?? 'GENERAL',
      dayOfWeek: item.dayOfWeek != null ? String(item.dayOfWeek) : '',
      dayOfMonth: item.dayOfMonth != null ? String(item.dayOfMonth) : '',
      requiresPhoto: Boolean(item.requiresPhoto),
      requiresNote: Boolean(item.requiresNote),
      sortOrder: String(item.sortOrder ?? 0),
    }), isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] });
    },
  });
```

> **Penjelasan toPayload:** `toPayload` butuh seluruh `FormState`. Kita rakit
> ulang dari `item` (mirip fungsi `edit`) lalu paksa `isActive: true`. Ini
> mengirim field lengkap sehingga backend tidak kehilangan data lain saat
> mengaktifkan kembali. Jika backend mendukung partial update `{ isActive: true }`,
> versi sederhana boleh dipakai — TANYAKAN dulu sebelum menyederhanakan.

**2b. Tampilkan tombol "Aktifkan" pada baris nonaktif + loading di "Nonaktifkan"**
**Grep untuk menemukan:** `onClick={() => deactivateMutation.mutate(item.id)}>Nonaktifkan</Button>`

**SEBELUM:**
```tsx
                    <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => edit(item)}>Edit</Button>{item.isActive !== false ? <Button size="sm" variant="outline-danger" className="ms-2" onClick={() => deactivateMutation.mutate(item.id)}>Nonaktifkan</Button> : null}</td>
```

**SESUDAH:**
```tsx
                    <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => edit(item)}>Edit</Button>{item.isActive !== false ? <Button size="sm" variant="outline-danger" className="ms-2" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate(item.id)}>{deactivateMutation.isPending ? 'Memproses...' : 'Nonaktifkan'}</Button> : <Button size="sm" variant="outline-success" className="ms-2" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(item)}>{reactivateMutation.isPending ? 'Memproses...' : 'Aktifkan'}</Button>}</td>
```

**Penjelasan:** Template nonaktif kini punya aksi "Aktifkan" satu klik. Kedua
tombol menampilkan "Memproses..." + `disabled` saat mutasi berjalan.

---

### Catatan L-13.4 (PaymentReviewPage — "Catatan hasil pekerjaan")
**TEMUAN FAKTUAL:** String "Catatan hasil pekerjaan" **tidak ada** di
`PaymentReviewPage.tsx`. Halaman ini soal review bukti bayar; input catatan
penolakan ada di komponen `components/payments/ReviewPaymentModal.tsx`
(dipanggil di baris ~450). Tidak ada inkonsistensi Alert untuk diperbaiki di
file ini. **Tidak ada perubahan.** Jika audit memang menyasar modal review,
buka `ReviewPaymentModal.tsx` secara terpisah — di luar lingkup spec ini.

### Gate verifikasi L-13
- [ ] `cd frontend; npm run build` ✅
- [ ] Mode staf (Tugas Lapangan): klik "Mulai Kerjakan" → tombol berubah "Memproses..." & non-aktif sampai sukses.
- [ ] Atur Pekerjaan Rutin Staf: nonaktifkan satu template → muncul tombol hijau "Aktifkan"; klik → template aktif lagi.

---

## L-14 — StayDetailPage: Prioritas Alert + Format Mata Uang

### Ringkasan temuan
**Alert di hero section `StayDetailPage.tsx`** (di dalam `<Card className="detail-hero">`),
urutan render JSX saat ini:
1. **`checkoutReadinessSummary`** (baris 272) — variant dinamis (`summary.tone`), selalu tampil. Ringkasan kesiapan checkout.
2. **"Booking Mandiri"** (baris 286) — `variant="info"`, hanya bila `status==='ACTIVE' && room.status==='RESERVED'`. (Berada di area tombol kanan, bukan tumpukan utama.)
3. **"Aturan perpanjangan"** (baris 330) — `variant="info"`, **selalu tampil**. Info statis.
4. **`hasUnpaid`** (baris 334) — `variant="warning"`, bila ada tagihan ISSUED/PARTIAL.
5. **`overdue`** (baris 341) — `variant="warning"`, bila ada tagihan jatuh tempo lewat.
6. **`pendingCheckoutRequest`** (baris 347) — `variant="warning"`, ada pengajuan keluar.
7. **`approveCheckoutError`** (baris 381) — `variant="danger"`, error aksi.
8. **`approvedCheckoutRequest`** (baris 387) — `variant="info"`, rencana keluar disetujui.

**Masalah prioritas:** Alert info statis "Aturan perpanjangan" (severity rendah)
muncul **di atas** alert warning `hasUnpaid`/`overdue` (severity tinggi).
Idealnya: error & warning (butuh tindakan) di atas; info statis paling bawah.

**Format mata uang metric tiles (baris 311-327):** memakai `formatRupiah(... ?? 0)`
— konsisten antar tile uang. "Akhir Masa Sewa" pakai `formatDateSafe` (memang
tanggal) dan "Tagihan aktif" angka polos (memang hitungan, bukan uang). **TEMUAN:
format mata uang sudah konsisten** — tidak perlu diubah. (Bandingkan: `InfoTab`
& `FinanceTab` memakai komponen `<CurrencyDisplay>`; `StayDetailPage` memakai
helper `formatRupiah` — beda mekanisme tapi keduanya benar untuk Rupiah.)

### File yang diubah
- `pages/stays/StayDetailPage.tsx` — pindahkan Alert info statis "Aturan perpanjangan" ke bawah tumpukan alert keuangan.

---

### Perubahan 1: Turunkan prioritas Alert "Aturan perpanjangan"
**File:** `pages/stays/StayDetailPage.tsx`
**Grep untuk menemukan:** `<strong>Aturan perpanjangan:</strong>`

Saat ini blok "Aturan perpanjangan" (info, severity rendah) berada SEBELUM blok
`hasUnpaid` dan `overdue` (warning, butuh tindakan). Kita pindahkan agar warning
keuangan tampil lebih dulu.

**SEBELUM (urutan: Aturan perpanjangan → hasUnpaid → overdue):**
```tsx
          <Alert variant="info" className="mb-3">
            <strong>Aturan perpanjangan:</strong> perpanjangan wajib catat meter.
          </Alert>

          {hasUnpaid ? (
            <Alert variant="warning" className="mb-3">
              <strong>Ada tagihan yang belum dibayar.</strong>
              <div className="small mt-1">Cek tab Keuangan.</div>
            </Alert>
          ) : null}

          {overdue ? (
            <Alert variant="warning" className="mb-0">
              Tagihan overdue. Cek Keuangan.
            </Alert>
          ) : null}
```

**SESUDAH (urutan: hasUnpaid → overdue → Aturan perpanjangan):**
```tsx
          {hasUnpaid ? (
            <Alert variant="warning" className="mb-3">
              <strong>Ada tagihan yang belum dibayar.</strong>
              <div className="small mt-1">Cek tab Keuangan.</div>
            </Alert>
          ) : null}

          {overdue ? (
            <Alert variant="warning" className="mb-3">
              Tagihan overdue. Cek Keuangan.
            </Alert>
          ) : null}

          <Alert variant="info" className="mb-3">
            <strong>Aturan perpanjangan:</strong> perpanjangan wajib catat meter.
          </Alert>
```

**Penjelasan:** Alert yang butuh tindakan (tagihan belum bayar / overdue) kini
naik ke atas; info statis aturan perpanjangan turun ke bawah. Perhatikan
perubahan kelas margin: `overdue` semula `mb-0` (karena dulu paling bawah)
diubah jadi `mb-3` karena sekarang ada alert di bawahnya; "Aturan perpanjangan"
memakai `mb-3` agar ada jarak ke blok `pendingCheckoutRequest` berikutnya.

**Severity/urutan logis final (atas → bawah):**
1. `checkoutReadinessSummary` (ringkasan, tetap paling atas — tone dinamis)
2. `hasUnpaid` (warning — tindakan)
3. `overdue` (warning — tindakan)
4. `Aturan perpanjangan` (info statis)
5. `pendingCheckoutRequest` (warning — tindakan, tetap di posisi semula)
6. `approveCheckoutError` (danger — tetap)
7. `approvedCheckoutRequest` (info — tetap)

> Catatan: blok "Booking Mandiri" (baris 286) berada di kolom tombol kanan, bukan
> tumpukan alert utama. JANGAN dipindahkan.

### Gate verifikasi L-14
- [ ] `cd frontend; npm run build` ✅
- [ ] Buka detail masa sewa yang punya tagihan belum dibayar: alert "Ada tagihan yang belum dibayar." muncul DI ATAS "Aturan perpanjangan".
- [ ] Metric tile "Sewa disepakati" & "Deposit" tetap format Rupiah (mis. `Rp1.500.000`); "Akhir Masa Sewa" tetap tanggal; "Tagihan aktif" tetap angka.

---

## L-15 — TenantWorkspaceTabs + Announcement Truncate + MyManualPage

### Ringkasan temuan
| Item | Temuan | Tindakan |
|---|---|---|
| Loading "Memuat portal…" | Dirender saat `stageLoading === true` (baris 112-121); rapi, satu blok. | **sudah benar** |
| Announcement strip | `selected.content` dirender via `<p>{selected.content}</p>` **tanpa batas baris** — pengumuman panjang bisa membanjiri topbar | **PERLU truncate** (Perubahan 1) |
| `MyManualPage` Accordion | `alwaysOpen={false}`, **tanpa `defaultActiveKey`**; state TIDAK disimpan (reset saat pindah halaman) | **opsional**: buka item pertama default (Perubahan 2) |
| FAQ per kategori | Dikelompokkan via `grouped` (`Map<string, FaqItem[]>`), tiap kategori satu `<Card>` + satu `<Accordion>` | **sudah benar** (struktur jelas) |

### File yang diubah
- `components/tenant/TenantWorkspaceTabs.tsx` — batasi tinggi/baris konten pengumuman (truncate 2 baris via CSS inline).
- `pages/portal/MyManualPage.tsx` — (opsional) buka otomatis FAQ pertama tiap kategori.

---

### Perubahan 1: Truncate konten pengumuman (TenantWorkspaceTabs)
**File:** `components/tenant/TenantWorkspaceTabs.tsx`
**Grep untuk menemukan:** `{selected.content ? <p>{selected.content}</p> : null}`

**SEBELUM:**
```tsx
          {selected.content ? <p>{selected.content}</p> : null}
```

**SESUDAH:**
```tsx
          {selected.content ? (
            <p
              className="tenant-announcement-content"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 0,
              }}
            >
              {selected.content}
            </p>
          ) : null}
```

**Penjelasan:** Membatasi konten pengumuman maksimal 2 baris dengan elipsis
(`-webkit-line-clamp`) supaya strip atas tidak melar saat pengumuman panjang.
Tombol "Lihat" (sudah ada, baris 64) tetap mengarah ke halaman detail untuk teks
penuh. Style ditaruh inline agar tidak perlu menyentuh file CSS terpisah; bila
proyek punya konvensi CSS khusus, kelas `tenant-announcement-content` bisa
dipindah ke stylesheet — TANYAKAN bila ragu.

---

### Perubahan 2 (opsional): Buka FAQ pertama tiap kategori (MyManualPage)
**File:** `pages/portal/MyManualPage.tsx`
**Grep untuk menemukan:** `<Accordion flush alwaysOpen={false}>`

**TEMUAN FAKTUAL:** Accordion tidak menyimpan state (wajar untuk halaman manual)
dan tidak ada item terbuka saat masuk. Agar tenant langsung melihat satu jawaban
contoh per kategori, buka item pertama secara default.

**SEBELUM:**
```tsx
          <Accordion flush alwaysOpen={false}>
            {items.map((faq) => (
```

**SESUDAH:**
```tsx
          <Accordion flush alwaysOpen={false} defaultActiveKey={items[0] ? String(items[0].id) : undefined}>
            {items.map((faq) => (
```

**Penjelasan:** `defaultActiveKey` cocok dengan `eventKey={String(faq.id)}` yang
sudah dipakai (baris 45). Item pertama tiap kategori terbuka saat halaman dibuka;
sisanya tetap tertutup. Murni UX, tidak mengubah data. Boleh dilewati bila owner
ingin semua tertutup.

### Gate verifikasi L-15
- [ ] `cd frontend; npm run build` ✅
- [ ] Buat pengumuman dengan konten panjang (>3 baris): strip atas penghuni hanya menampilkan 2 baris + elipsis; tombol "Lihat" membuka teks penuh.
- [ ] Halaman "Panduan & Aturan Kos": FAQ pertama tiap kategori terbuka otomatis (jika Perubahan 2 diterapkan).

---

## Ringkasan total perubahan
| Task | File | Wajib? |
|---|---|---|
| L-12.1/2 | `pages/loyalty/LoyaltyAdminPage.tsx` | Wajib |
| L-12.3 | `pages/reports/FinancialRatiosPage.tsx` | Opsional (kerapian) |
| L-13.1 | `pages/tickets/TicketsStaffMode.tsx` | Wajib |
| L-13.2 | `pages/staff-routines/StaffRoutinesAdminPage.tsx` | Wajib |
| L-14 | `pages/stays/StayDetailPage.tsx` | Wajib |
| L-15.1 | `components/tenant/TenantWorkspaceTabs.tsx` | Wajib |
| L-15.2 | `pages/portal/MyManualPage.tsx` | Opsional (UX) |

**Tidak perlu diubah (sudah benar):** save button LoyaltyAdminPage; `closeTicketMutation`
AdminWorkspaces; STATUS_META/TABS ServiceInterestsPage; warna badge FinancialRatiosPage;
format mata uang metric tiles StayDetailPage; loading "Memuat portal…" TenantWorkspaceTabs;
struktur FAQ per kategori MyManualPage; PaymentReviewPage (tidak ada "Catatan hasil pekerjaan").
