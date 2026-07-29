import type { PricingTerm, PublicRoom } from "../types";
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm } from "./pricing";

export type PublicRoomBathroom = "inside" | "outside";
export type PublicRoomCooling = "ac" | "fan";

export function normalizePublicRoomText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

export function getPublicRoomSearchText(room: PublicRoom) {
  return [
    room.code,
    room.name,
    room.notes,
    room.floor,
    ...(room.facilities ?? []).map((facility) => `${facility.name} ${facility.category ?? ""} ${facility.note ?? ""}`),
  ]
    .map(normalizePublicRoomText)
    .join(" ");
}

export function getPublicRoomBathroom(room: PublicRoom): PublicRoomBathroom {
  // Prefer category enum (authoritative, matches wizard logic). Fallback ke text.
  const cat = String(room.category ?? "").toUpperCase();
  if (cat === "ECONOMY") return "outside";
  if (cat === "STANDARD" || cat === "DELUXE") return "inside";
  const text = getPublicRoomSearchText(room);
  if (/km\s*dalam|kamar mandi dalam|mandi dalam|private bathroom|bathroom dalam|toilet dalam|wc dalam/.test(text)) return "inside";
  return "outside";
}

export function getPublicRoomCooling(room: PublicRoom): PublicRoomCooling {
  // Prefer category enum (authoritative, matches wizard logic). Fallback ke text.
  const cat = String(room.category ?? "").toUpperCase();
  if (cat === "DELUXE") return "ac";
  if (cat === "ECONOMY" || cat === "STANDARD") return "fan";
  const text = getPublicRoomSearchText(room);
  if (/\bac\b|air conditioner|pendingin ruangan|aircon/.test(text)) return "ac";
  return "fan";
}

export function getPublicRoomBathroomLabel(room: PublicRoom) {
  return getPublicRoomBathroom(room) === "inside" ? "Dalam" : "Luar";
}

export function getPublicRoomBathroomSentence(room: PublicRoom) {
  return getPublicRoomBathroom(room) === "inside" ? "kamar mandi dalam" : "kamar mandi luar";
}

export function getPublicRoomCoolingLabel(room: PublicRoom) {
  return getPublicRoomCooling(room) === "ac" ? "AC" : "Kipas angin";
}

export function getPublicRoomCoolingSentence(room: PublicRoom) {
  return getPublicRoomCooling(room) === "ac" ? "AC" : "kipas angin";
}

export function getPublicRoomRate(room: PublicRoom, term: PricingTerm = "MONTHLY") {
  // Audit M-40: harga tampil harus sama dengan harga yang DITAGIH backend —
  // semua term diturunkan dari tarif bulanan via formula resmi.
  const monthly = Number(room.pricing?.monthlyRateRupiah ?? 0);
  if (term === "MONTHLY") return monthly || Number(room.highlightedRateRupiah ?? 0);
  if (monthly > 0) return calculateRentByPricingTerm(monthly, term);
  return Number(room.highlightedRateRupiah ?? 0);
}

export function getBestPublicRoomRate(room: PublicRoom, term: PricingTerm = "MONTHLY") {
  const selectedRate = getPublicRoomRate(room, term);
  if (selectedRate > 0) return selectedRate;
  return (
    Number(room.pricing?.monthlyRateRupiah ?? 0) ||
    Number(room.pricing?.weeklyRateRupiah ?? 0) ||
    Number(room.pricing?.biWeeklyRateRupiah ?? 0) ||
    Number(room.pricing?.dailyRateRupiah ?? 0) ||
    Number(room.highlightedRateRupiah ?? 0) ||
    0
  );
}

export function getPublicRoomVisibleAmenities(room: PublicRoom, limit = 4) {
  const hidden = /kamar mandi|km\s|toilet|wc|ac|kipas|pendingin|standar|besar|ukuran|lantai/i;
  const names = (room.facilities ?? [])
    .filter((facility) => facility.publicVisible !== false)
    .map((facility) => facility.name?.trim())
    .filter((name): name is string => Boolean(name && !hidden.test(name)));

  const unique = Array.from(new Set(names));
  return unique.length ? unique.slice(0, limit) : ["Kasur"];
}

export function getCleanPublicRoomNote(room: PublicRoom) {
  const raw = (room.notes ?? "").trim();
  if (!raw) return "";
  if (/seed|dummy|test|uat|\.ps1|auto[- ]?created|checkout[_ -]?guard|script|developer/i.test(raw)) return "";
  return raw;
}

export function getPublicRoomBusinessHighlight(room: PublicRoom) {
  const cleanNote = getCleanPublicRoomNote(room);
  if (cleanNote) return cleanNote;
  return `Kamar dengan ${getPublicRoomBathroomSentence(room)}, ${getPublicRoomCoolingSentence(room)}, dan informasi harga yang transparan.`;
}

