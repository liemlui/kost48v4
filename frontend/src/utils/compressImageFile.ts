type CompressImageOptions = {
  maxSide?: number;
  quality?: number;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through when the API exists but cannot decode this image.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

function outputName(fileName: string) {
  const base = (fileName || 'foto').replace(/\.[^.]+$/, '') || 'foto';
  return `${base}.jpg`;
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const loaded = await loadImage(file);
  const maxSide = options.maxSide ?? 1600;
  const quality = options.quality ?? 0.78;

  try {
    const scale = Math.min(1, maxSide / Math.max(loaded.width, loaded.height));
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(loaded.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;

    // Canvas re-encoding removes EXIF and GPS metadata from field evidence.
    return new File([blob], outputName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    loaded.cleanup();
  }
}
