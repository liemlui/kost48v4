# Fase L — Spec Eksekusi L-04 s/d L-07 (Wizard, Balance Sheet, Guest, Auth)

> Spec ini ditulis untuk dieksekusi LANGSUNG tanpa interpretasi. Setiap blok SEBELUM
> dicopy persis dari file sumber pada 2026-06-20. Kalau kode di file sudah berbeda dari
> blok SEBELUM, JANGAN ubah — laporkan ke owner dulu.
>
> Path dasar frontend: `frontend/src`
> Verifikasi build setelah tiap task: `cd frontend; npm run build`

---

## Ringkasan keputusan per task

| Task | Status | Catatan singkat |
|------|--------|-----------------|
| L-04 | KERJAKAN | Progress bar SUDAH ADA (`WizardSteps`). Yang kurang: error fallback untuk query tenant gagal. Validasi meter SUDAH ADA. |
| L-05 | **SKIP / BUKAN BUG** | Logika warna Kewajiban memang sengaja dibalik (naik = merah). Sudah benar secara akuntansi. Lihat bukti di bawah. |
| L-06 | KERJAKAN | Password sementara belum ada tombol Salin. Alert "Jangan transfer" duplikat (form + success). |
| L-07 | KERJAKAN (kecil) | Redirect timeout reset 1200ms (boleh dinaikkan). LoginPage: semua field SUDAH auto-clear; tidak ada field yang tertinggal. |

---

## L-04 — CheckInWizard: Progress Bar + Field Validation

### Temuan baca kode (WAJIB dibaca dulu)

1. **Step state**: di `CheckInWizard.tsx` baris 27 → `const [step, setStep] = useState(1);`
   Ada 3 step (1=Tenant, 2=Kamar & Sewa, 3=Konfirmasi). Navigasi via `nextStep()` (baris 211)
   dan tombol Kembali (baris 506).
2. **Progress indicator SUDAH ADA**: dirender di baris 448 `<WizardSteps current={step} />`.
   Komponennya didefinisikan di `check-in-wizard/checkInWizardUtils.tsx` baris 62-78,
   memakai konstanta `STEPS = ['Tenant', 'Kamar & Sewa', 'Konfirmasi']` (baris 7).
   → **JADI tidak perlu membuat progress bar baru.** Yang dilakukan hanya MEMASTIKAN
   nama step jelas (sudah jelas) — tidak ada perubahan kode di sisi progress bar.
3. **Validasi meter SUDAH ADA**: di `StepDetailsAndMeters.tsx` field `initialElectricityKwh`
   (baris 167-175) dan `initialWaterM3` (baris 191-199) memakai `register(...)` dengan
   `required` + `validate` (cek NaN & negatif). Wizard parent juga revalidasi di
   `handleSubmitInternal()` (baris 250-267). → **Validasi cukup, tidak ada `onBlur` terpisah
   dan TIDAK perlu ditambah.**
4. **Tenant query error TIDAK ditangani**: di `CheckInWizard.tsx` baris 43-47 query
   `tenants/select` hanya mengambil `data: tenantsResp, isLoading: isLoadingTenants`,
   TIDAK mengambil `isError`. `StepTenantSelect` hanya menerima `isLoading`, tidak ada
   prop error. Kalau API tenant gagal, dropdown tampil kosong tanpa pesan.

→ **Satu-satunya perubahan nyata untuk L-04: tambahkan error fallback saat query tenant gagal.**

### File yang diubah
- `frontend/src/pages/stays/CheckInWizard.tsx` — ambil `isError` dari query tenant + kirim ke step 1.
- `frontend/src/pages/stays/check-in-wizard/StepTenantSelect.tsx` — terima prop `isError` & tampilkan Alert fallback.

### Perubahan 1: Ambil status error dari query tenant
**File:** `frontend/src/pages/stays/CheckInWizard.tsx`
**Grep untuk menemukan:** `data: tenantsResp, isLoading: isLoadingTenants`

**SEBELUM:**
```tsx
  const { data: tenantsResp, isLoading: isLoadingTenants } = useQuery({
    queryKey: ['tenants', 'select'],
    queryFn: () => listResource<Tenant>('tenants', { limit: 200 }),
    enabled: show,
  });
```

