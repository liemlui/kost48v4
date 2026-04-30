import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Col, Collapse, Form, Row, Spinner, Table } from 'react-bootstrap';
import { createResource, deleteResource, updateResource } from '../../api/resources';
import EmptyState from '../common/EmptyState';
import type { RoomFacility } from '../../types';

interface FacilityManagerProps {
  roomId: number;
}

interface FacilityFormState {
  name: string;
  quantity: number;
  category: string;
  publicVisible: boolean;
  condition: string;
  note: string;
}

const EMPTY_FACILITY: FacilityFormState = {
  name: '',
  quantity: 1,
  category: '',
  publicVisible: true,
  condition: '',
  note: '',
};

export default function FacilityManager({ roomId }: FacilityManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FacilityFormState>(EMPTY_FACILITY);
  const [error, setError] = useState<string | null>(null);

  const facilitiesQuery = useQuery({
    queryKey: ['room-facilities', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/facilities`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('Gagal memuat fasilitas');
      const json = await res.json();
      return (json.data ?? json) as RoomFacility[];
    },
    enabled: Number.isFinite(roomId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      createResource<RoomFacility>(`/rooms/${roomId}/facilities`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      resetForm();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateResource<RoomFacility>(`/rooms/${roomId}/facilities/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      resetForm();
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (facilityId: number) => deleteResource(`/rooms/${roomId}/facilities/${facilityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function resetForm() {
    setForm(EMPTY_FACILITY);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(f: RoomFacility) {
    setForm({
      name: f.name,
      quantity: f.quantity,
      category: f.category ?? '',
      publicVisible: f.publicVisible,
      condition: f.condition ?? '',
      note: f.note ?? '',
    });
    setEditingId(f.id);
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Nama fasilitas wajib diisi.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      quantity: form.quantity,
      category: form.category.trim() || undefined,
      publicVisible: form.publicVisible,
      condition: form.condition.trim() || undefined,
      note: form.note.trim() || undefined,
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const facilities = facilitiesQuery.data ?? [];
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div>
      {error ? (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="card-title-soft mb-0">Daftar Fasilitas Kamar</div>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Batal' : '+ Tambah Fasilitas'}
        </Button>
      </div>

      <Collapse in={showForm}>
        <div>
          <Form onSubmit={handleSubmit} className="border rounded p-3 mb-3 bg-light">
            <Row className="g-2">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small mb-1">Nama Fasilitas *</Form.Label>
                  <Form.Control
                    size="sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: AC, Kasur, Lemari"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label className="small mb-1">Jumlah</Form.Label>
                  <Form.Control
                    size="sm"
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small mb-1">Kategori</Form.Label>
                  <Form.Control
                    size="sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Opsional"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small mb-1">Kondisi</Form.Label>
                  <Form.Control
                    size="sm"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    placeholder="Contoh: Baik, Rusak Ringan"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-2 mt-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small mb-1">Catatan Internal</Form.Label>
                  <Form.Control
                    size="sm"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Opsional, tidak tampil publik"
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="d-flex align-items-end gap-2">
                <Form.Check
                  type="checkbox"
                  id="publicVisible"
                  label="Tampilkan ke publik"
                  checked={form.publicVisible}
                  onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })}
                />
                <Button type="submit" size="sm" disabled={isMutating}>
                  {isMutating ? <Spinner size="sm" /> : editingId !== null ? 'Simpan' : 'Tambah'}
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </Collapse>

      {facilitiesQuery.isLoading ? (
        <div className="py-3 text-center">
          <Spinner animation="border" size="sm" />
        </div>
      ) : facilitiesQuery.isError ? (
        <Alert variant="danger">Gagal memuat daftar fasilitas.</Alert>
      ) : facilities.length === 0 ? (
        <EmptyState icon="🛋️" title="Belum ada fasilitas" description="Tambahkan fasilitas kamar seperti AC, kasur, lemari, dll." />
      ) : (
        <Table size="sm" className="mb-0">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jml</th>
              <th>Kategori</th>
              <th>Kondisi</th>
              <th>Publik</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f.id}>
                <td className="fw-semibold">{f.name}</td>
                <td>{f.quantity}</td>
                <td className="text-muted small">{f.category || '-'}</td>
                <td className="text-muted small">{f.condition || '-'}</td>
                <td>
                  {f.publicVisible ? (
                    <span className="badge bg-success">Ya</span>
                  ) : (
                    <span className="badge bg-secondary">Tidak</span>
                  )}
                </td>
                <td className="text-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-1"
                    onClick={() => startEdit(f)}
                    disabled={isMutating}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Hapus fasilitas "${f.name}"?`)) {
                        deleteMutation.mutate(f.id);
                      }
                    }}
                    disabled={isMutating}
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}