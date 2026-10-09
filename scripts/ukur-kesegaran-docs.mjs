#!/usr/bin/env node
// FILE: scripts/ukur-kesegaran-docs.mjs — kartu skor KESEGARAN ISI dokumentasi KOST48.
//
// Spesifikasi: docs/rencana/ALAT-UKUR-KESEGARAN-DOCS.md §2–§6 (metrik · rujukan · batas · bentuk keluaran · kriteria selesai).
// Jalankan dari akar repo:  node scripts/ukur-kesegaran-docs.mjs [akar-repo]
//
// Kode keluar: 0 = kartu tercetak (angka ada) · 3 = MENOLAK menghasilkan angka (git tidak ada / bukan repo git /
// repo shallow). 3 sengaja BUKAN "lulus": kartu ini tidak pernah mengaku sehat ketika ia tidak bisa mengukur.
//
// Sifat alat (§5): KARTU SKOR, BUKAN GATE. Exit 0 walau banyak kandidat usang; tidak dipanggil gate mana pun;
// tidak menambah dependency (AGENTS §2); tanpa jaringan; deterministik; satu kali jalan.
//
// Metrik (§2), untuk setiap dokumen aktif D:
//   t_doc(D)      = waktu commit terakhir yang menyentuh D
//   t_ref(A)      = waktu commit terakhir yang menyentuh artefak A yang DIRUJUK D
//   KANDIDAT USANG bila ada A dengan t_ref(A) > t_doc(D)    (usia_rujukan = selisih hari ke t_ref termuda)
//   % segar       = dokumen berujukan TANPA rujukan lebih muda / dokumen dengan >=1 rujukan terselesaikan
//   % cakupan     = dokumen aktif dengan >=1 rujukan terselesaikan / seluruh dokumen aktif
//   Dokumen tanpa rujukan terselesaikan TIDAK dihitung "segar" (ketidaktahuan bukan kesehatan).
//
// Rujukan yang dihitung (§3, bertahap):
//   tahap 1  path kode di dalam backtick (`backend/…`, `frontend/…`, `scripts/…`) — cek keberadaan relatif akar repo
//   tahap 2  tautan markdown relatif ke berkas kode (bukan .md)
//   tahap 3  nama berkas tanpa path (`pricing.helper.ts`) via indeks berkas tracked;
//            >1 kandidat => UNKNOWN (tidak diselesaikan, tidak pernah dianggap segar)
//   tahap 4  simbol/fungsi/konstanta => BELUM diukur; dicetak sebagai UNKNOWN, tidak dikira-kira
//
// Kalibrasi v1.0 (2026-10-07, batch UKUR-KESEGARAN) — keputusan yang diambil agar angka pertama tidak menyesatkan:
//   1. Blok kode berpagar (``` / ~~~) dinetralkan sebelum rujukan dipanen. Isinya sering contoh sintaks/keluaran
//      perintah, bukan rujukan hidup — pelajaran yang sama sudah dipakai gate R2 (kalibrasi v1.4: contoh di dalam
//      backtick BUKAN tautan). Isi pagar karena itu masuk daftar "belum diukur", bukan dihitung sebagai rusak.
//   2. Tautan markdown diselesaikan relatif-ke-berkas lebih dulu, lalu relatif-akar repo sebagai cadangan.
//      Sebabnya terukur (audit 2026-10-07 §6): label sering ditulis relatif akar repo, dan resolusi satu arah
//      melaporkan 190 "temuan" yang mayoritas palsu.
//   3. Rujukan yang tidak bisa diselesaikan TIDAK dianggap segar dan TIDAK dianggap rusak: ia masuk cakupan
//      sebagai tidak terselesaikan, dengan sebabnya dicetak (tidak ada di repo / ambigu / belum di-commit).
//      Kelas "tidak ada di repo" sengaja tidak disebut "rusak": sebagian sah menunjuk path di luar repo
//      (layout bundel deploy, nama dependency npm, berkas bawaan Node) — lihat catatan di daftar rinciannya.
//   4. Kartu bertanggal (docs/history/**, docs/audit/**) dan catatan rencana TETAP masuk angka utama, karena
//      spesifikasi §2 berbicara tentang "setiap dokumen aktif" dan alat ini tidak mempersempit cakupan sepihak.
//      Agar angkanya tidak salah dibaca, keluaran menambahkan RINCIAN PER KELAS sebagai informasi tambahan —
//      bukan pengganti angka utama. Bila kelas kartu bertanggal terbukti mendominasi, itu bahan kalibrasi
//      batch berikutnya (keputusan owner), bukan perubahan yang dilakukan diam-diam di sini.
//   5. Commit merge tidak menampilkan daftar berkas (`git log --name-only` bawaan), sehingga berkas yang hanya
//      berubah karena resolusi konflik merge diatribusikan ke commit sebelumnya. Dicatat sebagai batas.
//   6. Rujukan FOLDER (`scripts/`, `backend/src`) dilewati: ia tidak punya satu t_doc yang bermakna, dan
//      melewatinya menurunkan cakupan (arah yang jujur), bukan menaikkan kesegaran.
//
// Portabilitas sandbox: jalur normal menangkap keluaran git lewat pipa; bila lingkungan menolak pipa stdio
// (Node `child_process` gagal EPERM), keluaran dialihkan ke berkas sementara TANPA pipa. Kegagalan keduanya
// = MENOLAK (exit 3), bukan angka kosong.
//
// Yang TIDAK diperiksa (jangan dianggap sudah dijaga): isi/kebenaran pernyataan dokumen, tahap 4 (simbol),
// arsip beku (docs/arsip/**), zona .design-audit/.docs-legacy/.audit-map, artefak generated, dan berkas
// di luar glob dokumen aktif. "Segar" berarti "tidak ada rujukan kode yang lebih muda dari dokumennya",
// BUKAN "isinya benar".
import { readdirSync, readFileSync, existsSync, statSync, mkdtempSync, openSync, closeSync, rmSync } from "node:fs";
import { join, relative, resolve, dirname, sep, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const argRoot = process.argv.slice(2).find((a) => !a.startsWith("--"));
const ROOT = argRoot ? resolve(argRoot) : resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── penyaring rujukan ────────────────────────────────────────────────────────
// Prefix kode yang dihitung di tahap 1 (spesifikasi §3) — daftar ini sengaja eksplisit dan sempit;
// memperluasnya (deploy/, firmware/, design/, ...) adalah kalibrasi tersendiri, bukan tebakan di sini.
const PREFIX_KODE = ["backend/", "frontend/", "scripts/"];
const EXT_KODE = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "prisma", "sql", "ps1", "sh", "bash",
  "yml", "yaml", "css", "scss", "less", "html", "py", "ino", "toml",
]);
const RE_NAMA_BERKAS = /^[A-Za-z0-9_.\-]+\.[A-Za-z0-9]+$/;
// Token yang memuat salah satu karakter ini adalah pola/contoh (`backend/…`, `src/**`, `foo.{ts,tsx}`),
// bukan rujukan hidup — kaidah yang sama dengan gate R6.
const RE_POLA = /[*{<>…$|'"\s]/;
const SKIP_DIR = /[\\/](node_modules|dist|build|coverage|\.git|\.design-audit|\.docs-legacy|\.audit-map|\.dsh|\.dsh-editor|\.reasonix|\.audit-runtime|\.audit-home|\.agents|\.claude|kost48-deploy-bundled)[\\/]/;
// Zona "jangan dibaca" (§4.4) — konsisten dengan AGENTS §6, KONTRAK §4, dan R6/R9/R10/R11.
const ZONA_DIKECUALIKAN = /[\\/]docs[\\/](arsip|archieve|audit-map)[\\/]|\.design-audit|\.docs-legacy|\.audit-map/;

const rel = (p) => relative(ROOT, p).split(sep).join("/");
const hari = (ms) => ms / 86400000;
const tgl = (iso) => (iso ? iso.slice(0, 10) : "?");

// ── 0. penjaga: git ada, repo cukup dalam ────────────────────────────────────
// Portabilitas: jalur normal menangkap keluaran git lewat pipa stdio. Di lingkungan terkekang yang MELARANG
// pipa (Node child_process gagal dengan EPERM — batas sandbox, bukan batas izin), keluaran dialihkan ke
// berkas sementara tanpa pipa. Alat tidak boleh diam-diam kehilangan angka hanya karena mekanisme pipa ditolak;
// sebaliknya ia juga tidak boleh mengarang angka, jadi kegagalan keduanya = MENOLAK (exit 3).
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
  const normal = spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (!normal.error) return normal;
  if (normal.error.code === "EPERM") return gitLewatBerkas(args);
  return normal;
}
function tolak(sebab, petunjuk) {
  console.log("=== KARTU SKOR KESEGARAN ISI DOKUMENTASI KOST48 ===");
  console.log("");
  console.log("MENOLAK MENGHASILKAN ANGKA.");
  console.log(`sebab   : ${sebab}`);
  console.log(`akibat  : tidak ada % segar, % cakupan, maupun daftar peringkat yang dicetak —`);
  console.log("          angka dari riwayat git yang tidak lengkap akan salah, dan angka salah lebih buruk");
  console.log("          daripada tidak ada angka (spesifikasi §4 butir 3).");
  if (petunjuk) console.log(`perbaiki: ${petunjuk}`);
  process.exit(3);
}

{
  const r = git(["rev-parse", "--is-inside-work-tree"]);
  if (r.error) tolak(`perintah \`git\` tidak bisa dijalankan (${r.error.code ?? r.error.message ?? r.error}) — pipa stdio maupun pengalihan ke berkas gagal`, "pastikan `git` ada di PATH dan direktori sementara bisa ditulis");
  if (r.status !== 0) tolak("path yang ditunjuk bukan repo git (`git rev-parse --is-inside-work-tree` gagal)", "jalankan dari akar repo, atau berikan path repo sebagai argumen");
  if ((r.stdout || "").trim() !== "true") tolak("path yang ditunjuk bukan work tree git", "jalankan dari akar repo");
  const s = git(["rev-parse", "--is-shallow-repository"]);
  if (s.status !== 0) tolak("status shallow repo tidak bisa dibaca (`git rev-parse --is-shallow-repository` gagal)");
  if ((s.stdout || "").trim() === "true") tolak("repo adalah shallow clone: riwayat commit terpotong", "jalankan `git fetch --unshallow` lalu ulangi");
}
const HEAD = (git(["rev-parse", "--short", "HEAD"]).stdout || "").trim() || "?";

// ── 1. dokumen aktif + t_doc ─────────────────────────────────────────────────
function jalan(dir, keluar) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (SKIP_DIR.test(p) || ZONA_DIKECUALIKAN.test(p)) continue;
    if (e.isDirectory()) jalan(p, keluar);
    else if (e.name.endsWith(".md")) keluar.push(p);
  }
  return keluar;
}
const semuaMd = existsSync(join(ROOT, "docs")) ? jalan(join(ROOT, "docs"), []) : [];
for (const n of readdirSync(ROOT)) if (n.endsWith(".md")) semuaMd.push(join(ROOT, n));
const aktif = semuaMd.filter((p) => !/^docs[\\/](arsip|archieve)[\\/]/.test(rel(p)));

