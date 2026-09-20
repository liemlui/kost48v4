import { describe, it, expect } from 'vitest';
import { INITIAL_FORM, buildBookingPayload } from '../../pages/bookings/guestBookingUtils';
import type { GuestBookingFormState } from '../../pages/bookings/guestBookingUtils';

// FE-003 T1 (18 Sep 2026): payload booking publik tidak boleh mengirim field opsional
// sebagai "" karena DTO backend memakai @IsOptional() yang hanya melewati null/undefined.
function baseForm(overrides: Partial<GuestBookingFormState> = {}): GuestBookingFormState {
  return {
    ...INITIAL_FORM,
    fullName: 'Budi Santoso',
    phone: '0812-3456-7890',
    identityNumber: '1234567890123456',
    checkInDate: '2026-10-01',
    ...overrides,
  };
}

describe('FE-003 T1 — buildBookingPayload (kontrak CreatePublicBookingDto)', () => {
  it('telepon saja: email tidak ikut dikirim (bukan "")', () => {
    const payload = buildBookingPayload(baseForm({ email: '   ' }), 7, '2026-11-01');
    expect('email' in payload).toBe(false);
    expect(payload.email).toBeUndefined();
    expect(payload.phone).toBe('0812-3456-7890');
    expect(payload.roomId).toBe(7);
  });

  it('email terisi: dikirim setelah trim', () => {
    const payload = buildBookingPayload(baseForm({ email: '  budi@mail.com ' }), 7, '2026-11-01');
    expect(payload.email).toBe('budi@mail.com');
  });

  it('honeypot website selalu "" dan tidak pernah ikut terisi', () => {
    const payload = buildBookingPayload(baseForm({ website: 'spam-link' }), 7, '2026-11-01');
    expect(payload.website).toBe('');
  });

  it('field opsional kosong tidak dikirim sama sekali', () => {
    const payload = buildBookingPayload(
      baseForm({
        identityNumber: '',
        stayPurpose: '',
        notes: '  ',
        emergencyContactName: '',
        emergencyContactPhone: '',
      }),
      7,
      '',
    );
    expect('stayPurpose' in payload).toBe(false);
    expect('notes' in payload).toBe(false);
    expect('emergencyContactName' in payload).toBe(false);
    expect('emergencyContactPhone' in payload).toBe(false);
    expect('plannedCheckOutDate' in payload).toBe(false);
    expect('identityNumber' in payload).toBe(false);
    expect('occupantCount' in payload).toBe(false);
    expect('hasPet' in payload).toBe(false);
  });

  it('field opsional terisi ikut dikirim apa adanya (trim/normalisasi)', () => {
    const payload = buildBookingPayload(
      baseForm({
        stayPurpose: 'WORK',
        notes: '  dekat kampus  ',
        emergencyContactName: ' Siti ',
        emergencyContactPhone: ' 0812000000 ',
        occupantCount: 3,
        hasPet: true,
      }),
      7,
      '2026-11-01',
    );
    expect(payload.stayPurpose).toBe('WORK');
    expect(payload.notes).toBe('dekat kampus');
    expect(payload.emergencyContactName).toBe('Siti');
    expect(payload.emergencyContactPhone).toBe('0812000000');
    expect(payload.plannedCheckOutDate).toBe('2026-11-01');
    expect(payload.occupantCount).toBe(3);
    expect(payload.hasPet).toBe(true);
    expect(payload.paymentChoice).toBe(INITIAL_FORM.paymentChoice);
  });
});
