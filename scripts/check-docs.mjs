#!/usr/bin/env node
// FILE: scripts/check-docs.mjs — gate dokumen KOST48
// Kontrak aturannya: docs/rencana/RENCANA-ROMPAK-DOCS.md §3 · keputusan owner: docs/rencana/PERTANYAAN-ROMPAK.md. Jalankan dari akar repo:
//   node scripts/check-docs.mjs
//
// Kode keluar: 0 = bersih · 1 = ada pelanggaran · 2 = ada pemeriksaan yang DILEWATI
// (2 tidak pernah berarti lulus; pemeriksaan yang mati harus terlihat, bukan senyap).
//
// Aturan:
//   R1  angka volatil tanpa penanda potret pada DOKUMEN KONTRAK
//   R2  tautan relatif mati di dokumen aktif
//   R3  kotak `[ ]` otoritatif di docs/ANTREAN.md + `## Checklist` dokumen tugas bertanda (D5)
//   R4  blok baca wajib (jenis/status/untuk siapa/baca kalau) pada berkas tangga wajib
//   R5  plafon byte: AGENTS.md <=12 KB · berkas wajib <=16 KB · rujukan <=48 KB · berkas kerja batch (docs/rencana) <=16 KB
//   R6  rujukan `docs/...` di dalam backtick yang tidak ada di disk (catatan bertanggal dikecualikan)
//   R7  indeks cakupan audit (pengganti checklist audit yang diarsipkan)
//   R8  anchor `#bagian` mati; anchor "rapuh" (hidup hanya bila spasi digabung) dilaporkan sebagai INFO
//   R9  nomor bagian `## N.` dipakai lebih dari sekali dalam satu berkas hidup (catatan bertanggal dikecualikan)
//   R10 lebih dari satu judul H1 dalam satu berkas hidup (gejala dua dokumen digabung jadi satu)
//   R11 salinan berkas tangga wajib di luar rumah kanoniknya (zona "jangan dibaca" dikecualikan)
//   R12 ikatan ANTREAN ↔ checklist dokumen tugas: pointer `checklist:` harus hidup, checklist aktif dirujuk
//   R13 emoji tier-0/1 (wajib 0) + mojibake tanpa penanda "mojibake"/[kutipan-disengaja]
//   R14 prefix ID bernomor di tier-0/1 harus terdaftar di id-registry §2 (aktif) atau §4 (alias beku)
//   R15 rute di docs/product/peran.md harus ada di frontend/src/App.tsx; path `frontend/...` di
//       peran.md/FITUR harus ada di disk
//   R16 plafon byte per tier (T0 konstitusi · T1 aturan/registry · T2 rujukan topik · T3 kerja/catatan ·
//       T9 lain) bersifat RATCHET: cap di `scripts/docs-tier.baseline.json`, hanya boleh turun
//       (`--perbarui-tier --alasan="..."`). R16 menutup celah "tiap batch menambah sedikit".
//
// Kalibrasi v1.1 (2026-10-05), dua koreksi dari hasil jalan pertama — keduanya agar gate
// tidak menuduh yang benar:
//   1. Versi aplikasi kanonik = `frontend/src/config/version.ts` (APP_VERSION), BUKAN package.json
//      (root/frontend/backend semuanya 1.0.0 dan bukan versi produk).
//   2. `docs/audit/**` dan `docs/history/**` adalah KARTU BUKTI bertanggal — angka di sana memang
//      temuannya, jadi hanya dihitung sebagai info, bukan pelanggaran. Yang diperiksa R1 adalah
//      dokumen kontrak: root *.md, docs/*.md, domain/, operations/, product/, rencana/.
//
// Kalibrasi v1.2 (2026-10-05, keputusan D2/D3):
//   3. R4 tidak berlaku untuk AGENTS.md — ia DISUNTIK tiap request, jadi "baca kalau" selalu benar dan
//      blok 4 baris kehilangan makna. Gantinya AGENTS.md wajib punya SATU baris peran di 12 baris pertama.
//      R4 (blok baca) berlaku untuk berkas yang benar-benar DIPILIH pembaca: KONTRAK, ANTREAN, PETA-KODE.
//   4. R5 menghormati pengecualian daftar isi (D3): berkas rujukan di atas 48 KB TIDAK melanggar bila punya
//      daftar isi berjangkar (>=3 tautan `](#`) di 80 baris pertama. Plafon tidak dinaikkan.
//
// Kalibrasi v1.3 (2026-10-05, keputusan P28/P26):
//   5. Plan rombak pindah ke docs/rencana/. Berkas di docs/rencana/** BUKAN tangga wajib (P26: jalur wajib =
//      AGENTS + KONTRAK + ANTREAN + PETA-KODE + maks 2 topik), jadi ia hanya dikenai plafon ukuran 16 KB.
//
// Kalibrasi v1.4 (2026-10-05): rentang kode inline (`...`) dinetralkan sebelum R2 mencocokkan tautan.
// Sebab nyata: dokumen yang MENJELASKAN aturan R2 menulis contoh `[teks](target)` di dalam backtick,
// dan gate menuduhnya sebagai tautan mati. Kurung milik tautan asli ada DI LUAR rentang kode, jadi
// tautan sungguhan tetap terperiksa.
//
// Kalibrasi v1.7 (2026-10-07, batch A-1) — R8 dipasang, dengan dua tingkat:
//   6. R8 sengaja TIDAK memblokir setiap ketidakcocokan anchor. Slug GitHub dan slugifier lama
//      (`scripts/tambah-toc.mjs`) berbeda pada judul yang memuat simbol berspasi (—, /, &):
//      GitHub menghasilkan `--`, slugifier lama menghasilkan `-`. Karena itu:
//        · PELANGGARAN   = anchor mati di KEDUA konvensi (pasti rusak bagi pembaca)
//        · INFO "rapuh"  = hidup hanya di konvensi lama (mati di GitHub) — terlihat, tidak memblokir
//      Sebab: pengukuran pertama batch ini memakai tiruan slug yang salah dan melaporkan 29 anchor
//      mati, padahal yang pasti rusak 15 + 7 rapuh. Gate tidak boleh menuduh yang benar (v1.1/v1.4).
//   7. Akar kerapuhan: `scripts/tambah-toc.mjs` memakai slugifier lama. Skrip itu diperbaiki pada
//      batch yang sama supaya R8 tidak terus memanen temuan baru dari daftar isi yang baru dibuat.
//
// Kalibrasi v1.8 (2026-10-07, batch SPLIT+R9):
//   8. R9 memeriksa nomor bagian `## N.` yang dipakai dua kali dalam SATU berkas hidup. Cakupan
//      sengaja mengecualikan catatan bertanggal (docs/audit, docs/history, docs/arsip, docs/rencana):
//      berkas di sana hasil penggabungan dan DIBEKUKAN (KONTRAK §7), jadi menomori ulang isinya
//      justru merusak bukti. Yang diperiksa adalah berkas yang masih dipakai sebagai aturan/rujukan.
//   9. R8 menerima anchor HTML eksplisit (`<a id="...">`), karena GitHub menghormatinya. Tanpa ini
//      R8 bisa menuduh mati tautan yang sebenarnya hidup (ditemukan dari `docs/operations/produksi.md`).
//      R9 tetap hanya `## N.` — nomor pada `###` belum diperiksa (kandidat aturan berikutnya).
//
// Kalibrasi v1.9 (2026-10-07, batch RAPI):
//  10. R10 menandai berkas hidup dengan lebih dari satu judul H1 — gejala dua dokumen digabung jadi
//      satu. Cakupan mengecualikan catatan bertanggal, sama seperti R9. Menurunkan `# X` menjadi `## X`
//      TIDAK memutus anchor: slug hanya bergantung pada teks judul, bukan levelnya.
//  11. Indeks folder kini boleh disegarkan (`buat-indeks-folder.mjs --segarkan`) dan tidak lagi
//      mendaftarkan dirinya sendiri — sebelumnya 22 baris ukuran basi dan 3 di antaranya mustahil benar.
//
// Kalibrasi v2.0 (2026-10-07, batch RAPI) — R11:
//  12. R11 menjaga prinsip "aturan yang menang tidak boleh jadi yang paling basi": tidak boleh ada
//      salinan AGENTS/KONTRAK/ANTREAN/PETA-KODE di luar rumah kanoniknya. Zona yang SUDAH dinyatakan
//      "jangan dibaca" (`.design-audit`, `.docs-legacy`, `.audit-map`) dikecualikan — di sanalah
//      salinan basi memang wajar ada; yang dicegah adalah salinan baru di tempat yang ikut dibaca.
//      Pemicu nyatanya: `.design-audit/docs-snapshot-2026-10-05/docs/PETA-KODE.md`.
//
// Catatan kalibrasi 2026-10-07 (batch SISA-DOCS) — BUKAN aturan baru, jadi VERSI_GATE tetap v2.0 (11 aturan R1–R11):
//  13. T-05 ditutup sebagai CATATAN, bukan pelanggaran. Aturan KONTRAK §7 "pekerjaan terbuka tidak boleh ikut
//      terarsip" sebelumnya tidak punya detektor sama sekali (docs/arsip/** dikecualikan penuh dari gate).
//      Sekarang jumlah kotak `[ ]` di docs/arsip/** tercetak setiap kali gate dijalankan. Ia SENGAJA tidak
//      memblokir: 244 kotak tersebar di 9 berkas arsip yang DIBEKUKAN (KONTRAK §7) dan ikut dijaga ledger
//      konservasi SHA-256, sehingga pelanggaran ini tidak bisa ditutup tanpa menyunting arsip beku —
//      pelanggaran yang tidak bisa ditutup = gate yang selalu merah. Exit code tidak berubah karenanya.
//  14. Kalimat kepala "berkas diperiksa" dibuat bisa direkonsiliasi sendiri (T-09): ia kini memisahkan
//      berkas aktif di docs/ dan berkas di akar repo, karena 66/69 aktif tidak bisa dihitung dari
//      "117 .md di docs/ − 56 arsip" tanpa menebak dari mana 5 sisanya datang.
//  15. TEMUAN SAMPINGAN — **diputuskan owner 2026-10-07**: 47 dari 55 berkas arsip tidak memuat kata
//      "beku/arsip" di 6 baris pertama. Keputusannya **opsi (b)**: aturan banner dibatasi pada berkas yang
//      diarsipkan SEJAK DOCS-CLEANUP-1, sedangkan arsip legacy hasil pindah massal bersandar pada inventaris
//      (arsip/README.md) + ledger konservasi. KONSEKUENSINYA: gate TIDAK boleh menuntut banner dari 47 berkas
//      itu — menambahkannya retroaktif berarti menyunting arsip beku. Kalau kelak ada aturan banner, ia harus
//      membawa daftar pengecualian legacy, bukan menghitung semua isi docs/arsip/**.
//
//  16. Kalibrasi 2026-10-09 (batch SERAH-SESI) — CATATAN NOMOR BARIS, BUKAN aturan ke-12. Kebijakan
//      "rujukan lokasi = kutipan, bukan nomor baris" (KONTRAK §7, batch A-1) sebelumnya tidak punya
//      detektor sama sekali; kini jumlah rujukan `berkas:NNN` pada dokumen KONTRAK dicetak setiap gate
//      jalan (terukur pertama: 85 rujukan di 9 berkas, terbanyak docs/domain/flow.md = 25). Ia tidak
//      memblokir karena konversinya menyentuh dokumen aturan bisnis 30 KB dan butuh verifikasi kode per
//      baris — pekerjaan Isi, bukan pekerjaan sistem. VERBATIM: VERSI_GATE tetap v2.0 (11 aturan R1–R11).
//
// Kalibrasi v3.0 (2026-10-22, batch D8 DOCS-GEN2) — R13–R16:
//  17. R13/R14 sengaja dibatasi ke TIER-0/1 (5 berkas konstitusi + `docs/*.md` akar). Dokumen domain
//      dan catatan bertanggal memuat ID historis dan kutipan apa adanya; menuntutnya di sana akan
//      membuat gate merah permanen — pelajaran T-05 (pelanggaran yang tak bisa ditutup = gate palsu).
//  18. R14 hanya memeriksa token ID BERNOMOR (berakhir angka, mis. `AO-03`, `W-OWN-001`). Nama berkas
//      (`TASK-…`), nama kartu (`KARTU-…`), dan token teknis (`SHA-256`) masuk daftar NOISE — bukan ID.
//      Prefix sah = yang tertulis di tabel id-registry §2 atau §4; menambah keluarga ID baru berarti
//      menambah satu baris registry, bukan melonggarkan gate.
//  19. R15 memakai daftar rute dari `frontend/src/App.tsx` sebagai sumber kebenaran. Pola berwildcard
//      (`/finance/*`, `/portal/*`) dilewati: itu ringkasan, bukan rute literal.
//  20. R16 menyimpan cap di `scripts/docs-tier.baseline.json` (data, bukan dokumen). Cap diukur dari
//      keadaan nyata, bukan angka karangan; `--perbarui-tier` hanya boleh MENURUNKAN cap dan menolak
//      bila total sekarang sudah melewati cap lama. Baseline yang hilang = pelanggaran, bukan lulus.

