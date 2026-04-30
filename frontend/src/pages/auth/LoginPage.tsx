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
          <div className="login-chip">✦ Kos48 Surabaya Barat</div>
          <div className="login-title">Kos nyaman di Surabaya Barat — booking kamar langsung dari sini.</div>
          <div className="login-copy">
            Kos48 menyediakan kamar siap huni dengan fasilitas yang jelas, tarif transparan, dan proses booking online yang mudah untuk calon tenant.
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <strong>Kamar siap huni</strong>
              <div className="mt-1 small text-white-50">Pilih kamar dari katalog yang selalu diperbarui, lengkap dengan foto, tarif, dan fasilitas.</div>
            </div>
            <div className="login-feature-item">
              <strong>Booking transparan</strong>
              <div className="mt-1 small text-white-50">Lihat harga, deposit, dan status ketersediaan sebelum mengajukan booking.</div>
            </div>
            <div className="login-feature-item">
              <strong>Portal tenant pribadi</strong>
              <div className="mt-1 small text-white-50">Setelah disetujui, tenant dapat memantau tagihan, pengumuman, dan data hunian dari portal.</div>
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

          <h2>Masuk ke Portal Kos48</h2>
          <p className="text-muted mb-4">Lanjutkan ke portal tenant atau backoffice sesuai akun Anda.</p>

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

            <div className="form-helper mb-3">Belum punya akun? Tenant baru bisa booking kamar dari katalog. Akun portal akan dibuat setelah booking disetujui.</div>

            <div className="d-flex justify-content-end mb-4">
              <Link to="/forgot-password" className="small text-decoration-none">Lupa password?</Link>
            </div>

            <Button type="submit" disabled={submitting} className="w-100">
              {submitting ? 'Memproses...' : 'Masuk ke Dashboard'}
            </Button>
          </Form>

          <div className="mt-3 text-center">
            <Link to="/rooms" className="small text-decoration-none">Belum punya akun? Lihat katalog kamar →</Link>
          </div>

        </section>
      </div>
    </div>
  );
}
