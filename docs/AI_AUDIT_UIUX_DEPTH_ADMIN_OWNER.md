# Audit Kedalaman UI/UX — Halaman Admin/Owner (Level-Kode)

**Tanggal:** 8 Juli 2026 · **Auditor:** Claude (sesi audit lapisan pola-UX, terpisah dari audit struktural orphaned-endpoint)

## ⚠️ Batasan Metodologi — WAJIB dibaca sebelum pakai laporan ini

Auditor **tidak punya akses browser** (tak ada tool screenshot/Playwright/DOM-inspect). Audit ini murni **level-kode** (grep + baca file), bukan visual. **TIDAK DICEK sama sekali:** warna, layout, spacing, responsif mobile, kontras, kecepatan render, animasi, ataupun perilaku runtime aktual (mis. apakah state benar-benar berubah di browser, race condition UI). Yang dicek murni: pola kode yang berkorelasi dengan UX (ada/tidaknya penanganan loading/error/empty/confirm/toast, dan reachability route dari config sidebar).

**Rekomendasi wajib sebelum go-live:** owner atau admin klik-manual `npm run dev` dan telusuri sendiri semua halaman prioritas di bawah (terutama check-in, review pembayaran, dan approve/reject) sebagai langkah penutup — audit kode tidak bisa menggantikan itu.

## Tujuan & Metodologi

Audit sebelumnya (`docs/AI_AUDIT_ORPHANED_ENDPOINTS_ADMIN_OWNER.md`) menjawab "apakah backend↔frontend nyambung". Audit ini menjawab pertanyaan berbeda: **"apakah yang nyambung itu punya pola UX yang layak produksi?"** — untuk halaman Admin/Owner yang paling sering dipakai staf (jalur uang, check-in, tiket, kamar).

Untuk tiap halaman prioritas, dicek 7 pola via grep + baca bagian relevan (bukan baca file penuh):
1. Loading state saat fetch
2. Error state saat query gagal
3. Empty state saat data kosong
4. Konfirmasi sebelum aksi destruktif (hapus/tolak/batalkan)
5. Tombol `disabled` tanpa `title=` penjelasan
6. Feedback sukses setelah mutation (toast/alert)
7. Halaman terjangkau dari sidebar/nav (bukan "halaman yatim")

Hanya penyimpangan nyata yang dilaporkan — pola yang sudah benar tidak dicatat satu-satu (hemat token). Halaman dengan skala dampak besar (SimpleCrudPage — dipakai lintas modul) diprioritaskan.

**Catatan cakupan:** `AccountingSetupPage.tsx` dan `AssetRegisterPage.tsx` ada dalam scope audit ini (sudut pandang beda: pola UX, bukan endpoint orphan yang sedang dikerjakan AI lain di file yang sama) — tidak ada kode yang diubah, dan temuan yang tumpang tindih dengan audit orphan-endpoint (mis. "tak ada tombol Edit Aset") sengaja **tidak diulang** di sini.

---

## Tabel Temuan

