import { Button, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import FacilityList from './FacilityList';
import type { PublicRoom } from '../../types';
import { getPublicRoomAvailabilityDisplay, getPublicRoomInitialCostEstimate } from '../../utils/publicRoomDisplay';

function buildWaInterestUrl(room: PublicRoom) {
  const number = String(import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '').replace(/\D/g, '');
  const roomCode = room.code || `Kamar #${room.id}`;
  const message = `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Kapan kira-kira kamar ini bisa tersedia?`;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

interface RoomComparePanelProps {
  rooms: PublicRoom[];
  onClear: () => void;
}

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
  ]
    .map(normalizeText)
    .join(' ');
}

function getBathroomLabel(room: PublicRoom) {
  return /km\s*dalam|kamar mandi dalam|mandi dalam|private bathroom|bathroom dalam|toilet dalam/.test(allRoomText(room))
    ? 'Kamar mandi dalam'
    : 'Kamar mandi luar';
}

function getCoolingLabel(room: PublicRoom) {
  return /\bac\b|air conditioner|pendingin ruangan/.test(allRoomText(room)) ? 'AC' : 'Kipas angin';
}

function getSizeLabel(room: PublicRoom) {
  return /besar|large|deluxe|luas|vip|premium|superior/.test(allRoomText(room)) ? 'Besar' : 'Standar';
}

function priceAmount(room: PublicRoom, key: 'monthlyRateRupiah' | 'weeklyRateRupiah' | 'dailyRateRupiah') {
  return Number(room.pricing?.[key] ?? 0);
}

export default function RoomComparePanel({ rooms, onClear }: RoomComparePanelProps) {
  const navigate = useNavigate();

  if (!rooms.length) return null;

  return (
    <Card className="content-card room-market-compare-panel border-0 mt-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h5 className="mb-1">Bandingkan kamar pilihan</h5>
            <p className="text-muted mb-0 small">Bandingkan estimasi awal dan fasilitas utama.</p>
          </div>
          <Button variant="outline-secondary" size="sm" onClick={onClear}>
            Bersihkan pilihan
          </Button>
        </div>
        <div className="table-responsive">
          <Table bordered size="sm" className="mb-0 compare-table room-market-compare-table">
            <thead>
              <tr>
                <th className="text-muted">Yang dibandingkan</th>
                {rooms.map((room, index) => (
                  <th key={room.id} className="text-center">
                    Pilihan {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-muted">Status booking</td>
                {rooms.map((room) => {
                  const availability = getPublicRoomAvailabilityDisplay(room);
                  return <td key={room.id} className="text-center fw-semibold">{availability.label}</td>;
                })}
              </tr>
              <tr>
                <td className="text-muted">Harga bulanan</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center fw-semibold">
                    <CurrencyDisplay amount={priceAmount(room, 'monthlyRateRupiah')} showZero={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Harga mingguan</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <CurrencyDisplay amount={priceAmount(room, 'weeklyRateRupiah')} showZero={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Harga harian</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <CurrencyDisplay amount={priceAmount(room, 'dailyRateRupiah')} showZero={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Deposit</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Estimasi awal</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center fw-semibold">
                    <CurrencyDisplay amount={getPublicRoomInitialCostEstimate(room, 'MONTHLY').total} showZero={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Kamar mandi</td>
                {rooms.map((room) => <td key={room.id} className="text-center">{getBathroomLabel(room)}</td>)}
              </tr>
              <tr>
                <td className="text-muted">Pendingin</td>
                {rooms.map((room) => <td key={room.id} className="text-center">{getCoolingLabel(room)}</td>)}
              </tr>
              <tr>
                <td className="text-muted">Ukuran</td>
                {rooms.map((room) => <td key={room.id} className="text-center">{getSizeLabel(room)}</td>)}
              </tr>
              <tr>
                <td className="text-muted">Fasilitas lain</td>
                {rooms.map((room) => (
                  <td key={room.id}>
                    <FacilityList
                      facilities={room.facilities ?? []}
                      compact
                      maxItems={4}
                      emptyMessage="Belum ada data fasilitas"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Aksi</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    {room.isAvailable !== false ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/booking/${room.id}`, { state: { room } })}
                      >
                        Ajukan
                      </Button>
                    ) : (
                      <a
                        href={buildWaInterestUrl(room)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Tanya ketersediaan
                      </a>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
