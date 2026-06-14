import { ChangeEvent, type CSSProperties, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import {
  completeStaffRoutine,
  sendStaffRoutineNeedHelp,
  startStaffRoutine,
  type StaffRoutineFrequency,
  type StaffRoutineItem,
  type StaffRoutineStatus,
  type StaffRoutineTodayResponse,
} from '../../api/staffRoutines';
import { uploadTicketImage, type UploadedImageMeta } from '../../api/mediaUploads';
import CameraOrGalleryInput from '../common/CameraOrGalleryInput';
import SafeImage from '../common/SafeImage';
import { compressImageFile as compressBrowserImage } from '../../utils/compressImageFile';

type Props = {
  today?: StaffRoutineTodayResponse | null;
  isLoading?: boolean;
  onUpdated?: () => void | Promise<void>;
};

type RoutineAction = 'START' | 'DONE' | 'NEED_HELP';

type ModalState = {
  item: StaffRoutineItem;
  action: RoutineAction;
} | null;

type FrequencySummary = {
  frequency: StaffRoutineFrequency;
  items: StaffRoutineItem[];
  done: number;
  inProgress: number;
  needHelp: number;
  missed: number;
  total: number;
  percent: number;
};

const groupOrder: StaffRoutineFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

function areaLabel(area: string) {
  switch (area) {
    case 'BATHROOM': return 'Kamar mandi';
    case 'ROOM': return 'Kamar';
    case 'INVENTORY': return 'Gudang';
    case 'METER': return 'Meter';
    case 'SECURITY': return 'Keamanan';
    case 'CLEANING': return 'Kebersihan';
    default: return 'Area umum';
  }
}

function frequencyLabel(frequency: StaffRoutineFrequency) {
  if (frequency === 'DAILY') return 'Harian';
  if (frequency === 'WEEKLY') return 'Mingguan';
  return 'Bulanan';
}

function frequencySubtitle(frequency: StaffRoutineFrequency) {
  if (frequency === 'DAILY') return 'Rutinitas operasional yang menjaga kos tetap rapi hari ini.';
  if (frequency === 'WEEKLY') return 'Pengecekan berkala agar masalah tidak menumpuk.';
  return 'Audit besar bulanan untuk kondisi kamar, fasilitas, dan gudang.';
}

function statusLabel(status: StaffRoutineStatus) {
  switch (status) {
    case 'IN_PROGRESS': return 'Sedang dikerjakan';
    case 'DONE': return 'Selesai';
    case 'NEED_HELP': return 'Butuh bantuan';
    case 'MISSED': return 'Terlewat';
    case 'SKIPPED': return 'Dilewati';
    default: return 'Belum mulai';
  }
}

function statusTone(status: StaffRoutineStatus) {
  switch (status) {
    case 'IN_PROGRESS': return 'blue';
    case 'DONE': return 'green';
    case 'NEED_HELP': return 'red';
    case 'MISSED': return 'amber';
    case 'SKIPPED': return 'slate';
    default: return 'soft';
  }
}

function makeFrequencySummary(frequency: StaffRoutineFrequency, items: StaffRoutineItem[]): FrequencySummary {
  const done = items.filter((item) => item.status === 'DONE').length;
  const inProgress = items.filter((item) => item.status === 'IN_PROGRESS').length;
  const needHelp = items.filter((item) => item.status === 'NEED_HELP').length;
  const missed = items.filter((item) => item.status === 'MISSED').length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { frequency, items, done, inProgress, needHelp, missed, total, percent };
}

function pickAssistantMessage(summaries: FrequencySummary[]) {
  const allItems = summaries.flatMap((summary) => summary.items);
  const active = allItems.find((item) => item.status === 'IN_PROGRESS');
  const needHelp = allItems.filter((item) => item.status === 'NEED_HELP');
  const todo = allItems.filter((item) => item.status === 'TODO' || item.status === 'MISSED');
  const monthly = summaries.find((summary) => summary.frequency === 'MONTHLY');
  const weekly = summaries.find((summary) => summary.frequency === 'WEEKLY');

  if (active) return { tone: 'blue', title: 'Selesaikan pekerjaan aktif dulu', body: `${active.title} sedang berjalan. Setelah selesai, baru mulai checklist berikutnya.` };
  if (needHelp.length) return { tone: 'red', title: 'Ada checklist yang butuh bantuan', body: `${needHelp.length} kendala sudah tercatat. Lanjutkan pekerjaan lain yang aman sambil menunggu arahan admin.` };
  if (todo.length) return { tone: 'amber', title: 'Checklist belum selesai', body: `Masih ada ${todo.length} tugas rutin. Mulai dari pekerjaan yang paling cepat diselesaikan.` };
  if (monthly?.total && monthly.percent < 100) return { tone: 'blue', title: 'Audit bulanan masih berjalan', body: 'Selesaikan bertahap setelah rutinitas harian aman.' };
  if (weekly?.total && weekly.percent < 100) return { tone: 'blue', title: 'Checklist mingguan belum penuh', body: 'Gunakan waktu kosong untuk menyelesaikan pengecekan mingguan.' };
  return { tone: 'green', title: 'Checklist aman', body: 'Checklist yang tampil sudah selesai. Pertahankan ritme kerja rapi hari ini.' };
}

function locationLabel(item: StaffRoutineItem) {
  if (item.room?.code) return `Kamar ${item.room.code}${item.room.name ? ` · ${item.room.name}` : ''}`;
  return areaLabel(item.areaType);
}

function evidenceLabel(item: StaffRoutineItem) {
  const required: string[] = [];
  if (item.requiresPhoto) required.push('foto');
  if (item.requiresNote) required.push('catatan');
  return required.length ? `Wajib ${required.join(' + ')}` : 'Bukti opsional';
}

function nextActionLabel(item: StaffRoutineItem) {
  if (item.status === 'DONE') return 'Lihat hasil';
  if (item.status === 'IN_PROGRESS') return 'Tandai selesai';
  if (item.status === 'NEED_HELP') return 'Kendala terkirim';
  if (item.status === 'MISSED') return 'Kerjakan susulan';
  return 'Mulai pekerjaan';
}

async function compressImageFile(file: File): Promise<File> {
  return compressBrowserImage(file, { maxSide: 1400, quality: 0.78 });
}

function FrequencyCard({ summary, active, onClick }: { summary: FrequencySummary; active: boolean; onClick: () => void }) {
  const progressStyle = { '--routine-progress': `${summary.percent}%` } as CSSProperties;
  return (
    <button type="button" className={`routine-board-summary-card${active ? ' active' : ''}`} onClick={onClick}>
      <div className="routine-board-summary-head">
        <span>{frequencyLabel(summary.frequency)}</span>
        <strong>{summary.done}/{summary.total}</strong>
      </div>
      <div className="routine-board-progress" style={progressStyle}><span /></div>
      <div className="routine-board-summary-meta">
        <span>{summary.percent}% selesai</span>
        {summary.inProgress ? <em>{summary.inProgress} aktif</em> : null}
        {summary.needHelp ? <em className="danger">{summary.needHelp} kendala</em> : null}
      </div>
    </button>
  );
}

export default function StaffRoutineChecklist({ today, isLoading, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [activeFrequency, setActiveFrequency] = useState<StaffRoutineFrequency>('DAILY');

  const items = today?.items ?? [];
  const summaries = useMemo(
    () => groupOrder.map((frequency) => makeFrequencySummary(frequency, items.filter((item) => item.frequency === frequency))),
    [items],
  );
  const visibleSummaries = summaries.filter((summary) => summary.total > 0);
  const activeSummary = visibleSummaries.find((summary) => summary.frequency === activeFrequency) ?? visibleSummaries[0] ?? makeFrequencySummary('DAILY', []);
  const assistant = pickAssistantMessage(visibleSummaries);
  const total = today?.summary.total ?? items.length;
  const completed = today?.summary.completed ?? items.filter((item) => item.status === 'DONE').length;
  const remaining = today?.summary.remaining ?? Math.max(total - completed, 0);
  const totalPercent = today?.summary.completionPercent ?? (total ? Math.round((completed / total) * 100) : 0);
  const activeItem = items.find((item) => item.status === 'IN_PROGRESS');
  const needHelpCount = today?.summary.needHelp ?? items.filter((item) => item.status === 'NEED_HELP').length;

  const resetModal = () => {
    setModalState(null);
    setNote('');
    setPhoto(null);
    setPhotoPreview('');
    setError('');
  };

  const openModal = (item: StaffRoutineItem, action: RoutineAction) => {
    setModalState({ item, action });
    setNote(action === 'DONE' ? 'Sudah dikerjakan' : '');
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
      if (modalState.action === 'START') return startStaffRoutine(item.templateId, payload);
      if (modalState.action === 'DONE') return completeStaffRoutine(item.templateId, payload);
      return sendStaffRoutineNeedHelp(item.templateId, payload);
    },
    onSuccess: async () => {
      await onUpdated?.();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-staff', 'routines-today'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-workspace-nav', 'routines'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-evidence'] }),
      ]);
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

  return (
    <section className="routine-board-card">
      <div className="routine-board-header">
        <div>
          <span className="routine-board-eyebrow">Checklist Operasional</span>
          <h2>Harian, mingguan, dan bulanan</h2>
          <p>{isLoading ? 'Memuat checklist...' : `${completed} dari ${total} tugas selesai. Checklist ini adalah work board utama staff.`}</p>
        </div>
        <div className="routine-board-total">
          <strong>{totalPercent}%</strong>
          <span>Selesai</span>
        </div>
      </div>

      <div className={`routine-board-assistant tone-${assistant.tone}`}>
        <div>
          <strong>{assistant.title}</strong>
          <span>{assistant.body}</span>
        </div>
        <small>{activeItem ? '1 aktif' : `${remaining} belum selesai`} · {needHelpCount} kendala</small>
      </div>

      {!isLoading && !items.length ? (
        <div className="staff-empty-box routine-board-empty"><strong>Belum ada checklist.</strong><span>Checklist harian, mingguan, dan bulanan akan muncul di sini setelah admin membuat template rutinitas.</span></div>
      ) : null}

      {visibleSummaries.length ? (
        <div className="routine-board-summary-grid">
          {visibleSummaries.map((summary) => (
            <FrequencyCard key={summary.frequency} summary={summary} active={activeSummary.frequency === summary.frequency} onClick={() => setActiveFrequency(summary.frequency)} />
          ))}
        </div>
      ) : null}

      {activeSummary.total ? (
        <div className="routine-board-panel">
          <div className="routine-board-panel-head">
            <div>
              <strong>{frequencyLabel(activeSummary.frequency)}</strong>
              <span>{frequencySubtitle(activeSummary.frequency)}</span>
            </div>
            <small>{activeSummary.done}/{activeSummary.total} selesai</small>
          </div>

          <div className="routine-board-list">
            {activeSummary.items.map((item) => {
              const done = item.status === 'DONE';
              const active = item.status === 'IN_PROGRESS';
              const needHelp = item.status === 'NEED_HELP';
              const canStart = item.status === 'TODO' || item.status === 'MISSED' || item.status === 'SKIPPED';
              return (
                <article key={item.occurrenceKey} className={`routine-task-card tone-${statusTone(item.status)}`}>
                  <div className="routine-task-status-line">
                    <span className={`routine-status-chip tone-${statusTone(item.status)}`}>{statusLabel(item.status)}</span>
                    <small>{item.dueLabel || frequencyLabel(item.frequency)}</small>
                  </div>
                  <div className="routine-task-body">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description || 'Ikuti checklist sesuai kondisi lapangan.'}</p>
                    </div>
                    <div className="routine-task-meta">
                      <span>{locationLabel(item)}</span>
                      <span>{evidenceLabel(item)}</span>
                    </div>
                  </div>
                  <div className="routine-task-footer">
                    <span>{done && item.completedAt ? `Selesai ${new Date(item.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : nextActionLabel(item)}</span>
                    <div>
                      {canStart ? <Button size="sm" className="staff-action-button" onClick={() => openModal(item, 'START')} disabled={saveMutation.isPending}>Mulai</Button> : null}
                      {active ? <Button size="sm" variant="success" onClick={() => openModal(item, 'DONE')} disabled={saveMutation.isPending}>Tandai selesai</Button> : null}
                      {active && !needHelp ? <Button size="sm" variant="outline-danger" className="routine-help-button" onClick={() => openModal(item, 'NEED_HELP')} disabled={saveMutation.isPending}>Butuh bantuan</Button> : null}
                    </div>
                  </div>
                  {needHelp ? <div className="routine-task-note">Kendala sudah dikirim. Lanjutkan pekerjaan lain yang aman sambil menunggu arahan.</div> : null}
                  {done && item.note ? <div className="routine-task-note success">Catatan: {item.note}</div> : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <Modal show={Boolean(modalState)} onHide={resetModal} centered className="routine-action-modal">
        <Modal.Header closeButton>
          <Modal.Title>{modalState?.action === 'START' ? 'Mulai checklist' : modalState?.action === 'DONE' ? 'Tandai checklist selesai' : 'Kirim kendala'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? <Alert variant="danger" className="py-2">{error}</Alert> : null}
          {modalState?.item ? (
            <div className="routine-modal-target">
              <strong>{modalState.item.title}</strong>
              <span>{locationLabel(modalState.item)} · {evidenceLabel(modalState.item)}</span>
            </div>
          ) : null}
          {modalState?.action === 'START' ? <p className="routine-modal-guidance">Mulai satu pekerjaan dulu. Setelah aktif, selesaikan sebelum mengambil pekerjaan berikutnya.</p> : null}
          {modalState?.action !== 'START' ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>{modalState?.action === 'NEED_HELP' ? 'Apa kendalanya?' : `Catatan hasil kerja${modalState?.item.requiresNote ? ' wajib' : ''}`}</Form.Label>
                <Form.Control as="textarea" rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder={modalState?.action === 'NEED_HELP' ? 'Contoh: butuh alat, tidak bisa masuk kamar, atau perlu arahan admin' : 'Contoh: sudah dibersihkan / sudah dicek / sudah diganti'} />
              </Form.Group>
              <Form.Group>
                <Form.Label>Foto bukti{modalState?.item.requiresPhoto && modalState.action === 'DONE' ? ' wajib' : ''}</Form.Label>
                <CameraOrGalleryInput onChange={handlePhoto} />
                {photoPreview ? <SafeImage className="staff-proof-preview" src={photoPreview} alt="Foto bukti" /> : null}
              </Form.Group>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={resetModal}>Batal</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} variant={modalState?.action === 'NEED_HELP' ? 'danger' : modalState?.action === 'DONE' ? 'success' : 'primary'}>
            {saveMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : modalState?.action === 'START' ? 'Mulai sekarang' : modalState?.action === 'DONE' ? 'Simpan selesai' : 'Kirim kendala'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}
