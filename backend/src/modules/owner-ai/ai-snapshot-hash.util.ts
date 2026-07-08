import { createHash } from 'crypto';

/**
 * JSON.stringify dengan key terurut di SETIAP level (bukan hanya top-level) —
 * agar objek dengan urutan key berbeda tapi isi sama selalu hash sama, dan
 * agar tidak ada key nested yang hilang (JSON.stringify(obj, arrayReplacer)
 * bawaan JS menerapkan whitelist top-level itu secara rekursif ke semua level).
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Hash stabil (SHA-256) untuk data snapshot & prompt.
 * Dipakai untuk context caching DeepSeek dan audit trail.
 */
export function stableHash(obj: unknown): string {
  const json = JSON.stringify(canonicalize(obj));
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
