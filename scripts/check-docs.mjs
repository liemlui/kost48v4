#!/usr/bin/env node
// FILE: scripts/check-docs.mjs — gate dokumen KOST48
// Kontrak aturannya: docs/RENCANA-ROMPAK-DOCS.md §3. Jalankan dari akar repo:
//   node scripts/check-docs.mjs
//
// Kode keluar: 0 = bersih · 1 = ada pelanggaran · 2 = ada pemeriksaan yang DILEWATI
// (2 tidak pernah berarti lulus; pemeriksaan yang mati harus terlihat, bukan senyap).
//
// Aturan:
//   R1  angka volatil tanpa penanda potret pada DOKUMEN KONTRAK
//   R2  tautan relatif mati di dokumen aktif
//   R3  kotak `[ ]` otoritatif hanya di docs/ANTREAN.md
//   R4  blok baca wajib (jenis/status/untuk siapa/baca kalau) pada berkas tangga wajib
//   R5  plafon byte: AGENTS.md <=12 KB · berkas wajib <=16 KB · rujukan <=48 KB
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
// Yang TIDAK diperiksa v1 (jangan dianggap sudah dijaga): arsip beku (docs/arsip/**, docs/archieve/**),
// artefak generated (docs/audit-map/**), rotasi changelog, dan isi berkas di luar glob.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const VERSI_GATE = "v1.2";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
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
  "docs/RENCANA-ROMPAK-DOCS.md",
];
// Blok baca hanya untuk berkas yang DIPILIH pembaca (D2) — AGENTS.md dikecualikan, ia disuntik.
const BLOK_BACA_WAJIB = ["docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"];
const POLA_PERAN_AGENTS = /kontrak kerja[^\n]{0,120}disuntik|disuntik otomatis/i;
const BARIS_PERAN_CONTOH = "> Kontrak kerja agen — disuntik otomatis setiap request. Aturan lengkap: docs/KONTRAK.md.";
const ANTREAN = "docs/ANTREAN.md";
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
for (const file of diperiksa) {
  const teks = readFileSync(file, "utf8");
  const dir = dirname(file);
  let dalamFence = false;
  teks.split(/\r?\n/).forEach((baris, i) => {
    if (/^\s*```/.test(baris)) { dalamFence = !dalamFence; return; }
    if (dalamFence) return;
    for (const m of baris.matchAll(POLA_LINK)) {
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
for (const file of diperiksa) {
  if (rel(file) === ANTREAN) continue;
  const n = (readFileSync(file, "utf8").match(/^\s*[-*]\s*\[ \]/gm) || []).length;
  if (n > 0) {
    kotak.push({ file: rel(file), n });
    catat("R3", file, 0, `${n} kotak terbuka di luar ${ANTREAN} — turunkan derajatnya jadi daftar biasa`);
  }
}
kotak.sort((a, b) => b.n - a.n);

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
  if (!RUJUKAN_RE.test(file)) continue;
  const size = statSync(file).size;
  if (size <= PLAFON_RUJUKAN) continue;
  if (punyaTocBerjangkar(file)) {
    catatInfo("R5", file, 0, `${kb(size)} di atas plafon rujukan, tetapi punya daftar isi berjangkar — sah menurut D3`);
  } else {
    catat("R5", file, 0, `${kb(size)} (${size} B) > plafon rujukan ${kb(PLAFON_RUJUKAN)} dan TANPA daftar isi berjangkar di 80 baris pertama`);
  }
}

// ── laporan ────────────────────────────────────────────────────────────────
const grup = (rule, arr = pelanggaran) => arr.filter((p) => p.rule === rule);
const judul = {
  R1: "R1 angka volatil pada dokumen kontrak",
  R2: "R2 tautan relatif mati",
  R3: "R3 kotak `[ ]` di luar docs/ANTREAN.md",
  R4: "R4 blok baca (berkas terpilih) + baris peran AGENTS",
  R5: "R5 plafon byte",
};

console.log(`=== CHECK-DOCS ${VERSI_GATE} (gate dokumen KOST48) ===`);
console.log(`berkas diperiksa : ${diperiksa.length} aktif (${semuaMd.length} .md di docs/ seluruhnya; ${semuaMd.length - berkasAktif.length} arsip/generated dikecualikan)`);
console.log(`versi kanonik    : ${[...versiDiterima].join(", ")} (dari frontend/src/config/version.ts + package.json)`);
console.log("");

for (const rule of ["R1", "R2", "R3", "R4", "R5"]) {
  const g = grup(rule);
  console.log(`— ${judul[rule]}: ${g.length}`);
  if (rule === "R3") {
    console.log(`  total kotak terbuka di luar ANTREAN: ${kotak.reduce((a, b) => a + b.n, 0)} di ${kotak.length} berkas`);
    kotak.slice(0, 15).forEach((k) => console.log(`    ${String(k.n).padStart(4)}  ${k.file}`));
    if (kotak.length > 15) console.log(`    … ${kotak.length - 15} berkas lain`);
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
  console.log("    (kartu bukti bertanggal + berkas dengan daftar isi berjangkar: angkanya memang begitu, bukan kotor)");
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
  R3  kotak pekerjaan hanya di docs/ANTREAN.md; di tempat lain turunkan derajatnya jadi daftar biasa.
  R4  tambahkan blok baca di 12 baris pertama berkas tangga wajib.
  R5  rampingkan berkas, atau pecah dengan daftar isi berjangkar.`);
process.exit(dilewati.length > 0 ? 2 : 1);
