import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { PublicRoom } from '../../types';
import { buildAdminWaUrl } from '../../utils/whatsapp';
import { getPublicRoomAvailabilityDisplay } from '../../utils/publicRoomDisplay';

export type BookingCtaVariant = 'primary' | 'compact' | 'wa-only';

type BookingCtaButtonProps = {
  room: PublicRoom;
  /** Is this a tenant making the booking? Affects the booking URL */
  isTenant?: boolean;
  /** When true, "Ajukan Booking" opens WA instead of booking form */
  bookViaWA?: boolean;
  /** Custom WA message */
  waMessage?: string;
  /** Visual variant */
  variant?: BookingCtaVariant;
  /** Additional className */
  className?: string;
  /** Override canBook status (default from availability display) */
  canBookOverride?: boolean;
  /** Custom book label */
  bookLabel?: string;
};

/**
 * P7-01: Komponen CTA booking reusable — tombol Ajukan Booking / Tanya via WA.
 * Dipakai di RoomCard dan RoomPreviewCard agar konsisten.
 */
export default function BookingCtaButton({
  room,
  isTenant = false,
  bookViaWA = false,
  waMessage,
  variant = 'primary',
  className,
  canBookOverride,
  bookLabel = 'Ajukan Booking',
}: BookingCtaButtonProps) {
  const navigate = useNavigate();
  const avail = getPublicRoomAvailabilityDisplay(room);
  const canBook = canBookOverride ?? avail.canBook;

  const waUrl = buildAdminWaUrl(
    waMessage ?? `Halo Admin KOST48, saya tertarik dengan kamar ${room.code || `#${room.id}`}.`,
  );

  const goBook = () => {
    const path = isTenant ? `/portal/booking/${room.id}` : `/booking/${room.id}`;
    navigate(path, { state: { room } });
  };

  if (variant === 'wa-only') {
    return (
      <a
        className={`btn btn-sm btn-outline-secondary ${className ?? ''}`}
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        💬 {canBook ? 'Tanya via WA' : 'Tanya Ketersediaan'}
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`rm-card-actions ${className ?? ''}`}>
        {canBook && (
          <Button size="sm" className="rm-btn-book" onClick={(e) => { e.stopPropagation(); goBook(); }}>
            {bookViaWA ? '💬 Booking via WA' : bookLabel}
          </Button>
        )}
        <a
          className="btn btn-sm btn-outline-secondary rm-btn-wa"
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          💬 {canBook ? 'Tanya via WA' : 'Tanya Ketersediaan'}
        </a>
      </div>
    );
  }

  // variant === 'primary' — full set for RoomCard (backward compatible)
  return (
    <div className={`rm-card-actions ${className ?? ''}`}>
      {canBook && !bookViaWA && (
        <Button size="sm" className="rm-btn-book" onClick={(e) => { e.stopPropagation(); goBook(); }}>
          {bookLabel}
        </Button>
      )}
      {canBook && bookViaWA && (
        <a
          className="btn btn-sm rm-btn-book rm-btn-book-wa"
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          💬 Booking via WA
        </a>
      )}
      <a
        className="btn btn-sm btn-outline-secondary rm-btn-wa"
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        💬 {canBook ? 'Tanya via WA' : 'Tanya Ketersediaan'}
      </a>
    </div>
  );
}
