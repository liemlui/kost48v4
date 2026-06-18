import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, readdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

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
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class FacilityImagesService {
  getUploadDir(): string {
    const dir = join(process.cwd(), FACILITY_UPLOAD_DIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Upload foto fasilitas. Slug adalah URL-safe identifier fasilitas (contoh: "parkir-luas").
   * File disimpan sebagai {slug}.webp — konversi ke webp via extension rename (server simpan apa adanya).
   */
  async upload(slug: string, file: UploadFile): Promise<{ url: string }> {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new ConflictException('Slug hanya boleh huruf kecil, angka, dan tanda hubung.');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new ConflictException('Format file harus JPG, PNG, atau WebP.');
    }

    const ext = extname(file.originalname) || '.webp';
    const filename = `${slug}${ext}`;
    const dir = this.getUploadDir();
    const filepath = join(dir, filename);

    writeFileSync(filepath, file.buffer);

    return { url: `/uploads/room-images/facilities/${filename}` };
  }

  /** Daftar slug fasilitas yang sudah punya foto. */
  list(): { slug: string; url: string }[] {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => /^[a-z0-9-]+\.(webp|jpg|jpeg|png)$/i.test(f));
    return files.map((f) => {
      const slug = f.replace(/\.\w+$/, '');
      return { slug, url: `/uploads/room-images/facilities/${f}` };
    });
  }

  /** Hapus foto fasilitas berdasarkan slug. */
  delete(slug: string): void {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => f.startsWith(slug + '.'));
    if (files.length === 0) throw new NotFoundException(`Foto untuk fasilitas "${slug}" tidak ditemukan.`);
    for (const f of files) unlinkSync(join(dir, f));
  }

  /** Cek apakah fasilitas punya foto. */
  exists(slug: string): boolean {
    const dir = this.getUploadDir();
    const files = readdirSync(dir).filter((f) => f.startsWith(slug + '.'));
    return files.length > 0;
  }
}
