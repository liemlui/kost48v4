import { useEffect, useMemo, useState } from 'react';
import { Alert, Card } from 'react-bootstrap';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge from '../../components/common/StatusBadge';
import type { PublicRoom } from '../../types';
import { isUtilitiesIncludedForPricingTerm } from '../../utils/pricing';
import { getKost48RoomGallery, resolveKost48MarketingImageUrl } from '../../data/kost48Assets';
import {
  getPublicRoomBathroomSentence,
  getPublicRoomBusinessHighlight,
  getPublicRoomCoolingSentence,
  getPublicRoomInitialCostEstimate,
  getPublicRoomUtilityCopy,
  getPublicRoomAvailabilityDisplay,
  getPublicRoomVisibleAmenities,
} from '../../utils/publicRoomDisplay';
import type { GuestBookingFormState } from './guestBookingUtils';

interface GuestBookingRoomSummaryProps {
  room: PublicRoom;
  form: GuestBookingFormState;
  selectedRate: string | null;
  initialTotal: number;
}

function GuestRoomPhoto({ room }: { room: PublicRoom }) {
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 5), [room.code, room.name]);
  const apiGallery = useMemo(
    () => (room.images ?? []).map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [room.images],
  );
  const candidateImages = useMemo(() => Array.from(new Set([...localGallery, ...apiGallery])), [localGallery, apiGallery]);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedImages = candidateImages.filter((imageUrl) => !failedImages.has(imageUrl));
  const cover = resolvedImages.length ? resolvedImages[activeIndex % resolvedImages.length] : null;

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages(new Set());
  }, [room.id, candidateImages.join('|')]);

  useEffect(() => {
    if (resolvedImages.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % resolvedImages.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [resolvedImages.length]);

  const markImageFailed = (imageUrl: string) => {
    setFailedImages((previous) => {
      if (previous.has(imageUrl)) return previous;
      const next = new Set(previous);
      next.add(imageUrl);
      return next;
    });
  };

  return (
    <div className={cover ? 'booking-room-photo-strip compact' : 'booking-room-photo-empty compact'}>
      {cover ? (
        <img
          key={cover}
          src={cover}
          alt={`Foto utama kamar ${room.code}`}
          onError={() => markImageFailed(cover)}
        />
      ) : (
        <>
          <span>K48</span>
          <strong>Foto kamar menyusul</strong>
        </>
      )}
    </div>
  );
}

export default function GuestBookingRoomSummary({ room, form, selectedRate, initialTotal }: GuestBookingRoomSummaryProps) {
  const utilityCopy = getPublicRoomUtilityCopy(room, form.pricingTerm);
  const availability = getPublicRoomAvailabilityDisplay(room);
  const initialCost = getPublicRoomInitialCostEstimate(room, form.pricingTerm);

  return (
    <Card className="content-card border-0 h-100 tenant-booking-room-summary">
      <Card.Body>
        <GuestRoomPhoto room={room} />

        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <div className="fw-semibold fs-4">{room.code}</div>
            <div className="text-muted">{room.name || 'Kamar KOST48 Surabaya'}</div>
          </div>
          <StatusBadge status={room.status} customLabel={availability.label} />
        </div>

        <div className="booking-room-feature-grid mb-3">
          <div className="booking-room-feature-card">
            <span>Kamar mandi</span>
            <strong>{getPublicRoomBathroomSentence(room)}</strong>
          </div>
          <div className="booking-room-feature-card">
            <span>Pendingin</span>
            <strong>{getPublicRoomCoolingSentence(room)}</strong>
          </div>
        </div>

        <div className="booking-room-estimate-box mb-3">
          <div className="small text-muted mb-1">Estimasi tagihan awal</div>
          <div className="fs-4 fw-bold"><CurrencyDisplay amount={initialTotal || initialCost.total} /></div>
          <div className="booking-room-estimate-lines">
            <span>Sewa pertama <strong><CurrencyDisplay amount={selectedRate || initialCost.rent} showZero={false} /></strong></span>
            <span>Deposit jaminan <strong><CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></strong></span>
          </div>
          {/* Audit U-09: kebijakan DP 30% (A18) — kamar bisa diamankan tanpa dana penuh. */}
          <div className="small text-success mt-2">
            Amankan kamar cukup dengan DP 30%:{' '}
            <strong><CurrencyDisplay amount={Math.round(Number(selectedRate || initialCost.rent) * 0.3)} showZero={false} /></strong>
            {' '}— pelunasan sisa sewa + jaminan saat check-in.
          </div>
        </div>

        <Alert variant="info" className="small booking-room-safety-alert">
          <strong>{availability.label}.</strong> Kamar aman setelah pembayaran disetujui.
        </Alert>

        <div className="booking-room-utility-box mb-3">
          <div>
            <strong>{utilityCopy.title}</strong>
            <p>{utilityCopy.description}</p>
            {isUtilitiesIncludedForPricingTerm(form.pricingTerm) ? <small>Utilitas termasuk.</small> : null}
          </div>
        </div>

        <div className="room-market-amenities mb-3" aria-label="Fasilitas utama kamar">
          {getPublicRoomVisibleAmenities(room, 5).map((name) => <span key={name}>{name}</span>)}
        </div>

        <Alert variant="light" className="mb-0 booking-room-note">
          {getPublicRoomBusinessHighlight(room)}
        </Alert>
      </Card.Body>
    </Card>
  );
}
