import type { WizardFormValues } from './types';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export const STEPS = ['Tenant', 'Kamar & Sewa', 'Konfirmasi'];

export const stayPurposeOptions = [
  { value: '', label: 'Pilih tujuan tinggal...' },
  { value: 'WORK', label: 'Bekerja' },
  { value: 'STUDY', label: 'Belajar' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'FAMILY', label: 'Keluarga' },
  { value: 'MEDICAL', label: 'Medis' },
  { value: 'PROJECT', label: 'Proyek' },
  { value: 'OTHER', label: 'Lainnya' },
];

export const bookingSourceOptions = [
  { value: '', label: 'Pilih sumber booking...' },
  { value: 'GOOGLE_MAPS', label: 'Google Maps' },
  { value: 'WALK_IN', label: 'Datang Langsung' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTA', label: 'OTA' },
  { value: 'OTHER', label: 'Lainnya' },
];

export const defaultValues: WizardFormValues = {
  tenantId: null,
  roomId: null,
  pricingTerm: 'MONTHLY',
  checkInDate: today(),
  agreedRentAmountRupiah: '',
  depositAmountRupiah: '',
  stayPurpose: '',
  bookingSource: '',
  notes: '',
  initialElectricityKwh: '',
  initialWaterM3: '',
};

export function WizardSteps({ current }: { current: number }) {
  return (
    <div className="wizard-steps">
      {STEPS.map((label, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div className="wizard-step-item" key={label}>
            <div className={`wizard-step-dot ${isDone || isActive ? 'active' : ''}`}>{isDone ? '✓' : stepNum}</div>
            <span className={`wizard-step-label ${isActive ? 'active' : ''}`}>{label}</span>
            {index < STEPS.length - 1 ? <div className="wizard-step-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}