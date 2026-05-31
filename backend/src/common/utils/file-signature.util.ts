import { openSync, readSync, closeSync, unlinkSync } from 'fs';

export const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedProofMime = (typeof ALLOWED_PROOF_MIMES)[number];

export const MIME_TO_EXT: Record<AllowedProofMime, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Reads first 12 bytes and checks real magic signature.
 * Returns the actual MIME type or null if the file is not a recognised image.
 * This is intentionally narrow: SVG, GIF, PDF, and HTML are all rejected.
 */
export function detectImageMime(filePath: string): AllowedProofMime | null {
  let fd: number | undefined;
  try {
    fd = openSync(filePath, 'r');
    const header = Buffer.alloc(12);
    readSync(fd, header, 0, 12, 0);

    // JPEG: FF D8 FF
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      header[0] === 0x89 && header[1] === 0x50 &&
      header[2] === 0x4e && header[3] === 0x47 &&
      header[4] === 0x0d && header[5] === 0x0a &&
      header[6] === 0x1a && header[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WebP: RIFF at [0-3], WEBP at [8-11]
    if (
      header[0] === 0x52 && header[1] === 0x49 &&
      header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 &&
      header[10] === 0x42 && header[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  }
}

export function deleteFileSafe(filePath: string): void {
  try { unlinkSync(filePath); } catch { /* ignore */ }
}
