import client from './client';
import type { ApiEnvelope } from '../types';

export type FixedAssetCategory = 'BUILDING' | 'RENOVATION' | 'ROOM_EQUIPMENT' | 'FURNITURE' | 'ELECTRONIC' | 'UTILITY_EQUIPMENT' | 'VEHICLE' | 'SOFTWARE' | 'OTHER';
export type FixedAssetStatus = 'DRAFT' | 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED' | 'WRITTEN_OFF';
export type FixedAssetLocationType = 'GENERAL' | 'ROOM' | 'WAREHOUSE';
export type FixedAssetCapitalizationSource = 'OPENING_BALANCE' | 'PURCHASE_JOURNAL' | 'DISCLOSURE_ONLY';

export type FixedAsset = {
  id: number;
  assetCode: string;
  name: string;
  category: FixedAssetCategory;
  status: FixedAssetStatus;
  locationType: FixedAssetLocationType;
  capitalizationSource: FixedAssetCapitalizationSource;
  acquisitionDate: string;
  depreciationStartDate?: string | null;
  acquisitionCostRupiah: number;
  salvageValueRupiah: number;
  usefulLifeMonths: number;
  accumulatedDepreciationRupiah: number;
  bookValueRupiah: number;
  depreciableBaseRupiah: number;
  monthlyDepreciationRupiah: number;
  depreciationEnabled: boolean;
  roomId?: number | null;
  inventoryItemId?: number | null;
  roomItemId?: number | null;
  expenseId?: number | null;
  notes?: string | null;
  room?: { id: number; code: string; name?: string | null; floor?: string | null } | null;
  inventoryItem?: { id: number; sku?: string | null; name: string; category?: string | null; unit: string } | null;
};

export type AssetReadinessV2 = {
  basis: string;
  ledgerBacked: boolean;
  schemaChangeApplied: boolean;
  formalStatementReady: boolean;
  counts: { assetCount: number; activeCount: number; depreciableCount: number; depreciationRunCount: number };
  totals: { acquisitionCostRupiah: number; accumulatedDepreciationRupiah: number; netBookValueRupiah: number };
  gates: Array<{ key: string; label: string; ready: boolean; note?: string }>;
  lastRun?: AssetDepreciationRun | null;
  warnings: string[];
};

export type AssetDepreciationPreview = {
  basis: string;
  ledgerBacked: boolean;
  year: number;
  month: number;
  runDate: string;
  alreadyPosted: boolean;
  existingRun?: AssetDepreciationRun | null;
  eligibleAssetCount: number;
  totalDepreciationRupiah: number;
  eligibleLines: Array<{
    fixedAssetId: number;
    asset: FixedAsset;
    depreciationAmountRupiah: number;
    accumulatedBeforeRupiah: number;
    accumulatedAfterRupiah: number;
    bookValueBeforeRupiah: number;
    bookValueAfterRupiah: number;
  }>;
  warnings: string[];
};

export type AssetDepreciationRun = {
  id: number;
  runNumber: string;
  periodYear: number;
  periodMonth: number;
  runDate: string;
  status: string;
  totalDepreciationRupiah: number;
  journalEntryId?: number | null;
  postedAt?: string | null;
  notes?: string | null;
};

export type CreateFixedAssetPayload = {
  assetCode?: string;
  name: string;
  category?: FixedAssetCategory;
  status?: FixedAssetStatus;
  locationType?: FixedAssetLocationType;
  capitalizationSource?: FixedAssetCapitalizationSource;
  acquisitionDate: string;
  depreciationStartDate?: string;
  acquisitionCostRupiah: number;
  salvageValueRupiah?: number;
  usefulLifeMonths: number;
  accumulatedDepreciationRupiah?: number;
  depreciationEnabled?: boolean;
  roomId?: number;
  inventoryItemId?: number;
  roomItemId?: number;
  expenseId?: number;
  notes?: string;
};

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await promise;
  return response.data.data;
}

export async function fetchAssetRegister(params?: { page?: number; limit?: number; search?: string; status?: FixedAssetStatus; category?: FixedAssetCategory; depreciationEnabled?: boolean }) {
  return unwrap<{ items: FixedAsset[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }>(client.get('/assets', { params }));
}

export async function fetchAssetReadinessV2() {
  return unwrap<AssetReadinessV2>(client.get('/assets/readiness'));
}

export async function createFixedAsset(payload: CreateFixedAssetPayload) {
  return unwrap<FixedAsset>(client.post('/assets', payload));
}

export async function fetchDepreciationPreview(params?: { year?: number; month?: number }) {
  return unwrap<AssetDepreciationPreview>(client.get('/assets/depreciation/preview', { params }));
}

export async function runDepreciation(payload: { year: number; month: number; notes?: string }) {
  return unwrap<{ basis: string; posted: boolean; run: AssetDepreciationRun; journalEntry: unknown; warnings: string[] }>(client.post('/assets/depreciation/run', payload));
}
