import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

interface UploadFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const MARKETING_ASSET_UPLOAD_DIR = 'uploads/room-images/marketing-assets';
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MARKETING_ASSET_SLOTS = [
  {
    slug: 'hero-front',
    label: 'Hero / tampak depan',
    kind: 'hero',
    defaultUrl: '/room-images/rumah-tampak-depan.webp',
    sortOrder: 10,
  },
  {
    slug: 'profile',
    label: 'Profil area KOST48',
    kind: 'gallery',
    defaultUrl: '/room-images/kost48-profile.webp',
    sortOrder: 20,
  },
  {
    slug: 'spanduk',
    label: 'Spanduk KOST48',
    kind: 'brochure',
    defaultUrl: '/room-images/spanduk-kost48-surabaya.webp',
    sortOrder: 30,
  },
  {
    slug: 'brosur-depan',
    label: 'Brosur - Halaman Depan',
    kind: 'brochure',
    defaultUrl: '/room-images/brosur-depan.webp',
    sortOrder: 40,
  },
  {
    slug: 'brosur-belakang',
    label: 'Brosur - Halaman Belakang',
    kind: 'brochure',
    defaultUrl: '/room-images/brosur-belakang.webp',
    sortOrder: 50,
  },
] as const;

type MarketingAssetSlot = (typeof MARKETING_ASSET_SLOTS)[number];

export type MarketingAssetItem = MarketingAssetSlot & {
  url: string | null;
  activeUrl: string;
};

@Injectable()
export class MarketingAssetsService {
  getUploadDir(): string {
    const dir = join(process.cwd(), MARKETING_ASSET_UPLOAD_DIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  list(): MarketingAssetItem[] {
    return MARKETING_ASSET_SLOTS
      .map((slot) => {
        const filename = this.findUploadedFilename(slot.slug);
        const url = filename ? `/uploads/room-images/marketing-assets/${filename}` : null;
        return {
          ...slot,
          url,
          activeUrl: url ?? slot.defaultUrl,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  upload(slug: string, file: UploadFile): { slug: string; url: string } {
    const slot = this.getSlot(slug);
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype];
    if (!ext) throw new ConflictException('Format file harus JPG, PNG, atau WebP.');

    this.deleteUploadedFiles(slot.slug);
    const filename = `${slot.slug}${ext}`;
    writeFileSync(join(this.getUploadDir(), filename), file.buffer);

    return { slug: slot.slug, url: `/uploads/room-images/marketing-assets/${filename}` };
  }

  delete(slug: string): void {
    const slot = this.getSlot(slug);
    const deleted = this.deleteUploadedFiles(slot.slug);
    if (!deleted) throw new NotFoundException(`Aset marketing "${slot.label}" belum punya foto upload.`);
  }

  private getSlot(slug: string): MarketingAssetSlot {
    const slot = MARKETING_ASSET_SLOTS.find((item) => item.slug === slug);
    if (!slot) throw new NotFoundException('Slot aset marketing tidak ditemukan.');
    return slot;
  }

  private findUploadedFilename(slug: string): string | null {
    const files = readdirSync(this.getUploadDir()).filter((filename) => filename.startsWith(`${slug}.`));
    return files[0] ?? null;
  }

  private deleteUploadedFiles(slug: string): boolean {
    const files = readdirSync(this.getUploadDir()).filter((filename) => filename.startsWith(`${slug}.`));
    for (const filename of files) unlinkSync(join(this.getUploadDir(), filename));
    return files.length > 0;
  }
}
