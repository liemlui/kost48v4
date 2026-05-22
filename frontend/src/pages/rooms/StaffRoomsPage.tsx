import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listResource } from '../../api/resources';
import StatusBadge from '../../components/common/StatusBadge';
import type { Room, RoomItem } from '../../types';

const PROBLEM_STATUSES = new Set(['DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK', 'MAINTENANCE']);

function staffRoomStatusLabel(status?: string | null) {
  switch (status) {
    case 'OCCUPIED': return 'Ada penghuni';
    case 'AVAILABLE': return 'Kosong';
    case 'RESERVED': return 'Dipesan';
    case 'MAINTENANCE': return 'Perlu diperbaiki';
    case 'INACTIVE': return 'Tidak dipakai';
    default: return 'Perlu dicek';
  }
}

function roomIssueCount(roomId: number, items: RoomItem[]) {
  return items.filter((item) => item.roomId === roomId && PROBLEM_STATUSES.has(String(item.status ?? '').toUpperCase())).length;
}

export default function StaffRoomsPage() {
  const navigate = useNavigate();
  const roomsQuery = useQuery({ queryKey: ['staff-rooms-simple'], queryFn: () => listResource<Room>('/rooms', { limit: 300, isActive: 'true' }) });
  const roomItemsQuery = useQuery({ queryKey: ['staff-rooms-simple', 'room-items'], queryFn: () => listResource<RoomItem>('/room-items', { limit: 300 }) });

  const rooms = roomsQuery.data?.items ?? [];
  const roomItems = roomItemsQuery.data?.items ?? [];

  const sortedRooms = useMemo(() => {
    return [...rooms]
      .filter((room) => room.isActive !== false)
      .sort((a, b) => roomIssueCount(b.id, roomItems) - roomIssueCount(a.id, roomItems) || String(a.code).localeCompare(String(b.code)));
  }, [rooms, roomItems]);

  return (
    <div className="staff-page-simple staff-rooms-page">
      <section className="staff-simple-hero compact">
        <span className="staff-hero-pill">Kamar</span>
        <h1>Cek Kamar</h1>
        <p>Pilih kamar, lalu laporkan kondisi barang kamar, catat meter listrik/air, atau tulis catatan kondisi.</p>
      </section>

      {(roomsQuery.isLoading || roomItemsQuery.isLoading) ? <div className="py-5 text-center"><Spinner /> Memuat kamar...</div> : null}
      {roomsQuery.isError ? <Alert variant="danger">Gagal memuat daftar kamar.</Alert> : null}
      {!roomsQuery.isLoading && !roomsQuery.isError && !sortedRooms.length ? <Alert variant="secondary">Belum ada kamar aktif.</Alert> : null}

      <div className="staff-room-grid">
        {sortedRooms.map((room) => {
          const issueCount = roomIssueCount(room.id, roomItems);
          return (
            <Card key={room.id} className={`staff-room-card border-0 ${issueCount ? 'has-issue' : ''}`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <strong>{room.code}</strong>
                    <span>{room.name || 'Kamar'}</span>
                  </div>
                  {issueCount ? <Badge bg="danger">{issueCount} perlu cek</Badge> : <Badge bg="success">Aman</Badge>}
                </div>
                <div className="staff-room-meta">
                  <StatusBadge status={room.status} customLabel={staffRoomStatusLabel(room.status)} />
                  <span>Lantai {room.floor || '-'}</span>
                </div>
                <div className="staff-room-actions">
                  <Button size="sm" variant="primary" onClick={() => navigate(`/rooms/${room.id}`)}>Buka</Button>
                  {issueCount ? <Button size="sm" variant="outline-danger" onClick={() => navigate(`/rooms/${room.id}`)}>Perlu cek</Button> : null}
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
