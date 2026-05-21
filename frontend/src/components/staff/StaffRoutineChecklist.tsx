import { ChangeEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { completeStaffRoutine, sendStaffRoutineNeedHelp, type StaffRoutineItem, type StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { uploadTicketImage, type UploadedImageMeta } from '../../api/mediaUploads';

type Props = {
  today?: StaffRoutineTodayResponse | null;
  isLoading?: boolean;
  onUpdated?: () => void | Promise<void>;
};

type ModalState = {
  item: StaffRoutineItem;
  action: 'DONE' | 'NEED_HELP';
} | null;

function areaLabel(area: string) {
  switch (area) {
    case 'BATHROOM': return 'Kamar mandi';
    case 'ROOM': return 'Kamar';
    case 'INVENTORY': return 'Stok barang';
    case 'METER': return 'Meter';
    case 'SECURITY': return 'Keamanan';
    case 'CLEANING': return 'Bersih-bersih';
    default: return 'Area umum';
  }
}

async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

export default function StaffRoutineChecklist({ today, isLoading, onUpdated }: Props) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');

  const resetModal = () => {
    setModalState(null);
    setNote('');
    setPhoto(null);
    setPhotoPreview('');
    setError('');
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modalState) return null;
      const item = modalState.item;
      if (modalState.action === 'DONE' && item.requiresPhoto && !photo?.fileUrl) throw new Error('Foto bukti wajib diisi.');
      if (modalState.action === 'DONE' && item.requiresNote && !note.trim()) throw new Error('Catatan singkat wajib diisi.');
      const payload = {
        assignmentId: item.assignmentId ?? undefined,
        roomId: item.roomId ?? undefined,
        dueDate: item.dueDate,
        note: note.trim() || undefined,
        photoUrl: photo?.fileUrl,
      };
      return modalState.action === 'DONE'
        ? completeStaffRoutine(item.templateId, payload)
        : sendStaffRoutineNeedHelp(item.templateId, payload);
    },
    onSuccess: async () => {
      await onUpdated?.();
      resetModal();
    },
    onError: (err: any) => setError(err?.response?.data?.message || err?.message || 'Checklist belum tersimpan. Coba lagi.'),
  });

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file);
      const uploaded = await uploadTicketImage(compressed);
      setPhoto(uploaded);
      setPhotoPreview(uploaded.fileUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Foto belum berhasil diunggah. Coba foto lain.');
    } finally {
      event.target.value = '';
    }
  };

  const items = today?.items ?? [];
  const remaining = today?.summary.remaining ?? 0;

  return (
    <section className="staff-routine-card">
      <div className="staff-section-head with-action">
        <div>
          <strong>Checklist Hari Ini</strong>
          <small>{isLoading ? 'Memuat pekerjaan rutin...' : `${today?.summary.completed ?? 0} dari ${today?.summary.total ?? 0} selesai.`}</small>
        </div>
        <span className="staff-routine-percent">{today?.summary.completionPercent ?? 0}%</span>
      </div>

      {!isLoading && !items.length ? (
        <div className="staff-empty-box"><strong>Belum ada checklist.</strong><span>Admin bisa menambah pekerjaan harian atau mingguan.</span></div>
      ) : null}

      <div className="staff-routine-list">
        {items.map((item) => {
          const done = item.status === 'DONE';
          const needHelp = item.status === 'NEED_HELP';
          return (
            <article key={item.occurrenceKey} className={`staff-routine-item${done ? ' done' : ''}${needHelp ? ' need-help' : ''}`}>
              <button
                type="button"
                className="staff-check-button"
                disabled={done || saveMutation.isPending}
                onClick={() => { setModalState({ item, action: 'DONE' }); setNote(''); setPhoto(null); setPhotoPreview(''); setError(''); }}
                aria-label={done ? 'Sudah selesai' : 'Tandai selesai'}
              >
                {done ? '✓' : '□'}
              </button>
              <div className="staff-routine-main">
                <strong>{item.title}</strong>
                <small>{item.room?.code ? `Kamar ${item.room.code}` : areaLabel(item.areaType)} · {item.dueLabel}</small>
                {needHelp ? <span className="staff-help-note">Kendala sudah dikirim. Admin bisa bantu cek.</span> : null}
              </div>
              {!done ? (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="staff-small-soft-button"
                  onClick={() => { setModalState({ item, action: 'NEED_HELP' }); setNote(''); setPhoto(null); setPhotoPreview(''); setError(''); }}
                >
                  Butuh Bantuan
                </Button>
              ) : <span className="staff-done-note">Selesai</span>}
            </article>
          );
        })}
      </div>
      {remaining > 0 ? <p className="staff-routine-footer">Selesaikan satu per satu. Mulai dari pekerjaan yang paling mudah dulu.</p> : <p className="staff-routine-footer good">Bagus. Checklist hari ini sudah selesai.</p>}

      <Modal show={Boolean(modalState)} onHide={resetModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalState?.action === 'DONE' ? 'Simpan Checklist' : 'Butuh Bantuan'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger" className="py-2">{error}</Alert> : null}
          {modalState?.item ? <Alert variant="light" className="border py-2"><strong>{modalState.item.title}</strong><br /><small>{modalState.item.description || 'Tulis catatan jika perlu.'}</small></Alert> : null}
          <Form.Group className="mb-3">
            <Form.Label>Catatan singkat{modalState?.item.requiresNote && modalState.action === 'DONE' ? ' wajib' : ''}</Form.Label>
            <Form.Control as="textarea" rows={2} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder={modalState?.action === 'DONE' ? 'Contoh: sudah bersih' : 'Contoh: kran bocor, butuh alat'} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto bukti{modalState?.item.requiresPhoto && modalState.action === 'DONE' ? ' wajib' : ''}</Form.Label>
            <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
            {photoPreview ? <img className="staff-proof-preview" src={photoPreview} alt="Foto bukti" /> : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={resetModal}>Batal</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : modalState?.action === 'DONE' ? 'Simpan Selesai' : 'Kirim Kendala'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
