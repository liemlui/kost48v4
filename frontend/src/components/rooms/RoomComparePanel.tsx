import { Button, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CurrencyDisplay from '../common/CurrencyDisplay';
import StatusBadge from '../common/StatusBadge';
import FacilityList from './FacilityList';
import type { PublicRoom } from '../../types';

interface RoomComparePanelProps {
  rooms: PublicRoom[];
  onClear: () => void;
}

export default function RoomComparePanel({ rooms, onClear }: RoomComparePanelProps) {
  const navigate = useNavigate();

  if (!rooms.length) return null;

  return (
    <Card className="content-card border-0 mt-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="mb-0">Perbandingan Kamar ({rooms.length}/3)</h5>
          <Button variant="outline-secondary" size="sm" onClick={onClear}>
            Bersihkan Perbandingan
          </Button>
        </div>
        <div className="table-responsive">
          <Table bordered size="sm" className="mb-0 compare-table">
            <thead className="table-light">
              <tr>
                <th className="text-muted">Kamar</th>
                {rooms.map((room) => (
                  <th key={room.id} className="text-center">
                    {room.code}
                    {room.name ? <div className="small text-muted fw-normal">{room.name}</div> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-muted">Tarif Utama</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center fw-semibold">
                    <CurrencyDisplay amount={room.highlightedRateRupiah} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Tarif Bulanan</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <CurrencyDisplay amount={room.pricing?.monthlyRateRupiah ?? 0} showZero={false} />
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
                <td className="text-muted">Lantai</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    {room.floor ?? '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Status</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <StatusBadge status={room.status} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Fasilitas</td>
                {rooms.map((room) => (
                  <td key={room.id}>
                    <FacilityList
                      facilities={room.facilities ?? []}
                      compact
                      maxItems={5}
                      emptyMessage="Belum ada data fasilitas"
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-muted">Aksi</td>
                {rooms.map((room) => (
                  <td key={room.id} className="text-center">
                    <div className="d-flex flex-column gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => navigate(`/rooms/${room.id}/detail`)}
                      >
                        Lihat Detail
                      </Button>
                      {room.isAvailable !== false ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/booking/${room.id}`, { state: { room } })}
                        >
                          Pesan Sekarang
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled>
                          Tidak Tersedia
                        </Button>
                      )}
                    </div>
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