// artefak generated (docs/audit-map/**), rotasi changelog, dan isi berkas di luar glob.
// R8 memakai EMULASI slug GitHub, bukan github-slugger: project ini dilarang menambah dependency
// (AGENTS §2), jadi judul dengan tanda baca yang sangat tidak lazim bisa masih berbeda dari renderer
// asli. Karena itu R8 dua tingkat, bukan satu tingkat yang memblokir.

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const VERSI_GATE = "v3.0";
// Akar repo bisa diarahkan lewat argumen pertama: `node scripts/check-docs.mjs <akar>`.
// Dipakai oleh SELF-TEST (scripts/check-docs.selftest.mjs), yang membangun pohon sintetis lalu
// membuktikan gate INI benar-benar GAGAL saat seharusnya gagal — pagar yang tidak pernah terbukti
// bisa gagal tidak layak dipercaya (di repo rujukan, tiga kali sebuah pemeriksaan tampak hijau
// padahal tidak memeriksa apa pun). Tanpa argumen, akar = folder induk skrip ini.
const ROOT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const DOCS = join(ROOT, "docs");

const ARSIP_RE = /[\\/]docs[\\/](arsip|archieve|audit-map)[\\/]/;
const RUJUKAN_RE = /[\\/]docs[\\/](domain|operations|product|audit)[\\/]/;
const KARTU_BUKTI_RE = /[\\/]docs[\\/](audit|history)[\\/]/;

