import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import type { StaffAuditSuggestionResponse, StaffPerformanceSummary } from '../../api/staffPerformance';

type Props = {
  data?: StaffAuditSuggestionResponse | null;
  isLoading?: boolean;
  isError?: boolean;
  staffItems: StaffPerformanceSummary[];
  onAudit: (staff: StaffPerformanceSummary) => void;
};

function priorityLabel(priority?: string) {
  if (priority === 'HIGH') return 'Prioritas tinggi';
  if (priority === 'MEDIUM') return 'Perlu dicek';
  return 'Audit ringan';
}

function priorityClass(priority?: string) {
  if (priority === 'HIGH') return 'high';
  if (priority === 'MEDIUM') return 'medium';
  return 'low';
}

export default function AdminSmartAuditPanel({ data, isLoading, isError, staffItems, onAudit }: Props) {
  const items = data?.items ?? [];
  const topItems = items.slice(0, 5);

  return (
    <Card className="content-card smart-audit-panel border-0 my-3">
      <Card.Body>
        <div className="smart-panel-header">
          <div>
            <span className="staff-hero-pill">AI Operasional</span>
            <h3>Asisten Audit Staff</h3>
            <p>Rule-based AI memilih pekerjaan yang paling layak dicek dari bukti foto, tugas lama, audit gagal, meter, dan review tenant.</p>
          </div>
          {data ? (
            <div className="smart-audit-scorebox">
              <strong>{data.summary.totalSuggestions}</strong>
              <small>rekomendasi</small>
            </div>
          ) : null}
        </div>

        {isLoading ? <div className="py-3"><Spinner animation="border" size="sm" /> <span className="ms-2">Membaca pola kerja staff...</span></div> : null}
        {isError ? <Alert variant="warning" className="mb-0">Asisten audit belum bisa dimuat. Data performance tetap bisa dipakai manual.</Alert> : null}

        {data ? (
          <>
            <div className="smart-brief-box">
              <strong>{data.brief.title}</strong>
              <span>{data.brief.summary}</span>
              <ul>
                {data.brief.recommendations.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="smart-audit-mini-stats">
              <span><strong>{data.summary.high}</strong> tinggi</span>
              <span><strong>{data.summary.medium}</strong> sedang</span>
              <span><strong>{data.summary.low}</strong> ringan</span>
              <span><strong>{data.summary.staffWithRisk}</strong> staff perlu dicek</span>
            </div>
            {!topItems.length ? (
              <div className="staff-empty-box mt-3"><strong>Tidak ada audit prioritas.</strong><span>Ambil audit random ringan saja untuk menjaga kualitas laporan.</span></div>
            ) : (
              <div className="smart-suggestion-list">
                {topItems.map((item) => {
                  const staff = staffItems.find((candidate) => candidate.staff.id === item.staff.id);
                  return (
                    <article key={item.id} className={`smart-suggestion-item priority-${priorityClass(item.priority)}`}>
                      <div className="smart-suggestion-main">
                        <span className="smart-priority-pill">{priorityLabel(item.priority)} · Risiko {item.riskScore}</span>
                        <strong>{item.title}</strong>
                        <p>{item.reason}</p>
                        <small>{item.staff.fullName} · {item.location || 'Area umum'} · {item.evidenceState || 'Perlu dicek'}</small>
                      </div>
                      <div className="smart-suggestion-action">
                        <span>{item.recommendedAction}</span>
                        <Button size="sm" variant="outline-primary" disabled={!staff} onClick={() => staff && onAudit(staff)}>Audit</Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </Card.Body>
    </Card>
  );
}
