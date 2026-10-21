> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# PROMPT KUAT — audit & perbaikan bug terdalam fitur yang ada (pra-go-live)

> **Blok baca** · Jenis: **prompt kerja untuk agen** · Status: **aktif — 20 Okt 2026** · Untuk siapa: agen pelaksana berikutnya
> · Baca kalau: akan memperkuat fitur yang sudah ada dan memburu bug berdampak sebelum go-live. · **Jangan** dibaca kalau: mencari antrean tugas (itu [ANTREAN](../ANTREAN.md)) atau aturan bisnis (itu [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)).

## 0. Peran

Kamu adalah **auditor + perawat fitur** KOST48, bukan penambah fitur. Tugasmu: menemukan bug yang **mengubah arti uang, data, atau akses**, memperbaikinya dengan perubahan terkecil, dan membuktikan perbaikan itu bisa gagal bila bug-nya dikembalikan. Go-live bukan tujuan sesi ini; tujuannya adalah **fitur yang ada menjadi benar dan tahan uji** sebelum go-live.

## 1. Konteks yang wajib dipegang

- Repo: `final_bundle` (NestJS + Prisma + React/Vite). Produksi LIVE; LVE 512 MB; satu proses API `lsnode`.
- Data produksi potret 20 Okt 2026: 13 tenant, 11 stay aktif, 11 invoice lunas Rp14.600.000, 23 jurnal (debit = kredit Rp29.400.000), 38 akun COA, 0 ADMIN/STAFF, KTP 0/13, `Room.images` kosong tetapi 80 berkas foto ada di `/room-images`.
- Backup: dump 40 KB + cron harian + uji restore sudah terbukti (62 tabel). Gunakan itu sebagai jaring sebelum menyentuh apa pun.
- Dokumen status bisa salah ke dua arah. **Satu-satunya penentu adalah kode, DB, dan keluaran alat** — bukan ingatan, bukan prosa dokumen.

## 2. Aturan keras

1. **Read-only dulu.** Tanpa INSERT/UPDATE/DELETE produksi, deploy, restart, hapus log, atau paket baru — kecuali izin owner per sesi.
2. **Jangan mengarang angka, nilai aset, stok, foto, KTP, rekening, saldo, atau hasil uji.** Yang tidak diukur ditulis UNKNOWN.
3. **Gate uang**: perubahan yang menyentuh rumus/jurnal/skema/aturan uang wajib `npm run test:unit` backend; tampilan/label cukup verifikasi terkecil. Jangan mengubah atau menghapus hook.
4. **Smallest safe change**: satu bug = satu increment = satu commit terarah. Tanpa refactor sampingan, tanpa dependency baru, tanpa rewrite domain.
5. **Jangan menyentuh berkas/data milik sesi lain**; jaga perubahan lama, termasuk untracked.
6. **Rahasia & PII**: jangan cetak sandi, token, NIK, foto KTP, atau isi `.env`. Nilai sensitif yang telanjur tercetak wajib dilaporkan untuk rotasi, bukan diulang.
7. **Dokumen berbahasa Indonesia**; setelah menyunting dokumen jalankan `node scripts/check-docs.mjs`.
8. **Goal + todos wajib** sebelum bekerja; perbarui selama bekerja; tutup hanya bila definisi selesai terpenuhi.

## 3. Definisi "bug terdalam" (urutan prioritas)

| Peringkat | Ciri | Contoh di repo ini |
|---|---|---|
| P0 | Mengubah nominal, jurnal, atau kewajiban uang | deposit bisa di-override API; surcharge hanya dihitung di satu kanal; tarif listrik snapshot 0 |
| P0 | Data tersimpan tetapi artinya hilang | status stay tidak bisa menyatakan "menunggu checkout" atau "KTP menunggu verifikasi" |
| P1 | Dua kanal menghitung berbeda untuk hal yang sama | booking publik vs portal vs walk-in |
| P1 | Kegagalan senyap (tidak ada galat, hasil salah) | placeholder `formatRupiah` tampil sebagai teks; gambar 404 tanpa peringatan |
| P1 | Akses/PII salah | verifikasi KTP oleh role yang tidak berwenang; gate yang memblokir flow resmi |
| P2 | Laporan membaca basis yang salah | "Belum Tertagih" mencampur periode dengan tanggal bayar; saldo kas 0 |
| P3 | Konten bertentangan dengan aturan | FAQ "maksimal 4 orang" vs 4+2 LARGE |

**Bukan bug yang dicari:** selera visual, penamaan, kerapian, atau fitur yang belum ada.

## 4. Bukti awal (jangan dipercaya buta; verifikasi ulang)

**Sudah terverifikasi di sesi 20 Okt:**

- Gate KTP sempat `true` dan memblokir check-in; kini DB `false` (env masih `true`, DB prioritas).
- Placeholder `formatRupiah` tampil mentah di halaman publik detail kamar (`PublicRoomDetailPage` baris 324). Pola sama di `MeterTab` baris 11, `GlobalSearch` baris 102, `LoyaltyAdminPage` baris 217 — tiga terakhir baru dibaca dari kode, belum dilihat di layar.
- API publik mengirim URL gambar `/api/uploads/room-images/...` yang **404**; berkas asli ada di `/room-images` dan UI memetakannya. Artinya konsumen non-UI akan mendapat gambar rusak.
- `InvoiceLine` hanya berisi `RENT` (11 baris); 22 meter reading (11 listrik, 11 air) belum pernah menjadi tagihan. Semua `Stay.electricityTariffPerKwhRupiah` = 0; jalur invoice meter memakai fallback global 2.500, jalur saran invoice memakai snapshot 0 dan melewati baris listrik.
- `Faq` 0 baris; halaman `/panduan` memakai 12 FAQ statis; "maksimal 4 orang per kamar" bertentangan dengan 4+2 LARGE.
- Dua worker `lsnode` (176 MB + 139 MB), bukan overlap restart.

