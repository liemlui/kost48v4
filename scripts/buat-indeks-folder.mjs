#!/usr/bin/env node
// buat-indeks-folder.mjs — buat README.md indeks untuk folder dokumen yang belum punya.
//
// Isi tabel diturunkan dari berkas itu sendiri (judul H1 + baris blok baca bila ada),
// jadi indeks tidak pernah berbohong soal isi berkas. Berkas yang sudah ada TIDAK ditimpa.
//
// Pakai: node scripts/buat-indeks-folder.mjs [akar-repo]
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const FOLDER = ["docs/domain", "docs/operations", "docs/product", "docs/history", "docs/rencana"];

const judul = (isi) => (isi.match(/^#\s+(.+)$/m) || [, "(tanpa judul)"])[1].trim();
const ringkas = (isi) => {
  const m = isi.match(/^>\s*·?\s*(?:Baca kalau:?)\s*(.+)$/im) || isi.match(/^>\s*\*\*Blok baca\*\*.+?Baca kalau:\s*(.+)$/im);
  if (m) return m[1].trim().replace(/\|/g, "/").slice(0, 120);
  const s = isi.match(/^>\s*(?:Status:|\*\*Status\*\*)\s*(.+)$/im);
  return s ? s[1].trim().slice(0, 120) : "—";
};

for (const f of FOLDER) {
  const dir = join(ROOT, f.split("/").join(sep));
  if (!existsSync(dir)) { console.log(`  lewat (tidak ada): ${f}`); continue; }
  const out = join(dir, "README.md");
  if (existsSync(out)) { console.log(`  sudah punya indeks: ${f}/README.md`); continue; }
  const berkas = readdirSync(dir).filter((n) => n.endsWith(".md")).sort();
  const baris = berkas.map((n) => {
    const isi = readFileSync(join(dir, n), "utf8");
    const kb = (statSync(join(dir, n)).size / 1024).toFixed(1);
    return `| [${n}](${n}) | ${judul(isi)} | ${kb} KB | ${ringkas(isi)} |`;
  });
  const isi = [
    `# Indeks ${f.split("/").pop()} — daftar berkas & kapan dibaca`,
    "",
    "> **Blok baca** · Jenis: **indeks folder** · Status: **aktif (dihasilkan otomatis)** · Untuk siapa: agen/owner yang mencari berkas di folder ini",
    `> · Baca kalau: mencari berkas di \`${f}/\` tanpa membuka semuanya. · **Jangan** dibaca kalau: sudah tahu berkas tujuannya.`,
    "",
    `Isi tabel diturunkan langsung dari setiap berkas (judul + "baca kalau"), jadi tidak ada daftar yang bisa menyimpang. Dibuat ulang dengan \`node scripts/buat-indeks-folder.mjs\`.`,
    "",
    "| Berkas | Judul | Ukuran | Kapan dibaca |",
    "|---|---|---:|---|",
    ...baris,
    "",
  ].join("\r\n");
  writeFileSync(out, isi, "utf8");
  console.log(`  dibuat: ${f}/README.md (${berkas.length} berkas terdaftar, ${(Buffer.byteLength(isi, "utf8") / 1024).toFixed(1)} KB)`);
}
