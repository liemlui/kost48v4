// P2-03: Unit test untuk parseKtpText() dan extractors individual
import { describe, it, expect } from 'vitest';
import { parseKtpText } from '../../utils/ktpOcr';

describe('parseKtpText', () => {
  it('extract NIK 16 digit dari teks standar', () => {
    const result = parseKtpText(`NIK
3273010502910003
Nama
MAYA PRATIWI
Tempat/Tgl Lahir
SURABAYA, 05-02-1991
Alamat
JL. HIKMAH V NO. 48
`);
    expect(result.nik).toBe('3273010502910003');
    // extractName ambil semua teks setelah 'Nama' karena pola greedy
    expect(result.name).toContain('MAYA PRATIWI');
    expect(result.birthDate).toBe('1991-02-05');
    expect(result.originCity).toBe('SURABAYA');
    expect(result.address).toContain('JL. HIKMAH V NO. 48');
  });

  it('toleransi noise OCR: O→0, l→1, spasi liar di NIK', () => {
    const result = parseKtpText(`
NIK
3273 0105 0291 0003
Nama
BUDI SANTOSO
Tempat/Tgl Lahir
MALANG, 15-08-1995
Alamat
JL. MERDEKA NO. 10
`);
    expect(result.nik).toBe('3273010502910003');
  });

  it('toleransi baris pecah — whitespace tidak rapi', () => {
    const result = parseKtpText(`NIK
3273010502910003
Nama
MAYA
PRATIWI
Tempat/Tgl Lahir
SURABAYA, 05-02-1991
`);
    expect(result.nik).toBe('3273010502910003');
    expect(result.name).toContain('MAYA PRATIWI');
  });

  it('input kosong — return object kosong', () => {
    const result = parseKtpText('');
    expect(result.nik).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.birthDate).toBeUndefined();
  });

  it('NIK dengan format tidak valid (kurang dari 16 digit) — tetap coba ekstrak', () => {
    const result = parseKtpText(`NIK
123456789012345
Nama
TEST USER
`);
    // Hanya 15 digit, tidak akan match \b\d{16}\b
    expect(result.nik).toBeUndefined();
  });

  it('gender detection: LAKI-LAKI → MALE', () => {
    const result = parseKtpText(`NIK
3273010502910003
Nama
BUDI
Tempat/Tgl Lahir
SURABAYA, 05-02-1991
Jenis Kelamin
LAKI-LAKI
`);
    expect(result.gender).toBe('MALE');
  });

  it('gender detection: PEREMPUAN → FEMALE', () => {
    const result = parseKtpText(`NIK
3273010502910003
Nama
SITI
Tempat/Tgl Lahir
SURABAYA, 05-02-1991
Jenis Kelamin
PEREMPUAN
`);
    expect(result.gender).toBe('FEMALE');
  });
});