// Peta t_ref: satu kali lintasan git log (paling murah; 855 commit ≈ 2 dtk di mesin ini),
// nama berkas pertama yang terlihat untuk sebuah path = commit terbaru yang menyentuhnya.
// `nonMd` mencatat FAKTA daftar berkas commit (apakah commit itu juga mengubah berkas non-markdown) —
// bukan penilaian "kerapian vs pembaruan isi" (spesifikasi §4 butir 2 melarang menebak itu).
const petaSentuk = new Map(); // path → { iso, subjek, nonMd }
{
  const log = git(["log", "--no-renames", "--format=\u001e%cI\u0009%s", "--name-only"]);
  if (log.error || typeof log.stdout !== "string") tolak("`git log` gagal dijalankan");
  let kini = null;
  for (const baris of log.stdout.split(/\r?\n/)) {
    if (baris.startsWith("\u001e")) {
      const [iso, ...sisa] = baris.slice(1).split("\t");
      kini = { iso, subjek: sisa.join("\t").trim(), nonMd: false };
      continue;
    }
    const p = baris.trim();
    if (!p || !kini) continue;
    if (!p.endsWith(".md")) kini.nonMd = true;
    if (!petaSentuk.has(p)) petaSentuk.set(p, kini);
  }
}
const tDok = (r) => petaSentuk.get(r) || null;

