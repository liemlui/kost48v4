#!/usr/bin/env node
// ukur-serah-terima-docs.mjs — pemeriksa KESESUAIAN berkas serah-terima dengan keadaan repo.
//
// KENAPA ADA. Berkas serah-terima (docs/kerja/SERAH-TERIMA.md) adalah dokumen yang paling cepat
// basi dan paling mahal bila salah: sesi baru membacanya sebagai "keadaan terakhir", lalu bekerja
// di atas keadaan yang sudah tidak ada. Proyek sumber ide ini hanya menuliskan peringatan
// "ukur sendiri, jangan percaya tulisan ini" — peringatan itu tidak bisa gagal, jadi ia tidak
// menjaga apa pun. Di sini klaim keadaan diikat ke fakta yang DIPERIKSA:
//
//   1. `head` di blok @kost48-state harus sama dengan `git rev-parse HEAD` saat ini;
//   2. setiap berkas/skrip yang disebut blok itu harus benar-benar ada di disk;
//   3. skrip yang mengukur angka di blok itu harus ada.
//
// Bukan gate: menjalankannya tidak pernah memblokir perubahan dokumen lain (ia tidak dipanggil
// scripts/check-docs.mjs). Ia kartu keadaan, dipakai sebelum/menutup sesi — KONTRAK §11 invariant
// "Kesesuaian berkas serah-terima".
//
// Pakai:
//   node scripts/ukur-serah-terima-docs.mjs              periksa blok @kost48-state
//   node scripts/ukur-serah-terima-docs.mjs --keputusan  periksa register keputusan final
//   node scripts/ukur-serah-terima-docs.mjs --segarkan   perbarui `head` + `tanggal` dari repo
//
// Kode keluar: 0 = cocok · 1 = ada ketidakcocokan · 3 = tidak bisa diperiksa (git/berkas hilang).
import { readFileSync, writeFileSync, existsSync, mkdtempSync, openSync, closeSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BERKAS = join(ROOT, "docs", "kerja", "SERAH-TERIMA.md");
const KEPUTUSAN = join(ROOT, "docs", "KEPUTUSAN-OWNER.md");

// ── 1. Keadaan repo (git) ─────────────────────────────────────────────────────
// JEBAKAN YANG SUDAH TERBUKTI (default-dev §10a): sandbox menolak PIPA stdio pada child_process,
// sehingga `spawnSync(git, {encoding:"utf8"})` gagal EPERM dan alat ini melaporkan "git tidak
// tersedia" padahal git ada — salah tuduh, dan itu dilarang. Jalan keluarnya sama dengan
// scripts/ukur-kesegaran-docs.mjs: alihkan keluaran ke berkas sementara (tanpa pipa).
function gitLewatBerkas(args) {
  let dir = null;
  try {
    dir = mkdtempSync(join(tmpdir(), "kost48-git-"));
    const fOut = join(dir, "stdout");
    const fErr = join(dir, "stderr");
    const fdOut = openSync(fOut, "w");
    const fdErr = openSync(fErr, "w");
    let r;
    try {
      r = spawnSync("git", ["-C", ROOT, ...args], { stdio: ["ignore", fdOut, fdErr] });
    } finally {
      closeSync(fdOut);
      closeSync(fdErr);
    }
    return { error: r.error, status: r.status, stdout: readFileSync(fOut, "utf8"), stderr: readFileSync(fErr, "utf8") };
  } catch (e) {
    return { error: e, status: null, stdout: "", stderr: "" };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}
function git(args) {
  const normal = spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
  if (normal.error && normal.error.code === "EPERM") return gitLewatBerkas(args);
  return normal;
}
function gitHead() {
  const r = git(["rev-parse", "HEAD"]);
  if (r.error || r.status !== 0) return null;
  return (r.stdout || "").trim() || null;
}

// ── 2. Baca blok @kost48-state ────────────────────────────────────────────────
function bacaBlok(teks) {
  const m = teks.match(/```yaml\s*\n([\s\S]*?)```/);
  if (!m) return null;
  const blok = m[1];
  if (!/@kost48-state/.test(blok)) return null;
  const ambil = (kunci) => {
    const k = blok.match(new RegExp(`^\\s*${kunci}\\s*:\\s*(.+?)\\s*$`, "m"));
    return k ? k[1].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim() : null;
  };
  return {
    head: ambil("head"),
    tanggal: ambil("tanggal"),
    gate: ambil("gate"),
    kartu: ambil("kartu_kekuatan"),
    periksa: ambil("periksa"),
  };
}

// ── 3. Periksa keadaan serah-terima ───────────────────────────────────────────
// Semantik `head`: blok adalah POTRET, dan potret selalu diambil SEBELUM commit yang memuatnya
// ada — jadi blok tidak mungkin memuat hash commit-nya sendiri. Yang benar diperiksa bukan
// "sama persis", melainkan: hash di blok harus **HEAD sekarang atau nenek moyangnya**.
//   · nenek moyang  = potret dari commit yang lebih tua (normal; kesegarannya dilaporkan, bukan digagalkan)
//   · bukan keduanya= hash asing/berasal dari cabang lain → itu ketidakcocokan yang nyata
function periksaKeadaan() {
  if (!existsSync(BERKAS)) {
    console.error(`GAGAL  berkas serah-terima tidak ada: docs/kerja/SERAH-TERIMA.md`);
    console.error(`       KONTRAK §11 menuntut ia ada sebagai potret keadaan sesi terakhir.`);
    return 3;
  }
  const teks = readFileSync(BERKAS, "utf8");
  const blok = bacaBlok(teks);
  const masalah = [];
  const head = gitHead();

  if (!blok) {
    console.error("GAGAL  blok `@kost48-state` tidak ditemukan di docs/kerja/SERAH-TERIMA.md.");
    console.error("       Tanpa blok itu, klaim keadaan di berkas ini tidak bisa diperiksa — dan itu");
    console.error("       tepat masalah yang berkas ini dibuat untuk mencegahnya.");
    return 1;
  }

  let statusHead = "tidak diperiksa";
  if (!head) masalah.push("git tidak tersedia / bukan repo — blok tidak bisa diperiksa");
  else if (!blok.head) masalah.push("blok tidak memuat `head`");
  else if (blok.head === head) statusHead = "sama dengan HEAD";
  else {
    const anc = git(["merge-base", "--is-ancestor", blok.head, "HEAD"]);
    if (anc.status === 0) statusHead = `potret dari commit lebih tua (${blok.head.slice(0, 12)} nenek moyang HEAD)`;
    else masalah.push(`head tidak dikenali: blok ${blok.head.slice(0, 12)} bukan HEAD (${head.slice(0, 12)}) dan bukan nenek moyangnya`);
  }

  if (!blok.gate) masalah.push("blok tidak memuat `gate`");
  if (!blok.kartu) masalah.push("blok tidak memuat `kartu_kekuatan`");

  // setiap berkas/skrip yang disebut sebagai pengukur harus ada di disk
  const disebut = [...teks.matchAll(/`(scripts\/[\w./-]+\.mjs)`/g)].map((m) => m[1]);
  for (const s of new Set(disebut)) {
    if (!existsSync(join(ROOT, s))) masalah.push(`skrip yang disebut tidak ada: ${s}`);
  }

  console.log("=== UKUR SERAH-TERIMA (docs/kerja/SERAH-TERIMA.md) ===");
  console.log(`head di blok : ${blok.head ?? "(tidak ada)"}`);
  console.log(`head repo    : ${head ?? "(git tidak tersedia)"}`);
  console.log(`status head  : ${statusHead}`);
  console.log(`tanggal      : ${blok.tanggal ?? "(tidak ada)"}`);
  console.log(`gate         : ${blok.gate ?? "(tidak ada)"}`);
  console.log(`kartu        : ${blok.kartu ?? "(tidak ada)"}   <-- angka ini WAJIB diperbarui bila kartu berubah`);
  console.log(`skrip disebut: ${[...new Set(disebut)].join(", ") || "(tidak ada)"}`);
  console.log("");
  if (masalah.length === 0) {
    console.log("COCOK — blok @kost48-state sesuai keadaan repo.");
    console.log("Batas: yang diperiksa = head (HEAD atau nenek moyangnya) + keberadaan berkas;");
    console.log("BUKAN kebenaran isi potret, dan bukan usia potret — usia terlihat dari baris `status head`.");
    return 0;
  }
  for (const m of masalah) console.error(`TIDAK COCOK  ${m}`);
  console.error("");
  console.error("Perbaiki: ukur ulang keadaan (jalankan gate + kartu), lalu perbarui blok di");
  console.error("docs/kerja/SERAH-TERIMA.md — atau `node scripts/ukur-serah-terima-docs.mjs --segarkan`");
  console.error("untuk head+tanggal saja (angka gate/kartu tetap harus diukur manual).");
  return 1;
}

// ── 4. Periksa register keputusan final (KONTRAK §11 invariant) ────────────────
// Aturan: setiap keputusan yang mengikat wajib punya TANGGAL + SUMBER, supaya sesi berikutnya
// tidak perlu menebak kapan ia diambil dan atas dasar apa. Yang diperiksa: baris tabel keputusan.
function periksaKeputusan() {
  if (!existsSync(KEPUTUSAN)) {
    console.error("GAGAL  docs/KEPUTUSAN-OWNER.md tidak ada");
    return 3;
  }
  const baris = readFileSync(KEPUTUSAN, "utf8").split(/\r?\n/);
  const TANGGAL = /(20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\w*|20\d{2})/i;
  // Sumber = atribusi eksplisit. Dua bentuk sah, keduanya dipakai di register ini:
  //   (a) menunjuk pemilik/prompt/register lain ("KEPUTUSAN-OWNER", "owner", "prompt");
  //   (b) menunjuk ID keputusan (huruf besar + tanda hubung + angka: `D-01..D-31`, `AI-DECISION-25SEP`,
  //       `DOCS-CLEANUP`) — ID adalah bentuk atribusi paling kuat karena menunjuk entri lain.
  // Kata umum seperti "audit" atau "§" saja SENGAJA tidak diterima: pemeriksa yang selalu lulus tidak menjaga apa pun.
  const SUMBER = /(\[KEPUTUSAN|KEPUTUSAN-OWNER|owner|prompt|permintaan|\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b)/;
  // Tabel INVENTARIS/STATUS (daftar arsip atau daftar status keputusan) bukan register keputusan baru:
  // barisnya memuat tanggal + topik tanpa atribusi, dan memang bukan keputusan. Dikecualikan dengan
  // alasan tertulis — kalibrasi yang sama dengan R1/R8 di gate: pemeriksa tidak boleh menuduh yang benar.
  const KEPALA_ARSIP = /Bagian di arsip|Topik|Status keputusan/i;
  const tanpa = [];
  let kandidat = 0;
  let dilewati = 0;
  // Konteks tabel: baris tabel tidak berdiri sendiri. Tabel yang kepalanya menyatakan dirinya
  // INVENTARIS/STATUS (mis. "Bagian di arsip | Topik", "Status keputusan (berlaku / digantikan)")
  // memang hanya memuat tanggal + topik tanpa atribusi — menuntut "sumber" di situ salah alamat.
  // Pemeriksa WAJIB sadar konteks, kalau tidak ia menuduh yang benar (kalibrasi yang sama dengan R1/R8
  // di gate). Kepala tabel ditemukan dengan menelusuri ke atas sampai baris non-tabel.
  let kepalaTabel = null;
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    if (!/^\s*\|/.test(b)) { if (b.trim() !== "") kepalaTabel = null; continue; }  // di luar tabel
    if (kepalaTabel === null) { kepalaTabel = b; continue; }                        // baris pertama tabel = kepala
    if (/^\s*\|[\s:|-]+\|\s*$/.test(b)) continue;                                    // garis pemisah
    if (KEPALA_ARSIP.test(kepalaTabel)) { dilewati++; continue; }                    // indeks arsip, bukan keputusan
    const sel = b.split("|").map((s) => s.trim()).filter(Boolean);
    if (sel.length < 2) continue;
    if (/^(tanggal|no|nomor|id|kode|hal|aspek|butir|#)$/i.test(sel[0])) continue;  // kepala tabel
    kandidat++;
    if (!TANGGAL.test(b)) { tanpa.push(`L${i + 1} — tanpa tanggal: ${b.trim().slice(0, 90)}`); continue; }
    if (!SUMBER.test(b)) tanpa.push(`L${i + 1} — tanpa sumber: ${b.trim().slice(0, 90)}`);
  }
  console.log("=== UKUR REGISTER KEPUTUSAN FINAL (docs/KEPUTUSAN-OWNER.md) ===");
  console.log(`baris keputusan diperiksa: ${kandidat}`);
  console.log(`baris indeks arsip dilewati: ${dilewati} (tanggal+topik saja, bukan keputusan)`);
  console.log(`tanpa tanggal/sumber      : ${tanpa.length}`);
  console.log("");
  if (tanpa.length === 0) {
    console.log("LULUS — setiap baris keputusan punya tanggal dan sumber.");
    console.log("Batas: yang diperiksa adalah BENTUK baris (tanggal + atribusi), bukan kebenaran keputusannya.");
    return 0;
  }
  for (const t of tanpa.slice(0, 20)) console.error(`  ${t}`);
  if (tanpa.length > 20) console.error(`  … ${tanpa.length - 20} baris lain`);
  console.error("");
  console.error("Register yang tidak bertanggal & tanpa atribusi tidak bisa dirujuk, jadi tidak bisa");
  console.error("dikunci sebagai 'final, jangan ditanya lagi' (KONTRAK §8). Ini temuan, bukan gate:");
  console.error("lengkapi tanggal + sumbernya saat baris itu berikutnya disentuh.");
  return 1;
}

// ── 5. Mode perintah ──────────────────────────────────────────────────────────
const arg = process.argv[2];
if (arg === "--keputusan") process.exit(periksaKeputusan());
if (arg === "--segarkan") {
  if (!existsSync(BERKAS)) {
    console.error("GAGAL  berkas serah-terima tidak ada");
    process.exit(3);
  }
  const head = gitHead();
  if (!head) {
    console.error("GAGAL  git tidak tersedia — tidak bisa menyegarkan head");
    process.exit(3);
  }
  const tanggal = new Date().toISOString().slice(0, 10);
  const teks = readFileSync(BERKAS, "utf8");
  const baru = teks
    .replace(/^(head:\s*)\S+/m, `$1${head}`)
    .replace(/^(tanggal:\s*)\S+/m, `$1${tanggal}`);
  if (baru === teks) {
    console.log("Tidak ada yang berubah (head & tanggal sudah sesuai).");
    console.log("Ingat: angka `gate` dan `kartu_kekuatan` TIDAK ikut disegarkan — ukur manual.");
    process.exit(0);
  }
  writeFileSync(BERKAS, baru, "utf8");
  console.log(`Disegarkan: head=${head.slice(0, 12)} tanggal=${tanggal}`);
  console.log("Angka `gate` dan `kartu_kekuatan` TIDAK ikut disegarkan — ukur manual.");
  process.exit(0);
}
process.exit(periksaKeadaan());