**SESUDAH:**
```tsx
  const { data: tenantsResp, isLoading: isLoadingTenants, isError: isTenantsError } = useQuery({
    queryKey: ['tenants', 'select'],
    queryFn: () => listResource<Tenant>('tenants', { limit: 200 }),
    enabled: show,
  });
```

**Penjelasan:** Menyediakan flag `isTenantsError` agar UI bisa membedakan "kosong karena
belum ada data" vs "kosong karena API gagal".

### Perubahan 2: Teruskan flag error ke StepTenantSelect
**File:** `frontend/src/pages/stays/CheckInWizard.tsx`
**Grep untuk menemukan:** `isLoading={isLoadingTenants}`

**SEBELUM:**
```tsx
              isLoading={isLoadingTenants}
              onCreateInlineTenant={handleCreateInlineTenant}
```

**SESUDAH:**
```tsx
              isLoading={isLoadingTenants}
              isError={isTenantsError}
              onCreateInlineTenant={handleCreateInlineTenant}
```

**Penjelasan:** Mengirim status error ke komponen step agar fallback bisa dirender di sana.

### Perubahan 3: Tambah prop `isError` di interface StepTenantSelect
**File:** `frontend/src/pages/stays/check-in-wizard/StepTenantSelect.tsx`
**Grep untuk menemukan:** `isLoading: boolean;`

**SEBELUM:**
```tsx
  isLoading: boolean;
  onCreateInlineTenant: (tenant: { fullName: string; phone: string; email: string; gender: string; identityNumber: string }) => void;
```

**SESUDAH:**
```tsx
  isLoading: boolean;
  isError?: boolean;
  onCreateInlineTenant: (tenant: { fullName: string; phone: string; email: string; gender: string; identityNumber: string }) => void;
```

**Penjelasan:** Menambah prop opsional `isError` ke kontrak komponen.

### Perubahan 4: Terima `isError` di destructuring props
**File:** `frontend/src/pages/stays/check-in-wizard/StepTenantSelect.tsx`
**Grep untuk menemukan:** `  isLoading,
  onCreateInlineTenant,`

**SEBELUM:**
```tsx
  isLoading,
  onCreateInlineTenant,
  isCreatingTenant,
```

**SESUDAH:**
```tsx
  isLoading,
  isError,
  onCreateInlineTenant,
  isCreatingTenant,
```

**Penjelasan:** Membaca prop baru di body komponen.

### Perubahan 5: Render fallback Alert saat query gagal
**File:** `frontend/src/pages/stays/check-in-wizard/StepTenantSelect.tsx`
**Grep untuk menemukan:** `<Form.Label>Penghuni</Form.Label>`

**SEBELUM:**
```tsx
        <Form.Group className="mb-3">
          <Form.Label>Penghuni</Form.Label>
          {isLoading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" />
              <span className="text-muted">Memuat data penghuni...</span>
            </div>
          ) : (
```

**SESUDAH:**
```tsx
        <Form.Group className="mb-3">
          <Form.Label>Penghuni</Form.Label>
          {isError ? (
            <Alert variant="warning" className="py-2 mb-0">
              Gagal memuat daftar penghuni. Periksa koneksi lalu muat ulang halaman, atau gunakan tombol "Tambah Penghuni Baru" di atas.
            </Alert>
          ) : isLoading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" />
              <span className="text-muted">Memuat data penghuni...</span>
            </div>
          ) : (
```

**Penjelasan:** Kalau API tenant gagal, user dapat pesan jelas (bukan dropdown kosong
yang membingungkan) dan diarahkan ke jalur alternatif (buat tenant baru inline).
`Alert` sudah diimpor di file ini (baris 2), jadi tidak perlu import tambahan.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅ (tidak ada error TS soal prop `isError`)
- [ ] Cek visual: buka Check-in Baru. Progress bar 3 langkah (Tenant → Kamar & Sewa → Konfirmasi) tampil di atas. Dot aktif berpindah saat klik Lanjut.
- [ ] Cek error path (opsional): matikan backend lalu buka wizard → muncul Alert kuning "Gagal memuat daftar penghuni…".

---

## L-05 — BalanceSheetPage: Bug Warna % Kewajiban → **BUKAN BUG, SKIP**

### Hasil investigasi (penting)

Audit menduga warna persentase Kewajiban salah. Setelah baca kode langsung,
**logikanya SUDAH BENAR dan sengaja dibalik**. Tidak ada perubahan kode.

