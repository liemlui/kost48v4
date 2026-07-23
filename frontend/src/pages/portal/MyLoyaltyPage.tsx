import PageHeader from '../../components/common/PageHeader';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLoyaltyLeaderboard, getMyLoyalty, getMyPeerReportsAboutMe, getMyRedemptions, getReferralCode, getRewards, markPeerReportImproved, requestRedemption } from '../../api/loyalty';
import { getCleanlinessRanking } from '../../api/marketing';
import { fetchPublicConfig } from '../../api/settings';
import { formatDateOnly } from '../../utils/dateTime';
import { getStatusLabel } from '../../utils/statusLabels';

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

  // Guard: redirect jika fitur loyalty dinonaktifkan owner
  const configQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 60_000,
  });
  if (!configQuery.isLoading && configQuery.data && !configQuery.data.tenantLoyaltyEnabled) {
    return <Navigate to="/portal/stay" replace />;
  }

  const loyaltyQuery = useQuery({ queryKey: ['me-loyalty'], queryFn: getMyLoyalty });
  const rewardsQuery = useQuery({ queryKey: ['loyalty-rewards'], queryFn: () => getRewards(false) });
  const redemptionsQuery = useQuery({ queryKey: ['me-redemptions'], queryFn: getMyRedemptions });
  const referralQuery = useQuery({ queryKey: ['referral-code'], queryFn: getReferralCode });
  const aboutMeQuery = useQuery({ queryKey: ['peer-about-me'], queryFn: getMyPeerReportsAboutMe });
  const leaderboardQuery = useQuery({ queryKey: ['loyalty-leaderboard'], queryFn: getLoyaltyLeaderboard });

  const improveMutation = useMutation({
    mutationFn: (id: number) => markPeerReportImproved(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['peer-about-me'] }),
  });

  const balance = loyaltyQuery.data?.balance ?? 0;
  const referralCode = referralQuery.data?.code;
  const aboutMe = aboutMeQuery.data ?? [];
  const items = loyaltyQuery.data?.items ?? [];
  const totalEarned = loyaltyQuery.data?.totalEarned ?? items.filter((i) => i.delta > 0).reduce((s, i) => s + i.delta, 0);
  const totalRedeemed = loyaltyQuery.data?.totalRedeemed ?? Math.abs(items.filter((i) => i.delta < 0).reduce((s, i) => s + i.delta, 0));
  const leaderboard = leaderboardQuery.data ?? [];
  const now = new Date();
  const cleanRankQuery = useQuery({
    queryKey: ['cleanliness-ranking', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => getCleanlinessRanking(now.getMonth() + 1, now.getFullYear()),
    staleTime: 120_000,
  });
  const cleanRank = cleanRankQuery.data?.ranking ?? [];
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

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
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Program Loyalitas"
        description="Kumpulkan poin dari kebaikan dan tukarkan dengan reward."
      />
      <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <Badge bg="primary" pill className="fs-6">{balance.toLocaleString('id-ID')} poin tersisa</Badge>
      </div>

      {/* Narasi: poin = ukuran kebaikan, bukan sekadar demi reward */}
      <Card className="mb-3 border-0 loyalty-hero-gradient">
        <Card.Body className="py-3">
          <div className="d-flex align-items-start gap-2">
            <span className="loyalty-emoji" aria-hidden>🌱</span>
            <div>
              <div className="fw-semibold">Poin = cerminan kebaikanmu sebagai penghuni</div>
              <div className="text-muted small">
                Bukan sekadar demi hadiah. Tiap kali kamu <strong>perpanjang kontrak</strong>, <strong>bayar tepat waktu</strong>,
                <strong> lengkapi profil</strong>, atau <strong>memperbaiki masukan</strong> — poinmu bertambah. Makin tinggi poin,
                makin besar kontribusimu untuk kos yang nyaman bersama. 🤝
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Total kebaikan / ditukar / sisa */}
      <Row className="g-3 mb-4">
        <Col xs={4}>
          <Card className="text-center h-100 border-0 shadow-sm"><Card.Body className="py-3">
            <div className="text-muted small">Total kebaikan</div>
            <div className="fs-4 fw-bold text-success">{totalEarned.toLocaleString('id-ID')}</div>
            <div className="text-muted loyalty-stat-note">poin dikumpulkan</div>
          </Card.Body></Card>
        </Col>
        <Col xs={4}>
          <Card className="text-center h-100 border-0 shadow-sm"><Card.Body className="py-3">
            <div className="text-muted small">Sudah ditukar</div>
            <div className="fs-4 fw-bold text-secondary">{totalRedeemed.toLocaleString('id-ID')}</div>
            <div className="text-muted loyalty-stat-note">poin untuk reward</div>
          </Card.Body></Card>
        </Col>
        <Col xs={4}>
          <Card className="text-center h-100 border-0 shadow-sm"><Card.Body className="py-3">
            <div className="text-muted small">Sisa poin</div>
            <div className="fs-4 fw-bold text-primary">{balance.toLocaleString('id-ID')}</div>
            <div className="text-muted loyalty-stat-note">bisa ditukar</div>
          </Card.Body></Card>
        </Col>
      </Row>

      {/* TEN-GAMIF: Ranking kebersihan depan kamar bulanan */}
      {cleanRank.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex align-items-center justify-content-between flex-wrap gap-1">
            <strong>🧹 Ranking Kebersihan Bulan Ini</strong>
            <small className="text-muted">berdasarkan rutinitas kebersihan staf · anonim</small>
          </Card.Header>
          <Card.Body className="p-0">
            <ul className="list-group list-group-flush">
              {cleanRank.map((row, i) => {
                const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return (
                  <li key={row.roomId} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <span className="me-2 loyalty-rank-emoji" aria-hidden>{icon}</span>
                      <strong>Kamar {row.code}</strong>
                      <small className="text-muted ms-2">{row.doneCount ?? 0}/{row.expectedCount ?? 0} jadwal</small>
                    </span>
                    <Badge bg={i < 3 ? 'success' : 'secondary'} pill>{row.score}%</Badge>
                  </li>
                );
              })}
            </ul>
          </Card.Body>
        </Card>
      )}

      {/* Papan kebaikan top-3 (anonim per kamar) */}
      {leaderboard.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="d-flex align-items-center justify-content-between flex-wrap gap-1">
            <strong>🏆 Papan Kebaikan — Top 3 Kamar</strong>
            <small className="text-muted">anonim · hanya kode kamar</small>
          </Card.Header>
          <Card.Body className="p-0">
            <ul className="list-group list-group-flush">
              {leaderboard.map((row) => (
                <li key={row.roomCode} className="list-group-item d-flex justify-content-between align-items-center">
                  <span><span className="me-2 loyalty-rank-emoji" aria-hidden>{medal(row.rank)}</span><strong>Kamar {row.roomCode}</strong></span>
                  <Badge bg="success" pill>{row.points.toLocaleString('id-ID')} poin</Badge>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}

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
                    <Badge bg={r.status === 'CONFIRMED' ? 'success' : 'secondary'}>{getStatusLabel(r.status, undefined, { domain: 'loyalty' })}</Badge>
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
              {/* R-17: empty state lebih informatif — motivasi kumpul poin */}
              {rewardsQuery.data && rewardsQuery.data.length === 0 && (
                <div className="text-center py-4">
                  <div className="loyalty-reward-empty">🎁</div>
                  <div className="fw-semibold mb-1">Reward segera hadir!</div>
                  <p className="text-muted small mb-2">Kumpulkan poin kamu sekarang agar siap ditukar saat katalog tersedia.</p>
                  <div className="text-start border rounded p-3 bg-light">
                    <div className="fw-semibold small mb-1">Cara mendapat poin:</div>
                    <ul className="small text-muted mb-0 ps-3">
                      <li>Bayar tagihan tepat waktu</li>
                      <li>Perpanjang kontrak masa sewa</li>
                      <li>Lengkapi data profil penghuni</li>
                      <li>Perbaiki masukan pengelola</li>
                    </ul>
                  </div>
                </div>
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
                      <small className="text-muted">{formatDateOnly(r.requestedAt)} · {r.pointCost} poin</small>
                    </span>
                    <Badge bg={STATUS_VARIANT[r.status] ?? 'secondary'}>{getStatusLabel(r.status, undefined, { domain: 'loyalty' })}</Badge>
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
                      <small className="text-muted">{formatDateOnly(it.createdAt)}</small>
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
    </div>
  );
}
