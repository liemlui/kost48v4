import client from './client';

export interface FacilityImageItem {
  slug: string;
  url: string;
}

/** Daftar semua foto fasilitas (publik). */
export async function listFacilityImages(): Promise<FacilityImageItem[]> {
  const res = await client.get<{ message: string; data: FacilityImageItem[] }>('/facility-images');
  return res.data.data;
}

/** Upload foto untuk fasilitas tertentu. */
export async function uploadFacilityImage(slug: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await client.post<{ message: string; data: { url: string } }>(
    `/facility-images/upload/${slug}`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

/** Hapus foto fasilitas. */
export async function deleteFacilityImage(slug: string): Promise<void> {
  await client.delete(`/facility-images/${slug}`);
}
