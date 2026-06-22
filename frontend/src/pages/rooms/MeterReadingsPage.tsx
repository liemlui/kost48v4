import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import { listResource, createResource } from '../../api/resources';
import type { MeterReading } from '../../types';

// ── Helper ────────────────────────────────────────────────────────────────────

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function startOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function endOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0); // last day of month
  return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(v: string | null | undefined): string {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

type RoomItem = {
  id: number;
  code: string;
  name?: string | null;
  isActive?: boolean;
  status?: string;
};

const UTILITY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
};

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateFormState = {
  roomId: string;
  utilityType: string;
  readingAt: string;
  readingValue: string;
  note: string;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function CreateMeterReadingModal({
  show,
  onHide,
  rooms,
  defaultRoomId,
}: {
  show: boolean;
  onHide: () => void;
  rooms: RoomItem[];
  defaultRoomId?: number;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateFormState>({
    roomId: defaultRoomId ? String(defaultRoomId) : '',
    utilityType: 'ELECTRICITY',
    readingAt: todayStr(),
    readingValue: '',
    note: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createResource<MeterReading>('/meter-readings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      onHide();
      setForm({ roomId: '', utilityType: 'ELECTRICITY', readingAt: todayStr(), readingValue: '', note: '' });
      setError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan catatan meter.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleSubmit = () => {
    if (!form.roomId) { setError('Pilih kamar terlebih dahulu.'); return; }
    if (!form.readingValue) { setError('Masukkan nilai meter.'); return; }
    setError('');
    mutation.mutate({
      roomId: Number(form.roomId),
      utilityType: form.utilityType,
      readingAt: form.readingAt,
      readingValue: form.readingValue,
      note: form.note || undefined,
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Catat Meter Manual</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-grid gap-3">
          <Form.Group>
            <Form.Label>Kamar</Form.Label>
            <Form.Select value={form.roomId} onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))} required>
              <option value="">Pilih kamar</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.code}{r.name ? ` - ${r.name}` : ''}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Utilitas</Form.Label>
            <Form.Select value={form.utilityType} onChange={(e) => setForm((p) => ({ ...p, utilityType: e.target.value }))}>
              <option value="ELECTRICITY">Listrik</option>
              <option value="WATER">Air</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Tanggal</Form.Label>
            <Form.Control type="date" value={form.readingAt} onChange={(e) => setForm((p) => ({ ...p, readingAt: e.target.value }))} required />
          </Form.Group>
          <Form.Group>
            <Form.Label>Nilai Meter</Form.Label>
            <Form.Control
              type="number"
              value={form.readingValue}
              onChange={(e) => setForm((p) => ({ ...p, readingValue: e.target.value }))}
              placeholder="Angka pada tampilan meter"
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Catatan <span className="text-muted">(opsional)</span></Form.Label>
            <Form.Control as="textarea" rows={2} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
          </Form.Group>
          {error ? <Alert variant="danger" className="mb-0">{error}</Alert> : null}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={mutation.isPending}>Batal</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MeterReadingsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-based
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultRoomId, setCreateDefaultRoomId] = useState<number | undefined>(undefined);

  const from = startOfMonth(selectedYear, selectedMonth);
  const to = endOfMonth(selectedYear, selectedMonth);

  const readingsQuery = useQuery({
    queryKey: ['meter-readings', 'list', selectedYear, selectedMonth],
    queryFn: () => listResource<MeterReading>('/meter-readings', { from, to, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const roomsQuery = useQuery({
    queryKey: ['resource-ref', '/rooms', 'active'],
    queryFn: () => listResource<RoomItem>('/rooms', { limit: 100, isActive: 'true' }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const readings = readingsQuery.data?.items ?? [];
  const rooms = (roomsQuery.data?.items ?? []).filter((r) => r.isActive !== false);

  // Kamar yang sudah ada bacaan listrik bulan ini
  const roomsWithElectricity = useMemo(
    () => new Set(readings.filter((r) => r.utilityType === 'ELECTRICITY').map((r) => r.roomId)),
    [readings],
  );
  const roomsWithWater = useMemo(
    () => new Set(readings.filter((r) => r.utilityType === 'WATER').map((r) => r.roomId)),
    [readings],
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => currentYear - i);
  }, []);

  const openCreate = (roomId?: number) => {
    setCreateDefaultRoomId(roomId);
    setShowCreate(true);
  };

  return (
    <div>
      <PageHeader
        title="Riwayat Meter"
        description="Bacaan meter listrik dan air per kamar. Default tampil bulan berjalan."
        actionLabel="Catat Meter Manual"
        onAction={() => openCreate()}
      />

      {/* Filter Periode */}
      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span className="fw-semibold text-muted small text-uppercase">Periode</span>
            <Form.Select
              size="sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ width: 150 }}
            >
              {BULAN.map((nama, idx) => (
                <option key={idx + 1} value={idx + 1}>{nama}</option>
              ))}
            </Form.Select>
            <Form.Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ width: 100 }}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </Form.Select>
            <Badge bg="info" className="ms-1">
              {BULAN[selectedMonth - 1]} {selectedYear}
            </Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Ringkasan per Kamar — badge belum dicatat */}
      {rooms.length > 0 && (
        <Card className="content-card border-0 mb-3">
          <Card.Body>
            <div className="small text-uppercase text-muted fw-semibold mb-2">Status Pencatatan Bulan Ini</div>
            <div className="d-flex flex-wrap gap-2">
              {rooms.map((room) => {
                const hasElec = roomsWithElectricity.has(room.id);
                const hasWater = roomsWithWater.has(room.id);
                const allRecorded = hasElec && hasWater;
                const noneRecorded = !hasElec && !hasWater;
                return (
                  <div
                    key={room.id}
                    className="border rounded p-2 d-flex flex-column align-items-center"
                    style={{ minWidth: 90, fontSize: '0.8rem' }}
                  >
                    <span className="fw-semibold">{room.code}</span>
                    {allRecorded ? (
                      <Badge bg="success" className="mt-1">Tercatat</Badge>
                    ) : noneRecorded ? (
                      <Badge bg="warning" text="dark" className="mt-1">
                        Belum dicatat
                      </Badge>
                    ) : (
                      <>
                        {!hasElec && <Badge bg="warning" text="dark" className="mt-1" style={{ fontSize: '0.65rem' }}>Listrik kosong</Badge>}
                        {!hasWater && <Badge bg="warning" text="dark" className="mt-1" style={{ fontSize: '0.65rem' }}>Air kosong</Badge>}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="link"
                      className="p-0 mt-1"
                      style={{ fontSize: '0.7rem' }}
                      title={`Catat meter untuk kamar ${room.code} bulan ${BULAN[selectedMonth - 1]} ${selectedYear}`}
                      onClick={() => openCreate(room.id)}
                    >
                      + Catat
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Tabel Bacaan */}
      <Card className="content-card border-0">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small text-uppercase text-muted fw-semibold">
              Semua Bacaan — {BULAN[selectedMonth - 1]} {selectedYear}
            </div>
            <Badge bg={readings.length ? 'primary' : 'secondary'}>{readings.length} entri</Badge>
          </div>

          {readingsQuery.isLoading && (
            <div className="py-4 text-center"><Spinner animation="border" size="sm" /> Memuat...</div>
          )}
          {readingsQuery.isError && (
            <Alert variant="danger">Gagal memuat data bacaan meter.</Alert>
          )}
          {!readingsQuery.isLoading && !readingsQuery.isError && readings.length === 0 && (
            <Alert variant="secondary">
              Belum ada bacaan meter untuk {BULAN[selectedMonth - 1]} {selectedYear}.{' '}
              <Button variant="link" className="p-0 align-baseline" onClick={() => openCreate()}
                title="Catat bacaan meter baru untuk bulan ini">
                Catat sekarang
              </Button>
            </Alert>
          )}
          {readings.length > 0 && (
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Kamar</th>
                    <th>Utilitas</th>
                    <th>Tanggal</th>
                    <th>Nilai Meter</th>
                    <th>Catatan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((item) => {
                    const room = rooms.find((r) => r.id === item.roomId);
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="fw-semibold">{room?.code ?? `Kamar #${item.roomId}`}</span>
                          {room?.name ? <span className="text-muted small ms-1">— {room.name}</span> : null}
                        </td>
                        <td>
                          <Badge bg={item.utilityType === 'ELECTRICITY' ? 'warning' : 'info'} text={item.utilityType === 'ELECTRICITY' ? 'dark' : undefined}>
                            {UTILITY_LABELS[item.utilityType] ?? item.utilityType}
                          </Badge>
                        </td>
                        <td>{formatDate(item.readingAt)}</td>
                        <td className="fw-semibold">{item.readingValue}</td>
                        <td className="text-muted small">{(item as unknown as Record<string, unknown>).note as string ?? '-'}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            title={`Catat bacaan meter baru untuk kamar ${room?.code ?? item.roomId} (entri baru, bukan edit)`}
                            onClick={() => openCreate(item.roomId)}
                          >
                            Catat Baru
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <CreateMeterReadingModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        rooms={rooms}
        defaultRoomId={createDefaultRoomId}
      />
    </div>
  );
}
