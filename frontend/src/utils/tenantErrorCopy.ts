const replacements: Array<[RegExp, string]> = [
  [/checkout request/gi, 'pengajuan keluar'],
  [/checkout/gi, 'keluar'],
  [/renew request/gi, 'pengajuan perpanjangan'],
  [/payment submission/gi, 'bukti pembayaran'],
  [/invoice/gi, 'tagihan'],
  [/stay/gi, 'masa sewa'],
  [/periodEnd/gi, 'akhir masa sewa'],
  [/ISSUED/g, 'belum dibayar'],
  [/PENDING_REVIEW/g, 'sedang diperiksa'],
  [/DRAFT/g, 'sedang disiapkan admin'],
  [/PAID/g, 'lunas'],
  [/CANCELLED/g, 'dibatalkan'],
  [/lifecycle/gi, 'proses'],
  [/mutation/gi, 'perubahan data'],
];

function pickRawMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as any)?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(', ');
  if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage;
  const normalMessage = (error as Error)?.message;
  if (typeof normalMessage === 'string' && normalMessage.trim()) return normalMessage;
  return fallback;
}

export function toTenantFriendlyError(error: unknown, fallback: string): string {
  let message = pickRawMessage(error, fallback);
  for (const [pattern, replacement] of replacements) {
    message = message.replace(pattern, replacement);
  }
  return message;
}
