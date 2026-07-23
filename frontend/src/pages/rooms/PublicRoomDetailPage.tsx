// FILE: PublicRoomDetailPage.tsx — detail kamar publik: fasilitas, foto, harga, booking
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Alert, Badge, Button, Card, Carousel, Col, Container, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPublicRoomDetail } from '../../api/bookings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import Kost48OfficialInfoCard from '../../components/common/Kost48OfficialInfoCard';
import type { PricingTerm, PublicRoom } from '../../types';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import { getKost48RoomGallery, resolveKost48MarketingImageUrl } from '../../data/kost48Assets';
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm, ALL_PRICING_TERMS } from '../../utils/pricing';
import { getPublicRoomAvailabilityDisplay, getPublicRoomInitialCostEstimate, publicBookingSafetySteps } from '../../utils/publicRoomDisplay';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import { DP_RATIO } from '../../config/constants';
import { buildAdminWaUrl, buildRoomWaUrl } from '../../utils/whatsapp';

// ═══════════════════════════════════════════════════════════
//  COMPONENT: PublicRoomDetailPage
// ═══════════════════════════════════════════════════════════

type RoomFeatureKind = 'bathroom' | 'cooling' | 'size';

type TermRow = {
  term: PricingTerm;
  label: string;
  rent: number;
  utilitiesIncluded: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function allRoomText(room: PublicRoom) {
  return [
    room.code,
    room.name,
    room.notes,
    room.floor,
    ...(room.facilities ?? []).map((facility) => `${facility.name} ${facility.category ?? ''} ${facility.note ?? ''}`),
  ].map(normalizeText).join(' ');
}

function getBathroomType(room: PublicRoom) {
  const cat = String(room.category ?? '').toUpperCase();
  if (cat === 'ECONOMY') return 'Luar';
  if (cat === 'STANDARD' || cat === 'DELUXE') return 'Dalam';
  const text = allRoomText(room);
  if (/km\s*dalam|kamar mandi dalam|mandi dalam|private bathroom|bathroom dalam|toilet dalam/.test(text)) return 'Dalam';
  return 'Luar';
}

function getCoolingType(room: PublicRoom) {
  const cat = String(room.category ?? '').toUpperCase();
  if (cat === 'DELUXE') return 'AC';
  if (cat === 'ECONOMY' || cat === 'STANDARD') return 'Kipas angin';
  const text = allRoomText(room);
  if (/\bac\b|air conditioner|pendingin ruangan/.test(text)) return 'AC';
  return 'Kipas angin';
}

function getRoomSize(room: PublicRoom) {
  const size = String(room.roomSize ?? '').toUpperCase();
  if (size === 'LARGE') return 'Besar';
  if (size === 'STANDARD') return 'Standar';
  const text = allRoomText(room);
  if (/besar|large|luas|vip|premium|superior/.test(text)) return 'Besar';
  return 'Standar';
}

function getFeature(room: PublicRoom, kind: RoomFeatureKind) {
  if (kind === 'bathroom') return { icon: '🚿', label: 'Kamar mandi', value: getBathroomType(room) };
  if (kind === 'cooling') return { icon: getCoolingType(room) === 'AC' ? '❄️' : '🌬️', label: 'Pendingin', value: getCoolingType(room) };
  return { icon: '📐', label: 'Ukuran', value: getRoomSize(room) };
}

function getVisibleAmenities(room: PublicRoom) {
  const hidden = /kamar mandi|km\s|toilet|wc|ac|kipas|pendingin|standar|besar|ukuran|lantai/i;
  const names = (room.facilities ?? [])
    .filter((facility) => facility.publicVisible !== false)
    .map((facility) => facility.name?.trim())
    .filter((name): name is string => Boolean(name && !hidden.test(name)));
  const unique = Array.from(new Set(names));
  return unique.length ? unique.slice(0, 8) : ['Kasur', 'Harga transparan'];
}

function getBusinessHighlight(room: PublicRoom) {
  const raw = (room.notes ?? '').trim();
  if (raw && !/seed|dummy|test|uat|\.ps1|auto[- ]?created|checkout[_ -]?guard|script|developer/i.test(raw)) return raw;
  const bathroom = getBathroomType(room).toLowerCase();
  const cooling = getCoolingType(room).toLowerCase();
  return `Kamar dengan kamar mandi ${bathroom}, ${cooling}, dan informasi harga yang transparan.`;
}

function getTermRent(room: PublicRoom, term: PricingTerm) {
  if (term === 'DAILY') return Number(room.pricing?.dailyRateRupiah ?? 0);
  if (term === 'WEEKLY') return Number(room.pricing?.weeklyRateRupiah ?? 0);
  if (term === 'MONTHLY') return Number(room.pricing?.monthlyRateRupiah ?? room.highlightedRateRupiah ?? 0);
  const monthly = Number(room.pricing?.monthlyRateRupiah ?? 0);
  return monthly > 0 ? calculateRentByPricingTerm(monthly, term) : 0;
}

function buildTermRows(room: PublicRoom): TermRow[] {
  const availableTerms = room.availablePricingTerms?.length ? room.availablePricingTerms : [...ALL_PRICING_TERMS];
  const rows = availableTerms
    .map((term) => ({
      term,
      label: getStatusLabel(term),
      rent: getTermRent(room, term),
      utilitiesIncluded: isUtilitiesIncludedForPricingTerm(term),
    }))
    .filter((row) => row.rent > 0);

  if (rows.length) return rows;

  const fallback = Number(room.highlightedRateRupiah ?? 0);
  return fallback > 0 ? [{ term: room.highlightedPricingTerm ?? 'MONTHLY', label: getStatusLabel(room.highlightedPricingTerm ?? 'MONTHLY'), rent: fallback, utilitiesIncluded: false }] : [];
}

function getDefaultTerm(rows: TermRow[]) {
  return rows.find((row) => row.term === 'MONTHLY')?.term ?? rows[0]?.term ?? 'MONTHLY';
}

function DetailFeatureCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="room-detail-feature-card">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function RoomImageBlock({ room }: { room: PublicRoom }) {
  const images = room.images ?? [];
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 10), [room.code, room.name]);
  const apiGallery = useMemo(
    () => images.map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [images],
  );
  const candidateImages = useMemo(() => Array.from(new Set([
    ...localGallery,
    ...apiGallery,
  ])), [localGallery, apiGallery]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const resolvedImages = candidateImages.filter((imageUrl) => !failedImages.has(imageUrl));

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages(new Set());
  }, [room.id, candidateImages.join('|')]);

  useEffect(() => {
    if (activeIndex >= resolvedImages.length) setActiveIndex(0);
  }, [activeIndex, resolvedImages.length]);

  const markImageFailed = (imageUrl: string) => {
    setFailedImages((previous) => {
      if (previous.has(imageUrl)) return previous;
      const next = new Set(previous);
      next.add(imageUrl);
      return next;
    });
  };

  if (!resolvedImages.length) {
    return (
      <div className="room-detail-photo-empty">
        <div className="room-detail-photo-empty-icon">K48</div>
        <div>
          <strong>Foto kamar menyusul</strong>
          <span>Admin bisa mengirim foto terbaru lewat WhatsApp sebelum kamu booking.</span>
        </div>
        <a href={buildRoomWaUrl(room.code || `Kamar #${room.id}`)} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
          Minta foto via WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="room-detail-gallery">
      <Carousel
        interval={resolvedImages.length > 1 ? 3400 : null}
        indicators={resolvedImages.length > 1}
        controls={resolvedImages.length > 1}
        activeIndex={activeIndex}
        onSelect={(index) => setActiveIndex(index ?? 0)}
      >
        {resolvedImages.map((imageUrl, index) => (
          <Carousel.Item key={`${room.id}-${imageUrl}`}>
            <img
              src={imageUrl}
              alt={`Foto kamar ${room.code} ${index + 1}`}
              className="room-detail-gallery-image"
              onError={() => markImageFailed(imageUrl)}
            />
          </Carousel.Item>
        ))}
      </Carousel>
      {resolvedImages.length > 1 ? (
        <div className="room-detail-gallery-thumbs" aria-label="Pilih foto kamar">
          {resolvedImages.map((imageUrl, index) => (
            <button
              key={`${room.id}-thumb-${imageUrl}`}
              type="button"
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`Lihat foto ${index + 1}`}
            >
              <img src={imageUrl} alt="" onError={() => markImageFailed(imageUrl)} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="room-detail-gallery-caption">
        <span>Foto {Math.min(activeIndex + 1, resolvedImages.length)}/{resolvedImages.length}</span>
        {resolvedImages.length > 1 ? <span>Slideshow otomatis; gunakan panah atau thumbnail untuk memilih foto.</span> : null}
      </div>
    </div>
  );
}

export default function PublicRoomDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const id = Number(roomId);
  const [selectedTerm, setSelectedTerm] = useState<PricingTerm>('MONTHLY');

  const query = useQuery({
    queryKey: ['public-room-detail', id],
    queryFn: () => getPublicRoomDetail(id),
    enabled: Number.isFinite(id),
  });

  const room = query.data;
  const termRows = useMemo(() => (room ? buildTermRows(room) : []), [room]);
  const defaultTerm = useMemo(() => getDefaultTerm(termRows), [termRows]);
  const effectiveTerm = termRows.some((row) => row.term === selectedTerm) ? selectedTerm : defaultTerm;
  const selectedRow = termRows.find((row) => row.term === effectiveTerm) ?? termRows[0];
  const availability = room ? getPublicRoomAvailabilityDisplay(room) : null;
  const initialCost = room ? getPublicRoomInitialCostEstimate(room, effectiveTerm) : { rent: 0, deposit: 0, total: 0 };

  const handleBook = () => {
    if (!room || !availability?.canBook) return;
    navigate(`/booking/${id}`, { state: { room, pricingTerm: effectiveTerm } });
  };

  return (
    <div className="public-page-shell room-detail-redesign-shell">
      <Container fluid="xl" className="py-4 py-lg-5">
        <div className="room-detail-topline mb-4">
          <div>
            <div className="page-eyebrow">Detail Kamar — KOST48 Surabaya</div>
            <h1 className="mb-1">{room ? (room.name?.trim() || `Kamar ${room.code}`) : 'Detail kamar'}</h1>
            <div className="text-muted">Lihat foto, fasilitas, term sewa, dan deposit sebelum mengajukan pemesanan.</div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/rooms" className="btn btn-outline-secondary">Kembali ke daftar kamar</Link>
          </div>
        </div>

        {/* R-03: CTA booking prominent above-the-fold, tepat di bawah judul kamar */}
        {room && availability && (
          <div className="room-detail-above-fold-cta mb-4">
            {selectedRow && (
              <div className="room-detail-above-fold-price">
                <span>Tarif {selectedRow.label}</span>
                <strong><CurrencyDisplay amount={selectedRow.rent} showZero={false} /></strong>
                <span className="text-muted small">{selectedRow.utilitiesIncluded ? 'Listrik & air termasuk' : 'Listrik & air meteran'}</span>
              </div>
            )}
            <div className="d-flex gap-2 flex-wrap align-items-center">
              {availability.canBook ? (
                <button type="button" className="btn btn-primary btn-lg room-detail-cta-main" onClick={handleBook}>
                  Booking Kamar Ini
                </button>
              ) : (
                <a className="btn btn-warning btn-lg room-detail-cta-main" href={buildRoomWaUrl(room.code || `Kamar #${room.id}`)} target="_blank" rel="noreferrer">
                  💬 Tanya Ketersediaan via WhatsApp
                </a>
              )}
              {availability.canBook && (
                <a className="btn btn-outline-secondary" href={buildRoomWaUrl(room.code || `Kamar #${room.id}`)} target="_blank" rel="noreferrer">💬 Tanya via WhatsApp</a>
              )}
            </div>
          </div>
        )}

        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="warning">Kamar tidak ditemukan / tidak tersedia saat ini. <Link to="/rooms">Lihat katalog kamar</Link> atau <a href="https://wa.me/6285648887628">hubungi admin via WhatsApp</a>.</Alert> : null}
        {!query.isLoading && !query.isError && !room ? <EmptyState icon="🛏️" title="Kamar tidak tersedia" description="Kamar ini mungkin sedang diisi. Lihat katalog kamar atau hubungi admin via WhatsApp." /> : null}

        {room ? (
          <>
            <Row className="g-4 align-items-start">
              <Col lg={8}>
                <div className="d-grid gap-4">
                  <Card className="content-card border-0 room-detail-section-card">
                    <Card.Body>
                      <RoomImageBlock room={room} />
                    </Card.Body>
                  </Card>

                  <Card className="content-card border-0 room-detail-section-card">
                    <Card.Body>
                      <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
                        <div>
                          <h2 className="room-detail-section-title">Spesifikasi kamar</h2>
                          <p className="room-detail-section-subtitle mb-0">Informasi utama yang biasanya paling menentukan sebelum memilih kamar.</p>
                        </div>
                        <StatusBadge status={room.status} customLabel={availability?.label} />
                      </div>

                      <div className="room-detail-feature-grid mb-3">
                        <DetailFeatureCard {...getFeature(room, 'bathroom')} />
                        <DetailFeatureCard {...getFeature(room, 'cooling')} />
                        <DetailFeatureCard {...getFeature(room, 'size')} />
                        <DetailFeatureCard icon="🛡️" label="Deposit jaminan" value={room.defaultDepositRupiah ? `{formatRupiah(room.defaultDepositRupiah)}` : 'Tanya admin'} />
                      </div>

                      <div className="room-detail-amenities" aria-label="Fasilitas kamar">
                        {getVisibleAmenities(room).map((name) => <span key={name}>{name}</span>)}
                      </div>

                      <Alert variant="light" className="room-detail-clean-note mt-3 mb-0">
                        {getBusinessHighlight(room)}
                      </Alert>

                      {/* R-04: DP dan deposit eksplisit */}
                      {(() => {
                        // INFO: preview DP pakai tarif bulanan (raw monthly); form booking pakai term+surcharge (akurat)
                        const monthlyRent = getTermRent(room, 'MONTHLY');
                        const dpAmount = monthlyRent > 0 ? Math.round(monthlyRent * DP_RATIO) : 0;
                        const depositAmount = Number(room.defaultDepositRupiah ?? 0);
                        return (
                          <div className="room-detail-dp-deposit-info mt-3">
                            {dpAmount > 0 && (
                              <div className="room-detail-dp-row">
                                <span aria-hidden="true">📋</span>
                                <div>
                                  <strong>DP awal: {formatRupiah(dpAmount)}</strong>
                                  <span>Dibayar saat booking dikonfirmasi. Hangus jika dibatalkan.</span>
                                </div>
                              </div>
                            )}
                            {depositAmount > 0 && (
                              <div className="room-detail-deposit-row">
                                <span aria-hidden="true">🛡️</span>
                                <div>
                                  <em>Deposit jaminan: {formatRupiah(depositAmount)}</em>
                                  <span>Dikembalikan penuh saat checkout (refundable).</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </Card.Body>
                  </Card>

                  <Card className="content-card border-0 room-detail-section-card">
                    <Card.Body>
                      <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
                        <div>
                          <h2 className="room-detail-section-title">Daftar tarif lengkap</h2>
                          <p className="room-detail-section-subtitle mb-0">Pilih masa sewa.</p>
                        </div>
                        <Badge className="room-detail-popular-badge">Bulanan biasanya paling populer</Badge>
                      </div>

                      <Table responsive className="room-detail-rate-table mb-0">
                        <thead>
                          <tr>
                            <th>Jenis masa sewa</th>
                            <th className="text-end">Tarif</th>
                            <th>Listrik & air</th>
                          </tr>
                        </thead>
                        <tbody>
                          {termRows.map((row) => {
                            const isActive = row.term === effectiveTerm;
                            return (
                              <tr key={row.term} className={isActive ? 'is-active' : row.term === 'MONTHLY' ? 'is-recommended' : ''}>
                                <td>
                                  <button type="button" onClick={() => setSelectedTerm(row.term)} className="room-detail-rate-term-button">
                                    {row.label}
                                  </button>
                                </td>
                                <td className="text-end fw-semibold"><CurrencyDisplay amount={row.rent} showZero={false} /></td>
                                <td>
                                  <span className={`room-detail-utility-badge ${row.utilitiesIncluded ? 'included' : 'metered'}`}>
                                    {row.utilitiesIncluded ? 'Termasuk' : 'Meteran terpisah'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>

                      <Alert variant="light" className="room-detail-disclaimer mt-3 mb-0">
                        Estimasi awal: sewa pertama <strong><CurrencyDisplay amount={initialCost.rent} showZero={false} /></strong> + deposit jaminan <strong><CurrencyDisplay amount={initialCost.deposit} showZero={false} /></strong> = <strong><CurrencyDisplay amount={initialCost.total} showZero={false} /></strong>.
                      </Alert>
                    </Card.Body>
                  </Card>

                  <Accordion className="room-detail-booking-accordion" defaultActiveKey="booking">
                    <Accordion.Item eventKey="booking">
                      <Accordion.Header>Cara booking aman</Accordion.Header>
                      <Accordion.Body>
                        <Alert variant="info" className="small mb-3">
                          <strong>Booking belum mengunci kamar.</strong> Kamar aman setelah pembayaran disetujui.
                        </Alert>
                        <div className="booking-stepper-lite booking-stepper-five">
                          {publicBookingSafetySteps.map((step, index) => (
                            <div key={step}><strong>{index + 1}. {step.split(' ').slice(0, 3).join(' ')}</strong><span>{step}</span></div>
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </div>
              </Col>

              <Col lg={4}>
                <Card className="content-card border-0 room-detail-booking-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div>
                        <div className="room-detail-booking-label">Kamar dipilih</div>
                        <h2>{room.name || `Kamar ${room.code}`}</h2>
                        <div className="text-muted small">{room.code}</div>
                      </div>
                      <StatusBadge status={room.status} customLabel={availability?.label} />
                    </div>

                    <div className="room-detail-term-selector" aria-label="Pilih term sewa">
                      <div className="room-detail-booking-label mb-2">Term tersedia</div>
                      <div className="d-flex flex-wrap gap-2">
                        {termRows.map((row) => (
                          <button
                            key={row.term}
                            type="button"
                            className={`room-detail-term-pill ${row.term === effectiveTerm ? 'active' : ''}`}
                            onClick={() => setSelectedTerm(row.term)}
                          >
                            {row.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="room-detail-selected-price">
                      <span>{selectedRow?.label ?? 'Tarif'}</span>
                      <strong><CurrencyDisplay amount={selectedRow?.rent ?? 0} showZero={false} /></strong>
                      <small>{selectedRow?.utilitiesIncluded ? 'Listrik & air termasuk.' : 'Listrik & air pakai meter.'}</small>
                    </div>

                    <Alert variant={availability?.canBook ? 'info' : 'secondary'} className="small room-detail-booking-safety-alert">
                      <strong>{availability?.label}:</strong> {availability?.detailCopy}
                    </Alert>

                    <div className="room-detail-booking-summary">
                      <div><span>Sewa pertama</span><strong><CurrencyDisplay amount={initialCost.rent} showZero={false} /></strong></div>
                      <div><span>Deposit jaminan</span><strong><CurrencyDisplay amount={initialCost.deposit} showZero={false} /></strong></div>
                      <div><span>Total awal</span><strong><CurrencyDisplay amount={initialCost.total} showZero={false} /></strong></div>
                      <div><span>Kamar mandi</span><strong>{getBathroomType(room)}</strong></div>
                      <div><span>Pendingin</span><strong>{getCoolingType(room)}</strong></div>
                    </div>

                    <div className="d-grid gap-2 mt-3">
                      {availability?.canBook ? (
                        <Button size="lg" onClick={handleBook}>Ajukan Booking</Button>
                      ) : null}
                      <a className="btn btn-outline-secondary" href={buildRoomWaUrl(room.code || `Kamar #${room.id}`)} target="_blank" rel="noreferrer">💬 {availability?.canBook ? 'Tanya via WhatsApp' : 'Tanya Ketersediaan'}</a>
                    </div>
                  </Card.Body>
                </Card>

                <Kost48OfficialInfoCard variant="detail" compact />
              </Col>
            </Row>

            {/* R-03: Mobile sticky CTA — tampil hanya di mobile, full-width */}
            <div className="room-detail-mobile-sticky d-md-none">
              <div>
                <span>{selectedRow?.label ?? 'Tarif'}</span>
                <strong><CurrencyDisplay amount={selectedRow?.rent ?? 0} showZero={false} /></strong>
              </div>
              {availability?.canBook ? (
                <Button onClick={handleBook}>Booking Kamar Ini</Button>
              ) : (
                <a className="btn btn-warning" href={buildRoomWaUrl(room.code || `Kamar #${room.id}`)} target="_blank" rel="noreferrer">💬 Tanya via WhatsApp</a>
              )}
            </div>
          </>
        ) : null}
      </Container>
    </div>
  );
}
