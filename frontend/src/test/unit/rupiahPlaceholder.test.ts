import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Pagar regresi untuk bug "placeholder mentah": template literal yang isinya
// PERSIS `{formatRupiah(...)}` — bukan interpolasi `${formatRupiah(...)}` —
// sehingga React mencetak teks itu apa adanya, bukan nilai rupiah.
//
// Pola yang dicek = bug-nya sendiri, bukan tebakan kata kunci: backtick
// langsung diikuti `{formatRupiah(` lalu ditutup backtick. Kode yang benar
// memakai `${formatRupiah(...)}` (ada `$`), jadi tidak ikut tertangkap.
const RAW_PLACEHOLDER = /`\{formatRupiah\([^`]*\)\}`/;

const SRC_ROOT = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'test') continue;
      out.push(...walk(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

describe('placeholder formatRupiah', () => {
  it('tidak ada template literal yang mencetak {formatRupiah(...)} mentah', () => {
    const hits: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (RAW_PLACEHOLDER.test(line)) {
          hits.push(`${relative(process.cwd(), file)}:${index + 1}`);
        }
      });
    }

    expect(
      hits,
      'Baris berikut mencetak placeholder mentah ke layar; panggil formatRupiah(...) langsung di JSX.',
    ).toEqual([]);
  });
});
