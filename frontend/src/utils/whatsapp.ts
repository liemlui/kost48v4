// FILE: whatsapp.ts — pembangun URL WhatsApp terpusat
const ADMIN_WHATSAPP = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');

/** Bangun URL WhatsApp ke admin KOST48 dengan pesan kustom */
export function buildAdminWaUrl(message: string): string {
  return ADMIN_WHATSAPP
    ? `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Bangun URL WhatsApp untuk menanyakan ketersediaan kamar tertentu */
export function buildRoomWaUrl(roomCode: string, customMessage?: string): string {
  const msg = customMessage ?? `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Boleh tanya ketersediaan dan estimasi siap huni?`;
  return buildAdminWaUrl(msg);
}

/** Bangun URL WhatsApp untuk menanyakan ketersediaan (dengan konteks booking) */
export function buildAvailabilityWaUrl(roomCode: string, isChecking = false): string {
  const msg = isChecking
    ? `Halo Admin KOST48, saya ingin mengecek ketersediaan kamar ${roomCode}. Apakah masih bisa dibooking?`
    : `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Kapan kira-kira kamar ini bisa tersedia?`;
  return buildAdminWaUrl(msg);
}

/**
 * Bangun URL WhatsApp ke TENANT (admin/owner → penyewa) dengan pesan kustom.
 * Dipakai untuk reminder manual (mis. masa sewa habis 7 hari lagi) via deep-link.
 */
export function buildTenantWaUrl(phone: string | null | undefined, message: string): string {
  const normalized = (phone ?? '').replace(/\D/g, '');
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
