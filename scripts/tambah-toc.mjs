#!/usr/bin/env node
// tambah-toc.mjs — tambahkan / ganti daftar isi berjangkar pada berkas .md yang kepanjangan.
//
// Aturan proyek: berkas rujukan >48 KB WAJIB punya daftar isi berjangkar (KONTRAK §7, D3).
// Skrip ini menyisipkan TOC setelah blok kepala (baris ke-6) bila belum ada.
//
// Pakai: node scripts/tambah-toc.mjs <berkas.md> [--paksa]
//   tanpa --paksa : berkas yang sudah punya TOC dilewati (tidak ada yang ditimpa diam-diam)
//   --paksa       : TOC lama DIGANTI di tempatnya (sejak 2026-10-07)
//
// Perbaikan 2026-10-07 (batch SISA-DOCS) — dua cacat yang sudah terukur:
//   1. `--paksa` dulu MENAMBAH blok TOC kedua, bukan mengganti (temuan A-7b). Akibatnya berkas
//      bisa punya dua daftar isi, dan entri lama yang anchor-nya sudah basi tetap hidup. Kini
//      SELURUH blok TOC lama dihapus lebih dulu, lalu satu TOC baru disisipkan di posisi blok pertama.
//   2. Skrip menulis CRLF (`join("\r\n")`) padahal kebijakan line ending repo adalah `* text=auto eol=lf`
//      (.gitattributes, keputusan owner 2026-10-05). Setiap berkas yang pernah dilewati skrip ini jadi
//      tampak "modified" tanpa perubahan isi (`git ls-files --eol` → `w/crlf`), sehingga review diff
//      penuh derau. Kini ditulis LF; berkas skrip Windows (.ps1/.bat/.cmd) tetap CRLF sesuai kebijakan.
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const berkas = resolve(process.argv[2] ?? "");
const paksa = process.argv.includes("--paksa");
if (!berkas || !existsSync(berkas)) { console.error("Pakai: node scripts/tambah-toc.mjs <berkas.md> [--paksa]"); process.exit(2); }

const isi = readFileSync(berkas, "utf8");
const baris = isi.split(/\r?\n/);
const kb = statSync(berkas).size / 1024;
const kepala = baris.slice(0, 80).join("\n");
if (/\]\(#/.test(kepala) && !paksa) { console.log(`sudah ada daftar isi: ${kb.toFixed(1)} KB — dilewati`); process.exit(0); }

// Blok TOC lama = baris "**Daftar isi**" (atau "## Daftar isi") + entri `- [judul](#anchor)` sesudahnya.
// Dipakai untuk MENGGANTI, bukan menumpuk.
function rentangToc(barisAcuan) {
  const mulai = barisAcuan.findIndex((l) => /^\s*(?:\*\*Daftar isi\*\*|##\s*Daftar isi)\s*$/i.test(l));
  if (mulai < 0) return null;
  let akhir = mulai + 1;
  while (akhir < barisAcuan.length && (barisAcuan[akhir].trim() === "" || /^\s*-\s+\[.*\]\(#/.test(barisAcuan[akhir]))) akhir++;
  while (akhir > mulai + 1 && barisAcuan[akhir - 1].trim() === "") akhir--;
  return [mulai, akhir];
}

// Slug HARUS sama dengan renderer GitHub (github-slugger), kalau tidak setiap entri daftar isi
// menjadi tautan mati. Dua hal yang sering salah:
//   1. urutan: trim dulu -> buang tanda baca -> BARU ganti spasi (kalau trim dilakukan setelahnya,
//      sisa spasi di ujung judul ikut jadi tanda hubung);
//   2. jangan menggabungkan rentetan spasi: "UI/UX — Publik" -> GitHub "uiux--publik", bukan "uiux-publik".
// Perbaikan 2026-10-07 (batch A-1): sebelumnya di sini dipakai /[^\p{L}\p{N}\s-]/ + /\s+/g, yang
// menghasilkan anchor mati di GitHub untuk semua judul bersimbol berspasi (—, /, &). Akar temuan R8.
const renderJudul = (t) =>
  t.replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|__/g, "");
const slugJudul = (t) =>
  renderJudul(t).trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}\-_ ]/gu, "").replace(/ /g, "-");

const toc = ["", "**Daftar isi**", ""];

let n = 0;
for (const l of baris) {
  const m = l.match(/^(#{2,3})\s+(.+)$/);
  if (!m) continue;
  const judul = m[2].trim();
  const slug = slugJudul(judul);
  toc.push((m[1].length === 3 ? "  " : "") + `- [${judul}](#${slug})`);
  if (++n >= 40) break;
}
if (n < 3) { console.log(`hanya ${n} judul — daftar isi tidak bermakna, dilewati`); process.exit(0); }

// Keluarkan SEMUA blok TOC lama (bukan hanya yang pertama — gejala cacat 1 adalah blok kedua).
let kerja = [...baris];
const posisi = [];
let blok = rentangToc(kerja);
while (blok) {
  posisi.push(blok[0]);
  kerja.splice(blok[0], blok[1] - blok[0]);
  blok = rentangToc(kerja);
}
const sisip = posisi.length ? Math.min(...posisi) : 6;   // ganti di tempat blok pertama; kalau tidak ada, sesudah kepala

const baru = [...kerja.slice(0, sisip), ...toc, "", ...kerja.slice(sisip)];
// Kebijakan line ending (.gitattributes `* text=auto eol=lf`): LF untuk teks; skrip Windows tetap CRLF.
const eol = /\.(ps1|bat|cmd)$/i.test(extname(berkas)) ? "\r\n" : "\n";
const asalCrlf = /\r\n/.test(isi);
writeFileSync(berkas, baru.join(eol), "utf8");
const sesudah = statSync(berkas).size / 1024;
const catatan = [];
if (posisi.length) catatan.push(`${posisi.length} blok daftar isi lama diganti`);
if (asalCrlf && eol === "\n") catatan.push("line ending dinormalkan CRLF → LF (kebijakan .gitattributes)");
console.log(`daftar isi ${posisi.length ? "diganti" : "ditambahkan"}: ${n} entri · ${kb.toFixed(1)} -> ${sesudah.toFixed(1)} KB${catatan.length ? " · " + catatan.join(" · ") : ""}`);
