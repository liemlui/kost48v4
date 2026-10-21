// FILE: FrameImage.tsx — <img> yang memilih cover/contain sesuai rasio asli foto.
//
// Masalah yang diselesaikan: foto kamar/brosur diunggah dengan rasio bebas (potret HP,
// panorama, A4 potret), sedangkan frame publik tingginya tetap + `object-fit: cover`.
// Akibatnya subjek terpotong. Komponen ini menghitung rasio SETELAH gambar dimuat
// (`naturalWidth/naturalHeight`, tanpa request tambahan) lalu:
//   • rasio dekat frame  → `cover` (tata letak rapi, perilaku lama dipertahankan);
//   • rasio ekstrem      → `contain` + salinan blur sebagai latar (foto utuh, tidak
//                          ada bilah kosong yang mengganggu).
// Default `cover` sampai gambar terbaca, sehingga tidak ada flash tata letak baru.
import { useEffect, useState } from 'react';
import { frameModeForDimensions, type ImageFrameMode } from '../../utils/imageFrame';

type FrameImageMode = 'auto' | ImageFrameMode;

type FrameImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** 'auto' (default) = hitung dari rasio asli foto setelah dimuat. */
  mode?: FrameImageMode;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onError?: () => void;
};

export default function FrameImage({
  src,
  alt,
  className,
  mode = 'auto',
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  onError,
}: FrameImageProps) {
  const [detected, setDetected] = useState<ImageFrameMode>('cover');

  // Carousel berganti foto → mulai dari `cover` lagi sampai rasio foto baru terbaca,
  // supaya foto sebelumnya tidak mewariskan mode contain.
  useEffect(() => {
    setDetected('cover');
  }, [src]);

  const effectiveMode: ImageFrameMode = mode === 'auto' ? detected : mode;
  const isContain = effectiveMode === 'contain';

  return (
    <>
      {isContain ? (
        // Dekoratif: salinan foto yang sama, diburamkan, mengisi sisa bingkai.
        <img src={src} alt="" aria-hidden="true" className="frame-image-backdrop" loading={loading} decoding="async" draggable={false} />
      ) : null}
      <img
        src={src}
        alt={alt}
        className={`${className ? `${className} ` : ''}frame-image${isContain ? ' frame-image-contain' : ''}`}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        onLoad={(event) => {
          if (mode !== 'auto') return;
          const image = event.currentTarget;
          setDetected(frameModeForDimensions(image.naturalWidth, image.naturalHeight));
        }}
        onError={onError}
      />
    </>
  );
}
