import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { createResource, listResource } from '../../api/resources';
import { uploadTicketImage } from '../../api/mediaUploads';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import CameraOrGalleryInput from '../../components/common/CameraOrGalleryInput';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import TenantStaffReviewPrompt from '../../components/tenant/TenantStaffReviewPrompt';
import { AssistantPanel, type AssistantItem } from '../../components/command-center';
import FreeRepairPolicyCard from '../../components/tenant/FreeRepairPolicyCard';
import { tenantCategoryLabel } from '../../utils/tenantCopy';
import { toTenantFriendlyError } from '../../utils/tenantErrorCopy';
import { compressImageFile } from '../../utils/compressImageFile';

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
  category?: string | null;
  tipAcknowledged?: boolean;
  assignedTo?: {
    id: number;
    fullName: string;
    role: string;
    tipGopay?: string | null;
    tipOvo?: string | null;
    tipDana?: string | null;
    tipShopeepay?: string | null;
    tipBank?: string | null;
  } | null;
};

function tipLines(staff: NonNullable<PortalTicket['assignedTo']>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (staff.tipGopay) out.push({ label: 'GoPay', value: staff.tipGopay });
  if (staff.tipOvo) out.push({ label: 'OVO', value: staff.tipOvo });
  if (staff.tipDana) out.push({ label: 'DANA', value: staff.tipDana });
  if (staff.tipShopeepay) out.push({ label: 'ShopeePay', value: staff.tipShopeepay });
  if (staff.tipBank) out.push({ label: 'Bank', value: staff.tipBank });
  return out;
}

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

