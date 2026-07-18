import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useConfirm } from '../../components/common/ConfirmProvider';
import { getAcMaintenance, recordAcCleaning, type AcMaintenanceItem, type AcMaintenanceStatus } from '../../api/rooms';
import { formatDateOnly } from '../../utils/dateTime';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const STATUS_META: Record<AcMaintenanceStatus, { label: string; bg: string }> = {
  NEVER: { label: 'Belum pernah dicuci', bg: 'danger' },
  OVERDUE: { label: 'Terlambat', bg: 'danger' },
  SOON: { label: 'Segera', bg: 'warning' },
  OK: { label: 'Terjadwal aman', bg: 'success' },
};

function acCapacity(): string {
  return '½ PK';
}

export default function AcMaintenancePage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ac-maintenance'],
    queryFn: getAcMaintenance,
    staleTime: 60_000,
  });

  const cleanMutation = useMutation({
    mutationFn: (roomId: number) => recordAcCleaning(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ac-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const data = query.data;

  const handleClean = async (room: AcMaintenanceItem) => {
    const ok = await confirm({
      title: 'Catat Cuci AC',
      message: `Tandai AC kamar ${room.code} sudah dicuci hari ini? Jadwal cuci berikutnya akan dihitung ulang dan tiket cuci AC yang terbuka ditutup.`,
      confirmLabel: 'Ya, sudah dicuci',
      variant: 'primary',
    });
    if (!ok) return;
    cleanMutation.mutate(room.id);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operasional Kos"
        title="Perawatan AC"
        description="Pantau pemakaian AC dan jadwalkan cuci AC secara konsisten (semua kamar AC ½ PK)."
      />

      {query.isLoading ? (
        <div className="py-5 text-center"><Spinner animation="border" /></div>
      ) : query.isError ? (
        <Alert variant="danger">{getApiErrorMessage(query.error, 'Gagal memuat data perawatan AC.')}</Alert>
      ) : !data || data.items.length === 0 ? (
        <Alert variant="secondary">Belum ada kamar ber-AC yang aktif.</Alert>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Badge bg="secondary" className="p-2">Total AC: {data.summary.total}</Badge>
            <Badge bg="danger" className="p-2">Perlu dicuci: {data.summary.overdue}</Badge>
            <Badge bg="warning" className="p-2 text-dark">Segera: {data.summary.soon}</Badge>
          </div>

          <Card className="content-card border-0">
            <Card.Body>
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Kamar</th>
                    <th>Kapasitas</th>
                    <th>Pakai/hari</th>
                    <th>Cuci terakhir</th>
                    <th>Jatuh tempo</th>
                    <th>Estimasi kWh</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((room) => {
                    const meta = STATUS_META[room.status];
                    return (
                      <tr
                        key={room.id}
                        className="clickable-row"
                        tabIndex={0}
                        aria-label={`Buka detail kamar ${room.code}`}
                        onClick={() => navigate(`/rooms/${room.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/rooms/${room.id}`);
                          }
                        }}
                      >
                        <td>
                          <button type="button" className="btn btn-link p-0 fw-semibold" onClick={() => navigate(`/rooms/${room.id}`)}>
                            {room.code}
                          </button>
                          {room.name ? <div className="small text-muted">{room.name}</div> : null}
                        </td>
                        <td>{acCapacity()}</td>
                        <td>{room.acUsageHoursPerDay != null ? `${room.acUsageHoursPerDay} jam` : <span className="text-muted">default</span>}</td>
                        <td>{room.acLastCleanedAt ? formatDateOnly(room.acLastCleanedAt) : <span className="text-muted">—</span>}</td>
                        <td>{room.nextDueAt ? formatDateOnly(room.nextDueAt) : <span className="text-muted">—</span>}</td>
                        <td>~{room.estimatedKwh} kWh</td>
                        <td>
                          <Badge bg={meta.bg} className={meta.bg === 'warning' ? 'text-dark' : undefined}>{meta.label}</Badge>
                          {room.openTicketId ? <div className="small text-muted mt-1">Tiket #{room.openTicketId}</div> : null}
                        </td>
                        <td className="text-end" onClick={(event) => event.stopPropagation()}>
                          <Button
                            size="sm"
                            variant={room.status === 'OK' ? 'outline-secondary' : 'primary'}
                            disabled={cleanMutation.isPending}
                            onClick={() => handleClean(room)}
                          >
                            Catat Cuci AC
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {cleanMutation.isError ? (
            <Alert variant="danger" className="mt-3">{getApiErrorMessage(cleanMutation.error, 'Gagal mencatat cuci AC.')}</Alert>
          ) : null}

          <p className="text-muted small mt-3">
            Jadwal hibrid: cuci AC dipicu bila interval hari terlampaui ATAU estimasi pemakaian (kWh) sudah tinggi.
            Estimasi kWh = daya × jam pakai/hari sejak cuci terakhir.
          </p>
        </>
      )}
    </div>
  );
}
