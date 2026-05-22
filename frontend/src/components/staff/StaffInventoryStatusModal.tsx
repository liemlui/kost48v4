import { ChangeEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { uploadTicketImage, type UploadedImageMeta } from '../../api/mediaUploads';
import { listResource } from '../../api/resources';
import { updateInventoryItemFieldStatus, updateRoomItemFieldStatus } from '../../api/staffInventory';
import { roomConditionOptions, warehouseConditionOptions } from '../../constants/staffRepairOptions';
import type { InventoryItem, RoomItem } from '../../types';

type Target =
  | { type: 'room-item'; item: RoomItem }
  | { type: 'inventory-item'; item: InventoryItem };

type Props = {
  target: Target | null;
  show: boolean;
  onHide: () => void;
  onSaved?: () => void | Promise<void>;
};

async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, '') + '.jpg', { type: 'image/jpeg' });
}

function targetTitle(target: Target | null) {
  if (!target) return 'Laporkan kondisi barang';
  if (target.type === 'room-item') return target.item.item?.name ?? `Barang kamar #${target.item.id}`;
  return target.item.name;
}

export default function StaffInventoryStatusModal({ target, show, onHide, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [conditionValue, setConditionValue] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [requestsReplacement, setRequestsReplacement] = useState(false);
  const [requestedInventoryItemId, setRequestedInventoryItemId] = useState('');
  const [requestedQty, setRequestedQty] = useState('1');

  const options = target?.type === 'room-item' ? roomConditionOptions : warehouseConditionOptions;
  const selectedCondition = options.find((option) => option.value === conditionValue);
  const canRequestReplacement = target?.type === 'room-item' && Boolean(selectedCondition?.allowReplacementRequest || selectedCondition?.defaultRequestsReplacement);
  const inventoryItemsQuery = useQuery({
    queryKey: ['staff-replacement-inventory-options'],
    queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 200, isActive: 'true' }),
    enabled: show && canRequestReplacement && requestsReplacement,
  });
  const replacementOptions = useMemo(() => (inventoryItemsQuery.data?.items ?? []).filter((item) => item.isActive !== false), [inventoryItemsQuery.data?.items]);

  const helperCopy = useMemo(() => {
    if (target?.type === 'room-item') {
      return 'Kirim laporan kondisi barang kamar ke admin. Staff tidak menentukan status final; admin/owner yang mengonfirmasi apakah barang rusak, hilang, atau sudah baik kembali.';
    }
    return 'Kirim laporan kondisi stok/barang gudang ke admin. Jumlah stok resmi, mutasi barang, dan status final tetap dikonfirmasi admin/owner.';
  }, [target?.type]);

  const reset = () => {
    setConditionValue('');
    setNote('');
    setPhoto(null);
    setPreview(null);
    setError('');
    setRequestsReplacement(false);
    setRequestedInventoryItemId('');
    setRequestedQty('1');
  };

  const close = () => {
    reset();
    onHide();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return null;
      if (!conditionValue || !selectedCondition) throw new Error('Pilih kondisi yang ditemukan dulu.');
      if (canRequestReplacement && requestsReplacement && (!requestedInventoryItemId || !requestedQty.trim())) {
        throw new Error('Pilih barang pengganti dan jumlah yang dibutuhkan.');
      }
      if (!photo?.fileUrl && !note.trim()) {
        throw new Error('Isi catatan atau upload foto bukti agar admin bisa mengecek laporan.');
      }
      const payload = {
        status: selectedCondition.backendStatus,
        note: note.trim() || undefined,
        photoUrl: photo?.fileUrl,
        photoFileKey: photo?.fileKey,
        photoOriginalFilename: photo?.originalFilename,
        photoMimeType: photo?.mimeType,
        photoFileSizeBytes: photo?.fileSizeBytes,
        requestsReplacement: canRequestReplacement && requestsReplacement ? true : undefined,
        requestedInventoryItemId: canRequestReplacement && requestsReplacement && requestedInventoryItemId ? Number(requestedInventoryItemId) : undefined,
        requestedQty: canRequestReplacement && requestsReplacement ? requestedQty : undefined,
      };
      if (target.type === 'room-item') {
        return updateRoomItemFieldStatus(target.item.id, payload);
      }
      return updateInventoryItemFieldStatus(target.item.id, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['room'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['/inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-general-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-field-reports'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-field-report-review-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-performance-me-evidence'] }),
      ]);
      await onSaved?.();
      close();
    },
    onError: (err: any) => setError(err?.response?.data?.message || err?.message || 'Laporan kondisi belum terkirim.'),
  });

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file);
      const uploaded = await uploadTicketImage(compressed);
      setPhoto(uploaded);
      setPreview(uploaded.fileUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Foto belum berhasil diunggah. Coba foto lain.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <Modal show={show} onHide={close} centered>
      <Modal.Header closeButton>
        <Modal.Title>{target?.type === 'room-item' ? 'Laporkan Kondisi Barang Kamar' : 'Laporkan Kondisi Barang Gudang'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger" className="py-2">{error}</Alert> : null}
        <Alert variant="info" className="border small py-2">{helperCopy}</Alert>
        <div className="staff-field-target mb-3">
          <div className="small text-muted">Barang</div>
          <div className="fw-semibold">{targetTitle(target)}</div>
        </div>
        <Form.Group className="mb-3">
          <Form.Label>Kondisi yang ditemukan</Form.Label>
          <Form.Select
            value={conditionValue}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              const nextOption = options.find((option) => option.value === nextValue);
              setConditionValue(nextValue);
              if (target?.type !== 'room-item') {
                setRequestsReplacement(false);
                setRequestedInventoryItemId('');
                setRequestedQty('1');
              } else if (nextOption?.defaultRequestsReplacement) {
                setRequestsReplacement(true);
              }
            }}
          >
            <option value="">Pilih kondisi</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Form.Select>
          {selectedCondition?.helper ? <Form.Text>{selectedCondition.helper}</Form.Text> : null}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Foto bukti</Form.Label>
          <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} />
          {preview ? <img className="staff-proof-preview" src={preview} alt="Foto bukti" /> : null}
          <Form.Text>Foto membantu admin memastikan keputusan dan mencegah salah catat.</Form.Text>
        </Form.Group>
        <Form.Group>
          <Form.Label>Catatan lapangan</Form.Label>
          <Form.Control as="textarea" rows={2} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="Contoh: lampu kamar berkedip, stok sabun lantai habis, alat pel patah" />
        </Form.Group>
{target?.type === 'room-item' ? (
        <div className="mt-3 rounded-4 border bg-light p-3">
          <Form.Check
            type="switch"
            id="replacement-request-switch"
            label="Butuh barang pengganti dari gudang"
            checked={canRequestReplacement && requestsReplacement}
            disabled={!canRequestReplacement}
            onChange={(event) => setRequestsReplacement(event.currentTarget.checked)}
          />
          <div className="small text-muted mt-1">Jika dinyalakan, admin akan melihat permintaan ini sebagai queue persetujuan stok. Mutasi stok resmi tetap dibuat oleh admin/owner.</div>
          {canRequestReplacement && requestsReplacement ? (
            <div className="row g-2 mt-2">
              <div className="col-md-8">
                <Form.Label className="small fw-semibold">Barang dari gudang</Form.Label>
                <Form.Select value={requestedInventoryItemId} onChange={(event) => setRequestedInventoryItemId(event.currentTarget.value)}>
                  <option value="">Pilih barang</option>
                  {replacementOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · stok {Number(item.qtyOnHand ?? 0)} {item.unit ?? 'pcs'}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-4">
                <Form.Label className="small fw-semibold">Jumlah</Form.Label>
                <Form.Control inputMode="decimal" value={requestedQty} onChange={(event) => setRequestedQty(event.currentTarget.value.replace(/[^0-9.]/g, ''))} />
              </div>
            </div>
          ) : null}
        </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={close}>Batal</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <><Spinner size="sm" className="me-2" />Mengirim...</> : 'Kirim Laporan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
