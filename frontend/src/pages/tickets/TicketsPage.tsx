import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import { AssistantPanel, CompactMetrics, ActionQueueTable, type AssistantItem, type MetricChip, type ActionQueueItem } from '../../components/command-center';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import StatusBadge from '../../components/common/StatusBadge';
import AdminStaffFieldReportQueue from '../../components/staff/AdminStaffFieldReportQueue';
import { getTicketStatusLabel, inventoryItemFinalStatusOptions, roomItemFinalStatusOptions } from '../../constants/staffRepairOptions';
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
  linkedRoomItemId?: number | null;
  linkedInventoryItemId?: number | null;
  finalRoomItemStatus?: string | null;
  finalInventoryItemStatus?: string | null;
  staffFieldReports?: any[];
  createdAt?: string;
  updatedAt?: string;
  tenant?: { id: number; fullName?: string; email?: string };
  room?: { id: number; code?: string; name?: string };
  stay?: { id: number; checkInDate?: string; checkOutDate?: string };
};

type UserOption = { id: number; fullName: string; role: string };
type StatusTab = 'ALL' | 'URGENT' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelations(item: TicketItem): string {
  const parts: string[] = [];
  if (item.tenant?.fullName) parts.push(item.tenant.fullName);
  else if (item.tenantId) parts.push(`Penghuni #${item.tenantId}`);
  if (item.room?.code || item.room?.name) parts.push(item.room.code || item.room.name || '');
  else if (item.roomId) parts.push(`Kamar #${item.roomId}`);
  if (item.stay?.id) parts.push(`Masa sewa #${item.stay.id}`);
  else if (item.stayId) parts.push(`Masa sewa #${item.stayId}`);
  return parts.join(' · ') || 'Tidak ada lokasi';
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


function getStaffStatusText(status: string) {
  return getTicketStatusLabel(status);
}

function cleanStaffDescription(description?: string | null) {
  if (!description) return '';
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^---$/.test(line))
    .filter((line) => !/^(Waktu|Pelapor|RoomItem ID|InventoryItem ID|Status sementara sistem|Status final barang|Jumlah stok resmi|Keputusan final)/i.test(line));
  const note = lines.find((line) => /^Catatan:/i.test(line));
  const base = (note || lines.find((line) => !/^[A-Z_]+$/.test(line)) || lines[0] || '').replace(/^Catatan:\s*/i, '');
  return base.length > 150 ? `${base.slice(0, 147)}...` : base;
}

function ticketHasRoomItemDecision(item?: TicketItem | null) {
  return Boolean(item?.linkedRoomItemId || item?.staffFieldReports?.some((report) => report?.roomItemId));
}

function ticketHasInventoryDecision(item?: TicketItem | null) {
  return Boolean(item?.linkedInventoryItemId || item?.staffFieldReports?.some((report) => report?.inventoryItemId));
}

function getStatusClass(status: string) {
  return String(status || 'secondary').toLowerCase().replace(/_/g, '-');
}

function getStaffActionText(status: string) {
  if (status === 'OPEN') return 'Mulai Kerjakan';
  if (status === 'IN_PROGRESS') return 'Tandai Selesai';
  if (status === 'DONE') return 'Sudah selesai';
  return 'Lihat';
}

function getStaffCategoryText(category?: string | null) {
  const value = String(category ?? '').toUpperCase();
  if (value === 'BARANG_RUSAK') return 'Barang rusak / hilang';
  if (value === 'STOK_HABIS') return 'Stok habis';
  if (value === 'CEK_KAMAR') return 'Cek kamar';
  if (value === 'CATATAN_METER') return 'Catat meter';
  if (value === 'KEBERSIHAN') return 'Bersih-bersih';
  if (value === 'PERBAIKAN') return 'Perbaikan';
  return category || 'Tugas';
}

function getStaffLocation(item: TicketItem) {
  if (item.room?.code || item.room?.name) return `Kamar ${item.room.code || item.room.name}`;
  if (item.roomId) return `Kamar #${item.roomId}`;
  if (item.tenant?.fullName) return item.tenant.fullName;
  return 'Lokasi belum ditulis';
}

