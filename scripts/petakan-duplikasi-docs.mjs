#!/usr/bin/env node
// scripts/petakan-duplikasi-docs.mjs
//
// TUJUAN (tugas P9 opsi b, 2026-10-11): memberi ANGKA, bukan kesan, untuk
// pertanyaan "berapa isi yang benar-benar berulang antar dokumen domain+operasi?".
// Detektor gate R11 (salinan berkas tangga) hanya melihat berkas tangga; alat ini
// melihat SELURUH kelompok domain/operations/product.
//
// METODE (sengaja bodoh supaya bisa dipercaya):
//   1. Setiap baris dinormalisasi (spasi tepi dirapikan, baris kosong diabaikan)
//      dan baris "generik" dibuang (judul pendek, garis tabel, ---).
//   2. Kandidat awal = baris yang muncul 2..MAKS kemunculan (jarang). Baris yang
//      muncul ratusan kali (mis. header tabel berulang) dilewati karena hanya
//      menghasilkan kebisingan.
//   3. Dari setiap kandidat, blok dipanjangkan selama baris-baris berikutnya
//      identik di dua tempat atau lebih. Blok < MIN baris dibuang.
//   4. Setiap kemunculan dicatat berkas:baris supaya manusia bisa membuka dan menilai.
//
// BATAS (ditulis di keluaran, bukan disembunyikan):
//   - Hanya duplikasi VERBATIM; parafrase tidak terdeteksi.
//   - Tabrakan kebetulan (mis. tabel ukuran yang sama) ikut masuk - ditampilkan
//     untuk dinilai, BUKAN dipakai sebagai putusan penggabungan.
//   - barisBerlebih = kemunculan-1: PERKIRAAN penghematan, bukan janji.
//
// Pakai: node scripts/petakan-duplikasi-docs.mjs [--min 4] [--maks 6] [--kelompok domain,operations,product]
// Keluaran: ringkasan stdout + .audit-runtime/pemadatan-blok.json (data, bukan dokumen)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (nama, nilaiBawaan) => {
  const i = argv.indexOf(`--${nama}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : nilaiBawaan;
};

const MIN = Math.max(2, Number(arg("min", "4")) || 4);
const MAKS = Math.max(2, Number(arg("maks", "6")) || 6);
const KELOMPOK = arg("kelompok", "domain,operations,product").split(",").map((s) => s.trim()).filter(Boolean);

const rapikan = (s) => s.trim().replace(/\s+/g, " ");
const generik = (s) => {
  const t = rapikan(s);
  if (t.length === 0) return true;
  if (/^-{3,}$/.test(t)) return true;
  if (/^\|[\s:|-]+\|$/.test(t)) return true; // garis pemisah tabel
  if (/^#{1,6}\s+\S+/.test(t) && t.split(" ").length <= 6) return true; // judul pendek
  if (/^>\s*\*\*Blok baca\*\*/.test(t)) return true; // kepala "blok baca" berpola sama
  return false;
};

// ── kumpulkan berkas target ────────────────────────────────────────────────
const berkas = [];
for (const k of KELOMPOK) {
  const dir = join(ROOT, "docs", k);
  if (!existsSync(dir)) continue;
  const jalan = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) jalan(p);
      else if (e.endsWith(".md") && e !== "README.md") berkas.push(p);
    }
  };
  jalan(dir);
}
berkas.sort();

// ── muat isi + indeks baris ────────────────────────────────────────────────
const isi = new Map(); // path absolut → array baris
const peta = new Map(); // baris ternormalisasi → [{f, i}]
let totalBaris = 0;
for (const f of berkas) {
  const baris = readFileSync(f, "utf8").split(/\r?\n/);
  isi.set(f, baris);
  totalBaris += baris.length;
  baris.forEach((b, i) => {
    if (generik(b)) return;
    const k = rapikan(b);
    if (!peta.has(k)) peta.set(k, []);
    peta.get(k).push({ f, i });
  });
}

const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");

// panjang blok identik mulai dari (f,i) dan (g,j)
const panjangSama = (f, i, g, j) => {
  const A = isi.get(f);
  const B = isi.get(g);
  let n = 0;
  while (
    A[i + n] !== undefined &&
    B[j + n] !== undefined &&
    rapikan(A[i + n]) === rapikan(B[j + n])
  ) n++;
  return n;
};

const blok = [];
const terpakai = new Set(); // "f#i" sudah jadi bagian blok yang dilaporkan
for (const [, lokasi] of peta) {
  if (lokasi.length < 2 || lokasi.length > MAKS) continue;
  for (let a = 0; a < lokasi.length; a++) {
    const asal = lokasi[a];
    if (terpakai.has(`${asal.f}#${asal.i}`)) continue;
    // panjang blok maksimum terhadap setiap kemunculan lain
    let n = 0;
    const anggota = [asal];
    for (let b = 0; b < lokasi.length; b++) {
      if (a === b) continue;
      const lain = lokasi[b];
      const p = panjangSama(asal.f, asal.i, lain.f, lain.i);
      if (p >= MIN) {
        anggota.push(lain);
        if (p > n) n = p;
      }
    }
    if (n < MIN || anggota.length < 2) continue;
    // potong supaya semua anggota benar-benar sama sepanjang n
    const sah = anggota.filter((x) => panjangSama(asal.f, asal.i, x.f, x.i) >= n);
    if (sah.length < 2) continue;
    for (const x of sah) for (let k = 0; k < n; k++) terpakai.add(`${x.f}#${x.i + k}`);
    const kunci = [];
    const A = isi.get(asal.f);
    for (let k = 0; k < n; k++) kunci.push(A[asal.i + k]);
    blok.push({
      baris: n,
      kemunculan: sah.map((x) => ({ berkas: rel(x.f), baris: x.i + 1 })),
      berlebih: n * (sah.length - 1),
      kutipan: kunci.filter((l) => rapikan(l).length > 0).slice(0, 2).map(rapikan).join(" / ").slice(0, 140),
    });
  }
}

