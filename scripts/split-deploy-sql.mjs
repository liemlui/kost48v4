// split-deploy-sql.mjs
// Pecah deploy-full.sql jadi 3 bagian untuk pgAdmin
import { readFileSync, writeFileSync } from 'node:fs';

const sql = readFileSync('sql/deploy-full.sql', 'utf8');
const lines = sql.split('\n');

// Cari batasan alami
const bootstrapStart = lines.findIndex(l => l.includes('-- BOOTSTRAP: TRIGGERS'));
const commitLine = lines.findIndex(l => l.trim() === 'COMMIT;');

// Bagian 1: Schema + Types + Tables (line 0 - 1127)
// Bagian 2: Indexes + Foreign Keys (line 1128 - 1975)
// Bagian 3: Bootstrap triggers + constraints (line 1976 - end)
const L1_END = 1128;
const L2_END = 1976;

const part1 = lines.slice(0, L1_END);
const part2 = lines.slice(L1_END, L2_END);
const part3 = lines.slice(L2_END);

writeFileSync('sql/deploy-part1-types-tables.sql', part1.join('\n').replace(/\n{3,}/g, '\n\n').trim());
writeFileSync('sql/deploy-part2-indexes-fks.sql', part2.join('\n').replace(/\n{3,}/g, '\n\n').trim());
writeFileSync('sql/deploy-part3-bootstrap.sql', part3.join('\n').replace(/\n{3,}/g, '\n\n').trim());

const sz = (f) => (readFileSync(f, 'utf8').length / 1024).toFixed(1) + ' KB';
console.log('Part 1 — Types + Tables: ' + sz('sql/deploy-part1-types-tables.sql') + ' (' + part1.length + ' baris)');
console.log('Part 2 — Indexes + FKs:    ' + sz('sql/deploy-part2-indexes-fks.sql') + ' (' + part2.length + ' baris)');
console.log('Part 3 — Bootstrap:        ' + sz('sql/deploy-part3-bootstrap.sql') + ' (' + part3.length + ' baris)');
