import { FormEvent, useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPreviewToken(null);
    setSubmitting(true);
    try {
      const result = await forgotPassword({ identifier });
      setSuccess('Jika akun ditemukan, instruksi reset password telah dikirim.');
      if (result?.resetTokenPreview) {
        setPreviewToken(result.resetTokenPreview);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : (message || 'Gagal memproses permintaan lupa password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-wrap">
        <section className="login-aside">
          <div className="login-chip">✦ Kost48 Surabaya V3</div>
          <div className="login-title">Pulihkan akses akun Anda dengan cara yang aman dan sederhana.</div>
          <div className="login-copy">
            Masukkan email atau nomor HP yang terhubung ke akun Anda. Sistem akan memberi instruksi reset password jika akun ditemukan.
          </div>
        </section>

        <section className="login-panel">
          <div className="brand-block">
            <div className="brand-mark">K48</div>
            <div>
              <div className="brand-title">Lupa Password</div>
              <div className="brand-subtitle">Reset akses akun tenant / backoffice</div>
            </div>
          </div>

          <h2>Butuh password baru?</h2>
          <p className="text-muted mb-4">Masukkan email atau nomor HP Anda. Minimal salah satu identitas akun harus benar.</p>

          {error ? <Alert variant="danger">{error}</Alert> : null}
          {success ? <Alert variant="success">{success}</Alert> : null}
          {previewToken ? (
            <Alert variant="warning" className="small">
              <div className="fw-semibold">Mode dev lokal</div>
              <div>Token reset preview: <code>{previewToken}</code></div>
              <div className="mt-2">Gunakan token ini di halaman reset password bila gateway pesan belum dipasang.</div>
            </Alert>
          ) : null}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email atau Nomor HP</Form.Label>
              <Form.Control
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="contoh: nama@email.com atau 08123456789"
              />
            </Form.Group>

            <div className="form-helper mb-4">
              Response sistem akan tetap generik demi keamanan. Di mode dev lokal, token preview bisa ditampilkan agar mudah dites.
            </div>

            <Button type="submit" disabled={submitting} className="w-100">
              {submitting ? 'Memproses...' : 'Kirim Instruksi Reset'}
            </Button>
          </Form>

          <div className="login-footer-note mt-3">
            Sudah ingat password? <Link to="/login">Kembali ke login</Link>
          </div>

          <hr className="my-4" />

          <div className="login-footer-note">
            <div className="fw-semibold mb-1">Tidak punya akses email atau belum menerima instruksi reset?</div>
            <div className="small text-muted mb-2">Admin akan bantu reset password Anda melalui WhatsApp.</div>
            <a
              href="https://wa.me/6285648887628?text=Saya%20lupa%20password%20akun%20Kost48.%20Mohon%20bantu%20reset%20password%20saya."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-success btn-sm"
            >
              Hubungi Admin via WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
