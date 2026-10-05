#!/usr/bin/env node
// ukur-kekuatan-docs.mjs — kartu skor kekuatan dokumentasi KOST48.
//
// "Kekuatan %" di sini = jumlah pemeriksaan yang LULUS dibagi jumlah pemeriksaan yang dijalankan.
// Kartu ini deterministik dan bisa dijalankan ulang siapa pun; ia TIDAK mengukur selera/keindahan,
// dan tidak menggantikan gate (scripts/check-docs.mjs) — keduanya saling melengkapi:
//   gate   = aturan yang bisa memblokir (R1-R7)
//   kartu  = kesehatan yang lebih luas (yatim, indeks, inventaris, status, duplikasi)
//
// Pakai: node scripts/ukur-kekuatan-docs.mjs [akar-repo]
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const ARSIP = join(ROOT, "docs", "arsip");
const aktif = [];   // berkas .md aktif (di luar arsip) + root
const semuaMd = [];

const jalan = (dir, keluar, lewati = /[\\/](node_modules|dist|\.git|\.design-audit|\.docs-legacy|\.audit-map|\.dsh|\.reasonix|\.audit-runtime)[\\/]/) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (lewati.test(p)) continue;
    if (e.isDirectory()) jalan(p, keluar, lewati);
    else if (e.name.endsWith(".md")) keluar.push(p);
  }
  return keluar;
};
const rel = (p) => relative(ROOT, p).split(sep).join("/");
const kb = (p) => statSync(p).size / 1024;

jalan(join(ROOT, "docs"), semuaMd);
for (const p of semuaMd) if (!/^docs[\\/]arsip[\\/]/.test(rel(p))) aktif.push(p);
for (const n of readdirSync(ROOT)) if (n.endsWith(".md")) { aktif.push(join(ROOT, n)); semuaMd.push(join(ROOT, n)); }

const hasil = [];
const cek = (nama, lulus, detail) => hasil.push({ nama, lulus, detail });

