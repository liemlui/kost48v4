/*
 * ⛔ USANG (2026-06-16). JANGAN DIPAKAI.
 *
 * Script lama ini mengisi dummy lewat RAW INSERT Prisma → MEM-BYPASS aturan bisnis,
 * sehingga bisa menghasilkan state mustahil (mis. deadline perpanjangan tak nyambung ke
 * akhir kontrak). Keputusan owner 2026-06-16: "dummy data dimasukkan lewat jalur satu per
 * satu kejadian (push ke backend), jangan by pass ke database."
 *
 * GANTI dengan alur SI-1 (event-path, HTTP — aturan bisnis PASTI berlaku):
 *   1) node scripts/seed-dev-reset.js     (TRUNCATE + fondasi: user/COA/periode/kas)
 *   2) RESTART backend dev, lalu:
 *      node scripts/seed-dev-via-api.js   (data bisnis via endpoint nyata)
 *   (atau: npm run seed:dev:reset  →  npm run seed:dev:api)
 *
 * Lihat docs/_AKUN_DUMMY_DEV.md dan docs/_PLAN_SI_SEWA_RIWAYAT.md.
 */
console.error('⛔ seed-dev-dummy.js USANG (raw insert mem-bypass aturan bisnis).');
console.error('   Pakai: node scripts/seed-dev-reset.js  →  (restart backend)  →  node scripts/seed-dev-via-api.js');
process.exit(1);
