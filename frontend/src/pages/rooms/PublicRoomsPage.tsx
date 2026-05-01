import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import FacilityList from '../../components/rooms/FacilityList';
import RoomComparePanel from '../../components/rooms/RoomComparePanel';
import type { PricingTerm, PublicRoom } from '../../types';
import { getStatusLabel } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { isUtilitiesIncludedForPricingTerm } from '../../utils/pricing';

const pricingOptions: Array<{ value: '' | PricingTerm; label: string }> = [
  { value: '', label: 'Semua term' },
  { value: 'DAILY', label: 'Harian (flat, termasuk listrik & air)' },
  { value: 'WEEKLY', label: 'Mingguan (flat, termasuk listrik & air)' },
  { value: 'BIWEEKLY', label: '2 Mingguan (flat, termasuk listrik & air)' },
  { value: 'MONTHLY', label: 'Bulanan (meteran terpisah)' },
  { value: 'SMESTERLY', label: 'Semesteran (meteran terpisah)' },
  { value: 'YEARLY', label: 'Tahunan (meteran terpisah)' },
];

const sortOptions = [
  { value: 'default', label: 'Rekomendasi' },
  { value: 'price-asc', label: 'Harga terendah' },
  { value: 'price-desc', label: 'Harga tertinggi' },
  { value: 'available-first', label: 'Kamar tersedia dulu' },
];

