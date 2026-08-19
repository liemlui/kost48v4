import { Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import type { AdminWorkLane } from '../../pages/dashboard/dashboardShared';

const toneButtonVariant = {
  success: 'outline-success',
  info: 'outline-primary',
  warning: 'warning',
  danger: 'danger',
} as const;

const toneStatusLabel = {
  success: 'Aman',
  info: 'Pantau',
  warning: 'Perlu tindakan',
  danger: 'Mendesak',
} as const;

/**
 * Daftar tugas harian admin M17: kartu berurutan 0–5.
 * Setiap kartu hanya muncul bila ada pekerjaan, urutan tetap, dan punya SATU tombol utama.
 */
export default function AdminWorkLaneCards({
  lanes,
  emptyTitle = 'Semua aman',
  emptyDescription = 'Tidak ada pekerjaan yang menunggu hari ini. Kerjakan operasional rutin atau cek halaman detail bila perlu.',
}: {
  lanes: AdminWorkLane[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const navigate = useNavigate();
  const workLanes = lanes.filter((lane) => lane.value > 0);
  const totalWork = workLanes.reduce((sum, lane) => sum + lane.value, 0);

  if (!totalWork) {
    return <EmptyState icon="✅" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <section className="admin-work-lane-list" aria-label="Daftar tugas hari ini">
      {workLanes.map((lane) => {
        const tone = lane.tone;
        return (
          <Card key={lane.id} className={`admin-work-lane-card lane-${tone}`}>
            <Card.Body className="admin-work-lane-body">
              <div className="admin-work-lane-step" aria-hidden="true">{lane.step}</div>
              <div className="admin-work-lane-main">
                <div className="admin-work-lane-heading">
                  <h2>{lane.title}</h2>
                  <span className={`admin-work-lane-tone tone-${tone}`}>{toneStatusLabel[tone]}</span>
                </div>
                <p>{lane.helper}</p>
                <div className="admin-work-lane-meta">
                  {lane.sla ? <span className="admin-lane-sla">SLA {lane.sla}</span> : null}
                  {lane.nextDeadline ? <span className="admin-lane-deadline">⏰ {lane.nextDeadline}</span> : null}
                </div>
              </div>
              <div className="admin-work-lane-count" aria-label={`${lane.value} pekerjaan`}>
                <strong>{lane.value}</strong>
                <span>menunggu</span>
              </div>
              <Button
                variant={toneButtonVariant[tone]}
                className="admin-work-lane-action"
                onClick={() => navigate(lane.to)}
              >
                {lane.action}
              </Button>
            </Card.Body>
          </Card>
        );
      })}
    </section>
  );
}
