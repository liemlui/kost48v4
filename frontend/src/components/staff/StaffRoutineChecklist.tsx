import { type CSSProperties, useMemo, useState } from 'react';
import {
  type StaffRoutineFrequency,
  type StaffRoutineItem,
  type StaffRoutineStatus,
  type StaffRoutineTodayResponse,
} from '../../api/staffRoutines';

type Props = {
  today?: StaffRoutineTodayResponse | null;
  isLoading?: boolean;
  /** Callback saat user klik "Buka di daftar kerja" — scroll ke WorkQueue. */
  onJumpToWorkQueue?: () => void;
};

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
  if (todo.length) return { tone: 'amber', title: 'Checklist belum selesai', body: `Masih ada ${todo.length} tugas rutin. Buka daftar kerja untuk memulai.` };
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

export default function StaffRoutineChecklist({ today, isLoading, onJumpToWorkQueue }: Props) {
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

  return (
    <section className="routine-board-card">
      <div className="routine-board-header">
        <div>
          <span className="routine-board-eyebrow">Checklist Operasional</span>
          <h2>Harian, mingguan, dan bulanan</h2>
          <p>{isLoading ? 'Memuat checklist...' : `${completed} dari ${total} tugas selesai. Pantau progres di sini, kerjakan lewat Daftar Kerja di atas.`}</p>
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
              const needHelp = item.status === 'NEED_HELP';
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
                    <span>
                      {done && item.completedAt
                        ? `Selesai ${new Date(item.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                        : `Status: ${statusLabel(item.status)} — kerjakan lewat Daftar Kerja`}
                    </span>
                  </div>
                  {needHelp ? <div className="routine-task-note">Kendala sudah dikirim. Lanjutkan pekerjaan lain yang aman sambil menunggu arahan.</div> : null}
                  {done && item.note ? <div className="routine-task-note success">Catatan: {item.note}</div> : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {onJumpToWorkQueue ? (
        <div className="routine-board-cta">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={onJumpToWorkQueue}>
            Buka Daftar Kerja untuk memulai
          </button>
        </div>
      ) : null}
    </section>
  );
}
