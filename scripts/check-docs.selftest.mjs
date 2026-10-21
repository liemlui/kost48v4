#!/usr/bin/env node
// check-docs.selftest.mjs — membuktikan gate dokumen BENAR-BENAR BISA GAGAL.
//
// KENAPA ADA. Pagar yang tidak pernah terbukti bisa gagal tidak layak dipercaya: di repo rujukan
// sistem ini, tiga kali sebuah pemeriksaan tampak hijau padahal tidak memeriksa apa pun. Aturan yang
// tidak punya self-test adalah harapan, bukan penjaga.
//
// CARA KERJA. Skrip membangun POHON SINTETIS minimal di `.design-audit/selftest/` (diabaikan git),
// membuktikan pohon itu BERSIH lebih dulu (syarat mutlak: kalau baseline-nya tidak bersih, self-test
// tidak membuktikan apa pun), lalu untuk SETIAP aturan menyuntikkan SATU pelanggaran dan memastikan
// gate GAGAL pada aturan itu. Dua arah: LULUS saat seharusnya lulus, GAGAL saat seharusnya gagal.
//
// Pakai: node scripts/check-docs.selftest.mjs
// Keluar: 0 = semua uji lulus · 1 = ada uji yang gagal · 3 = pohon uji tidak bisa dibangun
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, openSync, closeSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GATE = join(ROOT, "scripts", "check-docs.mjs");
const TREE = join(ROOT, ".design-audit", "selftest");
const VERSI = "9.9.9";

// ── isi pohon uji (baseline: SEMUA aturan lulus) ───────────────────────────────
const BLOK = "> **Blok baca** · Jenis: **kontrak** · Status: **aktif** · Untuk siapa: agen\n> · Baca kalau: selalu.\n\n";

const BERKAS = {
  "AGENTS.md": "# KONTRAK KERJA AGEN (pohon uji)\n\nKontrak kerja agen — disuntik otomatis setiap request.\n\n## 1. Otoritas\n\nIsi.\n",
  "package.json": `{ "name": "pohon-uji", "version": "${VERSI}" }\n`,
  "frontend/src/config/version.ts": `export const APP_VERSION = "${VERSI}";\n`,
  "docs/KONTRAK.md": BLOK + "# KONTRAK\n\n## 1. Aturan\n\nIsi.\n",
  "docs/PETA-KODE.md": BLOK + "# PETA-KODE\n\n## 1. Peta\n\nIsi.\n",
  "docs/ANTREAN.md":
    BLOK +
    "# ANTREAN\n\n## 1. Antrean\n\nRujukan sah: `docs/KONTRAK.md` dan [KONTRAK](KONTRAK.md#1-aturan).\n\n- [ ] TUGAS-1 — contoh | Gate: tidak ada | checklist: kerja/TASK-AKTIF.md#checklist\n",
  "docs/kerja/TASK-AKTIF.md":
    "# TASK-AKTIF (pohon uji)\n\n<!-- checklist-otoritatif -->\n\n## Checklist\n\n<a id=\"checklist\"></a>\n\n- [ ] W-TNT-001 — contoh langkah\n",
  "docs/audit/index-cakupan.md": "# Indeks cakupan audit\n\nRujukan: `docs/KONTRAK.md`.\n",
};

function bangunPohon() {
  rmSync(TREE, { recursive: true, force: true });
  for (const [rel, isi] of Object.entries(BERKAS)) {
    const p = join(TREE, ...rel.split("/"));
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, isi, "utf8");
  }
}

function tulis(rel, isi) {
  const p = join(TREE, ...rel.split("/"));
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, isi, "utf8");
}

function baca(rel) {
  return readFileSync(join(TREE, ...rel.split("/")), "utf8");
}

// ── jalankan gate pada pohon uji ──────────────────────────────────────────────
// Sandbox menolak PIPA stdio pada child_process (EPERM) — pola yang sama dengan
// scripts/ukur-kesegaran-docs.mjs. Karena itu keluaran dialihkan ke berkas lewat fd, TANPA pipa,
// dan berkasnya dibaca setelah proses selesai. Tidak ada jalur `require`: skrip ini ESM.
function jalankanGate() {
  const out = join(TREE, ".keluaran.txt");
  const fd = openSync(out, "w");
  let status = null;
  try {
    const r = spawnSync(process.execPath, [GATE, TREE], { cwd: ROOT, stdio: ["ignore", fd, fd] });
    status = r.status;
    if (r.error) return { status: null, keluaran: `galat spawn: ${r.error.code ?? r.error.message}` };
  } finally {
    closeSync(fd);
  }
  return { status, keluaran: existsSync(out) ? readFileSync(out, "utf8") : "" };
}

// ── uji ───────────────────────────────────────────────────────────────────────
// KONTRAK EXIT CODE gate (berlaku di repo ini): 0 = BERSIH · 1 = ada pelanggaran ·
// 2 = ada pemeriksaan yang DILEWATI (tidak pernah berarti lulus).
// Karena pelanggaran yang sudah ada sebelumnya dapat menaikkan kode keluar, uji per aturan
// menuntut **exit ≠ 0** + aturan itu terlihat berjumlah ≥1 — bukan exit == 2.
const uji = [];
const cek = (nama, lulus, detail) => uji.push({ nama, lulus, detail });

