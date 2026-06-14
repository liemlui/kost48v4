// F3-12 (V-5): palet Okabe-Ito — colorblind-safe untuk seluruh chart.
// Sumber: Okabe & Ito (2008), palet kualitatif yang aman untuk deuteranopia/
// protanopia/tritanopia. Dipakai sebagai default warna kategori & semantik.

export const OKABE_ITO = {
  blue: "#0072B2",
  orange: "#E69F00",
  green: "#009E73",
  vermillion: "#D55E00",
  skyBlue: "#56B4E9",
  purple: "#CC79A7",
  yellow: "#F0E442",
  gray: "#666666",
} as const;

// Urutan kategori: kontras tinggi & tetap dapat dibedakan saat buta warna.
export const CHART_PALETTE: string[] = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyBlue,
  OKABE_ITO.purple,
  OKABE_ITO.yellow,
  OKABE_ITO.gray,
];

// Warna semantik aman buta-warna — vermillion+orange+green lebih mudah
// dibedakan daripada merah/kuning/hijau murni.
export const CHART_SEMANTIC = {
  danger: OKABE_ITO.vermillion, // #D55E00
  warning: OKABE_ITO.orange, // #E69F00
  success: OKABE_ITO.green, // #009E73
  info: OKABE_ITO.blue, // #0072B2
} as const;

export function chartColorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
