import { Button, Card, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import StaffActionLauncher from './StaffActionLauncher';
import StaffRoutineChecklist from './StaffRoutineChecklist';
import { makeStaffWorkStats, formatStaffDate, getStaffMotivation } from '../../utils/staffWorkStats';
import type { ActionQueueItem } from '../command-center';
import type { AuthUser, Ticket } from '../../types';
import type { StaffRoutineKpiResponse, StaffRoutineTodayResponse } from '../../api/staffRoutines';

type Props = {
  user: AuthUser | null;
  tickets: Ticket[];
  queueItems: ActionQueueItem[];
  onRefresh: () => void | Promise<void>;
  routineToday?: StaffRoutineTodayResponse | null;
  routineKpi?: StaffRoutineKpiResponse | null;
  routinesLoading?: boolean;
  onRoutineUpdated?: () => void | Promise<void>;
};

function safeUserCreatedAt(user: AuthUser | null): string | null {
  const raw = (user as any)?.createdAt;
  return typeof raw === 'string' ? raw : null;
}

function staffFirstName(user: AuthUser | null) {
  return user?.fullName?.trim()?.split(/\s+/)[0] || 'Staf';
}

function priorityLabel(priority: ActionQueueItem['priority']) {
  if (priority === 'BLOCKER' || priority === 'HIGH') return 'Kerjakan dulu';
  if (priority === 'WARNING') return 'Perlu dicek';
  if (priority === 'MEDIUM') return 'Hari ini';
  return 'Tugas';
}

function DonutProgress({ percent }: { percent: number }) {
  const style = { '--staff-progress': `${percent}%` } as React.CSSProperties;
  return (
    <div className="staff-donut-wrap">
      <div className="staff-donut" style={style}>
        <span>{percent}%</span>
      </div>
      <div>
        <strong>Tugas hari ini</strong>
        <small>Selesai dibanding tugas aktif yang tercatat.</small>
      </div>
    </div>
  );
}

function StaffWeekBar({ points }: { points: ReturnType<typeof makeStaffWorkStats>['weekPoints'] }) {
  const max = Math.max(1, ...points.map((point) => point.done));
  return (
    <div className="staff-week-bars">
      {points.map((point) => (
        <div className="staff-week-bar" key={point.key}>
          <div className="staff-week-track"><span style={{ height: `${Math.max(8, (point.done / max) * 100)}%` }} /></div>
          <strong>{point.done}</strong>
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

export default function StaffMotivationDashboard({ user, tickets, queueItems, onRefresh, routineToday, routineKpi, routinesLoading, onRoutineUpdated }: Props) {
  const navigate = useNavigate();
  const stats = makeStaffWorkStats(tickets, queueItems, safeUserCreatedAt(user));
  const motivation = getStaffMotivation(stats);
  const topItems = queueItems.slice(0, 3);

  return (
    <div className="staff-motivation-dashboard">
      <Card className="staff-motivation-hero border-0">
        <Card.Body>
          <div className="staff-hero-copy">
            <span className="staff-hero-pill">Beranda Kerja</span>
            <h1>Selamat bekerja, {staffFirstName(user)}.</h1>
            <p>{motivation}</p>
            <div className="staff-tenure-row">
              {stats.firstActivityDate ? (
                <>
                  <span>{stats.firstActivityLabel}: <strong>{formatStaffDate(stats.firstActivityDate)}</strong></span>
                  <span>Sudah tercatat <strong>{stats.daysRecorded} hari</strong></span>
                </>
              ) : (
                <span>Data tanggal kerja belum tersedia. Hasil kerja akan tercatat mulai dari tugas yang dikerjakan.</span>
              )}
            </div>
          </div>
          <div className="staff-hero-actions">
            <Button size="sm" variant="outline-secondary" onClick={() => void onRefresh()}>Muat ulang</Button>
            <Button size="sm" variant="primary" onClick={() => navigate('/tickets')}>Lihat Tugas</Button>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-3 staff-kpi-row">
        <Col sm={6} lg={3}><div className="staff-mini-kpi"><span>Checklist selesai</span><strong>{routineToday?.summary.completed ?? 0}/{routineToday?.summary.total ?? 0}</strong></div></Col>
        <Col sm={6} lg={3}><div className="staff-mini-kpi"><span>Selesai tiket</span><strong>{stats.doneTodayCount}</strong></div></Col>
        <Col sm={6} lg={3}><div className="staff-mini-kpi"><span>Perlu dicek</span><strong>{stats.waitingCheckCount + (routineToday?.summary.needHelp ?? 0)}</strong></div></Col>
        <Col sm={6} lg={3}><div className="staff-mini-kpi"><span>Cek kamar/meter</span><strong>{(routineKpi?.roomAuditCount ?? 0) + (routineKpi?.meterCount ?? 0)}</strong></div></Col>
      </Row>

      <StaffRoutineChecklist today={routineToday} isLoading={routinesLoading} onUpdated={onRoutineUpdated ?? onRefresh} />

      <Row className="g-3">
        <Col lg={5}>
          <Card className="staff-chart-card border-0 h-100">
            <Card.Body>
              <div className="staff-section-head"><strong>Progress Hari Ini</strong><small>Selesaikan satu per satu.</small></div>
              <DonutProgress percent={stats.completionPercent} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="staff-chart-card border-0 h-100">
            <Card.Body>
              <div className="staff-section-head"><strong>Kerja Kamu 7 Hari Terakhir</strong><small>{stats.weekDoneTotal + (routineKpi?.completedRoutineCount ?? 0)} pekerjaan dan checklist selesai minggu ini.</small></div>
              <StaffWeekBar points={stats.weekPoints} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="staff-appreciation-card border-0">
        <Card.Body>
          <span>🌟</span>
          <div>
            <strong>Terima kasih.</strong>
            <p>{routineKpi?.message || 'Kerja rapi membuat kamar cepat siap dan penghuni lebih nyaman. Kalau ada kendala, laporkan saja supaya admin bisa bantu.'}</p>
          </div>
        </Card.Body>
      </Card>

      <StaffActionLauncher compact onCreated={onRefresh} />

      <Card className="staff-focus-card border-0">
        <Card.Body>
          <div className="staff-section-head with-action">
            <div><strong>Fokus Hari Ini</strong><small>Maksimal 3 tugas penting. Daftar lengkap ada di halaman tiket.</small></div>
            <Button size="sm" variant="outline-primary" onClick={() => navigate('/tickets')}>Buka Semua Tugas</Button>
          </div>
          {!topItems.length ? (
            <div className="staff-empty-box"><strong>Tidak ada tugas sekarang.</strong><span>Kalau ada laporan baru, tugas akan muncul di halaman tiket.</span></div>
          ) : (
            <div className="staff-focus-list">
              {topItems.map((item, index) => (
                <article key={item.id} className="staff-focus-item">
                  <span className="staff-focus-rank">{index + 1}</span>
                  <div>
                    <div className="staff-work-topline"><span className="staff-status-pill">{priorityLabel(item.priority)}</span><span className="staff-category-pill">{item.type}</span></div>
                    <strong>{item.subject}</strong>
                    <small>{item.issue}</small>
                  </div>
                  <Button size="sm" className="staff-action-button" onClick={() => navigate(item.actionTo || '/tickets')}>{item.recommendedAction || 'Lihat'}</Button>
                </article>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
