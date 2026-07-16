# 🎬 Prompt Iklan — Wizard Audit Kamar KOST48

> Folder screenshot: `docs/screenshots-audit/`
> Live URL: https://auditkamartenantkost48.vercel.app/

---

## 📐 Format Ikatan

| Platform | Rasio | Resolusi | Kegunaan |
|----------|-------|----------|----------|
| **Feed Instagram** | 1:1 (square) | 1080×1080 | Post carousel multi-slide |
| **Story / Reels** | 9:16 (vertical) | 1080×1920 | Story, Reels, TikTok, YouTube Shorts |
| **Mobil native** | ~1:2.16 | 390×844 | Tampilan realistis iPhone |

---

## 📸 Daftar Screenshot

### Step 0 — Hero 🏠
`step0-hero_{format}.png`
> Halaman pertama: logo KOST48, tagline "Cek Kondisi Kamarmu", tombol "Mulai Cek Kamar". Brand color teal (#0f766e).

### Step 1 — Data Diri 📋
`step1-data-diri_{format}.png`
> Form terisi: dropdown Kamar A, Nama "Maya Pratiwi", No HP. Progress bar "Langkah 1 dari 9".

### Step 2 — Dinding & Plafon 🧱
`step2-dinding-plafon_{format}.png`
> Opsi Dinding = ✅ OK (hijau terpilih), Plafon = ⚠️ Ada Masalah (oranye terpilih). Progress bar "Langkah 2 dari 9".

### Step 6 — AC & Kipas ❄️
`step6-ac-kipas_{format}.png`
> AC = ⚠️ Ada Masalah (oranye terpilih), Kipas = ❌ Tidak Ada (ungu terpilih). Progress bar "Langkah 6 dari 9".

### Step 9 — Catatan & Foto 📝
`step9-catatan-foto_{format}.png`
> Textarea terisi "AC kurang dingin, mungkin freon habis...". Opsi foto = 📸 Sudah. Tombol "Kirim Laporan ✉️".

### Step 10 — Sukses ✅
`step10-sukses_{format}.png`
> Animasi centang hijau, "Laporan berhasil dikirim!", link WA admin, tombol "Kirim Lagi".

---

## 🤖 Prompt untuk AI Video Generator

### Prompt 1: Reels / TikTok (15 detik)

> **Visual:**
> Buka aplikasi di HP — muncul layar "Cek Kondisi Kamarmu" dengan logo KOST48 dan background hijau teal.
> Transisi smooth ke form pilih kamar, otomatis terisi "Kamar A — Maya Pratiwi".
> Lanjut ke layar opsi — jari menekan tombol ✅ OK (hijau) dan ⚠️ Ada Masalah (oranye).
> Cepat melewati beberapa step, berhenti di layar "AC kurang dingin" → catatan diketik otomatis.
> Tombol "Kirim Laporan" ditekan → animasi loading → muncul centang hijau besar.
> **Teks:** "Cek kondisi kamarmu dalam 3 menit. Dari HP langsung ke pengelola."
> **CTA:** Download / Kunjungi link di bio.

### Prompt 2: Carousel Feed Instagram (5-7 slide)

> **Slide 1:** Hero screen. Teks overlay: "Baru pindah kos? Cek kondisi kamar dulu yuk ✨"
> **Slide 2:** Data diri terisi. Teks: "Pilih kamar + isi nama — 10 detik"
> **Slide 3:** Dinding & Plafon (ada yg bermasalah). Teks: "Tandai mana yg perlu diperbaiki"
> **Slide 4:** AC bermasalah. Teks: "AC kurang dingin? Langsung lapor!"
> **Slide 5:** Catatan & foto. Teks: "Tambahkan catatan + konfirmasi foto"
> **Slide 6:** Sukses! Teks: "Laporan masuk ke pengelola dalam hitungan detik ✅"
> **Slide 7:** CTA. "KOST48 — kost nyaman di Surabaya Barat. Cek link di bio 📲"

### Prompt 3: Story Instagram (full screen, vertical)

> **Frame 1 (0-3s):** Hero screen zoom in. Text: "3 MENIT AJA ✨"
> **Frame 2 (3-6s):** Opsi dinding terpilih ⚠️ Ada Masalah (oranye). Text: "Kamu puas sama kondisi kamarmu?"
> **Frame 3 (6-9s):** Catatan difokuskan, teks diketik otomatis. Text: "Laporkan langsung"
> **Frame 4 (9-12s):** Loading → centang hijau. Text: "Laporan terkirim ✅"
> **Frame 5 (12-15s):** CTA. "KOST48 — audit kamar mandiri. Tap link! 👆"

---

## 🎨 Warna Brand KOST48

| Elemen | Warna | Hex |
|--------|-------|-----|
| Primary | Teal | `#0f766e` |
| Background | Abu muda | `#eaf0f3` |
| OK / Sukses | Hijau | `#16a34a` |
| Masalah | Oranye | `#ea580c` |
| Tidak Tahu | Abu | `#64748b` |
| Tidak Ada | Ungu | `#7c3aed` |
| Teks utama | Slate gelap | `#1e293b` |

---

## 💬 Copy untuk Caption Instagram

### Opsi A — Friendly / Santai
> ✨ Baru pindah kos? Atau udah lama tapi belum pernah cek kondisi kamar secara detail?
> 
> Sekarang kamu bisa audit kamar sendiri lewat HP 📱
> 
> ✅ Cek dinding, AC, kamar mandi, listrik & 20+ titik lainnya
> ⚠️ Tandai yang perlu diperbaiki
> 📤 Hasil langsung ke pengelola
> 
> Cuma 3 menit. Gratis. Dari HP aja.
> 
> 👉 Link di bio
> 
> #kost48 #kostsurabaya #auditkamar #tipsanakkost #surabayabarat

### Opsi B — Professional / Trust
> 🏠 KOST48 Surabaya — Transparansi kondisi kamar untuk setiap tenant.
> 
> Dengan sistem audit kamar mandiri, tenant bisa:
> • Melaporkan kondisi kamar secara real-time
> • Menandai 20+ titik pemeriksaan
> • Mengirim data langsung ke pengelola
> 
> Karena kenyamanan kamu adalah prioritas kami.
> 
> 📍 Jl. Hikmah V No. 48, Surabaya Barat
> 
> #kosteksklusif #kostsurabaya #manajemenkost #propertymanagement

---

## 🛠 Cara Pakai Screenshot untuk AI Video

### Tools yang bisa dipakai:

| Tool | Kelebihan | Link |
|------|-----------|------|
| **Runway Gen-3** | Video quality tinggi, image-to-video | runwayml.com |
| **Pika Labs** | Gaya sinematik, kontrol gerak kamera | pika.art |
| **Kling AI** | Gerakan natural, karakter konsisten | kling.kwai.com |
| **CapCut** | Template reels instagram, teks overlay | capcut.com |
| **Canva** | Desain carousel feed instagram | canva.com |

### Workflow:

1. Upload screenshot ke AI video generator (Runway / Pika / Kling)
2. Prompt: *"Mobile app interface, zoom in on green checkmark, smooth transition, clean UI, Indonesian language"*
3. Export video → edit di CapCut → tambah teks overlay + musik
4. Upload ke Instagram Reels / TikTok / Story
