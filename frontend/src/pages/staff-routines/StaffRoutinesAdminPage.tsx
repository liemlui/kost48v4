import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import {
  createStaffRoutineTemplate,
  deleteStaffRoutineTemplate,
  fetchStaffRoutineProgress,
  fetchStaffRoutineTemplates,
  updateStaffRoutineTemplate,
  type StaffRoutineAreaType,
  type StaffRoutineFrequency,
  type StaffRoutineTemplate,
} from '../../api/staffRoutines';

type FormState = {
  id?: number;
  title: string;
  description: string;
  frequency: StaffRoutineFrequency;
  areaType: StaffRoutineAreaType;
  dayOfWeek: string;
  dayOfMonth: string;
  requiresPhoto: boolean;
  requiresNote: boolean;
  isActive: boolean;
  sortOrder: string;
};

const initialForm: FormState = {
  title: '',
  description: '',
  frequency: 'DAILY',
  areaType: 'GENERAL',
  dayOfWeek: '',
  dayOfMonth: '',
  requiresPhoto: false,
  requiresNote: false,
  isActive: true,
  sortOrder: '0',
};

function frequencyLabel(value: string) {
  if (value === 'DAILY') return 'Harian';
  if (value === 'WEEKLY') return 'Mingguan';
  if (value === 'MONTHLY') return 'Bulanan';
  return value;
}

function areaLabel(value: string) {
  switch (value) {
    case 'BATHROOM': return 'Kamar mandi';
    case 'ROOM': return 'Kamar';
    case 'INVENTORY': return 'Stok barang';
    case 'METER': return 'Meter';
    case 'SECURITY': return 'Keamanan';
    case 'CLEANING': return 'Bersih-bersih';
    default: return 'Area umum';
  }
}

function toPayload(form: FormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    frequency: form.frequency,
    areaType: form.areaType,
    dayOfWeek: form.frequency === 'WEEKLY' && form.dayOfWeek ? Number(form.dayOfWeek) : undefined,
    dayOfMonth: form.frequency === 'MONTHLY' && form.dayOfMonth ? Number(form.dayOfMonth) : undefined,
    requiresPhoto: form.requiresPhoto,
    requiresNote: form.requiresNote,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
  };
}

