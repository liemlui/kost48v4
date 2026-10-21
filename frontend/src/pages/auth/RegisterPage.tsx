import { FormEvent, useState } from 'react';
import { Alert, Button, Card, Container, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/common/PasswordInput';
import { registerTenant } from '../../api/auth';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

type FieldErrors = { fullName?: string; email?: string; phone?: string; password?: string; confirm?: string; form?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.fullName = 'Nama minimal 2 karakter.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Format email belum benar.';
    if (!PHONE_RE.test(phone.trim())) next.phone = 'Nomor HP 8–20 digit (boleh 08xx atau 62xx).';
    if (password.length < 8) next.password = 'Password minimal 8 karakter.';
    if (password !== confirm) next.confirm = 'Konfirmasi password belum sama.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await registerTenant({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      setDone(true);
    } catch (err) {
      setErrors({ form: getApiErrorMessage(err, 'Pendaftaran gagal. Coba lagi atau hubungi pengelola.') });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Container className="py-5" style={{ maxWidth: 520 }}>
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h1 className="h5 mb-2">Akun berhasil dibuat ✅</h1>
            <p className="text-muted mb-3">
              Masuk dengan email <strong>{email.trim().toLowerCase()}</strong> dan password yang kamu pilih.
              Setelah masuk, lengkapi profil dan siapkan foto KTP saat check-in.
            </p>
            <Button variant="primary" onClick={() => navigate('/login', { state: { identifier: email.trim().toLowerCase() } })}>
              Lanjut ke halaman masuk
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5" style={{ maxWidth: 520 }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <div className="text-muted small mb-1">Portal Penghuni KOST48</div>
          <h1 className="h4 mb-1">Daftar akun penghuni</h1>
          <p className="text-muted small mb-4">
            Cukup nama, email, dan nomor HP. Akun dipakai untuk melihat tagihan, mengajukan keluar, dan mengirim laporan.
            Data KTP menyusul saat check-in.
          </p>

          {errors.form ? <Alert variant="danger" className="small">{errors.form}</Alert> : null}

          <Form onSubmit={submit} noValidate>
            <Form.Group className="mb-3" controlId="register-name">
              <Form.Label>Nama lengkap</Form.Label>
              <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} isInvalid={!!errors.fullName} autoComplete="name" />
              <Form.Control.Feedback type="invalid">{errors.fullName}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-email">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} isInvalid={!!errors.email} autoComplete="email" />
              <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-phone">
              <Form.Label>Nomor HP (WhatsApp)</Form.Label>
              <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} isInvalid={!!errors.phone} autoComplete="tel" placeholder="08xxxxxxxxxx" />
              <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-password">
              <Form.Label>Password</Form.Label>
              <PasswordInput controlId="register-password" value={password} onChange={(e) => setPassword(e.target.value)} isInvalid={!!errors.password} autoComplete="new-password" />
              {errors.password ? <div className="text-danger small mt-1">{errors.password}</div> : null}
              <Form.Text className="text-muted">Minimal 8 karakter. Jangan pakai tanggal lahir.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-4" controlId="register-confirm">
              <Form.Label>Ulangi password</Form.Label>
              <PasswordInput controlId="register-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} isInvalid={!!errors.confirm} autoComplete="new-password" />
              {errors.confirm ? <div className="text-danger small mt-1">{errors.confirm}</div> : null}
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? 'Mendaftar…' : 'Daftar sekarang'}
            </Button>
          </Form>

          <div className="text-center small text-muted mt-3">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