// Berkas tangga wajib (untuk plafon byte R5).
const BERKAS_WAJIB = [
  "AGENTS.md",
  "docs/KONTRAK.md",
  "docs/ANTREAN.md",
  "docs/PETA-KODE.md",
];
// Berkas kerja batch (rencana + kartu keputusan) — bukan tangga wajib, tetap dibatasi ukurannya.
const RENCANA_RE = /[\\/]docs[\\/]rencana[\\/]/;
// Blok baca hanya untuk berkas yang DIPILIH pembaca (D2) — AGENTS.md dikecualikan, ia disuntik.
const BLOK_BACA_WAJIB = ["docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"];
const POLA_PERAN_AGENTS = /kontrak kerja[^\n]{0,120}disuntik|disuntik otomatis/i;
const BARIS_PERAN_CONTOH = "> Kontrak kerja agen — disuntik otomatis setiap request. Aturan lengkap: docs/KONTRAK.md.";
const ANTREAN = "docs/ANTREAN.md";
// Kotak: rumah otoritatif + berkas bertanda + reklasifikasi catatan (keputusan Q12/Q13/P16/P17, batch B4).
const PENANDA_NON_OTORITATIF = /<!--\s*kotak-non-otoritatif\s*-->/i;
const RUMAH_KOTAK = [ANTREAN, "docs/STATUS.md"];                        // STATUS sampai B5 melebur ke ANTREAN
const KARTU_BUKTI_KOTAK = /[\\/]docs[\\/](history|audit|arsip)[\\/]/;   // catatan bertanggal, bukan antrean
const PENANDA_CHECKLIST = /<!--\s*checklist-otoritatif\s*-->/i;         // D5: checklist di dokumen tugas
const CHECKLIST_TUGAS = /^docs\/kerja\/(TASK-[^/]+|TASK-AKTIF)\.md$/;   // D5: rumah checklist yang sah
const INDEKS_CAKUPAN = "docs/audit/index-cakupan.md";                   // pengganti checklist audit (Q13)
const CATATAN_R6 = /[\\/]docs[\\/](rencana|history|arsip)[\\/]/;         // R6: catatan bertanggal dikecualikan
const PLAFON_AGENTS = 12 * 1024;
const PLAFON_WAJIB = 16 * 1024;
const PLAFON_RUJUKAN = 48 * 1024;

const rel = (f) => relative(ROOT, f).split(sep).join("/");
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const semuaMd = walk(DOCS);
const berkasAktif = semuaMd.filter((f) => !ARSIP_RE.test(f));
const berkasRoot = readdirSync(ROOT)
  .filter((n) => n.endsWith(".md"))
  .map((n) => join(ROOT, n));
const diperiksa = [...berkasAktif, ...berkasRoot];

const pelanggaran = [];
const info = [];
const dilewati = [];
const catat = (rule, file, line, pesan) => pelanggaran.push({ rule, file: rel(file), line, pesan });
const catatInfo = (rule, file, line, pesan) => info.push({ rule, file: rel(file), line, pesan });
const skip = (rule, pesan) => dilewati.push({ rule, pesan });

// ── sumber versi kanonik ───────────────────────────────────────────────────
const versiDiterima = new Set();
const sumberVersi = join(ROOT, "frontend/src/config/version.ts");
if (existsSync(sumberVersi)) {
  const m = readFileSync(sumberVersi, "utf8").match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (m) versiDiterima.add(m[1]);
  else skip("R1", "frontend/src/config/version.ts tidak memuat APP_VERSION; klaim versi dilewati");
} else {
  skip("R1", "frontend/src/config/version.ts tidak ada; klaim versi dilewati");
}
for (const p of ["package.json", "frontend/package.json", "backend/package.json"]) {
  const f = join(ROOT, p);
  if (!existsSync(f)) continue;
  try { versiDiterima.add(JSON.parse(readFileSync(f, "utf8")).version); }
  catch { skip("R1", `${p} gagal di-parse; versinya tidak ikut diterima`); }
}

// ── R1 — angka volatil ─────────────────────────────────────────────────────
const PENANDA_POTRET = new RegExp(
  [
    "potret", "dibekukan", "saat itu", "baseline", "riwayat", "rilis", "dirilis", "sejak", "dulu",
    "terukur", "tercatat", "sebelumnya", "sudah tidak berlaku", "nilai lama", "dilaporkan",
    "per \\d{4}-\\d{2}-\\d{2}",
    "\\d{1,2} (?:jan|feb|mar|apr|mei|jun|jul|agu|ags|sep|okt|nov|des)\\w* \\d{4}",
    "\\d{4}-\\d{2}-\\d{2}",
  ].join("|"),
  "i",
);
const POLA_TEST = /\b\d{2,4}\s*(?:\/|dari)\s*\d{2,4}\s*(?:berkas\s*)?(?:test|tes)\b|\b\d{2,4}\s*(?:test|tes)\s*(?:lulus|passed|hijau)\b|\b(?:test|tes)\s*[:=]?\s*\d{2,4}\s*(?:lulus)?\b/i;
const KLAIM_KEADAAN = /\b(versi aplikasi|aplikasi berjalan|versi sekarang|status aplikasi|app version)\b/i;
const POLA_VERSI = /\bv?(\d+\.\d+\.\d+)\b/g;

