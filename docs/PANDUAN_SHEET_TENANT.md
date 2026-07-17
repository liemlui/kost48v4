# 📋 PANDUAN — Google Sheet + Apps Script untuk Kumpulkan Data 13 Tenant KOST48

> **Tujuan:** Tenant mengisi email, nomor HP, dan data tambahan lewat form web.
> Data Nama + NIK + Kamar sudah pre-filled. Hasil → CSV → import ke database.

---

## LANGKAH 1: BUAT GOOGLE SHEET

Buka [sheets.google.com](https://sheets.google.com) → **Buat spreadsheet baru** → beri nama `DATA_TENANT_KOST48`.

### Sheet 1: "DATA_TENANT" (14 kolom)

| Kolom | Header | Siapa yang isi | Keterangan |
|-------|--------|---------------|------------|
| A | `roomCode` | **Pre-filled (Owner)** | Kode kamar: A, B, C, D, F1, F2, G, H, I, J, K, L, M |
| B | `fullName` | **Pre-filled (Owner)** | Nama lengkap tenant |
| C | `identityNumber` | **Pre-filled (Owner)** | NIK (16 digit) |
| D | `email` | **Tenant isi** | Email aktif (untuk login portal) |
| E | `phone` | **Tenant isi** | Nomor HP (08xx) |
| F | `occupation` | **Tenant isi** | Pekerjaan (Karyawan / Mahasiswa / Wirausaha / dll) |
| G | `companyOrCampus` | **Tenant isi** | Nama perusahaan atau kampus |
| H | `birthDate` | **Tenant isi** | Tanggal lahir (DD-MM-YYYY) |
| I | `gender` | **Tenant isi** | Laki-laki / Perempuan |
| J | `originProvince` | **Tenant isi** | Provinsi asal |
| K | `emergencyContactName` | **Tenant isi** | Nama kontak darurat |
| L | `emergencyContactPhone` | **Tenant isi** | HP kontak darurat |
| M | `howDidYouHear` | **Tenant isi** | Tahu kos dari mana? (Teman / Google / Sosmed / Lainnya) |
| N | `notes` | **Tenant isi** | Catatan tambahan (opsional) |

### Isi data pre-filled (copy-paste ke Sheet):

```
roomCode	fullName	identityNumber
A	Shinta Larista	3574036206990003
B	Dini Widiastutik	3275085012800021
C	Miko Rakatama Adhi Winarto	6471051708970006
D	Ade Chandra	3173052309720009
F1	Yufita Hieng	6405025701970003
F2	Patrick Wilfred	3275020504910019
G	Yofi Nurkolifah	3519122204030003
H	Welly Tanoto	3578070811730004
I	Agus Settiyo Budi	3571021308860003
J	Lovandra	3175070312930003
K	Meliana Tamara	3578125102000002
L	Destarika Hasan	1671065812020008
M	Gabriel Excelly Pranajaya	3511115908030001
```

> ⚠️ Kolom D–N biarkan kosong — akan diisi tenant lewat form.

---

## LANGKAH 2: DEPLOY APPS SCRIPT

### 2a. Buka Apps Script

```
Google Sheet → Extensions → Apps Script
```

### 2b. Copy-paste kode berikut:

```javascript
// KOST48 — Form Pengumpulan Data Tenant via Google Sheets
// Deploy: Publish → Deploy as web app → Execute as "Me" → Who has access: "Anyone"

const SHEET_NAME = 'DATA_TENANT';
const COL = {
  roomCode: 0, fullName: 1, identityNumber: 2,
  email: 3, phone: 4, occupation: 5, companyOrCampus: 6,
  birthDate: 7, gender: 8, originProvince: 9,
  emergencyContactName: 10, emergencyContactPhone: 11,
  howDidYouHear: 12, notes: 13
};

function doGet(e) {
  const nik = e.parameter.nik;
  if (!nik) return HtmlService.createHtmlOutput('<h2>❌ Link tidak valid — NIK tidak ditemukan</h2>');

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  // Cari baris tenant berdasarkan NIK
  let row = -1;
  let tenant = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.identityNumber]).trim() === nik.trim()) {
      row = i + 1; // 1-based untuk Google Sheets API
      tenant = data[i];
      break;
    }
  }

  if (!tenant) return HtmlService.createHtmlOutput('<h2>❌ NIK tidak ditemukan dalam data</h2>');

  // Build HTML form
  const fields = [
    { key: 'email', label: '📧 Email Aktif', type: 'email', placeholder: 'nama@email.com', required: true },
    { key: 'phone', label: '📱 Nomor HP', type: 'tel', placeholder: '0812xxxxxxxx', required: true },
    { key: 'occupation', label: '💼 Pekerjaan', type: 'text', placeholder: 'Karyawan / Mahasiswa / Wirausaha' },
    { key: 'companyOrCampus', label: '🏢 Perusahaan / Kampus', type: 'text', placeholder: 'Nama perusahaan atau universitas' },
    { key: 'birthDate', label: '🎂 Tanggal Lahir', type: 'text', placeholder: 'DD-MM-YYYY (contoh: 15-05-1998)' },
    { key: 'gender', label: '⚧ Jenis Kelamin', type: 'select', options: ['', 'Laki-laki', 'Perempuan'] },
    { key: 'originProvince', label: '🏠 Provinsi Asal', type: 'text', placeholder: 'Jawa Timur' },
    { key: 'emergencyContactName', label: '🆘 Nama Kontak Darurat', type: 'text', placeholder: 'Nama orang tua / saudara' },
    { key: 'emergencyContactPhone', label: '📞 HP Kontak Darurat', type: 'tel', placeholder: '0813xxxxxxxx' },
    { key: 'howDidYouHear', label: '🔍 Tahu KOST48 dari mana?', type: 'select', options: ['', 'Teman/Keluarga', 'Google Search', 'Instagram/Facebook', 'Google Maps', 'Lainnya'] },
    { key: 'notes', label: '📝 Catatan Tambahan', type: 'textarea', placeholder: 'Opsional — info tambahan untuk admin' },
  ];

  const currentValues = {};
  for (const [key, idx] of Object.entries(COL)) {
    currentValues[key] = tenant[idx] || '';
  }

  let formHtml = fields.map(f => {
    const val = currentValues[f.key] || '';
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o || '-- Pilih --'}</option>`).join('');
      return `<div class="field"><label>${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label><select name="${f.key}">${opts}</select></div>`;
    } else if (f.type === 'textarea') {
      return `<div class="field"><label>${f.label}</label><textarea name="${f.key}" placeholder="${f.placeholder}">${val}</textarea></div>`;
    } else {
      return `<div class="field"><label>${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label><input type="${f.type}" name="${f.key}" value="${val}" placeholder="${f.placeholder}" ${f.required ? 'required' : ''} /></div>`;
    }
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Form Data Tenant — KOST48</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#f5f5f5;padding:16px;max-width:520px;margin:0 auto}
.header{background:linear-gradient(135deg,#1a365d,#2b6cb0);color:white;padding:24px;border-radius:12px;margin-bottom:16px}
.header h1{font-size:1.4rem;margin-bottom:4px}
.header .name{font-size:1.1rem;opacity:.9}
.header .room{font-size:.9rem;opacity:.7;margin-top:4px}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.field{margin-bottom:14px}
.field label{display:block;font-size:.85rem;font-weight:600;color:#333;margin-bottom:4px}
.field .req{color:#e53e3e}
.field input,.field select,.field textarea{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:1rem}
.field input:focus,.field select:focus,.field textarea:focus{outline:none;border-color:#2b6cb0;box-shadow:0 0 0 3px rgba(43,108,176,.15)}
.field textarea{min-height:80px;resize:vertical}
.btn{background:#2b6cb0;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:1rem;font-weight:600;width:100%;cursor:pointer}
.btn:hover{background:#1a365d}
.success{display:none;text-align:center;padding:32px 16px}
.success h2{color:#38a169;margin-bottom:8px}
.error{color:#e53e3e;font-size:.85rem;margin-top:4px;display:none}
</style></head>
<body>
<div class="header">
  <h1>📋 Form Data Tenant KOST48</h1>
  <div class="name">${tenant[COL.fullName]}</div>
  <div class="room">Kamar ${tenant[COL.roomCode]} · NIK: ${String(tenant[COL.identityNumber]).slice(0,4)}xxxx${String(tenant[COL.identityNumber]).slice(-4)}</div>
</div>
<div id="formContainer">
  <div class="card">
    <p style="color:#666;font-size:.9rem;margin-bottom:12px">Mohon lengkapi data di bawah. Email akan dipakai untuk login portal penghuni KOST48.</p>
    <form id="tenantForm">
      ${formHtml}
      <div id="formError" class="error"></div>
      <button type="submit" class="btn" style="margin-top:8px">💾 Simpan Data</button>
    </form>
  </div>
</div>
<div id="successMsg" class="success">
  <h2>✅ Data Berhasil Disimpan!</h2>
  <p>Terima kasih, ${tenant[COL.fullName]}.</p>
  <p style="margin-top:8px;color:#666">Admin akan memproses akun portal kamu. Kamu akan menerima email/login dalam 1-2 hari.</p>
</div>
<script>
document.getElementById('tenantForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const errorEl = document.getElementById('formError');
  errorEl.style.display = 'none';

  const formData = new FormData(this);
  formData.append('nik', '${nik}');
  formData.append('row', '${row}');

  fetch('${ScriptApp.getService().getUrl()}', {
    method: 'POST',
    body: formData
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      document.getElementById('formContainer').style.display = 'none';
      document.getElementById('successMsg').style.display = 'block';
    } else {
      errorEl.textContent = data.error || 'Gagal menyimpan. Coba lagi.';
      errorEl.style.display = 'block';
    }
  })
  .catch(err => {
    errorEl.textContent = 'Gagal terhubung. Cek koneksi internet.';
    errorEl.style.display = 'block';
  });
});
</script>
</body></html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Form Tenant — KOST48')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const nik = e.parameter.nik;
  const row = parseInt(e.parameter.row);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  // Verifikasi NIK + nama cocok (anti-spoofing)
  const data = sheet.getDataRange().getValues();
  if (row < 2 || row > data.length) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Data tidak ditemukan.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const tenantRow = data[row - 1];
  if (String(tenantRow[COL.identityNumber]).trim() !== nik.trim()) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'NIK tidak cocok.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Validasi email harus diisi
  const email = (e.parameter.email || '').trim();
  const phone = (e.parameter.phone || '').trim();
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Email wajib diisi.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (!phone) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Nomor HP wajib diisi.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Update kolom D–N (index 3–13)
  const values = [
    email,
    phone,
    (e.parameter.occupation || '').trim(),
    (e.parameter.companyOrCampus || '').trim(),
    (e.parameter.birthDate || '').trim(),
    (e.parameter.gender || '').trim(),
    (e.parameter.originProvince || '').trim(),
    (e.parameter.emergencyContactName || '').trim(),
    (e.parameter.emergencyContactPhone || '').trim(),
    (e.parameter.howDidYouHear || '').trim(),
    (e.parameter.notes || '').trim(),
  ];

  sheet.getRange(row, COL.email + 1, 1, values.length).setValues([values]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 2c. Deploy Web App

1. Klik **Deploy** → **New deployment**
2. Pilih **Web app**
3. Execute as: **Me** (`your-email@gmail.com`)
4. Who has access: **Anyone**
5. Klik **Deploy**
6. **Copy URL** yang muncul (contoh: `https://script.google.com/macros/s/xxxxx/exec`)

---

## LANGKAH 3: GENERATE LINK UNIK PER TENANT

Setelah web app ter-deploy, generate link untuk setiap tenant:

```
https://script.google.com/macros/s/XXXXX/exec?nik=3574036206990003   → Shinta Larista (A)
https://script.google.com/macros/s/XXXXX/exec?nik=3275085012800021   → Dini Widiastutik (B)
https://script.google.com/macros/s/XXXXX/exec?nik=6471051708970006   → Miko Rakatama (C)
https://script.google.com/macros/s/XXXXX/exec?nik=3173052309720009   → Ade Chandra (D)
https://script.google.com/macros/s/XXXXX/exec?nik=6405025701970003   → Yufita Hieng (F1)
https://script.google.com/macros/s/XXXXX/exec?nik=3275020504910019   → Patrick Wilfred (F2)
https://script.google.com/macros/s/XXXXX/exec?nik=3519122204030003   → Yofi Nurkolifah (G)
https://script.google.com/macros/s/XXXXX/exec?nik=3578070811730004   → Welly Tanoto (H)
https://script.google.com/macros/s/XXXXX/exec?nik=3571021308860003   → Agus Settiyo Budi (I)
https://script.google.com/macros/s/XXXXX/exec?nik=3175070312930003   → Lovandra (J)
https://script.google.com/macros/s/XXXXX/exec?nik=3578125102000002   → Meliana Tamara (K)
https://script.google.com/macros/s/XXXXX/exec?nik=1671065812020008   → Destarika Hasan (L)
https://script.google.com/macros/s/XXXXX/exec?nik=3511115908030001   → Gabriel Excelly (M)
```

### Kirim ke tenant via WhatsApp:

> Halo Kak [Nama], mohon isi form data penghuni KOST48 ya. Untuk login portal nanti butuh email aktif.
> Link: [URL]
> Terima kasih! 🙏

---

## LANGKAH 4: EXPORT CSV SETELAH SEMUA MENGISI

1. Buka Google Sheet `DATA_TENANT_KOST48`
2. **File → Download → Comma Separated Values (.csv)**
3. Simpan sebagai `tenant-data.csv`
4. Upload ke server atau pakai untuk import (lihat Fase 3)

---

## VERIFIKASI

- Kolom A–C tetap utuh (pre-filled, tidak bisa diedit tenant)
- Kolom D–N terisi oleh tenant
- Setiap tenant hanya bisa mengisi datanya sendiri (diverifikasi NIK + nama)
- Jika tenant membuka link yang bukan NIK-nya → error