export function getPublicRoomUtilityCopy(room: PublicRoom, pricingTerm: PricingTerm) {
  const included = isUtilitiesIncludedForPricingTerm(pricingTerm);
  if (included) {
    return {
      included,
      title: "Listrik & air termasuk",
      description: "Untuk masa sewa pendek, listrik dan air sudah termasuk dalam tarif yang dipilih.",
    };
  }

  const electricity = Number(room.electricityTariffPerKwhRupiah ?? 0);
  const water = Number(room.waterTariffPerM3Rupiah ?? 0);
  return {
    included,
    title: "Listrik & air pakai meter",
    description: `Listrik Rp ${electricity.toLocaleString("id-ID")} / kWh · ${water > 0 ? `Air Rp ${water.toLocaleString("id-ID")} / m³` : 'Air termasuk'}.`,
  };
}

export type PublicRoomAvailabilityDisplay = {
  label: string;
  tone: "is-available" | "is-limited" | "is-full" | "is-occupied" | "is-maintenance";
  shortCopy: string;
  detailCopy: string;
  isAvailable: boolean;
  canBook: boolean;
};

export function isPublicRoomBookable(room: PublicRoom): boolean {
  // Nama lama dipertahankan agar pemanggil katalog tidak berubah. Dalam mode
  // landing page, fungsi ini berarti "tersedia untuk ditanyakan", bukan selalu
  // berarti form booking online aktif.
  if (typeof room.isAvailable === "boolean") return room.isAvailable;
  const publicStatus = String(room.publicAvailabilityStatus ?? "").toUpperCase();
  if (publicStatus === "AVAILABLE") return true;
  if (publicStatus === "FULL" || publicStatus === "HIDDEN") return false;
  const status = String(room.status ?? "").toUpperCase();
  if (typeof room.canBook === "boolean") return room.canBook;
  return status === "AVAILABLE";
}

export function getPublicRoomAvailabilityDisplay(room: PublicRoom): PublicRoomAvailabilityDisplay {
  const status = String(room.status ?? "").toUpperCase();
  const isAvailable = isPublicRoomBookable(room);
  const canBook = isAvailable && room.onlineBookingEnabled !== false && room.canBook !== false;

  if (!isAvailable) {
    const isMaintenance = status === "MAINTENANCE";
    return {
      label: isMaintenance ? "Dibersihkan / Maintenance" : "Penuh / Terisi",
      tone: isMaintenance ? "is-maintenance" : "is-occupied",
      shortCopy: isMaintenance ? "Kamar sedang dibersihkan atau maintenance sebelum siap ditempati." : "Kamar sedang penuh atau terisi. Bisa tanya estimasi kosong.",
      detailCopy: isMaintenance
        ? "Kamar ini belum dibuka untuk booking karena tim masih mengecek kebersihan, kunci, inventaris, dan kondisi akhir. Anda tetap bisa tanya admin untuk estimasi siap ditempati."
        : "Kamar ini sedang penuh atau terisi. Anda tetap bisa melihat detail dan tanya ke admin kapan kamar ini bisa kosong lagi.",
      isAvailable: false,
      canBook: false,
    };
  }

  if (status === "MAINTENANCE") {
    // Kamar bekas checkout/overstay yang sudah dibuka untuk booking (canBook=true
    // dari backend) tetapi masih dibersihkan staf.
    return {
      label: "Dibersihkan / Maintenance",
      tone: "is-limited",
      shortCopy: "Kamar sedang dibersihkan atau maintenance. Booking bisa diajukan jika tombol booking tersedia.",
      detailCopy: "Kamar baru dikosongkan dan sedang dibersihkan atau maintenance. Jika tombol booking tersedia, Anda bisa mengajukan booking sekarang dan check-in dilakukan setelah kamar siap.",
      isAvailable: true,
      canBook,
    };
  }

  if (status === "RESERVED") {
    return {
      label: "Dipesan",
      tone: "is-limited",
      shortCopy: "Kamar sudah dikunci tenant — pilih kamar lain atau hubungi admin.",
      detailCopy: "Kamar sudah dikunci untuk tenant yang sudah membayar (DP atau lunas). Belum bisa dibooking untuk tenant baru. Hubungi admin untuk info ketersediaan.",
      isAvailable: false,
      canBook: false,
    };
  }

  return {
    label: "Tersedia",
    tone: "is-available",
    shortCopy: canBook ? "Kamar siap diajukan. Admin akan meninjau booking Anda." : "Kamar tersedia. Hubungi admin melalui WhatsApp untuk reservasi.",
    detailCopy: canBook ? "Kamar bisa diajukan. Aman setelah pembayaran disetujui." : "Booking online sementara dinonaktifkan. Hubungi admin melalui WhatsApp untuk menanyakan atau mereservasi kamar ini.",
    isAvailable: true,
    canBook,
  };
}

export function getPublicRoomInitialCostEstimate(room: PublicRoom, term: PricingTerm = "MONTHLY") {
  const rent = getBestPublicRoomRate(room, term);
  const deposit = Number(room.defaultDepositRupiah ?? 0);
  return {
    rent,
    deposit,
    total: Math.max(0, rent) + Math.max(0, deposit),
  };
}

export const publicBookingSafetySteps = [
  "Ajukan booking kamar yang kamu pilih.",
  "Admin mengecek ketersediaan kamar dan data calon tenant.",
  "Jika disetujui, tagihan awal muncul di portal.",
  "Bayar + kirim bukti di portal.",
  "Kamar aman setelah pembayaran disetujui.",
];
