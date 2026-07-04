import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import PasswordInput from '../../components/common/PasswordInput';
import { changePassword, updateMyTipInfo } from '../../api/auth';
import { getTenantProfile, fillTenantProfileOnboarding } from '../../api/tenants';
import type { TenantProfileOnboardingPayload } from '../../api/tenants';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';

// ═══════════════════════════════════════════════════════════
//  SECTION: Helpers
// ═══════════════════════════════════════════════════════════

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
  if (key === 'maritalStatus') {
    const map: Record<string, string> = { SINGLE: 'Belum Menikah', MARRIED: 'Menikah', DIVORCED: 'Cerai', WIDOWED: 'Janda/Duda' };
    return map[value as string] ?? String(value);
  }
  if (key === 'vehicleOwnership') {
    const map: Record<string, string> = { NONE: 'Tidak Ada', MOTORCYCLE: 'Motor', CAR: 'Mobil', BOTH: 'Motor & Mobil' };
    return map[value as string] ?? String(value);
  }
  if (key === 'smokingHabit') {
    const map: Record<string, string> = { NEVER: 'Tidak Merokok', OCCASIONAL: 'Kadang-kadang', REGULAR: 'Perokok Aktif' };
    return map[value as string] ?? String(value);
  }
  if (key === 'howDidYouHear') {
    const map: Record<string, string> = {
      GOOGLE_MAPS: 'Google Maps', WALK_IN: 'Langsung Datang', REFERRAL: 'Dari Teman/Keluarga',
      INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', WHATSAPP: 'WhatsApp', FACEBOOK: 'Facebook',
      WEBSITE: 'Website', OTA: 'Platform Online (OTA)', OTHER: 'Lainnya',
    };
    return map[value as string] ?? String(value);
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

// ── R-14: masking NIK sesuai UU PDP No. 27/2022 ──────────────────────────────

function maskNik(nik: string): string {
  if (nik.length >= 8) return `${nik.slice(0, 4)}xxxxxxxx${nik.slice(-4)}`;
  return '****';
}

// ── KTP OCR parser (Indonesian KTP format) ───────────────────────────────────

interface OcrResult {
  nik?: string;
  gender?: string;
  birthDate?: string;
  originCity?: string;
}

function parseKtpText(text: string): OcrResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  const result: OcrResult = {};

  // NIK: 16 consecutive digits
  const nikMatch = joined.match(/\b(\d{16})\b/);
  if (nikMatch) result.nik = nikMatch[1];

  // Jenis Kelamin
  if (/LAKI[\s-]*LAKI/i.test(joined)) result.gender = 'MALE';
  else if (/PEREMPUAN/i.test(joined)) result.gender = 'FEMALE';

  // Tempat/Tgl Lahir — format: KOTA, DD-MM-YYYY or DD/MM/YYYY
  const tglMatch = joined.match(/(?:TEMPAT[^:]*:|TGL LAHIR[^:]*:|LAHIR[^:]*:)?\s*([A-Z\s]+),\s*(\d{2})[-/](\d{2})[-/](\d{4})/i);
  if (tglMatch) {
    const [, city, dd, mm, yyyy] = tglMatch;
    result.originCity = city.trim().replace(/\s+/g, ' ');
    result.birthDate = `${yyyy}-${mm}-${dd}`;
  } else {
    // Fallback: just date without city
    const dateMatch = joined.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dateMatch) {
      const [, dd, mm, yyyy] = dateMatch;
      result.birthDate = `${yyyy}-${mm}-${dd}`;
    }
  }

  return result;
}

// ── KTP OCR section component ─────────────────────────────────────────────────

type OcrState = 'idle' | 'selected' | 'processing' | 'done' | 'error';

interface KtpOcrSectionProps {
  onApply: (data: { gender?: string; birthDate?: string; originCity?: string }) => void;
}

