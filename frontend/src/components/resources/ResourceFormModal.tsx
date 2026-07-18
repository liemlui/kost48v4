// FILE: ResourceFormModal.tsx — modal form CRUD generik untuk resource data
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { createPortalAccess, resetPortalPassword, togglePortalAccess } from '../../api/tenants';
import { getFieldOptionsForContext, ResourceConfig } from '../../config/resources';
import { useAuth } from '../../context/AuthContext';
import { getRelationSpec, getReferenceLabel, ReferenceOption } from '../../pages/resources/resourceRelations';
import type { PortalUserSummary } from '../../types';
import CurrencyInput from '../common/CurrencyInput';
import PasswordInput from '../common/PasswordInput';
import SearchableSelect from '../common/SearchableSelect';
import SafeImage from '../common/SafeImage';
import { uploadAnnouncementImage, uploadRoomImage } from '../../api/mediaUploads';
import { compressImageFile as compressBrowserImage } from '../../utils/compressImageFile';
import { formatDateOnly } from '../../utils/dateTime';
import KtpOcrValidateCard from '../ai/KtpOcrValidateCard';

// ═══════════════════════════════════════════════════════════
//  SECTION: ResourceFormModal — Helpers
// ═══════════════════════════════════════════════════════════

async function compressImageFile(file: File): Promise<File> {
  return compressBrowserImage(file, { maxSide: 1600, quality: 0.78 });
}

function resolveAbsoluteFileUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

interface ResourceFormModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  editingItem: Record<string, unknown> | null;
  formState: Record<string, unknown>;
  setFormState: (state: Record<string, unknown>) => void;
  error: string;
  config: ResourceConfig;
  handleSubmit: () => void;
  isSubmitting: boolean;
  referenceOptions: Record<string, ReferenceOption[]>;
  referenceMaps: Record<string, Map<string, ReferenceOption>>;
  onPortalAccessToggle?: () => void;
}

