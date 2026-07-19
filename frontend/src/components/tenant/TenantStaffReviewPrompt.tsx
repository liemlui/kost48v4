import { useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StarRating from '../common/StarRating';
import { fetchEligibleStaffReviews, submitTenantStaffReview, type EligibleStaffReviewItem } from '../../api/tenantStaffReviews';

const COMPLAINT_CATEGORIES = [
  { value: 'Kebersihan', label: 'Kebersihan', icon: '🧹', desc: 'Area/kamar masih kotor atau tidak rapi' },
  { value: 'Kualitas Kerja', label: 'Kualitas Kerja', icon: '🔧', desc: 'Pekerjaan tidak tuntas atau kurang memuaskan' },
  { value: 'Keterlambatan', label: 'Keterlambatan', icon: '⏰', desc: 'Pekerjaan terlambat atau tidak datang' },
  { value: 'Kerusakan', label: 'Kerusakan', icon: '⚠️', desc: 'Ada barang atau area yang rusak/bermasalah' },
  { value: 'Sikap Staff', label: 'Sikap Staff', icon: '🤝', desc: 'Sikap atau komunikasi staff kurang profesional' },
  { value: 'Lainnya', label: 'Lainnya', icon: '📝', desc: 'Masalah lain yang belum tercakup di atas' },
];

const PRAISE_CATEGORIES = [
  { value: 'Cepat & Tepat', label: 'Cepat & Tepat', icon: '⚡' },
  { value: 'Bersih & Rapi', label: 'Bersih & Rapi', icon: '✨' },
  { value: 'Ramah', label: 'Ramah', icon: '😊' },
  { value: 'Profesional', label: 'Profesional', icon: '👍' },
];

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Sangat tidak puas', color: '#ef4444' },
  2: { text: 'Kurang rapi / bermasalah', color: '#f97316' },
  3: { text: 'Cukup baik', color: '#f59e0b' },
  4: { text: 'Baik', color: '#16a34a' },
  5: { text: 'Sangat memuaskan!', color: '#2563eb' },
};

function roomText(item: EligibleStaffReviewItem) {
  if (item.room?.code) return `Kamar ${item.room.code}`;
  if (item.room?.name) return item.room.name;
  return 'Area kos';
}