const ticketCategoryOptions = [
  { value: 'GENERAL', label: 'Bantuan umum' },
  { value: 'ELECTRICITY', label: 'Listrik' },
  { value: 'PLUMBING', label: 'Air / Plumbing' },
  { value: 'AC', label: 'AC' },
  { value: 'WIFI', label: 'WiFi' },
  { value: 'DOOR_KEY', label: 'Kunci / Pintu' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'CLEANING', label: 'Kebersihan' },
  { value: 'PEST', label: 'Hama' },
  { value: 'SECURITY', label: 'Keamanan' },
  { value: 'NOISE', label: 'Keributan' },
  { value: 'CHECKIN_CHECKOUT', label: 'Bantuan Masuk Kamar / Keluar' },
  { value: 'PAYMENT_ADMIN', label: 'Tagihan / Admin' },
  { value: 'EMERGENCY', label: 'Darurat' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function MyTicketsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState(initialForm);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

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
      setError(toTenantFriendlyError(err, 'Gagal membuat laporan baru. Coba lagi atau hubungi admin.'));
    },
  });

  const tipAckMutation = useMutation({
    mutationFn: (ticketId: number) => createResource(`/tickets/${ticketId}/tip-acknowledge`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-tickets'] }),
  });

  const tickets = useMemo(() => query.data?.items ?? [], [query.data]);
  const activeTickets = useMemo(() => tickets.filter((ticket) => !['CLOSED', 'CANCELLED'].includes((ticket.status ?? '').toUpperCase())), [tickets]);
  const doneWaitingTickets = useMemo(() => tickets.filter((ticket) => (ticket.status ?? '').toUpperCase() === 'DONE'), [tickets]);
  const assistantItems: AssistantItem[] = [
    activeTickets.length ? {
      id: 'active-ticket',
      severity: doneWaitingTickets.length ? 'INFO' : 'MEDIUM',
      title: doneWaitingTickets.length ? 'Ada laporan yang sudah selesai dikerjakan' : 'Ada laporan yang masih ditangani',
      message: doneWaitingTickets.length ? 'Staff sudah menandai pekerjaan selesai. Admin akan menutup laporan setelah pengecekan akhir.' : 'Pantau status laporan dari daftar di bawah. Admin atau staff akan memberi pembaruan jika ada progres.',
      source: 'Laporan',
      count: activeTickets.length,
    } : null,
    !activeTickets.length ? {
      id: 'no-active-ticket',
      severity: 'SUCCESS',
      title: 'Tidak ada laporan aktif',
      message: 'Kalau ada masalah kamar, WiFi, atau tagihan, buat laporan baru dari tombol di atas.',
      source: 'Laporan',
    } : null,
  ].filter(Boolean) as AssistantItem[];

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
        title="Laporan Saya"
        description="Lihat laporan bantuan yang pernah kamu ajukan. Sistem otomatis menghubungkan laporan dengan kamar aktif kamu."
        secondaryAction={<Button onClick={() => setShowCreate(true)}>Buat Laporan Baru</Button>}
      />

      <FreeRepairPolicyCard />

      <AssistantPanel title="Asisten Laporan Kamu" subtitle="Ringkasan laporan yang masih perlu dipantau." items={assistantItems} maxItems={2} />

      <TenantStaffReviewPrompt />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Gagal memuat laporan kamu. Silakan coba lagi.</Alert> : null}
      {!query.isLoading && !query.isError && !tickets.length ? (
        <EmptyState
          icon="🎫"
          title="Belum ada laporan"
          description="Gunakan tombol di atas untuk membuat laporan saat membutuhkan bantuan."
          action={{ label: 'Buat Laporan Baru', onClick: () => setShowCreate(true) }}
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
                  <StatusBadge status={ticket.status} tone="tenant" domain="ticket" />
                  {ticket.category ? <StatusBadge status="INFO" customLabel={tenantCategoryLabel(ticket.category)} /> : null}
                  {ticket.priority ? <StatusBadge status="SECONDARY" customLabel={ticket.priority} /> : null}
                </div>
              </div>
              {['DONE', 'CLOSED'].includes((ticket.status ?? '').toUpperCase()) && ticket.assignedTo && tipLines(ticket.assignedTo).length > 0 ? (
                <Alert variant="light" className="border py-2 px-3 mb-2 small">
                  <span role="img" aria-hidden="true">🙏</span> Puas dengan kerja <strong>{ticket.assignedTo.fullName}</strong>? Beri tip langsung (opsional, di luar pembayaran kos):
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {tipLines(ticket.assignedTo).map((t) => (
                      <span key={t.label} className="badge bg-success-subtle text-success border">{t.label}: {t.value}</span>
                    ))}
                  </div>
                  <div className="mt-2">
                    {ticket.tipAcknowledged ? (
                      <span className="text-success fw-semibold">✓ Tip sudah kamu tandai — terima kasih! 🙏</span>
                    ) : (
                      <Button size="sm" variant="outline-success" disabled={tipAckMutation.isPending} onClick={() => tipAckMutation.mutate(ticket.id)}>
                        Saya sudah beri tip 🙏
                      </Button>
                    )}
                    <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>Hanya dihitung berapa kali (tanpa nominal), sebagai apresiasi di laporan staf.</div>
                  </div>
                </Alert>
              ) : null}
              {ticket.issueImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.issueImageUrl}
                    alt="Bukti laporan"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto laporan tidak bisa dimuat"
                    fallbackDescription="Detail laporan tetap tersedia di teks."
                    onClick={() => setLightbox({ src: ticket.issueImageUrl!, alt: 'Bukti laporan' })}
                  />
                </div>
              ) : null}
              {ticket.resolutionImageUrl ? (
                <div className="mb-2">
                  <SafeImage
                    src={ticket.resolutionImageUrl}
                    alt="Bukti selesai"
                    style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    fallbackTitle="Foto penyelesaian tidak bisa dimuat"
                    fallbackDescription="Status laporan tetap bisa dibaca."
                    onClick={() => setLightbox({ src: ticket.resolutionImageUrl!, alt: 'Bukti selesai' })}
                  />
                </div>
              ) : null}
              <div className="app-caption">{ticket.lastMessage || ticket.description || 'Belum ada pembaruan tambahan.'}</div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Buat Laporan Baru</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Alert variant="light" className="small">
            Sistem otomatis menghubungkan laporan dengan kamar aktif kamu. Kamu cukup isi masalah yang terjadi, tanpa ID teknis.
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Judul</Form.Label>
            <Form.Control value={formState.title} onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Kategori</Form.Label>
            <div className="flow-choice-grid" role="group" aria-label="Kategori laporan">
              {ticketCategoryOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`flow-choice-chip${formState.category === option.value ? ' active' : ''}`}
                  onClick={() => setFormState((prev) => ({ ...prev, category: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Deskripsi</Form.Label>
            <Form.Control as="textarea" rows={4} value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto Masalah (opsional)</Form.Label>
            <CameraOrGalleryInput onChange={handleTicketImage} disabled={uploadingImage} />
            <Form.Text muted>Preview akan dibuat kecil. Klik setelah laporan dibuat untuk melihat hasil di daftar tiket.</Form.Text>
            {imagePreview ? (
              <div className="mt-2">
                <SafeImage
                  src={imagePreview}
                  alt="Preview tiket"
                  style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }}
                  fallbackTitle="Preview foto tidak bisa dimuat"
                  fallbackDescription="Coba pilih ulang foto."
                />
              </div>
            ) : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formState.title.trim()}>
            {createMutation.isPending ? 'Menyimpan...' : 'Kirim Laporan'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(lightbox)} onHide={() => setLightbox(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h6 mb-0">{lightbox?.alt ?? 'Foto tiket'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0 bg-dark">
          {lightbox ? (
            <SafeImage
              src={lightbox.src}
              alt={lightbox.alt}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              fallbackTitle="Foto tidak bisa dimuat"
              fallbackDescription="Coba lagi nanti."
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
}
