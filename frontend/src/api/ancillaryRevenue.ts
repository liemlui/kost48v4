import client from './client';

const BASE = '/ancillary-revenue';

export type AncillaryRevenueStream = {
  id: string;
  icon: string;
  name: string;
  buyer: string;
  status: string;
  route: string;
  note: string;
  stats?: {
    thisMonth: { count: number; revenue: number };
    total: { count: number; revenue: number };
  };
};

export type AncillaryRevenueStreamsResponse = {
  activeStreams: AncillaryRevenueStream[];
  futureStreams: AncillaryRevenueStream[];
  period: { year: number; month: number };
};

export async function fetchAncillaryRevenueStreams(): Promise<AncillaryRevenueStreamsResponse> {
  const res = await client.get<{ data: AncillaryRevenueStreamsResponse }>(`${BASE}/streams`);
  return res.data.data;
}
