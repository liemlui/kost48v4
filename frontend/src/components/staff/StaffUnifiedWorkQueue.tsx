import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completeStaffRoutine, sendStaffRoutineNeedHelp, startStaffRoutine, type StaffRoutineItem, type StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { postAction } from '../../api/resources';
import { listStaffFieldReports } from '../../api/staffFieldReports';
import { fieldReportStatusLabels, getTicketStatusLabel } from '../../constants/staffRepairOptions';
import { uploadTicketImage, type UploadedImageMeta } from '../../api/mediaUploads';
import PaginationControls from '../common/PaginationControls';
import SegmentedTabs from '../common/SegmentedTabs';
import CameraOrGalleryInput from '../common/CameraOrGalleryInput';
import SafeImage from '../common/SafeImage';
import { useClientPagination } from '../../hooks/useClientPagination';
import type { StaffFieldReport, Ticket } from '../../types';
import { compressImageFile as compressBrowserImage } from '../../utils/compressImageFile';

type WorkType = 'CLEANING' | 'REPAIR' | 'ROOM' | 'WAREHOUSE' | 'METER' | 'OTHER';
type WorkStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'WAITING_CHECK' | 'NEED_HELP';
type WorkFilterKey = 'ALL' | 'DONE' | WorkType;

type WorkItem = {
  uid: string;
  source: 'ROUTINE' | 'TICKET';
  id: number;
  title: string;
  description?: string | null;
  location: string;
  type: WorkType;
  typeLabel: string;
  status: WorkStatus;
  statusLabel: string;
  sort: number;
  routine?: StaffRoutineItem;
  ticket?: Ticket;
};

type ModalState =
  | { action: 'START'; item: WorkItem }
  | { action: 'COMPLETE'; item: WorkItem }
  | { action: 'NEED_HELP'; item: WorkItem }
  | null;

type Props = {
  routines?: StaffRoutineTodayResponse | null;
  tickets: Ticket[];
  isLoading?: boolean;
  onUpdated?: () => void | Promise<void>;
};

const filters: Array<{ key: WorkFilterKey; label: string }> = [
  { key: 'ALL', label: 'Aktif' },
  { key: 'CLEANING', label: 'Kebersihan' },
  { key: 'REPAIR', label: 'Perbaikan' },
  { key: 'ROOM', label: 'Kamar' },
  { key: 'WAREHOUSE', label: 'Gudang' },
  { key: 'METER', label: 'Meter' },
  { key: 'DONE', label: 'Selesai' },
];

const WORK_FILTER_ICONS: Partial<Record<WorkFilterKey, string>> = {
  ALL: '📋', CLEANING: '🧹', REPAIR: '🔧', ROOM: '🚪', WAREHOUSE: '📦', METER: '⚡', DONE: '✅',
};


function fieldReportTitle(report: StaffFieldReport) {
  return report.roomItem?.item?.name || report.inventoryItem?.name || report.ticket?.title || `Laporan #${report.id}`;
}

function fieldReportLocation(report: StaffFieldReport) {
  return report.room?.code || report.roomItem?.room?.code || report.ticket?.room?.code || 'Gudang / umum';
}

