// PUB-KTP-OCR: ekstrak NIK (16 digit) & Nama dari teks hasil OCR KTP.
// Heuristik sederhana; hasil = saran yang HARUS diperiksa/dikoreksi user.

export type KtpOcrResult = { nik?: string; name?: string };

export function parseKtpText(text: string): KtpOcrResult {
  const out: KtpOcrResult = {};
  if (!text) return out;

  // NIK: 16 digit beruntun. Ganti non-digit jadi spasi agar tak menyambung
  // angka lain (tanggal/RT-RW) menjadi 16-run palsu.
  const spaced = text.replace(/[^0-9]/g, ' ');
  const nik = spaced.match(/\d{16}/);
  if (nik) out.nik = nik[0];

  // Nama: cari baris berisi "Nama" lalu ambil teks setelah ":" / spasi.
  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(/nama\s*[:.\-]?\s*(.+)/i);
    if (m) {
      const cleaned = m[1]
        .replace(/[^A-Za-z\s'.\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length >= 2) {
        out.name = cleaned.slice(0, 60);
        break;
      }
    }
  }
  return out;
}
