import { Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, ListChecks } from 'lucide-react';
import DonutGauge from '../charts/DonutGauge';
import { TONE_COLOR, type FocusItem, type StaffBoardStats, type StaffLane } from '../../utils/staffBoardStats';

type Props = {
  board: StaffBoardStats;
  isLoading?: boolean;
};

export default function StaffOperationalTaskBoard({ board, isLoading: _isLoading }: Props) {
  const navigate = useNavigate();
  const { lanes, focusItems, progress } = board;

  const scrollToStaffSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openStaffTarget = (target: Pick<StaffLane | FocusItem, 'to' | 'targetId'>) => {
    if (target.targetId) {
      scrollToStaffSection(target.targetId);
      return;
    }
    if (target.to) navigate(target.to);
  };

  const priorityItems = focusItems.slice(0, 3);
  const assistantBody = focusItems.length
    ? `Mulai dari ${focusItems[0].title}. Catat hasil kerja dengan singkat agar tindak lanjut berikutnya jelas.`
    : 'Tidak ada tugas penting dari data yang dimuat. Tetap cek area umum, stok harian, dan laporan penghuni yang baru masuk.';

  return (
    <div className="staff-bento-row staff-board-bento">
      <Card className="staff-operational-board border-0">
        <Card.Body>
          <div className="staff-operational-head">
            <div>
              <span className="staff-hero-pill">Papan Kerja</span>
              <h2>Ringkasan hari ini</h2>
              <p>{assistantBody}</p>
            </div>
            <DonutGauge
              value={progress}
              center={<><strong>{progress}%</strong><small>selesai</small></>}
              ariaLabel={`Progress ${progress}% pekerjaan selesai hari ini`}
              size={92}
              innerRadius={32}
              outerRadius={44}
              color={TONE_COLOR.success}
              className="staff-board-progress-ring"
            />
          </div>

          {/* Komposisi tugas hari ini — chart ringkas modern (recharts). */}
          <div className="staff-board-chart">
            <ResponsiveContainer width="100%" height={52}>
              <BarChart
                layout="vertical"
                data={[lanes.reduce((row, lane) => ({ ...row, [lane.id]: lane.value }), { cat: 'today' } as Record<string, number | string>)]}
                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="cat" hide />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value, name) => [value as number, lanes.find((l) => l.id === name)?.label ?? String(name)]} />
                {lanes.map((lane, index) => (
                  <Bar
                    key={lane.id}
                    dataKey={lane.id}
                    stackId="today"
                    fill={TONE_COLOR[lane.tone]}
                    radius={index === 0 ? [8, 0, 0, 8] : index === lanes.length - 1 ? [0, 8, 8, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="staff-board-legend" aria-label="Komposisi tugas staff">
            {lanes.map((lane) => (
              <span key={lane.id} className={`staff-board-legend-chip tone-${lane.tone}`}>
                <span className="staff-board-legend-dot" style={{ background: TONE_COLOR[lane.tone] }} />
                <strong>{lane.value}</strong>
                <span className="staff-board-legend-label">{lane.label}</span>
              </span>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Card className="staff-priority-card border-0">
        <Card.Body>
          <div className="staff-priority-head">
            <span className="staff-hero-pill">
              <ListChecks size={13} aria-hidden /> Prioritas terdekat
            </span>
            <h3>{priorityItems.length ? 'Kerjakan ini dulu' : 'Operasional aman'}</h3>
          </div>
          {priorityItems.length ? (
            <ul className="staff-priority-list">
              {priorityItems.map((item) => (
                <li key={item.id} className={`staff-priority-item tone-${item.tone}`}>
                  <span className="staff-priority-dot" style={{ background: TONE_COLOR[item.tone] }} />
                  <div className="staff-priority-body">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="staff-priority-go"
                    aria-label={`${item.actionLabel ?? 'Buka'} — ${item.title}`}
                    onClick={() => openStaffTarget(item)}
                  >
                    <ArrowRight size={16} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="staff-priority-empty">Tidak ada tugas penting dari data saat ini. Tetap pantau area umum & laporan baru.</p>
          )}
          {priorityItems.length ? (
            <Button variant="outline-primary" size="sm" className="staff-priority-cta" onClick={() => scrollToStaffSection('staff-work-queue')}>
              Buka daftar kerja
            </Button>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