// ── 2. indeks berkas tracked (tahap 3) ───────────────────────────────────────
const berkasTracked = (() => {
  const ls = git(["ls-files"]);
  const arr = (ls.stdout || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const perNama = new Map();
  for (const p of arr) {
    const n = basename(p);
    perNama.set(n, [...(perNama.get(n) || []), p]);
  }
  return perNama;
})();

// ── 3. panen rujukan per dokumen (§3 tahap 1–3) ──────────────────────────────
function periksaPath(p) {
  // p selalu relatif akar repo, tanpa fragmen
  const abs = join(ROOT, ...p.split("/"));
  // "tidak ada di repo" sengaja TIDAK ditulis "rusak": sebagian rujukan sah menunjuk path DI LUAR repo —
  // path di dalam bundel deploy (`scripts/seed-owner.js` dibuat make-deploy L515), nama dependency npm
  // (`tesseract.js`), atau berkas bawaan Node (`npm.ps1`). Alat ini tidak bisa membedakannya; ia hanya
  // melaporkan bahwa rujukan itu TIDAK BISA DISELESAIKAN, dan karena itu tidak pernah dianggap segar.
  if (!existsSync(abs)) return { status: "tidak ada di repo (bundel/generated/dependency/luar repo, atau rujukan rusak)" };
  if (statSync(abs).isDirectory()) return { status: "bukan berkas kode (folder)" };
  if (!petaSentuk.has(p)) return { status: "ada di disk tetapi belum di-commit" };
  return { status: "ok", path: p };
}

function panenRujukan(f) {
  const teks = readFileSync(f, "utf8");
  const rujukan = [];
  const tambah = (jenis, target, hasil, nomorBaris) => rujukan.push({ jenis, target, hasil, baris: nomorBaris });

  // Blok berpagar dinetralkan PER BARIS (kalibrasi 1) — nomor baris asli tetap dipakai di laporan,
  // supaya rujukan yang gagal diselesaikan bisa ditunjuk tepat dan diperiksa manusia.
  let dalamPagar = false;
  teks.split(/\r?\n/).forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) { dalamPagar = !dalamPagar; return; }
    if (dalamPagar) return;

    // (b) rentang kode inline dulu, lalu dinetralkan supaya contoh `[teks](target)` tidak jadi tautan
    const kode = [];
    const netral = l.replace(/`([^`\n]+)`/g, (_, isiKode) => { kode.push(isiKode); return "``"; });
    for (const mentah of kode) {
      const p = mentah.trim().replace(/[.,;:)\]]+$/, "");
      if (!p || RE_POLA.test(p)) continue;
      if (PREFIX_KODE.some((pre) => p.startsWith(pre))) {
        // Hanya segmen terakhir yang BERBENTUK BERKAS yang dihitung; rujukan folder (`scripts/`, `backend/src`)
        // dilewati karena tidak punya t_doc tunggal — dan rujukan folder tidak pernah dihitung "segar" pula.
        const seg = p.split("/").pop() ?? "";
        if (!/^[A-Za-z0-9_.\-]+\.[A-Za-z0-9]+$/.test(seg)) continue;
        tambah("tahap-1 backtick", p, periksaPath(p), i + 1);
        continue;
      }
      if (!p.includes("/") && RE_NAMA_BERKAS.test(p) && EXT_KODE.has(p.split(".").pop().toLowerCase())) {
        const kandidat = berkasTracked.get(p) || [];
        if (kandidat.length === 1) tambah("tahap-3 nama berkas", p, periksaPath(kandidat[0]), i + 1);
        else if (kandidat.length > 1) tambah("tahap-3 nama berkas", p, { status: `ambigu (${kandidat.length} kandidat)` }, i + 1);
        else tambah("tahap-3 nama berkas", p, { status: "tidak ada di repo (bundel/generated/dependency/luar repo, atau rujukan rusak)" }, i + 1);
      }
    }

    // (c) tautan markdown ke berkas kode — relatif-berkas dulu, lalu relatif akar repo (kalibrasi 2)
    for (const m of netral.matchAll(/\]\(<([^>]+)>\)|\]\(([^)\s]+)\)/g)) {
      const t = m[1] ?? m[2];
      const [tanpaFrag] = t.split("#");
      if (!tanpaFrag || /^[a-z]+:/i.test(tanpaFrag)) continue;
      const p = decodeURIComponent(tanpaFrag);
      if (p.endsWith("/")) continue;
      const ekst = p.split(".").pop().toLowerCase();
      if (!EXT_KODE.has(ekst)) continue;
      let relPath = null;
      const keBerkas = relative(ROOT, resolve(dirname(f), p)).split(sep).join("/");
      if (keBerkas && !keBerkas.startsWith("..") && existsSync(join(ROOT, ...keBerkas.split("/")))) relPath = keBerkas;
      else {
        const keAkar = p.replace(/^\.\//, "");
        if (existsSync(join(ROOT, ...keAkar.split("/")))) relPath = keAkar;
      }
      if (relPath && !relPath.startsWith("..")) tambah("tahap-2 tautan", p, periksaPath(relPath), i + 1);
      else tambah("tahap-2 tautan", p, { status: "tidak ada di repo (bundel/generated/dependency/luar repo, atau rujukan rusak)" }, i + 1);
    }
  });
  return rujukan;
}

const kelas = (r) => {
  if (!r.includes("/")) return "akar (kontrak/pointer)";
  if (/^docs\/(history|audit)\//.test(r)) return "kartu bertanggal";
  if (/^docs\/rencana\//.test(r)) return "catatan rencana";
  if (/^docs\/(domain|operations|product)\//.test(r)) return "rujukan domain/operasi/produk";
  return "berkas tangga/rujukan docs";
};
const TANGGA = new Set(["AGENTS.md", "CLAUDE.md", "docs/KONTRAK.md", "docs/ANTREAN.md", "docs/PETA-KODE.md"]);
const dugaanTindakan = (r) => {
  if (/^docs\/(history|audit)\//.test(r)) return "kartu bertanggal: periksa apakah klaimnya masih berlaku; turunkan/perbarui bila dipakai sebagai rujukan hidup";
  if (TANGGA.has(r)) return "berkas tangga: perbarui isinya ATAU turunkan angkanya jadi potret bertanggal";
  if (/^docs\/rencana\//.test(r)) return "catatan rencana: tandai sudah dieksekusi / turunkan jadi riwayat";
  return "periksa bagian yang merujuknya: perbarui isi atau tandai UNKNOWN";
};

// ── 4. hitung metrik ─────────────────────────────────────────────────────────
const barisDok = [];
const tanpaCommit = [];
const tanpaRujukan = [];   // tanpa rujukan terselesaikan → masuk cakupan sebagai tidak terselesaikan
for (const f of aktif) {
  const r = rel(f);
  const td = tDok(r);
  const refs = panenRujukan(f);
  const selesai = refs.filter((x) => x.hasil.status === "ok");
  if (!td) { tanpaCommit.push({ r, refs: refs.length, selesai: selesai.length, alasan: "dokumen belum di-commit (t_doc tidak ada)" }); continue; }
  if (selesai.length === 0) {
    const sebab = refs.length === 0 ? "tanpa rujukan kode yang bisa diselesaikan (0 rujukan terdeteksi)"
      : `${refs.length} rujukan terdeteksi, 0 terselesaikan (${[...new Set(refs.map((x) => x.hasil.status))].join(" · ")})`;
    tanpaRujukan.push({ r, alasan: sebab });
    barisDok.push({ r, td, selesai: 0, termuda: null, jarak: null, usang: false, refs });
    continue;
  }
  let termuda = null;
  for (const x of selesai) {
    const t = tDok(x.hasil.path);
    if (!termuda || Date.parse(t.iso) > Date.parse(termuda.t.iso)) termuda = { t, ref: x.hasil.path, jenis: x.jenis };
  }
  const jarak = hari(Date.parse(termuda.t.iso) - Date.parse(td.iso));
  barisDok.push({ r, td, selesai: selesai.length, termuda, jarak, usang: jarak > 0, refs });
}
const berujukan = barisDok.filter((b) => b.selesai > 0);
const usang = berujukan.filter((b) => b.usang).sort((a, b) => b.jarak - a.jarak);
// Pelindung pembagian nol: repo/taksonomi yang tidak menyelesaikan satu rujukan pun tidak boleh
// mencetak "NaN%" — itu angka palsu. Ia dilaporkan sebagai "—" (tidak bisa dihitung), bukan 0%.
const cakupan = aktif.length ? (berujukan.length / aktif.length) * 100 : null;
const segar = berujukan.length ? ((berujukan.length - usang.length) / berujukan.length) * 100 : null;
const persen = (x) => (x === null ? "— (tidak bisa dihitung: tidak ada rujukan terselesaikan)" : `${x.toFixed(0)}%`);

// ── 5. keluaran ──────────────────────────────────────────────────────────────
console.log("=== KARTU SKOR KESEGARAN ISI DOKUMENTASI KOST48 ===");
console.log(`potret     : ${new Date().toISOString().slice(0, 10)} · HEAD ${HEAD} · akar ${ROOT}`);
console.log(`dokumen    : aktif ${aktif.length} (${aktif.filter((p) => !rel(p).includes("/")).length} di akar) · arsip & zona jangan-dibaca dikecualikan`);
console.log("pertanyaan : apakah isi dokumen masih cocok dengan kode hari ini? (\"segar\" = tidak ada rujukan kode yang lebih muda dari dokumennya)");
console.log("sifat      : KARTU SKOR, BUKAN GATE — exit 0 walau banyak kandidat usang; tidak memblokir pekerjaan");

// pohon kerja kotor: potret = commit terakhir, bukan isi disk
{
  const st = git(["status", "--porcelain"]);
  const baris = (st.stdout || "").split(/\r?\n/).filter(Boolean);
  const aktifSet = new Set(aktif.map(rel));
  const kotor = baris.map((l) => l.slice(3).replace(/^"|"$/g, "")).filter((p) => aktifSet.has(p));
  if (kotor.length) console.log(`peringatan : pohon kerja kotor — ${kotor.length} dokumen aktif menyimpang dari HEAD, jadi angka ini mencerminkan COMMIT terakhir, bukan isi disk`);
}

console.log("");
console.log("── ANGKA ───────────────────────────────────────────────────────────────────");
console.log(`% cakupan : ${persen(cakupan)}  (${berujukan.length}/${aktif.length} dokumen aktif punya >=1 rujukan terselesaikan)`);
console.log(`% segar   : ${persen(segar)}  (${berujukan.length - usang.length}/${berujukan.length} dokumen berujukan tanpa rujukan yang lebih muda)`);
if (cakupan === null || cakupan < 50) {
  console.log("CATATAN   : % cakupan < 50% → % segar TIDAK BOLEH dipresentasikan sebagai kesimpulan, hanya sebagai indikasi (spesifikasi §2).");
} else {
  console.log("CATATAN   : % cakupan >= 50% → % segar boleh dibaca sebagai indikasi yang didukung; ia tetap bukan vonis benar/salah isi.");
}
console.log(`tak dinilai: ${tanpaRujukan.length} dokumen tanpa rujukan terselesaikan (dihitung sebagai TIDAK terselesaikan di cakupan) · ${tanpaCommit.length} dokumen belum di-commit`);
{
  // Fakta dari daftar berkas commit — BUKAN penilaian kerapian vs pembaruan isi (§4 butir 2).
  const hanyaMd = berujukan.filter((b) => b.td && b.td.nonMd === false).length;
  console.log(`catatan   : ${hanyaMd}/${berujukan.length} dokumen berujukan tersentuh terakhir oleh commit yang HANYA mengubah berkas markdown`);
  console.log(`            → untuk ${hanyaMd} dokumen itu, perbandingan "dokumen vs kode" bersandar pada sentuhan dokumentasi`);
  console.log(`              saja (masih bisa berarti pembaruan isi — alat tidak menilainya); ${berujukan.length - hanyaMd} sisanya tersentuh`);
  console.log("              commit yang juga mengubah berkas non-markdown.");
}

console.log("");
console.log("── RINCIAN PER KELAS (informasi tambahan, bukan pengganti angka di atas) ───");
{
  const grup = new Map();
  for (const b of barisDok) {
    const k = kelas(b.r);
    if (!grup.has(k)) grup.set(k, []);
    grup.get(k).push(b);
  }
  const lebar = Math.max(9, ...[...grup.keys()].map((k) => k.length));
  console.log(`${"kelas".padEnd(lebar)}  aktif  berujukan  usang  % segar`);
  for (const [k, arr] of [...grup.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const ber = arr.filter((b) => b.selesai > 0);
    const us = ber.filter((b) => b.usang).length;
    const pct = ber.length ? `${(((ber.length - us) / ber.length) * 100).toFixed(0)}%` : "—";
    console.log(`${k.padEnd(lebar)}  ${String(arr.length).padStart(5)}  ${String(ber.length).padStart(9)}  ${String(us).padStart(5)}  ${pct}`);
  }
}

console.log("");
console.log(`── DAFTAR PERINGKAT: ${usang.length} KANDIDAT USANG (rujukan termuda paling jauh di atas) ──`);
console.log("   Kolom `jarak` = usia_rujukan: selisih hari antara rujukan termuda dan commit terakhir dokumen.");
console.log("   Subjek commit dokumen dicetak apa adanya supaya manusia bisa menilai apakah sentuhan terakhir itu");
console.log("   \"kerapian\" atau \"pembaruan isi\" — alat ini TIDAK menebaknya (spesifikasi §4 butir 2).");
console.log("");
if (usang.length === 0) console.log("   (tidak ada kandidat usang pada potret ini)");
const fmtJarak = (h) => (h < 1 ? `${h.toFixed(1).padStart(6)} hari (${(h * 24).toFixed(1)} jam)` : `${h.toFixed(1).padStart(6)} hari`);
for (const b of usang) {
  console.log(`   ${fmtJarak(b.jarak)}  ${b.r}`);
  console.log(`             rujukan termuda : ${tgl(b.termuda.t.iso)}  ${b.termuda.ref}  [${b.termuda.jenis}]`);
  console.log(`             dokumen commit  : ${tgl(b.td.iso)}  ${b.td.subjek.slice(0, 96)}`);
  console.log(`             dugaan tindakan : ${dugaanTindakan(b.r)}`);
}
if (usang.length && usang[0].jarak < 1) {
  console.log("");
  console.log("   Baca hati-hati: jarak terjauh di potret ini < 1 hari, jadi yang terlihat adalah URUTAN COMMIT");
  console.log("   dalam satu hari yang sama — bukan penyimpangan isi yang menumpuk berhari-hari/bulan.");
}

console.log("");
console.log("── SEBAB TIDAK TERSELESAIKAN (dihitung di cakupan; tidak pernah dianggap segar) ──");
{
  const hitung = new Map();
  for (const b of barisDok) for (const x of b.refs) if (x.hasil.status !== "ok") hitung.set(x.hasil.status, (hitung.get(x.hasil.status) || 0) + 1);
  // rujukan pada dokumen yang belum di-commit tidak masuk barisDok → dihitung dari daftar terpisah
  for (const b of tanpaCommit) {
    const refs = panenRujukan(join(ROOT, ...b.r.split("/")));
    for (const x of refs) if (x.hasil.status !== "ok") hitung.set(x.hasil.status, (hitung.get(x.hasil.status) || 0) + 1);
  }
  if (hitung.size === 0) console.log("   (tidak ada rujukan yang gagal diselesaikan pada potret ini)");
  for (const [s, n] of [...hitung.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(5)}  ${s}`);
  if (tanpaRujukan.length) {
    console.log("");
    console.log(`   ${tanpaRujukan.length} dokumen dengan 0 rujukan terselesaikan:`);
    for (const b of tanpaRujukan.slice(0, 12)) console.log(`     - ${b.r} — ${b.alasan}`);
    if (tanpaRujukan.length > 12) console.log(`     … ${tanpaRujukan.length - 12} lainnya`);
  }
  if (tanpaCommit.length) {
    console.log("");
    console.log(`   ${tanpaCommit.length} dokumen belum di-commit (tidak bisa dinilai sama sekali, dikeluarkan dari kedua angka):`);
    for (const b of tanpaCommit.slice(0, 12)) console.log(`     - ${b.r} (${b.refs} rujukan terdeteksi)`);
  }
}

