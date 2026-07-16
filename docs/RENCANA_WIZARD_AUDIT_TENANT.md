# Rencana: Wizard Audit Kamar oleh Tenant + Google Sheets (AI Lemah)

Tujuan: Tenant bisa lapor kondisi kamar sendiri via link HP → data masuk Sheets → owner/staf tinggal verifikasi temuan.

## Arsitektur

```
┌────────────────────┐     POST JSON      ┌───────────────────┐
│  HTML Wizard        │ ──────────────────▶│  Google Apps Script │
│  (Vercel / 1 file)  │                    │  Web App URL       │
│  Tenant buka di HP  │                    │  doPost(e)         │
└────────────────────┘                    └─────────┬──────────┘
                                                    │ appendRow
                                         ┌──────────▼──────────┐
                                         │  Google Sheets       │
                                         │  (1 tab data mentah) │
                                         └─────────────────────┘
```

---

## Tugas 1: Google Sheets + Apps Script

### 1A. Buat Google Sheet

Buat Google Sheet baru dengan nama `Audit Kamar Tenant KOST48 - Data Mentah`.

**Header (Baris 1):**

```
Timestamp | Kamar | Nama Tenant | No HP | Dinding | Plafon | Lantai | PintuKunci | Jendela | Kasur | Lemari | SpreiBantal | LampuUtama | StopKontak | Saklar | AC | Kipas | Kloset | JetShowerKran | SaluranAir | ExhaustVentilasi | BauLembap | Hama | CatatanTambahan | FotoDiambil
```

Kolom 1 = auto timestamp dari Apps Script. Total 25 kolom.

### 1B. Buat Apps Script

1. Buka Google Sheet → Extensions → Apps Script
2. Hapus kode default, ganti dengan:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  const row = [
    new Date(),                          // Timestamp otomatis
    data.room || '',
    data.tenantName || '',
    data.phone || '',
    data.wall || '',
    data.ceiling || '',
    data.floor || '',
    data.door || '',
    data.window || '',
    data.mattress || '',
    data.wardrobe || '',
    data.bedding || '',
    data.mainLamp || '',
    data.socket || '',
    data.switch || '',
    data.ac || '',
    data.fan || '',
    data.toilet || '',
    data.jetShower || '',
    data.drain || '',
    data.exhaust || '',
    data.odor || '',
    data.pest || '',
    data.notes || '',
    data.photoTaken || ''
  ];

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Audit Kamar KOST48 endpoint siap.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Klik **Deploy** → New Deployment → Type: **Web App**
4. Execute as: **Me** | Who has access: **Anyone** (penting!)
5. Klik Deploy → Authorize → Copy URL deployment (bentuknya `https://script.google.com/macros/s/.../exec`)
6. Simpan URL ini — nanti dipakai di file HTML

> **CATATAN untuk AI:** Jangan deploy ulang (versi baru) setiap edit — pakai menu Deploy → Manage deployments → Edit (versi) → New version.

---

## Tugas 2: File HTML Wizard

### 2A. Spesifikasi

