export interface MeterNoInvoiceInput {
  hasPreviousElectricity: boolean;
  electricityChargeableKwh: number;
  electricityTariffRupiah: number;
  waterChargeableM3: number;
  waterTariffRupiah: number;
}

/**
 * Pesan saat tidak ada InvoiceLine meter. Membedakan "pemakaian dalam jatah
 * gratis" dari "tarif 0 sehingga tagihan tidak dibuat" — kasus kedua adalah
 * kegagalan senyap yang harus terlihat oleh admin, bukan dikaburkan.
 */
export function buildMeterNoInvoiceMessage(input: MeterNoInvoiceInput): string {
  if (input.electricityChargeableKwh > 0 && input.electricityTariffRupiah <= 0) {
    return `Pemakaian listrik ${input.electricityChargeableKwh.toFixed(2)} kWh melebihi jatah gratis, tetapi tarif listrik 0 — tagihan meter tidak dibuat. Atur tarif listrik kamar atau pengaturan.`;
  }
  if (input.waterChargeableM3 > 0 && input.waterTariffRupiah <= 0) {
    return `Pemakaian air ${input.waterChargeableM3.toFixed(2)} m³ melebihi jatah gratis, tetapi tarif air 0 — tagihan meter tidak dibuat. Atur tarif air kamar atau pengaturan.`;
  }
  return input.hasPreviousElectricity
    ? 'Pemakaian dalam jatah gratis — tidak ada tagihan meter.'
    : 'Catatan meter pertama tersimpan (belum ada selisih untuk ditagih).';
}
