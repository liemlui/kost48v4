import apiClient from './client';

export interface PublicSocialProofReview {
  initials: string;
  displayName?: string | null;
  source?: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface PublicSocialProof {
  occupantCount: number;
  averageRating: number;
  reviewCount: number;
  reviews: PublicSocialProofReview[];
}

export interface PublicRoomSummary {
  bookable: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  total: number;
}

export interface CleanlinessRankEntry {
  roomId: number;
  code: string;
  name: string | null;
  score: number;
  doneCount?: number;
  expectedCount?: number;
}

export interface CleanlinessRanking {
  month: number;
  year: number;
  ranking: CleanlinessRankEntry[];
}

export async function fetchPublicSocialProof(): Promise<PublicSocialProof> {
  const response = await apiClient.get('/public/rooms/social-proof');
  return response.data.data;
}

export async function fetchPublicRoomSummary(): Promise<PublicRoomSummary> {
  const response = await apiClient.get('/public/rooms/summary');
  return response.data.data;
}

export async function getCleanlinessRanking(month?: number, year?: number): Promise<CleanlinessRanking> {
  const response = await apiClient.get('/public/rooms/cleanliness-ranking', {
    params: { month, year },
  });
  return response.data.data;
}
