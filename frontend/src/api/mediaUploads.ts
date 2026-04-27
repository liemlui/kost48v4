import apiClient from './client';

export type UploadedImageMeta = {
  fileKey: string;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
};

async function uploadTo(path: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data as UploadedImageMeta;
}

export const uploadRoomImage = (file: File) => uploadTo('/rooms/upload-image', file);
export const uploadAnnouncementImage = (file: File) => uploadTo('/announcements/upload-image', file);
export const uploadTicketImage = (file: File) => uploadTo('/tickets/upload-image', file);
