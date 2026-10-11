#!/usr/bin/env node
// scripts/petakan-tumpang-tindih-docs.mjs
//
// TUJUAN (lanjutan tugas P9 opsi b, 2026-10-11): detektor verbatim
// (petakan-duplikasi-docs.mjs) hanya menangkap blok IDENTIK. Ukurannya cuma
// +-22% dari jalan menuju sasaran pemadatan -20%, jadi sisa jalannya ada di
// aturan yang TUMPANG-TINDI MAKNA (ditulis berbeda). Alat ini memetakan
// pasangan BAGIAN yang membahas topik sama, supaya owner bisa memutuskan
// bagian mana yang boleh digabung - TANPA agen menyentuh isinya.
//
// METODE: bagian (## / ###) dipotong, setiap bagian jadi himpunan istilah kuat
// (kata >=4 huruf, bukan kata umum, dibobot 1). Kemiripan = Jaccard. Pasangan
// dilaporkan bila Jaccard >= ambang DAN jumlah istilah bersama >= minimum.
//
// BATAS (ditulis di keluaran, bukan disembunyikan):
//   - Kemiripan LEKSIKAL != kemiripan makna. Dua bagian bisa memakai istilah
//     sama untuk hal berbeda, dan sebaliknya. Karena itu setiap pasangan
//     ditampilkan dengan judul + kutipan supaya MANUSIA menilai.
//   - Ini BUKAN rekomendasi penggabungan; ini daftar periksa.
//   - Angka "perkiraan penghematan" = baris bagian yang LEBIH PENDEK, yaitu
//     batas atas bila salah satunya benar-benar dibuang.
//
// Pakai: node scripts/petakan-tumpang-tindih-docs.mjs [--ambang 0.35] [--min-istilah 8] [--kelompok domain,operations,product]
// Keluaran: ringkasan stdout + .audit-runtime/pemadatan-tumpang-tindih.json

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const AMBANG = Number(arg("ambang", "0.35"));
const MIN_ISTILAH = Number(arg("min-istilah", "8"));
const KELOMPOK = String(arg("kelompok", "domain,operations,product")).split(",").map((s) => s.trim()).filter(Boolean);

// kata umum Indonesia + Inggris yang tidak menandakan topik
const UMUM = new Set(`yang dan atau untuk dari dengan pada ke di ini itu adalah akan tidak bukan bila jika maka agar saat ketika sudah belum masih hanya juga serta oleh sebagai dalam antara terhadap melalui tanpa oleh karena itu nya lah kah pun se per para semua setiap dapat bisa harus wajib boleh perlu ada tidaknya kami kita anda mereka dia owner admin staff tenant penghuni catatan bagian berkas dokumen halaman status aturan aturannya aturan yang hal cara tujuan maksud sumber dasar dasar-dasar contoh daftar isi tabel lihat rinci rincian detail lengkap berikut lain lainnya sama hanya khusus umum total jumlah angka nilai hasil proses sistem data fitur modul halaman menu tombol form input output kode skrip perintah jalankan lewat masuk keluar atas bawah depan belakang baru lama kecil besar tinggi rendah cepat lambat mudah sulit benar salah`.split(/\s+/));

