// OCR-IMG-PP: Preprocessing gambar sebelum OCR (Tesseract.js).
// Mengubah foto kamera HP menjadi gambar hitam-putih kontras tinggi,
// agar teks KTP kecil lebih terbaca oleh engine OCR.
//
// Pipeline: resize → grayscale → histogram-stretch → adaptive threshold.
// Semua berjalan di Canvas (offline), tidak ada data dikirim ke server.

export interface PreprocessOptions {
  /** Maksimal dimensi (px) — lebar/tinggi. Default 1500. */
  maxDimension?: number;
  /** Ukuran blok threshold adaptif (px). Default 15. */
  blockSize?: number;
  /** Konstanta subtraksi threshold. Default 10. */
  thresholdC?: number;
}

/**
 * Preprocess gambar untuk OCR: resize, grayscale, auto-contrast, threshold.
 * Mengembalikan File hasil preprocessing (PNG).
 * 
 * @param file - File gambar input (JPG/PNG/WebP)
 * @param opts - Opsi preprocessing
 * @returns File hasil preprocessing siap untuk Tesseract
 */
export async function preprocessImage(
  file: File,
  opts: PreprocessOptions = {},
): Promise<File> {
  const { maxDimension = 1500, blockSize = 15, thresholdC = 10 } = opts;

  const imageData = await loadImage(file);
  const canvas = createCanvas(imageData, maxDimension);
  const ctx = canvas.getContext('2d')!;

  // Gambar yang sudah di-resize
  ctx.drawImage(imageData.img, 0, 0, canvas.width, canvas.height);

  // Ambil data pixel
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = src.data;

  // === 1. Grayscale + histogram ===
  const gray: Uint8Array = new Uint8Array(canvas.width * canvas.height);
  let min = 255;
  let max = 0;
  for (let i = 0; i < gray.length; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    // Luminance formula (perceptual)
    const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[i] = v;
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // === 2. Histogram stretch (auto-contrast) ===
  const range = max - min || 1;
  const contrast: Uint8Array = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    contrast[i] = Math.round(((gray[i] - min) / range) * 255);
  }

  // === 3. Adaptive threshold (mean-based, per blok) ===
  const thresholded: Uint8Array = new Uint8Array(gray.length);
  const halfBlock = Math.floor(blockSize / 2);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // Hitung rata-rata dalam blok
      let sum = 0;
      let count = 0;
      for (let dy = -halfBlock; dy <= halfBlock; dy++) {
        for (let dx = -halfBlock; dx <= halfBlock; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
            sum += contrast[ny * canvas.width + nx];
            count++;
          }
        }
      }
      const mean = sum / count;
      const idx = y * canvas.width + x;
      thresholded[idx] = contrast[idx] > mean - thresholdC ? 255 : 0;
    }
  }

  // === 4. Tulis hasil ke canvas ===
  const outData = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < thresholded.length; i++) {
    const v = thresholded[i];
    outData.data[i * 4] = v;     // R
    outData.data[i * 4 + 1] = v; // G
    outData.data[i * 4 + 2] = v; // B
    outData.data[i * 4 + 3] = 255; // A
  }
  ctx.putImageData(outData, 0, 0);

  // === 5. Export sebagai File PNG ===
  const blob = await canvasToBlob(canvas);
  return new File([blob], file.name.replace(/\.\w+$/, '_pp.png'), {
    type: 'image/png',
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

interface LoadedImage {
  img: HTMLImageElement;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.onerror = () => reject(new Error('Gagal memuat gambar untuk preprocessing.'));
    img.src = URL.createObjectURL(file);
  });
}

function createCanvas(
  image: { width: number; height: number },
  maxDimension: number,
): HTMLCanvasElement {
  let { width, height } = image;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal mengekspor canvas ke blob.'));
      },
      'image/png',
    );
  });
}
