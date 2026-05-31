import { resolveAbsoluteFileUrl } from '../utils/resolveAbsoluteFileUrl';

const LOCAL_ROOM_IMAGE_BASE_PATH = '/room-images';
const BACKEND_ROOM_IMAGE_MARKER = '/room-images/';

const ROOM_IMAGE_FILES = new Set([
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
  'rumah-tampak-depan.webp', 'kost48-profile.webp', 'logo-kost48-surabaya.webp', 'logo-kost48-sby.webp', 'brosur-depan.webp', 'brosur-belakang.webp',
]);

const GENERIC_ROOM_IMAGES = [
  'kamar-g.webp',
  'kamar-h.webp',
  'kamar-i.webp',
  'kamar-l.webp',
  'rumah-tampak-depan.webp',
];

function localRoomAssetPath(filename: string) {
  return `${LOCAL_ROOM_IMAGE_BASE_PATH}/${filename}`;
}

function extractRoomImageFilename(fileUrl?: string | null) {
  if (!fileUrl) return null;
  const clean = String(fileUrl).split('?')[0].split('#')[0];
  const markerIndex = clean.lastIndexOf(BACKEND_ROOM_IMAGE_MARKER);
  if (markerIndex < 0) return null;
  return clean.slice(markerIndex + BACKEND_ROOM_IMAGE_MARKER.length).split('/').pop() || null;
}

export function resolveKost48MarketingImageUrl(fileUrl?: string | null): string | null {
  const filename = extractRoomImageFilename(fileUrl);
  if (filename && ROOM_IMAGE_FILES.has(filename)) return localRoomAssetPath(filename);
  return resolveAbsoluteFileUrl(fileUrl);
}

export function getKost48LogoUrl(): string {
  return localRoomAssetPath('logo-kost48-surabaya.webp');
}

export function getKost48FrontPhotoUrl(): string {
  return localRoomAssetPath('rumah-tampak-depan.webp');
}

function buildRoomImageFilenames(code?: string | null, name?: string | null): string[] {
  const raw = `${code ?? ''} ${name ?? ''}`.toLowerCase();
  const match = raw.match(/\b([a-z])\s*0*(\d{1,3})\b/);
  const letterOnly = raw.match(/\b(?:kamar\s*)?([a-z])\b/);
  const letters = new Set<string>();
  const candidates: string[] = [];

  if (match) letters.add(match[1]);
  if (letterOnly) letters.add(letterOnly[1]);

  letters.forEach((letter) => {
    if (match) candidates.push(`kamar-${letter}-${match[2]}.webp`);
    candidates.push(`kamar-${letter}.webp`);
    for (let index = 1; index <= 12; index += 1) {
      candidates.push(`kamar-${letter}-${index}.webp`);
    }
  });

  return Array.from(new Set(candidates)).filter((filename) => ROOM_IMAGE_FILES.has(filename));
}

export function getKost48RoomGallery(code?: string | null, name?: string | null, maxImages = 8): string[] {
  const specificImages = buildRoomImageFilenames(code, name).slice(0, maxImages);
  if (specificImages.length > 1) return specificImages.map(localRoomAssetPath);

  const seed = `${code ?? name ?? ''}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rotatedGeneric = GENERIC_ROOM_IMAGES
    .map((_, index) => GENERIC_ROOM_IMAGES[(seed + index) % GENERIC_ROOM_IMAGES.length])
    .filter((filename) => ROOM_IMAGE_FILES.has(filename));

  return Array.from(new Set([...specificImages, ...rotatedGeneric]))
    .slice(0, maxImages)
    .map(localRoomAssetPath);
}

export function getKost48RoomCover(code?: string | null, name?: string | null): string | null {
  return getKost48RoomGallery(code, name, 1)[0] ?? null;
}
