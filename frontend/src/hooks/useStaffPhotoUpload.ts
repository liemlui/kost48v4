import { useState, useCallback, type ChangeEvent } from 'react';
import { uploadTicketImage, type UploadedImageMeta } from '../api/mediaUploads';
import { compressImageFile as compressBrowserImage } from '../utils/compressImageFile';

/** Shared hook: compress + upload foto bukti kerja staf.
 *  Dipakai oleh StaffUnifiedWorkQueue dan StaffActionLauncher. */
export function useStaffPhotoUpload() {
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const handlePhoto = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressBrowserImage(file, { maxSide: 1400, quality: 0.78 });
      const uploaded = await uploadTicketImage(compressed);
      setPhoto(uploaded);
      setPreview(uploaded.fileUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Foto belum berhasil diunggah. Coba foto lain.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const reset = useCallback(() => {
    setPhoto(null);
    setPreview('');
    setError('');
  }, []);

  return { photo, preview, error, handlePhoto, reset, setError };
}
