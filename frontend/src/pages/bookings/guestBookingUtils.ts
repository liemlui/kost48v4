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
  if (!form.phone.trim()) errors.phone = 'Nomor telepon wajib diisi.';
  if (!form.email.trim()) {
    errors.email = 'Email wajib diisi.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Format email tidak valid.';
  }
  if (!form.checkInDate) errors.checkInDate = 'Tanggal check-in wajib diisi.';
  if (!form.pricingTerm) errors.pricingTerm = 'Pilih term harga.';
  if (form.plannedCheckOutDate && form.plannedCheckOutDate < form.checkInDate) {
    errors.plannedCheckOutDate = 'Rencana check-out tidak boleh sebelum check-in.';
  }
  return errors;
}