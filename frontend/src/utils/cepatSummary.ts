/**
 * Ringkasan Mode Cepat untuk WhatsApp/cetak (AIDL-05).
 *
 * Batas privasi yang disengaja: hanya field yang aman yang masuk ringkasan
 * (prioritas, jenis, subjek, aksi). `issue`, `sourceRefs`, dan field bebas lain
 * TIDAK diambil. NIK 16 digit dan petunjuk alamat disamarkan; foto identitas
 * tidak pernah punya jalur masuk karena tidak ada field-nya di ringkasan.
 */
import type { ActionQueueItem } from '../components/command-center/ActionQueueTable';
import type { UserRole } from '../types';

export const CEPAT_SUMMARY_VERSION = 'KOST48-CEPAT/1';
export const CEPAT_SUMMARY_MAX_LENGTH = 1200;

const PRIORITY_LABEL: Record<string, string> = {
  BLOCKER: 'BLOCKER',
  HIGH: 'TINGGI',
  MEDIUM: 'SEDANG',
  WARNING: 'PERHATIAN',
  OPPORTUNITY: 'PELUANG',
  INFO: 'INFO',
  SUCCESS: 'AMAN',
};

const ADDRESS_HINT = /\b(?:jl\.?|jalan|gg\.?|gang|kelurahan|kecamatan|kabupaten|kota|rt\.?\s*\d|rw\.?\s*\d)\b/i;

/** Bersihkan satu field: rapikan spasi, samarkan NIK/alamat, batasi panjang. */
export function sanitizeCepatSummaryField(value: unknown, maxLength = 120): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  const withoutNik = text.replace(/\b\d{16}\b/g, '[NIK disamarkan]');
  if (ADDRESS_HINT.test(withoutNik)) return '[alamat disamarkan]';
  return withoutNik.length > maxLength ? `${withoutNik.slice(0, Math.max(0, maxLength - 1))}…` : withoutNik;
}

function formatStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}.${pick('minute')}`;
}

export function buildCepatSummaryText(input: {
  role: UserRole;
  items: ActionQueueItem[];
  date?: Date;
  maxLength?: number;
}): string {
  const items = input.items ?? [];
  const shown = items.slice(0, 20);
  const high = items.filter((item) => item.priority === 'HIGH' || item.priority === 'BLOCKER').length;
  const medium = items.filter((item) => item.priority === 'MEDIUM').length;
  const other = items.length - high - medium;

  const lines = [
    CEPAT_SUMMARY_VERSION,
    `Ringkasan Mode Cepat · ${input.role} · ${formatStamp(input.date ?? new Date())} WIB`,
    `Total ${items.length} kartu · tinggi ${high} · sedang ${medium} · lainnya ${other}`,
  ];

  shown.forEach((item, index) => {
    const priority = PRIORITY_LABEL[item.priority] ?? item.priority;
    const type = sanitizeCepatSummaryField(item.type, 40);
    const subject = sanitizeCepatSummaryField(item.subject, 90);
    const action = sanitizeCepatSummaryField(item.recommendedAction, 50);
    lines.push(`${index + 1}. [${priority}] ${type} · ${subject} → ${action}`);
  });

  if (items.length > shown.length) lines.push(`…dan ${items.length - shown.length} kartu lain.`);

  let text = lines.join('\n');
  const max = input.maxLength ?? CEPAT_SUMMARY_MAX_LENGTH;
  if (text.length > max) {
    const suffix = '\n…dipotong; buka aplikasi untuk daftar lengkap.';
    text = text.slice(0, Math.max(0, max - suffix.length)).trimEnd() + suffix;
  }
  return text;
}
