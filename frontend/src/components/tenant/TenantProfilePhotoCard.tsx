import { useRef, useState } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import TenantAvatar from '../common/TenantAvatar';
import { compressImageFile } from '../../utils/compressImageFile';
import { deleteTenantProfilePhoto, tenantProfilePhotoUrl, uploadTenantProfilePhoto } from '../../api/tenants';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

// PUB-FOTO-PROFIL-KTP: kartu kelola avatar tenant untuk OWNER/ADMIN (keputusan owner M02).
// Default avatar diturunkan dari foto KTP pertama; di sini owner/admin bisa ganti/hapus.

interface Props {
  tenantId: number;
  fullName?: string | null;
}

export default function TenantProfilePhotoCard({ tenantId, fullName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Versi dipakai untuk cache-busting agar avatar baru langsung tampil setelah ganti/hapus.
  const photoUrl = `${tenantProfilePhotoUrl(tenantId)}?v=${version}`;

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file, { maxSide: 512, quality: 0.8 });
      await uploadTenantProfilePhoto(tenantId, compressed);
      setVersion((value) => value + 1);
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Hapus foto profil penghuni ini?')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTenantProfilePhoto(tenantId);
      setVersion((value) => value + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
        <TenantAvatar tenantId={tenantId} fullName={fullName} photoUrl={photoUrl} className="user-avatar-lg" />
        <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
          <strong>Foto Profil Penghuni</strong>
          <div className="small text-muted">Default diambil dari foto KTP pertama saat masuk. Owner/admin bisa ganti.</div>
          {error ? <div className="small text-danger mt-1">{error}</div> : null}
        </div>
        <div className="d-flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
          <Button size="sm" variant="outline-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Spinner size="sm" animation="border" role="status" /> : 'Ganti Foto'}
          </Button>
          <Button size="sm" variant="outline-danger" disabled={busy} onClick={handleDelete}>Hapus</Button>
        </div>
      </Card.Body>
    </Card>
  );
}