console.log("");
console.log("── SUBJEK COMMIT TERAKHIR TIAP DOKUMEN (bahan penilaian manusia, spesifikasi §4 butir 2) ──");
console.log("   `non-md` = apakah commit terakhir dokumen itu juga mengubah berkas non-markdown.");
console.log("   `berbagi` = berapa dokumen aktif (termasuk dokumen ini) yang commit terakhirnya SAMA (satu batch).");
console.log("   Kolom non-md sengaja tidak dipakai sebagai penanda \"kerapian\": batch dokumentasi juga menyentuh");
console.log("   berkas non-.md (mis. skrip gate), jadi ia fakta tentang commit, bukan vonis tentang isi dokumen.");
console.log("");
{
  const kunciBatch = (td) => `${td.iso}|${td.subjek}`;
  const hitungBatch = new Map();
  for (const b of barisDok) hitungBatch.set(kunciBatch(b.td), (hitungBatch.get(kunciBatch(b.td)) || 0) + 1);
  const urutDok = [...barisDok].sort((a, b) => String(a.r).localeCompare(String(b.r)));
  const lebarR = Math.max(...urutDok.map((b) => b.r.length), 8);
  for (const b of urutDok) {
    const tanda = b.selesai === 0 ? "—" : b.usang ? "USANG" : "segar";
    const bag = hitungBatch.get(kunciBatch(b.td));
    console.log(`   ${tgl(b.td.iso)}  ${String(b.td.nonMd ? "ya" : "tidak").padEnd(5)}  ${String(bag).padStart(3)} dok  ${tanda.padEnd(5)}  ${b.r.padEnd(lebarR)}  ${b.td.subjek.slice(0, 70)}`);
  }
  const unik = hitungBatch.size;
  const terbesar = Math.max(...hitungBatch.values());
  console.log("");
  console.log(`   commit terakhir: ${unik} commit unik untuk ${barisDok.length} dokumen; batch terbesar menyentuh ${terbesar} dokumen sekaligus.`);
  console.log("   Bila satu batch mendominasi, t_doc nyaris seragam — angka % segar lalu mengukur URUTAN commit,");
  console.log("   bukan kebenaran isi. Bandingkan subjeknya dengan kode yang dirujuk sebelum menyimpulkan apa pun.");
}

