// FILE: imageFrame.ts — klasifikasi rasio foto upload + panduan rasio (murni, tanpa dependency)
//
// Kenapa ada: frame foto publik (kartu kamar 4:3, kartu katalog 190 px, galeri 16:9,
// thumbnail fasilitas 3 rem) memakai `object-fit: cover`, sehingga foto yang diunggah
// dengan rasio jauh dari frame (potret HP, brosur A4, panorama) kehilangan tepinya.
// Aturan di sini dipakai DUA sisi:
//   1. tampilan publik — `FrameImage` memilih `cover` (rapi) atau `contain` (utuh);
//   2. panel upload — `evaluateUploadRatio` memberi rekomendasi tanpa memblokir unggahan.
// Tanpa DOM, tanpa paket baru; fungsi murni supaya bisa diuji langsung.

export type ImageFrameMode = 'cover' | 'contain';

/**
 * Di dalam rentang ini crop 4:3/16:9 masih wajar (subjek utama tetap terlihat).
 * Di luar rentang — potret (< 0.9) atau panorama (> 1.9) — foto ditampilkan utuh
 * dengan latar blur, bukan dipotong.
 */
export const FRAME_COVER_MIN_RATIO = 0.9;
export const FRAME_COVER_MAX_RATIO = 1.9;

/** Rasio lebar/tinggi, atau null bila dimensi tidak terbaca. */
export function imageRatio(width?: number | null, height?: number | null): number | null {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return width / height;
}

export function frameModeForRatio(ratio?: number | null): ImageFrameMode {
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return 'cover';
  return ratio >= FRAME_COVER_MIN_RATIO && ratio <= FRAME_COVER_MAX_RATIO ? 'cover' : 'contain';
}

export function frameModeForDimensions(width?: number | null, height?: number | null): ImageFrameMode {
  return frameModeForRatio(imageRatio(width, height));
}

export type UploadRatioTarget = 'room-card' | 'room-detail' | 'hero' | 'facility' | 'gallery' | 'marketing';

export type UploadRatioGuide = {
  target: UploadRatioTarget;
  /** Pemakaian di halaman publik — dipakai di kalimat rekomendasi. */
  label: string;
  /** Rasio yang disarankan, dalam bahasa owner (bukan desimal). */
  ratioText: string;
  /** Rasio ideal sebagai angka, untuk menghitung toleransi. */
  idealRatio: number;
  minWidth: number;
  minHeight: number;
  note: string;
  /** Rentang rasio lain yang sah untuk jenis aset ini (mis. brosur A4 potret). */
  alternates?: Array<{ reason: string; min: number; max: number }>;
};

export const UPLOAD_RATIO_GUIDES: Record<UploadRatioTarget, UploadRatioGuide> = {
  'room-card': {
    target: 'room-card',
    label: 'kartu kamar di beranda & katalog',
    ratioText: '4:3 mendatar',
    idealRatio: 4 / 3,
    minWidth: 1200,
    minHeight: 900,
    note: 'Rasio ini paling aman untuk kartu kamar. Foto lain tetap diterima; rasio ekstrem ditampilkan utuh dengan latar blur.',
  },
  'room-detail': {
    target: 'room-detail',
    label: 'galeri detail kamar',
    ratioText: '4:3 mendatar',
    idealRatio: 4 / 3,
    minWidth: 1600,
    minHeight: 1200,
    note: 'Galeri detail menampilkan foto utuh (letterbox), tetapi 4:3 membuat bingkai terlihat penuh di desktop maupun HP.',
  },
  hero: {
    target: 'hero',
    label: 'hero beranda',
    ratioText: '16:9 mendatar',
    idealRatio: 16 / 9,
    minWidth: 1920,
    minHeight: 1080,
    note: 'Hero memenuhi layar, jadi selalu dipotong. Simpan subjek utama di 60% bagian tengah bingkai.',
  },
  facility: {
    target: 'facility',
    label: 'thumbnail fasilitas',
    ratioText: '1:1 persegi',
    idealRatio: 1,
    minWidth: 800,
    minHeight: 800,
    note: 'Thumbnail fasilitas tampil 48 px, jadi foto persegi paling jelas. Foto mendatar/potret tampil utuh dengan latar.',
  },
  gallery: {
    target: 'gallery',
    label: 'galeri brosur & spanduk',
    ratioText: '4:3 mendatar',
    idealRatio: 4 / 3,
    minWidth: 1200,
    minHeight: 900,
    note: 'Spanduk dan brosur boleh potret A4 — sistem menampilkan seluruh halaman tanpa memotong isi.',
    alternates: [{ reason: 'halaman brosur A4 potret', min: 0.62, max: 0.78 }],
  },
  marketing: {
    target: 'marketing',
    label: 'aset publik (hero/galeri/brosur)',
    ratioText: '16:9 untuk hero, 4:3 atau A4 potret untuk galeri',
    idealRatio: 4 / 3,
    minWidth: 1200,
    minHeight: 900,
    note: 'Aset yang rasionya jauh dari bingkai tetap tampil utuh, tetapi pinggirannya bisa diberi latar blur.',
    alternates: [
      { reason: 'hero layar lebar 16:9', min: 1.6, max: 2.0 },
      { reason: 'halaman brosur A4 potret', min: 0.62, max: 0.78 },
    ],
  },
};

