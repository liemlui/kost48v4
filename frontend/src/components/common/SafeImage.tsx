import { useEffect, useState, type CSSProperties } from 'react';
import { useAuthenticatedMediaUrl } from '../../hooks/useAuthenticatedMediaUrl';

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
  const media = useAuthenticatedMediaUrl(resolveUrl ? src : null);
  const resolvedSrc = resolveUrl ? media.url : src;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!resolvedSrc || failed || media.failed) {
    return (
      <div
        className={placeholderClassName ? `safe-image-placeholder ${placeholderClassName}` : 'safe-image-placeholder'}
        style={style}
        role="img"
        aria-label={fallbackTitle}
      >
        <span aria-hidden="true">Foto</span>
        <strong>{media.loading ? 'Memuat foto' : fallbackTitle}</strong>
        <small>{media.loading ? 'Mengambil gambar secara aman.' : fallbackDescription}</small>
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
