// FILE: FacilityManager.tsx — manajemen fasilitas kamar: tambah, edit, hapus
import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Col, Collapse, Form, Row, Spinner, Table } from 'react-bootstrap';
import { createResource, deleteResource, getResource, listResource, updateResource } from '../../api/resources';
import EmptyState from '../common/EmptyState';
import { useConfirm } from '../common/ConfirmProvider';
import type { InventoryItem, RoomFacility } from '../../types';

interface FacilityManagerProps {
  roomId: number;
  allowedToManage?: boolean;
}

interface FacilityFormState {
  name: string;
  quantity: number;
  category: string;
  publicVisible: boolean;
  condition: string;
  note: string;
  inventoryItemId: string;
}

type FacilitiesEnvelope = {
  success?: boolean;
  message?: string;
  data?: RoomFacility[];
};

const EMPTY_FACILITY: FacilityFormState = {
  name: '',
  quantity: 1,
  category: '',
  publicVisible: true,
  condition: '',
  note: '',
  inventoryItemId: '',
};

function normalizeFacilitiesResponse(response: unknown): RoomFacility[] {
  if (Array.isArray(response)) {
    return response as RoomFacility[];
  }

  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray((response as FacilitiesEnvelope).data)
  ) {
    return (response as FacilitiesEnvelope).data ?? [];
  }

  return [];
}

function normalizeQuantity(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  ) {
    const message = (error as { response: { data: { message: string | string[] } } }).response.data.message;
    return Array.isArray(message) ? message.join(', ') : message;
  }

  return fallback;
}