function staffSortScore(item: TicketItem) {
  if (item.status === 'OPEN') return 0;
  if (item.status === 'IN_PROGRESS') return 1;
  if (item.status === 'DONE') return 2;
  return 9;
}

function StaffTicketsMode({
  items,
  isLoading,
  isError,
  activeTab,
  setActiveTab,
  simpleAction,
  setDoneTicket,
}: {
  items: TicketItem[];
  isLoading: boolean;
  isError: boolean;
  activeTab: StatusTab;
  setActiveTab: (tab: StatusTab) => void;
  simpleAction: any;
  setDoneTicket: (ticket: TicketItem | null) => void;
}) {
  const activeWork = useMemo(
    () => items
      .filter((item) => item.status !== 'CLOSED')
      .sort((a, b) => staffSortScore(a) - staffSortScore(b) || new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
    [items],
  );

  const openCount = activeWork.filter((item) => item.status === 'OPEN').length;
  const progressCount = activeWork.filter((item) => item.status === 'IN_PROGRESS').length;
  const doneCount = activeWork.filter((item) => item.status === 'DONE').length;

  const visibleItems = activeWork.filter((item) => {
    if (activeTab === 'ALL') return item.status === 'OPEN' || item.status === 'IN_PROGRESS' || item.status === 'DONE';
    if (activeTab === 'URGENT') return item.status === 'OPEN';
    if (activeTab === 'OPEN' || activeTab === 'IN_PROGRESS' || activeTab === 'DONE') return item.status === activeTab;
    return false;
  });

  const chips: { key: StatusTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'Semua tugas', count: openCount + progressCount },
    { key: 'URGENT', label: 'Kerjakan dulu', count: openCount },
    { key: 'IN_PROGRESS', label: 'Sedang dikerjakan', count: progressCount },
    { key: 'DONE', label: 'Tunggu dicek', count: doneCount },
  ];

  return (
    <div className="staff-simple-mode">
      <PageHeader
        eyebrow="Pekerjaan Lapangan"
        title="Tugas Lapangan"
        description="Kerjakan dari atas ke bawah. Mulai tugas, selesaikan, lalu kirim catatan dan foto bukti."
      />

      <div className="staff-work-scope-note">
        Halaman ini hanya untuk mengerjakan tugas aktif. Laporan baru dibuat dari Beranda Kerja atau Cek Kamar.
      </div>

      {simpleAction.isError ? <Alert variant="danger" className="staff-alert">Aksi gagal. Coba sekali lagi.</Alert> : null}
      {isError ? <Alert variant="danger" className="staff-alert">Tugas belum bisa dimuat. Coba muat ulang halaman.</Alert> : null}

      <Card className="staff-work-panel border-0">
        <Card.Body>
          <div className="staff-filter-row" aria-label="Pilih jenis tugas">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`staff-filter-chip${activeTab === chip.key ? ' active' : ''}`}
                onClick={() => setActiveTab(chip.key)}
              >
                <span>{chip.label}</span>
                <strong>{chip.count}</strong>
              </button>
            ))}
          </div>

          {isLoading ? <div className="staff-empty-box">Memuat tugas...</div> : null}
          {!isLoading && !isError && !visibleItems.length ? (
            <div className="staff-empty-box">
              <strong>Tidak ada tugas sekarang.</strong>
              <span>Kalau ada pekerjaan baru, akan muncul di sini.</span>
            </div>
          ) : null}

          {!isLoading && !isError && visibleItems.length ? (
            <div className="staff-work-list">
              {visibleItems.map((item, index) => (
                <article key={item.id} className={`staff-work-card staff-status-${item.status.toLowerCase()}`}>
                  <div className="staff-work-rank">{index + 1}</div>
                  <div className="staff-work-main">
                    <div className="staff-work-topline">
                      <span className={`staff-status-pill status-${getStatusClass(item.status)}`}>{getStaffStatusText(item.status)}</span>
                      <span className="staff-category-pill">{getStaffCategoryText(item.category)}</span>
                    </div>
                    <h3>{item.title || item.ticketNumber || `Tiket #${item.id}`}</h3>
                    <p>{getStaffLocation(item)}</p>
                    {item.description ? <small>{item.description}</small> : null}
                  </div>
                  <div className="staff-work-action">
                    {item.status === 'OPEN' ? (
                      <Button size="sm" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>
                        Mulai Kerjakan
                      </Button>
                    ) : null}
                    {item.status === 'IN_PROGRESS' ? (
                      <Button size="sm" variant="success" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>
                        Tandai Selesai
                      </Button>
                    ) : null}
                    {item.status === 'DONE' ? (
                      <span className="staff-done-note">Tunggu dicek</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}

export default function TicketsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [assignMap, setAssignMap] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [keyword, setKeyword] = useState('');
  const [doneTicket, setDoneTicket] = useState<TicketItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('Sudah dikerjakan');
  const [resolutionImageMeta, setResolutionImageMeta] = useState<any>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [closeTicket, setCloseTicket] = useState<TicketItem | null>(null);
  const [finalRoomItemStatus, setFinalRoomItemStatus] = useState('GOOD');
  const [finalInventoryItemStatus, setFinalInventoryItemStatus] = useState('GOOD');
  const [finalAdminNote, setFinalAdminNote] = useState('');

  const ticketsQuery = useQuery({ queryKey: ['tickets'], queryFn: () => listResource<TicketItem>('/tickets') });
  const usersQuery = useQuery({ queryKey: ['ticket-assignees'], queryFn: () => listResource<UserOption>('/users', { limit: 100 }) });

  const simpleAction = useMutation({
    mutationFn: ({ path, payload }: { path: string; payload?: any }) => postAction(path, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-evidence'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-staff-performance'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-field-report-review-queue'] }),
      ]);
    },
  });

  const items = useMemo(() => ticketsQuery.data?.items ?? [], [ticketsQuery.data]);
  const assignableUsers = useMemo(() => (usersQuery.data?.items ?? []).filter((item) => ['OWNER', 'ADMIN', 'STAFF'].includes(item.role)), [usersQuery.data]);

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === 'OPEN').length,
    inProgress: items.filter((i) => i.status === 'IN_PROGRESS').length,
    done: items.filter((i) => i.status === 'DONE').length,
    closed: items.filter((i) => i.status === 'CLOSED').length,
  };

  const filteredItems = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchTab = activeTab === 'ALL' ? true : item.status === activeTab;
      const matchKeyword = !term ? true : [item.ticketNumber, item.title, item.description, item.category].some((v) => String(v ?? '').toLowerCase().includes(term));
      return matchTab && matchKeyword;
    });
  }, [items, keyword, activeTab]);

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
    setResolutionNote('Sudah dikerjakan');
  };

  const submitCloseTicket = () => {
    if (!closeTicket) return;
    simpleAction.mutate({
      path: `/tickets/${closeTicket.id}/close`,
      payload: {
        action: 'CLOSE',
        finalRoomItemStatus: ticketHasRoomItemDecision(closeTicket) ? finalRoomItemStatus : undefined,
        finalInventoryItemStatus: ticketHasInventoryDecision(closeTicket) ? finalInventoryItemStatus : undefined,
        finalAdminNote: finalAdminNote.trim() || undefined,
      },
    });
    setCloseTicket(null);
    setFinalRoomItemStatus('GOOD');
    setFinalInventoryItemStatus('GOOD');
    setFinalAdminNote('');
  };

  const assistantItems: AssistantItem[] = [
    counts.open ? {
      id: 'ticket-open',
      severity: 'HIGH',
      title: `${counts.open} tiket belum dikerjakan`,
      message: 'Buka tiketnya, lalu mulai kerjakan. Kalau butuh bantuan, laporkan ke admin.',
      source: 'Daftar kerja',
      count: counts.open,
      actionLabel: 'Lihat tiket baru',
      onAction: () => setActiveTab('OPEN'),
    } : null,
    counts.inProgress ? {
      id: 'ticket-progress',
      severity: 'MEDIUM',
      title: `${counts.inProgress} tiket sedang dikerjakan`,
      message: 'Selesaikan pekerjaan, foto hasilnya, lalu tandai selesai.',
      source: 'Perbaikan',
      count: counts.inProgress,
      actionLabel: 'Lihat yang dikerjakan',
      onAction: () => setActiveTab('IN_PROGRESS'),
    } : null,
    counts.done ? {
      id: 'ticket-done',
      severity: 'INFO',
      title: `${counts.done} tiket menunggu dicek admin`,
      message: 'Hasil kerja sudah ditandai selesai. Admin bisa cek lalu tutup tiket.',
      source: 'Cek hasil',
      count: counts.done,
      actionLabel: 'Lihat selesai',
      onAction: () => setActiveTab('DONE'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'open', label: 'Baru', value: counts.open, helper: 'Belum ditangani', icon: '🔴', status: counts.open ? 'DANGER' : 'SUCCESS', onClick: () => setActiveTab('OPEN') },
    { id: 'progress', label: 'Dikerjakan', value: counts.inProgress, helper: 'Sedang dikerjakan', icon: '🟡', status: counts.inProgress ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('IN_PROGRESS') },
    { id: 'done', label: 'Selesai', value: counts.done, helper: 'Menunggu dicek', icon: '✅', status: counts.done ? 'INFO' : 'SUCCESS', onClick: () => setActiveTab('DONE') },
    { id: 'closed', label: 'Ditutup', value: counts.closed, helper: 'Sudah ditutup', icon: '□', status: 'SUCCESS', onClick: () => setActiveTab('CLOSED') },
  ];

  const actionQueueItems: ActionQueueItem[] = filteredItems
    .filter((item) => item.status !== 'CLOSED')
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      priority: item.status === 'OPEN' ? 'HIGH' : item.status === 'IN_PROGRESS' ? 'MEDIUM' : 'INFO',
      type: item.category || 'Tiket',
      subject: item.title || item.ticketNumber || `Tiket #${item.id}`,
      issue: formatRelations(item),
      age: `Diperbarui ${formatDate(item.updatedAt || item.createdAt)}`,
      recommendedAction: item.status === 'OPEN' ? 'Mulai kerjakan' : item.status === 'IN_PROGRESS' ? 'Tandai selesai' : 'Cek hasil',
    }));

  const tabs: { key: StatusTab; label: string; count: number; cls?: string }[] = [
    { key: 'ALL', label: 'Semua', count: counts.all },
    { key: 'OPEN', label: '🔴 Baru', count: counts.open, cls: 'tab-danger' },
    { key: 'IN_PROGRESS', label: '🟡 Dikerjakan', count: counts.inProgress, cls: 'tab-warn' },
    { key: 'DONE', label: '✅ Selesai', count: counts.done, cls: 'tab-success' },
    { key: 'CLOSED', label: 'Ditutup', count: counts.closed },
  ];

  if (user?.role === 'STAFF') {
    return (
      <>
        <StaffTicketsMode
          items={items}
          isLoading={ticketsQuery.isLoading}
          isError={ticketsQuery.isError}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          simpleAction={simpleAction}
          setDoneTicket={setDoneTicket}
        />

        <Modal show={Boolean(doneTicket)} onHide={() => setDoneTicket(null)} centered>
          <Modal.Header closeButton><Modal.Title>Tandai Pekerjaan Selesai</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Catatan hasil kerja</Form.Label>
              <Form.Control as="textarea" rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.currentTarget.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Foto bukti selesai</Form.Label>
              <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResolutionImage} />
              {resolutionPreview ? <div className="mt-2"><img src={resolutionPreview} alt="Foto yang dipilih" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDoneTicket(null)}>Batal</Button>
            <Button variant="success" onClick={submitMarkDone} disabled={!resolutionImageMeta || simpleAction.isPending}>Simpan Selesai</Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Papan Kerja"
        title="Tiket Bantuan"
        description="Daftar keluhan dan pekerjaan. Kerjakan tiket dari yang paling penting, lalu upload bukti selesai."
      />

      {(user?.role === 'OWNER' || user?.role === 'ADMIN') ? <AdminStaffFieldReportQueue /> : null}

      <AssistantPanel
        title="Arahan Kerja"
        subtitle="Yang perlu dikerjakan dulu. Bahasa singkat supaya mudah diikuti."
        items={assistantItems}
        emptyTitle="Tidak ada tiket aktif"
        emptyMessage="Belum ada keluhan atau pekerjaan yang perlu dikerjakan sekarang."
      />
      <CompactMetrics metrics={metrics} />
      <ActionQueueTable
        title="Daftar Kerja Hari Ini"
        subtitle="Ambil dari atas. Klik tombol aksi, kerjakan, lalu catat hasilnya."
        items={actionQueueItems}
        emptyTitle="Tidak ada tugas tiket"
        emptyDescription="Semua tiket pada filter ini sudah selesai atau belum ada data."
      />

      <Card className="content-card border-0 mb-3 command-filter-card">
        <Card.Body className="py-3">
          <div className="table-meta mb-0">
            <div>
              <div className="panel-title">Cari tiket</div>
              <div className="panel-subtitle">Pilih status atau ketik nomor/judul tiket.</div>
            </div>
            <span className="table-meta-count">{filteredItems.length} dari {items.length} tiket</span>
          </div>
          <div className="compact-filter-bar mt-3">
            <Form.Select
              aria-label="Filter status tiket"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as StatusTab)}
              style={{ maxWidth: 220 }}
            >
              <option value="ALL">Semua status</option>
              <option value="OPEN">Baru</option>
              <option value="IN_PROGRESS">Sedang dikerjakan</option>
              <option value="DONE">Selesai dikerjakan</option>
              <option value="CLOSED">Ditutup</option>
            </Form.Select>
            <Form.Control
              placeholder="🔍  Nomor tiket, judul, atau jenis pekerjaan..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ maxWidth: 320 }}
            />
          </div>
        </Card.Body>
      </Card>

      {simpleAction.isError ? <Alert variant="danger" className="mb-3">Gagal menjalankan aksi tiket. Coba lagi.</Alert> : null}

      <Card className="content-card border-0">
        <Card.Body>
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">Daftar tiket</div>
              <div className="panel-subtitle">Pilih status, lalu kerjakan satu per satu.</div>
            </div>
            <div className="status-tab-bar compact-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`status-tab${tab.cls ? ` ${tab.cls}` : ''}${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="tab-badge">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
          {ticketsQuery.isLoading ? <TableSkeleton rows={5} cols={6} /> : null}
          {ticketsQuery.isError ? <Alert variant="danger">Gagal memuat tiket. Muat ulang halaman.</Alert> : null}
          {!ticketsQuery.isLoading && !ticketsQuery.isError && !filteredItems.length ? (
            <EmptyState icon="🎫" title="Belum ada tiket" description="Belum ada tiket yang perlu dikerjakan sekarang." />
          ) : null}

          {!ticketsQuery.isLoading && !ticketsQuery.isError && filteredItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Lokasi/Orang</th>
                  <th>Petugas</th>
                  <th>Diperbarui</th>
                  <th style={{ width: 270 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.ticketNumber ?? `TIK-${item.id}`}</div>
                      <div className="small text-muted">{item.category || 'Umum'}</div>
                    </td>
                    <td>
                      <div className="fw-semibold">{item.title || `Tiket #${item.id}`}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>{item.description || 'Tidak ada deskripsi tambahan.'}</div>
                      {item.issueImageUrl ? <div className="mt-1"><img src={item.issueImageUrl} alt="Foto masalah" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 6 }} /></div> : null}
                      {item.resolutionImageUrl ? <div className="mt-1"><img src={item.resolutionImageUrl} alt="Foto selesai" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 6 }} /></div> : null}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><div className="small">{formatRelations(item)}</div></td>
                    <td>
                      {canAssign ? (
                        <>
                          <Form.Select size="sm" value={assignMap[item.id] ?? String(item.assignedToId ?? '')} onChange={(e) => setAssignMap((prev) => ({ ...prev, [item.id]: e.target.value }))} disabled={usersQuery.isLoading}>
                            <option value="">Pilih petugas</option>
                            {assignableUsers.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.fullName}</option>)}
                          </Form.Select>
                          {item.assignedToId ? <div className="small text-muted mt-1">Petugas #{item.assignedToId}</div> : null}
                        </>
                      ) : (
                        <div className="small text-muted">{item.assignedToId ? `Petugas #${item.assignedToId}` : 'Belum ada petugas'}</div>
                      )}
                    </td>
                    <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {canAssign ? <Button size="sm" variant="outline-primary" disabled={!assignMap[item.id] || simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/assign`, payload: { assignedToId: Number(assignMap[item.id]) } })}>Tugaskan</Button> : null}
                        {canProgress && item.status === 'OPEN' ? <Button size="sm" variant="outline-secondary" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>Mulai Kerjakan</Button> : null}
                        {canProgress && item.status === 'IN_PROGRESS' ? <Button size="sm" variant="outline-success" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>Tandai Selesai</Button> : null}
                        {canProgress && item.status === 'DONE' ? <Button size="sm" variant="success" disabled={simpleAction.isPending} onClick={() => setCloseTicket(item)}>Tutup + Keputusan Final</Button> : null}
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
        <Modal.Header closeButton><Modal.Title>Catat Pekerjaan Selesai</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Catatan hasil kerja</Form.Label>
            <Form.Control as="textarea" rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.currentTarget.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto bukti selesai</Form.Label>
            <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResolutionImage} />
            {resolutionPreview ? <div className="mt-2"><img src={resolutionPreview} alt="Foto yang dipilih" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDoneTicket(null)}>Batal</Button>
          <Button variant="success" onClick={submitMarkDone} disabled={!resolutionImageMeta || simpleAction.isPending}>Simpan dan Tandai Selesai</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(closeTicket)} onHide={() => setCloseTicket(null)} centered>
        <Modal.Header closeButton><Modal.Title>Konfirmasi selesai + status akhir barang</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="py-2 small">Tutup tiket hanya setelah bukti staff dicek. Jika ada barang terkait, pilih status akhir agar data kamar/gudang tetap rapi.</Alert>
          {ticketHasRoomItemDecision(closeTicket) ? (
            <Form.Group className="mb-3">
              <Form.Label>Status akhir barang kamar</Form.Label>
              <Form.Select value={finalRoomItemStatus} onChange={(event) => setFinalRoomItemStatus(event.currentTarget.value)}>
                {roomItemFinalStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Form.Select>
            </Form.Group>
          ) : null}
          {ticketHasInventoryDecision(closeTicket) ? (
            <Form.Group className="mb-3">
              <Form.Label>Status akhir barang gudang</Form.Label>
              <Form.Select value={finalInventoryItemStatus} onChange={(event) => setFinalInventoryItemStatus(event.currentTarget.value)}>
                {inventoryItemFinalStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Form.Select>
            </Form.Group>
          ) : null}
          <Form.Group>
            <Form.Label>Catatan final admin</Form.Label>
            <Form.Control as="textarea" rows={3} value={finalAdminNote} onChange={(event) => setFinalAdminNote(event.currentTarget.value)} placeholder="Contoh: lampu baru sudah terpasang, status barang kembali baik" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setCloseTicket(null)}>Batal</Button>
          <Button variant="success" disabled={simpleAction.isPending} onClick={submitCloseTicket}>Tutup Tiket</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
