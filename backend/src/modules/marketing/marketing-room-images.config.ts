// F3-11 (M-04): katalog foto marketing kamar dipindah dari `marketing-public-rooms.service.ts`
// ke konfigurasi terpisah agar daftar ~76 foto bisa dirawat tanpa menyentuh logika service.
// Foto fisik berada di `/api/uploads/room-images`; daftar ini adalah fallback ketika
// `Room.images` (DB) kosong, dipetakan dari kode kamar.

export const ROOM_IMAGE_BASE_PATH = '/api/uploads/room-images';

// Whitelist berkas foto kamar yang benar-benar tersedia di folder uploads.
export const ROOM_MARKETING_IMAGE_FILES = new Set<string>([
  'kamar-a.webp', 'kamar-a-1.webp', 'kamar-a-2.webp', 'kamar-a-3.webp', 'kamar-a-4.webp', 'kamar-a-5.webp', 'kamar-a-6.webp',
  'kamar-b.webp', 'kamar-b-1.webp', 'kamar-b-2.webp', 'kamar-b-3.webp', 'kamar-b-4.webp', 'kamar-b-5.webp', 'kamar-b-6.webp', 'kamar-b-7.webp', 'kamar-b-8.webp', 'kamar-b-9.webp',
  'kamar-c.webp', 'kamar-c-1.webp', 'kamar-c-2.webp', 'kamar-c-3.webp',
  'kamar-d.webp', 'kamar-d-1.webp', 'kamar-d-2.webp', 'kamar-d-3.webp', 'kamar-d-4.webp', 'kamar-d-5.webp', 'kamar-d-6.webp', 'kamar-d-7.webp', 'kamar-d-8.webp', 'kamar-d-9.webp',
  'kamar-g.webp', 'kamar-g-1.webp', 'kamar-g-2.webp', 'kamar-g-3.webp', 'kamar-g-4.webp', 'kamar-g-5.webp', 'kamar-g-6.webp', 'kamar-g-7.webp',
  'kamar-h.webp', 'kamar-h-1.webp', 'kamar-h-2.webp', 'kamar-h-3.webp', 'kamar-h-4.webp', 'kamar-h-5.webp', 'kamar-h-6.webp',
  'kamar-i.webp', 'kamar-i-1.webp', 'kamar-i-2.webp', 'kamar-i-3.webp', 'kamar-i-4.webp', 'kamar-i-5.webp', 'kamar-i-6.webp',
  'kamar-j.webp', 'kamar-j-1.webp', 'kamar-j-2.webp', 'kamar-j-3.webp', 'kamar-j-4.webp', 'kamar-j-5.webp', 'kamar-j-6.webp',
  'kamar-k.webp', 'kamar-k-1.webp', 'kamar-k-2.webp', 'kamar-k-3.webp', 'kamar-k-4.webp',
  'kamar-l.webp', 'kamar-l-1.webp', 'kamar-l-2.webp', 'kamar-l-3.webp', 'kamar-l-4.webp', 'kamar-l-5.webp', 'kamar-l-6.webp',
  'kamar-m.webp', 'kamar-m-1.webp', 'kamar-m-2.webp', 'kamar-m-3.webp', 'kamar-m-4.webp', 'kamar-m-5.webp', 'kamar-m-6.webp', 'kamar-m-7.webp',
]);

// Galeri generik (fallback terakhir) ketika kamar tak punya foto spesifik.
export const GENERIC_ROOM_MARKETING_IMAGES = [
  'rumah-tampak-depan.webp',
  'kamar-g.webp',
  'kamar-h.webp',
  'kamar-i.webp',
  'kamar-l.webp',
  'kost48-profile.webp',
];
