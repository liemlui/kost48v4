import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getKost48RoomGallery, resolveKost48MarketingImageUrl } from '../../data/kost48Assets';
import {
  getBestPublicRoomRate,
  getPublicRoomAvailabilityDisplay,
  getPublicRoomBathroomLabel,
  getPublicRoomCoolingLabel,
} from '../../utils/publicRoomDisplay';
import type { PublicRoom } from '../../types';
import FacilityList from './FacilityList';
import RoomPriceTable from './RoomPriceTable';
import RoomSpecChips from './RoomSpecChips';
import BookingCtaButton from './BookingCtaButton';

// ── Constants ──────────────────────────────────────────────────────────────
const PRICING_TERM = 'MONTHLY' as const;

// ── Category badge helper ──────────────────────────────────────────────────
export function getCategoryBadgeInfo(room: PublicRoom) {
  const cat = String(room.category ?? '').toUpperCase();
  if (cat === 'DELUXE') return { label: 'Deluxe', icon: '❄️', cls: 'rm-cat-deluxe' };
  if (cat === 'ECONOMY') return { label: 'Ekonomi', icon: '🌬️', cls: 'rm-cat-economy' };
  if (cat === 'STANDARD') return { label: 'Standar', icon: '🚿', cls: 'rm-cat-standard' };
  return null;
}

// ── Room image carousel ────────────────────────────────────────────────────
export function RoomCardImage({ room }: { room: PublicRoom }) {
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 5), [room.code, room.name]);
  const apiGallery = useMemo(
    () => (room.images ?? []).map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [room.images],
  );
  const candidates = useMemo(() => Array.from(new Set([...localGallery, ...apiGallery])), [localGallery, apiGallery]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState(false);

  const resolved = candidates.filter((url) => !failed.has(url));
  const active = resolved.length ? resolved[activeIndex % resolved.length] : null;
  const total = resolved.length;

  useEffect(() => { setActiveIndex(0); setFailed(new Set()); }, [room.id, candidates.join('|')]);
  useEffect(() => { if (activeIndex >= resolved.length) setActiveIndex(0); }, [activeIndex, resolved.length]);

  // Auto-slide hanya saat hover
  useEffect(() => {
    if (total <= 1 || !hovered) return undefined;
    const t = window.setInterval(() => setActiveIndex((i) => (i + 1) % total), 1800);
    return () => clearInterval(t);
  }, [hovered, total]);

  const markFailed = (url: string) => setFailed((prev) => {
    if (prev.has(url)) return prev;
    return new Set([...prev, url]);
  });

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((i) => (i - 1 + total) % total);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((i) => (i + 1) % total);
  };

  return (
    <div
      className={`rm-card-img-wrap${active ? '' : ' rm-card-img-empty'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active ? (
        <img
          key={active}
          src={active}
          alt={`Kamar ${room.code} — ${getPublicRoomCoolingLabel(room)}, kamar mandi ${getPublicRoomBathroomLabel(room)}`}
          className="rm-card-img"
          loading="lazy"
          decoding="async"
          onError={() => markFailed(active)}
        />
      ) : (
        <div className="rm-card-img-placeholder">
          <span>🛏️</span>
          <small>Foto segera hadir</small>
        </div>
      )}
      {total > 1 && hovered && (
        <>
          <button type="button" className="rm-slide-btn rm-slide-prev" onClick={prev} aria-label="Foto sebelumnya">‹</button>
          <button type="button" className="rm-slide-btn rm-slide-next" onClick={next} aria-label="Foto berikutnya">›</button>
        </>
      )}
      {total > 1 && (
        <div className="rm-card-img-dots" aria-hidden="true">
          {resolved.slice(0, 5).map((_, i) => (
            <span key={i} className={i === activeIndex % total ? 'active' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface RoomCardProps {
  room: PublicRoom;
  /** Whether to disable the compare button / hide it entirely */
  isTenant?: boolean;
  isCompared?: boolean;
  compareDisabled?: boolean;
  showCompare?: boolean;
  onToggleCompare?: () => void;
  /** When true, the "Ajukan Booking" button links directly to WA instead of booking form */
  bookViaWA?: boolean;
  /** Custom WA message when booking via WA */
  waMessage?: string;
}

// ── Room card ──────────────────────────────────────────────────────────────
export default function RoomCard({
  room,
  isTenant = false,
  isCompared = false,
  compareDisabled = false,
  showCompare = true,
  onToggleCompare,
  bookViaWA = false,
  waMessage,
}: RoomCardProps) {
  const navigate = useNavigate();
  const avail = getPublicRoomAvailabilityDisplay(room);
  const monthlyRate = room.pricing?.monthlyRateRupiah ?? getBestPublicRoomRate(room, PRICING_TERM) ?? 0;

  const goDetail = () => navigate(`/rooms/${room.id}/detail`, { state: { room } });
  const goBook = () => navigate(isTenant ? `/portal/booking/${room.id}` : `/booking/${room.id}`, { state: { room } });

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    goDetail();
  };
  const catBadge = getCategoryBadgeInfo(room);
  const isMezzanine = String(room.roomType ?? '').toUpperCase() === 'MEZZANINE';

  return (
    <article
      className="rm-card"
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="rm-card-img-shell">
        <RoomCardImage room={room} />
        <span className={`rm-card-badge rm-badge-${avail.tone}`}>{avail.label}</span>
        {(catBadge || isMezzanine) && (
          <span className={`rm-card-cat-badge${catBadge ? ` ${catBadge.cls}` : ''}`}>
            {catBadge && <><span aria-hidden="true">{catBadge.icon}</span> {catBadge.label}</>}
            {isMezzanine && <span className="rm-cat-mezz">Mezzanine</span>}
          </span>
        )}
        {showCompare && (
          <button
            type="button"
            className={`rm-card-compare-btn${isCompared ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleCompare?.(); }}
            disabled={compareDisabled}
            aria-pressed={isCompared}
            aria-label={compareDisabled ? 'Maksimal 3 kamar untuk dibandingkan' : isCompared ? 'Hapus kamar dari perbandingan' : 'Tambah kamar ke perbandingan'}
            title={compareDisabled ? 'Maks. 3 kamar' : isCompared ? 'Hapus dari perbandingan' : 'Bandingkan kamar ini'}
          >
            {isCompared ? '✓' : '+'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="rm-card-body">
        <div className="rm-card-title-row">
          <div>
            <div className="rm-card-code">{room.code || `Kamar ${room.id}`}</div>
            <div className="rm-card-name">{room.name || 'Kamar KOST48 Surabaya'}</div>
          </div>
        </div>

        {/* 4 spec chip: KM, Pendingin, Ukuran, Tipe */}
        <RoomSpecChips room={room} variant="card" />

        <FacilityList
          facilities={room.facilities ?? []}
          compact
          maxItems={3}
          emptyMessage=""
        />

        {/* Tabel harga lengkap semua term */}
        <RoomPriceTable room={room} monthlyRate={monthlyRate} variant="card" />
        {monthlyRate === 0 && <div className="rm-card-price-ask">Hubungi admin untuk tarif</div>}

        <BookingCtaButton
          room={room}
          isTenant={isTenant}
          bookViaWA={bookViaWA}
          waMessage={waMessage}
          variant="primary"
        />
        <button
          type="button"
          className="rm-btn-detail"
          onClick={(e) => { e.stopPropagation(); goDetail(); }}
        >
          Lihat detail →
        </button>
      </div>
    </article>
  );
}
