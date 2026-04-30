import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Breadcrumb, Button, Card, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getResource, listResource } from '../../api/resources';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MeterTab from '../../components/stays/MeterTab';
import FacilityManager from '../../components/rooms/FacilityManager';
import type { Room, RoomItem, Stay } from '../../types';

function formatValue(value?: string | null) {
  return value && value.trim() ? value : '-';
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const roomId = Number(id);

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

  const room = roomQuery.data;
  const activeStay = room?.currentStay ?? activeStayQuery.data?.items?.[0] ?? null;
  const roomItems = roomItemsQuery.data?.items ?? [];
  const readings = meterQuery.data ?? [];

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
    <div>
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/rooms' }}>Rooms</Breadcrumb.Item>
        <Breadcrumb.Item active>{room.code}</Breadcrumb.Item>
      </Breadcrumb>

      <PageHeader
        eyebrow="Room detail"
        title={`${room.code}${room.name ? ` · ${room.name}` : ''}`}
        description={`Lantai ${formatValue(room.floor)} · Status ${room.status}`}
      />

      <Card className="detail-hero border-0 mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <StatusBadge status={room.status} />
              <StatusBadge status={room.isActive === false ? 'INACTIVE' : 'ACTIVE'} customLabel={room.isActive === false ? 'Master nonaktif' : 'Master aktif'} />
            </div>
            {activeStay ? (
              <Button variant="outline-primary" onClick={() => navigate(`/stays/${activeStay.id}`)}>
                Lihat Stay Aktif
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
              <div className="metric-tile-label">Barang terpasang</div>
              <div className="metric-tile-value">{totalInventoryQty}</div>
            </div>
            <div className="metric-tile">
              <div className="metric-tile-label">Penghuni aktif</div>
              <div className="metric-tile-value">{activeStay?.tenant?.fullName ?? 'Kosong'}</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="info" className="mb-3">
        <Tab eventKey="info" title="Informasi">
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
                    <div className="text-muted small">Tarif listrik / kWh</div>
                    <div className="fw-semibold mb-3"><CurrencyDisplay amount={room.electricityTariffPerKwhRupiah} /></div>
                    <div className="text-muted small">Tarif air / m³</div>
                    <div className="fw-semibold"><CurrencyDisplay amount={room.waterTariffPerM3Rupiah} /></div>
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

        <Tab eventKey="inventory" title={`Inventaris (${roomItems.length})`}>
          <div className="pt-3">
            <Card className="content-card border-0">
              <Card.Body>
                {roomItemsQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
                {roomItemsQuery.isError ? <Alert variant="danger">Gagal memuat room items.</Alert> : null}
                {!roomItemsQuery.isLoading && !roomItemsQuery.isError && !roomItems.length ? (
                  <Alert variant="secondary" className="mb-0">Belum ada inventaris yang terpasang pada kamar ini.</Alert>
                ) : null}
                {!!roomItems.length ? (
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>Barang</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="fw-semibold">{item.item?.name ?? `Item #${item.itemId}`}</div>
                            <div className="small text-muted">{item.item?.sku ?? `ID ${item.itemId}`}</div>
                          </td>
                          <td>{Number(item.qty ?? 0)}</td>
                          <td><StatusBadge status={item.status ?? 'SECONDARY'} /></td>
                          <td>{item.note ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
              </Card.Body>
            </Card>
          </div>
        </Tab>

        <Tab eventKey="facilities" title={<><span className="me-2">🛋️</span>Fasilitas</>}>
          <div className="pt-3">
            <FacilityManager roomId={roomId} />
          </div>
        </Tab>

        <Tab eventKey="meter" title="Meteran">
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
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
