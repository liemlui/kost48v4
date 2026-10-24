import { describe, it, expect } from 'vitest';
import { INITIAL_FORM, validateStep1, validateStep2, validate } from '../../pages/bookings/guestBookingUtils';

function form(overrides: Partial<typeof INITIAL_FORM> = {}) {
  return { ...INITIAL_FORM, ...overrides };
}

describe('Y-M2 — guest booking validation (KTP/email/phone)', () => {
  describe('validateStep1', () => {
    it('nama kosong → error fullName', () => {
      expect(validateStep1(form({ fullName: '' })).fullName).toBeTruthy();
    });
    it('tanpa phone & email → satu pesan pada field kontak pertama', () => {
      const e = validateStep1(form({ fullName: 'Budi', phone: '', email: '', identityNumber: '1234567890123456' }));
      expect(e.phone).toBeTruthy();
      expect(e.email).toBeUndefined();
    });
    it('email format salah → error email', () => {
      const e = validateStep1(form({ fullName: 'Budi', email: 'bukan-email', identityNumber: '1234567890123456' }));
      expect(e.email).toMatch(/tidak valid/i);
    });
    it('NIK bukan 16 digit → error identityNumber', () => {
      expect(validateStep1(form({ fullName: 'Budi', phone: '0811', identityNumber: '123' })).identityNumber).toMatch(/16 digit/i);
    });
    // S8 (P36 a + P35 a): NIK BUKAN syarat mengajukan — tamu boleh mengajukan dengan kontak
    // minimum (nama + telepon, email opsional). NIK hanya untuk verifikasi KTP kemudian;
    // backend juga memperlakukan `identityNumber` sebagai opsional.
    it('NIK boleh kosong (kontak minimum: nama + telepon)', () => {
      expect(validateStep1(form({ fullName: 'Budi', phone: '0811', identityNumber: '' })).identityNumber).toBeUndefined();
    });
    it('pengajuan minimum tanpa email & tanpa NIK → tanpa error', () => {
      expect(Object.keys(validateStep1(form({ fullName: 'Budi', phone: '08123456789', email: '', identityNumber: '' })))).toHaveLength(0);
    });
    it('data valid → tanpa error', () => {
      const e = validateStep1(form({ fullName: 'Budi', phone: '08123456789', email: 'budi@mail.com', identityNumber: '1234567890123456' }));
      expect(Object.keys(e)).toHaveLength(0);
    });
    // FE-003 T1: backend mewajibkan telepon (DTO `phone` + normalisasi nomor), email opsional.
    it('email saja tanpa telepon → error phone (kontrak backend wajib telepon)', () => {
      const e = validateStep1(form({ fullName: 'Budi', phone: '', email: 'budi@mail.com', identityNumber: '1234567890123456' }));
      expect(e.phone).toBeTruthy();
      expect(e.email).toBeUndefined();
    });
    it('telepon saja tanpa email → tanpa error', () => {
      const e = validateStep1(form({ fullName: 'Budi', phone: '08123456789', email: '', identityNumber: '1234567890123456' }));
      expect(Object.keys(e)).toHaveLength(0);
    });
  });

  describe('validateStep2', () => {
    it('checkInDate kosong → error', () => {
      expect(validateStep2(form({ checkInDate: '' })).checkInDate).toBeTruthy();
    });
  });

  describe('validate (gabungan)', () => {
    it('menggabungkan error step1 + step2', () => {
      const e = validate(form({ fullName: '', checkInDate: '' }));
      expect(e.fullName).toBeTruthy();
      expect(e.checkInDate).toBeTruthy();
    });
  });
});
