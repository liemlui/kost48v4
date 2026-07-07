// KTP-OCR-PARSER: Ekstrak data KTP Indonesia dari teks hasil OCR (Tesseract).
// Heuristik dirancang untuk toleransi tinggi terhadap noise OCR —
// karakter salah baca, spasi liar, huruf tertukar (O↔0, I↔l↔1).
//
// SEMUA hasil adalah SARAN yang HARUS diperiksa/dikoreksi user.
// Tidak ada data dikirim ke server dari modul ini.

export interface KtpOcrResult {
  /** NIK 16 digit */
  nik?: string;
  /** Nama lengkap (dari label "Nama") */
  name?: string;
  /** Gender: 'MALE' | 'FEMALE' */
  gender?: 'MALE' | 'FEMALE';
  /** Tanggal lahir format YYYY-MM-DD */
  birthDate?: string;
  /** Kota/kabupaten tempat lahir */
  originCity?: string;
  /** Alamat (dari label "Alamat") */
  address?: string;
}

/**
 * Parse teks hasil OCR KTP Indonesia menjadi data terstruktur.
 * Toleran terhadap noise OCR umum (spasi tak terduga, huruf tertukar, baris pecah).
 */
export function parseKtpText(text: string): KtpOcrResult {
  const out: KtpOcrResult = {};
  if (!text) return out;

  // ── Normalisasi ringan ──────────────────────────────────────────────────
  // Gabung baris-baris pendek yang mungkin pecahan dari baris yang sama.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  // Versi "datar" tanpa newline untuk pencarian yang melewati batas baris
  const flat = lines.join(' ');

  // ── NIK: 16 digit beruntun ─────────────────────────────────────────────
  out.nik = extractNik(flat);

  // ── Nama: dari label "Nama" ────────────────────────────────────────────
  out.name = extractName(lines, flat);

  // ── Gender ─────────────────────────────────────────────────────────────
  out.gender = extractGender(flat);

  // ── Tempat & Tanggal Lahir ─────────────────────────────────────────────
  const birth = extractBirth(flat);
  if (birth.birthDate) out.birthDate = birth.birthDate;
  if (birth.originCity) out.originCity = birth.originCity;

  // ── Alamat ─────────────────────────────────────────────────────────────
  out.address = extractAddress(lines, flat);

  return out;
}

// ── Extractors ────────────────────────────────────────────────────────────────

function extractNik(flat: string): string | undefined {
  // 1. Cari 16 digit murni (paling umum)
  const pure = flat.match(/\b\d{16}\b/);
  if (pure) return pure[0];

  // 2. Toleransi pemisah: spasi, titik, koma, strip di antara digit NIK
  //    Contoh OCR noise: "3273 0512 3456 7890" atau "3273.0512.3456.7890"
  const dirty = flat.match(/\b(\d[\d\s.,\-]{14,22}\d)\b/);
  if (dirty) {
    const cleaned = dirty[0].replace(/[^0-9]/g, '');
    if (cleaned.length === 16) return cleaned;
    // Kadang 15 atau 17 digit karena noise → ambil 16 pertama
    if (cleaned.length >= 16) return cleaned.slice(0, 16);
  }

  // 3. Fallback terakhir: cari run 16 digit di mana saja (tanpa word boundary)
  const lastResort = flat.replace(/[^0-9]/g, ' ').match(/\d{16}/);
  if (lastResort) return lastResort[0];

  return undefined;
}

