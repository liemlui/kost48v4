import type { InventoryItem } from '../types';

export type InventoryHealthStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'GOOD';

export type InventoryHealth = {
  status: InventoryHealthStatus;
  label: string;
  tone: 'danger' | 'warning' | 'success';
  qty: number;
  minQty: number;
  unit: string;
  copy: string;
  actionCopy: string;
};

const physicalIssueStatuses = new Set(['DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK']);
const derivedStockStatuses = new Set(['LOW_STOCK', 'OUT_OF_STOCK', 'GOOD']);

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getInventoryHealth(item: InventoryItem): InventoryHealth {
  const qty = toNumber(item.qtyOnHand, 0);
  const minQty = Math.max(0, toNumber(item.minQty, 0));
  const unit = item.unit || 'pcs';

  if (qty <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: 'Stok habis',
      tone: 'danger',
      qty,
      minQty,
      unit,
      copy: `Stok sistem 0 ${unit}. Staff tidak perlu memilih status habis; sistem sudah mendeteksi otomatis.`,
      actionCopy: 'Perlu restock atau keputusan admin/owner sebelum barang dipakai.',
    };
  }

  if (minQty > 0 && qty <= minQty) {
    return {
      status: 'LOW_STOCK',
      label: 'Stok menipis',
      tone: 'warning',
      qty,
      minQty,
      unit,
      copy: `Stok ${qty} ${unit}, batas minimal ${minQty} ${unit}. Status menipis dihitung otomatis dari jumlah.`,
      actionCopy: 'Pertimbangkan restock; staff cukup lapor jika ada selisih fisik atau barang rusak.',
    };
  }

  return {
    status: 'GOOD',
    label: 'Stok aman',
    tone: 'success',
    qty,
    minQty,
    unit,
    copy: minQty > 0
      ? `Stok ${qty} ${unit}, di atas minimal ${minQty} ${unit}.`
      : `Stok ${qty} ${unit}. Minimal stok belum diset.`,
    actionCopy: 'Tidak perlu laporan stok manual kecuali ada masalah fisik atau selisih jumlah.',
  };
}

export function isInventoryPhysicalIssue(status?: string | null) {
  return physicalIssueStatuses.has(String(status ?? '').toUpperCase());
}

export function isDerivedStockStatus(status?: string | null) {
  return derivedStockStatuses.has(String(status ?? '').toUpperCase());
}

export function getInventoryPhysicalIssueLabel(status?: string | null) {
  const value = String(status ?? '').toUpperCase();
  if (!isInventoryPhysicalIssue(value)) return null;
  if (value === 'DAMAGED') return 'Barang rusak';
  if (value === 'MISSING') return 'Barang hilang';
  if (value === 'NEEDS_REPAIR') return 'Perlu diperbaiki';
  if (value === 'PENDING_CHECK') return 'Perlu cek admin';
  return value;
}
