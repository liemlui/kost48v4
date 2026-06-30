import { type ChangeEvent } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import CameraOrGalleryInput from '../common/CameraOrGalleryInput';
import SafeImage from '../common/SafeImage';

export type WorkModalAction = 'START' | 'COMPLETE' | 'NEED_HELP';

export interface WorkModalItem {
  title: string;
  typeLabel?: string;
  location?: string;
}

type Props = {
  show: boolean;
  onHide: () => void;
  action: WorkModalAction | null;
  item: WorkModalItem | null;
  /** Error dari mutation atau upload foto. */
  error?: string;
  /** Teks catatan hasil kerja / kendala. */
  note: string;
  onNoteChange: (value: string) => void;
  /** URL preview foto yang sudah diunggah. */
  photoPreview?: string;
  /** Handler upload foto (pakai useStaffPhotoUpload.handlePhoto). */
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Mutation sedang berjalan. */
  isPending: boolean;
  /** Dipanggil saat user klik tombol aksi utama. */
  onConfirm: () => void;
  /** Apakah foto wajib untuk aksi ini? */
  requirePhoto?: boolean;
  /** Apakah catatan wajib untuk aksi ini? */
  requireNote?: boolean;
};

function modalTitle(action: WorkModalAction) {
  switch (action) {
    case 'START': return 'Mulai pekerjaan?';
    case 'COMPLETE': return 'Tandai selesai?';
    case 'NEED_HELP': return 'Kirim kendala?';
    default: return '';
  }
}

function confirmLabel(action: WorkModalAction) {
  switch (action) {
    case 'START': return 'Ya, mulai';
    case 'COMPLETE': return 'Ya, sudah selesai';
    case 'NEED_HELP': return 'Kirim kendala';
    default: return 'Simpan';
  }
}

function confirmVariant(action: WorkModalAction): string {
  if (action === 'COMPLETE') return 'success';
  if (action === 'NEED_HELP') return 'danger';
  return 'primary';
}

export default function StaffWorkActionModal({
  show,
  onHide,
  action,
  item,
  error,
  note,
  onNoteChange,
  photoPreview,
  onPhotoChange,
  isPending,
  onConfirm,
  requirePhoto = false,
  requireNote = false,
}: Props) {
  if (!action) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle(action)}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger" className="py-2">{error}</Alert> : null}

        {item ? (
          <Alert variant="light" className="border py-2">
            <strong>{item.title}</strong>
            {item.typeLabel || item.location ? (
              <><br /><small>{[item.typeLabel, item.location].filter(Boolean).join(' · ')}</small></>
            ) : null}
          </Alert>
        ) : null}

        {action === 'START' ? (
          <p className="mb-0">Setelah dimulai, selesaikan pekerjaan ini dulu sebelum mulai pekerjaan lain.</p>
        ) : (
          <>
            {/* Foto bukti — di atas form untuk dorong upload */}
            {action === 'COMPLETE' ? (
              <Form.Group className="mb-3 staff-photo-proof-group">
                <Form.Label className="staff-photo-proof-label fw-semibold">
                  📷 Foto bukti kerja{requirePhoto ? ' (wajib)' : ''}
                </Form.Label>
                <CameraOrGalleryInput onChange={onPhotoChange} />
                {photoPreview ? (
                  <SafeImage className="staff-proof-preview" src={photoPreview} alt="Foto bukti" />
                ) : (
                  <div className="staff-photo-proof-hint text-muted small mt-1">
                    {requirePhoto ? 'Foto wajib diisi untuk menyelesaikan pekerjaan ini.' : 'Foto tanpa bukti menurunkan skor laporan bulan ini.'}
                  </div>
                )}
              </Form.Group>
            ) : null}

            <Form.Group className="mb-3">
              <Form.Label>
                {action === 'NEED_HELP' ? 'Apa kendalanya?' : `Catatan hasil kerja${requireNote ? ' (wajib)' : ''}`}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={note}
                onChange={(event) => onNoteChange(event.currentTarget.value)}
                placeholder={
                  action === 'NEED_HELP'
                    ? 'Contoh: butuh alat, barang rusak berat, atau tidak bisa masuk kamar'
                    : 'Contoh: sudah bersih / sudah diganti / sudah dicek'
                }
              />
            </Form.Group>

            {action === 'NEED_HELP' ? (
              <Form.Group>
                <Form.Label>Foto bukti (opsional)</Form.Label>
                <CameraOrGalleryInput onChange={onPhotoChange} />
                {photoPreview ? <SafeImage className="staff-proof-preview" src={photoPreview} alt="Foto bukti" /> : null}
              </Form.Group>
            ) : null}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Batal</Button>
        <Button
          variant={confirmVariant(action)}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <><Spinner size="sm" className="me-2" />Menyimpan...</>
          ) : (
            confirmLabel(action)
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
