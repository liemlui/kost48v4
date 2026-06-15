import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyLoyalty, getMyPeerReportsAboutMe, getMyRedemptions, getReferralCode, getRewards, markPeerReportImproved, requestRedemption } from '../../api/loyalty';

const STATUS_VARIANT: Record<string, string> = {
  PENDING: 'warning',
  APPROVED: 'info',
  FULFILLED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'secondary',
};

export default function MyLoyaltyPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const loyaltyQuery = useQuery({ queryKey: ['me-loyalty'], queryFn: getMyLoyalty });
  const rewardsQuery = useQuery({ queryKey: ['loyalty-rewards'], queryFn: () => getRewards(false) });
  const redemptionsQuery = useQuery({ queryKey: ['me-redemptions'], queryFn: getMyRedemptions });
  const referralQuery = useQuery({ queryKey: ['referral-code'], queryFn: getReferralCode });
  const aboutMeQuery = useQuery({ queryKey: ['peer-about-me'], queryFn: getMyPeerReportsAboutMe });

  const improveMutation = useMutation({
    mutationFn: (id: number) => markPeerReportImproved(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['peer-about-me'] }),
  });

  const balance = loyaltyQuery.data?.balance ?? 0;
  const referralCode = referralQuery.data?.code;
  const aboutMe = aboutMeQuery.data ?? [];

  const redeemMutation = useMutation({
    mutationFn: (rewardId: number) => requestRedemption(rewardId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['me-loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['me-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Gagal menukar reward. Coba lagi.');
    },
  });

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <h3 className="mb-0">Poin & Reward</h3>
        <Badge bg="primary" pill className="fs-6">{balance.toLocaleString('id-ID')} poin</Badge>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {referralCode && (
        <Alert variant="info" className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>
            <span role="img" aria-hidden="true">👥</span> <strong>Ajak teman!</strong> Bagikan kode referral Anda — saat teman jadi penghuni, Anda dapat poin.
          </span>
          <Badge bg="dark" className="fs-6">{referralCode}</Badge>
        </Alert>
      )}

      {aboutMe.length > 0 && (
        <Card className="mb-4 border-warning">
          <Card.Header className="bg-warning-subtle"><strong>💬 Masukan untuk Anda</strong> <small className="text-muted">(anonim — kumpulkan poin dengan memperbaiki)</small></Card.Header>
          <Card.Body className="p-0">
            <ul className="list-group list-group-flush">
              {aboutMe.map((r) => (
                <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap">
                  <span>
                    <div className="fw-semibold">{r.category}</div>
                    <div className="text-muted small">{r.description}</div>
                  </span>
                  {r.status === 'ACKNOWLEDGED' ? (
                    <Button size="sm" variant="success" disabled={improveMutation.isPending} onClick={() => improveMutation.mutate(r.id)}>Sudah saya perbaiki</Button>
                  ) : (
                    <Badge bg={r.status === 'CONFIRMED' ? 'success' : 'secondary'}>{r.status === 'IMPROVED' ? 'Menunggu konfirmasi' : r.status === 'CONFIRMED' ? 'Selesai (+poin)' : r.status}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}

      <Row className="g-4">
        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header><strong>Katalog Reward</strong></Card.Header>
            <Card.Body>
              {rewardsQuery.isLoading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}
              {rewardsQuery.data && rewardsQuery.data.length === 0 && (
                <p className="text-muted mb-0">Belum ada reward tersedia.</p>
              )}
              <div className="d-flex flex-column gap-3">
                {rewardsQuery.data?.map((reward) => {
                  const affordable = balance >= reward.pointCost;
                  const outOfStock = reward.stockQty != null && reward.stockQty <= 0;
                  return (
                    <div key={reward.id} className="d-flex align-items-start justify-content-between gap-3 border rounded p-3">
                      <div>
                        <div className="fw-semibold">{reward.name}</div>
                        {reward.description && <div className="text-muted small">{reward.description}</div>}
                        <div className="small mt-1">
                          <Badge bg="light" text="dark" className="me-2">{reward.pointCost.toLocaleString('id-ID')} poin</Badge>
                          {reward.stockQty != null && <span className="text-muted">· stok {reward.stockQty}</span>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={affordable && !outOfStock ? 'primary' : 'outline-secondary'}
                        disabled={!affordable || outOfStock || redeemMutation.isPending}
                        onClick={() => redeemMutation.mutate(reward.id)}
                      >
                        {outOfStock ? 'Habis' : affordable ? 'Tukar' : 'Poin kurang'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="mb-4">
            <Card.Header><strong>Penukaran Saya</strong></Card.Header>
            <Card.Body className="p-0">
              {redemptionsQuery.data && redemptionsQuery.data.length === 0 && (
                <p className="text-muted p-3 mb-0">Belum ada penukaran.</p>
              )}
              <ul className="list-group list-group-flush">
                {redemptionsQuery.data?.map((r) => (
                  <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <div className="fw-semibold">{r.reward?.name ?? `Reward #${r.rewardId}`}</div>
                      <small className="text-muted">{new Date(r.requestedAt).toLocaleDateString('id-ID')} · {r.pointCost} poin</small>
                    </span>
                    <Badge bg={STATUS_VARIANT[r.status] ?? 'secondary'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><strong>Riwayat Poin</strong></Card.Header>
            <Card.Body className="p-0">
              {loyaltyQuery.data && loyaltyQuery.data.items.length === 0 && (
                <p className="text-muted p-3 mb-0">Belum ada aktivitas poin. Perpanjang kontrak, bayar tepat waktu, dan lengkapi profil untuk mengumpulkan poin.</p>
              )}
              <ul className="list-group list-group-flush">
                {loyaltyQuery.data?.items.map((it) => (
                  <li key={it.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <div className="small">{it.note ?? it.reason}</div>
                      <small className="text-muted">{new Date(it.createdAt).toLocaleDateString('id-ID')}</small>
                    </span>
                    <span className={`fw-semibold ${it.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                      {it.delta >= 0 ? '+' : ''}{it.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
