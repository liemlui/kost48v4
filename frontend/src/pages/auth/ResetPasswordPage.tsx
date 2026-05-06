import { FormEvent, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PasswordInput from '../../components/common/PasswordInput';
import { resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess('Password berhasil diperbarui. Anda akan diarahkan ke login.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : (message || 'Gagal mereset password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-wrap">
        <section className="login-aside">
          <div className="login-chip">✦ Kost48 Surabaya V3</div>
          <div className="login-title">Atur password baru tanpa harus meminta reset manual ke operator.</div>
          <div className="login-copy">
            Masukkan token reset yang Anda terima, lalu buat password baru yang aman dan mudah Anda ingat.
          </div>
        </section>

        <section className="login-panel">
          <div className="brand-block">
            <div className="brand-mark">K48</div>
            <div>
              <div className="brand-title">Reset Password</div>
              <div className="brand-subtitle">Buat password baru untuk akun Anda</div>
            </div>
          </div>

          <h2>Masukkan token reset</h2>
          <p className="text-muted mb-4">Token bersifat sekali pakai dan memiliki masa berlaku terbatas.</p>

          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Token Reset</Form.Label>
              <Form.Control value={token} onChange={(e) => setToken(e.target.value)} placeholder="Tempel token reset di sini" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password Baru</Form.Label>
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter" />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Konfirmasi Password Baru</Form.Label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
            </Form.Group>

            <Button type="submit" disabled={submitting} className="w-100">
              {submitting ? 'Memproses...' : 'Simpan Password Baru'}
            </Button>
          </Form>

          <div className="login-footer-note mt-3">
            Kembali ke <Link to="/login">halaman login</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
