// generate-deploy-sql.mjs
// Baca migration.sql + bootstrap.sql → gabung jadi 1 file idempoten
// Hasil: sql/deploy-full.sql — tinggal run di pgAdmin
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATION = 'backend/prisma/migrations/00000000000000_baseline/migration.sql';
const BOOTSTRAP = 'backend/sql/bootstrap.sql';
const OUT = 'sql/deploy-full.sql';

let sql = readFileSync(MIGRATION, 'utf8');
const bootstrap = readFileSync(BOOTSTRAP, 'utf8');

// 1. Schema: CREATE SCHEMA IF NOT EXISTS — sudah idempoten, biarkan

// 2. CREATE TYPE "..." AS ENUM (...) → DO block
sql = sql.replace(
  /^CREATE TYPE\s+"(\w+)"\s+AS\s+ENUM\s*\(([\s\S]*?)\)\s*;\s*$/gm,
  (_, name, values) => {
    const vals = values.replace(/'/g, "''");
    return `DO $$ BEGIN\n  CREATE TYPE "${name}" AS ENUM (${values});\nEXCEPTION WHEN duplicate_object THEN null;\nEND $$;`;
  }
);

// 3. CREATE TABLE → CREATE TABLE IF NOT EXISTS
sql = sql.replace(/^CREATE TABLE\s+/gm, 'CREATE TABLE IF NOT EXISTS ');

// 4. CREATE INDEX → CREATE INDEX IF NOT EXISTS
sql = sql.replace(/^CREATE (UNIQUE\s+)?INDEX\s+/gm, (m) => {
  // Kalau sudah ada IF NOT EXISTS, jangan duplikasi
  return m + 'IF NOT EXISTS ';
});
// Bersihkan double IF NOT EXISTS kalau ada
sql = sql.replace(/IF NOT EXISTS IF NOT EXISTS/g, 'IF NOT EXISTS');

// 5. ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY → DO block
sql = sql.replace(
  /^ALTER TABLE\s+"(\w+)"\s+ADD CONSTRAINT\s+"(\w+)"\s+FOREIGN KEY\s+\(([\s\S]*?)\)\s+REFERENCES\s+"(\w+)"\s+\(([\s\S]*?)\)\s+(ON DELETE [\s\S]*?);$/gm,
  (_, table, constraint, cols, refTable, refCols, onClause) => {
    return `DO $$ BEGIN\n  ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" FOREIGN KEY (${cols}) REFERENCES "${refTable}" (${refCols}) ${onClause};\nEXCEPTION WHEN duplicate_object THEN null;\nEND $$;`;
  }
);

// 6. Gabung dengan bootstrap (yang sudah idempoten dengan DROP IF EXISTS)
sql = sql + '\n\n-- =========================================================\n';
sql = sql + '-- BOOTSTRAP: TRIGGERS, FUNCTIONS, CHECK CONSTRAINTS\n';
sql = sql + '-- =========================================================\n\n';
sql = sql + bootstrap;

// Tulis
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sql);

console.log('✅ sql/deploy-full.sql — ' + (sql.length / 1024).toFixed(1) + ' KB');
console.log('   Sudah idempoten: bisa di-run kapan saja (fresh DB atau setelah db push)');
