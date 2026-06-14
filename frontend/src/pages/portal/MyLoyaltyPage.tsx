import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPeerReport, getCoTenants, getLoyaltyConfig, getMyLoyalty, getMyPeerReportsAboutMe, getMyPeerReportsMade, getMyRedemptions, getReferralCode, getRewards, markPeerReportImproved, requestRedemption } from '../../api/loyalty';

function rupiah(n: number | null | undefined): string {
  return typeof n === 'number' ? `Rp${n.toLocaleString('id-ID')}` : '-';
}

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
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ reporteeTenantId: 0, category: '', description: '' });

  const loyaltyQuery = useQuery({ queryKey: ['me-loyalty'], queryFn: getMyLoyalty });
  const rewardsQuery = useQuery({ queryKey: ['loyalty-rewards'], queryFn: () => getRewards(false) });
  const redemptionsQuery = useQuery({ queryKey: ['me-redemptions'], queryFn: getMyRedemptions });
  const configQuery = useQuery({ queryKey: ['loyalty-config'], queryFn: getLoyaltyConfig });
  const referralQuery = useQuery({ queryKey: ['referral-code'], queryFn: getReferralCode });
  const aboutMeQuery = useQuery({ queryKey: ['peer-about-me'], queryFn: getMyPeerReportsAboutMe });

  const improveMutation = useMutation({
    mutationFn: (id: number) => markPeerReportImproved(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['peer-about-me'] }),
  });
  const madeQuery = useQuery({ queryKey: ['peer-made'], queryFn: getMyPeerReportsMade });
  const coTenantsQuery = useQuery({ queryKey: ['co-tenants'], queryFn: getCoTenants, enabled: showReport });
  const reportMutation = useMutation({
    mutationFn: () => createPeerReport(reportForm),
    onSuccess: () => {
      setShowReport(false);
      setReportForm({ reporteeTenantId: 0, category: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['peer-made'] });
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal mengirim laporan.'),
  });

  const balance = loyaltyQuery.data?.balance ?? 0;
  const perPoint = configQuery.data?.pointRupiahValue ?? 100;
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
        <span className="text-muted small">≈ Rp{(balance * perPoint).toLocaleString('id-ID')} (1 poin ≈ Rp{perPoint.toLocaleString('id-ID')})</span>
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

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Lapor Masalah dengan Penghuni Lain</strong>
          <Button size="sm" variant="outline-primary" onClick={() => setShowReport(true)}>+ Lapor</Button>
        </Card.Header>
        <Card.Body className="p-0">
          <p className="text-muted small px-3 pt-2 mb-2">Laporan Anda dirahasiakan — penghuni yang dilaporkan tidak tahu siapa pelapornya. Setelah ia memperbaiki & Anda/admin konfirmasi, ia mendapat poin.</p>
          {madeQuery.data && madeQuery.data.length === 0 && <p className="text-muted px-3 pb-3 mb-0">Belum ada laporan.</p>}
          <ul className="list-group list-group-flush">
            {madeQuery.data?.map((r) => (
              <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <span>
                  <div className="fw-semibold">{r.reportee?.fullName ?? '-'} · {r.category}</div>
                  <div className="text-muted small">{r.description}</div>
                </span>
                <Badge bg={STATUS_VARIANT[r.status] ?? (r.status === 'CONFIRMED' ? 'success' : 'secondary')}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>

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
                          {reward.valueRupiah ? <span className="text-muted">senilai {rupiah(reward.valueRupiah)}</span> : null}
                          {reward.stockQty != null && <span className="text-muted ms-2">· stok {reward.stockQty}</span>}
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
                <p className="text-muted p-3 mb-0">Belum ada aktivitas poin. Perpanjang kontrak, bayar tepat waktu, lapor masalah, dan lengkapi profil untuk mengumpulkan poin.</p>
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

      <Modal show={showReport} onHide={() => setShowReport(false)}>
        <Modal.Header closeButton><Modal.Title>Lapor Penghuni Lain</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="text-muted small">Laporan akan dimoderasi admin dulu. Identitas Anda dirahasiakan dari penghuni yang dilaporkan.</p>
          <Form.Group className="mb-3">
            <Form.Label>Penghuni</Form.Label>
            <Form.Select value={reportForm.reporteeTenantId} onChange={(e) => setReportForm({ ...reportForm, reporteeTenantId: Number(e.target.value) })}>
              <option value={0}>— Pilih penghuni —</option>
              {coTenantsQuery.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}{t.room ? ` (${t.room})` : ''}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Kategori</Form.Label>
            <Form.Select value={reportForm.category} onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}>
              <option value="">— Pilih —</option>
              {['KEBISINGAN', 'KEBERSIHAN', 'PARKIR', 'MEROKOK', 'TAMU', 'LAINNYA'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Penjelasan</Form.Label>
            <Form.Control as="textarea" rows={3} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Ceritakan masalahnya secara singkat & sopan." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReport(false)}>Batal</Button>
          <Button variant="primary" disabled={reportMutation.isPending || !reportForm.reporteeTenantId || !reportForm.category || reportForm.description.trim().length < 5} onClick={() => reportMutation.mutate()}>
            {reportMutation.isPending ? 'Mengirim...' : 'Kirim Laporan'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
