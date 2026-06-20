import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PasswordInput from '../../components/common/PasswordInput';
import { changePassword, updateMyTipInfo } from '../../api/auth';
import { getTenantProfile, fillTenantProfileOnboarding } from '../../api/tenants';
import type { TenantProfileOnboardingPayload } from '../../api/tenants';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';

// ── helpers ───────────────────────────────────────────────────────────────────

function getUserTypeLabel(role?: string) {
  if (role === 'TENANT') return 'Penghuni';
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin Operasional';
  if (role === 'STAFF') return 'Staff';
  return '-';
}

function formatFieldDisplay(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (key === 'gender') {
    if (value === 'MALE') return 'Laki-laki';
    if (value === 'FEMALE') return 'Perempuan';
    if (value === 'OTHER') return 'Lainnya';
  }
  if (key === 'birthDate') {
    const d = new Date(value as string);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  }
  return String(value);
}

function getApiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
}

// ── field definitions ─────────────────────────────────────────────────────────

type OnboardingFieldDef =
  | { key: string; label: string; type: 'text' | 'date' | 'tel' }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] };

const ONBOARDING_FIELD_DEFS: OnboardingFieldDef[] = [
  {
    key: 'gender',
    label: 'Jenis kelamin',
    type: 'select',
    options: [
      { value: 'MALE', label: 'Laki-laki' },
      { value: 'FEMALE', label: 'Perempuan' },
      { value: 'OTHER', label: 'Lainnya' },
    ],
  },
  { key: 'birthDate', label: 'Tanggal lahir', type: 'date' },
  { key: 'originCity', label: 'Kota asal', type: 'text' },
  { key: 'occupation', label: 'Pekerjaan', type: 'text' },
  { key: 'companyOrCampus', label: 'Instansi / kampus', type: 'text' },
  { key: 'emergencyContactName', label: 'Nama kontak darurat', type: 'text' },
  { key: 'emergencyContactPhone', label: 'Telepon kontak darurat', type: 'tel' },
];

