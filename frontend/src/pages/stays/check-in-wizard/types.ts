export type TenantOption = { label: string; value: number };

export type InlineTenantState = {
  fullName: string;
  phone: string;
  email: string;
  gender: string;
};

export type WizardFormValues = {
  tenantId: number | null;
  roomId: number | null;
  pricingTerm: string;
  checkInDate: string;
  agreedRentAmountRupiah: number | string;
  depositAmountRupiah: number | string;
  occupantCount: number | string;
  hasPet: boolean;
  stayPurpose: string;
  bookingSource: string;
  notes: string;
  initialElectricityKwh: string;
  initialWaterM3: string;
  // Audit E-3: jaminan diterima tunai saat check-in.
  depositCollected?: boolean;
};