const rapikan = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
const istilah = (teks) => {
  const set = new Set();
  for (const w of rapikan(teks).split(" ")) {
    if (w.length < 4) continue;
    if (UMUM.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    set.add(w);
  }
  return set;
};

// ── kumpulkan berkas ───────────────────────────────────────────────────────
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

// ── potong jadi bagian (## dan ###) ────────────────────────────────────────
const bagian = [];
for (const f of berkas) {
  const baris = readFileSync(f, "utf8").split(/\r?\n/);
  let judul = "(kepala berkas)";
  let mulai = 0;
  const dorong = (sampai) => {
    const isi = baris.slice(mulai, sampai).join("\n");
    if (isi.trim().length === 0) return;
    const kata = istilah(isi + " " + judul);
    if (kata.size < MIN_ISTILAH) return;
    bagian.push({
      berkas: relative(ROOT, f).replace(/\\/g, "/"),
      judul: judul.replace(/^#+\s*/, "").slice(0, 90),
      barisAwal: mulai + 1,
      barisAkhir: sampai,
      panjang: sampai - mulai,
      kata,
    });
  };
  baris.forEach((b, i) => {
    if (/^#{2,3}\s+/.test(b)) {
      dorong(i);
      judul = b;
      mulai = i;
    }
  });
  dorong(baris.length);
}

// ── kemiripan Jaccard antar bagian di BERKAS BERBEDA ───────────────────────
const jaccard = (a, b) => {
  let sama = 0;
  for (const w of a) if (b.has(w)) sama++;
  return { sama, nilai: sama / (a.size + b.size - sama) };
};

const pasangan = [];
for (let i = 0; i < bagian.length; i++) {
  for (let j = i + 1; j < bagian.length; j++) {
    const A = bagian[i];
    const B = bagian[j];
    if (A.berkas === B.berkas) continue; // fokus: antar berkas (inilah yang bisa dipadatkan)
    if (A.kata.size < MIN_ISTILAH || B.kata.size < MIN_ISTILAH) continue;
    const { sama, nilai } = jaccard(A.kata, B.kata);
    if (sama < MIN_ISTILAH || nilai < AMBANG) continue;
    pasangan.push({
      nilai: Number(nilai.toFixed(3)),
      istilahBersama: sama,
      panjangSama: Math.min(A.panjang, B.panjang),
      a: { berkas: A.berkas, judul: A.judul, baris: `${A.barisAwal}-${A.barisAkhir}`, panjang: A.panjang },
      b: { berkas: B.berkas, judul: B.judul, baris: `${B.barisAwal}-${B.barisAkhir}`, panjang: B.panjang },
      contohIstilah: [...A.kata].filter((w) => B.kata.has(w)).slice(0, 12),
    });
  }
}
pasangan.sort((x, y) => y.nilai - x.nilai || y.panjangSama - x.panjangSama);

const potensi = pasangan.reduce((a, p) => a + p.panjangSama, 0);
const keluar = {
  tanggal: new Date().toISOString().slice(0, 10),
  kelompok: KELOMPOK,
  parameter: { ambangJaccard: AMBANG, minIstilahBersama: MIN_ISTILAH },
  berkasDiperiksa: berkas.length,
  bagianDiperiksa: bagian.length,
  pasanganDitemukan: pasangan.length,
  potensiPenghematanMaks: potensi,
  batas: [
    "Kemiripan LEKSIKAL != kemiripan makna; setiap pasangan wajib dinilai manusia.",
    "Bukan rekomendasi penggabungan - ini daftar periksa.",
    "potensiPenghematanMaks = jumlah baris bagian yang lebih pendek; BATAS ATAS bila salah satunya dibuang.",
    "Bagian lebih kecil dari min istilah dilewati (biasanya judul pendek tanpa isi).",
  ],
  pasangan: pasangan.slice(0, 40),
};
mkdirSync(join(ROOT, ".audit-runtime"), { recursive: true });
writeFileSync(join(ROOT, ".audit-runtime", "pemadatan-tumpang-tindih.json"), JSON.stringify(keluar, null, 2) + "\n", "utf8");

console.log(`=== PETA TUMPANG-TINDIH (Jaccard >= ${AMBANG}, istilah bersama >= ${MIN_ISTILAH}) ===`);
console.log(`berkas : ${berkas.length} · bagian diperiksa: ${bagian.length}`);
console.log(`pasangan lintas berkas : ${pasangan.length}`);
console.log(`potensi penghematan maks: ${potensi} baris (batas atas)`);
console.log("");
for (const p of pasangan.slice(0, 12)) {
  console.log(`  J=${p.nilai} · ${p.istilahBersama} istilah bersama · potensi ${p.panjangSama} baris`);
  console.log(`     A ${p.a.berkas}:${p.a.baris} (${p.a.panjang} baris) — ${p.a.judul}`);
  console.log(`     B ${p.b.berkas}:${p.b.baris} (${p.b.panjang} baris) — ${p.b.judul}`);
  console.log(`     istilah: ${p.contohIstilah.join(", ")}`);
}
if (pasangan.length === 0) console.log("  (tidak ada pasangan yang melewati ambang)");
console.log("");
console.log("data mentah: .audit-runtime/pemadatan-tumpang-tindih.json");
