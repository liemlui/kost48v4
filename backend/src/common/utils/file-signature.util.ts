import { readFileSync, unlinkSync } from 'fs';

export const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedProofMime = (typeof ALLOWED_PROOF_MIMES)[number];

export const MIME_TO_EXT: Record<AllowedProofMime, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function detectImageMimeFromHeader(header: Buffer): AllowedProofMime | null {
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
}

function readUint24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function hasValidPngStructure(buffer: Buffer): boolean {
  if (buffer.length < 45) return false;

  let offset = 8;
  let sawIhdr = false;
  let sawIdat = false;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const nextOffset = dataEnd + 4;

    if (dataEnd > buffer.length - 4) return false;

    if (!sawIhdr) {
      if (type !== 'IHDR' || length !== 13) return false;
      const width = buffer.readUInt32BE(dataStart);
      const height = buffer.readUInt32BE(dataStart + 4);
      const bitDepth = buffer[dataStart + 8];
      const colorType = buffer[dataStart + 9];
      if (width <= 0 || height <= 0) return false;
      if (![1, 2, 4, 8, 16].includes(bitDepth)) return false;
      if (![0, 2, 3, 4, 6].includes(colorType)) return false;
      sawIhdr = true;
    } else if (type === 'IDAT') {
      sawIdat = true;
    } else if (type === 'IEND') {
      return length === 0 && sawIdat;
    }

    offset = nextOffset;
  }

  return false;
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function hasValidJpegStructure(buffer: Buffer): boolean {
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;

  let offset = 2;
  let sawSof = false;

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return false;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9) return sawSof;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return false;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return false;

    const segmentStart = offset + 2;
    const segmentEnd = offset + length;

    if (isJpegStartOfFrame(marker)) {
      if (length < 8) return false;
      const height = buffer.readUInt16BE(segmentStart + 1);
      const width = buffer.readUInt16BE(segmentStart + 3);
      if (width <= 0 || height <= 0) return false;
      sawSof = true;
    }

    if (marker === 0xda) {
      return sawSof && buffer.includes(Buffer.from([0xff, 0xd9]), segmentEnd);
    }

    offset = segmentEnd;
  }

  return false;
}

function hasValidWebpStructure(buffer: Buffer): boolean {
  if (buffer.length < 30) return false;
  const riffSize = buffer.readUInt32LE(4);
  if (riffSize > buffer.length - 8) return false;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    if (dataEnd > buffer.length) return false;

    if (chunkType === 'VP8X') {
      if (chunkSize < 10) return false;
      const width = readUint24LE(buffer, dataStart + 4) + 1;
      const height = readUint24LE(buffer, dataStart + 7) + 1;
      return width > 0 && height > 0;
    }

    if (chunkType === 'VP8L') {
      if (chunkSize < 5 || buffer[dataStart] !== 0x2f) return false;
      const packed = buffer.readUInt32LE(dataStart + 1);
      const width = (packed & 0x3fff) + 1;
      const height = ((packed >> 14) & 0x3fff) + 1;
      return width > 0 && height > 0;
    }

    if (chunkType === 'VP8 ') {
      if (chunkSize < 10) return false;
      if (buffer[dataStart + 3] !== 0x9d || buffer[dataStart + 4] !== 0x01 || buffer[dataStart + 5] !== 0x2a) {
        return false;
      }
      const width = buffer.readUInt16LE(dataStart + 6) & 0x3fff;
      const height = buffer.readUInt16LE(dataStart + 8) & 0x3fff;
      return width > 0 && height > 0;
    }

    offset = dataEnd + (chunkSize % 2);
  }

  return false;
}

function hasValidImageStructure(buffer: Buffer, mime: AllowedProofMime): boolean {
  if (mime === 'image/jpeg') return hasValidJpegStructure(buffer);
  if (mime === 'image/png') return hasValidPngStructure(buffer);
  if (mime === 'image/webp') return hasValidWebpStructure(buffer);
  return false;
}

export function detectImageMimeFromBuffer(buffer?: Buffer | null): AllowedProofMime | null {
  if (!buffer || buffer.length < 12) return null;
  const detected = detectImageMimeFromHeader(buffer.subarray(0, 12));
  if (!detected) return null;
  return hasValidImageStructure(buffer, detected) ? detected : null;
}

/**
 * Reads the file and checks real image signature plus basic container structure.
 * Returns the actual MIME type or null if the file is not a recognised image.
 * This is intentionally narrow: SVG, GIF, PDF, and HTML are all rejected.
 */
export function detectImageMime(filePath: string): AllowedProofMime | null {
  try {
    return detectImageMimeFromBuffer(readFileSync(filePath));
  } catch {
    return null;
  }
}

export function deleteFileSafe(filePath: string): void {
  try { unlinkSync(filePath); } catch { /* ignore */ }
}