function extractName(lines: string[], flat: string): string | undefined {
  // 1. Label "Nama" diikuti teks (dengan noise: "Nama:", "Nama.", "N a m a")
  const labelPatterns = [
    /nama\s*[:.\-]?\s*(.+)/i,
    /n\s*a\s*m\s*a\s*[:.\-]?\s*(.+)/i, // "N a m a" (spasi dari OCR)
  ];
  for (const pat of labelPatterns) {
    const m = flat.match(pat);
    if (m) {
      const cleaned = cleanName(m[1]);
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // 2. Fallback: cari baris dengan mayoritas huruf kapital (nama di KTP = ALL CAPS)
  //    setelah "NIK" atau di awal KTP (sebelum "Tempat/Tgl Lahir")
  const nikIdx = lines.findIndex((l) => /\d{16}/.test(l.replace(/[^0-9]/g, '')));
  const ttlIdx = lines.findIndex((l) =>
    /tempat|tgl|lahir/i.test(l),
  );
  const start = nikIdx >= 0 ? nikIdx + 1 : 0;
  const end = ttlIdx >= 0 ? ttlIdx : lines.length;
  for (let i = start; i < end; i++) {
    const line = lines[i].trim();
    // Baris all-caps, minimal 6 karakter, mayoritas huruf (bukan angka)
    const letters = line.replace(/[^A-Za-z]/g, '');
    if (letters.length >= 6 && letters.length > line.length * 0.6) {
      const cleaned = cleanName(line);
      if (cleaned.length >= 2 && /^[A-Z\s.'\-]+$/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return undefined;
}

function cleanName(raw: string): string {
  return raw
    .replace(/[^A-Za-z\s.'\-]/g, '') // buang angka & simbol
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function extractGender(flat: string): KtpOcrResult['gender'] {
  // LAKI-LAKI (dengan toleransi OCR: "LAKI LAKI", "LAKI-LAKI", "LAK|-LAK|")
  if (/LAKI[\s\-—|.]*LAKI/i.test(flat)) return 'MALE';
  // PEREMPUAN
  if (/PEREMPUAN/i.test(flat)) return 'FEMALE';
  return undefined;
}

interface BirthResult {
  birthDate?: string;
  originCity?: string;
}

function extractBirth(flat: string): BirthResult {
  // Format khas KTP Indonesia: "KOTA, DD-MM-YYYY"
  // Label: "Tempat/Tgl Lahir", "Tempat Lahir", "Tgl Lahir", "TTL"

  // 1. Cari label + "KOTA, DD-MM-YYYY"
  const withLabel = flat.match(
    /(?:tempat\s*\/?\s*tgl\s*lahir|tempat\s*lahir|tgl\s*lahir|ttl)\s*[:.\-]?\s*([A-Z\s]+)[,;]\s*(\d{2})[-/](\d{2})[-/](\d{4})/i,
  );
  if (withLabel) {
    const [, city, dd, mm, yyyy] = withLabel;
    return {
      originCity: cleanCity(city),
      birthDate: `${yyyy}-${mm}-${dd}`,
    };
  }

  // 2. Cari "KOTA, DD-MM-YYYY" tanpa label eksplisit
  //    Pola: kata kapital + koma + tanggal
  const noLabel = flat.match(
    /([A-Z][A-Z\s]{2,30}),\s*(\d{2})[-/](\d{2})[-/](\d{4})/i,
  );
  if (noLabel) {
    const [, city, dd, mm, yyyy] = noLabel;
    // Pastikan ini benar nama kota (bukan data lain yang kebetulan match)
    if (/^[A-Z][A-Z\s]+$/.test(city.trim())) {
      return {
        originCity: cleanCity(city),
        birthDate: `${yyyy}-${mm}-${dd}`,
      };
    }
  }

  // 3. Fallback: cari tanggal DD-MM-YYYY tanpa kota
  const dateOnly = flat.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dateOnly) {
    const [, dd, mm, yyyy] = dateOnly;
    return { birthDate: `${yyyy}-${mm}-${dd}` };
  }

  return {};
}

function cleanCity(raw: string): string {
  return raw.replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extractAddress(lines: string[], flat: string): string | undefined {
  // Label "Alamat" diikuti teks alamat
  const labelMatch = flat.match(/alamat\s*[:.\-]?\s*(.+)/i);
  if (labelMatch) {
    const cleaned = labelMatch[1]
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 5) return cleaned.slice(0, 200);
  }

  // Fallback: baris setelah "Alamat" di struktur KTP
  const addrIdx = lines.findIndex((l) => /^alamat/i.test(l));
  if (addrIdx >= 0 && addrIdx + 1 < lines.length) {
    const nextLine = lines[addrIdx + 1].trim();
    if (nextLine.length >= 5) return nextLine.slice(0, 200);
  }

  return undefined;
}
