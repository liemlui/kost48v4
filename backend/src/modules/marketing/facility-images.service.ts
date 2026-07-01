import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detectImageMimeFromBuffer, MIME_TO_EXT } from '../../common/utils/file-signature.util';

// Type untuk file upload — nestjs/platform-express menyediakan ini via multer.
interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const FACILITY_UPLOAD_DIR = 'uploads/room-images/facilities';
const IMAGE_EXT_RE = /\.(webp|jpg|jpeg|png)$/i;
const RANDOM_SUFFIX_RE = /-\d{13}-[a-f0-9]{16}$/i;

@Injectable()
export class FacilityImagesService {
  getUploadDir(): string {
    const dir = join(process.cwd(), FACILITY_UPLOAD_DIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Upload foto fasilitas. Slug adalah URL-safe identifier fasilitas (contoh: "parkir-luas").
   * File disimpan dengan ekstensi yang sesuai signature asli (JPG, PNG, atau WebP).
   */
  async upload(slug: string, file: UploadFile): Promise<{ url: string }> {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new ConflictException('Slug hanya boleh huruf kecil, angka, dan tanda hubung.');
    }
    const detectedMime = detectImageMimeFromBuffer(file.buffer);
    if (!detectedMime) throw new ConflictException('Format file harus JPG, PNG, atau WebP yang valid.');

    const dir = this.getUploadDir();
    this.deleteFilesForSlug(slug, false);

    const filename = `${slug}-${Date.now()}-${randomBytes(8).toString('hex')}${MIME_TO_EXT[detectedMime]}`;
    const filepath = join(dir, filename);

    writeFileSync(filepath, file.buffer);

    return { url: `/uploads/room-images/facilities/${filename}` };
  }

  /** Daftar slug fasilitas yang sudah punya foto. */
  list(): { slug: string; url: string }[] {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => /^[a-z0-9-]+(?:-\d{13}-[a-f0-9]{16})?\.(webp|jpg|jpeg|png)$/i.test(f));
    return files.map((f) => {
      const slug = this.slugFromFilename(f);
      return { slug, url: `/uploads/room-images/facilities/${f}` };
    });
  }

  /** Hapus foto fasilitas berdasarkan slug. */
  delete(slug: string): void {
    this.deleteFilesForSlug(slug, true);
  }

  /** Cek apakah fasilitas punya foto. */
  exists(slug: string): boolean {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => this.isFilenameForSlug(f, slug));
    return files.length > 0;
  }

  private deleteFilesForSlug(slug: string, throwIfMissing: boolean): boolean {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => this.isFilenameForSlug(f, slug));
    if (files.length === 0 && throwIfMissing) {
      throw new NotFoundException(`Foto untuk fasilitas "${slug}" tidak ditemukan.`);
    }
    for (const f of files) unlinkSync(join(dir, f));
    return files.length > 0;
  }

  private isFilenameForSlug(filename: string, slug: string): boolean {
    return IMAGE_EXT_RE.test(filename) && this.slugFromFilename(filename) === slug;
  }

  private slugFromFilename(filename: string): string {
    return filename.replace(IMAGE_EXT_RE, '').replace(RANDOM_SUFFIX_RE, '');
  }
}
