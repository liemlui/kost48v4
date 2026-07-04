import { FormEvent, useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/common/PasswordInput';
import Kost48LogoMark from '../../components/common/Kost48LogoMark';
import Kost48DecorGallery from '../../components/common/Kost48DecorGallery';
import { officialKost48Highlights, officialKost48Location } from '../../data/officialKost48Content';
import { getDefaultRoute } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

type LoginMode = 'TENANT' | 'BACKOFFICE';

const isBackofficeRole = (role: UserRole) => role === 'OWNER' || role === 'ADMIN' || role === 'STAFF';

function normalizeLoginError(message: unknown) {
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return 'Email/nomor HP atau password belum cocok. Cek kembali data yang kamu masukkan.';
}

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<LoginMode>('TENANT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  const modeCopy = useMemo(() => {
    if (mode === 'TENANT') {
      return {
        subtitle: 'Cek pemesanan, tagihan, dan laporan kamu.',
        helper: 'Penghuni masuk untuk cek kamar, tagihan, dan laporan kos.',
        identifierLabel: 'Email atau No. HP',
        identifierPlaceholder: 'Contoh: nama@email.com atau 0812...',
        passwordPlaceholder: 'Masukkan password',
        expectedRoleError: 'Akun ini adalah akun pengelola. Gunakan tab Admin / Operasional untuk masuk ke area kerja kos.',
      };
    }
    return {
      subtitle: 'Kelola operasional, keuangan, dan tim KOST48.',
      helper: 'Area kerja owner, admin, dan staff KOST48.',
      identifierLabel: 'Email Admin / Staff',
      identifierPlaceholder: 'admin@kost48.com',
      passwordPlaceholder: 'Masukkan password admin',
      expectedRoleError: 'Akun ini adalah akun penghuni. Gunakan tab Penghuni untuk masuk ke portal kamu.',
    };
  }, [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = mode === 'TENANT' ? 'Masukkan email atau nomor HP yang terdaftar.' : 'Masukkan email admin/staff.';
    } else if (mode === 'TENANT') {
      // Deteksi format: jika mengandung @ → email; jika diawali 0 dan 10-13 digit → HP
      const val = identifier.trim();
      const isEmail = val.includes('@');
      const isPhone = /^0\d{9,12}$/.test(val.replace(/[-\s]/g, ''));
      if (!isEmail && !isPhone) {
        nextErrors.identifier = 'Format tidak dikenal. Masukkan email (contoh: nama@email.com) atau nomor HP (contoh: 08123456789).';
      }
    }
    if (!password.trim()) nextErrors.password = 'Masukkan password.';

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password);
      if (mode === 'TENANT' && user.role !== 'TENANT') {
        logout();
        setFieldErrors({ form: modeCopy.expectedRoleError });
        return;
      }
      if (mode === 'BACKOFFICE' && !isBackofficeRole(user.role)) {
        logout();
        setFieldErrors({ form: modeCopy.expectedRoleError });
        return;
      }
      navigate(from || getDefaultRoute(user.role), { replace: true });
    } catch (err: any) {
      setFieldErrors({ form: normalizeLoginError(err?.response?.data?.message) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeChange = (nextMode: LoginMode) => {
    setMode(nextMode);
    setFieldErrors({});
  };

  return (
    <div className="login-shell login-experience-v518d">
      <div className="login-wrap">
        <section className="login-aside" aria-label="Tentang KOST48 Surabaya">
          <div className="login-chip"><span /> {officialKost48Location.address}</div>
          <h1 className="login-title">Kos nyaman &amp; terurus — satu portal untuk semuanya.</h1>
          <p className="login-copy">
            Pilih kamar, pantau pemesanan, cek tagihan, dan laporkan kebutuhan kos dari satu portal KOST48.
          </p>

          <Kost48DecorGallery variant="auth" maxItems={1} />

          <div className="login-feature-list">
            {officialKost48Highlights.slice(1, 4).map((item) => (
              <div key={item.title} className="login-feature-item">
                <div className="login-feature-icon">{item.icon}</div>
                <div>
                  <strong>{item.title}</strong>
                  <div className="mt-1 small">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="login-panel" aria-label="Form masuk KOST48">
          <Kost48LogoMark size="login" className="login-mark" />
          <div className="login-heading-block text-center">
            <h2>Masuk ke Portal KOST48</h2>
            <p>{modeCopy.subtitle}</p>
          </div>

          <div className="login-segment" role="tablist" aria-label="Pilih jenis akun">
            <button
              type="button"
              className={mode === 'TENANT' ? 'active' : ''}
              role="tab"
              aria-selected={mode === 'TENANT'}
              onClick={() => handleModeChange('TENANT')}
            >
              <svg className="login-segment-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Penghuni
            </button>
            <button
              type="button"
              className={mode === 'BACKOFFICE' ? 'active' : ''}
              role="tab"
              aria-selected={mode === 'BACKOFFICE'}
              onClick={() => handleModeChange('BACKOFFICE')}
            >
              <svg className="login-segment-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Admin / Operasional
            </button>
          </div>

          <div className={`login-helper-card ${mode === 'BACKOFFICE' ? 'admin' : ''}`}>
            {modeCopy.helper}
          </div>

          {fieldErrors.form ? <div className="login-form-error" role="alert">{fieldErrors.form}</div> : null}

          {/* noValidate: validasi kustom berbahasa Indonesia di handleSubmit — tanpa ini,
              atribut `required` membuat browser memblokir submit dgn bubble bawaan (Inggris). */}
          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3">
              <Form.Label>{modeCopy.identifierLabel}</Form.Label>
              <Form.Control
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldErrors.identifier || fieldErrors.form) setFieldErrors((prev) => ({ ...prev, identifier: undefined, form: undefined }));
                }}
                type={mode === 'BACKOFFICE' ? 'email' : 'text'}
                placeholder={modeCopy.identifierPlaceholder}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete={mode === 'BACKOFFICE' ? 'email' : 'username'}
                inputMode={mode === 'TENANT' && /^\d/.test(identifier.trim()) ? 'tel' : 'email'}
                required
                isInvalid={Boolean(fieldErrors.identifier)}
              />
              {fieldErrors.identifier ? <div className="login-inline-error">{fieldErrors.identifier}</div> : null}
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Password</Form.Label>
              <PasswordInput
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password || fieldErrors.form) setFieldErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                }}
                placeholder={modeCopy.passwordPlaceholder}
                isInvalid={Boolean(fieldErrors.password)}
                autoComplete="current-password"
              />
              {fieldErrors.password ? <div className="login-inline-error">{fieldErrors.password}</div> : null}
            </Form.Group>

            <div className="login-forgot-row">
              <Link to="/forgot-password">Lupa password?</Link>
            </div>

            <Button type="submit" disabled={submitting} className="w-100 login-submit-btn">
              {submitting ? 'Memproses...' : 'Masuk'}
            </Button>


          </Form>

          {mode === 'TENANT' ? (
            <div className="login-catalog-card">
              <strong>Belum pernah booking?</strong>
              <span>Mulai dari lihat kamar dulu. Akun portal akan dibuat setelah pemesanan diproses.</span>
              <Link to="/rooms">Lihat Katalog Kamar →</Link>
            </div>
          ) : (
            <div className="login-backoffice-note">
              Area ini untuk owner, admin, dan staff KOST48. Gunakan akun penghuni di tab Penghuni.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
