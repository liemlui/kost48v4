import type { PricingTerm } from '../../types';

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

export function validateStep1(form: GuestBookingFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
  const hasPhone = form.phone.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;
  if (!hasPhone && !hasEmail) {
    errors.phone = 'Masukkan nomor telepon atau email agar admin dapat menghubungi Anda.';
  }
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!form.identityNumber.trim()) {
    errors.identityNumber = 'Nomor KTP/NIK wajib diisi untuk booking.';
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
import { formatDateOnly } from '../../utils/dateTime';