function KtpOcrSection({ onApply }: KtpOcrSectionProps) {
  const [ocrState, setOcrState] = useState<OcrState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<OcrResult | null>(null);
  const [editedExtracted, setEditedExtracted] = useState<OcrResult>({});
  const [ocrError, setOcrError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOcrError('Pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    setOcrError('');
    setExtracted(null);
    setOcrState('selected');
    const url = URL.createObjectURL(file);
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
  }, []);

  const handleOcr = useCallback(async () => {
    if (!fileRef.current?.files?.[0]) return;
    setOcrState('processing');
    setOcrError('');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('ind+eng', 1, {
        logger: () => {},
      });
      const { data: { text } } = await worker.recognize(fileRef.current.files[0]);
      await worker.terminate();
      const parsed = parseKtpText(text);
      setExtracted(parsed);
      setEditedExtracted(parsed);
      setOcrState('done');
    } catch {
      setOcrState('error');
      setOcrError('OCR gagal diproses. Coba gambar yang lebih jelas atau isi manual.');
    }
  }, []);

  const handleApply = useCallback(() => {
    const { nik: _nik, ...profileFields } = editedExtracted;
    onApply(profileFields);
  }, [editedExtracted, onApply]);

  const hasAnyExtracted = extracted && Object.values(extracted).some(Boolean);

  return (
    <Card className="content-card border-0 mt-4">
      <Card.Body>
        <h5 className="mb-1">Scan KTP — Isi Otomatis</h5>
        <p className="text-muted small mb-3">
          Foto KTP akan diproses langsung di perangkat kamu (tidak dikirim ke server).
          Hasil OCR mungkin tidak 100% akurat — periksa dan koreksi sebelum diterapkan.
        </p>

        {ocrError ? <Alert variant="warning" className="mb-3">{ocrError}</Alert> : null}

        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <Button variant="outline-secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Pilih Foto KTP
          </Button>
          {ocrState === 'selected' && (
            <Button variant="primary" size="sm" onClick={handleOcr}>
              Proses OCR
            </Button>
          )}
          {ocrState === 'processing' && (
            <span className="text-muted small d-flex align-items-center gap-2">
              <Spinner size="sm" animation="border" /> Membaca teks KTP...
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {previewUrl && (
          <img
            ref={imgRef}
            src={previewUrl}
            alt="Preview KTP"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #dee2e6', marginBottom: 12 }}
          />
        )}

        {ocrState === 'done' && hasAnyExtracted && (
          <div>
            <p className="small fw-semibold mb-2">Hasil OCR — periksa dan koreksi jika perlu:</p>
            <div className="d-flex flex-column gap-2 mb-3" style={{ maxWidth: 360 }}>
              {extracted?.nik && (
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small" style={{ minWidth: 120 }}>NIK (info)</span>
                  <code className="small">{extracted.nik}</code>
                </div>
              )}
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small" style={{ minWidth: 120 }}>Jenis Kelamin</span>
                <Form.Select
                  size="sm"
                  style={{ flex: 1 }}
                  value={editedExtracted.gender ?? ''}
                  onChange={(e) => setEditedExtracted((p) => ({ ...p, gender: e.target.value || undefined }))}
                >
                  <option value="">Pilih...</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </Form.Select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small" style={{ minWidth: 120 }}>Tgl Lahir</span>
                <Form.Control
                  size="sm"
                  type="date"
                  style={{ flex: 1 }}
                  value={editedExtracted.birthDate ?? ''}
                  onChange={(e) => setEditedExtracted((p) => ({ ...p, birthDate: e.target.value || undefined }))}
                />
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small" style={{ minWidth: 120 }}>Kota Lahir</span>
                <Form.Control
                  size="sm"
                  type="text"
                  style={{ flex: 1 }}
                  value={editedExtracted.originCity ?? ''}
                  onChange={(e) => setEditedExtracted((p) => ({ ...p, originCity: e.target.value || undefined }))}
                />
              </div>
            </div>
            <Button variant="success" size="sm" onClick={handleApply}>
              Terapkan ke Formulir
            </Button>
            <span className="text-muted small ms-2">
              Hanya mengisi field yang masih kosong di formulir profil.
            </span>
          </div>
        )}

        {ocrState === 'done' && !hasAnyExtracted && (
          <Alert variant="warning" className="mb-0">
            Teks KTP tidak berhasil dibaca. Coba gambar yang lebih terang/tajam, atau isi formulir manual.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

// ── field definitions ─────────────────────────────────────────────────────────

type OnboardingFieldDef =
  | { key: string; label: string; type: 'text' | 'date' | 'tel'; marketing?: false }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; marketing?: boolean };

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

const MARKETING_FIELD_DEFS: OnboardingFieldDef[] = [
  {
    key: 'maritalStatus',
    label: 'Status pernikahan',
    type: 'select',
    marketing: true,
    options: [
      { value: 'SINGLE', label: 'Belum Menikah' },
      { value: 'MARRIED', label: 'Menikah' },
      { value: 'DIVORCED', label: 'Cerai' },
      { value: 'WIDOWED', label: 'Janda/Duda' },
    ],
  },
  {
    key: 'vehicleOwnership',
    label: 'Kendaraan yang dimiliki',
    type: 'select',
    marketing: true,
    options: [
      { value: 'NONE', label: 'Tidak ada' },
      { value: 'MOTORCYCLE', label: 'Motor' },
      { value: 'CAR', label: 'Mobil' },
      { value: 'BOTH', label: 'Motor & Mobil' },
    ],
  },
  {
    key: 'smokingHabit',
    label: 'Kebiasaan merokok',
    type: 'select',
    marketing: true,
    options: [
      { value: 'NEVER', label: 'Tidak merokok' },
      { value: 'OCCASIONAL', label: 'Kadang-kadang (sosial)' },
      { value: 'REGULAR', label: 'Perokok aktif' },
    ],
  },
  {
    key: 'howDidYouHear',
    label: 'Tahu KOST48 dari mana?',
    type: 'select',
    marketing: true,
    options: [
      { value: 'REFERRAL', label: 'Dari teman/keluarga' },
      { value: 'GOOGLE_MAPS', label: 'Google Maps' },
      { value: 'INSTAGRAM', label: 'Instagram' },
      { value: 'TIKTOK', label: 'TikTok' },
      { value: 'WALK_IN', label: 'Langsung datang' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'WEBSITE', label: 'Website' },
      { value: 'OTHER', label: 'Lainnya' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
//  COMPONENT: ProfilePage — Main
// ═══════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTenant = user?.role === 'TENANT';
  const isStaff = user?.role === 'STAFF';
  const [showNik, setShowNik] = useState(false);

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Onboarding form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Marketing form state (always editable, separate save)
  const [marketingData, setMarketingData] = useState<Record<string, string>>({});
  const [marketingSaveError, setMarketingSaveError] = useState('');
  const [marketingSaveSuccess, setMarketingSaveSuccess] = useState(false);

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

  const saveMutation = useMutation({
    mutationFn: () => {
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

  const marketingMutation = useMutation({
    mutationFn: () => {
      const payload: TenantProfileOnboardingPayload = {};
      for (const field of MARKETING_FIELD_DEFS) {
        const val = marketingData[field.key];
        if (val && val.trim() !== '') {
          (payload as Record<string, string>)[field.key] = val.trim();
        }
      }
      return fillTenantProfileOnboarding(payload);
    },
    onSuccess: () => {
      setMarketingSaveSuccess(true);
      setMarketingSaveError('');
      queryClient.invalidateQueries({ queryKey: ['tenant-self-profile'] });
    },
    onError: (err: unknown) => {
      setMarketingSaveError(getApiErrorMessage(err, 'Gagal menyimpan. Coba lagi.'));
      setMarketingSaveSuccess(false);
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

  // Apply OCR result: only fill fields that are still empty in the form
  const handleOcrApply = (data: { gender?: string; birthDate?: string; originCity?: string }) => {
    setFormData((prev) => {
      const next = { ...prev };
      const missingFields = completion?.missingFields ?? [];
      if (data.gender && missingFields.includes('gender') && !prev.gender) next.gender = data.gender;
      if (data.birthDate && missingFields.includes('birthDate') && !prev.birthDate) next.birthDate = data.birthDate;
      if (data.originCity && missingFields.includes('originCity') && !prev.originCity) next.originCity = data.originCity;
      return next;
    });
  };

  const hasAnyInput = ONBOARDING_FIELD_DEFS.some(
    (f) =>
      (completion?.missingFields ?? []).includes(f.key) &&
      formData[f.key] &&
      formData[f.key].trim() !== '',
  );

  const hasAnyMarketingInput = MARKETING_FIELD_DEFS.some(
    (f) => marketingData[f.key] && marketingData[f.key].trim() !== '',
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

      {/* ── Staff: Info Tip ── */}
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

      {/* ── Tenant: KTP OCR ── */}
      {isTenant && (
        <KtpOcrSection onApply={handleOcrApply} />
      )}

      {/* ── Tenant onboarding: Data Penghuni Tambahan ── */}
      {isTenant && (
        <Card className="tenant-profile-onboarding-card border-0 mt-4">
          <Card.Body>
            <div className="tp-onboarding-header">
              <div>
                <h5 className="mb-0">Data Penghuni</h5>
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

            {profileQuery.isLoading && (
              <p className="text-muted small mt-3">Memuat data penghuni...</p>
            )}
            {profileQuery.isError && (
              <Alert variant="warning" className="mt-3">
                Gagal memuat data penghuni. Coba muat ulang halaman.
              </Alert>
            )}
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
            {completion?.isLocked && !profileQuery.isLoading && (
              <div className="tp-all-locked-notice mt-3">
                <span>✓</span>
                <span>Semua data penghuni sudah terisi dan tersimpan. Hubungi pengelola jika ada yang perlu diubah.</span>
              </div>
            )}

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

            {/* R-14: NIK / Nomor KTP */}
            {profile && tenantData?.identityNumber ? (
              <div className="tp-field tp-field--locked mt-3">
                <label className="tp-field-label">Nomor KTP / NIK</label>
                <div className="tp-field-value d-flex align-items-center gap-2 font-monospace">
                  {showNik ? tenantData.identityNumber : maskNik(tenantData.identityNumber)}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-muted"
                    onClick={() => setShowNik((v) => !v)}
                    aria-label={showNik ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                  >
                    {showNik ? '🙈 Sembunyikan' : '👁 Tampilkan'}
                  </Button>
                </div>
                <small className="tp-field-lock-hint">
                  NIK disembunyikan secara default sesuai UU PDP No. 27/2022.
                </small>
              </div>
            ) : null}

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

      {/* ── Tenant: Info Tambahan untuk Analisa Marketing ── */}
      {isTenant && (
        <Card className="content-card border-0 mt-4">
          <Card.Body>
            <h5 className="mb-1">Info Tambahan (Opsional)</h5>
            <p className="text-muted small mb-3">
              Membantu pengelola memahami kebutuhan penghuni dan meningkatkan layanan.
              Data ini bersifat rahasia dan hanya dilihat oleh pengelola. Bisa diperbarui kapan saja.
            </p>

            {marketingSaveSuccess && (
              <Alert variant="success" className="mb-3" dismissible onClose={() => setMarketingSaveSuccess(false)}>
                Info tambahan berhasil disimpan.
              </Alert>
            )}
            {marketingSaveError && (
              <Alert variant="danger" className="mb-3" dismissible onClose={() => setMarketingSaveError('')}>
                {marketingSaveError}
              </Alert>
            )}

            {profileQuery.isLoading ? (
              <p className="text-muted small">Memuat...</p>
            ) : (
              <div className="tp-fields-grid">
                {MARKETING_FIELD_DEFS.map((fieldDef) => {
                  const currentVal = (tenantData as Record<string, unknown> | undefined)?.[fieldDef.key];
                  const displayVal = formatFieldDisplay(fieldDef.key, currentVal);
                  return (
                    <div key={fieldDef.key} className="tp-field tp-field--editable">
                      <label className="tp-field-label" htmlFor={`mkt-${fieldDef.key}`}>
                        {fieldDef.label}
                        {displayVal !== '-' && (
                          <span className="text-muted fw-normal ms-1 small">({displayVal})</span>
                        )}
                      </label>
                      {fieldDef.type === 'select' && (
                        <Form.Select
                          id={`mkt-${fieldDef.key}`}
                          size="sm"
                          value={marketingData[fieldDef.key] ?? ''}
                          onChange={(e) => {
                            setMarketingData((p) => ({ ...p, [fieldDef.key]: e.target.value }));
                            if (marketingSaveSuccess) setMarketingSaveSuccess(false);
                          }}
                        >
                          <option value="">Pilih... {displayVal !== '-' ? `(saat ini: ${displayVal})` : ''}</option>
                          {fieldDef.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </Form.Select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="tp-save-row mt-3">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => marketingMutation.mutate()}
                disabled={marketingMutation.isPending || !hasAnyMarketingInput}
              >
                {marketingMutation.isPending ? 'Menyimpan...' : 'Simpan Info Tambahan'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