| # | Halaman/Komponen | Pola | file:line | Severity | Catatan |
|---|---|---|---|---|---|
| 1 | `SimpleCrudPage` (generic CRUD — dipakai `/expenses`, `/invoice-payments`, `/wifi-sales`, `/additional-services`) | #4 Konfirmasi destruktif | `frontend/src/pages/resources/SimpleCrudPage.tsx:397-406` (`handleDelete`), `frontend/src/components/resources/ResourceTable.tsx:399-403` (tombol "Hapus") | **High** | Lihat analisis di bawah |
| 2 | `StaysPage.tsx` — approve/reject checkout, reject booking, expire booking (level daftar) | #2 Error state mutation | `frontend/src/pages/stays/StaysPage.tsx:181-255` (4 mutation), `:928-945` (modal dipasang tanpa prop error) | **High** | Lihat analisis di bawah |
| 3 | `StaysPage.tsx` — tombol "Jalankan Kedaluwarsa" | #4 Konfirmasi destruktif | `frontend/src/pages/stays/StaysPage.tsx:710-713` | **High** | `expireMutation.mutate(item.id)` langsung dieksekusi `onClick`, tanpa modal/`useConfirm()` — satu-satunya dari 4 aksi booking/checkout di halaman ini yang tidak lewat modal apapun. Aksi ini melepas reservasi tenant yang sudah lewat expiry; tak ada undo dari UI |
| 4 | `SimpleCrudPage.tsx` — `deleteMutation` | #2 Error state mutation | `frontend/src/pages/resources/SimpleCrudPage.tsx:211-217` | Medium | `deleteMutation` tak punya `onError` (beda dari `saveMutation` di atasnya yang punya `onError`→`setError`). Jika hapus gagal (mis. FK constraint di backend), tak ada `Alert`/toast error — hanya diam. Berkaitan dengan temuan #1 |
| 5 | `OwnerSettingsPage.tsx` — tombol "Hapus key" (API key DeepSeek) | #4 Konfirmasi destruktif | `frontend/src/pages/settings/OwnerSettingsPage.tsx:1099-1102` | Medium | `onClick={() => updateMutation.mutate({ deepseekApiKey: '' })}` langsung, tanpa `confirm()`. Inkonsisten dengan pola di file yang **sama persis** — 5 tombol hapus lain di file ini (`:80`, `:191`, `:495`, `:631`, dan hapus foto) semua sudah pakai `const ok = await confirm({...})`. Menghapus key mematikan semua fitur AI Owner/Admin tanpa peringatan |
| 6 | `OwnerSettingsPage.tsx` — antrean draft AI, tombol "Tandai Dipakai" / "Tolak" | #4 Konfirmasi destruktif | `frontend/src/pages/settings/OwnerSettingsPage.tsx:1250-1251` | Low | `reviewMutation.mutate(...)` langsung tanpa confirm. Risiko rendah — hanya mengubah status `AiDraft` (bukan data transaksi final), tapi tetap tak simetris dengan pola confirm di file yang sama |
| 7 | Cakupan halaman prioritas vs `config/navigation.ts` | #7 Reachability | `frontend/src/config/navigation.ts` (full) | — | **Tidak ada halaman yatim** di antara 16 halaman prioritas — semua route punya jalur masuk: baik langsung dari sidebar OWNER/ADMIN, atau via `activePaths`/internal quick-jump chip (`admin-area-internal-chip`) di halaman lain (mis. `PaymentReviewPage` dijangkau dari chip "Review Pembayaran" di `InvoicesPage.tsx:428`, bukan link sidebar langsung — desain yang disengaja, lihat komentar `navigation.ts:18-23`) |

---

## Analisis Temuan High

### #1 — `SimpleCrudPage` hapus data tanpa konfirmasi (High)

`SimpleCrudPage.tsx` adalah komponen CRUD generik yang dipakai lintas modul (`config/resources/*.ts`). Dari seluruh resource yang dikonfigurasi, **4 resource** punya `allowDelete: true` (diverifikasi via grep `config/resources/`): `additional-services` (`property.ts:308`), `invoice-payments` (`finance.ts:5`), `wifi-sales` (`finance.ts:66`), `expenses` (`finance.ts:116`). Rantai eksekusinya:

```
ResourceTable.tsx:400  onClick={() => onDelete(Number(item.id))}
    → SimpleCrudPage.tsx:397  handleDelete(id)
        → hanya cek izin role (canDeleteResourceItem — config/resources.ts:135-155)
        → SimpleCrudPage.tsx:405  deleteMutation.mutate(id)  ← LANGSUNG, tanpa dialog apapun
```

Tidak ada `useConfirm()` atau modal "Yakin hapus?" di jalur ini — padahal `useConfirm()` sudah jadi idiom baku di 10 file lain di codebase (termasuk 5 tombol hapus lain di `OwnerSettingsPage.tsx` sendiri). Satu klik tombol "Hapus" (outline-danger, langsung terlihat di tiap baris tabel) = data terhapus permanen, tanpa langkah kedua.

