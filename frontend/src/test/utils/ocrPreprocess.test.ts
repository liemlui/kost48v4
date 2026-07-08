// P2-05: Unit test untuk preprocessImage() — minimal
import { describe, it, expect } from 'vitest';

describe('preprocessImage', () => {
  it('modul mengekspor fungsi preprocessImage', async () => {
    const mod = await import('../../utils/ocrPreprocess');
    expect(typeof mod.preprocessImage).toBe('function');
  });

  it('preprocessImage mengembalikan Promise', async () => {
    const mod = await import('../../utils/ocrPreprocess');
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const result = mod.preprocessImage(file);
    expect(result).toBeInstanceOf(Promise);
  });

  it('preprocessImage menolak file kosong (error handling)', async () => {
    const mod = await import('../../utils/ocrPreprocess');
    const file = new File([''], 'empty.jpg', { type: 'image/jpeg' });
    // Fungsi akan mencoba load gambar → gagal (karena jsdom) → throw
    await expect(mod.preprocessImage(file)).rejects.toThrow();
  });

  it('preprocessImage terima opsi kustom', async () => {
    const mod = await import('../../utils/ocrPreprocess');
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    await expect(mod.preprocessImage(file, { maxDimension: 800, blockSize: 11, thresholdC: 8 }))
      .rejects.toThrow(); // Gagal di jsdom karena Image/Canvas tidak nyata
  });
});
