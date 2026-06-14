// F3-19: SLA per kategori tiket. `dueAt = assignedAt + window`.
// Angka disetujui owner 2026-06-14 (24 jam / 3 hari / 7 hari). Mudah diubah di sini.

export const TICKET_SLA_HOURS: Record<string, number> = {
  // 24 jam — mendesak (keselamatan/akses)
  EMERGENCY: 24,
  SECURITY: 24,
  KUNCI: 24,
  // 3 hari (72 jam) — perbaikan & kebersihan
  KERUSAKAN: 72,
  MAINTENANCE: 72,
  KEBERSIHAN: 72,
  CHECKOUT_INSPECTION: 72,
  // 7 hari (168 jam) — administratif/inventaris
  INVENTARIS: 168,
  AUDIT_INVENTARIS: 168,
  PEMERIKSAAN: 168,
  BARANG_PINDAH: 168,
  EVICT_OVERSTAY: 168,
};

export const TICKET_SLA_DEFAULT_HOURS = 168; // 7 hari untuk kategori tak terpetakan

export function ticketSlaHours(category: string | null | undefined): number {
  if (category && category in TICKET_SLA_HOURS) return TICKET_SLA_HOURS[category];
  return TICKET_SLA_DEFAULT_HOURS;
}

/** Hitung batas SLA dari titik penugasan. */
export function computeTicketDueAt(
  category: string | null | undefined,
  from: Date,
): Date {
  return new Date(from.getTime() + ticketSlaHours(category) * 60 * 60 * 1000);
}
