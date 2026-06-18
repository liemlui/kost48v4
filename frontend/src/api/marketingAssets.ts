import client from './client';

export type MarketingAssetKind = 'hero' | 'gallery' | 'brochure';

export interface MarketingAssetItem {
  slug: string;
  label: string;
  kind: MarketingAssetKind;
  defaultUrl: string;
  url: string | null;
  activeUrl: string;
  sortOrder: number;
}

export async function listMarketingAssets(): Promise<MarketingAssetItem[]> {
  const res = await client.get<{ message: string; data: MarketingAssetItem[] }>('/marketing-assets');
  return res.data.data;
}

export async function uploadMarketingAsset(slug: string, file: File): Promise<{ slug: string; url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await client.post<{ message: string; data: { slug: string; url: string } }>(
    `/marketing-assets/upload/${slug}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export async function deleteMarketingAsset(slug: string): Promise<void> {
  await client.delete(`/marketing-assets/${slug}`);
}