**Bukti 1 — `BalanceSheetPage.tsx` baris 33-35** (warna delta per KPI):
```tsx
// Aset: naik = HIJAU (baik)
<div className="kpi-change" style={{color:d.change.assetsChangePercent>=0?'#22c55e':'#ef4444'}}>{pct(d.change.assetsChangePercent)}</div>
// Kewajiban: naik = MERAH (utang bertambah = kurang baik) — SENGAJA DIBALIK
<div className="kpi-change" style={{color:d.change.liabilitiesChangePercent>=0?'#ef4444':'#22c55e'}}>{pct(d.change.liabilitiesChangePercent)}</div>
// Ekuitas: naik = HIJAU (baik)
<div className="kpi-change" style={{color:d.change.equityChangePercent>=0?'#22c55e':'#ef4444'}}>{pct(d.change.equityChangePercent)}</div>
```
Untuk Aset & Ekuitas: `>=0 ? hijau : merah`.
Untuk Kewajiban: `>=0 ? merah : hijau`. Ini benar — kewajiban (utang) yang NAIK
seharusnya ditandai merah, kewajiban turun ditandai hijau.

**Bukti 2 — pola yang sama dipakai konsisten di `ProfitLossPage.tsx`** untuk "Beban":
- baris 34: `style={{color:d.change.expenseChangePercent>=0?'#ef4444':'#22c55e'}}` (beban naik = merah)
- baris 46-47: baris tabel beban juga `>=0?'#ef4444':'#22c55e'`
Sedangkan Revenue & Laba Bersih pakai `>=0?'#22c55e':'#ef4444'` (naik = hijau).
Jadi konvensi proyek: pos "buruk kalau naik" (Beban, Kewajiban) memang sengaja merah saat naik.

**Bukti 3 — `reportShared.tsx`**: TIDAK ADA helper khusus untuk warna delta Neraca/P&L.
Helper warna yang ada (`collectionRateLabel`, `netProfitMarginLabel`, dst, baris 112-141)
hanya untuk KPI rasio dashboard `/reports`, bukan untuk halaman Neraca. `BalanceSheetPage`
dan `ProfitLossPage` punya fungsi `pct()` inline sendiri masing-masing dan warna inline.

### Kesimpulan
**TIDAK ADA perubahan kode untuk L-05.** Tandai task ini "selesai — verified, bukan bug"
di M10. Jangan ubah baris 33-35 BalanceSheetPage; membaliknya justru AKAN membuat bug.

### Gate verifikasi
- [ ] Tidak ada edit file. Cukup catat di changelog: "L-05 ditutup — warna % Kewajiban sudah benar (naik=merah, by design), konsisten dengan Beban di P&L."

---

## L-06 — GuestBookingSuccess: Copy Password + DP Info

### Temuan baca kode

1. **Password sementara** ditampilkan di `GuestBookingSuccess.tsx` baris 54-70.
   Variabel: `const tempPwd = result.portalAccess.temporaryPassword;` (baris 14).
   Ditampilkan dalam `<code>` (baris 58) dengan toggle show/hide (state `showPassword`,
   baris 13). **TIDAK ada tombol Salin/Copy.** (Bandingkan: CheckInWizard versi staff
   PUNYA tombol Salin — guest tidak.)