**Dampak konkret:** `expenses` (pengeluaran operasional yang sudah dijurnal) dan `invoice-payments` (pembayaran tagihan yang sudah tercatat) adalah data finansial "jalur uang" — keduanya dijangkau dari area "Keuangan" (`activePaths` di `navigation.ts:45`). Klik salah di baris yang salah bisa menghapus catatan pembayaran/pengeluaran nyata tanpa peringatan dan tanpa cara membatalkan dari UI. (Catatan: `rooms`, `users`, `tenants`, `inventory-items`, `room-items`, `inventory-movements`, `announcements` **tidak** punya `allowDelete: true` — tombol "Hapus" tidak muncul sama sekali untuk resource-resource itu, jadi risiko tidak meluas ke seluruh sistem CRUD generik, hanya ke 4 resource finansial/layanan tambahan di atas.)

**Saran perbaikan minim-effort:** bungkus `deleteMutation.mutate(id)` di `SimpleCrudPage.tsx:405` dengan `useConfirm()` (pola sudah ada, tinggal reuse), plus tambah `onError` di `deleteMutation` (temuan #4).

### #2 — `StaysPage.tsx`: aksi approve/reject/expire di level daftar tak pernah menampilkan error (High)

`StaysPage.tsx` adalah halaman yang eksplisit disebut monolit paling sering dipakai (check-in/checkout/booking). Empat mutation-nya (`expireMutation`, `rejectBookingMutation`, `approveCrMutation`, `rejectCrMutation` — baris 181-255) semuanya **tidak punya `onError`**, dan lebih penting: **tidak ada satupun `Alert` yang merender `.isError` dari keempatnya** di seluruh file (diverifikasi grep — hanya `query.isError` untuk fetch data yang ditangani, bukan mutation). Modal `ApproveCheckoutModal`/`RejectCheckoutModal`/`RejectBookingModal` yang dipasang di baris 916-945 juga tidak diberi prop error dari mutation.

Efek nyata: kalau approve/reject/expire gagal di server (validasi, race condition, dsb.), modal berhenti loading dan kembali idle **tanpa pesan apapun** — admin tak tahu aksinya gagal atau kenapa.

Ini kontras jelas dengan pola yang **sudah benar** di tempat lain dalam codebase yang sama:
- `StayDetailPage.tsx` (sibling halaman detail dari halaman yang sama) — approve/reject checkout request yang **identik** sudah benar: state `approveCheckoutError` (baris 84) di-render sebagai `Alert variant="danger"` (baris 391-395).
- `PaymentReviewPage.tsx` — pola gold-standard: `onError` → `setActionError` → diteruskan sebagai prop `errorMessage` ke modal (baris 198, 264-278, 456).
- `InvoicesPage.tsx`, `InvoiceDetailPage.tsx`, `RenewRequestsAdminPage.tsx`, `AssetRegisterPage.tsx` — semua konsisten pakai `mutation.isError` + `Alert variant="danger"` di lokasi mutation masing-masing.

`StaysPage.tsx` level-daftar adalah pengecualian, bukan representasi pola aplikasi secara umum — regresi lokal yang mudah diperbaiki dengan meniru pola `approveCheckoutError` dari `StayDetailPage.tsx`.

### #3 — "Jalankan Kedaluwarsa" tanpa konfirmasi (High)

Lihat tabel di atas. Karena berbagi root cause (halaman + kategori halaman yang sama, konsekuensi bisnis nyata — melepas antrian booking tenant), disebut terpisah dari #2 karena kategori pola beda (konfirmasi vs error-state), tapi keduanya sebaiknya diperbaiki dalam satu putaran kerja di file yang sama.

---

## Tugas 2 — Re-verifikasi Klaim "Selesai"

Sampel 7 klaim UI Admin/Owner dari `docs/archieve/M14_REDUNDANSI_UI_UX.md`, `docs/archieve/M16_AUDIT_360_FLOW_HUNI.md` (ringkasan aktif keduanya sudah dipadatkan ke `docs/archieve/`), dan `docs/M18_CELAH_PENINGKATAN.md` (masih aktif di `docs/`):

| Klaim | Sumber | Cek | Hasil |
|---|---|---|---|
| AM-05: "Pengumuman" ditambah ke sidebar admin | M14 | `config/navigation.ts:51` | ✅ Valid — entry `/announcements` ikon 📣 ada di `adminSections` |
| AM-02: `RoleWorkspaceTabs` dihapus dari pemakaian (duplikat tab dashboard) | M14 | grep `RoleWorkspaceTabs` lintas `frontend/src` | ✅ Valid — file komponennya masih ada (`components/workspace/RoleWorkspaceTabs.tsx`) tapi **nol pemanggil**, konsisten dengan klaim "dihapus dari AppLayout" |
| AM-11: tombol "Buka laporan" duplikat di Owner Dashboard dihapus | M14 | grep teks tombol lintas `frontend/src` | ✅ Valid — tidak ditemukan |
| AM-12: tombol "Lengkapi setup akuntansi" duplikat di FinancialRatiosPage dihapus | M14 | grep teks tombol lintas `frontend/src` | ✅ Valid — tidak ditemukan |
| P8-03: Chart kosong pakai empty-state guard (bukan crash width/height) | M17 | `components/charts/SmartChartPanel.tsx:71,100,111-112,128-129` | ✅ Valid — 4 titik render punya fallback "Belum ada data" |
| M18 P3-02: `FeatureErrorBoundary` membungkus `TicketsPage`, `OwnerSettingsPage`, `MyStayPage` | M18 (checklist `[x]`) | grep `FeatureErrorBoundary` | ✅ Valid — ketiganya terbungkus (`TicketsPage.tsx:555/1379`, `OwnerSettingsPage.tsx:1273/1312`, `MyStayPage.tsx:880/971`) |
| AM-01: URL WhatsApp diunifikasi ke `utils/whatsapp.ts` (13 instance → 1) | M14 | grep `wa.me` lintas `frontend/src` | ✅ Valid untuk cakupan yang dicek — `utils/whatsapp.ts` jadi satu-satunya builder; sisa hit `wa.me` mentah cuma di data konten statis (`data/officialKost48Content.ts`) dan file test, bukan halaman Admin/Owner |

**7/7 klaim sampel terverifikasi masih valid — tidak ditemukan regresi.**

---

## Ringkasan Angka

- **Halaman diperiksa:** 16 (Dashboard Admin/Owner, StaysPage+StayDetailPage+CheckInWizard, InvoicesPage+InvoiceDetailPage, PaymentReviewPage, TicketsPage+TicketsStaffMode, AccountingSetupPage, OwnerSettingsPage, ReportsPage, AssetRegisterPage, InventoryShellPage+StaffWarehousePage, RenewRequestsAdminPage, RoomsRouteEntry+StaffRoomsPage, AdminStaffPerformancePage, MeterReadingsPage), plus 1 komponen shared lintas-modul (`SimpleCrudPage`+`ResourceTable`).
- **Temuan:** 6 — **3 High**, **2 Medium**, **1 Low**. Ditambah 1 baris konfirmasi positif (reachability nav — tidak ada halaman yatim).
- **Halaman yang mayoritas sudah matang** (loading/error/empty/confirm/toast lengkap, tak ada temuan berarti): `InvoicesPage.tsx`, `InvoiceDetailPage.tsx`, `PaymentReviewPage.tsx` (pola gold-standard untuk error mutation), `RenewRequestsAdminPage.tsx`, `AssetRegisterPage.tsx`, `AccountingSetupPage.tsx`, `CheckInWizard.tsx`, `StayDetailPage.tsx`, `MeterReadingsPage.tsx`, `AdminStaffPerformancePage.tsx`, `ReportsPage.tsx`.
- **Re-verifikasi klaim lama:** 7/7 sampel masih valid, tidak ada regresi ditemukan.
- **Prioritas perbaikan disarankan:** (1) tambah `useConfirm()` pada `SimpleCrudPage.tsx:405` (dampak ke 4 resource sekaligus, effort kecil karena pola sudah ada di codebase); (2) samakan pola error-state `StaysPage.tsx` dengan `StayDetailPage.tsx` (copy pola `approveCheckoutError`) dan tambah `useConfirm()` pada tombol "Jalankan Kedaluwarsa"; (3) tambah `useConfirm()` pada tombol "Hapus key" di `OwnerSettingsPage.tsx:1100`.

Tidak ada kode yang diubah dalam audit ini — murni laporan. Ingat batasan metodologi di bagian atas: **audit ini tidak mengonfirmasi apapun secara visual/runtime** — langkah `npm run dev` + klik-manual tetap wajib sebelum go-live.