export default function ResourceFormModal({
  showModal,
  setShowModal,
  editingItem,
  formState,
  setFormState,
  error,
  config,
  handleSubmit,
  isSubmitting,
  referenceOptions,
  referenceMaps,
  onPortalAccessToggle,
}: ResourceFormModalProps) {
  const { user } = useAuth();
  const [portalSummary, setPortalSummary] = useState<PortalUserSummary | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggleSuccess, setToggleSuccess] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({ email: '', password: '', fullName: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [roomImageUploading, setRoomImageUploading] = useState(false);
  const [roomImageError, setRoomImageError] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const nextSummary = (editingItem?.portalUserSummary as PortalUserSummary | null | undefined)
      ?? (editingItem?.linkedUser
        ? {
            portalUserId: Number((editingItem.linkedUser as { id?: number }).id),
            portalEmail: String((editingItem.linkedUser as { email?: string }).email ?? ''),
            portalIsActive: Boolean((editingItem.linkedUser as { isActive?: boolean }).isActive),
            lastLoginAt: ((editingItem.linkedUser as { lastLoginAt?: string | null }).lastLoginAt ?? null),
          }
        : null);
      setPortalSummary(nextSummary ?? null);
      setToggleError(null);
      setToggleSuccess(null);
      setCreateError(null);
      setCreateSuccess(null);
      setShowCreateForm(false);
      setShowResetForm(false);
      setNewPassword('');
      setResetError(null);
      setResetSuccess(null);
      setCreateFormData({
        email: String((editingItem?.email as string | undefined) ?? ''),
        password: '',
        fullName: String((editingItem?.fullName as string | undefined) ?? ''),
      });
  }, [editingItem, showModal]);

  const canTogglePortalAccess = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const relationFieldNames = useMemo(
    () => new Set(config.fields.filter((field) => getRelationSpec(config.path, field.name)).map((field) => field.name)),
    [config.fields, config.path],
  );

  const currentPortalIsActive = portalSummary?.portalIsActive ?? false;
  const hasPortalUser = Boolean(portalSummary?.portalUserId);

  const updateField = (name: string, value: unknown) => {
    if (config.path === '/inventory-movements' && name === 'movementType') {
      const nextType = String(value ?? '');
      const shouldClearRoom = ['IN', 'OUT'].includes(nextType);
      setFormState({
        ...formState,
        [name]: value,
        ...(shouldClearRoom ? { roomId: '' } : {}),
      });
      return;
    }
    if (config.path === '/announcements' && name === 'startsAt') {
      const newStartsAt = value as string;
      const currentExpiresAt = formState.expiresAt as string | undefined;
      if (newStartsAt && (!currentExpiresAt || currentExpiresAt <= newStartsAt)) {
        const nextDay = new Date(newStartsAt);
        nextDay.setDate(nextDay.getDate() + 1);
        setFormState({ ...formState, [name]: value, expiresAt: nextDay.toISOString().slice(0, 10) });
        return;
      }
    }
    setFormState({ ...formState, [name]: value });
  };

  const handleTogglePortalAccess = async (nextIsActive: boolean) => {
    if (!editingItem?.id) return;
    setToggleLoading(true);
    setToggleError(null);
    setToggleSuccess(null);
    try {
      const result = await togglePortalAccess(Number(editingItem.id), nextIsActive);
      setPortalSummary({
        portalUserId: result.portalUserId,
        portalEmail: result.portalEmail,
        portalIsActive: result.portalIsActive,
        lastLoginAt: result.lastLoginAt,
      });
      setToggleSuccess(`Status portal berhasil diubah menjadi ${result.portalIsActive ? 'Aktif' : 'Nonaktif'}.`);
      onPortalAccessToggle?.();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Terjadi kesalahan saat mengubah status portal.')
        : 'Terjadi kesalahan saat mengubah status portal.';
      setToggleError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleCreatePortalAccess = async () => {
    if (!editingItem?.id) return;
    if (!createFormData.email.trim()) {
      setCreateError('Email wajib diisi.');
      return;
    }
    if (createFormData.password.trim().length < 8) {
      setCreateError('Password minimal 8 karakter.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const result = await createPortalAccess(Number(editingItem.id), {
        email: createFormData.email.trim(),
        password: createFormData.password,
        fullName: createFormData.fullName.trim() || undefined,
      });
      setPortalSummary({
        portalUserId: result.portalUserId,
        portalEmail: result.portalEmail,
        portalIsActive: result.portalIsActive,
        lastLoginAt: result.lastLoginAt,
      });
      setCreateSuccess('Akun portal berhasil dibuat. Tenant sekarang bisa login ke portal.');
      setShowCreateForm(false);
      setCreateFormData({ email: '', password: '', fullName: '' });
      onPortalAccessToggle?.();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Terjadi kesalahan saat membuat akun portal.')
        : 'Terjadi kesalahan saat membuat akun portal.';
      setCreateError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPortalPassword = async () => {
    if (!editingItem?.id) return;
    if (newPassword.trim().length < 8) {
      setResetError('Password baru minimal 8 karakter.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const result = await resetPortalPassword(Number(editingItem.id), { newPassword: newPassword.trim() });
      setPortalSummary((prev) => prev ? { ...prev, passwordChangedAt: result.passwordChangedAt } : prev);
      setResetSuccess('Password portal tenant berhasil diperbarui. Berikan password baru ini ke tenant.');
      setShowResetForm(false);
      setNewPassword('');
      onPortalAccessToggle?.();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Terjadi kesalahan saat mereset password portal.')
        : 'Terjadi kesalahan saat mereset password portal.';
      setResetError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleRoomImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setRoomImageError(null);
    setRoomImageUploading(true);
    try {
      const existing = Array.isArray(formState.images) ? (formState.images as string[]) : [];
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('Galeri kamar hanya menerima JPG, PNG, atau WebP.');
        }
        const compressed = await compressImageFile(file);
        const uploaded = await uploadRoomImage(compressed);
        uploadedUrls.push(uploaded.fileUrl);
      }
      setFormState({ ...formState, images: [...existing, ...uploadedUrls] });
    } catch (err: any) {
      setRoomImageError(err?.message ?? 'Gagal mengunggah gambar kamar.');
    } finally {
      setRoomImageUploading(false);
      event.target.value = '';
    }
  };


  const handleAnnouncementImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRoomImageError(null);
    setRoomImageUploading(true);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Gambar pengumuman hanya menerima JPG, PNG, atau WebP.');
      }
      const compressed = await compressImageFile(file);
      const uploaded = await uploadAnnouncementImage(compressed);
      setFormState({ ...formState, imageUrl: uploaded.fileUrl, imageFileKey: uploaded.fileKey, imageOriginalFilename: uploaded.originalFilename, imageMimeType: uploaded.mimeType, imageFileSizeBytes: uploaded.fileSizeBytes });
    } catch (err: any) {
      setRoomImageError(err?.message ?? 'Gagal mengunggah gambar pengumuman.');
    } finally {
      setRoomImageUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveRoomImage = (index: number) => {
    const existing = Array.isArray(formState.images) ? [...(formState.images as string[])] : [];
    existing.splice(index, 1);
    setFormState({ ...formState, images: existing });
  };

  const handlePromoteRoomImage = (index: number) => {
    const existing = Array.isArray(formState.images) ? [...(formState.images as string[])] : [];
    const [selected] = existing.splice(index, 1);
    if (!selected) return;
    setFormState({ ...formState, images: [selected, ...existing] });
  };

  const handleMoveRoomImage = (index: number, direction: -1 | 1) => {
    const existing = Array.isArray(formState.images) ? [...(formState.images as string[])] : [];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= existing.length) return;
    [existing[index], existing[nextIndex]] = [existing[nextIndex], existing[index]];
    setFormState({ ...formState, images: existing });
  };

  return (
    <>
    <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editingItem ? 'Edit Data' : 'Tambah Data'} — {config.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        {config.path === '/tenants' && editingItem && (editingItem.activeStayId || editingItem.currentStay) ? (
          <Alert variant="warning" className="mb-4">
            Tenant ini masih menempati kamar. Checkout atau batalkan stay terlebih dahulu dari modul Stays sebelum menonaktifkan tenant.
          </Alert>
        ) : null}

        {config.path === '/rooms' && editingItem && (editingItem.activeStayId || editingItem.currentStay) ? (
          <Alert variant="warning" className="mb-4">
            Kamar ini sedang ditempati tenant aktif. Selesaikan atau batalkan stay terlebih dahulu sebelum menonaktifkan kamar.
          </Alert>
        ) : null}

        {config.path === '/expenses' ? (
          <div className="resource-flow-guide mb-4">
            <div><span>1</span><strong>Pilih jenis biaya</strong><small>Tetap atau variabel, lalu kategori operasional.</small></div>
            <div><span>2</span><strong>Isi nominal</strong><small>Tulis tanggal, vendor, dan jumlah rupiah.</small></div>
            <div><span>3</span><strong>Review catatan</strong><small>Simpan hanya setelah deskripsi jelas.</small></div>
          </div>
        ) : null}

        {config.path === '/announcements' ? (
          <div className="resource-flow-guide mb-4">
            <div><span>1</span><strong>Pilih target</strong><small>Tenant, staff, atau semua audiens.</small></div>
            <div><span>2</span><strong>Tulis pesan</strong><small>Judul dan isi harus singkat, jelas, dan operasional.</small></div>
            <div><span>3</span><strong>Publish</strong><small>Pin atau jadwalkan hanya jika penting.</small></div>
          </div>
        ) : null}

        {config.path === '/inventory-movements' ? (
          <div className="resource-flow-guide mb-4">
            <div><span>1</span><strong>Mutasi resmi</strong><small>Owner/Admin saja. Staff cukup lapor kebutuhan.</small></div>
            <div><span>2</span><strong>Cek jumlah</strong><small>Pasang/kembali wajib pilih kamar.</small></div>
            <div><span>3</span><strong>Konfirmasi</strong><small>Gudang dan barang kamar tersinkron otomatis.</small></div>
          </div>
        ) : null}

        <Row className="g-3">
          {config.fields.map((field) => {
            const relationSpec = getRelationSpec(config.path, field.name);
            const relationSourceOptions = relationSpec ? (referenceOptions[relationSpec.sourcePath] ?? []) : [];
            const relationValue = getReferenceLabel(config.path, field.name, formState[field.name], referenceMaps);
            const currentValue = formState[field.name];
            const isTenantIdDisabled = config.path === '/users' && field.name === 'tenantId' && formState.role !== 'TENANT';
            const isCheckboxBlocked = field.name === 'isActive'
              && ((config.path === '/tenants' && Boolean(editingItem?.activeStayId || editingItem?.currentStay))
              || (config.path === '/rooms' && Boolean(editingItem?.activeStayId || editingItem?.currentStay)));

            if (config.path === '/users' && field.name === 'tenantId' && formState.role !== 'TENANT') {
              return null;
            }

            if (config.path === '/inventory-movements' && field.name === 'roomId' && ['IN', 'OUT'].includes(String(formState.movementType ?? ''))) {
              return null;
            }

            if (config.path === '/expenses' && field.name === 'status' && !editingItem) {
              return null;
            }

            const handleRoomImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setRoomImageError(null);
    setRoomImageUploading(true);
    try {
      const existing = Array.isArray(formState.images) ? (formState.images as string[]) : [];
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('Galeri kamar hanya menerima JPG, PNG, atau WebP.');
        }
        const compressed = await compressImageFile(file);
        const uploaded = await uploadRoomImage(compressed);
        uploadedUrls.push(uploaded.fileUrl);
      }
      setFormState({ ...formState, images: [...existing, ...uploadedUrls] });
    } catch (err: any) {
      setRoomImageError(err?.message ?? 'Gagal mengunggah gambar kamar.');
    } finally {
      setRoomImageUploading(false);
      event.target.value = '';
    }
  };


  const handleAnnouncementImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRoomImageError(null);
    setRoomImageUploading(true);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Gambar pengumuman hanya menerima JPG, PNG, atau WebP.');
      }
      const compressed = await compressImageFile(file);
      const uploaded = await uploadAnnouncementImage(compressed);
      setFormState({ ...formState, imageUrl: uploaded.fileUrl, imageFileKey: uploaded.fileKey, imageOriginalFilename: uploaded.originalFilename, imageMimeType: uploaded.mimeType, imageFileSizeBytes: uploaded.fileSizeBytes });
    } catch (err: any) {
      setRoomImageError(err?.message ?? 'Gagal mengunggah gambar pengumuman.');
    } finally {
      setRoomImageUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveRoomImage = (index: number) => {
    const existing = Array.isArray(formState.images) ? [...(formState.images as string[])] : [];
    existing.splice(index, 1);
    setFormState({ ...formState, images: existing });
  };

  return (
              <Col md={field.type === 'textarea' ? 12 : 6} key={field.name}>
                <Form.Group>
                  <Form.Label>
                    {field.label}
                    {field.required ? <span className="text-danger ms-1">*</span> : null}
                  </Form.Label>

                  {relationSpec && relationFieldNames.has(field.name) ? (
                    <SearchableSelect<number>
                      key={`${config.path}-${field.name}-${relationSourceOptions.map((option) => option.value).join('-')}`}
                      value={relationValue ? { value: relationValue.value, label: relationValue.label } : null}
                      onChange={(option) => updateField(field.name, option?.value ?? '')}
                      defaultOptions={relationSourceOptions.map((option) => ({ value: option.value, label: option.label }))}
                      loadOptions={async (inputValue) => {
                        const normalized = inputValue.trim().toLowerCase();
                        const sourceOptions = relationSourceOptions;
                        return sourceOptions
                          .filter((option) => {
                            if (!normalized) return true;
                            const caption = option.caption?.toLowerCase() ?? '';
                            return option.label.toLowerCase().includes(normalized) || caption.includes(normalized);
                          })
                          .map((option) => ({ value: option.value, label: option.label }));
                      }}
                      placeholder={relationSpec.placeholder}
                      isDisabled={isTenantIdDisabled}
                    />
                  ) : field.type === 'select' && (config.path === '/expenses' || config.path === '/announcements') ? (
                    <div className="flow-choice-grid" role="group" aria-label={field.label}>
                      {getFieldOptionsForContext(config, field.name, user?.role).map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          className={`flow-choice-chip${String(currentValue ?? '') === option.value ? ' active' : ''}`}
                          onClick={() => updateField(field.name, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : field.type === 'select' ? (
                    <Form.Select
                      value={String(currentValue ?? '')}
                      onChange={(event) => updateField(field.name, event.target.value)}
                    >
                      <option value="">Pilih {field.label}</option>
                      {getFieldOptionsForContext(config, field.name, user?.role).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Form.Select>
                  ) : config.path === '/rooms' && field.name === 'images' ? (
                    <div className="room-image-manager">
                      <Form.Control type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleRoomImageUpload} disabled={roomImageUploading} />
                      <Form.Text muted>Unggah beberapa foto kamar. Foto pertama otomatis menjadi cover utama di katalog, halaman detail, dan halaman booking.</Form.Text>
                      {roomImageError ? <Alert variant="danger" className="mt-2 mb-0 py-2">{roomImageError}</Alert> : null}
                      {roomImageUploading ? <div className="small mt-2 text-muted">Mengunggah gambar kamar...</div> : null}
                      {Array.isArray(currentValue) && currentValue.length ? (
                        <div className="room-image-grid mt-3">
                          {(currentValue as string[]).map((url, index) => {
                            const absoluteUrl = resolveAbsoluteFileUrl(url);
                            const isCover = index === 0;
                            return (
                              <div key={`${url}-${index}`} className={`room-image-card ${isCover ? 'is-cover' : ''}`}>
                                <button type="button" className="room-image-preview" onClick={() => setZoomImageUrl(absoluteUrl ?? url)}>
                                  <SafeImage src={absoluteUrl ?? url} alt={`Foto kamar ${index + 1}`} />
                                </button>
                                <div className="room-image-badge">{isCover ? 'Foto utama' : `Foto detail ${index}`}</div>
                                <div className="room-image-actions">
                                  {!isCover ? <Button size="sm" variant="outline-primary" onClick={() => handlePromoteRoomImage(index)}>Jadikan utama</Button> : null}
                                  <Button size="sm" variant="outline-secondary" disabled={index === 0} onClick={() => handleMoveRoomImage(index, -1)}>←</Button>
                                  <Button size="sm" variant="outline-secondary" disabled={index === (currentValue as string[]).length - 1} onClick={() => handleMoveRoomImage(index, 1)}>→</Button>
                                  <Button size="sm" variant="outline-danger" onClick={() => handleRemoveRoomImage(index)}>Hapus</Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : config.path === '/announcements' && field.name === 'imageUrl' ? (
                    <div>
                      <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAnnouncementImageUpload} disabled={roomImageUploading} />
                      <Form.Text muted>Unggah satu gambar cover pengumuman. Preview akan tampil kecil dan bisa di-zoom.</Form.Text>
                      {roomImageError ? <Alert variant="danger" className="mt-2 mb-0 py-2">{roomImageError}</Alert> : null}
                      {roomImageUploading ? <div className="small mt-2 text-muted">Mengunggah gambar pengumuman...</div> : null}
                      {typeof currentValue === 'string' && currentValue ? (() => { const absoluteUrl = resolveAbsoluteFileUrl(currentValue); return (
                        <div className="mt-3" style={{ width: 140 }}>
                          <button type="button" className="btn btn-link p-0 border rounded overflow-hidden w-100 bg-white" onClick={() => setZoomImageUrl(absoluteUrl ?? currentValue)}>
                            <SafeImage src={absoluteUrl ?? currentValue} alt="Gambar pengumuman" style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block' }} />
                          </button>
                          <Button size="sm" variant="outline-danger" className="w-100 mt-1" onClick={() => setFormState({ ...formState, imageUrl: '', imageFileKey: '', imageOriginalFilename: '', imageMimeType: '', imageFileSizeBytes: '' })}>Hapus</Button>
                        </div>
                      ); })() : null}
                    </div>
                  ) : field.type === 'textarea' ? (
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={String(currentValue ?? '')}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'checkbox' ? (
                    <Form.Check
                      type="switch"
                      checked={Boolean(currentValue)}
                      disabled={isCheckboxBlocked}
                      onChange={(event) => updateField(field.name, event.target.checked)}
                      label={field.label}
                    />
                  ) : field.type === 'currency' ? (
                    <CurrencyInput
                      value={typeof currentValue === 'number' ? currentValue : currentValue ? Number(currentValue) : undefined}
                      onChange={(value) => updateField(field.name, value ?? '')}
                      placeholder={field.placeholder}
                    />
                  ) : config.path === '/announcements' && field.name === 'startsAt' ? (
                    <Form.Control
                      type="date"
                      value={String(currentValue ?? '')}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : config.path === '/announcements' && field.name === 'expiresAt' ? (
                    <Form.Control
                      type="date"
                      value={String(currentValue ?? '')}
                      min={
                        formState.startsAt
                          ? (() => { const next = new Date(formState.startsAt as string); next.setDate(next.getDate() + 1); return next.toISOString().slice(0, 10); })()
                          : new Date().toISOString().slice(0, 10)
                      }
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <Form.Control
                      type={field.type}
                      value={String(currentValue ?? '')}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </Form.Group>
              </Col>
            );
          })}
        </Row>

        {config.path === '/tenants' && editingItem ? (
          <Card className="border-0 bg-light mt-4">
            <Card.Body>
              <h6 className="mb-3">Portal Access Tenant</h6>
              {hasPortalUser ? (
                <Alert variant={currentPortalIsActive ? 'success' : 'secondary'} className="mb-0">
                  <div className="fw-semibold mb-2">Informasi Portal</div>
                  <div><strong>Email portal:</strong> {portalSummary?.portalEmail ?? '-'}</div>
                  <div><strong>Status:</strong> {currentPortalIsActive ? 'Aktif' : 'Nonaktif'}</div>
                  <div className="small text-muted mt-1">
                    Ubah field “Email Tenant & Login Portal” di atas lalu simpan untuk memperbarui email login ini.
                  </div>
                  <div>
                    <strong>Terakhir login:</strong>{' '}
                    {portalSummary?.lastLoginAt ? formatDateOnly(portalSummary.lastLoginAt) : 'Belum pernah login'}
                  </div>

                  {toggleError ? <Alert variant="danger" className="mt-3 mb-0 py-2">{toggleError}</Alert> : null}
                  {toggleSuccess ? <Alert variant="success" className="mt-3 mb-0 py-2">{toggleSuccess}</Alert> : null}
                  {resetError ? <Alert variant="danger" className="mt-3 mb-0 py-2">{resetError}</Alert> : null}
                  {resetSuccess ? <Alert variant="success" className="mt-3 mb-0 py-2">{resetSuccess}</Alert> : null}

                  {canTogglePortalAccess ? (
                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                        <div>
                          <div className="fw-semibold">Kontrol akses portal</div>
                          <div className="small text-muted">
                            {currentPortalIsActive ? 'Nonaktifkan untuk mencegah tenant login ke portal.' : 'Aktifkan untuk mengizinkan tenant login ke portal.'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={currentPortalIsActive ? 'warning' : 'success'}
                          onClick={() => void handleTogglePortalAccess(!currentPortalIsActive)}
                          disabled={toggleLoading}
                        >
                          {toggleLoading ? 'Menyimpan...' : currentPortalIsActive ? 'Nonaktifkan Portal' : 'Aktifkan Portal'}
                        </Button>
                      </div>

                      {!showResetForm ? (
                        <Button size="sm" variant="outline-primary" onClick={() => setShowResetForm(true)}>
                          Reset Password Portal
                        </Button>
                      ) : (
                        <div>
                          <Form.Group className="mb-3">
                            <Form.Label>Password Baru</Form.Label>
                            <PasswordInput
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              placeholder="Minimal 8 karakter"
                            />
                          </Form.Group>
                          <div className="d-flex gap-2 justify-content-end">
                            <Button size="sm" variant="secondary" onClick={() => setShowResetForm(false)}>
                              Batal
                            </Button>
                            <Button size="sm" onClick={() => void handleResetPortalPassword()} disabled={resetLoading}>
                              {resetLoading ? 'Menyimpan...' : 'Reset Password'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="small text-muted mt-3">Hanya OWNER dan ADMIN yang dapat mengelola portal access.</div>
                  )}
                </Alert>
              ) : (
                <Alert variant="secondary" className="mb-0">
                  <div className="fw-semibold mb-2">Belum Punya Akun Portal</div>
                  <div>Tenant ini belum memiliki akun untuk login ke portal.</div>
                  {createError ? <Alert variant="danger" className="mt-3 mb-0 py-2">{createError}</Alert> : null}
                  {createSuccess ? <Alert variant="success" className="mt-3 mb-0 py-2">{createSuccess}</Alert> : null}
                  {canTogglePortalAccess ? (
                    <div className="mt-3 pt-3 border-top">
                      {!showCreateForm ? (
                        <Button size="sm" onClick={() => setShowCreateForm(true)} disabled={createLoading}>
                          Buat Akun Portal
                        </Button>
                      ) : (
                        <div>
                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              value={createFormData.email}
                              onChange={(event) => setCreateFormData((prev) => ({ ...prev, email: event.target.value }))}
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <PasswordInput
                              value={createFormData.password}
                              onChange={(event) => setCreateFormData((prev) => ({ ...prev, password: event.target.value }))}
                              placeholder="Minimal 8 karakter"
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>Nama Lengkap (opsional)</Form.Label>
                            <Form.Control
                              type="text"
                              value={createFormData.fullName}
                              onChange={(event) => setCreateFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                            />
                          </Form.Group>
                          <div className="d-flex gap-2 justify-content-end">
                            <Button size="sm" variant="secondary" onClick={() => setShowCreateForm(false)}>
                              Batal
                            </Button>
                            <Button size="sm" onClick={() => void handleCreatePortalAccess()} disabled={createLoading}>
                              {createLoading ? 'Menyimpan...' : 'Buat Akun Portal'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="small text-muted mt-3">Hanya OWNER dan ADMIN yang dapat membuat akun portal.</div>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        ) : null}
        {config.path === '/tenants' && editingItem?.id ? (
          <div className="mt-4">
            <KtpOcrValidateCard
              tenantId={Number(editingItem.id)}
              tenantName={String(editingItem.fullName ?? '')}
              ktpVerifiedAt={(editingItem.ktpVerifiedAt as string | null | undefined) ?? null}
              ktpVerificationMethod={(editingItem.ktpVerificationMethod as string | null | undefined) ?? null}
            />
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
      </Modal.Footer>
    </Modal>

    <Modal show={Boolean(zoomImageUrl)} onHide={() => setZoomImageUrl(null)} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Preview Gambar Kamar</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {zoomImageUrl ? <SafeImage src={zoomImageUrl} alt="Preview gambar" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} /> : null}
      </Modal.Body>
    </Modal>
    </>
  );
}