2. **Alert DP 30%**: di `GuestBookingSuccess.tsx` **tidak ada** Alert DP 30%. Info DP 30%
   ada di `GuestBookingRoomSummary.tsx` baris 115-120 (teks hijau "Amankan kamar cukup
   dengan DP 30%…"). Halaman Success hanya punya Alert "Jangan transfer" (baris 86-88).
3. **Alert "Jangan transfer" DUPLIKAT**:
   - `GuestBookingSuccess.tsx` baris 86-88:
     `<strong>Jangan transfer sebelum tagihan resmi.</strong>`
   - `GuestBookingForm.tsx` baris 266-268:
     `Jangan transfer sebelum tagihan resmi muncul di portal.`
   Pesannya mirip tapi TIDAK identik. Form tampil sebelum submit; Success setelah submit.
   Keduanya valid di konteks masing-masing → **TIDAK perlu dihapus.** (Catatan: ini bukan
   duplikat pada satu layar yang sama, jadi aman.)
4. **Data password**: diterima via **props** — `result: PublicBookingResult` (baris 8-10),
   field `result.portalAccess.temporaryPassword`. Bukan dari URL/state.

→ **Perubahan nyata untuk L-06: tambahkan tombol Salin password di GuestBookingSuccess.**

### File yang diubah
- `frontend/src/pages/bookings/GuestBookingSuccess.tsx` — tambah tombol Salin + state copied/error.

### Perubahan 1: Tambah state untuk status salin
**File:** `frontend/src/pages/bookings/GuestBookingSuccess.tsx`
**Grep untuk menemukan:** `const [showPassword, setShowPassword] = useState(false);`

**SEBELUM:**
```tsx
  const [showPassword, setShowPassword] = useState(false);
  const tempPwd = result.portalAccess.temporaryPassword;
```

**SESUDAH:**
```tsx
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const tempPwd = result.portalAccess.temporaryPassword;

  const handleCopyPassword = async () => {
    if (!tempPwd) return;
    try {
      await navigator.clipboard.writeText(tempPwd);
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };
```

**Penjelasan:** Logika salin clipboard yang sama polanya dengan CheckInWizard
(`handleCopyPassword`, CheckInWizard.tsx baris 331-344), dengan fallback bila browser
menolak akses clipboard.

### Perubahan 2: Tambah tombol Salin di blok password
**File:** `frontend/src/pages/bookings/GuestBookingSuccess.tsx`
**Grep untuk menemukan:** `{showPassword ? 'Sembunyikan' : 'Tampilkan'}`

**SEBELUM:**
```tsx
                <div className="d-flex align-items-center gap-2 mt-2">
                  <code className="fs-5 bg-white px-2 py-1 rounded">{showPassword ? tempPwd : '••••••••'}</code>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                </div>
                <div className="mt-2">
                  <strong>Simpan password ini.</strong> Password sementara hanya ditampilkan di halaman ini dan tidak akan dikirim melalui email atau SMS.
                </div>
```

**SESUDAH:**
```tsx
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  <code className="fs-5 bg-white px-2 py-1 rounded">{showPassword ? tempPwd : '••••••••'}</code>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                  <Button
                    variant={copied ? 'success' : 'outline-primary'}
                    size="sm"
                    onClick={handleCopyPassword}
                  >
                    {copied ? '✅ Disalin' : '📋 Salin'}
                  </Button>
                </div>
                {copyError ? (
                  <div className="text-danger small mt-2">
                    Browser tidak mengizinkan salin otomatis. Silakan salin password secara manual dari kolom di atas.
                  </div>
                ) : null}
                <div className="mt-2">
                  <strong>Simpan password ini.</strong> Password sementara hanya ditampilkan di halaman ini dan tidak akan dikirim melalui email atau SMS.
                </div>
```

**Penjelasan:** Guest sering kesulitan menyalin password manual di HP. Tombol Salin
menyamakan UX dengan layar check-in staff. `Button` sudah diimpor (baris 2).
Saat menyalin, password tidak perlu dalam keadaan "Tampilkan" — `navigator.clipboard`
menyalin nilai asli `tempPwd` apa pun status show/hide.

### Catatan tentang DP & duplikasi (TIDAK ADA perubahan)
- Alert "Jangan transfer" di `GuestBookingForm.tsx` (baris 266-268) DAN
  `GuestBookingSuccess.tsx` (baris 86-88) dibiarkan — beda layar, beda konteks, bukan duplikasi sungguhan.
- Info DP 30% hanya ada di `GuestBookingRoomSummary.tsx` (baris 115-120), tampil pada
  layar form sebelum submit. Owner belum minta menambah DP di layar Success → JANGAN tambah.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅
- [ ] Cek visual: selesaikan booking tamu sampai halaman sukses dengan akun baru (ada password).
      Tombol "📋 Salin" muncul. Klik → berubah "✅ Disalin" 3 detik. Paste di Notepad → password benar.
- [ ] Tombol "Tampilkan/Sembunyikan" tetap berfungsi.

---

## L-07 — Auth Pages: Redirect Timeout + Error Auto-clear

### Temuan baca kode

1. **`ResetPasswordPage.tsx` baris 37-38**: setelah reset sukses,
   ```tsx
   setSuccess('Password berhasil diperbarui. Anda akan diarahkan ke login.');
   window.setTimeout(() => navigate('/login', { replace: true }), 1200);
   ```
   Timeout **1200 ms** dijalankan HANYA di jalur sukses (di dalam `try` setelah
   `await resetPassword`). 1200ms terlalu cepat untuk membaca pesan sukses.
2. **`ForgotPasswordPage.tsx` baris 77-79**: teks "Response sistem akan tetap generik…"
   ada di dalam `<div className="form-helper mb-4">`, diletakkan di antara input identifier
   (Form.Group, baris 68-75) dan tombol submit (baris 81-83). Ini hanya teks helper statis,
   bukan komponen Alert. → **tidak ada bug; tidak diubah** (hanya dicatat sesuai permintaan).
3. **`LoginPage.tsx`**: terdapat 2 field input —
   - identifier: `onChange` baris 175-178 → memanggil `setFieldErrors((prev) => ({ ...prev, identifier: undefined, form: undefined }))` (auto-clear ✅)
   - password: `onChange` baris 193-196 → `setFieldErrors((prev) => ({ ...prev, password: undefined, form: undefined }))` (auto-clear ✅)
   **KEDUA field SUDAH auto-clear error masing-masing + error `form`.** Tidak ada field
   yang tertinggal tanpa auto-clear. → **tidak ada bug auto-clear di LoginPage.**

→ **Satu-satunya perubahan nyata untuk L-07: naikkan timeout redirect ResetPassword dari 1200ms ke 2000ms** agar user sempat membaca pesan sukses. Sisanya (Forgot helper, Login auto-clear) sudah benar.

### File yang diubah
- `frontend/src/pages/auth/ResetPasswordPage.tsx` — naikkan delay redirect.

### Perubahan 1: Naikkan timeout redirect agar pesan sukses terbaca
**File:** `frontend/src/pages/auth/ResetPasswordPage.tsx`
**Grep untuk menemukan:** `window.setTimeout(() => navigate('/login', { replace: true }), 1200);`

**SEBELUM:**
```tsx
      setSuccess('Password berhasil diperbarui. Anda akan diarahkan ke login.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
```

**SESUDAH:**
```tsx
      setSuccess('Password berhasil diperbarui. Anda akan diarahkan ke login dalam beberapa detik.');
      window.setTimeout(() => navigate('/login', { replace: true }), 2000);
```

**Penjelasan:** 1200ms terlalu singkat untuk membaca konfirmasi. 2000ms memberi waktu
baca tanpa terasa menggantung. Teks juga disesuaikan agar ekspektasi user jelas.

### Catatan (TIDAK ADA perubahan)
- **ForgotPasswordPage**: teks generik di `form-helper` (baris 77-79) sudah tepat posisinya
  (antara input dan tombol). Tidak diubah.
- **LoginPage**: kedua field (identifier & password) sudah memanggil auto-clear pada
  `onChange`. Tidak ada field yang tertinggal. Tidak ada perubahan. JANGAN tambah
  auto-clear ke field yang tidak ada.

### Gate verifikasi
- [ ] `cd frontend; npm run build` ✅
- [ ] Cek visual: di halaman Reset Password dengan token valid → setelah submit, pesan sukses tampil ±2 detik baru pindah ke /login.
- [ ] LoginPage: ketik salah → muncul error → mulai mengetik ulang di field identifier ATAU password → error hilang otomatis (perilaku sudah ada, hanya konfirmasi tidak rusak).

---

## Lampiran — Ringkasan file & baris kunci (untuk audit cepat)

| Task | File | Baris kunci | Aksi |
|------|------|-------------|------|
| L-04 | CheckInWizard.tsx | 43-47, 467 | tambah `isError`, kirim ke step |
| L-04 | StepTenantSelect.tsx | 15, 29, 92-99 | terima `isError`, render Alert |
| L-04 | checkInWizardUtils.tsx | 7, 62-78 | (referensi) progress bar sudah ada |
| L-05 | BalanceSheetPage.tsx | 33-35 | TIDAK DIUBAH (by design) |
| L-05 | ProfitLossPage.tsx | 34, 46-47 | bukti konvensi warna |
| L-06 | GuestBookingSuccess.tsx | 13-14, 57-69 | tambah state + tombol Salin |
| L-07 | ResetPasswordPage.tsx | 37-38 | timeout 1200→2000ms |
| L-07 | ForgotPasswordPage.tsx | 77-79 | TIDAK DIUBAH |
| L-07 | LoginPage.tsx | 175-178, 193-196 | TIDAK DIUBAH (auto-clear sudah ada) |
