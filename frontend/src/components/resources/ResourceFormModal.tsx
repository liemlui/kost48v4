import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { createPortalAccess, resetPortalPassword, togglePortalAccess } from '../../api/tenants';
import { getFieldOptionsForContext, ResourceConfig } from '../../config/resources';
import { useAuth } from '../../context/AuthContext';
import { getRelationSpec, getReferenceLabel, ReferenceOption } from '../../pages/resources/resourceRelations';
import type { PortalUserSummary } from '../../types';
import CurrencyInput from '../common/CurrencyInput';
import SearchableSelect from '../common/SearchableSelect';

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

  return (
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

        <Row className="g-3">
          {config.fields.map((field) => {
            const relationSpec = getRelationSpec(config.path, field.name);
            const relationValue = getReferenceLabel(config.path, field.name, formState[field.name], referenceMaps);
            const currentValue = formState[field.name];
            const isTenantIdDisabled = config.path === '/users' && field.name === 'tenantId' && formState.role !== 'TENANT';
            const isCheckboxBlocked = field.name === 'isActive'
              && ((config.path === '/tenants' && Boolean(editingItem?.activeStayId || editingItem?.currentStay))
              || (config.path === '/rooms' && Boolean(editingItem?.activeStayId || editingItem?.currentStay)));

            if (config.path === '/users' && field.name === 'tenantId' && formState.role !== 'TENANT') {
              return null;
            }

            return (
              <Col md={field.type === 'textarea' ? 12 : 6} key={field.name}>
                <Form.Group>
                  <Form.Label>
                    {field.label}
                    {field.required ? <span className="text-danger ms-1">*</span> : null}
                  </Form.Label>

                  {relationSpec && relationFieldNames.has(field.name) ? (
                    <SearchableSelect<number>
                      value={relationValue ? { value: relationValue.value, label: relationValue.label } : null}
                      onChange={(option) => updateField(field.name, option?.value ?? '')}
                      defaultOptions={(referenceOptions[relationSpec.sourcePath] ?? []).map((option) => ({ value: option.value, label: option.label }))}
                      loadOptions={async (inputValue) => {
                        const normalized = inputValue.trim().toLowerCase();
                        const sourceOptions = referenceOptions[relationSpec.sourcePath] ?? [];
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
                  <div>
                    <strong>Terakhir login:</strong>{' '}
                    {portalSummary?.lastLoginAt ? new Date(portalSummary.lastLoginAt).toLocaleDateString('id-ID') : 'Belum pernah login'}
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
                            <Form.Control
                              type="password"
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
                            <Form.Control
                              type="password"
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