export default function TenantStaffReviewPrompt() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<EligibleStaffReviewItem | null>(null);
  const [rating, setRating] = useState(5);
  const [complaintCategory, setComplaintCategory] = useState('');
  const [praiseTag, setPraiseTag] = useState('');
  const [comment, setComment] = useState('');

  const query = useQuery({ queryKey: ['tenant-staff-review-eligible'], queryFn: fetchEligibleStaffReviews, staleTime: 60_000 });
  const items = query.data?.items ?? [];

  const isComplaint = rating <= 2;
  const isPraise = rating >= 4;

  const canSubmit = !isComplaint || complaintCategory !== '';

  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Pekerjaan belum dipilih');
      let finalComment = comment.trim();
      if (isComplaint && complaintCategory) {
        finalComment = finalComment
          ? `[${complaintCategory}] ${finalComment}`
          : `[${complaintCategory}] Tidak ada komentar tambahan.`;
      } else if (isPraise && praiseTag) {
        finalComment = finalComment ? `[${praiseTag}] ${finalComment}` : finalComment || `[${praiseTag}]`;
      }
      return submitTenantStaffReview({ ticketId: selected.ticketId, rating, comment: finalComment || undefined });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-staff-review-eligible'] });
      await queryClient.invalidateQueries({ queryKey: ['portal-tickets'] });
      setSelected(null);
      setRating(5);
      setComplaintCategory('');
      setPraiseTag('');
      setComment('');
    },
  });

  const openReview = (item: EligibleStaffReviewItem) => {
    setSelected(item);
    setRating(5);
    setComplaintCategory('');
    setPraiseTag('');
    setComment('');
  };

  if (query.isLoading || !items.length) return null;

  return (
    <>
      <Card className="tenant-staff-review-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
            <div>
              <div className="command-eyebrow">Review Pekerjaan Staff</div>
              <h5 className="mb-1">Bagaimana hasil pekerjaan yang sudah selesai?</h5>
              <p className="mb-0 app-caption">
                Rating kamu sangat membantu admin menjaga standar kebersihan dan kualitas perbaikan kos.
                Jika ada masalah, ceritakan agar langsung bisa ditindak lanjuti.
              </p>
            </div>
            <Button size="sm" onClick={() => openReview(items[0])}>Beri Nilai</Button>
          </div>
          <div className="tenant-review-mini-list mt-3">
            {items.slice(0, 3).map((item) => (
              <button key={item.ticketId} type="button" onClick={() => openReview(item)}>
                <strong>{item.title || item.ticketNumber || `Tiket #${item.ticketId}`}</strong>
                <span>{item.staff?.fullName || 'Staff'} · {roomText(item)}</span>
                <em className="tenant-review-prompt-cta">Nilai sekarang →</em>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nilai Hasil Pekerjaan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mutation.isError ? <Alert variant="danger">Review belum terkirim. Coba lagi.</Alert> : null}

          <div className="review-job-card mb-3">
            <div className="review-job-icon">🎫</div>
            <div>
              <strong>{selected?.title || selected?.ticketNumber || `Tiket #${selected?.ticketId}`}</strong>
              <span>Staff: {selected?.staff?.fullName || '-'} · {selected ? roomText(selected) : ''}</span>
            </div>
          </div>

          {/* Star Rating */}
          <div className="review-star-section mb-3">
            <Form.Label className="fw-semibold mb-2">Beri rating hasil pekerjaan</Form.Label>
            <StarRating
              value={rating}
              onChange={(v) => { setRating(v); setComplaintCategory(''); setPraiseTag(''); }}
              size={28}
              showLabel
              labels={Object.fromEntries(Object.entries(RATING_LABELS).map(([k, v]) => [k, v.text]))}
              activeColor="#f59e0b"
            />
          </div>

          {/* Complaint categories for low rating */}
          {isComplaint && (
            <div className="review-complaint-section mb-3">
              <div className="review-section-head danger">
                <span>⚠️ Ada masalah — Pilih kategori komplain</span>
                <small>Wajib dipilih</small>
              </div>
              <div className="review-category-grid">
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`review-category-btn ${complaintCategory === cat.value ? 'selected danger' : ''}`}
                    onClick={() => setComplaintCategory(complaintCategory === cat.value ? '' : cat.value)}
                    title={cat.desc}
                  >
                    <span className="review-cat-icon">{cat.icon}</span>
                    <span>{cat.label}</span>
                    {complaintCategory === cat.value && <span className="review-cat-check">✓</span>}
                  </button>
                ))}
              </div>
              {complaintCategory && (
                <Alert variant="warning" className="py-2 mt-2 small">
                  Komplain <strong>{complaintCategory}</strong> akan dicatat dan diteruskan ke admin untuk ditindaklanjuti.
                </Alert>
              )}
            </div>
          )}

          {/* Praise tags for high rating */}
          {isPraise && (
            <div className="review-praise-section mb-3">
              <div className="review-section-head success">
                <span>✨ Bagus! Pilih tag pujian (opsional)</span>
              </div>
              <div className="review-praise-grid">
                {PRAISE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`review-praise-btn ${praiseTag === cat.value ? 'selected' : ''}`}
                    onClick={() => setPraiseTag(praiseTag === cat.value ? '' : cat.value)}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <Form.Group>
            <Form.Label className="fw-semibold">
              {isComplaint ? 'Detail masalah (opsional tapi membantu)' : 'Komentar tambahan (opsional)'}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
              maxLength={600}
              placeholder={
                isComplaint
                  ? 'Contoh: sudut kamar mandi masih ada jamur, sudah dilaporkan tapi belum dibersihkan...'
                  : 'Contoh: cepat datang, hasil rapi, terima kasih!'
              }
            />
            <Form.Text className="text-muted">{comment.length}/600 karakter</Form.Text>
          </Form.Group>

          {isComplaint && !complaintCategory && (
            <Alert variant="danger" className="mt-3 py-2 small">Pilih kategori komplain terlebih dahulu sebelum mengirim.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setSelected(null)}>Batal</Button>
          <Button
            variant={isComplaint ? 'danger' : 'primary'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
          >
            {mutation.isPending
              ? <><Spinner size="sm" className="me-2" />Mengirim...</>
              : isComplaint ? 'Kirim Komplain' : 'Kirim Rating'
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
