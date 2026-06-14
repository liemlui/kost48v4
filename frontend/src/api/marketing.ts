import apiClient from './client';

export interface PublicSocialProofReview {
  initials: string;
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

export async function fetchPublicSocialProof(): Promise<PublicSocialProof> {
  const response = await apiClient.get('/public/rooms/social-proof');
  return response.data.data;
}
