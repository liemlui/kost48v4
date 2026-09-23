Baca [AGENTS.md](AGENTS.md) sebagai sumber aturan kanonik agent.
Untuk antrean dan gate tugas, ikuti [STATUS](docs/STATUS.md).

Penataan menyeluruh yang diminta 22 Sep 2026 mengikuti [rancangan DOC-GOV-20260922](docs/plans/DOC-GOV-20260922.md); **Tahap 1 disetujui owner 22 Sep dan sudah diterapkan** (indeks dokumentasi dibuat, workflow diselaraskan), tahap 2–4 belum dijalankan. Roadmap di bawah adalah usulan historis 20 Sep; status pelaksanaannya dibaca dari M12/AI_MASTER, bukan dari nomor minggu.

Alur task, syarat masuk/keluar (DoR/DoD), dan pemulihan mengikuti status [AGENTS §7](AGENTS.md#7-tahapan-kerja) dan izin [AGENTS §4](AGENTS.md#4-scopeizin); navigasi dokumen per kebutuhan ada di [docs/README.md](docs/README.md).

## 11. Roadmap Migrasi Workflow (30 hari)

Roadmap adalah usulan urutan, **bukan izin implementasi**; prioritas EF/onboarding tetap mengikuti M12.

| Periode | Pekerjaan | Deliverable / checkpoint |
|---|---|---|
| Minggu 1, hari 1–7 | Kontrak prompt; klasifikasi 5 task; catat biaya/command; tinjau prasyarat test satu modul | Baseline 5 task; XS tanpa test/build; exception uang AGENTS §8 tetap |
| Minggu 2, hari 8–14 | Ringkas 3 modul sering disentuh dari bukti existing; petakan test dan prasyarat | 3 ringkasan dengan owner/freshness; contoh test FE/BE hanya setelah izin |
| Minggu 3, hari 15–21 | Setelah approval tooling, wrapper tanpa dependency baru; test/audit dahulu | Tolak ID/test kosong dan artefak basi; build hanya target tersedia; tanpa fallback full suite |
| Minggu 4, hari 22–30 | Terapkan pada 5–10 task tambahan; bandingkan task selevel; perbaiki batas baca/handoff | Laporan hari 30: median biaya, full validation, regresi, dan keputusan kebijakan |

Metrik: level, acceptance, file/baris terbaca, token aktual bila tersedia atau proksi konteks, command, durasi, retry, hasil, dan regresi.
Target awal: 100% XS tanpa test/build; 0 PASS untuk test kosong/artefak basi; 3 ringkasan dipakai ulang; median proksi konteks XS/S turun 30%.
Target bukan hasil terukur; kalibrasi setelah baseline. Jika regresi meningkat, perkuat subset relevan tanpa menurunkan gate keamanan/keuangan.

## 12. Lampiran: Template Siap Pakai

Isi placeholder dengan bukti; data yang belum tersedia ditulis UNKNOWN — belum diperiksa. Aturan tetap merujuk AGENTS/M12.

### 12.1 Template audit modul

```text
Modul/ID audit: [...]; status: [belum diperiksa/sebagian/bukti tersedia/kedaluwarsa]; tanggal: [...].
Tujuan, invariant, dan batas scope: [...].
File/simbol dan tanggung jawab: [...]; producer → kontrak → consumer: [...].
Dependensi masuk/keluar dan dampak perubahan: [...].
Owner bisnis/teknis: [nama/peran atau belum ditetapkan].
Sumber audit/peta/domain: [...]; identitas bukti: [commit + cakupan dirty tree / hash file relevan].
Acceptance/risiko → file test nyata → cwd + command → tanggal, exit, jumlah test: [...].
Prasyarat/hook, source atau dist, kesegaran artefak, kebutuhan/target build: [...].
Risiko/level, pemicu eskalasi, temuan terbuka/gap, pemicu invalidasi bukti: [...].
Delta: implementasi lokal [...]; verifikasi [...]; deployment [...]; dampak runtime [...].
```

### 12.2 Template prompt task harian

```text
Task dan acceptance: [satu tujuan; input/kondisi → hasil].
Scope edit: [implementasi/test/docs]; di luar scope: [...].
Level: [XS/S/M/L/XL]; batas baca: [5/8/12/18/20] file/tahap; anggaran: [...].
Audit relevan: [tautan/belum tersedia]; maksimal satu listing terarah.
Dilarang: [full test/build, install, refactor di luar scope, commit/push/deploy].
Verifikasi diizinkan: [cwd + command persis / inspeksi saja]; exception uang: AGENTS §8.
Persetujuan: [rencana dahulu / scope sudah diizinkan]; konflik gate/prasyarat: laporkan sebelum command tambahan.
Asumsi nonkritis: [...]; dokumentasi penutup: [audit + M12/M13 / pengecualian eksplisit].
Output: diff terbatas + 3 baris perubahan/verifikasi/risiko; pisahkan status deployment/runtime.
```

### 12.3 Template laporan perubahan

```text
Perubahan: [hasil, path, level]; acceptance [terpenuhi/parsial].
Verifikasi: [cwd + command, exit, jumlah test / inspeksi / tidak dijalankan + alasan].
Risiko/batasan: [...]; deployment [status]; runtime [belum diukur/bukti].
```

### 12.4 Template handoff sesi

```text
Tujuan/level dan izin yang sudah ada: [...].
Larangan dan batas scope: [...].
File berubah serta perubahan lama yang harus dijaga: [...].
Audit/peta relevan: [...]; invariant/kontrak: [...].
Keputusan dan asumsi: [...].
Bukti terakhir + tanggal + identitas source/config: [...].
Command belum selesai/gagal dan gap verifikasi: [...].
Temuan di luar scope serta langkah berikutnya: [...].
Jangan ulang: [audit/test yang masih sah].
```
