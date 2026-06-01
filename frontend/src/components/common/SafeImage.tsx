import { useMemo, useState, type CSSProperties } from 'react';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  style?: CSSProperties;
  fallbackTitle?: string;
  fallbackDescription?: string;
  resolveUrl?: boolean;
};

export default function SafeImage({
  src,
  alt,
  className,
  placeholderClassName,
  style,
  fallbackTitle = 'Foto belum tersedia',
  fallbackDescription = 'Gambar tidak bisa dimuat. Informasi tetap bisa dibaca dari detail di halaman ini.',
  resolveUrl = true,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useMemo(() => {
    if (!src || failed) return null;
    return resolveUrl ? (resolveAbsoluteFileUrl(src) ?? src) : src;
  }, [src, failed, resolveUrl]);

  if (!resolvedSrc) {
    return (
      <div
        className={placeholderClassName ? `safe-image-placeholder ${placeholderClassName}` : 'safe-image-placeholder'}
        style={style}
        role="img"
        aria-label={fallbackTitle}
      >
        <span aria-hidden="true">🖼️</span>
        <strong>{fallbackTitle}</strong>
        <small>{fallbackDescription}</small>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
