import { describe, expect, it } from 'vitest';
import { ROOM_DISPLAY_CODE_PREFIX, roomDisplayCode } from '../../utils/publicRoomDisplay';

/**
 * S4 (23 Okt 2026) — label "Kmr X".
 * Yang diuji: helper tampilan, BUKAN data. `Room.code` tetap "A"/"F1".
 */
describe('roomDisplayCode — label kamar publik "Kmr X"', () => {
  it('kode biasa menjadi "Kmr <kode>"', () => {
    expect(roomDisplayCode('A')).toBe('Kmr A');
    expect(roomDisplayCode('B')).toBe('Kmr B');
    expect(roomDisplayCode('F1')).toBe('Kmr F1');
    expect(roomDisplayCode('F2')).toBe('Kmr F2');
    expect(ROOM_DISPLAY_CODE_PREFIX).toBe('Kmr');
  });

  it('spasi aneh dirapikan (awal, akhir, ganda) tanpa mengubah isi kode', () => {
    expect(roomDisplayCode(' A ')).toBe('Kmr A');
    expect(roomDisplayCode('F1  ')).toBe('Kmr F1');
    expect(roomDisplayCode('\tF2\n')).toBe('Kmr F2');
    expect(roomDisplayCode('A   01')).toBe('Kmr A 01');
  });

  it('kode kosong / null / undefined → fallback pemanggil, bukan "Kmr " menggantung', () => {
    for (const empty of ['', '   ', '\t\n', null, undefined]) {
      expect(roomDisplayCode(empty)).toBe('');
      expect(roomDisplayCode(empty, 'Kamar 7')).toBe('Kamar 7');
    }
  });

  it('tidak pernah mengembalikan prefix tanpa kode', () => {
    for (const value of ['', '  ', null, undefined]) {
      expect(roomDisplayCode(value).trim()).not.toBe(ROOM_DISPLAY_CODE_PREFIX);
      expect(roomDisplayCode(value)).not.toMatch(/Kmr\s*$/);
    }
  });

  it('tidak mengubah data kamar: kode asli tetap apa adanya', () => {
    const code = 'F1';
    expect(roomDisplayCode(code)).toBe('Kmr F1');
    expect(code).toBe('F1');
  });

  it('angka (kode numerik) tetap bisa ditampilkan', () => {
    expect(roomDisplayCode(12)).toBe('Kmr 12');
  });
});
