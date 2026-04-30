import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Carousel, Col, Container, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPublicRoomDetail } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import type { PublicRoom, RoomFacility } from '../../types';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import FacilityList from '../../components/rooms/FacilityList';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm, ALL_PRICING_TERMS } from '../../utils/pricing';

function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const resolved = src ? resolveAbsoluteFileUrl(src) : null;
  if (!resolved || failed) return null;
  return <img src={resolved} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function RoomImageBlock({ room }: { room: PublicRoom }) {
  const images = room.images ?? [];
  const resolvedImages = images.map((url) => resolveAbsoluteFileUrl(url)).filter(Boolean) as string[];

  if (!resolvedImages.length) {
    return (
      <div className="public-room-placeholder public-room-detail-placeholder">
        <div className="public-room-placeholder-mark">{room.code.slice(0, 3).toUpperCase()}</div>
        <div className="small text-muted">Galeri kamar belum tersedia</div>
      </div>
    );
  }

  if (resolvedImages.length === 1) {
    return <SafeImage src={resolvedImages[0]} alt={room.code} className="public-room-image" />;
  }

  return (
    <Carousel interval={null} indicators={resolvedImages.length > 1}>
      {resolvedImages.map((imageUrl, index) => (
        <Carousel.Item key={`${room.id}-${index}`}>
          <SafeImage src={imageUrl} alt={`${room.code}-${index + 1}`} className="public-room-image" />
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
              <Button onClick={() => navigate(`/booking/${id}`, { state: { room } })}>Booking Kamar Ini</Button>
            ) : (
              <Button disabled variant="secondary">Kamar Tidak Tersedia</Button>
            )}
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
                    <StatusBadge status={room.status} />
                  </div>

                   <div className="d-flex flex-wrap gap-2">
                    {room.floor ? <Badge bg="secondary" className="status-badge">Lantai {room.floor}</Badge> : null}
                    {(room.availablePricingTerms ?? []).map((term) => (
                      <Badge bg="light" text="dark" key={term} className="border">
                        {getStatusLabel(term)}{isUtilitiesIncludedForPricingTerm(term) ? ' · flat' : ''}
                      </Badge>
                    ))}
                  </div>

                  <div className="border rounded-4 p-3 bg-light-subtle">
                    <div className="small text-muted mb-1">Tarif utama</div>
                    <div className="fs-4 fw-bold"><CurrencyDisplay amount={room.highlightedRateRupiah} /></div>
                    <div className="small text-muted mt-1">Deposit default <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
                  </div>

                   <h5 className="mt-2">📋 Spesifikasi Kamar</h5>

                   <Row className="g-2">
                     <Col xs={6}>
                       <div className="card-title-soft mb-1">Status</div>
                       <StatusBadge status={room.status} />
                     </Col>
                     <Col xs={6}>
                       <div className="card-title-soft mb-1">Lantai</div>
                       <div className="fw-semibold">{room.floor || '-'}</div>
                     </Col>
                     <Col xs={6}>
                       <div className="card-title-soft mb-1">Tarif Bulanan</div>
                       <div className="fw-semibold"><CurrencyDisplay amount={room.pricing?.monthlyRateRupiah ?? 0} showZero={false} /></div>
                     </Col>
                     <Col xs={6}>
                       <div className="card-title-soft mb-1">Deposit</div>
                       <div className="fw-semibold"><CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></div>
                     </Col>
                   </Row>

                   <FacilityList facilities={room.facilities ?? []} emptyMessage="Belum ada informasi fasilitas kamar." />

                   {room.notes ? <Alert variant="light" className="mb-0">{room.notes}</Alert> : null}

                   <h5 className="mt-2">📊 Daftar Tarif Lengkap</h5>

                   <Table size="sm" className="mb-0">
                     <thead>
                       <tr>
                         <th className="text-muted">Term</th>
                         <th className="text-end">Tarif</th>
                         <th className="text-muted small">Utilitas</th>
                       </tr>
                     </thead>
                     <tbody>
                       {ALL_PRICING_TERMS.map((term) => {
                         const rent = room.pricing?.monthlyRateRupiah ? calculateRentByPricingTerm(room.pricing.monthlyRateRupiah, term) : null;
                         const incUtil = isUtilitiesIncludedForPricingTerm(term);
                         return (
                           <tr key={term}>
                             <td className="text-muted">{getStatusLabel(term)}</td>
                             <td className="text-end fw-semibold"><CurrencyDisplay amount={rent} showZero={false} /></td>
                             <td className="small">{incUtil ? 'Termasuk (flat)' : 'Meteran terpisah'}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
}
