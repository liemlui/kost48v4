import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import Kost48LogoMark from '../../components/common/Kost48LogoMark';
import Kost48DecorGallery from '../../components/common/Kost48DecorGallery';
import { officialKost48Highlights, officialKost48Location } from '../../data/officialKost48Content';

const COOLDOWN_SECONDS = 60;
const ADMIN_WA = '6285648887628';

type ResetMode = 'email' | 'phone';

function isValidEmail(val: string) {
  const t = val.trim();
  return t.includes('@') && t.length > 5;
}

function isValidPhone(val: string) {
  return /^0\d{9,12}$/.test(val.trim().replace(/[-\s]/g, ''));
}

function buildWaUrl(phone?: string) {
  const msg = phone
    ? `Halo admin, saya lupa password akun Kost48. Nomor HP saya: ${phone.trim()}. Mohon bantu reset password saya.`
    : 'Halo admin, saya lupa password akun Kost48. Mohon bantu reset password saya.';
  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`;
}

function WaIcon() {
  return (
    <svg className="me-2 flex-shrink-0" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<ResetMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const switchMode = (next: ResetMode) => {
    setMode(next);
    setIdentifier('');
    setFieldError(null);
    setFormError(null);
    setSubmitted(false);
  };

  const startCooldown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const doRequest = async (id: string) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await forgotPassword({ identifier: id });
      if (result?.resetTokenPreview) setPreviewToken(result.resetTokenPreview);
      setSubmitted(true);
      startCooldown();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setFormError(Array.isArray(message) ? message.join(', ') : (message ?? 'Gagal memproses permintaan. Coba lagi.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(identifier)) { setFieldError('Masukkan alamat email yang valid.'); return; }
    setFieldError(null);
    await doRequest(identifier.trim());
  };

  const handleResend = () => {
    if (cooldown > 0 || submitting) return;
    doRequest(identifier.trim());
  };

  const emailValid = isValidEmail(identifier);
  const phoneValid = isValidPhone(identifier);

  return (
    <div className="login-shell login-experience-v518d">
      <div className="login-wrap">
        <section className="login-aside" aria-label="Tentang KOST48 Surabaya">
          <div className="login-chip"><span />{officialKost48Location.address}</div>
          <h1 className="login-title">Pulihkan akses akun Anda dengan cara yang aman dan sederhana.</h1>
          <p className="login-copy">
            Reset via tautan email, atau hubungi admin langsung lewat WhatsApp jika hanya punya nomor HP.
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

        <section className="login-panel" aria-label="Form lupa password KOST48">
          <Kost48LogoMark size="login" className="login-mark" />
          <div className="login-heading-block text-center">
            <h2>Lupa Password?</h2>
            <p>Pilih metode pemulihan akun Anda</p>
          </div>

          {/* Tab switcher */}
          <div className="login-segment" role="tablist" aria-label="Metode reset password">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={mode === 'email' ? 'active' : ''}
              onClick={() => switchMode('email')}
            >
              <svg className="login-segment-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              className={mode === 'phone' ? 'active' : ''}
              onClick={() => switchMode('phone')}
            >
              <svg className="login-segment-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Nomor HP
            </button>
          </div>

          {/* ── EMAIL TAB ── */}
          {mode === 'email' && (
            submitted ? (
              <div className="login-success-state">
                <div className="login-success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="login-success-title">Email terkirim!</div>
                <p className="login-success-body">
                  Jika akun dengan email <strong>{identifier}</strong> ditemukan, tautan reset password telah dikirim. Cek inbox atau folder spam Anda.
                </p>

                {previewToken ? (
                  <div className="login-helper-card text-start mb-3">
                    <div className="fw-semibold small mb-1">Token Reset (Dev Preview)</div>
                    <code className="small d-block">{previewToken}</code>
                    <div className="text-muted small mt-1">Gunakan token ini bila gateway email belum dikonfigurasi.</div>
                  </div>
                ) : null}

                {formError ? <div className="login-form-error" role="alert">{formError}</div> : null}

                <Button
                  variant="outline-secondary"
                  className="w-100 mb-3"
                  onClick={handleResend}
                  disabled={submitting || cooldown > 0}
                >
                  {submitting ? 'Mengirim...' : cooldown > 0 ? `Kirim ulang dalam ${cooldown}d` : 'Kirim ulang email'}
                </Button>

                <div className="login-footer-note text-center">
                  <Link to="/login">← Kembali ke login</Link>
                </div>
              </div>
            ) : (
              <>
                {formError ? <div className="login-form-error" role="alert">{formError}</div> : null}
                <Form onSubmit={handleEmailSubmit} noValidate>
                  <Form.Group className="mb-3">
                    <Form.Label>Alamat Email</Form.Label>
                    <Form.Control
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); if (fieldError) setFieldError(null); }}
                      type="text"
                      placeholder="contoh: nama@email.com"
                      autoCapitalize="none"
                      autoCorrect="off"
                      inputMode="email"
                      isInvalid={Boolean(fieldError)}
                    />
                    {fieldError ? <div className="login-inline-error">{fieldError}</div> : null}
                  </Form.Group>

                  <div className="login-reset-actions">
                    <Button
                      type="submit"
                      disabled={submitting || !emailValid}
                      className="login-submit-btn"
                    >
                      {submitting ? 'Memproses...' : 'Kirim Email Reset'}
                    </Button>
                    <a
                      href={buildWaUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn login-wa-btn"
                    >
                      <WaIcon />
                      <span>Hubungi Admin</span>
                    </a>
                  </div>
                </Form>

                <div className="login-footer-note mt-3">
                  Sudah ingat password? <Link to="/login">Kembali ke login</Link>
                </div>
              </>
            )
          )}

          {/* ── PHONE TAB ── */}
          {mode === 'phone' && (
            <>
              <div className="login-helper-card">
                Reset password dengan nomor HP dilakukan oleh admin. Masukkan nomor HP Anda lalu hubungi admin via WhatsApp.
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Nomor HP</Form.Label>
                <Form.Control
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  type="text"
                  placeholder="contoh: 08123456789"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="tel"
                />
              </Form.Group>

              <div className="mb-2 small text-muted">
                {identifier.trim() ? (phoneValid ? '✓ Nomor HP valid. Klik WhatsApp untuk hubungi admin.' : 'Format nomor HP: 08xxxxxxxxx (10-13 digit). Kamar tetap bisa hubungi admin.') : 'Masukkan nomor HP dulu.'}
              </div>
              <a
                href={identifier.trim() ? buildWaUrl(identifier.trim()) : buildWaUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn login-wa-btn w-100${!identifier.trim() ? ' disabled' : ''}`}
                aria-disabled={!identifier.trim()}
                onClick={!identifier.trim() ? (e) => e.preventDefault() : undefined}
              >
                <WaIcon />
                Hubungi Admin via WhatsApp
              </a>

              <div className="login-footer-note mt-3">
                Sudah ingat password? <Link to="/login">Kembali ke login</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