export default function StaffRoutinesAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);

  const templatesQuery = useQuery({ queryKey: ['staff-routines-admin', 'templates'], queryFn: fetchStaffRoutineTemplates });
  const progressQuery = useQuery({ queryKey: ['staff-routines-admin', 'progress'], queryFn: fetchStaffRoutineProgress });

  const templates = templatesQuery.data ?? [];
  const progressSummary = progressQuery.data?.summary;

  const saveMutation = useMutation({
    mutationFn: () => form.id ? updateStaffRoutineTemplate(form.id, toPayload(form)) : createStaffRoutineTemplate(toPayload(form)),
    onSuccess: async () => {
      setForm(initialForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-staff'] }),
      ]);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deleteStaffRoutineTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (item: StaffRoutineTemplate) => updateStaffRoutineTemplate(item.id, { ...toPayload({ ...initialForm,
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      frequency: item.frequency,
      areaType: item.areaType ?? 'GENERAL',
      dayOfWeek: item.dayOfWeek != null ? String(item.dayOfWeek) : '',
      dayOfMonth: item.dayOfMonth != null ? String(item.dayOfMonth) : '',
      requiresPhoto: Boolean(item.requiresPhoto),
      requiresNote: Boolean(item.requiresNote),
      sortOrder: String(item.sortOrder ?? 0),
    }), isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-routines-admin'] });
    },
  });

  const activeCount = useMemo(() => templates.filter((item) => item.isActive !== false).length, [templates]);

  const edit = (item: StaffRoutineTemplate) => {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      frequency: item.frequency,
      areaType: item.areaType ?? 'GENERAL',
      dayOfWeek: item.dayOfWeek != null ? String(item.dayOfWeek) : '',
      dayOfMonth: item.dayOfMonth != null ? String(item.dayOfMonth) : '',
      requiresPhoto: Boolean(item.requiresPhoto),
      requiresNote: Boolean(item.requiresNote),
      isActive: item.isActive !== false,
      sortOrder: String(item.sortOrder ?? 0),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    saveMutation.mutate();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Staff Routine"
        title="Atur Pekerjaan Rutin Staf"
        description="Admin bisa mengatur checklist harian, mingguan, dan bulanan. Staff hanya melihat daftar kerja sederhana di beranda."
      />

      <Row className="g-3 mb-3">
        <Col md={4}><Card className="content-card border-0"><Card.Body><span className="panel-subtitle">Checklist aktif</span><div className="display-6 fw-bold">{activeCount}</div></Card.Body></Card></Col>
        <Col md={4}><Card className="content-card border-0"><Card.Body><span className="panel-subtitle">Selesai 7 hari</span><div className="display-6 fw-bold">{progressSummary?.completed ?? 0}</div></Card.Body></Card></Col>
        <Col md={4}><Card className="content-card border-0"><Card.Body><span className="panel-subtitle">Butuh bantuan</span><div className="display-6 fw-bold">{progressSummary?.needHelp ?? 0}</div></Card.Body></Card></Col>
      </Row>

      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <h2 className="h5 mb-3">{form.id ? 'Edit pekerjaan rutin' : 'Tambah pekerjaan rutin'}</h2>
          {saveMutation.isError ? <Alert variant="danger">Pekerjaan belum tersimpan. Cek isian lalu coba lagi.</Alert> : null}
          <Form onSubmit={submit}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nama pekerjaan</Form.Label>
                  <Form.Control value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.currentTarget.value }))} placeholder="Contoh: Sapu ruang umum" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Jadwal</Form.Label>
                  <Form.Select value={form.frequency} onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.currentTarget.value as StaffRoutineFrequency }))}>
                    <option value="DAILY">Harian</option>
                    <option value="WEEKLY">Mingguan</option>
                    <option value="MONTHLY">Bulanan</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Area</Form.Label>
                  <Form.Select value={form.areaType} onChange={(event) => setForm((prev) => ({ ...prev, areaType: event.currentTarget.value as StaffRoutineAreaType }))}>
                    <option value="GENERAL">Area umum</option>
                    <option value="CLEANING">Bersih-bersih</option>
                    <option value="BATHROOM">Kamar mandi</option>
                    <option value="ROOM">Kamar</option>
                    <option value="INVENTORY">Stok barang</option>
                    <option value="METER">Meter</option>
                    <option value="SECURITY">Keamanan</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              {form.frequency === 'WEEKLY' ? (
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Hari</Form.Label>
                    <Form.Select value={form.dayOfWeek} onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: event.currentTarget.value }))}>
                      <option value="">Setiap minggu</option>
                      <option value="1">Senin</option>
                      <option value="2">Selasa</option>
                      <option value="3">Rabu</option>
                      <option value="4">Kamis</option>
                      <option value="5">Jumat</option>
                      <option value="6">Sabtu</option>
                      <option value="0">Minggu</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              ) : null}
              {form.frequency === 'MONTHLY' ? (
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Tanggal</Form.Label>
                    <Form.Control type="number" min={1} max={31} value={form.dayOfMonth} onChange={(event) => setForm((prev) => ({ ...prev, dayOfMonth: event.currentTarget.value }))} placeholder="1-31" />
                  </Form.Group>
                </Col>
              ) : null}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Catatan untuk staf</Form.Label>
                  <Form.Control value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.currentTarget.value }))} placeholder="Contoh: bersihkan debu dan sampah kecil" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Urutan</Form.Label>
                  <Form.Control type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.currentTarget.value }))} />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={3} className="d-flex align-items-end gap-3 flex-wrap">
                <Form.Check checked={form.requiresPhoto} onChange={(event) => setForm((prev) => ({ ...prev, requiresPhoto: event.currentTarget.checked }))} label="Butuh foto" />
                <Form.Check checked={form.requiresNote} onChange={(event) => setForm((prev) => ({ ...prev, requiresNote: event.currentTarget.checked }))} label="Butuh catatan" />
                <Form.Check checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.currentTarget.checked }))} label="Aktif" />
              </Col>
            </Row>
            <div className="d-flex gap-2 mt-3">
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : form.id ? 'Simpan Perubahan' : 'Tambah Checklist'}</Button>
              {form.id ? <Button variant="light" onClick={() => setForm(initialForm)}>Batal edit</Button> : null}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          <h2 className="h5 mb-3">Daftar pekerjaan rutin</h2>
          {templatesQuery.isLoading ? <div className="py-4 text-muted">Memuat pekerjaan rutin...</div> : null}
          {!templatesQuery.isLoading && !templates.length ? <EmptyState title="Belum ada pekerjaan rutin" description="Tambahkan checklist pertama untuk staf." /> : null}
          {templates.length ? (
            <Table responsive hover className="align-middle">
              <thead><tr><th>Pekerjaan</th><th>Jadwal</th><th>Area</th><th>Bukti</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {templates.map((item) => (
                  <tr key={item.id} className={item.isActive === false ? 'text-muted' : ''}>
                    <td><strong>{item.title}</strong><br /><small>{item.description || '-'}</small></td>
                    <td>{frequencyLabel(item.frequency)}{item.dayOfMonth ? ` tgl ${item.dayOfMonth}` : ''}</td>
                    <td>{areaLabel(item.areaType || 'GENERAL')}</td>
                    <td>{item.requiresPhoto ? 'Foto' : '-'}{item.requiresNote ? ' + catatan' : ''}</td>
                    <td>{item.isActive === false ? 'Nonaktif' : 'Aktif'}</td>
                    <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => edit(item)}>Edit</Button>{item.isActive !== false ? <Button size="sm" variant="outline-danger" className="ms-2" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate(item.id)}>{deactivateMutation.isPending ? 'Memproses...' : 'Nonaktifkan'}</Button> : <Button size="sm" variant="outline-success" className="ms-2" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(item)}>{reactivateMutation.isPending ? 'Memproses...' : 'Aktifkan'}</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
