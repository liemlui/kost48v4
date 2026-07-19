import PageHeader from '../../components/common/PageHeader';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listResource } from '../../api/resources';
import StatusBadge from '../../components/common/StatusBadge';
import StaffMeterStatusPanel from '../../components/staff/StaffMeterStatusPanel';
import type { Room, RoomItem } from '../../types';

const PROBLEM_STATUSES = new Set(['DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK', 'MAINTENANCE']);

function staffRoomStatusLabel(status?: string | null) {
  switch (status) {
    case 'OCCUPIED': return 'Ada penghuni';
    case 'AVAILABLE': return 'Kosong';
    case 'RESERVED': return 'Dipesan';
    case 'MAINTENANCE': return 'Perlu dicek';
    case 'INACTIVE': return 'Tidak dipakai';
    default: return 'Perlu dicek';
  }
}

function roomIssueItems(roomId: number, items: RoomItem[]) {
  return items.filter((item) => item.roomId === roomId && PROBLEM_STATUSES.has(String(item.status ?? '').toUpperCase()));
}

function roomIssueCount(roomId: number, items: RoomItem[]) {
  return roomIssueItems(roomId, items).length;
}

function roomIssueSummary(roomId: number, items: RoomItem[]) {
  const issues = roomIssueItems(roomId, items);
  const names = issues.map((item) => item.item?.name || `Barang #${item.itemId}`).slice(0, 2);
  if (!names.length) return '';
  const suffix = issues.length > names.length ? ` +${issues.length - names.length} lainnya` : '';
  return `${names.join(', ')}${suffix}`;
}

function roomIssueDetail(roomId: number, items: RoomItem[]) {
  const first = roomIssueItems(roomId, items)[0];
  if (!first) return 'Tidak ada masalah aktif';
  const note = String(first.note || '').split('\n').find(Boolean)?.trim();
  const label = first.item?.name || `Barang #${first.itemId}`;
  return note ? `${label}: ${note}` : `${label} perlu dicek`; 
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
    <div>
      <PageHeader
        eyebrow="Kamar"
        title="Cek Kamar"
        description="Pilih kamar, lalu laporkan kondisi barang kamar, catat meter listrik/air, atau tulis catatan kondisi."
      />
      <div className="staff-page-simple staff-rooms-page">

      {(roomsQuery.isLoading || roomItemsQuery.isLoading) ? <div className="py-5 text-center"><Spinner /> Memuat kamar...</div> : null}
      {roomsQuery.isError ? <Alert variant="danger">Gagal memuat daftar kamar.</Alert> : null}
      {roomItemsQuery.isError ? <Alert variant="warning">Gagal memuat data barang kamar. Jumlah masalah mungkin tidak akurat.</Alert> : null}
      {!roomsQuery.isLoading && !roomsQuery.isError && !sortedRooms.length ? <Alert variant="secondary">Belum ada kamar aktif.</Alert> : null}

      {/* R-21: Tabel meter dipindah ke sini dari dashboard Hari Ini agar mobile lebih ramping */}
      <StaffMeterStatusPanel rooms={rooms} />

      <div className="staff-room-grid">
        {sortedRooms.map((room) => {
          const issueCount = roomIssueCount(room.id, roomItems);
          const issueSummary = roomIssueSummary(room.id, roomItems);
          return (
            <Card
              key={room.id}
              className={`staff-room-card k48-clickable-card border-0 ${issueCount ? 'has-issue' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/rooms/${room.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/rooms/${room.id}`);
                }
              }}
              aria-label={`Buka detail kamar ${room.code}`}
            >
              <Card.Body>
                <div className="staff-room-card-head">
                  <div>
                    <strong>{room.code}</strong>
                    <span>{room.name || 'Kamar'}</span>
                  </div>
                  {issueCount ? <span className="staff-badge staff-badge-danger">{issueCount} perlu cek</span> : <span className="staff-badge staff-badge-success">Aman</span>}
                </div>
                <div className="staff-room-meta">
                  <StatusBadge status={room.status} customLabel={staffRoomStatusLabel(room.status)} />
                  <span>Lantai {room.floor || '-'}</span>
                </div>
                <div className={issueSummary ? 'staff-room-issue-note' : 'staff-room-ok-note'}>
                  <span>{issueSummary || room.status === 'MAINTENANCE' ? 'Perlu dicek' : 'Status kamar'}</span>
                  <strong>{issueSummary || (room.status === 'MAINTENANCE' ? 'Cek setelah checkout / perawatan' : 'Tidak ada masalah aktif')}</strong>
                  <small>{issueSummary ? roomIssueDetail(room.id, roomItems) : room.status === 'MAINTENANCE' ? 'Pastikan kebersihan, kunci, inventaris, dan kondisi kamar sebelum siap ditempati lagi.' : 'Klik kartu untuk buka detail, barang kamar, meter, dan catatan.'}</small>
                </div>
                <div className="staff-room-card-footer">
                  <span> Klik untuk buka detail</span>
                  <strong aria-hidden="true">→</strong>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </div>
    </div>
  );
}
