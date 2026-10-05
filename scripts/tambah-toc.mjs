#!/usr/bin/env node
// tambah-toc.mjs — tambahkan daftar isi berjangkar ke berkas .md yang kepanjangan.
//
// Aturan proyek: berkas rujukan >48 KB WAJIB punya daftar isi berjangkar (KONTRAK §7, D3).
// Skrip ini menyisipkan TOC setelah blok kepala (baris ke-6) bila belum ada.
//
// Pakai: node scripts/tambah-toc.mjs <berkas.md> [--paksa]
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const berkas = resolve(process.argv[2] ?? "");
const paksa = process.argv.includes("--paksa");
if (!berkas || !existsSync(berkas)) { console.error("Pakai: node scripts/tambah-toc.mjs <berkas.md>"); process.exit(2); }

const isi = readFileSync(berkas, "utf8");
const baris = isi.split(/\r?\n/);
const kb = statSync(berkas).size / 1024;
const kepala = baris.slice(0, 80).join("\n");
if (/\]\(#/.test(kepala) && !paksa) { console.log(`sudah ada daftar isi: ${kb.toFixed(1)} KB — dilewati`); process.exit(0); }

const toc = ["", "**Daftar isi**", ""];
let n = 0;
for (const l of baris) {
  const m = l.match(/^(#{2,3})\s+(.+)$/);
  if (!m) continue;
  const judul = m[2].trim();
  const slug = judul.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
  toc.push((m[1].length === 3 ? "  " : "") + `- [${judul}](#${slug})`);
  if (++n >= 40) break;
}
if (n < 3) { console.log(`hanya ${n} judul — daftar isi tidak bermakna, dilewati`); process.exit(0); }

const baru = [...baris.slice(0, 6), ...toc, "", ...baris.slice(6)];
writeFileSync(berkas, baru.join("\r\n"), "utf8");
const sesudah = statSync(berkas).size / 1024;
console.log(`daftar isi ditambahkan: ${n} entri · ${kb.toFixed(1)} -> ${sesudah.toFixed(1)} KB`);
