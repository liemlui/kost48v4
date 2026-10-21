#!/usr/bin/env node
// FILE: scripts/check-fitur.mjs — gate registry fitur (batch D3 DOCS-GEN2)
// Periksa: format ID, status, role, path jangkar, dan cakupan rute App.tsx.
// Pakai: node scripts/check-fitur.mjs [akar-repo] [--selftest]
// Exit: 0 bersih · 1 ada pelanggaran · 2 self-test gagal
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(dirname(fileURLToPath(import.meta.url)), ".."));
const FITUR = join(ROOT, "docs", "FITUR.md");
const APP = join(ROOT, "frontend", "src", "App.tsx");

const ROLES = new Set(["OWNER", "ADMIN", "STAFF", "TENANT", "PUBLIK", "Semua"]);
const STATUS = new Set(["aktif", "stub", "redirect", "deprecated"]);
const ID_RE = /^FEAT-(OWN|ADM|STF|TNT|FIN|OPS|DATA)-\d{3}$/;

function appRoutes() {
  if (!existsSync(APP)) return null;
  const teks = readFileSync(APP, "utf8");
  return [...teks.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .map((p) => (["gudang", "barang-kamar", "mutasi"].includes(p) ? "/inventory/" + p : p));
}

function validate(docTeks, ruteApp) {
  const v = [];
  const rows = [];
  const ids = new Map();
  const lines = docTeks.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("| FEAT-")) continue;
    const c = line.split("|").map((s) => s.trim());
    if (c.length < 8) {
      v.push(`baris ${i + 1}: kolom tabel kurang (${c.length})`);
      continue;
    }
    const id = c[1];
    const judul = c[2];
    const roleCell = c[3];
    const ruteCell = c[4];
    const status = c[5];
    const anchorCell = c[6];

    if (!ID_RE.test(id)) v.push(`baris ${i + 1}: ID tidak sah: ${id}`);
    if (ids.has(id)) v.push(`baris ${i + 1}: ID ganda: ${id}`);
    ids.set(id, (ids.get(id) || 0) + 1);
    if (!judul) v.push(`baris ${i + 1}: judul fitur kosong`);

    const roles = [...roleCell.matchAll(/\b(OWNER|ADMIN|STAFF|TENANT|PUBLIK|Semua)\b/g)].map((m) => m[1]);
    if (roles.length === 0) v.push(`baris ${i + 1}: role tidak dikenali: ${roleCell}`);
    for (const r of roles) if (!ROLES.has(r)) v.push(`baris ${i + 1}: role tidak sah: ${r}`);

    if (!STATUS.has(status)) v.push(`baris ${i + 1}: status tidak sah: ${status}`);

    const rute = [...ruteCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((x) => x.startsWith("/") || x === "*");
    if (rute.length === 0) v.push(`baris ${i + 1}: tidak ada rute di kolom Rute`);

    const anchors = [...anchorCell.matchAll(/`(frontend\/[^`]+)`/g)].map((m) => m[1]);
    if (anchors.length === 0) v.push(`baris ${i + 1}: tidak ada path jangkar`);
    for (const a of anchors) {
      if (!existsSync(join(ROOT, a))) v.push(`baris ${i + 1}: jangkar tidak ada di disk: ${a}`);
    }

    rows.push({ id, rute });
  }

  const counts = new Map();
  for (const row of rows) for (const r of row.rute) counts.set(r, (counts.get(r) || 0) + 1);
  for (const r of ruteApp) {
    if (!counts.has(r)) v.push(`rute tidak terpetakan: ${r}`);
    else if (counts.get(r) > 1) v.push(`rute ganda: ${r} (${counts.get(r)}x)`);
  }
  for (const r of counts.keys()) if (!ruteApp.includes(r)) v.push(`rute tidak ada di App.tsx: ${r}`);

  return { v, rows, counts };
}

function selftest() {
  const fixture = [
    "# fixture",
    "| FEAT-OPS-001 | A | PUBLIK | `/login` | aktif | `frontend/src/App.tsx` |",
    "| FEAT-OPS-001 | B | PUBLIK | `/login` | mati | `frontend/src/tidak-ada.tsx` |",
  ].join("\n");
  const { v } = validate(fixture, ["/login", "/hilang"]);
  const checks = [
    ["ID ganda", v.some((x) => x.includes("ID ganda"))],
    ["status tidak sah", v.some((x) => x.includes("status tidak sah"))],
    ["jangkar tidak ada", v.some((x) => x.includes("jangkar tidak ada"))],
    ["rute tidak terpetakan", v.some((x) => x.includes("rute tidak terpetakan: /hilang"))],
  ];
  let ok = true;
  for (const [nama, lulus] of checks) {
    console.log(`  ${lulus ? "OK" : "GAGAL"} — ${nama}`);
    if (!lulus) ok = false;
  }
  console.log(ok ? "check-fitur selftest: PASS" : "check-fitur selftest: FAIL");
  process.exit(ok ? 0 : 2);
}

if (process.argv.includes("--selftest")) selftest();

if (!existsSync(FITUR)) {
  console.error(`check-fitur: ${FITUR} tidak ada`);
  process.exit(1);
}
const ruteApp = appRoutes();
if (!ruteApp) {
  console.error(`check-fitur: ${APP} tidak ada`);
  process.exit(1);
}
const doc = readFileSync(FITUR, "utf8");
const { v, rows, counts } = validate(doc, ruteApp);
if (v.length) {
  for (const x of v) console.log(`  PELANGGARAN ${x}`);
  console.log(`check-fitur: ${v.length} pelanggaran.`);
  process.exit(1);
}
console.log(`check-fitur: bersih — ${rows.length} fitur, ${counts.size} rute, ${ruteApp.length} rute App.tsx.`);