function fieldReportStatusLabel(status?: string | null) {
  return status ? fieldReportStatusLabels[status] || 'Menunggu cek admin' : 'Laporan terkirim';
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

function routineType(item: StaffRoutineItem): { type: WorkType; label: string } {
  const area = String(item.areaType ?? '').toUpperCase();
  if (area === 'CLEANING' || area === 'BATHROOM' || area === 'GENERAL') return { type: 'CLEANING', label: item.frequency === 'DAILY' ? 'Kebersihan rutin' : 'Pekerjaan rutin' };
  if (area === 'ROOM') return { type: 'ROOM', label: 'Cek kamar' };
  if (area === 'INVENTORY') return { type: 'WAREHOUSE', label: 'Stok/gudang' };
  if (area === 'METER') return { type: 'METER', label: 'Meter listrik/air' };
  return { type: 'OTHER', label: 'Pekerjaan rutin' };
}

function ticketType(ticket: Ticket): { type: WorkType; label: string } {
  const value = String(ticket.category ?? '').toUpperCase();
  if (value === 'CHECKOUT_INSPECTION') return { type: 'ROOM', label: 'Cek kamar keluar' };
  if (value.includes('CLEAN')) return { type: 'CLEANING', label: 'Kebersihan tambahan' };
  if (value.includes('STOK') || value.includes('INVENTORY')) return { type: 'WAREHOUSE', label: 'Stok/gudang' };
  if (value.includes('METER')) return { type: 'METER', label: 'Meter listrik/air' };
  if (value.includes('KAMAR') || value.includes('ROOM')) return { type: 'ROOM', label: 'Cek kamar' };
  return { type: 'REPAIR', label: 'Perbaikan' };
}

function roomLabel(ticket?: Ticket, routine?: StaffRoutineItem) {
  if (ticket?.room?.code || ticket?.room?.name) return `Kamar ${ticket.room?.code || ticket.room?.name}`;
  if (ticket?.roomId) return `Kamar #${ticket.roomId}`;
  if (routine?.room?.code || routine?.room?.name) return `Kamar ${routine.room?.code || routine.room?.name}`;
  if (routine?.roomId) return `Kamar #${routine.roomId}`;
  return 'Area umum';
}

function statusInfo(source: 'ROUTINE' | 'TICKET', rawStatus?: string | null): { status: WorkStatus; label: string; sort: number } {
  const status = String(rawStatus ?? 'TODO').toUpperCase();
  if (status === 'IN_PROGRESS') return { status: 'IN_PROGRESS', label: 'Sedang dikerjakan', sort: 0 };
  if (status === 'OPEN' || status === 'TODO') return { status: 'TODO', label: 'Belum mulai', sort: 1 };
  if (status === 'NEED_HELP') return { status: 'NEED_HELP', label: 'Butuh bantuan', sort: 2 };
  if (status === 'DONE') return source === 'TICKET'
    ? { status: 'WAITING_CHECK', label: getTicketStatusLabel(status), sort: 4 }
    : { status: 'DONE', label: 'Selesai', sort: 5 };
  if (status === 'CANCELLED') return { status: 'DONE', label: getTicketStatusLabel(status), sort: 7 };
  if (status === 'CLOSED') return { status: 'DONE', label: getTicketStatusLabel(status), sort: 6 };
  return { status: 'DONE', label: 'Selesai', sort: 6 };
}

function buildWorkItems(routines: StaffRoutineItem[], tickets: Ticket[]): WorkItem[] {
  const routineItems = routines
    .filter((item) => !['SKIPPED'].includes(String(item.status ?? '').toUpperCase()))
    .map((item) => {
      const type = routineType(item);
      const status = statusInfo('ROUTINE', item.status);
      return {
        uid: `routine-${item.occurrenceKey}`,
        source: 'ROUTINE' as const,
        id: item.templateId,
        title: item.title,
        description: item.description,
        location: roomLabel(undefined, item),
        type: type.type,
        typeLabel: type.label,
        status: status.status,
        statusLabel: status.label,
        sort: status.sort + (item.frequency === 'DAILY' ? 0 : item.frequency === 'WEEKLY' ? 0.2 : 0.4),
        routine: item,
      };
    });

  const ticketItems = tickets
    .filter((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(String(ticket.status ?? '').toUpperCase()))
    .map((ticket) => {
      const type = ticketType(ticket);
      const status = statusInfo('TICKET', ticket.status);
      return {
        uid: `ticket-${ticket.id}`,
        source: 'TICKET' as const,
        id: ticket.id,
        title: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`,
        description: cleanStaffDescription(ticket.description),
        location: roomLabel(ticket),
        type: type.type,
        typeLabel: type.label,
        status: status.status,
        statusLabel: status.label,
        sort: status.sort + (ticket.status === 'OPEN' ? 0.1 : 0),
        ticket,
      };
    });

  return [...routineItems, ...ticketItems].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
}

async function compressImageFile(file: File): Promise<File> {
  return compressBrowserImage(file, { maxSide: 1400, quality: 0.78 });
}

export default function StaffUnifiedWorkQueue({ routines, tickets, isLoading, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<WorkFilterKey>('ALL');
  const [modal, setModal] = useState<ModalState>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const reportsQuery = useQuery({
    queryKey: ['staff-field-reports', 'assigned-to-me'],
    queryFn: () => listStaffFieldReports({ assignedToMe: 'true' }),
    staleTime: 60_000,
  });
  const pendingReports = useMemo(() => (reportsQuery.data?.items ?? [])
    .filter((report) => ['REPORTED', 'UNDER_REVIEW', 'APPROVED', 'IN_REPAIR', 'REJECTED'].includes(String(report.status))), [reportsQuery.data?.items]);
  const pendingReportPagination = useClientPagination(
    pendingReports,
    [activeFilter, pendingReports.length],
    PAGE_SIZE,
  );

  const workItems = useMemo(() => buildWorkItems(routines?.items ?? [], tickets), [routines, tickets]);
  const activeItem = workItems.find((item) => item.status === 'IN_PROGRESS') ?? null;
  const activeWorkItems = useMemo(() => workItems.filter((item) => item.status !== 'DONE'), [workItems]);
  const doneWorkItems = useMemo(() => workItems.filter((item) => item.status === 'DONE'), [workItems]);
  const filteredItems = useMemo(() => {
    if (activeFilter === 'DONE') return doneWorkItems;
    const base = activeFilter === 'ALL' ? activeWorkItems : activeWorkItems.filter((item) => item.type === activeFilter);
    return base;
  }, [activeFilter, activeWorkItems, doneWorkItems]);
  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visibleWorkItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetModal = () => {
    setModal(null);
    setNote('');
    setPhoto(null);
    setPhotoPreview('');
    setError('');
    setSuccessMessage('');
  };

  const invalidate = async () => {
    await onUpdated?.();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tickets'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-workspace-nav'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-performance-me-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-performance-me-evidence'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-field-reports', 'assigned-to-me'] }),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!modal) return null;
      const item = modal.item;
      const routinePayload = item.routine ? { assignmentId: item.routine.assignmentId ?? undefined, roomId: item.routine.roomId ?? undefined, dueDate: item.routine.dueDate, note: note.trim() || undefined, photoUrl: photo?.fileUrl } : undefined;

      if (modal.action === 'START') {
        if (item.source === 'ROUTINE' && item.routine) return startStaffRoutine(item.routine.templateId, routinePayload ?? {});
        if (item.source === 'TICKET') return postAction(`/tickets/${item.id}/start`);
      }

      if (modal.action === 'COMPLETE') {
        if (item.source === 'ROUTINE' && item.routine) return completeStaffRoutine(item.routine.templateId, routinePayload ?? {});
        if (item.source === 'TICKET') return postAction(`/tickets/${item.id}/mark-done`, { resolutionNote: note.trim() || 'Sudah dikerjakan', resolutionImageUrl: photo?.fileUrl, resolutionImageFileKey: photo?.fileKey, resolutionImageOriginalFilename: photo?.originalFilename, resolutionImageMimeType: photo?.mimeType, resolutionImageFileSizeBytes: photo?.fileSizeBytes });
      }

      if (modal.action === 'NEED_HELP' && item.source === 'ROUTINE' && item.routine) {
        return sendStaffRoutineNeedHelp(item.routine.templateId, routinePayload ?? {});
      }

      return null;
    },
    onSuccess: async () => {
      const message = modal?.action === 'START'
        ? 'Pekerjaan dimulai. Selesaikan pekerjaan ini dulu sebelum mulai yang lain.'
        : modal?.action === 'NEED_HELP'
          ? 'Kendala berhasil dikirim.'
          : 'Pekerjaan ditandai selesai.';
      await invalidate();
      resetModal();
      setSuccessMessage(message);
    },
    onError: (err: any) => setError(err?.response?.data?.message || err?.message || 'Aksi belum berhasil. Coba sekali lagi.'),
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

  const openModal = (action: NonNullable<ModalState>['action'], item: WorkItem) => {
    setModal({ action, item } as ModalState);
    setNote(action === 'COMPLETE' ? 'Sudah dikerjakan' : '');
    setPhoto(null);
    setPhotoPreview('');
    setError('');
    setSuccessMessage('');
  };

  const blockedByActive = (item: WorkItem) => activeItem && activeItem.uid !== item.uid;

  return (
    <section id="staff-work-queue" className="staff-unified-work">
      {/* Angka/ringkasan ada di "Ringkasan hari ini" (chart) di atas. Bagian ini MURNI
         daftar tugas yang bisa dikerjakan — heading tipis tanpa angka agar tidak mirip. */}
      <div className="staff-work-queue-intro">
        <span className="staff-hero-pill">Daftar Kerja</span>
        <h2>Tugas yang perlu dikerjakan</h2>
        <p>Mulai, selesaikan, atau kirim kendala. Pakai filter di bawah untuk fokus.</p>
      </div>

      {activeItem ? (
        <div className="staff-active-work-banner">
          <div>
            <span>Sedang dikerjakan sekarang</span>
            <strong>{activeItem.title}</strong>
            <small>{activeItem.typeLabel} · {activeItem.location}</small>
          </div>
          <div className="staff-active-work-actions">
            <Button size="sm" variant="success" onClick={() => openModal('COMPLETE', activeItem)}>Tandai selesai</Button>
            {activeItem.source === 'ROUTINE' ? <Button size="sm" variant="outline-danger" onClick={() => openModal('NEED_HELP', activeItem)}>Butuh bantuan</Button> : null}
          </div>
        </div>
      ) : null}


      {pendingReports.length ? (
        <Card className="staff-work-panel border-0 mb-3">
          <Card.Body>
            <div className="table-meta align-items-start mb-2">
              <div>
                <div className="small fw-semibold">Laporan menunggu tindak lanjut</div>
                <div className="small text-muted">Laporan kondisi yang sudah kamu kirim. Pantau statusnya sambil lanjut pekerjaan lain.</div>
              </div>
              <span className="table-meta-count">{pendingReports.length} laporan</span>
            </div>
            <div className="row g-2">
              {pendingReportPagination.pagedItems.map((report) => (
                <div className="col-md-6" key={report.id}>
                  <div className="staff-admin-report-card h-100">
                    <strong>{fieldReportTitle(report)}</strong>
                    <span>{fieldReportLocation(report)} · {fieldReportStatusLabel(report.status)}</span>
                    <small>{report.adminNotes || report.conditionNotes || 'Menunggu tindak lanjut.'}</small>
                  </div>
                </div>
              ))}
            </div>
            {pendingReportPagination.hasPagination ? (
              <div className="staff-work-pagination mt-3">
                <PaginationControls
                  currentPage={pendingReportPagination.page}
                  totalPages={pendingReportPagination.totalPages}
                  totalItems={pendingReportPagination.totalItems}
                  pageSize={pendingReportPagination.pageSize}
                  onPageChange={pendingReportPagination.setPage}
                  isLoading={reportsQuery.isFetching}
                />
              </div>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      <SegmentedTabs
        ariaLabel="Filter pekerjaan hari ini"
        value={activeFilter}
        onChange={setActiveFilter}
        items={filters.map((filter) => {
          const count = filter.key === 'ALL'
            ? activeWorkItems.length
            : filter.key === 'DONE'
              ? doneWorkItems.length
              : activeWorkItems.filter((item) => item.type === filter.key).length;
          return { key: filter.key, label: filter.label, icon: WORK_FILTER_ICONS[filter.key], count, disabled: count === 0 };
        })}
      />

      {successMessage ? <Alert variant="success" className="staff-alert">{successMessage}</Alert> : null}
      {actionMutation.isError && error ? <Alert variant="danger" className="staff-alert">{error}</Alert> : null}
      {isLoading ? <div className="staff-empty-box">Memuat pekerjaan hari ini...</div> : null}
      {!isLoading && !filteredItems.length ? (
        <div className="staff-empty-box"><strong>{activeFilter === 'DONE' ? 'Belum ada pekerjaan selesai.' : 'Tidak ada pekerjaan di filter ini.'}</strong><span>{activeFilter === 'DONE' ? 'Pekerjaan yang selesai hari ini akan muncul di sini.' : 'Pekerjaan rutin dan perbaikan aktif akan muncul di sini.'}</span></div>
      ) : null}

      <div className="staff-work-list unified tenant-like-dossier">
        {visibleWorkItems.map((item, index) => {
          const disabled = Boolean(blockedByActive(item) || actionMutation.isPending);
          return (
            <article key={item.uid} className={`staff-work-card staff-status-${item.status.toLowerCase()} ${item.source.toLowerCase()}`}>
              <div className="staff-work-rank">{(page - 1) * PAGE_SIZE + index + 1}</div>
              <div className="staff-work-main">
                <div className="staff-work-topline">
                  <span className={`staff-status-pill status-${item.status.toLowerCase().replace(/_/g, '-')}`}>{item.statusLabel}</span>
                  <span className="staff-category-pill">{item.typeLabel}</span>
                  <span className="staff-category-pill soft">{item.source === 'ROUTINE' ? 'Rutin' : item.ticket?.category === 'CHECKOUT_INSPECTION' ? 'Siapkan kamar' : 'Perbaikan'}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.location}</p>
                {item.description ? <small>{item.description}</small> : null}
                {blockedByActive(item) ? <small className="staff-lock-note">Selesaikan pekerjaan aktif dulu sebelum mulai ini.</small> : null}
              </div>
              <div className="staff-work-action">
                {item.status === 'TODO' ? <Button size="sm" className="staff-action-button" disabled={disabled} onClick={() => openModal('START', item)}>Mulai</Button> : null}
                {item.status === 'IN_PROGRESS' ? <Button size="sm" variant="success" className="staff-action-button" disabled={actionMutation.isPending} onClick={() => openModal('COMPLETE', item)}>Tandai selesai</Button> : null}
                {item.status === 'WAITING_CHECK' ? <span className="staff-done-note">Tinggal menunggu cek</span> : null}
                {item.status === 'NEED_HELP' ? <span className="staff-done-note danger">Kendala terkirim</span> : null}
              </div>
            </article>
          );
        })}
      </div>
        {filteredItems.length > PAGE_SIZE ? (
          <div className="staff-work-pagination">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              isLoading={Boolean(isLoading) || actionMutation.isPending}
            />
          </div>
        ) : null}

      <Modal show={Boolean(modal)} onHide={resetModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal?.action === 'START' ? 'Mulai pekerjaan?' : modal?.action === 'NEED_HELP' ? 'Kirim kendala?' : 'Tandai selesai?'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger" className="py-2">{error}</Alert> : null}
          {modal?.item ? (
            <Alert variant="light" className="border py-2">
              <strong>{modal.item.title}</strong><br />
              <small>{modal.item.typeLabel} · {modal.item.location}</small>
            </Alert>
          ) : null}
          {modal?.action === 'START' ? <p className="mb-0">Setelah dimulai, selesaikan pekerjaan ini dulu sebelum mulai pekerjaan lain.</p> : null}
          {modal?.action !== 'START' ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>{modal?.action === 'NEED_HELP' ? 'Apa kendalanya?' : 'Catatan hasil kerja'}</Form.Label>
                <Form.Control as="textarea" rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder={modal?.action === 'NEED_HELP' ? 'Contoh: butuh alat, barang rusak berat, atau tidak bisa masuk kamar' : 'Contoh: sudah bersih / sudah diganti / sudah dicek'} />
              </Form.Group>
              <Form.Group>
                <Form.Label>Foto bukti</Form.Label>
                <CameraOrGalleryInput onChange={handlePhoto} />
                {photoPreview ? <SafeImage className="staff-proof-preview" src={photoPreview} alt="Foto bukti" /> : null}
              </Form.Group>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={resetModal}>Batal</Button>
          <Button variant={modal?.action === 'COMPLETE' ? 'success' : modal?.action === 'NEED_HELP' ? 'danger' : 'primary'} onClick={() => actionMutation.mutate()} disabled={actionMutation.isPending}>
            {actionMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : modal?.action === 'START' ? 'Ya, mulai' : modal?.action === 'NEED_HELP' ? 'Kirim kendala' : 'Ya, sudah selesai'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