console.log("");
console.log("── RINCIAN RUJUKAN YANG GAGAL DISELESAIKAN (dihitung di cakupan; tidak pernah dianggap segar) ──");
{
  const gagal = [];
  for (const b of barisDok) for (const x of b.refs) if (x.hasil.status !== "ok") gagal.push({ r: b.r, ...x });
  for (const b of tanpaCommit) {
    for (const x of panenRujukan(join(ROOT, ...b.r.split("/")))) if (x.hasil.status !== "ok") gagal.push({ r: b.r, ...x });
  }
  if (gagal.length === 0) console.log("   (tidak ada)");
  for (const g of gagal) console.log(`   ${g.r}:${g.baris}  \`${g.target}\`  [${g.jenis}] → ${g.hasil.status}`);
  if (gagal.length) {
    console.log("");
    console.log("   Cara membaca kolom terakhir — alat ini TIDAK menyatakan rujukan di atas rusak:");
    console.log("    · `tidak ada di repo` = tidak ada di akar repo. Sebagian sah: path DI DALAM bundel deploy");
    console.log("      (contoh terverifikasi: `scripts/seed-owner.js` dibuat `scripts/make-deploy.mjs`), nama dependency");
    console.log("      npm (`tesseract.js`), atau berkas bawaan Node (`npm.ps1`). Sisanya kandidat rujukan basi —");
    console.log("      contoh terverifikasi: `docs/PETA-KODE.md` menunjuk `backend/src/common/utils/cashflow-classifier.ts`");
    console.log("      dan `financial-ratios.helper.ts`, padahal keduanya ada di `backend/src/modules/accounting/`.");
    console.log("    · `ambigu (N kandidat)` = aturan kehati-hatian §3: >1 kandidat TIDAK dipilih sembarang.");
    console.log("    · `belum di-commit` = berkas ada di disk tetapi belum punya t_ref sama sekali.");
    console.log("   Periksa satu per satu sebelum mengutipnya sebagai temuan.");
  }
}