for (const file of diperiksa) {
  const kartuBukti = KARTU_BUKTI_RE.test(file);
  const teks = readFileSync(file, "utf8");
  let dalamFence = false;
  teks.split(/\r?\n/).forEach((baris, i) => {
    if (/^\s*```/.test(baris)) { dalamFence = !dalamFence; return; }
    if (dalamFence) return;
    if (PENANDA_POTRET.test(baris)) return;
    const em = kartuBukti ? catatInfo : catat;
    if (POLA_TEST.test(baris)) em("R1", file, i + 1, "menulis jumlah test mutakhir tanpa penanda potret/riwayat");
    if (KLAIM_KEADAAN.test(baris)) {
      for (const m of baris.matchAll(new RegExp(POLA_VERSI.source, "g"))) {
        if (!versiDiterima.has(m[1])) {
          em("R1", file, i + 1, `mengklaim keadaan aplikasi ${m[1]}; versi kanonik = ${[...versiDiterima].join(", ")}`);
        }
      }
    }
  });
}

// ── R2 — tautan relatif mati ───────────────────────────────────────────────
const POLA_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
// Netralkan rentang kode inline agar contoh di dalam backtick tidak dianggap tautan hidup (v1.4).
const tanpaKodeInline = (s) => s.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
for (const file of diperiksa) {
  const teks = readFileSync(file, "utf8");
  const dir = dirname(file);
  let dalamFence = false;
  teks.split(/\r?\n/).forEach((baris, i) => {
    if (/^\s*```/.test(baris)) { dalamFence = !dalamFence; return; }
    if (dalamFence) return;
    for (const m of tanpaKodeInline(baris).matchAll(POLA_LINK)) {
      const target = m[1];
      if (/^(https?:|mailto:|tel:|#|data:)/i.test(target)) continue;
      const bersih = decodeURIComponent(target.split("#")[0].split("?")[0]);
      if (!bersih) continue;
      if (!existsSync(resolve(dir, bersih))) catat("R2", file, i + 1, `tautan mati: ${target}`);
    }
  });
}

// ── R3 — kotak otoritatif ──────────────────────────────────────────────────
if (!existsSync(join(ROOT, ANTREAN))) {
  skip("R3", `${ANTREAN} belum ada; kotak otoritatif belum punya rumah (kondisi baseline, bukan lulus)`);
}
const kotak = [];
const kotakInfo = [];
for (const file of diperiksa) {
  const relFile = rel(file);
  const n = (readFileSync(file, "utf8").match(/^\s*[-*]\s*\[ \]/gm) || []).length;
  if (n === 0) continue;
  if (CHECKLIST_TUGAS.test(relFile)) {
    const isi = readFileSync(file, "utf8");
    if (PENANDA_CHECKLIST.test(isi) && /^## Checklist\b/m.test(isi)) {
      kotakInfo.push({ file: relFile, n, sebab: "checklist tugas bertanda (D5)" });
      continue;
    }
  }
  if (RUMAH_KOTAK.includes(relFile)) { kotakInfo.push({ file: relFile, n, sebab: "rumah otoritatif" }); continue; }
  if (KARTU_BUKTI_KOTAK.test(file)) { kotakInfo.push({ file: relFile, n, sebab: "catatan bertanggal (audit/history/arsip)" }); continue; }
  const kepala = readFileSync(file, "utf8").split(/\r?\n/).slice(0, 40).join("\n");
  if (PENANDA_NON_OTORITATIF.test(kepala)) { kotakInfo.push({ file: relFile, n, sebab: "bertanda non-otoritatif" }); continue; }
  kotak.push({ file: relFile, n });
  catat("R3", file, 0, `${n} kotak terbuka di luar rumah otoritatif — turunkan derajatnya jadi daftar biasa atau beri penanda <!-- kotak-non-otoritatif -->`);
}
kotak.sort((a, b) => b.n - a.n);
kotakInfo.sort((a, b) => b.n - a.n);

// ── R4 — blok baca (berkas yang dipilih pembaca) + baris peran AGENTS ──────
for (const wajib of BLOK_BACA_WAJIB) {
  const f = join(ROOT, wajib);
  if (!existsSync(f)) { catat("R4", f, 0, "berkas tangga wajib belum ada"); continue; }
  const kepala = readFileSync(f, "utf8").split(/\r?\n/).slice(0, 12).join("\n");
  if (!/blok baca|baca kalau|baca bila|untuk siapa/i.test(kepala)) {
    catat("R4", f, 1, "12 baris pertama tanpa blok baca (jenis · status · untuk siapa · baca kalau)");
  }
}
{
  const f = join(ROOT, "AGENTS.md");
  if (!existsSync(f)) {
    catat("R4", f, 0, "AGENTS.md belum ada");
  } else {
    const kepala = readFileSync(f, "utf8").split(/\r?\n/).slice(0, 12).join("\n");
    if (!POLA_PERAN_AGENTS.test(kepala)) {
      catat("R4", f, 1, `tanpa baris peran di 12 baris pertama. Contoh: ${BARIS_PERAN_CONTOH}`);
    }
  }
}

// ── R5 — plafon byte ───────────────────────────────────────────────────────
for (const wajib of BERKAS_WAJIB) {
  const f = join(ROOT, wajib);
  if (!existsSync(f)) continue;
  const size = statSync(f).size;
  const plafon = wajib === "AGENTS.md" ? PLAFON_AGENTS : PLAFON_WAJIB;
  if (size > plafon) catat("R5", f, 0, `${kb(size)} (${size} B) > plafon ${kb(plafon)} (${plafon} B)`);
}
// Pengecualian daftar isi berjangkar (D3): di atas plafon tetap sah bila TOC-nya ada.
const punyaTocBerjangkar = (file) => {
  const kepala = readFileSync(file, "utf8").split(/\r?\n/).slice(0, 80).join("\n");
  return (kepala.match(/\]\(#/g) || []).length >= 3;
};
for (const file of berkasAktif) {
  if (BERKAS_WAJIB.includes(rel(file))) continue;
  if (!RENCANA_RE.test(file)) continue;
  const size = statSync(file).size;
  if (size > PLAFON_WAJIB) {
    catat("R5", file, 0, `${kb(size)} (${size} B) > plafon berkas kerja batch ${kb(PLAFON_WAJIB)} — jadikan kartu arsip atau pecah`);
  }
}
for (const file of berkasAktif) {
  if (BERKAS_WAJIB.includes(rel(file))) continue;
  if (!RUJUKAN_RE.test(file)) continue;
  const size = statSync(file).size;
  if (size <= PLAFON_RUJUKAN) continue;
  if (punyaTocBerjangkar(file)) {
    catatInfo("R5", file, 0, `${kb(size)} di atas plafon rujukan, tetapi punya daftar isi berjangkar — sah menurut D3`);
  } else {
    catat("R5", file, 0, `${kb(size)} (${size} B) > plafon rujukan ${kb(PLAFON_RUJUKAN)} dan TANPA daftar isi berjangkar di 80 baris pertama`);
  }
}

// ── R7 — indeks cakupan audit wajib ada & bebas kotak otoritatif (Q13/P17) ─
{
  const fIndeks = join(ROOT, INDEKS_CAKUPAN);
  if (!existsSync(fIndeks)) {
    catat("R7", fIndeks, 0, `${INDEKS_CAKUPAN} belum ada — berkas ini pengganti checklist audit yang diarsipkan (Q13)`);
  } else {
    const n = (readFileSync(fIndeks, "utf8").match(/^\s*[-*]\s*\[ \]/gm) || []).length;
    if (n > 0) catat("R7", fIndeks, 0, `${n} kotak otoritatif di berkas indeks — turunkan jadi daftar biasa`);
  }
}

// ── R6 — rujukan backtick `docs/...` yang tidak ada di disk (dipasang setelah B8, P32) ──
{
  const EXT_R6 = /\.(md|mjs|cjs|js|ts|tsx|json|ps1|sql|prisma|yml|yaml|toml|env|txt|sh)$/i;
  let nRujukan = 0;
  for (const file of diperiksa) {
    if (CATATAN_R6.test(file)) continue;                       // catatan bertanggal boleh menyebut path yang sudah dihapus
    readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/`(docs\/[A-Za-z0-9_./\-]+)`/g)) {
        const p = m[1].replace(/[.,;:]+$/, "");
        if (/[*{<…]/.test(p)) continue;                        // glob/placeholder
        const folder = p.endsWith("/");
        if (!EXT_R6.test(p) && !folder) continue;              // bukan rujukan berkas/folder
        nRujukan++;
        const abs = join(ROOT, ...p.replace(/\/$/, "").split("/"));
        const ada = existsSync(abs) && (folder ? statSync(abs).isDirectory() : statSync(abs).isFile());
        if (!ada) catat("R6", file, i + 1, `rujukan backtick tidak ada di disk: ${p}`);
      }
    });
  }
  if (nRujukan === 0) catat("R6", ROOT, 0, "tidak ada rujukan backtick yang diperiksa — periksa apakah pola R6 masih cocok dengan isi dokumen");
}

// ── R8 — anchor `#bagian` mati & anchor rapuh (dipasang 2026-10-07, batch A-1) ──
{
  // Judul dibaca sebagai TEKS TER-RENDER: backtick, sintaks tautan, dan penanda tebal dilepas.
  const renderJudul = (t) =>
    t.replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__/g, "");
  // Konvensi GitHub (github-slugger): buang tanda baca; SETIAP spasi jadi satu tanda hubung
  // ("a — b" -> "a---b"). '_' dipertahankan, tidak ada penyatuan rentetan spasi.
  const slugGH = (t) =>
    renderJudul(t).trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}\-_ ]/gu, "").replace(/ /g, "-");
  // Konvensi slugifier lama (scripts/tambah-toc.mjs): buang tanda baca, lalu gabungkan rentetan spasi.
  const slugLama = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

  const setSlug = new Map();
  const slugs = (file) => {
    if (setSlug.has(file)) return setSlug.get(file);
    if (!existsSync(file)) { setSlug.set(file, null); return null; }
    const gh = new Set();
    const lama = new Set();
    const terlihat = new Map();
    let dalamFence = false;
    for (const baris of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (/^\s*(```|~~~)/.test(baris)) { dalamFence = !dalamFence; continue; }
      if (dalamFence) continue;
      // Anchor HTML eksplisit juga sah di GitHub — hitung supaya R8 tidak menuduh yang benar.
      for (const ma of baris.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/gi)) gh.add(ma[1].toLowerCase());
      const m = baris.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      if (!m) continue;
      let s = slugGH(m[1]);
      const n = terlihat.get(s) || 0;               // judul kembar: GitHub memberi akhiran -1, -2
      terlihat.set(s, n + 1);
      if (n > 0) s = `${s}-${n}`;
      gh.add(s);
      lama.add(slugLama(renderJudul(m[1])));
    }
    setSlug.set(file, { gh, lama });
    return setSlug.get(file);
  };

  let nAnchor = 0;
  for (const file of diperiksa) {
    const dir = dirname(file);
    readFileSync(file, "utf8").split(/\r?\n/).forEach((baris, i) => {
      for (const m of tanpaKodeInline(baris).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const target = m[1];
        if (/^(?:https?:|mailto:)/i.test(target)) continue;
        const potong = target.indexOf("#");
        if (potong < 0) continue;
        const berkasTujuan = target.slice(0, potong);
        let anchor = target.slice(potong + 1);
        if (!anchor) continue;
        try { anchor = decodeURIComponent(anchor); } catch { /* pakai apa adanya */ }
        const abs = berkasTujuan ? resolve(dir, berkasTujuan) : file;
        const s = slugs(abs);
        if (s === null) continue;                   // berkas tujuan tidak ada -> itu urusan R2
        nAnchor++;
        const a = anchor.toLowerCase();
        if (s.gh.has(a)) continue;
        if (s.lama.has(a)) {
          catatInfo("R8", file, i + 1, `anchor rapuh #${anchor} — hidup hanya bila spasi digabung, mati di GitHub (${rel(abs)})`);
          continue;
        }
        catat("R8", file, i + 1, `anchor tidak ada di ${rel(abs)}: #${anchor}`);
      }
    });
  }
  if (nAnchor === 0) catat("R8", ROOT, 0, "tidak ada anchor yang diperiksa — periksa apakah pola R8 masih cocok dengan isi dokumen");
}

