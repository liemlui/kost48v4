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
  plannedCheckOutDate: string;
  stayPurpose: string;
  notes: string;
  website: string;
};

export const INITIAL_FORM: GuestBookingFormState = {
  fullName: '',
  phone: '',
  email: '',
  checkInDate: new Date().toISOString().slice(0, 10),
  pricingTerm: 'MONTHLY' as PricingTerm,
  identityNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  plannedCheckOutDate: '',
  stayPurpose: '',
  notes: '',
  website: '',
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
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export type FormErrors = Partial<Record<keyof GuestBookingFormState | 'server', string>>;

export function validate(form: GuestBookingFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
  // PUB-BOOKING-FORM: phone XOR email — minimal salah satu wajib diisi.
  const hasPhone = form.phone.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;
  if (!hasPhone && !hasEmail) {
    errors.phone = 'Minimal isi nomor telepon atau email.';
    errors.email = 'Minimal isi nomor telepon atau email.';
  }
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!form.checkInDate) errors.checkInDate = 'Tanggal check-in wajib diisi.';
  if (!form.pricingTerm) errors.pricingTerm = 'Pilih term harga.';
  // PUB-BOOKING-FORM: KTP/NIK opsional saat booking (diverifikasi saat aktivasi).
  // Jika diisi, wajib 16 digit.
  if (form.identityNumber.trim() && !/^\d{16}$/.test(form.identityNumber.trim())) {
    errors.identityNumber = 'Jika diisi, Nomor KTP/NIK harus tepat 16 digit angka.';
  }
  if (form.plannedCheckOutDate && form.plannedCheckOutDate <= form.checkInDate) {
    errors.plannedCheckOutDate = 'Tanggal renew/keluar harus setelah check-in.';
  }
  return errors;
}