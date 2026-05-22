import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Breadcrumb, Button, Card, Form, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createResource, getResource, listResource } from '../../api/resources';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { uploadTicketImage, type UploadedImageMeta } from '../../api/mediaUploads';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MeterTab from '../../components/stays/MeterTab';
import StaffInventoryStatusModal from '../../components/staff/StaffInventoryStatusModal';
import FacilityManager from '../../components/rooms/FacilityManager';
import { useAuth } from '../../context/AuthContext';
import type { Room, RoomItem, Stay } from '../../types';

function formatValue(value?: string | null) {
  return value && value.trim() ? value : '-';
}


const ROOM_ITEM_PROBLEM_STATUSES = new Set(['DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK', 'MAINTENANCE']);

function simpleRoomItemNote(note?: string | null) {
  if (!note) return '-';
  const staffLine = note.split('\n').find((line) => line.toLowerCase().includes('catatan staff:'));
  if (staffLine) return staffLine.replace(/catatan staff:/i, '').trim() || '-';
  const fieldLine = note.split('\n').find((line) => line.toLowerCase().includes('update lapangan:'));
  if (fieldLine) return fieldLine.replace(/update lapangan:/i, '').trim() || '-';
  return note.split('\n')[0] || '-';
}

function problemRoomItemCount(items: RoomItem[]) {
  return items.filter((item) => ROOM_ITEM_PROBLEM_STATUSES.has(String(item.status ?? '').toUpperCase())).length;
}

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

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const roomId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomItem, setSelectedRoomItem] = useState<RoomItem | null>(null);
  const [roomCondition, setRoomCondition] = useState('Perlu dicek admin');
  const [roomConditionNote, setRoomConditionNote] = useState('');
  const [roomConditionPhoto, setRoomConditionPhoto] = useState<UploadedImageMeta | null>(null);
  const [roomConditionPreview, setRoomConditionPreview] = useState('');
  const [roomConditionMessage, setRoomConditionMessage] = useState('');

  const roomQuery = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getResource<Room>(`/rooms/${roomId}`),
    enabled: Number.isFinite(roomId),
  });

  const roomItemsQuery = useQuery({
    queryKey: ['room', roomId, 'room-items'],
    queryFn: () => listResource<RoomItem>('/room-items', { roomId, limit: 100 }),
    enabled: Number.isFinite(roomId),
  });

  const activeStayQuery = useQuery({
    queryKey: ['room', roomId, 'active-stay'],
    queryFn: () => listResource<Stay>('/stays', { roomId, status: 'ACTIVE', limit: 5 }),
    enabled: Number.isFinite(roomId),
  });

  const meterQuery = useQuery({
    queryKey: ['room', roomId, 'meter-readings'],
    queryFn: () => getMeterReadingsByRoom(roomId),
    enabled: Number.isFinite(roomId),
  });

  const roomConditionMutation = useMutation({
    mutationFn: () => createResource('/tickets', {
      roomId,
      title: `Catatan kamar - ${room?.code ?? roomId}`,
      description: `Catatan Kondisi Kamar\nKamar: ${room?.code ?? roomId}\nKondisi: ${roomCondition}\nCatatan: ${roomConditionNote.trim() || '-'}`,
      category: 'CEK_KAMAR',
      issueImageUrl: roomConditionPhoto?.fileUrl,
      issueImageFileKey: roomConditionPhoto?.fileKey,
      issueImageOriginalFilename: roomConditionPhoto?.originalFilename,
      issueImageMimeType: roomConditionPhoto?.mimeType,
      issueImageFileSizeBytes: roomConditionPhoto?.fileSizeBytes,
    }),
    onSuccess: async () => {
      setRoomConditionMessage('Catatan kamar berhasil dikirim ke admin.');
      setRoomConditionNote('');
      setRoomConditionPhoto(null);
      setRoomConditionPreview('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-evidence'] }),
      ]);
    },
  });

  const handleRoomConditionPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadTicketImage(file);
    setRoomConditionPhoto(uploaded);
    setRoomConditionPreview(uploaded.fileUrl);
    event.target.value = '';
  };

  const room = roomQuery.data;
  const activeStay = room?.currentStay ?? activeStayQuery.data?.items?.[0] ?? null;
  const roomItems = roomItemsQuery.data?.items ?? [];
  const readings = meterQuery.data ?? [];
  const isStaff = user?.role === 'STAFF';
  const staffProblemCount = problemRoomItemCount(roomItems);

  const totalInventoryQty = useMemo(
    () => roomItems.reduce((sum, item) => sum + Number(item.qty ?? 0), 0),
    [roomItems],
  );

  if (roomQuery.isLoading) {
    return <div className="py-5 text-center"><Spinner animation="border" /></div>;
  }

  if (roomQuery.isError || !room) {
    return <Alert variant="danger">Gagal memuat detail kamar.</Alert>;
  }

  return (
    <div className={isStaff ? 'staff-simple-mode' : undefined}>
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Beranda</Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/rooms' }}>Kamar</Breadcrumb.Item>
        <Breadcrumb.Item active>{room.code}</Breadcrumb.Item>
      </Breadcrumb>

      {isStaff ? (
        <section className="staff-room-detail-hero">
          <div>
            <span className="staff-hero-pill">Kamar</span>
            <h1>{room.code} · {room.name || 'Kamar'}</h1>
            <p>{staffRoomStatusLabel(room.status)} · Lantai {formatValue(room.floor)} · {staffProblemCount ? `${staffProblemCount} barang perlu dicek` : 'tidak ada masalah barang tercatat'}</p>
          </div>
          <div className="staff-room-detail-badges">
            <StatusBadge status={room.status} customLabel={staffRoomStatusLabel(room.status)} />
            {staffProblemCount ? <Badge bg="danger">{staffProblemCount} perlu cek</Badge> : <Badge bg="success">Barang aman</Badge>}
          </div>
        </section>
      ) : (
        <>
          <PageHeader
            eyebrow="Detail Kamar"
            title={`${room.code}${room.name ? ` · ${room.name}` : ''}`}
            description={`Lantai ${formatValue(room.floor)} · Status kamar: ${room.status}`}
          />

          <Card className="detail-hero border-0 mb-4">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <StatusBadge status={room.status} />
                  <StatusBadge status={room.isActive === false ? 'INACTIVE' : 'ACTIVE'} customLabel={room.isActive === false ? 'Data nonaktif' : 'Data aktif'} />
                </div>
                {activeStay ? (
                  <Button variant="outline-primary" onClick={() => navigate(`/stays/${activeStay.id}`)}>
                    Lihat Penghuni
                  </Button>
                ) : null}
              </div>

              <div className="metric-grid">
                <div className="metric-tile">
                  <div className="metric-tile-label">Tarif bulanan</div>
                  <div className="metric-tile-value"><CurrencyDisplay amount={room.monthlyRateRupiah} /></div>
                </div>
                <div className="metric-tile">
                  <div className="metric-tile-label">Deposit default</div>
                  <div className="metric-tile-value"><CurrencyDisplay amount={room.defaultDepositRupiah} /></div>
                </div>
                <div className="metric-tile">
                  <div className="metric-tile-label">Barang kamar</div>
                  <div className="metric-tile-value">{totalInventoryQty}</div>
                </div>
                <div className="metric-tile">
                  <div className="metric-tile-label">Penghuni aktif</div>
                  <div className="metric-tile-value">{activeStay?.tenant?.fullName ?? 'Kosong'}</div>
                </div>
                <div className="metric-tile">
                  <div className="metric-tile-label">Lantai</div>
                  <div className="metric-tile-value">{formatValue(room.floor)}</div>
                </div>
                <div className="metric-tile">
                  <div className="metric-tile-label">Status</div>
                  <div className="metric-tile-value">{room.status}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      <Tabs defaultActiveKey={isStaff ? 'summary' : 'info'} className={isStaff ? 'mb-3 staff-room-tabs' : 'mb-3'}>
        <Tab eventKey={isStaff ? 'summary' : 'info'} title={isStaff ? 'Ringkasan' : 'Informasi'}>
          <div className="pt-3">
            <Card className="content-card border-0">
              <Card.Body>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="text-muted small">Kode kamar</div>
                    <div className="fw-semibold mb-3">{room.code}</div>
                    <div className="text-muted small">Nama kamar</div>
                    <div className="fw-semibold mb-3">{formatValue(room.name)}</div>
                    <div className="text-muted small">Lantai</div>
                    <div className="fw-semibold">{formatValue(room.floor)}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted small">Penghuni aktif</div>
                    <div className="fw-semibold mb-3">{activeStay?.tenant?.fullName ?? 'Tidak ada'}</div>
                    {isStaff ? (
                      <>
                        <div className="text-muted small">Yang perlu dicek</div>
                        <div className="fw-semibold mb-3">Update barang kamar, kondisi kamar, dan meter</div>
                        <div className="text-muted small">Catatan kerja</div>
                        <div className="fw-semibold">Untuk barang kamar, buka tab Barang lalu klik Laporkan kondisi.</div>
                      </>
                    ) : (
                      <>
                        <div className="text-muted small">Tarif listrik / kWh</div>
                        <div className="fw-semibold mb-3"><CurrencyDisplay amount={room.electricityTariffPerKwhRupiah} /></div>
                        <div className="text-muted small">Tarif air / m³</div>
                        <div className="fw-semibold"><CurrencyDisplay amount={room.waterTariffPerM3Rupiah} /></div>
                      </>
                    )}
                  </div>
                </div>
                {room.notes ? (
                  <Alert variant="light" className="mt-4 mb-0">
                    <strong>Catatan kamar:</strong> {room.notes}
                  </Alert>
                ) : null}
              </Card.Body>
            </Card>
          </div>
        </Tab>

        <Tab eventKey="inventory" title={isStaff ? `Barang Kamar (${roomItems.length})` : `Inventaris (${roomItems.length})`}>
          <div className="pt-3">
            <Card className="content-card border-0">
              <Card.Body>
                {isStaff ? (
                  <div className="staff-section-heading mb-3">
                    <div className="eyebrow mb-1">Laporkan Barang Kamar</div>
                    <h6 className="mb-1">Laporkan barang kamar yang rusak, hilang, atau perlu diperbaiki</h6>
                    <div className="text-muted small">Laporan masuk ke admin. Status final barang tetap dikonfirmasi admin/owner.</div>
                  </div>
                ) : null}
                {roomItemsQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
                {roomItemsQuery.isError ? <Alert variant="danger">Gagal memuat barang kamar.</Alert> : null}
                {!roomItemsQuery.isLoading && !roomItemsQuery.isError && !roomItems.length ? (
                  <Alert variant="secondary" className="mb-0">Belum ada inventaris yang terpasang pada kamar ini.</Alert>
                ) : null}
                {!!roomItems.length ? (
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>Barang</th>
                        <th>Jumlah</th>
                        <th>Status</th>
                        <th>Catatan</th>
                        {isStaff ? <th>Aksi</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {roomItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-semibold">{item.item?.name ?? `Barang #${item.itemId}`}</div>
                            <div className="small text-muted">{item.item?.sku ?? `ID ${item.itemId}`}</div>
                          </td>
                          <td>{Number(item.qty ?? 0)}</td>
                          <td><StatusBadge status={item.status ?? 'SECONDARY'} /></td>
                          <td>{isStaff ? simpleRoomItemNote(item.note) : (item.note ?? '-')}</td>
                          {isStaff ? <td><Button size="sm" variant="outline-primary" onClick={() => setSelectedRoomItem(item)}>Laporkan</Button></td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
              </Card.Body>
            </Card>
          </div>
        </Tab>

        {!isStaff ? (
          <Tab eventKey="facilities" title={<><span className="me-2">🛋️</span>Fasilitas</>}>
            <div className="pt-3">
            <FacilityManager roomId={roomId} allowedToManage={user?.role !== 'STAFF'} />
            </div>
          </Tab>
        ) : null}

        <Tab eventKey="meter" title={isStaff ? "Meter" : "Meteran"}>
          <div className="pt-3">
            <MeterTab
              stay={{
                id: activeStay?.id ?? 0,
                roomId,
                tenantId: activeStay?.tenantId ?? 0,
                status: activeStay?.status ?? 'ACTIVE',
                room,
                tenant: activeStay?.tenant,
              }}
              readings={readings}
              isLoading={meterQuery.isLoading}
              isError={meterQuery.isError}
              simpleMode={isStaff}
            />
          </div>
        </Tab>

        {isStaff ? (
          <Tab eventKey="notes" title="Catatan Kamar">
            <div className="pt-3">
              <Card className="content-card border-0">
                <Card.Body>
                  <div className="staff-section-heading mb-3">
                    <div className="eyebrow mb-1">Catatan Kamar</div>
                    <h6 className="mb-1">Catat kondisi kamar dari sini.</h6>
                    <div className="text-muted small">Pilih kondisi, tulis catatan singkat, lalu kirim. Admin akan menerima laporan untuk dicek.</div>
                  </div>

                  {roomConditionMessage ? <Alert variant="success" className="py-2">{roomConditionMessage}</Alert> : null}
                  {roomConditionMutation.isError ? <Alert variant="danger" className="py-2">Catatan kamar belum terkirim. Coba sekali lagi.</Alert> : null}

                  <div className="staff-room-condition-form">
                    <Form.Group>
                      <Form.Label>Kondisi kamar</Form.Label>
                      <Form.Select value={roomCondition} onChange={(event) => setRoomCondition(event.currentTarget.value)}>
                        <option>Siap huni</option>
                        <option>Perlu dibersihkan</option>
                        <option>Ada kerusakan ringan</option>
                        <option>Ada kerusakan berat</option>
                        <option>Perlu dicek admin</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Catatan</Form.Label>
                      <Form.Control as="textarea" rows={3} value={roomConditionNote} onChange={(event) => setRoomConditionNote(event.currentTarget.value)} placeholder="Contoh: kamar perlu dibersihkan sebelum dihuni lagi" />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Foto pendukung</Form.Label>
                      <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleRoomConditionPhoto} />
                      {roomConditionPreview ? <img className="staff-proof-preview" src={roomConditionPreview} alt="Foto kondisi kamar" /> : null}
                    </Form.Group>
                    <Button onClick={() => roomConditionMutation.mutate()} disabled={roomConditionMutation.isPending || !roomConditionNote.trim()}>
                      {roomConditionMutation.isPending ? 'Mengirim...' : 'Kirim catatan kamar'}
                    </Button>
                  </div>

                  <Alert variant="light" className="border mt-3 mb-0">
                    <strong>Catatan lama:</strong> {room.notes || 'Belum ada catatan khusus.'}
                  </Alert>
                </Card.Body>
              </Card>
            </div>
          </Tab>
        ) : null}
      </Tabs>
      <StaffInventoryStatusModal
        show={Boolean(selectedRoomItem)}
        target={selectedRoomItem ? { type: 'room-item', item: selectedRoomItem } : null}
        onHide={() => setSelectedRoomItem(null)}
        onSaved={async () => {
          await roomItemsQuery.refetch();
        }}
      />
    </div>
  );
}