| Aspek | Ketentuan |
|---|---|
| Nama file | `audit-kamar-tenant.html` |
| Simpan di | `docs/filePrint/` |
| Bahasa | Indonesia |
| Tampilan | Mobile-first, HP 360-414px, satu pertanyaan per layar |
| Warna | Hijau teal (#0f766e) seperti brand KOST48 |
| Jumlah step | 10 layar (lihat 2B) |
| Data | POST JSON ke URL Apps Script |
| Foto | Tidak upload, hanya centang "Sudah/Tidak" |
| Platform | 1 file HTML polos, tanpa framework/npm, bisa drag-drop ke Vercel |

### 2B. Struktur Wizard (10 layar)

```
Step 0: HERO — "Cek Kondisi Kamarmu"
  - Logo KOST48 besar 🏠
  - Subtitle: Bantu kami rawat kosmu. Isi 3 menit.
  - Tombol "Mulai Cek Kamar"

Step 1: DATA DIRI
  - Pilih Kamar (dropdown: A/B/C/D/F1/F2/G/H/I/J/K/L/M)
  - Nama lengkap (text)
  - No HP/WA (text, optional)
  - Tombol "Lanjut"

Step 2: DINDING & PLAFON
  - Dinding — retak, rembes, cat mengelupas?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Plafon — noda bocor, berlubang, melendut?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Tombol "Lanjut"

Step 3: LANTAI, PINTU & JENDELA
  - Lantai — keramik pecah, nat rusak, licin?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Pintu & kunci — seret, rusak, tidak bisa dikunci?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Jendela — pecah, macet, tidak bisa ditutup?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Tombol "Lanjut"

Step 4: KASUR & FURNITURE
  - Kasur — sobek, kempis, per rusak?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Lemari — engsel/rel/pintu rusak?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Sprei, bantal, guling — lengkap dan layak?
    ○ OK / ⚠ Kurang/tidak layak / ❓ Tidak tahu
  - Tombol "Lanjut"

Step 5: LISTRIK
  - Lampu utama — mati, redup, atau rusak?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Stop kontak — longgar atau bekas gosong?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Saklar — rusak atau tidak berfungsi?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Tombol "Lanjut"

Step 6: AC / KIPAS
  - AC — kurang dingin, bocor, atau berisik?
    ○ OK / ⚠ Ada masalah / ❌ Tidak ada AC
  - Kipas angin — rusak atau berisik?
    ○ OK / ⚠ Ada masalah / ❌ Tidak ada kipas
  - Tombol "Lanjut"

Step 7: KAMAR MANDI
  - Kloset — mampet, flush rusak, atau tanki bocor?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Jet shower / kran — bocor atau rusak?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Saluran air — mampet atau bau?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Exhaust / ventilasi — rusak?
    ○ OK / ⚠ Ada masalah / ❌ Tidak ada
  - Tombol "Lanjut"

Step 8: KENYAMANAN & HAMA
  - Bau / kelembapan — apek, lembap, atau tidak nyaman?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Hama — rayap, tikus, kecoa, atau semut?
    ○ OK / ⚠ Ada masalah / ❓ Tidak tahu
  - Tombol "Lanjut"

Step 9: CATATAN & FOTO
  - Catatan tambahan (textarea, optional, max 300 karakter)
  - Foto kondisi kamar — sudah diambil?
    ○ Sudah, siap dikirim via WA / Belum
  - Tombol "Kirim Laporan ✉️"

Step 10: SUKSES
  - Animasi centang hijau ✓
  - "Laporan berhasil dikirim!"
  - "Admin akan mengecek laporanmu. Kalau ada masalah urgent, hubungi WA admin ya."
  - Tombol "Kirim Lagi" (kembali ke step 0)
```

### 2C. Opsi Jawaban per Pertanyaan

Standardisasi 3 opsi (render sebagai 3 tombol besar):

| Value | Label | Ikon | Warna |
|---|---|---|---|
| `OK` | OK / Baik | ✅ | Hijau |
| `MASALAH` | Ada Masalah | ⚠️ | Oranye |
| `TIDAK_TAHU` | Tidak Tahu | ❓ | Abu-abu |

Khusus AC & Kipas: tambah opsi ke-4 `TIDAK_ADA` (Tidak Ada).

### 2D. Data JSON yang Dikirim

```json
{
  "room": "A",
  "tenantName": "Maya Pratiwi",
  "phone": "081234567890",
  "wall": "OK",
  "ceiling": "MASALAH",
  "floor": "OK",
  "door": "OK",
  "window": "OK",
  "mattress": "OK",
  "wardrobe": "MASALAH",
  "bedding": "OK",
  "mainLamp": "OK",
  "socket": "OK",
  "switch": "OK",
  "ac": "MASALAH",
  "fan": "TIDAK_ADA",
  "toilet": "OK",
  "jetShower": "MASALAH",
  "drain": "OK",
  "exhaust": "OK",
  "odor": "OK",
  "pest": "MASALAH",
  "notes": "AC kurang dingin, mungkin freon habis. Ada kecoa di pojok lemari.",
  "photoTaken": "SUDAH"
}
```

### 2E. URL Apps Script

Variabel di JavaScript: `const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/PASTE_URL_DEPLOY_DISINI/exec';`

AI harus mengganti `PASTE_URL_DEPLOY_DISINI` dengan URL deployment asli dari langkah 1B.

### 2F. CSS Requirements

- `max-width: 480px` centered
- Background: `#eaf0f3` (sama seperti form audit utama)
- Card putih `border-radius: 16px`, `box-shadow`
- Tombol pilihan: 3-4 tombol vertikal, `border-radius: 12px`, `padding: 16px`, font besar
- Tombol OK: border hijau, background putih
- Tombol MASALAH: border oranye, background putih
- Tombol TIDAK_TAHU: border abu-abu, background putih
- State terpilih (`aria-pressed="true"`): background sesuai warna, teks putih
- Progress bar di atas (step X/9)
- Tombol "Lanjut" / "Kirim" di bawah, full-width
- Animasi transisi antar step (fade, 200ms)
- Responsif: font dan padding membesar di layar kecil

### 2G. Perilaku JavaScript

1. **Navigasi step:** array `steps` yang berisi ID div, tampilkan 1 step pada satu waktu (`display: block` / `none`)
2. **Validasi:** step 1 (data diri) — nama wajib diisi, kamar wajib dipilih. Step lain — minimal 1 opsi dipilih (semua `OK` juga boleh, artinya memang tidak ada masalah). Tidak memaksa semua harus dijawab.
3. **Progress bar:** update text "Langkah X dari 9" setiap pindah step
4. **Tombol back:** di kiri bawah setiap step (kecuali step 0 dan step 10)
5. **Submit:** loading state di tombol kirim, POST fetch ke Apps Script, tangkap response, tampilkan sukses/gagal
6. **Error handling:** kalau gagal kirim (timeout 10 detik), tampilkan pesan error + tombol "Coba Lagi"
7. **Tidak pakai localStorage** — form selalu fresh tiap buka. Tidak ada data tersimpan di HP tenant.
8. **Prevent double submit:** disable tombol setelah klik pertama

### 2H. A11y Basic
- Semua tombol interaktif pakai `<button>`, bukan div
- `aria-pressed` pada tombol pilihan
- `aria-live="polite"` pada pesan sukses/error
- Label pada input

---

## Tugas 3: Deploy ke Vercel

### 3A. Cara Deploy (drag-drop, paling simpel)

1. Buka [vercel.com](https://vercel.com) → login dengan GitHub/GitLab/Email
2. Buat project baru → pilih "Deploy manually" atau drag-drop folder
3. Karena ini file HTML statis tunggal, cukup upload `audit-kamar-tenant.html` → rename jadi `index.html`
4. Vercel akan kasih domain seperti `kost48-audit.vercel.app`
5. Kalau mau custom domain: Settings → Domains → tambah `audit.kost48surabaya.com`

### 3B. Alternatif: GitHub + Vercel (auto-deploy)

1. Push file ke repo GitHub
2. Di Vercel, import project dari repo
3. Setiap push otomatis deploy ulang

---

## Urutan Pengerjaan (AI Harus Ikuti)

1. **Buka Google Sheets** → buat sheet + Apps Script → dapatkan URL deployment
2. **Buat file HTML** → `docs/filePrint/audit-kamar-tenant.html` → paste URL Apps Script
3. **Test:** buka HTML di browser lokal → isi dummy → submit → cek data muncul di Sheets
4. **Deploy** ke Vercel
5. **Share link** ke grup WhatsApp tenant: "Halo Kak! Mohon bantu 3 menit cek kondisi kamar ya: [LINK]"
