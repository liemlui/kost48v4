// S8 — arti galat `POST /public/bookings` untuk layar pengajuan.
// 503 = booking online ditutup / skema belum siap (backend `public-bookings.service.ts`),
// bukan salah isian pengguna → layar wajib menawarkan jalan keluar WhatsApp.
import { describe, it, expect } from 'vitest';
import { describePublicBookingError } from '../../pages/bookings/guestBookingUtils';

describe('S8 — describePublicBookingError', () => {
  it('503 memakai pesan server apa adanya dan menandai booking online ditutup', () => {
    const info = describePublicBookingError({
      response: {
        status: 503,
        data: {
          message:
            'Booking online sedang dinonaktifkan. Silakan hubungi admin KOST48 melalui WhatsApp untuk cek dan reservasi kamar.',
        },
      },
    });

    expect(info.onlineBookingClosed).toBe(true);
    expect(info.message).toMatch(/dinonaktifkan/i);
  });

  it('503 tanpa pesan tetap punya kalimat jalan keluar, bukan pesan kosong', () => {
    const info = describePublicBookingError({ response: { status: 503, data: {} } });

    expect(info.onlineBookingClosed).toBe(true);
    expect(info.message).toMatch(/whatsapp/i);
  });

  it('galat validasi (400) TIDAK dianggap booking ditutup', () => {
    const info = describePublicBookingError({
      response: { status: 400, data: { message: 'Minimal isi nomor telepon atau email.' } },
    });

    expect(info.onlineBookingClosed).toBe(false);
    expect(info.message).toBe('Minimal isi nomor telepon atau email.');
  });

  it('galat jaringan tanpa respons memakai pesan umum', () => {
    const info = describePublicBookingError(new Error('Network Error'));

    expect(info.onlineBookingClosed).toBe(false);
    expect(info.message).toBe('Booking gagal dibuat. Silakan coba lagi.');
  });
});