export type UploadRatioStatus = 'ok' | 'warn' | 'unknown';

export type UploadRatioVerdict = {
  status: UploadRatioStatus;
  /** "1.33:1" atau "tidak diketahui". */
  ratioLabel: string;
  /** Dimensi asli bila terbaca, mis. "1600 × 1200". */
  dimensionLabel: string | null;
  message: string;
  guide: UploadRatioGuide;
};

/** Toleransi ±12% dari rasio ideal — di luar itu crop mulai terasa memotong subjek. */
export const RATIO_TOLERANCE = 0.12;

function ratioLabel(ratio: number | null): string {
  if (ratio == null) return 'tidak diketahui';
  return `${ratio.toFixed(2)}:1`;
}

function matchesAlternate(ratio: number, guide: UploadRatioGuide): string | null {
  for (const alternate of guide.alternates ?? []) {
    if (ratio >= alternate.min && ratio <= alternate.max) return alternate.reason;
  }
  return null;
}

/**
 * Menilai satu foto sebelum/sesudah diunggah. Tidak pernah memblokir: status `warn`
 * berarti "unggahan tetap jalan, tetapi rasio kurang ideal".
 */
export function evaluateUploadRatio(
  width: number | null | undefined,
  height: number | null | undefined,
  target: UploadRatioTarget,
): UploadRatioVerdict {
  const guide = UPLOAD_RATIO_GUIDES[target];
  const ratio = imageRatio(width, height);

  if (ratio == null) {
    return {
      status: 'unknown',
      ratioLabel: 'tidak diketahui',
      dimensionLabel: null,
      message: `Ukuran foto belum terbaca. Rasio yang disarankan: ${guide.ratioText}.`,
      guide,
    };
  }

  const dimensionLabel = `${Math.round(Number(width))} × ${Math.round(Number(height))}`;
  const alternateReason = matchesAlternate(ratio, guide);
  const deviation = Math.abs(ratio - guide.idealRatio) / guide.idealRatio;
  const ratioOk = deviation <= RATIO_TOLERANCE || Boolean(alternateReason);
  const tooSmall = Number(width) < guide.minWidth || Number(height) < guide.minHeight;

  if (ratioOk && !tooSmall) {
    const alternateNote = alternateReason ? ` (${alternateReason})` : '';
    return {
      status: 'ok',
      ratioLabel: ratioLabel(ratio),
      dimensionLabel,
      message: `Rasio ${ratioLabel(ratio)}${alternateNote} cocok untuk ${guide.label}.`,
      guide,
    };
  }

  if (ratioOk && tooSmall) {
    return {
      status: 'warn',
      ratioLabel: ratioLabel(ratio),
      dimensionLabel,
      message: `Resolusi ${dimensionLabel} di bawah saran ${guide.minWidth} × ${guide.minHeight} px; foto bisa terlihat pecah di layar besar.`,
      guide,
    };
  }

  return {
    status: 'warn',
    ratioLabel: ratioLabel(ratio),
    dimensionLabel,
    message: `Rasio ${ratioLabel(ratio)} kurang ideal untuk ${guide.label} (disarankan ${guide.ratioText}). Foto tetap diunggah dan ditampilkan utuh, tetapi pinggirannya bisa diberi latar blur.`,
    guide,
  };
}

export type ImageDimensions = { width: number; height: number };

/** Membaca dimensi asli file (DOM). Mengembalikan null bila browser tidak bisa membaca. */
export async function readImageDimensions(file: File): Promise<ImageDimensions | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size.width > 0 && size.height > 0 ? size : null;
    } catch {
      // Lanjut ke jalur <img> untuk format yang tidak didukung createImageBitmap.
    }
  }

  if (typeof Image === 'undefined' || typeof URL === 'undefined') return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0
      ? { width: image.naturalWidth, height: image.naturalHeight }
      : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
