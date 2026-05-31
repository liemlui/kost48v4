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
  const text = getPublicRoomSearchText(room);
  if (/km\s*dalam|kamar mandi dalam|mandi dalam|private bathroom|bathroom dalam|toilet dalam|wc dalam/.test(text)) return "inside";
  return "outside";
}

export function getPublicRoomCooling(room: PublicRoom): PublicRoomCooling {
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
  if (term === "DAILY") return Number(room.pricing?.dailyRateRupiah ?? 0);
  if (term === "WEEKLY") return Number(room.pricing?.weeklyRateRupiah ?? 0);
  if (term === "BIWEEKLY") {
    return Number(room.pricing?.biWeeklyRateRupiah ?? 0) ||
      (room.pricing?.monthlyRateRupiah ? calculateRentByPricingTerm(Number(room.pricing.monthlyRateRupiah), term) : 0);
  }
  if (term === "MONTHLY") return Number(room.pricing?.monthlyRateRupiah ?? room.highlightedRateRupiah ?? 0);

  const monthly = Number(room.pricing?.monthlyRateRupiah ?? 0);
  return monthly > 0 ? calculateRentByPricingTerm(monthly, term) : Number(room.highlightedRateRupiah ?? 0);
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
  return `Kamar siap dipilih dengan ${getPublicRoomBathroomSentence(room)}, ${getPublicRoomCoolingSentence(room)}, dan informasi harga yang transparan.`;
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
    description: `Listrik Rp ${electricity.toLocaleString("id-ID")} / kWh · Air Rp ${water.toLocaleString("id-ID")} / m³.`,
  };
}

export type PublicRoomAvailabilityDisplay = {
  label: string;
  tone: "is-available" | "is-limited" | "is-full" | "is-occupied" | "is-maintenance";
  shortCopy: string;
  detailCopy: string;
  canBook: boolean;
};

export function getPublicRoomAvailabilityDisplay(room: PublicRoom): PublicRoomAvailabilityDisplay {
  const status = String(room.status ?? "").toUpperCase();
  const isBookable = room.isAvailable !== false;

  if (status === "OCCUPIED") {
    return {
      label: "Sedang ditempati",
      tone: "is-occupied",
      shortCopy: "Kamar sedang ditempati. Anda masih bisa cek detail dan tanya estimasi ketersediaan.",
      detailCopy: "Kamar ini sedang ditempati. Anda tetap bisa melihat detail dan tanya ke admin kapan kamar ini bisa tersedia lagi.",
      canBook: false,
    };
  }

  if (status === "MAINTENANCE") {
    return {
      label: "Perawatan",
      tone: "is-maintenance",
      shortCopy: "Kamar sedang dalam perawatan.",
      detailCopy: "Kamar ini sedang dalam perawatan dan belum bisa diajukan. Hubungi admin untuk informasi ketersediaan.",
      canBook: false,
    };
  }

  if (!isBookable) {
    return {
      label: "Belum tersedia",
      tone: "is-full",
      shortCopy: "Kamar belum bisa diajukan sekarang.",
      detailCopy: "Kamar ini belum bisa diajukan saat ini. Pilih kamar lain atau tanya ke admin untuk jadwal ketersediaan berikutnya.",
      canBook: false,
    };
  }

  if (status === "RESERVED") {
    return {
      label: "Sedang diproses",
      tone: "is-limited",
      shortCopy: "Ada calon tenant yang sedang diproses. Booking tetap bisa diajukan.",
      detailCopy: "Sedang diproses, belum terkunci. Prioritas diberikan kepada yang pembayarannya disetujui lebih dulu.",
      canBook: true,
    };
  }

  return {
    label: "Bisa diajukan",
    tone: "is-available",
    shortCopy: "Ajukan booking dulu, lalu tunggu review admin.",
    detailCopy: "Bisa diajukan. Kamar aman setelah pembayaran disetujui.",
    canBook: true,
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
