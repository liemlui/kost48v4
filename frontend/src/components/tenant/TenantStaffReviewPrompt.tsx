import { useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEligibleStaffReviews, submitTenantStaffReview, type EligibleStaffReviewItem } from '../../api/tenantStaffReviews';

function roomText(item: EligibleStaffReviewItem) {
  if (item.room?.code) return `Kamar ${item.room.code}`;
  if (item.room?.name) return item.room.name;
  return 'Area kos';
}

export default function TenantStaffReviewPrompt() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<EligibleStaffReviewItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const query = useQuery({ queryKey: ['tenant-staff-review-eligible'], queryFn: fetchEligibleStaffReviews, staleTime: 60_000 });
  const items = query.data?.items ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Pekerjaan belum dipilih');
      return submitTenantStaffReview({ ticketId: selected.ticketId, rating, comment });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-staff-review-eligible'] });
      await queryClient.invalidateQueries({ queryKey: ['portal-tickets'] });
      setSelected(null);
      setRating(5);
      setComment('');
    },
  });

  if (query.isLoading) return null;
  if (!items.length) return null;

  return (
    <>
      <Card className="tenant-staff-review-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div>
              <div className="command-eyebrow">Review Pekerjaan Staff</div>
              <h5 className="mb-1">Bantu nilai hasil pekerjaan yang sudah selesai</h5>
              <p className="mb-0 app-caption">Rating kamu membantu admin menjaga kebersihan dan perbaikan kos tetap rapi.</p>
            </div>
            <Button size="sm" onClick={() => setSelected(items[0])}>Beri Rating</Button>
          </div>
          <div className="tenant-review-mini-list mt-3">
            {items.slice(0, 3).map((item) => (
              <button key={item.ticketId} type="button" onClick={() => setSelected(item)}>
                <strong>{item.title || item.ticketNumber || `Tiket #${item.ticketId}`}</strong>
                <span>{item.staff?.fullName || 'Staff'} · {roomText(item)}</span>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton><Modal.Title>Nilai Hasil Pekerjaan</Modal.Title></Modal.Header>
        <Modal.Body>
          {mutation.isError ? <Alert variant="danger">Review belum terkirim. Coba lagi.</Alert> : null}
          <Alert variant="light" className="border small">
            {selected ? <><strong>{selected.title || selected.ticketNumber}</strong><br />Staff: {selected.staff?.fullName || '-'} · {roomText(selected)}</> : null}
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label>Rating</Form.Label>
            <div className="tenant-star-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className={value <= rating ? 'active' : ''} onClick={() => setRating(value)}>★</button>
              ))}
            </div>
            <Form.Text>{rating <= 2 ? 'Kurang rapi' : rating === 3 ? 'Cukup' : rating === 4 ? 'Baik' : 'Sangat baik'}</Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label>Komentar opsional</Form.Label>
            <Form.Control as="textarea" rows={3} value={comment} onChange={(event) => setComment(event.currentTarget.value)} placeholder="Contoh: sudah bersih, tapi sudut kamar mandi masih perlu dicek." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setSelected(null)}>Batal</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? <><Spinner size="sm" className="me-2" />Mengirim...</> : 'Kirim Rating'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