function RoomPlaceholder({ room }: { room: PublicRoom }) {
  const firstImage = room.images?.[0];
  const [imgFailed, setImgFailed] = useState(false);
  const resolved = firstImage ? resolveAbsoluteFileUrl(firstImage) : null;

  if (resolved && !imgFailed) {
    return (
      <img
        src={resolved}
        alt={room.code}
        className="public-room-image"
        onError={() => setImgFailed(true)}
      />
    );
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
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const search = searchParams.get('search') ?? '';
  const pricingTerm = (searchParams.get('pricingTerm') ?? '') as '' | PricingTerm;
  const sort = searchParams.get('sort') ?? 'default';
  const showAll = searchParams.get('showAll') === '1';

  const [compareIds, setCompareIds] = useState<number[]>([]);

  const query = useQuery({
    queryKey: ['public-rooms', { search, pricingTerm }],
    queryFn: () => listPublicRooms({
      limit: 100,
      ...(search ? { search } : {}),
      ...(pricingTerm ? { pricingTerm } : {}),
    }),
  });

  const roomsFromApi = useMemo(() => query.data?.items ?? [], [query.data]);

  const rooms = useMemo(() => {
    let list = roomsFromApi;

    // local sort
    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => (a.highlightedRateRupiah ?? 0) - (b.highlightedRateRupiah ?? 0));
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => (b.highlightedRateRupiah ?? 0) - (a.highlightedRateRupiah ?? 0));
    } else if (sort === 'available-first') {
      list = [...list].sort((a, b) => {
        const aAvail = a.isAvailable !== false ? 0 : 1;
        const bAvail = b.isAvailable !== false ? 0 : 1;
        return aAvail - bAvail;
      });
    }

    // local filter: show all or only available
    if (!showAll) {
      list = list.filter((r) => r.isAvailable !== false);
    }

    return list;
  }, [roomsFromApi, sort, showAll]);

  const compareRooms = useMemo(() => {
    return rooms.filter((r) => compareIds.includes(r.id));
  }, [rooms, compareIds]);

  const updateParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  const toggleCompare = (roomId: number) => {
    setCompareIds((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, roomId];
    });
  };

  const compareMaxWarning = compareIds.length >= 3;

  const hasFilters = search !== '' || pricingTerm !== '' || sort !== 'default' || showAll;

  return (
    <div className="public-page-shell">
      <Container fluid="xl" className="py-4 py-lg-5">
        <PublicTopbar />

        {user?.role === 'TENANT' && stage === 'booking' ? (
          <Alert variant="info" className="mt-4">Anda masih punya pemesanan yang sedang diproses. Jika ingin memantau approval atau pembayaran awal, buka <Button variant="link" className="p-0 align-baseline" onClick={() => navigate('/portal/bookings')}>Pemesanan Saya</Button>.</Alert>
        ) : null}

        <Card className="content-card border-0 public-hero-card mt-4">
          <Card.Body>
            <div className="page-eyebrow">✦ Katalog Kamar — Kos48 Surabaya</div>
            <div className="public-hero-grid">
              <div>
                <h1 className="mb-3">Katalog Kamar</h1>
                <p className="text-muted mb-0">
                  Cari kamar yang sesuai dengan budget, fasilitas, dan kebutuhan tinggal Anda. Gunakan filter dan perbandingan untuk memilih kamar sebelum booking.
                </p>
              </div>
              <div className="public-hero-note">
                <div className="fw-semibold mb-1">Katalog selalu diperbarui</div>
                <div className="small text-muted">Hanya kamar aktif yang ditampilkan. Harga dan ketersediaan mengikuti data operasional terbaru.</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="content-card border-0 mt-4">
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col lg={4} md={6}>
                <Form.Group>
                  <Form.Label>Cari kamar</Form.Label>
                  <Form.Control
                    value={search}
                    onChange={(event) => updateParams({ search: event.target.value })}
                    placeholder="Cari kode atau nama kamar"
                  />
                </Form.Group>
              </Col>
              <Col lg={3} md={6}>
                <Form.Group>
                  <Form.Label>Term sewa</Form.Label>
                  <Form.Select value={pricingTerm} onChange={(event) => updateParams({ pricingTerm: event.target.value })}>
                    {pricingOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col lg={2} md={4}>
                <Form.Group>
                  <Form.Label>Urutkan</Form.Label>
                  <Form.Select value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
                    {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col lg={2} md={4}>
                <Form.Group>
                  <Form.Label className="d-block">&nbsp;</Form.Label>
                  <Form.Check
                    type="switch"
                    id="show-all-switch"
                    label={showAll ? 'Semua kamar' : 'Tersedia saja'}
                    checked={showAll}
                    onChange={(event) => updateParams({ showAll: event.target.checked ? '1' : '' })}
                  />
                </Form.Group>
              </Col>
              <Col lg={1} md={6}>
                <div className="table-meta-count text-lg-end">{rooms.length} kamar</div>
              </Col>
            </Row>

            {query.isSuccess && compareIds.length > 0 && (
              <div className="mt-3 d-flex align-items-center gap-2 flex-wrap">
                <span className="small text-muted">
                  {compareIds.length} kamar dipilih untuk perbandingan
                </span>
                <Button variant="outline-secondary" size="sm" onClick={() => setCompareIds([])}>
                  Bersihkan Pilihan
                </Button>
              </div>
            )}

            {compareMaxWarning && compareIds.length === 3 && (
              <Alert variant="warning" className="mt-2 mb-0 py-2 small">
                Maksimal 3 kamar untuk dibandingkan.
              </Alert>
            )}
          </Card.Body>
        </Card>

        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger" className="mt-4">Gagal memuat katalog kamar. Silakan coba lagi.</Alert> : null}
        {!query.isLoading && !query.isError && rooms.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="🛏️"
              title="Belum ada kamar yang cocok"
              description={
                hasFilters
                  ? 'Coba ubah filter pencarian atau term sewa untuk melihat opsi kamar lain yang tersedia.'
                  : 'Belum ada kamar tersedia saat ini. Silakan cek kembali nanti.'
              }
            />
          </div>
        ) : null}

        {compareRooms.length > 0 && (
          <RoomComparePanel
            rooms={compareRooms}
            onClear={() => setCompareIds([])}
          />
        )}

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
                    <Badge bg={room.isAvailable !== false ? 'success' : 'secondary'} className="status-badge">
                      {room.isAvailable !== false ? 'Tersedia' : 'Penuh'}
                    </Badge>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    {room.floor ? <Badge bg="secondary" className="status-badge">Lantai {room.floor}</Badge> : null}
                    {room.highlightedPricingTerm ? (
                      <Badge bg="info" className="status-badge">
                        {getStatusLabel(room.highlightedPricingTerm)}
                        {isUtilitiesIncludedForPricingTerm(room.highlightedPricingTerm) ? ' · flat' : ''}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="border rounded-4 p-3 bg-light-subtle">
                    <div className="small text-muted mb-1">Tarif utama</div>
                    <div className="fs-4 fw-bold"><CurrencyDisplay amount={room.highlightedRateRupiah} /></div>
                    <div className="small text-muted mt-1">
                      Deposit default <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} />
                    </div>
                  </div>

                  <FacilityList
                    facilities={room.facilities ?? []}
                    maxItems={5}
                    compact
                    emptyMessage=""
                  />

                  {room.notes ? <div className="app-caption">Catatan: {room.notes}</div> : null}

                  <div className="mt-auto d-grid gap-2">
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" className="flex-fill" onClick={() => navigate(`/rooms/${room.id}/detail`)}>Lihat Detail</Button>
                      {room.isAvailable !== false ? (
                        <Button className="flex-fill" onClick={() => navigate(`/booking/${room.id}`, { state: { room } })}>Pesan Sekarang</Button>
                      ) : (
                        <Button className="flex-fill" variant="secondary" disabled>Tidak Tersedia</Button>
                      )}
                    </div>

                    <Form.Check
                      type="checkbox"
                      id={`compare-${room.id}`}
                      label="Bandingkan"
                      checked={compareIds.includes(room.id)}
                      onChange={() => toggleCompare(room.id)}
                      disabled={!compareIds.includes(room.id) && compareIds.length >= 3}
                    />
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