// ── A. tautan markdown relatif ────────────────────────────────────────────────
{
  const rusak = [];
  for (const f of aktif) {
    // netralkan inline code dulu: contoh sintaks di dalam backtick BUKAN tautan
    // (pelajaran yang sama sudah diterapkan di gate check-docs.mjs)
    const isi = readFileSync(f, "utf8").replace(/`[^`\n]*`/g, "``");
    for (const m of isi.matchAll(/\]\(<([^>]+)>\)|\]\(([^)\s]+)\)/g)) {
      const t = m[1] ?? m[2];
      const [p] = t.split("#");
      if (!p || /^[a-z]+:/i.test(p)) continue;
      if (!existsSync(resolve(dirname(f), decodeURIComponent(p)))) rusak.push(`${rel(f)} -> ${t}`);
    }
  }
  cek("A. Tidak ada tautan markdown relatif yang mati", rusak.length === 0, `${rusak.length} rusak${rusak.length ? ": " + rusak.slice(0, 3).join("; ") : ""}`);
}

// ── B. rujukan backtick `docs/...` ────────────────────────────────────────────
{
  const CATATAN = /[\\/]docs[\\/](rencana|history|arsip)[\\/]/;
  const EXT = /\.(md|mjs|cjs|js|ts|tsx|json|ps1|sql|prisma|yml|yaml|toml|env|txt|sh)$/i;
  const rusak = [];
  let diperiksa = 0;
  for (const f of aktif) {
    if (CATATAN.test(f)) continue;
    readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/`(docs\/[A-Za-z0-9_./\-]+)`/g)) {
        const p = m[1].replace(/[.,;:]+$/, "");
        if (/[*{<…]/.test(p)) continue;
        const folder = p.endsWith("/");
        if (!EXT.test(p) && !folder) continue;
        diperiksa++;
        const abs = join(ROOT, ...p.replace(/\/$/, "").split("/"));
        if (!(existsSync(abs) && (folder ? statSync(abs).isDirectory() : statSync(abs).isFile()))) rusak.push(`${rel(f)}:${i + 1} ${p}`);
      }
    });
  }
  cek("B. Tidak ada rujukan backtick `docs/...` yang hantu", rusak.length === 0, `${diperiksa} diperiksa, ${rusak.length} hantu${rusak.length ? ": " + rusak.slice(0, 3).join("; ") : ""}`);
}

// ── C. plafon byte ────────────────────────────────────────────────────────────
{
  const pelanggar = [];
  const WAJIB = ["docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"];
  for (const f of aktif) {
    const r = rel(f), s = kb(f);
    if (r === "AGENTS.md") { if (s > 12) pelanggar.push(`${r} ${s.toFixed(1)}KB>12`); continue; }
    if (WAJIB.includes(r) || /^docs\/rencana\//.test(r)) { if (s > 16) pelanggar.push(`${r} ${s.toFixed(1)}KB>16`); continue; }
    if (s > 48) {
      const kepala = readFileSync(f, "utf8").split(/\r?\n/).slice(0, 80).join("\n");
      const tautan = (kepala.match(/\]\(#/g) || []).length;
      if (tautan < 3) pelanggar.push(`${r} ${s.toFixed(1)}KB>48 tanpa TOC`);
    }
  }
  cek("C. Semua berkas aktif di dalam plafon byte", pelanggar.length === 0, pelanggar.length ? pelanggar.join("; ") : `${aktif.length} berkas diperiksa`);
}

// ── D. blok baca / baris peran ────────────────────────────────────────────────
{
  const kurang = [];
  for (const r of ["docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"]) {
    const p = join(ROOT, r);
    if (!existsSync(p)) { kurang.push(`${r} tidak ada`); continue; }
    const kepala = readFileSync(p, "utf8").split(/\r?\n/).slice(0, 14).join("\n");
    if (!/Blok baca/i.test(kepala)) kurang.push(`${r} tanpa blok baca`);
  }
  const ag = readFileSync(join(ROOT, "AGENTS.md"), "utf8").split(/\r?\n/).slice(0, 12).join("\n");
  if (!/disuntik otomatis|kontrak kerja/i.test(ag)) kurang.push("AGENTS.md tanpa baris peran");
  cek("D. Berkas tangga wajib punya blok baca + baris peran AGENTS", kurang.length === 0, kurang.join("; ") || "ok");
}

// ── E. kotak otoritatif ───────────────────────────────────────────────────────
{
  const PENANDA = /<!--\s*kotak-non-otoritatif\s*-->/i;
  const luar = [];
  for (const f of aktif) {
    const r = rel(f);
    if (r === "docs/ANTREAN.md") continue;
    const isi = readFileSync(f, "utf8");
    const n = (isi.match(/^\s*[-*]\s*\[ \]/gm) || []).length;
    if (n === 0) continue;
    if (/^docs\/(history|audit)\//.test(r)) continue;
    if (PENANDA.test(isi.split(/\r?\n/).slice(0, 40).join("\n"))) continue;
    luar.push(`${r} (${n})`);
  }
  cek("E. Kotak `[ ]` otoritatif hanya di ANTREAN", luar.length === 0, luar.join("; ") || "ok");
}

// ── F. rujukan ke path yang sudah dihapus rombak ──────────────────────────────
{
  const MATI = ["docs/STATUS.md", "docs/M13_CHANGELOG.md", "docs/history/changelog/2026-09.md", "docs/archieve/", "docs/README.md"];
  const kena = [];
  for (const f of aktif) {
    const r = rel(f);
    if (/^docs\/(rencana|history)\//.test(r)) continue;                 // catatan migrasi boleh menyebut berkas yang dihapus
    if (/^docs\/audit\/.*\d{4}-\d{2}/.test(r)) continue;               // kartu bukti bertanggal: potret saat path lama masih ada
    const baris = readFileSync(f, "utf8").split(/\r?\n/);
    // Catatan sejarah yang MENJELASKAN path lama sah (prinsip yang sama dengan pengecualian catatan bertanggal di gate R6):
    // baris yang memuat penanda "dulu/dihapus/sudah tidak ada/kini" tidak dihitung sebagai rujukan hidup.
    const SEJARAH = /(dulu|dihapus|sudah tidak ada|tidak lagi|sebelumnya|kini|menggantikan|→)/i;
    baris.forEach((l, i) => {
      if (SEJARAH.test(l)) return;
      for (const m of MATI) if (l.includes(m)) kena.push(`${r}:${i + 1} ${m}`);
    });
  }
  cek("F. Tidak ada rujukan ke path yang dihapus rombak", kena.length === 0, kena.length ? kena.slice(0, 4).join("; ") : "ok");
}

// ── G. dokumen yatim (tidak dirujuk siapa pun) ────────────────────────────────
{
  const dirujuk = new Set();
  for (const f of semuaMd) {
    for (const m of readFileSync(f, "utf8").matchAll(/\]\(<([^>]+)>\)|\]\(([^)\s]+)\)/g)) {
      const t = (m[1] ?? m[2]).split("#")[0];
      if (!t || /^[a-z]+:/i.test(t)) continue;
      const abs = resolve(dirname(f), decodeURIComponent(t));
      if (existsSync(abs)) dirujuk.add(abs);
    }
  }
  const yatim = aktif.filter((f) => !dirujuk.has(resolve(f)) && rel(f) !== "AGENTS.md").map(rel).sort();
  cek("G. Tidak ada dokumen aktif yang yatim", yatim.length === 0, yatim.length ? `${yatim.length}: ${yatim.slice(0, 6).join(", ")}${yatim.length > 6 ? " …" : ""}` : "ok");
}

// ── H. inventaris arsip lengkap ───────────────────────────────────────────────
{
  const readme = join(ARSIP, "README.md");
  const isi = existsSync(readme) ? readFileSync(readme, "utf8") : "";
  const berkas = readdirSync(ARSIP, { withFileTypes: true })
    .filter((e) => (e.isFile() && e.name.endsWith(".md") && e.name !== "README.md") || e.isDirectory())
    .map((e) => e.name);
  const hilang = berkas.filter((n) => !isi.includes(n));
  cek("H. Setiap isi arsip terdaftar di inventaris arsip", hilang.length === 0, hilang.length ? `${hilang.length} tak terdaftar: ${hilang.slice(0, 5).join(", ")}` : `${berkas.length} entri terdaftar`);
}

// ── I. penanda status pada dokumen aktif ──────────────────────────────────────
{
  const tanpa = [];
  const POINTER = /^(CLAUDE\.md|\.clinerules)$/;                        // berkas pointer, bukan dokumen (aturan AGENTS §1)
  for (const f of aktif) {
    const r = rel(f);
    if (/^docs\/(history|arsip)\//.test(r)) continue;
    if (POINTER.test(r)) continue;
    const kepala = readFileSync(f, "utf8").split(/\r?\n/).slice(0, 16).join("\n");
    // AGENTS.md memakai baris PERAN, bukan blok baca (kalibrasi D2: berkas ini disuntik tiap request)
    if (r === "AGENTS.md") { if (!/disuntik otomatis|kontrak kerja/i.test(kepala)) tanpa.push(`${r} (tanpa baris peran)`); continue; }
    if (!/Status:|\*\*Status\*\*|Status\b/i.test(kepala)) tanpa.push(r);
  }
  cek("I. Dokumen aktif menyebut statusnya di bagian atas", tanpa.length === 0, tanpa.length ? `${tanpa.length} tanpa status: ${tanpa.slice(0, 5).join(", ")}` : "ok");
}

// ── J. indeks folder ─────────────────────────────────────────────────────────
{
  // `docs/` sendiri TIDAK dicek: routernya adalah AGENTS.md §3 (keputusan owner Q4=b — docs/README.md dihapus)
  const folder = ["docs/domain", "docs/operations", "docs/product", "docs/audit", "docs/history", "docs/rencana", "docs/arsip"];
  const tanpa = folder.filter((d) => !existsSync(join(ROOT, d, "README.md")) && !existsSync(join(ROOT, d, "index-cakupan.md")) && !existsSync(join(ROOT, d, "INDEX.md")));
  cek("J. Setiap folder dokumen punya berkas indeks", tanpa.length === 0, tanpa.length ? `tanpa indeks: ${tanpa.join(", ")}` : "ok");
}

// ── K. duplikasi judul H1 ─────────────────────────────────────────────────────
{
  const peta = new Map();
  for (const f of aktif) {
    const m = readFileSync(f, "utf8").match(/^#\s+(.+)$/m);
    if (!m) continue;
    const k = m[1].trim().toLowerCase();
    peta.set(k, [...(peta.get(k) || []), rel(f)]);
  }
  const dobel = [...peta.entries()].filter(([, v]) => v.length > 1);
  cek("K. Tidak ada judul H1 yang sama di dua dokumen aktif", dobel.length === 0, dobel.length ? dobel.map(([k, v]) => `"${k}" (${v.length})`).slice(0, 3).join("; ") : "ok");
}

const lulus = hasil.filter((h) => h.lulus).length;
const persen = (lulus / hasil.length) * 100;
console.log("=== KARTU SKOR KEKUATAN DOKUMENTASI KOST48 ===");
console.log(`dijalankan: ${new Date().toISOString().slice(0, 10)} · berkas aktif: ${aktif.length} · arsip: ${semuaMd.length - aktif.length}`);
console.log("");
for (const h of hasil) console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.nama}\n        ${h.detail}`);
console.log("");
console.log(`SKOR: ${lulus}/${hasil.length} pemeriksaan lulus = ${persen.toFixed(0)}%`);
process.exitCode = lulus === hasil.length ? 0 : 1;