// ── component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTenant = user?.role === 'TENANT';
  const isStaff = user?.role === 'STAFF';

  // F5-2 (AUD-2): info tip P2P staf (self-service).
  const [tipForm, setTipForm] = useState({
    tipGopay: user?.tipGopay ?? '',
    tipOvo: user?.tipOvo ?? '',
    tipDana: user?.tipDana ?? '',
    tipShopeepay: user?.tipShopeepay ?? '',
    tipBank: user?.tipBank ?? '',
  });
  const [tipError, setTipError] = useState('');
  const [tipSuccess, setTipSuccess] = useState('');
  const tipMutation = useMutation({
    mutationFn: () => updateMyTipInfo(tipForm),
    onSuccess: () => {
      setTipSuccess('Info tip berhasil disimpan. Penghuni akan melihatnya di tiket yang sudah selesai.');
      setTipError('');
    },
    onError: (err: unknown) => {
      setTipError(getApiErrorMessage(err, 'Gagal menyimpan info tip.'));
      setTipSuccess('');
    },
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Onboarding form state (tenant only)
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch tenant profile
  const profileQuery = useQuery({
    queryKey: ['tenant-self-profile'],
    queryFn: getTenantProfile,
    enabled: isTenant,
    staleTime: 60_000,
    retry: false,
  });

  const profile = profileQuery.data;
  const completion = profile?.completion;
  const tenantData = profile?.tenant;

  // Password change mutation
  const pwMutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: currentPassword || undefined, newPassword }),
    onSuccess: () => {
      setPwSuccess('Password berhasil diperbarui. Gunakan password baru saat login berikutnya.');
      setPwError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: unknown) => {
      setPwError(getApiErrorMessage(err, 'Gagal mengubah password.'));
      setPwSuccess('');
    },
  });

  // Onboarding save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      // Only send non-empty values from formData (exclude locked fields)
      const missingFields = completion?.missingFields ?? [];
      const payload: TenantProfileOnboardingPayload = {};
      for (const field of ONBOARDING_FIELD_DEFS) {
        if (!missingFields.includes(field.key)) continue;
        const val = formData[field.key];
        if (val && val.trim() !== '') {
          (payload as Record<string, string>)[field.key] = val.trim();
        }
      }
      return fillTenantProfileOnboarding(payload);
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError('');
      setFormData({});
      queryClient.invalidateQueries({ queryKey: ['tenant-self-profile'] });
    },
    onError: (err: unknown) => {
      setSaveError(getApiErrorMessage(err, 'Gagal menyimpan data. Coba lagi.'));
      setSaveSuccess(false);
    },
  });

  const handlePwSubmit = () => {
    setPwError('');
    setPwSuccess('');
    if (!newPassword || newPassword.length < 8) {
      setPwError('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi password baru tidak cocok.');
      return;
    }
    pwMutation.mutate();
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (saveSuccess) setSaveSuccess(false);
    if (saveError) setSaveError('');
  };

  const hasAnyInput = ONBOARDING_FIELD_DEFS.some(
    (f) =>
      (completion?.missingFields ?? []).includes(f.key) &&
      formData[f.key] &&
      formData[f.key].trim() !== '',
  );

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description={
          isTenant
            ? 'Data akun penghuni dan password portal.'
            : 'Lihat data akun aktif dan lakukan perubahan password dengan aman.'
        }
      />

      {/* ── Account info + Password change ── */}
      <Row className="g-4">
        <Col lg={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">Informasi Akun</h5>
              <div className="mb-3">
                <div className="text-muted small">Nama lengkap</div>
                <div className="fw-semibold">{user?.fullName ?? '-'}</div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Email</div>
                <div className="fw-semibold">{user?.email ?? '-'}</div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Jenis akses</div>
                <div className="fw-semibold">{getUserTypeLabel(user?.role)}</div>
              </div>
              {isTenant ? (
                <div className="tenant-profile-safe-note">
                  Data penghuni kamu sudah terhubung dengan portal. Kalau nama, email, atau nomor HP salah, kirim laporan agar admin memperbarui data.
                </div>
              ) : (
                <div>
                  <div className="text-muted small">Penghuni terkait</div>
                  <div className="fw-semibold">{user?.tenantId ?? '-'}</div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="content-card border-0">
            <Card.Body>
              <h5 className="mb-2">Ganti Password</h5>
              <p className="text-muted small mb-3">
                Gunakan password minimal 8 karakter. Jangan bagikan password ke orang lain.
              </p>
              {pwError ? <Alert variant="danger">{pwError}</Alert> : null}
              {pwSuccess ? <Alert variant="success">{pwSuccess}</Alert> : null}

              <Form.Group className="mb-3">
                <Form.Label>Password Saat Ini</Form.Label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password lama jika diminta"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password Baru</Form.Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Konfirmasi Password Baru</Form.Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                />
              </Form.Group>

              <div className="d-flex justify-content-end">
                <Button onClick={handlePwSubmit} disabled={pwMutation.isPending}>
                  {pwMutation.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Staff: Info Tip (E-wallet) self-service (F5-2 / AUD-2) ── */}
      {isStaff && (
        <Card className="content-card border-0 mt-4">
          <Card.Body>
            <h5 className="mb-1">Info Tip (E-wallet / Bank)</h5>
            <p className="text-muted small mb-3">
              Isi tautan / nomor e-wallet kamu. Penghuni dapat memberi tip langsung ke kamu setelah keluhan
              selesai. Tip ini langsung dari penghuni ke kamu dan <strong>tidak dipotong / dicatat pengelola</strong>.
              Kosongkan untuk menghapus.
            </p>
            {tipError ? <Alert variant="danger">{tipError}</Alert> : null}
            {tipSuccess ? <Alert variant="success">{tipSuccess}</Alert> : null}
            <Row className="g-3">
              {([
                { key: 'tipGopay', label: 'GoPay', placeholder: 'Nomor GoPay / tautan' },
                { key: 'tipOvo', label: 'OVO', placeholder: 'Nomor OVO' },
                { key: 'tipDana', label: 'DANA', placeholder: 'Nomor DANA' },
                { key: 'tipShopeepay', label: 'ShopeePay', placeholder: 'Nomor ShopeePay' },
                { key: 'tipBank', label: 'Bank (nama bank + no. rekening + a.n.)', placeholder: 'mis. BCA 1234567890 a.n. Budi' },
              ] as const).map((f) => (
                <Col md={6} key={f.key}>
                  <Form.Group>
                    <Form.Label>{f.label}</Form.Label>
                    <Form.Control
                      value={tipForm[f.key]}
                      onChange={(e) => {
                        setTipForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                        if (tipSuccess) setTipSuccess('');
                        if (tipError) setTipError('');
                      }}
                      placeholder={f.placeholder}
                      maxLength={f.key === 'tipBank' ? 200 : 120}
                    />
                    <Form.Text muted>Kosongkan jika tidak dipakai.</Form.Text>
                  </Form.Group>
                </Col>
              ))}
            </Row>
            <div className="d-flex justify-content-end mt-3">
              <Button onClick={() => tipMutation.mutate()} disabled={tipMutation.isPending}>
                {tipMutation.isPending ? 'Menyimpan...' : 'Simpan Info Tip'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* ── Tenant onboarding: Data Penghuni Tambahan ── */}
      {isTenant && (
        <Card className="tenant-profile-onboarding-card border-0 mt-4">
          <Card.Body>
            {/* Header */}
            <div className="tp-onboarding-header">
              <div>
                <h5 className="mb-0">Data Penghuni Tambahan</h5>
                <p className="text-muted small mb-0 mt-1">
                  Isi sekali dengan benar. Setelah disimpan, perubahan perlu bantuan pengelola.
                </p>
              </div>
              {completion ? (
                <div className="tp-completion-badge">
                  <span>{completion.completedFields.length}</span>
                  <em>/{completion.requiredFields.length} data terisi</em>
                  {completion.isComplete && (
                    <span className="tp-complete-check">✓ Lengkap</span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Loading */}
            {profileQuery.isLoading && (
              <p className="text-muted small mt-3">Memuat data penghuni...</p>
            )}

            {profileQuery.isError && (
              <Alert variant="warning" className="mt-3">
                Gagal memuat data penghuni. Coba muat ulang halaman.
              </Alert>
            )}

            {/* Save feedback */}
            {saveSuccess && (
              <Alert variant="success" className="mt-3" dismissible onClose={() => setSaveSuccess(false)}>
                Data berhasil disimpan. Field yang sudah diisi dikunci untuk keamanan.
              </Alert>
            )}
            {saveError && (
              <Alert variant="danger" className="mt-3" dismissible onClose={() => setSaveError('')}>
                {saveError}
              </Alert>
            )}

            {/* All locked */}
            {completion?.isLocked && !profileQuery.isLoading && (
              <div className="tp-all-locked-notice mt-3">
                <span>✓</span>
                <span>Semua data penghuni sudah terisi dan tersimpan. Hubungi pengelola jika ada yang perlu diubah.</span>
              </div>
            )}

            {/* Field list */}
            {profile && !profileQuery.isLoading ? (
              <div className="tp-fields-grid mt-3">
                {ONBOARDING_FIELD_DEFS.map((fieldDef) => {
                  const isLocked = (completion?.lockedFields ?? []).includes(fieldDef.key);
                  const currentVal = (tenantData as Record<string, unknown> | undefined)?.[fieldDef.key];

                  if (isLocked) {
                    return (
                      <div key={fieldDef.key} className="tp-field tp-field--locked">
                        <label className="tp-field-label">{fieldDef.label}</label>
                        <div className="tp-field-value">
                          {formatFieldDisplay(fieldDef.key, currentVal)}
                        </div>
                        <small className="tp-field-lock-hint">
                          Sudah tersimpan — perubahan perlu bantuan pengelola.
                        </small>
                      </div>
                    );
                  }

                  return (
                    <div key={fieldDef.key} className="tp-field tp-field--editable">
                      <label className="tp-field-label" htmlFor={`tp-${fieldDef.key}`}>
                        {fieldDef.label}
                      </label>
                      {fieldDef.type === 'select' ? (
                        <Form.Select
                          id={`tp-${fieldDef.key}`}
                          size="sm"
                          value={formData[fieldDef.key] ?? ''}
                          onChange={(e) => handleFieldChange(fieldDef.key, e.target.value)}
                        >
                          <option value="">Pilih...</option>
                          {fieldDef.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          id={`tp-${fieldDef.key}`}
                          size="sm"
                          type={fieldDef.type}
                          value={formData[fieldDef.key] ?? ''}
                          onChange={(e) => handleFieldChange(fieldDef.key, e.target.value)}
                          placeholder={fieldDef.type === 'date' ? '' : `Isi ${fieldDef.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Save button */}
            {profile && !completion?.isLocked ? (
              <div className="tp-save-row mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !hasAnyInput}
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Data'}
                </Button>
                <small className="text-muted">
                  Field kosong yang tidak diisi akan tetap bisa diisi nanti.
                </small>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
