import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMySurveyStatus, submitSurvey } from '../../api/surveys';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

function Stars({ value, onChange, ariaLabel }: { value: number; onChange: (n: number) => void; ariaLabel: string }) {
  return (
    <div className="d-inline-flex gap-1" role="group" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} dari 5`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, color: n <= value ? '#f59e0b' : '#cbd5e1' }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const ASPECTS: Array<{ key: 'cleanliness' | 'staffService' | 'facility' | 'valueForMoney'; label: string }> = [
  { key: 'cleanliness', label: 'Kebersihan' },
  { key: 'staffService', label: 'Pelayanan staf' },
  { key: 'facility', label: 'Fasilitas' },
  { key: 'valueForMoney', label: 'Harga sepadan' },
];

export default function SatisfactionSurveyCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ['my-survey'], queryFn: getMySurveyStatus });
  const [overall, setOverall] = useState(0);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitSurvey({
      overallRating: overall,
      cleanliness: aspects.cleanliness, staffService: aspects.staffService,
      facility: aspects.facility, valueForMoney: aspects.valueForMoney,
      wouldRecommend: recommend ?? undefined, comment: comment.trim() || undefined,
    }),
    onSuccess: () => { setError(''); queryClient.invalidateQueries({ queryKey: ['my-survey'] }); },
    onError: (e) => setError(getApiErrorMessage(e, 'Gagal mengirim penilaian.')),
  });

  if (statusQuery.isLoading) return null;

  if (statusQuery.data?.submitted) {
    return (
      <Card className="border-0 mb-3" style={{ background: 'linear-gradient(135deg,#f0fdf4,#eff6ff)' }}>
        <Card.Body className="py-2 px-3">
          <span className="fw-semibold">⭐ Terima kasih sudah menilai kos!</span>
          <span className="text-muted small"> Masukanmu membantu kami jadi lebih baik.</span>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="fw-semibold mb-1">⭐ Beri penilaian kos kamu</div>
        <div className="text-muted small mb-2">Anonim untuk sesama penghuni; membantu kami memperbaiki layanan.</div>
        {error ? <div className="text-danger small mb-2">{error}</div> : null}

        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="small" style={{ minWidth: 130 }}>Penilaian keseluruhan</span>
          <Stars value={overall} onChange={setOverall} ariaLabel="Penilaian keseluruhan" />
        </div>
        {ASPECTS.map((a) => (
          <div key={a.key} className="d-flex align-items-center gap-2 mb-1">
            <span className="small text-muted" style={{ minWidth: 130 }}>{a.label}</span>
            <Stars value={aspects[a.key] ?? 0} onChange={(n) => setAspects((p) => ({ ...p, [a.key]: n }))} ariaLabel={a.label} />
          </div>
        ))}

        <div className="d-flex align-items-center gap-2 my-2">
          <span className="small" style={{ minWidth: 130 }}>Rekomendasikan ke teman?</span>
          <Button size="sm" variant={recommend === true ? 'success' : 'outline-secondary'} onClick={() => setRecommend(true)}>Ya 👍</Button>
          <Button size="sm" variant={recommend === false ? 'danger' : 'outline-secondary'} onClick={() => setRecommend(false)}>Belum</Button>
        </div>

        <Form.Control as="textarea" rows={2} className="mb-2" placeholder="Masukan / saran (opsional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1500} />
        <Button variant="primary" disabled={overall < 1 || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size="sm" /> : 'Kirim penilaian'}
        </Button>
      </Card.Body>
    </Card>
  );
}
