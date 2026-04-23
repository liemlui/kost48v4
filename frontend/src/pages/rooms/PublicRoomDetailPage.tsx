import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Carousel, Col, Container, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPublicRoomDetail } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import type { PublicRoom } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';

function RoomImageBlock({ room }: { room: PublicRoom }) {
  const images = room.images ?? [];
  if (!images.length) {
    return (
      <div className="public-room-placeholder public-room-detail-placeholder">
        <div className="public-room-placeholder-mark">{room.code.slice(0, 3).toUpperCase()}</div>
        <div className="small text-muted">Galeri kamar belum tersedia</div>
      </div>
    );
  }

  if (images.length === 1) {
    return <img src={images[0]} alt={room.code} className="public-room-image" />;
  }

  return (
    <Carousel interval={null} indicators={images.length > 1}>
      {images.map((imageUrl, index) => (
        <Carousel.Item key={`${room.id}-${index}`}>
          <img src={imageUrl} alt={`${room.code}-${index + 1}`} className="public-room-image" />
        </Carousel.Item>
      ))}
    </Carousel>
  );
}

export default function PublicRoomDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const id = Number(roomId);

  const query = useQuery({
    queryKey: ['public-room-detail', id],
    queryFn: () => getPublicRoomDetail(id),
    enabled: Number.isFinite(id),
  });

  const room = query.data;

  return (
    <div className="public-page-shell">
      <Container fluid="xl" className="py-4 py-lg-5">
        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
          <div>
            <div className="page-eyebrow">✦ Detail kamar publik</div>
            <h1 className="mb-1">{room?.code ?? 'Detail kamar'}</h1>
            <div className="text-muted">Lihat galeri, tarif, dan pilih flow booking yang sesuai.</div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/rooms" className="btn btn-outline-secondary">Kembali ke Katalog</Link>
            {room?.isAvailable ? (
              <Button onClick={() => navigate(`/booking/${id}`, { state: { room } })}>Pesan Sekarang</Button>
            ) : null}
          </div>
        </div>

        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat detail kamar publik.</Alert> : null}
        {!query.isLoading && !query.isError && !room ? <EmptyState icon="🛏️" title="Kamar tidak ditemukan" description="Data kamar publik tidak tersedia atau sudah tidak aktif." /> : null}

        {room ? (
          <Row className="g-4">
            <Col lg={7}>
              <Card className="content-card border-0 h-100">
                <Card.Body>
                  <RoomImageBlock room={room} />
                </Card.Body>
              </Card>
            </Col>
            <Col lg={5}>
              <Card className="content-card border-0 h-100">
                <Card.Body className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold fs-4">{room.code}</div>
                      <div className="text-muted">{room.name || 'Nama kamar belum tersedia'}</div>
                    </div>
                    <Badge bg={room.isAvailable ? 'success' : 'secondary'} className="status-badge">
                      {room.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                    </Badge>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    {room.floor ? <Badge bg="secondary" className="status-badge">Lantai {room.floor}</Badge> : null}
                    {(room.availablePricingTerms ?? []).map((term) => (
                      <Badge bg="light" text="dark" key={term} className="border">{getStatusLabel(term)}</Badge>
                    ))}
                  </div>

                  <div className="border rounded-4 p-3 bg-light-subtle">
                    <div className="small text-muted mb-1">Tarif utama</div>
                    <div className="fs-4 fw-bold"><CurrencyDisplay amount={room.highlightedRateRupiah} /></div>
                    <div className="small text-muted mt-1">Deposit default <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
                  </div>

                  <Table size="sm" className="mb-0">
                    <tbody>
                      <tr><td className="text-muted">Tarif Harian</td><td><CurrencyDisplay amount={room.pricing?.dailyRateRupiah} showZero={false} /></td></tr>
                      <tr><td className="text-muted">Tarif Mingguan</td><td><CurrencyDisplay amount={room.pricing?.weeklyRateRupiah} showZero={false} /></td></tr>
                      <tr><td className="text-muted">Tarif 2 Mingguan</td><td><CurrencyDisplay amount={room.pricing?.biWeeklyRateRupiah} showZero={false} /></td></tr>
                      <tr><td className="text-muted">Tarif Bulanan</td><td><CurrencyDisplay amount={room.pricing?.monthlyRateRupiah} showZero={false} /></td></tr>
                    </tbody>
                  </Table>

                  {room.notes ? <Alert variant="light" className="mb-0">{room.notes}</Alert> : null}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
}
