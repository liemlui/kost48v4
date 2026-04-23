import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import type { PricingTerm, PublicRoom } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const pricingOptions: Array<{ value: '' | PricingTerm; label: string }> = [
  { value: '', label: 'Semua term' },
  { value: 'MONTHLY', label: 'Bulanan' },
  { value: 'WEEKLY', label: 'Mingguan' },
  { value: 'BIWEEKLY', label: '2 Mingguan' },
  { value: 'DAILY', label: 'Harian' },
  { value: 'SMESTERLY', label: 'Semester' },
  { value: 'YEARLY', label: 'Tahunan' },
];

function RoomPlaceholder({ room }: { room: PublicRoom }) {
  const firstImage = room.images?.[0];
  if (firstImage) {
    return <img src={firstImage} alt={room.code} className="public-room-image" />;
  }
  const code = room.code || `R${room.id}`;
  const initials = code.slice(0, 3).toUpperCase();

  return (
    <div className="public-room-placeholder">
      <div className="public-room-placeholder-mark">{initials}</div>
      <div className="small text-muted">Foto kamar belum tersedia</div>
    </div>
  );
}

function PublicTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="public-topbar">
      <div className="brand-block">
        <div className="brand-mark">K48</div>
        <div>
          <div className="brand-title">Kost48 Surabaya</div>
          <div className="brand-subtitle">Katalog kamar publik</div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap">
        {user ? (
          <>
            <Button variant="outline-secondary" onClick={() => navigate(user.role === 'TENANT' ? '/portal/bookings' : '/dashboard')}>
              {user.role === 'TENANT' ? 'Portal Saya' : 'Kembali ke Workspace'}
            </Button>
            <Button variant="outline-danger" onClick={logout}>Logout</Button>
          </>
        ) : (
          <Button onClick={() => navigate('/login')}>Masuk</Button>
        )}
      </div>
    </div>
  );
}

export default function PublicRoomsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const floor = searchParams.get('floor') ?? '';
  const pricingTerm = (searchParams.get('pricingTerm') ?? '') as '' | PricingTerm;

  const query = useQuery({
    queryKey: ['public-rooms', { search, floor, pricingTerm }],
    queryFn: () => listPublicRooms({
      limit: 100,
      ...(search ? { search } : {}),
      ...(floor ? { floor } : {}),
      ...(pricingTerm ? { pricingTerm } : {}),
    }),
  });

  const rooms = useMemo(() => query.data?.items ?? [], [query.data]);
  const floorOptions = useMemo(() => {
    const values = new Set<string>();
    rooms.forEach((room) => {
      if (room.floor) values.add(room.floor);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'id'));
  }, [rooms]);

  const updateParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="public-page-shell">
      <Container fluid="xl" className="py-4 py-lg-5">
        <PublicTopbar />

        <Card className="content-card border-0 public-hero-card mt-4">
          <Card.Body>
            <div className="page-eyebrow">✦ Tenant-first booking</div>
            <div className="public-hero-grid">
              <div>
                <h1 className="mb-3">Cari kamar yang masih tersedia</h1>
                <p className="text-muted mb-0">
                  Katalog ini hanya menampilkan kamar aktif yang masih tersedia untuk dipesan. Setelah memilih kamar,
                  tenant bisa lanjut ke form booking tanpa perlu mengisi ID teknis apa pun.
                </p>
              </div>
              <div className="public-hero-note">
                <div className="fw-semibold mb-1">Yang ditampilkan di sini</div>
                <div className="small text-muted">Kode kamar, lantai, tarif utama yang relevan, dan CTA booking yang aman terhadap kontrak backend.</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="content-card border-0 mt-4">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col lg={5}>
                <Form.Group>
                  <Form.Label>Pencarian</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => updateParams({ search: event.target.value })}
                    placeholder="Cari kode atau nama kamar"
                  />
                </Form.Group>
              </Col>
              <Col sm={6} lg={3}>
                <Form.Group>
                  <Form.Label>Term utama</Form.Label>
                  <Form.Select value={pricingTerm} onChange={(event) => updateParams({ pricingTerm: event.target.value })}>
                    {pricingOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={6} lg={2}>
                <Form.Group>
                  <Form.Label>Lantai</Form.Label>
                  <Form.Select value={floor} onChange={(event) => updateParams({ floor: event.target.value })}>
                    <option value="">Semua lantai</option>
                    {floorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col lg={2}>
                <div className="table-meta-count text-lg-end">{rooms.length} kamar tersedia</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger" className="mt-4">Gagal memuat katalog kamar. Silakan coba lagi.</Alert> : null}
        {!query.isLoading && !query.isError && rooms.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="🛏️"
              title="Belum ada kamar yang cocok"
              description="Coba ubah pencarian atau filter term untuk melihat opsi kamar lain yang tersedia."
            />
          </div>
        ) : null}

        <Row className="g-4 mt-1">
          {rooms.map((room) => (
            <Col lg={4} md={6} key={room.id}>
              <Card className="content-card border-0 h-100 public-room-card">
                <Card.Body className="d-flex flex-column gap-3">
                  <RoomPlaceholder room={room} />

                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold fs-5">{room.code}</div>
                      <div className="text-muted small">{room.name || 'Nama kamar belum tersedia'}</div>
                    </div>
                    <Badge bg="success" className="status-badge">Tersedia</Badge>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    {room.floor ? <Badge bg="secondary" className="status-badge">Lantai {room.floor}</Badge> : null}
                    {room.highlightedPricingTerm ? (
                      <Badge bg="info" className="status-badge">{getStatusLabel(room.highlightedPricingTerm)}</Badge>
                    ) : null}
                  </div>

                  <div className="border rounded-4 p-3 bg-light-subtle">
                    <div className="small text-muted mb-1">Tarif utama</div>
                    <div className="fs-4 fw-bold"><CurrencyDisplay amount={room.highlightedRateRupiah} /></div>
                    <div className="small text-muted mt-1">
                      Deposit default <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} />
                    </div>
                  </div>

                  <div>
                    <div className="small text-muted mb-2">Term yang tersedia</div>
                    <div className="d-flex flex-wrap gap-2">
                      {(room.availablePricingTerms ?? []).map((term) => (
                        <Badge bg="light" text="dark" key={`${room.id}-${term}`} className="border">{getStatusLabel(term)}</Badge>
                      ))}
                    </div>
                  </div>

                  {room.notes ? <div className="app-caption">Catatan: {room.notes}</div> : <div className="app-caption">Placeholder netral dipakai sampai foto kamar tersedia di backend publik.</div>}

                  <div className="mt-auto d-grid gap-2">
                    <Button variant="outline-secondary" onClick={() => navigate(`/rooms/${room.id}/detail`)}>Lihat Detail</Button>
                    <Button onClick={() => navigate(`/booking/${room.id}`, { state: { room } })}>Pesan Sekarang</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
