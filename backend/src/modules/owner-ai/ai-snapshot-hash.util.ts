import { createHash } from 'crypto';

/**
 * Hash stabil (SHA-256) untuk data snapshot & prompt.
 * Dipakai untuk context caching DeepSeek dan audit trail.
 */
export function stableHash(obj: unknown): string {
  const json = JSON.stringify(obj, Object.keys(obj as any).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