**Petunjuk dari dokumen (belum diverifikasi; jangan dikutip sebagai fakta):** F-01 override deposit lewat API, F-02 paritas surcharge/deposit hewan, F-11 check-in tidak memeriksa deposit lunas, F-12 DTO walk-in tanpa `occupantCount`/`hasPet`, S-03/S-09/S-10 status stay/KTP/checkout, laporan September "Belum Tertagih", halaman akun kas saldo 0. Sumber: [TASK-SINKRON-ATURAN](TASK-SINKRON-ATURAN.md), [TASK-HUNI-FOLLOWUP](TASK-HUNI-FOLLOWUP.md).

## 5. Urutan kerja yang dianjurkan

1. **P0 uang** — karakterisasi perilaku tiga kanal booking (publik, portal, walk-in) untuk kamar + term + penghuni + hewan yang sama; bandingkan deposit, surcharge, DP, total. Perbaiki hanya setelah ada tabel angka sebelum/sesudah.
2. **P0 tagihan listrik/air** — buktikan jalur mana yang dipakai UI: saran invoice (snapshot stay) atau invoice meter (fallback global). Perbaiki sumber tarif agar satu, lalu uji satu siklus meter.
3. **P1 status & flow** — KTP 4 keadaan, checkout in progress, overstay; pastikan satu definisi dipakai API dan UI.
4. **P1 kegagalan senyap** — placeholder, URL gambar API, laporan yang menampilkan 0 tanpa galat.
5. **P3 konten** — FAQ yang bertentangan; jangan ubah aturan, ubah teks atau tandai sadar.

## 6. Metode per bug (wajib, enam langkah)

1. **Reproduksi** dengan bukti: perintah, URL, kueri, atau log. Tanpa reproduksi, bug belum ada.
2. **Akar masalah**: tunjuk berkas + baris dan jelaskan mengapa perilaku itu muncul.
3. **Dampak lima sisi**: uang · data · akses/PII · UX · operasi. Sebut yang terukur, bukan dugaan.
4. **Perbaikan minimal**: satu tujuan; tanpa memperluas scope.
5. **Pagar regresi yang bisa gagal**: tulis uji yang **gagal sebelum** perbaikan dan **lulus sesudah**; buktikan dengan mutasi (kembalikan bug, lihat uji gagal karena assertion, bukan crash).
6. **Angka sebelum/sesudah** untuk jalur uang; bila tidak ada angkanya, jangan klaim.

## 7. Gate & verifikasi

- Uang: `npm run test:unit` (backend, dari akar `backend`) — wajib untuk rumus/jurnal/skema.
- UI: test terkait + `npm run build` bila menyentuh halaman; sebut exit code.
- Dokumen: `node scripts/check-docs.mjs`; R5 pada `docs/ANTREAN.md` sudah merah sebelum sesi — jangan menambah pelanggaran baru.
- Jangan merantai gate + commit dalam satu perintah. Jangan `git add -A`.
- Laporkan **apa yang dibuktikan** dan **apa yang tidak dijalankan**.

## 8. Berhenti dan tanya owner hanya untuk

Uang/nominal/jurnal · flow atau perilaku pengguna baru · hapus data · deploy/secret · keputusan sulit dibalik. Format: konteks · pilihan a/b/c · risiko · rekomendasi · default. Selain itu, putuskan sendiri dan catat satu baris alasan.

## 9. Format laporan

```text
BUG: <id> — <judul> — Severity: P0/P1/P2 — Bukti: <perintah/angka>
AKAR: <berkas:baris> — <sebab>
DAMPAK: uang <...> · data <...> · akses <...> · UX <...> · ops <...>
UBAH: <berkas + satu baris>
ANGKA: <sebelum> → <sesudah>
PAGAR: <uji> — gagal sebelum (alasan assertion) / lulus sesudah
VERIFIKASI: <command, cwd, exit code> ; TIDAK dijalankan: <...>
BLOKIR: tidak ada | <sebab + penanggung jawab>
```

## 10. Definisi selesai sesi

- Minimal 3 bug P0/P1 punya bukti reproduksi, akar, perbaikan, pagar yang terbukti bisa gagal, dan angka sebelum/sesudah.
- Tidak ada perubahan yang memperluas scope atau menambah dependency.
- Semua gate yang relevan dijalankan; yang tidak dijalankan disebut alasannya.
- Register bug (tabel) diperbarui; sisa bug punya severity + pemilik + langkah berikut.

## 11. Tiga langkah pertama (mulai di sini)

1. Baca `KEPUTUSAN-OWNER` bagian GO-LIVE-DATA/TARIF/PARITAS + `domain/harga.md` §2/§7/§8, lalu tulis tabel karakterisasi tiga kanal booking (angka sebelum).
2. Telusuri jalur tagihan listrik dari UI sampai `InvoiceLine`; tentukan sumber tarif yang benar dan buktikan dengan satu siklus meter di DB uji.
3. Perbaiki placeholder `formatRupiah` di empat lokasi, dengan uji yang gagal bila placeholder dikembalikan.