// ── R9 — nomor bagian `## N.` ganda dalam satu berkas hidup (dipasang 2026-10-07, batch SPLIT) ──
{
  let nNomor = 0;
  for (const file of diperiksa) {
    if (KARTU_BUKTI_RE.test(file) || CATATAN_R6.test(file)) continue;   // catatan bertanggal dibekukan
    const terlihatNomor = new Map();
    let dalamFence = false;
    readFileSync(file, "utf8").split(/\r?\n/).forEach((baris, i) => {
      if (/^\s*(```|~~~)/.test(baris)) { dalamFence = !dalamFence; return; }
      if (dalamFence) return;
      const m = baris.match(/^##\s+(\d+)\./);
      if (!m) return;
      nNomor++;
      const n = terlihatNomor.get(m[1]) || 0;
      terlihatNomor.set(m[1], n + 1);
      if (n > 0) catat("R9", file, i + 1, `nomor bagian §${m[1]}. dipakai lebih dari sekali di berkas ini`);
    });
  }
  if (nNomor === 0) catat("R9", ROOT, 0, "tidak ada nomor bagian yang diperiksa — periksa apakah pola R9 masih cocok dengan isi dokumen");
}

// ── R10 — lebih dari satu judul H1 dalam satu berkas hidup (dipasang 2026-10-07) ──
{
  let nH1 = 0;
  for (const file of diperiksa) {
    if (KARTU_BUKTI_RE.test(file) || CATATAN_R6.test(file)) continue;   // catatan bertanggal dibekukan
    const posisi = [];
    let dalamFence = false;
    readFileSync(file, "utf8").split(/\r?\n/).forEach((baris, i) => {
      if (/^\s*(```|~~~)/.test(baris)) { dalamFence = !dalamFence; return; }
      if (dalamFence) return;
      if (/^#\s+\S/.test(baris)) posisi.push(i + 1);
    });
    nH1 += posisi.length;
    posisi.slice(1).forEach((barisKe) =>
      catat("R10", file, barisKe, 'judul H1 tambahan di berkas hidup — turunkan jadi "## " (slug tidak berubah) atau pisahkan berkasnya'),
    );
  }
  if (nH1 === 0) catat("R10", ROOT, 0, "tidak ada judul H1 yang diperiksa — periksa apakah pola R10 masih cocok");
}

// ── R11 — salinan berkas tangga di luar rumah kanonik (dipasang 2026-10-07) ──
{
  const kanonik = new Map(BERKAS_WAJIB.map((p) => [p.split("/").pop(), p]));   // basename → jalur kanonik
  // Zona yang sudah dinyatakan "jangan dibaca" (AGENTS §6): salinan basi di sana wajar ada.
  const ZONA_JANGAN_DIBACA = /^\.(design-audit|docs-legacy|audit-map)\//;
  const SELALU_LEWAT = new Set([".git", "node_modules"]);
  const salinan = [];
  (function telusur(dir) {
    let entri;
    try { entri = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entri) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { if (!SELALU_LEWAT.has(e.name)) telusur(full); continue; }
      const kanon = kanonik.get(e.name);
      if (!kanon) continue;
      const r = rel(full);
      if (r === kanon || ZONA_JANGAN_DIBACA.test(r)) continue;
      salinan.push({ r, kanon });
    }
  })(ROOT);
  salinan.sort((a, b) => a.r.localeCompare(b.r)).forEach((s) =>
    catat("R11", join(ROOT, s.r), 0, `salinan berkas tangga di luar rumah kanoniknya (${s.kanon}) — pindahkan/hapus, atau nyatakan zonanya sebagai jangan-dibaca bila memang arsip`),
  );
  if (kanonik.size === 0) catat("R11", ROOT, 0, "daftar berkas tangga kosong — periksa apakah pola R11 masih cocok");
}

// ── R12 — ikatan antrean ↔ checklist dokumen tugas (D5) ────────────────────
{
  const pointers = [];
  const antPath = join(ROOT, ANTREAN);
  if (!existsSync(antPath)) {
    catat("R12", antPath, 0, "ANTREAN belum ada — ikatan checklist tidak bisa diperiksa");
  } else {
    readFileSync(antPath, "utf8").split(/\r?\n/).forEach((line, i) => {
      const hits = line.match(/checklist:\s*[^\s|)]+/g) || [];
      for (const hit of hits) {
        const raw = hit.replace(/^checklist:\s*/, "");
        const [p, anchor] = raw.split("#");
        const abs = p.startsWith("docs/")
          ? join(ROOT, ...p.split("/"))
          : join(ROOT, "docs", ...p.split("/"));
        if (!existsSync(abs)) {
          catat("R12", antPath, i + 1, `checklist menunjuk berkas tidak ada: ${p}`);
          continue;
        }
        if (anchor && !new RegExp(`id=["']${anchor}["']`).test(readFileSync(abs, "utf8"))) {
          catat("R12", antPath, i + 1, `anchor checklist tidak ada: ${raw}`);
        }
        pointers.push(abs);
      }
    });
  }
  const taskDocs = berkasAktif.filter((f) => {
    if (!CHECKLIST_TUGAS.test(rel(f))) return false;
    const isi = readFileSync(f, "utf8");
    return PENANDA_CHECKLIST.test(isi) && /^## Checklist\b/m.test(isi);
  });
  for (const f of taskDocs) {
    if (!pointers.includes(f)) catat("R12", f, 0, "checklist aktif tidak dirujuk satu baris ANTREAN");
  }
}

