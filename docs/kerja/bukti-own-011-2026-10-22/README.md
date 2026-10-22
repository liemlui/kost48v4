# Bukti render W-OWN-011 — etalase katalog (potret 22 Okt 2026)

> **Blok baca** · Jenis: **bukti bertanggal (render lokal)** · Status: **selesai** · Untuk siapa: owner + agen yang menilai W-OWN-011
> · Baca kalau: memeriksa bukti “foto rasio apa pun utuh, chip kategori, tautan kebutuhan” pada 390/768/1440 px. · **Jangan** dibaca kalau: mencari aturan kerja (itu [KONTRAK](../../KONTRAK.md)) atau antrean (itu [ANTREAN](../../ANTREAN.md)).

## 1. Yang dibuktikan

Halaman **beranda** dan **katalog** `/rooms` dirender di tiga lebar (390 · 768 · 1440 px) memakai **komponen + CSS produksi**, dengan **API tiruan** (data fiktif, tanpa PII). Yang diperiksa dari DOM setelah foto dimuat: rasio asli tiap foto, `object-fit` yang dipilih `FrameImage`, chip kategori, tautan kebutuhan, dan ada/tidak scroll horizontal.

## 2. Metode (dapat diulang)

1. Server API tiruan `node` di `localhost:3000` — menjawab `/api/public/rooms`, `/api/public/rooms/summary`, `/api/public/rooms/social-proof`, `/api/settings/public-config`, `/api/facility-images`, `/api/marketing-assets`; foto = SVG dengan rasio berbeda (`/uploads/room-images/*.svg`). Skrip ini **scratch**: ditulis di `tmp/` yang diabaikan git, tidak ikut commit.
2. `npx vite --port 5173` di `frontend/` (proxy `/api` → `localhost:3000`, konfigurasi repo apa adanya).
3. Playwright Chromium (dari `frontend/node_modules`) — `viewport` 390×844 / 768×1024 / 1440×900, `deviceScaleFactor` 1, `waitUntil: networkidle`, seluruh halaman di-scroll agar foto `loading="lazy"` benar-benar dimuat, lalu screenshot.
4. Data kamar fiktif: F1 potret 3:4 (`0.75`) · F2 panorama 21:9 (`2.33`) · F3 brosur A4 (`0.71`) · F4 persegi (`1.00`) · F5 tanpa foto (jatuh ke aset lokal) · F6 lanskap 4:3 (`1.33`). Kategori: 1 Ekonomi, 1 Standar, 2 Deluxe tersedia; 1 terisi, 1 perbaikan.

## 3. Hasil terukur

| Halaman | 390 px | 768 px | 1440 px |
|---|---|---|---|
| Foto potret `0.75` di kartu beranda | `object-fit: contain` | `contain` | `contain` |
| Foto panorama `2.33` di kartu beranda | `contain` | `contain` | `contain` |
| Foto lanskap `1.33` / persegi `1.00` | `cover` (perilaku lama) | `cover` | `cover` |
| Chip kategori katalog | `Ekonomi (1)` · `Standar (1)` · `Deluxe (2)` | sama | sama |
| Chip filter lain | `Tersedia` · `Rekomendasi` · `Termurah` · `Termahal` | sama | sama |
| Scroll horizontal | tidak ada | tidak ada | tidak ada |

Tautan kebutuhan di beranda (dibaca dari DOM, bukan dari ingatan):

- “Butuh kamar sejuk untuk kerja atau istirahat” → `/rooms?avail=bookable&cooling=ac`
- “Ingin kamar mandi dalam, tidak perlu berbagi” → `/rooms?avail=bookable&bathroom=inside`
- “Mau tarif paling ringan bulan ini” → `/rooms?avail=bookable&sort=price-asc`

## 4. Berkas

| Berkas | Isi |
|---|---|
| `beranda-390.png` · `beranda-768.png` · `beranda-1440.png` | beranda penuh (hero, “mulai dari kebutuhan”, strip jaminan) |
| `beranda-kartu-390.png` · `beranda-kartu-1440.png` | potongan kartu kamar F1 — foto potret 0.75 tampil **utuh** dengan latar blur |
| `katalog-390.png` · `katalog-768.png` · `katalog-1440.png` | `/rooms` default “Tersedia” + chip kategori ber-count + ringkasan hasil |

## 5. Batas kejujuran

- **Data tiruan, bukan DB produksi.** Yang dibuktikan adalah **tampilan** dengan bentuk data yang sama seperti respons `/api/public/rooms`; bukan foto asli KOST48 dan bukan angka produksi.
- **Foto katalog memakai aset lokal** (`public/room-images`) karena kartu katalog menaruh galeri lokal lebih dulu; foto kiriman admin (API) tampil di kartu beranda dan galeri detail — di sinilah perilaku `contain` diukur.
- **Tidak diuji:** panel upload rasio (butuh login OWNER; logikanya ditutup `imageFrame.test.ts`/`frameImage.test.tsx`), perangkat fisik, Safari/iOS, dan pengukuran Lighthouse/Axe pada batch ini.
