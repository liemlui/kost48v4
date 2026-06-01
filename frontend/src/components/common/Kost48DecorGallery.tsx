import SafeImage from './SafeImage';
import { officialKost48DecorImages } from '../../data/officialKost48Content';

type Kost48DecorGalleryProps = {
  variant?: 'auth' | 'public' | 'compact';
  maxItems?: number;
};

export default function Kost48DecorGallery({ variant = 'compact', maxItems = 3 }: Kost48DecorGalleryProps) {
  const images = officialKost48DecorImages.slice(0, maxItems);
  return (
    <div className={`kost48-decor-gallery ${variant}`} aria-label="Dokumentasi resmi KOST48">
      {images.map((item, index) => (
        <figure key={item.src} className={`kost48-decor-card decor-${index + 1}`}>
          <SafeImage
            src={item.src}
            alt={item.title}
            className="kost48-decor-image"
            fallbackTitle="Gambar KOST48 belum tersedia"
            fallbackDescription="Informasi resmi tetap bisa dibaca dari teks di halaman ini."
            resolveUrl={false}
          />
          <figcaption>
            <strong>{item.title}</strong>
            {variant !== 'auth' ? <span>{item.description}</span> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