// ── TIER & R13–R16 (gate v3, batch D8 DOCS-GEN2) ───────────────────────────
// Tier dipakai dua aturan: R13/R14 (encoding + registry di tier-0/1) dan R16 (plafon byte ratchet).
const TIER0_FILES = [
  "AGENTS.md",
  "docs/KONTRAK.md",
  "docs/ANTREAN.md",
  "docs/PETA-KODE.md",
  "docs/KEPUTUSAN-OWNER.md",
];
const TIERS = [
  { id: "T0", label: "konstitusi", cocok: (r) => TIER0_FILES.includes(r) },
  { id: "T1", label: "aturan & registry", cocok: (r) => /^docs\/[^/]+\.md$/.test(r) },
  { id: "T2", label: "rujukan topik", cocok: (r) => /^docs\/(domain|operations|product)\//.test(r) },
  { id: "T3", label: "kerja & rencana", cocok: (r) => /^docs\/(kerja|rencana)\//.test(r) },
  { id: "T4", label: "catatan bertanggal", cocok: (r) => /^docs\/(audit|history)\//.test(r), tanpaCap: true },
  { id: "T9", label: "lain", cocok: () => true },
];
const hitungTier = () => {
  const t = Object.fromEntries(TIERS.map((x) => [x.id, { berkas: 0, byte: 0 }]));
  for (const f of diperiksa) {
    const tier = TIERS.find((x) => x.cocok(rel(f)));
    t[tier.id].berkas++;
    t[tier.id].byte += statSync(f).size;
  }
  return t;
};
const TIER_BASELINE = join(ROOT, "scripts", "docs-tier.baseline.json");
const argAlasan = (process.argv.find((a) => a.startsWith("--alasan=")) || "").split("=").slice(1).join("=");
if (process.argv.includes("--perbarui-tier")) {
  const sekarang = hitungTier();
  let lama = { tier: {} };
  if (existsSync(TIER_BASELINE)) {
    try { lama = JSON.parse(readFileSync(TIER_BASELINE, "utf8")); }
    catch { console.error(`${rel(TIER_BASELINE)} tidak bisa di-parse; perbaiki dulu`); process.exit(1); }
  }
  if (!argAlasan) { console.error('--perbarui-tier butuh --alasan="..." (kenapa cap berubah)'); process.exit(2); }
  const baru = { tanggal: new Date().toISOString().slice(0, 10), alasan: argAlasan, tier: {} };
  for (const { id, label, tanpaCap } of TIERS) {
    if (tanpaCap) { baru.tier[id] = { berkas: sekarang[id].berkas }; continue; }
    const capLama = lama.tier?.[id]?.cap;
    const n = sekarang[id].byte;
    if (capLama !== undefined && n > capLama) {
      console.error(`${id} (${label}): ${n} B > cap lama ${capLama} B — cap hanya boleh turun; pindahkan isi dulu`);
      process.exit(1);
    }
    baru.tier[id] = { cap: capLama === undefined ? n : Math.min(capLama, n), berkas: sekarang[id].berkas };
  }
  mkdirSync(dirname(TIER_BASELINE), { recursive: true });
  writeFileSync(TIER_BASELINE, JSON.stringify(baru, null, 2) + "\n", "utf8");
  console.log(`baseline tier ditulis: ${rel(TIER_BASELINE)} — alasan: ${argAlasan}`);
  for (const { id, label, tanpaCap } of TIERS) console.log(`  ${id} ${label.padEnd(18)} ${baru.tier[id].berkas} berkas · ${tanpaCap ? "tanpa cap (catatan bertanggal)" : `cap ${baru.tier[id].cap} B`}`);
  process.exit(0);
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
const MOJIBAKE = [/â€/g, /Ã[\u0080-\u00BF]/g, /Â[\u0080-\u00BF]/g, /ï¿½/g, /\uFFFD/g, /â”/g];
const PENANDA_KUTIPAN = /mojibake|\[kutipan-disengaja\]/i;
const tier01 = [...new Set([
  ...TIER0_FILES.map((p) => join(ROOT, ...p.split("/"))),
  ...readdirSync(DOCS).filter((n) => n.endsWith(".md")).map((n) => join(DOCS, n)),
])].filter(existsSync);

// ── R13 — emoji & mojibake di tier-0/1 (dipasang 2026-10-22, batch D8) ─────
{
  let nBaris = 0;
  for (const f of tier01) {
    let dalamFence = false;
    readFileSync(f, "utf8").split(/\r?\n/).forEach((baris, i) => {
      if (/^\s*(```|~~~)/.test(baris)) { dalamFence = !dalamFence; return; }
      if (dalamFence) return;
      nBaris++;
      const nEmoji = (baris.match(EMOJI) || []).length;
      if (nEmoji > 0) catat("R13", f, i + 1, `${nEmoji} emoji/karakter hias — tier-0/1 wajib 0 (tulis status dengan kata)`);
      if (PENANDA_KUTIPAN.test(baris)) return;
      const nRusak = MOJIBAKE.reduce((s, re) => s + ((baris.match(re) || []).length), 0);
      if (nRusak > 0) catat("R13", f, i + 1, `${nRusak} mojibake tanpa penanda "mojibake"/[kutipan-disengaja]`);
    });
  }
  if (nBaris === 0) catat("R13", ROOT, 0, "tidak ada baris tier-0/1 yang diperiksa — periksa apakah pola R13 masih cocok");
}

// ── R14 — prefix ID bernomor wajib terdaftar (dipasang 2026-10-22, batch D8) ──
{
  const regPath = join(ROOT, "docs", "id-registry.md");
  const prefixTerdaftar = new Set();
  if (existsSync(regPath)) {
    let bagian = "";
    for (const baris of readFileSync(regPath, "utf8").split(/\r?\n/)) {
      const h = baris.match(/^##\s+(\d+[a-z]?)\./);
      if (h) bagian = h[1];
      if (bagian !== "2" && bagian !== "4") continue;
      if (!/^\|/.test(baris)) continue;
      const sel = (baris.split("|")[1] || "").replace(/`/g, "");
      for (const tok of sel.split(/[/,·…]/)) {
        const t = tok.trim();
        if (!/^[A-Z]/.test(t)) continue;
        prefixTerdaftar.add(t.includes("-") ? t.split("-")[0] : (t.match(/^[A-Z]+/) || [t])[0]);
      }
    }
  } else {
    catat("R14", regPath, 0, "docs/id-registry.md belum ada — prefix ID tidak bisa diperiksa");
  }
  // NOISE = token teknis & nama (bukan ID). Daftar ini sengaja pendek dan beralasan.
  const NOISE = new Set([
    "SHA", "UTF", "AES", "PSAK", "ISO", "GPT", "ESP", "HMAC", "JSON", "HTML", "HTTP", "API",
    "SQL", "CSS", "TASK", "KARTU",
  ]);
  const ID_BERNOMOR = /\b([A-Z][A-Z0-9]{0,5})(?:-[A-Z0-9]{1,6}){0,2}-\d{1,4}[a-z]?(?![-\w])/g;
  let nToken = 0;
  for (const f of tier01) {
    readFileSync(f, "utf8").split(/\r?\n/).forEach((baris, i) => {
      for (const m of baris.matchAll(ID_BERNOMOR)) {
        if (NOISE.has(m[1])) continue;
        nToken++;
        if (!prefixTerdaftar.has(m[1])) {
          catat("R14", f, i + 1, `prefix ID "${m[1]}-" tidak terdaftar di id-registry §2/§4 (token ${m[0]})`);
        }
      }
    });
  }
  if (nToken === 0) catat("R14", ROOT, 0, "tidak ada token ID bernomor yang diperiksa — periksa apakah pola R14 masih cocok");
}

// ── R15 — rute/path dokumen harus ada di kode (dipasang 2026-10-22, batch D8) ──
{
  const appTsx = join(ROOT, "frontend", "src", "App.tsx");
  const peran = join(ROOT, "docs", "product", "peran.md");
  const fitur = join(ROOT, "docs", "FITUR.md");
  const ruteApp = new Set();
  if (existsSync(appTsx)) {
    // Rute bersarang (`/inventory` + `gudang`) disusun dari indentasi JSX: setiap <Route> mewarisi
    // path absolut terdekat dari induknya. Tanpa ini, rute anak dilaporkan "tidak ada" secara salah.
    const barisApp = readFileSync(appTsx, "utf8").split(/\r?\n/);
    const stack = [];
    barisApp.forEach((b, i) => {
      const buka = b.match(/^(\s*)<Route\b/);
      if (buka) {
        const indent = buka[1].length;
        let path = null;
        for (let j = i; j < Math.min(i + 5, barisApp.length); j++) {
          const mp = barisApp[j].match(/path=["']([^"']+)["']/);
          if (mp) { path = mp[1]; break; }
          if (j > i && /<Route\b/.test(barisApp[j])) break;
        }
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
        const induk = [...stack].reverse().find((s) => s.path)?.path ?? "";
        const penuh = path === null ? null : path.startsWith("/") ? path : `${induk}/${path}`.replace(/\/+/g, "/");
        stack.push({ indent, path: penuh });
        if (penuh) ruteApp.add(penuh);
      } else if (/<\/Route>/.test(b)) {
        const indent = b.match(/^(\s*)/)[1].length;
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      }
    });
  } else if (existsSync(peran)) {
    catat("R15", appTsx, 0, "frontend/src/App.tsx tidak ada — rute peran.md tidak bisa diverifikasi");
  }
  let nRute = 0;
  if (existsSync(peran)) {
    readFileSync(peran, "utf8").split(/\r?\n/).forEach((baris, i) => {
      for (const m of baris.matchAll(/`(\/[^`\s]*)`/g)) {
        const r = m[1];
        if (r.includes("*")) continue;            // ringkasan wildcard, bukan rute literal
        nRute++;
        if (!ruteApp.has(r)) catat("R15", peran, i + 1, `rute ${r} tidak ada di frontend/src/App.tsx`);
      }
    });
    if (nRute === 0) catat("R15", peran, 0, "tidak ada rute yang diperiksa — periksa apakah pola R15 masih cocok");
  }
  let nPath = 0;
  for (const f of [peran, fitur]) {
    if (!existsSync(f)) continue;
    readFileSync(f, "utf8").split(/\r?\n/).forEach((baris, i) => {
      for (const m of baris.matchAll(/`(frontend\/[^`\s]+)`/g)) {
        const p = m[1].replace(/[.,;:]+$/, "");
        if (/[*{<…]/.test(p)) continue;
        nPath++;
        if (!existsSync(join(ROOT, ...p.split("/")))) catat("R15", f, i + 1, `path ${p} tidak ada di disk`);
      }
    });
  }
  if (nPath === 0 && existsSync(peran)) catatInfo("R15", peran, 0, "tidak ada path frontend/... yang diperiksa");
}

// ── R16 — plafon byte per tier, ratchet (dipasang 2026-10-22, batch D8) ──────
{
  const sekarang = hitungTier();
  if (!existsSync(TIER_BASELINE)) {
    catat("R16", TIER_BASELINE, 0, `baseline tier belum ada — jalankan: node scripts/check-docs.mjs --perbarui-tier --alasan="..."`);
  } else {
    let b = null;
    try { b = JSON.parse(readFileSync(TIER_BASELINE, "utf8")); }
    catch { catat("R16", TIER_BASELINE, 0, "baseline tier tidak bisa di-parse sebagai JSON"); }
    if (b) {
      for (const { id, label, tanpaCap } of TIERS) {
        const n = sekarang[id].byte;
        if (tanpaCap) {
          catatInfo("R16", TIER_BASELINE, 0, `tier ${id} (${label}) ${n} B — catatan bertanggal, tidak di-cap (bertambah karena bukti baru) `);
          continue;
        }
        const cap = b.tier?.[id]?.cap;
        if (cap === undefined) {
          catat("R16", TIER_BASELINE, 0, `tier ${id} (${label}) belum punya cap — jalankan --perbarui-tier`);
          continue;
        }
        if (n > cap) {
          catat("R16", TIER_BASELINE, 0, `tier ${id} (${label}) ${n} B > cap ${cap} B (+${n - cap} B) — pindahkan isi; cap hanya turun dengan keputusan owner`);
        } else {
          catatInfo("R16", TIER_BASELINE, 0, `tier ${id} (${label}) ${n} B / cap ${cap} B (${cap - n} B ruang)`);
        }
      }
    }
  }
}

// ── CATATAN ARSIP (T-05) — kotak `[ ]` di dalam arsip beku (dipasang 2026-10-07, batch SISA-DOCS) ──
// Dipindai tiap kali gate jalan, TIDAK dihitung sebagai pelanggaran dan tidak mengubah exit code.
// Alasan lengkap: kalibrasi 13 di kepala skrip. Bentuknya sama dengan laporan anchor "rapuh" R8:
// yang tidak pasti/tidak bisa ditutup tetap DILIHAT, tetapi tidak menuduh.
const arsipKotak = [];
{
  for (const f of walk(join(ROOT, "docs", "arsip"))) {
    const n = (readFileSync(f, "utf8").match(/^\s*[-*]\s*\[ \]/gm) || []).length;
    if (n > 0) arsipKotak.push({ file: rel(f), n });
  }
  arsipKotak.sort((a, b) => b.n - a.n || a.file.localeCompare(b.file));
}

// ── CATATAN NOMOR BARIS (dipasang 2026-10-07, batch SERAH-SESI) — INFO, bukan pelanggaran ──
// Kebijakan KONTRAK §7: "rujukan lokasi = kutipan, bukan nomor baris". Sampai batch ini
// kebijakan itu TIDAK punya detektor sama sekali. Bentuk yang dipilih sama dengan T-05:
// DILIHAT tiap kali gate jalan, TIDAK memblokir, dan exit code tidak berubah — karena
// 85 rujukan itu tidak bisa ditutup tanpa menyunting dokumen aturan bisnis 30 KB yang
// butuh verifikasi kode per baris (pekerjaan Isi, bukan pekerjaan sistem).
// Ruang lingkup SENGAJA = dokumen kontrak R1 saja (akar + docs/*.md + domain/operations/
// product), karena di sanalah aturannya berlaku. `docs/kerja/**`, catatan bertanggal
// (audit/history/arsip), dan rencana batch DILUARKAN: di sana "bukti baris" memang alat kerja.
const POLA_NOMOR_BARIS = /(?<![\w/\\.-])([\w][\w./\\-]*\.(?:tsx?|jsx?|mjs|cjs|prisma|sql|ps1)):(\d+)/g;
const KONTRAK_RE = /(^|[\\/])docs[\\/](domain|operations|product)[\\/]|(^|[\\/])docs[\\/][^\\/]+\.md$/;
const nomorBaris = [];
{
  for (const f of [...berkasAktif, ...berkasRoot]) {
    const r = rel(f);
    if (!KONTRAK_RE.test(f)) continue;
    if (/^docs\/(kerja|rencana|audit|history|arsip)\//.test(r)) continue;
    const m = readFileSync(f, "utf8").match(POLA_NOMOR_BARIS) || [];
    if (m.length > 0) nomorBaris.push({ file: r, n: m.length });
  }
  nomorBaris.sort((a, b) => b.n - a.n || a.file.localeCompare(b.file));
}

// ── laporan ────────────────────────────────────────────────────────────────
const grup = (rule, arr = pelanggaran) => arr.filter((p) => p.rule === rule);
const judul = {
  R1: "R1 angka volatil pada dokumen kontrak",
  R2: "R2 tautan relatif mati",
  R3: "R3 kotak `[ ]` di luar docs/ANTREAN.md",
  R4: "R4 blok baca (berkas terpilih) + baris peran AGENTS",
  R5: "R5 plafon byte",
  R7: "R7 indeks cakupan audit",
  R6: "R6 rujukan backtick",
  R8: "R8 anchor mati",
  R9: "R9 nomor bagian ganda",
  R10: "R10 judul H1 ganda",
  R11: "R11 salinan berkas tangga",
  R12: "R12 ikatan antrean ↔ checklist dokumen tugas",
  R13: "R13 emoji/mojibake tier-0/1",
  R14: "R14 prefix ID terdaftar",
  R15: "R15 rute/path dokumen vs kode",
  R16: "R16 plafon tier (ratchet)",
};

console.log(`=== CHECK-DOCS ${VERSI_GATE} (gate dokumen KOST48) ===`);
console.log(`berkas diperiksa : ${diperiksa.length} aktif = ${berkasAktif.length} di docs/ + ${berkasRoot.length} di akar repo (docs/ memuat ${semuaMd.length} .md; ${semuaMd.length - berkasAktif.length} arsip/generated dikecualikan)`);
console.log(`versi kanonik    : ${[...versiDiterima].join(", ")} (dari frontend/src/config/version.ts + package.json)`);
console.log("");

for (const rule of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "R13", "R14", "R15", "R16"]) {
  const g = grup(rule);
  console.log(`— ${judul[rule]}: ${g.length}`);
  if (rule === "R3") {
    console.log(`  total kotak terbuka di luar rumah otoritatif: ${kotak.reduce((a, b) => a + b.n, 0)} di ${kotak.length} berkas`);
    kotak.slice(0, 15).forEach((k) => console.log(`    ${String(k.n).padStart(4)}  ${k.file}`));
    if (kotak.length > 15) console.log(`    … ${kotak.length - 15} berkas lain`);
    if (kotakInfo.length) {
      console.log(`  DIKELUARKAN dari R3 (bukan antrean, tetapi tetap terlihat): ${kotakInfo.reduce((a, b) => a + b.n, 0)} kotak di ${kotakInfo.length} berkas`);
      kotakInfo.forEach((k) => console.log(`    ${String(k.n).padStart(4)}  ${k.file} — ${k.sebab}`));
    }
    console.log("");
    console.log(`  CATATAN ARSIP (T-05, bukan pelanggaran — arsip beku): ${arsipKotak.reduce((a, b) => a + b.n, 0)} kotak \`[ ]\` di ${arsipKotak.length} berkas docs/arsip/**`);
    arsipKotak.slice(0, 8).forEach((k) => console.log(`    ${String(k.n).padStart(4)}  ${k.file}`));
    if (arsipKotak.length > 8) console.log(`    … ${arsipKotak.length - 8} berkas lain`);
    console.log("    KONTRAK §7 melarang pekerjaan terbuka ikut terarsip; angka ini membuat pelanggarannya terlihat.");
    console.log("    Tidak memblokir karena arsip beku + ledger konservasi SHA-256 (kalibrasi 13 di kepala skrip).");
    console.log("");
    console.log(`  CATATAN NOMOR BARIS (KONTRAK §7, bukan pelanggaran): ${nomorBaris.reduce((a, b) => a + b.n, 0)} rujukan \`berkas:NNN\` di ${nomorBaris.length} dokumen kontrak aktif`);
    nomorBaris.slice(0, 8).forEach((k) => console.log(`    ${String(k.n).padStart(4)}  ${k.file}`));
    if (nomorBaris.length > 8) console.log(`    … ${nomorBaris.length - 8} berkas lain`);
    console.log("    Kebijakan: tunjuk lokasi dengan KUTIPAN teks/anchor, bukan nomor baris (basi setiap berkas disunting).");
    console.log("    Tidak memblokir: konversinya pekerjaan Isi yang butuh verifikasi kode (kalibrasi 16 di kepala skrip).");
  } else {
    g.slice(0, 15).forEach((p) => console.log(`    ${p.file}${p.line ? ":" + p.line : ""} — ${p.pesan}`));
    if (g.length > 15) console.log(`    … ${g.length - 15} temuan lain`);
  }
  console.log("");
}

const infos = info;
console.log(`— INFO (sah, tidak dihitung sebagai pelanggaran): ${infos.length}`);
if (infos.length > 0) {
  const perFile = {};
  infos.forEach((p) => { perFile[p.file] = (perFile[p.file] || 0) + 1; });
  Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([f, n]) => console.log(`    ${String(n).padStart(4)}  ${f}`));
  console.log("    (kartu bukti bertanggal · berkas dengan daftar isi berjangkar · anchor rapuh R8: angkanya memang begitu, bukan kotor)");
}
console.log("");

if (dilewati.length > 0) {
  console.log("— DILEWATI (tidak pernah berarti lulus):");
  dilewati.forEach((s) => console.log(`    [${s.rule}] ${s.pesan}`));
  console.log("");
}

const totalPelanggaran = pelanggaran.length;
if (totalPelanggaran === 0 && dilewati.length === 0) {
  console.log("check-docs: BERSIH — 0 pelanggaran, 0 pemeriksaan dilewati.");
  process.exit(0);
}
if (totalPelanggaran === 0) {
  console.log(`check-docs: 0 pelanggaran, tetapi ${dilewati.length} pemeriksaan DILEWATI — tidak boleh dianggap lulus.`);
  process.exit(2);
}
console.log(`check-docs: ${totalPelanggaran} pelanggaran${dilewati.length ? ` + ${dilewati.length} pemeriksaan dilewati` : ""}.`);
console.log(`
Cara membetulkan:
  R1  hapus angkanya, ganti dengan perintah pengukurnya; atau tulis sebagai potret bertanggal
      ("potret 2026-10-05") yang memuat kata penanda riwayat.
  R2  perbaiki/arahkan ulang tautannya ke rumah kanonik.
  R3  kotak pekerjaan hanya di docs/ANTREAN.md dan di "## Checklist" dokumen tugas bertanda
      <!-- checklist-otoritatif -->; di tempat lain turunkan derajatnya jadi daftar biasa.
  R4  tambahkan blok baca di 12 baris pertama berkas tangga wajib.
  R5  rampingkan berkas, atau pecah dengan daftar isi berjangkar.
  R6  perbaiki rujukan backtick ke berkas yang benar, atau tandai barisnya sebagai catatan bertanggal.
  R7  buat/pulihkan docs/audit/index-cakupan.md sebagai pengganti checklist audit yang diarsipkan.
  R8  perbaiki anchor ke judul yang benar; "rapuh" berarti anchor itu hanya hidup bila spasi digabung
      (gejala slugifier lama di scripts/tambah-toc.mjs) — perbaiki anchor-nya, dan jangan buat TOC baru
      dengan skrip slug lama.
  R9  nomori ulang bagian yang bentrok dalam satu berkas (mis. hasil penggabungan dua dokumen:
      lanjutkan penomorannya). Kalau berkasnya catatan bertanggal, ia memang dikecualikan.
  R10 berkas hidup hanya boleh punya satu judul H1; turunkan judul kedua jadi "## " (slug tidak berubah),
      atau pisahkan dokumennya ke berkas sendiri.
  R11 berkas tangga wajib hanya boleh ada di rumah kanoniknya; salinan di tempat lain dipindahkan
      atau dihapus (zona ".design-audit/.docs-legacy/.audit-map" memang dikecualikan).
  R12 setiap baris ANTREAN yang memuat "checklist:" harus menunjuk berkas+anchor yang ada, dan
      setiap checklist tugas bertanda harus dirujuk satu baris ANTREAN.
  R13 tier-0/1 wajib 0 emoji; mojibake hanya sah pada baris yang memuat kata "mojibake" atau
      penanda [kutipan-disengaja]. Tulis status dengan kata, bukan ikon.
  R14 tambahkan prefix ke id-registry §2 (aktif) atau §4 (alias beku). Nama berkas (TASK-...),
      nama kartu (KARTU-...), dan token teknis (SHA-256) bukan ID — jangan didaftarkan.
  R15 rute di peran.md harus ada di frontend/src/App.tsx, dan path frontend/... harus ada di disk.
      Perbaiki dokumennya bila kode memang tidak punya rute itu; jangan melemahkan gate.
  R16 satu tier melewati cap byte-nya. Pindahkan isi ke arsip/rumah yang tepat; cap hanya boleh
      TURUN: node scripts/check-docs.mjs --perbarui-tier --alasan="..."`);
process.exit(dilewati.length > 0 ? 2 : 1);
