import type { CreatePublicBookingPayload, PricingTerm, StayPurposeOption } from '../../types';

export type GuestBookingFormState = {
  fullName: string;
  phone: string;
  email: string;
  checkInDate: string;
  pricingTerm: PricingTerm;
  identityNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  leaseDurationCount: number;
  stayPurpose: string;
  notes: string;
  website: string;
  occupantCount: number;
  hasPet: boolean;
  paymentChoice: 'DP' | 'FULL';
};

export const INITIAL_FORM: GuestBookingFormState = {
  fullName: '',
  phone: '',
  email: '',
  // AC-01: pakai waktu lokal WIB (bukan UTC) agar default tanggal tidak mundur di dini hari
  checkInDate: (() => { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); })(),
  pricingTerm: 'MONTHLY' as PricingTerm,
  identityNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  leaseDurationCount: 1,
  stayPurpose: '',
  notes: '',
  website: '',
  occupantCount: 1,
  hasPet: false,
  paymentChoice: 'DP',
};

export const stayPurposeOptions: Array<{ value: string; label: string }> = [
  { value: 'WORK', label: 'Kerja' },
  { value: 'STUDY', label: 'Studi' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'FAMILY', label: 'Keluarga' },
  { value: 'MEDICAL', label: 'Medis' },
  { value: 'PROJECT', label: 'Proyek' },
  { value: 'OTHER', label: 'Lainnya' },
];

export function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return formatDateOnly(d);
}