// 0. baseline WAJIB bersih — tanpa ini self-test tidak bermakna
bangunPohon();
const base = jalankanGate();
cek("0. pohon uji BERSIH tanpa pelanggaran", base.status === 0 && /BERSIH/.test(base.keluaran),
  `exit ${base.status}`);

// 1. setiap aturan: suntik satu pelanggaran, gate harus menangkapnya
const KASUS = [
  ["R1", "R1 angka volatil", () => tulis("docs/KONTRAK.md", baca("docs/KONTRAK.md") + "\nVersi aplikasi: 1.2.3\n")],
  ["R2", "R2 tautan mati", () => tulis("docs/ANTREAN.md", baca("docs/ANTREAN.md") + "\n[hilang](tidak-ada.md)\n")],
  ["R3", "R3 kotak otoritatif", () => tulis("docs/KONTRAK.md", baca("docs/KONTRAK.md") + "\n- [ ] kotak di luar antrean\n")],
  // R4 memeriksa 12 BARIS PERTAMA. Mutasi ini sengaja TIDAK memuat frasa yang dicari R4
  // ("blok baca" / "baca kalau" / "untuk siapa") — kalau frasa itu ikut tertulis di teks mutasinya,
  // gate benar tidak menuduh dan ujinya jadi palsu. Pelajaran: teks mutasi tidak boleh memuat
  // apa yang sedang dicari oleh aturan yang diuji.
  ["R4", "R4 blok baca", () => tulis("docs/PETA-KODE.md", "# PETA-KODE\n\nKepala berkas ini sengaja dikosongkan.\n")],
  ["R5", "R5 plafon byte", () => tulis("docs/KONTRAK.md", BLOK + "# KONTRAK\n\n## 1. Aturan\n\n" + "x".repeat(17 * 1024) + "\n")],
  ["R6", "R6 rujukan backtick hantu", () => tulis("docs/ANTREAN.md", baca("docs/ANTREAN.md") + "\nRujukan: `docs/TIDAK-ADA.md`\n")],
  ["R7", "R7 indeks cakupan audit", () => rmSync(join(TREE, "docs", "audit", "index-cakupan.md"), { force: true })],
  ["R8", "R8 anchor mati", () => tulis("docs/ANTREAN.md", baca("docs/ANTREAN.md") + "\n[mati](KONTRAK.md#bagian-yang-tidak-ada)\n")],
  ["R9", "R9 nomor bagian ganda", () => tulis("docs/KONTRAK.md", BLOK + "# KONTRAK\n\n## 1. Aturan\n\nA\n\n## 1. Lagi\n\nB\n")],
  ["R10", "R10 judul H1 ganda", () => tulis("docs/KONTRAK.md", BLOK + "# KONTRAK\n\n# KONTRAK KEDUA\n\nIsi.\n")],
  ["R11", "R11 salinan berkas tangga", () => tulis("docs/salinan/AGENTS.md", "# Salinan AGENTS\n\nIsi.\n")],
  ["R12", "R12 checklist tanpa rujukan ANTREAN", () => tulis("docs/ANTREAN.md", baca("docs/ANTREAN.md").replace(" | checklist: kerja/TASK-AKTIF.md#checklist", ""))],
  ["R12", "R12 anchor checklist salah", () => tulis("docs/ANTREAN.md", baca("docs/ANTREAN.md").replace("kerja/TASK-AKTIF.md#checklist", "kerja/TASK-AKTIF.md#tidak-ada"))],
];

for (const [id, judul, suntik] of KASUS) {
  bangunPohon();
  suntik();
  const h = jalankanGate();
  const tertangkap = new RegExp(`— ${id}\\b[^\\n]*:\\s*[1-9]`).test(h.keluaran);
  cek(`${judul} terdeteksi`, tertangkap && h.status !== 0, `exit ${h.status}, terdeteksi=${tertangkap}`);
}

// 2. pemeriksaan yang DILEWATI tidak boleh berarti lulus
bangunPohon();
rmSync(join(TREE, "frontend", "src", "config", "version.ts"), { force: true });
const h2 = jalankanGate();
cek("pemeriksaan yang DILEWATI terbuka (exit 2, bukan 0)", h2.status === 2 && /DILEWATI/.test(h2.keluaran),
  `exit ${h2.status}`);

// ── laporan ───────────────────────────────────────────────────────────────────
const lulus = uji.filter((u) => u.lulus).length;
console.log("=== SELF-TEST GATE DOKUMEN (check-docs.mjs) ===");
console.log(`pohon uji: ${TREE} (dibangun ulang tiap uji, diabaikan git)`);
console.log("");
for (const u of uji) console.log(`${u.lulus ? "LULUS" : "GAGAL"}  ${u.nama}\n        ${u.detail}`);
console.log("");
console.log(`SKOR: ${lulus}/${uji.length} uji lulus`);
rmSync(TREE, { recursive: true, force: true });
process.exit(lulus === uji.length ? 0 : 1);
