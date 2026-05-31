import { useState } from 'react';
import { Alert, Card } from 'react-bootstrap';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge from '../../components/common/StatusBadge';
import type { PublicRoom } from '../../types';
import { isUtilitiesIncludedForPricingTerm } from '../../utils/pricing';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
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
  const images = (room.images ?? []).map((url) => resolveAbsoluteFileUrl(url)).filter(Boolean) as string[];
  const cover = images[0];
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');
  const showImg = imgState === 'ok';

  return (
    <div className={showImg ? 'booking-room-photo-strip compact' : 'booking-room-photo-empty compact'}>
      {cover ? (
        <img
          src={cover}
          alt={`Foto utama kamar ${room.code}`}
          style={showImg ? {} : { position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          onLoad={() => setImgState('ok')}
          onError={() => setImgState('error')}
        />
      ) : null}
      {!showImg ? (
        <>
          <span>K48</span>
          <strong>Foto kamar menyusul</strong>
        </>
      ) : null}
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
            <span>Deposit awal <strong><CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></strong></span>
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