export default function FacilityManager({ roomId, allowedToManage = true }: FacilityManagerProps) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FacilityFormState>(EMPTY_FACILITY);
  const [error, setError] = useState<string | null>(null);

  const facilitiesQuery = useQuery({
    queryKey: ['room-facilities', roomId],
    queryFn: async () => {
      const response = await getResource<unknown>(`/rooms/${roomId}/facilities`);
      return normalizeFacilitiesResponse(response);
    },
    enabled: Number.isFinite(roomId) && roomId > 0,
  });

  // Daftar barang gudang untuk menautkan fasilitas → item inventaris (STF-GUDANG-2).
  const inventoryItemsQuery = useQuery({
    queryKey: ['inventory-items', 'for-facility-link'],
    queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 200 }),
    enabled: allowedToManage,
    staleTime: 120_000,
  });
  const inventoryItems = inventoryItemsQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      createResource<RoomFacility>(`/rooms/${roomId}/facilities`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      resetForm();
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Gagal menambah fasilitas kamar.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateResource<RoomFacility>(`/rooms/${roomId}/facilities/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      resetForm();
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Gagal menyimpan fasilitas kamar.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (facilityId: number) => deleteResource(`/rooms/${roomId}/facilities/${facilityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Gagal menghapus fasilitas kamar.')),
  });

  function resetForm() {
    setForm(EMPTY_FACILITY);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function startEdit(facility: RoomFacility) {
    setForm({
      name: facility.name,
      quantity: facility.quantity || 1,
      category: facility.category ?? '',
      publicVisible: facility.publicVisible !== false,
      condition: facility.condition ?? '',
      note: facility.note ?? '',
      inventoryItemId: facility.inventoryItemId != null ? String(facility.inventoryItemId) : '',
    });
    setEditingId(facility.id);
    setShowForm(true);
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const quantity = Number(form.quantity);

    if (!name) {
      setError('Nama fasilitas wajib diisi.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Jumlah fasilitas minimal 1.');
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      quantity,
      category: form.category.trim() || undefined,
      publicVisible: form.publicVisible,
      condition: form.condition.trim() || undefined,
      note: form.note.trim() || undefined,
    };

    if (editingId !== null) {
      // Saat edit, kirim null untuk melepas tautan jika dikosongkan.
      payload.inventoryItemId = form.inventoryItemId ? Number(form.inventoryItemId) : null;
      updateMutation.mutate({ id: editingId, payload });
      return;
    }

    if (form.inventoryItemId) payload.inventoryItemId = Number(form.inventoryItemId);

    createMutation.mutate(payload);
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

      {allowedToManage ? (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="card-title-soft mb-0">Daftar Fasilitas Kamar</div>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => {
              if (showForm) {
                resetForm();
                return;
              }

              setForm(EMPTY_FACILITY);
              setEditingId(null);
              setError(null);
              setShowForm(true);
            }}
          >
            {showForm ? 'Batal' : '+ Tambah Fasilitas'}
          </Button>
        </div>
      ) : (
        <div className="mb-3">
          <div className="card-title-soft mb-0">Daftar Fasilitas Kamar</div>
        </div>
      )}

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
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
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
                    min={1}
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: normalizeQuantity(event.target.value) })}
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small mb-1">Kategori</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    <option value="">Opsional</option>
                    <option value="Kamar">Kamar</option>
                    <option value="Kamar Mandi">Kamar Mandi</option>
                    <option value="Elektronik">Elektronik</option>
                    <option value="Dapur">Dapur</option>
                    <option value="Lainnya">Lainnya</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small mb-1">Kondisi</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.condition}
                    onChange={(event) => setForm({ ...form, condition: event.target.value })}
                  >
                    <option value="">Opsional</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Perlu Dicek">Perlu Dicek</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-2 mt-2">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small mb-1">Tautkan ke barang gudang</Form.Label>
                  <Form.Select
                    size="sm"
                    value={form.inventoryItemId}
                    onChange={(event) => setForm({ ...form, inventoryItemId: event.target.value })}
                  >
                    <option value="">Tidak ditautkan</option>
                    {inventoryItems.map((it) => (
                      <option key={it.id} value={String(it.id)}>
                        {it.name}{it.sku ? ` (${it.sku})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text muted>Untuk cek konsistensi fasilitas ↔ inventaris yang akurat.</Form.Text>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small mb-1">Catatan Internal</Form.Label>
                  <Form.Control
                    size="sm"
                    value={form.note}
                    onChange={(event) => setForm({ ...form, note: event.target.value })}
                    placeholder="Opsional, tidak tampil publik"
                  />
                </Form.Group>
              </Col>

              <Col md={4} className="d-flex align-items-end gap-2">
                <Form.Check
                  type="checkbox"
                  id={`publicVisible-${roomId}`}
                  label="Tampilkan ke publik"
                  checked={form.publicVisible}
                  onChange={(event) => setForm({ ...form, publicVisible: event.target.checked })}
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
        <Alert variant="danger">
          {getErrorMessage(facilitiesQuery.error, 'Gagal memuat daftar fasilitas.')}
        </Alert>
      ) : facilities.length === 0 ? (
        <EmptyState
          icon="🛋️"
          title="Belum ada fasilitas"
          description="Tambahkan fasilitas kamar seperti AC, kasur, lemari, meja, atau kursi."
        />
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
            {facilities.map((facility) => (
              <tr key={facility.id}>
                <td className="fw-semibold">{facility.name}</td>
                <td>{facility.quantity}</td>
                <td className="text-muted small">{facility.category || '-'}</td>
                <td className="text-muted small">{facility.condition || '-'}</td>
                <td>
                  {facility.publicVisible ? (
                    <span className="badge bg-success">Ya</span>
                  ) : (
                    <span className="badge bg-secondary">Tidak</span>
                  )}
                </td>
                <td className="text-end">
                  {allowedToManage ? (
                    <>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-1"
                        onClick={() => startEdit(facility)}
                        disabled={isMutating}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={async () => {
                          const ok = await confirm({ title: 'Hapus Fasilitas', message: `Hapus fasilitas "${facility.name}"?`, confirmLabel: 'Hapus', variant: 'danger' });
                          if (!ok) return;
                          deleteMutation.mutate(facility.id);
                        }}
                        disabled={isMutating}
                      >
                        Hapus
                      </Button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}