console.log("");
console.log("── BATAS YANG WAJIB DIBACA SEBELUM MENGUTIP ANGKA (spesifikasi §4) ──────────");
console.log(" 1. Segar ≠ benar. Dokumen bisa usang walau semua berkas rujukannya tidak berubah (perilaku");
console.log("    berubah di tempat lain, atau pernyataannya soal logika, bukan berkas).");
console.log(" 2. Sentuhan kerapian memalsukan kesegaran. Batch dokumentasi menyentuh dokumen TANPA memperbarui");
console.log("    isi, dan itu menaikkan t_doc. Karena itu subjek commit terakhir tiap dokumen dicetak; alat ini");
console.log("    tidak menebak apakah sentuhan itu kerapian atau pembaruan isi.");
console.log(" 3. Riwayat git dangkal = alat tidak sah. Repo shallow ditolak (exit 3) dan tidak mencetak angka.");
console.log(" 4. Zona dikecualikan: docs/arsip, .design-audit, .docs-legacy, .audit-map (AGENTS §6, R6/R9/R10/R11).");
console.log(" 5. Cakupan rendah ≠ sehat. Lihat % cakupan di atas sebelum membaca % segar.");

console.log("");
console.log("── YANG BELUM DIUKUR (UNKNOWN — jangan dikira-kira) ───────────────────────");
console.log(" · tahap 4: simbol/fungsi/konstanta di dalam backtick (mis. AUTO_OPS_DEADLINES) — belum ada penyelesai.");
console.log(" · rujukan kode di dalam blok berpagar dan di luar prefix backend//frontend//scripts/ (deploy/, firmware/, design/…).");
console.log(" · rujukan yang menunjuk DI LUAR repo: path di dalam bundel deploy, nama dependency npm, berkas bawaan Node.");
console.log(" · berkas yang berubah hanya lewat resolusi konflik commit merge (git log --name-only tidak mendaftarnya).");
console.log(" · kebenaran isi pernyataan: apakah angka/kalimat di dokumen masih cocok dengan kode — hanya manusia yang menilai.");
console.log("");
console.log("SELESAI — kartu skor, bukan gate: tidak ada aturan gate baru yang dipasang oleh skrip ini.");
