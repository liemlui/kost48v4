import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import { listResource, postAction } from '../../api/resources';
import { uploadTicketImage } from '../../api/mediaUploads';
import { useAuth } from '../../context/AuthContext';

type TicketItem = {
  issueImageUrl?: string | null;
  resolutionImageUrl?: string | null;
  id: number;
  ticketNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  status: string;
  tenantId?: number;
  roomId?: number;
  stayId?: number;
  assignedToId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Future: jika backend menyediakan relasi
  tenant?: { id: number; fullName?: string; email?: string };
  room?: { id: number; code?: string; name?: string };
  stay?: { id: number; checkInDate?: string; checkOutDate?: string };
};

type UserOption = {
  id: number;
  fullName: string;
  role: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelations(item: TicketItem): string {
  const parts: string[] = [];
  
  // Prioritize relation names if available
  if (item.tenant?.fullName) {
    parts.push(`Tenant: ${item.tenant.fullName}`);
  } else if (item.tenantId) {
    parts.push(`Tenant #${item.tenantId}`);
  }
  
  if (item.room?.code || item.room?.name) {
    const roomLabel = item.room.code || item.room.name;
    parts.push(`Room: ${roomLabel}`);
  } else if (item.roomId) {
    parts.push(`Room #${item.roomId}`);
  }
  
  if (item.stay?.id) {
    parts.push(`Stay #${item.stay.id}`);
  } else if (item.stayId) {
    parts.push(`Stay #${item.stayId}`);
  }
  
  return parts.length > 0 ? parts.join(' · ') : 'Tidak ada relasi';
}


async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

function formatIdSummary(item: TicketItem): string {
  const parts: string[] = [];
  if (item.tenantId) parts.push(`Tenant #${item.tenantId}`);
  if (item.roomId) parts.push(`Room #${item.roomId}`);
  if (item.stayId) parts.push(`Stay #${item.stayId}`);
  return parts.join(' · ');
}

export default function TicketsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignMap, setAssignMap] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');
  const [doneTicket, setDoneTicket] = useState<TicketItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('Selesai ditangani');
  const [resolutionImageMeta, setResolutionImageMeta] = useState<any>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);

  const ticketsQuery = useQuery({ queryKey: ['tickets'], queryFn: () => listResource<TicketItem>('/tickets') });
  const usersQuery = useQuery({ queryKey: ['ticket-assignees'], queryFn: () => listResource<UserOption>('/users', { limit: 100 }) });

  const simpleAction = useMutation({
    mutationFn: ({ path, payload }: { path: string; payload?: any }) => postAction(path, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const items = useMemo(() => ticketsQuery.data?.items ?? [], [ticketsQuery.data]);
  const assignableUsers = useMemo(() => (usersQuery.data?.items ?? []).filter((item) => ['OWNER', 'ADMIN', 'STAFF'].includes(item.role)), [usersQuery.data]);

  const filteredItems = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;
      const matchKeyword = !term ? true : [item.ticketNumber, item.title, item.description, item.category].some((value) => String(value ?? '').toLowerCase().includes(term));
      return matchStatus && matchKeyword;
    });
  }, [items, keyword, statusFilter]);

  const openCount = items.filter((item) => item.status === 'OPEN').length;
  const progressCount = items.filter((item) => item.status === 'IN_PROGRESS').length;
  const doneCount = items.filter((item) => ['DONE', 'RESOLVED', 'CLOSED'].includes(item.status)).length;

  const actionError = simpleAction.error ? 'Gagal menjalankan aksi tiket. Coba lagi.' : '';
  const canAssign = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canProgress = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'STAFF';

  const handleResolutionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    const uploaded = await uploadTicketImage(compressed);
    setResolutionImageMeta(uploaded);
    setResolutionPreview(uploaded.fileUrl);
    event.target.value = '';
  };

  const submitMarkDone = () => {
    if (!doneTicket) return;
    simpleAction.mutate({ path: `/tickets/${doneTicket.id}/mark-done`, payload: { resolutionNote, resolutionImageUrl: resolutionImageMeta?.fileUrl, resolutionImageFileKey: resolutionImageMeta?.fileKey, resolutionImageOriginalFilename: resolutionImageMeta?.originalFilename, resolutionImageMimeType: resolutionImageMeta?.mimeType, resolutionImageFileSizeBytes: resolutionImageMeta?.fileSizeBytes } });
    setDoneTicket(null);
    setResolutionPreview(null);
    setResolutionImageMeta(null);
    setResolutionNote('Selesai ditangani');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Ticket operations"
        title="Tickets"
        description="Backoffice sekarang fokus ke triage, assignment, progress, dan closure ticket. Pembuatan ticket baru dipindahkan ke portal tenant agar konteks tenant/stay/room lebih alami."
      />

      <Row className="g-4 mb-4">
        <Col md={4}><StatCard title="Total ticket" value={items.length} subtitle="Semua ticket yang termuat" icon="🎫" /></Col>
        <Col md={4}><StatCard title="Masih dibuka" value={openCount + progressCount} subtitle="Open + in progress" icon="🛎️" variant={openCount + progressCount > 0 ? 'warning' : 'success'} /></Col>
        <Col md={4}><StatCard title="Selesai" value={doneCount} subtitle="Done / closed" icon="✅" variant="success" /></Col>
      </Row>

      <Alert variant="info" className="mb-4">
        <strong>Flow baru:</strong> ticket baru diajukan tenant dari portal. Halaman ini dipakai admin/staff untuk menindaklanjuti, assign, memulai pekerjaan, menandai selesai, dan menutup ticket.
      </Alert>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Filter ticket</div>
              <div className="panel-subtitle">Saring berdasarkan status atau cari nomor, judul, dan kategori ticket.</div>
            </div>
            <div className="table-meta-count">Menampilkan {filteredItems.length} dari {items.length} ticket</div>
          </div>

          <div className="toolbar-card mt-3">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">Semua Status</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="CLOSED">Closed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Pencarian</Form.Label>
                  <Form.Control placeholder="Cari nomor ticket, judul, kategori, atau deskripsi" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <div className="summary-strip">
                  <div className="summary-chip"><span className="summary-chip-label">Open</span><span className="summary-chip-value">{openCount}</span></div>
                  <div className="summary-chip"><span className="summary-chip-label">Progress</span><span className="summary-chip-value">{progressCount}</span></div>
                </div>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>

      {actionError ? <Alert variant="danger">{actionError}</Alert> : null}

      <Card className="content-card border-0">
        <Card.Body>
          {ticketsQuery.isLoading ? <TableSkeleton rows={5} cols={6} /> : null}
          {ticketsQuery.isError ? <Alert variant="danger">Gagal memuat ticket. Silakan coba lagi.</Alert> : null}
          {!ticketsQuery.isLoading && !ticketsQuery.isError && !filteredItems.length ? (
            <EmptyState icon="🎫" title="Belum ada ticket" description="Belum ada ticket yang perlu ditindaklanjuti saat ini." />
          ) : null}

          {!ticketsQuery.isLoading && !ticketsQuery.isError && filteredItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>No. Ticket</th>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>Relasi</th>
                  <th>Assigned To</th>
                  <th>Diperbarui</th>
                  <th style={{ width: 290 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.ticketNumber ?? `TIK-${item.id}`}</div>
                      <div className="small text-muted">{item.category || 'GENERAL'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{item.title || `Tiket #${item.id}`}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>{item.description || 'Tidak ada deskripsi tambahan.'}</div>{item.issueImageUrl ? <div className="mt-1"><img src={item.issueImageUrl} alt="Foto masalah" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 6 }} /></div> : null}{item.resolutionImageUrl ? <div className="mt-1"><img src={item.resolutionImageUrl} alt="Foto selesai" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 6 }} /></div> : null}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="small">{formatRelations(item)}</div>
                      {formatIdSummary(item) && (
                        <div className="small text-muted mt-1">{formatIdSummary(item)}</div>
                      )}
                    </td>
                    <td>
                      {canAssign ? (
                        <>
                          <Form.Select size="sm" value={assignMap[item.id] ?? String(item.assignedToId ?? '')} onChange={(e) => setAssignMap((prev) => ({ ...prev, [item.id]: e.target.value }))} disabled={usersQuery.isLoading}>
                            <option value="">Belum di-assign</option>
                            {assignableUsers.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.fullName} · {assignee.role}</option>)}
                          </Form.Select>
                          {item.assignedToId ? <div className="small text-muted mt-1">Assigned user #{item.assignedToId}</div> : null}
                        </>
                      ) : (
                        <div className="small text-muted">{item.assignedToId ? `User #${item.assignedToId}` : 'Menunggu assign admin'}</div>
                      )}
                    </td>
                    <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {canAssign ? <Button size="sm" variant="outline-primary" disabled={!assignMap[item.id] || simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/assign`, payload: { assignedToId: Number(assignMap[item.id]) } })}>Assign</Button> : null}
                        {canProgress && item.status === 'OPEN' ? <Button size="sm" variant="outline-secondary" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>Mulai</Button> : null}
                        {canProgress && item.status === 'IN_PROGRESS' ? <Button size="sm" variant="outline-success" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>Tandai Selesai</Button> : null}
                        {canProgress && item.status === 'DONE' ? <Button size="sm" variant="success" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/close`, payload: { action: 'CLOSE' } })}>Tutup Ticket</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card.Body>
      </Card>
      <Modal show={Boolean(doneTicket)} onHide={() => setDoneTicket(null)} centered>
        <Modal.Header closeButton><Modal.Title>Bukti Penyelesaian Ticket</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Catatan Penyelesaian</Form.Label>
            <Form.Control as="textarea" rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.currentTarget.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto Penyelesaian</Form.Label>
            <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResolutionImage} />
            <Form.Text muted>Preview kecil. Foto besar cukup dibuka saat dibutuhkan.</Form.Text>
            {resolutionPreview ? <div className="mt-2"><img src={resolutionPreview} alt="Preview penyelesaian" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDoneTicket(null)}>Batal</Button>
          <Button variant="success" onClick={submitMarkDone} disabled={!resolutionImageMeta || simpleAction.isPending}>Simpan & Tandai Selesai</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