blok.sort((a, b) => b.berlebih - a.berlebih || b.baris - a.baris);

// ── akuntansi TANPA tumpang-tindih (temuan 2026-10-11) ─────────────────────
// Blok besar sering memuat blok lebih kecil di dalamnya (mis. blok 194 baris
// memuat blok 28 dan 25 baris). Menjumlahkan "berlebih" tiap blok akan
// menghitung baris yang SAMA dua kali, jadi total mentah adalah BATAS ATAS.
// Di sini dihitung juga jumlah baris unik yang punya salinan, per berkas.
const sudahDihitung = new Map(); // berkas → Set indeks baris yang sudah dihitung untuk penghematan
for (const f of berkas) sudahDihitung.set(f, new Set());
for (const b of blok) {
  // hitung baris yang bisa dihemat: kemunculan ke-2..n (kemunculan ke-1 = induk)
  const [induk, ...salinan] = b.kemunculan;
  void induk;
  for (const s of salinan) {
    const f = join(ROOT, s.berkas);
    const set = sudahDihitung.get(f);
    if (!set) continue;
    for (let i = 0; i < b.baris; i++) {
      const idx = s.baris - 1 + i;
      if (set.has(idx)) continue;
      // hanya hitung bila baris itu memang punya pasangan identik di tempat lain
      set.add(idx);
    }
  }
}
let berlebihUnik = 0;
const perBerkasUnik = new Map();
for (const [f, set] of sudahDihitung) {
  if (set.size === 0) continue;
  berlebihUnik += set.size;
  perBerkasUnik.set(rel(f), set.size);
}

const totalBerlebih = blok.reduce((a, b) => a + b.berlebih, 0);

const keluar = {
  tanggal: new Date().toISOString().slice(0, 10),
  kelompok: KELOMPOK,
  parameter: { minBaris: MIN, maksKemunculanKandidat: MAKS },
  berkasDiperiksa: berkas.length,
  totalBarisKelompok: totalBaris,
  blokDitemukan: blok.length,
  barisBerlebihMentah: totalBerlebih,
  barisBerlebihUnik: berlebihUnik,
  perBerkasUnik: Object.fromEntries([...perBerkasUnik.entries()].sort((a, b) => b[1] - a[1])),
  batas: [
    "Hanya duplikasi VERBATIM (>= min baris identik); parafrase tidak terdeteksi.",
    "Kandidat awal dibatasi <= maks kemunculan; baris yang muncul sangat sering dilewati.",
    "barisBerlebihMentah = jumlah kemunculan-1 tiap blok: BATAS ATAS, bisa menghitung baris sama 2x bila blok saling memuat.",
    "barisBerlebihUnik = baris yang benar-benar punya salinan, dihitung sekali per berkas. Ini angka yang dipakai untuk keputusan.",
    "Keduanya PERKIRAAN penghematan, bukan janji: penggabungan nyata bisa lebih kecil.",
  ],
  blok: blok.slice(0, 40),
};
mkdirSync(join(ROOT, ".audit-runtime"), { recursive: true });
writeFileSync(join(ROOT, ".audit-runtime", "pemadatan-blok.json"), JSON.stringify(keluar, null, 2) + "\n", "utf8");

console.log(`=== PETAKAN DUPLIKASI DOKUMEN (min ${MIN} baris identik) ===`);
console.log(`kelompok   : ${KELOMPOK.join(", ")}`);
console.log(`berkas     : ${keluar.berkasDiperiksa}`);
console.log(`total baris: ${totalBaris}`);
console.log(`blok identik ditemukan  : ${blok.length}`);
console.log(`berlebih MENTAH (batas atas) : ${totalBerlebih}  (${((totalBerlebih / totalBaris) * 100).toFixed(1)}%)`);
console.log(`berlebih UNIK (dipakai)      : ${berlebihUnik}  (${((berlebihUnik / totalBaris) * 100).toFixed(1)}%)`);
console.log("");
console.log("berkas dengan salinan terbanyak:");
for (const [f, n] of [...perBerkasUnik.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`  ${String(n).padStart(4)} baris  ${f}`);
}
console.log("");
for (const b of blok.slice(0, 12)) {
  console.log(`  ${String(b.berlebih).padStart(4)} baris berlebih · blok ${b.baris} baris × ${b.kemunculan.length} kemunculan`);
  console.log(`       ${b.kutipan}`);
  for (const k of b.kemunculan) console.log(`       - ${k.berkas}:${k.baris}`);
}
if (blok.length === 0) console.log("  (tidak ada blok identik >= min baris)");
console.log("");
console.log("data mentah: .audit-runtime/pemadatan-blok.json");
