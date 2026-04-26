import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { createResource, listResource } from '../../api/resources';
import { uploadTicketImage } from '../../api/mediaUploads';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

type PortalTicket = {
  issueImageUrl?: string | null;
  resolutionImageUrl?: string | null;
  id: number;
  ticketNumber?: string;
  title?: string;
  subject?: string;
  description?: string;
  status: string;
  priority?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const initialForm = { title: '', description: '', category: 'GENERAL', issueImageUrl: '', issueImageFileKey: '', issueImageOriginalFilename: '', issueImageMimeType: '', issueImageFileSizeBytes: 0 };

async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

export default function MyTicketsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState(initialForm);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['portal-tickets'],
    queryFn: () => listResource<PortalTicket>('/tickets/my'),
  });

  const createMutation = useMutation({
    mutationFn: () => createResource('/tickets/portal', formState),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['portal-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreate(false);
      setFormState(initialForm);
      setError('');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Gagal membuat tiket baru.')
        : 'Gagal membuat tiket baru.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    },
  });

  const tickets = useMemo(() => query.data?.items ?? [], [query.data]);

  const handleTicketImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const compressed = await compressImageFile(file);
      const uploaded = await uploadTicketImage(compressed);
      setImagePreview(uploaded.fileUrl);
      setFormState((prev) => ({ ...prev, issueImageUrl: uploaded.fileUrl, issueImageFileKey: uploaded.fileKey, issueImageOriginalFilename: uploaded.originalFilename, issueImageMimeType: uploaded.mimeType, issueImageFileSizeBytes: uploaded.fileSizeBytes }));
    } catch (err: any) {
      setError(err?.message ?? 'Gagal mengunggah foto tiket.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Tiket Saya"
        description="Keluhan dan permintaan bantuan yang pernah Anda ajukan. Konteks tenant, stay, dan kamar akan diisi otomatis oleh sistem."
        secondaryAction={<Button onClick={() => setShowCreate(true)}>Ajukan Tiket Baru</Button>}
      />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Gagal memuat tiket Anda. Silakan coba lagi.</Alert> : null}
      {!query.isLoading && !query.isError && !tickets.length ? (
        <EmptyState
          icon="🎫"
          title="Belum ada tiket"
          description="Gunakan tombol di atas untuk membuat tiket baru saat membutuhkan bantuan."
          action={{ label: 'Ajukan Tiket Baru', onClick: () => setShowCreate(true) }}
        />
      ) : null}

      <div className="d-grid gap-3">
        {tickets.map((ticket) => (
          <Card className="content-card border-0" key={ticket.id}>
            <Card.Body>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-2">
                <div>
                  <div className="fw-semibold">{ticket.title || ticket.subject || ticket.ticketNumber || `Tiket #${ticket.id}`}</div>
                  <div className="small text-muted">Dibuat {formatDate(ticket.createdAt)} · Update {formatDate(ticket.updatedAt)}</div>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <StatusBadge status={ticket.status} />
                  {ticket.priority ? <StatusBadge status="SECONDARY" customLabel={ticket.priority} /> : null}
                </div>
              </div>
              {ticket.issueImageUrl ? <div className="mb-2"><img src={ticket.issueImageUrl} alt="Bukti tiket" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
              {ticket.resolutionImageUrl ? <div className="mb-2"><img src={ticket.resolutionImageUrl} alt="Bukti selesai" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
              <div className="app-caption">{ticket.lastMessage || ticket.description || 'Belum ada pembaruan tambahan.'}</div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ajukan Tiket Baru</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Alert variant="light" className="small">
            Tenant, stay, dan kamar akan ditentukan otomatis dari akun portal Anda. Anda tidak perlu mengisi ID teknis apa pun.
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Judul</Form.Label>
            <Form.Control value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Kategori</Form.Label>
            <Form.Select value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}>
              <option value="GENERAL">Umum</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BILLING">Billing</option>
              <option value="WIFI">WiFi</option>
              <option value="OTHER">Lainnya</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Deskripsi</Form.Label>
            <Form.Control as="textarea" rows={4} value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto Masalah (opsional)</Form.Label>
            <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleTicketImage} disabled={uploadingImage} />
            <Form.Text muted>Preview akan dibuat kecil. Klik setelah tiket dibuat untuk melihat hasil di daftar tiket.</Form.Text>
            {imagePreview ? <div className="mt-2"><img src={imagePreview} alt="Preview tiket" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formState.title.trim()}>
            {createMutation.isPending ? 'Menyimpan...' : 'Kirim Tiket'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
