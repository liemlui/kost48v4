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
 * Normalisasi nomor WhatsApp ke bentuk internasional `62…`.
 * - `0812…` → `62812…` · `812…` → `62812…` · `+62 812…` → `62812…`
 * - nomor yang sudah `62…` dibiarkan; nomor non-Indonesia dibiarkan apa adanya.
 * Dipakai satu tempat supaya tautan WA tidak pernah menebak format nomor.
 */
export function normalizeWaPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

/**
 * Pesan pengingat manual (admin/owner → tenant) yang aman dibagikan:
 * hanya nama sapaan, topik, dan batas waktu — **tanpa NIK, foto, atau alamat**.
 * Panjang dibatasi 320 karakter supaya tetap terbaca di aplikasi WA.
 */
export function buildTenantReminderMessage(input: {
  tenantName?: string | null;
  subject: string;
  type?: string | null;
  deadlineLabel?: string | null;
}): string {
  const nama = (input.tenantName ?? '').trim();
  const sapaan = nama ? `Halo ${nama}` : 'Halo';
  const topik = input.type ? `${input.type} — ${input.subject}` : input.subject;
  const batas = input.deadlineLabel ? ` Batas: ${input.deadlineLabel}.` : '';
  const pesan = `${sapaan}, pengingat dari KOST48 Surabaya: ${topik}.${batas} Mohon balas pesan ini atau buka portal penghuni. Terima kasih.`;
  return pesan.length > 320 ? `${pesan.slice(0, 317)}...` : pesan;
}

/**
 * Bangun URL WhatsApp ke TENANT (admin/owner → penyewa) dengan pesan kustom.
 * Dipakai untuk reminder manual (mis. masa sewa habis 7 hari lagi) via deep-link.
 */
export function buildTenantWaUrl(phone: string | null | undefined, message: string): string {
  const normalized = normalizeWaPhone(phone);
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
