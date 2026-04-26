import { FormEvent, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getDefaultRoute } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      navigate(from || getDefaultRoute(user.role), { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : (message || 'Email/No. HP atau password salah'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-wrap">
        <section className="login-aside">
          <div className="login-chip">✦ Kost48 Surabaya V3</div>
          <div className="login-title">Backoffice kos yang tampil lebih rapi, modern, dan meyakinkan.</div>
          <div className="login-copy">
            Satu tempat untuk memantau kamar, tenant, stay aktif, invoice, dan tindak lanjut operasional tanpa kesan dashboard lama yang kaku.
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <strong>Operasional lebih cepat</strong>
              <div className="mt-1 small text-white-50">Navigasi inti dibuat fokus supaya admin tidak perlu berpindah halaman dengan bingung.</div>
            </div>
            <div className="login-feature-item">
              <strong>Tampilan lebih premium</strong>
              <div className="mt-1 small text-white-50">Hierarchy visual, kartu statistik, dan tabel dibuat lebih halus dan nyaman dibaca.</div>
            </div>
            <div className="login-feature-item">
              <strong>Siap untuk tenant portal</strong>
              <div className="mt-1 small text-white-50">Role tenant tetap mendapatkan pengalaman yang terasa satu sistem, bukan halaman tempelan.</div>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="brand-block">
            <div className="brand-mark">K48</div>
            <div>
              <div className="brand-title">Kost48 Surabaya</div>
              <div className="brand-subtitle">Masuk ke workspace Anda</div>
            </div>
          </div>

          <h2>Selamat datang kembali</h2>
          <p className="text-muted mb-4">Masuk ke backoffice atau tenant portal untuk melanjutkan pekerjaan Anda.</p>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email atau No. HP</Form.Label>
              <Form.Control value={identifier} onChange={(e) => setIdentifier(e.target.value)} type="text" placeholder="nama@kost48.com atau 0812xxxxxxx" autoCapitalize="none" autoCorrect="off" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Masukkan password" />
            </Form.Group>

            <div className="form-helper mb-3">Gunakan akun owner/admin/staff/tenant yang sudah tersedia di backend Anda.</div>

            <div className="d-flex justify-content-end mb-4">
              <Link to="/forgot-password" className="small text-decoration-none">Lupa password?</Link>
            </div>

            <Button type="submit" disabled={submitting} className="w-100">
              {submitting ? 'Memproses...' : 'Masuk ke Dashboard'}
            </Button>
          </Form>

          <div className="login-footer-note">
            Tip: halaman ini sengaja dibuat lebih tenang dan premium agar kesan pertama sistem terasa lebih kuat.
          </div>
        </section>
      </div>
    </div>
  );
}
