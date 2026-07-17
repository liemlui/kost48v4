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
    it('NIK wajib diisi', () => {
      expect(validateStep1(form({ fullName: 'Budi', phone: '0811', identityNumber: '' })).identityNumber).toBeTruthy();
    });
    it('data valid → tanpa error', () => {
      const e = validateStep1(form({ fullName: 'Budi', phone: '08123456789', email: 'budi@mail.com', identityNumber: '1234567890123456' }));
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