export function getDurationOptions(term: string): Array<{ value: number; label: string }> {
  switch (term) {
    case 'DAILY':
      return [1, 2, 3, 4, 5, 7, 10, 14].map((n) => ({ value: n, label: `${n} Hari` }));
    case 'WEEKLY':
      return [1, 2, 3, 4, 6, 8].map((n) => ({ value: n, label: `${n} Minggu` }));
    case 'BIWEEKLY':
      return [1, 2, 3, 4, 6].map((n) => ({ value: n, label: `${n} × 2 Mgg` }));
    case 'MONTHLY':
      return [1, 2, 3, 4, 6, 12].map((n) => ({ value: n, label: `${n} Bulan` }));
    case 'SMESTERLY':
      return [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} Semester` }));
    case 'YEARLY':
      return [1, 2, 3].map((n) => ({ value: n, label: `${n} Tahun` }));
    default:
      return [1, 2, 3, 4, 6, 12].map((n) => ({ value: n, label: `${n} Bulan` }));
  }
}

export function computeCheckOutDate(checkInDate: string, term: string, count: number): string {
  if (!checkInDate || count <= 0) return '';
  const date = new Date(checkInDate);
  if (isNaN(date.getTime())) return '';
  switch (term) {
    case 'DAILY':
      date.setDate(date.getDate() + count);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + count * 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + count * 14);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + count);
      break;
    case 'SMESTERLY':
      date.setMonth(date.getMonth() + count * 6);
      break;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + count);
      break;
    default:
      date.setMonth(date.getMonth() + count);
  }
  return date.toISOString().slice(0, 10);
}

export type FormErrors = Partial<Record<keyof GuestBookingFormState | 'server', string>>;

/**
 * FE-003 T1 (18 Sep 2026): payload booking publik dibangun di satu fungsi murni
 * agar kontraknya bisa diuji langsung terhadap `class-validator` backend.
 *
 * - Field opsional TIDAK dikirim sebagai string kosong: DTO backend memakai
 *   `@IsOptional()` yang hanya melewati `null`/`undefined`, sehingga `""`
 *   tetap divalidasi (`@IsEmail` gagal, `@IsEnum` gagal) dan booking ditolak 400.
 * - `phone` selalu dikirim karena memang wajib di backend
 *   (`CreatePublicBookingDto.phone` + `Tenant.phone` NOT NULL).
 * - `website` adalah honeypot anti-bot: selalu `""` (isi non-kosong ditolak service).
 */
export function buildBookingPayload(
  form: GuestBookingFormState,
  roomId: number,
  computedCheckOutDate: string,
): CreatePublicBookingPayload {
  const payload: CreatePublicBookingPayload = {
    roomId,
    checkInDate: form.checkInDate,
    pricingTerm: form.pricingTerm,
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    website: '',
  };

  const email = form.email.trim();
  if (email) payload.email = email;
  if (form.identityNumber.trim()) payload.identityNumber = form.identityNumber.trim();
  if (form.emergencyContactName.trim()) payload.emergencyContactName = form.emergencyContactName.trim();
  if (form.emergencyContactPhone.trim()) payload.emergencyContactPhone = form.emergencyContactPhone.trim();
  if (computedCheckOutDate) payload.plannedCheckOutDate = computedCheckOutDate;
  if (form.stayPurpose) payload.stayPurpose = form.stayPurpose as StayPurposeOption;
  if (form.notes.trim()) payload.notes = form.notes.trim();
  if (form.occupantCount > 1) payload.occupantCount = form.occupantCount;
  if (form.hasPet) payload.hasPet = true;
  if (form.paymentChoice) payload.paymentChoice = form.paymentChoice;

  return payload;
}

export function validateStep1(form: GuestBookingFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
  const hasPhone = form.phone.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;
  // FE-003 T1: backend mewajibkan nomor telepon (DTO `phone` + normalisasi nomor di
  // `public-bookings.service.ts`), sedangkan email benar-benar opsional bila diisi valid.
  if (!hasPhone) {
    errors.phone = 'Nomor telepon wajib diisi agar admin dapat menghubungi Anda.';
  }
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!form.identityNumber.trim()) {
    // S8 (P36 a + P35 a): pengajuan tamu memakai kontak minimum — nama, telepon, email
    // opsional. NIK BUKAN syarat mengajukan (backend `identityNumber` juga opsional;
    // NIK hanya untuk verifikasi KTP saat/sesudah check-in). Bila diisi, tetap divalidasi.
  } else if (!/^\d{16}$/.test(form.identityNumber.trim())) {
    errors.identityNumber = 'NIK harus tepat 16 digit angka.';
  }
  return errors;
}

export function validateStep2(form: GuestBookingFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.checkInDate) errors.checkInDate = 'Tanggal check-in wajib diisi.';
  if (!form.pricingTerm) errors.pricingTerm = 'Pilih term harga.';
  return errors;
}

export function validate(form: GuestBookingFormState): FormErrors {
  return { ...validateStep1(form), ...validateStep2(form) };
}

/**
 * S8 — arti galat `POST /public/bookings` untuk layar pengajuan.
 *
 * Backend menjawab **503** saat `PUBLIC_ONLINE_BOOKING_ENABLED` mati atau skema booking
 * belum siap (lihat `public-bookings.service.ts`). 503 bukan salah isian pengguna: layar
 * harus menawarkan jalan keluar (WhatsApp admin), bukan hanya pesan galat di form.
 */
export type PublicBookingErrorInfo = {
  message: string;
  /** true = booking online sedang ditutup/503 → tampilkan jalan keluar WhatsApp. */
  onlineBookingClosed: boolean;
};

const DEFAULT_PUBLIC_BOOKING_ERROR = 'Booking gagal dibuat. Silakan coba lagi.';
const CLOSED_PUBLIC_BOOKING_MESSAGE =
  'Booking online sedang ditutup. Kamu tetap bisa menghubungi admin KOST48 lewat WhatsApp untuk cek kamar dan reservasi.';

function readErrorBody(err: unknown) {
  if (!err || typeof err !== 'object') return { status: undefined as number | undefined, message: undefined as string | undefined };
  const withResponse = err as {
    response?: { status?: number; data?: { message?: string | string[]; statusCode?: number } };
    status?: number;
  };
  const rawMessage = withResponse.response?.data?.message;
  return {
    status: withResponse.response?.status ?? withResponse.response?.data?.statusCode ?? withResponse.status,
    message: Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage,
  };
}

export function describePublicBookingError(err: unknown): PublicBookingErrorInfo {
  const { status, message } = readErrorBody(err);
  if (status === 503) {
    return {
      message: message?.trim() ? message : CLOSED_PUBLIC_BOOKING_MESSAGE,
      onlineBookingClosed: true,
    };
  }
  return {
    message: message?.trim() ? message : DEFAULT_PUBLIC_BOOKING_ERROR,
    onlineBookingClosed: false,
  };
}
import { formatDateOnly } from '../../utils/dateTime';
