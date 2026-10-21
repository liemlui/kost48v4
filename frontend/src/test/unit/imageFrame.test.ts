import { describe, it, expect } from 'vitest';
import {
  FRAME_COVER_MAX_RATIO,
  FRAME_COVER_MIN_RATIO,
  UPLOAD_RATIO_GUIDES,
  evaluateUploadRatio,
  frameModeForDimensions,
  frameModeForRatio,
  imageRatio,
} from '../../utils/imageFrame';

describe('imageFrame — frameModeForRatio', () => {
  it('rasio dekat frame tetap cover (perilaku lama)', () => {
    expect(frameModeForRatio(4 / 3)).toBe('cover');
    expect(frameModeForRatio(3 / 2)).toBe('cover');
    expect(frameModeForRatio(16 / 9)).toBe('cover');
    expect(frameModeForRatio(1)).toBe('cover');
    expect(frameModeForRatio(FRAME_COVER_MIN_RATIO)).toBe('cover');
    expect(frameModeForRatio(FRAME_COVER_MAX_RATIO)).toBe('cover');
  });

  it('potret dan panorama ekstrem memakai contain', () => {
    expect(frameModeForRatio(0.89)).toBe('contain');
    expect(frameModeForRatio(4 / 5)).toBe('contain');
    expect(frameModeForRatio(9 / 16)).toBe('contain');
    expect(frameModeForRatio(1.91)).toBe('contain');
    expect(frameModeForRatio(21 / 9)).toBe('contain');
  });

  it('rasio tak terbaca tidak mengubah perilaku lama', () => {
    expect(frameModeForRatio(null)).toBe('cover');
    expect(frameModeForRatio(undefined)).toBe('cover');
    expect(frameModeForRatio(0)).toBe('cover');
    expect(frameModeForRatio(-2)).toBe('cover');
    expect(frameModeForRatio(Number.NaN)).toBe('cover');
  });
});

describe('imageFrame — imageRatio', () => {
  it('menghitung lebar/tinggi', () => {
    expect(imageRatio(1200, 900)).toBeCloseTo(4 / 3, 5);
    expect(imageRatio(900, 1200)).toBeCloseTo(0.75, 5);
  });

  it('dimensi tidak valid → null', () => {
    expect(imageRatio(0, 900)).toBeNull();
    expect(imageRatio(1200, 0)).toBeNull();
    expect(imageRatio(null, 900)).toBeNull();
    expect(imageRatio(undefined, undefined)).toBeNull();
    expect(imageRatio(Number.NaN, 900)).toBeNull();
  });
});

describe('imageFrame — frameModeForDimensions', () => {
  it('meneruskan hasil pembacaan dimensi ke mode frame', () => {
    expect(frameModeForDimensions(1600, 1200)).toBe('cover');
    expect(frameModeForDimensions(1200, 2400)).toBe('contain');
    expect(frameModeForDimensions(0, 0)).toBe('cover');
  });
});

describe('imageFrame — evaluateUploadRatio', () => {
  it('rasio kartu kamar yang tepat dinilai cocok', () => {
    const verdict = evaluateUploadRatio(1600, 1200, 'room-card');
    expect(verdict.status).toBe('ok');
    expect(verdict.ratioLabel).toBe('1.33:1');
    expect(verdict.dimensionLabel).toBe('1600 × 1200');
    expect(verdict.message).toContain('cocok untuk kartu kamar');
  });

  it('foto potret untuk kartu kamar → peringatan, bukan penolakan', () => {
    const verdict = evaluateUploadRatio(1000, 2000, 'room-card');
    expect(verdict.status).toBe('warn');
    expect(verdict.guide.ratioText).toBe('4:3 mendatar');
    expect(verdict.message).toContain('kurang ideal');
    expect(verdict.message).toContain('disarankan 4:3 mendatar');
  });

  it('rasio benar tetapi resolusi kecil → peringatan resolusi', () => {
    const verdict = evaluateUploadRatio(600, 450, 'room-card');
    expect(verdict.status).toBe('warn');
    expect(verdict.message).toContain('Resolusi 600 × 450');
    expect(verdict.message).toContain('1200 × 900');
  });

  it('brosur A4 potret diterima sebagai rasio sah galeri', () => {
    const verdict = evaluateUploadRatio(1240, 1754, 'gallery');
    expect(verdict.status).toBe('ok');
    expect(verdict.message).toContain('halaman brosur A4 potret');
  });

  it('foto 4:3 untuk hero layar lebar → peringatan', () => {
    const verdict = evaluateUploadRatio(1600, 1200, 'hero');
    expect(verdict.status).toBe('warn');
    expect(verdict.message).toContain('16:9 mendatar');
  });

  it('aset marketing menerima hero 16:9 dan brosur potret sekaligus', () => {
    expect(evaluateUploadRatio(1920, 1080, 'marketing').status).toBe('ok');
    expect(evaluateUploadRatio(1240, 1754, 'marketing').status).toBe('ok');
    expect(evaluateUploadRatio(3000, 500, 'marketing').status).toBe('warn');
  });

  it('ukuran tidak terbaca → unknown, tetap menyebut saran rasio', () => {
    const verdict = evaluateUploadRatio(null, undefined, 'facility');
    expect(verdict.status).toBe('unknown');
    expect(verdict.ratioLabel).toBe('tidak diketahui');
    expect(verdict.message).toContain('1:1 persegi');
  });

  it('setiap target punya panduan yang bisa ditampilkan panel upload', () => {
    expect(Object.keys(UPLOAD_RATIO_GUIDES).sort()).toEqual(
      ['facility', 'gallery', 'hero', 'marketing', 'room-card', 'room-detail'],
    );
    for (const guide of Object.values(UPLOAD_RATIO_GUIDES)) {
      expect(guide.ratioText.length).toBeGreaterThan(0);
      expect(guide.note.length).toBeGreaterThan(0);
      expect(guide.minWidth).toBeGreaterThan(0);
      expect(guide.minHeight).toBeGreaterThan(0);
    }
  });
});
